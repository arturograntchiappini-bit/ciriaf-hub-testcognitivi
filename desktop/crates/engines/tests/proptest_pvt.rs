//! Invarianti property-based del PVT: ISI nell'intervallo, lunghezza, determinismo, metriche coerenti.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_core::types::{Phase, TestId, TrialResult, ValidationFlag};
use sintropia_engines::pvt::{generate_pvt, score_pvt, Params};

const TEST: &str = "pvt";

fn params(n_trials: u32, isi_min_ms: i64, span: i64) -> Params {
    Params {
        n_trials,
        stimulus_max_ms: 10_000.0,
        isi_min_ms,
        isi_max_ms: isi_min_ms + span,
        practice_trials: 0,
    }
}

fn trial(flag: ValidationFlag, rt: Option<f64>) -> TrialResult {
    TrialResult {
        test_id: TestId::Pvt,
        session_id: "p".into(),
        trial_index: 0,
        phase: Phase::Test,
        condition: "pvt".into(),
        stimulus: String::new(),
        response: rt.map(|_| "space".to_string()),
        correct: rt.is_some(),
        rt_ms: rt,
        flag,
        onset_timestamp: 0.0,
    }
}

fn arbitrary_trial() -> impl Strategy<Value = TrialResult> {
    prop_oneof![
        (150.0..2000.0_f64).prop_map(|rt| trial(ValidationFlag::Valid, Some(rt))),
        (0.0..149.0_f64).prop_map(|rt| trial(ValidationFlag::Anticipation, Some(rt))),
        Just(trial(ValidationFlag::Omission, None)),
        Just(trial(ValidationFlag::Interrupted, None)),
    ]
}

#[test]
fn should_hold_pvt_invariants() {
    let strategy = (any::<u32>(), 0u32..300, 0i64..5000, 0i64..9000);
    run_prop(
        TEST,
        "isi_nell_intervallo_e_lunghezza",
        512,
        strategy,
        |(seed, n, min, span)| {
            let stimuli = generate_pvt(&params(n, min, span), &mut mulberry32(seed));
            prop_assert_eq!(stimuli.len(), n as usize);
            prop_assert!(stimuli
                .iter()
                .all(|s| s.isi_ms >= min && s.isi_ms <= min + span));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "determinismo_a_parita_di_seme",
        256,
        (any::<u32>(), 1u32..200),
        |(seed, n)| {
            let p = params(n, 2000, 8000);
            prop_assert_eq!(
                generate_pvt(&p, &mut mulberry32(seed)),
                generate_pvt(&p, &mut mulberry32(seed))
            );
            Ok(())
        },
    );
    run_prop(
        TEST,
        "isi_fisso_se_min_uguale_max",
        128,
        (any::<u32>(), 1u32..100, 0i64..9000),
        |(seed, n, isi)| {
            let stimuli = generate_pvt(&params(n, isi, 0), &mut mulberry32(seed));
            prop_assert!(stimuli.iter().all(|s| s.isi_ms == isi));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "isi_copre_gli_estremi_su_intervallo_stretto",
        128,
        (any::<u32>(), 0i64..100),
        |(seed, min)| {
            let stimuli = generate_pvt(&params(400, min, 3), &mut mulberry32(seed));
            let seen: std::collections::BTreeSet<i64> = stimuli.iter().map(|s| s.isi_ms).collect();
            prop_assert_eq!(seen.len(), 4);
            Ok(())
        },
    );
    run_prop(
        TEST,
        "metriche_coerenti",
        256,
        prop::collection::vec(arbitrary_trial(), 0..120),
        |trials| {
            let metrics = score_pvt(&trials);
            prop_assert_eq!(metrics.len(), 11);
            let value = |i: usize| {
                metrics[i]
                    .value
                    .to_string()
                    .parse::<f64>()
                    .unwrap_or(f64::NAN)
            };
            let (lapses, rate) = (value(0), value(1));
            prop_assert!((0.0..=100.0).contains(&rate));
            let omissions = trials
                .iter()
                .filter(|t| t.flag == ValidationFlag::Omission)
                .count() as f64;
            prop_assert!(lapses >= omissions);
            prop_assert_eq!(value(10), omissions);
            prop_assert!(
                value(7) <= value(8) + 1e-9,
                "media fastest 10% <= slowest 10%"
            );
            Ok(())
        },
    );
}
