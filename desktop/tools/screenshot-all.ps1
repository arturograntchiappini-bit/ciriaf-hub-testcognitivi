<# Produce in ..\screenshots tutte le schermate e un frame di ciascun test (usa screenshot.ps1). #>
$shot = Join-Path $PSScriptRoot 'screenshot.ps1'
$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'screenshots'
$screens = 'dashboard', 'settings', 'papers', 'paper:sart', 'session', 'results-demo'
foreach ($s in $screens) {
    & $shot -Out (Join-Path $out ("screen-" + $s.Replace(':', '-') + ".png")) -AppArgs '--screen', $s -WaitMs 3000
}
$tests = 'stroop1', 'stroop2', 'gonogo', 'corsi', 'nback', 'wcst', 'pvt', 'flanker', 'sart', 'visualSearch', 'mentalRotation', 'trailMaking'
foreach ($t in $tests) {
    & $shot -Out (Join-Path $out "test-$t.png") -AppArgs '--test', $t, '--no-practice' -WaitMs 4500
}
