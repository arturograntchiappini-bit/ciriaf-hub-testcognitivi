//! Operazioni misurate dal benchmark. Condiviso (via `#[path]`) dal bench nativo e dal wrapper WASM,
//! così le tre misure (TS, nativo, WASM) coprono esattamente le stesse operazioni sugli stessi input.
use serde::{Deserialize, Serialize};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::{SummaryMetric, TrialResult};
use sintropia_engines::corsi::score_corsi;
use sintropia_engines::corsi::{generate_balanced_sequences, CORSI_BLOCKS};
use sintropia_engines::defaults::all_params;
use sintropia_engines::flanker::{generate_flanker, score_flanker};
use sintropia_engines::gonogo::{generate_go_nogo, score_go_nogo};
pub use sintropia_engines::mental_rotation::Cube;
use sintropia_engines::mental_rotation::{
    generate_mental_rotation, is_chiral, project_faces, score_mental_rotation,
};
use sintropia_engines::nback::{generate_nback, score_nback};
use sintropia_engines::pvt::{generate_pvt, score_pvt};
use sintropia_engines::sart::{generate_sart, score_sart};
use sintropia_engines::stroop::{generate_stroop, score_stroop};
use sintropia_engines::trail_making::{generate_trail, score_trail_making, TrailPart};
use sintropia_engines::visual_search::{generate_visual_search, score_visual_search};
use sintropia_engines::wcst::{self, build_deck, score_wcst, TrialMeta};

pub const TESTS: [&str; 11] = [
    "stroop",
    "gonogo",
    "flanker",
    "sart",
    "visual_search",
    "pvt",
    "corsi",
    "nback",
    "wcst",
    "mental_rotation",
    "trail_making",
];
pub const ANGLES: [f64; 7] = [0.0, 30.0, 60.0, 90.0, 120.0, 150.0, 180.0];
pub const SEED: u32 = 42;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Extra {
    pub start_length: f64,
    pub n_quartiles: usize,
    pub n_targets: usize,
    pub metas: Vec<TrialMeta>,
    pub wcst: Option<wcst::Params>,
    pub cubes: Vec<Cube>,
}

#[derive(Deserialize)]
pub struct ScoreInput {
    pub trials: Vec<TrialResult>,
    #[serde(default)]
    pub extra: Extra,
}

fn finish<T: Serialize>(items: Vec<T>, json: bool) -> (usize, String) {
    let text = if json {
        serde_json::to_string(&items).unwrap_or_default()
    } else {
        String::new()
    };
    (items.len(), text)
}

/// Genera la sequenza del test (parametri di default con le numerosità moltiplicate per `scale`).
/// Ritorna (numero di elementi, JSON se richiesto).
pub fn generate(test: &str, scale: u32, json: bool) -> Option<(usize, String)> {
    let p = all_params();
    let mut r = mulberry32(SEED);
    let s = scale;
    Some(match test {
        "stroop" => {
            let q = sintropia_engines::stroop::StroopParams {
                n_trials: p.stroop1.n_trials * s,
                ..p.stroop1
            };
            finish(generate_stroop(&q, &mut r), json)
        }
        "gonogo" => finish(
            generate_go_nogo(
                &sintropia_engines::gonogo::GoNoGoParams {
                    n_trials: p.gonogo.n_trials * s,
                    ..p.gonogo
                },
                &mut r,
            ),
            json,
        ),
        "flanker" => finish(
            generate_flanker(
                &sintropia_engines::flanker::FlankerParams {
                    n_trials: p.flanker.n_trials * s,
                    ..p.flanker
                },
                &mut r,
            ),
            json,
        ),
        "sart" => finish(
            generate_sart(
                &sintropia_engines::sart::SartParams {
                    n_trials: p.sart.n_trials * s,
                    ..p.sart
                },
                &mut r,
            ),
            json,
        ),
        "visual_search" => finish(
            generate_visual_search(
                &sintropia_engines::visual_search::VisualSearchParams {
                    n_trials: p.visual_search.n_trials * s,
                    ..p.visual_search
                },
                &mut r,
            ),
            json,
        ),
        "pvt" => finish(
            generate_pvt(
                &sintropia_engines::pvt::Params {
                    n_trials: p.pvt.n_trials * s,
                    ..p.pvt
                },
                &mut r,
            ),
            json,
        ),
        "nback" => finish(
            generate_nback(
                &sintropia_engines::nback::Params {
                    n_trials: p.nback.n_trials * s as usize,
                    ..p.nback
                },
                &mut r,
            ),
            json,
        ),
        "wcst" => finish(build_deck(p.wcst.deck_size * s as usize, &mut r), json),
        "mental_rotation" => finish(
            generate_mental_rotation(
                &sintropia_engines::mental_rotation::Params {
                    n_trials: p.mental_rotation.n_trials * s as usize,
                    ..p.mental_rotation
                },
                &mut r,
            ),
            json,
        ),
        "trail_making" => {
            let n = (p.trail_making.n_targets * s) as usize;
            let mut circles = generate_trail(TrailPart::A, n, &mut r);
            circles.extend(generate_trail(TrailPart::B, n, &mut r));
            finish(circles, json)
        }
        "corsi" => {
            let mut all = Vec::new();
            for _ in 0..s {
                for length in 2..=9 {
                    all.extend(generate_balanced_sequences(
                        length,
                        2,
                        &p.corsi,
                        &mut r,
                        &CORSI_BLOCKS,
                    ));
                }
            }
            finish(all, json)
        }
        _ => return None,
    })
}

pub fn score(test: &str, i: &ScoreInput) -> Option<Vec<SummaryMetric>> {
    let t = &i.trials[..];
    let e = &i.extra;
    Some(match test {
        "stroop" => score_stroop(t),
        "gonogo" => score_go_nogo(t),
        "flanker" => score_flanker(t),
        "sart" => score_sart(t),
        "visual_search" => score_visual_search(t),
        "pvt" => score_pvt(t),
        "nback" => score_nback(t, e.n_quartiles),
        "mental_rotation" => score_mental_rotation(t),
        "trail_making" => score_trail_making(t, e.n_targets),
        "corsi" => score_corsi(t, e.start_length),
        "wcst" => score_wcst(t, &e.metas, e.wcst.as_ref()?),
        _ => return None,
    })
}

/// Confine JSON → punteggio → JSON (ciò che attraversa il bordo WASM).
pub fn score_json(test: &str, input: &str) -> String {
    match serde_json::from_str::<ScoreInput>(input) {
        Ok(i) => score(test, &i)
            .and_then(|m| serde_json::to_string(&m).ok())
            .unwrap_or_else(|| "error:score".into()),
        Err(e) => format!("error:{e}"),
    }
}

/// Proietta le facce a tutti e 7 gli angoli di rotazione.
pub fn project_all(cubes: &[Cube]) -> usize {
    ANGLES.iter().map(|&a| project_faces(cubes, a).len()).sum()
}

pub fn chiral(cubes: &[Cube]) -> bool {
    is_chiral(cubes)
}
