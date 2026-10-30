/**
 * Visual Search — ricerca visiva di caratteristica e di congiunzione.
 * @see docs/scientific/visual-search.md — Treisman & Gelade (1980)
 *
 * Il bersaglio è un cerchio arancione. Nella ricerca di CARATTERISTICA i distrattori sono cerchi blu
 * (il bersaglio si distingue per un solo attributo, il colore); nella ricerca di CONGIUNZIONE metà dei
 * distrattori sono quadrati arancioni e metà cerchi blu (il bersaglio si distingue solo per la combinazione
 * di colore e forma). Si risponde se il bersaglio è presente o assente; la pendenza del tempo di
 * reazione in funzione del numero di elementi misura l'efficienza della ricerca.
 */
import type { SummaryMetric, TrialResult } from '../types';
import { shuffle } from '../rng';
import { mean, countFlag } from '../validation';
import { leastSquares } from '../regression';

export interface VisualSearchParams {
  /** Trial totali; un multiplo di 12 bilancia tipo × numerosità × presenza. */
  nTrials: number;
  fixationMs: number;
  /** Tempo massimo per rispondere (ms): oltre = omissione. */
  responseWindowMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  practiceTrials: number;
}

export type SearchType = 'feature' | 'conjunction';
export type SearchColor = 'orange' | 'blue';
export type SearchShape = 'circle' | 'square';

export interface SearchItem {
  /** Posizione nel campo, in [0, 1]. */
  x: number;
  y: number;
  color: SearchColor;
  shape: SearchShape;
  isTarget: boolean;
}

export interface VisualSearchStimulus {
  type: SearchType;
  setSize: number;
  present: boolean;
  items: SearchItem[];
  isiMs: number;
}

export const SEARCH_SET_SIZES: readonly number[] = [4, 8, 16];
const GRID = 6; // celle per lato: 36 posizioni, ognuna con un piccolo scarto casuale
const JITTER = 0.3;

/** Etichetta della condizione, letta dallo scoring: `tipo-presenza-numerosità`. */
export function conditionLabel(type: SearchType, present: boolean, setSize: number): string {
  return `${type}-${present ? 'present' : 'absent'}-${setSize}`;
}

function parseCondition(condition: string): { type: SearchType; present: boolean; setSize: number } | null {
  const [type, presence, size] = condition.split('-');
  if ((type !== 'feature' && type !== 'conjunction') || (presence !== 'present' && presence !== 'absent')) return null;
  if (size === undefined || size.trim() === '') return null; // Number('') === 0 farebbe passare una numerosità vuota
  const setSize = Number(size);
  return Number.isInteger(setSize) ? { type, present: presence === 'present', setSize } : null;
}

/** Distrattori: cerchi blu (caratteristica) oppure metà quadrati arancioni e metà cerchi blu (congiunzione). */
function distractors(type: SearchType, count: number): Pick<SearchItem, 'color' | 'shape'>[] {
  if (type === 'feature') return Array.from({ length: count }, () => ({ color: 'blue', shape: 'circle' }));
  const orangeSquares = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) =>
    i < orangeSquares ? { color: 'orange', shape: 'square' } : { color: 'blue', shape: 'circle' },
  );
}

function placeItems(setSize: number, present: boolean, type: SearchType, rand: () => number): SearchItem[] {
  const cells = shuffle(Array.from({ length: GRID * GRID }, (_, i) => i), rand).slice(0, setSize);
  const kinds: Pick<SearchItem, 'color' | 'shape'>[] = shuffle(
    [
      ...(present ? [{ color: 'orange', shape: 'circle' } as const] : []),
      ...distractors(type, present ? setSize - 1 : setSize),
    ],
    rand,
  );
  return cells.map((cell, i) => {
    const kind = kinds[i] as Pick<SearchItem, 'color' | 'shape'>;
    return {
      x: ((cell % GRID) + 0.5 + (rand() - 0.5) * JITTER * 2) / GRID,
      y: ((Math.floor(cell / GRID) + 0.5 + (rand() - 0.5) * JITTER * 2) / GRID),
      ...kind,
      isTarget: kind.color === 'orange' && kind.shape === 'circle',
    };
  });
}

/**
 * Genera la sequenza: ogni cella tipo × numerosità × presenza compare lo stesso numero di volte
 * (le eventuali prove in più sono estratte a caso), in ordine casuale, con ISI uniforme.
 */
export function generateVisualSearch(params: VisualSearchParams, rand: () => number): VisualSearchStimulus[] {
  const cells = (['feature', 'conjunction'] as const).flatMap((type) =>
    SEARCH_SET_SIZES.flatMap((setSize) => [true, false].map((present) => ({ type, setSize, present }))),
  );
  const base = Math.floor(params.nTrials / cells.length);
  const extra = shuffle(cells, rand).slice(0, params.nTrials - base * cells.length);
  const plan = shuffle([...cells.flatMap((cell) => Array<typeof cell>(base).fill(cell)), ...extra], rand);
  const span = params.isiMaxMs - params.isiMinMs;
  return plan.map(({ type, setSize, present }) => ({
    type,
    setSize,
    present,
    items: placeItems(setSize, present, type, rand),
    isiMs: params.isiMinMs + Math.floor(rand() * (span + 1)),
  }));
}

const usable = (t: TrialResult): boolean => t.phase === 'test' && t.flag === 'VALID' && t.correct && t.rtMs !== null;

/** Pendenza (ms per elemento) e intercetta dell'RT medio dei corretti validi, per tipo e presenza. */
export function searchSlope(
  trials: readonly TrialResult[],
  type: SearchType,
  present: boolean,
): { slope: number; intercept: number } | null {
  const bySize = new Map<number, number[]>();
  for (const t of trials.filter(usable)) {
    const c = parseCondition(t.condition);
    if (c?.type !== type || c.present !== present) continue;
    bySize.set(c.setSize, [...(bySize.get(c.setSize) ?? []), t.rtMs as number]);
  }
  return leastSquares([...bySize].map(([size, rts]) => [size, mean(rts)] as const));
}

function accuracyPercent(trials: readonly TrialResult[]): number {
  const valid = trials.filter((t) => t.flag !== 'INTERRUPTED');
  return valid.length > 0 ? (valid.filter((t) => t.correct).length / valid.length) * 100 : 0;
}

const rtMean = (trials: readonly TrialResult[]): number => mean(trials.filter(usable).map((t) => t.rtMs as number));

/**
 * Metriche: RT e accuratezza per tipo di ricerca, pendenze (ms/elemento) a bersaglio presente e assente,
 * rapporto assente/presente. Le omissioni contano come errori; i trial interrotti sono esclusi.
 */
export function scoreVisualSearch(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const ofType = (type: SearchType): TrialResult[] => test.filter((t) => parseCondition(t.condition)?.type === type);
  const metrics: SummaryMetric[] = [];
  for (const [type, name] of [['feature', 'caratteristica'], ['conjunction', 'congiunzione']] as const) {
    const group = ofType(type);
    metrics.push(
      { label: `RT medio ${name}`, value: round1(rtMean(group)), unit: 'ms' },
      { label: `Accuratezza ${name}`, value: round1(accuracyPercent(group)), unit: '%' },
    );
    for (const present of [true, false]) {
      const fit = searchSlope(test, type, present);
      metrics.push({
        label: `Pendenza ${name} (bersaglio ${present ? 'presente' : 'assente'})`,
        value: fit ? round1(fit.slope) : '—',
        unit: fit ? 'ms/elemento' : undefined,
      });
    }
  }
  const present = searchSlope(test, 'conjunction', true);
  const absent = searchSlope(test, 'conjunction', false);
  metrics.push(
    {
      label: 'Rapporto pendenze congiunzione (assente / presente)',
      value: present && absent && present.slope > 0 ? round2(absent.slope / present.slope) : '—',
    },
    { label: 'Errori di omissione', value: countFlag(test, 'OMISSION') },
    { label: 'Errori di anticipazione', value: countFlag(test, 'ANTICIPATION') },
  );
  return metrics;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
