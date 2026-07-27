import { describe, it, expect } from 'vitest';
import {
  flattenPins,
  sessionTotalMs,
  phaseSpans,
  phaseAtElapsed,
  computeSessionState,
  phaseIndexAtOffset,
  movePin,
  movePinById,
  distributePhasesEvenly,
  makeRunId,
  type SessionTemplate,
} from './model';

function template(): SessionTemplate {
  return {
    id: 't1',
    name: 'Protocollo',
    createdAt: '2026-07-07T10:00:00.000Z',
    totalMs: 60 * 60_000,
    phases: [
      {
        id: 'p1',
        name: 'Baseline',
        durationMs: 30 * 60_000,
        pins: [
          { id: 'pin-a', offsetMs: 0, battery: [{ testId: 'stroop1', params: {}, practice: false }] },
          { id: 'pin-b', offsetMs: 15 * 60_000, battery: [{ testId: 'nback', params: {}, practice: false }] },
        ],
      },
      {
        id: 'p2',
        name: 'Carico',
        durationMs: 30 * 60_000,
        pins: [
          { id: 'pin-c', offsetMs: 30 * 60_000, battery: [{ testId: 'gonogo', params: {}, practice: false }] },
        ],
      },
    ],
  };
}

describe('phaseIndexAtOffset', () => {
  it('trova la fase che contiene l’offset, con clamp agli estremi', () => {
    const t = template(); // p1 [0,30], p2 [30,60] minuti
    expect(phaseIndexAtOffset(t, 0)).toBe(0);
    expect(phaseIndexAtOffset(t, 15 * 60_000)).toBe(0);
    expect(phaseIndexAtOffset(t, 30 * 60_000)).toBe(1); // confine → fase successiva
    expect(phaseIndexAtOffset(t, 45 * 60_000)).toBe(1);
    expect(phaseIndexAtOffset(t, 999 * 60_000)).toBe(1); // oltre la fine → ultima
    expect(phaseIndexAtOffset(t, -5)).toBe(0); // prima dell'inizio → prima
  });
});

describe('movePin', () => {
  it('sposta un pin oltre il confine e lo riattacca alla fase corretta', () => {
    const t = template();
    // pin-b è in p1 (indice 1 della fase 0); spostalo a 40 min → deve finire in p2
    const next = movePin(t, 0, 1, 40 * 60_000);
    expect(next.phases[0]!.pins.map((p) => p.id)).toEqual(['pin-a']);
    const moved = next.phases[1]!.pins.find((p) => p.id === 'pin-b');
    expect(moved?.offsetMs).toBe(40 * 60_000);
    // immutabilità: l'originale non cambia
    expect(t.phases[0]!.pins.map((p) => p.id)).toEqual(['pin-a', 'pin-b']);
  });

  it('clampa l’offset a [0, totale] e resta nella fase se non cambia intervallo', () => {
    const t = template();
    const next = movePin(t, 0, 1, 999 * 60_000); // oltre la fine → clamp a 60 min → ultima fase
    const moved = next.phases[1]!.pins.find((p) => p.id === 'pin-b');
    expect(moved?.offsetMs).toBe(60 * 60_000);
  });
});

describe('movePinById', () => {
  it('sposta il pin (per id) attraverso i confini di fase, indipendente dagli indici', () => {
    const t = template();
    const next = movePinById(t, 'pin-b', 40 * 60_000);
    expect(next.phases[0]!.pins.map((p) => p.id)).toEqual(['pin-a']);
    expect(next.phases[1]!.pins.some((p) => p.id === 'pin-b')).toBe(true);
  });
  it('ritorna il template invariato se l’id non esiste', () => {
    const t = template();
    expect(movePinById(t, 'inesistente', 10)).toBe(t);
  });
});

describe('distributePhasesEvenly', () => {
  it('divide totalMs equamente, con la somma esatta (resto sull’ultima)', () => {
    const t = template();
    t.totalMs = 50 * 60_000 + 1; // dispari, per verificare il resto
    const next = distributePhasesEvenly(t);
    const sum = next.phases.reduce((a, p) => a + p.durationMs, 0);
    expect(sum).toBe(t.totalMs);
    expect(next.phases[0]!.durationMs).toBe(1500000);
    expect(next.phases[1]!.durationMs).toBe(1500001);
  });
});

describe('flattenPins', () => {
  it('ordina i pin per offset globale attraverso le fasi', () => {
    const flat = flattenPins(template());
    expect(flat.map((f) => f.pin.id)).toEqual(['pin-a', 'pin-b', 'pin-c']);
    expect(flat[2]!.phase.name).toBe('Carico');
  });
});

describe('sessionTotalMs', () => {
  it('è la durata totale esplicita', () => {
    expect(sessionTotalMs(template())).toBe(60 * 60_000);
  });
  it('ricade sulla somma delle fasi se totalMs manca', () => {
    const t = template();
    t.totalMs = 0;
    expect(sessionTotalMs(t)).toBe(60 * 60_000);
  });
  it('è 0 per template vuoto', () => {
    expect(sessionTotalMs({ id: 'x', name: 'y', createdAt: '', totalMs: 0, phases: [] })).toBe(0);
  });
});

describe('phaseSpans / phaseAtElapsed', () => {
  it('calcola gli intervalli cumulativi delle fasi', () => {
    const spans = phaseSpans(template());
    expect(spans[0]).toMatchObject({ startMs: 0, endMs: 30 * 60_000 });
    expect(spans[1]).toMatchObject({ startMs: 30 * 60_000, endMs: 60 * 60_000 });
  });
  it('trova la fase del tempo trascorso', () => {
    expect(phaseAtElapsed(template(), 10 * 60_000)?.name).toBe('Baseline');
    expect(phaseAtElapsed(template(), 45 * 60_000)?.name).toBe('Carico');
    expect(phaseAtElapsed(template(), 90 * 60_000)?.name).toBe('Carico'); // oltre la fine → ultima
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
