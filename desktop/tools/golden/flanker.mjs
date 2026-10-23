import { mulberry32 } from '../../../src/engine/rng.ts';
import { generateFlanker, scoreFlanker, conflictAdaptation, buildArrows } from '../../../src/engine/tests/flanker.ts';
import { DEFAULTS } from '../../../src/config/defaults.ts';
import { SEEDS, generationCases, simulate, keyEvaluate, trialList, trial, metricsJson } from './lib.mjs';

const base = DEFAULTS.flanker;
const variants = [
  { variant: 'default', params: base },
  { variant: 'n-dispari-97', params: { ...base, nTrials: 97 } },
  { variant: 'n-dispari-11', params: { ...base, nTrials: 11 } },
  { variant: 'senza-neutri', params: { ...base, neutralRatio: 0 } },
  { variant: 'solo-congruenti', params: { ...base, incongruentRatio: 0, neutralRatio: 0 } },
  { variant: 'solo-incongruenti', params: { ...base, incongruentRatio: 1, neutralRatio: 0 } },
  { variant: 'rapporti-estremi-0.9-0.2-eccedenti', params: { ...base, incongruentRatio: 0.9, neutralRatio: 0.2 } },
  { variant: 'solo-neutri', params: { ...base, incongruentRatio: 0, neutralRatio: 1 } },
  { variant: 'rapporti-0.5-0.5', params: { ...base, incongruentRatio: 0.5, neutralRatio: 0.5 } },
  { variant: 'isi-fisso', params: { ...base, isiMinMs: 900, isiMaxMs: 900 } },
  { variant: 'n-300', params: { ...base, nTrials: 300 } },
  { variant: 'n-3', params: { ...base, nTrials: 3 } },
  { variant: 'n-1', params: { ...base, nTrials: 1 } },
  { variant: 'n-0', params: { ...base, nTrials: 0 } },
];

const KEY = { left: 'f', right: 'j' };
const T = (c, o) => [c, o];
const hit = (rt) => ({ response: 'f', correct: true, rtMs: rt });
const miss = (rt) => ({ response: 'j', correct: false, rtMs: rt });

export function build() {
  const generation = generationCases(variants, SEEDS, mulberry32, generateFlanker);
  const arrowsTable = ['congruent', 'incongruent', 'neutral'].flatMap((condition) =>
    ['left', 'right'].map((direction) => ({ condition, direction, arrows: buildArrows(condition, direction) })),
  );

  const scoring = [];
  const push = (id, kind, trials) =>
    scoring.push({ id, kind, trials, metrics: metricsJson(scoreFlanker(trials)), extra: { conflictAdaptation: conflictAdaptation(trials) } });

  for (const seed of [42, 2026]) {
    const items = generateFlanker(base, mulberry32(seed)).map((s) => ({
      condition: s.condition,
      stimulus: s.arrows,
      requiresResponse: true,
      correctResponse: KEY[s.direction],
      wrongResponse: KEY[s.direction === 'left' ? 'right' : 'left'],
    }));
    for (const model of ['perfect', 'attentive', 'impulsive', 'sleepy', 'interrupted', 'silent']) {
      push(`sim-${model}@${seed}`, 'simulated', simulate('flanker', items, model, mulberry32(seed * 17 + model.length), { practice: 12, evaluate: keyEvaluate }));
    }
  }

  const edge = (name, specs) => push(name, 'edge', trialList('flanker', specs));
  edge('lista-vuota', []);
  edge('solo-pratica', [T('congruent', { phase: 'practice', ...hit(400) }), T('incongruent', { phase: 'practice', ...hit(500) })]);
  edge('tutti-interrotti', [T('congruent', { flag: 'INTERRUPTED' }), T('incongruent', { flag: 'INTERRUPTED' })]);
  edge('omissioni-pure', [T('congruent', { flag: 'OMISSION' }), T('incongruent', { flag: 'OMISSION' }), T('neutral', { flag: 'OMISSION' })]);
  edge('anticipazioni', [T('congruent', { response: 'f', correct: true, rtMs: 100, flag: 'ANTICIPATION' }), T('incongruent', hit(500)), T('neutral', hit(450))]);
  edge('senza-neutri-trattino', [T('congruent', hit(400)), T('incongruent', hit(500))]);
  edge('adattamento-quattro-celle-piene', [
    T('congruent', hit(400)), T('congruent', hit(420)), T('incongruent', hit(520)), T('incongruent', hit(560)), T('congruent', hit(410)), T('incongruent', hit(540)),
  ]);
  edge('adattamento-cella-vuota-null', [T('congruent', hit(400)), T('congruent', hit(420)), T('congruent', hit(430)), T('incongruent', hit(520))]);
  edge('adattamento-precedente-errato-escluso', [
    T('congruent', hit(400)), T('congruent', hit(420)), T('incongruent', miss(520)), T('incongruent', hit(560)), T('congruent', hit(410)), T('incongruent', hit(540)), T('incongruent', hit(550)), T('congruent', hit(405)),
  ]);
  edge('adattamento-precedente-interrotto-escluso', [
    T('congruent', hit(400)), T('incongruent', { flag: 'INTERRUPTED', response: 'f', correct: true, rtMs: 300 }), T('incongruent', hit(560)), T('congruent', hit(420)), T('incongruent', hit(530)), T('incongruent', hit(540)), T('congruent', hit(410)),
  ]);
  edge('adattamento-neutri-non-confrontabili', [
    T('neutral', hit(400)), T('congruent', hit(410)), T('neutral', hit(420)), T('incongruent', hit(520)), T('congruent', hit(400)), T('incongruent', hit(530)), T('incongruent', hit(540)), T('congruent', hit(405)),
  ]);
  edge('un-solo-trial', [T('incongruent', hit(500))]);
  edge('solo-errori', [T('congruent', miss(600)), T('incongruent', miss(700)), T('neutral', miss(650))]);
  edge('errori-e-interrotti-esclusi-accuratezza', [T('congruent', hit(400)), T('congruent', miss(450)), T('congruent', { flag: 'INTERRUPTED' }), T('incongruent', miss(600))]);
  edge('arrotondamento-meta-decimale', [T('congruent', hit(400.05)), T('congruent', hit(400.15)), T('incongruent', hit(500.25)), T('neutral', hit(450.35))]);
  edge('rt-fuori-ordine-solo-test', [T('incongruent', hit(520)), T('congruent', hit(400)), T('incongruent', hit(540)), T('congruent', hit(410)), T('incongruent', hit(530))]);

  // Indici di trial con salti (la mappa per indice non trova il precedente) e duplicati tra pratica e test.
  const gapped = [
    trial('flanker', 0, 'congruent', hit(400)), trial('flanker', 2, 'incongruent', hit(520)),
    trial('flanker', 5, 'congruent', hit(410)), trial('flanker', 6, 'incongruent', hit(530)),
  ];
  push('indici-con-salti', 'edge', gapped);
  push('pratica-con-stessi-indici', 'edge', [
    trial('flanker', 0, 'congruent', { phase: 'practice', ...hit(300) }),
    ...['congruent', 'incongruent', 'congruent', 'incongruent', 'incongruent', 'congruent'].map((c, i) => trial('flanker', i, c, hit(400 + i * 17.5))),
  ]);

  return { test: 'flanker', engine: 'src/engine/tests/flanker.ts', arrowsTable, generation, scoring };
}
