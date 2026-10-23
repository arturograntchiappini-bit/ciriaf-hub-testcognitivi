//! Golden Visual Search: sequenze, pendenze, regressione e metriche identiche al TypeScript
//! (`desktop/fixtures/visual_search.json`).
mod common;

use common::{load_fixture, Evidence};
use serde_json::Value;
use sintropia_engines::regression::least_squares;
use sintropia_engines::visual_search::{
    generate_visual_search, score_visual_search, search_slope, SearchType, VisualSearchParams,
};

/// `Option<(pendenza, intercetta)>` -> forma `{slope, intercept}` / null della fixture.
fn fit_to_compare(ev: &mut Evidence, fit: Option<(f64, f64)>, expected: &Value, at: &str) {
    match (fit, expected) {
        (None, Value::Null) => ev.exact(&true, &true, at),
        (Some((slope, intercept)), Value::Object(_)) => {
            ev.close(
                slope,
                expected["slope"].as_f64().expect("slope"),
                &format!("{at}.slope"),
            );
            ev.close(
                intercept,
                expected["intercept"].as_f64().expect("intercept"),
                &format!("{at}.intercept"),
            );
        }
        (actual, expected) => panic!("{at}: Rust {actual:?} contro TS {expected}"),
    }
}

#[test]
fn should_reproduce_typescript_visual_search_sequences_and_metrics() {
    let fixture = load_fixture("visual_search");
    let mut evidence = Evidence::new("visual_search");

    for (i, row) in fixture["regression"]
        .as_array()
        .expect("regression")
        .iter()
        .enumerate()
    {
        let points: Vec<(f64, f64)> = row["points"]
            .as_array()
            .expect("points")
            .iter()
            .map(|p| (p[0].as_f64().expect("x"), p[1].as_f64().expect("y")))
            .collect();
        fit_to_compare(
            &mut evidence,
            least_squares(&points),
            &row["result"],
            &format!("regression[{i}]"),
        );
    }

    evidence.generation(
        &fixture,
        |params: &VisualSearchParams, rand| generate_visual_search(params, rand),
        |_, _, _, _| {},
    );
    evidence.scoring(&fixture, score_visual_search, |ev, trials, case, id| {
        for (search_type, name) in [
            (SearchType::Feature, "feature"),
            (SearchType::Conjunction, "conjunction"),
        ] {
            for (present, label) in [(true, "present"), (false, "absent")] {
                let at = format!("{id}.slope.{name}-{label}");
                fit_to_compare(
                    ev,
                    search_slope(trials, search_type, present),
                    &case["extra"]["slopes"][format!("{name}-{label}")],
                    &at,
                );
            }
        }
    });

    evidence.write();
}
