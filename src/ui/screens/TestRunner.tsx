/**
 * Orchestratore di una somministrazione: istruzioni → vista del test → risultati.
 * Genera sessione anonima, timestamp e seed; richiede il fullscreen all'avvio.
 * @see docs/architettura.md — sezione "Flusso di una somministrazione"
 */
import { useMemo, useState } from 'react';
import { Instructions } from './Instructions';
import { StroopView } from '../tests/StroopView';
import { GoNoGoView } from '../tests/GoNoGoView';
import { NBackView } from '../tests/NBackView';
import { CorsiView } from '../tests/CorsiView';
import { WcstView } from '../tests/WcstView';
import { makeSessionId } from '../../engine/session';
import type { AllParams } from '../../config/defaults';
import type { TestId, TestResult } from '../../engine/types';

interface TestRunnerProps {
  testId: TestId;
  settings: AllParams;
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

export function TestRunner({ testId, settings, onComplete, onBack }: TestRunnerProps): JSX.Element {
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

  const common = { sessionId, startedAt, seed, onComplete, onAbort: onBack };

  switch (testId) {
    case 'stroop1':
      return <StroopView variant="stroop1" params={settings.stroop1} {...common} />;
    case 'stroop2':
      return <StroopView variant="stroop2" params={settings.stroop2} {...common} />;
    case 'gonogo':
      return <GoNoGoView params={settings.gonogo} {...common} />;
    case 'nback':
      return <NBackView params={settings.nback} {...common} />;
    case 'corsi':
      return <CorsiView params={settings.corsi} {...common} />;
    case 'wcst':
      return <WcstView params={settings.wcst} {...common} />;
  }
}
