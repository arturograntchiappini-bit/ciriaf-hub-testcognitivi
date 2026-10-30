/**
 * Formati di export aggiuntivi: CSV internazionale (virgola), riepilogo delle metriche,
 * eventi TSV in stile BIDS e report HTML stampabile.
 * @see docs/architettura.md — sezione "Export dei dati"
 */
import { csvField, trialCsvValues } from './export';
import type { SummaryMetric, TestResult, TrialResult } from './types';

/** `it`: separatore ';' e virgola decimale (Excel italiano). `intl`: separatore ',' e punto decimale (R, Python, Excel inglese). */
export type CsvLocale = 'it' | 'intl';

const LOCALE_SEPARATOR: Record<CsvLocale, string> = { it: ';', intl: ',' };

const TRIAL_HEADER = [
  'test', 'session_id', 'trial_index', 'fase', 'condizione', 'stimolo', 'risposta', 'corretto', 'rt_ms', 'flag_validazione', 'timestamp_onset',
];

/** Una riga per trial, con il separatore del locale. */
export function toTrialsCsv(result: TestResult, locale: CsvLocale): string {
  const sep = LOCALE_SEPARATOR[locale];
  const rows = result.trials.map((t) => [t.testId, ...trialCsvValues(t)].map((v) => csvField(v, sep)).join(sep));
  return [TRIAL_HEADER.join(sep), ...rows].join('\r\n');
}

function formatNumber(value: string | number, locale: CsvLocale): string | number {
  return typeof value === 'number' && locale === 'it' ? String(value).replace('.', ',') : value;
}

/** Riepilogo in formato lungo (tidy): una riga per metrica, pronto per tabelle pivot o per unire più sessioni. */
export function toSummaryCsv(result: TestResult, locale: CsvLocale): string {
  const sep = LOCALE_SEPARATOR[locale];
  const header = ['test', 'session_id', 'metrica', 'valore', 'unita'].join(sep);
  const rows = result.summary.map((m: SummaryMetric) =>
    [result.testId, result.sessionId, m.label, formatNumber(m.value, locale), m.unit ?? ''].map((v) => csvField(v, sep)).join(sep),
  );
  return [header, ...rows].join('\r\n');
}

const NOT_AVAILABLE = 'n/a';
const EVENTS_HEADER = ['onset', 'duration', 'trial_type', 'response_time', 'response', 'correct', 'stimulus', 'phase', 'validation_flag'];

const tsvCell = (value: string | number | null): string => (value === null || value === '' ? NOT_AVAILABLE : String(value).replace(/[\t\r\n]+/g, ' '));
const seconds = (ms: number): number => Math.round(ms) / 1000;

/**
 * Eventi in TSV con le colonne della specifica BIDS per i file `_events.tsv` (onset, duration, trial_type,
 * response_time, in secondi; valori mancanti `n/a`). L'onset è relativo al primo trial. La durata dello
 * stimolo non è registrata per trial, quindi `n/a`. Non è un dataset BIDS completo: mancano i file di metadati.
 */
export function toEventsTsv(result: TestResult): string {
  const origin = result.trials.reduce((min, t) => Math.min(min, t.onsetTimestamp), Infinity);
  const rows = result.trials.map((t: TrialResult) =>
    [
      seconds(t.onsetTimestamp - origin),
      NOT_AVAILABLE,
      t.condition,
      t.rtMs === null ? null : seconds(t.rtMs),
      t.response,
      t.correct ? 1 : 0,
      t.stimulus,
      t.phase,
      t.flag,
    ].map(tsvCell).join('\t'),
  );
  return [EVENTS_HEADER.join('\t'), ...rows].join('\n');
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] as string);

function htmlRows(pairs: readonly (readonly [string, string])[]): string {
  return pairs.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
}

/** Report HTML autonomo (nessuno script, stile in linea): si apre nel browser e si stampa o salva in PDF. */
export function toHtmlReport(result: TestResult, title: string, exportedAt: string = new Date().toISOString()): string {
  const metrics = result.summary.map((m) => [m.label, `${m.value}${m.unit ? ` ${m.unit}` : ''}`] as const);
  const params = Object.entries(result.params).map(([k, v]) => [k, String(v)] as const);
  const testTrials = result.trials.filter((t) => t.phase === 'test').length;
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — ${escapeHtml(result.sessionId)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}h1{font-size:1.6rem;margin:.2rem 0}h2{font-size:1rem;margin:2rem 0 .5rem;text-transform:uppercase;letter-spacing:.08em;color:#444}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #ddd}th{font-weight:500;width:60%}td{font-variant-numeric:tabular-nums}.meta{color:#555;font-size:.85rem}@media print{body{margin:0}}</style></head>
<body><p class="meta">Sintropia — Cognitive tests Hub</p><h1>${escapeHtml(title)}</h1>
<p class="meta">Codice sessione ${escapeHtml(result.sessionId)} · avviata il ${escapeHtml(result.startedAt)} · esportata il ${escapeHtml(exportedAt)} · ${testTrials} trial di test</p>
<h2>Metriche</h2><table>${htmlRows(metrics)}</table>
<h2>Parametri usati</h2><table>${htmlRows(params)}</table>
<p class="meta">I trial singoli, con i flag di validazione, sono nel CSV o nel JSON della stessa sessione.</p></body></html>`;
}

export type ExportFormat = 'csv-it' | 'csv-intl' | 'summary-csv' | 'events-tsv' | 'json' | 'html';

/** Nome file con estensione coerente col formato. */
export function formatFilename(result: TestResult, format: ExportFormat): string {
  const stamp = result.startedAt.replace(/[:.]/g, '-');
  const session = result.sessionId.replace(/[^A-Za-z0-9-]/g, '');
  const suffix: Record<ExportFormat, string> = {
    'csv-it': '.csv', 'csv-intl': '_intl.csv', 'summary-csv': '_riepilogo.csv', 'events-tsv': '_events.tsv', json: '.json', html: '_report.html',
  };
  return `${result.testId}_${session}_${stamp}${suffix[format]}`;
}
