/**
 * Ponte verso il motore Rust compilato in WebAssembly (`desktop/crates/wasm`).
 * Una sola porta JSON → JSON: la richiesta è scritta nel buffer di input del modulo, `engine_call` la elabora
 * e la risposta si legge dal buffer di output. Nessun binding generato, nessun codice `eval`.
 * @see docs/scientific/migrazione-rust.md
 */

interface EngineExports {
  memory: WebAssembly.Memory;
  in_ptr(len: number): number;
  engine_call(): number;
  out_ptr(): number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface EngineRequest {
  op: 'version' | 'generate' | 'score';
  test?: string;
  seed?: number;
  params?: unknown;
  args?: unknown;
  trials?: unknown;
  extra?: unknown;
}

type EngineResponse<T> = { ok: T; calls?: number } | { error: string };

export class WasmEngine {
  constructor(private readonly exports: EngineExports) {}

  /** Esegue una richiesta; lancia se il motore risponde con un errore. */
  call<T>(request: EngineRequest): T {
    return this.request<T>(request).ok;
  }

  /** Come `call`, ma restituisce anche `calls` (estrazioni casuali consumate) per le generazioni. */
  request<T>(request: EngineRequest): { ok: T; calls?: number } {
    const bytes = encoder.encode(JSON.stringify(request));
    const e = this.exports;
    // Gli indirizzi si chiedono prima di leggere `memory.buffer`: l'allocazione può far crescere la memoria lineare
    // e staccare il buffer precedente.
    const inputAddress = e.in_ptr(bytes.length);
    new Uint8Array(e.memory.buffer, inputAddress, bytes.length).set(bytes);
    const length = e.engine_call();
    const outputAddress = e.out_ptr();
    const text = decoder.decode(new Uint8Array(e.memory.buffer, outputAddress, length));
    const response = JSON.parse(text) as EngineResponse<T>;
    if ('error' in response) throw new Error(response.error);
    return response;
  }
}

/** Istanzia il modulo da byte già in memoria (usato dai test e dal caricamento di rete). */
export async function instantiateEngine(bytes: BufferSource): Promise<WasmEngine> {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return new WasmEngine(instance.exports as unknown as EngineExports);
}

/**
 * Scarica e istanzia il modulo. Non usa `instantiateStreaming` per non dipendere dal tipo MIME del server:
 * il modulo pesa meno di 500 KB e viene caricato una sola volta.
 */
export async function loadEngine(url: string): Promise<WasmEngine> {
  const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!response.ok) throw new Error(`motore WASM non disponibile (${response.status})`);
  return instantiateEngine(await response.arrayBuffer());
}
