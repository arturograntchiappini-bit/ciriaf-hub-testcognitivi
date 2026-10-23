# Wisconsin Card Sorting Test — Riferimenti scientifici

> Documento di riferimento scientifico per la piattaforma sperimentale Sintropia.
> Le citazioni sono riportate nella lingua originale; il testo esplicativo è in italiano.
> Riferimenti verificati su Crossref il 2026-10-23. I manuali PAR (Heaton et al., 1993; Kongs et al., 2000) **non sono
> stati consultati direttamente**: ciò che qui è attribuito ad essi è riportato con questa cautela.

---

## 1. Paradigma e citazione primaria

Il **Wisconsin Card Sorting Test (WCST)** è un test neuropsicologico di *set-shifting* e
flessibilità cognitiva. Il partecipante deve ordinare (matching) una serie di carte-risposta
rispetto a quattro **carte-stimolo** di riferimento, senza che gli venga mai comunicata la
regola di ordinamento: l'unica informazione fornita dopo ogni carta è un feedback binario
(«corretto» / «sbagliato»). La regola («categoria»: colore, forma o numero) cambia in modo
non annunciato dopo un numero prefissato di risposte corrette consecutive, costringendo il
soggetto a **inibire il set precedente** e a costruirne uno nuovo per prove ed errori.

Il paradigma nasce dai lavori di **Esta A. Berg** e **David A. Grant** del 1948 e viene poi standardizzato, quanto a somministrazione e scoring, dal manuale
di **Heaton e colleghi** (1993 nella versione rivista). La versione abbreviata a mazzo singolo è la
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
   ormai errata). È il processo tradizionalmente associato alla corteccia prefrontale.

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
rigidità vs. distraibilità) a parità di numero totale di errori. L'attribuzione di specifici punteggi a specifiche
regioni prefrontali è oggetto di discussione: Nyhus e Barceló (2009) ne offrono un aggiornamento critico.

> Nyhus, E., & Barceló, F. (2009). *The Wisconsin Card Sorting Test and the cognitive assessment of prefrontal
> executive functions: A critical update.* **Brain and Cognition, 71**(3), 437–451.
> DOI: `10.1016/j.bandc.2009.03.005`

---

## 3. Parametri adottati

La colonna *Origine* distingue ciò che è **riportato dalle fonti** (con la cautela sui manuali PAR) da ciò che è una
**scelta di progetto** di Sintropia.

| Parametro | Valore | Origine |
|---|---|---|
| Carte-stimolo | 4 carte fisse: **① un triangolo rosso**, **② due stelle verdi**, **③ tre croci gialle**, **④ quattro cerchi blu** | Configurazione classica del test (Heaton et al., 1993): ogni valore di ogni dimensione compare su una sola carta-stimolo |
| Dimensioni | **Colore** (rosso, verde, giallo, blu) · **Forma** (triangolo, stella, croce, cerchio) · **Numero** (1, 2, 3, 4) | Grant & Berg (1948); Heaton et al. (1993) |
| Mazzo-risposta | Le **64 combinazioni** 4 × 4 × 4, ciascuna una volta, in **ordine casuale** (con seme); se `deckSize` > 64 il mazzo si ripete in permutazioni successive | Il WCST-64 usa 64 carte (Kongs et al., 2000). **Differenza:** nel test ufficiale l'ordine delle carte è prestabilito; qui è casuale, quindi i punteggi non sono strettamente confrontabili con i dati normativi |
| Dimensione mazzo | **64** (default); la versione completa usa 128 | Heaton et al. (1993) = 128; Kongs et al. (2000) = 64 |
| Ordine dei criteri | **Colore → Forma → Numero**, ciclico | Heaton et al. (1993) |
| Corrette consecutive per il cambio | **10** (`runToShift`) | Valore classico (Grant & Berg, 1948; Heaton et al., 1993) |
| Categorie per terminare | **6** (`maxCategories`), oppure esaurimento del mazzo | Heaton et al. (1993). Con 64 carte e 10 corrette per categoria, sei categorie richiedono almeno 60 risposte corrette: il test finisce di norma per esaurimento del mazzo |
| Feedback | Binario («Corretto» / «Errato») dopo ogni risposta, **900 ms** | Il feedback binario è del test originale; la durata è una **scelta di progetto**, fissa nel codice (non è un parametro modificabile) |

Il valore predefinito del mazzo è 64 carte: la somministrazione è più breve, ma **non esiste equivalenza dimostrata** con
la versione a 128 carte nei dati di Sintropia, e il mazzo casuale accentua la differenza dai dati normativi.

---

## 4. Mappatura implementativa

Corrispondenza fra §3, §5 e il codice (`src/engine/tests/wcst.ts`, `src/config/defaults.ts`, `src/ui/tests/WcstView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Carte-stimolo | `WCST_STIMULUS_CARDS` | Le 4 carte fisse |
| Mazzo | `buildDeck` | Permutazione casuale delle 64 combinazioni, ripetuta se serve |
| Regola attiva | `ruleForCategory` | `ordine[categoria mod 3]`: colore, forma, numero |
| Confronto | `matchingDims` | Dimensioni su cui la carta-risposta combacia con la carta-stimolo **scelta** |
| Cambio categoria | `WcstView` | Dopo `runToShift` corrette consecutive la categoria avanza e il contatore si azzera |
| Fine del test | `WcstView` | `maxCategories` categorie completate oppure mazzo esaurito |
| Punteggio | `scoreWcst` | Rielabora la sequenza dei trial con le regole attive di ciascuno; formule in §5 |
| Principio perseverato | `PerseverationScanner` | Vedi §5.2 |
| Parametri | `DEFAULTS.wcst` | `deckSize 64`, `runToShift 10`, `maxCategories 6` |

Il test non prevede trial di pratica né un tempo massimo. Gli RT sono registrati per trial nei dati grezzi, ma **non**
compaiono nel riepilogo.

---

## 5. Metriche e formule

Notazione: un **trial** è una presentazione carta + risposta + feedback. Si considerano i trial non interrotti.

### 5.1 Indici di prestazione globale

- **Trial totali** — carte somministrate (≤ dimensione del mazzo).
- **Categorie completate** — numero di volte in cui si raggiungono `runToShift` (10) risposte corrette consecutive;
  l'ultima categoria completata chiude il test se si raggiunge `maxCategories`.
- **Errori totali** — trial in cui la carta-risposta **non** combacia con la scelta sulla dimensione della regola attiva
  (comprese le risposte che non combaciano su nessuna dimensione). Vale
  `Errori totali = Errori perseverativi + Errori non perseverativi`.
- **Trial per la 1ª categoria** — indice di efficienza iniziale (formazione del concetto). Se nessuna categoria è
  completata, vale il numero di trial totali.
- **Risposte a livello concettuale (%)** — quota di risposte che fanno parte di una corsa di **almeno 3 corrette
  consecutive**; le corse **non** si azzerano al cambio di categoria.
- **Failure to maintain set** — numero di errori che interrompono una corsa di 5–9 corrette consecutive prima del
  completamento della categoria (la finestra superiore segue `runToShift`).

### 5.2 Scoring perseverativo

Si segue la procedura di Heaton et al. (1993) come descritta da **Howlett e Moseley (2024)**, un aggiornamento del
diagramma di scoring di Berry (1996) pensato proprio per controllare che le versioni computerizzate seguano il manuale:

> Howlett, C. A., & Moseley, G. L. (2024). *An improved diagrammatic procedure for interpreting and scoring the
> Wisconsin Card Sorting Test: An update to Steve Berry's 1996 edition.* **Behavior Research Methods, 56**(8),
> 8715–8719. DOI: `10.3758/s13428-024-02499-w`

**Risposta ambigua / non ambigua.** Una risposta è *non ambigua* se la carta scelta combacia con la carta-stimolo su **una
sola** dimensione, *ambigua* se su più dimensioni. Una risposta che non combacia su nessuna dimensione è un errore e non
è né l'una né l'altra ai fini di questo scoring.

**Principio perseverato (PP)** — la dimensione errata a cui il partecipante si attiene. Regole implementate:

1. Si stabilisce al **primo errore non ambiguo** (che conta come perseverativo: scelta di implementazione, vedi limiti).
2. Quando una categoria è completata, il PP diventa il **criterio appena abbandonato**.
3. **Tre errori non ambigui consecutivi** su una dimensione che non è né quella corretta né il PP spostano il PP su quella
   dimensione; le risposte ambigue tra i tre errori devono combaciare con la stessa dimensione. Il testo di riferimento
   dice che un nuovo PP non vale e non è perseverativo fino al **secondo** errore non ambiguo: si legge come «il primo dei
   tre errori non è perseverativo, il secondo e il terzo sì», e lo stesso vale per quelli successivi sul nuovo PP.

**Errore perseverativo e risposta perseverativa.** Una *risposta perseverativa* ripete l'ordinamento secondo il PP e può
essere corretta oppure no; un *errore perseverativo* è una risposta perseverativa **sbagliata**. Gli errori
perseverativi sono dunque un sottoinsieme delle risposte perseverative, e una risposta perseverativa può essere corretta
solo se è ambigua.

**Regola del «sandwich».** Una risposta **ambigua** è perseverativa solo se è incastrata tra due errori perseverativi
**non ambigui** e combacia col PP in vigore; subito dopo il completamento di una categoria non può esserlo.

**Errori non perseverativi** = Errori totali − Errori perseverativi.

**Metriche riportate:** errori perseverativi, % di errori perseverativi (sui trial totali), **risposte perseverative**,
errori non perseverativi.

### 5.3 Riepilogo

| Metrica | Definizione sintetica |
|---|---|
| Categorie completate | corse di `runToShift` corrette consecutive |
| Trial totali | carte somministrate |
| Errori totali | trial non conformi alla regola attiva |
| Errori perseverativi / % | secondo §5.2 |
| Risposte perseverative | errori perseverativi + risposte ambigue corrette incastrate |
| Errori non perseverativi | totali − perseverativi |
| Failure to maintain set | errori dopo 5–9 corrette consecutive |
| Risposte a livello concettuale | % di risposte in corse di ≥ 3 corrette |
| Trial per la 1ª categoria | trial necessari a completare la prima categoria |

---

## 6. Limiti e cautele

- **Scoring non validato.** L'implementazione segue le regole esplicite di Howlett e Moseley (2024) ma **non è stata
  confrontata con lo scoring ufficiale PAR** su dati reali. Due punti sono letture del testo: l'errore che stabilisce il
  PP iniziale è contato come perseverativo (la fonte non lo dice espressamente), e il trattamento dei tre errori
  consecutivi (primo escluso). Per uso clinico o confronti normativi serve una validazione.
- **Mazzo casuale**, non l'ordine prestabilito del test ufficiale; mazzo ridotto a 64 carte.
- **Nessuna pratica e nessun tempo massimo**; gli RT non sono nel riepilogo.
- **Un solo ordine dei criteri** (colore, forma, numero), identico per tutti i partecipanti.
- **Ripetizioni ravvicinate** possono produrre effetti di apprendimento: non sono quantificati qui, e vanno considerati nei disegni con più somministrazioni.

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
- Howlett, C. A., & Moseley, G. L. (2024). *An improved diagrammatic procedure for interpreting and scoring the Wisconsin Card Sorting Test: An update to Steve Berry's 1996 edition.* **Behavior Research Methods, 56**(8), 8715–8719. DOI: `10.3758/s13428-024-02499-w`
- Nyhus, E., & Barceló, F. (2009). *The Wisconsin Card Sorting Test and the cognitive
  assessment of prefrontal executive functions: A critical update.*
  **Brain and Cognition, 71**(3), 437–451. DOI: `10.1016/j.bandc.2009.03.005`
- Miles, S., Howlett, C. A., Berryman, C., Nedeljkovic, M., Moseley, G. L., & Phillipou, A. (2021). *Considerations for using the Wisconsin Card Sorting Test to assess cognitive flexibility.* **Behavior Research Methods, 53**(5), 2083–2091. DOI: `10.3758/s13428-021-01551-3`

## Cronologia delle revisioni

- **Revisione scientifica 2026-10.** **Riscritto lo scoring perseverativo** secondo Howlett e Moseley (2024): il codice
  precedente contava come perseverativo qualunque errore combaciante col PP (comprese le risposte ambigue) e non
  spostava mai il PP dopo tre errori consecutivi; ora si applicano la regola del sandwich e il cambio del PP, e si
  riportano le risposte perseverative. **Corretta l'attribuzione** del DOI 10.3758/s13428-021-01551-3 (Miles et al., 2021,
  non «Steinke & Kopp») e quella dell'aggiornamento 2024 (Howlett & Moseley, non «Heaton, 2024»). Rimossi i passaggi
  attribuiti ai manuali senza verifica (equivalenza 64/128 con correlazioni .7–.9) e le citazioni testuali; descritte
  durata del feedback (900 ms, fissa) e mazzo casuale come scelte di progetto.

## Aggiornamento metriche (revisione)

Aggiunti tre indici canonici di Heaton: **% errori perseverativi** (sul totale
dei trial), **Risposte a Livello Concettuale (CLR, %)** — quota di risposte in
corse di ≥ 3 corrette consecutive — e **Trial per la 1ª categoria**
(learning-to-learn). Le corse concettuali non sono azzerate dal cambio di
categoria.
