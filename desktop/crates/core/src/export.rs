//! Export dei risultati: CSV (`;` per Excel italiano, `,` internazionale), riepilogo, eventi TSV
//! in stile BIDS, JSON e report HTML. Porta `src/engine/export.ts` e `exportFormats.ts`.
use crate::types::{js_num_string, js_round, MetricValue, SummaryMetric, TestResult, TrialResult};
use crate::ENGINE_VERSION;
use serde::Serialize;
use serde_json::Value;

pub const CSV_SEPARATOR: &str = ";";

/// Riga di commento con la versione del motore, da anteporre a un CSV/TSV solo su richiesta
/// (di default i CSV restano identici byte per byte a quelli della web app).
pub fn engine_version_comment() -> String {
    format!("# engineVersion={ENGINE_VERSION}")
}

/// Antepone la riga `# engineVersion=…` (terminata da CRLF) al contenuto di un CSV.
pub fn with_engine_version_header(content: &str) -> String {
    format!("{}\r\n{content}", engine_version_comment())
}
/// Nome dell'app scritto nei JSON esportati.
pub const APP_NAME: &str = "Sintropia - Cognitive tests Hub";

const TRIAL_HEADER: [&str; 11] = [
    "test",
    "session_id",
    "trial_index",
    "fase",
    "condizione",
    "stimolo",
    "risposta",
    "corretto",
    "rt_ms",
    "flag_validazione",
    "timestamp_onset",
];

/// Valore di una cella (`string | number | boolean | null` in TS).
#[derive(Debug, Clone, PartialEq)]
pub enum CsvValue {
    Null,
    Text(String),
    Num(f64),
}

impl CsvValue {
    fn to_text(&self) -> String {
        match self {
            Self::Null => String::new(),
            Self::Text(s) => s.clone(),
            Self::Num(n) => js_num_string(*n),
        }
    }
}

impl From<&str> for CsvValue {
    fn from(v: &str) -> Self {
        Self::Text(v.to_string())
    }
}
impl From<String> for CsvValue {
    fn from(v: String) -> Self {
        Self::Text(v)
    }
}
impl From<f64> for CsvValue {
    fn from(v: f64) -> Self {
        Self::Num(v)
    }
}
impl From<usize> for CsvValue {
    fn from(v: usize) -> Self {
        Self::Num(v as f64)
    }
}

/// Mette tra virgolette e raddoppia le virgolette se il campo contiene separatore/newline/virgolette.
pub fn csv_field(value: &CsvValue, separator: &str) -> String {
    if *value == CsvValue::Null {
        return String::new();
    }
    let s = value.to_text();
    if s.contains(separator) || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s
    }
}

pub fn join_csv_row(values: &[CsvValue], separator: &str) -> String {
    values
        .iter()
        .map(|v| csv_field(v, separator))
        .collect::<Vec<_>>()
        .join(separator)
}

/// Colonne di un trial SENZA il testId: session_id, trial_index, fase, condizione, stimolo,
/// risposta, corretto, rt_ms, flag_validazione, timestamp_onset.
pub fn trial_csv_values(t: &TrialResult) -> Vec<CsvValue> {
    vec![
        t.session_id.as_str().into(),
        CsvValue::Num(f64::from(t.trial_index)),
        t.phase.as_str().into(),
        t.condition.as_str().into(),
        t.stimulus.as_str().into(),
        t.response.as_deref().map_or(CsvValue::Null, CsvValue::from),
        CsvValue::Num(if t.correct { 1.0 } else { 0.0 }),
        t.rt_ms.map_or(CsvValue::Text(String::new()), |rt| {
            CsvValue::Num(js_round(rt))
        }),
        t.flag.as_str().into(),
        CsvValue::Num(js_round(t.onset_timestamp)),
    ]
}

fn trial_row(t: &TrialResult, separator: &str) -> String {
    let mut values = vec![CsvValue::from(t.test_id.as_str())];
    values.extend(trial_csv_values(t));
    join_csv_row(&values, separator)
}

fn trials_csv(result: &TestResult, separator: &str) -> String {
    let header = TRIAL_HEADER.join(separator);
    let rows = result.trials.iter().map(|t| trial_row(t, separator));
    std::iter::once(header)
        .chain(rows)
        .collect::<Vec<_>>()
        .join("\r\n")
}

/// CSV con separatore `;` e header fisso, una riga per trial.
pub fn to_csv(result: &TestResult) -> String {
    trials_csv(result, CSV_SEPARATOR)
}

/// Metadati d'ambiente inclusi nel JSON per tracciabilità.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonExport<'a> {
    pub app: &'a str,
    pub engine_version: &'a str,
    pub test_id: crate::types::TestId,
    pub session_id: &'a str,
    pub started_at: &'a str,
    pub exported_at: &'a str,
    pub user_agent: &'a str,
    pub params: &'a serde_json::Map<String, Value>,
    pub summary: &'a [SummaryMetric],
    pub trials: &'a [TrialResult],
}

/// JSON indentato (2 spazi) con metadati; `exported_at` ISO 8601, `user_agent` p.es. "Sintropia Desktop 0.1.0".
pub fn to_json(result: &TestResult, exported_at: &str, user_agent: &str) -> String {
    let payload = JsonExport {
        app: APP_NAME,
        engine_version: ENGINE_VERSION,
        test_id: result.test_id,
        session_id: &result.session_id,
        started_at: &result.started_at,
        exported_at,
        user_agent,
        params: &result.params,
        summary: &result.summary,
        trials: &result.trials,
    };
    serde_json::to_string_pretty(&payload).unwrap_or_default()
}

/// Sostituisce `:` e `.` con `-` (ISO sanificata per i nomi file).
pub fn sanitize_stamp(iso: &str) -> String {
    // Il resto dei caratteri non ASCII-alfanumerici (separatori di percorso, `..`) viene scartato: lo `startedAt` di
    // una sessione importata non deve poter uscire dalla cartella di export.
    iso.replace([':', '.'], "-")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
        .collect()
}

/// Mantiene solo `[A-Za-z0-9-]`.
pub fn sanitize_id(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
        .collect()
}

/// Nome file `{test}_{sessionId}_{ISO-sanificata}.{ext}`.
pub fn export_filename(result: &TestResult, ext: &str) -> String {
    format!(
        "{}_{}_{}.{}",
        result.test_id,
        sanitize_id(&result.session_id),
        sanitize_stamp(&result.started_at),
        ext
    )
}

/// `it`: separatore ';' e virgola decimale. `intl`: separatore ',' e punto decimale.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CsvLocale {
    It,
    Intl,
}

impl CsvLocale {
    pub fn separator(self) -> &'static str {
        match self {
            Self::It => ";",
            Self::Intl => ",",
        }
    }
}

/// Una riga per trial, con il separatore del locale.
pub fn to_trials_csv(result: &TestResult, locale: CsvLocale) -> String {
    trials_csv(result, locale.separator())
}

/// Valore di metrica per il CSV: virgola decimale nel locale italiano.
pub fn format_metric_value(value: &MetricValue, locale: CsvLocale) -> CsvValue {
    match value {
        MetricValue::Num(n) if locale == CsvLocale::It => {
            CsvValue::Text(js_num_string(*n).replacen('.', ",", 1))
        }
        MetricValue::Num(n) => CsvValue::Num(*n),
        MetricValue::Text(s) => CsvValue::Text(s.clone()),
    }
}

/// Riepilogo in formato lungo (tidy): una riga per metrica.
pub fn to_summary_csv(result: &TestResult, locale: CsvLocale) -> String {
    let sep = locale.separator();
    let header = ["test", "session_id", "metrica", "valore", "unita"].join(sep);
    let rows = result.summary.iter().map(|m| {
        join_csv_row(
            &[
                result.test_id.as_str().into(),
                result.session_id.as_str().into(),
                m.label.as_str().into(),
                format_metric_value(&m.value, locale),
                m.unit.as_deref().unwrap_or("").into(),
            ],
            sep,
        )
    });
    std::iter::once(header)
        .chain(rows)
        .collect::<Vec<_>>()
        .join("\r\n")
}

const NOT_AVAILABLE: &str = "n/a";
const EVENTS_HEADER: [&str; 9] = [
    "onset",
    "duration",
    "trial_type",
    "response_time",
    "response",
    "correct",
    "stimulus",
    "phase",
    "validation_flag",
];

fn tsv_cell(value: &CsvValue) -> String {
    let text = value.to_text();
    if *value == CsvValue::Null || text.is_empty() {
        return NOT_AVAILABLE.to_string();
    }
    // Sequenze di tab/CR/LF diventano un solo spazio (come /[\t\r\n]+/g).
    let mut out = String::with_capacity(text.len());
    let mut in_run = false;
    for c in text.chars() {
        if matches!(c, '\t' | '\r' | '\n') {
            if !in_run {
                out.push(' ');
            }
            in_run = true;
        } else {
            out.push(c);
            in_run = false;
        }
    }
    out
}

fn seconds(ms: f64) -> f64 {
    js_round(ms) / 1000.0
}

/// Eventi TSV con le colonne BIDS (`onset`, `duration`, `trial_type`, `response_time` in secondi; mancanti `n/a`).
/// L'onset è relativo al primo trial; la durata dello stimolo non è registrata, quindi `n/a`.
pub fn to_events_tsv(result: &TestResult) -> String {
    let origin = result
        .trials
        .iter()
        .map(|t| t.onset_timestamp)
        .fold(f64::INFINITY, f64::min);
    let rows = result.trials.iter().map(|t| {
        let cells = [
            CsvValue::Num(seconds(t.onset_timestamp - origin)),
            CsvValue::Null,
            t.condition.as_str().into(),
            t.rt_ms
                .map_or(CsvValue::Null, |rt| CsvValue::Num(seconds(rt))),
            t.response.as_deref().map_or(CsvValue::Null, CsvValue::from),
            CsvValue::Num(if t.correct { 1.0 } else { 0.0 }),
            t.stimulus.as_str().into(),
            t.phase.as_str().into(),
            t.flag.as_str().into(),
        ];
        cells.iter().map(tsv_cell).collect::<Vec<_>>().join("\t")
    });
    std::iter::once(EVENTS_HEADER.join("\t"))
        .chain(rows)
        .collect::<Vec<_>>()
        .join("\n")
}

/// Escape HTML di `& < > " '`.
pub fn escape_html(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
    out
}

fn html_rows(pairs: &[(String, String)]) -> String {
    pairs
        .iter()
        .map(|(k, v)| {
            format!(
                "<tr><th scope=\"row\">{}</th><td>{}</td></tr>",
                escape_html(k),
                escape_html(v)
            )
        })
        .collect()
}

/// `String(v)` di JS per un valore JSON.
fn js_string(v: &Value) -> String {
    match v {
        Value::Null => "null".into(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.as_f64().map_or_else(|| n.to_string(), js_num_string),
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .map(|i| {
                if i.is_null() {
                    String::new()
                } else {
                    js_string(i)
                }
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".into(),
    }
}

/// Piè di pagina del report con la versione del motore.
pub fn html_engine_footer() -> String {
    format!("<p class=\"meta\">Motore Sintropia v{ENGINE_VERSION}</p>")
}

/// Report HTML autonomo (nessuno script, stile in linea): si apre nel browser e si stampa o salva in PDF.
pub fn to_html_report(result: &TestResult, title: &str, exported_at: &str) -> String {
    let metrics: Vec<(String, String)> = result
        .summary
        .iter()
        .map(|m| {
            let unit = m
                .unit
                .as_deref()
                .filter(|u| !u.is_empty())
                .map(|u| format!(" {u}"))
                .unwrap_or_default();
            (m.label.clone(), format!("{}{unit}", m.value))
        })
        .collect();
    let params: Vec<(String, String)> = result
        .params
        .iter()
        .map(|(k, v)| (k.clone(), js_string(v)))
        .collect();
    let test_trials = result
        .trials
        .iter()
        .filter(|t| t.phase == crate::types::Phase::Test)
        .count();
    let (title_e, session_e) = (escape_html(title), escape_html(&result.session_id));
    format!(
        "<!doctype html>\n<html lang=\"it\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n\
<title>{title_e} \u{2014} {session_e}</title>\n\
<style>body{{font:15px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}}h1{{font-size:1.6rem;margin:.2rem 0}}h2{{font-size:1rem;margin:2rem 0 .5rem;text-transform:uppercase;letter-spacing:.08em;color:#444}}table{{border-collapse:collapse;width:100%}}th,td{{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #ddd}}th{{font-weight:500;width:60%}}td{{font-variant-numeric:tabular-nums}}.meta{{color:#555;font-size:.85rem}}@media print{{body{{margin:0}}}}</style></head>\n\
<body><p class=\"meta\">Sintropia \u{2014} Cognitive tests Hub</p><h1>{title_e}</h1>\n\
<p class=\"meta\">Codice sessione {session_e} \u{b7} avviata il {started} \u{b7} esportata il {exported} \u{b7} {test_trials} trial di test</p>\n\
<h2>Metriche</h2><table>{metric_rows}</table>\n\
<h2>Parametri usati</h2><table>{param_rows}</table>\n\
<p class=\"meta\">I trial singoli, con i flag di validazione, sono nel CSV o nel JSON della stessa sessione.</p>\n\
{footer}</body></html>",
        footer = html_engine_footer(),
        started = escape_html(&result.started_at),
        exported = escape_html(exported_at),
        metric_rows = html_rows(&metrics),
        param_rows = html_rows(&params),
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    CsvIt,
    CsvIntl,
    SummaryCsv,
    EventsTsv,
    Json,
    Html,
}

impl ExportFormat {
    pub const ALL: [ExportFormat; 6] = [
        Self::CsvIt,
        Self::CsvIntl,
        Self::SummaryCsv,
        Self::EventsTsv,
        Self::Json,
        Self::Html,
    ];

    fn suffix(self) -> &'static str {
        match self {
            Self::CsvIt => ".csv",
            Self::CsvIntl => "_intl.csv",
            Self::SummaryCsv => "_riepilogo.csv",
            Self::EventsTsv => "_events.tsv",
            Self::Json => ".json",
            Self::Html => "_report.html",
        }
    }
}

/// Nome file con estensione coerente col formato.
pub fn format_filename(result: &TestResult, format: ExportFormat) -> String {
    format!(
        "{}_{}_{}{}",
        result.test_id,
        sanitize_id(&result.session_id),
        sanitize_stamp(&result.started_at),
        format.suffix()
    )
}

/// Contenuto già serializzato del formato richiesto (`exported_at`/`user_agent` servono a JSON e HTML).
pub fn render_format(
    result: &TestResult,
    format: ExportFormat,
    title: &str,
    exported_at: &str,
    user_agent: &str,
) -> String {
    match format {
        ExportFormat::CsvIt => to_trials_csv(result, CsvLocale::It),
        ExportFormat::CsvIntl => to_trials_csv(result, CsvLocale::Intl),
        ExportFormat::SummaryCsv => to_summary_csv(result, CsvLocale::It),
        ExportFormat::EventsTsv => to_events_tsv(result),
        ExportFormat::Json => to_json(result, exported_at, user_agent),
        ExportFormat::Html => to_html_report(result, title, exported_at),
    }
}

/// Istante corrente in ISO 8601 UTC con millisecondi (equivale a `new Date().toISOString()`).
/// Non disponibile su wasm32: lì l'orologio lo fornisce l'host (poi [`iso_from_epoch_ms`]).
#[cfg(not(target_arch = "wasm32"))]
pub fn iso_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    iso_from_epoch_ms(now.as_millis() as i64)
}

/// Converte millisecondi epoch in ISO 8601 UTC (algoritmo civil-from-days di Hinnant).
pub fn iso_from_epoch_ms(ms: i64) -> String {
    let days = ms.div_euclid(86_400_000);
    let rem = ms.rem_euclid(86_400_000);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        rem / 3_600_000,
        rem / 60_000 % 60,
        rem / 1000 % 60,
        rem % 1000
    )
}

#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;
    use crate::types::{Phase, TestId, ValidationFlag};

    pub fn sample_result() -> TestResult {
        let trial = |i: u32,
                     phase: Phase,
                     cond: &str,
                     resp: Option<&str>,
                     correct: bool,
                     rt: Option<f64>,
                     flag: ValidationFlag,
                     onset: f64| TrialResult {
            test_id: TestId::Stroop1,
            session_id: "S-AB12-0930".into(),
            trial_index: i,
            phase,
            condition: cond.into(),
            stimulus: "ROSSO; \"x\"".into(),
            response: resp.map(str::to_string),
            correct,
            rt_ms: rt,
            flag,
            onset_timestamp: onset,
        };
        let mut params = serde_json::Map::new();
        params.insert("trials".into(), Value::from(20));
        params.insert("nome".into(), Value::from("a<b"));
        TestResult {
            test_id: TestId::Stroop1,
            session_id: "S-AB12-0930".into(),
            started_at: "2026-07-07T09:30:15.123Z".into(),
            params,
            trials: vec![
                trial(
                    0,
                    Phase::Practice,
                    "congruent",
                    Some("r"),
                    true,
                    Some(412.4),
                    ValidationFlag::Valid,
                    1000.2,
                ),
                trial(
                    1,
                    Phase::Test,
                    "incongruent",
                    None,
                    false,
                    None,
                    ValidationFlag::Omission,
                    2500.7,
                ),
            ],
            summary: vec![
                SummaryMetric::new("RT medio", 412.5, Some("ms")),
                SummaryMetric::new("Esito", "ok", None),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::sample_result;
    use super::*;

    #[test]
    fn should_quote_fields_with_separator_quotes_or_newlines() {
        assert_eq!(csv_field(&"a;b".into(), ";"), "\"a;b\"");
        assert_eq!(csv_field(&"a\"b".into(), ";"), "\"a\"\"b\"");
        assert_eq!(csv_field(&"a,b".into(), ";"), "a,b");
        assert_eq!(csv_field(&"a,b".into(), ","), "\"a,b\"");
        assert_eq!(csv_field(&CsvValue::Null, ";"), "");
    }

    #[test]
    fn should_build_csv_with_fixed_header_and_rounded_values() {
        let csv = to_csv(&sample_result());
        let lines: Vec<&str> = csv.split("\r\n").collect();
        assert_eq!(lines[0], "test;session_id;trial_index;fase;condizione;stimolo;risposta;corretto;rt_ms;flag_validazione;timestamp_onset");
        assert_eq!(
            lines[1],
            "stroop1;S-AB12-0930;0;practice;congruent;\"ROSSO; \"\"x\"\"\";r;1;412;VALID;1000"
        );
        assert_eq!(
            lines[2],
            "stroop1;S-AB12-0930;1;test;incongruent;\"ROSSO; \"\"x\"\"\";;0;;OMISSION;2501"
        );
    }

    #[test]
    fn should_use_comma_separator_for_international_csv() {
        let csv = to_trials_csv(&sample_result(), CsvLocale::Intl);
        assert!(csv.starts_with("test,session_id,"));
        assert!(csv.contains(
            "stroop1,S-AB12-0930,0,practice,congruent,\"ROSSO; \"\"x\"\"\",r,1,412,VALID,1000"
        ));
    }

    #[test]
    fn should_format_summary_with_decimal_comma_only_for_italian_locale() {
        let it = to_summary_csv(&sample_result(), CsvLocale::It);
        assert_eq!(it, "test;session_id;metrica;valore;unita\r\nstroop1;S-AB12-0930;RT medio;412,5;ms\r\nstroop1;S-AB12-0930;Esito;ok;");
        let intl = to_summary_csv(&sample_result(), CsvLocale::Intl);
        assert!(intl.contains("RT medio,412.5,ms"));
    }

    #[test]
    fn should_build_bids_like_events_relative_to_first_trial() {
        let tsv = to_events_tsv(&sample_result());
        let lines: Vec<&str> = tsv.split('\n').collect();
        assert_eq!(lines[0], "onset\tduration\ttrial_type\tresponse_time\tresponse\tcorrect\tstimulus\tphase\tvalidation_flag");
        assert_eq!(
            lines[1],
            "0\tn/a\tcongruent\t0.412\tr\t1\tROSSO; \"x\"\tpractice\tVALID"
        );
        assert_eq!(
            lines[2],
            "1.5\tn/a\tincongruent\tn/a\tn/a\t0\tROSSO; \"x\"\ttest\tOMISSION"
        );
    }

    #[test]
    fn should_serialize_json_with_two_space_indent_and_metadata() {
        let json = to_json(
            &sample_result(),
            "2026-07-07T10:00:00.000Z",
            "Sintropia Desktop",
        );
        assert!(json.starts_with("{\n  \"app\": \"Sintropia - Cognitive tests Hub\",\n  \"engineVersion\": \"0.1.0\",\n  \"testId\": \"stroop1\",\n  \"sessionId\": \"S-AB12-0930\","));
        assert!(json.contains("\"exportedAt\": \"2026-07-07T10:00:00.000Z\""));
        assert!(json.contains("\"params\": {\n    \"trials\": 20,\n    \"nome\": \"a<b\"\n  }"));
        assert!(json.contains("\"rtMs\": null"));
        assert!(json.contains("\"rtMs\": 412.4"));
        assert!(json.contains("\"unit\": \"ms\""));
    }

    #[test]
    fn should_render_html_report_escaped_and_without_scripts() {
        let html = to_html_report(&sample_result(), "Stroop <1>", "2026-07-07T10:00:00.000Z");
        assert!(html.contains("<title>Stroop &lt;1&gt; \u{2014} S-AB12-0930</title>"));
        assert!(html.contains("<tr><th scope=\"row\">RT medio</th><td>412.5 ms</td></tr>"));
        assert!(html.contains("<td>a&lt;b</td>"));
        assert!(html.contains("1 trial di test"));
        assert!(!html.contains("<script"));
        assert!(html.contains("<p class=\"meta\">Motore Sintropia v0.1.0</p></body></html>"));
    }

    #[test]
    fn should_prepend_engine_version_comment_only_on_request() {
        let csv = to_csv(&sample_result());
        assert!(csv.starts_with("test;session_id;"));
        let tagged = with_engine_version_header(&csv);
        assert_eq!(tagged, format!("# engineVersion=0.1.0\r\n{csv}"));
    }

    #[test]
    fn should_name_files_by_format() {
        let r = sample_result();
        let stamp = "2026-07-07T09-30-15-123Z";
        assert_eq!(
            export_filename(&r, "csv"),
            format!("stroop1_S-AB12-0930_{stamp}.csv")
        );
        assert_eq!(
            format_filename(&r, ExportFormat::Html),
            format!("stroop1_S-AB12-0930_{stamp}_report.html")
        );
        assert_eq!(
            format_filename(&r, ExportFormat::EventsTsv),
            format!("stroop1_S-AB12-0930_{stamp}_events.tsv")
        );
        assert_eq!(
            format_filename(&r, ExportFormat::SummaryCsv),
            format!("stroop1_S-AB12-0930_{stamp}_riepilogo.csv")
        );
    }

    #[test]
    fn should_strip_path_separators_from_the_timestamp_in_file_names() {
        let mut r = sample_result();
        r.started_at = r"..\../evil:x.y".into();
        let name = export_filename(&r, "csv");
        assert!(!name.contains(['/', '\\', ':']), "{name}");
        assert!(!name.contains(".."), "{name}");
    }

    #[test]
    fn should_convert_epoch_to_iso() {
        assert_eq!(iso_from_epoch_ms(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(
            iso_from_epoch_ms(1_783_416_615_123),
            "2026-07-07T09:30:15.123Z"
        );
    }
}
