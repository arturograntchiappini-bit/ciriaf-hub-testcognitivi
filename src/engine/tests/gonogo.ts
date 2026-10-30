/**
 * Go/No-Go Task — inibizione motoria rapida.
 * @see docs/scientific/gonogo.md — Verbruggen & Logan (2008); Wessel (2018)
 *
 * L'alta frequenza di stimoli Go crea un automatismo di risposta prepotente;
 * la misura chiave è l'errore di commissione (risposta su No-Go).
 */
import type { SummaryMetric, TrialResult } from '../types';
import { randInt } from '../rng';
import { mean, standardDeviation, countFlag } from '../validation';
import { criterionC, dPrime } from '../sdt';

export interface GoNoGoParams {
  nTrials: number;
  /** Proporzione di stimoli Go (es. 0.75). */
  goRatio: number;
  /** Durata dello stimolo = finestra di risposta (ms). */
  stimulusMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  practiceTrials: number;
}

export type GoNoGoKind = 'go' | 'nogo';

export interface GoNoGoStimulus {
  kind: GoNoGoKind;
  /** ISI (schermo vuoto) che segue questo stimolo, in ms. */
  isiMs: number;
}

const MAX_NOGO_RUN = 2; // mai più di 2 No-Go consecutivi

/**
 * Genera la sequenza Go/No-Go: numero esatto di Go/No-Go dato il rapporto,
 * ordine pseudo-casuale col vincolo di non più di 2 No-Go consecutivi, e ISI
 * uniforme in [isiMin, isiMax] per ogni trial.
 */
export function generateGoNoGo(params: GoNoGoParams, rand: () => number): GoNoGoStimulus[] {
  const nGo = Math.round(params.nTrials * params.goRatio);
  const nNoGo = params.nTrials - nGo;

  const kinds = arrangeKinds(nGo, nNoGo, rand);
  return kinds.map((kind) => ({
    kind,
    isiMs: randInt(params.isiMinMs, params.isiMaxMs, rand),
  }));
}

/** Dispone Go/No-Go rispettando il vincolo anti-cluster sui No-Go. */
function arrangeKinds(nGo: number, nNoGo: number, rand: () => number): GoNoGoKind[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = tryArrange(nGo, nNoGo, rand);
    if (result) return result;
  }
  // Fallback deterministico: intercala i No-Go tra i Go (al massimo MAX_NOGO_RUN consecutivi).
  return deterministicArrange(nGo, nNoGo);
}

function tryArrange(nGo: number, nNoGo: number, rand: () => number): GoNoGoKind[] | null {
  let goLeft = nGo;
  let noGoLeft = nNoGo;
  let noGoRun = 0;
  const seq: GoNoGoKind[] = [];
  const total = nGo + nNoGo;
  for (let i = 0; i < total; i++) {
    const canNoGo = noGoLeft > 0 && noGoRun < MAX_NOGO_RUN;
    const canGo = goLeft > 0;
    let chooseNoGo: boolean;
    if (!canGo) chooseNoGo = true;
    else if (i === 0) chooseNoGo = false; // il primo trial è sempre Go: instaura la risposta prepotente
    else if (!canNoGo) chooseNoGo = false;
    else chooseNoGo = rand() < noGoLeft / (goLeft + noGoLeft);

    if (chooseNoGo) {
      if (noGoRun >= MAX_NOGO_RUN) return null; // Go finiti: la terza No-Go di fila violerebbe il vincolo, si ritenta
      seq.push('nogo');
      noGoLeft--;
      noGoRun++;
    } else {
      seq.push('go');
      goLeft--;
      noGoRun = 0;
    }
  }
  return goLeft === 0 && noGoLeft === 0 ? seq : null;
}

/**
 * Ripiego deterministico: ogni Go è seguito da una quota di No-Go distribuita in modo uniforme, mai più di
 * MAX_NOGO_RUN per volta; i No-Go che non trovano posto (rapporto Go troppo basso per il vincolo) si accodano.
 */
function deterministicArrange(nGo: number, nNoGo: number): GoNoGoKind[] {
  const seq: GoNoGoKind[] = [];
  let placed = 0;
  for (let go = 1; go <= nGo; go++) {
    seq.push('go');
    const due = Math.floor((go * nNoGo) / nGo);
    for (let k = Math.min(due - placed, MAX_NOGO_RUN); k > 0; k--) {
      seq.push('nogo');
      placed++;
    }
  }
  for (; placed < nNoGo; placed++) seq.push('nogo');
  return seq;
}

/**
 * Il partecipante ha premuto (anche in anticipo). Si guarda la risposta registrata, non il flag: il
 * sequencer marca VALID anche un No-Go correttamente trattenuto (nessuna risposta).
 */
const isResponded = (t: TrialResult): boolean => t.response !== null && t.flag !== 'INTERRUPTED';
const isValidTrial = (t: TrialResult): boolean => t.flag !== 'INTERRUPTED';

/**
 * Metriche: errori di commissione (risposte su No-Go), errori di omissione
 * (mancate risposte su Go), RT medio/SD/CV dei Go corretti validi, anticipazioni,
 * d' e criterio c (hit = risposta su Go, falso allarme = risposta su No-Go).
 * I trial interrotti sono esclusi da numeratori e denominatori.
 */
export function scoreGoNoGo(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const goTrials = test.filter((t) => t.condition === 'go' && isValidTrial(t));
  const noGoTrials = test.filter((t) => t.condition === 'nogo' && isValidTrial(t));

  const commissionErrors = noGoTrials.filter(isResponded).length;
  const omissionErrors = goTrials.length - goTrials.filter(isResponded).length;
  const hits = goTrials.filter(isResponded).length;

  const goRts = goTrials
    .filter((t) => t.flag === 'VALID' && t.correct && t.rtMs !== null)
    .map((t) => t.rtMs as number);

  const commissionRate = noGoTrials.length > 0 ? (commissionErrors / noGoTrials.length) * 100 : 0;
  const omissionRate = goTrials.length > 0 ? (omissionErrors / goTrials.length) * 100 : 0;

  const meanGo = mean(goRts);
  const sdGo = standardDeviation(goRts);
  // Coefficiente di variazione: dispersione normalizzata sulla media, indice
  // di variabilità intra-soggetto (lapse/instabilità attentiva).
  const cvGo = meanGo > 0 ? (sdGo / meanGo) * 100 : 0;

  return [
    { label: 'Errori di commissione (No-Go)', value: commissionErrors },
    { label: 'Tasso di commissione', value: round1(commissionRate), unit: '%' },
    { label: 'Errori di omissione (Go)', value: omissionErrors },
    { label: 'Tasso di omissione', value: round1(omissionRate), unit: '%' },
    { label: 'RT medio Go corretti', value: round1(meanGo), unit: 'ms' },
    { label: 'SD RT Go corretti', value: round1(sdGo), unit: 'ms' },
    { label: 'CV RT Go corretti', value: round1(cvGo), unit: '%' },
    { label: "Sensibilità d'", value: round2(dPrime(hits, goTrials.length, commissionErrors, noGoTrials.length)) },
    { label: 'Criterio decisionale (c)', value: round2(criterionC(hits, goTrials.length, commissionErrors, noGoTrials.length)) },
    { label: 'Errori di anticipazione', value: countFlag(trials, 'ANTICIPATION') },
  ];
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
