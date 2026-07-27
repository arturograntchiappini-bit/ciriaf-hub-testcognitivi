import { Header } from '../components/Header';
import { TestCard } from '../components/TestCard';
import { Button } from '../components/Button';
import { TEST_CATALOG } from '../router';
import type { TestId } from '../../engine/types';

interface HomeProps {
  onSelectTest: (id: TestId) => void;
  onOpenSettings: () => void;
  onOpenSession: () => void;
}

/** Schermata iniziale: catalogo dei 6 test + modalità Sessione. */
export function Home({ onSelectTest, onOpenSettings, onOpenSession }: HomeProps): JSX.Element {
  return (
    <div className="min-h-full bg-paper">
      <Header onOpenSettings={onOpenSettings} />
      <main className="mx-auto max-w-content px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Batteria di test cognitivi</h1>
            <p className="mt-2 max-w-2xl text-muted">
              Seleziona il test indicato dallo sperimentatore. Ogni prova è anonima: al termine potrai
              trascrivere i risultati a schermo ed esportare i dati grezzi.
            </p>
          </div>
          <div className="rounded-card border border-accent bg-accent-soft px-5 py-4">
            <p className="text-sm font-semibold text-ink">Modalità Sessione</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Protocollo cronometrico: fasi e pin "t" con batterie di test a orari prestabiliti.
            </p>
            <div className="mt-3">
              <Button onClick={onOpenSession}>Apri Sessione →</Button>
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_CATALOG.map((meta) => (
            <TestCard key={meta.id} meta={meta} onSelect={() => onSelectTest(meta.id)} />
          ))}
        </div>
      </main>
      <footer className="mx-auto max-w-content px-6 py-8 text-xs text-muted">
        CIRIAF — laboratorio COLAB/NEXTROOM · piattaforma di ricerca sperimentale
      </footer>
    </div>
  );
}
