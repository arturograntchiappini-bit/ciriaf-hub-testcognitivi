# Corsi Block-Tapping Task — funzionamento tecnico

**Script:** `revisione-motore/corsi.ts` (copia) · `src/engine/tests/corsi.ts` (vivo)
**Dominio:** memoria di lavoro visuo-spaziale (span di configurazione).
**Fonti:** Corsi (1972); Kessels et al. (2000); coordinate via PEBL (Mueller & Piper, 2014).

## 1. Layout dei blocchi

`CORSI_BLOCKS` — 9 punti su un piano `0–100`, asimmetrici, derivati dai valori
in mm di Kessels/PEBL (convenzione cartesiana con origine in basso; a schermo
`y_screen = 100 − y`). La **distanza minima** tra due blocchi qualsiasi è
**23.36** (blocchi 3–5); tutte le coppie sono ≥ 23.4. È un dato importante:
qualunque filtro di adiacenza con soglia < ~23 sarebbe **inerte** su questo
layout (nessun percorso ha salti più corti).

## 2. Generazione delle sequenze bilanciate

`generateBalancedSequences(length, count, params, rand, blocks?)` produce
`count` sequenze (default 2 trial per livello) della lunghezza data,
soddisfacendo **tre** requisiti che agiscono su assi diversi:

1. **Omogeneità DENTRO il livello** — stesso numero di incroci geometrici
   (`countCrossings`) e ampiezza di `pathLength` entro `complexityTolerance`.
2. **Equivalenza FRA le run** — tutte le sequenze cadono entro
   `complexityTolerance` dal **bersaglio** del livello, una costante del layout.
3. **Variabilità FRA le run** — dentro quel vincolo la scelta è casuale, quindi
   somministrazioni con seed diversi non ricevono le stesse sequenze.

### Il bersaglio di difficoltà

`targetPathLength(length) = (length − 1) × meanPairwiseDistance(blocks)`

Ogni passo di una permutazione casuale è una coppia di blocchi distinti estratta
uniformemente: il valore atteso del percorso è quindi **esattamente**
`(length − 1)` volte la distanza media fra i blocchi. Il bersaglio è calcolato
dal layout — non campionato, non dipendente dal seed — ed è perciò **identico in
ogni somministrazione**. Per la tavoletta di Kessels: distanza media 49,83 unità,
quindi bersaglio 99,7 a lunghezza 3, 199,3 a lunghezza 5, 398,6 a lunghezza 9.

### Algoritmo

- Campiona 2000 permutazioni, deduplicando per **forma canonica**
  (`canonicalKey`): una sequenza e il suo **rovescio** percorrono la stessa
  traiettoria — `pathLength` e incroci identici — quindi valgono come un unico
  candidato.
- Filtra i candidati alla **banda** `|pathLength − bersaglio| ≤ complexityTolerance`.
- `pickUniformGroup` enumera, dentro la banda, **tutti** i gruppi ammissibili di
  `count` sequenze a pari incroci e con ampiezza ≤ `complexityTolerance` (finestre
  contigue sull'ordinamento per distanza), poi ne **estrae uno a sorte**.
- Scala di degradazione, che cede una garanzia per volta: banda + ampiezza →
  banda senza vincolo di ampiezza → sequenze più vicine al bersaglio.

### Perché il rovescio va escluso

Una sequenza e il suo rovescio hanno **ampiezza zero** per costruzione: qualunque
criterio che cerchi "le due sequenze più simili" li seleziona sistematicamente.
Misurato sulla versione precedente: a lunghezza 3 la coppia era un rovescio esatto
in **194 run su 200** (es. `5-2-0` seguito da `0-2-5`). Formalmente equivalenti,
ma il secondo trial ripercorre la stessa traiettoria all'indietro, sugli stessi
blocchi — non è la prova indipendente prevista dalla somministrazione standard.

### Verifica empirica (200 seed, tolleranza 8)

| lunghezza | ampiezza dentro il livello (media / max) | sd difficoltà fra le run | rovesci | sequenze distinte |
|---|---|---|---|---|
| 3 | 0,3 / 0,9 | 4,4 | 0/200 | 107/400 |
| 5 | 0,3 / 4,4 | 4,7 | 0/200 | 362/400 |
| 7 | 0,3 / 2,8 | 4,5 | 0/200 | 396/400 |
| 9 | 0,4 / 5,4 | 4,6 | 0/200 | 400/400 |

Per confronto, la versione a sola finestra mobile aveva sd fra le run 17–28,5 ed
escursione 94–134 unità: al livello 5 un partecipante poteva percorrere in media
122 unità e un altro 255.

## 3. Geometria di supporto

- `pathLength(seq)` — somma delle distanze euclidee lungo il percorso.
- `countCrossings(seq)` — incroci **propri** tra segmenti non adiacenti, via test
  di orientamento (`orientation` → prodotto vettoriale); tocchi/collinearità non
  contano.

## 4. Regola di arresto e punteggio

- `shouldStop(levelResults)` → vero se **entrambi** i trial del livello sono
  falliti.
- `corsiSpan(passedTrials, startLength = 2)` — **punteggio ponderato cumulativo**:
  `startLength − 1 + 0.5 · passedTrials`, con `0` se nessun trial superato.
  Ancorare a `startLength` rende il punteggio commensurato alla lunghezza del
  blocco: superando entrambi i trial fino a lunghezza *L* si ottiene esattamente
  *L* (prima si otteneva *L − 1*).
- `scoreCorsi(trials, startLength = 2)` restituisce:
  - **Span Visuo-Spaziale (MBS)** — la lunghezza massima riprodotta correttamente
    (Maximum Block Span, l'indice classico di Corsi);
  - **Punteggio Corsi (Ponderato)** — `corsiSpan` sopra;
  - **Trial totali superati**;
  - **Punteggio totale (MBS × superati)** — punteggio totale di Kessels et al. (2000).

  La UI (`CorsiView`) passa il vero `params.startLength` allo scoring.

## 5. Casi limite

- Banda troppo povera per formare un gruppo ammissibile → scala di degradazione
  (banda senza vincolo di ampiezza, poi sequenze più vicine al bersaglio).
- `startLength` di somministrazione diverso da 2 → il baseline del punteggio si
  adatta (`startLength − 1`).
- Trial `INTERRUPTED` esclusi dal conteggio.

## 6. Demo

`npx tsx revisione-motore/corsi.ts` stampa, per i livelli 4–6, le due sequenze
bilanciate con distanza e incroci a confronto.
