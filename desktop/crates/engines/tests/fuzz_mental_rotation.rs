//! Fuzz differenziale rotazione mentale: figure, chiralità, sequenze, proiezioni, regressione e metriche contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::{json, Value};
use sintropia_engines::mental_rotation::*;
use sintropia_engines::regression::least_squares;

fn fit_json(fit: Option<(f64, f64)>) -> Value {
    fit.map_or(
        Value::Null,
        |(slope, intercept)| json!({"slope": slope, "intercept": intercept}),
    )
}

#[test]
fn should_match_typescript_on_mental_rotation_fuzz_corpus() {
    let fx = load("mental_rotation");
    let mut fz = Fuzz::new("mental_rotation");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_mental_rotation(&from::<Params>(&c["params"]), &mut rand);
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "shapes", |c, id, ev| {
        let mut rand = seeded(c);
        let cubes = generate_shape(&mut rand);
        ev.json(&json!(cubes), &c["cubes"], &format!("{id}.cubes"));
        ev.exact(
            &is_chiral(&cubes),
            &c["chiral"].as_bool().expect("chiral"),
            &format!("{id}.chiral"),
        );
        ev.json(
            &json!(mirror(&cubes)),
            &c["mirror"],
            &format!("{id}.mirror"),
        );
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "projections", |c, id, ev| {
        let cubes: Vec<Cube> = from(&c["cubes"]);
        let faces = project_faces(&cubes, c["angle"].as_f64().expect("angle"));
        let want = c["faces"].as_array().expect("faces");
        ev.exact(&faces.len(), &want.len(), &format!("{id}.faces"));
        for (k, (f, w)) in faces.iter().zip(want).enumerate() {
            ev.json(&json!(f.points), &w["points"], &format!("{id}[{k}].points"));
            ev.close(
                f.shade,
                w["shade"].as_f64().expect("shade"),
                &format!("{id}[{k}].shade"),
            );
        }
    });
    fz.each(&fx, "regression", |c, id, ev| {
        let points: Vec<(f64, f64)> = from(&c["points"]);
        ev.json(
            &fit_json(least_squares(&points)),
            &c["fit"],
            &format!("{id}.fit"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let t = trials("mentalRotation", &c["trials"]);
        ev.metrics(
            &score_mental_rotation(&t),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
        let slope = rotation_slope(&t).map(|f| (f.slope, f.intercept));
        ev.json(
            &fit_json(slope),
            &c["extra"]["slope"],
            &format!("{id}.slope"),
        );
    });
    fz.finish(&fx);
}
