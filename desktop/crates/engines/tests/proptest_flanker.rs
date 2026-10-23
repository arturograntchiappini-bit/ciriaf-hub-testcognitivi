//! Invarianti del generatore Flanker su semi e parametri arbitrari.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::defaults::all_params;
use sintropia_engines::flanker::{
    build_arrows, generate_flanker, FlankerCondition, FlankerDirection, FlankerParams,
    FlankerStimulus,
};

const CASES: u32 = 256;

fn params(n_trials: u32, incongruent_ratio: f64, neutral_ratio: f64) -> FlankerParams {
    FlankerParams {
        n_trials,
        incongruent_ratio,
        neutral_ratio,
        ..all_params().flanker
    }
}

fn generate(p: &FlankerParams, seed: u32) -> Vec<FlankerStimulus> {
    generate_flanker(p, &mut mulberry32(seed))
}

fn js_round(x: f64) -> usize {
    (x + 0.5).floor() as usize
}

fn count(sequence: &[FlankerStimulus], condition: FlankerCondition) -> usize {
    sequence.iter().filter(|s| s.condition == condition).count()
}

#[test]
fn should_produce_exact_counts_per_condition() {
    run_prop(
        "flanker",
        "conteggi_per_condizione",
        CASES,
        (0u32..250, 0.0f64..=1.0, 0.0f64..=1.0, any::<u32>()),
        |(n, ir, nr, seed)| {
            let sequence = generate(&params(n, ir, nr), seed);
            let (incongruent, neutral) = (js_round(f64::from(n) * ir), js_round(f64::from(n) * nr));
            let congruent = (n as usize).saturating_sub(incongruent + neutral);
            prop_assert_eq!(count(&sequence, FlankerCondition::Incongruent), incongruent);
            prop_assert_eq!(count(&sequence, FlankerCondition::Neutral), neutral);
            prop_assert_eq!(count(&sequence, FlankerCondition::Congruent), congruent);
            Ok(())
        },
    );
}

#[test]
fn should_balance_directions_within_each_condition() {
    run_prop(
        "flanker",
        "direzioni_bilanciate_per_condizione",
        CASES,
        (0u32..250, 0.0f64..=1.0, 0.0f64..=1.0, any::<u32>()),
        |(n, ir, nr, seed)| {
            let sequence = generate(&params(n, ir, nr), seed);
            for condition in [
                FlankerCondition::Congruent,
                FlankerCondition::Incongruent,
                FlankerCondition::Neutral,
            ] {
                let side = |d| {
                    sequence
                        .iter()
                        .filter(|s| s.condition == condition && s.direction == d)
                        .count()
                };
                let (left, right) = (side(FlankerDirection::Left), side(FlankerDirection::Right));
                prop_assert!(
                    left.abs_diff(right) <= 1,
                    "{condition:?}: {left} sinistra, {right} destra"
                );
            }
            Ok(())
        },
    );
}

#[test]
fn should_build_arrows_consistent_with_condition_and_direction() {
    run_prop(
        "flanker",
        "frecce_coerenti_con_condizione",
        CASES,
        (0u32..150, 0.0f64..=1.0, 0.0f64..=1.0, any::<u32>()),
        |(n, ir, nr, seed)| {
            let sequence = generate(&params(n, ir, nr), seed);
            for s in &sequence {
                prop_assert_eq!(&s.arrows, &build_arrows(s.condition, s.direction));
                prop_assert_eq!(s.arrows.chars().count(), 5);
            }
            Ok(())
        },
    );
}

#[test]
fn should_limit_runs_of_condition_and_direction_to_three_for_typical_ratios() {
    run_prop(
        "flanker",
        "run_massimi_condizione_direzione",
        CASES,
        (30u32..200, 0.2f64..=0.4, 0.1f64..=0.3, any::<u32>()),
        |(n, ir, nr, seed)| {
            let sequence = generate(&params(n, ir, nr), seed);
            for window in sequence.windows(4) {
                prop_assert!(
                    !window.iter().all(|s| s.condition == window[0].condition),
                    "condizione ripetuta 4 volte"
                );
                prop_assert!(
                    !window.iter().all(|s| s.direction == window[0].direction),
                    "direzione ripetuta 4 volte"
                );
            }
            Ok(())
        },
    );
}

#[test]
fn should_draw_isi_within_the_configured_interval() {
    let interval = (0u32..2000, 0u32..2000).prop_map(|(a, b)| (a.min(b), a.max(b)));
    run_prop(
        "flanker",
        "isi_nell_intervallo",
        CASES,
        (0u32..150, interval, any::<u32>()),
        |(n, (lo, hi), seed)| {
            let p = FlankerParams {
                isi_min_ms: lo,
                isi_max_ms: hi,
                ..params(n, 0.4, 0.2)
            };
            prop_assert!(generate(&p, seed)
                .iter()
                .all(|s| (lo..=hi).contains(&s.isi_ms)));
            Ok(())
        },
    );
}

#[test]
fn should_be_deterministic_for_equal_seed_and_params() {
    run_prop(
        "flanker",
        "determinismo_a_parita_di_seme",
        CASES,
        (0u32..150, 0.0f64..=1.0, 0.0f64..=1.0, any::<u32>()),
        |(n, ir, nr, seed)| {
            let p = params(n, ir, nr);
            prop_assert_eq!(generate(&p, seed), generate(&p, seed));
            Ok(())
        },
    );
}
