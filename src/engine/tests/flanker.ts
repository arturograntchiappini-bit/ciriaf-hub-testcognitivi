/**
 * Flanker Task (Eriksen) — attenzione selettiva e controllo dell'interferenza.
 * @see docs/scientific/flanker.md — Eriksen & Eriksen (1974); Gratton, Coles & Donchin (1992)
 *
 * Il partecipante risponde alla direzione della freccia CENTRALE ignorando i
 * distrattori laterali (flanker). Se i flanker indicano la risposta opposta
 * (incongruenti) i tempi si allungano e gli errori aumentano: la differenza è
 * l'"effetto flanker".
 */
import type { SummaryMetric, TrialResult } from '../types';
import { randInt, shuffle } from '../rng';
import { mean, standardDeviation, countFlag } from '../validation';

export interface FlankerParams {
  nTrials: number;
  /** Quota di trial incongruenti (es. 0.4). */
  incongruentRatio: number;
  /** Quota di trial neutri, senza frecce distrattrici (es. 0.2). */
  neutralRatio: number;
  fixationMs: number;
  /** Finestra di risposta (ms); lo stimolo resta fino alla risposta o al timeout. */
  responseWindowMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  practiceTrials: number;
}

export type FlankerCondition = 'congruent' | 'incongruent' | 'neutral';
export type FlankerDirection = 'left' | 'right';

export interface FlankerStimulus {
  condition: FlankerCondition;
  /** Direzione della freccia centrale = risposta corretta. */
  direction: FlankerDirection;
  /** Stringa dello stimolo, es. "←←→←←" (freccia centrale in mezzo). */
  arrows: string;
  /** ISI (schermo vuoto) che segue questo stimolo, in ms. */
  isiMs: number;
}

const ARROW: Record<FlankerDirection, string> = { left: '←', right: '→' };
const NEUTRAL_FLANKER = '–';
const FLANKERS_PER_SIDE = 2;
/** Mai più di 3 trial consecutivi della stessa condizione né della stessa risposta. */
const MAX_RUN = 3;
const SHUFFLE_ATTEMPTS = 300;

/** Compone lo stimolo a 5 elementi: 2 flanker, target, 2 flanker. */
export function buildArrows(condition: FlankerCondition, direction: FlankerDirection): string {
  const opposite: FlankerDirection = direction === 'left' ? 'right' : 'left';
  const flanker =
    condition === 'congruent' ? ARROW[direction] : condition === 'incongruent' ? ARROW[opposite] : NEUTRAL_FLANKER;
  return `${flanker.repeat(FLANKERS_PER_SIDE)}${ARROW[direction]}${flanker.repeat(FLANKERS_PER_SIDE)}`;
}

function conditionCounts(params: FlankerParams): Record<FlankerCondition, number> {
  const incongruent = Math.round(params.nTrials * params.incongruentRatio);
  const neutral = Math.round(params.nTrials * params.neutralRatio);
  return { incongruent, neutral, congruent: Math.max(0, params.nTrials - incongruent - neutral) };
}

/** Direzioni bilanciate dentro ogni condizione (metà sinistra, metà destra; l'eventuale resto è casuale). */
function directionsFor(count: number, rand: () => number): FlankerDirection[] {
  const half = Math.floor(count / 2);
  const list: FlankerDirection[] = [
    ...Array<FlankerDirection>(half).fill('left'),
    ...Array<FlankerDirection>(half).fill('right'),
  ];
  if (count % 2 === 1) list.push(rand() < 0.5 ? 'left' : 'right');
  return list;
}

type Draft = Omit<FlankerStimulus, 'isiMs'>;

/** True se aggiungere `candidate` non crea una serie più lunga di MAX_RUN (stessa condizione o stessa risposta). */
function canAppend(sequence: readonly Draft[], candidate: Draft): boolean {
  const tail = sequence.slice(-MAX_RUN);
  if (tail.length < MAX_RUN) return true;
  const sameCondition = tail.every((s) => s.condition === candidate.condition);
  const sameDirection = tail.every((s) => s.direction === candidate.direction);
  return !sameCondition && !sameDirection;
}

/**
 * Ordina il pool costruendo la sequenza passo per passo: a ogni passo prende il primo trial
 * (in ordine casuale) che rispetta i limiti di ripetizione; se resta bloccata riparte.
 * Il solo rimescolamento casuale non basterebbe: su ~100 trial rispetta i limiti quasi mai.
 */
function arrange(pool: readonly Draft[], rand: () => number): Draft[] {
  for (let attempt = 0; attempt < SHUFFLE_ATTEMPTS; attempt++) {
    const remaining = shuffle(pool, rand);
    const sequence: Draft[] = [];
    while (remaining.length > 0) {
      const index = remaining.findIndex((candidate) => canAppend(sequence, candidate));
      if (index < 0) break;
      sequence.push(remaining.splice(index, 1)[0] as Draft);
    }
    if (remaining.length === 0) return sequence;
  }
  return shuffle(pool, rand);
}

/**
 * Genera la sequenza: conteggi esatti per condizione, direzioni bilanciate,
 * ordine pseudo-casuale con run massimi limitati e ISI uniforme per trial.
 */
export function generateFlanker(params: FlankerParams, rand: () => number): FlankerStimulus[] {
  const counts = conditionCounts(params);
  const pool: Draft[] = (Object.keys(counts) as FlankerCondition[]).flatMap((condition) =>
    directionsFor(counts[condition], rand).map((direction) => ({
      condition,
      direction,
      arrows: buildArrows(condition, direction),
    })),
  );
  return arrange(pool, rand).map((stimulus) => ({ ...stimulus, isiMs: randInt(params.isiMinMs, params.isiMaxMs, rand) }));
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function rtsOf(trials: readonly TrialResult[]): number[] {
  return trials.filter((t) => t.flag === 'VALID' && t.correct && t.rtMs !== null).map((t) => t.rtMs as number);
}

function accuracyPercent(trials: readonly TrialResult[]): number {
  const scored = trials.filter((t) => t.flag !== 'INTERRUPTED');
  if (scored.length === 0) return 0;
  return (scored.filter((t) => t.correct).length / scored.length) * 100;
}

/**
 * Adattamento al conflitto (Gratton, Coles & Donchin, 1992): l'interferenza è minore
 * dopo un trial incongruente che dopo uno congruente. Ritorna (cI − cC) − (iI − iC),
 * con c/i = congruenza del trial precedente e C/I = del trial corrente; considera solo
 * trial consecutivi preceduti da una risposta corretta. null se una cella è vuota.
 */
export function conflictAdaptation(trials: readonly TrialResult[]): number | null {
  const cells: Record<string, number[]> = { cC: [], cI: [], iC: [], iI: [] };
  const byIndex = new Map(trials.map((t) => [t.trialIndex, t]));
  for (const current of trials) {
    const previous = byIndex.get(current.trialIndex - 1);
    const currentIsValid = current.flag === 'VALID' && current.correct && current.rtMs !== null;
    const previousCounts = previous?.correct && previous.flag !== 'INTERRUPTED';
    const comparable = (c: string): boolean => c === 'congruent' || c === 'incongruent';
    if (!previous || !currentIsValid || !previousCounts || !comparable(previous.condition) || !comparable(current.condition)) continue;
    const key = `${previous.condition === 'congruent' ? 'c' : 'i'}${current.condition === 'congruent' ? 'C' : 'I'}`;
    cells[key]?.push(current.rtMs as number);
  }
  if (Object.values(cells).some((rts) => rts.length === 0)) return null;
  const m = (key: string): number => mean(cells[key] as number[]);
  return (m('cI') - m('cC')) - (m('iI') - m('iC'));
}

/**
 * Metriche: RT e accuratezza per condizione, effetto flanker (incongruente − congruente),
 * interferenza (incongruente − neutro), facilitazione (neutro − congruente), costo in
 * accuratezza, adattamento al conflitto, variabilità e trial invalidi.
 */
export function scoreFlanker(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const by = (condition: FlankerCondition): TrialResult[] => test.filter((t) => t.condition === condition);
  const congruent = by('congruent');
  const incongruent = by('incongruent');
  const neutral = by('neutral');

  const rtCon = mean(rtsOf(congruent));
  const rtInc = mean(rtsOf(incongruent));
  const rtNeu = mean(rtsOf(neutral));
  const hasNeutral = neutral.length > 0;
  const adaptation = conflictAdaptation(test);
  const allRts = rtsOf(test);

  return [
    { label: 'RT medio congruenti', value: round1(rtCon), unit: 'ms' },
    { label: 'RT medio incongruenti', value: round1(rtInc), unit: 'ms' },
    { label: 'RT medio neutri', value: hasNeutral ? round1(rtNeu) : '—', unit: hasNeutral ? 'ms' : undefined },
    { label: 'Effetto flanker (incongruenti − congruenti)', value: round1(rtInc - rtCon), unit: 'ms' },
    { label: 'Interferenza (incongruenti − neutri)', value: hasNeutral ? round1(rtInc - rtNeu) : '—', unit: hasNeutral ? 'ms' : undefined },
    { label: 'Facilitazione (neutri − congruenti)', value: hasNeutral ? round1(rtNeu - rtCon) : '—', unit: hasNeutral ? 'ms' : undefined },
    { label: 'Accuratezza congruenti', value: round1(accuracyPercent(congruent)), unit: '%' },
    { label: 'Accuratezza incongruenti', value: round1(accuracyPercent(incongruent)), unit: '%' },
    { label: 'Costo in accuratezza (congruenti − incongruenti)', value: round1(accuracyPercent(congruent) - accuracyPercent(incongruent)), unit: 'punti %' },
    { label: 'Adattamento al conflitto (Gratton)', value: adaptation === null ? '—' : round1(adaptation), unit: adaptation === null ? undefined : 'ms' },
    { label: 'SD RT (tutti i corretti)', value: round1(standardDeviation(allRts)), unit: 'ms' },
    { label: 'Errori di omissione', value: countFlag(test, 'OMISSION') },
    { label: 'Errori di anticipazione', value: countFlag(test, 'ANTICIPATION') },
  ];
}
