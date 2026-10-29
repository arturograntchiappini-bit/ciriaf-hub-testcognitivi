//! Fuzz differenziale Corsi: livelli bilanciati con RNG condiviso, geometria, span, regola di arresto e metriche contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, usize_of, Fuzz};
use serde_json::Value;
use sintropia_engines::corsi::*;

fn indices(v: &Value) -> Vec<usize> {
    v.as_array().expect("array").iter().map(usize_of).collect()
}

#[test]
fn should_match_typescript_on_corsi_fuzz_corpus() {
    let fx = load("corsi");
    let mut fz = Fuzz::new("corsi");
    fz.each(&fx, "generation", |c, id, ev| {
        let params: Params = from(&c["params"]);
        let mut rand = seeded(c);
        for level in c["levels"].as_array().expect("levels") {
            let (length, count) = (usize_of(&level["length"]), usize_of(&level["count"]));
            let at = format!("{id}.L{length}");
            let got = generate_balanced_sequences(length, count, &params, &mut rand, &CORSI_BLOCKS);
            let want = level["sequences"].as_array().expect("sequences");
            ev.exact(&got.len(), &want.len(), &format!("{at}.count"));
            for (k, (g, w)) in got.iter().zip(want).enumerate() {
                ev.exact(
                    &g.indices,
                    &indices(&w["indices"]),
                    &format!("{at}[{k}].indices"),
                );
                ev.exact(
                    &g.crossings,
                    &usize_of(&w["crossings"]),
                    &format!("{at}[{k}].crossings"),
                );
                ev.close(
                    g.path_length,
                    w["pathLength"].as_f64().expect("pathLength"),
                    &format!("{at}[{k}].pathLength"),
                );
            }
            ev.close(
                rand(),
                level["nextRand"].as_f64().expect("nextRand"),
                &format!("{at}.nextRand"),
            );
        }
    });
    fz.each(&fx, "geometry", |c, id, ev| {
        let seq = indices(&c["indices"]);
        ev.close(
            path_length(&seq, &CORSI_BLOCKS),
            c["pathLength"].as_f64().expect("pathLength"),
            &format!("{id}.pathLength"),
        );
        ev.exact(
            &count_crossings(&seq, &CORSI_BLOCKS),
            &usize_of(&c["crossings"]),
            &format!("{id}.crossings"),
        );
    });
    fz.each(&fx, "spans", |c, id, ev| {
        let start = c["startLength"].as_f64().expect("start");
        ev.close(
            corsi_span(usize_of(&c["passed"]), start),
            c["span"].as_f64().expect("span"),
            &format!("{id}.span"),
        );
    });
    fz.each(&fx, "stops", |c, id, ev| {
        let results: Vec<bool> = from(&c["levelResults"]);
        ev.exact(
            &should_stop(&results),
            &c["stop"].as_bool().expect("stop"),
            &format!("{id}.stop"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let start = c["startLength"].as_f64().expect("startLength");
        ev.metrics(
            &score_corsi(&trials("corsi", &c["trials"]), start),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    fz.finish(&fx);
}
