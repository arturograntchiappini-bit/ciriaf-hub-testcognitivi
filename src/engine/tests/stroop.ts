/**
 * Stroop Task (varianti 1 "focus parola" e 2 "focus colore").
 * @see docs/scientific/stroop.md — Stroop (1935); MacLeod (1991)
 *
 * Stroop 1: rispondere all'iniziale della PAROLA letta (ignorando il colore).
 * Stroop 2: rispondere all'iniziale del COLORE dell'inchiostro (ignorando la parola).
 */
import type { SummaryMetric, TrialResult } from '../types';
import { shuffle } from '../rng';
import { mean, standardDeviation, countFlag } from '../validation';

export type StroopColor = 'ROSSO' | 'VERDE' | 'BLU' | 'GIALLO';
export type StroopVariant = 'stroop1' | 'stroop2';
export type StroopKey = 'R' | 'V' | 'B' | 'G';

export const STROOP_COLORS: readonly StroopColor[] = ['ROSSO', 'VERDE', 'BLU', 'GIALLO'];

/** Mappatura colore/parola → tasto (iniziali univoche in italiano). */
export const STROOP_KEYS: Record<StroopColor, StroopKey> = {
  ROSSO: 'R',
  VERDE: 'V',
  BLU: 'B',
  GIALLO: 'G',
};

export interface StroopParams {
  /** Numero totale di trial (metà congruenti, metà incongruenti). */
  nTrials: number;
  fixationMs: number;
  timeoutMs: number;
  isiMs: number;
  practiceTrials: number;
}

export interface StroopStimulus {
  word: StroopColor;
  color: StroopColor;
  congruent: boolean;
}

const MAX_RUN = 3; // max ripetizioni consecutive dello stesso colore o parola

function violatesRun(seq: readonly StroopStimulus[]): boolean {
  let colorRun = 1;
  let wordRun = 1;
  for (let i = 1; i < seq.length; i++) {
    const prev = seq[i - 1] as StroopStimulus;
    const cur = seq[i] as StroopStimulus;
    colorRun = cur.color === prev.color ? colorRun + 1 : 1;
    wordRun = cur.word === prev.word ? wordRun + 1 : 1;
    if (colorRun > MAX_RUN || wordRun > MAX_RUN) return true;
  }
  return false;
}

/**
 * Genera la lista di stimoli bilanciata: metà congruenti (parola=colore),
 * metà incongruenti (parola≠colore, ogni parola e ogni colore equamente
 * rappresentati). L'ordine è randomizzato con vincolo di max 3 ripetizioni
 * consecutive dello stesso colore o della stessa parola.
 */
export function generateStroop(params: StroopParams, rand: () => number): StroopStimulus[] {
  const half = Math.floor(params.nTrials / 2);
  const congruent: StroopStimulus[] = [];
  const incongruent: StroopStimulus[] = [];

  // Congruenti: distribuiti equamente sui 4 colori.
  for (let i = 0; i < half; i++) {
    const color = STROOP_COLORS[i % STROOP_COLORS.length] as StroopColor;
    congruent.push({ word: color, color, congruent: true });
  }

  // Incongruenti: ogni parola accoppiata ai colori diversi, in modo bilanciato.
  const pairs: StroopStimulus[] = [];
  for (const word of STROOP_COLORS) {
    for (const color of STROOP_COLORS) {
      if (color !== word) pairs.push({ word, color, congruent: false });
    }
  }
  // pairs ha 12 combinazioni; ripetiamo ciclicamente fino a `half`.
  for (let i = 0; i < half; i++) {
    incongruent.push(pairs[i % pairs.length] as StroopStimulus);
  }

  const all = [...congruent, ...incongruent];

  // Shuffle con vincolo di run; ritenta fino a soddisfarlo.
  let attempt = shuffle(all, rand);
  for (let k = 0; k < 200 && violatesRun(attempt); k++) {
    attempt = shuffle(all, rand);
  }
  return attempt;
}

/** Tasto corretto per lo stimolo dato la variante. */
export function correctKeyStroop(s: StroopStimulus, variant: StroopVariant): StroopKey {
  return variant === 'stroop1' ? STROOP_KEYS[s.word] : STROOP_KEYS[s.color];
}

/** Rappresentazione serializzabile dello stimolo per l'export. */
export function stroopStimulusLabel(s: StroopStimulus): string {
  return `${s.word}/${s.color}`;
}

function meanRtByCondition(trials: readonly TrialResult[], condition: string): number {
  const rts = trials
    .filter(
      (t) =>
        t.phase === 'test' && t.condition === condition && t.flag === 'VALID' && t.correct && t.rtMs !== null,
    )
    .map((t) => t.rtMs as number);
  return mean(rts);
}

function sdRtByCondition(trials: readonly TrialResult[], condition: string): number {
  const rts = trials
    .filter(
      (t) =>
        t.phase === 'test' && t.condition === condition && t.flag === 'VALID' && t.correct && t.rtMs !== null,
    )
    .map((t) => t.rtMs as number);
  return standardDeviation(rts);
}

function accuracyByCondition(trials: readonly TrialResult[], condition: string): number {
  const relevant = trials.filter(
    (t) => t.phase === 'test' && t.condition === condition && t.flag !== 'INTERRUPTED',
  );
  if (relevant.length === 0) return 0;
  const correct = relevant.filter((t) => t.correct).length;
  return (correct / relevant.length) * 100;
}

/** Metriche di sintesi: accuratezza, RT medio/SD per condizione, effetto interferenza. */
export function scoreStroop(trials: readonly TrialResult[]): SummaryMetric[] {
  const meanCon = meanRtByCondition(trials, 'congruent');
  const meanInc = meanRtByCondition(trials, 'incongruent');
  const sdCon = sdRtByCondition(trials, 'congruent');
  const sdInc = sdRtByCondition(trials, 'incongruent');
  const interference = meanInc - meanCon;
  // Coefficiente di variazione (dispersione normalizzata): variabilità intra-soggetto.
  const cv = (sd: number, m: number): number => (m > 0 ? (sd / m) * 100 : 0);

  return [
    { label: 'Accuratezza congruenti', value: round1(accuracyByCondition(trials, 'congruent')), unit: '%' },
    { label: 'Accuratezza incongruenti', value: round1(accuracyByCondition(trials, 'incongruent')), unit: '%' },
    { label: 'RT medio congruenti', value: round1(meanCon), unit: 'ms' },
    { label: 'RT medio incongruenti', value: round1(meanInc), unit: 'ms' },
    { label: 'SD RT congruenti', value: round1(sdCon), unit: 'ms' },
    { label: 'SD RT incongruenti', value: round1(sdInc), unit: 'ms' },
    { label: 'CV RT congruenti', value: round1(cv(sdCon, meanCon)), unit: '%' },
    { label: 'CV RT incongruenti', value: round1(cv(sdInc, meanInc)), unit: '%' },
    { label: 'Effetto interferenza (inc − con)', value: round1(interference), unit: 'ms' },
    { label: 'Errori di anticipazione', value: countFlag(trials, 'ANTICIPATION') },
    { label: 'Errori di omissione', value: countFlag(trials, 'OMISSION') },
  ];
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
