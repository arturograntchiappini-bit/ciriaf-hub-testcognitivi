/**
 * SART — Sustained Attention to Response Task: attenzione sostenuta e controllo della risposta.
 * @see docs/scientific/sart.md — Robertson et al. (1997); Manly et al. (1999); Dang et al. (2018)
 *
 * Cifre 1–9 in sequenza pseudo-casuale: si risponde a tutte tranne alla cifra bersaglio (di
 * norma il 3). La risposta diventa un automatismo; l'errore di commissione sul bersaglio è
 * la misura chiave e, per Robertson et al., è preceduto da risposte anormalmente veloci.
 */
import type { SummaryMetric, TrialResult } from '../types';
import { shuffle } from '../rng';
import { mean, standardDeviation, countFlag } from '../validation';
import { criterionC, dPrime } from '../sdt';

export interface SartParams {
  /** Numero di trial; un multiplo di 9 assegna lo stesso numero di presentazioni a ogni cifra. */
  nTrials: number;
  /** Cifra da non rispondere (1–9). */
  targetDigit: number;
  /** Durata della cifra (ms). */
  digitMs: number;
  /** Durata della maschera che segue la cifra (ms): la finestra di risposta è digitMs + maskMs. */
  maskMs: number;
  practiceTrials: number;
}

export interface SartStimulus {
  digit: number;
  /** Indice in `SART_FONT_SIZES_PX`: il corpo varia per scoraggiare il confronto percettivo con una sagoma. */
  sizeIndex: number;
}

export const SART_DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Cinque corpi del carattere (px). Sono quelli dei porting pubblici del compito (PsyToolkit);
 * il testo originale non è stato consultato, quindi sono una convenzione e non un dato di Robertson et al.
 */
export const SART_FONT_SIZES_PX: readonly number[] = [48, 72, 94, 100, 120];

/** Trial di una sequenza valutati prima di un errore di commissione (scelta di progetto). */
export const PRE_ERROR_WINDOW = 4;

const ARRANGE_ATTEMPTS = 500;

/**
 * Genera la sequenza: ogni cifra compare lo stesso numero di volte (le eventuali cifre in
 * più sono estratte a caso), mai due cifre uguali di seguito, corpi del carattere bilanciati.
 */
export function generateSart(params: SartParams, rand: () => number): SartStimulus[] {
  const digits = arrangeDigits(digitCounts(params.nTrials, rand), rand);
  const sizes = shuffle(
    Array.from({ length: digits.length }, (_, i) => i % SART_FONT_SIZES_PX.length),
    rand,
  );
  return digits.map((digit, i) => ({ digit, sizeIndex: sizes[i] as number }));
}

function digitCounts(nTrials: number, rand: () => number): Map<number, number> {
  const base = Math.floor(nTrials / SART_DIGITS.length);
  const extra = new Set(shuffle(SART_DIGITS, rand).slice(0, nTrials - base * SART_DIGITS.length));
  return new Map(SART_DIGITS.map((digit) => [digit, base + (extra.has(digit) ? 1 : 0)]));
}

/** Dispone le cifre senza ripetizioni immediate; ritenta se resta solo la cifra appena usata. */
function arrangeDigits(counts: ReadonlyMap<number, number>, rand: () => number): number[] {
  for (let attempt = 0; attempt < ARRANGE_ATTEMPTS; attempt++) {
    const sequence = tryArrange(counts, rand);
    if (sequence) return sequence;
  }
  return separateRepeats(shuffle([...counts].flatMap(([digit, n]) => Array<number>(n).fill(digit)), rand));
}

function tryArrange(counts: ReadonlyMap<number, number>, rand: () => number): number[] | null {
  const left = new Map(counts);
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const sequence: number[] = [];
  for (let i = 0; i < total; i++) {
    const options = [...left].filter(([digit, n]) => n > 0 && digit !== sequence[i - 1]);
    const weight = options.reduce((sum, [, n]) => sum + n, 0);
    if (weight === 0) return null;
    let ticket = rand() * weight;
    const [digit] = options.find(([, n]) => (ticket -= n) < 0) ?? (options[options.length - 1] as [number, number]);
    sequence.push(digit);
    left.set(digit, (left.get(digit) as number) - 1);
  }
  return sequence;
}

/** Ripiego: scambia ogni cifra uguale alla precedente con una successiva diversa, se esiste. */
function separateRepeats(sequence: number[]): number[] {
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) continue;
    const swap = sequence.findIndex((digit, j) => j > i && digit !== sequence[i] && digit !== sequence[i + 1]);
    if (swap > 0) [sequence[i], sequence[swap]] = [sequence[swap] as number, sequence[i] as number];
  }
  return sequence;
}

/**
 * Il partecipante ha premuto (anche in anticipo). Si guarda la risposta registrata, non il flag: il
 * sequencer marca VALID anche un No-Go correttamente trattenuto (nessuna risposta).
 */
const isResponded = (t: TrialResult): boolean => t.response !== null && t.flag !== 'INTERRUPTED';
const isValidTrial = (t: TrialResult): boolean => t.flag !== 'INTERRUPTED';
const isUsableGoRt = (t: TrialResult): boolean => t.condition === 'go' && t.flag === 'VALID' && t.correct && t.rtMs !== null;

/**
 * RT dei Go nei `window` trial che precedono ciascuna commissione (Robertson et al., 1997: gli errori
 * sono preceduti da risposte anormalmente veloci). Un trial vicino a più errori conta una volta sola.
 */
export function reactionTimesBeforeCommissions(trials: readonly TrialResult[], window = PRE_ERROR_WINDOW): number[] {
  const picked = new Set<number>();
  trials.forEach((t, i) => {
    if (t.condition !== 'nogo' || !isResponded(t)) return;
    for (let k = Math.max(0, i - window); k < i; k++) if (isUsableGoRt(trials[k] as TrialResult)) picked.add(k);
  });
  return [...picked].map((k) => (trials[k] as TrialResult).rtMs as number);
}

/**
 * Metriche: commissioni (risposte sul bersaglio) e omissioni (cifre senza risposta), RT medio/SD/CV
 * dei Go, d' e criterio c (hit = risposta a un Go, falso allarme = risposta al bersaglio), RT prima
 * delle commissioni. I trial interrotti sono esclusi da numeratori e denominatori.
 */
export function scoreSart(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const goTrials = test.filter((t) => t.condition === 'go' && isValidTrial(t));
  const targetTrials = test.filter((t) => t.condition === 'nogo' && isValidTrial(t));

  const hits = goTrials.filter(isResponded).length;
  const commissions = targetTrials.filter(isResponded).length;
  const omissions = goTrials.length - hits;

  const goRts = test.filter(isUsableGoRt).map((t) => t.rtMs as number);
  const meanGo = mean(goRts);
  const sdGo = standardDeviation(goRts);
  const preErrorRts = reactionTimesBeforeCommissions(test);
  const hasPreError = preErrorRts.length > 0 && goRts.length > 0;

  return [
    { label: 'Errori di commissione (bersaglio)', value: commissions },
    { label: 'Tasso di commissione', value: round1(rate(commissions, targetTrials.length)), unit: '%' },
    { label: 'Errori di omissione (cifre Go)', value: omissions },
    { label: 'Tasso di omissione', value: round1(rate(omissions, goTrials.length)), unit: '%' },
    { label: 'RT medio Go', value: round1(meanGo), unit: 'ms' },
    { label: 'SD RT Go', value: round1(sdGo), unit: 'ms' },
    { label: 'CV RT Go', value: round1(meanGo > 0 ? (sdGo / meanGo) * 100 : 0), unit: '%' },
    { label: "Sensibilità d'", value: round2(dPrime(hits, goTrials.length, commissions, targetTrials.length)) },
    { label: 'Criterio decisionale (c)', value: round2(criterionC(hits, goTrials.length, commissions, targetTrials.length)) },
    { label: `RT medio nei ${PRE_ERROR_WINDOW} Go prima di una commissione`, value: hasPreError ? round1(mean(preErrorRts)) : '—', unit: hasPreError ? 'ms' : undefined },
    { label: 'Variazione di RT prima delle commissioni (vs RT medio Go)', value: hasPreError ? round1(mean(preErrorRts) - meanGo) : '—', unit: hasPreError ? 'ms' : undefined },
    { label: 'Errori di anticipazione', value: countFlag(trials, 'ANTICIPATION') },
  ];
}

function rate(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
