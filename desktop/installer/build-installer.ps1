<#
.SYNOPSIS
  Compila la release e produce in dist-desktop/: MSI, zip portatile, SHA256SUMS.txt.
  Richiede cargo e wix (dotnet tool) nel PATH, con l'estensione WixToolset.UI.wixext.
#>
[CmdletBinding()]
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$desktop = Resolve-Path (Join-Path $PSScriptRoot '..')
$repo = Resolve-Path (Join-Path $desktop '..')
$dist = Join-Path $repo 'dist-desktop'
$exe = Join-Path $desktop 'target\release\sintropia-desktop.exe'

$version = ((Get-Content (Join-Path $desktop 'Cargo.toml') -Raw) -split '\[workspace\.package\]')[1] |
    Select-String -Pattern '(?m)^version\s*=\s*"([^"]+)"' | ForEach-Object { $_.Matches[0].Groups[1].Value }
if (-not $version) { throw 'Versione non trovata in desktop/Cargo.toml (workspace.package.version).' }

if (-not $SkipBuild) {
    Push-Location $desktop
    try { cargo build --release -p sintropia-desktop; if ($LASTEXITCODE) { throw 'cargo build fallito' } } finally { Pop-Location }
}
if (-not (Test-Path $exe)) { throw "Eseguibile non trovato: $exe" }

# Firma digitale opzionale. SINTROPIA_SIGN_COMMAND e un comando con il segnaposto {file}, ad esempio
#   signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /sha1 <thumbprint> {file}
# (certificato su token/HSM, Azure Trusted Signing, SignPath...). Se non e impostato i file restano non firmati.
function Invoke-Sign([string]$File) {
    $template = $env:SINTROPIA_SIGN_COMMAND
    if (-not $template) { return }
    Invoke-Expression ($template -replace '\{file\}', ('"' + $File + '"'))
    if ($LASTEXITCODE) { throw "Firma fallita per $File" }
    $sig = Get-AuthenticodeSignature $File
    if ($sig.Status -ne 'Valid') { throw "Firma non valida per ${File}: $($sig.Status)" }
    Write-Host "Firmato: $File ($($sig.SignerCertificate.Subject))"
}
Invoke-Sign $exe

New-Item -ItemType Directory -Force $dist | Out-Null
Get-ChildItem $dist -File | Remove-Item -Force

# Licenza in RTF per la UI dell'MSI
$rtf = Join-Path $env:TEMP 'sintropia-license.rtf'
$text = (Get-Content (Join-Path $repo 'LICENSE') -Raw) -replace '\\', '\\' -replace '[{}]', '' -replace "`r?`n", '\par '
Set-Content $rtf "{\rtf1\ansi\deff0{\fonttbl{\f0 Segoe UI;}}\fs20 $text}" -Encoding Ascii

$msi = Join-Path $dist 'Sintropia-Setup-x64.msi'
wix build (Join-Path $PSScriptRoot 'Sintropia.wxs') -arch x64 -ext WixToolset.UI.wixext -culture it-IT -pdbtype none `
    -d "Version=$version" -d "ExePath=$exe" -d "LicenseRtf=$rtf" -d "IconPath=$(Join-Path $PSScriptRoot 'icon.ico')" -o $msi
if ($LASTEXITCODE) { throw 'wix build fallito' }
Invoke-Sign $msi

# Zip portatile
$stage = Join-Path $env:TEMP "sintropia-portable-$version"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $stage | Out-Null
Copy-Item $exe, (Join-Path $repo 'LICENSE') $stage
Set-Content (Join-Path $stage 'LEGGIMI.txt') -Encoding UTF8 -Value @"
Sintropia - Cognitive tests Hub (desktop) $version
Versione portatile: esegui sintropia-desktop.exe, nessuna installazione richiesta.
I dati restano nel profilo utente. L'eseguibile non e firmato: SmartScreen puo avvisare
(Ulteriori informazioni > Esegui comunque). Licenza MIT: vedi LICENSE.
"@
Compress-Archive "$stage\*" (Join-Path $dist 'Sintropia-Desktop-x64.zip') -Force

# SHA256SUMS in formato "hash  nome"
Get-ChildItem $dist -File | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object {
    "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), $_.Name
} | Set-Content (Join-Path $dist 'SHA256SUMS.txt') -Encoding Ascii

Get-ChildItem $dist | Select-Object Name, Length
Get-Content (Join-Path $dist 'SHA256SUMS.txt')
