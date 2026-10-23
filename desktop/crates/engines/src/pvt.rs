//! PVT (Psychomotor Vigilance Task) — attenzione sostenuta e vigilanza.
//! Porta `src/engine/tests/pvt.ts` (Dinges & Powell 1985; Basner & Dinges 2011).
use serde::{Deserialize, Serialize};
use sintropia_core::rng::rand_int;
use sintropia_core::types::{js_round, Phase, SummaryMetric, TrialResult, ValidationFlag};
use sintropia_core::validation::{mean, standard_deviation};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    pub n_trials: u32,
    /// Durata massima dello stimolo (ms): oltre = omissione.
    pub stimulus_max_ms: f64,
    pub isi_min_ms: i64,
    pub isi_max_ms: i64,
    pub practice_trials: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stimulus {
    /// ISI che precede questo stimolo (ms).
    pub isi_ms: i64,
}

/// Soglia di lapse del PVT a 10 minuti: RT >= 500 ms (Basner & Dinges, 2011).
pub const LAPSE_THRESHOLD_MS: f64 = 500.0;
const TAIL_FRACTION: f64 = 0.1;

/// Ogni trial ha un ISI casuale in [isi_min, isi_max].
pub fn generate_pvt(params: &Params, rand: &mut dyn FnMut() -> f64) -> Vec<Stimulus> {
    (0..params.n_trials)
        .map(|_| Stimulus {
            isi_ms: rand_int(params.isi_min_ms, params.isi_max_ms, rand),
        })
        .collect()
}

fn median(sorted: &[f64]) -> f64 {
    let n = sorted.len();
    if n == 0 {
        return 0.0;
    }
    let mid = n / 2;
    if n % 2 == 1 {
        sorted[mid]
    } else {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    }
}

fn tail_size(n: usize) -> usize {
    ((n as f64 * TAIL_FRACTION).ceil() as usize).max(1)
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn round2(x: f64) -> f64 {
    js_round(x * 100.0) / 100.0
}

fn sort_asc(values: &mut [f64]) {
    values.sort_by(|a, b| a.total_cmp(b));
}

/// Metriche PVT: lapse (RT >= 500 ms o omissione), velocità 1/RT, code del 10%.
pub fn score_pvt(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let test: Vec<&TrialResult> = trials
        .iter()
        .filter(|t| t.phase == Phase::Test && t.flag != ValidationFlag::Interrupted)
        .collect();

    let mut rts: Vec<f64> = test
        .iter()
        .filter(|t| t.flag == ValidationFlag::Valid && t.response.is_some())
        .filter_map(|t| t.rt_ms)
        .collect();
    sort_asc(&mut rts);
    let n_valid = rts.len();

    let count = |flag| test.iter().filter(|t| t.flag == flag).count();
    let n_omissions = count(ValidationFlag::Omission);
    let n_anticipations = count(ValidationFlag::Anticipation);
    let n_lapses = rts.iter().filter(|&&rt| rt >= LAPSE_THRESHOLD_MS).count() + n_omissions;
    let lapse_rate = if n_valid + n_omissions > 0 {
        n_lapses as f64 / (n_valid + n_omissions) as f64 * 100.0
    } else {
        0.0
    };

    let mut speeds: Vec<f64> = rts.iter().map(|rt| 1000.0 / rt).collect();
    sort_asc(&mut speeds);
    let k = tail_size(n_valid);
    let head = |v: &[f64]| mean(&v[..k.min(v.len())]);
    let tail = |v: &[f64]| mean(&v[v.len().saturating_sub(k)..]);

    vec![
        SummaryMetric::new(
            "Lapses (RT ≥ 500 ms o nessuna risposta)",
            n_lapses as f64,
            None,
        ),
        SummaryMetric::new("Tasso di lapse", round1(lapse_rate), Some("%")),
        SummaryMetric::new(
            "Velocità di risposta media (1/RT)",
            round2(mean(&speeds)),
            Some("1/s"),
        ),
        SummaryMetric::new(
            "Velocità media del 10% più lento (1/RT)",
            round2(head(&speeds)),
            Some("1/s"),
        ),
        SummaryMetric::new("RT medio", round1(mean(&rts)), Some("ms")),
        SummaryMetric::new("RT mediano", round1(median(&rts)), Some("ms")),
        SummaryMetric::new("SD RT", round1(standard_deviation(&rts)), Some("ms")),
        SummaryMetric::new("Media fastest 10%", round1(head(&rts)), Some("ms")),
        SummaryMetric::new("Media slowest 10%", round1(tail(&rts)), Some("ms")),
        SummaryMetric::new("Anticipazioni (< 150 ms)", n_anticipations as f64, None),
        SummaryMetric::new("Omissioni", n_omissions as f64, None),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::{MetricValue, TestId};

    /// Primi ISI per il seme 42, ottenuti dal motore TypeScript.
    const ISI_SEED_42: [i64; 5] = [6809, 5586, 8820, 7358, 3398];

    fn params() -> Params {
        Params {
            n_trials: 100,
            stimulus_max_ms: 10000.0,
            isi_min_ms: 2000,
            isi_max_ms: 10000,
            practice_trials: 5,
        }
    }

    fn trial(phase: Phase, rt: Option<f64>, flag: ValidationFlag) -> TrialResult {
        TrialResult {
            test_id: TestId::Pvt,
            session_id: "P-0000".into(),
            trial_index: 0,
            phase,
            condition: "pvt".into(),
            stimulus: "counter".into(),
            response: rt.map(|_| " ".to_string()),
            correct: flag == ValidationFlag::Valid,
            rt_ms: rt,
            flag,
            onset_timestamp: 0.0,
        }
    }

    fn valid(rt: f64) -> TrialResult {
        trial(Phase::Test, Some(rt), ValidationFlag::Valid)
    }

    fn omission() -> TrialResult {
        trial(Phase::Test, None, ValidationFlag::Omission)
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

    const LAPSES: &str = "Lapses (RT ≥ 500 ms o nessuna risposta)";

    #[test]
    fn should_generate_exact_number_of_trials() {
        assert_eq!(generate_pvt(&params(), &mut mulberry32(1)).len(), 100);
    }

    #[test]
    fn should_keep_every_isi_within_bounds() {
        for s in generate_pvt(&params(), &mut mulberry32(7)) {
            assert!((2000..=10000).contains(&s.isi_ms));
        }
    }

    #[test]
    fn should_be_deterministic_for_same_seed_and_differ_across_seeds() {
        let a = generate_pvt(&params(), &mut mulberry32(42));
        assert_eq!(a, generate_pvt(&params(), &mut mulberry32(42)));
        assert_ne!(
            generate_pvt(&params(), &mut mulberry32(1)),
            generate_pvt(&params(), &mut mulberry32(2))
        );
    }

    #[test]
    fn should_match_typescript_sequence_for_seed_42() {
        let isi: Vec<i64> = generate_pvt(&params(), &mut mulberry32(42))
            .iter()
            .take(5)
            .map(|s| s.isi_ms)
            .collect();
        assert_eq!(isi, ISI_SEED_42);
    }

    #[test]
    fn should_count_lapses_at_or_above_500ms() {
        let trials = [valid(250.0), valid(600.0), valid(512.0), valid(180.0)];
        assert_eq!(num(&score_pvt(&trials), LAPSES), 2.0);
    }

    #[test]
    fn should_compute_mean_and_median_rt() {
        let s = score_pvt(&[valid(200.0), valid(400.0), valid(600.0)]);
        assert_eq!(num(&s, "RT medio"), 400.0);
        assert_eq!(num(&s, "RT mediano"), 400.0);
    }

    #[test]
    fn should_count_anticipations_and_omissions() {
        let trials = [
            trial(Phase::Test, Some(80.0), ValidationFlag::Anticipation),
            trial(Phase::Test, Some(100.0), ValidationFlag::Anticipation),
            omission(),
            valid(300.0),
        ];
        let s = score_pvt(&trials);
        assert_eq!(num(&s, "Anticipazioni (< 150 ms)"), 2.0);
        assert_eq!(num(&s, "Omissioni"), 1.0);
    }

    #[test]
    fn should_compute_fastest_and_slowest_ten_percent() {
        let trials: Vec<TrialResult> = (0..20)
            .map(|i| valid(200.0 + f64::from(i) * 10.0))
            .collect();
        let s = score_pvt(&trials);
        assert_eq!(num(&s, "Media fastest 10%"), 205.0);
        assert_eq!(num(&s, "Media slowest 10%"), 385.0);
    }

    #[test]
    fn should_count_omissions_as_lapses_and_exclude_anticipations_from_rate() {
        let trials = [
            valid(300.0),
            valid(600.0),
            omission(),
            trial(Phase::Test, Some(90.0), ValidationFlag::Anticipation),
            trial(Phase::Test, Some(320.0), ValidationFlag::Interrupted),
        ];
        let s = score_pvt(&trials);
        assert_eq!(num(&s, LAPSES), 2.0);
        assert_eq!(num(&s, "Tasso di lapse"), 66.7);
    }

    #[test]
    fn should_use_mean_of_two_central_values_as_median_for_even_counts() {
        let trials: Vec<TrialResult> = [200.0, 300.0, 400.0, 900.0].map(valid).to_vec();
        assert_eq!(num(&score_pvt(&trials), "RT mediano"), 350.0);
    }

    #[test]
    fn should_compute_response_speed_as_mean_of_inverse_rt() {
        let s = score_pvt(&[valid(250.0), valid(500.0)]);
        assert_eq!(num(&s, "Velocità di risposta media (1/RT)"), 3.0);
        assert_eq!(num(&s, "Velocità media del 10% più lento (1/RT)"), 2.0);
    }

    #[test]
    fn should_ignore_practice_trials() {
        let trials = [
            trial(Phase::Practice, Some(5000.0), ValidationFlag::Valid),
            valid(300.0),
        ];
        assert_eq!(num(&score_pvt(&trials), LAPSES), 0.0);
    }

    #[test]
    fn should_return_zeros_without_trials() {
        let s = score_pvt(&[]);
        assert_eq!(s.len(), 11);
        assert_eq!(num(&s, "Tasso di lapse"), 0.0);
        assert_eq!(num(&s, "Media slowest 10%"), 0.0);
    }
}
