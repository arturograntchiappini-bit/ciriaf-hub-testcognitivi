// Fixture golden dell'N-Back: lettere, target e lure per n = 1, 2, 3 e lureRate 0 / 0.2 / assente,
// più d' / criterio e metriche su trial sintetici.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SEEDS, metricsJson, trial, writeFixture } from './lib.mjs';

register('./hooks.mjs', import.meta.url);

const BASE = { n: 2, letterMs: 500, blankMs: 1500, nTrials: 360, targetRate: 0.3, lureRate: 0.2, practiceTrials: 20 };
const withoutLure = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'lureRate'));

const VARIANTS = [];
for (const n of [1, 2, 3]) {
  for (const nTrials of [360, 40]) {
    for (const lure of [0, 0.2, 'assente']) {
      const params = { ...BASE, n, nTrials, ...(lure === 'assente' ? {} : { lureRate: lure }) };
      VARIANTS.push({ variant: `n${n}-t${nTrials}-lure${lure}`, params: lure === 'assente' ? withoutLure(params) : params });
    }
  }
}
VARIANTS.push(
  { variant: 'target-quasi-tutti', params: { ...BASE, nTrials: 30, targetRate: 0.9, lureRate: 1 } },
  { variant: 'n3-lure-metà', params: { ...BASE, n: 3, nTrials: 100, targetRate: 0.5, lureRate: 0.5 } },
  { variant: 'n4', params: { ...BASE, n: 4, nTrials: 80 } },
  { variant: 'nessun-target-possibile', params: { ...BASE, nTrials: 2 } },
  { variant: 'target-zero', params: { ...BASE, nTrials: 50, targetRate: 0 } },
);

const T = (i, condition, responded, o = {}) =>
  trial('nback', i, condition, { stimulus: 'B', response: responded ? 'space' : null, correct: (condition === 'target') === responded, rtMs: responded ? 420 + i : null, ...o });

export async function build() {
  const { mulberry32 } = await import('../../../src/engine/rng.ts');
  const nb = await import('../../../src/engine/tests/nback.ts');

  const generation = VARIANTS.flatMap(({ variant, params }) => SEEDS.map((seed) => {
    const rand = mulberry32(seed);
    const stimuli = nb.generateNBack(params, rand);
    return {
      id: `${variant}@${seed}`, variant, seed, params,
      letters: stimuli.map((s) => s.letter).join(''),
      targets: stimuli.flatMap((s, i) => (s.isTarget ? [i] : [])),
      lures: stimuli.flatMap((s, i) => (s.isLure ? [i] : [])),
      nextRand: rand(),
    };
  }));

  const rand = mulberry32(99);
  const randomSession = (n, withLures) => Array.from({ length: n }, (_, i) => {
    const r = rand();
    const condition = r < 0.3 ? 'target' : withLures && r < 0.5 ? 'lure' : 'nontarget';
    const responded = rand() < (condition === 'target' ? 0.75 : 0.12);
    return T(i, condition, responded, responded && rand() < 0.1 ? { flag: 'ANTICIPATION', rtMs: 100 } : {});
  });
  const cases = {
    empty: [],
    only_targets_all_hit: Array.from({ length: 6 }, (_, i) => T(i, 'target', true)),
    only_nontargets_no_fa: Array.from({ length: 6 }, (_, i) => T(i, 'nontarget', false)),
    no_targets_with_fa: [T(0, 'nontarget', true), T(1, 'nontarget', false), T(2, 'lure', true)],
    all_misses: Array.from({ length: 8 }, (_, i) => T(i, 'target', false)),
    lures_only_fa: [T(0, 'lure', true), T(1, 'lure', true), T(2, 'lure', false), T(3, 'target', true), T(4, 'nontarget', false)],
    interrupted_excluded: [T(0, 'target', true, { flag: 'INTERRUPTED' }), T(1, 'target', true), T(2, 'nontarget', true, { flag: 'INTERRUPTED' }), T(3, 'nontarget', false)],
    practice_excluded: [T(0, 'target', true, { phase: 'practice' }), T(1, 'target', true), T(2, 'nontarget', false)],
    hit_with_null_rt_excluded_from_rt: [T(0, 'target', true, { rtMs: null }), T(1, 'target', true, { rtMs: 500 })],
    anticipated_hit: [T(0, 'target', true, { flag: 'ANTICIPATION', rtMs: 100 }), T(1, 'target', true, { rtMs: 450 })],
    fewer_trials_than_quartiles: [T(0, 'target', true), T(1, 'nontarget', false)],
    random_no_lures: randomSession(40, false),
    random_with_lures: randomSession(120, true),
    random_long: randomSession(360, true),
    unknown_condition_ignored: [T(0, 'catch', true), T(1, 'target', true)],
  };
  const scoring = Object.entries(cases).flatMap(([id, trials]) =>
    [4, 2].map((nQuartiles) => ({ id: `${id}/q${nQuartiles}`, kind: id.startsWith("random") ? "normal" : "edge", nQuartiles, trials, metrics: metricsJson(nb.scoreNBack(trials, nQuartiles)) })));

  const probit = [1e-9, 1e-6, 0.001, 0.02, 0.02425, 0.03, 0.1, 0.25, 0.5, 0.75, 0.9, 0.97, 0.97575, 0.98, 0.999, 1 - 1e-6]
    .map((p) => ({ p, value: nb.probit(p) }));
  const sdt = [[0, 0, 0, 0], [10, 10, 0, 20], [0, 10, 10, 20], [5, 10, 5, 20], [7, 12, 3, 28], [12, 12, 28, 28], [0, 0, 5, 5], [100, 108, 12, 252]]
    .map(([hits, targets, fa, nonTargets]) => ({ hits, targets, fa, nonTargets, dPrime: nb.dPrime(hits, targets, fa, nonTargets), c: nb.criterionC(hits, targets, fa, nonTargets) }));
  const chunks = [[[], 4], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4], [[1, 2, 3], 4], [[1, 2, 3, 4, 5], 2], [[1], 4]]
    .map(([items, k]) => ({ items, k, chunks: nb.splitIntoChunks(items, k) }));

  return { test: 'nback', letters: nb.NBACK_LETTERS.join(''), generation, scoring, probit, sdt, chunks };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) writeFixture('nback', await build());
