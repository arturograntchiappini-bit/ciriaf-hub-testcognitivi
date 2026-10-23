/**
 * Schermata "pronti" prima di ogni test della batteria.
 */
import { Button } from '../components/Button';
import { instructionsFor } from '../content/instructions';
import { TEST_CATALOG } from '../router';
import type { TestId } from '../../engine/types';

interface BatteryReadyProps {
  testId: TestId;
  params?: Record<string, unknown>;
  index: number;
  total: number;
  onStart: () => void;
}

export function BatteryReady({ testId, params, index, total, onStart }: BatteryReadyProps): JSX.Element {
  const ins = instructionsFor(testId, params);
  const title = TEST_CATALOG.find((t) => t.id === testId)?.title ?? testId;
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-paper px-6">
      <p className="eyebrow">
        Test {index + 1} di {total}
      </p>
      <h1 className="page-title mt-3 text-center">{title}</h1>
      <div className="mt-6 border border-line bg-accent-soft px-6 py-4">
        <ul className="flex flex-wrap gap-x-8 gap-y-1 font-mono text-sm text-ink">
          {ins.keyHints.map((k, i) => (
            <li key={i} className="font-medium">
              {k}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8">
        <Button onClick={onStart}>Inizia il test</Button>
      </div>
    </div>
  );
}
