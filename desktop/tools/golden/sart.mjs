import { mulberry32 } from '../../../src/engine/rng.ts';
import { generateSart, scoreSart, reactionTimesBeforeCommissions, PRE_ERROR_WINDOW } from '../../../src/engine/tests/sart.ts';
import { DEFAULTS } from '../../../src/config/defaults.ts';
import { SEEDS, generationCases, simulate, goEvaluate, trialList, metricsJson } from './lib.mjs';

const base = DEFAULTS.sart;
const variants = [
  { variant: 'default', params: base },
  { variant: 'n-dispari-226', params: { ...base, nTrials: 226 } },
  { variant: 'n-18-due-per-cifra', params: { ...base, nTrials: 18 } },
  { variant: 'n-9', params: { ...base, nTrials: 9 } },
  { variant: 'n-10-resto-1', params: { ...base, nTrials: 10 } },
  { variant: 'n-17-resto-8', params: { ...base, nTrials: 17 } },
  { variant: 'n-2', params: { ...base, nTrials: 2 } },
  { variant: 'n-1', params: { ...base, nTrials: 1 } },
  { variant: 'n-0', params: { ...base, nTrials: 0 } },
  { variant: 'bersaglio-9', params: { ...base, targetDigit: 9, nTrials: 90 } },
  { variant: 'n-450', params: { ...base, nTrials: 450 } },
];

const T = (c, o) => [c, o];
const go = (rt) => ({ response: ' ', correct: true, rtMs: rt });
const ok = { correct: true };
const commission = (rt) => ({ response: ' ', correct: false, rtMs: rt });
const gos = (n, rt = 400) => Array.from({ length: n }, (_, i) => T('go', go(rt + i)));

export function build() {
  const generation = generationCases(variants, SEEDS, mulberry32, generateSart);
  const scoring = [];
  const extraOf = (trials) => ({
    preError: {
      window4: reactionTimesBeforeCommissions(trials),
      window0: reactionTimesBeforeCommissions(trials, 0),
      window2: reactionTimesBeforeCommissions(trials, 2),
      window100: reactionTimesBeforeCommissions(trials, 100),
    },
  });
  const push = (id, kind, trials) => scoring.push({ id, kind, trials, metrics: metricsJson(scoreSart(trials)), extra: extraOf(trials) });

  for (const seed of [42, 2026]) {
    const items = generateSart(base, mulberry32(seed)).map((s) => ({
      condition: s.digit === base.targetDigit ? 'nogo' : 'go',
      stimulus: String(s.digit),
      requiresResponse: s.digit !== base.targetDigit,
      correctResponse: ' ',
    }));
    for (const model of ['perfect', 'attentive', 'impulsive', 'sleepy', 'interrupted', 'silent']) {
      push(`sim-${model}@${seed}`, 'simulated', simulate('sart', items, model, mulberry32(seed * 13 + model.length), { practice: 18, evaluate: goEvaluate }));
    }
  }

  const edge = (name, specs) => push(name, 'edge', trialList('sart', specs));
  edge('lista-vuota', []);
  edge('solo-pratica', [T('go', { phase: 'practice', ...go(400) }), T('nogo', { phase: 'practice', ...commission(300) })]);
  edge('tutti-interrotti', [T('go', { flag: 'INTERRUPTED' }), T('nogo', { flag: 'INTERRUPTED' })]);
  edge('nessuna-commissione-bersagli-trattenuti', [...gos(5), T('nogo', ok), ...gos(3), T('nogo', ok)]);
  edge('commissione-con-go-precedenti', [...gos(6), T('nogo', commission(300)), ...gos(2)]);
  edge('commissione-all-inizio-finestra-corta', [T('go', go(380)), T('nogo', commission(250)), ...gos(3)]);
  edge('commissione-senza-go-utilizzabili-prima', [T('nogo', commission(250)), ...gos(4)]);
  edge('commissioni-vicine-trial-contato-una-volta', [...gos(5, 500), T('nogo', commission(300)), T('go', go(310)), T('nogo', commission(280)), ...gos(2)]);
  edge('commissioni-a-distanza-finestre-disgiunte', [...gos(4, 500), T('nogo', commission(300)), ...gos(8, 450), T('nogo', commission(290))]);
  edge('go-omessi-e-anticipati-nella-finestra', [
    T('go', go(500)),
    T('go', { flag: 'OMISSION' }),
    T('go', { response: ' ', correct: true, rtMs: 110, flag: 'ANTICIPATION' }),
    T('go', { flag: 'INTERRUPTED', response: ' ', correct: true, rtMs: 400 }),
    T('go', go(520)),
    T('nogo', commission(260)),
  ]);
  edge('commissione-anticipata-conta', [...gos(4), T('nogo', { response: ' ', correct: false, rtMs: 100, flag: 'ANTICIPATION' })]);
  edge('commissione-interrotta-non-conta', [...gos(4), T('nogo', { flag: 'INTERRUPTED', response: ' ' })]);
  edge('solo-go', gos(4));
  edge('solo-bersagli', [T('nogo', ok), T('nogo', commission(300))]);
  edge('omissioni-su-go', [T('go', { flag: 'OMISSION' }), T('go', { flag: 'OMISSION' }), T('nogo', ok)]);
  edge('go-sbagliato-non-utilizzabile', [T('go', { response: ' ', correct: false, rtMs: 400 }), T('go', go(500)), T('nogo', commission(300))]);
  edge('un-solo-rt-sd-zero', [T('go', go(512.34)), T('nogo', ok)]);
  edge('arrotondamento-meta-decimale', [T('go', go(400.05)), T('go', go(400.15)), T('nogo', ok)]);
  return { test: 'sart', engine: 'src/engine/tests/sart.ts', preErrorWindow: PRE_ERROR_WINDOW, generation, scoring };
}
