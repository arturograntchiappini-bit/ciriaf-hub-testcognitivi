/**
 * Parser markdown minimale e puro per i paper scientifici (docs/scientific/*.md).
 * Produce un albero di dati, senza HTML: il rendering è in MarkdownView e passa solo da elementi React.
 * Copre solo ciò che i paper usano: titoli, paragrafi, liste, citazioni, tabelle, codice, formule, link.
 */

export type Inline =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] }
  | { kind: 'code'; value: string }
  | { kind: 'math'; value: string }
  | { kind: 'link'; href: string; children: Inline[] };

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; id: string; children: Inline[]; text: string }
  | { kind: 'paragraph'; children: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'quote'; paragraphs: Inline[][] }
  | { kind: 'table'; header: Inline[][]; rows: Inline[][][] }
  | { kind: 'code'; value: string }
  | { kind: 'math'; value: string }
  | { kind: 'rule' };

const HEADING = /^(#{1,4})\s+(.*)$/;
const LIST_ITEM = /^\s*([-*]|\d+\.)\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\$[^$\n]+\$|\[[^\]]+\]\([^)\s]+\)|<https?:\/\/[^>\s]+>|https?:\/\/[^\s<>)\]]+)/;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** Identificatore stabile per le ancore dei titoli (minuscolo, senza accenti né punteggiatura). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Solo http(s) è ammesso come destinazione: nessun javascript:, data: o link relativi arbitrari. */
export function isSafeHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function splitTrailingPunctuation(url: string): [string, string] {
  const trailing = TRAILING_PUNCTUATION.exec(url)?.[0] ?? '';
  return [url.slice(0, url.length - trailing.length), trailing];
}

function linkNode(href: string, label: string): Inline {
  return { kind: 'link', href, children: [{ kind: 'text', value: label }] };
}

function parseToken(token: string): Inline[] {
  if (token.startsWith('**')) return [{ kind: 'strong', children: parseInline(token.slice(2, -2)) }];
  if (token.startsWith('`')) return [{ kind: 'code', value: token.slice(1, -1) }];
  if (token.startsWith('$')) return [{ kind: 'math', value: token.slice(1, -1).trim() }];
  if (token.startsWith('*')) return [{ kind: 'em', children: parseInline(token.slice(1, -1)) }];
  if (token.startsWith('<')) {
    const url = token.slice(1, -1);
    return [linkNode(url, url)];
  }
  if (token.startsWith('[')) {
    const close = token.indexOf('](');
    const label = token.slice(1, close);
    const href = token.slice(close + 2, -1);
    return [{ kind: 'link', href, children: parseInline(label) }];
  }
  const [url, trailing] = splitTrailingPunctuation(token);
  const nodes: Inline[] = [linkNode(url, url)];
  if (trailing) nodes.push({ kind: 'text', value: trailing });
  return nodes;
}

/** Analizza il markdown "in linea" (grassetto, corsivo, codice, formule, link) di una riga di testo. */
export function parseInline(source: string): Inline[] {
  const nodes: Inline[] = [];
  let rest = source;
  while (rest.length > 0) {
    const match = INLINE_TOKEN.exec(rest);
    if (!match) {
      nodes.push({ kind: 'text', value: rest });
      break;
    }
    if (match.index > 0) nodes.push({ kind: 'text', value: rest.slice(0, match.index) });
    nodes.push(...parseToken(match[0]));
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}

function plainText(inlines: Inline[]): string {
  return inlines
    .map((node) => {
      switch (node.kind) {
        case 'text':
        case 'code':
        case 'math':
          return node.value;
        case 'strong':
        case 'em':
        case 'link':
          return plainText(node.children);
      }
    })
    .join('');
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function startsBlock(line: string, next: string | undefined): boolean {
  return (
    HEADING.test(line) ||
    LIST_ITEM.test(line) ||
    /^>/.test(line) ||
    /^```/.test(line) ||
    /^\$\$/.test(line) ||
    /^<!--/.test(line) ||
    /^-{3,}\s*$/.test(line) ||
    (line.includes('|') && next !== undefined && TABLE_DIVIDER.test(next))
  );
}

interface Cursor {
  lines: string[];
  index: number;
}

function readUntil(cursor: Cursor, isEnd: (line: string) => boolean): string[] {
  const collected: string[] = [];
  while (cursor.index < cursor.lines.length) {
    const line = cursor.lines[cursor.index] as string;
    cursor.index += 1;
    if (isEnd(line)) break;
    collected.push(line);
  }
  return collected;
}

function readFence(cursor: Cursor): Block {
  cursor.index += 1;
  return { kind: 'code', value: readUntil(cursor, (line) => /^```/.test(line)).join('\n') };
}

function readDisplayMath(cursor: Cursor): Block {
  const parts: string[] = [];
  while (cursor.index < cursor.lines.length) {
    const line = (cursor.lines[cursor.index] as string).trim();
    cursor.index += 1;
    parts.push(line);
    const closes = parts.length === 1 ? line.length > 2 && line.endsWith('$$') : line.endsWith('$$');
    if (closes) break;
  }
  return { kind: 'math', value: parts.join('\n').replace(/^\$\$/, '').replace(/\$\$$/, '').trim() };
}

function readComment(cursor: Cursor): void {
  let line = cursor.lines[cursor.index] as string;
  while (!line.includes('-->') && cursor.index < cursor.lines.length - 1) {
    cursor.index += 1;
    line = cursor.lines[cursor.index] as string;
  }
  cursor.index += 1;
}

function readQuote(cursor: Cursor): Block {
  const paragraphs: string[][] = [[]];
  while (cursor.index < cursor.lines.length && /^>/.test(cursor.lines[cursor.index] as string)) {
    const content = (cursor.lines[cursor.index] as string).replace(/^>\s?/, '');
    if (content.trim() === '') paragraphs.push([]);
    else (paragraphs[paragraphs.length - 1] as string[]).push(content.trim());
    cursor.index += 1;
  }
  return {
    kind: 'quote',
    paragraphs: paragraphs.filter((p) => p.length > 0).map((p) => parseInline(p.join(' '))),
  };
}

function readList(cursor: Cursor): Block {
  const ordered = /^\s*\d+\./.test(cursor.lines[cursor.index] as string);
  const items: string[] = [];
  while (cursor.index < cursor.lines.length) {
    const line = cursor.lines[cursor.index] as string;
    const item = LIST_ITEM.exec(line);
    if (item) items.push((item[2] as string).trim());
    else if (/^\s+\S/.test(line) && items.length > 0) items[items.length - 1] += ` ${line.trim()}`;
    else break;
    cursor.index += 1;
  }
  return { kind: 'list', ordered, items: items.map(parseInline) };
}

function readTable(cursor: Cursor): Block {
  const header = splitRow(cursor.lines[cursor.index] as string).map(parseInline);
  cursor.index += 2;
  const rows: Inline[][][] = [];
  while (cursor.index < cursor.lines.length && (cursor.lines[cursor.index] as string).includes('|')) {
    rows.push(splitRow(cursor.lines[cursor.index] as string).map(parseInline));
    cursor.index += 1;
  }
  return { kind: 'table', header, rows };
}

function readParagraph(cursor: Cursor): Block {
  const parts: string[] = [];
  while (cursor.index < cursor.lines.length) {
    const line = cursor.lines[cursor.index] as string;
    if (line.trim() === '' || (parts.length > 0 && startsBlock(line, cursor.lines[cursor.index + 1]))) break;
    parts.push(line.trim());
    cursor.index += 1;
  }
  return { kind: 'paragraph', children: parseInline(parts.join(' ')) };
}

function readHeading(cursor: Cursor): Block {
  const match = HEADING.exec(cursor.lines[cursor.index] as string) as RegExpExecArray;
  cursor.index += 1;
  const children = parseInline((match[2] as string).trim());
  const text = plainText(children);
  return { kind: 'heading', level: (match[1] as string).length as 1 | 2 | 3 | 4, id: slugify(text), children, text };
}

/** Converte un documento markdown nell'albero di blocchi usato da MarkdownView. */
export function parseMarkdown(source: string): Block[] {
  const cursor: Cursor = { lines: source.replace(/\r\n?/g, '\n').split('\n'), index: 0 };
  const blocks: Block[] = [];
  while (cursor.index < cursor.lines.length) {
    const line = cursor.lines[cursor.index] as string;
    const next = cursor.lines[cursor.index + 1];
    if (line.trim() === '') cursor.index += 1;
    else if (/^<!--/.test(line)) readComment(cursor);
    else if (/^```/.test(line)) blocks.push(readFence(cursor));
    else if (/^\$\$/.test(line.trim())) blocks.push(readDisplayMath(cursor));
    else if (HEADING.test(line)) blocks.push(readHeading(cursor));
    else if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      cursor.index += 1;
    } else if (/^>/.test(line)) blocks.push(readQuote(cursor));
    else if (LIST_ITEM.test(line)) blocks.push(readList(cursor));
    else if (line.includes('|') && next !== undefined && TABLE_DIVIDER.test(next)) blocks.push(readTable(cursor));
    else blocks.push(readParagraph(cursor));
  }
  return blocks;
}

/** Link diretti ai DOI/URL presenti in un documento, utili per i controlli sulle fonti. */
export function collectLinks(blocks: Block[]): string[] {
  const urls: string[] = [];
  const visit = (inlines: Inline[]): void => {
    for (const node of inlines) {
      if (node.kind === 'link') {
        urls.push(node.href);
        visit(node.children);
      } else if (node.kind === 'strong' || node.kind === 'em') visit(node.children);
    }
  };
  for (const block of blocks) {
    if (block.kind === 'paragraph' || block.kind === 'heading') visit(block.children);
    else if (block.kind === 'list') block.items.forEach(visit);
    else if (block.kind === 'quote') block.paragraphs.forEach(visit);
    else if (block.kind === 'table') [block.header, ...block.rows].flat().forEach(visit);
  }
  return urls;
}
