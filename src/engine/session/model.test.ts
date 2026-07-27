import { describe, it, expect } from 'vitest';
import {
  flattenPins,
  sessionTotalMs,
  computeSessionState,
  makeRunId,
  type SessionTemplate,
} from './model';

function template(): SessionTemplate {
  return {
    id: 't1',
    name: 'Protocollo',
    createdAt: '2026-07-07T10:00:00.000Z',
    phases: [
      {
        id: 'p1',
        name: 'Baseline',
        pins: [
          { id: 'pin-a', offsetMs: 0, battery: [{ testId: 'stroop1', params: {}, practice: false }] },
          { id: 'pin-b', offsetMs: 15 * 60_000, battery: [{ testId: 'nback', params: {}, practice: false }] },
        ],
      },
      {
        id: 'p2',
        name: 'Carico',
        pins: [
          { id: 'pin-c', offsetMs: 30 * 60_000, battery: [{ testId: 'gonogo', params: {}, practice: false }] },
        ],
      },
    ],
  };
}

describe('flattenPins', () => {
  it('ordina i pin per offset globale attraverso le fasi', () => {
    const flat = flattenPins(template());
    expect(flat.map((f) => f.pin.id)).toEqual(['pin-a', 'pin-b', 'pin-c']);
    expect(flat[2]!.phase.name).toBe('Carico');
  });
});

describe('sessionTotalMs', () => {
  it('è l’offset dell’ultimo pin', () => {
    expect(sessionTotalMs(template())).toBe(30 * 60_000);
  });
  it('è 0 per template senza pin', () => {
    expect(sessionTotalMs({ id: 'x', name: 'y', createdAt: '', phases: [] })).toBe(0);
  });
});

describe('computeSessionState', () => {
  const t = template();

  it('prima del primo pin: next = primo, countdown positivo', () => {
    const s = computeSessionState(t, 0, []);
    expect(s.nextPin?.id).toBe('pin-a');
    expect(s.due).toBe(true); // offset 0 → dovuto subito
    expect(s.currentPhaseName).toBe('Baseline');
    expect(s.upcomingTests).toEqual(['stroop1']);
    expect(s.total).toBe(3);
    expect(s.positionIndex).toBe(0);
  });

  it('in attesa del secondo pin', () => {
    const s = computeSessionState(t, 5 * 60_000, ['pin-a']);
    expect(s.nextPin?.id).toBe('pin-b');
    expect(s.countdownMs).toBe(10 * 60_000); // 15 - 5 min
    expect(s.due).toBe(false);
    expect(s.positionIndex).toBe(1);
  });

  it('sforo: elapsed oltre l’offset del prossimo non completato → dovuto', () => {
    const s = computeSessionState(t, 40 * 60_000, ['pin-a', 'pin-b']);
    expect(s.nextPin?.id).toBe('pin-c');
    expect(s.countdownMs).toBeLessThanOrEqual(0);
    expect(s.due).toBe(true);
    expect(s.currentPhaseName).toBe('Carico');
  });

  it('tutte completate → done', () => {
    const s = computeSessionState(t, 60 * 60_000, ['pin-a', 'pin-b', 'pin-c']);
    expect(s.done).toBe(true);
    expect(s.nextPin).toBeNull();
    expect(s.positionIndex).toBe(3);
    expect(s.currentPhaseName).toBe('Carico');
  });
});

describe('makeRunId', () => {
  it('ha formato S-XXXX-HHMM', () => {
    const id = makeRunId(new Date(2026, 6, 7, 14, 30), () => 0);
    expect(id).toBe('S-AAAA-1430');
    expect(makeRunId(new Date(2026, 6, 7, 9, 5))).toMatch(/^S-[A-Z2-9]{4}-0905$/);
  });
});
