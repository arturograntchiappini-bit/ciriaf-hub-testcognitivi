import { describe, it, expect } from 'vitest';
import {
  CORSI_BLOCKS,
  pathLength,
  countCrossings,
  generateBalancedSequences,
  meanPairwiseDistance,
  targetPathLength,
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

describe('bersaglio di difficoltà', () => {
  it('meanPairwiseDistance è la media su tutte le coppie distinte', () => {
    // Quadrato di lato 10: 8 lati (10) e 4 diagonali (√200) fra coppie ordinate
    const square: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const expected = (8 * 10 + 4 * Math.sqrt(200)) / 12;
    expect(meanPairwiseDistance(square)).toBeCloseTo(expected, 9);
  });

  it('targetPathLength è (length − 1) passi di lunghezza media', () => {
    const d = meanPairwiseDistance();
    expect(targetPathLength(1)).toBe(0);
    expect(targetPathLength(5)).toBeCloseTo(4 * d, 9);
  });

  it('non dipende dal seed: è una costante del layout', () => {
    expect(targetPathLength(6)).toBe(targetPathLength(6));
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
    // Su molte lunghezze e seed, non su un caso fortunato: la garanzia deve
    // valere sempre, non solo dove la banda è densa.
    for (const length of [3, 4, 5, 6, 7, 9]) {
      for (let seed = 1; seed <= 25; seed++) {
        const [a, b] = generateBalancedSequences(length, 2, PARAMS, mulberry32(seed));
        expect(a!.crossings).toBe(b!.crossings);
        expect(Math.abs(a!.pathLength - b!.pathLength)).toBeLessThanOrEqual(
          PARAMS.complexityTolerance,
        );
      }
    }
  });

  it('nessuna sequenza del livello è il rovescio di un’altra', () => {
    // Un rovescio ha pathLength e incroci identici: senza esclusione esplicita il
    // criterio di somiglianza lo sceglierebbe sistematicamente.
    for (const length of [3, 4, 5, 7]) {
      for (let seed = 1; seed <= 30; seed++) {
        const [a, b] = generateBalancedSequences(length, 2, PARAMS, mulberry32(seed));
        const reversed = [...b!.indices].reverse();
        expect(a!.indices).not.toEqual(reversed);
      }
    }
  });

  it('ogni run resta entro la tolleranza dal bersaglio del livello', () => {
    for (const length of [3, 5, 7, 9]) {
      const target = targetPathLength(length);
      for (let seed = 1; seed <= 30; seed++) {
        const seqs = generateBalancedSequences(length, 2, PARAMS, mulberry32(seed));
        for (const s of seqs) {
          expect(Math.abs(s.pathLength - target)).toBeLessThanOrEqual(PARAMS.complexityTolerance);
        }
      }
    }
  });

  it('run diverse producono sequenze diverse', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const s of generateBalancedSequences(5, 2, PARAMS, mulberry32(seed))) {
        seen.add(s.indices.join('-'));
      }
    }
    // 40 run × 2 sequenze: senza variabilità il totale distinto sarebbe minimo.
    expect(seen.size).toBeGreaterThan(40);
  });

  it('stesso seed → sequenze identiche (riproducibilità)', () => {
    const a = generateBalancedSequences(6, 2, PARAMS, mulberry32(7));
    const b = generateBalancedSequences(6, 2, PARAMS, mulberry32(7));
    expect(a.map((s) => s.indices)).toEqual(b.map((s) => s.indices));
  });
});

describe('span e regola di arresto', () => {
  it('corsiSpan: baseline startLength-1 + 0.5 per trial superato, 0 se nessuno', () => {
    expect(corsiSpan(0)).toBe(0);
    expect(corsiSpan(0, 3)).toBe(0);
    // startLength=2 (default): superando entrambi i trial fino a L=5 (8 trial) → 5
    expect(corsiSpan(8, 2)).toBe(5); // (2-1) + 0.5*8 = 5
    // startLength=3: baseline 2, + 0.5*6 = 5
    expect(corsiSpan(6, 3)).toBe(5);
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
    const summary = scoreCorsi(trials, 3);
    // MBS = lunghezza massima riprodotta correttamente (len4 = "0-1-2-3")
    expect(summary.find((m) => m.label === 'Span Visuo-Spaziale (MBS)')?.value).toBe(4);
    // Ponderato: baseline (3-1)=2 + 0.5*2 superati = 3
    expect(summary.find((m) => m.label === 'Punteggio Corsi (Ponderato)')?.value).toBe(3);
    expect(summary.find((m) => m.label === 'Trial totali superati')?.value).toBe(2);
  });
});
