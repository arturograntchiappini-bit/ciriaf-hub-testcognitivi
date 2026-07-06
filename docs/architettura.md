# Architettura del codice — CIRIAF Cognitive Testing Hub

> Documento ufficiale di spiegazione del funzionamento del codice. In italiano.
> Aggiornato insieme al codice (documentation gate per fase).

Questo documento spiega **come è fatta** la piattaforma e **come funzionano i
meccanismi dei test**. Per il razionale scientifico di ciascun test vedi
`docs/scientific/`.

---

## 1. Principio: due strati separati

```
┌─────────────────────────────────────────────────────────────┐
│  UI (React)   — navigazione, schermate, rendering stimoli     │
│  src/ui/                                                       │
└───────────────▲───────────────────────────────────────────────┘
                │ consuma (nessuna dipendenza inversa)
┌───────────────┴───────────────────────────────────────────────┐
│  MOTORE (TypeScript puro) — zero import da React               │
│  src/engine/  — timing, generatori, validazione, scoring       │
└───────────────────────────────────────────────────────────────┘
```

- Il **motore** (`src/engine/`) non importa mai React. Contiene la logica pura:
  generazione delle sequenze, validazione dei tempi di reazione, calcolo delle
  metriche, export. È interamente unit-testato (Vitest) senza browser.
- La **UI** (`src/ui/`) è un guscio sottile che naviga tra schermate e disegna
  gli stimoli. Durante i trial il timing è gestito fuori dal ciclo di re-render.

Perché: la correttezza scientifica vive nel motore, dove può essere verificata in
isolamento; la UI resta sostituibile e collaudabile a parte.

---

## 2. Struttura delle cartelle

```
src/
  engine/
    types.ts          Tipi condivisi (TrialResult, TestResult, ValidationFlag…)
    clock.ts          Cronometro e scheduler astratti (iniettabili nei test)
    rng.ts            Generatore pseudo-casuale deterministico (mulberry32)
    validation.ts     Filtri RT (anticipazione/omissione), SD, aggregazioni
    session.ts        ID di sessione anonimo (XXXX-HHMM)
    export.ts         Serializzazione CSV (';') e JSON
    tests/
      stroop.ts       Generatore + scorer Stroop 1/2
      gonogo.ts       Generatore + scorer Go/No-Go
      corsi.ts        Geometria, sequenze bilanciate, span, regola d'arresto
      nback.ts        Generatore, d' (loglinear), scorer con quartili
      wcst.ts         Mazzo, matching, cambio regola, scoring di Heaton
  config/
    defaults.ts       Parametri default, ognuno con la fonte scientifica
  ui/
    theme.ts          Token colore (UI vs stimoli, tenuti separati)
    router.ts         Rotte a stato + catalogo dei test
    storage.ts        Persistenza impostazioni (localStorage, merge sui default)
    download.ts       Download di file (Blob + anchor)
    content/instructions.ts   Testi istruzioni + mappa tasti (IT)
    components/       Button, Header, TestCard
    runtime/
      sequencer.ts    Macchina a stati dei test a tempo di reazione
      RtTestRunner.tsx Orchestrazione pratica→countdown→test + tastiera/interruzioni
      StimulusStage.tsx Palcoscenico a tutto schermo per gli stimoli
    tests/
      StroopView.tsx / GoNoGoView.tsx / NBackView.tsx   (usano il sequencer)
      CorsiView.tsx / WcstView.tsx / WcstCard.tsx        (interazione a click)
    screens/          Home, Instructions, TestRunner, Results, Settings
```

---

## 3. Il ciclo di un trial a tempo di reazione

I test Stroop, Go/No-Go e N-Back condividono la stessa macchina a stati:
`src/ui/runtime/sequencer.ts`. Le fasi di un trial:

```
 fixation ──► stimulus ──► (blank) ──► [feedback] ──► isi ──► trial successivo
   (opz.)      onset↑        (opz.)      (solo pratica)
```

- **onset**: l'istante di comparsa dello stimolo è preso *al paint* del frame,
  tramite `scheduler.afterPaint(...)`. È il riferimento zero del cronometro.
- **risposta**: un listener globale `keydown` legge `performance.now()` e calcola
  `rt = now − onset`. Nessun re-render di React sta tra onset e risposta: lo
  stimolo è statico, quindi il tempo misurato non è inquinato dal rendering.
- **finestra di risposta** (`responseWindowMs`) può essere più lunga della
  visibilità dello stimolo (`stimulusVisibleMs`): è il caso dell'N-Back, dove la
  lettera resta 500 ms ma si risponde per tutti i 2000 ms del trial.
- **una sola risposta per trial**; l'auto-repeat della tastiera (`event.repeat`)
  è ignorato.

Il `clock` e lo `scheduler` sono **iniettabili**: in produzione usano
`performance.now()` e `requestAnimationFrame`/`setTimeout`; nei test si usa un
ambiente finto che avanza il tempo a mano (vedi `sequencer.test.ts`). Così la
logica di timing è verificabile in modo deterministico.

### Casi limite gestiti

- Perdita di focus/visibilità (`blur`, `visibilitychange`) durante un trial →
  flag `INTERRUPTED`.
- `Esc` → pausa con possibilità di **riprendere**, **uscire esportando i dati
  parziali** o **uscire senza salvare**. La ripresa ricrea il sequencer sui trial
  rimanenti (i risultati vengono reindicizzati in modo continuo).
- Fullscreen richiesto all'avvio del test.

---

## 4. Validazione automatica dei dati

`src/engine/validation.ts` — applicata uniformemente. Precedenza dei flag:

```
INTERRUPTED  →  OMISSION  →  ANTICIPATION  →  VALID
```

- `rt < 150 ms` (con risposta) → **ANTICIPATION** (riflesso/anticipazione, non
  cognizione — vedi `docs/scientific/validazione-rt.md`).
- Nessuna risposta entro la finestra, quando una risposta era attesa → **OMISSION**.
  Per i trial in cui trattenere è corretto (No-Go, non-target dell'N-Back), la
  mancata risposta è invece **VALID** (corretto rifiuto).
- La **deviazione standard** riportata è quella campionaria (n−1) dei soli RT
  `VALID` e corretti: misura la stabilità della performance nel tempo.

I trial invalidati **non vengono mai scartati**: restano nei dati grezzi
(CSV/JSON) col loro flag, così i criteri di pulizia restano rivedibili a posteriori.

---

## 5. I test interattivi (Corsi e WCST)

Non sono compiti a tempo di reazione: hanno logica dedicata.

- **Corsi** (`CorsiView.tsx`): layout fisso di 9 blocchi (coordinate di
  Kessels/PEBL in `corsi.ts`). Ogni trial illumina una sequenza, poi il soggetto
  la riproduce cliccando. È **adattivo**: 2 trial per livello, arresto se entrambi
  falliti; span = 0.5 punti per trial superato. Le due sequenze di uno stesso
  livello hanno la **stessa complessità** (uguale numero di incroci geometrici e
  distanza totale del percorso entro tolleranza), garantita dal generatore
  `generateBalancedSequences`.
- **WCST** (`WcstView.tsx`): il soggetto abbina la carta a una delle 4 carte
  stimolo. Il criterio (Colore→Forma→Numero, ciclico) cambia **in segreto** dopo
  N corrette consecutive. Lo scoring di Heaton (categorie, errori perseverativi,
  failure to maintain set) è in `scoreWcst`; il runtime fornisce, per ogni trial,
  la regola attiva e le dimensioni combacianti (`WcstTrialMeta`).

---

## 6. Come aggiungere un nuovo test

1. Nel motore (`src/engine/tests/`): scrivi generatore puro + scorer puro + test
   unitari. Non importare React.
2. Aggiungi i parametri di default in `src/config/defaults.ts` con la fonte.
3. Documenta il razionale in `docs/scientific/<nuovo>.md`.
4. Nella UI: se è un test a tempo di reazione, crea una vista che costruisce un
   `RtTestPlan` (come `StroopView`); altrimenti scrivi una vista interattiva
   dedicata. Aggiungila a `TestRunner.tsx`, `router.ts` (catalogo) e
   `content/instructions.ts`.
5. Aggiorna questo documento.

---

## 7. Identità visiva

- Sfondo bianco `#FFFFFF`, testo nero `#111111`, accento azzurrino `#4A90D9`
  (superficie tenue `#EAF2FB`). L'accento è usato **solo** per rifiniture.
- I **colori funzionali** (verde/rosso Go-No-Go, colori Stroop) vivono in
  `STIMULUS_COLORS` e non compaiono mai come colori dell'interfaccia, per non
  confondersi con gli stimoli.
- Tipografia: Inter (self-hosted, nessun CDN esterno), gerarchia per peso.
- I token sono centralizzati (`tailwind.config.js`, `src/index.css`, `theme.ts`):
  un futuro allineamento al brand CIRIAF è una singola modifica.

---

## 8. Sessione, export e privacy

- Esecuzione **anonima**: nessun account, nessun database. Ogni somministrazione
  genera un ID `XXXX-HHMM` (`session.ts`) mostrato a schermo e incluso negli
  export, per ricollegare la trascrizione manuale al file grezzo.
- **CSV** (separatore `;`): una riga per trial, pratica inclusa e marcata, con i
  flag di validazione. **JSON**: parametri usati, metadati d'ambiente e tutti i
  trial. I nomi file: `{test}_{sessionId}_{data-ora}.{csv|json}`.
- I parametri effettivi sono scritti **dentro** ogni file: un risultato resta
  interpretabile anche se le impostazioni cambiano nel tempo.
