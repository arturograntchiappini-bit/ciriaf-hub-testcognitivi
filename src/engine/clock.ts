/**
 * Cronometro e scheduler astratti. L'astrazione consente di iniettare fake timer
 * nei test e mantiene il timing fuori dal ciclo di re-render di React.
 * @see docs/architettura.md — sezione "Timing"
 */

export interface Clock {
  /** Millisecondi ad alta risoluzione dall'avvio del documento. */
  now(): number;
}

export const performanceClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};

/** Cancella un timer schedulato. */
export type Cancel = () => void;

export interface Scheduler {
  /** Esegue `cb` dopo il prossimo paint (rAF), passando il timestamp del frame. */
  afterPaint(cb: (t: number) => void): Cancel;
  /** Esegue `cb` dopo `ms` millisecondi; ritorna una funzione per annullarlo. */
  timeout(ms: number, cb: () => void): Cancel;
}

/** Scheduler reale basato su requestAnimationFrame + setTimeout. */
export function realScheduler(): Scheduler {
  return {
    afterPaint(cb) {
      if (typeof requestAnimationFrame === 'undefined') {
        const id = setTimeout(() => cb(performanceClock.now()), 0);
        return () => clearTimeout(id);
      }
      const id = requestAnimationFrame((t) => cb(t));
      return () => cancelAnimationFrame(id);
    },
    timeout(ms, cb) {
      const id = setTimeout(cb, ms);
      return () => clearTimeout(id);
    },
  };
}
