/**
 * Modello dati e stato derivato della modalità Sessione.
 * TypeScript puro: nessuna dipendenza da React o dal DOM.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import type { TestId, TestResult } from '../types';

/** Protocollo riutilizzabile: fasi nominate con pin temporali "t". */
export interface SessionTemplate {
  id: string;
  name: string;
  createdAt: string; // ISO
  phases: SessionPhase[];
}

export interface SessionPhase {
  id: string;
  name: string;
  pins: TimePin[];
}

/** Pin temporale: offset assoluto (scelto liberamente) + batteria di test. */
export interface TimePin {
  id: string;
  offsetMs: number;
  label?: string;
  battery: BatteryItem[];
}

/** Un test della batteria, con impostazioni congelate e pratica opzionale. */
export interface BatteryItem {
  testId: TestId;
  params: Record<string, unknown>;
  practice: boolean;
}

/** Risultato di un test somministrato, con il contesto di sessione. */
export interface SessionTestResult {
  phaseId: string;
  phaseName: string;
  pinId: string;
  offsetMs: number;
  indexInBattery: number;
  result: TestResult;
}

/** Record di esecuzione persistito (per ripresa ed export). */
export interface SessionRun {
  runId: string;
  template: SessionTemplate;
  startedAtEpoch: number;
  startedAtIso: string;
  completedPinIds: string[];
  results: SessionTestResult[];
  finished: boolean;
}

/** Un pin appiattito con la sua fase. */
export interface FlatPin {
  phase: SessionPhase;
  pin: TimePin;
}

/** Pin di tutte le fasi, ordinati per offset globale crescente (stabile). */
export function flattenPins(template: SessionTemplate): FlatPin[] {
  const flat: FlatPin[] = [];
  for (const phase of template.phases) {
    for (const pin of phase.pins) {
      flat.push({ phase, pin });
    }
  }
  return flat.sort((a, b) => a.pin.offsetMs - b.pin.offsetMs);
}

/** Durata di riferimento della timeline: offset dell'ultimo pin (0 se vuota). */
export function sessionTotalMs(template: SessionTemplate): number {
  const flat = flattenPins(template);
  const last = flat[flat.length - 1];
  return last ? last.pin.offsetMs : 0;
}

/** Stato derivato della sessione a un dato istante trascorso. */
export interface SessionState {
  currentPhaseName: string;
  currentPhaseId: string;
  nextPin: TimePin | null;
  upcomingTests: TestId[];
  /** Millisecondi al prossimo pin; ≤ 0 se la batteria è dovuta. */
  countdownMs: number;
  /** Batterie già completate (indice 0-based della prossima). */
  positionIndex: number;
  /** Numero totale di pin. */
  total: number;
  /** true se la prossima batteria è dovuta ora (countdown ≤ 0). */
  due: boolean;
  /** true se tutte le batterie sono state completate. */
  done: boolean;
}

/**
 * Calcola lo stato della sessione dato il tempo trascorso (wall-clock) e i pin
 * già completati. Le batterie si eseguono in ordine di offset; il prossimo pin è
 * il primo non ancora completato. Se il tempo trascorso ha superato il suo offset,
 * la batteria è "dovuta" (countdown ≤ 0).
 */
export function computeSessionState(
  template: SessionTemplate,
  elapsedMs: number,
  completedPinIds: readonly string[],
): SessionState {
  const flat = flattenPins(template);
  const total = flat.length;
  const completed = new Set(completedPinIds);
  const next = flat.find((f) => !completed.has(f.pin.id));

  if (!next) {
    const lastPhase = template.phases[template.phases.length - 1];
    return {
      currentPhaseName: lastPhase ? lastPhase.name : '',
      currentPhaseId: lastPhase ? lastPhase.id : '',
      nextPin: null,
      upcomingTests: [],
      countdownMs: 0,
      positionIndex: total,
      total,
      due: false,
      done: true,
    };
  }

  const countdownMs = next.pin.offsetMs - elapsedMs;
  return {
    currentPhaseName: next.phase.name,
    currentPhaseId: next.phase.id,
    nextPin: next.pin,
    upcomingTests: next.pin.battery.map((b) => b.testId),
    countdownMs,
    positionIndex: completed.size,
    total,
    due: countdownMs <= 0,
    done: false,
  };
}

const RUN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function pad2(v: number): string {
  return v.toString().padStart(2, '0');
}

/** ID di run anonimo, formato `S-XXXX-HHMM`. */
export function makeRunId(now: Date = new Date(), rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += RUN_ALPHABET[Math.floor(rand() * RUN_ALPHABET.length)];
  return `S-${code}-${pad2(now.getHours())}${pad2(now.getMinutes())}`;
}

/** Genera un id opaco per fasi/pin (uso interno del builder). */
export function makeLocalId(prefix: string, rand: () => number = Math.random): string {
  return `${prefix}_${Math.floor(rand() * 1e9).toString(36)}`;
}
