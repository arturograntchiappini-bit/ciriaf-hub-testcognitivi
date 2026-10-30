# Trail Making Test A e B — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **Trail Making Test (TMT)** sulla piattaforma
> sperimentale universitaria Sintropia.
> Costrutto misurato: **velocità visuo-motoria** (parte A) e **flessibilità cognitiva / controllo esecutivo** (parte B).
> Testo in italiano; citazioni riportate in lingua originale.

---

## 1. Paradigma e citazioni

Nella **parte A** il partecipante collega con una linea, in ordine, cerchi numerati 1, 2, 3…; nella **parte B** collega
alternando numeri e lettere: 1, A, 2, B, 3, C… Si misura il tempo per completare ciascuna parte. Il confronto fra B e A
isola la richiesta aggiuntiva di alternare due sequenze.

**Citazione di riferimento storico.**

> Reitan, R. M. (1958). *Validity of the Trail Making Test as an indicator of organic brain damage.* **Perceptual and
> Motor Skills, 8**(3), 271–276. https://doi.org/10.2466/pms.1958.8.3.271

**Dati normativi (non incorporati nella piattaforma).**

> Tombaugh, T. N. (2004). *Trail Making Test A and B: Normative data stratified by age and education.* **Archives of
> Clinical Neuropsychology, 19**(2), 203–214. https://doi.org/10.1016/S0887-6177(03)00039-8

(Crossref registra un solo autore con l'iniziale «T.»; il nome «T. N. Tombaugh» è quello usato nella letteratura.)

**Validità di costrutto.**

> Sánchez-Cubillo, I., Periáñez, J. A., Adrover-Roig, D., Rodríguez-Sánchez, J. M., Ríos-Lago, M., Tirapu, J., &
> Barceló, F. (2009). *Construct validity of the Trail Making Test: Role of task-switching, working memory,
> inhibition/interference control, and visuomotor abilities.* **Journal of the International Neuropsychological Society,
> 15**(3), 438–450. https://doi.org/10.1017/S1355617709090626

Dall'abstract (verificato su Europe PMC): in 41 adulti anziani sani la parte A riflette soprattutto abilità
visuopercettive; la parte B dipende soprattutto dalla memoria di lavoro, con un ruolo minore del task-switching; la
**differenza B − A** riduce le richieste visuopercettive e di memoria di lavoro e funziona come misura più chiara di
controllo esecutivo. Di questo studio si usa solo la lettura qualitativa; **nessun valore numerico degli articoli è
riportato** perché non sono stati letti.

---

## 2. Meccanismo cognitivo misurato

- **Parte A.** Ricerca visiva del cerchio successivo e movimento verso di esso: dipende da velocità percettiva e motoria.
- **Parte B.** Oltre a ciò, tenere a mente due sequenze e passare dall'una all'altra a ogni passo.
- **Indici derivati.** Differenza e rapporto B − A, B / A: quanto costa in più la parte B rispetto alla velocità di base.

---

## 3. Parametri adottati

| Parametro | Valore adottato | Origine |
|---|---|---|
| **Cerchi per parte** | **25** (parte B: 13 numeri e 12 lettere) | Numero classico del TMT; modificabile (8–51). Il motore limita comunque la parte B a 53 cerchi (1, A, 2, B, …, Z, 27), finite le lettere |
| **Disposizione** | posizioni casuali con distanza minima fra i centri di **0,11** (frazione del lato del campo) | **Scelta di progetto**: non è il layout cartaceo originale |
| **Risposta** | clic del mouse o tocco sul cerchio | **Scelta di progetto** (il test originale è carta e matita con tracciamento) |
| **Errore** | il cerchio lampeggia, non si avanza, il tempo scorre | **Scelta di progetto** (nel test cartaceo lo sperimentatore corregge l'errore a tempo in corso) |
| **Pratica** | 8 cerchi per parte | **Scelta di progetto** |

---

## 4. Mappatura implementativa

Codice: `src/engine/tests/trailMaking.ts`, `src/config/defaults.ts`, `src/ui/tests/TrailMakingView.tsx`.

| Elemento | Dove | Comportamento |
|---|---|---|
| Etichette | `trailLabels` | A: 1…n. B: 1, A, 2, B…, al massimo 53 etichette (fino a Z, 27) |
| Layout | `generateTrail` | Posizioni casuali (RNG a seme) a distanza minima 0,11, con margine 0,06, fino a 4000 estrazioni. Se il campo è troppo affollato si scarta tutto e si scelgono celle a caso di una griglia `⌈√n⌉ × ⌈√n⌉`, i cui centri distano almeno 0,11 fino a 64 cerchi (il parametro arriva a 51) |
| Registrazione | `TrailRun` | Ogni clic è un trial: `rtMs` = tempo dal clic precedente (o dall'inizio); un clic errato non fa avanzare |
| Metriche | `scoreTrailMaking` | Solo `phase = 'test'`; il tempo di una parte conta solo se completata |

---

## 5. Metriche e formule

Tempo della parte $P$: $T_P = \sum_i rt_i$ su tutti i clic della parte (errori compresi), in secondi, definito solo se la parte
è completata. Si riportano $T_A$, $T_B$, la differenza $T_B - T_A$ e il rapporto $T_B / T_A$, gli errori (clic sul cerchio
sbagliato) e il tempo medio per clic di ciascuna parte.

---

## 6. Limiti

- **Non è il test originale.** La versione a schermo con clic cambia la componente motoria (tracciare una linea vs fare clic):
  **i tempi non sono confrontabili con i dati normativi cartacei** (per esempio quelli di Tombaugh, 2004).
- **Layout non standard**: le distanze fra i cerchi variano fra le somministrazioni.
- **Nessuna norma né cut-off.**
- **Pochi dati per partecipante:** una sola somministrazione per parte; l'effetto pratica non è controllato.

## Cronologia delle revisioni

- **2026-10.** Prima versione: motore, vista, paper. Fonti verificate su Crossref; abstract di Sánchez-Cubillo et al. su
  Europe PMC.
- **2026-10-30.** Documentati la distanza minima (0,11), il ripiego a griglia che la rispetta (prima i cerchi mancanti
  venivano messi su una griglia senza controllare la distanza) e il limite di 53 cerchi della parte B.
