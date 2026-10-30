/**
 * Persistenza delle impostazioni in localStorage, con merge robusto sui default
 * (i parametri mancanti o corrotti ricadono sul default).
 * @see docs/architettura.md — sezione "Impostazioni"
 */
import { DEFAULTS, type AllParams } from '../config/defaults';
import { sanitizeParams } from './params/sanitize';

const STORAGE_KEY = 'ciriaf-cth-settings-v1';

/** Merge per-test: ogni campo mancante, non numerico o fuori scala ricade sul default (vedi sanitizeParams). */
function mergeWithDefaults(stored: unknown): AllParams {
  const source = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};
  const result = structuredCloneSafe(DEFAULTS);
  for (const key of Object.keys(DEFAULTS) as (keyof AllParams)[]) {
    (result as unknown as Record<string, unknown>)[key] = sanitizeParams(key, Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined);
  }
  return result;
}

function structuredCloneSafe(obj: AllParams): AllParams {
  return JSON.parse(JSON.stringify(obj)) as AllParams;
}

/** Carica le impostazioni; ritorna i default se lo storage è vuoto o non valido. */
export function loadSettings(): AllParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredCloneSafe(DEFAULTS);
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return structuredCloneSafe(DEFAULTS);
  }
}

/** Salva le impostazioni. */
export function saveSettings(settings: AllParams): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Ripristina i default (rimuove la chiave di storage). */
export function resetSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
