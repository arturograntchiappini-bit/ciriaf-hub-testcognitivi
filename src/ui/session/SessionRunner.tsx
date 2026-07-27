/**
 * Runtime della Sessione: attesa a tempo reale, alert, batteria di test e
 * ripresa. Il timing di sessione usa l'orologio reale (Date.now()); il timing
 * dei singoli test resta invariato.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WaitScreen } from './WaitScreen';
import { BatteryReady } from './BatteryReady';
import { SessionResults } from './SessionResults';
import { TestHost } from '../tests/TestHost';
import { Button } from '../components/Button';
import { StimulusStage } from '../runtime/StimulusStage';
import { playAlert } from './alert';
import { saveRun, clearRun } from './storage';
import {
  computeSessionState,
  sessionTotalMs,
  type SessionRun,
  type SessionState,
  type TimePin,
} from '../../engine/session/model';
import type { TestResult } from '../../engine/types';

interface SessionRunnerProps {
  initialRun: SessionRun;
  onExit: () => void;
}

type Mode = 'wait' | 'ready' | 'test' | 'done';

interface ActiveContext {
  phaseId: string;
  phaseName: string;
  pin: TimePin;
}

function now(): number {
  return Date.now();
}

export function SessionRunner({ initialRun, onExit }: SessionRunnerProps): JSX.Element {
  const [run, setRun] = useState<SessionRun>(initialRun);
  const [mode, setMode] = useState<Mode>(initialRun.finished ? 'done' : 'wait');
  const [, setTick] = useState(0);
  const [batteryIdx, setBatteryIdx] = useState(0);
  const [exiting, setExiting] = useState(false);

  const runRef = useRef(run);
  runRef.current = run;
  const activeRef = useRef<ActiveContext | null>(null);
  const alertedPinRef = useRef<string | null>(null);
  const testSeedRef = useRef(0);
  const testStartedAtRef = useRef('');

  const totalMs = useMemo(() => sessionTotalMs(run.template), [run.template]);

  function persist(next: SessionRun): void {
    runRef.current = next;
    setRun(next);
    saveRun(next);
  }

  const elapsed = (): number => now() - runRef.current.startedAtEpoch;

  const state = (): SessionState =>
    computeSessionState(runRef.current.template, elapsed(), runRef.current.completedPinIds);

  // Tick da 1 s durante l'attesa (aggiorna countdown e innesca l'alert).
  useEffect(() => {
    if (mode !== 'wait') return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Alert una sola volta quando la batteria diventa dovuta.
  useEffect(() => {
    if (mode !== 'wait') return;
    const s = state();
    if (s.done) {
      finishSession();
      return;
    }
    if (s.due && s.nextPin && alertedPinRef.current !== s.nextPin.id) {
      alertedPinRef.current = s.nextPin.id;
      playAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  function startBattery(): void {
    const s = state();
    if (!s.nextPin) return;
    activeRef.current = { phaseId: s.currentPhaseId, phaseName: s.currentPhaseName, pin: s.nextPin };
    setBatteryIdx(0);
    prepareTest();
    setMode('ready');
  }

  function prepareTest(): void {
    testSeedRef.current = Math.floor(Math.random() * 1_000_000_000);
    testStartedAtRef.current = new Date().toISOString();
  }

  function onTestComplete(result: TestResult): void {
    const ctx = activeRef.current;
    if (!ctx) return;
    const current = runRef.current;
    const results = [
      ...current.results,
      {
        phaseId: ctx.phaseId,
        phaseName: ctx.phaseName,
        pinId: ctx.pin.id,
        offsetMs: ctx.pin.offsetMs,
        indexInBattery: batteryIdx,
        result,
      },
    ];

    const isLastInBattery = batteryIdx + 1 >= ctx.pin.battery.length;
    if (!isLastInBattery) {
      persist({ ...current, results });
      setBatteryIdx((i) => i + 1);
      prepareTest();
      setMode('ready');
      return;
    }

    // Batteria conclusa: pin completato.
    const completedPinIds = [...current.completedPinIds, ctx.pin.id];
    const next = { ...current, results, completedPinIds };
    const after = computeSessionState(next.template, now() - next.startedAtEpoch, completedPinIds);
    if (after.done) {
      persist({ ...next, finished: true });
      setMode('done');
    } else {
      persist(next);
      alertedPinRef.current = null;
      setMode('wait');
    }
  }

  const finishSession = useCallback(() => {
    const current = runRef.current;
    if (!current.finished) persist({ ...current, finished: true });
    setMode('done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exitToMenu(clear: boolean): void {
    if (clear) clearRun();
    onExit();
  }

  // ---- Rendering ----

  if (mode === 'done') {
    return (
      <SessionResults
        run={run}
        partial={!run.finished}
        onExit={() => exitToMenu(true)}
      />
    );
  }

  if (mode === 'ready' && activeRef.current) {
    const pin = activeRef.current.pin;
    const item = pin.battery[batteryIdx];
    if (!item) return <StimulusStage>{null}</StimulusStage>;
    return (
      <BatteryReady
        testId={item.testId}
        index={batteryIdx}
        total={pin.battery.length}
        onStart={() => setMode('test')}
      />
    );
  }

  if (mode === 'test' && activeRef.current) {
    const pin = activeRef.current.pin;
    const item = pin.battery[batteryIdx];
    if (!item) return <StimulusStage>{null}</StimulusStage>;
    return (
      <TestHost
        key={`${pin.id}-${batteryIdx}`}
        testId={item.testId}
        params={item.params}
        sessionId={run.runId}
        startedAt={testStartedAtRef.current}
        seed={testSeedRef.current}
        practice={item.practice}
        onComplete={onTestComplete}
        onAbort={() => setMode('wait')}
      />
    );
  }

  // mode === 'wait'
  const s = state();
  return (
    <>
      <WaitScreen
        state={s}
        elapsedMs={elapsed()}
        totalMs={totalMs}
        onStart={startBattery}
        onExit={() => setExiting(true)}
      />
      {exiting && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/20">
          <div className="mx-auto max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
            <h2 className="text-lg font-semibold text-ink">Uscire dalla sessione?</h2>
            <p className="mt-3 text-sm text-muted">
              Puoi riprendere più tardi (la sessione resta salvata), vedere i risultati parziali
              raccolti finora, oppure restare.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => setExiting(false)}>Resta nella sessione</Button>
              <Button variant="secondary" onClick={() => setMode('done')}>
                Vedi risultati parziali
              </Button>
              <Button variant="ghost" onClick={() => exitToMenu(false)}>
                Esci (riprendibile dal menu)
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
