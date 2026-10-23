# N-Back (2-back) — funzionamento tecnico

**Script:** `revisione-motore/nback.ts` (copia) · `src/engine/tests/nback.ts` (vivo)
**Dominio:** memoria di lavoro a flusso continuo (aggiornamento/monitoraggio).
**Fonti:** Kirchner (1958); Jaeggi et al. (2010); Hautus (1995) per la correzione loglinear.

## 1. Logica del paradigma

Flusso di lettere: il soggetto risponde (barra spaziatrice) **solo** quando la
lettera corrente è **identica a quella di `n` posizioni prima**
(`letter[i] === letter[i-n]`). Con `n = 2`, target rate ≈ 0.30.

Si usano **consonanti** (`NBACK_LETTERS`, vocali escluse) per impedire strategie
fonologiche/di chunking.

## 2. Generazione dello stream

`generateNBack(params, rand)`:

1. `chooseTargetPositions` sceglie le posizioni target tra quelle idonee
   (indice ≥ `n`), **evitando target adiacenti**; se non ne trova abbastanza,
   rilassa il vincolo di non-adiacenza.
2. `chooseLurePositions` sceglie, tra i non-target con entrambi i lag disponibili,
   una quota `lureRate` (default 0.20) di posizioni **lure**.
3. Per ogni posizione:
   - **target** → copia `letter[i-n]`;
   - **lure** → `pickLure` ripete la lettera a lag `n−1` o `n+1` (purché diversa da
     quella a lag `n`, altrimenti sarebbe un target): è familiare ma NON è target;
   - **non-target semplice** → `pickNonTarget` evita sia il target accidentale sia i
     lag `n±1`, così i lure sono esattamente quelli pianificati.

`isTarget` e `isLure` sono ricalcolati a valle come invarianti. I lure rendono inutile
la sola familiarità (Kane et al., 2007): senza di essi basterebbe riconoscere una
lettera recente per indovinare il target. *Correzione di revisione:* la versione
precedente evitava i lure invece di inserirli, il contrario di ciò che il paper dichiarava.
Le sessioni salvate prima dell'introduzione di `lureRate` si leggono con `lureRate ?? 0`.

## 3. Teoria del segnale: d' e criterio c

Contatori (`countHitsFa`): hit, target, falsi allarmi, non-target (esclusi gli
`INTERRUPTED`).

- `probit(p)` — inversa della normale standard (algoritmo di **Acklam**).
- `dPrime(hits, targets, fa, nonTargets)` — **sensibilità** con **correzione
  loglinear di Hautus (1995)**, sempre applicata:
  `H = (hits+0.5)/(targets+1)`, `F = (fa+0.5)/(nonTargets+1)`, `d' = z(H) − z(F)`.
  Evita valori infiniti con performance perfette.
- `criterionC(...)` — **bias di risposta** (aggiunto in revisione), stessa
  correzione loglinear: `c = −0.5·(z(H) + z(F))`.
  `c > 0` = criterio **conservativo** (tende a non rispondere, più miss);
  `c < 0` = criterio **liberale** (più falsi allarmi); `c ≈ 0` = nessun bias.
  Separa la *tendenza di risposta* dalla *sensibilità*.

## 4. Metriche (`scoreNBack`)

Hit, Miss, Falsi allarmi, **Falsi allarmi su lure** (e relativo tasso), **d'**,
**Criterio c**, RT medio/SD dei hit validi, più **d' per quartile temporale** del blocco (`splitIntoChunks`), per valutare la
stabilità della traccia nel tempo (affaticamento/deriva).

## 5. Casi limite

- Prime `n` posizioni mai target (per costruzione e per invariante).
- Correzione loglinear ⇒ `d'` e `c` finiti anche con 0 FA o 0 miss.

## 6. Demo

`npx tsx revisione-motore/nback.ts` stampa lo stream con i target evidenziati e
i lure e un esempio di `d'` con performance perfetta.

## 7. Allineamento

La copia è generata da `node scripts/sync-revisione-motore.mjs`; il test
`src/engine/revisione-motore.test.ts` fallisce se diverge dal motore vivo.
