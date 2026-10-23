/**
 * Vista del test PVT (Psychomotor Vigilance Task): contatore di millisecondi
 * che parte da 0. Il soggetto preme BARRA SPAZIATRICE non appena compare.
 * @see docs/scientific/pvt.md — Dinges & Powell (1985); Basner & Dinges (2011)
 */
import { useEffect, useRef, useState } from 'react';
import { RtTestRunner, type RtTestPlan } from '../runtime/RtTestRunner';
import type { TrialSpec } from '../runtime/sequencer';
import { generatePvt, scorePvt, type PvtParams } from '../../engine/tests/pvt';
import { mulberry32 } from '../../engine/rng';
import type { TestResult } from '../../engine/types';

interface PvtViewProps {
  params: PvtParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

function toSpec(s: { isiMs: number }): TrialSpec {
  return { condition: 'pvt', stimulusLabel: 'counter', isiMs: s.isiMs };
}

function useCounter(active: boolean): number {
  const [ms, setMs] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setMs(0);
      return;
    }
    startRef.current = performance.now();
    let frame = 0;
    function tick(): void {
      setMs(Math.floor(performance.now() - startRef.current));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return active ? ms : 0;
}

/** Contatore PVT: millisecondi che incrementano; oltre 500 ms (lapse) il numero vira all'ambra. */
function PvtCounter({ running }: { running: boolean }): JSX.Element {
  const ms = useCounter(running);
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span
        className={`font-mono text-8xl font-bold tracking-widest tabular-nums ${ms > 500 ? 'text-[#B45309]' : 'text-ink'}`}
      >
        {ms}
      </span>
      <span className="text-xs text-muted">ms</span>
    </div>
  );
}

export function PvtView(props: PvtViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const practiceStims = generatePvt(
    { ...params, nTrials: params.practiceTrials },
    mulberry32(seed + 1),
  );
  const testStims = generatePvt(params, mulberry32(seed));

  const practice = practiceStims.map(toSpec);
  const test = testStims.map(toSpec);

  const plan: RtTestPlan = {
    testId: 'pvt',
    sessionId,
    params: { ...params } as unknown as Record<string, unknown>,
    practiceTrials: practice,
    testTrials: test,
    timing: {
      fixationMs: 0,
      stimulusVisibleMs: params.stimulusMaxMs,
      responseWindowMs: params.stimulusMaxMs,
      isiMs: params.isiMinMs, // default; ogni trial ha il suo isiMs nello spec
      endOnResponse: true,
      practiceFeedbackMs: 1500,
    },
    responseKeys: [' '],
    expectsResponse: () => true,
    evaluate: (_t, key) => key !== null,
    renderStimulus: (_t, show) => <PvtCounter running={show} />,
    statusHint: 'BARRA SPAZIATRICE non appena compare il numero — il più veloce possibile',
    score: scorePvt,
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