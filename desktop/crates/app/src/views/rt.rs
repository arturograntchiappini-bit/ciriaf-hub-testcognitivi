//! Runner condiviso dei test a tempo di reazione (porta `src/ui/runtime/RtTestRunner.tsx`).
//!
//! Due livelli: [`RtMachine`] è la macchina a stati pratica → conto alla rovescia → test (+ pausa),
//! senza GUI e testabile con `FakeEnv`; [`RtRunner`] la collega a egui (input, disegno, repaint).
use std::cell::RefCell;
use std::rc::Rc;

use eframe::egui::{self, Align2, Color32, FontFamily, FontId, Pos2, Rect, RichText, Sense, Vec2};
use serde_json::{Map, Value};
use sintropia_core::sequencer::{
    create_sequencer, Cancel, Clock, Feedback, Scheduler, Sequencer, SequencerConfig,
    SequencerPhase, SequencerState, TrialSpec,
};
use sintropia_core::{Phase, SummaryMetric, TestId, TestResult, TrialResult};

use crate::runner::{RunnerStatus, TestRunner};
use crate::runtime::{key_name, EguiEnv};
use crate::theme::stimulus;

/// Durata del feedback opzionale durante il test (più breve di quello di pratica).
const TEST_FEEDBACK_MS: f64 = 450.0;
/// Scansione del conto alla rovescia 3-2-1 (ms dall'inizio): «2» a 700, «1» a 1400, test a 2100.
const COUNTDOWN_STEPS: [(f64, Option<u8>); 3] =
    [(700.0, Some(2)), (1400.0, Some(1)), (2100.0, None)];
const STATUS_BAR_HEIGHT: f32 = 30.0;
const DANGER: Color32 = Color32::from_rgb(208, 2, 27);

/// Dati comuni a ogni somministrazione, passati dal costruttore `create_runner`.
#[derive(Debug, Clone)]
pub struct RunContext {
    pub session_id: String,
    pub started_at: String,
    pub seed: u32,
    pub practice: bool,
    pub feedback_during_test: bool,
}

#[derive(Debug, Clone, Copy)]
pub struct RtTiming {
    pub fixation_ms: f64,
    pub stimulus_visible_ms: f64,
    pub response_window_ms: f64,
    pub isi_ms: f64,
    pub end_on_response: bool,
    pub practice_feedback_ms: f64,
}

pub struct RtTrial<S> {
    pub spec: TrialSpec,
    pub stimulus: S,
}

/// Contesto di disegno dello stimolo: l'area centrale (barra di stato esclusa).
pub struct StimulusCtx<'a> {
    pub painter: &'a egui::Painter,
    pub area: Rect,
    /// Falso durante «blank»/ISI (SART: maschera; PVT: contatore a zero).
    pub show: bool,
    /// Ms dall'inizio della presentazione dello stimolo (contatore del PVT).
    pub elapsed_ms: f64,
}

impl StimulusCtx<'_> {
    pub fn center(&self) -> Pos2 {
        self.area.center()
    }
}

/// Piano di un test: tutto ciò che serve al runner generico. `S` è lo stimolo del motore.
pub struct RtPlan<S> {
    pub test_id: TestId,
    pub session_id: String,
    pub started_at: String,
    pub params: Map<String, Value>,
    pub practice: Vec<RtTrial<S>>,
    pub test: Vec<RtTrial<S>>,
    pub timing: RtTiming,
    pub response_keys: Vec<String>,
    pub expects_response: fn(&TrialSpec) -> bool,
    pub evaluate: fn(&TrialSpec, Option<&str>) -> bool,
    pub status_hint: String,
    pub score: Box<dyn Fn(&[TrialResult]) -> Vec<SummaryMetric>>,
    pub draw: fn(&StimulusCtx, &S),
}

/// Il tasto corretto è nel `data` dello spec (stringa): vale per Stroop, Flanker, Visual Search, Mental Rotation.
pub fn evaluate_expected_key(spec: &TrialSpec, key: Option<&str>) -> bool {
    match (key, spec.data.as_ref().and_then(Value::as_str)) {
        (Some(pressed), Some(expected)) => pressed == expected,
        _ => false,
    }
}

/// Go/target: si risponde; altrimenti ci si trattiene (Go/No-Go, SART, N-Back).
pub fn evaluate_go(spec: &TrialSpec, key: Option<&str>, go_condition: &str) -> bool {
    (spec.condition == go_condition) == key.is_some()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Stage {
    Practice,
    Countdown,
    Test,
    Paused,
}

#[derive(Default)]
struct Shared {
    seq_state: Option<SequencerState>,
    trials: Vec<TrialResult>,
    practice_count: u32,
    test_count: u32,
    countdown: u8,
    practice_done: bool,
    countdown_done: bool,
    test_done: bool,
}

/// Macchina a stati del test (nessuna GUI). Le callback del sequencer toccano solo `Shared`;
/// le transizioni di stage avvengono in [`RtMachine::update`], da chiamare dopo ogni avanzamento del tempo.
pub struct RtMachine<S> {
    plan: RtPlan<S>,
    scheduler: Rc<dyn Scheduler>,
    clock: Rc<dyn Clock>,
    feedback_during_test: bool,
    shared: Rc<RefCell<Shared>>,
    stage: Stage,
    /// Indice, nella lista completa, del primo trial del blocco in corso (diverso da 0 dopo una ripresa).
    offset: usize,
    seq: Option<Sequencer>,
    countdown_cancels: Vec<Cancel>,
}

impl<S> RtMachine<S> {
    pub fn new(
        plan: RtPlan<S>,
        scheduler: Rc<dyn Scheduler>,
        clock: Rc<dyn Clock>,
        practice: bool,
        feedback_during_test: bool,
    ) -> Self {
        let first = if practice && !plan.practice.is_empty() {
            Stage::Practice
        } else {
            Stage::Countdown
        };
        let mut machine = Self {
            plan,
            scheduler,
            clock,
            feedback_during_test,
            shared: Rc::new(RefCell::new(Shared::default())),
            stage: first,
            offset: 0,
            seq: None,
            countdown_cancels: Vec::new(),
        };
        machine.enter(first);
        machine
    }

    pub fn plan(&self) -> &RtPlan<S> {
        &self.plan
    }

    pub fn stage(&self) -> Stage {
        self.stage
    }

    pub fn countdown(&self) -> u8 {
        self.shared.borrow().countdown
    }

    pub fn seq_state(&self) -> Option<SequencerState> {
        self.shared.borrow().seq_state
    }

    pub fn is_finished(&self) -> bool {
        self.shared.borrow().test_done
    }

    fn trials_for(&self, stage: Stage) -> &[RtTrial<S>] {
        if stage == Stage::Practice {
            &self.plan.practice
        } else {
            &self.plan.test
        }
    }

    /// (etichetta, trial corrente 1-based, totale) per la barra di stato.
    pub fn progress(&self) -> (&'static str, usize, usize) {
        let total = self.trials_for(self.stage).len();
        let index = self.seq_state().map_or(0, |s| s.index) + self.offset;
        let label = if self.stage == Stage::Practice {
            "Pratica"
        } else {
            "Test"
        };
        (label, (index + 1).min(total), total)
    }

    /// Stimolo del trial corrente del blocco in corso.
    pub fn current_stimulus(&self) -> Option<&S> {
        let index = self.seq_state()?.index + self.offset;
        self.trials_for(self.stage).get(index).map(|t| &t.stimulus)
    }

    fn cancel_running(&mut self) {
        if let Some(seq) = self.seq.take() {
            seq.cancel();
        }
        for cancel in self.countdown_cancels.drain(..) {
            cancel();
        }
    }

    fn enter(&mut self, stage: Stage) {
        self.cancel_running();
        self.stage = stage;
        match stage {
            Stage::Practice => self.start_block(Phase::Practice, 0),
            Stage::Test => {
                let resume_from = self.shared.borrow().test_count as usize;
                self.start_block(Phase::Test, resume_from);
            }
            Stage::Countdown => self.start_countdown(),
            Stage::Paused => {}
        }
    }

    fn start_countdown(&mut self) {
        self.shared.borrow_mut().countdown = 3;
        for (delay, value) in COUNTDOWN_STEPS {
            let shared = Rc::clone(&self.shared);
            let cancel = self.scheduler.timeout(
                delay,
                Box::new(move || {
                    let mut state = shared.borrow_mut();
                    match value {
                        Some(n) => state.countdown = n,
                        None => state.countdown_done = true,
                    }
                }),
            );
            self.countdown_cancels.push(cancel);
        }
    }

    fn start_block(&mut self, phase: Phase, from_index: usize) {
        self.shared.borrow_mut().seq_state = None;
        let trials = self.trials_for(if phase == Phase::Practice {
            Stage::Practice
        } else {
            Stage::Test
        });
        let from = from_index.min(trials.len());
        let specs: Vec<TrialSpec> = trials[from..].iter().map(|t| t.spec.clone()).collect();
        self.offset = from;
        let seq = create_sequencer(self.sequencer_config(phase, specs));
        seq.start();
        self.seq = Some(seq);
    }

    fn sequencer_config(&self, phase: Phase, trials: Vec<TrialSpec>) -> SequencerConfig {
        let timing = self.plan.timing;
        let feedback_ms = match (phase, self.feedback_during_test) {
            (Phase::Practice, _) => timing.practice_feedback_ms,
            (Phase::Test, true) => TEST_FEEDBACK_MS,
            (Phase::Test, false) => 0.0,
        };
        let (on_state_sink, on_result_sink, on_done_sink) = (
            Rc::clone(&self.shared),
            Rc::clone(&self.shared),
            Rc::clone(&self.shared),
        );
        SequencerConfig {
            test_id: self.plan.test_id,
            session_id: self.plan.session_id.clone(),
            phase,
            trials,
            fixation_ms: timing.fixation_ms,
            stimulus_visible_ms: timing.stimulus_visible_ms,
            response_window_ms: timing.response_window_ms,
            isi_ms: timing.isi_ms,
            end_on_response: timing.end_on_response,
            feedback_ms,
            response_keys: self.plan.response_keys.clone(),
            expects_response: Box::new(self.plan.expects_response),
            evaluate: Box::new(self.plan.evaluate),
            clock: Rc::clone(&self.clock),
            scheduler: Rc::clone(&self.scheduler),
            on_state: Box::new(move |s| on_state_sink.borrow_mut().seq_state = Some(*s)),
            on_trial_result: Box::new(move |r| record_trial(&on_result_sink, phase, r)),
            on_done: Box::new(move || {
                let mut shared = on_done_sink.borrow_mut();
                if phase == Phase::Practice {
                    shared.practice_done = true;
                } else {
                    shared.test_done = true;
                }
            }),
        }
    }

    /// Applica le transizioni richieste dalle callback (fine pratica, fine conto alla rovescia).
    pub fn update(&mut self) {
        let (practice_done, countdown_done) = {
            let mut shared = self.shared.borrow_mut();
            (
                std::mem::take(&mut shared.practice_done),
                std::mem::take(&mut shared.countdown_done),
            )
        };
        if practice_done && self.stage == Stage::Practice {
            self.enter(Stage::Countdown);
        }
        if countdown_done && self.stage == Stage::Countdown {
            self.enter(Stage::Test);
        }
    }

    /// Un tasto di risposta al `timestamp` (stessa scala del clock). Ignorato fuori da pratica/test.
    pub fn handle_key(&self, key: &str, timestamp: f64) {
        if matches!(self.stage, Stage::Practice | Stage::Test) {
            if let Some(seq) = &self.seq {
                seq.handle_key(key, timestamp);
            }
        }
    }

    /// Perdita di focus della finestra: il trial in corso diventa INTERRUPTED.
    pub fn interrupt(&self) {
        if matches!(self.stage, Stage::Practice | Stage::Test) {
            if let Some(seq) = &self.seq {
                seq.handle_interrupt();
            }
        }
    }

    /// Esc: ferma il blocco e va in pausa.
    pub fn pause(&mut self) {
        if matches!(self.stage, Stage::Practice | Stage::Test) {
            self.enter(Stage::Paused);
        }
    }

    /// Riprende il test dal punto raggiunto (anche se la pausa era in pratica, come nel TS).
    pub fn resume(&mut self) {
        if self.stage == Stage::Paused {
            self.enter(Stage::Test);
        }
    }

    pub fn skip_practice(&mut self) {
        if self.stage == Stage::Practice {
            self.enter(Stage::Countdown);
        }
    }

    /// Risultato con tutti i trial raccolti finora (pratica inclusa, marcata dalla fase).
    pub fn build_result(&self) -> TestResult {
        let trials = self.shared.borrow().trials.clone();
        TestResult {
            test_id: self.plan.test_id,
            session_id: self.plan.session_id.clone(),
            started_at: self.plan.started_at.clone(),
            params: self.plan.params.clone(),
            summary: (self.plan.score)(&trials),
            trials,
        }
    }
}

/// Reindicizza in modo continuo per fase (robusto alla ripresa parziale) e accumula.
fn record_trial(shared: &Rc<RefCell<Shared>>, phase: Phase, result: &TrialResult) {
    let mut state = shared.borrow_mut();
    let counter = if phase == Phase::Practice {
        &mut state.practice_count
    } else {
        &mut state.test_count
    };
    let mut trial = result.clone();
    trial.trial_index = *counter;
    *counter += 1;
    state.trials.push(trial);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum UiAction {
    SkipPractice,
    Resume,
    ExportPartial,
    Abort,
}

/// Runner egui di un test a tempo di reazione.
pub struct RtRunner<S> {
    machine: RtMachine<S>,
    env: Rc<EguiEnv>,
    pending: Option<UiAction>,
    was_focused: bool,
    last_frame: u64,
    /// (indice trial, istante frame) del primo frame con lo stimolo visibile.
    shown_since: Option<(usize, f64)>,
}

impl<S: 'static> RtRunner<S> {
    pub fn new(plan: RtPlan<S>, practice: bool, feedback_during_test: bool) -> Self {
        let env = EguiEnv::new();
        let machine = RtMachine::new(
            plan,
            env.clone(),
            env.clone(),
            practice,
            feedback_during_test,
        );
        Self {
            machine,
            env,
            pending: None,
            was_focused: true,
            last_frame: u64::MAX,
            shown_since: None,
        }
    }

    /// Elabora tempo e input del frame. Restituisce l'esito se il test è finito o abbandonato.
    fn begin_frame(&mut self, ctx: &egui::Context) -> Option<RunnerStatus> {
        // Prima il tempo (timer e callback di paint), poi le azioni dell'utente e gli input:
        // ciò che questi avviano viene disegnato in questo frame e misurato dal successivo.
        self.env.pump();
        if let Some(action) = self.pending.take() {
            match action {
                UiAction::SkipPractice => self.machine.skip_practice(),
                UiAction::Resume => self.machine.resume(),
                UiAction::ExportPartial => {
                    return Some(RunnerStatus::Finished(Box::new(
                        self.machine.build_result(),
                    )))
                }
                UiAction::Abort => return Some(RunnerStatus::Aborted),
            }
        }
        self.machine.update();
        self.read_input(ctx);
        self.machine
            .is_finished()
            .then(|| RunnerStatus::Finished(Box::new(self.machine.build_result())))
    }

    fn read_input(&mut self, ctx: &egui::Context) {
        let (focused, events) = ctx.input(|i| (i.focused, i.events.clone()));
        if self.was_focused && !focused {
            self.machine.interrupt();
        }
        self.was_focused = focused;
        let timestamp = self.env.frame_ms();
        for event in events {
            let egui::Event::Key {
                key,
                pressed: true,
                repeat: false,
                ..
            } = event
            else {
                continue;
            };
            if key == egui::Key::Escape {
                self.machine.pause();
            } else if let Some(name) = key_name(key) {
                self.machine.handle_key(name, timestamp);
            }
        }
    }

    fn request_repaint(&self, ctx: &egui::Context) {
        let running = matches!(self.machine.stage(), Stage::Practice | Stage::Test);
        if running || self.pending.is_some() {
            ctx.request_repaint(); // vsync: un frame per refresh, necessario al timing e al contatore PVT
        } else {
            self.env.request_repaint(ctx);
        }
    }

    fn draw(&mut self, ui: &mut egui::Ui) {
        let (rect, _) = ui.allocate_exact_size(ui.available_size(), Sense::hover());
        match self.machine.stage() {
            Stage::Paused => self.draw_pause(ui, rect),
            Stage::Countdown => self.draw_countdown(ui, rect),
            Stage::Practice | Stage::Test => self.draw_trial(ui, rect),
        }
    }

    fn draw_countdown(&self, ui: &egui::Ui, rect: Rect) {
        let painter = ui.painter_at(rect);
        painter.text(
            rect.center() - Vec2::new(0.0, 12.0),
            Align2::CENTER_CENTER,
            self.machine.countdown(),
            FontId::new(72.0, FontFamily::Proportional),
            stimulus::INK,
        );
        painter.text(
            rect.center() + Vec2::new(0.0, 48.0),
            Align2::CENTER_CENTER,
            "Preparati…",
            FontId::new(14.0, FontFamily::Proportional),
            stimulus::MUTED,
        );
    }

    fn draw_pause(&mut self, ui: &mut egui::Ui, rect: Rect) {
        let card = Rect::from_center_size(rect.center(), Vec2::new(420.0, 300.0));
        let painter = ui.painter_at(rect);
        painter.rect_filled(card, 0.0, Color32::from_rgb(247, 248, 250));
        painter.rect_stroke(
            card,
            0.0,
            egui::Stroke::new(1.0, stimulus::LINE),
            egui::StrokeKind::Inside,
        );
        let inner = card.shrink(28.0);
        ui.scope_builder(egui::UiBuilder::new().max_rect(inner), |ui| {
            ui.vertical_centered(|ui| {
                ui.label(RichText::new("Test in pausa").size(19.0).color(stimulus::INK));
                ui.add_space(6.0);
                ui.label(
                    RichText::new(
                        "Puoi riprendere dal punto in cui eri, uscire salvando i dati raccolti finora, oppure uscire senza salvare.",
                    )
                    .size(13.5)
                    .color(stimulus::MUTED),
                );
                ui.add_space(14.0);
                for (label, action, primary) in [
                    ("Riprendi il test", UiAction::Resume, true),
                    ("Esci ed esporta i dati parziali", UiAction::ExportPartial, false),
                    ("Esci senza salvare", UiAction::Abort, false),
                ] {
                    if light_button(ui, label, primary, Some(inner.width())) {
                        self.pending = Some(action);
                    }
                }
            });
        });
    }

    fn draw_trial(&mut self, ui: &mut egui::Ui, rect: Rect) {
        let painter = ui.painter_at(rect);
        let area = Rect::from_min_max(
            rect.min,
            Pos2::new(rect.max.x, rect.max.y - STATUS_BAR_HEIGHT),
        );
        self.draw_status_bar(&painter, rect);
        painter.text(
            rect.min + Vec2::splat(4.0),
            Align2::LEFT_TOP,
            "Esc per interrompere",
            FontId::new(12.0, FontFamily::Proportional),
            stimulus::MUTED,
        );
        self.draw_content(&painter, area);
        if self.machine.stage() == Stage::Practice {
            let button = Rect::from_min_size(
                Pos2::new(rect.max.x - 150.0, rect.min.y),
                Vec2::new(150.0, 32.0),
            );
            let clicked = ui
                .scope_builder(egui::UiBuilder::new().max_rect(button), |ui| {
                    light_button(ui, "Salta pratica →", false, Some(150.0))
                })
                .inner;
            if clicked {
                self.pending = Some(UiAction::SkipPractice);
            }
        }
    }

    fn draw_status_bar(&self, painter: &egui::Painter, rect: Rect) {
        let bar = Rect::from_min_max(
            Pos2::new(rect.min.x, rect.max.y - STATUS_BAR_HEIGHT),
            rect.max,
        );
        painter.hline(
            bar.x_range(),
            bar.min.y,
            egui::Stroke::new(1.0, stimulus::LINE),
        );
        let font = FontId::new(12.0, FontFamily::Monospace);
        let y = bar.center().y;
        painter.text(
            Pos2::new(bar.min.x + 4.0, y),
            Align2::LEFT_CENTER,
            &self.machine.plan().status_hint,
            font.clone(),
            stimulus::MUTED,
        );
        let (label, index, total) = self.machine.progress();
        painter.text(
            Pos2::new(bar.max.x - 4.0, y),
            Align2::RIGHT_CENTER,
            format!("{label} · trial {index}/{total}"),
            font,
            stimulus::MUTED,
        );
    }

    fn draw_content(&mut self, painter: &egui::Painter, area: Rect) {
        let Some(state) = self.machine.seq_state() else {
            return;
        };
        let elapsed_ms = self.track_stimulus_time(&state);
        if state.phase == SequencerPhase::Feedback {
            let (text, color) = if state.feedback == Some(Feedback::Correct) {
                ("Corretto", stimulus::ACCENT)
            } else {
                ("Errato", DANGER)
            };
            let font = FontId::new(32.0, FontFamily::Proportional);
            super::bold_text(painter, area.center(), text, font, color);
        } else if state.phase == SequencerPhase::Fixation {
            let font = FontId::new(40.0, FontFamily::Proportional);
            painter.text(
                area.center(),
                Align2::CENTER_CENTER,
                "+",
                font,
                stimulus::INK,
            );
        } else if let Some(current) = self.machine.current_stimulus() {
            let ctx = StimulusCtx {
                painter,
                area,
                show: state.show_stimulus,
                elapsed_ms,
            };
            (self.machine.plan().draw)(&ctx, current);
        }
    }

    /// Ms da quando lo stimolo del trial corrente è visibile (0 se non lo è).
    fn track_stimulus_time(&mut self, state: &SequencerState) -> f64 {
        let frame = self.env.frame_ms();
        if !state.show_stimulus {
            self.shown_since = None;
            return 0.0;
        }
        let since = match self.shown_since {
            Some((index, at)) if index == state.index => at,
            _ => frame,
        };
        self.shown_since = Some((state.index, since));
        frame - since
    }
}

/// Bottone sulla superficie chiara (il tema egui è scuro). `true` se cliccato.
fn light_button(ui: &mut egui::Ui, label: &str, primary: bool, width: Option<f32>) -> bool {
    let (fill, text) = if primary {
        (stimulus::ACCENT, Color32::WHITE)
    } else {
        (Color32::from_rgb(238, 241, 245), stimulus::INK)
    };
    let button = egui::Button::new(RichText::new(label).size(14.0).color(text))
        .fill(fill)
        .stroke(egui::Stroke::new(1.0, stimulus::LINE));
    let response = match width {
        Some(w) => ui.add_sized([w, 32.0], button),
        None => ui.add(button),
    };
    // Senza focus da tastiera, Spazio e frecce restano risposte del test e non attivano il bottone.
    if response.has_focus() {
        response.surrender_focus();
    }
    response.clicked()
}

impl<S: 'static> TestRunner for RtRunner<S> {
    fn test_id(&self) -> TestId {
        self.machine.plan().test_id
    }

    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus {
        let ctx = ui.ctx().clone();
        // egui può chiamare `ui` più volte nello stesso frame (pass di layout): tempo e input una volta sola.
        let frame = ctx.cumulative_frame_nr();
        if frame != self.last_frame {
            self.last_frame = frame;
            if let Some(status) = self.begin_frame(&ctx) {
                return status;
            }
        }
        self.draw(ui);
        self.request_repaint(&ctx);
        RunnerStatus::Running
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::sequencer::FakeEnv;
    use sintropia_core::ValidationFlag;

    fn trial(condition: &str) -> RtTrial<()> {
        RtTrial {
            spec: TrialSpec {
                condition: condition.into(),
                stimulus_label: condition.into(),
                isi_ms: None,
                data: Some(Value::String(" ".into())),
            },
            stimulus: (),
        }
    }

    fn plan(practice: usize, test: usize) -> RtPlan<()> {
        RtPlan {
            test_id: TestId::Sart,
            session_id: "S-TEST".into(),
            started_at: "2026-01-01T00:00:00.000Z".into(),
            params: Map::new(),
            practice: (0..practice).map(|_| trial("go")).collect(),
            test: (0..test).map(|_| trial("go")).collect(),
            timing: RtTiming {
                fixation_ms: 0.0,
                stimulus_visible_ms: 100.0,
                response_window_ms: 100.0,
                isi_ms: 0.0,
                end_on_response: true,
                practice_feedback_ms: 50.0,
            },
            response_keys: vec![" ".into()],
            expects_response: |_| true,
            evaluate: evaluate_expected_key,
            status_hint: String::new(),
            score: Box::new(|t| vec![SummaryMetric::new("Trial", t.len() as f64, None)]),
            draw: |_, _| {},
        }
    }

    fn machine(practice: usize, test: usize, with_practice: bool) -> (Rc<FakeEnv>, RtMachine<()>) {
        let env = FakeEnv::new();
        let m = RtMachine::new(
            plan(practice, test),
            env.clone(),
            env.clone(),
            with_practice,
            false,
        );
        (env, m)
    }

    fn advance(env: &FakeEnv, m: &mut RtMachine<()>, ms: f64) {
        env.advance(ms);
        m.update();
    }

    #[test]
    fn should_start_in_practice_when_enabled_and_trials_exist() {
        let (_, m) = machine(2, 2, true);
        assert_eq!(m.stage(), Stage::Practice);
    }

    #[test]
    fn should_start_in_countdown_when_practice_is_disabled_or_empty() {
        assert_eq!(machine(2, 2, false).1.stage(), Stage::Countdown);
        assert_eq!(machine(0, 2, true).1.stage(), Stage::Countdown);
    }

    #[test]
    fn should_run_practice_then_countdown_then_test_then_finish() {
        let (env, mut m) = machine(1, 2, true);
        m.handle_key(" ", env.time() + 200.0);
        advance(&env, &mut m, 0.0);
        advance(&env, &mut m, 400.0); // feedback 50 + isi 0 -> pratica finita
        assert_eq!(m.stage(), Stage::Countdown);
        assert_eq!(m.countdown(), 3);
        advance(&env, &mut m, 700.0);
        assert_eq!(m.countdown(), 2);
        advance(&env, &mut m, 700.0);
        assert_eq!(m.countdown(), 1);
        advance(&env, &mut m, 700.0);
        assert_eq!(m.stage(), Stage::Test);
        advance(&env, &mut m, 200.0); // due omissioni da 100 ms
        assert!(m.is_finished());
        let result = m.build_result();
        assert_eq!(result.trials.len(), 3);
        assert_eq!(result.trials[0].phase, Phase::Practice);
        assert_eq!(result.trials[1].trial_index, 0);
        assert_eq!(result.trials[2].trial_index, 1);
        assert_eq!(result.trials[2].flag, ValidationFlag::Omission);
        assert_eq!(result.summary[0].label, "Trial");
    }

    #[test]
    fn should_skip_practice_straight_to_countdown() {
        let (_, mut m) = machine(3, 2, true);
        m.skip_practice();
        assert_eq!(m.stage(), Stage::Countdown);
        assert!(m.build_result().trials.is_empty());
    }

    #[test]
    fn should_pause_on_escape_and_resume_the_test_from_where_it_was() {
        let (env, mut m) = machine(0, 3, false);
        advance(&env, &mut m, 2100.0);
        assert_eq!(m.stage(), Stage::Test);
        advance(&env, &mut m, 100.0); // 1° trial: omissione
        assert_eq!(m.build_result().trials.len(), 1);
        m.pause();
        assert_eq!(m.stage(), Stage::Paused);
        advance(&env, &mut m, 5000.0);
        assert_eq!(
            m.build_result().trials.len(),
            1,
            "in pausa il tempo non produce trial"
        );
        m.resume();
        assert_eq!(m.stage(), Stage::Test);
        let (_, current, total) = m.progress();
        assert_eq!(
            (current, total),
            (2, 3),
            "riprende dal 2° trial, non da capo"
        );
        advance(&env, &mut m, 200.0);
        assert!(m.is_finished());
        let indexes: Vec<u32> = m
            .build_result()
            .trials
            .iter()
            .map(|t| t.trial_index)
            .collect();
        assert_eq!(indexes, [0, 1, 2]);
    }

    #[test]
    fn should_ignore_keys_and_escape_during_countdown() {
        let (env, mut m) = machine(0, 1, false);
        m.handle_key(" ", env.time());
        m.pause();
        assert_eq!(m.stage(), Stage::Countdown);
        assert!(m.build_result().trials.is_empty());
    }

    #[test]
    fn should_flag_interrupted_when_window_loses_focus_during_a_trial() {
        let (env, mut m) = machine(0, 2, false);
        advance(&env, &mut m, 2100.0);
        advance(&env, &mut m, 30.0);
        m.interrupt();
        assert_eq!(m.build_result().trials[0].flag, ValidationFlag::Interrupted);
    }

    #[test]
    fn should_evaluate_expected_key_and_go_rules() {
        let mut spec = trial("go").spec;
        assert!(evaluate_expected_key(&spec, Some(" ")));
        assert!(!evaluate_expected_key(&spec, Some("r")));
        assert!(!evaluate_expected_key(&spec, None));
        spec.condition = "nogo".into();
        assert!(evaluate_go(&spec, None, "go"));
        assert!(!evaluate_go(&spec, Some(" "), "go"));
        spec.condition = "go".into();
        assert!(evaluate_go(&spec, Some(" "), "go"));
        assert!(!evaluate_go(&spec, None, "go"));
    }
}
