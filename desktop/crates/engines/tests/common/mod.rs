//! Utilità condivise dai test golden: tolleranza unica e lettura delle fixture generate dal TypeScript.
use std::path::PathBuf;

/// Tolleranza per i confronti in virgola mobile con le fixture golden (dichiarata in un solo punto).
pub const FLOAT_TOLERANCE: f64 = 1e-9;

/// Legge `desktop/fixtures/<nome>.json`.
pub fn load_fixture(name: &str) -> serde_json::Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(format!("{name}.json"));
    let text = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("fixture {}: {e}", path.display()));
    serde_json::from_str(&text).expect("fixture JSON valido")
}

pub mod evidence;
pub use evidence::{run_prop, Evidence};

pub fn assert_close(actual: f64, expected: f64, what: &str) {
    assert!(
        (actual - expected).abs() <= FLOAT_TOLERANCE,
        "{what}: {actual} != {expected} (tolleranza {FLOAT_TOLERANCE})"
    );
}
