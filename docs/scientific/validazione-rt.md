# Validazione automatica dei dati (RT) — Riferimenti scientifici

> Documento metodologico per la piattaforma di test cognitivi CIRIAF.
> Definisce le convenzioni scientifiche adottate per il trattamento, la pulizia
> e la validazione automatica dei tempi di reazione (Reaction Times, RT) prima
> di qualsiasi analisi statistica. Le citazioni sono riportate in lingua
> originale (inglese); il testo esplicativo è in italiano.

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
(1993), attraverso simulazioni Monte Carlo, ha mostrato che la scelta del metodo
di trattamento degli outlier incide fortemente sulla potenza dei test, pur senza
gonfiare in modo apprezzabile l'errore di Tipo I. La pulizia, quindi, non è un
optional cosmetico ma una condizione di validità dell'inferenza.

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
piattaforma si colloca al centro di questa finestra ed è la scelta prudenziale
standard nei paradigmi attentivi e di reazione:

- è **sopra** il minimo assoluto di ~100 ms, quindi cattura anche le
  anticipazioni "quasi plausibili" che un cutoff a 100 ms lascerebbe passare;
- è **sotto** il limite superiore di 200 ms, quindi non sacrifica RT genuini ma
  rapidi (che in molti compiti semplici sono legittimi).

In sintesi: `RT < 150 ms` non identifica una risposta "molto brava", bensì una
risposta **impossibile da produrre per via cognitiva**, e viene quindi trattata
come errore di anticipazione.

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Luce, R. D. (1986). *Response Times: Their Role in Inferring Elementary Mental
Organization.* Oxford University Press (fonte primaria del limite dei ~100 ms).

---

## 3. Filtro di omissione (finestra chiusa senza risposta → "Errore di Omissione", mai valore nullo/infinito)

**Regola:** se la **finestra di risposta si chiude senza che il soggetto abbia
risposto**, il trial viene marcato come **`OMISSION`** ("Errore di Omissione").
L'RT associato **non deve mai essere memorizzato come valore numerico
convenzionale** (`null`, `0`, `-1`, `NaN`, `Infinity`, o il valore del timeout).

### Razionale

Un'omissione **non è un tempo di reazione**: è l'*assenza* di un evento. Trattarla
come un numero introduce un errore metodologico grave:

- inserire uno "0" o un valore piccolo **abbassa artificialmente la media** e
  simula una prestazione velocissima inesistente;
- inserire il valore di timeout o `Infinity` **gonfia media e varianza** e
  distrugge la forma della distribuzione;
- inserire `null`/`NaN` in un vettore numerico rende **non deterministici** i
  calcoli a valle (propagazione di `NaN`, ordinamenti indefiniti, crash dei
  motori statistici).

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
associata a disfunzioni attentive ed è, ad esempio, una caratteristica robusta e
stabile dell'ADHD, dove l'indicatore classicamente usato è proprio la deviazione
standard degli RT (SDRT) (Kofler et al., 2013). Per questo la piattaforma la
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
stima della varianza **non distorta** (unbiased). Requisito pratico: con `n < 2`
trial validi la SD non è definita e deve essere restituita come non calcolabile
(`null`/non-disponibile), **mai** come `0`.

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
flag e il proprio RT grezzo (dove applicabile). Le pipeline di analisi filtrano
*a valle* per `VALID` quando servono gli RT, ma il dato di partenza rimane
**completo, immutato e conservato**.

**Riferimenti:** Whelan (2008), DOI: [10.1007/BF03395630](https://doi.org/10.1007/BF03395630);
Ulrich & Miller (1994), *Effects of truncation on reaction time analysis*, DOI: [10.1037/0096-3445.123.1.34](https://doi.org/10.1037/0096-3445.123.1.34);
Ratcliff (1993), DOI: [10.1037/0033-2909.114.3.510](https://doi.org/10.1037/0033-2909.114.3.510).

---

## 6. Mappatura implementativa

*Da completare — vedi `src/engine/validation.ts`.*

Questa sezione documenterà la corrispondenza puntuale tra i principi metodologici
sopra e la loro realizzazione nel codice: soglie configurabili (cutoff a 150 ms),
funzione di classificazione dei flag (`VALID` / `ANTICIPATION` / `OMISSION` /
`INTERRUPTED`), calcolo della deviazione standard intrasoggetto (divisore `n − 1`,
gestione di `n < 2`), e struttura dei record esportati con conservazione del dato
grezzo.

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
- **Wilcox, R. R. (1998).** How many discoveries have been lost by ignoring
  modern statistical methods? *American Psychologist*, 53(3), 300–314. (Citato in
  Whelan, 2008, sulla perdita di potenza con dati non normali.)
