# N-Back Task (2-back) — Riferimenti scientifici

> Documento scientifico di riferimento per la piattaforma sperimentale Sintropia.
> Variante impiegata: **2-back verbale (lettere), single n-back**, risposta go/no-go.

---

## 1. Paradigma e citazione primaria

Il compito **N-Back** richiede al partecipante di monitorare un flusso continuo di
stimoli presentati in sequenza e di segnalare ogni volta che lo stimolo corrente è
identico a quello comparso **n posizioni prima**. Nella variante **2-back** il
riferimento è lo stimolo presentato **due passi indietro** nella sequenza.

Il paradigma nasce con:

> Kirchner, W. K. (1958). *Age differences in short-term retention of rapidly
> changing information.* **Journal of Experimental Psychology, 55**(4), 352–358.
> DOI: [10.1037/h0043688](https://doi.org/10.1037/h0043688)

Kirchner introduce il compito come misura della *"short-term retention of rapidly
changing information"*: la traccia mnestica non è statica ma deve essere
continuamente aggiornata mentre nuova informazione arriva, così che l'item
rilevante scivola progressivamente indietro nella sequenza. È questa proprietà di
**flusso continuo** a distinguere l'N-Back dai compiti di span classici.

Le proprietà psicometriche del paradigma come misura della memoria di lavoro (WM) sono discusse in:

> Jaeggi, S. M., Buschkuehl, M., Perrig, W. J., & Meier, B. (2010). *The concurrent
> validity of the N-back task as a working memory measure.* **Memory, 18**(4),
> 394–412. DOI: [10.1080/09658211003702171](https://doi.org/10.1080/09658211003702171)

Jaeggi et al. (2010) hanno rivisto la letteratura e condotto tre esperimenti con varianti del compito (stimoli e carichi
diversi). Concludono che l'N-back **non è una misura utile delle differenze individuali** di memoria di lavoro,
in parte per **affidabilità insufficiente**, ma resta utile nella **ricerca sperimentale** sulla WM e predice
differenze individuali in altre funzioni cognitive superiori, come l'intelligenza fluida, specie ai carichi alti.
Questo orienta l'uso del test su Sintropia: è adatto a confronti **entro i partecipanti tra condizioni** (per esempio
due condizioni ambientali), meno a classificare le persone con un punteggio singolo (§6).

Il correlato neurale del compito è consolidato dalla meta-analisi di neuroimaging:

> Owen, A. M., McMillan, K. M., Laird, A. R., & Bullmore, E. (2005). *N-back working
> memory paradigm: A meta-analysis of normative functional neuroimaging studies.*
> **Human Brain Mapping, 25**(1), 46–59.
> DOI: [10.1002/hbm.20131](https://doi.org/10.1002/hbm.20131)

---

## 2. Meccanismo cognitivo

L'N-Back sollecita simultaneamente i tre processi centrali della memoria di lavoro:

1. **Mantenimento** attivo di una traccia ordinata degli ultimi *n* item.
2. **Aggiornamento continuo** (*updating*): a ogni nuovo stimolo la traccia va
   ri-organizzata — l'item più vecchio viene scartato, gli altri "scalano" di una
   posizione e il nuovo item entra in coda. È il carico di updating, più del semplice
   immagazzinamento, a rendere il compito impegnativo.
3. **Confronto e binding temporale**: lo stimolo corrente va confrontato con la
   rappresentazione mantenuta *n* passi indietro, il che richiede di legare ogni item
   alla sua posizione seriale (binding item–posizione) e non solo di riconoscerne la
   familiarità.

Poiché lo stream è ininterrotto, il sistema deve gestire in parallelo codifica del
nuovo item, ricalcolo delle posizioni e decisione di risposta, sotto pressione
temporale. La meta-analisi di **Owen et al. (2005)**, su 668 insiemi di coordinate di attivazione tratti da 24 studi,
trova attivazioni consistenti in regioni **frontali e parietali** — premotorie, prefrontali, cingolate e parietali
posteriori — in linea di massima simili tra compiti verbali e non verbali e tra monitoraggio dell'identità e della
posizione, con qualche indizio di pattern fronto-parietali distinti fra le varianti. Le
localizzazioni sono un risultato di gruppo sul paradigma, non una mappatura dei punteggi individuali.

Un punto metodologico critico riguarda la **strategia di familiarità**: un
partecipante può rispondere "target" semplicemente perché uno stimolo *sembra
familiare*, senza recuperarne la posizione seriale esatta. Per contrastare la sola
familiarità si introducono **lure** (esche), cioè non-target che ripetono una lettera a un lag vicino a *n* (§3).
Kane et al. (2007) hanno mostrato, in 2-back e 3-back verbali, che le esche portano più **falsi allarmi** delle
altre lettere non-target, e che nel 3-back portano anche più mancati sui target immediatamente successivi: segno che il
compito richiede di **controllare le risposte basate sulla familiarità**.

> Kane, M. J., Conway, A. R. A., Miura, T. K., & Colflesh, G. J. H. (2007). *Working
> memory, attention control, and the N-back task: A question of construct validity.*
> **Journal of Experimental Psychology: Learning, Memory, and Cognition, 33**(3),
> 615–622. DOI: [10.1037/0278-7393.33.3.615](https://doi.org/10.1037/0278-7393.33.3.615)

Lo stesso lavoro riporta anche che l'N-back correla **solo debolmente** con un compito di operation span, quindi i due
non misurano necessariamente lo stesso costrutto: l'N-back ha validità di facciata come compito di WM ma non
validità convergente con almeno una misura consolidata.

---

## 3. Parametri adottati

La colonna *Origine* distingue fonti primarie, prassi e **scelte di progetto**.

| Parametro | Valore | Origine e razionale |
|---|---|---|
| **n (livello)** | **2** (2-back); modificabile da 1 a 3 | **Scelta di progetto**: carico intermedio che richiede aggiornamento continuo. Le istruzioni e il suggerimento a schermo seguono il valore scelto. |
| **Durata lettera** | **500 ms** | **Scelta di progetto**: tempo sufficiente per la codifica visiva di una lettera. |
| **Schermo vuoto** | **1500 ms** | **Scelta di progetto**. Con la lettera dà un trial di **2000 ms**. La risposta è valida per tutta la durata del trial (lettera + schermo vuoto). |
| **N. trial** | **360** (≈ 12 min) | **Scelta di progetto**: blocco lungo per osservare la stabilità nel tempo (quartili, §5.5). 360 × 2 s = 720 s. Un blocco così lungo mescola memoria di lavoro e cali di vigilanza: va tenuto presente nell'interpretazione. |
| **Target rate** | **30%** dei trial idonei (≥ n) | **Scelta di progetto**. Su 360 trial: 107 target (30% di 358 trial idonei) e 253 non-target. Numero **fisso**, per ridurre la varianza tra blocchi. |
| **Posizione dei target** | Casuale, **mai due target adiacenti** (vincolo rilassato solo se necessario), mai nelle prime n posizioni | **Scelta di progetto**: evita artefatti da sequenze di target consecutivi. |
| **Lure** | **20%** dei non-target (`lureRate`), a **lag n−1 o n+1** (per il 2-back: lag 1 o 3), scelti a caso fra i lag possibili | Kane et al. (2007) usano come esche gli item che ricorrono **una posizione prima** (lag n−1). L'aggiunta di n+1 e la quota del 20% sono **scelte di progetto**. Gli altri non-target **evitano** ripetizioni a quei lag, così i lure sono esattamente quelli pianificati. |
| **Pratica** | **20 trial** con feedback | **Scelta di progetto**; esclusi dalle metriche. |
| **Lettere** | **16 consonanti**: B C D F G H L M N P Q R S T V Z | **Scelta di progetto**: vocali escluse per evitare sillabe e parole pronunciabili; escluse anche J K W X Y per ridurre confusioni visive e fonetiche. |
| **Tasto** | **Barra spaziatrice** solo sui target | Paradigma di tipo go/no-go: i non-target richiedono di trattenere la risposta. |

---

## 4. Mappatura implementativa

Corrispondenza fra §3 e il codice (`src/engine/tests/nback.ts`, `src/engine/sdt.ts`, `src/config/defaults.ts`, `src/ui/tests/NBackView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Parametri | `DEFAULTS.nback` | `n 2`, `letterMs 500`, `blankMs 1500`, `nTrials 360`, `targetRate 0.3`, `lureRate 0.2`, `practiceTrials 20` |
| Numero target | `generateNBack` | `round((nTrials − n) · targetRate)` |
| Posizioni target | `chooseTargetPositions` | Estrazione casuale (RNG con seme) con vincolo di non adiacenza; se non basta, il vincolo viene rilassato |
| Posizioni lure | `chooseLurePositions` | Estrazione casuale fra i non-target che hanno disponibili entrambi i lag; numero `round(non-target · lureRate)` |
| Lettere | `generateNBack` | Target: copia la lettera a lag n. Lure: copia quella a lag n−1 o n+1 se diversa da quella a lag n (altrimenti sarebbe un target). Altro: lettera che evita lag n, n−1 e n+1 |
| Etichette | `generateNBack` | `isTarget` e `isLure` sono **ricalcolati** dalla sequenza finale, quindi coincidono sempre con ciò che il partecipante vede |
| Condizioni nei dati | `NBackView` | `target`, `lure`, `nontarget` per ogni trial |
| Finestra di risposta | `NBackView` | 2000 ms (lettera + schermo vuoto), senza chiusura alla pressione |
| Compatibilità | `generateNBack` | I modelli di sessione salvati prima dei lure non hanno `lureRate`: valgono 0 lure, come in precedenza |
| Metriche | `scoreNBack` | Solo trial di test; i trial interrotti sono esclusi dai conteggi. Formule in §5 |

Una versione precedente del generatore **evitava** i lure invece di inserirli: la familiarità recente era quindi un
indizio perfetto per il target. Il difetto è stato corretto (vedi cronologia).

---

## 5. Metriche e formule

### 5.1 Classificazione delle risposte (per trial)

| Evento | Definizione |
|---|---|
| **Hit** | Pressione della barra spaziatrice su un **target** (entro la finestra di risposta). |
| **Miss / Omissione** | Nessuna risposta su un **target**. |
| **Falso allarme (FA)** | Pressione su un **non-target** (inclusi i **lure**). Il tasso di FA sui soli lure si riporta a parte. |
| **Rifiuto corretto (CR)** | Nessuna risposta su un **non-target**. |

Con `nTarget` = numero di target e `nNonTarget` = numero di non-target nel blocco:

- **Hit rate** grezzo: `H = nHit / nTarget`
- **False-alarm rate** grezzo: `F = nFA / nNonTarget`
- Vincoli: `nHit + nMiss = nTarget` e `nFA + nCR = nNonTarget`.

### 5.2 Sensibilità: d′ (d-prime)

La sensibilità percettivo-mnestica è misurata con **d′** della Teoria della Detezione
del Segnale (SDT), che separa la capacità discriminativa dal criterio di risposta:

```
d′ = z(H) − z(F)
```

dove **z(·)** è la funzione quantile della normale standard (inversa della CDF,
funzione *probit*), `H` è l'hit rate e `F` il false-alarm rate.

### 5.3 Correzione loglinear (per evitare valori infiniti)

Quando `H = 1` oppure `F = 0`, `z(·)` diverge a ±∞ e d′ risulta indefinito —
situazione frequente con pochi trial o prestazioni estreme. Si adotta quindi la
**correzione loglinear** di Hautus (1995), applicata **sempre** (non solo ai casi
estremi), aggiungendo 0.5 a hit e falsi allarmi e 1 al totale dei trial di segnale e
di rumore **prima** di calcolare i tassi:

```
H_ll = (nHit + 0.5) / (nTarget + 1)
F_ll = (nFA  + 0.5) / (nNonTarget + 1)

d′   = z(H_ll) − z(F_ll)
```

> Hautus, M. J. (1995). *Corrections for extreme proportions and their biasing effects
> on estimated values of d′.* **Behavior Research Methods, Instruments, & Computers,
> 27**(1), 46–51. DOI: [10.3758/BF03203619](https://doi.org/10.3758/BF03203619)

*(Complementare — criterio di risposta / bias, opzionale):*

```
c = −0.5 · ( z(H_ll) + z(F_ll) )
```

valori positivi indicano un criterio conservativo (tende a non premere), negativi un
criterio liberale.

### 5.4 Tempi di risposta (RT)

Calcolati **solo sui hit validi** (target correttamente rilevati), escludendo omissioni
e falsi allarmi:

- **RT medio** dei hit: `mean(RT_hit)`
- **Deviazione standard** dei hit: `sd(RT_hit)`

Un hit con $RT < 150\,\text{ms}$ è classificato come anticipazione: conta come hit nei conteggi e nel $d'$, ma non
entra negli RT. Non si applicano altri scarti di outlier.

### 5.5 Analisi per quartili temporali del blocco (stabilità nel tempo)

Il blocco è suddiviso in **4 quartili** contigui di trial (~90 trial, ~3 min ciascuno), il più bilanciati possibile: se
il numero di trial non è divisibile per 4, i primi `n mod 4` quartili hanno un trial in più (nessun quartile resta vuoto). Per ogni quartile la
piattaforma riporta il `d′`, con la correzione loglinear applicata ai conteggi del singolo quartile. Hit, falsi allarmi
e RT per quartile non sono calcolati nel riepilogo ma si ricavano dai dati grezzi (una riga per trial, con condizione,
risposta e flag).

Il confronto Q1→Q4 indica un eventuale calo nel tempo (vigilanza, affaticamento). Con circa 27 target e 63 non-target
per quartile (107 e 253 sul blocco), il $d'$ di un quartile è una stima **rumorosa**: va letto come tendenza, non come misura puntuale.

### 5.6 Falsi allarmi sui lure

`Falsi allarmi su lure` e `Tasso di falsi allarmi su lure` $= 100 \cdot n_{\text{FA su lure}} / n_{\text{lure}}$ misurano
quanto la risposta è guidata dalla familiarità (Kane et al., 2007). Un tasso sui lure molto più alto di quello sugli altri
non-target indica una strategia basata sulla familiarità. I lure contano anche come non-target nel calcolo di $F$ e di $d'$.

---

## 6. Limiti e cautele

- **Affidabilità e differenze individuali.** Jaeggi et al. (2010) trovano l'affidabilità insufficiente per usare
  l'N-back come misura individuale di WM. Su Sintropia i risultati sono più difendibili come confronto **tra condizioni
  nello stesso partecipante** che come punteggio assoluto.
- **Validità convergente.** Kane et al. (2007) riportano una correlazione debole con l'operation span: l'N-back non è
  intercambiabile con altri compiti di WM.
- **Blocco lungo.** 12 minuti confondono memoria di lavoro e vigilanza.
- **Un solo livello e un solo tipo di stimolo** (lettere): nessuna generalizzazione ad altri carichi o a stimoli spaziali.
- **Tempi di risposta in browser**: vedi [validazione RT](validazione-rt.md).

---

### Riferimenti (elenco)

- Kirchner, W. K. (1958). *Age differences in short-term retention of rapidly changing information.* **Journal of Experimental Psychology, 55**(4), 352–358. DOI: [10.1037/h0043688](https://doi.org/10.1037/h0043688)
- Jaeggi, S. M., Buschkuehl, M., Perrig, W. J., & Meier, B. (2010). *The concurrent validity of the N-back task as a working memory measure.* **Memory, 18**(4), 394–412. DOI: [10.1080/09658211003702171](https://doi.org/10.1080/09658211003702171)
- Owen, A. M., McMillan, K. M., Laird, A. R., & Bullmore, E. (2005). *N-back working memory paradigm: A meta-analysis of normative functional neuroimaging studies.* **Human Brain Mapping, 25**(1), 46–59. DOI: [10.1002/hbm.20131](https://doi.org/10.1002/hbm.20131)
- Kane, M. J., Conway, A. R. A., Miura, T. K., & Colflesh, G. J. H. (2007). *Working memory, attention control, and the N-back task: A question of construct validity.* **Journal of Experimental Psychology: LMC, 33**(3), 615–622. DOI: [10.1037/0278-7393.33.3.615](https://doi.org/10.1037/0278-7393.33.3.615)
- Hautus, M. J. (1995). *Corrections for extreme proportions and their biasing effects on estimated values of d′.* **Behavior Research Methods, Instruments, & Computers, 27**(1), 46–51. DOI: [10.3758/BF03203619](https://doi.org/10.3758/BF03203619)

## Cronologia delle revisioni

- **Revisione scientifica 2026-10.** **Corretto un difetto del generatore**: i lure a lag n−1 e n+1 erano evitati
  invece che inseriti, contro lo scopo dichiarato nel paper e rendendo la familiarità un indizio perfetto. Ora una
  quota `lureRate` (20%) dei non-target è composta da lure e il riepilogo riporta i falsi allarmi su lure.
  Verificati su Crossref/Europe PMC tutti i riferimenti; riscritte le affermazioni non verificate (Jaeggi, Owen,
  Kane); aggiunta la sezione dei limiti con l'affidabilità. Le istruzioni e il suggerimento a schermo seguono ora il
  livello n scelto (prima erano fissi a 2). Il paper dichiarava hit, FA e RT per quartile, mentre il codice calcola solo
  il d′: allineato al codice.
- **Criterio c.** Accanto a **d′** viene ora riportato il **criterio decisionale c** (bias di
  risposta), con la stessa correzione loglinear di Hautus:
  `c = −0.5 · (z(H) + z(F))`. `c > 0` indica un criterio conservativo (tende a non
  rispondere), `c < 0` liberale; separa la *tendenza di risposta* dalla
  *sensibilità* (d′). Restano d′ globale e per quartile temporale.
- **2026-10-30.** Quartili bilanciati documentati (corretto in `splitIntoChunks` l'ultimo quartile che poteva restare
  vuoto); corretti i conteggi per quartile (circa 27 target e 63 non-target); attenuate le sintesi di Jaeggi et al. (2010)
  («in parte» per affidabilità insufficiente) e di Owen et al. (2005), come nei riassunti.
