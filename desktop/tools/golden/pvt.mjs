// Fixture golden del PVT: sequenze ISI per semi/parametri fissi e metriche su trial sintetici.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SEEDS, generationCases, metricsJson, trial, writeFixture } from './lib.mjs';

register('./hooks.mjs', import.meta.url);

const DEFAULTS = { nTrials: 100, stimulusMaxMs: 10000, isiMinMs: 2000, isiMaxMs: 10000, practiceTrials: 5 };
const VARIANTS = [
  { variant: 'default', params: DEFAULTS },
  { variant: 'isi-uguali', params: { ...DEFAULTS, nTrials: 30, isiMinMs: 3000, isiMaxMs: 3000 } },
  { variant: 'isi-stretto', params: { ...DEFAULTS, nTrials: 250, isiMinMs: 1, isiMaxMs: 4 } },
  { variant: 'zero-trial', params: { ...DEFAULTS, nTrials: 0 } },
];

const valid = (i, rt, o = {}) => trial('pvt', i, 'pvt', { response: 'space', correct: true, rtMs: rt, ...o });
const omission = (i, o = {}) => trial('pvt', i, 'pvt', { flag: 'OMISSION', ...o });
const anticipation = (i, rt = 120) => valid(i, rt, { flag: 'ANTICIPATION' });
const interrupted = (i) => trial('pvt', i, 'pvt', { flag: 'INTERRUPTED' });
const list = (...items) => items.map((make, i) => make(i));

const kindOf = (id) => (/random|typical|large|tail/.test(id) ? 'normal' : 'edge');

export async function build() {
  const { mulberry32 } = await import('../../../src/engine/rng.ts');
  const { generatePvt, scorePvt } = await import('../../../src/engine/tests/pvt.ts');

  const generation = generationCases(VARIANTS, SEEDS, mulberry32, generatePvt)
    .map((c) => ({ ...c, nextRand: nextAfter(c, mulberry32, generatePvt) }));

  const rand = mulberry32(7);
  const randomRts = (n) => Array.from({ length: n }, () => 180 + rand() * 600);
  const cases = {
    empty: [],
    only_practice: [valid(0, 300, { phase: 'practice' }), omission(1, { phase: 'practice' })],
    typical_no_lapse: randomRts(30).map((rt, i) => valid(i, Math.min(rt, 480))),
    with_lapses: [valid(0, 250), valid(1, 500), valid(2, 499.9), valid(3, 640.25), valid(4, 1800), valid(5, 310)],
    lapse_exactly_at_threshold: [valid(0, 500)],
    omissions_only: Array.from({ length: 5 }, (_, i) => omission(i)),
    anticipations_only: [anticipation(0, 90), anticipation(1, 149.9)],
    interrupted_only: [interrupted(0), interrupted(1)],
    single_valid: [valid(0, 333.3333333333333)],
    even_count_median: [valid(0, 200), valid(1, 300), valid(2, 250), valid(3, 400)],
    odd_count_median: [valid(0, 200), valid(1, 300), valid(2, 250)],
    valid_without_response: [valid(0, 300), trial('pvt', 1, 'pvt', { flag: 'VALID', response: null, rtMs: null })],
    mixed_with_practice: [
      ...list((i) => valid(i, 280, { phase: 'practice' }), (i) => omission(i, { phase: 'practice' })),
      valid(2, 260), valid(3, 710), omission(4), anticipation(5), interrupted(6), valid(7, 340.5), omission(8), valid(9, 505),
    ],
    ten_percent_tail: randomRts(50).map((rt, i) => valid(i, rt)),
    large_random: randomRts(300).map((rt, i) => (i % 17 === 0 ? omission(i) : i % 23 === 0 ? anticipation(i, 100 + (i % 40)) : valid(i, rt))),
  };
  const scoring = Object.entries(cases).map(([id, trials]) => ({ id, kind: kindOf(id), trials, metrics: metricsJson(scorePvt(trials)) }));
  return { test: 'pvt', generation, scoring };
}

/** Prossimo valore del generatore dopo la generazione: verifica anche il consumo esatto dell'RNG. */
function nextAfter(c, mulberry32, generate) {
  const rand = mulberry32(c.seed);
  generate(c.params, rand);
  return rand();
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) writeFixture('pvt', await build());
