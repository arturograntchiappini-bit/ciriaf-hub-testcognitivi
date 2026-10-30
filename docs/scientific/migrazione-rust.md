# Migrazione dei motori da TypeScript a Rust: dimostrazione sperimentale dell'equivalenza

> Documento metodologico per la piattaforma di test cognitivi Sintropia.
> Descrive come i motori dei test, scritti in TypeScript (TS), sono stati riscritti in Rust e come si è dimostrato,
> con dati misurati, che il Rust riproduce il TS. Non è un paper sui test cognitivi: riguarda la **correttezza del
> software** che genera gli stimoli e calcola le metriche, non la validità psicometrica dei test.

> **Provenienza dei numeri.** Ogni cifra di questo documento è letta dai file di evidenza in `desktop/fixtures/`
> (`evidence/*.json`, `BENCHMARK.md`, `DIVERGENZE.md`) o è stata rigenerata eseguendo i comandi del §7 il 2026-10-23 (le tabelle del §3.4 il 2026-10-30)
> (esito dei test, determinismo della rigenerazione, esperimento di sensibilità del §3.5, ripartizione per `goRatio`
> del §4.1). Il documento non cita articoli: non ci sono fonti bibliografiche nuove da verificare.
> **Riverifica del 2026-10-30** (senza rieseguire benchmark né test): le tabelle del §3.4 sono ricalcolate da
> `evidence/*.json` e coincidono; le tabelle del §5 e del §5.1 coincidono cella per cella con `BENCHMARK.md` (confronto con
> uno script); 225 e 392 coincidono con il conteggio statico dei `#[test]` meno i 2 `#[ignore]`; 107 e la ripartizione per
> `goRatio` sono ricalcolati dal file di fuzz precedente alla correzione (commit `23de699`); le percentuali del §4.3 sono
> state rimisurate sul codice di quel commit. Ciò che non è stato possibile riprodurre è marcato nel testo.

---

## 1. Obiettivo e motivazione

La piattaforma nasce come applicazione web in TS. Si vuole offrire anche un'applicazione desktop nativa (Windows) con
gli **stessi test, le stesse sequenze a parità di seme e le stesse metriche**. Mantenere due implementazioni
indipendenti dei motori (una TS per il web, una Rust per il desktop) significa due insiemi di bug e il rischio che lo
stesso partecipante, con lo stesso seme, veda sequenze diverse nelle due applicazioni.

La scelta di progetto è quindi **un solo motore, in Rust**:

- nell'app desktop è usato **nativamente**;
- nella web app è usato compilato in **WebAssembly** (WASM, target `wasm32-unknown-unknown`, crate `desktop/crates/wasm`), con il TypeScript come ripiego.

Il TS in `src/engine/` resta nel repository come **oracolo** (modificato solo per correggere i difetti del §4): il riferimento rispetto al quale si misura
il Rust. Dal 2026-10-30 la web app genera e valuta con il Rust in WASM e usa il TS solo come ripiego (vedi
`src/engine/README.md`), ma **il TS resta la specifica**: dove TS e Rust differiscono, la differenza va
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

**Versione del motore.** `ENGINE_VERSION` (semver, valore `0.2.0` dopo la correzione dei difetti del §4) è definita in
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
seme, distanza minima fra i cerchi di Trail Making. In tutto 63 proprietà, per 13568 casi casuali complessivi.

### 3.4 Risultati

**Golden** (`evidence/<test>.json`). Tutti i confronti esatti coincidono; i float coincidono entro $\varepsilon$.

| Test | Casi fixture | Varianti | Casi limite | Confronti esatti | Confronti float | Dev. max | Proprietà (casi) | Esito |
|---|--:|--:|--:|--:|--:|--:|--:|---|
| `stroop` | 64 | 7 | 12 | 4212 | 432 | 0 | 5 (1280) | ok |
| `gonogo` | 76 | 12 | 16 | 9300 | 280 | 0 | 4 (1024) | ok |
| `flanker` | 86 | 14 | 18 | 24727 | 345 | 1.1e-13 | 6 (1536) | ok |
| `sart` | 74 | 11 | 18 | 13525 | 1295 | 0 | 5 (1280) | ok |
| `visual_search` | 70 | 10 | 18 | 95592 | 41190 | 1.1e-13 | 6 (1536) | ok |
| `pvt` | 31 | 4 | 12 | 3406 | 182 | 0 | 5 (1280) | ok |
| `corsi` | 33 | 4 | 5 | 813 | 466 | 5.7e-14 | 6 (768) | ok |
| `nback` | 122 | 23 | 24 | 1036 | 488 | 2.2e-16 | 8 (1920) | ok |
| `wcst` | 154 | 6 | 58 | 1408 | 584 | 5.6e-17 | 7 (1472) | ok |
| `mental_rotation` | 153 | 7 | 29 | 88295 | 11038 | 2.3e-13 | 7 (448) | ok |
| `trail_making` | 82 | 14 | 14 | 5473 | 4075 | 1.1e-16 | 4 (1024) | ok |
| **Totale** | **945** | | | **247787** | **60375** | **2.3e-13** | **63 (13568)** | |

La colonna «Casi fixture» somma generazione, scoring e parti ausiliarie di ciascun file. La riga «0» di deviazione
significa che tutti i float sono identici bit a bit. Il nucleo (`core.json`: RNG, validazione, SDT, export, sessioni)
ha un proprio golden con 11 test (le 11 funzioni `#[test]` di `crates/core/tests/golden_core.rs`; `evidence/core.json`
registra 10 aree: rng, validazione, sdt, export, sessione e 5 proprietà).

**Fuzz** (`evidence/fuzz.json`; `tsHang` e `tsErrors` sono 0 per tutti gli 11 motori).

| Test | Casi sequenza | Casi scoring | Confronti esatti | Confronti float | Dev. max | Divergenze (casi) | Esito |
|---|--:|--:|--:|--:|--:|--:|---|
| `stroop` | 500 | 500 | 351844 | 6500 | 1.1e-16 | 0 | ok |
| `gonogo` | 500 | 500 | 163454 | 5500 | 1.1e-16 | 0 | ok |
| `flanker` | 500 | 500 | 289100 | 6880 | 3.4e-13 | 0 | ok |
| `sart` | 500 | 500 | 197837 | 59858 | 1.1e-16 | 0 | ok |
| `visual_search` | 500 | 500 | 827390 | 358626 | 6.8e-13 | 0 | ok |
| `pvt` | 500 | 500 | 117842 | 6000 | 1.1e-16 | 0 | ok |
| `corsi` | 500 | 500 | 16413 | 9394 | 5.7e-14 | 0 | ok |
| `nback` | 500 | 500 | 70585 | 8480 | 4.6e-13 | 0 | ok |
| `wcst` | 500 | 500 | 194844 | 5500 | 1.1e-16 | 0 | ok |
| `mental_rotation` | 500 | 500 | 2710950 | 63726 | 2.3e-13 | 0 | ok |
| `trail_making` | 500 | 500 | 180390 | 42422 | 2.9e-11 | 0 | ok |
| **Totale** | **5500** | **5500** | **5120649** | **572886** | **2.9e-11** | **0** | |

La colonna «Divergenze (casi)» conta le divergenze **aperte** (`expectedDivergenceCases`). Il file registra in `divergencesFound`
per `gonogo` 7 casi già risolti (il bug del Rust del §4.2): nessuna divergenza resta aperta.
Nessun caso richiede più una divergenza dichiarata: dopo la correzione dei difetti del TS (§4) il confronto è uguaglianza ovunque.
Fixture e fuzz sono state rigenerate dall'oracolo corretto il 2026-10-30; i file di evidenza con
`SINTROPIA_WRITE_EVIDENCE=1 cargo test -p sintropia-engines --release -- --test-threads=1`.

**Esito dei test.** Il 2026-10-30, `cargo test -p sintropia-engines --release` ha dato 225 test superati e 0 falliti
(unitari nei moduli, golden, fuzz, proptest; i 2 test di budget di prestazione sono `#[ignore]`);
`cargo test --workspace --release`: 392 test superati e 0 falliti. L'esito non è conservato in un file di evidenza; i
due totali sono però coerenti con il conteggio statico dei sorgenti (2026-10-30): 227 attributi `#[test]` in
`crates/engines` meno 2 `#[ignore]` = 225; nel workspace 227 + 65 (`core`) + 92 (`app`) + 10 (`content`) = 394, meno 2 =
392. Il conteggio statico conferma il numero dei test, non che siano passati.

### 3.5 Analisi della deviazione massima e controllo di sensibilità

La deviazione massima osservata è molto minore della tolleranza dichiarata: 2.3e-13 nei golden e 2.9e-11 nel fuzz, cioè
rispettivamente circa 4 400 e 34 volte sotto $\varepsilon$. Le due deviazioni analizzate qui sotto (il golden di N-Back, 2.2e-16, e il massimo del fuzz, 2.9e-11 su Trail Making) sono
differenze di arrotondamento di **1-2 unità nell'ultima cifra** (ulp, *unit in the last place*). Il massimo dei golden (2.3e-13,
intercetta di una regressione della rotazione mentale) e le altre deviazioni del fuzz non sono state analizzate una per una e non
sono tutte di 1-2 ulp: per esempio quella di N-Back (4.6e-13 su `probit(0.9746)`, circa 1.95) vale circa 2·10³ ulp, pur restando oltre tre
ordini di grandezza sotto $\varepsilon$.

- **Parsing JSON.** Le fixture passano per JSON: la conversione decimale-binario di `serde_json` può differire di 1 ulp dalla lettura di V8
  (spiegazione data in `DIVERGENZE.md`).
- **Logaritmo.** Nel golden di N-Back la deviazione massima è nel probit della SDT, che usa il logaritmo
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
è stato eseguito su un solo test (Stroop); gli altri usano lo stesso codice di confronto (`evidence.rs`). L'esperimento
non lascia traccia nei file di evidenza e **non è stato rieseguito** nella riverifica del 2026-10-30.

---

## 4. Difetti trovati e corretti

**Politica: il Rust non copia i bug del TS, e i bug del TS si correggono.** Il confronto TS-Rust ha fatto emergere difetti in
entrambe le implementazioni. Finché un difetto del TS non era corretto, la fixture lo marcava come `expectedDivergence` e il test
verificava gli **invarianti attesi** (dal paper del test) invece dell'uguaglianza. Il 2026-10-30 tutti i difetti del TS sono stati
corretti, le fixture rigenerate e le divergenze dichiarate sono scomparse: il confronto è di nuovo uguaglianza ovunque. Ogni correzione
ha un test di regressione (`src/engine/tests/regressioni.test.ts`); l'insieme delle correzioni ha portato `ENGINE_VERSION` da 0.1.0 a 0.2.0.

| Categoria | Significato |
|---|---|
| Bug TS | il TS violava una regola dichiarata nel suo stesso paper |
| Limite TS | il TS aveva un comportamento discutibile fuori dal dominio d'uso |
| Bug Rust | il Rust violava un invariante; corretto subito |
| Quirk JS | differenza di semantica del linguaggio o della libreria |

### 4.1 Go/No-Go: più di 2 No-Go consecutivi (bug TS, corretto)

Il paper ([gonogo.md](gonogo.md)) dichiara «mai più di 2 No-Go consecutivi». In `tryArrange` (`gonogo.ts`), quando i Go erano finiti il TS accodava
No-Go **ignorando** il limite, e accettava sempre la sequenza. Nelle 500 sequenze casuali del fuzz (numerosità 0-397, `goRatio` da 0.05 a 1) il TS violava il vincolo in
**107 casi**. Ripartizione per `goRatio`, misurata prima della correzione (riverificata il 2026-10-30 dal file di fuzz
`fuzz/gonogo.json.gz` del commit `23de699`, che conserva le sequenze del TS non corretto: 107 sequenze con
`expectedDivergence` e le stesse cifre per fascia, compresa la serie più lunga per fascia citata sotto):

| `goRatio` | Sequenze | Con serie di No-Go > 2 (TS) |
|---|--:|--:|
| < 0.5 | 85 | 55 |
| 0.5-0.6 | 84 | 37 |
| 0.6-0.7 | 81 | 13 |
| 0.7-0.8 | 89 | 2 |
| ≥ 0.8 | 161 | 0 |
| **Totale** | **500** | **107** |

La serie più lunga era di 17 No-Go con `goRatio` tra 0.5 e 0.6, e di 187 con `goRatio` < 0.2. Un caso minimo era
`generateGoNoGo({nTrials: 80, goRatio: 0.5, ...}, mulberry32(1))`. Con i default (75% Go) il difetto non compariva nelle fixture, ma il fuzz ha mostrato che era molto più
frequente di quanto i casi pensati a mano suggerissero: la scoperta è un risultato diretto del livello 2.
**Correzione:** `tryArrange` ora ritenta (fino a 500 volte) quando servirebbe una terza No-Go di fila, e poi ripiega su una disposizione deterministica
(§4.2); TS e Rust usano lo stesso algoritmo e producono le stesse sequenze.

**Il presunto «ciclo infinito» del Go/No-Go non esisteva.** Una prima ipotesi, formulata leggendo il codice, era che
`deterministicArrange` si bloccasse quando i No-Go superano i Go. Il fuzz l'ha smentita: `tryArrange` non restituiva mai `null`, quindi `deterministicArrange`
era **codice morto, irraggiungibile**; il watchdog del fuzz ha registrato 0 blocchi (`tsHang` = 0). Con la correzione sopra il ripiego diventa raggiungibile ed è
stato riscritto in modo che termini sempre (§4.2). Si riporta l'errore dell'ipotesi iniziale perché il metodo serve anche a questo: correggere le proprie congetture con i dati.

### 4.2 Go/No-Go: ripiego deterministico (bug Rust, corretto)

Lo stesso fuzz ha trovato un bug **nel Rust**: in 7 sequenze (numero registrato in `evidence/fuzz.json`, `divergencesFound`)
con `goRatio` 0.36-0.46 (dove il campionamento casuale quasi mai rispetta il vincolo e si arriva al ripiego) `deterministic_arrange`
alternava Go e No-Go e accodava **tutti** i No-Go rimasti, con serie fino a 17, pur essendo il vincolo realizzabile. L'intervallo di
`goRatio` e la serie massima di 17 vengono dal registro `DIVERGENZE.md` del commit `23de699`: le uscite del Rust difettoso non sono
conservate, quindi queste due cifre **non sono state ricalcolate** (la serie di 17 del Rust non va confusa con quella del TS del §4.1). Correzione: dopo ogni Go si inserisce una quota uniforme di No-Go (al massimo 2); si
accodano solo quelli che non trovano posto (nNoGo > 2·nGo, caso in cui il vincolo non è realizzabile). Ora il TS usa lo stesso ripiego.

### 4.3 Trail Making: il ripiego violava la distanza minima (limite TS, corretto)

`placePoints` mette i cerchi in posizioni casuali con distanza minima 0.11; esaurite le 4000 prove i cerchi mancanti erano messi su una griglia
**senza controllare** la distanza dai punti già piazzati. Misura originale sul TS, 3000 semi per numerosità: distanza violata nello 0% dei casi
fino a n = 40, 1.5% a n = 45, 86.6% a n = 51 (cifre del registro `DIVERGENZE.md`; l'insieme di semi usato non è documentato). Rimisurato il
2026-10-30 sul codice del commit `23de699` con i semi 0–2999 (e 1–3000, stesso esito): 0% a n = 25 e 40, **1.9%** a n = 45, 52.9% a n = 49,
73.1% a n = 50, **88.4%** a n = 51. L'andamento è confermato; le due percentuali originali non sono riprodotte esattamente. Con il default
(n = 25) non succedeva. **Correzione:** se l'estrazione casuale non arriva al numero richiesto, si scarta
e si scelgono `n` celle a caso di una griglia, i cui centri distano almeno 0.11 fino a 64 cerchi (il limite del parametro è 51); vale per TS e Rust.
Per 50–64 cerchi il passo della griglia è esattamente 0.11, quindi alcune distanze calcolate risultano inferiori a 0.11 di una quantità
dell'ordine dell'arrotondamento in virgola mobile (con tolleranza 10⁻¹² le violazioni rimisurate sul codice attuale sono 0% fino a n = 51).
Anche la parte B oltre 53 cerchi (etichetta mancante nel TS, `?` nel Rust) è ora limitata a 53 (1, A, 2, B, …, Z, 27). Vedi [trail-making.md](trail-making.md).

### 4.4 N-Back: quartile vuoto (limite TS, corretto)

`splitIntoChunks` usava `ceil(n/k)`: con n non divisibile i blocchi non erano i più bilanciati possibile (n = 5, k = 4 dava 2, 2, 1, 0) e l'ultimo
quartile poteva essere vuoto, con $d'$ pari a 0. **Correzione:** i primi `n mod k` blocchi hanno un elemento in più (n = 5, k = 4 dà 2, 1, 1, 1). Con i default (360 trial) il risultato è identico. Vedi [nback.md](nback.md).

### 4.5 WCST: allineamento dei metadati (limite TS, corretto)

`scoreWcst` allineava i metadati agli indici dei trial **già filtrati** (esclusi interrotti e pratica): con un trial interrotto in mezzo i metadati dei trial
successivi si sfalsavano. La vista non lo manifestava perché produce solo trial validi. **Correzione:** se trial e metadati sono liste parallele (stessa lunghezza)
l'indice è quello del trial originale; altrimenti i metadati si considerano già filtrati, come prima.

### 4.6 Quirk del linguaggio

- **`Math.hypot` (Corsi).** `distance()` usa `Math.hypot`; `f64::hypot` di Rust differisce di 1 ulp da V8 (distanza fra i blocchi 0 e 4:
  `403ea5adf8a76f92` contro `403ea5adf8a76f91`; valori esadecimali non riverificati il 2026-10-30). Conta perché le sequenze sono ordinate per lunghezza di percorso e un ulp può invertire due
  sequenze quasi pari, cambiando la coppia estratta a parità di seme. Il Rust (`js_hypot`) riproduce l'algoritmo di V8 (scala per il massimo
  più somma di Kahan) e il golden confronta **bit a bit** tutte le 81 distanze fra i blocchi: poiché ogni percorso è una somma di queste distanze,
  ordinamenti ed estrazioni coincidono per ogni seme. Nota: `Math.hypot` non è garantito al bit dal linguaggio (altri motori JS possono dare risultati
  diversi), quindi fuori da V8 la sequenza TS a parità di seme non è garantita; il Rust è deterministico.
- **`Number('')` e `Number('0x1A')` (Visual Search, rotazione mentale).** `Number('')` vale 0 e `Number('0x1A')` vale 26: il TS accettava come numerosità
  o angolo valori che non lo sono. `parseCondition` ora li scarta, come già faceva il Rust. I generatori non producono mai quelle condizioni: è solo robustezza su dati esterni.

### 4.7 Ripresa dopo pausa (bug TS dell'interfaccia, corretto)

Se si premeva Esc durante la **pratica**, la ripresa riavviava la pratica dal primo trial e i trial già svolti comparivano due volte nell'export. Ora la pratica
riparte dal trial successivo, come già faceva il test.

### 4.8 Export CSV: celle lette come formule (difetto di sicurezza, corretto)

Un campo testuale che inizia con `=`, `+`, `@` o `-` poteva essere interpretato come formula da un foglio di calcolo (*CSV injection*).
Ora, in TS e Rust, le sole **stringhe** che iniziano così (oltre a tabulazione e ritorno a capo) ricevono un apice iniziale; i numeri, compresi
quelli negativi, restano intatti, e un `\r` nel campo fa mettere il campo tra virgolette. Il JSON non è toccato. Vedi `DIVERGENZE.md` (n. 10).

Altre note, senza effetto sui risultati (`js_round` contro `Math.round` su 0.49999999999999994; ordine delle facce proiettate a profondità quasi uguali) sono in `DIVERGENZE.md`.

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
| `stroop.gen.default` | 647 ns | 379 ns | 250 ns | 1.71x | 2.59x |
| `stroop.gen.x10` | 423.8 µs | 296.2 µs | 243.3 µs | 1.43x | 1.74x |
| `stroop.score.400` | 38.5 µs | 4.8 µs | 4.4 µs | 8.04x | 8.76x |
| `gonogo.gen.default` | 800 ns | 634 ns | 670 ns | 1.26x | 1.19x |
| `gonogo.gen.x10` | 8.8 µs | 5.1 µs | 6.2 µs | 1.74x | 1.43x |
| `gonogo.score.400` | 19.2 µs | 3.1 µs | 2.7 µs | 6.22x | 7.10x |
| `flanker.gen.default` | 9.1 µs | 3.9 µs | 2.7 µs | 2.30x | 3.41x |
| `flanker.gen.x10` | 118.8 µs | 41.8 µs | 27.8 µs | 2.84x | 4.27x |
| `flanker.score.400` | 56.7 µs | 10.1 µs | 14.7 µs | 5.63x | 3.86x |
| `sart.gen.default` | 93.7 µs | 17.5 µs | 10.6 µs | 5.36x | 8.81x |
| `sart.gen.x10` | 1.25 ms | 183.0 µs | 115.9 µs | 6.81x | 11x |
| `sart.score.400` | 39.5 µs | 4.2 µs | 3.9 µs | 9.36x | 10x |
| `visual_search.gen.default` | 340.0 µs | 38.5 µs | 33.2 µs | 8.84x | 10x |
| `visual_search.gen.x10` | 2.81 ms | 387.3 µs | 315.9 µs | 7.26x | 8.89x |
| `visual_search.score.400` | 414.8 µs | 74.4 µs | 102.6 µs | 5.57x | 4.04x |
| `pvt.gen.default` | 5.7 µs | 193 ns | 601 ns | 29x | 9.44x |
| `pvt.gen.x10` | 50.2 µs | 1.6 µs | 5.8 µs | 32x | 8.69x |
| `pvt.score.400` | 116.3 µs | 7.2 µs | 8.8 µs | 16x | 13x |
| `nback.gen.default` | 95.0 µs | 7.3 µs | 8.5 µs | 13x | 11x |
| `nback.gen.x10` | 1.22 ms | 117.2 µs | 143.3 µs | 10x | 8.51x |
| `nback.score.400` | 10.7 µs | 2.8 µs | 3.8 µs | 3.81x | 2.83x |
| `mental_rotation.gen.default` | 5.46 ms | 522.4 µs | 310.3 µs | 10x | 18x |
| `mental_rotation.gen.x10` | 67.40 ms | 5.72 ms | 3.40 ms | 12x | 20x |
| `mental_rotation.score.400` | 371.0 µs | 91.4 µs | 51.2 µs | 4.06x | 7.25x |
| `trail_making.gen.default` | 34.1 µs | 7.2 µs | 5.4 µs | 4.74x | 6.37x |
| `trail_making.gen.x10` | 2.28 ms | 740.0 µs | 770.7 µs | 3.08x | 2.96x |
| `trail_making.score.400` | 7.9 µs | 3.8 µs | 1.9 µs | 2.08x | 4.27x |
| `corsi.gen.default` | 8.64 ms | 2.21 ms | 2.17 ms | 3.90x | 3.98x |
| `corsi.gen.x10` | 85.60 ms | 23.29 ms | 22.84 ms | 3.68x | 3.75x |
| `corsi.score.400` | 11.9 µs | 1.9 µs | 6.4 µs | 6.29x | 1.88x |
| `wcst.gen.default` | 824 ns | 427 ns | 336 ns | 1.93x | 2.45x |
| `wcst.gen.x10` | 5.0 µs | 3.4 µs | 2.1 µs | 1.47x | 2.42x |
| `wcst.score.400` | 22.4 µs | 10.2 µs | 7.7 µs | 2.19x | 2.90x |
| `mental_rotation.project_faces` | 114.3 µs | 17.3 µs | 22.6 µs | 6.63x | 5.05x |
| `mental_rotation.is_chiral` | 33.6 µs | 3.5 µs | 2.2 µs | 9.52x | 15x |

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

Le righe coincidono cella per cella con la tabella «Ottimizzazioni» di `BENCHMARK.md` (confronto con uno script, 2026-10-30). Sono riportate le
righe di calcolo puro delle operazioni toccate dagli interventi, **tranne** `nback.score.400` (anche `score_nback` è stato modificato): TS
10.7 µs, Rust 3.8 → 2.8 µs (1.37x), WASM (Os) 7.5 → 3.8 µs. Nelle altre righe (rotazione mentale, Trail Making, WCST...) il codice non è
cambiato e i rapporti «prima/dopo» inferiori a 1 che compaiono nel file `BENCHMARK.md` sono rumore di misura, non regressioni. Lo stesso vale
in senso opposto: anche righe non toccate migliorano fra le due esecuzioni (per esempio `gonogo.gen.default` 1.35x, `sart.gen.default` 1.29x,
`visual_search.gen.default` 1.50x, `pvt.gen.default` 1.73x), quindi una parte dei guadagni della tabella, dell'ordine di 1.3–1.7x, può dipendere
dal carico della macchina e non dagli interventi. I guadagni grandi (da 4.67x in su) restano molto oltre questo rumore; quelli di Stroop
(2.04x e 2.20x) solo in parte.

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
  `stroop.score.400` costa 4.4 µs di calcolo in WASM (Os) contro 342.3 µs col confine completo (`json+js`; 538.4 µs con O3). In alcune operazioni piccole con il confine JSON il WASM è più lento
  del TS (per esempio `wcst.gen.default.json`: 0.67x). Il WASM conviene per le generazioni pesanti (rotazione mentale, Visual Search, Corsi) e meno per il
  punteggio di 400 trial se il confine resta JSON; la mitigazione è chiamarlo una volta per sessione.
- **Limite algoritmico.** `stroop.gen.x10` è lento in entrambi i linguaggi per i 200 rimescolamenti completi del campionamento per rifiuto; non si
  cambia perché altererebbe il consumo del RNG e quindi le sequenze.
- In Rust (nativo e WASM) nessuna operazione di generazione o punteggio supera i 30 ms nemmeno in x10 (il massimo è Corsi, 23.29 ms nativo); nel TS
  `mental_rotation.gen.x10` e `corsi.gen.x10` arrivano a 67.40 e 85.60 ms. A ritmo d'uso reale i valori sono trascurabili rispetto alla durata dei test.

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

1. ~~Rimpiazzare i motori TS con il WASM nella web app~~ — fatto (2026-10-30, §8): una chiamata per generazione e una per punteggio, non una per tasto; il TS non si ritira, resta oracolo e ripiego.
2. **Firma dell'installer.** L'eseguibile e l'MSI Windows non sono firmati (SmartScreen mostra un avviso): serve un certificato di firma del codice.
3. Misurare la latenza dei tasti su hardware e applicare `wasm-opt`. Il costo per chiamata e la parità sono stati misurati in Chrome, Firefox e WebKit (§8.1); restano da provare Safari su macOS/iOS e i browser mobili, e il costo su hardware lento.

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

Il seme maestro del fuzz è fisso e le fixture golden sono deterministiche. Dopo le correzioni del 2026-10-30 le fixture golden (comando 1) sono state rigenerate e risultano **byte per
byte identiche** a quelle del repository (confronto MD5); la CI lo verifica a ogni push. Il fuzz (comando 2) è stato rigenerato nella stessa data insieme alle correzioni. Il benchmark invece **non è riproducibile al bit**: dipende dalla macchina e dal carico. Il
comando 4 esegue in sequenza il TS, il Rust nativo (`cargo bench`), le tre build WASM e l'unione dei risultati in `fixtures/BENCHMARK.md`. I dati grezzi
sono in `desktop/fixtures/evidence/bench*.json`. Una guida di sintesi è in `desktop/README.md`; la storia dei difetti in `desktop/fixtures/DIVERGENZE.md`.

## 8. Il motore Rust nella web app

`desktop/crates/wasm` espone una sola porta JSON → JSON (`engine_call`) sopra `sintropia-engines`: richiesta nel buffer di input, risposta nel buffer di
output, nessun binding generato né dipendenza oltre a `serde`. Il modulo compilato (≈ 420 KB, ≈ 150 KB compressi) è `public/engine/sintropia-engine.wasm`,
caricato a interfaccia già disegnata; la CSP del sito ammette `'wasm-unsafe-eval'` e nient'altro di nuovo.

- **Confine.** Passano dal WASM le generazioni di sequenze (un'unica chiamata per generazione) e i punteggi di tutti gli 11 test. Il sequencer, i tasti e i
  tempi di reazione restano in TypeScript: la precisione temporale non dipende dal confine JSON, che il benchmark (§5.3) ha misurato come più costoso del calcolo.
- **Flussi casuali.** Corsi e Trail Making generano a più riprese dallo stesso flusso. `mulberry32` avanza lo stato di una costante a ogni estrazione, per cui
  il modulo restituisce il numero di estrazioni (`calls`) e la web app tiene lo stato come intero (`RngStream`): il flusso è identico con Rust e con TS, anche se il backend cambia a metà.
- **Parità.** `src/engine/backend/parity.test.ts` esegue il modulo in Node su tutte le generazioni e i punteggi delle fixture golden degli 11 test (749 test),
  confrontando con il TS (e con le fixture) entro 1e-9; la CI ricompila il modulo e ripete la prova.
- **Ripiego.** Se il modulo non si carica, o rifiuta una richiesta, vale il TS. Provato in Chrome: con la CSP completa il backend è `wasm`; senza `'wasm-unsafe-eval'` il backend è `ts` e il test parte.
- **Provenienza.** Gli export web non riportano `engineVersion` (invariati: i risultati sono identici con i due backend); il backend attivo è esposto in `document.documentElement.dataset.engine`.

### 8.1 Verifica in browser (2026-10-30)

Misure e prove eseguite su build di produzione servita con le intestazioni del sito (CSP completa), con Chrome 156, Firefox 157 e WebKit 27.2 (il motore di Safari, in versione Playwright; non Safari su macOS/iOS).

- **Sessioni complete a confronto.** Per ognuno dei 12 test (Stroop 1 e 2, Go/No-Go, Flanker, SART, Visual Search, PVT, N-Back, Mental Rotation, Corsi, WCST, Trail Making) un partecipante simulato, con orologio del browser finto e `Math.random` fisso, ha svolto l'intera somministrazione due volte: con il WASM e con il TS (modulo bloccato). Risultato in tutti e tre i browser: tabella delle metriche e sei file di export (CSV, JSON, CSV internazionale, riepilogo, eventi TSV, report HTML) **identici byte per byte** fra i due backend, nessun errore in console. Le sessioni sono brevi (16 trial, mazzo WCST da 32 carte, 8 cerchi) e il partecipante risponde in modo deterministico, non realistico: provano l'identità dei dati, non la qualità delle risposte. Gli export non sono identici *fra* browser dove contano i tempi di tasto (le temporizzazioni degli eventi differiscono), ma lo sono fra backend dentro lo stesso browser.
- **Estetica.** 42 schermate (home in cima e in fondo, quattro sezioni, istruzioni e due istanti di ciascun test a tempo fisso) catturate a 1440×900 con movimento ridotto: **pixel-identiche** fra la versione precedente al WASM, la nuova con WASM e la nuova con TS.
- **Latenza per chiamata** (media su 40–200 ripetizioni, build di sviluppo; Firefox e WebKit riducono la risoluzione dei timer, per cui le celle sotto 10 µs sono rumore). Con i parametri di default il WASM è **più lento del TS per quasi tutte le operazioni piccole** (il confine JSON costa da 0,05 a 0,4 ms) e più veloce per le pesanti:

| Operazione (Chrome) | TS | WASM |
|---|---|---|
| generazione Stroop 48 trial | 0,013 ms | 0,10 ms |
| generazione Visual Search 96 trial | 0,53 ms | 1,45 ms |
| generazione N-Back 360 trial | 0,18 ms | 0,31 ms |
| punteggio SART 243 trial | 0,02 ms | 0,27 ms |
| punteggio PVT 300 trial | 0,16 ms | 0,38 ms |
| generazione Mental Rotation 84 trial | 4,8 ms | 0,98 ms |
| generazione Corsi, livelli 2–9 | 13,9 ms | 3,0 ms |

  La più lenta in assoluto è la generazione di Visual Search (1,0–1,5 ms nei tre browser). Tutte le chiamate avvengono all'avvio del test o fra un livello e l'altro, mai durante un tasto. In Firefox e WebKit i rapporti sono simili. Il vantaggio del WASM non è la velocità: è avere un solo motore.
- **Simulazione della CI** su clone pulito del commit (nuovo percorso, Windows): `npm ci`, tipi, 1148 test web, build e `npm audit`; ricompilazione del WASM, che risulta **identica byte per byte** al modulo committato, e 749 test di parità; rigenerazione delle fixture golden senza differenze; fmt, clippy `-D warnings`, 396 test Rust e controllo wasm32. Non è la CI di GitHub: manca Linux e Node 22 (si è usato Node 24).

---

## Cronologia delle revisioni

- **2026-10.** Prima versione. Numeri letti da `desktop/fixtures/evidence/` e `BENCHMARK.md`; rigenerati fixture, fuzz, esito dei test, ripartizione del
  Go/No-Go per `goRatio` e controllo di sensibilità. Nessuna fonte bibliografica esterna citata.
- **2026-10-30, web app sul WASM.** Aggiunto il §8 (con la verifica in browser del §8.1) e aggiornati §1 e «Lavoro futuro»: il motore Rust è usato dalla web app, con il TS come ripiego e oracolo.
- **Revisione 2026-10-30.** Compilata la tabella dei risultati del §5 (era rimasto un segnaposto) da `BENCHMARK.md`; aggiornati
  i valori del confine JSON del §5.3; precisato che il limite dei 30 ms vale per il Rust; chiarite le divergenze registrate nel fuzz;
  limitata la spiegazione «1-2 ulp» alle due deviazioni analizzate; aggiunto il §4.8 (CSV).
- **Riverifica 2026-10-30 delle cifre interne.** Senza rieseguire benchmark né test Rust: ricalcolate da `evidence/*.json`
  tutte le celle delle tabelle golden e fuzz (§3.4) e le posizioni delle deviazioni massime (§3.5): coincidono. Confrontate
  con uno script le tabelle del §5 (35 righe) e del §5.1 (10 righe) con `BENCHMARK.md`: nessuna differenza. Aggiunta la riga
  omessa `nback.score.400` e la cautela sui guadagni dovuti al carico (righe non toccate che migliorano di 1.3–1.7x).
  225 e 392 coerenti con il conteggio statico dei test. 107 e la ripartizione per `goRatio` ricalcolati dal fuzz del commit
  `23de699`. L'intervallo di `goRatio` (0.36-0.46) e la serie di 17 del bug Rust del §4.2 non sono ricalcolabili e sono
  marcati come tali. Le percentuali di Trail Making del §4.3 rimisurate sul codice di `23de699` (1.9% e 88.4% invece di
  1.5% e 86.6%, andamento confermato) e aggiunta la nota sull'arrotondamento a passo di griglia 0.11. Marcati come non
  rieseguiti il controllo di sensibilità del §3.5 e i valori esadecimali di `Math.hypot` del §4.6.
