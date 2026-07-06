/**
 * Tipi condivisi del motore. Nessun import da React: il motore è puro e
 * unit-testabile senza browser.
 * @see docs/architettura.md
 */

/** Esito di validazione di un singolo trial. */
export type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

/** Fase della somministrazione: la pratica è esclusa dalle metriche. */
export type Phase = 'practice' | 'test';

/** Identificatore dei test disponibili. */
export type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst';

/** Risultato grezzo di un singolo trial. Mai scartato: gli invalidi restano col flag. */
export interface TrialResult {
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

/** Una metrica di sintesi mostrata nella schermata risultati e negli export. */
export interface SummaryMetric {
  /** Etichetta leggibile in italiano. */
  label: string;
  value: string | number;
  /** Unità di misura opzionale (es. 'ms', '%'). */
  unit?: string;
}

/** Risultato completo di una somministrazione di un test. */
export interface TestResult {
  testId: TestId;
  sessionId: string;
  /** Data/ora di inizio in formato ISO 8601. */
  startedAt: string;
  /** Parametri effettivamente usati (scritti negli export per riproducibilità). */
  params: Record<string, unknown>;
  /** Tutti i trial, pratica inclusa (distinguibile via `phase`). */
  trials: TrialResult[];
  summary: SummaryMetric[];
}
