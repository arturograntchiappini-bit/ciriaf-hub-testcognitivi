# Corsi Block Task — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **Corsi Block-Tapping Task (CBT)** sulla piattaforma sperimentale Sintropia.
> Le citazioni sono riportate in lingua originale (inglese); il testo esplicativo è in italiano.

---

## 1. Paradigma e citazione primaria

Il **Corsi Block-Tapping Task** è la prova di riferimento per la misura dello *span* di memoria a breve termine **visuo-spaziale**. L'apparato consiste in **9 cubetti identici** (30 mm di lato nella versione di Kessels, secondo i commenti del sorgente PEBL; l'abstract di Berch et al., 1998, verificato, segnala una notevole incoerenza fra gli studi nella somministrazione, nel punteggio e nelle proprietà fisiche dell'apparato) fissati in disposizione **irregolare e asimmetrica** su una tavoletta. L'esaminatore tocca una sequenza di blocchi al ritmo di circa un blocco al secondo e il partecipante deve riprodurre la stessa sequenza; la lunghezza della sequenza cresce progressivamente fino al fallimento.

Citazione primaria (tesi originale):

> Corsi, P. M. (1972). *Human memory and the medial temporal region of the brain.* Unpublished doctoral dissertation, McGill University, Montreal. (Dissertation Abstracts International, 34, 819B).

Standardizzazione e dati normativi di riferimento (versione oggi più citata):

> Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). "The Corsi Block-Tapping Task: standardization and normative data." *Applied Neuropsychology, 7*(4), 252–258. DOI: 10.1207/S15324826AN0704_8

Rassegna metodologica di riferimento (parametri, varianti, criticità di standardizzazione):

> Berch, D. B., Krikorian, R., & Huha, E. M. (1998). "The Corsi block-tapping task: Methodological and theoretical considerations." *Brain and Cognition, 38*(3), 317–338. DOI: 10.1006/brcg.1998.1039

**Nota metodologica importante.** Si legge spesso che **nessuno degli autori originari — Corsi compreso — ha pubblicato le distanze inter-blocco in forma numerica esatta**: l'affermazione puntuale **non è verificata** (Berch et al., 1998, documentano nell'abstract solo l'eterogeneità generale dell'apparato; la tesi di Corsi, 1972, non è stata consultata). Secondo i commenti del sorgente PEBL (`battery/corsi/corsi.pbl`, commit `aaf55c9` del 2026-04-01, letto il 2026-10-30: «Points reported in: Kessels, R. P. C., van Zandvoort, M. J. E., …»), Kessels et al. (2000) hanno pubblicato le coordinate dei blocchi (in mm, con cubetti da 30 mm). L'articolo di Kessels non è stato consultato direttamente: del lavoro è verificato solo l'abstract (Europe PMC: procedura standardizzata, 70 controlli e 70 pazienti con lesioni cerebrali, percentili e cut-off). Le coordinate numeriche adottate in questo documento (§3bis) sono la trascrizione di quella configurazione standard, così come digitalizzata e resa riproducibile nelle implementazioni open-source più diffuse (PEBL, che dichiara esplicitamente di seguire le raccomandazioni di Kessels et al., 2000).

---

## 2. Meccanismo cognitivo (memoria visuo-spaziale di configurazione/sequenza)

Il CBT sollecita il **taccuino visuo-spaziale** (*visuo-spatial sketchpad*) del modello di memoria di lavoro. La prestazione richiede la codifica e il mantenimento di **due componenti distinte**:

1. **Configurazione spaziale** — la posizione dei singoli blocchi nel piano (informazione *dove*), mantenuta come pattern statico.
2. **Sequenza temporale-spaziale** — l'**ordine** con cui i blocchi vengono toccati, cioè un percorso ordinato che collega le posizioni (componente *sequenziale/ordinale*).

Il carico non dipende solo dal numero di blocchi (span numerico) ma anche dalle **proprietà geometriche del percorso**. Orsini, Simonetta e Marmorato (2004) rappresentano una sequenza come la linea che unisce i centri dei cubi e mostrano, su 70 studenti universitari, che il **numero di cubi**, il **numero di incroci del percorso con sé stesso** e la **lunghezza del percorso in millimetri** influenzano tutti la prestazione; sequenze con pari numero di cubi, incroci e lunghezza differivano comunque in difficoltà, quindi altri fattori contano. Per questo la piattaforma introduce un **indice di complessità** basato su lunghezza euclidea ed incroci (§3, §5), usato per **bilanciare** i trial dello stesso livello e ridurre l'effetto della configurazione geometrica: l'equivalenza è **approssimata**, non perfetta.

> Orsini, A., Simonetta, S., & Marmorato, M. S. (2004). *Corsi's block-tapping test: Some characteristics of the spatial path which influence memory.* **Perceptual and Motor Skills, 98**(2), 382–388. https://doi.org/10.2466/pms.98.2.382-388

Rispetto allo span verbale (Digit Span), il CBT è impiegato come misura di memoria di lavoro spaziale meno dipendente dal linguaggio. Le associazioni con specifiche regioni cerebrali discusse in letteratura (Berch et al., 1998) non sono qui usate né per la scelta dei parametri né per l'interpretazione dei punteggi.

---

## 3. Parametri adottati

| Parametro | Valore adottato | Fonte / razionale |
|---|---|---|
| Coordinate dei 9 blocchi | Configurazione asimmetrica fissa di Kessels — vedi tabella §3bis | Kessels et al. (2000); trascrizione numerica da PEBL (`CorsiPoints`, mm, cubetti 30 mm), che dichiara di seguire Kessels |
| Numero di blocchi | 9 | Numero classico; i 9 punti di PEBL sono attribuiti a Kessels et al. (2000). Tesi di Corsi (1972) e articolo di Kessels non consultati |
| Lunghezza iniziale della sequenza | **3** (valore di piattaforma) | **Scelta di progetto**. PEBL parte da 2 (`startlength = 2`; il commento del sorgente lo presenta come raccomandazione di Kessels); si adotta 3 per evitare l'effetto pavimento negli adulti sani |
| Lunghezza massima | 9 | Corrisponde al numero di blocchi. In PEBL le sequenze fisse «di Kessels» arrivano a 9 (il commento del sorgente avverte che la sequenza di lunghezza 9 all'indietro non è stata fornita da Kessels); il parametro `endlength = 9` vale solo per le sequenze casuali (`useKessels = 0`) |
| Ritmo di presentazione (`presentMsPerBlock`) | **1000 ms** onset-to-onset | Ritmo ≈ 1 blocco/secondo. **Verificato su PEBL** (sorgente e schema dei parametri, commit `aaf55c9`): `isi = 1000` ms e `iti = 1000` ms. In PEBL però il blocco evidenziato resta acceso per tutto l'`isi` e poi salta al successivo: il ritmo onset-onset coincide, la durata di accensione no (1000 ms contro 700 ms) |
| Durata illuminazione per blocco | **700 ms** (70% di `presentMsPerBlock`), poi 300 ms spento | **Scelta di progetto** del codice (`CorsiView`): la fase di risposta inizia `n · 1000 + 200` ms dopo l'avvio della sequenza, cioè 1200 ms dopo l'accensione dell'ultimo blocco (500 ms dopo il suo spegnimento) |
| N. trial per livello | **2** | PEBL (`timesperlength = 2`); secondo il commento del sorgente PEBL è la raccomandazione di Kessels et al. (2000), non verificata sull'articolo |
| Regola di arresto | Interruzione quando **entrambi** i trial di uno stesso livello sono falliti | Come in PEBL (il sorgente interrompe se una lunghezza si chiude senza risposte corrette) e nei manuali Inquisit (il test termina quando si falliscono due sequenze di pari lunghezza), che la attribuiscono a Kessels et al. (2000); non verificata sull'articolo. Si avanza se **almeno un** trial del livello è corretto |
| Punteggio ponderato | **`startLength − 1` + 0,5 per ogni trial superato** (0 se nessuno) | Scelta di progetto: con 2 trial per livello, superarli entrambi porta il punteggio esattamente alla lunghezza del livello (§5.1). Con `startLength = 2` coincide con lo span che PEBL mostra a fine prova, `(startlength + corrette) / timesperlength` (verificato sul sorgente); con `startLength = 3` i due valori differiscono di 0,5 |
| Punteggio classico (riferimento) | Corsi span = lunghezza massima riprodotta; **Total score = span × n. sequenze corrette** | Come nei manuali Inquisit (`blockspan × ncorrecttotal`), che lo attribuiscono a Kessels et al. (2000) e ne riportano le norme (Kessels et al., 2000, tabella 2); non verificato sull'articolo. Inquisit definisce lo span come lunghezza dell'**ultima** sequenza riprodotta correttamente, Sintropia come la **massima**: di norma coincidono |
| Indice di complessità del percorso | Distanza euclidea totale **L(S)** + numero di incroci geometrici **X(S)** | Le due variabili sono quelle studiate da Orsini et al. (2004); la loro combinazione in un indice per il bilanciamento è una scelta di progetto (§5) |
| Bilanciamento intra-livello | **L(S)** entro `complexityTolerance` dal bersaglio del livello e stesso **X(S)** tra i trial dello stesso livello (§4, ultima sezione) | Controllo della difficoltà geometrica a parità di lunghezza |

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
- **Fonte.** Configurazione standard di **Kessels et al. (2000)**; valori numerici nativi presi dalla trascrizione open-source PEBL (`CorsiPoints`, controllata sul sorgente `battery/corsi/corsi.pbl` il 2026-10-23 e di nuovo il 2026-10-30 sul commit `aaf55c9` del repository GitHub di PEBL: i nove punti coincidono con la tabella), la cui intestazione cita Kessels et al. (2000) per standardizzazione e coordinate. Che le coordinate PEBL siano identiche a quelle stampate nell'articolo di Kessels **non è verificato** (articolo non consultato). L'estensione dei punti di riferimento è x∈[15,195] mm, y∈[20,155] mm (≈180×135 mm tra i blocchi estremi; ≈210×165 mm includendo l'ingombro dei cubetti), coerente con le board fisiche classiche da ~20–28 cm.
- **Asimmetria.** I 9 blocchi sono volutamente **sparsi e non allineati** (nessuna riga/colonna regolare, distanze inter-blocco disuguali) per impedire strategie basate su pattern geometrici prevedibili. La normalizzazione applica lo **stesso** coefficiente ai due assi, quindi non introduce distorsioni: la geometria relativa (angoli, rapporti tra distanze) è identica all'originale.
- **Orientamento dell'asse y.** Le coordinate normalizzate sono espresse in convenzione **cartesiana** (origine in basso a sinistra, y crescente verso l'alto). Le implementazioni con origine schermo in alto a sinistra (y verso il basso, come PEBL) devono applicare `y' = 100 − y`: la configurazione resta identica a meno di una riflessione verticale.

---

## 4. Mappatura implementativa

Corrispondenza fra §3 e il codice (`src/engine/tests/corsi.ts`, `src/config/defaults.ts`, `src/ui/tests/CorsiView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Blocchi | `CORSI_BLOCKS` | I 9 punti normalizzati della tabella §3bis, convenzione cartesiana (y verso l'alto); la vista applica `100 − y` |
| Parametri | `DEFAULTS.corsi` | `startLength 3`, `maxLength 9`, `trialsPerLevel 2`, `presentMsPerBlock 1000`, `complexityTolerance 8` |
| Complessità | `pathLength`, `countCrossings` | `L(S)` somma delle distanze euclidee; `X(S)` coppie di segmenti non adiacenti che si intersecano **propriamente** (tocchi ed estremi in comune non contano) |
| Bersaglio del livello | `targetPathLength` | `(k − 1) · d̄`, con `d̄` distanza media fra due blocchi distinti (49,83 per questa tavoletta): costante del layout, identica in ogni somministrazione |
| Generazione | `generateBalancedSequences` | Fino a 2000 permutazioni parziali con il seme; candidati deduplicati per traiettoria (una sequenza e il suo rovescio sono lo stesso candidato); si estrae a sorte un gruppo di sequenze a **pari numero di incroci**, con `L(S)` entro `complexityTolerance` dal bersaglio e ampiezza interna entro la tolleranza |
| Degradazione | `generateBalancedSequences` | Se non esiste un gruppo ideale: (1) perde il vincolo di ampiezza interna; (2) perde l'ancoraggio al bersaglio ma resta a pari incroci, usando le sequenze più vicine al bersaglio. Mai un campione arbitrario |
| Arresto | `shouldStop` | Dopo i due trial di un livello, si ferma se **entrambi** sono sbagliati |
| Punteggio | `scoreCorsi` | Solo trial di test non interrotti; metriche in §5 |

Limiti del bilanciamento:

- L'equivalenza è su `L(S)` e `X(S)`, non su altri fattori che Orsini et al. (2004) indicano come influenti: due sequenze equivalenti per l'indice possono essere comunque di difficoltà diversa.
- Ai livelli molto lunghi (8–9 su 9 blocchi) le sequenze possibili sono poche, quindi la variabilità fra le somministrazioni è minore.
- Con `startLength = 3` non si somministra la lunghezza 2 della procedura classica: chi fallisce al livello 3 ha span 0 e non è confrontabile con dati normativi che partono da 2.

---

## 5. Metriche e formule

Sia una sequenza-stimolo di lunghezza *k* l'ordine di blocchi **S = (b₁, b₂, …, b_k)**, dove ogni b_i è uno dei 9 blocchi con coordinate (xᵢ, yᵢ) dalla tabella §3bis.

### 5.1 Metriche calcolate dalla piattaforma

Si considerano i trial di **test non interrotti**. Sia $P$ il numero di trial riprodotti correttamente e $\ell_i$ la
lunghezza del trial $i$.

- **Span visuo-spaziale (MBS, maximum block span)** $= \max_i \ell_i$ tra i trial corretti (0 se nessuno): la
  lunghezza della sequenza più lunga riprodotta correttamente, l'indice classico di Corsi.
- **Punteggio ponderato** $= \begin{cases} 0 & P = 0 \\ (\text{startLength} - 1) + 0{,}5\,P & P > 0 \end{cases}$
  Assume superati i livelli sotto `startLength`, che non vengono somministrati. Con 2 trial per livello, superare
  entrambi i trial del livello $L$ porta il punteggio esattamente a $L$; un trial solo vale mezzo punto.
- **Trial totali superati** $= P$.
- **Punteggio totale (MBS × superati)** $= \text{MBS} \cdot P$: il total score di Kessels et al. (2000), prodotto dello
  span per il numero di sequenze corrette.

La **regola di arresto** interrompe la prova quando entrambi i trial di un livello sono falliti.

### 5.2 Confronto con la letteratura

Span e total score hanno la stessa definizione del Corsi classico, ma la procedura differisce in un punto: la
piattaforma parte da lunghezza 3 invece che da 2. Per confrontare i punteggi con dati normativi si imposta
`startLength = 2` dalle Impostazioni.

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
- Orsini, A., Simonetta, S., & Marmorato, M. S. (2004). "Corsi's block-tapping test: Some characteristics of the spatial path which influence memory." *Perceptual and Motor Skills, 98*(2), 382–388. DOI: 10.2466/pms.98.2.382-388
- Mueller, S. T., & Piper, B. J. (2014). "The Psychology Experiment Building Language (PEBL) and PEBL Test Battery." *Journal of Neuroscience Methods, 222*, 250–259. DOI: 10.1016/j.jneumeth.2013.10.024 — *implementazione open-source di riferimento delle coordinate di Kessels (`CorsiPoints`).*

## Cronologia delle revisioni

- **Revisione scientifica 2026-10.** Verificati su Crossref tutti i riferimenti e controllate sul sorgente PEBL le
  coordinate dei 9 blocchi. Aggiunta la fonte del costrutto geometrico (Orsini et al., 2004) con il suo limite;
  rimossa l'affermazione neuroanatomica senza fonte; documentata la differenza di punto di partenza (3 invece di 2) e
  la formula del punteggio ponderato, prima descritta in modo diverso dal codice; aggiunto il punteggio totale di
  Kessels.
- **2026-10-30.** Corretta la temporizzazione: il blocco resta acceso 700 ms (70% di `presentMsPerBlock`) con
  ritmo onset-onset di 1000 ms, non 1000 ms di accensione più 1000 ms di intervallo. Le affermazioni sull'apparato e
  sulle coordinate di Kessels et al. (2000) sono attribuite a PEBL, perché l'articolo non è stato consultato.
- **2026-10-30 (verifica su PEBL, Inquisit e riproduzione delle cifre).** Letto il sorgente PEBL (`battery/corsi/corsi.pbl`
  e `params/corsi.pbl.schema.json`, commit `aaf55c9`): verificati `isi = 1000`, `iti = 1000`, `startlength = 2`,
  `timesperlength = 2`, cubetti da 30 mm, le nove coordinate e la regola di arresto; corretta la frase su `endlength`
  (esiste, ma vale solo per le sequenze casuali); notato che in PEBL il blocco resta acceso per tutto l'`isi`. Regola di
  arresto e total score confermati sui manuali Inquisit (fonte secondaria). Rieseguita con Node la generazione su 200
  semi (1–200) per la versione attuale e per quella a finestra mobile (commit `5a59816`), senza modificare il codice: le
  cifre del «Dopo» e il livello 5 del «Prima» sono riprodotte; corretta l'ampiezza massima del «Prima» (0,4, non 0,3) e
  precisato che 17,0–28,5 e 94–134 valgono per le lunghezze 4–9. Sostituito il «requisito di sequenze indipendenti»
  attribuito a Kessels e PEBL (non verificato) con il controllo sulle sequenze fisse di PEBL. Restano non verificati sul
  testo: la tesi di Corsi (1972) e l'articolo di Kessels et al. (2000), di cui è letto solo l'abstract.

## Aggiornamento metriche e generazione (revisione)

> **Superato in parte.** Il punto «Bilanciamento dei trial» qui sotto descrive una versione intermedia (finestra mobile
> senza ancoraggio); il criterio in vigore è quello della sezione successiva (bersaglio di difficoltà + tolleranza) e del §4.

- **Punteggio.** Lo scoring ora riporta lo **Span Visuo-Spaziale (MBS, Maximum
  Block Span)** — la lunghezza massima riprodotta correttamente, indice classico
  di Corsi — accanto al **Punteggio Corsi (Ponderato)** cumulativo, ancorato a
  `startLength` (`startLength − 1 + 0.5 · trial superati`; 0 se nessuno). Così il
  punteggio ponderato è commensurato alla lunghezza del blocco.
- **Bilanciamento dei trial.** La selezione delle due sequenze dello stesso
  livello usa una **finestra mobile** sulla distanza percorsa (il sottoinsieme di
  difficoltà più simile in assoluto), al posto di una tolleranza allargabile;
  resta invariato il vincolo di pari numero di incroci. Vedi
  `revisione-motore/corsi.md` per i dettagli implementativi.

## Equivalenza fra somministrazioni (revisione successiva)

Il bilanciamento descritto sopra garantisce l'equivalenza **fra i due trial dello
stesso livello**, ma non fra somministrazioni diverse: la finestra mobile vincola
l'ampiezza *interna* alla coppia, non la sua *posizione assoluta*. Misurato su 200
seed (semi 1–200, `mulberry32`; difficoltà del livello = media dei `L(S)` dei due trial), la difficoltà media del
livello 5 variava fra 121,7 e 255,3 unità di percorso (sd 28,5): due partecipanti potevano ricevere livelli
nominalmente uguali ma di difficoltà geometrica doppia l'uno rispetto all'altro. (Cifre riprodotte il 2026-10-30
rieseguendo `generateBalancedSequences` della versione a finestra mobile, commit `5a59816`, con lo script descritto nella
cronologia.)

### Bersaglio di difficoltà del livello

Si introduce un **bersaglio** costante, calcolato dal solo layout:

```
bersaglio(k) = (k − 1) · d̄        con d̄ = distanza media fra due blocchi distinti
```

Ogni passo di una permutazione casuale è una coppia di blocchi distinti estratta
uniformemente, quindi `bersaglio(k)` è **esattamente il valore atteso di L(S)**
per una sequenza casuale di lunghezza *k*. Non essendo campionato, è identico in
ogni somministrazione. Per la configurazione di Kessels (§3bis): d̄ = 49,83.

Il criterio di generazione diventa:

```
per ogni sequenza S al livello k:
    | L(S) − bersaglio(k) |  ≤  tolleranza        (equivalenza FRA le run)
per ogni coppia di trial (t₁, t₂) al livello k:
    | L(S_t₁) − L(S_t₂) |    ≤  tolleranza        (omogeneità DENTRO il livello)
    X(S_t₁)  =  X(S_t₂)                            (stesso numero di incroci)
```

Entro questi vincoli le sequenze sono **estratte a sorte**, così ogni
somministrazione riceve sequenze diverse pur restando confrontabile con le altre.

### Esclusione delle traiettorie invertite

Una sequenza e il suo **rovescio** hanno L(S) e X(S) identici per costruzione:
qualunque criterio di massima somiglianza li seleziona sistematicamente. Nella
versione precedente, a lunghezza 3 la coppia di trial era un rovescio esatto in
194 run su 200. Formalmente equivalenti, ma il secondo trial ripercorre la stessa
traiettoria all'indietro sugli stessi blocchi, quindi non è una prova indipendente. Nelle sequenze fisse di PEBL
(`KesselsTrials`, che il sorgente attribuisce a Kessels et al., 2000) nessuna coppia di pari lunghezza è il rovescio
dell'altra (controllato sul sorgente); un «requisito» esplicito di indipendenza nell'articolo non è stato verificato. I
candidati sono ora deduplicati per traiettoria, non per ordine.

### Effetto misurato (200 seed, tolleranza 8)

Semi 1–200 (`mulberry32`), lunghezze 3–9; «Prima» = versione a finestra mobile (commit `5a59816`), «Dopo» = codice
attuale. Intervalli = minimo e massimo fra le lunghezze.

| Indicatore | Prima | Dopo |
|---|---|---|
| sd della difficoltà del livello fra le run | 17,0 – 28,5 (lunghezze 4–9; 3,4 a lunghezza 3) | **4,4 – 4,8** |
| escursione min→max fra le run | 94 – 134 (lunghezze 4–9; 21,6 a lunghezza 3) | **15,1 – 15,9** |
| ampiezza dentro il livello (max) | 0,0 – 0,4 | 0,9 – 5,4 (≤ tolleranza) |
| coppie che sono un rovescio esatto | fino a 194/200 | **0/200** |
| sequenze distinte su 400 (lunghezza 3) | 42 | **107** |

A lunghezza 3 la vecchia versione aveva poca variabilità fra le run proprio perché sceglieva quasi sempre una sequenza e
il suo rovescio (solo 42 sequenze distinte). Il valore 107 dipende dall'insieme di semi: con i semi 0–199 si ottiene 106.

Il parametro `complexityTolerance` cambia quindi significato: da *ampiezza
ammessa fra i due trial* a **scostamento massimo dal bersaglio del livello**,
vincolo più forte che implica il precedente.
