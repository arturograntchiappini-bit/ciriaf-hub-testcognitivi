//! Invarianti property-based del Corsi: sequenze valide, distinte, a pari incroci, deterministiche.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::corsi::*;
use std::collections::HashSet;

const TEST: &str = "corsi";

fn params(complexity_tolerance: f64) -> Params {
    Params {
        start_length: 3,
        max_length: 9,
        trials_per_level: 2,
        present_ms_per_block: 1000.0,
        complexity_tolerance,
    }
}

fn level(seed: u32, length: usize, tolerance: f64) -> Vec<Sequence> {
    generate_balanced_sequences(
        length,
        2,
        &params(tolerance),
        &mut mulberry32(seed),
        &CORSI_BLOCKS,
    )
}

fn canonical(seq: &[usize]) -> Vec<usize> {
    let reversed: Vec<usize> = seq.iter().rev().copied().collect();
    seq.to_vec().min(reversed)
}

#[test]
fn should_hold_corsi_invariants() {
    let strategy = (
        any::<u32>(),
        2usize..=9,
        prop_oneof![Just(8.0), Just(2.0), Just(0.5), Just(100.0)],
    );
    run_prop(
        TEST,
        "sequenze_valide_blocchi_distinti_nel_layout",
        128,
        strategy.clone(),
        |(seed, length, tol)| {
            let sequences = level(seed, length, tol);
            prop_assert_eq!(sequences.len(), 2);
            for s in &sequences {
                prop_assert_eq!(s.indices.len(), length);
                prop_assert!(s.indices.iter().all(|&i| i < CORSI_BLOCKS.len()));
                prop_assert_eq!(
                    s.indices.iter().collect::<HashSet<_>>().len(),
                    length,
                    "nessun blocco ripetuto"
                );
                prop_assert!((s.path_length - path_length(&s.indices, &CORSI_BLOCKS)).abs() < 1e-9);
                prop_assert_eq!(s.crossings, count_crossings(&s.indices, &CORSI_BLOCKS));
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "due_sequenze_distinte_anche_per_rovescio",
        128,
        strategy.clone(),
        |(seed, length, tol)| {
            let sequences = level(seed, length, tol);
            prop_assert_ne!(
                canonical(&sequences[0].indices),
                canonical(&sequences[1].indices)
            );
            Ok(())
        },
    );
    run_prop(
        TEST,
        "determinismo_a_parita_di_seme",
        128,
        strategy,
        |(seed, length, tol)| {
            prop_assert_eq!(level(seed, length, tol), level(seed, length, tol));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "pari_incroci_con_banda_ampia",
        128,
        (any::<u32>(), 3usize..=9),
        |(seed, length)| {
            let sequences = level(seed, length, 100.0);
            prop_assert_eq!(sequences[0].crossings, sequences[1].crossings);
            Ok(())
        },
    );
    run_prop(
        TEST,
        "entro_la_tolleranza_dal_bersaglio_nel_caso_normale",
        128,
        (any::<u32>(), 3usize..=9),
        |(seed, length)| {
            let target = target_path_length(length, &CORSI_BLOCKS);
            let sequences = level(seed, length, 8.0);
            let both_in_band = sequences
                .iter()
                .all(|s| (s.path_length - target).abs() <= 8.0);
            if both_in_band {
                prop_assert_eq!(sequences[0].crossings, sequences[1].crossings);
                prop_assert!(
                    (sequences[0].path_length - sequences[1].path_length).abs() <= 8.0 + 1e-9
                );
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "percorso_invariante_per_rovescio",
        128,
        (any::<u32>(), 2usize..=9),
        |(seed, length)| {
            let s = &level(seed, length, 8.0)[0];
            let reversed: Vec<usize> = s.indices.iter().rev().copied().collect();
            prop_assert!((path_length(&reversed, &CORSI_BLOCKS) - s.path_length).abs() < 1e-9);
            prop_assert_eq!(count_crossings(&reversed, &CORSI_BLOCKS), s.crossings);
            Ok(())
        },
    );
}
