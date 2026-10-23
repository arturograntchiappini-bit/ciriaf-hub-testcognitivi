//! Go/No-Go Task — inibizione motoria rapida. Porta `src/engine/tests/gonogo.ts`.
//! Verbruggen & Logan (2008); Wessel (2018). Vedi docs/scientific/gonogo.md
use serde::{Deserialize, Serialize};
use sintropia_core::rng::rand_int;
use sintropia_core::sdt::{criterion_c, d_prime};
use sintropia_core::types::{
    js_round, MetricValue, Phase, SummaryMetric, TrialResult, ValidationFlag,
};
use sintropia_core::validation::{count_flag, mean, standard_deviation};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoNoGoParams {
    pub n_trials: u32,
    /// Proporzione di stimoli Go (es. 0.75).
    pub go_ratio: f64,
    /// Durata dello stimolo = finestra di risposta (ms).
    pub stimulus_ms: u32,
    pub isi_min_ms: u32,
    pub isi_max_ms: u32,
    pub practice_trials: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GoNoGoKind {
    Go,
    Nogo,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoNoGoStimulus {
    pub kind: GoNoGoKind,
    /// ISI (schermo vuoto) che segue questo stimolo, in ms.
    pub isi_ms: u32,
}

/// Mai più di 2 No-Go consecutivi.
const MAX_NOGO_RUN: u32 = 2;
const ARRANGE_ATTEMPTS: u32 = 500;

/// Sequenza Go/No-Go: numero esatto di Go/No-Go dato il rapporto, al massimo 2 No-Go
/// consecutivi, ISI uniforme in [isiMin, isiMax] per ogni trial.
pub fn generate_go_nogo(
    params: &GoNoGoParams,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<GoNoGoStimulus> {
    let n_go = (js_round(f64::from(params.n_trials) * params.go_ratio) as i64)
        .clamp(0, i64::from(params.n_trials)) as u32;
    let n_nogo = params.n_trials - n_go;
    let kinds = arrange_kinds(n_go, n_nogo, rand);
    kinds
        .into_iter()
        .map(|kind| GoNoGoStimulus {
            kind,
            isi_ms: rand_int(
                i64::from(params.isi_min_ms),
                i64::from(params.isi_max_ms),
                rand,
            ) as u32,
        })
        .collect()
}

/// Dispone Go/No-Go rispettando il vincolo anti-cluster sui No-Go.
fn arrange_kinds(n_go: u32, n_nogo: u32, rand: &mut dyn FnMut() -> f64) -> Vec<GoNoGoKind> {
    for _ in 0..ARRANGE_ATTEMPTS {
        if let Some(result) = try_arrange(n_go, n_nogo, rand) {
            return result;
        }
    }
    // Fallback deterministico: intercala i No-Go tra i Go (mai consecutivi).
    deterministic_arrange(n_go, n_nogo)
}

fn try_arrange(n_go: u32, n_nogo: u32, rand: &mut dyn FnMut() -> f64) -> Option<Vec<GoNoGoKind>> {
    let (mut go_left, mut nogo_left, mut nogo_run) = (n_go, n_nogo, 0);
    let mut seq = Vec::new();
    for i in 0..(n_go + n_nogo) {
        let can_nogo = nogo_left > 0 && nogo_run < MAX_NOGO_RUN;
        let can_go = go_left > 0;
        let choose_nogo = if !can_go {
            true
        } else if i == 0 {
            false // il primo trial è sempre Go: instaura la risposta prepotente
        } else if !can_nogo {
            false
        } else {
            rand() < f64::from(nogo_left) / f64::from(go_left + nogo_left)
        };
        if choose_nogo {
            // Il TS qui accetta anche una terza No-Go consecutiva quando i Go sono finiti (DIVERGENZE.md): si ritenta.
            if nogo_run >= MAX_NOGO_RUN {
                return None;
            }
            seq.push(GoNoGoKind::Nogo);
            nogo_left -= 1;
            nogo_run += 1;
        } else {
            seq.push(GoNoGoKind::Go);
            go_left -= 1;
            nogo_run = 0;
        }
    }
    (go_left == 0 && nogo_left == 0).then_some(seq)
}

fn deterministic_arrange(n_go: u32, n_nogo: u32) -> Vec<GoNoGoKind> {
    let (mut go_left, mut nogo_left) = (n_go, n_nogo);
    let mut seq = Vec::new();
    while go_left > 0 || nogo_left > 0 {
        if go_left > 0 {
            seq.push(GoNoGoKind::Go);
            go_left -= 1;
        }
        // Il TS qui non termina quando i No-Go superano i Go (DIVERGENZE.md): finiti i Go si accodano i No-Go rimasti.
        if nogo_left > 0 {
            seq.push(GoNoGoKind::Nogo);
            nogo_left -= 1;
        }
    }
    seq
}

/// Il partecipante ha premuto (anche in anticipo). Si guarda la risposta registrata, non il flag:
/// il sequencer marca VALID anche un No-Go correttamente trattenuto (nessuna risposta).
fn is_responded(t: &TrialResult) -> bool {
    t.response.is_some() && t.flag != ValidationFlag::Interrupted
}

fn is_valid_trial(t: &TrialResult) -> bool {
    t.flag != ValidationFlag::Interrupted
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

fn rate(count: usize, total: usize) -> f64 {
    if total > 0 {
        count as f64 / total as f64 * 100.0
    } else {
        0.0
    }
}

/// Metriche: errori di commissione/omissione, RT medio/SD/CV dei Go corretti validi, anticipazioni,
/// d' e criterio c (hit = risposta su Go, falso allarme = risposta su No-Go).
/// I trial interrotti sono esclusi da numeratori e denominatori.
pub fn score_go_nogo(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let test: Vec<&TrialResult> = trials.iter().filter(|t| t.phase == Phase::Test).collect();
    let go_trials: Vec<&TrialResult> = test
        .iter()
        .copied()
        .filter(|t| t.condition == "go" && is_valid_trial(t))
        .collect();
    let nogo_trials: Vec<&TrialResult> = test
        .iter()
        .copied()
        .filter(|t| t.condition == "nogo" && is_valid_trial(t))
        .collect();

    let commission_errors = nogo_trials.iter().filter(|t| is_responded(t)).count();
    let hits = go_trials.iter().filter(|t| is_responded(t)).count();
    let omission_errors = go_trials.len() - hits;

    let go_rts: Vec<f64> = go_trials
        .iter()
        .filter(|t| t.flag == ValidationFlag::Valid && t.correct)
        .filter_map(|t| t.rt_ms)
        .collect();
    let mean_go = mean(&go_rts);
    let sd_go = standard_deviation(&go_rts);
    // Coefficiente di variazione: variabilità intra-soggetto (lapse/instabilità attentiva).
    let cv_go = if mean_go > 0.0 {
        sd_go / mean_go * 100.0
    } else {
        0.0
    };
    let (h, g, fa, ng) = (
        hits as f64,
        go_trials.len() as f64,
        commission_errors as f64,
        nogo_trials.len() as f64,
    );

    vec![
        num(
            "Errori di commissione (No-Go)",
            commission_errors as f64,
            None,
        ),
        num(
            "Tasso di commissione",
            round1(rate(commission_errors, nogo_trials.len())),
            Some("%"),
        ),
        num("Errori di omissione (Go)", omission_errors as f64, None),
        num(
            "Tasso di omissione",
            round1(rate(omission_errors, go_trials.len())),
            Some("%"),
        ),
        num("RT medio Go corretti", round1(mean_go), Some("ms")),
        num("SD RT Go corretti", round1(sd_go), Some("ms")),
        num("CV RT Go corretti", round1(cv_go), Some("%")),
        num("Sensibilità d'", round2(d_prime(h, g, fa, ng)), None),
        num(
            "Criterio decisionale (c)",
            round2(criterion_c(h, g, fa, ng)),
            None,
        ),
        num(
            "Errori di anticipazione",
            count_flag(trials, ValidationFlag::Anticipation) as f64,
            None,
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::TestId;

    fn params() -> GoNoGoParams {
        GoNoGoParams {
            n_trials: 80,
            go_ratio: 0.75,
            stimulus_ms: 800,
            isi_min_ms: 500,
            isi_max_ms: 1000,
            practice_trials: 10,
        }
    }

    fn trial(
        condition: &str,
        correct: bool,
        response: Option<&str>,
        rt: Option<f64>,
        flag: ValidationFlag,
    ) -> TrialResult {
        TrialResult {
            test_id: TestId::Gonogo,
            session_id: "G-0000".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: condition.into(),
            response: response.map(str::to_string),
            correct,
            rt_ms: rt,
            flag,
            onset_timestamp: 0.0,
        }
    }

    fn go(rt: f64) -> TrialResult {
        trial("go", true, Some("space"), Some(rt), ValidationFlag::Valid)
    }

    fn go_omission(flag: ValidationFlag) -> TrialResult {
        trial("go", false, None, None, flag)
    }

    fn nogo_false_alarm() -> TrialResult {
        trial(
            "nogo",
            false,
            Some("space"),
            Some(300.0),
            ValidationFlag::Valid,
        )
    }

    fn nogo_rejection(flag: ValidationFlag) -> TrialResult {
        trial("nogo", true, None, None, flag)
    }

    fn metric(trials: &[TrialResult], label: &str) -> MetricValue {
        score_go_nogo(trials)
            .into_iter()
            .find(|m| m.label == label)
            .unwrap()
            .value
    }

    fn n(v: f64) -> MetricValue {
        MetricValue::Num(v)
    }

    #[test]
    fn should_produce_exactly_60_go_and_20_nogo() {
        let seq = generate_go_nogo(&params(), &mut mulberry32(1));
        assert_eq!(seq.len(), 80);
        assert_eq!(seq.iter().filter(|s| s.kind == GoNoGoKind::Go).count(), 60);
        assert_eq!(
            seq.iter().filter(|s| s.kind == GoNoGoKind::Nogo).count(),
            20
        );
    }

    #[test]
    fn should_never_have_more_than_two_consecutive_nogo() {
        let seq = generate_go_nogo(&params(), &mut mulberry32(7));
        let mut run = 0;
        for s in seq {
            run = if s.kind == GoNoGoKind::Nogo {
                run + 1
            } else {
                0
            };
            assert!(run <= 2);
        }
    }

    #[test]
    fn should_always_start_with_a_go_trial() {
        for seed in [1, 7, 3, 42, 99] {
            let seq = generate_go_nogo(&params(), &mut mulberry32(seed));
            assert_eq!(seq[0].kind, GoNoGoKind::Go);
        }
    }

    #[test]
    fn should_keep_every_isi_in_range() {
        let seq = generate_go_nogo(&params(), &mut mulberry32(3));
        assert!(seq.iter().all(|s| (500..=1000).contains(&s.isi_ms)));
    }

    #[test]
    fn should_match_typescript_sequence_for_seed_42() {
        // Valori calcolati eseguendo generateGoNoGo (TS) con mulberry32(42).
        let seq = generate_go_nogo(&params(), &mut mulberry32(42));
        let head: Vec<(u8, u32)> = seq
            .iter()
            .take(8)
            .map(|s| (u8::from(s.kind == GoNoGoKind::Nogo), s.isi_ms))
            .collect();
        assert_eq!(head, SEED42_HEAD);
    }

    const SEED42_HEAD: [(u8, u32); 8] = [
        (0, 860),
        (0, 968),
        (0, 639),
        (0, 853),
        (0, 589),
        (1, 760),
        (0, 911),
        (0, 560),
    ];

    #[test]
    fn should_use_the_deterministic_fallback_without_consecutive_nogo() {
        let seq = deterministic_arrange(6, 3);
        assert_eq!(seq.iter().filter(|k| **k == GoNoGoKind::Nogo).count(), 3);
        assert!(seq
            .windows(2)
            .all(|w| w[0] == GoNoGoKind::Go || w[1] == GoNoGoKind::Go));
    }

    #[test]
    fn should_count_commission_errors_on_nogo_responses() {
        let trials = [nogo_false_alarm(), nogo_rejection(ValidationFlag::Valid)];
        assert_eq!(metric(&trials, "Errori di commissione (No-Go)"), n(1.0));
    }

    #[test]
    fn should_not_count_a_correctly_withheld_nogo_as_commission() {
        let trials: Vec<TrialResult> = (0..5)
            .map(|_| nogo_rejection(ValidationFlag::Valid))
            .collect();
        assert_eq!(metric(&trials, "Errori di commissione (No-Go)"), n(0.0));
        assert_eq!(metric(&trials, "Tasso di commissione"), n(0.0));
    }

    #[test]
    fn should_count_go_omissions_and_mean_rt_of_correct_go() {
        let trials = [go(300.0), go(500.0), go_omission(ValidationFlag::Omission)];
        assert_eq!(metric(&trials, "Errori di omissione (Go)"), n(1.0));
        assert_eq!(metric(&trials, "RT medio Go corretti"), n(400.0));
        // CV = SD/mean*100: SD campionaria 141.42 su media 400 -> 35.4%
        assert_eq!(metric(&trials, "CV RT Go corretti"), n(35.4));
    }

    #[test]
    fn should_exclude_interrupted_trials_from_rate_denominators() {
        let trials = [
            nogo_false_alarm(),
            nogo_rejection(ValidationFlag::Interrupted),
            go(400.0),
            go_omission(ValidationFlag::Interrupted),
        ];
        assert_eq!(metric(&trials, "Tasso di commissione"), n(100.0));
        assert_eq!(metric(&trials, "Tasso di omissione"), n(0.0));
    }

    #[test]
    fn should_compute_dprime_and_criterion_from_go_and_nogo_responses() {
        let mut trials: Vec<TrialResult> = (0..8).map(|_| go(400.0)).collect();
        trials.push(trial(
            "go",
            true,
            Some("space"),
            Some(90.0),
            ValidationFlag::Anticipation,
        ));
        trials.push(go_omission(ValidationFlag::Omission));
        trials.push(nogo_false_alarm());
        trials.extend((0..3).map(|_| nogo_rejection(ValidationFlag::Valid)));
        let expected_d = js_round(d_prime(9.0, 10.0, 1.0, 4.0) * 100.0) / 100.0;
        let expected_c = js_round(criterion_c(9.0, 10.0, 1.0, 4.0) * 100.0) / 100.0;
        assert_eq!(metric(&trials, "Sensibilità d'"), n(expected_d));
        assert_eq!(metric(&trials, "Criterio decisionale (c)"), n(expected_c));
        assert_eq!(metric(&trials, "Errori di anticipazione"), n(1.0));
    }
}
