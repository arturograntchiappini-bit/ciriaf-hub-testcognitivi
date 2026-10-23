const WORDS = ['Zero', 'Uno', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto', 'Nove', 'Dieci', 'Undici', 'Dodici'];

/** Numero in lettere con l'iniziale maiuscola (per l'inizio di frase); oltre il dodici resta in cifre. */
export function countWord(count: number): string {
  return WORDS[count] ?? String(count);
}
