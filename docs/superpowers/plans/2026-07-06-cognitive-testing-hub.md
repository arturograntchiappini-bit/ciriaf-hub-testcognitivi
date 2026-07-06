# CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire una SPA statica per la somministrazione di 6 test cognitivi (Stroop 1&2, Go/No-Go, Corsi, N-Back 2-back, WCST) in laboratorio, con motore TypeScript puro unit-testato, validazione automatica degli RT, export CSV/JSON e documentazione scientifica ufficiale in italiano.

**Architecture:** Due strati separati. Un **motore** TypeScript puro (nessun import da React) contiene clock, generatori di sequenze, state machine dei test, validazione e scoring — tutto unit-testabile senza browser. Una **UI** React sottile gestisce navigazione e schermate; durante i trial gli stimoli sono pilotati dal motore via `requestAnimationFrame`, fuori dal ciclo di re-render di React.

**Tech Stack:** Vite + React 18 + TypeScript (strict) + Tailwind CSS + Vitest. Nessun backend.

## Global Constraints

- **Nome piattaforma (verbatim):** `CIRIAF - COLAB/NEXTROOM COGNITIVE TESTING HUB`
- **Lingua:** UI in italiano; **tutta la documentazione in italiano** (docs codice + docs scientifici); citazioni bibliografiche in lingua originale.
- **Palette:** sfondo `#FFFFFF`, testo `#111111`, accento primario `#4A90D9`, superficie tenue `#EAF2FB`. Accento solo per rifiniture, mai grandi aree. Colori funzionali (verde/rosso Go-No-Go, colori Stroop) confinati agli stimoli.
- **Tipografia:** un solo sans-serif (Inter con fallback system-ui).
- **TypeScript strict**; `const` di default; type annotations obbligatorie; nomi rivelatori d'intento.
- **Timing:** onset stimolo rilevato al frame di paint (rAF dopo commit); risposte via listener globali con `performance.now()`; nessun re-render React nel percorso critico.
- **Filtri RT:** `< 150 ms` → `ANTICIPATION`; timeout senza risposta → `OMISSION`; perdita focus/visibilità → `INTERRUPTED`. I trial invalidati restano nei dati grezzi con il flag.
- **SD** calcolata sulle sole risposte `VALID` e corrette.
- **Ogni parametro** in `config/defaults.ts` ha un commento con la fonte scientifica.
- **Documentation gate:** ogni fase chiude solo dopo l'aggiornamento dei docs pertinenti.
- **Commit frequenti**, Conventional Commits, atomici.

---

## FASE 0 — Ricerca scientifica e documenti di riferimento

Obiettivo: validare i default contro la letteratura *prima* del codice. Produce i documenti scientifici in italiano che ancorano ogni parametro.

### Task 0.1: Ricerca e bibliografia

**Files:**
- Create: `docs/scientific/bibliography.md`
- Create: `docs/scientific/stroop.md`
- Create: `docs/scientific/gonogo.md`
- Create: `docs/scientific/corsi.md`
- Create: `docs/scientific/nback.md`
- Create: `docs/scientific/wcst.md`
- Create: `docs/scientific/validazione-rt.md`

- [ ] **Step 1:** Ricerca web (WebSearch/WebFetch, fallback firecrawl) per ciascun test: paradigma originale, parametri standard, e come lo implementano jsPsych/PsyToolkit/PEBL. Fonti target: Stroop 1935 / MacLeod 1991; Verbruggen & Logan 2008 (Go/No-Go); Corsi 1972 / Kessels 2000 (coordinate 9 blocchi); Kirchner 1958 / Jaeggi (N-Back target & lure); Berg 1948 / Grant&Berg 1948 / Heaton / Kongs 2000 (WCST); Whelan 2008 (cutoff RT).
- [ ] **Step 2:** Scrivere ogni `docs/scientific/<test>.md` in italiano con struttura fissa: (1) paradigma + citazione; (2) meccanismo cognitivo; (3) tabella parametro → valore adottato → fonte; (4) mappatura implementativa (rimando ai file del motore, da riempire man mano); (5) metriche + formule.
- [ ] **Step 3:** Scrivere `bibliography.md` in APA con DOI dove disponibile.
- [ ] **Step 4:** Se la ricerca contraddice un default della spec, annotare la decisione nel doc del test e adeguare i valori attesi usati nella Fase 3.
- [ ] **Step 5:** Commit — `docs(scientific): riferimenti e parametri validati per i 6 test`.

---

## FASE 1 — Setup progetto e identità visiva

### Task 1.1: Scaffolding Vite + React + TS

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1:** `npm create vite@latest . -- --template react-ts` in una dir temporanea e copia dei file, oppure creazione manuale dei file (preferita per controllo). Impostare `"strict": true` in tsconfig.
- [ ] **Step 2:** Installare dipendenze: `react`, `react-dom`, `-D vite @vitejs/plugin-react typescript vitest @types/react @types/react-dom jsdom @testing-library/react @testing-library/jest-dom tailwindcss postcss autoprefixer`.
- [ ] **Step 3:** `index.html` con `<title>CIRIAF - COLAB/NEXTROOM COGNITIVE TESTING HUB</title>`, lang `it`.
- [ ] **Step 4:** `vite.config.ts` con plugin React + config Vitest (`environment: 'jsdom'`, `globals: true`, setup file).
- [ ] **Step 5:** Verifica: `npm run build` produce `dist/`. Commit — `chore: scaffolding vite react ts`.

### Task 1.2: Tailwind + design tokens

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/index.css`
- Create: `src/ui/theme.ts`

- [ ] **Step 1:** Config Tailwind con `content` sui file `src`. Estendere `theme.colors` con token: `ink: '#111111'`, `paper: '#FFFFFF'`, `accent: '#4A90D9'`, `accentSoft: '#EAF2FB'`, `line: '#E4E7EC'`. Font family `sans: ['Inter','system-ui',...]`.
- [ ] **Step 2:** `src/index.css` con direttive Tailwind + `:root` variabili CSS speculari + import font Inter (self-host o system-ui fallback; niente CDN esterni bloccanti — usare `@fontsource/inter` come dependency, oppure system-ui puro). Regola `@media (prefers-reduced-motion)`.
- [ ] **Step 3:** `src/ui/theme.ts` esporta costanti riusabili (colori stimoli Stroop/GoNoGo separati dai token UI).
- [ ] **Step 4:** Commit — `feat(ui): design tokens e palette istituzionale`.

---

## FASE 2 — Motore core (TypeScript puro)

### Task 2.1: Tipi condivisi

**Files:**
- Create: `src/engine/types.ts`
- Test: `src/engine/types.test.ts` (solo type-level / smoke)

**Interfaces — Produces:**
```typescript
export type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';
export type Phase = 'practice' | 'test';
export type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst';

export interface TrialResult {
  testId: TestId;
  sessionId: string;
  trialIndex: number;
  phase: Phase;
  condition: string;      // es. 'congruent' | 'incongruent' | 'go' | 'nogo' | 'target' | ...
  stimulus: string;       // rappresentazione serializzabile dello stimolo
  response: string | null;// tasto/azione o null se nessuna risposta
  correct: boolean;
  rtMs: number | null;    // null se OMISSION
  flag: ValidationFlag;
  onsetTimestamp: number; // performance.now() al paint dello stimolo
}

export interface SummaryMetric { label: string; value: string | number; }

export interface TestResult {
  testId: TestId;
  sessionId: string;
  startedAt: string;      // ISO
  params: Record<string, unknown>;
  trials: TrialResult[];  // pratica inclusa
  summary: SummaryMetric[];
}
```

- [ ] **Step 1:** Scrivere `types.ts` con le interfacce sopra.
- [ ] **Step 2:** Smoke test che costruisce un `TrialResult` valido.
- [ ] **Step 3:** `npx vitest run src/engine/types.test.ts` → PASS. Commit — `feat(engine): tipi condivisi`.

### Task 2.2: Session ID anonimo

**Files:**
- Create: `src/engine/session.ts`
- Test: `src/engine/session.test.ts`

**Interfaces — Produces:** `export function makeSessionId(now?: Date): string` → formato `XXXX-HHMM` (4 char alfanumerici maiuscoli + orario).

- [ ] **Step 1:** Test: `makeSessionId(new Date('2026-07-06T14:30:00'))` matcha `/^[A-Z0-9]{4}-1430$/`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementare (parte casuale seed-free basata su `Math.random`, ma la parte oraria deterministica dalla data passata).
- [ ] **Step 4:** Run → PASS. Commit — `feat(engine): id sessione anonimo`.

### Task 2.3: Validazione RT

**Files:**
- Create: `src/engine/validation.ts`
- Test: `src/engine/validation.test.ts`

**Interfaces — Produces:**
```typescript
export const ANTICIPATION_CUTOFF_MS = 150;
export function classifyRt(rtMs: number | null, responded: boolean, interrupted: boolean): ValidationFlag;
export function standardDeviation(values: number[]): number; // popolazione? -> campionaria (n-1); n<2 => 0
export function meanRtOfValidCorrect(trials: TrialResult[]): number;
export function sdRtOfValidCorrect(trials: TrialResult[]): number;
```

- [ ] **Step 1:** Test tabellari: rt 149 responded → ANTICIPATION; 150 → VALID; 151 → VALID; responded=false → OMISSION; interrupted=true → INTERRUPTED (precede tutto). SD di `[]`→0, `[5]`→0, `[2,4,4,4,5,5,7,9]`→~2.14 (campionaria).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementare. Precedenza: interrupted → omission → anticipation → valid.
- [ ] **Step 4:** Run → PASS. Commit — `feat(engine): validazione RT e statistiche`.

### Task 2.4: RNG deterministico (per test riproducibili)

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/rng.test.ts`

**Interfaces — Produces:** `export function mulberry32(seed: number): () => number;` e helper `shuffle<T>(arr: T[], rand: () => number): T[]`.

- [ ] **Step 1:** Test: stessa seed → stessa sequenza; shuffle è permutazione (stessi elementi).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementare mulberry32 + Fisher-Yates. **Step 4:** PASS. Commit — `feat(engine): rng deterministico`.

### Task 2.5: Export CSV/JSON

**Files:**
- Create: `src/engine/export.ts`
- Test: `src/engine/export.test.ts`

**Interfaces — Produces:**
```typescript
export function toCsv(result: TestResult): string;   // separatore ';', header fisso
export function toJson(result: TestResult): string;   // JSON.stringify indent 2, +meta
export function exportFilename(result: TestResult, ext: 'csv'|'json'): string; // {test}_{sessionId}_{ISO}.ext
```
Header CSV: `test;session_id;trial_index;fase;condizione;stimolo;risposta;corretto;rt_ms;flag_validazione;timestamp_onset`.

- [ ] **Step 1:** Test: CSV ha header corretto, una riga per trial, escaping di `;` nei campi; JSON re-parsabile con `params` e `summary`.
- [ ] **Step 2:** FAIL → **Step 3** implementare → **Step 4** PASS. Commit — `feat(engine): export csv e json`.

### Task 2.6: Clock / scheduler rAF

**Files:**
- Create: `src/engine/clock.ts`
- Test: `src/engine/clock.test.ts`

**Interfaces — Produces:**
```typescript
export interface Clock { now(): number; }
export const performanceClock: Clock;
// Scheduler astratto per la state machine: consente fake timers nei test.
export interface Scheduler {
  afterPaint(cb: (t: number) => void): void;  // rAF
  timeout(ms: number, cb: () => void): () => void; // ritorna cancel
}
export function realScheduler(): Scheduler;
```

- [ ] **Step 1:** Test con fake scheduler manuale (non usa il browser): verifica che `timeout` chiami il cb e che `cancel` lo impedisca.
- [ ] **Step 2:** FAIL → implementare (real usa `requestAnimationFrame`/`setTimeout`; nei test si usa un fake) → PASS. Commit — `feat(engine): clock e scheduler`.

---

## FASE 3 — Moduli dei test (generatori + state machine + scoring)

Ogni test espone: un **generatore** puro (sequenza di stimoli data i parametri + rng) e uno **scorer** puro (trials → SummaryMetric[]). La state machine di runtime consuma il generatore e produce `TrialResult[]`. Generatori e scorer sono il cuore unit-testato.

### Task 3.1: Stroop (1 e 2)

**Files:**
- Create: `src/engine/tests/stroop.ts`
- Test: `src/engine/tests/stroop.test.ts`

**Interfaces — Produces:**
```typescript
export interface StroopParams { nTrials: number; fixationMs: number; timeoutMs: number; isiMs: number; practiceTrials: number; }
export interface StroopStimulus { word: 'ROSSO'|'VERDE'|'BLU'|'GIALLO'; color: StroopColor; congruent: boolean; }
export type StroopColor = 'ROSSO'|'VERDE'|'BLU'|'GIALLO';
export const STROOP_KEYS: Record<StroopColor,'R'|'V'|'B'|'G'>;
export function generateStroop(params: StroopParams, rand: () => number): StroopStimulus[];
export function correctKeyStroop(s: StroopStimulus, variant: 'stroop1'|'stroop2'): 'R'|'V'|'B'|'G';
export function scoreStroop(trials: TrialResult[]): SummaryMetric[];
```

- [ ] **Step 1:** Test generatore: `nTrials=48` → 24 congruenti/24 incongruenti; nessuna corsa >3 stesso colore o parola; incongruenti hanno `word!=color`.
- [ ] **Step 2:** Test `correctKeyStroop`: stroop1 usa la parola, stroop2 usa il colore.
- [ ] **Step 3:** Test `scoreStroop`: accuratezza per condizione, effetto interferenza = mean RT incongruenti − congruenti (solo VALID corretti), conteggio ANTICIPATION/OMISSION.
- [ ] **Step 4:** FAIL → implementare → PASS. Commit — `feat(engine): test stroop 1 e 2`.

### Task 3.2: Go/No-Go

**Files:**
- Create: `src/engine/tests/gonogo.ts`
- Test: `src/engine/tests/gonogo.test.ts`

**Interfaces — Produces:**
```typescript
export interface GoNoGoParams { nTrials: number; goRatio: number; stimulusMs: number; isiMinMs: number; isiMaxMs: number; practiceTrials: number; }
export interface GoNoGoStimulus { kind: 'go'|'nogo'; isiMs: number; }
export function generateGoNoGo(params: GoNoGoParams, rand: () => number): GoNoGoStimulus[];
export function scoreGoNoGo(trials: TrialResult[]): SummaryMetric[]; // commission errors, omissions, mean/SD RT go corretti
```

- [ ] **Step 1:** Test: `nTrials=80, goRatio=0.75` → esatti 60 go / 20 nogo; mai >2 nogo consecutivi; ogni `isiMs` in [500,1000].
- [ ] **Step 2:** Test scorer: errori di commissione (risposta su nogo), omissioni su go, mean/SD RT dei go VALID corretti.
- [ ] **Step 3:** FAIL → implementare → PASS. Commit — `feat(engine): test go/no-go`.

### Task 3.3: Corsi Block Task

**Files:**
- Create: `src/engine/tests/corsi.ts`
- Test: `src/engine/tests/corsi.test.ts`

**Interfaces — Produces:**
```typescript
export interface Point { x: number; y: number; }
export const CORSI_BLOCKS: Point[]; // 9 coordinate fisse asimmetriche (Kessels 2000)
export interface CorsiParams { startLength: number; maxLength: number; trialsPerLevel: number; presentMsPerBlock: number; complexityTolerance: number; practice: boolean; }
export interface CorsiSequence { indices: number[]; pathLength: number; crossings: number; }
export function pathLength(seq: number[], blocks: Point[]): number;
export function countCrossings(seq: number[], blocks: Point[]): number;
export function generateBalancedSequences(length: number, count: number, params: CorsiParams, rand: () => number): CorsiSequence[]; // stessa complessità entro tolleranza
export function corsiSpan(passedTrials: number): number; // 0.5 * passed
export function scoreCorsi(trials: TrialResult[]): SummaryMetric[];
export function shouldStop(levelResults: boolean[]): boolean; // true se entrambi i 2 trial del livello falliti
```

- [ ] **Step 1:** Test geometria: `pathLength`/`countCrossings` su casi noti (segmenti che si intersecano vs no).
- [ ] **Step 2:** Test generatore: due sequenze della stessa lunghezza hanno stessa `crossings` e `pathLength` entro `complexityTolerance`; sono diverse tra loro.
- [ ] **Step 3:** Test regola di arresto e span: `corsiSpan(6)===3`; `shouldStop([false,false])===true`, `shouldStop([true,false])===false`.
- [ ] **Step 4:** FAIL → implementare (generazione: campiona permutazioni, filtra per complessità target; il target di complessità per livello è la mediana di un campione) → PASS. Commit — `feat(engine): test corsi con sequenze bilanciate`.

### Task 3.4: N-Back (2-back)

**Files:**
- Create: `src/engine/tests/nback.ts`
- Test: `src/engine/tests/nback.test.ts`

**Interfaces — Produces:**
```typescript
export interface NBackParams { n: number; letterMs: number; blankMs: number; nTrials: number; targetRate: number; practiceTrials: number; }
export interface NBackStimulus { letter: string; isTarget: boolean; }
export const NBACK_LETTERS: string[]; // consonanti
export function generateNBack(params: NBackParams, rand: () => number): NBackStimulus[]; // ~targetRate target, lure controllati
export function scoreNBack(trials: TrialResult[], nQuartiles?: number): SummaryMetric[]; // hit, miss, false alarm, d', mean/SD RT hit, + per quartile
export function dPrime(hits: number, targets: number, falseAlarms: number, nonTargets: number): number;
```

- [ ] **Step 1:** Test generatore: `isTarget` vero sse `letter===seq[i-n]`; frazione target ≈ targetRate (± tolleranza); nessun target nelle prime n posizioni.
- [ ] **Step 2:** Test `dPrime` con correzione loglinear (evita infiniti): valori noti entro epsilon.
- [ ] **Step 3:** Test scorer: quartili temporali partizionano i trial di test in modo bilanciato.
- [ ] **Step 4:** FAIL → implementare → PASS. Commit — `feat(engine): test n-back 2-back`.

### Task 3.5: WCST

**Files:**
- Create: `src/engine/tests/wcst.ts`
- Test: `src/engine/tests/wcst.test.ts`

**Interfaces — Produces:**
```typescript
export type WcstDim = 'color'|'shape'|'number';
export interface WcstCard { color: 'red'|'green'|'yellow'|'blue'; shape: 'triangle'|'star'|'cross'|'circle'; number: 1|2|3|4; }
export const WCST_STIMULUS_CARDS: [WcstCard,WcstCard,WcstCard,WcstCard]; // 1 triangolo rosso, 2 stelle verdi, 3 croci gialle, 4 cerchi blu
export interface WcstParams { deckSize: number; runToShift: number; maxCategories: number; }
export function buildDeck(deckSize: number, rand: () => number): WcstCard[];
export function matchesOn(target: WcstCard, choice: WcstCard, dim: WcstDim): boolean;
export const WCST_RULE_ORDER: WcstDim[]; // color, shape, number, ripetuto
export function isPerseverativeError(chosenDim: WcstDim|null, prevRule: WcstDim|null): boolean;
export function scoreWcst(trials: TrialResult[], events: WcstTrialMeta[]): SummaryMetric[];
export interface WcstTrialMeta { targetIndex: number; currentRule: WcstDim; matchedDims: WcstDim[]; }
```

- [ ] **Step 1:** Test `matchesOn` e mazzo: `buildDeck` produce carte con dimensioni bilanciate; `WCST_STIMULUS_CARDS` corrette.
- [ ] **Step 2:** Test cambio regola: dopo `runToShift` corrette consecutive la regola avanza nell'ordine `WCST_RULE_ORDER`.
- [ ] **Step 3:** Test scoring Heaton: categorie completate, errori totali, **errori perseverativi** (risposta coerente col criterio precedente), failure to maintain set (errore dopo 5–9 corrette).
- [ ] **Step 4:** FAIL → implementare → PASS. Commit — `feat(engine): test wcst con scoring heaton`.

### Task 3.6: Config default

**Files:**
- Create: `src/config/defaults.ts`
- Test: `src/config/defaults.test.ts`

**Interfaces — Produces:** `export const DEFAULTS: { stroop1: StroopParams; stroop2: StroopParams; gonogo: GoNoGoParams; corsi: CorsiParams; nback: NBackParams; wcst: WcstParams; }` — ogni campo commentato con la fonte (dai docs Fase 0).

- [ ] **Step 1:** Test: i default rispettano i vincoli (goRatio 0.75, n-back n=2, ecc.).
- [ ] **Step 2:** FAIL → implementare con commenti-fonte → PASS. Commit — `feat(config): parametri default con fonti scientifiche`.

---

## FASE 4 — UI React

### Task 4.1: Store impostazioni (localStorage)

**Files:**
- Create: `src/ui/settings.ts` (hook `useSettings`), `src/ui/storage.ts`
- Test: `src/ui/storage.test.ts`

**Interfaces — Produces:** `loadSettings(): typeof DEFAULTS`, `saveSettings(s): void`, `resetSettings(): void`; merge robusto coi default per campi mancanti.

- [ ] **Step 1:** Test (jsdom localStorage): save→load round-trip; load con storage vuoto → DEFAULTS; reset.
- [ ] **Step 2:** FAIL → implementare → PASS. Commit — `feat(ui): persistenza impostazioni`.

### Task 4.2: Shell app + routing + Home

**Files:**
- Create: `src/App.tsx`, `src/ui/screens/Home.tsx`, `src/ui/components/Header.tsx`, `src/ui/components/TestCard.tsx`, `src/ui/router.ts`
- Test: `src/ui/screens/Home.test.tsx`

- [ ] **Step 1:** Router semplice a stato (`type Route = {name:'home'} | {name:'test', id:TestId, phase} | {name:'settings'} | {name:'results', result}`), niente lib esterna.
- [ ] **Step 2:** Home: header col nome piattaforma, griglia 6 `TestCard`, ingranaggio Impostazioni. Test: rende 6 card e il titolo esatto.
- [ ] **Step 3:** FAIL → implementare → PASS. Commit — `feat(ui): shell, header e home`.

### Task 4.3: Runtime dei trial (hook motore↔React)

**Files:**
- Create: `src/ui/runtime/useTrialRunner.ts`, `src/ui/runtime/StimulusStage.tsx`
- Test: `src/ui/runtime/useTrialRunner.test.tsx`

**Interfaces — Produces:** hook che, dato un generatore di stimoli + timeline (fixation/stimulus/isi) + handler tasti, produce `TrialResult[]` applicando `classifyRt`, e gestisce `visibilitychange`/`blur` → `INTERRUPTED`. Onset registrato in `afterPaint`.

- [ ] **Step 1:** Test con fake scheduler + eventi tastiera simulati: una risposta a 200ms → VALID corretto; nessuna risposta entro timeout → OMISSION; risposta a 100ms → ANTICIPATION; blur → INTERRUPTED.
- [ ] **Step 2:** FAIL → implementare → PASS. Commit — `feat(ui): runtime trial con validazione`.

### Task 4.4: Schermate Istruzioni + Pratica

**Files:**
- Create: `src/ui/screens/Instructions.tsx`, `src/ui/screens/Practice.tsx`, `src/ui/content/instructions.ts`
- Test: `src/ui/screens/Practice.test.tsx`

- [ ] **Step 1:** `instructions.ts`: testo IT per ciascun test + mappa tasti. Pratica: usa il runtime con `practiceTrials`, mostra feedback "Corretto/Errato", pulsante **"Salta pratica"** sempre visibile, poi countdown 3-2-1.
- [ ] **Step 2:** Test: bottone salta presente; feedback compare dopo risposta.
- [ ] **Step 3:** FAIL → implementare → PASS. Commit — `feat(ui): istruzioni e pratica skippabile`.

### Task 4.5: TestRunner per ciascun test

**Files:**
- Create: `src/ui/screens/TestRunner.tsx`
- Create: `src/ui/tests/StroopView.tsx`, `GoNoGoView.tsx`, `CorsiView.tsx`, `NBackView.tsx`, `WcstView.tsx`
- Test: `src/ui/tests/CorsiView.test.tsx` (smoke render), altri smoke

- [ ] **Step 1:** `TestRunner` orchestra: fullscreen request, monta la view giusta, raccoglie `TrialResult[]`, poi passa a Risultati. Corsi/WCST usano interazione a click (non solo tastiera) e la loro logica di runtime dedicata (regola di arresto Corsi; feedback+shift WCST).
- [ ] **Step 2:** Ogni View rende gli stimoli con la palette corretta (colori funzionali solo qui). Smoke test di render.
- [ ] **Step 3:** FAIL → implementare → PASS. Commit — `feat(ui): runner e viste dei 6 test`.

### Task 4.6: Schermata Risultati + export

**Files:**
- Create: `src/ui/screens/Results.tsx`, `src/ui/download.ts`
- Test: `src/ui/screens/Results.test.tsx`

- [ ] **Step 1:** Mostra `summary` in tabella pulita + ID sessione ben visibile. Pulsanti "Scarica CSV"/"Scarica JSON" (Blob + anchor download). "Torna alla home".
- [ ] **Step 2:** Test: le SummaryMetric compaiono; click download crea Blob (mock URL.createObjectURL).
- [ ] **Step 3:** FAIL → implementare → PASS. Commit — `feat(ui): risultati ed export scaricabile`.

### Task 4.7: Pannello Impostazioni

**Files:**
- Create: `src/ui/screens/Settings.tsx`
- Test: `src/ui/screens/Settings.test.tsx`

- [ ] **Step 1:** Una sezione per test; ogni parametro: valore corrente, default, unità. "Ripristina default" per test e globale. Salvataggio in localStorage. Validazione input (range).
- [ ] **Step 2:** Test: modifica un valore, salva, ricarica store → persistito; reset ripristina default.
- [ ] **Step 3:** FAIL → implementare → PASS. Commit — `feat(ui): pannello impostazioni`.

### Task 4.8: Casi limite runtime

**Files:**
- Modify: `src/ui/runtime/useTrialRunner.ts`, `src/ui/screens/TestRunner.tsx`
- Test: aggiornare `useTrialRunner.test.tsx`

- [ ] **Step 1:** ESC → dialogo conferma abbandono con opzione "esporta parziali". Auto-repeat tasti ignorati (`event.repeat`). Uscita fullscreen → avviso. Una sola risposta per trial.
- [ ] **Step 2:** Test dei casi. FAIL → implementare → PASS. Commit — `feat(ui): gestione casi limite e abbandono`.

---

## FASE 5 — Documentazione codice e verifica finale

### Task 5.1: Docs architettura in italiano + mappatura scientifica

**Files:**
- Create: `docs/architettura.md`
- Modify: `docs/scientific/*.md` (riempire sezione 4 "mappatura implementativa" con file/funzioni reali)
- Create: `README.md`

- [ ] **Step 1:** `docs/architettura.md` (IT): strati motore/UI, flusso di un trial, come funziona il timing, come aggiungere un test, come funziona la validazione. Diagrammi ASCII.
- [ ] **Step 2:** Aggiornare ogni doc scientifico con i riferimenti reali alle funzioni implementate.
- [ ] **Step 3:** `README.md` (IT): cos'è, come si avvia (`npm i`, `npm run dev`, `npm run build`), come si esegue un test, dove finiscono i dati, come cambiare i parametri.
- [ ] **Step 4:** Commit — `docs: architettura in italiano e mappatura scientifica`.

### Task 5.2: Verifica end-to-end e build

- [ ] **Step 1:** `npx vitest run` → tutti verdi. `npm run build` → OK. `npx tsc --noEmit` → nessun errore.
- [ ] **Step 2:** Avvio `npm run dev`, verifica manuale (via skill `run`/Playwright se disponibile) di almeno un flusso completo per un test rappresentativo (Go/No-Go: pratica→test→risultati→export).
- [ ] **Step 3:** Fix di eventuali problemi. Commit finale — `chore: verifica e build finale`.

---

## Self-Review (checklist spec → piano)

- Stroop 1&2 → Task 0.1, 3.1, 4.5. ✓
- Go/No-Go → 0.1, 3.2, 4.5. ✓
- Corsi (sequenze bilanciate, regola arresto, span 0.5) → 0.1, 3.3, 4.5. ✓
- N-Back 2-back (quartili, d′) → 0.1, 3.4, 4.5. ✓
- WCST (Heaton, perseverativi, shift 10) → 0.1, 3.5, 4.5. ✓
- Validazione RT (150ms/omission/interrupted/SD) → 2.3, 4.3, 4.8. ✓
- Export CSV/JSON con flag → 2.5, 4.6. ✓
- ID sessione anonimo → 2.2, 4.6. ✓
- Pratica skippabile → 4.4. ✓
- Pannello impostazioni + persistenza + params negli export → 4.1, 4.7, 2.5. ✓
- Palette/identità visiva + nome → 1.2, 4.2. ✓
- Docs scientifici IT + bibliografia + docs codice IT + gate → 0.1, 5.1. ✓
- Timing rAF fuori da React → 2.6, 4.3. ✓
- Casi limite (fullscreen/focus/ESC/auto-repeat) → 4.8. ✓

Nessun requisito della spec resta senza task.
