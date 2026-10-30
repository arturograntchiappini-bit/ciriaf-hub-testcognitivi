//! SART — Sustained Attention to Response Task. Porta `src/engine/tests/sart.ts`.
//! Robertson et al. (1997); Manly et al. (1999); Dang et al. (2018). Vedi docs/scientific/sart.md
//!
//! Cifre 1–9 in sequenza pseudo-casuale: si risponde a tutte tranne alla cifra bersaglio (di norma
//! il 3). L'errore di commissione sul bersaglio è la misura chiave.
use serde::{Deserialize, Serialize};
use sintropia_core::rng::shuffle;
use sintropia_core::sdt::{criterion_c, d_prime};
use sintropia_core::types::{
    js_round, MetricValue, Phase, SummaryMetric, TrialResult, ValidationFlag,
};
use sintropia_core::validation::{mean, standard_deviation};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SartParams {
    /// Numero di trial; un multiplo di 9 assegna lo stesso numero di presentazioni a ogni cifra.
    pub n_trials: u32,
    /// Cifra da non rispondere (1–9).
    pub target_digit: u32,
    /// Durata della cifra (ms).
    pub digit_ms: u32,
    /// Durata della maschera che segue la cifra (ms): la finestra di risposta è digitMs + maskMs.
    pub mask_ms: u32,
    pub practice_trials: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SartStimulus {
    pub digit: u32,
    /// Indice in `SART_FONT_SIZES_PX`: il corpo varia per scoraggiare il confronto percettivo con una sagoma.
    pub size_index: usize,
}

pub const SART_DIGITS: [u32; 9] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/// Cinque corpi del carattere (px): convenzione dei porting pubblici del compito (PsyToolkit).
pub const SART_FONT_SIZES_PX: [u32; 5] = [48, 72, 94, 100, 120];

/// Trial di una sequenza valutati prima di un errore di commissione (scelta di progetto).
pub const PRE_ERROR_WINDOW: usize = 4;

const ARRANGE_ATTEMPTS: u32 = 500;

/// Sequenza: ogni cifra compare lo stesso numero di volte (le cifre in più sono estratte a caso),
/// mai due cifre uguali di seguito, corpi del carattere bilanciati.
pub fn generate_sart(params: &SartParams, rand: &mut dyn FnMut() -> f64) -> Vec<SartStimulus> {
    let counts = digit_counts(params.n_trials as usize, rand);
    let digits = arrange_digits(&counts, rand);
    let sizes: Vec<usize> = (0..digits.len())
        .map(|i| i % SART_FONT_SIZES_PX.len())
        .collect();
    let sizes = shuffle(&sizes, rand);
    digits
        .into_iter()
        .zip(sizes)
        .map(|(digit, size_index)| SartStimulus { digit, size_index })
        .collect()
}

/// (cifra, presentazioni) in ordine di cifra.
fn digit_counts(n_trials: usize, rand: &mut dyn FnMut() -> f64) -> Vec<(u32, usize)> {
    let base = n_trials / SART_DIGITS.len();
    let extra = n_trials - base * SART_DIGITS.len();
    let extras: Vec<u32> = shuffle(&SART_DIGITS, rand)
        .into_iter()
        .take(extra)
        .collect();
    SART_DIGITS
        .iter()
        .map(|&d| (d, base + usize::from(extras.contains(&d))))
        .collect()
}

/// Dispone le cifre senza ripetizioni immediate; ritenta se resta solo la cifra appena usata.
fn arrange_digits(counts: &[(u32, usize)], rand: &mut dyn FnMut() -> f64) -> Vec<u32> {
    for _ in 0..ARRANGE_ATTEMPTS {
        if let Some(sequence) = try_arrange(counts, rand) {
            return sequence;
        }
    }
    let flat: Vec<u32> = counts
        .iter()
        .flat_map(|&(digit, n)| std::iter::repeat_n(digit, n))
        .collect();
    separate_repeats(shuffle(&flat, rand))
}

fn try_arrange(counts: &[(u32, usize)], rand: &mut dyn FnMut() -> f64) -> Option<Vec<u32>> {
    let mut left = counts.to_vec();
    let total: usize = counts.iter().map(|&(_, n)| n).sum();
    let mut sequence: Vec<u32> = Vec::with_capacity(total);
    for _ in 0..total {
        let previous = sequence.last().copied();
        let options: Vec<(usize, usize)> = left
            .iter()
            .enumerate()
            .filter(|(_, &(digit, n))| n > 0 && Some(digit) != previous)
            .map(|(slot, &(_, n))| (slot, n))
            .collect();
        let weight: usize = options.iter().map(|&(_, n)| n).sum();
        if weight == 0 {
            return None;
        }
        let mut ticket = rand() * weight as f64;
        let picked = options
            .iter()
            .find(|&&(_, n)| {
                ticket -= n as f64;
                ticket < 0.0
            })
            .or(options.last())
            .map(|&(slot, _)| slot)?;
        sequence.push(left[picked].0);
        left[picked].1 -= 1;
    }
    Some(sequence)
}

/// Ripiego: scambia ogni cifra uguale alla precedente con una successiva diversa, se esiste.
fn separate_repeats(mut sequence: Vec<u32>) -> Vec<u32> {
    for i in 1..sequence.len() {
        if sequence[i] != sequence[i - 1] {
            continue;
        }
        let next = sequence.get(i + 1).copied();
        let swap = (i + 1..sequence.len())
            .find(|&j| sequence[j] != sequence[i] && Some(sequence[j]) != next);
        if let Some(j) = swap {
            sequence.swap(i, j);
        }
    }
    sequence
}

/// Il partecipante ha premuto (anche in anticipo). Si guarda la risposta registrata, non il flag:
/// il sequencer marca VALID anche un No-Go correttamente trattenuto (nessuna risposta).
fn is_responded(t: &TrialResult) -> bool {
    t.response.is_some() && t.flag != ValidationFlag::Interrupted
}

fn is_valid_trial(t: &TrialResult) -> bool {
    t.flag != ValidationFlag::Interrupted
}

fn is_usable_go_rt(t: &TrialResult) -> bool {
    t.condition == "go" && t.flag == ValidationFlag::Valid && t.correct && t.rt_ms.is_some()
}

/// RT dei Go nei `window` trial che precedono ciascuna commissione (Robertson et al., 1997: gli errori
/// sono preceduti da risposte anormalmente veloci). Un trial vicino a più errori conta una volta sola.
pub fn reaction_times_before_commissions<'a>(
    trials: impl IntoIterator<Item = &'a TrialResult>,
    window: usize,
) -> Vec<f64> {
    reaction_times_before_commissions_refs(&trials.into_iter().collect::<Vec<_>>(), window)
}

fn reaction_times_before_commissions_refs(trials: &[&TrialResult], window: usize) -> Vec<f64> {
    let mut picked: Vec<usize> = Vec::new();
    for (i, t) in trials.iter().enumerate() {
        if t.condition != "nogo" || !is_responded(t) {
            continue;
        }
        let from = i.saturating_sub(window);
        for (k, candidate) in trials.iter().enumerate().take(i).skip(from) {
            if is_usable_go_rt(candidate) && !picked.contains(&k) {
                picked.push(k);
            }
        }
    }
    picked.into_iter().filter_map(|k| trials[k].rt_ms).collect()
}

fn rate(count: usize, total: usize) -> f64 {
    if total > 0 {
        count as f64 / total as f64 * 100.0
    } else {
        0.0
    }
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn round2(x: f64) -> f64 {
    js_round(x * 100.0) / 100.0
}

fn num(label: &str, value: f64, unit: Option<&str>) -> SummaryMetric {
    SummaryMetric::new(label, MetricValue::Num(value), unit)
}

/// Metrica con trattino lungo (senza unità) quando il valore non è calcolabile.
fn num_or_dash(label: String, value: Option<f64>, unit: &str) -> SummaryMetric {
    match value {
        Some(v) => num(&label, round1(v), Some(unit)),
        None => SummaryMetric::new(label, "—", None),
    }
}

/// Metriche: commissioni e omissioni, RT medio/SD/CV dei Go, d' e criterio c (hit = risposta a un Go,
/// falso allarme = risposta al bersaglio), RT prima delle commissioni. I trial interrotti sono esclusi
/// da numeratori e denominatori.
pub fn score_sart(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let test: Vec<&TrialResult> = trials.iter().filter(|t| t.phase == Phase::Test).collect();
    let of_condition = |condition: &str| -> Vec<&TrialResult> {
        test.iter()
            .copied()
            .filter(|t| t.condition == condition && is_valid_trial(t))
            .collect()
    };
    let go_trials = of_condition("go");
    let target_trials = of_condition("nogo");

    let hits = go_trials.iter().filter(|t| is_responded(t)).count();
    let commissions = target_trials.iter().filter(|t| is_responded(t)).count();
    let omissions = go_trials.len() - hits;

    let go_rts: Vec<f64> = test
        .iter()
        .copied()
        .filter(|t| is_usable_go_rt(t))
        .filter_map(|t| t.rt_ms)
        .collect();
    let mean_go = mean(&go_rts);
    let sd_go = standard_deviation(&go_rts);
    let pre_error_rts = reaction_times_before_commissions_refs(&test, PRE_ERROR_WINDOW);
    let has_pre_error = !pre_error_rts.is_empty() && !go_rts.is_empty();
    let pre_error_mean = has_pre_error.then(|| mean(&pre_error_rts));
    let cv_go = if mean_go > 0.0 {
        sd_go / mean_go * 100.0
    } else {
        0.0
    };
    let (h, g, fa, nt) = (
        hits as f64,
        go_trials.len() as f64,
        commissions as f64,
        target_trials.len() as f64,
    );

    vec![
        num(
            "Errori di commissione (bersaglio)",
            commissions as f64,
            None,
        ),
        num(
            "Tasso di commissione",
            round1(rate(commissions, target_trials.len())),
            Some("%"),
        ),
        num("Errori di omissione (cifre Go)", omissions as f64, None),
        num(
            "Tasso di omissione",
            round1(rate(omissions, go_trials.len())),
            Some("%"),
        ),
        num("RT medio Go", round1(mean_go), Some("ms")),
        num("SD RT Go", round1(sd_go), Some("ms")),
        num("CV RT Go", round1(cv_go), Some("%")),
        num("Sensibilità d'", round2(d_prime(h, g, fa, nt)), None),
        num(
            "Criterio decisionale (c)",
            round2(criterion_c(h, g, fa, nt)),
            None,
        ),
        num_or_dash(
            format!("RT medio nei {PRE_ERROR_WINDOW} Go prima di una commissione"),
            pre_error_mean,
            "ms",
        ),
        num_or_dash(
            "Variazione di RT prima delle commissioni (vs RT medio Go)".to_string(),
            pre_error_mean.map(|m| m - mean_go),
            "ms",
        ),
        num(
            "Errori di anticipazione",
            test.iter()
                .filter(|t| t.flag == ValidationFlag::Anticipation)
                .count() as f64,
            None,
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::TestId;

    fn params() -> SartParams {
        SartParams {
            n_trials: 225,
            target_digit: 3,
            digit_ms: 250,
            mask_ms: 900,
            practice_trials: 18,
        }
    }

    fn trial(index: u32, condition: &str, rt: Option<f64>) -> TrialResult {
        let responded = rt.is_some();
        let go = condition == "go";
        TrialResult {
            test_id: TestId::Sart,
            session_id: "T-0000".into(),
            trial_index: index,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: if go { "5" } else { "3" }.into(),
            response: responded.then(|| " ".to_string()),
            correct: if go { responded } else { !responded },
            rt_ms: rt,
            flag: if !responded && go {
                ValidationFlag::Omission
            } else {
                ValidationFlag::Valid
            },
            onset_timestamp: 0.0,
        }
    }

    fn metric(trials: &[TrialResult], prefix: &str) -> MetricValue {
        score_sart(trials)
            .into_iter()
            .find(|m| m.label.starts_with(prefix))
            .unwrap()
            .value
    }

    fn n(v: f64) -> MetricValue {
        MetricValue::Num(v)
    }

    #[test]
    fn should_present_each_digit_25_times_with_225_trials() {
        let seq = generate_sart(&params(), &mut mulberry32(1));
        assert_eq!(seq.len(), 225);
        for digit in SART_DIGITS {
            assert_eq!(seq.iter().filter(|s| s.digit == digit).count(), 25);
        }
    }

    #[test]
    fn should_never_repeat_the_same_digit_twice_in_a_row() {
        for seed in [1, 2, 3, 42, 99, 2026] {
            let seq = generate_sart(&params(), &mut mulberry32(seed));
            assert!(seq.windows(2).all(|w| w[0].digit != w[1].digit));
        }
    }

    #[test]
    fn should_balance_the_five_font_sizes() {
        let seq = generate_sart(&params(), &mut mulberry32(5));
        for size in 0..SART_FONT_SIZES_PX.len() {
            assert_eq!(seq.iter().filter(|s| s.size_index == size).count(), 45);
        }
    }

    #[test]
    fn should_spread_the_remainder_when_trials_are_not_a_multiple_of_nine() {
        let p = SartParams {
            n_trials: 20,
            ..params()
        };
        let seq = generate_sart(&p, &mut mulberry32(8));
        let counts: Vec<usize> = SART_DIGITS
            .iter()
            .map(|&d| seq.iter().filter(|s| s.digit == d).count())
            .collect();
        assert_eq!(seq.len(), 20);
        assert!(counts.iter().max().unwrap() - counts.iter().min().unwrap() <= 1);
    }

    #[test]
    fn should_be_deterministic_for_the_same_seed() {
        assert_eq!(
            generate_sart(&params(), &mut mulberry32(7)),
            generate_sart(&params(), &mut mulberry32(7))
        );
    }

    #[test]
    fn should_handle_a_tiny_session_without_repeating_digits() {
        let p = SartParams {
            n_trials: 9,
            ..params()
        };
        let seq = generate_sart(&p, &mut mulberry32(3));
        let mut digits: Vec<u32> = seq.iter().map(|s| s.digit).collect();
        digits.sort_unstable();
        digits.dedup();
        assert_eq!(digits.len(), 9);
    }

    #[test]
    fn should_match_typescript_sequence_for_seed_42() {
        // Valori calcolati eseguendo generateSart (TS) con mulberry32(42).
        let seq = generate_sart(&params(), &mut mulberry32(42));
        let head: Vec<(u32, usize)> = seq
            .iter()
            .take(10)
            .map(|s| (s.digit, s.size_index))
            .collect();
        assert_eq!(head, SEED42_HEAD);
    }

    const SEED42_HEAD: [(u32, usize); 10] = [
        (8, 1),
        (4, 0),
        (2, 1),
        (9, 0),
        (6, 1),
        (3, 3),
        (2, 3),
        (5, 3),
        (7, 4),
        (5, 4),
    ];

    #[test]
    fn should_separate_repeats_in_the_fallback() {
        // Come nel TS il ripiego è best-effort: qui esiste uno scambio utile.
        assert_eq!(separate_repeats(vec![1, 1, 2, 3]), [1, 3, 2, 1]);
    }

    #[test]
    fn should_count_commissions_and_omissions_with_their_rates() {
        let trials = [
            trial(0, "go", Some(400.0)),
            trial(1, "go", None),
            trial(2, "nogo", Some(380.0)),
            trial(3, "nogo", None),
        ];
        assert_eq!(metric(&trials, "Errori di commissione"), n(1.0));
        assert_eq!(metric(&trials, "Tasso di commissione"), n(50.0));
        assert_eq!(metric(&trials, "Errori di omissione"), n(1.0));
        assert_eq!(metric(&trials, "Tasso di omissione"), n(50.0));
    }

    #[test]
    fn should_exclude_interrupted_trials_from_counts_and_denominators() {
        let mut nogo = trial(1, "nogo", None);
        nogo.flag = ValidationFlag::Interrupted;
        let mut go_missed = trial(2, "go", None);
        go_missed.flag = ValidationFlag::Interrupted;
        let trials = [trial(0, "go", Some(400.0)), nogo, go_missed];
        assert_eq!(metric(&trials, "Tasso di commissione"), n(0.0));
        assert_eq!(metric(&trials, "Errori di omissione"), n(0.0));
    }

    #[test]
    fn should_ignore_practice_trials() {
        let mut practice = trial(0, "nogo", Some(300.0));
        practice.phase = Phase::Practice;
        let trials = [practice, trial(1, "go", Some(450.0))];
        assert_eq!(metric(&trials, "Errori di commissione"), n(0.0));
    }

    #[test]
    fn should_compute_dprime_and_criterion_from_hits_and_commissions() {
        let trials = [
            trial(0, "go", Some(400.0)),
            trial(1, "go", Some(410.0)),
            trial(2, "go", None),
            trial(3, "nogo", Some(350.0)),
            trial(4, "nogo", None),
        ];
        assert_eq!(
            metric(&trials, "Sensibilità d'"),
            n(js_round(d_prime(2.0, 3.0, 1.0, 2.0) * 100.0) / 100.0)
        );
        assert_eq!(
            metric(&trials, "Criterio decisionale"),
            n(js_round(criterion_c(2.0, 3.0, 1.0, 2.0) * 100.0) / 100.0)
        );
    }

    #[test]
    fn should_summarise_go_rt_from_valid_correct_responses_only() {
        let mut anticipation = trial(2, "go", Some(100.0));
        anticipation.flag = ValidationFlag::Anticipation;
        let trials = [
            trial(0, "go", Some(400.0)),
            trial(1, "go", Some(500.0)),
            anticipation,
            trial(3, "go", None),
        ];
        assert_eq!(metric(&trials, "RT medio Go"), n(450.0));
        assert_eq!(metric(&trials, "Errori di anticipazione"), n(1.0));
    }

    #[test]
    fn should_report_a_dash_for_pre_error_rt_when_there_are_no_commissions() {
        let trials = [trial(0, "go", Some(400.0)), trial(1, "nogo", None)];
        assert_eq!(
            metric(&trials, "RT medio nei"),
            MetricValue::Text("—".into())
        );
        let dash = score_sart(&trials)
            .into_iter()
            .find(|m| m.label.starts_with("RT medio nei"))
            .unwrap();
        assert_eq!(dash.unit, None);
    }

    #[test]
    fn should_show_faster_rt_before_commissions_as_a_negative_variation() {
        let trials = [
            trial(0, "go", Some(500.0)),
            trial(1, "go", Some(500.0)),
            trial(2, "go", Some(500.0)),
            trial(3, "go", Some(300.0)),
            trial(4, "go", Some(300.0)),
            trial(5, "nogo", Some(280.0)),
        ];
        assert_eq!(metric(&trials, "RT medio nei"), n(400.0));
        assert_eq!(metric(&trials, "Variazione di RT"), n(400.0 - 420.0));
    }

    #[test]
    fn should_take_only_the_window_of_trials_before_each_commission() {
        let trials = [
            trial(0, "go", Some(600.0)),
            trial(1, "go", Some(500.0)),
            trial(2, "go", Some(500.0)),
            trial(3, "go", Some(500.0)),
            trial(4, "go", Some(500.0)),
            trial(5, "nogo", Some(300.0)),
        ];
        assert_eq!(
            reaction_times_before_commissions(&trials, 4),
            [500.0, 500.0, 500.0, 500.0]
        );
    }

    #[test]
    fn should_count_a_trial_once_when_two_commissions_share_it() {
        let trials = [
            trial(0, "go", Some(400.0)),
            trial(1, "nogo", Some(300.0)),
            trial(2, "nogo", Some(300.0)),
        ];
        assert_eq!(reaction_times_before_commissions(&trials, 4), [400.0]);
    }

    #[test]
    fn should_skip_anticipations_and_omissions_as_rt_sources() {
        let mut anticipation = trial(0, "go", Some(100.0));
        anticipation.flag = ValidationFlag::Anticipation;
        let trials = [
            anticipation,
            trial(1, "go", None),
            trial(2, "go", Some(450.0)),
            trial(3, "nogo", Some(300.0)),
        ];
        assert_eq!(reaction_times_before_commissions(&trials, 4), [450.0]);
    }
}
