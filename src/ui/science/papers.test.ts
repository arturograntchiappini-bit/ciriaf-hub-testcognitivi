import { describe, it, expect } from 'vitest';
import { TEST_CATALOG } from '../router';
import { PAPERS, availableSlugs, loadPaper, paperForTest } from './papers';
import { collectLinks, parseMarkdown } from './markdown';

describe('registro dei paper', () => {
  it('ogni test del catalogo ha un paper scientifico', () => {
    const missing = TEST_CATALOG.filter((t) => !paperForTest(t.id)).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it('ogni paper registrato ha il suo file e ogni file è registrato', () => {
    const registered = PAPERS.map((p) => p.slug).sort();
    expect(availableSlugs().sort()).toEqual(registered);
  });

  it('rifiuta uno slug sconosciuto', async () => {
    await expect(loadPaper('inesistente')).rejects.toThrow(/non trovato/);
  });
});

describe('contenuto dei paper', () => {
  it.each(PAPERS.map((p) => p.slug))('%s: ha un titolo; i link sono https o rimandi a un altro paper', async (slug) => {
    const blocks = parseMarkdown(await loadPaper(slug));
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    const known = PAPERS.map((p) => p.slug);
    for (const href of collectLinks(blocks)) {
      const internal = /^([a-z0-9-]+)\.md$/.exec(href)?.[1];
      if (internal) expect(known).toContain(internal);
      else expect(href).toMatch(/^https:\/\//);
    }
  });

  it.each(PAPERS.map((p) => p.slug))('%s: nessun grassetto o formula rimasti non interpretati', async (slug) => {
    const blocks = parseMarkdown(await loadPaper(slug));
    const textual = blocks.flatMap((b) => (b.kind === 'paragraph' ? b.children : []));
    for (const node of textual) {
      if (node.kind === 'text') expect(node.value).not.toMatch(/\*\*|\$\$/);
    }
  });
});
