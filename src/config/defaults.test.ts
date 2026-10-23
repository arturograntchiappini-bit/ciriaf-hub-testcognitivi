import { describe, it, expect } from 'vitest';
import { DEFAULTS } from './defaults';

describe('DEFAULTS', () => {
  it('Stroop: 48 trial, ISI 500, timeout 3000', () => {
    expect(DEFAULTS.stroop1.nTrials).toBe(48);
    expect(DEFAULTS.stroop2.nTrials).toBe(48);
    expect(DEFAULTS.stroop1.isiMs).toBe(500);
    expect(DEFAULTS.stroop1.timeoutMs).toBe(3000);
  });

  it('Go/No-Go: rapporto 0.75 e 80 trial', () => {
    expect(DEFAULTS.gonogo.goRatio).toBe(0.75);
    expect(DEFAULTS.gonogo.nTrials).toBe(80);
    expect(Math.round(DEFAULTS.gonogo.nTrials * DEFAULTS.gonogo.goRatio)).toBe(60);
  });

  it('Corsi: start 3, max 9, 2 trial/livello', () => {
    expect(DEFAULTS.corsi.startLength).toBe(3);
    expect(DEFAULTS.corsi.maxLength).toBe(9);
    expect(DEFAULTS.corsi.trialsPerLevel).toBe(2);
  });

  it('N-Back: n=2 e blocco ~12 min (360 trial × 2 s)', () => {
    expect(DEFAULTS.nback.n).toBe(2);
    expect(DEFAULTS.nback.letterMs + DEFAULTS.nback.blankMs).toBe(2000);
    expect((DEFAULTS.nback.nTrials * 2000) / 60000).toBe(12);
  });

  it('WCST: mazzo 64, shift a 10', () => {
    expect(DEFAULTS.wcst.deckSize).toBe(64);
    expect(DEFAULTS.wcst.runToShift).toBe(10);
  });

  it('PVT: 100 trial, ISI 2–10 s, timeout 10 s', () => {
    expect(DEFAULTS.pvt.nTrials).toBe(100);
    expect(DEFAULTS.pvt.isiMinMs).toBe(2000);
    expect(DEFAULTS.pvt.isiMaxMs).toBe(10000);
    expect(DEFAULTS.pvt.stimulusMaxMs).toBe(10000);
  });

  it('Flanker: 96 trial con 40% incongruenti, 20% neutri e finestra di 1500 ms', () => {
    expect(DEFAULTS.flanker.nTrials).toBe(96);
    expect(DEFAULTS.flanker.incongruentRatio).toBe(0.4);
    expect(DEFAULTS.flanker.neutralRatio).toBe(0.2);
    expect(DEFAULTS.flanker.responseWindowMs).toBe(1500);
  });
});
