// Fixture golden del Trail Making: etichette e posizioni dei cerchi, TrailRun (clic) e metriche.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SEEDS, metricsJson, writeFixture } from './lib.mjs';

register('./hooks.mjs', import.meta.url);

const { mulberry32 } = await import('../../../src/engine/rng.ts');
const m = await import('../../../src/engine/tests/trailMaking.ts');
const { DEFAULTS } = await import('../../../src/config/defaults.ts');

const SIZES = [3, 8, 25, 51];
// 0 e 1: casi limite. 120 e 200 (solo parte A: la B oltre 53 cerchi dà etichette `undefined` nel TS, vedi DIVERGENZE.md):
// campo affollato, ripiego su griglia.
const EXTRA_SIZES = [0, 1];
const CROWDED_SIZES = [120, 200];

/** Trial del TrailRun reale (null se il clic è ignorato) + stato dopo ogni clic. */
function playRun(circles, part, phase, startMs, clicks) {
  const run = new m.TrailRun(circles, part, phase, 'GOLDEN-0001', startMs);
  const steps = clicks.map(([index, nowMs]) => {
    const trial = run.click(index, nowMs);
    return { index, nowMs, trial, target: run.target, done: run.done };
  });
  return { initialTarget: new m.TrailRun(circles, part, phase, 'x', 0).target, steps };
}

const sweep = (n, dt = 700, from = 0) => Array.from({ length: n }, (_, i) => [i, from + (i + 1) * dt]);

export function build() {
  const generation = [];
  for (const part of ['A', 'B']) {
    for (const n of [...SIZES, ...EXTRA_SIZES, ...(part === 'A' ? CROWDED_SIZES : [])]) {
      for (const seed of SEEDS) {
        generation.push({
          id: `${part}-n${n}@${seed}`,
          variant: `${part}-n${n}`,
          seed,
          params: { part, n },
          stimuli: m.generateTrail(part, n, mulberry32(seed)),
        });
      }
    }
  }
  const labels = ['A', 'B'].flatMap((part) => [0, 1, 2, 3, 6, 25, 26, 51].map((n) => ({ part, n, labels: m.trailLabels(part, n) })));

  const runs = [];
  const addRun = (id, part, n, seed, phase, startMs, clicks) => {
    const circles = m.generateTrail(part, n, mulberry32(seed));
    runs.push({ id, part, n, seed, phase, startMs, clicks, ...playRun(circles, part, phase, startMs, clicks) });
  };
  for (const part of ['A', 'B']) {
    addRun(`${part}-percorso-perfetto`, part, 8, 42, 'test', 5000, sweep(8, 650, 5000));
    // Clic errati prima di quelli corretti, un clic fuori campo, un clic dopo la fine.
    addRun(`${part}-errori-fuori-campo-e-dopo-la-fine`, part, 5, 2026, 'test', 100, [
      [3, 350], [0, 520.5], [4, 800], [99, 900], [1, 1111.25], [1, 1300], [2, 1500], [0, 1600], [3, 1750], [4, 2000], [2, 2100], [0, 2200],
    ]);
    addRun(`${part}-pratica`, part, 3, 1, 'practice', 0, [[0, 400], [2, 900], [1, 1300], [2, 1900]]);
  }
  addRun('A-solo-fuori-campo', 'A', 4, 7, 'test', 0, [[4, 100], [12, 200]]);
  addRun('A-lista-vuota', 'A', 0, 7, 'test', 0, [[0, 100]]);
  addRun('B-un-cerchio', 'B', 1, 7, 'test', 250, [[0, 600], [0, 700]]);

  // Trial per lo scoring: ricavati dal TrailRun (clic sintetici) con n piccolo.
  const trialsOf = (part, n, seed, phase, clicks, startMs = 0) =>
    playRun(m.generateTrail(part, n, mulberry32(seed)), part, phase, startMs, clicks).steps.flatMap((s) => (s.trial ? [s.trial] : []));
  const full = (part, n, dt, startMs = 0) => trialsOf(part, n, 3, 'test', sweep(n, dt, startMs), startMs);
  const withErrors = (part, n, wrong) => {
    const clicks = [];
    let t = 0;
    for (let i = 0; i < n; i++) {
      for (let w = 0; w < (wrong[i] ?? 0); w++) clicks.push([(i + 1) % n, (t += 333.3)]);
      clicks.push([i, (t += 812.7)]);
    }
    return trialsOf(part, n, 3, 'test', clicks);
  };
  const scoring = [];
  const add = (id, kind, nTargets, trials) => scoring.push({ id, kind, nTargets, trials, metrics: metricsJson(m.scoreTrailMaking(trials, nTargets)) });

  add('sessione-completa', 'normal', 8, [...full('A', 8, 700), ...full('B', 8, 1400)]);
  add('sessione-completa-con-errori', 'normal', 8, [...withErrors('A', 8, { 2: 1, 5: 2 }), ...withErrors('B', 8, { 0: 1, 7: 3 })]);
  add('sessione-default-25', 'normal', DEFAULTS.trailMaking.nTargets, [...full('A', 25, 640), ...full('B', 25, 1310)]);
  add('lista-vuota', 'edge', 8, []);
  add('lista-vuota-n-zero', 'edge', 0, []);
  add('solo-parte-a-completa', 'edge', 8, full('A', 8, 700));
  add('solo-parte-b-completa', 'edge', 8, full('B', 8, 1100));
  add('parte-b-incompleta', 'edge', 8, [...full('A', 8, 700), ...trialsOf('B', 8, 3, 'test', sweep(5, 900))]);
  add('parte-a-incompleta-b-completa', 'edge', 8, [...trialsOf('A', 8, 3, 'test', sweep(7, 500)), ...full('B', 8, 1000)]);
  add('solo-errori-nessuna-parte-completa', 'edge', 8, withErrors('A', 3, { 0: 2 }).slice(0, 2));
  add('pratica-esclusa', 'edge', 8, [
    ...trialsOf('A', 8, 3, 'practice', sweep(8, 100)), ...trialsOf('B', 8, 3, 'practice', sweep(8, 100)),
    ...full('A', 8, 700), ...full('B', 8, 1400),
  ]);
  add('solo-pratica', 'edge', 8, trialsOf('A', 8, 3, 'practice', sweep(8, 100)));
  add('rt-nulli-e-zero', 'edge', 3, [
    ...full('A', 3, 0),
    ...full('B', 3, 500).map((t, i) => (i === 1 ? { ...t, rtMs: null } : t)),
  ]);
  add('rapporto-con-tempo-a-nullo', 'edge', 3, [...full('A', 3, 0), ...full('B', 3, 500)]);
  add('arrotondamento-meta-centesimo', 'edge', 2, [
    { ...full('A', 2, 1)[0], rtMs: 1005 }, { ...full('A', 2, 1)[1], rtMs: 1000 },
    { ...full('B', 2, 1)[0], rtMs: 2005 }, { ...full('B', 2, 1)[1], rtMs: 2000 },
  ]);
  add('n-targets-zero-con-clic', 'edge', 0, full('A', 4, 300));
  add('condizioni-estranee-ignorate', 'edge', 3, [
    ...full('A', 3, 400).map((t) => ({ ...t, condition: 'C' })), ...full('B', 3, 800),
  ]);

  return { test: 'trail_making', engine: 'src/engine/tests/trailMaking.ts', defaults: DEFAULTS.trailMaking, labels, generation, runs, scoring };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) writeFixture('trail_making', build());
