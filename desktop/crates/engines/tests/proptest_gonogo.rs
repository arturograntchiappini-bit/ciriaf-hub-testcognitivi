//! Invarianti del generatore Go/No-Go su semi e parametri arbitrari.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::defaults::all_params;
use sintropia_engines::gonogo::{generate_go_nogo, GoNoGoKind, GoNoGoParams, GoNoGoStimulus};

const CASES: u32 = 256;

fn params(n_trials: u32, go_ratio: f64, isi: (u32, u32)) -> GoNoGoParams {
    GoNoGoParams {
        n_trials,
        go_ratio,
        isi_min_ms: isi.0,
        isi_max_ms: isi.1,
        ..all_params().gonogo
    }
}

fn generate(n_trials: u32, go_ratio: f64, isi: (u32, u32), seed: u32) -> Vec<GoNoGoStimulus> {
    generate_go_nogo(&params(n_trials, go_ratio, isi), &mut mulberry32(seed))
}

fn expected_go(n_trials: u32, go_ratio: f64) -> usize {
    (f64::from(n_trials) * go_ratio + 0.5).floor() as usize
}

fn isi_range() -> impl Strategy<Value = (u32, u32)> {
    (0u32..2000, 0u32..2000).prop_map(|(a, b)| (a.min(b), a.max(b)))
}

#[test]
fn should_produce_exact_go_nogo_counts_for_any_ratio_and_terminate() {
    run_prop(
        "gonogo",
        "conteggi_go_nogo_esatti",
        CASES,
        (0u32..300, 0.0f64..=1.0, any::<u32>()),
        |(n, ratio, seed)| {
            let sequence = generate(n, ratio, (500, 1000), seed);
            let go = sequence.iter().filter(|s| s.kind == GoNoGoKind::Go).count();
            prop_assert_eq!(sequence.len(), n as usize);
            prop_assert_eq!(go, expected_go(n, ratio));
            Ok(())
        },
    );
}

#[test]
fn should_start_with_go_and_limit_nogo_runs_to_two_when_nogo_do_not_outnumber_go() {
    run_prop(
        "gonogo",
        "primo_go_e_run_nogo_max_2",
        CASES,
        (1u32..300, 0.5f64..=1.0, any::<u32>()),
        |(n, ratio, seed)| {
            let sequence = generate(n, ratio, (500, 1000), seed);
            if expected_go(n, ratio) > 0 {
                prop_assert_eq!(sequence[0].kind, GoNoGoKind::Go);
            }
            for window in sequence.windows(3) {
                prop_assert!(
                    !window.iter().all(|s| s.kind == GoNoGoKind::Nogo),
                    "tre No-Go consecutivi"
                );
            }
            Ok(())
        },
    );
}

#[test]
fn should_draw_isi_within_the_configured_interval() {
    run_prop(
        "gonogo",
        "isi_nell_intervallo",
        CASES,
        (0u32..200, 0.5f64..=1.0, isi_range(), any::<u32>()),
        |(n, ratio, isi, seed)| {
            let sequence = generate(n, ratio, isi, seed);
            prop_assert!(sequence.iter().all(|s| (isi.0..=isi.1).contains(&s.isi_ms)));
            Ok(())
        },
    );
}

#[test]
fn should_be_deterministic_for_equal_seed_and_params() {
    run_prop(
        "gonogo",
        "determinismo_a_parita_di_seme",
        CASES,
        (0u32..200, 0.0f64..=1.0, any::<u32>()),
        |(n, ratio, seed)| {
            prop_assert_eq!(
                generate(n, ratio, (500, 1000), seed),
                generate(n, ratio, (500, 1000), seed)
            );
            Ok(())
        },
    );
}
