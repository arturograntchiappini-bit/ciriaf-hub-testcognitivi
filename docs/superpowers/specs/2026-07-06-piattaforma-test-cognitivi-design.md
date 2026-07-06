# CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Design

**Nome piattaforma:** CIRIAF - COLAB/NEXTROOM COGNITIVE TESTING HUB
**Data:** 2026-07-06
**Stato:** Approvato in brainstorming
**Contesto:** Progetto ufficiale per sperimentazione in laboratorio (CIRIAF)

---

## 1. Obiettivo e contesto d'uso

Piattaforma web per la somministrazione di sei test cognitivi in ambiente di
laboratorio controllato. I soggetti sperimentali avviano i test **in autonomia**
dal PC del laboratorio: non esistono preset di sessione (le sessioni sperimentali
sono variabili), il soggetto sceglie dal menu il test indicato dallo sperimentatore.

- **Esecuzione anonima**: nessuna registrazione, nessun database. Ogni esecuzione
  genera un ID di sessione anonimo (es. `A7K2-1430`) mostrato a schermo e incluso
  negli export, per ricollegare la trascrizione manuale al file grezzo.
- **Restituzione risultati**: schermata riassuntiva leggibile (trascrizione a mano
  da parte dello sperimentatore) + export CSV/JSON con i dati grezzi trial-per-trial.
- **Deployment**: build statica pubblicata online (Netlify o equivalente). I test
  girano interamente nel browser; la rete serve solo al caricamento iniziale.
- **Lingua UI**: italiano. **Anche tutta la documentazione (inclusi i docs di
  spiegazione del codice e i documenti scientifici) è in italiano.**

### Test implementati

| Test | Dominio cognitivo |
|---|---|
| Stroop Task 1 (focus parola) | Velocità di elaborazione |
| Stroop Task 2 (focus colore) | Risoluzione del conflitto / interferenza |
| Go/No-Go | Inibizione motoria rapida |
| Corsi Block Task | Memoria visuo-spaziale di configurazione |
| N-Back (2-back) | Memoria di lavoro a flusso continuo |
| WCST | Flessibilità cognitiva / set-shifting |

### Fuori scope (esplicitamente)

- Database, backend, autenticazione, account.
- Analisi statistica in-app oltre alle metriche di sintesi per test.
- Somministrazione remota non supervisionata (progettata per il lab; funziona
  ovunque ma i requisiti sono calibrati sul laboratorio).
- Batterie/sequenze predefinite di test (le sessioni sono libere per scelta).

---

## 2. Architettura

**Stack:** Vite + React 18 + TypeScript (strict) + Tailwind CSS. Test unitari con
Vitest. Nessun backend.

**Principio: due strati separati.**

```
src/
  engine/                  # TypeScript puro — ZERO import da React
    clock.ts               # wrapper performance.now(), scheduler basato su rAF
    validation.ts          # filtri RT (anticipazione, omissione), SD dei corretti
    types.ts               # Trial, TrialResult, TestResult, flag di validazione
    export.ts              # builder CSV (separatore ';') e JSON
    session.ts             # generazione ID sessione anonimo
    tests/
      stroop.ts            # state machine + generatore sequenze Stroop 1 e 2
      gonogo.ts            # state machine + generatore stream 75/25
      corsi.ts             # state machine + generatore sequenze bilanciate
      nback.ts             # state machine + generatore stream 2-back
      wcst.ts              # state machine + mazzo WCST-64 + scoring Heaton
  ui/
    screens/               # Home, Istruzioni, Pratica, TestRunner, Risultati, Impostazioni
    components/            # componenti condivisi (stimoli, countdown, dialoghi)
  config/
    defaults.ts            # tutti i parametri default, ognuno commentato con fonte
```

- Il **motore** contiene timing, state machine dei test, generatori di sequenze,
  validazione e scoring: tutto unit-testabile senza browser.
- La **UI** React gestisce navigazione e schermate. Durante i trial il rendering
  degli stimoli è pilotato dal motore via `requestAnimationFrame`, senza re-render
  React nel percorso critico del timing.
- Il timestamp di onset dello stimolo è rilevato al frame di paint (callback rAF
  successiva al commit), le risposte via listener `keydown`/`pointerdown` globali
  con `performance.now()`.

### Design visivo (identità UI)

Estetica **universitaria, estremamente pulita e professionale**: sobria, silenziosa,
senza elementi decorativi che distraggano dal compito cognitivo (requisito
sperimentale, non solo estetico — durante i trial lo schermo è quasi vuoto).

- **Palette**:
  - sfondo **bianco** (`#FFFFFF`);
  - testo **nero** (`#111111` per il corpo, nero pieno per gli stimoli);
  - accenti **azzurrini** (`#4A90D9` primario, `#EAF2FB` per superfici tenui)
    usati solo per rifiniture: bordi attivi, hover, focus ring, header, pulsante
    primario. Mai come sfondo di ampie aree.
  - Colori funzionali riservati ai soli stimoli/feedback dei test (verde/rosso
    Go-No-Go, colori Stroop), tenuti fuori dalla palette di UI per non confondersi
    con gli stimoli.
- **Tipografia**: un solo carattere sans-serif pulito e istituzionale (Inter, o
  system-ui come fallback), gerarchia tramite peso e dimensione, ampio spazio
  bianco, testo allineato a sinistra e ben leggibile.
- **Layout**: griglia centrata con larghezza massima contenuta, molto respiro,
  bordi sottili e angoli lievemente arrotondati, ombre appena percettibili.
  Niente gradienti vistosi, niente animazioni gratuite (le uniche transizioni
  sono i cambi di stimolo richiesti dai test).
- **Header**: barra superiore sobria con il nome
  **"CIRIAF — COLAB/NEXTROOM COGNITIVE TESTING HUB"** e, se disponibile, il logo
  istituzionale. Durante i trial l'header sparisce (schermo dedicato allo stimolo).
- **Accessibilità**: contrasto AA garantito dalla palette nero-su-bianco, focus
  ring azzurrino sempre visibile, rispetto di `prefers-reduced-motion`.
- I **token di colore/tipografia** sono centralizzati (Tailwind theme + variabili
  CSS) così che un eventuale adeguamento al brand ufficiale CIRIAF sia un'unica
  modifica.

### Flusso utente

1. **Home**: intestazione con il nome della piattaforma, 6 card (una per test) +
   icona ingranaggio per Impostazioni.
2. Click test → **Istruzioni** (testo + schema visivo dei tasti) → **Pratica**
   con feedback "Corretto/Errato" ben visibile, **skippabile** con pulsante sempre
   presente → countdown 3-2-1 → **Test** (fullscreen richiesto all'avvio).
3. Fine → **Risultati** (metriche da trascrivere + ID sessione) → "Scarica CSV" /
   "Scarica JSON" → "Torna alla home".

I dati di pratica sono sempre esclusi dai risultati (ma presenti nell'export con
`fase = practice`).

---

## 3. Documentazione ufficiale e ancoraggio scientifico

Il progetto è un lavoro ufficiale: ogni scelta parametrica dev'essere tracciabile
a una fonte, e la documentazione evolve col codice. **Tutta la documentazione è
redatta in italiano** — sia i documenti scientifici sia i docs di spiegazione del
codice e dell'architettura; le sole citazioni bibliografiche restano nella lingua
originale della fonte.

### Struttura documentale

- `docs/scientific/{stroop,gonogo,corsi,nback,wcst}.md` — un documento per test
  con struttura fissa:
  1. Paradigma originale e citazione primaria;
  2. Meccanismo cognitivo misurato;
  3. **Tabella parametri**: parametro → valore adottato → fonte bibliografica;
  4. Mappatura implementativa (file/funzioni del motore per ogni regola);
  5. Metriche calcolate, con formule.
- `docs/scientific/bibliography.md` — bibliografia centrale in APA con DOI.
- `docs/architecture.md` — struttura del codice e meccanismi dei test.
- **Documentation gate**: ogni fase di implementazione si chiude solo dopo
  l'aggiornamento dei documenti pertinenti (docs periodici).
- JSDoc sulle funzioni del motore con rimando al doc scientifico
  (es. `@see docs/scientific/corsi.md — Kessels et al. 2000`).

### Fase di ricerca scientifica (prima del codice)

Scraping avanzato (firecrawl) di paper primari, review e manuali, più analisi
delle librerie scientifiche di riferimento (jsPsych, PsyToolkit, PEBL, PsychoPy)
per validare o correggere i default. Ancore preliminari:

| Test | Fonti primarie/di riferimento da verificare |
|---|---|
| Stroop | Stroop (1935); MacLeod (1991) review |
| Go/No-Go | Letteratura su paradigmi Go/No-Go e inibizione (es. Verbruggen & Logan 2008) |
| Corsi | Corsi (1972); Kessels et al. (2000) standardizzazione, coordinate 9 blocchi |
| N-Back | Kirchner (1958); Jaeggi et al. per target rate e lure |
| WCST | Berg (1948); Grant & Berg (1948); Heaton (manuale); Kongs et al. (WCST-64) |
| Trattamento RT | Whelan (2008) e convenzioni su cutoff 150 ms |

Ogni valore in `config/defaults.ts` ha un commento con la fonte. Se la ricerca
contraddice un default di questa spec, vince la letteratura e il doc scientifico
registra la decisione.

---

## 4. Design dei test

Tutti i parametri seguenti sono **default regolabili** dal pannello Impostazioni.

### 4.1 Stroop Task 1 e 2

- **Stimoli**: parole ROSSO, VERDE, BLU, GIALLO in colore congruente o incongruente.
  Tasti di risposta `R`, `V`, `B`, `G` (iniziali distinte in italiano).
- **Stroop 1 (focus parola)**: rispondere all'iniziale della parola letta,
  ignorando il colore. **Stroop 2 (focus colore)**: rispondere all'iniziale del
  colore visivo, ignorando la parola.
- **Trial**: 48 per variante — 24 congruenti, 24 incongruenti, ordine randomizzato
  con vincolo di max 3 ripetizioni consecutive dello stesso colore o parola.
- **Timeline trial**: croce di fissazione 500 ms → stimolo fino a risposta o
  timeout 3000 ms (→ omissione) → intervallo 500 ms.
- **Pratica**: 8 trial con feedback.
- **Metriche**: accuratezza, RT medio e SD dei corretti validi (per condizione
  congruente/incongruente), effetto interferenza (RT incongruenti − congruenti),
  conteggio anticipazioni e omissioni.

### 4.2 Go/No-Go

- **Stimoli**: cerchio verde = Go (75%), cerchio rosso = No-Go (25%).
- **Trial**: 80 (60 Go / 20 No-Go esatti), sequenza pseudo-random con vincolo
  anti-cluster (mai più di 2 No-Go consecutivi).
- **Timeline trial**: stimolo a schermo 800 ms fissi (finestra di risposta) →
  ISI vuoto casuale uniforme 500–1000 ms.
- **Risposta**: barra spaziatrice. La finestra di risposta coincide con gli
  800 ms dello stimolo: pressioni durante l'ISI vengono ignorate (il trial è
  già classificato alla chiusura della finestra).
- **Pratica**: 10 trial con feedback.
- **Metriche**: errori di commissione (risposta su No-Go — misura chiave
  dell'inibizione), omissioni su Go, RT medio e SD dei Go corretti validi,
  anticipazioni.

### 4.3 Corsi Block Task

- **Layout**: 9 blocchi in posizione **fissa e asimmetrica** (coordinate standard
  digitalizzate da Kessels et al. 2000, verificate in fase di ricerca). Il layout
  non cambia mai.
- **Presentazione**: sequenza di blocchi illuminati, 1000 ms per blocco; poi il
  soggetto riproduce la sequenza cliccando i blocchi.
- **Generazione sequenze**: per ogni lunghezza 3–9 il motore dispone di un pool
  di sequenze pre-generate **bilanciate per indice di complessità**: distanza
  euclidea totale del percorso entro una tolleranza fissata e stesso numero di
  incroci geometrici del percorso. Le sequenze cambiano a ogni trial, la
  complessità no. Il generatore è unit-testato su queste proprietà.
- **Regola di arresto**: si parte da lunghezza 3; 2 trial diversi per livello;
  se entrambi i trial dello stesso livello falliscono il test si interrompe
  immediatamente. Lunghezza massima 9.
- **Punteggio (span)**: 0.5 punti per ogni trial corretto; punteggio finale =
  somma cumulativa.
- **Pratica**: 2 trial a lunghezza 2 con feedback.
- **Metriche**: punteggio totale, livello massimo raggiunto, esito per trial.

### 4.4 N-Back (variante 2-back)

- **Stimoli**: consonanti (vocali escluse per limitare strategie fonologiche),
  una alla volta: 500 ms lettera + 1500 ms schermo vuoto (2 s per trial).
- **Regola**: barra spaziatrice se e solo se la lettera corrente è identica a
  quella di due posizioni prima. Nessuna risposta sui non-target.
- **Generazione stream**: target rate ~30%, con controllo dei lure (ripetizioni
  1-back e 3-back accidentali evitate o bilanciate).
- **Durata**: blocco continuo default **12 minuti (360 trial)**, configurabile
  (il protocollo richiede blocchi di almeno 10–15 minuti per valutare la tenuta
  della traccia mnestica).
- **Pratica**: 20 trial (~40 s) con feedback.
- **Metriche**: hit, omissioni sui target, falsi allarmi sui non-target, d′
  (sensibilità), RT medio e SD dei hit validi, e **analisi per quartili temporali
  del blocco** (accuratezza, d′ e RT per quartile) per misurare la stabilità
  della performance nel tempo.

### 4.5 Wisconsin Card Sorting Test (WCST)

- **Materiale**: 4 carte stimolo fisse (1 triangolo rosso, 2 stelle verdi,
  3 croci gialle, 4 cerchi blu); mazzo di risposta standard WCST-64
  (configurabile a 128).
- **Logica**: il soggetto abbina la carta bersaglio a una delle 4 carte stimolo.
  Criterio segreto: Colore → Forma → Numero → ciclo. Il sistema dà solo feedback
  "Corretto"/"Errato" (~1 s). Dopo **10 risposte corrette consecutive**
  (configurabile) il criterio cambia automaticamente e silenziosamente.
- **Fine test**: esaurimento del mazzo o completamento di 6 categorie
  (configurabile).
- **Pratica**: nessuna pratica vera (il test è apprendimento della regola);
  solo familiarizzazione col gesto di abbinamento su 3 carte neutre.
- **Metriche (scoring Heaton)**: categorie completate, trial totali, errori
  totali, **errori perseverativi** (risposte coerenti col criterio precedente),
  errori non perseverativi, failure to maintain set (errore dopo 5–9 corrette
  consecutive), RT decisionale medio.

---

## 5. Validazione automatica dei dati

Implementata in `engine/validation.ts`, applicata uniformemente prima del calcolo
delle metriche di ogni test con RT:

1. **Filtro di anticipazione**: RT < 150 ms → trial marcato `ANTICIPATION`
   ("Errore di Anticipazione"), escluso dalle medie.
2. **Filtro di omissione**: finestra temporale chiusa senza risposta → trial
   marcato `OMISSION` ("Errore di Omissione"), mai valore nullo o infinito.
3. **Varianza intrasoggetto**: deviazione standard degli RT delle **sole risposte
   corrette e valide**, per test (e per quartile nel 2-back).

I trial invalidati **non vengono mai scartati dai dati grezzi**: restano in
CSV/JSON col loro flag, così i criteri di pulizia restano rivedibili a posteriori.

Flag di validazione: `VALID | ANTICIPATION | OMISSION | INTERRUPTED`.

---

## 6. Pannello Impostazioni

- Raggiungibile dall'icona ingranaggio nella Home; una sezione per test.
- Ogni parametro mostra: valore corrente, default, unità di misura.
- "Ripristina default" per singolo test e globale.
- Persistenza in `localStorage`.
- **I parametri effettivamente usati sono scritti dentro ogni file esportato**:
  un risultato resta interpretabile anche se le impostazioni cambiano nel tempo.

---

## 7. Export dati

Per ogni esecuzione, due formati scaricabili dalla schermata Risultati:

- **CSV** (separatore `;` per Excel italiano): una riga per trial —
  `test; session_id; trial_index; fase; condizione; stimolo; risposta; corretto;
  rt_ms; flag_validazione; timestamp_onset`.
- **JSON**: parametri usati, versione app, user agent, data/ora, tutti i trial
  (pratica inclusa, marcata), summary con le metriche calcolate.
- Nome file: `{test}_{sessionId}_{data-ora}.{csv|json}`.

---

## 8. Casi limite e gestione errori

- **Fullscreen** richiesto all'avvio del test; uscita dal fullscreen → avviso.
- **Perdita di focus/visibilità** (`visibilitychange`, `blur`) durante un trial →
  trial marcato `INTERRUPTED`.
- **ESC** durante il test → dialogo di conferma abbandono, con possibilità di
  esportare i dati parziali raccolti.
- Tasti in **auto-repeat** ignorati; una sola risposta accettata per trial.
- La pratica è sempre esclusa dalle metriche.

---

## 9. Testing

- **Unit test (Vitest) sul motore**, priorità alta:
  - generatori: rapporto Go/No-Go 75/25 esatto e vincolo anti-cluster; target
    rate 2-back e controllo lure; bilanciamento complessità sequenze Corsi
    (distanza ± tolleranza, numero incroci); ciclo criteri WCST;
  - scoring: errori perseverativi WCST, span Corsi (0.5/trial, regola di
    arresto), d′, effetto interferenza Stroop;
  - validazione: casi al limite RT = 149/150/151 ms, omissioni, SD sui soli
    corretti validi.
- **Component test** leggeri sui flussi di schermata (istruzioni → pratica →
  test → risultati; skip pratica; abort con ESC).
- **Verifica manuale del timing** con strumenti browser (frame timing) prima
  del rilascio.

---

## 10. Riferimenti preliminari

Da verificare ed estendere nella fase di ricerca scientifica (§3):

- Stroop, J. R. (1935). Studies of interference in serial verbal reactions. *JEP*.
- MacLeod, C. M. (1991). Half a century of research on the Stroop effect. *Psych. Bulletin*.
- Corsi, P. M. (1972). *Human memory and the medial temporal region of the brain*.
- Kessels, R. P. C., et al. (2000). The Corsi Block-Tapping Task: standardization
  and normative data. *Applied Neuropsychology*.
- Kirchner, W. K. (1958). Age differences in short-term retention of rapidly
  changing information. *JEP*.
- Berg, E. A. (1948). A simple objective technique for measuring flexibility in
  thinking. *J. Gen. Psychol.*
- Grant, D. A., & Berg, E. A. (1948). A behavioral analysis of degree of
  reinforcement and ease of shifting to new responses in a Weigl-type
  card-sorting problem. *JEP*.
- Kongs, S. K., et al. (2000). *WCST-64: Wisconsin Card Sorting Test-64 Card Version*.
- Verbruggen, F., & Logan, G. D. (2008). Automatic and controlled response
  inhibition. *JEP: General*.
- Whelan, R. (2008). Effective analysis of reaction time data. *The Psychological Record*.
