//! Invarianti property-based del WCST: mazzo bilanciato su tutte le dimensioni, determinismo, scoring perseverativo coerente.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::wcst::*;
use std::collections::HashMap;

const TEST: &str = "wcst";

fn counts<K: std::hash::Hash + Eq>(items: impl Iterator<Item = K>) -> HashMap<K, usize> {
    let mut map = HashMap::new();
    for k in items {
        *map.entry(k).or_insert(0) += 1;
    }
    map
}

fn dim() -> impl Strategy<Value = Dim> {
    prop_oneof![Just(Dim::Color), Just(Dim::Shape), Just(Dim::Number)]
}

/// Passo casuale: regola attiva e sottoinsieme (anche vuoto) delle dimensioni combacianti.
fn step() -> impl Strategy<Value = (Dim, Vec<Dim>)> {
    (
        dim(),
        prop::sample::subsequence(vec![Dim::Color, Dim::Shape, Dim::Number], 0..=3),
    )
}

#[test]
fn should_hold_wcst_invariants() {
    run_prop(
        TEST,
        "mazzo_di_64_e_permutazione_delle_64_combinazioni",
        256,
        any::<u32>(),
        |seed| {
            let deck = build_deck(64, &mut mulberry32(seed));
            prop_assert_eq!(deck.len(), 64);
            prop_assert_eq!(
                counts(deck.iter()).len(),
                64,
                "tutte le combinazioni, una sola volta"
            );
            Ok(())
        },
    );
    run_prop(
        TEST,
        "bilanciamento_16_per_valore_su_ogni_dimensione",
        256,
        any::<u32>(),
        |seed| {
            let deck = build_deck(64, &mut mulberry32(seed));
            prop_assert!(counts(deck.iter().map(|c| c.color))
                .values()
                .all(|&n| n == 16));
            prop_assert!(counts(deck.iter().map(|c| c.shape))
                .values()
                .all(|&n| n == 16));
            prop_assert!(counts(deck.iter().map(|c| c.number))
                .values()
                .all(|&n| n == 16));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "mazzo_lungo_ripete_blocchi_da_64_bilanciati",
        128,
        (any::<u32>(), 1usize..=300),
        |(seed, size)| {
            let deck = build_deck(size, &mut mulberry32(seed));
            prop_assert_eq!(deck.len(), size);
            for block in deck.chunks_exact(64) {
                prop_assert_eq!(counts(block.iter()).len(), 64);
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "determinismo_a_parita_di_seme",
        128,
        (any::<u32>(), 0usize..=200),
        |(seed, size)| {
            prop_assert_eq!(
                build_deck(size, &mut mulberry32(seed)),
                build_deck(size, &mut mulberry32(seed))
            );
            Ok(())
        },
    );
    run_prop(
        TEST,
        "regole_cicliche_colore_forma_numero",
        64,
        0usize..1000,
        |category| {
            prop_assert_eq!(rule_for_category(category), WCST_RULE_ORDER[category % 3]);
            prop_assert_eq!(rule_for_category(category + 3), rule_for_category(category));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "perseverativi_non_oltre_errori_e_risposte",
        512,
        (prop::collection::vec(step(), 0..150), 1usize..=10),
        |(raw, run_to_shift)| {
            let rules: Vec<Dim> = raw.iter().map(|(rule, _)| *rule).collect();
            let steps: Vec<Step> = raw
                .into_iter()
                .map(|(rule, matched)| Step {
                    correct: matched.contains(&rule),
                    matched,
                })
                .collect();
            let out = count_perseveration(&steps, &rules, run_to_shift);
            let errors = steps.iter().filter(|s| !s.correct).count();
            prop_assert!(
                out.errors <= out.responses,
                "gli errori perseverativi sono un sottoinsieme delle risposte"
            );
            prop_assert!(out.errors <= errors);
            prop_assert!(out.responses <= steps.len());
            prop_assert_eq!(out, count_perseveration(&steps, &rules, run_to_shift));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "nessun_errore_nessuna_risposta_perseverativa",
        128,
        (prop::collection::vec(dim(), 0..100), 1usize..=10),
        |(rules, run_to_shift)| {
            let steps: Vec<Step> = rules
                .iter()
                .map(|&r| Step {
                    correct: true,
                    matched: vec![r],
                })
                .collect();
            let out = count_perseveration(&steps, &rules, run_to_shift);
            prop_assert_eq!((out.errors, out.responses), (0, 0));
            Ok(())
        },
    );
}
