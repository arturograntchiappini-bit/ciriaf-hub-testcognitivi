import { describe, it, expect } from 'vitest';
import { INSTRUCTIONS, instructionsFor, nBackInstruction } from './instructions';

describe('nBackInstruction', () => {
  it('segue il livello n scelto', () => {
    expect(nBackInstruction(1).keyHints[0]).toContain('1 passo fa');
    expect(nBackInstruction(1).paragraphs[1]).toContain('UNA posizione');
    expect(nBackInstruction(3).keyHints[0]).toContain('3 passi fa');
    expect(nBackInstruction(3).title).toBe('N-Back (3-back)');
  });

  it('ripiega su 2 con un valore non valido', () => {
    expect(nBackInstruction(Number.NaN).title).toBe('N-Back (2-back)');
    expect(nBackInstruction(7).title).toBe('N-Back (2-back)');
  });
});

describe('instructionsFor', () => {
  it('adatta l’N-Back ai parametri e lascia invariati gli altri test', () => {
    expect(instructionsFor('nback', { n: 3 }).title).toBe('N-Back (3-back)');
    expect(instructionsFor('nback').title).toBe('N-Back (2-back)');
    expect(instructionsFor('flanker', { n: 3 })).toBe(INSTRUCTIONS.flanker);
  });
});
