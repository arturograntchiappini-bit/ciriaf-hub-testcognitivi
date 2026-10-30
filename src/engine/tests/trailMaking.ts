/**
 * Trail Making Test A e B — velocità visuo-motoria e flessibilità cognitiva.
 * @see docs/scientific/trail-making.md — Reitan (1958); Tombaugh (2004); Sánchez-Cubillo et al. (2009)
 *
 * Parte A: collegare in ordine i cerchi numerati 1, 2, 3… Parte B: alternare numeri e lettere
 * 1, A, 2, B, 3, C… Si misura il tempo per completare ciascuna parte e gli errori.
 */
import type { SummaryMetric, TrialResult } from '../types';
import { shuffle } from '../rng';
import { mean } from '../validation';

export interface TrailMakingParams {
  /** Cerchi per parte (la parte B alterna numeri e lettere: al massimo 51). */
  nTargets: number;
  /** Cerchi per parte nella pratica. */
  practiceTargets: number;
}

export type TrailPart = 'A' | 'B';

export interface TrailCircle {
  /** Etichetta del cerchio: numero o lettera. */
  label: string;
  /** Posizione nel campo, in [0, 1]. */
  x: number;
  y: number;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Cerchi massimi della parte B: 1, A, 2, B, …, Z, 27. */
const MAX_B_CIRCLES = 2 * LETTERS.length + 1;
const MIN_DISTANCE = 0.11; // distanza minima fra i centri, in frazioni del lato del campo
const MARGIN = 0.06;
const PLACEMENT_ATTEMPTS = 4000;

/** Etichette nell'ordine da collegare: 1…n (A) oppure 1, A, 2, B… (B). */
export function trailLabels(part: TrailPart, n: number): string[] {
  if (part === 'A') return Array.from({ length: n }, (_, i) => String(i + 1));
  // Finite le lettere la sequenza 1, A, 2, B… non può proseguire: la parte B si ferma a MAX_B_CIRCLES.
  return Array.from({ length: Math.min(n, MAX_B_CIRCLES) }, (_, i) => (i % 2 === 0 ? String(i / 2 + 1) : (LETTERS[(i - 1) / 2] as string)));
}

function placePoints(count: number, rand: () => number): [number, number][] {
  const points: [number, number][] = [];
  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS && points.length < count; attempt++) {
    const x = MARGIN + rand() * (1 - 2 * MARGIN);
    const y = MARGIN + rand() * (1 - 2 * MARGIN);
    if (points.every(([px, py]) => Math.hypot(px - x, py - y) >= MIN_DISTANCE)) points.push([x, y]);
  }
  if (points.length >= count) return points;
  // Ripiego: il campo è troppo affollato per l'estrazione casuale. Si scarta tutto e si scelgono `count` celle a caso di
  // una griglia: i centri distano almeno `step`, che fino a 64 cerchi è >= MIN_DISTANCE.
  const side = Math.ceil(Math.sqrt(count));
  const step = (1 - 2 * MARGIN) / side;
  const cells = Array.from({ length: side * side }, (_, i): [number, number] => [MARGIN + ((i % side) + 0.5) * step, MARGIN + (Math.floor(i / side) + 0.5) * step]);
  return shuffle(cells, rand).slice(0, count);
}

/** Cerchi della parte, in ordine di collegamento (`circles[i]` è il bersaglio i-esimo); le posizioni sono casuali. */
export function generateTrail(part: TrailPart, n: number, rand: () => number): TrailCircle[] {
  const labels = trailLabels(part, n);
  const points = shuffle(placePoints(n, rand), rand);
  return labels.map((label, i) => ({ label, x: (points[i] as [number, number])[0], y: (points[i] as [number, number])[1] }));
}

/**
 * Andamento di una parte: registra ogni clic come un trial. Un clic sbagliato non fa avanzare (resta lo stesso
 * bersaglio, il tempo scorre); `rtMs` è il tempo dal clic precedente (o dall'inizio) ed `onsetTimestamp` l'istante di quel
 * riferimento, così la somma degli `rtMs` è il tempo totale della parte.
 */
export class TrailRun {
  private next = 0;
  private lastMs: number;
  private count = 0;

  constructor(
    private readonly circles: readonly TrailCircle[],
    private readonly part: TrailPart,
    private readonly phase: 'practice' | 'test',
    private readonly sessionId: string,
    startMs: number,
  ) {
    this.lastMs = startMs;
  }

  get done(): boolean {
    return this.next >= this.circles.length;
  }

  /** Etichetta del prossimo bersaglio, o null a parte completata. */
  get target(): string | null {
    return this.circles[this.next]?.label ?? null;
  }

  click(circleIndex: number, nowMs: number): TrialResult | null {
    const clicked = this.circles[circleIndex];
    if (this.done || !clicked) return null;
    const correct = circleIndex === this.next;
    const result: TrialResult = {
      testId: 'trailMaking',
      sessionId: this.sessionId,
      trialIndex: this.count++,
      phase: this.phase,
      condition: this.part,
      stimulus: (this.circles[this.next] as TrailCircle).label,
      response: clicked.label,
      correct,
      rtMs: nowMs - this.lastMs,
      flag: 'VALID',
      onsetTimestamp: this.lastMs,
    };
    this.lastMs = nowMs;
    if (correct) this.next++;
    return result;
  }
}

const inPart = (trials: readonly TrialResult[], part: TrailPart): TrialResult[] =>
  trials.filter((t) => t.phase === 'test' && t.condition === part);

const totalMs = (clicks: readonly TrialResult[]): number => clicks.reduce((sum, t) => sum + (t.rtMs ?? 0), 0);
const completed = (clicks: readonly TrialResult[], n: number): boolean => clicks.filter((t) => t.correct).length >= n;

/**
 * Metriche: tempo e errori per parte, differenza e rapporto B − A, B / A (il tempo di una parte conta solo se è
 * stata completata; `nTargets` è il numero di collegamenti corretti richiesti).
 */
export function scoreTrailMaking(trials: readonly TrialResult[], nTargets: number): SummaryMetric[] {
  const a = inPart(trials, 'A');
  const b = inPart(trials, 'B');
  const timeA = completed(a, nTargets) ? totalMs(a) / 1000 : null;
  const timeB = completed(b, nTargets) ? totalMs(b) / 1000 : null;
  const both = timeA !== null && timeB !== null;
  const seconds = (value: number | null): SummaryMetric['value'] => (value === null ? '—' : round2(value));
  return [
    { label: 'Tempo parte A', value: seconds(timeA), unit: timeA === null ? undefined : 's' },
    { label: 'Tempo parte B', value: seconds(timeB), unit: timeB === null ? undefined : 's' },
    { label: 'Differenza B − A', value: both ? round2(timeB - timeA) : '—', unit: both ? 's' : undefined },
    { label: 'Rapporto B / A', value: both && timeA > 0 ? round2(timeB / timeA) : '—' },
    { label: 'Errori parte A', value: a.filter((t) => !t.correct).length },
    { label: 'Errori parte B', value: b.filter((t) => !t.correct).length },
    { label: 'Tempo medio per collegamento A', value: a.length > 0 ? round2(mean(a.map((t) => t.rtMs ?? 0)) / 1000) : '—', unit: a.length > 0 ? 's' : undefined },
    { label: 'Tempo medio per collegamento B', value: b.length > 0 ? round2(mean(b.map((t) => t.rtMs ?? 0)) / 1000) : '—', unit: b.length > 0 ? 's' : undefined },
  ];
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
