//! Fuzz differenziale N-Back: lettere, target e lure, scoring a quartili, probit, SDT e chunk contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, usize_of, Fuzz};
use serde_json::{json, Value};
use sintropia_engines::nback::*;

fn positions(stimuli: &[Stimulus], pick: fn(&Stimulus) -> bool) -> Value {
    json!(stimuli
        .iter()
        .enumerate()
        .filter(|(_, s)| pick(s))
        .map(|(i, _)| i)
        .collect::<Vec<_>>())
}

#[test]
fn should_match_typescript_on_nback_fuzz_corpus() {
    let fx = load("nback");
    let mut fz = Fuzz::new("nback");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_nback(&from::<Params>(&c["params"]), &mut rand);
        let letters: String = stimuli.iter().map(|s| s.letter).collect();
        ev.exact(
            &letters.as_str(),
            &c["letters"].as_str().expect("letters"),
            &format!("{id}.letters"),
        );
        ev.json(
            &positions(&stimuli, |s| s.is_target),
            &c["targets"],
            &format!("{id}.targets"),
        );
        ev.json(
            &positions(&stimuli, |s| s.is_lure),
            &c["lures"],
            &format!("{id}.lures"),
        );
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let t = trials("nback", &c["trials"]);
        ev.metrics(
            &score_nback(&t, usize_of(&c["nQuartiles"])),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    fz.each(&fx, "probit", |c, id, ev| {
        let p = c["p"].as_f64().expect("p");
        ev.close(
            probit(p),
            c["value"].as_f64().expect("value"),
            &format!("{id}.probit({p})"),
        );
    });
    fz.each(&fx, "sdt", |c, id, ev| {
        let f = |k: &str| c[k].as_f64().expect("numero");
        ev.close(
            d_prime(f("hits"), f("targets"), f("fa"), f("nonTargets")),
            f("dPrime"),
            &format!("{id}.dPrime"),
        );
        ev.close(
            criterion_c(f("hits"), f("targets"), f("fa"), f("nonTargets")),
            f("c"),
            &format!("{id}.c"),
        );
    });
    fz.each(&fx, "chunks", |c, id, ev| {
        let items: Vec<i64> = from(&c["items"]);
        ev.json(
            &json!(split_into_chunks(&items, usize_of(&c["k"]))),
            &c["chunks"],
            &format!("{id}.chunks"),
        );
    });
    fz.finish(&fx);
}
