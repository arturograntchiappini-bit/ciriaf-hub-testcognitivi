/**
 * Vista del test di Stroop (varianti 1 e 2), costruita sul runner a tempo di reazione.
 * @see docs/scientific/stroop.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import { correctKeyStroop, stroopStimulusLabel, type StroopParams, type StroopStimulus, type StroopVariant } from '../../engine/tests/stroop';
import { generateStroopSeeded, scoreStroop } from '../../engine/backend';
import { STIMULUS_COLORS } from '../theme';
import type { TestResult } from '../../engine/types';

interface StroopViewProps {
  variant: StroopVariant;
  params: StroopParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

function toSpec(s: StroopStimulus): TrialSpec {
  return {
    condition: s.congruent ? 'congruent' : 'incongruent',
    stimulusLabel: stroopStimulusLabel(s),
    data: s,
  };
}

export function StroopView(props: StroopViewProps): JSX.Element {
  const { variant, params, sessionId, startedAt, seed } = props;
  const practice = generateStroopSeeded({ ...params, nTrials: params.practiceTrials }, seed + 1).map(
    toSpec,
  );
  const test = generateStroopSeeded(params, seed).map(toSpec);

  const plan: RtTestPlan = {
    testId: variant,
    sessionId,
    params: { ...params, variant } as unknown as Record<string, unknown>,
    practiceTrials: practice,
    testTrials: test,
    timing: {
      fixationMs: params.fixationMs,
      stimulusVisibleMs: params.timeoutMs,
      responseWindowMs: params.timeoutMs,
      isiMs: params.isiMs,
      endOnResponse: true,
      practiceFeedbackMs: 800,
    },
    responseKeys: ['r', 'v', 'b', 'g'],
    expectsResponse: () => true,
    evaluate: (t, key) => {
      const s = t.data as StroopStimulus;
      return key !== null && key === correctKeyStroop(s, variant).toLowerCase();
    },
    renderStimulus: (t, show) => {
      if (!show) return null;
      const s = t.data as StroopStimulus;
      return (
        <span
          className="text-7xl font-bold"
          style={{ color: STIMULUS_COLORS.stroop[s.color] }}
        >
          {s.word}
        </span>
      );
    },
    statusHint: variant === 'stroop1' ? 'Rispondi alla PAROLA (R/V/B/G)' : 'Rispondi al COLORE (R/V/B/G)',
    score: scoreStroop,
  };

  return (
    <RtTestRunner
      plan={plan}
      startedAt={startedAt}
      practice={props.practice}
      feedbackDuringTest={props.feedbackDuringTest}
      onComplete={props.onComplete}
      onAbort={props.onAbort}
    />
  );
}
