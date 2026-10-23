/**
 * Rigenera le copie standalone in `revisione-motore/` a partire dai motori vivi.
 *
 * Per ogni test la copia è: intestazione e demo (scritte a mano, conservate dal file
 * esistente) + dipendenze inline (tipi, RNG, statistiche, SDT estratte dai moduli
 * veri) + core identico al motore in `src/engine/tests/`.
 *
 *   node scripts/sync-revisione-motore.mjs          riscrive le copie
 *   node scripts/sync-revisione-motore.mjs --check  esce con codice 1 se divergono
 *
 * Il test `src/engine/revisione-motore.test.ts` usa `buildCopy` per impedire la divergenza.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINES = ['stroop', 'gonogo', 'corsi', 'nback', 'wcst', 'pvt', 'flanker', 'sart'];

const DEPS_MARKER = '/* ===== Dipendenze inline';
const CORE_MARKER = '/* ============================ CORE DEL TEST ============================ */';
const DEMO_MARKER = '/* ================================ DEMO ================================ */';
const IMPORT_LINE = /^(import\s|export\s*\{[^}]*\}\s*from\s)/;
const KEEP_EXPORT_FROM = new Set(['sdt.ts']);
const SOURCES = ['types.ts', 'rng.ts', 'validation.ts', 'sdt.ts'];

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const readText = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** Estrae dal sorgente ogni `export function|const|type|interface` col suo JSDoc. */
function collectSymbols(root) {
  const symbols = new Map();
  for (const file of SOURCES) {
    const lines = readText(join(root, 'src/engine', file)).split('\n');
    lines.forEach((line, start) => {
      const match = /^export (?:function|const|type|interface) (\w+)/.exec(line);
      if (!match) return;
      let from = start;
      if (lines[from - 1]?.trim() === '*/') {
        from -= 1;
        while (!lines[from].trim().startsWith('/**')) from -= 1;
      }
      let to = start;
      const oneLiner = /;\s*$/.test(line) && !/[{(]\s*$/.test(line);
      if (!oneLiner) while (lines[to] !== '}' && lines[to] !== '};') to += 1;
      const text = lines.slice(from, to + 1).join('\n');
      const keep = KEEP_EXPORT_FROM.has(file);
      symbols.set(match[1], { order: symbols.size, text: keep ? text : text.replace(/^export /m, '') });
    });
  }
  return symbols;
}

/** Simboli richiesti dal core e dalla demo, con chiusura transitiva sulle dipendenze. */
function requiredSymbols(symbols, seedText) {
  const needed = new Set();
  const queue = [stripComments(seedText)];
  while (queue.length > 0) {
    const code = queue.pop();
    for (const [name, symbol] of symbols) {
      if (needed.has(name) || !new RegExp(`\\b${name}\\b`).test(code)) continue;
      needed.add(name);
      queue.push(stripComments(symbol.text));
    }
  }
  return [...needed].sort((a, b) => symbols.get(a).order - symbols.get(b).order);
}

/** Costruisce il contenuto atteso della copia standalone di un motore. */
export function buildCopy(name, root = rootDir) {
  const live = readText(join(root, 'src/engine/tests', `${name}.ts`)).split('\n');
  const lastImport = live.map((line) => IMPORT_LINE.test(line)).lastIndexOf(true);
  const core = live.slice(lastImport + 1).join('\n').replace(/^\n+/, '').trimEnd();

  const existing = readText(join(root, 'revisione-motore', `${name}.ts`));
  const header = existing.slice(0, existing.indexOf(DEPS_MARKER)).trimEnd();
  const demo = existing.slice(existing.indexOf(DEMO_MARKER)).trimEnd();

  const symbols = collectSymbols(root);
  const prelude = requiredSymbols(symbols, `${core}\n${demo}`)
    .map((symbol) => symbols.get(symbol).text)
    .join('\n\n');

  return [
    header,
    `${DEPS_MARKER} (nella piattaforma: engine/{types,rng,validation,sdt}) ===== */\n/* Generate da scripts/sync-revisione-motore.mjs: non modificarle a mano. */`,
    prelude,
    CORE_MARKER,
    core,
    demo,
  ].join('\n\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let diverged = 0;
  for (const name of ENGINES) {
    const path = join(rootDir, 'revisione-motore', `${name}.ts`);
    const expected = buildCopy(name);
    if (readText(path) === expected) continue;
    diverged += 1;
    if (check) console.error(`DIVERGE: revisione-motore/${name}.ts`);
    else writeFileSync(path, expected);
  }
  if (check && diverged > 0) process.exit(1);
  console.log(check ? 'Copie allineate.' : `Copie rigenerate (${diverged} modificate).`);
}
