//! Golden Corsi: sequenze bilanciate per livello, geometria del layout e metriche dal TypeScript.
mod common;

use common::Evidence;
use serde_json::{json, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::TrialResult;
use sintropia_engines::corsi::*;

fn usize_of(v: &Value) -> usize {
    usize::try_from(v.as_u64().expect("intero")).expect("usize")
}

fn indices(v: &Value) -> Vec<usize> {
    v.as_array().expect("array").iter().map(usize_of).collect()
}

fn check_generation(ev: &mut Evidence, fx: &Value) {
    for case in fx["generation"].as_array().expect("generation") {
        let id = case["id"].as_str().expect("id");
        let seed = case["seed"].as_u64().expect("seed");
        let params: Params = serde_json::from_value(case["params"].clone()).expect("params");
        let mut rand = mulberry32(u32::try_from(seed).expect("seme u32"));
        for level in case["levels"].as_array().expect("levels") {
            let (length, count) = (usize_of(&level["length"]), usize_of(&level["count"]));
            let at = format!("{id}.L{length}");
            let got = generate_balanced_sequences(length, count, &params, &mut rand, &CORSI_BLOCKS);
            let want = level["sequences"].as_array().expect("sequences");
            ev.exact(&got.len(), &want.len(), &format!("{at}.count"));
            for (k, (g, w)) in got.iter().zip(want).enumerate() {
                ev.exact(
                    &g.indices,
                    &indices(&w["indices"]),
                    &format!("{at}[{k}].indices"),
                );
                ev.exact(
                    &g.crossings,
                    &usize_of(&w["crossings"]),
                    &format!("{at}[{k}].crossings"),
                );
                ev.close(
                    g.path_length,
                    w["pathLength"].as_f64().expect("pathLength"),
                    &format!("{at}[{k}].pathLength"),
                );
            }
            ev.close(
                rand(),
                level["nextRand"].as_f64().expect("nextRand"),
                &format!("{at}.nextRand"),
            );
        }
        ev.case("generation");
        ev.seed(seed);
        ev.variant(&format!(
            "complexityTolerance={}",
            params.complexity_tolerance
        ));
    }
}

fn check_geometry(ev: &mut Evidence, fx: &Value) {
    let g = &fx["geometry"];
    ev.close(
        mean_pairwise_distance(&CORSI_BLOCKS),
        g["meanPairwiseDistance"].as_f64().expect("mpd"),
        "meanPairwiseDistance",
    );
    for (length, want) in g["targetPathLength"]
        .as_array()
        .expect("target")
        .iter()
        .enumerate()
    {
        ev.close(
            target_path_length(length, &CORSI_BLOCKS),
            want.as_f64().expect("f64"),
            &format!("targetPathLength({length})"),
        );
    }
    for pair in g["pairDistanceBits"].as_array().expect("pairDistanceBits") {
        let (i, j) = (usize_of(&pair["i"]), usize_of(&pair["j"]));
        let got = format!("{:016x}", path_length(&[i, j], &CORSI_BLOCKS).to_bits());
        ev.exact(
            &got.as_str(),
            &pair["bits"].as_str().expect("bits"),
            &format!("distanza bit-esatta {i}->{j}"),
        );
    }
    for s in g["sequences"].as_array().expect("sequences") {
        let seq = indices(&s["indices"]);
        let at = format!("sequence {seq:?}");
        ev.close(
            path_length(&seq, &CORSI_BLOCKS),
            s["pathLength"].as_f64().expect("pathLength"),
            &format!("{at}.pathLength"),
        );
        ev.exact(
            &count_crossings(&seq, &CORSI_BLOCKS),
            &usize_of(&s["crossings"]),
            &format!("{at}.crossings"),
        );
        ev.case("geometry");
    }
    for (i, b) in fx["blocks"].as_array().expect("blocks").iter().enumerate() {
        ev.close(
            CORSI_BLOCKS[i].x,
            b["x"].as_f64().expect("x"),
            &format!("block{i}.x"),
        );
        ev.close(
            CORSI_BLOCKS[i].y,
            b["y"].as_f64().expect("y"),
            &format!("block{i}.y"),
        );
    }
}

fn check_scoring(ev: &mut Evidence, fx: &Value) {
    for case in fx["scoring"].as_array().expect("scoring") {
        let id = case["id"].as_str().expect("id");
        let trials: Vec<TrialResult> =
            serde_json::from_value(case["trials"].clone()).expect("trial");
        let start = case["startLength"].as_f64().expect("startLength");
        ev.metrics(
            &score_corsi(&trials, start),
            &case["metrics"],
            &format!("{id}.metrics"),
        );
        ev.case("scoring");
        if case["kind"] == "edge" {
            ev.edge_case(id);
        }
    }
    for s in fx["spans"].as_array().expect("spans") {
        let (passed, start) = (
            usize_of(&s["passed"]),
            s["startLength"].as_f64().expect("start"),
        );
        ev.close(
            corsi_span(passed, start),
            s["span"].as_f64().expect("span"),
            &format!("corsiSpan({passed},{start})"),
        );
    }
    for s in fx["stopCases"].as_array().expect("stopCases") {
        let results: Vec<bool> = serde_json::from_value(s["levelResults"].clone()).expect("bool[]");
        ev.exact(
            &should_stop(&results),
            &s["stop"].as_bool().expect("stop"),
            &format!("shouldStop({results:?})"),
        );
    }
}

#[test]
fn should_reproduce_ts_corsi_fixture() {
    let fx = common::load_fixture("corsi");
    let mut ev = Evidence::new("corsi");
    check_generation(&mut ev, &fx);
    check_geometry(&mut ev, &fx);
    check_scoring(&mut ev, &fx);
    let default = fx["generation"][0]["params"].clone();
    let mut want = default;
    want["complexityTolerance"] = json!(8);
    ev.json(
        &json!(sintropia_engines::defaults::all_params().corsi),
        &want,
        "defaults.corsi",
    );
    ev.write();
}
