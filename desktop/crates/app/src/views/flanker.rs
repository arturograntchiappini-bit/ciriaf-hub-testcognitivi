//! Vista del Flanker Task (Eriksen). Porta `src/ui/tests/FlankerView.tsx`.
use std::collections::BTreeMap;

use eframe::egui::{Painter, Pos2, Shape, Stroke, Vec2};
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::flanker::{
    generate_flanker, score_flanker, FlankerDirection, FlankerParams, FlankerStimulus,
};

use super::rt::{evaluate_expected_key, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;
use crate::theme::stimulus::INK;

const KEY_LEFT: &str = "arrowleft";
const KEY_RIGHT: &str = "arrowright";
const PRACTICE_FEEDBACK_MS: f64 = 700.0;
const GLYPH_WIDTH: f32 = 64.0;
const GLYPH_HEIGHT: f32 = 48.0;
const GLYPH_GAP: f32 = 8.0;
const STROKE_PX: f32 = 7.0;

fn correct_key(direction: FlankerDirection) -> &'static str {
    match direction {
        FlankerDirection::Left => KEY_LEFT,
        FlankerDirection::Right => KEY_RIGHT,
    }
}

fn to_trials(stimuli: Vec<FlankerStimulus>) -> Vec<RtTrial<FlankerStimulus>> {
    stimuli
        .into_iter()
        .map(|s| RtTrial {
            spec: trial_spec(
                s.condition.as_str(),
                s.arrows.clone(),
                Some(f64::from(s.isi_ms)),
                Some(correct_key(s.direction)),
            ),
            stimulus: s,
        })
        .collect()
}

/// Polilinea con estremi «square» (il tratto sporge di mezzo spessore, come `stroke-linecap: square` dell'SVG).
fn square_capped(mut points: Vec<Pos2>) -> Vec<Pos2> {
    let half = STROKE_PX / 2.0;
    let n = points.len();
    if n >= 2 {
        let start_dir = (points[0] - points[1]).normalized();
        let end_dir = (points[n - 1] - points[n - 2]).normalized();
        points[0] += start_dir * half;
        points[n - 1] += end_dir * half;
    }
    points
}

/// Un elemento 64×48: freccia a destra, a sinistra (specchiata) o trattino neutro.
fn draw_glyph(painter: &Painter, origin: Pos2, symbol: char) {
    let stroke = Stroke::new(STROKE_PX, INK);
    let flip = |x: f32| if symbol == '←' { GLYPH_WIDTH - x } else { x };
    let at = |x: f32, y: f32| origin + Vec2::new(flip(x), y);
    let paths: Vec<Vec<Pos2>> = if symbol == '–' {
        vec![vec![at(10.0, 24.0), at(54.0, 24.0)]]
    } else {
        vec![
            vec![at(6.0, 24.0), at(52.0, 24.0)],
            vec![at(34.0, 8.0), at(56.0, 24.0), at(34.0, 40.0)],
        ]
    };
    for path in paths {
        painter.add(Shape::line(square_capped(path), stroke));
    }
}

fn draw(ctx: &StimulusCtx, stimulus: &FlankerStimulus) {
    if !ctx.show {
        return;
    }
    let symbols: Vec<char> = stimulus.arrows.chars().collect();
    let count = symbols.len() as f32;
    let total = count * GLYPH_WIDTH + (count - 1.0).max(0.0) * GLYPH_GAP;
    let center = ctx.center();
    let mut x = center.x - total / 2.0;
    for symbol in symbols {
        draw_glyph(
            ctx.painter,
            Pos2::new(x, center.y - GLYPH_HEIGHT / 2.0),
            symbol,
        );
        x += GLYPH_WIDTH + GLYPH_GAP;
    }
}

pub fn plan(params: &FlankerParams, run: &RunContext) -> RtPlan<FlankerStimulus> {
    let practice_params = FlankerParams {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice = generate_flanker(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_flanker(params, &mut mulberry32(run.seed));
    RtPlan {
        test_id: TestId::Flanker,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: params_object(params),
        practice: to_trials(practice),
        test: to_trials(test),
        timing: RtTiming {
            fixation_ms: f64::from(params.fixation_ms),
            stimulus_visible_ms: f64::from(params.response_window_ms),
            response_window_ms: f64::from(params.response_window_ms),
            isi_ms: f64::from(params.isi_min_ms), // default; il valore reale per trial è in spec.isi_ms
            end_on_response: true,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: vec![KEY_LEFT.into(), KEY_RIGHT.into()],
        expects_response: |_| true,
        evaluate: evaluate_expected_key,
        status_hint: "FRECCE ← → secondo la freccia CENTRALE; ignora quelle ai lati".into(),
        score: Box::new(score_flanker),
        draw,
    }
}

pub fn runner(
    params: &BTreeMap<String, f64>,
    run: RunContext,
) -> Result<Box<dyn TestRunner>, String> {
    let parsed: FlankerParams = parse_params(params)?;
    Ok(boxed_runner(plan(&parsed, &run), &run))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Settings;

    #[test]
    fn should_expect_the_arrow_key_of_the_central_direction() {
        let run = RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 11,
            practice: true,
            feedback_during_test: false,
        };
        let params: FlankerParams =
            parse_params(&Settings::default().effective("flanker")).expect("default validi");
        let p = plan(&params, &run);
        for trial in p.test.iter().take(20) {
            let expected = correct_key(trial.stimulus.direction);
            assert!((p.evaluate)(&trial.spec, Some(expected)));
            let other = if expected == KEY_LEFT {
                KEY_RIGHT
            } else {
                KEY_LEFT
            };
            assert!(!(p.evaluate)(&trial.spec, Some(other)));
        }
    }

    #[test]
    fn should_extend_line_ends_by_half_the_stroke_width() {
        let pts = square_capped(vec![Pos2::new(10.0, 0.0), Pos2::new(20.0, 0.0)]);
        assert_eq!(pts[0].x, 10.0 - STROKE_PX / 2.0);
        assert_eq!(pts[1].x, 20.0 + STROKE_PX / 2.0);
    }
}
