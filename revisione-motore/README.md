# Revisione motore — copie standalone dei test cognitivi

> **Stato (2026-10-23): copie allineate.** Le copie sono **generate** dai motori vivi con
> `node scripts/sync-revisione-motore.mjs` (core identico a `src/engine/tests/`, dipendenze estratte dai
> moduli veri) e il test `src/engine/revisione-motore.test.ts` fallisce se divergono. Intestazione e `demo()`
> restano scritte a mano. Le copie del PVT e del Flanker non hanno ancora un documento tecnico `.md`.

Questa cartella contiene, **per ogni test cognitivo, una copia autosufficiente**
dello script "core" del motore, pensata per la **revisione e la spiegazione**
tecnica indipendente dalla piattaforma.

## Cosa sono questi file

- **Duplicati "morti":** non sono importati da nessuna parte dell'applicazione.
  Modificarli non ha effetto sul comportamento della piattaforma.
- **Autosufficienti:** tutte le dipendenze del motore (tipi, RNG deterministico,
  funzioni statistiche) sono **ridefinite inline** in cima a ciascun file, così
  che si leggano — e si eseguano — da soli, senza `import` relativi.
- **Eseguibili:** ogni file ha una piccola `demo()` in fondo. Si lancia con:

  ```bash
  npx tsx revisione-motore/<nome>.ts
  ```

  (Node ≥ 24 esegue direttamente anche `node revisione-motore/<nome>.ts`, tranne `wcst.ts` che
  usa proprietà nel costruttore: lì servono `tsx` o `--experimental-transform-types`.)

## Allineamento con l'engine (IMPORTANTE)

Il **core algoritmico** (generatori e funzioni di scoring) di ogni copia è
**identico** a quello del file vivo corrispondente in `src/engine/tests/`. Le
uniche differenze sono il "prelude" di dipendenze inline e la `demo()` finale.
Dopo ogni modifica al motore: `node scripts/sync-revisione-motore.mjs` (aggiorna le
copie) oppure `--check` (verifica senza scrivere).

| Copia di revisione            | Sorgente vivo                     | Doc tecnico                    | Doc scientifico              |
|-------------------------------|-----------------------------------|--------------------------------|------------------------------|
| `stroop.ts`                   | `src/engine/tests/stroop.ts`      | `stroop.md`                    | `docs/scientific/stroop.md`  |
| `gonogo.ts`                   | `src/engine/tests/gonogo.ts`      | `gonogo.md`                    | `docs/scientific/gonogo.md`  |
| `nback.ts`                    | `src/engine/tests/nback.ts`       | `nback.md`                     | `docs/scientific/nback.md`   |
| `corsi.ts`                    | `src/engine/tests/corsi.ts`       | `corsi.md`                     | `docs/scientific/corsi.md`   |
| `wcst.ts`                     | `src/engine/tests/wcst.ts`        | `wcst.md`                      | `docs/scientific/wcst.md`    |
| `pvt.ts`                      | `src/engine/tests/pvt.ts`         | — (vedi paper)                 | `docs/scientific/pvt.md`     |
| `flanker.ts`                  | `src/engine/tests/flanker.ts`     | — (vedi paper)                 | `docs/scientific/flanker.md` |

Il doc **tecnico** (questa cartella) spiega *come funziona il codice*; il doc
**scientifico** (`docs/scientific/`) documenta *paradigma, parametri e fonti*.

## Ottimizzazioni applicate in questa revisione

Sintesi delle modifiche introdotte durante la revisione (tutte replicate su
engine + standalone + test):

- **Corsi** — punteggio clinico standard: **Span Visuo-Spaziale (MBS)** +
  **Punteggio Ponderato** ancorato a `startLength`; selezione delle sequenze per
  livello con **finestra mobile** (match di difficoltà più stretto in assoluto,
  al posto della tolleranza allargabile). Dettagli e verifica in `corsi.md`.
- **Corsi (revisione successiva)** — **equivalenza fra somministrazioni**: ogni
  livello è ancorato a un **bersaglio** di difficoltà costante `(k−1)·d̄`,
  proprietà del solo layout, e le sequenze sono estratte a sorte dentro la banda
  di tolleranza. Esclusi i **rovesci** (stessa traiettoria all'indietro), che il
  criterio di somiglianza selezionava nel 97% delle run a lunghezza 3. Risultato:
  sd della difficoltà fra le run da 17–28,5 a 4,4–4,8, rovesci 0/200, sequenze
  distinte in aumento. Dettagli e tabelle in `corsi.md`.
- **Go/No-Go** — il **primo trial è sempre un Go** (instaura la risposta
  prepotente); aggiunto **CV del RT dei Go** (variabilità intra-soggetto).
- **N-Back** — aggiunto il **criterio decisionale c** (bias di risposta SDT)
  accanto a d', con la stessa correzione loglinear.
- **WCST** — aggiunti tre indici canonici di Heaton: **% Risposte a Livello
  Concettuale (CLR)**, **Trial per la 1ª categoria**, **% errori perseverativi**.
- **Stroop** — aggiunto il **CV del RT** per condizione (congruente/incongruente).
