/**
 * PVT (Psychomotor Vigilance Task) — attenzione sostenuta e vigilanza.
 * @see docs/scientific/pvt.md — Dinges & Powell (1985); Basner & Dinges (2011)
 *
 * Compito semplice di TR a stimolo visivo con ISI variabile. Le misure primarie sono i lapse
 * (RT ≥ 500 ms) e la velocità di risposta (1/RT), indici di fatica e calo attentivo.
 */
import type { SummaryMetric, TrialResult } from '../types';
import { randInt } from '../rng';
import { mean, standardDeviation } from '../validation';

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
