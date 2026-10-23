//! Visual Search — ricerca visiva di caratteristica e di congiunzione.
//! Porta `src/engine/tests/visualSearch.ts`. Treisman & Gelade (1980). Vedi docs/scientific/visual-search.md
//!
//! Il bersaglio è un cerchio arancione. Nella ricerca di CARATTERISTICA i distrattori sono cerchi blu;
//! nella ricerca di CONGIUNZIONE metà dei distrattori sono quadrati arancioni e metà cerchi blu.
//! La pendenza dell'RT in funzione del numero di elementi misura l'efficienza della ricerca.
use crate::regression::least_squares;
use serde::{Deserialize, Serialize};
use sintropia_core::rng::shuffle;
use sintropia_core::types::{
    js_round, MetricValue, Phase, SummaryMetric, TrialResult, ValidationFlag,
};
use sintropia_core::validation::{count_flag, mean};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisualSearchParams {
    /// Trial totali; un multiplo di 12 bilancia tipo × numerosità × presenza.
    pub n_trials: u32,
    pub fixation_ms: u32,
    /// Tempo massimo per rispondere (ms): oltre = omissione.
    pub response_window_ms: u32,
    pub isi_min_ms: u32,
    pub isi_max_ms: u32,
    pub practice_trials: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchType {
    Feature,
    Conjunction,
}

impl SearchType {
    fn as_str(self) -> &'static str {
        match self {
            Self::Feature => "feature",
            Self::Conjunction => "conjunction",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchColor {
    Orange,
    Blue,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchShape {
    Circle,
    Square,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchItem {
    /// Posizione nel campo, in [0, 1].
    pub x: f64,
    pub y: f64,
    pub color: SearchColor,
    pub shape: SearchShape,
    pub is_target: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisualSearchStimulus {
    #[serde(rename = "type")]
    pub search_type: SearchType,
    pub set_size: u32,
    pub present: bool,
    pub items: Vec<SearchItem>,
    pub isi_ms: u32,
}

pub const SEARCH_SET_SIZES: [u32; 3] = [4, 8, 16];
/// Celle per lato: 36 posizioni, ognuna con un piccolo scarto casuale.
const GRID: usize = 6;
const JITTER: f64 = 0.3;

type Kind = (SearchColor, SearchShape);
const TARGET_KIND: Kind = (SearchColor::Orange, SearchShape::Circle);
const BLUE_CIRCLE: Kind = (SearchColor::Blue, SearchShape::Circle);
const ORANGE_SQUARE: Kind = (SearchColor::Orange, SearchShape::Square);

/// Etichetta della condizione, letta dallo scoring: `tipo-presenza-numerosità`.
pub fn condition_label(search_type: SearchType, present: bool, set_size: u32) -> String {
    let presence = if present { "present" } else { "absent" };
    format!("{}-{presence}-{set_size}", search_type.as_str())
}

struct ParsedCondition {
    search_type: SearchType,
    present: bool,
    set_size: u32,
}

fn parse_condition(condition: &str) -> Option<ParsedCondition> {
    let mut parts = condition.split('-');
    let search_type = match parts.next()? {
        "feature" => SearchType::Feature,
        "conjunction" => SearchType::Conjunction,
        _ => return None,
    };
    let present = match parts.next()? {
        "present" => true,
        "absent" => false,
        _ => return None,
    };
    let set_size = parts.next()?.parse().ok()?;
    Some(ParsedCondition {
        search_type,
        present,
        set_size,
    })
}

/// Distrattori: cerchi blu (caratteristica) oppure metà quadrati arancioni e metà cerchi blu (congiunzione).
fn distractors(search_type: SearchType, count: usize) -> Vec<Kind> {
    if search_type == SearchType::Feature {
        return vec![BLUE_CIRCLE; count];
    }
    let orange_squares = count / 2;
    (0..count)
        .map(|i| {
            if i < orange_squares {
                ORANGE_SQUARE
            } else {
                BLUE_CIRCLE
            }
        })
        .collect()
}

fn place_items(
    set_size: usize,
    present: bool,
    search_type: SearchType,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<SearchItem> {
    let all_cells: Vec<usize> = (0..GRID * GRID).collect();
    let cells: Vec<usize> = shuffle(&all_cells, rand)
        .into_iter()
        .take(set_size)
        .collect();
    let mut pool: Vec<Kind> = Vec::new();
    if present {
        pool.push(TARGET_KIND);
    }
    pool.extend(distractors(search_type, set_size - usize::from(present)));
    let kinds = shuffle(&pool, rand);
    let grid = GRID as f64;
    cells
        .iter()
        .zip(kinds)
        .map(|(&cell, (color, shape))| {
            let x = ((cell % GRID) as f64 + 0.5 + (rand() - 0.5) * JITTER * 2.0) / grid;
            let y = ((cell / GRID) as f64 + 0.5 + (rand() - 0.5) * JITTER * 2.0) / grid;
            SearchItem {
                x,
                y,
                color,
                shape,
                is_target: (color, shape) == TARGET_KIND,
            }
        })
        .collect()
}

/// Sequenza: ogni cella tipo × numerosità × presenza compare lo stesso numero di volte (le prove in
/// più sono estratte a caso), in ordine casuale, con ISI uniforme.
pub fn generate_visual_search(
    params: &VisualSearchParams,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<VisualSearchStimulus> {
    let mut cells: Vec<(SearchType, u32, bool)> = Vec::new();
    for search_type in [SearchType::Feature, SearchType::Conjunction] {
        for set_size in SEARCH_SET_SIZES {
            for present in [true, false] {
                cells.push((search_type, set_size, present));
            }
        }
    }
    let n_trials = params.n_trials as usize;
    let base = n_trials / cells.len();
    let extra: Vec<_> = shuffle(&cells, rand)
        .into_iter()
        .take(n_trials - base * cells.len())
        .collect();
    let mut plan_pool: Vec<_> = cells
        .iter()
        .flat_map(|&cell| std::iter::repeat_n(cell, base))
        .collect();
    plan_pool.extend(extra);
    let span = f64::from(params.isi_max_ms) - f64::from(params.isi_min_ms);
    shuffle(&plan_pool, rand)
        .into_iter()
        .map(|(search_type, set_size, present)| {
            let items = place_items(set_size as usize, present, search_type, rand);
            let isi_ms = params.isi_min_ms + (rand() * (span + 1.0)).floor().max(0.0) as u32;
            VisualSearchStimulus {
                search_type,
                set_size,
                present,
                items,
                isi_ms,
            }
        })
        .collect()
}

fn usable(t: &TrialResult) -> bool {
    t.phase == Phase::Test && t.flag == ValidationFlag::Valid && t.correct && t.rt_ms.is_some()
}

/// Pendenza (ms per elemento) e intercetta dell'RT medio dei corretti validi, per tipo e presenza.
/// Ritorna `(pendenza, intercetta)`; `None` con meno di due numerosità distinte.
pub fn search_slope(
    trials: &[TrialResult],
    search_type: SearchType,
    present: bool,
) -> Option<(f64, f64)> {
    let mut by_size: Vec<(u32, Vec<f64>)> = Vec::new(); // ordine di inserimento, come la Map del TS
    for t in trials.iter().filter(|t| usable(t)) {
        let Some(c) = parse_condition(&t.condition) else {
            continue;
        };
        if c.search_type != search_type || c.present != present {
            continue;
        }
        let rt = t.rt_ms?;
        match by_size.iter_mut().find(|(size, _)| *size == c.set_size) {
            Some((_, rts)) => rts.push(rt),
            None => by_size.push((c.set_size, vec![rt])),
        }
    }
    let points: Vec<(f64, f64)> = by_size
        .iter()
        .map(|(size, rts)| (f64::from(*size), mean(rts)))
        .collect();
    least_squares(&points)
}

fn accuracy_percent(trials: &[&TrialResult]) -> f64 {
    let valid: Vec<&&TrialResult> = trials
        .iter()
        .filter(|t| t.flag != ValidationFlag::Interrupted)
        .collect();
    if valid.is_empty() {
        return 0.0;
    }
    valid.iter().filter(|t| t.correct).count() as f64 / valid.len() as f64 * 100.0
}

fn rt_mean(trials: &[&TrialResult]) -> f64 {
    let rts: Vec<f64> = trials
        .iter()
        .filter(|t| usable(t))
        .filter_map(|t| t.rt_ms)
        .collect();
    mean(&rts)
}

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn round2(x: f64) -> f64 {
    js_round(x * 100.0) / 100.0
}

fn num(label: impl Into<String>, value: f64, unit: Option<&str>) -> SummaryMetric {
    SummaryMetric::new(label, MetricValue::Num(value), unit)
}

fn dash(label: impl Into<String>) -> SummaryMetric {
    SummaryMetric::new(label, "—", None)
}

/// Metriche: RT e accuratezza per tipo di ricerca, pendenze (ms/elemento) a bersaglio presente e
/// assente, rapporto assente/presente. Le omissioni contano come errori; i trial interrotti sono esclusi.
pub fn score_visual_search(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let test: Vec<TrialResult> = trials
        .iter()
        .filter(|t| t.phase == Phase::Test)
        .cloned()
        .collect();
    let of_type = |search_type: SearchType| -> Vec<&TrialResult> {
        test.iter()
            .filter(|t| parse_condition(&t.condition).is_some_and(|c| c.search_type == search_type))
            .collect()
    };
    let mut metrics: Vec<SummaryMetric> = Vec::new();
    for (search_type, name) in [
        (SearchType::Feature, "caratteristica"),
        (SearchType::Conjunction, "congiunzione"),
    ] {
        let group = of_type(search_type);
        metrics.push(num(
            format!("RT medio {name}"),
            round1(rt_mean(&group)),
            Some("ms"),
        ));
        metrics.push(num(
            format!("Accuratezza {name}"),
            round1(accuracy_percent(&group)),
            Some("%"),
        ));
        for present in [true, false] {
            let label = format!(
                "Pendenza {name} (bersaglio {})",
                if present { "presente" } else { "assente" }
            );
            metrics.push(match search_slope(&test, search_type, present) {
                Some((slope, _)) => num(label, round1(slope), Some("ms/elemento")),
                None => dash(label),
            });
        }
    }
    let present = search_slope(&test, SearchType::Conjunction, true);
    let absent = search_slope(&test, SearchType::Conjunction, false);
    let ratio_label = "Rapporto pendenze congiunzione (assente / presente)";
    metrics.push(match (present, absent) {
        (Some((p, _)), Some((a, _))) if p > 0.0 => num(ratio_label, round2(a / p), None),
        _ => dash(ratio_label),
    });
    metrics.push(num(
        "Errori di omissione",
        count_flag(&test, ValidationFlag::Omission) as f64,
        None,
    ));
    metrics.push(num(
        "Errori di anticipazione",
        count_flag(&test, ValidationFlag::Anticipation) as f64,
        None,
    ));
    metrics
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::TestId;

    fn params() -> VisualSearchParams {
        VisualSearchParams {
            n_trials: 96,
            fixation_ms: 500,
            response_window_ms: 4000,
            isi_min_ms: 700,
            isi_max_ms: 1100,
            practice_trials: 8,
        }
    }

    fn trial(condition: &str, rt: Option<f64>) -> TrialResult {
        TrialResult {
            test_id: TestId::VisualSearch,
            session_id: "V-0".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: condition.into(),
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

    fn metric(trials: &[TrialResult], label: &str) -> MetricValue {
        score_visual_search(trials)
            .into_iter()
            .find(|m| m.label == label)
            .unwrap()
            .value
    }

    fn n(v: f64) -> MetricValue {
        MetricValue::Num(v)
    }

    #[test]
    fn should_balance_type_set_size_and_presence_with_96_trials() {
        let seq = generate_visual_search(&params(), &mut mulberry32(1));
        assert_eq!(seq.len(), 96);
        for t in [SearchType::Feature, SearchType::Conjunction] {
            for size in SEARCH_SET_SIZES {
                for present in [true, false] {
                    let count = seq
                        .iter()
                        .filter(|s| {
                            s.search_type == t && s.set_size == size && s.present == present
                        })
                        .count();
                    assert_eq!(count, 8);
                }
            }
        }
    }

    #[test]
    fn should_place_exactly_one_target_only_when_present() {
        for s in generate_visual_search(&params(), &mut mulberry32(2)) {
            assert_eq!(s.items.len(), s.set_size as usize);
            assert_eq!(
                s.items.iter().filter(|i| i.is_target).count(),
                usize::from(s.present)
            );
        }
    }

    #[test]
    fn should_use_blue_circles_as_feature_distractors() {
        let seq = generate_visual_search(&params(), &mut mulberry32(3));
        for s in seq.iter().filter(|x| x.search_type == SearchType::Feature) {
            for item in s.items.iter().filter(|i| !i.is_target) {
                assert_eq!((item.color, item.shape), BLUE_CIRCLE);
            }
        }
    }

    #[test]
    fn should_split_conjunction_distractors_between_orange_squares_and_blue_circles() {
        let seq = generate_visual_search(&params(), &mut mulberry32(4));
        let s = seq
            .iter()
            .find(|x| x.search_type == SearchType::Conjunction && x.set_size == 16 && !x.present)
            .unwrap();
        let count = |kind: Kind| {
            s.items
                .iter()
                .filter(|i| (i.color, i.shape) == kind)
                .count()
        };
        assert_eq!(count(ORANGE_SQUARE), 8);
        assert_eq!(count(BLUE_CIRCLE), 8);
    }

    #[test]
    fn should_never_overlap_items_and_stay_inside_the_field() {
        for s in generate_visual_search(&params(), &mut mulberry32(5)) {
            let mut cells: Vec<(usize, usize)> = s
                .items
                .iter()
                .map(|i| ((i.x * 6.0).floor() as usize, (i.y * 6.0).floor() as usize))
                .collect();
            cells.sort_unstable();
            cells.dedup();
            assert_eq!(cells.len(), s.items.len());
            for i in &s.items {
                assert!(i.x > 0.0 && i.x < 1.0 && i.y > 0.0 && i.y < 1.0);
            }
        }
    }

    #[test]
    fn should_be_deterministic_for_the_same_seed() {
        assert_eq!(
            generate_visual_search(&params(), &mut mulberry32(9)),
            generate_visual_search(&params(), &mut mulberry32(9))
        );
    }

    #[test]
    fn should_match_typescript_sequence_for_seed_42() {
        // Valori calcolati eseguendo generateVisualSearch (TS) con mulberry32(42).
        let seq = generate_visual_search(&params(), &mut mulberry32(42));
        let head: Vec<String> = seq
            .iter()
            .take(3)
            .map(|s| {
                let first = &s.items[0];
                format!(
                    "{}:{}:{}:{:.6}:{:.6}",
                    condition_label(s.search_type, s.present, s.set_size),
                    s.isi_ms,
                    first.is_target,
                    first.x,
                    first.y
                )
            })
            .collect();
        assert_eq!(head, SEED42_HEAD);
    }

    const SEED42_HEAD: [&str; 3] = [
        "feature-present-8:826:true:0.573185:0.900279",
        "conjunction-absent-4:951:false:0.785296:0.926606",
        "conjunction-absent-16:1075:false:0.222971:0.270276",
    ];

    fn linear(search_type: SearchType, present: bool, slope: f64) -> Vec<TrialResult> {
        SEARCH_SET_SIZES
            .iter()
            .map(|&size| {
                trial(
                    &condition_label(search_type, present, size),
                    Some(500.0 + slope * f64::from(size)),
                )
            })
            .collect()
    }

    #[test]
    fn should_report_the_search_slope_in_ms_per_item() {
        let mut trials = linear(SearchType::Conjunction, true, 25.0);
        trials.extend(linear(SearchType::Feature, true, 1.0));
        let (slope, _) = search_slope(&trials, SearchType::Conjunction, true).unwrap();
        assert!((slope - 25.0).abs() < 1e-9);
        assert_eq!(
            metric(&trials, "Pendenza congiunzione (bersaglio presente)"),
            n(25.0)
        );
        assert_eq!(
            metric(&trials, "Pendenza caratteristica (bersaglio presente)"),
            n(1.0)
        );
    }

    #[test]
    fn should_report_a_dash_when_a_slope_cannot_be_computed() {
        let trials = [trial(
            &condition_label(SearchType::Feature, true, 4),
            Some(500.0),
        )];
        assert_eq!(
            metric(&trials, "Pendenza caratteristica (bersaglio presente)"),
            MetricValue::Text("—".into())
        );
    }

    #[test]
    fn should_compute_the_absent_over_present_ratio_for_conjunction() {
        let mut trials = linear(SearchType::Conjunction, true, 20.0);
        trials.extend(linear(SearchType::Conjunction, false, 40.0));
        assert_eq!(
            metric(
                &trials,
                "Rapporto pendenze congiunzione (assente / presente)"
            ),
            n(2.0)
        );
    }

    #[test]
    fn should_exclude_errors_from_rt_but_count_omissions_as_errors_in_accuracy() {
        let c = condition_label(SearchType::Feature, true, 4);
        let mut wrong = trial(&c, Some(900.0));
        wrong.correct = false;
        let trials = [trial(&c, Some(400.0)), trial(&c, None), wrong];
        assert_eq!(metric(&trials, "RT medio caratteristica"), n(400.0));
        assert_eq!(metric(&trials, "Accuratezza caratteristica"), n(33.3));
        assert_eq!(metric(&trials, "Errori di omissione"), n(1.0));
    }

    #[test]
    fn should_ignore_practice_and_interrupted_trials() {
        let c = condition_label(SearchType::Feature, true, 4);
        let mut practice = trial(&c, Some(400.0));
        practice.phase = Phase::Practice;
        let mut interrupted = trial(&c, None);
        interrupted.flag = ValidationFlag::Interrupted;
        let trials = [practice, interrupted, trial(&c, Some(500.0))];
        assert_eq!(metric(&trials, "RT medio caratteristica"), n(500.0));
        assert_eq!(metric(&trials, "Accuratezza caratteristica"), n(100.0));
    }

    #[test]
    fn should_parse_condition_labels_roundtrip() {
        let c = parse_condition(&condition_label(SearchType::Conjunction, false, 16)).unwrap();
        assert_eq!(
            (c.search_type, c.present, c.set_size),
            (SearchType::Conjunction, false, 16)
        );
        assert!(parse_condition("garbage").is_none());
        assert!(parse_condition("feature-present").is_none());
    }
}
