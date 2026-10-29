//! Benchmark nativo dei motori: stessa operazione, stesso input e stesso metodo di `tools/bench/bench.mjs`
//! (TypeScript) e `tools/bench/run-wasm.mjs` (WASM). Esegui: `cargo bench -p sintropia-engines --bench engines`
//! (richiede prima `node tools/bench/bench.mjs`, che scrive `tools/bench/inputs.json`).
#[path = "../../../tools/bench/wasm/src/ops.rs"]
mod ops;

use serde_json::{json, Value};
use std::hint::black_box;
use std::time::{Duration, Instant};

const CALIBRATE: Duration = Duration::from_millis(1);
const BATCH_TARGET: Duration = Duration::from_millis(2);
const WARMUP: Duration = Duration::from_millis(300);
const BUDGET: Duration = Duration::from_millis(1500);
const MAX_SAMPLES: usize = 100;
const MIN_SAMPLES: usize = 15;

fn measure(mut op: impl FnMut()) -> Value {
    let mut batch = 1u64;
    loop {
        let t = Instant::now();
        for _ in 0..batch {
            op();
        }
        if t.elapsed() >= CALIBRATE {
            batch = ((batch as f64) * BATCH_TARGET.as_secs_f64() / t.elapsed().as_secs_f64())
                .ceil()
                .max(1.0) as u64;
            break;
        }
        batch *= 2;
    }
    let warm = Instant::now();
    while warm.elapsed() < WARMUP {
        op();
    }
    let start = Instant::now();
    let mut samples: Vec<f64> = Vec::new();
    while samples.len() < MAX_SAMPLES && (start.elapsed() < BUDGET || samples.len() < MIN_SAMPLES) {
        let t = Instant::now();
        for _ in 0..batch {
            op();
        }
        samples.push(t.elapsed().as_nanos() as f64 / batch as f64);
    }
    samples.sort_by(f64::total_cmp);
    let at = |q: f64| samples[((samples.len() - 1) as f64 * q).round() as usize];
    json!({ "medianNs": at(0.5), "p95Ns": at(0.95), "minNs": samples[0], "samples": samples.len(), "batch": batch })
}

fn main() {
    let path = std::env::var_os("BENCH_INPUTS")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| {
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tools/bench/inputs.json")
        });
    let text = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("{}: {e} (esegui prima bench.mjs)", path.display()));
    let inputs: Value = serde_json::from_str(&text).expect("inputs.json valido");
    let mut results = Vec::new();
    let mut run = |op: String, f: &mut dyn FnMut()| {
        let mut r = measure(f);
        r["op"] = json!(op);
        eprintln!(
            "{op}: mediana {:.0} ns",
            r["medianNs"].as_f64().unwrap_or(0.0)
        );
        results.push(r);
    };
    for test in ops::TESTS {
        for (label, scale) in [("default", 1u32), ("x10", 10)] {
            run(format!("{test}.gen.{label}"), &mut || {
                black_box(ops::generate(test, scale, false));
            });
            run(format!("{test}.gen.{label}.json"), &mut || {
                black_box(ops::generate(test, scale, true));
            });
        }
        let raw = inputs["tests"][test].to_string();
        let typed: ops::ScoreInput = serde_json::from_str(&raw).expect("input tipizzato");
        run(format!("{test}.score.400"), &mut || {
            black_box(ops::score(test, black_box(&typed)));
        });
        run(format!("{test}.score.400.json"), &mut || {
            black_box(ops::score_json(test, black_box(&raw)));
        });
    }
    let cubes: Vec<ops::Cube> = serde_json::from_value(inputs["cubes"].clone()).expect("cubi");
    run("mental_rotation.project_faces".into(), &mut || {
        black_box(ops::project_all(black_box(&cubes)));
    });
    run("mental_rotation.is_chiral".into(), &mut || {
        black_box(ops::chiral(black_box(&cubes)));
    });
    let out = json!({
        "runtime": "rust-native",
        "rustc": option_env!("RUSTC_VERSION").unwrap_or(""),
        "profile": "bench (opt-level 3, lto thin, codegen-units 1)",
        "allocator": option_env!("BENCH_ALLOCATOR").unwrap_or("sistema (Windows HeapAlloc)"),
        "results": results,
    });
    let target = std::env::var_os("BENCH_OUT")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| {
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../fixtures/evidence/bench-rust.json")
        });
    std::fs::write(
        &target,
        serde_json::to_string_pretty(&out).unwrap_or_default(),
    )
    .expect("scrittura bench-rust.json");
}
