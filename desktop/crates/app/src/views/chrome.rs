//! Cornice comune dell'esecuzione dei test: sfondo chiaro, barra di stato con keycap e avanzamento,
//! feedback, conto alla rovescia, pannello di pausa e bottoni. Solo presentazione: nessuna logica di tempo.
//! Riferimento visivo: `RtTestRunner.tsx` / `StimulusStage.tsx` della web app.
use std::f32::consts::TAU;

use eframe::egui::{
    self, Align2, Color32, CornerRadius, FontFamily, FontId, Painter, Pos2, Rect, Sense, Shape,
    Stroke, StrokeKind, Ui, Vec2,
};

use crate::theme::{self, stimulus};

/// Altezza della barra di stato (punti egui: il DPI è già gestito da egui).
pub const BAR_HEIGHT: f32 = 48.0;
pub const GREEN: Color32 = Color32::from_rgb(0x2E, 0x7D, 0x32);
pub const TEXT: Color32 = Color32::from_rgb(60, 68, 84);
const SOFT: Color32 = Color32::from_rgb(238, 241, 245);
const SURFACE: Color32 = Color32::from_rgb(247, 248, 250);
const KEY_EDGE: Color32 = Color32::from_rgb(190, 197, 208);
const ACCENT_TINT: Color32 = Color32::from_rgb(0xEA, 0xF2, 0xFB);
const MARGIN: f32 = 16.0;

/// Fattore di scala degli stimoli: 1,0 su un'area 900×520 pt, proporzionale all'area con minimo e massimo.
pub fn scale(area: Rect) -> f32 {
    (area.width() / 900.0)
        .min(area.height() / 520.0)
        .clamp(0.75, 2.8)
}

/// Area di una somministrazione: finestra intera (barra di stato in basso) con sfondo chiaro già steso.
pub struct Stage {
    pub painter: Painter,
    pub rect: Rect,
    /// `rect` senza la barra di stato: dove si disegnano gli stimoli.
    pub area: Rect,
}

impl Stage {
    pub fn begin(ui: &mut Ui) -> Self {
        let (rect, _) = ui.allocate_exact_size(ui.available_size(), Sense::hover());
        let painter = ui.painter_at(rect);
        painter.rect_filled(rect, 0.0, stimulus::PAPER);
        let area = Rect::from_min_max(rect.min, Pos2::new(rect.max.x, rect.max.y - BAR_HEIGHT));
        Self {
            painter,
            rect,
            area,
        }
    }

    fn bar(&self) -> Rect {
        Rect::from_min_max(Pos2::new(self.rect.min.x, self.area.max.y), self.rect.max)
    }

    /// Barra in basso: hint dei tasti a sinistra, fase e avanzamento a destra, linea di progresso sul bordo.
    pub fn status_bar(&self, hint: &Hint, practice: bool, current: usize, total: usize) {
        let fraction = if total == 0 {
            0.0
        } else {
            current.saturating_sub(1) as f32 / total as f32
        };
        self.status_bar_with(
            hint,
            Some(practice),
            &format!("{current} / {total}"),
            fraction,
        );
    }

    /// Come [`status_bar`](Self::status_bar) con contatore libero; `practice` `None` omette la pillola di fase.
    pub fn status_bar_with(
        &self,
        hint: &Hint,
        practice: Option<bool>,
        counter: &str,
        fraction: f32,
    ) {
        let bar = self.bar();
        self.painter.rect_filled(bar, 0.0, SURFACE);
        let fraction = fraction.clamp(0.0, 1.0);
        let track = Rect::from_min_size(bar.min, Vec2::new(bar.width(), 3.0));
        self.painter.rect_filled(track, 0.0, stimulus::LINE);
        let filled = Rect::from_min_size(bar.min, Vec2::new(bar.width() * fraction, 3.0));
        self.painter.rect_filled(filled, 0.0, stimulus::ACCENT);
        let y = bar.center().y + 1.0;
        hint.draw(&self.painter, Pos2::new(bar.min.x + MARGIN, y), 14.0, TEXT);
        let galley = self.painter.layout_no_wrap(
            counter.to_string(),
            FontId::monospace(14.0),
            stimulus::INK,
        );
        let right = bar.max.x - MARGIN;
        let counter_pos = Pos2::new(right - galley.size().x, y - galley.size().y / 2.0);
        self.painter.galley(counter_pos, galley, stimulus::INK);
        if let Some(practice) = practice {
            pill(
                &self.painter,
                Pos2::new(counter_pos.x - 12.0, y),
                if practice { "PRATICA" } else { "TEST" },
                practice,
            );
        }
    }

    /// «Esc» + «pausa» in alto a sinistra.
    pub fn esc_hint(&self) {
        let y = self.rect.min.y + MARGIN + 11.0;
        let width = draw_key(
            &self.painter,
            Pos2::new(self.rect.min.x + MARGIN, y),
            "Esc",
            13.0,
        );
        self.painter.text(
            Pos2::new(self.rect.min.x + MARGIN + width + 8.0, y),
            Align2::LEFT_CENTER,
            "pausa",
            FontId::proportional(13.0),
            stimulus::MUTED,
        );
    }
}

/// Etichetta di fase ancorata a destra su `right_center` (pillola accentata in pratica, scura nel test).
fn pill(painter: &Painter, right_center: Pos2, label: &str, practice: bool) {
    let (fill, ink) = if practice {
        (ACCENT_TINT, stimulus::ACCENT)
    } else {
        (stimulus::INK, Color32::WHITE)
    };
    let galley = painter.layout_no_wrap(label.into(), FontId::monospace(12.0), ink);
    let size = galley.size() + Vec2::new(18.0, 10.0);
    let rect = Rect::from_min_size(
        Pos2::new(right_center.x - size.x, right_center.y - size.y / 2.0),
        size,
    );
    painter.rect_filled(rect, CornerRadius::same(10), fill);
    painter.galley(rect.min + Vec2::new(9.0, 5.0), galley, ink);
}

/// Disegna un keycap con `left_center` come punto medio del bordo sinistro; restituisce la larghezza.
pub fn draw_key(painter: &Painter, left_center: Pos2, label: &str, font: f32) -> f32 {
    let galley = painter.layout_no_wrap(
        label.into(),
        FontId::new(font * 0.88, FontFamily::Monospace),
        stimulus::INK,
    );
    let height = font * 1.8;
    let width = (galley.size().x + font * 1.1).max(height);
    let rect = Rect::from_min_size(
        Pos2::new(left_center.x, left_center.y - height / 2.0),
        Vec2::new(width, height),
    );
    let radius = CornerRadius::same((font * 0.38) as u8);
    painter.rect(
        rect,
        radius,
        Color32::WHITE,
        Stroke::new(1.0, KEY_EDGE),
        StrokeKind::Inside,
    );
    // Bordo inferiore più spesso: il rilievo del tasto.
    painter.hline(
        (rect.min.x + font * 0.35)..=(rect.max.x - font * 0.35),
        rect.max.y - 1.5,
        Stroke::new(2.0, KEY_EDGE),
    );
    let text_pos = rect.center() - Vec2::new(galley.size().x / 2.0, galley.size().y / 2.0 + 1.0);
    painter.galley(text_pos, galley, stimulus::INK);
    width
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Piece {
    Text(String),
    Key(String),
}

/// Hint dei tasti: testo con i tasti riconosciuti (← → «BARRA SPAZIATRICE», «(R/V/B/G)») resi come keycap.
#[derive(Debug, Clone, Default)]
pub struct Hint(Vec<Piece>);

impl Hint {
    pub fn parse(text: &str) -> Self {
        let text = text.replace("BARRA SPAZIATRICE", "SPAZIO");
        let mut pieces: Vec<Piece> = Vec::new();
        for word in text.split_whitespace() {
            match key_labels(word) {
                Some(keys) => pieces.extend(keys.into_iter().map(Piece::Key)),
                None if word == "FRECCE" => {}
                None => match pieces.last_mut() {
                    Some(Piece::Text(existing)) => {
                        existing.push(' ');
                        existing.push_str(word);
                    }
                    _ => pieces.push(Piece::Text(word.to_string())),
                },
            }
        }
        Self(pieces)
    }

    /// Numero di keycap riconosciuti.
    #[cfg(test)]
    fn key_count(&self) -> usize {
        self.0.iter().filter(|p| matches!(p, Piece::Key(_))).count()
    }

    pub fn width(&self, painter: &Painter, font: f32) -> f32 {
        self.walk(painter, font, None, TEXT)
    }

    pub fn draw(&self, painter: &Painter, left_center: Pos2, font: f32, color: Color32) -> f32 {
        self.walk(painter, font, Some(left_center), color)
    }

    fn walk(&self, painter: &Painter, font: f32, at: Option<Pos2>, color: Color32) -> f32 {
        let gap = font * 0.55;
        let mut x = 0.0;
        for (i, piece) in self.0.iter().enumerate() {
            if i > 0 {
                x += gap;
            }
            x += match (piece, at) {
                (Piece::Key(label), Some(p)) => {
                    draw_key(painter, p + Vec2::new(x, 0.0), label, font)
                }
                (Piece::Key(label), None) => {
                    let g = painter.layout_no_wrap(
                        label.clone(),
                        FontId::new(font * 0.88, FontFamily::Monospace),
                        color,
                    );
                    (g.size().x + font * 1.1).max(font * 1.8)
                }
                (Piece::Text(text), Some(p)) => painter
                    .text(
                        p + Vec2::new(x, 0.0),
                        Align2::LEFT_CENTER,
                        text,
                        FontId::proportional(font),
                        color,
                    )
                    .width(),
                (Piece::Text(text), None) => {
                    painter
                        .layout_no_wrap(text.clone(), FontId::proportional(font), color)
                        .size()
                        .x
                }
            };
        }
        x
    }
}

/// Etichette dei tasti di una parola dell'hint, `None` se è testo.
fn key_labels(word: &str) -> Option<Vec<String>> {
    match word {
        "←" | "→" => return Some(vec![word.to_string()]),
        "SPAZIO" => return Some(vec!["Spazio".to_string()]),
        _ => {}
    }
    let inner = word.strip_prefix('(')?.strip_suffix(')')?;
    let keys: Vec<&str> = inner.split('/').collect();
    keys.iter()
        .all(|k| k.chars().count() == 1 && k.chars().all(char::is_alphabetic))
        .then(|| keys.iter().map(|k| (*k).to_string()).collect())
}

/// Segno di esito: cerchio pieno con spunta o croce bianca.
pub fn outcome_mark(painter: &Painter, center: Pos2, radius: f32, correct: bool) {
    let color = if correct { GREEN } else { stimulus::DANGER };
    painter.circle_filled(center, radius, color);
    let stroke = Stroke::new(radius * 0.17, Color32::WHITE);
    let p = |x: f32, y: f32| center + Vec2::new(x, y) * radius;
    if correct {
        painter.add(Shape::line(
            vec![p(-0.36, 0.02), p(-0.1, 0.28), p(0.38, -0.26)],
            stroke,
        ));
    } else {
        painter.line_segment([p(-0.3, -0.3), p(0.3, 0.3)], stroke);
        painter.line_segment([p(0.3, -0.3), p(-0.3, 0.3)], stroke);
    }
}

/// Feedback «Corretto» / «Errato»: segno + parola grande, centrati in `area`.
pub fn feedback(painter: &Painter, area: Rect, correct: bool) {
    let u = scale(area);
    let color = if correct { GREEN } else { stimulus::DANGER };
    let center = area.center();
    outcome_mark(
        painter,
        center - Vec2::new(0.0, 34.0 * u),
        36.0 * u,
        correct,
    );
    painter.text(
        center + Vec2::new(0.0, 48.0 * u),
        Align2::CENTER_CENTER,
        if correct { "Corretto" } else { "Errato" },
        FontId::new(38.0 * u, theme::display_family()),
        color,
    );
}

/// Croce di fissazione.
pub fn fixation_cross(painter: &Painter, area: Rect) {
    let u = scale(area);
    let arm = 22.0 * u;
    let stroke = Stroke::new((3.0 * u).max(2.5), stimulus::INK);
    let c = area.center();
    painter.line_segment([c - Vec2::new(arm, 0.0), c + Vec2::new(arm, 0.0)], stroke);
    painter.line_segment([c - Vec2::new(0.0, arm), c + Vec2::new(0.0, arm)], stroke);
}

/// Conto alla rovescia: numero grande dentro un anello che si consuma; `remaining` in [0, 1].
pub fn countdown(painter: &Painter, area: Rect, value: u8, remaining: f32, hint: &Hint) {
    let u = scale(area);
    let c = area.center() - Vec2::new(0.0, 14.0 * u);
    let radius = 96.0 * u;
    painter.text(
        c - Vec2::new(0.0, radius + 34.0 * u),
        Align2::CENTER_CENTER,
        "PREPARATI",
        FontId::new(15.0 * u, FontFamily::Monospace),
        stimulus::MUTED,
    );
    painter.circle_stroke(c, radius, Stroke::new(6.0 * u, stimulus::LINE));
    let steps = 72;
    let sweep = TAU * remaining.clamp(0.0, 1.0);
    if sweep > 0.01 {
        let points = (0..=steps)
            .map(|i| {
                let angle = -TAU / 4.0 + sweep * i as f32 / steps as f32;
                c + Vec2::angled(angle) * radius
            })
            .collect();
        painter.add(Shape::line(points, Stroke::new(6.0 * u, stimulus::ACCENT)));
    }
    painter.text(
        c + Vec2::new(0.0, 4.0 * u),
        Align2::CENTER_CENTER,
        value.to_string(),
        FontId::new(150.0 * u, theme::display_family()),
        stimulus::INK,
    );
    let font = 15.0 * u.max(0.9);
    let width = hint.width(painter, font);
    hint.draw(
        painter,
        Pos2::new(c.x - width / 2.0, c.y + radius + 44.0 * u),
        font,
        TEXT,
    );
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ButtonKind {
    Primary,
    Secondary,
    Danger,
}

/// Bottone sulla superficie chiara: hover, cursore a mano, keycap opzionale. `true` se cliccato.
pub fn button(ui: &mut Ui, rect: Rect, label: &str, kind: ButtonKind, key: Option<&str>) -> bool {
    let response = ui.interact(
        rect,
        ui.make_persistent_id(("chrome-button", label)),
        Sense::CLICK,
    );
    let hovered = response.hovered();
    if hovered {
        ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
    }
    let (fill, border, ink) = match (kind, hovered) {
        (ButtonKind::Primary, false) => (stimulus::ACCENT, stimulus::ACCENT, Color32::WHITE),
        (ButtonKind::Primary, true) => (
            Color32::from_rgb(24, 80, 145),
            Color32::from_rgb(24, 80, 145),
            Color32::WHITE,
        ),
        (ButtonKind::Secondary, false) => (Color32::WHITE, KEY_EDGE, stimulus::INK),
        (ButtonKind::Secondary, true) => (SOFT, stimulus::ACCENT, stimulus::INK),
        (ButtonKind::Danger, false) => (Color32::WHITE, KEY_EDGE, stimulus::DANGER),
        (ButtonKind::Danger, true) => (
            Color32::from_rgb(253, 236, 238),
            stimulus::DANGER,
            stimulus::DANGER,
        ),
    };
    let painter = ui.painter();
    painter.rect(
        rect,
        CornerRadius::same(6),
        fill,
        Stroke::new(1.0, border),
        StrokeKind::Inside,
    );
    painter.text(
        rect.center(),
        Align2::CENTER_CENTER,
        label,
        FontId::proportional(15.5),
        ink,
    );
    if let Some(key) = key {
        draw_key(
            painter,
            Pos2::new(rect.max.x - 56.0, rect.center().y),
            key,
            11.0,
        );
    }
    response.clicked()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PauseChoice {
    Resume,
    ExportPartial,
    Abort,
}

const PANEL_SIZE: Vec2 = Vec2::new(480.0, 352.0);

/// Pannello di pausa centrato sopra uno sfondo attenuato.
pub fn pause_panel(ui: &mut Ui, stage: &Stage) -> Option<PauseChoice> {
    stage.painter.rect_filled(
        stage.rect,
        0.0,
        Color32::from_rgba_unmultiplied(238, 241, 245, 255),
    );
    let size = PANEL_SIZE.min(stage.rect.size() - Vec2::splat(24.0));
    let card = Rect::from_center_size(stage.rect.center(), size);
    let shadow = card.translate(Vec2::new(0.0, 6.0)).expand(1.0);
    stage.painter.rect_filled(
        shadow,
        CornerRadius::same(10),
        Color32::from_rgba_unmultiplied(17, 17, 17, 18),
    );
    stage.painter.rect(
        card,
        CornerRadius::same(10),
        Color32::WHITE,
        Stroke::new(1.0, stimulus::LINE),
        StrokeKind::Inside,
    );
    let inner = card.shrink(28.0);
    stage.painter.text(
        Pos2::new(inner.center().x, inner.min.y + 20.0),
        Align2::CENTER_CENTER,
        "IN PAUSA",
        FontId::new(38.0, theme::display_family()),
        stimulus::INK,
    );
    paint_wrapped(
        &stage.painter,
        inner,
        "I dati raccolti finora sono al sicuro. Riprendi dal punto in cui eri oppure esci.",
    );
    let button_height = 44.0;
    let mut choice = None;
    let rows = [
        (
            "Riprendi il test",
            ButtonKind::Primary,
            Some("Esc"),
            PauseChoice::Resume,
        ),
        (
            "Esporta i dati parziali ed esci",
            ButtonKind::Secondary,
            None,
            PauseChoice::ExportPartial,
        ),
        (
            "Esci senza salvare",
            ButtonKind::Danger,
            None,
            PauseChoice::Abort,
        ),
    ];
    for (i, (label, kind, key, action)) in rows.into_iter().enumerate() {
        let top = inner.max.y - (3 - i) as f32 * button_height - (2 - i) as f32 * 10.0;
        let rect = Rect::from_min_size(
            Pos2::new(inner.min.x, top),
            Vec2::new(inner.width(), button_height),
        );
        if button(ui, rect, label, kind, key) {
            choice = Some(action);
        }
    }
    choice
}

fn paint_wrapped(painter: &Painter, inner: Rect, text: &str) {
    let galley = painter.layout(
        text.to_string(),
        FontId::proportional(15.0),
        stimulus::MUTED,
        inner.width(),
    );
    let pos = Pos2::new(
        inner.min.x + (inner.width() - galley.size().x) / 2.0,
        inner.min.y + 50.0,
    );
    painter.galley(pos, galley, stimulus::MUTED);
}

/// Cronometro di pausa: misura quanto si è stati fermi per spostare in avanti gli istanti dei runner a clic.
#[derive(Debug, Default)]
pub struct PauseTimer(Option<std::time::Instant>);

impl PauseTimer {
    pub fn is_paused(&self) -> bool {
        self.0.is_some()
    }

    pub fn pause(&mut self) {
        self.0.get_or_insert_with(std::time::Instant::now);
    }

    /// Esce dalla pausa e restituisce la durata trascorsa.
    pub fn resume(&mut self) -> std::time::Duration {
        self.0
            .take()
            .map_or(std::time::Duration::ZERO, |at| at.elapsed())
    }
}

/// `true` se in questo frame è stato premuto Esc (usato dai runner a clic per aprire/chiudere la pausa).
pub fn escape_pressed(ui: &Ui) -> bool {
    ui.input(|i| i.key_pressed(egui::Key::Escape)) || shot_pause_due()
}

/// Solo per gli screenshot automatici: con `SINTROPIA_SHOT=pause` simula un Esc dopo 1,5 s (una volta sola).
pub fn shot_pause_due() -> bool {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::OnceLock;
    use std::time::{Duration, Instant};
    static STARTED: OnceLock<Instant> = OnceLock::new();
    static FIRED: AtomicBool = AtomicBool::new(false);
    static ENABLED: OnceLock<bool> = OnceLock::new();
    if !*ENABLED.get_or_init(|| std::env::var("SINTROPIA_SHOT").is_ok_and(|v| v == "pause")) {
        return false;
    }
    let started = STARTED.get_or_init(Instant::now);
    started.elapsed() > Duration::from_millis(1500) && !FIRED.swap(true, Ordering::Relaxed)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn keys(hint: &Hint) -> Vec<&str> {
        hint.0
            .iter()
            .filter_map(|p| match p {
                Piece::Key(k) => Some(k.as_str()),
                Piece::Text(_) => None,
            })
            .collect()
    }

    #[test]
    fn should_turn_letters_in_parentheses_into_keycaps() {
        let hint = Hint::parse("Rispondi alla PAROLA (R/V/B/G)");
        assert_eq!(keys(&hint), ["R", "V", "B", "G"]);
        assert_eq!(hint.0[0], Piece::Text("Rispondi alla PAROLA".into()));
    }

    #[test]
    fn should_render_spacebar_and_arrows_as_keycaps() {
        let space = Hint::parse("BARRA SPAZIATRICE sul cerchio verde; non premere sul rosso");
        assert_eq!(keys(&space), ["Spazio"]);
        let arrows = Hint::parse("← figure UGUALI · → figure DIVERSE");
        assert_eq!(keys(&arrows), ["←", "→"]);
        assert_eq!(Hint::parse("FRECCE ← → secondo").key_count(), 2);
    }

    #[test]
    fn should_not_treat_plain_parentheses_as_keys() {
        assert_eq!(Hint::parse("solo ruotate (non speculari)").key_count(), 0);
    }

    #[test]
    fn should_scale_with_the_area_within_sensible_limits() {
        let at = |w, h| scale(Rect::from_min_size(Pos2::ZERO, Vec2::new(w, h)));
        assert_eq!(at(900.0, 520.0), 1.0);
        assert_eq!(at(300.0, 200.0), 0.75);
        assert_eq!(at(5000.0, 3000.0), 2.8);
    }
}
