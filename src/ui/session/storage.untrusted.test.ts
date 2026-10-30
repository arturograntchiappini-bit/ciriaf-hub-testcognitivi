import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULTS } from '../../config/defaults';
import { importTemplateJson, loadRun, loadTemplates, MAX_IMPORT_BYTES } from './storage';

const hostile = {
  name: 'x'.repeat(5000),
  totalMs: 1e18,
  phases: [
    { id: 'p', name: 'f', durationMs: -10, pins: [{ id: 'q', offsetMs: Infinity, battery: [
      { testId: 'stroop1', params: { nTrials: 1e9 }, practice: 'si' },
      { testId: '__proto__', params: {} },
      { testId: 'constructor' },
    ] }] },
    'non-una-fase',
  ],
};

describe('import e persistenza di protocolli non fidati', () => {
  beforeEach(() => localStorage.clear());

  it('importTemplateJson limita nomi, durate, test e parametri', () => {
    const t = importTemplateJson(JSON.stringify(hostile));
    expect(t.name).toHaveLength(200);
    expect(t.totalMs).toBe(7 * 24 * 3600 * 1000);
    expect(t.phases).toHaveLength(1);
    expect(t.phases[0]!.durationMs).toBe(0);
    const battery = t.phases[0]!.pins[0]!.battery;
    expect(battery).toHaveLength(1);
    expect(battery[0]!.params.nTrials).toBe(400);
    expect(battery[0]!.practice).toBe(false);
    expect(battery[0]!.params.nTrials).not.toBe(DEFAULTS.stroop1.nTrials);
  });

  it('rifiuta strutture non valide e file enormi', () => {
    expect(() => importTemplateJson('[]')).toThrow();
    expect(() => importTemplateJson('{"name":1,"phases":[]}')).toThrow();
    expect(() => importTemplateJson(' '.repeat(MAX_IMPORT_BYTES + 1))).toThrow(/troppo grande/);
  });

  it('loadTemplates e loadRun scartano i dati manomessi', () => {
    localStorage.setItem('ciriaf-cth-session-templates-v1', JSON.stringify([hostile, 5, null, { name: 3 }]));
    expect(loadTemplates()).toHaveLength(1);
    localStorage.setItem('ciriaf-cth-session-run-v1', JSON.stringify({ runId: 1 }));
    expect(loadRun()).toBeNull();
    localStorage.setItem('ciriaf-cth-session-run-v1', '{rotto');
    expect(loadRun()).toBeNull();
  });
});
