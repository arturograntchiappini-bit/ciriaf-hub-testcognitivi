//! Vista del SART. Porta `src/ui/tests/SartView.tsx`.
//! La cifra resta visibile `digit_ms`, poi compare la maschera; la risposta vale su tutta la finestra.
use std::collections::BTreeMap;

use eframe::egui::{FontFamily, FontId, Stroke};
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::sart::{
    generate_sart, score_sart, SartParams, SartStimulus, SART_FONT_SIZES_PX,
};

use super::rt::{evaluate_go, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{bold_text, boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;
use crate::theme::stimulus::INK;

const PRACTICE_FEEDBACK_MS: f64 = 700.0;
/// Lato della maschera: il corpo maggiore ×1,3 (`STAGE_BOX_PX` del TS).
const MASK_BOX_PX: f32 = 120.0 * 1.3;
const DEFAULT_FONT_PX: f32 = 110.0;

fn to_trials(target_digit: u32, stimuli: Vec<SartStimulus>) -> Vec<RtTrial<SartStimulus>> {
    stimuli
        .into_iter()
        .map(|s| {
            let condition = if s.digit == target_digit {
                "nogo"
            } else {
                "go"
            };
            RtTrial {
                spec: trial_spec(condition, s.digit.to_string(), Some(0.0), None),
                stimulus: s,
            }
        })
        .collect()
}

/// Maschera: cerchio barrato da una croce (viewBox 100×100 dell'SVG del TS, scalato su `MASK_BOX_PX`).
fn draw_mask(ctx: &StimulusCtx) {
    let scale = MASK_BOX_PX * ctx.scale() / 100.0;
    let center = ctx.center();
    let stroke = Stroke::new(3.0 * scale, INK);
    ctx.painter.circle_stroke(center, 30.0 * scale, stroke);
    let d = 21.0 * scale;
    ctx.painter.line_segment(
        [
            center + eframe::egui::vec2(-d, -d),
            center + eframe::egui::vec2(d, d),
        ],
        stroke,
    );
    ctx.painter.line_segment(
        [
            center + eframe::egui::vec2(d, -d),
            center + eframe::egui::vec2(-d, d),
        ],
        stroke,
    );
}

fn draw(ctx: &StimulusCtx, stimulus: &SartStimulus) {
    if !ctx.show {
        draw_mask(ctx);
        return;
    }
    let base = SART_FONT_SIZES_PX
        .get(stimulus.size_index)
        .map_or(DEFAULT_FONT_PX, |&px| px as f32);
    let size = base * ctx.scale() * 1.15;
    let font = FontId::new(size, FontFamily::Proportional);
    bold_text(
        ctx.painter,
        ctx.center(),
        &stimulus.digit.to_string(),
        font,
        INK,
    );
}

pub fn plan(params: &SartParams, run: &RunContext) -> RtPlan<SartStimulus> {
    let practice_params = SartParams {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice = generate_sart(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_sart(params, &mut mulberry32(run.seed));
    RtPlan {
        test_id: TestId::Sart,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: params_object(params),
        practice: to_trials(params.target_digit, practice),
        test: to_trials(params.target_digit, test),
        timing: RtTiming {
            fixation_ms: 0.0,
            stimulus_visible_ms: f64::from(params.digit_ms),
            response_window_ms: f64::from(params.digit_ms + params.mask_ms),
            isi_ms: 0.0, // le cifre si susseguono senza pausa: la maschera è il «vuoto» fra l'una e l'altra
            end_on_response: false,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: vec![" ".into()],
        expects_response: |t| t.condition == "go",
        evaluate: |t, key| evaluate_go(t, key, "go"),
        status_hint: format!(
            "BARRA SPAZIATRICE a ogni cifra; non premere sul {}",
            params.target_digit
        ),
        score: Box::new(score_sart),
        draw,
    }
}

pub fn runner(
    params: &BTreeMap<String, f64>,
    run: RunContext,
) -> Result<Box<dyn TestRunner>, String> {
    let parsed: SartParams = parse_params(params)?;
    Ok(boxed_runner(plan(&parsed, &run), &run))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Settings;

    #[test]
    fn should_label_target_digit_as_nogo_and_back_to_back_trials() {
        let run = RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 3,
            practice: true,
            feedback_during_test: false,
        };
        let params: SartParams =
            parse_params(&Settings::default().effective("sart")).expect("default validi");
        let p = plan(&params, &run);
        for trial in &p.test {
            let is_target = trial.stimulus.digit == params.target_digit;
            assert_eq!(trial.spec.condition == "nogo", is_target);
            assert_eq!(trial.spec.isi_ms, Some(0.0));
        }
        assert_eq!(
            p.timing.response_window_ms,
            f64::from(params.digit_ms + params.mask_ms)
        );
        assert!(p.status_hint.ends_with(&params.target_digit.to_string()));
    }
}
