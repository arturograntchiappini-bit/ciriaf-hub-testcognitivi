//! Golden PVT: riproduce le sequenze ISI e le metriche generate dal TypeScript (`tools/golden/pvt.mjs`).
mod common;

use common::Evidence;
use serde_json::json;
use sintropia_core::rng::mulberry32;
use sintropia_engines::defaults::all_params;
use sintropia_engines::pvt::{generate_pvt, score_pvt, Params};

#[test]
fn should_reproduce_ts_pvt_fixture() {
    let fx = common::load_fixture("pvt");
    let mut ev = Evidence::new("pvt");

    for case in fx["generation"].as_array().expect("generation") {
        let id = case["id"].as_str().expect("id");
        let seed = case["seed"].as_u64().expect("seed");
        let params: Params = serde_json::from_value(case["params"].clone()).expect("params");
        let mut rand = mulberry32(u32::try_from(seed).expect("seme u32"));
        let stimuli = generate_pvt(&params, &mut rand);
        ev.json(&json!(stimuli), &case["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            case["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
        ev.case("generation");
        ev.seed(seed);
        ev.variant(case["variant"].as_str().expect("variant"));
        if case["variant"] == "default" && seed == 1 {
            ev.json(&json!(all_params().pvt), &case["params"], "defaults.pvt");
        }
    }

    ev.scoring(&fx, score_pvt, |_, _, _, _| {});
    ev.write();
}
