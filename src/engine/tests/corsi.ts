/**
 * Corsi Block-Tapping Task — memoria visuo-spaziale di sequenza.
 * @see docs/scientific/corsi.md — Corsi (1972); Kessels et al. (2000); coordinate via PEBL
 *
 * Layout fisso e asimmetrico di 9 blocchi. Ad ogni livello, 2 trial con sequenze
 * diverse ma di pari "indice di complessità" (stessa distanza percorsa e stesso
 * numero di incroci geometrici). Regola di arresto: fallimento di entrambi i trial.
 */
import type { SummaryMetric, TrialResult } from '../types';
import { shuffle } from '../rng';

export interface Point {
  x: number;
  y: number;
}

/**
 * Coordinate dei 9 blocchi sul piano 0–100 (convenzione cartesiana, origine in
 * basso; per lo schermo y-down usare 100 − y). Derivate dai valori nativi in mm
 * di Kessels et al. (2000) come implementati in PEBL (Mueller & Piper, 2014).
 */
export const CORSI_BLOCKS: readonly Point[] = [
  { x: 61.7, y: 81.5 }, // 1
  { x: 15.0, y: 76.8 }, // 2
  { x: 85.0, y: 65.2 }, // 3
  { x: 33.7, y: 60.5 }, // 4
  { x: 66.3, y: 51.2 }, // 5
  { x: 92.0, y: 37.2 }, // 6
  { x: 8.0, y: 32.5 }, // 7
  { x: 36.0, y: 18.5 }, // 8
  { x: 64.0, y: 23.2 }, // 9
];

export interface CorsiParams {
  startLength: number;
  maxLength: number;
  trialsPerLevel: number;
  presentMsPerBlock: number;
  /** Tolleranza (unità piano) sulla distanza totale per considerare pari complessità. */
  complexityTolerance: number;
}

export interface CorsiSequence {
  indices: number[];
  pathLength: number;
  crossings: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distanza totale percorsa dal cursore lungo la sequenza. */
export function pathLength(seq: readonly number[], blocks: readonly Point[] = CORSI_BLOCKS): number {
  let total = 0;
  for (let i = 1; i < seq.length; i++) {
    total += distance(blocks[seq[i - 1]!]!, blocks[seq[i]!]!);
  }
  return total;
}

function orientation(a: Point, b: Point, c: Point): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

/** Vero se i segmenti ab e cd si intersecano propriamente (interni, senza estremi comuni). */
function properlyIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 === 0 || o2 === 0 || o3 === 0 || o4 === 0) return false; // collineari/tocco = non conta
  return o1 !== o2 && o3 !== o4;
}

/** Numero di incroci geometrici tra i segmenti non adiacenti del percorso. */
export function countCrossings(seq: readonly number[], blocks: readonly Point[] = CORSI_BLOCKS): number {
  const pts = seq.map((i) => blocks[i]!);
  let crossings = 0;
  const nSeg = pts.length - 1;
  for (let i = 0; i < nSeg; i++) {
    for (let j = i + 2; j < nSeg; j++) {
      // salta segmenti adiacenti (condividono un estremo)
      if (i === 0 && j === nSeg - 1 && pts[0] === pts[nSeg]) continue;
      if (properlyIntersect(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)) crossings++;
    }
  }
  return crossings;
}

function complexityOf(indices: number[], blocks: readonly Point[]): CorsiSequence {
  return { indices, pathLength: pathLength(indices, blocks), crossings: countCrossings(indices, blocks) };
}

function keyOf(indices: number[]): string {
  return indices.join('-');
}

/**
 * Genera `count` sequenze DISTINTE della lunghezza data, tutte con lo stesso
 * numero di incroci e distanza totale entro `complexityTolerance`. Campiona
 * permutazioni casuali, sceglie il valore di incroci più frequente e una
 * distanza di riferimento (mediana), poi seleziona le sequenze compatibili.
 */
export function generateBalancedSequences(
  length: number,
  count: number,
  params: CorsiParams,
  rand: () => number,
  blocks: readonly Point[] = CORSI_BLOCKS,
): CorsiSequence[] {
  const nBlocks = blocks.length;
  const allIndices = Array.from({ length: nBlocks }, (_, i) => i);

  // Campiona candidati unici.
  const candidates: CorsiSequence[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 600 && candidates.length < 300; i++) {
    const perm = shuffle(allIndices, rand).slice(0, length);
    const k = keyOf(perm);
    if (seen.has(k)) continue;
    seen.add(k);
    candidates.push(complexityOf(perm, blocks));
  }

  // Raggruppa per numero di incroci; scegli il gruppo più numeroso.
  const byCrossings = new Map<number, CorsiSequence[]>();
  for (const c of candidates) {
    const arr = byCrossings.get(c.crossings) ?? [];
    arr.push(c);
    byCrossings.set(c.crossings, arr);
  }
  let bestGroup: CorsiSequence[] = [];
  for (const arr of byCrossings.values()) {
    if (arr.length > bestGroup.length) bestGroup = arr;
  }

  // Distanza di riferimento = mediana del gruppo.
  const sortedByPath = [...bestGroup].sort((a, b) => a.pathLength - b.pathLength);
  const ref = sortedByPath[Math.floor(sortedByPath.length / 2)];
  if (!ref) return bestGroup.slice(0, count);

  // Seleziona quelle entro tolleranza; allarga se non bastano.
  for (let tol = params.complexityTolerance; tol <= params.complexityTolerance * 8; tol *= 2) {
    const matching = sortedByPath.filter((c) => Math.abs(c.pathLength - ref.pathLength) <= tol);
    if (matching.length >= count) return matching.slice(0, count);
  }
  return sortedByPath.slice(0, count);
}

/** Span cumulativo: 0.5 punti per trial superato. */
export function corsiSpan(passedTrials: number): number {
  return 0.5 * passedTrials;
}

/** Regola di arresto: si ferma se entrambi i trial del livello sono falliti. */
export function shouldStop(levelResults: readonly boolean[]): boolean {
  return levelResults.length >= 2 && levelResults.every((r) => !r);
}

/** Metriche: span totale, livello massimo raggiunto, trial superati. */
export function scoreCorsi(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test' && t.flag !== 'INTERRUPTED');
  const passed = test.filter((t) => t.correct);
  const maxLevel = passed.reduce((max, t) => {
    const len = t.stimulus.split('-').length;
    return Math.max(max, len);
  }, 0);
  return [
    { label: 'Span (punteggio totale)', value: corsiSpan(passed.length) },
    { label: 'Trial superati', value: passed.length },
    { label: 'Lunghezza massima raggiunta', value: maxLevel },
  ];
}
