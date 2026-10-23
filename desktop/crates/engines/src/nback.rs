//! N-Back Task (variante 2-back) — memoria di lavoro a flusso continuo.
//! Porta `src/engine/tests/nback.ts` (Kirchner 1958; Jaeggi et al. 2010; Hautus 1995).
use serde::{Deserialize, Serialize};
use sintropia_core::rng::{pick, shuffle};
use sintropia_core::types::{js_round, Phase, SummaryMetric, TrialResult, ValidationFlag};
use sintropia_core::validation::{mean, standard_deviation};
use std::collections::HashSet;

// Riesportati per compatibilità: la logica vive in `sintropia_core::sdt`.
pub use sintropia_core::sdt::{criterion_c, d_prime, probit};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    pub n: usize,
    pub letter_ms: f64,
    pub blank_ms: f64,
    pub n_trials: usize,
    /// Proporzione target (es. 0.30).
    pub target_rate: f64,
    /// Proporzione dei non-target che sono lure (lag n−1 o n+1). `None` nelle sessioni salvate
    /// prima dell'introduzione dei lure: equivale a 0 (`?? 0` del TS).
    #[serde(default)]
    pub lure_rate: Option<f64>,
    pub practice_trials: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stimulus {
    pub letter: char,
    pub is_target: bool,
    /// Non-target che ripete la lettera a lag n−1 o n+1: familiare ma non target.
    pub is_lure: bool,
}

/// Consonanti (vocali escluse per impedire strategie fonologiche/chunking).
pub const NBACK_LETTERS: [char; 16] = [
    'B', 'C', 'D', 'F', 'G', 'H', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'Z',
];

type Rand<'a> = &'a mut dyn FnMut() -> f64;

/// Lag dei lure rispetto a n: n−1 e n+1 (solo se positivi).
fn lure_lags(n: usize) -> Vec<usize> {
    [n.wrapping_sub(1), n + 1]
        .into_iter()
        .filter(|&lag| lag > 0 && lag != usize::MAX)
        .collect()
}

/// Genera lo stream: ~target_rate target (letter[i]==letter[i-n]), nessun target nelle prime n
/// posizioni e una quota `lure_rate` di non-target che sono lure; gli altri non-target evitano
/// di ripetere una lettera a quei lag.
pub fn generate_nback(params: &Params, rand: Rand) -> Vec<Stimulus> {
    let (n, n_trials) = (params.n, params.n_trials);
    let lure_rate = params.lure_rate.unwrap_or(0.0);
    let n_targets = js_round((n_trials as f64 - n as f64) * params.target_rate).max(0.0) as usize;

    let target_positions = choose_target_positions(n, n_trials, n_targets, rand);
    let lure_positions = choose_lure_positions(n, n_trials, &target_positions, lure_rate, rand);

    let mut letters: Vec<char> = Vec::with_capacity(n_trials);
    for i in 0..n_trials {
        let letter = if target_positions.contains(&i) {
            letters[i - n]
        } else if lure_positions.contains(&i) {
            pick_lure(&letters, i, n, rand)
        } else {
            pick_non_target(&letters, i, n, rand)
        };
        letters.push(letter);
    }

    let lags = lure_lags(n);
    letters
        .iter()
        .enumerate()
        .map(|(i, &letter)| {
            let is_target = i >= n && letter == letters[i - n];
            let is_lure = !is_target
                && lags
                    .iter()
                    .any(|&lag| i >= lag && letters[i - lag] == letter);
            Stimulus {
                letter,
                is_target,
                is_lure,
            }
        })
        .collect()
}

/// Sceglie a caso le posizioni dei lure fra i non-target che hanno disponibili entrambi i lag.
fn choose_lure_positions(
    n: usize,
    n_trials: usize,
    target_positions: &HashSet<usize>,
    lure_rate: f64,
    rand: Rand,
) -> HashSet<usize> {
    let candidates: Vec<usize> = ((n + 1)..n_trials)
        .filter(|i| !target_positions.contains(i))
        .collect();
    let non_targets = n_trials as f64 - n as f64 - target_positions.len() as f64;
    let wanted = candidates
        .len()
        .min(js_round(non_targets * lure_rate).max(0.0) as usize);
    shuffle(&candidates, rand)
        .into_iter()
        .take(wanted)
        .collect()
}

/// Lettera di un lure: ripete quella a lag n−1 o n+1 purché non coincida con quella a lag n.
fn pick_lure(letters: &[char], i: usize, n: usize, rand: Rand) -> char {
    let target_letter = letters[i - n];
    let options: Vec<char> = lure_lags(n)
        .into_iter()
        .map(|lag| letters[i - lag])
        .filter(|&l| l != target_letter)
        .collect();
    match pick(&options, rand) {
        Some(&letter) => letter,
        None => pick_non_target(letters, i, n, rand),
    }
}

fn choose_target_positions(
    n: usize,
    n_trials: usize,
    n_targets: usize,
    rand: Rand,
) -> HashSet<usize> {
    let mut positions: HashSet<usize> = HashSet::new();
    let span = n_trials.saturating_sub(n) as f64;
    let mut guard = 0usize;
    let max_guard = n_trials * 50;
    while positions.len() < n_targets && guard < max_guard {
        guard += 1;
        let p = n + (rand() * span).floor() as usize;
        let adjacent = p > 0 && positions.contains(&(p - 1));
        if positions.contains(&p) || adjacent || positions.contains(&(p + 1)) {
            continue;
        }
        positions.insert(p);
    }
    // Rilassa il vincolo di non-adiacenza se non abbiamo abbastanza target.
    while positions.len() < n_targets && guard < max_guard * 2 {
        guard += 1;
        positions.insert(n + (rand() * span).floor() as usize);
    }
    positions
}

/// Sceglie una lettera che NON crea un target e limita i lure a lag n−1 / n+1.
fn pick_non_target(letters: &[char], i: usize, n: usize, rand: Rand) -> char {
    let forbidden: Option<char> = (i >= n).then(|| letters[i - n]);
    let soft_forbidden: HashSet<char> = lure_lags(n)
        .into_iter()
        .filter(|&lag| i >= lag)
        .map(|lag| letters[i - lag])
        .collect();
    let strict: Vec<char> = NBACK_LETTERS
        .iter()
        .copied()
        .filter(|l| Some(*l) != forbidden && !soft_forbidden.contains(l))
        .collect();
    if let Some(&letter) = pick(&strict, rand) {
        return letter;
    }
    let relaxed: Vec<char> = NBACK_LETTERS
        .iter()
        .copied()
        .filter(|l| Some(*l) != forbidden)
        .collect();
    let pool: &[char] = if relaxed.is_empty() {
        &NBACK_LETTERS
    } else {
        &relaxed
    };
    pick(pool, rand).copied().unwrap_or(NBACK_LETTERS[0])
}

#[derive(Default)]
struct Counts {
    hits: f64,
    targets: f64,
    false_alarms: f64,
    non_targets: f64,
    lures: f64,
    lure_false_alarms: f64,
}

fn count_hits_fa<'a>(trials: impl IntoIterator<Item = &'a TrialResult>) -> Counts {
    let mut c = Counts::default();
    for t in trials {
        if t.flag == ValidationFlag::Interrupted {
            continue;
        }
        let responded = f64::from(u8::from(t.response.is_some()));
        match t.condition.as_str() {
            "target" => {
                c.targets += 1.0;
                c.hits += responded;
            }
            "nontarget" | "lure" => {
                c.non_targets += 1.0;
                c.false_alarms += responded;
                if t.condition == "lure" {
                    c.lures += 1.0;
                    c.lure_false_alarms += responded;
                }
            }
            _ => {}
        }
    }
    c
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn round2(x: f64) -> f64 {
    js_round(x * 100.0) / 100.0
}

/// Metriche: hit, miss, falsi allarmi (anche sui soli lure), d', criterio c, RT medio/SD dei hit
/// validi e d' per quartili temporali. I trial interrotti sono esclusi dai conteggi.
pub fn score_nback(trials: &[TrialResult], n_quartiles: usize) -> Vec<SummaryMetric> {
    let test: Vec<&TrialResult> = trials.iter().filter(|t| t.phase == Phase::Test).collect();
    let c = count_hits_fa(test.iter().copied());
    let hit_rts: Vec<f64> = test
        .iter()
        .filter(|t| t.condition == "target" && t.flag == ValidationFlag::Valid)
        .filter(|t| t.response.is_some())
        .filter_map(|t| t.rt_ms)
        .collect();
    let dp = |c: &Counts| d_prime(c.hits, c.targets, c.false_alarms, c.non_targets);
    let lure_rate = if c.lures > 0.0 {
        round1(c.lure_false_alarms / c.lures * 100.0)
    } else {
        0.0
    };

    let mut metrics = vec![
        SummaryMetric::new("Hit (target rilevati)", c.hits, None),
        SummaryMetric::new("Miss (target mancati)", c.targets - c.hits, None),
        SummaryMetric::new("Falsi allarmi", c.false_alarms, None),
        SummaryMetric::new("Falsi allarmi su lure", c.lure_false_alarms, None),
        SummaryMetric::new("Tasso di falsi allarmi su lure", lure_rate, Some("%")),
        SummaryMetric::new("Sensibilità d'", round2(dp(&c)), None),
        SummaryMetric::new(
            "Criterio decisionale (c)",
            round2(criterion_c(
                c.hits,
                c.targets,
                c.false_alarms,
                c.non_targets,
            )),
            None,
        ),
        SummaryMetric::new("RT medio hit", round1(mean(&hit_rts)), Some("ms")),
        SummaryMetric::new(
            "SD RT hit",
            round1(standard_deviation(&hit_rts)),
            Some("ms"),
        ),
    ];

    for (idx, chunk) in split_into_chunks(&test, n_quartiles).iter().enumerate() {
        let cc = count_hits_fa(chunk.iter().copied());
        metrics.push(SummaryMetric::new(
            format!("d' quartile {}", idx + 1),
            round2(dp(&cc)),
            None,
        ));
    }
    metrics
}

/// Divide una lista in `k` blocchi contigui il più bilanciati possibile.
pub fn split_into_chunks<T: Clone>(items: &[T], k: usize) -> Vec<Vec<T>> {
    if k == 0 {
        return Vec::new();
    }
    let size = items.len().div_ceil(k);
    (0..k)
        .map(|i| {
            let start = (i * size).min(items.len());
            let end = ((i + 1) * size).min(items.len());
            items[start..end].to_vec()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::{MetricValue, TestId};

    /// Prime lettere per il seme 42 (parametri di default) ottenute dal motore TypeScript.
    const LETTERS_SEED_42: &str = "BRBBHBGBLBCG";
    /// Posizioni (indici) di target e lure per il seme 42, dal motore TypeScript.
    const TARGETS_SEED_42: [usize; 5] = [2, 5, 7, 9, 12];
    const LURES_SEED_42: [usize; 5] = [3, 14, 16, 22, 33];

    fn params() -> Params {
        Params {
            n: 2,
            letter_ms: 500.0,
            blank_ms: 1500.0,
            n_trials: 100,
            target_rate: 0.3,
            lure_rate: Some(0.2),
            practice_trials: 20,
        }
    }

    fn trial(
        condition: &str,
        responded: bool,
        rt: Option<f64>,
        flag: ValidationFlag,
    ) -> TrialResult {
        TrialResult {
            test_id: TestId::Nback,
            session_id: "N-0000".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: "B".into(),
            response: responded.then(|| "space".to_string()),
            correct: true,
            rt_ms: rt,
            flag,
            onset_timestamp: 0.0,
        }
    }

    fn num(summary: &[SummaryMetric], label: &str) -> f64 {
        match &summary
            .iter()
            .find(|m| m.label == label)
            .unwrap_or_else(|| panic!("metrica mancante: {label}"))
            .value
        {
            MetricValue::Num(n) => *n,
            MetricValue::Text(t) => panic!("atteso numero, trovato {t}"),
        }
    }

    #[test]
    fn should_flag_target_only_when_letter_equals_letter_n_back() {
        let seq = generate_nback(&params(), &mut mulberry32(1));
        for (i, s) in seq.iter().enumerate() {
            let expected = i >= 2 && s.letter == seq[i - 2].letter;
            assert_eq!(s.is_target, expected);
        }
    }

    #[test]
    fn should_keep_target_fraction_close_to_target_rate() {
        let seq = generate_nback(&params(), &mut mulberry32(5));
        let targets = seq.iter().filter(|s| s.is_target).count() as i64;
        let expected = js_round(98.0 * 0.3) as i64;
        assert!((targets - expected).abs() <= 3);
    }

    #[test]
    fn should_not_place_targets_in_first_n_positions() {
        let seq = generate_nback(&params(), &mut mulberry32(9));
        assert!(seq.iter().take(2).all(|s| !s.is_target));
    }

    #[test]
    fn should_insert_lures_at_requested_rate_and_no_other_repeats_at_lure_lags() {
        let p = Params {
            n_trials: 360,
            ..params()
        };
        let seq = generate_nback(&p, &mut mulberry32(11));
        let lures = seq.iter().filter(|s| s.is_lure).count() as f64;
        let non_targets = seq
            .iter()
            .enumerate()
            .filter(|(i, s)| !s.is_target && *i >= 2)
            .count() as f64;
        assert!((lures / non_targets - 0.2).abs() < 0.02);
        for (i, s) in seq.iter().enumerate() {
            let at_lag = [1usize, 3]
                .iter()
                .any(|&lag| i >= lag && seq[i - lag].letter == s.letter);
            if !s.is_target {
                assert_eq!(s.is_lure, at_lag);
            }
            if s.is_lure {
                assert!(!s.is_target);
            }
        }
    }

    #[test]
    fn should_generate_no_lures_when_lure_rate_is_zero() {
        let p = Params {
            lure_rate: Some(0.0),
            ..params()
        };
        assert!(!generate_nback(&p, &mut mulberry32(4))
            .iter()
            .any(|s| s.is_lure));
    }

    #[test]
    fn should_generate_no_lures_for_legacy_params_without_lure_rate() {
        let legacy: Params = serde_json::from_str(
            r#"{"n":2,"letterMs":500,"blankMs":1500,"nTrials":100,"targetRate":0.3,"practiceTrials":20}"#,
        )
        .expect("parametri senza lureRate");
        assert_eq!(legacy.lure_rate, None);
        assert!(!generate_nback(&legacy, &mut mulberry32(6))
            .iter()
            .any(|s| s.is_lure));
    }

    #[test]
    fn should_use_only_consonants() {
        for s in generate_nback(&params(), &mut mulberry32(2)) {
            assert!(!"AEIOU".contains(s.letter));
            assert!(NBACK_LETTERS.contains(&s.letter));
        }
    }

    #[test]
    fn should_match_typescript_stream_for_seed_42() {
        let seq = generate_nback(&params(), &mut mulberry32(42));
        let head: String = seq
            .iter()
            .take(LETTERS_SEED_42.len())
            .map(|s| s.letter)
            .collect();
        assert_eq!(head, LETTERS_SEED_42);
        let positions = |f: fn(&Stimulus) -> bool| -> Vec<usize> {
            (0..seq.len()).filter(|&i| f(&seq[i])).take(5).collect()
        };
        assert_eq!(positions(|s| s.is_target), TARGETS_SEED_42);
        assert_eq!(positions(|s| s.is_lure), LURES_SEED_42);
    }

    #[test]
    fn should_give_probit_and_d_prime_reference_values() {
        assert!(probit(0.5).abs() < 1e-3);
        assert!((probit(0.975) - 1.96).abs() < 1e-2);
        let perfect = d_prime(30.0, 30.0, 0.0, 70.0);
        assert!(perfect.is_finite() && perfect > 2.0);
        assert!(d_prime(15.0, 30.0, 35.0, 70.0).abs() < 0.1);
        assert!(criterion_c(15.0, 30.0, 35.0, 70.0).abs() < 0.1);
        assert!(criterion_c(5.0, 30.0, 2.0, 70.0) > 0.0);
    }

    #[test]
    fn should_split_into_contiguous_chunks() {
        let chunks = split_into_chunks(&[1, 2, 3, 4, 5, 6, 7, 8], 4);
        assert_eq!(chunks.len(), 4);
        assert_eq!(chunks.concat(), [1, 2, 3, 4, 5, 6, 7, 8]);
    }

    #[test]
    fn should_count_hits_misses_and_false_alarms() {
        let trials = [
            trial("target", true, Some(600.0), ValidationFlag::Valid),
            trial("target", false, None, ValidationFlag::Omission),
            trial("nontarget", true, Some(500.0), ValidationFlag::Valid),
            trial("nontarget", false, None, ValidationFlag::Valid),
        ];
        let s = score_nback(&trials, 4);
        assert_eq!(num(&s, "Hit (target rilevati)"), 1.0);
        assert_eq!(num(&s, "Miss (target mancati)"), 1.0);
        assert_eq!(num(&s, "Falsi allarmi"), 1.0);
    }

    #[test]
    fn should_count_lure_false_alarms_but_keep_lures_as_non_targets() {
        let trials = [
            trial("target", true, Some(600.0), ValidationFlag::Valid),
            trial("lure", true, Some(500.0), ValidationFlag::Valid),
            trial("lure", false, None, ValidationFlag::Valid),
            trial("nontarget", false, None, ValidationFlag::Valid),
        ];
        let s = score_nback(&trials, 4);
        assert_eq!(num(&s, "Falsi allarmi"), 1.0);
        assert_eq!(num(&s, "Falsi allarmi su lure"), 1.0);
        assert_eq!(num(&s, "Tasso di falsi allarmi su lure"), 50.0);
    }

    #[test]
    fn should_exclude_interrupted_trials_from_counts() {
        let trials = [
            trial("target", true, Some(600.0), ValidationFlag::Valid),
            trial("target", false, None, ValidationFlag::Interrupted),
        ];
        assert_eq!(num(&score_nback(&trials, 4), "Miss (target mancati)"), 0.0);
    }

    #[test]
    fn should_include_d_prime_per_quartile() {
        let trials: Vec<TrialResult> = (0..8)
            .map(|i| {
                if i % 2 == 0 {
                    trial("target", true, Some(600.0), ValidationFlag::Valid)
                } else {
                    trial("nontarget", false, None, ValidationFlag::Valid)
                }
            })
            .collect();
        let s = score_nback(&trials, 4);
        assert_eq!(
            s.iter()
                .filter(|m| m.label.starts_with("d' quartile"))
                .count(),
            4
        );
    }
}
