//! Validazione automatica dei tempi di reazione e statistiche di base (porta `src/engine/validation.ts`).
//!
//! Precedenza dei flag: INTERRUPTED → OMISSION → ANTICIPATION → VALID.
//! I trial invalidati NON vengono scartati: restano nei dati grezzi col loro flag.
use crate::types::{Phase, TrialResult, ValidationFlag};

/// Soglia di anticipazione: un RT inferiore è un riflesso/anticipazione (Whelan, 2008).
pub const ANTICIPATION_CUTOFF_MS: f64 = 150.0;

/// Classifica un trial in base a RT ed esito temporale.
pub fn classify_rt(rt_ms: Option<f64>, responded: bool, interrupted: bool) -> ValidationFlag {
    if interrupted {
        return ValidationFlag::Interrupted;
    }
    match rt_ms {
        Some(rt) if responded => {
            if rt < ANTICIPATION_CUTOFF_MS {
                ValidationFlag::Anticipation
            } else {
                ValidationFlag::Valid
            }
        }
        _ => ValidationFlag::Omission,
    }
}

/// Media aritmetica; 0 su lista vuota.
pub fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

/// Deviazione standard campionaria (n-1); 0 se n < 2.
pub fn standard_deviation(values: &[f64]) -> f64 {
    let n = values.len();
    if n < 2 {
        return 0.0;
    }
    let m = mean(values);
    let sum_sq: f64 = values.iter().map(|v| (v - m) * (v - m)).sum();
    (sum_sq / (n - 1) as f64).sqrt()
}

/// RT dei soli trial VALID e corretti di test (esclude pratica).
pub fn valid_correct_rts(trials: &[TrialResult]) -> Vec<f64> {
    trials
        .iter()
        .filter(|t| t.phase == Phase::Test && t.flag == ValidationFlag::Valid && t.correct)
        .filter_map(|t| t.rt_ms)
        .collect()
}

/// Media degli RT dei trial VALID corretti.
pub fn mean_rt_of_valid_correct(trials: &[TrialResult]) -> f64 {
    mean(&valid_correct_rts(trials))
}

/// Deviazione standard campionaria degli RT dei trial VALID corretti.
pub fn sd_rt_of_valid_correct(trials: &[TrialResult]) -> f64 {
    standard_deviation(&valid_correct_rts(trials))
}

/// Conta i trial di test con un dato flag.
pub fn count_flag(trials: &[TrialResult], flag: ValidationFlag) -> usize {
    trials
        .iter()
        .filter(|t| t.phase == Phase::Test && t.flag == flag)
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::TestId;

    fn trial(phase: Phase, flag: ValidationFlag, correct: bool, rt: Option<f64>) -> TrialResult {
        TrialResult {
            test_id: TestId::Stroop1,
            session_id: "S".into(),
            trial_index: 0,
            phase,
            condition: "c".into(),
            stimulus: "s".into(),
            response: None,
            correct,
            rt_ms: rt,
            flag,
            onset_timestamp: 0.0,
        }
    }

    #[test]
    fn should_classify_with_documented_precedence() {
        assert_eq!(
            classify_rt(Some(300.0), true, true),
            ValidationFlag::Interrupted
        );
        assert_eq!(classify_rt(None, false, false), ValidationFlag::Omission);
        assert_eq!(classify_rt(None, true, false), ValidationFlag::Omission);
        assert_eq!(
            classify_rt(Some(149.0), true, false),
            ValidationFlag::Anticipation
        );
        assert_eq!(classify_rt(Some(150.0), true, false), ValidationFlag::Valid);
    }

    #[test]
    fn should_compute_mean_and_sample_sd() {
        assert_eq!(mean(&[]), 0.0);
        assert_eq!(mean(&[1.0, 2.0, 3.0]), 2.0);
        assert_eq!(standard_deviation(&[5.0]), 0.0);
        assert!(
            (standard_deviation(&[2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]) - 2.138089935299395)
                .abs()
                < 1e-12
        );
    }

    #[test]
    fn should_use_only_valid_correct_test_trials() {
        let trials = vec![
            trial(Phase::Test, ValidationFlag::Valid, true, Some(300.0)),
            trial(Phase::Test, ValidationFlag::Valid, true, Some(500.0)),
            trial(Phase::Practice, ValidationFlag::Valid, true, Some(900.0)),
            trial(Phase::Test, ValidationFlag::Valid, false, Some(900.0)),
            trial(Phase::Test, ValidationFlag::Omission, false, None),
        ];
        assert_eq!(mean_rt_of_valid_correct(&trials), 400.0);
        assert!(sd_rt_of_valid_correct(&trials) > 0.0);
        assert_eq!(count_flag(&trials, ValidationFlag::Omission), 1);
        assert_eq!(count_flag(&trials, ValidationFlag::Valid), 3);
    }
}
