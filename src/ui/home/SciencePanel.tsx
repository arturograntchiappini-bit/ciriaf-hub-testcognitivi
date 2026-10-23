import { PAPERS } from '../science/papers';

interface SciencePanelProps {
  /** Apre l'area scientifica: l'indice, oppure direttamente un paper. */
  onOpenScience: (slug?: string) => void;
}

const TEST_PAPERS = PAPERS.filter((paper) => paper.kind === 'test');

/** Rimanda ai paper scientifici dentro la piattaforma: ogni test ha il suo, con fonti verificate. */
export function SciencePanel({ onOpenScience }: SciencePanelProps): JSX.Element {
  return (
    <section id="scienza" aria-labelledby="science-title" className="relative z-10 bg-paper px-6 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="reveal font-mono text-[11px] uppercase tracking-[0.28em] text-muted">04 / 05 — Fondamenti scientifici</p>
          <h2 id="science-title" className="reveal mt-5 font-display text-[clamp(3rem,7vw,5.8rem)] font-extrabold uppercase leading-[0.88]">
            Ogni misura ha una fonte<span className="text-accent">.</span>
          </h2>
          <p className="reveal mt-6 max-w-md text-base leading-relaxed text-muted">
            Per ciascun test trovi un paper: il paradigma originale, il meccanismo cognitivo, da dove vengono i parametri,
            come si calcolano le metriche e quali sono i limiti. Le citazioni hanno un DOI verificato.
          </p>
          <button
            onClick={() => onOpenScience()}
            className="reveal mt-8 inline-flex min-h-[48px] items-center gap-3 border border-line px-6 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-accent"
          >
            Apri i paper <span aria-hidden>→</span>
          </button>
        </div>

        <ul className="border-t border-line">
          {TEST_PAPERS.map((paper, index) => (
            <li key={paper.slug} className="reveal border-b border-line" style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}>
              <button
                onClick={() => onOpenScience(paper.slug)}
                aria-label={`Leggi il paper: ${paper.title}`}
                className="test-row grid min-h-[56px] w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-4 text-left"
              >
                <span className="font-mono text-[11px] tracking-[0.18em] text-muted">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-display text-2xl font-bold uppercase leading-none tracking-wide text-ink">{paper.title}</span>
                <span aria-hidden className="font-mono text-sm text-muted">→</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
