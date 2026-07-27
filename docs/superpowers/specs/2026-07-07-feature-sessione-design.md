# Feature "Sessione" — Design

**Data:** 2026-07-07
**Stato:** Approvato in brainstorming (blocco 1) — blocco 2 incluso, esecuzione autonoma autorizzata
**Contesto:** Estensione della piattaforma CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub

---

## 1. Obiettivo

Aggiungere una modalità **Sessione**: un protocollo cronometrico in cui una
batteria di test viene somministrata a **istanti temporali "t" scelti liberamente**
(offset dall'inizio della sessione), raggruppati in **fasi nominabili**. Fuori dai
"t" il soggetto vede solo un timer con il punto della sessione e il conto alla
rovescia alla prossima batteria; allo scadere parte un alert e il soggetto avvia i
test. A fine sessione si esportano i **file di sessione** (JSON + CSV combinato)
con tutti i risultati organizzati per fase/t/test.

La modalità Sessione **coesiste** con l'uso ad-hoc dei singoli test (invariato).

---

## 2. Modello dati

Tutti i tipi vivono nel motore puro (`src/engine/session/model.ts`).

```typescript
interface SessionTemplate {
  id: string;
  name: string;
  createdAt: string;      // ISO
  phases: SessionPhase[];
}

interface SessionPhase {
  id: string;
  name: string;           // es. "Baseline", "Sotto carico"
  pins: TimePin[];
}

interface TimePin {
  id: string;
  offsetMs: number;       // offset ASSOLUTO dall'inizio sessione, scelto liberamente
  label?: string;
  battery: BatteryItem[]; // test da somministrare in sequenza (>=1)
}

interface BatteryItem {
  testId: TestId;
  params: Record<string, unknown>; // impostazioni CONGELATE per questa t
  practice: boolean;               // default false in sessione
}
```

- Le "t" sono **arbitrarie**: qualunque offset in min:sec deciso in costruzione.
- A ogni "t" si sceglie **quali** test (sottoinsieme dei 6), in che **ordine**, con
  quali **impostazioni** (per quella specifica t). Lo stesso test può comparire in
  più "t" con parametri diversi (misure ripetute).
- Le **fasi** sono contenitori nominati; l'ordine temporale effettivo è dato dai
  pin appiattiti e ordinati per `offsetMs`.

### Record di esecuzione (persistito)

```typescript
interface SessionRun {
  runId: string;              // anonimo, es. "S-7K2Q-1430"
  template: SessionTemplate;  // copia congelata del protocollo usato
  startedAtEpoch: number;     // Date.now() all'avvio (ancora dell'orologio reale)
  startedAtIso: string;
  completedPinIds: string[];  // pin le cui batterie sono concluse
  results: SessionTestResult[];
  finished: boolean;
}

interface SessionTestResult {
  phaseId: string;
  phaseName: string;
  pinId: string;
  offsetMs: number;
  indexInBattery: number;
  result: TestResult;         // il TestResult esistente, invariato
}
```

### Funzioni pure (unit-testate) in `model.ts`

- `flattenPins(template): { phase, pin }[]` ordinati per `offsetMs`.
- `sessionTotalMs(template)`: offset dell'ultimo pin (durata di riferimento della timeline).
- `computeSessionState(template, elapsedMs, completedPinIds)` → stato derivato:
  `{ currentPhaseName, nextPin | null, upcomingTests: TestId[], countdownMs, position: {index, total}, done }`.
  Gestisce: nessun pin ancora raggiunto, attesa, sforo (countdown ≤ 0 → batteria dovuta), fine.

Il tempo è **wall-clock**: `elapsedMs = Date.now() − startedAtEpoch`. Il tempo a
browser chiuso conta (protocollo ancorato al tempo reale). Un pin non viene mai
saltato: se al ritorno `elapsed ≥ offset` e la batteria non è stata eseguita, la
batteria è "dovuta" e parte l'alert immediatamente.

---

## 3. Costruttore (SessionBuilder)

Area dedicata, raggiungibile da una card **"Sessione"** in Home.

- **Nome** della sessione.
- **Fasi**: aggiungi / rinomina / riordina / elimina.
- Dentro una fase, **pin "t"**: aggiungi con `offset` (input min:sec) e ordina.
- Per ogni pin, **batteria**: multi-selezione dei 6 test in ordine; per ciascun
  test un editor delle impostazioni (riuso dei descrittori di `Settings`) + toggle
  **"includi pratica"** (default off).
- **Salvataggio come modello** riutilizzabile (localStorage) + **export/import**
  del protocollo come file JSON.
- Validazione: nome non vuoto; ≥1 fase; ogni pin con ≥1 test; offset non negativi;
  avviso (non blocco) se due pin hanno lo stesso offset.

I descrittori dei parametri (label, unità, min/max/step) oggi sono in `Settings.tsx`:
vengono **estratti** in un modulo condiviso (`src/ui/params/paramFields.ts`) così
che Settings e il builder li usino entrambi (DRY). Refactor mirato, senza cambiare
il comportamento di Settings.

---

## 4. Runtime (SessionRunner)

Orchestrazione a tempo reale.

- **Avvio**: genera `runId` anonimo, `startedAtEpoch = Date.now()`, persiste il run.
- **Schermata d'attesa** (`WaitScreen`): fase corrente, avanzamento
  (`trascorso / totale` e "batteria N di M"), **countdown** alla prossima batteria,
  **elenco dei test in arrivo**. Un tick da 1 s aggiorna il display; un timer
  schedulato porta all'alert.
- **Alert alla "t"**: schermata evidente + **suono** (WebAudio beep, `src/ui/session/alert.ts`).
  Il soggetto preme **Inizia**.
- **Batteria**: per ogni `BatteryItem`, in ordine: breve schermata di pronti
  (nome test + tasti) → vista del test esistente (con `practice` secondo l'item) →
  `onComplete(TestResult)` raccolto e taggato → item successivo. A batteria finita:
  il pin è `completed`, si persiste, si torna all'attesa (o fine).
- **Fine**: `SessionResults` con panoramica per fase/t/test + download JSON e CSV.
- **Ripresa**: all'avvio dell'app, se esiste un run non finito → banner "Riprendi
  sessione". La ripresa ricalcola `elapsed` sull'orologio reale.
- **Interruzione volontaria** (Esc / esci): dialogo con "Riprendi", "Esci ed
  esporta i dati parziali", "Esci senza salvare".

Il timing **di sessione** usa l'orologio reale (`Date.now()` + `setInterval` 1 s +
timeout per l'alert). Il timing **dentro un test** (RT) resta invariato
(`performance.now()` + rAF nel sequencer).

**Modifica minima alle viste**: prop opzionale `practice?: boolean` (default true)
su `RtTestRunner` e sulle 5 viste, per saltare la pratica in sessione quando
l'item lo richiede. Nessun'altra modifica ai test.

---

## 5. Output (file di sessione)

Alla fine (o come export parziale) si scaricano due file, in
`src/engine/session/export.ts`:

- **JSON di sessione** `sessione_{runId}_{data-ora}.json`: template usato,
  `startedAt`, metadati d'ambiente, e per ogni `SessionTestResult` il contesto
  (fase, t, test, indice) con il `TestResult` completo (parametri + tutti i trial +
  summary).
- **CSV combinato** `sessione_{runId}_{data-ora}.csv` (separatore `;`): una riga
  per **trial** di **qualsiasi** test della sessione, con colonne di contesto
  anteposte:
  `fase; t_offset_ms; test; indice_batteria; run_id; session_id; trial_index; fase_test; condizione; stimolo; risposta; corretto; rt_ms; flag_validazione; timestamp_onset`
  (dove `fase` = fase della sessione e `fase_test` = pratica|test del singolo trial).

Riuso di `engine/export.ts` (le funzioni CSV/JSON per singolo test) come base.

---

## 6. Navigazione e file

Nuove rotte nel router: `sessionMenu`, `sessionBuilder`, `sessionRun`,
`sessionResults`. Home guadagna una card "Sessione".

```
src/engine/session/
  model.ts        Tipi + funzioni pure (flatten, total, computeSessionState)
  export.ts       toSessionJson, toSessionCsv, sessionFilename
src/ui/params/
  paramFields.ts  Descrittori parametri condivisi (estratti da Settings)
src/ui/session/
  storage.ts      Persistenza template + run (localStorage) + import/export
  alert.ts        Beep WebAudio
  SessionMenu.tsx     Elenco modelli, avvia/modifica/elimina, importa, riprendi
  SessionBuilder.tsx  Costruttore (fasi, pin, batteria, impostazioni)
  SessionRunner.tsx   Orchestrazione runtime + ripresa + abbandono
  WaitScreen.tsx      Attesa: fase, avanzamento, countdown, test in arrivo, alert
  BatteryReady.tsx    Schermata "pronti" prima di ogni test della batteria
  SessionResults.tsx  Panoramica + download JSON/CSV
```

Modifiche a file esistenti: `router.ts` (rotte + card), `App.tsx` (routing),
`Settings.tsx` (usa `paramFields` estratti), viste dei test (prop `practice`).

---

## 7. Testing

- **Engine (Vitest)**: `computeSessionState` su una timeline (prima del primo pin,
  attesa, sforo con countdown ≤ 0, fine); `flattenPins` ordina per offset;
  `sessionTotalMs`; export CSV (header + colonne di contesto + una riga per trial
  di più test) e JSON (struttura per fase/t/test); filename.
- **Storage**: round-trip template + run; import/export JSON; ripresa (run non finito).
- **Component smoke**: builder rende e valida; menu elenca modelli; WaitScreen
  mostra countdown ed elenco test; SessionResults scarica (Blob mock).

---

## 8. Casi limite

- Batteria che sfora l'offset del pin successivo → il pin successivo è dovuto,
  alert immediato (nessuna perdita).
- Riapertura dopo lunga chiusura → elapsed su orologio reale; pin non eseguiti e
  già scaduti → alert immediato per il primo dovuto.
- Sessione/pin/batteria vuoti → bloccati dalla validazione del builder.
- Due pin con lo stesso offset → consentito con avviso; eseguiti in ordine di fase/pin.
- Abbandono → export parziale possibile.

---

## 9. Fuori scope

- Sincronizzazione multi-dispositivo / backend (resta tutto locale).
- Notifiche di sistema fuori dalla tab del browser (solo alert in-app + suono).
- Editing del protocollo mentre una sessione è in corso.
