/**
 * Motore usato dall'interfaccia: Rust/WebAssembly quando è caricato, TypeScript altrimenti.
 * I motori TypeScript restano il riferimento (oracolo) e il ripiego: se il modulo non si carica o rifiuta una richiesta,
 * il risultato viene dal TS, che per costruzione produce le stesse sequenze e le stesse metriche (fixture golden).
 */
import { mulberry32 } from '../rng';
import type { SummaryMetric, TrialResult } from '../types';
import {
  generateBalancedSequences,
  scoreCorsi as scoreCorsiTs,
  type CorsiParams,
  type CorsiSequence,
} from '../tests/corsi';
import { generateFlanker, scoreFlanker as scoreFlankerTs } from '../tests/flanker';
import { generateGoNoGo, scoreGoNoGo as scoreGoNoGoTs } from '../tests/gonogo';
import { generateMentalRotation, scoreMentalRotation as scoreMentalRotationTs } from '../tests/mentalRotation';
import { generateNBack, scoreNBack as scoreNBackTs } from '../tests/nback';
import { generatePvt, scorePvt as scorePvtTs } from '../tests/pvt';
import { generateSart, scoreSart as scoreSartTs } from '../tests/sart';
import { generateStroop, scoreStroop as scoreStroopTs } from '../tests/stroop';
import { generateTrail, scoreTrailMaking as scoreTrailMakingTs, type TrailCircle, type TrailPart } from '../tests/trailMaking';
import { generateVisualSearch, scoreVisualSearch as scoreVisualSearchTs } from '../tests/visualSearch';
import {
  buildDeck,
  scoreWcst as scoreWcstTs,
  type WcstCard,
  type WcstParams,
  type WcstTrialMeta,
} from '../tests/wcst';
import { loadEngine, type EngineRequest, type WasmEngine } from './wasmEngine';

export type EngineBackend = 'wasm' | 'ts';

/** Percorso del modulo, servito dalla stessa origine (vedi `public/engine/`). */
export const ENGINE_WASM_URL = `${import.meta.env.BASE_URL}engine/sintropia-engine.wasm`;

let engine: WasmEngine | null = null;
let loading: Promise<void> | null = null;

/** Avvia (una sola volta) il caricamento del modulo. Non lancia mai: in caso di errore resta attivo il TS. */
export function initEngine(url: string = ENGINE_WASM_URL): Promise<void> {
  loading ??= loadEngine(url).then(
    (loaded) => {
      engine = loaded;
    },
    () => undefined,
  );
  return loading;
}

/** Collega un motore già istanziato (test) oppure `null` per tornare al TypeScript. */
export function useEngine(instance: WasmEngine | null): void {
  engine = instance;
  loading = instance ? Promise.resolve() : null;
}

export function activeBackend(): EngineBackend {
  return engine ? 'wasm' : 'ts';
}

/** Versione del motore Rust (`ENGINE_VERSION`), `null` se il modulo non è caricato. */
export function wasmEngineVersion(): string | null {
  return tryCall<string>({ op: 'version' });
}

function tryRequest<T>(request: EngineRequest): { ok: T; calls?: number } | null {
  if (!engine) return null;
  try {
    return engine.request<T>(request);
  } catch {
    return null;
  }
}

function tryCall<T>(request: EngineRequest): T | null {
  return tryRequest<T>(request)?.ok ?? null;
}

/** Il JSON non rappresenta NaN/Infinity: il Rust li scrive `null`, il TS li produce come `NaN`. */
function restoreNaN(metrics: SummaryMetric[]): SummaryMetric[] {
  return metrics.map((m) => (m.value === null ? { ...m, value: Number.NaN } : m));
}

type Params<F> = F extends (params: infer P, rand: () => number) => unknown ? P : never;
type Item<F> = F extends (params: never, rand: () => number) => (infer T)[] ? T : never;

/** Sequenza di stimoli dal seme: stesso contratto di `generateX(params, mulberry32(seed))`. */
function seededGenerator<F extends (params: never, rand: () => number) => unknown[]>(test: string, ts: F) {
  return (params: Params<F>, seed: number): Item<F>[] =>
    tryCall<Item<F>[]>({ op: 'generate', test, seed, params }) ?? (ts(params as never, mulberry32(seed)) as Item<F>[]);
}

function scorer(
  test: string,
  ts: (trials: readonly TrialResult[]) => SummaryMetric[],
): (trials: readonly TrialResult[]) => SummaryMetric[] {
  return (trials) => {
    const metrics = tryCall<SummaryMetric[]>({ op: 'score', test, trials });
    return metrics ? restoreNaN(metrics) : ts(trials);
  };
}

export const generateStroopSeeded = seededGenerator('stroop', generateStroop);
export const generateGoNoGoSeeded = seededGenerator('gonogo', generateGoNoGo);
export const generateFlankerSeeded = seededGenerator('flanker', generateFlanker);
export const generateSartSeeded = seededGenerator('sart', generateSart);
export const generateVisualSearchSeeded = seededGenerator('visual_search', generateVisualSearch);
export const generatePvtSeeded = seededGenerator('pvt', generatePvt);
export const generateNBackSeeded = seededGenerator('nback', generateNBack);
export const generateMentalRotationSeeded = seededGenerator('mental_rotation', generateMentalRotation);

export const scoreStroop = scorer('stroop', scoreStroopTs);
export const scoreGoNoGo = scorer('gonogo', scoreGoNoGoTs);
export const scoreFlanker = scorer('flanker', scoreFlankerTs);
export const scoreSart = scorer('sart', scoreSartTs);
export const scoreVisualSearch = scorer('visual_search', scoreVisualSearchTs);
export const scorePvt = scorer('pvt', scorePvtTs);
export const scoreMentalRotation = scorer('mental_rotation', scoreMentalRotationTs);

/** N-Back: la ripartizione in quartili entra nella metrica, quindi è un argomento in più. */
export function scoreNBack(trials: readonly TrialResult[], nQuartiles = 4): SummaryMetric[] {
  const metrics = tryCall<SummaryMetric[]>({ op: 'score', test: 'nback', trials, extra: { nQuartiles } });
  return metrics ? restoreNaN(metrics) : scoreNBackTs(trials, nQuartiles);
}

export function scoreCorsi(trials: readonly TrialResult[], startLength = 2): SummaryMetric[] {
  const metrics = tryCall<SummaryMetric[]>({ op: 'score', test: 'corsi', trials, extra: { startLength } });
  return metrics ? restoreNaN(metrics) : scoreCorsiTs(trials, startLength);
}

export function scoreTrailMaking(trials: readonly TrialResult[], nTargets: number): SummaryMetric[] {
  const metrics = tryCall<SummaryMetric[]>({ op: 'score', test: 'trail_making', trials, extra: { nTargets } });
  return metrics ? restoreNaN(metrics) : scoreTrailMakingTs(trials, nTargets);
}

export function scoreWcst(
  trials: readonly TrialResult[],
  metas: readonly WcstTrialMeta[],
  params: WcstParams,
): SummaryMetric[] {
  const metrics = tryCall<SummaryMetric[]>({ op: 'score', test: 'wcst', trials, extra: { metas, wcst: params } });
  return metrics ? restoreNaN(metrics) : scoreWcstTs(trials, metas, params);
}

/** Mazzo del WCST dal seme. */
export function buildWcstDeckSeeded(deckSize: number, seed: number): WcstCard[] {
  return (
    tryCall<WcstCard[]>({ op: 'generate', test: 'wcst', seed, args: { deckSize } }) ?? buildDeck(deckSize, mulberry32(seed))
  );
}

/** Costante di avanzamento di `mulberry32`: lo stato cresce di questo valore a ogni estrazione. */
const MULBERRY_STEP = 0x6d2b79f5;

/**
 * Flusso casuale per i test che generano a più riprese (Corsi: un livello alla volta; Trail Making: quattro blocchi).
 * Lo stato è un solo intero e vive qui, non nel modulo: ogni generazione parte da `state` e avanza di
 * `estrazioni × MULBERRY_STEP`, per cui il flusso è lo stesso con Rust o con TypeScript, anche se il backend cambia a metà.
 */
export class RngStream {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  private advance(calls: number): void {
    this.state = (this.state + Math.imul(calls, MULBERRY_STEP)) >>> 0;
  }

  private run<T>(
    test: string,
    request: { params?: unknown; args?: unknown },
    ts: (rand: () => number) => T,
  ): T {
    const wasm = tryRequest<T>({ op: 'generate', test, seed: this.state, ...request });
    if (wasm?.calls !== undefined) {
      this.advance(wasm.calls);
      return wasm.ok;
    }
    const rand = mulberry32(this.state);
    let calls = 0;
    const value = ts(() => {
      calls++;
      return rand();
    });
    this.advance(calls);
    return value;
  }

  corsiSequences(length: number, count: number, params: CorsiParams): CorsiSequence[] {
    return this.run<CorsiSequence[]>('corsi', { params, args: { length, count } }, (rand) =>
      generateBalancedSequences(length, count, params, rand),
    );
  }

  trailCircles(part: TrailPart, n: number): TrailCircle[] {
    return this.run<TrailCircle[]>('trail_making', { args: { part, n } }, (rand) => generateTrail(part, n, rand));
  }
}
