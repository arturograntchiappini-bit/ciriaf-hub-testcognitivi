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
import type { PvtParams } from '../engine/tests/pvt';
import type { FlankerParams } from '../engine/tests/flanker';
import type { SartParams } from '../engine/tests/sart';
import type { VisualSearchParams } from '../engine/tests/visualSearch';
import type { MentalRotationParams } from '../engine/tests/mentalRotation';
import type { TrailMakingParams } from '../engine/tests/trailMaking';

export interface AllParams {
  stroop1: StroopParams;
  stroop2: StroopParams;
  gonogo: GoNoGoParams;
  corsi: CorsiParams;
  nback: NBackParams;
  wcst: WcstParams;
  pvt: PvtParams;
  flanker: FlankerParams;
  sart: SartParams;
  visualSearch: VisualSearchParams;
  mentalRotation: MentalRotationParams;
  trailMaking: TrailMakingParams;
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
    // Scostamento massimo dal BERSAGLIO di difficoltà del livello (unità piano
    // 0–100). Vincola la difficoltà assoluta, non solo la somiglianza fra i due
    // trial: è ciò che rende confrontabili run di partecipanti diversi.
    complexityTolerance: 8,
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
    lureRate: 0.2, // quota di non-target che sono lure (lag n−1 / n+1): neutralizza la sola familiarità
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

  /**
   * PVT (Psychomotor Vigilance Task): 100 trial, stimolo visivo fino a 10 s,
   * ISI 2–10 s, 5 trial di pratica.
   * Fonte: Dinges & Powell (1985); Basner & Dinges (2011). Vedi docs/scientific/pvt.md
   */
  pvt: {
    nTrials: 100, // ~10 min con ISI medio ~6 s (Basner & Dinges, 2011)
    stimulusMaxMs: 10000, // timeout 10 s — omissione oltre
    isiMinMs: 2000, // ISI minimo: evita anticipazione ritmica
    isiMaxMs: 10000, // ISI massimo: mantiene incertezza temporale
    practiceTrials: 5,
  },

  /**
   * Flanker (Eriksen): 96 trial (39 congruenti / 38 incongruenti / 19 neutri), fissazione 500 ms,
   * finestra di risposta 1500 ms, ISI 700–1100 ms, 12 trial di pratica.
   * Fonte: Eriksen & Eriksen (1974); Gratton, Coles & Donchin (1992). Vedi docs/scientific/flanker.md
   */
  flanker: {
    nTrials: 96, // abbastanza trial incongruenti per stimare l'effetto e l'adattamento al conflitto
    incongruentRatio: 0.4, // 40% incongruenti
    neutralRatio: 0.2, // 20% neutri: permettono di separare interferenza e facilitazione
    fixationMs: 500, // croce di fissazione (convenzione jsPsych/PsyToolkit)
    responseWindowMs: 1500, // oltre = omissione
    isiMinMs: 700, // jitter dell'ISI: evita l'anticipazione ritmica
    isiMaxMs: 1100,
    practiceTrials: 12, // pratica con feedback
  },

  /**
   * SART (Robertson et al., 1997): 225 cifre (25 per cifra, nessuna ripetizione immediata), cifra
   * 250 ms seguita da maschera 900 ms (finestra di risposta 1150 ms), bersaglio 3, 18 trial di pratica.
   * Durata, maschera e conteggi seguono i porting pubblici del compito (PsyToolkit, Inquisit);
   * il testo originale non è stato consultato. Vedi docs/scientific/sart.md
   */
  sart: {
    nTrials: 225, // 9 cifre × 25 presentazioni
    targetDigit: 3, // la cifra da NON rispondere
    digitMs: 250,
    maskMs: 900,
    practiceTrials: 18,
  },

  /**
   * Visual Search (Treisman & Gelade, 1980): 96 trial = 2 tipi (caratteristica / congiunzione) × 3 numerosità
   * (4, 8, 16) × 2 (bersaglio presente / assente) × 8 ripetizioni; fissazione 500 ms, tempo massimo 4000 ms,
   * ISI 700–1100 ms, 8 trial di pratica. Valori operativi di progetto. Vedi docs/scientific/visual-search.md
   */
  visualSearch: {
    nTrials: 96, // 8 prove per cella: stima delle pendenze con 3 numerosità
    fixationMs: 500,
    responseWindowMs: 4000, // la ricerca di congiunzione ad assenza può richiedere più di 2 s
    isiMinMs: 700,
    isiMaxMs: 1100,
    practiceTrials: 8,
  },

  /**
   * Mental Rotation (Shepard & Metzler, 1971): 84 trial = 7 angoli (0–180° a passi di 30°) × (uguali / diverse)
   * × 6 ripetizioni; fissazione 500 ms, tempo massimo 8000 ms, ISI 700–1100 ms, 6 trial di pratica.
   * Figure di 10 cubetti generate al volo; non sono le figure originali. Vedi docs/scientific/mental-rotation.md
   */
  mentalRotation: {
    nTrials: 84, // 6 prove per cella
    fixationMs: 500,
    responseWindowMs: 8000, // la rotazione mentale a 180° può richiedere diversi secondi
    isiMinMs: 700,
    isiMaxMs: 1100,
    practiceTrials: 6,
  },

  /**
   * Trail Making A e B (Reitan, 1958): 25 cerchi per parte (la parte B alterna 13 numeri e 12 lettere),
   * 8 cerchi per parte nella pratica. Versione a schermo con clic: non è il test cartaceo originale.
   * Vedi docs/scientific/trail-making.md
   */
  trailMaking: {
    nTargets: 25, // numero classico di cerchi per parte
    practiceTargets: 8,
  },
};
