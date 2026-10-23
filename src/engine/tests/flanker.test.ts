import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { TrialResult, ValidationFlag } from '../types';
import {
  buildArrows,
  conflictAdaptation,
  generateFlanker,
  scoreFlanker,
  type FlankerCondition,
  type FlankerParams,
} from './flanker';

const PARAMS: FlankerParams = {
  nTrials: 96,
  incongruentRatio: 0.4,
  neutralRatio: 0.2,
  fixationMs: 500,
  responseWindowMs: 1500,
  isiMinMs: 700,
  isiMaxMs: 1100,
  practiceTrials: 12,
};

function trial(
  index: number,
  condition: FlankerCondition,
  rtMs: number | null,
  overrides: Partial<TrialResult> = {},
): TrialResult {
  const flag: ValidationFlag = rtMs === null ? 'OMISSION' : 'VALID';
  return {
    testId: 'flanker',
    sessionId: 'T-0000',
    trialIndex: index,
    phase: 'test',
    condition,
    stimulus: '←←←←←',
    response: rtMs === null ? null : 'arrowleft',
    correct: rtMs !== null,
    rtMs,
    flag,
    onsetTimestamp: 0,
    ...overrides,
  };
}

describe('buildArrows', () => {
  it('should_use_matching_flankers_when_congruent', () => {
    expect(buildArrows('congruent', 'left')).toBe('←←←←←');
    expect(buildArrows('congruent', 'right')).toBe('→→→→→');
  });

  it('should_use_opposite_flankers_when_incongruent', () => {
    expect(buildArrows('incongruent', 'left')).toBe('→→←→→');
    expect(buildArrows('incongruent', 'right')).toBe('←←→←←');
  });

  it('should_use_dashes_when_neutral', () => {
    expect(buildArrows('neutral', 'left')).toBe('––←––');
  });
});

describe('generateFlanker', () => {
  it('should_produce_the_exact_number_of_trials_per_condition', () => {
    const stimuli = generateFlanker(PARAMS, mulberry32(1));
    const count = (c: FlankerCondition): number => stimuli.filter((s) => s.condition === c).length;
    expect(stimuli).toHaveLength(96);
    expect(count('incongruent')).toBe(38);
    expect(count('neutral')).toBe(19);
    expect(count('congruent')).toBe(39);
  });

  it('should_balance_left_and_right_within_each_condition', () => {
    const stimuli = generateFlanker({ ...PARAMS, nTrials: 100, incongruentRatio: 0.4, neutralRatio: 0.2 }, mulberry32(2));
    for (const condition of ['congruent', 'incongruent', 'neutral'] as const) {
      const group = stimuli.filter((s) => s.condition === condition);
      const left = group.filter((s) => s.direction === 'left').length;
      expect(Math.abs(left - (group.length - left))).toBeLessThanOrEqual(1);
    }
  });

  it('should_never_repeat_condition_or_response_more_than_three_times_in_a_row', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const stimuli = generateFlanker(PARAMS, mulberry32(seed));
      for (let i = 3; i < stimuli.length; i++) {
        const window = stimuli.slice(i - 3, i + 1);
        expect(window.every((s) => s.condition === window[0]!.condition)).toBe(false);
        expect(window.every((s) => s.direction === window[0]!.direction)).toBe(false);
      }
    }
  });

  it('should_keep_isi_inside_the_configured_range', () => {
    const stimuli = generateFlanker(PARAMS, mulberry32(3));
    expect(stimuli.every((s) => s.isiMs >= 700 && s.isiMs <= 1100)).toBe(true);
  });

  it('should_be_deterministic_for_the_same_seed', () => {
    expect(generateFlanker(PARAMS, mulberry32(9))).toEqual(generateFlanker(PARAMS, mulberry32(9)));
  });
});

describe('scoreFlanker', () => {
  const trials = [
    trial(0, 'congruent', 400),
    trial(1, 'congruent', 420),
    trial(2, 'incongruent', 500),
    trial(3, 'incongruent', 520),
    trial(4, 'neutral', 450),
    trial(5, 'incongruent', null),
  ];
  const metric = (label: RegExp): string | number => scoreFlanker(trials).find((m) => label.test(m.label))!.value;

  it('should_compute_the_flanker_effect_as_incongruent_minus_congruent', () => {
    expect(metric(/^Effetto flanker/)).toBe(100);
  });

  it('should_split_interference_and_facilitation_around_the_neutral_baseline', () => {
    expect(metric(/^Interferenza/)).toBe(60);
    expect(metric(/^Facilitazione/)).toBe(40);
  });

  it('should_compute_accuracy_per_condition_counting_omissions_as_errors', () => {
    expect(metric(/^Accuratezza incongruenti/)).toBeCloseTo(66.7, 1);
    expect(metric(/^Accuratezza congruenti/)).toBe(100);
  });

  it('should_ignore_practice_trials', () => {
    const withPractice = [...trials, trial(9, 'incongruent', 9999, { phase: 'practice' })];
    const effect = scoreFlanker(withPractice).find((m) => /^Effetto flanker/.test(m.label))!.value;
    expect(effect).toBe(100);
  });

  it('should_show_dashes_for_neutral_metrics_when_there_are_no_neutral_trials', () => {
    const noNeutral = trials.filter((t) => t.condition !== 'neutral');
    const result = scoreFlanker(noNeutral).find((m) => /^Interferenza/.test(m.label))!;
    expect(result.value).toBe('—');
  });
});

describe('conflictAdaptation', () => {
  it('should_return_a_positive_gratton_effect_when_interference_shrinks_after_incongruent_trials', () => {
    // coppie (precedente → corrente): cC, cI, iC, iI, ripetute per riempire le celle
    const seq: Array<[FlankerCondition, number]> = [
      ['congruent', 400], ['congruent', 400], // cC = 400
      ['congruent', 400], ['incongruent', 560], // cI = 560
      ['incongruent', 410], ['congruent', 410], // iC = 410
      ['incongruent', 410], ['incongruent', 480], // iI = 480
    ];
    const trials = seq.map(([c, rt], i) => trial(i, c, rt));
    // (cI − cC) − (iI − iC) = (560−400) − (480−410) = 90
    expect(conflictAdaptation(trials)).toBeGreaterThan(0);
  });

  it('should_return_null_when_a_transition_cell_is_empty', () => {
    expect(conflictAdaptation([trial(0, 'congruent', 400), trial(1, 'congruent', 410)])).toBeNull();
  });
});
