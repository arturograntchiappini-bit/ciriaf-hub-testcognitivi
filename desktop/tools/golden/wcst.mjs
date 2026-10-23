// Fixture golden del WCST: mazzo, regole, dimensioni combacianti, scoring perseverativo (casi scritti
// a mano per ogni ramo di PerseverationScanner + simulazioni di partecipanti) e metriche.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SEEDS, metricsJson, trial, writeFixture } from './lib.mjs';

register('./hooks.mjs', import.meta.url);

const DIM = { c: 'color', s: 'shape', n: 'number' };
const dims = (token) => (token === '-' ? [] : [...token].map((ch) => DIM[ch]));
const DECK_SIZES = [64, 128, 10, 0, 1, 65];

/** Passi a mano: coppie [regola, token] con token = lettere delle dimensioni combacianti ('-' = nessuna). */
const hand = (runToShift, pairs) => ({
  runToShift,
  rules: pairs.map(([rule]) => DIM[rule]),
  matched: pairs.map(([, token]) => dims(token)),
});
const rep = (rule, tokens) => tokens.split(' ').map((token) => [rule, token]);

const HAND_CASES = {
  no_errors: hand(10, rep('c', 'c c cs c')),
  single_unambiguous_error: hand(10, rep('c', 'c s c')),
  repeated_pp_errors: hand(10, rep('c', 's s s c s')),
  error_on_unrelated_dimension_keeps_pp: hand(10, rep('c', 's n s n')),
  ambiguous_between_pp_errors_sandwich: hand(10, rep('c', 's sn s')),
  sandwich_with_correct_ambiguous: hand(10, rep('c', 's cs s')),
  sandwich_double_correct_ambiguous: hand(10, rep('c', 's cs cs s cs')),
  correct_ambiguous_before_any_error: hand(10, rep('c', 'cs s cs s')),
  sandwich_broken_by_other_response: hand(10, rep('c', 's cs n cs s')),
  ambiguous_double_sandwich: hand(10, rep('c', 's sn sn sn s')),
  ambiguous_not_between_errors: hand(10, rep('c', 's sn c sn s')),
  ambiguous_after_open_sandwich_never_closed: hand(10, rep('c', 's sn sn')),
  ambiguous_without_pp_not_perseverative: hand(10, rep('c', 'sn sn s')),
  ambiguous_not_matching_pp: hand(10, rep('c', 's nc')),
  empty_match_errors: hand(10, rep('c', '- - s - s')),
  three_consecutive_errors_change_pp: hand(10, rep('c', 's n n n n s')),
  three_consecutive_with_ambiguous_between: hand(10, rep('c', 's n ns n ns n n')),
  three_consecutive_interrupted_by_correct: hand(10, rep('c', 's n n c n n s')),
  three_consecutive_interrupted_by_other_dim: hand(10, rep('c', 's n n s n n n')),
  candidate_ambiguous_with_rule_resets: hand(10, rep('c', 's n n nc n n n')),
  category_completion_sets_pp: hand(3, [...rep('c', 'c c c'), ...rep('s', 'c c s c')]),
  category_completion_ambiguous_after_not_sandwich: hand(3, [...rep('c', 'c c c'), ...rep('s', 'cn c cs s c')]),
  category_completion_then_new_rule_errors: hand(3, [...rep('c', 'c c c'), ...rep('s', 's s s'), ...rep('n', 's s n s n n')]),
  three_categories_cycle: hand(2, [...rep('c', 'c c'), ...rep('s', 's s'), ...rep('n', 'n n'), ...rep('c', 'c s s s c c')]),
  correct_run_shorter_than_shift_resets: hand(4, [...rep('c', 'c c c s'), ...rep('c', 'c c c c'), ...rep('s', 'c c s n c')]),
  empty: hand(10, []),
};

function simulate(buildDeck, matchingDims, ruleForCategory, mulberry32, { seed, deckSize, runToShift, persevere, noise }) {
  const rand = mulberry32(seed);
  const deck = buildDeck(deckSize, rand);
  const stimuli = [
    { color: 'red', shape: 'triangle', number: 1 }, { color: 'green', shape: 'star', number: 2 },
    { color: 'yellow', shape: 'cross', number: 3 }, { color: 'blue', shape: 'circle', number: 4 },
  ];
  const rules = [];
  const matched = [];
  let category = 0;
  let run = 0;
  let lastRule = null;
  for (const card of deck) {
    const rule = ruleForCategory(category);
    const options = stimuli.map((s) => matchingDims(s, card));
    const fits = (dim) => options.filter((m) => m.includes(dim));
    let pool = fits(rule);
    if (lastRule && rand() < persevere && fits(lastRule).length > 0) pool = fits(lastRule);
    if (rand() < noise || pool.length === 0) pool = options;
    const choice = pool[Math.floor(rand() * pool.length)];
    rules.push(rule);
    matched.push(choice);
    run = choice.includes(rule) ? run + 1 : 0;
    if (run >= runToShift) { lastRule = rule; category++; run = 0; }
    if (category >= 6) break;
  }
  return { runToShift, rules, matched };
}

const toSteps = ({ matched, rules }) => matched.map((m, i) => ({ correct: m.includes(rules[i]), matched: m }));
const toTrials = ({ matched, rules }) => matched.map((m, i) => trial('wcst', i, rules[i], {
  response: String(i % 4), correct: m.includes(rules[i]), rtMs: 800 + i, stimulus: String(i),
}));
const toMetas = ({ matched, rules }) => matched.map((m, i) => ({ currentRule: rules[i], matchedDims: m }));

export async function build() {
  const { mulberry32 } = await import('../../../src/engine/rng.ts');
  const w = await import('../../../src/engine/tests/wcst.ts');
  const sim = (opts) => simulate(w.buildDeck, w.matchingDims, w.ruleForCategory, mulberry32, opts);

  const generation = DECK_SIZES.flatMap((deckSize) => SEEDS.map((seed) => {
    const rand = mulberry32(seed);
    const deck = w.buildDeck(deckSize, rand);
    return { id: `deck${deckSize}@${seed}`, seed, deckSize, deck, nextRand: rand() };
  }));

  const stim = w.WCST_STIMULUS_CARDS;
  const cardGrid = [stim[0], stim[1], stim[2], stim[3], { color: 'red', shape: 'star', number: 3 }, { color: 'blue', shape: 'triangle', number: 1 }];
  const matching = stim.flatMap((target) => cardGrid.map((choice) => ({
    target, choice, matching: w.matchingDims(target, choice),
    matchesOn: ['color', 'shape', 'number'].map((dim) => w.matchesOn(target, choice, dim)),
  })));
  const rules = Array.from({ length: 8 }, (_, i) => ({ category: i, rule: w.ruleForCategory(i) }));

  const simulated = {};
  for (const seed of SEEDS) {
    for (const runToShift of [3, 5, 10]) {
      for (const [name, persevere, noise] of [['preciso', 0, 0], ['perseverativo', 0.7, 0.1], ['rumoroso', 0.3, 0.5], ['casuale', 0, 1]]) {
        simulated[`sim-${name}-r${runToShift}@${seed}`] = sim({ seed, deckSize: 128, runToShift, persevere, noise });
      }
    }
  }
  const perseveration = Object.entries({ ...HAND_CASES, ...simulated }).map(([id, c]) => ({
    id, runToShift: c.runToShift, rules: c.rules, matched: c.matched,
    expected: w.countPerseveration(toSteps(c), c.rules, c.runToShift),
  }));

  const params = (runToShift) => ({ deckSize: 64, runToShift, maxCategories: 6 });
  const scoreCase = (id, c, runToShift, trials = toTrials(c), metas = toMetas(c)) =>
    ({ id, kind: /^sim-/.test(id) ? 'normal' : 'edge', params: params(runToShift), trials, metas, metrics: metricsJson(w.scoreWcst(trials, metas, params(runToShift))) });
  const scoring = [
    ...Object.entries(HAND_CASES).map(([id, c]) => scoreCase(`hand-${id}`, c, c.runToShift)),
    ...Object.entries(simulated).filter(([id]) => id.endsWith('@42') || id.endsWith('@1')).map(([id, c]) => scoreCase(id, c, c.runToShift)),
  ];
  const base = sim({ seed: 2026, deckSize: 64, runToShift: 5, persevere: 0.5, noise: 0.2 });
  const baseTrials = toTrials(base);
  const baseMetas = toMetas(base);
  scoring.push(
    scoreCase('interrupted-excluded', base, 5, baseTrials.map((t, i) => (i % 7 === 3 ? { ...t, flag: 'INTERRUPTED' } : t)), baseMetas.filter((_, i) => i % 7 !== 3)),
    scoreCase('practice-excluded', base, 5, [{ ...baseTrials[0], phase: 'practice' }, { ...baseTrials[1], phase: 'practice' }, ...baseTrials.slice(2)], baseMetas.slice(2)),
    scoreCase('metas-shorter-than-trials', base, 5, baseTrials, baseMetas.slice(0, 10)),
    scoreCase('metas-empty', base, 5, baseTrials, []),
    scoreCase('trials-empty', base, 5, [], baseMetas),
  );

  return { test: 'wcst', generation, rules, matching, perseveration, scoring };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) writeFixture('wcst', await build());
