/**
 * Vista del test Go/No-Go, costruita sul runner a tempo di reazione.
 * @see docs/scientific/gonogo.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import {
  generateGoNoGo,
  scoreGoNoGo,
  type GoNoGoParams,
  type GoNoGoStimulus,
} from '../../engine/tests/gonogo';
import { mulberry32 } from '../../engine/rng';
import { STIMULUS_COLORS } from '../theme';
import type { TestResult } from '../../engine/types';

interface GoNoGoViewProps {
  params: GoNoGoParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

function toSpec(s: GoNoGoStimulus): TrialSpec {
  return { condition: s.kind, stimulusLabel: s.kind, isiMs: s.isiMs, data: s };
}

export function GoNoGoView(props: GoNoGoViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const practice = generateGoNoGo({ ...params, nTrials: params.practiceTrials }, mulberry32(seed + 1)).map(
    toSpec,
  );
  const test = generateGoNoGo(params, mulberry32(seed)).map(toSpec);

  const plan: RtTestPlan = {
    testId: 'gonogo',
    sessionId,
    params: { ...params } as unknown as Record<string, unknown>,
    practiceTrials: practice,
    testTrials: test,
    timing: {
      fixationMs: 0,
      stimulusVisibleMs: params.stimulusMs,
      responseWindowMs: params.stimulusMs,
      isiMs: params.isiMinMs, // default; il valore reale per trial è in spec.isiMs
      endOnResponse: false,
      practiceFeedbackMs: 600,
    },
    responseKeys: [' '],
    expectsResponse: (t) => t.condition === 'go',
    evaluate: (t, key) => (t.condition === 'go' ? key !== null : key === null),
    renderStimulus: (t, show) => {
      if (!show) return null;
      const s = t.data as GoNoGoStimulus;
      const color = s.kind === 'go' ? STIMULUS_COLORS.go : STIMULUS_COLORS.nogo;
      return <span className="block h-40 w-40 rounded-full" style={{ backgroundColor: color }} />;
    },
    statusHint: 'BARRA SPAZIATRICE sul cerchio verde; non premere sul rosso',
    score: scoreGoNoGo,
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
