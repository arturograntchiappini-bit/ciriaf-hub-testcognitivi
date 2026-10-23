//! Mental Rotation — rotazione mentale di figure tridimensionali a blocchi.
//! Porta `src/engine/tests/mentalRotation.ts` (Shepard & Metzler 1971).
//!
//! Due figure di 10 cubetti: la seconda è la prima ruotata in profondità (stessa figura) oppure la
//! sua immagine speculare ruotata (figura diversa). Il TR sulle coppie uguali cresce con l'angolo.
use crate::regression::least_squares;
use serde::{Deserialize, Serialize};
use sintropia_core::rng::shuffle;
use sintropia_core::types::{js_round, Phase, SummaryMetric, TrialResult, ValidationFlag};
use sintropia_core::validation::{count_flag, mean};
use std::collections::HashSet;

type Rand<'a> = &'a mut dyn FnMut() -> f64;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    /// Trial totali; un multiplo di 14 bilancia angolo × (uguali / diverse).
    pub n_trials: usize,
    pub fixation_ms: f64,
    /// Tempo massimo per rispondere (ms): oltre = omissione.
    pub response_window_ms: f64,
    pub isi_min_ms: i64,
    pub isi_max_ms: i64,
    pub practice_trials: usize,
}

pub type Cube = [i32; 3];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stimulus {
    /// Figura di sinistra (orientamento di riferimento).
    pub left: Vec<Cube>,
    /// Figura di destra prima della rotazione: uguale a `left` oppure la sua immagine speculare.
    pub right: Vec<Cube>,
    pub same: bool,
    /// Rotazione in profondità (asse verticale) della figura di destra, in gradi con segno.
    pub angle: i32,
    pub isi_ms: i64,
}

/// Angoli di rotazione (gradi) in valore assoluto.
pub const ROTATION_ANGLES: [i32; 7] = [0, 30, 60, 90, 120, 150, 180];

const CUBES_PER_FIGURE: usize = 10;
const ARM_LENGTHS: [usize; 4] = [2, 2, 2, 3]; // 4 bracci, 9 passi, 10 cubetti
const MAX_SHAPE_ATTEMPTS: usize = 500;
const FALLBACK_SHAPE: [Cube; 10] = [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
    [2, 1, 0],
    [2, 2, 0],
    [2, 2, 1],
    [2, 2, 2],
    [1, 2, 2],
    [0, 2, 2],
    [0, 2, 3],
];

// ---------- geometria dei solidi ----------

/// Immagine speculare rispetto al piano x = 0.
pub fn mirror(cubes: &[Cube]) -> Vec<Cube> {
    cubes.iter().map(|&[x, y, z]| [-x, y, z]).collect()
}

fn normalized_key(cubes: &[Cube]) -> Vec<Cube> {
    let min: Vec<i32> = (0..3)
        .map(|i| cubes.iter().map(|c| c[i]).min().unwrap_or(0))
        .collect();
    let mut shifted: Vec<Cube> = cubes
        .iter()
        .map(|c| [c[0] - min[0], c[1] - min[1], c[2] - min[2]])
        .collect();
    shifted.sort_unstable();
    shifted
}

const PERMUTATIONS: [[usize; 3]; 6] = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
];

fn permutation_sign(p: &[usize; 3]) -> i32 {
    let inversions = (0..3)
        .flat_map(|i| ((i + 1)..3).map(move |j| (i, j)))
        .filter(|&(i, j)| p[i] > p[j])
        .count();
    if inversions % 2 == 0 {
        1
    } else {
        -1
    }
}

/// Le 24 rotazioni proprie del cubo: (permutazione degli assi, segni).
fn cube_rotations() -> Vec<([usize; 3], [i32; 3])> {
    let mut rotations = Vec::with_capacity(24);
    for perm in PERMUTATIONS {
        for sx in [1, -1] {
            for sy in [1, -1] {
                for sz in [1, -1] {
                    if permutation_sign(&perm) * sx * sy * sz == 1 {
                        rotations.push((perm, [sx, sy, sz]));
                    }
                }
            }
        }
    }
    rotations
}

fn apply_rotation(c: &Cube, (perm, signs): &([usize; 3], [i32; 3])) -> Cube {
    [
        signs[0] * c[perm[0]],
        signs[1] * c[perm[1]],
        signs[2] * c[perm[2]],
    ]
}

/// Una figura è chirale se la sua immagine speculare NON coincide con alcuna sua rotazione.
pub fn is_chiral(cubes: &[Cube]) -> bool {
    let mirrored = normalized_key(&mirror(cubes));
    !cube_rotations().iter().any(|rotation| {
        let rotated: Vec<Cube> = cubes.iter().map(|c| apply_rotation(c, rotation)).collect();
        normalized_key(&rotated) == mirrored
    })
}

fn chain(rand: Rand) -> Option<Vec<Cube>> {
    let lengths = shuffle(&ARM_LENGTHS, rand);
    let mut cubes: Vec<Cube> = vec![[0, 0, 0]];
    let mut axis: Option<usize> = None;
    let mut axes_used: HashSet<usize> = HashSet::new();
    for length in lengths {
        let options: Vec<usize> = (0..3).filter(|&a| Some(a) != axis).collect();
        let chosen = options[(rand() * options.len() as f64).floor() as usize];
        axis = Some(chosen);
        axes_used.insert(chosen);
        let sign = if rand() < 0.5 { -1 } else { 1 };
        for _ in 0..length {
            let mut next = cubes[cubes.len() - 1];
            next[chosen] += sign;
            cubes.push(next);
        }
    }
    let distinct = cubes.iter().collect::<HashSet<_>>().len() == CUBES_PER_FIGURE;
    (distinct && axes_used.len() == 3).then_some(cubes)
}

/// Figura a blocchi: catena di 10 cubetti con 3 curve ad angolo retto su tre assi, non sovrapponibile
/// alla sua speculare.
pub fn generate_shape(rand: Rand) -> Vec<Cube> {
    for _ in 0..MAX_SHAPE_ATTEMPTS {
        if let Some(shape) = chain(rand) {
            if is_chiral(&shape) {
                return shape;
            }
        }
    }
    FALLBACK_SHAPE.to_vec()
}

/// Genera la sequenza: ogni coppia angolo × (uguali / diverse) compare lo stesso numero di volte (le
/// prove in più sono estratte a caso); a ogni trial una figura nuova e un verso di rotazione casuale.
pub fn generate_mental_rotation(params: &Params, rand: Rand) -> Vec<Stimulus> {
    let cells: Vec<(i32, bool)> = ROTATION_ANGLES
        .iter()
        .flat_map(|&angle| [true, false].map(|same| (angle, same)))
        .collect();
    let base = params.n_trials / cells.len();
    let n_extra = params.n_trials.saturating_sub(base * cells.len());
    let extra: Vec<(i32, bool)> = shuffle(&cells, rand).into_iter().take(n_extra).collect();
    let mut pool: Vec<(i32, bool)> = cells
        .iter()
        .flat_map(|&cell| std::iter::repeat_n(cell, base))
        .collect();
    pool.extend(extra);
    let plan = shuffle(&pool, rand);
    let span = (params.isi_max_ms - params.isi_min_ms) as f64;
    plan.into_iter()
        .map(|(angle, same)| {
            let left = generate_shape(rand);
            let right = if same { left.clone() } else { mirror(&left) };
            let signed = if rand() < 0.5 { -angle } else { angle };
            let isi_ms = params.isi_min_ms + (rand() * (span + 1.0)).floor() as i64;
            Stimulus {
                left,
                right,
                same,
                angle: signed,
                isi_ms,
            }
        })
        .collect()
}

// ---------- proiezione per il disegno ----------

#[derive(Debug, Clone, PartialEq)]
pub struct Face {
    /// Quattro vertici in coordinate di schermo (unità = lato del cubetto, y verso il basso).
    pub points: [[f64; 2]; 4],
    /// Luminosità in [0, 1] per l'ombreggiatura.
    pub shade: f64,
}

const FACE_DIRECTIONS: [[i32; 3]; 6] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
];
const VIEW_YAW_DEG: f64 = 25.0;
const VIEW_TILT_DEG: f64 = 22.0;
const LIGHT: [f64; 3] = [0.35, 0.8, 0.5];

type Vec3 = [f64; 3];

fn rad(deg: f64) -> f64 {
    deg * std::f64::consts::PI / 180.0
}

fn rotate_y(v: Vec3, deg: f64) -> Vec3 {
    let (c, s) = (rad(deg).cos(), rad(deg).sin());
    [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}

fn rotate_x(v: Vec3, deg: f64) -> Vec3 {
    let (c, s) = (rad(deg).cos(), rad(deg).sin());
    [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
}

/// Vertici di una faccia del cubetto centrato in `c`, per la direzione `d`.
fn face_corners(c: Vec3, d: [i32; 3]) -> [Vec3; 4] {
    let axis = d.iter().position(|&v| v != 0).unwrap_or(0);
    let others: Vec<usize> = (0..3).filter(|&a| a != axis).collect();
    let (u, w) = (others[0], others[1]);
    [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0]].map(|[a, b]| {
        let mut p = c;
        p[axis] += f64::from(d[axis]) * 0.5;
        p[u] += a * 0.5;
        p[w] += b * 0.5;
        p
    })
}

/// Facce visibili di una figura ruotata di `angle` gradi attorno all'asse verticale, in proiezione
/// ortogonale con lieve inclinazione, ordinate dal fondo al primo piano (algoritmo del pittore).
/// Le facce a contatto con un altro cubetto non si disegnano.
pub fn project_faces(cubes: &[Cube], angle: f64) -> Vec<Face> {
    let occupied: HashSet<Cube> = cubes.iter().copied().collect();
    let len = cubes.len() as f64;
    let center = cubes.iter().fold([0.0; 3], |s, c| {
        [
            s[0] + f64::from(c[0]) / len,
            s[1] + f64::from(c[1]) / len,
            s[2] + f64::from(c[2]) / len,
        ]
    });
    let view = |v: Vec3| rotate_x(rotate_y(rotate_y(v, angle), VIEW_YAW_DEG), VIEW_TILT_DEG);
    let mut faces: Vec<(Face, f64)> = Vec::new();
    for cube in cubes {
        for d in FACE_DIRECTIONS {
            if occupied.contains(&[cube[0] + d[0], cube[1] + d[1], cube[2] + d[2]]) {
                continue;
            }
            let normal = view([f64::from(d[0]), f64::from(d[1]), f64::from(d[2])]);
            if normal[2] <= 0.0 {
                continue; // faccia rivolta dalla parte opposta all'osservatore
            }
            let rel = [
                f64::from(cube[0]) - center[0],
                f64::from(cube[1]) - center[1],
                f64::from(cube[2]) - center[2],
            ];
            let corners = face_corners(rel, d).map(view);
            let depth = corners.iter().fold(0.0, |s, p| s + p[2]) / 4.0;
            let light =
                (normal[0] * LIGHT[0] + -normal[1] * LIGHT[1] + normal[2] * LIGHT[2]).max(0.0);
            faces.push((
                Face {
                    points: corners.map(|p| [p[0], -p[1]]),
                    shade: 0.35 + 0.65 * light.min(1.0),
                },
                depth,
            ));
        }
    }
    faces.sort_by(|a, b| a.1.total_cmp(&b.1));
    faces.into_iter().map(|(face, _)| face).collect()
}

// ---------- scoring ----------

/// Etichetta della condizione, letta dallo scoring: `same|different-angolo` (angolo assoluto).
pub fn condition_label(same: bool, angle: i32) -> String {
    format!(
        "{}-{}",
        if same { "same" } else { "different" },
        angle.abs()
    )
}

/// Condizione di un trial: coppia uguale/diversa e angolo in valore assoluto.
fn parse_condition(condition: &str) -> Option<(bool, f64)> {
    let mut parts = condition.split('-');
    let kind = parts.next()?;
    let same = match kind {
        "same" => true,
        "different" => false,
        _ => return None,
    };
    let raw = parts.next()?.trim();
    let angle = if raw.is_empty() {
        0.0
    } else {
        raw.parse::<f64>().ok()?
    };
    angle.is_finite().then_some((same, angle))
}

fn usable(t: &TrialResult) -> bool {
    t.phase == Phase::Test && t.flag == ValidationFlag::Valid && t.correct && t.rt_ms.is_some()
}

/// Retta RT × angolo: pendenza (ms per grado) e intercetta.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RotationFit {
    pub slope: f64,
    pub intercept: f64,
}

/// Pendenza e intercetta dell'RT medio delle coppie UGUALI corrette, per angolo.
pub fn rotation_slope(trials: &[TrialResult]) -> Option<RotationFit> {
    let mut by_angle: Vec<(f64, Vec<f64>)> = Vec::new(); // ordine di inserimento, come `Map`
    for t in trials.iter().filter(|t| usable(t)) {
        let Some((true, angle)) = parse_condition(&t.condition) else {
            continue;
        };
        let rt = t.rt_ms.unwrap_or_default();
        match by_angle.iter_mut().find(|(a, _)| *a == angle) {
            Some((_, rts)) => rts.push(rt),
            None => by_angle.push((angle, vec![rt])),
        }
    }
    let points: Vec<(f64, f64)> = by_angle.iter().map(|(a, rts)| (*a, mean(rts))).collect();
    least_squares(&points).map(|(slope, intercept)| RotationFit { slope, intercept })
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

fn round1(x: f64) -> f64 {
    js_round(x * 10.0) / 10.0
}

fn round2(x: f64) -> f64 {
    js_round(x * 100.0) / 100.0
}

/// Metriche: accuratezza e RT per coppie uguali e diverse, pendenza dell'RT sull'angolo (ms/grado),
/// intercetta e velocità di rotazione (gradi/s). Le omissioni contano come errori.
pub fn score_mental_rotation(trials: &[TrialResult]) -> Vec<SummaryMetric> {
    let test: Vec<TrialResult> = trials
        .iter()
        .filter(|t| t.phase == Phase::Test)
        .cloned()
        .collect();
    let all: Vec<&TrialResult> = test.iter().collect();
    let of_kind = |same: bool| -> Vec<&TrialResult> {
        all.iter()
            .copied()
            .filter(|t| parse_condition(&t.condition).is_some_and(|(s, _)| s == same))
            .collect()
    };
    let rt_mean = |group: &[&TrialResult]| -> f64 {
        let rts: Vec<f64> = group
            .iter()
            .filter(|t| usable(t))
            .filter_map(|t| t.rt_ms)
            .collect();
        mean(&rts)
    };
    let fit = rotation_slope(&test);
    let speed = fit.filter(|f| f.slope > 0.0);
    let (same, different) = (of_kind(true), of_kind(false));
    let dash = || "—";
    vec![
        SummaryMetric::new(
            "Accuratezza complessiva",
            round1(accuracy_percent(&all)),
            Some("%"),
        ),
        SummaryMetric::new(
            "Accuratezza coppie uguali",
            round1(accuracy_percent(&same)),
            Some("%"),
        ),
        SummaryMetric::new(
            "Accuratezza coppie diverse",
            round1(accuracy_percent(&different)),
            Some("%"),
        ),
        SummaryMetric::new("RT medio coppie uguali", round1(rt_mean(&same)), Some("ms")),
        SummaryMetric::new(
            "RT medio coppie diverse",
            round1(rt_mean(&different)),
            Some("ms"),
        ),
        match fit {
            Some(f) => SummaryMetric::new(
                "Pendenza RT × angolo (coppie uguali)",
                round2(f.slope),
                Some("ms/°"),
            ),
            None => SummaryMetric::new("Pendenza RT × angolo (coppie uguali)", dash(), None),
        },
        match fit {
            Some(f) => SummaryMetric::new(
                "Intercetta RT (coppie uguali)",
                round1(f.intercept),
                Some("ms"),
            ),
            None => SummaryMetric::new("Intercetta RT (coppie uguali)", dash(), None),
        },
        match speed {
            Some(f) => SummaryMetric::new(
                "Velocità di rotazione mentale",
                round1(1000.0 / f.slope),
                Some("°/s"),
            ),
            None => SummaryMetric::new("Velocità di rotazione mentale", dash(), None),
        },
        SummaryMetric::new(
            "Errori di omissione",
            count_flag(&test, ValidationFlag::Omission) as f64,
            None,
        ),
        SummaryMetric::new(
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
    use sintropia_core::types::{MetricValue, TestId};

    /// Prima figura generata con il seme 3, dal motore TypeScript.
    const SHAPE_SEED_3: [Cube; 10] = [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, -1, 0],
        [2, -2, 0],
        [2, -3, 0],
        [1, -3, 0],
        [0, -3, 0],
        [0, -3, -1],
        [0, -3, -2],
    ];
    /// Primi stimoli del seme 1 come (angolo con segno, same, isi), dal motore TypeScript.
    const PLAN_SEED_1: [(i32, bool, i64); 4] = [
        (180, true, 1082),
        (60, true, 1017),
        (60, true, 794),
        (-120, true, 797),
    ];

    fn params() -> Params {
        Params {
            n_trials: 84,
            fixation_ms: 500.0,
            response_window_ms: 8000.0,
            isi_min_ms: 700,
            isi_max_ms: 1100,
            practice_trials: 6,
        }
    }

    fn trial(condition: &str, rt: Option<f64>, flag: Option<ValidationFlag>) -> TrialResult {
        let flag = flag.unwrap_or(if rt.is_none() {
            ValidationFlag::Omission
        } else {
            ValidationFlag::Valid
        });
        TrialResult {
            test_id: TestId::MentalRotation,
            session_id: "M-0".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: condition.into(),
            response: rt.map(|_| "arrowleft".to_string()),
            correct: rt.is_some(),
            rt_ms: rt,
            flag,
            onset_timestamp: 0.0,
        }
    }

    fn metric(trials: &[TrialResult], label: &str) -> MetricValue {
        score_mental_rotation(trials)
            .into_iter()
            .find(|m| m.label == label)
            .unwrap_or_else(|| panic!("metrica mancante: {label}"))
            .value
    }

    fn linear(slope: f64) -> Vec<TrialResult> {
        ROTATION_ANGLES
            .iter()
            .map(|&a| {
                trial(
                    &condition_label(true, a),
                    Some(600.0 + slope * f64::from(a)),
                    None,
                )
            })
            .collect()
    }

    #[test]
    fn should_build_a_connected_figure_of_ten_distinct_cubes() {
        for seed in 1..=5 {
            let cubes = generate_shape(&mut mulberry32(seed));
            assert_eq!(cubes.iter().collect::<HashSet<_>>().len(), 10);
            for pair in cubes.windows(2) {
                let d: i32 = (0..3).map(|i| (pair[1][i] - pair[0][i]).abs()).sum();
                assert_eq!(d, 1);
            }
        }
    }

    #[test]
    fn should_never_be_superimposable_on_its_mirror_image() {
        for seed in 1..=30 {
            assert!(is_chiral(&generate_shape(&mut mulberry32(seed))));
        }
    }

    #[test]
    fn should_have_exactly_24_proper_rotations() {
        let rotations = cube_rotations();
        assert_eq!(rotations.len(), 24);
        let probe = [[1, 2, 3]];
        let images: HashSet<Cube> = rotations
            .iter()
            .map(|r| apply_rotation(&probe[0], r))
            .collect();
        assert_eq!(images.len(), 24);
    }

    #[test]
    fn should_reject_a_straight_bar_that_has_a_mirror_plane() {
        assert!(!is_chiral(&[[0, 0, 0], [1, 0, 0], [2, 0, 0]]));
    }

    #[test]
    fn should_agree_on_a_figure_and_its_mirror_image() {
        let shape = generate_shape(&mut mulberry32(11));
        assert_eq!(is_chiral(&mirror(&shape)), is_chiral(&shape));
    }

    #[test]
    fn should_balance_angle_and_sameness_with_84_trials() {
        let seq = generate_mental_rotation(&params(), &mut mulberry32(1));
        assert_eq!(seq.len(), 84);
        for angle in ROTATION_ANGLES {
            for same in [true, false] {
                let n = seq
                    .iter()
                    .filter(|s| s.angle.abs() == angle && s.same == same)
                    .count();
                assert_eq!(n, 6);
            }
        }
    }

    #[test]
    fn should_use_the_same_figure_when_same_and_its_mirror_when_different() {
        for s in generate_mental_rotation(&params(), &mut mulberry32(2)) {
            let expected = if s.same {
                s.left.clone()
            } else {
                mirror(&s.left)
            };
            assert_eq!(s.right, expected);
        }
    }

    #[test]
    fn should_be_deterministic_for_the_same_seed() {
        assert_eq!(
            generate_mental_rotation(&params(), &mut mulberry32(7)),
            generate_mental_rotation(&params(), &mut mulberry32(7))
        );
    }

    #[test]
    fn should_match_typescript_shape_for_seed_3() {
        assert_eq!(generate_shape(&mut mulberry32(3)), SHAPE_SEED_3);
    }

    #[test]
    fn should_match_typescript_plan_for_seed_1() {
        let seq = generate_mental_rotation(&params(), &mut mulberry32(1));
        let head: Vec<(i32, bool, i64)> = seq
            .iter()
            .take(PLAN_SEED_1.len())
            .map(|s| (s.angle, s.same, s.isi_ms))
            .collect();
        assert_eq!(head, PLAN_SEED_1);
    }

    #[test]
    fn should_show_three_faces_of_a_single_cube() {
        assert_eq!(project_faces(&[[0, 0, 0]], 0.0).len(), 3);
    }

    #[test]
    fn should_hide_faces_shared_between_two_cubes() {
        assert!(project_faces(&[[0, 0, 0], [1, 0, 0]], 0.0).len() < 6);
    }

    #[test]
    fn should_return_quadrilaterals_with_shade_in_unit_range() {
        for face in project_faces(&generate_shape(&mut mulberry32(3)), 60.0) {
            assert_eq!(face.points.len(), 4);
            assert!((0.0..=1.0).contains(&face.shade));
        }
    }

    #[test]
    fn should_keep_every_figure_inside_the_drawing_field_at_any_angle() {
        const FIELD: f64 = 4.6; // semi-ampiezza usata dalla vista web
        let mut widest: f64 = 0.0;
        for seed in 1..=60 {
            let cubes = generate_shape(&mut mulberry32(seed));
            for angle in ROTATION_ANGLES {
                for face in project_faces(&cubes, f64::from(angle)) {
                    for [x, y] in face.points {
                        widest = widest.max(x.abs()).max(y.abs());
                    }
                }
            }
        }
        assert!(widest < FIELD);
    }

    #[test]
    fn should_change_the_projection_when_the_figure_is_rotated() {
        let cubes = generate_shape(&mut mulberry32(4));
        assert_ne!(project_faces(&cubes, 0.0), project_faces(&cubes, 90.0));
    }

    #[test]
    fn should_report_the_slope_in_ms_per_degree_and_the_rotation_speed() {
        let trials = linear(10.0);
        let fit = rotation_slope(&trials).expect("retta definita");
        assert!((fit.slope - 10.0).abs() < 1e-6);
        assert_eq!(
            metric(&trials, "Pendenza RT × angolo (coppie uguali)"),
            MetricValue::Num(10.0)
        );
        assert_eq!(
            metric(&trials, "Intercetta RT (coppie uguali)"),
            MetricValue::Num(600.0)
        );
        assert_eq!(
            metric(&trials, "Velocità di rotazione mentale"),
            MetricValue::Num(100.0)
        );
    }

    #[test]
    fn should_treat_negative_angles_like_positive_ones() {
        assert_eq!(condition_label(true, -90), "same-90");
    }

    #[test]
    fn should_use_only_same_pairs_for_the_slope() {
        let mut trials = linear(10.0);
        trials.push(trial(&condition_label(false, 0), Some(5000.0), None));
        trials.push(trial(&condition_label(false, 180), Some(100.0), None));
        let fit = rotation_slope(&trials).expect("retta definita");
        assert!((fit.slope - 10.0).abs() < 1e-6);
    }

    #[test]
    fn should_report_dashes_when_the_slope_is_not_defined() {
        let trials = [trial(&condition_label(true, 0), Some(600.0), None)];
        assert_eq!(
            metric(&trials, "Pendenza RT × angolo (coppie uguali)"),
            MetricValue::Text("—".into())
        );
        assert_eq!(
            metric(&trials, "Velocità di rotazione mentale"),
            MetricValue::Text("—".into())
        );
    }

    #[test]
    fn should_count_omissions_as_errors_and_exclude_interrupted_trials() {
        let trials = [
            trial(&condition_label(true, 30), Some(700.0), None),
            trial(&condition_label(false, 30), None, None),
            trial(
                &condition_label(true, 60),
                None,
                Some(ValidationFlag::Interrupted),
            ),
        ];
        assert_eq!(
            metric(&trials, "Accuratezza complessiva"),
            MetricValue::Num(50.0)
        );
        assert_eq!(
            metric(&trials, "Errori di omissione"),
            MetricValue::Num(1.0)
        );
    }
}
