import { describe, it, expect, vi } from 'vitest';
import { realScheduler, performanceClock } from './clock';

describe('performanceClock', () => {
  it('ritorna un numero monotono non decrescente', () => {
    const a = performanceClock.now();
    const b = performanceClock.now();
    expect(typeof a).toBe('number');
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe('realScheduler', () => {
  it('timeout esegue il callback', () => {
    vi.useFakeTimers();
    const sched = realScheduler();
    const cb = vi.fn();
    sched.timeout(500, cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('cancel impedisce l’esecuzione', () => {
    vi.useFakeTimers();
    const sched = realScheduler();
    const cb = vi.fn();
    const cancel = sched.timeout(500, cb);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
