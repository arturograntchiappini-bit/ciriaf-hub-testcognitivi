# Validazione automatica dei dati (RT) — Riferimenti scientifici

> Documento metodologico per la piattaforma di test cognitivi Sintropia.
> Definisce le convenzioni scientifiche adottate per il trattamento, la pulizia
> e la validazione automatica dei tempi di reazione (Reaction Times, RT) prima
> di qualsiasi analisi statistica. Le citazioni sono riportate in lingua
> originale (inglese); il testo esplicativo è in italiano.

> **Cautela sulle fonti.** I riferimenti (autori, titolo, rivista, anno, volume, pagine) sono stati verificati su
> Crossref il 2026-10-23. Le **citazioni testuali** di Whelan (2008) e il loro numero di pagina sono riportate dal
> documento originale di lavoro e **non sono state riverificate** nel testo dell'articolo.

---

## 1. Motivazione (perché pulire gli RT prima dell'analisi)

I tempi di reazione grezzi **non sono direttamente analizzabili**. La
distribuzione degli RT è tipicamente asimmetrica (positive skew), contiene
valori estremi (outlier) ed è eterogenea in varianza; applicare test di ipotesi
(es. ANOVA) su dati con queste caratteristiche riduce la potenza statistica e
può portare a non rilevare un effetto reale.

> *"using hypothesis tests on data that are skewed, contain outliers, are
> heteroscedastic, or have a combination of these characteristics (raw RT data
> typically have at least the first two) reduces the power of these tests and
> can result in a failure to detect a real difference between conditions"*
> — Whelan (2008), *Effective Analysis of Reaction Time Data*, p. 477.

Il punto cruciale è che **non tutti gli RT osservati riflettono il processo
cognitivo di interesse**. Alcuni sono troppo veloci per essere guidati dallo
stimolo (risposte anticipatorie / *fast guesses*), altri sono anomali perché il
soggetto era disattento o distratto:

> *"Typically, some observed RTs are not a result of the process of interest."*
> — Whelan (2008), p. 476.

Di conseguenza, prima di calcolare qualunque indicatore (media, mediana,
deviazione standard, tassi di errore) è necessaria una fase di **validazione e
pulizia deterministica** che separi i trial validi da quelli spuri. Ratcliff
(1993) ha valutato la potenza di diversi metodi per limitare l'effetto degli
outlier nell'ANOVA (trasformazioni e cutoff) e ha mostrato che le misure robuste
sono molto meno influenzate da outlier e cutoff delle misure basate sui momenti
(media, varianza). La pulizia, quindi, non è un optional cosmetico ma una scelta
che incide sull'inferenza.

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Ratcliff (1993), DOI: [10.1037/0033-2909.114.3.510](https://doi.org/10.1037/0033-2909.114.3.510).

---

## 2. Filtro di anticipazione (RT < 150 ms → "Errore di Anticipazione"): razionale e fonte

**Regola:** ogni trial con `RT < 150 ms` viene marcato come **`ANTICIPATION`**
("Errore di Anticipazione") e **escluso** dalle analisi dei tempi di reazione
(ma non cancellato — vedi §5).

### Razionale fisiologico

Un tempo di reazione autentico richiede una catena di eventi irriducibile:
trasduzione sensoriale → trasmissione neurale → elaborazione centrale
(percezione + decisione) → programmazione ed esecuzione della risposta motoria.
Questa catena ha un **limite inferiore fisiologico**: nessuna risposta *guidata
dallo stimolo* può completarsi al di sotto di ~100 ms.

> *"Luce (1986) demonstrated that genuine RTs have a minimum value of at least
> 100 ms: time needed for physiological processes such as stimulus perception
> and for motor responses. Reaction times below this value could be the result
> of fast guesses, for example. It is easy to identify these very fast RTs, and
> they are normally eliminated by using a cutoff of between 100 ms and 200 ms."*
> — Whelan (2008), p. 476 (che cita Luce, 1986).

Il punto concettuale è netto: **una risposta più rapida di questa soglia non è
cognitivamente guidata**. Non c'è stato tempo materiale perché lo stimolo venga
percepito, elaborato e trasformato in azione; la risposta è dunque il prodotto
di un **riflesso, di un tiro a indovinare (*fast guess*) o di un'anticipazione
motoria** già programmata prima della comparsa dello stimolo. Includerla
significherebbe contaminare la distribuzione degli RT con eventi che non
appartengono al processo misurato.

### Perché 150 ms

La letteratura non fissa una soglia unica ma un **intervallo di consenso tra 100
e 200 ms** (Whelan, 2008; Luce, 1986). Il valore di **150 ms** adottato dalla
piattaforma si colloca al centro di questa finestra (è una **scelta di
progetto**, non un valore prescritto da una fonte):

- è **sopra** il minimo assoluto di ~100 ms, quindi cattura anche le
  anticipazioni "quasi plausibili" che un cutoff a 100 ms lascerebbe passare;
- è **sotto** il limite superiore di 200 ms, quindi non sacrifica RT genuini ma
  rapidi (che in molti compiti semplici sono legittimi).

In sintesi: `RT < 150 ms` non identifica una risposta "molto brava", bensì una
risposta che **con ogni probabilità non è guidata dallo stimolo** (sotto ~100 ms
non lo è, secondo Luce, 1986, come riportato da Whelan, 2008; tra 100 e 150 ms la
soglia è una scelta prudenziale), e viene
quindi trattata come errore di anticipazione.

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Luce, R. D. (1986). *Response Times: Their Role in Inferring Elementary Mental
Organization.* Oxford University Press (fonte primaria del limite dei ~100 ms).

---

## 3. Filtro di omissione (finestra chiusa senza risposta → "Errore di Omissione", mai valore nullo/infinito)

**Regola:** se la **finestra di risposta si chiude senza che il soggetto abbia
risposto**, il trial viene marcato come **`OMISSION`** ("Errore di Omissione").
L'RT associato **non deve mai essere memorizzato come valore numerico
convenzionale** (`0`, `-1`, `NaN`, `Infinity`, o il valore del timeout): il codice
lo registra come `null` (assenza di valore, non un numero), cella vuota nel CSV.

### Razionale

Un'omissione **non è un tempo di reazione**: è l'*assenza* di un evento. Trattarla
come un numero introduce un errore metodologico grave:

- inserire uno "0" o un valore piccolo **abbassa artificialmente la media** e
  simula una prestazione velocissima inesistente;
- inserire il valore di timeout o `Infinity` **gonfia media e varianza** e
  distrugge la forma della distribuzione;
- inserire `NaN` (o un `null` trattato come numero) in un vettore numerico rende
  **non deterministici** i calcoli a valle (propagazione di `NaN`, ordinamenti
  indefiniti, crash dei motori statistici): per questo le metriche filtrano i
  trial senza RT prima di ogni calcolo.

Per questo l'omissione è codificata come **evento categoriale distinto**, non come
misura di tempo. L'informazione che essa porta (una lacuna attentiva, un mancato
rilevamento dello stimolo) è reale e va conservata, ma appartiene all'**analisi
dell'accuratezza** (tasso di omissioni), **non alla distribuzione degli RT**.
Solo i trial con una risposta effettivamente emessa entro la finestra possono
fornire un RT; gli altri sono classificati e contati a parte.

Questo principio — separare nettamente "tempo di una risposta avvenuta" da
"risposta non avvenuta" — è coerente con il criterio generale della letteratura
per cui nell'analisi dei tempi entrano **solo gli RT effettivamente osservati e
pertinenti al processo di interesse** (Whelan, 2008; Ratcliff, 1993).

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Ratcliff (1993), DOI: [10.1037/0033-2909.114.3.510](https://doi.org/10.1037/0033-2909.114.3.510).

---

## 4. Varianza intrasoggetto (deviazione standard degli RT delle sole risposte corrette e valide)

**Definizione operativa:** la **variabilità intra-individuale** è la **deviazione
standard dei tempi di reazione calcolata sui soli trial `VALID` e `corretti`** di
un singolo soggetto. Anticipazioni, omissioni, trial interrotti e risposte
errate **sono esclusi** dal calcolo, perché altrimenti la loro presenza gonfierebbe
artificiosamente la stima della dispersione.

### Significato: stabilità vs. "altalena" della performance

Mentre la media (o mediana) degli RT misura *quanto è veloce* un soggetto, la
deviazione standard intrasoggetto misura *quanto è costante*. È un indicatore di
**stabilità attentiva**:

- **SD bassa** → prestazione **regolare e stabile**: i tempi si mantengono
  compatti attorno al valore centrale, segno di controllo attentivo continuo;
- **SD alta** → prestazione "**ad altalena**": alternanza di risposte pronte e
  risposte lente, tipicamente prodotta da **lapsus attentivi** momentanei
  (attentional lapses), cioè cadute transitorie di vigilanza.

La variabilità intra-individuale degli RT è riconosciuta in letteratura come un
**marcatore comportamentale** sensibile: elevata variabilità intra-soggetto è
associata a disfunzioni attentive: nella meta-analisi di Kofler et al. (2013) su
319 studi, una maggiore variabilità degli RT risulta una caratteristica stabile
dell'ADHD (e di altri disturbi clinici), robusta alle differenze fra studi; non
è quindi specifica dell'ADHD. Per questo la piattaforma la
tratta come una metrica di primo piano, non come un semplice sottoprodotto della
media.

### Formula (deviazione standard campionaria, correzione n − 1)

Si usa la **deviazione standard campionaria** con correzione di Bessel (divisore
`n − 1`), non quella di popolazione (`n`). Su un campione di `n` RT validi e
corretti `{x_1, …, x_n}` con media campionaria `x̄`:

```
        ┌   1     n            ┐
SD =    │ ───── · Σ (x_i − x̄)² │ ^ (1/2)
        └  n−1   i=1           ┘
```

ovvero, in forma lineare:

```
SD = sqrt( ( Σ_{i=1..n} (x_i − mean)² ) / (n − 1) )
```

**Perché `n − 1` e non `n`:** i dati raccolti in una sessione sono un
**campione** dei possibili RT del soggetto, non l'intera popolazione teorica dei
suoi tempi. La media campionaria `x̄` è essa stessa stimata dagli stessi dati e
"assorbe" un grado di libertà; dividere per `n` sottostimerebbe
sistematicamente la varianza vera. La correzione di Bessel (`n − 1`) rende la
stima della varianza **non distorta** (unbiased). Con `n < 2` trial validi la SD
non è definita. **Limite attuale:** il motore restituisce `0` in quel caso, e i riepiloghi mostrano 0: va letto come
«non calcolabile», non come variabilità nulla. Nei dati grezzi il numero di trial validi è sempre ricostruibile.

> La deviazione standard è il classico "dispersion parameter" riportato accanto
> alla tendenza centrale: *"report a central tendency parameter (e.g., the mean)
> and a dispersion parameter (e.g., the standard deviation)"* — Whelan (2008),
> p. 477.

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Kofler, M. J., et al. (2013). *Reaction time variability in ADHD: A meta-analytic
review of 319 studies.* DOI: [10.1016/j.cpr.2013.06.001](https://doi.org/10.1016/j.cpr.2013.06.001).

---

## 5. Principio di conservazione del dato grezzo

**Regola fondamentale:** i trial invalidati **non vengono mai scartati né
cancellati**. Vengono **marcati con un flag** e **restano integralmente negli
export**.

### Il set dei flag

Ogni trial riceve esattamente uno stato:

| Flag           | Significato                                                        | Entra nelle analisi RT? |
|----------------|-------------------------------------------------------------------|:-----------------------:|
| `VALID`        | Risposta emessa nella finestra, RT ≥ 150 ms                       | Sì                      |
| `ANTICIPATION` | RT < 150 ms — risposta anticipatoria / *fast guess* (§2)          | No                      |
| `OMISSION`     | Finestra chiusa senza risposta (§3)                               | No                      |
| `INTERRUPTED`  | Trial interrotto (abbandono, interruzione tecnica, pausa forzata) | No                      |

### Razionale: trasparenza, riproducibilità e analisi di sensibilità

Marcare-anziché-eliminare non è una preferenza stilistica, ma una **necessità
metodologica**:

1. **La soglia è una scelta, non una legge di natura.** La letteratura mostra che
   *il risultato dipende dal cutoff scelto*: cutoff diversi possono aumentare o
   ridurre la potenza, e possono introdurre bias asimmetrici nelle statistiche.
   > *"no reliable rule can be used to establish absolute cutoffs because they
   > are highly dependent on the particular data that were observed"*
   > — Whelan (2008), p. 477.
   > *"cutoffs can introduce asymmetric biases into statistics such as the sample
   > mean, median, and standard deviation and warn against using cutoffs without
   > allowing for these effects"*
   > — Whelan (2008), p. 477 (su Ulrich & Miller, 1994).

   Se i trial esclusi venissero distrutti, sarebbe **impossibile ricalcolare** i
   risultati con una soglia diversa o eseguire **analisi di sensibilità**. Con i
   dati grezzi conservati e flaggati, ogni pulizia è **reversibile e verificabile**.

2. **Riproducibilità e audit.** Un revisore (o il ricercatore stesso, mesi dopo)
   deve poter ricostruire esattamente perché un trial è stato escluso. Il flag
   rende la decisione **esplicita, deterministica e tracciabile** nel dato stesso.

3. **Gli scarti sono informazione.** Il numero e la distribuzione di
   `ANTICIPATION`, `OMISSION` e `INTERRUPTED` sono di per sé indicatori clinici e
   di qualità del dato (impulsività, cadute attentive, problemi tecnici). Buttarli
   equivarrebbe a perdere segnale.

**Sintesi operativa:** l'export contiene **tutti** i trial, ciascuno con il proprio
flag e il proprio RT grezzo (dove applicabile; esatto nel JSON, arrotondato al millisecondo nel CSV). Le pipeline di analisi filtrano
*a valle* per `VALID` quando servono gli RT, ma il dato di partenza rimane
**completo, immutato e conservato**.

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Ulrich & Miller (1994), *Effects of truncation on reaction time analysis*, DOI: [10.1037/0096-3445.123.1.34](https://doi.org/10.1037/0096-3445.123.1.34);
Ratcliff (1993), DOI: [10.1037/0033-2909.114.3.510](https://doi.org/10.1037/0033-2909.114.3.510).

---

## 6. Mappatura implementativa

Corrispondenza fra i principi di questo documento e il codice (`src/engine/validation.ts`,
`src/ui/runtime/sequencer.ts`, `src/engine/export.ts`).

| Principio | Dove | Comportamento |
|---|---|---|
| Soglia di anticipazione | `ANTICIPATION_CUTOFF_MS` | **150 ms**, costante unica per tutti i test; non è un parametro modificabile dalle Impostazioni |
| Classificazione dei flag | `classifyRt` e `computeFlag` (sequencer) | Precedenza `INTERRUPTED → OMISSION → ANTICIPATION → VALID`; senza risposta un test che richiede risposta dà `OMISSION`, un withhold (No-Go, non-target) dà `VALID` (rifiuto corretto) |
| Interruzione | sequencer | Perdita di focus o di visibilità della pagina durante un trial lo marca `INTERRUPTED` |
| Onset dell'RT | sequencer | L'RT parte dal momento in cui lo stimolo è stato **dipinto** (dopo il paint, non dalla richiesta di mostrarlo) |
| Tasti prima dell'onset | sequencer | **Ignorati**: un tasto premuto durante la fissazione o l'ISI non è una risposta e non viene registrato (difetto corretto il 2026-10: prima poteva produrre un trial con RT calcolato sull'onset del trial precedente) |
| Una sola risposta per trial | sequencer | La seconda pressione è ignorata |
| Omissione | `classifyRt` | RT registrato come `null`, mai come numero convenzionale |
| SD intrasoggetto | `standardDeviation` | Divisore `n − 1`; con `n < 2` restituisce 0 (vedi §4) |
| Conservazione del dato grezzo | export CSV / JSON | Tutti i trial, con flag, RT, condizione e parametri; le metriche filtrano a valle per `VALID`. Il **JSON** conserva i valori esatti; il **CSV** arrotonda `rt_ms` e `timestamp_onset` al millisecondo e antepone un apice ai campi testuali che un foglio di calcolo leggerebbe come formula (`=`, `+`, `@`, `-` seguito da testo), lasciando intatti i numeri |

Il filtro *VALID* è applicato nei riepiloghi di tutti i test; ogni test dichiara nel proprio paper quali trial entrano in
ciascuna metrica.

**Precisione della misura.** Gli RT sono misurati con `performance.now()` dall'istante di paint e dalla ricezione
dell'evento `keydown`: la latenza di tastiera, la frequenza di aggiornamento dello schermo e il carico del
computer aggiungono errore di decine di millisecondi. Effetti di quell'ordine (interferenza Stroop, effetto flanker) sono
misurabili; valori assoluti brevi **non** sono confrontabili con laboratori a hardware dedicato senza calibrazione.

---

## Bibliografia

- **Whelan, R. (2008).** Effective Analysis of Reaction Time Data. *The
  Psychological Record*, 58(3), 475–482.
  DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630)
- **Ratcliff, R. (1993).** Methods for dealing with reaction time outliers.
  *Psychological Bulletin*, 114(3), 510–532.
  DOI: [10.1037/0033-2909.114.3.510](https://doi.org/10.1037/0033-2909.114.3.510)
- **Ulrich, R., & Miller, J. (1994).** Effects of truncation on reaction time
  analysis. *Journal of Experimental Psychology: General*, 123(1), 34–80.
  DOI: [10.1037/0096-3445.123.1.34](https://doi.org/10.1037/0096-3445.123.1.34)
- **Kofler, M. J., Rapport, M. D., Sarver, D. E., Raiker, J. S., Orban, S. A.,
  Friedman, L. M., & Kolomeyer, E. G. (2013).** Reaction time variability in
  ADHD: A meta-analytic review of 319 studies. *Clinical Psychology Review*,
  33(6), 795–811.
  DOI: [10.1016/j.cpr.2013.06.001](https://doi.org/10.1016/j.cpr.2013.06.001)
- **Luce, R. D. (1986).** *Response Times: Their Role in Inferring Elementary
  Mental Organization.* New York: Oxford University Press. (Fonte primaria del
  limite fisiologico di ~100 ms; monografia, senza DOI.)

## Cronologia delle revisioni

- **Revisione scientifica 2026-10.** Verificati su Crossref Whelan (2008), Ratcliff (1993), Ulrich e Miller (1994) e
  Kofler et al. (2013). Scritta la mappatura implementativa e corretto il requisito sulla SD con n < 2 (il codice
  restituisce 0). Rimosso Wilcox (1998), citato di seconda mano e non verificato. Documentata la correzione del
  sequencer sui tasti premuti prima dell'onset.
- **2026-10-30.** Le affermazioni su Ratcliff (1993) e Kofler et al. (2013) sono state allineate ai loro riassunti
  (rimossi «Monte Carlo», «errore di Tipo I» e l'«indicatore classico» SDRT, non verificabili); la soglia di 150 ms è
  dichiarata come scelta di progetto; risolta la contraddizione sull'RT delle omissioni (`null`); documentati
  l'arrotondamento al millisecondo e la neutralizzazione delle formule nel CSV.
