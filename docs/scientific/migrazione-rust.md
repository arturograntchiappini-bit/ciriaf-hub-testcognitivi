# Migrazione dei motori da TypeScript a Rust: dimostrazione sperimentale dell'equivalenza

> Documento metodologico per la piattaforma di test cognitivi Sintropia.
> Descrive come i motori dei test, scritti in TypeScript (TS), sono stati riscritti in Rust e come si è dimostrato,
> con dati misurati, che il Rust riproduce il TS. Non è un paper sui test cognitivi: riguarda la **correttezza del
> software** che genera gli stimoli e calcola le metriche, non la validità psicometrica dei test.

> **Provenienza dei numeri.** Ogni cifra di questo documento è letta dai file di evidenza in `desktop/fixtures/`
> (`evidence/*.json`, `BENCHMARK.md`, `DIVERGENZE.md`) o è stata rigenerata eseguendo i comandi del §7 il 2026-10-23
> (esito dei test, determinismo della rigenerazione, esperimento di sensibilità del §3.5, ripartizione per `goRatio`
> del §4.1). Il documento non cita articoli: non ci sono fonti bibliografiche nuove da verificare.

---

## 1. Obiettivo e motivazione

La piattaforma nasce come applicazione web in TS. Si vuole offrire anche un'applicazione desktop nativa (Windows) con
gli **stessi test, le stesse sequenze a parità di seme e le stesse metriche**. Mantenere due implementazioni
indipendenti dei motori (una TS per il web, una Rust per il desktop) significa due insiemi di bug e il rischio che lo
stesso partecipante, con lo stesso seme, veda sequenze diverse nelle due applicazioni.

La scelta di progetto è quindi **un solo motore, in Rust**:

- nell'app desktop è usato **nativamente**;
- nella web app sarà usato compilato in **WebAssembly** (WASM, target `wasm32-unknown-unknown`).

Il TS in `src/engine/` resta nel repository, invariato, come **oracolo**: il riferimento rispetto al quale si misura
il Rust. Si ritirerà solo quando il Rust, compilato in WASM, sarà usato anche dalla web app (vedi
`src/engine/README.md`). Finché ciò non accade, **il TS è la specifica**: dove TS e Rust differiscono, la differenza va
spiegata e classificata (§4), non nascosta.

---

## 2. Architettura

Il workspace Rust (`desktop/`) ha quattro crate:

| Crate | Ruolo |
|---|---|
| `sintropia-core` | tipi condivisi, RNG `mulberry32`, validazione (soglia di anticipazione 150 ms, vedi [validazione-rt.md](validazione-rt.md)), teoria della detezione del segnale (SDT), sequencer dei trial, export, sessioni |
| `sintropia-engines` | un modulo puro per test (11 test) più i parametri di default e la regressione |
| `sintropia-content` | dati di interfaccia (catalogo, istruzioni, sezioni dei parametri): separato perché i motori non dipendano dalla UI |
| `sintropia-desktop` | interfaccia eframe/egui |

**Purezza.** `sintropia-engines` non fa I/O, non legge l'orologio, non usa thread, file o rete: il codice dei motori
non contiene `std::time`, `std::fs` né `println!` (verificato con una ricerca nei sorgenti il 2026-10-23). Per questo compila
per `wasm32-unknown-unknown` (`cargo check -p sintropia-engines --target wasm32-unknown-unknown` termina senza errori;
lo stesso vale per `sintropia-core`). Le uniche due dipendenze dal sistema in `core` sono confinate: `SystemClock`
(basato su `std::time::Instant`) nel sequencer e `iso_now`, compilata solo `#[cfg(not(target_arch = "wasm32"))]`.

**Il tempo entra solo dal sequencer.** I motori generano sequenze di stimoli e calcolano metriche da trial già
registrati; non misurano mai il tempo. L'orologio e lo scheduler sono iniettati nel sequencer (macchina a stati dei
trial a tempo di reazione, con un ambiente simulato `FakeEnv` per i test). I motori sono quindi funzioni
deterministiche del seme e dei parametri.

**Versione del motore.** `ENGINE_VERSION` (semver, valore `0.1.0` al momento della scrittura) è definita in
`sintropia-core` e scritta in ogni export: nel campo `engineVersion` dei JSON, in una riga `# engineVersion=...` dei CSV e nel
piè di pagina del report HTML. Va incrementata a ogni cambiamento osservabile di sequenze, metriche o formati, così
un dato esportato dichiara con quale motore è stato prodotto.

**RNG.** Il generatore `mulberry32` è identico al TS: la fixture `core.json` confronta le uscite per sei semi
(1, 42, 2026, 123456789, 0, 4294967295). Poiché tutte le estrazioni passano da lì, **il consumo del RNG è parte
del contratto**: cambiare l'ordine o il numero delle estrazioni cambierebbe le sequenze a parità di seme.

---

## 3. Metodo di verifica

La verifica è a tre livelli, da il più mirato al più ampio.

### 3.1 Livello 1: fixture golden generate dal TS

Per ogni test uno script Node (`desktop/tools/golden/`) importa i motori TS **veri** (senza modificarli: un hook di
risoluzione aggiunge solo l'estensione `.ts` agli import in memoria) e scrive in `desktop/fixtures/<test>.json`:

- sequenze generate per un insieme fisso di semi (1, 42, 2026, 123456789; la rotazione mentale ne usa altri per le
  figure) e di **varianti di parametri** (default, numerosità 0, 1, dispari, grandi, rapporti estremi...);
- metriche calcolate su **trial sintetici**, comprese le sessioni degenerate (**casi limite**: lista vuota, solo
  pratica, tutti interrotti, omissioni pure, anticipazioni, nessuna commissione, un solo RT con SD nulla, meno di due punti per le
  regressioni, arrotondamenti a metà).

Il test Rust corrispondente riproduce ogni caso e confronta: **sequenze, conteggi, ordini ed etichette devono essere
esattamente uguali**; i numeri in virgola mobile devono coincidere entro la tolleranza

$$|x_{\text{Rust}} - x_{\text{TS}}| \le \varepsilon, \qquad \varepsilon = 10^{-9}$$

dichiarata in **un solo punto** (`FLOAT_TOLERANCE` in `crates/engines/tests/common/mod.rs`) e richiamata da tutti i test. Un
modulo non è considerato finito finché il suo golden non passa.

### 3.2 Livello 2: fuzz differenziale su larga scala

Le fixture coprono i casi pensati da una persona; il fuzz copre quelli che nessuno ha pensato. `desktop/tools/fuzz/fuzz.mjs`
genera, con un seme maestro fisso (stesso comando, stessi file), per **ogni motore**:

- **500 casi di sequenza**: seme e parametri validi variati a caso (numerosità da 0 a circa 400);
- **500 casi di scoring**: **sessioni sintetiche** casuali (flag misti, RT casuali, risposte giuste e sbagliate, pratica
  mescolata) e **dati inconsistenti** (sessioni «caotiche», condizioni sconosciute, interrotti).

Il TS è eseguito in un worker con timeout: i casi in cui non termina sono contati come `tsHang`. Per alcuni motori il
fuzz include parti ausiliarie (geometria e span di Corsi, probit e SDT di N-Back, perseverazione WCST, proiezioni e regressioni
della rotazione mentale, etichette e partite simulate con clic casuali di Trail Making).

### 3.3 Livello 3: proprietà (proptest)

Per ciascun motore, test basati su proprietà (`proptest`) verificano **invarianti** indipendenti dal TS: bilanciamento
delle condizioni, nessuna ripetizione immediata, bersagli attesi, ISI nell'intervallo, conteggi esatti, determinismo a parità di
seme, distanza minima fra i cerchi di Trail Making. In tutto 62 proprietà, per 13312 casi casuali complessivi.

### 3.4 Risultati

**Golden** (`evidence/<test>.json`). Tutti i confronti esatti coincidono; i float coincidono entro $\varepsilon$.

| Test | Casi fixture | Varianti | Casi limite | Confronti esatti | Confronti float | Dev. max | Proprietà (casi) | Esito |
|---|--:|--:|--:|--:|--:|--:|--:|---|
| `stroop` | 64 | 7 | 12 | 4212 | 432 | 0 | 5 (1280) | ok |
| `gonogo` | 76 | 12 | 16 | 8589 | 280 | 0 | 4 (1024) | ok, 3 divergenze attese |
| `flanker` | 86 | 14 | 18 | 24727 | 345 | 1.1e-13 | 6 (1536) | ok |
| `sart` | 74 | 11 | 18 | 13525 | 1295 | 0 | 4 (1024) | ok |
| `visual_search` | 70 | 10 | 18 | 95592 | 41190 | 1.1e-13 | 6 (1536) | ok, 1 divergenza attesa |
| `pvt` | 31 | 4 | 12 | 3406 | 182 | 0 | 5 (1280) | ok |
| `corsi` | 33 | 4 | 5 | 813 | 466 | 5.7e-14 | 6 (768) | ok |
| `nback` | 122 | 23 | 24 | 1036 | 488 | 2.2e-16 | 8 (1920) | ok |
| `wcst` | 153 | 6 | 57 | 1387 | 574 | 5.6e-17 | 7 (1472) | ok |
| `mental_rotation` | 153 | 7 | 29 | 88295 | 11038 | 2.3e-13 | 7 (448) | ok |
| `trail_making` | 82 | 14 | 14 | 5230 | 4075 | 1.1e-16 | 4 (1024) | ok |
| **Totale** | **944** | | | **246812** | **60365** | **2.3e-13** | **62 (13312)** | |

La colonna «Casi fixture» somma generazione, scoring e parti ausiliarie di ciascun file. La riga «0» di deviazione
significa che tutti i float sono identici bit a bit. Il nucleo (`core.json`: RNG, validazione, SDT, export, sessioni)
ha un proprio golden con 11 test.

**Fuzz** (`evidence/fuzz.json`; `tsHang` e `tsErrors` sono 0 per tutti gli 11 motori).

| Test | Casi sequenza | Casi scoring | Confronti esatti | Confronti float | Dev. max | Divergenze attese (casi) | Esito |
|---|--:|--:|--:|--:|--:|--:|---|
| `stroop` | 500 | 500 | 351844 | 6500 | 1.1e-16 | 0 | ok |
| `gonogo` | 500 | 500 | 118895 | 5393 | 1.1e-16 | 107 | ok |
| `flanker` | 500 | 500 | 289100 | 6880 | 3.4e-13 | 0 | ok |
| `sart` | 500 | 500 | 197837 | 59858 | 1.1e-16 | 0 | ok |
| `visual_search` | 500 | 500 | 827390 | 358626 | 6.8e-13 | 28 | ok |
| `pvt` | 500 | 500 | 117842 | 6000 | 1.1e-16 | 0 | ok |
| `corsi` | 500 | 500 | 16413 | 9394 | 5.7e-14 | 0 | ok |
| `nback` | 500 | 500 | 70585 | 8480 | 4.6e-13 | 0 | ok |
| `wcst` | 500 | 500 | 194844 | 5500 | 1.1e-16 | 0 | ok |
| `mental_rotation` | 500 | 500 | 2710950 | 63726 | 2.3e-13 | 0 | ok |
| `trail_making` | 500 | 500 | 180390 | 42422 | 2.9e-11 | 0 | ok |
| **Totale** | **5500** | **5500** | **5076090** | **572779** | **2.9e-11** | **135** | |

Le «divergenze attese» sono i casi in cui il TS è difettoso e il Rust, per scelta, non lo imita (§4); in quei casi il
test non confronta con il TS ma verifica gli invarianti previsti.

**Esito dei test.** Il 2026-10-23, `cargo test -p sintropia-engines --release` ha dato 225 test superati e 0 falliti
(168 test unitari nei moduli, golden, fuzz, proptest; i 2 test di budget di prestazione sono `#[ignore]`);
`cargo test -p sintropia-core --release`: 49 test unitari e 11 di golden superati.

### 3.5 Analisi della deviazione massima e controllo di sensibilità

La deviazione massima osservata è molto minore della tolleranza dichiarata: 2.3e-13 nei golden e 2.9e-11 nel fuzz, cioè
rispettivamente circa 4 400 e 34 volte sotto $\varepsilon$. Non sono errori di calcolo, ma differenze di arrotondamento di
**1-2 unità nell'ultima cifra** (ulp, *unit in the last place*):

- **Parsing JSON.** Le fixture passano per JSON: la conversione decimale-binario di `serde_json` può differire di 1 ulp dalla lettura di V8
  (spiegazione data in `DIVERGENZE.md`).
- **Logaritmo.** L'unico punto in cui un calcolo non banale dà un risultato diverso è il probit della SDT, che usa il logaritmo
  naturale: la deviazione massima del golden di N-Back è 2.2e-16 su `probit(0.1)` (circa $-1.28$), cioè esattamente 1 ulp per valori in $[1,2)$. È **coerente**
  con `Math.log` di V8 contro `ln` di Rust che differiscono di 1 ulp in qualche argomento; non è stato isolato con un esperimento dedicato.
- **Cancellazione.** Il massimo del fuzz (2.9e-11) è su un `rtMs` di Trail Making (circa 537 ms) che è la differenza fra due
  timestamp di circa 9.2e4 ms: 2.9e-11 è esattamente 2 ulp di quei timestamp (ulp $\approx 1.46\cdot 10^{-11}$). Il valore
  è «grande» in assoluto solo perché i due operandi lo sono.

**Controllo di sensibilità.** Una tolleranza ampia potrebbe nascondere errori reali. Per verificare che il confronto
sia sensibile, il 2026-10-23 si è modificata una copia della fixture `stroop.json` sommando $10^{-6}$ a una metrica
(`RT medio congruenti`, da 422.5 a 422.500001), si è rieseguito `golden_stroop` e si è ripristinata la fixture (verificata identica
all'originale). Il test **fallisce**, con il messaggio
`sim-stroop1-perfect@42.metrics[2:RT medio congruenti].value: 422.5 != 422.500001 (tolleranza 0.000000001)`;
senza la modifica il test passa. Un errore tre ordini di grandezza sopra $\varepsilon$ è dunque rilevato. L'esperimento
è stato eseguito su un solo test (Stroop); gli altri usano lo stesso codice di confronto (`evidence.rs`).

---

## 4. Divergenze trovate e loro classificazione

**Politica: il Rust non copia i bug del TS.** Se TS e Rust differiscono, la differenza si classifica in una di
quattro categorie; la fixture marca il confronto come `expectedDivergence` e il test verifica gli **invarianti attesi**
(dal paper del test) invece dell'uguaglianza con il TS. Tutto il resto coincide.

| Categoria | Significato |
|---|---|
| Bug TS | il TS viola una regola dichiarata nel suo stesso paper; Rust corretto, TS da correggere |
| Limite TS | il TS ha un comportamento discutibile fuori dal dominio d'uso; Rust identico, segnalato |
| Bug Rust | il Rust violava un invariante; corretto |
| Quirk JS | differenza di semantica del linguaggio o della libreria |

### 4.1 Go/No-Go: più di 2 No-Go consecutivi (bug TS, Rust diverso)

Il paper ([gonogo.md](gonogo.md)) dichiara «mai più di 2 No-Go consecutivi». In `tryArrange` (`gonogo.ts`), quando i Go sono finiti il TS accoda
No-Go **ignorando** il limite, e accetta sempre la sequenza. Nelle 500 sequenze casuali del fuzz (numerosità 0-397, `goRatio` da 0.05 a 1) il TS viola il vincolo in
**107 casi**. Ripartizione per `goRatio`, ricalcolata dal file `fuzz/gonogo.json.gz`:

| `goRatio` | Sequenze | Con serie di No-Go > 2 (TS) |
|---|--:|--:|
| < 0.5 | 85 | 55 |
| 0.5-0.6 | 84 | 37 |
| 0.6-0.7 | 81 | 13 |
| 0.7-0.8 | 89 | 2 |
| ≥ 0.8 | 161 | 0 |
| **Totale** | **500** | **107** |

La serie più lunga nei dati TS del fuzz è 17 No-Go con `goRatio` tra 0.5 e 0.6, e 187 con `goRatio` < 0.2. Un caso minimo è
`generateGoNoGo({nTrials: 80, goRatio: 0.5, ...}, mulberry32(1))`; le fixture golden lo mostrano con i semi 1, 42, 2026 (serie fino a 6). Con i
default (75% Go) il difetto non compare nelle fixture, ma il fuzz mostra che è molto più frequente di quanto i casi pensati a mano suggerissero:
la scoperta è un risultato diretto del livello 2. Il Rust ritenta (fino a 500 volte) e poi ripiega su una disposizione deterministica;
il test verifica lunghezza, numero di Go (uguale al TS), ISI e serie ≤ 2 quando realizzabile (nNoGo ≤ 2·nGo).

**Il presunto «ciclo infinito» del Go/No-Go non esiste.** Una prima ipotesi, formulata leggendo il codice, era che
`deterministicArrange` si bloccasse quando i No-Go superano i Go. Il fuzz l'ha smentita: `tryArrange` non restituisce mai `null`
(accoda No-Go senza limite), quindi `deterministicArrange` è **codice morto, irraggiungibile**. Il watchdog del fuzz ha registrato 0 blocchi
(`tsHang` = 0) in tutti i motori, verificato anche con 30 casi con `goRatio` 0.05-0.4 e numerosità fino a 400 e a mano con `goRatio`
0, 0.1, 0.3, 0.4. Il difetto vero è quello di questo paragrafo. Si riporta l'errore dell'ipotesi iniziale perché il metodo serve
anche a questo: correggere le proprie congetture con i dati.

### 4.2 Go/No-Go: bug del Rust, corretto

Lo stesso fuzz ha trovato un bug **nel Rust**: in 7 sequenze con `goRatio` 0.36-0.46 (dove il campionamento casuale quasi mai rispetta il
vincolo e si arriva al ripiego) `deterministic_arrange` alternava Go e No-Go e accodava **tutti** i No-Go rimasti, con serie fino a 17,
pur essendo il vincolo realizzabile. Correzione minima: dopo ogni Go si inserisce una quota uniforme di No-Go (al massimo 2); si
accodano solo quelli che non trovano posto (nNoGo > 2·nGo). Due test unitari nuovi. Nessun effetto sul dominio dell'interfaccia (`goRatio` ≥ 0.5), dove il ripiego non scatta.

### 4.3 Trail Making: il ripiego su griglia viola la distanza minima (limite TS, Rust identico)

`placePoints` mette i cerchi in posizioni casuali con distanza minima 0.11; esaurite le 4000 prove i cerchi mancanti sono messi su una griglia
**senza controllare** la distanza dai punti già piazzati. Misurato sul TS con 3000 semi per numerosità: distanza violata nello 0% dei casi fino a
n = 40, 1.5% a n = 45, 86.6% a n = 51. Con il default (n = 25) non succede. Il Rust è **identico** al TS (correggere cambierebbe le posizioni a parità
di seme) e il proptest verifica la distanza solo fino a 30 cerchi. Correzione suggerita: nel ripiego scartare le celle a distanza < 0.11. Un secondo
limite, la parte B oltre 53 cerchi (etichetta mancante nel TS, `?` nel Rust), è fuori dal dominio dei parametri (massimo 51). Vedi [trail-making.md](trail-making.md).

### 4.4 N-Back: quartile vuoto (limite TS, Rust identico)

`splitIntoChunks` usa `ceil(n/k)`: con n non divisibile i blocchi non sono i più bilanciati possibile (n = 5, k = 4 dà 2, 2, 1, 0) e l'ultimo
quartile può essere vuoto, con $d'$ pari a 0. Irrilevante con i default (360 trial). Rust identico. Vedi [nback.md](nback.md).

### 4.5 Quirk del linguaggio

- **`Math.hypot` (Corsi).** `distance()` usa `Math.hypot`; `f64::hypot` di Rust differisce di 1 ulp da V8 (distanza fra i blocchi 0 e 4:
  `403ea5adf8a76f92` contro `403ea5adf8a76f91`). Conta perché le sequenze sono ordinate per lunghezza di percorso e un ulp può invertire due
  sequenze quasi pari, cambiando la coppia estratta a parità di seme. Il Rust (`js_hypot`) riproduce l'algoritmo di V8 (scala per il massimo
  più somma di Kahan) e il golden confronta **bit a bit** tutte le 81 distanze fra i blocchi: poiché ogni percorso è una somma di queste distanze,
  ordinamenti ed estrazioni coincidono per ogni seme. Nota: `Math.hypot` non è garantito al bit dal linguaggio (altri motori JS possono dare risultati
  diversi), quindi fuori da V8 la sequenza TS a parità di seme non è garantita; il Rust è deterministico.
- **`Number('')` (Visual Search).** `Number('') === 0` è un intero, quindi la condizione `feature-present-` è accettata dal TS come numerosità 0.
  Il Rust la scarta. I generatori non producono mai quella condizione: è solo robustezza su dati esterni (28 sessioni casuali del fuzz la contengono, confrontate
  con l'atteso Rust dichiarato).
- **`Number(...)` (rotazione mentale).** Accetta anche `0x1A` o `0b11`, `parse::<f64>` di Rust no: condizioni mai prodotte, non coperte dal fuzz.

Altre note sul TS senza deviazione (WCST: `scoreWcst` allinea i metadati agli indici dei trial già filtrati, oggi non manifesto perché la vista produce solo trial
validi; `js_round` contro `Math.round` su 0.49999999999999994) sono in `DIVERGENZE.md`.

---

## 5. Prestazioni

Le prestazioni non sono la ragione della migrazione, ma conviene sapere che il Rust non peggiora l'esperienza d'uso.

**Metodo** (`desktop/tools/bench/`). Stessi input in tre runtime: TS (Node/V8), Rust nativo (profilo `bench` = release: opt-level 3, LTO thin) e
WASM (`wasm32-unknown-unknown`, LTO fat, `strip`, `panic=abort`, senza `wasm-opt`, opt-level 3, `s` e `z`). Generazione con i default e seme 42
(«x10» = numerosità ×10); punteggio su 400 trial sintetici ottenuti ciclando la sessione simulata più realistica della fixture golden.
Ogni operazione: calibrazione del batch a circa 2 ms, riscaldamento di 300 ms (JIT incluso), poi fino a 100 campioni; si riporta la **mediana** (il p95 è nel JSON).
Il rapporto $R = t_{\text{TS}} / t_{\text{Rust}}$ è maggiore di 1 se il Rust è più veloce.

**Hardware.** CPU Intel Core Ultra 7 258V (8 thread), 32 GB di RAM, Windows 11 (10.0.26200); Node v24.15.0; rustc 1.99.0, cargo 1.99.0; misure del 2026-10-23.

**Risultati** (calcolo puro, senza serializzazione; WASM compilato con `opt-level = s`):

| Operazione | TS | Rust nativo | WASM (Os) | TS/Rust | TS/WASM |
|---|--:|--:|--:|--:|--:|
@@BENCH@@

### 5.1 Prima e dopo l'ottimizzazione

Una prima misura ha mostrato il Rust **più lento** del TS in alcune operazioni. Le cause, verificate leggendo il codice, erano allocazioni e
clonazioni nei percorsi caldi (l'allocatore di sistema di Windows le rende care; V8 e il `dlmalloc` del WASM no). Gli interventi sono solo nei
moduli dei motori, senza nuove dipendenze e **senza cambiare un bit dei risultati** (golden, proptest e fuzz passano invariati):
riferimenti invece di copie in `score_sart` e `score_flanker`, chiavi `u64` e un hasher moltiplicativo per le sequenze di Corsi, maschere
`Vec<bool>` al posto di `HashSet` in N-Back, un solo buffer di rimescolamento in Stroop e Flanker.

| Operazione | TS | Rust prima | Rust dopo | Guadagno | WASM (Os) prima | WASM (Os) dopo |
|---|--:|--:|--:|--:|--:|--:|
| `stroop.gen.default` | 647 ns | 771 ns | 379 ns | 2.04x | 450 ns | 250 ns |
| `stroop.gen.x10` | 423.8 µs | 652.7 µs | 296.2 µs | 2.20x | 392.6 µs | 243.3 µs |
| `flanker.gen.default` | 9.1 µs | 18.4 µs | 3.9 µs | 4.67x | 16.3 µs | 2.7 µs |
| `flanker.gen.x10` | 118.8 µs | 247.1 µs | 41.8 µs | 5.92x | 297.5 µs | 27.8 µs |
| `flanker.score.400` | 56.7 µs | 68.0 µs | 10.1 µs | 6.76x | 72.4 µs | 14.7 µs |
| `sart.score.400` | 39.5 µs | 55.5 µs | 4.2 µs | 13x | 46.0 µs | 3.9 µs |
| `nback.gen.default` | 95.0 µs | 131.0 µs | 7.3 µs | 18x | 141.3 µs | 8.5 µs |
| `nback.gen.x10` | 1.22 ms | 1.15 ms | 117.2 µs | 9.79x | 1.53 ms | 143.3 µs |
| `corsi.gen.default` | 8.64 ms | 13.38 ms | 2.21 ms | 6.04x | 9.44 ms | 2.17 ms |
| `corsi.gen.x10` | 85.60 ms | 181.35 ms | 23.29 ms | 7.79x | 93.17 ms | 22.84 ms |

Sono riportate solo le righe toccate dagli interventi. Nelle altre (rotazione mentale, Trail Making, WCST...) il codice non è cambiato e i rapporti
«prima/dopo» inferiori a 1 che compaiono nel file `BENCHMARK.md` sono rumore di misura, non regressioni.

### 5.2 Dimensioni del modulo WASM

| Opt-level | .wasm | gzip -9 | compilazione (mediana) | istanziazione (mediana) |
|---|--:|--:|--:|--:|
| O3 | 414 KiB | 132 KiB | 0.74 ms | 0.070 ms |
| Os | 291 KiB | 109 KiB | 0.39 ms | 0.046 ms |
| Oz | 275 KiB | 104 KiB | 0.33 ms | 0.037 ms |

La dimensione include `serde_json` e la (de)serializzazione dei tipi; i soli motori sarebbero più piccoli. `wasm-opt` non è stato applicato (non installato): un
ulteriore calo è atteso ma **non misurato**.

### 5.3 Limiti delle misure

- **Rumore.** La macchina è condivisa con altre compilazioni; sotto carico le operazioni ad alta allocazione variano fino a 2x. In 4 esecuzioni native il
  rapporto TS/Rust di `stroop.gen.x10` è andato da 0.92x a 1.47x e quello di `flanker.gen.default` da 1.40x a 2.30x. Differenze inferiori a 15-20% non sono significative.
- **Confine JSON.** Dove i dati attraversano il confine JavaScript/WASM (`JSON.stringify`, copia in memoria lineare, `JSON.parse`) il costo supera il calcolo:
  `stroop.score.400` costa 8 µs di calcolo contro circa 620 µs col confine completo. In alcune operazioni piccole con il confine JSON il WASM è più lento
  del TS (per esempio `wcst.gen.default.json`: 0.67x). Il WASM conviene per le generazioni pesanti (rotazione mentale, Visual Search, Corsi) e meno per il
  punteggio di 400 trial se il confine resta JSON; la mitigazione è chiamarlo una volta per sessione.
- **Limite algoritmico.** `stroop.gen.x10` è lento in entrambi i linguaggi per i 200 rimescolamenti completi del campionamento per rifiuto; non si
  cambia perché altererebbe il consumo del RNG e quindi le sequenze.
- Nessuna operazione di generazione o punteggio supera i 30 ms nemmeno in x10 (Corsi): a ritmo d'uso reale i valori sono trascurabili rispetto alla durata dei test.

---

## 6. Limiti e minacce alla validità

- **Una sola macchina.** Test e benchmark sono stati eseguiti su un solo computer (Windows 11, Intel Core Ultra 7 258V) e un solo ambiente Node. Le differenze
  di libreria matematica (`Math.sin`, `Math.log`) e di `Math.hypot` fra architetture o motori JS non sono state esplorate.
- **Sessioni sintetiche, non dati reali.** I trial di scoring sono generati a caso o da modelli semplici: coprono molte diramazioni, ma non la distribuzione dei dati di
  partecipanti reali. Alcune diramazioni non sono raggiungibili con parametri realistici (il ripiego `separateRepeats` del SART ha solo test unitari).
- **Nessuna misura di latenza dei tasti su hardware.** Questa migrazione verifica che sequenze e metriche coincidano, non l'accuratezza del tempo di reazione:
  il tempo entra dal sequencer, la cui precisione dipende da tastiera, schermo e sistema operativo (vedi [validazione-rt.md](validazione-rt.md)). Non si è misurata la latenza con un
  dispositivo esterno.
- **WASM non eseguito in un browser.** Il modulo WASM è stato compilato, misurato con Node e verificato con `cargo check`; il confronto TS-Rust usa il Rust
  nativo. Non è stato eseguito in un browser reale, dove WASM e JIT hanno caratteristiche simili ma non identiche.
- **Il TS è l'oracolo, non la verità.** L'equivalenza è «il Rust fa ciò che fa il TS (tranne i bug classificati)»: se un difetto del TS non viola alcuna regola scritta, passa
  inosservato. Le fixture e il fuzz non coprono ciò che il TS fa e nessun invariante dichiara.
- **Equivalenza numerica non è validità psicometrica.** Dimostrare che due implementazioni calcolano lo stesso valore non dice che il valore misuri il
  costrutto: la validità dei test è trattata nei rispettivi paper.
- **Copertura limitata dal formato.** Il confronto passa per JSON (parsing di 1 ulp, §3.5); valori non finiti sono codificati come stringhe.

**Lavoro futuro.**

1. **Rimpiazzare i motori TS con il WASM** nella web app, chiamando il modulo una volta per sessione; solo allora ritirare `src/engine/`.
2. **Correggere i bug del TS** (Go/No-Go, ripiego di Trail Making, quartile vuoto di N-Back) e rigenerare le fixture, così le «divergenze attese» spariscono e il
   confronto torna a essere uguaglianza ovunque. Ogni correzione incrementa `ENGINE_VERSION`.
3. **Firma dell'installer.** L'eseguibile e l'MSI Windows non sono firmati (SmartScreen mostra un avviso): serve un certificato di firma del codice.
4. Misurare la latenza dei tasti su hardware, eseguire il WASM in browser e applicare `wasm-opt`.

---

## 7. Riproducibilità

Dalla radice del repository (Node 24 con `--experimental-transform-types`; Rust stabile con il target `wasm32-unknown-unknown`):

```
# 1. Fixture golden dal TS (oracolo)
node --experimental-transform-types --no-warnings desktop/tools/golden/generate.mjs
node --experimental-transform-types --no-warnings desktop/tools/golden/generate-b.mjs
node --experimental-transform-types --no-warnings desktop/tools/golden/core.mjs

# 2. Fuzz differenziale (rigenera desktop/fixtures/fuzz/*.json.gz)
node --experimental-transform-types --no-warnings desktop/tools/fuzz/fuzz.mjs

# 3. Verifica del Rust e rigenerazione delle evidenze (da desktop/)
cd desktop
cargo test -p sintropia-engines --release
SINTROPIA_WRITE_EVIDENCE=1 cargo test -p sintropia-engines --release
SINTROPIA_WRITE_EVIDENCE=1 cargo test -p sintropia-engines --test 'fuzz_*' --release
cargo check -p sintropia-engines --target wasm32-unknown-unknown

# 4. Benchmark (da desktop/)
powershell -File tools/bench/run-bench.ps1
cargo test -p sintropia-engines --release --test perf_budget -- --ignored
```

Il seme maestro del fuzz è fisso e le fixture golden sono deterministiche. Il 2026-10-23 i comandi 1 e 2 sono stati rieseguiti e hanno prodotto file **byte per
byte identici** a quelli presenti nel repository (confronto MD5). Il benchmark invece **non è riproducibile al bit**: dipende dalla macchina e dal carico. Il
comando 4 esegue in sequenza il TS, il Rust nativo (`cargo bench`), le tre build WASM e l'unione dei risultati in `fixtures/BENCHMARK.md`. I dati grezzi
sono in `desktop/fixtures/evidence/bench*.json`. Una guida di sintesi è in `desktop/README.md`; la storia delle divergenze in `desktop/fixtures/DIVERGENZE.md`.

## Cronologia delle revisioni

- **2026-10.** Prima versione. Numeri letti da `desktop/fixtures/evidence/` e `BENCHMARK.md`; rigenerati fixture, fuzz, esito dei test, ripartizione del
  Go/No-Go per `goRatio` e controllo di sensibilità. Nessuna fonte bibliografica esterna citata.
