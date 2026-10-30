//! Smistamento delle richieste JSON verso i motori. Funzioni pure, nessun I/O: stesse sequenze e stesse metriche
//! dei motori nativi (verificate dalle fixture golden, vedi `tests/parity.rs`).
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::TrialResult;
use sintropia_core::ENGINE_VERSION;
use sintropia_engines::corsi::{self, CORSI_BLOCKS};
use sintropia_engines::wcst::{self, TrialMeta};
use sintropia_engines::{
    flanker, gonogo, mental_rotation, nback, pvt, sart, stroop, trail_making, visual_search,
};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Request {
    op: String,
    #[serde(default)]
    test: String,
    #[serde(default)]
    seed: Option<f64>,
    #[serde(default)]
    params: Value,
    #[serde(default)]
    args: Value,
    #[serde(default)]
    trials: Vec<TrialResult>,
    #[serde(default)]
    extra: Extra,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct Extra {
    start_length: f64,
    n_quartiles: usize,
    n_targets: usize,
    metas: Vec<TrialMeta>,
    wcst: Option<wcst::Params>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CorsiArgs {
    length: usize,
    count: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeckArgs {
    deck_size: usize,
}

#[derive(Deserialize)]
struct TrailArgs {
    part: String,
    n: usize,
}

/// Elabora una richiesta e restituisce sempre un JSON: `{"ok": ...}` oppure `{"error": "..."}`.
/// Le generazioni aggiungono `"calls"`, il numero di estrazioni casuali: `mulberry32` avanza di una costante a ogni
/// estrazione, quindi chi deve proseguire lo stesso flusso (Corsi) ricava il nuovo stato senza che il modulo ne tenga uno.
pub fn handle(request: &[u8]) -> String {
    let outcome = serde_json::from_slice::<Request>(request)
        .map_err(|e| format!("richiesta non valida: {e}"))
        .and_then(run);
    match outcome {
        Ok((value, None)) => json!({ "ok": value }),
        Ok((value, Some(calls))) => json!({ "ok": value, "calls": calls }),
        Err(message) => json!({ "error": message }),
    }
    .to_string()
}

fn run(req: Request) -> Result<(Value, Option<u64>), String> {
    match req.op.as_str() {
        "version" => Ok((json!(ENGINE_VERSION), None)),
        "generate" => {
            let mut calls = 0_u64;
            let mut rand = mulberry32(to_u32(req.seed.ok_or("seed mancante")?));
            let mut counted = || {
                calls += 1;
                rand()
            };
            let value = generate(&req, &mut counted)?;
            Ok((value, Some(calls)))
        }
        "score" => score(&req).map(|v| (v, None)),
        other => Err(format!("operazione sconosciuta: {other}")),
    }
}

/// Equivalente di `seed >>> 0` in JavaScript.
fn to_u32(seed: f64) -> u32 {
    seed.trunc().rem_euclid(4_294_967_296.0) as u32
}

fn parse<T: DeserializeOwned>(value: &Value, what: &str) -> Result<T, String> {
    serde_json::from_value(value.clone()).map_err(|e| format!("{what} non validi: {e}"))
}

fn to_json<T: Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|e| e.to_string())
}

fn generate(req: &Request, rand: &mut dyn FnMut() -> f64) -> Result<Value, String> {
    let p = &req.params;
    match req.test.as_str() {
        "stroop" => to_json(stroop::generate_stroop(&parse(p, "parametri")?, rand)),
        "gonogo" => to_json(gonogo::generate_go_nogo(&parse(p, "parametri")?, rand)),
        "flanker" => to_json(flanker::generate_flanker(&parse(p, "parametri")?, rand)),
        "sart" => to_json(sart::generate_sart(&parse(p, "parametri")?, rand)),
        "visual_search" => to_json(visual_search::generate_visual_search(
            &parse(p, "parametri")?,
            rand,
        )),
        "pvt" => to_json(pvt::generate_pvt(&parse(p, "parametri")?, rand)),
        "nback" => to_json(nback::generate_nback(&parse(p, "parametri")?, rand)),
        "mental_rotation" => to_json(mental_rotation::generate_mental_rotation(
            &parse(p, "parametri")?,
            rand,
        )),
        "wcst" => {
            let a: DeckArgs = parse(&req.args, "argomenti")?;
            to_json(wcst::build_deck(a.deck_size, rand))
        }
        "corsi" => {
            let a: CorsiArgs = parse(&req.args, "argomenti")?;
            to_json(corsi::generate_balanced_sequences(
                a.length,
                a.count,
                &parse(p, "parametri")?,
                rand,
                &CORSI_BLOCKS,
            ))
        }
        "trail_making" => {
            let a: TrailArgs = parse(&req.args, "argomenti")?;
            let part = match a.part.as_str() {
                "A" => trail_making::TrailPart::A,
                "B" => trail_making::TrailPart::B,
                other => return Err(format!("parte sconosciuta: {other}")),
            };
            to_json(trail_making::generate_trail(part, a.n, rand))
        }
        other => Err(format!("test sconosciuto: {other}")),
    }
}

fn score(req: &Request) -> Result<Value, String> {
    let t = &req.trials[..];
    let e = &req.extra;
    match req.test.as_str() {
        "stroop" => to_json(stroop::score_stroop(t)),
        "gonogo" => to_json(gonogo::score_go_nogo(t)),
        "flanker" => to_json(flanker::score_flanker(t)),
        "sart" => to_json(sart::score_sart(t)),
        "visual_search" => to_json(visual_search::score_visual_search(t)),
        "pvt" => to_json(pvt::score_pvt(t)),
        "nback" => to_json(nback::score_nback(t, e.n_quartiles)),
        "mental_rotation" => to_json(mental_rotation::score_mental_rotation(t)),
        "trail_making" => to_json(trail_making::score_trail_making(t, e.n_targets)),
        "corsi" => to_json(corsi::score_corsi(t, e.start_length)),
        "wcst" => {
            let params = e.wcst.as_ref().ok_or("parametri WCST mancanti")?;
            to_json(wcst::score_wcst(t, &e.metas, params))
        }
        other => Err(format!("test sconosciuto: {other}")),
    }
}
