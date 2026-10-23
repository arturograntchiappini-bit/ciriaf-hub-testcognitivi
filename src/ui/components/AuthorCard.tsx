import portrait from '../../assets/arturo.jpg';

export const LINKEDIN_URL = 'https://www.linkedin.com/in/arturo-grant-chiappini/';
export const REPOSITORY_URL = 'https://github.com/arturograntchiappini-bit/ciriaf-hub-testcognitivi';

const EXTERNAL_LINK = { target: '_blank', rel: 'noopener noreferrer' } as const;
const LINK_BASE =
  'inline-flex min-h-[48px] items-center px-5 font-mono text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-200';

/** Card dell'autore e del progetto open source (MIT), in fondo alla Home. */
export function AuthorCard(): JSX.Element {
  return (
    <section
      aria-labelledby="author-heading"
      className="chamfer relative border border-line bg-surface/80 p-6 backdrop-blur-sm sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:p-8"
    >
      <img
        src={portrait}
        alt="Arturo Grant Chiappini"
        width={112}
        height={112}
        loading="lazy"
        decoding="async"
        className="mb-5 h-28 w-28 border border-accent object-cover sm:mb-0"
      />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-glow">Creata da</p>
        <h3 id="author-heading" className="mt-1 font-display text-4xl font-bold uppercase leading-none tracking-wide text-ink">
          Arturo Grant Chiappini
        </h3>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Studente e sviluppatore</p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Piattaforma open source rilasciata con licenza MIT: usala, studiala, miglioriamola insieme.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 sm:mt-0">
        <a
          href={LINKEDIN_URL}
          {...EXTERNAL_LINK}
          aria-label="Profilo LinkedIn di Arturo Grant Chiappini (si apre in una nuova scheda)"
          className={`${LINK_BASE} bg-accent text-paper hover:bg-accent-glow`}
        >
          LinkedIn
        </a>
        <a
          href={REPOSITORY_URL}
          {...EXTERNAL_LINK}
          aria-label="Repository GitHub del progetto (si apre in una nuova scheda)"
          className={`${LINK_BASE} border border-line text-ink hover:border-accent`}
        >
          GitHub
        </a>
      </div>
    </section>
  );
}
