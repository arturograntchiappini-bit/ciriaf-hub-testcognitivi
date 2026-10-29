#![allow(dead_code)]
//! Supporto ai test differenziali su larga scala (`desktop/fixtures/fuzz/<test>.json[.gz]`, generati da `tools/fuzz/fuzz.mjs`).
//!
//! Ogni caso gira in `catch_unwind`: un caso diverso non ferma gli altri e `finish` elenca TUTTE le divergenze prima di fallire.
//! Con `SINTROPIA_WRITE_EVIDENCE=1` `finish` unisce le statistiche del test in `fixtures/evidence/fuzz.json`.
use super::evidence::merge_into_file;
use super::{Evidence, FLOAT_TOLERANCE};
use serde_json::{json, Map, Value};
use sintropia_core::types::TrialResult;
use std::collections::BTreeMap;
use std::io::Read;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::PathBuf;
use std::time::Instant;

/// Quanti messaggi di divergenza stampare prima di riassumere.
const MAX_REPORTED: usize = 12;

/// Legge `fixtures/fuzz/<nome>.json` oppure `<nome>.json.gz`.
pub fn load(name: &str) -> Value {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/fuzz");
    let plain = dir.join(format!("{name}.json"));
    let text = if plain.exists() {
        std::fs::read_to_string(&plain).expect("fixture fuzz")
    } else {
        let bytes = std::fs::read(dir.join(format!("{name}.json.gz"))).unwrap_or_else(|e| {
            panic!("fixture fuzz {name}: {e} (rigenera con tools/fuzz/fuzz.mjs)")
        });
        let mut text = String::new();
        flate2::read::GzDecoder::new(&bytes[..])
            .read_to_string(&mut text)
            .expect("gunzip");
        text
    };
    serde_json::from_str(&text).expect("JSON valido")
}

/// Ricostruisce i `TrialResult` dalle righe compatte `[indice, fase, condizione, stimolo, risposta, corretto, rtMs, flag, onset]`.
pub fn trials(test_id: &str, rows: &Value) -> Vec<TrialResult> {
    rows.as_array()
        .expect("trial")
        .iter()
        .map(|r| {
            let flag = match r[7].as_str().expect("flag") {
                "V" => "VALID",
                "A" => "ANTICIPATION",
                "O" => "OMISSION",
                _ => "INTERRUPTED",
            };
            serde_json::from_value(json!({
                "testId": test_id, "sessionId": "FUZZ-0001", "trialIndex": r[0],
                "phase": if r[1] == "t" { "test" } else { "practice" },
                "condition": r[2], "stimulus": r[3], "response": r[4], "correct": r[5] == 1,
                "rtMs": r[6], "flag": flag, "onsetTimestamp": r[8],
            }))
            .expect("TrialResult")
        })
        .collect()
}

pub fn usize_of(v: &Value) -> usize {
    usize::try_from(v.as_u64().expect("intero")).expect("usize")
}

pub fn from<T: serde::de::DeserializeOwned>(v: &Value) -> T {
    serde_json::from_value(v.clone()).unwrap_or_else(|e| panic!("fixture: {e}"))
}

pub fn seeded(c: &Value) -> impl FnMut() -> f64 {
    sintropia_core::rng::mulberry32(
        u32::try_from(c["seed"].as_u64().expect("seed")).expect("seme u32"),
    )
}

/// Divergenze NUOVE emerse dal fuzz (oltre a quelle già note in DIVERGENZE.md): (test, categoria, esito, casi).
const FINDINGS: &[(&str, &str, &str, usize)] = &[(
    "gonogo",
    "rust-bug: il ripiego deterministico accodava tutti i No-Go rimasti (serie > 2) anche quando il vincolo era realizzabile (goRatio < 0.5)",
    "corretto in src/gonogo.rs (deterministic_arrange)",
    7,
)];

/// Esecutore dei casi di un test: raccoglie esiti, categorie di divergenza attesa e statistiche.
pub struct Fuzz {
    test: String,
    ev: Evidence,
    started: Instant,
    cases: BTreeMap<String, usize>,
    failures: Vec<String>,
    expected: BTreeMap<String, usize>,
}

impl Fuzz {
    pub fn new(test: &str) -> Self {
        Self {
            test: test.to_string(),
            ev: Evidence::new(test),
            started: Instant::now(),
            cases: BTreeMap::new(),
            failures: Vec::new(),
            expected: BTreeMap::new(),
        }
    }

    /// Esegue `body` per ogni elemento della sezione `section` della fixture.
    pub fn each(
        &mut self,
        fx: &Value,
        section: &str,
        mut body: impl FnMut(&Value, &str, &mut Evidence),
    ) {
        for (i, c) in fx[section]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .enumerate()
        {
            let id = c["id"]
                .as_str()
                .map_or_else(|| format!("{section}[{i}]"), str::to_string);
            let label = format!("{section}/{id}");
            let result = catch_unwind(AssertUnwindSafe(|| body(c, &label, &mut self.ev)));
            if let Err(payload) = result {
                let msg = payload
                    .downcast_ref::<String>()
                    .cloned()
                    .or_else(|| payload.downcast_ref::<&str>().map(|s| s.to_string()))
                    .unwrap_or_default();
                self.failures.push(format!("{label}: {msg}"));
            }
            *self.cases.entry(section.to_string()).or_insert(0) += 1;
        }
    }

    /// Conta un caso trattato per invarianti (divergenza attesa e documentata in DIVERGENZE.md).
    pub fn expected_divergence(&mut self, category: &str) {
        *self.expected.entry(category.to_string()).or_insert(0) += 1;
    }

    /// Fallisce elencando le divergenze; altrimenti scrive l'evidenza (se richiesta).
    pub fn finish(self, fx: &Value) {
        let ts_hang = fx["tsHang"].as_array().map_or(0, Vec::len);
        if !self.failures.is_empty() {
            let shown = self
                .failures
                .iter()
                .take(MAX_REPORTED)
                .cloned()
                .collect::<Vec<_>>()
                .join("\n");
            panic!(
                "{} divergenze Rust/TS su {} casi in '{}':\n{shown}",
                self.failures.len(),
                self.cases.values().sum::<usize>(),
                self.test
            );
        }
        if std::env::var("SINTROPIA_WRITE_EVIDENCE").is_ok_and(|v| v == "1") {
            self.write(fx, ts_hang);
        }
    }

    fn write(&self, fx: &Value, ts_hang: usize) {
        let (exact, floats, max_dev, at) = self.ev.stats();
        let entry = json!({
            "sequenceCases": self.cases.get("generation").copied().unwrap_or(0) + ts_hang,
            "scoringCases": self.cases.get("scoring").copied().unwrap_or(0),
            "casesBySection": self.cases,
            "exactComparisons": exact,
            "floatComparisons": floats,
            "maxAbsoluteDeviation": max_dev,
            "maxAbsoluteDeviationAt": at,
            "divergencesFound": FINDINGS.iter().filter(|f| f.0 == self.test).map(|f| json!({"category": f.1, "resolution": f.2, "cases": f.3})).collect::<Vec<_>>(),
            "expectedDivergenceCases": self.expected,
            "tsHang": ts_hang,
            "tsHangIds": fx["tsHang"].as_array().map(|a| a.iter().map(|h| h["id"].clone()).collect::<Vec<_>>()).unwrap_or_default(),
            "tsErrors": fx["tsErrors"].as_array().map_or(0, Vec::len),
            "masterSeed": fx["masterSeed"],
            "rustSeconds": (self.started.elapsed().as_secs_f64() * 1000.0).round() / 1000.0,
        });
        let mut tests = Map::new();
        tests.insert(self.test.clone(), entry);
        let mut patch = Map::new();
        patch.insert(
            "tolerance".into(),
            json!({"absolute": FLOAT_TOLERANCE, "source": "tests/common/mod.rs FLOAT_TOLERANCE"}),
        );
        patch.insert(
            "regenerate".into(),
            json!("node --experimental-transform-types --no-warnings desktop/tools/fuzz/fuzz.mjs"),
        );
        patch.insert("rerun".into(), json!("cd desktop && SINTROPIA_WRITE_EVIDENCE=1 cargo test -p sintropia-engines --test 'fuzz_*' --release"));
        patch.insert("tests".into(), Value::Object(tests));
        merge_into_file("fuzz", patch);
    }
}
