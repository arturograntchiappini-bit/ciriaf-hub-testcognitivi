import { describe, it, expect } from 'vitest';
import { generateGoNoGo, scoreGoNoGo, type GoNoGoParams } from './gonogo';
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
  });
});
