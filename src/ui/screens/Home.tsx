import { Header } from '../components/Header';
import { TestCard } from '../components/TestCard';
import { TEST_CATALOG } from '../router';
import type { TestId } from '../../engine/types';

interface HomeProps {
  onSelectTest: (id: TestId) => void;
  onOpenSettings: () => void;
  onOpenSession: () => void;
}

/** Schermata iniziale: modalità Sessione + catalogo dei 6 test. */
export function Home({ onSelectTest, onOpenSettings, onOpenSession }: HomeProps): JSX.Element {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <Header onOpenSettings={onOpenSettings} />
      <main className="mx-auto w-full max-w-content flex-1 px-6 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Batteria di test cognitivi</h1>
          <span className="text-xs text-muted">Esecuzione anonima · dati esportabili</span>
        </div>

        {/* Modalità Sessione — banner snello */}
        <button
          onClick={onOpenSession}
          className="mt-4 flex w-full items-center justify-between rounded-card border border-accent bg-accent-soft px-5 py-3 text-left transition-colors hover:brightness-[0.98]"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden className="text-lg">🕒</span>
            <span>
              <span className="block text-sm font-semibold text-ink">Modalità Sessione</span>
              <span className="block text-xs text-muted">
                Protocollo cronometrico: fasi e pin "t" con batterie a orari prestabiliti.
              </span>
            </span>
          </span>
          <span className="text-sm font-medium text-accent">Apri →</span>
        </button>

        {/* Test singoli */}
        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-muted">Test singoli</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_CATALOG.map((meta) => (
            <TestCard key={meta.id} meta={meta} onSelect={() => onSelectTest(meta.id)} />
          ))}
        </div>
      </main>
      <footer className="mx-auto w-full max-w-content px-6 py-5 text-xs text-muted">
        CIRIAF — laboratorio COLAB/NEXTROOM · piattaforma di ricerca sperimentale
      </footer>
    </div>
  );
}
