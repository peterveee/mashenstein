// The desk's on-screen keyboard: one note, one channel, on demand.
//
// Pressing a key has to sound the SELECTED CHANNEL — its voice, its note length, its
// gain, its tone-shaping — and the only thing on this codebase that knows all of that
// is the sequencer. So the keyboard does not synthesise anything: it hands the
// sequencer a bank with nothing in it but the note (`soloBank`) and asks for one step.
// That makes this file's job the bank, because everything downstream of it is the
// engine already under test elsewhere:
//
//   1. Nothing else sounds. A lane left in would play its own step 1 underneath the
//      note you pressed, and a preview that plays a chord you did not ask for is
//      worse than no preview.
//   2. The lane keeps everything that makes it sound like itself — voice, gains,
//      lengths, bpm. A preview at defaults is a preview of a different channel.
//   3. The step is in the shape that lane holds: a frequency, a chord's array, or a
//      boolean with the pitch moved into the lane's note key. A bare number on a
//      chord lane throws inside scheduleStep and takes the page with it.
//   4. Sections go. They are partial banks spread over the whole at schedule time,
//      so a section naming this lane would blank it again or re-voice it half way.
import { soloBank, deskBank, laneList, LANE_KEYS } from '../src/engine/lanes.js';
import { PERCUSSION_LANES, CHORD_LANES, seamFor } from '../src/data/voices.js';
import { resolveTrack } from '../src/data/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const A2 = 110;
const STEP = 1;
const bank = resolveTrack('plumber').bank;
const stepsOf = (b, key) => (Array.isArray(b[key]) ? b[key] : []);

// ---- nothing else sounds ---------------------------------------------------
const solo = soloBank(bank, 'bass', A2, STEP);
assert(solo.bass[STEP] === A2, 'the lane you asked for holds the note you pressed');
assert(solo.bass.filter((v) => v != null).length === 1, 'and holds exactly one');
assert(solo.bass.length === 32, 'a bank is 32 steps whatever is in it');
for (const key of LANE_KEYS) {
  if (key === 'bass') continue;
  assert(solo[key] == null, `${key} is blank while the bass is being played`);
}
assert(!solo.sections && !solo.order, 'the song form is dropped — a preview is at no point in it');
assert(bank.sections ? Array.isArray(bank.sections) : true, 'the source bank is not the one edited');
assert(soloBank(bank, 'bass', A2, STEP) !== bank && bank.bass !== solo.bass,
  'the song itself is untouched: the desk previews between two notes of it playing');

// ---- it still sounds like that channel -------------------------------------
const dialled = {
  ...bank,
  bpm: 132,
  bassVoice: 'roundMono',
  bassGain: 0.4,
  bassDur: 3.5,
  bassFilterQ: 2.2,
  leadGain: 0.9,
};
const kept = soloBank(dialled, 'bass', A2, STEP);
assert(kept.bpm === 132, 'the tempo comes with it — note lengths are in steps');
assert(kept.bassVoice === 'roundMono' && kept.bassGain === 0.4 && kept.bassDur === 3.5
  && kept.bassFilterQ === 2.2, 'every key that shapes the lane survives');
assert(kept.leadGain === 0.9, 'another lane’s settings are harmless — only its notes go');

// ---- the three step shapes -------------------------------------------------
for (const lane of CHORD_LANES) {
  const b = soloBank({ ...bank, [lane]: Array(32).fill(null) }, lane, A2, STEP);
  assert(Array.isArray(b[lane][STEP]) && b[lane][STEP][0] === A2,
    `${lane} holds a chord, so the note arrives as an array of one`);
}
for (const lane of PERCUSSION_LANES) {
  const b = soloBank(bank, lane, A2, STEP);
  assert(b[lane][STEP] === true, `${lane} holds a boolean — the bank says a hit happens`);
  assert(b[lane].filter((v) => v !== false).length === 1, `${lane} rests are false, not null`);
  assert(b[seamFor(lane).noteKey] === A2,
    `${lane} carries the pitch as its own note key, so a preset kit is tuned by the keyboard`);
}
assert(soloBank(bank, 'kick', A2, STEP).kick[0] === false,
  'a percussion rest is false — null there is a value the lane does not hold');

// A drum PAD asks for the drum, not for a drum tuned to whatever key was under the
// finger — so it passes no frequency at all and the lane's own note stands.
const tuned = { ...bank, kickNote: 61 };
const pad = soloBank(tuned, 'kick', null, STEP);
assert(pad.kick[STEP] === true, 'a pad with no pitch still strikes the drum');
assert(pad.kickNote === 61, 'and leaves the lane struck at its own note');

// ---- layers ----------------------------------------------------------------
// A layer is a lane like any other by the time the sequencer sees it, and the loop at
// the end of scheduleStep walks every one of them: a layer still holding its notes
// would sound underneath the note you pressed.
const layered = deskBank(bank, { layers: [{ key: 'bass2', from: 'bass' }] });
assert(laneList(layered).some((l) => l.key === 'bass2'), 'the layer is a lane before this runs');
const onLayer = soloBank(layered, 'bass2', A2, STEP);
assert(onLayer.bass2[STEP] === A2 && onLayer.bass == null,
  'playing a layer plays the layer, not the track it was copied from');
assert(onLayer.__layers.length === 1 && onLayer.__layers[0].key === 'bass2',
  'and the layer list is the one being played');
const onSource = soloBank(layered, 'bass', A2, STEP);
assert(onSource.bass[STEP] === A2 && onSource.bass2 == null && onSource.__layers.length === 0,
  'playing the track drops the layers — otherwise the copy doubles every note');

// ---- nothing to play -------------------------------------------------------
assert(soloBank(null, 'bass', A2) === null, 'no bank, no note');
assert(soloBank(bank, null, A2) === null, 'no channel, no note');
assert(soloBank(bank, '__master', A2).__layers.length === 0,
  'master is not a lane: nothing sounds rather than everything');

// A gesture lane — the glisses, sweeps, vox and shout have a hand-written body in the
// engine, which stands down the moment a preset is named on the lane's seam. Either way
// the preview is the same: a lane like any other, taking Hz at a step.
const gliss = soloBank({ ...bank, gliss: Array(32).fill(null) }, 'gliss', A2, STEP);
assert(gliss.gliss[STEP] === A2 && seamFor('gliss').voiceKey === 'glissVoice',
  'a gesture lane previews like every other — whichever of the two is going to play it');

// ---- the step it lands on --------------------------------------------------
// Not a multiple of four: the sequencer hands every fourth step to its beat
// listeners, and a key pressed on the desk is not a beat of the song.
assert(STEP % 4 !== 0, 'the preview step is off the beat, so visualisers do not flash to it');
assert(stepsOf(soloBank(bank, 'bass', A2, 7), 'bass')[7] === A2, 'any step works');

console.log(failed ? '\nPREVIEW: FAILED' : '\nPREVIEW: PASSED');
process.exit(failed ? 1 : 0);
