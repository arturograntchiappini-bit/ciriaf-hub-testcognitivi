import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import { criterionC, dPrime } from '../sdt';
import type { TrialResult, ValidationFlag } from '../types';
import {
  generateSart,
  reactionTimesBeforeCommissions,
  scoreSart,
  SART_DIGITS,
  SART_FONT_SIZES_PX,
  type SartParams,
} from './sart';

const PARAMS: SartParams = { nTrials: 225, targetDigit: 3, digitMs: 250, maskMs: 900, practiceTrials: 18 };

function trial(
  index: number,
  condition: 'go' | 'nogo',
  rtMs: number | null,
  overrides: Partial<TrialResult> = {},
): TrialResult {
  const responded = rtMs !== null;
  const flag: ValidationFlag = responded ? 'VALID' : condition === 'go' ? 'OMISSION' : 'VALID';
  return {
    testId: 'sart',
    sessionId: 'T-0000',
    trialIndex: index,
    phase: 'test',
    condition,
    stimulus: condition === 'go' ? '5' : '3',
    response: responded ? ' ' : null,
    correct: condition === 'go' ? responded : !responded,
    rtMs,
    flag,
    onsetTimestamp: 0,
    ...overrides,
  };
}

const metric = (trials: TrialResult[], label: string): string | number | undefined =>
  scoreSart(trials).find((m) => m.label.startsWith(label))?.value;

describe('generateSart', () => {
  it('should_present_each_digit_25_times_with_225_trials', () => {
    const seq = generateSart(PARAMS, mulberry32(1));
    expect(seq).toHaveLength(225);
    for (const digit of SART_DIGITS) expect(seq.filter((s) => s.digit === digit)).toHaveLength(25);
  });

  it('should_never_repeat_the_same_digit_twice_in_a_row', () => {
    for (const seed of [1, 2, 3, 42, 99, 2026]) {
      const seq = generateSart(PARAMS, mulberry32(seed));
      for (let i = 1; i < seq.length; i++) expect(seq[i]!.digit).not.toBe(seq[i - 1]!.digit);
    }
  });

  it('should_balance_the_five_font_sizes', () => {
    const seq = generateSart(PARAMS, mulberry32(5));
    for (let size = 0; size < SART_FONT_SIZES_PX.length; size++) {
      expect(seq.filter((s) => s.sizeIndex === size)).toHaveLength(45);
    }
  });

  it('should_spread_the_remainder_when_trials_are_not_a_multiple_of_nine', () => {
    const seq = generateSart({ ...PARAMS, nTrials: 20 }, mulberry32(8));
    const counts = SART_DIGITS.map((digit) => seq.filter((s) => s.digit === digit).length);
    expect(seq).toHaveLength(20);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('should_be_deterministic_for_the_same_seed', () => {
    expect(generateSart(PARAMS, mulberry32(7))).toEqual(generateSart(PARAMS, mulberry32(7)));
  });

  it('should_handle_a_tiny_session_without_repeating_digits', () => {
    const seq = generateSart({ ...PARAMS, nTrials: 9 }, mulberry32(3));
    expect(new Set(seq.map((s) => s.digit)).size).toBe(9);
  });
});

describe('scoreSart', () => {
  it('should_count_commissions_and_omissions_with_their_rates', () => {
    const trials = [
      trial(0, 'go', 400),
      trial(1, 'go', null),
      trial(2, 'nogo', 380),
      trial(3, 'nogo', null),
    ];
    expect(metric(trials, 'Errori di commissione')).toBe(1);
    expect(metric(trials, 'Tasso di commissione')).toBe(50);
    expect(metric(trials, 'Errori di omissione')).toBe(1);
    expect(metric(trials, 'Tasso di omissione')).toBe(50);
  });

  it('should_exclude_interrupted_trials_from_counts_and_denominators', () => {
    const trials = [
      trial(0, 'go', 400),
      trial(1, 'nogo', null, { flag: 'INTERRUPTED' }),
      trial(2, 'go', null, { flag: 'INTERRUPTED' }),
    ];
    expect(metric(trials, 'Tasso di commissione')).toBe(0);
    expect(metric(trials, 'Errori di omissione')).toBe(0);
  });

  it('should_ignore_practice_trials', () => {
    const trials = [trial(0, 'nogo', 300, { phase: 'practice' }), trial(1, 'go', 450)];
    expect(metric(trials, 'Errori di commissione')).toBe(0);
  });

  it('should_compute_dprime_and_criterion_from_hits_and_commissions', () => {
    const trials = [trial(0, 'go', 400), trial(1, 'go', 410), trial(2, 'go', null), trial(3, 'nogo', 350), trial(4, 'nogo', null)];
    expect(metric(trials, "Sensibilità d'")).toBe(Math.round(dPrime(2, 3, 1, 2) * 100) / 100);
    expect(metric(trials, 'Criterio decisionale')).toBe(Math.round(criterionC(2, 3, 1, 2) * 100) / 100);
  });

  it('should_summarise_go_rt_from_valid_correct_responses_only', () => {
    const trials = [
      trial(0, 'go', 400),
      trial(1, 'go', 500),
      trial(2, 'go', 100, { flag: 'ANTICIPATION' }),
      trial(3, 'go', null),
    ];
    expect(metric(trials, 'RT medio Go')).toBe(450);
    expect(metric(trials, 'Errori di anticipazione')).toBe(1);
  });

  it('should_report_a_dash_for_pre_error_rt_when_there_are_no_commissions', () => {
    expect(metric([trial(0, 'go', 400), trial(1, 'nogo', null)], 'RT medio nei')).toBe('—');
  });

  it('should_show_faster_rt_before_commissions_as_a_negative_variation', () => {
    const trials = [
      trial(0, 'go', 500),
      trial(1, 'go', 500),
      trial(2, 'go', 500),
      trial(3, 'go', 300),
      trial(4, 'go', 300),
      trial(5, 'nogo', 280),
    ];
    expect(metric(trials, 'RT medio nei')).toBe(400);
    expect(metric(trials, 'Variazione di RT')).toBe(400 - 420);
  });
});

describe('reactionTimesBeforeCommissions', () => {
  it('should_take_only_the_window_of_trials_before_each_commission', () => {
    const trials = [trial(0, 'go', 600), trial(1, 'go', 500), trial(2, 'go', 500), trial(3, 'go', 500), trial(4, 'go', 500), trial(5, 'nogo', 300)];
    expect(reactionTimesBeforeCommissions(trials, 4)).toEqual([500, 500, 500, 500]);
  });

  it('should_count_a_trial_once_when_two_commissions_share_it', () => {
    const trials = [trial(0, 'go', 400), trial(1, 'nogo', 300), trial(2, 'nogo', 300)];
    expect(reactionTimesBeforeCommissions(trials, 4)).toEqual([400]);
  });

  it('should_skip_anticipations_and_omissions_as_rt_sources', () => {
    const trials = [trial(0, 'go', 100, { flag: 'ANTICIPATION' }), trial(1, 'go', null), trial(2, 'go', 450), trial(3, 'nogo', 300)];
    expect(reactionTimesBeforeCommissions(trials, 4)).toEqual([450]);
  });
});
