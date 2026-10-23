//! Golden N-Back: lettere, target e lure (n = 1..4, lureRate 0 / 0.2 / assente), SDT e metriche dal TypeScript.
mod common;

use common::Evidence;
use serde_json::{json, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::TrialResult;
use sintropia_engines::defaults::all_params;
use sintropia_engines::nback::*;

fn usize_of(v: &Value) -> usize {
    usize::try_from(v.as_u64().expect("intero")).expect("usize")
}

fn positions(v: &Value) -> Vec<usize> {
    v.as_array().expect("array").iter().map(usize_of).collect()
}

fn check_generation(ev: &mut Evidence, fx: &Value) {
    for case in fx["generation"].as_array().expect("generation") {
        let id = case["id"].as_str().expect("id");
        let seed = case["seed"].as_u64().expect("seed");
        let params: Params = serde_json::from_value(case["params"].clone()).expect("params");
        let mut rand = mulberry32(u32::try_from(seed).expect("seme u32"));
        let stimuli = generate_nback(&params, &mut rand);
        let letters: String = stimuli.iter().map(|s| s.letter).collect();
        let flagged = |pick: fn(&Stimulus) -> bool| -> Vec<usize> {
            stimuli
                .iter()
                .enumerate()
                .filter(|(_, s)| pick(s))
                .map(|(i, _)| i)
                .collect()
        };
        ev.exact(
            &letters.as_str(),
            &case["letters"].as_str().expect("letters"),
            &format!("{id}.letters"),
        );
        ev.exact(
            &flagged(|s| s.is_target),
            &positions(&case["targets"]),
            &format!("{id}.targets"),
        );
        ev.exact(
            &flagged(|s| s.is_lure),
            &positions(&case["lures"]),
            &format!("{id}.lures"),
        );
        ev.close(
            rand(),
            case["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
        ev.case("generation");
        ev.seed(seed);
        ev.variant(case["variant"].as_str().expect("variant"));
    }
}

fn check_scoring(ev: &mut Evidence, fx: &Value) {
    for case in fx["scoring"].as_array().expect("scoring") {
        let id = case["id"].as_str().expect("id");
        let trials: Vec<TrialResult> =
            serde_json::from_value(case["trials"].clone()).expect("trial");
        ev.metrics(
            &score_nback(&trials, usize_of(&case["nQuartiles"])),
            &case["metrics"],
            &format!("{id}.metrics"),
        );
        ev.case("scoring");
        if case["kind"] == "edge" {
            ev.edge_case(id);
        }
    }
}

fn check_sdt(ev: &mut Evidence, fx: &Value) {
    for p in fx["probit"].as_array().expect("probit") {
        let x = p["p"].as_f64().expect("p");
        ev.close(
            probit(x),
            p["value"].as_f64().expect("value"),
            &format!("probit({x})"),
        );
    }
    for s in fx["sdt"].as_array().expect("sdt") {
        let f = |k: &str| s[k].as_f64().expect("numero");
        let at = format!(
            "sdt({},{},{},{})",
            f("hits"),
            f("targets"),
            f("fa"),
            f("nonTargets")
        );
        ev.close(
            d_prime(f("hits"), f("targets"), f("fa"), f("nonTargets")),
            f("dPrime"),
            &format!("{at}.dPrime"),
        );
        ev.close(
            criterion_c(f("hits"), f("targets"), f("fa"), f("nonTargets")),
            f("c"),
            &format!("{at}.c"),
        );
    }
    for c in fx["chunks"].as_array().expect("chunks") {
        let items: Vec<i64> = serde_json::from_value(c["items"].clone()).expect("items");
        let got = split_into_chunks(&items, usize_of(&c["k"]));
        ev.exact(
            &json!(got),
            &c["chunks"],
            &format!("splitIntoChunks({items:?})"),
        );
    }
    ev.exact(
        &NBACK_LETTERS.iter().collect::<String>().as_str(),
        &fx["letters"].as_str().expect("letters"),
        "NBACK_LETTERS",
    );
}

#[test]
fn should_reproduce_ts_nback_fixture() {
    let fx = common::load_fixture("nback");
    let mut ev = Evidence::new("nback");
    check_generation(&mut ev, &fx);
    check_scoring(&mut ev, &fx);
    check_sdt(&mut ev, &fx);
    let default = fx["generation"]
        .as_array()
        .expect("generation")
        .iter()
        .find(|c| c["variant"] == "n2-t360-lure0.2")
        .expect("default");
    ev.json(
        &json!(all_params().nback),
        &default["params"],
        "defaults.nback",
    );
    ev.write();
}
