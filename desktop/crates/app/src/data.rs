//! Catalogo, default, sezioni dei parametri e istruzioni.
//!
//! Sostituibile con `sintropia_engines::{catalog, defaults}` quando saranno popolati: basta
//! riesporre qui le stesse funzioni. `assets/data.json` è generato dai sorgenti TypeScript
//! (`PARAM_SECTIONS`, `DEFAULTS`, `INSTRUCTIONS`) così i valori restano fedeli alla web app.
use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde::Deserialize;
use sintropia_core::TestId;

#[derive(Debug, Clone, Copy)]
pub struct TestMeta {
    pub id: TestId,
    pub title: &'static str,
    pub domain: &'static str,
    /// Descrizione del compito (da `testFocus.ts`).
    pub task: &'static str,
}

const fn meta(
    id: TestId,
    title: &'static str,
    domain: &'static str,
    task: &'static str,
) -> TestMeta {
    TestMeta {
        id,
        title,
        domain,
        task,
    }
}

/// Catalogo dei test eseguibili (`TEST_CATALOG` di `router.ts`).
pub const TEST_CATALOG: [TestMeta; 11] = [
    meta(
        TestId::Stroop1,
        "Stroop 1 — Focus Parola",
        "Velocità di elaborazione",
        "Leggi la parola e ignora il colore dell’inchiostro.",
    ),
    meta(
        TestId::Stroop2,
        "Stroop 2 — Focus Colore",
        "Risoluzione del conflitto",
        "Nomina il colore dell’inchiostro e sopprimi la lettura.",
    ),
    meta(
        TestId::Gonogo,
        "Go / No-Go",
        "Inibizione motoria rapida",
        "Rispondi ai Go, trattieniti sui No-Go.",
    ),
    meta(
        TestId::Corsi,
        "Corsi Block Task",
        "Memoria visuo-spaziale",
        "Riproduci la sequenza dei blocchi illuminati.",
    ),
    meta(
        TestId::Nback,
        "N-Back (2-back)",
        "Memoria di lavoro",
        "Di’ se lo stimolo coincide con quello di due posizioni prima.",
    ),
    meta(
        TestId::Wcst,
        "Wisconsin Card Sorting Test",
        "Flessibilità cognitiva",
        "Deduci la regola di smistamento e cambiala quando cambia.",
    ),
    meta(
        TestId::Pvt,
        "PVT — Vigilanza Psicomotoria",
        "Attenzione sostenuta",
        "Rispondi appena compare lo stimolo, a intervalli imprevedibili.",
    ),
    meta(
        TestId::Flanker,
        "Flanker — Frecce di Eriksen",
        "Attenzione selettiva",
        "Rispondi alla freccia centrale e ignora quelle ai lati.",
    ),
    meta(
        TestId::VisualSearch,
        "Visual Search — Ricerca visiva",
        "Attenzione visiva",
        "Trova il cerchio arancione tra i distrattori, o dì che non c’è.",
    ),
    meta(
        TestId::MentalRotation,
        "Mental Rotation — Rotazione mentale",
        "Cognizione spaziale",
        "Stabilisci se due figure a blocchi sono la stessa, solo ruotata, o speculari.",
    ),
    meta(
        TestId::Sart,
        "SART — Attenzione sostenuta alla risposta",
        "Controllo attentivo",
        "Premi a ogni cifra, tranne a una: trattieniti quando compare.",
    ),
];

#[derive(Debug, Clone, Deserialize)]
pub struct FieldDesc {
    pub key: String,
    pub label: String,
    #[serde(default)]
    pub unit: Option<String>,
    pub min: f64,
    pub max: f64,
    #[serde(default)]
    pub step: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionDesc {
    pub test_key: String,
    pub title: String,
    pub fields: Vec<FieldDesc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Instruction {
    pub title: String,
    pub paragraphs: Vec<String>,
    pub key_hints: Vec<String>,
}

#[derive(Deserialize)]
struct Data {
    sections: Vec<SectionDesc>,
    defaults: BTreeMap<String, BTreeMap<String, f64>>,
    instructions: BTreeMap<String, Instruction>,
}

fn data() -> &'static Data {
    static DATA: OnceLock<Data> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!("../assets/data.json"))
            .expect("assets/data.json è incorporato e validato dai test")
    })
}

pub fn param_sections() -> &'static [SectionDesc] {
    &data().sections
}

/// Parametri di default di un test (chiave = `TestId::as_str`).
pub fn default_params(test_key: &str) -> BTreeMap<String, f64> {
    data().defaults.get(test_key).cloned().unwrap_or_default()
}

/// Istruzioni di un test, adattate ai parametri (livello n dell'N-Back, cifra bersaglio del SART).
pub fn instructions_for(id: TestId, params: &BTreeMap<String, f64>) -> Option<Instruction> {
    match id {
        TestId::Nback => Some(nback_instruction(params.get("n").copied().unwrap_or(2.0))),
        TestId::Sart => Some(sart_instruction(
            params.get("targetDigit").copied().unwrap_or(3.0),
        )),
        _ => data().instructions.get(id.as_str()).cloned(),
    }
}

fn level_in(value: f64, min: f64, max: f64, fallback: u32) -> u32 {
    if value.fract() == 0.0 && value >= min && value <= max {
        value as u32
    } else {
        fallback
    }
}

fn nback_instruction(n: f64) -> Instruction {
    let level = level_in(n, 1.0, 3.0, 2);
    let position = ["", "UNA posizione", "DUE posizioni", "TRE posizioni"][level as usize];
    let steps = if level == 1 {
        "1 passo fa".to_string()
    } else {
        format!("{level} passi fa")
    };
    Instruction {
        title: format!("N-Back ({level}-back)"),
        paragraphs: vec![
            "Vedrai una sequenza continua di lettere, una alla volta.".into(),
            format!("Premi la BARRA SPAZIATRICE quando la lettera attuale è identica a quella comparsa {position} prima."),
            "Non premere nulla in tutti gli altri casi. Il test è lungo: mantieni la concentrazione.".into(),
        ],
        key_hints: vec![format!("BARRA SPAZIATRICE = la lettera è uguale a {steps}")],
    }
}

fn sart_instruction(digit: f64) -> Instruction {
    let target = level_in(digit, 1.0, 9.0, 3);
    Instruction {
        title: "SART — Attenzione sostenuta alla risposta".into(),
        paragraphs: vec![
            "Sullo schermo compariranno cifre da 1 a 9, una alla volta, ciascuna seguita da un cerchio barrato.".into(),
            format!("Premi la BARRA SPAZIATRICE a ogni cifra TRANNE al {target}: quando compare il {target}, non premere nulla."),
            "Rispondi in fretta ma con attenzione: gli errori sul bersaglio sono la misura principale. Il test dura circa 4–5 minuti.".into(),
        ],
        key_hints: vec![
            format!("BARRA SPAZIATRICE = qualsiasi cifra tranne il {target}"),
            format!("Nessun tasto = {target}"),
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_provide_sections_defaults_and_instructions_for_every_catalog_test() {
        for m in TEST_CATALOG {
            let key = m.id.as_str();
            assert!(
                param_sections().iter().any(|s| s.test_key == key),
                "sezione {key}"
            );
            assert!(!default_params(key).is_empty(), "default {key}");
            assert!(
                instructions_for(m.id, &default_params(key)).is_some(),
                "istruzioni {key}"
            );
        }
    }

    #[test]
    fn should_adapt_sart_instruction_to_target_digit() {
        let mut p = default_params("sart");
        p.insert("targetDigit".into(), 7.0);
        let i = instructions_for(TestId::Sart, &p).unwrap();
        assert!(i.key_hints[0].ends_with("tranne il 7"));
    }

    #[test]
    fn should_fall_back_to_two_back_when_level_is_invalid() {
        assert_eq!(nback_instruction(9.0).title, "N-Back (2-back)");
        assert_eq!(
            nback_instruction(1.0).key_hints[0],
            "BARRA SPAZIATRICE = la lettera è uguale a 1 passo fa"
        );
    }
}
