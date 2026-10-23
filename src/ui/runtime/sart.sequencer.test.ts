import { describe, it, expect } from 'vitest';
import { createSequencer, type SequencerState, type TrialSpec } from './sequencer';
import { FakeEnv } from './fakeEnv';
import { scoreSart } from '../../engine/tests/sart';
import type { TrialResult } from '../../engine/types';

const DIGIT_MS = 250;
const MASK_MS = 900;
const spec = (digit: number, target = 3): TrialSpec => ({ condition: digit === target ? 'nogo' : 'go', stimulusLabel: String(digit), isiMs: 0 });

/** Esegue i trial SART con il sequencer vero; `presses` dice a che ms dall'onset si preme (null = mai). */
function run(trials: TrialSpec[], presses: (number | null)[]): { results: TrialResult[]; phases: SequencerState['phase'][] } {
  const env = new FakeEnv();
  const results: TrialResult[] = [];
  const phases: SequencerState['phase'][] = [];
  const seq = createSequencer({
    testId: 'sart',
    sessionId: 'S-0000',
    phase: 'test',
    trials,
    fixationMs: 0,
    stimulusVisibleMs: DIGIT_MS,
    responseWindowMs: DIGIT_MS + MASK_MS,
    isiMs: 0,
    endOnResponse: false,
    feedbackMs: 0,
    responseKeys: [' '],
    expectsResponse: (t) => t.condition === 'go',
    evaluate: (t, key) => (t.condition === 'go' ? key !== null : key === null),
    clock: env.clock,
    scheduler: env.scheduler,
    onState: (s) => phases.push(s.phase),
    onTrialResult: (r) => results.push(r),
    onDone: () => {},
  });
  seq.start();
  presses.forEach((at) => {
    if (at !== null) {
      env.advance(at);
      seq.handleKey(' ', env.time);
    }
    env.advance(DIGIT_MS + MASK_MS - (at ?? 0));
  });
  return { results, phases };
}

describe('SART con il sequencer vero', () => {
  it('should_count_a_withheld_target_as_correct_and_not_as_commission', () => {
    const { results } = run([spec(5), spec(3), spec(7)], [400, null, 380]);
    const metric = (label: string): string | number | undefined => scoreSart(results).find((m) => m.label.startsWith(label))?.value;
    expect(results.map((r) => r.flag)).toEqual(['VALID', 'VALID', 'VALID']);
    expect(metric('Errori di commissione')).toBe(0);
    expect(metric('Errori di omissione')).toBe(0);
    expect(metric('RT medio Go')).toBe(390);
  });

  it('should_record_a_press_during_the_mask_as_a_response_with_rt_from_digit_onset', () => {
    const { results, phases } = run([spec(5)], [600]);
    expect(phases).toContain('blank');
    expect(results[0]?.rtMs).toBe(600);
  });

  it('should_flag_a_press_on_the_target_as_commission_and_a_missing_press_on_a_go_as_omission', () => {
    const { results } = run([spec(3), spec(5)], [350, null]);
    const metric = (label: string): string | number | undefined => scoreSart(results).find((m) => m.label.startsWith(label))?.value;
    expect(metric('Errori di commissione')).toBe(1);
    expect(metric('Errori di omissione')).toBe(1);
  });

  it('should_run_digits_back_to_back_without_a_gap', () => {
    const { results } = run([spec(1), spec(2), spec(4)], [null, null, null]);
    expect(results).toHaveLength(3);
    expect(results[1]!.onsetTimestamp - results[0]!.onsetTimestamp).toBe(DIGIT_MS + MASK_MS);
  });
});
