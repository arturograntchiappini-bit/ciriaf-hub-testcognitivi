import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  exportTemplateJson,
  importTemplateJson,
  loadRun,
  saveRun,
  clearRun,
} from './storage';
import type { SessionTemplate, SessionRun } from '../../engine/session/model';

function tpl(id: string, name = 'Protocollo'): SessionTemplate {
  return {
    id,
    name,
    createdAt: '2026-07-07T09:00:00.000Z',
    phases: [
      { id: 'p1', name: 'Baseline', pins: [{ id: 'pin-a', offsetMs: 0, battery: [{ testId: 'stroop1', params: {}, practice: false }] }] },
    ],
  };
}

describe('storage modelli', () => {
  beforeEach(() => localStorage.clear());

  it('storage vuoto → nessun modello', () => {
    expect(loadTemplates()).toEqual([]);
  });

  it('salva, aggiorna per id ed elimina', () => {
    saveTemplate(tpl('a', 'Uno'));
    saveTemplate(tpl('b', 'Due'));
    expect(loadTemplates()).toHaveLength(2);
    saveTemplate(tpl('a', 'Uno-bis')); // update per id
    expect(loadTemplates().find((t) => t.id === 'a')?.name).toBe('Uno-bis');
    expect(loadTemplates()).toHaveLength(2);
    deleteTemplate('a');
    expect(loadTemplates().map((t) => t.id)).toEqual(['b']);
  });

  it('export/import round-trip', () => {
    const json = exportTemplateJson(tpl('x', 'Esporta'));
    const imported = importTemplateJson(json);
    expect(imported.name).toBe('Esporta');
    expect(imported.phases).toHaveLength(1);
  });

  it('import di JSON non valido lancia', () => {
    expect(() => importTemplateJson('{"foo":1}')).toThrow();
    expect(() => importTemplateJson('non-json')).toThrow();
  });
});

describe('storage run', () => {
  beforeEach(() => localStorage.clear());

  const run: SessionRun = {
    runId: 'S-AAAA-1000',
    template: tpl('a'),
    startedAtEpoch: 123,
    startedAtIso: '2026-07-07T10:00:00.000Z',
    completedPinIds: [],
    results: [],
    finished: false,
  };

  it('null se nessun run', () => {
    expect(loadRun()).toBeNull();
  });

  it('salva, ricarica e cancella il run', () => {
    saveRun(run);
    expect(loadRun()?.runId).toBe('S-AAAA-1000');
    clearRun();
    expect(loadRun()).toBeNull();
  });
});
