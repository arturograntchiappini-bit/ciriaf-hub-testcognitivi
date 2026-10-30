// Fixture golden della rotazione mentale: figure, chiralità, sequenze, facce proiettate, regressione e metriche.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SEEDS, metricsJson, trial, writeFixture } from './lib.mjs';

register('./hooks.mjs', import.meta.url);

const BASE = { nTrials: 84, fixationMs: 500, responseWindowMs: 8000, isiMinMs: 700, isiMaxMs: 1100, practiceTrials: 6 };
const VARIANTS = [
  { variant: 'default', params: BASE },
  { variant: 'quattordici', params: { ...BASE, nTrials: 14 } },
  { variant: 'venti-con-extra', params: { ...BASE, nTrials: 20 } },
  { variant: 'tre-extra-soli', params: { ...BASE, nTrials: 3 } },
  { variant: 'zero-trial', params: { ...BASE, nTrials: 0 } },
  { variant: 'isi-fisso', params: { ...BASE, nTrials: 28, isiMinMs: 500, isiMaxMs: 500 } },
  { variant: 'centosei', params: { ...BASE, nTrials: 106, isiMinMs: 100, isiMaxMs: 2000 } },
];
const SHAPE_SEEDS = [1, 42, 2026, 123456789, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const ANGLES = [-180, -150, -90, -60, -30, 0, 30, 45.5, 90, 120, 150, 180];
const HAND_SHAPES = {
  linea: [[0, 0, 0], [1, 0, 0], [2, 0, 0]],
  due_cubi: [[0, 0, 0], [1, 0, 0]],
  elle_piana: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0]],
  vite_chirale: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
  croce_simmetrica: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  fallback: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1], [2, 2, 2], [1, 2, 2], [0, 2, 2], [0, 2, 3]],
  traslata: [[5, -3, 2], [6, -3, 2], [6, -2, 2], [6, -2, 3]],
};

const T = (i, same, angle, o = {}) => {
  const rt = o.rtMs === undefined ? 600 + Math.abs(angle) * 4 + i : o.rtMs;
  return trial('mentalRotation', i, `${same ? 'same' : 'different'}-${Math.abs(angle)}`, {
    response: rt === null ? null : same ? 'same' : 'different', correct: true, rtMs: rt, ...o,
  });
};

export async function build() {
  const { mulberry32 } = await import('../../../src/engine/rng.ts');
  const m = await import('../../../src/engine/tests/mentalRotation.ts');
  const { leastSquares } = await import('../../../src/engine/regression.ts');

  const shapes = SHAPE_SEEDS.map((seed) => {
    const rand = mulberry32(seed);
    const cubes = m.generateShape(rand);
    return { seed, cubes, chiral: m.isChiral(cubes), nextRand: rand() };
  });

  const handShapes = Object.entries(HAND_SHAPES).map(([id, cubes]) => ({ id, cubes, chiral: m.isChiral(cubes), mirror: m.mirror(cubes) }));

  const generation = VARIANTS.flatMap(({ variant, params }) => SEEDS.map((seed) => {
    const rand = mulberry32(seed);
    const stimuli = m.generateMentalRotation(params, rand);
    return { id: `${variant}@${seed}`, variant, seed, params, stimuli, nextRand: rand() };
  }));

  const projectionShapes = [...shapes.slice(0, 3).map((s) => [`seed${s.seed}`, s.cubes]), ['fallback', HAND_SHAPES.fallback], ['traslata', HAND_SHAPES.traslata], ['linea', HAND_SHAPES.linea]];
  const projections = projectionShapes.flatMap(([id, cubes]) => ANGLES.map((angle) => ({ id: `${id}@${angle}`, cubes, angle, faces: m.projectFaces(cubes, angle) })));

  const regression = [
    [], [[1, 2]], [[2, 1], [2, 5]], [[0, 1], [1, 3], [2, 5]], [[0, 0], [1, 1], [2, 1], [3, 3]], [[30, 700], [60, 760], [90, 900], [120, 880], [150, 1100]], [[0, 5], [1, 5], [2, 5]], [[0, 1000], [30, 800], [60, 600]],
  ].map((points) => ({ points, fit: leastSquares(points) }));

  const rand = mulberry32(5);
  const randomSession = (n, { slope, noise }) => Array.from({ length: n }, (_, i) => {
    const same = rand() < 0.5;
    const angle = m.ROTATION_ANGLES[Math.floor(rand() * 7)];
    const flag = rand() < 0.05 ? 'OMISSION' : rand() < 0.05 ? 'ANTICIPATION' : 'VALID';
    const rt = flag === 'OMISSION' ? null : flag === 'ANTICIPATION' ? 90 : 800 + slope * angle + noise * (rand() - 0.5);
    return T(i, same, rand() < 0.5 ? -angle : angle, { rtMs: rt, flag, correct: flag === 'VALID' && rand() < 0.92 });
  });
  const cases = {
    empty: [],
    only_practice: [T(0, true, 0, { phase: 'practice' })],
    single_angle_no_fit: [T(0, true, 60), T(1, true, 60), T(2, false, 90)],
    two_angles_exact_line: [T(0, true, 0, { rtMs: 700 }), T(1, true, 90, { rtMs: 880 })],
    perfect_line: [0, 30, 60, 90, 120, 150, 180].map((a, i) => T(i, true, a, { rtMs: 800 + 5 * a })),
    negative_slope_velocity_dash: [T(0, true, 0, { rtMs: 1200 }), T(1, true, 90, { rtMs: 900 }), T(2, true, 180, { rtMs: 700 })],
    flat_slope_zero: [T(0, true, 0, { rtMs: 900 }), T(1, true, 90, { rtMs: 900 })],
    only_different_pairs: [T(0, false, 30), T(1, false, 60), T(2, false, 90)],
    omissions_count_as_errors: [T(0, true, 0, { rtMs: null, flag: 'OMISSION', correct: false }), T(1, true, 30), T(2, false, 60, { rtMs: null, flag: 'OMISSION', correct: false })],
    anticipations: [T(0, true, 0, { rtMs: 100, flag: 'ANTICIPATION', correct: false }), T(1, true, 30), T(2, true, 60)],
    interrupted_excluded_from_accuracy: [T(0, true, 0, { flag: 'INTERRUPTED', correct: false, rtMs: null }), T(1, true, 30), T(2, false, 60)],
    errors_excluded_from_rt: [T(0, true, 0, { correct: false }), T(1, true, 0), T(2, true, 90), T(3, true, 90, { correct: false })],
    malformed_condition_ignored: [trial('mentalRotation', 0, 'foo', { correct: true, rtMs: 500 }), trial('mentalRotation', 1, 'same-abc', { correct: true, rtMs: 500 }), T(2, true, 30)],
    condition_parsing_edge: ['same-', 'same-1e2', 'different- 60 ', 'same--30', 'same', 'same-1e999', 'same-.5', 'same-+30', 'same-0x1A', 'same-0b11', 'same-0o7']
      .map((condition, i) => trial('mentalRotation', i, condition, { correct: true, rtMs: 500 + 10 * i, response: 'x' })),
    repeated_angle_averages: [T(0, true, 30, { rtMs: 700 }), T(1, true, 30, { rtMs: 750 }), T(2, true, 120, { rtMs: 900 }), T(3, true, 120, { rtMs: 1000 })],
    random_steep: randomSession(84, { slope: 6, noise: 200 }),
    random_flat: randomSession(84, { slope: 0, noise: 300 }),
    random_shallow_long: randomSession(300, { slope: 2.5, noise: 150 }),
  };
  const scoring = Object.entries(cases).map(([id, trials]) => ({
    id, kind: /random|perfect/.test(id) ? 'normal' : 'edge', trials, metrics: metricsJson(m.scoreMentalRotation(trials)), slope: m.rotationSlope(trials),
  }));

  const labels = [[true, 0], [false, 30], [true, -120], [false, -180]].map(([same, angle]) => ({ same, angle, label: m.conditionLabel(same, angle) }));

  return { test: 'mental_rotation', shapes, handShapes, generation, projections, regression, scoring, labels };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) writeFixture('mental_rotation', await build());
