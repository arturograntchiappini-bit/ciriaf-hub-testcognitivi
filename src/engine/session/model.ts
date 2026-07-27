/**
 * Modello dati e stato derivato della modalità Sessione.
 * TypeScript puro: nessuna dipendenza da React o dal DOM.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import type { TestId, TestResult } from '../types';

/** Protocollo riutilizzabile: durata totale e fasi nominate con pin temporali "t". */
export interface SessionTemplate {
  id: string;
  name: string;
  createdAt: string; // ISO
  /** Durata totale della sessione, scelta per prima. */
  totalMs: number;
  phases: SessionPhase[];
}

export interface SessionPhase {
  id: string;
  name: string;
  /** Durata della fase; le fasi tassellano la timeline in ordine. */
  durationMs: number;
  pins: TimePin[];
}

/** Fase con il suo intervallo temporale [startMs, endMs) sulla sessione. */
export interface PhaseSpan {
  phase: SessionPhase;
  startMs: number;
  endMs: number;
}

/** Intervalli delle fasi, calcolati dalle durate cumulative (in ordine). */
export function phaseSpans(template: SessionTemplate): PhaseSpan[] {
  const spans: PhaseSpan[] = [];
  let acc = 0;
  for (const phase of template.phases) {
    spans.push({ phase, startMs: acc, endMs: acc + phase.durationMs });
    acc += phase.durationMs;
  }
  return spans;
}

/** Fase che contiene un dato istante trascorso (l'ultima se oltre la fine). */
export function phaseAtElapsed(template: SessionTemplate, elapsedMs: number): SessionPhase | null {
  const spans = phaseSpans(template);
  if (spans.length === 0) return null;
  const inSpan = spans.find((s) => elapsedMs >= s.startMs && elapsedMs < s.endMs);
  if (inSpan) return inSpan.phase;
  const last = spans[spans.length - 1] as PhaseSpan;
  if (elapsedMs >= last.endMs) return last.phase;
  return spans[0]!.phase;
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

/**
 * Durata di riferimento della timeline: la durata totale esplicita; in mancanza
 * (modelli legacy) ricade sulla somma delle fasi o sull'ultimo pin.
 */
export function sessionTotalMs(template: SessionTemplate): number {
  if (template.totalMs && template.totalMs > 0) return template.totalMs;
  const sumPhases = template.phases.reduce((acc, p) => acc + (p.durationMs || 0), 0);
  if (sumPhases > 0) return sumPhases;
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
  const elapsedPhase = phaseAtElapsed(template, elapsedMs);

  if (!next) {
    const lastPhase = template.phases[template.phases.length - 1];
    const phase = elapsedPhase ?? lastPhase;
    return {
      currentPhaseName: phase ? phase.name : '',
      currentPhaseId: phase ? phase.id : '',
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
    // La fase corrente è quella del tempo trascorso (segmento temporale).
    currentPhaseName: (elapsedPhase ?? next.phase).name,
    currentPhaseId: (elapsedPhase ?? next.phase).id,
    nextPin: next.pin,
    upcomingTests: next.pin.battery.map((b) => b.testId),
    countdownMs,
    positionIndex: completed.size,
    total,
    due: countdownMs <= 0,
    done: false,
  };
}

/** Clona in profondità un template (puro, senza Date: i campi data sono stringhe ISO). */
function cloneTemplate(template: SessionTemplate): SessionTemplate {
  return JSON.parse(JSON.stringify(template)) as SessionTemplate;
}

/**
 * Indice della fase il cui intervallo temporale contiene `offsetMs` (clampato a
 * [0, durata totale]). Ritorna l'ultima fase se l'offset cade sull'estremo finale,
 * −1 se non ci sono fasi. Serve a "capire in quale fase" finisce un pin trascinato.
 */
export function phaseIndexAtOffset(template: SessionTemplate, offsetMs: number): number {
  const spans = phaseSpans(template);
  if (spans.length === 0) return -1;
  const total = (spans[spans.length - 1] as PhaseSpan).endMs;
  const x = Math.max(0, Math.min(total, offsetMs));
  for (let i = 0; i < spans.length; i++) {
    if (x < (spans[i] as PhaseSpan).endMs) return i;
  }
  return spans.length - 1;
}

/**
 * Sposta un pin al nuovo offset assoluto (clampato a [0, totale]) e lo RIATTACCA
 * alla fase che contiene quell'offset — così trascinandolo lungo la timeline può
 * cambiare fase in modo naturale, senza aritmetica manuale. Ritorna un NUOVO
 * template (immutabile); no-op se gli indici non sono validi.
 */
export function movePin(
  template: SessionTemplate,
  fromPhaseIdx: number,
  pinIdx: number,
  newOffsetMs: number,
): SessionTemplate {
  const next = cloneTemplate(template);
  const from = next.phases[fromPhaseIdx];
  if (!from) return next;
  const pin = from.pins[pinIdx];
  if (!pin) return next;
  const total = sessionTotalMs(next);
  const clamped = Math.max(0, Math.min(total, Math.round(newOffsetMs)));
  pin.offsetMs = clamped;
  const targetIdx = phaseIndexAtOffset(next, clamped);
  if (targetIdx >= 0 && targetIdx !== fromPhaseIdx) {
    from.pins.splice(pinIdx, 1);
    (next.phases[targetIdx] as SessionPhase).pins.push(pin);
  }
  return next;
}

/**
 * Come `movePin`, ma identifica il pin per **id** (stabile) invece che per indici
 * di fase/posizione: durante un trascinamento che attraversa i confini di fase gli
 * indici cambiano, l'id no. Ritorna il template invariato se l'id non esiste.
 */
export function movePinById(template: SessionTemplate, pinId: string, newOffsetMs: number): SessionTemplate {
  for (let pi = 0; pi < template.phases.length; pi++) {
    const ti = (template.phases[pi] as SessionPhase).pins.findIndex((p) => p.id === pinId);
    if (ti >= 0) return movePin(template, pi, ti, newOffsetMs);
  }
  return template;
}

/**
 * Ridistribuisce equamente `totalMs` tra tutte le fasi; l'ultima assorbe il resto
 * della divisione intera (così la somma resta esattamente `totalMs`). Ritorna un
 * NUOVO template.
 */
export function distributePhasesEvenly(template: SessionTemplate): SessionTemplate {
  const next = cloneTemplate(template);
  const n = next.phases.length;
  if (n === 0) return next;
  const total = next.totalMs;
  const base = Math.floor(total / n);
  let acc = 0;
  next.phases.forEach((p, i) => {
    if (i === n - 1) {
      p.durationMs = total - acc;
    } else {
      p.durationMs = base;
      acc += base;
    }
  });
  return next;
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
