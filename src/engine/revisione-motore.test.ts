import { describe, expect, it } from 'vitest';
import { buildCopy, ENGINES } from '../../scripts/sync-revisione-motore.mjs';

const COPIES = import.meta.glob('../../revisione-motore/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

describe('revisione-motore: copie standalone', () => {
  it('should_match_the_live_engine_core_for_every_copy', () => {
    expect(ENGINES.length).toBeGreaterThan(0);
    for (const name of ENGINES) {
      const onDisk = COPIES[`../../revisione-motore/${name}.ts`]?.replace(/\r\n/g, '\n');
      // Se fallisce: `node scripts/sync-revisione-motore.mjs` riallinea le copie.
      expect(onDisk, `revisione-motore/${name}.ts diverge da src/engine/tests/${name}.ts`).toBe(buildCopy(name));
    }
  });
});
