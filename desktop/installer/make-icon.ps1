# Rigenera icon.ico (16..256 px) ridisegnando public/favicon.svg con System.Drawing.
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot 'icon.ico'
$sizes = 16, 24, 32, 48, 64, 128, 256

function New-Frame([int]$px) {
    $bmp = New-Object System.Drawing.Bitmap $px, $px, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)
    $s = $px / 32.0
    # rettangolo arrotondato x=1 y=1 w=30 h=30 rx=8
    $r = 8 * $s * 2; $x = 1 * $s; $w = 30 * $s
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x, $x, $r, $r, 180, 90); $path.AddArc($x + $w - $r, $x, $r, $r, 270, 90)
    $path.AddArc($x + $w - $r, $x + $w - $r, $r, $r, 0, 90); $path.AddArc($x, $x + $w - $r, $r, $r, 90, 90)
    $path.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#4A90D9'))), $path)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 255, 255, 255)), (1.9 * $s)
    $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
    $pts = @(@(10, 11.5), @(22, 10.5), @(16, 22))
    foreach ($e in @(@(0, 1), @(0, 2), @(1, 2))) {
        $g.DrawLine($pen, $pts[$e[0]][0] * $s, $pts[$e[0]][1] * $s, $pts[$e[1]][0] * $s, $pts[$e[1]][1] * $s)
    }
    foreach ($p in $pts) {
        $rad = 3.3 * $s
        $g.FillEllipse([System.Drawing.Brushes]::White, $p[0] * $s - $rad, $p[1] * $s - $rad, 2 * $rad, 2 * $rad)
    }
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    return , $ms.ToArray()
}

$frames = foreach ($px in $sizes) { , (New-Frame $px) }
$fs = [System.IO.File]::Create($out)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $dim = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
    $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([uint16]1); $bw.Write([uint16]32)
    $bw.Write([uint32]$frames[$i].Length); $bw.Write([uint32]$offset)
    $offset += $frames[$i].Length
}
foreach ($f in $frames) { $bw.Write($f) }
$bw.Close()
Write-Host "Scritto $out"
