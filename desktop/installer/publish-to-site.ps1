<# Copia MSI, zip e SHA256SUMS da dist-desktop/ a public/download/ (servito da Netlify). Non committa. #>
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$src = Join-Path $repo 'dist-desktop'
$dst = Join-Path $repo 'public\download'
$files = 'Sintropia-Setup-x64.msi', 'Sintropia-Desktop-x64.zip', 'SHA256SUMS.txt'
foreach ($f in $files) { if (-not (Test-Path (Join-Path $src $f))) { throw "Manca ${f}: esegui prima build-installer.ps1" } }
New-Item -ItemType Directory -Force $dst | Out-Null
foreach ($f in $files) { Copy-Item (Join-Path $src $f) $dst -Force }
Copy-Item (Join-Path $repo 'scripts\install.ps1') (Join-Path $repo 'public\install.ps1') -Force
Write-Host "Copiati in $dst. Link: ./download/Sintropia-Setup-x64.msi, ./download/Sintropia-Desktop-x64.zip, ./download/SHA256SUMS.txt"
