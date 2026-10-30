import { describe, it, expect } from 'vitest';
import { csvField } from './export';
import { safeFilename } from '../ui/download';

describe('csvField', () => {
  it('neutralizza le formule nelle stringhe', () => {
    expect(csvField('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvField('+1+1')).toBe("'+1+1");
    expect(csvField('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvField('-cmd|calc')).toBe("'-cmd|calc");
  });

  it('non altera numeri e stringhe numeriche', () => {
    expect(csvField(-12.5)).toBe('-12.5');
    expect(csvField('-30')).toBe('-30');
    expect(csvField('same--30')).toBe('same--30');
    expect(csvField(null)).toBe('');
  });

  it('mette tra virgolette i ritorni a capo', () => {
    expect(csvField('a\rb')).toBe('"a\rb"');
  });
});

describe('safeFilename', () => {
  it('rimuove separatori di percorso e caratteri di controllo', () => {
    expect(safeFilename('../../etc/passwd')).not.toMatch(/[\/]/);
    expect(safeFilename('a:b*c?.json')).toBe('a_b_c_.json');
    expect(safeFilename('...')).toBe('download');
    expect(safeFilename('x'.repeat(500))).toHaveLength(120);
  });
});
