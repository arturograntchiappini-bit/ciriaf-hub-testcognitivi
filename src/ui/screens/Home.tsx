import { Header } from '../components/Header';
import { TestCard } from '../components/TestCard';
import { InteractiveHero } from '../components/InteractiveHero';
import { TEST_CATALOG } from '../router';
import type { TestId } from '../../engine/types';

interface HomeProps {
  onSelectTest: (id: TestId) => void;
  onOpenSettings: () => void;
  onOpenSession: () => void;
}

/** Schermata iniziale: hero interattivo + catalogo dei 6 test. */
export function Home({ onSelectTest, onOpenSettings, onOpenSession }: HomeProps): JSX.Element {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      {/* Hero section */}
      <section className="relative">
        <Header onOpenSettings={onOpenSettings} transparent />
        <InteractiveHero />
      </section>

      <main className="mx-auto w-full max-w-content flex-1 px-6 py-8">
        {/* Modalità Sessione */}
        <button
          onClick={onOpenSession}
          className="group flex w-full items-center justify-between rounded-card border border-accent bg-accent-soft px-5 py-4 text-left transition-all duration-200 hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-lg">🕒</span>
            <span>
              <span className="block text-sm font-semibold text-ink">Modalità Sessione</span>
              <span className="block text-xs text-muted">
                Protocollo cronometrico: fasi e pin "t" con batterie a orari prestabiliti.
              </span>
            </span>
          </span>
          <span className="text-sm font-medium text-accent transition-all duration-200 group-hover:translate-x-0.5">
            Apri →
          </span>
        </button>

        {/* Test singoli */}
        <p className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wide text-muted">Test singoli</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_CATALOG.map((meta) => (
            <TestCard key={meta.id} meta={meta} onSelect={() => onSelectTest(meta.id)} />
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-content px-6 py-6 text-xs text-muted">
        CIRIAF — laboratorio COLAB/NEXTROOM · piattaforma di ricerca sperimentale
      </footer>
    </div>
  );
}
