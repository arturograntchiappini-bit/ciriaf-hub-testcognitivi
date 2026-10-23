import { buildBrainCloudAsync, buildEdgeBuffers, REGION_COUNT } from './brainCloud';
import { LINE_FRAGMENT, LINE_VERTEX, POINT_FRAGMENT, POINT_VERTEX } from './brainShaders';
import type { Tier } from './tier';

/** Riquadro (in pixel CSS, relativo al viewport) in cui il cervello deve stare mentre si scorre l'indice. */
export interface SceneAnchor {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface SceneAnchors {
  hero: SceneAnchor | null;
  index: SceneAnchor | null;
}

export interface BrainScene {
  /** Puntatore in coordinate normalizzate dello schermo (-1..1, y verso l'alto); null = fuori dalla pagina. */
  setPointer(x: number | null, y: number): void;
  shock(x: number, y: number): void;
  setRegions(regions: readonly number[]): void;
  /** 0 = inizio pagina (riquadro hero), 1 = il cervello ha raggiunto il riquadro dell'indice. */
  setScroll(progress: number): void;
  setAnchors(anchors: SceneAnchors): void;
  resize(width: number, height: number, dpr: number): void;
  setActive(active: boolean): void;
  dispose(): void;
}

export interface SceneOptions {
  tier: Tier;
  reducedMotion: boolean;
  onContextLost: () => void;
}

const CAMERA_Z = 4;
const ASSEMBLE_SECONDS = 2.8;
const BASE_COLOR = [0.2, 0.5, 0.95];
const HOT_COLOR = [0.78, 0.93, 1];
const REGION_EASE = 6;
const SHOCK_SECONDS = 3;
const REFERENCE_HEIGHT = 900;
const MAX_SCALE = 0.46;
const FILL_FACTOR = 0.78;
const HERO_CENTER_LANDSCAPE: [number, number] = [0.38, 0.04];
const HERO_CENTER_PORTRAIT: [number, number] = [0, 0.3];
/** Estensione del cervello in unità di scena (lunghezza e altezza, margine di prospettiva incluso). */
const BRAIN_SPAN_X = 2.9;
const BRAIN_SPAN_Y = 1.9;
const OFF_SCREEN = 99;
/** Profilo laterale con il lobo frontale rivolto a sinistra (verso il testo). */
const SIDE_VIEW_YAW = -1.05;
/** Mai di fronte: da davanti i due emisferi sembrano blocchi separati; da profilo o a tre quarti il cervello è unitario. */
const YAW_MIN = -1.6;
const YAW_MAX = -0.62;

interface Program {
  handle: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('shader non creato');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

function link(gl: WebGLRenderingContext, vertex: string, fragment: string): Program {
  const handle = gl.createProgram();
  if (!handle) throw new Error('programma non creato');
  gl.attachShader(handle, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(handle, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(handle);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle) ?? 'link');
  return { handle, uniforms: new Map() };
}

type AttributeSpec = [name: string, data: Float32Array, size: number];

const MAX_ATTRIBUTES = 8;

/** Carica i buffer una volta sola e restituisce la funzione che li ricollega prima di ogni draw. */
function createAttributes(gl: WebGLRenderingContext, program: Program, specs: AttributeSpec[]): () => void {
  const attributes = specs
    .map(([name, data, size]) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { location: gl.getAttribLocation(program.handle, name), buffer, size };
    })
    .filter((attribute) => attribute.location >= 0);
  return () => {
    for (let i = 0; i < MAX_ATTRIBUTES; i++) gl.disableVertexAttribArray(i);
    for (const { location, buffer, size } of attributes) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    }
  };
}

interface Layout {
  scale: number;
  centerX: number;
  centerY: number;
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

function anchorLayout(anchor: SceneAnchor, width: number, height: number): Layout {
  const pixelsPerUnit = Math.min(anchor.width / BRAIN_SPAN_X, anchor.height / BRAIN_SPAN_Y);
  return { scale: pixelsPerUnit / (height / 2), centerX: (anchor.cx / width) * 2 - 1, centerY: 1 - (anchor.cy / height) * 2 };
}

function defaultHeroLayout(width: number, height: number): Layout {
  const aspect = width / height;
  const [centerX, centerY] = aspect < 0.85 ? HERO_CENTER_PORTRAIT : HERO_CENTER_LANDSCAPE;
  return { scale: Math.min(MAX_SCALE, FILL_FACTOR * aspect), centerX, centerY };
}

/** Dal riquadro dell'hero (che scorre con la pagina) a quello dell'indice; interpolate dallo scroll. */
function computeLayout(width: number, height: number, scroll: number, anchors: SceneAnchors): Layout {
  const hero = anchors.hero ? anchorLayout(anchors.hero, width, height) : defaultHeroLayout(width, height);
  if (!anchors.index) return hero;
  const index = anchorLayout(anchors.index, width, height);
  return { scale: mix(hero.scale, index.scale, scroll), centerX: mix(hero.centerX, index.centerX, scroll), centerY: mix(hero.centerY, index.centerY, scroll) };
}

/** Cervello di particelle in WebGL puro: punti, archi con impulsi, cursore come sorgente di luce. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield ? scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0));
}

export async function createBrainScene(canvas: HTMLCanvasElement, options: SceneOptions): Promise<BrainScene> {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) throw new Error('WebGL non disponibile');
  const { tier, reducedMotion } = options;

  const cloud = await buildBrainCloudAsync({ count: tier.count, nodeCount: tier.nodeCount }, yieldToMain);
  const edges = buildEdgeBuffers(cloud);
  const pointProgram = link(gl, POINT_VERTEX, POINT_FRAGMENT);
  const lineProgram = link(gl, LINE_VERTEX, LINE_FRAGMENT);
  const bindPoints = createAttributes(gl, pointProgram, [
    ['aPos', cloud.positions, 3],
    ['aRnd', cloud.randoms, 4],
    ['aRegion', cloud.regions, 1],
    ['aShade', cloud.shades, 1],
  ]);
  const bindLines = createAttributes(gl, lineProgram, [
    ['aPos', edges.positions, 3],
    ['aRnd', edges.randoms, 4],
    ['aRegion', edges.regions, 1],
    ['aShade', edges.shades, 1],
    ['aAlong', edges.along, 1],
    ['aSeed', edges.seeds, 2],
  ]);

  const state = {
    width: 1,
    height: 1,
    dpr: 1,
    time: 0,
    assemble: reducedMotion ? 1 : 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0, present: false },
    scroll: 0,
    anchors: { hero: null, index: null } as SceneAnchors,
    shockAge: -1,
    shockOrigin: { x: 0, y: 0 },
    regionsOn: new Float32Array(REGION_COUNT),
    regionsTarget: new Float32Array(REGION_COUNT),
    active: true,
    rafId: 0,
    last: 0,
  };

  const setUniform = (name: string, ...values: number[]): void => {
    for (const program of [pointProgram, lineProgram]) {
      if (!program.uniforms.has(name)) program.uniforms.set(name, gl.getUniformLocation(program.handle, name));
      const location = program.uniforms.get(name);
      if (!location) continue;
      gl.useProgram(program.handle);
      if (values.length === 1) gl.uniform1f(location, values[0] as number);
      else if (values.length === 2) gl.uniform2f(location, values[0] as number, values[1] as number);
      else if (values.length === 3) gl.uniform3f(location, values[0] as number, values[1] as number, values[2] as number);
      else gl.uniform4f(location, values[0] as number, values[1] as number, values[2] as number, values[3] as number);
    }
  };

  const clear = (): void => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const draw = (): void => {
    const { scale, centerX, centerY } = computeLayout(state.width, state.height, state.scroll, state.anchors);
    const aspect = state.width / state.height;
    const t = state.time;
    const wobble = reducedMotion ? 0 : Math.sin(t * 0.13) * 0.4;
    const yaw = Math.min(YAW_MAX, Math.max(YAW_MIN, SIDE_VIEW_YAW + wobble + state.pointer.x * 0.3));
    const mouseX = state.pointer.present ? ((state.pointer.x - centerX) * aspect) / scale : OFF_SCREEN;
    const mouseY = state.pointer.present ? (state.pointer.y - centerY) / scale : OFF_SCREEN;
    clear();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    setUniform('uTime', t);
    setUniform('uAssemble', state.assemble);
    setUniform('uYaw', yaw);
    setUniform('uPitch', -0.1 - state.pointer.y * 0.22);
    setUniform('uAspect', aspect);
    setUniform('uScale', scale);
    setUniform('uCamZ', CAMERA_Z);
    setUniform('uCenter', centerX, centerY);
    setUniform('uMouse', mouseX, mouseY);
    setUniform('uShock', state.shockOrigin.x, state.shockOrigin.y, state.shockAge, 1);
    setUniform('uOnA', ...(Array.from(state.regionsOn.subarray(0, 4)) as [number, number, number, number]));
    setUniform('uOnB', state.regionsOn[4] as number);
    setUniform('uBase', BASE_COLOR[0] as number, BASE_COLOR[1] as number, BASE_COLOR[2] as number);
    setUniform('uHot', HOT_COLOR[0] as number, HOT_COLOR[1] as number, HOT_COLOR[2] as number);
    setUniform('uDpr', state.dpr);
    setUniform('uPx', Math.max(0.6, state.height / REFERENCE_HEIGHT));
    gl.useProgram(lineProgram.handle);
    bindLines();
    gl.drawArrays(gl.LINES, 0, edges.vertexCount);
    gl.useProgram(pointProgram.handle);
    bindPoints();
    gl.drawArrays(gl.POINTS, 0, cloud.count);
  };

  const step = (dt: number): void => {
    state.time += dt;
    if (!reducedMotion) state.assemble = Math.min(1, state.assemble + dt / ASSEMBLE_SECONDS);
    const ease = Math.min(1, dt * 5);
    state.pointer.x += (state.pointer.tx - state.pointer.x) * ease;
    state.pointer.y += (state.pointer.ty - state.pointer.y) * ease;
    if (state.shockAge >= 0) state.shockAge = state.shockAge > SHOCK_SECONDS ? -1 : state.shockAge + dt;
    for (let i = 0; i < REGION_COUNT; i++) {
      const current = state.regionsOn[i] as number;
      state.regionsOn[i] = current + ((state.regionsTarget[i] as number) - current) * Math.min(1, dt * REGION_EASE);
    }
  };

  const frame = (now: number): void => {
    state.rafId = requestAnimationFrame(frame);
    const elapsed = now - state.last;
    if (elapsed < tier.frameMs) return;
    state.last = now;
    step(Math.min(elapsed, 100) / 1000);
    draw();
  };

  const start = (): void => {
    cancelAnimationFrame(state.rafId);
    state.last = performance.now();
    if (reducedMotion) draw();
    else state.rafId = requestAnimationFrame(frame);
  };
  const redrawIfStatic = (): void => {
    if (reducedMotion && state.active) draw();
  };

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(state.rafId);
    options.onContextLost();
  });
  start();

  return {
    setPointer(x, y) {
      state.pointer.present = x !== null;
      state.pointer.tx = x ?? 0;
      state.pointer.ty = x === null ? 0 : y;
    },
    shock(x, y) {
      state.shockOrigin = { x, y };
      state.shockAge = 0;
      redrawIfStatic();
    },
    setRegions(regions) {
      state.regionsTarget.fill(0);
      regions.forEach((id) => {
        state.regionsTarget[id] = 1;
      });
      if (reducedMotion) {
        state.regionsOn.set(state.regionsTarget);
        redrawIfStatic();
      }
    },
    setScroll(progress) {
      state.scroll = Math.min(1, Math.max(0, progress));
      redrawIfStatic();
    },
    setAnchors(anchors) {
      state.anchors = anchors;
      redrawIfStatic();
    },
    resize(width, height, dpr) {
      state.width = Math.max(1, width);
      state.height = Math.max(1, height);
      state.dpr = Math.min(dpr, tier.maxDpr);
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      redrawIfStatic();
    },
    setActive(active) {
      if (active === state.active) return;
      state.active = active;
      if (active) start();
      else {
        cancelAnimationFrame(state.rafId);
        clear();
      }
    },
    dispose() {
      cancelAnimationFrame(state.rafId);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
