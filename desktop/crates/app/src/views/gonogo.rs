//! Vista del Go/No-Go. Porta `src/ui/tests/GoNoGoView.tsx`.
use std::collections::BTreeMap;

use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::gonogo::{
    generate_go_nogo, score_go_nogo, GoNoGoKind, GoNoGoParams, GoNoGoStimulus,
};

use super::palette::{GO_GREEN, NOGO_RED};
use super::rt::{evaluate_go, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;

const PRACTICE_FEEDBACK_MS: f64 = 600.0;
/// Raggio base (diametro 176 pt a scala 1,0).
const CIRCLE_RADIUS_PX: f32 = 88.0;

fn condition(kind: GoNoGoKind) -> &'static str {
    match kind {
        GoNoGoKind::Go => "go",
        GoNoGoKind::Nogo => "nogo",
    }
}

fn to_trials(stimuli: Vec<GoNoGoStimulus>) -> Vec<RtTrial<GoNoGoStimulus>> {
    stimuli
        .into_iter()
        .map(|s| RtTrial {
            spec: trial_spec(
                condition(s.kind),
                condition(s.kind).into(),
                Some(f64::from(s.isi_ms)),
                None,
            ),
            stimulus: s,
        })
        .collect()
}

fn draw(ctx: &StimulusCtx, stimulus: &GoNoGoStimulus) {
    if !ctx.show {
        return;
    }
    let color = if stimulus.kind == GoNoGoKind::Go {
        GO_GREEN
    } else {
        NOGO_RED
    };
    ctx.painter
        .circle_filled(ctx.center(), CIRCLE_RADIUS_PX * ctx.scale(), color);
}

pub fn plan(params: &GoNoGoParams, run: &RunContext) -> RtPlan<GoNoGoStimulus> {
    let practice_params = GoNoGoParams {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice = generate_go_nogo(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_go_nogo(params, &mut mulberry32(run.seed));
    RtPlan {
        test_id: TestId::Gonogo,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: params_object(params),
        practice: to_trials(practice),
        test: to_trials(test),
        timing: RtTiming {
            fixation_ms: 0.0,
            stimulus_visible_ms: f64::from(params.stimulus_ms),
            response_window_ms: f64::from(params.stimulus_ms),
            isi_ms: f64::from(params.isi_min_ms), // default; il valore reale per trial è in spec.isi_ms
            end_on_response: false,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: vec![" ".into()],
        expects_response: |t| t.condition == "go",
        evaluate: |t, key| evaluate_go(t, key, "go"),
        status_hint: "BARRA SPAZIATRICE sul cerchio verde; non premere sul rosso".into(),
        score: Box::new(score_go_nogo),
        draw,
    }
}

pub fn runner(
    params: &BTreeMap<String, f64>,
    run: RunContext,
) -> Result<Box<dyn TestRunner>, String> {
    let parsed: GoNoGoParams = parse_params(params)?;
    Ok(boxed_runner(plan(&parsed, &run), &run))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Settings;

    fn run() -> RunContext {
        RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 5,
            practice: true,
            feedback_during_test: false,
        }
    }

    #[test]
    fn should_carry_the_per_trial_isi_and_withhold_rules() {
        let params: GoNoGoParams =
            parse_params(&Settings::default().effective("gonogo")).expect("default validi");
        let p = plan(&params, &run());
        assert_eq!((p.practice.len(), p.test.len()), (10, 80));
        let isi = p.test[0].spec.isi_ms.expect("isi per trial");
        assert!((500.0..=1000.0).contains(&isi));
        let nogo = p
            .test
            .iter()
            .find(|t| t.spec.condition == "nogo")
            .expect("ci sono No-Go");
        assert!((p.evaluate)(&nogo.spec, None));
        assert!(!(p.evaluate)(&nogo.spec, Some(" ")));
        assert!(!(p.expects_response)(&nogo.spec));
    }
}
