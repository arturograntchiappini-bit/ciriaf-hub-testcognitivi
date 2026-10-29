// Benchmark WASM dei motori Rust in Node, stesse operazioni/input/metodo di bench.mjs e del bench nativo.
// Uso: node tools/bench/run-wasm.mjs O3=<file.wasm> Os=<file.wasm> Oz=<file.wasm>   (vedi tools/bench/run-bench.ps1 per la build)
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure } from './measure.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const inputs = JSON.parse(readFileSync(join(here, 'inputs.json'), 'utf8'));
const TESTS = ['stroop', 'gonogo', 'flanker', 'sart', 'visual_search', 'pvt', 'corsi', 'nback', 'wcst', 'mental_rotation', 'trail_making'];
const enc = new TextEncoder(), dec = new TextDecoder();
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const ms = () => Number(process.hrtime.bigint()) / 1e6;

async function timeLifecycle(bytes) {
  const compile = [], instantiate = [];
  for (let i = 0; i < 30; i++) {
    let t = ms();
    const module = await WebAssembly.compile(bytes);
    compile.push(ms() - t);
    t = ms();
    await WebAssembly.instantiate(module, {});
    instantiate.push(ms() - t);
  }
  return { compileMsMedian: median(compile), instantiateMsMedian: median(instantiate) };
}

async function benchVariant(label, path) {
  const bytes = readFileSync(path);
  const lifecycle = await timeLifecycle(bytes);
  const { exports: w } = await WebAssembly.instantiate(await WebAssembly.compile(bytes), {});
  const mem = () => new Uint8Array(w.memory.buffer);
  const put = (text) => { const b = enc.encode(text); const p = w.in_ptr(b.length); mem().set(b, p); return b.length; };
  const out = () => dec.decode(mem().subarray(w.out_ptr(), w.out_ptr() + w.out_len()));
  const results = [];
  let sink = 0;
  const run = (op, fn) => {
    const r = { op, ...measure(fn) };
    console.error(`[${label}] ${op}: mediana ${Math.round(r.medianNs)} ns`);
    results.push(r);
  };
  TESTS.forEach((test, id) => {
    for (const [name, scale] of [['default', 1], ['x10', 10]]) {
      run(`${test}.gen.${name}`, () => { sink += w.generate(id, scale); });
      run(`${test}.gen.${name}.json`, () => { sink += w.generate_json(id, scale); });
      run(`${test}.gen.${name}.json+parse`, () => { w.generate_json(id, scale); sink += JSON.parse(out()).length; });
    }
    const input = inputs.tests[test];
    const raw = JSON.stringify(input);
    put(raw);
    if (!w.load_input()) throw new Error(`${test}: input non decodificato`);
    run(`${test}.score.400`, () => { sink += w.score_loaded(id); });
    run(`${test}.score.400.json`, () => { sink += w.score_json(id); });
    run(`${test}.score.400.json+js`, () => { put(JSON.stringify(input)); w.score_json(id); sink += JSON.parse(out()).length; });
  });
  put(JSON.stringify(inputs.cubes));
  w.load_cubes();
  run('mental_rotation.project_faces', () => { sink += w.project_all(); });
  run('mental_rotation.is_chiral', () => { sink += w.chiral(); });
  const gz = gzipSync(bytes, { level: 9 }).length;
  return { label, sizeBytes: bytes.length, gzipBytes: gz, ...lifecycle, sink, results };
}

const variants = [];
for (const arg of process.argv.slice(2)) {
  const [label, path] = arg.split('=');
  variants.push(await benchVariant(label, path));
}
writeFileSync(join(here, '..', '..', 'fixtures', 'evidence', 'bench-wasm.json'), JSON.stringify({ runtime: 'wasm32-unknown-unknown', node: process.version, variants }, null, 2));
