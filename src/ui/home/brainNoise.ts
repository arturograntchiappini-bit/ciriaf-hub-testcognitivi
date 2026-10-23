/** Rumore di valore 3D a basso costo e deterministico: sorgente dei giri e dei solchi della corteccia. */

const WARP_SCALE = 1.6;
const WARP_STRENGTH = 0.9;
const GYRI_FREQUENCY = 5.4;
const SULCUS_HALF_WIDTH_INNER = 0.03;
const SULCUS_HALF_WIDTH_OUTER = 0.13;
const FOLIA_FREQUENCY = 82;

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function valueNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const u = fade(x - ix);
  const v = fade(y - iy);
  const w = fade(z - iz);
  const plane = (dz: number): number =>
    lerp(lerp(hash3(ix, iy, iz + dz), hash3(ix + 1, iy, iz + dz), u), lerp(hash3(ix, iy + 1, iz + dz), hash3(ix + 1, iy + 1, iz + dz), u), v);
  return lerp(plane(0), plane(1), w);
}

/** Somma di tre ottave, normalizzata in [0, 1]. */
export function fbm(x: number, y: number, z: number): number {
  return 0.6 * valueNoise(x, y, z) + 0.3 * valueNoise(x * 2, y * 2, z * 2) + 0.1 * valueNoise(x * 4, y * 4, z * 4);
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** 0 sui solchi (curve di livello del rumore deformato, come i solchi corticali), 1 sulle creste dei giri. */
export function gyralShade(x: number, y: number, z: number): number {
  const wx = fbm(x * WARP_SCALE + 11.3, y * WARP_SCALE, z * WARP_SCALE) - 0.5;
  const wy = fbm(x * WARP_SCALE, y * WARP_SCALE + 7.7, z * WARP_SCALE) - 0.5;
  const wz = fbm(x * WARP_SCALE, y * WARP_SCALE, z * WARP_SCALE + 3.9) - 0.5;
  const n = fbm((x + WARP_STRENGTH * wx) * GYRI_FREQUENCY, (y + WARP_STRENGTH * wy) * GYRI_FREQUENCY, (z + WARP_STRENGTH * wz) * GYRI_FREQUENCY);
  return smoothstep(SULCUS_HALF_WIDTH_INNER, SULCUS_HALF_WIDTH_OUTER, Math.abs(n - 0.5));
}

/** Solchi maggiori che separano i lobi: centrale (frontale/parietale) e parieto-occipitale. 1 lontano, 0 sul solco. */
export function majorSulcusShade(x: number, y: number, z: number): number {
  if (x < 0.25) return 1;
  const central = Math.abs(z - (0.12 - 0.3 * (y - 0.15))) * (y > -0.05 ? 1 : 99);
  const parietoOccipital = Math.abs(z - (-0.52 + 0.1 * y)) * (y > 0 ? 1 : 99);
  const line = smoothstep(0.012, 0.05, Math.min(central, parietoOccipital));
  return 0.12 + 0.88 * line;
}

/** Strie sottili orizzontali del cervelletto (le "foglie"), appena ondulate. */
export function foliaShade(x: number, y: number, z: number): number {
  const wave = y * FOLIA_FREQUENCY + 3 * valueNoise(x * 4, y * 2, z * 4);
  return 0.25 + 0.75 * smoothstep(-0.2, 0.7, Math.sin(wave));
}
