//! Adattatore sottile fra la UI e i crate `sintropia-content` (catalogo, istruzioni, sezioni) e
//! `sintropia-engines` (default dei parametri).
use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde_json::{Map, Value};
use sintropia_core::TestId;

pub use sintropia_content::catalog::{
    focus_for, FieldDesc, Instruction, SectionDesc, TestMeta, PARAM_SECTIONS, TEST_CATALOG,
};

/// Durata indicativa in minuti, calcolata dai parametri correnti: trial × cadenza (fissazione + risposta + ISI).
/// I tempi di risposta sono medie tipiche; Corsi assume di arrivare alla lunghezza massima.
pub fn estimated_minutes(id: TestId, params: &BTreeMap<String, f64>) -> u32 {
    let p = |key: &str| params.get(key).copied().unwrap_or(0.0);
    let isi_mean = (p("isiMinMs") + p("isiMaxMs")) / 2.0;
    let trials = p("nTrials") + p("practiceTrials");
    let total_ms = match id {
        TestId::Stroop1 | TestId::Stroop2 => trials * (p("fixationMs") + 700.0 + p("isiMs")),
        TestId::Gonogo => trials * (p("stimulusMs") + isi_mean),
        TestId::Flanker => trials * (p("fixationMs") + 600.0 + isi_mean),
        TestId::VisualSearch => trials * (p("fixationMs") + 1500.0 + isi_mean),
        TestId::MentalRotation => trials * (p("fixationMs") + 2500.0 + isi_mean),
        TestId::Sart => trials * (p("digitMs") + p("maskMs")),
        TestId::Nback => trials * (p("letterMs") + p("blankMs")),
        TestId::Pvt => trials * (isi_mean + 300.0),
        TestId::Wcst => p("deckSize") * 2500.0,
        TestId::TrailMaking => 2.0 * (p("nTargets") + p("practiceTargets")) * 1000.0,
        TestId::Corsi => corsi_ms(params),
    };
    (total_ms / 60_000.0).ceil().max(1.0) as u32
}

/// Per ogni lunghezza: presentazione, riproduzione (~600 ms a blocco) e feedback (~1 s) delle prove del livello.
fn corsi_ms(params: &BTreeMap<String, f64>) -> f64 {
    let p = |key: &str| params.get(key).copied().unwrap_or(0.0);
    let per_trial = |length: f64| length * (p("presentMsPerBlock") + 600.0) + 1200.0;
    let levels = (p("startLength") as u32)..=(p("maxLength") as u32);
    levels
        .map(|l| p("trialsPerLevel") * per_trial(f64::from(l)))
        .sum()
}

/// Parametri di default di un test (chiave = `TestId::as_str`), come mappa piatta `chiave → numero`.
pub fn default_params(test_key: &str) -> BTreeMap<String, f64> {
    static DEFAULTS: OnceLock<BTreeMap<String, BTreeMap<String, f64>>> = OnceLock::new();
    let all = DEFAULTS.get_or_init(|| {
        let Ok(Value::Object(all)) =
            serde_json::to_value(sintropia_engines::defaults::all_params())
        else {
            return BTreeMap::new();
        };
        all.iter()
            .filter_map(|(key, fields)| Some((key.clone(), numeric_fields(fields.as_object()?))))
            .collect()
    });
    all.get(test_key).cloned().unwrap_or_default()
}

/// Parametri sicuri per un test: solo le chiavi note, numeri finiti, dentro i limiti di `PARAM_SECTIONS`.
/// Ciò che manca, non è finito o è sconosciuto ricade sul default: un file manomesso non deve poter bloccare l'app.
pub fn sanitize_params(test_key: &str, params: &BTreeMap<String, f64>) -> BTreeMap<String, f64> {
    let fields = PARAM_SECTIONS
        .iter()
        .find(|s| s.test_key == test_key)
        .map_or(&[][..], |s| s.fields);
    let mut safe = default_params(test_key);
    for (key, value) in safe.iter_mut() {
        let Some(candidate) = params.get(key).copied().filter(|v| v.is_finite()) else {
            continue;
        };
        *value = match fields.iter().find(|f| f.key == key) {
            Some(f) => candidate.clamp(f.min, f.max),
            None => candidate,
        };
    }
    safe
}

fn numeric_fields(fields: &Map<String, Value>) -> BTreeMap<String, f64> {
    fields
        .iter()
        .filter_map(|(k, v)| v.as_f64().map(|n| (k.clone(), n)))
        .collect()
}

/// Istruzioni di un test, adattate ai parametri (livello n dell'N-Back, cifra bersaglio del SART).
pub fn instructions_for(id: TestId, params: &BTreeMap<String, f64>) -> Instruction {
    let json: Map<String, Value> = params
        .iter()
        .map(|(k, v)| (k.clone(), Value::from(*v)))
        .collect();
    sintropia_content::catalog::instructions_for(id, Some(&json))
}

#[cfg(test)]
mod tests {
    #[test]
    fn sanitize_params_clamps_and_drops_unknown() {
        let hostile = BTreeMap::from([
            ("nTrials".to_string(), 4e9),
            ("fixationMs".to_string(), f64::NAN),
            ("timeoutMs".to_string(), -1.0),
            ("sconosciuto".to_string(), 7.0),
        ]);
        let safe = super::sanitize_params("stroop1", &hostile);
        assert_eq!(safe["nTrials"], 400.0);
        assert_eq!(
            safe["fixationMs"],
            super::default_params("stroop1")["fixationMs"]
        );
        assert_eq!(safe["timeoutMs"], 500.0);
        assert!(!safe.contains_key("sconosciuto"));
    }

    use super::*;

    #[test]
    fn should_provide_sections_defaults_and_instructions_for_every_catalog_test() {
        for m in TEST_CATALOG {
            let key = m.id.as_str();
            assert!(
                PARAM_SECTIONS.iter().any(|s| s.test_key == key),
                "sezione {key}"
            );
            assert!(!default_params(key).is_empty(), "default {key}");
            assert!(
                !instructions_for(m.id, &default_params(key))
                    .paragraphs
                    .is_empty(),
                "istruzioni {key}"
            );
        }
    }

    #[test]
    fn should_estimate_minutes_from_current_params() {
        let mut p = default_params("sart");
        let default_minutes = estimated_minutes(TestId::Sart, &p);
        assert_eq!(default_minutes, 5); // 243 trial × 1150 ms
        p.insert("nTrials".into(), 450.0);
        assert!(estimated_minutes(TestId::Sart, &p) > default_minutes);
        for m in TEST_CATALOG {
            let minutes = estimated_minutes(m.id, &default_params(m.id.as_str()));
            assert!((1..=30).contains(&minutes), "{}: {minutes}", m.id);
        }
    }

    #[test]
    fn should_adapt_sart_instruction_to_target_digit() {
        let mut p = default_params("sart");
        p.insert("targetDigit".into(), 7.0);
        assert!(instructions_for(TestId::Sart, &p).key_hints[0].ends_with("tranne il 7"));
    }
}
