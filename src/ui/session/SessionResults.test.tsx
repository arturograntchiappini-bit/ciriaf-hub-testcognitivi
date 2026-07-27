import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionResults } from './SessionResults';
import type { SessionRun } from '../../engine/session/model';
import type { TestResult } from '../../engine/types';

function result(testId: TestResult['testId']): TestResult {
  return {
    testId,
    sessionId: 'S-AAAA-1000',
    startedAt: '2026-07-07T10:00:00.000Z',
    params: {},
    trials: [],
    summary: [{ label: 'Accuratezza', value: 92, unit: '%' }],
  };
}

function run(): SessionRun {
  return {
    runId: 'S-AAAA-1000',
    template: { id: 't', name: 'Protocollo affaticamento', createdAt: '', phases: [] },
    startedAtEpoch: 1,
    startedAtIso: '2026-07-07T10:00:00.000Z',
    completedPinIds: ['pin-a'],
    finished: true,
    results: [
      { phaseId: 'p1', phaseName: 'Baseline', pinId: 'pin-a', offsetMs: 0, indexInBattery: 0, result: result('stroop1') },
    ],
  };
}

describe('SessionResults', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('mostra nome, codice e la riga di risultato', () => {
    render(<SessionResults run={run()} onExit={vi.fn()} />);
    expect(screen.getByText('Protocollo affaticamento')).toBeInTheDocument();
    expect(screen.getByText('S-AAAA-1000')).toBeInTheDocument();
    expect(screen.getByText('Baseline')).toBeInTheDocument();
    expect(screen.getByText(/Accuratezza: 92/)).toBeInTheDocument();
  });

  it('scarica il JSON di sessione', () => {
    render(<SessionResults run={run()} onExit={vi.fn()} />);
    screen.getByText('Scarica JSON di sessione').click();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledOnce();
  });
});
