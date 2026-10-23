//! Golden test di `sintropia-core` contro `desktop/fixtures/core.json` (generata dal TypeScript con
//! `node --experimental-transform-types desktop/tools/golden/core.mjs`) e invarianti property-based.
//!
//! Stringhe e sequenze: uguaglianza esatta. Float: tolleranza assoluta [`FLOAT_TOLERANCE`].
//! Con `SINTROPIA_WRITE_EVIDENCE=1` ogni area scrive la propria sezione in
//! `desktop/fixtures/evidence/core.json` (casi confrontati, massima deviazione osservata, casi limite).
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use serde_json::{json, Value};
use sintropia_core::export::{
    csv_field, escape_html, export_filename, format_filename, html_engine_footer, to_csv,
    to_events_tsv, to_html_report, to_json, to_summary_csv, to_trials_csv, CsvLocale, CsvValue,
    ExportFormat,
};
use sintropia_core::rng::{mulberry32, pick, rand_int, shuffle};
use sintropia_core::sdt::{criterion_c, d_prime, probit};
use sintropia_core::session::{
    compute_session_state, distribute_phases_evenly, flatten_pins, make_local_id, make_run_id,
    move_pin, move_pin_by_id, phase_at_elapsed, phase_index_at_offset, phase_spans,
    session_filename, session_total_ms, to_session_csv, to_session_json, to_session_summary_csv,
    SessionRun, SessionTemplate,
};
use sintropia_core::types::{TestResult, TrialResult, ValidationFlag};
use sintropia_core::validation::{
    classify_rt, count_flag, mean, mean_rt_of_valid_correct, sd_rt_of_valid_correct,
    standard_deviation, valid_correct_rts, ANTICIPATION_CUTOFF_MS,
};
use sintropia_core::ENGINE_VERSION;
use std::collections::BTreeMap;
use std::fmt::Debug;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

/// Tolleranza assoluta unica per tutti i confronti in virgola mobile con le fixture golden.
const FLOAT_TOLERANCE: f64 = 1e-9;
/// Casi generati da proptest per ciascuna invariante.
const PROPTEST_CASES: u32 = 256;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures")
}

fn fixture() -> &'static Value {
    static FIXTURE: OnceLock<Value> = OnceLock::new();
    FIXTURE.get_or_init(|| {
        let path = fixtures_dir().join("core.json");
        let text = std::fs::read_to_string(&path).unwrap_or_else(|e| {
            panic!("fixture {}: {e} (rigenerala con core.mjs)", path.display())
        });
        serde_json::from_str(&text).expect("fixture JSON valido")
    })
}

// ---------- evidenze ----------

static EVIDENCE: Mutex<BTreeMap<String, Value>> = Mutex::new(BTreeMap::new());

/// Registra la sezione di un'area; scrive il file solo se `SINTROPIA_WRITE_EVIDENCE=1`.
fn record_evidence(area: &str, section: Value) {
    let Ok(mut all) = EVIDENCE.lock() else { return };
    all.insert(area.to_string(), section);
    if std::env::var("SINTROPIA_WRITE_EVIDENCE").as_deref() != Ok("1") {
        return;
    }
    let meta = &fixture()["meta"];
    let doc = json!({
        "engineVersion": ENGINE_VERSION,
        "floatTolerance": FLOAT_TOLERANCE,
        "oracle": "TypeScript src/engine/** via desktop/tools/golden/core.mjs",
        "fixtureGeneratedWithNode": meta["node"],
        "seeds": meta["seeds"],
        "regenerate": "node --experimental-transform-types desktop/tools/golden/core.mjs && SINTROPIA_WRITE_EVIDENCE=1 cargo test -p sintropia-core --test golden_core",
        "areas": &*all,
    });
    let dir = fixtures_dir().join("evidence");
    std::fs::create_dir_all(&dir).expect("cartella evidence");
    let text = serde_json::to_string_pretty(&doc).expect("evidence serializzabile");
    std::fs::write(dir.join("core.json"), text + "\n").expect("scrittura evidence");
}

/// Contatori di confronto di un'area: esatti vs float, deviazione massima e casi limite.
#[derive(Default)]
struct Area {
    exact: usize,
    float: usize,
    max_dev: f64,
    max_where: String,
    edge: Vec<String>,
}

impl Area {
    fn exact<T: PartialEq + Debug>(&mut self, actual: &T, expected: &T, what: &str) {
        assert_eq!(actual, expected, "{what}");
        self.exact += 1;
    }

    fn float(&mut self, actual: f64, expected: f64, what: &str) {
        self.float += 1;
        if actual == expected {
            return; // include le infinità concordi
        }
        let dev = (actual - expected).abs();
        assert!(
            dev <= FLOAT_TOLERANCE,
            "{what}: {actual} != {expected} (tolleranza {FLOAT_TOLERANCE})"
        );
        if dev > self.max_dev {
            self.max_dev = dev;
            self.max_where = what.to_string();
        }
    }

    /// Confronto strutturale di due JSON: stringhe/bool esatti, numeri entro tolleranza, chiavi senza ordine.
    fn json(&mut self, actual: &Value, expected: &Value, path: &str) {
        match (actual, expected) {
            (Value::Number(a), Value::Number(b)) => {
                self.float(
                    a.as_f64().unwrap_or(f64::NAN),
                    b.as_f64().unwrap_or(f64::NAN),
                    path,
                );
            }
            (Value::Array(a), Value::Array(b)) => {
                self.exact(&a.len(), &b.len(), &format!("{path}.len"));
                for (i, (x, y)) in a.iter().zip(b).enumerate() {
                    self.json(x, y, &format!("{path}[{i}]"));
                }
            }
            (Value::Object(a), Value::Object(b)) => {
                let keys = |m: &serde_json::Map<String, Value>| {
                    let mut k: Vec<String> = m.keys().cloned().collect();
                    k.sort();
                    k
                };
                self.exact(&keys(a), &keys(b), &format!("{path}.keys"));
                for (k, x) in a {
                    self.json(x, &b[k], &format!("{path}.{k}"));
                }
            }
            _ => self.exact(actual, expected, path),
        }
    }

    fn edge(&mut self, label: &str) {
        self.edge.push(label.to_string());
    }

    fn finish(self, area: &str) {
        record_evidence(
            area,
            json!({
                "exactComparisons": self.exact,
                "floatComparisons": self.float,
                "totalComparisons": self.exact + self.float,
                "maxAbsDeviation": self.max_dev,
                "maxAbsDeviationAt": if self.max_dev == 0.0 { "nessuna deviazione (bit-identico)".to_string() } else { self.max_where },
                "edgeCases": self.edge,
            }),
        );
    }
}

// ---------- lettura fixture ----------

fn num(v: &Value) -> f64 {
    match v {
        Value::String(s) if s == "Infinity" => f64::INFINITY,
        Value::String(s) if s == "-Infinity" => f64::NEG_INFINITY,
        other => other
            .as_f64()
            .unwrap_or_else(|| panic!("numero atteso: {other}")),
    }
}

fn text(v: &Value) -> &str {
    v.as_str().unwrap_or_else(|| panic!("stringa attesa: {v}"))
}

fn items(v: &Value) -> &Vec<Value> {
    v.as_array().unwrap_or_else(|| panic!("array atteso: {v}"))
}

fn nums(v: &Value) -> Vec<f64> {
    items(v).iter().map(num).collect()
}

fn ints(v: &Value) -> Vec<i64> {
    items(v)
        .iter()
        .map(|x| x.as_i64().expect("intero"))
        .collect()
}

fn seed(v: &Value) -> u32 {
    u32::try_from(v.as_u64().expect("seme")).expect("seme u32")
}

/// Rimuove ciò che il Rust aggiunge rispetto al TS (campo `engineVersion`), verificandone la presenza.
fn strip_engine_version_json(json: &str) -> String {
    let line = format!("  \"engineVersion\": \"{ENGINE_VERSION}\",\n");
    assert!(json.contains(&line), "engineVersion assente nel JSON");
    json.replacen(&line, "", 1)
}

/// Come sopra per il piè di pagina del report HTML.
fn strip_engine_footer_html(html: &str) -> String {
    let footer = format!("\n{}", html_engine_footer());
    assert!(
        html.contains(&footer),
        "piè di pagina motore assente nel report"
    );
    html.replacen(&footer, "", 1)
}

// ---------- rng ----------

#[test]
fn should_reproduce_typescript_rng_sequences_for_all_seeds() {
    let rng = &fixture()["rng"];
    let mut area = Area::default();
    for case in items(&rng["mulberry32"]) {
        let s = seed(&case["seed"]);
        let mut r = mulberry32(s);
        for (i, expected) in nums(&case["values"]).into_iter().enumerate() {
            area.float(r(), expected, &format!("mulberry32 seme {s} #{i}"));
        }
    }
    for case in items(&rng["shuffle"]) {
        let input = ints(&case["items"]);
        let out = shuffle(&input, &mut mulberry32(seed(&case["seed"])));
        area.exact(&out, &ints(&case["out"]), "shuffle");
    }
    for case in items(&rng["randInt"]) {
        let (min, max) = (case["min"].as_i64().unwrap(), case["max"].as_i64().unwrap());
        let mut r = mulberry32(seed(&case["seed"]));
        let out: Vec<i64> = (0..20).map(|_| rand_int(min, max, &mut r)).collect();
        area.exact(
            &out,
            &ints(&case["values"]),
            &format!("randInt {min}..{max}"),
        );
    }
    for case in items(&rng["pick"]) {
        let list = ints(&case["items"]);
        let mut r = mulberry32(seed(&case["seed"]));
        let out: Vec<i64> = (0..20)
            .filter_map(|_| pick(&list, &mut r).copied())
            .collect();
        area.exact(&out, &ints(&case["values"]), "pick");
    }
    area.exact(
        &pick::<i64>(&[], &mut mulberry32(1)),
        &None,
        "pick su lista vuota",
    );
    for label in [
        "semi 1, 42, 2026, 123456789, 0, 4294967295",
        "shuffle di lista vuota, singola, 2, 3, 10, 52 elementi",
        "randInt con min=max e intervalli negativi",
        "pick su lista vuota (Rust: None; TS assume lista non vuota)",
    ] {
        area.edge(label);
    }
    area.finish("rng");
}

// ---------- validazione ----------

fn flag_of(label: &str) -> ValidationFlag {
    [
        ValidationFlag::Valid,
        ValidationFlag::Anticipation,
        ValidationFlag::Omission,
        ValidationFlag::Interrupted,
    ]
    .into_iter()
    .find(|f| f.as_str() == label)
    .unwrap_or_else(|| panic!("flag sconosciuto {label}"))
}

#[test]
fn should_reproduce_typescript_validation_and_statistics() {
    let v = &fixture()["validation"];
    let mut area = Area::default();
    area.float(
        ANTICIPATION_CUTOFF_MS,
        num(&v["anticipationCutoffMs"]),
        "soglia anticipazione",
    );
    for c in items(&v["classify"]) {
        let rt = (!c["rtMs"].is_null()).then(|| num(&c["rtMs"]));
        let flag = classify_rt(
            rt,
            c["responded"].as_bool().unwrap(),
            c["interrupted"].as_bool().unwrap(),
        );
        area.exact(&flag.as_str(), &text(&c["flag"]), &format!("classify {c}"));
    }
    for s in items(&v["stats"]) {
        let values = nums(&s["values"]);
        area.float(mean(&values), num(&s["mean"]), "mean");
        area.float(
            standard_deviation(&values),
            num(&s["sd"]),
            &format!("sd su {} valori", values.len()),
        );
    }
    for set in items(&v["trialSets"]) {
        let name = text(&set["name"]);
        let trials: Vec<TrialResult> = serde_json::from_value(set["trials"].clone()).unwrap();
        for (label, expected) in set["counts"].as_object().unwrap() {
            let actual = count_flag(&trials, flag_of(label));
            area.exact(
                &actual,
                &(expected.as_u64().unwrap() as usize),
                &format!("{name} count {label}"),
            );
        }
        let rts = valid_correct_rts(&trials);
        let expected_rts = nums(&set["validCorrectRts"]);
        area.exact(
            &rts.len(),
            &expected_rts.len(),
            &format!("{name} #rt validi"),
        );
        for (a, b) in rts.iter().zip(&expected_rts) {
            area.float(*a, *b, &format!("{name} rt valido"));
        }
        area.float(
            mean_rt_of_valid_correct(&trials),
            num(&set["meanRt"]),
            &format!("{name} meanRt"),
        );
        area.float(
            sd_rt_of_valid_correct(&trials),
            num(&set["sdRt"]),
            &format!("{name} sdRt"),
        );
    }
    for label in [
        "liste vuote (mean=0, sd=0)",
        "n=1 (sd=0)",
        "valori costanti (sd=0)",
        "soglia 150 ms: 149, 149.999, 150, 150.001",
        "rt nullo con responded=true, rt negativo, rt enorme",
        "precedenza INTERRUPTED > OMISSION > ANTICIPATION > VALID (36 combinazioni)",
        "trial interrotti (con e senza rt)",
        "omissioni, anticipazioni, errori validi",
        "solo pratica (esclusa dalle metriche)",
        "nessun trial valido corretto",
    ] {
        area.edge(label);
    }
    area.finish("validazione");
}

// ---------- sdt ----------

#[test]
fn should_reproduce_typescript_probit_d_prime_and_criterion() {
    let s = &fixture()["sdt"];
    let mut area = Area::default();
    for c in items(&s["probit"]) {
        area.float(
            probit(num(&c["p"])),
            num(&c["z"]),
            &format!("probit({})", c["p"]),
        );
    }
    for c in items(&s["rates"]) {
        let (h, t, f, n) = (
            num(&c["hits"]),
            num(&c["targets"]),
            num(&c["falseAlarms"]),
            num(&c["nonTargets"]),
        );
        let label = format!("hits={h} targets={t} fa={f} nonTargets={n}");
        area.float(
            d_prime(h, t, f, n),
            num(&c["dPrime"]),
            &format!("d' {label}"),
        );
        area.float(
            criterion_c(h, t, f, n),
            num(&c["criterionC"]),
            &format!("c {label}"),
        );
    }
    for label in [
        "p <= 0 e p >= 1 (infiniti), p negativa e > 1",
        "p estreme 1e-300, 1e-10, 1-1e-10",
        "confini delle code di Acklam (0.02425 e 0.97575, +/- epsilon)",
        "hits=0, hits=targets, falsi allarmi=0 e =nonTargets",
        "targets=0 e nonTargets=0 (solo correzione loglinear)",
    ] {
        area.edge(label);
    }
    area.finish("sdt");
}

// ---------- export ----------

fn format_of(label: &str) -> ExportFormat {
    match label {
        "csv-it" => ExportFormat::CsvIt,
        "csv-intl" => ExportFormat::CsvIntl,
        "summary-csv" => ExportFormat::SummaryCsv,
        "events-tsv" => ExportFormat::EventsTsv,
        "json" => ExportFormat::Json,
        "html" => ExportFormat::Html,
        other => panic!("formato sconosciuto {other}"),
    }
}

fn csv_value_of(v: &Value) -> CsvValue {
    match v {
        Value::Null => CsvValue::Null,
        Value::String(s) => CsvValue::Text(s.clone()),
        Value::Number(n) => CsvValue::Num(n.as_f64().unwrap()),
        Value::Bool(b) => CsvValue::Text(b.to_string()),
        other => panic!("valore CSV non supportato {other}"),
    }
}

#[test]
fn should_reproduce_typescript_exports_byte_for_byte() {
    let e = &fixture()["export"];
    let (exported_at, user_agent) = (text(&e["exportedAt"]), text(&e["userAgent"]));
    let mut area = Area::default();
    for c in items(&e["csvFields"]) {
        let out = csv_field(&csv_value_of(&c["value"]), text(&c["sep"]));
        area.exact(&out.as_str(), &text(&c["out"]), &format!("csvField {c}"));
    }
    for c in items(&e["escapeHtml"]) {
        area.exact(
            &escape_html(text(&c["in"])).as_str(),
            &text(&c["out"]),
            "escapeHtml",
        );
    }
    for c in items(&e["cases"]) {
        let name = text(&c["name"]);
        let r: TestResult = serde_json::from_value(c["result"].clone()).unwrap();
        let mut same = |actual: String, key: &str| {
            area.exact(&actual.as_str(), &text(&c[key]), &format!("{name}.{key}"));
        };
        same(to_csv(&r), "csv");
        same(to_trials_csv(&r, CsvLocale::It), "trialsCsvIt");
        same(to_trials_csv(&r, CsvLocale::Intl), "trialsCsvIntl");
        same(to_summary_csv(&r, CsvLocale::It), "summaryCsvIt");
        same(to_summary_csv(&r, CsvLocale::Intl), "summaryCsvIntl");
        same(to_events_tsv(&r), "eventsTsv");
        same(export_filename(&r, "csv"), "filenameCsv");
        same(export_filename(&r, "json"), "filenameJson");
        let html = to_html_report(&r, "Stroop <1> & \"co\"", exported_at);
        same(strip_engine_footer_html(&html), "html");
        let json = strip_engine_version_json(&to_json(&r, exported_at, user_agent));
        area.exact(
            &json,
            &text(&c["json"]).to_string(),
            &format!("{name}.json"),
        );
        for (label, expected) in c["formatFilenames"].as_object().unwrap() {
            let actual = format_filename(&r, format_of(label));
            area.exact(
                &actual.as_str(),
                &text(expected),
                &format!("{name} filename {label}"),
            );
        }
    }
    for label in [
        "campi con ; , \" e newline (quoting CSV)",
        "stimolo con tab, CR, LF (collasso nel TSV)",
        "risposta e rt nulli (omissione), rt 0.5/2.5/999.5 (arrotondamento Math.round)",
        "trial/metriche/parametri vuoti",
        "parametri: bool, null, array, oggetto, 1e21 e 1.5e-7 (formato numerico JS)",
        "sessionId con caratteri da sanificare (/ . spazio accenti)",
        "metrica con unita vuota, testo e numero (virgola decimale solo in locale it)",
        "HTML con <, &, \" nel titolo e nei parametri",
        "engineVersion nel JSON e nel piè di pagina HTML (assenti nel TS, rimossi prima del confronto)",
    ] {
        area.edge(label);
    }
    area.finish("export");
}

#[test]
fn should_write_engine_version_in_every_json_export() {
    let e = &fixture()["export"];
    let r: TestResult = serde_json::from_value(e["cases"][0]["result"].clone()).unwrap();
    let parsed: Value = serde_json::from_str(&to_json(&r, "x", "y")).unwrap();
    assert_eq!(parsed["engineVersion"], ENGINE_VERSION);
    let run: SessionRun = serde_json::from_value(fixture()["session"]["run"].clone()).unwrap();
    let parsed: Value = serde_json::from_str(&to_session_json(&run, "x", "y")).unwrap();
    assert_eq!(parsed["engineVersion"], ENGINE_VERSION);
    assert!(to_html_report(&r, "t", "x").contains(&format!("v{ENGINE_VERSION}</p>")));
}

// ---------- sessione ----------

fn template(name: &str) -> SessionTemplate {
    serde_json::from_value(fixture()["session"]["templates"][name].clone()).unwrap()
}

fn as_json<T: serde::Serialize>(v: &T) -> Value {
    serde_json::to_value(v).unwrap()
}

#[test]
fn should_reproduce_typescript_session_exports_and_model() {
    let s = &fixture()["session"];
    let (exported_at, user_agent) = (text(&s["exportedAt"]), text(&s["userAgent"]));
    let run: SessionRun = serde_json::from_value(s["run"].clone()).unwrap();
    let mut area = Area::default();

    area.exact(
        &to_session_csv(&run).as_str(),
        &text(&s["csv"]),
        "session csv",
    );
    area.exact(
        &to_session_summary_csv(&run, CsvLocale::It).as_str(),
        &text(&s["summaryCsvIt"]),
        "session riepilogo it",
    );
    area.exact(
        &to_session_summary_csv(&run, CsvLocale::Intl).as_str(),
        &text(&s["summaryCsvIntl"]),
        "session riepilogo intl",
    );
    let json = strip_engine_version_json(&to_session_json(&run, exported_at, user_agent));
    area.exact(&json, &text(&s["json"]).to_string(), "session json");
    area.exact(
        &session_filename(&run, "json").as_str(),
        &text(&s["filenameJson"]),
        "session filename json",
    );
    area.exact(
        &session_filename(&run, "csv").as_str(),
        &text(&s["filenameCsv"]),
        "session filename csv",
    );

    for c in items(&s["spans"]) {
        let t = template(text(&c["name"]));
        let spans = phase_spans(&t);
        let expected = items(&c["spans"]);
        area.exact(&spans.len(), &expected.len(), "spans.len");
        for (sp, ex) in spans.iter().zip(expected) {
            area.exact(&sp.phase.id.as_str(), &text(&ex["id"]), "span id");
            area.float(sp.start_ms, num(&ex["startMs"]), "span start");
            area.float(sp.end_ms, num(&ex["endMs"]), "span end");
        }
    }
    for c in items(&s["totals"]) {
        area.float(
            session_total_ms(&template(text(&c["name"]))),
            num(&c["totalMs"]),
            "sessionTotalMs",
        );
    }
    for c in items(&s["flat"]) {
        let t = template(text(&c["name"]));
        let actual: Vec<Value> = flatten_pins(&t)
            .iter()
            .map(|f| json!([f.phase.id, f.pin.id]))
            .collect();
        area.exact(&actual, items(&c["pins"]), "flattenPins");
    }
    for c in items(&s["phaseAtElapsed"]) {
        let t = template(text(&c["name"]));
        let actual = phase_at_elapsed(&t, num(&c["elapsedMs"])).map(|p| p.id.clone());
        area.exact(
            &actual,
            &c["phaseId"].as_str().map(str::to_string),
            "phaseAtElapsed",
        );
    }
    for c in items(&s["states"]) {
        let t = template(text(&c["name"]));
        let completed: Vec<String> = items(&c["completed"])
            .iter()
            .map(|x| text(x).to_string())
            .collect();
        let st = compute_session_state(&t, num(&c["elapsedMs"]), &completed);
        let actual = json!({
            "currentPhaseName": st.current_phase_name, "currentPhaseId": st.current_phase_id,
            "nextPin": st.next_pin, "upcomingTests": st.upcoming_tests, "countdownMs": st.countdown_ms,
            "positionIndex": st.position_index, "total": st.total, "due": st.due, "done": st.done,
        });
        area.json(
            &actual,
            &c["state"],
            &format!("state {} @{}", c["name"], c["elapsedMs"]),
        );
    }
    for c in items(&s["phaseIndexAtOffset"]) {
        let t = template(text(&c["name"]));
        let actual = phase_index_at_offset(&t, num(&c["offsetMs"])).map_or(-1, |i| i as i64);
        area.exact(&actual, &c["index"].as_i64().unwrap(), "phaseIndexAtOffset");
    }
    let base = template("base");
    for c in items(&s["movePinById"]) {
        let out = move_pin_by_id(&base, text(&c["pinId"]), num(&c["offsetMs"]));
        area.json(
            &as_json(&out),
            &c["out"],
            &format!("movePinById {} {}", c["pinId"], c["offsetMs"]),
        );
    }
    for c in items(&s["movePin"]) {
        let (from, pin) = (
            c["fromPhaseIdx"].as_u64().unwrap() as usize,
            c["pinIdx"].as_u64().unwrap() as usize,
        );
        area.json(
            &as_json(&move_pin(&base, from, pin, num(&c["offsetMs"]))),
            &c["out"],
            "movePin",
        );
    }
    for c in items(&s["distribute"]) {
        let input: SessionTemplate = serde_json::from_value(c["input"].clone()).unwrap();
        area.json(
            &as_json(&distribute_phases_evenly(&input)),
            &c["out"],
            "distributePhasesEvenly",
        );
    }
    for c in items(&s["runIds"]) {
        let id = make_run_id(
            c["hour"].as_u64().unwrap() as u32,
            c["minute"].as_u64().unwrap() as u32,
            &mut mulberry32(seed(&c["seed"])),
        );
        area.exact(&id.as_str(), &text(&c["out"]), "makeRunId");
    }
    for c in items(&s["localIds"]) {
        let id = make_local_id(text(&c["prefix"]), &mut mulberry32(seed(&c["seed"])));
        area.exact(&id.as_str(), &text(&c["out"]), "makeLocalId");
    }
    for label in [
        "template legacy (totalMs=0 -> somma fasi), senza fasi, solo pin (-> ultimo offset)",
        "elapsed negativo, sull'estremo di fase, oltre la fine",
        "pin con stesso offset (ordinamento stabile), pin completati inesistenti, tutti completati",
        "movePin con indici non validi, offset clampato a [0, totale], arrotondamento .5",
        "pin trascinato in un'altra fase",
        "distribuzione con resto, totale minore del numero di fasi, totale 0, nessuna fase",
        "CSV di sessione con nome fase contenente ; e risultato senza trial",
        "engineVersion nel JSON di sessione (rimosso prima del confronto)",
    ] {
        area.edge(label);
    }
    area.finish("sessione");
}

// ---------- proptest ----------

/// Esegue `cases` casi di una proprietà e registra quanti ne sono stati davvero eseguiti.
fn run_property<S: Strategy>(
    name: &str,
    strategy: S,
    body: impl Fn(S::Value) -> Result<(), TestCaseError>,
) {
    let executed = std::cell::Cell::new(0u32);
    let mut runner = TestRunner::new(Config {
        cases: PROPTEST_CASES,
        ..Config::default()
    });
    runner
        .run(&strategy, |value| {
            executed.set(executed.get() + 1);
            body(value)
        })
        .unwrap_or_else(|e| panic!("invariante {name} violata: {e}"));
    record_evidence(
        &format!("proptest.{name}"),
        json!({ "cases": executed.get() }),
    );
}

#[test]
fn should_shuffle_always_be_a_permutation() {
    run_property(
        "shuffle_e_una_permutazione",
        (any::<u32>(), prop::collection::vec(any::<u8>(), 0..100)),
        |(s, input)| {
            let out = shuffle(&input, &mut mulberry32(s));
            let (mut a, mut b) = (out.clone(), input.clone());
            a.sort_unstable();
            b.sort_unstable();
            prop_assert_eq!(a, b);
            prop_assert_eq!(
                out,
                shuffle(&input, &mut mulberry32(s)),
                "deterministico a parità di seme"
            );
            Ok(())
        },
    );
}

#[test]
fn should_rand_int_stay_within_bounds() {
    run_property(
        "rand_int_nell_intervallo",
        (any::<u32>(), -1000i64..1000, 0i64..1000),
        |(s, min, span)| {
            let max = min + span;
            let mut r = mulberry32(s);
            for _ in 0..50 {
                let v = rand_int(min, max, &mut r);
                prop_assert!((min..=max).contains(&v), "{v} fuori da {min}..={max}");
            }
            Ok(())
        },
    );
}

#[test]
fn should_mulberry32_stay_in_unit_interval() {
    run_property("mulberry32_in_0_1", any::<u32>(), |s| {
        let mut r = mulberry32(s);
        for _ in 0..200 {
            let v = r();
            prop_assert!((0.0..1.0).contains(&v), "{v} fuori da [0, 1)");
        }
        Ok(())
    });
}

#[test]
fn should_pick_return_a_member() {
    run_property(
        "pick_restituisce_un_elemento",
        (any::<u32>(), prop::collection::vec(any::<u16>(), 1..40)),
        |(s, list)| {
            let mut r = mulberry32(s);
            for _ in 0..20 {
                prop_assert!(pick(&list, &mut r).is_some_and(|v| list.contains(v)));
            }
            Ok(())
        },
    );
}

#[test]
fn should_classify_rt_follow_documented_precedence() {
    let rts = prop::option::of(prop_oneof![
        -1e6f64..1e6,
        Just(149.999),
        Just(150.0),
        Just(150.001)
    ]);
    run_property(
        "classify_rt_precedenza",
        (rts, any::<bool>(), any::<bool>()),
        |(rt, responded, interrupted)| {
            let expected = if interrupted {
                ValidationFlag::Interrupted
            } else if !responded || rt.is_none() {
                ValidationFlag::Omission
            } else if rt.is_some_and(|v| v < ANTICIPATION_CUTOFF_MS) {
                ValidationFlag::Anticipation
            } else {
                ValidationFlag::Valid
            };
            prop_assert_eq!(classify_rt(rt, responded, interrupted), expected);
            Ok(())
        },
    );
}
