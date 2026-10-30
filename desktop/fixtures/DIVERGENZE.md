# Registro dei difetti trovati dal confronto Rust ↔ TypeScript

Il TypeScript (`src/engine/**`) è l'oracolo del Rust: le fixture golden e il fuzz differenziale confrontano i due motori.
Quando il confronto ha rivelato un difetto, la regola è stata: **il Rust non copia i bug del TS, e i bug del TS si correggono**.
Dal 2026-10-30 tutti i difetti elencati sotto sono corretti in entrambi i motori (`ENGINE_VERSION` 0.2.0), le fixture sono state
rigenerate dall'oracolo corretto e **nessun confronto richiede più una divergenza dichiarata** (`expectedDivergence` non compare in alcuna fixture).
Ogni correzione ha un test di regressione in `src/engine/tests/regressioni.test.ts` e, per il Rust, nei test unitari del modulo.

Metodo e dati completi: `docs/scientific/migrazione-rust.md` (§3-§4); evidenze numeriche in `evidence/*.json`.

## Corretti in TS e Rust

| # | Test | Difetto | Correzione |
|---|---|---|---|
| 1 | Go/No-Go | `tryArrange` accodava No-Go oltre il limite di 2 consecutivi quando i Go erano finiti (107 sequenze su 500 nel fuzz) | ritenta; stesso algoritmo in TS e Rust |
| 2 | Go/No-Go | `deterministicArrange` irraggiungibile nel TS e, nel Rust, accodava tutti i No-Go rimasti anche quando il vincolo era realizzabile | quota uniforme di al massimo 2 No-Go dopo ogni Go; solo l'eccesso (nNoGo > 2·nGo) si accoda |
| 3 | Trail Making | il ripiego a griglia ignorava la distanza minima 0.11 (86.6% di violazioni a n = 51) | celle a caso di una griglia con centri a distanza ≥ 0.11 fino a 64 cerchi |
| 4 | Trail Making | parte B oltre 53 cerchi: etichetta mancante (`undefined` nel TS, `?` nel Rust) | la parte B si ferma a 53 cerchi (1, A, 2, …, Z, 27) |
| 5 | N-Back | `splitIntoChunks` con `ceil(n/k)` lasciava l'ultimo quartile vuoto (n = 5, k = 4 → 2, 2, 1, 0) | i primi `n mod k` blocchi hanno un elemento in più (2, 1, 1, 1) |
| 6 | WCST | `scoreWcst` allineava le meta ai trial già filtrati: un trial interrotto sfalsava le meta successive | liste parallele allineate per indice originale; altrimenti meta già filtrate |
| 7 | Visual Search | `Number('') === 0`: numerosità vuota accettata | `parseCondition` rifiuta la numerosità vuota (come il Rust) |
| 8 | Rotazione mentale | `Number('0x1A')`, `0b11`, `0o7` accettati come angolo | `parseCondition` rifiuta i prefissi esadecimale, binario e ottale (come il Rust) |
| 9 | Interfaccia (TS) | Esc durante la pratica: la ripresa riavviava la pratica e duplicava i trial nell'export | la pratica riprende dal trial successivo |
| 10 | Export | un campo testuale che inizia con `=`, `+`, `@` o `-` poteva essere letto come formula da un foglio di calcolo | apice iniziale sulle sole stringhe (i numeri restano intatti); `\r` tra virgolette |

## Differenze di linguaggio, gestite

- **`Math.hypot` (Corsi).** `f64::hypot` di Rust differisce di 1 ulp da V8. Il Rust riproduce l'algoritmo di V8 (`js_hypot`: scala per il massimo + somma di Kahan)
  e il golden confronta bit a bit le 81 distanze fra i blocchi; ordinamenti ed estrazioni coincidono per ogni seme. `Math.hypot` non è garantito al bit dal linguaggio:
  fuori da V8 la sequenza TS a parità di seme non è garantita.
- **Parsing JSON.** Le fixture passano per JSON: la conversione decimale-binario di `serde_json` può differire di 1 ulp da V8. Deviazione massima osservata: 2.9e-11 nel fuzz, 2.3e-13 nei golden (tolleranza 1e-9).

## Note senza effetto sui risultati

- `core::types::js_round` = `floor(x + 0.5)` differisce da `Math.round` solo per x = 0.49999999999999994 e simili (non raggiungibile dalle metriche arrotondate).
- Ordinamento delle facce proiettate (`projectFaces`, algoritmo del pittore): a profondità quasi uguali `Math.sin/cos` e libm potrebbero invertire l'ordine; nelle 72 proiezioni della fixture coincide.
- Il ripiego `separateRepeats` del SART (dopo 500 tentativi falliti) non è raggiungibile con semi e parametri realistici: ha solo test unitari.
- Con più di 2 No-Go per ogni Go (`nNoGo > 2·nGo`) il vincolo anti-cluster non è realizzabile: l'eccesso si accoda, in TS e in Rust.
