import { describe, it, expect } from 'vitest';
import { generatePvt, scorePvt, type PvtParams } from './pvt';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';

const PARAMS: PvtParams = {
  nTrials: 100,
  stimulusMaxMs: 10000,
  isiMinMs: 2000,
  isiMaxMs: 10000,
  practiceTrials: 5,
};

describe('generatePvt', () => {
  it('produce il numero esatto di trial', () => {
    const seq = generatePvt(PARAMS, mulberry32(1));
    expect(seq).toHaveLength(100);
  });

  it('ogni ISI è in [2000, 10000] ms', () => {
    const seq = generatePvt(PARAMS, mulberry32(7));
    for (const s of seq) {
      expect(s.isiMs).toBeGreaterThanOrEqual(2000);
      expect(s.isiMs).toBeLessThanOrEqual(10000);
    }
  });

  it('è deterministico dato lo stesso seed', () => {
    const a = generatePvt(PARAMS, mulberry32(42));
    const b = generatePvt(PARAMS, mulberry32(42));
    expect(a).toEqual(b);
  });

  it('due seed diversi producono sequenze diverse', () => {
    const a = generatePvt(PARAMS, mulberry32(1));
    const b = generatePvt(PARAMS, mulberry32(2));
    expect(a).not.toEqual(b);
  });
});

function trial(overrides: Partial<TrialResult>): TrialResult {
  return {
    testId: 'pvt',
    sessionId: 'P-0000',
    trialIndex: 0,
    phase: 'test',
    condition: 'pvt',
    stimulus: 'counter',
    response: ' ',
    correct: true,
    rtMs: 300,
    flag: 'VALID',
    onsetTimestamp: 0,
    ...overrides,
  };
}

describe('scorePvt', () => {
  it('conta i lapse (RT ≥ 500 ms)', () => {
    const trials: TrialResult[] = [
      trial({ rtMs: 250, flag: 'VALID' }),
      trial({ rtMs: 600, flag: 'VALID' }), // lapse
      trial({ rtMs: 512, flag: 'VALID' }), // lapse
      trial({ rtMs: 180, flag: 'VALID' }),
    ];
    const summary = scorePvt(trials);
    expect(summary.find((m) => m.label === 'Lapses (RT ≥ 500 ms o nessuna risposta)')?.value).toBe(2);
  });

  it('calcola RT medio e mediano', () => {
    const trials: TrialResult[] = [
      trial({ rtMs: 200, flag: 'VALID' }),
      trial({ rtMs: 400, flag: 'VALID' }),
      trial({ rtMs: 600, flag: 'VALID' }),
    ];
    const summary = scorePvt(trials);
    expect(summary.find((m) => m.label === 'RT medio')?.value).toBe(400);
    expect(summary.find((m) => m.label === 'RT mediano')?.value).toBe(400);
  });

  it('conta anticipazioni e omissioni', () => {
    const trials: TrialResult[] = [
      trial({ rtMs: 80, flag: 'ANTICIPATION', correct: false }),
      trial({ rtMs: 100, flag: 'ANTICIPATION', correct: false }),
      trial({ rtMs: null, response: null, flag: 'OMISSION', correct: false }),
      trial({ rtMs: 300, flag: 'VALID' }),
    ];
    const summary = scorePvt(trials);
    expect(summary.find((m) => m.label === 'Anticipazioni (< 150 ms)')?.value).toBe(2);
    expect(summary.find((m) => m.label === 'Omissioni')?.value).toBe(1);
  });

  it('calcola fastest 10% e slowest 10%', () => {
    // 20 trial: fastest 10% = media dei 2 più veloci, slowest 10% = media dei 2 più lenti
    const trials: TrialResult[] = Array.from({ length: 20 }, (_, i) =>
      trial({ rtMs: 200 + i * 10, flag: 'VALID' }),
    );
    const summary = scorePvt(trials);
    // fastest 2: 200+210 /2 = 205
    expect(summary.find((m) => m.label === 'Media fastest 10%')?.value).toBe(205);
    // slowest 2: 380+390 /2 = 385
    expect(summary.find((m) => m.label === 'Media slowest 10%')?.value).toBe(385);
  });

  it('conta le omissioni come lapse e calcola il tasso su risposte valide e omissioni', () => {
    const trials: TrialResult[] = [
      trial({ rtMs: 300, flag: 'VALID' }),
      trial({ rtMs: 600, flag: 'VALID' }), // lapse
      trial({ rtMs: null, response: null, flag: 'OMISSION', correct: false }), // lapse
      trial({ rtMs: 90, flag: 'ANTICIPATION', correct: false }), // esclusa dal tasso
      trial({ rtMs: 320, flag: 'INTERRUPTED' }), // esclusa
    ];
    const summary = scorePvt(trials);
    expect(summary.find((m) => m.label.startsWith('Lapses'))?.value).toBe(2);
    expect(summary.find((m) => m.label === 'Tasso di lapse')?.value).toBe(66.7);
  });

  it('la mediana di un numero pari di RT è la media dei due centrali', () => {
    const trials: TrialResult[] = [200, 300, 400, 900].map((rt) => trial({ rtMs: rt }));
    expect(scorePvt(trials).find((m) => m.label === 'RT mediano')?.value).toBe(350);
  });

  it('calcola la velocità di risposta come media di 1/RT in 1/s', () => {
    const trials: TrialResult[] = [250, 500].map((rt) => trial({ rtMs: rt }));
    const summary = scorePvt(trials);
    expect(summary.find((m) => m.label === 'Velocità di risposta media (1/RT)')?.value).toBe(3); // (4 + 2) / 2
    expect(summary.find((m) => m.label === 'Velocità media del 10% più lento (1/RT)')?.value).toBe(2);
  });

  it('filtra la pratica dalle metriche', () => {
    const trials: TrialResult[] = [
      trial({ phase: 'practice', rtMs: 5000, flag: 'VALID' }),
      trial({ rtMs: 300, flag: 'VALID' }),
    ];
    const summary = scorePvt(trials);
    const nLapses = summary.find((m) => m.label === 'Lapses (RT ≥ 500 ms o nessuna risposta)')?.value;
    expect(nLapses).toBe(0); // 5000 ms era pratica, non test
  });
});