import { mulberry32 } from '../../../src/engine/rng.ts';
import { generateStroop, correctKeyStroop, stroopStimulusLabel, scoreStroop, STROOP_KEYS } from '../../../src/engine/tests/stroop.ts';
import { DEFAULTS } from '../../../src/config/defaults.ts';
import { SEEDS, generationCases, simulate, keyEvaluate, trialList, metricsJson } from './lib.mjs';

const base = DEFAULTS.stroop1;
const variants = [
  { variant: 'default', params: base },
  { variant: 'n-dispari-49', params: { ...base, nTrials: 49 } },
  { variant: 'n-dispari-7', params: { ...base, nTrials: 7 } },
  { variant: 'n-96', params: { ...base, nTrials: 96 } },
  { variant: 'n-2', params: { ...base, nTrials: 2 } },
  { variant: 'n-1', params: { ...base, nTrials: 1 } },
  { variant: 'n-0', params: { ...base, nTrials: 0 } },
];

const KEYS = Object.values(STROOP_KEYS);
const wrongOf = (key) => KEYS[(KEYS.indexOf(key) + 1) % KEYS.length];
const T = (c, o) => [c, o];
const hit = (rt) => ({ response: 'R', correct: true, rtMs: rt });

export function build() {
  const generation = generationCases(variants, SEEDS, mulberry32, generateStroop, (stimuli) => ({
    keys: { stroop1: stimuli.map((s) => correctKeyStroop(s, 'stroop1')), stroop2: stimuli.map((s) => correctKeyStroop(s, 'stroop2')) },
    labels: stimuli.map(stroopStimulusLabel),
  }));

  const scoring = [];
  const push = (id, kind, trials) => scoring.push({ id, kind, trials, metrics: metricsJson(scoreStroop(trials)) });

  // Sessioni simulate sulla sequenza di default (due semi × due varianti × tutti i modelli).
  for (const seed of [42, 2026]) {
    const stimuli = generateStroop(base, mulberry32(seed));
    for (const variant of ['stroop1', 'stroop2']) {
      const items = stimuli.map((s) => {
        const correctResponse = correctKeyStroop(s, variant);
        return { condition: s.congruent ? 'congruent' : 'incongruent', stimulus: stroopStimulusLabel(s), requiresResponse: true, correctResponse, wrongResponse: wrongOf(correctResponse) };
      });
      for (const model of ['perfect', 'attentive', 'impulsive', 'sleepy', 'interrupted', 'silent']) {
        const rand = mulberry32(seed * 7 + model.length);
        push(`sim-${variant}-${model}@${seed}`, 'simulated', simulate('stroop1', items, model, rand, { practice: 8, evaluate: keyEvaluate }));
      }
    }
  }

  // Casi limite obbligatori.
  const edge = (name, specs) => push(name, 'edge', trialList('stroop1', specs));
  edge('lista-vuota', []);
  edge('solo-pratica', [T('congruent', { phase: 'practice', ...hit(500) }), T('incongruent', { phase: 'practice', ...hit(700) })]);
  edge('tutti-interrotti', [T('congruent', { flag: 'INTERRUPTED' }), T('incongruent', { flag: 'INTERRUPTED' })]);
  edge('omissioni-pure', [T('congruent', { flag: 'OMISSION' }), T('incongruent', { flag: 'OMISSION' }), T('incongruent', { flag: 'OMISSION' })]);
  edge('anticipazioni-corrette-non-valide', [
    T('congruent', { response: 'R', correct: true, rtMs: 120, flag: 'ANTICIPATION' }),
    T('incongruent', { response: 'R', correct: true, rtMs: 149.9, flag: 'ANTICIPATION' }),
    T('incongruent', { ...hit(600) }),
  ]);
  edge('soglia-anticipazione-150-valida', [T('congruent', { ...hit(150) }), T('incongruent', { ...hit(150) })]);
  edge('una-sola-condizione', [T('congruent', { ...hit(500) }), T('congruent', { ...hit(520) })]);
  edge('un-solo-rt-sd-zero', [T('congruent', { ...hit(500) }), T('incongruent', { ...hit(650) })]);
  edge('solo-errori', [T('congruent', { response: 'V', correct: false, rtMs: 800 }), T('incongruent', { response: 'V', correct: false, rtMs: 900 })]);
  edge('errori-con-interrotti-esclusi', [
    T('congruent', { ...hit(500) }),
    T('congruent', { flag: 'INTERRUPTED' }),
    T('incongruent', { response: 'V', correct: false, rtMs: 900 }),
    T('incongruent', { flag: 'INTERRUPTED', response: 'R', correct: true, rtMs: 400 }),
  ]);
  edge('arrotondamento-meta-decimale', [T('congruent', { ...hit(500.05) }), T('congruent', { ...hit(500.15) }), T('incongruent', { ...hit(612.25) })]);
  edge('condizione-sconosciuta-ignorata', [T('boh', { ...hit(500) }), T('congruent', { ...hit(510) })]);
  return { test: 'stroop', engine: 'src/engine/tests/stroop.ts', generation, scoring };
}
