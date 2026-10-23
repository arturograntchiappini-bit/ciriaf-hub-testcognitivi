/**
 * Vista del Trail Making Test A e B: cerchi da collegare con il mouse (o il tocco) nell'ordine corretto.
 * @see docs/scientific/trail-making.md
 */
import { useMemo, useRef, useState } from 'react';
import { StimulusStage } from '../runtime/StimulusStage';
import { Button } from '../components/Button';
import {
  generateTrail,
  scoreTrailMaking,
  TrailRun,
  type TrailCircle,
  type TrailMakingParams,
  type TrailPart,
} from '../../engine/tests/trailMaking';
import { mulberry32 } from '../../engine/rng';
import { performanceClock } from '../../engine/clock';
import type { TestResult, TrialResult } from '../../engine/types';

interface TrailMakingViewProps {
  params: TrailMakingParams;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

interface Block {
  part: TrailPart;
  phase: 'practice' | 'test';
  circles: TrailCircle[];
}

const FIELD_PX = 600;
const CIRCLE_PX = 46;
const ERROR_FLASH_MS = 350;

function buildBlocks(params: TrailMakingParams, seed: number, practice: boolean): Block[] {
  const rand = mulberry32(seed);
  const blocks: Block[] = [];
  if (practice && params.practiceTargets > 0) {
    for (const part of ['A', 'B'] as const) blocks.push({ part, phase: 'practice', circles: generateTrail(part, params.practiceTargets, rand) });
  }
  for (const part of ['A', 'B'] as const) blocks.push({ part, phase: 'test', circles: generateTrail(part, params.nTargets, rand) });
  return blocks;
}

const PART_TEXT: Record<TrailPart, string> = {
  A: 'Collega i cerchi in ordine numerico: 1 → 2 → 3 …',
  B: 'Collega alternando numeri e lettere in ordine: 1 → A → 2 → B → 3 …',
};

export function TrailMakingView(props: TrailMakingViewProps): JSX.Element {
  const { params, sessionId, startedAt, seed } = props;
  const blocks = useMemo(() => buildBlocks(params, seed, props.practice ?? true), [params, seed, props.practice]);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [reached, setReached] = useState(0); // collegamenti corretti nel blocco corrente
  const [wrong, setWrong] = useState<number | null>(null);
  const runRef = useRef<TrailRun | null>(null);
  const trialsRef = useRef<TrialResult[]>([]);
  const block = blocks[index] as Block;

  function start(): void {
    runRef.current = new TrailRun(block.circles, block.part, block.phase, sessionId, performanceClock.now());
    setReached(0);
    setRunning(true);
  }

  function finishBlock(): void {
    setRunning(false);
    if (index + 1 < blocks.length) {
      setIndex(index + 1);
      return;
    }
    props.onComplete({
      testId: 'trailMaking',
      sessionId,
      startedAt,
      params: { ...params } as unknown as Record<string, unknown>,
      trials: trialsRef.current,
      summary: scoreTrailMaking(trialsRef.current, params.nTargets),
    });
  }

  function click(circleIndex: number): void {
    const run = runRef.current;
    const result = run?.click(circleIndex, performanceClock.now());
    if (!run || !result) return;
    trialsRef.current.push({ ...result, trialIndex: trialsRef.current.length });
    if (result.correct) {
      setReached((n) => n + 1);
      if (run.done) finishBlock();
    } else {
      setWrong(circleIndex);
      setTimeout(() => setWrong(null), ERROR_FLASH_MS);
    }
  }

  if (!running) {
    return (
      <StimulusStage>
        <div className="mx-auto max-w-md border border-line bg-surface p-8 text-center">
          <div className="eyebrow">{block.phase === 'practice' ? 'Pratica' : 'Test'} · parte {block.part}</div>
          <p className="mt-4 text-base text-ink">{PART_TEXT[block.part]}</p>
          <p className="mt-3 text-sm text-muted">
            Fai clic il più velocemente possibile senza staccarti dall&apos;ordine. Se sbagli, il cerchio lampeggia in rosso e devi
            cercare quello giusto: il tempo continua a scorrere.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={start}>Inizia</Button>
            <Button variant="ghost" onClick={props.onAbort}>Esci senza salvare</Button>
          </div>
        </div>
      </StimulusStage>
    );
  }

  const links = block.circles.slice(0, reached);
  return (
    <StimulusStage
      statusBar={
        <div className="flex items-center justify-between">
          <span>{PART_TEXT[block.part]}</span>
          <span className="tabular-nums">
            {block.phase === 'practice' ? 'Pratica' : 'Test'} · parte {block.part} · {reached}/{block.circles.length}
          </span>
        </div>
      }
    >
      <div className="relative" style={{ width: FIELD_PX, height: FIELD_PX }} role="group" aria-label="Campo dei cerchi">
        <svg className="pointer-events-none absolute inset-0" width={FIELD_PX} height={FIELD_PX} aria-hidden="true">
          {links.slice(1).map((c, i) => (
            <line key={i} x1={(links[i] as TrailCircle).x * FIELD_PX} y1={(links[i] as TrailCircle).y * FIELD_PX} x2={c.x * FIELD_PX} y2={c.y * FIELD_PX} stroke="currentColor" strokeWidth={2} className="text-accent" />
          ))}
        </svg>
        {block.circles.map((c, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={() => click(i)}
            aria-label={`Cerchio ${c.label}`}
            className={`absolute flex items-center justify-center rounded-full border-2 bg-paper font-semibold text-ink ${
              wrong === i ? 'border-danger text-danger' : i < reached ? 'border-accent bg-accent-soft' : 'border-ink'
            }`}
            style={{ width: CIRCLE_PX, height: CIRCLE_PX, left: c.x * FIELD_PX - CIRCLE_PX / 2, top: c.y * FIELD_PX - CIRCLE_PX / 2 }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </StimulusStage>
  );
}
