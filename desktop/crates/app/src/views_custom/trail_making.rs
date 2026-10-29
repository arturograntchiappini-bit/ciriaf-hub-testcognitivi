//! Trail Making A/B: cerchi da collegare a clic nell'ordine corretto, pratica A/B poi test.
//! Porta `src/ui/tests/TrailMakingView.tsx`.
use std::time::{Duration, Instant};

use eframe::egui::{
    self, pos2, vec2, Align2, Color32, CornerRadius, FontFamily, FontId, Pos2, Rect, Sense, Stroke,
    StrokeKind, Vec2,
};
use serde_json::{Map, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::{Phase, TestId, TestResult, TrialResult};
use sintropia_engines::trail_making::{
    generate_trail, score_trail_making, Params, TrailCircle, TrailPart, TrailRun,
};

use super::ms_between;
use crate::runner::{RunnerStatus, TestRunner};
use crate::theme;
use crate::views::chrome::{self, ButtonKind, Hint, PauseChoice, PauseTimer};

const FIELD_MAX: f32 = 1000.0;
/// Raggio dei cerchi rispetto al lato del campo: sotto metà di `MIN_DISTANCE` (0,11) del motore, così non si sovrappongono.
const RADIUS_FRACTION: f32 = 0.045;
/// Spazio in alto per l'etichetta della parte.
const CAPTION_HEIGHT: f32 = 44.0;
const ERROR_FLASH_MS: f64 = 350.0;

struct Block {
    part: TrailPart,
    phase: Phase,
    circles: Vec<TrailCircle>,
}

fn build_blocks(params: &Params, seed: u32, practice: bool) -> Vec<Block> {
    let mut rand = mulberry32(seed);
    let mut blocks = Vec::new();
    let mut push = |count: u32, phase: Phase, blocks: &mut Vec<Block>| {
        for part in [TrailPart::A, TrailPart::B] {
            let circles = generate_trail(part, count as usize, &mut rand);
            blocks.push(Block {
                part,
                phase,
                circles,
            });
        }
    };
    if practice && params.practice_targets > 0 {
        push(params.practice_targets, Phase::Practice, &mut blocks);
    }
    push(params.n_targets, Phase::Test, &mut blocks);
    blocks
}

fn part_text(part: TrailPart) -> &'static str {
    match part {
        TrailPart::A => "Collega i cerchi in ordine numerico: 1 – 2 – 3 …",
        TrailPart::B => "Collega alternando numeri e lettere: 1 – A – 2 – B – 3 …",
    }
}

pub struct TrailMakingRunner {
    params: Params,
    session_id: String,
    started_at: String,
    t0: Instant,
    blocks: Vec<Block>,
    index: usize,
    run: Option<TrailRun>,
    reached: usize,
    wrong: Option<(usize, f64)>,
    trials: Vec<TrialResult>,
    result: Option<TestResult>,
    hint_a: Hint,
    hint_b: Hint,
    pause: PauseTimer,
}

impl TrailMakingRunner {
    pub fn new(
        params: Params,
        session_id: &str,
        started_at: &str,
        seed: u32,
        practice: bool,
        _feedback: bool,
    ) -> Self {
        Self {
            blocks: build_blocks(&params, seed, practice),
            params,
            session_id: session_id.to_string(),
            started_at: started_at.to_string(),
            t0: Instant::now(),
            index: 0,
            run: None,
            reached: 0,
            wrong: None,
            trials: Vec::new(),
            result: None,
            hint_a: Hint::parse("Collega i cerchi in ordine numerico: 1 – 2 – 3"),
            hint_b: Hint::parse("Alterna numeri e lettere: 1 – A – 2 – B – 3"),
            pause: PauseTimer::default(),
        }
    }

    fn now_ms(&self) -> f64 {
        ms_between(self.t0, Instant::now())
    }

    fn start_block(&mut self) {
        let block = &self.blocks[self.index];
        self.run = Some(TrailRun::new(
            block.circles.clone(),
            block.part,
            block.phase,
            &self.session_id,
            self.now_ms(),
        ));
        self.reached = 0;
        self.wrong = None;
    }

    fn finish_block(&mut self) {
        self.run = None;
        self.index += 1;
        if self.index < self.blocks.len() {
            return;
        }
        self.result = Some(self.build_result());
    }

    fn on_circle_click(&mut self, circle: usize) {
        let now = self.now_ms();
        let Some(run) = self.run.as_mut() else { return };
        let Some(mut trial) = run.click(circle, now) else {
            return;
        };
        trial.trial_index = self.trials.len() as u32;
        let correct = trial.correct;
        self.trials.push(trial);
        if !correct {
            self.wrong = Some((circle, now));
        } else {
            self.reached += 1;
            if self.run.as_ref().is_some_and(TrailRun::done) {
                self.finish_block();
            }
        }
    }

    fn build_result(&self) -> TestResult {
        let params = match serde_json::to_value(&self.params) {
            Ok(Value::Object(map)) => map,
            _ => Map::new(),
        };
        TestResult {
            test_id: TestId::TrailMaking,
            session_id: self.session_id.clone(),
            started_at: self.started_at.clone(),
            params,
            summary: score_trail_making(&self.trials, self.params.n_targets as usize),
            trials: self.trials.clone(),
        }
    }

    fn pause_step(&mut self, ui: &mut egui::Ui, stage: &chrome::Stage) -> Option<RunnerStatus> {
        if chrome::escape_pressed(ui) {
            if self.pause.is_paused() {
                self.t0 += self.pause.resume();
            } else {
                self.pause.pause();
            }
        }
        if !self.pause.is_paused() {
            return None;
        }
        Some(match chrome::pause_panel(ui, stage) {
            Some(PauseChoice::Resume) => {
                self.t0 += self.pause.resume();
                RunnerStatus::Running
            }
            Some(PauseChoice::ExportPartial) => {
                RunnerStatus::Finished(Box::new(self.build_result()))
            }
            Some(PauseChoice::Abort) => RunnerStatus::Aborted,
            None => RunnerStatus::Running,
        })
    }

    fn hint(&self) -> &Hint {
        match self.blocks[self.index.min(self.blocks.len() - 1)].part {
            TrailPart::A => &self.hint_a,
            TrailPart::B => &self.hint_b,
        }
    }

    fn intro_ui(&mut self, ui: &mut egui::Ui, stage: &chrome::Stage) -> bool {
        let block = &self.blocks[self.index];
        let practice = block.phase == Phase::Practice;
        let center = stage.area.center();
        let p = &stage.painter;
        p.text(
            center - vec2(0.0, 130.0),
            Align2::CENTER_CENTER,
            format!(
                "{} · PARTE {}",
                if practice { "PRATICA" } else { "TEST" },
                block.part.as_str()
            ),
            FontId::new(52.0, theme::display_family()),
            theme::stimulus::INK,
        );
        p.text(
            center - vec2(0.0, 62.0),
            Align2::CENTER_CENTER,
            part_text(block.part),
            FontId::proportional(20.0),
            chrome::TEXT,
        );
        for (i, line) in [
            "Fai clic il più velocemente possibile senza staccarti dall’ordine.",
            "Se sbagli, il cerchio lampeggia in rosso e devi cercare quello giusto:",
            "il tempo continua a scorrere.",
        ]
        .into_iter()
        .enumerate()
        {
            p.text(
                center + vec2(0.0, -34.0 + 24.0 * i as f32),
                Align2::CENTER_CENTER,
                line,
                FontId::proportional(15.5),
                theme::stimulus::MUTED,
            );
        }
        let button = Rect::from_center_size(center + vec2(0.0, 92.0), vec2(220.0, 48.0));
        chrome::button(ui, button, "Inizia", ButtonKind::Primary, None)
    }

    /// Disegna campo, linee e cerchi; ritorna il cerchio cliccato.
    fn field_ui(&mut self, ui: &mut egui::Ui, stage: &chrome::Stage) -> Option<usize> {
        let block = &self.blocks[self.index];
        let avail = Rect::from_min_max(
            pos2(stage.area.min.x, stage.area.min.y + CAPTION_HEIGHT),
            pos2(stage.area.max.x, stage.area.max.y - 8.0),
        );
        let side = (avail.width() * 0.96)
            .min(avail.height())
            .clamp(240.0, FIELD_MAX);
        let field = Rect::from_center_size(avail.center(), vec2(side, side));
        let radius = (side * RADIUS_FRACTION).clamp(15.0, 40.0);
        let p = &stage.painter;
        p.text(
            pos2(stage.area.center().x, stage.area.min.y + 22.0),
            Align2::CENTER_CENTER,
            format!("PARTE {}", block.part.as_str()),
            FontId::monospace(14.0),
            theme::stimulus::MUTED,
        );
        p.rect(
            field,
            CornerRadius::same(8),
            Color32::from_rgb(0xFB, 0xFC, 0xFD),
            Stroke::new(1.0, theme::stimulus::LINE),
            StrokeKind::Inside,
        );
        let at =
            |c: &TrailCircle| -> Pos2 { field.min + vec2(c.x as f32 * side, c.y as f32 * side) };
        let reached = self.reached.min(block.circles.len());
        for pair in block.circles[..reached].windows(2) {
            p.line_segment(
                [at(&pair[0]), at(&pair[1])],
                Stroke::new((radius * 0.14).max(2.0), theme::stimulus::ACCENT),
            );
        }
        let flash = self
            .wrong
            .filter(|&(_, at_ms)| self.now_ms() - at_ms < ERROR_FLASH_MS);
        let mut hit = None;
        for (i, circle) in block.circles.iter().enumerate() {
            let center = at(circle);
            let rect = Rect::from_center_size(center, Vec2::splat(radius * 2.0));
            let response = ui.interact(rect, ui.make_persistent_id(("trail", i)), Sense::CLICK);
            let hovered = response.hovered();
            let look = circle_look(i < reached, flash.is_some_and(|(w, _)| w == i), hovered);
            p.circle(
                center,
                radius,
                look.fill,
                Stroke::new(look.width, look.border),
            );
            p.text(
                center,
                Align2::CENTER_CENTER,
                &circle.label,
                FontId::new(radius * 0.95, FontFamily::Proportional),
                look.text,
            );
            if hovered {
                ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
            }
            if response.clicked() {
                hit = Some(i);
            }
        }
        hit
    }
}

struct CircleLook {
    fill: Color32,
    border: Color32,
    text: Color32,
    width: f32,
}

fn circle_look(reached: bool, wrong: bool, hovered: bool) -> CircleLook {
    use theme::stimulus::{ACCENT, DANGER, INK};
    let (fill, border, text, width) = if wrong {
        (Color32::from_rgb(0xFD, 0xEC, 0xEE), DANGER, DANGER, 3.5)
    } else if reached {
        (Color32::from_rgb(0xEA, 0xF2, 0xFB), ACCENT, ACCENT, 2.5)
    } else if hovered {
        (Color32::from_rgb(0xF4, 0xF8, 0xFD), ACCENT, INK, 3.5)
    } else {
        (Color32::WHITE, INK, INK, 2.0)
    };
    CircleLook {
        fill,
        border,
        text,
        width,
    }
}

impl TestRunner for TrailMakingRunner {
    fn test_id(&self) -> TestId {
        TestId::TrailMaking
    }

    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus {
        let stage = chrome::Stage::begin(ui);
        if let Some(status) = self.pause_step(ui, &stage) {
            return status;
        }
        if let Some(result) = self.result.take() {
            return RunnerStatus::Finished(Box::new(result));
        }
        stage.esc_hint();
        let block = &self.blocks[self.index];
        let (practice, total) = (block.phase == Phase::Practice, block.circles.len());
        let fraction = if self.run.is_some() {
            self.reached as f32 / total as f32
        } else {
            0.0
        };
        stage.status_bar_with(
            self.hint(),
            Some(practice),
            &format!("parte {} · {} / {total}", block.part.as_str(), self.reached),
            fraction,
        );
        if self.run.is_none() {
            if self.intro_ui(ui, &stage) {
                self.start_block();
            }
        } else {
            if let Some(circle) = self.field_ui(ui, &stage) {
                self.on_circle_click(circle);
            }
            ui.ctx().request_repaint_after(Duration::from_millis(16));
        }
        RunnerStatus::Running
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn runner(practice: bool) -> TrailMakingRunner {
        let params = Params {
            n_targets: 5,
            practice_targets: 3,
        };
        TrailMakingRunner::new(params, "S", "2026-01-01T00:00:00.000Z", 7, practice, false)
    }

    #[test]
    fn should_plan_practice_a_b_then_test_a_b() {
        assert_eq!(runner(true).blocks.len(), 4);
        assert_eq!(runner(false).blocks.len(), 2);
    }

    #[test]
    fn should_finish_with_all_clicks_recorded_and_flash_on_error() {
        let mut r = runner(false);
        for _ in 0..2 {
            r.start_block();
            r.on_circle_click(4); // errore: il cerchio 5 non è il bersaglio
            assert!(r.wrong.is_some());
            for i in 0..5 {
                r.on_circle_click(i);
            }
        }
        let result = r.result.take().expect("test completato");
        assert_eq!(result.trials.len(), 12);
        assert_eq!(result.trials.iter().filter(|t| !t.correct).count(), 2);
    }
}
