// Adattatori verso i motori TS veri: ogni test espone `gen` (sequenza da seme+parametri), `score` (metriche da una sessione)
// e `extras` (parti ausiliarie: geometria, regressione, SDT, perseverazione...). Usato dal main thread e dal worker del watchdog.
// Va importato DOPO `register('../golden/hooks.mjs')` (import senza estensione in src/).
import { mulberry32 } from '../../../src/engine/rng.ts';
import { generateStroop, correctKeyStroop, stroopStimulusLabel, scoreStroop } from '../../../src/engine/tests/stroop.ts';
import { generateGoNoGo, scoreGoNoGo } from '../../../src/engine/tests/gonogo.ts';
import { generateFlanker, scoreFlanker, conflictAdaptation } from '../../../src/engine/tests/flanker.ts';
import { generateSart, scoreSart, reactionTimesBeforeCommissions } from '../../../src/engine/tests/sart.ts';
import { generateVisualSearch, scoreVisualSearch, searchSlope } from '../../../src/engine/tests/visualSearch.ts';
import { generatePvt, scorePvt } from '../../../src/engine/tests/pvt.ts';
import * as corsi from '../../../src/engine/tests/corsi.ts';
import * as nback from '../../../src/engine/tests/nback.ts';
import * as wcst from '../../../src/engine/tests/wcst.ts';
import * as mr from '../../../src/engine/tests/mentalRotation.ts';
import * as trail from '../../../src/engine/tests/trailMaking.ts';
import { leastSquares } from '../../../src/engine/regression.ts';
import { metricsJson } from '../golden/lib.mjs';

export { mulberry32 };

const withNext = (rand, fields) => ({ ...fields, nextRand: rand() });
const metrics = (list) => metricsJson(list);

/** Spec per test: gen(params, rand) -> campi del caso; score(input) -> {metrics, extra?}. */
export const ENGINES = {
  stroop: {
    gen: (p, rand) => {
      const stimuli = generateStroop(p, rand);
      return withNext(rand, {
        stimuli,
        keys: { stroop1: stimuli.map((s) => correctKeyStroop(s, 'stroop1')), stroop2: stimuli.map((s) => correctKeyStroop(s, 'stroop2')) },
        labels: stimuli.map(stroopStimulusLabel),
      });
    },
    score: ({ trials }) => ({ metrics: metrics(scoreStroop(trials)) }),
  },
  gonogo: {
    gen: (p, rand) => {
      const stimuli = generateGoNoGo(p, rand);
      const run = stimuli.reduce((a, s) => { const r = s.kind === 'nogo' ? a.run + 1 : 0; return { run: r, max: Math.max(a.max, r) }; }, { run: 0, max: 0 });
      return withNext(rand, { stimuli, tsMaxNoGoRun: run.max });
    },
    score: ({ trials }) => ({ metrics: metrics(scoreGoNoGo(trials)) }),
  },
  flanker: {
    gen: (p, rand) => withNext(rand, { stimuli: generateFlanker(p, rand) }),
    score: ({ trials }) => ({ metrics: metrics(scoreFlanker(trials)), extra: { conflictAdaptation: conflictAdaptation(trials) } }),
  },
  sart: {
    gen: (p, rand) => withNext(rand, { stimuli: generateSart(p, rand) }),
    score: ({ trials, windows }) => ({
      metrics: metrics(scoreSart(trials)),
      extra: { preError: Object.fromEntries(windows.map((w) => [String(w), reactionTimesBeforeCommissions(trials, w)])) },
    }),
  },
  visual_search: {
    gen: (p, rand) => withNext(rand, { stimuli: generateVisualSearch(p, rand) }),
    score: ({ trials }) => ({
      metrics: metrics(scoreVisualSearch(trials)),
      extra: {
        slopes: Object.fromEntries(['feature', 'conjunction'].flatMap((t) => [true, false].map((p) => [`${t}-${p ? 'present' : 'absent'}`, searchSlope(trials, t, p)]))),
      },
    }),
    extras: { regression: (points) => ({ points, result: leastSquares(points) }) },
  },
  pvt: {
    gen: (p, rand) => withNext(rand, { stimuli: generatePvt(p, rand) }),
    score: ({ trials }) => ({ metrics: metrics(scorePvt(trials)) }),
  },
  corsi: {
    // Livelli successivi con RNG condiviso, come nell'app.
    gen: (p, rand, c) => {
      const levels = c.lengths.map((length) => {
        const sequences = corsi.generateBalancedSequences(length, p.trialsPerLevel, p, rand);
        return { length, count: p.trialsPerLevel, sequences, nextRand: rand() };
      });
      return { levels };
    },
    score: ({ trials, startLength }) => ({ metrics: metrics(corsi.scoreCorsi(trials, startLength)) }),
    extras: {
      geometry: (indices) => ({ indices, pathLength: corsi.pathLength(indices), crossings: corsi.countCrossings(indices) }),
      span: (passed, startLength) => ({ passed, startLength, span: corsi.corsiSpan(passed, startLength) }),
      stop: (levelResults) => ({ levelResults, stop: corsi.shouldStop(levelResults) }),
    },
  },
  nback: {
    gen: (p, rand) => {
      const stimuli = nback.generateNBack(p, rand);
      return withNext(rand, {
        letters: stimuli.map((s) => s.letter).join(''),
        targets: stimuli.flatMap((s, i) => (s.isTarget ? [i] : [])),
        lures: stimuli.flatMap((s, i) => (s.isLure ? [i] : [])),
      });
    },
    score: ({ trials, nQuartiles }) => ({ metrics: metrics(nback.scoreNBack(trials, nQuartiles)) }),
    extras: {
      probit: (p) => ({ p, value: nback.probit(p) }),
      sdt: ([hits, targets, fa, nonTargets]) => ({ hits, targets, fa, nonTargets, dPrime: nback.dPrime(hits, targets, fa, nonTargets), c: nback.criterionC(hits, targets, fa, nonTargets) }),
      chunk: (items, k) => ({ items, k, chunks: nback.splitIntoChunks(items, k) }),
    },
  },
  wcst: {
    gen: (p, rand) => withNext(rand, { deck: wcst.buildDeck(p.deckSize, rand) }),
    score: ({ trials, metas, params }) => ({ metrics: metrics(wcst.scoreWcst(trials, metas, params)) }),
    extras: {
      perseveration: ({ rules, matched, runToShift }) => ({
        rules, matched, runToShift,
        expected: wcst.countPerseveration(matched.map((m, i) => ({ correct: m.includes(rules[i]), matched: m })), rules, runToShift),
      }),
    },
  },
  mental_rotation: {
    gen: (p, rand) => withNext(rand, { stimuli: mr.generateMentalRotation(p, rand) }),
    score: ({ trials }) => ({ metrics: metrics(mr.scoreMentalRotation(trials)), extra: { slope: mr.rotationSlope(trials) } }),
    extras: {
      shape: (seed) => { const rand = mulberry32(seed); const cubes = mr.generateShape(rand); return { seed, cubes, chiral: mr.isChiral(cubes), mirror: mr.mirror(cubes), nextRand: rand() }; },
      projection: (cubes, angle) => ({ cubes, angle, faces: mr.projectFaces(cubes, angle) }),
      regression: (points) => ({ points, fit: leastSquares(points) }),
    },
  },
  trail_making: {
    gen: (p, rand) => withNext(rand, { stimuli: trail.generateTrail(p.part, p.n, rand) }),
    score: ({ trials, nTargets }) => ({ metrics: metrics(trail.scoreTrailMaking(trials, nTargets)) }),
    extras: {
      labels: (part, n) => ({ part, n, labels: trail.trailLabels(part, n) }),
      run: ({ part, n, seed, phase, startMs, clicks }) => {
        const circles = trail.generateTrail(part, n, mulberry32(seed));
        const run = new trail.TrailRun(circles, part, phase, 'FUZZ-0001', startMs);
        const initialTarget = new trail.TrailRun(circles, part, phase, 'x', 0).target;
        const steps = clicks.map(([index, nowMs]) => {
          const t = run.click(index, nowMs);
          return { index, nowMs, trial: t, target: run.target, done: run.done };
        });
        return { part, n, seed, phase, startMs, clicks, initialTarget, steps };
      },
    },
  },
};

