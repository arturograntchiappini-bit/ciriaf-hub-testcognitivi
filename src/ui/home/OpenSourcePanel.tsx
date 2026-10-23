import { TEST_CATALOG } from '../router';
import { AuthorCard, REPOSITORY_URL } from '../components/AuthorCard';

const FACTS: ReadonlyArray<{ value: string; unit: string; label: string }> = [
  { value: String(TEST_CATALOG.length), unit: 'test', label: 'paradigmi con fonti peer-reviewed' },
  { value: '0', unit: 'account', label: 'nessun dato personale, codice sessione anonimo' },
  { value: '0', unit: 'server', label: 'tutto gira nel browser del laboratorio' },
  { value: '6', unit: 'formati', label: 'CSV (Excel e internazionale), JSON, riepilogo, eventi TSV e report HTML' },
];

/** Dati e codice aperti, con la card dell'autore in fondo alla pagina. */
export function OpenSourcePanel(): JSX.Element {
  return (
    <section aria-labelledby="open-title" className="relative z-10 bg-paper px-6 pb-12 pt-24 sm:px-10 sm:pt-32">
      <div className="mx-auto max-w-[1200px]">
        <p className="reveal font-mono text-[11px] uppercase tracking-[0.28em] text-muted">05 / 05 — Open science</p>
        <h2 id="open-title" className="reveal mt-5 max-w-4xl font-display text-[clamp(3.4rem,10vw,8.5rem)] font-extrabold uppercase leading-[0.86]">
          Codice aperto,<br />dati tuoi<span className="text-accent">.</span>
        </h2>

        <dl className="mt-16 grid grid-cols-2 border-t border-line lg:grid-cols-4">
          {FACTS.map((fact, index) => (
            <div key={fact.unit} className="reveal border-b border-line py-8 pr-4 lg:border-b-0 lg:border-r lg:pl-6 lg:first:pl-0 lg:last:border-r-0" style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}>
              <dt className="font-display text-[clamp(4rem,9vw,7rem)] font-extrabold leading-none tabular-nums text-ink">
                {fact.value}
                <span className="ml-2 align-super font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent">{fact.unit}</span>
              </dt>
              <dd className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted">{fact.label}</dd>
            </div>
          ))}
        </dl>

        <p className="reveal mt-12 max-w-2xl text-base leading-relaxed text-muted">
          Il progetto è rilasciato con licenza MIT. Il codice, i parametri di default con le loro fonti e la documentazione
          scientifica di ogni test sono pubblici:{' '}
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="inline-block whitespace-nowrap py-3 text-accent-glow underline underline-offset-4">
            leggi il repository
          </a>
          .
        </p>

        <div className="reveal mt-20">
          <AuthorCard />
        </div>
      </div>
    </section>
  );
}
