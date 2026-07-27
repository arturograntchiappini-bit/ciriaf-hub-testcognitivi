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

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation}) ===== */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

interface TrialResult {
  phase: 'practice' | 'test';
  condition: string; // 'target' | 'nontarget'
  response: string | null;
  rtMs: number | null;
  flag: ValidationFlag;
}

interface SummaryMetric {
  label: string;
  value: string | number;
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

/** Sceglie un elemento a caso dalla lista (assume lista non vuota). */
function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

/* ============================ CORE DEL TEST ============================ */

export interface NBackParams {
  n: number;
  letterMs: number;
  blankMs: number;
  nTrials: number;
  /** Proporzione target (es. 0.30). */
  targetRate: number;
  practiceTrials: number;
}

export interface NBackStimulus {
  letter: string;
  isTarget: boolean;
}

/** Consonanti (vocali escluse per impedire strategie fonologiche/chunking). */
export const NBACK_LETTERS: readonly string[] = [
  'B', 'C', 'D', 'F', 'G', 'H', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'Z',
];

/**
 * Genera lo stream di lettere: ~targetRate target (letter[i]===letter[i-n]),
 * nessun target nelle prime n posizioni, con controllo dei lure a lag n-1 e n+1
 * (evita match accidentali che favorirebbero la strategia di familiarità).
 */
export function generateNBack(params: NBackParams, rand: () => number): NBackStimulus[] {
  const { n, nTrials, targetRate } = params;
  const eligible = nTrials - n; // posizioni che possono essere target
  const nTargets = Math.round(eligible * targetRate);

  // Scegli le posizioni target tra quelle idonee (>= n), senza due target adiacenti
  // per evitare artefatti; se non basta, si rilassa il vincolo.
  const targetPositions = chooseTargetPositions(n, nTrials, nTargets, rand);

  const letters: string[] = [];
  for (let i = 0; i < nTrials; i++) {
    if (targetPositions.has(i)) {
      letters.push(letters[i - n] as string);
    } else {
      letters.push(pickNonTarget(letters, i, n, rand));
    }
  }

  return letters.map((letter, i) => ({
    letter,
    isTarget: i >= n && letter === letters[i - n],
  }));
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

/** Inversa della CDF normale standard (probit) — algoritmo di Acklam. */
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

interface Counts {
  hits: number;
  targets: number;
  falseAlarms: number;
  nonTargets: number;
}

function countHitsFa(trials: readonly TrialResult[]): Counts {
  let hits = 0;
  let targets = 0;
  let falseAlarms = 0;
  let nonTargets = 0;
  for (const t of trials) {
    if (t.flag === 'INTERRUPTED') continue;
    if (t.condition === 'target') {
      targets++;
      if (t.response !== null) hits++;
    } else if (t.condition === 'nontarget') {
      nonTargets++;
      if (t.response !== null) falseAlarms++;
    }
  }
  return { hits, targets, falseAlarms, nonTargets };
}

/**
 * Metriche: hit, miss, falsi allarmi, d', RT medio/SD dei hit validi, e le stesse
 * suddivise per quartili temporali del blocco (stabilità della traccia nel tempo).
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
  const chunks: T[][] = [];
  const size = Math.ceil(items.length / k);
  for (let i = 0; i < k; i++) {
    chunks.push(items.slice(i * size, (i + 1) * size));
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
  const params: NBackParams = { n: 2, letterMs: 500, blankMs: 1500, nTrials: 30, targetRate: 0.3, practiceTrials: 10 };
  const seq = generateNBack(params, mulberry32(123));
  const nTargets = seq.filter((s) => s.isTarget).length;
  console.log(`N-Back demo — ${seq.length} lettere, ${nTargets} target (${Math.round((nTargets / seq.length) * 100)}%)`);
  console.log(seq.map((s) => (s.isTarget ? `[${s.letter}]` : ` ${s.letter} `)).join(''));
  console.log(`d'(perfetto: 9 hit / 9 target, 0 FA / 21 nontarget) = ${dPrime(9, 9, 0, 21).toFixed(2)}`);
})();
