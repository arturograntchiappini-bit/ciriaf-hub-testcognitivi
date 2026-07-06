import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, resetSettings } from './storage';
import { DEFAULTS } from '../config/defaults';

describe('storage impostazioni', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('storage vuoto → default', () => {
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('salva e ricarica (round-trip)', () => {
    const s = loadSettings();
    s.gonogo.nTrials = 120;
    saveSettings(s);
    expect(loadSettings().gonogo.nTrials).toBe(120);
  });

  it('merge robusto: campi mancanti ricadono sul default', () => {
    localStorage.setItem('ciriaf-cth-settings-v1', JSON.stringify({ gonogo: { nTrials: 50 } }));
    const loaded = loadSettings();
    expect(loaded.gonogo.nTrials).toBe(50); // valore salvato
    expect(loaded.gonogo.goRatio).toBe(DEFAULTS.gonogo.goRatio); // default preservato
    expect(loaded.stroop1).toEqual(DEFAULTS.stroop1); // test non toccato = default
  });

  it('JSON corrotto → default senza eccezioni', () => {
    localStorage.setItem('ciriaf-cth-settings-v1', '{non-json');
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('reset ripristina i default', () => {
    const s = loadSettings();
    s.nback.nTrials = 999;
    saveSettings(s);
    resetSettings();
    expect(loadSettings()).toEqual(DEFAULTS);
  });
});
