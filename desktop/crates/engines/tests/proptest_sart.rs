//! Invarianti del generatore SART su semi e parametri arbitrari.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::defaults::all_params;
use sintropia_engines::sart::{
    generate_sart, SartParams, SartStimulus, SART_DIGITS, SART_FONT_SIZES_PX,
};

const CASES: u32 = 256;

fn generate(n_trials: u32, seed: u32) -> Vec<SartStimulus> {
    generate_sart(
        &SartParams {
            n_trials,
            ..all_params().sart
        },
        &mut mulberry32(seed),
    )
}

fn digit_counts(sequence: &[SartStimulus]) -> Vec<usize> {
    SART_DIGITS
        .iter()
        .map(|d| sequence.iter().filter(|s| s.digit == *d).count())
        .collect()
}

#[test]
fn should_present_each_digit_the_same_number_of_times_plus_a_random_remainder() {
    run_prop(
        "sart",
        "cifre_bilanciate",
        CASES,
        (0u32..500, any::<u32>()),
        |(n, seed)| {
            let sequence = generate(n, seed);
            let counts = digit_counts(&sequence);
            let base = (n / 9) as usize;
            prop_assert_eq!(sequence.len(), n as usize);
            prop_assert!(
                counts.iter().all(|c| *c == base || *c == base + 1),
                "conteggi {counts:?}"
            );
            Ok(())
        },
    );
}

#[test]
fn should_present_exactly_n_over_nine_targets_when_n_is_a_multiple_of_nine() {
    run_prop(
        "sart",
        "bersagli_nel_numero_atteso",
        CASES,
        (1u32..60, 1u32..=9, any::<u32>()),
        |(k, target, seed)| {
            let sequence = generate(k * 9, seed);
            let targets = sequence.iter().filter(|s| s.digit == target).count();
            prop_assert_eq!(targets, k as usize);
            Ok(())
        },
    );
}

#[test]
fn should_never_repeat_the_same_digit_twice_in_a_row() {
    run_prop(
        "sart",
        "nessuna_ripetizione_immediata",
        CASES,
        (0u32..500, any::<u32>()),
        |(n, seed)| {
            let sequence = generate(n, seed);
            prop_assert!(
                sequence.windows(2).all(|w| w[0].digit != w[1].digit),
                "cifra ripetuta"
            );
            Ok(())
        },
    );
}

#[test]
fn should_balance_font_sizes_and_keep_indices_in_range() {
    run_prop(
        "sart",
        "corpi_del_carattere_bilanciati",
        CASES,
        (0u32..500, any::<u32>()),
        |(n, seed)| {
            let sequence = generate(n, seed);
            let sizes = SART_FONT_SIZES_PX.len();
            let base = n as usize / sizes;
            for index in 0..sizes {
                let used = sequence.iter().filter(|s| s.size_index == index).count();
                prop_assert!(
                    used == base || used == base + 1,
                    "corpo {index} usato {used} volte"
                );
            }
            Ok(())
        },
    );
}

#[test]
fn should_be_deterministic_for_equal_seed_and_params() {
    run_prop(
        "sart",
        "determinismo_a_parita_di_seme",
        CASES,
        (0u32..300, any::<u32>()),
        |(n, seed)| {
            prop_assert_eq!(generate(n, seed), generate(n, seed));
            Ok(())
        },
    );
}
