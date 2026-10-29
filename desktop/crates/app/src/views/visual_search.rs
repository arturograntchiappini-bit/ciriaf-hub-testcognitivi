//! Vista della Visual Search (ricerca di caratteristica e di congiunzione). Porta `src/ui/tests/VisualSearchView.tsx`.
use std::collections::BTreeMap;

use eframe::egui::{Color32, Rect, Vec2};
use sintropia_core::rng::mulberry32;
use sintropia_core::TestId;
use sintropia_engines::visual_search::{
    condition_label, generate_visual_search, score_visual_search, SearchColor, SearchShape,
    SearchType, VisualSearchParams, VisualSearchStimulus,
};

use super::rt::{evaluate_expected_key, RtPlan, RtTiming, RtTrial, RunContext, StimulusCtx};
use super::{boxed_runner, params_object, parse_params, trial_spec};
use crate::runner::TestRunner;

const KEY_PRESENT: &str = "arrowleft";
const KEY_ABSENT: &str = "arrowright";
const PRACTICE_FEEDBACK_MS: f64 = 700.0;
const FIELD_PX: f32 = 520.0;
const ITEM_PX: f32 = 30.0;
/// Quota di area occupata al massimo dal campo quando la finestra è piccola.
const FIT_RATIO: f32 = 0.92;
/// Ingrandimento massimo rispetto al disegno di riferimento.
const MAX_SCALE: f32 = 2.4;

/// Blu e arancione: restano distinguibili anche con le più comuni carenze nella visione dei colori.
fn fill(color: SearchColor) -> Color32 {
    match color {
        SearchColor::Orange => Color32::from_rgb(0xE8, 0x71, 0x0A),
        SearchColor::Blue => Color32::from_rgb(0x1F, 0x5F, 0xA8),
    }
}

fn type_name(search_type: SearchType) -> &'static str {
    match search_type {
        SearchType::Feature => "feature",
        SearchType::Conjunction => "conjunction",
    }
}

fn to_trials(stimuli: Vec<VisualSearchStimulus>) -> Vec<RtTrial<VisualSearchStimulus>> {
    stimuli
        .into_iter()
        .map(|s| {
            let label = format!(
                "{}/{}/{}",
                type_name(s.search_type),
                s.set_size,
                if s.present { "presente" } else { "assente" }
            );
            let key = if s.present { KEY_PRESENT } else { KEY_ABSENT };
            RtTrial {
                spec: trial_spec(
                    &condition_label(s.search_type, s.present, s.set_size),
                    label,
                    Some(f64::from(s.isi_ms)),
                    Some(key),
                ),
                stimulus: s,
            }
        })
        .collect()
}

fn draw(ctx: &StimulusCtx, stimulus: &VisualSearchStimulus) {
    if !ctx.show {
        return;
    }
    let scale = (ctx.area.width().min(ctx.area.height()) * FIT_RATIO / FIELD_PX).min(MAX_SCALE);
    let field = Rect::from_center_size(ctx.center(), Vec2::splat(FIELD_PX * scale));
    let half = ITEM_PX * scale / 2.0;
    for item in &stimulus.items {
        let center = field.min + Vec2::new(item.x as f32, item.y as f32) * field.width();
        match item.shape {
            SearchShape::Circle => {
                ctx.painter.circle_filled(center, half, fill(item.color));
            }
            SearchShape::Square => {
                let square = Rect::from_center_size(center, Vec2::splat(half * 2.0));
                ctx.painter.rect_filled(square, 0.0, fill(item.color));
            }
        }
    }
}

pub fn plan(params: &VisualSearchParams, run: &RunContext) -> RtPlan<VisualSearchStimulus> {
    let practice_params = VisualSearchParams {
        n_trials: params.practice_trials,
        ..params.clone()
    };
    let practice =
        generate_visual_search(&practice_params, &mut mulberry32(run.seed.wrapping_add(1)));
    let test = generate_visual_search(params, &mut mulberry32(run.seed));
    RtPlan {
        test_id: TestId::VisualSearch,
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
        response_keys: vec![KEY_PRESENT.into(), KEY_ABSENT.into()],
        expects_response: |_| true,
        evaluate: evaluate_expected_key,
        status_hint: "← cerchio arancione PRESENTE · → ASSENTE".into(),
        score: Box::new(score_visual_search),
        draw,
    }
}

pub fn runner(
    params: &BTreeMap<String, f64>,
    run: RunContext,
) -> Result<Box<dyn TestRunner>, String> {
    let parsed: VisualSearchParams = parse_params(params)?;
    Ok(boxed_runner(plan(&parsed, &run), &run))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Settings;

    #[test]
    fn should_expect_left_when_the_target_is_present_and_right_when_absent() {
        let run = RunContext {
            session_id: "S".into(),
            started_at: "t".into(),
            seed: 8,
            practice: true,
            feedback_during_test: false,
        };
        let params: VisualSearchParams =
            parse_params(&Settings::default().effective("visualSearch")).expect("default validi");
        let p = plan(&params, &run);
        assert_eq!(p.test.len(), params.n_trials as usize);
        for t in &p.test {
            let (right, wrong) = if t.stimulus.present {
                (KEY_PRESENT, KEY_ABSENT)
            } else {
                (KEY_ABSENT, KEY_PRESENT)
            };
            assert!((p.evaluate)(&t.spec, Some(right)));
            assert!(!(p.evaluate)(&t.spec, Some(wrong)));
            assert_eq!(t.stimulus.items.len(), t.stimulus.set_size as usize);
        }
    }
}
