/**
 * Generatore pseudo-casuale deterministico (mulberry32) e utilità.
 * Deterministico → i generatori dei test sono riproducibili e unit-testabili.
 * @see docs/architettura.md — sezione "Generazione delle sequenze"
 */

/** Ritorna una funzione che produce numeri in [0, 1) deterministici dato `seed`. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates: ritorna una NUOVA lista permutata, senza mutare l'originale. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/** Intero uniforme in [min, max] inclusi. */
export function randInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Sceglie un elemento a caso dalla lista (assume lista non vuota). */
export function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)] as T;
}
