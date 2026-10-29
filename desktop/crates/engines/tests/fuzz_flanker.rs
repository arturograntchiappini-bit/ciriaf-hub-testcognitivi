//! Fuzz differenziale Flanker: sequenze, metriche e adattamento al conflitto contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::{json, Value};
use sintropia_engines::flanker::{
    conflict_adaptation, generate_flanker, score_flanker, FlankerParams,
};

#[test]
fn should_match_typescript_on_flanker_fuzz_corpus() {
    let fx = load("flanker");
    let mut fz = Fuzz::new("flanker");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_flanker(&from::<FlankerParams>(&c["params"]), &mut rand);
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let t = trials("flanker", &c["trials"]);
        ev.metrics(&score_flanker(&t), &c["metrics"], &format!("{id}.metrics"));
        let at = format!("{id}.conflictAdaptation");
        match (conflict_adaptation(&t), &c["extra"]["conflictAdaptation"]) {
            (None, Value::Null) => ev.exact(&true, &true, &at),
            (Some(actual), Value::Number(expected)) => {
                ev.close(actual, expected.as_f64().expect("numero"), &at)
            }
            (actual, expected) => panic!("{at}: Rust {actual:?} contro TS {expected}"),
        }
    });
    fz.finish(&fx);
}
