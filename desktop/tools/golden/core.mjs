// Genera desktop/fixtures/core.json dai motori TS (oracolo). Uso (dalla radice del repo):
//   node --experimental-transform-types desktop/tools/golden/core.mjs
// Non modifica src/. Valori non finiti codificati come stringhe "Infinity"/"-Infinity".
import { register } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

register('./hooks.mjs', import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, '..', '..', 'fixtures', 'core.json');

const { mulberry32, shuffle, randInt, pick } = await import('../../../src/engine/rng.ts');
const val = await import('../../../src/engine/validation.ts');
const sdt = await import('../../../src/engine/sdt.ts');
const exp = await import('../../../src/engine/export.ts');
const fmt = await import('../../../src/engine/exportFormats.ts');
const sexp = await import('../../../src/engine/session/export.ts');
const model = await import('../../../src/engine/session/model.ts');

const SEEDS = [1, 42, 2026, 123456789, 0, 4294967295];
const enc = (x) => (x === Infinity ? 'Infinity' : x === -Infinity ? '-Infinity' : x);
const plain = (x) => JSON.parse(JSON.stringify(x));
const take = (seed, n) => { const r = mulberry32(seed); return Array.from({ length: n }, () => r()); };

// ---------- rng ----------
const rng = {
  seeds: SEEDS,
  mulberry32: SEEDS.map((seed) => ({ seed, values: take(seed, 64) })),
  shuffle: SEEDS.flatMap((seed) => [0, 1, 2, 3, 10, 52].map((n) => {
    const items = Array.from({ length: n }, (_, i) => i);
    return { seed, items, out: shuffle(items, mulberry32(seed)) };
  })),
  randInt: SEEDS.flatMap((seed) => [[0, 0], [1, 6], [-5, 5], [3, 3], [0, 1000]].map(([min, max]) => {
    const r = mulberry32(seed);
    return { seed, min, max, values: Array.from({ length: 20 }, () => randInt(min, max, r)) };
  })),
  pick: SEEDS.map((seed) => {
    const items = [10, 11, 12, 13, 14];
    const r = mulberry32(seed);
    return { seed, items, values: Array.from({ length: 20 }, () => pick(items, r)) };
  }),
};

// ---------- validation ----------
const RTS = [null, -5, 0, 149, 149.999, 150, 150.001, 300, 1e9];
const classify = [];
for (const rtMs of RTS) for (const responded of [true, false]) for (const interrupted of [true, false]) {
  classify.push({ rtMs, responded, interrupted, flag: val.classifyRt(rtMs, responded, interrupted) });
}
const r7 = mulberry32(7);
const LISTS = [[], [5], [1, 2, 3], [2, 4, 4, 4, 5, 5, 7, 9], [1e9, 1e9 + 1], [-1, 1], [0.1, 0.2, 0.3], [3, 3, 3],
  Array.from({ length: 100 }, () => r7() * 1000)];
const stats = LISTS.map((values) => ({ values, mean: val.mean(values), sd: val.standardDeviation(values) }));

const mk = (phase, flag, correct, rtMs, i = 0) => ({
  testId: 'stroop1', sessionId: 'S', trialIndex: i, phase, condition: 'c', stimulus: 's', response: rtMs === null ? null : 'k',
  correct, rtMs, flag, onsetTimestamp: i * 10,
});
const TRIAL_SETS = {
  empty: [],
  single_valid: [mk('test', 'VALID', true, 300)],
  only_omissions: [mk('test', 'OMISSION', false, null, 0), mk('test', 'OMISSION', false, null, 1)],
  only_practice: [mk('practice', 'VALID', true, 300), mk('practice', 'ANTICIPATION', false, 100, 1)],
  mixed: [
    mk('practice', 'VALID', true, 900, 0), mk('test', 'VALID', true, 300, 1), mk('test', 'VALID', true, 500.5, 2),
    mk('test', 'VALID', false, 900, 3), mk('test', 'ANTICIPATION', false, 100, 4), mk('test', 'OMISSION', false, null, 5),
    mk('test', 'INTERRUPTED', false, null, 6), mk('test', 'INTERRUPTED', false, 250, 7), mk('test', 'VALID', true, 410.25, 8),
  ],
};
const FLAGS = ['VALID', 'ANTICIPATION', 'OMISSION', 'INTERRUPTED'];
const trialSets = Object.entries(TRIAL_SETS).map(([name, trials]) => ({
  name, trials,
  counts: Object.fromEntries(FLAGS.map((f) => [f, val.countFlag(trials, f)])),
  validCorrectRts: val.validCorrectRts(trials),
  meanRt: val.meanRtOfValidCorrect(trials),
  sdRt: val.sdRtOfValidCorrect(trials),
}));
const validation = { anticipationCutoffMs: val.ANTICIPATION_CUTOFF_MS, classify, stats, trialSets };

// ---------- sdt ----------
const PS = [-0.1, 0, 1e-300, 1e-10, 1e-6, 0.001, 0.01, 0.02, 0.02425, 0.024250001, 0.03, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.97,
  0.97575, 0.975749999, 0.99, 0.999, 1 - 1e-10, 1, 1.5];
const rates = [];
for (const [targets, nonTargets] of [[0, 0], [1, 1], [10, 10], [20, 30], [100, 200]]) {
  for (const hits of new Set([0, 1, Math.floor(targets / 2), targets].filter((h) => h <= targets))) {
    for (const falseAlarms of new Set([0, 1, Math.floor(nonTargets / 2), nonTargets].filter((f) => f <= nonTargets))) {
      rates.push({
        hits, targets, falseAlarms, nonTargets,
        dPrime: sdt.dPrime(hits, targets, falseAlarms, nonTargets), criterionC: sdt.criterionC(hits, targets, falseAlarms, nonTargets),
      });
    }
  }
}
const sdtOut = { probit: PS.map((p) => ({ p, z: enc(sdt.probit(p)) })), rates };

// ---------- export ----------
const EXPORTED_AT = '2026-07-07T10:00:00.000Z';
const USER_AGENT = 'GoldenAgent/1.0 (test)';
const tr = (i, phase, condition, stimulus, response, correct, rtMs, flag, onsetTimestamp, sessionId = 'S-AB12-0930', testId = 'stroop1') =>
  ({ testId, sessionId, trialIndex: i, phase, condition, stimulus, response, correct, rtMs, flag, onsetTimestamp });
const RESULTS = {
  completo: {
    testId: 'stroop1', sessionId: 'S-AB12-0930', startedAt: '2026-07-07T09:30:15.123Z',
    params: { trials: 20, nome: 'a<b & "c"', attivo: true, lista: [1, 2, 3], nulla: null, soglia: 0.1, annidato: { x: 1 }, grande: 1e21, piccolo: 1.5e-7 },
    trials: [
      tr(0, 'practice', 'congruent', 'ROSSO; "x"', 'r', true, 412.4, 'VALID', 1000.2),
      tr(1, 'test', 'incongruent', 'a\tb\nc\r\nd', null, false, null, 'OMISSION', 2500.7),
      tr(2, 'test', 'congruent', 'x,y', 'g', true, 0.5, 'ANTICIPATION', 2500.7),
      tr(3, 'test', 'congruent', '', 'b', false, 2.5, 'VALID', 1000.49999),
      tr(4, 'test', 'incongruent', 'z', 'b', true, 999.5, 'INTERRUPTED', 5000.5),
    ],
    summary: [
      { label: 'RT medio', value: 412.5, unit: 'ms' }, { label: 'Intero', value: 3 }, { label: 'Somma', value: 0.1 + 0.2, unit: '' },
      { label: 'Esito', value: 'ok; "bene"' }, { label: 'Grande', value: 1e21 }, { label: 'Piccolo', value: 1.5e-7, unit: '%' }, { label: 'Neg', value: -0.25 },
    ],
  },
  vuoto: { testId: 'gonogo', sessionId: 'X', startedAt: '2026-01-01T00:00:00.000Z', params: {}, trials: [], summary: [] },
  sanitize: {
    testId: 'visualSearch', sessionId: 'S/../x y_é', startedAt: '2026-12-31T23:59:59.999Z', params: { k: 'v' },
    trials: [tr(0, 'test', 'target', 'T', 'space', true, 612, 'VALID', 10, 'S/../x y_é', 'visualSearch')],
    summary: [{ label: 'Accuratezza', value: 100, unit: '%' }],
  },
};
const FORMATS = ['csv-it', 'csv-intl', 'summary-csv', 'events-tsv', 'json', 'html'];
const csvFields = [null, '', 'a', 'a;b', 'a,b', 'a"b', 'a\nb', 0, -1.5, 1e21, true, false]
  .flatMap((v) => [';', ','].map((sep) => ({ value: v, sep, out: exp.csvField(v, sep) })));
const exports_ = {
  exportedAt: EXPORTED_AT, userAgent: USER_AGENT, csvFields,
  cases: Object.entries(RESULTS).map(([name, result]) => ({
    name, result,
    csv: exp.toCsv(result),
    trialsCsvIt: fmt.toTrialsCsv(result, 'it'), trialsCsvIntl: fmt.toTrialsCsv(result, 'intl'),
    summaryCsvIt: fmt.toSummaryCsv(result, 'it'), summaryCsvIntl: fmt.toSummaryCsv(result, 'intl'),
    eventsTsv: fmt.toEventsTsv(result),
    html: fmt.toHtmlReport(result, 'Stroop <1> & "co"', EXPORTED_AT),
    json: exp.toJson(result, { exportedAt: EXPORTED_AT, userAgent: USER_AGENT }),
    filenameCsv: exp.exportFilename(result, 'csv'), filenameJson: exp.exportFilename(result, 'json'),
    formatFilenames: Object.fromEntries(FORMATS.map((f) => [f, fmt.formatFilename(result, f)])),
  })),
  escapeHtml: ['', 'a&b', '<x y="z">\'', 'già'].map((s) => ({ in: s, out: fmt.escapeHtml(s) })),
};

// ---------- session ----------
const bi = (testId, practice = false) => ({ testId, params: { trials: 10 }, practice });
const TEMPLATE = {
  id: 'tpl1', name: 'Protocollo', createdAt: '2026-07-07T08:00:00.000Z', totalMs: 3600000,
  phases: [
    { id: 'p1', name: 'Mattina', durationMs: 1200000, pins: [{ id: 'a', offsetMs: 600000, label: 'Primo', battery: [bi('stroop1', true), bi('gonogo')] },
      { id: 'b', offsetMs: 0, battery: [bi('pvt')] }] },
    { id: 'p2', name: 'Pausa', durationMs: 1200000, pins: [] },
    { id: 'p3', name: 'Sera', durationMs: 1200000, pins: [{ id: 'c', offsetMs: 2400000, battery: [bi('nback')] }, { id: 'd', offsetMs: 2400000, battery: [] }] },
  ],
};
const TEMPLATES = {
  base: TEMPLATE,
  legacy: { ...TEMPLATE, id: 'old', totalMs: 0 },
  nophases: { ...TEMPLATE, id: 'none', totalMs: 0, phases: [] },
  onlypins: { ...TEMPLATE, id: 'pins', totalMs: 0, phases: [{ id: 'q', name: 'Q', durationMs: 0, pins: [{ id: 'z', offsetMs: 777, battery: [] }] }] },
};
const ELAPSED = [-1000, 0, 1, 599999, 600000, 1200000, 1800000, 2400000, 3599999, 3600000, 9999999];
const COMPLETED = [[], ['b'], ['b', 'a'], ['a', 'b', 'c'], ['a', 'b', 'c', 'd'], ['zz']];
const OFFSETS = [-5, 0, 0.5, 599999.5, 1200000, 2399999, 3600000, 9e9];
const entries = Object.entries(TEMPLATES);
const run = {
  runId: 'S-AB12-0930', template: TEMPLATE, startedAtEpoch: 1783416615123, startedAtIso: '2026-07-07T09:30:15.123Z',
  completedPinIds: ['b', 'a'], finished: true,
  results: [
    { phaseId: 'p1', phaseName: 'Mattina', pinId: 'b', offsetMs: 0, indexInBattery: 0, result: RESULTS.completo },
    { phaseId: 'p1', phaseName: 'Mat;tina', pinId: 'a', offsetMs: 600000.5, indexInBattery: 1, result: RESULTS.sanitize },
    { phaseId: 'p3', phaseName: 'Sera', pinId: 'c', offsetMs: 2400000, indexInBattery: 0, result: RESULTS.vuoto },
  ],
};
const session = {
  exportedAt: EXPORTED_AT, userAgent: USER_AGENT, run,
  csv: sexp.toSessionCsv(run), summaryCsvIt: sexp.toSessionSummaryCsv(run, 'it'), summaryCsvIntl: sexp.toSessionSummaryCsv(run, 'intl'),
  json: sexp.toSessionJson(run, { exportedAt: EXPORTED_AT, userAgent: USER_AGENT }),
  filenameJson: sexp.sessionFilename(run, 'json'), filenameCsv: sexp.sessionFilename(run, 'csv'),
  templates: TEMPLATES,
  spans: entries.map(([name, tpl]) => ({ name, spans: model.phaseSpans(tpl).map((s) => ({ id: s.phase.id, startMs: s.startMs, endMs: s.endMs })) })),
  totals: entries.map(([name, tpl]) => ({ name, totalMs: model.sessionTotalMs(tpl) })),
  flat: entries.map(([name, tpl]) => ({ name, pins: model.flattenPins(tpl).map((f) => [f.phase.id, f.pin.id]) })),
  phaseAtElapsed: entries.flatMap(([name, tpl]) => ELAPSED.map((elapsedMs) =>
    ({ name, elapsedMs, phaseId: model.phaseAtElapsed(tpl, elapsedMs)?.id ?? null }))),
  states: entries.flatMap(([name, tpl]) => ELAPSED.flatMap((elapsedMs) => COMPLETED.map((completed) =>
    ({ name, elapsedMs, completed, state: plain(model.computeSessionState(tpl, elapsedMs, completed)) })))),
  phaseIndexAtOffset: entries.flatMap(([name, tpl]) => OFFSETS.map((offsetMs) =>
    ({ name, offsetMs, index: model.phaseIndexAtOffset(tpl, offsetMs) }))),
  movePinById: ['a', 'b', 'c', 'd', 'nope'].flatMap((pinId) => OFFSETS.map((offsetMs) =>
    ({ pinId, offsetMs, out: plain(model.movePinById(TEMPLATE, pinId, offsetMs)) }))),
  movePin: [[0, 0], [0, 1], [2, 1], [5, 0], [0, 9]].map(([fromPhaseIdx, pinIdx]) =>
    ({ fromPhaseIdx, pinIdx, offsetMs: 1800000, out: plain(model.movePin(TEMPLATE, fromPhaseIdx, pinIdx, 1800000)) })),
  distribute: [{ ...TEMPLATE, totalMs: 3600001 }, { ...TEMPLATE, totalMs: 10 }, { ...TEMPLATE, totalMs: 0 }, TEMPLATES.nophases]
    .map((input) => ({ input, out: plain(model.distributePhasesEvenly(input)) })),
  runIds: SEEDS.map((seed) => ({ seed, hour: 9, minute: 5, out: model.makeRunId(new Date(2026, 6, 7, 9, 5), mulberry32(seed)) })),
  localIds: SEEDS.map((seed) => ({ seed, prefix: 'pin', out: model.makeLocalId('pin', mulberry32(seed)) })),
};

const out = {
  meta: {
    generator: 'desktop/tools/golden/core.mjs', node: `v${process.versions.node.split('.')[0]}`, floatTolerance: 1e-9, seeds: SEEDS,
    note: 'Valori non finiti come stringhe. engineVersion (JSON) e il piè di pagina HTML del Rust non esistono nel TS: il test li rimuove prima del confronto.',
  },
  rng, validation, sdt: sdtOut, export: exports_, session,
};
mkdirSync(path.dirname(FIXTURE), { recursive: true });
writeFileSync(FIXTURE, JSON.stringify(out, null, 1) + '\n');
console.log('scritto', FIXTURE);
