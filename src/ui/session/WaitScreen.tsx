/**
 * Schermata di attesa tra i pin: fase corrente, avanzamento, countdown alla
 * prossima batteria e test in arrivo. Allo scadere mostra l'alert e "Inizia".
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { Button } from '../components/Button';
import { TEST_CATALOG } from '../router';
import type { SessionState } from '../../engine/session/model';

interface WaitScreenProps {
  state: SessionState;
  elapsedMs: number;
  totalMs: number;
  onStart: () => void;
  onExit: () => void;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function testTitle(id: string): string {
  return TEST_CATALOG.find((t) => t.id === id)?.title ?? id;
}

export function WaitScreen({ state, elapsedMs, totalMs, onStart, onExit }: WaitScreenProps): JSX.Element {
  const upcoming = state.upcomingTests.map(testTitle).join(' → ');

  return (
    <div className="fixed inset-0 flex flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-line px-6 py-3 text-sm">
        <span className="text-muted">
          Fase: <span className="font-medium text-ink">{state.currentPhaseName}</span>
        </span>
        <span className="tabular-nums text-muted">
          Sessione {fmt(elapsedMs)} / {fmt(totalMs)} · batteria {Math.min(state.positionIndex + 1, state.total)} di{' '}
          {state.total}
        </span>
        <button onClick={onExit} className="text-xs text-muted hover:text-ink">
          Esci
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {state.due ? (
          <div className="text-center">
            <div className="text-2xl font-semibold text-accent">⏰ È ora dei test</div>
            <p className="mt-3 text-muted">Batteria in arrivo:</p>
            <p className="mt-1 text-lg font-medium text-ink">{upcoming}</p>
            <div className="mt-8">
              <Button onClick={onStart}>Inizia</Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm uppercase tracking-wide text-muted">Prossima batteria tra</p>
            <div className="mt-2 text-6xl font-bold tabular-nums text-ink">{fmt(state.countdownMs)}</div>
            <p className="mt-6 text-muted">In arrivo:</p>
            <p className="mt-1 text-base font-medium text-ink">{upcoming}</p>
            <p className="mt-8 max-w-md text-xs text-muted">
              Puoi allontanarti: un avviso sonoro ti richiamerà quando è il momento dei test.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
