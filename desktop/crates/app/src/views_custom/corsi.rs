//! Corsi Block Task: 9 blocchi (layout Kessels/PEBL), sequenza illuminata, riproduzione a click,
//! arresto adattivo. Porta `src/ui/tests/CorsiView.tsx`.
use std::collections::VecDeque;
use std::time::{Duration, Instant};

use eframe::egui::{self, vec2, CornerRadius, Rect, Sense, Stroke, StrokeKind};
use serde_json::{Map, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::{Phase, TestId, TestResult, TrialResult, ValidationFlag};
use sintropia_engines::corsi::{
    generate_balanced_sequences, score_corsi, should_stop, Params, Sequence, CORSI_BLOCKS,
};

use super::{ms_between, FEEDBACK_MS};
use crate::runner::{RunnerStatus, TestRunner};
use crate::theme;

const PRACTICE_LENGTH: usize = 2;
const LIT_FRACTION: f64 = 0.7;
const TAIL_MS: f64 = 200.0;
const AREA_SIZE: f32 = 420.0;
const BLOCK_SIZE: f32 = 56.0;
const BLOCK_IDLE: egui::Color32 = egui::Color32::from_rgb(0xF2, 0xF4, 0xF7);
const BLOCK_CLICKED: egui::Color32 = egui::Color32::from_rgb(0xEA, 0xF2, 0xFB);

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
        let practice_queue =
            generate_balanced_sequences(PRACTICE_LENGTH, 2, &params, &mut *rand, &CORSI_BLOCKS)
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
        let params = serde_json::to_value(&self.params)
            .ok()
            .and_then(|v| match v {
                Value::Object(map) => Some(map),
                _ => None,
            })
            .unwrap_or_else(Map::new);
        self.result = Some(TestResult {
            test_id: TestId::Corsi,
            session_id: self.session_id.clone(),
            started_at: self.started_at.clone(),
            params,
            summary: score_corsi(&self.trials, f64::from(self.params.start_length)),
            trials: std::mem::take(&mut self.trials),
        });
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

    fn status_text(&self) -> String {
        match &self.stage {
            Stage::Presenting { .. } => "Osserva la sequenza…".to_string(),
            Stage::Input { trial, clicked, .. } => format!(
                "Riproduci la sequenza — {}/{}",
                clicked.len(),
                trial.seq.indices.len()
            ),
            Stage::Feedback { correct: true, .. } => "Corretto".to_string(),
            Stage::Feedback { correct: false, .. } => "Errato".to_string(),
            Stage::Ready | Stage::Done => String::new(),
        }
    }

    fn ready_ui(&mut self, ui: &mut egui::Ui, now: Instant) {
        ui.vertical_centered(|ui| {
            ui.add_space(60.0);
            ui.label(
                egui::RichText::new(
                    "Memorizza l’ordine in cui i blocchi si illuminano, poi riproducilo cliccando.\nIniziamo con una breve pratica.",
                )
                .size(16.0)
                .color(theme::stimulus::MUTED),
            );
            ui.add_space(20.0);
            ui.horizontal(|ui| {
                ui.add_space((ui.available_width() / 2.0 - 140.0).max(0.0));
                if ui.button("Inizia la pratica").clicked() {
                    self.next_practice(now);
                }
                if ui.button("Salta pratica →").clicked() {
                    self.practice_queue.clear();
                    self.start_test_level(now);
                }
            });
        });
    }

    /// Disegna i 9 blocchi e ritorna quello cliccato (solo in fase di input).
    fn blocks_ui(&self, ui: &mut egui::Ui, now: Instant) -> Option<usize> {
        let (area, _) = ui.allocate_exact_size(vec2(AREA_SIZE, AREA_SIZE), Sense::hover());
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
        for (idx, block) in CORSI_BLOCKS.iter().enumerate() {
            let center = area.min
                + vec2(
                    (block.x / 100.0) as f32 * AREA_SIZE,
                    ((100.0 - block.y) / 100.0) as f32 * AREA_SIZE,
                );
            let rect = Rect::from_center_size(center, vec2(BLOCK_SIZE, BLOCK_SIZE));
            let sense = if accepting {
                Sense::click()
            } else {
                Sense::hover()
            };
            let response = ui.interact(rect, ui.make_persistent_id(("corsi-block", idx)), sense);
            let is_lit = lit == Some(idx);
            let (fill, border) = if is_lit {
                (theme::ACCENT, theme::ACCENT)
            } else if clicked_so_far.contains(&idx) {
                (BLOCK_CLICKED, theme::stimulus::LINE)
            } else {
                (BLOCK_IDLE, theme::stimulus::LINE)
            };
            ui.painter().rect(
                rect,
                CornerRadius::same(6),
                fill,
                Stroke::new(1.0, border),
                StrokeKind::Inside,
            );
            if accepting && response.hovered() {
                ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
            }
            if accepting && response.clicked() {
                hit = Some(idx);
            }
        }
        hit
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
        let now = Instant::now();
        self.tick(now);
        if let Some(result) = self.result.take() {
            return RunnerStatus::Finished(Box::new(result));
        }
        if matches!(self.stage, Stage::Ready) {
            self.ready_ui(ui, now);
        } else {
            ui.vertical_centered(|ui| {
                ui.label(
                    egui::RichText::new(self.status_text())
                        .size(16.0)
                        .color(theme::stimulus::MUTED),
                );
                ui.add_space(8.0);
                if let Some(block) = self.blocks_ui(ui, now) {
                    self.on_block_click(block, Instant::now());
                }
            });
            ui.ctx().request_repaint_after(Duration::from_millis(16));
        }
        let mut status = RunnerStatus::Running;
        ui.add_space(12.0);
        if ui.small_button("Interrompi il test").clicked() {
            status = RunnerStatus::Aborted;
        }
        status
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
