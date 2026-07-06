import { describe, it, expect } from 'vitest';
import { mulberry32, shuffle, randInt, pick } from './rng';

describe('mulberry32', () => {
  it('è deterministico: stessa seed → stessa sequenza', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produce valori in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seed diverse → sequenze diverse', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe('shuffle', () => {
  it('è una permutazione (stessi elementi) e non muta l’originale', () => {
    const original = [1, 2, 3, 4, 5];
    const rand = mulberry32(99);
    const shuffled = shuffle(original, rand);
    expect(shuffled).toHaveLength(5);
    expect([...shuffled].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it('è deterministico con la stessa seed', () => {
    const s1 = shuffle([1, 2, 3, 4, 5], mulberry32(5));
    const s2 = shuffle([1, 2, 3, 4, 5], mulberry32(5));
    expect(s1).toEqual(s2);
  });
});

describe('randInt', () => {
  it('resta in [min, max] inclusi', () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const v = randInt(5, 10, rand);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});

describe('pick', () => {
  it('sceglie un elemento della lista', () => {
    const rand = mulberry32(11);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(items, rand));
    }
  });
});
