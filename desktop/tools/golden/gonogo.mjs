import { mulberry32 } from '../../../src/engine/rng.ts';
import { generateGoNoGo, scoreGoNoGo } from '../../../src/engine/tests/gonogo.ts';
import { DEFAULTS } from '../../../src/config/defaults.ts';
import { SEEDS, generationCases, simulate, goEvaluate, trialList, metricsJson } from './lib.mjs';

const base = DEFAULTS.gonogo;
// Rapporti Go < 50% non sono coperti: il ripiego deterministicArrange del TS non termina quando
// i No-Go superano i Go (vedi DIVERGENZE.md).
const variants = [
  { variant: 'default', params: base },
  { variant: 'n-dispari-81', params: { ...base, nTrials: 81 } },
  { variant: 'n-dispari-7', params: { ...base, nTrials: 7 } },
  { variant: 'rapporto-0.5', params: { ...base, goRatio: 0.5 } },
  { variant: 'rapporto-0.6-n-dispari', params: { ...base, nTrials: 33, goRatio: 0.6 } },
  { variant: 'rapporto-0.9', params: { ...base, goRatio: 0.9 } },
  { variant: 'rapporto-0.99', params: { ...base, goRatio: 0.99 } },
  { variant: 'rapporto-1.0-nessun-nogo', params: { ...base, goRatio: 1 } },
  { variant: 'isi-fisso', params: { ...base, isiMinMs: 600, isiMaxMs: 600 } },
  { variant: 'n-120', params: { ...base, nTrials: 120 } },
  { variant: 'n-1', params: { ...base, nTrials: 1 } },
  { variant: 'n-0', params: { ...base, nTrials: 0 } },
];

const T = (c, o) => [c, o];
const go = (rt) => ({ response: ' ', correct: true, rtMs: rt });
const ok = { correct: true }; // No-Go trattenuto: VALID, response e rtMs null
const commission = (rt) => ({ response: ' ', correct: false, rtMs: rt });

export function build() {
  // Bug del TS (DIVERGENZE.md #2): quando i Go finiscono, arrangeKinds accoda i No-Go rimasti ignorando il limite di 2
  // consecutivi (docs/scientific/gonogo.md). Il Rust ritenta: per quei casi si verificano gli invarianti, non l'uguaglianza.
  const generation = generationCases(variants, SEEDS, mulberry32, generateGoNoGo, (stimuli) => {
    const maxNoGoRun = stimuli.reduce((acc, s) => ({ run: s.kind === 'nogo' ? acc.run + 1 : 0, max: Math.max(acc.max, s.kind === 'nogo' ? acc.run + 1 : 0) }), { run: 0, max: 0 }).max;
    return maxNoGoRun > 2 ? { expectedDivergence: { reason: 'TS: piu di 2 No-Go consecutivi in coda', tsMaxNoGoRun: maxNoGoRun } } : {};
  });
  const scoring = [];
  const push = (id, kind, trials) => scoring.push({ id, kind, trials, metrics: metricsJson(scoreGoNoGo(trials)) });

  for (const seed of [42, 2026]) {
    const items = generateGoNoGo(base, mulberry32(seed)).map((s) => ({
      condition: s.kind, stimulus: s.kind, requiresResponse: s.kind === 'go', correctResponse: ' ',
    }));
    for (const model of ['perfect', 'attentive', 'impulsive', 'sleepy', 'interrupted', 'silent']) {
      push(`sim-${model}@${seed}`, 'simulated', simulate('gonogo', items, model, mulberry32(seed * 11 + model.length), { practice: 10, evaluate: goEvaluate }));
    }
  }

  const edge = (name, specs) => push(name, 'edge', trialList('gonogo', specs));
  edge('lista-vuota', []);
  edge('solo-pratica', [T('go', { phase: 'practice', ...go(400) }), T('nogo', { phase: 'practice', ...commission(300) })]);
  edge('tutti-interrotti', [T('go', { flag: 'INTERRUPTED' }), T('nogo', { flag: 'INTERRUPTED' })]);
  edge('nessuna-commissione-nogo-trattenuti', [T('go', go(400)), T('nogo', ok), T('nogo', ok), T('go', go(450))]);
  edge('commissioni-su-tutti-i-nogo', [T('go', go(400)), T('nogo', commission(350)), T('nogo', commission(360)), T('go', go(420))]);
  edge('omissioni-su-go', [T('go', { flag: 'OMISSION' }), T('go', go(400)), T('go', { flag: 'OMISSION' }), T('nogo', ok)]);
  edge('anticipazione-su-go', [T('go', { response: ' ', correct: true, rtMs: 100, flag: 'ANTICIPATION' }), T('go', go(400)), T('nogo', ok)]);
  edge('commissione-anticipata-conta-come-risposta', [T('go', go(400)), T('nogo', { response: ' ', correct: false, rtMs: 90, flag: 'ANTICIPATION' })]);
  edge('solo-go', [T('go', go(400)), T('go', go(500)), T('go', go(600))]);
  edge('solo-nogo', [T('nogo', ok), T('nogo', commission(300))]);
  edge('nessun-rt-valido-solo-omissioni', [T('go', { flag: 'OMISSION' }), T('go', { flag: 'OMISSION' }), T('nogo', ok)]);
  edge('interrotti-esclusi-dai-denominatori', [T('go', go(400)), T('go', { flag: 'INTERRUPTED' }), T('nogo', ok), T('nogo', { flag: 'INTERRUPTED', response: ' ' })]);
  edge('go-sbagliato-non-contribuisce-agli-rt', [T('go', { response: ' ', correct: false, rtMs: 400 }), T('go', go(500))]);
  edge('hit-perfetti-correzione-loglineare', [T('go', go(300)), T('go', go(310)), T('nogo', ok), T('nogo', ok)]);
  edge('un-solo-rt-sd-zero', [T('go', go(512.34)), T('nogo', ok)]);
  edge('arrotondamento-meta-decimale', [T('go', go(400.05)), T('go', go(400.15)), T('nogo', ok)]);
  return { test: 'gonogo', engine: 'src/engine/tests/gonogo.ts', generation, scoring };
}
