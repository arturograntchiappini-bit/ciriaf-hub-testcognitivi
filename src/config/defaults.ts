/**
 * Parametri di default dei test. Ogni valore è ancorato a una fonte scientifica
 * (vedi docs/scientific/*.md). Sono tutti regolabili dal pannello Impostazioni.
 * @see docs/scientific/
 */
import type { StroopParams } from '../engine/tests/stroop';
import type { GoNoGoParams } from '../engine/tests/gonogo';
import type { CorsiParams } from '../engine/tests/corsi';
import type { NBackParams } from '../engine/tests/nback';
import type { WcstParams } from '../engine/tests/wcst';

export interface AllParams {
  stroop1: StroopParams;
  stroop2: StroopParams;
  gonogo: GoNoGoParams;
  corsi: CorsiParams;
  nback: NBackParams;
  wcst: WcstParams;
}

/**
 * Stroop 1/2: 48 trial (24 congruenti / 24 incongruenti), fissazione 500 ms,
 * timeout 3000 ms, ISI 500 ms costante, 8 trial di pratica.
 * Fonte: Stroop (1935); MacLeod (1991); convenzioni jsPsych/PsyToolkit. Vedi docs/scientific/stroop.md
 */
const STROOP_BASE: StroopParams = {
  nTrials: 48, // 24 congruenti + 24 incongruenti (MacLeod, 1991)
  fixationMs: 500, // croce di fissazione (convenzione jsPsych/PsyToolkit)
  timeoutMs: 3000, // oltre = omissione (RT tipici 600–1000 ms)
  isiMs: 500, // ISI costante: la durata modula l'interferenza (Galer et al., 2014)
  practiceTrials: 8, // pratica con feedback (PsyToolkit)
};

export const DEFAULTS: AllParams = {
  stroop1: { ...STROOP_BASE },
  stroop2: { ...STROOP_BASE },

  /**
   * Go/No-Go: 80 trial, 75% Go / 25% No-Go, stimolo 800 ms fissi (finestra di
   * risposta), ISI uniforme 500–1000 ms, 10 trial di pratica.
   * Fonte: Verbruggen & Logan (2008); Wessel (2018). Vedi docs/scientific/gonogo.md
   */
  gonogo: {
    nTrials: 80, // 60 Go / 20 No-Go
    goRatio: 0.75, // alta frequenza Go → automatismo prepotente (Wessel, 2018)
    stimulusMs: 800, // finestra di risposta fissa
    isiMinMs: 500, // jitter per prevenire anticipazioni ritmiche
    isiMaxMs: 1000,
    practiceTrials: 10,
  },

  /**
   * Corsi: start 3, max 9, 2 trial/livello, arresto se entrambi falliti,
   * 1000 ms/blocco. Span = 0.5 per trial superato.
   * Fonte: Corsi (1972); Kessels et al. (2000); PEBL. Vedi docs/scientific/corsi.md
   */
  corsi: {
    startLength: 3,
    maxLength: 9,
    trialsPerLevel: 2,
    presentMsPerBlock: 1000, // isi PEBL = 1000 ms
    complexityTolerance: 8, // tolleranza sulla distanza totale (unità piano 0–100)
  },

  /**
   * N-Back (2-back): lettera 500 ms + blank 1500 ms, 360 trial (~12 min),
   * target rate 30%, 20 trial di pratica, consonanti.
   * Fonte: Kirchner (1958); Jaeggi et al. (2010); Hautus (1995). Vedi docs/scientific/nback.md
   */
  nback: {
    n: 2,
    letterMs: 500,
    blankMs: 1500, // 2 s/trial
    nTrials: 360, // blocco esteso ~12 min per la tenuta della traccia
    targetRate: 0.3,
    practiceTrials: 20,
  },

  /**
   * WCST: mazzo 64, cambio dopo 10 corrette consecutive, 6 categorie, ordine
   * Colore→Forma→Numero.
   * Fonte: Grant & Berg (1948); Heaton; Kongs et al. (2000). Vedi docs/scientific/wcst.md
   */
  wcst: {
    deckSize: 64, // WCST-64 (Kongs et al., 2000)
    runToShift: 10, // 10 corrette consecutive per il cambio (Grant & Berg, 1948)
    maxCategories: 6,
  },
};
