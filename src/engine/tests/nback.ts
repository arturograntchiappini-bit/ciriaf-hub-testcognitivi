/**
 * N-Back Task (variante 2-back) — memoria di lavoro a flusso continuo.
 * @see docs/scientific/nback.md — Kirchner (1958); Jaeggi et al. (2010); Hautus (1995)
 *
 * Risposta (barra spaziatrice) solo se la lettera corrente è identica a quella
 * di n posizioni prima. d' calcolato con correzione loglinear (sempre applicata).
 */
import type { SummaryMetric, TrialResult } from '../types';
import { pick, shuffle } from '../rng';
import { mean, standardDeviation } from '../validation';
import { criterionC, dPrime } from '../sdt';

// Riesportati per compatibilità: la logica vive in engine/sdt.ts.
export { probit, dPrime, criterionC } from '../sdt';

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
