//! Flanker Task (Eriksen) — attenzione selettiva e controllo dell'interferenza.
//! Porta `src/engine/tests/flanker.ts`. Eriksen & Eriksen (1974); Gratton, Coles & Donchin (1992).
//! Vedi docs/scientific/flanker.md
use serde::{Deserialize, Serialize};
use sintropia_core::rng::{rand_int, shuffle};
use sintropia_core::types::{
    js_round, MetricValue, Phase, SummaryMetric, TrialResult, ValidationFlag,
};
use sintropia_core::validation::{count_flag, mean, standard_deviation};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlankerParams {
    pub n_trials: u32,
    /// Quota di trial incongruenti (es. 0.4).
    pub incongruent_ratio: f64,
    /// Quota di trial neutri, senza frecce distrattrici (es. 0.2).
    pub neutral_ratio: f64,
    pub fixation_ms: u32,
    /// Finestra di risposta (ms); lo stimolo resta fino alla risposta o al timeout.
    pub response_window_ms: u32,
    pub isi_min_ms: u32,
    pub isi_max_ms: u32,
    pub practice_trials: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FlankerCondition {
    Congruent,
    Incongruent,
    Neutral,
}

impl FlankerCondition {
    /// Etichetta come nel TS (`congruent`, ...).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Congruent => "congruent",
            Self::Incongruent => "incongruent",
            Self::Neutral => "neutral",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FlankerDirection {
    Left,
    Right,
}

impl FlankerDirection {
    fn arrow(self) -> &'static str {
        match self {
            Self::Left => "←",
            Self::Right => "→",
        }
    }

    fn opposite(self) -> Self {
        match self {
            Self::Left => Self::Right,
            Self::Right => Self::Left,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlankerStimulus {
    pub condition: FlankerCondition,
    /// Direzione della freccia centrale = risposta corretta.
    pub direction: FlankerDirection,
    /// Stringa dello stimolo, es. "←←→←←" (freccia centrale in mezzo).
    pub arrows: String,
    /// ISI (schermo vuoto) che segue questo stimolo, in ms.
    pub isi_ms: u32,
}

const NEUTRAL_FLANKER: &str = "–";
const FLANKERS_PER_SIDE: usize = 2;
/// Mai più di 3 trial consecutivi della stessa condizione né della stessa risposta.
const MAX_RUN: usize = 3;
const SHUFFLE_ATTEMPTS: u32 = 300;

/// Compone lo stimolo a 5 elementi: 2 flanker, target, 2 flanker.
pub fn build_arrows(condition: FlankerCondition, direction: FlankerDirection) -> String {
    let flanker = match condition {
        FlankerCondition::Congruent => direction.arrow(),
        FlankerCondition::Incongruent => direction.opposite().arrow(),
        FlankerCondition::Neutral => NEUTRAL_FLANKER,
    }
    .repeat(FLANKERS_PER_SIDE);
    format!("{flanker}{}{flanker}", direction.arrow())
}

/// Conteggi per condizione, nell'ordine di consumo del RNG del TS: incongruenti, neutri, congruenti.
fn condition_counts(params: &FlankerParams) -> [(FlankerCondition, usize); 3] {
    let n = f64::from(params.n_trials);
    let incongruent = js_round(n * params.incongruent_ratio) as i64;
    let neutral = js_round(n * params.neutral_ratio) as i64;
    let congruent = (i64::from(params.n_trials) - incongruent - neutral).max(0);
    [
        (FlankerCondition::Incongruent, incongruent.max(0) as usize),
        (FlankerCondition::Neutral, neutral.max(0) as usize),
        (FlankerCondition::Congruent, congruent as usize),
    ]
}

/// Direzioni bilanciate dentro ogni condizione (metà sinistra, metà destra; l'eventuale resto è casuale).
fn directions_for(count: usize, rand: &mut dyn FnMut() -> f64) -> Vec<FlankerDirection> {
    let half = count / 2;
    let mut list = vec![FlankerDirection::Left; half];
    list.extend(vec![FlankerDirection::Right; half]);
    if count % 2 == 1 {
        list.push(if rand() < 0.5 {
            FlankerDirection::Left
        } else {
            FlankerDirection::Right
        });
    }
    list
}

#[derive(Debug, Clone)]
struct Draft {
    condition: FlankerCondition,
    direction: FlankerDirection,
    arrows: String,
}

/// True se aggiungere `candidate` non crea una serie più lunga di MAX_RUN (stessa condizione o stessa risposta).
fn can_append(sequence: &[Draft], candidate: &Draft) -> bool {
    if sequence.len() < MAX_RUN {
        return true;
    }
    let tail = &sequence[sequence.len() - MAX_RUN..];
    let same_condition = tail.iter().all(|s| s.condition == candidate.condition);
    let same_direction = tail.iter().all(|s| s.direction == candidate.direction);
    !same_condition && !same_direction
}

/// Ordina il pool costruendo la sequenza passo per passo: a ogni passo prende il primo trial
/// (in ordine casuale) che rispetta i limiti di ripetizione; se resta bloccata riparte.
fn arrange(pool: &[Draft], rand: &mut dyn FnMut() -> f64) -> Vec<Draft> {
    for _ in 0..SHUFFLE_ATTEMPTS {
        let mut remaining = shuffle(pool, rand);
        let mut sequence: Vec<Draft> = Vec::with_capacity(pool.len());
        while !remaining.is_empty() {
            match remaining.iter().position(|c| can_append(&sequence, c)) {
                Some(index) => sequence.push(remaining.remove(index)),
                None => break,
            }
        }
        if remaining.is_empty() {
            return sequence;
        }
    }
    shuffle(pool, rand)
}

/// Sequenza: conteggi esatti per condizione, direzioni bilanciate, ordine pseudo-casuale con run
/// massimi limitati e ISI uniforme per trial.
pub fn generate_flanker(
    params: &FlankerParams,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<FlankerStimulus> {
    let mut pool: Vec<Draft> = Vec::new();
    for (condition, count) in condition_counts(params) {
        for direction in directions_for(count, rand) {
            pool.push(Draft {
                condition,
                direction,
                arrows: build_arrows(condition, direction),
            });
        }
    }
    arrange(&pool, rand)
        .into_iter()
        .map(|d| FlankerStimulus {
            condition: d.condition,
            direction: d.direction,
            arrows: d.arrows,
            isi_ms: rand_int(
                i64::from(params.isi_min_ms),
                i64::from(params.isi_max_ms),
                rand,
            ) as u32,
        })
        .collect()
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn rts_of(trials: &[&TrialResult]) -> Vec<f64> {
    trials
        .iter()
        .filter(|t| t.flag == ValidationFlag::Valid && t.correct)
        .filter_map(|t| t.rt_ms)
        .collect()
}

fn accuracy_percent(trials: &[&TrialResult]) -> f64 {
    let scored: Vec<&&TrialResult> = trials
        .iter()
        .filter(|t| t.flag != ValidationFlag::Interrupted)
        .collect();
    if scored.is_empty() {
        return 0.0;
    }
    scored.iter().filter(|t| t.correct).count() as f64 / scored.len() as f64 * 100.0
}

fn is_comparable(condition: &str) -> bool {
    condition == "congruent" || condition == "incongruent"
}

/// Adattamento al conflitto (Gratton, Coles & Donchin, 1992): ritorna (cI − cC) − (iI − iC), con
/// c/i = congruenza del trial precedente e C/I = del trial corrente; considera solo trial
/// consecutivi preceduti da una risposta corretta. `None` se una cella è vuota.
pub fn conflict_adaptation(trials: &[TrialResult]) -> Option<f64> {
    let mut cells: [Vec<f64>; 4] = Default::default(); // cC, cI, iC, iI
    let by_index: HashMap<u32, &TrialResult> = trials.iter().map(|t| (t.trial_index, t)).collect();
    for current in trials {
        let Some(previous) = current
            .trial_index
            .checked_sub(1)
            .and_then(|i| by_index.get(&i))
        else {
            continue;
        };
        let rt = match current.rt_ms {
            Some(rt) if current.flag == ValidationFlag::Valid && current.correct => rt,
            _ => continue,
        };
        let previous_counts = previous.correct && previous.flag != ValidationFlag::Interrupted;
        if !previous_counts
            || !is_comparable(&previous.condition)
            || !is_comparable(&current.condition)
        {
            continue;
        }
        let previous_idx = usize::from(previous.condition != "congruent") * 2;
        let current_idx = usize::from(current.condition != "congruent");
        cells[previous_idx + current_idx].push(rt);
    }
    if cells.iter().any(Vec::is_empty) {
        return None;
    }
    let m = |i: usize| mean(&cells[i]);
    Some((m(1) - m(0)) - (m(3) - m(2)))
}

fn num(label: &str, value: f64, unit: Option<&str>) -> SummaryMetric {
    SummaryMetric::new(label, MetricValue::Num(value), unit)
}

/// Metrica con trattino lungo (senza unità) quando il valore non è calcolabile.
fn num_or_dash(label: &str, value: Option<f64>, unit: &str) -> SummaryMetric {
    match value {
        Some(v) => num(label, round1(v), Some(unit)),
        None => SummaryMetric::new(label, "—", None),
    }
}

/// Metriche: RT e accuratezza per condizione, effetto flanker (incongruente − congruente),
/// interferenza (incongruente − neutro), facilitazione (neutro − congruente), costo in accuratezza,
/// adattamento al conflitto, variabilità e trial invalidi.
pub fn score_flanker(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let test: Vec<TrialResult> = trials
        .iter()
        .filter(|t| t.phase == Phase::Test)
        .cloned()
        .collect();
    let by = |condition: FlankerCondition| -> Vec<&TrialResult> {
        test.iter()
            .filter(|t| t.condition == condition.as_str())
            .collect()
    };
    let (congruent, incongruent, neutral) = (
        by(FlankerCondition::Congruent),
        by(FlankerCondition::Incongruent),
        by(FlankerCondition::Neutral),
    );
    let rt_con = mean(&rts_of(&congruent));
    let rt_inc = mean(&rts_of(&incongruent));
    let rt_neu = mean(&rts_of(&neutral));
    let neutral_value = |v: f64| (!neutral.is_empty()).then_some(v);
    let acc_con = accuracy_percent(&congruent);
    let acc_inc = accuracy_percent(&incongruent);
    let all: Vec<&TrialResult> = test.iter().collect();

    vec![
        num("RT medio congruenti", round1(rt_con), Some("ms")),
        num("RT medio incongruenti", round1(rt_inc), Some("ms")),
        num_or_dash("RT medio neutri", neutral_value(rt_neu), "ms"),
        num(
            "Effetto flanker (incongruenti − congruenti)",
            round1(rt_inc - rt_con),
            Some("ms"),
        ),
        num_or_dash(
            "Interferenza (incongruenti − neutri)",
            neutral_value(rt_inc - rt_neu),
            "ms",
        ),
        num_or_dash(
            "Facilitazione (neutri − congruenti)",
            neutral_value(rt_neu - rt_con),
            "ms",
        ),
        num("Accuratezza congruenti", round1(acc_con), Some("%")),
        num("Accuratezza incongruenti", round1(acc_inc), Some("%")),
        num(
            "Costo in accuratezza (congruenti − incongruenti)",
            round1(acc_con - acc_inc),
            Some("punti %"),
        ),
        num_or_dash(
            "Adattamento al conflitto (Gratton)",
            conflict_adaptation(&test),
            "ms",
        ),
        num(
            "SD RT (tutti i corretti)",
            round1(standard_deviation(&rts_of(&all))),
            Some("ms"),
        ),
        num(
            "Errori di omissione",
            count_flag(&test, ValidationFlag::Omission) as f64,
            None,
        ),
        num(
            "Errori di anticipazione",
            count_flag(&test, ValidationFlag::Anticipation) as f64,
            None,
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::TestId;

    fn params() -> FlankerParams {
        FlankerParams {
            n_trials: 96,
            incongruent_ratio: 0.4,
            neutral_ratio: 0.2,
            fixation_ms: 500,
            response_window_ms: 1500,
            isi_min_ms: 700,
            isi_max_ms: 1100,
            practice_trials: 12,
        }
    }

    fn trial(index: u32, condition: FlankerCondition, rt: Option<f64>) -> TrialResult {
        TrialResult {
            test_id: TestId::Flanker,
            session_id: "T-0000".into(),
            trial_index: index,
            phase: Phase::Test,
            condition: condition.as_str().into(),
            stimulus: "←←←←←".into(),
            response: rt.map(|_| "arrowleft".to_string()),
            correct: rt.is_some(),
            rt_ms: rt,
            flag: if rt.is_none() {
                ValidationFlag::Omission
            } else {
                ValidationFlag::Valid
            },
            onset_timestamp: 0.0,
        }
    }

    fn sample_trials() -> Vec<TrialResult> {
        use FlankerCondition::*;
        vec![
            trial(0, Congruent, Some(400.0)),
            trial(1, Congruent, Some(420.0)),
            trial(2, Incongruent, Some(500.0)),
            trial(3, Incongruent, Some(520.0)),
            trial(4, Neutral, Some(450.0)),
            trial(5, Incongruent, None),
        ]
    }

    fn metric(trials: &[TrialResult], prefix: &str) -> MetricValue {
        score_flanker(trials)
            .into_iter()
            .find(|m| m.label.starts_with(prefix))
            .unwrap()
            .value
    }

    #[test]
    fn should_use_matching_flankers_when_congruent() {
        use FlankerCondition::Congruent;
        assert_eq!(build_arrows(Congruent, FlankerDirection::Left), "←←←←←");
        assert_eq!(build_arrows(Congruent, FlankerDirection::Right), "→→→→→");
    }

    #[test]
    fn should_use_opposite_flankers_when_incongruent() {
        use FlankerCondition::Incongruent;
        assert_eq!(build_arrows(Incongruent, FlankerDirection::Left), "→→←→→");
        assert_eq!(build_arrows(Incongruent, FlankerDirection::Right), "←←→←←");
    }

    #[test]
    fn should_use_dashes_when_neutral() {
        assert_eq!(
            build_arrows(FlankerCondition::Neutral, FlankerDirection::Left),
            "––←––"
        );
    }

    #[test]
    fn should_produce_the_exact_number_of_trials_per_condition() {
        let stimuli = generate_flanker(&params(), &mut mulberry32(1));
        let count = |c| stimuli.iter().filter(|s| s.condition == c).count();
        assert_eq!(stimuli.len(), 96);
        assert_eq!(count(FlankerCondition::Incongruent), 38);
        assert_eq!(count(FlankerCondition::Neutral), 19);
        assert_eq!(count(FlankerCondition::Congruent), 39);
    }

    #[test]
    fn should_balance_left_and_right_within_each_condition() {
        let p = FlankerParams {
            n_trials: 100,
            ..params()
        };
        let stimuli = generate_flanker(&p, &mut mulberry32(2));
        for c in [
            FlankerCondition::Congruent,
            FlankerCondition::Incongruent,
            FlankerCondition::Neutral,
        ] {
            let group: Vec<_> = stimuli.iter().filter(|s| s.condition == c).collect();
            let left = group
                .iter()
                .filter(|s| s.direction == FlankerDirection::Left)
                .count();
            assert!(left.abs_diff(group.len() - left) <= 1);
        }
    }

    #[test]
    fn should_never_repeat_condition_or_response_more_than_three_times_in_a_row() {
        for seed in 1..=10 {
            let stimuli = generate_flanker(&params(), &mut mulberry32(seed));
            for w in stimuli.windows(4) {
                assert!(!w.iter().all(|s| s.condition == w[0].condition));
                assert!(!w.iter().all(|s| s.direction == w[0].direction));
            }
        }
    }

    #[test]
    fn should_keep_isi_inside_the_configured_range() {
        let stimuli = generate_flanker(&params(), &mut mulberry32(3));
        assert!(stimuli.iter().all(|s| (700..=1100).contains(&s.isi_ms)));
    }

    #[test]
    fn should_be_deterministic_for_the_same_seed() {
        assert_eq!(
            generate_flanker(&params(), &mut mulberry32(9)),
            generate_flanker(&params(), &mut mulberry32(9))
        );
    }

    #[test]
    fn should_match_typescript_sequence_for_seed_42() {
        // Valori calcolati eseguendo generateFlanker (TS) con mulberry32(42).
        let stimuli = generate_flanker(&params(), &mut mulberry32(42));
        let head: Vec<String> = stimuli
            .iter()
            .take(6)
            .map(|s| format!("{}:{}", s.arrows, s.isi_ms))
            .collect();
        assert_eq!(head, SEED42_HEAD);
    }

    const SEED42_HEAD: [&str; 6] = [
        "––←––:1062",
        "→→→→→:737",
        "→→→→→:890",
        "←←→←←:1029",
        "←←←←←:752",
        "←←←←←:1090",
    ];

    #[test]
    fn should_compute_the_flanker_effect_as_incongruent_minus_congruent() {
        assert_eq!(
            metric(&sample_trials(), "Effetto flanker"),
            MetricValue::Num(100.0)
        );
    }

    #[test]
    fn should_split_interference_and_facilitation_around_the_neutral_baseline() {
        assert_eq!(
            metric(&sample_trials(), "Interferenza"),
            MetricValue::Num(60.0)
        );
        assert_eq!(
            metric(&sample_trials(), "Facilitazione"),
            MetricValue::Num(40.0)
        );
    }

    #[test]
    fn should_compute_accuracy_per_condition_counting_omissions_as_errors() {
        assert_eq!(
            metric(&sample_trials(), "Accuratezza incongruenti"),
            MetricValue::Num(66.7)
        );
        assert_eq!(
            metric(&sample_trials(), "Accuratezza congruenti"),
            MetricValue::Num(100.0)
        );
    }

    #[test]
    fn should_ignore_practice_trials() {
        let mut trials = sample_trials();
        let mut practice = trial(9, FlankerCondition::Incongruent, Some(9999.0));
        practice.phase = Phase::Practice;
        trials.push(practice);
        assert_eq!(metric(&trials, "Effetto flanker"), MetricValue::Num(100.0));
    }

    #[test]
    fn should_show_dashes_for_neutral_metrics_when_there_are_no_neutral_trials() {
        let trials: Vec<TrialResult> = sample_trials()
            .into_iter()
            .filter(|t| t.condition != "neutral")
            .collect();
        let m = score_flanker(&trials)
            .into_iter()
            .find(|m| m.label.starts_with("Interferenza"))
            .unwrap();
        assert_eq!(m.value, MetricValue::Text("—".into()));
        assert_eq!(m.unit, None);
    }

    #[test]
    fn should_return_a_positive_gratton_effect_when_interference_shrinks_after_incongruent_trials()
    {
        use FlankerCondition::{Congruent as C, Incongruent as I};
        // coppie (precedente → corrente): cC, cI, iC, iI
        let seq = [
            (C, 400.0),
            (C, 400.0),
            (C, 400.0),
            (I, 560.0),
            (I, 410.0),
            (C, 410.0),
            (I, 410.0),
            (I, 480.0),
        ];
        let trials: Vec<TrialResult> = seq
            .iter()
            .enumerate()
            .map(|(i, &(c, rt))| trial(i as u32, c, Some(rt)))
            .collect();
        // (cI − cC) − (iI − iC) = (560−400) − (480−410) = 90
        assert!(conflict_adaptation(&trials).unwrap() > 0.0);
    }

    #[test]
    fn should_return_none_when_a_transition_cell_is_empty() {
        let trials = [
            trial(0, FlankerCondition::Congruent, Some(400.0)),
            trial(1, FlankerCondition::Congruent, Some(410.0)),
        ];
        assert_eq!(conflict_adaptation(&trials), None);
    }
}
