import { describe, it, expect } from 'vitest';
import { toSessionCsv, toSessionJson, toSessionSummaryCsv, sessionFilename } from './export';
import type { SessionRun } from './model';
import type { TestResult, TrialResult } from '../types';

function trial(testId: TestResult['testId'], overrides: Partial<TrialResult>): TrialResult {
  return {
    testId,
    sessionId: 'AB12-1000',
    trialIndex: 0,
    phase: 'test',
    condition: 'go',
    stimulus: 'go',
    response: 'space',
    correct: true,
    rtMs: 400,
    flag: 'VALID',
    onsetTimestamp: 0,
    ...overrides,
  };
}

function run(): SessionRun {
  const stroopResult: TestResult = {
    testId: 'stroop1',
    sessionId: 'AB12-1000',
    startedAt: '2026-07-07T10:00:00.000Z',
    params: { nTrials: 48 },
    trials: [trial('stroop1', { condition: 'congruent', stimulus: 'ROSSO/ROSSO', rtMs: 500 })],
    summary: [{ label: 'Accuratezza', value: 95, unit: '%' }],
  };
  const gonogoResult: TestResult = {
    testId: 'gonogo',
    sessionId: 'AB12-1000',
    startedAt: '2026-07-07T10:20:00.000Z',
    params: { nTrials: 80 },
    trials: [trial('gonogo', { condition: 'nogo', stimulus: 'nogo', rtMs: null, response: null, flag: 'VALID', correct: true })],
    summary: [],
  };
  return {
    runId: 'S-7K2Q-1000',
    template: { id: 't', name: 'Protocollo', createdAt: '2026-07-07T09:00:00.000Z', totalMs: 0, phases: [] },
    startedAtEpoch: 1,
    startedAtIso: '2026-07-07T10:00:00.000Z',
    completedPinIds: ['pin-a', 'pin-b'],
    finished: true,
    results: [
      {
        phaseId: 'p1',
        phaseName: 'Baseline',
        pinId: 'pin-a',
        offsetMs: 0,
        indexInBattery: 0,
        result: stroopResult,
      },
      {
        phaseId: 'p1',
        phaseName: 'Baseline',
        pinId: 'pin-b',
        offsetMs: 1200000,
        indexInBattery: 0,
        result: gonogoResult,
      },
    ],
  };
}

describe('toSessionCsv', () => {
  it('ha l’header con le colonne di contesto e una riga per trial', () => {
    const csv = toSessionCsv(run());
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'fase;t_offset_ms;test;indice_batteria;run_id;session_id;trial_index;fase_test;condizione;stimolo;risposta;corretto;rt_ms;flag_validazione;timestamp_onset',
    );
    expect(lines).toHaveLength(3); // header + 2 trial (uno per test)
    expect(lines[1]).toContain('Baseline;0;stroop1;0;S-7K2Q-1000;');
    expect(lines[2]).toContain('Baseline;1200000;gonogo;0;S-7K2Q-1000;');
  });
});

describe('toSessionJson', () => {
  it('è re-parsabile e contiene template e results con contesto', () => {
    const json = toSessionJson(run(), { exportedAt: '2026-07-07T11:00:00.000Z', userAgent: 'test' });
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe('session');
    expect(parsed.runId).toBe('S-7K2Q-1000');
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0].phaseName).toBe('Baseline');
    expect(parsed.results[1].result.testId).toBe('gonogo');
  });
});

describe('sessionFilename', () => {
  it('compone sessione_{runId}_{stamp}.{ext}', () => {
    expect(sessionFilename(run(), 'csv')).toBe('sessione_S-7K2Q-1000_2026-07-07T10-00-00-000Z.csv');
  });
});

describe('toSessionSummaryCsv', () => {
  it('should_write_one_row_per_metric_with_session_context', () => {
    const lines = toSessionSummaryCsv(run()).split('\r\n');
    expect(lines[0]).toBe('fase;t_offset_ms;test;indice_batteria;run_id;metrica;valore;unita');
    const metricCount = run().results.reduce((n, r) => n + r.result.summary.length, 0);
    expect(lines).toHaveLength(metricCount + 1);
  });
});
