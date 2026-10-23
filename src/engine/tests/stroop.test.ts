import { describe, it, expect } from 'vitest';
import {
  generateStroop,
  correctKeyStroop,
  scoreStroop,
  STROOP_KEYS,
  type StroopParams,
  type StroopStimulus,
} from './stroop';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';

const PARAMS: StroopParams = {
  nTrials: 48,
  fixationMs: 500,
  timeoutMs: 3000,
  isiMs: 500,
  practiceTrials: 8,
};

describe('generateStroop', () => {
  it('produce nTrials stimoli, metà congruenti e metà incongruenti', () => {
    const seq = generateStroop(PARAMS, mulberry32(1));
    expect(seq).toHaveLength(48);
    expect(seq.filter((s) => s.congruent)).toHaveLength(24);
    expect(seq.filter((s) => !s.congruent)).toHaveLength(24);
  });

  it('con 48 trial ogni colore e ogni parola compaiono 6 volte tra gli incongruenti e 6 tra i congruenti', () => {
    const seq = generateStroop(PARAMS, mulberry32(3));
    for (const color of ['ROSSO', 'VERDE', 'BLU', 'GIALLO']) {
      expect(seq.filter((s) => !s.congruent && s.color === color)).toHaveLength(6);
      expect(seq.filter((s) => !s.congruent && s.word === color)).toHaveLength(6);
      expect(seq.filter((s) => s.congruent && s.color === color)).toHaveLength(6);
    }
  });

  it('gli incongruenti hanno parola diversa dal colore, i congruenti uguali', () => {
    const seq = generateStroop(PARAMS, mulberry32(2));
    for (const s of seq) {
      if (s.congruent) expect(s.word).toBe(s.color);
      else expect(s.word).not.toBe(s.color);
    }
  });

  it('non ha più di 3 ripetizioni consecutive dello stesso colore o parola', () => {
    const seq = generateStroop(PARAMS, mulberry32(3));
    let colorRun = 1;
    let wordRun = 1;
    for (let i = 1; i < seq.length; i++) {
      colorRun = seq[i]!.color === seq[i - 1]!.color ? colorRun + 1 : 1;
      wordRun = seq[i]!.word === seq[i - 1]!.word ? wordRun + 1 : 1;
      expect(colorRun).toBeLessThanOrEqual(3);
      expect(wordRun).toBeLessThanOrEqual(3);
    }
  });
});

describe('correctKeyStroop', () => {
  const stim: StroopStimulus = { word: 'ROSSO', color: 'BLU', congruent: false };
  it('stroop1 usa la parola', () => {
    expect(correctKeyStroop(stim, 'stroop1')).toBe(STROOP_KEYS.ROSSO);
    expect(correctKeyStroop(stim, 'stroop1')).toBe('R');
  });
  it('stroop2 usa il colore', () => {
    expect(correctKeyStroop(stim, 'stroop2')).toBe(STROOP_KEYS.BLU);
    expect(correctKeyStroop(stim, 'stroop2')).toBe('B');
  });
});

function trial(overrides: Partial<TrialResult>): TrialResult {
  return {
    testId: 'stroop1',
    sessionId: 'S-0000',
    trialIndex: 0,
    phase: 'test',
    condition: 'congruent',
    stimulus: 'ROSSO/ROSSO',
    response: 'R',
    correct: true,
    rtMs: 500,
    flag: 'VALID',
    onsetTimestamp: 0,
    ...overrides,
  };
}

describe('scoreStroop', () => {
  it('calcola l’effetto interferenza come RT inc − con', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'congruent', rtMs: 500, correct: true, flag: 'VALID' }),
      trial({ condition: 'congruent', rtMs: 600, correct: true, flag: 'VALID' }),
      trial({ condition: 'incongruent', rtMs: 800, correct: true, flag: 'VALID' }),
      trial({ condition: 'incongruent', rtMs: 900, correct: true, flag: 'VALID' }),
    ];
    const summary = scoreStroop(trials);
    const interference = summary.find((m) => m.label.startsWith('Effetto interferenza'));
    // mean inc (850) - mean con (550) = 300
    expect(interference?.value).toBe(300);
  });

  it('calcola il costo in accuratezza come accuratezza congruenti − incongruenti, in punti percentuali', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'congruent', correct: true }),
      trial({ condition: 'congruent', correct: true }),
      trial({ condition: 'incongruent', correct: true }),
      trial({ condition: 'incongruent', correct: false }),
    ];
    const summary = scoreStroop(trials);
    expect(summary.find((m) => m.label.startsWith('Costo in accuratezza'))?.value).toBe(50);
  });

  it('esclude i trial interrotti dall’accuratezza', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'congruent', correct: true }),
      trial({ condition: 'congruent', correct: false, flag: 'INTERRUPTED' }),
    ];
    const summary = scoreStroop(trials);
    expect(summary.find((m) => m.label === 'Accuratezza congruenti')?.value).toBe(100);
  });

  it('conta anticipazioni e omissioni', () => {
    const trials: TrialResult[] = [
      trial({ condition: 'incongruent', flag: 'ANTICIPATION', correct: false, rtMs: 100 }),
      trial({ condition: 'incongruent', flag: 'OMISSION', correct: false, rtMs: null, response: null }),
    ];
    const summary = scoreStroop(trials);
    expect(summary.find((m) => m.label === 'Errori di anticipazione')?.value).toBe(1);
    expect(summary.find((m) => m.label === 'Errori di omissione')?.value).toBe(1);
  });
});
