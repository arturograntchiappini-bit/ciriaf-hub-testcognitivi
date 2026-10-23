import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaitScreen } from './WaitScreen';
import type { SessionState } from '../../engine/session/model';

function state(overrides: Partial<SessionState> = {}): SessionState {
  return {
    currentPhaseName: 'Baseline',
    currentPhaseId: 'p1',
    nextPin: { id: 'pin-a', offsetMs: 900000, battery: [] },
    upcomingTests: ['stroop1', 'nback'],
    countdownMs: 300000,
    positionIndex: 0,
    total: 3,
    due: false,
    done: false,
    ...overrides,
  };
}

describe('WaitScreen', () => {
  it('in attesa mostra il countdown e i test in arrivo', () => {
    render(<WaitScreen state={state()} elapsedMs={600000} totalMs={1800000} onStart={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText('Prossima batteria tra')).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument(); // 300000 ms
    expect(screen.getByText(/Stroop 1/)).toBeInTheDocument();
  });

  it('quando dovuta mostra l’alert e Inizia', () => {
    const onStart = vi.fn();
    render(
      <WaitScreen
        state={state({ due: true, countdownMs: 0 })}
        elapsedMs={900000}
        totalMs={1800000}
        onStart={onStart}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('È ora dei test')).toBeInTheDocument();
    screen.getByText('Inizia').click();
    expect(onStart).toHaveBeenCalledOnce();
  });
});
