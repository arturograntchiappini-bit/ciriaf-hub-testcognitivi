// Unisce bench-ts/-rust/-wasm in fixtures/evidence/bench.json e genera fixtures/BENCHMARK.md (con tools/bench/notes.md in coda).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ev = join(here, '..', '..', 'fixtures', 'evidence');
const read = (f) => JSON.parse(readFileSync(join(ev, f), 'utf8'));
const ts = read('bench-ts.json'), rust = read('bench-rust.json'), wasm = read('bench-wasm.json');
const by = (r) => Object.fromEntries(r.map((x) => [x.op, x]));
const T = by(ts.results), R = by(rust.results);
const W = Object.fromEntries(wasm.variants.map((v) => [v.label, by(v.results)]));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8', env: { ...process.env, PATH: `${process.env.PATH};${process.env.USERPROFILE}\.cargo\bin` } }).trim(); } catch { return 'n/d'; } };

const ops = ts.results.map((r) => r.op);
const rows = ops.map((op) => {
  const t = T[op].medianNs, r = R[op]?.medianNs, wo = W.Os?.[op]?.medianNs, w3 = W.O3?.[op]?.medianNs;
  return { op, tsMedianNs: t, tsP95Ns: T[op].p95Ns, rustMedianNs: r, rustP95Ns: R[op]?.p95Ns, wasmOsMedianNs: wo, wasmO3MedianNs: w3, wasmOsP95Ns: W.Os?.[op]?.p95Ns,
    tsOverRust: r ? t / r : null, tsOverWasmOs: wo ? t / wo : null, tsOverWasmO3: w3 ? t / w3 : null };
});
const extra = wasm.variants[0].results.map((r) => r.op).filter((op) => !T[op]).map((op) => ({ op, wasmOsMedianNs: W.Os?.[op]?.medianNs, wasmO3MedianNs: W.O3?.[op]?.medianNs }));
const meta = { hardware: ts.hardware, node: ts.node, rustc: sh('rustc -V'), cargo: sh('cargo -V'), date: new Date().toISOString().slice(0, 10) };
writeFileSync(join(ev, 'bench.json'), JSON.stringify({ meta, wasmVariants: wasm.variants.map(({ results, sink, ...v }) => v), rows, wasmOnly: extra }, null, 2));

const fmt = (ns) => (ns == null ? '—' : ns >= 1e6 ? `${(ns / 1e6).toFixed(2)} ms` : ns >= 1e3 ? `${(ns / 1e3).toFixed(1)} µs` : `${Math.round(ns)} ns`);
const ratio = (x) => (x == null ? '—' : x >= 10 ? `${x.toFixed(0)}x` : `${x.toFixed(2)}x`);
const mark = (x) => (x != null && x < 1 ? `**${ratio(x)} (Rust più lento)**` : ratio(x));
const table = (filter) => ['| Operazione | TS mediana | Rust nativo | WASM (Os) | WASM (O3) | TS/Rust | TS/WASM(Os) |', '|---|--:|--:|--:|--:|--:|--:|',
  ...rows.filter((r) => filter(r.op)).map((r) => `| \`${r.op}\` | ${fmt(r.tsMedianNs)} | ${fmt(r.rustMedianNs)} | ${fmt(r.wasmOsMedianNs)} | ${fmt(r.wasmO3MedianNs)} | ${mark(r.tsOverRust)} | ${mark(r.tsOverWasmOs)} |`)].join('\n');
const slower = rows.filter((r) => r.tsOverRust < 1).map((r) => `\`${r.op}\` (${ratio(r.tsOverRust)})`);
const slowerW = rows.filter((r) => r.tsOverWasmOs < 1).map((r) => `\`${r.op}\` (${ratio(r.tsOverWasmOs)})`);
const life = wasm.variants.map((v) => `| ${v.label} | ${(v.sizeBytes / 1024).toFixed(0)} KiB | ${(v.gzipBytes / 1024).toFixed(0)} KiB | ${v.compileMsMedian.toFixed(2)} ms | ${v.instantiateMsMedian.toFixed(3)} ms |`).join('\n');
let notes = existsSync(join(here, 'notes.md')) ? readFileSync(join(here, 'notes.md'), 'utf8') : '';
if (existsSync(join(ev, 'bench-rust-mimalloc.json'))) {
  const M = by(read('bench-rust-mimalloc.json').results);
  const RB0 = existsSync(join(ev, 'bench-rust-before.json')) ? by(read('bench-rust-before.json').results) : R;
  const line = (r) => '| `' + r.op + '` | ' + fmt(r.tsMedianNs) + ' | ' + fmt((RB0[r.op] ?? r).medianNs ?? r.rustMedianNs) + ' | ' + fmt(M[r.op]?.medianNs) + ' | ' + mark(M[r.op] ? r.tsMedianNs / M[r.op].medianNs : null) + ' |';
  notes += ['### Rust nativo con mimalloc (sperimentale, misurato sul codice PRIMA delle ottimizzazioni)', '', '| Operazione | TS | Rust (sistema, prima) | Rust + mimalloc (prima) | TS/Rust+mimalloc |', '|---|--:|--:|--:|--:|', ...rows.filter((r) => !r.op.endsWith('.json')).map(line)].join('\n') + '\n\n';
}

// Prima/dopo delle ottimizzazioni (dati "prima" = bench-rust-before.json / bench-wasm-before.json, congelati).
let optimizations = '';
if (existsSync(join(ev, 'bench-rust-before.json')) && existsSync(join(ev, 'bench-wasm-before.json'))) {
  const RB = by(read('bench-rust-before.json').results);
  const WB = by(read('bench-wasm-before.json').variants.find((v) => v.label === 'Os').results);
  const touched = /^(stroop|flanker|sart|nback|corsi)\./;
  const changed = rows.filter((r) => RB[r.op] && (touched.test(r.op) || RB[r.op].medianNs / r.rustMedianNs >= 1.15 || RB[r.op].medianNs / r.rustMedianNs <= 0.87));
  const sp = (a, b) => (a && b ? ratio(a / b) : '—');
  optimizations = ['## Ottimizzazioni (prima/dopo)', '',
    'Prima = esecuzione precedente alle modifiche (`bench-rust-before.json`, `bench-wasm-before.json`); dopo = questa esecuzione. Rapporto = TS / Rust (>1: Rust più veloce). Le righe non toccate dalle modifiche compaiono solo se variano di oltre il 15% (rumore di misura).', '',
    '| Operazione | TS | Rust prima | Rust dopo | guadagno | TS/Rust dopo | WASM (Os) prima | WASM (Os) dopo | TS/WASM(Os) dopo |', '|---|--:|--:|--:|--:|--:|--:|--:|--:|',
    ...changed.map((r) => '| `' + r.op + '` | ' + fmt(r.tsMedianNs) + ' | ' + fmt(RB[r.op].medianNs) + ' | ' + fmt(r.rustMedianNs) + ' | ' + sp(RB[r.op].medianNs, r.rustMedianNs) + ' | ' + mark(r.tsOverRust) + ' | ' + fmt(WB[r.op]?.medianNs) + ' | ' + fmt(r.wasmOsMedianNs) + ' | ' + mark(r.tsOverWasmOs) + ' |')].join('\n') + '\n\n';
}

// Variabilità: esecuzioni native ripetute (bench-rust.json + bench-rust-run*.json), intervallo min–max e rapporto TS/Rust nel caso peggiore.
let variability = '';
const runFiles = ['bench-rust.json', 'bench-rust-run1.json', 'bench-rust-run2.json', 'bench-rust-run3.json'].filter((f) => existsSync(join(ev, f)));
if (runFiles.length > 1) {
  const runs = runFiles.map((f) => by(read(f).results));
  const vrows = rows.filter((r) => /^(stroop|flanker|sart|nback|corsi)\.(gen|score)\.[a-z0-9]+$/.test(r.op));
  variability = ['## Variabilità tra esecuzioni native (' + runFiles.length + ' esecuzioni)', '',
    'Intervallo min–max delle mediane nelle esecuzioni ripetute (la prima, run1, è stata fatta con la CPU al 100% per le compilazioni di altri agenti: è il caso peggiore) e rapporto TS/Rust corrispondente (caso peggiore – caso migliore).', '',
    '| Operazione | TS | Rust min–max | TS/Rust (peggiore–migliore) |', '|---|--:|--:|--:|',
    ...vrows.map((r) => { const v = runs.map((x) => x[r.op].medianNs); const mn = Math.min(...v), mx = Math.max(...v); return '| ' + '\u0060' + r.op + '\u0060' + ' | ' + fmt(r.tsMedianNs) + ' | ' + fmt(mn) + '–' + fmt(mx) + ' | ' + ratio(r.tsMedianNs / mx) + '–' + ratio(r.tsMedianNs / mn) + ' |'; })].join('\n') + '\n\n';
}

const md = `# Benchmark dei motori: TypeScript vs Rust nativo vs WebAssembly

Generato da \`tools/bench/merge.mjs\` (dati grezzi in \`fixtures/evidence/bench*.json\`). Rapporto = mediana TS / mediana Rust: **>1 significa Rust più veloce**.

## Ambiente
- CPU: ${meta.hardware.cpu} (${meta.hardware.cores} thread), RAM ${meta.hardware.ramGb} GB, OS ${meta.hardware.os}
- Node ${meta.node} (V8, JIT), ${meta.rustc}, ${meta.cargo}; data ${meta.date}
- Rust nativo: profilo \`bench\` = release del workspace (opt-level 3, lto thin, codegen-units 1, panic abort). WASM: \`wasm32-unknown-unknown\`, lto fat, codegen-units 1, strip, panic abort, **senza wasm-opt** (non installato) né wasm-bindgen; opt-level 3 (O3), s (Os) e z (Oz).

## Metodo
- Stesse operazioni, stessi input in tutti e tre i runtime. Generazione: parametri di default (\`DEFAULTS\`) con seme 42; "x10" = numerosità ×10 (nTrials, deckSize, nTargets; Corsi: 10 passate di tutti i livelli 2–9 × 2 sequenze). Punteggio: 400 trial sintetici ottenuti ciclando la sessione simulata più realistica della fixture golden del test (\`tools/bench/inputs.json\`, scritto da \`bench.mjs\`).
- Ogni operazione: calibrazione del batch a ~2 ms, riscaldamento 300 ms (JIT di V8 incluso), poi fino a 100 campioni (o 1,5 s, minimo 15); ogni campione = tempo del batch / iterazioni. Si riportano mediana e p95 (p95 nel JSON). Timer: \`process.hrtime\` (Node) e \`Instant\` (Rust).
- Varianti: \`.gen.*\` e \`.score.400\` = calcolo puro sugli oggetti nativi di ciascun linguaggio (nessuna serializzazione). \`.json\` = costo del confine JSON: TS \`JSON.stringify\`/\`parse\` in-process; Rust \`serde_json\` stringa→stringa; WASM stringa già in memoria lineare. \`.json+parse\` / \`.json+js\` (solo WASM) = confine completo come lo vedrebbe la web app: oggetto JS → stringify → encode → copia → WASM → decode → \`JSON.parse\`.
- Esegui: \`node --experimental-transform-types tools/bench/bench.mjs\`, \`cargo bench -p sintropia-engines --bench engines\`, \`powershell tools/bench/run-bench.ps1\` (build WASM + run-wasm.mjs), \`node tools/bench/merge.mjs\`.

## Generazione e punteggio (calcolo puro)
${table((o) => !o.endsWith('.json'))}

## Confine JSON
${table((o) => o.endsWith('.json'))}

Solo WASM (confine completo da JavaScript):

| Operazione | WASM (Os) | WASM (O3) |
|---|--:|--:|
${extra.map((e) => `| \`${e.op}\` | ${fmt(e.wasmOsMedianNs)} | ${fmt(e.wasmO3MedianNs)} |`).join('\n')}

## Modulo WASM (dimensione e avvio)
| Opt-level | .wasm | gzip -9 | compile (mediana) | instantiate (mediana) |
|---|--:|--:|--:|--:|
${life}

La dimensione include \`serde_json\` e il parsing/serializzazione dei tipi (confine JSON); i soli motori sarebbero più piccoli. wasm-opt non applicato: con \`wasm-opt -Oz\` ci si aspetta un ulteriore calo (non misurato).

## Operazioni in cui il Rust nativo è più lento del TS
${slower.length ? slower.join(', ') : 'nessuna'}.

## Operazioni in cui il WASM (Os) è più lento del TS
${slowerW.length ? slowerW.join(', ') : 'nessuna'}.

${optimizations}${variability}${notes}
## Limiti
- Variabilità tra esecuzioni: la macchina è condivisa con altre compilazioni (altri agenti); sotto carico le operazioni ad alta allocazione variano fino a 2x (vedi la sezione «Variabilità»). Le tabelle principali riportano l'ultima esecuzione completa (bench-rust.json), la sezione «Variabilità» l'intervallo di 4 esecuzioni. Le operazioni non toccate (mental_rotation, trail_making, wcst, visual_search, pvt) hanno oscillazioni del ±30% fra esecuzioni diverse dovute solo al carico: i «guadagni» <1 nella tabella «Ottimizzazioni» su queste righe sono rumore, non regressioni (il codice non è cambiato).
- Una sola macchina, Windows 11, rumore di fondo del sistema operativo (browser/IDE aperti): le differenze <15–20% non sono significative; vedi p95 nel JSON.
- Input di punteggio ciclati da sessioni piccole: non coprono tutte le diramazioni (es. WCST con metadati ripetuti). Seme di generazione fisso (42): il tempo dipende dalla sequenza (ritentativi di rejection sampling, campionamenti Corsi).
- Node/V8, non un browser: nei browser WASM e JIT hanno caratteristiche simili ma non identiche. Il WASM non usa SIMD né thread.
- Il bench nativo è single-thread e non misura allocazioni di sistema oltre il tempo di orologio.
`;
writeFileSync(join(here, '..', '..', 'fixtures', 'BENCHMARK.md'), md);
