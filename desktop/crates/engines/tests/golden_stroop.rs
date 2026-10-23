//! Golden Stroop: sequenze e metriche identiche a quelle prodotte dal TypeScript (`desktop/fixtures/stroop.json`).
mod common;

use common::{load_fixture, Evidence};
use sintropia_engines::stroop::{
    correct_key_stroop, generate_stroop, score_stroop, stroop_stimulus_label, StroopParams,
    StroopStimulus, StroopVariant,
};

fn keys(stimuli: &[StroopStimulus], variant: StroopVariant) -> Vec<String> {
    stimuli
        .iter()
        .map(|s| correct_key_stroop(s, variant).to_string())
        .collect()
}

fn strings(value: &serde_json::Value) -> Vec<String> {
    value
        .as_array()
        .expect("array")
        .iter()
        .map(|v| v.as_str().expect("stringa").to_string())
        .collect()
}

#[test]
fn should_reproduce_typescript_stroop_sequences_and_metrics() {
    let fixture = load_fixture("stroop");
    let mut evidence = Evidence::new("stroop");

    evidence.generation(
        &fixture,
        |params: &StroopParams, rand| generate_stroop(params, rand),
        |ev, stimuli, case, id| {
            ev.exact(
                &keys(stimuli, StroopVariant::Stroop1),
                &strings(&case["keys"]["stroop1"]),
                &format!("{id}.keys1"),
            );
            ev.exact(
                &keys(stimuli, StroopVariant::Stroop2),
                &strings(&case["keys"]["stroop2"]),
                &format!("{id}.keys2"),
            );
            let labels: Vec<String> = stimuli.iter().map(stroop_stimulus_label).collect();
            ev.exact(&labels, &strings(&case["labels"]), &format!("{id}.labels"));
        },
    );
    evidence.scoring(&fixture, score_stroop, |_, _, _, _| {});

    evidence.write();
}
