/**
 * ============================================================================
 *  COPIA STANDALONE — SART (Sustained Attention to Response Task)
 * ============================================================================
 *
 *  Duplicato AUTOSUFFICIENTE del core del test, per sola revisione/spiegazione.
 *  NON importato dalla piattaforma: tutte le dipendenze sono inline in cima.
 *
 *  Sorgente vivo corrispondente: src/engine/tests/sart.ts
 *  Riferimenti scientifici:       docs/scientific/sart.md — Robertson et al. (1997); Manly et al. (1999); Dang et al. (2018)
 *
 *  Esecuzione per revisione:  npx tsx revisione-motore/sart.ts
 *
 *  Cifre 1-9, risposta a tutte tranne alla cifra bersaglio; metriche: commissioni, omissioni,
 *  RT dei Go, d' e criterio c, RT prima delle commissioni.
 * ----------------------------------------------------------------------------
 */

/* ===== Dipendenze inline (nella piattaforma: engine/{types,rng,validation,sdt}) ===== */
/* Generate da scripts/sync-revisione-motore.mjs: non modificarle a mano. */

type ValidationFlag = 'VALID' | 'ANTICIPATION' | 'OMISSION' | 'INTERRUPTED';

type Phase = 'practice' | 'test';

type TestId = 'stroop1' | 'stroop2' | 'gonogo' | 'corsi' | 'nback' | 'wcst' | 'pvt' | 'flanker' | 'sart' | 'visualSearch' | 'mentalRotation' | 'trailMaking';

interface TrialResult {
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

interface SummaryMetric {
  /** Etichetta leggibile in italiano. */
  label: string;
  value: string | number;
  /** Unità di misura opzionale (es. 'ms', '%'). */
  unit?: string;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Deviazione standard campionaria (denominatore n-1).
 * Misura la stabilità/altalena della performance nel tempo.
 * Ritorna 0 se n < 2.
 */
function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

function countFlag(trials: readonly TrialResult[], flag: ValidationFlag): number {
  return trials.filter((t) => t.phase === 'test' && t.flag === flag).length;
}

export function probit(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

/**
 * d' con correzione loglinear di Hautus (1995), applicata sempre:
 * H = (hits+0.5)/(targets+1), F = (fa+0.5)/(nonTargets+1), d' = z(H) − z(F).
 */
export function dPrime(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
  const h = (hits + 0.5) / (targets + 1);
  const f = (falseAlarms + 0.5) / (nonTargets + 1);
  return probit(h) - probit(f);
}

/**
 * Criterio decisionale c (bias di risposta), con la stessa correzione loglinear
 * di Hautus: c = −0.5·(z(H) + z(F)). c > 0 = criterio conservativo (tende a NON
 * rispondere, favorisce i miss); c < 0 = criterio liberale (tende a rispondere,
 * favorisce i falsi allarmi); c ≈ 0 = nessun bias. Complementa d' separando la
 * sensibilità dalla tendenza di risposta.
 */
export function criterionC(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
  const h = (hits + 0.5) / (targets + 1);
  const f = (falseAlarms + 0.5) / (nonTargets + 1);
  return -0.5 * (probit(h) + probit(f));
}

/* ============================ CORE DEL TEST ============================ */

export interface SartParams {
  /** Numero di trial; un multiplo di 9 assegna lo stesso numero di presentazioni a ogni cifra. */
  nTrials: number;
  /** Cifra da non rispondere (1–9). */
  targetDigit: number;
  /** Durata della cifra (ms). */
  digitMs: number;
  /** Durata della maschera che segue la cifra (ms): la finestra di risposta è digitMs + maskMs. */
  maskMs: number;
  practiceTrials: number;
}

export interface SartStimulus {
  digit: number;
  /** Indice in `SART_FONT_SIZES_PX`: il corpo varia per scoraggiare il confronto percettivo con una sagoma. */
  sizeIndex: number;
}

export const SART_DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Cinque corpi del carattere (px). Sono quelli dei porting pubblici del compito (PsyToolkit);
 * il testo originale non è stato consultato, quindi sono una convenzione e non un dato di Robertson et al.
 */
export const SART_FONT_SIZES_PX: readonly number[] = [48, 72, 94, 100, 120];

/** Trial di una sequenza valutati prima di un errore di commissione (scelta di progetto). */
export const PRE_ERROR_WINDOW = 4;

const ARRANGE_ATTEMPTS = 500;

/**
 * Genera la sequenza: ogni cifra compare lo stesso numero di volte (le eventuali cifre in
 * più sono estratte a caso), mai due cifre uguali di seguito, corpi del carattere bilanciati.
 */
export function generateSart(params: SartParams, rand: () => number): SartStimulus[] {
  const digits = arrangeDigits(digitCounts(params.nTrials, rand), rand);
  const sizes = shuffle(
    Array.from({ length: digits.length }, (_, i) => i % SART_FONT_SIZES_PX.length),
    rand,
  );
  return digits.map((digit, i) => ({ digit, sizeIndex: sizes[i] as number }));
}

function digitCounts(nTrials: number, rand: () => number): Map<number, number> {
  const base = Math.floor(nTrials / SART_DIGITS.length);
  const extra = new Set(shuffle(SART_DIGITS, rand).slice(0, nTrials - base * SART_DIGITS.length));
  return new Map(SART_DIGITS.map((digit) => [digit, base + (extra.has(digit) ? 1 : 0)]));
}

/** Dispone le cifre senza ripetizioni immediate; ritenta se resta solo la cifra appena usata. */
function arrangeDigits(counts: ReadonlyMap<number, number>, rand: () => number): number[] {
  for (let attempt = 0; attempt < ARRANGE_ATTEMPTS; attempt++) {
    const sequence = tryArrange(counts, rand);
    if (sequence) return sequence;
  }
  return separateRepeats(shuffle([...counts].flatMap(([digit, n]) => Array<number>(n).fill(digit)), rand));
}

function tryArrange(counts: ReadonlyMap<number, number>, rand: () => number): number[] | null {
  const left = new Map(counts);
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const sequence: number[] = [];
  for (let i = 0; i < total; i++) {
    const options = [...left].filter(([digit, n]) => n > 0 && digit !== sequence[i - 1]);
    const weight = options.reduce((sum, [, n]) => sum + n, 0);
    if (weight === 0) return null;
    let ticket = rand() * weight;
    const [digit] = options.find(([, n]) => (ticket -= n) < 0) ?? (options[options.length - 1] as [number, number]);
    sequence.push(digit);
    left.set(digit, (left.get(digit) as number) - 1);
  }
  return sequence;
}

/** Ripiego: scambia ogni cifra uguale alla precedente con una successiva diversa, se esiste. */
function separateRepeats(sequence: number[]): number[] {
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) continue;
    const swap = sequence.findIndex((digit, j) => j > i && digit !== sequence[i] && digit !== sequence[i + 1]);
    if (swap > 0) [sequence[i], sequence[swap]] = [sequence[swap] as number, sequence[i] as number];
  }
  return sequence;
}

/**
 * Il partecipante ha premuto (anche in anticipo). Si guarda la risposta registrata, non il flag: il
 * sequencer marca VALID anche un No-Go correttamente trattenuto (nessuna risposta).
 */
const isResponded = (t: TrialResult): boolean => t.response !== null && t.flag !== 'INTERRUPTED';
const isValidTrial = (t: TrialResult): boolean => t.flag !== 'INTERRUPTED';
const isUsableGoRt = (t: TrialResult): boolean => t.condition === 'go' && t.flag === 'VALID' && t.correct && t.rtMs !== null;

/**
 * RT dei Go nei `window` trial che precedono ciascuna commissione (Robertson et al., 1997: gli errori
 * sono preceduti da risposte anormalmente veloci). Un trial vicino a più errori conta una volta sola.
 */
export function reactionTimesBeforeCommissions(trials: readonly TrialResult[], window = PRE_ERROR_WINDOW): number[] {
  const picked = new Set<number>();
  trials.forEach((t, i) => {
    if (t.condition !== 'nogo' || !isResponded(t)) return;
    for (let k = Math.max(0, i - window); k < i; k++) if (isUsableGoRt(trials[k] as TrialResult)) picked.add(k);
  });
  return [...picked].map((k) => (trials[k] as TrialResult).rtMs as number);
}

/**
 * Metriche: commissioni (risposte sul bersaglio) e omissioni (cifre senza risposta), RT medio/SD/CV
 * dei Go, d' e criterio c (hit = risposta a un Go, falso allarme = risposta al bersaglio), RT prima
 * delle commissioni. I trial interrotti sono esclusi da numeratori e denominatori.
 */
export function scoreSart(trials: readonly TrialResult[]): SummaryMetric[] {
  const test = trials.filter((t) => t.phase === 'test');
  const goTrials = test.filter((t) => t.condition === 'go' && isValidTrial(t));
  const targetTrials = test.filter((t) => t.condition === 'nogo' && isValidTrial(t));

  const hits = goTrials.filter(isResponded).length;
  const commissions = targetTrials.filter(isResponded).length;
  const omissions = goTrials.length - hits;

  const goRts = test.filter(isUsableGoRt).map((t) => t.rtMs as number);
  const meanGo = mean(goRts);
  const sdGo = standardDeviation(goRts);
  const preErrorRts = reactionTimesBeforeCommissions(test);
  const hasPreError = preErrorRts.length > 0 && goRts.length > 0;

  return [
    { label: 'Errori di commissione (bersaglio)', value: commissions },
    { label: 'Tasso di commissione', value: round1(rate(commissions, targetTrials.length)), unit: '%' },
    { label: 'Errori di omissione (cifre Go)', value: omissions },
    { label: 'Tasso di omissione', value: round1(rate(omissions, goTrials.length)), unit: '%' },
    { label: 'RT medio Go', value: round1(meanGo), unit: 'ms' },
    { label: 'SD RT Go', value: round1(sdGo), unit: 'ms' },
    { label: 'CV RT Go', value: round1(meanGo > 0 ? (sdGo / meanGo) * 100 : 0), unit: '%' },
    { label: "Sensibilità d'", value: round2(dPrime(hits, goTrials.length, commissions, targetTrials.length)) },
    { label: 'Criterio decisionale (c)', value: round2(criterionC(hits, goTrials.length, commissions, targetTrials.length)) },
    { label: `RT medio nei ${PRE_ERROR_WINDOW} Go prima di una commissione`, value: hasPreError ? round1(mean(preErrorRts)) : '—', unit: hasPreError ? 'ms' : undefined },
    { label: 'Variazione di RT prima delle commissioni (vs RT medio Go)', value: hasPreError ? round1(mean(preErrorRts) - meanGo) : '—', unit: hasPreError ? 'ms' : undefined },
    { label: 'Errori di anticipazione', value: countFlag(trials, 'ANTICIPATION') },
  ];
}

function rate(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ================================ DEMO ================================ */
(function demo(): void {
  const params: SartParams = { nTrials: 45, targetDigit: 3, digitMs: 250, maskMs: 900, practiceTrials: 0 };
  const seq = generateSart(params, mulberry32(21));
  const targets = seq.filter((s) => s.digit === params.targetDigit).length;
  console.log(`SART demo — ${seq.length} cifre, ${targets} bersagli (${params.targetDigit}), nessuna ripetizione immediata`);
  console.log(seq.map((s) => s.digit).join(' '));
})();
