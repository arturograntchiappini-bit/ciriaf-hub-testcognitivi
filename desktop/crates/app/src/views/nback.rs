//! Vista dell'N-Back: lettera grande, finestra di risposta sull'intero trial (lettera + blank).
//! Porta `src/ui/tests/NBackView.tsx`.
use std::collections::BTreeMap;

use eframe::egui::{FontFamily, FontId};
use sintropia_content::catalog::nback_instruction;
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::nback::{generate_nback, score_nback, Params, Stimulus};

use super::rt::{evaluate_go, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{bold_text, boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;
use crate::theme::stimulus::INK;

const PRACTICE_FEEDBACK_MS: f64 = 500.0;
const LETTER_SIZE_PX: f32 = 140.0;
/// Quartili dell'analisi della vigilanza (default di `scoreNBack`).
const N_QUARTILES: usize = 4;

fn condition(s: &Stimulus) -> &'static str {
    if s.is_target {
        "target"
    } else if s.is_lure {
        "lure"
    } else {
        "nontarget"
    }
}

fn to_trials(stimuli: Vec<Stimulus>) -> Vec<RtTrial<Stimulus>> {
    stimuli
        .into_iter()
        .map(|s| RtTrial {
            spec: trial_spec(condition(&s), s.letter.to_string(), None, None),
            stimulus: s,
        })
        .collect()
}

fn draw(ctx: &StimulusCtx, stimulus: &Stimulus) {
    if !ctx.show {
        return;
    }
    let font = FontId::new(LETTER_SIZE_PX * ctx.scale(), FontFamily::Proportional);
    bold_text(
        ctx.painter,
        ctx.center(),
        &stimulus.letter.to_string(),
        font,
        INK,
    );
}

pub fn plan(params: &Params, run: &RunContext) -> RtPlan<Stimulus> {
    let practice_params = Params {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice = generate_nback(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_nback(params, &mut mulberry32(run.seed));
    let hint = nback_instruction(params.n as f64)
        .key_hints
        .first()
        .cloned()
        .unwrap_or_default();
    RtPlan {
        test_id: TestId::Nback,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: params_object(params),
        practice: to_trials(practice),
        test: to_trials(test),
        timing: RtTiming {
            fixation_ms: 0.0,
            stimulus_visible_ms: params.letter_ms,
            response_window_ms: params.letter_ms + params.blank_ms,
            isi_ms: 0.0, // il «blank» è già dentro la finestra di risposta
            end_on_response: false,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: vec![" ".into()],
        expects_response: |t| t.condition == "target",
        evaluate: |t, key| evaluate_go(t, key, "target"),
        status_hint: hint,
        score: Box::new(|trials| score_nback(trials, N_QUARTILES)),
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
    fn should_expect_a_press_only_on_targets_and_follow_the_n_level_in_the_hint() {
        let run = RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 21,
            practice: true,
            feedback_during_test: false,
        };
        let params: Params =
            parse_params(&Settings::default().effective("nback")).expect("default validi");
        let p = plan(&params, &run);
        let target = p
            .test
            .iter()
            .find(|t| t.stimulus.is_target)
            .expect("ci sono target");
        assert!((p.evaluate)(&target.spec, Some(" ")));
        assert!(!(p.evaluate)(&target.spec, None));
        let lure_or_plain = p
            .test
            .iter()
            .find(|t| !t.stimulus.is_target)
            .expect("non-target");
        assert!((p.evaluate)(&lure_or_plain.spec, None));
        assert!(p.status_hint.contains("2 passi fa"));
        assert_eq!(
            p.timing.response_window_ms,
            params.letter_ms + params.blank_ms
        );
    }
}
