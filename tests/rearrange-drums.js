// SONG GROOVE, AND THE EDIT THAT WAITS FOR THE BAR LINE.
//
// Two claims, both about a Rearrange recipe that is already playing.
//
// The first is that `drums: "song"` reads the song's OWN percussion at the OUTPUT
// position while everything above it stays chopped to the mapped source. That is the
// difference between an arrangement that sounds played and one that sounds assembled:
// the collage moves, the groove does not. It needs a second bar resolution — the
// output bar has its own section, its own mute mask and its own half — and the whole
// cost argument rests on that resolution happening once a BAR rather than once a tick,
// so the memoisation is asserted here as behaviour, not left as an implementation note.
//
// The second is that installing a new recipe mid-playback waits for the next output
// bar line. The bar being heard has to finish as the bar it was promised to be.
//
// Browserless: every claim is about resolution and hand-off arithmetic, none of which
// needs an AudioContext to be true.
import { Audio } from '../src/engine/audio.js';
import { barPlan, sequenceValue } from '../src/engine/lanes.js';
import {
  generateRearrangement, rearrangementPosition, rearrangementDrumMode,
  validateRearrangement, REARRANGE_DRUM_MODES, REARRANGE_DRUM_DEFAULT,
} from '../tools/lib/rearrange.js';

let failed = false;
const assert = (ok, message) => {
  if (ok) console.log(`ok: ${message}`);
  else { console.error(`FAIL: ${message}`); failed = true; }
};

/** A percussion lane: 32 booleans, one two-bar pattern. */
const hits = (...slots) => {
  const on = new Set(slots);
  return Array.from({ length: 32 }, (_, i) => on.has(i));
};
/** A melodic lane: 32 slots carrying their own index as a "pitch", so a read is traceable. */
const marks = () => Array.from({ length: 32 }, (_, i) => 100 + i);

// ---- the recipe enum ---------------------------------------------------------

assert(REARRANGE_DRUM_MODES.includes('song') && REARRANGE_DRUM_DEFAULT === 'song',
  'song groove is a supported drum mode and the default for new recipes');
{
  const base = generateRearrangement(128, { seed: 5 });
  const saved = validateRearrangement({ ...base, source: { steps: 128 }, drums: 'song' }, 128);
  assert(rearrangementDrumMode(saved) === 'song' && saved.drums === 'song',
    'a song-groove recipe round-trips through the validator');
  const legacy = validateRearrangement({ ...base, source: { steps: 128 } }, 128);
  assert(rearrangementDrumMode(legacy) === 'original' && legacy.drums === undefined,
    'a saved recipe with no drum field still means the chopped-source behaviour');
  let rejected = false;
  try { validateRearrangement({ ...base, source: { steps: 128 }, drums: 'groove' }, 128); }
  catch { rejected = true; }
  assert(rejected, 'an unsupported drum mode is still rejected');
}

// ---- the output bar a song-groove read resolves against ----------------------

// Four bars, two sections. Section 0 writes a kick on every beat; section 1 moves it
// onto the offbeats, so which section the OUTPUT bar names is audible in the answer.
const sectioned = {
  bpm: 120,
  kick: hits(0, 4, 8, 12, 16, 20, 24, 28),
  bass: marks(),
  sections: [
    {},
    { kick: hits(2, 6, 10, 14, 18, 22, 26, 30) },
  ],
  order: [0, 1],
};

{
  Audio.bank = sectioned;
  Audio._rearrangeOutputBar = null;
  const plan = barPlan(sectioned);
  assert(plan.length === 4, 'the fixture is four bars of two two-bar sections');

  const first = Audio._rearrangeOutputBank(plan[0]);
  const third = Audio._rearrangeOutputBank(plan[2]);
  assert(first.kick[0] === true && first.kick[2] === false,
    'an output bar in section 0 resolves to section 0 percussion');
  assert(third.kick[0] === false && third.kick[2] === true,
    'an output bar in section 1 resolves to that section instead');

  // Memoisation, as behaviour: the same bar object hands back the very same resolved
  // bank, and a different bar does not. This is what keeps one merge a bar from
  // becoming sixteen, on a scheduler whose lane resolution was measured at 21:1
  // against note construction.
  assert(Audio._rearrangeOutputBank(plan[2]) === third,
    'resolving the same output bar twice returns the memoised bank');
  assert(Audio._rearrangeOutputBank(plan[0]) !== third,
    'a different output bar resolves to a different bank');
  const swapped = { ...sectioned };
  Audio.bank = swapped;
  assert(Audio._rearrangeOutputBank(barPlan(swapped)[2]) !== third,
    'a new bank invalidates the memoised output bar');
  Audio.bank = sectioned;
}

// ---- the mute mask and the half ---------------------------------------------

{
  const muted = {
    bpm: 120,
    kick: hits(0, 4, 8, 12, 16, 20, 24, 28),
    sections: [{}],
    // A legacy numeric order entry is a two-bar block, so this is four bars: the
    // second block arranges the kick out of both of its bars.
    order: [0, { sec: 0, off: ['kick'] }],
  };
  Audio.bank = muted;
  Audio._rearrangeOutputBar = null;
  const plan = barPlan(muted);
  assert(plan.length === 4 && !plan[0].off && plan[2].off?.includes('kick'),
    'the fixture arranges the kick out of its second block');
  assert(Audio._rearrangeOutputBank(plan[0]).kick !== null,
    'an unmuted output bar keeps its percussion lane');
  assert(Audio._rearrangeOutputBank(plan[2]).kick === null,
    'an output bar that arranges the kick out reads as a lane that does not play');

  // The half decides which sixteen of a section's thirty-two slots the bar is.
  Audio.step = 0;
  assert(Audio._rearrangeOutputSlot(plan[0], 16) === 0, 'the first bar reads the first half');
  Audio.step = 16;
  assert(Audio._rearrangeOutputSlot(plan[1], 16) === 16,
    'the second bar of a section reads slots 16-31, not 0-15');
  Audio.step = 20;
  assert(Audio._rearrangeOutputSlot(plan[1], 16) === 20, 'and keeps its offset within the bar');
  Audio.step = 4;
  assert(Audio._rearrangeOutputSlot(plan[0], 32) === 8,
    'a promoted transport doubles the sixteenth into the 32-slot address space');
  Audio.step = 4.5;
  assert(Audio._rearrangeOutputSlot(plan[0], 32) === 9,
    'and a half tick lands on the odd slot between them');
}

// ---- the whole claim: the collage moves, the groove does not ------------------

{
  Audio.bank = sectioned;
  Audio._rearrangeOutputBar = null;
  const plan = barPlan(sectioned);
  const steps = plan.length * 16;
  // A deliberately scrambled recipe: the output plays the song's bars back to front.
  const recipe = {
    kind: 'mashenstein-rearrangement',
    version: 1,
    source: { steps },
    seed: 1,
    grid: 'sixteenth',
    drums: 'song',
    operations: [
      { from: 48, length: 16, repeats: 1, transpose: 0 },
      { from: 32, length: 16, repeats: 1, transpose: 0 },
      { from: 16, length: 16, repeats: 1, transpose: 0 },
      { from: 0, length: 16, repeats: 1, transpose: 0 },
    ],
  };
  Audio.setRearrangement(recipe);

  let drumsFollowedOutput = true;
  let melodyFollowedSource = true;
  let everDisagreed = false;
  for (let step = 0; step < steps; step++) {
    Audio.step = step;
    const mapped = rearrangementPosition(recipe, step);

    // What the scheduler's song-groove branch composes, from the real methods.
    const outputBar = plan[Math.floor(step / 16) % plan.length];
    const outputBank = Audio._rearrangeOutputBank(outputBar);
    const heardDrum = sequenceValue(outputBank, 'kick',
      Audio._rearrangeOutputSlot(outputBar, 16), 16);

    // What the song itself plays at this position with no recipe at all.
    const straightBar = plan[Math.floor(step / 16) % plan.length];
    const straightDrum = sequenceValue(Audio._rearrangeOutputBank(straightBar), 'kick',
      Audio._rearrangeOutputSlot(straightBar, 16), 16);
    if (heardDrum !== straightDrum) drumsFollowedOutput = false;

    // And what the chopped read would have said, so the test proves the two differ.
    const sourceBar = plan[Math.floor(mapped.sourceStep / 16) % plan.length];
    Audio.step = mapped.sourceStep;
    const choppedDrum = sequenceValue(Audio._rearrangeOutputBank(sourceBar),
      'kick', Audio._rearrangeOutputSlot(sourceBar, 16), 16);
    Audio.step = step;
    if (choppedDrum !== heardDrum) everDisagreed = true;

    // The melody is still chopped: its read is the mapped source, and this fixture
    // writes each slot's own index, so the value names where it came from.
    const heardNote = sequenceValue(Audio._rearrangeOutputBank(sourceBar), 'bass',
      sourceBar.half * 16 + (mapped.sourceStep % 16), 16);
    if (heardNote !== 100 + (sourceBar.half * 16 + (mapped.sourceStep % 16))) {
      melodyFollowedSource = false;
    }
  }
  assert(drumsFollowedOutput,
    'song-groove percussion plays exactly what the song writes at the output position');
  assert(everDisagreed,
    'and that is genuinely different from the chopped source read this recipe would give');
  assert(melodyFollowedSource, 'while pitched lanes stay mapped to their source slice');
  Audio.setRearrangement(null);
}

// ---- why the scheduler asks a predicate and not `bar === outputBar` ----------

{
  // `barPlan` memoises, so a repeated section hands back the SAME bar object for every
  // position that plays it. A source position and an output position can therefore
  // share one bar while pointing at different sixteenths of it — which is exactly the
  // case where deciding "is this lane on the output clock?" by object identity would
  // send a melodic lane's note-length lookup to the drums' slot.
  Audio.bank = sectioned;
  const plan = barPlan(sectioned);
  const recipe = {
    kind: 'mashenstein-rearrangement',
    version: 1,
    source: { steps: plan.length * 16 },
    seed: 1,
    grid: 'sixteenth',
    drums: 'song',
    // Output step 5 maps to source step 3: both inside bar 0, two sixteenths apart.
    operations: [
      { from: 14, length: 16, repeats: 1, transpose: 0 },
      { from: 0, length: plan.length * 16 - 16, repeats: 1, transpose: 0 },
    ],
  };
  let collided = false;
  for (let step = 0; step < plan.length * 16; step++) {
    const mapped = rearrangementPosition(recipe, step);
    const sourceBar = plan[Math.floor(mapped.sourceStep / 16) % plan.length];
    const outputBar = plan[Math.floor(step / 16) % plan.length];
    Audio.step = step;
    const sOutput = Audio._rearrangeOutputSlot(outputBar, 16);
    const sSource = sourceBar.half * 16 + (mapped.sourceStep % 16);
    if (sourceBar === outputBar && sSource !== sOutput) collided = true;
  }
  assert(collided,
    'a source bar and an output bar really can be one object at two different slots');
  Audio.setRearrangement(null);
}

// ---- installing an edit at the next bar line ---------------------------------

const recipeOf = (steps, from) => ({
  kind: 'mashenstein-rearrangement',
  version: 1,
  source: { steps },
  seed: from,
  grid: 'sixteenth',
  operations: [{ from: 0, length: steps, repeats: 1, transpose: 0 }],
});

{
  Audio.bank = sectioned;
  Audio.timer = Audio.timer || 'test-sequencer';
  const first = recipeOf(64, 0);
  const second = recipeOf(64, 1);
  const third = recipeOf(64, 2);

  Audio.setRearrangement(first);
  Audio.step = 20;
  assert(Audio.queueRearrangement(second) === 'queued',
    'an edit made mid-bar while playing is queued, not installed');
  assert(Audio.rearrangement === first,
    'the recipe being heard is untouched while the edit waits');
  assert(Audio.pendingRearrangement.boundary === 32,
    'it waits for the next output bar line, not the next step');

  Audio.step = 24;
  assert(Audio.applyPendingRearrangement() === false && Audio.rearrangement === first,
    'the rest of the current bar plays the recipe it started under');

  // Several edits before the boundary collapse to the latest cumulative draft.
  assert(Audio.queueRearrangement(third) === 'queued'
    && Audio.pendingRearrangement.recipe === third,
    'queueing again replaces what is waiting rather than stacking behind it');

  let announced = null;
  const off = Audio.onRearrangementInstalled((recipe, at) => { announced = { recipe, at }; });
  Audio.step = 32;
  assert(Audio.applyPendingRearrangement() === true && Audio.rearrangement === third,
    'the queued recipe installs when the transport reaches the bar line');
  assert(announced?.recipe === third && announced.at === 32,
    'and the desk is told, with the output step it actually landed on');
  assert(Audio.pendingRearrangement === null, 'nothing is left waiting afterwards');
  off();
  Audio.step = 48;
  Audio.queueRearrangement(second);
  assert(Audio.applyPendingRearrangement() === true && announced.recipe === third,
    'a removed listener stops hearing about installs');
}

{
  // Nothing is sounding: there is no bar to protect, so the edit lands at once.
  Audio.setRearrangement(recipeOf(64, 0));
  Audio.bank = null;
  Audio.step = 20;
  const next = recipeOf(64, 9);
  assert(Audio.queueRearrangement(next) === 'installed' && Audio.rearrangement === next,
    'with no bank playing, an edit installs immediately');
  Audio.bank = sectioned;

  // A recipe for a different song length cannot be swapped mid-flight: the output
  // wrap is computed from it.
  Audio.setRearrangement(recipeOf(64, 0));
  Audio.step = 20;
  const longer = recipeOf(128, 3);
  assert(Audio.queueRearrangement(longer) === 'installed' && Audio.rearrangement === longer,
    'a recipe of a different length installs immediately instead of queueing');

  // Clearing the audition takes any waiting edit with it.
  Audio.setRearrangement(recipeOf(64, 0));
  Audio.step = 20;
  Audio.queueRearrangement(recipeOf(64, 4));
  Audio.setRearrangement(null);
  assert(Audio.pendingRearrangement === null && Audio.rearrangement === null,
    'returning to the song drops a queued edit with the recipe');
}

{
  // Stopping parks the transport and playing re-seeks it, so a boundary from before
  // either means nothing. setBank takes the draft rather than leaving it stranded.
  Audio.bank = sectioned;
  Audio.sourceBank = sectioned;
  const heard = recipeOf(64, 0);
  const draft = recipeOf(64, 7);
  Audio.setRearrangement(heard);
  Audio.step = 20;
  Audio.queueRearrangement(draft);
  assert(Audio.pendingRearrangement !== null, 'the edit is waiting before the transport moves');
  Audio.setBank(null);
  assert(Audio.rearrangement === draft && Audio.pendingRearrangement === null,
    'pausing installs the waiting edit instead of stranding it against a stale boundary');
  Audio.setRearrangement(null);
}

console.log(failed ? 'REARRANGE DRUMS: FAILED' : 'REARRANGE DRUMS: PASSED');
process.exit(failed ? 1 : 0);
