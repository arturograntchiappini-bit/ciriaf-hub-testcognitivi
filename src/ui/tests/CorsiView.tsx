/**
 * Vista del Corsi Block Task: layout fisso di 9 blocchi, presentazione della
 * sequenza illuminata e riproduzione a click, con regola di arresto adattiva.
 * @see docs/scientific/corsi.md
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StimulusStage } from '../runtime/StimulusStage';
import { Button } from '../components/Button';
import {
  CORSI_BLOCKS,
  shouldStop,
  type CorsiParams,
  type CorsiSequence,
} from '../../engine/tests/corsi';
import { RngStream, scoreCorsi } from '../../engine/backend';
import { realScheduler, performanceClock, type Cancel } from '../../engine/clock';
import { UI_COLORS } from '../theme';
import type { TestResult, TrialResult } from '../../engine/types';

interface CorsiViewProps {
  params: CorsiParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

type Phase = 'ready' | 'presenting' | 'input' | 'feedback' | 'done';

interface PlannedTrial {
  seq: CorsiSequence;
  isPractice: boolean;
  level: number;
}

export function CorsiView(props: CorsiViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const randRef = useRef(new RngStream(seed));

  const [phase, setPhase] = useState<Phase>('ready');
  const [litIndex, setLitIndex] = useState<number | null>(null);
  const [clicked, setClicked] = useState<number[]>([]);
  const [current, setCurrent] = useState<PlannedTrial | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean>(false);
  const [skippedPractice, setSkippedPractice] = useState(false);

  const trialsRef = useRef<TrialResult[]>([]);
  const levelResultsRef = useRef<boolean[]>([]);
  const levelRef = useRef<number>(params.startLength);
  const trialInLevelRef = useRef<number>(0);
  const practiceQueueRef = useRef<PlannedTrial[]>([]);
  const inputStartRef = useRef<number>(0);
  const cancelsRef = useRef<Cancel[]>([]);
  const sched = useRef(realScheduler()).current;
  // Timer annullati allo smontaggio: niente onComplete/setState dopo l'uscita dal test.
  const later = useCallback((ms: number, fn: () => void) => { cancelsRef.current.push(sched.timeout(ms, fn)); }, [sched]);
  useEffect(() => () => { cancelsRef.current.forEach((c) => c()); cancelsRef.current = []; }, []);

  // Prepara i trial di pratica (2 a lunghezza 2).
  useEffect(() => {
    const seqs = randRef.current.corsiSequences(2, 2, params);
    practiceQueueRef.current = seqs.map((seq) => ({ seq, isPractice: true, level: 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presentSequence = useCallback((trial: PlannedTrial) => {
    setCurrent(trial);
    setClicked([]);
    setPhase('presenting');
    const per = params.presentMsPerBlock;
    trial.seq.indices.forEach((blockIdx, i) => {
      later(i * per, () => setLitIndex(blockIdx));
      later(i * per + per * 0.7, () => setLitIndex(null));
    });
    later(trial.seq.indices.length * per + 200, () => {
      setLitIndex(null);
      inputStartRef.current = performanceClock.now();
      setPhase('input');
    });
  }, [params.presentMsPerBlock, later]);

  // Avvia il prossimo trial di pratica o passa al test.
  const nextPractice = useCallback(() => {
    const q = practiceQueueRef.current;
    if (q.length === 0 || skippedPractice) {
      startTestLevel();
      return;
    }
    const trial = q.shift() as PlannedTrial;
    presentSequence(trial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentSequence, skippedPractice]);

  const finish = useCallback(() => {
    setPhase('done');
    props.onComplete({
      testId: 'corsi',
      sessionId,
      startedAt,
      params: { ...params } as unknown as Record<string, unknown>,
      trials: trialsRef.current,
      summary: scoreCorsi(trialsRef.current, params.startLength),
    });
  }, [params, sessionId, startedAt, props]);

  const levelQueueRef = useRef<PlannedTrial[]>([]);

  const startTestLevel = useCallback(() => {
    const level = levelRef.current;
    if (level > params.maxLength) {
      finish();
      return;
    }
    levelResultsRef.current = [];
    trialInLevelRef.current = 0;
    const seqs = randRef.current.corsiSequences(level, params.trialsPerLevel, params);
    levelQueueRef.current = seqs.map((seq) => ({ seq, isPractice: false, level }));
    presentNextTestTrial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, finish]);

  // In modalità Sessione senza pratica: avvia subito il test.
  useEffect(() => {
    if (props.practice === false) {
      setSkippedPractice(true);
      startTestLevel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presentNextTestTrial = useCallback(() => {
    const q = levelQueueRef.current;
    if (q.length === 0) {
      // Fine livello: decide se fermarsi o salire.
      if (shouldStop(levelResultsRef.current)) {
        finish();
        return;
      }
      levelRef.current += 1;
      startTestLevel();
      return;
    }
    const trial = q.shift() as PlannedTrial;
    presentSequence(trial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentSequence, finish, startTestLevel]);

  // Valuta la riproduzione quando il numero di click raggiunge la lunghezza.
  const evaluateInput = useCallback(
    (clickedSeq: number[]) => {
      const trial = current;
      if (!trial) return;
      const correct =
        clickedSeq.length === trial.seq.indices.length &&
        clickedSeq.every((v, i) => v === trial.seq.indices[i]);

      const result: TrialResult = {
        testId: 'corsi',
        sessionId,
        trialIndex: trialsRef.current.length,
        phase: trial.isPractice ? 'practice' : 'test',
        condition: `len${trial.seq.indices.length}`,
        stimulus: trial.seq.indices.join('-'),
        response: clickedSeq.join('-'),
        correct,
        rtMs: Math.round(performanceClock.now() - inputStartRef.current),
        flag: 'VALID',
        onsetTimestamp: inputStartRef.current,
      };
      trialsRef.current.push(result);
      if (!trial.isPractice) levelResultsRef.current.push(correct);

      setLastCorrect(correct);
      setPhase('feedback');
      later(900, () => {
        if (trial.isPractice) nextPractice();
        else presentNextTestTrial();
      });
    },
    [current, sessionId, nextPractice, presentNextTestTrial, later],
  );

  function handleBlockClick(blockIdx: number): void {
    if (phase !== 'input') return;
    const next = [...clicked, blockIdx];
    setClicked(next);
    if (current && next.length >= current.seq.indices.length) {
      evaluateInput(next);
    }
  }

  // Rendering
  if (phase === 'ready') {
    if (props.practice === false) {
      return (
        <StimulusStage>
          <div className="text-muted">Preparazione…</div>
        </StimulusStage>
      );
    }
    return (
      <StimulusStage>
        <div className="text-center">
          <p className="mb-6 max-w-md text-muted">
            Memorizza l’ordine in cui i blocchi si illuminano, poi riproducilo cliccando.
            Iniziamo con una breve pratica.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={nextPractice}>Inizia la pratica</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSkippedPractice(true);
                startTestLevel();
              }}
            >
              Salta pratica →
            </Button>
          </div>
        </div>
      </StimulusStage>
    );
  }

  const statusText =
    phase === 'presenting'
      ? 'Osserva la sequenza…'
      : phase === 'input'
        ? `Riproduci la sequenza — ${clicked.length}/${current?.seq.indices.length ?? 0}`
        : phase === 'feedback'
          ? lastCorrect
            ? 'Corretto'
            : 'Errato'
          : '';

  return (
    <StimulusStage statusBar={<span>{statusText}</span>}>
      <div className="relative" style={{ width: 420, height: 420 }}>
        {CORSI_BLOCKS.map((b, idx) => {
          const lit = litIndex === idx;
          const wasClicked = clicked.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleBlockClick(idx)}
              disabled={phase !== 'input'}
              aria-label={`Blocco ${idx + 1}`}
              className="absolute rounded-md border transition-colors"
              style={{
                left: `${b.x}%`,
                top: `${100 - b.y}%`,
                width: 56,
                height: 56,
                transform: 'translate(-50%, -50%)',
                backgroundColor: lit ? UI_COLORS.accent : wasClicked ? UI_COLORS.accentSoft : '#F2F4F7',
                borderColor: lit ? UI_COLORS.accent : UI_COLORS.line,
                cursor: phase === 'input' ? 'pointer' : 'default',
              }}
            />
          );
        })}
      </div>
    </StimulusStage>
  );
}
