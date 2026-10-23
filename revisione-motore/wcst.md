# Wisconsin Card Sorting Test — funzionamento tecnico

**Script:** `revisione-motore/wcst.ts` (copia) · `src/engine/tests/wcst.ts` (vivo)
**Dominio:** flessibilità cognitiva / set-shifting.
**Fonti:** Berg (1948); Grant & Berg (1948); Heaton; Kongs et al. (2000).

## 1. Materiali e regole

- **4 carte stimolo** standard (`WCST_STIMULUS_CARDS`): red/triangle/1,
  green/star/2, yellow/cross/3, blue/circle/4.
- **Mazzo di risposta** (`buildDeck`): permutazione delle 64 combinazioni
  (4 colori × 4 forme × 4 numeri), ripetuta se `deckSize > 64` — bilanciato per
  costruzione su tutte le dimensioni.
- **Criteri** in ordine ciclico `WCST_RULE_ORDER = colore → forma → numero`
  (`ruleForCategory(i) = ordine[i mod 3]`).

Il criterio attivo **cambia in segreto** dopo `runToShift` risposte corrette
consecutive (default 10); il feedback è solo "Corretto/Errato".

## 2. Matching

- `matchesOn(target, choice, dim)` — combaciano sulla dimensione `dim`?
- `matchingDims(target, choice)` — elenco delle dimensioni su cui combaciano
  (serve a distinguere errori ambigui da non ambigui).

## 3. Scoring (`scoreWcst`) — operazionalizzazione di Heaton

Il runtime fornisce, per ogni trial, `WcstTrialMeta { currentRule, matchedDims }`.
Un trial è corretto se `matchedDims` include `currentRule`.

**Principio perseverato (PP)** — classe `PerseverationScanner`, procedura di Heaton et
al. (1993) come descritta da Howlett & Moseley (2024):
- si stabilisce al **primo errore non ambiguo** (la carta combacia su **una sola**
  dimensione, diversa dalla regola attuale); quell'errore conta come perseverativo;
- al completamento di una categoria il PP diventa la **regola appena abbandonata**;
- **tre errori non ambigui consecutivi** su una dimensione che non è né corretta né il
  PP cambiano il PP (il primo dei tre non è perseverativo: lettura nostra, il testo non
  lo esplicita);
- una risposta **ambigua** conta come perseverativa solo se è «incastrata» tra due
  errori non ambigui perseverativi e combacia col PP.
Gli **errori** perseverativi sono un sottoinsieme delle **risposte** perseverative.

**Metriche prodotte:**
- Categorie completate;
- Trial totali;
- Errori totali;
- Errori perseverativi, **risposte perseverative** e % errori perseverativi;
- Errori non perseverativi;
- **Failure to maintain set** (errore dopo 5–9 corrette consecutive);
- **Risposte a livello concettuale (CLR, %)** *(aggiunto)* — quota di risposte
  che ricadono in **corse di ≥ 3 corrette consecutive**; il contatore `correctRun`
  **non** viene azzerato dallo shift di categoria (le corrette che portano al
  cambio fanno comunque parte della corsa concettuale);
- **Trial per la 1ª categoria** *(aggiunto)* — numero di trial fino al primo
  completamento (indice di *learning-to-learn*); se nessuna categoria è
  completata, vale il totale dei trial.

## 4. Note e limiti

- Lo scoring segue la procedura pubblicata ma **non è validato** rispetto al software
  ufficiale PAR; il mazzo è casuale, non quello di Heaton. Limiti in
  `docs/scientific/wcst.md`.
- Trial `INTERRUPTED` esclusi.

## 5. Demo

`npx tsx revisione-motore/wcst.ts` costruisce un mazzo, mostra un esempio di
`matchingDims` e la sequenza ciclica dei criteri. (La classe usa proprietà nel
costruttore: serve `tsx` o `node --experimental-transform-types`.)

## 6. Allineamento

La copia è generata da `node scripts/sync-revisione-motore.mjs`; il test
`src/engine/revisione-motore.test.ts` fallisce se diverge dal motore vivo.
