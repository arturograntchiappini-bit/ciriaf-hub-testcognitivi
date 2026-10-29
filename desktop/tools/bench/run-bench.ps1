# Esegue l'intero benchmark: TS (scrive inputs.json), Rust nativo, build WASM (O3/Os/Oz), WASM, unione in BENCHMARK.md.
# Uso: powershell -File tools/bench/run-bench.ps1   (dalla cartella desktop/)
$ErrorActionPreference = 'Stop'
$env:PATH += ";$env:USERPROFILE\.cargo\bin"
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/bench/bench.mjs
cargo bench -p sintropia-engines --bench engines
$wasm = @()
foreach ($v in @(@('O3', '3'), @('Os', 's'), @('Oz', 'z'))) {
    $target = Join-Path (Get-Location) "target/bench-wasm-$($v[1])"
    $env:CARGO_PROFILE_RELEASE_OPT_LEVEL = $v[1]
    cargo build --release --target wasm32-unknown-unknown --manifest-path tools/bench/wasm/Cargo.toml --target-dir $target
    $wasm += "$($v[0])=$target/wasm32-unknown-unknown/release/sintropia_bench_wasm.wasm"
}
Remove-Item Env:CARGO_PROFILE_RELEASE_OPT_LEVEL
node tools/bench/run-wasm.mjs @wasm
node tools/bench/merge.mjs
