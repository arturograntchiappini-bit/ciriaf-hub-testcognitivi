//! Parametri per test, salvati come JSON in `%APPDATA%\Sintropia\settings.json`.
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::{data, fsutil};

/// Solo gli override dell'utente: ciò che manca ricade sui default.
#[derive(Debug, Default, Clone, PartialEq, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default)]
    overrides: BTreeMap<String, BTreeMap<String, f64>>,
}

impl Settings {
    /// Valore effettivo di un parametro (override o default).
    pub fn get(&self, test_key: &str, key: &str) -> Option<f64> {
        self.overrides
            .get(test_key)
            .and_then(|m| m.get(key))
            .copied()
            .or_else(|| data::default_params(test_key).get(key).copied())
    }

    pub fn set(&mut self, test_key: &str, key: &str, value: f64) {
        self.overrides
            .entry(test_key.to_owned())
            .or_default()
            .insert(key.to_owned(), value);
    }

    pub fn reset(&mut self, test_key: &str) {
        self.overrides.remove(test_key);
    }

    /// Parametri completi di un test: default sovrascritti dagli override.
    pub fn effective(&self, test_key: &str) -> BTreeMap<String, f64> {
        let mut params = data::default_params(test_key);
        if let Some(over) = self.overrides.get(test_key) {
            params.extend(over.iter().map(|(k, v)| (k.clone(), *v)));
        }
        data::sanitize_params(test_key, &params)
    }

    /// Come `load_from`, ma segnala a parole un file presente e illeggibile (l'assenza non è un errore).
    pub fn load_checked(path: &Path) -> (Self, Option<String>) {
        if !path.exists() {
            return (Self::default(), None);
        }
        let text = match fsutil::read_text_capped(path, fsutil::MAX_CONFIG_BYTES) {
            Ok(text) => text,
            Err(e) => {
                return (
                    Self::default(),
                    Some(format!(
                        "Il file delle impostazioni ({}) non è leggibile: {e}. Si usano i valori predefiniti; salvando lo sovrascrivi.",
                        path.display()
                    )),
                )
            }
        };
        match serde_json::from_str(&text) {
            Ok(settings) => (settings, None),
            Err(e) => (
                Self::default(),
                Some(format!(
                    "Il file delle impostazioni ({}) è corrotto e non è stato letto: {e}. Si usano i valori predefiniti; salvando lo sovrascrivi.",
                    path.display()
                )),
            ),
        }
    }

    /// Carica da file; file assente o corrotto dà i default (mai un crash all'avvio).
    #[cfg(test)]
    pub fn load_from(path: &Path) -> Self {
        fsutil::read_text_capped(path, fsutil::MAX_CONFIG_BYTES)
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default()
    }

    pub fn save_to(&self, path: &Path) -> Result<(), String> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("cartella {}: {e}", dir.display()))?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fsutil::write_atomic(path, json.as_bytes())
    }
}

/// `%APPDATA%\Sintropia\settings.json` (ripiega sulla cartella corrente se APPDATA manca).
pub fn default_path() -> PathBuf {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_default()
        .join("Sintropia")
        .join("settings.json")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!("sintropia-test-{}-{name}", std::process::id()))
            .join("settings.json")
    }

    #[test]
    fn should_return_default_when_no_override() {
        let s = Settings::default();
        assert_eq!(s.get("sart", "targetDigit"), Some(3.0));
        assert_eq!(s.get("sart", "nope"), None);
    }

    #[test]
    fn should_roundtrip_overrides_through_json_file() {
        let path = temp_file("roundtrip");
        let mut s = Settings::default();
        s.set("pvt", "nTrials", 42.0);
        s.save_to(&path).unwrap();
        let loaded = Settings::load_from(&path);
        assert_eq!(loaded, s);
        assert_eq!(loaded.effective("pvt")["nTrials"], 42.0);
        assert_eq!(loaded.effective("pvt")["isiMinMs"], 2000.0);
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn should_fall_back_to_defaults_on_corrupt_or_missing_file() {
        let path = temp_file("corrupt");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, "{non json").unwrap();
        assert_eq!(Settings::load_from(&path), Settings::default());
        assert_eq!(
            Settings::load_from(&path.with_file_name("missing.json")),
            Settings::default()
        );
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn should_report_corrupt_file_but_not_missing_one() {
        let path = temp_file("checked");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, "{non json").unwrap();
        let (settings, warning) = Settings::load_checked(&path);
        assert_eq!(settings, Settings::default());
        assert!(warning.is_some_and(|w| w.contains("corrotto")));
        assert!(Settings::load_checked(&path.with_file_name("missing.json"))
            .1
            .is_none());
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn should_restore_defaults_on_reset() {
        let mut s = Settings::default();
        s.set("pvt", "nTrials", 5.0);
        s.reset("pvt");
        assert_eq!(s.get("pvt", "nTrials"), Some(100.0));
    }
}
