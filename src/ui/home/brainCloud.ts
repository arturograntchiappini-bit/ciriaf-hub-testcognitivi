import { mulberry32 } from '../../engine/rng';
import { foliaShade, gyralShade, majorSulcusShade } from './brainNoise';

/** Regioni illustrative: 0 frontale, 1 parietale, 2 temporale, 3 occipitale, 4 cervelletto e tronco. */
export const REGION_COUNT = 5;
export type RegionId = 0 | 1 | 2 | 3 | 4;

export interface BrainCloud {
  count: number;
  nodeCount: number;
  positions: Float32Array;
  randoms: Float32Array;
  regions: Float32Array;
  /** 0 = solco (particella fioca), 1 = cresta del giro (particella piena). */
  shades: Float32Array;
  edges: Array<[number, number]>;
}

export interface CloudOptions {
  count: number;
  nodeCount: number;
  seed?: number;
}

export interface EdgeBuffers {
  vertexCount: number;
  positions: Float32Array;
  randoms: Float32Array;
  regions: Float32Array;
  shades: Float32Array;
  along: Float32Array;
  seeds: Float32Array;
}

type Vec3 = [number, number, number];
interface Sample {
  position: Vec3;
  region: RegionId;
  shade: number;
  /** Le particelle interne sono più piccole e fioche: danno volume senza coprire la superficie. */
  interior: boolean;
  /** Strutture profonde (corpo calloso, talamo): più grandi e luminose, visibili in trasparenza. */
  landmark?: boolean;
}
interface Ellipsoid {
  c: Vec3;
  r: Vec3;
}

/** Primitive anatomiche per l'emisfero destro (l'altro è lo specchio rispetto a x = 0). */
const HEMISPHERE: Ellipsoid = { c: [0.52, 0.06, 0], r: [0.47, 0.6, 1.2] };
const TEMPORAL: Ellipsoid = { c: [0.66, -0.34, 0.12], r: [0.34, 0.25, 0.62] };
const CEREBELLUM: Ellipsoid = { c: [0, -0.52, -0.74], r: [0.62, 0.24, 0.4] };
const STEM: Ellipsoid = { c: [0, -0.78, -0.24], r: [0.15, 0.42, 0.15] };

const SHARE_HEMISPHERE = 0.5;
const SHARE_TEMPORAL = 0.13;
const SHARE_CEREBELLUM = 0.1;
const SHARE_STEM = 0.03;
const SHARE_CALLOSUM = 0.022;
const SHARE_THALAMUS = 0.012;
const THALAMUS: Ellipsoid = { c: [0.13, -0.1, -0.06], r: [0.1, 0.09, 0.15] };
/** Sotto questa soglia di dx la particella sta sulla parete mediale (affacciata all'altro emisfero): più fioca. */
const MEDIAL_WALL = -0.55;
const MEDIAL_DIMMING = 0.4;
/** Esponenti da superellisse: sezioni più squadrate di un ellissoide, come i veri emisferi. */
const SQUARE_X = 0.72;
const SQUARE_Y = 0.82;
const FLAT_BASE_Y = -0.3;
const NEIGHBORS_PER_NODE = 3;
const MAX_EDGE_LENGTH = 0.2;
const MAX_SAMPLING_TRIES = 40;
const NODE_SIZE_FLOOR = 0.72;
const CREASE_MARGIN = 0.93;
const FOLD_DEPTH = 0.05;
/** Dimensione dei passi di costruzione: abbastanza piccoli da restare sotto i 50 ms anche su un telefono. */
const POINTS_PER_STEP = 400;
const NODES_PER_STEP = 70;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function insideEllipsoid(e: Ellipsoid, [x, y, z]: Vec3, margin: number): boolean {
  return ((Math.abs(x) - e.c[0]) / (e.r[0] * margin)) ** 2 + ((y - e.c[1]) / (e.r[1] * margin)) ** 2 + ((z - e.c[2]) / (e.r[2] * margin)) ** 2 < 1;
}

function unitDirection(rng: () => number): Vec3 {
  const z = 2 * rng() - 1;
  const angle = 2 * Math.PI * rng();
  const ring = Math.sqrt(1 - z * z);
  return [ring * Math.cos(angle), ring * Math.sin(angle), z];
}

function regionOfCortex(absX: number, y: number, z: number): RegionId {
  if (y < -0.1 && absX > 0.5 && z > -0.7 && z < 0.6) return 2;
  if (z > 0.35) return 0;
  if (z < -0.5) return 3;
  return 1;
}

/** Superficie dell'emisfero: lobo frontale più stretto, polo occipitale basso, base piatta. */
function hemisphereSurface(rawDx: number, rawDy: number, dz: number): Vec3 {
  const dx = Math.sign(rawDx) * Math.abs(rawDx) ** SQUARE_X;
  const dy = Math.sign(rawDy) * Math.abs(rawDy) ** SQUARE_Y;
  const taper = (1 - 0.18 * smoothstep(0.2, 1, dz)) * (1 - 0.12 * smoothstep(-0.2, -1, dz));
  const poleDrop = (1 - 0.22 * smoothstep(0.5, 1, dz)) * (1 - 0.28 * smoothstep(-0.4, -1, dz));
  let y = HEMISPHERE.c[1] + HEMISPHERE.r[1] * dy * poleDrop;
  if (y < FLAT_BASE_Y) y = FLAT_BASE_Y + (y - FLAT_BASE_Y) * 0.25;
  return [(HEMISPHERE.c[0] + HEMISPHERE.r[0] * dx) * taper, y, HEMISPHERE.r[2] * dz];
}

/** Spinge la superficie verso l'interno nei solchi: i giri emergono come rilievo continuo. */
function foldTowardCenter(position: Vec3, center: Vec3, shade: number): Vec3 {
  const k = 1 + FOLD_DEPTH * (shade - 1);
  return [center[0] + (position[0] - center[0]) * k, center[1] + (position[1] - center[1]) * k, center[2] + (position[2] - center[2]) * k];
}

function hemisphereSample(rng: () => number): Sample | null {
  const [dx, dy, dz] = unitDirection(rng);
  const raw = hemisphereSurface(dx, dy, dz);
  if (insideEllipsoid(TEMPORAL, raw, CREASE_MARGIN) || insideEllipsoid(CEREBELLUM, raw, CREASE_MARGIN) || insideEllipsoid(STEM, raw, CREASE_MARGIN)) return null;
  const shade = gyralShade(raw[0], raw[1], raw[2]) * majorSulcusShade(raw[0], raw[1], raw[2]) * (dx < MEDIAL_WALL ? MEDIAL_DIMMING : 1);
  const folded = foldTowardCenter(raw, HEMISPHERE.c, shade);
  return { position: folded, region: regionOfCortex(raw[0], raw[1], raw[2]), shade, interior: false };
}

function temporalSample(rng: () => number): Sample | null {
  const [dx, dy, dz] = unitDirection(rng);
  const lean = -0.14 * ((dz * TEMPORAL.r[2]) / TEMPORAL.r[2]);
  const raw: Vec3 = [TEMPORAL.c[0] + TEMPORAL.r[0] * dx, TEMPORAL.c[1] + TEMPORAL.r[1] * dy + lean, TEMPORAL.c[2] + TEMPORAL.r[2] * dz];
  if (insideEllipsoid(HEMISPHERE, raw, CREASE_MARGIN)) return null;
  const shade = gyralShade(raw[0], raw[1], raw[2]);
  return { position: foldTowardCenter(raw, TEMPORAL.c, shade), region: 2, shade, interior: false };
}

function cerebellumSample(rng: () => number): Sample | null {
  const [dx, dy, dz] = unitDirection(rng);
  const raw: Vec3 = [CEREBELLUM.c[0] + CEREBELLUM.r[0] * dx, CEREBELLUM.c[1] + CEREBELLUM.r[1] * dy, CEREBELLUM.c[2] + CEREBELLUM.r[2] * dz];
  if (insideEllipsoid(HEMISPHERE, raw, CREASE_MARGIN) || insideEllipsoid(TEMPORAL, raw, CREASE_MARGIN) || insideEllipsoid(STEM, raw, 0.9)) return null;
  return { position: raw, region: 4, shade: foliaShade(raw[0], raw[1], raw[2]), interior: false };
}

function stemSample(rng: () => number): Sample | null {
  const [dx, dy, dz] = unitDirection(rng);
  const lean = 0.14 * dy;
  const raw: Vec3 = [STEM.c[0] + STEM.r[0] * dx, STEM.c[1] + STEM.r[1] * dy, STEM.c[2] + STEM.r[2] * dz + lean];
  if (insideEllipsoid(HEMISPHERE, raw, CREASE_MARGIN) || insideEllipsoid(CEREBELLUM, raw, 0.9)) return null;
  return { position: raw, region: 4, shade: 0.55, interior: false };
}

/** Corpo calloso: l'arco di sostanza bianca che unisce gli emisferi lungo la linea mediana. */
function callosumSample(rng: () => number): Sample {
  const theta = Math.PI * rng();
  const position: Vec3 = [(rng() - 0.5) * 0.09, 0.05 + 0.2 * Math.sin(theta) - 0.1 * Math.max(0, Math.cos(theta)) ** 3, 0.03 + 0.62 * Math.cos(theta)];
  return { position, region: regionOfCortex(0.5, position[1], position[2]), shade: 1, interior: false, landmark: true };
}

/** Talamo: nucleo ovale profondo, uno per emisfero. */
function thalamusSample(rng: () => number): Sample {
  const [dx, dy, dz] = unitDirection(rng);
  const position: Vec3 = [THALAMUS.c[0] + THALAMUS.r[0] * dx, THALAMUS.c[1] + THALAMUS.r[1] * dy, THALAMUS.c[2] + THALAMUS.r[2] * dz];
  return { position, region: 1, shade: 0.9, interior: false, landmark: true };
}

/** Punto dentro l'emisfero (volume): dà profondità alla nuvola, come un tessuto traslucido. */
function interiorSample(rng: () => number): Sample | null {
  const [dx, dy, dz] = unitDirection(rng);
  const depth = Math.cbrt(rng()) * 0.9;
  const raw = hemisphereSurface(dx * depth, dy * depth, dz * depth);
  if (Math.abs(raw[0]) < 0.12) return null;
  return { position: raw, region: regionOfCortex(raw[0], raw[1], raw[2]), shade: 0.2, interior: true };
}

function drawSample(rng: () => number): Sample {
  const pick = rng();
  const cuts = [SHARE_HEMISPHERE, SHARE_TEMPORAL, SHARE_CEREBELLUM, SHARE_STEM, SHARE_CALLOSUM, SHARE_THALAMUS];
  const samplers = [hemisphereSample, temporalSample, cerebellumSample, stemSample, callosumSample, thalamusSample];
  let sampler: (rng: () => number) => Sample | null = interiorSample;
  let threshold = 0;
  for (let i = 0; i < cuts.length; i++) {
    threshold += cuts[i] as number;
    if (pick < threshold) {
      sampler = samplers[i] as typeof sampler;
      break;
    }
  }
  for (let tries = 0; tries < MAX_SAMPLING_TRIES; tries++) {
    const sample = sampler(rng);
    if (sample) return sample;
  }
  return { position: [0.9, 0.1, 0], region: 1, shade: 0.5, interior: false };
}

function squaredDistance(positions: Float32Array, a: number, b: number): number {
  const dx = (positions[a * 3] as number) - (positions[b * 3] as number);
  const dy = (positions[a * 3 + 1] as number) - (positions[b * 3 + 1] as number);
  const dz = (positions[a * 3 + 2] as number) - (positions[b * 3 + 2] as number);
  return dx * dx + dy * dy + dz * dz;
}

function nearestNodes(positions: Float32Array, nodeCount: number, from: number): number[] {
  const best: Array<{ index: number; d: number }> = [];
  for (let other = 0; other < nodeCount; other++) {
    if (other === from) continue;
    const d = squaredDistance(positions, from, other);
    if (d > MAX_EDGE_LENGTH * MAX_EDGE_LENGTH) continue;
    best.push({ index: other, d });
    best.sort((a, b) => a.d - b.d);
    if (best.length > NEIGHBORS_PER_NODE) best.pop();
  }
  return best.map((entry) => entry.index);
}

function* buildEdges(positions: Float32Array, nodeCount: number): Generator<void, Array<[number, number]>, undefined> {
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (let from = 0; from < nodeCount; from++) {
    for (const to of nearestNodes(positions, nodeCount, from)) {
      const key = from < to ? `${from}-${to}` : `${to}-${from}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([from, to]);
    }
    if ((from + 1) % NODES_PER_STEP === 0) yield;
  }
  return edges;
}

/** Costruzione a passi: chi la esegue cede il controllo tra un passo e l'altro, così non nasce nessun task lungo. */
export function* brainCloudSteps({ count, nodeCount, seed = 11 }: CloudOptions): Generator<void, BrainCloud, undefined> {
  const rng = mulberry32(seed);
  const nodes = Math.min(nodeCount, count);
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count * 4);
  const regions = new Float32Array(count);
  const shades = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const { position, region, shade, interior, landmark } = drawSample(rng);
    const side = rng() < 0.5 ? -1 : 1;
    positions.set([position[0] * side, position[1], position[2]], i * 3);
    regions[i] = region;
    shades[i] = shade;
    randoms.set([rng(), rng(), rng(), rng()], i * 4);
    const size = randoms[i * 4 + 2] as number;
    // I nodi della rete sono i punti più grandi; le particelle interne i più piccoli.
    if (landmark) randoms[i * 4 + 2] = 0.78 + 0.22 * size;
    else if (interior) randoms[i * 4 + 2] = size * 0.25;
    else if (i < nodes) randoms[i * 4 + 2] = NODE_SIZE_FLOOR + (1 - NODE_SIZE_FLOOR) * size;
    if ((i + 1) % POINTS_PER_STEP === 0) yield;
  }
  const edges = yield* buildEdges(positions, nodes);
  return { count, nodeCount: nodes, positions, randoms, regions, shades, edges };
}

/** Nuvola di particelle a forma di cervello: superficie continua (unione di primitive) con giri e solchi. Deterministica per seed. */
export function buildBrainCloud(options: CloudOptions): BrainCloud {
  const steps = brainCloudSteps(options);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

export async function buildBrainCloudAsync(options: CloudOptions, yieldToMain: () => Promise<void>): Promise<BrainCloud> {
  const steps = brainCloudSteps(options);
  let step = steps.next();
  while (!step.done) {
    await yieldToMain();
    step = steps.next();
  }
  return step.value;
}

/** Due vertici per arco, con attributi duplicati dai nodi: gli archi seguono le stesse trasformazioni dei punti. */
export function buildEdgeBuffers(cloud: BrainCloud, seed = 5): EdgeBuffers {
  const rng = mulberry32(seed);
  const vertexCount = cloud.edges.length * 2;
  const buffers: EdgeBuffers = {
    vertexCount,
    positions: new Float32Array(vertexCount * 3),
    randoms: new Float32Array(vertexCount * 4),
    regions: new Float32Array(vertexCount),
    shades: new Float32Array(vertexCount),
    along: new Float32Array(vertexCount),
    seeds: new Float32Array(vertexCount * 2),
  };
  cloud.edges.forEach((edge, edgeIndex) => {
    const phase = rng();
    const speed = rng();
    edge.forEach((node, end) => {
      const v = edgeIndex * 2 + end;
      buffers.positions.set(cloud.positions.subarray(node * 3, node * 3 + 3), v * 3);
      buffers.randoms.set(cloud.randoms.subarray(node * 4, node * 4 + 4), v * 4);
      buffers.regions[v] = cloud.regions[node] as number;
      buffers.shades[v] = cloud.shades[node] as number;
      buffers.along[v] = end;
      buffers.seeds.set([phase, speed], v * 2);
    });
  });
  return buffers;
}
