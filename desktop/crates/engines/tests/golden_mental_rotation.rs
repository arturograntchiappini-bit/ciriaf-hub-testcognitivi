//! Golden rotazione mentale: figure, chiralità, sequenze, facce proiettate, regressione e metriche dal TypeScript.
mod common;

use common::Evidence;
use serde_json::{json, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::TrialResult;
use sintropia_engines::defaults::all_params;
use sintropia_engines::mental_rotation::*;
use sintropia_engines::regression::least_squares;

fn from<T: serde::de::DeserializeOwned>(v: &Value) -> T {
    serde_json::from_value(v.clone()).unwrap_or_else(|e| panic!("fixture: {e}"))
}

fn seeded(seed: u64) -> impl FnMut() -> f64 {
    mulberry32(u32::try_from(seed).expect("seme u32"))
}

fn check_shapes(ev: &mut Evidence, fx: &Value) {
    for s in fx["shapes"].as_array().expect("shapes") {
        let seed = s["seed"].as_u64().expect("seed");
        let mut rand = seeded(seed);
        let cubes = generate_shape(&mut rand);
        let at = format!("shape@{seed}");
        ev.exact(&json!(cubes), &s["cubes"], &format!("{at}.cubes"));
        ev.exact(
            &is_chiral(&cubes),
            &s["chiral"].as_bool().expect("chiral"),
            &format!("{at}.chiral"),
        );
        ev.close(
            rand(),
            s["nextRand"].as_f64().expect("nextRand"),
            &format!("{at}.nextRand"),
        );
        ev.case("shapes");
        ev.seed(seed);
    }
    for h in fx["handShapes"].as_array().expect("handShapes") {
        let (id, cubes): (&str, Vec<Cube>) = (h["id"].as_str().expect("id"), from(&h["cubes"]));
        ev.exact(
            &is_chiral(&cubes),
            &h["chiral"].as_bool().expect("chiral"),
            &format!("{id}.chiral"),
        );
        ev.exact(
            &json!(mirror(&cubes)),
            &h["mirror"],
            &format!("{id}.mirror"),
        );
        ev.case("handShapes");
        ev.edge_case(&format!("isChiral/{id}"));
    }
}

fn check_generation(ev: &mut Evidence, fx: &Value) {
    for case in fx["generation"].as_array().expect("generation") {
        let id = case["id"].as_str().expect("id");
        let seed = case["seed"].as_u64().expect("seed");
        let params: Params = from(&case["params"]);
        let mut rand = seeded(seed);
        let stimuli = generate_mental_rotation(&params, &mut rand);
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
            ev.json(
                &json!(all_params().mental_rotation),
                &case["params"],
                "defaults.mentalRotation",
            );
        }
    }
}

fn check_projections(ev: &mut Evidence, fx: &Value) {
    for p in fx["projections"].as_array().expect("projections") {
        let id = p["id"].as_str().expect("id");
        let cubes: Vec<Cube> = from(&p["cubes"]);
        let faces = project_faces(&cubes, p["angle"].as_f64().expect("angle"));
        let want = p["faces"].as_array().expect("faces");
        ev.exact(&faces.len(), &want.len(), &format!("{id}.faces"));
        for (k, (f, w)) in faces.iter().zip(want).enumerate() {
            for (v, point) in f.points.iter().enumerate() {
                ev.close(
                    point[0],
                    w["points"][v][0].as_f64().expect("x"),
                    &format!("{id}[{k}].points[{v}].x"),
                );
                ev.close(
                    point[1],
                    w["points"][v][1].as_f64().expect("y"),
                    &format!("{id}[{k}].points[{v}].y"),
                );
            }
            ev.close(
                f.shade,
                w["shade"].as_f64().expect("shade"),
                &format!("{id}[{k}].shade"),
            );
        }
        ev.case("projections");
    }
}

fn check_regression_and_scoring(ev: &mut Evidence, fx: &Value) {
    for r in fx["regression"].as_array().expect("regression") {
        let points: Vec<(f64, f64)> = from(&r["points"]);
        let got = least_squares(&points);
        match (&r["fit"], got) {
            (Value::Null, None) => ev.exact(&true, &true, "leastSquares null"),
            (fit, Some((slope, intercept))) if !fit.is_null() => {
                ev.close(
                    slope,
                    fit["slope"].as_f64().expect("slope"),
                    &format!("leastSquares({points:?}).slope"),
                );
                ev.close(
                    intercept,
                    fit["intercept"].as_f64().expect("intercept"),
                    &format!("leastSquares({points:?}).intercept"),
                );
            }
            (want, got) => panic!("leastSquares({points:?}): TS {want} contro Rust {got:?}"),
        }
        ev.case("regression");
        ev.edge_case(&format!("leastSquares/{}punti", points.len()));
    }
    for case in fx["scoring"].as_array().expect("scoring") {
        let id = case["id"].as_str().expect("id");
        let trials: Vec<TrialResult> = from(&case["trials"]);
        ev.metrics(
            &score_mental_rotation(&trials),
            &case["metrics"],
            &format!("{id}.metrics"),
        );
        match (rotation_slope(&trials), &case["slope"]) {
            (None, Value::Null) => ev.exact(&true, &true, &format!("{id}.slope null")),
            (Some(fit), want) if !want.is_null() => {
                ev.close(
                    fit.slope,
                    want["slope"].as_f64().expect("slope"),
                    &format!("{id}.slope"),
                );
                ev.close(
                    fit.intercept,
                    want["intercept"].as_f64().expect("intercept"),
                    &format!("{id}.intercept"),
                );
            }
            (got, want) => panic!("{id}: rotationSlope Rust {got:?} contro TS {want}"),
        }
        ev.case("scoring");
        if case["kind"] == "edge" {
            ev.edge_case(id);
        }
    }
    for l in fx["labels"].as_array().expect("labels") {
        let (same, angle) = (
            l["same"].as_bool().expect("same"),
            i32::try_from(l["angle"].as_i64().expect("angle")).expect("i32"),
        );
        ev.exact(
            &condition_label(same, angle).as_str(),
            &l["label"].as_str().expect("label"),
            "conditionLabel",
        );
    }
}

#[test]
fn should_reproduce_ts_mental_rotation_fixture() {
    let fx = common::load_fixture("mental_rotation");
    let mut ev = Evidence::new("mental_rotation");
    check_shapes(&mut ev, &fx);
    check_generation(&mut ev, &fx);
    check_projections(&mut ev, &fx);
    check_regression_and_scoring(&mut ev, &fx);
    ev.write();
}
