/**
 * ============================================================================
 *  COPIA STANDALONE — Go/No-Go Task (inibizione motoria rapida)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/gonogo.ts
 *  Documento di accompagnamento:  revisione-motore/gonogo.md
 *  Riferimenti scientifici:       docs/scientific/gonogo.md — Verbruggen & Logan (2008); Wessel (2018)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/gonogo.ts
 *
 *  L'alta frequenza di stimoli Go crea un automatismo di risposta prepotente;
 *  la misura chiave è l'errore di commissione (risposta su No-Go).
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation}) ===== */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

interface TrialResult {
  phase: 'practice' | 'test';
  condition: string; // 'go' | 'nogo'
  correct: boolean;
  rtMs: number | null;
  flag: ValidationFlag;
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

/** Intero uniforme in [min, max] inclusi. */
function randInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

function countFlag(trials: readonly TrialResult[], flag: ValidationFlag): number {
  return trials.filter((t) => t.phase === 'test' && t.flag === flag).length;
}

/* ============================ CORE DEL TEST ============================ */

export interface GoNoGoParams {
  nTrials: number;
  /** Proporzione di stimoli Go (es. 0.75). */
  goRatio: number;
  /** Durata dello stimolo = finestra di risposta (ms). */
  stimulusMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  practiceTrials: number;
}

export type GoNoGoKind = 'go' | 'nogo';

export interface GoNoGoStimulus {
  kind: GoNoGoKind;
  /** ISI (schermo vuoto) che segue questo stimolo, in ms. */
  isiMs: number;
}

const MAX_NOGO_RUN = 2; // mai più di 2 No-Go consecutivi

/**
 * Genera la sequenza Go/No-Go: numero esatto di Go/No-Go dato il rapporto,
 * ordine pseudo-casuale col vincolo di non più di 2 No-Go consecutivi, e ISI
 * uniforme in [isiMin, isiMax] per ogni trial.
 */
export function generateGoNoGo(params: GoNoGoParams, rand: () => number): GoNoGoStimulus[] {
  const nGo = Math.round(params.nTrials * params.goRatio);
  const nNoGo = params.nTrials - nGo;

  const kinds = arrangeKinds(nGo, nNoGo, rand);
  return kinds.map((kind) => ({
    kind,
    isiMs: randInt(params.isiMinMs, params.isiMaxMs, rand),
  }));
}

/** Dispone Go/No-Go rispettando il vincolo anti-cluster sui No-Go. */
function arrangeKinds(nGo: number, nNoGo: number, rand: () => number): GoNoGoKind[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = tryArrange(nGo, nNoGo, rand);
    if (result) return result;
  }
  // Fallback deterministico: intercala i No-Go tra i Go (mai consecutivi).
  return deterministicArrange(nGo, nNoGo);
}

function tryArrange(nGo: number, nNoGo: number, rand: () => number): GoNoGoKind[] | null {
  let goLeft = nGo;
  let noGoLeft = nNoGo;
  let noGoRun = 0;
  const seq: GoNoGoKind[] = [];
  const total = nGo + nNoGo;
  for (let i = 0; i < total; i++) {
    const canNoGo = noGoLeft > 0 && noGoRun < MAX_NOGO_RUN;
    const canGo = goLeft > 0;
    let chooseNoGo: boolean;
    if (!canGo) chooseNoGo = true;
    else if (i === 0) chooseNoGo = false; // il primo trial è sempre Go: instaura la risposta prepotente
    else if (!canNoGo) chooseNoGo = false;
    else chooseNoGo = rand() < noGoLeft / (goLeft + noGoLeft);

    if (chooseNoGo) {
      seq.push('nogo');
      noGoLeft--;
      noGoRun++;
    } else {
      seq.push('go');
      goLeft--;
      noGoRun = 0;
    }
  }
  return goLeft === 0 && noGoLeft === 0 ? seq : null;
}

function deterministicArrange(nGo: number, nNoGo: number): GoNoGoKind[] {
  const seq: GoNoGoKind[] = [];
  let goLeft = nGo;
  let noGoLeft = nNoGo;
  while (goLeft > 0 || noGoLeft > 0) {
    if (goLeft > 0) {
      seq.push('go');
      goLeft--;
    }
    if (noGoLeft > 0 && (goLeft > 0 || seq[seq.length - 1] === 'go')) {
      seq.push('nogo');
      noGoLeft--;
    }
  }
  return seq;
}

/**
 * Metriche: errori di commissione (risposte su No-Go), errori di omissione
 * (mancate risposte su Go), RT medio e SD dei Go corretti validi, anticipazioni.
 */
export function scoreGoNoGo(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const goTrials = test.filter((t) => t.condition === 'go');
  const noGoTrials = test.filter((t) => t.condition === 'nogo');

  const commissionErrors = noGoTrials.filter((t) => t.flag !== 'INTERRUPTED' && !t.correct).length;
  const omissionErrors = goTrials.filter((t) => t.flag === 'OMISSION').length;

  const goRts = goTrials
    .filter((t) => t.flag === 'VALID' && t.correct && t.rtMs !== null)
    .map((t) => t.rtMs as number);

  const commissionRate = noGoTrials.length > 0 ? (commissionErrors / noGoTrials.length) * 100 : 0;
  const omissionRate = goTrials.length > 0 ? (omissionErrors / goTrials.length) * 100 : 0;

  const meanGo = mean(goRts);
  const sdGo = standardDeviation(goRts);
  // Coefficiente di variazione: dispersione normalizzata sulla media, indice
  // robusto di variabilità intra-soggetto (lapse/instabilità attentiva).
  const cvGo = meanGo > 0 ? (sdGo / meanGo) * 100 : 0;

  return [
    { label: 'Errori di commissione (No-Go)', value: commissionErrors },
    { label: 'Tasso di commissione', value: round1(commissionRate), unit: '%' },
    { label: 'Errori di omissione (Go)', value: omissionErrors },
    { label: 'Tasso di omissione', value: round1(omissionRate), unit: '%' },
    { label: 'RT medio Go corretti', value: round1(meanGo), unit: 'ms' },
    { label: 'SD RT Go corretti', value: round1(sdGo), unit: 'ms' },
    { label: 'CV RT Go corretti', value: round1(cvGo), unit: '%' },
    { label: 'Errori di anticipazione', value: countFlag(trials, 'ANTICIPATION') },
  ];
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/* ================================ DEMO ================================ */
// Copia di sola revisione: esegui con `npx tsx revisione-motore/gonogo.ts`.
(function demo(): void {
  const params: GoNoGoParams = {
    nTrials: 40, goRatio: 0.75, stimulusMs: 800, isiMinMs: 500, isiMaxMs: 1000, practiceTrials: 10,
  };
  const seq = generateGoNoGo(params, mulberry32(7));
  const nGo = seq.filter((s) => s.kind === 'go').length;
  let maxNoGoRun = 0;
  let run = 0;
  for (const s of seq) {
    run = s.kind === 'nogo' ? run + 1 : 0;
    maxNoGoRun = Math.max(maxNoGoRun, run);
  }
  console.log(`Go/No-Go demo — ${seq.length} trial, ${nGo} Go / ${seq.length - nGo} No-Go, max No-Go consecutivi = ${maxNoGoRun}`);
  console.log(seq.map((s) => (s.kind === 'go' ? 'G' : '·')).join(''));
})();
