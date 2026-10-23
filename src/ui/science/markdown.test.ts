import { describe, it, expect } from 'vitest';
import { collectLinks, isSafeHref, parseInline, parseMarkdown, slugify } from './markdown';

describe('slugify', () => {
  it('rimuove accenti e punteggiatura', () => {
    expect(slugify('3. Parametri implementati e loro origine')).toBe('3-parametri-implementati-e-loro-origine');
    expect(slugify('Metriche e formule — è così')).toBe('metriche-e-formule-e-cosi');
  });
});

describe('parseInline', () => {
  it('riconosce grassetto, corsivo, codice e formule', () => {
    const nodes = parseInline('a **b** *c* `d` $x^2$');
    expect(nodes.map((n) => n.kind)).toEqual(['text', 'strong', 'text', 'em', 'text', 'code', 'text', 'math']);
  });

  it('trasforma un URL nudo in link senza la punteggiatura finale', () => {
    const [link, tail] = parseInline('https://doi.org/10.1/abc.');
    expect(link).toMatchObject({ kind: 'link', href: 'https://doi.org/10.1/abc' });
    expect(tail).toEqual({ kind: 'text', value: '.' });
  });

  it('gestisce i link markdown e gli autolink tra parentesi angolari', () => {
    expect(parseInline('[LinkedIn](https://example.org/x)')[0]).toMatchObject({ kind: 'link', href: 'https://example.org/x' });
    expect(parseInline('<https://example.org>')[0]).toMatchObject({ kind: 'link', href: 'https://example.org' });
  });
});

describe('isSafeHref', () => {
  it('ammette solo http e https', () => {
    expect(isSafeHref('https://doi.org/x')).toBe(true);
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,<b>x</b>')).toBe(false);
    expect(isSafeHref('stroop.md')).toBe(false);
  });
});

describe('parseMarkdown', () => {
  it('legge titoli con id, paragrafi uniti su più righe e regole', () => {
    const blocks = parseMarkdown('# Titolo\n\nprima riga\nseconda riga\n\n---\n\n## Sezione');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'rule', 'heading']);
    expect(blocks[3]).toMatchObject({ kind: 'heading', level: 2, id: 'sezione' });
  });

  it('legge liste puntate e numerate con righe di continuazione', () => {
    const blocks = parseMarkdown('- uno\n  continua\n- due\n\n1. a\n2. b');
    expect(blocks[0]).toMatchObject({ kind: 'list', ordered: false });
    expect((blocks[0] as { items: unknown[] }).items).toHaveLength(2);
    expect(blocks[1]).toMatchObject({ kind: 'list', ordered: true });
  });

  it('legge citazioni a più paragrafi', () => {
    const blocks = parseMarkdown('> primo\n> ancora\n>\n> secondo');
    expect(blocks[0]).toMatchObject({ kind: 'quote' });
    expect((blocks[0] as { paragraphs: unknown[] }).paragraphs).toHaveLength(2);
  });

  it('legge tabelle con intestazione e righe', () => {
    const blocks = parseMarkdown('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
    expect(blocks[0]).toMatchObject({ kind: 'table' });
    expect((blocks[0] as { rows: unknown[] }).rows).toHaveLength(2);
  });

  it('legge blocchi di codice, formule su più righe e ignora i commenti HTML', () => {
    const blocks = parseMarkdown('```\na = 1\n```\n\n$$\nx = \\frac{1}{2}\n$$\n\n<!-- nota\ninterna -->\n\nfine');
    expect(blocks.map((b) => b.kind)).toEqual(['code', 'math', 'paragraph']);
    expect(blocks[1]).toMatchObject({ kind: 'math', value: 'x = \\frac{1}{2}' });
  });

  it('legge una formula display su una riga', () => {
    expect(parseMarkdown('$$a+b$$')[0]).toMatchObject({ kind: 'math', value: 'a+b' });
  });
});

describe('collectLinks', () => {
  it('raccoglie i link di paragrafi, liste, citazioni e tabelle', () => {
    const links = collectLinks(parseMarkdown('> https://doi.org/a\n\n- [x](https://doi.org/b)\n\n| h |\n|---|\n| https://doi.org/c |'));
    expect(links).toEqual(['https://doi.org/a', 'https://doi.org/b', 'https://doi.org/c']);
  });
});
