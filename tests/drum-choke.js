/**
 * THE CHOKE, on the drum path.
 *
 * `monoGroup` names a voice-stealing group that spans a whole KIT: a new hit releases
 * whatever else in that group is still ringing, whichever lane made it. It is what a
 * closed hat does to an open one, and what a tiny console's single percussion channel
 * does to everything.
 *
 * `_playNoise` and the pooled Tone path have honoured it for a long time; `_playDrum`
 * did not, so a kit moved onto KLNG8 quietly stopped choking — no error, no silence, a
 * hat that simply rings through the next one. This is the test that would have caught
 * that, and it runs in node rather than a browser because none of what it asserts is
 * about sound: it is about which parameter automation gets written, and when.
 *
 * The stub context is the minimum `_playDrum` touches. It records every gain-parameter
 * call and every source stop, which is exactly the evidence a choke leaves behind.
 */
import { VoiceRack } from '../src/engine/voices.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);

// ---- the smallest Web Audio that _playDrum can be played through ------------
const calls = { targets: [], stops: [], holds: [] };
const param = () => ({
  value: 0,
  setValueAtTime() { return this; },
  linearRampToValueAtTime() { return this; },
  exponentialRampToValueAtTime() { return this; },
  cancelScheduledValues() { return this; },
  cancelAndHoldAtTime(at) { calls.holds.push(at); return this; },
  setTargetAtTime(v, at, tc) { calls.targets.push({ v, at, tc }); return this; },
});
const node = (extra = {}) => ({
  connect() {}, disconnect() {},
  start() {}, stop(at) { calls.stops.push(at); },
  ...extra,
});
const ctx = {
  currentTime: 0,
  sampleRate: 44100,
  createGain: () => node({ gain: param() }),
  createOscillator: () => node({ type: 'sine', frequency: param(), detune: param() }),
  createBufferSource: () => node({ buffer: null, loop: false }),
  createBiquadFilter: () => node({ type: 'bandpass', frequency: param(), Q: param(), gain: param() }),
  createWaveShaper: () => node({ curve: null }),
  createBuffer: (ch, len, rate) => ({
    duration: len / rate, sampleRate: rate, length: len,
    getChannelData: () => new Float32Array(len),
  }),
};
const noiseBuf = ctx.createBuffer(1, 22050, 44100);

const rack = () => new VoiceRack(ctx, noiseBuf, null, null);
const dest = node({ gain: param() });
// Straight at `_playDrum` rather than through `play`, which resolves a voice out of the
// catalogue by id: these presets are shaped for the test and have no catalogue entry,
// and routing through it would only be a test of the lookup.
const hit = (r, voice, time, monoGroup = null) => r._playDrum(
  voice, { time, gain: 1, dry: dest, wet: null, echo: false, monoGroup },
);

// A hat-shaped preset with every section on, so the choke has the full spread of nodes
// to catch — the metal cluster especially, which is six oscillators rather than one.
const OPEN_HAT = {
  kind: 'drum',
  noise: { type: 'highpass', freq: 4200, Q: 1, decay: 0.42, gain: 1 },
  metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 3000, decay: 0.4, gain: 0.5 },
  osc: { type: 'triangle', from: 190, to: 120, sweep: 0.05, decay: 0.05, gain: 0.2 },
};
const CLOSED_HAT = { kind: 'drum', noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.03, gain: 1 } };

// ---- 1. a second hit in the same group releases the first -------------------
{
  const r = rack();
  calls.targets = []; calls.stops = []; calls.holds = [];
  hit(r, OPEN_HAT, 0, 'hats|live');
  const stopsAfterFirst = calls.stops.length;
  hit(r, CLOSED_HAT, 1, 'hats|live');
  const choked = calls.targets.filter((t) => t.at === 1 && t.v === 0);
  if (!choked.length) {
    fail('a closed hat did not release the open hat sharing its group');
  } else if (!calls.holds.includes(1)) {
    fail('the choke ramped without holding the level it had reached first');
  } else if (calls.stops.filter((s) => s === 1.01).length === 0) {
    fail('the choke faded the open hat but left its sources running');
  } else {
    ok(`a hit chokes its group — ${choked.length} gain(s) ramped to zero, `
      + `${calls.stops.filter((s) => s === 1.01).length} source(s) stopped early`);
  }
  if (stopsAfterFirst === 0) fail('the first hit scheduled no source stops at all');
}

// ---- 2. every source of the choked voice is stopped, not just the loud one --
{
  const r = rack();
  calls.targets = []; calls.stops = []; calls.holds = [];
  hit(r, OPEN_HAT, 0, 'hats|live');
  const built = calls.stops.length; // one stop per source scheduled by the first hit
  hit(r, CLOSED_HAT, 1, 'hats|live');
  const early = calls.stops.filter((s) => s === 1.01).length;
  // osc + fm-less oscillator, the noise source, and six metal partials = 8 sources.
  if (early !== built) {
    fail(`the choke stopped ${early} of ${built} sources — a metal cluster left running `
      + 'is CPU spent on silence');
  } else ok(`the choke stops every source the hit built (${early}/${built})`);
}

// ---- 3. no group named, nothing is choked ----------------------------------
{
  const r = rack();
  hit(r, OPEN_HAT, 0, null);
  calls.targets = []; calls.stops = []; calls.holds = [];
  hit(r, CLOSED_HAT, 1, null);
  const choked = calls.targets.filter((t) => t.v === 0 && t.at === 1);
  if (choked.length) fail('a voice with no monoGroup choked something anyway');
  else ok('a voice with no monoGroup leaves the previous hit alone');
}

// ---- 4. different groups do not choke each other ---------------------------
{
  const r = rack();
  hit(r, OPEN_HAT, 0, 'hats|live');
  calls.targets = []; calls.stops = []; calls.holds = [];
  hit(r, CLOSED_HAT, 1, 'toms|live');
  const choked = calls.targets.filter((t) => t.v === 0 && t.at === 1);
  if (choked.length) fail('a hit in one group released a voice in a different group');
  else ok('groups are independent — a tom does not choke a hat');
}

// ---- 5. the group is shared with the pooled path ---------------------------
//
// The arcade kit is half KLNG8 and half pooled Tone voices in one group, so the drum
// path has to be able to release an entry it did not write. `_playNoise` and the pool
// register `{ slot, pool }` rather than `{ release }`; reading only its own shape would
// leave those ringing.
{
  const r = rack();
  let released = null;
  r._monoGroups.set('kit|live', {
    slot: { synth: { triggerRelease(at) { released = at; } } },
    pool: { gone: false },
  });
  hit(r, CLOSED_HAT, 2, 'kit|live');
  if (released !== 2) fail('a drum hit did not release the pooled voice sharing its group');
  else ok('the drum path releases a pooled Tone voice in the same group');
}


// ---- 6. the arrangement is where a choke is DECLARED ------------------------
//
// One PARTNER per track, for the whole song, written by the arrangement. Not a property
// of either preset, not a per-bar edit, and not a group: a hi-hat pair is what this is
// for, and the pairing is stored once rather than once from each side.
{
  const { draftOf, entryOf, setChokePartner, chokePartner, removeLanes } =
    await import('../tools/lib/arrangement-edit.js');
  const { BAR_MAPS } = await import('../src/data/arrangements.js');

  if (BAR_MAPS.includes('choke')) {
    fail('choke is a bar map — it is one setting per track, not per bar');
  } else ok('choke is a track setting, not a per-bar one');

  const bank = { bpm: 120, sections: [{}, {}], order: [0, 1, 0, 1] };
  const draft = draftOf(bank, null);

  // A song nobody has touched writes no entry at all — the claim tests/arrangement.js
  // rests on, and the one a new song-level field is most likely to break.
  if (entryOf(bank, draft) !== null) {
    fail('an untouched song gained an arrangement entry when choke was added');
  } else ok('an untouched song still writes no arrangement entry');

  const paired = setChokePartner(draft, 'ohats', 'hats');
  const entry = entryOf(bank, paired);
  // Stored once, keyed by whichever name sorts first — set from the `ohats` side here
  // precisely so the canonical form is what gets checked, not the caller's order.
  if (JSON.stringify(entry?.choke) !== JSON.stringify({ hats: 'ohats' })) {
    fail(`a pairing was not stored canonically (got ${JSON.stringify(entry?.choke)})`);
  } else ok('a pairing is stored once, keyed by the name that sorts first');

  // ...and reads back from BOTH sides, which is the whole point of storing it once.
  const reopened = draftOf(bank, entry);
  if (chokePartner(reopened, 'hats') !== 'ohats' || chokePartner(reopened, 'ohats') !== 'hats') {
    fail('a pairing did not read back as mutual');
  } else ok('and reads back as mutual from either side');

  // Choosing again is a complete answer: the old pairing goes, on both sides.
  const moved = entryOf(bank, setChokePartner(paired, 'hats', 'crash'));
  if (JSON.stringify(moved?.choke) !== JSON.stringify({ crash: 'hats' })) {
    fail(`re-picking left the old partner behind (got ${JSON.stringify(moved?.choke)})`);
  } else ok('picking a different partner frees the old one rather than stacking');

  // Nothing selected compacts back to no entry at all, not a leftover `{}`.
  if (entryOf(bank, setChokePartner(paired, 'hats', null)) !== null) {
    fail('clearing the pairing left an entry behind');
  } else ok('clearing it compacts back to no entry at all');

  // A deleted track must not leave a pair pointing at a name nobody can see — and it
  // sits on the VALUE side here, which a key-only sweep would miss.
  if (entryOf(bank, removeLanes(paired, ['ohats'])) !== null) {
    fail('deleting a track left a pairing pointing at it');
  } else ok('deleting a track on either side of a pair removes the pairing');
}

// ---- 7. and the arrangement outranks the kit -------------------------------
//
// A preset may still declare a `monoGroup` — that is how a kit built to have one
// percussion channel arrives that way without every song saying so. But when the song
// puts the LANE on a channel, that wins: it is the more specific statement, made about
// this song at these bars rather than about a sound everywhere it is ever used.
{
  const { VOICES } = await import('../src/data/voices.js');
  const kitVoice = Object.values(VOICES).find((v) => v.kind === 'drum' && v.monoGroup);
  const plainVoice = Object.values(VOICES).find((v) => v.kind === 'drum' && !v.monoGroup);
  if (!kitVoice || !plainVoice) {
    fail('no kit-choked and plain drum preset to compare — the catalogue changed shape');
  } else {
    const groupsAfter = (voiceId, opts) => {
      const r = rack();
      r.play('hats', voiceId, 440, {
        time: 0, dur: 1, gain: 1, dry: dest, wet: null, echo: false, ...opts,
      });
      return [...r._monoGroups.keys()];
    };
    const kitOnly = groupsAfter(kitVoice.id, {});
    const overridden = groupsAfter(kitVoice.id, { choke: 'hats+ohats' });
    const laneOnly = groupsAfter(plainVoice.id, { choke: 'crash+hats' });
    const none = groupsAfter(plainVoice.id, {});

    if (!kitOnly.includes(`kit:${kitVoice.monoGroup}|live`)) {
      fail(`a kit preset stopped declaring its own group (got ${kitOnly.join(', ') || 'none'})`);
    } else ok('a kit preset still brings its own choke group with it');

    if (!overridden.includes('lane:hats+ohats|live') || overridden.some((k) => k.startsWith('kit:'))) {
      fail(`the song's pairing did not replace the kit's group (got ${overridden.join(', ') || 'none'})`);
    } else ok("the arrangement's pairing wins over the preset's group — replacing it, not adding");

    if (!laneOnly.includes('lane:crash+hats|live')) {
      fail('a song pairing did not reach a preset that declares no group of its own');
    } else ok('a track with no kit group still takes the pairing the song gives it');

    if (none.length) fail(`a plain preset with no song choke joined a group anyway (${none.join(', ')})`);
    else ok('and nothing at all still means nothing at all');
  }
}

// ---- 8. KLNG-8 MONO is an opt-in per-lane voice setting --------------------
//
// Plain KLNG-8 drums remain POLY when they have no mode, but a voice editor's MONO
// setting gives the same native one-shot a lane-local choke group. This is deliberately
// separate from `monoGroup`: it must not make the same preset on another lane disappear.
{
  const { VOICES } = await import('../src/data/voices.js');
  const monoVoice = Object.values(VOICES).find((v) => v.kind === 'drum' && !v.monoGroup);
  if (!monoVoice) {
    fail('no plain KLNG-8 preset to exercise the per-voice MONO setting');
  } else {
    const oldMode = monoVoice.mode;
    try {
      monoVoice.mode = 'mono';
      const r = rack();
      calls.targets = []; calls.stops = []; calls.holds = [];
      r.play('ohats', monoVoice.id, 440, {
        time: 0, dur: 1, gain: 1, dry: dest, wet: null, echo: false,
      });
      r.play('ohats', monoVoice.id, 440, {
        time: 1, dur: 1, gain: 1, dry: dest, wet: null, echo: false,
      });
      const groups = [...r._monoGroups.keys()];
      const expected = `voice:ohats:${monoVoice.id}|live`;
      if (groups.length !== 1 || groups[0] !== expected) {
        fail(`MONO did not create a lane-local group (${groups.join(', ') || 'none'})`);
      } else if (!calls.targets.some((t) => t.at === 1 && t.v === 0)) {
        fail('KLNG-8 MONO did not fade the previous retrigger');
      } else ok('KLNG-8 MONO creates a lane-local retrigger group');
    } finally {
      if (oldMode === undefined) delete monoVoice.mode;
      else monoVoice.mode = oldMode;
    }
  }
}

console.log(failed ? `\nDRUM CHOKE: ${failed} FAILED` : '\nDRUM CHOKE: PASSED');
process.exit(failed ? 1 : 0);
