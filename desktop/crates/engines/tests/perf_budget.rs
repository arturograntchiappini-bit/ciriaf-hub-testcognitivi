//! Regressioni grossolane di prestazioni (budget molto generosi, ~10x i valori misurati).
//! Sono `#[ignore]`: dipendono dalla macchina. Esegui con
//! `cargo test -p sintropia-engines --release --test perf_budget -- --ignored`.
//! Si usa il MINIMO su più ripetizioni per scartare il rumore di altri processi. Il budget è
//! quello della consegna: generazione di default < 5 ms, punteggio di 400 trial < 2 ms.
#![allow(dead_code)]
#[path = "../../../tools/bench/wasm/src/ops.rs"]
mod ops;

use sintropia_core::types::{Phase, TestId, TrialResult, ValidationFlag};
use sintropia_engines::corsi::score_corsi;
use sintropia_engines::flanker::score_flanker;
use sintropia_engines::gonogo::score_go_nogo;
use sintropia_engines::nback::score_nback;
use sintropia_engines::sart::score_sart;
use sintropia_engines::stroop::score_stroop;
use std::hint::black_box;
use std::time::{Duration, Instant};

const GENERATION_BUDGET: Duration = Duration::from_millis(5);
const SCORE_BUDGET: Duration = Duration::from_millis(2);
const REPETITIONS: usize = 20;

fn best_of(mut op: impl FnMut()) -> Duration {
    (0..REPETITIONS)
        .map(|_| {
            let start = Instant::now();
            op();
            start.elapsed()
        })
        .min()
        .unwrap_or_default()
}

fn trials(test_id: TestId, conditions: &[&str], stimulus: &str) -> Vec<TrialResult> {
    (0..400u32)
        .map(|i| TrialResult {
            test_id,
            session_id: "S-PERF".into(),
            trial_index: i,
            phase: Phase::Test,
            condition: conditions[i as usize % conditions.len()].into(),
            stimulus: stimulus.into(),
            response: (i % 7 != 0).then(|| "arrowleft".to_string()),
            correct: i % 5 != 0,
            rt_ms: (i % 7 != 0).then(|| 380.0 + f64::from(i % 90)),
            flag: if i % 7 == 0 {
                ValidationFlag::Omission
            } else {
                ValidationFlag::Valid
            },
            onset_timestamp: f64::from(i) * 1500.0,
        })
        .collect()
}

#[test]
#[ignore = "benchmark di regressione: eseguire in release con --ignored"]
fn should_generate_default_sequences_within_budget() {
    for test in ops::TESTS {
        let elapsed = best_of(|| {
            black_box(ops::generate(test, 1, false));
        });
        assert!(
            elapsed < GENERATION_BUDGET,
            "{test}.gen.default: {elapsed:?} >= {GENERATION_BUDGET:?}"
        );
    }
}

#[test]
#[ignore = "benchmark di regressione: eseguire in release con --ignored"]
fn should_score_400_trials_within_budget() {
    let cases: [(&str, Vec<TrialResult>, Box<dyn Fn(&[TrialResult]) -> usize>); 6] = [
        (
            "stroop",
            trials(TestId::Stroop1, &["congruent", "incongruent"], "ROSSO/BLU"),
            Box::new(|t| score_stroop(t).len()),
        ),
        (
            "gonogo",
            trials(TestId::Gonogo, &["go", "nogo"], "go"),
            Box::new(|t| score_go_nogo(t).len()),
        ),
        (
            "flanker",
            trials(
                TestId::Flanker,
                &["congruent", "incongruent", "neutral"],
                "←←→←←",
            ),
            Box::new(|t| score_flanker(t).len()),
        ),
        (
            "sart",
            trials(TestId::Sart, &["go", "nogo"], "5"),
            Box::new(|t| score_sart(t).len()),
        ),
        (
            "nback",
            trials(TestId::Nback, &["target", "nontarget", "lure"], "B"),
            Box::new(|t| score_nback(t, 4).len()),
        ),
        (
            "corsi",
            trials(TestId::Corsi, &["span"], "1-2-3-4-5"),
            Box::new(|t| score_corsi(t, 2.0).len()),
        ),
    ];
    for (name, input, score) in &cases {
        let elapsed = best_of(|| {
            black_box(score(black_box(input)));
        });
        assert!(
            elapsed < SCORE_BUDGET,
            "{name}.score.400: {elapsed:?} >= {SCORE_BUDGET:?}"
        );
    }
}
