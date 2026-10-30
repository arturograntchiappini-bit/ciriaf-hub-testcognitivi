<#
.SYNOPSIS
  Installa, aggiorna o rimuove Sintropia Desktop da terminale (Windows, nessuna elevazione necessaria).
.EXAMPLE
  .\install.ps1                          # MSI per-utente (sito, poi GitHub Releases, poi file del repository)
  .\install.ps1 -Portable                # zip in %LOCALAPPDATA%\Sintropia
  .\install.ps1 -Uninstall               # rimuove MSI e/o versione portatile
  .\install.ps1 -InstallerPath .\Sintropia-Setup-x64.msi -WhatIf
.PARAMETER BaseUrl
  Cartella di download sul sito (default: variabile d'ambiente SINTROPIA_BASE_URL, es. https://tuosito.example/download).
  Se vuota o non raggiungibile si usa GitHub Releases e, in ultimo, la cartella public/download del repository.
.PARAMETER InstallerPath
  File MSI (o zip con -Portable) locale al posto del download; SHA256SUMS.txt accanto al file, se presente, e verificato.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$Portable,
    [switch]$Uninstall,
    [string]$InstallerPath,
    [string]$BaseUrl = $env:SINTROPIA_BASE_URL
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# PowerShell 5.1 negozia TLS 1.0 se non richiesto altrimenti.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
if ($BaseUrl -and $BaseUrl -notmatch '^https://') { throw "BaseUrl deve usare https:// (ricevuto: $BaseUrl)." }
$GitHubBases = @(
    'https://github.com/arturograntchiappini-bit/ciriaf-hub-testcognitivi/releases/latest/download',
    'https://raw.githubusercontent.com/arturograntchiappini-bit/ciriaf-hub-testcognitivi/main/public/download'
)
$PortableDir = Join-Path $env:LOCALAPPDATA 'Sintropia'
$AssetName = if ($Portable) { 'Sintropia-Desktop-x64.zip' } else { 'Sintropia-Setup-x64.msi' }

function Get-MsiProductCode {
    $keys = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
    Get-ItemProperty $keys -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -eq 'Sintropia' -and $_.PSChildName -match '^\{.*\}$' } |
        Select-Object -First 1 -ExpandProperty PSChildName
}

function Save-Download([string]$Name, [string]$Folder) {
    $bases = @($BaseUrl.TrimEnd('/')) + $GitHubBases | Where-Object { $_ }
    foreach ($base in $bases) {
        try {
            Invoke-WebRequest "$base/$Name" -OutFile (Join-Path $Folder $Name) -UseBasicParsing
            Write-Host "Scaricato $Name da $base"
            return $base
        } catch { Write-Warning "Download da $base non riuscito: $($_.Exception.Message)" }
    }
    throw "Impossibile scaricare $Name."
}

function Assert-SafeZip([string]$ZipFile, [string]$Destination) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $root = [IO.Path]::GetFullPath($Destination).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $zip = [IO.Compression.ZipFile]::OpenRead($ZipFile)
    try {
        foreach ($entry in $zip.Entries) {
            $target = [IO.Path]::GetFullPath((Join-Path $Destination $entry.FullName))
            if (-not $target.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw "Archivio non sicuro: la voce '$($entry.FullName)' esce dalla cartella di destinazione." }
        }
    } finally { $zip.Dispose() }
}

function Show-Signature([string]$File) {
    $sig = Get-AuthenticodeSignature $File
    if ($sig.Status -eq 'Valid') { Write-Host "Firma digitale valida: $($sig.SignerCertificate.Subject)" }
    elseif ($sig.Status -eq 'NotSigned') { Write-Warning 'File non firmato digitalmente: Windows SmartScreen puo mostrare un avviso. Verifica sempre lo SHA-256.' }
    else { throw "Firma digitale non valida ($($sig.Status)) per $File. Installazione annullata." }
}

function Assert-Checksum([string]$File, [string]$SumsFile) {
    if (-not (Test-Path $SumsFile)) { throw "SHA256SUMS.txt non trovato: impossibile verificare l'integrita di $File." }
    $name = Split-Path $File -Leaf
    $line = Get-Content $SumsFile | Where-Object { $_ -match "\s\*?$([regex]::Escape($name))$" } | Select-Object -First 1
    if (-not $line) { throw "$name non e elencato in SHA256SUMS.txt." }
    $expected = ($line -split '\s+')[0].ToLower()
    $actual = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([IO.File]::ReadAllBytes($File))).Replace('-', '').ToLower() # .NET: Get-FileHash non funziona con -WhatIf
    if ($expected -ne $actual) { throw "SHA256 non corrispondente per $name (atteso $expected, trovato $actual). Installazione annullata." }
    Write-Host "SHA256 verificato: $actual"
}

if ($Uninstall) {
    $code = Get-MsiProductCode
    if ($code -and $PSCmdlet.ShouldProcess("Sintropia $code", 'Disinstallazione MSI')) {
        $p = Start-Process msiexec -ArgumentList "/x $code /qn" -Wait -PassThru
        if ($p.ExitCode -notin 0, 3010) { throw "msiexec ha restituito $($p.ExitCode)." }
        Write-Host 'Sintropia (MSI) disinstallato.'
    }
    if ((Test-Path $PortableDir) -and $PSCmdlet.ShouldProcess($PortableDir, 'Rimozione versione portatile')) {
        Remove-Item $PortableDir -Recurse -Force
        Write-Host 'Versione portatile rimossa.'
    }
    if (-not $code -and -not (Test-Path $PortableDir)) { Write-Host 'Sintropia non risulta installato.' }
    return
}

$work = Join-Path ([IO.Path]::GetTempPath()) "sintropia-install-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory $work -WhatIf:$false | Out-Null
try {
    if ($InstallerPath) {
        if (-not (Test-Path $InstallerPath)) { throw "File non trovato: $InstallerPath" }
        $file = [IO.Path]::GetFullPath($InstallerPath)
        $sums = Join-Path (Split-Path $file) 'SHA256SUMS.txt'
        if (Test-Path $sums) { Assert-Checksum $file $sums } else { Write-Warning 'SHA256SUMS.txt non trovato accanto al file: integrita non verificata (file locale scelto da te).' }
    } elseif ($PSCmdlet.ShouldProcess($AssetName, 'Download e verifica SHA256')) {
        $base = Save-Download $AssetName $work
        Invoke-WebRequest "$base/SHA256SUMS.txt" -OutFile (Join-Path $work 'SHA256SUMS.txt') -UseBasicParsing
        $file = Join-Path $work $AssetName
        Assert-Checksum $file (Join-Path $work 'SHA256SUMS.txt')
    } else { return }

    if ($Portable) {
        if ($PSCmdlet.ShouldProcess($PortableDir, 'Estrazione versione portatile')) {
            Assert-SafeZip $file $PortableDir
            Expand-Archive $file $PortableDir -Force
            Write-Host "Installato (portatile) in $PortableDir. Avvia: $PortableDir\sintropia-desktop.exe"
        }
    } elseif ($PSCmdlet.ShouldProcess($file, 'Installazione MSI per-utente (silenziosa)')) {
        Show-Signature $file
        $p = Start-Process msiexec -ArgumentList "/i `"$file`" /qn" -Wait -PassThru
        if ($p.ExitCode -notin 0, 3010) { throw "msiexec ha restituito $($p.ExitCode)." }
        Write-Host 'Sintropia installato. Lo trovi nel menu Start.'
    }
} finally { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue -WhatIf:$false }
