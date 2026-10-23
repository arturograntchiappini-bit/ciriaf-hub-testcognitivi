/**
 * Vista del SART (Sustained Attention to Response Task), costruita sul runner a tempo di reazione.
 * La cifra resta visibile `digitMs`, poi compare la maschera; la risposta è valida su tutta la finestra.
 * @see docs/scientific/sart.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import { generateSart, scoreSart, SART_FONT_SIZES_PX, type SartParams, type SartStimulus } from '../../engine/tests/sart';
import { mulberry32 } from '../../engine/rng';
import type { TestResult } from '../../engine/types';

interface SartViewProps {
  params: SartParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

const STAGE_BOX_PX = Math.max(...SART_FONT_SIZES_PX) * 1.3;

function toSpec(targetDigit: number): (s: SartStimulus) => TrialSpec {
  return (s) => ({ condition: s.digit === targetDigit ? 'nogo' : 'go', stimulusLabel: String(s.digit), isiMs: 0, data: s });
}

/** Maschera che segue la cifra: cerchio barrato da una croce, grande quanto il corpo maggiore. */
function Mask(): JSX.Element {
  return (
    <svg width={STAGE_BOX_PX} height={STAGE_BOX_PX} viewBox="0 0 100 100" aria-hidden="true" className="text-ink">
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M29 29 L71 71 M71 29 L29 71" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

export function SartView(props: SartViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const spec = toSpec(params.targetDigit);
  const practice = generateSart({ ...params, nTrials: params.practiceTrials }, mulberry32(seed + 1)).map(spec);
  const test = generateSart(params, mulberry32(seed)).map(spec);

  const plan: RtTestPlan = {
    testId: 'sart',
    sessionId,
    params: { ...params } as unknown as Record<string, unknown>,
    practiceTrials: practice,
    testTrials: test,
    timing: {
      fixationMs: 0,
      stimulusVisibleMs: params.digitMs,
      responseWindowMs: params.digitMs + params.maskMs,
      isiMs: 0, // le cifre si susseguono senza pausa: la maschera è il «vuoto» fra l'una e l'altra
      endOnResponse: false,
      practiceFeedbackMs: 700,
    },
    responseKeys: [' '],
    expectsResponse: (t) => t.condition === 'go',
    evaluate: (t, key) => (t.condition === 'go' ? key !== null : key === null),
    renderStimulus: (t, show) => {
      const { digit, sizeIndex } = t.data as SartStimulus;
      return (
        <div className="flex items-center justify-center" style={{ width: STAGE_BOX_PX, height: STAGE_BOX_PX }}>
          {show ? (
            <span
              className="font-sans font-semibold leading-none text-ink"
              style={{ fontSize: SART_FONT_SIZES_PX[sizeIndex] }}
              role="img"
              aria-label={`Cifra ${digit}`}
            >
              {digit}
            </span>
          ) : (
            <Mask />
          )}
        </div>
      );
    },
    statusHint: `BARRA SPAZIATRICE a ogni cifra; non premere sul ${params.targetDigit}`,
    score: scoreSart,
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
