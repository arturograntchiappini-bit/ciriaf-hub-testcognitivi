//! Viste dei test a ritmo lento (Corsi, WCST): disegno con painter egui e logica di avanzamento testabile.
//! Il timing usa `Instant` per frame: qui non serve la precisione al ms del sequencer.
#![allow(dead_code)] // finché la shell non aggancia i runner

pub mod corsi;
pub mod wcst;

use std::collections::BTreeMap;
use std::time::Instant;

use serde::de::DeserializeOwned;
use serde_json::{Map, Value};
use sintropia_core::TestId;

pub use corsi::CorsiRunner;
pub use wcst::WcstRunner;

use crate::runner::TestRunner;

/// Durata del feedback «Corretto/Errato» dopo ogni risposta (come la web app).
pub(crate) const FEEDBACK_MS: u64 = 900;

/// Tutto ciò che serve per costruire il runner di un test.
pub struct RunnerSpec<'a> {
    pub test_id: TestId,
    pub params: &'a Map<String, Value>,
    pub session_id: &'a str,
    pub started_at: &'a str,
    pub seed: u32,
    pub practice: bool,
    /// Feedback durante i test a tempo di reazione; Corsi e WCST lo mostrano sempre.
    pub feedback: bool,
}

/// Numeri interi come interi JSON (serde non converte `3.0` in `u32`).
pub fn normalize_numbers(params: &Map<String, Value>) -> Map<String, Value> {
    params
        .iter()
        .map(|(k, v)| {
            let normalized = match v.as_f64() {
                Some(n) if v.is_f64() && n.fract() == 0.0 && n.abs() < 9.0e15 => {
                    Value::from(n as i64)
                }
                _ => v.clone(),
            };
            (k.clone(), normalized)
        })
        .collect()
}

/// Mappa `chiave → numero` (impostazioni) in parametri JSON normalizzati.
pub fn numbers_to_params(numbers: &BTreeMap<String, f64>) -> Map<String, Value> {
    let raw: Map<String, Value> = numbers
        .iter()
        .map(|(k, v)| (k.clone(), Value::from(*v)))
        .collect();
    normalize_numbers(&raw)
}

/// Deserializza i parametri; se mancano campi o sono invalidi ricade sui default.
pub fn params_or_default<T: DeserializeOwned>(params: &Map<String, Value>, default: T) -> T {
    serde_json::from_value(Value::Object(normalize_numbers(params))).unwrap_or(default)
}

/// Millisecondi trascorsi tra due istanti (0 se `to` precede `from`).
pub(crate) fn ms_between(from: Instant, to: Instant) -> f64 {
    to.saturating_duration_since(from).as_secs_f64() * 1000.0
}

/// Costruisce il runner di Corsi o WCST; `None` per gli altri test.
pub fn create_custom_runner(spec: &RunnerSpec) -> Option<Box<dyn TestRunner>> {
    match spec.test_id {
        TestId::Corsi => Some(Box::new(CorsiRunner::new(
            params_or_default(spec.params, sintropia_engines::defaults::all_params().corsi),
            spec.session_id,
            spec.started_at,
            spec.seed,
            spec.practice,
            spec.feedback,
        ))),
        TestId::Wcst => Some(Box::new(WcstRunner::new(
            params_or_default(spec.params, sintropia_engines::defaults::all_params().wcst),
            spec.session_id,
            spec.started_at,
            spec.seed,
            spec.practice,
            spec.feedback,
        ))),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_turn_whole_floats_into_integers_so_serde_accepts_them() {
        let mut numbers = BTreeMap::new();
        numbers.insert("startLength".to_string(), 4.0);
        numbers.insert("presentMsPerBlock".to_string(), 750.5);
        let params = numbers_to_params(&numbers);
        assert!(params["startLength"].is_i64());
        assert!(params["presentMsPerBlock"].is_f64());
    }

    #[test]
    fn should_parse_typed_params_and_fall_back_to_defaults_when_invalid() {
        let defaults = sintropia_engines::defaults::all_params().wcst;
        let mut numbers = BTreeMap::new();
        numbers.insert("deckSize".to_string(), 20.0);
        numbers.insert("runToShift".to_string(), 5.0);
        numbers.insert("maxCategories".to_string(), 2.0);
        let parsed = params_or_default(&numbers_to_params(&numbers), defaults.clone());
        assert_eq!((parsed.deck_size, parsed.run_to_shift), (20, 5));
        assert_eq!(params_or_default(&Map::new(), defaults.clone()), defaults);
    }

    #[test]
    fn should_build_runners_only_for_corsi_and_wcst() {
        let params = Map::new();
        let spec = |test_id| RunnerSpec {
            test_id,
            params: &params,
            session_id: "S",
            started_at: "2026-01-01T00:00:00.000Z",
            seed: 1,
            practice: false,
            feedback: false,
        };
        assert!(create_custom_runner(&spec(TestId::Corsi)).is_some());
        assert!(create_custom_runner(&spec(TestId::Wcst)).is_some());
        assert!(create_custom_runner(&spec(TestId::Pvt)).is_none());
    }
}
