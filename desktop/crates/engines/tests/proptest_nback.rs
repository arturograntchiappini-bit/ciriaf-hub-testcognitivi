//! Invarianti property-based dell'N-Back: nessun target nelle prime n, target e lure nel numero atteso, determinismo.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_core::types::js_round;
use sintropia_engines::nback::*;

const TEST: &str = "nback";

fn params(n: usize, n_trials: usize, target_rate: f64, lure_rate: Option<f64>) -> Params {
    Params {
        n,
        letter_ms: 500.0,
        blank_ms: 1500.0,
        n_trials,
        target_rate,
        lure_rate,
        practice_trials: 0,
    }
}

/// n, nTrials, targetRate (<= 0.5: sempre realizzabile), lureRate assente o in [0, 1].
fn config() -> impl Strategy<Value = (u32, Params)> {
    (
        any::<u32>(),
        1usize..=4,
        10usize..=240,
        0.0..=0.5_f64,
        prop::option::of(0.0..=1.0_f64),
    )
        .prop_map(|(seed, n, trials, rate, lure)| (seed, params(n, trials.max(n + 8), rate, lure)))
}

fn lag_letters(stimuli: &[Stimulus], i: usize, n: usize) -> Vec<char> {
    [n.wrapping_sub(1), n + 1]
        .into_iter()
        .filter(|&lag| lag > 0 && i >= lag)
        .map(|lag| stimuli[i - lag].letter)
        .collect()
}

#[test]
fn should_hold_nback_invariants() {
    run_prop(
        TEST,
        "lunghezza_e_alfabeto_di_consonanti",
        256,
        config(),
        |(seed, p)| {
            let stimuli = generate_nback(&p, &mut mulberry32(seed));
            prop_assert_eq!(stimuli.len(), p.n_trials);
            prop_assert!(stimuli.iter().all(|s| NBACK_LETTERS.contains(&s.letter)));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "nessun_target_nelle_prime_n_posizioni",
        256,
        config(),
        |(seed, p)| {
            let stimuli = generate_nback(&p, &mut mulberry32(seed));
            prop_assert!(stimuli.iter().take(p.n).all(|s| !s.is_target && !s.is_lure));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "target_se_e_solo_se_lettera_uguale_a_n_prima",
        256,
        config(),
        |(seed, p)| {
            let stimuli = generate_nback(&p, &mut mulberry32(seed));
            for i in 0..stimuli.len() {
                let repeats = i >= p.n && stimuli[i].letter == stimuli[i - p.n].letter;
                prop_assert_eq!(stimuli[i].is_target, repeats, "posizione {}", i);
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "numero_di_target_atteso",
        256,
        config(),
        |(seed, p)| {
            let stimuli = generate_nback(&p, &mut mulberry32(seed));
            let expected = js_round((p.n_trials - p.n) as f64 * p.target_rate) as usize;
            prop_assert_eq!(stimuli.iter().filter(|s| s.is_target).count(), expected);
            Ok(())
        },
    );
    run_prop(
        TEST,
        "lure_solo_su_non_target_a_lag_n_meno_1_o_n_piu_1",
        256,
        config(),
        |(seed, p)| {
            let stimuli = generate_nback(&p, &mut mulberry32(seed));
            for (i, s) in stimuli.iter().enumerate().filter(|(_, s)| s.is_lure) {
                prop_assert!(!s.is_target);
                prop_assert!(lag_letters(&stimuli, i, p.n).contains(&s.letter));
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "numero_di_lure_non_oltre_la_quota_pianificata",
        256,
        config(),
        |(seed, p)| {
            let stimuli = generate_nback(&p, &mut mulberry32(seed));
            let targets = stimuli.iter().filter(|s| s.is_target).count();
            let non_targets = p.n_trials - p.n - targets;
            let planned = js_round(non_targets as f64 * p.lure_rate.unwrap_or(0.0)) as usize;
            prop_assert!(stimuli.iter().filter(|s| s.is_lure).count() <= planned);
            Ok(())
        },
    );
    run_prop(
        TEST,
        "nessun_lure_con_lure_rate_zero_o_assente",
        256,
        (
            any::<u32>(),
            1usize..=4,
            20usize..=200,
            prop::option::of(Just(0.0_f64)),
        ),
        |(seed, n, trials, lure)| {
            let stimuli = generate_nback(&params(n, trials, 0.3, lure), &mut mulberry32(seed));
            prop_assert!(stimuli.iter().all(|s| !s.is_lure));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "determinismo_a_parita_di_seme",
        128,
        config(),
        |(seed, p)| {
            prop_assert_eq!(
                generate_nback(&p, &mut mulberry32(seed)),
                generate_nback(&p, &mut mulberry32(seed))
            );
            Ok(())
        },
    );
}
