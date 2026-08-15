// Deterministic, same-length Rearrange recipes are a pure seam: the desk can save
// and load these instructions without copying a song's notes or mix into the file.
import {
  REARRANGE_KIND, REARRANGE_VERSION, REARRANGE_GRID, REARRANGE_TRANSPOSES,
  REARRANGE_GENERATED_TRANSPOSES,
  REARRANGE_EXTREMENESS_DEFAULT,
  REARRANGE_TRANSPOSE_DEFAULT, REARRANGE_PATTERN_DEFAULT,
  REARRANGE_STYLE_NAMES, REARRANGE_STYLE_DEFAULT,
  harmonicShift, harmonyNumeral,
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
  // Sub-beat cuts and off-grid starts are not a style, they are a switch. Nothing
  // reaches them by accident, which is the whole reason the switch exists.
  const plain = new Set();
  const glitched = new Set();
  let offGrid = false;
  for (let seed = 0; seed < 40; seed++) {
    for (const op of generateRearrangement(512, { seed, style: 'chop' }).operations) plain.add(op.length);
    for (const op of generateRearrangement(512, { seed, style: 'chop', allowGlitches: true }).operations) {
      glitched.add(op.length);
      if (op.from % 4) offGrid = true;
    }
  }
  assert(![...plain].some((length) => length < 4),
    'no style emits a sub-beat cut on its own');
  assert([1, 2].some((length) => glitched.has(length)) && offGrid,
    'Allow glitches is what unlocks one and two-sixteenth cuts and off-grid starts');
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
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm', walk: 'full',
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
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm', walk: 'full',
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

  // The walk amount: by default the riff holds home for two bars and moves on the
  // back half; the turnaround holds three. Full is the whole loop, asked for by name.
  const chordAtBar = (r, sectionStart, bar) =>
    rearrangementPosition(r, sectionStart + bar * 16).operation.harmony || 0;
  const half = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm',
  });
  const halfChorus = half.form.find((section) => section.role === 'Chorus');
  assert(chordAtBar(half, halfChorus.start, 0) === 0 && chordAtBar(half, halfChorus.start, 1) === 0
    && chordAtBar(half, halfChorus.start, 2) === 2 && chordAtBar(half, halfChorus.start, 3) === -1,
    'the default walk holds i for two bars, then moves: i – i – III – VII');
  const turn = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'edm', walk: 'turn',
  });
  const turnChorus = turn.form.find((section) => section.role === 'Chorus');
  assert([0, 1, 2].every((bar) => chordAtBar(turn, turnChorus.start, bar) === 0)
    && chordAtBar(turn, turnChorus.start, 3) === -1,
    'the turnaround holds three bars and lifts only into the bar line: i – i – i – VII');

  // The reduction keeps the palette's MOVEMENT, not its bar positions. The anthem
  // palette (VI–VII–i–i) moves in bars 1-2 — a positional mask kept its home bars
  // and threw the lift away, leaving a "walking" chorus of four tonic bars.
  const anthem = generateRearrangement(steps, {
    seed: 21, style: 'groove', sourceProfile: aminorProfile(), progression: 'anthem',
  });
  const anthemChorus = anthem.form.find((section) => section.role === 'Chorus');
  assert([0, 1, 2, 3].map((bar) => chordAtBar(anthem, anthemChorus.start, bar)).join(',')
    === '0,0,-2,-1',
    'a reduced anthem walk becomes the classic lift: i – i – VI – VII');
  for (const name of ['edm', 'house', 'anthem', 'dark']) {
    for (const amount of ['half', 'turn']) {
      const reduced = generateRearrangement(steps, {
        seed: 8, style: 'groove', sourceProfile: aminorProfile(), progression: name, walk: amount,
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
