<#
.SYNOPSIS
  Avvia sintropia-desktop con i flag dati, cattura SOLO la finestra dell'app in PNG e la chiude.
.EXAMPLE
  .\screenshot.ps1 -Out ..\screenshots\dashboard.png -AppArgs '--screen','dashboard' -Size 1280x800
  .\screenshot.ps1 -Out ..\screenshots\test-pvt.png -AppArgs '--test','pvt','--no-practice' -WaitMs 4500
#>
param(
    [Parameter(Mandatory)] [string] $Out,
    [string[]] $AppArgs = @(),
    [string] $Size = '1100x700',
    [int] $WaitMs = 5000,
    [string] $Exe = ''
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Exe) {
    $Exe = @('target\release\sintropia-desktop.exe', 'target\debug\sintropia-desktop.exe') |
        ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Exe -or -not (Test-Path $Exe)) { throw 'sintropia-desktop.exe non trovato: esegui cargo build prima.' }

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  // Finestra visibile più grande del processo (winit crea anche finestre di servizio minuscole).
  public static IntPtr Largest(uint pid) {
    IntPtr best = IntPtr.Zero; long area = 0;
    EnumWindows((h, l) => {
      uint p; GetWindowThreadProcessId(h, out p);
      RECT r;
      if (p == pid && IsWindowVisible(h) && GetWindowRect(h, out r)) {
        long a = (long)(r.Right - r.Left) * (r.Bottom - r.Top);
        if (a > area) { area = a; best = h; }
      }
      return true; }, IntPtr.Zero);
    return area >= 200L * 200L ? best : IntPtr.Zero;
  }
}
'@
[void][Win]::SetProcessDPIAware()

# Valida solo l'area client (sotto la barra del titolo): PrintWindow su OpenGL dà spesso un client tutto bianco o nero.
function Test-Image([System.Drawing.Bitmap] $bmp) {
    $colors = @{}; $n = 0; $same = 0
    $first = $bmp.GetPixel([int]($bmp.Width / 2), $bmp.Height - 5).ToArgb()
    for ($y = 60; $y -lt $bmp.Height - 4; $y += 7) { for ($x = 12; $x -lt $bmp.Width - 12; $x += 7) {
        $argb = $bmp.GetPixel($x, $y).ToArgb(); $n++
        if ($argb -eq $first) { $same++ }
        $colors[$argb] = 1
    } }
    return ($same / $n -lt 0.995) -and ($colors.Count -ge 6)
}

$proc = Start-Process -FilePath $Exe -ArgumentList (@($AppArgs) + @('--size', $Size)) -PassThru
try {
    $deadline = (Get-Date).AddSeconds(60)
    $h = [IntPtr]::Zero
    while ($h -eq [IntPtr]::Zero -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 100; $h = [Win]::Largest([uint32]$proc.Id)
    }
    if ($h -eq [IntPtr]::Zero) { throw 'finestra non comparsa' }
    Start-Sleep -Milliseconds $WaitMs

    $r = New-Object Win+RECT
    # 9 = DWMWA_EXTENDED_FRAME_BOUNDS (esclude l'ombra invisibile della finestra)
    if ([Win]::DwmGetWindowAttribute($h, 9, [ref]$r, [Runtime.InteropServices.Marshal]::SizeOf($r)) -ne 0) { [void][Win]::GetWindowRect($h, [ref]$r) }
    $w = $r.Right - $r.Left; $hgt = $r.Bottom - $r.Top
    if ($w -lt 200 -or $hgt -lt 200) { throw "finestra di dimensioni anomale: ${w}x$hgt" }

    # 1) PrintWindow con PW_RENDERFULLCONTENT (0x2): cattura anche se coperta, ma le finestre OpenGL possono uscire nere.
    # PrintWindow disegna dall'origine di GetWindowRect (include i bordi invisibili di ~8 px): si cattura il
    # rettangolo completo e si ritaglia sui bordi visibili, altrimenti compare una falsa striscia scura a sinistra/in basso.
    $wr = New-Object Win+RECT; [void][Win]::GetWindowRect($h, [ref]$wr)
    $full = New-Object System.Drawing.Bitmap ($wr.Right - $wr.Left), ($wr.Bottom - $wr.Top)
    $g = [System.Drawing.Graphics]::FromImage($full); $hdc = $g.GetHdc()
    [void][Win]::PrintWindow($h, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
    $crop = New-Object System.Drawing.Rectangle ($r.Left - $wr.Left), ($r.Top - $wr.Top), $w, $hgt
    $bmp = $full.Clone($crop, $full.PixelFormat); $full.Dispose()
    $method = 'PrintWindow'
    if (-not (Test-Image $bmp)) {
        # 2) Ripiego: porta la finestra in primo piano (topmost) e copia dallo schermo il suo rettangolo.
        $bmp.Dispose()
        [void][Win]::SetWindowPos($h, [IntPtr](-1), 0, 0, 0, 0, 0x0003) # HWND_TOPMOST, NOMOVE|NOSIZE
        [void][Win]::SetForegroundWindow($h)
        Start-Sleep -Milliseconds 400
        $bmp = New-Object System.Drawing.Bitmap $w, $hgt
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
        $g.Dispose()
        $method = 'CopyFromScreen'
    }
    if (-not (Test-Image $bmp)) { $bmp.Save("$Out.rejected.png"); throw "immagine nera o priva di contenuto ($method): scartata, vedi $Out.rejected.png" }
    $dir = Split-Path -Parent $Out
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    Write-Host "OK $Out (${w}x$hgt, $method)"
}
finally {
    if (-not $proc.HasExited) { [void]$proc.CloseMainWindow(); Start-Sleep -Milliseconds 300 }
    if (-not $proc.HasExited) { $proc.Kill() }
}
