#![allow(dead_code)]
//! Evidenze misurabili della migrazione TS -> Rust.
//!
//! Con `SINTROPIA_WRITE_EVIDENCE=1` i test golden e proptest scrivono `desktop/fixtures/evidence/<test>.json`
//! (confronti esatti/float, massima deviazione, semi, varianti, casi limite, casi proptest per invariante).
//! Senza la variabile i test confrontano soltanto e non toccano il disco.
use super::FLOAT_TOLERANCE;
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::{json, Map, Value};
use sintropia_core::rng::mulberry32;
use sintropia_core::types::TrialResult;
use sintropia_core::types::{MetricValue, SummaryMetric};
use std::cell::Cell;
use std::collections::{BTreeMap, BTreeSet};
use std::fmt::Debug;
use std::path::PathBuf;

fn evidence_enabled() -> bool {
    std::env::var("SINTROPIA_WRITE_EVIDENCE").is_ok_and(|v| v == "1")
}

fn evidence_path(test: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/evidence")
        .join(format!("{test}.json"))
}

/// Unisce `patch` al file di evidenza del test (i binari di test girano in sequenza: nessuna corsa).
pub fn merge_into_file(test: &str, patch: Map<String, Value>) {
    let path = evidence_path(test);
    let mut doc = std::fs::read_to_string(&path)
        .ok()
        .and_then(|t| serde_json::from_str::<Map<String, Value>>(&t).ok())
        .unwrap_or_default();
    for (key, value) in patch {
        match (doc.get_mut(&key), value) {
            (Some(Value::Object(old)), Value::Object(new)) => old.extend(new),
            (_, new) => {
                doc.insert(key, new);
            }
        }
    }
    std::fs::create_dir_all(path.parent().expect("cartella evidenze"))
        .expect("crea cartella evidenze");
    let text = serde_json::to_string_pretty(&Value::Object(doc)).expect("serializza evidenza");
    std::fs::write(&path, text + "\n").expect("scrive evidenza");
}

/// Contatori dei confronti golden di un test.
pub struct Evidence {
    test: String,
    cases: BTreeMap<String, usize>,
    exact: u64,
    floats: u64,
    max_deviation: f64,
    max_deviation_at: String,
    seeds: BTreeSet<u64>,
    variants: BTreeSet<String>,
    edge_cases: Vec<String>,
    divergences: Vec<String>,
}

impl Evidence {
    pub fn new(test: &str) -> Self {
        Self {
            test: test.to_string(),
            cases: BTreeMap::new(),
            exact: 0,
            floats: 0,
            max_deviation: 0.0,
            max_deviation_at: String::from("nessuna deviazione (tutti i float identici bit a bit)"),
            seeds: BTreeSet::new(),
            variants: BTreeSet::new(),
            edge_cases: Vec::new(),
            divergences: Vec::new(),
        }
    }

    /// Contatori accumulati: (confronti esatti, confronti float, massima deviazione, dove).
    pub fn stats(&self) -> (u64, u64, f64, &str) {
        (
            self.exact,
            self.floats,
            self.max_deviation,
            &self.max_deviation_at,
        )
    }

    /// Registra un caso di fixture (`kind`: "generation" o "scoring").
    pub fn case(&mut self, kind: &str) {
        *self.cases.entry(kind.to_string()).or_insert(0) += 1;
    }

    pub fn seed(&mut self, seed: u64) {
        self.seeds.insert(seed);
    }

    pub fn variant(&mut self, variant: &str) {
        self.variants.insert(variant.to_string());
    }

    pub fn edge_case(&mut self, name: &str) {
        self.edge_cases.push(name.to_string());
    }

    /// Confronto esatto (sequenze, conteggi, etichette, ordini).
    pub fn exact<T: PartialEq + Debug>(&mut self, actual: &T, expected: &T, what: &str) {
        assert_eq!(actual, expected, "{what}");
        self.exact += 1;
    }

    /// Confronto in virgola mobile entro `FLOAT_TOLERANCE`, tracciando la massima deviazione.
    pub fn close(&mut self, actual: f64, expected: f64, what: &str) {
        let deviation = (actual - expected).abs();
        assert!(
            deviation <= FLOAT_TOLERANCE,
            "{what}: {actual} != {expected} (tolleranza {FLOAT_TOLERANCE})"
        );
        self.floats += 1;
        if deviation > self.max_deviation {
            self.max_deviation = deviation;
            self.max_deviation_at = what.to_string();
        }
    }

    /// Confronto strutturale di due JSON: interi/stringhe/booleani/chiavi esatti, float entro tolleranza.
    pub fn json(&mut self, actual: &Value, expected: &Value, path: &str) {
        match (actual, expected) {
            (Value::Number(a), Value::Number(e)) => {
                if let (Some(a), Some(e)) = (a.as_i64(), e.as_i64()) {
                    self.exact(&a, &e, path);
                } else {
                    self.close(
                        a.as_f64().unwrap_or(f64::NAN),
                        e.as_f64().unwrap_or(f64::NAN),
                        path,
                    );
                }
            }
            (Value::Array(a), Value::Array(e)) => {
                self.exact(&a.len(), &e.len(), &format!("{path}.len"));
                for (i, (a, e)) in a.iter().zip(e).enumerate() {
                    self.json(a, e, &format!("{path}[{i}]"));
                }
            }
            (Value::Object(a), Value::Object(e)) => {
                let keys = |m: &Map<String, Value>| m.keys().cloned().collect::<BTreeSet<_>>();
                self.exact(&keys(a), &keys(e), &format!("{path}.keys"));
                for (key, expected_value) in e {
                    if let Some(actual_value) = a.get(key) {
                        self.json(actual_value, expected_value, &format!("{path}.{key}"));
                    }
                }
            }
            _ => self.exact(actual, expected, path),
        }
    }

    /// Confronta le metriche (etichetta, unità, valore; "—" dove il TS lo emette) con quelle della fixture.
    pub fn metrics(&mut self, actual: &[SummaryMetric], expected: &Value, path: &str) {
        let expected = expected
            .as_array()
            .unwrap_or_else(|| panic!("{path}: metriche non è un array"));
        self.exact(&actual.len(), &expected.len(), &format!("{path}.len"));
        for (i, (a, e)) in actual.iter().zip(expected).enumerate() {
            let at = format!("{path}[{i}:{}]", a.label);
            self.exact(
                &a.label.as_str(),
                &e["label"].as_str().unwrap_or("<assente>"),
                &format!("{at}.label"),
            );
            self.exact(
                &a.unit.as_deref(),
                &e["unit"].as_str(),
                &format!("{at}.unit"),
            );
            match (&a.value, &e["value"]) {
                (MetricValue::Num(x), Value::Number(y)) => {
                    self.close(*x, y.as_f64().unwrap_or(f64::NAN), &format!("{at}.value"))
                }
                (MetricValue::Text(x), Value::String(y)) => {
                    self.exact(x, y, &format!("{at}.value"))
                }
                (got, want) => panic!("{at}.value: tipo diverso, Rust {got:?} contro TS {want}"),
            }
        }
    }

    /// Riproduce tutti i casi `generation` della fixture: parametri, seme, sequenza completa.
    /// `extra` confronta eventuali campi derivati (chiavi corrette, etichette, ...).
    pub fn generation<P: DeserializeOwned, S: Serialize>(
        &mut self,
        fixture: &Value,
        generate: impl Fn(&P, &mut dyn FnMut() -> f64) -> Vec<S>,
        mut extra: impl FnMut(&mut Evidence, &[S], &Value, &str),
    ) {
        for case in fixture["generation"].as_array().expect("generation") {
            let id = case["id"].as_str().expect("id").to_string();
            let seed = case["seed"].as_u64().expect("seed");
            let params: P = serde_json::from_value(case["params"].clone())
                .unwrap_or_else(|e| panic!("{id}: params: {e}"));
            let mut rand = mulberry32(u32::try_from(seed).expect("seme u32"));
            let stimuli = generate(&params, &mut rand);
            let actual = serde_json::to_value(&stimuli).expect("serializza stimoli");
            // Divergenza documentata (DIVERGENZE.md): non si confronta la sequenza, `extra` verifica gli invarianti.
            if case.get("expectedDivergence").is_some() {
                self.divergences.push(id.clone());
            } else {
                self.json(&actual, &case["stimuli"], &format!("{id}.stimuli"));
            }
            extra(self, &stimuli, case, &id);
            self.case("generation");
            self.seed(seed);
            self.variant(case["variant"].as_str().expect("variant"));
        }
    }

    /// Riproduce tutti i casi `scoring`: trial sintetici in ingresso, metriche (e campi extra) attese.
    pub fn scoring(
        &mut self,
        fixture: &Value,
        score: impl Fn(&[TrialResult]) -> Vec<SummaryMetric>,
        mut extra: impl FnMut(&mut Evidence, &[TrialResult], &Value, &str),
    ) {
        for case in fixture["scoring"].as_array().expect("scoring") {
            let id = case["id"].as_str().expect("id").to_string();
            let trials: Vec<TrialResult> = serde_json::from_value(case["trials"].clone())
                .unwrap_or_else(|e| panic!("{id}: trial: {e}"));
            // Divergenza TS/Rust documentata in DIVERGENZE.md: si confronta con l'atteso Rust dichiarato nella fixture.
            let view = case
                .get("expectedDivergence")
                .cloned()
                .unwrap_or_else(|| case.clone());
            if case.get("expectedDivergence").is_some() {
                self.divergences.push(id.clone());
            }
            self.metrics(&score(&trials), &view["metrics"], &format!("{id}.metrics"));
            extra(self, &trials, &view, &id);
            self.case("scoring");
            if case["kind"] == "edge" {
                self.edge_case(&id);
            }
        }
    }

    /// Scrive l'evidenza se `SINTROPIA_WRITE_EVIDENCE=1`.
    pub fn write(&self) {
        if !evidence_enabled() {
            return;
        }
        let mut patch = Map::new();
        patch.insert("test".into(), json!(self.test));
        patch.insert("toleranceAbsolute".into(), json!(FLOAT_TOLERANCE));
        patch.insert("fixtureCases".into(), json!(self.cases));
        patch.insert("exactComparisons".into(), json!(self.exact));
        patch.insert("floatComparisons".into(), json!(self.floats));
        patch.insert("maxAbsoluteDeviation".into(), json!(self.max_deviation));
        patch.insert(
            "maxAbsoluteDeviationAt".into(),
            json!(self.max_deviation_at),
        );
        patch.insert("seeds".into(), json!(self.seeds));
        patch.insert("parameterVariants".into(), json!(self.variants));
        patch.insert("edgeCases".into(), json!(self.edge_cases));
        patch.insert("expectedDivergences".into(), json!(self.divergences));
        merge_into_file(&self.test, patch);
    }
}

/// Esegue una proprietà con `cases` casi e ne registra il numero realmente eseguito nell'evidenza.
pub fn run_prop<S: Strategy>(
    test: &str,
    invariant: &str,
    cases: u32,
    strategy: S,
    body: impl Fn(S::Value) -> Result<(), TestCaseError>,
) {
    let executed = Cell::new(0u64);
    let mut runner = TestRunner::new(Config {
        cases,
        failure_persistence: None,
        ..Config::default()
    });
    runner
        .run(&strategy, |value| {
            executed.set(executed.get() + 1);
            body(value)
        })
        .unwrap_or_else(|e| panic!("invariante '{invariant}' violato: {e}"));
    if evidence_enabled() {
        let mut inner = Map::new();
        inner.insert(invariant.to_string(), json!(executed.get()));
        let mut patch = Map::new();
        patch.insert("test".into(), json!(test));
        patch.insert("proptestCases".into(), Value::Object(inner));
        merge_into_file(test, patch);
    }
}
