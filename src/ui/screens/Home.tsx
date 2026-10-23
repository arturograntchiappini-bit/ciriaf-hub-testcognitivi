import { useCallback, useMemo, useRef, useState } from 'react';
import { BrainStage } from '../home/BrainStage';
import { Hero } from '../home/Hero';
import { OpenSourcePanel } from '../home/OpenSourcePanel';
import { SciencePanel } from '../home/SciencePanel';
import { SessionPanel } from '../home/SessionPanel';
import { TestIndex } from '../home/TestIndex';
import { focusFor } from '../home/testFocus';
import { useReveal } from '../home/useReveal';
import { REPOSITORY_URL } from '../components/AuthorCard';
import { TEST_CATALOG, type TestMeta } from '../router';
import { countWord } from '../home/countWord';
import type { TestId } from '../../engine/types';

interface HomeProps {
  onSelectTest: (id: TestId) => void;
  onOpenSettings: () => void;
  onOpenSession: () => void;
  onOpenScience: (slug?: string) => void;
}

const NO_REGIONS: readonly number[] = [];

/** Schermata iniziale: scena 3D a tutto schermo, indice dei test che accende il cervello, sessione e open source. */
export function Home({ onSelectTest, onOpenSettings, onOpenSession, onOpenScience }: HomeProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<TestMeta | null>(null);
  const regions = useMemo(() => (focused ? focusFor(focused.id).regions : NO_REGIONS), [focused]);
  const heroFocus = useMemo(
    () => (focused ? { testTitle: focused.title, focus: focusFor(focused.id) } : null),
    [focused],
  );
  const onFocusChange = useCallback((meta: TestMeta | null) => setFocused(meta), []);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="relative min-h-full bg-paper">
      <a
        href="#test"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-paper"
      >
        Vai ai test
      </a>
      <BrainStage regions={regions} />
      <div className="grain" aria-hidden />

      <main className="relative z-10">
        <Hero focus={heroFocus} onOpenSession={onOpenSession} onOpenSettings={onOpenSettings} onOpenScience={() => onOpenScience()} />

        <section id="test" aria-labelledby="tests-title" className="relative px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="reveal font-mono text-[11px] uppercase tracking-[0.28em] text-muted">02 / 05 — Catalogo</p>
              <h2 id="tests-title" className="reveal mt-5 font-display text-[clamp(3.4rem,8vw,6.5rem)] font-extrabold uppercase leading-[0.86]">
                {countWord(TEST_CATALOG.length)} test.<br />Una mappa<span className="text-accent">.</span>
              </h2>
              <p className="reveal mt-6 max-w-sm text-sm leading-relaxed text-muted">
                Passa su un test: la regione cerebrale coinvolta si accende. Mappatura indicativa a scopo illustrativo,
                non una localizzazione anatomica.
              </p>
              <div data-brain-anchor="index" className="mt-8 hidden h-[min(34svh,20rem)] w-full lg:block" />
            </div>
            <div
              data-brain-anchor="index"
              aria-hidden
              className="sticky top-0 z-20 -mx-6 h-[30svh] bg-gradient-to-b from-paper from-75% to-transparent sm:-mx-10 lg:hidden"
            />
            <TestIndex onSelectTest={onSelectTest} onFocusChange={onFocusChange} />
          </div>
        </section>

        <SessionPanel onOpenSession={onOpenSession} />
        <SciencePanel onOpenScience={onOpenScience} />
        <OpenSourcePanel />
      </main>

      <footer className="relative z-10 bg-paper px-6 pb-10 sm:px-10">
        <p className="mx-auto max-w-[1200px] border-t border-line pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Sintropia — Cognitive tests Hub · sviluppata per il laboratorio CIRIAF COLAB/NEXTROOM ·{' '}
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-3.5 text-ink underline underline-offset-4 hover:text-accent-glow"
          >
            Codice open source (licenza MIT)
          </a>
        </p>
      </footer>
    </div>
  );
}
