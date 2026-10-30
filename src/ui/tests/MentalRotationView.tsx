/**
 * Vista della Mental Rotation (figure a blocchi di Shepard & Metzler), sul runner a tempo di reazione.
 * @see docs/scientific/mental-rotation.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import { conditionLabel, projectFaces, type Cube, type MentalRotationParams, type MentalRotationStimulus } from '../../engine/tests/mentalRotation';
import { generateMentalRotationSeeded, scoreMentalRotation } from '../../engine/backend';
import type { TestResult } from '../../engine/types';

interface MentalRotationViewProps {
  params: MentalRotationParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

const KEY_SAME = 'arrowleft';
const KEY_DIFFERENT = 'arrowright';
const FIGURE_PX = 340;
const EXTENT = 4.6; // semi-ampiezza del campo in unità cubetto: contiene la figura a qualunque angolo

function toSpec(s: MentalRotationStimulus): TrialSpec {
  return { condition: conditionLabel(s.same, s.angle), stimulusLabel: `${s.same ? 'uguali' : 'diverse'}/${s.angle}°`, isiMs: s.isiMs, data: s };
}

function Figure({ cubes, angle, label }: { cubes: readonly Cube[]; angle: number; label: string }): JSX.Element {
  return (
    <svg width={FIGURE_PX} height={FIGURE_PX} viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`} role="img" aria-label={label}>
      {projectFaces(cubes, angle).map((face, i) => (
        <polygon
          key={i}
          points={face.points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill={`hsl(215 45% ${18 + face.shade * 52}%)`}
          stroke="#0a0e1a"
          strokeWidth={0.06}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function MentalRotationView(props: MentalRotationViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const practice = generateMentalRotationSeeded({ ...params, nTrials: params.practiceTrials }, seed + 1).map(toSpec);
  const test = generateMentalRotationSeeded(params, seed).map(toSpec);

  const plan: RtTestPlan = {
    testId: 'mentalRotation',
    sessionId,
    params: { ...params } as unknown as Record<string, unknown>,
    practiceTrials: practice,
    testTrials: test,
    timing: {
      fixationMs: params.fixationMs,
      stimulusVisibleMs: params.responseWindowMs,
      responseWindowMs: params.responseWindowMs,
      isiMs: params.isiMinMs, // default; il valore reale per trial è in spec.isiMs
      endOnResponse: true,
      practiceFeedbackMs: 700,
    },
    responseKeys: [KEY_SAME, KEY_DIFFERENT],
    expectsResponse: () => true,
    evaluate: (t, key) => key === ((t.data as MentalRotationStimulus).same ? KEY_SAME : KEY_DIFFERENT),
    renderStimulus: (t, show) => {
      if (!show) return null;
      const s = t.data as MentalRotationStimulus;
      return (
        <div className="flex items-center gap-6">
          <Figure cubes={s.left} angle={0} label="Figura di sinistra" />
          <Figure cubes={s.right} angle={s.angle} label="Figura di destra" />
        </div>
      );
    },
    statusHint: '← figure UGUALI (solo ruotate) · → figure DIVERSE (speculari)',
    score: scoreMentalRotation,
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
