//! Catalogo dei test: metadati, focus cerebrale, istruzioni e descrittori dei parametri
//! (porta `TEST_CATALOG` di `src/ui/router.ts`, `testFocus.ts`, `instructions.ts`, `paramFields.ts`).
use serde_json::{Map, Value};
use sintropia_core::types::TestId;

/// Voce del catalogo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TestMeta {
    pub id: TestId,
    pub title: &'static str,
    pub domain: &'static str,
}

const fn meta(id: TestId, title: &'static str, domain: &'static str) -> TestMeta {
    TestMeta { id, title, domain }
}

pub const TEST_CATALOG: &[TestMeta] = &[
    meta(
        TestId::Stroop1,
        "Stroop 1 — Focus Parola",
        "Velocità di elaborazione",
    ),
    meta(
        TestId::Stroop2,
        "Stroop 2 — Focus Colore",
        "Risoluzione del conflitto",
    ),
    meta(TestId::Gonogo, "Go / No-Go", "Inibizione motoria rapida"),
    meta(TestId::Corsi, "Corsi Block Task", "Memoria visuo-spaziale"),
    meta(TestId::Nback, "N-Back (2-back)", "Memoria di lavoro"),
    meta(
        TestId::Wcst,
        "Wisconsin Card Sorting Test",
        "Flessibilità cognitiva",
    ),
    meta(
        TestId::Pvt,
        "PVT — Vigilanza Psicomotoria",
        "Attenzione sostenuta",
    ),
    meta(
        TestId::Flanker,
        "Flanker — Frecce di Eriksen",
        "Attenzione selettiva",
    ),
    meta(
        TestId::VisualSearch,
        "Visual Search — Ricerca visiva",
        "Attenzione visiva",
    ),
    meta(
        TestId::MentalRotation,
        "Mental Rotation — Rotazione mentale",
        "Cognizione spaziale",
    ),
    meta(
        TestId::TrailMaking,
        "Trail Making A/B",
        "Flessibilità e velocità visuo-motoria",
    ),
    meta(
        TestId::Sart,
        "SART — Attenzione sostenuta alla risposta",
        "Controllo attentivo",
    ),
];

/// Voce di catalogo per un test, se presente.
pub fn meta_for(id: TestId) -> Option<&'static TestMeta> {
    TEST_CATALOG.iter().find(|m| m.id == id)
}

/// Cosa si accende nel cervello e cosa si chiede al partecipante.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TestFocus {
    /// Indici di regione: 0 frontale, 1 parietale, 2 temporale, 3 occipitale, 4 cervelletto.
    pub regions: &'static [u8],
    pub region_label: &'static str,
    pub task: &'static str,
}

const FRONTAL: &[u8] = &[0];
const PARIETAL: &[u8] = &[1];
const FRONTO_PARIETAL: &[u8] = &[0, 1];

const fn focus(
    regions: &'static [u8],
    region_label: &'static str,
    task: &'static str,
) -> TestFocus {
    TestFocus {
        regions,
        region_label,
        task,
    }
}

pub fn focus_for(id: TestId) -> TestFocus {
    match id {
        TestId::Stroop1 => focus(
            FRONTAL,
            "Frontale",
            "Leggi la parola e ignora il colore dell’inchiostro.",
        ),
        TestId::Stroop2 => focus(
            FRONTAL,
            "Frontale",
            "Nomina il colore dell’inchiostro e sopprimi la lettura.",
        ),
        TestId::Gonogo => focus(
            FRONTAL,
            "Frontale",
            "Rispondi ai Go, trattieniti sui No-Go.",
        ),
        TestId::Corsi => focus(
            PARIETAL,
            "Parietale",
            "Riproduci la sequenza dei blocchi illuminati.",
        ),
        TestId::Nback => focus(
            FRONTO_PARIETAL,
            "Fronto-parietale",
            "Di’ se lo stimolo coincide con quello di due posizioni prima.",
        ),
        TestId::Wcst => focus(
            FRONTAL,
            "Frontale",
            "Deduci la regola di smistamento e cambiala quando cambia.",
        ),
        TestId::Flanker => focus(
            FRONTAL,
            "Frontale",
            "Rispondi alla freccia centrale e ignora quelle ai lati.",
        ),
        TestId::VisualSearch => focus(
            &[1, 3],
            "Parieto-occipitale",
            "Trova il cerchio arancione tra i distrattori, o dì che non c’è.",
        ),
        TestId::MentalRotation => focus(
            PARIETAL,
            "Parietale",
            "Stabilisci se due figure a blocchi sono la stessa, solo ruotata, o speculari.",
        ),
        TestId::Sart => focus(
            FRONTO_PARIETAL,
            "Fronto-parietale",
            "Premi a ogni cifra, tranne a una: trattieniti quando compare.",
        ),
        TestId::Pvt => focus(
            FRONTO_PARIETAL,
            "Fronto-parietale",
            "Rispondi appena compare lo stimolo, a intervalli imprevedibili.",
        ),
        TestId::TrailMaking => focus(
            FRONTO_PARIETAL,
            "Fronto-parietale",
            "Collega i cerchi in ordine, prima solo numeri, poi alternando numeri e lettere.",
        ),
    }
}

/// Testo delle istruzioni (in italiano) con lo schema dei tasti.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Instruction {
    pub title: String,
    pub paragraphs: Vec<String>,
    /// Righe che descrivono la mappatura dei tasti (mostrate in evidenza).
    pub key_hints: Vec<String>,
}

fn instruction(title: &str, paragraphs: &[&str], key_hints: &[&str]) -> Instruction {
    Instruction {
        title: title.to_string(),
        paragraphs: paragraphs.iter().map(|s| s.to_string()).collect(),
        key_hints: key_hints.iter().map(|s| s.to_string()).collect(),
    }
}

/// Intero valido nell'intervallo `[lo, hi]`, altrimenti `fallback` (NaN incluso).
fn int_in_range(value: f64, lo: i32, hi: i32, fallback: i32) -> i32 {
    if value.fract() == 0.0 && value >= f64::from(lo) && value <= f64::from(hi) {
        value as i32
    } else {
        fallback
    }
}

/// Istruzioni dell'N-Back per il livello `n`: il testo segue il parametro, non è fisso a 2.
pub fn nback_instruction(n: f64) -> Instruction {
    let level = int_in_range(n, 1, 3, 2);
    let position_words = ["", "UNA posizione", "DUE posizioni", "TRE posizioni"];
    let steps = if level == 1 {
        "1 passo fa".to_string()
    } else {
        format!("{level} passi fa")
    };
    Instruction {
        title: format!("N-Back ({level}-back)"),
        paragraphs: vec![
            "Vedrai una sequenza continua di lettere, una alla volta.".into(),
            format!(
                "Premi la BARRA SPAZIATRICE quando la lettera attuale è identica a quella comparsa {} prima.",
                position_words[level as usize]
            ),
            "Non premere nulla in tutti gli altri casi. Il test è lungo: mantieni la concentrazione.".into(),
        ],
        key_hints: vec![format!("BARRA SPAZIATRICE = la lettera è uguale a {steps}")],
    }
}

/// Istruzioni del SART per la cifra bersaglio `digit`: il testo segue il parametro, non è fisso a 3.
pub fn sart_instruction(digit: f64) -> Instruction {
    let target = int_in_range(digit, 1, 9, 3);
    Instruction {
        title: "SART — Attenzione sostenuta alla risposta".into(),
        paragraphs: vec![
            "Sullo schermo compariranno cifre da 1 a 9, una alla volta, ciascuna seguita da un cerchio barrato.".into(),
            format!("Premi la BARRA SPAZIATRICE a ogni cifra TRANNE al {target}: quando compare il {target}, non premere nulla."),
            "Rispondi in fretta ma con attenzione: gli errori sul bersaglio sono la misura principale. Il test dura circa 4–5 minuti.".into(),
        ],
        key_hints: vec![format!("BARRA SPAZIATRICE = qualsiasi cifra tranne il {target}"), format!("Nessun tasto = {target}")],
    }
}

const STROOP_KEYS: [&str; 4] = ["R = ROSSO", "V = VERDE", "B = BLU", "G = GIALLO"];

/// Istruzioni di un test, adattate ai parametri scelti (livello n dell'N-Back, cifra bersaglio del SART).
pub fn instructions_for(test_id: TestId, params: Option<&Map<String, Value>>) -> Instruction {
    let number = |key: &str| {
        params
            .and_then(|p| p.get(key))
            .and_then(Value::as_f64)
            .unwrap_or(f64::NAN)
    };
    match test_id {
        TestId::Nback => nback_instruction(number("n")),
        TestId::Sart => sart_instruction(number("targetDigit")),
        TestId::Stroop1 => instruction(
            "Stroop 1 — Focus sulla Parola",
            &[
                "Apparirà una parola che indica un colore, scritta in un colore che può coincidere o no col suo significato.",
                "Devi rispondere in base alla PAROLA che leggi, ignorando il colore con cui è scritta.",
                "Premi il tasto corrispondente all’iniziale della parola, il più rapidamente e accuratamente possibile.",
            ],
            &STROOP_KEYS,
        ),
        TestId::Stroop2 => instruction(
            "Stroop 2 — Focus sul Colore",
            &[
                "Apparirà una parola che indica un colore, scritta in un colore che può coincidere o no col suo significato.",
                "Devi rispondere in base al COLORE con cui è scritta la parola, ignorando ciò che la parola dice.",
                "Premi il tasto corrispondente all’iniziale del colore, il più rapidamente e accuratamente possibile.",
            ],
            &STROOP_KEYS,
        ),
        TestId::Gonogo => instruction(
            "Go / No-Go",
            &[
                "Appariranno rapidamente dei cerchi colorati.",
                "Premi la BARRA SPAZIATRICE il più velocemente possibile quando vedi un cerchio VERDE (Go).",
                "NON premere nulla quando vedi un cerchio ROSSO (No-Go): devi trattenere la risposta.",
            ],
            &["BARRA SPAZIATRICE = cerchio verde", "Nessun tasto = cerchio rosso"],
        ),
        TestId::Corsi => instruction(
            "Corsi Block Task",
            &[
                "Vedrai una configurazione fissa di 9 blocchi. Alcuni blocchi si illumineranno in sequenza, uno dopo l’altro.",
                "Quando la sequenza termina, riproducila cliccando i blocchi nello STESSO ordine in cui si sono illuminati.",
                "Le sequenze si allungano progressivamente. Concentrati e memorizza l’ordine.",
            ],
            &["Usa il mouse per cliccare i blocchi"],
        ),
        TestId::Wcst => instruction(
            "Wisconsin Card Sorting Test",
            &[
                "In alto vedrai una carta. Devi abbinarla a una delle 4 carte in basso cliccandola.",
                "Puoi abbinare per colore, forma o numero dei simboli: NON ti verrà detto quale sia la regola giusta.",
                "Dopo ogni scelta vedrai solo “Corretto” o “Errato”. Usa il feedback per scoprire la regola. Attenzione: la regola può cambiare senza preavviso.",
            ],
            &["Usa il mouse per cliccare la carta"],
        ),
        TestId::Pvt => instruction(
            "PVT — Vigilanza Psicomotoria",
            &[
                "Fissa lo schermo. A intervalli imprevedibili, comparirà un contatore che parte da 0 e conta i millisecondi.",
                "Premi la BARRA SPAZIATRICE il più velocemente possibile NON APPENA il numero appare.",
                "Cerca di mantenere la concentrazione: il test dura circa 10 minuti. Il numero di lapse (risposte lente) è la misura principale.",
            ],
            &["BARRA SPAZIATRICE = ferma il contatore il più velocemente possibile"],
        ),
        TestId::Flanker => instruction(
            "Flanker — Frecce di Eriksen",
            &[
                "Al centro dello schermo comparirà una fila di cinque simboli.",
                "Rispondi alla direzione della freccia CENTRALE, ignorando i simboli ai lati.",
                "A volte i simboli ai lati indicano la direzione opposta: ignorali. Rispondi il più rapidamente e accuratamente possibile.",
            ],
            &["← = freccia centrale a sinistra", "→ = freccia centrale a destra"],
        ),
        TestId::MentalRotation => instruction(
            "Mental Rotation — Rotazione mentale",
            &[
                "Compariranno due figure fatte di cubetti, affiancate.",
                "A volte la figura di destra è la stessa di quella di sinistra, solo ruotata. Altre volte è la sua immagine speculare e non potrai mai sovrapporla.",
                "Immagina di ruotare una figura per capire se sono uguali o diverse; rispondi il più rapidamente possibile, senza sbagliare.",
            ],
            &["← = figure UGUALI (solo ruotate)", "→ = figure DIVERSE (speculari)"],
        ),
        TestId::VisualSearch => instruction(
            "Visual Search — Ricerca visiva",
            &[
                "Comparirà un campo con molte figure colorate. Il bersaglio è un CERCHIO ARANCIONE.",
                "A volte il bersaglio c’è, a volte no. Cercalo e rispondi il più rapidamente possibile, senza sbagliare.",
                "I distrattori cambiano: possono essere tutti diversi per colore, oppure assomigliare al bersaglio per forma o per colore.",
            ],
            &["← = cerchio arancione PRESENTE", "→ = cerchio arancione ASSENTE"],
        ),
        TestId::TrailMaking => instruction(
            "Trail Making A/B",
            &[
                "Sullo schermo ci sono dei cerchi sparsi. Nella parte A sono numerati: collegali in ordine, 1, 2, 3…",
                "Nella parte B ci sono numeri e lettere: collegali alternando, 1, A, 2, B, 3, C…",
                "Fai clic sui cerchi con il mouse o con il dito, il più velocemente possibile senza sbagliare. Se sbagli il tempo continua a scorrere.",
            ],
            &["Mouse o tocco = clic sul cerchio successivo"],
        ),
    }
}

/// Descrittore di un campo parametro (etichetta, unità, intervallo).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FieldDesc {
    pub key: &'static str,
    pub label: &'static str,
    pub unit: Option<&'static str>,
    pub min: f64,
    pub max: f64,
    pub step: f64,
}

/// Sezione di parametri di un test; `test_key` è la chiave di `AllParams` (es. `stroop1`, `visualSearch`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SectionDesc {
    pub test_key: &'static str,
    pub title: &'static str,
    pub fields: &'static [FieldDesc],
}

const fn fd(
    key: &'static str,
    label: &'static str,
    unit: Option<&'static str>,
    min: f64,
    max: f64,
    step: f64,
) -> FieldDesc {
    FieldDesc {
        key,
        label,
        unit,
        min,
        max,
        step,
    }
}

const TRIAL: Option<&str> = Some("trial");
const MS: Option<&str> = Some("ms");

const TRAIL_MAKING_FIELDS: &[FieldDesc] = &[
    fd(
        "nTargets",
        "Cerchi per parte",
        Some("cerchi"),
        8.0,
        51.0,
        1.0,
    ),
    fd(
        "practiceTargets",
        "Cerchi di pratica",
        Some("cerchi"),
        0.0,
        15.0,
        1.0,
    ),
];

const STROOP_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 4.0, 400.0, 2.0),
    fd("fixationMs", "Durata fissazione", MS, 0.0, 2000.0, 50.0),
    fd("timeoutMs", "Timeout risposta", MS, 500.0, 8000.0, 100.0),
    fd(
        "isiMs",
        "Intervallo tra stimoli (ISI)",
        MS,
        0.0,
        3000.0,
        50.0,
    ),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const GONOGO_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 8.0, 400.0, 4.0),
    fd("goRatio", "Proporzione Go", None, 0.5, 0.9, 0.05),
    fd(
        "stimulusMs",
        "Durata stimolo (finestra)",
        MS,
        300.0,
        2000.0,
        50.0,
    ),
    fd("isiMinMs", "ISI minimo", MS, 200.0, 2000.0, 50.0),
    fd("isiMaxMs", "ISI massimo", MS, 300.0, 3000.0, 50.0),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const CORSI_FIELDS: &[FieldDesc] = &[
    fd(
        "startLength",
        "Lunghezza iniziale",
        Some("blocchi"),
        2.0,
        6.0,
        1.0,
    ),
    fd(
        "maxLength",
        "Lunghezza massima",
        Some("blocchi"),
        4.0,
        9.0,
        1.0,
    ),
    fd("trialsPerLevel", "Trial per livello", TRIAL, 1.0, 4.0, 1.0),
    fd(
        "presentMsPerBlock",
        "Durata per blocco",
        MS,
        400.0,
        2000.0,
        50.0,
    ),
    fd(
        "complexityTolerance",
        "Tolleranza complessità",
        None,
        2.0,
        30.0,
        1.0,
    ),
];

const NBACK_FIELDS: &[FieldDesc] = &[
    fd("n", "Livello n", None, 1.0, 3.0, 1.0),
    fd("letterMs", "Durata lettera", MS, 200.0, 1500.0, 50.0),
    fd("blankMs", "Durata schermo vuoto", MS, 500.0, 3000.0, 50.0),
    fd("nTrials", "Numero di trial", TRIAL, 20.0, 600.0, 10.0),
    fd("targetRate", "Proporzione target", None, 0.1, 0.5, 0.05),
    fd(
        "lureRate",
        "Proporzione lure (tra i non-target)",
        None,
        0.0,
        0.4,
        0.05,
    ),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 60.0, 5.0),
];

const WCST_FIELDS: &[FieldDesc] = &[
    fd(
        "deckSize",
        "Dimensione mazzo",
        Some("carte"),
        32.0,
        256.0,
        32.0,
    ),
    fd(
        "runToShift",
        "Corrette per il cambio",
        Some("risposte"),
        4.0,
        20.0,
        1.0,
    ),
    fd(
        "maxCategories",
        "Categorie da completare",
        None,
        1.0,
        12.0,
        1.0,
    ),
];

const PVT_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 10.0, 400.0, 10.0),
    fd(
        "stimulusMaxMs",
        "Timeout stimolo",
        MS,
        1000.0,
        30000.0,
        500.0,
    ),
    fd("isiMinMs", "ISI minimo", MS, 500.0, 20000.0, 500.0),
    fd("isiMaxMs", "ISI massimo", MS, 1000.0, 30000.0, 500.0),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const FLANKER_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 12.0, 400.0, 4.0),
    fd(
        "incongruentRatio",
        "Proporzione incongruenti",
        None,
        0.2,
        0.6,
        0.05,
    ),
    fd("neutralRatio", "Proporzione neutri", None, 0.0, 0.4, 0.05),
    fd("fixationMs", "Durata fissazione", MS, 200.0, 2000.0, 100.0),
    fd(
        "responseWindowMs",
        "Finestra di risposta",
        MS,
        500.0,
        3000.0,
        100.0,
    ),
    fd("isiMinMs", "ISI minimo", MS, 300.0, 3000.0, 100.0),
    fd("isiMaxMs", "ISI massimo", MS, 400.0, 4000.0, 100.0),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const SART_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 18.0, 450.0, 9.0),
    fd(
        "targetDigit",
        "Cifra da non rispondere",
        None,
        1.0,
        9.0,
        1.0,
    ),
    fd("digitMs", "Durata della cifra", MS, 100.0, 1000.0, 50.0),
    fd("maskMs", "Durata della maschera", MS, 300.0, 2000.0, 100.0),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const VISUAL_SEARCH_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 12.0, 480.0, 12.0),
    fd("fixationMs", "Durata fissazione", MS, 200.0, 2000.0, 100.0),
    fd(
        "responseWindowMs",
        "Tempo massimo",
        MS,
        1000.0,
        10000.0,
        500.0,
    ),
    fd("isiMinMs", "ISI minimo", MS, 300.0, 3000.0, 100.0),
    fd("isiMaxMs", "ISI massimo", MS, 400.0, 4000.0, 100.0),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const MENTAL_ROTATION_FIELDS: &[FieldDesc] = &[
    fd("nTrials", "Numero di trial", TRIAL, 14.0, 420.0, 14.0),
    fd("fixationMs", "Durata fissazione", MS, 200.0, 2000.0, 100.0),
    fd(
        "responseWindowMs",
        "Tempo massimo",
        MS,
        2000.0,
        20000.0,
        1000.0,
    ),
    fd("isiMinMs", "ISI minimo", MS, 300.0, 3000.0, 100.0),
    fd("isiMaxMs", "ISI massimo", MS, 400.0, 4000.0, 100.0),
    fd("practiceTrials", "Trial di pratica", TRIAL, 0.0, 40.0, 1.0),
];

const fn section(
    test_key: &'static str,
    title: &'static str,
    fields: &'static [FieldDesc],
) -> SectionDesc {
    SectionDesc {
        test_key,
        title,
        fields,
    }
}

pub const PARAM_SECTIONS: &[SectionDesc] = &[
    section("stroop1", "Stroop 1 — Focus Parola", STROOP_FIELDS),
    section("stroop2", "Stroop 2 — Focus Colore", STROOP_FIELDS),
    section("gonogo", "Go / No-Go", GONOGO_FIELDS),
    section("corsi", "Corsi Block Task", CORSI_FIELDS),
    section("nback", "N-Back (2-back)", NBACK_FIELDS),
    section("wcst", "Wisconsin Card Sorting Test", WCST_FIELDS),
    section("pvt", "PVT — Vigilanza Psicomotoria", PVT_FIELDS),
    section("flanker", "Flanker — Frecce di Eriksen", FLANKER_FIELDS),
    section(
        "sart",
        "SART — Attenzione sostenuta alla risposta",
        SART_FIELDS,
    ),
    section(
        "visualSearch",
        "Visual Search — Ricerca visiva",
        VISUAL_SEARCH_FIELDS,
    ),
    section(
        "mentalRotation",
        "Mental Rotation — Rotazione mentale",
        MENTAL_ROTATION_FIELDS,
    ),
    section("trailMaking", "Trail Making A/B", TRAIL_MAKING_FIELDS),
];

/// Sezione dei parametri per un dato test (chiave di `AllParams`).
pub fn param_section_for(test_key: &str) -> Option<&'static SectionDesc> {
    PARAM_SECTIONS.iter().find(|s| s.test_key == test_key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn params(v: Value) -> Map<String, Value> {
        v.as_object().cloned().unwrap()
    }

    #[test]
    fn should_follow_nback_level() {
        assert!(nback_instruction(1.0).key_hints[0].contains("1 passo fa"));
        assert!(nback_instruction(1.0).paragraphs[1].contains("UNA posizione"));
        assert!(nback_instruction(3.0).key_hints[0].contains("3 passi fa"));
        assert_eq!(nback_instruction(3.0).title, "N-Back (3-back)");
    }

    #[test]
    fn should_fall_back_to_two_back_on_invalid_level() {
        assert_eq!(nback_instruction(f64::NAN).title, "N-Back (2-back)");
        assert_eq!(nback_instruction(7.0).title, "N-Back (2-back)");
        assert_eq!(nback_instruction(1.5).title, "N-Back (2-back)");
    }

    #[test]
    fn should_follow_sart_target_digit() {
        assert!(sart_instruction(7.0).paragraphs[1].contains("TRANNE al 7"));
        assert_eq!(sart_instruction(7.0).key_hints[1], "Nessun tasto = 7");
    }

    #[test]
    fn should_fall_back_to_three_on_invalid_sart_digit() {
        assert_eq!(sart_instruction(f64::NAN).key_hints[1], "Nessun tasto = 3");
        assert_eq!(sart_instruction(12.0).key_hints[1], "Nessun tasto = 3");
    }

    #[test]
    fn should_adapt_instructions_to_params_only_for_nback_and_sart() {
        let p = params(json!({ "n": 3, "targetDigit": 5 }));
        assert_eq!(
            instructions_for(TestId::Nback, Some(&p)).title,
            "N-Back (3-back)"
        );
        assert_eq!(
            instructions_for(TestId::Nback, None).title,
            "N-Back (2-back)"
        );
        assert_eq!(
            instructions_for(TestId::Sart, Some(&p)).key_hints[1],
            "Nessun tasto = 5"
        );
        assert_eq!(
            instructions_for(TestId::Flanker, Some(&p)),
            instructions_for(TestId::Flanker, None)
        );
    }

    #[test]
    fn should_have_titles_paragraphs_and_hints_for_every_catalog_test() {
        for m in TEST_CATALOG {
            let i = instructions_for(m.id, None);
            assert!(
                !i.title.is_empty() && i.paragraphs.len() == 3 && !i.key_hints.is_empty(),
                "{}",
                m.id
            );
        }
    }

    #[test]
    fn should_list_twelve_unique_catalog_tests_with_ts_titles() {
        assert_eq!(TEST_CATALOG.len(), 12);
        for (i, m) in TEST_CATALOG.iter().enumerate() {
            assert!(TEST_CATALOG[..i].iter().all(|o| o.id != m.id));
        }
        assert_eq!(
            meta_for(TestId::Sart).unwrap().domain,
            "Controllo attentivo"
        );
        assert_eq!(
            meta_for(TestId::Stroop1).unwrap().title,
            "Stroop 1 — Focus Parola"
        );
        assert_eq!(
            meta_for(TestId::TrailMaking).unwrap().domain,
            "Flessibilità e velocità visuo-motoria"
        );
    }

    #[test]
    fn should_return_focus_with_regions_and_task() {
        assert_eq!(focus_for(TestId::VisualSearch).regions, &[1, 3]);
        assert_eq!(
            focus_for(TestId::VisualSearch).region_label,
            "Parieto-occipitale"
        );
        assert_eq!(focus_for(TestId::Nback).regions, &[0, 1]);
        for m in TEST_CATALOG {
            assert!(!focus_for(m.id).task.is_empty(), "{}", m.id);
        }
    }

    #[test]
    fn should_describe_params_with_valid_ranges_for_every_test() {
        assert_eq!(PARAM_SECTIONS.len(), 12);
        for s in PARAM_SECTIONS {
            assert!(!s.fields.is_empty());
            for f in s.fields {
                assert!(f.min < f.max && f.step > 0.0, "{}.{}", s.test_key, f.key);
            }
        }
        let sart = param_section_for("sart").unwrap();
        let digit = sart.fields.iter().find(|f| f.key == "targetDigit").unwrap();
        assert_eq!((digit.min, digit.max, digit.unit), (1.0, 9.0, None));
        assert!(param_section_for("nope").is_none());
    }
}

#[cfg(test)]
mod defaults_tests {
    use super::*;
    use sintropia_engines::defaults::all_params;

    #[test]
    fn should_have_defaults_inside_every_param_section_range() {
        let json = serde_json::to_value(all_params()).unwrap();
        for section in PARAM_SECTIONS {
            let params = &json[section.test_key];
            for f in section.fields {
                let v = params[f.key]
                    .as_f64()
                    .unwrap_or_else(|| panic!("{}.{} assente", section.test_key, f.key));
                assert!(
                    v >= f.min && v <= f.max,
                    "{}.{} = {v} fuori da [{}, {}]",
                    section.test_key,
                    f.key,
                    f.min,
                    f.max
                );
            }
        }
    }
}
