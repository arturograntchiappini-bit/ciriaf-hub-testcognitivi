/**
 * Fondamenti scientifici: un paper per test (paradigma, parametri e loro origine, metriche, limiti),
 * letti direttamente nella piattaforma dagli stessi file markdown del repository.
 */
import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { PageHeading } from '../components/PageHeading';
import { Button } from '../components/Button';
import { REPOSITORY_URL } from '../components/AuthorCard';
import { TEST_CATALOG } from '../router';
import { MarkdownView } from './MarkdownView';
import { parseMarkdown, type Block } from './markdown';
import { PAPERS, findPaper, loadPaper, type PaperMeta } from './papers';

interface ScienceProps {
  /** Paper aperto, oppure null per l'indice. */
  slug: string | null;
  onSelectPaper: (slug: string | null) => void;
  onBack: () => void;
  /** Etichetta del ritorno, es. «Home» o «Istruzioni del test». */
  backLabel: string;
}

const REPORT_SUFFIX = / — Riferimenti scientifici$/;

function testsOf(paper: PaperMeta): string {
  return TEST_CATALOG.filter((t) => paper.testIds.includes(t.id))
    .map((t) => t.title)
    .join(' · ');
}

function PaperIndex({ onSelectPaper }: { onSelectPaper: (slug: string) => void }): JSX.Element {
  const groups: ReadonlyArray<{ title: string; papers: PaperMeta[] }> = [
    { title: 'Test', papers: PAPERS.filter((p) => p.kind === 'test') },
    { title: 'Metodo e fonti', papers: PAPERS.filter((p) => p.kind !== 'test') },
  ];
  return (
    <div className="mt-12 space-y-14">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2 className="eyebrow">{group.title}</h2>
          <ul className="mt-4 border-t border-line">
            {group.papers.map((paper, index) => (
              <li key={paper.slug} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => onSelectPaper(paper.slug)}
                  className="test-row grid w-full grid-cols-[2.5rem_1fr_auto] items-start gap-4 py-5 text-left"
                >
                  <span className="font-mono text-[11px] tracking-[0.18em] text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block font-display text-2xl font-bold uppercase leading-tight tracking-wide text-ink">{paper.title}</span>
                    {paper.testIds.length > 0 && <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-accent-glow">{testsOf(paper)}</span>}
                    <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-muted">{paper.summary}</span>
                  </span>
                  <span aria-hidden className="pt-1 font-mono text-sm text-muted">→</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; blocks: Block[] };

function usePaper(slug: string): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadPaper(slug)
      .then((source) => !cancelled && setState({ status: 'ready', blocks: parseMarkdown(source) }))
      .catch(() => !cancelled && setState({ status: 'error' }));
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return state;
}

function Outline({ blocks }: { blocks: Block[] }): JSX.Element {
  const sections = blocks.filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading' && b.level === 2);
  return (
    <nav aria-label="Indice del paper" className="lg:sticky lg:top-8 lg:self-start">
      <p className="eyebrow">In questo paper</p>
      <ol className="mt-4 space-y-1 border-l border-line">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm leading-snug text-muted transition-colors duration-200 hover:border-accent hover:text-ink"
            >
              {section.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function CiteBox(): JSX.Element {
  return (
    <aside aria-label="Come citare la piattaforma" className="mt-16 border border-line bg-surface px-6 py-5">
      <p className="eyebrow">Per citare la piattaforma</p>
      <p className="mt-3 text-sm leading-relaxed text-ink">
        Grant Chiappini, A. (2026). <em>Sintropia - Cognitive tests Hub</em> [Software open source, licenza MIT].{' '}
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="text-accent-glow underline underline-offset-4">
          {REPOSITORY_URL}
        </a>
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Le fonti scientifiche del paradigma vanno citate separatamente: sono elencate in questo paper e nella bibliografia.
      </p>
    </aside>
  );
}

function PaperPager({ paper, onSelectPaper }: { paper: PaperMeta; onSelectPaper: (slug: string) => void }): JSX.Element {
  const index = PAPERS.findIndex((p) => p.slug === paper.slug);
  const previous = PAPERS[index - 1];
  const next = PAPERS[index + 1];
  return (
    <nav aria-label="Altri paper" className="mt-10 grid gap-3 sm:grid-cols-2">
      {previous ? (
        <button type="button" onClick={() => onSelectPaper(previous.slug)} className="test-row border border-line px-5 py-4 text-left">
          <span className="eyebrow block">← Precedente</span>
          <span className="mt-1 block font-display text-xl font-bold uppercase text-ink">{previous.title}</span>
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" onClick={() => onSelectPaper(next.slug)} className="test-row border border-line px-5 py-4 text-left sm:text-right">
          <span className="eyebrow block">Successivo →</span>
          <span className="mt-1 block font-display text-xl font-bold uppercase text-ink">{next.title}</span>
        </button>
      )}
    </nav>
  );
}

interface PaperReaderProps {
  paper: PaperMeta;
  onSelectPaper: (slug: string) => void;
  onIndex: () => void;
  onBack: () => void;
  backLabel: string;
}

function PaperReader({ paper, onSelectPaper, onIndex, onBack, backLabel }: PaperReaderProps): JSX.Element {
  const state = usePaper(paper.slug);
  const body = useMemo(
    () => (state.status === 'ready' ? state.blocks.filter((b, i) => !(i === 0 && b.kind === 'heading' && b.level === 1)) : []),
    [state],
  );
  const heading = state.status === 'ready' ? state.blocks.find((b) => b.kind === 'heading' && b.level === 1) : undefined;
  const title = heading?.kind === 'heading' ? heading.text.replace(REPORT_SUFFIX, '') : paper.title;

  return (
    <div>
      <PageHeading
        eyebrow={paper.kind === 'test' ? 'Paper scientifico' : paper.kind === 'method' ? 'Metodo' : 'Fonti'}
        title={title}
        actions={
          <>
            <Button variant="secondary" onClick={onIndex}>
              ← Tutti i paper
            </Button>
            <Button variant="ghost" onClick={onBack}>
              {backLabel}
            </Button>
          </>
        }
      />
      {paper.testIds.length > 0 && <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent-glow">{testsOf(paper)}</p>}

      {state.status === 'loading' && <p role="status" className="mt-12 text-muted">Caricamento del paper…</p>}
      {state.status === 'error' && (
        <p role="alert" className="mt-12 text-danger">
          Non riesco a caricare questo paper. Riprova, oppure leggilo nel repository.
        </p>
      )}
      {state.status === 'ready' && (
        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
          <Outline blocks={body} />
          <article aria-label={title} className="min-w-0">
            <MarkdownView blocks={body} onOpenPaper={(slug) => findPaper(slug) && onSelectPaper(slug)} />
            <CiteBox />
            <PaperPager paper={paper} onSelectPaper={onSelectPaper} />
          </article>
        </div>
      )}
    </div>
  );
}

export function Science({ slug, onSelectPaper, onBack, backLabel }: ScienceProps): JSX.Element {
  const paper = slug ? findPaper(slug) : undefined;
  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 pb-24 pt-12">
        {paper ? (
          <PaperReader paper={paper} onSelectPaper={onSelectPaper} onIndex={() => onSelectPaper(null)} onBack={onBack} backLabel={`← ${backLabel}`} />
        ) : (
          <>
            <PageHeading
              eyebrow="Fondamenti scientifici"
              title="Cosa misura ogni test, e perché"
              actions={
                <Button variant="secondary" onClick={onBack}>
                  ← {backLabel}
                </Button>
              }
            >
              Per ogni test c’è un paper: il paradigma originale, il meccanismo cognitivo, i parametri con la loro origine, le
              metriche calcolate e i limiti. Le fonti sono citate con il loro DOI. Sono gli stessi file del repository.
            </PageHeading>
            <PaperIndex onSelectPaper={onSelectPaper} />
          </>
        )}
      </main>
    </div>
  );
}
