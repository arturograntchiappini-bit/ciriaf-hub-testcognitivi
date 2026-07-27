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
2. Per ogni posizione:
   - se **target** → copia `letter[i-n]`;
   - altrimenti `pickNonTarget` sceglie una lettera che **non** crea un target
     accidentale (esclude `letter[i-n]`) e che **limita i lure** ai lag `n−1` e
     `n+1` (soft-forbidden), riducendo i match parziali che favorirebbero la
     strategia di sola familiarità. Se i vincoli saturano l'alfabeto, li rilassa
     progressivamente.

`isTarget` viene ricalcolato a valle come invariante (`i ≥ n && letter[i]===letter[i-n]`).

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

Hit, Miss, Falsi allarmi, **d'**, **Criterio c**, RT medio/SD dei hit validi, più
**d' per quartile temporale** del blocco (`splitIntoChunks`), per valutare la
stabilità della traccia nel tempo (affaticamento/deriva).

## 5. Casi limite

- Prime `n` posizioni mai target (per costruzione e per invariante).
- Correzione loglinear ⇒ `d'` e `c` finiti anche con 0 FA o 0 miss.

## 6. Demo

`npx tsx revisione-motore/nback.ts` stampa lo stream con i target evidenziati e
un esempio di `d'` con performance perfetta.
