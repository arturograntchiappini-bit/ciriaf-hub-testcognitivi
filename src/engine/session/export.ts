/**
 * Export dei file di sessione: JSON completo e CSV combinato (una riga per trial
 * di qualsiasi test, con colonne di contesto fase/t/test).
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { CSV_SEPARATOR, csvField, trialCsvValues } from '../export';
import type { SessionRun } from './model';

const SESSION_CSV_HEADER = [
  'fase',
  't_offset_ms',
  'test',
  'indice_batteria',
  'run_id',
  'session_id',
  'trial_index',
  'fase_test',
  'condizione',
  'stimolo',
  'risposta',
  'corretto',
  'rt_ms',
  'flag_validazione',
  'timestamp_onset',
].join(CSV_SEPARATOR);

/** CSV combinato: una riga per trial di ogni test della sessione. */
export function toSessionCsv(run: SessionRun): string {
  const rows: string[] = [];
  for (const str of run.results) {
    for (const trial of str.result.trials) {
      const context = [str.phaseName, str.offsetMs, str.result.testId, str.indexInBattery, run.runId];
      rows.push([...context, ...trialCsvValues(trial)].map(csvField).join(CSV_SEPARATOR));
    }
  }
  return [SESSION_CSV_HEADER, ...rows].join('\r\n');
}

export interface SessionJsonExport {
  app: string;
  kind: 'session';
  runId: string;
  startedAt: string;
  exportedAt: string;
  userAgent: string;
  finished: boolean;
  template: SessionRun['template'];
  results: SessionRun['results'];
}

/** JSON completo della sessione (protocollo + tutti i risultati con contesto). */
export function toSessionJson(
  run: SessionRun,
  env: { exportedAt: string; userAgent: string } = {
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/d',
  },
): string {
  const payload: SessionJsonExport = {
    app: 'CIRIAF - COLAB/NEXTROOM COGNITIVE TESTING HUB',
    kind: 'session',
    runId: run.runId,
    startedAt: run.startedAtIso,
    exportedAt: env.exportedAt,
    userAgent: env.userAgent,
    finished: run.finished,
    template: run.template,
    results: run.results,
  };
  return JSON.stringify(payload, null, 2);
}

/** Nome file: `sessione_{runId}_{data-ora}.{ext}`. */
export function sessionFilename(run: SessionRun, ext: 'json' | 'csv'): string {
  const stamp = run.startedAtIso.replace(/[:.]/g, '-');
  const safe = run.runId.replace(/[^A-Za-z0-9-]/g, '');
  return `sessione_${safe}_${stamp}.${ext}`;
}
