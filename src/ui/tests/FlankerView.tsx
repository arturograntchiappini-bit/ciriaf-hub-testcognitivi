/**
 * Vista del Flanker Task (Eriksen), costruita sul runner a tempo di reazione.
 * @see docs/scientific/flanker.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import { generateFlanker, scoreFlanker, type FlankerParams, type FlankerStimulus } from '../../engine/tests/flanker';
import { mulberry32 } from '../../engine/rng';
import type { TestResult } from '../../engine/types';

interface FlankerViewProps {
  params: FlankerParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

const KEY_BY_DIRECTION = { left: 'arrowleft', right: 'arrowright' } as const;
const GLYPH_WIDTH = 64;
const GLYPH_HEIGHT = 48;

function toSpec(s: FlankerStimulus): TrialSpec {
  return { condition: s.condition, stimulusLabel: s.arrows, isiMs: s.isiMs, data: s };
}

/** Un elemento dello stimolo: freccia a sinistra/destra oppure trattino neutro. Disegnato in SVG, resa identica ovunque. */
function Glyph({ symbol }: { symbol: string }): JSX.Element {
  const common = { width: GLYPH_WIDTH, height: GLYPH_HEIGHT, viewBox: `0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`, 'aria-hidden': true } as const;
  if (symbol === '–') {
    return (
      <svg {...common}>
        <path d="M10 24 H54" stroke="currentColor" strokeWidth="7" strokeLinecap="square" />
      </svg>
    );
  }
  return (
    <svg {...common} style={symbol === '←' ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M6 24 H52 M34 8 L56 24 L34 40" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function FlankerView(props: FlankerViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const practice = generateFlanker({ ...params, nTrials: params.practiceTrials }, mulberry32(seed + 1)).map(toSpec);
  const test = generateFlanker(params, mulberry32(seed)).map(toSpec);

  const plan: RtTestPlan = {
    testId: 'flanker',
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
    responseKeys: [KEY_BY_DIRECTION.left, KEY_BY_DIRECTION.right],
    expectsResponse: () => true,
    evaluate: (t, key) => key === KEY_BY_DIRECTION[(t.data as FlankerStimulus).direction],
    renderStimulus: (t, show) => {
      if (!show) return null;
      const { arrows } = t.data as FlankerStimulus;
      return (
        <div className="flex items-center gap-2 text-ink" role="img" aria-label="Stimolo flanker">
          {Array.from(arrows).map((symbol, i) => (
            <Glyph key={i} symbol={symbol} />
          ))}
        </div>
      );
    },
    statusHint: 'FRECCE ← → secondo la freccia CENTRALE; ignora quelle ai lati',
    score: scoreFlanker,
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
