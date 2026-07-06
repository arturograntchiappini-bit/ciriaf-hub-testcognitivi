import { Button } from '../components/Button';
import { INSTRUCTIONS } from '../content/instructions';
import type { TestId } from '../../engine/types';

interface InstructionsProps {
  testId: TestId;
  onStart: () => void;
  onBack: () => void;
}

/** Schermata di istruzioni con schema dei tasti. */
export function Instructions({ testId, onStart, onBack }: InstructionsProps): JSX.Element {
  const ins = INSTRUCTIONS[testId];
  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto flex min-h-full max-w-content flex-col justify-center px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{ins.title}</h1>
        <div className="mt-6 space-y-3 text-ink">
          {ins.paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-6 rounded-card border border-line bg-accent-soft px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tasti</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-ink">
            {ins.keyHints.map((k, i) => (
              <li key={i} className="font-medium">
                {k}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8 flex items-center gap-3">
          <Button onClick={onStart}>Inizia</Button>
          <Button variant="ghost" onClick={onBack}>
            ← Torna alla home
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          Prima del test vero c’è una breve pratica con feedback, che puoi saltare.
        </p>
      </div>
    </div>
  );
}
