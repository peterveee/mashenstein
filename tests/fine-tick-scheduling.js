// WHICH HALF STEPS THE SCHEDULER OWES THE SONG, AND WHICH IT DOES NOT.
//
// A single 1/32 arpeggiator anywhere promotes the transport to 32 for the WHOLE song,
// and the transport is right to be promoted — loop, seek and swing interpolation all
// need an authoritative half-step time. The work is a different question. On a 28-track
// song measured at 1472 scheduler passes, half of every lane resolution and half of
// every Note FX resolution happened on ticks where `sequenceValue` was always going to
// answer null, because a lane array of fewer than 64 slots is folded onto the even
// slots by construction.
//
// So the engine precomputes two things beside `transportResolution`: which BARS need
// the half tick at all, and which LANES can say anything on one. Both are conservative
// by design — the safe answer is "all of them" — and the whole value of them rests on
// that being got right, which is what this suite is.
//
// Browserless on purpose: every claim here is about the precompute, and none of it
// needs an AudioContext to be true.
import { Audio } from '../src/engine/audio.js';
import { seq } from '../src/engine/notes.js';

let failed = false;
const assert = (ok, message) => {
  if (ok) console.log(`ok: ${message}`);
  else { console.error(`FAIL: ${message}`); failed = true; }
};

const sixteen = () => seq('. . . . . . . . . . . . . . . .');
const arp = (rate) => ({ arp: { enabled: true, rate, direction: 'up', retrigger: 'continuous' } });

/** Drive the precompute directly, the way setBank/applyMix/setArrangement all do. */
const plan = (bank, mix) => {
  Audio.transportResolution = 16;
  Audio.step = 0;
  Audio.refreshTransportResolution(bank, mix);
  return {
    resolution: Audio.transportResolution,
    fineBars: Audio._fineBars,
    fineBarsReason: Audio._fineBarsReason,
    fineLanes: Audio._fineLanes,
  };
};

// ---- an ordinary 16-step song ------------------------------------------------

{
  const p = plan({ bpm: 120, bass: sixteen(), order: [0] }, { lanes: {} });
  assert(p.resolution === 16, 'a song with no fine arp and no 32-step lane stays at 16');
}

// ---- one arp promotes the clock, but not every bar ---------------------------

{
  // Thirty-two bars, one of which turns a 1/32 arpeggiator on. This is the shape the
  // performance plan was written around: the clock doubles for the whole song to serve
  // one bar of it.
  const order = Array.from({ length: 32 }, (_, i) => (i === 7
    ? { s: 0, noteFx: { chords: { mode: 'on', ...arp(0.5) } } }
    : { s: 0 }));
  const bank = { bpm: 120, sections: [{ chords: sixteen() }], order };
  const p = plan(bank, { lanes: {} });
  assert(p.resolution === 32, 'one bar-level 1/32 arp promotes the transport to 32');
  assert(p.fineBars instanceof Set,
    'the bars that need the half tick are named, rather than the song giving up on all of them');
  // Two, not one: an order entry that does not name a `half` is the whole section, so
  // it expands to both of its bars and the override rides on both. Sixty-two of the
  // sixty-four skip the half tick, which is the claim that matters.
  assert(p.fineBars.size === 2,
    `only the bars of the entry that asked for it need the half tick (got ${p.fineBars?.size} of 64)`);
  assert(p.fineLanes?.has('chords'),
    'the arpeggiated lane is resolved on half ticks even in the bars that skip them');
  assert(!p.fineLanes?.has('bass'),
    'a plain 16-step lane is not');
}

// ---- a long song does not look 32-step just for being long -------------------

{
  // `order` is one entry per bar and passes 64 on any song over thirty bars; `sections`
  // is a list of partial banks. Neither is a lane, and counting arrays on the bank
  // rather than lane arrays by key made every long song claim it had authored content
  // between the sixteenths — which silently costs the entire optimisation.
  const order = Array.from({ length: 90 }, () => ({ s: 0 }));
  const bank = {
    bpm: 120,
    sections: [{ chords: sixteen(), bass: sixteen() }],
    order: [...order.slice(0, 89), { s: 0, noteFx: { chords: { mode: 'on', ...arp(0.5) } } }],
  };
  const p = plan(bank, { lanes: {} });
  assert(p.fineBars instanceof Set && p.fineBars.size === 2 && p.fineBarsReason === '',
    'a ninety-bar song is not mistaken for a 32-step one because its `order` is long');
}

// ---- authored content between the sixteenths -------------------------------

{
  const bank = { bpm: 120, resolution: 32, chords: new Array(64).fill(null), order: [0] };
  const p = plan(bank, { lanes: {} });
  assert(p.resolution === 32 && p.fineBars === null
    && p.fineBarsReason === 'native-32-step-bank',
    'a natively 32-step bank needs every half tick, and says why');
}

{
  // The case the stress song actually is: the bank is 32-step because the desk wrote a
  // 64-slot lane. No whole tick may be skipped — but the thirty lanes that are still
  // 16-step may be, and that is where the work goes.
  const wide = new Array(64).fill(null);
  wide[3] = 440;                                     // a note on an ODD slot
  const bank = {
    bpm: 120,
    resolution: 32,
    order: [0],
    sections: [{ organChords: wide, bass: sixteen(), chords: sixteen() }],
  };
  const p = plan(bank, { lanes: {} });
  assert(p.fineLanes?.has('organChords'),
    'a lane with a 64-slot array is resolved on half ticks — its odd slots are the song');
  assert(!p.fineLanes.has('bass') && !p.fineLanes.has('chords'),
    'its 16-step neighbours are not, however 32-step the bank calls itself');
}

{
  // A lane whose NOTES are 32 slots but whose LENGTHS are 64. `stepLen` reads the
  // lengths array through the same seam, so it can speak on an odd slot too.
  const bank = {
    bpm: 120,
    resolution: 32,
    order: [0],
    sections: [{ bass: sixteen(), bassLen: new Array(64).fill(1) }],
  };
  assert(plan(bank, { lanes: {} }).fineLanes?.has('bass'),
    'a 64-slot LENGTHS array makes its lane fine even when the notes beside it are not');
}

// ---- a track-level fine arp applies everywhere ------------------------------

{
  const bank = { bpm: 120, sections: [{ chords: sixteen() }], order: [{ s: 0 }, { s: 0 }] };
  const p = plan(bank, { lanes: { chords: { noteFx: arp(0.5) } } });
  assert(p.resolution === 32 && p.fineBars === null
    && p.fineBarsReason === 'track-level-1/32-arp',
    'a track-level 1/32 arp is on in every bar, so no bar skips the half tick');
}

// ---- the lanes whose Note FX state must keep ticking ------------------------

{
  const order = Array.from({ length: 8 }, (_, i) => (i === 2
    ? { s: 0, noteFx: { lead: { mode: 'on', ...arp(0.5) } } }
    : { s: 0 }));
  const bank = { bpm: 120, sections: [{ chords: sixteen(), lead: sixteen() }], order };
  const p = plan(bank, { lanes: { chords: { noteFx: arp(1) } } });
  assert(p.fineLanes?.has('chords'),
    'a lane with a 1/16 arp is still resolved on half ticks — its arpeggiator state'
    + ' advances per call, and skipping the calls would change where the run started');
  assert(Audio._fineTickLanes.includes('chords') && Audio._fineTickLanes.includes('lead'),
    'the whole-tick fast path knows which lanes it still owes a Note FX pass');
}

// ---- coming back down off a half step ---------------------------------------

{
  // Switching the last 1/32 arpeggiator off on the desk drops the transport to 16 while
  // the sequencer may be sitting on a half step. Left there, `step` keeps its half for
  // the rest of the session: every lane reads `arr[0.5]` and returns null, rhythmic
  // effects and bar effects never fire again, the beat listeners stop, and with no
  // locator loop armed nothing ever brings it back. The song goes silent and stays that
  // way until it is reloaded.
  const fine = { bpm: 120, sections: [{ chords: sixteen() }],
    order: [{ s: 0, noteFx: { chords: { mode: 'on', ...arp(0.5) } } }] };
  const plain = { bpm: 120, sections: [{ chords: sixteen() }], order: [{ s: 0 }] };
  Audio.transportResolution = 16;
  Audio.step = 0;
  Audio.refreshTransportResolution(fine, { lanes: {} });
  assert(Audio.transportResolution === 32, 'the fine song promoted the transport');
  Audio.step = 12.5;                                   // mid-half-step, as playback is
  Audio.refreshTransportResolution(plain, { lanes: {} });
  assert(Audio.transportResolution === 16, 'removing the fine arp drops the transport back');
  assert(Number.isInteger(Audio.step),
    `the transport lands back on a whole step rather than keeping its half (got ${Audio.step})`);
  assert(Audio.step === 13,
    'and lands on the NEXT one — the half it was on had already been scheduled');
}

{
  Audio.transportResolution = 32;
  Audio.step = 8.5;
  Audio.refreshTransportResolution({ bpm: 120, resolution: 32, chords: new Array(64).fill(null), order: [0] },
    { lanes: {} });
  assert(Audio.step === 8.5,
    'a song that stays at 32 keeps the half step it was on — nothing to correct');
}

// ---- a frozen lane against a promoted transport -----------------------------
//
// `_scheduleFrozenSegment` schedules a new BufferSource whenever the step it is called
// on is not one transport tick past the step it last saw. It worked that tick out from
// the BANK's resolution while `step` moves by the TRANSPORT's — and those disagree on
// exactly the songs this optimisation is about, where an arpeggiator promoted the clock
// without the bank changing. Every call then looked like a discontinuity and launched
// another source covering the rest of the bar, all playing the same song position at the
// same audio time. A whole-track freeze came back thirty-two times over.
{
  const node = { connect() {}, disconnect() {} };
  let sources = 0;
  const previous = {
    ctx: Audio.ctx, offline: Audio.offline, bank: Audio.bank, mixer: Audio.mixer,
    resolution: Audio.transportResolution, step: Audio.step,
  };
  Audio.ctx = { currentTime: 0, createBufferSource() { sources++; return { buffer: null, connect() {}, start() {}, stop() {} }; } };
  Audio.offline = true;
  Audio.loopStart = null; Audio.loopEnd = null; Audio.loopHasWrapped = false;
  Audio.mixer = { lane: () => ({ frozen: node, wakeEffects() {} }) };

  const oneBar = (bankResolution, transportResolution) => {
    sources = 0;
    Audio.bank = { resolution: bankResolution };
    Audio.transportResolution = transportResolution;
    const state = { buffer: { duration: 120 }, originStep: 0, lastStep: null,
      segmentStartStep: null, loopStart: null, loopEnd: null };
    const tick = transportResolution === 32 ? 0.5 : 1;
    for (let i = 0, step = 0, when = 0; i < 16 / tick; i++, step += tick, when += 0.114 * tick) {
      Audio._scheduleFrozenSegment('harp', state, step, when, 0.114, 16 * 65);
    }
    return sources;
  };

  assert(oneBar(undefined, 16) === 1, 'a frozen lane launches once a bar at 16 steps');
  assert(oneBar(32, 32) === 1, 'a frozen lane launches once a bar on a natively 32-step bank');
  assert(oneBar(undefined, 32) === 1,
    'a frozen lane launches once a bar when an arpeggiator promoted the transport under it —'
    + ' not once per half step, thirty-two times over');

  Object.assign(Audio, {
    ctx: previous.ctx, offline: previous.offline, bank: previous.bank, mixer: previous.mixer,
    transportResolution: previous.resolution, step: previous.step,
  });
}

console.log(failed ? 'FINE TICK SCHEDULING: FAILED' : 'FINE TICK SCHEDULING: PASSED');
process.exit(failed ? 1 : 0);
