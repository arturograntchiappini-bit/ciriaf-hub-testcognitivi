//! Wisconsin Card Sorting Test: 4 carte stimolo, carta da smistare, feedback binario e cambio di regola
//! segreto. Porta `src/ui/tests/WcstView.tsx` e `WcstCard.tsx`.
use std::time::{Duration, Instant};

use eframe::egui::{
    self, pos2, vec2, Color32, CornerRadius, Painter, Pos2, Rect, Sense, Shape, Stroke, StrokeKind,
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

const CARD_SIZE: egui::Vec2 = vec2(96.0, 128.0);
const GLYPH_SIZE: f32 = 22.0;
const GLYPH_GAP: f32 = 4.0;
const CORRECT_COLOR: Color32 = theme::stimulus::ACCENT;
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
        let params = match serde_json::to_value(&self.params) {
            Ok(Value::Object(map)) => map,
            _ => Map::new(),
        };
        self.result = Some(TestResult {
            test_id: TestId::Wcst,
            session_id: self.session_id.clone(),
            started_at: self.started_at.clone(),
            params,
            summary: score_wcst(&self.trials, &self.metas, &self.params),
            trials: std::mem::take(&mut self.trials),
        });
    }

    fn feedback_row(&self, ui: &mut egui::Ui) {
        ui.allocate_ui(vec2(ui.available_width(), 28.0), |ui| {
            ui.set_min_height(28.0);
            if let Some(feedback) = &self.feedback {
                let (text, color) = if feedback.correct {
                    ("Corretto", CORRECT_COLOR)
                } else {
                    ("Errato", WRONG_COLOR)
                };
                ui.label(egui::RichText::new(text).size(20.0).strong().color(color));
            }
        });
    }
}

/// Faccia della carta: `number` simboli di `shape` nel colore `color`, in colonna centrata.
fn card_face(ui: &mut egui::Ui, card: &Card, interactive: bool) -> egui::Response {
    let sense = if interactive {
        Sense::click()
    } else {
        Sense::hover()
    };
    let (rect, response) = ui.allocate_exact_size(CARD_SIZE, sense);
    let border = if interactive && response.hovered() {
        theme::stimulus::ACCENT
    } else {
        theme::stimulus::LINE
    };
    ui.painter().rect(
        rect,
        CornerRadius::same(4),
        Color32::WHITE,
        Stroke::new(1.0, border),
        StrokeKind::Inside,
    );
    let count = f32::from(card.number);
    let column = count * GLYPH_SIZE + (count - 1.0) * GLYPH_GAP;
    let top = rect.center().y - column / 2.0;
    for i in 0..card.number {
        let center = pos2(
            rect.center().x,
            top + GLYPH_SIZE / 2.0 + f32::from(i) * (GLYPH_SIZE + GLYPH_GAP),
        );
        draw_glyph(ui.painter(), card.shape, color_rgb(card.color), center);
    }
    if interactive && response.hovered() {
        ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
    }
    response
}

/// Simbolo nel box 24×24 del SVG originale, scalato a `GLYPH_SIZE`.
fn draw_glyph(painter: &Painter, shape: CardShape, fill: Color32, center: Pos2) {
    let scale = GLYPH_SIZE / 24.0;
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
            painter.circle_filled(center, 9.0 * scale, fill);
        }
        CardShape::Triangle => {
            painter.add(polygon(&[(12.0, 3.0), (22.0, 21.0), (2.0, 21.0)]));
        }
        CardShape::Cross => {
            painter.rect_filled(Rect::from_two_pos(at(9.0, 2.0), at(15.0, 22.0)), 0.0, fill);
            painter.rect_filled(Rect::from_two_pos(at(2.0, 9.0), at(22.0, 15.0)), 0.0, fill);
        }
        CardShape::Star => draw_star(painter, fill, &at),
    }
}

/// Stella concava: triangolata a ventaglio dal centro (convessa per ogni spicchio).
fn draw_star(painter: &Painter, fill: Color32, at: &dyn Fn(f32, f32) -> Pos2) {
    const OUTLINE: [(f32, f32); 10] = [
        (12.0, 2.0),
        (15.0, 9.0),
        (22.0, 9.0),
        (16.5, 13.5),
        (18.5, 21.0),
        (12.0, 16.5),
        (5.5, 21.0),
        (7.5, 13.5),
        (2.0, 9.0),
        (9.0, 9.0),
    ];
    let center = at(12.0, 12.0);
    for i in 0..OUTLINE.len() {
        let (a, b) = (OUTLINE[i], OUTLINE[(i + 1) % OUTLINE.len()]);
        painter.add(Shape::convex_polygon(
            vec![center, at(a.0, a.1), at(b.0, b.1)],
            fill,
            Stroke::NONE,
        ));
    }
}

impl TestRunner for WcstRunner {
    fn test_id(&self) -> TestId {
        TestId::Wcst
    }

    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus {
        let now = Instant::now();
        self.tick(now);
        if let Some(result) = self.result.take() {
            return RunnerStatus::Finished(Box::new(result));
        }
        let mut chosen: Option<Card> = None;
        ui.vertical_centered(|ui| {
            ui.label(
                egui::RichText::new(format!(
                    "Clicca la carta di riferimento a cui abbinare quella da smistare — Carta {}/{}",
                    (self.deck_index + 1).min(self.deck.len()),
                    self.deck.len()
                ))
                .color(theme::stimulus::MUTED),
            );
            ui.add_space(12.0);
            if let Some(target) = self.deck.get(self.deck_index) {
                ui.label(theme::eyebrow("Carta da smistare"));
                card_face(ui, target, false);
            }
            self.feedback_row(ui);
            ui.label(
                egui::RichText::new("Abbinala a una di queste — per colore, forma o numero")
                    .color(theme::stimulus::MUTED),
            );
            ui.add_space(6.0);
            ui.horizontal(|ui| {
                ui.add_space(((ui.available_width() - 4.0 * CARD_SIZE.x - 3.0 * 16.0) / 2.0).max(0.0));
                ui.spacing_mut().item_spacing.x = 16.0;
                for card in &WCST_STIMULUS_CARDS {
                    if card_face(ui, card, true).clicked() {
                        chosen = Some(*card);
                    }
                }
            });
        });
        if let Some(card) = chosen {
            self.choose(&card, Instant::now());
        }
        ui.ctx().request_repaint_after(Duration::from_millis(16));
        ui.add_space(12.0);
        if ui.small_button("Interrompi il test").clicked() {
            return RunnerStatus::Aborted;
        }
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
