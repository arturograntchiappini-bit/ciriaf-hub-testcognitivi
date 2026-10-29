import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CorsiView } from './CorsiView';
import { WcstView } from './WcstView';
import { TrailMakingView } from './TrailMakingView';
import { DEFAULTS } from '../../config/defaults';

const common = { sessionId: 'TEST-0000', startedAt: '2026-07-06T10:00:00.000Z', seed: 1, onAbort: () => {} };

afterEach(() => vi.useRealTimers());

describe('ciclo di vita delle viste', () => {
  it('should_not_complete_wcst_after_unmount_when_feedback_timer_is_pending', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const { unmount } = render(<WcstView params={{ ...DEFAULTS.wcst, maxCategories: 0 }} onComplete={onComplete} {...common} />);
    fireEvent.click(screen.getAllByRole('button')[0] as HTMLElement);
    unmount();
    act(() => void vi.advanceTimersByTime(2000));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should_leave_no_pending_timers_after_corsi_unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<CorsiView params={DEFAULTS.corsi} onComplete={() => {}} {...common} />);
    fireEvent.click(screen.getByText('Inizia la pratica'));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should_label_wcst_cards_in_italian', () => {
    render(<WcstView params={DEFAULTS.wcst} onComplete={() => {}} {...common} />);
    expect(screen.getAllByRole('button', { name: /(triangoli|stelle|croci|cerchi) (rosso|verde|giallo|blu)/ })).toHaveLength(4);
  });

  describe('Trail Making', () => {
    const params = { nTargets: 8, practiceTargets: 0 };
    const start = async (): Promise<ReturnType<typeof userEvent.setup>> => {
      const user = userEvent.setup();
      render(<TrailMakingView params={params} practice={false} onComplete={() => {}} {...common} />);
      await user.click(screen.getByRole('button', { name: 'Inizia' }));
      return user;
    };

    it('should_accept_keyboard_activation_of_the_next_circle', async () => {
      const user = await start();
      screen.getByRole('button', { name: 'Cerchio 1' }).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByText(/1\/8/)).toBeInTheDocument();
    });

    it('should_ignore_secondary_mouse_buttons', async () => {
      await start();
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Cerchio 1' }), { button: 2 });
      expect(screen.getByText(/0\/8/)).toBeInTheDocument();
    });
  });
});
