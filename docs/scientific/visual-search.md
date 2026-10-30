# Visual Search — Ricerca visiva — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione della **Visual Search** sulla piattaforma
> sperimentale universitaria Sintropia.
> Costrutto misurato: **attenzione visiva selettiva** e efficienza della ricerca.
> Testo in italiano; citazioni riportate in lingua originale.

---

## 1. Paradigma e citazione primaria

Il partecipante deve decidere se in un campo di figure è presente un bersaglio definito. Si manipola il **numero di
elementi** (numerosità) e il **tipo di distrattori**: se il bersaglio si distingue per un solo attributo (per esempio il
colore) la ricerca è di *caratteristica*; se si distingue solo per la combinazione di due attributi (colore e forma) la
ricerca è di *congiunzione*.

**Citazione primaria.**

> Treisman, A. M., & Gelade, G. (1980). *A feature-integration theory of attention.* **Cognitive Psychology,
> 12**(1), 97–136. https://doi.org/10.1016/0010-0285(80)90005-5

Dall'abstract (letto attraverso una ricerca web; il record Europe PMC esiste ma non riporta l'abstract): la teoria
dell'integrazione delle caratteristiche propone che le caratteristiche siano registrate presto, in modo automatico e in
parallelo su tutto il campo visivo, mentre gli oggetti sono identificati in una fase successiva; l'attenzione deve essere
diretta in modo **seriale** a ciascuno stimolo quando servono congiunzioni di più caratteristiche separabili per
distinguere gli oggetti. Gli autori testano le previsioni con ricerca visiva, segregazione di texture, identificazione e
localizzazione. **I valori numerici delle pendenze dell'articolo non sono riportati qui perché non sono stati letti.**

---

## 2. Meccanismo cognitivo misurato

- **Ricerca di caratteristica.** Il bersaglio «salta fuori»: il tempo di risposta dipende poco dal numero di distrattori, cioè
  la pendenza della retta RT × numerosità è vicina a zero.
- **Ricerca di congiunzione.** Secondo la teoria serve un'attenzione focale elemento per elemento: il tempo cresce con il
  numero di elementi. La pendenza (ms per elemento) è l'indice di efficienza della ricerca.
- **Bersaglio assente.** Per confermare che un bersaglio non c'è occorre, in un modello seriale, esaminare tutti gli elementi:
  l'attesa è una pendenza maggiore che a bersaglio presente. Il rapporto delle pendenze assente/presente è una misura
  riportata, ma **la teoria è stata in seguito articolata e in parte superata**: si usa la pendenza come indice descrittivo
  dell'efficienza, non come prova di un meccanismo seriale.

---

## 3. Parametri adottati

| Parametro | Valore adottato | Origine |
|---|---|---|
| **Bersaglio** | cerchio **arancione** | **Scelta di progetto** |
| **Distrattori di caratteristica** | cerchi **blu** | **Scelta di progetto**: il bersaglio differisce per il solo colore |
| **Distrattori di congiunzione** | metà quadrati arancioni, metà cerchi blu | Schema classico della ricerca di congiunzione (il bersaglio condivide il colore con un gruppo e la forma con l'altro); le specifiche proporzioni sono una scelta di progetto |
| **Colori** | arancione/blu | **Scelta di progetto**: restano distinguibili con le più comuni carenze della visione dei colori rosso-verde |
| **Numerosità** | 4, 8, 16 | **Scelta di progetto** (tre livelli bastano a stimare una retta) |
| **Presenza** | 50% presente, 50% assente | **Scelta di progetto**, equiprobabile |
| **Trial** | 96 = 2 × 3 × 2 × 8 | **Scelta di progetto**: 8 prove per cella |
| **Disposizione** | griglia 6×6 con scarto casuale | **Scelta di progetto**: nessuna sovrapposizione fra elementi |
| **Fissazione / tempo massimo / ISI** | 500 ms / 4000 ms / 700–1100 ms | **Scelta di progetto** |
| **Risposta** | ← presente, → assente | **Scelta di progetto** |
| **Pratica** | 8 trial con feedback | **Scelta di progetto** |

Questi valori non provengono dall'articolo originale: la piattaforma adotta lo **schema** di Treisman & Gelade, non
il loro protocollo.

---

## 4. Mappatura implementativa

Codice: `src/engine/tests/visualSearch.ts`, `src/config/defaults.ts`, `src/ui/tests/VisualSearchView.tsx`.

| Elemento | Dove | Comportamento |
|---|---|---|
| Sequenza | `generateVisualSearch` | Ogni cella tipo × numerosità × presenza compare `⌊n/12⌋` volte (il resto è estratto a caso); ordine casuale con RNG a seme; ISI uniforme in [`isiMinMs`, `isiMaxMs`] |
| Campo | `placeItems` | Posizioni distinte su una griglia 6×6 con scarto casuale; esattamente un bersaglio se presente, nessuno se assente |
| Condizione | `conditionLabel` | `tipo-presenza-numerosità`, per esempio `conjunction-present-8` |
| Risposta | `VisualSearchView` | Il trial termina alla risposta (`endOnResponse`); corretta se ← con bersaglio presente o → con bersaglio assente |
| Classificazione RT | `classifyRt` | `INTERRUPTED → OMISSION → ANTICIPATION (< 150 ms) → VALID` |
| Metriche | `scoreVisualSearch` | Solo `phase = 'test'`; formule in §5 |

---

## 5. Metriche e formule

### 5.1 RT e accuratezza per tipo di ricerca
RT medio dei trial **corretti e validi** (esclusi errori, omissioni e anticipazioni); accuratezza = corretti / trial non interrotti
(le omissioni contano come errori).

### 5.2 Pendenza della ricerca
Per ciascun tipo e per bersaglio presente o assente, retta ai minimi quadrati dell'RT medio per numerosità $n$:

$$\overline{RT}(n) = a + b\,n \qquad b = \frac{\sum_n (n-\bar n)(\overline{RT}(n)-\overline{RT})}{\sum_n (n-\bar n)^2}$$

$b$ è la **pendenza in ms per elemento**; $a$ l'intercetta. Con meno di due numerosità valutabili la metrica è «—».

### 5.3 Rapporto assente/presente
$b_{\text{assente}}/b_{\text{presente}}$ per la ricerca di congiunzione, definito solo se $b_{\text{presente}} > 0$.

---

## 6. Limiti

- **Nessun dato normativo** e nessun confronto con i valori dell'articolo originale.
- **Poche prove per cella** (8): le pendenze sono stime rumorose a livello individuale; per confronti di gruppo si
  aggregano i partecipanti.
- **Errori e RT.** Con pochi errori l'accuratezza è poco informativa; le pendenze usano solo i corretti.
- **Dimensione degli stimoli.** Gli elementi sono in pixel CSS: l'angolo visivo dipende da schermo e distanza.
- **Interpretazione.** Una pendenza non nulla in una ricerca di caratteristica o piccola in una di congiunzione non
  smentisce né conferma la teoria: la letteratura successiva descrive un continuum di efficienza.

## Cronologia delle revisioni

- **2026-10.** Prima versione: motore, vista, paper. Fonte verificata su Crossref; i valori numerici dell'articolo non sono
  stati letti.
