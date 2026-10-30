import { mulberry32 } from '../../../src/engine/rng.ts';
import { generateVisualSearch, scoreVisualSearch, searchSlope, conditionLabel } from '../../../src/engine/tests/visualSearch.ts';
import { leastSquares } from '../../../src/engine/regression.ts';
import { DEFAULTS } from '../../../src/config/defaults.ts';
import { SEEDS, generationCases, simulate, keyEvaluate, trialList, metricsJson } from './lib.mjs';

const base = DEFAULTS.visualSearch;
const variants = [
  { variant: 'default', params: base },
  { variant: 'n-dispari-97', params: { ...base, nTrials: 97 } },
  { variant: 'n-12-una-per-cella', params: { ...base, nTrials: 12 } },
  { variant: 'n-24', params: { ...base, nTrials: 24 } },
  { variant: 'n-23-resto-11', params: { ...base, nTrials: 23 } },
  { variant: 'n-5', params: { ...base, nTrials: 5 } },
  { variant: 'n-1', params: { ...base, nTrials: 1 } },
  { variant: 'n-0', params: { ...base, nTrials: 0 } },
  { variant: 'isi-fisso', params: { ...base, isiMinMs: 800, isiMaxMs: 800 } },
  { variant: 'n-192', params: { ...base, nTrials: 192 } },
];

const T = (c, o) => [c, o];
const hit = (rt) => ({ response: 'present', correct: true, rtMs: rt });
const miss = (rt) => ({ response: 'absent', correct: false, rtMs: rt });
const c = conditionLabel;

/** Una cella (tipo, presenza, numerosità) con RT dato. */
const cell = (type, present, size, rt, o = {}) => T(c(type, present, size), { ...hit(rt), ...o });

export function build() {
  const generation = generationCases(variants, SEEDS, mulberry32, generateVisualSearch);
  const regression = [
    [], [[1, 2]], [[1, 2], [1, 5]], [[4, 500], [8, 600]], [[4, 500], [8, 500], [16, 500]],
    [[4, 520.5], [8, 610.25], [16, 905.125]], [[4, 700], [8, 650], [16, 500]], [[0, 0], [1, 1], [2, 4], [3, 9], [4, 16]],
  ].map((points) => ({ points, result: leastSquares(points) }));

  const scoring = [];
  const slopes = (trials) => Object.fromEntries(
    ['feature', 'conjunction'].flatMap((t) => [true, false].map((p) => [`${t}-${p ? 'present' : 'absent'}`, searchSlope(trials, t, p)])),
  );
  const push = (id, kind, trials) => scoring.push({ id, kind, trials, metrics: metricsJson(scoreVisualSearch(trials)), extra: { slopes: slopes(trials) } });

  for (const seed of [42, 2026]) {
    const items = generateVisualSearch(base, mulberry32(seed)).map((s) => ({
      condition: conditionLabel(s.type, s.present, s.setSize),
      stimulus: `${s.type}/${s.setSize}/${s.present ? 'presente' : 'assente'}`,
      requiresResponse: true,
      correctResponse: s.present ? 'present' : 'absent',
      wrongResponse: s.present ? 'absent' : 'present',
    }));
    for (const model of ['perfect', 'attentive', 'impulsive', 'sleepy', 'interrupted', 'silent']) {
      push(`sim-${model}@${seed}`, 'simulated', simulate('visualSearch', items, model, mulberry32(seed * 19 + model.length), { practice: 8, evaluate: keyEvaluate }));
    }
  }

  const edge = (name, specs) => push(name, 'edge', trialList('visualSearch', specs));
  const full = [];
  for (const type of ['feature', 'conjunction']) {
    for (const [i, size] of [4, 8, 16].entries()) {
      full.push(cell(type, true, size, 500 + (type === 'feature' ? 2 : 20) * size + i), cell(type, true, size, 520 + (type === 'feature' ? 2 : 20) * size));
      full.push(cell(type, false, size, 600 + (type === 'feature' ? 3 : 40) * size), cell(type, false, size, 640 + (type === 'feature' ? 3 : 40) * size));
    }
  }
  edge('lista-vuota', []);
  edge('solo-pratica', [T(c('feature', true, 4), { phase: 'practice', ...hit(500) })]);
  edge('tutti-interrotti', [T(c('feature', true, 4), { flag: 'INTERRUPTED' }), T(c('conjunction', false, 16), { flag: 'INTERRUPTED' })]);
  edge('sessione-completa-tre-numerosita', full);
  edge('una-sola-numerosita-pendenza-trattino', [cell('feature', true, 8, 500), cell('feature', true, 8, 520), cell('feature', false, 8, 600)]);
  edge('due-numerosita-pendenza-esatta', [cell('conjunction', true, 4, 500), cell('conjunction', true, 16, 620), cell('conjunction', false, 4, 700), cell('conjunction', false, 16, 1060)]);
  edge('rapporto-assente-presente-regolare', [
    cell('conjunction', true, 4, 500), cell('conjunction', true, 8, 580), cell('conjunction', true, 16, 740),
    cell('conjunction', false, 4, 600), cell('conjunction', false, 8, 760), cell('conjunction', false, 16, 1080),
  ]);
  edge('pendenza-presente-nulla-rapporto-trattino', [
    cell('conjunction', true, 4, 500), cell('conjunction', true, 16, 500), cell('conjunction', false, 4, 600), cell('conjunction', false, 16, 900),
  ]);
  edge('pendenza-presente-negativa-rapporto-trattino', [
    cell('conjunction', true, 4, 700), cell('conjunction', true, 16, 500), cell('conjunction', false, 4, 600), cell('conjunction', false, 16, 900),
  ]);
  edge('pendenza-assente-negativa-presente-positiva', [
    cell('conjunction', true, 4, 500), cell('conjunction', true, 16, 600), cell('conjunction', false, 4, 900), cell('conjunction', false, 16, 700),
  ]);
  edge('omissioni-e-anticipazioni', [
    T(c('feature', true, 4), { flag: 'OMISSION' }), T(c('feature', false, 8), { flag: 'OMISSION' }),
    T(c('feature', true, 4), { response: 'present', correct: true, rtMs: 120, flag: 'ANTICIPATION' }), cell('feature', true, 4, 450),
  ]);
  edge('errori-non-entrano-nelle-pendenze', [cell('feature', true, 4, 500), T(c('feature', true, 16, 0), miss(2000)), T(c('feature', true, 16), miss(2100)), cell('feature', true, 16, 560)]);
  edge('interrotti-esclusi-ma-omissioni-contano-errori', [cell('feature', true, 4, 500), T(c('feature', true, 8), { flag: 'INTERRUPTED' }), T(c('feature', true, 8), { flag: 'OMISSION' })]);
  edge('condizioni-malformate-ignorate', [
    T('garbage', hit(500)), T('feature-present', hit(500)), T('feature-maybe-4', hit(500)), T('feature-present-4.5', hit(500)),
    T('hybrid-present-4', hit(500)), cell('feature', true, 4, 480),
  ]);
  // Una numerosità vuota non è una condizione valida (in JS Number('') === 0 la farebbe passare come 0).
  edge('condizione-numerosita-vuota', [T('feature-present-', hit(500)), cell('feature', true, 4, 480), cell('feature', true, 8, 520)]);
  edge('un-solo-tipo-presente', [cell('feature', true, 4, 450), cell('feature', true, 8, 470), cell('feature', true, 16, 520)]);
  edge('arrotondamento-meta-decimale', [cell('feature', true, 4, 400.05), cell('feature', true, 8, 400.15), cell('feature', false, 4, 500.25), cell('feature', false, 8, 560.35)]);
  edge('rapporto-meta-centesimo', [
    cell('conjunction', true, 4, 500), cell('conjunction', true, 8, 520), cell('conjunction', false, 4, 500), cell('conjunction', false, 8, 540),
  ]);

  return { test: 'visual_search', engine: 'src/engine/tests/visualSearch.ts', regression, generation, scoring };
}
