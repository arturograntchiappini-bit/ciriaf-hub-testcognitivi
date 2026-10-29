//! Fuzz differenziale Trail Making: etichette, posizioni dei cerchi, TrailRun (clic casuali) e metriche contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, usize_of, Fuzz};
use serde::Deserialize;
use serde_json::{json, Value};
use sintropia_core::types::{Phase, TrialResult};
use sintropia_engines::trail_making::{
    generate_trail, score_trail_making, trail_labels, TrailPart, TrailRun,
};

#[derive(Deserialize)]
struct GenParams {
    part: TrailPart,
    n: usize,
}

#[test]
fn should_match_typescript_on_trail_making_fuzz_corpus() {
    let fx = load("trail_making");
    let mut fz = Fuzz::new("trail_making");
    fz.each(&fx, "generation", |c, id, ev| {
        let p: GenParams = from(&c["params"]);
        let mut rand = seeded(c);
        ev.json(
            &json!(generate_trail(p.part, p.n, &mut rand)),
            &c["stimuli"],
            &format!("{id}.stimuli"),
        );
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "labels", |c, id, ev| {
        let labels = trail_labels(from(&c["part"]), usize_of(&c["n"]));
        ev.json(&json!(labels), &c["labels"], &format!("{id}.labels"));
    });
    fz.each(&fx, "runs", |c, id, ev| {
        let part: TrailPart = from(&c["part"]);
        let seed = u32::try_from(c["seed"].as_u64().expect("seed")).expect("u32");
        let circles = generate_trail(
            part,
            usize_of(&c["n"]),
            &mut sintropia_core::rng::mulberry32(seed),
        );
        let phase: Phase = from(&c["phase"]);
        let mut run = TrailRun::new(
            circles.clone(),
            part,
            phase,
            "FUZZ-0001",
            c["startMs"].as_f64().expect("startMs"),
        );
        let idle = TrailRun::new(circles, part, Phase::Test, "x", 0.0);
        ev.exact(
            &idle.target().map(str::to_string),
            &c["initialTarget"].as_str().map(str::to_string),
            &format!("{id}.initialTarget"),
        );
        for (i, step) in c["steps"].as_array().expect("steps").iter().enumerate() {
            let at = format!("{id}.steps[{i}]");
            let actual = run.click(
                usize_of(&step["index"]),
                step["nowMs"].as_f64().expect("nowMs"),
            );
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
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let t = trials("trailMaking", &c["trials"]);
        ev.metrics(
            &score_trail_making(&t, usize_of(&c["nTargets"])),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    fz.finish(&fx);
}
