# Sintropia Desktop — brief del team di sviluppo

Obiettivo: applicazione desktop **100% Rust** (Windows 11, MSVC, `cargo` in `C:\Users\artur\.cargo\bin`, da aggiungere al PATH:
`export PATH="$PATH:/c/Users/artur/.cargo/bin"`) della **dashboard tecnica** di Sintropia — Cognitive tests Hub: stessi motori, stessi
test, stessa estetica e palette della web app, **senza** la presentazione cinematica della homepage (niente hero 3D, niente cervello a
particelle, niente scroll narrativo): si apre direttamente su una dashboard sobria (catalogo test, sessione, paper, impostazioni).

La web app (TypeScript) è la **specifica di riferimento** e resta dove sta: `src/engine/**` (motori puri), `src/config/defaults.ts`,
`src/ui/**` (viste), `docs/scientific/*.md` (paper). **Non modificare nulla fuori da `desktop/`.** Porta il comportamento in modo
fedele (stessi parametri di default, stessi nomi delle metriche in italiano, stesse etichette di condizione, stesso RNG mulberry32 a
seme così che a parità di seme la sequenza sia identica a quella TS). Ogni port va accompagnato da test unitari (`cargo test`).

## Workspace (`desktop/`)

- `crates/core` (`sintropia-core`): tipi condivisi (`TestId`, `TrialResult`, `SummaryMetric`, `TestResult`, `ValidationFlag`, `Phase`),
  `rng` (mulberry32, shuffle, rand_int, pick), `validation` (mean, standard_deviation, count_flag, classify_rt,
  ANTICIPATION_CUTOFF_MS=150), `sdt` (probit, d_prime, criterion_c), `sequencer` (macchina a stati dei trial a tempo di reazione,
  con clock/scheduler iniettabili: porta `src/ui/runtime/sequencer.ts`), `export` (CSV `;` e internazionale, riepilogo, eventi TSV
  BIDS-like, JSON, report HTML: porta `src/engine/export.ts` e `exportFormats.ts`), `session` (modello di sessione/batteria come
  `src/engine/session`).
- `crates/engines` (`sintropia-engines`): un modulo per test: `stroop`, `gonogo`, `flanker`, `sart`, `pvt`, `corsi`, `nback`, `wcst`
  (e poi `visual_search`, `mental_rotation`, `trail_making`), più `defaults` (porta `src/config/defaults.ts`) e `catalog`
  (porta `TEST_CATALOG` di `src/ui/router.ts` + `instructions` di `src/ui/content/instructions.ts`).
- `crates/app` (`sintropia-desktop`): GUI con **eframe/egui** (scelta di progetto: pura Rust, nessun runtime web). Tema scuro con la
  palette sotto; area stimoli bianca (`theme-stimulus`).

## Palette (da `src/index.css`, RGB)

Scuro: ink 225,231,239 · paper 10,14,26 · surface 17,24,39 · elevated 26,37,56 · accent 74,144,217 · accent-soft 19,34,56 ·
accent-glow 107,181,255 · line 30,39,64 · muted 136,146,164 · danger 255,107,107.
Area stimoli (chiara): ink 17,17,17 · paper 255,255,255 · surface 247,248,250 · elevated 238,241,245 · accent 31,95,168 ·
line 228,231,236 · muted 102,112,133 · danger 208,2,27.
Tipografia: titoli in maiuscolo condensati (Big Shoulders Display), mono JetBrains Mono per etichette, testo Inter — i file sono in
`node_modules/@fontsource/*` (usa i `.woff2`→ converti o cerca i `.ttf`; se non utilizzabili in egui, ripiega su font di sistema
ma mantieni maiuscolo + spaziatura per i titoli).

## Regole

- Rust stabile, `cargo fmt`, nessun `unsafe`, nessun `unwrap` in percorsi utente, errori espliciti. Commenti solo dove non ovvio, in italiano
  come nel resto del progetto. Nomi di test descrittivi (`should_...`).
- Ogni crate deve restare compilabile (`cargo build --workspace`, `cargo test --workspace`) da solo al termine del tuo lavoro.
- Lavora **solo nei file del tuo crate/modulo** indicati nel tuo compito, per non confliggere con gli altri agenti. Se ti serve un cambio
  nel contratto di `core`, descrivilo nel tuo report finale invece di modificarlo (a meno che il compito sia `core`).
- Niente commit/push: li fa l'orchestratore.
- Report finale: elenco dei file creati, API pubbliche, test passati (output di `cargo test`), eventuali deviazioni dal TS e perché.

## Convenzione API dei motori (crate `engines`, un file per test)

Ogni modulo `<test>.rs` espone, con gli stessi nomi del TS in snake_case: `Params` (struct, `Clone`, serde camelCase, con i default
in `defaults.rs` come `Default` o funzione `defaults::<test>()`), i tipi dello stimolo, `generate_<test>(&Params, &mut dyn FnMut() -> f64)
-> Vec<Stimulus>` (stesso comportamento del TS a parità di seme), eventuali helper pubblici (es. `conflict_adaptation`) e
`score_<test>(&[TrialResult]) -> Vec<SummaryMetric>` con le STESSE etichette italiane del TS. Stroop espone anche `correct_key_stroop` ecc.
Il crate `core` è già pronto (vedi i suoi moduli e test): usa `types`, `rng`, `validation`, `sdt`, `sequencer::FakeEnv`.
`defaults.rs`: `AllParams` (come in `src/config/defaults.ts`) + `DEFAULTS`/`fn all_params()`. `catalog.rs`: `TEST_CATALOG`
(`id`, `title`, `domain`), `focus` (regione e testo come `src/ui/home/testFocus.ts`), `instructions_for(test_id, &params_json)`
(porta `src/ui/content/instructions.ts`, incluse `nback_instruction` e `sart_instruction`) e `PARAM_SECTIONS` (porta
`src/ui/params/paramFields.ts`). Il file `regression.rs` porta `src/engine/regression.ts`.

---
## CORREZIONE DI DIREZIONE (ha la precedenza su tutto il resto del brief)

Obiettivo: UN SOLO motore dei test, in Rust, usato dall'app desktop (nativo) e in seguito dalla web app (WebAssembly). Il TypeScript
in `src/engine/**` è il RIFERIMENTO (oracolo) per verificare la migrazione; si ritirerà solo dopo che il Rust lo ha riprodotto. **Non modificare il TS.**

1. `sintropia-engines` (e `sintropia-core` per ciò che i motori usano) devono essere PURI: nessun I/O, orologio, thread, file, rete;
   nessuna dipendenza non compilabile per `wasm32-unknown-unknown`. Il tempo entra solo dal sequencer, mai dai motori. Niente `std::time`,
   `std::fs`, `println!` nei motori. (Il target wasm è installato; verifica con `cargo check -p sintropia-engines --target wasm32-unknown-unknown`.)
2. Criterio di accettazione = FIXTURE GOLDEN generate dal TS: per ogni test uno script Node in `desktop/tools/golden/` che importa i
   motori TS e, per un insieme fisso di semi e parametri, scrive `desktop/fixtures/<test>.json` (sequenze generate + metriche su trial
   sintetici). Il Rust le riproduce: sequenze, conteggi e ordini ESATTAMENTE uguali; float entro 1e-9 (tolleranza dichiarata in un unico
   punto, es. `engines/tests/common/mod.rs`). Un test Rust per fixture. Casi limite obbligatori: trial interrotti, omissioni, anticipazioni,
   liste vuote, nessuna commissione, meno di due punti per le regressioni. Un modulo non è finito finché il golden non passa.
3. `ENGINE_VERSION` (semver, in `sintropia-core`) scritto in ogni export.
4. Test property-based (proptest, dev-dependency) sugli invarianti: bilanciamento, nessuna ripetizione immediata, bersagli attesi, ISI nell'intervallo.
5. Dati di UI (catalogo, istruzioni, sezioni dei parametri, focus) in un crate SEPARATO `sintropia-content` (`desktop/crates/content`):
   i motori non dipendono dalla UI. I default dei parametri (`defaults.rs`) restano in `engines`.
6. Nei report: fixture generate, tolleranza, divergenze dal TS trovate (anche bug del TS: segnalali, non copiarli), esito di `cargo check` per WASM.
