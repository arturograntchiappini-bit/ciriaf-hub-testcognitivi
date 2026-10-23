import { describe, it, expect } from 'vitest';
import { countPerseveration, type WcstDim } from './wcst';

type Dims = readonly WcstDim[];

/** Una risposta: dimensioni su cui combacia e regola attiva (colore salvo diversa indicazione). */
function step(matched: Dims, rule: WcstDim = 'color'): { matched: Dims; rule: WcstDim; correct: boolean } {
  return { matched, rule, correct: matched.includes(rule) };
}

function count(steps: ReturnType<typeof step>[], runToShift = 10): { errors: number; responses: number } {
  return countPerseveration(
    steps,
    steps.map((s) => s.rule),
    runToShift,
  );
}

describe('countPerseveration — principio perseverato', () => {
  it('stabilisce il PP al primo errore non ambiguo e conta gli errori successivi sulla stessa dimensione', () => {
    expect(count([step(['shape']), step(['shape']), step(['shape'])])).toEqual({ errors: 3, responses: 3 });
  });

  it('una risposta che non combacia con nulla non è perseverativa e non stabilisce il PP', () => {
    expect(count([step([]), step(['shape'])])).toEqual({ errors: 1, responses: 1 });
  });

  it('dopo il completamento di una categoria il PP diventa il criterio abbandonato', () => {
    const seq = [
      step(['color'], 'color'),
      step(['color'], 'color'),
      step(['color'], 'color'), // categoria completata (runToShift 3)
      step(['color'], 'shape'),
      step(['number'], 'shape'),
    ];
    expect(count(seq, 3)).toEqual({ errors: 1, responses: 1 });
  });
});

describe('countPerseveration — risposte ambigue', () => {
  it('un errore ambiguo che combacia col PP non è perseverativo se non è incastrato', () => {
    const seq = [step(['shape']), step(['shape', 'number']), step(['number'])];
    expect(count(seq)).toEqual({ errors: 1, responses: 1 });
  });

  it('un errore ambiguo incastrato tra due errori perseverativi non ambigui lo è', () => {
    const seq = [step(['shape']), step(['shape', 'number']), step(['shape'])];
    expect(count(seq)).toEqual({ errors: 3, responses: 3 });
  });

  it('una risposta ambigua corretta incastrata è perseverativa ma non è un errore', () => {
    const seq = [step(['shape']), step(['color', 'shape']), step(['shape'])];
    expect(count(seq)).toEqual({ errors: 2, responses: 3 });
  });

  it('una risposta corretta non ambigua spezza l’incastro', () => {
    const seq = [step(['shape']), step(['color']), step(['shape', 'number']), step(['shape'])];
    expect(count(seq)).toEqual({ errors: 2, responses: 2 });
  });

  it('subito dopo il completamento di una categoria una risposta ambigua non è perseverativa', () => {
    const seq = [
      step(['color'], 'color'),
      step(['color'], 'color'),
      step(['color'], 'color'),
      step(['color', 'number'], 'shape'), // ambigua appena dopo la categoria
      step(['color'], 'shape'),
    ];
    expect(count(seq, 3)).toEqual({ errors: 1, responses: 1 });
  });
});

describe('countPerseveration — tre errori consecutivi', () => {
  it('spostano il PP: il primo dei tre non è perseverativo, il secondo e il terzo sì, e anche i successivi', () => {
    const seq = [
      step(['shape']), // stabilisce il PP = forma
      step(['number']), // 1° errore su una nuova dimensione
      step(['number']), // 2°
      step(['number']), // 3° → nuovo PP = numero
      step(['number']), // perseverativo sul nuovo PP
    ];
    expect(count(seq)).toEqual({ errors: 4, responses: 4 });
  });

  it('non spostano il PP se gli errori non sono consecutivi', () => {
    const seq = [step(['shape']), step(['number']), step(['color']), step(['number']), step(['number'])];
    expect(count(seq)).toEqual({ errors: 1, responses: 1 });
  });

  it('le risposte ambigue tra il secondo e il terzo errore, sulla stessa dimensione, contano come perseverative', () => {
    const seq = [step(['shape']), step(['number']), step(['number']), step(['number', 'shape']), step(['number'])];
    expect(count(seq)).toEqual({ errors: 4, responses: 4 });
  });
});
