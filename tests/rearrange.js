// Deterministic, same-length Rearrange recipes are a pure seam: the desk can save
// and load these instructions without copying a song's notes or mix into the file.
import {
  REARRANGE_KIND, REARRANGE_VERSION, REARRANGE_GRID, REARRANGE_TRANSPOSES,
  REARRANGE_GENERATED_TRANSPOSES,
  REARRANGE_EXTREMENESS_DEFAULT,
  REARRANGE_TRANSPOSE_DEFAULT, REARRANGE_PATTERN_DEFAULT,
  REARRANGE_STYLE_NAMES, REARRANGE_STYLE_DEFAULT,
  REARRANGE_FILL_NAMES,
  harmonicShift, harmonyNumeral,
  generateRearrangement, sourceCandidates, validateRearrangement, rearrangementPosition,
  rearrangementOutputSteps, seededRandom, transformRearrangement,
  transformRearrangementSection,
  rearrangementDrumHit, rearrangementDrumMode,
  REARRANGE_DRUM_MODES, REARRANGE_DRIVE_KITS, driveDrumKit, drivePace,
  regenerateRearrangementSection,
  toggleRearrangeSectionWalk, rerollSectionWalk,
  moodPalette, moodPalettes, paletteDegrees,
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
const clipBase = generateRearrangement(256, { seed: 12, style: 'groove' });
const clipLetter = clipBase.form[1].letter;
const reusableClip = generateRearrangement(256, {
  seed: 12,
  style: 'groove',
  letterTemplates: {
    [clipLetter]: {
      steps: 16,
      operations: [{ from: 4, length: 16, repeats: 1, transpose: 0 }],
      resizable: true,
      verbatim: true,
    },
  },
});
const reusableClipSections = reusableClip.form.filter((section) => section.letter === clipLetter);
const clipSectionOperations = (recipe, section) => {
  let output = 0;
  const operations = [];
  for (const operation of recipe.operations) {
    const end = output + operation.length * operation.repeats;
    if (output >= section.start && end <= section.end) operations.push(operation);
    output = end;
  }
  return operations;
};
assert(reusableClipSections.length >= 1
  && reusableClipSections.every((section) => section.end - section.start === 64
    && clipSectionOperations(reusableClip, section)
      .every((operation) => operation.from === 4)),
  'a reusable clip can be assigned to a letter and resized across its form slots');
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
// Reroll is the random one: source always, the way the time is cut up often, the pitch
// sometimes. DURATION is the one thing it must never move — everything after a slice
// depends on it, and a reroll that shifted the song would stop being a local decision.
const rerollEdit = transformRearrangement(editable, [1], 'reroll', { seed: 9 });
const rerolled = rerollEdit.recipe.operations[1];
assert(rerollEdit.changed === 1
  && rerolled.length * rerolled.repeats === editable.operations[1].length * editable.operations[1].repeats
  && rearrangementOutputSteps(rerollEdit.recipe) === rearrangementOutputSteps(editable),
  'rerolling one selected slice keeps its exact duration, and the song\'s');
// Across many rolls it reaches all three properties, and never the fourth.
const rollReach = { from: 0, cut: 0, pitch: 0 };
let rollDurationsHeld = true;
for (let seed = 1; seed <= 60; seed++) {
  const out = transformRearrangement(editable, [1], 'reroll', { seed }).recipe.operations[1];
  const was = editable.operations[1];
  if (out.length * out.repeats !== was.length * was.repeats) rollDurationsHeld = false;
  if (out.from !== was.from) rollReach.from++;
  if (out.length !== was.length || out.repeats !== was.repeats) rollReach.cut++;
  if ((out.transpose || 0) !== (was.transpose || 0) || (out.harmony || 0) !== (was.harmony || 0)) rollReach.pitch++;
}
assert(rollDurationsHeld && rollReach.from > 40 && rollReach.cut > 5 && rollReach.pitch > 5,
  'reroll reaches source, cut and pitch, and holds duration on every roll');
// AND IT MUST STAY RANDOM WITH A PROFILE IN PLAY, which is the case the desk always runs.
// Scores are a preference, not an answer: taking the best-scoring source every time made
// reroll reach two candidates out of thirty-two across four hundred rolls.
const rollSteps = editable.source.steps;
const rollProfile = {
  steps: rollSteps, bars: rollSteps / 16,
  onsets: Float32Array.from({ length: rollSteps }, (unused, i) => (i % 4 === 0 ? 1 : 0)),
  sustains: Float32Array.from({ length: rollSteps }, (unused, i) => (Math.floor(i / 16) % 2 ? 1 : 0)),
  percussion: Float32Array.from({ length: rollSteps }, (unused, i) => (i % 8 === 0 ? 1 : 0)),
  chroma: Float32Array.from({ length: (rollSteps / 16) * 12 }, (unused, i) => ((i * 7) % 13) / 13),
  energy: Float32Array.from({ length: rollSteps / 16 }, (unused, i) => ((i * 5) % 11) / 11),
};
const scoredSources = new Set();
for (let seed = 1; seed <= 200; seed++) {
  scoredSources.add(transformRearrangement(editable, [1], 'reroll', { seed, profile: rollProfile })
    .recipe.operations[1].from);
}
// Three of the seven candidates this short fixture offers, which is the designed 40%
// reach. The bug this guards was reaching TWO of thirty-two on a full-length song.
assert(scoredSources.size >= 3,
  'reroll still explores when a source profile is scoring its choices');
// ---- AND THE DIALS REACH IT ---------------------------------------------------------
// Reroll is the one transform that makes a musical CHOICE rather than performing a named
// operation, so it is the one the panel's sliders steer — read live, at the press, not
// recorded at Generate. Sliding a noir recipe to euphoric and rolling a slice has to give
// a euphoric roll, or the sliders are a receipt rather than a set of controls.
const rerollSources = (options) => {
  const out = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    out.add(transformRearrangement(editable, [1], 'reroll',
      { seed, profile: rollProfile, ...options }).recipe.operations[1].from);
  }
  return out.size;
};
// CHAOS is the reach: how far down the scored ranking a roll may land. Tame takes the
// best-scoring material there is, which on this fixture is one answer.
assert(rerollSources({ chaos: 0 }) === 1 && rerollSources({ chaos: 1 }) >= 5,
  'Chaos decides how far from the safest material a reroll may reach');
// DRIVE reads the song's own energy, so a ramp from quiet to busy tells the two ends
// apart. Chill takes the opening bars, peak-time the loudest ones it can find.
const rollRamp = {
  steps: rollSteps, bars: rollSteps / 16,
  onsets: new Float32Array(rollSteps), sustains: new Float32Array(rollSteps),
  percussion: new Float32Array(rollSteps), chroma: new Float32Array((rollSteps / 16) * 12),
  energy: Float32Array.from({ length: rollSteps / 16 },
    (unused, bar) => bar / (rollSteps / 16 - 1)),
};
const rollMeanBar = (drive) => {
  let total = 0;
  for (let seed = 1; seed <= 200; seed++) {
    total += Math.floor(transformRearrangement(editable, [1], 'reroll',
      { seed, profile: rollRamp, drive, chaos: 0.2 }).recipe.operations[1].from / 16);
  }
  return total / 200;
};
assert(rollMeanBar(1) > rollMeanBar(0) + 2,
  'Drive rerolls a slice out of the busiest bars, or the quietest');
// MOOD, on a slice with no chord walk, is the direction of the lift.
const rollLift = (mood) => {
  const out = { up: 0, down: 0 };
  for (let seed = 1; seed <= 300; seed++) {
    const lift = transformRearrangement(editable, [1], 'reroll', { seed, mood })
      .recipe.operations[1].transpose || 0;
    if (lift > 0) out.up++; else if (lift < 0) out.down++;
  }
  return out;
};
const euphoricLift = rollLift(1);
const noirLift = rollLift(0);
assert(euphoricLift.up > euphoricLift.down * 2 && noirLift.down > noirLift.up * 2,
  'Mood points a rerolled lift up at the euphoric end and down at the noir end');
// MOOD, on a slice that IS walking, is which degree of the key it walks to: the major
// chords the key owns, or the minor ones.
const walkedRoll = {
  ...editable,
  key: { tonic: 9, minor: true },
  operations: editable.operations.map((op, index) =>
    index === 1 ? { ...op, harmony: 3 } : op),
};
const rollDegrees = (mood) => {
  const out = { bright: 0, dark: 0 };
  for (let seed = 1; seed <= 300; seed++) {
    const degree = transformRearrangement(walkedRoll, [1], 'reroll', { seed, mood })
      .recipe.operations[1].harmony || 0;
    // 3 is the degree it started on and 0 took the walk off; neither is a choice of mood.
    if (!degree || degree === 3) continue;
    const numeral = harmonyNumeral(degree, true);
    if (numeral === numeral.toUpperCase() && !numeral.includes('°')) out.bright++;
    else out.dark++;
  }
  return out;
};
const euphoricDegrees = rollDegrees(1);
const noirDegrees = rollDegrees(0);
assert(euphoricDegrees.bright > euphoricDegrees.dark * 2
  && noirDegrees.dark > noirDegrees.bright * 2,
  'Mood walks a rerolled slice onto the bright degrees of the key, or the dark ones');
// HYPNOSIS is how the slice's own time gets cut up: one grab of it, or the front of it
// retriggered. It reaches the same repeat weights generation uses, so it needs a style.
const rollPasses = (hypnosis) => {
  let total = 0;
  for (let seed = 1; seed <= 600; seed++) {
    total += transformRearrangement(editable, [1], 'reroll',
      { seed, style: 'groove', hypnosis }).recipe.operations[1].repeats;
  }
  return total / 600;
};
assert(rollPasses(1) > rollPasses(0),
  'a loop setting retriggers a rerolled slice where a collage setting takes one grab');
// STYLE keeps a reroll on the grid that style promises. A Phrase recipe cannot acquire a
// half-bar cut by way of a dice roll.
const rollGrid = (style) => {
  const out = new Set();
  for (let seed = 1; seed <= 120; seed++) {
    out.add(transformRearrangement(editable, [0], 'reroll', { seed, style, chaos: 1 })
      .recipe.operations[0].from);
  }
  return [...out];
};
assert(rollGrid('phrase').every((from) => from % 16 === 0)
  && rollGrid('chop').some((from) => from % 16 !== 0),
  'Style holds a reroll to the grid it promises — Phrase on bar lines, Chop free of them');
const transposeEdit = transformRearrangement(editable, [1], 'transpose', { value: -5 });
const clearedTranspose = transformRearrangement(transposeEdit.recipe, [1], 'transpose', { value: 0 });
assert(transposeEdit.recipe.operations[1].transpose === -5
  && clearedTranspose.recipe.operations[1].transpose === 0,
  'a slice transpose can be changed or cleared independently');
const removeEdit = transformRearrangement(editable, [0], 'remove', { seed: 9 });
assert(removeEdit.changed === 1
  && rearrangementOutputSteps(removeEdit.recipe) === rearrangementOutputSteps(editable)
  && removeEdit.recipe.operations.length <= editable.operations.length
  && removeEdit.recipe.operations[0].from !== editable.operations[0].from,
  'removing a selected slice fills its exact output time with neighbouring material');
const motifRecipe = {
  source: { steps: 64 },
  operations: [0, 16, 32, 48].map((from) => ({ from, length: 16, repeats: 1, transpose: 0 })),
};
const loopRemoval = transformRearrangement(motifRecipe, [2, 3], 'remove-loop', { seed: 9 });
assert(loopRemoval.recipe.operations.map((op) => op.from).join(',') === '0,16,0,16'
  && rearrangementOutputSteps(loopRemoval.recipe) === 64,
  'loop removal repeats a neighbouring motif instead of extending one slice');
const deleteEdit = transformRearrangement(motifRecipe, [2, 3], 'delete', { seed: 9 });
assert(deleteEdit.recipe.operations.map((op) => op.from).join(',') === '0,16'
  && rearrangementOutputSteps(deleteEdit.recipe) === 32
  && deleteEdit.recipe.output?.steps === 32,
  'delete removes selected slices entirely and shortens the M8TRX output');
const sectionResizeRecipe = {
  source: { steps: 128 },
  form: [
    { name: 'Intro', role: 'Intro', letter: 'A', start: 0, end: 64, source: 0 },
    { name: 'Verse', role: 'Verse', letter: 'B', start: 64, end: 128, source: 64 },
  ],
  operations: [0, 16, 32, 48, 64, 80, 96, 112]
    .map((from) => ({ from, length: 16, repeats: 1, transpose: 0 })),
};
const doubledSection = transformRearrangementSection(sectionResizeRecipe, 0, 'double').recipe;
assert(doubledSection.form[0].start === 0 && doubledSection.form[0].end === 128
  && doubledSection.form[1].start === 128 && doubledSection.form[1].end === 192,
  'doubling a section extends that section and shifts later sections');
const halvedSection = transformRearrangementSection(sectionResizeRecipe, 0, 'halve').recipe;
assert(halvedSection.form[0].end === 32 && halvedSection.form[1].start === 32
  && halvedSection.form[1].end === 96,
  'halving a section shortens that section and shifts later sections back');
const machineGunSection = transformRearrangementSection(sectionResizeRecipe, 0, 'fill', {
  value: 'machinegun',
}).recipe;
const machineGunFills = machineGunSection.operations.filter((operation) => operation.fill === 'machinegun');
const machineGunSectionAgain = transformRearrangementSection(sectionResizeRecipe, 0, 'fill', {
  value: 'machinegun', seed: 123,
}).recipe;
assert(rearrangementOutputSteps(machineGunSection) === 128
  && machineGunSection.form[0].end === 64
  && machineGunFills.length >= 4
  && new Set(machineGunFills.map((operation) => operation.from)).size > 1
  && !eq(machineGunFills.map((operation) => operation.from),
    machineGunSectionAgain.operations.filter((operation) => operation.fill === 'machinegun').map((operation) => operation.from))
  && machineGunSection.fills?.some((fill) => fill.shape === 'machinegun'),
  'a section fill button adds a varied, seeded machine-gun ending without changing section length');
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
const exactKeptOperations = [{ from: 0, length: 16, repeats: 4, transpose: 0, harmony: -2 }];
const exactKept = generateRearrangement(512, {
  seed: 1001,
  anchors: [{ index: 1, role: 'Verse', steps: 64, operations: exactKeptOperations }],
  progression: 'edm', key: { tonic: 9, minor: true },
});
assert(eq(sectionOperations(exactKept, 1), exactKeptOperations)
  && eq(sectionOperations(exactKept, 3), exactKeptOperations),
  'a kept section bypasses duplicate-avoidance transforms and remains verbatim');
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

// ---- STYLES: what each setting is allowed to emit ----------------------------
//
// These are gates, not preferences, so they are asserted absolutely. The point of
// naming a style is being able to rely on it: "Groove" that occasionally emitted a
// three-sixteenth cut off the beat would be no promise at all.

const STYLE_GRID = { phrase: 16, groove: 8, chop: 4 };
const STYLE_CELLS = { phrase: [16, 32, 64], groove: [8, 16, 32], chop: [4, 8, 16] };
for (const style of REARRANGE_STYLE_NAMES) {
  const seen = new Set();
  let aligned = true;
  let exact = true;
  for (let seed = 0; seed < 24; seed++) {
    const recipe = generateRearrangement(512, { seed, style });
    if (rearrangementOutputSteps(recipe) !== 512) exact = false;
    for (const op of recipe.operations) {
      seen.add(op.length);
      if (op.from % STYLE_GRID[style]) aligned = false;
      if (op.from < 0 || op.from + op.length > 512) exact = false;
    }
  }
  assert(exact, `${style} keeps the exact song duration and stays inside the source`);
  assert(aligned, `${style} starts every slice on a ${STYLE_GRID[style]}-step source boundary`);
  assert([...seen].every((length) => STYLE_CELLS[style].includes(length)),
    `${style} emits only its own cell lengths (saw ${[...seen].sort((x, y) => x - y).join(', ')})`);
}
assert(REARRANGE_STYLE_DEFAULT === 'groove' && REARRANGE_STYLE_NAMES.length === 3,
  'Groove is the named default and there are three styles');

{
  // Base material is always beat-aligned. Sub-beat work exists only as an explicit
  // section-ending fill, and the retired compatibility flag has no effect.
  const plain = generateRearrangement(512, { seed: 11, style: 'chop' });
  const ignored = generateRearrangement(512, { seed: 11, style: 'chop', allowGlitches: true });
  assert(plain.operations.every((op) => op.length >= 4 && op.from % 4 === 0)
    && ignored.operations.every((op) => op.length >= 4 && op.from % 4 === 0),
    'base slices stay on beats and the retired glitch flag is ignored');
  const filled = generateRearrangement(512, { seed: 11, style: 'chop', fill: 'machinegun' });
  assert(filled.fills?.length > 0
    && filled.operations.filter((op) => op.fill).some((op) => op.length < 4),
    'machine-gun fills are explicit boundary overlays, not base slices');
}

{
  // A favourite is an exact user request. Style alignment is the generator's rule
  // about its own choices, and it does not get to overrule one.
  const odd = { from: 37, length: 11 };
  for (const style of REARRANGE_STYLE_NAMES) {
    const recipe = generateRearrangement(512, { seed: 3, style, favourites: [odd] });
    assert(recipe.operations.some((op) => op.from === 37 && op.length === 11
      && op.repeats === 1 && op.transpose === 0)
      && rearrangementOutputSteps(recipe) === 512,
      `${style} keeps an odd-length favourite exactly as asked, at the exact duration`);
  }
}

// ---- SCORING: the reason any of this exists ----------------------------------

{
  // A song where every odd-numbered bar is one long held chord. Half of all the
  // boundaries a blind generator could take would cut into held material; a generator
  // that can see the song should be taking very few of them.
  const steps = 512;
  const bars = steps / 16;
  const sustains = new Float32Array(steps);
  for (let i = 0; i < steps; i++) sustains[i] = (Math.floor(i / 16) % 2) ? 3 : 0;
  const heldProfile = () => ({
    steps, bars, sustains,
    onsets: new Float32Array(steps),
    percussion: new Float32Array(steps),
    chroma: new Float32Array(bars * 12),
    energy: new Float32Array(bars).fill(0.5),
  });
  const hazardRate = (options) => {
    let hazard = 0;
    let total = 0;
    for (let seed = 0; seed < 24; seed++) {
      for (const op of generateRearrangement(steps, { seed, ...options }).operations) {
        total += 2;
        if (sustains[op.from] > 0) hazard++;
        if (sustains[(op.from + op.length) % steps] > 0) hazard++;
      }
    }
    return hazard / total;
  };
  const blind = hazardRate({ style: 'groove' });
  const seeing = hazardRate({ style: 'groove', sourceProfile: heldProfile() });
  assert(blind > 0.35, 'without a profile, boundaries fall in held material about as often as chance');
  assert(seeing < blind / 2,
    `a scored generation more than halves that (${(blind * 100).toFixed(0)}% to ${(seeing * 100).toFixed(0)}%)`);
  assert(hazardRate({ style: 'phrase', sourceProfile: heldProfile() }) < 0.02,
    'and with whole phrases to choose from it avoids them almost entirely');
  assert(hazardRate({ style: 'groove', sourceProfile: heldProfile(), variation: 0 })
    <= hazardRate({ style: 'groove', sourceProfile: heldProfile(), variation: 1 }),
    'Familiar takes the safest available slice; Different is allowed to reach further');
}

{
  // A source with nowhere clean to cut must still produce a recipe of the exact
  // length — the safety rule is a preference with a floor, not a refusal to work.
  const steps = 256;
  const bars = steps / 16;
  const everywhere = {
    steps, bars,
    sustains: new Float32Array(steps).fill(4),
    onsets: new Float32Array(steps),
    percussion: new Float32Array(steps),
    chroma: new Float32Array(bars * 12),
    energy: new Float32Array(bars).fill(0.5),
  };
  const recipe = generateRearrangement(steps, { seed: 11, style: 'groove', sourceProfile: everywhere });
  assert(rearrangementOutputSteps(recipe) === steps
    && recipe.operations.every((op) => op.from >= 0 && op.from + op.length <= steps),
    'a song that is held everywhere still generates a valid, exact-length recipe');
}

{
  // Determinism, with the scorer in the loop. Same seed and same analysis, same recipe.
  const steps = 256;
  const bars = steps / 16;
  const profile = () => ({
    steps, bars,
    sustains: new Float32Array(steps),
    onsets: new Float32Array(steps),
    percussion: new Float32Array(steps),
    chroma: new Float32Array(bars * 12).map((_, i) => (i % 12) / 12),
    energy: new Float32Array(bars).map((_, i) => (i % 4) / 3),
  });
  const first = generateRearrangement(steps, { seed: 88, style: 'groove', sourceProfile: profile() });
  const again = generateRearrangement(steps, { seed: 88, style: 'groove', sourceProfile: profile() });
  assert(eq(first, again), 'the same seed and the same analysis produce the same recipe');
  const other = generateRearrangement(steps, { seed: 88, style: 'groove', sourceProfile: profile(), variation: 1 });
  assert(!eq(first, other), 'and the Variation dial genuinely changes what comes out');
}

{
  // Energy follows the form: a chorus should be drawn from busier material than a
  // verse. The fixture makes the song's second half plainly bigger than its first.
  const steps = 512;
  const bars = steps / 16;
  const energy = new Float32Array(bars);
  for (let i = 0; i < bars; i++) energy[i] = i < bars / 2 ? 0.15 : 0.95;
  const profile = {
    steps, bars, energy,
    sustains: new Float32Array(steps),
    onsets: new Float32Array(steps),
    percussion: new Float32Array(steps),
    chroma: new Float32Array(bars * 12),
  };
  let chorusHigher = 0;
  let compared = 0;
  for (let seed = 0; seed < 16; seed++) {
    const recipe = generateRearrangement(steps, { seed, style: 'groove', sourceProfile: profile });
    const chorus = recipe.form.find((section) => section.role === 'Chorus');
    const verse = recipe.form.find((section) => section.role === 'Verse');
    if (!chorus || !verse) continue;
    compared++;
    if (energy[Math.floor(chorus.source / 16)] >= energy[Math.floor(verse.source / 16)]) chorusHigher++;
  }
  assert(compared > 0 && chorusHigher === compared,
    'every chorus is drawn from source material at least as big as its verse');
}

// ---- HARMONY: the chord loop, note by note -----------------------------------
//
// The claim that justifies all of it: diatonic movement produces the KEY's chord
// qualities on its own. An Am triad stepped -2 degrees in A minor is F MAJOR — three
// notes moving three different distances — where a chromatic -4 would give F minor.
// Every assertion here is a chord a musician can check on a keyboard.

const A4 = 440;
const hz = (semisFromA4) => A4 * 2 ** (semisFromA4 / 12);
const near = (x, y) => Math.abs(x - y) < x * 1e-9;
const AMINOR = { tonic: 9, minor: true };
{
  const [amA, amC, amE] = [hz(0), hz(3), hz(7)]; // A4, C5, E5
  assert(near(harmonicShift(amA, AMINOR, -2), hz(-4))   // A → F
    && near(harmonicShift(amC, AMINOR, -2), hz(0))      // C → A
    && near(harmonicShift(amE, AMINOR, -2), hz(3)),     // E → C
    'Am stepped -2 degrees in A minor is F major — the VI, not the parallel-minor smudge');
  assert(near(harmonicShift(amA, AMINOR, 2), hz(3))     // A → C
    && near(harmonicShift(amC, AMINOR, 2), hz(7))       // C → E
    && near(harmonicShift(amE, AMINOR, 2), hz(10)),     // E → G
    'and +2 degrees is C major — the III');
  assert(near(harmonicShift(amA, AMINOR, -1), hz(-2))   // A → G
    && near(harmonicShift(amC, AMINOR, -1), hz(2))      // C → B
    && near(harmonicShift(amE, AMINOR, -1), hz(5)),     // E → D
    'and -1 degree is G major — the VII: the whole EDM loop from one riff');
  assert(near(harmonicShift(amA, AMINOR, 0), amA),
    'degree zero leaves the note exactly alone');
  assert(near(harmonicShift(amA, AMINOR, -7), hz(-12)) && near(harmonicShift(amA, AMINOR, 7), hz(12)),
    'a full seven degrees is the octave, both ways');
  assert(near(harmonicShift(hz(-12), AMINOR, -2), hz(-16)),
    'the same movement lands the same interval an octave down');
  // G# is not in A natural minor: it rides with the scale tone below it (G), staying
  // one semitone sharp of wherever G lands. G stepped -2 degrees is E, so G# comes
  // back as F — the leading-tone colour survives the walk instead of being snapped away.
  assert(near(harmonicShift(hz(-1), AMINOR, -2), hz(-4)),
    'a non-scale note keeps its sharpness relative to the scale tone below it');
  assert(harmonyNumeral(-2, true) === 'VI' && harmonyNumeral(2, true) === 'III'
    && harmonyNumeral(-1, true) === 'VII' && harmonyNumeral(3, true) === 'iv'
    && harmonyNumeral(-3, false) === 'V' && harmonyNumeral(-2, false) === 'vi',
    'degree offsets label as the roman numerals a musician would write');
}

{
  // A song solidly in A minor: the generator detects the key, walks Verse/Chorus
  // sections around a four-chord loop one chord per bar, and stamps the key into the
  // recipe so a saved file replays the same chords without the analysis.
  const steps = 512;
  const bars = steps / 16;
  const chroma = new Float32Array(bars * 12);
  for (let bi = 0; bi < bars; bi++) {
    chroma[bi * 12 + 9] = 1; chroma[bi * 12 + 0] = 0.8; chroma[bi * 12 + 4] = 0.7;
    chroma[bi * 12 + 2] = 0.3; chroma[bi * 12 + 5] = 0.3; chroma[bi * 12 + 7] = 0.3;
  }
  const aminorProfile = () => ({
    steps, bars, chroma,
    sustains: new Float32Array(steps), onsets: new Float32Array(steps),
    percussion: new Float32Array(steps), energy: new Float32Array(bars).fill(0.5),
  });
  const recipe = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm', walk: 'full', chordPace: 'active',
  });
  assert(recipe.key?.tonic === 9 && recipe.key?.minor === true,
    'the recipe carries the detected key');
  const offsets = new Set(recipe.operations.map((op) => op.harmony || 0));
  assert(offsets.has(-2) && offsets.has(2) && offsets.has(-1),
    'the full EDM loop appears: slices playing as the VI, the III and the VII');
  assert(rearrangementOutputSteps(recipe) === steps,
    'walking the chords moves no time — the duration is exactly the song');
  assert(recipe.operations.every((op) => !op.harmony || Math.abs(op.harmony) <= 7),
    'every offset stays within one octave of degrees');
  const chorus = recipe.form.filter((section) => section.role === 'Chorus');
  const chordAt = (recipe2, step) => rearrangementPosition(recipe2, step).operation.harmony || 0;
  assert(chorus.length >= 2 && [0, 16, 32, 48].every((bar) =>
    chordAt(recipe, chorus[0].start + bar) === chordAt(recipe, chorus[1].start + bar)),
    'every returning chorus walks the same four chords in the same order');
  const again = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm', walk: 'full', chordPace: 'active',
  });
  assert(eq(recipe, again), 'chord loops are as deterministic as everything else');

  // A walking section is ONE chunk repeated — the club shape. Walking an A/B pair
  // re-harmonised a phrase that was already answering itself, and it sounded like it.
  for (const test of [recipe, generateRearrangement(steps, {
    seed: 4, style: 'chop', sourceProfile: aminorProfile(), progression: 'house',
  })]) {
    let uniform = true;
    for (const section of test.form) {
      const ops = [];
      let at = 0;
      for (const op of test.operations) {
        if (at >= section.start && at < section.end) ops.push(op);
        at += op.length * op.repeats;
      }
      if (!ops.some((op) => op.harmony)) continue;
      if (new Set(ops.map((op) => op.from)).size !== 1
        || new Set(ops.map((op) => op.length)).size !== 1) uniform = false;
    }
    assert(uniform, 'every section that walks chords is a single repeated cell');
  }

  // Chord pace is intentionally phrase-led. Slow holds home before the progression
  // moves; Active retains the legacy one-degree-per-bar walk for deliberate use.
  const chordAtBar = (r, sectionStart, bar) =>
    rearrangementPosition(r, sectionStart + bar * 16).operation.harmony || 0;
  const half = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm',
  });
  const halfChorus = half.form.find((section) => section.role === 'Chorus');
  assert(chordAtBar(half, halfChorus.start, 0) === 0 && chordAtBar(half, halfChorus.start, 1) === 0
    && chordAtBar(half, halfChorus.start, 2) === -2 && chordAtBar(half, halfChorus.start, 3) === 2,
    'the default slow pace holds i before moving to the next phrase degrees');
  const turn = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm', walk: 'turn', chordPace: 'active',
  });
  const turnChorus = turn.form.find((section) => section.role === 'Chorus');
  assert([0, 1, 2].every((bar) => chordAtBar(turn, turnChorus.start, bar) === 0)
    && chordAtBar(turn, turnChorus.start, 3) === -1,
    'active pace can still request the legacy turnaround walk');

  // The reduction keeps the palette's MOVEMENT, not its bar positions. The anthem
  // palette (VI–VII–i–i) moves in bars 1-2 — a positional mask kept its home bars
  // and threw the lift away, leaving a "walking" chorus of four tonic bars.
  const anthem = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'anthem',
  });
  const anthemChorus = anthem.form.find((section) => section.role === 'Chorus');
  assert([0, 1, 2, 3].map((bar) => chordAtBar(anthem, anthemChorus.start, bar)).join(',')
    === '0,0,-2,-1',
    'slow anthem pacing holds the tonic before the lift');
  for (const name of ['edm', 'house', 'anthem', 'dark']) {
    for (const amount of ['half', 'turn']) {
      const reduced = generateRearrangement(steps, {
        seed: 8, style: 'groove', sourceProfile: aminorProfile(), progression: name, walk: amount,
        chordPace: amount === 'turn' ? 'active' : 'slow',
      });
      assert(reduced.form.filter((section) => ['Verse', 'Chorus', 'Bridge'].includes(section.role))
        .every((section) => {
          let at = 0;
          let walks = false;
          for (const op of reduced.operations) {
            if (at >= section.start && at < section.end && op.harmony) walks = true;
            at += op.length * op.repeats;
          }
          return walks;
        }),
        `${name}/${amount}: every reduced walk still walks — no all-tonic sections`);
    }
  }
  const off = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'off',
  });
  assert(off.operations.every((op) => !op.harmony) && off.key === undefined,
    'progression Off writes no harmony and carries no key');
  const blind = generateRearrangement(steps, { seed: 21, style: 'groove', progression: 'edm' });
  assert(blind.operations.every((op) => !op.harmony),
    'with no analysis there is no key to walk, so no chord is guessed at');
  // One pitch system per recipe: the chromatic dial at maximum changes NOTHING while
  // a chord loop is walking — not in the walking sections, not in the plain ones, and
  // not through the duplicate-breaking nudge.
  let anyChromatic = false;
  for (let seed = 0; seed < 16; seed++) {
    const both = generateRearrangement(steps, {
      seed, style: 'groove', sourceProfile: aminorProfile(),
      progression: 'edm', transposeAmount: 1,
    });
    if (both.operations.some((op) => op.transpose !== 0)) anyChromatic = true;
  }
  assert(!anyChromatic,
    'while chords walk, the chromatic transpose dial is ignored recipe-wide');
  const dialOnly = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(),
    progression: 'off', transposeAmount: 1, variation: 1,
  });
  assert(dialOnly.operations.every((op) => !op.harmony),
    'and with the loop Off the dial is back in charge, still with no chords');
  // Round trip and rejection.
  const kept = validateRearrangement(JSON.parse(JSON.stringify(recipe)), steps);
  assert(eq(kept.operations, recipe.operations) && eq(kept.key, recipe.key),
    'harmony offsets and the key survive the JSON round trip');
  const noKey = JSON.parse(JSON.stringify(recipe));
  delete noKey.key;
  let rejected = false;
  try { validateRearrangement(noKey, steps); } catch { rejected = true; }
  assert(rejected, 'harmony offsets without a key are rejected — degrees of nothing');
}

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

const variable = generateRearrangement(128, { seed: 5, outputSteps: 192, style: 'groove', fill: 'none' });
assert(variable.output?.steps === 192 && rearrangementOutputSteps(variable) === 192
  && variable.form.at(-1).end === 192,
  'variable M8TRX output carries its own length and form coverage');
const variableChecked = validateRearrangement(JSON.parse(JSON.stringify(variable)), 128);
assert(rearrangementPosition(variableChecked, 191).outputStep === 191
  && rearrangementPosition(variableChecked, 192).outputStep === 0,
  'variable output lengths wrap at the recipe boundary');
const staleForm = JSON.parse(JSON.stringify(variable));
staleForm.form[1].source = 128;
const repairedForm = validateRearrangement(staleForm, 128);
assert(repairedForm.form[1].source < 128 && repairedForm.form.at(-1).end === 192,
  'stale form source hints are repaired instead of blocking a variable M8TRX load');
const explicitFill = generateRearrangement(128, { seed: 2, style: 'groove', fill: 'rush' });
assert(explicitFill.fills?.every((fill) => fill.shape === 'rush')
  && explicitFill.operations.filter((op) => op.fill).every((op) => REARRANGE_FILL_NAMES.includes(op.fill)),
  'fills are named overlays and remain valid recipe data');

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

// ---- THE FOUR DIALS ---------------------------------------------------------------
//
// Mood, Hypnosis, Chaos and Drive replaced the one Variation slider. Each has to move
// something a listener would name, and `variation` has to keep meaning what it meant.
{
  const steps = 512;
  const dialled = (options) => generateRearrangement(steps, { seed: 31, style: 'groove', ...options });
  assert(eq(dialled({ mood: 0.9, hypnosis: 0.8, chaos: 0.2, drive: 0.7 }),
    dialled({ mood: 0.9, hypnosis: 0.8, chaos: 0.2, drive: 0.7 })),
    'the four dials are as deterministic as the seed');

  // THE LEGACY MAPPING IS EXACT. Variation was hypnosis and chaos read from opposite
  // ends, so an old caller is an old caller — not an approximation of one.
  let mapped = true;
  let perAxis = false;
  for (const style of ['groove', 'mix', 'chop']) {
    for (const v of [0, 0.3, 0.45, 0.8, 1]) {
      for (let seed = 1; seed <= 12; seed++) {
        const legacy = generateRearrangement(steps, { seed, style, variation: v, fill: 'auto' });
        const explicit = generateRearrangement(steps, {
          seed, style, fill: 'auto', hypnosis: 1 - v, chaos: v, mood: 0.5, drive: 0.5,
        });
        if (!eq(legacy, explicit)) mapped = false;
        // A dial that was given a value wins over `variation` on its own axis.
        if (!eq(legacy, generateRearrangement(steps, {
          seed, style, variation: v, fill: 'auto', hypnosis: 1 - v > 0.5 ? 0.05 : 0.95,
        }))) perAxis = true;
      }
    }
  }
  assert(mapped, 'variation still means exactly hypnosis 1-v and chaos v');
  assert(perAxis, 'a dial given outright overrules variation on that axis alone');

  // MOOD. A major song read dark comes back in its relative minor, and vice versa —
  // the same seven notes with a different home.
  const bars = steps / 16;
  const keyProfile = (pitches) => {
    const chroma = new Float32Array(bars * 12);
    for (let bi = 0; bi < bars; bi++) {
      for (const [pitch, weight] of pitches) chroma[bi * 12 + pitch] = weight;
    }
    return () => ({
      steps, bars, chroma,
      sustains: new Float32Array(steps), onsets: new Float32Array(steps),
      percussion: new Float32Array(steps), energy: new Float32Array(bars).fill(0.5),
    });
  };
  const aminor = keyProfile([[9, 1], [0, 0.8], [4, 0.7], [2, 0.3], [5, 0.3], [7, 0.3]]);
  const cmajor = keyProfile([[0, 1], [7, 0.8], [4, 0.7], [5, 0.3], [9, 0.3], [2, 0.3]]);
  const moodKey = (mood, profile) => generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: profile(), progression: 'auto', mood,
  }).key;
  assert(eq(moodKey(0.5, aminor), { tonic: 9, minor: true })
    && eq(moodKey(0.5, cmajor), { tonic: 0, minor: false }),
    'a centred Mood leaves the detected key exactly as analysed');
  assert(eq(moodKey(0, cmajor), { tonic: 9, minor: true }),
    'Noir re-reads a major song in its relative minor');
  assert(eq(moodKey(1, aminor), { tonic: 0, minor: false }),
    'Euphoric re-reads a minor song in its relative major');
  // Naming the key is a statement about the song, so Mood does not get to re-read it.
  // (The key has to be one the material actually supports, or nothing walks at all —
  // a walk in a key the song is not in is exactly what `walkCellScore` refuses.)
  assert(eq(generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: cmajor(), progression: 'auto', mood: 0,
    key: { tonic: 0, minor: false },
  }).key, { tonic: 0, minor: false }),
    'a key named at the desk outranks Mood entirely');
  const paletteOffsets = (mood, profile = aminor) => new Set(generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: profile(), progression: 'auto',
    mood, chordPace: 'active', walk: 'full',
  }).operations.map((op) => op.harmony || 0));
  assert(paletteOffsets(0).has(-2) && paletteOffsets(0).has(-3),
    'Noir walks a dark palette — VI and v are in it either way');
  assert(paletteOffsets(0.5).has(3) && paletteOffsets(0.5).has(4),
    'a centred Mood still lands on iv and v');
  // At the top of the dial the song has been re-read INTO major, so the bright end of
  // the minor ladder would be unreachable; a major key gets its own lift instead.
  assert(paletteOffsets(1).has(3) && paletteOffsets(1).has(4),
    'Euphoric lifts a major-keyed song through IV – V – I');

  // ---- MOOD'S PALETTE SHELF -------------------------------------------------------
  // A band is a set, so the anchors have to keep answering what they always answered:
  // an unpicked `moodPalette` is the compatibility seam every older caller reads.
  assert(moodPalette(0) === 'dark' && moodPalette(0.3) === 'house' && moodPalette(0.5) === 'pop'
    && moodPalette(0.7) === 'edm' && moodPalette(0.9) === 'anthem',
    'each band still anchors on the palette that band has always given');

  // THE ADMISSION TEST, ENFORCED. Every walking section is four bars, which takes
  // pacedChords' `i i m0 m1` shape — so a palette IS its first two moving chords, and
  // two palettes sharing that pair are one palette wearing two names. The third moving
  // chord never sounds in a generated recipe at all.
  const movingOf = (degrees) => degrees.filter((degree) => degree !== 0);
  const shelf = (minor) => [...new Set([0, 0.25, 0.45, 0.65, 0.9]
    .flatMap((mood) => moodPalettes(mood, minor)))];
  for (const minor of [true, false]) {
    const names = shelf(minor);
    const pairs = names.map((name) => movingOf(paletteDegrees(name)).slice(0, 2).join(','));
    assert(names.length >= 5 && new Set(pairs).size === pairs.length,
      `the ${minor ? 'minor' : 'major'} shelf has no two palettes that sound alike at four bars`);
  }

  // ONE SONG, MORE THAN ONE PROGRESSION. The Verse and the Chorus pick from the band
  // separately, which is the whole point: a Mood setting is a mood, not a progression.
  const roleLines = (mood, seed, profile = aminor, extra = {}) => {
    const recipe = generateRearrangement(steps, {
      seed, style: 'groove', sourceProfile: profile(), progression: 'auto', mood, ...extra,
    });
    return { recipe, lines: recipe.form.filter((section) => Array.isArray(section.chords))
      .map((section) => ({ role: section.role, chords: section.chords })) };
  };
  const splitSong = [21, 4242, 77, 1234].some((seed) => {
    const { lines } = roleLines(0.5, seed);
    return new Set(lines.map((line) => line.chords.join(','))).size > 1;
  });
  assert(splitSong, 'one recipe can walk different progressions in its Verse and its Chorus');

  // ...and re-rolling the seed re-rolls the harmony, which one palette per band could
  // never do however many times it was asked.
  const acrossSeeds = new Set([21, 4242, 77, 1234, 5, 909].flatMap((seed) =>
    roleLines(0.5, seed).lines.map((line) => line.chords.join(','))));
  assert(acrossSeeds.size > 1, 'the same Mood setting gives different chords on a different seed');

  // But only ever from inside the band — the dial still means what its word says.
  const inBand = (chords, mood, minor) => moodPalettes(mood, minor).some((name) => {
    const want = movingOf(chords);
    const have = movingOf(paletteDegrees(name));
    return want.length > 0 && want.every((degree, index) => have[index] === degree);
  });
  for (const mood of [0, 0.3, 0.5, 0.7, 1]) {
    for (const seed of [21, 4242, 77]) {
      const { recipe, lines } = roleLines(mood, seed);
      assert(lines.length > 0 && lines.every((line) => inBand(line.chords, mood, recipe.key.minor)),
        `every section at Mood ${mood} seed ${seed} walks a palette from that band`);
    }
  }

  // Naming a palette is a statement about the whole arrangement, so it is NOT spread
  // across the form the way Auto's band is: every section walks the one that was asked for.
  const named = generateRearrangement(steps, {
    seed: 4242, style: 'groove', sourceProfile: aminor(), progression: 'anthem',
  }).form.filter((section) => Array.isArray(section.chords));
  assert(named.length > 1
    && new Set(named.map((section) => section.chords.join(','))).size === 1,
    'a named progression is still one progression for the whole song');

  // HYPNOSIS. High settings build a section out of fewer distinct pieces of the song,
  // and come back to each of them more often — which is what "locked" means here. It
  // is NOT the same as more repeats per slice: the A/B pair it reaches for at the top
  // of the dial is a returning motif written as single passes.
  const shape = (hypnosis) => {
    let ops = 0;
    let distinct = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const recipe = generateRearrangement(steps, { seed, style: 'groove', hypnosis });
      ops += recipe.operations.length;
      distinct += new Set(recipe.operations.map((op) => `${op.from}:${op.length}`)).size;
    }
    return { distinct, returns: ops / distinct };
  };
  const scattered = shape(0);
  const trance = shape(1);
  assert(trance.distinct < scattered.distinct,
    'Trance reaches for fewer distinct pieces of the song than Scatter');
  assert(trance.returns > scattered.returns,
    'Trance comes back to each piece more often than Scatter does');

  // CHAOS. Chaos does not chop the song up more — that is Hypnosis's end of the desk.
  // It decides how far from the safest answer a choice may land: how often a part takes
  // a chromatic lift at all, and how far down the scored ranking its material comes from.
  const adventure = (chaos) => {
    const plain = () => ({
      steps, bars, sustains: new Float32Array(steps),
      onsets: new Float32Array(steps), chroma: new Float32Array(bars * 12),
      percussion: new Float32Array(steps), energy: new Float32Array(bars).fill(0.5),
    });
    let lifted = 0;
    for (let seed = 1; seed <= 24; seed++) {
      lifted += generateRearrangement(steps, {
        seed, style: 'groove', sourceProfile: plain(), chaos,
        progression: 'off', transposeAmount: 1,
      }).operations.filter((op) => op.transpose).length;
    }
    return lifted;
  };
  assert(adventure(1) > adventure(0),
    'Feral takes the lifts a Tame recipe leaves alone');
  assert(!eq(generateRearrangement(steps, { seed: 5, style: 'groove', chaos: 0 }),
    generateRearrangement(steps, { seed: 5, style: 'groove', chaos: 1 })),
    'Chaos changes which material a recipe reaches for');

  // DRIVE. More fills, and past the top of the dial the chords move every bar.
  const fillsAt = (drive) => {
    let count = 0;
    for (let seed = 1; seed <= 24; seed++) {
      count += generateRearrangement(steps, { seed, style: 'groove', fill: 'auto', drive })
        .operations.filter((op) => op.fill).length;
    }
    return count;
  };
  const chill = fillsAt(0);
  const peak = fillsAt(1);
  assert(peak > fillsAt(0.5) && fillsAt(0.5) > chill,
    'Drive decides how often a part ends with a fill');
  assert(chill === 0 || chill < peak / 2,
    'a chill setting still leaves most part endings plain');
  // Drive owns the chord PACE. How much of the loop is allowed to move is Mood's walk
  // mask, so the two together decide the walk; on a four-bar part with the default mask
  // that shows up as different chords rather than more of them.
  const walkOf = (drive) => generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminor(), progression: 'auto', drive,
  }).form.map((section) => section.chords).filter(Boolean)[0];
  assert(drivePace(0) === 'slow' && drivePace(0.5) === 'slow' && drivePace(1) === 'active',
    'Drive holds the song grammar until the top of the dial');
  assert(!eq(walkOf(0), walkOf(1)),
    'Ambient and Peak-time do not walk the same chords');
  const longMoves = (drive) => generateRearrangement(1024, {
    seed: 21, style: 'groove', sourceProfile: (() => {
      const long = 1024;
      const longBars = long / 16;
      const chroma = new Float32Array(longBars * 12);
      for (let bi = 0; bi < longBars; bi++) {
        for (const [p, w] of [[9, 1], [0, 0.8], [4, 0.7], [2, 0.3], [5, 0.3], [7, 0.3]]) {
          chroma[bi * 12 + p] = w;
        }
      }
      return { steps: long, bars: longBars, chroma,
        sustains: new Float32Array(long), onsets: new Float32Array(long),
        percussion: new Float32Array(long), energy: new Float32Array(longBars).fill(0.5) };
    })(),
    progression: 'auto', walk: 'full', drive, outputSteps: 1024,
  }).operations.filter((op) => op.harmony).length;
  assert(longMoves(1) > longMoves(0),
    'given a full walk, Peak-time changes chord where Ambient holds home');
  assert(driveDrumKit(0) === 'song' && driveDrumKit(1) === 'techno'
    && REARRANGE_DRIVE_KITS.every((kit) => REARRANGE_DRUM_MODES.includes(kit)),
    'the Drive kit ladder runs from the song\'s own groove to techno, all real kits');

  // Auto still has to be able to say no, at every setting of the dials.
  let silentEndings = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const recipe = generateRearrangement(steps, {
      seed, style: 'groove', fill: 'auto', drive: 0, chaos: 0,
    });
    if (!recipe.operations.some((op) => op.fill)) silentEndings++;
  }
  assert(silentEndings > 20, 'a quiet, tame recipe usually carries no fill at all');

  // ---- THE PART CARD'S DICE: REBUILD ONE PART, IN THE SPACE IT ALREADY HOLDS --------
  const base = generateRearrangement(steps, {
    seed: 77, style: 'groove', sourceProfile: aminor(), progression: 'auto', fill: 'auto',
  });
  const spanOf = (recipe) => recipe.operations
    .reduce((sum, op) => sum + op.length * op.repeats, 0);
  const partAt = (recipe, index) => {
    const section = recipe.form[index];
    const ops = [];
    let at = 0;
    for (const op of recipe.operations) {
      if (at >= section.start && at < section.end) ops.push(op);
      at += op.length * op.repeats;
    }
    return ops;
  };
  const target = 1;
  let everyLengthHeld = true;
  let everyFormHeld = true;
  let othersUntouched = true;
  for (let roll = 1; roll <= 12; roll++) {
    const out = regenerateRearrangementSection(base, target, {
      seed: roll * 5711, style: 'groove', sourceProfile: aminor(), progression: 'auto',
    });
    if (spanOf(out.recipe) !== spanOf(base)) everyLengthHeld = false;
    if (JSON.stringify(out.recipe.form.map((f) => [f.start, f.end, f.name]))
      !== JSON.stringify(base.form.map((f) => [f.start, f.end, f.name]))) everyFormHeld = false;
    for (let other = 0; other < base.form.length; other++) {
      if (other === target) continue;
      if (JSON.stringify(partAt(out.recipe, other)) !== JSON.stringify(partAt(base, other))) {
        othersUntouched = false;
      }
    }
  }
  assert(everyLengthHeld, 'a rebuilt part never changes the song\'s length');
  assert(everyFormHeld, 'a rebuilt part moves no boundary and renames nothing');
  assert(othersUntouched, 'rebuilding one part leaves every other part exactly as it was');

  // THE SHAPE IS ONLY FREE WHERE THE GENERATOR LEAVES IT FREE. A walking part is one
  // repeated cell by contract — that is the club shape Generate builds and the dice does
  // not get to overrule it — so the rebuilt chop is measured on a recipe with no walks,
  // which is where a part is built through `sectionOperations` and can come back as a
  // pair, a loop, or a collage.
  const plainSong = generateRearrangement(steps, {
    seed: 77, style: 'groove', sourceProfile: aminor(), progression: 'off', fill: 'auto',
  });
  const shapes = new Set();
  const sources = new Set();
  for (let roll = 1; roll <= 12; roll++) {
    const out = regenerateRearrangementSection(plainSong, 1, {
      seed: roll * 5711, style: 'groove', sourceProfile: aminor(), progression: 'off',
    });
    const part = partAt(out.recipe, 1);
    shapes.add(part.map((op) => `${op.length}x${op.repeats}`).join('|'));
    sources.add(part.map((op) => op.from).join('|'));
  }
  assert(sources.size >= 6,
    `the part dice keeps finding new material — 12 rolls gave ${sources.size} results`);
  assert(shapes.size > 1,
    `the part dice rebuilds the CHOP too, not just where the slices come from — ${shapes.size} shapes`);

  // A walked part comes back walking the same chords — the form's chord line must stay true.
  const walkedIndex = base.form.findIndex((f) => Array.isArray(f.chords));
  if (walkedIndex >= 0) {
    const rolled = regenerateRearrangementSection(base, walkedIndex, {
      seed: 4242, style: 'groove', sourceProfile: aminor(), progression: 'auto',
    });
    assert(eq(rolled.recipe.form[walkedIndex].chords, base.form[walkedIndex].chords)
      && partAt(rolled.recipe, walkedIndex).some((op) => op.harmony),
      'a rolled part that was walking chords comes back walking the same ones');
  }
  // A locked part refuses: a lock is a promise of verbatim, and the dice is the loudest
  // possible way to break it.
  let refused = false;
  try {
    regenerateRearrangementSection(base, target, { seed: 9, style: 'groove', locked: true });
  } catch { refused = true; }
  assert(refused, 'a locked part refuses to be rolled');
}

// A CHORD WALK HAS TO ACTUALLY WALK, on every part, whatever it is cut from.
//
// Harmony lives on an operation and a walk is one chord per BAR, so a part built from a
// single four-bar grab had exactly one slot for four chords — and the slow phrase grammar
// opens at home, so turning the walk on wrote the tonic over the tonic. The library
// reported `changed: 1`, nothing sounded different, the chord line stayed empty (every
// chord equalled the tonic) and the card's W stayed unlit. It looked like a dead button,
// and only on parts made of few long slices, which is why it seemed to fail at random.
{
  for (const style of REARRANGE_STYLE_NAMES) {
    const base = generateRearrangement(64 * 8, { seed: 4242, style });
    base.key = { tonic: 4, minor: true };
    const total = rearrangementOutputSteps(base);
    let walkedEvery = true;
    let lengthHeld = true;
    let materialHeld = true;
    base.form.forEach((section, index) => {
      const { recipe } = toggleRearrangeSectionWalk(base, index);
      if (rearrangementOutputSteps(recipe) !== total) lengthHeld = false;
      // Cutting a part into bars must not move a single sixteenth of source material: each
      // pass replays what it always did and each grab stays contiguous.
      const heard = (r) => r.operations.flatMap((op) => new Array(op.repeats).fill(null)
        .flatMap(() => new Array(op.length).fill(null).map((_, at) => op.from + at)));
      if (JSON.stringify(heard(recipe)) !== JSON.stringify(heard(base))) materialHeld = false;
      let step = 0;
      let moved = 0;
      for (const op of recipe.operations) {
        const duration = op.length * op.repeats;
        if (step >= section.start && step + duration <= section.end && op.harmony) moved += 1;
        step += duration;
      }
      if (!moved) walkedEvery = false;
    });
    assert(walkedEvery, `every ${style} part actually walks when its chord walk is turned on`);
    assert(lengthHeld, `turning a ${style} walk on never changes the output length`);
    assert(materialHeld, `turning a ${style} walk on never changes a sixteenth of material`);
  }
  // Off again strips it, and the part is left plain.
  const base = generateRearrangement(64 * 8, { seed: 7, style: 'phrase' });
  base.key = { tonic: 4, minor: true };
  const on = toggleRearrangeSectionWalk(base, 1).recipe;
  const off = toggleRearrangeSectionWalk(on, 1).recipe;
  assert(off.operations.every((op) => op.harmony === undefined),
    'turning a chord walk back off leaves no harmony behind');
  // The dice over the same part is subject to the same two rules.
  const rolled = rerollSectionWalk(on, 1, { seed: 31 }).recipe;
  assert(rearrangementOutputSteps(rolled) === rearrangementOutputSteps(base),
    'rerolling a chord walk never changes the output length');
  let rolledMoved = 0;
  let at = 0;
  for (const op of rolled.operations) {
    const span = rolled.form[1];
    if (at >= span.start && at + op.length * op.repeats <= span.end && op.harmony) rolledMoved += 1;
    at += op.length * op.repeats;
  }
  assert(rolledMoved > 0, 'a rerolled chord walk lands on chords other than the tonic');
  // A one-bar part has one chord, and one chord is not a progression. Refused out loud
  // rather than reported as done — the failure this whole fix is about.
  const tiny = generateRearrangement(64, { seed: 3, style: 'phrase' });
  tiny.key = { tonic: 0, minor: true };
  const oneBar = tiny.form.findIndex((s) => (s.end - s.start) === 16);
  if (oneBar >= 0) {
    let refused = false;
    try { toggleRearrangeSectionWalk(tiny, oneBar); } catch { refused = true; }
    assert(refused, 'a one-bar part refuses to walk rather than silently doing nothing');
  }
  // A SLICE ACROSS A PART'S EDGE IS CUT THERE, NOT REFUSED. Ordinary editing produces them
  // — joins and repeat changes move durations around — and a slice belonging to neither part
  // used to leave the walk returning `changed: 0` in silence.
  {
    const start = generateRearrangement(64 * 8, { seed: 11, style: 'phrase' });
    start.key = { tonic: 4, minor: true };
    const boundary = start.form[1].end;
    let at = 0;
    let straddler = -1;
    start.operations.forEach((op, index) => {
      if (at < boundary && at + op.length * op.repeats > boundary) straddler = index;
      at += op.length * op.repeats;
    });
    // Join the two slices either side of a boundary to manufacture one that spans it.
    let crossed = start;
    if (straddler < 0) {
      at = 0;
      let pair = -1;
      start.operations.forEach((op, index) => {
        if (at + op.length * op.repeats === boundary) pair = index;
        at += op.length * op.repeats;
      });
      if (pair >= 0 && start.operations[pair + 1]) {
        try { crossed = transformRearrangement(start, [pair, pair + 1], 'join', {}).recipe; } catch { /* leave as-is */ }
      }
    }
    const heard = (r) => r.operations.flatMap((op) => new Array(op.repeats).fill(null)
      .flatMap(() => new Array(op.length).fill(null).map((_, n) => op.from + n)));
    const before = heard(crossed);
    const total = rearrangementOutputSteps(crossed);
    let allWalked = true;
    crossed.form.forEach((_, index) => {
      try {
        const out = toggleRearrangeSectionWalk(crossed, index).recipe;
        validateRearrangement(out, 64 * 8);
        if (rearrangementOutputSteps(out) !== total) allWalked = false;
        if (JSON.stringify(heard(out)) !== JSON.stringify(before)) allWalked = false;
      } catch { allWalked = false; }
    });
    assert(allWalked,
      'a part whose slice runs across its edge is cut there and walks, losing no material');
  }
  // And a walk still needs a key to walk within.
  const keyless = generateRearrangement(64 * 4, { seed: 5, style: 'phrase' });
  delete keyless.key;
  let needsKey = false;
  try { toggleRearrangeSectionWalk(keyless, 0); } catch { needsKey = true; }
  assert(needsKey, 'a chord walk without a key is refused');
}

// ---- the source's phrase grid -------------------------------------------------
//
// A song with a three-bar intro has every phrase on an odd bar. Striding four-bar grabs
// from step 0 then lands every one of them a bar out of phase for the whole song, which
// is audible however well the rest of the scoring behaves. These pin the correction and,
// just as importantly, pin that it stays OFF unless something can actually say so.

{
  const steps = 64 * 8;

  const plain = sourceCandidates(steps, 64, 0);
  assert(plain.every((from) => from % 64 === 0),
    'with no offset every four-bar grab starts on a four-bar boundary, as it always did');
  assert(plain[0] === 0 && plain.includes(steps - 64),
    'and the run covers the song from its first phrase to its last');

  // Three bars in: the grid moves with the song, and bar 0 survives as the intro.
  const shifted = sourceCandidates(steps, 64, 48);
  assert(shifted[0] === 0, 'an offset grid still offers the intro before the first phrase');
  assert(shifted.slice(1).every((from) => (from - 48) % 64 === 0 || from === steps - 64),
    'and every other candidate sits on the song\'s own phrase grid');
  assert(shifted.includes(48) && !shifted.includes(64),
    'the phrase after a three-bar intro starts at bar 3, not at bar 4');
}

{
  // Degenerate input is a caller bug, not a licence to read out of bounds or hand back
  // an empty candidate list — `chooseSource` indexes into this unconditionally.
  const steps = 64 * 4;
  for (const bad of [-16, steps * 4, 0]) {
    const list = sourceCandidates(steps, 64, bad);
    assert(list.length > 0, `an offset of ${bad} still yields at least one candidate`);
    assert(list.every((from) => from >= 0 && from + 64 <= steps),
      `and every candidate from an offset of ${bad} is in bounds`);
  }
  assert(sourceCandidates(32, 64, 16).every((from) => from >= 0),
    'a span longer than the song does not produce a negative start');
}

{
  // The regression guarantee that matters most: a song nothing can say anything about
  // generates EXACTLY what it generated before this existed.
  const steps = 64 * 6;
  const flatDensity = new Array(steps / 16).fill(0.5);
  const recipeOf = (options) => JSON.stringify(
    generateRearrangement(steps, { seed: 9, ...options }).operations);
  assert(recipeOf({ sourceProfile: flatDensity }) === recipeOf({ sourceProfile: flatDensity, phraseOffset: 0 }),
    'a legacy density array cannot move the phrase grid');
  assert(recipeOf({}) === recipeOf({ phraseOffset: 0 }),
    'and no profile at all leaves the historical striding in place');
  assert(recipeOf({ phraseOffset: 48 }) !== recipeOf({ phraseOffset: 0 }),
    'while a named offset genuinely changes what the generator reaches for');
  assert(recipeOf({ phraseOffset: 48 }) === recipeOf({ phraseOffset: 48 }),
    'and the same offset with the same seed still gives the same recipe');
}

console.log(failed ? 'REARRANGE: FAILED' : 'REARRANGE: PASSED');
process.exit(failed ? 1 : 0);
