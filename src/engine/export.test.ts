import { describe, it, expect } from 'vitest';
import { toCsv, toJson, exportFilename } from './export';
import type { TestResult, TrialResult } from './types';

function sampleResult(): TestResult {
  const trials: TrialResult[] = [
    {
      testId: 'stroop1',
      sessionId: 'ABCD-1430',
      trialIndex: 0,
      phase: 'practice',
      condition: 'congruent',
      stimulus: 'ROSSO/ROSSO',
      response: 'R',
      correct: true,
      rtMs: 512.4,
      flag: 'VALID',
      onsetTimestamp: 1000.6,
    },
    {
      testId: 'stroop1',
      sessionId: 'ABCD-1430',
      trialIndex: 1,
      phase: 'test',
      condition: 'incongruent',
      stimulus: 'ROSSO/BLU',
      response: null,
      correct: false,
      rtMs: null,
      flag: 'OMISSION',
      onsetTimestamp: 2000,
    },
  ];
  return {
    testId: 'stroop1',
    sessionId: 'ABCD-1430',
    startedAt: '2026-07-06T14:30:00.000Z',
    params: { nTrials: 48 },
    trials,
    summary: [{ label: 'Accuratezza', value: 95, unit: '%' }],
  };
}

describe('toCsv', () => {
  it('ha l’header corretto e una riga per trial', () => {
    const csv = toCsv(sampleResult());
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'test;session_id;trial_index;fase;condizione;stimolo;risposta;corretto;rt_ms;flag_validazione;timestamp_onset',
    );
    expect(lines).toHaveLength(3); // header + 2 trial
  });

  it('arrotonda RT e lascia vuoto per omissione', () => {
    const csv = toCsv(sampleResult());
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain(';512;'); // rt arrotondato
    expect(lines[2]).toContain(';;OMISSION;'); // rt vuoto per omissione
  });

  it('fa l’escaping dei campi con separatore', () => {
    const r = sampleResult();
    (r.trials[0] as TrialResult).stimulus = 'a;b';
    const csv = toCsv(r);
    expect(csv).toContain('"a;b"');
  });
});

describe('toJson', () => {
  it('è re-parsabile e contiene params, summary e trials', () => {
    const json = toJson(sampleResult(), { exportedAt: '2026-07-06T15:00:00.000Z', userAgent: 'test' });
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('Sintropia - Cognitive tests Hub');
    expect(parsed.params.nTrials).toBe(48);
    expect(parsed.summary).toHaveLength(1);
    expect(parsed.trials).toHaveLength(2);
    expect(parsed.userAgent).toBe('test');
  });
});

describe('exportFilename', () => {
  it('compone {test}_{session}_{stamp}.{ext}', () => {
    const name = exportFilename(sampleResult(), 'csv');
    expect(name).toBe('stroop1_ABCD-1430_2026-07-06T14-30-00-000Z.csv');
  });
});
