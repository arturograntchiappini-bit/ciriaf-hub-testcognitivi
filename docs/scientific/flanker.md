# Flanker Task (Eriksen) — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **Flanker Task** sulla piattaforma Sintropia.
> Costrutto misurato: **attenzione selettiva e controllo dell'interferenza da distrattori**.
> Testo in italiano; citazioni in lingua originale. Tutti i DOI qui elencati sono stati **verificati su Crossref**
> (data di verifica: 2026-10-23).

---

## 1. Paradigma e citazione primaria

Il partecipante risponde alla **direzione di un bersaglio centrale** (qui una freccia) circondato da **distrattori
laterali** (*flanker*) che il compito chiede di ignorare. Se i flanker sono associati alla risposta opposta
(**incongruenti**) i tempi di reazione aumentano e gli errori crescono rispetto ai flanker che suggeriscono la stessa
risposta (**congruenti**). Questa differenza è l'**effetto flanker**.

> Eriksen, B. A., & Eriksen, C. W. (1974). *Effects of noise letters upon the identification of a target letter in a
> nonsearch task.* **Perception & Psychophysics, 16**(1), 143–149. https://doi.org/10.3758/BF03203267

Nel lavoro originale i partecipanti davano una risposta sinistra/destra a una lettera bersaglio in un breve display; i
tempi erano più lunghi quando le lettere laterali richiedevano la risposta opposta e miglioravano all'aumentare della
distanza dal bersaglio.

**Riferimenti di supporto**

> Eriksen, C. W. (1995). *The flankers task and response competition: A useful tool for investigating a variety of
> cognitive problems.* **Visual Cognition, 2**(2–3), 101–118. https://doi.org/10.1080/13506289508401726

> Gratton, G., Coles, M. G. H., & Donchin, E. (1992). *Optimizing the use of information: Strategic control of
> activation of responses.* **Journal of Experimental Psychology: General, 121**(4), 480–506.
> https://doi.org/10.1037/0096-3445.121.4.480

> Fan, J., McCandliss, B. D., Sommer, T., Raz, A., & Posner, M. I. (2002). *Testing the efficiency and independence of
> attentional networks.* **Journal of Cognitive Neuroscience, 14**(3), 340–347.
> https://doi.org/10.1162/089892902317361886

---

## 2. Meccanismo cognitivo misurato

- **Competizione di risposta.** I flanker incongruenti attivano la risposta sbagliata in parallelo a quella del
  bersaglio; il sistema deve risolvere il conflitto prima di rispondere (C. W. Eriksen, 1995). Il costo si manifesta come
  RT più lunghi e più errori.
- **Interferenza e facilitazione.** Aggiungendo una condizione **neutra** (nessun distrattore informativo) il costo si
  separa in *interferenza* (incongruente − neutro) e *facilitazione* (neutro − congruente): la prima misura quanto
  disturba il distrattore in conflitto, la seconda quanto aiuta il distrattore concorde.
- **Adattamento al conflitto.** Gratton, Coles e Donchin (1992) mostrano che l'effetto flanker è **minore dopo un trial
  incongruente** che dopo uno congruente: il sistema regola dinamicamente il controllo attentivo.
- **Rete esecutiva.** Il compito con frecce è la componente "esecutiva" dell'Attention Network Test (Fan et al., 2002).

Differenza rispetto allo Stroop (già presente): nello Stroop il conflitto è tra due **dimensioni dello stesso stimolo**
(parola/colore); nel Flanker è tra **bersaglio e oggetti spazialmente separati**. I due compiti non sono intercambiabili:
misurano forme diverse di conflitto.

---

## 3. Parametri implementati e loro origine

| Parametro | Default | Origine |
|---|---|---|
| Stimolo | 5 elementi: freccia centrale + 2 + 2 flanker | Convenzione del compito con frecce (Fan et al., 2002) |
| Condizioni | congruente, incongruente, neutra (trattini) | Eriksen & Eriksen (1974); neutro per separare interferenza/facilitazione |
| Trial | 96 (39 congruenti, 38 incongruenti, 19 neutri) | **Scelta di progetto**: numero sufficiente per stimare effetto e adattamento |
| Proporzioni | 40% incongruenti, 20% neutri | **Scelta di progetto** |
| Bilanciamento | direzione sinistra/destra bilanciata in ogni condizione | Prassi per evitare bias di risposta |
| Run massimi | ≤ 3 trial consecutivi con stessa condizione o stessa risposta | **Scelta di progetto** (evita attesa ritmica). Costruzione passo per passo con fino a 300 tentativi; se falliscono tutti si usa un rimescolamento senza vincolo, quindi il limite non è garantito in assoluto |
| Fissazione | 500 ms | Convenzione jsPsych/PsyToolkit |
| Finestra di risposta | 1500 ms (stimolo fino a risposta) | **Scelta di progetto**; oltre = omissione |
| ISI | 700–1100 ms uniforme | **Scelta di progetto** (jitter anti-anticipazione) |
| Pratica | 12 trial con feedback, esclusi dalle metriche | Prassi |

Nota onesta: la letteratura usa durate e numeri di trial diversi (stimolo breve o fino a risposta, centinaia di
trial); i valori sopra sono **regolabili** dal pannello Impostazioni e scritti in ogni file esportato. Per confronti con
dati normativi pubblicati vanno allineati ai parametri di quello studio.

---

## 4. Metriche calcolate

Solo trial di **test** (la pratica è esclusa); gli RT usano solo trial `VALID` e corretti.

| Metrica | Formula |
|---|---|
| RT medio per condizione | media degli RT validi e corretti |
| **Effetto flanker** | RT(incongruenti) − RT(congruenti) |
| Interferenza | RT(incongruenti) − RT(neutri) |
| Facilitazione | RT(neutri) − RT(congruenti) |
| Accuratezza per condizione | corretti / trial non interrotti (omissioni = errori) |
| Costo in accuratezza | Acc(congruenti) − Acc(incongruenti), in punti percentuali |
| **Adattamento al conflitto (Gratton)** | (cI − cC) − (iI − iC) |
| SD degli RT | deviazione standard campionaria (n−1) |

Nell'adattamento, la prima lettera indica la congruenza del trial **precedente** (c/i) e la seconda quella del trial
**corrente** (C/I). Si considerano solo coppie di trial consecutivi, con trial precedente corretto e corrente valido e
corretto, escludendo i neutri. Se una delle quattro celle è vuota la metrica è `—`. Con pochi trial per cella la stima è
instabile: va letta come indicativa.

---

## 5. Validazione dei dati

Si applica la validazione comune (`docs/scientific/validazione-rt.md`): `INTERRUPTED → OMISSION → ANTICIPATION → VALID`,
con soglia di anticipazione a 150 ms. I trial invalidi restano nei dati grezzi col flag.

---

## 6. Limiti e cautele

- La precisione di misura degli RT in browser dipende da tastiera e schermo (vedi `validazione-rt.md`): l'effetto flanker
  (decine di ms) è misurabile, ma i valori assoluti non sono confrontabili con laboratori a hardware dedicato senza
  calibrazione.
- L'effetto dipende da dimensione, spaziatura e durata dello stimolo; la piattaforma non garantisce l'angolo visivo,
  che dipende da distanza e schermo del partecipante.
- Differenze individuali e pratica influenzano l'effetto; confrontare gruppi richiede stesso hardware e parametri.
- L'uso del test in studi su ambiente fisico (comfort termico, acustico, qualità dell'aria) è una scelta del
  ricercatore: la sensibilità del paradigma a quelle manipolazioni va giustificata con fonti specifiche dello studio.
