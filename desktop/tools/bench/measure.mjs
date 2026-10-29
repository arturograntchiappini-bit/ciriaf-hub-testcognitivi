// Metodo comune (identico in Rust e WASM): calibra il batch a ~2 ms, riscalda 300 ms, poi fino a 100 campioni o 1,5 s.
const CALIBRATE_NS = 1e6, BATCH_NS = 2e6, WARMUP_NS = 3e8, BUDGET_NS = 1.5e9, MAX_SAMPLES = 100, MIN_SAMPLES = 15;
const now = () => Number(process.hrtime.bigint());
export function measure(op) {
  let batch = 1;
  for (;;) {
    const t = now();
    for (let i = 0; i < batch; i++) op();
    const dt = now() - t;
    if (dt >= CALIBRATE_NS) { batch = Math.max(1, Math.ceil((batch * BATCH_NS) / dt)); break; }
    batch *= 2;
  }
  for (const w = now(); now() - w < WARMUP_NS; ) op();
  const samples = [];
  for (const s = now(); samples.length < MAX_SAMPLES && (now() - s < BUDGET_NS || samples.length < MIN_SAMPLES); ) {
    const t = now();
    for (let i = 0; i < batch; i++) op();
    samples.push((now() - t) / batch);
  }
  samples.sort((a, b) => a - b);
  const at = (q) => samples[Math.round((samples.length - 1) * q)];
  return { medianNs: at(0.5), p95Ns: at(0.95), minNs: samples[0], samples: samples.length, batch };
}

