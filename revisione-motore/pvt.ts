/**
 * ============================================================================
 *  COPIA STANDALONE — PVT — Psychomotor Vigilance Task
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/pvt.ts
 *  Riferimenti scientifici:       docs/scientific/pvt.md — Dinges & Powell (1985); Basner & Dinges (2011)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/pvt.ts
 *
 *  Risposta a uno stimolo che compare dopo un ISI casuale; metriche: lapse (RT ≥ 500 ms o omissione) e 1/RT.
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation,sdt}) ===== */
/* Generate da scripts/sync-revisione-motore.mjs: non modificarle a mano. */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

type Phase = 'practice' | 'test';

type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst' | 'pvt' | 'flanker' | 'sart' | 'visualSearch' | 'mentalRotation' | 'trailMaking';

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

function randInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Deviazione standard campionaria (denominatore n-1).
 * Misura la stabilità/altalena della performance nel tempo.
 * Ritorna 0 se n < 2.
 */
function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

/* ============================ CORE DEL TEST ============================ */

export interface PvtParams {
  nTrials: number;
  /** Durata massima dello stimolo (ms): oltre = omissione. */
  stimulusMaxMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  practiceTrials: number;
}

export interface PvtStimulus {
  /** Pausa (ISI) dopo questo trial, prima dello stimolo successivo (ms). */
  isiMs: number;
}

/**
 * Genera la sequenza di trial PVT: ogni trial ha un ISI random in [isiMin, isiMax].
 * La condizione è sempre la stessa ('pvt') — ogni trial richiede risposta.
 */
export function generatePvt(params: PvtParams, rand: () => number): PvtStimulus[] {
  return Array.from({ length: params.nTrials }, () => ({
    isiMs: randInt(params.isiMinMs, params.isiMaxMs, rand),
  }));
}

/** Soglia di lapse del PVT a 10 minuti: RT ≥ 500 ms (Basner & Dinges, 2011). */
export const LAPSE_THRESHOLD_MS = 500;
const TAIL_FRACTION = 0.1; // «fastest/slowest 10%»

/** Mediana con la media dei due valori centrali su un numero pari di elementi. */
function median(sorted: readonly number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function tailSize(n: number): number {
  return Math.max(1, Math.ceil(n * TAIL_FRACTION));
}

/**
 * Metriche PVT. Un lapse è un RT ≥ 500 ms **oppure** nessuna risposta entro il tempo massimo
 * (che è un RT più lungo ancora). Il tasso di lapse è calcolato sui trial con risposta valida o
 * omissione: anticipazioni e trial interrotti ne sono esclusi. Si riportano anche la velocità di
 * risposta (1/RT) e la media del 10% più lento, raccomandate come misure primarie da Basner e
 * Dinges (2011) al posto di media e mediana degli RT.
 */
export function scorePvt(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test' && t.flag !== 'INTERRUPTED');

  const rts = test
    .filter((t) => t.flag === 'VALID' && t.response !== null && t.rtMs !== null)
    .map((t) => t.rtMs as number)
    .sort((a, b) => a - b);
  const nValid = rts.length;

  const nOmissions = test.filter((t) => t.flag === 'OMISSION').length;
  const nAnticipations = test.filter((t) => t.flag === 'ANTICIPATION').length;
  const nLapses = rts.filter((rt) => rt >= LAPSE_THRESHOLD_MS).length + nOmissions;
  const lapseRate = nValid + nOmissions > 0 ? (nLapses / (nValid + nOmissions)) * 100 : 0;

  const speeds = rts.map((rt) => 1000 / rt).sort((a, b) => a - b); // 1/s, dal più lento
  const k = tailSize(nValid);

  return [
    { label: 'Lapses (RT ≥ 500 ms o nessuna risposta)', value: nLapses },
    { label: 'Tasso di lapse', value: round1(lapseRate), unit: '%' },
    { label: 'Velocità di risposta media (1/RT)', value: round2(mean(speeds)), unit: '1/s' },
    { label: 'Velocità media del 10% più lento (1/RT)', value: round2(mean(speeds.slice(0, k))), unit: '1/s' },
    { label: 'RT medio', value: round1(mean(rts)), unit: 'ms' },
    { label: 'RT mediano', value: round1(median(rts)), unit: 'ms' },
    { label: 'SD RT', value: round1(standardDeviation(rts)), unit: 'ms' },
    { label: 'Media fastest 10%', value: round1(mean(rts.slice(0, k))), unit: 'ms' },
    { label: 'Media slowest 10%', value: round1(mean(rts.slice(-k))), unit: 'ms' },
    { label: 'Anticipazioni (< 150 ms)', value: nAnticipations },
    { label: 'Omissioni', value: nOmissions },
  ];
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ================================ DEMO ================================ */
(function demo(): void {
  const params: PvtParams = { nTrials: 8, stimulusMaxMs: 10000, isiMinMs: 2000, isiMaxMs: 10000, practiceTrials: 0 };
  const seq = generatePvt(params, mulberry32(7));
  console.log(`PVT demo — ${seq.length} trial, ISI (ms): ${seq.map((s) => s.isiMs).join(', ')}`);
  console.log(`Soglia di lapse: ${LAPSE_THRESHOLD_MS} ms`);
})();
