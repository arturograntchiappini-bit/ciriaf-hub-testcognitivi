/**
 * Parità fra il motore Rust/WebAssembly e il TypeScript (oracolo): stessi seed e stessi parametri delle fixture golden
 * devono dare le stesse sequenze e le stesse metriche. Carica il modulo committato in `public/engine/`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import type { SummaryMetric, TrialResult } from '../types';
import { generateFlanker } from '../tests/flanker';
import { generateGoNoGo } from '../tests/gonogo';
import { generateMentalRotation } from '../tests/mentalRotation';
import { generateNBack } from '../tests/nback';
import { generatePvt } from '../tests/pvt';
import { generateSart } from '../tests/sart';
import { generateStroop } from '../tests/stroop';
import { generateVisualSearch } from '../tests/visualSearch';
import { activeBackend, buildWcstDeckSeeded, RngStream, useEngine, wasmEngineVersion } from './index';
import { instantiateEngine, type WasmEngine } from './wasmEngine';

const FLOAT_TOLERANCE = 1e-9;
const root = resolve(import.meta.dirname, '../../..');

interface GenerationCase {
  id: string;
  seed: number;
  params: Record<string, unknown>;
}
interface ScoringCase {
  id: string;
  trials: TrialResult[];
  metrics: SummaryMetric[];
  nQuartiles?: number;
}
interface Fixture {
  generation: GenerationCase[];
  scoring: ScoringCase[];
}

const loadFixture = (name: string): Fixture =>
  JSON.parse(readFileSync(resolve(root, `desktop/fixtures/${name}.json`), 'utf-8')) as Fixture;

function expectClose(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === 'number' && typeof actual === 'number') {
    expect(Math.abs(actual - expected), path).toBeLessThanOrEqual(FLOAT_TOLERANCE);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, `${path}.length`).toBe(expected.length);
    expected.forEach((e, i) => expectClose((actual as unknown[])[i], e, `${path}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    const keys = Object.keys(expected);
    expect(Object.keys(actual as object).sort(), `${path} chiavi`).toEqual(keys.sort());
    for (const k of keys) {
      expectClose((actual as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k], `${path}.${k}`);
    }
  } else {
    expect(actual, path).toEqual(expected);
  }
}

/** Il TS produce NaN/undefined dove il JSON ha null/assenza: si confronta la forma serializzata. */
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

type Generator = (params: never, rand: () => number) => unknown[];
const RT_TESTS: { name: string; generate: Generator }[] = [
  { name: 'stroop', generate: generateStroop },
  { name: 'gonogo', generate: generateGoNoGo },
  { name: 'flanker', generate: generateFlanker },
  { name: 'sart', generate: generateSart },
  { name: 'visual_search', generate: generateVisualSearch },
  { name: 'pvt', generate: generatePvt },
  { name: 'nback', generate: generateNBack },
  { name: 'mental_rotation', generate: generateMentalRotation },
];

let engine: WasmEngine;

beforeAll(async () => {
  engine = await instantiateEngine(readFileSync(resolve(root, 'public/engine/sintropia-engine.wasm')));
  useEngine(engine);
});

describe('motore WASM ↔ TypeScript', () => {
  it('should_report_engine_version_and_active_backend', () => {
    expect(activeBackend()).toBe('wasm');
    expect(wasmEngineVersion()).toBe('0.2.0');
  });

  it('should_fall_back_to_typescript_when_no_engine_is_loaded', () => {
    useEngine(null);
    expect(activeBackend()).toBe('ts');
    expect(wasmEngineVersion()).toBeNull();
    useEngine(engine);
  });

  it('should_return_an_error_for_an_unknown_request', () => {
    expect(() => engine.call({ op: 'generate', test: 'inesistente', seed: 1 })).toThrow(/sconosciuto/);
    expect(() => engine.call({ op: 'generate', test: 'stroop', seed: 1, params: { nTrials: 'x' } })).toThrow();
  });

  for (const { name, generate } of RT_TESTS) {
    describe(name, () => {
      const data = loadFixture(name);

      it.each(data.generation.map((c) => [c.id, c] as const))('should_generate_same_sequence_as_ts: %s', (_id, c) => {
        const fromWasm = engine.call<unknown[]>({ op: 'generate', test: name, seed: c.seed, params: c.params });
        const fromTs = asJson(generate(c.params as never, mulberry32(c.seed)));
        expectClose(fromWasm, fromTs, `${name}/${c.id}`);
      });

      it.each(data.scoring.map((c) => [c.id, c] as const))('should_score_like_the_golden_fixture: %s', (_id, c) => {
        const extra = name === 'nback' ? { nQuartiles: c.nQuartiles } : undefined;
        const metrics = engine.call<SummaryMetric[]>({ op: 'score', test: name, trials: c.trials, extra });
        expectClose(metrics, asJson(c.metrics), `${name}/${c.id}`);
      });
    });
  }

  describe('test con più chiamate o parametri extra', () => {
    interface CorsiCase extends GenerationCase {
      levels: { length: number; count: number; sequences: unknown[] }[];
    }
    const corsi = loadFixture('corsi') as unknown as {
      generation: CorsiCase[];
      scoring: (ScoringCase & { startLength: number })[];
    };

    it.each(corsi.generation.map((c) => [c.id, c] as const))(
      'should_continue_the_same_stream_across_corsi_levels: %s',
      (_id, c) => {
        const wasmStream = new RngStream(c.seed);
        useEngine(null);
        const tsStream = new RngStream(c.seed);
        useEngine(engine);
        for (const level of c.levels) {
          const params = c.params as never;
          const fromWasm = wasmStream.corsiSequences(level.length, level.count, params);
          expectClose(fromWasm, level.sequences, `corsi/${c.id}/L${level.length}`);
          useEngine(null);
          const fromTs = tsStream.corsiSequences(level.length, level.count, params);
          useEngine(engine);
          expectClose(asJson(fromTs), level.sequences, `corsi-ts/${c.id}/L${level.length}`);
          // Il generatore delle fixture estrae un numero in più dopo ogni livello (`nextRand`): si fa lo stesso.
          for (const stream of [wasmStream, tsStream]) (stream as unknown as { advance(n: number): void }).advance(1);
        }
      },
    );

    it.each(corsi.scoring.map((c) => [c.id, c] as const))('should_score_corsi_like_the_fixture: %s', (_id, c) => {
      const metrics = engine.call<SummaryMetric[]>({
        op: 'score',
        test: 'corsi',
        trials: c.trials,
        extra: { startLength: c.startLength },
      });
      expectClose(metrics, asJson(c.metrics), `corsi/${c.id}`);
    });

    const trail = loadFixture('trail_making') as unknown as {
      generation: { id: string; seed: number; params: { part: 'A' | 'B'; n: number }; stimuli: unknown[] }[];
      scoring: (ScoringCase & { nTargets: number })[];
    };

    it.each(trail.generation.map((c) => [c.id, c] as const))('should_generate_trail_like_the_fixture: %s', (_id, c) => {
      const circles = new RngStream(c.seed).trailCircles(c.params.part, c.params.n);
      expectClose(circles, c.stimuli, `trail/${c.id}`);
    });

    it.each(trail.scoring.map((c) => [c.id, c] as const))('should_score_trail_like_the_fixture: %s', (_id, c) => {
      const metrics = engine.call<SummaryMetric[]>({
        op: 'score',
        test: 'trail_making',
        trials: c.trials,
        extra: { nTargets: c.nTargets },
      });
      expectClose(metrics, asJson(c.metrics), `trail/${c.id}`);
    });

    const wcst = loadFixture('wcst') as unknown as {
      generation: { id: string; seed: number; deckSize: number; deck: unknown[] }[];
      scoring: (ScoringCase & { params: unknown; metas: unknown[] })[];
    };

    it.each(wcst.generation.map((c) => [c.id, c] as const))('should_build_wcst_deck_like_the_fixture: %s', (_id, c) => {
      expectClose(buildWcstDeckSeeded(c.deckSize, c.seed), c.deck, `wcst/${c.id}`);
    });

    it.each(wcst.scoring.map((c) => [c.id, c] as const))('should_score_wcst_like_the_fixture: %s', (_id, c) => {
      const metrics = engine.call<SummaryMetric[]>({
        op: 'score',
        test: 'wcst',
        trials: c.trials,
        extra: { metas: c.metas, wcst: c.params },
      });
      expectClose(metrics, asJson(c.metrics), `wcst/${c.id}`);
    });
  });
});
