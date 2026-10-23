//! Golden WCST: mazzo, regole, dimensioni combacianti, scoring perseverativo (Heaton) e metriche dal TypeScript.
mod common;

use common::Evidence;
use serde_json::{json, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::TrialResult;
use sintropia_engines::defaults::all_params;
use sintropia_engines::wcst::*;

fn usize_of(v: &Value) -> usize {
    usize::try_from(v.as_u64().expect("intero")).expect("usize")
}

fn from<T: serde::de::DeserializeOwned>(v: &Value) -> T {
    serde_json::from_value(v.clone()).unwrap_or_else(|e| panic!("fixture: {e}"))
}

fn check_generation(ev: &mut Evidence, fx: &Value) {
    for case in fx["generation"].as_array().expect("generation") {
        let id = case["id"].as_str().expect("id");
        let seed = case["seed"].as_u64().expect("seed");
        let mut rand = mulberry32(u32::try_from(seed).expect("seme u32"));
        let deck = build_deck(usize_of(&case["deckSize"]), &mut rand);
        ev.exact(&json!(deck), &case["deck"], &format!("{id}.deck"));
        ev.close(
            rand(),
            case["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
        ev.case("generation");
        ev.seed(seed);
        ev.variant(&format!("deckSize={}", usize_of(&case["deckSize"])));
    }
}

fn check_cards_and_rules(ev: &mut Evidence, fx: &Value) {
    for r in fx["rules"].as_array().expect("rules") {
        ev.exact(
            &json!(rule_for_category(usize_of(&r["category"]))),
            &r["rule"],
            "ruleForCategory",
        );
    }
    let dims = [Dim::Color, Dim::Shape, Dim::Number];
    for m in fx["matching"].as_array().expect("matching") {
        let (target, choice): (Card, Card) = (from(&m["target"]), from(&m["choice"]));
        ev.exact(
            &json!(matching_dims(&target, &choice)),
            &m["matching"],
            "matchingDims",
        );
        let on: Vec<bool> = dims
            .iter()
            .map(|&d| matches_on(&target, &choice, d))
            .collect();
        ev.exact(&json!(on), &m["matchesOn"], "matchesOn");
    }
}

fn check_perseveration(ev: &mut Evidence, fx: &Value) {
    for p in fx["perseveration"].as_array().expect("perseveration") {
        let id = p["id"].as_str().expect("id");
        let rules: Vec<Dim> = from(&p["rules"]);
        let matched: Vec<Vec<Dim>> = from(&p["matched"]);
        let steps: Vec<Step> = matched
            .into_iter()
            .zip(&rules)
            .map(|(matched, rule)| Step {
                correct: matched.contains(rule),
                matched,
            })
            .collect();
        let got = count_perseveration(&steps, &rules, usize_of(&p["runToShift"]));
        ev.exact(
            &got.errors,
            &usize_of(&p["expected"]["errors"]),
            &format!("{id}.errors"),
        );
        ev.exact(
            &got.responses,
            &usize_of(&p["expected"]["responses"]),
            &format!("{id}.responses"),
        );
        ev.case("perseveration");
        if !id.starts_with("sim-") {
            ev.edge_case(id);
        }
    }
}

fn check_scoring(ev: &mut Evidence, fx: &Value) {
    for case in fx["scoring"].as_array().expect("scoring") {
        let id = case["id"].as_str().expect("id");
        let (params, trials, metas): (Params, Vec<TrialResult>, Vec<TrialMeta>) = (
            from(&case["params"]),
            from(&case["trials"]),
            from(&case["metas"]),
        );
        ev.metrics(
            &score_wcst(&trials, &metas, &params),
            &case["metrics"],
            &format!("{id}.metrics"),
        );
        ev.case("scoring");
        if case["kind"] == "edge" {
            ev.edge_case(id);
        }
    }
}

#[test]
fn should_reproduce_ts_wcst_fixture() {
    let fx = common::load_fixture("wcst");
    let mut ev = Evidence::new("wcst");
    check_generation(&mut ev, &fx);
    check_cards_and_rules(&mut ev, &fx);
    check_perseveration(&mut ev, &fx);
    check_scoring(&mut ev, &fx);
    let p = &fx["scoring"][0]["params"];
    ev.json(
        &json!(all_params().wcst),
        &json!({"deckSize": p["deckSize"], "runToShift": 10, "maxCategories": p["maxCategories"]}),
        "defaults.wcst",
    );
    ev.write();
}
