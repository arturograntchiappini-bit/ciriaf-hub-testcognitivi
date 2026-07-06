/**
 * Schermata dei risultati: metriche da trascrivere, ID sessione, export CSV/JSON.
 * @see docs/architettura.md — sezione "Export dei dati"
 */
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { toCsv, toJson, exportFilename } from '../../engine/export';
import { triggerDownload } from '../download';
import { TEST_CATALOG } from '../router';
import type { TestResult } from '../../engine/types';

interface ResultsProps {
  result: TestResult;
  onHome: () => void;
}

export function Results({ result, onHome }: ResultsProps): JSX.Element {
  const meta = TEST_CATALOG.find((t) => t.id === result.testId);

  function downloadCsv(): void {
    triggerDownload(exportFilename(result, 'csv'), toCsv(result), 'text/csv');
  }
  function downloadJson(): void {
    triggerDownload(exportFilename(result, 'json'), toJson(result), 'application/json');
  }

  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-10">
        <p className="text-sm text-muted">Risultati</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{meta?.title ?? result.testId}</h1>

        <div className="mt-4 inline-flex items-center gap-2 rounded-card border border-accent bg-accent-soft px-4 py-2">
          <span className="text-sm text-muted">Codice sessione</span>
          <span className="font-mono text-base font-semibold text-ink">{result.sessionId}</span>
        </div>

        <div className="mt-8 overflow-hidden rounded-card border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent-soft text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Metrica</th>
                <th className="px-4 py-2 font-medium">Valore</th>
              </tr>
            </thead>
            <tbody>
              {result.summary.map((m, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-4 py-2 text-ink">{m.label}</td>
                  <td className="px-4 py-2 font-medium text-ink tabular-nums">
                    {m.value}
                    {m.unit ? ` ${m.unit}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={downloadCsv}>Scarica CSV</Button>
          <Button variant="secondary" onClick={downloadJson}>
            Scarica JSON
          </Button>
          <Button variant="ghost" onClick={onHome}>
            ← Torna alla home
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Il CSV contiene una riga per trial (pratica inclusa) con i flag di validazione. Il JSON
          include anche i parametri usati per questa sessione.
        </p>
      </main>
    </div>
  );
}
