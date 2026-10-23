# Go/No-Go Task — funzionamento tecnico

**Script:** `revisione-motore/gonogo.ts` (copia) · `src/engine/tests/gonogo.ts` (vivo)
**Dominio:** inibizione motoria rapida.
**Fonti:** Verbruggen & Logan (2008); Wessel (2018).

## 1. Logica del paradigma

Un'alta frequenza di stimoli **Go** (default 75%) crea una **risposta prepotente**
automatica; la misura chiave è l'**errore di commissione** (rispondere su uno
stimolo **No-Go**), indice di fallita inibizione.

## 2. Generazione della sequenza

`generateGoNoGo(params, rand)`:

1. `nGo = round(nTrials · goRatio)`, `nNoGo = nTrials − nGo` (conteggi **esatti**).
2. Disposizione con `arrangeKinds`, che tenta fino a 500 volte una disposizione
   valida (`tryArrange`) e altrimenti usa un fallback deterministico
   (`deterministicArrange`, che intercala i No-Go). Vincoli:
   - **Il primo trial è sempre un Go** — instaura la risposta prepotente prima di
     ogni possibile inibizione (aggiunto in revisione: `if (i === 0) → go`).
   - **Mai più di 2 No-Go consecutivi** (`MAX_NOGO_RUN`), per evitare che il
     No-Go diventi atteso.
3. A ogni trial si assegna un **ISI** (schermo vuoto successivo) uniforme in
   `[isiMinMs, isiMaxMs]` (`randInt`), per rendere l'onset non prevedibile.

La durata dello stimolo (`stimulusMs`) coincide con la **finestra di risposta**.

## 3. Metriche (`scoreGoNoGo`)

- **Errori di commissione (No-Go)** e relativo **tasso %**.
- **Errori di omissione (Go)** e relativo **tasso %** (mancate risposte su Go).
- **RT medio** e **SD** dei Go corretti e **VALID**.
- **CV RT Go** = `SD / media · 100` — variabilità intra-soggetto/lapse attentivi
  (aggiunto in revisione).
- **Sensibilità d'** e **criterio c** (Hautus 1995; `src/engine/sdt.ts`): hit = Go
  corretti, falsi allarmi = commissioni su No-Go. I trial `INTERRUPTED` sono esclusi
  dai denominatori (`isResponded` / `isValidTrial`).
- **Errori di anticipazione** (RT < 150 ms, dal filtro di validazione).

Nota: un No-Go **senza** risposta è una corretta inibizione (non un'omissione):
l'omissione riguarda solo i Go mancati.

## 4. Casi limite

- `goRatio` estremi → i conteggi restano esatti; con `nGo = 0` il vincolo
  "primo = Go" viene naturalmente saltato.
- Media RT nulla (nessun Go valido) → CV = 0 (guardia esplicita).

## 5. Demo

`npx tsx revisione-motore/gonogo.ts` stampa la sequenza (il **primo carattere è
sempre `G`**) e verifica che i No-Go consecutivi non superino 2.
