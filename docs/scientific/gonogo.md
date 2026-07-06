# Go/No-Go Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **Go/No-Go Task**
> sulla piattaforma sperimentale universitaria CIRIAF.
> Costrutto misurato: **inibizione motoria rapida** (rapid response inhibition).
> Testo in italiano; citazioni riportate in lingua originale.

---

## 1. Paradigma e citazione primaria

Il **Go/No-Go Task** è un paradigma cronometrico di inibizione della risposta in cui allo stimolo
prevalente ("Go") il partecipante deve emettere una risposta motoria rapida e prepotente, mentre a uno
stimolo raro ("No-Go") deve **sopprimere** la risposta già innescata. La misura centrale è la capacità di
inibire un'azione automatizzata sotto pressione temporale — un indice di *controllo inibitorio prepotente*
distinto dall'inibizione reattiva "a segnale" dello Stop-Signal Task (in cui lo stop arriva *dopo* l'avvio
del movimento).

**Citazione primaria.**

> Verbruggen, F., & Logan, G. D. (2008). *Automatic and controlled response inhibition: Associative
> learning in the go/no-go and stop-signal paradigms.* **Journal of Experimental Psychology: General,
> 137**(4), 649–672. https://doi.org/10.1037/a0013170

Verbruggen e Logan dimostrano che, quando uno stimolo è **coerentemente associato all'azione di "andare"**,
si sviluppa con la pratica un'associazione stimolo→risposta automatica ("automatic response activation");
simmetricamente, l'inibizione può divenire in parte automatica quando uno stimolo è associato in modo
consistente allo "stop". Ne consegue che l'inibizione richiesta sul No-Go è tanto più impegnativa quanto più
la risposta Go è stata resa **prepotente** dall'alta frequenza e dalla rapidità dei trial Go.

**Riferimenti di supporto.**

> Wessel, J. R. (2018). *Prepotent motor activity and inhibitory control demands in different variants of
> the go/no-go paradigm.* **Psychophysiology, 55**(3), e12871. https://doi.org/10.1111/psyp.12871

> Wilson, K. M., Finkbeiner, K. M., de Joux, N. R., Russell, P. N., & Helton, W. S. (2016). *Go-stimuli
> proportion influences response strategy in a sustained attention to response task.* **Experimental Brain
> Research, 234**(10), 2989–2998. https://doi.org/10.1007/s00221-016-4701-x

> Hasegawa, C., et al. (2021). *Do shorter inter-stimulus intervals in the go/no-go task enable better
> assessment of response inhibition?* **Scandinavian Journal of Psychology, 62**(3), 431–441.
> https://doi.org/10.1111/sjop.12679

Origine cronometrica del paradigma (metodo sottrattivo dei tempi di reazione):

> Donders, F. C. (1868/1969). *On the speed of mental processes.* **Acta Psychologica, 30**, 412–431.
> https://doi.org/10.1016/0001-6918(69)90065-1

---

## 2. Meccanismo cognitivo misurato

Il Go/No-Go isola l'**inibizione motoria**: la soppressione, entro una finestra temporale ristretta, di una
risposta motoria già preparata e automatizzata.

- **Costruzione della prepotenza (ruolo dell'alta frequenza dei Go).** L'elevata proporzione di trial Go
  (tipicamente 70–80%) e il ritmo rapido di presentazione fanno sì che la risposta motoria diventi
  *prepotente*: viene innescata quasi automaticamente alla comparsa dello stimolo. Verbruggen & Logan (2008)
  formalizzano questo come apprendimento associativo stimolo→azione: più lo stimolo è consistentemente
  legato al "go", più forte è l'attivazione motoria automatica. Wilson et al. (2016) mostrano
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

Valori raccomandati per l'implementazione CIRIAF. I default proposti sono stati verificati contro la
letteratura; dove opportuno è indicata una nota di razionale o un caveat.

| Parametro | Valore adottato | Fonte / razionale |
|---|---|---|
| **Numero totale di trial** | **80** | Compromesso per una batteria breve. Confermato con caveat: i 20 trial No-Go sono il **minimo** ragionevole per una stima stabile degli errori di commissione; per protocolli dedicati alla sola inibizione si preferiscono ≥ 30–40 No-Go (Hasegawa et al., 2021 usano 4×120 = 480 trial). Per screening rapido multi-test, 80 è accettabile. |
| **Proporzione Go / No-Go** | **75% Go (60) / 25% No-Go (20)** | **Confermato.** Rapporto standard che crea prepotenza mantenendo abbastanza No-Go per stime stabili. Sostenuto da Wessel (2018) (No-Go rari necessari per attività motoria prepotente) e Wilson et al. (2016) (prepotenza cresce con la proporzione di Go). |
| **Durata stimolo / finestra di risposta** | **800 ms fissi** | **Confermato** come *response deadline* (deadline di risposta). Il ritmo rapido favorisce la prepotenza (Wessel, 2018). 800 ms è moderato-veloce: impone velocità senza tagliare troppe risposte lente valide. Nota: è la finestra entro cui la risposta è conteggiata come Go corretto. |
| **ISI (inter-stimulus interval) variabile** | **Uniforme 500–1000 ms (jitter)** | **Confermato.** La *variabilità* dell'ISI è l'elemento chiave: impedisce l'entrainment temporale e le risposte anticipatorie ritmiche. Intervallo entro il range standard; Hasegawa et al. (2021) indicano ~600 ms come ottimale e sconsigliano ISI ≤ 400 ms (errori di commissione inquinati da varianza non inibitoria). La media ~750 ms del range proposto è prudente. |
| **Vincolo anti-cluster No-Go** | **Mai più di 2 No-Go consecutivi** | **Confermato** come pseudo-randomizzazione. Sequenze lunghe di No-Go indebolirebbero la prepotenza Go e consentirebbero un rallentamento strategico proattivo, alterando la misura dell'inibizione. Il vincolo mantiene la risposta Go dominante trial-per-trial. |
| **Numero trial di pratica** | **10 (con entrambi i tipi Go e No-Go)** | **Confermato.** Coincide con il blocco di pratica di Hasegawa et al. (2021). La pratica deve includere almeno alcuni No-Go affinché il partecipante comprenda la regola di inibizione prima della fase sperimentale. Esclusi dall'analisi. |
| **Stimoli** | **Cerchio verde = Go; cerchio rosso = No-Go** | **Confermato** come mappatura comune e intuitiva (semaforo: verde→vai, rosso→ferma). Cerchi colorati sono standard (Hasegawa et al. 2021 usano cerchio bianco = Go, rosso = No-Go). Caveat minore: la congruenza semantica verde/rosso può fornire un piccolo vantaggio di codifica; è accettabile e anzi rafforza la prepotenza del Go. Mantenere costanti dimensione, luminanza e posizione centrale. |
| **Tasto di risposta** | **Barra spaziatrice** | **Confermato.** Risposta a tasto singolo ("go response" unimanuale): il partecipante preme sul Go e trattiene sul No-Go. Standard per il go/no-go a risposta singola. |

---

## 4. Mappatura implementativa

*Da completare — vedi `src/engine/tests/gonogo.ts`.*

<!--
Tracciare qui la corrispondenza fra i parametri della tabella §3 e le costanti/strutture del codice:
- costanti di temporizzazione (durata stimolo, range ISI, deadline)
- generatore di sequenza con vincolo anti-cluster (≤ 2 No-Go consecutivi)
- proporzione 75/25 e conteggio trial (60 Go / 20 No-Go + 10 pratica)
- mappatura stimoli (colore→condizione) e binding del tasto (Spazio)
- pipeline di logging degli eventi (onset stimolo, timestamp risposta, RT)
-->

---

## 5. Metriche e formule

Notazione: sia $N_{go}$ il numero di trial Go validi presentati e $N_{nogo}$ il numero di trial No-Go.
Una risposta si considera **anticipazione** se $RT < RT_{min}$ (soglia di plausibilità fisiologica; si adotta
$RT_{min} = 100\,\text{ms}$, in alcune tradizioni 150 ms): tempi inferiori non possono essere guidati dallo
stimolo e vanno esclusi dal calcolo di RT medio/SD.

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
(escludendo anticipazioni e non-risposte). Sia questo insieme $\{RT_i\}_{i=1}^{n}$.

$$\overline{RT} = \frac{1}{n}\sum_{i=1}^{n} RT_i
\qquad
SD_{RT} = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}\left(RT_i - \overline{RT}\right)^2}$$

Interpretazione: $\overline{RT}$ = velocità di elaborazione/prepotenza (RT bassi = risposta più
automatizzata); $SD_{RT}$ = **stabilità attentiva** (alta variabilità = attenzione fluttuante). Opzionale il
coefficiente di variazione $CV = SD_{RT}/\overline{RT}$.

### 5.4 Anticipazioni
Risposte con $RT < RT_{min}$ (es. < 100 ms), non guidate dallo stimolo.

$$\text{Anticipazioni}\;(\%) = \frac{n_{RT < RT_{min}}}{N_{go}} \times 100$$

Interpretazione: indice di risposta impulsiva/ritmica non stimolo-dipendente; le anticipazioni vanno
**escluse** dal calcolo di $\overline{RT}$ e $SD_{RT}$ (§5.3) e monitorate come indicatore di qualità dei dati.

### 5.5 (Opzionale) Indice integrato di sensibilità
Per un indice unico che combina hit sui Go e corrette inibizioni sui No-Go si può usare la sensibilità della
Teoria della Detezione del Segnale $d'$, trattando la risposta sul Go come "hit" e la commissione sul No-Go
come "falso allarme":

$$d' = z(\text{hit rate}) - z(\text{false-alarm rate})$$

dove $z(\cdot)$ è l'inversa della CDF normale standard (con correzione per rate pari a 0 o 1). Utile come
misura riassuntiva; le metriche §5.1–5.4 restano quelle di riferimento per il report.
