/**
 * Vista del test N-Back (2-back), costruita sul runner a tempo di reazione.
 * Lo stimolo (lettera) resta visibile letterMs; la finestra di risposta copre
 * l'intero trial (lettera + blank).
 * @see docs/scientific/nback.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import { generateNBack, scoreNBack, type NBackParams, type NBackStimulus } from '../../engine/tests/nback';
import { mulberry32 } from '../../engine/rng';
import type { TestResult } from '../../engine/types';

interface NBackViewProps {
  params: NBackParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

function toSpec(s: NBackStimulus): TrialSpec {
  return { condition: s.isTarget ? 'target' : 'nontarget', stimulusLabel: s.letter, data: s };
}

export function NBackView(props: NBackViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const practice = generateNBack({ ...params, nTrials: params.practiceTrials }, mulberry32(seed + 1)).map(
    toSpec,
  );
  const test = generateNBack(params, mulberry32(seed)).map(toSpec);

  const trialMs = params.letterMs + params.blankMs;

  const plan: RtTestPlan = {
    testId: 'nback',
    sessionId,
    params: { ...params } as unknown as Record<string, unknown>,
    practiceTrials: practice,
    testTrials: test,
    timing: {
      fixationMs: 0,
      stimulusVisibleMs: params.letterMs,
      responseWindowMs: trialMs,
      isiMs: 0, // il "blank" è già dentro la finestra di risposta
      endOnResponse: false,
      practiceFeedbackMs: 500,
    },
    responseKeys: [' '],
    expectsResponse: (t) => t.condition === 'target',
    evaluate: (t, key) => (t.condition === 'target' ? key !== null : key === null),
    renderStimulus: (t, show) => {
      if (!show) return null;
      const s = t.data as NBackStimulus;
      return <span className="text-8xl font-bold text-ink">{s.letter}</span>;
    },
    statusHint: 'BARRA SPAZIATRICE se la lettera è uguale a 2 passi fa',
    score: (trials) => scoreNBack(trials),
  };

  return (
    <RtTestRunner
      plan={plan}
      startedAt={startedAt}
      practice={props.practice}
      onComplete={props.onComplete}
      onAbort={props.onAbort}
    />
  );
}
