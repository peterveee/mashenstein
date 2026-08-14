// Deterministic, same-length Rearrange recipes are a pure seam: the desk can save
// and load these instructions without copying a song's notes or mix into the file.
import {
  REARRANGE_KIND, REARRANGE_VERSION, REARRANGE_GRID, REARRANGE_TRANSPOSES,
  REARRANGE_GENERATED_TRANSPOSES,
  REARRANGE_EXTREMENESS_DEFAULT,
  REARRANGE_TRANSPOSE_DEFAULT, REARRANGE_PATTERN_DEFAULT,
  generateRearrangement, validateRearrangement, rearrangementPosition,
  rearrangementOutputSteps, seededRandom, transformRearrangement,
  rearrangementDrumHit, rearrangementDrumMode,
} from '../tools/lib/rearrange.js';
import { Audio } from '../src/engine/audio.js';

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const a = generateRearrangement(128, { seed: 1234 });
const b = generateRearrangement(128, { seed: 1234 });
assert(eq(a, b), 'the same seed produces the same recipe');
assert(a.kind === REARRANGE_KIND && a.version === REARRANGE_VERSION && a.grid === REARRANGE_GRID,
  'generated recipes carry the versioned JSON identity');
assert(rearrangementDrumMode(a) === 'original',
  'generated recipes keep authored drums by default');
assert(rearrangementOutputSteps(a) === 128,
  'generated operations fill exactly the source duration');
assert(a.operations.every((op) => op.from >= 0 && op.length > 0
  && op.from + op.length <= 128 && op.repeats >= 1 && op.repeats <= 4
  && REARRANGE_TRANSPOSES.includes(op.transpose)),
  'generated ranges, repeats, and transposes stay inside their contracts');
assert(a.operations.every((op) => op.transpose === 0
  || REARRANGE_GENERATED_TRANSPOSES.includes(op.transpose)),
  'new recipes use gentle whole-tone, fourth, or fifth shifts');
assert(a.operations.every((op, i) => !i || JSON.stringify(op) !== JSON.stringify(a.operations[i - 1])),
  'generation does not emit adjacent duplicate operations');
const transposeOff = generateRearrangement(512, { seed: 81, extremeness: 1, transposeAmount: 0 });
assert(transposeOff.operations.every((op) => op.transpose === 0),
  'transpose dial at Off keeps every pitched section in the source key');
const gentleTranspose = generateRearrangement(2048, {
  seed: 19, extremeness: 1, transposeAmount: 0.2,
});
assert(gentleTranspose.operations.every((op) => op.transpose === 0 || op.transpose === -2 || op.transpose === 2),
  'low transpose dial only permits gentle whole-tone lifts');
const generatedIntervals = new Set();
for (let seed = 0; seed < 64; seed++) {
  for (const op of generateRearrangement(512, { seed, extremeness: 1 }).operations) {
    generatedIntervals.add(op.transpose);
  }
}
assert([ -5, 5, -7, 7 ].every((interval) => generatedIntervals.has(interval)),
  'seeded generation reaches both fourth and fifth lifts in either direction');
const loosePattern = generateRearrangement(512, { seed: 77, patterning: 0 });
const motifPattern = generateRearrangement(512, { seed: 77, patterning: 1 });
assert(REARRANGE_TRANSPOSE_DEFAULT === 1 && REARRANGE_PATTERN_DEFAULT > 0
  && JSON.stringify(loosePattern) !== JSON.stringify(motifPattern),
  'patterning dial changes the balance of one-off cuts and returning motifs');
const patterned = generateRearrangement(512, { seed: 77 });
assert(patterned.operations.some((op) => op.length === 8)
  && patterned.operations.some((op, i) => i > 0 && op.length === 8
    && patterned.operations[i - 1].length === 8),
  'four-bar sections can alternate half-bar cells instead of taking only long slices');
assert(patterned.operations.filter((op) => op.length === 32).length <= 2,
  'two-bar source slices stay occasional in a generated form');
let gentleOperations = 0;
let wildOperations = 0;
for (let seed = 0; seed < 32; seed++) {
  gentleOperations += generateRearrangement(512, { seed, extremeness: 0 }).operations.length;
  wildOperations += generateRearrangement(512, { seed, extremeness: 1 }).operations.length;
}
assert(REARRANGE_EXTREMENESS_DEFAULT > 0 && REARRANGE_EXTREMENESS_DEFAULT < 1
  && gentleOperations < wildOperations,
  'extremeness dial makes gentle recipes use fewer, longer slices than wild recipes');
const favouriteRecipe = generateRearrangement(128, {
  seed: 123,
  favourites: [{ lane: 'lead', from: 24, length: 8 }, { lane: 'bass', from: 80, length: 16 }],
});
assert(favouriteRecipe.operations.some((op) => op.from === 24 && op.length === 8
  && op.repeats === 1 && op.transpose === 0)
  && favouriteRecipe.operations.some((op) => op.from === 80 && op.length === 16
    && op.repeats === 1 && op.transpose === 0),
  'piano-roll favourites are included as exact, untransposed source slices');
assert(rearrangementOutputSteps(favouriteRecipe) === 128,
  'favourite slices still leave a recipe with the exact song duration');
const editable = {
  ...a,
  operations: [
    { from: 8, length: 8, repeats: 2, transpose: 0 },
    { from: 32, length: 16, repeats: 1, transpose: 0 },
    ...a.operations.slice(2),
  ],
};
const splitEdit = transformRearrangement(editable, [0], 'split', { seed: 9 });
assert(splitEdit.changed === 1 && splitEdit.recipe.operations.slice(0, 4).every((op) => op.length === 4)
  && rearrangementOutputSteps(splitEdit.recipe) === rearrangementOutputSteps(editable),
  'splitting a joined slice interleaves its halves without changing output duration');
const unrollEdit = transformRearrangement(editable, [0], 'unroll', { seed: 9 });
assert(unrollEdit.changed === 1 && unrollEdit.recipe.operations[0].repeats === 1
  && unrollEdit.recipe.operations[1].repeats === 1
  && rearrangementOutputSteps(unrollEdit.recipe) === rearrangementOutputSteps(editable),
  'unrolling repeats makes each pass independently selectable without changing duration');
const doubleEdit = transformRearrangement(editable, [0], 'double-repeats', { seed: 9 });
assert(doubleEdit.changed === 1 && doubleEdit.recipe.operations[0].length === 4
  && doubleEdit.recipe.operations[0].repeats === 4
  && rearrangementOutputSteps(doubleEdit.recipe) === rearrangementOutputSteps(editable),
  'doubling repeats halves the source cell and preserves output duration');
const halfEdit = transformRearrangement(editable, [0], 'half-repeats', { seed: 9 });
assert(halfEdit.changed === 1 && halfEdit.recipe.operations[0].length === 16
  && halfEdit.recipe.operations[0].repeats === 1
  && rearrangementOutputSteps(halfEdit.recipe) === rearrangementOutputSteps(editable),
  'halving repeats joins adjacent source space and preserves output duration');
const rerollEdit = transformRearrangement(editable, [1], 'reroll', { seed: 9 });
assert(rerollEdit.changed === 1 && rerollEdit.recipe.operations[1].length === 16
  && rearrangementOutputSteps(rerollEdit.recipe) === rearrangementOutputSteps(editable),
  'rerolling one selected slice changes only its source choice and keeps duration');
const removeEdit = transformRearrangement(editable, [0], 'remove', { seed: 9 });
assert(removeEdit.changed === 1
  && rearrangementOutputSteps(removeEdit.recipe) === rearrangementOutputSteps(editable)
  && removeEdit.recipe.operations.length <= editable.operations.length
  && removeEdit.recipe.operations[0].from !== editable.operations[0].from,
  'removing a selected slice fills its exact output time with neighbouring material');
const sectionOperations = (recipe, sectionIndex) => {
  const section = recipe.form[sectionIndex];
  let output = 0;
  const operations = [];
  for (const operation of recipe.operations) {
    const end = output + operation.length * operation.repeats;
    if (output >= section.start && end <= section.end) operations.push(operation);
    output = end;
  }
  return operations;
};
const keptSection = patterned.form[1];
const keptOperations = sectionOperations(patterned, 1);
const refined = generateRearrangement(512, {
  seed: 999,
  anchors: [{ index: 1, role: keptSection.role, steps: keptSection.end - keptSection.start,
    operations: keptOperations }],
});
assert(eq(sectionOperations(refined, 1), keptOperations)
  && eq(sectionOperations(refined, 3), keptOperations),
  'a kept section is reused for the next recipe and its returning verse');
const dislikedSection = patterned.form[2];
const dislikedOperations = sectionOperations(patterned, 2);
const replaced = generateRearrangement(512, {
  seed: 999,
  avoid: [{ index: 2, role: dislikedSection.role, steps: dislikedSection.end - dislikedSection.start,
    source: dislikedSection.source, from: dislikedOperations[0].from }],
});
assert(!eq(sectionOperations(replaced, 2), dislikedOperations),
  'a disliked section is replaced from a different source area on the next recipe');

const profile = Array.from({ length: 32 }, (_, i) => (i >= 8 && i < 12) || (i >= 16 && i < 20) ? 1 : 0.1);
const formRecipe = generateRearrangement(512, { seed: 77, sourceProfile: profile });
assert(rearrangementOutputSteps(formRecipe) === 512
  && formRecipe.operations.every((op) => op.from >= 0 && op.from + op.length <= 512),
  'form recipes keep exact duration and source bounds');
assert(formRecipe.form.map((section) => section.name).join(' → ')
  === 'Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus → Outro',
  'long recipes follow a verse/chorus/bridge roadmap');
assert(formRecipe.form[0].start === 0
  && formRecipe.form[formRecipe.form.length - 1].end === 512
  && formRecipe.form.every((section, i) => i === 0 || section.start === formRecipe.form[i - 1].end),
  'form sections cover the exact output with no gaps');
const verses = formRecipe.form.filter((section) => section.role === 'Verse');
const choruses = formRecipe.form.filter((section) => section.role === 'Chorus');
assert(verses.length >= 2 && verses.every((section) => section.source === verses[0].source),
  'verse repeats return to the same source phrase');
assert(choruses.length >= 2 && choruses.every((section) => section.source === choruses[0].source),
  'chorus repeats return to the same source phrase');
assert(choruses[0].source >= 128,
  'chorus source selection favours the denser part of the source profile');

const checked = validateRearrangement({
  ...a,
  source: { song: 'hub', title: 'Food Court', steps: 128 },
}, 128, { songId: 'hub' });
assert(eq(checked.operations, a.operations) && checked.source.song === 'hub',
  'a valid JSON-shaped recipe is cloned and source-checked');
const basicDrums = validateRearrangement({ ...checked, drums: 'basic4' }, 128, { songId: 'hub' });
assert(rearrangementDrumMode(basicDrums) === 'basic4'
  && rearrangementDrumHit('kick', 0, 19)
  && rearrangementDrumHit('kick', 4, 19)
  && rearrangementDrumHit('snare', 4, 19)
  && !rearrangementDrumHit('kick', 0.5, 19),
  'basic Rearrange drums are deterministic and land on a four-beat grid');
assert([0, 4, 8, 12].every((step) => rearrangementDrumHit('kick', step, 19))
  && [4, 12].every((step) => rearrangementDrumHit('snare', step, 19))
  && [4, 12].every((step) => rearrangementDrumHit('clap', step, 19))
  && [0, 2, 4, 6, 8, 10, 12, 14].every((step) => rearrangementDrumHit('hats', step, 19))
  && [0, 2, 6, 8, 10, 14].every((step) => !rearrangementDrumHit('snare', step, 19))
  && [0, 2, 6, 8, 10, 14].every((step) => !rearrangementDrumHit('clap', step, 19)),
  'steady drums keep kick/backbeat/hats positions exact while fills stay elsewhere');
assert(rearrangementPosition(checked, 0).outputStep === 0
  && rearrangementPosition(checked, 128).outputStep === 0,
  'output positions wrap at the generated song length');
assert(rearrangementPosition(checked, 0).sourceStep === checked.operations[0].from,
  'position mapping starts at the first selected source range');
assert(rearrangementPosition(formRecipe, formRecipe.form[2].start).form.name === 'Chorus',
  'output positions report their form section');
Audio.step = 9;
Audio.setRearrangement(checked);
assert(Audio.rearrangementPosition().sourceStep === rearrangementPosition(checked, 9).sourceStep,
  'Audio exposes the same output-to-source mapping used by the scheduler');
Audio.setRearrangement(null);

const repeat = validateRearrangement({
  kind: REARRANGE_KIND, version: 1, grid: REARRANGE_GRID, seed: 1,
  source: { song: 'hub', steps: 16 },
  operations: [{ from: 4, length: 4, repeats: 2, transpose: 7 },
    { from: 0, length: 8, repeats: 1, transpose: 0 }],
}, 16, { songId: 'hub' });
assert(rearrangementPosition(repeat, 4).repeatIndex === 1
  && rearrangementPosition(repeat, 4).sourceStep === 4,
  'repeated source ranges report their repeat index and source step');

const bad = (value, steps = 128) => {
  try { validateRearrangement(value, steps, { songId: 'hub' }); return false; }
  catch { return true; }
};
assert(bad({ ...a, kind: 'other' }), 'foreign JSON kind is rejected');
assert(bad({ ...a, source: { steps: 64 } }), 'a source-length mismatch is rejected');
assert(bad({ ...a, operations: [{ from: 0, length: 1, repeats: 1, transpose: 3 }] }),
  'an unsupported transpose or wrong output duration is rejected');
assert(bad({ ...a, drums: 'chaos' }), 'an unsupported Rearrange drum mode is rejected');
assert(bad({ ...a, operations: [{ from: -1, length: 8, repeats: 1, transpose: 0 }, ...a.operations.slice(1)] }),
  'an out-of-range source slice is rejected');
assert(bad({ ...formRecipe, form: [{ ...formRecipe.form[0], start: 1 }] }, 512),
  'a form with a non-contiguous output range is rejected');
assert(seededRandom(7)() === seededRandom(7)(), 'the seeded random helper is stable');

console.log(failed ? 'REARRANGE: FAILED' : 'REARRANGE: PASSED');
process.exit(failed ? 1 : 0);
