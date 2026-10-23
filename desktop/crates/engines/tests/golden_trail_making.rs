//! Golden Trail Making: etichette, posizioni dei cerchi, TrailRun e metriche identiche al TypeScript
//! (`desktop/fixtures/trail_making.json`).
mod common;

use common::{load_fixture, Evidence};
use serde::Deserialize;
use serde_json::Value;
use sintropia_core::rng::mulberry32;
use sintropia_core::types::{Phase, TrialResult};
use sintropia_engines::defaults::all_params;
use sintropia_engines::trail_making::{
    generate_trail, score_trail_making, trail_labels, TrailPart, TrailRun,
};

#[derive(Deserialize)]
struct GenParams {
    part: TrailPart,
    n: usize,
}

fn part_of(value: &Value) -> TrailPart {
    serde_json::from_value(value.clone()).expect("parte A/B")
}

fn phase_of(value: &Value) -> Phase {
    serde_json::from_value(value.clone()).expect("fase")
}

fn check_runs(ev: &mut Evidence, fixture: &Value) {
    for case in fixture["runs"].as_array().expect("runs") {
        let id = case["id"].as_str().expect("id");
        let part = part_of(&case["part"]);
        let seed = u32::try_from(case["seed"].as_u64().expect("seed")).expect("u32");
        let n = usize::try_from(case["n"].as_u64().expect("n")).expect("n");
        let circles = generate_trail(part, n, &mut mulberry32(seed));
        let start = case["startMs"].as_f64().expect("startMs");
        let mut run = TrailRun::new(
            circles.clone(),
            part,
            phase_of(&case["phase"]),
            "GOLDEN-0001",
            start,
        );
        let idle = TrailRun::new(circles, part, Phase::Test, "x", 0.0);
        ev.exact(
            &idle.target().map(str::to_string),
            &case["initialTarget"].as_str().map(str::to_string),
            &format!("{id}.initialTarget"),
        );
        for (i, step) in case["steps"].as_array().expect("steps").iter().enumerate() {
            let at = format!("{id}.steps[{i}]");
            let index = usize::try_from(step["index"].as_u64().expect("indice")).expect("indice");
            let actual = run.click(index, step["nowMs"].as_f64().expect("nowMs"));
            let actual_json = actual.as_ref().map_or(Value::Null, |t: &TrialResult| {
                serde_json::to_value(t).expect("trial")
            });
            ev.json(&actual_json, &step["trial"], &format!("{at}.trial"));
            ev.exact(
                &run.target().map(str::to_string),
                &step["target"].as_str().map(str::to_string),
                &format!("{at}.target"),
            );
            ev.exact(
                &run.done(),
                &step["done"].as_bool().expect("done"),
                &format!("{at}.done"),
            );
        }
        ev.case("run");
    }
}

#[test]
fn should_reproduce_typescript_trail_making_sequences_runs_and_metrics() {
    let fixture = load_fixture("trail_making");
    let mut evidence = Evidence::new("trail_making");

    let defaults = serde_json::to_value(all_params().trail_making).expect("default");
    evidence.json(&defaults, &fixture["defaults"], "defaults");

    for (i, row) in fixture["labels"]
        .as_array()
        .expect("labels")
        .iter()
        .enumerate()
    {
        let n = usize::try_from(row["n"].as_u64().expect("n")).expect("n");
        let labels = serde_json::to_value(trail_labels(part_of(&row["part"]), n)).expect("labels");
        evidence.json(&labels, &row["labels"], &format!("labels[{i}]"));
    }

    evidence.generation(
        &fixture,
        |p: &GenParams, rand| generate_trail(p.part, p.n, rand),
        |_, _, _, _| {},
    );

    check_runs(&mut evidence, &fixture);

    for case in fixture["scoring"].as_array().expect("scoring") {
        let id = case["id"].as_str().expect("id");
        let trials: Vec<TrialResult> =
            serde_json::from_value(case["trials"].clone()).expect("trial");
        let n_targets = usize::try_from(case["nTargets"].as_u64().expect("nTargets")).expect("n");
        evidence.metrics(
            &score_trail_making(&trials, n_targets),
            &case["metrics"],
            &format!("{id}.metrics"),
        );
        evidence.case("scoring");
        if case["kind"] == "edge" {
            evidence.edge_case(id);
        }
    }

    evidence.write();
}
