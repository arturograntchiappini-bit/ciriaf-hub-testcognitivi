import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';
import { generateTrail, scoreTrailMaking, trailLabels, TrailRun } from './trailMaking';

const metric = (trials: TrialResult[], label: string, n = 3): string | number | undefined =>
  scoreTrailMaking(trials, n).find((m) => m.label === label)?.value;

describe('trailLabels', () => {
  it('should_count_numbers_in_part_a', () => {
    expect(trailLabels('A', 5)).toEqual(['1', '2', '3', '4', '5']);
  });
  it('should_alternate_numbers_and_letters_in_part_b', () => {
    expect(trailLabels('B', 7)).toEqual(['1', 'A', '2', 'B', '3', 'C', '4']);
  });
  it('should_use_13_numbers_and_12_letters_with_25_targets', () => {
    const labels = trailLabels('B', 25);
    expect(labels.filter((l) => /\d/.test(l))).toHaveLength(13);
    expect(labels.filter((l) => /[A-Z]/.test(l))).toHaveLength(12);
    expect(labels[24]).toBe('13');
  });
});

describe('generateTrail', () => {
  it('should_place_all_circles_apart_and_inside_the_field', () => {
    for (const seed of [1, 2, 3, 42]) {
      const circles = generateTrail('A', 25, mulberry32(seed));
      expect(circles).toHaveLength(25);
      circles.forEach((a, i) => {
        expect(a.x).toBeGreaterThan(0);
        expect(a.x).toBeLessThan(1);
        expect(a.y).toBeGreaterThan(0);
        expect(a.y).toBeLessThan(1);
        for (const b of circles.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.1);
      });
    }
  });
  it('should_keep_labels_in_connection_order', () => {
    expect(generateTrail('B', 6, mulberry32(3)).map((c) => c.label)).toEqual(trailLabels('B', 6));
  });
  it('should_be_deterministic_for_the_same_seed', () => {
    expect(generateTrail('A', 25, mulberry32(9))).toEqual(generateTrail('A', 25, mulberry32(9)));
  });
  it('should_still_place_every_circle_when_the_field_is_crowded', () => {
    expect(generateTrail('A', 51, mulberry32(5))).toHaveLength(51);
  });
});

describe('TrailRun', () => {
  const circles = generateTrail('A', 3, mulberry32(1));
  const run = (): TrailRun => new TrailRun(circles, 'A', 'test', 'T-0', 1000);

  it('should_advance_on_the_correct_circle_and_record_the_interval', () => {
    const r = run();
    const first = r.click(0, 1500);
    expect(first).toMatchObject({ correct: true, rtMs: 500, onsetTimestamp: 1000, stimulus: '1', response: '1' });
    expect(r.target).toBe('2');
  });

  it('should_not_advance_on_a_wrong_circle_and_keep_the_clock_running', () => {
    const r = run();
    const wrong = r.click(2, 1200);
    expect(wrong).toMatchObject({ correct: false, stimulus: '1', response: '3' });
    expect(r.target).toBe('1');
    expect(r.click(0, 1900)?.rtMs).toBe(700);
  });

  it('should_finish_after_the_last_correct_click_and_ignore_later_clicks', () => {
    const r = run();
    r.click(0, 1100);
    r.click(1, 1200);
    r.click(2, 1300);
    expect(r.done).toBe(true);
    expect(r.target).toBeNull();
    expect(r.click(0, 1400)).toBeNull();
  });

  it('should_ignore_clicks_outside_the_circles', () => {
    expect(run().click(99, 1100)).toBeNull();
  });

  it('should_number_clicks_consecutively', () => {
    const r = run();
    expect([r.click(2, 1100)?.trialIndex, r.click(0, 1200)?.trialIndex]).toEqual([0, 1]);
  });
});

describe('scoreTrailMaking', () => {
  const playPart = (part: 'A' | 'B', intervals: number[], wrongAt: number[] = []): TrialResult[] => {
    const circles = generateTrail(part, 3, mulberry32(2));
    const run = new TrailRun(circles, part, 'test', 'T-0', 0);
    const out: TrialResult[] = [];
    let now = 0;
    intervals.forEach((ms, i) => {
      now += ms;
      const click = wrongAt.includes(i) ? (circles.findIndex((c) => c.label !== run.target)) : circles.findIndex((c) => c.label === run.target);
      out.push(run.click(click, now) as TrialResult);
    });
    return out;
  };

  it('should_report_times_difference_and_ratio_in_seconds', () => {
    const trials = [...playPart('A', [1000, 1000, 1000]), ...playPart('B', [2000, 2000, 2000])];
    expect(metric(trials, 'Tempo parte A')).toBe(3);
    expect(metric(trials, 'Tempo parte B')).toBe(6);
    expect(metric(trials, 'Differenza B − A')).toBe(3);
    expect(metric(trials, 'Rapporto B / A')).toBe(2);
  });

  it('should_count_errors_and_include_their_time_in_the_part_time', () => {
    const trials = playPart('A', [1000, 500, 1000, 1000], [1]);
    expect(metric(trials, 'Errori parte A')).toBe(1);
    expect(metric(trials, 'Tempo parte A')).toBe(3.5);
  });

  it('should_report_dashes_for_a_part_that_was_not_completed', () => {
    const trials = playPart('A', [1000, 1000]);
    expect(metric(trials, 'Tempo parte A')).toBe('—');
    expect(metric(trials, 'Differenza B − A')).toBe('—');
    expect(metric(trials, 'Rapporto B / A')).toBe('—');
  });

  it('should_ignore_practice_clicks', () => {
    const practice = playPart('A', [1000, 1000, 1000]).map((t) => ({ ...t, phase: 'practice' as const }));
    expect(metric(practice, 'Errori parte A')).toBe(0);
    expect(metric(practice, 'Tempo parte A')).toBe('—');
  });

  it('should_handle_no_trials', () => {
    expect(metric([], 'Tempo medio per collegamento A')).toBe('—');
    expect(metric([], 'Errori parte B')).toBe(0);
  });
});
