//! Risultato sintetico (Stroop 1, 48 trial) per `--demo-results`: permette di vedere la schermata Risultati senza eseguire un test.
use serde_json::Map;
use sintropia_core::rng::mulberry32;
use sintropia_core::{Phase, TestId, TestResult, TrialResult, ValidationFlag};
use sintropia_engines::stroop::score_stroop;

const TRIALS: u32 = 48;

pub fn demo_result() -> TestResult {
    let mut rand = mulberry32(2024);
    let trials: Vec<TrialResult> = (0..TRIALS)
        .map(|i| {
            let congruent = i % 2 == 0;
            let base = if congruent { 520.0 } else { 640.0 };
            TrialResult {
                test_id: TestId::Stroop1,
                session_id: "DEMO".into(),
                trial_index: i,
                phase: Phase::Test,
                condition: if congruent {
                    "congruent"
                } else {
                    "incongruent"
                }
                .into(),
                stimulus: "ROSSO".into(),
                response: Some("r".into()),
                correct: rand() > 0.06,
                rt_ms: Some((base + rand() * 160.0).round()),
                flag: ValidationFlag::Valid,
                onset_timestamp: f64::from(i) * 1500.0,
            }
        })
        .collect();
    TestResult {
        test_id: TestId::Stroop1,
        session_id: "DEMO".into(),
        started_at: "2026-01-01T09:00:00.000Z".into(),
        params: Map::new(),
        summary: score_stroop(&trials),
        trials,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_build_a_result_with_metrics() {
        let r = demo_result();
        assert_eq!(r.trials.len(), TRIALS as usize);
        assert!(!r.summary.is_empty());
    }
}
