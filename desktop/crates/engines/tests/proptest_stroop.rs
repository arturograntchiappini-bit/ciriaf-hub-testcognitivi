//! Invarianti del generatore Stroop su semi e parametri arbitrari.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::defaults::all_params;
use sintropia_engines::stroop::{generate_stroop, StroopParams, StroopStimulus, STROOP_COLORS};

const CASES: u32 = 256;

fn params(n_trials: u32) -> StroopParams {
    StroopParams {
        n_trials,
        ..all_params().stroop1
    }
}

fn generate(n_trials: u32, seed: u32) -> Vec<StroopStimulus> {
    generate_stroop(&params(n_trials), &mut mulberry32(seed))
}

#[test]
fn should_split_trials_half_congruent_half_incongruent() {
    run_prop(
        "stroop",
        "bilanciamento_congruenti_incongruenti",
        CASES,
        (0u32..300, any::<u32>()),
        |(n, seed)| {
            let sequence = generate(n, seed);
            let congruent = sequence.iter().filter(|s| s.congruent).count();
            prop_assert_eq!(sequence.len(), (n / 2 * 2) as usize);
            prop_assert_eq!(congruent, (n / 2) as usize);
            prop_assert!(sequence.iter().all(|s| s.congruent == (s.word == s.color)));
            Ok(())
        },
    );
}

#[test]
fn should_represent_every_color_evenly_among_congruent_trials() {
    run_prop(
        "stroop",
        "colori_equamente_rappresentati",
        CASES,
        (0u32..300, any::<u32>()),
        |(n, seed)| {
            let congruent: Vec<_> = generate(n, seed)
                .into_iter()
                .filter(|s| s.congruent)
                .collect();
            let counts: Vec<usize> = STROOP_COLORS
                .iter()
                .map(|c| congruent.iter().filter(|s| s.color == *c).count())
                .collect();
            let (min, max) = (
                counts.iter().min().copied().unwrap_or(0),
                counts.iter().max().copied().unwrap_or(0),
            );
            prop_assert!(max - min <= 1, "conteggi {counts:?}");
            Ok(())
        },
    );
}

#[test]
fn should_cycle_incongruent_word_color_pairs_evenly() {
    run_prop(
        "stroop",
        "coppie_incongruenti_bilanciate",
        CASES,
        (0u32..300, any::<u32>()),
        |(n, seed)| {
            let incongruent: Vec<_> = generate(n, seed)
                .into_iter()
                .filter(|s| !s.congruent)
                .collect();
            let mut counts = Vec::new();
            for word in STROOP_COLORS {
                for color in STROOP_COLORS.iter().filter(|c| **c != word) {
                    counts.push(
                        incongruent
                            .iter()
                            .filter(|s| s.word == word && s.color == *color)
                            .count(),
                    );
                }
            }
            let (min, max) = (
                counts.iter().min().copied().unwrap_or(0),
                counts.iter().max().copied().unwrap_or(0),
            );
            prop_assert!(max - min <= 1, "conteggi {counts:?}");
            Ok(())
        },
    );
}

#[test]
fn should_not_repeat_color_or_word_more_than_three_times_in_a_row() {
    run_prop(
        "stroop",
        "run_massimi_colore_parola",
        CASES,
        (0u32..65, any::<u32>()),
        |(n, seed)| {
            let sequence = generate(n, seed);
            for window in sequence.windows(4) {
                prop_assert!(
                    !window.iter().all(|s| s.color == window[0].color),
                    "colore ripetuto 4 volte"
                );
                prop_assert!(
                    !window.iter().all(|s| s.word == window[0].word),
                    "parola ripetuta 4 volte"
                );
            }
            Ok(())
        },
    );
}

#[test]
fn should_be_deterministic_for_equal_seed_and_params() {
    run_prop(
        "stroop",
        "determinismo_a_parita_di_seme",
        CASES,
        (0u32..200, any::<u32>()),
        |(n, seed)| {
            prop_assert_eq!(generate(n, seed), generate(n, seed));
            Ok(())
        },
    );
}
