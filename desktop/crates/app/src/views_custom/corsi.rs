//! Corsi Block Task: 9 blocchi (layout Kessels/PEBL), sequenza illuminata, riproduzione a click,
//! arresto adattivo. Porta `src/ui/tests/CorsiView.tsx`.
use std::collections::VecDeque;
use std::time::{Duration, Instant};

use eframe::egui::{
    self, pos2, vec2, Align2, CornerRadius, FontFamily, FontId, Rect, Sense, Stroke, StrokeKind,
    Vec2,
};
use serde_json::{Map, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::{Phase, TestId, TestResult, TrialResult, ValidationFlag};
use sintropia_engines::corsi::{
    generate_balanced_sequences, score_corsi, should_stop, Params, Sequence, CORSI_BLOCKS,
};

use super::{ms_between, FEEDBACK_MS};
use crate::runner::{RunnerStatus, TestRunner};
use crate::theme::{self, stimulus::INK};
use crate::views::chrome::{self, ButtonKind, Hint, PauseChoice, PauseTimer};

const PRACTICE_LENGTH: usize = 2;
/// Prove di pratica a lunghezza fissa (come in `CorsiView.tsx`).
const PRACTICE_TRIALS: usize = 2;
const LIT_FRACTION: f64 = 0.7;
const TAIL_MS: f64 = 200.0;
/// Lato del blocco e ingombro del layout Kessels (x 8–92, y 18–82 %) in «unità»: il campo scala per intero.
const BLOCK_UNITS: f32 = 14.0;
const KESSELS_X_MIN: f32 = 8.0;
const KESSELS_Y_MAX: f32 = 82.0;
const BBOX_W: f32 = 84.0 + BLOCK_UNITS;
const BBOX_H: f32 = 64.0 + BLOCK_UNITS;
const MAX_UNIT_PX: f32 = 11.0;
/// Spazio riservato in alto all'intestazione (titolo, sottotitolo, puntini).
const HEADER_HEIGHT: f32 = 130.0;
const BLOCK_IDLE: egui::Color32 = egui::Color32::from_rgb(0xF2, 0xF4, 0xF7);
const BLOCK_CLICKED: egui::Color32 = egui::Color32::from_rgb(0xEA, 0xF2, 0xFB);
const BLOCK_SHADOW: egui::Color32 = egui::Color32::from_rgb(0xDD, 0xE1, 0xE8);
const KEY_EDGE: egui::Color32 = egui::Color32::from_rgb(190, 197, 208);

#[derive(Debug, Clone)]
struct PlannedTrial {
    seq: Sequence,
    is_practice: bool,
}

enum Stage {
    Ready,
    Presenting {
        trial: PlannedTrial,
        since: Instant,
    },
    Input {
        trial: PlannedTrial,
        clicked: Vec<usize>,
        since: Instant,
        onset_ms: f64,
    },
    Feedback {
        correct: bool,
        until: Instant,
        was_practice: bool,
    },
    Done,
}

pub struct CorsiRunner {
    params: Params,
    session_id: String,
    started_at: String,
    rand: Box<dyn FnMut() -> f64>,
    t0: Instant,
    stage: Stage,
    trials: Vec<TrialResult>,
    practice_queue: VecDeque<PlannedTrial>,
    level_queue: VecDeque<PlannedTrial>,
    level_results: Vec<bool>,
    level: usize,
    result: Option<TestResult>,
    hint: Hint,
    pause: PauseTimer,
}

/// Blocco illuminato dopo `elapsed_ms` dall'inizio della presentazione (`None` se spento).
pub fn lit_block(indices: &[usize], elapsed_ms: f64, per_block_ms: f64) -> Option<usize> {
    if per_block_ms <= 0.0 || elapsed_ms < 0.0 {
        return None;
    }
    let slot = (elapsed_ms / per_block_ms).floor() as usize;
    let within = elapsed_ms - slot as f64 * per_block_ms;
    indices
        .get(slot)
        .copied()
        .filter(|_| within < per_block_ms * LIT_FRACTION)
}

impl CorsiRunner {
    pub fn new(
        params: Params,
        session_id: &str,
        started_at: &str,
        seed: u32,
        practice: bool,
        _feedback: bool,
    ) -> Self {
        let mut rand: Box<dyn FnMut() -> f64> = Box::new(mulberry32(seed));
        let practice_queue = generate_balanced_sequences(
            PRACTICE_LENGTH,
            PRACTICE_TRIALS,
            &params,
            &mut *rand,
            &CORSI_BLOCKS,
        )
        .into_iter()
        .map(|seq| PlannedTrial {
            seq,
            is_practice: true,
        })
        .collect();
        let now = Instant::now();
        let mut runner = Self {
            level: params.start_length as usize,
            params,
            session_id: session_id.to_string(),
            started_at: started_at.to_string(),
            rand,
            t0: now,
            stage: Stage::Ready,
            trials: Vec::new(),
            practice_queue,
            level_queue: VecDeque::new(),
            level_results: Vec::new(),
            result: None,
            hint: Hint::parse("Clicca i blocchi nell’ordine in cui si sono illuminati"),
            pause: PauseTimer::default(),
        };
        if !practice {
            runner.practice_queue.clear();
            runner.start_test_level(now);
        }
        runner
    }

    fn present(&mut self, trial: PlannedTrial, now: Instant) {
        self.stage = Stage::Presenting { trial, since: now };
    }

    fn next_practice(&mut self, now: Instant) {
        match self.practice_queue.pop_front() {
            Some(trial) => self.present(trial, now),
            None => self.start_test_level(now),
        }
    }

    fn start_test_level(&mut self, now: Instant) {
        if self.level > self.params.max_length as usize {
            self.finish();
            return;
        }
        self.level_results.clear();
        let level = self.level;
        let seqs = generate_balanced_sequences(
            level,
            self.params.trials_per_level as usize,
            &self.params,
            &mut *self.rand,
            &CORSI_BLOCKS,
        );
        self.level_queue = seqs
            .into_iter()
            .map(|seq| PlannedTrial {
                seq,
                is_practice: false,
            })
            .collect();
        self.present_next_test_trial(now);
    }

    fn present_next_test_trial(&mut self, now: Instant) {
        if let Some(trial) = self.level_queue.pop_front() {
            self.present(trial, now);
        } else if should_stop(&self.level_results) {
            self.finish();
        } else {
            self.level += 1;
            self.start_test_level(now);
        }
    }

    fn finish(&mut self) {
        self.stage = Stage::Done;
        self.result = Some(self.build_result());
    }

    /// Vero in pratica (anche nella schermata iniziale); `None` a test concluso.
    fn in_practice(&self) -> Option<bool> {
        match &self.stage {
            Stage::Presenting { trial, .. } | Stage::Input { trial, .. } => Some(trial.is_practice),
            Stage::Feedback { was_practice, .. } => Some(*was_practice),
            Stage::Ready => Some(true),
            Stage::Done => None,
        }
    }

    /// Avanza le transizioni a tempo (fine presentazione, fine feedback).
    fn tick(&mut self, now: Instant) {
        match &self.stage {
            Stage::Presenting { trial, since } => {
                let per = self.params.present_ms_per_block;
                let total = trial.seq.indices.len() as f64 * per + TAIL_MS;
                if ms_between(*since, now) >= total {
                    self.stage = Stage::Input {
                        trial: trial.clone(),
                        clicked: Vec::new(),
                        since: now,
                        onset_ms: ms_between(self.t0, now),
                    };
                }
            }
            Stage::Feedback {
                until,
                was_practice,
                ..
            } if now >= *until => {
                if *was_practice {
                    self.next_practice(now);
                } else {
                    self.present_next_test_trial(now);
                }
            }
            _ => {}
        }
    }

    /// Registra un click su un blocco; valuta quando la lunghezza è raggiunta.
    fn on_block_click(&mut self, block: usize, now: Instant) {
        let Stage::Input {
            trial,
            clicked,
            since,
            onset_ms,
        } = &mut self.stage
        else {
            return;
        };
        clicked.push(block);
        if clicked.len() < trial.seq.indices.len() {
            return;
        }
        let done = (trial.clone(), std::mem::take(clicked), *since, *onset_ms);
        self.complete_input(done.0, &done.1, done.2, done.3, now);
    }

    fn complete_input(
        &mut self,
        trial: PlannedTrial,
        clicked: &[usize],
        since: Instant,
        onset_ms: f64,
        now: Instant,
    ) {
        let correct = clicked == trial.seq.indices.as_slice();
        self.trials.push(TrialResult {
            test_id: TestId::Corsi,
            session_id: self.session_id.clone(),
            trial_index: self.trials.len() as u32,
            phase: if trial.is_practice {
                Phase::Practice
            } else {
                Phase::Test
            },
            condition: format!("len{}", trial.seq.indices.len()),
            stimulus: join_indices(&trial.seq.indices),
            response: Some(join_indices(clicked)),
            correct,
            rt_ms: Some(ms_between(since, now).round()),
            flag: ValidationFlag::Valid,
            onset_timestamp: onset_ms,
        });
        if !trial.is_practice {
            self.level_results.push(correct);
        }
        self.stage = Stage::Feedback {
            correct,
            until: now + Duration::from_millis(FEEDBACK_MS),
            was_practice: trial.is_practice,
        };
    }

    /// Titolo e sottotitolo dell'intestazione per la fase corrente.
    fn header_text(&self) -> (&'static str, &'static str) {
        match &self.stage {
            Stage::Presenting { .. } => (
                "Osserva la sequenza",
                "Memorizza l’ordine in cui i blocchi si illuminano",
            ),
            Stage::Input { .. } => ("Tocca a te", "Clicca i blocchi nello stesso ordine"),
            Stage::Feedback { correct: true, .. } => ("Corretto", ""),
            Stage::Feedback { correct: false, .. } => ("Errato", ""),
            Stage::Ready | Stage::Done => ("", ""),
        }
    }

    fn build_result(&self) -> TestResult {
        let params = match serde_json::to_value(&self.params) {
            Ok(Value::Object(map)) => map,
            _ => Map::new(),
        };
        TestResult {
            test_id: TestId::Corsi,
            session_id: self.session_id.clone(),
            started_at: self.started_at.clone(),
            params,
            summary: score_corsi(&self.trials, f64::from(self.params.start_length)),
            trials: self.trials.clone(),
        }
    }

    /// Sposta in avanti gli istanti pendenti della durata della pausa (il tempo fermo non conta).
    fn shift_clocks(&mut self, paused_for: Duration) {
        self.t0 += paused_for;
        match &mut self.stage {
            Stage::Presenting { since, .. } | Stage::Input { since, .. } => *since += paused_for,
            Stage::Feedback { until, .. } => *until += paused_for,
            Stage::Ready | Stage::Done => {}
        }
    }

    /// Gestisce Esc e il pannello di pausa; `Some` se il frame è già stato consumato dalla pausa.
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

    fn ready_ui(&mut self, ui: &mut egui::Ui, stage: &chrome::Stage, now: Instant) {
        let center = stage.area.center();
        let p = &stage.painter;
        p.text(
            center - vec2(0.0, 120.0),
            Align2::CENTER_CENTER,
            "CORSI BLOCK TASK",
            FontId::new(46.0, theme::display_family()),
            INK,
        );
        let text = "Memorizza l’ordine in cui i blocchi si illuminano, poi riproducilo cliccando.\nIniziamo con una breve pratica.";
        p.text(
            center - vec2(0.0, 40.0),
            Align2::CENTER_CENTER,
            text,
            FontId::proportional(17.0),
            chrome::TEXT,
        );
        let size = vec2(210.0, 46.0);
        let row =
            Rect::from_center_size(center + vec2(0.0, 50.0), vec2(size.x * 2.0 + 14.0, size.y));
        let start = Rect::from_min_size(row.min, size);
        let skip = Rect::from_min_size(row.min + vec2(size.x + 14.0, 0.0), size);
        if chrome::button(ui, start, "Inizia la pratica", ButtonKind::Primary, None) {
            self.next_practice(now);
        }
        if chrome::button(ui, skip, "Salta pratica", ButtonKind::Secondary, None) {
            self.practice_queue.clear();
            self.start_test_level(now);
        }
    }

    /// Campo dei blocchi: rettangolo centrato nell'area sotto l'intestazione.
    fn field_rect(area: Rect) -> Rect {
        let avail = Rect::from_min_max(
            pos2(area.min.x, area.min.y + HEADER_HEIGHT),
            pos2(area.max.x, area.max.y - 12.0),
        );
        let unit = (avail.width() * 0.94 / BBOX_W)
            .min(avail.height() / BBOX_H)
            .clamp(3.0, MAX_UNIT_PX);
        Rect::from_center_size(avail.center(), vec2(BBOX_W * unit, BBOX_H * unit))
    }

    /// Quadrato del blocco `idx` nel disposizione Kessels (coordinate in percentuale, y verso l'alto).
    fn block_rect(field: Rect, idx: usize) -> Rect {
        let unit = field.width() / BBOX_W;
        let block = &CORSI_BLOCKS[idx];
        let center = field.min
            + vec2(
                (block.x as f32 - KESSELS_X_MIN + BLOCK_UNITS / 2.0) * unit,
                (KESSELS_Y_MAX - block.y as f32 + BLOCK_UNITS / 2.0) * unit,
            );
        Rect::from_center_size(center, Vec2::splat(BLOCK_UNITS * unit))
    }

    fn header_ui(&self, stage: &chrome::Stage) {
        let (title, subtitle) = self.header_text();
        let p = &stage.painter;
        let top = stage.area.min.y + 34.0;
        if let Stage::Feedback { correct, .. } = &self.stage {
            let color = if *correct {
                chrome::GREEN
            } else {
                theme::stimulus::DANGER
            };
            chrome::outcome_mark(
                p,
                pos2(stage.area.center().x - 78.0, top + 26.0),
                22.0,
                *correct,
            );
            p.text(
                pos2(stage.area.center().x - 44.0, top + 26.0),
                Align2::LEFT_CENTER,
                title,
                FontId::new(40.0, theme::display_family()),
                color,
            );
            return;
        }
        p.text(
            pos2(stage.area.center().x, top + 18.0),
            Align2::CENTER_CENTER,
            title.to_uppercase(),
            FontId::new(36.0, theme::display_family()),
            INK,
        );
        p.text(
            pos2(stage.area.center().x, top + 50.0),
            Align2::CENTER_CENTER,
            subtitle,
            FontId::proportional(15.0),
            theme::stimulus::MUTED,
        );
        if let Stage::Input { trial, clicked, .. } = &self.stage {
            let n = trial.seq.indices.len();
            let step = 20.0;
            let x0 = stage.area.center().x - step * (n as f32 - 1.0) / 2.0;
            for i in 0..n {
                let c = pos2(x0 + step * i as f32, top + 78.0);
                if i < clicked.len() {
                    p.circle_filled(c, 5.5, theme::stimulus::ACCENT);
                } else {
                    p.circle_stroke(c, 5.0, Stroke::new(1.5, KEY_EDGE));
                }
            }
        }
    }

    /// Disegna i 9 blocchi e ritorna quello cliccato (solo in fase di input).
    fn blocks_ui(&self, ui: &mut egui::Ui, stage: &chrome::Stage, now: Instant) -> Option<usize> {
        let field = Self::field_rect(stage.area);
        let lit = match &self.stage {
            Stage::Presenting { trial, since } => lit_block(
                &trial.seq.indices,
                ms_between(*since, now),
                self.params.present_ms_per_block,
            ),
            _ => None,
        };
        let (clicked_so_far, accepting) = match &self.stage {
            Stage::Input { clicked, .. } => (clicked.as_slice(), true),
            _ => (&[][..], false),
        };
        let mut hit = None;
        for idx in 0..CORSI_BLOCKS.len() {
            let rect = Self::block_rect(field, idx);
            let response = ui.interact(
                rect,
                ui.make_persistent_id(("corsi-block", idx)),
                if accepting {
                    Sense::CLICK
                } else {
                    Sense::hover()
                },
            );
            let hovered = accepting && response.hovered();
            let order = clicked_so_far.iter().position(|&c| c == idx);
            paint_block(&stage.painter, rect, lit == Some(idx), hovered, order);
            if hovered {
                ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
            }
            if accepting && response.clicked() {
                hit = Some(idx);
            }
        }
        hit
    }

    fn counter(&self) -> (String, f32) {
        let levels = (self.params.max_length - self.params.start_length + 1).max(1) as f32;
        let done = self.level.saturating_sub(self.params.start_length as usize) as f32;
        let length = match &self.stage {
            Stage::Presenting { trial, .. } | Stage::Input { trial, .. } => trial.seq.indices.len(),
            _ => self.level,
        };
        let label = if self.in_practice() == Some(true) {
            let total = PRACTICE_TRIALS;
            format!(
                "{} / {total}",
                total.saturating_sub(self.practice_queue.len()).max(1)
            )
        } else {
            let total = self.params.trials_per_level as usize;
            let current = (total - self.level_queue.len().min(total)).max(1);
            format!("{current} / {total} · lunghezza {length}")
        };
        (label, done / levels)
    }
}

fn paint_block(
    painter: &egui::Painter,
    rect: Rect,
    lit: bool,
    hovered: bool,
    order: Option<usize>,
) {
    let radius = CornerRadius::same((rect.width() * 0.12) as u8);
    painter.rect_filled(rect.translate(vec2(0.0, 3.0)), radius, BLOCK_SHADOW);
    if lit {
        for (grow, alpha) in [(14.0, 28.0), (7.0, 60.0)] {
            let glow = theme::stimulus::ACCENT.gamma_multiply(alpha / 255.0);
            painter.rect_filled(
                rect.expand(grow),
                CornerRadius::same(((rect.width() + grow) * 0.14) as u8),
                glow,
            );
        }
    }
    let (fill, border, width) = if lit {
        (theme::stimulus::ACCENT, theme::stimulus::ACCENT, 2.0)
    } else if order.is_some() {
        (BLOCK_CLICKED, theme::stimulus::ACCENT, 2.0)
    } else if hovered {
        (BLOCK_CLICKED, theme::stimulus::ACCENT, 3.0)
    } else {
        (BLOCK_IDLE, KEY_EDGE, 1.5)
    };
    painter.rect(
        rect,
        radius,
        fill,
        Stroke::new(width, border),
        StrokeKind::Inside,
    );
    if let Some(order) = order {
        painter.text(
            rect.center(),
            Align2::CENTER_CENTER,
            (order + 1).to_string(),
            FontId::new(rect.width() * 0.34, FontFamily::Monospace),
            theme::stimulus::ACCENT,
        );
    }
}

fn join_indices(indices: &[usize]) -> String {
    indices
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join("-")
}

impl TestRunner for CorsiRunner {
    fn test_id(&self) -> TestId {
        TestId::Corsi
    }

    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus {
        let stage = chrome::Stage::begin(ui);
        if let Some(status) = self.pause_step(ui, &stage) {
            return status;
        }
        let now = Instant::now();
        self.tick(now);
        if let Some(result) = self.result.take() {
            return RunnerStatus::Finished(Box::new(result));
        }
        stage.esc_hint();
        let practice = self.in_practice();
        let (counter, fraction) = self.counter();
        stage.status_bar_with(&self.hint, practice, &counter, fraction);
        if matches!(self.stage, Stage::Ready) {
            self.ready_ui(ui, &stage, now);
        } else {
            self.header_ui(&stage);
            if let Some(block) = self.blocks_ui(ui, &stage, now) {
                self.on_block_click(block, Instant::now());
            }
            ui.ctx().request_repaint_after(Duration::from_millis(16));
        }
        RunnerStatus::Running
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::MetricValue;

    fn params() -> Params {
        sintropia_engines::defaults::all_params().corsi
    }

    fn runner(practice: bool) -> CorsiRunner {
        CorsiRunner::new(
            params(),
            "S-TEST",
            "2026-01-01T00:00:00.000Z",
            7,
            practice,
            false,
        )
    }

    /// Porta avanti il tempo oltre presentazione e feedback.
    fn step(r: &mut CorsiRunner, now: &mut Instant) {
        *now += Duration::from_secs(30);
        r.tick(*now);
    }

    /// Esegue il test rispondendo con `answer(indice_trial_corrente, sequenza)`.
    fn play(r: &mut CorsiRunner, answer: impl Fn(&[usize]) -> Vec<usize>) -> TestResult {
        let mut now = Instant::now();
        for _ in 0..500 {
            if let Some(result) = r.result.take() {
                return result;
            }
            match &r.stage {
                Stage::Ready => r.next_practice(now),
                Stage::Input { trial, .. } => {
                    for block in answer(&trial.seq.indices) {
                        r.on_block_click(block, now);
                    }
                }
                _ => step(r, &mut now),
            }
        }
        panic!("il test non termina");
    }

    #[test]
    fn should_light_blocks_one_at_a_time_for_seventy_percent_of_the_slot() {
        let seq = [4, 2, 7];
        assert_eq!(lit_block(&seq, 0.0, 1000.0), Some(4));
        assert_eq!(lit_block(&seq, 699.0, 1000.0), Some(4));
        assert_eq!(lit_block(&seq, 700.0, 1000.0), None);
        assert_eq!(lit_block(&seq, 1000.0, 1000.0), Some(2));
        assert_eq!(lit_block(&seq, 2500.0, 1000.0), Some(7));
        assert_eq!(lit_block(&seq, 3100.0, 1000.0), None);
    }

    #[test]
    fn should_reach_maximum_span_when_every_sequence_is_reproduced() {
        let result = play(&mut runner(true), |seq| seq.to_vec());
        let practice = result
            .trials
            .iter()
            .filter(|t| t.phase == Phase::Practice)
            .count();
        assert_eq!(practice, 2);
        assert_eq!(result.trials.len(), 2 + 7 * 2);
        assert_eq!(result.summary[0].value, MetricValue::Num(9.0));
        assert!(result.trials.iter().all(|t| t.correct));
    }

    #[test]
    fn should_stop_after_a_level_with_both_trials_wrong() {
        let result = play(&mut runner(false), |seq| vec![0; seq.len()]);
        assert_eq!(result.trials.len(), 2);
        assert!(result
            .trials
            .iter()
            .all(|t| !t.correct && t.phase == Phase::Test));
        assert_eq!(result.summary[0].value, MetricValue::Num(0.0));
    }

    #[test]
    fn should_skip_practice_when_not_requested_and_record_sequences_as_dashed_indices() {
        let r = runner(false);
        assert!(matches!(r.stage, Stage::Presenting { .. }));
        let result = play(&mut runner(false), |seq| seq.to_vec());
        let first = &result.trials[0];
        assert_eq!(first.condition, "len3");
        assert_eq!(first.stimulus.split('-').count(), 3);
        assert_eq!(first.response.as_deref(), Some(first.stimulus.as_str()));
    }

    #[test]
    fn should_reproduce_the_typescript_sequences_for_the_same_seed() {
        let mut rand = mulberry32(7);
        let p = Params {
            start_length: 3,
            max_length: 9,
            trials_per_level: 2,
            present_ms_per_block: 1000.0,
            complexity_tolerance: 8.0,
        };
        let seqs = generate_balanced_sequences(6, 2, &p, &mut rand, &CORSI_BLOCKS);
        assert_eq!(seqs[0].indices, [2, 7, 6, 4, 1, 3]);
    }
}
