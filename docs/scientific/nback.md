# N-Back Task (2-back) — Riferimenti scientifici

> Documento scientifico di riferimento per la piattaforma sperimentale CIRIAF.
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

La validità del paradigma come misura della memoria di lavoro (WM) e le sue
proprietà psicometriche sono discusse in:

> Jaeggi, S. M., Buschkuehl, M., Perrig, W. J., & Meier, B. (2010). *The concurrent
> validity of the N-back task as a working memory measure.* **Memory, 18**(4),
> 394–412. DOI: [10.1080/09658211003702171](https://doi.org/10.1080/09658211003702171)

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
temporale. La meta-analisi di **Owen et al. (2005)** localizza in modo robusto questi
processi in una rete **fronto-parietale** bilaterale — corteccia prefrontale
dorsolaterale e ventrolaterale, corteccia parietale (lobulo parietale inferiore e
precuneo), area premotoria/motoria supplementare e corteccia cingolata — coerente con
l'ipotesi che l'N-Back indicizzi le componenti esecutive della WM.

Un punto metodologico critico riguarda la **strategia di familiarità**: un
partecipante può rispondere "target" semplicemente perché uno stimolo *sembra
familiare*, senza recuperarne la posizione seriale esatta. Per forzare il vero
processo di updating/binding è necessario introdurre **lure** (esche), cioè item che
ricompaiono a un lag diverso da *n* (vedi §3). Jaeggi et al. (2010) e la letteratura
sulla validità di costrutto sottolineano che il controllo dei lure è ciò che rende
l'N-Back una misura esecutiva e non un semplice compito di riconoscimento.

> Riferimento sul ruolo dei lure e sulla validità di costrutto:
> Kane, M. J., Conway, A. R. A., Miura, T. K., & Colflesh, G. J. H. (2007). *Working
> memory, attention control, and the N-back task: A question of construct validity.*
> **Journal of Experimental Psychology: Learning, Memory, and Cognition, 33**(3),
> 615–622. DOI: [10.1037/0278-7393.33.3.615](https://doi.org/10.1037/0278-7393.33.3.615)

---

## 3. Parametri adottati

| Parametro | Valore | Fonte / razionale |
|---|---|---|
| **n (livello)** | **2** (2-back) | Kirchner (1958); il livello 2 è il carico standard di riferimento — sufficientemente impegnativo da caricare l'updating senza produrre effetti pavimento tipici di 3-back/4-back nella popolazione generale. |
| **Durata presentazione lettera** | **500 ms** | Valore standard nelle implementazioni di riferimento (es. neurobs Psychlab, Jaeggi et al. 2010). Tempo sufficiente per la codifica senza favorire la reiterazione articolatoria prolungata. |
| **Durata schermo vuoto / blank (ISI)** | **1500 ms** | Intervallo inter-stimolo entro il range della letteratura (≈1000–2500 ms). Con 500 ms di stimolo dà un **trial di 2000 ms (2 s)** = SOA. Ritmo abbastanza rapido da imporre "rapidly changing information" (Kirchner) ma compatibile con RT affidabili. |
| **Durata trial (SOA)** | **2000 ms** (500 + 1500) | Derivato. |
| **N. trial (blocco)** | **360 trial** (≈ **12 min**) | Scelta di piattaforma: il protocollo CIRIAF richiede blocchi di ≥10–15 min per valutare la **tenuta della traccia mnestica nel tempo**. 360 × 2 s = 720 s = 12 min. Nota: gli studi classici usano blocchi brevi (20–64 trial); qui il blocco è deliberatamente esteso per l'analisi di stabilità temporale (§5, quartili). |
| **Target rate** | **~30%** dei trial (numero fisso di target per blocco) | Coerente con Jaeggi et al. (2010) e con la pratica prevalente (~25–35%). Su 360 trial ⇒ ~108 target e ~252 non-target. Un numero **fisso** e bilanciato di target riduce la varianza tra blocchi/soggetti. |
| **Controllo lure** | **Lure a lag 1 (1-back) e lag 3 (3-back)**, cioè n±1 | Essenziale per neutralizzare la strategia di familiarità. Per il 2-back gli item interferenti sono quelli che ricompaiono **una posizione prima (1-back)** o **una dopo (3-back)** rispetto al target: sono familiari ma **non** sono target. Quota consigliata di lure ~15–25% dei non-target. Rif.: Jaeggi et al. (2010); Kane et al. (2007). |
| **N. trial di pratica** | **20 trial** | Blocco di familiarizzazione con feedback, escluso dall'analisi. Sufficiente a stabilizzare la comprensione della regola 2-back e della risposta go/no-go. |
| **Set di stimoli (lettere)** | **Consonanti** — vocali (A, E, I, O, U) **escluse** | Escludere le vocali impedisce la formazione involontaria di parole/sillabe pronunciabili e il chunking fonologico, mantenendo il carico sull'updating. Set consigliato: `B C D F G H J K L M N P Q R S T V W X Y Z` (evitando eventuali coppie visivamente/foneticamente confondibili). Caratteri maiuscoli, font monospaziato, centrati. |
| **Tasto di risposta** | **Barra spaziatrice** — pressione **solo sui target** | Paradigma **go/no-go**: si preme la barra spaziatrice quando lo stimolo corrente è uguale a quello di 2 posizioni prima; sui non-target **non si preme** (risposta trattenuta). Semplifica la mappatura motoria e isola falsi allarmi vs omissioni. |

**Sintesi del blocco:** 2-back, lettere consonantiche, 500 ms stimolo + 1500 ms blank
(2 s/trial), 360 trial (~12 min), ~30% target, lure a lag 1 e 3, 20 trial di pratica,
risposta go/no-go con barra spaziatrice.

---

## 4. Mappatura implementativa

*Da completare — vedi `src/engine/tests/nback.ts`.*

(Questa sezione collegherà i parametri di §3 ai simboli/costanti del motore
sperimentale: timing dello scheduler, generazione della sequenza con vincolo sul
numero di target e sull'inserimento controllato dei lure a lag 1/3, mappatura del
tasto e finestra di raccolta della risposta, logging per-trial.)

---

## 5. Metriche e formule

### 5.1 Classificazione delle risposte (per trial)

| Evento | Definizione |
|---|---|
| **Hit** | Pressione della barra spaziatrice su un **target** (entro la finestra di risposta). |
| **Miss / Omissione** | Nessuna risposta su un **target**. |
| **Falso allarme (FA)** | Pressione su un **non-target** (inclusi i **lure**). |
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
> 27**, 46–51. DOI: [10.3758/BF03203619](https://doi.org/10.3758/BF03203619)

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

Opzionale: scarto degli outlier (es. RT < 150 ms come risposte anticipatorie, o oltre
±3 SD) prima del calcolo.

### 5.5 Analisi per quartili temporali del blocco (stabilità nel tempo)

Poiché il blocco è esteso (~12 min) proprio per valutare la **tenuta della traccia
mnestica**, il blocco viene suddiviso in **4 quartili temporali** (Q1–Q4, ~90 trial /
~3 min ciascuno). Per ogni quartile si ricalcolano:

- `d′` (con correzione loglinear applicata sui conteggi del singolo quartile),
- hit rate, false-alarm rate,
- RT medio e SD dei hit.

Il confronto Q1→Q4 quantifica l'eventuale **decremento da vigilanza / affaticamento**
(calo di d′, aumento di FA o di RT) rispetto a una prestazione stabile, fornendo un
indice della robustezza temporale della memoria di lavoro oltre alla prestazione
media.

---

### Riferimenti (elenco)

- Kirchner, W. K. (1958). *Age differences in short-term retention of rapidly changing information.* **Journal of Experimental Psychology, 55**(4), 352–358. DOI: [10.1037/h0043688](https://doi.org/10.1037/h0043688)
- Jaeggi, S. M., Buschkuehl, M., Perrig, W. J., & Meier, B. (2010). *The concurrent validity of the N-back task as a working memory measure.* **Memory, 18**(4), 394–412. DOI: [10.1080/09658211003702171](https://doi.org/10.1080/09658211003702171)
- Owen, A. M., McMillan, K. M., Laird, A. R., & Bullmore, E. (2005). *N-back working memory paradigm: A meta-analysis of normative functional neuroimaging studies.* **Human Brain Mapping, 25**(1), 46–59. DOI: [10.1002/hbm.20131](https://doi.org/10.1002/hbm.20131)
- Kane, M. J., Conway, A. R. A., Miura, T. K., & Colflesh, G. J. H. (2007). *Working memory, attention control, and the N-back task: A question of construct validity.* **Journal of Experimental Psychology: LMC, 33**(3), 615–622. DOI: [10.1037/0278-7393.33.3.615](https://doi.org/10.1037/0278-7393.33.3.615)
- Hautus, M. J. (1995). *Corrections for extreme proportions and their biasing effects on estimated values of d′.* **Behavior Research Methods, Instruments, & Computers, 27**, 46–51. DOI: [10.3758/BF03203619](https://doi.org/10.3758/BF03203619)
