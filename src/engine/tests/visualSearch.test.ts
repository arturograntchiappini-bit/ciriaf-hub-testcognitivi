import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import { leastSquares } from '../regression';
import type { TrialResult, ValidationFlag } from '../types';
import {
  conditionLabel,
  generateVisualSearch,
  scoreVisualSearch,
  searchSlope,
  SEARCH_SET_SIZES,
  type VisualSearchParams,
} from './visualSearch';

const PARAMS: VisualSearchParams = { nTrials: 96, fixationMs: 500, responseWindowMs: 4000, isiMinMs: 700, isiMaxMs: 1100, practiceTrials: 8 };

function trial(condition: string, rtMs: number | null, over: Partial<TrialResult> = {}): TrialResult {
  const flag: ValidationFlag = rtMs === null ? 'OMISSION' : 'VALID';
  return {
    testId: 'visualSearch', sessionId: 'V-0', trialIndex: 0, phase: 'test', condition, stimulus: condition,
    response: rtMs === null ? null : 'arrowleft', correct: rtMs !== null, rtMs, flag, onsetTimestamp: 0, ...over,
  };
}

const metric = (trials: TrialResult[], label: string): string | number | undefined =>
  scoreVisualSearch(trials).find((m) => m.label === label)?.value;

describe('generateVisualSearch', () => {
  it('should_balance_type_set_size_and_presence_with_96_trials', () => {
    const seq = generateVisualSearch(PARAMS, mulberry32(1));
    expect(seq).toHaveLength(96);
    for (const type of ['feature', 'conjunction'] as const)
      for (const size of SEARCH_SET_SIZES)
        for (const present of [true, false])
          expect(seq.filter((s) => s.type === type && s.setSize === size && s.present === present)).toHaveLength(8);
  });

  it('should_place_exactly_one_target_only_when_present', () => {
    for (const s of generateVisualSearch(PARAMS, mulberry32(2))) {
      expect(s.items).toHaveLength(s.setSize);
      expect(s.items.filter((i) => i.isTarget)).toHaveLength(s.present ? 1 : 0);
    }
  });

  it('should_use_blue_circles_as_feature_distractors', () => {
    for (const s of generateVisualSearch(PARAMS, mulberry32(3)).filter((x) => x.type === 'feature')) {
      for (const item of s.items.filter((i) => !i.isTarget)) expect([item.color, item.shape]).toEqual(['blue', 'circle']);
    }
  });

  it('should_split_conjunction_distractors_between_orange_squares_and_blue_circles', () => {
    const s = generateVisualSearch(PARAMS, mulberry32(4)).find((x) => x.type === 'conjunction' && x.setSize === 16 && !x.present)!;
    expect(s.items.filter((i) => i.color === 'orange' && i.shape === 'square')).toHaveLength(8);
    expect(s.items.filter((i) => i.color === 'blue' && i.shape === 'circle')).toHaveLength(8);
  });

  it('should_never_overlap_items_and_stay_inside_the_field', () => {
    for (const s of generateVisualSearch(PARAMS, mulberry32(5))) {
      const cells = new Set(s.items.map((i) => `${Math.floor(i.x * 6)}-${Math.floor(i.y * 6)}`));
      expect(cells.size).toBe(s.items.length);
      for (const i of s.items) {
        expect(i.x).toBeGreaterThan(0);
        expect(i.x).toBeLessThan(1);
        expect(i.y).toBeGreaterThan(0);
        expect(i.y).toBeLessThan(1);
      }
    }
  });

  it('should_be_deterministic_for_the_same_seed', () => {
    expect(generateVisualSearch(PARAMS, mulberry32(9))).toEqual(generateVisualSearch(PARAMS, mulberry32(9)));
  });
});

describe('leastSquares', () => {
  it('should_recover_slope_and_intercept_of_a_line', () => {
    const fit = leastSquares([[4, 500], [8, 600], [16, 800]])!;
    expect(fit.slope).toBeCloseTo(25);
    expect(fit.intercept).toBeCloseTo(400);
  });
  it('should_return_null_with_fewer_than_two_distinct_set_sizes', () => {
    expect(leastSquares([[4, 500]])).toBeNull();
    expect(leastSquares([[4, 500], [4, 700]])).toBeNull();
  });
});

describe('searchSlope and scoreVisualSearch', () => {
  const linear = (type: 'feature' | 'conjunction', present: boolean, slope: number): TrialResult[] =>
    SEARCH_SET_SIZES.map((n) => trial(conditionLabel(type, present, n), 500 + slope * n));

  it('should_report_the_search_slope_in_ms_per_item', () => {
    const trials = [...linear('conjunction', true, 25), ...linear('feature', true, 1)];
    expect(searchSlope(trials, 'conjunction', true)?.slope).toBeCloseTo(25);
    expect(metric(trials, 'Pendenza congiunzione (bersaglio presente)')).toBe(25);
    expect(metric(trials, 'Pendenza caratteristica (bersaglio presente)')).toBe(1);
  });

  it('should_report_a_dash_when_a_slope_cannot_be_computed', () => {
    expect(metric([trial(conditionLabel('feature', true, 4), 500)], 'Pendenza caratteristica (bersaglio presente)')).toBe('—');
  });

  it('should_compute_the_absent_over_present_ratio_for_conjunction', () => {
    const trials = [...linear('conjunction', true, 20), ...linear('conjunction', false, 40)];
    expect(metric(trials, 'Rapporto pendenze congiunzione (assente / presente)')).toBe(2);
  });

  it('should_exclude_errors_from_rt_but_count_omissions_as_errors_in_accuracy', () => {
    const trials = [
      trial(conditionLabel('feature', true, 4), 400),
      trial(conditionLabel('feature', true, 4), null),
      trial(conditionLabel('feature', true, 4), 900, { correct: false }),
    ];
    expect(metric(trials, 'RT medio caratteristica')).toBe(400);
    expect(metric(trials, 'Accuratezza caratteristica')).toBe(33.3);
    expect(metric(trials, 'Errori di omissione')).toBe(1);
  });

  it('should_ignore_practice_and_interrupted_trials', () => {
    const trials = [
      trial(conditionLabel('feature', true, 4), 400, { phase: 'practice' }),
      trial(conditionLabel('feature', true, 4), null, { flag: 'INTERRUPTED' }),
      trial(conditionLabel('feature', true, 4), 500),
    ];
    expect(metric(trials, 'RT medio caratteristica')).toBe(500);
    expect(metric(trials, 'Accuratezza caratteristica')).toBe(100);
  });
});
