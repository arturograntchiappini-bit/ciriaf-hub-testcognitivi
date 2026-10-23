import { describe, it, expect } from 'vitest';
import { generateGoNoGo, scoreGoNoGo, type GoNoGoParams } from './gonogo';
import { criterionC, dPrime } from '../sdt';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';

const PARAMS: GoNoGoParams = {
  nTrials: 80,
  goRatio: 0.75,
  stimulusMs: 800,
  isiMinMs: 500,
  isiMaxMs: 1000,
  practiceTrials: 10,
};

describe('generateGoNoGo', () => {
  it('produce esattamente 60 Go e 20 No-Go con rapporto 0.75', () => {
    const seq = generateGoNoGo(PARAMS, mulberry32(1));
    expect(seq).toHaveLength(80);
    expect(seq.filter((s) => s.kind === 'go')).toHaveLength(60);
    expect(seq.filter((s) => s.kind === 'nogo')).toHaveLength(20);
  });

  it('non ha più di 2 No-Go consecutivi', () => {
    const seq = generateGoNoGo(PARAMS, mulberry32(7));
    let run = 0;
    for (const s of seq) {
      run = s.kind === 'nogo' ? run + 1 : 0;
      expect(run).toBeLessThanOrEqual(2);
    }
  });

  it('il primo trial è sempre un Go (risposta prepotente)', () => {
    for (const seed of [1, 7, 3, 42, 99]) {
      const seq = generateGoNoGo(PARAMS, mulberry32(seed));
      expect(seq[0]!.kind).toBe('go');
    }
  });

  it('ogni ISI è in [500, 1000] ms', () => {
    const seq = generateGoNoGo(PARAMS, mulberry32(3));
    for (const s of seq) {
      expect(s.isiMs).toBeGreaterThanOrEqual(500);
      expect(s.isiMs).toBeLessThanOrEqual(1000);
    }
  });
});

function trial(overrides: Partial<TrialResult>): TrialResult {
  return {
    testId: 'gonogo',
    sessionId: 'G-0000',
    trialIndex: 0,
    phase: 'test',
    condition: 'go',
    stimulus: 'go',
    response: 'space',
    correct: true,
    rtMs: 400,
    flag: 'VALID',
    onsetTimestamp: 0,
    ...overrides,
  };
}

describe('scoreGoNoGo', () => {
  it('conta errori di commissione (risposta su No-Go)', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'nogo', stimulus: 'nogo', correct: false, response: 'space', flag: 'VALID', rtMs: 300 }),
      trial({ condition: 'nogo', stimulus: 'nogo', correct: true, response: null, rtMs: null, flag: 'OMISSION' }),
    ];
    const summary = scoreGoNoGo(trials);
    expect(summary.find((m) => m.label === 'Errori di commissione (No-Go)')?.value).toBe(1);
  });

  it('conta errori di omissione sui Go e calcola RT medio dei Go corretti', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'go', correct: true, rtMs: 300, flag: 'VALID' }),
      trial({ condition: 'go', correct: true, rtMs: 500, flag: 'VALID' }),
      trial({ condition: 'go', correct: false, rtMs: null, response: null, flag: 'OMISSION' }),
    ];
    const summary = scoreGoNoGo(trials);
    expect(summary.find((m) => m.label === 'Errori di omissione (Go)')?.value).toBe(1);
    expect(summary.find((m) => m.label === 'RT medio Go corretti')?.value).toBe(400);
    // CV = SD/mean*100; RT 300 e 500 → mean 400, SD campionaria √(20000)=141.42 → CV 35.4%
    expect(summary.find((m) => m.label === 'CV RT Go corretti')?.value).toBe(35.4);
  });

  it('esclude i trial interrotti dai denominatori dei tassi', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'nogo', stimulus: 'nogo', correct: false, rtMs: 300 }),
      trial({ condition: 'nogo', stimulus: 'nogo', correct: true, response: null, rtMs: null, flag: 'INTERRUPTED' }),
      trial({ condition: 'go', rtMs: 400 }),
      trial({ condition: 'go', correct: false, response: null, rtMs: null, flag: 'INTERRUPTED' }),
    ];
    const summary = scoreGoNoGo(trials);
    expect(summary.find((m) => m.label === 'Tasso di commissione')?.value).toBe(100);
    expect(summary.find((m) => m.label === 'Tasso di omissione')?.value).toBe(0);
  });

  it("calcola d' e criterio dalla risposta sui Go (hit) e sui No-Go (falso allarme), anticipazioni comprese", () => {
    const hits = [
      ...Array.from({ length: 8 }, () => trial({ condition: 'go', rtMs: 400 })),
      trial({ condition: 'go', rtMs: 90, flag: 'ANTICIPATION' }),
    ];
    const misses = [trial({ condition: 'go', correct: false, response: null, rtMs: null, flag: 'OMISSION' })];
    const falseAlarm = [trial({ condition: 'nogo', stimulus: 'nogo', correct: false, rtMs: 300 })];
    const rejections = Array.from({ length: 3 }, () =>
      trial({ condition: 'nogo', stimulus: 'nogo', correct: true, response: null, rtMs: null, flag: 'OMISSION' }),
    );
    const summary = scoreGoNoGo([...hits, ...misses, ...falseAlarm, ...rejections]);
    expect(summary.find((m) => m.label === "Sensibilità d'")?.value).toBeCloseTo(Math.round(dPrime(9, 10, 1, 4) * 100) / 100, 2);
    expect(summary.find((m) => m.label === 'Criterio decisionale (c)')?.value).toBeCloseTo(Math.round(criterionC(9, 10, 1, 4) * 100) / 100, 2);
  });
});
