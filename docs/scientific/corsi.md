# Corsi Block Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **Corsi Block-Tapping Task (CBT)** sulla piattaforma sperimentale CIRIAF.
> Le citazioni sono riportate in lingua originale (inglese); il testo esplicativo è in italiano.

---

## 1. Paradigma e citazione primaria

Il **Corsi Block-Tapping Task** è la prova di riferimento per la misura dello *span* di memoria a breve termine **visuo-spaziale**. L'apparato originale consiste in **9 cubetti di legno identici** (lato 3 cm) fissati in disposizione **irregolare e asimmetrica** su una tavoletta. L'esaminatore tocca una sequenza di blocchi al ritmo di circa un blocco al secondo e il partecipante deve riprodurre la stessa sequenza; la lunghezza della sequenza cresce progressivamente fino al fallimento.

Citazione primaria (tesi originale):

> Corsi, P. M. (1972). *Human memory and the medial temporal region of the brain.* Unpublished doctoral dissertation, McGill University, Montreal. (Dissertation Abstracts International, 34, 819B).

Standardizzazione e dati normativi di riferimento (versione oggi più citata):

> Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). "The Corsi Block-Tapping Task: standardization and normative data." *Applied Neuropsychology, 7*(4), 252–258. DOI: 10.1207/S15324826AN0704_8

Rassegna metodologica di riferimento (parametri, varianti, criticità di standardizzazione):

> Berch, D. B., Krikorian, R., & Huha, E. M. (1998). "The Corsi block-tapping task: Methodological and theoretical considerations." *Brain and Cognition, 38*(3), 317–338. DOI: 10.1006/brcg.1998.1039

**Nota metodologica importante.** Come documentato dalla letteratura di rassegna (Berch et al., 1998; rassegne successive sulla digitalizzazione del test), **nessuno degli autori originari — Corsi compreso — ha pubblicato le distanze inter-blocco in forma numerica esatta**; Kessels et al. (2000) hanno fornito lo schema grafico della tavoletta e un sistema di coordinate (in mm, misurate rispetto all'angolo inferiore-sinistro della board, con cubetti da 30 mm). Le coordinate numeriche adottate in questo documento (§3bis) sono la trascrizione di quella configurazione standard, così come digitalizzata e resa riproducibile nelle implementazioni open-source più diffuse (PEBL, che dichiara esplicitamente di seguire le raccomandazioni di Kessels et al., 2000).

---

## 2. Meccanismo cognitivo (memoria visuo-spaziale di configurazione/sequenza)

Il CBT sollecita il **taccuino visuo-spaziale** (*visuo-spatial sketchpad*) del modello di memoria di lavoro. La prestazione richiede la codifica e il mantenimento di **due componenti distinte**:

1. **Configurazione spaziale** — la posizione dei singoli blocchi nel piano (informazione *dove*), mantenuta come pattern statico.
2. **Sequenza temporale-spaziale** — l'**ordine** con cui i blocchi vengono toccati, cioè un percorso ordinato che collega le posizioni (componente *sequenziale/ordinale*).

Il carico non dipende solo dal numero di blocchi (span numerico) ma anche dalle **proprietà geometriche del percorso**: sequenze più lunghe, con maggiore distanza totale percorsa e con **auto-intersezioni (incroci)** del tracciato, sono più difficili da codificare e riprodurre. Per questo la piattaforma introduce un **indice di complessità** basato su lunghezza euclidea del percorso e numero di incroci (§3, §5), usato per **bilanciare** i trial dello stesso livello e isolare l'effetto della lunghezza da quello della configurazione geometrica.

Rispetto allo span verbale (Digit Span), il CBT carica selettivamente le regioni **temporo-mediali e parietali destre**; è per questo impiegato come marcatore di memoria di lavoro spaziale relativamente indipendente dal linguaggio.

---

## 3. Parametri adottati

| Parametro | Valore adottato | Fonte / razionale |
|---|---|---|
| Coordinate dei 9 blocchi | Configurazione asimmetrica fissa di Kessels — vedi tabella §3bis | Kessels et al. (2000); trascrizione numerica da PEBL (`CorsiPoints`, mm, cubetti 30 mm), che dichiara di seguire Kessels |
| Numero di blocchi | 9 | Corsi (1972); Kessels et al. (2000) |
| Lunghezza iniziale della sequenza | **3** (valore di piattaforma) | Default CIRIAF. La versione classica Kessels/PEBL parte da 2 (`startlength = 2`); si adotta 3 per evitare l'effetto pavimento negli adulti sani |
| Lunghezza massima | 9 | Kessels et al. (2000); PEBL (`gEndLength = 9`) — corrisponde al numero di blocchi |
| Durata illuminazione per blocco | **1000 ms** | PEBL default `isi = 1000` ms; ritmo classico ≈ 1 blocco/secondo. Variante nota: 500 ms di accensione + 1000 ms di intervallo onset-onset (implementazioni digitali tipo eCorsi) |
| Intervallo tra i blocchi (ITI/gap) | 1000 ms (onset-to-onset) | PEBL default `iti = 1000` ms |
| N. trial per livello | **2** | Kessels et al. (2000); PEBL (`timesperlength = 2`) |
| Regola di arresto | Interruzione quando **entrambi** i trial di uno stesso livello sono falliti | Kessels et al. (2000): si avanza di livello se **almeno un** trial è riprodotto correttamente |
| Punteggio (metrica di piattaforma) | **0,5 punti per ogni trial corretto** (span = somma dei mezzi-punti) | Scelta CIRIAF: con 2 trial/livello, entrambi corretti = 1,0 → span graduato in mezzi passi (stile Wechsler) |
| Punteggio classico (riferimento) | Corsi span = lunghezza massima riprodotta; **Total score = span × n. sequenze corrette** | Kessels et al. (2000): prodotto span × trial corretti |
| Indice di complessità del percorso | Distanza euclidea totale **L(S)** + numero di incroci geometrici **X(S)** | Costrutto di piattaforma per il bilanciamento intra-livello (§5) |
| Bilanciamento intra-livello | Stessa **L(S)** e stesso **X(S)** tra i trial dello stesso livello | Controllo della difficoltà geometrica a parità di lunghezza |

---

## 3bis. Coordinate dei 9 blocchi

Le coordinate seguenti riproducono la **configurazione asimmetrica standard** di Kessels et al. (2000). Le colonne `x_mm`, `y_mm` sono i valori nativi (millimetri, punto di riferimento del blocco; cubetti da 30 mm) trascritti dalla routine `CorsiPoints` di PEBL, che dichiara di seguire Kessels. Le colonne `x`, `y` sono la **normalizzazione sul piano 0–100** ottenuta con **fattore di scala unico su entrambi gli assi** (preserva esattamente proporzioni e asimmetria; il campo è in orientamento *landscape*).

| indice | x | y | x_mm | y_mm |
|:---:|:---:|:---:|:---:|:---:|
| 1 | 61.7 | 81.5 | 130 | 155 |
| 2 | 15.0 | 76.8 | 30 | 145 |
| 3 | 85.0 | 65.2 | 180 | 120 |
| 4 | 33.7 | 60.5 | 70 | 110 |
| 5 | 66.3 | 51.2 | 140 | 90 |
| 6 | 92.0 | 37.2 | 195 | 60 |
| 7 | 8.0 | 32.5 | 15 | 50 |
| 8 | 36.0 | 18.5 | 75 | 20 |
| 9 | 64.0 | 23.2 | 135 | 30 |

**Note sulla fonte e sull'asimmetria.**
- **Fonte.** Configurazione standard di **Kessels et al. (2000)**; valori numerici nativi presi dalla trascrizione open-source PEBL (`CorsiPoints`), che nell'intestazione del sorgente cita testualmente Kessels et al. (2000) e usa cubetti da 30 mm. L'estensione dei punti di riferimento è x∈[15,195] mm, y∈[20,155] mm (≈180×135 mm tra i blocchi estremi; ≈210×165 mm includendo l'ingombro dei cubetti), coerente con le board fisiche classiche da ~20–28 cm.
- **Asimmetria.** I 9 blocchi sono volutamente **sparsi e non allineati** (nessuna riga/colonna regolare, distanze inter-blocco disuguali) per impedire strategie basate su pattern geometrici prevedibili. La normalizzazione applica lo **stesso** coefficiente ai due assi, quindi non introduce distorsioni: la geometria relativa (angoli, rapporti tra distanze) è identica all'originale.
- **Orientamento dell'asse y.** Le coordinate normalizzate sono espresse in convenzione **cartesiana** (origine in basso a sinistra, y crescente verso l'alto). Le implementazioni con origine schermo in alto a sinistra (y verso il basso, come PEBL) devono applicare `y' = 100 − y`: la configurazione resta identica a meno di una riflessione verticale.

---

## 4. Mappatura implementativa

*Da completare — vedi `src/engine/tests/corsi.ts`.*

---

## 5. Metriche e formule

Sia una sequenza-stimolo di lunghezza *k* l'ordine di blocchi **S = (b₁, b₂, …, b_k)**, dove ogni b_i è uno dei 9 blocchi con coordinate (xᵢ, yᵢ) dalla tabella §3bis.

### 5.1 Span (metrica di piattaforma)

Per ogni trial riprodotto correttamente si assegnano **0,5 punti**. Con 2 trial per livello:

```
span = Σ (0,5 · trial_corretto)      con trial_corretto ∈ {0, 1}
```

sommato su tutti i trial somministrati (tutti i livelli). Interpretazione: un livello superato in entrambi i trial vale 1,0; un livello superato in un solo trial vale 0,5. Lo span è quindi graduato a passi di mezzo punto.

- **Livello massimo** = il livello più alto in cui è stato riprodotto correttamente **almeno un** trial.
- **Regola di arresto** = si interrompe quando **entrambi** i trial di uno stesso livello sono falliti (nessuna riproduzione corretta a quel livello).

### 5.2 Punteggio classico (per confronto con la letteratura)

```
Corsi span (classico) = lunghezza della più lunga sequenza riprodotta correttamente
Total score (Kessels) = Corsi span × (numero totale di sequenze riprodotte correttamente)
```

### 5.3 Indice di complessità del percorso

**Distanza euclidea totale** (lunghezza del tracciato):

```
L(S) = Σ_{i=1}^{k-1} d(b_i, b_{i+1}),   con d(b_i, b_j) = √[(x_i − x_j)² + (y_i − y_j)²]
```

**Numero di incroci geometrici** X(S): numero di coppie non ordinate di segmenti del percorso **non consecutivi** (indici con |i − j| ≥ 2) i cui segmenti aperti sᵢ = [b_i, b_{i+1}] e s_j = [b_j, b_{j+1}] si **intersecano propriamente**.

**Indice di complessità composito** (le due componenti sono riportate come coppia, avendo unità diverse):

```
C(S) = ( L(S), X(S) )
```

### 5.4 Bilanciamento intra-livello

Per controllare la difficoltà a parità di lunghezza, i trial dello stesso livello *n* devono essere **geometricamente equivalenti**:

```
per ogni coppia di trial (t₁, t₂) al livello n:
    L(S_{t₁}) ≈ L(S_{t₂})        (stessa distanza totale percorsa, entro tolleranza)
    X(S_{t₁})  =  X(S_{t₂})        (stesso numero di incroci)
```

In questo modo la variazione di prestazione tra trial dello stesso livello è attribuibile al carico di memoria (lunghezza/ordine) e non a differenze nella geometria del percorso.

---

### Riferimenti bibliografici

- Corsi, P. M. (1972). *Human memory and the medial temporal region of the brain.* Doctoral dissertation, McGill University, Montreal. (Diss. Abstr. Int., 34, 819B).
- Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). "The Corsi Block-Tapping Task: standardization and normative data." *Applied Neuropsychology, 7*(4), 252–258. DOI: 10.1207/S15324826AN0704_8
- Berch, D. B., Krikorian, R., & Huha, E. M. (1998). "The Corsi block-tapping task: Methodological and theoretical considerations." *Brain and Cognition, 38*(3), 317–338. DOI: 10.1006/brcg.1998.1039
- Mueller, S. T., & Piper, B. J. (2014). "The Psychology Experiment Building Language (PEBL) and PEBL Test Battery." *Journal of Neuroscience Methods, 222*, 250–259. DOI: 10.1016/j.jneumeth.2013.10.024 — *implementazione open-source di riferimento delle coordinate di Kessels (`CorsiPoints`).*
