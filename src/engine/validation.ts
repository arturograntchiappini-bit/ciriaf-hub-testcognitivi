/**
 * Validazione automatica dei tempi di reazione e statistiche di base.
 * @see docs/scientific/validazione-rt.md
 *
 * Precedenza dei flag: INTERRUPTED → OMISSION → ANTICIPATION → VALID.
 * I trial invalidati NON vengono scartati: restano nei dati grezzi col loro flag.
 */
import type { TrialResult, ValidationFlag } from './types';

/**
 * Soglia di anticipazione: un RT inferiore non è una risposta cognitivamente
 * guidata ma un riflesso/anticipazione (Whelan, 2008). Vedi docs/scientific.
 */
export const ANTICIPATION_CUTOFF_MS = 150;

/**
 * Classifica un trial in base a RT ed esito temporale.
 * @param rtMs tempo di reazione in ms (null se nessuna risposta)
 * @param responded true se il soggetto ha premuto entro la finestra
 * @param interrupted true se il trial è stato disturbato (perdita focus/visibilità)
 */
export function classifyRt(
  rtMs: number | null,
  responded: boolean,
  interrupted: boolean,
): ValidationFlag {
  if (interrupted) return 'INTERRUPTED';
  if (!responded || rtMs === null) return 'OMISSION';
  if (rtMs < ANTICIPATION_CUTOFF_MS) return 'ANTICIPATION';
  return 'VALID';
}

/** Media aritmetica; 0 su lista vuota. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Deviazione standard campionaria (denominatore n-1).
 * Misura la stabilità/altalena della performance nel tempo.
 * Ritorna 0 se n < 2.
 */
export function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

/** RT dei soli trial VALID e corretti (esclude pratica). */
export function validCorrectRts(trials: readonly TrialResult[]): number[] {
  return trials
    .filter((t) => t.phase === 'test' && t.flag === 'VALID' && t.correct && t.rtMs !== null)
    .map((t) => t.rtMs as number);
}

/** Media degli RT dei trial VALID corretti. */
export function meanRtOfValidCorrect(trials: readonly TrialResult[]): number {
  return mean(validCorrectRts(trials));
}

/** Deviazione standard (campionaria) degli RT dei trial VALID corretti. */
export function sdRtOfValidCorrect(trials: readonly TrialResult[]): number {
  return standardDeviation(validCorrectRts(trials));
}

/** Conta i trial di test con un dato flag. */
export function countFlag(trials: readonly TrialResult[], flag: ValidationFlag): number {
  return trials.filter((t) => t.phase === 'test' && t.flag === flag).length;
}
