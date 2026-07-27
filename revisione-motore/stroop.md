# Stroop Task (1 e 2) — funzionamento tecnico

**Script:** `revisione-motore/stroop.ts` (copia) · `src/engine/tests/stroop.ts` (vivo)
**Dominio:** velocità di elaborazione (Stroop 1) e risoluzione del conflitto/interferenza (Stroop 2).
**Fonti:** Stroop (1935); MacLeod (1991).

## 1. Varianti

- **Stroop 1 (focus parola):** rispondere all'iniziale della **parola** letta,
  ignorando il colore dell'inchiostro.
- **Stroop 2 (focus colore):** rispondere all'iniziale del **colore**
  dell'inchiostro, ignorando la parola.

`correctKeyStroop(stimulus, variant)` seleziona la dimensione rilevante. I quattro
colori (`ROSSO`, `VERDE`, `BLU`, `GIALLO`) hanno **iniziali univoche** in italiano
→ mappatura diretta su tasti `R/V/B/G` (`STROOP_KEYS`).

## 2. Generazione della sequenza

`generateStroop(params, rand)`:

1. **Metà congruenti** (parola = colore), distribuite equamente sui 4 colori.
2. **Metà incongruenti** (parola ≠ colore): si costruiscono le 12 combinazioni
   possibili (ogni parola × 3 colori diversi) e si ripetono ciclicamente fino a
   riempire la metà — con `nTrials` multiplo di 24 ogni colore-inchiostro e ogni
   parola risultano equirappresentati.
3. **Ordinamento** con vincolo anti-ripetizione: `shuffle` ripetuto finché non ci
   sono più di **3 ripetizioni consecutive** dello stesso colore *o* della stessa
   parola (`violatesRun`, max 200 tentativi). Limitare i run di colore/parola
   limita implicitamente anche i run di risposta corretta.

## 3. Metriche (`scoreStroop`)

Calcolate **solo su trial di test, VALID e corretti** per gli RT:

- Accuratezza per condizione (esclusi gli `INTERRUPTED`).
- RT medio congruenti / incongruenti.
- SD RT congruenti / incongruenti (campionaria, n−1).
- **CV RT congruenti / incongruenti** = `SD / media · 100` — dispersione
  normalizzata, indice di **variabilità intra-soggetto** (aggiunto in revisione).
- **Effetto interferenza** = RT medio incongruenti − RT medio congruenti (il
  "Stroop effect" classico).
- Conteggi di anticipazioni e omissioni.

## 4. Note di validità

- Il disegno misura l'**interferenza** (inc − con). Non include una condizione
  **neutra** (es. stringhe non-parola colorate), quindi non separa la
  *facilitazione* dall'*interferenza*: è una scelta standard per lo Stroop
  clinico, documentata come possibile estensione futura.
- Il bilanciamento è esatto quando `nTrials` è multiplo di 24; per altri valori
  resta una lieve asimmetria residua nelle combinazioni incongruenti.

## 5. Demo

`npx tsx revisione-motore/stroop.ts` genera 24 trial deterministici e stampa
etichetta stimolo → tasto corretto (variante Stroop 2).
