import { describe, it, expect } from 'vitest';
import {
  classifyRt,
  standardDeviation,
  mean,
  meanRtOfValidCorrect,
  sdRtOfValidCorrect,
  countFlag,
  ANTICIPATION_CUTOFF_MS,
} from './validation';
import type { TrialResult } from './types';

describe('classifyRt', () => {
  it('marca INTERRUPTED con precedenza su tutto', () => {
    expect(classifyRt(500, true, true)).toBe('INTERRUPTED');
    expect(classifyRt(null, false, true)).toBe('INTERRUPTED');
  });

  it('marca OMISSION quando non c’è risposta', () => {
    expect(classifyRt(null, false, false)).toBe('OMISSION');
  });

  it('marca ANTICIPATION sotto i 150 ms', () => {
    expect(classifyRt(149, true, false)).toBe('ANTICIPATION');
    expect(classifyRt(0, true, false)).toBe('ANTICIPATION');
  });

  it('marca VALID a 150 ms e oltre', () => {
    expect(classifyRt(150, true, false)).toBe('VALID');
    expect(classifyRt(151, true, false)).toBe('VALID');
    expect(classifyRt(800, true, false)).toBe('VALID');
  });

  it('espone il cutoff a 150 ms', () => {
    expect(ANTICIPATION_CUTOFF_MS).toBe(150);
  });
});

describe('mean e standardDeviation', () => {
  it('mean di lista vuota è 0', () => {
    expect(mean([])).toBe(0);
  });

  it('SD campionaria (n-1) su valori noti', () => {
    // [2,4,4,4,5,5,7,9] → SD campionaria ≈ 2.138
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });

  it('SD è 0 per n < 2', () => {
    expect(standardDeviation([])).toBe(0);
    expect(standardDeviation([5])).toBe(0);
  });
});

function makeTrial(overrides: Partial<TrialResult>): TrialResult {
  return {
    testId: 'gonogo',
    sessionId: 'ABCD-1200',
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

describe('aggregazioni su trial', () => {
  const trials: TrialResult[] = [
    makeTrial({ trialIndex: 0, rtMs: 300, flag: 'VALID', correct: true }),
    makeTrial({ trialIndex: 1, rtMs: 500, flag: 'VALID', correct: true }),
    makeTrial({ trialIndex: 2, rtMs: 100, flag: 'ANTICIPATION', correct: false }),
    makeTrial({ trialIndex: 3, rtMs: null, flag: 'OMISSION', correct: false, response: null }),
    makeTrial({ trialIndex: 4, rtMs: 420, flag: 'VALID', correct: false }), // valido ma errato
    makeTrial({ trialIndex: 5, rtMs: 999, flag: 'VALID', correct: true, phase: 'practice' }), // pratica esclusa
  ];

  it('media solo su VALID corretti di test', () => {
    expect(meanRtOfValidCorrect(trials)).toBe(400); // (300+500)/2
  });

  it('SD solo su VALID corretti di test', () => {
    expect(sdRtOfValidCorrect(trials)).toBeCloseTo(141.42, 1); // sd([300,500]) n-1
  });

  it('conta i flag solo nei trial di test', () => {
    expect(countFlag(trials, 'ANTICIPATION')).toBe(1);
    expect(countFlag(trials, 'OMISSION')).toBe(1);
    expect(countFlag(trials, 'VALID')).toBe(3); // 3 di test (incluso quello errato), non la pratica
  });
});
