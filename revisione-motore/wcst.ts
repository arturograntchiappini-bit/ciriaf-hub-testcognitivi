/**
 * ============================================================================
 *  COPIA STANDALONE — Wisconsin Card Sorting Test (flessibilità / set-shifting)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/wcst.ts
 *  Documento di accompagnamento:  revisione-motore/wcst.md
 *  Riferimenti scientifici:       docs/scientific/wcst.md — Berg (1948); Grant & Berg (1948); Heaton; Kongs et al. (2000)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/wcst.ts
 *
 *  Il criterio di classificazione (Colore→Forma→Numero, ciclico) cambia in segreto
 *  dopo N risposte corrette consecutive. Il feedback è solo "Corretto"/"Errato".
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng}) ===== */

interface TrialResult {
  phase: 'practice' | 'test';
  flag: 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';
}

interface SummaryMetric {
  label: string;
  value: string | number;
  unit?: string;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates: ritorna una NUOVA lista permutata, senza mutare l'originale. */
function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/* ============================ CORE DEL TEST ============================ */

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

/**
 * Scoring secondo l'operazionalizzazione del principio perseverativo di Heaton:
 * - il "principio perseverato" (PP) si stabilisce al primo errore non ambiguo
 *   (la carta scelta combacia su UNA sola dimensione, diversa dalla regola);
 * - dopo il completamento di una categoria, il PP diventa la regola appena abbandonata;
 * - un errore è "perseverativo" se combacia col PP corrente (e il PP non è la regola attuale).
 * Vedi docs/scientific/wcst.md per la definizione completa e i limiti.
 */
export function scoreWcst(
  trials: readonly TrialResult[],
  metas: readonly WcstTrialMeta[],
  params: WcstParams,
): SummaryMetric[] {
  let categories = 0;
  let consecutiveCorrect = 0;
  let totalErrors = 0;
  let perseverativeErrors = 0;
  let failureToMaintainSet = 0;
  let perseveratedPrinciple: WcstDim | null = null;

  // Indici aggiuntivi (Heaton).
  let correctRun = 0; // corse di corrette consecutive, NON azzerate dallo shift
  let conceptualResponses = 0; // risposte in corse di ≥3 corrette consecutive (CLR)
  let trialsToFirstCategory: number | null = null;

  const test = trials.filter((t) => t.phase === 'test' && t.flag !== 'INTERRUPTED');

  for (let i = 0; i < test.length; i++) {
    const meta = metas[i];
    if (!meta) continue;
    const correct = meta.matchedDims.includes(meta.currentRule);

    if (!correct) {
      totalErrors++;
      // Chiudi l'eventuale corsa concettuale (≥3 corrette) prima dell'errore.
      if (correctRun >= 3) conceptualResponses += correctRun;
      correctRun = 0;
      // Stabilisce il PP al primo errore non ambiguo.
      if (perseveratedPrinciple === null && meta.matchedDims.length === 1) {
        const only = meta.matchedDims[0] as WcstDim;
        if (only !== meta.currentRule) perseveratedPrinciple = only;
      }
      // Conta come perseverativo se combacia col PP e il PP non è la regola attuale.
      if (
        perseveratedPrinciple !== null &&
        meta.matchedDims.includes(perseveratedPrinciple) &&
        perseveratedPrinciple !== meta.currentRule
      ) {
        perseverativeErrors++;
      }
      // Failure to maintain set: 5–9 corrette consecutive interrotte da un errore.
      if (consecutiveCorrect >= 5 && consecutiveCorrect <= 9) {
        failureToMaintainSet++;
      }
      consecutiveCorrect = 0;
    } else {
      consecutiveCorrect++;
      correctRun++;
      if (consecutiveCorrect >= params.runToShift) {
        categories++;
        if (trialsToFirstCategory === null) trialsToFirstCategory = i + 1;
        perseveratedPrinciple = meta.currentRule; // perseverare verso la regola appena abbandonata
        consecutiveCorrect = 0;
      }
    }
  }
  // Chiudi l'ultima corsa concettuale aperta a fine test.
  if (correctRun >= 3) conceptualResponses += correctRun;

  const nonPerseverativeErrors = totalErrors - perseverativeErrors;
  const pct = (n: number): number => (test.length > 0 ? round1((n / test.length) * 100) : 0);

  return [
    { label: 'Categorie completate', value: categories },
    { label: 'Trial totali', value: test.length },
    { label: 'Errori totali', value: totalErrors },
    { label: 'Errori perseverativi', value: perseverativeErrors },
    { label: '% errori perseverativi', value: pct(perseverativeErrors), unit: '%' },
    { label: 'Errori non perseverativi', value: nonPerseverativeErrors },
    { label: 'Failure to maintain set', value: failureToMaintainSet },
    { label: 'Risposte a livello concettuale', value: pct(conceptualResponses), unit: '%' },
    { label: 'Trial per la 1ª categoria', value: trialsToFirstCategory ?? test.length },
  ];
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/* ================================ DEMO ================================ */
// Copia di sola revisione: esegui con `npx tsx revisione-motore/wcst.ts`.
(function demo(): void {
  const rand = mulberry32(2024);
  const deck = buildDeck(128, rand);
  console.log(`WCST demo — mazzo di ${deck.length} carte, prime 6: ${deck.slice(0, 6).map((c) => `${c.color[0]}${c.shape[0]}${c.number}`).join(' ')}`);
  const target = WCST_STIMULUS_CARDS[0]; // red/triangle/1
  const choice: WcstCard = { color: 'red', shape: 'star', number: 3 }; // combacia solo su color
  console.log(`Carta rossa/star/3 vs bersaglio red/triangle/1 → combacia su: ${matchingDims(target, choice).join(', ')}`);
  console.log(`Regole per categoria 0..3: ${[0, 1, 2, 3].map(ruleForCategory).join(' → ')}`);
})();
