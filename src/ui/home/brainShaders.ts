/** GLSL condiviso: stesso movimento per punti e archi, così le connessioni restano agganciate ai nodi. */
const TRANSFORM = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aRnd;
attribute float aRegion;
attribute float aShade;
uniform float uTime, uAssemble, uYaw, uPitch, uAspect, uScale, uCamZ;
uniform vec2 uCenter, uMouse;
uniform vec4 uShock, uOnA;
uniform float uOnB;

vec3 gNormal;
const vec3 LIGHT = vec3(-0.35, 0.75, 0.55);

float easeOut(float t) { return 1.0 - pow(1.0 - t, 4.0); }

vec3 transformPoint(out float glow, out float on, out float persp) {
  float progress = clamp(uAssemble * 1.7 - aRnd.x * 0.7, 0.0, 1.0);
  vec3 scatter = aPos + normalize(aRnd.xyz - 0.5 + 1e-3) * (2.2 + aRnd.w * 3.0);
  vec3 p = mix(scatter, aPos, easeOut(progress));
  p += normalize(aPos + 1e-3) * 0.012 * sin(uTime * 1.1 + aRnd.y * 6.2831);

  float cy = cos(uYaw), sy = sin(uYaw);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float cp = cos(uPitch), sp = sin(uPitch);
  p = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);

  gNormal = normalize(p * vec3(1.05, 1.5, 0.8) + vec3(0.0, 0.05, 0.0));

  vec2 d = p.xy - uMouse;
  float dm = length(d);
  float near = exp(-dm * dm * 7.0);
  p.xy += (d / (dm + 1e-3)) * near * 0.1;

  float ring = 0.0;
  if (uShock.z >= 0.0) {
    vec2 ds = p.xy - uShock.xy;
    float dsl = length(ds);
    float band = (dsl - uShock.z * 1.9) * 5.5;
    ring = exp(-band * band) * exp(-uShock.z * 1.3) * uShock.w;
    p.xy += (ds / (dsl + 1e-3)) * ring * 0.14;
  }
  glow = clamp(near + ring, 0.0, 1.5);

  int region = int(aRegion + 0.5);
  on = region == 0 ? uOnA.x : region == 1 ? uOnA.y : region == 2 ? uOnA.z : region == 3 ? uOnA.w : uOnB;
  persp = uCamZ / (uCamZ - p.z);
  return p;
}

/** Luce dall'alto-sinistra più bordo luminoso in silhouette: dà volume e definisce il contorno. */
/** Con una regione attiva le altre si abbassano: l'attenzione va dove si sta guardando. */
float focusDim(float on) {
  float anyOn = max(max(uOnA.x, uOnA.y), max(max(uOnA.z, uOnA.w), uOnB));
  return mix(1.0, mix(0.4, 1.0, on), anyOn);
}

/** Più luminoso quando il cervello è piccolo (mobile, riquadro dell'indice): meno pixel da riempire. */
float smallBrainBoost() {
  return mix(1.55, 1.0, smoothstep(0.2, 0.46, uScale));
}

float lighting() {
  float lambert = dot(gNormal, normalize(LIGHT)) * 0.5 + 0.5;
  float rim = pow(1.0 - abs(gNormal.z), 2.2);
  return mix(0.4, 1.25, lambert) * (1.0 + 0.9 * rim);
}

vec4 clipPosition(vec3 p, float persp) {
  return vec4(vec2(p.x / uAspect, p.y) * persp * uScale + uCenter, 0.0, 1.0);
}
`;

export const POINT_VERTEX = /* glsl */ `
${TRANSFORM}
uniform float uDpr, uPx;
varying float vHeat, vAlpha;

float sizeScale() { return clamp(uScale * 2.4, 0.5, 1.15); }

void main() {
  float glow, on, persp;
  vec3 p = transformPoint(glow, on, persp);
  gl_Position = clipPosition(p, persp);
  float depth = clamp(0.5 + p.z * 0.45, 0.0, 1.0);
  float twinkle = 0.75 + 0.25 * sin(uTime * 2.0 + aRnd.y * 40.0);
  vHeat = clamp(glow * 0.9 + on * 0.8, 0.0, 1.0);
  vAlpha = (0.42 + 0.75 * depth) * twinkle * (0.55 + on * 1.5 + glow * 0.9) * clamp(uAssemble * 3.0, 0.0, 1.0) * mix(0.16, 1.0, aShade) * lighting() * focusDim(on) * smallBrainBoost();
  gl_PointSize = (1.25 + aRnd.z * aRnd.z * 2.8 + aShade * 0.9 + on * 1.8 + glow * 2.6) * persp * uDpr * uPx * sizeScale();
}
`;

export const POINT_FRAGMENT = /* glsl */ `
precision mediump float;
uniform vec3 uBase, uHot;
varying float vHeat, vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float a = (exp(-d * 5.0) + (1.0 - d) * (1.0 - d) * 0.35) * vAlpha;
  gl_FragColor = vec4(mix(uBase, uHot, vHeat) * a, a);
}
`;

export const LINE_VERTEX = /* glsl */ `
${TRANSFORM}
attribute float aAlong;
attribute vec2 aSeed;
varying float vAlong, vPulseAt, vEdge, vHeat;

void main() {
  float glow, on, persp;
  vec3 p = transformPoint(glow, on, persp);
  gl_Position = clipPosition(p, persp);
  float depth = clamp(0.5 + p.z * 0.45, 0.0, 1.0);
  float live = step(0.35, fract(aSeed.x * 13.7));
  vAlong = aAlong;
  vPulseAt = (fract(uTime * (0.07 + 0.16 * aSeed.y) + aSeed.x) * 1.8 - 0.4) * live - (1.0 - live) * 4.0;
  vHeat = clamp(glow + on, 0.0, 1.0);
  vEdge = (0.02 + 0.045 * depth + on * 0.4 + glow * 0.45) * smoothstep(0.45, 1.0, uAssemble) * mix(0.35, 1.0, aShade) * lighting() * clamp(uScale * 2.4, 0.5, 1.15) * focusDim(on);
}
`;

export const LINE_FRAGMENT = /* glsl */ `
precision mediump float;
uniform vec3 uBase, uHot;
varying float vAlong, vPulseAt, vEdge, vHeat;

void main() {
  float off = (vAlong - vPulseAt) * 3.0;
  float pulse = exp(-off * off);
  float a = vEdge + pulse * (0.45 + vHeat) * 1.3;
  gl_FragColor = vec4(mix(uBase, uHot, clamp(pulse + vHeat, 0.0, 1.0)) * a, a);
}
`;
