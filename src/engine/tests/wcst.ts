/**
 * Wisconsin Card Sorting Test (WCST) — flessibilità cognitiva e set-shifting.
 * @see docs/scientific/wcst.md — Berg (1948); Grant & Berg (1948); Heaton; Kongs et al. (2000)
 *
 * Il criterio di classificazione (Colore→Forma→Numero, ciclico) cambia in segreto
 * dopo N risposte corrette consecutive. Il feedback è solo "Corretto"/"Errato".
 */
import type { SummaryMetric, TrialResult } from '../types';
import { shuffle } from '../rng';

export type WcstDim = 'color' | 'shape' | 'number';
export type WcstColor = 'red' | 'green' | 'yellow' | 'blue';
export type WcstShape = 'triangle' | 'star' | 'cross' | 'circle';
export type WcstNumber = 1 | 2 | 3 | 4;

export interface WcstCard {
  color: WcstColor;
  shape: WcstShape;
  number: WcstNumber;
}

/** Le 4 carte stimolo standard. */
export const WCST_STIMULUS_CARDS: readonly [WcstCard, WcstCard, WcstCard, WcstCard] = [
  { color: 'red', shape: 'triangle', number: 1 },
  { color: 'green', shape: 'star', number: 2 },
  { color: 'yellow', shape: 'cross', number: 3 },
  { color: 'blue', shape: 'circle', number: 4 },
];

/** Ordine ciclico dei criteri. */
export const WCST_RULE_ORDER: readonly WcstDim[] = ['color', 'shape', 'number'];

export interface WcstParams {
  deckSize: number;
  /** Corrette consecutive richieste per il cambio di categoria (default 10). */
  runToShift: number;
  /** Numero di categorie da completare per terminare (default 6). */
  maxCategories: number;
}

const ALL_COLORS: readonly WcstColor[] = ['red', 'green', 'yellow', 'blue'];
const ALL_SHAPES: readonly WcstShape[] = ['triangle', 'star', 'cross', 'circle'];
const ALL_NUMBERS: readonly WcstNumber[] = [1, 2, 3, 4];

/** Vero se la carta scelta combacia con il bersaglio sulla dimensione data. */
export function matchesOn(target: WcstCard, choice: WcstCard, dim: WcstDim): boolean {
  return target[dim] === choice[dim];
}

/** Dimensioni su cui due carte combaciano. */
export function matchingDims(target: WcstCard, choice: WcstCard): WcstDim[] {
  return WCST_RULE_ORDER.filter((dim) => matchesOn(target, choice, dim));
}

/**
 * Costruisce il mazzo di risposta: permutazione delle 64 combinazioni possibili
 * (4 colori × 4 forme × 4 numeri), ripetuta se deckSize > 64. Bilanciata su tutte
 * le dimensioni per costruzione.
 */
export function buildDeck(deckSize: number, rand: () => number): WcstCard[] {
  const all: WcstCard[] = [];
  for (const color of ALL_COLORS) {
    for (const shape of ALL_SHAPES) {
      for (const number of ALL_NUMBERS) {
        all.push({ color, shape, number });
      }
    }
  }
  const deck: WcstCard[] = [];
  while (deck.length < deckSize) {
    deck.push(...shuffle(all, rand));
  }
  return deck.slice(0, deckSize);
}

/** Regola attiva data la categoria corrente (0-based). */
export function ruleForCategory(categoryIndex: number): WcstDim {
  return WCST_RULE_ORDER[categoryIndex % WCST_RULE_ORDER.length] as WcstDim;
}

/** Metadati per trial necessari allo scoring (prodotti dal runtime). */
export interface WcstTrialMeta {
  /** Regola attiva in questo trial. */
  currentRule: WcstDim;
  /** Dimensioni su cui la carta scelta combaciava col bersaglio. */
  matchedDims: WcstDim[];
}

/** Esito di una risposta ai fini dello scoring perseverativo. */
interface Step {
  correct: boolean;
  matched: readonly WcstDim[];
}

/** Conteggi perseverativi: gli errori sono un sottoinsieme delle risposte perseverative. */
export interface PerseverationCounts {
  errors: number;
  responses: number;
}

const THREE_ERRORS = 3; // errori non ambigui consecutivi che cambiano il principio perseverato

/**
 * Principio perseverato (PP) e regole di conteggio, secondo la procedura di Heaton et al. (1993)
 * come descritta da Howlett & Moseley (2024):
 * - il PP si stabilisce al primo errore non ambiguo (questo errore conta come perseverativo);
 * - al completamento di una categoria il PP diventa il criterio appena abbandonato;
 * - tre errori non ambigui consecutivi su una dimensione che non è né corretta né il PP cambiano il PP;
 *   il primo dei tre non è perseverativo, il secondo e il terzo sì (lettura della regola «il nuovo PP
 *   non vale finché non c'è il secondo errore non ambiguo»: il testo non lo esplicita);
 * - una risposta ambigua conta come perseverativa solo se è «incastrata» tra due errori non ambigui
 *   perseverativi e combacia col PP; subito dopo il completamento di una categoria non può esserlo.
 * Non è validato rispetto al software ufficiale PAR: vedi docs/scientific/wcst.md.
 */
class PerseverationScanner {
  private pp: WcstDim | null = null;
  private correctRun = 0;
  private flagged: number[] = []; // indici delle risposte perseverative
  private candidate: { dim: WcstDim; unambiguous: number[]; between: number[] } | null = null;
  private sandwichOpen = false; // l'ultima risposta è stata un errore non ambiguo perseverativo
  private pending: number[] = []; // ambigue combacianti col PP dopo l'ultimo errore perseverativo

  constructor(
    private readonly steps: readonly Step[],
    private readonly rules: readonly WcstDim[],
    private readonly runToShift: number,
  ) {}

  run(): PerseverationCounts {
    this.steps.forEach((_, i) => this.visit(i));
    const flagged = new Set(this.flagged);
    const errors = [...flagged].filter((i) => !(this.steps[i] as Step).correct).length;
    return { errors, responses: flagged.size };
  }

  private visit(i: number): void {
    const step = this.steps[i] as Step;
    const rule = this.rules[i] as WcstDim;
    const unambiguous = step.matched.length === 1;
    const dim = step.matched[0] as WcstDim;

    if (!step.correct && unambiguous && this.pp === null && dim !== rule) this.pp = dim;
    const perseverativeError = !step.correct && unambiguous && this.pp === dim && dim !== rule;

    if (perseverativeError) this.onPerseverativeError(i);
    else this.onOtherResponse(i, step, unambiguous);

    if (step.correct) this.onCorrect(rule);
    else this.correctRun = 0;
  }

  private onPerseverativeError(i: number): void {
    if (this.sandwichOpen) this.flagged.push(...this.pending);
    this.flagged.push(i);
    this.sandwichOpen = true;
    this.pending = [];
    this.candidate = null;
  }

  private onOtherResponse(i: number, step: Step, unambiguous: boolean): void {
    const ambiguousOnPp = step.matched.length > 1 && this.pp !== null && step.matched.includes(this.pp);
    if (this.sandwichOpen && ambiguousOnPp) this.pending.push(i);
    else {
      this.sandwichOpen = false;
      this.pending = [];
    }
    this.trackThreeErrors(i, step, unambiguous);
  }

  /** Tre errori non ambigui consecutivi sulla stessa dimensione (né corretta né PP) spostano il PP. */
  private trackThreeErrors(i: number, step: Step, unambiguous: boolean): void {
    const rule = this.rules[i] as WcstDim;
    if (step.correct) {
      this.candidate = null;
    } else if (unambiguous) {
      const dim = step.matched[0] as WcstDim;
      if (this.candidate?.dim === dim) this.candidate.unambiguous.push(i);
      else this.candidate = { dim, unambiguous: [i], between: [] };
      if (this.candidate.unambiguous.length >= THREE_ERRORS) this.adoptCandidate();
    } else if (this.candidate && step.matched.includes(this.candidate.dim) && !step.matched.includes(rule)) {
      if (this.candidate.unambiguous.length >= 2) this.candidate.between.push(i);
    } else {
      this.candidate = null;
    }
  }

  private adoptCandidate(): void {
    const c = this.candidate as NonNullable<typeof this.candidate>;
    this.pp = c.dim;
    this.flagged.push(c.unambiguous[1] as number, c.unambiguous[2] as number, ...c.between);
    this.sandwichOpen = true;
    this.pending = [];
    this.candidate = null;
  }

  private onCorrect(rule: WcstDim): void {
    this.correctRun++;
    if (this.correctRun < this.runToShift) return;
    this.pp = rule; // il criterio appena abbandonato
    this.correctRun = 0;
    this.candidate = null;
    this.sandwichOpen = false;
    this.pending = [];
  }
}

/** Errori e risposte perseverative di una sequenza di risposte, con le regole attive per ciascuna. */
export function countPerseveration(
  steps: readonly Step[],
  rules: readonly WcstDim[],
  runToShift: number,
): PerseverationCounts {
  return new PerseverationScanner(steps, rules, runToShift).run();
}

/**
 * Metriche del WCST: categorie, errori totali, errori e risposte perseverative (principio
 * perseverato di Heaton), errori non perseverativi, failure to maintain set, risposte a livello
 * concettuale e trial per la prima categoria. I trial interrotti sono esclusi.
 */
export function scoreWcst(
  trials: readonly TrialResult[],
  metas: readonly WcstTrialMeta[],
  params: WcstParams,
): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test' && t.flag !== 'INTERRUPTED');
  const rows = test.flatMap((_, i) => (metas[i] ? [metas[i] as WcstTrialMeta] : []));
  const steps: Step[] = rows.map((m) => ({ correct: m.matchedDims.includes(m.currentRule), matched: m.matchedDims }));

  const run = scanRuns(steps, params.runToShift);
  const totalErrors = steps.filter((s) => !s.correct).length;
  const perseveration = countPerseveration(steps, rows.map((m) => m.currentRule), params.runToShift);
  const pct = (n: number): number => (test.length > 0 ? round1((n / test.length) * 100) : 0);

  return [
    { label: 'Categorie completate', value: run.categories },
    { label: 'Trial totali', value: test.length },
    { label: 'Errori totali', value: totalErrors },
    { label: 'Errori perseverativi', value: perseveration.errors },
    { label: '% errori perseverativi', value: pct(perseveration.errors), unit: '%' },
    { label: 'Risposte perseverative', value: perseveration.responses },
    { label: 'Errori non perseverativi', value: totalErrors - perseveration.errors },
    { label: 'Failure to maintain set', value: run.failureToMaintainSet },
    { label: 'Risposte a livello concettuale', value: pct(run.conceptualResponses), unit: '%' },
    { label: 'Trial per la 1ª categoria', value: run.trialsToFirstCategory ?? test.length },
  ];
}

interface RunStats {
  categories: number;
  failureToMaintainSet: number;
  conceptualResponses: number;
  trialsToFirstCategory: number | null;
}

/** Categorie, failure to maintain set e corse concettuali (≥ 3 corrette consecutive, non azzerate dal cambio). */
function scanRuns(steps: readonly Step[], runToShift: number): RunStats {
  const stats: RunStats = { categories: 0, failureToMaintainSet: 0, conceptualResponses: 0, trialsToFirstCategory: null };
  let consecutiveCorrect = 0; // si azzera anche al cambio di categoria
  let correctRun = 0; // corsa concettuale: NON si azzera al cambio di categoria
  const closeRun = (): void => {
    if (correctRun >= 3) stats.conceptualResponses += correctRun;
    correctRun = 0;
  };

  steps.forEach((step, i) => {
    if (!step.correct) {
      closeRun();
      if (consecutiveCorrect >= 5 && consecutiveCorrect < runToShift) stats.failureToMaintainSet++;
      consecutiveCorrect = 0;
      return;
    }
    consecutiveCorrect++;
    correctRun++;
    if (consecutiveCorrect >= runToShift) {
      stats.categories++;
      stats.trialsToFirstCategory ??= i + 1;
      consecutiveCorrect = 0;
    }
  });
  closeRun();
  return stats;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
