/**
 * ============================================================================
 *  COPIA STANDALONE — N-Back Task (variante 2-back, memoria di lavoro)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/nback.ts
 *  Documento di accompagnamento:  revisione-motore/nback.md
 *  Riferimenti scientifici:       docs/scientific/nback.md — Kirchner (1958); Jaeggi et al. (2010); Hautus (1995)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/nback.ts
 *
 *  Risposta (barra spaziatrice) solo se la lettera corrente è identica a quella
 *  di n posizioni prima. d' calcolato con correzione loglinear (sempre applicata).
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation,sdt}) ===== */
/* Generate da scripts/sync-revisione-motore.mjs: non modificarle a mano. */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

type Phase = 'practice' | 'test';

type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst' | 'pvt' | 'flanker' | 'sart' | 'visualSearch' | 'mentalRotation' | 'trailMaking';

interface TrialResult {
  testId: TestId;
  sessionId: string;
  trialIndex: number;
  phase: Phase;
  /** Etichetta della condizione sperimentale (es. 'congruent', 'go', 'target'). */
  condition: string;
  /** Rappresentazione serializzabile dello stimolo mostrato. */
  stimulus: string;
  /** Tasto/azione registrata, oppure null se nessuna risposta (omissione). */
  response: string | null;
  correct: boolean;
  /** Tempo di reazione in ms; null se omissione. */
  rtMs: number | null;
  flag: ValidationFlag;
  /** performance.now() al paint dello stimolo (riferimento del cronometro). */
  onsetTimestamp: number;
}

interface SummaryMetric {
  /** Etichetta leggibile in italiano. */
  label: string;
  value: string | number;
  /** Unità di misura opzionale (es. 'ms', '%'). */
  unit?: string;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Deviazione standard campionaria (denominatore n-1).
 * Misura la stabilità/altalena della performance nel tempo.
 * Ritorna 0 se n < 2.
 */
function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

export function probit(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

/**
 * d' con correzione loglinear di Hautus (1995), applicata sempre:
 * H = (hits+0.5)/(targets+1), F = (fa+0.5)/(nonTargets+1), d' = z(H) − z(F).
 */
export function dPrime(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
  const h = (hits + 0.5) / (targets + 1);
  const f = (falseAlarms + 0.5) / (nonTargets + 1);
  return probit(h) - probit(f);
}

/**
 * Criterio decisionale c (bias di risposta), con la stessa correzione loglinear
 * di Hautus: c = −0.5·(z(H) + z(F)). c > 0 = criterio conservativo (tende a NON
 * rispondere, favorisce i miss); c < 0 = criterio liberale (tende a rispondere,
 * favorisce i falsi allarmi); c ≈ 0 = nessun bias. Complementa d' separando la
 * sensibilità dalla tendenza di risposta.
 */
export function criterionC(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
  const h = (hits + 0.5) / (targets + 1);
  const f = (falseAlarms + 0.5) / (nonTargets + 1);
  return -0.5 * (probit(h) + probit(f));
}

/* ============================ CORE DEL TEST ============================ */

export interface NBackParams {
  n: number;
  letterMs: number;
  blankMs: number;
  nTrials: number;
  /** Proporzione target (es. 0.30). */
  targetRate: number;
  /** Proporzione dei non-target che sono lure, cioè ripetizioni a lag n−1 o n+1 (es. 0.20). */
  lureRate: number;
  practiceTrials: number;
}

export interface NBackStimulus {
  letter: string;
  isTarget: boolean;
  /** Non-target che ripete la lettera a lag n−1 o n+1: familiare ma non target. */
  isLure: boolean;
}

/** Consonanti (vocali escluse per impedire strategie fonologiche/chunking). */
export const NBACK_LETTERS: readonly string[] = [
  'B', 'C', 'D', 'F', 'G', 'H', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'Z',
];

/** Lag dei lure rispetto a n: una posizione prima (n−1) e una dopo (n+1) il lag del target. */
function lureLags(n: number): number[] {
  return [n - 1, n + 1].filter((lag) => lag > 0);
}

/**
 * Genera lo stream di lettere: ~targetRate target (letter[i]===letter[i-n]), nessun
 * target nelle prime n posizioni, e una quota `lureRate` di non-target che sono LURE
 * (ripetono la lettera a lag n−1 o n+1). I lure servono a rendere inutile la sola
 * familiarità: senza di essi, vedere una lettera recente basterebbe a indovinare il target.
 * Tutti gli altri non-target evitano di ripetere una lettera a quei lag, così i lure
 * sono esattamente quelli pianificati.
 */
export function generateNBack(params: NBackParams, rand: () => number): NBackStimulus[] {
  const { n, nTrials, targetRate } = params;
  const lureRate = params.lureRate ?? 0; // modelli di sessione salvati prima dell'introduzione dei lure
  const nTargets = Math.round((nTrials - n) * targetRate); // posizioni idonee: da n in poi

  // Posizioni target tra quelle idonee (>= n), senza due target adiacenti per
  // evitare artefatti; se non basta, si rilassa il vincolo.
  const targetPositions = chooseTargetPositions(n, nTrials, nTargets, rand);
  const lurePositions = chooseLurePositions(n, nTrials, targetPositions, lureRate, rand);

  const letters: string[] = [];
  for (let i = 0; i < nTrials; i++) {
    if (targetPositions.has(i)) letters.push(letters[i - n] as string);
    else if (lurePositions.has(i)) letters.push(pickLure(letters, i, n, rand));
    else letters.push(pickNonTarget(letters, i, n, rand));
  }

  return letters.map((letter, i) => {
    const isTarget = i >= n && letter === letters[i - n];
    const isLure = !isTarget && lureLags(n).some((lag) => i - lag >= 0 && letters[i - lag] === letter);
    return { letter, isTarget, isLure };
  });
}

/** Sceglie a caso le posizioni dei lure fra i non-target che hanno disponibili entrambi i lag. */
function chooseLurePositions(
  n: number,
  nTrials: number,
  targetPositions: ReadonlySet<number>,
  lureRate: number,
  rand: () => number,
): Set<number> {
  const maxLag = n + 1;
  const candidates: number[] = [];
  for (let i = maxLag; i < nTrials; i++) if (!targetPositions.has(i)) candidates.push(i);
  const nonTargets = nTrials - n - targetPositions.size;
  const wanted = Math.min(candidates.length, Math.round(nonTargets * lureRate));
  return new Set(shuffle(candidates, rand).slice(0, wanted));
}

/** Lettera di un lure: ripete quella a lag n−1 o n+1 purché non coincida con quella a lag n (sarebbe un target). */
function pickLure(letters: readonly string[], i: number, n: number, rand: () => number): string {
  const targetLetter = letters[i - n] as string;
  const options = lureLags(n)
    .map((lag) => letters[i - lag] as string)
    .filter((letter) => letter !== targetLetter);
  return options.length > 0 ? pick(options, rand) : pickNonTarget(letters, i, n, rand);
}

function chooseTargetPositions(
  n: number,
  nTrials: number,
  nTargets: number,
  rand: () => number,
): Set<number> {
  const positions = new Set<number>();
  let guard = 0;
  const maxGuard = nTrials * 50;
  while (positions.size < nTargets && guard < maxGuard) {
    guard++;
    const p = n + Math.floor(rand() * (nTrials - n));
    if (positions.has(p) || positions.has(p - 1) || positions.has(p + 1)) continue;
    positions.add(p);
  }
  // Rilassa il vincolo di non-adiacenza se non abbiamo abbastanza target.
  while (positions.size < nTargets && guard < maxGuard * 2) {
    guard++;
    const p = n + Math.floor(rand() * (nTrials - n));
    positions.add(p);
  }
  return positions;
}

/** Sceglie una lettera che NON crea un target e limita i lure a lag n-1 / n+1. */
function pickNonTarget(letters: readonly string[], i: number, n: number, rand: () => number): string {
  const forbidden = new Set<string>();
  if (i - n >= 0) forbidden.add(letters[i - n] as string); // evita target accidentale
  const lureLags = [n - 1, n + 1];
  const softForbidden = new Set<string>();
  for (const lag of lureLags) {
    if (lag > 0 && i - lag >= 0) softForbidden.add(letters[i - lag] as string);
  }
  const strict = NBACK_LETTERS.filter((l) => !forbidden.has(l) && !softForbidden.has(l));
  if (strict.length > 0) return pick(strict, rand);
  const relaxed = NBACK_LETTERS.filter((l) => !forbidden.has(l));
  return pick(relaxed.length > 0 ? relaxed : NBACK_LETTERS, rand);
}

interface Counts {
  hits: number;
  targets: number;
  falseAlarms: number;
  nonTargets: number;
  lures: number;
  lureFalseAlarms: number;
}

function countHitsFa(trials: readonly TrialResult[]): Counts {
  let hits = 0;
  let targets = 0;
  let falseAlarms = 0;
  let nonTargets = 0;
  let lures = 0;
  let lureFalseAlarms = 0;
  for (const t of trials) {
    if (t.flag === 'INTERRUPTED') continue;
    if (t.condition === 'target') {
      targets++;
      if (t.response !== null) hits++;
    } else if (t.condition === 'nontarget' || t.condition === 'lure') {
      nonTargets++;
      if (t.response !== null) falseAlarms++;
      if (t.condition === 'lure') {
        lures++;
        if (t.response !== null) lureFalseAlarms++;
      }
    }
  }
  return { hits, targets, falseAlarms, nonTargets, lures, lureFalseAlarms };
}

/**
 * Metriche: hit, miss, falsi allarmi (anche sui soli lure), d', criterio c, RT medio/SD
 * dei hit validi, e d' per quartili temporali del blocco (stabilità della traccia nel
 * tempo). I trial interrotti sono esclusi dai conteggi.
 */
export function scoreNBack(trials: readonly TrialResult[], nQuartiles = 4): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const c = countHitsFa(test);
  const misses = c.targets - c.hits;

  const hitRts = test
    .filter((t) => t.condition === 'target' && t.flag === 'VALID' && t.response !== null && t.rtMs !== null)
    .map((t) => t.rtMs as number);

  const metrics: SummaryMetric[] = [
    { label: 'Hit (target rilevati)', value: c.hits },
    { label: 'Miss (target mancati)', value: misses },
    { label: 'Falsi allarmi', value: c.falseAlarms },
    { label: 'Falsi allarmi su lure', value: c.lureFalseAlarms },
    { label: 'Tasso di falsi allarmi su lure', value: c.lures > 0 ? round1((c.lureFalseAlarms / c.lures) * 100) : 0, unit: '%' },
    { label: "Sensibilità d'", value: round2(dPrime(c.hits, c.targets, c.falseAlarms, c.nonTargets)) },
    { label: 'Criterio decisionale (c)', value: round2(criterionC(c.hits, c.targets, c.falseAlarms, c.nonTargets)) },
    { label: 'RT medio hit', value: round1(mean(hitRts)), unit: 'ms' },
    { label: 'SD RT hit', value: round1(standardDeviation(hitRts)), unit: 'ms' },
  ];

  // Analisi per quartili temporali.
  const chunks = splitIntoChunks(test, nQuartiles);
  chunks.forEach((chunk, idx) => {
    const cc = countHitsFa(chunk);
    const dq = dPrime(cc.hits, cc.targets, cc.falseAlarms, cc.nonTargets);
    metrics.push({ label: `d' quartile ${idx + 1}`, value: round2(dq) });
  });

  return metrics;
}

/** Divide una lista in `k` blocchi contigui il più bilanciati possibile. */
export function splitIntoChunks<T>(items: readonly T[], k: number): T[][] {
  if (k <= 0) return [];
  const chunks: T[][] = [];
  const base = Math.floor(items.length / k);
  const extra = items.length % k; // i primi `extra` blocchi hanno un elemento in più: nessun blocco resta vuoto se n >= k
  let start = 0;
  for (let i = 0; i < k; i++) {
    const end = start + base + (i < extra ? 1 : 0);
    chunks.push(items.slice(start, end));
    start = end;
  }
  return chunks;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ================================ DEMO ================================ */
// Copia di sola revisione: esegui con `npx tsx revisione-motore/nback.ts`.
(function demo(): void {
  const params: NBackParams = { n: 2, letterMs: 500, blankMs: 1500, nTrials: 30, targetRate: 0.3, lureRate: 0.2, practiceTrials: 10 };
  const seq = generateNBack(params, mulberry32(123));
  const nTargets = seq.filter((s) => s.isTarget).length;
  const nLures = seq.filter((s) => s.isLure).length;
  console.log(`N-Back demo — ${seq.length} lettere, ${nTargets} target (${Math.round((nTargets / seq.length) * 100)}%), ${nLures} lure (n±1)`);
  console.log('[X] = target, (X) = lure, X = non-target');
  console.log(seq.map((s) => (s.isTarget ? `[${s.letter}]` : s.isLure ? `(${s.letter})` : ` ${s.letter} `)).join(''));
  console.log(`d'(perfetto: 9 hit / 9 target, 0 FA / 21 nontarget) = ${dPrime(9, 9, 0, 21).toFixed(2)}`);
})();
