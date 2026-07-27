# CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub

Piattaforma web per la somministrazione di sei test cognitivi in laboratorio, per
la ricerca sperimentale (CIRIAF, laboratorio COLAB/NEXTROOM). Esecuzione anonima,
nessun backend: i test girano interamente nel browser.

## Test disponibili

| Test | Dominio cognitivo |
|---|---|
| Stroop 1 (focus parola) | Velocità di elaborazione |
| Stroop 2 (focus colore) | Risoluzione del conflitto / interferenza |
| Go / No-Go | Inibizione motoria rapida |
| Corsi Block Task | Memoria visuo-spaziale di configurazione |
| N-Back (2-back) | Memoria di lavoro a flusso continuo |
| Wisconsin Card Sorting Test | Flessibilità cognitiva / set-shifting |

## Avvio rapido

```bash
npm install       # installa le dipendenze
npm run dev       # sviluppo (http://localhost:5173)
npm run build     # build statica di produzione in dist/
npm run preview   # anteprima della build
npm test          # esegue la suite di test (Vitest)
```

Requisiti: Node.js ≥ 20.

## Modalità Sessione

Oltre alla somministrazione dei singoli test, la piattaforma offre la **modalità
Sessione**: un protocollo cronometrico in cui si sceglie la durata totale, si
divide la sessione in fasi nominate (ciascuna con una durata) e si collocano dei
pin temporali "t" — visualizzati su una linea temporale — in cui somministrare una
batteria di test selezionati e configurati. Fuori dai "t" il soggetto vede solo un
conto alla rovescia (con avviso sonoro allo scadere). La sessione è ripristinabile
se il browser si chiude e a fine protocollo esporta un file JSON di sessione e un
CSV combinato (una riga per trial, con colonne di contesto fase / t / test).

## Come si somministra un test

1. Dalla **home**, il soggetto seleziona il test indicato dallo sperimentatore.
2. Legge le **istruzioni**, poi c'è una breve **pratica** con feedback (saltabile).
3. Esegue il **test** a schermo intero.
4. Alla fine vede una **schermata di risultati** con le metriche da trascrivere e
   il **codice sessione**; può **scaricare CSV e JSON** con i dati grezzi.

## Dati e privacy

- Nessun dato personale, nessun database, nessun account.
- Ogni sessione è identificata solo da un codice anonimo `XXXX-HHMM`.
- I dati grezzi (trial per trial, con i flag di validazione degli RT) si
  esportano in CSV (per Excel, separatore `;`) e JSON.

## Parametri

Tutti i parametri dei test (numero di trial, durate, proporzioni, ecc.) sono
regolabili dal pannello **Impostazioni** (icona ingranaggio in home) e vengono
salvati nel browser e scritti dentro ogni file esportato. I valori di default
sono ancorati alla letteratura scientifica (vedi sotto).

## Documentazione

- `docs/architettura.md` — funzionamento del codice e dei meccanismi dei test.
- `docs/scientific/` — un documento per test con paradigma, parametri e fonti
  bibliografiche; `bibliography.md` per la bibliografia completa;
  `validazione-rt.md` per il trattamento dei tempi di reazione.
- `docs/superpowers/specs/` e `docs/superpowers/plans/` — spec di progetto e piano
  di implementazione.

## Stack

Vite + React 18 + TypeScript (strict) + Tailwind CSS. Test con Vitest. Il motore
dei test è TypeScript puro, unit-testato e indipendente da React.
