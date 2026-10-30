/**
 * Compila il motore Rust in WebAssembly e lo copia in `public/engine/`.
 * Richiede il toolchain Rust con il target `wasm32-unknown-unknown` (rustup target add wasm32-unknown-unknown).
 * Il modulo è committato perché l'hosting del sito non compila Rust; la CI ne verifica la parità con il TypeScript.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const desktop = resolve(root, 'desktop');
const built = resolve(desktop, 'target/wasm32-unknown-unknown/release/sintropia_wasm.wasm');
const target = resolve(root, 'public/engine/sintropia-engine.wasm');

execFileSync(
  'cargo',
  ['build', '--release', '--locked', '-p', 'sintropia-wasm', '--target', 'wasm32-unknown-unknown'],
  { cwd: desktop, stdio: 'inherit' },
);
mkdirSync(resolve(root, 'public/engine'), { recursive: true });
copyFileSync(built, target);
console.log(`public/engine/sintropia-engine.wasm (${(statSync(target).size / 1024).toFixed(0)} KiB)`);
