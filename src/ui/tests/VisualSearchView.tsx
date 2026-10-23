/**
 * Vista della Visual Search (ricerca di caratteristica e di congiunzione), sul runner a tempo di reazione.
 * @see docs/scientific/visual-search.md
 */
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import {
  conditionLabel,
  generateVisualSearch,
  scoreVisualSearch,
  type SearchColor,
  type VisualSearchParams,
  type VisualSearchStimulus,
} from '../../engine/tests/visualSearch';
import { mulberry32 } from '../../engine/rng';
import type { TestResult } from '../../engine/types';

interface VisualSearchViewProps {
  params: VisualSearchParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

const KEY_PRESENT = 'arrowleft';
const KEY_ABSENT = 'arrowright';
const FIELD_PX = 520;
const ITEM_PX = 30;
// Blu e arancione: restano distinguibili anche con le più comuni carenze nella visione dei colori.
const FILL: Record<SearchColor, string> = { orange: '#e8710a', blue: '#1f5fa8' };

function toSpec(s: VisualSearchStimulus): TrialSpec {
  return { condition: conditionLabel(s.type, s.present, s.setSize), stimulusLabel: `${s.type}/${s.setSize}/${s.present ? 'presente' : 'assente'}`, isiMs: s.isiMs, data: s };
}

function Field({ stimulus }: { stimulus: VisualSearchStimulus }): JSX.Element {
  return (
    <svg width={FIELD_PX} height={FIELD_PX} viewBox={`0 0 ${FIELD_PX} ${FIELD_PX}`} role="img" aria-label="Campo di ricerca">
      {stimulus.items.map((item, i) => {
        const cx = item.x * FIELD_PX;
        const cy = item.y * FIELD_PX;
        return item.shape === 'circle' ? (
          <circle key={i} cx={cx} cy={cy} r={ITEM_PX / 2} fill={FILL[item.color]} />
        ) : (
          <rect key={i} x={cx - ITEM_PX / 2} y={cy - ITEM_PX / 2} width={ITEM_PX} height={ITEM_PX} fill={FILL[item.color]} />
        );
      })}
    </svg>
  );
}

export function VisualSearchView(props: VisualSearchViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const practice = generateVisualSearch({ ...params, nTrials: params.practiceTrials }, mulberry32(seed + 1)).map(toSpec);
  const test = generateVisualSearch(params, mulberry32(seed)).map(toSpec);

  const plan: RtTestPlan = {
    testId: 'visualSearch',
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
    responseKeys: [KEY_PRESENT, KEY_ABSENT],
    expectsResponse: () => true,
    evaluate: (t, key) => key === ((t.data as VisualSearchStimulus).present ? KEY_PRESENT : KEY_ABSENT),
    renderStimulus: (t, show) => (show ? <Field stimulus={t.data as VisualSearchStimulus} /> : null),
    statusHint: '← cerchio arancione PRESENTE · → ASSENTE',
    score: scoreVisualSearch,
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
