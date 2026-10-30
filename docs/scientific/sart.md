# SART — Sustained Attention to Response Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **SART** sulla piattaforma sperimentale
> universitaria Sintropia.
> Costrutto misurato: **attenzione sostenuta alla risposta** e controllo di una risposta diventata automatica.
> Testo in italiano; citazioni riportate in lingua originale.

---

## 1. Paradigma e citazione primaria

Nel **SART** compare una cifra alla volta, da 1 a 9, in ordine pseudo-casuale. Il partecipante preme un tasto a
**ogni** cifra tranne a una, la cifra bersaglio (di norma il 3), per la quale deve **non rispondere**. Poiché la
quasi totalità dei trial richiede la stessa risposta, premere diventa un automatismo: il compito misura quanto
il partecipante riesca a mantenere l'attenzione sulle proprie azioni e a trattenerla quando serve.

**Citazione primaria.**

> Robertson, I. H., Manly, T., Andrade, J., Baddeley, B. T., & Yiend, J. (1997). *'Oops!': Performance
> correlates of everyday attentional failures in traumatic brain injured and normal subjects.*
> **Neuropsychologia, 35**(6), 747–758. https://doi.org/10.1016/S0028-3932(97)00015-8

Dall'abstract (verificato su Europe PMC, PMID 9204482): gli autori introducono il SART come compito di
laboratorio che richiede di trattenere la pressione del tasto davanti a bersagli rari. In 34 persone con trauma
cranico la prestazione seguiva la gravità del trauma e i fallimenti attentivi quotidiani; in 75 controlli sani
correlava con i lapsus attentivi riferiti da sé e da altri. Le prestazioni al SART correlavano con test classici di
attenzione sostenuta ma non con altre misure attentive, e gli errori erano **preceduti da un accorciamento
significativo dei tempi di reazione** nelle risposte immediatamente precedenti, interpretato come uno slittamento del
controllo verso la risposta automatica. I bersagli erano rari (uno su nove).

**Riferimenti di supporto.**

> Manly, T., Robertson, I. H., Galloway, M., & Hawkins, K. (1999). *The absent mind: Further investigations of
> sustained attention to response.* **Neuropsychologia, 37**(6), 661–670.
> https://doi.org/10.1016/S0028-3932(98)00127-4

Tre studi successivi del gruppo di Robertson, che sostengono la lettura del compito come misura dell'attenzione
sostenuta *alla risposta* piuttosto che di una pura capacità di inibizione. (L'autore è registrato in Crossref
con un solo nome; l'elenco completo degli autori è stato confermato dalla scheda bibliografica dell'MRC CBU.)

> Dang, J. S., Figueroa, I. J., & Helton, W. S. (2018). *You are measuring the decision to be fast, not
> inattention: The Sustained Attention to Response Task does not measure sustained attention.*
> **Experimental Brain Research, 236**(8), 2255–2262. https://doi.org/10.1007/s00221-018-5291-6

In 36 partecipanti, ciascuno sottoposto a una serie di quattro SART, gli autori trovano che le persone scelgono
strategicamente quanto rispondere in fretta: i compromessi velocità-accuratezza dentro lo stesso individuo vanno
considerati quando si interpretano i punteggi.

> Wilson, K. M., Finkbeiner, K. M., de Joux, N. R., Russell, P. N., & Helton, W. S. (2016). *Go-stimuli
> proportion influences response strategy in a sustained attention to response task.* **Experimental Brain
> Research, 234**(10), 2989–2998. https://doi.org/10.1007/s00221-016-4701-x

---

## 2. Meccanismo cognitivo misurato

- **Costruzione di un automatismo.** Con 8 cifre su 9 che richiedono la stessa risposta, il partecipante
  tende a rispondere senza elaborare ogni cifra. Il ritmo è serrato: la cifra segue la precedente senza pausa
  e la sequenza non ha alcun indizio che anticipi il bersaglio.
- **Errore di commissione sul bersaglio.** Premere sul 3 è l'errore tipico del SART. Nello studio originale
  era preceduto da un accorciamento dei tempi di reazione (Robertson et al., 1997): il controllo cede quando la risposta
  si fa più veloce e meno elaborata. Per questo la piattaforma riporta l'RT dei trial che precedono ogni
  commissione (§5.5).
- **Che cosa NON è.** Il SART non è un test di inibizione "pura" come lo Stop-Signal: Manly et al. (1999) lo
  leggono come misura di attenzione sostenuta alla risposta. E, secondo Dang et al. (2018), una parte della
  prestazione riflette la scelta di essere veloci: un partecipante rapido commette più errori senza essere
  necessariamente più disattento. Per questo si riportano sia gli errori sia i tempi, e il criterio $c$.

---

## 3. Parametri adottati

I valori seguono quelli descritti dalle implementazioni pubbliche del compito (PsyToolkit, Inquisit).
**Il testo originale di Robertson et al. (1997) non è stato consultato** (il PDF non è accessibile in modo
automatico): i numeri sotto non sono quindi attribuiti all'articolo, ma alla convenzione dei porting.

| Parametro | Valore adottato | Origine |
|---|---|---|
| **Cifre** | 1–9 | Convenzione del compito (porting pubblici) |
| **Bersaglio (cifra da non rispondere)** | **3** (modificabile) | Convenzione dei porting; in Sintropia è un parametro |
| **Numero di trial** | **225** (25 per cifra) | Convenzione dei porting; 25 presentazioni del bersaglio sono l'unica base della stima delle commissioni |
| **Durata della cifra** | **250 ms** | Convenzione dei porting |
| **Durata della maschera** | **900 ms** (cerchio con croce) | Convenzione dei porting; la finestra di risposta è 250 + 900 = 1150 ms dall'onset |
| **Pausa fra i trial** | **nessuna** | La maschera ne fa le veci: il ritmo è costante, il che è parte del compito |
| **Corpo del carattere** | **5 corpi** (48, 72, 94, 100, 120 px) | Dai porting; scoraggia il confronto con una sagoma. In Sintropia i corpi sono in pixel CSS, non in punti |
| **Ripetizione immediata** | **vietata** | **Scelta di progetto**: nessuna cifra uguale alla precedente, per evitare che la ripetizione fornisca un indizio |
| **Trial di pratica** | **18** (con feedback) | Convenzione dei porting; esclusi dalle metriche |
| **Tasto di risposta** | Barra spaziatrice | Risposta unimanuale a tasto singolo |

La durata complessiva è di circa 4,3 minuti (225 × 1,15 s).

---

## 4. Mappatura implementativa

Corrispondenza fra i parametri della tabella §3 e il codice (`src/engine/tests/sart.ts`, `src/config/defaults.ts`,
`src/ui/tests/SartView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Parametri | `DEFAULTS.sart` | `nTrials 225`, `targetDigit 3`, `digitMs 250`, `maskMs 900`, `practiceTrials 18`; modificabili in Impostazioni e scritti in ogni esportazione |
| Sequenza | `generateSart` | Ogni cifra compare `⌊n/9⌋` volte (le eventuali cifre in più sono estratte a caso); ordine casuale con RNG a seme, **mai due cifre uguali di seguito**. Se dopo 500 tentativi non si trova una disposizione, ripiego: su un rimescolamento casuale ogni ripetizione viene scambiata con una cifra successiva diversa, se esiste (in questo caso il vincolo non è garantito; con i parametri realistici il ripiego non viene raggiunto) |
| Corpi del carattere | `generateSart` | I cinque corpi sono distribuiti in modo bilanciato (45 trial ciascuno con 225 trial), indipendentemente dalla cifra |
| Condizione | `SartView` | `nogo` se la cifra è il bersaglio, altrimenti `go` |
| Cifra e maschera | `SartView` | Cifra per 250 ms, poi la maschera per 900 ms: nel sequencer `stimulusVisibleMs = 250` e `responseWindowMs = 1150` |
| Finestra di risposta | `createSequencer` | Una pressione è valida da quando la cifra è dipinta fino alla fine della maschera; **il trial non termina alla pressione** (`endOnResponse: false`) |
| Risposta | `SartView` | Go corretto = pressione nella finestra; bersaglio corretto = nessuna pressione |
| Classificazione RT | `classifyRt` | `INTERRUPTED → OMISSION → ANTICIPATION (< 150 ms) → VALID` (vedi [validazione RT](validazione-rt.md)); un bersaglio trattenuto è `VALID` senza risposta |
| Metriche | `scoreSart` | Solo trial `phase = 'test'`; formule in §5 |

Punti da conoscere:

- Una pressione sul bersaglio **con RT < 150 ms** è comunque una commissione (e conta anche come anticipazione).
- I trial interrotti (perdita di focus o visibilità) restano nei dati grezzi col flag `INTERRUPTED` ma sono esclusi
  da numeratori e denominatori.
- La ricorrenza esatta dei tempi dipende dal ciclo di rendering del browser: l'onset è preso al paint della cifra
  (`requestAnimationFrame`), la maschera parte da un timer a 250 ms. Su schermi a 60 Hz la risoluzione è ~17 ms.

---

## 5. Metriche e formule

Notazione: $N_{go}$ = trial Go (cifre diverse dal bersaglio) non interrotti, $N_{t}$ = trial sul bersaglio non
interrotti, pratica esclusa. Una *risposta* è qualsiasi pressione registrata, anticipazioni comprese.

### 5.1 Errori di commissione (misura primaria)
Risposta emessa su un trial **bersaglio**.

$$\text{Commissioni}\;(\%) = \frac{n_{\text{risposte sul bersaglio}}}{N_{t}} \times 100$$

### 5.2 Errori di omissione
Mancata risposta su un trial **Go**.

$$\text{Omissioni}\;(\%) = \frac{n_{\text{Go senza risposta}}}{N_{go}} \times 100$$

Un numero elevato di omissioni segnala disimpegno dal compito o criterio molto conservativo.

### 5.3 RT dei Go: media, SD e CV
Insieme dei trial Go con risposta valida ($RT \ge 150\,\text{ms}$), $\{RT_i\}_{i=1}^{n}$:

$$\overline{RT} = \frac{1}{n}\sum_{i=1}^{n} RT_i
\qquad
SD_{RT} = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}\left(RT_i - \overline{RT}\right)^2}
\qquad
CV = 100\cdot\frac{SD_{RT}}{\overline{RT}}$$

La variabilità dei tempi è un indice di instabilità attentiva; come per ogni misura di RT va letta insieme
all'accuratezza (Dang et al., 2018).

### 5.4 Sensibilità $d'$ e criterio $c$
Con la risposta a un Go come *hit* e la risposta al bersaglio come *falso allarme*:

$$d' = z(H) - z(F) \qquad c = -\tfrac{1}{2}\left[z(H) + z(F)\right]$$

con $H = (n_{\text{hit}} + 0{,}5)/(N_{go} + 1)$ e $F = (n_{\text{FA}} + 0{,}5)/(N_{t} + 1)$ (correzione loglinear di
Hautus, 1995, sempre applicata). Il calcolo è condiviso con Go/No-Go e N-Back (`src/engine/sdt.ts`). Il criterio $c$
è utile qui perché separa chi sbaglia perché è disattento (basso $d'$) da chi sbaglia perché sceglie di essere
veloce (criterio liberale, $c < 0$), la distinzione sollevata da Dang et al. (2018).

> Hautus, M. J. (1995). *Corrections for extreme proportions and their biasing effects on estimated values of
> d′.* **Behavior Research Methods, Instruments, & Computers, 27**(1), 46–51. https://doi.org/10.3758/BF03203619

### 5.5 RT prima delle commissioni
Per ciascuna commissione si prendono i Go validi nei **4 trial precedenti**; un trial vicino a più commissioni
conta una volta sola. Si riportano la media di questi RT e la **variazione** rispetto all'RT medio dei Go
($\overline{RT}_{\text{pre}} - \overline{RT}$): un valore **negativo** indica che gli errori sono preceduti da una
accelerazione, come descritto da Robertson et al. (1997). Con nessuna commissione la metrica non è definita e
compare «—».

La finestra di 4 trial è una **scelta di progetto**, non un valore ricavato dall'articolo originale.

### 5.6 Anticipazioni
Numero di trial di test con flag `ANTICIPATION` (RT < 150 ms), su Go e sul bersaglio. Sono escluse dagli RT ma
contate come risposte in $d'$.

---

## 6. Limiti

- **Parametri non verificati sull'originale.** I valori di §3 sono quelli dei porting pubblici; vanno confrontati
  con Robertson et al. (1997) prima di un uso clinico o di un confronto con norme.
- **Nessuna norma.** La piattaforma non fornisce punteggi normativi né cut-off diagnostici: le metriche
  descrivono la prestazione del singolo partecipante.
- **Compromesso velocità-accuratezza.** Commissioni e RT dipendono dalla strategia di risposta (Dang et al.,
  2018): vanno lette insieme a $c$.
- **25 bersagli.** Una stima più stabile delle commissioni richiede più trial (parametro modificabile).
- **Pochi errori.** Con pochissime commissioni l'RT pre-errore si basa su pochi trial.
- **Sensibilità al dispositivo.** I corpi del carattere sono in pixel CSS: la dimensione fisica dipende dallo
  schermo e dalla distanza; per confronti fra sedi occorre calibrare.
- **Misura in browser.** Il timing ha la risoluzione del ciclo di rendering e non sostituisce un sistema
  hardware dedicato.

## Cronologia delle revisioni

- **2026-10.** Prima versione: motore `sart.ts`, vista `SartView`, paper. Fonti verificate su Crossref ed Europe PMC;
  parametri del compito dichiarati come convenzione dei porting.
- **2026-10-30.** Allineate al riassunto le descrizioni di Robertson et al. (1997) («accorciamento significativo» dei
  tempi prima degli errori) e di Dang et al. (2018) (quattro SART, non quattro sessioni); descritto il ripiego reale
  della sequenza (non deterministico e senza garanzia del vincolo).
