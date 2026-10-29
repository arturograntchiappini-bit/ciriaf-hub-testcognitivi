//! Fuzz differenziale Stroop: sequenze (semi e parametri casuali) e scoring su sessioni sintetiche casuali, contro il TypeScript.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::{json, Value};
use sintropia_engines::stroop::{
    correct_key_stroop, generate_stroop, score_stroop, stroop_stimulus_label, StroopParams,
    StroopStimulus, StroopVariant,
};

fn keys(stimuli: &[StroopStimulus], variant: StroopVariant) -> Value {
    json!(stimuli
        .iter()
        .map(|s| correct_key_stroop(s, variant).to_string())
        .collect::<Vec<_>>())
}

#[test]
fn should_match_typescript_on_stroop_fuzz_corpus() {
    let fx = load("stroop");
    let mut fz = Fuzz::new("stroop");
    fz.each(&fx, "generation", |c, id, ev| {
        let mut rand = seeded(c);
        let stimuli = generate_stroop(&from::<StroopParams>(&c["params"]), &mut rand);
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.json(
            &keys(&stimuli, StroopVariant::Stroop1),
            &c["keys"]["stroop1"],
            &format!("{id}.keys1"),
        );
        ev.json(
            &keys(&stimuli, StroopVariant::Stroop2),
            &c["keys"]["stroop2"],
            &format!("{id}.keys2"),
        );
        ev.json(
            &json!(stimuli
                .iter()
                .map(stroop_stimulus_label)
                .collect::<Vec<_>>()),
            &c["labels"],
            &format!("{id}.labels"),
        );
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        ev.metrics(
            &score_stroop(&trials("stroop1", &c["trials"])),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    fz.finish(&fx);
}
