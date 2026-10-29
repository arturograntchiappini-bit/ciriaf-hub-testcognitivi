//! Vista del PVT: contatore di millisecondi che parte da 0. Porta `src/ui/tests/PvtView.tsx`.
use std::collections::BTreeMap;

use eframe::egui::{Align2, Color32, FontFamily, FontId, Pos2, Vec2};
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::pvt::{generate_pvt, score_pvt, Params, Stimulus, LAPSE_THRESHOLD_MS};

use super::rt::{RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{bold_text, boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;
use crate::theme::stimulus::{INK, MUTED};

const PRACTICE_FEEDBACK_MS: f64 = 1500.0;
/// Ambra del contatore oltre la soglia di lapse (`#B45309` del TS).
const LAPSE_AMBER: Color32 = Color32::from_rgb(0xB4, 0x53, 0x09);
const COUNTER_SIZE_PX: f32 = 132.0;
/// Passo di una cifra in unità di corpo (larghezza delle cifre di Inter).
const DIGIT_PITCH: f32 = 0.64;

fn to_trials(stimuli: Vec<Stimulus>) -> Vec<RtTrial<Stimulus>> {
    stimuli
        .into_iter()
        .map(|s| RtTrial {
            spec: trial_spec("pvt", "counter".into(), Some(s.isi_ms as f64), None),
            stimulus: s,
        })
        .collect()
}

/// Contatore: parte da 0 alla comparsa; oltre 500 ms vira all'ambra. Come nel TS mostra «0» anche prima della comparsa.
fn draw(ctx: &StimulusCtx, _stimulus: &Stimulus) {
    let ms = if ctx.show {
        ctx.elapsed_ms.max(0.0).floor()
    } else {
        0.0
    };
    let color = if ms > LAPSE_THRESHOLD_MS {
        LAPSE_AMBER
    } else {
        INK
    };
    let center = ctx.center();
    let size = COUNTER_SIZE_PX * ctx.scale();
    // Inter ha lo zero senza punto (JetBrains Mono lo ha puntato); ogni cifra va in una cella fissa così il numero non ballonzola.
    let font = FontId::new(size, FontFamily::Proportional);
    let digits = format!("{ms:.0}");
    let pitch = size * DIGIT_PITCH;
    let left = center.x - pitch * (digits.chars().count() as f32 - 1.0) / 2.0;
    for (i, digit) in digits.chars().enumerate() {
        let at = Pos2::new(left + pitch * i as f32, center.y);
        bold_text(ctx.painter, at, &digit.to_string(), font.clone(), color);
    }
    ctx.painter.text(
        center + Vec2::new(0.0, size * 0.72),
        Align2::CENTER_CENTER,
        "ms",
        FontId::new(size * 0.18, FontFamily::Proportional),
        MUTED,
    );
}

pub fn plan(params: &Params, run: &RunContext) -> RtPlan<Stimulus> {
    let practice_params = Params {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice = generate_pvt(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_pvt(params, &mut mulberry32(run.seed));
    RtPlan {
        test_id: TestId::Pvt,
        session_id: run.session_id.clone(),
        started_at: run.started_at.clone(),
        params: params_object(params),
        practice: to_trials(practice),
        test: to_trials(test),
        timing: RtTiming {
            fixation_ms: 0.0,
            stimulus_visible_ms: params.stimulus_max_ms,
            response_window_ms: params.stimulus_max_ms,
            isi_ms: params.isi_min_ms as f64, // default; ogni trial ha il suo isi nello spec
            end_on_response: true,
            practice_feedback_ms: PRACTICE_FEEDBACK_MS,
        },
        response_keys: vec![" ".into()],
        expects_response: |_| true,
        evaluate: |_, key| key.is_some(),
        status_hint: "BARRA SPAZIATRICE non appena compare il numero — il più veloce possibile"
            .into(),
        score: Box::new(score_pvt),
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
    fn should_use_the_random_isi_of_each_trial_and_accept_any_press() {
        let run = RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 9,
            practice: true,
            feedback_during_test: false,
        };
        let params: Params =
            parse_params(&Settings::default().effective("pvt")).expect("default validi");
        let p = plan(&params, &run);
        assert_eq!(p.test.len(), params.n_trials as usize);
        for t in &p.test {
            let isi = t.spec.isi_ms.expect("isi per trial");
            assert!(isi >= params.isi_min_ms as f64 && isi <= params.isi_max_ms as f64);
        }
        assert!((p.evaluate)(&p.test[0].spec, Some(" ")));
        assert!(!(p.evaluate)(&p.test[0].spec, None));
    }
}
