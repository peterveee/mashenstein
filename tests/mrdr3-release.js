/*
 * A KEY THAT COMES UP ENDS THE NOTE.
 *
 * A held note is the one kind nothing can know the length of, so it is booked for
 * HOLD_SECONDS — thirty of them — and ended by a note-off when the finger lifts. Every
 * other note carries its own length and never needs this, which is why no render, no
 * bounce and no baseline can see the failure this suite exists for: MRDR-3's note-off
 * marked the group `released` and NOTHING ELSE READ THAT FLAG except the voice stealer.
 * The envelopes are drawn once at note-on across the whole booked length, so the note went
 * on sounding at full level until its thirty seconds ran out or another note stole its
 * group. Measured before the fix, at two and a half seconds after the key came up, all
 * eighty presets in the catalogue were still at their sustain.
 *
 * The fix is that a note-off DRAWS THE ENVELOPES AGAIN for the length the note turned out
 * to have — Mrdr3Layer.release — so this suite asks the three things that follow from
 * choosing a rewrite over a cancel-and-ramp:
 *
 *   · the note stops, and stops as a RELEASE rather than as a step;
 *   · nothing already rendered moves, because the rewritten attack and decay are drawn
 *     from the note's own start and are the same numbers they were;
 *   · a second note-off cannot restart the fall.
 *
 * And the same claim across the catalogue, because a preset with a long release, a slow
 * pad attack or a layer with its own `len` fraction reaches this arithmetic differently.
 *
 * Browserless: the core takes its rate as an argument and is handed its frame, so this is
 * the same string the worklet runs.
 */
import { VOICES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt, Mrdr3Core } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { MRDR3_NATIVE } from '../src/engine/mrdr3/identity.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const SR = 44100;
const TABLES = mrdr3Tables();
const NOISE = mrdr3NoiseSet(SR, mrdr3Colours(VOICES));

const rms = (data, from, to) => {
  let sum = 0;
  const a = Math.max(0, Math.floor(from));
  const b = Math.min(data.length, Math.floor(to));
  for (let i = a; i < b; i++) sum += data[i] * data[i];
  return b > a ? Math.sqrt(sum / (b - a)) : 0;
};

/** The largest jump between neighbouring samples — how a step is told from a fade. */
const biggestStep = (data, from, to) => {
  let worst = 0;
  const a = Math.max(1, Math.floor(from));
  const b = Math.min(data.length, Math.floor(to));
  for (let i = a; i < b; i++) {
    const d = Math.abs(data[i] - data[i - 1]);
    if (d > worst) worst = d;
  }
  return worst;
};

// A HELD note as the rack books one: thirty seconds of nominal length, ended by a lifted
// finger. See `_playMrdr3Aw` — `durSeconds: hold ? HOLD_SECONDS : ...`.
const HOLD = 30;
const noteOn = (atSeconds, hz = 220, eventId = 1, seconds = HOLD) => ({
  type: 'noteOn', frame: frameAt(atSeconds, SR), eventId,
  hz: Array.isArray(hz) ? hz : [hz], durFrames: frameAt(seconds, SR), velocity: 0.9,
});
const noteOff = (atSeconds, eventId = 1) => ({
  type: 'noteOff', frame: frameAt(atSeconds, SR), eventId,
});

const render = (events, patch, seconds = 3) => renderMrdr3({
  events, seconds, sampleRate: SR, channels: 2, patch, tables: TABLES, noise: NOISE,
});

const patchOf = (name) => compileMrdr3(VOICES[name]).patch;
const SAW = patchOf('initSaw');

// ---- the note stops at all --------------------------------------------------------
const held = render([noteOn(0.05), noteOff(0.30)], SAW);
const stuck = render([noteOn(0.05)], SAW);
assert(rms(held.channels[0], 0.1 * SR, 0.25 * SR) > 0.05,
  'the note sounds while the key is down — the baseline the rest of this is measured against');
assert(rms(stuck.channels[0], 2.5 * SR, 2.9 * SR) > 0.05,
  'and with NO note-off it is still sounding at two and a half seconds: a held note really'
  + ' is booked for thirty, so this suite is about the note-off and nothing else');
assert(rms(held.channels[0], 1.0 * SR, 2.9 * SR) === 0,
  'the key comes up and the note ENDS — not thirty seconds later, and not when the next'
  + ' note steals its group');

// ---- and it ends as a release, not as a cut ----------------------------------------
//
// A cancel that pins the value to zero is silence too, and it is a click. The release
// travels, so the largest sample-to-sample jump across the key-up has to stay in the
// range the note itself was already moving in.
const jump = biggestStep(held.channels[0], 0.29 * SR, 0.40 * SR);
const running = biggestStep(held.channels[0], 0.15 * SR, 0.26 * SR);
assert(jump <= running * 1.05,
  `the release fades rather than steps (${jump.toFixed(4)} across the key-up against`
  + ` ${running.toFixed(4)} inside the note)`);

// ---- nothing already rendered moves ------------------------------------------------
//
// The whole reason a note-off REDRAWS the envelope instead of cancelling it: attack and
// decay are drawn from the note's own start, so every event before the release is the
// number it already was. Sample-for-sample, not to a tolerance.
let moved = -1;
const a = held.channels[0], b = stuck.channels[0];
for (let i = 0; i < frameAt(0.30, SR); i++) {
  if (a[i] !== b[i]) { moved = i; break; }
}
assert(moved === -1,
  'every sample before the key-up is bit-identical to the same note played on: a release'
  + ` cannot rewrite the attack it came out of (first difference at ${moved})`);

// ---- a second note-off does not restart the fall ------------------------------------
const twice = render([noteOn(0.05), noteOff(0.30), noteOff(0.34)], SAW);
let differs = -1;
for (let i = 0; i < twice.channels[0].length; i++) {
  if (twice.channels[0][i] !== a[i]) { differs = i; break; }
}
assert(differs === -1,
  'a second note-off for the same event id changes nothing — two fingers on one key, or a'
  + ` stop landing behind a note-off, must not re-release a releasing note (${differs})`);

// ---- a STALE note-off still releases, and still fades --------------------------------
//
// Note-offs are never dropped however late (see tests/mrdr3-stale.js), so one can arrive
// naming a frame that has already gone by — a lane nothing was pulling, catching up. The
// release is drawn at the CURRENT sample rather than at the frame the note-off names,
// because a release that finished in the past is not a fade, it is a step to silence.
//
// The gap is expressed the way the lane experiences it: the core is driven by hand and
// simply not asked for the frames in between.
const GAP_AT = frameAt(0.20, SR);
const RESUME = frameAt(1.00, SR);
const late = [new Float32Array(frameAt(3, SR)), new Float32Array(frameAt(3, SR))];
const core = new Mrdr3Core({ rate: SR, maxGroups: 12, maxTones: 4 });
core.installTables(TABLES);
core.installNoise(NOISE);
core.installPatch(SAW);
core.scheduleAll([noteOn(0.05), noteOff(0.30)]);
for (let f = 0; f < GAP_AT; f += 128) core.process(late, f, Math.min(128, GAP_AT - f), f);
for (let f = RESUME; f < late[0].length; f += 128) {
  core.process(late, f, Math.min(128, late[0].length - f), f);
}
assert(rms(late[0], RESUME, RESUME + 0.005 * SR) > 0.05,
  'the note is still at its level when the lane comes back — the note-off could not be'
  + ' applied while nothing was pulling the node, so nothing had ended it');
assert(rms(late[0], 2.0 * SR, 2.9 * SR) === 0,
  'and a note-off stale by three quarters of a second still ends it');
assert(biggestStep(late[0], RESUME + 1, RESUME + 0.05 * SR)
  <= biggestStep(late[0], 0.15 * SR, 0.19 * SR) * 1.05,
  'fading from where the note actually was rather than stepping to silence: the release is'
  + ' drawn at the frame the lane came back, not at the frame the note-off names');

// ---- MONO: the note-on that chokes the last one is a release too ---------------------
//
// The choke used to set the same flag the note-off did, so it did the same nothing: a
// mono lane held two notes at once. What it must do is release the note still ringing.
const monoName = Object.keys(VOICES).find((k) => VOICES[k].synth === MRDR3_NATIVE
  && (VOICES[k].mode === 'mono' || VOICES[k].mode === 'legato'));
if (monoName) {
  const monoPatch = patchOf(monoName);
  const choked = render([noteOn(0.05, 220, 1), noteOn(0.40, 330, 2), noteOff(0.60, 2)],
    monoPatch);
  assert(rms(choked.channels[0], 1.5 * SR, 2.9 * SR) === 0,
    `${monoName}: a mono choke releases the note it replaced, so lifting the SECOND key`
    + ' leaves nothing sounding');
} else {
  ok('no MONO preset in the catalogue to choke — nothing to check');
}

// ---- and every preset in the catalogue ----------------------------------------------
//
// One preset proving it is not the claim. A long release, a slow pad attack and a layer
// with its own `len` fraction all reach this arithmetic differently, and a `through`
// layer takes the gate writer rather than the envelope one.
const names = Object.keys(VOICES).filter((k) => VOICES[k].synth === MRDR3_NATIVE);
const ringing = [];
for (const name of names) {
  const patch = patchOf(name);
  if (!patch) continue;
  const out = render([noteOn(0.05), noteOff(0.30)], patch, 4);
  if (rms(out.channels[0], 3.6 * SR, 3.9 * SR) > 1e-6) ringing.push(name);
}
assert(names.length > 50, `the sweep covers the catalogue (${names.length} presets)`);
assert(ringing.length === 0,
  'every MRDR-3 preset is silent well after the key comes up'
  + (ringing.length ? `: still ringing — ${ringing.join(', ')}` : ''));

console.log(failed ? `\nMRDR-3 RELEASE: ${failed} FAILED` : '\nMRDR-3 RELEASE: PASSED');
process.exit(failed ? 1 : 0);
