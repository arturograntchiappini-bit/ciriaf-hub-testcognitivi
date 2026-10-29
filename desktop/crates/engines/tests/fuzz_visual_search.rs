//! Fuzz differenziale Visual Search: sequenze, pendenze, regressione e metriche contro il TypeScript.
//! Divergenza attesa #3 (DIVERGENZE.md): numerosità vuota (`feature-present-`), il Rust la scarta; atteso Rust nella fixture.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::{json, Value};
use sintropia_engines::regression::least_squares;
use sintropia_engines::visual_search::{
    generate_visual_search, score_visual_search, search_slope, SearchType, VisualSearchParams,
};

fn fit_json(fit: Option<(f64, f64)>) -> Value {
    fit.map_or(
        Value::Null,
        |(slope, intercept)| json!({"slope": slope, "intercept": intercept}),
    )
}

#[test]
fn should_match_typescript_on_visual_search_fuzz_corpus() {
    let fx = load("visual_search");
    let mut fz = Fuzz::new("visual_search");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_visual_search(&from::<VisualSearchParams>(&c["params"]), &mut rand);
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "regression", |c, id, ev| {
        let points: Vec<(f64, f64)> = from(&c["points"]);
        ev.json(
            &fit_json(least_squares(&points)),
            &c["result"],
            &format!("{id}.fit"),
        );
    });
    let mut diverged = 0;
    fz.each(&fx, "scoring", |c, id, ev| {
        let t = trials("visualSearch", &c["trials"]);
        let view = c.get("expectedDivergence").unwrap_or(c);
        diverged += usize::from(c.get("expectedDivergence").is_some());
        ev.metrics(
            &score_visual_search(&t),
            &view["metrics"],
            &format!("{id}.metrics"),
        );
        for (search_type, name) in [
            (SearchType::Feature, "feature"),
            (SearchType::Conjunction, "conjunction"),
        ] {
            for (present, label) in [(true, "present"), (false, "absent")] {
                let key = format!("{name}-{label}");
                ev.json(
                    &fit_json(search_slope(&t, search_type, present)),
                    &view["extra"]["slopes"][&key],
                    &format!("{id}.slope.{key}"),
                );
            }
        }
    });
    (0..diverged).for_each(|_| fz.expected_divergence("empty-set-size-condition"));
    fz.finish(&fx);
}
