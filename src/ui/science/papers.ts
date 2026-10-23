/**
 * Registro dei paper scientifici mostrati nella piattaforma.
 * I testi sono i file docs/scientific/*.md: la stessa fonte del repository, caricata a richiesta.
 * Un nuovo test richiede un nuovo paper (lo verifica papers.test.ts).
 */
import type { TestId } from '../../engine/types';

export type PaperKind = 'test' | 'method' | 'reference';

export interface PaperMeta {
  slug: string;
  title: string;
  kind: PaperKind;
  /** Test della piattaforma a cui il paper si applica (vuoto per metodo e bibliografia). */
  testIds: readonly TestId[];
  /** Una riga che dice cosa spiega il paper, per l'indice. */
  summary: string;
}

export const PAPERS: readonly PaperMeta[] = [
  {
    slug: 'stroop',
    title: 'Stroop Task',
    kind: 'test',
    testIds: ['stroop1', 'stroop2'],
    summary: 'L’interferenza tra leggere una parola e nominarne il colore, e le due varianti implementate.',
  },
  {
    slug: 'gonogo',
    title: 'Go / No-Go',
    kind: 'test',
    testIds: ['gonogo'],
    summary: 'L’inibizione di una risposta già preparata: errori di commissione, omissioni e stabilità degli RT.',
  },
  {
    slug: 'corsi',
    title: 'Corsi Block Task',
    kind: 'test',
    testIds: ['corsi'],
    summary: 'La memoria visuo-spaziale a breve termine: span, sequenze e difficoltà equivalente tra somministrazioni.',
  },
  {
    slug: 'nback',
    title: 'N-Back (2-back)',
    kind: 'test',
    testIds: ['nback'],
    summary: 'La memoria di lavoro come aggiornamento continuo: bersagli a distanza n e sensibilità d′.',
  },
  {
    slug: 'wcst',
    title: 'Wisconsin Card Sorting Test',
    kind: 'test',
    testIds: ['wcst'],
    summary: 'La flessibilità cognitiva: categorie completate, errori perseverativi e cambio di regola.',
  },
  {
    slug: 'pvt',
    title: 'PVT — Vigilanza Psicomotoria',
    kind: 'test',
    testIds: ['pvt'],
    summary: 'L’attenzione sostenuta: tempi di reazione a stimoli a intervallo variabile, lapsus e anticipazioni.',
  },
  {
    slug: 'flanker',
    title: 'Flanker — Frecce di Eriksen',
    kind: 'test',
    testIds: ['flanker'],
    summary: 'L’attenzione selettiva: interferenza dei distrattori laterali e adattamento al conflitto.',
  },
  {
    slug: 'sart',
    title: 'SART — Attenzione sostenuta alla risposta',
    kind: 'test',
    testIds: ['sart'],
    summary: 'Cifre in sequenza e una sola da non rispondere: commissioni, tempi prima dell’errore e compromesso velocità-accuratezza.',
  },
  {
    slug: 'validazione-rt',
    title: 'Validazione dei tempi di reazione',
    kind: 'method',
    testIds: [],
    summary: 'Come si trattano i tempi di reazione prima dell’analisi: anticipazioni, omissioni e valori anomali.',
  },
  {
    slug: 'bibliography',
    title: 'Bibliografia',
    kind: 'reference',
    testIds: [],
    summary: 'Tutte le fonti citate nei paper, in formato APA e con DOI.',
  },
];

const SOURCES = import.meta.glob('../../../docs/scientific/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const SLUG_PATTERN = /([^/\\]+)\.md$/;

function loaderFor(slug: string): (() => Promise<string>) | undefined {
  const entry = Object.entries(SOURCES).find(([path]) => SLUG_PATTERN.exec(path)?.[1] === slug);
  return entry?.[1];
}

export function findPaper(slug: string): PaperMeta | undefined {
  return PAPERS.find((paper) => paper.slug === slug);
}

/** Paper di un test della piattaforma, se esiste. */
export function paperForTest(testId: TestId): PaperMeta | undefined {
  return PAPERS.find((paper) => paper.testIds.includes(testId));
}

/** Slug dei file markdown effettivamente presenti in docs/scientific. */
export function availableSlugs(): string[] {
  return Object.keys(SOURCES).flatMap((path) => SLUG_PATTERN.exec(path)?.[1] ?? []);
}

/** Carica il testo markdown di un paper; rifiuta se lo slug non è registrato. */
export async function loadPaper(slug: string): Promise<string> {
  const load = findPaper(slug) && loaderFor(slug);
  if (!load) throw new Error(`Paper non trovato: ${slug}`);
  return load();
}
