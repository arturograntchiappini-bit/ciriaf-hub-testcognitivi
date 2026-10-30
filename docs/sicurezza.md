# Revisione di sicurezza

Revisione dell'intera piattaforma (sito web, motori, app desktop, installer, script e CI) eseguita il 2026-10-30. Questo documento
registra ciò che è stato controllato, ciò che è stato trovato e ciò che è stato corretto. La politica di segnalazione è in [SECURITY.md](../SECURITY.md).

## Metodo

Lettura del codice di tutte le superfici che trattano dati non fidati (localStorage, file importati, parametri, file esportati,
URL, processi esterni), analisi delle dipendenze (`npm audit`, `cargo deny`), prove in browser reale della CSP sulla build di produzione e
prove dirette dell'installer contro un archivio ostile. Ogni correzione ha un test di regressione.

## Esiti

| # | Gravità | Superficie | Problema | Correzione |
|---|---|---|---|---|
| 1 | Alta | App desktop | L'avviso sonoro lanciava `powershell` cercandolo nel PATH (ricerca dell'eseguibile manipolabile, processo esterno inutile) | `Beep` di sistema su un thread, nessun processo esterno |
| 2 | Alta | Web e desktop | Parametri letti da `localStorage`, da `settings.json` o da un protocollo importato non erano limitati: `nTrials = 1e9` bloccava il browser o l'app | `sanitizeParams` (web) e `sanitize_params` (Rust): chiavi note, numeri finiti, entro i limiti di `PARAM_SECTIONS`; applicati al caricamento e alla creazione del test |
| 3 | Media | Web | I modelli di sessione e il run salvato erano letti con un cast senza controlli; il file di protocollo importato non aveva limiti di dimensione, di numero di fasi o di test ammessi | Parser strutturale con limiti (1 MB, 50 fasi, 100 pin, 50 test per batteria, durate ≤ 7 giorni), test whitelist, testi tagliati |
| 4 | Media | Export | CSV injection: un campo testuale che inizia con `=`, `+`, `@`, `-` può essere eseguito da Excel | Apice iniziale sulle stringhe (non sui numeri), in TS e in Rust, con fixture golden aggiornate |
| 5 | Media | Installer | `install.ps1` accettava `BaseUrl` HTTP e non controllava le voci dello zip portatile (zip-slip); su PowerShell 5.1 il TLS 1.2 non era imposto | Solo HTTPS, TLS 1.2, controllo delle voci prima dell'estrazione, verifica della firma Authenticode quando presente |
| 6 | Media | App desktop | Letture di file senza tetto di dimensione; scritture non atomiche (un crash lasciava impostazioni e sessioni troncate) | `read_text_capped` (2 MiB configurazione, 64 MiB risultati) e `write_atomic` (file temporaneo + rinomina) |
| 7 | Media | Dipendenze | KaTeX 0.16.22 (prototype pollution, GHSA-238p-pmpm-9mq7), Vite e Vitest con advisory | KaTeX 0.19, aggiornamento di Vite/Vitest: `npm audit` a 0 vulnerabilità |
| 8 | Bassa | Web | CSP con `style-src 'unsafe-inline'` generale, senza `form-action`, `base-uri` ristretto, COOP/CORP | `default-src 'none'`; stili inline ammessi solo come attributi (`style-src-attr`); `form-action 'none'`, `base-uri 'none'`, COOP e CORP `same-origin`, HSTS a 2 anni. Verificata su Chrome sulle pagine principali: nessuna violazione |
| 9 | Bassa | Report HTML | Nessuna CSP nel file esportato | `default-src 'none'; style-src 'unsafe-inline'` nel report; il contenuto era già escapato |
| 10 | Bassa | Download | Nome file derivato dal nome del protocollo senza ripulitura; `revokeObjectURL` immediato poteva annullare il salvataggio | `safeFilename` (niente separatori di percorso, caratteri riservati o di controllo, 120 caratteri) e revoca ritardata |
| 11 | Bassa | CI | Workflow di release con azioni non fissate, nessuna CI sui test, nessuna verifica delle dipendenze | `ci.yml` (tipi, test, build, `npm audit`, fmt, clippy `-D warnings`, test Rust, wasm, `cargo deny`, deriva delle fixture); azioni fissate per SHA; permessi minimi; attestazione di provenienza; Dependabot |

Verificati e **già corretti** all'inizio della revisione: nessun `innerHTML`, `eval` o `dangerouslySetInnerHTML` nel sito; link esterni con `rel="noopener noreferrer"`
e `isSafeHref`; KaTeX con `trust: false`; report HTML con escape di tutti i campi; nessun segreto nel repository; nessun codice `unsafe` nei crate
`core`, `engines`, `content` (nell'app `unsafe` compare una sola volta, per la chiamata `Beep`, con commento `SAFETY`).

## Residui e limiti noti

- **Firma del codice.** L'MSI e l'eseguibile non sono firmati: Windows SmartScreen mostra un avviso finché non c'è una firma e una reputazione.
  Lo script di build firma automaticamente se imposti `SINTROPIA_SIGN_COMMAND` (segreto della CI o variabile locale): vedi sotto.
- **Checksum e binari sullo stesso sito.** `SHA256SUMS.txt` garantisce l'integrità del download ma non l'autenticità se il sito fosse compromesso: per questo
  gli artefatti della Release hanno l'attestazione di provenienza e, con la firma, la firma Authenticode.
- **`'wasm-unsafe-eval'` nella CSP.** Il motore Rust gira come modulo WebAssembly e il browser lo istanzia solo con questa direttiva in `script-src`. Non consente `eval` né `new Function` (quelli restano vietati); consente la compilazione di WebAssembly dalla stessa origine. Il modulo è un file statico committato (`public/engine/`), verificato dalla CI contro il TypeScript; se la direttiva mancasse, la web app ripiega sul TypeScript.
- **`unsafe` nel crate `wasm`.** L'esposizione `extern "C"` richiede `#[no_mangle]`, che il compilatore conta come `unsafe_code`: il crate usa `deny(unsafe_code)` con un `allow` limitato al modulo `ffi`, senza blocchi `unsafe` veri e senza dipendenze oltre a `serde`.
- **`style-src-attr 'unsafe-inline'`. React imposta stili inline come attributi; non esiste un'alternativa senza riscrivere l'interfaccia. Gli elementi `<style>` restano limitati a risorse proprie.
- **`localStorage`.** I dati sono nel profilo del browser, in chiaro: non c'è un segreto da proteggere, ma chi ha accesso al dispositivo può leggerli.

## Firmare l'installer

Per rimuovere l'avviso SmartScreen servono un certificato di firma del codice e, per un'autorità nuova, un po' di reputazione. Opzioni:

1. **SignPath Foundation** (gratuita per progetti open source): richiede una domanda e la firma avviene dalla CI.
2. **Azure Trusted Signing**: servizio a canone mensile basso, con verifica dell'identità; la firma si invoca da riga di comando.
3. **Certificato OV/EV di una CA** su token hardware (le CA non consegnano più chiavi esportabili): costo annuo, l'EV dà reputazione immediata.
4. **Microsoft Store**: distribuzione senza SmartScreen, con quota di registrazione una tantum.

Qualunque sia la scelta, basta impostare `SINTROPIA_SIGN_COMMAND` con il comando di firma e il segnaposto `{file}`, ad esempio
`signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /sha1 <thumbprint> {file}`; `build-installer.ps1` firma l'eseguibile e l'MSI
e verifica la firma prima di proseguire.

## Impostazioni del repository su GitHub

Le regole sono in [`.github/rulesets/`](../.github/rulesets/) e si importano da *Settings → Rules → Rulesets → New ruleset → Import a ruleset*:

- `protect-main.json`: su `main` niente cancellazione né force push, cronologia lineare, modifiche solo tramite pull request con discussioni risolte e i cinque controlli della CI verdi. Gli amministratori possono aggirare le regole solo passando da una pull request.
- `protect-tags.json`: i tag `v*` non si possono cancellare, spostare né riscrivere (una Release con attestazione di provenienza deve restare riferita allo stesso commit).

Da attivare a mano in *Settings → Code security*: Private vulnerability reporting, Dependency graph, Dependabot alerts e security updates, Secret scanning con push protection. In *Settings → Actions → General*: permessi del `GITHUB_TOKEN` in sola lettura per default e approvazione obbligatoria per i workflow dei collaboratori esterni alla prima contribuzione.
