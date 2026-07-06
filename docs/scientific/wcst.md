# Wisconsin Card Sorting Test — Riferimenti scientifici

> Documento di riferimento scientifico per la piattaforma sperimentale CIRIAF.
> Le citazioni sono riportate nella lingua originale; il testo esplicativo è in italiano.
> Ultima verifica delle fonti: luglio 2026.

---

## 1. Paradigma e citazione primaria

Il **Wisconsin Card Sorting Test (WCST)** è un test neuropsicologico di *set-shifting* e
flessibilità cognitiva. Il partecipante deve ordinare (matching) una serie di carte-risposta
rispetto a quattro **carte-stimolo** di riferimento, senza che gli venga mai comunicata la
regola di ordinamento: l'unica informazione fornita dopo ogni carta è un feedback binario
(«corretto» / «sbagliato»). La regola («categoria»: colore, forma o numero) cambia in modo
non annunciato dopo un numero prefissato di risposte corrette consecutive, costringendo il
soggetto a **inibire il set precedente** e a costruirne uno nuovo per prove ed errori.

Il paradigma nasce dai lavori di **Esta A. Berg** e **David A. Grant** all'Università del
Wisconsin (1948) e viene poi standardizzato, quanto a somministrazione e scoring, dal manuale
di **Heaton e colleghi** (1981, rev. 1993). La versione abbreviata a mazzo singolo è la
**WCST-64** di Kongs, Thompson, Iverson & Heaton (2000).

Citazioni primarie (lingua originale):

> Berg, E. A. (1948). *A simple objective technique for measuring flexibility in thinking.*
> **The Journal of General Psychology, 39**(1), 15–22. DOI: `10.1080/00221309.1948.9918159`

> Grant, D. A., & Berg, E. A. (1948). *A behavioral analysis of degree of reinforcement and
> ease of shifting to new responses in a Weigl-type card-sorting problem.*
> **Journal of Experimental Psychology, 38**(4), 404–411. DOI: `10.1037/h0059831`

> Heaton, R. K., Chelune, G. J., Talley, J. L., Kay, G. G., & Curtiss, G. (1993).
> *Wisconsin Card Sorting Test Manual: Revised and Expanded.* Odessa, FL:
> Psychological Assessment Resources (PAR). *(manuale di test — senza DOI)*

> Kongs, S. K., Thompson, L. L., Iverson, G. L., & Heaton, R. K. (2000).
> *Wisconsin Card Sorting Test-64 Card Version (WCST-64).* Odessa, FL:
> Psychological Assessment Resources (PAR). *(manuale di test — senza DOI)*

---

## 2. Meccanismo cognitivo

Il WCST misura la capacità di **formare, mantenere e aggiornare un set attentivo/cognitivo**
sulla base di feedback esterni. Sono coinvolti tre processi distinti e dissociabili:

1. **Flessibilità cognitiva / set-shifting.** Quando la regola cambia, il soggetto deve
   abbandonare il criterio finora rinforzato e passarne a uno nuovo. La difficoltà a compiere
   questo passaggio si manifesta come **perseverazione** (continuare ad applicare la regola
   ormai errata). È il processo storicamente associato alla corteccia prefrontale
   dorsolaterale.

2. **Feedback learning (apprendimento per rinforzo).** L'unico segnale informativo è il
   feedback binario. Il soggetto deve usare il «sbagliato» come segnale di *shift* e il
   «corretto» come segnale di *stay*, aggiornando l'ipotesi corrente sulla regola. Errori
   casuali o incapacità di sfruttare il feedback producono **errori non perseverativi**.

3. **Mantenimento del set (set maintenance).** Una volta identificata la regola corretta, il
   soggetto deve mantenerla stabilmente fino al successivo cambio. Abbandonarla
   prematuramente, pur avendo ricevuto feedback positivi, configura un **failure to maintain
   set** (fallimento nel mantenimento del set): un indice di distraibilità/impulsività
   distinto dalla rigidità perseverativa.

La combinazione di questi tre indici permette di distinguere profili clinici diversi (es.
rigidità frontale vs. distraibilità) a parità di numero totale di errori.

---

## 3. Parametri adottati

Valori confermati sulle fonti standard. La colonna «Fonte/razionale» indica se il valore è
**standard di letteratura** o una **scelta di configurazione** della piattaforma.

| Parametro | Valore | Fonte / razionale |
|---|---|---|
| Carte-stimolo (chiave) | 4 carte fisse: **① triangolo rosso**, **② stelle verdi**, **③ croci gialle**, **④ cerchi blu** | Berg (1948); manuale Heaton (1993). Le 4 carte sono costruite in modo che ciascuna sia univoca su ognuna delle 3 dimensioni. |
| Dimensioni di ordinamento | 3: **Colore** (rosso, verde, giallo, blu) · **Forma** (triangolo, stella, croce, cerchio) · **Numero** (1, 2, 3, 4) | Grant & Berg (1948); Heaton (1993). |
| Composizione mazzo-risposta | Carte che combinano le 3 dimensioni; ogni carta condivide ≥1 attributo con almeno una carta-stimolo | Heaton (1993); Kongs et al. (2000). |
| Dimensione mazzo | **128** carte (due mazzi identici da 64) nella versione standard; **64** carte (mazzo singolo) nella **WCST-64** | Heaton (1993) = 128; Kongs et al. (2000) = 64. **Default piattaforma: 64** (WCST-64), somministrazione più breve con proprietà psicometriche equivalenti (correlazioni .7–.9 con la versione a 128). |
| Ordine dei criteri | **Colore → Forma → Numero**, ciclico (dopo Numero si ricomincia da Colore) | Heaton (1993). Con 6 categorie la sequenza è C, F, N, C, F, N. |
| Corrette consecutive per cambio categoria | **10** risposte corrette consecutive | Grant & Berg (1948); Heaton (1993). Valore classico e default della piattaforma. |
| Categorie per terminare | **6** categorie completate *oppure* esaurimento del mazzo | Heaton (1993). Con mazzo da 64 il test si chiude comunque all'esaurimento delle carte se le 6 categorie non vengono raggiunte. |
| Feedback | Segnale **binario** («corretto»/«sbagliato») dopo ogni singola risposta | Berg (1948); Heaton (1993). |
| Durata feedback | **~1 s** (default configurabile) | **Scelta di configurazione:** l'originale cartaceo non prescrive una durata; nelle versioni computerizzate è un parametro di presentazione. Default proposto ≈ 1000 ms. |

**Note sulle varianti storiche.** Il *default* «shift dopo 10 corrette consecutive» e l'ordine
Colore→Forma→Numero coincidono con Grant & Berg (1948) e con il manuale Heaton (1993): **sono
confermati**, non richiedono correzione. L'unico parametro su cui la letteratura differisce è
la **dimensione del mazzo**: 128 carte (standard Heaton) vs. 64 carte (WCST-64). La piattaforma
adotta come default il mazzo da 64 (WCST-64), mantenendo invariati tutti gli altri parametri.

---

## 4. Mappatura implementativa

*Da completare — vedi `src/engine/tests/wcst.ts`.*

Questa sezione mapperà i parametri della Sezione 3 e le formule della Sezione 5 sulle
strutture dati e sulle funzioni del motore (generazione mazzo, valutazione match, macchina a
stati delle categorie, scorer perseverativo).

---

## 5. Metriche e formule

Notazione: sia una **trial** una singola presentazione carta+risposta+feedback. Le metriche
seguono lo scoring standard del manuale Heaton (1993).

### 5.1 Indici di prestazione globale

- **Trial totali** — numero di carte-risposta effettivamente somministrate (≤ dimensione
  mazzo). Il test termina al raggiungimento di 6 categorie o all'esaurimento del mazzo.
- **Categorie completate** — `∈ [0, 6]`. Numero di volte in cui il soggetto raggiunge **10
  risposte corrette consecutive** sotto la regola vigente.
- **Errori totali** — numero di trial con risposta non conforme alla regola corretta corrente.
  Vale l'identità di partizione:

  ```
  Errori totali = Errori perseverativi + Errori non perseverativi
  ```

- **Trial per completare la 1ª categoria** — indice di efficienza iniziale (concept
  formation).
- **RT decisionale medio** — media dei tempi di risposta (dalla presentazione della carta alla
  scelta), tipicamente sulle sole risposte valide.

### 5.2 Definizioni operative dello scoring perseverativo (Heaton)

Lo scoring perseverativo di Heaton si fonda su tre concetti precisi. **Questa è la parte
load-bearing per l'implementazione dello scorer.**

**a) Risposta ambigua vs. non ambigua.**

> *"An unambiguous response is one in which the response card matches a stimulus card on only
> one dimension."*
> *"An ambiguous response is one in which the response card matches a stimulus card on more
> than one dimension."* (aggiornamento diagrammatico Heaton, 2024)

- **Non ambigua (unambiguous):** la carta-risposta condivide con le carte-stimolo **una sola**
  dimensione → l'intenzione del soggetto è identificabile senza incertezza.
- **Ambigua (ambiguous):** la carta condivide **più** dimensioni → l'intenzione non è
  univocamente determinabile dalla sola scelta.

**b) Principio perseverato (perseverated-to principle, PP) — «principio perseverativo».**

Il PP è la **dimensione errata verso cui il soggetto persevera**. Regola operativa:

- Viene **stabilito la prima volta** al primo **errore non ambiguo** della prima categoria
  (Colore):

  > *"The PP is established in the first category (i.e., color category) once the first
  > unambiguous error is made."*

- Il PP viene **aggiornato** quando:
  1. una categoria è completata (10 corrette) → il PP diventa la dimensione **appena
     completata** (quella che ora smette di essere corretta);
  2. il soggetto produce **tre errori non ambigui consecutivi** che matchano la stessa
     dimensione non-corretta → quella dimensione diventa il nuovo PP.

**c) Risposta perseverativa vs. errore perseverativo.**

- **Risposta perseverativa** = qualunque risposta (corretta *o* errata) che **corrisponde al
  PP corrente**. Una risposta perseverativa **può essere corretta**, quando il PP coincide con
  la regola che è tornata/diventata corretta:

  > *"Perseverative responses (repeated card sorts) can be correct, but perseverative errors
  > are, by definition, not."*

- **Errore perseverativo** = una risposta perseverativa che è **anche un errore** (non conforme
  alla regola corretta corrente). Vale l'inclusione stretta:

  > *"Perseverative errors are perseverative responses; however, not all perseverative
  > responses are perseverative errors."*

  Formalmente:

  ```
  errore_perseverativo(trial) ⇔  matches(risposta, PP_corrente)  ∧  ¬matches(risposta, regola_corretta_corrente)
  ```

- **Regola del «sandwich».** Una risposta **ambigua** viene conteggiata come perseverativa solo
  se è «incastrata» tra due errori perseverativi **non ambigui** che matchano il PP corrente:

  > *"an ambiguous response that is situated ('sandwiched') between two unambiguous
  > perseverative errors"*

**Errori non perseverativi** = errori che **non** matchano il PP corrente (errori casuali,
di distraibilità o di ipotesi diversa dalla perseverata). Si ottengono per differenza:
`Errori non perseverativi = Errori totali − Errori perseverativi`.

### 5.3 Failure to maintain set (fallimento nel mantenimento del set)

Definizione operativa Heaton:

- **Failure to maintain set** = si verifica quando il soggetto fornisce **5 o più (ma meno di
  10) risposte corrette consecutive** sotto la regola vigente e poi **commette un errore prima
  di completare la categoria** (cioè prima di raggiungere le 10 corrette). L'indice conta il
  numero di tali episodi (finestra **5–9** corrette consecutive seguite da errore).

  ```
  failure_to_maintain_set:  (run corrette consecutive ∈ [5, 9])  →  errore  (prima delle 10)
  ```

Interpretazione: distraibilità / instabilità del set, distinta dalla rigidità perseverativa.

### 5.4 Riepilogo metriche da produrre

| Metrica | Definizione sintetica |
|---|---|
| Categorie completate | n. di run da 10 corrette consecutive (0–6) |
| Trial totali | n. carte somministrate |
| Errori totali | trial non conformi alla regola corretta |
| Errori perseverativi | risposte che matchano il PP e sono errate (def. Heaton, §5.2) |
| Errori non perseverativi | Errori totali − Errori perseverativi |
| Failure to maintain set | episodi con 5–9 corrette consecutive seguite da errore pre-categoria |
| Trial 1ª categoria | trial necessari a completare la prima categoria |
| RT decisionale medio | media dei tempi di risposta |

---

## Riferimenti

- Berg, E. A. (1948). *A simple objective technique for measuring flexibility in thinking.*
  **The Journal of General Psychology, 39**(1), 15–22. DOI: `10.1080/00221309.1948.9918159`
- Grant, D. A., & Berg, E. A. (1948). *A behavioral analysis of degree of reinforcement and
  ease of shifting to new responses in a Weigl-type card-sorting problem.*
  **Journal of Experimental Psychology, 38**(4), 404–411. DOI: `10.1037/h0059831`
- Heaton, R. K., Chelune, G. J., Talley, J. L., Kay, G. G., & Curtiss, G. (1993).
  *Wisconsin Card Sorting Test Manual: Revised and Expanded.* PAR.
- Kongs, S. K., Thompson, L. L., Iverson, G. L., & Heaton, R. K. (2000).
  *Wisconsin Card Sorting Test-64 Card Version (WCST-64).* PAR.
- Nyhus, E., & Barceló, F. (2009). *The Wisconsin Card Sorting Test and the cognitive
  assessment of prefrontal executive functions: A critical update.*
  **Brain and Cognition, 71**(3), 437–451. DOI: `10.1016/j.bandc.2009.03.005`
- Steinke, A., & Kopp, B. (2020/2021). *Considerations for using the Wisconsin Card Sorting
  Test to assess cognitive flexibility.* **Behavior Research Methods.**
  DOI: `10.3758/s13428-021-01551-3`
- Aggiornamento diagrammatico dello scoring Heaton (update di Berry, 1996):
  **Behavior Research Methods** (2024). DOI: `10.3758/s13428-024-02499-w`
