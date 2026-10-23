//! Golden Flanker: sequenze, adattamento al conflitto e metriche identiche al TypeScript (`desktop/fixtures/flanker.json`).
mod common;

use common::{load_fixture, Evidence};
use serde_json::Value;
use sintropia_engines::flanker::{
    build_arrows, conflict_adaptation, generate_flanker, score_flanker, FlankerCondition,
    FlankerDirection, FlankerParams,
};

fn parse<T: serde::de::DeserializeOwned>(text: &str) -> T {
    serde_json::from_value(Value::String(text.to_string())).expect("valore enum")
}

#[test]
fn should_reproduce_typescript_flanker_sequences_and_metrics() {
    let fixture = load_fixture("flanker");
    let mut evidence = Evidence::new("flanker");

    for row in fixture["arrowsTable"].as_array().expect("arrowsTable") {
        let condition: FlankerCondition = parse(row["condition"].as_str().expect("condition"));
        let direction: FlankerDirection = parse(row["direction"].as_str().expect("direction"));
        let expected = row["arrows"].as_str().expect("arrows").to_string();
        evidence.exact(
            &build_arrows(condition, direction),
            &expected,
            "build_arrows",
        );
    }

    evidence.generation(
        &fixture,
        |params: &FlankerParams, rand| generate_flanker(params, rand),
        |_, _, _, _| {},
    );
    evidence.scoring(&fixture, score_flanker, |ev, trials, case, id| {
        let at = format!("{id}.conflictAdaptation");
        match (
            conflict_adaptation(trials),
            &case["extra"]["conflictAdaptation"],
        ) {
            (None, Value::Null) => ev.exact(&true, &true, &at),
            (Some(actual), Value::Number(expected)) => {
                ev.close(actual, expected.as_f64().expect("numero"), &at)
            }
            (actual, expected) => panic!("{at}: Rust {actual:?} contro TS {expected}"),
        }
    });

    evidence.write();
}
