import { useEffect, useRef } from 'react';

interface Node2D {
  x: number; y: number;
  vx: number; vy: number;
  phase: number;
  neighbors: number[];
}

/** Canvas-based neural-net interactive background. Zero dependencies. */
export function InteractiveHero(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let nodes: Node2D[] = [];
    let mouse = { x: -1000, y: -1000 };
    let rafId = 0;

    const $cvs: HTMLCanvasElement = canvas;
    const $ctx: CanvasRenderingContext2D = ctx;

    function resize() {
      const parent = $cvs.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = Math.min(w * 0.35, 380);
      const dpr = window.devicePixelRatio || 1;
      $cvs.width = w * dpr;
      $cvs.height = h * dpr;
      $cvs.style.width = `${w}px`;
      $cvs.style.height = `${h}px`;
      $ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes(w, h);
    }

    function initNodes(w: number, h: number) {
      const count = Math.min(Math.floor((w * h) / 8000), 55);
      nodes = [];
      for (let i = 0; i < count; i++) {
        const n: Node2D = {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          phase: Math.random() * Math.PI * 2,
          neighbors: [],
        };
        nodes.push(n);
      }
      // Compute neighbor links (distance-based)
      const maxDist = Math.min(w, h) * 0.22;
      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i];
        if (!ni) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j];
          if (!nj) continue;
          const dx = ni.x - nj.x;
          const dy = ni.y - nj.y;
          if (dx * dx + dy * dy < maxDist * maxDist) {
            ni.neighbors.push(j);
            nj.neighbors.push(i);
          }
        }
      }
    }

    function draw(t: number) {
      const w = $cvs.width / (window.devicePixelRatio || 1);
      const h = $cvs.height / (window.devicePixelRatio || 1);
      $ctx.clearRect(0, 0, w, h);

      // Move nodes slowly
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));
      }

      // Draw edges
      const edgeColor = 'rgba(74,144,217,0.15)';
      const edgeMouseColor = 'rgba(74,144,217,0.35)';
      for (const n of nodes) {
        for (const ni of n.neighbors) {
          const other = nodes[ni];
          if (!other) continue;
          const dx = n.x - other.x;
          const dy = n.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.min(w, h) * 0.22;
          const alpha = Math.max(0, 1 - dist / maxDist);
          // Check mouse proximity
          const mx = (n.x + other.x) / 2;
          const my = (n.y + other.y) / 2;
          const mouseDist = Math.sqrt((mx - mouse.x) ** 2 + (my - mouse.y) ** 2);
          const glow = Math.max(0, 1 - mouseDist / 120);
          $ctx.beginPath();
          $ctx.moveTo(n.x, n.y);
          $ctx.lineTo(other.x, other.y);
          $ctx.strokeStyle = glow > 0.3 ? edgeMouseColor : edgeColor;
          $ctx.globalAlpha = alpha * (0.4 + glow * 0.6);
          $ctx.lineWidth = glow > 0.3 ? 1.5 : 0.8;
          $ctx.stroke();
          $ctx.globalAlpha = 1;
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.001 + n.phase);
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const mouseDist = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - mouseDist / 100);
        const r = proximity > 0.3 ? 3.5 : 2 + pulse * 1.2;
        const alpha = 0.3 + pulse * 0.35 + proximity * 0.4;
        $ctx.beginPath();
        $ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        $ctx.fillStyle = `rgba(74,144,217,${Math.min(1, alpha)})`;
        $ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    function onMouse(e: MouseEvent) {
      const rect = $cvs.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onLeave() { mouse.x = -1000; mouse.y = -1000; }

    resize();
    rafId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    $cvs.addEventListener('mousemove', onMouse);
    $cvs.addEventListener('mouseleave', onLeave);

    // Pause when tab hidden
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(draw);
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      $cvs.removeEventListener('mousemove', onMouse);
      $cvs.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height: 'clamp(200px, 35vw, 380px)' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Visualizzazione interattiva di una rete neurale — nodi e connessioni che reagiscono al movimento del mouse"
        className="absolute inset-0"
      />
      {/* Overlay text */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
        <div className="mx-auto w-full max-w-content">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Batteria di test cognitivi
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Ricerca sperimentale — CIRIAF, laboratorio COLAB/NEXTROOM
          </p>
        </div>
      </div>
    </div>
  );
}