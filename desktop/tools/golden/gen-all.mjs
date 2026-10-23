import { writeFixture } from './lib.mjs';

const tests = [
  ['stroop', './stroop.mjs'],
  ['gonogo', './gonogo.mjs'],
  ['flanker', './flanker.mjs'],
  ['sart', './sart.mjs'],
  ['visual_search', './visual-search.mjs'],
  ['trail_making', './trail-making.mjs'],
];
for (const [name, file] of tests) {
  const { build } = await import(file);
  const data = build();
  const bytes = writeFixture(name, data);
  console.log(`${name}.json  generazione=${data.generation.length} casi  scoring=${data.scoring.length} casi  ${bytes} byte`);
}
