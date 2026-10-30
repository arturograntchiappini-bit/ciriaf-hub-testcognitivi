import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULTS } from '../../config/defaults';
import { loadSettings } from '../storage';
import { loadPreferences } from '../preferences';
import { PARAM_SECTIONS } from './paramFields';
import { isTestKey, sanitizeParams } from './sanitize';

describe('sanitizeParams', () => {
  it('i default rientrano nei limiti dichiarati', () => {
    for (const section of PARAM_SECTIONS) {
      const defaults = DEFAULTS[section.testKey] as unknown as Record<string, number>;
      for (const f of section.fields) {
        expect(defaults[f.key], `${section.testKey}.${f.key}`).toBeGreaterThanOrEqual(f.min);
        expect(defaults[f.key], `${section.testKey}.${f.key}`).toBeLessThanOrEqual(f.max);
      }
    }
  });

  it('riporta nei limiti i valori fuori scala e scarta quelli non numerici', () => {
    const out = sanitizeParams('stroop1', { nTrials: 1e9, fixationMs: -5, timeoutMs: '3000', isiMs: Number.NaN, extra: 1 });
    expect(out.nTrials).toBe(400);
    expect(out.fixationMs).toBe(0);
    expect(out.timeoutMs).toBe(DEFAULTS.stroop1.timeoutMs);
    expect(out.isiMs).toBe(DEFAULTS.stroop1.isiMs);
    expect(out).not.toHaveProperty('extra');
  });

  it('ignora le proprietà ereditate e __proto__', () => {
    const hostile = JSON.parse('{"__proto__":{"nTrials":99},"constructor":{"nTrials":99}}');
    expect(sanitizeParams('stroop1', hostile)).toEqual(DEFAULTS.stroop1);
    expect(({} as Record<string, unknown>).nTrials).toBeUndefined();
  });

  it('isTestKey accetta solo chiavi note', () => {
    expect(isTestKey('stroop1')).toBe(true);
    expect(isTestKey('toString')).toBe(false);
    expect(isTestKey(42)).toBe(false);
  });
});

describe('storage non fidato', () => {
  beforeEach(() => localStorage.clear());

  it('loadSettings sanifica i valori manomessi', () => {
    localStorage.setItem('ciriaf-cth-settings-v1', JSON.stringify({ nback: { nTrials: 1e12 }, gonogo: 'x' }));
    const s = loadSettings();
    expect(s.nback.nTrials).toBeLessThanOrEqual(1000);
    expect(s.gonogo).toEqual(DEFAULTS.gonogo);
  });

  it('loadPreferences accetta solo booleani', () => {
    localStorage.setItem('ciriaf-cth-prefs-v1', JSON.stringify({ feedbackDuringTest: 'yes', polluted: 1 }));
    expect(loadPreferences()).toEqual({ feedbackDuringTest: false });
    localStorage.setItem('ciriaf-cth-prefs-v1', 'null');
    expect(loadPreferences()).toEqual({ feedbackDuringTest: false });
  });
});
