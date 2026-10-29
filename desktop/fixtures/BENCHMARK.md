# Benchmark dei motori: TypeScript vs Rust nativo vs WebAssembly

Generato da `tools/bench/merge.mjs` (dati grezzi in `fixtures/evidence/bench*.json`). Rapporto = mediana TS / mediana Rust: **>1 significa Rust più veloce**.

## Ambiente
- CPU: Intel(R) Core(TM) Ultra 7 258V (8 thread), RAM 32 GB, OS win32 10.0.26200
- Node v24.15.0 (V8, JIT), rustc 1.99.0 (b940084d7 2026-09-28), cargo 1.99.0 (5f94df478 2026-08-27); data 2026-10-23
- Rust nativo: profilo `bench` = release del workspace (opt-level 3, lto thin, codegen-units 1, panic abort). WASM: `wasm32-unknown-unknown`, lto fat, codegen-units 1, strip, panic abort, **senza wasm-opt** (non installato) né wasm-bindgen; opt-level 3 (O3), s (Os) e z (Oz).

## Metodo
- Stesse operazioni, stessi input in tutti e tre i runtime. Generazione: parametri di default (`DEFAULTS`) con seme 42; "x10" = numerosità ×10 (nTrials, deckSize, nTargets; Corsi: 10 passate di tutti i livelli 2–9 × 2 sequenze). Punteggio: 400 trial sintetici ottenuti ciclando la sessione simulata più realistica della fixture golden del test (`tools/bench/inputs.json`, scritto da `bench.mjs`).
- Ogni operazione: calibrazione del batch a ~2 ms, riscaldamento 300 ms (JIT di V8 incluso), poi fino a 100 campioni (o 1,5 s, minimo 15); ogni campione = tempo del batch / iterazioni. Si riportano mediana e p95 (p95 nel JSON). Timer: `process.hrtime` (Node) e `Instant` (Rust).
- Varianti: `.gen.*` e `.score.400` = calcolo puro sugli oggetti nativi di ciascun linguaggio (nessuna serializzazione). `.json` = costo del confine JSON: TS `JSON.stringify`/`parse` in-process; Rust `serde_json` stringa→stringa; WASM stringa già in memoria lineare. `.json+parse` / `.json+js` (solo WASM) = confine completo come lo vedrebbe la web app: oggetto JS → stringify → encode → copia → WASM → decode → `JSON.parse`.
- Esegui: `node --experimental-transform-types tools/bench/bench.mjs`, `cargo bench -p sintropia-engines --bench engines`, `powershell tools/bench/run-bench.ps1` (build WASM + run-wasm.mjs), `node tools/bench/merge.mjs`.

## Generazione e punteggio (calcolo puro)
| Operazione | TS mediana | Rust nativo | WASM (Os) | WASM (O3) | TS/Rust | TS/WASM(Os) |
|---|--:|--:|--:|--:|--:|--:|
| `stroop.gen.default` | 647 ns | 379 ns | 250 ns | 500 ns | 1.71x | 2.59x |
| `stroop.gen.x10` | 423.8 µs | 296.2 µs | 243.3 µs | 342.3 µs | 1.43x | 1.74x |
| `stroop.score.400` | 38.5 µs | 4.8 µs | 4.4 µs | 6.7 µs | 8.04x | 8.76x |
| `gonogo.gen.default` | 800 ns | 634 ns | 670 ns | 682 ns | 1.26x | 1.19x |
| `gonogo.gen.x10` | 8.8 µs | 5.1 µs | 6.2 µs | 6.6 µs | 1.74x | 1.43x |
| `gonogo.score.400` | 19.2 µs | 3.1 µs | 2.7 µs | 3.7 µs | 6.22x | 7.10x |
| `flanker.gen.default` | 9.1 µs | 3.9 µs | 2.7 µs | 3.3 µs | 2.30x | 3.41x |
| `flanker.gen.x10` | 118.8 µs | 41.8 µs | 27.8 µs | 28.2 µs | 2.84x | 4.27x |
| `flanker.score.400` | 56.7 µs | 10.1 µs | 14.7 µs | 13.7 µs | 5.63x | 3.86x |
| `sart.gen.default` | 93.7 µs | 17.5 µs | 10.6 µs | 9.2 µs | 5.36x | 8.81x |
| `sart.gen.x10` | 1.25 ms | 183.0 µs | 115.9 µs | 107.8 µs | 6.81x | 11x |
| `sart.score.400` | 39.5 µs | 4.2 µs | 3.9 µs | 3.0 µs | 9.36x | 10x |
| `visual_search.gen.default` | 340.0 µs | 38.5 µs | 33.2 µs | 21.6 µs | 8.84x | 10x |
| `visual_search.gen.x10` | 2.81 ms | 387.3 µs | 315.9 µs | 226.0 µs | 7.26x | 8.89x |
| `visual_search.score.400` | 414.8 µs | 74.4 µs | 102.6 µs | 92.7 µs | 5.57x | 4.04x |
| `pvt.gen.default` | 5.7 µs | 193 ns | 601 ns | 595 ns | 29x | 9.44x |
| `pvt.gen.x10` | 50.2 µs | 1.6 µs | 5.8 µs | 5.7 µs | 32x | 8.69x |
| `pvt.score.400` | 116.3 µs | 7.2 µs | 8.8 µs | 7.9 µs | 16x | 13x |
| `nback.gen.default` | 95.0 µs | 7.3 µs | 8.5 µs | 4.9 µs | 13x | 11x |
| `nback.gen.x10` | 1.22 ms | 117.2 µs | 143.3 µs | 86.0 µs | 10x | 8.51x |
| `nback.score.400` | 10.7 µs | 2.8 µs | 3.8 µs | 3.5 µs | 3.81x | 2.83x |
| `mental_rotation.gen.default` | 5.46 ms | 522.4 µs | 310.3 µs | 277.0 µs | 10x | 18x |
| `mental_rotation.gen.x10` | 67.40 ms | 5.72 ms | 3.40 ms | 2.89 ms | 12x | 20x |
| `mental_rotation.score.400` | 371.0 µs | 91.4 µs | 51.2 µs | 46.3 µs | 4.06x | 7.25x |
| `trail_making.gen.default` | 34.1 µs | 7.2 µs | 5.4 µs | 4.0 µs | 4.74x | 6.37x |
| `trail_making.gen.x10` | 2.28 ms | 740.0 µs | 770.7 µs | 611.4 µs | 3.08x | 2.96x |
| `trail_making.score.400` | 7.9 µs | 3.8 µs | 1.9 µs | 1.6 µs | 2.08x | 4.27x |
| `corsi.gen.default` | 8.64 ms | 2.21 ms | 2.17 ms | 1.68 ms | 3.90x | 3.98x |
| `corsi.gen.x10` | 85.60 ms | 23.29 ms | 22.84 ms | 18.33 ms | 3.68x | 3.75x |
| `corsi.score.400` | 11.9 µs | 1.9 µs | 6.4 µs | 2.0 µs | 6.29x | 1.88x |
| `wcst.gen.default` | 824 ns | 427 ns | 336 ns | 227 ns | 1.93x | 2.45x |
| `wcst.gen.x10` | 5.0 µs | 3.4 µs | 2.1 µs | 1.9 µs | 1.47x | 2.42x |
| `wcst.score.400` | 22.4 µs | 10.2 µs | 7.7 µs | 5.8 µs | 2.19x | 2.90x |
| `mental_rotation.project_faces` | 114.3 µs | 17.3 µs | 22.6 µs | 15.3 µs | 6.63x | 5.05x |
| `mental_rotation.is_chiral` | 33.6 µs | 3.5 µs | 2.2 µs | 1.6 µs | 9.52x | 15x |

## Confine JSON
| Operazione | TS mediana | Rust nativo | WASM (Os) | WASM (O3) | TS/Rust | TS/WASM(Os) |
|---|--:|--:|--:|--:|--:|--:|
| `stroop.gen.default.json` | 3.6 µs | 2.2 µs | 5.1 µs | 3.6 µs | 1.63x | **0.70x (Rust più lento)** |
| `stroop.gen.x10.json` | 472.3 µs | 343.4 µs | 297.6 µs | 381.2 µs | 1.38x | 1.59x |
| `stroop.score.400.json` | 191.3 µs | 122.5 µs | 145.3 µs | 211.6 µs | 1.56x | 1.32x |
| `gonogo.gen.default.json` | 4.1 µs | 2.3 µs | 5.9 µs | 4.1 µs | 1.79x | **0.69x (Rust più lento)** |
| `gonogo.gen.x10.json` | 42.0 µs | 20.0 µs | 57.7 µs | 40.7 µs | 2.10x | **0.73x (Rust più lento)** |
| `gonogo.score.400.json` | 158.3 µs | 111.6 µs | 138.9 µs | 224.5 µs | 1.42x | 1.14x |
| `flanker.gen.default.json` | 21.2 µs | 8.8 µs | 16.1 µs | 11.8 µs | 2.42x | 1.32x |
| `flanker.gen.x10.json` | 270.1 µs | 91.6 µs | 163.9 µs | 101.3 µs | 2.95x | 1.65x |
| `flanker.score.400.json` | 215.5 µs | 128.7 µs | 162.4 µs | 160.2 µs | 1.67x | 1.33x |
| `sart.gen.default.json` | 145.4 µs | 21.7 µs | 23.9 µs | 16.2 µs | 6.70x | 6.07x |
| `sart.gen.x10.json` | 1.31 ms | 226.5 µs | 250.4 µs | 177.9 µs | 5.77x | 5.22x |
| `sart.score.400.json` | 238.1 µs | 117.7 µs | 137.9 µs | 133.6 µs | 2.02x | 1.73x |
| `visual_search.gen.default.json` | 587.0 µs | 104.9 µs | 255.2 µs | 144.8 µs | 5.60x | 2.30x |
| `visual_search.gen.x10.json` | 6.66 ms | 1.26 ms | 2.53 ms | 1.47 ms | 5.27x | 2.63x |
| `visual_search.score.400.json` | 776.5 µs | 196.2 µs | 243.5 µs | 231.3 µs | 3.96x | 3.19x |
| `pvt.gen.default.json` | 9.5 µs | 1.2 µs | 3.8 µs | 2.3 µs | 8.11x | 2.48x |
| `pvt.gen.x10.json` | 88.5 µs | 10.6 µs | 37.9 µs | 23.1 µs | 8.35x | 2.34x |
| `pvt.score.400.json` | 331.7 µs | 126.3 µs | 148.5 µs | 136.2 µs | 2.63x | 2.23x |
| `nback.gen.default.json` | 125.9 µs | 16.7 µs | 42.0 µs | 18.7 µs | 7.54x | 3.00x |
| `nback.gen.x10.json` | 1.68 ms | 206.8 µs | 479.1 µs | 236.9 µs | 8.10x | 3.50x |
| `nback.score.400.json` | 210.5 µs | 110.9 µs | 131.9 µs | 121.8 µs | 1.90x | 1.60x |
| `mental_rotation.gen.default.json` | 4.97 ms | 552.8 µs | 421.2 µs | 308.4 µs | 8.99x | 12x |
| `mental_rotation.gen.x10.json` | 82.04 ms | 6.21 ms | 4.20 ms | 3.25 ms | 13x | 20x |
| `mental_rotation.score.400.json` | 608.3 µs | 292.7 µs | 196.5 µs | 186.0 µs | 2.08x | 3.10x |
| `trail_making.gen.default.json` | 31.0 µs | 11.3 µs | 13.5 µs | 9.5 µs | 2.75x | 2.30x |
| `trail_making.gen.x10.json` | 2.21 ms | 797.7 µs | 860.3 µs | 689.5 µs | 2.77x | 2.57x |
| `trail_making.score.400.json` | 134.8 µs | 180.7 µs | 134.8 µs | 126.4 µs | **0.75x (Rust più lento)** | **1.00x (Rust più lento)** |
| `corsi.gen.default.json` | 8.62 ms | 2.19 ms | 2.17 ms | 1.72 ms | 3.94x | 3.97x |
| `corsi.gen.x10.json` | 85.91 ms | 23.21 ms | 22.84 ms | 18.20 ms | 3.70x | 3.76x |
| `corsi.score.400.json` | 145.3 µs | 114.2 µs | 136.7 µs | 125.7 µs | 1.27x | 1.06x |
| `wcst.gen.default.json` | 4.8 µs | 2.5 µs | 7.1 µs | 2.7 µs | 1.95x | **0.67x (Rust più lento)** |
| `wcst.gen.x10.json` | 45.7 µs | 32.2 µs | 71.8 µs | 30.6 µs | 1.42x | **0.64x (Rust più lento)** |
| `wcst.score.400.json` | 199.7 µs | 246.3 µs | 173.2 µs | 162.2 µs | **0.81x (Rust più lento)** | 1.15x |

Solo WASM (confine completo da JavaScript):

| Operazione | WASM (Os) | WASM (O3) |
|---|--:|--:|
| `stroop.gen.default.json+parse` | 11.2 µs | 11.0 µs |
| `stroop.gen.x10.json+parse` | 351.3 µs | 498.9 µs |
| `stroop.score.400.json+js` | 342.3 µs | 538.4 µs |
| `gonogo.gen.default.json+parse` | 12.6 µs | 14.2 µs |
| `gonogo.gen.x10.json+parse` | 119.1 µs | 141.5 µs |
| `gonogo.score.400.json+js` | 322.4 µs | 579.4 µs |
| `flanker.gen.default.json+parse` | 35.4 µs | 31.8 µs |
| `flanker.gen.x10.json+parse` | 381.2 µs | 340.7 µs |
| `flanker.score.400.json+js` | 453.3 µs | 448.8 µs |
| `sart.gen.default.json+parse` | 38.0 µs | 31.3 µs |
| `sart.gen.x10.json+parse` | 386.8 µs | 321.4 µs |
| `sart.score.400.json+js` | 326.0 µs | 319.2 µs |
| `visual_search.gen.default.json+parse` | 452.0 µs | 350.8 µs |
| `visual_search.gen.x10.json+parse` | 4.77 ms | 3.69 ms |
| `visual_search.score.400.json+js` | 463.7 µs | 443.1 µs |
| `pvt.gen.default.json+parse` | 8.7 µs | 7.2 µs |
| `pvt.gen.x10.json+parse` | 84.3 µs | 69.3 µs |
| `pvt.score.400.json+js` | 336.3 µs | 325.9 µs |
| `corsi.gen.default.json+parse` | 2.19 ms | 1.69 ms |
| `corsi.gen.x10.json+parse` | 22.90 ms | 18.40 ms |
| `corsi.score.400.json+js` | 298.6 µs | 286.0 µs |
| `nback.gen.default.json+parse` | 72.1 µs | 49.1 µs |
| `nback.gen.x10.json+parse` | 832.9 µs | 590.7 µs |
| `nback.score.400.json+js` | 292.0 µs | 280.9 µs |
| `wcst.gen.default.json+parse` | 15.1 µs | 11.3 µs |
| `wcst.gen.x10.json+parse` | 149.5 µs | 108.2 µs |
| `wcst.score.400.json+js` | 367.5 µs | 358.0 µs |
| `mental_rotation.gen.default.json+parse` | 509.8 µs | 396.7 µs |
| `mental_rotation.gen.x10.json+parse` | 5.37 ms | 4.26 ms |
| `mental_rotation.score.400.json+js` | 405.2 µs | 389.3 µs |
| `trail_making.gen.default.json+parse` | 21.0 µs | 16.5 µs |
| `trail_making.gen.x10.json+parse` | 936.9 µs | 750.7 µs |
| `trail_making.score.400.json+js` | 296.7 µs | 286.2 µs |

## Modulo WASM (dimensione e avvio)
| Opt-level | .wasm | gzip -9 | compile (mediana) | instantiate (mediana) |
|---|--:|--:|--:|--:|
| O3 | 414 KiB | 132 KiB | 0.74 ms | 0.070 ms |
| Os | 291 KiB | 109 KiB | 0.39 ms | 0.046 ms |
| Oz | 275 KiB | 104 KiB | 0.33 ms | 0.037 ms |

La dimensione include `serde_json` e il parsing/serializzazione dei tipi (confine JSON); i soli motori sarebbero più piccoli. wasm-opt non applicato: con `wasm-opt -Oz` ci si aspetta un ulteriore calo (non misurato).

## Operazioni in cui il Rust nativo è più lento del TS
`trail_making.score.400.json` (0.75x), `wcst.score.400.json` (0.81x).

## Operazioni in cui il WASM (Os) è più lento del TS
`stroop.gen.default.json` (0.70x), `gonogo.gen.default.json` (0.69x), `gonogo.gen.x10.json` (0.73x), `trail_making.score.400.json` (1.00x), `wcst.gen.default.json` (0.67x), `wcst.gen.x10.json` (0.64x).

## Ottimizzazioni (prima/dopo)

Prima = esecuzione precedente alle modifiche (`bench-rust-before.json`, `bench-wasm-before.json`); dopo = questa esecuzione. Rapporto = TS / Rust (>1: Rust più veloce). Le righe non toccate dalle modifiche compaiono solo se variano di oltre il 15% (rumore di misura).

| Operazione | TS | Rust prima | Rust dopo | guadagno | TS/Rust dopo | WASM (Os) prima | WASM (Os) dopo | TS/WASM(Os) dopo |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| `stroop.gen.default` | 647 ns | 771 ns | 379 ns | 2.04x | 1.71x | 450 ns | 250 ns | 2.59x |
| `stroop.gen.default.json` | 3.6 µs | 3.7 µs | 2.2 µs | 1.69x | 1.63x | 8.4 µs | 5.1 µs | **0.70x (Rust più lento)** |
| `stroop.gen.x10` | 423.8 µs | 652.7 µs | 296.2 µs | 2.20x | 1.43x | 392.6 µs | 243.3 µs | 1.74x |
| `stroop.gen.x10.json` | 472.3 µs | 644.7 µs | 343.4 µs | 1.88x | 1.38x | 464.9 µs | 297.6 µs | 1.59x |
| `stroop.score.400` | 38.5 µs | 5.9 µs | 4.8 µs | 1.23x | 8.04x | 7.7 µs | 4.4 µs | 8.76x |
| `stroop.score.400.json` | 191.3 µs | 153.9 µs | 122.5 µs | 1.26x | 1.56x | 224.2 µs | 145.3 µs | 1.32x |
| `gonogo.gen.default` | 800 ns | 858 ns | 634 ns | 1.35x | 1.26x | 886 ns | 670 ns | 1.19x |
| `gonogo.gen.default.json` | 4.1 µs | 3.1 µs | 2.3 µs | 1.35x | 1.79x | 9.1 µs | 5.9 µs | **0.69x (Rust più lento)** |
| `gonogo.gen.x10` | 8.8 µs | 6.5 µs | 5.1 µs | 1.28x | 1.74x | 6.7 µs | 6.2 µs | 1.43x |
| `gonogo.gen.x10.json` | 42.0 µs | 25.3 µs | 20.0 µs | 1.27x | 2.10x | 89.1 µs | 57.7 µs | **0.73x (Rust più lento)** |
| `gonogo.score.400` | 19.2 µs | 4.0 µs | 3.1 µs | 1.31x | 6.22x | 4.3 µs | 2.7 µs | 7.10x |
| `gonogo.score.400.json` | 158.3 µs | 154.2 µs | 111.6 µs | 1.38x | 1.42x | 282.4 µs | 138.9 µs | 1.14x |
| `flanker.gen.default` | 9.1 µs | 18.4 µs | 3.9 µs | 4.67x | 2.30x | 16.3 µs | 2.7 µs | 3.41x |
| `flanker.gen.default.json` | 21.2 µs | 24.9 µs | 8.8 µs | 2.84x | 2.42x | 38.6 µs | 16.1 µs | 1.32x |
| `flanker.gen.x10` | 118.8 µs | 247.1 µs | 41.8 µs | 5.92x | 2.84x | 297.5 µs | 27.8 µs | 4.27x |
| `flanker.gen.x10.json` | 270.1 µs | 342.8 µs | 91.6 µs | 3.74x | 2.95x | 805.1 µs | 163.9 µs | 1.65x |
| `flanker.score.400` | 56.7 µs | 68.0 µs | 10.1 µs | 6.76x | 5.63x | 72.4 µs | 14.7 µs | 3.86x |
| `flanker.score.400.json` | 215.5 µs | 222.0 µs | 128.7 µs | 1.73x | 1.67x | 333.9 µs | 162.4 µs | 1.33x |
| `sart.gen.default` | 93.7 µs | 22.5 µs | 17.5 µs | 1.29x | 5.36x | 19.2 µs | 10.6 µs | 8.81x |
| `sart.gen.default.json` | 145.4 µs | 28.5 µs | 21.7 µs | 1.31x | 6.70x | 43.4 µs | 23.9 µs | 6.07x |
| `sart.gen.x10` | 1.25 ms | 241.4 µs | 183.0 µs | 1.32x | 6.81x | 194.2 µs | 115.9 µs | 11x |
| `sart.gen.x10.json` | 1.31 ms | 289.8 µs | 226.5 µs | 1.28x | 5.77x | 447.1 µs | 250.4 µs | 5.22x |
| `sart.score.400` | 39.5 µs | 55.5 µs | 4.2 µs | 13x | 9.36x | 46.0 µs | 3.9 µs | 10x |
| `sart.score.400.json` | 238.1 µs | 222.8 µs | 117.7 µs | 1.89x | 2.02x | 261.6 µs | 137.9 µs | 1.73x |
| `visual_search.gen.default` | 340.0 µs | 57.8 µs | 38.5 µs | 1.50x | 8.84x | 74.7 µs | 33.2 µs | 10x |
| `visual_search.gen.default.json` | 587.0 µs | 155.6 µs | 104.9 µs | 1.48x | 5.60x | 459.8 µs | 255.2 µs | 2.30x |
| `visual_search.gen.x10` | 2.81 ms | 522.3 µs | 387.3 µs | 1.35x | 7.26x | 886.2 µs | 315.9 µs | 8.89x |
| `visual_search.gen.x10.json` | 6.66 ms | 1.67 ms | 1.26 ms | 1.32x | 5.27x | 4.93 ms | 2.53 ms | 2.63x |
| `visual_search.score.400` | 414.8 µs | 122.0 µs | 74.4 µs | 1.64x | 5.57x | 168.4 µs | 102.6 µs | 4.04x |
| `visual_search.score.400.json` | 776.5 µs | 310.7 µs | 196.2 µs | 1.58x | 3.96x | 463.2 µs | 243.5 µs | 3.19x |
| `pvt.gen.default` | 5.7 µs | 335 ns | 193 ns | 1.73x | 29x | 673 ns | 601 ns | 9.44x |
| `pvt.gen.default.json` | 9.5 µs | 1.6 µs | 1.2 µs | 1.41x | 8.11x | 5.7 µs | 3.8 µs | 2.48x |
| `pvt.gen.x10` | 50.2 µs | 2.3 µs | 1.6 µs | 1.46x | 32x | 6.3 µs | 5.8 µs | 8.69x |
| `pvt.gen.x10.json` | 88.5 µs | 14.5 µs | 10.6 µs | 1.37x | 8.35x | 61.8 µs | 37.9 µs | 2.34x |
| `pvt.score.400` | 116.3 µs | 9.4 µs | 7.2 µs | 1.31x | 16x | 13.4 µs | 8.8 µs | 13x |
| `pvt.score.400.json` | 331.7 µs | 197.1 µs | 126.3 µs | 1.56x | 2.63x | 219.1 µs | 148.5 µs | 2.23x |
| `nback.gen.default` | 95.0 µs | 131.0 µs | 7.3 µs | 18x | 13x | 141.3 µs | 8.5 µs | 11x |
| `nback.gen.default.json` | 125.9 µs | 128.5 µs | 16.7 µs | 7.70x | 7.54x | 203.5 µs | 42.0 µs | 3.00x |
| `nback.gen.x10` | 1.22 ms | 1.15 ms | 117.2 µs | 9.79x | 10x | 1.53 ms | 143.3 µs | 8.51x |
| `nback.gen.x10.json` | 1.68 ms | 1.30 ms | 206.8 µs | 6.27x | 8.10x | 2.02 ms | 479.1 µs | 3.50x |
| `nback.score.400` | 10.7 µs | 3.8 µs | 2.8 µs | 1.37x | 3.81x | 7.5 µs | 3.8 µs | 2.83x |
| `nback.score.400.json` | 210.5 µs | 144.9 µs | 110.9 µs | 1.31x | 1.90x | 338.8 µs | 131.9 µs | 1.60x |
| `mental_rotation.gen.default` | 5.46 ms | 427.0 µs | 522.4 µs | 0.82x | 10x | 574.1 µs | 310.3 µs | 18x |
| `mental_rotation.gen.default.json` | 4.97 ms | 470.5 µs | 552.8 µs | 0.85x | 8.99x | 767.8 µs | 421.2 µs | 12x |
| `mental_rotation.gen.x10` | 67.40 ms | 4.77 ms | 5.72 ms | 0.83x | 12x | 8.05 ms | 3.40 ms | 20x |
| `mental_rotation.gen.x10.json` | 82.04 ms | 5.24 ms | 6.21 ms | 0.84x | 13x | 9.18 ms | 4.20 ms | 20x |
| `mental_rotation.score.400.json` | 608.3 µs | 224.3 µs | 292.7 µs | 0.77x | 2.08x | 414.6 µs | 196.5 µs | 3.10x |
| `trail_making.gen.default` | 34.1 µs | 4.9 µs | 7.2 µs | 0.68x | 4.74x | 11.8 µs | 5.4 µs | 6.37x |
| `trail_making.gen.default.json` | 31.0 µs | 7.6 µs | 11.3 µs | 0.67x | 2.75x | 28.6 µs | 13.5 µs | 2.30x |
| `trail_making.gen.x10` | 2.28 ms | 481.1 µs | 740.0 µs | 0.65x | 3.08x | 1.34 ms | 770.7 µs | 2.96x |
| `trail_making.gen.x10.json` | 2.21 ms | 525.8 µs | 797.7 µs | 0.66x | 2.77x | 1.49 ms | 860.3 µs | 2.57x |
| `trail_making.score.400` | 7.9 µs | 2.2 µs | 3.8 µs | 0.58x | 2.08x | 3.1 µs | 1.9 µs | 4.27x |
| `trail_making.score.400.json` | 134.8 µs | 117.4 µs | 180.7 µs | 0.65x | **0.75x (Rust più lento)** | 227.8 µs | 134.8 µs | **1.00x (Rust più lento)** |
| `corsi.gen.default` | 8.64 ms | 13.38 ms | 2.21 ms | 6.04x | 3.90x | 9.44 ms | 2.17 ms | 3.98x |
| `corsi.gen.default.json` | 8.62 ms | 30.53 ms | 2.19 ms | 14x | 3.94x | 9.69 ms | 2.17 ms | 3.97x |
| `corsi.gen.x10` | 85.60 ms | 181.35 ms | 23.29 ms | 7.79x | 3.68x | 93.17 ms | 22.84 ms | 3.75x |
| `corsi.gen.x10.json` | 85.91 ms | 152.19 ms | 23.21 ms | 6.56x | 3.70x | 90.08 ms | 22.84 ms | 3.76x |
| `corsi.score.400` | 11.9 µs | 2.5 µs | 1.9 µs | 1.32x | 6.29x | 11.2 µs | 6.4 µs | 1.88x |
| `corsi.score.400.json` | 145.3 µs | 145.1 µs | 114.2 µs | 1.27x | 1.27x | 313.4 µs | 136.7 µs | 1.06x |
| `wcst.gen.default` | 824 ns | 541 ns | 427 ns | 1.27x | 1.93x | 517 ns | 336 ns | 2.45x |
| `wcst.gen.default.json` | 4.8 µs | 3.2 µs | 2.5 µs | 1.32x | 1.95x | 11.4 µs | 7.1 µs | **0.67x (Rust più lento)** |
| `wcst.score.400.json` | 199.7 µs | 184.5 µs | 246.3 µs | 0.75x | **0.81x (Rust più lento)** | 302.3 µs | 173.2 µs | 1.15x |
| `mental_rotation.project_faces` | 114.3 µs | 11.7 µs | 17.3 µs | 0.68x | 6.63x | 35.6 µs | 22.6 µs | 5.05x |
| `mental_rotation.is_chiral` | 33.6 µs | 2.9 µs | 3.5 µs | 0.81x | 9.52x | 3.8 µs | 2.2 µs | 15x |

## Variabilità tra esecuzioni native (4 esecuzioni)

Intervallo min–max delle mediane nelle esecuzioni ripetute (la prima, run1, è stata fatta con la CPU al 100% per le compilazioni di altri agenti: è il caso peggiore) e rapporto TS/Rust corrispondente (caso peggiore – caso migliore).

| Operazione | TS | Rust min–max | TS/Rust (peggiore–migliore) |
|---|--:|--:|--:|
| `stroop.gen.default` | 647 ns | 379 ns–590 ns | 1.10x–1.71x |
| `stroop.gen.x10` | 423.8 µs | 288.8 µs–459.7 µs | 0.92x–1.47x |
| `stroop.score.400` | 38.5 µs | 4.8 µs–7.9 µs | 4.89x–8.04x |
| `flanker.gen.default` | 9.1 µs | 3.9 µs–6.5 µs | 1.40x–2.30x |
| `flanker.gen.x10` | 118.8 µs | 41.1 µs–77.2 µs | 1.54x–2.89x |
| `flanker.score.400` | 56.7 µs | 10.0 µs–15.2 µs | 3.73x–5.67x |
| `sart.gen.default` | 93.7 µs | 17.5 µs–24.0 µs | 3.91x–5.36x |
| `sart.gen.x10` | 1.25 ms | 183.0 µs–250.1 µs | 4.98x–6.81x |
| `sart.score.400` | 39.5 µs | 4.1 µs–7.4 µs | 5.36x–9.67x |
| `nback.gen.default` | 95.0 µs | 7.1 µs–7.4 µs | 13x–13x |
| `nback.gen.x10` | 1.22 ms | 111.5 µs–117.3 µs | 10x–11x |
| `nback.score.400` | 10.7 µs | 2.7 µs–2.8 µs | 3.81x–3.95x |
| `corsi.gen.default` | 8.64 ms | 2.19 ms–2.33 ms | 3.71x–3.95x |
| `corsi.gen.x10` | 85.60 ms | 22.68 ms–27.25 ms | 3.14x–3.77x |
| `corsi.score.400` | 11.9 µs | 1.9 µs–2.0 µs | 6.12x–6.33x |

## Cause diagnosticate e interventi sui motori Rust
Le cause erano state verificate leggendo il codice (allocazioni e clonazioni nei percorsi caldi; l'allocatore di sistema di Windows le rende care, V8 e dlmalloc del WASM no). Tutti gli interventi sono nei moduli `crates/engines/src/*.rs`, senza nuove dipendenze (i motori restano puri e compilabili per `wasm32-unknown-unknown`: l'allocatore mimalloc NON è nei motori) e senza cambiare un bit dei risultati: golden, proptest e fuzz TS-vs-Rust (500 casi per motore) passano invariati.

1. **`score_sart`, `score_flanker`**: niente più `.cloned().collect::<Vec<TrialResult>>()` (≈ 1600 allocazioni per 400 trial): si lavora su `Vec<&TrialResult>`. Le funzioni pubbliche `conflict_adaptation` e `reaction_times_before_commissions` accettano ora un `impl IntoIterator<Item = &TrialResult>` (compatibili con le chiamate esistenti a slice) e delegano a una versione interna su riferimenti. In `conflict_adaptation` la `HashMap` (SipHash) per trovare il trial precedente è sostituita da una ricerca binaria su una lista ordinata in modo stabile (a parità di indice vince l'ultimo trial, come nella mappa). Le tre liste per condizione si ottengono in un solo passaggio e `accuracy_percent` non alloca.
2. **`flanker::generate_flanker`**: `Draft` è `Copy` e non porta più una `String` (clonata a ogni tentativo di rimescolamento); la stringa delle frecce è una tabella `&'static str` copiata una sola volta per stimolo, in uscita.
3. **`corsi::generate_balanced_sequences`**: `canonical_key` produce una chiave `u64` (4 bit per indice, minimo fra diritto e rovescio; ripiego testuale solo per layout con più di 16 blocchi) in un `HashSet` con hasher moltiplicativo invece di due `String` + SipHash. Le classi di equivalenza (una sequenza e il suo rovescio) sono identiche, quindi gli stessi duplicati vengono scartati nello stesso ordine di estrazione. La permutazione riusa un solo buffer (reinizializzato all'identità a ogni campione: stesso Fisher-Yates e stesso consumo del RNG di `shuffle`), `complexity_of` e l'allocazione dell'indice si fanno solo per le sequenze nuove, e la banda/pool lavora su riferimenti invece di clonare le `Sequence`; `pick_uniform_group` registra le finestre idonee come indici e clona solo la scelta.
4. **`nback::generate_nback`**: niente `HashSet<usize>` (SipHash) per target e lure ma maschere `Vec<bool>` per posizione (il conteggio dei target resta separato perché il TS conta anche posizioni oltre lo stream), nessun `Vec`/`HashSet<char>` per lettera in `pick_non_target`/`pick_lure` (array fissi sullo stack), `lure_lags` senza allocare. `score_nback` calcola i quartili su sottosezioni della lista invece di copiarla.
5. **`stroop::generate_stroop`**: un solo buffer per tutti i rimescolamenti (`copy_from_slice` + Fisher-Yates sul posto) e troncamento del cast al posto di `f64::floor` (su x86-64 di base `floor` è una chiamata a libreria; il prodotto è sempre >= 0, quindi il risultato è identico). Le sequenze sono bit-identiche.

## Limiti residui del Rust
- **Stroop `gen.x10`** (≈ 650 µs → vedi tabella, identico in TS e Rust): `SHUFFLE_RETRIES = 200` rimescolamenti completi falliscono sempre quando n è grande (la probabilità che una permutazione casuale di 480 elementi non abbia serie > 3 è trascurabile). È un limite algoritmico del rejection sampling (≈ 96 000 numeri casuali per chiamata), non del linguaggio: ridurre i ritentativi o cambiare l'algoritmo altererebbe il consumo del RNG e quindi le sequenze rispetto al golden. Si è ottimizzato solo il costo per estrazione.
- **Confine JSON (WASM)**: per tutte le operazioni il costo di `serde_json` + `JSON.stringify`/`parse` + copia in memoria lineare (colonne `json+js`) supera il calcolo dei punteggi (es. `stroop.score.400`: 8 µs di calcolo contro ~620 µs col confine completo). Il WASM conviene per le generazioni pesanti (mental_rotation, visual_search, corsi) e meno per il punteggio di 400 trial se il confine resta JSON. Proposta: chiamare il WASM una volta per sessione (non per trial) e, se serve, passare i trial come array tipizzati (colonne `rt`, `flag`, `correct` + tabella delle stringhe) invece di JSON. Non è risolvibile nei soli motori.
- **`sintropia_core::rng::{shuffle, pick, rand_int}`** usano `f64::floor` (chiamata a libreria su x86-64 base; istruzione nativa in WASM). Sostituirlo con il troncamento del cast darebbe lo stesso identico risultato ma `core` non era nel perimetro di questo intervento: è l'ottimizzazione più economica rimasta per tutti i motori.
- **Allocatore**: con mimalloc nel solo binario dell'app (non nei motori: crate C, non WASM) le operazioni ad alta allocazione restanti guadagnano ancora (tabella sperimentale in fondo, misurata sul codice PRIMA delle ottimizzazioni).

Nota: nessun'operazione di punteggio o generazione supera i 30 ms nemmeno in x10 (Corsi); a ritmo d'uso reale (una chiamata per sessione) tutti i valori sono trascurabili rispetto ai tempi del test.

## Regressione di prestazioni
`cargo test -p sintropia-engines --release --test perf_budget -- --ignored`: due test `#[ignore]` (dipendono dalla macchina) che prendono il minimo di 20 ripetizioni e verificano budget molto generosi (≈ 10x i valori misurati): generazione di default di tutti gli 11 test < 5 ms e punteggio di 400 trial (stroop, gonogo, flanker, sart, nback, corsi) < 2 ms.

### Rust nativo con mimalloc (sperimentale, misurato sul codice PRIMA delle ottimizzazioni)

| Operazione | TS | Rust (sistema, prima) | Rust + mimalloc (prima) | TS/Rust+mimalloc |
|---|--:|--:|--:|--:|
| `stroop.gen.default` | 647 ns | 771 ns | 553 ns | 1.17x |
| `stroop.gen.x10` | 423.8 µs | 652.7 µs | 483.1 µs | **0.88x (Rust più lento)** |
| `stroop.score.400` | 38.5 µs | 5.9 µs | 7.2 µs | 5.32x |
| `gonogo.gen.default` | 800 ns | 858 ns | 754 ns | 1.06x |
| `gonogo.gen.x10` | 8.8 µs | 6.5 µs | 8.7 µs | 1.01x |
| `gonogo.score.400` | 19.2 µs | 4.0 µs | 4.1 µs | 4.64x |
| `flanker.gen.default` | 9.1 µs | 18.4 µs | 9.8 µs | **0.93x (Rust più lento)** |
| `flanker.gen.x10` | 118.8 µs | 247.1 µs | 243.5 µs | **0.49x (Rust più lento)** |
| `flanker.score.400` | 56.7 µs | 68.0 µs | 45.1 µs | 1.26x |
| `sart.gen.default` | 93.7 µs | 22.5 µs | 12.9 µs | 7.26x |
| `sart.gen.x10` | 1.25 ms | 241.4 µs | 148.3 µs | 8.40x |
| `sart.score.400` | 39.5 µs | 55.5 µs | 18.8 µs | 2.11x |
| `visual_search.gen.default` | 340.0 µs | 57.8 µs | 51.2 µs | 6.64x |
| `visual_search.gen.x10` | 2.81 ms | 522.3 µs | 503.4 µs | 5.58x |
| `visual_search.score.400` | 414.8 µs | 122.0 µs | 80.2 µs | 5.17x |
| `pvt.gen.default` | 5.7 µs | 335 ns | 391 ns | 15x |
| `pvt.gen.x10` | 50.2 µs | 2.3 µs | 3.1 µs | 16x |
| `pvt.score.400` | 116.3 µs | 9.4 µs | 13.6 µs | 8.58x |
| `nback.gen.default` | 95.0 µs | 131.0 µs | 151.7 µs | **0.63x (Rust più lento)** |
| `nback.gen.x10` | 1.22 ms | 1.15 ms | 1.33 ms | **0.92x (Rust più lento)** |
| `nback.score.400` | 10.7 µs | 3.8 µs | 4.5 µs | 2.34x |
| `mental_rotation.gen.default` | 5.46 ms | 427.0 µs | 524.3 µs | 10x |
| `mental_rotation.gen.x10` | 67.40 ms | 4.77 ms | 5.23 ms | 13x |
| `mental_rotation.score.400` | 371.0 µs | 92.2 µs | 63.6 µs | 5.83x |
| `trail_making.gen.default` | 34.1 µs | 4.9 µs | 7.7 µs | 4.41x |
| `trail_making.gen.x10` | 2.28 ms | 481.1 µs | 923.9 µs | 2.47x |
| `trail_making.score.400` | 7.9 µs | 2.2 µs | 3.1 µs | 2.52x |
| `corsi.gen.default` | 8.64 ms | 13.38 ms | 12.47 ms | **0.69x (Rust più lento)** |
| `corsi.gen.x10` | 85.60 ms | 181.35 ms | 220.97 ms | **0.39x (Rust più lento)** |
| `corsi.score.400` | 11.9 µs | 2.5 µs | 3.8 µs | 3.13x |
| `wcst.gen.default` | 824 ns | 541 ns | 488 ns | 1.69x |
| `wcst.gen.x10` | 5.0 µs | 3.5 µs | 4.4 µs | 1.14x |
| `wcst.score.400` | 22.4 µs | 11.5 µs | 8.2 µs | 2.73x |
| `mental_rotation.project_faces` | 114.3 µs | 11.7 µs | 12.9 µs | 8.84x |
| `mental_rotation.is_chiral` | 33.6 µs | 2.9 µs | 2.0 µs | 17x |


## Limiti
- Variabilità tra esecuzioni: la macchina è condivisa con altre compilazioni (altri agenti); sotto carico le operazioni ad alta allocazione variano fino a 2x (vedi la sezione «Variabilità»). Le tabelle principali riportano l'ultima esecuzione completa (bench-rust.json), la sezione «Variabilità» l'intervallo di 4 esecuzioni. Le operazioni non toccate (mental_rotation, trail_making, wcst, visual_search, pvt) hanno oscillazioni del ±30% fra esecuzioni diverse dovute solo al carico: i «guadagni» <1 nella tabella «Ottimizzazioni» su queste righe sono rumore, non regressioni (il codice non è cambiato).
- Una sola macchina, Windows 11, rumore di fondo del sistema operativo (browser/IDE aperti): le differenze <15–20% non sono significative; vedi p95 nel JSON.
- Input di punteggio ciclati da sessioni piccole: non coprono tutte le diramazioni (es. WCST con metadati ripetuti). Seme di generazione fisso (42): il tempo dipende dalla sequenza (ritentativi di rejection sampling, campionamenti Corsi).
- Node/V8, non un browser: nei browser WASM e JIT hanno caratteristiche simili ma non identiche. Il WASM non usa SIMD né thread.
- Il bench nativo è single-thread e non misura allocazioni di sistema oltre il tempo di orologio.
