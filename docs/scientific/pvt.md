# PVT (Psychomotor Vigilance Task) — Riferimenti scientifici

> Documento scientifico di riferimento per l'implementazione del **PVT**
> sulla piattaforma sperimentale universitaria Sintropia.
> Costrutto misurato: **attenzione sostenuta / vigilanza** (sustained attention).
> Testo in italiano; citazioni riportate in lingua originale. DOI verificati su Crossref il 2026-10-23.

---

## 1. Paradigma e citazione primaria

Il **Psychomotor Vigilance Task (PVT)** è un compito di tempo di reazione (TR) semplice a stimolo visivo, con intervallo
inter-stimolo (ISI) **variabile in modo imprevedibile**. Il partecipante preme un tasto non appena compare lo stimolo
(qui un contatore di millisecondi che parte da 0). La misura storicamente centrale è il numero di *lapse*, risposte
lente (RT ≥ 500 ms nel PVT standard a 10 minuti).

**Citazione primaria.**

> Dinges, D. F., & Powell, J. W. (1985). *Microcomputer analyses of performance
> on a portable, simple visual RT task during sustained operations.* **Behavior
> Research Methods, Instruments, & Computers, 17**(6), 652–655.
> https://doi.org/10.3758/BF03200977

Il titolo stesso descrive il contributo: un compito di TR visivo semplice e **portatile** per misurare la prestazione
durante operazioni prolungate. Il testo originale non è stato consultato per questo documento: ciò che segue sul PVT
standard viene dalla fonte di validazione seguente e da quanto indicato caso per caso.

**Riferimento di validazione principale.**

> Basner, M., & Dinges, D. F. (2011). *Maximizing sensitivity of the
> psychomotor vigilance test (PVT) to sleep loss.* **Sleep, 34**(5), 581–591.
> https://doi.org/10.1093/sleep/34.5.581

Basner e Dinges hanno ripetuto PVT da 10 minuti ogni 2 ore durante privazione totale di sonno (33 ore, 31 soggetti) e
restrizione parziale (4 ore a letto per notte, 5 giorni, 43 soggetti), in 74 adulti sani. Trovano che le metriche basate
sui **lapse** e sulla **velocità psicomotoria** (media di 1/RT e media del 10% più lento di 1/RT) hanno effetti
**grandi**, mentre **media e mediana degli RT** hanno effetti da piccoli a moderati, distorti dai valori estremi.
Raccomandano lapse e velocità di risposta come esiti primari del PVT a 10 minuti e **sconsigliano media e mediana degli
RT** come misure primarie di allerta. Versioni più brevi possono talvolta essere sufficientemente sensibili, ma i lapse
beneficiano di test più lunghi nella privazione totale di sonno.

Dai **Metodi** dello stesso articolo (testo completo su PubMed Central, PMC3079937, letto il 2026-10-30): l'ISI, definito
come tempo fra l'ultima risposta e lo stimolo successivo, variava a caso fra **2 e 10 s**; i lapse erano gli RT
**≥ 500 ms**; le risposte senza stimolo o con RT **< 100 ms** erano contate come false starts; il contatore in
millisecondi andava in timeout dopo **30 s** senza risposta.

---

## 2. Meccanismo cognitivo misurato

Il PVT misura la **prontezza di risposta** durante un'attesa prolungata: non richiede memoria di lavoro, discriminazione
complessa o inibizione, solo rilevare uno stimolo semplice e rispondere.

- L'**ISI variabile** impedisce di anticipare ritmicamente lo stimolo.
- Un **lapse** è un episodio di risposta molto lenta o assente, interpretato come un calo di attenzione; la frequenza dei
  lapse e la velocità di risposta sono le misure più sensibili alla perdita di sonno (Basner & Dinges, 2011).
- Le **risposte anticipate** (RT < 150 ms su Sintropia) non sono guidate dallo stimolo.
- Media e mediana degli RT sono incluse per completezza, ma **non** vanno usate come misura primaria (§1).

---

## 3. Parametri adottati

| Parametro | Valore | Origine |
|---|---|---|
| **Numero di trial** | **100** | Con ISI medio di 6 s dà circa 10 minuti di attesa (+ i tempi di risposta), la durata del PVT standard analizzato da Basner e Dinges (2011) |
| **ISI** | **2000–10 000 ms**, uniforme | Come nei Metodi di Basner e Dinges (2011): 2–10 s dall'ultima risposta allo stimolo successivo (in Sintropia l'ISI parte alla fine del trial; si aggiunge il feedback quando è attivo). La distribuzione uniforme non è specificata nella frase letta. Non verificato sul testo di Dinges e Powell (1985) |
| **Tempo massimo di risposta** | **10 000 ms**, poi omissione | **Scelta di progetto**: Basner e Dinges (2011) usavano un timeout di 30 s. Le omissioni contano come lapse |
| **Pratica** | **5 trial** con feedback | **Scelta di progetto**; esclusi dalle metriche |
| **Soglia di lapse** | **RT ≥ 500 ms** | **Verificato** sui Metodi di Basner e Dinges (2011): lapse = RT ≥ 500 ms, lo stesso confine di Sintropia. Il PVT breve di 3 minuti usa una soglia più bassa, non verificata qui |
| **Soglia di anticipazione** | **RT < 150 ms** | Soglia comune a tutta la piattaforma ([validazione RT](validazione-rt.md)), **scelta di progetto**: Basner e Dinges (2011) contano come false starts gli RT < 100 ms, quindi le risposte fra 100 e 149 ms sono valide là e anticipazioni qui |

Nota: l'ISI massimo di 10 s è anche il tempo massimo di risposta, quindi un trial con stimolo visibile per 10 s senza
risposta è un lapse molto lungo, non un errore tecnico.

---

## 4. Mappatura implementativa

Corrispondenza fra §3, §5 e il codice (`src/engine/tests/pvt.ts`, `src/config/defaults.ts`, `src/ui/tests/PvtView.tsx`).

| Elemento | Dove | Comportamento |
|---|---|---|
| Parametri | `DEFAULTS.pvt` | `nTrials 100`, `stimulusMaxMs 10000`, `isiMinMs 2000`, `isiMaxMs 10000`, `practiceTrials 5` |
| ISI | `generatePvt` | Un intero uniforme in [`isiMinMs`, `isiMaxMs`] per ogni trial (RNG con seme) |
| Stimolo | `PvtView` | Contatore di millisecondi dal comparire dello stimolo; oltre 500 ms il numero vira all'ambra |
| Risposta | `PvtView` | Barra spaziatrice; il trial termina alla pressione (`endOnResponse`) |
| Tasti prima dello stimolo | `createSequencer` | **Ignorati e non registrati**: la piattaforma non conta le false starts durante l'ISI |
| Classificazione RT | `classifyRt` | `INTERRUPTED → OMISSION → ANTICIPATION (< 150 ms) → VALID` |
| Metriche | `scorePvt` | Solo trial di test non interrotti; formule in §5 |

---

## 5. Metriche e formule

Sia $\{RT_i\}_{i=1}^{n}$ l'insieme degli RT dei trial **validi** (flag `VALID`, $RT \ge 150$ ms) e $m$ il numero di
**omissioni**. I trial interrotti e la pratica sono esclusi.

### 5.1 Lapse (misura primaria)

$$\text{Lapse} = \sum_{i=1}^{n} \mathbf{1}[RT_i \ge 500] + m
\qquad
\text{Tasso di lapse} = 100 \cdot \frac{\text{Lapse}}{n + m}$$

Un'omissione è un RT oltre il tempo massimo, quindi più lungo di 500 ms: conta come lapse. Le anticipazioni sono escluse
dal denominatore.

### 5.2 Velocità di risposta (1/RT)

$$\overline{v} = \frac{1}{n}\sum_{i=1}^{n}\frac{1000}{RT_i} \quad [\text{1/s}]$$

e la **media del 10% più lento** delle velocità, cioè dei $\max(1,\lceil n/10\rceil)$ valori più bassi di $1000/RT_i$.
Sono le misure raccomandate da Basner e Dinges (2011) come esiti primari insieme ai lapse. Gli RT vanno in millisecondi
nei dati grezzi; la velocità è riportata in 1/s.

### 5.3 RT medio, mediano e SD

$$\overline{RT} = \frac{1}{n}\sum_{i=1}^{n} RT_i
\qquad
SD_{RT} = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}\left(RT_i - \overline{RT}\right)^2}$$

La **mediana** è il valore centrale dell'insieme ordinato, oppure la media dei due valori centrali se $n$ è pari. Si
riportano per completezza e confronto con la letteratura, ma **non** come esiti primari (§1).

### 5.4 Fastest 10% e slowest 10%

Media degli RT del 10% più veloce e del 10% più lento: $k = \max(1,\lceil n/10\rceil)$ valori, dal più veloce e dal più
lento rispettivamente. Il 10% più lento è influenzato dai lapse.

### 5.5 Anticipazioni e omissioni

- **Anticipazione**: risposta con $RT < 150\,\text{ms}$ dopo la comparsa dello stimolo.
- **Omissione**: nessuna risposta entro 10 s.

---

## 6. Rilevanza per lo studio dell'ambiente fisico e limiti

Il PVT è nato per misurare l'effetto della perdita di sonno sulla vigilanza (§1). Usarlo per manipolazioni ambientali
(temperatura, CO₂, rumore, ventilazione) è una **scelta del ricercatore** che va giustificata con fonti specifiche dello
studio: in questo documento **non** sono riportati risultati ambientali basati sul PVT, perché non sono stati verificati.

Un esempio di ricerca sulla prestazione umana in ambienti interni è lo studio di Lan et al. (2011), con 12 partecipanti
a 22 °C e 30 °C, che riporta prestazione peggiore con il caldo e conclude che le temperature elevate vanno evitate negli
ambienti di lavoro; il riassunto dello studio non indica quali test neurocomportamentali siano stati usati e **non
menziona il PVT**:

> Lan, L., Wargocki, P., Wyon, D. P., & Lian, Z. (2011). *Effects of thermal
> discomfort in an office on perceived air quality, SBS symptoms, physiological
> responses, and human performance.* **Indoor Air, 21**(5), 376–390.
> https://doi.org/10.1111/j.1600-0668.2011.00714.x

Limiti da considerare:

- **Sensibilità non verificata** del PVT ai fattori ambientali nel contesto dello studio.
- **Precisione dei tempi in browser**: i lapse (≥ 500 ms) sono robusti agli errori di misura di decine di ms, meno la
  velocità di risposta e gli RT veloci ([validazione RT](validazione-rt.md)).
- **Le false starts durante l'ISI non sono registrate** (§4).
- **Durata**: il PVT a 10 minuti va condotto con ambiente e orario controllati; il PVT breve a 3 minuti usa soglie
  diverse e non è quello implementato.
- **Effetti di apprendimento**: la pratica iniziale di 5 trial è breve.

---

## Riferimenti

- Dinges, D. F., & Powell, J. W. (1985). Microcomputer analyses of performance on a portable, simple visual RT task during sustained operations. *Behavior Research Methods, Instruments, & Computers, 17*(6), 652–655. https://doi.org/10.3758/BF03200977
- Basner, M., & Dinges, D. F. (2011). Maximizing sensitivity of the psychomotor vigilance test (PVT) to sleep loss. *Sleep, 34*(5), 581–591. https://doi.org/10.1093/sleep/34.5.581
- Lan, L., Wargocki, P., Wyon, D. P., & Lian, Z. (2011). Effects of thermal discomfort in an office on perceived air quality, SBS symptoms, physiological responses, and human performance. *Indoor Air, 21*(5), 376–390. https://doi.org/10.1111/j.1600-0668.2011.00714.x

## Cronologia delle revisioni

- **Revisione scientifica 2026-10.** Il paper precedente attribuiva a Basner e Dinges raccomandazioni non presenti
  nel loro riassunto (soglie di 355 ms, media di fastest e slowest 10% come metriche principali, test brevi meno
  sensibili) e riportava risultati ambientali basati sul PVT da fonti (Allen 2016, Wargocki 2000, Shendell 2004, Smith
  1991, Zhang 2010) non verificate per questo uso: rimossi. Corretto il motore: le **omissioni ora contano come lapse**
  e il tasso è calcolato sui trial utili, la **mediana** con n pari è la media dei due valori centrali (prima era il valore
  superiore), aggiunta la **velocità di risposta (1/RT)** raccomandata come esito primario. Corretto nel sequencer
  condiviso un difetto per cui un tasto premuto durante la fissazione veniva registrato con un RT calcolato sull'onset
  del trial precedente.
- **2026-10-30.** Attenuata l'attribuzione della soglia di 500 ms (non presente nel riassunto di Basner e Dinges) e
  rimossa la soglia di 355 ms del PVT breve, priva di fonte verificata.
- **2026-10-30 (testo completo di Basner e Dinges, 2011).** Letti i Metodi su PubMed Central: verificati l'ISI di 2–10 s
  (dall'ultima risposta), la soglia di lapse ≥ 500 ms (ora attribuita alla fonte, non più al manuale Inquisit), le false
  starts < 100 ms e il timeout di 30 s. Dichiarate come scelte di progetto le due differenze: timeout di 10 s e soglia di
  anticipazione di 150 ms.
