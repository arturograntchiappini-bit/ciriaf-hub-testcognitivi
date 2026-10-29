//! Corsi Block-Tapping Task — memoria visuo-spaziale di sequenza.
//! Porta `src/engine/tests/corsi.ts` (Corsi 1972; Kessels et al. 2000; coordinate via PEBL).
//!
//! Layout fisso di 9 blocchi. Ad ogni livello, 2 trial con sequenze diverse ma di pari complessità
//! (stessi incroci, distanza entro tolleranza dal bersaglio del livello). Arresto: entrambi falliti.
use serde::{Deserialize, Serialize};
use sintropia_core::types::{Phase, SummaryMetric, TrialResult, ValidationFlag};
use std::collections::HashSet;
use std::hash::BuildHasherDefault;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

const fn pt(x: f64, y: f64) -> Point {
    Point { x, y }
}

/// Coordinate dei 9 blocchi sul piano 0–100 (convenzione cartesiana, origine in basso; per lo
/// schermo y-down usare 100 − y). Derivate dai valori in mm di Kessels et al. (2000) come in PEBL.
pub const CORSI_BLOCKS: [Point; 9] = [
    pt(61.7, 81.5),
    pt(15.0, 76.8),
    pt(85.0, 65.2),
    pt(33.7, 60.5),
    pt(66.3, 51.2),
    pt(92.0, 37.2),
    pt(8.0, 32.5),
    pt(36.0, 18.5),
    pt(64.0, 23.2),
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    pub start_length: u32,
    pub max_length: u32,
    pub trials_per_level: u32,
    pub present_ms_per_block: f64,
    /// Tolleranza (unità piano) sulla distanza totale per considerare pari complessità.
    pub complexity_tolerance: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sequence {
    pub indices: Vec<usize>,
    pub path_length: f64,
    pub crossings: usize,
}

/// `Math.hypot(a, b)` di V8: scala per il massimo e somma i quadrati con compensazione di Kahan.
/// `f64::hypot` può differire di 1 ulp (verificato: distanza 0->4 del layout) e un ulp basta a
/// invertire un ordinamento per lunghezza di percorso, cambiando la sequenza estratta a parità di seme.
pub fn js_hypot(a: f64, b: f64) -> f64 {
    let (a, b) = (a.abs(), b.abs());
    let max = a.max(b);
    if max.is_infinite() {
        return f64::INFINITY;
    }
    if max == 0.0 || max.is_nan() {
        return if max == 0.0 { 0.0 } else { f64::NAN };
    }
    let (mut sum, mut compensation) = (0.0_f64, 0.0_f64);
    for v in [a, b] {
        let n = v / max;
        let summand = n * n - compensation;
        let preliminary = sum + summand;
        compensation = (preliminary - sum) - summand;
        sum = preliminary;
    }
    sum.sqrt() * max
}

fn distance(a: Point, b: Point) -> f64 {
    js_hypot(a.x - b.x, a.y - b.y)
}

/// Distanza totale percorsa dal cursore lungo la sequenza.
pub fn path_length(seq: &[usize], blocks: &[Point]) -> f64 {
    seq.windows(2)
        .map(|w| distance(blocks[w[0]], blocks[w[1]]))
        .sum()
}

fn orientation(a: Point, b: Point, c: Point) -> u8 {
    let val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if val.abs() < 1e-9 {
        0
    } else if val > 0.0 {
        1
    } else {
        2
    }
}

/// Vero se i segmenti ab e cd si intersecano propriamente (collineari/tocco non contano).
fn properly_intersect(a: Point, b: Point, c: Point, d: Point) -> bool {
    let (o1, o2) = (orientation(a, b, c), orientation(a, b, d));
    let (o3, o4) = (orientation(c, d, a), orientation(c, d, b));
    if o1 == 0 || o2 == 0 || o3 == 0 || o4 == 0 {
        return false;
    }
    o1 != o2 && o3 != o4
}

/// Numero di incroci geometrici tra i segmenti non adiacenti del percorso.
pub fn count_crossings(seq: &[usize], blocks: &[Point]) -> usize {
    if seq.len() < 2 {
        return 0;
    }
    let pts: Vec<Point> = seq.iter().map(|&i| blocks[i]).collect();
    let n_seg = pts.len() - 1;
    let closed = seq[0] == seq[n_seg];
    let mut crossings = 0;
    for i in 0..n_seg {
        for j in (i + 2)..n_seg {
            if i == 0 && j == n_seg - 1 && closed {
                continue;
            }
            if properly_intersect(pts[i], pts[i + 1], pts[j], pts[j + 1]) {
                crossings += 1;
            }
        }
    }
    crossings
}

fn complexity_of(indices: Vec<usize>, blocks: &[Point]) -> Sequence {
    Sequence {
        path_length: path_length(&indices, blocks),
        crossings: count_crossings(&indices, blocks),
        indices,
    }
}

/// Chiave di una traiettoria a meno del rovescio. Compatta (u64, 4 bit per indice) quando possibile;
/// il testo è il ripiego per layout con più di 16 blocchi o sequenze più lunghe di 16.
#[derive(PartialEq, Eq, Hash)]
enum CanonicalKey {
    Packed(u64),
    Text(String),
}

fn canonical_key(indices: &[usize]) -> CanonicalKey {
    if indices.len() <= 16 && indices.iter().all(|&i| i < 16) {
        let pack =
            |it: &mut dyn Iterator<Item = &usize>| it.fold(0u64, |acc, &i| (acc << 4) | i as u64);
        let forward = pack(&mut indices.iter());
        let backward = pack(&mut indices.iter().rev());
        return CanonicalKey::Packed(forward.min(backward));
    }
    let join = |it: &mut dyn Iterator<Item = &usize>| {
        it.map(usize::to_string).collect::<Vec<_>>().join("-")
    };
    let forward = join(&mut indices.iter());
    let backward = join(&mut indices.iter().rev());
    CanonicalKey::Text(if forward < backward {
        forward
    } else {
        backward
    })
}

/// Hasher moltiplicativo (stile Fx): le chiavi sono nostre, non serve la resistenza di SipHash.
#[derive(Default)]
struct FastHasher(u64);

impl std::hash::Hasher for FastHasher {
    fn write(&mut self, bytes: &[u8]) {
        for &b in bytes {
            self.write_u64(u64::from(b));
        }
    }

    fn write_u64(&mut self, value: u64) {
        self.0 = (self.0.rotate_left(5) ^ value).wrapping_mul(0x517c_c1b7_2722_0a95);
    }

    fn finish(&self) -> u64 {
        self.0 ^ (self.0 >> 32)
    }
}

/// Distanza media fra due blocchi distinti del layout (proprietà pura della tavoletta).
pub fn mean_pairwise_distance(blocks: &[Point]) -> f64 {
    let (mut sum, mut pairs) = (0.0, 0usize);
    for (i, &a) in blocks.iter().enumerate() {
        for (j, &b) in blocks.iter().enumerate() {
            if i != j {
                sum += distance(a, b);
                pairs += 1;
            }
        }
    }
    if pairs == 0 {
        0.0
    } else {
        sum / pairs as f64
    }
}

/// BERSAGLIO di difficoltà del livello: `(length − 1) × distanza media`, costante del layout.
pub fn target_path_length(length: usize, blocks: &[Point]) -> f64 {
    length.saturating_sub(1) as f64 * mean_pairwise_distance(blocks)
}

/// Estrae a sorte un gruppo di `count` sequenze a pari incroci con ampiezza di distanza <= `max_spread`.
fn pick_uniform_group(
    pool: &[&Sequence],
    count: usize,
    max_spread: f64,
    rand: &mut dyn FnMut() -> f64,
) -> Option<Vec<Sequence>> {
    // Mappa a ordine di inserimento (come `Map` di JS): l'estrazione dipende dall'ordine dei gruppi.
    let mut by_crossings: Vec<(usize, Vec<&Sequence>)> = Vec::new();
    for &c in pool {
        match by_crossings.iter_mut().find(|(k, _)| *k == c.crossings) {
            Some((_, group)) => group.push(c),
            None => by_crossings.push((c.crossings, vec![c])),
        }
    }

    // Finestre idonee come (gruppo, inizio): niente copie finché non si è scelto.
    let mut groups: Vec<Vec<&Sequence>> = Vec::new();
    let mut eligible: Vec<(usize, usize)> = Vec::new();
    for (_, mut group) in by_crossings {
        if group.len() < count {
            continue;
        }
        group.sort_by(|a, b| a.path_length.total_cmp(&b.path_length));
        for i in 0..=(group.len() - count) {
            let spread = group[i + count - 1].path_length - group[i].path_length;
            if spread <= max_spread {
                eligible.push((groups.len(), i));
            }
        }
        groups.push(group);
    }
    if eligible.is_empty() {
        return None;
    }
    let (group, start) = eligible[(rand() * eligible.len() as f64).floor() as usize];
    Some(
        groups[group][start..start + count]
            .iter()
            .map(|&s| s.clone())
            .collect(),
    )
}

/// Genera `count` sequenze DISTINTE della lunghezza data: entro `complexity_tolerance` dal bersaglio
/// del livello (equivalenza fra le run), a pari incroci e distanze ravvicinate (equivalenza dentro il
/// livello), con scelta casuale nella banda (ogni run diversa). Degrada una garanzia per volta.
pub fn generate_balanced_sequences(
    length: usize,
    count: usize,
    params: &Params,
    rand: &mut dyn FnMut() -> f64,
    blocks: &[Point],
) -> Vec<Sequence> {
    const SAMPLES: usize = 2000; // tetto ai campionamenti (evita loop infiniti su lunghezze estreme)
    let target = target_path_length(length, blocks);
    let mut candidates: Vec<Sequence> = Vec::new();
    let mut seen: HashSet<CanonicalKey, BuildHasherDefault<FastHasher>> = HashSet::default();
    let mut perm: Vec<usize> = (0..blocks.len()).collect();

    for _ in 0..SAMPLES {
        // Stesso Fisher-Yates di `shuffle` (partenza dall'identità, stesso consumo del RNG), sul buffer riusato.
        for (i, slot) in perm.iter_mut().enumerate() {
            *slot = i;
        }
        for i in (1..perm.len()).rev() {
            let j = (rand() * (i + 1) as f64).floor() as usize;
            perm.swap(i, j);
        }
        let head = &perm[..length.min(perm.len())];
        if seen.insert(canonical_key(head)) {
            candidates.push(complexity_of(head.to_vec(), blocks));
        }
    }

    let tolerance = params.complexity_tolerance;
    let band: Vec<&Sequence> = candidates
        .iter()
        .filter(|c| (c.path_length - target).abs() <= tolerance)
        .collect();

    if let Some(ideal) = pick_uniform_group(&band, count, tolerance, rand) {
        return ideal;
    }
    if let Some(in_band) = pick_uniform_group(&band, count, f64::INFINITY, rand) {
        return in_band;
    }
    let mut nearest: Vec<&Sequence> = candidates.iter().collect();
    nearest.sort_by(|a, b| {
        (a.path_length - target)
            .abs()
            .total_cmp(&(b.path_length - target).abs())
    });
    let relaxed_len = (count * 20).max(50).min(nearest.len());
    pick_uniform_group(&nearest[..relaxed_len], count, f64::INFINITY, rand)
        .unwrap_or_else(|| nearest.into_iter().take(count).cloned().collect())
}

/// Punteggio Corsi ponderato: baseline `start_length − 1` più 0.5 per ogni trial superato; 0 se nessuno.
pub fn corsi_span(passed_trials: usize, start_length: f64) -> f64 {
    if passed_trials == 0 {
        return 0.0;
    }
    start_length - 1.0 + 0.5 * passed_trials as f64
}

/// Regola di arresto: si ferma se entrambi i trial del livello sono falliti.
pub fn should_stop(level_results: &[bool]) -> bool {
    level_results.len() >= 2 && level_results.iter().all(|r| !r)
}

/// Metriche: MBS, punteggio ponderato, trial superati, punteggio totale di Kessels (MBS × superati).
pub fn score_corsi(trials: &[TrialResult], start_length: f64) -> Vec<SummaryMetric> {
    let passed: Vec<&TrialResult> = trials
        .iter()
        .filter(|t| t.phase == Phase::Test && t.flag != ValidationFlag::Interrupted && t.correct)
        .collect();
    let mbs = passed
        .iter()
        .map(|t| t.stimulus.split('-').count())
        .max()
        .unwrap_or(0) as f64;
    let n_passed = passed.len() as f64;
    vec![
        SummaryMetric::new("Span Visuo-Spaziale (MBS)", mbs, None),
        SummaryMetric::new(
            "Punteggio Corsi (Ponderato)",
            corsi_span(passed.len(), start_length),
            None,
        ),
        SummaryMetric::new("Trial totali superati", n_passed, None),
        SummaryMetric::new("Punteggio totale (MBS × superati)", mbs * n_passed, None),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::rng::mulberry32;
    use sintropia_core::types::{MetricValue, TestId};

    /// Sequenze (seme 7, lunghezza 6) ottenute dal motore TypeScript.
    const SEQ_SEED_7_LEN_6: [[usize; 6]; 2] = [[2, 7, 6, 4, 1, 3], [1, 3, 0, 7, 2, 8]];

    fn params() -> Params {
        Params {
            start_length: 3,
            max_length: 9,
            trials_per_level: 2,
            present_ms_per_block: 1000.0,
            complexity_tolerance: 8.0,
        }
    }

    fn square() -> Vec<Point> {
        vec![pt(0.0, 0.0), pt(10.0, 0.0), pt(10.0, 10.0), pt(0.0, 10.0)]
    }

    fn generate(length: usize, seed: u32) -> Vec<Sequence> {
        generate_balanced_sequences(length, 2, &params(), &mut mulberry32(seed), &CORSI_BLOCKS)
    }

    fn trial(stimulus: &str, correct: bool) -> TrialResult {
        TrialResult {
            test_id: TestId::Corsi,
            session_id: "C".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: format!("len{}", stimulus.split('-').count()),
            stimulus: stimulus.into(),
            response: Some(stimulus.into()),
            correct,
            rt_ms: None,
            flag: ValidationFlag::Valid,
            onset_timestamp: 0.0,
        }
    }

    fn values(summary: &[SummaryMetric]) -> Vec<f64> {
        summary
            .iter()
            .map(|m| match m.value {
                MetricValue::Num(n) => n,
                MetricValue::Text(_) => f64::NAN,
            })
            .collect()
    }

    #[test]
    fn should_have_nine_distinct_blocks() {
        assert_eq!(CORSI_BLOCKS.len(), 9);
        let keys: HashSet<String> = CORSI_BLOCKS
            .iter()
            .map(|b| format!("{},{}", b.x, b.y))
            .collect();
        assert_eq!(keys.len(), 9);
    }

    #[test]
    fn should_sum_euclidean_distances_in_path_length() {
        assert!((path_length(&[0, 1, 2], &square()) - 20.0).abs() < 1e-5);
    }

    #[test]
    fn should_detect_a_crossing_in_a_butterfly_path() {
        assert_eq!(count_crossings(&[0, 2, 1, 3], &square()), 1);
    }

    #[test]
    fn should_find_no_crossing_on_a_perimeter_path() {
        assert_eq!(count_crossings(&[0, 1, 2, 3], &square()), 0);
    }

    #[test]
    fn should_average_distance_over_all_distinct_pairs() {
        let expected = (8.0 * 10.0 + 4.0 * 200f64.sqrt()) / 12.0;
        assert!((mean_pairwise_distance(&square()) - expected).abs() < 1e-9);
    }

    #[test]
    fn should_target_length_minus_one_mean_steps() {
        let d = mean_pairwise_distance(&CORSI_BLOCKS);
        assert_eq!(target_path_length(1, &CORSI_BLOCKS), 0.0);
        assert!((target_path_length(5, &CORSI_BLOCKS) - 4.0 * d).abs() < 1e-9);
    }

    #[test]
    fn should_generate_distinct_sequences_of_requested_length() {
        let seqs = generate(5, 1);
        assert!(seqs.len() >= 2);
        assert!(seqs.iter().all(|s| s.indices.len() == 5));
        assert_ne!(seqs[0].indices, seqs[1].indices);
    }

    #[test]
    fn should_keep_same_crossings_and_distance_within_tolerance_inside_a_level() {
        for length in [3, 4, 5, 6, 7, 9] {
            for seed in 1..=25 {
                let s = generate(length, seed);
                assert_eq!(s[0].crossings, s[1].crossings);
                assert!((s[0].path_length - s[1].path_length).abs() <= 8.0);
            }
        }
    }

    #[test]
    fn should_never_pick_the_reverse_of_the_other_sequence() {
        for length in [3, 4, 5, 7] {
            for seed in 1..=30 {
                let s = generate(length, seed);
                let reversed: Vec<usize> = s[1].indices.iter().rev().copied().collect();
                assert_ne!(s[0].indices, reversed);
            }
        }
    }

    #[test]
    fn should_stay_within_tolerance_of_the_level_target() {
        for length in [3, 5, 7, 9] {
            let target = target_path_length(length, &CORSI_BLOCKS);
            for seed in 1..=30 {
                for s in generate(length, seed) {
                    assert!((s.path_length - target).abs() <= 8.0);
                }
            }
        }
    }

    #[test]
    fn should_produce_different_sequences_across_runs() {
        let mut seen: HashSet<Vec<usize>> = HashSet::new();
        for seed in 1..=40 {
            for s in generate(5, seed) {
                seen.insert(s.indices);
            }
        }
        assert!(seen.len() > 40);
    }

    #[test]
    fn should_be_reproducible_for_same_seed() {
        assert_eq!(generate(6, 7), generate(6, 7));
    }

    #[test]
    fn should_match_typescript_sequences_for_seed_7() {
        let got: Vec<Vec<usize>> = generate(6, 7).into_iter().map(|s| s.indices).collect();
        let want: Vec<Vec<usize>> = SEQ_SEED_7_LEN_6.iter().map(|s| s.to_vec()).collect();
        assert_eq!(got, want);
    }

    #[test]
    fn should_compute_weighted_span_from_baseline() {
        assert_eq!(corsi_span(0, 2.0), 0.0);
        assert_eq!(corsi_span(0, 3.0), 0.0);
        assert_eq!(corsi_span(8, 2.0), 5.0);
        assert_eq!(corsi_span(6, 3.0), 5.0);
    }

    #[test]
    fn should_stop_only_when_both_level_trials_failed() {
        assert!(should_stop(&[false, false]));
        assert!(!should_stop(&[true, false]));
        assert!(!should_stop(&[false]));
        assert!(!should_stop(&[true, true]));
    }

    #[test]
    fn should_score_span_passed_trials_and_total() {
        let trials = [
            trial("0-1-2", true),
            trial("0-1-2-3", true),
            trial("3-2-1-0", false),
        ];
        let summary = score_corsi(&trials, 3.0);
        assert_eq!(summary[0].label, "Span Visuo-Spaziale (MBS)");
        assert_eq!(values(&summary), [4.0, 3.0, 2.0, 8.0]);
    }

    #[test]
    fn should_score_zero_when_no_trial_passed() {
        let summary = score_corsi(&[trial("0-1-2", false)], 3.0);
        assert_eq!(values(&summary), [0.0, 0.0, 0.0, 0.0]);
    }
}
