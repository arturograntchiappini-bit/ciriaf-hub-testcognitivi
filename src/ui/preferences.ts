/**
 * Preferenze di somministrazione (separate dai parametri scientifici dei test):
 * opzioni di presentazione persistite in localStorage.
 * @see docs/architettura.md — sezione "Impostazioni"
 */

export interface Preferences {
  /**
   * Se true, durante i test a tempo di reazione (Stroop, Go/No-Go, N-Back) viene
   * mostrato il feedback "Corretto"/"Errato" dopo ogni risposta, come già avviene
   * in pratica. Corsi e WCST mostrano sempre il feedback (parte del paradigma).
   * Default false: di norma i test RT non danno feedback per non alterare i tempi.
   */
  feedbackDuringTest: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  feedbackDuringTest: false,
};

const KEY = 'ciriaf-cth-prefs-v1';

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: Preferences): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
