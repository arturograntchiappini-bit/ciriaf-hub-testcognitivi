# Architettura del codice — Sintropia - Cognitive tests Hub

> Documento ufficiale di spiegazione del funzionamento del codice. In italiano.
> Aggiornato insieme al codice (documentation gate per fase).

Questo documento spiega **come è fatta** la piattaforma e **come funzionano i
meccanismi dei test**. Per il razionale scientifico di ciascun test vedi
`docs/scientific/`.

---

## 1. Principio: due strati separati

```
┌─────────────────────────────────────────────────────────────┐
│  UI (React)   — navigazione, schermate, rendering stimoli     │
│  src/ui/                                                       │
└───────────────▲───────────────────────────────────────────────┘
                │ consuma (nessuna dipendenza inversa)
┌───────────────┴───────────────────────────────────────────────┐
│  MOTORE (TypeScript puro) — zero import da React               │
│  src/engine/  — timing, generatori, validazione, scoring       │
└───────────────────────────────────────────────────────────────┘
```

- Il **motore** (`src/engine/`) non importa mai React. Contiene la logica pura:
  generazione delle sequenze, validazione dei tempi di reazione, calcolo delle
  metriche, export. È interamente unit-testato (Vitest) senza browser.
- La **UI** (`src/ui/`) è un guscio sottile che naviga tra schermate e disegna
  gli stimoli. Durante i trial il timing è gestito fuori dal ciclo di re-render.

Perché: la correttezza scientifica vive nel motore, dove può essere verificata in
isolamento; la UI resta sostituibile e collaudabile a parte.

---

## 2. Struttura delle cartelle

```
src/
  engine/
    types.ts          Tipi condivisi (TrialResult, TestResult, ValidationFlag…)
    clock.ts          Cronometro e scheduler astratti (iniettabili nei test)
    rng.ts            Generatore pseudo-casuale deterministico (mulberry32)
    validation.ts     Filtri RT (anticipazione/omissione), SD, aggregazioni
    session.ts        ID di sessione anonimo (XXXX-HHMM)
    export.ts         Serializzazione CSV (';') e JSON
    tests/
      stroop.ts       Generatore + scorer Stroop 1/2
      gonogo.ts       Generatore + scorer Go/No-Go
      corsi.ts        Geometria, sequenze bilanciate, span, regola d'arresto
      nback.ts        Generatore, d' (loglinear), scorer con quartili
      wcst.ts         Mazzo, matching, cambio regola, scoring di Heaton
      pvt.ts          Generatore + scorer PVT (attenzione sostenuta)
      flanker.ts      Generatore + scorer Flanker (interferenza, adattamento al conflitto)
      sart.ts         Generatore + scorer SART (commissioni, d', RT prima dell'errore)
  config/
    defaults.ts       Parametri default, ognuno con la fonte scientifica
  ui/
    theme.ts          Token colore (UI vs stimoli, tenuti separati)
    router.ts         Rotte a stato + catalogo dei test
    storage.ts        Persistenza impostazioni (localStorage, merge sui default)
    download.ts       Download di file (Blob + anchor)
    content/instructions.ts   Testi istruzioni + mappa tasti (IT)
    components/       Button, Header, TestCard
    runtime/
      sequencer.ts    Macchina a stati dei test a tempo di reazione
      RtTestRunner.tsx Orchestrazione pratica→countdown→test + tastiera/interruzioni
      StimulusStage.tsx Palcoscenico a tutto schermo per gli stimoli
    tests/
      StroopView.tsx / GoNoGoView.tsx / NBackView.tsx / PvtView.tsx   (usano il sequencer)
      CorsiView.tsx / WcstView.tsx / WcstCard.tsx        (interazione a click)
    screens/          Home, Instructions, TestRunner, Results, Settings
    science/          Paper scientifici in piattaforma: papers.ts (registro), markdown.ts (parser puro),
                      MarkdownView.tsx (rendering React, formule con KaTeX in MathML), Science.tsx (indice e lettore)
```

---

## 3. Il ciclo di un trial a tempo di reazione

I test Stroop, Go/No-Go e N-Back condividono la stessa macchina a stati:
`src/ui/runtime/sequencer.ts`. Le fasi di un trial:

```
 fixation ──► stimulus ──► (blank) ──► [feedback] ──► isi ──► trial successivo
   (opz.)      onset↑        (opz.)      (solo pratica)
```

- **onset**: l'istante di comparsa dello stimolo è preso *al paint* del frame,
  tramite `scheduler.afterPaint(...)`. È il riferimento zero del cronometro.
- **risposta**: un listener globale `keydown` legge `performance.now()` e calcola
  `rt = now − onset`. Nessun re-render di React sta tra onset e risposta: lo
  stimolo è statico, quindi il tempo misurato non è inquinato dal rendering.
- **finestra di risposta** (`responseWindowMs`) può essere più lunga della
  visibilità dello stimolo (`stimulusVisibleMs`): è il caso dell'N-Back, dove la
  lettera resta 500 ms ma si risponde per tutti i 2000 ms del trial.
- **una sola risposta per trial**; l'auto-repeat della tastiera (`event.repeat`)
  è ignorato.

Il `clock` e lo `scheduler` sono **iniettabili**: in produzione usano
`performance.now()` e `requestAnimationFrame`/`setTimeout`; nei test si usa un
ambiente finto che avanza il tempo a mano (vedi `sequencer.test.ts`). Così la
logica di timing è verificabile in modo deterministico.

### Casi limite gestiti

- Perdita di focus/visibilità (`blur`, `visibilitychange`) durante un trial →
  flag `INTERRUPTED`.
- `Esc` → pausa con possibilità di **riprendere**, **uscire esportando i dati
  parziali** o **uscire senza salvare**. La ripresa ricrea il sequencer sui trial
  rimanenti (i risultati vengono reindicizzati in modo continuo).
- Fullscreen richiesto all'avvio del test.

---

## 4. Validazione automatica dei dati

`src/engine/validation.ts` — applicata uniformemente. Precedenza dei flag:

```
INTERRUPTED  →  OMISSION  →  ANTICIPATION  →  VALID
```

- `rt < 150 ms` (con risposta) → **ANTICIPATION** (riflesso/anticipazione, non
  cognizione — vedi `docs/scientific/validazione-rt.md`).
- Nessuna risposta entro la finestra, quando una risposta era attesa → **OMISSION**.
  Per i trial in cui trattenere è corretto (No-Go, non-target dell'N-Back), la
  mancata risposta è invece **VALID** (corretto rifiuto).
- La **deviazione standard** riportata è quella campionaria (n−1) dei soli RT
  `VALID` e corretti: misura la stabilità della performance nel tempo.

I trial invalidati **non vengono mai scartati**: restano nei dati grezzi
(CSV/JSON) col loro flag, così i criteri di pulizia restano rivedibili a posteriori.

---

## 5. I test interattivi (Corsi e WCST)

Non sono compiti a tempo di reazione: hanno logica dedicata.

- **Corsi** (`CorsiView.tsx`): layout fisso di 9 blocchi (coordinate di
  Kessels/PEBL in `corsi.ts`). Ogni trial illumina una sequenza, poi il soggetto
  la riproduce cliccando. È **adattivo**: 2 trial per livello, arresto se entrambi
  falliti; span = 0.5 punti per trial superato. Le due sequenze di uno stesso
  livello hanno la **stessa complessità** (uguale numero di incroci geometrici e
  distanza totale del percorso entro tolleranza), garantita dal generatore
  `generateBalancedSequences`.
- **WCST** (`WcstView.tsx`): il soggetto abbina la carta a una delle 4 carte
  stimolo. Il criterio (Colore→Forma→Numero, ciclico) cambia **in segreto** dopo
  N corrette consecutive. Lo scoring di Heaton (categorie, errori perseverativi,
  failure to maintain set) è in `scoreWcst`; il runtime fornisce, per ogni trial,
  la regola attiva e le dimensioni combacianti (`WcstTrialMeta`).

---

## 6. Come aggiungere un nuovo test

1. Nel motore (`src/engine/tests/`): scrivi generatore puro + scorer puro + test
   unitari. Non importare React.
2. Aggiungi i parametri di default in `src/config/defaults.ts` con la fonte.
3. Scrivi il paper in `docs/scientific/<nuovo>.md` e registralo in
   `src/ui/science/papers.ts`: il paper compare in piattaforma («Fondamenti
   scientifici») e un test del repository fallisce se un test del catalogo non ne ha uno.
4. Nella UI: se è un test a tempo di reazione, crea una vista che costruisce un
   `RtTestPlan` (come `StroopView`); altrimenti scrivi una vista interattiva
   dedicata. Aggiungila a `TestRunner.tsx`, `router.ts` (catalogo) e
   `content/instructions.ts`.
5. Aggiorna questo documento.

---

## 7. Identità visiva

- Sfondo bianco `#FFFFFF`, testo nero `#111111`, accento azzurrino `#4A90D9`
  (superficie tenue `#EAF2FB`). L'accento è usato **solo** per rifiniture.
- I **colori funzionali** (verde/rosso Go-No-Go, colori Stroop) vivono in
  `STIMULUS_COLORS` e non compaiono mai come colori dell'interfaccia, per non
  confondersi con gli stimoli.
- Tipografia: Inter (self-hosted, nessun CDN esterno), gerarchia per peso.
- I token sono centralizzati (`tailwind.config.js`, `src/index.css`, `theme.ts`):
  un futuro allineamento al brand Sintropia è una singola modifica.

---

## 8. Sessione, export e privacy

- Esecuzione **anonima**: nessun account, nessun database. Ogni somministrazione
  genera un ID `XXXX-HHMM` (`session.ts`) mostrato a schermo e incluso negli
  export, per ricollegare la trascrizione manuale al file grezzo.
- **CSV** (separatore `;`): una riga per trial, pratica inclusa e marcata, con i
  flag di validazione. **JSON**: parametri usati, metadati d'ambiente e tutti i
  trial. I nomi file: `{test}_{sessionId}_{data-ora}.{csv|json}`.
- I parametri effettivi sono scritti **dentro** ogni file: un risultato resta
  interpretabile anche se le impostazioni cambiano nel tempo.

---

## 9. Modalità Sessione

Un protocollo cronometrico: si sceglie **prima la durata totale**, poi le **fasi**
(ciascuna con una durata: tassellano la timeline in ordine), poi i **pin "t"**
dentro le fasi. A ogni "t" si somministra una **batteria** di test selezionati,
con impostazioni congelate per quella "t". Il tutto è visualizzato su una **linea
temporale**.

### Motore (puro, testato) — `src/engine/session/`

- `model.ts` — tipi (`SessionTemplate` con `totalMs`, `SessionPhase` con
  `durationMs`, `TimePin` con `offsetMs` assoluto, `BatteryItem`, `SessionRun`,
  `SessionTestResult`) e funzioni pure:
  - `phaseSpans` / `phaseAtElapsed`: intervalli delle fasi e fase del tempo trascorso;
  - `flattenPins` / `sessionTotalMs`;
  - `computeSessionState(template, elapsedMs, completedPinIds)`: stato derivato
    (fase corrente dal tempo trascorso, prossimo pin, countdown, sforo, fine);
  - `makeRunId` (`S-XXXX-HHMM`).
- `export.ts` — `toSessionJson` (protocollo + tutti i risultati con contesto) e
  `toSessionCsv` (una riga per trial di qualsiasi test, con colonne di contesto
  `fase; t_offset_ms; test; indice_batteria; run_id; …`). Riusa `engine/export.ts`.

### Runtime (UI) — `src/ui/session/`

- Il timing **di sessione** usa l'**orologio reale** (`Date.now()`): `elapsed =
  now − startedAtEpoch`. Il tempo a browser chiuso conta (protocollo ancorato al
  tempo); alla riapertura, un pin già scaduto e non eseguito è "dovuto" e parte
  subito l'alert. Il timing **dentro un test** resta invariato (`performance.now`).
- `SessionRunner` orchestra attesa → batteria → fine, persistendo il run a ogni
  passo (ripresa possibile). `WaitScreen` mostra fase, avanzamento e countdown;
  allo scadere alert visivo + sonoro (`alert.ts`). `BatteryReady` precede ogni
  test; `TestHost` monta la vista giusta (riusata anche da `TestRunner`).
- `SessionBuilder` + `SessionTimeline`: costruttore (totale → fasi → pin) con
  **linea temporale interattiva**. I pin si **trascinano** lungo la barra con
  **aggancio magnetico** (passo di 5 min, adattivo per sessioni brevi) e possono
  **cambiare fase** trascinandoli oltre il confine; un **clic sul vuoto** crea un
  pin lì. Le durate hanno un campo **ore : minuti : secondi** riutilizzabile
  (`DurationInput`) e un pulsante «Riparti durate equamente»; l'offset del pin è
  editabile **relativo alla fase** (nessuna aritmetica per l'operatore). Righe
  di fase/pin compatte e collassabili. Validazione (durate, pin dentro la fascia).
  `storage.ts` persiste modelli e run e importa/esporta il protocollo JSON.
- I pin hanno `offsetMs` **assoluto** dall'inizio sessione; il builder li vincola
  alla fascia temporale della loro fase. Helper puri nel modello:
  `phaseIndexAtOffset`, `movePin`/`movePinById` (riattacco alla fase corretta,
  per id stabile durante il drag), `distributePhasesEvenly`.

### Riuso dei test

Le viste dei test sono usate senza modifiche, tramite `TestHost`; l'unica
aggiunta è la prop `practice?` per saltare la pratica in sessione. Ogni
`TestResult` viene etichettato con il contesto (fase, t, indice) in un
`SessionTestResult`.

---

## 10. Motori in Rust e app desktop

Accanto alla web app c'è un workspace Rust in `desktop/` (dettagli operativi in `desktop/README.md`). L'obiettivo è **un solo
motore dei test**, in Rust: usato nativamente dall'app desktop e, in seguito, dalla web app compilato in WebAssembly.

```
src/engine/  (TypeScript)  ── oracolo ──►  desktop/fixtures/  ◄── riprodotte da ──  desktop/crates/engines (Rust)
                                              golden · fuzz · evidence
```

| Crate | Ruolo |
|---|---|
| `sintropia-core` | tipi (serde camelCase), RNG `mulberry32` identico al TS, validazione RT, SDT, sequencer con `Clock`/`Scheduler` iniettati, export, sessioni, `ENGINE_VERSION` |
| `sintropia-engines` | un modulo **puro** per test, parametri di default, regressione; compila per `wasm32-unknown-unknown` |
| `sintropia-content` | catalogo, istruzioni, sezioni dei parametri: dati di UI, separati perché i motori non dipendano dall'interfaccia |
| `sintropia-desktop` | GUI eframe/egui (backend wgpu): dashboard, istruzioni, test a tutta finestra, risultati/export, impostazioni, sessione, paper |

Regole che valgono per il Rust:

- **Purezza.** I motori non fanno I/O, non leggono l'orologio, non usano thread. Il tempo entra solo dal sequencer
  (`SystemClock` nell'app, `FakeEnv` nei test).
- **Il TS è la specifica.** `src/engine/**` non si modifica per la migrazione. Le fixture golden
  (`desktop/tools/golden/*.mjs` → `desktop/fixtures/<test>.json`) e il fuzz differenziale (`desktop/tools/fuzz`) lo eseguono e il Rust
  deve riprodurle: sequenze, conteggi e ordini esattamente uguali, float entro `1e-9` (`FLOAT_TOLERANCE`, un solo punto).
- **I difetti si correggono in entrambi i motori.** Quelli trovati dal confronto sono registrati in `desktop/fixtures/DIVERGENZE.md` e nel paper
  `docs/scientific/migrazione-rust.md`; sono corretti nel TS e nel Rust (`ENGINE_VERSION` 0.2.0) e le fixture rigenerate: nessuna `expectedDivergence` residua.
- **Evidenze.** `desktop/fixtures/evidence/*.json` (scritte con `SINTROPIA_WRITE_EVIDENCE=1`) e `BENCHMARK.md` sono la fonte dei numeri del paper.

I contenuti scientifici (paper) sono gli stessi file di `docs/scientific/`, incorporati nell'app desktop a tempo di compilazione.

### Distribuzione dell'app

`desktop/installer/` produce `Sintropia-Setup-x64.msi` (WiX 5, per utente, senza UAC), `Sintropia-Desktop-x64.zip` e `SHA256SUMS.txt`;
`publish-to-site.ps1` li copia in `public/download/` (e `scripts/install.ps1` in `public/`), serviti da Netlify con le intestazioni di
`public/_headers`. La home web linka `./download/Sintropia-Setup-x64.msi` (`src/ui/home/DesktopDownload.tsx`). L'eseguibile non è ancora firmato: `build-installer.ps1` firma exe e MSI se è impostata `SINTROPIA_SIGN_COMMAND` (vedi `docs/sicurezza.md`).

## 11. Sicurezza

Il sito è statico e senza backend: i confini di fiducia sono i dati salvati, i file importati e i file esportati. Regole che il codice rispetta:

- **Mai fidarsi di ciò che torna dal disco.** `localStorage`, `settings.json` e i protocolli importati passano da `sanitizeParams` (web, `src/ui/params/sanitize.ts`)
  e `sanitize_params` (Rust, `desktop/crates/app/src/data.rs`): solo chiavi note, numeri finiti, valori entro i limiti di `PARAM_SECTIONS`.
  I modelli di sessione importati hanno parser strutturale con limiti di dimensione e di numero di elementi (`src/ui/session/storage.ts`).
- **Export sicuri.** Le celle CSV che iniziano come una formula sono neutralizzate (TS `csvField`, Rust `csv_field`); il report HTML ha tutto escapato e una CSP propria; i nomi file passano da `safeFilename`.
- **Desktop.** Nessun processo esterno, `forbid(unsafe_code)` nei crate `core`/`engines`/`content`, letture con tetto (`read_text_capped`), scritture atomiche (`write_atomic`) in `fsutil.rs`.
- **Distribuzione.** CSP e intestazioni in `public/_headers`; `install.ps1` solo HTTPS con controllo anti zip-slip; CI (`.github/workflows/ci.yml`) e release con azioni fissate per SHA e attestazione di provenienza.

Politica di segnalazione: [`SECURITY.md`](../SECURITY.md). Esiti della revisione e residui: [`sicurezza.md`](sicurezza.md).
