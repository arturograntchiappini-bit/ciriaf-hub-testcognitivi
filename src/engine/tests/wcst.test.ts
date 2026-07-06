import { describe, it, expect } from 'vitest';
import {
  WCST_STIMULUS_CARDS,
  WCST_RULE_ORDER,
  matchesOn,
  matchingDims,
  buildDeck,
  ruleForCategory,
  scoreWcst,
  type WcstParams,
  type WcstTrialMeta,
  type WcstCard,
} from './wcst';
import { mulberry32 } from '../rng';
import type { TrialResult } from '../types';

const PARAMS: WcstParams = { deckSize: 64, runToShift: 10, maxCategories: 6 };

describe('carte e matching', () => {
  it('le 4 carte stimolo sono quelle standard', () => {
    expect(WCST_STIMULUS_CARDS[0]).toEqual({ color: 'red', shape: 'triangle', number: 1 });
    expect(WCST_STIMULUS_CARDS[3]).toEqual({ color: 'blue', shape: 'circle', number: 4 });
  });

  it('matchesOn confronta la dimensione giusta', () => {
    const a: WcstCard = { color: 'red', shape: 'star', number: 3 };
    const b: WcstCard = { color: 'red', shape: 'circle', number: 1 };
    expect(matchesOn(a, b, 'color')).toBe(true);
    expect(matchesOn(a, b, 'shape')).toBe(false);
    expect(matchesOn(a, b, 'number')).toBe(false);
  });

  it('matchingDims elenca tutte le dimensioni combacianti', () => {
    const a: WcstCard = { color: 'red', shape: 'star', number: 3 };
    const b: WcstCard = { color: 'red', shape: 'star', number: 1 };
    expect(matchingDims(a, b)).toEqual(['color', 'shape']);
  });
});

describe('buildDeck', () => {
  it('costruisce un mazzo della dimensione richiesta', () => {
    expect(buildDeck(64, mulberry32(1))).toHaveLength(64);
    expect(buildDeck(128, mulberry32(1))).toHaveLength(128);
  });
});

describe('ruleForCategory', () => {
  it('cicla Colore→Forma→Numero', () => {
    expect(ruleForCategory(0)).toBe('color');
    expect(ruleForCategory(1)).toBe('shape');
    expect(ruleForCategory(2)).toBe('number');
    expect(ruleForCategory(3)).toBe('color');
    expect(WCST_RULE_ORDER).toEqual(['color', 'shape', 'number']);
  });
});

// Helper per costruire trial+meta coerenti.
function makeTrialMeta(
  correctSequence: { matched: WcstTrialMeta['matchedDims']; rule: WcstTrialMeta['currentRule'] }[],
): { trials: TrialResult[]; metas: WcstTrialMeta[] } {
  const trials: TrialResult[] = [];
  const metas: WcstTrialMeta[] = [];
  correctSequence.forEach((item, i) => {
    const correct = item.matched.includes(item.rule);
    trials.push({
      testId: 'wcst',
      sessionId: 'W',
      trialIndex: i,
      phase: 'test',
      condition: item.rule,
      stimulus: 'card',
      response: 'choice',
      correct,
      rtMs: 800,
      flag: 'VALID',
      onsetTimestamp: 0,
    });
    metas.push({ currentRule: item.rule, matchedDims: item.matched });
  });
  return { trials, metas };
}

describe('scoreWcst', () => {
  it('conta le categorie completate dopo runToShift corrette consecutive', () => {
    const params: WcstParams = { deckSize: 64, runToShift: 3, maxCategories: 6 };
    // 3 corrette su 'color' → 1 categoria completata
    const seq = [
      { matched: ['color'] as const, rule: 'color' as const },
      { matched: ['color'] as const, rule: 'color' as const },
      { matched: ['color'] as const, rule: 'color' as const },
    ].map((s) => ({ matched: [...s.matched], rule: s.rule }));
    const { trials, metas } = makeTrialMeta(seq);
    const summary = scoreWcst(trials, metas, params);
    expect(summary.find((m) => m.label === 'Categorie completate')?.value).toBe(1);
    expect(summary.find((m) => m.label === 'Errori totali')?.value).toBe(0);
  });

  it('conta errori perseverativi (persistenza sulla regola abbandonata)', () => {
    const params: WcstParams = { deckSize: 64, runToShift: 3, maxCategories: 6 };
    // Completa categoria 'color' (3 corrette), poi la regola diventa 'shape'.
    // Il soggetto continua a scegliere carte che combaciano su 'color' (vecchia regola) → errori perseverativi.
    const seq: { matched: ('color' | 'shape' | 'number')[]; rule: 'color' | 'shape' | 'number' }[] = [
      { matched: ['color'], rule: 'color' },
      { matched: ['color'], rule: 'color' },
      { matched: ['color'], rule: 'color' }, // completa categoria 1 → PP='color', regola→shape
      { matched: ['color'], rule: 'shape' }, // errore perseverativo (combacia col vecchio colore)
      { matched: ['color'], rule: 'shape' }, // errore perseverativo
    ];
    const { trials, metas } = makeTrialMeta(seq);
    const summary = scoreWcst(trials, metas, params);
    expect(summary.find((m) => m.label === 'Categorie completate')?.value).toBe(1);
    expect(summary.find((m) => m.label === 'Errori totali')?.value).toBe(2);
    expect(summary.find((m) => m.label === 'Errori perseverativi')?.value).toBe(2);
  });

  it('failure to maintain set: errore dopo 5–9 corrette consecutive', () => {
    // 6 corrette su 'color' (runToShift=10, quindi nessuna categoria completata), poi errore
    const seq: { matched: ('color' | 'shape' | 'number')[]; rule: 'color' | 'shape' | 'number' }[] = [
      ...Array.from({ length: 6 }, () => ({ matched: ['color'] as ('color')[], rule: 'color' as const })),
      { matched: ['shape'], rule: 'color' }, // errore dopo 6 corrette → FTMS
    ];
    const { trials, metas } = makeTrialMeta(seq);
    const summary = scoreWcst(trials, metas, PARAMS);
    expect(summary.find((m) => m.label === 'Failure to maintain set')?.value).toBe(1);
  });
});
