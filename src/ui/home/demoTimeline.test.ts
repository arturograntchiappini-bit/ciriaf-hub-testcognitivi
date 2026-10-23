import { describe, it, expect } from 'vitest';
import {
  DEMO_LOOP_SECONDS,
  DEMO_MINUTES_PER_SECOND,
  DEMO_PINS,
  demoFrameAt,
  formatClock,
  phaseAtMinute,
  staticDemoFrame,
} from './demoTimeline';

describe('demoTimeline', () => {
  it('should_start_in_the_baseline_waiting_for_the_first_pin', () => {
    const frame = demoFrameAt(0);
    expect(frame).toMatchObject({ stage: 'wait', phaseName: 'Baseline', pinIndex: 0, completedPins: 0 });
    expect(frame.countdownSeconds).toBe(DEMO_PINS[0]!.minute * 60);
  });

  it('should_count_down_toward_the_next_pin_as_time_advances', () => {
    const early = demoFrameAt(1);
    const later = demoFrameAt(2);
    expect(later.countdownSeconds).toBeLessThan(early.countdownSeconds);
  });

  it('should_alert_then_run_the_test_when_a_pin_is_reached', () => {
    const arrival = DEMO_PINS[1]!.minute / DEMO_MINUTES_PER_SECOND + 2.2 + 2.4;
    expect(demoFrameAt(arrival + 0.5)).toMatchObject({ stage: 'due', pinIndex: 1, minute: DEMO_PINS[1]!.minute });
    expect(demoFrameAt(arrival + 3)).toMatchObject({ stage: 'test', pinIndex: 1 });
  });

  it('should_end_the_session_and_then_loop_back_to_the_start', () => {
    expect(demoFrameAt(DEMO_LOOP_SECONDS - 0.1).stage).toBe('done');
    expect(demoFrameAt(DEMO_LOOP_SECONDS + 0.1).stage).toBe('wait');
  });

  it('should_map_each_minute_to_its_phase', () => {
    expect(phaseAtMinute(5).name).toBe('Baseline');
    expect(phaseAtMinute(30).name).toBe('Esposizione');
    expect(phaseAtMinute(59).name).toBe('Recupero');
  });

  it('should_show_the_first_alert_as_the_reduced_motion_frame', () => {
    expect(staticDemoFrame().stage).toBe('due');
  });

  it('should_format_clocks_as_minutes_and_seconds', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(605)).toBe('10:05');
  });
});
