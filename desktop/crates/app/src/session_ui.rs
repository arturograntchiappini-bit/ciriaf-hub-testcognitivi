//! Modalità Sessione: costruttore di protocollo (fasi, pin temporali, batteria), esecuzione guidata a
//! tempo e risultati con export. Porta `src/ui/session/*.tsx` sopra `sintropia_core::session`.
//!
//! La shell crea un `SessionScreen`, lo tiene nell'app e chiama `ui` sulla schermata «Sessione»
//! passando la fabbrica dei runner di test (vedi `default_runner_factory`).
#![allow(dead_code)] // finché la shell non aggancia SessionScreen

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use eframe::egui::{self, pos2, vec2, Align2, FontId, Rect, RichText, Sense, Stroke};
use serde_json::{Map, Value};
use sintropia_core::export::{self, iso_from_epoch_ms, iso_now, CsvLocale};
use sintropia_core::rng::mulberry32;
use sintropia_core::session::{
    compute_session_state, distribute_phases_evenly, flatten_pins, make_local_id, make_run_id,
    move_pin_by_id, phase_index_at_offset, phase_spans, session_filename, session_total_ms,
    to_session_csv, to_session_json, to_session_summary_csv, BatteryItem, SessionPhase, SessionRun,
    SessionState, SessionTemplate, SessionTestResult, TimePin,
};
use sintropia_core::{TestId, TestResult};

use crate::runner::{RunnerStatus, TestRunner};
use crate::views_custom::{self, numbers_to_params, RunnerSpec};
use crate::{data, storage, theme};

const MINUTE_MS: f64 = 60_000.0;
const DEFAULT_TOTAL_MS: f64 = 30.0 * MINUTE_MS;
const USER_AGENT: &str = "Sintropia Desktop";

/// Costruisce il runner di un test della batteria; `None` se il test non è disponibile.
pub type RunnerFactory<'a> = &'a dyn Fn(&RunnerSpec) -> Option<Box<dyn TestRunner>>;

/// Fabbrica con i soli runner di questo modulo (Corsi, WCST): la shell la affianca agli altri.
pub fn default_runner_factory(spec: &RunnerSpec) -> Option<Box<dyn TestRunner>> {
    views_custom::create_custom_runner(spec)
}

// ───────────────────────── Logica pura ─────────────────────────

/// Millisecondi dall'epoca Unix (orologio reale: il timing di sessione non richiede precisione al ms).
pub fn now_epoch_ms() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64() * 1000.0)
}

/// Seme diverso a ogni chiamata (nanosecondi + contatore).
pub fn entropy_seed() -> u32 {
    static COUNTER: AtomicU32 = AtomicU32::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.subsec_nanos() ^ (d.as_secs() as u32));
    nanos
        ^ COUNTER
            .fetch_add(1, Ordering::Relaxed)
            .wrapping_mul(0x9E37_79B9)
}

/// `m:ss` (come `fmtMs` del costruttore).
pub fn fmt_clock(ms: f64) -> String {
    let total = (ms / 1000.0).round().max(0.0) as u64;
    format!("{}:{:02}", total / 60, total % 60)
}

/// `mm:ss` (come `fmt` della schermata di attesa).
pub fn fmt_countdown(ms: f64) -> String {
    let total = (ms / 1000.0).round().max(0.0) as u64;
    format!("{:02}:{:02}", total / 60, total % 60)
}

/// «m:ss» o «h:mm:ss» in secondi; un numero solo vale minuti.
pub fn parse_clock(text: &str) -> Option<f64> {
    let parts: Vec<f64> = text
        .trim()
        .split(':')
        .map(|p| p.trim().parse::<f64>().ok().filter(|v| *v >= 0.0))
        .collect::<Option<_>>()?;
    match parts.as_slice() {
        [m] => Some(m * 60.0),
        [m, s] => Some(m * 60.0 + s),
        [h, m, s] => Some(h * 3600.0 + m * 60.0 + s),
        _ => None,
    }
}

fn number_value(v: f64) -> Value {
    if v.fract() == 0.0 && v.abs() < 9.0e15 {
        Value::from(v as i64)
    } else {
        Value::from(v)
    }
}

pub fn test_title(id: TestId) -> String {
    data::TEST_CATALOG
        .iter()
        .find(|m| m.id == id)
        .map_or_else(|| id.as_str().to_string(), |m| m.title.to_string())
}

/// Protocollo vuoto: una fase che copre i 30 minuti di default.
pub fn empty_template(now_iso: &str, rand: &mut dyn FnMut() -> f64) -> SessionTemplate {
    SessionTemplate {
        id: make_local_id("tpl", rand),
        name: String::new(),
        created_at: now_iso.to_string(),
        total_ms: DEFAULT_TOTAL_MS,
        phases: vec![SessionPhase {
            id: make_local_id("ph", rand),
            name: "Fase 1".into(),
            duration_ms: DEFAULT_TOTAL_MS,
            pins: Vec::new(),
        }],
    }
}

/// Errore di validazione, o `None` se il protocollo è valido.
pub fn validate_template(t: &SessionTemplate) -> Option<String> {
    if t.name.trim().is_empty() {
        return Some("Assegna un nome alla sessione.".into());
    }
    if t.total_ms <= 0.0 {
        return Some("Imposta una durata totale maggiore di zero.".into());
    }
    if t.phases.is_empty() {
        return Some("Aggiungi almeno una fase.".into());
    }
    if let Some(p) = t.phases.iter().find(|p| p.duration_ms <= 0.0) {
        return Some(format!(
            "La fase \"{}\" deve avere una durata maggiore di zero.",
            p.name
        ));
    }
    if t.phases.iter().map(|p| p.duration_ms).sum::<f64>() > t.total_ms {
        return Some("La somma delle durate delle fasi supera la durata totale.".into());
    }
    if t.phases.iter().all(|p| p.pins.is_empty()) {
        return Some("Aggiungi almeno un pin \"t\".".into());
    }
    for span in phase_spans(t) {
        for pin in &span.phase.pins {
            if pin.offset_ms < span.start_ms || pin.offset_ms > span.end_ms {
                return Some(format!(
                    "Un pin della fase \"{}\" cade fuori dal suo intervallo temporale.",
                    span.phase.name
                ));
            }
            if pin.battery.is_empty() {
                return Some("Ogni pin deve avere almeno un test nella batteria.".into());
            }
        }
    }
    None
}

/// Valida e deserializza un protocollo importato (porta `importTemplateJson`).
pub fn import_template_json(
    text: &str,
    now_iso: &str,
    rand: &mut dyn FnMut() -> f64,
) -> Result<SessionTemplate, String> {
    const INVALID: &str = "File di protocollo non valido: mancano \"name\" o \"phases\".";
    let value: Value = serde_json::from_str(text).map_err(|e| format!("JSON non valido: {e}"))?;
    let object = value.as_object().ok_or(INVALID)?;
    let name = object.get("name").and_then(Value::as_str).ok_or(INVALID)?;
    let mut raw_phases = object
        .get("phases")
        .and_then(Value::as_array)
        .ok_or(INVALID)?
        .clone();
    for phase in raw_phases.iter_mut().filter_map(Value::as_object_mut) {
        if !phase.get("durationMs").is_some_and(Value::is_number) {
            phase.insert("durationMs".into(), Value::from(0));
        }
    }
    let phases: Vec<SessionPhase> = serde_json::from_value(Value::Array(raw_phases))
        .map_err(|e| format!("Fasi non valide: {e}"))?;
    let sum: f64 = phases.iter().map(|p| p.duration_ms).sum();
    Ok(SessionTemplate {
        id: object
            .get("id")
            .and_then(Value::as_str)
            .map_or_else(|| make_local_id("imp", rand), str::to_string),
        name: name.to_string(),
        created_at: object
            .get("createdAt")
            .and_then(Value::as_str)
            .unwrap_or(now_iso)
            .to_string(),
        total_ms: object
            .get("totalMs")
            .and_then(Value::as_f64)
            .filter(|t| *t > 0.0)
            .unwrap_or(sum),
        phases,
    })
}

/// Test con i default correnti congelati (le impostazioni della batteria sono per-pin).
pub fn default_battery_item(test_id: TestId) -> BatteryItem {
    BatteryItem {
        test_id,
        params: numbers_to_params(&data::default_params(test_id.as_str())),
        practice: false,
    }
}

/// Nuovo run: id anonimo `S-XXXX-HHMM` (ora UTC) e orologio di partenza.
pub fn new_run(
    template: &SessionTemplate,
    now_ms: f64,
    rand: &mut dyn FnMut() -> f64,
) -> SessionRun {
    let iso = iso_from_epoch_ms(now_ms as i64);
    let digits = |from: usize| {
        iso.get(from..from + 2)
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0)
    };
    SessionRun {
        run_id: make_run_id(digits(11), digits(14), rand),
        template: template.clone(),
        started_at_epoch: now_ms,
        started_at_iso: iso,
        completed_pin_ids: Vec::new(),
        results: Vec::new(),
        finished: false,
    }
}

/// Contesto del pin in somministrazione.
#[derive(Debug, Clone)]
pub struct ActiveContext {
    pub phase_id: String,
    pub phase_name: String,
    pub pin: TimePin,
}

/// Cosa succede dopo aver registrato un test.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Progress {
    NextTest,
    BatteryDone,
    SessionDone,
}

/// Registra il risultato nel run; a fine batteria completa il pin e, se era l'ultimo, chiude la sessione.
pub fn record_result(
    run: &mut SessionRun,
    ctx: &ActiveContext,
    battery_idx: usize,
    result: TestResult,
    now_ms: f64,
) -> Progress {
    run.results.push(SessionTestResult {
        phase_id: ctx.phase_id.clone(),
        phase_name: ctx.phase_name.clone(),
        pin_id: ctx.pin.id.clone(),
        offset_ms: ctx.pin.offset_ms,
        index_in_battery: battery_idx as u32,
        result,
    });
    if battery_idx + 1 < ctx.pin.battery.len() {
        return Progress::NextTest;
    }
    run.completed_pin_ids.push(ctx.pin.id.clone());
    let after = compute_session_state(
        &run.template,
        now_ms - run.started_at_epoch,
        &run.completed_pin_ids,
    );
    if after.done {
        run.finished = true;
        Progress::SessionDone
    } else {
        Progress::BatteryDone
    }
}

// ───────────────────────── Persistenza ─────────────────────────

/// Modelli e run in corso come JSON in `%APPDATA%\Sintropia`.
#[derive(Debug, Clone)]
pub struct SessionStore {
    dir: PathBuf,
}

impl SessionStore {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    /// `%APPDATA%\Sintropia` (ripiega sulla cartella corrente se APPDATA manca).
    pub fn default_dir() -> PathBuf {
        std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_default()
            .join("Sintropia")
    }

    fn templates_path(&self) -> PathBuf {
        self.dir.join("session-templates.json")
    }

    fn run_path(&self) -> PathBuf {
        self.dir.join("session-run.json")
    }

    fn write<T: serde::Serialize + ?Sized>(&self, path: &Path, value: &T) -> Result<(), String> {
        std::fs::create_dir_all(&self.dir)
            .map_err(|e| format!("cartella {}: {e}", self.dir.display()))?;
        let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
        std::fs::write(path, json).map_err(|e| format!("scrittura {}: {e}", path.display()))
    }

    /// File assente o corrotto dà una lista vuota (mai un crash).
    pub fn load_templates(&self) -> Vec<SessionTemplate> {
        std::fs::read_to_string(self.templates_path())
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default()
    }

    /// Inserisce o aggiorna un modello (per id).
    pub fn save_template(&self, template: &SessionTemplate) -> Result<(), String> {
        let mut all = self.load_templates();
        match all.iter_mut().find(|t| t.id == template.id) {
            Some(slot) => *slot = template.clone(),
            None => all.push(template.clone()),
        }
        self.write(&self.templates_path(), &all)
    }

    pub fn delete_template(&self, id: &str) -> Result<(), String> {
        let all: Vec<SessionTemplate> = self
            .load_templates()
            .into_iter()
            .filter(|t| t.id != id)
            .collect();
        self.write(&self.templates_path(), &all)
    }

    pub fn load_run(&self) -> Option<SessionRun> {
        let text = std::fs::read_to_string(self.run_path()).ok()?;
        serde_json::from_str(&text).ok()
    }

    pub fn save_run(&self, run: &SessionRun) -> Result<(), String> {
        self.write(&self.run_path(), run)
    }

    pub fn clear_run(&self) {
        let _ = std::fs::remove_file(self.run_path());
    }
}

// ───────────────────────── Stato della schermata ─────────────────────────

enum View {
    Menu,
    Builder(Box<BuilderState>),
    Run(Box<ActiveRun>),
}

struct BuilderState {
    draft: SessionTemplate,
    selected_pin: Option<String>,
    expanded_item: Option<(String, usize)>,
    path_input: String,
    message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RunMode {
    Wait,
    Ready,
    Test,
    Done,
}

struct ActiveRun {
    run: SessionRun,
    mode: RunMode,
    active: Option<ActiveContext>,
    battery_idx: usize,
    runner: Option<Box<dyn TestRunner>>,
    alerted_pin: Option<String>,
    exiting: bool,
    notice: Option<String>,
}

impl ActiveRun {
    fn new(run: SessionRun) -> Self {
        let mode = if run.finished {
            RunMode::Done
        } else {
            RunMode::Wait
        };
        Self {
            run,
            mode,
            active: None,
            battery_idx: 0,
            runner: None,
            alerted_pin: None,
            exiting: false,
            notice: None,
        }
    }

    fn elapsed_ms(&self) -> f64 {
        now_epoch_ms() - self.run.started_at_epoch
    }

    fn state(&self) -> SessionState {
        compute_session_state(
            &self.run.template,
            self.elapsed_ms(),
            &self.run.completed_pin_ids,
        )
    }
}

pub struct SessionScreen {
    store: SessionStore,
    templates: Vec<SessionTemplate>,
    run_in_progress: Option<SessionRun>,
    view: View,
    message: Option<String>,
    confirm_delete: Option<String>,
    rand: Box<dyn FnMut() -> f64>,
    /// Mostra «Corretto/Errato» durante i test a tempo di reazione (Corsi e WCST lo mostrano sempre).
    pub feedback_during_test: bool,
}

impl Default for SessionScreen {
    fn default() -> Self {
        Self::new()
    }
}

impl SessionScreen {
    pub fn new() -> Self {
        Self::with_store(SessionStore::new(SessionStore::default_dir()))
    }

    pub fn with_store(store: SessionStore) -> Self {
        Self {
            templates: store.load_templates(),
            run_in_progress: store.load_run().filter(|r| !r.finished),
            store,
            view: View::Menu,
            message: None,
            confirm_delete: None,
            rand: Box::new(mulberry32(entropy_seed())),
            feedback_during_test: false,
        }
    }

    /// Disegna la schermata corrente della modalità Sessione.
    pub fn ui(&mut self, ui: &mut egui::Ui, make_runner: RunnerFactory) {
        let view = std::mem::replace(&mut self.view, View::Menu);
        self.view = match view {
            View::Menu => self.menu_ui(ui),
            View::Builder(builder) => self.builder_ui(ui, builder),
            View::Run(run) => self.run_ui(ui, run, make_runner),
        };
    }

    fn reload(&mut self) {
        self.templates = self.store.load_templates();
        self.run_in_progress = self.store.load_run().filter(|r| !r.finished);
    }

    fn report(&mut self, result: Result<(), String>) {
        if let Err(e) = result {
            self.message = Some(format!("Errore: {e}"));
        }
    }
}

// ───────────────────────── Elementi grafici ─────────────────────────

fn page_title(ui: &mut egui::Ui, eyebrow: &str, title: &str) {
    ui.label(theme::eyebrow(eyebrow));
    ui.label(theme::display_text(title, 38.0, theme::INK, 2.5));
    ui.add_space(10.0);
}

fn muted(text: &str) -> RichText {
    RichText::new(text).color(theme::MUTED)
}

/// Durata modificabile come `m:ss` (trascinando o digitando; un numero solo vale minuti).
fn duration_edit(ui: &mut egui::Ui, ms: &mut f64) -> bool {
    let mut seconds = (*ms / 1000.0).round();
    let response = ui.add(
        egui::DragValue::new(&mut seconds)
            .range(0.0..=86_400.0)
            .speed(2.0)
            .custom_formatter(|n, _| fmt_clock(n * 1000.0))
            .custom_parser(parse_clock),
    );
    if response.changed() {
        *ms = seconds * 1000.0;
    }
    response.changed()
}

enum TimelineEvent {
    None,
    Select(String),
    Move(String, f64),
    AddAt(f64),
}

/// Linea temporale: fasi come segmenti, pin trascinabili, click su un punto vuoto per aggiungerne uno.
fn timeline(
    ui: &mut egui::Ui,
    template: &SessionTemplate,
    selected: Option<&str>,
) -> TimelineEvent {
    const PAD: f32 = 12.0;
    let total = session_total_ms(template).max(1.0);
    let (rect, background) =
        ui.allocate_exact_size(vec2(ui.available_width(), 84.0), Sense::click());
    let track = Rect::from_min_max(
        pos2(rect.left() + PAD, rect.top() + 18.0),
        pos2(rect.right() - PAD, rect.bottom() - 22.0),
    );
    let x_of = |ms: f64| track.left() + (ms / total) as f32 * track.width();
    let offset_of = |x: f32| {
        let ms = f64::from((x - track.left()) / track.width()) * total;
        ((ms / 1000.0).round() * 1000.0).clamp(0.0, total)
    };
    let painter = ui.painter_at(rect);
    painter.rect(
        rect,
        0.0,
        theme::SURFACE,
        Stroke::new(1.0, theme::LINE),
        egui::StrokeKind::Inside,
    );
    for (i, span) in phase_spans(template).iter().enumerate() {
        let segment = Rect::from_min_max(
            pos2(x_of(span.start_ms), track.top()),
            pos2(x_of(span.end_ms), track.bottom()),
        );
        let fill = if i % 2 == 0 {
            theme::ACCENT_SOFT
        } else {
            theme::ELEVATED
        };
        painter.rect(
            segment,
            0.0,
            fill,
            Stroke::new(1.0, theme::LINE),
            egui::StrokeKind::Inside,
        );
        painter.text(
            pos2(segment.left() + 4.0, rect.top() + 3.0),
            Align2::LEFT_TOP,
            &span.phase.name,
            FontId::monospace(11.0),
            theme::MUTED,
        );
        painter.text(
            pos2(segment.left() + 2.0, rect.bottom() - 3.0),
            Align2::LEFT_BOTTOM,
            fmt_clock(span.start_ms),
            FontId::monospace(10.0),
            theme::MUTED,
        );
    }
    let mut event = TimelineEvent::None;
    for flat in flatten_pins(template) {
        let x = x_of(flat.pin.offset_ms);
        let hit =
            Rect::from_center_size(pos2(x, track.center().y), vec2(16.0, track.height() + 8.0));
        let response = ui.interact(
            hit,
            ui.make_persistent_id(("session-pin", &flat.pin.id)),
            Sense::click_and_drag(),
        );
        let is_selected = selected == Some(flat.pin.id.as_str());
        let color = if is_selected || response.hovered() {
            theme::ACCENT_GLOW
        } else {
            theme::ACCENT
        };
        painter.line_segment(
            [pos2(x, track.top() - 4.0), pos2(x, track.bottom() + 4.0)],
            Stroke::new(2.0, color),
        );
        painter.circle_filled(pos2(x, track.top() - 4.0), 4.5, color);
        if response.dragged() {
            if let Some(p) = response.interact_pointer_pos() {
                event = TimelineEvent::Move(flat.pin.id.clone(), offset_of(p.x));
            }
        } else if response.clicked() {
            event = TimelineEvent::Select(flat.pin.id.clone());
        }
    }
    if matches!(event, TimelineEvent::None) && background.clicked() {
        if let Some(p) = background
            .interact_pointer_pos()
            .filter(|p| track.expand2(vec2(PAD, 0.0)).contains(*p))
        {
            event = TimelineEvent::AddAt(offset_of(p.x));
        }
    }
    event
}

// ───────────────────────── Menu ─────────────────────────

impl SessionScreen {
    fn menu_ui(&mut self, ui: &mut egui::Ui) -> View {
        let mut next = View::Menu;
        let mut action = None;
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                page_title(ui, "Modalità Sessione", "Sessione");
                ui.label(muted(
                "Un protocollo a tempo: fasi con pin t in cui somministrare una batteria di test. \
                 Fuori dai pin il partecipante vede solo la fase e il conto alla rovescia.",
            ));
                ui.add_space(8.0);
                if let Some(message) = &self.message {
                    ui.label(RichText::new(message).monospace().color(theme::DANGER));
                }
                if let Some(view) = self.resume_card(ui) {
                    next = view;
                }
                ui.add_space(14.0);
                ui.horizontal(|ui| {
                    ui.label(theme::eyebrow("Modelli salvati"));
                    if ui.button("+ Nuova sessione").clicked() {
                        next = self.new_builder();
                    }
                    ui.checkbox(
                        &mut self.feedback_during_test,
                        "Feedback durante i test a tempo di reazione",
                    );
                });
                ui.add_space(6.0);
                action = self.templates_list(ui);
            });
        match action {
            Some(action) => self.apply_menu_action(action),
            None => next,
        }
    }

    fn new_builder(&mut self) -> View {
        let draft = empty_template(&iso_now(), &mut *self.rand);
        View::Builder(Box::new(BuilderState::new(draft)))
    }

    fn resume_card(&mut self, ui: &mut egui::Ui) -> Option<View> {
        let run = self.run_in_progress.clone()?;
        let mut next = None;
        theme::card_frame()
            .fill(theme::ACCENT_SOFT)
            .stroke(Stroke::new(1.0, theme::ACCENT))
            .show(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.label(theme::eyebrow("Sessione in corso"));
                ui.label(format!("{} ({})", run.template.name, run.run_id));
                if ui.button("Riprendi sessione").clicked() {
                    next = Some(View::Run(Box::new(ActiveRun::new(run))));
                }
            });
        next
    }

    fn templates_list(&mut self, ui: &mut egui::Ui) -> Option<MenuAction> {
        if self.templates.is_empty() {
            theme::card_frame().show(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.label(theme::display_text("Nessun modello salvato", 22.0, theme::INK, 2.0));
                ui.label(muted("Crea il tuo primo protocollo: scegli la durata, aggiungi le fasi e colloca i pin t con le batterie di test."));
            });
            return None;
        }
        let mut action = None;
        for template in &self.templates {
            theme::card_frame().show(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.label(theme::display_text(&template.name, 26.0, theme::INK, 2.0));
                ui.label(theme::eyebrow(&format!(
                    "{} fasi · {} pin t",
                    template.phases.len(),
                    flatten_pins(template).len()
                )));
                ui.horizontal(|ui| {
                    if ui.button("Avvia").clicked() {
                        action = Some(MenuAction::Start(template.clone()));
                    }
                    if ui.button("Modifica").clicked() {
                        action = Some(MenuAction::Edit(template.clone()));
                    }
                    let confirming = self.confirm_delete.as_deref() == Some(template.id.as_str());
                    let label = if confirming {
                        "Conferma eliminazione"
                    } else {
                        "Elimina"
                    };
                    if ui.button(label).clicked() {
                        action = Some(if confirming {
                            MenuAction::Delete(template.id.clone())
                        } else {
                            MenuAction::AskDelete(template.id.clone())
                        });
                    }
                });
            });
        }
        action
    }

    fn apply_menu_action(&mut self, action: MenuAction) -> View {
        self.confirm_delete = None;
        match action {
            MenuAction::Start(template) => self.start_run(&template),
            MenuAction::Edit(template) => View::Builder(Box::new(BuilderState::new(template))),
            MenuAction::AskDelete(id) => {
                self.confirm_delete = Some(id);
                View::Menu
            }
            MenuAction::Delete(id) => {
                let result = self.store.delete_template(&id);
                self.report(result);
                self.reload();
                View::Menu
            }
        }
    }

    fn start_run(&mut self, template: &SessionTemplate) -> View {
        let run = new_run(template, now_epoch_ms(), &mut *self.rand);
        let saved = self.store.save_run(&run);
        self.report(saved);
        View::Run(Box::new(ActiveRun::new(run)))
    }
}

enum MenuAction {
    Start(SessionTemplate),
    Edit(SessionTemplate),
    AskDelete(String),
    Delete(String),
}

// ───────────────────────── Costruttore ─────────────────────────

enum Op {
    AddPhase,
    RemovePhase(usize),
    MovePhase(usize, i32),
    Distribute,
    AddPin(usize),
    AddPinAt(f64),
    RemovePin(String),
    MovePin(String, f64),
    Select(Option<String>),
}

impl BuilderState {
    fn new(draft: SessionTemplate) -> Self {
        Self {
            draft,
            selected_pin: None,
            expanded_item: None,
            path_input: String::new(),
            message: None,
        }
    }

    fn apply(&mut self, op: Op, rand: &mut dyn FnMut() -> f64) {
        match op {
            Op::AddPhase => {
                let used: f64 = self.draft.phases.iter().map(|p| p.duration_ms).sum();
                let phase = SessionPhase {
                    id: make_local_id("ph", rand),
                    name: format!("Fase {}", self.draft.phases.len() + 1),
                    duration_ms: (self.draft.total_ms - used).max(0.0),
                    pins: Vec::new(),
                };
                self.draft.phases.push(phase);
            }
            Op::RemovePhase(i) => {
                if i < self.draft.phases.len() {
                    self.draft.phases.remove(i);
                }
            }
            Op::MovePhase(i, dir) => {
                let j = i as i64 + i64::from(dir);
                if i < self.draft.phases.len() && (0..self.draft.phases.len() as i64).contains(&j) {
                    self.draft.phases.swap(i, j as usize);
                }
            }
            Op::Distribute => self.draft = distribute_phases_evenly(&self.draft),
            Op::AddPin(i) => {
                let start = phase_spans(&self.draft).get(i).map_or(0.0, |s| s.start_ms);
                self.add_pin(i, start, rand);
            }
            Op::AddPinAt(offset) => {
                if let Some(i) = phase_index_at_offset(&self.draft, offset) {
                    self.add_pin(i, offset, rand);
                }
            }
            Op::RemovePin(id) => {
                self.draft
                    .phases
                    .iter_mut()
                    .for_each(|p| p.pins.retain(|pin| pin.id != id));
                if self.selected_pin.as_deref() == Some(id.as_str()) {
                    self.selected_pin = None;
                }
            }
            Op::MovePin(id, offset) => self.draft = move_pin_by_id(&self.draft, &id, offset),
            Op::Select(id) => self.selected_pin = id,
        }
    }

    fn add_pin(&mut self, phase_idx: usize, offset_ms: f64, rand: &mut dyn FnMut() -> f64) {
        let id = make_local_id("pin", rand);
        if let Some(phase) = self.draft.phases.get_mut(phase_idx) {
            phase.pins.push(TimePin {
                id: id.clone(),
                offset_ms,
                label: None,
                battery: Vec::new(),
            });
            self.selected_pin = Some(id);
        }
    }

    fn import_from_path(&mut self, rand: &mut dyn FnMut() -> f64) -> Result<(), String> {
        let path = self.path_input.trim();
        let text = std::fs::read_to_string(path).map_err(|e| format!("lettura {path}: {e}"))?;
        self.draft = import_template_json(&text, &iso_now(), rand)?;
        self.selected_pin = None;
        Ok(())
    }

    fn export_to_dir(&self, dir: &Path) -> Result<PathBuf, String> {
        std::fs::create_dir_all(dir).map_err(|e| format!("cartella {}: {e}", dir.display()))?;
        let name = if self.draft.name.trim().is_empty() {
            "senza-nome"
        } else {
            self.draft.name.trim()
        };
        let path = dir.join(format!("protocollo_{}.json", export::sanitize_id(name)));
        let json = serde_json::to_string_pretty(&self.draft).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| format!("scrittura {}: {e}", path.display()))?;
        Ok(path)
    }
}

impl SessionScreen {
    fn builder_ui(&mut self, ui: &mut egui::Ui, mut b: Box<BuilderState>) -> View {
        let mut ops: Vec<Op> = Vec::new();
        let mut finish: Option<bool> = None;
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                page_title(ui, "Modalità Sessione", "Costruttore sessione");
                self.builder_toolbar(ui, &mut b);
                builder_header(ui, &mut b.draft);
                ui.add_space(10.0);
                match timeline(ui, &b.draft, b.selected_pin.as_deref()) {
                    TimelineEvent::Select(id) => ops.push(Op::Select(Some(id))),
                    TimelineEvent::Move(id, offset) => ops.push(Op::MovePin(id, offset)),
                    TimelineEvent::AddAt(offset) => ops.push(Op::AddPinAt(offset)),
                    TimelineEvent::None => {}
                }
                ui.add_space(10.0);
                ui.horizontal(|ui| {
                    ui.label(theme::eyebrow("Fasi e pin"));
                    if ui.small_button("Riparti durate equamente").clicked() {
                        ops.push(Op::Distribute);
                    }
                });
                phases_ui(ui, &mut b, &mut ops);
                if ui.button("+ Aggiungi fase").clicked() {
                    ops.push(Op::AddPhase);
                }
                ui.add_space(12.0);
                let error = validate_template(&b.draft);
                ui.horizontal(|ui| {
                    if ui
                        .add_enabled(error.is_none(), egui::Button::new("Salva modello"))
                        .clicked()
                    {
                        finish = Some(true);
                    }
                    if ui.button("Annulla").clicked() {
                        finish = Some(false);
                    }
                    if let Some(error) = &error {
                        ui.label(muted(error));
                    }
                });
            });
        for op in ops {
            b.apply(op, &mut *self.rand);
        }
        match finish {
            Some(true) => {
                let saved = self.store.save_template(&b.draft);
                self.report(saved);
                self.reload();
                View::Menu
            }
            Some(false) => View::Menu,
            None => View::Builder(b),
        }
    }

    fn builder_toolbar(&mut self, ui: &mut egui::Ui, b: &mut BuilderState) {
        ui.horizontal_wrapped(|ui| {
            ui.add(
                egui::TextEdit::singleline(&mut b.path_input)
                    .hint_text("Percorso di un protocollo .json")
                    .desired_width(320.0),
            );
            if ui.button("Importa JSON").clicked() {
                b.message = Some(match b.import_from_path(&mut *self.rand) {
                    Ok(()) => "Protocollo importato.".to_string(),
                    Err(e) => format!("Errore: {e}"),
                });
            }
            if ui.button("Esporta JSON").clicked() {
                b.message = Some(match b.export_to_dir(&storage::export_dir()) {
                    Ok(path) => format!("Salvato: {}", path.display()),
                    Err(e) => format!("Errore: {e}"),
                });
            }
        });
        if let Some(message) = &b.message {
            ui.label(RichText::new(message).monospace().color(theme::MUTED));
        }
    }
}

fn builder_header(ui: &mut egui::Ui, draft: &mut SessionTemplate) {
    ui.horizontal_wrapped(|ui| {
        ui.vertical(|ui| {
            ui.label(theme::eyebrow("Nome della sessione"));
            ui.add(
                egui::TextEdit::singleline(&mut draft.name)
                    .hint_text("es. Protocollo affaticamento cognitivo")
                    .desired_width(320.0),
            );
        });
        ui.vertical(|ui| {
            ui.label(theme::eyebrow("Durata totale (m:ss)"));
            duration_edit(ui, &mut draft.total_ms);
        });
        let allocated: f64 = draft.phases.iter().map(|p| p.duration_ms).sum();
        let color = if allocated > draft.total_ms {
            theme::DANGER
        } else {
            theme::MUTED
        };
        ui.label(
            RichText::new(format!(
                "Fasi allocate: {} / {}",
                fmt_clock(allocated),
                fmt_clock(draft.total_ms)
            ))
            .monospace()
            .color(color),
        );
    });
}

fn phases_ui(ui: &mut egui::Ui, b: &mut BuilderState, ops: &mut Vec<Op>) {
    let spans: Vec<(f64, f64)> = phase_spans(&b.draft)
        .iter()
        .map(|s| (s.start_ms, s.end_ms))
        .collect();
    let BuilderState {
        draft,
        selected_pin,
        expanded_item,
        ..
    } = b;
    for (pi, phase) in draft.phases.iter_mut().enumerate() {
        let span = spans.get(pi).copied().unwrap_or((0.0, 0.0));
        theme::card_frame().show(ui, |ui| {
            ui.set_width(ui.available_width());
            phase_header(ui, pi, phase, span, ops);
            let mut order: Vec<usize> = (0..phase.pins.len()).collect();
            order.sort_by(|a, b| {
                phase.pins[*a]
                    .offset_ms
                    .total_cmp(&phase.pins[*b].offset_ms)
            });
            if order.is_empty() {
                ui.label(muted("Nessun pin: clicca sulla timeline o «+ pin»."));
            }
            for ti in order {
                pin_row(
                    ui,
                    &mut phase.pins[ti],
                    span,
                    selected_pin,
                    expanded_item,
                    ops,
                );
            }
            if ui.small_button("+ pin \"t\" in questa fase").clicked() {
                ops.push(Op::AddPin(pi));
            }
        });
    }
}

fn phase_header(
    ui: &mut egui::Ui,
    pi: usize,
    phase: &mut SessionPhase,
    span: (f64, f64),
    ops: &mut Vec<Op>,
) {
    ui.horizontal(|ui| {
        ui.label(muted(&format!("{}.", pi + 1)));
        ui.add(egui::TextEdit::singleline(&mut phase.name).desired_width(160.0));
        duration_edit(ui, &mut phase.duration_ms);
        ui.label(muted(&format!(
            "{}–{}",
            fmt_clock(span.0),
            fmt_clock(span.1)
        )));
        if ui.small_button("↑").clicked() {
            ops.push(Op::MovePhase(pi, -1));
        }
        if ui.small_button("↓").clicked() {
            ops.push(Op::MovePhase(pi, 1));
        }
        if ui.small_button("Elimina fase").clicked() {
            ops.push(Op::RemovePhase(pi));
        }
    });
}

fn pin_row(
    ui: &mut egui::Ui,
    pin: &mut TimePin,
    (start, end): (f64, f64),
    selected_pin: &Option<String>,
    expanded_item: &mut Option<(String, usize)>,
    ops: &mut Vec<Op>,
) {
    let open = selected_pin.as_deref() == Some(pin.id.as_str());
    ui.horizontal_wrapped(|ui| {
        let arrow = if open { "▾" } else { "▸" };
        if ui
            .button(format!("{arrow} pin t = {}", fmt_clock(pin.offset_ms)))
            .clicked()
        {
            ops.push(Op::Select(if open { None } else { Some(pin.id.clone()) }));
        }
        ui.label(muted("a"));
        let mut relative = pin.offset_ms - start;
        if duration_edit(ui, &mut relative) {
            pin.offset_ms = (start + relative).clamp(start, end);
        }
        ui.label(muted("nella fase"));
        if pin.battery.is_empty() {
            ui.label(RichText::new("batteria vuota").color(theme::DANGER));
        }
        for item in &pin.battery {
            ui.label(
                RichText::new(test_title(item.test_id))
                    .small()
                    .background_color(theme::ELEVATED),
            );
        }
        if ui.small_button("Rimuovi pin").clicked() {
            ops.push(Op::RemovePin(pin.id.clone()));
        }
    });
    if open {
        battery_editor(ui, &mut pin.battery, &pin.id, expanded_item);
    }
}

/// Batteria di un pin: test in ordine, con impostazioni congelate e interruttore di pratica.
fn battery_editor(
    ui: &mut egui::Ui,
    battery: &mut Vec<BatteryItem>,
    pin_id: &str,
    expanded: &mut Option<(String, usize)>,
) {
    ui.horizontal_wrapped(|ui| {
        ui.label(theme::eyebrow("Aggiungi:"));
        for meta in data::TEST_CATALOG.iter() {
            if ui.small_button(format!("+ {}", meta.title)).clicked() {
                battery.push(default_battery_item(meta.id));
            }
        }
    });
    let mut remove = None;
    let mut swap = None;
    for i in 0..battery.len() {
        let is_open = expanded
            .as_ref()
            .is_some_and(|(id, idx)| id == pin_id && *idx == i);
        let last = battery.len() - 1;
        ui.horizontal(|ui| {
            ui.label(format!("{}. {}", i + 1, test_title(battery[i].test_id)));
            if ui.small_button("↑").clicked() && i > 0 {
                swap = Some((i, i - 1));
            }
            if ui.small_button("↓").clicked() && i < last {
                swap = Some((i, i + 1));
            }
            if ui
                .small_button(if is_open { "Chiudi" } else { "Impostazioni" })
                .clicked()
            {
                *expanded = if is_open {
                    None
                } else {
                    Some((pin_id.to_string(), i))
                };
            }
            if ui.small_button("Rimuovi test").clicked() {
                remove = Some(i);
            }
            ui.checkbox(&mut battery[i].practice, "Includi pratica");
        });
        if is_open {
            params_grid(ui, &mut battery[i], pin_id, i);
        }
    }
    if let Some((a, b)) = swap {
        battery.swap(a, b);
        *expanded = None;
    }
    if let Some(i) = remove {
        battery.remove(i);
        *expanded = None;
    }
}

fn params_grid(ui: &mut egui::Ui, item: &mut BatteryItem, pin_id: &str, index: usize) {
    let Some(section) = data::param_sections()
        .iter()
        .find(|s| s.test_key == item.test_id.as_str())
    else {
        return;
    };
    egui::Grid::new(("battery-params", pin_id, index))
        .num_columns(2)
        .show(ui, |ui| {
            for field in &section.fields {
                ui.label(&field.label);
                let mut value = item
                    .params
                    .get(&field.key)
                    .and_then(Value::as_f64)
                    .unwrap_or(field.min);
                let step = field.step.unwrap_or(1.0);
                let mut drag = egui::DragValue::new(&mut value)
                    .range(field.min..=field.max)
                    .speed(step)
                    .fixed_decimals(if step >= 1.0 { 0 } else { 2 });
                if let Some(unit) = &field.unit {
                    drag = drag.suffix(format!(" {unit}"));
                }
                if ui.add(drag).changed() {
                    item.params.insert(field.key.clone(), number_value(value));
                }
                ui.end_row();
            }
        });
}

// ───────────────────────── Esecuzione ─────────────────────────

enum Exit {
    /// Esce dal run lasciandolo riprendibile dal menu.
    Resumable,
    /// Esce e dimentica il run (risultati già visti/esportati).
    Clear,
}

fn play_alert(ctx: &egui::Context) {
    ctx.send_viewport_cmd(egui::ViewportCommand::RequestUserAttention(
        egui::UserAttentionType::Informational,
    ));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "[console]::Beep(880,250);[console]::Beep(1175,350)",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
}

fn numeric_params(params: &Map<String, Value>) -> std::collections::BTreeMap<String, f64> {
    params
        .iter()
        .filter_map(|(k, v)| v.as_f64().map(|n| (k.clone(), n)))
        .collect()
}

impl SessionScreen {
    fn run_ui(&mut self, ui: &mut egui::Ui, mut r: Box<ActiveRun>, factory: RunnerFactory) -> View {
        let exit = match r.mode {
            RunMode::Wait => self.wait_ui(ui, &mut r),
            RunMode::Ready => {
                self.ready_ui(ui, &mut r, factory);
                None
            }
            RunMode::Test => {
                self.test_ui(ui, &mut r);
                None
            }
            RunMode::Done => results_ui(ui, &mut r),
        };
        match exit {
            None => View::Run(r),
            Some(Exit::Resumable) => {
                self.reload();
                View::Menu
            }
            Some(Exit::Clear) => {
                self.store.clear_run();
                self.reload();
                View::Menu
            }
        }
    }

    fn persist(&mut self, r: &ActiveRun) {
        let saved = self.store.save_run(&r.run);
        self.report(saved);
    }

    fn wait_ui(&mut self, ui: &mut egui::Ui, r: &mut ActiveRun) -> Option<Exit> {
        let state = r.state();
        if state.done {
            r.run.finished = true;
            r.mode = RunMode::Done;
            self.persist(r);
            return None;
        }
        if let Some(pin) = state.next_pin.as_ref().filter(|_| state.due) {
            if r.alerted_pin.as_deref() != Some(pin.id.as_str()) {
                r.alerted_pin = Some(pin.id.clone());
                play_alert(ui.ctx());
            }
        }
        wait_top_bar(ui, r, &state);
        wait_center(ui, r, &state);
        ui.ctx().request_repaint_after(Duration::from_millis(500));
        self.exit_dialog(ui, r)
    }

    fn exit_dialog(&mut self, ui: &mut egui::Ui, r: &mut ActiveRun) -> Option<Exit> {
        if !r.exiting {
            return None;
        }
        let mut exit = None;
        egui::Window::new("Uscire dalla sessione?")
            .collapsible(false)
            .resizable(false)
            .anchor(Align2::CENTER_CENTER, vec2(0.0, 0.0))
            .show(ui.ctx(), |ui| {
                ui.label(muted("Puoi riprendere più tardi (la sessione resta salvata), vedere i risultati parziali raccolti finora, oppure restare."));
                if ui.button("Resta nella sessione").clicked() {
                    r.exiting = false;
                }
                if ui.button("Vedi risultati parziali").clicked() {
                    r.exiting = false;
                    r.mode = RunMode::Done;
                }
                if ui.button("Esci (riprendibile dal menu)").clicked() {
                    exit = Some(Exit::Resumable);
                }
            });
        exit
    }

    fn ready_ui(&mut self, ui: &mut egui::Ui, r: &mut ActiveRun, factory: RunnerFactory) {
        let Some(item) = r
            .active
            .as_ref()
            .and_then(|a| a.pin.battery.get(r.battery_idx))
            .cloned()
        else {
            r.mode = RunMode::Wait;
            return;
        };
        let total = r.active.as_ref().map_or(0, |a| a.pin.battery.len());
        let hints = data::instructions_for(item.test_id, &numeric_params(&item.params))
            .map(|i| i.key_hints)
            .unwrap_or_default();
        let mut start = false;
        ui.vertical_centered(|ui| {
            ui.add_space((ui.available_height() * 0.15).max(10.0));
            ui.label(theme::eyebrow(&format!(
                "Test {} di {}",
                r.battery_idx + 1,
                total
            )));
            ui.label(theme::display_text(
                &test_title(item.test_id),
                44.0,
                theme::INK,
                3.0,
            ));
            ui.add_space(14.0);
            theme::card_frame().fill(theme::ACCENT_SOFT).show(ui, |ui| {
                for hint in &hints {
                    ui.label(RichText::new(hint).monospace().color(theme::INK));
                }
            });
            ui.add_space(18.0);
            start = ui
                .button(RichText::new("Inizia il test").size(18.0))
                .clicked();
            if let Some(notice) = &r.notice {
                ui.label(RichText::new(notice).color(theme::DANGER));
            }
        });
        if start {
            self.start_test(r, &item, factory);
        }
    }

    fn start_test(&mut self, r: &mut ActiveRun, item: &BatteryItem, factory: RunnerFactory) {
        let started_at = iso_now();
        let spec = RunnerSpec {
            test_id: item.test_id,
            params: &item.params,
            session_id: &r.run.run_id,
            started_at: &started_at,
            seed: entropy_seed(),
            practice: item.practice,
            feedback: self.feedback_during_test,
        };
        match factory(&spec) {
            Some(runner) => {
                r.runner = Some(runner);
                r.notice = None;
                r.mode = RunMode::Test;
            }
            None => {
                r.notice = Some("Questo test non è ancora disponibile in questa versione.".into())
            }
        }
    }

    fn test_ui(&mut self, ui: &mut egui::Ui, r: &mut ActiveRun) {
        let Some(runner) = r.runner.as_mut() else {
            r.mode = RunMode::Wait;
            return;
        };
        let status = theme::stimulus_frame()
            .show(ui, |ui| {
                ui.set_min_size(ui.available_size());
                runner.ui(ui)
            })
            .inner;
        match status {
            RunnerStatus::Running => {}
            RunnerStatus::Aborted => {
                r.runner = None;
                r.mode = RunMode::Wait;
            }
            RunnerStatus::Finished(result) => self.finish_test(r, *result),
        }
    }

    fn finish_test(&mut self, r: &mut ActiveRun, result: TestResult) {
        r.runner = None;
        let Some(ctx) = r.active.clone() else {
            r.mode = RunMode::Wait;
            return;
        };
        let progress = record_result(&mut r.run, &ctx, r.battery_idx, result, now_epoch_ms());
        self.persist(r);
        match progress {
            Progress::NextTest => {
                r.battery_idx += 1;
                r.mode = RunMode::Ready;
            }
            Progress::BatteryDone => {
                r.alerted_pin = None;
                r.active = None;
                r.mode = RunMode::Wait;
            }
            Progress::SessionDone => r.mode = RunMode::Done,
        }
    }
}

fn wait_top_bar(ui: &mut egui::Ui, r: &mut ActiveRun, state: &SessionState) {
    ui.horizontal(|ui| {
        ui.label(muted("Fase:"));
        ui.label(RichText::new(&state.current_phase_name).strong());
        ui.add_space(24.0);
        ui.label(
            RichText::new(format!(
                "Sessione {} / {} · batteria {} di {}",
                fmt_countdown(r.elapsed_ms()),
                fmt_countdown(session_total_ms(&r.run.template)),
                (state.position_index + 1).min(state.total),
                state.total
            ))
            .monospace()
            .color(theme::MUTED),
        );
        if ui.small_button("Esci").clicked() {
            r.exiting = true;
        }
    });
}

fn wait_center(ui: &mut egui::Ui, r: &mut ActiveRun, state: &SessionState) {
    let upcoming = state
        .upcoming_tests
        .iter()
        .map(|t| test_title(*t))
        .collect::<Vec<_>>()
        .join(" → ");
    ui.vertical_centered(|ui| {
        ui.add_space((ui.available_height() * 0.12).max(10.0));
        if state.due {
            ui.label(theme::display_text(
                "È ora dei test",
                96.0,
                theme::ACCENT_GLOW,
                3.0,
            ));
            ui.label(muted("Batteria in arrivo:"));
            ui.label(RichText::new(&upcoming).size(18.0));
            ui.add_space(24.0);
            if ui.button(RichText::new("Inizia").size(20.0)).clicked() {
                if let Some(pin) = &state.next_pin {
                    r.active = Some(ActiveContext {
                        phase_id: state.current_phase_id.clone(),
                        phase_name: state.current_phase_name.clone(),
                        pin: pin.clone(),
                    });
                    r.battery_idx = 0;
                    r.mode = RunMode::Ready;
                }
            }
        } else {
            ui.label(theme::eyebrow("Prossima batteria tra"));
            ui.label(theme::display_text(
                &fmt_countdown(state.countdown_ms),
                200.0,
                theme::INK,
                4.0,
            ));
            ui.label(muted("In arrivo:"));
            ui.label(RichText::new(&upcoming).size(16.0));
            ui.add_space(20.0);
            ui.label(muted(
                "Puoi allontanarti: un avviso sonoro ti richiamerà quando è il momento dei test.",
            ));
        }
    });
}

// ───────────────────────── Risultati ─────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionExport {
    Json,
    Csv,
    SummaryCsv,
}

/// Scrive l'export richiesto in `dir` e ritorna il percorso del file.
pub fn export_session(
    run: &SessionRun,
    kind: SessionExport,
    dir: &Path,
) -> Result<PathBuf, String> {
    let (name, content) = match kind {
        SessionExport::Json => (
            session_filename(run, "json"),
            to_session_json(run, &iso_now(), USER_AGENT),
        ),
        SessionExport::Csv => (session_filename(run, "csv"), to_session_csv(run)),
        SessionExport::SummaryCsv => (
            format!(
                "{}_riepilogo.csv",
                session_filename(run, "csv").trim_end_matches(".csv")
            ),
            to_session_summary_csv(run, CsvLocale::It),
        ),
    };
    std::fs::create_dir_all(dir).map_err(|e| format!("cartella {}: {e}", dir.display()))?;
    let path = dir.join(name);
    std::fs::write(&path, content).map_err(|e| format!("scrittura {}: {e}", path.display()))?;
    Ok(path)
}

fn first_metric(result: &TestResult) -> String {
    result.summary.first().map_or_else(
        || "—".to_string(),
        |m| {
            format!(
                "{}: {}{}",
                m.label,
                m.value,
                m.unit
                    .as_ref()
                    .map_or_else(String::new, |u| format!(" {u}"))
            )
        },
    )
}

fn results_ui(ui: &mut egui::Ui, r: &mut ActiveRun) -> Option<Exit> {
    let eyebrow = if r.run.finished {
        "Sessione completata"
    } else {
        "Sessione interrotta — dati parziali"
    };
    let mut exit = None;
    egui::ScrollArea::vertical().auto_shrink(false).show(ui, |ui| {
        page_title(ui, eyebrow, &r.run.template.name);
        theme::card_frame().fill(theme::ACCENT_SOFT).stroke(Stroke::new(1.0, theme::ACCENT)).show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.label(theme::eyebrow("Codice sessione"));
                ui.label(RichText::new(&r.run.run_id).monospace().size(16.0));
            });
        });
        ui.add_space(10.0);
        results_table(ui, &r.run);
        ui.add_space(10.0);
        ui.horizontal_wrapped(|ui| {
            for (label, kind) in [
                ("Salva JSON di sessione", SessionExport::Json),
                ("Salva CSV combinato", SessionExport::Csv),
                ("Salva riepilogo metriche", SessionExport::SummaryCsv),
            ] {
                if ui.button(label).clicked() {
                    r.notice = Some(match export_session(&r.run, kind, &storage::export_dir()) {
                        Ok(path) => format!("Salvato: {}", path.display()),
                        Err(e) => format!("Errore: {e}"),
                    });
                }
            }
            if ui.button("← Torna al menu").clicked() {
                exit = Some(Exit::Clear);
            }
        });
        if let Some(notice) = &r.notice {
            ui.label(RichText::new(notice).monospace().color(theme::ACCENT_GLOW));
        }
        ui.label(muted("Il CSV combina tutti i trial con colonne di contesto fase / t / test. Il riepilogo ha una riga per metrica. Il JSON contiene il protocollo e ogni risultato per esteso."));
    });
    exit
}

fn results_table(ui: &mut egui::Ui, run: &SessionRun) {
    theme::card_frame().show(ui, |ui| {
        ui.set_width(ui.available_width());
        if run.results.is_empty() {
            ui.label(muted("Nessun test completato."));
            return;
        }
        egui::Grid::new("session-results")
            .striped(true)
            .num_columns(4)
            .spacing([24.0, 6.0])
            .show(ui, |ui| {
                for h in ["Fase", "t", "Test", "Prima metrica"] {
                    ui.label(theme::eyebrow(h));
                }
                ui.end_row();
                for item in &run.results {
                    ui.label(&item.phase_name);
                    ui.label(RichText::new(fmt_clock(item.offset_ms)).monospace());
                    ui.label(test_title(item.result.test_id));
                    ui.label(first_metric(&item.result));
                    ui.end_row();
                }
            });
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::{Phase, SummaryMetric, TrialResult, ValidationFlag};

    const MIN: f64 = MINUTE_MS;

    fn pin(id: &str, offset_min: f64, tests: &[TestId]) -> TimePin {
        TimePin {
            id: id.into(),
            offset_ms: offset_min * MIN,
            label: None,
            battery: tests.iter().map(|t| default_battery_item(*t)).collect(),
        }
    }

    fn template() -> SessionTemplate {
        SessionTemplate {
            id: "tpl_1".into(),
            name: "Protocollo".into(),
            created_at: "2026-07-07T10:00:00.000Z".into(),
            total_ms: 20.0 * MIN,
            phases: vec![
                SessionPhase {
                    id: "p1".into(),
                    name: "Baseline".into(),
                    duration_ms: 10.0 * MIN,
                    pins: vec![pin("a", 0.0, &[TestId::Corsi, TestId::Wcst])],
                },
                SessionPhase {
                    id: "p2".into(),
                    name: "Carico".into(),
                    duration_ms: 10.0 * MIN,
                    pins: vec![pin("b", 15.0, &[TestId::Pvt])],
                },
            ],
        }
    }

    fn result(test_id: TestId) -> TestResult {
        TestResult {
            test_id,
            session_id: "S-X".into(),
            started_at: "2026-07-07T10:00:00.000Z".into(),
            params: Map::new(),
            trials: vec![TrialResult {
                test_id,
                session_id: "S-X".into(),
                trial_index: 0,
                phase: Phase::Test,
                condition: "c".into(),
                stimulus: "s".into(),
                response: None,
                correct: true,
                rt_ms: Some(300.0),
                flag: ValidationFlag::Valid,
                onset_timestamp: 0.0,
            }],
            summary: vec![SummaryMetric::new("RT medio", 300.0, Some("ms"))],
        }
    }

    fn temp_dir(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("sintropia-session-{}-{name}", std::process::id()))
    }

    #[test]
    fn should_format_and_parse_clock_values() {
        assert_eq!(fmt_clock(90_000.0), "1:30");
        assert_eq!(fmt_countdown(65_000.0), "01:05");
        assert_eq!(fmt_countdown(-5_000.0), "00:00");
        assert_eq!(parse_clock("1:30"), Some(90.0));
        assert_eq!(parse_clock("2"), Some(120.0));
        assert_eq!(parse_clock("1:00:05"), Some(3605.0));
        assert_eq!(parse_clock("abc"), None);
        assert_eq!(parse_clock("-1"), None);
    }

    #[test]
    fn should_validate_templates_with_the_web_app_messages() {
        let mut t = template();
        assert_eq!(validate_template(&t), None);
        t.name = "  ".into();
        assert_eq!(
            validate_template(&t).as_deref(),
            Some("Assegna un nome alla sessione.")
        );
        let mut t = template();
        t.phases[1].duration_ms = 20.0 * MIN;
        assert_eq!(
            validate_template(&t).as_deref(),
            Some("La somma delle durate delle fasi supera la durata totale.")
        );
        let mut t = template();
        t.phases[0].pins[0].offset_ms = 11.0 * MIN;
        assert!(validate_template(&t)
            .unwrap()
            .contains("fuori dal suo intervallo"));
        let mut t = template();
        t.phases[1].pins[0].battery.clear();
        assert_eq!(
            validate_template(&t).as_deref(),
            Some("Ogni pin deve avere almeno un test nella batteria.")
        );
        let mut t = template();
        t.phases.iter_mut().for_each(|p| p.pins.clear());
        assert_eq!(
            validate_template(&t).as_deref(),
            Some("Aggiungi almeno un pin \"t\".")
        );
    }

    #[test]
    fn should_import_a_template_filling_missing_fields_and_reject_garbage() {
        let json = r#"{"name":"X","phases":[{"id":"p","name":"F","pins":[]}]}"#;
        let t = import_template_json(json, "2026-01-01T00:00:00.000Z", &mut || 0.5).unwrap();
        assert_eq!(
            (t.name.as_str(), t.total_ms, t.phases[0].duration_ms),
            ("X", 0.0, 0.0)
        );
        assert!(t.id.starts_with("imp_"));
        assert!(import_template_json("{}", "", &mut || 0.0).is_err());
        assert!(import_template_json("non json", "", &mut || 0.0).is_err());
        let exported = serde_json::to_string(&template()).unwrap();
        assert_eq!(
            import_template_json(&exported, "", &mut || 0.0).unwrap(),
            template()
        );
    }

    #[test]
    fn should_freeze_default_params_as_integers_where_whole() {
        let item = default_battery_item(TestId::Corsi);
        assert!(item.params["startLength"].is_i64());
        assert!(!item.practice);
        assert!(
            serde_json::from_value::<sintropia_engines::corsi::Params>(Value::Object(item.params))
                .is_ok()
        );
    }

    #[test]
    fn should_create_runs_with_anonymous_id_and_iso_start() {
        let run = new_run(&template(), 1_783_418_400_000.0, &mut || 0.0);
        assert!(run.run_id.starts_with("S-AAAA-"));
        assert_eq!(run.run_id.len(), 11);
        assert!(run.started_at_iso.starts_with("2026-"));
        assert!(!run.finished && run.results.is_empty());
    }

    #[test]
    fn should_walk_a_session_through_batteries_to_completion() {
        let t = template();
        let mut run = new_run(&t, 0.0, &mut || 0.0);
        let ctx = |pin: &TimePin, phase: &SessionPhase| ActiveContext {
            phase_id: phase.id.clone(),
            phase_name: phase.name.clone(),
            pin: pin.clone(),
        };
        let first = ctx(&t.phases[0].pins[0], &t.phases[0]);
        assert_eq!(
            record_result(&mut run, &first, 0, result(TestId::Corsi), 0.0),
            Progress::NextTest
        );
        assert!(run.completed_pin_ids.is_empty());
        assert_eq!(
            record_result(&mut run, &first, 1, result(TestId::Wcst), 1.0),
            Progress::BatteryDone
        );
        assert_eq!(run.completed_pin_ids, ["a"]);
        let second = ctx(&t.phases[1].pins[0], &t.phases[1]);
        assert_eq!(
            record_result(&mut run, &second, 0, result(TestId::Pvt), 16.0 * MIN),
            Progress::SessionDone
        );
        assert!(run.finished);
        assert_eq!(run.results.len(), 3);
        assert_eq!(run.results[1].index_in_battery, 1);
        assert_eq!(run.results[2].phase_name, "Carico");
    }

    #[test]
    fn should_persist_templates_and_runs_as_json_and_survive_corrupt_files() {
        let dir = temp_dir("store");
        let store = SessionStore::new(dir.clone());
        assert!(store.load_templates().is_empty() && store.load_run().is_none());
        let mut t = template();
        store.save_template(&t).unwrap();
        t.name = "Rinominato".into();
        store.save_template(&t).unwrap();
        assert_eq!(store.load_templates(), vec![t.clone()]);
        let run = new_run(&t, 5.0, &mut || 0.0);
        store.save_run(&run).unwrap();
        assert_eq!(store.load_run(), Some(run));
        store.clear_run();
        assert!(store.load_run().is_none());
        store.delete_template("tpl_1").unwrap();
        assert!(store.load_templates().is_empty());
        std::fs::write(dir.join("session-templates.json"), "{rotto").unwrap();
        assert!(store.load_templates().is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn should_export_session_files_with_expected_names() {
        let dir = temp_dir("export");
        let mut run = new_run(&template(), 0.0, &mut || 0.0);
        run.results.push(SessionTestResult {
            phase_id: "p1".into(),
            phase_name: "Baseline".into(),
            pin_id: "a".into(),
            offset_ms: 0.0,
            index_in_battery: 0,
            result: result(TestId::Pvt),
        });
        for kind in [
            SessionExport::Json,
            SessionExport::Csv,
            SessionExport::SummaryCsv,
        ] {
            let path = export_session(&run, kind, &dir).unwrap();
            assert!(std::fs::metadata(&path).unwrap().len() > 0, "{kind:?}");
            let name = path.file_name().unwrap().to_string_lossy().into_owned();
            assert_eq!(
                name.ends_with("_riepilogo.csv"),
                kind == SessionExport::SummaryCsv
            );
        }
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn should_edit_the_draft_like_the_builder_does() {
        let mut rand = mulberry32(1);
        let mut b = BuilderState::new(template());
        b.apply(Op::AddPhase, &mut rand);
        assert_eq!(b.draft.phases[2].duration_ms, 0.0);
        b.apply(Op::AddPinAt(12.0 * MIN), &mut rand);
        assert_eq!(b.draft.phases[1].pins.len(), 2);
        assert!(b.selected_pin.is_some());
        b.apply(Op::MovePin("a".into(), 12.0 * MIN), &mut rand);
        assert!(b.draft.phases[1].pins.iter().any(|p| p.id == "a"));
        b.apply(Op::MovePhase(0, 1), &mut rand);
        assert_eq!(b.draft.phases[1].name, "Baseline");
        b.apply(Op::RemovePin("a".into()), &mut rand);
        assert!(b
            .draft
            .phases
            .iter()
            .all(|p| p.pins.iter().all(|x| x.id != "a")));
        b.apply(Op::RemovePhase(99), &mut rand);
        assert_eq!(b.draft.phases.len(), 3);
    }
}
