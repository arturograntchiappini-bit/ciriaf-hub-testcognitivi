// Utilità condivise dagli script golden: serializzazione, simulatore di partecipante, scrittura fixture.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures');

/** Semi fissi del criterio di accettazione. */
export const SEEDS = [1, 42, 2026, 123456789];

/** Scrive la fixture con tutta la precisione dei float (JSON.stringify usa la rappresentazione più corta esatta). */
export function writeFixture(name, data) {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  const text = JSON.stringify(data);
  if (/NaN|Infinity/.test(text)) throw new Error(`fixture ${name}: valore non finito`);
  writeFileSync(join(FIXTURES_DIR, `${name}.json`), text + '\n');
  return text.length;
}

/** Tripla {id, seed, variant, params, stimuli} per ogni (variante × seme). */
export function generationCases(variants, seeds, mulberry32, generate, decorate = () => ({})) {
  return variants.flatMap(({ variant, params }) =>
    seeds.map((seed) => {
      const stimuli = generate(params, mulberry32(seed));
      return { id: `${variant}@${seed}`, variant, seed, params, stimuli, ...decorate(stimuli, params) };
    }),
  );
}

/** Trial sintetico con i valori che il sequencer produce; `o` sovrascrive qualsiasi campo. */
export function trial(testId, index, condition, o = {}) {
  return {
    testId,
    sessionId: 'GOLDEN-0001',
    trialIndex: index,
    phase: 'test',
    condition,
    stimulus: o.stimulus ?? condition,
    response: null,
    correct: false,
    rtMs: null,
    flag: 'VALID',
    onsetTimestamp: 1000 + index * 1500,
    ...o,
  };
}

/** Costruisce trial consecutivi da una lista di [condition, overrides]. */
export function trialList(testId, specs) {
  return specs.map(([condition, o], i) => trial(testId, i, condition, o));
}

/** Modelli di partecipante: probabilità di errore/omissione/anticipazione/interruzione. */
export const MODELS = {
  perfect: { respond: 1, wrongKey: 0, commission: 0, anticipate: 0, interrupt: 0, rtMean: 450, rtSd: 60 },
  attentive: { respond: 0.97, wrongKey: 0.05, commission: 0.1, anticipate: 0.02, interrupt: 0.01, rtMean: 480, rtSd: 90 },
  impulsive: { respond: 0.99, wrongKey: 0.15, commission: 0.5, anticipate: 0.12, interrupt: 0, rtMean: 330, rtSd: 70 },
  sleepy: { respond: 0.6, wrongKey: 0.1, commission: 0.05, anticipate: 0, interrupt: 0.05, rtMean: 700, rtSd: 200 },
  interrupted: { respond: 0.9, wrongKey: 0.05, commission: 0.2, anticipate: 0.03, interrupt: 0.3, rtMean: 520, rtSd: 80 },
  silent: { respond: 0, wrongKey: 0, commission: 0, anticipate: 0, interrupt: 0, rtMean: 0, rtSd: 0 },
};

/** Gaussiana Box-Muller dal generatore a seme (determinismo). */
function gauss(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/**
 * Simula un partecipante come farebbe il sequencer (src/ui/runtime/sequencer.ts):
 * interrotto → INTERRUPTED; risposta → ANTICIPATION se rt<150 altrimenti VALID; nessuna risposta →
 * OMISSION se era attesa, VALID se era un withhold (No-Go/bersaglio trattenuto, rtMs e response null).
 * items: [{condition, stimulus, requiresResponse, correctResponse, wrongResponse}]
 */
export function simulate(testId, items, modelName, rand, { practice = 0, evaluate } = {}) {
  const m = MODELS[modelName];
  const make = (item, index, phase) => {
    const base = { stimulus: item.stimulus, phase };
    const interrupted = rand() < m.interrupt;
    const wantsResponse = item.requiresResponse ? rand() < m.respond : rand() < m.commission * (m.respond > 0 ? 1 : 0);
    if (interrupted) return trial(testId, index, item.condition, { ...base, correct: evaluate(item, null), flag: 'INTERRUPTED' });
    if (!wantsResponse) {
      return trial(testId, index, item.condition, {
        ...base,
        correct: evaluate(item, null),
        flag: item.requiresResponse ? 'OMISSION' : 'VALID',
      });
    }
    const anticipate = rand() < m.anticipate;
    const rt = anticipate ? 60 + rand() * 89.9 : Math.max(150, m.rtMean + m.rtSd * gauss(rand));
    const key = item.requiresResponse && rand() < m.wrongKey ? (item.wrongResponse ?? item.correctResponse) : item.correctResponse;
    return trial(testId, index, item.condition, {
      ...base,
      response: key,
      correct: evaluate(item, key),
      rtMs: rt,
      flag: rt < 150 ? 'ANTICIPATION' : 'VALID',
    });
  };
  const practiceTrials = items.slice(0, practice).map((item, i) => make(item, i, 'practice'));
  return [...practiceTrials, ...items.map((item, i) => make(item, i, 'test'))];
}

/** Valutazione "risposta esatta" per test a scelta di tasto. */
export const keyEvaluate = (item, key) => key === item.correctResponse;
/** Valutazione go/withhold: Go corretto se risposto, No-Go corretto se trattenuto. */
export const goEvaluate = (item, key) => (item.requiresResponse ? key !== null : key === null);

/** Metriche TS → forma JSON (unit omessa se undefined, come JSON.stringify). */
export const metricsJson = (metrics) => JSON.parse(JSON.stringify(metrics));
