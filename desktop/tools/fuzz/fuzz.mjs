// Test differenziale su larga scala TS -> Rust. Rigenera `desktop/fixtures/fuzz/<test>.json[.gz]`.
//   node --experimental-transform-types desktop/tools/fuzz/fuzz.mjs [--cases=500] [--only=stroop,gonogo]
// Per ogni motore: CASES casi di sequenza (seme + parametri validi variati) e CASES casi di scoring (sessioni sintetiche
// casuali: flag misti, RT casuali, risposte giuste/sbagliate, pratica mescolata, lunghezze 0..400, a volte "caotiche").
// Il generatore pseudo-casuale è a seme fisso (MASTER_SEED): stesso comando, stessi file. Le sequenze che il TS non termina
// entro il timeout (bug noto Go/No-Go con goRatio <= 0.4) sono registrate come `tsHang`.
import { register } from 'node:module';
import { Worker } from 'node:worker_threads';
import { writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { FIXTURES_DIR, MODELS, simulate, keyEvaluate, goEvaluate } from '../golden/lib.mjs';

register('../golden/hooks.mjs', import.meta.url);
const { ENGINES, mulberry32 } = await import('./engines.mjs');

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const CASES = Number(arg('cases', 500));
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const TIMEOUT_MS = Number(arg('timeout', 2500));
const MASTER_SEED = 20261023;
const OUT_DIR = join(FIXTURES_DIR, 'fuzz');
const GZIP_ABOVE_BYTES = 5 * 1024 * 1024;

// ---------- generatore casuale a seme fisso ----------
const makeRng = (seed) => {
  const r = mulberry32(seed);
  const R = {
    f: () => r(),
    u: (a, b) => a + (b - a) * r(),
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    p: (x) => r() < x,
    pick: (list) => list[Math.floor(r() * list.length)],
    /** Intero in [lo, hi] con massa sui valori bassi (poche sessioni lunghe: i file restano piccoli). */
    skew: (lo, hi) => lo + Math.floor((hi - lo + 1) * r() ** 2.5),
    seed: () => Math.floor(r() * 4294967296),
    step: (lo, hi, step) => lo + step * Math.floor((r() * (hi - lo)) / step + 0.5),
  };
  return R;
};

/** Numero di trial: 12% sotto il minimo dell'interfaccia (casi limite), il resto sbilanciato verso i valori bassi. */
const nTrialsOf = (R, uiMin, uiMax, cap = uiMax) => (R.p(0.12) ? R.int(0, uiMin) : R.skew(uiMin, cap));
const isiRange = (R, lo, hi) => { const a = R.int(lo, hi); return R.p(0.1) ? [a, a] : [a, R.int(a, hi + 1000)]; };

// ---------- parametri di sequenza ----------
const SEQUENCE_PARAMS = {
  stroop: (R) => ({ nTrials: nTrialsOf(R, 4, 400), fixationMs: R.step(0, 2000, 50), timeoutMs: R.step(500, 8000, 100), isiMs: R.step(0, 3000, 50), practiceTrials: R.int(0, 40) }),
  gonogo: (R) => {
    const [isiMinMs, isiMaxMs] = isiRange(R, 200, 2000);
    // 6% di rapporti Go <= 0.4 (il brief li dava come non terminanti nel TS: il watchdog lo verifica, vedi `tsHang`).
    const goRatio = R.p(0.06) ? R.u(0.05, 0.4) : R.p(0.1) ? R.pick([0.5, 0.75, 0.9, 1]) : R.u(0.45, 1);
    return { nTrials: nTrialsOf(R, 8, 400), goRatio, stimulusMs: R.step(300, 2000, 50), isiMinMs, isiMaxMs, practiceTrials: R.int(0, 40) };
  },
  flanker: (R) => {
    const wide = R.p(0.15);
    const [isiMinMs, isiMaxMs] = isiRange(R, 300, 3000);
    return {
      nTrials: nTrialsOf(R, 12, 400), incongruentRatio: wide ? R.f() : R.u(0.2, 0.6), neutralRatio: wide ? R.f() : R.u(0, 0.4),
      fixationMs: R.step(200, 2000, 100), responseWindowMs: R.step(500, 3000, 100), isiMinMs, isiMaxMs, practiceTrials: R.int(0, 40),
    };
  },
  sart: (R) => ({ nTrials: nTrialsOf(R, 18, 450), targetDigit: R.int(1, 9), digitMs: R.step(100, 1000, 50), maskMs: R.step(300, 2000, 100), practiceTrials: R.int(0, 40) }),
  visual_search: (R) => {
    const [isiMinMs, isiMaxMs] = isiRange(R, 300, 3000);
    return { nTrials: nTrialsOf(R, 12, 480, 120), fixationMs: R.step(200, 2000, 100), responseWindowMs: R.step(1000, 10000, 500), isiMinMs, isiMaxMs, practiceTrials: R.int(0, 40) };
  },
  pvt: (R) => {
    const [isiMinMs, isiMaxMs] = isiRange(R, 1, 20000);
    return { nTrials: nTrialsOf(R, 10, 400), stimulusMaxMs: R.step(1000, 30000, 500), isiMinMs, isiMaxMs, practiceTrials: R.int(0, 40) };
  },
  corsi: (R) => {
    const startLength = R.int(2, 6);
    return { startLength, maxLength: R.int(Math.max(4, startLength), 9), trialsPerLevel: R.int(1, 4), presentMsPerBlock: R.step(400, 2000, 50), complexityTolerance: R.p(0.1) ? R.pick([0.5, 100]) : R.int(2, 30) };
  },
  nback: (R) => {
    const n = R.pick([1, 1, 2, 2, 2, 3, 3, 4]);
    const params = {
      n, letterMs: R.step(200, 1500, 50), blankMs: R.step(500, 3000, 50), nTrials: R.p(0.1) ? R.int(0, 30) : R.skew(20, 600),
      targetRate: R.p(0.1) ? R.pick([0, 0.6, 0.9]) : R.u(0.1, 0.5), lureRate: R.p(0.1) ? R.pick([0, 1]) : R.u(0, 0.4), practiceTrials: R.int(0, 60),
    };
    if (R.p(0.1)) delete params.lureRate; // sessioni salvate prima dell'introduzione dei lure
    return params;
  },
  wcst: (R) => ({ deckSize: R.p(0.2) ? R.pick([0, 1, 10, 63, 64, 65, 127, 128, 255, 256]) : R.skew(0, 300), runToShift: R.int(4, 20), maxCategories: R.int(1, 12) }),
  mental_rotation: (R) => {
    const [isiMinMs, isiMaxMs] = isiRange(R, 300, 3000);
    return { nTrials: nTrialsOf(R, 14, 420, 200), fixationMs: R.step(200, 2000, 100), responseWindowMs: R.step(2000, 20000, 1000), isiMinMs, isiMaxMs, practiceTrials: R.int(0, 40) };
  },
  trail_making: (R) => {
    const part = R.pick(['A', 'B']);
    // La parte B oltre 53 cerchi dà etichette `undefined` nel TS (DIVERGENZE.md): fuori dal dominio (massimo 51).
    return { part, n: R.p(0.1) ? R.pick([0, 1, 2]) : part === 'A' ? R.skew(3, 120) : R.int(3, 51) };
  },
};

// ---------- sessioni sintetiche ----------
const FUZZ_MODEL = 'fuzz';
const randomModel = (R) => ({
  respond: R.p(0.2) ? R.u(0.2, 0.8) : R.u(0.9, 1),
  wrongKey: R.p(0.3) ? 0 : R.u(0, 0.4),
  commission: R.u(0, 0.7),
  anticipate: R.p(0.5) ? 0 : R.u(0, 0.2),
  interrupt: R.p(0.5) ? 0 : R.u(0, 0.3),
  rtMean: R.u(250, 900),
  rtSd: R.u(20, 300),
});

/** Lunghezza della sessione: 0..400 sbilanciata verso le brevi, con alcuni estremi (0, 1, 400) sempre presenti. */
const sessionLength = (R) => (R.p(0.04) ? R.pick([0, 1, 2, 400]) : R.skew(0, 400));

const KEYS = { stroop: ['R', 'V', 'B', 'G'], flanker: ['f', 'j'], visual_search: ['present', 'absent'], mental_rotation: ['same', 'different'] };
const other = (list, key) => list[(list.indexOf(key) + 1) % list.length];
const ANGLES = [0, 30, 60, 90, 120, 150, 180];

/** Elementi (condizione + risposta attesa) per i test con sessioni "da sequencer". */
const ITEMS = {
  stroop: (R) => { const k = R.pick(KEYS.stroop); return { condition: R.pick(['congruent', 'incongruent']), stimulus: 'ROSSO/BLU', requiresResponse: true, correctResponse: k, wrongResponse: other(KEYS.stroop, k) }; },
  flanker: (R) => { const k = R.pick(KEYS.flanker); return { condition: R.pick(['congruent', 'incongruent', 'neutral']), stimulus: '←←→←←', requiresResponse: true, correctResponse: k, wrongResponse: other(KEYS.flanker, k) }; },
  pvt: () => ({ condition: 'pvt', stimulus: 'pvt', requiresResponse: true, correctResponse: 'space', wrongResponse: 'space' }),
  visual_search: (R) => {
    const present = R.p(0.5);
    const k = present ? 'present' : 'absent';
    return { condition: `${R.pick(['feature', 'conjunction'])}-${present ? 'present' : 'absent'}-${R.pick([4, 8, 16])}`, stimulus: 'v', requiresResponse: true, correctResponse: k, wrongResponse: other(KEYS.visual_search, k) };
  },
  mental_rotation: (R) => {
    const same = R.p(0.5);
    const k = same ? 'same' : 'different';
    return { condition: `${k}-${R.pick(ANGLES)}`, stimulus: 'm', requiresResponse: true, correctResponse: k, wrongResponse: other(KEYS.mental_rotation, k) };
  },
};
const goItems = (nogoName) => (R, nogoShare) => { const nogo = R.p(nogoShare); return { condition: nogo ? nogoName : 'go', stimulus: nogo ? nogoName : 'go', requiresResponse: !nogo, correctResponse: ' ' }; };
ITEMS.gonogo = (R) => goItems('nogo')(R, 0.25);
ITEMS.sart = (R) => goItems('nogo')(R, 0.11);
ITEMS.nback = (R) => {
  const r = R.f();
  const condition = r < 0.3 ? 'target' : r < 0.45 ? 'lure' : 'nontarget';
  return { condition, stimulus: R.pick(['B', 'C', 'D', 'F']), requiresResponse: condition === 'target', correctResponse: 'space' };
};
const EVALUATE = { gonogo: goEvaluate, sart: goEvaluate, nback: goEvaluate };
const VOCAB = {
  stroop: ['congruent', 'incongruent', 'boh'], gonogo: ['go', 'nogo', 'x'], flanker: ['congruent', 'incongruent', 'neutral', 'x'], sart: ['go', 'nogo', 'x'],
  pvt: ['pvt', 'x'], nback: ['target', 'nontarget', 'lure', 'catch'], visual_search: ['feature-present-4', 'conjunction-absent-16', 'feature-absent-8', 'garbage', 'feature-maybe-4', 'feature-present-4.5', 'hybrid-present-4', 'feature-present-'],
  mental_rotation: ['same-0', 'different-90', 'same-', 'same-1e2', 'different- 60 ', 'same--30', 'same', 'same-1e999', 'same-.5', 'same-+30', 'foo', 'same-abc'],
};

/** Scambia a caso campi di alcuni trial (dati inconsistenti): il Rust deve comunque coincidere col TS. */
function chaos(R, trials, vocab) {
  const rate = R.u(0.02, 0.2);
  for (const t of trials) {
    if (!R.p(rate)) continue;
    const kind = R.int(0, 7);
    if (kind === 0) t.flag = R.pick(['VALID', 'ANTICIPATION', 'OMISSION', 'INTERRUPTED']);
    else if (kind === 1) t.correct = !t.correct;
    else if (kind === 2) t.rtMs = null;
    else if (kind === 3) t.rtMs = R.p(0.5) ? R.u(1, 5000) : R.int(1, 3000);
    else if (kind === 4) t.response = R.p(0.5) ? null : R.pick(['x', ' ', 'space']);
    else if (kind === 5) t.phase = t.phase === 'test' ? 'practice' : 'test';
    else if (kind === 6 && vocab) t.condition = R.pick(vocab);
    else t.trialIndex = R.int(0, 400);
  }
  if (R.p(0.1)) trials.sort(() => R.f() - 0.5);
  return trials;
}

/** RT su griglia di 0.05 ms: medie a metà decimale, dove un'arrotondamento diverso TS/Rust emergerebbe. */
const toGrid = (trials) => trials.forEach((t) => { if (t.rtMs !== null) t.rtMs = Math.round(t.rtMs * 20) / 20; });

function synthesize(R, test) {
  const n = sessionLength(R);
  const items = Array.from({ length: n }, () => ITEMS[test](R));
  MODELS[FUZZ_MODEL] = randomModel(R);
  const practice = Math.min(n, R.p(0.3) ? 0 : R.int(0, 20));
  const trials = simulate(test, items, FUZZ_MODEL, R.f, { practice, evaluate: EVALUATE[test] ?? keyEvaluate });
  if (R.p(0.25)) toGrid(trials);
  if (R.p(0.35)) chaos(R, trials, VOCAB[test]);
  return trials;
}

/** Trial grezzi da sessioni di Corsi: una sequenza per trial. */
function corsiTrials(R) {
  const n = R.skew(0, 60);
  const trials = Array.from({ length: n }, (_, i) => {
    const length = R.int(1, 9);
    const stimulus = Array.from({ length }, () => R.int(0, 8)).join('-');
    const flag = R.p(0.1) ? R.pick(['INTERRUPTED', 'OMISSION']) : 'VALID';
    return { testId: 'corsi', sessionId: 'FUZZ-0001', trialIndex: i, phase: R.p(0.15) ? 'practice' : 'test', condition: 'corsi', stimulus, response: stimulus, correct: R.p(Math.max(0.05, 1.1 - length * 0.1)), rtMs: null, flag, onsetTimestamp: 1000 + i * 1500 };
  });
  return trials;
}

/** Sessione WCST: passi con categorie e dimensioni combacianti casuali; trial e meta (a volte disallineati, come nel TS). */
function wcstSteps(R) {
  const runToShift = R.int(2, 12);
  const n = R.skew(0, 256);
  const dims = ['color', 'shape', 'number'];
  const rules = [];
  const matched = [];
  let category = 0;
  let run = 0;
  const bias = R.u(0.2, 0.95);
  for (let i = 0; i < n; i++) {
    const rule = dims[category % 3];
    const prior = R.p(0.5) ? dims[(category + 2) % 3] : R.pick(dims);
    let m = dims.filter((d) => R.p(d === rule ? bias : d === prior ? 0.5 : 0.25));
    if (R.p(0.05)) m = [];
    rules.push(rule);
    matched.push(m);
    run = m.includes(rule) ? run + 1 : 0;
    if (run >= runToShift) { category++; run = 0; }
  }
  return { runToShift, rules, matched };
}

function wcstScoring(R) {
  const { runToShift, rules, matched } = wcstSteps(R);
  let trials = matched.map((m, i) => ({ testId: 'wcst', sessionId: 'FUZZ-0001', trialIndex: i, phase: 'test', condition: rules[i], stimulus: String(i), response: String(i % 4), correct: m.includes(rules[i]), rtMs: 800 + i, flag: 'VALID', onsetTimestamp: 1000 + i * 1500 }));
  let metas = matched.map((m, i) => ({ currentRule: rules[i], matchedDims: m }));
  const mode = R.pick(['plain', 'interrupted-filtered', 'interrupted-misaligned', 'practice', 'short-metas', 'extra-metas', 'plain']);
  if (mode.startsWith('interrupted')) {
    const cut = R.u(0.02, 0.2);
    const drop = trials.map(() => R.p(cut));
    trials = trials.map((t, i) => (drop[i] ? { ...t, flag: 'INTERRUPTED' } : t));
    if (mode === 'interrupted-filtered') metas = metas.filter((_, i) => !drop[i]);
  } else if (mode === 'practice') {
    const k = Math.min(trials.length, R.int(0, 6));
    trials = trials.map((t, i) => (i < k ? { ...t, phase: 'practice' } : t));
    metas = metas.slice(k);
  } else if (mode === 'short-metas') metas = metas.slice(0, R.int(0, metas.length));
  else if (mode === 'extra-metas') metas = [...metas, ...metas.slice(0, R.int(0, 5))];
  return { trials, metas, params: { deckSize: 64, runToShift, maxCategories: R.int(1, 12) }, mode };
}

function trailScoring(R) {
  const nTargets = R.pick([0, 1, 3, 8, 8, 25, 25, 51, R.int(0, 60)]);
  const trials = [];
  for (const part of ['A', 'B', 'A', 'B', 'C']) {
    if (R.p(0.2)) continue;
    const complete = R.p(0.6);
    const corrects = complete ? nTargets : R.int(0, Math.max(0, nTargets));
    const phase = R.p(0.15) ? 'practice' : 'test';
    const rows = [];
    for (let k = 0; k < corrects; k++) rows.push(true);
    for (let k = R.skew(0, 12); k > 0; k--) rows.splice(R.int(0, rows.length), 0, false);
    const dt = R.p(0.3) ? R.pick([0, 500, 1000]) : R.u(150, 2500);
    rows.forEach((correct) => trials.push({
      testId: 'trailMaking', sessionId: 'FUZZ-0001', trialIndex: trials.length, phase, condition: part, stimulus: String(trials.length % 25 + 1), response: String(trials.length % 25 + 1), correct,
      rtMs: R.p(0.03) ? null : R.p(0.5) ? Math.round(dt * R.u(0.3, 1.7)) : dt * R.u(0.3, 1.7), flag: 'VALID', onsetTimestamp: 1000 + trials.length * 700,
    }));
  }
  return { trials, nTargets };
}

/** Ingressi di scoring (oltre ai trial) per test; restituisce {trials, ...ingressi}. */
const SCORING_INPUT = {
  flanker: (R, trials) => ({ trials }),
  sart: (R, trials) => ({ trials, windows: [4, 0, 2, 100, R.int(0, 30)] }),
  corsi: (R) => ({ trials: corsiTrials(R), startLength: R.p(0.8) ? R.int(2, 6) : R.pick([1, 2.5, 3.5, 0]) }),
  nback: (R, trials) => ({ trials, nQuartiles: R.pick([4, 4, 2, 1, 3, 5, 8]) }),
  wcst: (R) => wcstScoring(R),
  trail_making: (R) => trailScoring(R),
};
const SYNTH_TESTS = new Set(['stroop', 'gonogo', 'flanker', 'sart', 'visual_search', 'pvt', 'nback', 'mental_rotation']);

function scoringInput(R, test) {
  const trials = SYNTH_TESTS.has(test) ? synthesize(R, test) : null;
  return SCORING_INPUT[test] ? SCORING_INPUT[test](R, trials) : { trials };
}

// ---------- formato compatto dei trial nel file ----------
const FLAG_CODE = { VALID: 'V', ANTICIPATION: 'A', OMISSION: 'O', INTERRUPTED: 'I' };
/** [indice, fase(t|p), condizione, stimolo, risposta, corretto(0|1), rtMs, flag, onset]: il Rust ricostruisce il TrialResult. */
const packTrial = (t) => [t.trialIndex, t.phase === 'test' ? 't' : 'p', t.condition, t.stimulus, t.response, t.correct ? 1 : 0, t.rtMs, FLAG_CODE[t.flag], t.onsetTimestamp];
const TEST_ID = { stroop: 'stroop1', gonogo: 'gonogo', flanker: 'flanker', sart: 'sart', visual_search: 'visualSearch', pvt: 'pvt', corsi: 'corsi', nback: 'nback', wcst: 'wcst', mental_rotation: 'mentalRotation', trail_making: 'trailMaking' };

// ---------- casi di sequenza con watchdog ----------
/** Esegue i casi in un worker; se uno non produce risultato entro TIMEOUT_MS il worker è terminato e il caso è `tsHang`. */
async function runGenerations(test, cases) {
  const results = new Map();
  const hangs = [];
  const errors = [];
  let pending = cases;
  while (pending.length > 0) {
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), { workerData: { test, cases: pending } });
    let current = null;
    let finished = false;
    const outcome = await new Promise((resolve) => {
      let timer = null;
      const arm = (ms = TIMEOUT_MS) => { clearTimeout(timer); timer = setTimeout(() => resolve('timeout'), ms); };
      worker.on('message', (m) => {
        if (m.done) { clearTimeout(timer); finished = true; resolve('done'); return; }
        if (m.started) { current = m.id; arm(); return; }
        if (m.error) errors.push({ id: m.id, error: m.error });
        else results.set(m.id, m.result);
        clearTimeout(timer);
      });
      worker.on('error', (e) => { clearTimeout(timer); errors.push({ id: current, error: String(e) }); resolve('error'); });
      arm(30000); // avvio del worker: caricamento dei moduli TS
    });
    await worker.terminate();
    if (finished || outcome === 'done') break;
    const stuck = current;
    if (outcome === 'timeout') hangs.push(stuck);
    const resumeAt = pending.findIndex((c) => c.id === stuck);
    pending = resumeAt < 0 ? [] : pending.slice(resumeAt + 1);
  }
  return { results, hangs, errors };
}

/** Divergenza attesa #3 (DIVERGENZE.md): il TS accetta "feature-present-" (Number('') === 0), il Rust la scarta come condizione malformata. */
function markEmptySize(kase, input) {
  const malformed = input.trials.map((t) => (t.condition === 'feature-present-' ? { ...t, condition: 'garbage' } : t));
  return { ...kase, expectedDivergence: { reason: "Number('') === 0 in JS: numerosità vuota accettata dal TS, scartata dal Rust", ...ENGINES.visual_search.score({ trials: malformed }) } };
}

// ---------- extras per test ----------
function buildExtras(test, R) {
  const E = ENGINES[test].extras ?? {};
  const out = {};
  const many = (count, make) => Array.from({ length: count }, (_, i) => make(i));
  const regressionPoints = () => {
    const n = R.pick([0, 1, 2, 3, 3, 4, 5, 7]);
    const distinct = R.p(0.8);
    return Array.from({ length: n }, (_, i) => [distinct ? ANGLES[i % 7] : R.pick([4, 4, 8]), R.p(0.5) ? Math.round(R.u(300, 1500)) : R.u(300, 1500)]);
  };
  if (test === 'visual_search') out.regression = many(CASES, () => E.regression(regressionPoints()));
  if (test === 'mental_rotation') {
    const shapes = many(CASES, () => E.shape(R.seed()));
    out.shapes = shapes;
    out.projections = many(Math.min(CASES, 300), (i) => E.projection(shapes[i].cubes, R.p(0.6) ? R.pick(ANGLES) * R.pick([1, -1]) : R.u(-360, 360)));
    out.regression = many(CASES, () => E.regression(regressionPoints()));
  }
  if (test === 'corsi') {
    out.geometry = many(CASES, () => E.geometry(Array.from({ length: R.int(0, 9) }, () => R.int(0, 8))));
    out.spans = many(CASES, () => E.span(R.int(0, 20), R.p(0.8) ? R.int(1, 6) : R.pick([2.5, 0, 3.5])));
    out.stops = many(CASES, () => E.stop(Array.from({ length: R.int(0, 6) }, () => R.p(0.5))));
  }
  if (test === 'nback') {
    out.probit = many(CASES, () => E.probit(R.p(0.2) ? R.pick([1e-12, 1e-9, 1e-6, 0.02425, 0.97575, 1 - 1e-9, 0.5]) : R.p(0.2) ? R.u(0, 0.03) : R.u(1e-6, 1 - 1e-6)));
    out.sdt = many(CASES, () => {
      const targets = R.int(0, 120);
      const nonTargets = R.int(0, 250);
      return E.sdt([R.int(0, targets), targets, R.int(0, nonTargets), nonTargets]);
    });
    out.chunks = many(CASES, () => E.chunk(Array.from({ length: R.int(0, 60) }, (_, i) => i), R.int(1, 8)));
  }
  if (test === 'wcst') out.perseveration = many(CASES, () => E.perseveration(wcstSteps(R)));
  if (test === 'trail_making') {
    out.labels = many(CASES, () => { const part = R.pick(['A', 'B']); return E.labels(part, part === 'A' ? R.int(0, 120) : R.int(0, 51)); });
    out.runs = many(CASES, () => {
      const part = R.pick(['A', 'B']);
      const n = part === 'A' ? R.skew(0, 60) : R.skew(0, 51);
      const startMs = R.p(0.5) ? 0 : R.u(0, 10000);
      let t = startMs;
      let next = 0;
      const clicks = Array.from({ length: R.skew(0, 140) }, () => {
        t += R.p(0.3) ? R.int(100, 2000) : R.u(100, 2000);
        const roll = R.f();
        const index = roll < 0.55 ? next : roll < 0.9 ? R.int(0, n) : n + R.int(0, 5); // bersaglio, cerchio qualsiasi, fuori campo
        if (index === next) next++;
        return [index, t];
      });
      return E.run({ part, n, seed: R.seed(), phase: R.p(0.2) ? 'practice' : 'test', startMs, clicks });
    });
  }
  return out;
}

// ---------- main ----------
mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) if (/\.json(\.gz)?$/.test(f) && (ONLY.length === 0 || ONLY.some((t) => f.startsWith(`${t}.`)))) rmSync(join(OUT_DIR, f));

const summary = {};
const files = [];
for (const [testIndex, test] of Object.keys(ENGINES).entries()) {
  if (ONLY.length > 0 && !ONLY.includes(test)) continue;
  const started = Date.now();
  const R = makeRng(MASTER_SEED + testIndex * 7919);
  const seqCases = Array.from({ length: CASES }, (_, i) => ({ id: `seq-${i}`, seed: R.seed(), params: SEQUENCE_PARAMS[test](R) }));
  if (test === 'corsi') seqCases.forEach((c) => { const lo = c.params.startLength; c.lengths = Array.from({ length: c.params.maxLength - lo + 1 }, (_, k) => lo + k); });
  const gens = await runGenerations(test, seqCases);
  const generation = [];
  const tsHang = [];
  for (const c of seqCases) {
    if (gens.hangs.includes(c.id)) { tsHang.push({ id: c.id, seed: c.seed, params: c.params }); continue; }
    const result = gens.results.get(c.id);
    if (result === undefined) throw new Error(`${test} ${c.id}: ${gens.errors.find((e) => e.id === c.id)?.error ?? 'nessun risultato'}`);
    const { tsMaxNoGoRun, ...fields } = result;
    const kase = { id: c.id, seed: c.seed, params: c.params, ...(c.lengths ? { lengths: c.lengths } : {}), ...fields };
    if (tsMaxNoGoRun > 2) kase.expectedDivergence = { reason: 'TS: più di 2 No-Go consecutivi in coda (DIVERGENZE.md #1)', tsMaxNoGoRun };
    generation.push(kase);
  }

  const scoring = [];
  for (let i = 0; i < CASES; i++) {
    const input = scoringInput(R, test);
    const full = ENGINES[test].score(input);
    const { trials, ...rest } = input;
    let kase = { id: `score-${i}`, ...rest, trials: trials.map(packTrial), ...full };
    if (test === 'visual_search' && trials.some((t) => t.condition === 'feature-present-')) kase = markEmptySize(kase, input);
    scoring.push(kase);
  }
  const data = { test, masterSeed: MASTER_SEED + testIndex * 7919, testId: TEST_ID[test], generation, scoring, tsHang, tsErrors: gens.errors, ...buildExtras(test, R) };
  summary[test] = { generation: generation.length, scoring: scoring.length, tsHang: tsHang.length, seconds: (Date.now() - started) / 1000 };
  files.push([test, JSON.stringify(data)]);
  console.log(test, JSON.stringify(summary[test]));
}

// Se i file superano 5 MB complessivi si scrivono compressi (.json.gz); il Rust legge entrambe le forme.
const total = files.reduce((sum, [, text]) => sum + Buffer.byteLength(text), 0);
const gz = total > GZIP_ABOVE_BYTES;
for (const [test, text] of files) {
  const path = join(OUT_DIR, `${test}.json${gz ? '.gz' : ''}`);
  writeFileSync(path, gz ? gzipSync(text, { level: 9 }) : text);
  summary[test].bytes = statSync(path).size;
}
console.log(`totale ${total} byte grezzi, gzip=${gz}`);
console.log(JSON.stringify(summary, null, 1));
