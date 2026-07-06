/**
 * Persistenza delle impostazioni in localStorage, con merge robusto sui default
 * (i parametri mancanti o corrotti ricadono sul default).
 * @see docs/architettura.md — sezione "Impostazioni"
 */
import { DEFAULTS, type AllParams } from '../config/defaults';

const STORAGE_KEY = 'ciriaf-cth-settings-v1';

/** Merge superficiale per-test: ogni campo mancante ricade sul default. */
function mergeWithDefaults(stored: unknown): AllParams {
  const result = structuredCloneSafe(DEFAULTS);
  if (typeof stored !== 'object' || stored === null) return result;
  const s = stored as Record<string, unknown>;
  for (const key of Object.keys(DEFAULTS) as (keyof AllParams)[]) {
    const testStored = s[key];
    if (typeof testStored === 'object' && testStored !== null) {
      result[key] = { ...result[key], ...(testStored as object) } as AllParams[typeof key];
    }
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
