//! Vista dello Stroop (varianti 1 e 2). Porta `src/ui/tests/StroopView.tsx`.
use std::collections::BTreeMap;

use eframe::egui::{Color32, FontFamily, FontId};
use serde_json::Value;
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::stroop::{
    correct_key_stroop, generate_stroop, score_stroop, stroop_stimulus_label, StroopColor,
    StroopParams, StroopStimulus, StroopVariant,
};

use super::rt::{evaluate_expected_key, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{bold_text, boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;

const PRACTICE_FEEDBACK_MS: f64 = 800.0;
const WORD_SIZE_PX: f32 = 72.0;

fn ink(color: StroopColor) -> Color32 {
    match color {
        StroopColor::Rosso => Color32::from_rgb(0xD0, 0x02, 0x1B),
        StroopColor::Verde => Color32::from_rgb(0x2E, 0x7D, 0x32),
        StroopColor::Blu => Color32::from_rgb(0x15, 0x65, 0xC0),
        StroopColor::Giallo => Color32::from_rgb(0xF5, 0xA6, 0x23),
    }
}

fn to_trials(variant: StroopVariant, stimuli: Vec<StroopStimulus>) -> Vec<RtTrial<StroopStimulus>> {
    stimuli
        .into_iter()
        .map(|s| {
            let key = correct_key_stroop(&s, variant)
                .to_ascii_lowercase()
                .to_string();
            let condition = if s.congruent {
                "congruent"
            } else {
                "incongruent"
            };
            RtTrial {
                spec: trial_spec(condition, stroop_stimulus_label(&s), None, Some(&key)),
                stimulus: s,
            }
        })
        .collect()
}

fn draw(ctx: &StimulusCtx, stimulus: &StroopStimulus) {
    if !ctx.show {
        return;
    }
    let font = FontId::new(WORD_SIZE_PX, FontFamily::Proportional);
    bold_text(
        ctx.painter,
        ctx.center(),
        stimulus.word.as_str(),
        font,
        ink(stimulus.color),
    );
}

pub fn plan(
    variant: StroopVariant,
    params: &StroopParams,
    run: &RunContext,
) -> RtPlan<StroopStimulus> {
    let practice_params = StroopParams {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice = generate_stroop(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_stroop(params, &mut mulberry32(run.seed));
    let (test_id, hint) = match variant {
        StroopVariant::Stroop1 => (TestId::Stroop1, "Rispondi alla PAROLA (R/V/B/G)"),
        StroopVariant::Stroop2 => (TestId::Stroop2, "Rispondi al COLORE (R/V/B/G)"),
    };
    let mut used = params_object(params);
    used.insert("variant".into(), Value::String(test_id.as_str().into()));
    RtPlan {
        test_id,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: used,
        practice: to_trials(variant, practice),
        test: to_trials(variant, test),
        timing: RtTiming {
            fixation_ms: f64::from(params.fixation_ms),
            stimulus_visible_ms: f64::from(params.timeout_ms),
            response_window_ms: f64::from(params.timeout_ms),
            isi_ms: f64::from(params.isi_ms),
            end_on_response: true,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: ["r", "v", "b", "g"].map(String::from).to_vec(),
        expects_response: |_| true,
        evaluate: evaluate_expected_key,
        status_hint: hint.into(),
        score: Box::new(score_stroop),
        draw,
    }
}

pub fn runner(
    test: TestId,
    params: &BTreeMap<String, f64>,
    run: RunContext,
) -> Result<Box<dyn TestRunner>, String> {
    let variant = if test == TestId::Stroop2 {
        StroopVariant::Stroop2
    } else {
        StroopVariant::Stroop1
    };
    let parsed: StroopParams = parse_params(params)?;
    Ok(boxed_runner(plan(variant, &parsed, &run), &run))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Settings;

    fn run() -> RunContext {
        RunContext {
            session_id: "S".into(),
            started_at: "2026-01-01T00:00:00.000Z".into(),
            seed: 42,
            practice: true,
            feedback_during_test: false,
        }
    }

    fn params() -> StroopParams {
        parse_params(&Settings::default().effective("stroop1")).expect("default validi")
    }

    #[test]
    fn should_use_word_key_for_stroop1_and_ink_key_for_stroop2() {
        let p1 = plan(StroopVariant::Stroop1, &params(), &run());
        let p2 = plan(StroopVariant::Stroop2, &params(), &run());
        let first = &p1.test[0];
        let expected1 = first.stimulus.word.key().to_ascii_lowercase().to_string();
        assert!((p1.evaluate)(&first.spec, Some(&expected1)));
        let second = &p2.test[0];
        let expected2 = second.stimulus.color.key().to_ascii_lowercase().to_string();
        assert!((p2.evaluate)(&second.spec, Some(&expected2)));
        assert!(!(p2.evaluate)(&second.spec, None));
    }

    #[test]
    fn should_generate_default_trial_counts_and_variant_param() {
        let p = plan(StroopVariant::Stroop2, &params(), &run());
        assert_eq!((p.practice.len(), p.test.len()), (8, 48));
        assert_eq!(p.params["variant"], "stroop2");
        assert_eq!(p.params["nTrials"], 48);
        assert_eq!(p.test_id, TestId::Stroop2);
    }

    #[test]
    fn should_reproduce_the_same_sequence_for_the_same_seed() {
        let a = plan(StroopVariant::Stroop1, &params(), &run());
        let b = plan(StroopVariant::Stroop1, &params(), &run());
        let labels = |p: &RtPlan<StroopStimulus>| {
            p.test
                .iter()
                .map(|t| t.spec.stimulus_label.clone())
                .collect::<Vec<_>>()
        };
        assert_eq!(labels(&a), labels(&b));
    }
}
