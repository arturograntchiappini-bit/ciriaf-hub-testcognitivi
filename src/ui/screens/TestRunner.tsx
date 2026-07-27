/**
 * Orchestratore di una somministrazione: istruzioni → vista del test → risultati.
 * Genera sessione anonima, timestamp e seed; richiede il fullscreen all'avvio.
 * @see docs/architettura.md — sezione "Flusso di una somministrazione"
 */
import { useMemo, useState } from 'react';
import { Instructions } from './Instructions';
import { TestHost } from '../tests/TestHost';
import { makeSessionId } from '../../engine/session';
import type { AllParams } from '../../config/defaults';
import type { TestId, TestResult } from '../../engine/types';

interface TestRunnerProps {
  testId: TestId;
  settings: AllParams;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onBack: () => void;
}

function requestFullscreen(): void {
  try {
    void document.documentElement.requestFullscreen?.();
  } catch {
    /* il fullscreen può essere negato dal browser: non è critico */
  }
}

export function TestRunner({ testId, settings, feedbackDuringTest, onComplete, onBack }: TestRunnerProps): JSX.Element {
  const [started, setStarted] = useState(false);
  const sessionId = useMemo(() => makeSessionId(new Date()), []);
  const startedAt = useMemo(() => new Date().toISOString(), []);
  const seed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);

  if (!started) {
    return (
      <Instructions
        testId={testId}
        onStart={() => {
          requestFullscreen();
          setStarted(true);
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <TestHost
      testId={testId}
      params={settings[testId] as unknown as Record<string, unknown>}
      sessionId={sessionId}
      startedAt={startedAt}
      seed={seed}
      feedbackDuringTest={feedbackDuringTest}
      onComplete={onComplete}
      onAbort={onBack}
    />
  );
}
