//! Trail Making Test A e B — velocità visuo-motoria e flessibilità cognitiva.
//! Porta `src/engine/tests/trailMaking.ts`. Reitan (1958); Tombaugh (2004); Sánchez-Cubillo et al. (2009).
//! Vedi docs/scientific/trail-making.md
//!
//! Parte A: collegare in ordine i cerchi 1, 2, 3… Parte B: alternare numeri e lettere 1, A, 2, B, 3, C…
//! Si misura il tempo per completare ciascuna parte e gli errori.
use crate::corsi::js_hypot;
use serde::{Deserialize, Serialize};
use sintropia_core::rng::shuffle;
use sintropia_core::types::{js_round, Phase, SummaryMetric, TestId, TrialResult, ValidationFlag};
use sintropia_core::validation::mean;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    /// Cerchi per parte (la parte B alterna numeri e lettere: al massimo 51).
    pub n_targets: u32,
    /// Cerchi per parte nella pratica.
    pub practice_targets: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TrailPart {
    A,
    B,
}

impl TrailPart {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::A => "A",
            Self::B => "B",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TrailCircle {
    /// Etichetta del cerchio: numero o lettera.
    pub label: String,
    /// Posizione nel campo, in [0, 1].
    pub x: f64,
    pub y: f64,
}

const LETTERS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/// Distanza minima fra i centri, in frazioni del lato del campo.
pub const MIN_DISTANCE: f64 = 0.11;
pub const MARGIN: f64 = 0.06;
const PLACEMENT_ATTEMPTS: usize = 4000;

/// Etichette nell'ordine da collegare: 1…n (A) oppure 1, A, 2, B… (B).
pub fn trail_labels(part: TrailPart, n: usize) -> Vec<String> {
    (0..n)
        .map(|i| match part {
            TrailPart::A => (i + 1).to_string(),
            TrailPart::B if i % 2 == 0 => (i / 2 + 1).to_string(),
            // Oltre 52 cerchi le lettere finiscono (il TS darebbe `undefined`): '?' al loro posto.
            TrailPart::B => LETTERS
                .get((i - 1) / 2)
                .map_or('?', |&c| char::from(c))
                .to_string(),
        })
        .collect()
}

fn place_points(count: usize, rand: &mut dyn FnMut() -> f64) -> Vec<(f64, f64)> {
    let mut points: Vec<(f64, f64)> = Vec::new();
    let span = 1.0 - 2.0 * MARGIN;
    let mut attempt = 0;
    while attempt < PLACEMENT_ATTEMPTS && points.len() < count {
        attempt += 1;
        let x = MARGIN + rand() * span;
        let y = MARGIN + rand() * span;
        if points
            .iter()
            .all(|&(px, py)| js_hypot(px - x, py - y) >= MIN_DISTANCE)
        {
            points.push((x, y));
        }
    }
    // Ripiego: griglia con scarto, se il campo è troppo affollato per l'estrazione casuale.
    let side = (count as f64).sqrt().ceil() as usize;
    let step = span / side as f64;
    while points.len() < count {
        let cell = points.len();
        points.push((
            MARGIN + ((cell % side) as f64 + 0.5) * step,
            MARGIN + ((cell / side) as f64 + 0.5) * step,
        ));
    }
    points
}

/// Cerchi della parte, in ordine di collegamento (`circles[i]` è il bersaglio i-esimo); le posizioni sono casuali.
pub fn generate_trail(
    part: TrailPart,
    n: usize,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<TrailCircle> {
    let labels = trail_labels(part, n);
    let points = shuffle(&place_points(n, rand), rand);
    labels
        .into_iter()
        .zip(points)
        .map(|(label, (x, y))| TrailCircle { label, x, y })
        .collect()
}

/// Andamento di una parte: registra ogni clic come un trial. Un clic sbagliato non fa avanzare (resta lo stesso
/// bersaglio, il tempo scorre); `rt_ms` è il tempo dal clic precedente (o dall'inizio) e `onset_timestamp`
/// l'istante di quel riferimento, così la somma degli `rt_ms` è il tempo totale della parte.
pub struct TrailRun {
    circles: Vec<TrailCircle>,
    part: TrailPart,
    phase: Phase,
    session_id: String,
    next: usize,
    last_ms: f64,
    count: u32,
}

impl TrailRun {
    pub fn new(
        circles: Vec<TrailCircle>,
        part: TrailPart,
        phase: Phase,
        session_id: &str,
        start_ms: f64,
    ) -> Self {
        Self {
            circles,
            part,
            phase,
            session_id: session_id.to_string(),
            next: 0,
            last_ms: start_ms,
            count: 0,
        }
    }

    pub fn done(&self) -> bool {
        self.next >= self.circles.len()
    }

    /// Etichetta del prossimo bersaglio, o `None` a parte completata.
    pub fn target(&self) -> Option<&str> {
        self.circles.get(self.next).map(|c| c.label.as_str())
    }

    /// Registra il clic sul cerchio `circle_index`; `None` a parte finita o se l'indice è fuori campo.
    pub fn click(&mut self, circle_index: usize, now_ms: f64) -> Option<TrialResult> {
        let clicked = self.circles.get(circle_index)?;
        let expected = self.circles.get(self.next)?;
        let correct = circle_index == self.next;
        let result = TrialResult {
            test_id: TestId::TrailMaking,
            session_id: self.session_id.clone(),
            trial_index: self.count,
            phase: self.phase,
            condition: self.part.as_str().to_string(),
            stimulus: expected.label.clone(),
            response: Some(clicked.label.clone()),
            correct,
            rt_ms: Some(now_ms - self.last_ms),
            flag: ValidationFlag::Valid,
            onset_timestamp: self.last_ms,
        };
        self.count += 1;
        self.last_ms = now_ms;
        if correct {
            self.next += 1;
        }
        Some(result)
    }
}

fn in_part(trials: &[TrialResult], part: TrailPart) -> Vec<&TrialResult> {
    trials
        .iter()
        .filter(|t| t.phase == Phase::Test && t.condition == part.as_str())
        .collect()
}

fn rts(clicks: &[&TrialResult]) -> Vec<f64> {
    clicks.iter().map(|t| t.rt_ms.unwrap_or(0.0)).collect()
}

/// Tempo totale della parte in secondi, solo se completata (`n_targets` collegamenti corretti).
fn completed_seconds(clicks: &[&TrialResult], n_targets: usize) -> Option<f64> {
    let correct = clicks.iter().filter(|t| t.correct).count();
    (correct >= n_targets).then(|| rts(clicks).iter().sum::<f64>() / 1000.0)
}

fn round2(x: f64) -> f64 {
    js_round(x * 100.0) / 100.0
}

fn seconds_metric(label: &str, value: Option<f64>) -> SummaryMetric {
    match value {
        Some(v) => SummaryMetric::new(label, round2(v), Some("s")),
        None => SummaryMetric::new(label, "—", None),
    }
}

fn mean_link_metric(label: &str, clicks: &[&TrialResult]) -> SummaryMetric {
    if clicks.is_empty() {
        return SummaryMetric::new(label, "—", None);
    }
    SummaryMetric::new(label, round2(mean(&rts(clicks)) / 1000.0), Some("s"))
}

/// Metriche: tempo e errori per parte, differenza e rapporto B − A, B / A (il tempo di una parte conta solo se è
/// stata completata; `n_targets` è il numero di collegamenti corretti richiesti).
pub fn score_trail_making(trials: &[TrialResult], n_targets: usize) -> Vec<SummaryMetric> {
    let a = in_part(trials, TrailPart::A);
    let b = in_part(trials, TrailPart::B);
    let (time_a, time_b) = (
        completed_seconds(&a, n_targets),
        completed_seconds(&b, n_targets),
    );
    let both = time_a.zip(time_b);
    let errors = |clicks: &[&TrialResult]| clicks.iter().filter(|t| !t.correct).count() as f64;
    vec![
        seconds_metric("Tempo parte A", time_a),
        seconds_metric("Tempo parte B", time_b),
        seconds_metric("Differenza B − A", both.map(|(ta, tb)| tb - ta)),
        match both {
            Some((ta, tb)) if ta > 0.0 => {
                SummaryMetric::new("Rapporto B / A", round2(tb / ta), None)
            }
            _ => SummaryMetric::new("Rapporto B / A", "—", None),
        },
        SummaryMetric::new("Errori parte A", errors(&a), None),
        SummaryMetric::new("Errori parte B", errors(&b), None),
        mean_link_metric("Tempo medio per collegamento A", &a),
        mean_link_metric("Tempo medio per collegamento B", &b),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::MetricValue;

    fn circles(part: TrailPart, n: usize) -> Vec<TrailCircle> {
        generate_trail(part, n, &mut mulberry32(7))
    }

    #[test]
    fn should_label_part_b_alternating_numbers_and_letters() {
        assert_eq!(
            trail_labels(TrailPart::B, 6),
            ["1", "A", "2", "B", "3", "C"]
        );
        assert_eq!(trail_labels(TrailPart::A, 3), ["1", "2", "3"]);
        assert!(trail_labels(TrailPart::A, 0).is_empty());
    }

    #[test]
    fn should_place_circles_apart_and_inside_margins() {
        let c = circles(TrailPart::A, 25);
        let inside = MARGIN..=1.0 - MARGIN;
        for (i, p) in c.iter().enumerate() {
            assert!(inside.contains(&p.x) && inside.contains(&p.y));
            for q in &c[i + 1..] {
                assert!(js_hypot(p.x - q.x, p.y - q.y) >= MIN_DISTANCE);
            }
        }
    }

    #[test]
    fn should_use_grid_fallback_when_field_is_too_crowded() {
        assert_eq!(circles(TrailPart::A, 200).len(), 200);
    }

    #[test]
    fn should_advance_only_on_correct_click_and_chain_times() {
        let mut run = TrailRun::new(
            circles(TrailPart::A, 3),
            TrailPart::A,
            Phase::Test,
            "S",
            1000.0,
        );
        assert_eq!(run.target(), Some("1"));
        let wrong = run.click(2, 1500.0).unwrap();
        assert!(!wrong.correct && run.target() == Some("1"));
        assert_eq!(
            (wrong.rt_ms, wrong.onset_timestamp, wrong.stimulus.as_str()),
            (Some(500.0), 1000.0, "1")
        );
        let ok = run.click(0, 1800.0).unwrap();
        assert!(ok.correct && ok.rt_ms == Some(300.0) && ok.trial_index == 1);
        assert!(run.click(9, 1900.0).is_none());
        run.click(1, 2000.0);
        run.click(2, 2100.0);
        assert!(run.done() && run.target().is_none() && run.click(0, 2200.0).is_none());
    }

    fn click(part: &str, correct: bool, rt: f64, phase: Phase) -> TrialResult {
        TrialResult {
            test_id: TestId::TrailMaking,
            session_id: "S".into(),
            trial_index: 0,
            phase,
            condition: part.into(),
            stimulus: "1".into(),
            response: Some("1".into()),
            correct,
            rt_ms: Some(rt),
            flag: ValidationFlag::Valid,
            onset_timestamp: 0.0,
        }
    }

    #[test]
    fn should_report_dashes_for_incomplete_parts_and_empty_list() {
        let empty = score_trail_making(&[], 2);
        assert_eq!(empty.len(), 8);
        assert_eq!(empty[0].value, MetricValue::Text("—".into()));
        assert_eq!(empty[4].value, MetricValue::Num(0.0));
        let partial = [click("A", true, 1000.0, Phase::Test)];
        assert_eq!(
            score_trail_making(&partial, 2)[0].value,
            MetricValue::Text("—".into())
        );
    }

    #[test]
    fn should_score_both_parts_excluding_practice() {
        let trials = [
            click("A", true, 1000.0, Phase::Test),
            click("A", false, 500.0, Phase::Test),
            click("A", true, 500.0, Phase::Test),
            click("B", true, 3000.0, Phase::Test),
            click("B", true, 1000.0, Phase::Test),
            click("B", true, 9999.0, Phase::Practice),
        ];
        let values: Vec<_> = score_trail_making(&trials, 2)
            .into_iter()
            .map(|m| m.value)
            .collect();
        assert_eq!(values[0], MetricValue::Num(2.0));
        assert_eq!(values[1], MetricValue::Num(4.0));
        assert_eq!(values[2], MetricValue::Num(2.0));
        assert_eq!(values[3], MetricValue::Num(2.0));
        assert_eq!(values[4], MetricValue::Num(1.0));
        assert_eq!(values[6], MetricValue::Num(0.67));
    }
}
