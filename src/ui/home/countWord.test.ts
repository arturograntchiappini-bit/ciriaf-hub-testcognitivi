import { describe, it, expect } from 'vitest';
import { countWord } from './countWord';

describe('countWord', () => {
  it('should_spell_small_counts_with_a_capital_letter', () => {
    expect(countWord(7)).toBe('Sette');
    expect(countWord(10)).toBe('Dieci');
  });

  it('should_fall_back_to_digits_beyond_twelve', () => {
    expect(countWord(15)).toBe('15');
  });
});
