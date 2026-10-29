//! Vista della Mental Rotation (figure a blocchi di Shepard & Metzler). Porta `src/ui/tests/MentalRotationView.tsx`.
use std::collections::BTreeMap;

use eframe::egui::{Color32, Painter, Pos2, Rect, Shape, Stroke, Vec2};
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::mental_rotation::{
    condition_label, generate_mental_rotation, project_faces, score_mental_rotation, Cube, Params,
    Stimulus,
};

use super::rt::{evaluate_expected_key, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;

const KEY_SAME: &str = "arrowleft";
const KEY_DIFFERENT: &str = "arrowright";
const PRACTICE_FEEDBACK_MS: f64 = 700.0;
const FIGURE_PX: f32 = 340.0;
const FIGURE_GAP_PX: f32 = 24.0;
/// Semi-ampiezza del campo in unità cubetto: contiene la figura a qualunque angolo.
const EXTENT: f32 = 4.6;
const EDGE_WIDTH_UNITS: f32 = 0.06;
const FIT_RATIO: f32 = 0.92;
/// Ingrandimento massimo rispetto al disegno di riferimento.
const MAX_SCALE: f32 = 2.4;
const HUE_DEG: f32 = 215.0;

fn to_trials(stimuli: Vec<Stimulus>) -> Vec<RtTrial<Stimulus>> {
    stimuli
        .into_iter()
        .map(|s| {
            let label = format!("{}/{}°", if s.same { "uguali" } else { "diverse" }, s.angle);
            let key = if s.same { KEY_SAME } else { KEY_DIFFERENT };
            RtTrial {
                spec: trial_spec(
                    &condition_label(s.same, s.angle),
                    label,
                    Some(s.isi_ms as f64),
                    Some(key),
                ),
                stimulus: s,
            }
        })
        .collect()
}

/// `hsl(215 45% l%)` → RGB (formula CSS standard).
fn face_color(shade: f64) -> Color32 {
    let (s, l) = (0.45_f32, (18.0 + shade as f32 * 52.0) / 100.0);
    let chroma = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let h = HUE_DEG / 60.0;
    let x = chroma * (1.0 - (h % 2.0 - 1.0).abs());
    let (r, g, b) = match h as u32 {
        0 => (chroma, x, 0.0),
        1 => (x, chroma, 0.0),
        2 => (0.0, chroma, x),
        3 => (0.0, x, chroma),
        4 => (x, 0.0, chroma),
        _ => (chroma, 0.0, x),
    };
    let m = l - chroma / 2.0;
    let byte = |v: f32| ((v + m) * 255.0).round().clamp(0.0, 255.0) as u8;
    Color32::from_rgb(byte(r), byte(g), byte(b))
}

fn draw_figure(painter: &Painter, center: Pos2, size: f32, cubes: &[Cube], angle: f64) {
    let unit = size / (EXTENT * 2.0);
    let stroke = Stroke::new(EDGE_WIDTH_UNITS * unit, Color32::from_rgb(0x0A, 0x0E, 0x1A));
    for face in project_faces(cubes, angle) {
        let points = face
            .points
            .iter()
            .map(|p| center + Vec2::new(p[0] as f32, p[1] as f32) * unit)
            .collect();
        painter.add(Shape::convex_polygon(
            points,
            face_color(face.shade),
            stroke,
        ));
    }
}

fn draw(ctx: &StimulusCtx, stimulus: &Stimulus) {
    if !ctx.show {
        return;
    }
    let total_width = FIGURE_PX * 2.0 + FIGURE_GAP_PX;
    let scale = (ctx.area.width() * FIT_RATIO / total_width)
        .min(ctx.area.height() * FIT_RATIO / FIGURE_PX)
        .min(MAX_SCALE);
    let size = FIGURE_PX * scale;
    let offset = (size + FIGURE_GAP_PX * scale) / 2.0;
    let center = ctx.center();
    let left = Rect::from_center_size(center - Vec2::new(offset, 0.0), Vec2::splat(size)).center();
    let right = Rect::from_center_size(center + Vec2::new(offset, 0.0), Vec2::splat(size)).center();
    draw_figure(ctx.painter, left, size, &stimulus.left, 0.0);
    draw_figure(
        ctx.painter,
        right,
        size,
        &stimulus.right,
        f64::from(stimulus.angle),
    );
}

pub fn plan(params: &Params, run: &RunContext) -> RtPlan<Stimulus> {
    let practice_params = Params {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice =
        generate_mental_rotation(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_mental_rotation(params, &mut mulberry32(run.seed));
    RtPlan {
        test_id: TestId::MentalRotation,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: params_object(params),
        practice: to_trials(practice),
        test: to_trials(test),
        timing: RtTiming {
            fixation_ms: params.fixation_ms,
            stimulus_visible_ms: params.response_window_ms,
            response_window_ms: params.response_window_ms,
            isi_ms: params.isi_min_ms as f64, // default; il valore reale per trial è in spec.isi_ms
            end_on_response: true,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: vec![KEY_SAME.into(), KEY_DIFFERENT.into()],
        expects_response: |_| true,
        evaluate: evaluate_expected_key,
        status_hint: "← figure UGUALI (solo ruotate) · → figure DIVERSE (speculari)".into(),
        score: Box::new(score_mental_rotation),
        draw,
    }
}

pub fn runner(
    params: &BTreeMap<String, f64>,
    run: RunContext,
) -> Result<Box<dyn TestRunner>, String> {
    let parsed: Params = parse_params(params)?;
    Ok(boxed_runner(plan(&parsed, &run), &run))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Settings;

    #[test]
    fn should_expect_left_for_same_figures_and_right_for_mirrored_ones() {
        let run = RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 13,
            practice: true,
            feedback_during_test: false,
        };
        let params: Params =
            parse_params(&Settings::default().effective("mentalRotation")).expect("default validi");
        let p = plan(&params, &run);
        for t in &p.test {
            let (right, wrong) = if t.stimulus.same {
                (KEY_SAME, KEY_DIFFERENT)
            } else {
                (KEY_DIFFERENT, KEY_SAME)
            };
            assert!((p.evaluate)(&t.spec, Some(right)));
            assert!(!(p.evaluate)(&t.spec, Some(wrong)));
        }
    }

    #[test]
    fn should_shade_faces_like_the_css_hsl_ramp() {
        // hsl(215 45% 18%) ≈ rgb(25, 42, 67); hsl(215 45% 70%) ≈ rgb(144, 173, 213)
        let dark = face_color(0.0);
        let light = face_color(1.0);
        assert!(dark.b() > dark.r() && light.b() > light.r());
        assert!(light.r() > dark.r());
        assert_eq!((dark.r(), dark.g(), dark.b()), (25, 42, 67));
        assert_eq!((light.r(), light.g(), light.b()), (144, 173, 213));
    }
}
