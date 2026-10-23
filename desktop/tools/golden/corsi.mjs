// Fixture golden del Corsi: sequenze bilanciate per livello (RNG condiviso tra i livelli, come nell'app),
// geometria del layout e metriche su trial sintetici.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SEEDS, metricsJson, trial, writeFixture } from './lib.mjs';

register('./hooks.mjs', import.meta.url);

const PARAMS = { startLength: 3, maxLength: 9, trialsPerLevel: 2, presentMsPerBlock: 1000, complexityTolerance: 8 };
const TOLERANCES = [8, 2, 0.5, 100];
const FIXED_SEQUENCES = [[], [3], [0, 0], [0, 1, 2], [0, 1, 2, 3, 4], [8, 7, 6, 5, 4, 3, 2, 1, 0], [0, 8, 1, 7, 2, 6, 3, 5, 4], [1, 4, 7, 2, 5, 8], [4, 2, 6, 0, 8]];

const passed = (i, stimulus, o = {}) => trial('corsi', i, 'corsi', { stimulus, response: stimulus, correct: true, ...o });
const failed = (i, stimulus, o = {}) => trial('corsi', i, 'corsi', { stimulus, response: '9', correct: false, ...o });

export async function build() {
  const { mulberry32 } = await import('../../../src/engine/rng.ts');
  const c = await import('../../../src/engine/tests/corsi.ts');

  const generation = [];
  for (const seed of SEEDS) {
    for (const complexityTolerance of TOLERANCES) {
      const params = { ...PARAMS, complexityTolerance };
      const rand = mulberry32(seed);
      const levels = [];
      for (let length = 2; length <= 9; length++) {
        const sequences = c.generateBalancedSequences(length, 2, params, rand);
        levels.push({ length, count: 2, sequences, nextRand: rand() });
      }
      generation.push({ id: `tol${complexityTolerance}@${seed}`, seed, params, levels });
    }
  }

  // Bit esatti (esadecimale) delle 72 distanze: ogni lunghezza di percorso è una somma di queste,
  // quindi se coincidono bit a bit (Math.hypot di V8 contro f64::hypot) ordinamenti ed estrazioni coincidono per OGNI seme.
  const bits = (x) => { const v = new DataView(new ArrayBuffer(8)); v.setFloat64(0, x); return v.getBigUint64(0).toString(16).padStart(16, '0'); };
  const pairDistanceBits = c.CORSI_BLOCKS.flatMap((_, i) => c.CORSI_BLOCKS.map((__, j) => ({ i, j, bits: bits(c.pathLength([i, j])) })));

  const geometry = {
    pairDistanceBits,
    meanPairwiseDistance: c.meanPairwiseDistance(),
    targetPathLength: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((length) => c.targetPathLength(length)),
    sequences: FIXED_SEQUENCES.map((indices) => ({ indices, pathLength: c.pathLength(indices), crossings: c.countCrossings(indices) })),
  };

  const scoringInputs = {
    empty: { startLength: 3, trials: [] },
    none_passed: { startLength: 3, trials: [failed(0, '0-1-2'), failed(1, '3-4-5')] },
    all_passed_default_start: { startLength: 3, trials: [passed(0, '0-1-2'), passed(1, '3-4-5'), passed(2, '0-1-2-3'), passed(3, '4-5-6-7')] },
    all_passed_start2: { startLength: 2, trials: [passed(0, '0-1'), passed(1, '3-4'), passed(2, '0-1-2')] },
    interrupted_excluded: { startLength: 3, trials: [passed(0, '0-1-2', { flag: 'INTERRUPTED' }), passed(1, '0-1-2-3'), failed(2, '0-1-2-3', { flag: 'INTERRUPTED' })] },
    practice_excluded: { startLength: 3, trials: [passed(0, '0-1-2-3-4-5', { phase: 'practice' }), passed(1, '0-1-2')] },
    mixed_levels: { startLength: 3, trials: [passed(0, '0-1-2'), passed(1, '3-4-5'), passed(2, '0-1-2-3'), failed(3, '4-5-6-7'), failed(4, '1-2-3-4-5'), passed(5, '0-1-2-3-4-5-6')] },
    omission_failed: { startLength: 3, trials: [trial('corsi', 0, 'corsi', { stimulus: '0-1-2', flag: 'OMISSION' }), passed(1, '0-1-2')] },
  };
  const scoring = Object.entries(scoringInputs).map(([id, { startLength, trials }]) => ({
    id, kind: /mixed|all_passed/.test(id) ? 'normal' : 'edge', startLength, trials, metrics: metricsJson(c.scoreCorsi(trials, startLength)),
  }));

  const spans = [0, 1, 2, 5, 8].flatMap((n) => [2, 3].map((startLength) => ({ passed: n, startLength, span: c.corsiSpan(n, startLength) })));
  const stopCases = [[], [false], [false, false], [true, false], [true, true], [false, true], [false, false, false]]
    .map((levelResults) => ({ levelResults, stop: c.shouldStop(levelResults) }));

  return { test: 'corsi', blocks: c.CORSI_BLOCKS, generation, geometry, scoring, spans, stopCases };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) writeFixture('corsi', await build());
