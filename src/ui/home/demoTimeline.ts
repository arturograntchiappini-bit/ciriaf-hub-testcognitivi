/** Protocollo di esempio della simulazione in Home: solo illustrativo, non dati reali. */
export interface DemoPhase {
  name: string;
  from: number;
  to: number;
}

export interface DemoPin {
  label: string;
  minute: number;
  tests: readonly string[];
}

export type DemoStage = 'wait' | 'due' | 'test' | 'done';

export interface DemoFrame {
  minute: number;
  stage: DemoStage;
  phaseName: string;
  /** Pin atteso (in attesa/scaduto) o in corso; per `done` è l'ultimo. */
  pinIndex: number;
  /** Secondi di sessione al prossimo pin (o alla fine, dopo l'ultimo pin). */
  countdownSeconds: number;
  completedPins: number;
}

export const DEMO_TOTAL_MINUTES = 60;
export const DEMO_PHASES: readonly DemoPhase[] = [
  { name: 'Baseline', from: 0, to: 15 },
  { name: 'Esposizione', from: 15, to: 45 },
  { name: 'Recupero', from: 45, to: 60 },
];
export const DEMO_PINS: readonly DemoPin[] = [
  { label: 't1', minute: 10, tests: ['Stroop 2'] },
  { label: 't2', minute: 30, tests: ['PVT', 'N-Back'] },
  { label: 't3', minute: 52, tests: ['Stroop 2'] },
];

/** Minuti di sessione al secondo reale: la simulazione è accelerata. */
export const DEMO_MINUTES_PER_SECOND = 4;
const HOLD_DUE_SECONDS = 2.2;
const HOLD_TEST_SECONDS = 2.4;
const HOLD_END_SECONDS = 2.5;
const HOLD_PER_PIN = HOLD_DUE_SECONDS + HOLD_TEST_SECONDS;

export const DEMO_LOOP_SECONDS =
  DEMO_TOTAL_MINUTES / DEMO_MINUTES_PER_SECOND + DEMO_PINS.length * HOLD_PER_PIN + HOLD_END_SECONDS;

export function phaseAtMinute(minute: number): DemoPhase {
  const found = DEMO_PHASES.find((phase) => minute >= phase.from && minute < phase.to);
  return found ?? (DEMO_PHASES[DEMO_PHASES.length - 1] as DemoPhase);
}

function frame(minute: number, stage: DemoStage, pinIndex: number, completedPins: number): DemoFrame {
  const target = stage === 'done' || pinIndex >= DEMO_PINS.length ? DEMO_TOTAL_MINUTES : (DEMO_PINS[pinIndex] as DemoPin).minute;
  return {
    minute,
    stage,
    phaseName: phaseAtMinute(minute).name,
    pinIndex: Math.min(pinIndex, DEMO_PINS.length - 1),
    countdownSeconds: Math.max(0, Math.round((target - minute) * 60)),
    completedPins,
  };
}

/** Stato della simulazione al secondo `seconds` (ciclico): attesa col conto alla rovescia, avviso, test, fine. */
export function demoFrameAt(seconds: number): DemoFrame {
  const t = ((seconds % DEMO_LOOP_SECONDS) + DEMO_LOOP_SECONDS) % DEMO_LOOP_SECONDS;
  let heldSeconds = 0;
  for (let i = 0; i < DEMO_PINS.length; i++) {
    const pin = DEMO_PINS[i] as DemoPin;
    const arrival = pin.minute / DEMO_MINUTES_PER_SECOND + heldSeconds;
    if (t < arrival) return frame((t - heldSeconds) * DEMO_MINUTES_PER_SECOND, 'wait', i, i);
    if (t < arrival + HOLD_DUE_SECONDS) return frame(pin.minute, 'due', i, i);
    if (t < arrival + HOLD_PER_PIN) return frame(pin.minute, 'test', i, i);
    heldSeconds += HOLD_PER_PIN;
  }
  const minute = Math.min(DEMO_TOTAL_MINUTES, (t - heldSeconds) * DEMO_MINUTES_PER_SECOND);
  const stage: DemoStage = minute >= DEMO_TOTAL_MINUTES ? 'done' : 'wait';
  return frame(minute, stage, DEMO_PINS.length, DEMO_PINS.length);
}

/** Fotogramma statico (movimento ridotto): l'avviso del primo pin, il momento più esplicativo. */
export function staticDemoFrame(): DemoFrame {
  const pin = DEMO_PINS[0] as DemoPin;
  return demoFrameAt(pin.minute / DEMO_MINUTES_PER_SECOND + HOLD_DUE_SECONDS / 2);
}

/** mm:ss per il conto alla rovescia. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
