//! Fuzz differenziale WCST: mazzo, conteggi perseverativi (Heaton) e scoring con meta allineati o no contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, usize_of, Fuzz};
use serde_json::json;
use sintropia_engines::wcst::*;

#[test]
fn should_match_typescript_on_wcst_fuzz_corpus() {
    let fx = load("wcst");
    let mut fz = Fuzz::new("wcst");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let deck = build_deck(usize_of(&c["params"]["deckSize"]), &mut rand);
        ev.json(&json!(deck), &c["deck"], &format!("{id}.deck"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "perseveration", |c, id, ev| {
        let rules: Vec<Dim> = from(&c["rules"]);
        let matched: Vec<Vec<Dim>> = from(&c["matched"]);
        let steps: Vec<Step> = matched
            .into_iter()
            .zip(&rules)
            .map(|(matched, rule)| Step {
                correct: matched.contains(rule),
                matched,
            })
            .collect();
        let got = count_perseveration(&steps, &rules, usize_of(&c["runToShift"]));
        ev.exact(
            &got.errors,
            &usize_of(&c["expected"]["errors"]),
            &format!("{id}.errors"),
        );
        ev.exact(
            &got.responses,
            &usize_of(&c["expected"]["responses"]),
            &format!("{id}.responses"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let metas: Vec<TrialMeta> = from(&c["metas"]);
        let params: Params = from(&c["params"]);
        ev.metrics(
            &score_wcst(&trials("wcst", &c["trials"]), &metas, &params),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    fz.finish(&fx);
}
