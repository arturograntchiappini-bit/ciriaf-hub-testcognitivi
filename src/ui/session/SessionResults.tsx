/**
 * Risultati di sessione: panoramica per fase/t/test + download JSON e CSV.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { toSessionJson, toSessionCsv, sessionFilename } from '../../engine/session/export';
import { triggerDownload } from '../download';
import { TEST_CATALOG } from '../router';
import type { SessionRun } from '../../engine/session/model';

interface SessionResultsProps {
  run: SessionRun;
  partial?: boolean;
  onExit: () => void;
}

function fmtOffset(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

function testTitle(id: string): string {
  return TEST_CATALOG.find((t) => t.id === id)?.title ?? id;
}

export function SessionResults({ run, partial, onExit }: SessionResultsProps): JSX.Element {
  function downloadJson(): void {
    triggerDownload(sessionFilename(run, 'json'), toSessionJson(run), 'application/json');
  }
  function downloadCsv(): void {
    triggerDownload(sessionFilename(run, 'csv'), toSessionCsv(run), 'text/csv');
  }

  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-10">
        <p className="text-sm text-muted">{partial ? 'Sessione interrotta — dati parziali' : 'Sessione completata'}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{run.template.name}</h1>
        <div className="mt-4 inline-flex items-center gap-2 rounded-card border border-accent bg-accent-soft px-4 py-2">
          <span className="text-sm text-muted">Codice sessione</span>
          <span className="font-mono text-base font-semibold text-ink">{run.runId}</span>
        </div>

        <div className="mt-8 overflow-hidden rounded-card border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent-soft text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Fase</th>
                <th className="px-4 py-2 font-medium">t</th>
                <th className="px-4 py-2 font-medium">Test</th>
                <th className="px-4 py-2 font-medium">Prima metrica</th>
              </tr>
            </thead>
            <tbody>
              {run.results.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-muted" colSpan={4}>
                    Nessun test completato.
                  </td>
                </tr>
              ) : (
                run.results.map((r, i) => {
                  const first = r.result.summary[0];
                  return (
                    <tr key={i} className="border-t border-line">
                      <td className="px-4 py-2 text-ink">{r.phaseName}</td>
                      <td className="px-4 py-2 tabular-nums text-ink">{fmtOffset(r.offsetMs)}</td>
                      <td className="px-4 py-2 text-ink">{testTitle(r.result.testId)}</td>
                      <td className="px-4 py-2 text-ink">
                        {first ? `${first.label}: ${first.value}${first.unit ? ` ${first.unit}` : ''}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={downloadJson}>Scarica JSON di sessione</Button>
          <Button variant="secondary" onClick={downloadCsv}>
            Scarica CSV combinato
          </Button>
          <Button variant="ghost" onClick={onExit}>
            ← Torna al menu
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Il CSV combina tutti i trial della sessione con colonne di contesto fase / t / test. Il JSON
          contiene il protocollo usato e ogni risultato per esteso.
        </p>
      </main>
    </div>
  );
}
