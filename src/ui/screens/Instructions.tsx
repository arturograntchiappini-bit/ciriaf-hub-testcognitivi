import { Button } from '../components/Button';
import { instructionsFor } from '../content/instructions';
import type { TestId } from '../../engine/types';

interface InstructionsProps {
  testId: TestId;
  /** Parametri del test: le istruzioni ne seguono il valore (es. il livello n dell'N-Back). */
  params?: Record<string, unknown>;
  onStart: () => void;
  onBack: () => void;
  /** Apre il paper scientifico del test, se disponibile. */
  onOpenScience?: () => void;
}

/** Schermata di istruzioni con schema dei tasti. */
export function Instructions({ testId, params, onStart, onBack, onOpenScience }: InstructionsProps): JSX.Element {
  const ins = instructionsFor(testId, params);
  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto flex min-h-full max-w-content flex-col justify-center px-6 py-14">
        <p className="eyebrow">Istruzioni</p>
        <h1 className="page-title mt-3">{ins.title}</h1>
        <div className="mt-8 max-w-2xl space-y-4 text-lg leading-relaxed text-ink">
          {ins.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-8 border border-line bg-accent-soft px-6 py-5">
          <p className="eyebrow mb-3 text-accent-glow">Tasti</p>
          <ul className="flex flex-wrap gap-x-10 gap-y-2 font-mono text-sm text-ink">
            {ins.keyHints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button onClick={onStart}>Inizia</Button>
          <Button variant="ghost" onClick={onBack}>
            ← Torna alla home
          </Button>
          {onOpenScience && (
            <Button variant="secondary" onClick={onOpenScience}>
              Base scientifica del test
            </Button>
          )}
        </div>
        <p className="mt-6 text-sm text-muted">Prima del test vero c’è una breve pratica con feedback, che puoi saltare.</p>
      </div>
    </div>
  );
}
