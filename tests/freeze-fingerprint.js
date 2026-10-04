// WHAT A FROZEN TRACK ACTUALLY DEPENDS ON.
//
// A freeze is thrown away when its fingerprint stops matching the song, and each one
// costs minutes to render again. The old fingerprint hashed the whole arrangement — and
// on a desk song the arrangement IS the notes, 54 sections and 191 KB of them on the
// stress song. So adding one note to any track invalidated every freeze in the song,
// including tracks and bars nobody had been near.
//
// The argument for narrowing it is in `rawFreezeMix`: the render is handed a mix that
// mutes every lane but the one being frozen. No other lane's notes can reach the
// samples, so no other lane's notes belong in the hash.
//
// These tests are the two halves of that claim, and the second half is the one that
// matters: being wrong about what a freeze depends on means stale audio playing
// underneath a song that has moved. Anything not clearly independent stays IN.
//
// Source-driven, like tests/mixer-layout.js: `freezeFingerprint` lives inside an
// 18,000-line browser entry with no export, so the projection helpers are exercised
// through a small re-implementation-free harness — the real function text is evaluated
// with the handful of collaborators it names.
import { readFileSync } from 'node:fs';
import { seamFor } from '../src/data/voices.js';
import {
  autoPortamentoOn, AUTO_PORTAMENTO_PLANNER_VERSION,
} from '../src/engine/auto-portamento.js';

const entry = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');

let failed = false;
const assert = (ok, message) => {
  if (ok) console.log(`ok: ${message}`);
  else { console.error(`FAIL: ${message}`); failed = true; }
};

// Lift the four functions under test out of the entry, with nothing else from it.
const slice = (start, end) => {
  const from = entry.indexOf(start);
  const to = entry.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`could not find ${start}`);
  return entry.slice(from, to);
};
const source = slice('function freezeNoteSources', '\nfunction unfreezeLane');
assert(/function freezeFingerprint/.test(source) && /function laneOnlyBlock/.test(source),
  'the fingerprint and its projection helpers were lifted out of the entry');

// The collaborators the lifted code names, and only those. The last two are Auto
// Portamento's: whether a lane's setting is on, and the planner version that rides in the
// fingerprint while it is — passed in by value so a test can stand a NEWER planner up beside
// the real one and ask whether a freeze made under the old one would still match.
let MIX = {};
let ARR = null;
const harness = new Function('seamFor', 'mixFor', 'arrFor', 'autoPortamentoOn',
  'AUTO_PORTAMENTO_PLANNER_VERSION', `
  ${source}
  return { freezeFingerprint, freezeNoteSources, laneOnlyBlock };
`);
const build = (plannerVersion) => harness(
  seamFor, () => MIX, () => ARR, autoPortamentoOn, plannerVersion,
);
const { freezeFingerprint, freezeNoteSources } = build(AUTO_PORTAMENTO_PLANNER_VERSION);

const song = () => ({
  bpm: 120,
  resolution: 32,
  order: [{ s: 0 }, { s: 1, transpose: -2, gain: { bass: -3 } }],
  sections: [
    { bass: [110, null, 110, null], bassLen: [1, null, 1, null],
      chords: [220, null, null, null], lead: [440, null, 440, null] },
    { bass: [110, 110, null, null], chords: [330, null, null, null] },
  ],
});

const setup = () => {
  ARR = song();
  MIX = {
    layers: [{ key: 'chords2', from: 'chords', independent: true },
      { key: 'lead2', from: 'lead' }],
    off: [],
    voice: { bassVoice: 'stRoundMono', leadVoice: 'initSquare', chords2Voice: 'harpPluck' },
    voiceParams: { bassVoice: { cutoff: 800 }, leadVoice: { cutoff: 2000 } },
    lanes: { bass: { noteFx: null }, chords: { noteFx: { arp: { enabled: true, rate: 1 } } } },
  };
};

const fingerprintOf = (lane) => freezeFingerprint('song', lane);
/** Change the song with `mutate`, and report whether `lane`'s freeze survived it. */
const survives = (lane, mutate) => {
  setup();
  const before = fingerprintOf(lane);
  mutate();
  return fingerprintOf(lane) === before;
};

// ---- what must NOT invalidate a frozen lane ---------------------------------

assert(survives('bass', () => { ARR.sections[0].lead[1] = 660; }),
  'adding a note to another track does not invalidate a frozen bass');
assert(survives('bass', () => { ARR.sections[1].chords = [440, 440, 440, 440]; }),
  'rewriting another track entirely does not invalidate it either');
assert(survives('bass', () => { MIX.voice.leadVoice = 'initSaw'; }),
  'changing another track’s VOICE does not invalidate it — that lane is muted in the render');
assert(survives('bass', () => { MIX.voiceParams.leadVoice = { cutoff: 400 }; }),
  'nor changing another track’s voice parameters');
assert(survives('bass', () => { MIX.lanes.chords.noteFx = { arp: { enabled: false } }; }),
  'nor changing another track’s Note FX');

// ---- what MUST invalidate it ------------------------------------------------

assert(!survives('bass', () => { ARR.sections[0].bass[1] = 220; }),
  'a note added to the frozen track itself invalidates it');
assert(!survives('bass', () => { ARR.sections[0].bassLen[0] = 4; }),
  'so does lengthening one of its notes');
assert(!survives('bass', () => { MIX.voice.bassVoice = 'initSaw'; }),
  'so does changing its voice');
assert(!survives('bass', () => { MIX.voiceParams.bassVoice = { cutoff: 200 }; }),
  'so does changing that voice’s parameters');
assert(!survives('bass', () => { MIX.lanes.bass = { noteFx: { arp: { enabled: true, rate: 1 } } }; }),
  'so does putting Note FX on it');
assert(!survives('bass', () => { ARR.bpm = 132; }),
  'so does the tempo — every note moves');
assert(!survives('bass', () => { ARR.resolution = 16; }),
  'so does the resolution');
assert(!survives('bass', () => { ARR.order.push({ s: 0 }); }),
  'so does the song getting longer');
assert(!survives('bass', () => { ARR.order[1].transpose = -4; }),
  'so does a bar transpose that reaches every lane');
assert(!survives('bass', () => { ARR.order[1].gain.bass = -6; }),
  'so does a bar gain aimed at this lane');
assert(!survives('bass', () => { ARR.order[0].off = ['bass']; }),
  'so does a bar that arranges this lane out');
assert(!survives('bass', () => { MIX.off = ['bass']; }),
  'so does deleting the lane');
// Conservative on purpose: a bar gain aimed at ANOTHER lane leaves the order object
// changed, and the order is small, edited rarely, and carries the maps that decide what
// this lane hears. Being wrong here plays stale audio; being cautious costs one render.
assert(!survives('bass', () => { ARR.order[1].gain.lead = -6; }),
  'and so does a bar gain on another lane — the order is kept whole, deliberately');

// ---- layers: whose notes is this lane actually playing? ---------------------

{
  setup();
  const linked = freezeNoteSources(MIX, 'lead2');
  assert(linked.has('lead2') && linked.has('lead'),
    'a legacy LINKED layer reads its source’s notes, so both count');
  const independent = freezeNoteSources(MIX, 'chords2');
  assert(independent.has('chords2') && !independent.has('chords'),
    'an INDEPENDENT layer owns its own notes, so its source does not');
}

assert(!survives('lead2', () => { ARR.sections[0].lead[1] = 660; }),
  'editing the source of a linked layer invalidates the layer’s freeze');

// ---- automation: cuts are baked, the level line is not ------------------------
//
// A cut is routing in front of the strip, so it is in the frozen samples like a mute;
// the level line is the strip's own and is applied live on top of them. So a cut on the
// frozen lane invalidates it, and a fade — on it or anywhere — does not.
assert(!survives('bass', () => { ARR.automation = { bass: { cuts: [[1, 8]] } }; }),
  'a cut on the frozen lane invalidates it — the cut is in the samples');
assert(survives('bass', () => { ARR.automation = { bass: { points: [[1, 0, 0], [2, 0, null]] } }; }),
  'a fade on the frozen lane does not — it is played live on the strip, over the samples');
assert(survives('bass', () => { ARR.automation = { lead: { points: [[1, 0, null]], cuts: [[1, 4]] } }; }),
  'and another track\u2019s fades and cuts are nothing to do with this freeze');
assert(survives('chords2', () => { ARR.sections[0].chords[1] = 660; }),
  'editing the source of an INDEPENDENT layer does not — its notes were snapshotted');

// ---- Auto Portamento ----------------------------------------------------------
//
// A slide is a decision about WHICH of a lane's connections sound, so the lane's setting
// belongs in its fingerprint like any other Note FX — the whole object is hashed, so
// Amount, Glide and the switch are already in — and the PLANNER's version rides beside it
// while the treatment is on. Those two together are what stop a freeze made under one
// policy from playing underneath another: the same settings pick different connections
// once the planner's ranking moves, and nothing in the song would have changed.
{
  const on = () => ({ enabled: true, amount: 35, glide: 40, version: 1 });
  const withSlide = () => { setup(); MIX.lanes.lead = { noteFx: { portamento: on() } }; };
  const keepsFreeze = (lane, mutate) => {
    withSlide();
    const before = fingerprintOf(lane);
    mutate();
    return fingerprintOf(lane) === before;
  };
  const keysOf = (lane) => Object.keys(JSON.parse(fingerprintOf(lane)));

  assert(!survives('bass', () => { MIX.lanes.bass = { noteFx: { portamento: on() } }; }),
    'switching Auto Portamento on for the frozen lane invalidates it — its notes now slide');
  assert(!keepsFreeze('lead', () => { MIX.lanes.lead.noteFx.portamento.amount = 60; }),
    'so does moving its Amount — a different set of connections slides');
  assert(!keepsFreeze('lead', () => { MIX.lanes.lead.noteFx.portamento.glide = 80; }),
    'and its Glide — every slide is a different length');
  assert(!keepsFreeze('lead', () => { MIX.lanes.lead.noteFx.portamento.enabled = false; }),
    'and switching it off again — the slides go');
  assert(keepsFreeze('bass', () => { MIX.lanes.lead.noteFx.portamento.amount = 60; }),
    'but another track’s portamento is nothing to do with this freeze');
  assert(keepsFreeze('bass', () => { MIX.lanes.lead.noteFx.portamento.enabled = false; }),
    'nor is switching that one off');

  // Byte-identical for a lane that has none: its freezes were rendered under the old
  // fingerprint and must still match, so the planner key is added only when it is needed.
  setup();
  const plain = ['v', 'lane', 'arrangement', 'layers', 'off', 'voice', 'voiceParams', 'noteFx'];
  assert(JSON.stringify(keysOf('bass')) === JSON.stringify(plain)
    && JSON.stringify(keysOf('chords')) === JSON.stringify(plain),
  'a lane with no portamento hashes exactly the keys it always did, so no freeze goes stale');
  withSlide();
  assert(JSON.stringify(keysOf('lead')) === JSON.stringify([...plain, 'portamento'])
    && JSON.parse(fingerprintOf('lead')).portamento === AUTO_PORTAMENTO_PLANNER_VERSION,
  'a lane with it on carries the planner version, after its Note FX');

  // On means doing something: off, Amount 0 (selects nothing) and a version this build
  // does not read (ignored) all leave the planner out of it.
  for (const [what, portamento] of [
    ['switched off', { enabled: false, amount: 35, glide: 40, version: 1 }],
    ['at Amount 0, which selects nothing', { enabled: true, amount: 0, glide: 40, version: 1 }],
    ['written by a newer version, which is ignored', { enabled: true, amount: 35, glide: 40, version: 2 }],
  ]) {
    setup();
    MIX.lanes.lead = { noteFx: { portamento } };
    assert(!('portamento' in JSON.parse(fingerprintOf('lead'))),
      `Auto Portamento ${what} adds no planner version`);
  }

  // The reason it is there: move the planner and a freeze that slid stops matching, while
  // one that never slid does not notice.
  const future = build(AUTO_PORTAMENTO_PLANNER_VERSION + 1);
  withSlide();
  assert(future.freezeFingerprint('song', 'lead') !== fingerprintOf('lead'),
    'a freeze made under an older planner no longer matches a lane that slides');
  assert(future.freezeFingerprint('song', 'bass') === fingerprintOf('bass'),
    'and a lane that does not slide is untouched by a new planner');
}

// ---- the format is versioned ------------------------------------------------

{
  setup();
  const parsed = JSON.parse(fingerprintOf('bass'));
  assert(parsed.v === 2 && parsed.lane === 'bass',
    'the fingerprint carries a version and the lane, so an older bundle cannot match by accident');
  assert(!JSON.stringify(parsed.arrangement).includes('440'),
    'and another lane’s notes are genuinely absent from it, not merely reordered');
}

console.log(failed ? 'FREEZE FINGERPRINT: FAILED' : 'FREEZE FINGERPRINT: PASSED');
process.exit(failed ? 1 : 0);
