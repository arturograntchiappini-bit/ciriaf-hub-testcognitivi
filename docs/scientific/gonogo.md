# Go/No-Go Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **Go/No-Go Task**
> sulla piattaforma sperimentale universitaria Sintropia.
> Costrutto misurato: **inibizione motoria rapida** (rapid response inhibition).
> Testo in italiano; citazioni riportate in lingua originale.

---

## 1. Paradigma e citazione primaria

Il **Go/No-Go Task** è un paradigma cronometrico di inibizione della risposta in cui allo stimolo
prevalente ("Go") il partecipante deve emettere una risposta motoria rapida e prepotente, mentre a uno
stimolo raro ("No-Go") deve **sopprimere** la risposta già innescata. La misura centrale è la capacità di
inibire un'azione automatizzata sotto pressione temporale — un indice di *controllo inibitorio prepotente*
distinto dall'inibizione reattiva "a segnale" dello Stop-Signal Task (in cui il segnale di stop arriva *dopo* lo
stimolo Go, con un ritardo, quando la risposta è già in preparazione).

**Citazione primaria.**

> Verbruggen, F., & Logan, G. D. (2008). *Automatic and controlled response inhibition: Associative
> learning in the go/no-go and stop-signal paradigms.* **Journal of Experimental Psychology: General,
> 137**(4), 649–672. https://doi.org/10.1037/a0013170

In cinque esperimenti Verbruggen e Logan mostrano che l'inibizione della risposta può divenire in parte
**automatica** con la pratica, quando uno stimolo è associato in modo consistente allo "stop": la risposta a uno
stimolo prima associato allo stop risulta rallentata, e l'inibizione trae beneficio da associazioni stimolo-stop
consistenti. Poiché nel go/no-go la corrispondenza stimolo-stop è di norma consistente (mentre nello stop-signal non
lo è), i due paradigmi **non sono equivalenti**: consentono forme diverse di inibizione. Che il No-Go sia tanto più
impegnativo quanto più la risposta Go è resa **prepotente** da frequenza e ritmo dei Go è sostenuto invece da
Wessel (2018) e Wilson et al. (2016), qui sotto.

**Riferimenti di supporto.**

> Wessel, J. R. (2018). *Prepotent motor activity and inhibitory control demands in different variants of
> the go/no-go paradigm.* **Psychophysiology, 55**(3), e12871. https://doi.org/10.1111/psyp.12871

> Wilson, K. M., Finkbeiner, K. M., de Joux, N. R., Russell, P. N., & Helton, W. S. (2016). *Go-stimuli
> proportion influences response strategy in a sustained attention to response task.* **Experimental Brain
> Research, 234**(10), 2989–2998. https://doi.org/10.1007/s00221-016-4701-x

> Hasegawa, A., Matsumoto, N., Yamashita, Y., Tanaka, K., Kawaguchi, J., & Yamamoto, T. (2021). *Do shorter
> inter-stimulus intervals in the go/no-go task enable better assessment of response inhibition?*
> **Scandinavian Journal of Psychology, 62**(2), 118–124. https://doi.org/10.1111/sjop.12679

Origine cronometrica del paradigma (metodo sottrattivo dei tempi di reazione):

> Donders, F. C. (1868/1969). *On the speed of mental processes.* **Acta Psychologica, 30**, 412–431.
> https://doi.org/10.1016/0001-6918(69)90065-1

---

## 2. Meccanismo cognitivo misurato

Il Go/No-Go isola l'**inibizione motoria**: la soppressione, entro una finestra temporale ristretta, di una
risposta motoria già preparata e automatizzata.

- **Costruzione della prepotenza (ruolo dell'alta frequenza dei Go).** L'elevata proporzione di trial Go
  (per esempio il 75% di questa implementazione) e il ritmo rapido di presentazione fanno sì che la risposta motoria
  diventi *prepotente*: viene innescata quasi automaticamente alla comparsa dello stimolo. Wessel (2018) nota che
  molti studi usano invece Go e No-Go equiprobabili (~40% degli studi esaminati) o intervalli fra stimoli lunghi,
  oltre 4 s (~20%). Wilson et al. (2016), in 30
  partecipanti, mostrano
  empiricamente che, aumentando la proporzione di Go da .50 a .95, i tempi di reazione **diminuiscono** e gli
  **errori di commissione aumentano** — segno diretto di una risposta motoria resa prepotente.

- **Il No-Go come test dell'inibizione.** Solo sul raro stimolo No-Go il sistema deve **cancellare** la
  risposta in corso. Il fallimento (premere sul No-Go = *errore di commissione*) è la misura più pura del
  cedimento inibitorio. Wessel (2018) documenta, tramite il Lateralized Readiness Potential, che l'attività
  motoria prepotente su trial No-Go inibiti con successo emerge **in modo affidabile solo nelle varianti
  rapide con No-Go rari**; nelle versioni lente ed equiprobabili l'attività legata all'inibizione si riduce
  del ~75%. Questo giustifica la scelta di **No-Go rari + ritmo veloce** per far sì che il compito misuri
  realmente inibizione motoria e non semplice discriminazione percettiva.

- **Distinzione dagli errori di omissione.** Non rispondere a un Go (*errore di omissione*) non indica
  inibizione ma piuttosto **cali attentivi / attenzione sostenuta** o un criterio di risposta eccessivamente
  cauto. Le due classi di errore vanno tenute concettualmente separate (vedi §5).

In sintesi, il compito misura l'equilibrio tra **automatizzazione della risposta Go** (velocità, prepotenza)
e **capacità di controllo top-down** che la sopprime sul No-Go.

---

## 3. Parametri adottati

Valori adottati nell'implementazione Sintropia. «Coerente con le fonti» indica un valore compatibile con le fonti
citate nella riga, non prescritto da esse; dove nessuna fonte è citata il valore è una **scelta di progetto** con il suo
razionale.

| Parametro | Valore adottato | Fonte / razionale |
|---|---|---|
| **Numero totale di trial** | **80** | **Scelta di progetto**, compromesso per una batteria breve. Con 20 No-Go il tasso di commissione ha una risoluzione di 5 punti percentuali (1/20) e una stima individuale rumorosa; la letteratura citata non fissa un minimo. Per protocolli dedicati alla sola inibizione conviene aumentare i trial (parametro modificabile). |
| **Proporzione Go / No-Go** | **75% Go (60) / 25% No-Go (20)** | **Coerente con le fonti**, ma il valore preciso è una scelta di progetto. Wessel (2018, abstract) trova attività motoria prepotente affidabile solo con No-Go rari e ritmo veloce; Wilson et al. (2016, abstract) osservano RT più brevi e più commissioni passando da .50 a .95 di Go (proporzioni testate: .50, .65, .80, .95). La probabilità di No-Go usata nelle condizioni «rare» di Wessel non è stata verificata sul testo. |
| **Durata stimolo / finestra di risposta** | **800 ms fissi** | **Scelta di progetto**, come *response deadline* (deadline di risposta). Il ritmo rapido favorisce la prepotenza (Wessel, 2018). 800 ms è moderato-veloce: impone velocità senza tagliare troppe risposte lente valide. Nota: è la finestra entro cui la risposta è conteggiata come Go corretto. |
| **ISI (inter-stimulus interval) variabile** | **Uniforme 500–1000 ms (jitter)** | **Scelta di progetto.** La *variabilità* dell'ISI serve a ostacolare l'entrainment temporale e le risposte anticipatorie ritmiche. L'ISI è uno schermo vuoto fra lo stimolo e il successivo (nessuna croce di fissazione). Hasegawa et al. (2021) hanno confrontato ISI di 400, 600, 800 e 1000 ms con stimolo di 250 ms: gli ISI brevi producono più errori di commissione e, a 400 ms, anche più omissioni sui Go, il che rende l'errore di commissione meno valido come indice di inibizione. L'intervallo 500–1000 ms evita la zona più critica (400 ms); lo stimolo di Sintropia (800 ms) è però più lungo di quello dello studio (250 ms), quindi il confronto è qualitativo. |
| **Vincolo anti-cluster No-Go** | **Mai più di 2 No-Go consecutivi** | **Scelta di progetto** (pseudo-randomizzazione). Garantito quando i No-Go non superano il doppio dei Go (sempre vero con i default); oltre, il vincolo non è realizzabile e i No-Go in eccesso si accodano (§4). Sequenze lunghe di No-Go indebolirebbero la prepotenza Go e consentirebbero un rallentamento strategico proattivo, alterando la misura dell'inibizione. Il vincolo mantiene la risposta Go dominante trial-per-trial. |
| **Numero trial di pratica** | **10 (con entrambi i tipi Go e No-Go)** | **Scelta di progetto.** La pratica deve includere almeno alcuni No-Go affinché il partecipante comprenda la regola di inibizione prima della fase sperimentale. Esclusi dall'analisi. |
| **Stimoli** | **Cerchio verde = Go; cerchio rosso = No-Go** | **Scelta di progetto**: mappatura intuitiva (semaforo: verde→vai, rosso→ferma); la diffusione dei cerchi colorati nei go/no-go computerizzati non è stata quantificata su una fonte. Caveat: la coppia verde/rosso **può non essere distinguibile** da chi ha una deficienza nella visione dei colori rosso-verde: per quei partecipanti il test va adattato (cambiando forma o luminanza). Altro caveat minore: la congruenza semantica verde/rosso può fornire un piccolo vantaggio di codifica; è accettabile e anzi rafforza la prepotenza del Go. Mantenere costanti dimensione, luminanza e posizione centrale. |
| **Tasto di risposta** | **Barra spaziatrice** | **Scelta di progetto.** Risposta a tasto singolo ("go response" unimanuale): il partecipante preme sul Go e trattiene sul No-Go. Standard per il go/no-go a risposta singola. |

---

## 4. Mappatura implementativa

Corrispondenza fra i parametri della tabella §3 e il codice (`src/engine/tests/gonogo.ts`, `src/config/defaults.ts`,
`src/ui/tests/GoNoGoView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Parametri | `DEFAULTS.gonogo` | `nTrials 80`, `goRatio 0.75`, `stimulusMs 800`, `isiMinMs 500`, `isiMaxMs 1000`, `practiceTrials 10`; modificabili in Impostazioni e scritti in ogni esportazione |
| Conteggio Go / No-Go | `generateGoNoGo` | `nGo = round(nTrials · goRatio)` (60), `nNoGo = nTrials − nGo` (20): il rapporto è **esatto**, non probabilistico |
| Ordine | `arrangeKinds` | Disposizione casuale (RNG con seme) con vincolo di **non più di 2 No-Go consecutivi** e **primo trial sempre Go**; un tentativo che richiederebbe una terza No-Go di fila viene scartato. Se dopo 500 tentativi non si trova una disposizione valida, ripiega su una disposizione deterministica: dopo ogni Go una quota uniforme di No-Go, al massimo 2; solo se `nNoGo > 2·nGo` (vincolo irrealizzabile) i No-Go in eccesso si accodano in fondo |
| ISI | `generateGoNoGo` | Un valore intero uniforme in [`isiMinMs`, `isiMaxMs`] per ogni trial, schermo vuoto |
| Stimolo e finestra | `GoNoGoView` | Cerchio verde (Go) o rosso (No-Go) al centro, visibile per tutti gli 800 ms; la finestra di risposta coincide con la durata dello stimolo e **il trial non termina alla pressione** (`endOnResponse: false`) |
| Risposta | `GoNoGoView` | Barra spaziatrice. Go corretto = pressione nella finestra; No-Go corretto = nessuna pressione |
| Classificazione RT | `classifyRt` | `INTERRUPTED → OMISSION → ANTICIPATION (< 150 ms) → VALID` (vedi [validazione RT](validazione-rt.md)) |
| Pratica | `GoNoGoView` | 10 trial con feedback, stessa generazione con seme `seed + 1`; esclusi dalle metriche (`phase = 'practice'`) |
| Metriche | `scoreGoNoGo` | Solo trial `phase = 'test'`; formule in §5 |

Punti da conoscere:

- Una pressione su un No-Go **con RT < 150 ms** è comunque un errore di commissione (e viene anche contata come
  anticipazione): il partecipante ha risposto.
- Una risposta anticipata su un Go **conta come hit** nel calcolo di d′ ma non entra negli RT (§5).
- Una risposta si riconosce dalla **risposta registrata**, non dal flag: il sequencer marca `VALID` anche un No-Go correttamente trattenuto (nessuna pressione), che non è una commissione.
- I trial interrotti (perdita di focus o visibilità della pagina) restano nei dati grezzi col flag `INTERRUPTED` ma sono
  esclusi da numeratori e denominatori.

---

## 5. Metriche e formule

Notazione: sia $N_{go}$ il numero di trial Go **non interrotti** e $N_{nogo}$ il numero di trial No-Go non interrotti
(pratica esclusa). Una risposta si considera **anticipazione** se $RT < RT_{min}$ con $RT_{min} = 150\,\text{ms}$,
la soglia comune a tutta la piattaforma (in altre tradizioni si usano 100 ms): tempi inferiori non possono essere
guidati dallo stimolo e vanno esclusi dal calcolo di RT medio/SD.

### 5.1 Errori di commissione (inibizione — misura primaria)
Risposta emessa su un trial **No-Go** (falso allarme = fallimento inibitorio).

$$\text{Commissioni}\;(\%) = \frac{n_{\text{risposte su No-Go}}}{N_{nogo}} \times 100$$

Interpretazione: indice diretto del **cedimento dell'inibizione motoria**. Valore atteso non nullo per
design tarato sulla prepotenza (un tasso ~0% suggerisce compito troppo lento/facile; un tasso molto alto,
strategia troppo impulsiva o incomprensione della regola).

### 5.2 Errori di omissione (attenzione sostenuta)
Mancata risposta su un trial **Go** (nessuna pressione entro la finestra di 800 ms).

$$\text{Omissioni}\;(\%) = \frac{n_{\text{Go senza risposta}}}{N_{go}} \times 100$$

Interpretazione: **non** misura inibizione, ma lapsi attentivi / criterio troppo conservativo. Da riportare
separatamente dalle commissioni.

### 5.3 RT medio e deviazione standard dei Go corretti *validi*
Insieme dei RT considerati: trial **Go con risposta corretta**, con $RT_{min} \le RT \le 800\,\text{ms}$
(escludendo anticipazioni e non-risposte; il limite superiore di 800 ms è la finestra di risposta). Sia questo insieme $\{RT_i\}_{i=1}^{n}$.

$$\overline{RT} = \frac{1}{n}\sum_{i=1}^{n} RT_i
\qquad
SD_{RT} = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}\left(RT_i - \overline{RT}\right)^2}$$

Interpretazione: $\overline{RT}$ = velocità di elaborazione/prepotenza (RT bassi = risposta più
automatizzata); $SD_{RT}$ = **stabilità attentiva** (alta variabilità = attenzione fluttuante). Si riporta anche il
coefficiente di variazione $CV = 100 \cdot SD_{RT}/\overline{RT}$ (in %), che normalizza la variabilità sulla velocità
media.

### 5.4 Anticipazioni
Risposte con $RT < 150\,\text{ms}$, non guidate dallo stimolo. Si riporta il **numero** di trial di test con
flag `ANTICIPATION` (sia su Go sia su No-Go).

Interpretazione: indice di risposta impulsiva/ritmica non stimolo-dipendente; le anticipazioni vanno
**escluse** dal calcolo di $\overline{RT}$ e $SD_{RT}$ (§5.3) e monitorate come indicatore di qualità dei dati.

### 5.5 Sensibilità $d'$ e criterio $c$
Per un indice unico che combina hit sui Go e corrette inibizioni sui No-Go si può usare la sensibilità della
Teoria della Detezione del Segnale $d'$, trattando la risposta sul Go come "hit" e la commissione sul No-Go
come "falso allarme":

$$d' = z(H) - z(F) \qquad c = -\tfrac{1}{2}\left[z(H) + z(F)\right]$$

con $H = (n_{\text{hit}} + 0{,}5)/(N_{go} + 1)$ e $F = (n_{\text{FA}} + 0{,}5)/(N_{nogo} + 1)$ (correzione loglinear, applicata
**sempre**: Hautus, 1995), e $z(\cdot)$ inversa della CDF normale standard. Un *hit* è qualunque risposta su un Go
(anticipazioni comprese), un *falso allarme* è qualunque risposta su un No-Go. $c > 0$ indica un criterio
conservativo (tendenza a non rispondere), $c < 0$ uno liberale. Il $d'$ separa la sensibilità dalla strategia di
risposta; le metriche §5.1–5.4 restano quelle di riferimento. Il calcolo è condiviso con l'N-Back
(`src/engine/sdt.ts`).

> Hautus, M. J. (1995). *Corrections for extreme proportions and their biasing effects on estimated values of
> d′.* **Behavior Research Methods, Instruments, & Computers, 27**(1), 46–51. https://doi.org/10.3758/BF03203619

## Cronologia delle revisioni

- **2026-10-30 (riverifica riga per riga).** Riletti su Europe PMC gli abstract di Verbruggen & Logan (2008), Wessel
  (2018: ~40% di studi equiprobabili, ~20% con intervalli > 4 s, riduzione del 75%), Wilson et al. (2016: 30 partecipanti,
  proporzioni .50–.95) e Hasegawa et al. (2021: N = 213, ISI 400–1000 ms, stimolo 250 ms): le affermazioni del paper
  coincidono. Rimossi il «Confermato con caveat» e il «minimo ragionevole» di 20 No-Go (senza fonte) dalla riga del numero
  di trial; la proporzione 75/25 è ora «coerente con le fonti» e non «confermata»; attenuata la diffusione dei cerchi
  colorati. Aggiunto alla riga della proporzione che la probabilità di No-Go delle condizioni rare di Wessel non è
  verificata sul testo.
- **2026-10-30 (revisione delle fonti).** Il contributo di Verbruggen e Logan (2008) è ora descritto come nel loro riassunto
  (inibizione automatica da associazioni stimolo-stop; non equivalenza fra go/no-go e stop-signal), senza attribuire loro la
  crescita della prepotenza con la frequenza dei Go. Le righe di §3 senza fonte sono marcate come scelte di progetto;
  descritti il ripiego deterministico e il caso in cui il vincolo anti-cluster non è realizzabile.

- **2026-10 (correzione).** Le commissioni e le omissioni erano dedotte dal flag di validazione, così un No-Go
  correttamente trattenuto (`VALID` senza risposta) veniva contato come commissione. Ora si usa la risposta registrata;
  aggiunto un test di regressione con i dati come li produce il sequencer.
- **Revisione scientifica 2026-10.** Citazione di Hasegawa et al. (2021) corretta (autori, fascicolo, pagine) e
  affermazioni non verificate rimosse; soglia di anticipazione allineata a 150 ms; metriche di commissione e omissione
  calcolate escludendo i trial interrotti; aggiunti $d'$ e criterio $c$; aggiunta la nota sul daltonismo rosso-verde.
- **Sequenza.** Il **primo trial è sempre un Go**, per instaurare la risposta
  prepotente prima di ogni possibile inibizione; resta il vincolo di ≤ 2 No-Go
  consecutivi.
- **Metriche.** Aggiunto il **CV del RT dei Go** (`SD/media · 100`), indice
  normalizzato di variabilità intra-soggetto.
