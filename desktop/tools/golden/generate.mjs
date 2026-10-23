// Rigenera tutte le fixture golden: `node desktop/tools/golden/generate.mjs`
// Registra un resolve hook (import senza estensione in src/) e poi carica i motori TS veri.
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
await import('./gen-all.mjs');
