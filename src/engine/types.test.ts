import { describe, it, expect } from 'vitest';
import type { TrialResult } from './types';

describe('types', () => {
  it('permette di costruire un TrialResult valido', () => {
    const trial: TrialResult = {
      testId: 'stroop1',
      sessionId: 'ABCD-1430',
      trialIndex: 0,
      phase: 'test',
      condition: 'congruent',
      stimulus: 'ROSSO/ROSSO',
      response: 'R',
      correct: true,
      rtMs: 512,
      flag: 'VALID',
      onsetTimestamp: 1234.5,
    };
    expect(trial.flag).toBe('VALID');
    expect(trial.correct).toBe(true);
  });
});
