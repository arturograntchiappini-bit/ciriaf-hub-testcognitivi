//! Golden SART: sequenze, RT pre-commissione e metriche identiche al TypeScript (`desktop/fixtures/sart.json`).
mod common;

use common::{load_fixture, Evidence};
use sintropia_engines::sart::{
    generate_sart, reaction_times_before_commissions, score_sart, SartParams, PRE_ERROR_WINDOW,
};

#[test]
fn should_reproduce_typescript_sart_sequences_and_metrics() {
    let fixture = load_fixture("sart");
    let mut evidence = Evidence::new("sart");

    evidence.exact(
        &PRE_ERROR_WINDOW,
        &(fixture["preErrorWindow"].as_u64().expect("finestra") as usize),
        "PRE_ERROR_WINDOW",
    );
    evidence.generation(
        &fixture,
        |params: &SartParams, rand| generate_sart(params, rand),
        |_, _, _, _| {},
    );
    evidence.scoring(&fixture, score_sart, |ev, trials, case, id| {
        for (key, window) in [
            ("window4", PRE_ERROR_WINDOW),
            ("window0", 0),
            ("window2", 2),
            ("window100", 100),
        ] {
            let actual = serde_json::to_value(reaction_times_before_commissions(trials, window))
                .expect("serializza");
            ev.json(
                &actual,
                &case["extra"]["preError"][key],
                &format!("{id}.preError.{key}"),
            );
        }
    });

    evidence.write();
}
