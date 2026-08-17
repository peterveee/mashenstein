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
// The last section is the other half of the same subject: a song wearing `resolution: 32`
// that never writes on a half step gets NO fast path at all, and until the normaliser
// existed nothing ever took the flag back off.
//
// Browserless on purpose: every claim here is about the precompute, and none of it
// needs an AudioContext to be true.
import { Audio } from '../src/engine/audio.js';
import { seq, n } from '../src/engine/notes.js';
import { sequenceValue } from '../src/engine/lanes.js';
import {
  applyArrangement, RESOLUTIONS, promoteResolution,
} from '../src/data/arrangements.js';
import { normaliseArrangementResolution } from '../tools/lib/arrangement-edit.js';

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

// ---- taking the flag back off -------------------------------------------------
//
// `resolution: 32` is written the moment the piano roll's quantise picker is set to
// 1/32, because a note cannot be placed on a grid that is not drawn. Nothing used to
// write it back, so a song the grid was merely TRIED on stayed fine for good — and a
// fine song is precisely the one `_fineBars` refuses to help, because a native 32-step
// bank is allowed to have its music on the odd slots. `normaliseArrangementResolution`
// is what asks whether it actually does.
{
  // 64 slots — two bars of thirty-seconds — with every note on an even one, which is
  // what the roll writes when the grid was drawn fine and used coarsely.
  const wide = (...pairs) => Array.from({ length: 64 }, (_, i) => (i % 2 ? null : pairs[i / 2] ?? null));
  const bank = { bpm: 120, sections: [{ lead: seq('C4 . . . . . . . . . . . . . . .') }], order: [0] };
  const fineEntry = () => ({
    order: [0, 1],
    resolution: 32,
    sections: [{ base: 0, lead: wide(n('C4'), null, n('E4')), leadLen: wide(2, null, 4) }],
  });

  const tidy = normaliseArrangementResolution(bank, fineEntry());
  assert(tidy.resolution === undefined, 'a fine entry with nothing on an odd slot loses the flag');
  assert(tidy.sections[0].lead.length === 32, 'and its 64-slot lane narrows to the sixteenth grid');
  assert(tidy.sections[0].leadLen.length === 32, 'and so does the length array beside it');
  assert(tidy.sections[0].base === 0, 'while everything that is not a lane is carried through');
  assert(JSON.stringify(tidy.order) === '[0,1]', 'and `order` is left alone, not mistaken for a lane');

  // THE claim: narrowing is lossless. Every sixteenth reads the same note through
  // `sequenceValue` before and after, which is the whole permission to do it at all.
  const before = fineEntry().sections[0];
  const after = tidy.sections[0];
  let same = true;
  for (const key of ['lead', 'leadLen']) {
    for (let s = 0; s < 32; s++) {
      if (sequenceValue({ resolution: 32, [key]: before[key] }, key, s * 2, 32)
        !== sequenceValue({ [key]: after[key] }, key, s, 16)) same = false;
    }
  }
  assert(same, 'and every sixteenth reads the same note either side of the narrowing');

  // Refusals. Each of these is a song where 32 is load-bearing.
  const withOddNote = fineEntry();
  withOddNote.sections[0].lead[3] = n('G4');
  assert(normaliseArrangementResolution(bank, withOddNote).resolution === 32,
    'one note on an odd slot and the flag stays');

  const withOddLength = fineEntry();
  withOddLength.sections[0].leadLen[5] = 1;
  assert(normaliseArrangementResolution(bank, withOddLength).resolution === 32,
    'a LENGTH on an odd slot keeps it too — stepLen reads through the same seam');

  const wideBank = { ...bank, sections: [{ lead: wide(n('C4')) }] };
  assert(normaliseArrangementResolution(wideBank, fineEntry()).resolution === 32,
    'a 64-slot lane in the COMPOSITION keeps it — that half of the file is never rewritten');

  assert(normaliseArrangementResolution(null, fineEntry()).resolution === 32,
    'and with no bank to check, nothing is decided');

  const plain = { order: [0, 1], bpm: 104 };
  assert(normaliseArrangementResolution(bank, plain) === plain,
    'an entry that was never fine comes back untouched, by identity');

  assert(JSON.stringify(normaliseArrangementResolution(bank, tidy)) === JSON.stringify(tidy),
    'and running it twice changes nothing the second time');

  // A live draft goes through the same function, and a draft's `plan` is one entry per
  // BAR — long enough to look like a 64-slot lane on any song over thirty bars.
  const draft = {
    plan: Array.from({ length: 80 }, () => ({ sec: 0, half: 0 })),
    resolution: 32,
    sections: [{ base: 0, lead: wide(n('C4')) }],
  };
  const tidyDraft = normaliseArrangementResolution(bank, draft);
  assert(tidyDraft.resolution === undefined && tidyDraft.plan.length === 80,
    'an 80-bar draft demotes, and its plan is not mistaken for a lane and halved');

  // And the point of all of it: the fast path comes back.
  const was = plan(applyArrangement(bank, 'x', { x: fineEntry() }), null);
  assert(was.fineBarsReason === 'native-32-step-bank' && was.fineBars === null,
    'before: the flag alone costs the song every whole-tick skip');
  const now = plan(applyArrangement(bank, 'x', { x: tidy }), null);
  assert(now.resolution === 16 && now.fineBarsReason === '' && now.fineBars?.size === 0,
    'after: back on the sixteenth clock, with no bar owing a half tick');
}

// ---- the grid widens: sixteenth triplets ------------------------------------
//
// A sixteenth triplet is three notes in the space of two sixteenths — 24 to the bar,
// which divides neither 16 nor 32. 48 is the least common multiple of 16 and 24 and is
// therefore the coarsest grid that can hold straight sixteenths and triplets at once;
// 96 is the LCM of 32 and 24, for a song that wants thirty-seconds as well.
//
// The claims below are the ones the rest of the engine leans on. Two of them matter
// more than the others: that the set is closed under LCM, because `sequenceValue`
// folds a coarse lane onto a fine clock by a WHOLE stride and there is no such thing
// as a note halfway between two slots; and that widening the grid changes nothing
// about a song that never asked for it.
{
  assert(JSON.stringify(RESOLUTIONS) === JSON.stringify([16, 32, 48, 96]),
    'the grids a song may be stored on');

  assert(promoteResolution(16, 48) === 48, 'triplets on a sixteenth song promote to 48');
  assert(promoteResolution(32, 48) === 96,
    'triplets on a THIRTY-SECOND song promote to 96 — 48 cannot express a 32nd');
  assert(promoteResolution(16, 16) === 16, 'and a song that asks for nothing stays where it was');
  assert(promoteResolution(24) === 48,
    'a hand-edited 24 snaps up to a grid that contains it, never down to one that drops notes');

  const closed = RESOLUTIONS.every((a) => RESOLUTIONS.every((b) => {
    const p = promoteResolution(a, b);
    return RESOLUTIONS.includes(p) && p % a === 0 && p % b === 0;
  }));
  assert(closed, 'the set is closed under LCM, so every promotion divides both sides evenly');

  // A legacy two-bar lane read at a triplet clock: every third slot, nothing between.
  const legacy = { resolution: 48, lead: Array.from({ length: 32 }, (_, i) => (i === 4 ? 660 : null)) };
  assert(sequenceValue(legacy, 'lead', 12, 48) === 660,
    'a 32-slot lane on a 48 clock puts its sixteenth 4 on slot 12 — stride 3');
  assert(sequenceValue(legacy, 'lead', 13, 48) === null
    && sequenceValue(legacy, 'lead', 14, 48) === null,
  'and says nothing on the two triplet slots between sixteenths');

  // A lane genuinely written on the triplet grid: 96 slots is two bars at 48, and three
  // evenly spaced notes across one sixteenth-pair is what a sixteenth triplet IS.
  const trip = { resolution: 48, lead: Array.from({ length: 96 }, (_, i) => ([0, 2, 4].includes(i) ? 440 : null)) };
  assert([0, 2, 4].every((s) => sequenceValue(trip, 'lead', s, 48) === 440)
    && [1, 3].every((s) => sequenceValue(trip, 'lead', s, 48) === null),
  'three triplet notes land on their own slots and nothing is smeared between them');

  // The reason the transport counts ticks instead of adding them up.
  const drift = (res) => {
    Audio.transportResolution = res;
    Audio.step = 0;
    for (let i = 0; i < res * 4; i++) Audio._tick += 1;
    return Math.abs(Audio.step - 64);
  };
  assert(RESOLUTIONS.every((res) => drift(res) === 0),
    'four bars of whole ticks lands on step 64 exactly, at every resolution');

  // Swing, through the engine's own method rather than a copy of it. `spb` is 1 so the
  // numbers below read as fractions of a sixteenth.
  const swingAt = (res, step, swing = 66) => {
    Audio.transportResolution = res;
    Audio.swing = swing;
    Audio.step = step;
    return Audio._swingOffset(1);
  };
  const full = (66 - 50) / 50;
  assert(swingAt(16, 0) === 0 && swingAt(16, 1) === full,
    'at 16 the downbeat holds and the off-beat sixteenth takes the whole delay, as before');
  assert(swingAt(32, 0.5) === full / 2,
    'at 32 the half step still interpolates between the pair, as before');
  assert(swingAt(48, 1) === full && swingAt(48, 0) === 0,
    'at 48 a whole sixteenth swings exactly as it always did');
  assert(swingAt(48, 1 / 3) === 0 && swingAt(48, 2 / 3) === 0,
    'but a TRIPLET slot does not swing — it is not in the pair swing has an opinion about');
  assert(swingAt(96, 0.5) === full / 2 && swingAt(96, 1 / 3) === 0,
    'at 96 the 32nd grid still swings and the triplet still does not');
  assert(swingAt(48, 1, 50) === 0 && swingAt(48, 1, 0) === 0,
    'and a straight song is untouched at any grid — zero, exactly, so the render is bit-identical');

  Audio.swing = 0;
  Audio.transportResolution = 16;
  Audio.step = 0;
}

console.log(failed ? 'FINE TICK SCHEDULING: FAILED' : 'FINE TICK SCHEDULING: PASSED');
process.exit(failed ? 1 : 0);
