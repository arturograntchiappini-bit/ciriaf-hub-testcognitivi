import { describe, it, expect } from 'vitest';
import {
  CORSI_BLOCKS,
  pathLength,
  countCrossings,
  generateBalancedSequences,
  corsiSpan,
  shouldStop,
  scoreCorsi,
  type CorsiParams,
  type Point,
} from './corsi';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';

const PARAMS: CorsiParams = {
  startLength: 3,
  maxLength: 9,
  trialsPerLevel: 2,
  presentMsPerBlock: 1000,
  complexityTolerance: 8,
};

describe('CORSI_BLOCKS', () => {
  it('ha 9 blocchi in posizioni distinte', () => {
    expect(CORSI_BLOCKS).toHaveLength(9);
    const keys = new Set(CORSI_BLOCKS.map((b) => `${b.x},${b.y}`));
    expect(keys.size).toBe(9);
  });
});

describe('geometria', () => {
  // Quadrato unitario: blocchi in un layout noto.
  const square: Point[] = [
    { x: 0, y: 0 }, // 0
    { x: 10, y: 0 }, // 1
    { x: 10, y: 10 }, // 2
    { x: 0, y: 10 }, // 3
  ];

  it('pathLength somma le distanze euclidee', () => {
    // 0→1→2 = 10 + 10 = 20
    expect(pathLength([0, 1, 2], square)).toBeCloseTo(20, 5);
  });

  it('countCrossings rileva un incrocio (percorso a farfalla)', () => {
    // 0→2 e 1→3 sono le diagonali che si incrociano: sequenza 0,2,1,3
    // segmenti: (0→2),(2→1),(1→3). (0→2) e (1→3) sono non adiacenti e si incrociano.
    expect(countCrossings([0, 2, 1, 3], square)).toBe(1);
  });

  it('countCrossings è 0 per un percorso perimetrale non intrecciato', () => {
    // 0→1→2→3 percorre il perimetro senza incroci
    expect(countCrossings([0, 1, 2, 3], square)).toBe(0);
  });
});

describe('generateBalancedSequences', () => {
  it('genera sequenze distinte della lunghezza richiesta', () => {
    const seqs = generateBalancedSequences(5, 2, PARAMS, mulberry32(1));
    expect(seqs.length).toBeGreaterThanOrEqual(2);
    for (const s of seqs) expect(s.indices).toHaveLength(5);
    expect(seqs[0]!.indices).not.toEqual(seqs[1]!.indices);
  });

  it('le sequenze dello stesso livello hanno stessi incroci e distanza entro tolleranza', () => {
    const seqs = generateBalancedSequences(5, 2, PARAMS, mulberry32(42));
    const a = seqs[0]!;
    const b = seqs[1]!;
    expect(a.crossings).toBe(b.crossings);
    expect(Math.abs(a.pathLength - b.pathLength)).toBeLessThanOrEqual(PARAMS.complexityTolerance);
  });
});

describe('span e regola di arresto', () => {
  it('corsiSpan = 0.5 per trial superato', () => {
    expect(corsiSpan(0)).toBe(0);
    expect(corsiSpan(6)).toBe(3);
  });

  it('shouldStop solo se entrambi i trial del livello falliti', () => {
    expect(shouldStop([false, false])).toBe(true);
    expect(shouldStop([true, false])).toBe(false);
    expect(shouldStop([false])).toBe(false);
    expect(shouldStop([true, true])).toBe(false);
  });
});

describe('scoreCorsi', () => {
  it('calcola span, trial superati e lunghezza massima', () => {
    const trials: TrialResult[] = [
      { testId: 'corsi', sessionId: 'C', trialIndex: 0, phase: 'test', condition: 'len3', stimulus: '0-1-2', response: '0-1-2', correct: true, rtMs: null, flag: 'VALID', onsetTimestamp: 0 },
      { testId: 'corsi', sessionId: 'C', trialIndex: 1, phase: 'test', condition: 'len4', stimulus: '0-1-2-3', response: '0-1-2-3', correct: true, rtMs: null, flag: 'VALID', onsetTimestamp: 0 },
      { testId: 'corsi', sessionId: 'C', trialIndex: 2, phase: 'test', condition: 'len4', stimulus: '3-2-1-0', response: '3-2', correct: false, rtMs: null, flag: 'VALID', onsetTimestamp: 0 },
    ];
    const summary = scoreCorsi(trials);
    expect(summary.find((m) => m.label === 'Span (punteggio totale)')?.value).toBe(1); // 2 superati * 0.5
    expect(summary.find((m) => m.label === 'Trial superati')?.value).toBe(2);
    expect(summary.find((m) => m.label === 'Lunghezza massima raggiunta')?.value).toBe(4);
  });
});
