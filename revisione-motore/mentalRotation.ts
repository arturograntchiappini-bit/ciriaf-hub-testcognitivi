/**
 * ============================================================================
 *  COPIA STANDALONE — Mental Rotation (rotazione mentale)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/mentalRotation.ts
 *  Riferimenti scientifici:       docs/scientific/mental-rotation.md — Shepard & Metzler (1971)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/mentalRotation.ts
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation,sdt}) ===== */
/* Generate da scripts/sync-revisione-motore.mjs: non modificarle a mano. */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

type Phase = 'practice' | 'test';

type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst' | 'pvt' | 'flanker' | 'sart' | 'visualSearch' | 'mentalRotation' | 'trailMaking';

interface TrialResult {
  testId: TestId;
  sessionId: string;
  trialIndex: number;
  phase: Phase;
  /** Etichetta della condizione sperimentale (es. 'congruent', 'go', 'target'). */
  condition: string;
  /** Rappresentazione serializzabile dello stimolo mostrato. */
  stimulus: string;
  /** Tasto/azione registrata, oppure null se nessuna risposta (omissione). */
  response: string | null;
  correct: boolean;
  /** Tempo di reazione in ms; null se omissione. */
  rtMs: number | null;
  flag: ValidationFlag;
  /** performance.now() al paint dello stimolo (riferimento del cronometro). */
  onsetTimestamp: number;
}

interface SummaryMetric {
  /** Etichetta leggibile in italiano. */
  label: string;
  value: string | number;
  /** Unità di misura opzionale (es. 'ms', '%'). */
  unit?: string;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function countFlag(trials: readonly TrialResult[], flag: ValidationFlag): number {
  return trials.filter((t) => t.phase === 'test' && t.flag === flag).length;
}

function leastSquares(points: readonly (readonly [number, number])[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const mx = mean(points.map(([x]) => x));
  const my = mean(points.map(([, y]) => y));
  const sxx = points.reduce((sum, [x]) => sum + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = points.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0) / sxx;
  return { slope, intercept: my - slope * mx };
}

/* ============================ CORE DEL TEST ============================ */

export interface MentalRotationParams {
  /** Trial totali; un multiplo di 14 bilancia angolo × (uguali / diverse). */
  nTrials: number;
  fixationMs: number;
  /** Tempo massimo per rispondere (ms): oltre = omissione. */
  responseWindowMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  practiceTrials: number;
}

export type Cube = readonly [number, number, number];

export interface MentalRotationStimulus {
  /** Figura di sinistra (orientamento di riferimento). */
  left: Cube[];
  /** Figura di destra, prima della rotazione: uguale a `left` oppure la sua immagine speculare. */
  right: Cube[];
  same: boolean;
  /** Rotazione in profondità (attorno all'asse verticale) della figura di destra, in gradi con segno. */
  angle: number;
  isiMs: number;
}

/** Angoli di rotazione (gradi) in valore assoluto. */
export const ROTATION_ANGLES: readonly number[] = [0, 30, 60, 90, 120, 150, 180];

const CUBES_PER_FIGURE = 10;
const ARM_LENGTHS = [2, 2, 2, 3]; // 4 bracci, 9 passi, 10 cubetti
const MAX_SHAPE_ATTEMPTS = 500;
const FALLBACK_SHAPE: Cube[] = [
  [0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1], [2, 2, 2], [1, 2, 2], [0, 2, 2], [0, 2, 3],
];

// ---------- geometria dei solidi ----------

const key = (c: Cube): string => c.join(',');

/** Immagine speculare rispetto al piano x = 0. */
export function mirror(cubes: readonly Cube[]): Cube[] {
  return cubes.map(([x, y, z]) => [-x, y, z] as const);
}

function normalizedKey(cubes: readonly Cube[]): string {
  const min = [0, 1, 2].map((i) => Math.min(...cubes.map((c) => c[i] as number)));
  return cubes
    .map((c) => key([c[0] - (min[0] as number), c[1] - (min[1] as number), c[2] - (min[2] as number)]))
    .sort()
    .join('|');
}

const PERMUTATIONS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
];

function permutationSign(p: readonly number[]): number {
  let inversions = 0;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if ((p[i] as number) > (p[j] as number)) inversions++;
  return inversions % 2 === 0 ? 1 : -1;
}

/** Le 24 rotazioni proprie del cubo, come funzioni sulle coordinate intere. */
function cubeRotations(): ((c: Cube) => Cube)[] {
  const rotations: ((c: Cube) => Cube)[] = [];
  for (const perm of PERMUTATIONS) {
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      if (permutationSign(perm) * sx * sy * sz !== 1) continue;
      rotations.push((c) => [sx * (c[perm[0]] as number), sy * (c[perm[1]] as number), sz * (c[perm[2]] as number)] as const);
    }
  }
  return rotations;
}

const ROTATIONS = cubeRotations();

/** Una figura è chirale se la sua immagine speculare NON coincide con alcuna sua rotazione. */
export function isChiral(cubes: readonly Cube[]): boolean {
  const mirrored = normalizedKey(mirror(cubes));
  return !ROTATIONS.some((rotate) => normalizedKey(cubes.map(rotate)) === mirrored);
}

function chain(rand: () => number): Cube[] | null {
  const lengths = shuffle(ARM_LENGTHS, rand);
  const cubes: Cube[] = [[0, 0, 0]];
  let axis = -1;
  const axesUsed = new Set<number>();
  for (const length of lengths) {
    const options = [0, 1, 2].filter((a) => a !== axis);
    axis = options[Math.floor(rand() * options.length)] as number;
    axesUsed.add(axis);
    const sign = rand() < 0.5 ? -1 : 1;
    for (let step = 0; step < length; step++) {
      const last = cubes[cubes.length - 1] as Cube;
      const next = [...last] as [number, number, number];
      next[axis] = (next[axis] as number) + sign;
      cubes.push(next);
    }
  }
  const distinct = new Set(cubes.map(key)).size === CUBES_PER_FIGURE;
  return distinct && axesUsed.size === 3 ? cubes : null;
}

/** Figura a blocchi: catena di 10 cubetti con 3 curve ad angolo retto su tre assi, non sovrapponibile alla sua speculare. */
export function generateShape(rand: () => number): Cube[] {
  for (let attempt = 0; attempt < MAX_SHAPE_ATTEMPTS; attempt++) {
    const shape = chain(rand);
    if (shape && isChiral(shape)) return shape;
  }
  return FALLBACK_SHAPE.map((c) => [...c] as unknown as Cube);
}

/**
 * Genera la sequenza: ogni coppia angolo × (uguali / diverse) compare lo stesso numero di volte
 * (le eventuali prove in più sono estratte a caso); a ogni trial una figura nuova e un verso di
 * rotazione casuale.
 */
export function generateMentalRotation(params: MentalRotationParams, rand: () => number): MentalRotationStimulus[] {
  const cells = ROTATION_ANGLES.flatMap((angle) => [true, false].map((same) => ({ angle, same })));
  const base = Math.floor(params.nTrials / cells.length);
  const extra = shuffle(cells, rand).slice(0, params.nTrials - base * cells.length);
  const plan = shuffle([...cells.flatMap((cell) => Array<typeof cell>(base).fill(cell)), ...extra], rand);
  const span = params.isiMaxMs - params.isiMinMs;
  return plan.map(({ angle, same }) => {
    const left = generateShape(rand);
    return {
      left,
      right: same ? left : mirror(left),
      same,
      angle: rand() < 0.5 ? -angle : angle,
      isiMs: params.isiMinMs + Math.floor(rand() * (span + 1)),
    };
  });
}

// ---------- proiezione per il disegno ----------

export interface Face {
  /** Quattro vertici in coordinate di schermo (unità = lato del cubetto, y verso il basso). */
  points: [number, number][];
  /** Luminosità in [0, 1] per l'ombreggiatura. */
  shade: number;
}

const FACE_DIRECTIONS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const VIEW_YAW_DEG = 25;
const VIEW_TILT_DEG = 22;
const LIGHT: readonly [number, number, number] = [0.35, 0.8, 0.5];
const rad = (deg: number): number => (deg * Math.PI) / 180;

type Vec = [number, number, number];

function rotateY(v: Vec, deg: number): Vec {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

function rotateX(v: Vec, deg: number): Vec {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

/** Vertici (angoli) di una faccia del cubetto centrato in `c`, per la direzione `d`. */
function faceCorners(c: Cube, d: readonly [number, number, number]): Vec[] {
  const axis = d.findIndex((v) => v !== 0);
  const [u, w] = [0, 1, 2].filter((a) => a !== axis) as [number, number];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
    const p: Vec = [c[0], c[1], c[2]];
    p[axis] = (p[axis] as number) + (d[axis] as number) * 0.5;
    p[u] = (p[u] as number) + (a as number) * 0.5;
    p[w] = (p[w] as number) + (b as number) * 0.5;
    return p;
  });
}

/**
 * Facce visibili di una figura ruotata di `angle` gradi attorno all'asse verticale e vista in
 * proiezione ortogonale con una lieve inclinazione, ordinate dal fondo al primo piano (algoritmo del pittore).
 * Le facce a contatto con un altro cubetto non si disegnano.
 */
export function projectFaces(cubes: readonly Cube[], angle: number): Face[] {
  const occupied = new Set(cubes.map(key));
  const center = cubes.reduce<Vec>((s, c) => [s[0] + c[0] / cubes.length, s[1] + c[1] / cubes.length, s[2] + c[2] / cubes.length], [0, 0, 0]);
  const view = (v: Vec): Vec => rotateX(rotateY(rotateY(v, angle), VIEW_YAW_DEG), VIEW_TILT_DEG);
  const faces: { face: Face; depth: number }[] = [];
  for (const cube of cubes) {
    for (const d of FACE_DIRECTIONS) {
      if (occupied.has(key([cube[0] + d[0], cube[1] + d[1], cube[2] + d[2]]))) continue;
      const normal = view([d[0], d[1], d[2]]);
      if (normal[2] <= 0) continue; // faccia rivolta dalla parte opposta all'osservatore
      const corners = faceCorners([cube[0] - center[0], cube[1] - center[1], cube[2] - center[2]], d).map(view);
      const depth = corners.reduce((s, p) => s + p[2], 0) / 4;
      const light = Math.max(0, normal[0] * LIGHT[0] + -normal[1] * LIGHT[1] + normal[2] * LIGHT[2]);
      faces.push({ face: { points: corners.map((p) => [p[0], -p[1]] as [number, number]), shade: 0.35 + 0.65 * Math.min(1, light) }, depth });
    }
  }
  return faces.sort((a, b) => a.depth - b.depth).map((f) => f.face);
}

// ---------- scoring ----------

/** Etichetta della condizione, letta dallo scoring: `uguali|diverse-angolo` (angolo in valore assoluto). */
export function conditionLabel(same: boolean, angle: number): string {
  return `${same ? 'same' : 'different'}-${Math.abs(angle)}`;
}

function parseCondition(condition: string): { same: boolean; angle: number } | null {
  const [kind, angle] = condition.split('-');
  // Number() accetta anche '0x1A', '0b11', '0o7': non sono angoli.
  if (angle === undefined || /^\s*[+-]?0[xob]/i.test(angle)) return null;
  return (kind === 'same' || kind === 'different') && Number.isFinite(Number(angle)) ? { same: kind === 'same', angle: Number(angle) } : null;
}

const usable = (t: TrialResult): boolean => t.phase === 'test' && t.flag === 'VALID' && t.correct && t.rtMs !== null;

/** Pendenza (ms per grado) e intercetta dell'RT medio delle coppie UGUALI corrette, per angolo. */
export function rotationSlope(trials: readonly TrialResult[]): { slope: number; intercept: number } | null {
  const byAngle = new Map<number, number[]>();
  for (const t of trials.filter(usable)) {
    const c = parseCondition(t.condition);
    if (!c?.same) continue;
    byAngle.set(c.angle, [...(byAngle.get(c.angle) ?? []), t.rtMs as number]);
  }
  return leastSquares([...byAngle].map(([angle, rts]) => [angle, mean(rts)] as const));
}

function accuracyPercent(trials: readonly TrialResult[]): number {
  const valid = trials.filter((t) => t.flag !== 'INTERRUPTED');
  return valid.length > 0 ? (valid.filter((t) => t.correct).length / valid.length) * 100 : 0;
}

/**
 * Metriche: accuratezza e RT per coppie uguali e diverse, pendenza dell'RT sull'angolo (ms/grado),
 * intercetta e velocità di rotazione (gradi/s) sulle coppie uguali corrette. Le omissioni contano come errori.
 */
export function scoreMentalRotation(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const ofKind = (same: boolean): TrialResult[] => test.filter((t) => parseCondition(t.condition)?.same === same);
  const rtMean = (group: readonly TrialResult[]): number => mean(group.filter(usable).map((t) => t.rtMs as number));
  const fit = rotationSlope(test);
  const slopeOk = fit !== null && fit.slope > 0;
  return [
    { label: 'Accuratezza complessiva', value: round1(accuracyPercent(test)), unit: '%' },
    { label: 'Accuratezza coppie uguali', value: round1(accuracyPercent(ofKind(true))), unit: '%' },
    { label: 'Accuratezza coppie diverse', value: round1(accuracyPercent(ofKind(false))), unit: '%' },
    { label: 'RT medio coppie uguali', value: round1(rtMean(ofKind(true))), unit: 'ms' },
    { label: 'RT medio coppie diverse', value: round1(rtMean(ofKind(false))), unit: 'ms' },
    { label: 'Pendenza RT × angolo (coppie uguali)', value: fit ? round2(fit.slope) : '—', unit: fit ? 'ms/°' : undefined },
    { label: 'Intercetta RT (coppie uguali)', value: fit ? round1(fit.intercept) : '—', unit: fit ? 'ms' : undefined },
    { label: 'Velocità di rotazione mentale', value: slopeOk ? round1(1000 / fit.slope) : '—', unit: slopeOk ? '°/s' : undefined },
    { label: 'Errori di omissione', value: countFlag(test, 'OMISSION') },
    { label: 'Errori di anticipazione', value: countFlag(test, 'ANTICIPATION') },
  ];
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ================================ DEMO ================================ */
(function demo(): void {
  const params: MentalRotationParams = { nTrials: 14, fixationMs: 500, responseWindowMs: 8000, isiMinMs: 700, isiMaxMs: 1100, practiceTrials: 0 };
  const seq = generateMentalRotation(params, mulberry32(3));
  console.log('Mental Rotation demo — ' + seq.length + ' trial');
  for (const s of seq) console.log('  ' + (s.same ? 'uguali ' : 'diverse') + ' angolo ' + String(s.angle).padStart(4) + '°, chirale: ' + isChiral(s.left));
})();
