import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RtTestRunner, type RtTestPlan } from './RtTestRunner';

const trial = { condition: 'go', stimulusLabel: 'go' };

function makePlan(): RtTestPlan {
  return {
    testId: 'gonogo',
    sessionId: 'TEST-0000',
    params: {},
    practiceTrials: [trial, trial],
    testTrials: [trial, trial],
    timing: { fixationMs: 0, stimulusVisibleMs: 800, responseWindowMs: 800, isiMs: 500, endOnResponse: false, practiceFeedbackMs: 0 },
    responseKeys: [' '],
    expectsResponse: () => true,
    evaluate: (_t, key) => key !== null,
    renderStimulus: () => <span>stimolo</span>,
    statusHint: 'hint',
    score: () => [],
  };
}

const renderRunner = (): ReturnType<typeof render> =>
  render(<RtTestRunner plan={makePlan()} startedAt="2026-01-01T00:00:00Z" onComplete={vi.fn()} onAbort={vi.fn()} />);

describe('RtTestRunner', () => {
  it('should_resume_into_practice_when_paused_during_practice', () => {
    renderRunner();
    expect(screen.getByText(/Pratica · trial/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: /in pausa/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Riprendi/ }));
    expect(screen.getByText(/Pratica · trial/)).toBeInTheDocument();
    expect(screen.queryByText(/^Test · trial/)).not.toBeInTheDocument();
  });

  it('should_focus_the_resume_button_when_paused', () => {
    renderRunner();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /Riprendi/ })).toHaveFocus();
  });

  it('should_remove_the_visibilitychange_listener_on_unmount', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderRunner();
    const added = add.mock.calls.filter(([type]) => type === 'visibilitychange').map(([, fn]) => fn);
    unmount();
    const removed = remove.mock.calls.filter(([type]) => type === 'visibilitychange').map(([, fn]) => fn);
    expect(added.length).toBeGreaterThan(0);
    for (const fn of added) expect(removed).toContain(fn);
    add.mockRestore();
    remove.mockRestore();
  });
});
