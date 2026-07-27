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

/** Ampiezza di distanza di una finestra ordinata (ultimo − primo pathLength). */
function windowSpread(window: readonly CorsiSequence[]): number {
  if (window.length < 2) return 0;
  return (window[window.length - 1] as CorsiSequence).pathLength - (window[0] as CorsiSequence).pathLength;
}

/**
 * Finestra mobile: fra le sequenze ordinate per `pathLength`, ritorna il
 * sottoinsieme CONTIGUO di `count` elementi con la minima ampiezza di distanza —
 * cioè il gruppo di difficoltà più simile in assoluto (non "entro una soglia").
 */
function tightestWindow(sorted: readonly CorsiSequence[], count: number): CorsiSequence[] {
  if (sorted.length <= count) return sorted.slice();
  let bestStart = 0;
  let bestSpread = Infinity;
  for (let i = 0; i + count <= sorted.length; i++) {
    const spread = (sorted[i + count - 1] as CorsiSequence).pathLength - (sorted[i] as CorsiSequence).pathLength;
    if (spread < bestSpread) {
      bestSpread = spread;
      bestStart = i;
    }
  }
  return sorted.slice(bestStart, bestStart + count);
}

/**
 * Nel gruppo di incroci più numeroso (per mantenere UNIFORME il numero di
 * incroci fra le sequenze di uno stesso livello), estrae la finestra mobile di
 * `count` sequenze più stretta per `pathLength`. Ritorna null se il gruppo più
 * uniforme non ha abbastanza sequenze.
 */
function bestUniformWindow(candidates: readonly CorsiSequence[], count: number): CorsiSequence[] | null {
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
  if (bestGroup.length < count) return null;
  const sorted = [...bestGroup].sort((a, b) => a.pathLength - b.pathLength);
  return tightestWindow(sorted, count);
}

/**
 * Genera `count` sequenze DISTINTE della lunghezza data, con lo STESSO numero di
 * incroci e la distanza percorsa più simile possibile.
 *
 * Strategia: campiona permutazioni uniche accumulando un pool di candidati; ogni
 * tanto prova a estrarre la finestra mobile più stretta nel gruppo di incroci più
 * numeroso e si ferma appena la sua ampiezza rientra in `complexityTolerance`
 * (campionamento adattivo: più stretta è la tolleranza richiesta, più a lungo
 * cerca). Esaurito il budget, ritorna comunque la migliore finestra uniforme
 * trovata; solo come ultima risorsa (candidati insufficienti) ripiega sul pool
 * globale ordinato per distanza.
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

  const HARD_CAP = 2000; // tetto ai campionamenti (evita loop infiniti su lunghezze estreme)
  const MIN_POOL = 200; // candidati minimi prima di tentare l'estrazione
  const candidates: CorsiSequence[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < HARD_CAP; i++) {
    const perm = shuffle(allIndices, rand).slice(0, length);
    const k = keyOf(perm);
    if (!seen.has(k)) {
      seen.add(k);
      candidates.push(complexityOf(perm, blocks));
    }
    // Prova un'estrazione periodica: se già abbastanza stretta, ci fermiamo.
    if (candidates.length >= MIN_POOL && i % 50 === 0) {
      const w = bestUniformWindow(candidates, count);
      if (w && windowSpread(w) <= params.complexityTolerance) return w;
    }
  }

  // Miglior sforzo con quanto raccolto: finestra uniforme più stretta…
  const uniform = bestUniformWindow(candidates, count);
  if (uniform) return uniform;
  // …oppure, se non ci sono abbastanza sequenze a incroci uniformi, pool globale.
  const allSorted = [...candidates].sort((a, b) => a.pathLength - b.pathLength);
  return tightestWindow(allSorted, count);
}

/**
 * Punteggio Corsi ponderato (cumulativo). Assume superati i livelli sotto
 * `startLength` (baseline `startLength − 1`, poiché la somministrazione parte da
 * lì) e aggiunge 0.5 per ogni trial superato — con 2 trial per livello, superare
 * entrambi i trial di lunghezza L porta il punteggio esattamente a L. Ritorna 0
 * se nessun trial è stato superato (fallimento al primo livello somministrato).
 */
export function corsiSpan(passedTrials: number, startLength = 2): number {
  if (passedTrials <= 0) return 0;
  return startLength - 1 + 0.5 * passedTrials;
}

/** Regola di arresto: si ferma se entrambi i trial del livello sono falliti. */
export function shouldStop(levelResults: readonly boolean[]): boolean {
  return levelResults.length >= 2 && levelResults.every((r) => !r);
}

/**
 * Metriche cliniche standard:
 * - Span Visuo-Spaziale (MBS, Maximum Block Span): la lunghezza massima di
 *   sequenza riprodotta correttamente — l'indice classico di Corsi.
 * - Punteggio Corsi (Ponderato): punteggio cumulativo ancorato a `startLength`.
 * - Trial totali superati.
 */
export function scoreCorsi(trials: readonly TrialResult[], startLength = 2): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test' && t.flag !== 'INTERRUPTED');
  const passed = test.filter((t) => t.correct);
  const mbs = passed.reduce((max, t) => Math.max(max, t.stimulus.split('-').length), 0);
  return [
    { label: 'Span Visuo-Spaziale (MBS)', value: mbs },
    { label: 'Punteggio Corsi (Ponderato)', value: corsiSpan(passed.length, startLength) },
    { label: 'Trial totali superati', value: passed.length },
  ];
}
