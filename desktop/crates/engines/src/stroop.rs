//! Stroop Task (varianti 1 "focus parola" e 2 "focus colore"). Porta `src/engine/tests/stroop.ts`.
//! Stroop (1935); MacLeod (1991). Vedi docs/scientific/stroop.md
use serde::{Deserialize, Serialize};
use sintropia_core::types::{
    js_round, MetricValue, Phase, SummaryMetric, TrialResult, ValidationFlag,
};
use sintropia_core::validation::{count_flag, mean, standard_deviation};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum StroopColor {
    Rosso,
    Verde,
    Blu,
    Giallo,
}

impl StroopColor {
    /// Nome come nel TS (`ROSSO`, ...).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Rosso => "ROSSO",
            Self::Verde => "VERDE",
            Self::Blu => "BLU",
            Self::Giallo => "GIALLO",
        }
    }

    /// Tasto associato (iniziali univoche in italiano).
    pub fn key(self) -> char {
        match self {
            Self::Rosso => 'R',
            Self::Verde => 'V',
            Self::Blu => 'B',
            Self::Giallo => 'G',
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StroopVariant {
    Stroop1,
    Stroop2,
}

pub const STROOP_COLORS: [StroopColor; 4] = [
    StroopColor::Rosso,
    StroopColor::Verde,
    StroopColor::Blu,
    StroopColor::Giallo,
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StroopParams {
    /// Numero totale di trial (metà congruenti, metà incongruenti).
    pub n_trials: u32,
    pub fixation_ms: u32,
    pub timeout_ms: u32,
    pub isi_ms: u32,
    pub practice_trials: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct StroopStimulus {
    pub word: StroopColor,
    pub color: StroopColor,
    pub congruent: bool,
}

/// Max ripetizioni consecutive dello stesso colore o parola.
const MAX_RUN: u32 = 3;
const SHUFFLE_RETRIES: u32 = 200;

fn violates_run(seq: &[StroopStimulus]) -> bool {
    let (mut color_run, mut word_run) = (1, 1);
    for pair in seq.windows(2) {
        color_run = if pair[1].color == pair[0].color {
            color_run + 1
        } else {
            1
        };
        word_run = if pair[1].word == pair[0].word {
            word_run + 1
        } else {
            1
        };
        if color_run > MAX_RUN || word_run > MAX_RUN {
            return true;
        }
    }
    false
}

/// Lista di stimoli bilanciata: metà congruenti, metà incongruenti (12 coppie parola/colore
/// ripetute ciclicamente), ordine casuale con max 3 ripetizioni consecutive.
pub fn generate_stroop(
    params: &StroopParams,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<StroopStimulus> {
    let half = (params.n_trials / 2) as usize;
    let mut all: Vec<StroopStimulus> = (0..half)
        .map(|i| {
            let color = STROOP_COLORS[i % STROOP_COLORS.len()];
            StroopStimulus {
                word: color,
                color,
                congruent: true,
            }
        })
        .collect();
    let pairs: Vec<StroopStimulus> = STROOP_COLORS
        .iter()
        .flat_map(|&word| {
            STROOP_COLORS
                .iter()
                .filter(move |&&color| color != word)
                .map(move |&color| StroopStimulus {
                    word,
                    color,
                    congruent: false,
                })
        })
        .collect();
    all.extend((0..half).map(|i| pairs[i % pairs.len()]));

    // Un solo buffer riusato per tutti i tentativi (niente allocazioni nei ritentativi).
    let mut attempt = all.clone();
    shuffle_in_place(&mut attempt, rand);
    for _ in 0..SHUFFLE_RETRIES {
        if !violates_run(&attempt) {
            break;
        }
        attempt.copy_from_slice(&all);
        shuffle_in_place(&mut attempt, rand);
    }
    attempt
}

/// Stessa permutazione e stesso consumo del RNG di `rng::shuffle`. Il prodotto è >= 0, quindi il
/// troncamento del cast coincide con `floor` (che su x86-64 base è una chiamata a libreria).
fn shuffle_in_place(items: &mut [StroopStimulus], rand: &mut dyn FnMut() -> f64) {
    for i in (1..items.len()).rev() {
        let j = (rand() * (i + 1) as f64) as usize;
        items.swap(i, j);
    }
}

/// Tasto corretto per lo stimolo data la variante.
pub fn correct_key_stroop(s: &StroopStimulus, variant: StroopVariant) -> char {
    match variant {
        StroopVariant::Stroop1 => s.word.key(),
        StroopVariant::Stroop2 => s.color.key(),
    }
}

/// Rappresentazione serializzabile dello stimolo per l'export.
pub fn stroop_stimulus_label(s: &StroopStimulus) -> String {
    format!("{}/{}", s.word.as_str(), s.color.as_str())
}

fn valid_rts(trials: &[TrialResult], condition: &str) -> Vec<f64> {
    trials
        .iter()
        .filter(|t| {
            t.phase == Phase::Test
                && t.condition == condition
                && t.flag == ValidationFlag::Valid
                && t.correct
        })
        .filter_map(|t| t.rt_ms)
        .collect()
}

fn accuracy_by_condition(trials: &[TrialResult], condition: &str) -> f64 {
    let relevant: Vec<&TrialResult> = trials
        .iter()
        .filter(|t| {
            t.phase == Phase::Test
                && t.condition == condition
                && t.flag != ValidationFlag::Interrupted
        })
        .collect();
    if relevant.is_empty() {
        return 0.0;
    }
    relevant.iter().filter(|t| t.correct).count() as f64 / relevant.len() as f64 * 100.0
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn num(label: &str, value: f64, unit: &str) -> SummaryMetric {
    SummaryMetric::new(label, MetricValue::Num(value), Some(unit))
}

/// Metriche di sintesi: accuratezza, RT medio/SD/CV per condizione, effetto interferenza.
pub fn score_stroop(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let rts_con = valid_rts(trials, "congruent");
    let rts_inc = valid_rts(trials, "incongruent");
    let (mean_con, mean_inc) = (mean(&rts_con), mean(&rts_inc));
    let (sd_con, sd_inc) = (standard_deviation(&rts_con), standard_deviation(&rts_inc));
    let acc_con = accuracy_by_condition(trials, "congruent");
    let acc_inc = accuracy_by_condition(trials, "incongruent");
    // Coefficiente di variazione: variabilità intra-soggetto normalizzata.
    let cv = |sd: f64, m: f64| if m > 0.0 { sd / m * 100.0 } else { 0.0 };

    vec![
        num("Accuratezza congruenti", round1(acc_con), "%"),
        num("Accuratezza incongruenti", round1(acc_inc), "%"),
        num("RT medio congruenti", round1(mean_con), "ms"),
        num("RT medio incongruenti", round1(mean_inc), "ms"),
        num("SD RT congruenti", round1(sd_con), "ms"),
        num("SD RT incongruenti", round1(sd_inc), "ms"),
        num("CV RT congruenti", round1(cv(sd_con, mean_con)), "%"),
        num("CV RT incongruenti", round1(cv(sd_inc, mean_inc)), "%"),
        num(
            "Effetto interferenza (inc − con)",
            round1(mean_inc - mean_con),
            "ms",
        ),
        num(
            "Costo in accuratezza (con − inc)",
            round1(acc_con - acc_inc),
            "punti %",
        ),
        SummaryMetric::new(
            "Errori di anticipazione",
            count_flag(trials, ValidationFlag::Anticipation) as f64,
            None,
        ),
        SummaryMetric::new(
            "Errori di omissione",
            count_flag(trials, ValidationFlag::Omission) as f64,
            None,
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::TestId;

    fn params() -> StroopParams {
        StroopParams {
            n_trials: 48,
            fixation_ms: 500,
            timeout_ms: 3000,
            isi_ms: 500,
            practice_trials: 8,
        }
    }

    fn trial(condition: &str, rt: Option<f64>, correct: bool, flag: ValidationFlag) -> TrialResult {
        TrialResult {
            test_id: TestId::Stroop1,
            session_id: "S-0000".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: "ROSSO/ROSSO".into(),
            response: rt.map(|_| "R".to_string()),
            correct,
            rt_ms: rt,
            flag,
            onset_timestamp: 0.0,
        }
    }

    fn metric(trials: &[TrialResult], label: &str) -> MetricValue {
        score_stroop(trials)
            .into_iter()
            .find(|m| m.label.starts_with(label))
            .unwrap()
            .value
    }

    #[test]
    fn should_produce_n_trials_half_congruent_half_incongruent() {
        let seq = generate_stroop(&params(), &mut mulberry32(1));
        assert_eq!(seq.len(), 48);
        assert_eq!(seq.iter().filter(|s| s.congruent).count(), 24);
        assert_eq!(seq.iter().filter(|s| !s.congruent).count(), 24);
    }

    #[test]
    fn should_balance_colors_and_words_six_times_each() {
        let seq = generate_stroop(&params(), &mut mulberry32(3));
        for c in STROOP_COLORS {
            assert_eq!(
                seq.iter().filter(|s| !s.congruent && s.color == c).count(),
                6
            );
            assert_eq!(
                seq.iter().filter(|s| !s.congruent && s.word == c).count(),
                6
            );
            assert_eq!(
                seq.iter().filter(|s| s.congruent && s.color == c).count(),
                6
            );
        }
    }

    #[test]
    fn should_have_word_differ_from_color_only_when_incongruent() {
        for s in generate_stroop(&params(), &mut mulberry32(2)) {
            assert_eq!(s.word == s.color, s.congruent);
        }
    }

    #[test]
    fn should_not_exceed_three_consecutive_repetitions() {
        let seq = generate_stroop(&params(), &mut mulberry32(3));
        assert!(!violates_run(&seq));
    }

    #[test]
    fn should_match_typescript_sequence_for_seed_42() {
        // Valori calcolati eseguendo generateStroop (TS) con mulberry32(42).
        let seq = generate_stroop(&params(), &mut mulberry32(42));
        let labels: Vec<String> = seq.iter().take(8).map(stroop_stimulus_label).collect();
        assert_eq!(labels, SEED42_FIRST8);
    }

    const SEED42_FIRST8: [&str; 8] = [
        "GIALLO/GIALLO",
        "VERDE/ROSSO",
        "VERDE/VERDE",
        "BLU/BLU",
        "ROSSO/ROSSO",
        "VERDE/BLU",
        "GIALLO/BLU",
        "BLU/ROSSO",
    ];

    #[test]
    fn should_pick_key_by_word_or_color_depending_on_variant() {
        let s = StroopStimulus {
            word: StroopColor::Rosso,
            color: StroopColor::Blu,
            congruent: false,
        };
        assert_eq!(correct_key_stroop(&s, StroopVariant::Stroop1), 'R');
        assert_eq!(correct_key_stroop(&s, StroopVariant::Stroop2), 'B');
    }

    #[test]
    fn should_compute_interference_as_inc_minus_con() {
        let v = ValidationFlag::Valid;
        let trials = [
            trial("congruent", Some(500.0), true, v),
            trial("congruent", Some(600.0), true, v),
            trial("incongruent", Some(800.0), true, v),
            trial("incongruent", Some(900.0), true, v),
        ];
        assert_eq!(
            metric(&trials, "Effetto interferenza"),
            MetricValue::Num(300.0)
        );
    }

    #[test]
    fn should_compute_accuracy_cost_in_percentage_points() {
        let v = ValidationFlag::Valid;
        let trials = [
            trial("congruent", Some(500.0), true, v),
            trial("congruent", Some(500.0), true, v),
            trial("incongruent", Some(500.0), true, v),
            trial("incongruent", Some(500.0), false, v),
        ];
        assert_eq!(
            metric(&trials, "Costo in accuratezza"),
            MetricValue::Num(50.0)
        );
    }

    #[test]
    fn should_exclude_interrupted_trials_from_accuracy() {
        let trials = [
            trial("congruent", Some(500.0), true, ValidationFlag::Valid),
            trial("congruent", Some(500.0), false, ValidationFlag::Interrupted),
        ];
        assert_eq!(
            metric(&trials, "Accuratezza congruenti"),
            MetricValue::Num(100.0)
        );
    }

    #[test]
    fn should_count_anticipations_and_omissions() {
        let trials = [
            trial(
                "incongruent",
                Some(100.0),
                false,
                ValidationFlag::Anticipation,
            ),
            trial("incongruent", None, false, ValidationFlag::Omission),
        ];
        assert_eq!(
            metric(&trials, "Errori di anticipazione"),
            MetricValue::Num(1.0)
        );
        assert_eq!(
            metric(&trials, "Errori di omissione"),
            MetricValue::Num(1.0)
        );
    }
}
