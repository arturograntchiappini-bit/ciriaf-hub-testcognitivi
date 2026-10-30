/** Regressioni dei difetti trovati dal confronto TS ↔ Rust (vedi desktop/fixtures/DIVERGENZE.md). */
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';
import { generateGoNoGo } from './gonogo';
import { splitIntoChunks } from './nback';
import { scoreWcst, type WcstTrialMeta } from './wcst';
import { generateTrail, trailLabels } from './trailMaking';
import { rotationSlope } from './mentalRotation';
import { searchSlope } from './visualSearch';

const trial = (over: Partial<TrialResult>): TrialResult => ({
  testId: 'wcst', sessionId: 'S', trialIndex: 0, phase: 'test', condition: 'c', stimulus: 's', response: 'x',
  correct: true, rtMs: 500, flag: 'VALID', onsetTimestamp: 0, ...over,
});

const maxRun = (kinds: string[], kind: string): number => {
  let best = 0;
  let run = 0;
  for (const k of kinds) best = Math.max(best, (run = k === kind ? run + 1 : 0));
  return best;
};

describe('Go/No-Go: vincolo anti-cluster', () => {
  it.each([1, 42, 2026, 7, 99])('mai più di 2 No-Go di fila con rapporto 0.5 (seme %i)', (seed) => {
    const seq = generateGoNoGo({ nTrials: 80, goRatio: 0.5, stimulusMs: 800, isiMinMs: 500, isiMaxMs: 1000, practiceTrials: 0 }, mulberry32(seed));
    expect(seq.filter((s) => s.kind === 'go')).toHaveLength(40);
    expect(maxRun(seq.map((s) => s.kind), 'nogo')).toBeLessThanOrEqual(2);
  });

  it('termina anche quando i No-Go superano i Go', () => {
    const seq = generateGoNoGo({ nTrials: 100, goRatio: 0.1, stimulusMs: 800, isiMinMs: 500, isiMaxMs: 1000, practiceTrials: 0 }, mulberry32(3));
    expect(seq).toHaveLength(100);
    expect(seq.filter((s) => s.kind === 'go')).toHaveLength(10);
  });
});

describe('N-Back: quartili', () => {
  it('bilancia i blocchi senza lasciarne di vuoti', () => {
    expect(splitIntoChunks([1, 2, 3, 4, 5], 4).map((c) => c.length)).toEqual([2, 1, 1, 1]);
    expect(splitIntoChunks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4).map((c) => c.length)).toEqual([3, 3, 2, 2]);
    expect(splitIntoChunks([], 4).map((c) => c.length)).toEqual([0, 0, 0, 0]);
    expect(splitIntoChunks([1, 2], 0)).toEqual([]);
  });
});

describe('WCST: allineamento delle meta', () => {
  it('un trial interrotto non sfalsa le meta dei trial successivi', () => {
    const params = { deckSize: 64, runToShift: 3, maxCategories: 6 };
    const trials = [trial({}), trial({ flag: 'INTERRUPTED' }), trial({}), trial({}), trial({})];
    const metas: WcstTrialMeta[] = [
      { currentRule: 'color', matchedDims: ['color'] },
      { currentRule: 'shape', matchedDims: ['number'] }, // meta del trial interrotto: errore che NON deve contare
      { currentRule: 'color', matchedDims: ['color'] },
      { currentRule: 'color', matchedDims: ['color'] },
      { currentRule: 'color', matchedDims: ['color'] },
    ];
    const summary = scoreWcst(trials, metas, params);
    expect(summary.find((m) => m.label === 'Errori totali')?.value).toBe(0);
    expect(summary.find((m) => m.label === 'Trial totali')?.value).toBe(4);
    expect(summary.find((m) => m.label === 'Categorie completate')?.value).toBe(1);
  });
});

describe('Trail Making', () => {
  const minDistance = (circles: { x: number; y: number }[]): number => {
    let best = Infinity;
    for (let i = 0; i < circles.length; i++)
      for (let j = i + 1; j < circles.length; j++) best = Math.min(best, Math.hypot(circles[i]!.x - circles[j]!.x, circles[i]!.y - circles[j]!.y));
    return best;
  };

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('rispetta la distanza minima anche con 51 cerchi (seme %i)', (seed) => {
    expect(minDistance(generateTrail('A', 51, mulberry32(seed)))).toBeGreaterThanOrEqual(0.11 - 1e-12);
  });

  it('la parte B si ferma a 53 cerchi, senza etichette mancanti', () => {
    const labels = trailLabels('B', 80);
    expect(labels).toHaveLength(53);
    expect(labels.every((l) => typeof l === 'string' && l.length > 0)).toBe(true);
    expect(labels.slice(-2)).toEqual(['Z', '27']);
  });
});

describe('parseCondition più rigido', () => {
  it('la rotazione mentale ignora angoli esadecimali o binari', () => {
    const t = (condition: string, rt: number): TrialResult => trial({ testId: 'mentalRotation', condition, rtMs: rt });
    const slope = rotationSlope([t('same-0', 1000), t('same-60', 1600), t('same-0x1A', 99999), t('same-0b11', 99999)]);
    expect(slope?.slope).toBeCloseTo(10, 6);
  });

  it('Visual Search scarta la numerosità vuota', () => {
    const t = (condition: string, rt: number): TrialResult => trial({ testId: 'visualSearch', condition, rtMs: rt });
    const rows = [t('feature-present-4', 600), t('feature-present-8', 700), t('feature-present-', 99999)];
    expect(searchSlope(rows, 'feature', true)?.slope).toBeCloseTo(25, 6);
  });
});
