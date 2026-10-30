# Stroop Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del test di Stroop
> sulla piattaforma sperimentale Sintropia. Le citazioni bibliografiche sono
> riportate in lingua originale; il testo esplicativo è in italiano.

---

## 1. Paradigma e citazione primaria

Il **test di Stroop** (o *Color-Word Interference Task*) è uno dei paradigmi
più longevi e replicati della psicologia cognitiva sperimentale. Nella sua
forma classica, al partecipante viene presentata una parola-colore (es.
"ROSSO") stampata in un inchiostro colorato, e il compito richiede di
**nominare il colore dell'inchiostro ignorando il significato della parola**.
Quando parola e colore coincidono la prova è **congruente** (es. "ROSSO" in
rosso); quando divergono la prova è **incongruente** (es. "ROSSO" in blu).
La differenza sistematica di prestazione tra le due condizioni costituisce
l'**effetto Stroop**.

Il paradigma nasce dal lavoro seminale di John Ridley Stroop, che dimostrò
per la prima volta il rallentamento nella denominazione dei colori in presenza
di parole-colore incongruenti:

> **Stroop, J. R. (1935).** *Studies of interference in serial verbal
> reactions.* Journal of Experimental Psychology, 18(6), 643–662.
> https://doi.org/10.1037/h0054651

La sintesi integrativa di riferimento — che organizza oltre 50 anni e circa 400 studi
e isola 18 risultati empirici affidabili che ogni teoria dell'effetto Stroop deve
spiegare (abstract e Appendice B, verificati sul testo dell'articolo) — è:

> **MacLeod, C. M. (1991).** *Half a century of research on the Stroop
> effect: An integrative review.* Psychological Bulletin, 109(2), 163–203.
> https://doi.org/10.1037/0033-2909.109.2.163

Nell'abstract MacLeod giudica insufficienti («found to be wanting») le due principali
teorie candidate, la *velocità relativa di elaborazione* e l'*automaticità della lettura*,
e indica come più promettenti le teorie che pongono l'elaborazione **in parallelo** della
dimensione rilevante e di quella irrilevante (la rassegna discute in particolare un
modello connessionista a elaborazione distribuita in parallelo, che non è stato
consultato per questo documento).

Il presente documento adotta la **variante manuale a scelta forzata** (button
press) anziché la denominazione verbale: questa versione, diffusa nelle
implementazioni computerizzate (jsPsych, PsyToolkit), consente la misura
precisa dei tempi di reazione ed è coerente con l'infrastruttura della
piattaforma. Secondo MacLeod (1991, risultato 13 dell'Appendice B) passare dalla risposta orale a quella manuale
**riduce** l'interferenza, che però resta significativa; la compatibilità stimolo-risposta conta. Gli effetti misurati
qui vanno quindi confrontati solo con altri dati a risposta manuale. Vengono somministrate due varianti complementari
del compito:

- **Focus colore** (compito canonico): rispondere al **colore dell'inchiostro**,
  ignorando la parola. È la condizione in cui l'effetto di interferenza è
  massimo e più affidabile.
- **Focus parola**: rispondere al **significato della parola**, ignorando il
  colore dell'inchiostro. In questa direzione l'interferenza del colore sulla
  lettura della parola è di norma molto minore — **asimmetria** documentata da
  MacLeod (1991). Un effetto Stroop inverso è comunque possibile (risultato 11
  dell'Appendice B) e, secondo MacLeod, non si spiega semplicemente con la velocità
  relativa delle due dimensioni. La spiegazione classica dell'asimmetria con la
  maggiore automaticità della lettura è una delle teorie che la rassegna giudica
  insufficienti. Il confronto tra le due varianti rende esplicita l'asimmetria.

---

## 2. Meccanismo cognitivo misurato

Il test di Stroop misura due processi distinti ma correlati:

1. **Velocità di elaborazione (processing speed).** Il tempo di reazione medio,
   in particolare nella condizione congruente e neutra, indicizza la rapidità
   di base di lettura/denominazione e di selezione della risposta manuale.

2. **Risoluzione del conflitto / controllo inibitorio (interference control).**
   Il nucleo teorico del paradigma. Secondo la spiegazione classica dell'*automaticità*
   (LaBerge e Samuels, Posner e Snyder, Shiffrin e Schneider, Logan, come riassunti da
   MacLeod, 1991), la lettura della parola è un processo altamente automatico e
   difficilmente sopprimibile, mentre la denominazione del colore richiede più
   attenzione. MacLeod (1991) giudica questa spiegazione, da sola, insufficiente e
   preferisce i modelli a elaborazione parallela; la descrizione che segue in termini di
   risposte in competizione è compatibile con entrambe le letture. Nelle prove incongruenti le due dimensioni attivano
   risposte in competizione: il sistema di controllo esecutivo deve **inibire
   la risposta prepotente** (leggere la parola) a favore della risposta
   rilevante per il compito (nominare il colore). Il costo di questa
   risoluzione del conflitto si manifesta come **maggiore latenza e/o maggior
   tasso di errore** nelle prove incongruenti rispetto alle congruenti.

L'indice comportamentale di questo meccanismo è l'**effetto di interferenza**
(RT medio incongruenti − RT medio congruenti): un valore positivo elevato
riflette una risoluzione del conflitto più costosa (minore efficienza del
controllo inibitorio). L'asimmetria tra la variante *focus colore* (interferenza
ampia) e *focus parola* (interferenza attesa molto minore) fornisce un controllo interno
della procedura.

---

## 3. Parametri adottati

I valori si riferiscono a **ciascuna variante** (focus colore e focus parola). La colonna *Origine* distingue ciò che
viene da una fonte primaria, ciò che è prassi diffusa nei software di riferimento (jsPsych, PsyToolkit: **non
riverificata** nelle loro versioni correnti) e ciò che è una **scelta di progetto**.

| Parametro | Valore | Origine e razionale |
|---|---|---|
| **N. trial per variante** | **48** (24 congruenti + 24 incongruenti) | **Scelta di progetto**: stima di screening dell'effetto Stroop in tempi contenuti. L'affidabilità di una differenza tra condizioni cresce col numero di prove: per misure individuali stabili (confronti clinici, test-retest) conviene aumentare i trial per condizione dal pannello Impostazioni. |
| **Proporzione congruenti / incongruenti** | **50% / 50%** | **Scelta di progetto**, tenuta **costante** fra somministrazioni e partecipanti. La proporzione conta: secondo MacLeod (1991, risultato 7) la presenza di prove congruenti induce a dividere l'attenzione fra le due dimensioni e **aumenta** l'interferenza sulle incongruenti; la rassegna riporta, per Lowe e Mitterer, un'interferenza (rispetto al controllo neutro) da 35 ms con 0% di congruenti a 66 ms con 75%. Un disegno 50/50 non è quindi «neutro»: ci si attende un'interferenza maggiore che in un disegno senza prove congruenti, e i valori sono confrontabili solo con studi alla stessa proporzione. |
| **Fissazione** | **500 ms** | **Prassi** dei software di riferimento: orienta l'attenzione al centro prima dello stimolo. |
| **Timeout di risposta** | **3000 ms** | **Scelta di progetto**: finestra ampia, che include le risposte lente sotto interferenza. Oltre = omissione. |
| **ISI** | **500 ms, costante** | **Scelta di progetto con vincolo di fonte.** Galer et al. (2014) hanno variato l'intervallo risposta-stimolo da 1000 a 5000 ms in bambini (8–10 anni) e adulti: l'intervallo più breve (1000 ms, nell'esperimento a intervalli fissi 1000/1500/3000 ms) ha prodotto l'interferenza maggiore in entrambi i gruppi; nell'esperimento a intervalli variabili (2000–5000 ms) l'effetto dell'intervallo non è risultato significativo. In Sintropia l'intervallo risposta-stimolo è ISI (500 ms) + fissazione (500 ms) = **1000 ms** nel test (si aggiunge la durata del feedback in pratica, e nel test se l'opzione «feedback durante il test», disattivata per default, è attiva): coincide con il livello più breve di Galer et al., quello con l'interferenza maggiore, ed è più breve dei protocolli con intervalli lunghi. Va tenuto **costante** tra trial e partecipanti, così l'effetto è comparabile. |
| **Pratica** | **8 trial con feedback** | **Prassi**. Serve a imparare la mappatura tasto-colore; i trial di pratica sono esclusi dalle metriche. |
| **Colori e parole** | **ROSSO, VERDE, BLU, GIALLO** | **Scelta di progetto**: set a 4 colori comune nelle versioni computerizzate (la diffusione non è stata quantificata su una fonte). Nelle prove incongruenti la parola è uno degli altri 3 colori, quindi le parole irrilevanti appartengono all'insieme delle risposte possibili: secondo MacLeod (1991, risultato 14) questo produce più interferenza che con insiemi non sovrapposti. |
| **Tasti** | **R, V, B, G** (iniziali italiane) | **Scelta di progetto**: le quattro iniziali sono univoche. Una legenda tasto-colore resta visibile e si impara in pratica. |
| **Anti-ripetizione** | **≤ 3 ripetizioni consecutive** dello stesso colore o della stessa parola | **Scelta di progetto**: evita sequenze prevedibili. |

**Cautela sui colori.** Rosso e verde sono confondibili per chi ha una deficienza della visione dei colori rosso-verde;
in quel caso il compito misura anche la discriminazione cromatica e va adattato o escluso.

---

## 4. Mappatura implementativa

Corrispondenza fra §3 e il codice (`src/engine/tests/stroop.ts`, `src/config/defaults.ts`, `src/ui/tests/StroopView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Varianti | `correctKeyStroop` | Stroop 1: tasto della **parola**; Stroop 2: tasto del **colore** d'inchiostro |
| Parametri | `DEFAULTS.stroop1` / `stroop2` | Identici: `nTrials 48`, `fixationMs 500`, `timeoutMs 3000`, `isiMs 500`, `practiceTrials 8` |
| Congruenti | `generateStroop` | `floor(nTrials/2)` trial, colori ciclati: con 48 trial, 6 per colore |
| Incongruenti | `generateStroop` | Le 12 coppie parola≠colore ripetute in ciclo: con 48 trial ogni coppia compare 2 volte, ogni parola e ogni colore 6 volte |
| Bilanciamento | `generateStroop` | **Perfetto solo se** `floor(nTrials/2)` è multiplo di 12 (cioè `nTrials` multiplo di 24); altrimenti le prime coppie del ciclo compaiono una volta in più |
| Ordine | `generateStroop` | Rimescolamento con seme; se entro 200 tentativi non soddisfa il vincolo di run (≤ 3 colore o parola uguali di seguito) si usa l'ultimo rimescolamento, quindi il vincolo è **probabile, non garantito** con valori estremi |
| Ripetizioni esatte | — | Non vietate: lo stesso stimolo (stessa parola e stesso colore) può comparire due volte di fila |
| Classificazione RT | `classifyRt` | `INTERRUPTED → OMISSION → ANTICIPATION (< 150 ms) → VALID` ([validazione RT](validazione-rt.md)) |
| Metriche | `scoreStroop` | Solo trial `phase = 'test'`; formule in §5 |

---

## 5. Metriche calcolate e formule

Le metriche sono calcolate **per condizione** (congruente, incongruente) e per variante (ogni variante è un test
separato). Le prove di pratica sono escluse. La classificazione dei trial segue la validazione comune a tutta la
piattaforma ([validazione RT](validazione-rt.md)): anticipazione se $RT < 150\,\text{ms}$, omissione se non c'è
risposta entro il timeout di 3000 ms, trial interrotto se la pagina perde il focus.

Definizioni operative per la condizione $c$:
- **Corretto valido**: tasto corretto, flag `VALID` ($150\,\text{ms} \le RT \le 3000\,\text{ms}$). Solo questi trial
  entrano negli RT.
- **Errore**: tasto sbagliato (commissione) oppure nessuna risposta (omissione).

### 5.1 Accuratezza per condizione

$$\text{Accuratezza}_c = \frac{N^{\text{corretti}}_c}{N^{\text{non interrotti}}_c} \times 100$$

Il denominatore comprende **tutti i trial non interrotti** della condizione: le omissioni contano quindi come
errori. Un tasto corretto premuto in anticipo ($RT < 150$ ms) conta come corretto per l'accuratezza ma non entra negli
RT. Il **costo in accuratezza** è $\text{Acc}_{\text{congruenti}} - \text{Acc}_{\text{incongruenti}}$, in punti percentuali.

### 5.2 Tempo di reazione medio dei corretti validi

$$\overline{RT}_c = \frac{1}{N^{\text{validi}}_c} \sum_{i=1}^{N^{\text{validi}}_c} RT_i$$

### 5.3 Deviazione standard e coefficiente di variazione

$$SD_c = \sqrt{\frac{1}{N^{\text{validi}}_c - 1} \sum_{i=1}^{N^{\text{validi}}_c} \left(RT_i - \overline{RT}_c\right)^2}
\qquad CV_c = 100 \cdot \frac{SD_c}{\overline{RT}_c}$$

La SD è campionaria (denominatore $N-1$); il CV normalizza la variabilità sulla velocità media.

### 5.4 Effetto di interferenza (effetto Stroop)

$$\text{Interferenza} = \overline{RT}_{\text{incongruenti}} - \overline{RT}_{\text{congruenti}}$$

Un valore **positivo** indica il costo del conflitto: più è alto, più costosa è la risoluzione del conflitto
(MacLeod, 1991). Nella variante *focus parola* ci si attende un valore molto minore, per l'asimmetria dell'effetto; un
valore positivo non è però un'anomalia, perché un effetto Stroop inverso è possibile (MacLeod, 1991, risultato 11).

### 5.5 Conteggi di qualità dei dati

Si riportano il numero totale di **anticipazioni** ($RT < 150$ ms) e di **omissioni** nei trial di test. Molte
anticipazioni indicano risposte impulsive, molte omissioni disattenzione, affaticamento o una finestra troppo
stretta. Il dettaglio per condizione è nei dati grezzi (CSV/JSON, una riga per trial con condizione e flag).

---

## Riferimenti bibliografici

- Stroop, J. R. (1935). *Studies of interference in serial verbal reactions.*
  **Journal of Experimental Psychology, 18**(6), 643–662.
  https://doi.org/10.1037/h0054651
- MacLeod, C. M. (1991). *Half a century of research on the Stroop effect: An
  integrative review.* **Psychological Bulletin, 109**(2), 163–203.
  https://doi.org/10.1037/0033-2909.109.2.163
- Galer, S., Schmitz, R., Leproult, R., De Tiège, X., Van Bogaert, P., &
  Peigneux, P. (2014). *Response-stimulus interval duration modulates
  interference effects in the Stroop task.* **Psychologica Belgica, 54**(1),
  97–110. https://doi.org/10.5334/pb.ad
- de Leeuw, J. R. (2015). *jsPsych: A JavaScript library for creating
  behavioral experiments in a Web browser.* **Behavior Research Methods,
  47**(1), 1–12. https://doi.org/10.3758/s13428-014-0458-y
- Stoet, G. (2017). *PsyToolkit: A novel web-based method for running online
  questionnaires and reaction-time experiments.* **Teaching of Psychology,
  44**(1), 24–31. https://doi.org/10.1177/0098628316677643
- Stoet, G. (2010). *PsyToolkit: A software package for programming
  psychological experiments using Linux.* **Behavior Research Methods, 42**(4),
  1096–1104. https://doi.org/10.3758/BRM.42.4.1096

## Cronologia delle revisioni

- **Revisione scientifica 2026-10.** Verificati su Crossref tutti i riferimenti. Il paper non attribuisce più a
  jsPsych/PsyToolkit valori non riverificati e non attribuisce a MacLeod (1991) raccomandazioni sul numero di trial.
  Soglia di anticipazione allineata a 150 ms; definizione di accuratezza allineata al codice (omissioni = errori,
  interrotti esclusi); aggiunto il **costo in accuratezza**; documentata la condizione di bilanciamento perfetto
  (`nTrials` multiplo di 24) e la discussione dell'ISI alla luce di Galer et al. (2014).
- **Coefficiente di variazione.** Aggiunto il CV del RT per condizione (`SD/media · 100`).
- **2026-10-30.** Corretto il confronto con Galer et al. (2014): si confrontava l'ISI (500 ms) con l'intervallo
  risposta-stimolo dello studio, mentre in Sintropia quest'ultimo è ISI + fissazione = 1000 ms. Rimossa la cifra
  «oltre 400 studi» attribuita a MacLeod (1991), non verificata sul testo.
- **2026-10-30 (verifica sul testo di MacLeod, 1991).** Letto il testo completo della rassegna (copia del laboratorio
  dell'autore, estratta in testo): confermati i «circa 400 studi» in oltre 50 anni e i 18 risultati (Appendice B).
  Corretta un'attribuzione errata: MacLeod non sostiene il modello dell'automaticità, lo giudica insufficiente insieme a
  quello della velocità relativa. Corretta la riga sulla proporzione di congruenti: secondo il risultato 7 le prove
  congruenti **aumentano** l'interferenza (Lowe e Mitterer: da 35 a 66 ms passando da 0% a 75% di congruenti), quindi il
  50/50 non è neutro. Aggiunti i risultati 11 (Stroop inverso possibile), 13 (risposta manuale: interferenza ridotta ma
  significativa) e 14 (sovrapposizione fra parole e risposte). Galer et al. (2014) riverificati sulla pagina dell'editore.
