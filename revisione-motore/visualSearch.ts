/**
 * ============================================================================
 *  COPIA STANDALONE — Visual Search (ricerca di caratteristica e di congiunzione)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/visualSearch.ts
 *  Riferimenti scientifici:       docs/scientific/visual-search.md — Treisman & Gelade (1980)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/visualSearch.ts
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

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function countFlag(trials: readonly TrialResult[], flag: ValidationFlag): number {
  return trials.filter((t) => t.phase === 'test' && t.flag === flag).length;
}

function leastSquares(points: readonly (readonly [number, number])[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const mx = mean(points.map(([x]) => x));
  const my = mean(points.map(([, y]) => y));
  const sxx = points.reduce((sum, [x]) => sum + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = points.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0) / sxx;
  return { slope, intercept: my - slope * mx };
}

/* ============================ CORE DEL TEST ============================ */

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

/* ================================ DEMO ================================ */
(function demo(): void {
  const params: VisualSearchParams = { nTrials: 12, fixationMs: 500, responseWindowMs: 4000, isiMinMs: 700, isiMaxMs: 1100, practiceTrials: 0 };
  const seq = generateVisualSearch(params, mulberry32(5));
  console.log(`Visual Search demo — ${seq.length} trial`);
  for (const s of seq) console.log(`  ${s.type.padEnd(11)} n=${String(s.setSize).padStart(2)} ${s.present ? 'presente' : 'assente '} (${s.items.length} elementi)`);
})();
