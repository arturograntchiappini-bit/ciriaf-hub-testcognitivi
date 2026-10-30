/**
 * Sanificazione dei parametri provenienti da fonti non fidate (localStorage, file di protocollo importati).
 * Ogni campo noto deve essere un numero finito, riportato nell'intervallo di `PARAM_SECTIONS`;
 * tutto il resto ricade sul default. Un valore fuori scala (es. nTrials = 1e9) non deve poter bloccare il browser.
 */
import { DEFAULTS, type AllParams } from '../../config/defaults';
import { paramSectionFor } from './paramFields';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Parametri di un test: solo le chiavi note, numeri finiti, dentro i limiti dichiarati. */
export function sanitizeParams<K extends keyof AllParams>(testKey: K, stored: unknown): AllParams[K] {
  const defaults = DEFAULTS[testKey] as unknown as Record<string, number>;
  const source = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};
  const fields = paramSectionFor(testKey)?.fields ?? [];
  const result: Record<string, number> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      result[key] = fallback;
      continue;
    }
    const field = fields.find((f) => f.key === key);
    result[key] = field ? clamp(value, field.min, field.max) : value;
  }
  return result as unknown as AllParams[K];
}

/** true se `key` è una chiave di test nota (corrisponde ai `TestId`). */
export function isTestKey(key: unknown): key is keyof AllParams {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(DEFAULTS, key);
}
