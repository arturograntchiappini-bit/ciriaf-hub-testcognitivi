//! Fuzz differenziale PVT: sequenze ISI e metriche contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::json;
use sintropia_engines::pvt::{generate_pvt, score_pvt, Params};

#[test]
fn should_match_typescript_on_pvt_fuzz_corpus() {
    let fx = load("pvt");
    let mut fz = Fuzz::new("pvt");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_pvt(&from::<Params>(&c["params"]), &mut rand);
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        ev.metrics(
            &score_pvt(&trials("pvt", &c["trials"])),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    fz.finish(&fx);
}
