/**
 * Export dei risultati in CSV (per Excel italiano, separatore ';') e JSON.
 * Il CSV è una riga per trial (pratica inclusa, marcata); il JSON include
 * parametri usati e metriche di sintesi per la riproducibilità.
 * @see docs/architettura.md — sezione "Export dei dati"
 */
import type { TestResult, TrialResult } from './types';

export const CSV_SEPARATOR = ';';

const CSV_HEADER = [
  'test',
  'session_id',
  'trial_index',
  'fase',
  'condizione',
  'stimolo',
  'risposta',
  'corretto',
  'rt_ms',
  'flag_validazione',
  'timestamp_onset',
].join(CSV_SEPARATOR);

/** Inizio di cella che un foglio di calcolo interpreta come formula (OWASP «CSV injection»). */
const FORMULA_START = /^[=+@\t\r]|^-(?![0-9.]+$)/;

/**
 * Mette tra virgolette e raddoppia le virgolette se il campo contiene separatore/newline/virgolette.
 * Le stringhe che iniziano come una formula (`=`, `+`, `@`, `-x`) ricevono un apice iniziale: i numeri restano intatti.
 */
export function csvField(value: string | number | boolean | null, separator: string = CSV_SEPARATOR): string {
  if (value === null) return '';
  let s = String(value);
  if (typeof value === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  if (s.includes(separator) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Colonne di un trial SENZA il testId (che nell'export di sessione è una colonna
 * di contesto). Ordine: session_id, trial_index, fase, condizione, stimolo,
 * risposta, corretto, rt_ms, flag_validazione, timestamp_onset.
 */
export function trialCsvValues(t: TrialResult): (string | number | null)[] {
  return [
    t.sessionId,
    t.trialIndex,
    t.phase,
    t.condition,
    t.stimulus,
    t.response,
    t.correct ? 1 : 0,
    t.rtMs === null ? '' : Math.round(t.rtMs),
    t.flag,
    Math.round(t.onsetTimestamp),
  ];
}

function trialToCsvRow(t: TrialResult): string {
  return [t.testId, ...trialCsvValues(t)].map((v) => csvField(v)).join(CSV_SEPARATOR);
}

/** Serializza un risultato in CSV con header fisso. */
export function toCsv(result: TestResult): string {
  const rows = result.trials.map(trialToCsvRow);
  return [CSV_HEADER, ...rows].join('\r\n');
}

/** Metadati d'ambiente inclusi nel JSON per tracciabilità. */
export interface JsonExport {
  app: string;
  testId: string;
  sessionId: string;
  startedAt: string;
  exportedAt: string;
  userAgent: string;
  params: Record<string, unknown>;
  summary: TestResult['summary'];
  trials: TrialResult[];
}

/** Serializza un risultato in JSON (indentato) con metadati. */
export function toJson(
  result: TestResult,
  env: { exportedAt: string; userAgent: string } = {
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/d',
  },
): string {
  const payload: JsonExport = {
    app: 'Sintropia - Cognitive tests Hub',
    testId: result.testId,
    sessionId: result.sessionId,
    startedAt: result.startedAt,
    exportedAt: env.exportedAt,
    userAgent: env.userAgent,
    params: result.params,
    summary: result.summary,
    trials: result.trials,
  };
  return JSON.stringify(payload, null, 2);
}

/** Nome file: `{test}_{sessionId}_{ISO-sanificata}.{ext}`. */
export function exportFilename(result: TestResult, ext: 'csv' | 'json'): string {
  const stamp = result.startedAt.replace(/[:.]/g, '-');
  const safeSession = result.sessionId.replace(/[^A-Za-z0-9-]/g, '');
  return `${result.testId}_${safeSession}_${stamp}.${ext}`;
}
