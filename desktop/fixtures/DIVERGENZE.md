# Divergenze Rust ↔ TypeScript (moduli stroop, gonogo, flanker, sart, visual_search)

Regola: se il bug è nel TS, il Rust NON lo copia. Il confronto è marcato `expectedDivergence` nella fixture
e il test verifica gli invarianti previsti dal paper (o l'atteso Rust dichiarato) invece dell'uguaglianza con il TS.
Tutto il resto (sequenze, conteggi, etichette, unità, metriche) coincide entro 1e-9; in pratica i float sono identici.

## 1. Go/No-Go: più di 2 No-Go consecutivi in coda (bug TS)

- Dove: `src/engine/tests/gonogo.ts`, `tryArrange`. Quando i Go sono finiti (`!canGo`) sceglie No-Go ignorando `MAX_NOGO_RUN`.
- Paper (`docs/scientific/gonogo.md`, riga «Vincolo anti-cluster»): «Mai più di 2 No-Go consecutivi».
- Effetto: con `goRatio` 0.5 (n = 80) il TS produce serie fino a 6 No-Go consecutivi (semi 1, 42, 2026). Con i default (75/25) non si osserva nelle fixture.
- Rust (`gonogo.rs`): `try_arrange` restituisce `None` e ritenta. Sequenze diverse dal TS solo nei casi in cui il TS viola il vincolo.
- Fixture: `gonogo.json` → `generation[].expectedDivergence` (rapporto-0.5@1, @42, @2026). Il test controlla lunghezza, numero di Go, serie ≤ 2 e ISI nell'intervallo.

## 2. Go/No-Go: ciclo infinito del ripiego quando i No-Go superano i Go (bug TS)

- **Corretto dal fuzz (vedi sezione in fondo): il TS NON si blocca.** `tryArrange` non restituisce mai `null` (quando i Go sono finiti accoda No-Go ignorando il limite, punto 1), quindi `deterministicArrange` è irraggiungibile: il ciclo infinito esiste solo nel codice morto. Verificato con il watchdog del fuzz (30 casi con `goRatio` 0.05–0.4, n fino a 400) e a mano (`goRatio` 0, 0.1, 0.3, 0.4: nessun blocco). Il vero difetto del TS è il punto 1, molto più frequente di quanto le fixture golden mostrassero.
- Dove (codice morto): `deterministicArrange`. Se `nNoGo > nGo` il ciclo `while` non avanzerebbe più.
- Rust: i No-Go rimasti si accodano dopo i Go (il limite di 2 non è garantibile in quel caso). Termina sempre.
- Fixture: non generabile dal TS (si blocca). Coperto da proptest `conteggi_go_nogo_esatti` (goRatio ∈ [0,1]).

## 3. Visual Search: numerosità vuota accettata (quirk JS)

- Dove: `parseCondition` in `visualSearch.ts`: `Number('') === 0` è un intero, quindi `"feature-present-"` è accettata come numerosità 0.
- Rust: la condizione è scartata (nessuna numerosità). Condizione mai prodotta dai generatori; solo robustezza su dati esterni.
- Fixture: `visual_search.json` → caso `condizione-numerosita-vuota`, con l'atteso Rust in `expectedDivergence` (TS sulla lista senza il trial malformato).

## Non coperto

- Il ripiego `separateRepeats` del SART (dopo 500 tentativi falliti) non è raggiungibile con semi/parametri realistici; ha solo test unitari in `sart.rs`.

---

# Divergenze Rust ↔ TypeScript (moduli pvt, corsi, nback, wcst, mental_rotation)

Esito del golden: sequenze, conteggi, ordini, etichette e unità coincidono ESATTAMENTE; i float coincidono entro 1e-9
(deviazione massima osservata 2.3e-13, 1 ulp dovuto al parsing JSON di `serde_json`, vedi `evidence/*.json`).
Nessun bug del TS ha richiesto una deviazione intenzionale del Rust in questi cinque moduli. Una sola differenza
numerica reale (punto 1), corretta nel Rust; gli altri punti sono note sul TS, senza modifiche.

## 1. Corsi: `Math.hypot` di V8 contro `f64::hypot` (differenza di 1 ulp, corretta nel Rust)

- Dove: `distance()` di `corsi.ts` usa `Math.hypot`. `f64::hypot` di Rust differisce di 1 ulp da V8 (verificato: distanza
  blocco 0 → 4 del layout, `403ea5adf8a76f92` contro `403ea5adf8a76f91`).
- Perché conta: `pickUniformGroup` ordina le sequenze per lunghezza di percorso; un ulp basta a invertire due sequenze quasi
  pari e a cambiare la coppia estratta a parità di seme.
- Rust (`corsi.rs`, `js_hypot`): riproduce l'algoritmo di V8 (scala per il massimo + somma di Kahan). Il golden confronta
  BIT A BIT tutte le 81 distanze fra i blocchi (`geometry.pairDistanceBits`): ogni percorso è una somma di queste distanze,
  quindi ordinamenti ed estrazioni coincidono per ogni seme, non solo per quelli in fixture.
- Nota sul TS: `Math.hypot` non è specificato al bit (SpiderMonkey e JavaScriptCore possono dare risultati diversi): fuori da V8
  la stessa sequenza a parità di seme non è garantita. Il Rust è deterministico e riproduce V8.

## Note sul TS (nessuna deviazione, da valutare in revisione)

- N-Back `splitIntoChunks`: con `ceil(n/k)` e n non divisibile i blocchi non sono «il più bilanciati possibile» (n = 5, k = 4 dà
  2, 2, 1, 0): l'ultimo quartile può essere vuoto e il suo d' vale 0. Irrilevante con i default (360 trial). Rust identico al TS.
- WCST `scoreWcst`: allinea `metas[i]` agli indici dei trial GIÀ filtrati (esclusi interrotti/pratica). Oggi `WcstView` produce
  solo trial VALID, quindi non si manifesta; con trial interrotti i meta si disallineerebbero. Rust identico al TS.
- Rotazione mentale `parseCondition`: `Number(...)` accetta anche `0x1A` o `0b11`, `parse::<f64>` di Rust no. Condizioni mai
  prodotte da `conditionLabel`; coperti nella fixture i casi `same-`, `same--30`, ` 60 `, `1e2`, `.5`, `+30`, `1e999`.
- `core::types::js_round` = `floor(x + 0.5)` differisce da `Math.round` solo per x = 0.49999999999999994 e simili (non
  raggiungibile dalle metriche arrotondate): nessun effetto sui golden.
- Ordinamento delle facce proiettate (`projectFaces`, algoritmo del pittore): a profondità quasi uguali `Math.sin/cos` e libm
  potrebbero invertire l'ordine; nelle 72 proiezioni della fixture l'ordine coincide.

---

# Divergenze Rust ↔ TypeScript (modulo trail_making)

Esito del golden (`trail_making.json`): etichette, posizioni dei cerchi (4 semi × parte A/B × n = 0, 1, 3, 8, 25, 51, più 120 e 200 per la
parte A), stato e trial di `TrailRun` e metriche coincidono; i float entro 1e-9 (vedi `evidence/trail_making.json`). Nessuna deviazione
intenzionale del Rust: i due punti sono limiti del TS, copiati fedelmente e segnalati.

## 1. Trail Making: il ripiego su griglia ignora i cerchi già piazzati (limite TS, non corretto)

- Dove: `placePoints` in `trailMaking.ts`. Esaurite le 4000 prove, i cerchi mancanti vengono messi sulle celle di una griglia partendo
  dalla cella `points.length`, senza controllare la distanza (`MIN_DISTANCE` = 0.11) dai punti già estratti a caso.
- Effetto (misurato sul TS, 3000 semi per n): distanza minima violata nello 0% dei casi fino a n = 40, 1.5% a n = 45, 86.6% a n = 51.
  Con i default (n = 25) non succede. Il vincolo conta perché sotto 0.11 i cerchi (raggio grafico) si sovrappongono.
- Rust: identico al TS, perché correggere cambierebbe le posizioni a parità di seme. Il proptest verifica la distanza minima solo fino a
  30 cerchi. Correzione suggerita: nel ripiego scartare le celle a distanza < 0.11 dai punti esistenti.

## 2. Trail Making: parte B oltre 53 cerchi (fuori dal dominio dei parametri)

- `trailLabels('B', n)` con n > 53 legge `LETTERS[26]` = `undefined` (etichetta mancante, scompare dal JSON). Rust: '?'. Il parametro è
  limitato a 51 (`paramFields.ts`), quindi non è raggiungibile dall'app; la fixture non include questo caso.

---

# Fuzz differenziale su larga scala (`tools/fuzz/fuzz.mjs`, `tests/fuzz_*.rs`)

Esito: 10 motori × 500 casi di sequenza + 500 di scoring (11 con trail_making), più le parti ausiliarie (geometria Corsi, SDT, perseverazione WCST,
figure/proiezioni, regressioni, TrailRun con clic casuali). Sequenze, conteggi, ordini ed etichette coincidono ESATTAMENTE; i float entro 1e-9
(deviazione massima osservata 3.4e-13, 1 ulp dovuto al parsing JSON). Dettagli per test in `evidence/fuzz.json`.

## F1. Go/No-Go: serie di No-Go > 2 nel TS è frequente anche nel dominio dell'interfaccia (bug TS, non copiato)

- Misura (500 sequenze casuali, n 0–400): il TS viola «mai più di 2 No-Go consecutivi» in 107 casi: 37/84 con `goRatio` 0.5–0.6, 13/81 con 0.6–0.7,
  2/89 con 0.7–0.8, 0/142 sopra 0.8. Serie osservate fino a 17 (rapporto 0.5) e oltre 180 (rapporto < 0.2). Caso minimo: `generateGoNoGo({nTrials: 80, goRatio: 0.5, ...}, mulberry32(1))`.
- Causa: `tryArrange` forza un No-Go quando i Go sono finiti (`!canGo`) ignorando `MAX_NOGO_RUN`; la sequenza è sempre accettata.
- Scientificamente corretto: il vincolo del paper (`docs/scientific/gonogo.md`, «Mai più di 2 No-Go consecutivi»). Il Rust ritenta (500 volte) e poi ripiega.
- Fixture: `fuzz/gonogo.json.gz` → `generation[].expectedDivergence`; il test verifica lunghezza, numero di Go (uguale al TS), ISI e serie ≤ 2 quando realizzabile (`nNoGo ≤ 2·nGo`).

## F2. Go/No-Go: bug del Rust corretto — il ripiego deterministico accodava i No-Go

- Trovato dal fuzz (7 sequenze con `goRatio` 0.36–0.46, dove il campionamento casuale quasi mai rispetta il vincolo e si arriva al ripiego): `deterministic_arrange`
  alternava Go/No-Go e accodava TUTTI i No-Go rimasti in coda (serie fino a 17), pur essendo il vincolo realizzabile (es. 94 No-Go su 77 Go).
- Correzione minima in `gonogo.rs`: dopo ogni Go si inserisce una quota uniforme di No-Go (al massimo 2); solo i No-Go che non trovano posto (`nNoGo > 2·nGo`) si accodano.
  Due test unitari nuovi. Nessun effetto sul dominio dell'interfaccia (`goRatio` ≥ 0.5), dove il ripiego non scatta.

## F3. Visual Search: numerosità vuota (già nota, #3) ora anche nello scoring casuale

- 28 sessioni casuali contengono `feature-present-`: confronto sull'atteso Rust dichiarato nella fixture (TS con quella condizione resa non valida).

## Non coperto dal fuzz

- Condizioni con `0x1A`/`0b11` nella rotazione mentale (nota sopra), parte B oltre 53 cerchi (fuori dominio), `separateRepeats` del SART (non raggiungibile).
- I casi `tsHang` sono 0: il watchdog resta nel generatore per rilevarne di nuovi.
