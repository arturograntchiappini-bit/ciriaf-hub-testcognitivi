/**
 * Schermata dei risultati: metriche da trascrivere, ID sessione, export CSV/JSON.
 * @see docs/architettura.md — sezione "Export dei dati"
 */
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { PageHeading } from '../components/PageHeading';
import { toCsv, toJson, exportFilename } from '../../engine/export';
import { toEventsTsv, toHtmlReport, toSummaryCsv, toTrialsCsv, formatFilename } from '../../engine/exportFormats';
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

  const title = meta?.title ?? result.testId;
  const otherFormats = [
    { label: 'CSV internazionale', hint: 'virgola e punto decimale: R, Python, Excel inglese', run: () => triggerDownload(formatFilename(result, 'csv-intl'), toTrialsCsv(result, 'intl'), 'text/csv') },
    { label: 'Riepilogo metriche (CSV)', hint: 'una riga per metrica, per tabelle pivot e confronti tra sessioni', run: () => triggerDownload(formatFilename(result, 'summary-csv'), toSummaryCsv(result, 'it'), 'text/csv') },
    { label: 'Eventi TSV (stile BIDS)', hint: 'onset e tempi in secondi, colonne dei file _events.tsv', run: () => triggerDownload(formatFilename(result, 'events-tsv'), toEventsTsv(result), 'text/tab-separated-values') },
    { label: 'Report HTML', hint: 'pagina leggibile da aprire, stampare o salvare in PDF', run: () => triggerDownload(formatFilename(result, 'html'), toHtmlReport(result, title), 'text/html') },
  ];

  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-12">
        <PageHeading eyebrow="Risultati" title={meta?.title ?? result.testId} />

        <div className="mt-6 inline-flex items-center gap-3 border border-accent bg-accent-soft px-5 py-3">
          <span className="eyebrow">Codice sessione</span>
          <span className="font-mono text-base font-medium tracking-wider text-ink">{result.sessionId}</span>
        </div>

        <div className="panel mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="eyebrow px-5 py-3 font-normal">Metrica</th>
                <th className="eyebrow px-5 py-3 font-normal">Valore</th>
              </tr>
            </thead>
            <tbody>
              {result.summary.map((m, i) => (
                <tr key={i} className="border-t border-line first:border-t-0">
                  <td className="px-5 py-3 text-ink">{m.label}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-ink">
                    {m.value}
                    {m.unit ? <span className="text-muted"> {m.unit}</span> : ''}
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
        <section aria-labelledby="altri-formati" className="mt-10">
          <h2 id="altri-formati" className="eyebrow">Altri formati</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {otherFormats.map((f) => (
              <li key={f.label} className="panel flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="text-sm text-ink">{f.label}</div>
                  <div className="text-xs text-muted">{f.hint}</div>
                </div>
                <Button variant="secondary" onClick={f.run} aria-label={`Scarica ${f.label}`}>Scarica</Button>
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-5 max-w-2xl text-xs leading-relaxed text-muted">
          Il CSV contiene una riga per trial (pratica inclusa) con i flag di validazione. Il JSON include anche i
          parametri usati per questa sessione.
        </p>
      </main>
    </div>
  );
}
