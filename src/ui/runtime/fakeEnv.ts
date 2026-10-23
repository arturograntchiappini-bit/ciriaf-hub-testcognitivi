import type { Clock, Scheduler, Cancel } from '../../engine/clock';

/** Ambiente di simulazione: paint sincrono, timer avanzati a mano. */
export class FakeEnv {
  time = 0;
  private timers: { at: number; cb: () => void; cancelled: boolean }[] = [];
  clock: Clock = { now: () => this.time };
  scheduler: Scheduler = {
    afterPaint: (cb: (t: number) => void): Cancel => {
      cb(this.time); // il paint avviene subito nel modello di test
      return () => {};
    },
    timeout: (ms: number, cb: () => void): Cancel => {
      const entry = { at: this.time + ms, cb, cancelled: false };
      this.timers.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
  };

  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      const due = this.timers
        .filter((t) => !t.cancelled && t.at <= target)
        .sort((a, b) => a.at - b.at);
      if (due.length === 0) break;
      const next = due[0]!;
      this.time = next.at;
      next.cancelled = true;
      this.timers = this.timers.filter((t) => t !== next);
      next.cb();
    }
    this.time = target;
  }
}
