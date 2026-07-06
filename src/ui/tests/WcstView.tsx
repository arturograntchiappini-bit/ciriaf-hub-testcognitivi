/**
 * Vista del Wisconsin Card Sorting Test: abbinamento carte, feedback binario e
 * cambio di regola segreto dopo N corrette consecutive.
 * @see docs/scientific/wcst.md
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { StimulusStage } from '../runtime/StimulusStage';
import { CardFace } from './WcstCard';
import {
  WCST_STIMULUS_CARDS,
  buildDeck,
  matchingDims,
  ruleForCategory,
  scoreWcst,
  type WcstCard,
  type WcstParams,
  type WcstTrialMeta,
} from '../../engine/tests/wcst';
import { mulberry32 } from '../../engine/rng';
import { realScheduler, performanceClock } from '../../engine/clock';
import type { TestResult, TrialResult } from '../../engine/types';

interface WcstViewProps {
  params: WcstParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

export function WcstView(props: WcstViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const deck = useMemo(() => buildDeck(params.deckSize, mulberry32(seed)), [params.deckSize, seed]);

  const [deckIndex, setDeckIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [locked, setLocked] = useState(false);

  const trialsRef = useRef<TrialResult[]>([]);
  const metasRef = useRef<WcstTrialMeta[]>([]);
  const categoriesRef = useRef(0);
  const consecutiveRef = useRef(0);
  const onsetRef = useRef(performanceClock.now());

  const finish = useCallback(() => {
    props.onComplete({
      testId: 'wcst',
      sessionId,
      startedAt,
      params: { ...params } as unknown as Record<string, unknown>,
      trials: trialsRef.current,
      summary: scoreWcst(trialsRef.current, metasRef.current, params),
    });
  }, [params, sessionId, startedAt, props]);

  const handleChoice = useCallback(
    (keyCard: WcstCard) => {
      if (locked) return;
      const target = deck[deckIndex];
      if (!target) return;
      setLocked(true);

      const currentRule = ruleForCategory(categoriesRef.current);
      const matched = matchingDims(target, keyCard);
      const correct = matched.includes(currentRule);

      trialsRef.current.push({
        testId: 'wcst',
        sessionId,
        trialIndex: trialsRef.current.length,
        phase: 'test',
        condition: currentRule,
        stimulus: `${target.number}${target.shape[0]}${target.color[0]}`,
        response: `${keyCard.number}${keyCard.shape[0]}${keyCard.color[0]}`,
        correct,
        rtMs: Math.round(performanceClock.now() - onsetRef.current),
        flag: 'VALID',
        onsetTimestamp: onsetRef.current,
      });
      metasRef.current.push({ currentRule, matchedDims: matched });

      if (correct) {
        consecutiveRef.current += 1;
        if (consecutiveRef.current >= params.runToShift) {
          categoriesRef.current += 1;
          consecutiveRef.current = 0;
        }
      } else {
        consecutiveRef.current = 0;
      }

      setFeedback(correct ? 'correct' : 'wrong');

      const done = categoriesRef.current >= params.maxCategories || deckIndex + 1 >= deck.length;
      const sched = realScheduler();
      sched.timeout(900, () => {
        setFeedback(null);
        if (done) {
          finish();
        } else {
          setDeckIndex((i) => i + 1);
          onsetRef.current = performanceClock.now();
          setLocked(false);
        }
      });
    },
    [locked, deck, deckIndex, params, sessionId, finish],
  );

  const target = deck[deckIndex];

  return (
    <StimulusStage
      statusBar={
        <div className="flex items-center justify-between">
          <span>Abbina la carta in alto a una delle quattro in basso</span>
          <span className="tabular-nums">
            Carta {Math.min(deckIndex + 1, deck.length)}/{deck.length}
          </span>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-8">
        {/* Carte stimolo (chiave) */}
        <div className="flex gap-4">
          {WCST_STIMULUS_CARDS.map((c, i) => (
            <CardFace key={i} card={c} />
          ))}
        </div>

        {/* Feedback */}
        <div className="h-8">
          {feedback && (
            <span
              className={`text-xl font-semibold ${feedback === 'correct' ? 'text-[color:var(--color-accent)]' : 'text-[#D0021B]'}`}
            >
              {feedback === 'correct' ? 'Corretto' : 'Errato'}
            </span>
          )}
        </div>

        {/* Carta da smistare + zone di risposta (click sulle carte chiave in alto) */}
        {target && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted">Carta da abbinare</span>
            <CardFace card={target} />
            <div className="mt-4 flex gap-4">
              {WCST_STIMULUS_CARDS.map((c, i) => (
                <CardFace key={i} card={c} interactive onClick={() => handleChoice(c)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </StimulusStage>
  );
}
