import { describe, it, expect } from 'vitest';
import { makeSessionId } from './session';

describe('makeSessionId', () => {
  it('ha formato XXXX-HHMM con orario deterministico dalla data', () => {
    const id = makeSessionId(new Date(2026, 6, 6, 14, 30, 0));
    expect(id).toMatch(/^[A-Z2-9]{4}-1430$/);
  });

  it('impagina l’orario con zeri iniziali', () => {
    const id = makeSessionId(new Date(2026, 6, 6, 9, 5, 0));
    expect(id.endsWith('-0905')).toBe(true);
  });

  it('usa la funzione random iniettata per la parte casuale', () => {
    const id = makeSessionId(new Date(2026, 6, 6, 0, 0, 0), () => 0);
    // rand()=0 → primo carattere dell'alfabeto 'A'
    expect(id).toBe('AAAA-0000');
  });
});
