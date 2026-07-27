# Stroop Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del test di Stroop
> sulla piattaforma sperimentale CIRIAF. Le citazioni bibliografiche sono
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

La sintesi integrativa di riferimento — che consolida oltre 400 studi e isola
18 risultati empirici robusti che ogni teoria dell'effetto Stroop deve
spiegare — è:

> **MacLeod, C. M. (1991).** *Half a century of research on the Stroop
> effect: An integrative review.* Psychological Bulletin, 109(2), 163–203.
> https://doi.org/10.1037/0033-2909.109.2.163

Il presente documento adotta la **variante manuale a scelta forzata** (button
press) anziché la denominazione verbale: questa versione, oggi standard nelle
implementazioni computerizzate (jsPsych, PsyToolkit), consente la misura
precisa dei tempi di reazione ed è coerente con l'infrastruttura della
piattaforma. Vengono somministrate due varianti complementari del compito:

- **Focus colore** (compito canonico): rispondere al **colore dell'inchiostro**,
  ignorando la parola. È la condizione in cui l'effetto di interferenza è
  massimo e più affidabile.
- **Focus parola**: rispondere al **significato della parola**, ignorando il
  colore dell'inchiostro. In questa direzione l'interferenza del colore sulla
  lettura della parola è marcatamente ridotta o assente — **asimmetria**
  documentata da MacLeod (1991) e riconducibile alla maggiore automaticità
  della lettura rispetto alla denominazione dei colori. Il confronto tra le due
  varianti rende esplicita tale asimmetria.

---

## 2. Meccanismo cognitivo misurato

Il test di Stroop misura due processi distinti ma correlati:

1. **Velocità di elaborazione (processing speed).** Il tempo di reazione medio,
   in particolare nella condizione congruente e neutra, indicizza la rapidità
   di base di lettura/denominazione e di selezione della risposta manuale.

2. **Risoluzione del conflitto / controllo inibitorio (interference control).**
   Il nucleo teorico del paradigma. Secondo il modello dell'*automaticità
   relativa* (MacLeod, 1991), la lettura della parola è un processo altamente
   automatico e difficilmente sopprimibile, mentre la denominazione del colore
   è più controllata. Nelle prove incongruenti le due dimensioni attivano
   risposte in competizione: il sistema di controllo esecutivo deve **inibire
   la risposta prepotente** (leggere la parola) a favore della risposta
   rilevante per il compito (nominare il colore). Il costo di questa
   risoluzione del conflitto si manifesta come **maggiore latenza e/o maggior
   tasso di errore** nelle prove incongruenti rispetto alle congruenti.

L'indice comportamentale di questo meccanismo è l'**effetto di interferenza**
(RT medio incongruenti − RT medio congruenti): un valore positivo elevato
riflette una risoluzione del conflitto più costosa (minore efficienza del
controllo inibitorio). L'asimmetria tra la variante *focus colore* (interferenza
ampia) e *focus parola* (interferenza minima) fornisce una verifica interna
della natura del meccanismo misurato.

---

## 3. Parametri adottati

I valori sotto riportati si riferiscono a **ciascuna variante** (focus colore e
focus parola). I default di piattaforma sono stati valutati contro la
letteratura primaria e le implementazioni di riferimento (jsPsych, PsyToolkit);
dove appropriato è indicata una conferma o una proposta di correzione motivata.

| Parametro | Valore adottato | Fonte / razionale |
|---|---|---|
| **N. trial per variante** | **48** (24 congruenti + 24 incongruenti) | **Confermato con riserva.** Il demo PsyToolkit usa 40 trial; una versione didattica estesa usa 80 trial + 8 di pratica; jsPsych non fissa un default. 48 trial sono adeguati per una stima *screening* dell'effetto Stroop e mantengono i tempi di somministrazione contenuti. Nota di affidabilità: la reliabilità test-retest dell'effetto Stroop cresce col numero di prove; per studi che richiedono misure individuali stabili si raccomanda di elevare a ≥ 80–100 trial per condizione (MacLeod, 1991). |
| **Proporzione congruenti / incongruenti** | **50% / 50%** (24/24) | **Confermato.** Rapporto bilanciato usato da jsPsych (`Math.random() < 0.5`) e standard nelle implementazioni computerizzate. Scelta *neutra*: la proporzione di prove incongruenti modula l'ampiezza dell'interferenza (*proportion-congruent effect*; MacLeod, 1991), quindi un rapporto 50/50 evita di gonfiare o comprimere artificialmente l'effetto. |
| **Durata croce di fissazione** | **500 ms** | **Confermato.** Valore usato sia da jsPsych sia da PsyToolkit (fixation point 500 ms). Sufficiente a orientare l'attenzione al centro dello schermo prima dello stimolo. |
| **Timeout risposta** | **3000 ms** | **Confermato.** PsyToolkit adotta 2000 ms; jsPsych spesso non impone timeout. Poiché i RT tipici nel compito sono ~600–1000 ms, una finestra di 3000 ms cattura la quasi totalità delle risposte valide (comprese quelle lente sotto interferenza) senza attese indefinite. Le prove senza risposta entro 3000 ms sono registrate come **omissioni**. |
| **ISI (inter-stimulus interval)** | **500 ms** | **Confermato.** jsPsych usa un ITI di ~250 ms, PsyToolkit intervalli combinati di ~100–300 ms; 500 ms è un valore breve-moderato, entro l'intervallo di prassi. Requisito critico: l'ISI deve restare **costante** tra i trial, perché la durata dell'intervallo risposta-stimolo modula sistematicamente l'ampiezza dell'interferenza (intervalli più brevi → interferenza maggiore; Galer et al., 2014). Tenerlo fisso a 500 ms garantisce comparabilità tra prove e tra partecipanti. |
| **N. trial di pratica** | **8** | **Confermato.** Coincide esattamente con la versione didattica PsyToolkit (8 prove di pratica). Sufficiente ad apprendere la mappatura tasto-colore senza indurre affaticamento; le prove di pratica sono **escluse** dal calcolo delle metriche. |
| **Set di colori / parole** | **ROSSO, VERDE, BLU, GIALLO** | **Confermato.** Set canonico a 4 colori impiegato da jsPsych (`['red','green','blue','yellow']`) e diffusissimo in letteratura. Quattro alternative bilanciano difficoltà del compito e distinguibilità percettiva/cromatica. Nelle prove incongruenti la parola assume uno qualsiasi degli altri 3 colori, con il colore-inchiostro bilanciato (≈12 occorrenze per colore su 48 trial). |
| **Mappatura tasti** | **R → Rosso, V → Verde, B → Blu, G → Giallo** | **Confermato.** Analogo alla mappatura jsPsych (`['r','g','b','y']`) ma localizzato alle iniziali italiane. Le quattro iniziali (R/V/B/G) sono univoche e non collidono. Va mostrata una legenda tasto-colore persistente e appresa nelle prove di pratica. |

**Sintesi della valutazione:** tutti i default di piattaforma sono coerenti con
la letteratura primaria e con le implementazioni di riferimento e sono
**confermati**. L'unica raccomandazione condizionale riguarda il **numero di
trial**: 48 per variante sono adeguati per uno screening, ma per misure
individuali ad alta affidabilità (es. confronti clinici o test-retest) si
consiglia di prevedere una modalità estesa a ≥ 80 trial per condizione.

---

## 4. Mappatura implementativa

Da completare in fase implementativa — vedi `src/engine/tests/stroop.ts`.

<!--
Placeholder per la corrispondenza tra i parametri scientifici sopra e le
strutture dati / configurazioni del motore (config schema, generatore di
sequenza trial bilanciata, gestione input tastiera, logging RT, timer di
fissazione/ISI/timeout). Da compilare quando il modulo TypeScript sarà
implementato.
-->

---

## 5. Metriche calcolate e formule

Le metriche sono calcolate **separatamente per condizione** (congruente vs
incongruente) e **per variante** (focus colore vs focus parola). Le prove di
pratica sono escluse. Si definisce **finestra di validità** l'intervallo
`[RT_min, timeout]` con `RT_min = 200 ms` (soglia sotto la quale la risposta è
considerata un'anticipazione non plausibile fisiologicamente) e
`timeout = 3000 ms`.

Definizioni operative dei trial per condizione *c*:
- **Corretto valido**: risposta esatta con `200 ms ≤ RT ≤ 3000 ms`.
- **Errore di commissione**: risposta errata (tasto sbagliato) entro la finestra.
- **Errore di anticipazione** (*premature*): `RT < 200 ms` (risposta prima che
  lo stimolo possa essere stato elaborato).
- **Errore di omissione** (*miss*): nessuna risposta entro il timeout di 3000 ms.

### 5.1 Accuratezza per condizione

$$\text{Accuratezza}_c = \frac{N^{\text{corretti}}_c}{N^{\text{validi}}_c}$$

dove `N_validi` è il numero di prove della condizione *c* con una risposta
entro la finestra di validità (corrette + errate di commissione), escluse
anticipazioni e omissioni.

### 5.2 Tempo di reazione medio dei corretti validi

Media dei RT sulle sole prove **corrette e valide** della condizione *c*:

$$\overline{RT}_c = \frac{1}{N^{\text{corretti}}_c} \sum_{i=1}^{N^{\text{corretti}}_c} RT_i$$

### 5.3 Deviazione standard dei RT dei corretti validi

Deviazione standard campionaria (denominatore `N − 1`) sulle stesse prove:

$$SD_c = \sqrt{\frac{1}{N^{\text{corretti}}_c - 1} \sum_{i=1}^{N^{\text{corretti}}_c} \left(RT_i - \overline{RT}_c\right)^2}$$

### 5.4 Effetto di interferenza (effetto Stroop)

Indice principale del compito, in millisecondi:

$$\text{Interferenza} = \overline{RT}_{\text{incongruenti}} - \overline{RT}_{\text{congruenti}}$$

Un valore **positivo** indica il costo di elaborazione dovuto al conflitto: più
è elevato, minore è l'efficienza del controllo inibitorio / risoluzione del
conflitto (MacLeod, 1991). Nella variante *focus parola* ci si attende un valore
prossimo a zero, coerentemente con l'asimmetria dell'effetto Stroop.

### 5.5 Conteggi di errore

Per ciascuna condizione *c* si riportano:

$$N^{\text{anticipazione}}_c = \#\{\, \text{trial} : RT < 200\ \text{ms} \,\}$$

$$N^{\text{omissione}}_c = \#\{\, \text{trial} : \text{nessuna risposta entro } 3000\ \text{ms} \,\}$$

Questi conteggi fungono da indicatori di qualità dei dati: un numero elevato di
anticipazioni segnala risposte impulsive/anticipatorie (strategia non conforme),
mentre un numero elevato di omissioni segnala disattenzione, affaticamento o
difficoltà nel rispettare la finestra temporale.

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

## Aggiornamento metriche (revisione)

Aggiunto il **coefficiente di variazione (CV) del RT** per condizione
(congruente/incongruente), `SD/media · 100`: misura normalizzata della
variabilità intra-soggetto, complementare a media e SD.
