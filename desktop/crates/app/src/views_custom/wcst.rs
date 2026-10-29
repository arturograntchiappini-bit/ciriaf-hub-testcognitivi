//! Wisconsin Card Sorting Test: 4 carte stimolo, carta da smistare, feedback binario e cambio di regola
//! segreto. Porta `src/ui/tests/WcstView.tsx` e `WcstCard.tsx`.
use std::time::{Duration, Instant};

use eframe::egui::{
    self, epaint::Mesh, pos2, vec2, Align2, Color32, CornerRadius, FontId, Painter, Pos2, Rect,
    Sense, Shape, Stroke, StrokeKind,
};
use serde_json::{Map, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::{Phase, TestId, TestResult, TrialResult, ValidationFlag};
use sintropia_engines::wcst::{
    build_deck, matching_dims, rule_for_category, score_wcst, Card, Color, Dim, Params,
    Shape as CardShape, TrialMeta, WCST_STIMULUS_CARDS,
};

use super::{ms_between, FEEDBACK_MS};
use crate::runner::{RunnerStatus, TestRunner};
use crate::theme;
use crate::views::chrome::{self, Hint, PauseChoice, PauseTimer};

/// Proporzioni delle carte (larghezza / altezza), distanza fra i riferimenti e altezza massima.
const CARD_ASPECT: f32 = 0.76;
const CARD_GAP: f32 = 22.0;
const MAX_CARD_HEIGHT: f32 = 270.0;
/// Spazio in alto per titolo e istruzione.
const HEADER_HEIGHT: f32 = 120.0;
const CARD_BORDER: Color32 = Color32::from_rgb(190, 197, 208);
const WRONG_COLOR: Color32 = Color32::from_rgb(208, 2, 27);

pub struct WcstRunner {
    params: Params,
    session_id: String,
    started_at: String,
    deck: Vec<Card>,
    deck_index: usize,
    t0: Instant,
    onset: Instant,
    feedback: Option<Feedback>,
    trials: Vec<TrialResult>,
    metas: Vec<TrialMeta>,
    categories: usize,
    consecutive: usize,
    result: Option<TestResult>,
    /// Indice del riferimento scelto, per evidenziarne l'esito durante il feedback.
    last_chosen: Option<usize>,
    hint: Hint,
    pause: PauseTimer,
}

struct Feedback {
    correct: bool,
    until: Instant,
    done: bool,
}

fn color_rgb(color: Color) -> Color32 {
    match color {
        Color::Red => Color32::from_rgb(0xD0, 0x02, 0x1B),
        Color::Green => Color32::from_rgb(0x2E, 0x7D, 0x32),
        Color::Yellow => Color32::from_rgb(0xF5, 0xA6, 0x23),
        Color::Blue => Color32::from_rgb(0x15, 0x65, 0xC0),
    }
}

fn dim_name(dim: Dim) -> &'static str {
    match dim {
        Dim::Color => "color",
        Dim::Shape => "shape",
        Dim::Number => "number",
    }
}

/// Codice carta come in TS: numero + iniziale della forma + iniziale del colore (es. `3cr`).
pub fn card_code(card: &Card) -> String {
    let shape = match card.shape {
        CardShape::Triangle => 't',
        CardShape::Star => 's',
        CardShape::Cross | CardShape::Circle => 'c',
    };
    let color = match card.color {
        Color::Red => 'r',
        Color::Green => 'g',
        Color::Yellow => 'y',
        Color::Blue => 'b',
    };
    format!("{}{shape}{color}", card.number)
}

impl WcstRunner {
    pub fn new(
        params: Params,
        session_id: &str,
        started_at: &str,
        seed: u32,
        _practice: bool,
        _feedback: bool,
    ) -> Self {
        let now = Instant::now();
        Self {
            deck: build_deck(params.deck_size, &mut mulberry32(seed)),
            params,
            session_id: session_id.to_string(),
            started_at: started_at.to_string(),
            deck_index: 0,
            t0: now,
            onset: now,
            feedback: None,
            trials: Vec::new(),
            metas: Vec::new(),
            categories: 0,
            consecutive: 0,
            result: None,
            last_chosen: None,
            hint: Hint::parse("Abbina per colore, forma o numero: scopri la regola dal feedback"),
            pause: PauseTimer::default(),
        }
    }

    /// Registra la scelta di una carta di riferimento; ignorata durante il feedback.
    fn choose(&mut self, key_card: &Card, now: Instant) {
        if self.feedback.is_some() {
            return;
        }
        let Some(target) = self.deck.get(self.deck_index).copied() else {
            return;
        };
        let current_rule = rule_for_category(self.categories);
        let matched = matching_dims(&target, key_card);
        let correct = matched.contains(&current_rule);
        self.trials.push(TrialResult {
            test_id: TestId::Wcst,
            session_id: self.session_id.clone(),
            trial_index: self.trials.len() as u32,
            phase: Phase::Test,
            condition: dim_name(current_rule).to_string(),
            stimulus: card_code(&target),
            response: Some(card_code(key_card)),
            correct,
            rt_ms: Some(ms_between(self.onset, now).round()),
            flag: ValidationFlag::Valid,
            onset_timestamp: ms_between(self.t0, self.onset),
        });
        self.metas.push(TrialMeta {
            current_rule,
            matched_dims: matched,
        });
        self.update_streak(correct);
        let done =
            self.categories >= self.params.max_categories || self.deck_index + 1 >= self.deck.len();
        self.feedback = Some(Feedback {
            correct,
            until: now + Duration::from_millis(FEEDBACK_MS),
            done,
        });
    }

    fn update_streak(&mut self, correct: bool) {
        if !correct {
            self.consecutive = 0;
            return;
        }
        self.consecutive += 1;
        if self.consecutive >= self.params.run_to_shift {
            self.categories += 1;
            self.consecutive = 0;
        }
    }

    /// Chiude il feedback scaduto: passa alla carta successiva o conclude.
    fn tick(&mut self, now: Instant) {
        let Some(feedback) = self.feedback.as_ref().filter(|f| now >= f.until) else {
            return;
        };
        let done = feedback.done;
        self.feedback = None;
        if done {
            self.finish();
        } else {
            self.deck_index += 1;
            self.onset = now;
        }
    }

    fn finish(&mut self) {
        self.result = Some(self.build_result());
    }

    fn build_result(&self) -> TestResult {
        let params = match serde_json::to_value(&self.params) {
            Ok(Value::Object(map)) => map,
            _ => Map::new(),
        };
        TestResult {
            test_id: TestId::Wcst,
            session_id: self.session_id.clone(),
            started_at: self.started_at.clone(),
            params,
            summary: score_wcst(&self.trials, &self.metas, &self.params),
            trials: self.trials.clone(),
        }
    }

    /// Sposta in avanti gli istanti pendenti della durata della pausa (il tempo fermo non conta).
    fn shift_clocks(&mut self, paused_for: Duration) {
        self.t0 += paused_for;
        self.onset += paused_for;
        if let Some(feedback) = &mut self.feedback {
            feedback.until += paused_for;
        }
    }

    fn pause_step(&mut self, ui: &mut egui::Ui, stage: &chrome::Stage) -> Option<RunnerStatus> {
        if chrome::escape_pressed(ui) {
            if self.pause.is_paused() {
                let paused_for = self.pause.resume();
                self.shift_clocks(paused_for);
            } else {
                self.pause.pause();
            }
        }
        if !self.pause.is_paused() {
            return None;
        }
        Some(match chrome::pause_panel(ui, stage) {
            Some(PauseChoice::Resume) => {
                let paused_for = self.pause.resume();
                self.shift_clocks(paused_for);
                RunnerStatus::Running
            }
            Some(PauseChoice::ExportPartial) => {
                RunnerStatus::Finished(Box::new(self.build_result()))
            }
            Some(PauseChoice::Abort) => RunnerStatus::Aborted,
            None => RunnerStatus::Running,
        })
    }

    fn header_ui(&self, stage: &chrome::Stage) {
        let p = &stage.painter;
        let x = stage.area.center().x;
        let top = stage.area.min.y + 40.0;
        match &self.feedback {
            Some(feedback) => {
                let color = if feedback.correct {
                    chrome::GREEN
                } else {
                    WRONG_COLOR
                };
                let word = if feedback.correct {
                    "Corretto"
                } else {
                    "Errato"
                };
                chrome::outcome_mark(p, pos2(x - 70.0, top + 14.0), 20.0, feedback.correct);
                p.text(
                    pos2(x - 40.0, top + 14.0),
                    Align2::LEFT_CENTER,
                    word,
                    FontId::new(38.0, theme::display_family()),
                    color,
                );
            }
            None => {
                p.text(
                    pos2(x, top + 8.0),
                    Align2::CENTER_CENTER,
                    "ABBINA LA CARTA",
                    FontId::new(34.0, theme::display_family()),
                    theme::stimulus::INK,
                );
                p.text(
                    pos2(x, top + 40.0),
                    Align2::CENTER_CENTER,
                    "Clicca la carta di riferimento a cui abbinare quella da smistare",
                    FontId::proportional(15.0),
                    theme::stimulus::MUTED,
                );
            }
        }
    }

    /// Dimensioni delle carte: stessa altezza per la riga dei riferimenti e per la carta da smistare.
    fn card_size(area: Rect) -> egui::Vec2 {
        let by_height =
            ((area.height() - HEADER_HEIGHT - 70.0) / 2.0).clamp(110.0, MAX_CARD_HEIGHT);
        let by_width = (area.width() * 0.9 - 3.0 * CARD_GAP) / 4.0 / CARD_ASPECT;
        let height = by_height.min(by_width);
        vec2(height * CARD_ASPECT, height)
    }

    fn cards_ui(&mut self, ui: &mut egui::Ui, stage: &chrome::Stage) -> Option<usize> {
        let size = Self::card_size(stage.area);
        let row_top = stage.area.min.y + HEADER_HEIGHT;
        let row_width = 4.0 * size.x + 3.0 * CARD_GAP;
        let left = stage.area.center().x - row_width / 2.0;
        let mut chosen = None;
        for (i, card) in WCST_STIMULUS_CARDS.iter().enumerate() {
            let rect =
                Rect::from_min_size(pos2(left + i as f32 * (size.x + CARD_GAP), row_top), size);
            let outcome = match (&self.feedback, self.last_chosen) {
                (Some(f), Some(c)) if c == i => Some(f.correct),
                _ => None,
            };
            let response = ui.interact(
                rect,
                ui.make_persistent_id(("wcst-ref", i)),
                if self.feedback.is_none() {
                    Sense::CLICK
                } else {
                    Sense::hover()
                },
            );
            let hovered = self.feedback.is_none() && response.hovered();
            paint_card(&stage.painter, rect, card, CardLook { hovered, outcome });
            if hovered {
                ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
            }
            if response.clicked() {
                chosen = Some(i);
            }
        }
        let sort_top = row_top + size.y + 46.0;
        stage.painter.text(
            pos2(stage.area.center().x, row_top + size.y + 22.0),
            Align2::CENTER_CENTER,
            "CARTA DA SMISTARE",
            FontId::monospace(12.5),
            theme::stimulus::MUTED,
        );
        if let Some(target) = self.deck.get(self.deck_index) {
            let rect =
                Rect::from_min_size(pos2(stage.area.center().x - size.x / 2.0, sort_top), size);
            paint_card(
                &stage.painter,
                rect,
                target,
                CardLook {
                    hovered: false,
                    outcome: None,
                },
            );
        }
        chosen
    }
}

/// Aspetto di una carta: evidenziazione al passaggio e, dopo la scelta, esito sul bordo.
#[derive(Clone, Copy)]
struct CardLook {
    hovered: bool,
    outcome: Option<bool>,
}

/// Faccia della carta: i simboli sono disposti in colonna (1–3) o in griglia 2×2 (4).
fn paint_card(painter: &Painter, rect: Rect, card: &Card, look: CardLook) {
    let radius = CornerRadius::same((rect.width() * 0.07) as u8);
    painter.rect_filled(
        rect.translate(vec2(0.0, 4.0)),
        radius,
        Color32::from_rgb(0xDD, 0xE1, 0xE8),
    );
    let (border, width) = match (look.outcome, look.hovered) {
        (Some(true), _) => (chrome::GREEN, 4.0),
        (Some(false), _) => (WRONG_COLOR, 4.0),
        (None, true) => (theme::stimulus::ACCENT, 3.5),
        (None, false) => (CARD_BORDER, 1.5),
    };
    let fill = if look.hovered {
        Color32::from_rgb(0xF4, 0xF8, 0xFD)
    } else {
        Color32::WHITE
    };
    painter.rect(
        rect,
        radius,
        fill,
        Stroke::new(width, border),
        StrokeKind::Inside,
    );
    let glyph = (rect.width() * 0.36).min(rect.height() * 0.22);
    let gap = glyph * 0.2;
    let color = color_rgb(card.color);
    for center in glyph_centers(rect.center(), card.number, glyph, gap) {
        draw_glyph(painter, card.shape, color, center, glyph);
    }
}

/// Centri dei `count` simboli: colonna centrata, oppure griglia 2×2 per quattro.
fn glyph_centers(middle: Pos2, count: u8, glyph: f32, gap: f32) -> Vec<Pos2> {
    let step = glyph + gap;
    if count == 4 {
        let half = step / 2.0;
        return [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)]
            .iter()
            .map(|&(dx, dy)| middle + vec2(dx * half, dy * half))
            .collect();
    }
    let top = -step * (f32::from(count) - 1.0) / 2.0;
    (0..count)
        .map(|i| middle + vec2(0.0, top + f32::from(i) * step))
        .collect()
}

/// Simbolo nel box 24×24 del SVG originale, scalato a `size`.
fn draw_glyph(painter: &Painter, shape: CardShape, fill: Color32, center: Pos2, size: f32) {
    let scale = size / 24.0;
    let at = |x: f32, y: f32| pos2(center.x + (x - 12.0) * scale, center.y + (y - 12.0) * scale);
    let polygon = |points: &[(f32, f32)]| {
        Shape::convex_polygon(
            points.iter().map(|&(x, y)| at(x, y)).collect(),
            fill,
            Stroke::NONE,
        )
    };
    match shape {
        CardShape::Circle => {
            painter.circle_filled(center, 10.0 * scale, fill);
        }
        CardShape::Triangle => {
            painter.add(polygon(&[(12.0, 2.5), (23.0, 21.5), (1.0, 21.5)]));
        }
        CardShape::Cross => {
            painter.rect_filled(Rect::from_two_pos(at(8.5, 1.5), at(15.5, 22.5)), 0.0, fill);
            painter.rect_filled(Rect::from_two_pos(at(1.5, 8.5), at(22.5, 15.5)), 0.0, fill);
        }
        CardShape::Star => draw_star(painter, fill, &at),
    }
}

/// Stella concava: triangolata a ventaglio dal centro (convessa per ogni spicchio).
fn draw_star(painter: &Painter, fill: Color32, at: &dyn Fn(f32, f32) -> Pos2) {
    const OUTLINE: [(f32, f32); 10] = [
        (12.0, 1.5),
        (15.2, 8.6),
        (23.0, 9.4),
        (17.2, 14.6),
        (18.9, 22.3),
        (12.0, 18.3),
        (5.1, 22.3),
        (6.8, 14.6),
        (1.0, 9.4),
        (8.8, 8.6),
    ];
    // Mesh a ventaglio (nessuna cucitura fra i triangoli) + contorno chiuso per l'antialiasing dei bordi.
    let center = at(12.0, 12.5);
    let ring: Vec<Pos2> = OUTLINE.iter().map(|&(x, y)| at(x, y)).collect();
    let mut mesh = Mesh::default();
    mesh.colored_vertex(center, fill);
    for &point in &ring {
        mesh.colored_vertex(point, fill);
    }
    let n = ring.len() as u32;
    for i in 0..n {
        mesh.add_triangle(0, 1 + i, 1 + (i + 1) % n);
    }
    painter.add(Shape::mesh(mesh));
    painter.add(Shape::closed_line(ring, Stroke::new(1.0, fill)));
}

impl TestRunner for WcstRunner {
    fn test_id(&self) -> TestId {
        TestId::Wcst
    }

    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus {
        let stage = chrome::Stage::begin(ui);
        if let Some(status) = self.pause_step(ui, &stage) {
            return status;
        }
        self.tick(Instant::now());
        if let Some(result) = self.result.take() {
            return RunnerStatus::Finished(Box::new(result));
        }
        stage.esc_hint();
        let total = self.deck.len();
        let current = (self.deck_index + 1).min(total);
        stage.status_bar_with(
            &self.hint,
            Some(false),
            &format!("{current} / {total}"),
            self.deck_index as f32 / total.max(1) as f32,
        );
        self.header_ui(&stage);
        if let Some(i) = self.cards_ui(ui, &stage) {
            self.last_chosen = Some(i);
            self.choose(&WCST_STIMULUS_CARDS[i], Instant::now());
        }
        ui.ctx().request_repaint_after(Duration::from_millis(16));
        RunnerStatus::Running
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::MetricValue;

    fn runner(params: Params) -> WcstRunner {
        WcstRunner::new(
            params,
            "S-TEST",
            "2026-01-01T00:00:00.000Z",
            3,
            false,
            false,
        )
    }

    fn params(deck_size: usize, run_to_shift: usize, max_categories: usize) -> Params {
        Params {
            deck_size,
            run_to_shift,
            max_categories,
        }
    }

    /// Gioca fino alla fine; `pick` sceglie la carta di riferimento dato bersaglio e regola attiva.
    fn play(r: &mut WcstRunner, pick: impl Fn(&Card, Dim) -> Card) -> TestResult {
        let mut now = Instant::now();
        for _ in 0..1000 {
            if let Some(result) = r.result.take() {
                return result;
            }
            if r.feedback.is_none() {
                let target = r.deck[r.deck_index];
                let key = pick(&target, rule_for_category(r.categories));
                r.choose(&key, now);
            }
            now += Duration::from_secs(5);
            r.tick(now);
        }
        panic!("il test non termina");
    }

    fn matching_card(target: &Card, rule: Dim) -> Card {
        *WCST_STIMULUS_CARDS
            .iter()
            .find(|c| matching_dims(target, c).contains(&rule))
            .expect("ogni dimensione ha una carta stimolo corrispondente")
    }

    #[test]
    fn should_complete_all_categories_when_the_active_rule_is_always_followed() {
        let mut r = runner(params(64, 10, 6));
        let result = play(&mut r, matching_card);
        assert_eq!(result.trials.len(), 60);
        assert!(result.trials.iter().all(|t| t.correct));
        assert_eq!(result.trials[0].condition, "color");
        assert_eq!(result.trials[10].condition, "shape");
        assert_eq!(result.trials[20].condition, "number");
        assert!(matches!(result.summary[0].value, MetricValue::Num(_)));
    }

    #[test]
    fn should_end_when_the_deck_runs_out_without_completing_categories() {
        let mut r = runner(params(12, 10, 6));
        let result = play(&mut r, |_, _| WCST_STIMULUS_CARDS[0]);
        assert_eq!(result.trials.len(), 12);
    }

    #[test]
    fn should_ignore_choices_while_feedback_is_showing() {
        let mut r = runner(params(10, 3, 1));
        let now = Instant::now();
        r.choose(&WCST_STIMULUS_CARDS[0], now);
        r.choose(&WCST_STIMULUS_CARDS[1], now);
        assert_eq!(r.trials.len(), 1);
        assert_eq!(r.metas.len(), 1);
    }

    #[test]
    fn should_encode_cards_like_the_typescript_view() {
        let card = Card {
            color: Color::Red,
            shape: CardShape::Triangle,
            number: 3,
        };
        assert_eq!(card_code(&card), "3tr");
        assert_eq!(card_code(&WCST_STIMULUS_CARDS[3]), "4cb");
        assert_eq!(card_code(&WCST_STIMULUS_CARDS[2]), "3cy");
    }
}
