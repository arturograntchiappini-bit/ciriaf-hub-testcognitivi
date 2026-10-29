//! Fuzz differenziale SART: sequenze, metriche e RT prima delle commissioni contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::json;
use sintropia_engines::sart::{
    generate_sart, reaction_times_before_commissions, score_sart, SartParams,
};

#[test]
fn should_match_typescript_on_sart_fuzz_corpus() {
    let fx = load("sart");
    let mut fz = Fuzz::new("sart");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_sart(&from::<SartParams>(&c["params"]), &mut rand);
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        let t = trials("sart", &c["trials"]);
        ev.metrics(&score_sart(&t), &c["metrics"], &format!("{id}.metrics"));
        for w in c["windows"].as_array().expect("windows") {
            let window = usize::try_from(w.as_u64().expect("finestra")).expect("usize");
            let actual = json!(reaction_times_before_commissions(&t, window));
            ev.json(
                &actual,
                &c["extra"]["preError"][window.to_string()],
                &format!("{id}.preError.{window}"),
            );
        }
    });
    fz.finish(&fx);
}
