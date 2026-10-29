//! Scrittura degli export in `Documenti\Sintropia` e lettura di un risultato JSON.
use std::path::{Path, PathBuf};

use sintropia_core::export::{self, ExportFormat};
use sintropia_core::TestResult;

/// Nome leggibile del formato per i pulsanti.
pub fn format_label(format: ExportFormat) -> &'static str {
    match format {
        ExportFormat::CsvIt => "CSV trial (IT, «;»)",
        ExportFormat::CsvIntl => "CSV trial (internazionale)",
        ExportFormat::SummaryCsv => "CSV riepilogo",
        ExportFormat::EventsTsv => "Eventi TSV (BIDS-like)",
        ExportFormat::Json => "JSON",
        ExportFormat::Html => "Report HTML",
    }
}

/// Descrizione breve di cosa contiene ogni formato.
pub fn format_description(format: ExportFormat) -> &'static str {
    match format {
        ExportFormat::CsvIt => "Un trial per riga, separatore punto e virgola e virgola decimale: si apre direttamente in Excel italiano.",
        ExportFormat::CsvIntl => "Un trial per riga, separatore virgola e punto decimale: per R, Python e fogli in lingua inglese.",
        ExportFormat::SummaryCsv => "Solo le metriche di sintesi della sessione, una riga per metrica.",
        ExportFormat::EventsTsv => "Eventi per trial in TSV, nello stile dei file events di BIDS.",
        ExportFormat::Json => "Risultato completo (parametri, trial, metriche): si può ricaricare in questa schermata.",
        ExportFormat::Html => "Report autonomo da leggere nel browser o da stampare.",
    }
}

/// `%USERPROFILE%\Documents\Sintropia` (ripiega sulla cartella corrente).
pub fn export_dir() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_default()
        .join("Documents")
        .join("Sintropia")
}

/// Scrive il formato richiesto in `dir` e ritorna il percorso del file creato.
pub fn save_export(
    result: &TestResult,
    format: ExportFormat,
    dir: &Path,
) -> Result<PathBuf, String> {
    std::fs::create_dir_all(dir).map_err(|e| format!("cartella {}: {e}", dir.display()))?;
    let content = export::render_format(
        result,
        format,
        export::APP_NAME,
        &export::iso_now(),
        "Sintropia Desktop",
    );
    let path = dir.join(export::format_filename(result, format));
    std::fs::write(&path, content).map_err(|e| format!("scrittura {}: {e}", path.display()))?;
    Ok(path)
}

/// Legge un risultato salvato in JSON (gli extra del formato di export sono ignorati).
pub fn load_result(path: &Path) -> Result<TestResult, String> {
    if path.as_os_str().is_empty() {
        return Err("Indica il percorso di un file JSON salvato da Sintropia.".into());
    }
    if !path.is_file() {
        return Err(format!("File non trovato: {}", path.display()));
    }
    let text = std::fs::read_to_string(path)
        .map_err(|e| format!("Impossibile leggere {}: {e}", path.display()))?;
    serde_json::from_str(&text)
        .map_err(|e| format!("Il file non è un risultato Sintropia valido ({e})."))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sintropia_core::{SummaryMetric, TestId};

    fn sample() -> TestResult {
        TestResult {
            test_id: TestId::Pvt,
            session_id: "S-1".into(),
            started_at: "2026-07-07T09:30:15.123Z".into(),
            params: serde_json::Map::new(),
            trials: vec![],
            summary: vec![SummaryMetric::new("RT medio", 250.0, Some("ms"))],
        }
    }

    #[test]
    fn should_write_every_format_and_reload_the_json() {
        let dir = std::env::temp_dir().join(format!("sintropia-export-{}", std::process::id()));
        let result = sample();
        for format in ExportFormat::ALL {
            let path = save_export(&result, format, &dir).unwrap();
            assert!(std::fs::metadata(&path).unwrap().len() > 0, "{format:?}");
        }
        let json = dir.join(export::format_filename(&result, ExportFormat::Json));
        assert_eq!(load_result(&json).unwrap(), result);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn should_report_error_for_missing_file() {
        assert!(load_result(Path::new("Z:/non/esiste.json")).is_err());
    }
}
