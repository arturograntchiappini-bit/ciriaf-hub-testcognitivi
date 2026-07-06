import { describe, it, expect } from 'vitest';
import { generateNBack, dPrime, probit, scoreNBack, splitIntoChunks, type NBackParams } from './nback';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';

const PARAMS: NBackParams = {
  n: 2,
  letterMs: 500,
  blankMs: 1500,
  nTrials: 100,
  targetRate: 0.3,
  practiceTrials: 20,
};

describe('generateNBack', () => {
  it('isTarget è vero sse letter[i]===letter[i-n]', () => {
    const seq = generateNBack(PARAMS, mulberry32(1));
    for (let i = 0; i < seq.length; i++) {
      if (i < PARAMS.n) {
        expect(seq[i]!.isTarget).toBe(false);
      } else {
        expect(seq[i]!.isTarget).toBe(seq[i]!.letter === seq[i - PARAMS.n]!.letter);
      }
    }
  });

  it('la frazione di target è vicina al target rate', () => {
    const seq = generateNBack(PARAMS, mulberry32(5));
    const targets = seq.filter((s) => s.isTarget).length;
    const eligible = PARAMS.nTrials - PARAMS.n;
    const expected = Math.round(eligible * PARAMS.targetRate);
    // tolleranza ±3 per gli aggiustamenti del generatore
    expect(Math.abs(targets - expected)).toBeLessThanOrEqual(3);
  });

  it('nessun target nelle prime n posizioni', () => {
    const seq = generateNBack(PARAMS, mulberry32(9));
    for (let i = 0; i < PARAMS.n; i++) {
      expect(seq[i]!.isTarget).toBe(false);
    }
  });

  it('usa solo consonanti', () => {
    const seq = generateNBack(PARAMS, mulberry32(2));
    for (const s of seq) {
      expect('AEIOU').not.toContain(s.letter);
    }
  });
});

describe('probit e dPrime', () => {
  it('probit(0.5) ≈ 0', () => {
    expect(probit(0.5)).toBeCloseTo(0, 3);
  });
  it('probit(0.975) ≈ 1.96', () => {
    expect(probit(0.975)).toBeCloseTo(1.96, 2);
  });
  it("d' con correzione loglinear evita infiniti su performance perfetta", () => {
    const d = dPrime(30, 30, 0, 70); // hit perfetti, zero falsi allarmi
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(2);
  });
  it("d' è ~0 quando hit rate ≈ false alarm rate", () => {
    const d = dPrime(15, 30, 35, 70); // 0.5 vs 0.5
    expect(Math.abs(d)).toBeLessThan(0.1);
  });
});

describe('splitIntoChunks', () => {
  it('divide in k blocchi contigui', () => {
    const chunks = splitIntoChunks([1, 2, 3, 4, 5, 6, 7, 8], 4);
    expect(chunks).toHaveLength(4);
    expect(chunks.flat()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

function trial(overrides: Partial<TrialResult>): TrialResult {
  return {
    testId: 'nback',
    sessionId: 'N-0000',
    trialIndex: 0,
    phase: 'test',
    condition: 'nontarget',
    stimulus: 'B',
    response: null,
    correct: true,
    rtMs: null,
    flag: 'VALID',
    onsetTimestamp: 0,
    ...overrides,
  };
}

describe('scoreNBack', () => {
  it('conta hit, miss e falsi allarmi', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'target', response: 'space', correct: true, rtMs: 600, flag: 'VALID' }), // hit
      trial({ condition: 'target', response: null, correct: false, rtMs: null, flag: 'OMISSION' }), // miss
      trial({ condition: 'nontarget', response: 'space', correct: false, rtMs: 500, flag: 'VALID' }), // FA
      trial({ condition: 'nontarget', response: null, correct: true, rtMs: null, flag: 'VALID' }), // CR
    ];
    const summary = scoreNBack(trials);
    expect(summary.find((m) => m.label === 'Hit (target rilevati)')?.value).toBe(1);
    expect(summary.find((m) => m.label === 'Miss (target mancati)')?.value).toBe(1);
    expect(summary.find((m) => m.label === 'Falsi allarmi')?.value).toBe(1);
  });

  it('include i d′ per quartile', () => {
    const trials: TrialResult[] = Array.from({ length: 8 }, (_, i) =>
      trial({ trialIndex: i, condition: i % 2 === 0 ? 'target' : 'nontarget', response: i % 2 === 0 ? 'space' : null, correct: true, rtMs: i % 2 === 0 ? 600 : null }),
    );
    const summary = scoreNBack(trials, 4);
    expect(summary.filter((m) => m.label.startsWith("d' quartile"))).toHaveLength(4);
  });
});
