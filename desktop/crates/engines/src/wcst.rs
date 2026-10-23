//! Wisconsin Card Sorting Test (WCST) — flessibilità cognitiva e set-shifting.
//! Porta `src/engine/tests/wcst.ts` (Berg 1948; Grant & Berg 1948; Heaton; Kongs et al. 2000).
//!
//! Il criterio (Colore→Forma→Numero, ciclico) cambia in segreto dopo N risposte corrette consecutive.
use serde::{Deserialize, Serialize};
use sintropia_core::rng::shuffle;
use sintropia_core::types::{js_round, Phase, SummaryMetric, TrialResult, ValidationFlag};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Dim {
    Color,
    Shape,
    Number,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Color {
    Red,
    Green,
    Yellow,
    Blue,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Shape {
    Triangle,
    Star,
    Cross,
    Circle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Card {
    pub color: Color,
    pub shape: Shape,
    /// Da 1 a 4.
    pub number: u8,
}

/// Le 4 carte stimolo standard.
pub const WCST_STIMULUS_CARDS: [Card; 4] = [
    Card {
        color: Color::Red,
        shape: Shape::Triangle,
        number: 1,
    },
    Card {
        color: Color::Green,
        shape: Shape::Star,
        number: 2,
    },
    Card {
        color: Color::Yellow,
        shape: Shape::Cross,
        number: 3,
    },
    Card {
        color: Color::Blue,
        shape: Shape::Circle,
        number: 4,
    },
];

/// Ordine ciclico dei criteri.
pub const WCST_RULE_ORDER: [Dim; 3] = [Dim::Color, Dim::Shape, Dim::Number];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    pub deck_size: usize,
    /// Corrette consecutive richieste per il cambio di categoria (default 10).
    pub run_to_shift: usize,
    /// Numero di categorie da completare per terminare (default 6).
    pub max_categories: usize,
}

const ALL_COLORS: [Color; 4] = [Color::Red, Color::Green, Color::Yellow, Color::Blue];
const ALL_SHAPES: [Shape; 4] = [Shape::Triangle, Shape::Star, Shape::Cross, Shape::Circle];

/// Vero se la carta scelta combacia con il bersaglio sulla dimensione data.
pub fn matches_on(target: &Card, choice: &Card, dim: Dim) -> bool {
    match dim {
        Dim::Color => target.color == choice.color,
        Dim::Shape => target.shape == choice.shape,
        Dim::Number => target.number == choice.number,
    }
}

/// Dimensioni su cui due carte combaciano.
pub fn matching_dims(target: &Card, choice: &Card) -> Vec<Dim> {
    WCST_RULE_ORDER
        .into_iter()
        .filter(|&dim| matches_on(target, choice, dim))
        .collect()
}

/// Mazzo di risposta: permutazioni delle 64 combinazioni (4 × 4 × 4), ripetute se `deck_size` > 64.
pub fn build_deck(deck_size: usize, rand: &mut dyn FnMut() -> f64) -> Vec<Card> {
    let mut all: Vec<Card> = Vec::with_capacity(64);
    for color in ALL_COLORS {
        for shape in ALL_SHAPES {
            for number in 1..=4 {
                all.push(Card {
                    color,
                    shape,
                    number,
                });
            }
        }
    }
    let mut deck: Vec<Card> = Vec::with_capacity(deck_size + 64);
    while deck.len() < deck_size {
        deck.extend(shuffle(&all, rand));
    }
    deck.truncate(deck_size);
    deck
}

/// Regola attiva data la categoria corrente (0-based).
pub fn rule_for_category(category_index: usize) -> Dim {
    WCST_RULE_ORDER[category_index % WCST_RULE_ORDER.len()]
}

/// Metadati per trial necessari allo scoring (prodotti dal runtime).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrialMeta {
    /// Regola attiva in questo trial.
    pub current_rule: Dim,
    /// Dimensioni su cui la carta scelta combaciava col bersaglio.
    pub matched_dims: Vec<Dim>,
}

/// Esito di una risposta ai fini dello scoring perseverativo.
#[derive(Debug, Clone, PartialEq)]
pub struct Step {
    pub correct: bool,
    pub matched: Vec<Dim>,
}

/// Conteggi perseverativi: gli errori sono un sottoinsieme delle risposte perseverative.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PerseverationCounts {
    pub errors: usize,
    pub responses: usize,
}

/// Errori non ambigui consecutivi che cambiano il principio perseverato.
const THREE_ERRORS: usize = 3;

struct Candidate {
    dim: Dim,
    unambiguous: Vec<usize>,
    between: Vec<usize>,
}

/// Principio perseverato (PP) e regole di conteggio secondo Heaton et al. (1993), come descritto da
/// Howlett & Moseley (2024) — vedi il commento omonimo in `wcst.ts` e `docs/scientific/wcst.md`.
/// Non validato rispetto al software ufficiale PAR.
struct PerseverationScanner<'a> {
    steps: &'a [Step],
    rules: &'a [Dim],
    run_to_shift: usize,
    pp: Option<Dim>,
    correct_run: usize,
    /// Indici delle risposte perseverative.
    flagged: Vec<usize>,
    candidate: Option<Candidate>,
    /// L'ultima risposta è stata un errore non ambiguo perseverativo.
    sandwich_open: bool,
    /// Ambigue combacianti col PP dopo l'ultimo errore perseverativo.
    pending: Vec<usize>,
}

impl<'a> PerseverationScanner<'a> {
    fn new(steps: &'a [Step], rules: &'a [Dim], run_to_shift: usize) -> Self {
        Self {
            steps,
            rules,
            run_to_shift,
            pp: None,
            correct_run: 0,
            flagged: Vec::new(),
            candidate: None,
            sandwich_open: false,
            pending: Vec::new(),
        }
    }

    fn run(mut self) -> PerseverationCounts {
        for i in 0..self.steps.len() {
            self.visit(i);
        }
        let flagged: BTreeSet<usize> = self.flagged.iter().copied().collect();
        let errors = flagged.iter().filter(|&&i| !self.steps[i].correct).count();
        PerseverationCounts {
            errors,
            responses: flagged.len(),
        }
    }

    fn visit(&mut self, i: usize) {
        let step = &self.steps[i];
        let rule = self.rules[i];
        let unambiguous = step.matched.len() == 1;
        let dim = step.matched.first().copied();
        let correct = step.correct;

        if let (false, true, None, Some(d)) = (correct, unambiguous, self.pp, dim) {
            if d != rule {
                self.pp = Some(d);
            }
        }
        let perseverative_error =
            !correct && unambiguous && dim.is_some() && self.pp == dim && dim != Some(rule);

        if perseverative_error {
            self.on_perseverative_error(i);
        } else {
            self.on_other_response(i, unambiguous);
        }

        if correct {
            self.on_correct(rule);
        } else {
            self.correct_run = 0;
        }
    }

    fn on_perseverative_error(&mut self, i: usize) {
        if self.sandwich_open {
            let pending = std::mem::take(&mut self.pending);
            self.flagged.extend(pending);
        }
        self.flagged.push(i);
        self.sandwich_open = true;
        self.pending.clear();
        self.candidate = None;
    }

    fn on_other_response(&mut self, i: usize, unambiguous: bool) {
        let matched = &self.steps[i].matched;
        let ambiguous_on_pp = matched.len() > 1 && self.pp.is_some_and(|pp| matched.contains(&pp));
        if self.sandwich_open && ambiguous_on_pp {
            self.pending.push(i);
        } else {
            self.sandwich_open = false;
            self.pending.clear();
        }
        self.track_three_errors(i, unambiguous);
    }

    /// Tre errori non ambigui consecutivi sulla stessa dimensione (né corretta né PP) spostano il PP.
    fn track_three_errors(&mut self, i: usize, unambiguous: bool) {
        let step = &self.steps[i];
        let rule = self.rules[i];
        if step.correct {
            self.candidate = None;
        } else if unambiguous {
            let dim = step.matched[0];
            match self.candidate.as_mut() {
                Some(c) if c.dim == dim => c.unambiguous.push(i),
                _ => {
                    self.candidate = Some(Candidate {
                        dim,
                        unambiguous: vec![i],
                        between: Vec::new(),
                    })
                }
            }
            if self
                .candidate
                .as_ref()
                .is_some_and(|c| c.unambiguous.len() >= THREE_ERRORS)
            {
                self.adopt_candidate();
            }
        } else if let Some(c) = self
            .candidate
            .as_mut()
            .filter(|c| step.matched.contains(&c.dim) && !step.matched.contains(&rule))
        {
            if c.unambiguous.len() >= 2 {
                c.between.push(i);
            }
        } else {
            self.candidate = None;
        }
    }

    fn adopt_candidate(&mut self) {
        let Some(c) = self.candidate.take() else {
            return;
        };
        self.pp = Some(c.dim);
        self.flagged.push(c.unambiguous[1]);
        self.flagged.push(c.unambiguous[2]);
        self.flagged.extend(c.between);
        self.sandwich_open = true;
        self.pending.clear();
    }

    fn on_correct(&mut self, rule: Dim) {
        self.correct_run += 1;
        if self.correct_run < self.run_to_shift {
            return;
        }
        self.pp = Some(rule); // il criterio appena abbandonato
        self.correct_run = 0;
        self.candidate = None;
        self.sandwich_open = false;
        self.pending.clear();
    }
}

/// Errori e risposte perseverative di una sequenza di risposte, con le regole attive per ciascuna.
pub fn count_perseveration(
    steps: &[Step],
    rules: &[Dim],
    run_to_shift: usize,
) -> PerseverationCounts {
    PerseverationScanner::new(steps, rules, run_to_shift).run()
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

/// Metriche del WCST. I trial interrotti sono esclusi.
pub fn score_wcst(
    trials: &[TrialResult],
    metas: &[TrialMeta],
    params: &Params,
) -> Vec<SummaryMetric> {
    let test_len = trials
        .iter()
        .filter(|t| t.phase == Phase::Test && t.flag != ValidationFlag::Interrupted)
        .count();
    let rows: Vec<&TrialMeta> = metas.iter().take(test_len).collect();
    let steps: Vec<Step> = rows
        .iter()
        .map(|m| Step {
            correct: m.matched_dims.contains(&m.current_rule),
            matched: m.matched_dims.clone(),
        })
        .collect();
    let rules: Vec<Dim> = rows.iter().map(|m| m.current_rule).collect();

    let run = scan_runs(&steps, params.run_to_shift);
    let total_errors = steps.iter().filter(|s| !s.correct).count();
    let perseveration = count_perseveration(&steps, &rules, params.run_to_shift);
    let pct = |n: usize| -> f64 {
        if test_len > 0 {
            round1(n as f64 / test_len as f64 * 100.0)
        } else {
            0.0
        }
    };

    vec![
        SummaryMetric::new("Categorie completate", run.categories as f64, None),
        SummaryMetric::new("Trial totali", test_len as f64, None),
        SummaryMetric::new("Errori totali", total_errors as f64, None),
        SummaryMetric::new("Errori perseverativi", perseveration.errors as f64, None),
        SummaryMetric::new(
            "% errori perseverativi",
            pct(perseveration.errors),
            Some("%"),
        ),
        SummaryMetric::new(
            "Risposte perseverative",
            perseveration.responses as f64,
            None,
        ),
        SummaryMetric::new(
            "Errori non perseverativi",
            (total_errors - perseveration.errors) as f64,
            None,
        ),
        SummaryMetric::new(
            "Failure to maintain set",
            run.failure_to_maintain_set as f64,
            None,
        ),
        SummaryMetric::new(
            "Risposte a livello concettuale",
            pct(run.conceptual_responses),
            Some("%"),
        ),
        SummaryMetric::new(
            "Trial per la 1ª categoria",
            run.trials_to_first_category.unwrap_or(test_len) as f64,
            None,
        ),
    ]
}

struct RunStats {
    categories: usize,
    failure_to_maintain_set: usize,
    conceptual_responses: usize,
    trials_to_first_category: Option<usize>,
}

/// Categorie, failure to maintain set e corse concettuali (>= 3 corrette consecutive, non azzerate dal cambio).
fn scan_runs(steps: &[Step], run_to_shift: usize) -> RunStats {
    let mut stats = RunStats {
        categories: 0,
        failure_to_maintain_set: 0,
        conceptual_responses: 0,
        trials_to_first_category: None,
    };
    let mut consecutive_correct = 0usize; // si azzera anche al cambio di categoria
    let mut correct_run = 0usize; // corsa concettuale: NON si azzera al cambio di categoria

    for (i, step) in steps.iter().enumerate() {
        if !step.correct {
            if correct_run >= 3 {
                stats.conceptual_responses += correct_run;
            }
            correct_run = 0;
            if consecutive_correct >= 5 && consecutive_correct < run_to_shift {
                stats.failure_to_maintain_set += 1;
            }
            consecutive_correct = 0;
            continue;
        }
        consecutive_correct += 1;
        correct_run += 1;
        if consecutive_correct >= run_to_shift {
            stats.categories += 1;
            stats.trials_to_first_category.get_or_insert(i + 1);
            consecutive_correct = 0;
        }
    }
    if correct_run >= 3 {
        stats.conceptual_responses += correct_run;
    }
    stats
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::{MetricValue, TestId};

    /// Prime 6 carte del mazzo (seme 1) come "colore/forma/numero", dal motore TypeScript.
    const DECK_SEED_1: [&str; 6] = [
        "blue/cross/1",
        "blue/circle/1",
        "yellow/circle/2",
        "green/cross/3",
        "green/star/3",
        "red/cross/3",
    ];

    const COLOR: Dim = Dim::Color;
    const SHAPE: Dim = Dim::Shape;
    const NUMBER: Dim = Dim::Number;

    fn params(run_to_shift: usize) -> Params {
        Params {
            deck_size: 64,
            run_to_shift,
            max_categories: 6,
        }
    }

    fn card(color: Color, shape: Shape, number: u8) -> Card {
        Card {
            color,
            shape,
            number,
        }
    }

    fn make_trials(seq: &[(Vec<Dim>, Dim)]) -> (Vec<TrialResult>, Vec<TrialMeta>) {
        let trials = seq
            .iter()
            .enumerate()
            .map(|(i, (matched, rule))| TrialResult {
                test_id: TestId::Wcst,
                session_id: "W".into(),
                trial_index: i as u32,
                phase: Phase::Test,
                condition: format!("{rule:?}").to_lowercase(),
                stimulus: "card".into(),
                response: Some("choice".into()),
                correct: matched.contains(rule),
                rt_ms: Some(800.0),
                flag: ValidationFlag::Valid,
                onset_timestamp: 0.0,
            })
            .collect();
        let metas = seq
            .iter()
            .map(|(matched, rule)| TrialMeta {
                current_rule: *rule,
                matched_dims: matched.clone(),
            })
            .collect();
        (trials, metas)
    }

    fn metric(summary: &[SummaryMetric], label: &str) -> f64 {
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
    fn should_expose_the_four_standard_stimulus_cards() {
        assert_eq!(WCST_STIMULUS_CARDS[0], card(Color::Red, Shape::Triangle, 1));
        assert_eq!(WCST_STIMULUS_CARDS[3], card(Color::Blue, Shape::Circle, 4));
    }

    #[test]
    fn should_match_on_the_requested_dimension() {
        let a = card(Color::Red, Shape::Star, 3);
        let b = card(Color::Red, Shape::Circle, 1);
        assert!(matches_on(&a, &b, COLOR));
        assert!(!matches_on(&a, &b, SHAPE));
        assert!(!matches_on(&a, &b, NUMBER));
    }

    #[test]
    fn should_list_all_matching_dimensions() {
        let a = card(Color::Red, Shape::Star, 3);
        let b = card(Color::Red, Shape::Star, 1);
        assert_eq!(matching_dims(&a, &b), [COLOR, SHAPE]);
    }

    #[test]
    fn should_build_deck_of_requested_size() {
        assert_eq!(build_deck(64, &mut mulberry32(1)).len(), 64);
        assert_eq!(build_deck(128, &mut mulberry32(1)).len(), 128);
    }

    #[test]
    fn should_cover_every_combination_once_in_a_64_card_deck() {
        let deck = build_deck(64, &mut mulberry32(3));
        let unique: std::collections::HashSet<Card> = deck.into_iter().collect();
        assert_eq!(unique.len(), 64);
    }

    #[test]
    fn should_match_typescript_deck_for_seed_1() {
        let deck = build_deck(64, &mut mulberry32(1));
        let head: Vec<String> = deck
            .iter()
            .take(DECK_SEED_1.len())
            .map(|c| format!("{:?}/{:?}/{}", c.color, c.shape, c.number).to_lowercase())
            .collect();
        assert_eq!(head, DECK_SEED_1);
    }

    #[test]
    fn should_cycle_rules_color_shape_number() {
        assert_eq!(rule_for_category(0), COLOR);
        assert_eq!(rule_for_category(1), SHAPE);
        assert_eq!(rule_for_category(2), NUMBER);
        assert_eq!(rule_for_category(3), COLOR);
        assert_eq!(WCST_RULE_ORDER, [COLOR, SHAPE, NUMBER]);
    }

    #[test]
    fn should_count_categories_after_run_to_shift_consecutive_correct() {
        let seq = vec![(vec![COLOR], COLOR); 3];
        let (trials, metas) = make_trials(&seq);
        let s = score_wcst(&trials, &metas, &params(3));
        assert_eq!(metric(&s, "Categorie completate"), 1.0);
        assert_eq!(metric(&s, "Errori totali"), 0.0);
    }

    #[test]
    fn should_count_perseverative_errors_on_the_abandoned_rule() {
        let seq = vec![
            (vec![COLOR], COLOR),
            (vec![COLOR], COLOR),
            (vec![COLOR], COLOR),
            (vec![COLOR], SHAPE),
            (vec![COLOR], SHAPE),
        ];
        let (trials, metas) = make_trials(&seq);
        let s = score_wcst(&trials, &metas, &params(3));
        assert_eq!(metric(&s, "Categorie completate"), 1.0);
        assert_eq!(metric(&s, "Errori totali"), 2.0);
        assert_eq!(metric(&s, "Errori perseverativi"), 2.0);
        assert_eq!(metric(&s, "% errori perseverativi"), 40.0);
        assert_eq!(metric(&s, "Risposte a livello concettuale"), 60.0);
        assert_eq!(metric(&s, "Trial per la 1ª categoria"), 3.0);
    }

    #[test]
    fn should_detect_failure_to_maintain_set_after_five_to_nine_correct() {
        let mut seq = vec![(vec![COLOR], COLOR); 6];
        seq.push((vec![SHAPE], COLOR));
        let (trials, metas) = make_trials(&seq);
        let s = score_wcst(&trials, &metas, &params(10));
        assert_eq!(metric(&s, "Failure to maintain set"), 1.0);
    }

    #[test]
    fn should_skip_missing_metas_and_practice_trials() {
        let seq = vec![(vec![COLOR], COLOR); 3];
        let (mut trials, metas) = make_trials(&seq);
        trials[0].phase = Phase::Practice;
        let s = score_wcst(&trials, &metas[..1], &params(3));
        assert_eq!(metric(&s, "Trial totali"), 2.0);
        assert_eq!(metric(&s, "Errori totali"), 0.0);
    }

    // --- countPerseveration (wcst.perseveration.test.ts) ---

    fn step(matched: &[Dim], rule: Dim) -> (Step, Dim) {
        (
            Step {
                correct: matched.contains(&rule),
                matched: matched.to_vec(),
            },
            rule,
        )
    }

    fn color(matched: &[Dim]) -> (Step, Dim) {
        step(matched, COLOR)
    }

    fn count(seq: &[(Step, Dim)], run_to_shift: usize) -> (usize, usize) {
        let steps: Vec<Step> = seq.iter().map(|(s, _)| s.clone()).collect();
        let rules: Vec<Dim> = seq.iter().map(|(_, r)| *r).collect();
        let c = count_perseveration(&steps, &rules, run_to_shift);
        (c.errors, c.responses)
    }

    #[test]
    fn should_establish_pp_at_first_unambiguous_error_and_count_following_errors() {
        let seq = [color(&[SHAPE]), color(&[SHAPE]), color(&[SHAPE])];
        assert_eq!(count(&seq, 10), (3, 3));
    }

    #[test]
    fn should_not_treat_a_response_matching_nothing_as_perseverative() {
        let seq = [color(&[]), color(&[SHAPE])];
        assert_eq!(count(&seq, 10), (1, 1));
    }

    #[test]
    fn should_set_pp_to_abandoned_criterion_after_category_completion() {
        let seq = [
            step(&[COLOR], COLOR),
            step(&[COLOR], COLOR),
            step(&[COLOR], COLOR),
            step(&[COLOR], SHAPE),
            step(&[NUMBER], SHAPE),
        ];
        assert_eq!(count(&seq, 3), (1, 1));
    }

    #[test]
    fn should_not_count_ambiguous_error_on_pp_when_not_sandwiched() {
        let seq = [color(&[SHAPE]), color(&[SHAPE, NUMBER]), color(&[NUMBER])];
        assert_eq!(count(&seq, 10), (1, 1));
    }

    #[test]
    fn should_count_ambiguous_error_sandwiched_between_perseverative_errors() {
        let seq = [color(&[SHAPE]), color(&[SHAPE, NUMBER]), color(&[SHAPE])];
        assert_eq!(count(&seq, 10), (3, 3));
    }

    #[test]
    fn should_count_sandwiched_ambiguous_correct_response_as_perseverative_but_not_error() {
        let seq = [color(&[SHAPE]), color(&[COLOR, SHAPE]), color(&[SHAPE])];
        assert_eq!(count(&seq, 10), (2, 3));
    }

    #[test]
    fn should_break_the_sandwich_on_an_unambiguous_correct_response() {
        let seq = [
            color(&[SHAPE]),
            color(&[COLOR]),
            color(&[SHAPE, NUMBER]),
            color(&[SHAPE]),
        ];
        assert_eq!(count(&seq, 10), (2, 2));
    }

    #[test]
    fn should_not_count_ambiguous_response_right_after_category_completion() {
        let seq = [
            step(&[COLOR], COLOR),
            step(&[COLOR], COLOR),
            step(&[COLOR], COLOR),
            step(&[COLOR, NUMBER], SHAPE),
            step(&[COLOR], SHAPE),
        ];
        assert_eq!(count(&seq, 3), (1, 1));
    }

    #[test]
    fn should_shift_pp_after_three_consecutive_errors_on_a_new_dimension() {
        let seq = [
            color(&[SHAPE]),
            color(&[NUMBER]),
            color(&[NUMBER]),
            color(&[NUMBER]),
            color(&[NUMBER]),
        ];
        assert_eq!(count(&seq, 10), (4, 4));
    }

    #[test]
    fn should_not_shift_pp_when_errors_are_not_consecutive() {
        let seq = [
            color(&[SHAPE]),
            color(&[NUMBER]),
            color(&[COLOR]),
            color(&[NUMBER]),
            color(&[NUMBER]),
        ];
        assert_eq!(count(&seq, 10), (1, 1));
    }

    #[test]
    fn should_count_ambiguous_responses_between_second_and_third_error_as_perseverative() {
        let seq = [
            color(&[SHAPE]),
            color(&[NUMBER]),
            color(&[NUMBER]),
            color(&[NUMBER, SHAPE]),
            color(&[NUMBER]),
        ];
        assert_eq!(count(&seq, 10), (4, 4));
    }
}
