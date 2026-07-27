# Feature "Sessione" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Modalità Sessione: protocollo cronometrico con fasi nominate e pin "t" arbitrari, ognuno con una batteria di test selezionati e configurati; runtime a tempo reale con attesa/alert/ripresa; export file di sessione (JSON + CSV combinato).

**Architecture:** Nuovo dominio `engine/session/` (puro, testato) per modello, stato derivato ed export. UI in `ui/session/` che riusa le viste dei test esistenti. Refactor mirato: descrittori parametri condivisi tra Settings e builder; prop `practice?` sulle viste.

**Tech Stack:** invariato (Vite 8, React 18, TS strict, Tailwind, Vitest 4).

## Global Constraints

- TS strict; nomi rivelatori; docstring con `@see docs/...`.
- Timing di sessione = wall-clock (`Date.now()`); timing RT invariato (`performance.now()`).
- Persistenza localStorage: template (`ciriaf-cth-session-templates-v1`), run (`ciriaf-cth-session-run-v1`).
- Palette e tono UI invariati (bianco/nero/azzurrino, Inter).
- Riuso `engine/export.ts` per CSV/JSON di base; nessuna duplicazione.
- Commit atomici, Conventional Commits, test dopo ogni fase.

---

## Task 1: Modello sessione (engine puro)

**Files:** Create `src/engine/session/model.ts`, `src/engine/session/model.test.ts`

**Produces:**
```typescript
export interface SessionTemplate { id; name; createdAt; phases: SessionPhase[] }
export interface SessionPhase { id; name; pins: TimePin[] }
export interface TimePin { id; offsetMs; label?; battery: BatteryItem[] }
export interface BatteryItem { testId: TestId; params: Record<string,unknown>; practice: boolean }
export interface SessionTestResult { phaseId; phaseName; pinId; offsetMs; indexInBattery; result: TestResult }
export interface SessionRun { runId; template; startedAtEpoch; startedAtIso; completedPinIds: string[]; results: SessionTestResult[]; finished: boolean }
export interface FlatPin { phase: SessionPhase; pin: TimePin }
export function flattenPins(t: SessionTemplate): FlatPin[]            // ordinati per offsetMs
export function sessionTotalMs(t: SessionTemplate): number           // offset ultimo pin
export interface SessionState { currentPhaseName: string; nextPin: TimePin | null; nextPhaseName: string | null; upcomingTests: TestId[]; countdownMs: number; positionIndex: number; total: number; due: boolean; done: boolean }
export function computeSessionState(t, elapsedMs, completedPinIds: string[]): SessionState
export function makeRunId(now?: Date, rand?: ()=>number): string      // "S-XXXX-HHMM"
```

- [ ] Test `flattenPins`: pin di fasi diverse ordinati per offset globale.
- [ ] Test `sessionTotalMs`.
- [ ] Test `computeSessionState`: (a) prima del primo pin → next=primo, countdown>0; (b) sforo: elapsed oltre next non completato → due=true, countdown≤0; (c) tutti completati → done=true; (d) currentPhaseName = fase del next pin (o ultima se done).
- [ ] Test `makeRunId` formato `S-[A-Z0-9]{4}-HHMM`.
- [ ] Implementa → verde. Commit `feat(engine): modello e stato sessione`.

## Task 2: Export sessione (engine puro)

**Files:** Create `src/engine/session/export.ts`, `src/engine/session/export.test.ts`

**Produces:**
```typescript
export function toSessionJson(run: SessionRun, env?): string
export function toSessionCsv(run: SessionRun): string   // header con contesto + 1 riga/trial
export function sessionFilename(run: SessionRun, ext: 'json'|'csv'): string
```
Header CSV: `fase;t_offset_ms;test;indice_batteria;run_id;session_id;trial_index;fase_test;condizione;stimolo;risposta;corretto;rt_ms;flag_validazione;timestamp_onset`.

- [ ] Test CSV: header esatto; una riga per trial aggregando 2 SessionTestResult di test diversi; escaping `;`.
- [ ] Test JSON: re-parsabile, contiene template, results con contesto, trial.
- [ ] Test filename.
- [ ] Implementa (riusa logica di `engine/export.ts` per i campi trial) → verde. Commit `feat(engine): export file di sessione`.

## Task 3: Descrittori parametri condivisi (refactor)

**Files:** Create `src/ui/params/paramFields.ts`; Modify `src/ui/screens/Settings.tsx`

**Produces:** `export interface FieldDesc {...}`, `export interface SectionDesc {...}`, `export const PARAM_SECTIONS: SectionDesc[]` (spostati da Settings.tsx verbatim).

- [ ] Sposta `FieldDesc`/`SectionDesc`/`SECTIONS` in `paramFields.ts`; Settings importa `PARAM_SECTIONS`.
- [ ] `npx vitest run` (Settings smoke invariato) + `tsc` verdi. Commit `refactor(ui): descrittori parametri condivisi`.

## Task 4: Prop `practice` sulle viste

**Files:** Modify `src/ui/runtime/RtTestRunner.tsx`, `src/ui/tests/{StroopView,GoNoGoView,NBackView,CorsiView,WcstView}.tsx`

**Produces:** prop opzionale `practice?: boolean` (default true). Se false: RtTestRunner parte da `countdown` (nessun blocco pratica); Corsi salta la pratica interna; WCST invariato (non ha pratica).

- [ ] Aggiungi prop; RtTestRunner: `initialStage = practice===false ? 'countdown' : (practiceTrials>0?'practice':'countdown')`.
- [ ] CorsiView: se `practice===false` salta i trial di pratica (va diretto a `startTestLevel`).
- [ ] `tsc` + test verdi. Commit `feat(ui): opzione salta-pratica nelle viste (per sessione)`.

## Task 5: Storage sessione + alert

**Files:** Create `src/ui/session/storage.ts`, `src/ui/session/storage.test.ts`, `src/ui/session/alert.ts`

**Produces:** `loadTemplates()/saveTemplate()/deleteTemplate()/exportTemplateJson()/importTemplateJson()`; `loadRun()/saveRun()/clearRun()`; `playAlert()` (WebAudio, no-op se non disponibile).

- [ ] Test round-trip template + run; import valida struttura; clear.
- [ ] Implementa → verde. Commit `feat(ui): persistenza sessione e alert`.

## Task 6: Costruttore (SessionBuilder + SessionMenu)

**Files:** Create `src/ui/session/SessionMenu.tsx`, `src/ui/session/SessionBuilder.tsx`, `src/ui/session/BatteryEditor.tsx`; test `SessionBuilder.test.tsx`

- [ ] `SessionMenu`: elenca modelli (avvia/modifica/elimina), nuovo, importa, e "Riprendi" se run non finito.
- [ ] `SessionBuilder`: nome; fasi (add/rinomina/riordina/elimina); pin (offset min:sec, ordina); batteria (multi-select test + editor params da `PARAM_SECTIONS` + toggle pratica); salva modello; export/import JSON; validazione.
- [ ] Smoke test: builder rende, aggiunge fase/pin/test, salva.
- [ ] Implementa → verde. Commit `feat(ui): costruttore e menu sessione`.

## Task 7: Runner sessione (attesa + batteria + risultati)

**Files:** Create `src/ui/session/SessionRunner.tsx`, `src/ui/session/WaitScreen.tsx`, `src/ui/session/BatteryReady.tsx`, `src/ui/session/SessionResults.tsx`; test `WaitScreen.test.tsx`, `SessionResults.test.tsx`

- [ ] `WaitScreen`: da `computeSessionState` mostra fase, avanzamento, countdown (tick 1s), test in arrivo; alla scadenza alert visivo+`playAlert()` e "Inizia".
- [ ] `SessionRunner`: avvia run, persiste; alla "t" monta la batteria (per item: `BatteryReady` → vista test con `practice` dell'item → raccogli `SessionTestResult`), poi completa pin, persiste, prossima attesa o fine; ripresa da run salvato; abbandono con export parziale.
- [ ] `SessionResults`: panoramica per fase/t/test + download JSON/CSV (`triggerDownload`).
- [ ] Smoke test WaitScreen (countdown/testi) e SessionResults (Blob mock).
- [ ] Implementa → verde. Commit `feat(ui): runtime sessione con attesa, alert e ripresa`.

## Task 8: Integrazione router + Home + docs + verifica

**Files:** Modify `src/ui/router.ts`, `src/App.tsx`, `src/ui/screens/Home.tsx`; `docs/architettura.md`; `README.md`

- [ ] Rotte `sessionMenu/sessionBuilder/sessionRun/sessionResults`; card "Sessione" in Home; App instrada; banner ripresa.
- [ ] Aggiorna `docs/architettura.md` (sezione Sessione) e README.
- [ ] `npx vitest run` + `tsc` + `npm run build` verdi.
- [ ] Verifica end-to-end (Playwright): costruisci una sessione con 2 pin ravvicinati (offset piccoli), avvia, attendi l'alert, esegui un test, arriva ai risultati, scarica.
- [ ] Commit `feat(ui): integrazione sessione (router, home, docs) + verifica`.

---

## Self-Review (spec → piano)

- Modello (fasi, pin t arbitrari, batteria, params congelati, pratica per item) → Task 1. ✓
- Stato wall-clock + sforo + ripresa → Task 1 (computeSessionState) + Task 7. ✓
- Costruttore + modelli riutilizzabili + import/export → Task 5, 6. ✓
- Attesa con countdown/contesto/alert sonoro → Task 7 (WaitScreen, alert). ✓
- Batteria: test selezionati in ordine, riuso viste, pratica opzionale → Task 4, 7. ✓
- Output JSON + CSV combinato con colonne contesto → Task 2, 7. ✓
- Descrittori parametri condivisi (DRY) → Task 3. ✓
- Navigazione/Home/docs → Task 8. ✓
- Testing engine + storage + component → Task 1,2,5,6,7,8. ✓
