# Sintropia Desktop

App desktop 100% Rust (eframe/egui) della dashboard tecnica di Sintropia - Cognitive tests Hub. I motori sono gli stessi della web app
(il TypeScript in `src/engine/**` e il riferimento; le fixture golden in `fixtures/` verificano che il Rust lo riproduca).

## Struttura del workspace

| Crate | Ruolo |
|---|---|
| `crates/core` (`sintropia-core`) | tipi condivisi, RNG mulberry32, validazione, SDT, sequencer, export, sessioni |
| `crates/engines` (`sintropia-engines`) | un motore puro per test; compila anche per `wasm32-unknown-unknown` |
| `crates/content` (`sintropia-content`) | catalogo, istruzioni, sezioni dei parametri (dati di UI) |
| `crates/app` (`sintropia-desktop`) | GUI eframe/egui; `build.rs` incorpora icona e metadati |
| `installer/` | WiX (`Sintropia.wxs`), `build-installer.ps1`, `publish-to-site.ps1`, `icon.ico`, `make-icon.ps1` |

## Compilare e testare

```powershell
cd desktop
cargo build --release -p sintropia-desktop     # target\release\sintropia-desktop.exe
cargo test --workspace
cargo check -p sintropia-engines --target wasm32-unknown-unknown
```

## Creare l'installer

Prerequisiti (solo utente, niente admin): .NET SDK 8 e WiX.

```powershell
dotnet tool install --global wix --version 5.0.2
wix extension add -g WixToolset.UI.wixext/5.0.2
.\desktop\installer\build-installer.ps1        # -SkipBuild per riusare l'exe gia compilato
```

Produce in `dist-desktop/` (nomi costanti, per i link `releases/latest/download/...`):
`Sintropia-Setup-x64.msi` (per-utente, senza UAC, in `%LOCALAPPDATA%\Programs\Sintropia`, Start Menu, Desktop opzionale,
licenza MIT nella UI, aggiornamenti in-place tramite UpgradeCode fisso), `Sintropia-Desktop-x64.zip` (portatile) e `SHA256SUMS.txt`.
La versione viene da `workspace.package.version` in `Cargo.toml`: aumentala prima di ogni rilascio.

Installazione silenziosa a mano: `msiexec /i Sintropia-Setup-x64.msi /qn` (cartella: `INSTALLFOLDER=C:\percorso\`;
icona Desktop: `ADDLOCAL=Main,DesktopIcon`); rimozione: `msiexec /x Sintropia-Setup-x64.msi /qn`.

## Distribuzione

- **Sito**: `.\desktop\installer\publish-to-site.ps1` copia i tre file in `public/download/` (servito da Netlify, intestazioni in
  `public/_headers`). Link relativi: `./download/Sintropia-Setup-x64.msi`, `./download/Sintropia-Desktop-x64.zip`, `./download/SHA256SUMS.txt`.
- **Terminale**: `scripts/install.ps1` (`-Portable`, `-Uninstall`, `-BaseUrl`, `-InstallerPath`, `-WhatIf`) scarica dal sito
  (`-BaseUrl` o variabile `SINTROPIA_BASE_URL`), con ripiego su GitHub Releases, verifica lo SHA256 e installa.
- **GitHub Releases**: il workflow `.github/workflows/release-desktop.yml` parte al push di un tag `v*`, esegue i test e pubblica gli artefatti.

## Firma del codice (non ancora attiva)

L'eseguibile e l'MSI **non sono firmati**: SmartScreen mostra "Windows ha protetto il PC" (Ulteriori informazioni > Esegui comunque).
Serve un certificato di firma del codice che solo il titolare può ottenere (opzioni in [`docs/sicurezza.md`](../docs/sicurezza.md)).
Lo script di build è già predisposto: imposta `SINTROPIA_SIGN_COMMAND` con il comando di firma e il segnaposto `{file}`, ad esempio

```powershell
$env:SINTROPIA_SIGN_COMMAND = 'signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /sha1 <thumbprint> {file}'
./installer/build-installer.ps1
```

`build-installer.ps1` firma l'eseguibile, ricostruisce l'MSI, firma anche l'MSI, verifica le firme e solo dopo calcola `SHA256SUMS.txt`.
Nella CI la stessa variabile è il segreto `SINTROPIA_SIGN_COMMAND` del workflow di release.
