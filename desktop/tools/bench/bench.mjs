// Benchmark TypeScript dei motori: stesse operazioni, stessi input e stesso metodo di
// crates/engines/benches/engines.rs (nativo) e tools/bench/run-wasm.mjs (WASM).
// Uso: node tools/bench/bench.mjs   (scrive tools/bench/inputs.json e fixtures/evidence/bench-ts.json)
import { register } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { measure } from './measure.mjs';
import { fileURLToPath } from 'node:url';

register('../golden/hooks.mjs', import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const desktop = join(here, '..', '..');
const src = (p) => `../../../src/${p}`;
const { mulberry32 } = await import(src('engine/rng.ts'));
const { DEFAULTS } = await import(src('config/defaults.ts'));
const T = {
  stroop: await import(src('engine/tests/stroop.ts')),
  gonogo: await import(src('engine/tests/gonogo.ts')),
  flanker: await import(src('engine/tests/flanker.ts')),
  sart: await import(src('engine/tests/sart.ts')),
  visual_search: await import(src('engine/tests/visualSearch.ts')),
  pvt: await import(src('engine/tests/pvt.ts')),
  corsi: await import(src('engine/tests/corsi.ts')),
  nback: await import(src('engine/tests/nback.ts')),
  wcst: await import(src('engine/tests/wcst.ts')),
  mental_rotation: await import(src('engine/tests/mentalRotation.ts')),
  trail_making: await import(src('engine/tests/trailMaking.ts')),
};
const SEED = 42;
const ANGLES = [0, 30, 60, 90, 120, 150, 180];
const D = DEFAULTS;
const scaled = (p, s, key = 'nTrials') => ({ ...p, [key]: p[key] * s });

// Generazione: parametri di default con le numerosità moltiplicate per `s`.
const GEN = {
  stroop: (s, r) => T.stroop.generateStroop(scaled(D.stroop1, s), r),
  gonogo: (s, r) => T.gonogo.generateGoNoGo(scaled(D.gonogo, s), r),
  flanker: (s, r) => T.flanker.generateFlanker(scaled(D.flanker, s), r),
  sart: (s, r) => T.sart.generateSart(scaled(D.sart, s), r),
  visual_search: (s, r) => T.visual_search.generateVisualSearch(scaled(D.visualSearch, s), r),
  pvt: (s, r) => T.pvt.generatePvt(scaled(D.pvt, s), r),
  nback: (s, r) => T.nback.generateNBack(scaled(D.nback, s), r),
  wcst: (s, r) => T.wcst.buildDeck(D.wcst.deckSize * s, r),
  mental_rotation: (s, r) => T.mental_rotation.generateMentalRotation(scaled(D.mentalRotation, s), r),
  trail_making: (s, r) => {
    const n = D.trailMaking.nTargets * s;
    return [...T.trail_making.generateTrail('A', n, r), ...T.trail_making.generateTrail('B', n, r)];
  },
  corsi: (s, r) => {
    const all = [];
    for (let k = 0; k < s; k++) for (let len = 2; len <= 9; len++) all.push(...T.corsi.generateBalancedSequences(len, 2, D.corsi, r));
    return all;
  },
};
const generate = (test, s) => GEN[test](s, mulberry32(SEED));

const SCORE = {
  stroop: (i) => T.stroop.scoreStroop(i.trials),
  gonogo: (i) => T.gonogo.scoreGoNoGo(i.trials),
  flanker: (i) => T.flanker.scoreFlanker(i.trials),
  sart: (i) => T.sart.scoreSart(i.trials),
  visual_search: (i) => T.visual_search.scoreVisualSearch(i.trials),
  pvt: (i) => T.pvt.scorePvt(i.trials),
  nback: (i) => T.nback.scoreNBack(i.trials, i.extra.nQuartiles),
  mental_rotation: (i) => T.mental_rotation.scoreMentalRotation(i.trials),
  trail_making: (i) => T.trail_making.scoreTrailMaking(i.trials, i.extra.nTargets),
  corsi: (i) => T.corsi.scoreCorsi(i.trials, i.extra.startLength),
  wcst: (i) => T.wcst.scoreWcst(i.trials, i.extra.metas, i.extra.wcst),
};

// Input di punteggio: 400 trial ottenuti ciclando la sessione simulata più realistica della fixture golden del test.
function buildInputs() {
  const tests = {};
  for (const test of Object.keys(SCORE)) {
    const fixture = JSON.parse(readFileSync(join(desktop, 'fixtures', `${test}.json`), 'utf8'));
    const pool = fixture.scoring.filter((e) => e.kind !== 'edge' && e.trials.length > 0 && (test !== 'wcst' || e.metas));
    const entry = pool.find((e) => /attentive/.test(e.id)) ?? pool.sort((a, b) => b.trials.length - a.trials.length)[0];
    const trials = Array.from({ length: 400 }, (_, i) => ({ ...entry.trials[i % entry.trials.length], trialIndex: i }));
    const extra = {
      startLength: entry.startLength ?? D.corsi.startLength,
      nQuartiles: entry.nQuartiles ?? 4,
      nTargets: entry.nTargets ?? D.trailMaking.nTargets,
      ...(test === 'wcst' ? { metas: Array.from({ length: 400 }, (_, i) => entry.metas[i % entry.metas.length]), wcst: D.wcst } : {}),
    };
    tests[test] = { trials, extra, source: entry.id };
  }
  const cubes = T.mental_rotation.generateShape(mulberry32(SEED));
  writeFileSync(join(here, 'inputs.json'), JSON.stringify({ tests, cubes }));
  return { tests, cubes };
}

{
  const { tests, cubes } = buildInputs();
  let sink = 0; // consuma i risultati perché V8 non elimini il lavoro
  const results = [];
  const run = (op, fn) => {
    const r = { op, ...measure(fn) };
    console.error(`${op}: mediana ${Math.round(r.medianNs)} ns`);
    results.push(r);
  };
  for (const test of Object.keys(SCORE)) {
    for (const [label, s] of [['default', 1], ['x10', 10]]) {
      run(`${test}.gen.${label}`, () => { sink += generate(test, s).length; });
      run(`${test}.gen.${label}.json`, () => { sink += JSON.stringify(generate(test, s)).length; });
    }
    const input = tests[test];
    const raw = JSON.stringify(input);
    run(`${test}.score.400`, () => { sink += SCORE[test](input).length; });
    run(`${test}.score.400.json`, () => { sink += JSON.stringify(SCORE[test](JSON.parse(raw))).length; });
  }
  run('mental_rotation.project_faces', () => { for (const a of ANGLES) sink += T.mental_rotation.projectFaces(cubes, a).length; });
  run('mental_rotation.is_chiral', () => { sink += T.mental_rotation.isChiral(cubes) ? 1 : 0; });
  const out = {
    runtime: 'typescript-node', node: process.version, sink,
    hardware: { cpu: cpus()[0].model, cores: cpus().length, ramGb: Math.round(totalmem() / 2 ** 30), os: `${platform()} ${release()}` },
    results,
  };
  writeFileSync(join(desktop, 'fixtures', 'evidence', 'bench-ts.json'), JSON.stringify(out, null, 2));
}
