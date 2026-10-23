# Motori TypeScript — oracolo della migrazione a Rust

Questa cartella contiene i motori dei test in TypeScript, che restano **nel repository, visibili e invariati**, come
**oracolo sorgente** della migrazione verso l'unico motore in Rust (`desktop/crates/{core,engines}`).

- **Ruolo.** Sono il riferimento con cui si verifica il Rust: le fixture golden in [`desktop/fixtures/`](../../desktop/fixtures/)
  sono generate eseguendo questi file (`node desktop/tools/golden/generate.mjs`) e il Rust deve riprodurle: sequenze, conteggi
  ed ordini esattamente uguali, metriche in virgola mobile entro 1e-9.
- **Non si modificano per la migrazione.** Se il confronto fa emergere un difetto di questi motori, il difetto è documentato in
  [`desktop/fixtures/DIVERGENZE.md`](../../desktop/fixtures/DIVERGENZE.md) e la correzione si valuta separatamente: il Rust non
  copia i bug.
- **Si ritireranno** solo quando il motore Rust, compilato in WebAssembly, sarà usato anche dalla web app.
- **Evidenze.** La dimostrazione sperimentale della migrazione è nel paper
  [«Migrazione dei motori da TypeScript a Rust»](../../docs/scientific/migrazione-rust.md), con i dati misurati in
  `desktop/fixtures/evidence/`.

Struttura: `tests/` un modulo per test (con i `*.test.ts`), `sdt.ts`, `rng.ts`, `validation.ts`, `regression.ts`, `export*.ts`,
`session/`. Vedi anche [`docs/architettura.md`](../../docs/architettura.md).
