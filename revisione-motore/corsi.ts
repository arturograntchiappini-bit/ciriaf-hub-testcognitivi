/**
 * ============================================================================
 *  COPIA STANDALONE — Corsi Block-Tapping Task (memoria visuo-spaziale)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/corsi.ts
 *  Documento di accompagnamento:  revisione-motore/corsi.md
 *  Riferimenti scientifici:       docs/scientific/corsi.md — Corsi (1972); Kessels et al. (2000); coordinate via PEBL
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/corsi.ts
 *
 *  Layout fisso e asimmetrico di 9 blocchi. Ad ogni livello, 2 trial con sequenze
 *  diverse ma di pari "indice di complessità" (stessa distanza percorsa e stesso
 *  numero di incroci geometrici). Regola di arresto: fallimento di entrambi i trial.
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation,sdt}) ===== */
/* Generate da scripts/sync-revisione-motore.mjs: non modificarle a mano. */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

type Phase = 'practice' | 'test';

type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst' | 'pvt' | 'flanker' | 'sart';

interface TrialResult {
  testId: TestId;
  sessionId: string;
  trialIndex: number;
  phase: Phase;
  /** Etichetta della condizione sperimentale (es. 'congruent', 'go', 'target'). */
  condition: string;
  /** Rappresentazione serializzabile dello stimolo mostrato. */
  stimulus: string;
  /** Tasto/azione registrata, oppure null se nessuna risposta (omissione). */
  response: string | null;
  correct: boolean;
  /** Tempo di reazione in ms; null se omissione. */
  rtMs: number | null;
  flag: ValidationFlag;
  /** performance.now() al paint dello stimolo (riferimento del cronometro). */
  onsetTimestamp: number;
}

interface SummaryMetric {
  /** Etichetta leggibile in italiano. */
  label: string;
  value: string | number;
  /** Unità di misura opzionale (es. 'ms', '%'). */
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

export interface Point {
  x: number;
  y: number;
}

/**
 * Coordinate dei 9 blocchi sul piano 0–100 (convenzione cartesiana, origine in
 * basso; per lo schermo y-down usare 100 − y). Derivate dai valori nativi in mm
 * di Kessels et al. (2000) come implementati in PEBL (Mueller & Piper, 2014).
 */
export const CORSI_BLOCKS: readonly Point[] = [
  { x: 61.7, y: 81.5 }, // 1
  { x: 15.0, y: 76.8 }, // 2
  { x: 85.0, y: 65.2 }, // 3
  { x: 33.7, y: 60.5 }, // 4
  { x: 66.3, y: 51.2 }, // 5
  { x: 92.0, y: 37.2 }, // 6
  { x: 8.0, y: 32.5 }, // 7
  { x: 36.0, y: 18.5 }, // 8
  { x: 64.0, y: 23.2 }, // 9
];

export interface CorsiParams {
  startLength: number;
  maxLength: number;
  trialsPerLevel: number;
  presentMsPerBlock: number;
  /** Tolleranza (unità piano) sulla distanza totale per considerare pari complessità. */
  complexityTolerance: number;
}

export interface CorsiSequence {
  indices: number[];
  pathLength: number;
  crossings: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distanza totale percorsa dal cursore lungo la sequenza. */
export function pathLength(seq: readonly number[], blocks: readonly Point[] = CORSI_BLOCKS): number {
  let total = 0;
  for (let i = 1; i < seq.length; i++) {
    total += distance(blocks[seq[i - 1]!]!, blocks[seq[i]!]!);
  }
  return total;
}

function orientation(a: Point, b: Point, c: Point): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

/** Vero se i segmenti ab e cd si intersecano propriamente (interni, senza estremi comuni). */
function properlyIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 === 0 || o2 === 0 || o3 === 0 || o4 === 0) return false; // collineari/tocco = non conta
  return o1 !== o2 && o3 !== o4;
}

/** Numero di incroci geometrici tra i segmenti non adiacenti del percorso. */
export function countCrossings(seq: readonly number[], blocks: readonly Point[] = CORSI_BLOCKS): number {
  const pts = seq.map((i) => blocks[i]!);
  let crossings = 0;
  const nSeg = pts.length - 1;
  for (let i = 0; i < nSeg; i++) {
    for (let j = i + 2; j < nSeg; j++) {
      // salta segmenti adiacenti (condividono un estremo)
      if (i === 0 && j === nSeg - 1 && pts[0] === pts[nSeg]) continue;
      if (properlyIntersect(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)) crossings++;
    }
  }
  return crossings;
}

function complexityOf(indices: number[], blocks: readonly Point[]): CorsiSequence {
  return { indices, pathLength: pathLength(indices, blocks), crossings: countCrossings(indices, blocks) };
}

/**
 * Forma canonica di una sequenza. Una sequenza e il suo ROVESCIO percorrono la
 * stessa traiettoria: hanno `pathLength` e incroci identici, quindi un criterio
 * che cerca la coppia più simile per difficoltà le sceglierebbe sempre. Sono la
 * stessa traiettoria e vanno trattate come un unico candidato.
 */
function canonicalKey(indices: readonly number[]): string {
  const forward = indices.join('-');
  const backward = [...indices].reverse().join('-');
  return forward < backward ? forward : backward;
}

/**
 * Distanza media fra due blocchi distinti del layout. È una proprietà pura della
 * tavoletta: non dipende dal seed né dalla somministrazione.
 */
export function meanPairwiseDistance(blocks: readonly Point[] = CORSI_BLOCKS): number {
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < blocks.length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i === j) continue;
      sum += distance(blocks[i] as Point, blocks[j] as Point);
      pairs++;
    }
  }
  return pairs === 0 ? 0 : sum / pairs;
}

/**
 * BERSAGLIO di difficoltà del livello: la distanza attesa di una sequenza casuale
 * di questa lunghezza. Ogni passo di una permutazione casuale è una coppia di
 * blocchi distinti estratta uniformemente, quindi il valore atteso del percorso è
 * esattamente `(length − 1) × distanza media`. Essendo calcolato dal layout e non
 * campionato, è IDENTICO in ogni somministrazione: è ciò che rende confrontabili
 * fra loro run diverse.
 */
export function targetPathLength(length: number, blocks: readonly Point[] = CORSI_BLOCKS): number {
  return Math.max(0, length - 1) * meanPairwiseDistance(blocks);
}

/**
 * Enumera tutti i gruppi ammissibili di `count` sequenze a PARI numero di incroci
 * e con ampiezza di distanza entro `maxSpread`, poi ne estrae uno A SORTE.
 *
 * Le due proprietà nascono qui, da meccanismi separati:
 * - l'ammissibilità (pari incroci + ampiezza limitata) tiene il livello omogeneo
 *   al suo INTERNO, qualunque gruppo esca;
 * - l'estrazione a sorte fra tutti i gruppi ammissibili rende ogni RUN diversa.
 *
 * I gruppi sono finestre contigue sull'ordinamento per distanza: cercare fra le
 * combinazioni non contigue non aggiungerebbe nulla, perché una finestra contigua
 * ha sempre ampiezza minima o uguale a parità di estremi.
 */
function pickUniformGroup(
  pool: readonly CorsiSequence[],
  count: number,
  maxSpread: number,
  rand: () => number,
): CorsiSequence[] | null {
  const byCrossings = new Map<number, CorsiSequence[]>();
  for (const c of pool) {
    const arr = byCrossings.get(c.crossings) ?? [];
    arr.push(c);
    byCrossings.set(c.crossings, arr);
  }

  const eligible: CorsiSequence[][] = [];
  for (const group of byCrossings.values()) {
    if (group.length < count) continue;
    const sorted = [...group].sort((a, b) => a.pathLength - b.pathLength);
    for (let i = 0; i + count <= sorted.length; i++) {
      const spread =
        (sorted[i + count - 1] as CorsiSequence).pathLength - (sorted[i] as CorsiSequence).pathLength;
      if (spread <= maxSpread) eligible.push(sorted.slice(i, i + count));
    }
  }
  if (eligible.length === 0) return null;
  return eligible[Math.floor(rand() * eligible.length)] as CorsiSequence[];
}

/**
 * Genera `count` sequenze DISTINTE della lunghezza data, soddisfacendo due
 * requisiti che agiscono su assi diversi:
 *
 * 1. **Difficoltà equivalente fra le run** — le sequenze devono cadere entro
 *    `complexityTolerance` dal BERSAGLIO del livello (§ `targetPathLength`), che
 *    è una costante del layout. Senza questo ancoraggio la difficoltà assoluta di
 *    uno stesso livello varia liberamente da un partecipante all'altro.
 * 2. **Ogni run diversa** — dentro quella banda la scelta è casuale (gruppo di
 *    incroci e ancora), così due somministrazioni con seed diversi non ricevono
 *    le stesse sequenze.
 *
 * Resta garantita l'omogeneità DENTRO il livello: stesso numero di incroci e
 * distanze ravvicinate fra le sequenze estratte.
 *
 * Se la banda è troppo povera per formare un gruppo a incroci uniformi, ripiega
 * sulle sequenze più vicine al bersaglio — mai su un campione arbitrario.
 */
export function generateBalancedSequences(
  length: number,
  count: number,
  params: CorsiParams,
  rand: () => number,
  blocks: readonly Point[] = CORSI_BLOCKS,
): CorsiSequence[] {
  const nBlocks = blocks.length;
  const allIndices = Array.from({ length: nBlocks }, (_, i) => i);

  const SAMPLES = 2000; // tetto ai campionamenti (evita loop infiniti su lunghezze estreme)
  const target = targetPathLength(length, blocks);
  const candidates: CorsiSequence[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < SAMPLES; i++) {
    const perm = shuffle(allIndices, rand).slice(0, length);
    const key = canonicalKey(perm);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(complexityOf(perm, blocks));
  }

  const tolerance = params.complexityTolerance;
  const band = candidates.filter((c) => Math.abs(c.pathLength - target) <= tolerance);

  // Scala di degradazione: si cede una garanzia per volta, mai entrambe insieme.
  // 1. banda + ampiezza entro tolleranza — il caso normale, entrambe soddisfatte.
  const ideal = pickUniformGroup(band, count, tolerance, rand);
  if (ideal) return ideal;
  // 2. banda senza vincolo di ampiezza — resta l'equivalenza FRA le run.
  const inBand = pickUniformGroup(band, count, Infinity, rand);
  if (inBand) return inBand;
  // 3. fuori banda: le più vicine al bersaglio, ancora a pari incroci.
  const nearest = [...candidates].sort(
    (a, b) => Math.abs(a.pathLength - target) - Math.abs(b.pathLength - target),
  );
  const relaxed = nearest.slice(0, Math.max(count * 20, 50));
  return pickUniformGroup(relaxed, count, Infinity, rand) ?? nearest.slice(0, count);
}

/**
 * Punteggio Corsi ponderato (cumulativo). Assume superati i livelli sotto
 * `startLength` (baseline `startLength − 1`, poiché la somministrazione parte da
 * lì) e aggiunge 0.5 per ogni trial superato — con 2 trial per livello, superare
 * entrambi i trial di lunghezza L porta il punteggio esattamente a L. Ritorna 0
 * se nessun trial è stato superato (fallimento al primo livello somministrato).
 */
export function corsiSpan(passedTrials: number, startLength = 2): number {
  if (passedTrials <= 0) return 0;
  return startLength - 1 + 0.5 * passedTrials;
}

/** Regola di arresto: si ferma se entrambi i trial del livello sono falliti. */
export function shouldStop(levelResults: readonly boolean[]): boolean {
  return levelResults.length >= 2 && levelResults.every((r) => !r);
}

/**
 * Metriche cliniche standard:
 * - Span Visuo-Spaziale (MBS, Maximum Block Span): la lunghezza massima di
 *   sequenza riprodotta correttamente — l'indice classico di Corsi.
 * - Punteggio Corsi (Ponderato): punteggio cumulativo ancorato a `startLength`.
 * - Trial totali superati.
 * - Punteggio totale di Kessels et al. (2000): span × numero di sequenze corrette.
 */
export function scoreCorsi(trials: readonly TrialResult[], startLength = 2): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test' && t.flag !== 'INTERRUPTED');
  const passed = test.filter((t) => t.correct);
  const mbs = passed.reduce((max, t) => Math.max(max, t.stimulus.split('-').length), 0);
  return [
    { label: 'Span Visuo-Spaziale (MBS)', value: mbs },
    { label: 'Punteggio Corsi (Ponderato)', value: corsiSpan(passed.length, startLength) },
    { label: 'Trial totali superati', value: passed.length },
    { label: 'Punteggio totale (MBS × superati)', value: mbs * passed.length },
  ];
}

/* ================================ DEMO ================================ */
// Copia di sola revisione: esegui con `npx tsx revisione-motore/corsi.ts`.
(function demo(): void {
  const params: CorsiParams = {
    startLength: 2, maxLength: 9, trialsPerLevel: 2, presentMsPerBlock: 1000, complexityTolerance: 8,
  };
  console.log('Corsi demo — coppie bilanciate per livello (distanza ≈ pari, stessi incroci).');
  console.log('Il bersaglio è costante fra le run; con seed diversi cambiano le sequenze.\n');
  for (const seed of [99, 7]) {
    const rand = mulberry32(seed);
    console.log(`  seed ${seed}`);
    for (let len = 4; len <= 6; len++) {
      const pair = generateBalancedSequences(len, params.trialsPerLevel, params, rand);
      const desc = pair
        .map((s) => `[${s.indices.map((i) => i + 1).join('-')}] d=${s.pathLength.toFixed(1)} x=${s.crossings}`)
        .join('   vs   ');
      console.log(`    livello ${len} (bersaglio ${targetPathLength(len).toFixed(1)}): ${desc}`);
    }
  }
})();
