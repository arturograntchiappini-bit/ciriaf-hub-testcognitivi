//! Modello dati, stato derivato ed export della modalità Sessione/batteria
//! (porta `src/engine/session/model.ts` ed `export.ts`).
use crate::export::{
    csv_field, format_metric_value, join_csv_row, sanitize_id, sanitize_stamp, trial_csv_values,
    CsvLocale, CsvValue, APP_NAME, CSV_SEPARATOR,
};
use crate::types::{js_round, ser_num, TestId, TestResult};
use crate::ENGINE_VERSION;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashSet;

/// Protocollo riutilizzabile: durata totale e fasi nominate con pin temporali.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionTemplate {
    pub id: String,
    pub name: String,
    /// ISO 8601.
    pub created_at: String,
    /// Durata totale della sessione, scelta per prima.
    #[serde(serialize_with = "ser_num")]
    pub total_ms: f64,
    pub phases: Vec<SessionPhase>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionPhase {
    pub id: String,
    pub name: String,
    /// Durata della fase; le fasi tassellano la timeline in ordine.
    #[serde(serialize_with = "ser_num")]
    pub duration_ms: f64,
    pub pins: Vec<TimePin>,
}

/// Pin temporale: offset assoluto + batteria di test.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimePin {
    pub id: String,
    #[serde(serialize_with = "ser_num")]
    pub offset_ms: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub battery: Vec<BatteryItem>,
}

/// Un test della batteria, con impostazioni congelate e pratica opzionale.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryItem {
    pub test_id: TestId,
    pub params: Map<String, Value>,
    pub practice: bool,
}

/// Risultato di un test somministrato, con il contesto di sessione.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionTestResult {
    pub phase_id: String,
    pub phase_name: String,
    pub pin_id: String,
    #[serde(serialize_with = "ser_num")]
    pub offset_ms: f64,
    pub index_in_battery: u32,
    pub result: TestResult,
}

/// Record di esecuzione persistito (per ripresa ed export).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRun {
    pub run_id: String,
    pub template: SessionTemplate,
    #[serde(serialize_with = "ser_num")]
    pub started_at_epoch: f64,
    pub started_at_iso: String,
    pub completed_pin_ids: Vec<String>,
    pub results: Vec<SessionTestResult>,
    pub finished: bool,
}

/// Fase con il suo intervallo [start_ms, end_ms) sulla sessione.
#[derive(Debug, Clone, PartialEq)]
pub struct PhaseSpan<'a> {
    pub phase: &'a SessionPhase,
    pub start_ms: f64,
    pub end_ms: f64,
}

/// Intervalli delle fasi, dalle durate cumulative (in ordine).
pub fn phase_spans(template: &SessionTemplate) -> Vec<PhaseSpan<'_>> {
    let mut acc = 0.0;
    template
        .phases
        .iter()
        .map(|phase| {
            let span = PhaseSpan {
                phase,
                start_ms: acc,
                end_ms: acc + phase.duration_ms,
            };
            acc += phase.duration_ms;
            span
        })
        .collect()
}

/// Fase che contiene un istante trascorso (l'ultima se oltre la fine).
pub fn phase_at_elapsed(template: &SessionTemplate, elapsed_ms: f64) -> Option<&SessionPhase> {
    let spans = phase_spans(template);
    let last = spans.last()?;
    if let Some(s) = spans
        .iter()
        .find(|s| elapsed_ms >= s.start_ms && elapsed_ms < s.end_ms)
    {
        return Some(s.phase);
    }
    if elapsed_ms >= last.end_ms {
        return Some(last.phase);
    }
    spans.first().map(|s| s.phase)
}

/// Un pin appiattito con la sua fase.
#[derive(Debug, Clone, PartialEq)]
pub struct FlatPin<'a> {
    pub phase: &'a SessionPhase,
    pub pin: &'a TimePin,
}

/// Pin di tutte le fasi, ordinati per offset crescente (ordinamento stabile).
pub fn flatten_pins(template: &SessionTemplate) -> Vec<FlatPin<'_>> {
    let mut flat: Vec<FlatPin<'_>> = template
        .phases
        .iter()
        .flat_map(|phase| phase.pins.iter().map(move |pin| FlatPin { phase, pin }))
        .collect();
    flat.sort_by(|a, b| a.pin.offset_ms.total_cmp(&b.pin.offset_ms));
    flat
}

/// Durata di riferimento: totale esplicito; altrimenti somma delle fasi o ultimo pin.
pub fn session_total_ms(template: &SessionTemplate) -> f64 {
    if template.total_ms > 0.0 {
        return template.total_ms;
    }
    let sum: f64 = template.phases.iter().map(|p| p.duration_ms).sum();
    if sum > 0.0 {
        return sum;
    }
    flatten_pins(template)
        .last()
        .map_or(0.0, |f| f.pin.offset_ms)
}

/// Stato derivato della sessione a un dato istante trascorso.
#[derive(Debug, Clone, PartialEq)]
pub struct SessionState {
    pub current_phase_name: String,
    pub current_phase_id: String,
    pub next_pin: Option<TimePin>,
    pub upcoming_tests: Vec<TestId>,
    /// Millisecondi al prossimo pin; ≤ 0 se la batteria è dovuta.
    pub countdown_ms: f64,
    /// Batterie già completate (indice 0-based della prossima).
    pub position_index: usize,
    pub total: usize,
    /// true se la prossima batteria è dovuta ora.
    pub due: bool,
    /// true se tutte le batterie sono state completate.
    pub done: bool,
}

/// Stato della sessione dato il tempo trascorso (wall-clock) e i pin già completati.
pub fn compute_session_state(
    template: &SessionTemplate,
    elapsed_ms: f64,
    completed_pin_ids: &[String],
) -> SessionState {
    let flat = flatten_pins(template);
    let total = flat.len();
    let completed: HashSet<&str> = completed_pin_ids.iter().map(String::as_str).collect();
    let elapsed_phase = phase_at_elapsed(template, elapsed_ms);

    let Some(next) = flat.iter().find(|f| !completed.contains(f.pin.id.as_str())) else {
        let phase = elapsed_phase.or_else(|| template.phases.last());
        return SessionState {
            current_phase_name: phase.map(|p| p.name.clone()).unwrap_or_default(),
            current_phase_id: phase.map(|p| p.id.clone()).unwrap_or_default(),
            next_pin: None,
            upcoming_tests: Vec::new(),
            countdown_ms: 0.0,
            position_index: total,
            total,
            due: false,
            done: true,
        };
    };

    let countdown_ms = next.pin.offset_ms - elapsed_ms;
    let phase = elapsed_phase.unwrap_or(next.phase);
    SessionState {
        current_phase_name: phase.name.clone(),
        current_phase_id: phase.id.clone(),
        next_pin: Some(next.pin.clone()),
        upcoming_tests: next.pin.battery.iter().map(|b| b.test_id).collect(),
        countdown_ms,
        position_index: completed.len(),
        total,
        due: countdown_ms <= 0.0,
        done: false,
    }
}

/// Indice della fase che contiene `offset_ms` (clampato a [0, totale]); `None` se non ci sono fasi.
pub fn phase_index_at_offset(template: &SessionTemplate, offset_ms: f64) -> Option<usize> {
    let spans = phase_spans(template);
    let total = spans.last()?.end_ms;
    let x = offset_ms.clamp(0.0, total);
    Some(
        spans
            .iter()
            .position(|s| x < s.end_ms)
            .unwrap_or(spans.len() - 1),
    )
}

/// Sposta un pin al nuovo offset (clampato a [0, totale]) e lo riattacca alla fase che lo contiene.
/// Ritorna un NUOVO template; invariato (copia) se gli indici non sono validi.
pub fn move_pin(
    template: &SessionTemplate,
    from_phase_idx: usize,
    pin_idx: usize,
    new_offset_ms: f64,
) -> SessionTemplate {
    let mut next = template.clone();
    if next
        .phases
        .get(from_phase_idx)
        .and_then(|p| p.pins.get(pin_idx))
        .is_none()
    {
        return next;
    }
    let clamped = js_round(new_offset_ms).clamp(0.0, session_total_ms(&next));
    next.phases[from_phase_idx].pins[pin_idx].offset_ms = clamped;
    if let Some(target) = phase_index_at_offset(&next, clamped).filter(|t| *t != from_phase_idx) {
        let pin = next.phases[from_phase_idx].pins.remove(pin_idx);
        next.phases[target].pins.push(pin);
    }
    next
}

/// Come [`move_pin`] ma identifica il pin per id; template invariato (copia) se l'id non esiste.
pub fn move_pin_by_id(
    template: &SessionTemplate,
    pin_id: &str,
    new_offset_ms: f64,
) -> SessionTemplate {
    for (pi, phase) in template.phases.iter().enumerate() {
        if let Some(ti) = phase.pins.iter().position(|p| p.id == pin_id) {
            return move_pin(template, pi, ti, new_offset_ms);
        }
    }
    template.clone()
}

/// Ridistribuisce equamente `total_ms` tra le fasi; l'ultima assorbe il resto della divisione intera.
pub fn distribute_phases_evenly(template: &SessionTemplate) -> SessionTemplate {
    let mut next = template.clone();
    let n = next.phases.len();
    if n == 0 {
        return next;
    }
    let base = (next.total_ms / n as f64).floor();
    let mut acc = 0.0;
    for (i, p) in next.phases.iter_mut().enumerate() {
        if i == n - 1 {
            p.duration_ms = next.total_ms - acc;
        } else {
            p.duration_ms = base;
            acc += base;
        }
    }
    next
}

const RUN_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// ID di run anonimo `S-XXXX-HHMM` (ora e minuti locali passati dal chiamante).
pub fn make_run_id(hour: u32, minute: u32, rand: &mut dyn FnMut() -> f64) -> String {
    let code: String = (0..4)
        .map(|_| {
            let i =
                ((rand() * RUN_ALPHABET.len() as f64).floor() as usize).min(RUN_ALPHABET.len() - 1);
            char::from(RUN_ALPHABET[i])
        })
        .collect();
    format!("S-{code}-{hour:02}{minute:02}")
}

/// Id opaco per fasi/pin: `{prefix}_{floor(rand*1e9) in base 36}`.
pub fn make_local_id(prefix: &str, rand: &mut dyn FnMut() -> f64) -> String {
    let mut n = (rand() * 1e9).floor() as u64;
    let mut digits = Vec::new();
    loop {
        digits.push(char::from_digit((n % 36) as u32, 36).unwrap_or('0'));
        n /= 36;
        if n == 0 {
            break;
        }
    }
    format!("{prefix}_{}", digits.iter().rev().collect::<String>())
}

const SESSION_CSV_HEADER: [&str; 15] = [
    "fase",
    "t_offset_ms",
    "test",
    "indice_batteria",
    "run_id",
    "session_id",
    "trial_index",
    "fase_test",
    "condizione",
    "stimolo",
    "risposta",
    "corretto",
    "rt_ms",
    "flag_validazione",
    "timestamp_onset",
];

/// CSV combinato: una riga per trial di ogni test della sessione.
pub fn to_session_csv(run: &SessionRun) -> String {
    let mut lines = vec![SESSION_CSV_HEADER.join(CSV_SEPARATOR)];
    for str_ in &run.results {
        for trial in &str_.result.trials {
            let mut values = vec![
                CsvValue::from(str_.phase_name.as_str()),
                CsvValue::Num(str_.offset_ms),
                CsvValue::from(str_.result.test_id.as_str()),
                CsvValue::Num(f64::from(str_.index_in_battery)),
                CsvValue::from(run.run_id.as_str()),
            ];
            values.extend(trial_csv_values(trial));
            lines.push(join_csv_row(&values, CSV_SEPARATOR));
        }
    }
    lines.join("\r\n")
}

/// Riepilogo in formato lungo: una riga per metrica di ogni test, con fase e offset.
pub fn to_session_summary_csv(run: &SessionRun, locale: CsvLocale) -> String {
    let sep = locale.separator();
    let mut lines = vec![[
        "fase",
        "t_offset_ms",
        "test",
        "indice_batteria",
        "run_id",
        "metrica",
        "valore",
        "unita",
    ]
    .join(sep)];
    for str_ in &run.results {
        for m in &str_.result.summary {
            let values = [
                CsvValue::from(str_.phase_name.as_str()),
                CsvValue::Num(str_.offset_ms),
                CsvValue::from(str_.result.test_id.as_str()),
                CsvValue::Num(f64::from(str_.index_in_battery)),
                CsvValue::from(run.run_id.as_str()),
                CsvValue::from(m.label.as_str()),
                format_metric_value(&m.value, locale),
                CsvValue::from(m.unit.as_deref().unwrap_or("")),
            ];
            lines.push(
                values
                    .iter()
                    .map(|v| csv_field(v, sep))
                    .collect::<Vec<_>>()
                    .join(sep),
            );
        }
    }
    lines.join("\r\n")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionJsonExport<'a> {
    app: &'a str,
    engine_version: &'a str,
    kind: &'a str,
    run_id: &'a str,
    started_at: &'a str,
    exported_at: &'a str,
    user_agent: &'a str,
    finished: bool,
    template: &'a SessionTemplate,
    results: &'a [SessionTestResult],
}

/// JSON completo della sessione (protocollo + tutti i risultati con contesto), indentato a 2 spazi.
pub fn to_session_json(run: &SessionRun, exported_at: &str, user_agent: &str) -> String {
    let payload = SessionJsonExport {
        app: APP_NAME,
        engine_version: ENGINE_VERSION,
        kind: "session",
        run_id: &run.run_id,
        started_at: &run.started_at_iso,
        exported_at,
        user_agent,
        finished: run.finished,
        template: &run.template,
        results: &run.results,
    };
    serde_json::to_string_pretty(&payload).unwrap_or_default()
}

/// Nome file `sessione_{runId}_{data-ora}.{ext}`.
pub fn session_filename(run: &SessionRun, ext: &str) -> String {
    format!(
        "sessione_{}_{}.{}",
        sanitize_id(&run.run_id),
        sanitize_stamp(&run.started_at_iso),
        ext
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Phase, SummaryMetric, TrialResult, ValidationFlag};

    const MIN: f64 = 60_000.0;

    fn pin(id: &str, offset_min: f64, test: TestId) -> TimePin {
        TimePin {
            id: id.into(),
            offset_ms: offset_min * MIN,
            label: None,
            battery: vec![BatteryItem {
                test_id: test,
                params: Map::new(),
                practice: false,
            }],
        }
    }

    fn template() -> SessionTemplate {
        SessionTemplate {
            id: "t1".into(),
            name: "Protocollo".into(),
            created_at: "2026-07-07T10:00:00.000Z".into(),
            total_ms: 60.0 * MIN,
            phases: vec![
                SessionPhase {
                    id: "p1".into(),
                    name: "Baseline".into(),
                    duration_ms: 30.0 * MIN,
                    pins: vec![
                        pin("pin-a", 0.0, TestId::Stroop1),
                        pin("pin-b", 15.0, TestId::Nback),
                    ],
                },
                SessionPhase {
                    id: "p2".into(),
                    name: "Carico".into(),
                    duration_ms: 30.0 * MIN,
                    pins: vec![pin("pin-c", 30.0, TestId::Gonogo)],
                },
            ],
        }
    }

    fn ids(phase: &SessionPhase) -> Vec<&str> {
        phase.pins.iter().map(|p| p.id.as_str()).collect()
    }

    #[test]
    fn should_find_phase_index_at_offset_with_clamping() {
        let t = template();
        assert_eq!(phase_index_at_offset(&t, 0.0), Some(0));
        assert_eq!(phase_index_at_offset(&t, 15.0 * MIN), Some(0));
        assert_eq!(phase_index_at_offset(&t, 30.0 * MIN), Some(1));
        assert_eq!(phase_index_at_offset(&t, 999.0 * MIN), Some(1));
        assert_eq!(phase_index_at_offset(&t, -5.0), Some(0));
    }

    #[test]
    fn should_move_pin_across_phase_boundary_without_mutating_original() {
        let t = template();
        let next = move_pin(&t, 0, 1, 40.0 * MIN);
        assert_eq!(ids(&next.phases[0]), ["pin-a"]);
        let moved = next.phases[1]
            .pins
            .iter()
            .find(|p| p.id == "pin-b")
            .unwrap();
        assert_eq!(moved.offset_ms, 40.0 * MIN);
        assert_eq!(ids(&t.phases[0]), ["pin-a", "pin-b"]);
    }

    #[test]
    fn should_clamp_moved_pin_offset_to_total() {
        let next = move_pin(&template(), 0, 1, 999.0 * MIN);
        let moved = next.phases[1]
            .pins
            .iter()
            .find(|p| p.id == "pin-b")
            .unwrap();
        assert_eq!(moved.offset_ms, 60.0 * MIN);
    }

    #[test]
    fn should_move_pin_by_id_and_keep_template_when_id_is_missing() {
        let t = template();
        let next = move_pin_by_id(&t, "pin-b", 40.0 * MIN);
        assert_eq!(ids(&next.phases[0]), ["pin-a"]);
        assert!(next.phases[1].pins.iter().any(|p| p.id == "pin-b"));
        assert_eq!(move_pin_by_id(&t, "inesistente", 10.0), t);
    }

    #[test]
    fn should_distribute_phases_evenly_with_remainder_on_last() {
        let mut t = template();
        t.total_ms = 50.0 * MIN + 1.0;
        let next = distribute_phases_evenly(&t);
        assert_eq!(
            next.phases.iter().map(|p| p.duration_ms).sum::<f64>(),
            t.total_ms
        );
        assert_eq!(next.phases[0].duration_ms, 1_500_000.0);
        assert_eq!(next.phases[1].duration_ms, 1_500_001.0);
    }

    #[test]
    fn should_flatten_pins_sorted_by_global_offset() {
        let t = template();
        let flat = flatten_pins(&t);
        assert_eq!(
            flat.iter().map(|f| f.pin.id.as_str()).collect::<Vec<_>>(),
            ["pin-a", "pin-b", "pin-c"]
        );
        assert_eq!(flat[2].phase.name, "Carico");
    }

    #[test]
    fn should_compute_session_total_with_fallbacks() {
        let mut t = template();
        assert_eq!(session_total_ms(&t), 60.0 * MIN);
        t.total_ms = 0.0;
        assert_eq!(session_total_ms(&t), 60.0 * MIN);
        let empty = SessionTemplate {
            id: "x".into(),
            name: "y".into(),
            created_at: String::new(),
            total_ms: 0.0,
            phases: vec![],
        };
        assert_eq!(session_total_ms(&empty), 0.0);
    }

    #[test]
    fn should_compute_phase_spans_and_phase_at_elapsed() {
        let t = template();
        let spans = phase_spans(&t);
        assert_eq!(
            (spans[1].start_ms, spans[1].end_ms),
            (30.0 * MIN, 60.0 * MIN)
        );
        assert_eq!(phase_at_elapsed(&t, 10.0 * MIN).unwrap().name, "Baseline");
        assert_eq!(phase_at_elapsed(&t, 45.0 * MIN).unwrap().name, "Carico");
        assert_eq!(phase_at_elapsed(&t, 90.0 * MIN).unwrap().name, "Carico");
    }

    #[test]
    fn should_compute_session_state_through_the_protocol() {
        let t = template();
        let s = compute_session_state(&t, 0.0, &[]);
        assert_eq!(s.next_pin.as_ref().map(|p| p.id.as_str()), Some("pin-a"));
        assert!(s.due);
        assert_eq!(
            (s.upcoming_tests.clone(), s.total, s.position_index),
            (vec![TestId::Stroop1], 3, 0)
        );

        let s = compute_session_state(&t, 5.0 * MIN, &["pin-a".to_string()]);
        assert_eq!(s.next_pin.as_ref().map(|p| p.id.as_str()), Some("pin-b"));
        assert_eq!(s.countdown_ms, 10.0 * MIN);
        assert!(!s.due);

        let s = compute_session_state(&t, 40.0 * MIN, &["pin-a".to_string(), "pin-b".to_string()]);
        assert_eq!(s.next_pin.as_ref().map(|p| p.id.as_str()), Some("pin-c"));
        assert!(s.due && s.countdown_ms <= 0.0);
        assert_eq!(s.current_phase_name, "Carico");

        let all: Vec<String> = ["pin-a", "pin-b", "pin-c"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        let s = compute_session_state(&t, 60.0 * MIN, &all);
        assert!(s.done && s.next_pin.is_none());
        assert_eq!(
            (s.position_index, s.current_phase_name.as_str()),
            (3, "Carico")
        );
    }

    #[test]
    fn should_make_run_id_with_expected_format() {
        assert_eq!(make_run_id(14, 30, &mut || 0.0), "S-AAAA-1430");
        let id = make_run_id(9, 5, &mut crate::rng::mulberry32(1));
        assert!(id.len() == 11 && id.ends_with("-0905") && id.starts_with("S-"));
        assert_eq!(make_local_id("pin", &mut || 0.0), "pin_0");
    }

    fn trial(
        test_id: TestId,
        condition: &str,
        rt: Option<f64>,
        response: Option<&str>,
    ) -> TrialResult {
        TrialResult {
            test_id,
            session_id: "AB12-1000".into(),
            trial_index: 0,
            phase: Phase::Test,
            condition: condition.into(),
            stimulus: condition.into(),
            response: response.map(str::to_string),
            correct: true,
            rt_ms: rt,
            flag: ValidationFlag::Valid,
            onset_timestamp: 0.0,
        }
    }

    fn run() -> SessionRun {
        let result = |test_id: TestId,
                      started: &str,
                      trials: Vec<TrialResult>,
                      summary: Vec<SummaryMetric>| TestResult {
            test_id,
            session_id: "AB12-1000".into(),
            started_at: started.into(),
            params: Map::new(),
            trials,
            summary,
        };
        let ctx = |pin_id: &str, offset: f64, r: TestResult| SessionTestResult {
            phase_id: "p1".into(),
            phase_name: "Baseline".into(),
            pin_id: pin_id.into(),
            offset_ms: offset,
            index_in_battery: 0,
            result: r,
        };
        SessionRun {
            run_id: "S-7K2Q-1000".into(),
            template: SessionTemplate {
                id: "t".into(),
                name: "Protocollo".into(),
                created_at: "2026-07-07T09:00:00.000Z".into(),
                total_ms: 0.0,
                phases: vec![],
            },
            started_at_epoch: 1.0,
            started_at_iso: "2026-07-07T10:00:00.000Z".into(),
            completed_pin_ids: vec!["pin-a".into(), "pin-b".into()],
            finished: true,
            results: vec![
                ctx(
                    "pin-a",
                    0.0,
                    result(
                        TestId::Stroop1,
                        "2026-07-07T10:00:00.000Z",
                        vec![trial(TestId::Stroop1, "congruent", Some(500.0), Some("r"))],
                        vec![SummaryMetric::new("Accuratezza", 95.0, Some("%"))],
                    ),
                ),
                ctx(
                    "pin-b",
                    1_200_000.0,
                    result(
                        TestId::Gonogo,
                        "2026-07-07T10:20:00.000Z",
                        vec![trial(TestId::Gonogo, "nogo", None, None)],
                        vec![],
                    ),
                ),
            ],
        }
    }

    #[test]
    fn should_write_session_csv_with_context_columns() {
        let csv = to_session_csv(&run());
        let lines: Vec<&str> = csv.split("\r\n").collect();
        assert_eq!(lines[0], "fase;t_offset_ms;test;indice_batteria;run_id;session_id;trial_index;fase_test;condizione;stimolo;risposta;corretto;rt_ms;flag_validazione;timestamp_onset");
        assert_eq!(lines.len(), 3);
        assert!(lines[1].starts_with("Baseline;0;stroop1;0;S-7K2Q-1000;"));
        assert!(lines[2].starts_with("Baseline;1200000;gonogo;0;S-7K2Q-1000;"));
    }

    #[test]
    fn should_export_session_json_reparsable_and_roundtrip() {
        let json = to_session_json(&run(), "2026-07-07T11:00:00.000Z", "test");
        let v: Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["kind"], "session");
        assert_eq!(v["runId"], "S-7K2Q-1000");
        assert_eq!(v["results"].as_array().unwrap().len(), 2);
        assert_eq!(v["results"][1]["result"]["testId"], "gonogo");
        let back: SessionRun = serde_json::from_value(serde_json::json!({
            "runId": v["runId"], "template": v["template"], "startedAtEpoch": 1, "startedAtIso": v["startedAt"],
            "completedPinIds": [], "results": v["results"], "finished": v["finished"]
        }))
        .unwrap();
        assert_eq!(back.results, run().results);
    }

    #[test]
    fn should_name_session_files_and_write_one_summary_row_per_metric() {
        assert_eq!(
            session_filename(&run(), "csv"),
            "sessione_S-7K2Q-1000_2026-07-07T10-00-00-000Z.csv"
        );
        let lines: Vec<String> = to_session_summary_csv(&run(), CsvLocale::It)
            .split("\r\n")
            .map(str::to_string)
            .collect();
        assert_eq!(
            lines[0],
            "fase;t_offset_ms;test;indice_batteria;run_id;metrica;valore;unita"
        );
        assert_eq!(lines.len(), 2);
        assert_eq!(
            lines[1],
            "Baseline;0;stroop1;0;S-7K2Q-1000;Accuratezza;95;%"
        );
    }
}
