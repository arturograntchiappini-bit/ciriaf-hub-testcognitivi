//! Golden Go/No-Go: sequenze e metriche identiche al TypeScript (`desktop/fixtures/gonogo.json`).
//! Dove il TS viola il limite di 2 No-Go consecutivi (DIVERGENZE.md) si verificano gli invarianti del paper.
mod common;

use common::{load_fixture, Evidence};
use sintropia_engines::gonogo::{generate_go_nogo, score_go_nogo, GoNoGoKind, GoNoGoParams};

#[test]
fn should_reproduce_typescript_gonogo_sequences_and_metrics() {
    let fixture = load_fixture("gonogo");
    let mut evidence = Evidence::new("gonogo");

    evidence.generation(
        &fixture,
        |params: &GoNoGoParams, rand| generate_go_nogo(params, rand),
        |ev, stimuli, case, id| {
            if case.get("expectedDivergence").is_none() {
                return;
            }
            let params: GoNoGoParams =
                serde_json::from_value(case["params"].clone()).expect("params");
            let go = stimuli.iter().filter(|s| s.kind == GoNoGoKind::Go).count();
            let expected_go = case["stimuli"]
                .as_array()
                .expect("stimuli")
                .iter()
                .filter(|s| s["kind"] == "go")
                .count();
            ev.exact(
                &stimuli.len(),
                &(params.n_trials as usize),
                &format!("{id}.len"),
            );
            ev.exact(&go, &expected_go, &format!("{id}.go_count"));
            let longest_run = stimuli
                .split(|s| s.kind == GoNoGoKind::Go)
                .map(<[_]>::len)
                .max()
                .unwrap_or(0);
            ev.exact(&(longest_run <= 2), &true, &format!("{id}.max_nogo_run<=2"));
            ev.exact(
                &stimuli
                    .iter()
                    .all(|s| (params.isi_min_ms..=params.isi_max_ms).contains(&s.isi_ms)),
                &true,
                &format!("{id}.isi"),
            );
        },
    );
    evidence.scoring(&fixture, score_go_nogo, |_, _, _, _| {});

    evidence.write();
}
