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
`count` sequenze (default 2 trial per livello) della lunghezza data, con due
requisiti di **pari difficoltà**:

1. **Stesso numero di incroci geometrici** (`countCrossings`) — si prende il
   gruppo di candidati con il valore di incroci più frequente (`bestUniformWindow`).
2. **Distanza percorsa (`pathLength`) la più simile possibile.**

### Algoritmo (rivisto)

- Campiona permutazioni **uniche** dei blocchi (`shuffle` + `Set` di chiavi),
  accumulando un pool di candidati (fino a `HARD_CAP = 2000` tentativi).
- Periodicamente estrae, nel gruppo a incroci uniformi, la **finestra mobile**
  (`tightestWindow`) di `count` sequenze contigue per `pathLength` con **minima
  ampiezza** (ultimo − primo). Se l'ampiezza rientra in `complexityTolerance`,
  si ferma subito (**campionamento adattivo**: tolleranza più stretta ⇒ ricerca
  più lunga).
- Esaurito il budget, ritorna comunque la migliore finestra uniforme; solo se il
  gruppo uniforme non ha abbastanza sequenze, ripiega sul pool globale ordinato
  per distanza.

### Perché la finestra mobile

La versione precedente selezionava le sequenze "entro una tolleranza dalla
mediana", **raddoppiando la tolleranza (×2 … ×8)** finché non ne trovava
abbastanza: così la difficoltà effettiva poteva divergere. La finestra mobile
sceglie invece **i `count` candidati più simili in assoluto**, indipendentemente
da una soglia. Verifica empirica (seed 99): le coppie ora coincidono a meno di
0,1 unità di distanza (es. livello 4: `d=107.3` vs `d=107.3`; livello 6:
`d=255.4` vs `d=255.4`).

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
  - **Trial totali superati**.

  La UI (`CorsiView`) passa il vero `params.startLength` allo scoring.

## 5. Casi limite

- Lunghezze estreme o pochi candidati → fallback su pool globale (documentato).
- `startLength` di somministrazione diverso da 2 → il baseline del punteggio si
  adatta (`startLength − 1`).
- Trial `INTERRUPTED` esclusi dal conteggio.

## 6. Demo

`npx tsx revisione-motore/corsi.ts` stampa, per i livelli 4–6, le due sequenze
bilanciate con distanza e incroci a confronto.
