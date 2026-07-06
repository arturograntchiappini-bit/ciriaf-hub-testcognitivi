import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Results } from './Results';
import type { TestResult } from '../../engine/types';

const result: TestResult = {
  testId: 'gonogo',
  sessionId: 'AB12-1030',
  startedAt: '2026-07-06T10:30:00.000Z',
  params: { nTrials: 80 },
  trials: [
    {
      testId: 'gonogo',
      sessionId: 'AB12-1030',
      trialIndex: 0,
      phase: 'test',
      condition: 'go',
      stimulus: 'go',
      response: 'space',
      correct: true,
      rtMs: 420,
      flag: 'VALID',
      onsetTimestamp: 0,
    },
  ],
  summary: [
    { label: 'Errori di commissione (No-Go)', value: 2 },
    { label: 'RT medio Go corretti', value: 415, unit: 'ms' },
  ],
};

describe('Results', () => {
  beforeEach(() => {
    // jsdom non implementa createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('mostra ID sessione e metriche', () => {
    render(<Results result={result} onHome={() => {}} />);
    expect(screen.getByText('AB12-1030')).toBeInTheDocument();
    expect(screen.getByText('Errori di commissione (No-Go)')).toBeInTheDocument();
    expect(screen.getByText('415 ms')).toBeInTheDocument();
  });

  it('il download CSV crea un Blob', () => {
    render(<Results result={result} onHome={() => {}} />);
    screen.getByText('Scarica CSV').click();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledOnce();
  });
});
