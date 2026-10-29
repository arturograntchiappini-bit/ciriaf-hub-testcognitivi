// Worker del watchdog: esegue in sequenza i casi di generazione e posta ogni risultato; il main thread lo termina se un caso non finisce.
import { register } from 'node:module';
import { parentPort, workerData } from 'node:worker_threads';

register('../golden/hooks.mjs', import.meta.url);
const { ENGINES, mulberry32 } = await import('./engines.mjs');

const { test, cases } = workerData;
for (const c of cases) {
  parentPort.postMessage({ id: c.id, started: true });
  try {
    parentPort.postMessage({ id: c.id, result: ENGINES[test].gen(c.params, mulberry32(c.seed), c) });
  } catch (error) {
    parentPort.postMessage({ id: c.id, error: String(error?.stack ?? error) });
  }
}
parentPort.postMessage({ done: true });
