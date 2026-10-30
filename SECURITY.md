# Politica di sicurezza

## Versioni supportate

Si supporta l'ultima versione pubblicata (ramo `main` e ultima Release). Le correzioni di sicurezza non vengono riportate su versioni precedenti.

## Come segnalare una vulnerabilità

**Non aprire una issue pubblica.** Usa la segnalazione privata di GitHub:
[Security → Report a vulnerability](https://github.com/arturograntchiappini-bit/ciriaf-hub-testcognitivi/security/advisories/new).

Indica, se puoi: componente (sito web, app desktop, installer, script `install.ps1`), passi per riprodurre, impatto atteso e versione.
Si risponde entro pochi giorni; le correzioni confermate vengono pubblicate con una nota di rilascio e, se serve, un advisory.

## Ambito e modello di minaccia

Sintropia non ha backend, account né database: il sito è statico e tutti i dati restano nel browser (`localStorage`) o nella cartella
dell'utente (app desktop). Le superfici da proteggere sono quindi:

| Superficie | Rischio | Difesa |
|---|---|---|
| Sito web | XSS, clickjacking, contenuti di terze parti | Nessun `innerHTML`; paper resi con nodi DOM; KaTeX con `trust: false`; CSP stretta (`default-src 'none'`, solo risorse proprie; `'wasm-unsafe-eval'` solo per il motore WebAssembly, senza `eval`), HSTS, COOP/CORP, `frame-ancestors 'none'` |
| Dati salvati e file importati | Valori manomessi che bloccano il browser o l'app | Ogni parametro è validato e riportato nei limiti dichiarati; protocolli importati con struttura, dimensione e numero di elementi limitati |
| File esportati | Iniezione di formule nei fogli di calcolo (CSV injection), XSS nel report HTML | Neutralizzazione delle celle che iniziano come una formula; report HTML con tutto escapato e CSP `default-src 'none'`; nomi file ripuliti |
| Installer e `install.ps1` | Download alterato, downgrade a HTTP, archivi malevoli | Solo HTTPS; verifica SHA-256; controllo anti zip-slip; verifica della firma digitale se presente; installazione per-utente senza elevazione |
| App desktop | Esecuzione di processi esterni, file enormi, scritture interrotte | Nessun processo esterno; letture con tetto di dimensione; scritture atomiche; parametri validati |
| Catena di fornitura | Dipendenze vulnerabili, azioni CI manomesse | `npm audit` e `cargo deny` in CI; Dependabot; azioni GitHub fissate per SHA; permessi minimi; attestazione di provenienza degli artefatti di release |

Fuori ambito: la sicurezza del dispositivo dell'utente, la riservatezza dei dati esportati una volta salvati su disco, la validità psicometrica
dei test (trattata nei paper).

## Verifica dell'integrità dei download

Ogni Release pubblica `SHA256SUMS.txt`. Dopo aver scaricato l'installer:

```powershell
(Get-FileHash .\Sintropia-Setup-x64.msi -Algorithm SHA256).Hash.ToLower()
```

Il valore deve coincidere con la riga corrispondente di `SHA256SUMS.txt`. Gli artefatti della Release hanno anche un'attestazione di provenienza
(`gh attestation verify <file> --repo arturograntchiappini-bit/ciriaf-hub-testcognitivi`).

Dettagli della revisione di sicurezza e delle correzioni: [docs/sicurezza.md](docs/sicurezza.md).
