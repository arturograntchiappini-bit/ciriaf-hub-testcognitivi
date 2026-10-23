import { useEffect, useRef, useState } from 'react';
import {
  DEMO_MINUTES_PER_SECOND,
  DEMO_PHASES,
  DEMO_PINS,
  DEMO_TOTAL_MINUTES,
  demoFrameAt,
  formatClock,
  staticDemoFrame,
  type DemoFrame,
} from './demoTimeline';

const TICK_MS = 100;
const percent = (minute: number): number => (minute / DEMO_TOTAL_MINUTES) * 100;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Avanza la simulazione solo mentre è visibile; con movimento ridotto resta sul fotogramma esplicativo. */
function useDemoFrame(rootRef: React.RefObject<HTMLElement>): DemoFrame {
  const [frame, setFrame] = useState<DemoFrame>(() => (prefersReducedMotion() ? staticDemoFrame() : demoFrameAt(0)));

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    let elapsed = 0;
    let timer = 0;
    const run = (): void => {
      let last = performance.now();
      timer = window.setInterval(() => {
        const now = performance.now();
        elapsed += (now - last) / 1000;
        last = now;
        setFrame(demoFrameAt(elapsed));
      }, TICK_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry?.isIntersecting) run();
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [rootRef]);

  return frame;
}

function ParticipantScreen({ frame }: { frame: DemoFrame }): JSX.Element {
  const pin = DEMO_PINS[frame.pinIndex] ?? DEMO_PINS[0];
  const battery = (pin?.tests ?? []).join(' → ');
  if (frame.stage === 'due') {
    return (
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-glow">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-accent-glow" />
          Suona un avviso
        </p>
        <p className="mt-3 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold uppercase leading-none text-ink">È ora dei test</p>
        <p className="mt-3 text-sm text-muted">Batteria in arrivo: <span className="text-ink">{battery}</span></p>
        <span className="mt-5 inline-flex min-h-[40px] items-center border border-accent px-6 font-mono text-[12px] uppercase tracking-[0.18em] text-accent-glow">Inizia</span>
      </div>
    );
  }
  if (frame.stage === 'test') {
    return (
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-glow">Batteria in corso</p>
        <p className="mt-3 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold uppercase leading-none text-ink">{battery}</p>
        <div className="mx-auto mt-5 h-px w-40 overflow-hidden bg-line"><div className="demo-progress h-px w-full bg-accent-glow" /></div>
      </div>
    );
  }
  if (frame.stage === 'done') {
    return (
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-glow">Protocollo concluso</p>
        <p className="mt-3 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold uppercase leading-none text-ink">Dati pronti</p>
        <p className="mt-3 text-sm text-muted">JSON di sessione e CSV combinato</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {frame.pinIndex >= DEMO_PINS.length || frame.completedPins >= DEMO_PINS.length ? 'Fine sessione tra' : 'Prossima batteria tra'}
      </p>
      <p className="mt-2 font-display text-[clamp(3.6rem,9vw,6rem)] font-extrabold leading-none tabular-nums text-ink">{formatClock(frame.countdownSeconds)}</p>
      <p className="mt-2 text-sm text-muted">{frame.completedPins < DEMO_PINS.length ? <>In arrivo: <span className="text-ink">{battery}</span></> : 'Nessuna altra batteria'}</p>
    </div>
  );
}

/** Simulazione animata e accelerata: linea temporale dello sperimentatore e schermo del partecipante. */
export function SessionDemo(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useDemoFrame(rootRef);

  return (
    <div ref={rootRef} className="chamfer bg-sheet-ink p-5 text-ink sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>Simulazione · {DEMO_MINUTES_PER_SECOND} minuti al secondo</span>
        <span>Sessione di esempio · {DEMO_TOTAL_MINUTES} min</span>
      </div>

      <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-glow">Cosa imposta lo sperimentatore</p>
      <div aria-hidden className="relative mt-4 pb-9 pt-9">
        <div className="relative h-12">
          {DEMO_PHASES.map((phase) => {
            const active = frame.phaseName === phase.name;
            return (
              <div
                key={phase.name}
                className={`absolute top-0 flex h-full flex-col justify-center overflow-hidden border-l px-3 transition-colors duration-300 ${active ? 'border-accent bg-accent/20' : 'border-line bg-elevated/60'}`}
                style={{ left: `${percent(phase.from)}%`, width: `${percent(phase.to - phase.from)}%` }}
              >
                <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-ink">{phase.name}</span>
                <span className="truncate font-mono text-[10px] text-muted">{phase.from}–{phase.to} min</span>
              </div>
            );
          })}
          <div className="absolute -top-2 bottom-0 w-px bg-accent-glow" style={{ left: `${percent(frame.minute)}%`, transition: `left ${TICK_MS}ms linear` }} />
        </div>
        {DEMO_PINS.map((pin, index) => {
          const reached = index < frame.completedPins || (index === frame.pinIndex && frame.stage !== 'wait');
          return (
            <div key={pin.label} className="absolute top-0 -translate-x-1/2" style={{ left: `${percent(pin.minute)}%` }}>
              <div className="flex flex-col items-center">
                <span className={`font-mono text-[12px] ${reached ? 'text-accent-glow' : 'text-ink'}`}>{pin.label}</span>
                <span className={`mt-1 h-2.5 w-2.5 rotate-45 border border-accent-glow ${reached ? 'bg-accent-glow' : 'bg-transparent'}`} />
              </div>
              <span className="absolute left-1/2 top-[88px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-muted">min {pin.minute}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-glow">Cosa vede il partecipante</p>
      <div aria-hidden className="mt-4 border border-line bg-paper/60 px-5 py-8">
        <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <span>Fase: <span className="text-ink">{frame.phaseName}</span></span>
          <span className="tabular-nums">{formatClock(frame.minute * 60)} / {formatClock(DEMO_TOTAL_MINUTES * 60)}</span>
        </div>
        <ParticipantScreen frame={frame} />
      </div>
    </div>
  );
}
