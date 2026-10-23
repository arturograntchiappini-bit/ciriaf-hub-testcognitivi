import { describe, it, expect } from 'vitest';
import { createSequencer, type SequencerConfig, type TrialSpec } from './sequencer';
import type { Clock, Scheduler, Cancel } from '../../engine/clock';
import type { TrialResult } from '../../engine/types';

/** Ambiente di simulazione: paint sincrono, timer avanzati a mano. */
class FakeEnv {
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

function baseConfig(env: FakeEnv, overrides: Partial<SequencerConfig>): SequencerConfig {
  const results: TrialResult[] = [];
  return {
    testId: 'stroop1',
    sessionId: 'TEST-0000',
    phase: 'test',
    trials: [{ condition: 'x', stimulusLabel: 'X' }],
    fixationMs: 500,
    stimulusVisibleMs: 3000,
    responseWindowMs: 3000,
    isiMs: 500,
    endOnResponse: true,
    feedbackMs: 0,
    responseKeys: ['r'],
    expectsResponse: () => true,
    evaluate: (_t, k) => k === 'r',
    clock: env.clock,
    scheduler: env.scheduler,
    onState: () => {},
    onTrialResult: (r) => results.push(r),
    onDone: () => {},
    // esposto ai test tramite closure
    ...overrides,
  };
}

describe('createSequencer — flag di validazione', () => {
  it('risposta valida a 200 ms → VALID e corretta', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const seq = createSequencer(baseConfig(env, { onTrialResult: (r) => results.push(r) }));
    seq.start();
    env.advance(500); // fine fissazione → stimolo, onset=500
    env.advance(200); // 200 ms dopo l'onset
    seq.handleKey('r', env.clock.now());
    expect(results).toHaveLength(1);
    expect(results[0]!.flag).toBe('VALID');
    expect(results[0]!.correct).toBe(true);
    expect(results[0]!.rtMs).toBe(200);
  });

  it('un tasto premuto durante la fissazione è ignorato: non produce un trial con RT sull’onset precedente', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const seq = createSequencer(
      baseConfig(env, {
        trials: [
          { condition: 'x', stimulusLabel: 'X' },
          { condition: 'x', stimulusLabel: 'Y' },
        ],
        onTrialResult: (r) => results.push(r),
      }),
    );
    seq.start();
    env.advance(500); // 1° stimolo, onset = 500
    env.advance(300);
    seq.handleKey('r', env.clock.now()); // 1° trial chiuso a RT 300
    env.advance(500); // ISI → 2° trial: fissazione
    env.advance(200);
    seq.handleKey('r', env.clock.now()); // durante la fissazione del 2° trial
    expect(results).toHaveLength(1);
    env.advance(300); // fine fissazione → 2° stimolo
    env.advance(250);
    seq.handleKey('r', env.clock.now());
    expect(results).toHaveLength(2);
    expect(results[1]!.rtMs).toBe(250);
  });

  it('nessuna risposta entro la finestra → OMISSION', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const seq = createSequencer(baseConfig(env, { onTrialResult: (r) => results.push(r) }));
    seq.start();
    env.advance(500); // stimolo
    env.advance(3000); // scade la finestra
    expect(results[0]!.flag).toBe('OMISSION');
    expect(results[0]!.correct).toBe(false);
    expect(results[0]!.rtMs).toBeNull();
  });

  it('risposta a 100 ms → ANTICIPATION', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const seq = createSequencer(baseConfig(env, { onTrialResult: (r) => results.push(r) }));
    seq.start();
    env.advance(500);
    env.advance(100);
    seq.handleKey('r', env.clock.now());
    expect(results[0]!.flag).toBe('ANTICIPATION');
  });

  it('interruzione (perdita focus) → INTERRUPTED', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const seq = createSequencer(baseConfig(env, { onTrialResult: (r) => results.push(r) }));
    seq.start();
    env.advance(500);
    env.advance(300);
    seq.handleInterrupt();
    expect(results[0]!.flag).toBe('INTERRUPTED');
  });

  it('withhold (No-Go) senza risposta → VALID (corretto rifiuto), non OMISSION', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const trials: TrialSpec[] = [{ condition: 'nogo', stimulusLabel: 'nogo' }];
    const seq = createSequencer(
      baseConfig(env, {
        trials,
        fixationMs: 0,
        stimulusVisibleMs: 800,
        responseWindowMs: 800,
        endOnResponse: false,
        expectsResponse: (t) => t.condition === 'go',
        evaluate: (t, k) => (t.condition === 'go' ? k !== null : k === null),
        responseKeys: [' '],
        onTrialResult: (r) => results.push(r),
      }),
    );
    seq.start();
    env.advance(800);
    expect(results[0]!.flag).toBe('VALID');
    expect(results[0]!.correct).toBe(true);
  });

  it('una sola risposta per trial: la seconda pressione è ignorata', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    const seq = createSequencer(baseConfig(env, { onTrialResult: (r) => results.push(r) }));
    seq.start();
    env.advance(500);
    env.advance(200);
    seq.handleKey('r', env.clock.now());
    seq.handleKey('r', env.clock.now() + 50); // ignorata (trial già chiuso da endOnResponse)
    expect(results).toHaveLength(1);
    expect(results[0]!.rtMs).toBe(200);
  });
});

describe('createSequencer — sequenza completa', () => {
  it('esegue tutti i trial e chiama onDone', () => {
    const env = new FakeEnv();
    const results: TrialResult[] = [];
    let done = false;
    const trials: TrialSpec[] = [
      { condition: 'a', stimulusLabel: 'A' },
      { condition: 'b', stimulusLabel: 'B' },
    ];
    const seq = createSequencer(
      baseConfig(env, {
        trials,
        onTrialResult: (r) => results.push(r),
        onDone: () => {
          done = true;
        },
      }),
    );
    seq.start();
    // trial 0: fissazione 500 + risposta
    env.advance(500);
    env.advance(200);
    seq.handleKey('r', env.clock.now());
    env.advance(500); // isi
    // trial 1
    env.advance(500); // fissazione
    env.advance(3000); // omissione, chiude finestra
    env.advance(500); // isi → done
    expect(results).toHaveLength(2);
    expect(done).toBe(true);
  });
});
