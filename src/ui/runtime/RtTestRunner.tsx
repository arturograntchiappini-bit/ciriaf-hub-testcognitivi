/**
 * Runner condiviso per i test a tempo di reazione (Stroop, Go/No-Go, N-Back).
 * Orchestra: pratica (skippabile) → countdown → test, gestendo tastiera,
 * interruzioni (perdita focus) e interruzione volontaria con ripresa.
 * @see docs/architettura.md — sezione "Timing e runtime dei trial"
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createSequencer, type SequencerState, type TrialSpec } from './sequencer';
import { StimulusStage } from './StimulusStage';
import { Button } from '../components/Button';
import { performanceClock, realScheduler } from '../../engine/clock';
import type { SummaryMetric, TestId, TestResult, TrialResult } from '../../engine/types';

export interface RtTiming {
  fixationMs: number;
  stimulusVisibleMs: number;
  responseWindowMs: number;
  isiMs: number;
  endOnResponse: boolean;
  /** Durata del feedback in pratica (ms). */
  practiceFeedbackMs: number;
}

export interface RtTestPlan {
  testId: TestId;
  sessionId: string;
  params: Record<string, unknown>;
  practiceTrials: TrialSpec[];
  testTrials: TrialSpec[];
  timing: RtTiming;
  responseKeys: string[];
  expectsResponse: (t: TrialSpec) => boolean;
  evaluate: (t: TrialSpec, key: string | null) => boolean;
  renderStimulus: (trial: TrialSpec, showStimulus: boolean) => ReactNode;
  statusHint: string;
  score: (trials: TrialResult[]) => SummaryMetric[];
}

interface RtTestRunnerProps {
  plan: RtTestPlan;
  startedAt: string;
  /** Se false, salta la fase di pratica (usato in modalità Sessione). Default true. */
  practice?: boolean;
  /** Se true, mostra "Corretto"/"Errato" anche durante il test (non solo in pratica). */
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

type Stage = 'practice' | 'countdown' | 'test' | 'paused';

const KEY_SPACE = ' ';
/** Durata del feedback opzionale durante il test (più breve di quello di pratica). */
const TEST_FEEDBACK_MS = 450;

export function RtTestRunner({
  plan,
  startedAt,
  practice = true,
  feedbackDuringTest = false,
  onComplete,
  onAbort,
}: RtTestRunnerProps): JSX.Element {
  const [stage, setStage] = useState<Stage>(
    practice && plan.practiceTrials.length > 0 ? 'practice' : 'countdown',
  );
  const [seqState, setSeqState] = useState<SequencerState | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Riferimenti stabili al sequencer attivo e agli accumulatori.
  const seqRef = useRef<ReturnType<typeof createSequencer> | null>(null);
  const allTrialsRef = useRef<TrialResult[]>([]);
  const testCollectedRef = useRef<TrialResult[]>([]);
  const stageRef = useRef<Stage>(stage);
  stageRef.current = stage;

  const buildResult = useCallback((): TestResult => {
    const trials = allTrialsRef.current;
    return {
      testId: plan.testId,
      sessionId: plan.sessionId,
      startedAt,
      params: plan.params,
      trials,
      summary: plan.score(trials),
    };
  }, [plan, startedAt]);

  const finishTest = useCallback(() => {
    onComplete(buildResult());
  }, [buildResult, onComplete]);

  // Avvia un blocco (pratica o test) a partire da un offset di trial (per la ripresa).
  const startBlock = useCallback(
    (phase: 'practice' | 'test', fromIndex: number) => {
      const trials = phase === 'practice' ? plan.practiceTrials : plan.testTrials;
      const slice = trials.slice(fromIndex);
      const collectInto = phase === 'test' ? testCollectedRef : { current: [] as TrialResult[] };
      const seq = createSequencer({
        testId: plan.testId,
        sessionId: plan.sessionId,
        phase,
        trials: slice,
        fixationMs: plan.timing.fixationMs,
        stimulusVisibleMs: plan.timing.stimulusVisibleMs,
        responseWindowMs: plan.timing.responseWindowMs,
        isiMs: plan.timing.isiMs,
        endOnResponse: plan.timing.endOnResponse,
        feedbackMs:
          phase === 'practice'
            ? plan.timing.practiceFeedbackMs
            : feedbackDuringTest
              ? TEST_FEEDBACK_MS
              : 0,
        responseKeys: plan.responseKeys,
        expectsResponse: plan.expectsResponse,
        evaluate: plan.evaluate,
        clock: performanceClock,
        scheduler: realScheduler(),
        onState: setSeqState,
        onTrialResult: (r) => {
          // Reindicizza in modo continuo (robusto alla ripresa parziale).
          const reindexed = { ...r, trialIndex: collectInto.current.length };
          collectInto.current.push(reindexed);
          allTrialsRef.current.push(reindexed);
        },
        onDone: () => {
          if (phase === 'practice') {
            setStage('countdown');
          } else {
            finishTest();
          }
        },
      });
      seqRef.current = seq;
      seq.start();
    },
    [plan, finishTest, feedbackDuringTest],
  );

  // Gestione delle transizioni di stage.
  useEffect(() => {
    if (stage === 'practice') {
      startBlock('practice', 0);
      return () => seqRef.current?.cancel();
    }
    if (stage === 'test') {
      startBlock('test', testCollectedRef.current.length);
      return () => seqRef.current?.cancel();
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Countdown 3-2-1 → test.
  useEffect(() => {
    if (stage !== 'countdown') return undefined;
    setCountdown(3);
    const sched = realScheduler();
    const cancels = [
      sched.timeout(700, () => setCountdown(2)),
      sched.timeout(1400, () => setCountdown(1)),
      sched.timeout(2100, () => setStage('test')),
    ];
    return () => cancels.forEach((c) => c());
  }, [stage]);

  // Listener tastiera (fuori dal percorso di re-render del timing).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.repeat) return; // ignora auto-repeat
      if (e.key === 'Escape') {
        if (stageRef.current === 'practice' || stageRef.current === 'test') {
          seqRef.current?.cancel();
          setStage('paused');
        }
        return;
      }
      const key = e.key === KEY_SPACE ? KEY_SPACE : e.key.toLowerCase();
      if (plan.responseKeys.includes(key)) {
        if (key === KEY_SPACE) e.preventDefault(); // evita lo scroll di pagina
        seqRef.current?.handleKey(key, performanceClock.now());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [plan.responseKeys]);

  // Interruzione da perdita di focus/visibilità.
  useEffect(() => {
    function onInterrupt(): void {
      if (stageRef.current === 'practice' || stageRef.current === 'test') {
        seqRef.current?.handleInterrupt();
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onInterrupt();
    });
    window.addEventListener('blur', onInterrupt);
    return () => {
      window.removeEventListener('blur', onInterrupt);
    };
  }, []);

  // ---- Rendering per stage ----

  if (stage === 'paused') {
    return (
      <StimulusStage>
        <div className="mx-auto max-w-md rounded-card border border-line bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">Test in pausa</h2>
          <p className="mt-3 text-sm text-muted">
            Puoi riprendere dal punto in cui eri, uscire salvando i dati raccolti finora, oppure
            uscire senza salvare.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => setStage('test')}>Riprendi il test</Button>
            <Button variant="secondary" onClick={() => onComplete(buildResult())}>
              Esci ed esporta i dati parziali
            </Button>
            <Button variant="ghost" onClick={onAbort}>
              Esci senza salvare
            </Button>
          </div>
        </div>
      </StimulusStage>
    );
  }

  if (stage === 'countdown') {
    return (
      <StimulusStage>
        <div className="text-center">
          <div className="text-6xl font-bold text-ink">{countdown}</div>
          <p className="mt-4 text-sm text-muted">Preparati…</p>
        </div>
      </StimulusStage>
    );
  }

  function skipPractice(): void {
    seqRef.current?.cancel();
    setStage('countdown');
  }

  // practice o test
  const currentTrials = stage === 'practice' ? plan.practiceTrials : plan.testTrials;
  const idx = seqState?.index ?? 0;
  const trial = currentTrials[idx];
  const showStimulus = seqState?.showStimulus ?? false;
  const isFixation = seqState?.phase === 'fixation';

  let content: ReactNode;
  if (seqState?.phase === 'feedback') {
    content = (
      <div
        className={`text-3xl font-semibold ${seqState.feedback === 'correct' ? 'text-accent' : 'text-danger'}`}
      >
        {seqState.feedback === 'correct' ? 'Corretto' : 'Errato'}
      </div>
    );
  } else if (isFixation) {
    content = <div className="text-4xl text-ink">+</div>;
  } else if (trial) {
    content = plan.renderStimulus(trial, showStimulus);
  } else {
    content = null;
  }

  const progress = `${stage === 'practice' ? 'Pratica' : 'Test'} · trial ${Math.min(idx + 1, currentTrials.length)}/${currentTrials.length}`;

  return (
    <StimulusStage
      statusBar={
        <div className="flex items-center justify-between">
          <span>{plan.statusHint}</span>
          <span className="tabular-nums">{progress}</span>
        </div>
      }
    >
      {stage === 'practice' && (
        <div className="absolute right-6 top-6">
          <Button variant="secondary" onClick={skipPractice}>
            Salta pratica →
          </Button>
        </div>
      )}
      <div className="absolute left-6 top-6 text-xs text-muted">Esc per interrompere</div>
      {content}
    </StimulusStage>
  );
}
