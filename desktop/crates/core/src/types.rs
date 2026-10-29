//! Tipi condivisi (porta `src/engine/types.ts`). JSON identico a quello della web app (camelCase).
use serde::{Deserialize, Serialize, Serializer};
use serde_json::{Map, Value};
use std::fmt;

/// Serializza un f64 come intero se è un valore intero finito (come `JSON.stringify` in JS).
pub fn ser_num<S: Serializer>(v: &f64, s: S) -> Result<S::Ok, S::Error> {
    if !v.is_finite() {
        s.serialize_none() // JS: NaN/Infinity -> null
    } else if v.fract() == 0.0 && v.abs() < 9.0e15 {
        s.serialize_i64(*v as i64)
    } else {
        s.serialize_f64(*v)
    }
}

/// Come [`ser_num`] per `Option<f64>` (None -> null).
pub fn ser_opt_num<S: Serializer>(v: &Option<f64>, s: S) -> Result<S::Ok, S::Error> {
    match v {
        Some(x) => ser_num(x, s),
        None => s.serialize_none(),
    }
}

/// Formatta un numero come `String(n)` di JS (incluso il formato esponenziale).
pub fn js_num_string(v: f64) -> String {
    if v.is_nan() {
        "NaN".into()
    } else if v.is_infinite() {
        if v > 0.0 {
            "Infinity".into()
        } else {
            "-Infinity".into()
        }
    } else if v != 0.0 && (v.abs() >= 1e21 || v.abs() < 1e-6) {
        // JS usa la notazione esponenziale fuori da [1e-6, 1e21): "1e+21", "1.5e-7".
        let s = format!("{v:e}");
        match s.split_once('e') {
            Some((m, e)) if !e.starts_with('-') => format!("{m}e+{e}"),
            _ => s,
        }
    } else {
        format!("{v}")
    }
}

/// `Math.round` di JS (arrotonda .5 verso +infinito). Esatto anche per 0.49999999999999994 e oltre 2^52,
/// dove `floor(v + 0.5)` sbaglierebbe per l'arrotondamento della somma.
pub fn js_round(v: f64) -> f64 {
    let floor = v.floor();
    if v - floor >= 0.5 {
        floor + 1.0
    } else {
        floor
    }
}

/// Esito di validazione di un singolo trial.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ValidationFlag {
    Valid,
    Anticipation,
    Omission,
    Interrupted,
}

impl ValidationFlag {
    /// Etichetta come nel JSON/CSV (`VALID`, ...).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Valid => "VALID",
            Self::Anticipation => "ANTICIPATION",
            Self::Omission => "OMISSION",
            Self::Interrupted => "INTERRUPTED",
        }
    }
}

/// Fase della somministrazione: la pratica è esclusa dalle metriche.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Practice,
    Test,
}

impl Phase {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Practice => "practice",
            Self::Test => "test",
        }
    }
}

/// Identificatore dei test disponibili.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TestId {
    Stroop1,
    Stroop2,
    Gonogo,
    Corsi,
    Nback,
    Wcst,
    Pvt,
    Flanker,
    Sart,
    VisualSearch,
    MentalRotation,
    TrailMaking,
}

impl TestId {
    pub const ALL: [TestId; 12] = [
        Self::Stroop1,
        Self::Stroop2,
        Self::Gonogo,
        Self::Corsi,
        Self::Nback,
        Self::Wcst,
        Self::Pvt,
        Self::Flanker,
        Self::Sart,
        Self::VisualSearch,
        Self::MentalRotation,
        Self::TrailMaking,
    ];

    /// Stringa identica al `TestId` TypeScript.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stroop1 => "stroop1",
            Self::Stroop2 => "stroop2",
            Self::Gonogo => "gonogo",
            Self::Corsi => "corsi",
            Self::Nback => "nback",
            Self::Wcst => "wcst",
            Self::Pvt => "pvt",
            Self::Flanker => "flanker",
            Self::Sart => "sart",
            Self::VisualSearch => "visualSearch",
            Self::MentalRotation => "mentalRotation",
            Self::TrailMaking => "trailMaking",
        }
    }
}

impl fmt::Display for TestId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Risultato grezzo di un singolo trial. Mai scartato: gli invalidi restano col flag.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrialResult {
    pub test_id: TestId,
    pub session_id: String,
    pub trial_index: u32,
    pub phase: Phase,
    /// Etichetta della condizione sperimentale (es. "congruent", "go").
    pub condition: String,
    /// Rappresentazione serializzabile dello stimolo mostrato.
    pub stimulus: String,
    /// Tasto/azione registrata; `None` se nessuna risposta (omissione).
    pub response: Option<String>,
    pub correct: bool,
    /// Tempo di reazione in ms; `None` se omissione.
    #[serde(serialize_with = "ser_opt_num")]
    pub rt_ms: Option<f64>,
    pub flag: ValidationFlag,
    /// Riferimento del cronometro al paint dello stimolo.
    #[serde(serialize_with = "ser_num")]
    pub onset_timestamp: f64,
}

/// Valore di una metrica: numero o testo (`string | number` in TS).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MetricValue {
    Num(#[serde(serialize_with = "ser_num")] f64),
    Text(String),
}

impl fmt::Display for MetricValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Num(n) => f.write_str(&js_num_string(*n)),
            Self::Text(s) => f.write_str(s),
        }
    }
}

impl From<f64> for MetricValue {
    fn from(v: f64) -> Self {
        Self::Num(v)
    }
}
impl From<&str> for MetricValue {
    fn from(v: &str) -> Self {
        Self::Text(v.to_string())
    }
}
impl From<String> for MetricValue {
    fn from(v: String) -> Self {
        Self::Text(v)
    }
}

/// Una metrica di sintesi mostrata nei risultati e negli export.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryMetric {
    /// Etichetta leggibile in italiano.
    pub label: String,
    pub value: MetricValue,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

impl SummaryMetric {
    pub fn new(
        label: impl Into<String>,
        value: impl Into<MetricValue>,
        unit: Option<&str>,
    ) -> Self {
        Self {
            label: label.into(),
            value: value.into(),
            unit: unit.map(str::to_string),
        }
    }
}

/// Risultato completo di una somministrazione di un test.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestResult {
    pub test_id: TestId,
    pub session_id: String,
    /// Data/ora di inizio ISO 8601.
    pub started_at: String,
    /// Parametri effettivamente usati (ordine di inserimento preservato).
    pub params: Map<String, Value>,
    pub trials: Vec<TrialResult>,
    pub summary: Vec<SummaryMetric>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_format_numbers_like_js_string() {
        let cases = [
            (1e21, "1e+21"),
            (1.5e-7, "1.5e-7"),
            (1e-7, "1e-7"),
            (0.000001, "0.000001"),
            (123456789012345680000.0, "123456789012345680000"),
            (-2.5e22, "-2.5e+22"),
            (0.0, "0"),
            (0.30000000000000004, "0.30000000000000004"),
        ];
        for (v, expected) in cases {
            assert_eq!(js_num_string(v), expected);
        }
    }

    #[test]
    fn should_round_like_math_round_on_the_edge_cases() {
        let cases = [
            (0.5, 1.0),
            (-0.5, 0.0),
            (1.5, 2.0),
            (-1.5, -1.0),
            (2.5, 3.0),
            (0.49999999999999994, 0.0),
            (4_503_599_627_370_497.0, 4_503_599_627_370_497.0),
            (-0.2, 0.0),
        ];
        for (v, expected) in cases {
            assert_eq!(js_round(v), expected, "{v}");
        }
        assert!(js_round(f64::NAN).is_nan());
        assert_eq!(js_round(f64::INFINITY), f64::INFINITY);
    }

    #[test]
    fn should_serialize_test_ids_like_typescript() {
        for t in TestId::ALL {
            assert_eq!(
                serde_json::to_string(&t).unwrap(),
                format!("\"{}\"", t.as_str())
            );
        }
        assert_eq!(
            serde_json::to_string(&ValidationFlag::Anticipation).unwrap(),
            "\"ANTICIPATION\""
        );
        assert_eq!(
            serde_json::to_string(&Phase::Practice).unwrap(),
            "\"practice\""
        );
    }

    #[test]
    fn should_serialize_trial_with_integer_numbers_and_camel_case() {
        let t = TrialResult {
            test_id: TestId::Sart,
            session_id: "S".into(),
            trial_index: 2,
            phase: Phase::Test,
            condition: "go".into(),
            stimulus: "5".into(),
            response: None,
            correct: true,
            rt_ms: Some(300.0),
            flag: ValidationFlag::Valid,
            onset_timestamp: 1234.5,
        };
        let json = serde_json::to_string(&t).unwrap();
        assert_eq!(
            json,
            r#"{"testId":"sart","sessionId":"S","trialIndex":2,"phase":"test","condition":"go","stimulus":"5","response":null,"correct":true,"rtMs":300,"flag":"VALID","onsetTimestamp":1234.5}"#
        );
        assert_eq!(serde_json::from_str::<TrialResult>(&json).unwrap(), t);
    }

    #[test]
    fn should_serialize_metric_value_as_number_or_string_and_omit_missing_unit() {
        let m = SummaryMetric::new("RT", 250.0, Some("ms"));
        assert_eq!(
            serde_json::to_string(&m).unwrap(),
            r#"{"label":"RT","value":250,"unit":"ms"}"#
        );
        let m = SummaryMetric::new("Esito", "ok", None);
        assert_eq!(
            serde_json::to_string(&m).unwrap(),
            r#"{"label":"Esito","value":"ok"}"#
        );
    }
}
