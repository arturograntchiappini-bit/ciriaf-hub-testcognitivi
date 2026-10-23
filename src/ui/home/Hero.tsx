import { Brand } from '../components/Brand';
import { TEST_CATALOG } from '../router';
import { countWord } from './countWord';
import type { TestFocus } from './testFocus';

interface HeroProps {
  focus: { testTitle: string; focus: TestFocus } | null;
  onOpenSession: () => void;
  onOpenSettings: () => void;
  onOpenScience: () => void;
}

/** Testo e CTA sono DOM reale: l'LCP non dipende dalla scena 3D che si carica dopo. */
export function Hero({ focus, onOpenSession, onOpenSettings, onOpenScience }: HeroProps): JSX.Element {
  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[100svh] flex-col px-6 pb-10 sm:px-10">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />
      <header className="relative z-10 flex items-center justify-between py-5">
        <Brand />
        <nav aria-label="Strumenti" className="flex items-center gap-2">
        <button
          onClick={onOpenScience}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-line px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors duration-200 hover:border-accent hover:text-ink"
        >
          <span aria-hidden>§</span>
          <span className="hidden sm:inline">Fondamenti scientifici</span>
          <span className="sm:hidden">Paper</span>
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="Impostazioni"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 border border-line px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors duration-200 hover:border-accent hover:text-ink"
        >
          <span aria-hidden>⚙</span>
          <span className="hidden sm:inline">Impostazioni</span>
        </button>
        </nav>
      </header>

      <div
        data-brain-anchor="hero"
        aria-hidden
        className="pointer-events-none relative mt-2 h-[27svh] md:absolute md:right-[5%] md:top-[12%] md:mt-0 md:h-[68%] md:w-[46%]"
      />

      <div className="relative z-10 mt-auto">
        <p className="rise font-mono text-[11px] uppercase tracking-[0.28em] text-accent-glow" style={{ '--delay': '150ms' } as React.CSSProperties}>
          Fisica tecnica ambientale · open source
        </p>
        <h1 id="hero-title" className="mt-4 font-display font-extrabold uppercase leading-[0.84] tracking-[-0.01em] text-ink text-[clamp(4.5rem,17vw,11rem)]">
          <span className="mask-line"><span style={{ '--delay': '250ms' } as React.CSSProperties}>Misura</span></span>
          <span className="mask-line"><span style={{ '--delay': '360ms' } as React.CSSProperties}>la mente<span className="text-accent">.</span></span></span>
        </h1>

        <div className="mt-8 grid items-end gap-8 md:grid-cols-[minmax(0,30rem)_1fr]">
          <div className="rise" style={{ '--delay': '700ms' } as React.CSSProperties}>
            <p className="text-base leading-relaxed text-muted">
              {countWord(TEST_CATALOG.length)} paradigmi classici di neuropsicologia sperimentale, eseguiti nel browser.
              Nessun account: i dati grezzi restano tuoi, in CSV e JSON.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onOpenSession}
                className="inline-flex min-h-[48px] items-center gap-3 bg-accent px-6 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-paper transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-glow"
              >
                Avvia una sessione <span aria-hidden>→</span>
              </button>
              <a
                href="#test"
                className="inline-flex min-h-[48px] items-center gap-3 border border-line px-6 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-accent"
              >
                Scegli un test <span aria-hidden>↓</span>
              </a>
            </div>
          </div>

          <dl
            aria-hidden
            className="rise hidden justify-self-end font-mono text-[11px] uppercase tracking-[0.18em] md:block md:min-w-[18rem]"
            style={{ '--delay': '900ms' } as React.CSSProperties}
          >
            <div className="pb-2 text-accent-glow">Mappa cerebrale interattiva</div>
            <div className="flex justify-between gap-8 border-t border-line py-2">
              <dt className="text-muted">Area coinvolta</dt>
              <dd className="text-ink">{focus ? focus.focus.regionLabel : 'nessuna'}</dd>
            </div>
            <div className="flex justify-between gap-8 border-t border-line py-2">
              <dt className="text-muted">Test</dt>
              <dd className="text-right text-ink">{focus ? focus.testTitle.split(' — ')[0] : 'nessuno'}</dd>
            </div>
            <div className="border-t border-line pt-2 normal-case leading-snug tracking-normal text-muted">
              {focus ? focus.focus.task : 'Passa il cursore su un test del catalogo: si accende l’area del cervello che mette alla prova. Mappatura illustrativa.'}
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
