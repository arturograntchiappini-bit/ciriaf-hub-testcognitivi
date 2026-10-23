import { useEffect, useRef, useState } from 'react';
import type { BrainScene, SceneAnchor, SceneAnchors } from './brainScene';
import { pickTier } from './tier';

interface BrainStageProps {
  /** Regioni da accendere (indici di RegionId); vuoto = nessuna. */
  regions: readonly number[];
}

type RenderMode = 'pending' | 'webgl' | 'fallback';

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [role="button"]';
/** Scroll (in altezze di viewport) entro cui il cervello raggiunge il suo riquadro. */
const SCROLL_RANGE = 0.9;
/** Distanza dal bordo alto (in altezze di viewport) a cui il pannello chiaro inizia/finisce di coprire la scena. */
const COVER_FADE_START = 0.65;
const COVER_FADE_END = 0.15;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout: 600 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(task, 120);
  return () => window.clearTimeout(handle);
}

/** Scena 3D sopra il contenuto (additiva: sul pannello chiaro non si vede). Il modulo WebGL si carica a first paint finito. */
export function BrainStage({ regions }: BrainStageProps): JSX.Element {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const [mode, setMode] = useState<RenderMode>('pending');

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    if (!canvas || !layer) return;
    let disposed = false;
    let cleanup = (): void => {};

    const mount = async (): Promise<void> => {
      try {
        const { createBrainScene } = await import('./brainScene');
        if (disposed) return;
        const scene = await createBrainScene(canvas, {
          tier: pickTier(window.innerWidth, navigator.hardwareConcurrency),
          reducedMotion: prefersReducedMotion(),
          onContextLost: () => setMode('fallback'),
        });
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        cleanup = wireInput(scene, layer);
        setMode('webgl');
      } catch {
        setMode('fallback');
      }
    };
    const cancelIdle = whenIdle(() => void mount());

    return () => {
      disposed = true;
      cancelIdle();
      cleanup();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setRegions(regions);
  }, [regions, mode]);

  return (
    <>
      <div aria-hidden className="brain-glow pointer-events-none fixed inset-0 z-0" data-fallback={mode === 'fallback'} />
      <div ref={layerRef} aria-hidden className="pointer-events-none fixed inset-0 z-30" data-render={mode}>
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </>
  );
}

function toNdc(event: PointerEvent): { x: number; y: number } {
  return { x: (event.clientX / window.innerWidth) * 2 - 1, y: 1 - (event.clientY / window.innerHeight) * 2 };
}

function rectOf(element: Element): SceneAnchor | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, width: rect.width, height: rect.height };
}

/** Prima ancora visibile di quel tipo (sull'indice ce n'è una per desktop e una per mobile). */
function readAnchor(kind: 'hero' | 'index'): SceneAnchor | null {
  for (const element of document.querySelectorAll(`[data-brain-anchor="${kind}"]`)) {
    const anchor = rectOf(element);
    if (anchor) return anchor;
  }
  return null;
}

function readAnchors(): SceneAnchors {
  return { hero: readAnchor('hero'), index: readAnchor('index') };
}

/** 1 = scena piena, 0 = coperta dal pannello chiaro (che sale dal basso). */
function visibilityBehindCover(): number {
  const cover = document.querySelector('[data-brain-cover]');
  if (!cover) return 1;
  const distance = cover.getBoundingClientRect().top / window.innerHeight;
  return Math.min(1, Math.max(0, (distance - COVER_FADE_END) / (COVER_FADE_START - COVER_FADE_END)));
}

/** Collega puntatore, clic e scroll alla scena; ritorna la funzione di pulizia. */
function wireInput(scene: BrainScene, layer: HTMLElement): () => void {
  const sync = (): void => {
    const visibility = visibilityBehindCover();
    layer.style.opacity = String(visibility);
    scene.setScroll(window.scrollY / (window.innerHeight * SCROLL_RANGE));
    scene.setAnchors(readAnchors());
    scene.setActive(!document.hidden && visibility > 0);
  };
  const resize = (): void => {
    scene.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    sync();
  };
  const onPointerMove = (event: PointerEvent): void => {
    const { x, y } = toNdc(event);
    scene.setPointer(x, y);
  };
  const onPointerLeave = (): void => scene.setPointer(null, 0);
  const onPointerDown = (event: PointerEvent): void => {
    if ((event.target as Element | null)?.closest(INTERACTIVE_SELECTOR)) return;
    const { x, y } = toNdc(event);
    scene.shock(x, y);
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('scroll', sync, { passive: true });
  document.documentElement.addEventListener('mouseleave', onPointerLeave);
  document.addEventListener('visibilitychange', sync);
  return () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('scroll', sync);
    document.documentElement.removeEventListener('mouseleave', onPointerLeave);
    document.removeEventListener('visibilitychange', sync);
  };
}
