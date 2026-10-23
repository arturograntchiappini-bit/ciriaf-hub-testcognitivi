# Mental Rotation — Rotazione mentale — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione della **Mental Rotation** sulla piattaforma
> sperimentale universitaria Sintropia.
> Costrutto misurato: **cognizione spaziale** (trasformazione mentale di oggetti tridimensionali).
> Testo in italiano; citazioni riportate in lingua originale.

---

## 1. Paradigma e citazione primaria

Al partecipante si mostrano due figure tridimensionali fatte di cubetti. La seconda è la prima ruotata (stessa figura)
oppure la sua immagine speculare ruotata (figura diversa: nessuna rotazione la sovrappone alla prima). Si decide se sono
«uguali» o «diverse» e si misura il tempo di reazione in funzione della differenza angolare fra le due.

**Citazione primaria.**

> Shepard, R. N., & Metzler, J. (1971). *Mental rotation of three-dimensional objects.* **Science, 171**(3972),
> 701–703. https://doi.org/10.1126/science.171.3972.701

Dall'abstract (verificato su Europe PMC): i tempi per decidere se due disegni in prospettiva mostrano oggetti della stessa
forma tridimensionale crescono **in modo lineare** con la differenza angolare fra gli orientamenti rappresentati. La
rotazione nel piano del disegno non richiede meno tempo di quella in profondità: le due rotazioni costano circa lo stesso
sforzo mentale. **I valori numerici dell'articolo (per esempio i gradi al secondo) non sono riportati qui perché non
sono stati letti.**

---

## 2. Meccanismo cognitivo misurato

- **Relazione tempo-angolo.** Sulle coppie *uguali* il tempo di risposta cresce con l'angolo: la pendenza (ms per grado)
  misura la rapidità della trasformazione mentale, e il suo inverso, in gradi al secondo, la **velocità di rotazione mentale**.
  L'intercetta racchiude i processi indipendenti dall'angolo (codifica, decisione, risposta).
- **Coppie diverse.** Le coppie speculari non hanno un angolo che le renda uguali: l'angolo mostrato non ha lo stesso
  significato, e per questo la pendenza si calcola **solo sulle coppie uguali corrette**.
- **Differenze individuali.** La rotazione mentale è un compito classico di abilità spaziale; la piattaforma riporta
  descrittori della prestazione, non punteggi normativi.

---

## 3. Parametri adottati

| Parametro | Valore adottato | Origine |
|---|---|---|
| **Figure** | catena di 10 cubetti con 3 curve ad angolo retto su 3 assi | Forma generale delle figure a blocchi; **le figure di Shepard & Metzler non sono riprodotte**, ogni trial genera una figura nuova (scelta di progetto) |
| **Non sovrapponibilità** | figure *chirali*: la speculare non coincide con alcuna delle 24 rotazioni del cubo | **Scelta di progetto**, verificata dal codice per ogni figura |
| **Angoli** | 0°, 30°, …, 180° (valore assoluto), verso casuale | **Scelta di progetto** |
| **Asse di rotazione** | verticale (rotazione in profondità) | **Scelta di progetto** |
| **Prova** | 84 = 7 angoli × 2 (uguali / diverse) × 6 | **Scelta di progetto** |
| **Fissazione / tempo massimo / ISI** | 500 ms / 8000 ms / 700–1100 ms | **Scelta di progetto** |
| **Risposta** | ← uguali, → diverse | **Scelta di progetto** |
| **Pratica** | 6 trial con feedback | **Scelta di progetto** |

---

## 4. Mappatura implementativa

Codice: `src/engine/tests/mentalRotation.ts`, `src/config/defaults.ts`, `src/ui/tests/MentalRotationView.tsx`.

| Elemento | Dove | Comportamento |
|---|---|---|
| Figura | `generateShape` | 4 bracci di lunghezza 2, 2, 2, 3 su assi consecutivi diversi, tutti e tre gli assi usati, nessun cubetto sovrapposto; si ritenta finché la figura è chirale |
| Chiralità | `isChiral` | La speculare (x → −x) non deve coincidere con alcuna delle 24 rotazioni proprie, dopo traslazione |
| Sequenza | `generateMentalRotation` | Ogni cella angolo × uguali/diverse compare `⌊n/14⌋` volte; a ogni trial una figura nuova e un verso casuale; ISI uniforme |
| Disegno | `projectFaces` | Proiezione ortogonale con lieve inclinazione, facce nascoste scartate, ordinamento dal fondo al primo piano, ombreggiatura da una sorgente fissa |
| Condizione | `conditionLabel` | `same-90`, `different-30`… (angolo in valore assoluto) |
| Risposta | `MentalRotationView` | Il trial termina alla risposta; corretta se ← su coppie uguali e → su coppie diverse |
| Metriche | `scoreMentalRotation` | Solo `phase = 'test'`; formule in §5 |

---

## 5. Metriche e formule

Per le coppie **uguali corrette e valide** si calcola l'RT medio $\overline{RT}(\theta)$ a ogni angolo $\theta$ e si adatta la
retta ai minimi quadrati:

$$\overline{RT}(\theta) = a + b\,\theta \qquad v = \frac{1000}{b}\ \text{°/s}\ (b>0)$$

$b$ = pendenza (ms/°), $a$ = intercetta (ms), $v$ = velocità di rotazione mentale. Con meno di due angoli valutabili o
$b \le 0$ la velocità è «—». Si riportano inoltre accuratezza (omissioni = errori, interrotti esclusi) e RT medio per coppie
uguali e diverse.

---

## 6. Limiti

- **Figure non originali.** Le figure sono generate dal programma e disegnate con una proiezione semplice: i valori
  non sono confrontabili con quelli ottenuti con i disegni di Shepard & Metzler.
- **Pochi trial per angolo** (6 per cella): la pendenza individuale è una stima rumorosa.
- **Strategie.** Alcuni partecipanti confrontano parti della figura invece di ruotarla per intero: la pendenza non lo
  distingue.
- **Difficoltà variabile.** Poiché la figura cambia a ogni trial, la difficoltà percettiva può variare fra le prove.
- **Nessuna norma.** Nessun punteggio normativo.

## Cronologia delle revisioni

- **2026-10.** Prima versione: motore, vista, paper. Fonte verificata su Crossref ed Europe PMC.
