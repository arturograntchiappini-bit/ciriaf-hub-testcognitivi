/**
 * Macchina a stati per i test a tempo di reazione (Stroop, Go/No-Go, N-Back).
 * Separata da React e con clock/scheduler iniettabili → unit-testabile senza browser.
 * Il timing sta qui, fuori dal ciclo di re-render: l'onset è preso al paint dello
 * stimolo, le risposte confrontano performance.now() con l'onset.
 * @see docs/architettura.md — sezione "Timing e runtime dei trial"
 */
import type { Clock, Scheduler, Cancel } from '../../engine/clock';
import type { Phase, TrialResult, TestId, ValidationFlag } from '../../engine/types';
import { ANTICIPATION_CUTOFF_MS } from '../../engine/validation';

/** Specifica di un singolo trial a tempo di reazione. */
export interface TrialSpec {
  condition: string;
  /** Etichetta serializzabile dello stimolo (per l'export). */
  stimulusLabel: string;
  /** ISI (ms) che segue questo trial; se assente si usa il default di config. */
  isiMs?: number;
  /** Payload tipizzato dello stimolo, usato da renderStimulus/evaluate della vista. */
  data?: unknown;
}

export type SequencerPhase =
  | 'idle'
  | 'fixation'
  | 'stimulus'
  | 'blank' // stimolo nascosto ma finestra di risposta ancora aperta
  | 'feedback'
  | 'isi'
  | 'done';

export interface SequencerState {
  index: number;
  phase: SequencerPhase;
  showStimulus: boolean;
  /** Presente solo in fase di feedback (pratica). */
  feedback?: 'correct' | 'wrong';
}

export interface SequencerConfig {
  testId: TestId;
  sessionId: string;
  phase: Phase; // 'practice' | 'test'
  trials: TrialSpec[];
  fixationMs: number;
  /** Quanto resta visibile lo stimolo. */
  stimulusVisibleMs: number;
  /** Per quanto (dall'onset) si accettano risposte. */
  responseWindowMs: number;
  /** ISI di default tra i trial (ms). */
  isiMs: number;
  /** Se true, una risposta chiude subito il trial (Stroop). */
  endOnResponse: boolean;
  /** Durata del feedback in pratica; 0 = nessun feedback (test). */
  feedbackMs: number;
  /** Tasti accettati (minuscoli). */
  responseKeys: string[];
  /** True se il trial richiede una risposta (Go/target/Stroop); false per withhold (No-Go/non-target). */
  expectsResponse: (trial: TrialSpec) => boolean;
  /** Correttezza dato lo stimolo e il tasto premuto (null se nessuna risposta). */
  evaluate: (trial: TrialSpec, key: string | null) => boolean;
  clock: Clock;
  scheduler: Scheduler;
  onState: (state: SequencerState) => void;
  onTrialResult: (result: TrialResult) => void;
  onDone: () => void;
}

/** Crea e controlla la sequenza. Chiamare `start()` per avviare. */
export function createSequencer(config: SequencerConfig): {
  start: () => void;
  handleKey: (key: string, timestamp: number) => void;
  handleInterrupt: () => void;
  cancel: () => void;
} {
  let index = 0;
  let onset = 0;
  let responded = false;
  let responseKey: string | null = null;
  let rt: number | null = null;
  let interrupted = false;
  let trialClosed = true;
  let stimulusPainted = false; // i tasti prima dell'onset (fissazione) non sono risposte: non hanno un RT
  let cancels: Cancel[] = [];

  function clearTimers(): void {
    for (const c of cancels) c();
    cancels = [];
  }

  function emit(state: SequencerState): void {
    config.onState(state);
  }

  function start(): void {
    index = 0;
    nextTrial();
  }

  function nextTrial(): void {
    clearTimers();
    if (index >= config.trials.length) {
      emit({ index, phase: 'done', showStimulus: false });
      config.onDone();
      return;
    }
    responded = false;
    responseKey = null;
    rt = null;
    interrupted = false;
    trialClosed = false;
    stimulusPainted = false;

    if (config.fixationMs > 0) {
      emit({ index, phase: 'fixation', showStimulus: false });
      cancels.push(config.scheduler.timeout(config.fixationMs, startStimulus));
    } else {
      startStimulus();
    }
  }

  function startStimulus(): void {
    emit({ index, phase: 'stimulus', showStimulus: true });
    cancels.push(
      config.scheduler.afterPaint((t) => {
        onset = t;
        stimulusPainted = true;
        if (config.stimulusVisibleMs < config.responseWindowMs) {
          cancels.push(
            config.scheduler.timeout(config.stimulusVisibleMs, () => {
              if (!trialClosed) emit({ index, phase: 'blank', showStimulus: false });
            }),
          );
        }
        cancels.push(config.scheduler.timeout(config.responseWindowMs, closeTrial));
      }),
    );
  }

  function handleKey(key: string, timestamp: number): void {
    if (trialClosed || !stimulusPainted) return;
    const k = key.toLowerCase();
    if (!config.responseKeys.includes(k)) return;
    if (responded) return; // una sola risposta per trial
    responded = true;
    responseKey = k;
    rt = timestamp - onset;
    if (config.endOnResponse) closeTrial();
  }

  function handleInterrupt(): void {
    if (trialClosed) return;
    interrupted = true;
    closeTrial();
  }

  function computeFlag(trial: TrialSpec): ValidationFlag {
    if (interrupted) return 'INTERRUPTED';
    if (responded) return rt !== null && rt < ANTICIPATION_CUTOFF_MS ? 'ANTICIPATION' : 'VALID';
    // Nessuna risposta: omissione solo se era attesa; altrimenti corretto rifiuto (valido).
    return config.expectsResponse(trial) ? 'OMISSION' : 'VALID';
  }

  function closeTrial(): void {
    if (trialClosed) return;
    trialClosed = true;
    clearTimers();

    const trial = config.trials[index] as TrialSpec;
    const correct = config.evaluate(trial, responded ? responseKey : null);
    const flag = computeFlag(trial);

    const result: TrialResult = {
      testId: config.testId,
      sessionId: config.sessionId,
      trialIndex: index,
      phase: config.phase,
      condition: trial.condition,
      stimulus: trial.stimulusLabel,
      response: responseKey,
      correct,
      rtMs: responded ? rt : null,
      flag,
      onsetTimestamp: onset,
    };
    config.onTrialResult(result);

    if (config.feedbackMs > 0) {
      emit({ index, phase: 'feedback', showStimulus: false, feedback: correct ? 'correct' : 'wrong' });
      cancels.push(config.scheduler.timeout(config.feedbackMs, startIsi));
    } else {
      startIsi();
    }
  }

  function startIsi(): void {
    const trial = config.trials[index] as TrialSpec;
    const gap = trial.isiMs ?? config.isiMs;
    index++;
    if (gap > 0) {
      emit({ index: index - 1, phase: 'isi', showStimulus: false });
      cancels.push(config.scheduler.timeout(gap, nextTrial));
    } else {
      nextTrial();
    }
  }

  function cancel(): void {
    trialClosed = true;
    clearTimers();
  }

  return { start, handleKey, handleInterrupt, cancel };
}
