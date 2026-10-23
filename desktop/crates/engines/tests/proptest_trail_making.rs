//! Invarianti del generatore Trail Making su semi e dimensioni arbitrari.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::corsi::js_hypot;
use sintropia_engines::trail_making::{
    generate_trail, trail_labels, TrailCircle, TrailPart, MARGIN, MIN_DISTANCE,
};

const CASES: u32 = 256;
/// Fino a questo numero di cerchi l'estrazione casuale riesce sempre a rispettare la distanza minima; oltre,
/// il ripiego su griglia del TS non guarda i punti già estratti (vedi DIVERGENZE.md, Trail Making punto 1).
const MAX_RANDOM_PLACEMENT: usize = 30;

fn parts() -> impl Strategy<Value = TrailPart> {
    prop_oneof![Just(TrailPart::A), Just(TrailPart::B)]
}

fn generate(part: TrailPart, n: usize, seed: u32) -> Vec<TrailCircle> {
    generate_trail(part, n, &mut mulberry32(seed))
}

#[test]
fn should_keep_minimum_distance_between_circles() {
    run_prop(
        "trail_making",
        "distanza_minima_fra_i_centri",
        CASES,
        (parts(), 0usize..=MAX_RANDOM_PLACEMENT, any::<u32>()),
        |(part, n, seed)| {
            let circles = generate(part, n, seed);
            prop_assert_eq!(circles.len(), n);
            let inside = MARGIN..=1.0 - MARGIN;
            for (i, p) in circles.iter().enumerate() {
                prop_assert!(inside.contains(&p.x) && inside.contains(&p.y));
                for q in &circles[i + 1..] {
                    prop_assert!(js_hypot(p.x - q.x, p.y - q.y) >= MIN_DISTANCE);
                }
            }
            Ok(())
        },
    );
}

#[test]
fn should_keep_labels_in_connection_order() {
    run_prop(
        "trail_making",
        "etichette_in_ordine",
        CASES,
        (parts(), 0usize..=51, any::<u32>()),
        |(part, n, seed)| {
            let labels: Vec<String> = generate(part, n, seed)
                .into_iter()
                .map(|c| c.label)
                .collect();
            prop_assert_eq!(&labels, &trail_labels(part, n));
            if part == TrailPart::A {
                let expected: Vec<String> = (1..=n).map(|i| i.to_string()).collect();
                prop_assert_eq!(&labels, &expected);
            }
            Ok(())
        },
    );
}

#[test]
fn should_balance_numbers_and_letters_in_part_b() {
    run_prop(
        "trail_making",
        "bilanciamento_numeri_lettere",
        CASES,
        (0usize..=51, any::<u32>()),
        |(n, seed)| {
            let circles = generate(TrailPart::B, n, seed);
            let numbers = circles
                .iter()
                .filter(|c| c.label.parse::<u32>().is_ok())
                .count();
            prop_assert_eq!(numbers, n.div_ceil(2));
            prop_assert_eq!(circles.len() - numbers, n / 2);
            // Alternanza stretta: posizione pari = numero, dispari = lettera.
            for (i, c) in circles.iter().enumerate() {
                prop_assert_eq!(c.label.parse::<u32>().is_ok(), i % 2 == 0);
            }
            Ok(())
        },
    );
}

#[test]
fn should_be_deterministic_for_equal_seed() {
    run_prop(
        "trail_making",
        "determinismo_a_parita_di_seme",
        CASES,
        (parts(), 0usize..=51, any::<u32>()),
        |(part, n, seed)| {
            prop_assert_eq!(generate(part, n, seed), generate(part, n, seed));
            Ok(())
        },
    );
}
