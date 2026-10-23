// Fixture golden di pvt, corsi, nback, wcst, mental_rotation (da unire in generate.mjs).
// Uso: node --experimental-transform-types desktop/tools/golden/generate-b.mjs
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
const { writeFixture } = await import('./lib.mjs');

const tests = [
  ['pvt', './pvt.mjs'],
  ['corsi', './corsi.mjs'],
  ['nback', './nback.mjs'],
  ['wcst', './wcst.mjs'],
  ['mental_rotation', './mental-rotation.mjs'],
];
for (const [name, file] of tests) {
  const { build } = await import(file);
  const bytes = writeFixture(name, await build());
  console.log(`${name}.json  ${bytes} byte`);
}
