/**
 * Punto d'ingresso dell'interfaccia. La shell completa (router, schermate) viene
 * costruita nella Fase 4 del piano; questo è il guscio iniziale.
 */
export function App(): JSX.Element {
  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content items-center px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-ink">
            CIRIAF — COLAB/NEXTROOM COGNITIVE TESTING HUB
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-content px-6 py-10">
        <p className="text-muted">Inizializzazione della piattaforma…</p>
      </main>
    </div>
  );
}
