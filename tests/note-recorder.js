// Recording a played note into a song.
//
// The desk has three live inputs — the drawn keys, the computer keyboard and MIDI —
// and until now every note they played was a preview. Recording keeps them, which
// means a performance has to become an arrangement edit. The panel that arms it is DOM
// and is checked by hand; this is the part that cannot be checked by looking:
//
//   1. the clock. A pointer on a cell knows its step; a finger on a keyboard knows
//      only when it moved, so a heard position has to be rounded to one — including
//      the case that rounds FORWARD past the end of the loop.
//   2. overdub. The fifteen steps you did not play have to come back unchanged, and a
//      section override replaces the WHOLE lane — so a take that seeded itself wrong
//      does not draw badly, it silently deletes a part.
//   3. the three step shapes, and percussion's rest being `false` where every other
//      lane's is `null` (tests/preview.js pins that from the other end).
//   4. that a take which measured no lengths writes NO `*Len` key. An all-null length
//      array is inaudible and permanent: `compactSections` cannot drop it, so every
//      song anybody recorded into would silt up with one.
import {
  laneKind, restValue, emptyBar, barOfStep, stepInBar,
  quantiseStep, heldLength, chordAnchor, createTake,
} from '../tools/lib/note-recorder.js';
import { midiFreq, freqMidi } from '../tools/mixer-piano-roll.js';
import { polyLane } from '../src/data/voices.js';
import {
  draftOf, writeBarNotesShared, entryOf, readBarLane,
} from '../tools/lib/arrangement-edit.js';
import { lenKey } from '../src/engine/lanes.js';
import { seq, n } from '../src/engine/notes.js';

let failed = false;
function assert(cond, msg) {
  if (cond) console.log('ok:', msg);
  else { console.error('FAIL:', msg); failed = true; }
}

const json = (v) => JSON.stringify(v);
const A2 = n('A2');
const M = (hz) => freqMidi(hz);

// ---- which shape a lane holds ----------------------------------------------------
//
// Off the lane, never sniffed from a value: a silent chord lane is all-null and looks
// exactly like a silent melodic one.
assert(laneKind('kick') === 'perc' && laneKind('hats') === 'perc',
  'a drum lane is percussion');
assert(laneKind('chords') === 'chord' && laneKind('organChords') === 'chord',
  'the two chord lanes hold arrays');
assert(laneKind('bass') === 'melodic' && laneKind('lead') === 'melodic',
  'everything else holds one frequency');
assert(laneKind('bass2') === 'melodic' && laneKind('kick2') === 'perc',
  'and a LAYER is resolved to what it copies — bass2 is a bass, not an unknown lane');

// The distinction that matters in the file.
assert(restValue('kick') === false && restValue('bass') === null,
  'a percussion rest is `false`; every other lane rests at `null`');
assert(emptyBar('kick').length === 16 && emptyBar('kick').every((v) => v === false),
  'an empty drum bar is sixteen falses');
assert(emptyBar('bass').every((v) => v === null),
  'an empty melodic bar is sixteen nulls');

// ---- the clock -------------------------------------------------------------------
assert(quantiseStep(15.6) === 16, 'a note played late rounds up to the next step');
assert(quantiseStep(16.4) === 16, 'and one played early rounds back down to it');
assert(quantiseStep(0) === 0, 'the downbeat is the downbeat');
// The wrap. This is the whole reason the region is passed in rather than assumed.
assert(quantiseStep(31.7, { span: 32 }) === 0,
  'a pickup just before the loop’s downbeat rounds FORWARD and comes round to the top'
  + ' — you played the pickup TO the downbeat');
assert(quantiseStep(31.4, { span: 32 }) === 31,
  'while one that is merely late stays on the last step');
assert(quantiseStep(47.7, { from: 16, span: 32 }) === 16,
  'and a loop anchored mid-song wraps to ITS top, not to bar one');
assert(quantiseStep(15.6, { grid: 2 }) === 16 && quantiseStep(14.4, { grid: 2 }) === 14,
  'an eighth-note grid rounds to even steps');
assert(quantiseStep(13.6, { grid: 4 }) === 12 && quantiseStep(14.4, { grid: 4 }) === 16,
  'a quarter-note grid rounds to fours');
assert(barOfStep(0) === 0 && barOfStep(15) === 0 && barOfStep(16) === 1
  && stepInBar(16) === 0 && stepInBar(31) === 15,
  'a song step splits into a bar and a step within it');

// ---- how long a key was held -----------------------------------------------------
assert(heldLength(4, 8) === 4, 'four steps held is a length of four');
assert(heldLength(4, 4) === 1,
  'a key pressed and released inside one sixteenth is still a note — never length zero');
assert(heldLength(4, 400) === 396, 'and a held key keeps the whole musical length it measured');
assert(heldLength(4, 400, { max: 32 }) === 32,
  'a caller can still cap it explicitly when it is writing into a shorter span');
assert(heldLength(4, 9, { grid: 2 }) === 6, 'the length snaps to the grid too');
assert(heldLength(30, 2, { span: 32 }) === 4,
  'a key held through the turnaround measures forward across the wrap, not backwards');
assert(heldLength(4, 2) === null,
  'without a span, time running backwards is not a length');

// The read is injected, so a test can hand the take a bar and see what comes back.
function stubRead(bars) {
  return (bar, key) => (bars[`${bar}:${key}`]
    ? bars[`${bar}:${key}`].slice()
    : new Array(16).fill(null));
}

// ---- which lanes can hold a chord at all ------------------------------------------
//
// Almost all of them, and the exceptions are not about synthesis. `play()` builds a fresh
// oscillator per call and the rack allocates a slot per note, so two notes at once on any
// channel has always sounded like two notes — pressing two keys on a lead proves it. The
// only question is whether the code reading a lane's STEP loops over what it finds, and
// every pitched body does now.
{
  assert(polyLane({}, 'chords') && polyLane({}, 'organChords'),
    'the chord lanes can, as they always could');
  assert(polyLane({}, 'lead') && polyLane({}, 'bass')
    && polyLane({}, 'leadHarm') && polyLane({}, 'twinkle'),
    'and so can lead, bass, harmony and twinkle — no preset required, because the'
    + ' hand-written bodies loop over the step like the chord lanes always did');
  assert(polyLane({}, 'lead') === polyLane({ leadVoice: 'fmBell' }, 'lead'),
    'and the answer does NOT depend on what the lane is voiced with any more — that'
    + ' distinction was real in the code and impossible to explain');
  assert(polyLane({}, 'bass2') && polyLane({}, 'lead3'),
    'layers follow what they copy');
  assert(!polyLane({}, 'kick') && !polyLane({}, 'hats'),
    'percussion cannot: a step is a boolean, so there is no chord to hold');
  assert(!polyLane({}, 'gliss') && !polyLane({}, 'sweeps') && !polyLane({}, 'organSwoop'),
    'nor the GESTURE lanes: a step starts a shape whose timing is inside the gesture,'
    + ' and two of those are two overlapping sweeps rather than a chord');
  assert(!polyLane({}, 'vox') && !polyLane({}, 'shout'),
    'nor the word lanes: a step picks a WORD and the formant path is keyed to it');
}

// The take takes that decision as an injection, so this module needs no bank.
{
  const notes = [60, 64, 67];
  const play = (lane, stacks) => {
    const take = createTake({ read: stubRead({}), stacks });
    for (const m of notes) take.add({ bar: 0, lane, step: 0, midi: m, freq: midiFreq(m) });
    return take.entries()[0].notes16[0];
  };
  const stacked = play('lead', () => true);
  assert(Array.isArray(stacked) && stacked.length === 3,
    'told a lane stacks, three notes on one step become a chord — even on `lead`');
  assert(stacked[0] < stacked[1] && stacked[1] < stacked[2],
    'sorted, like any other chord, so one chord has one spelling in the file');
  assert(typeof play('lead', () => false) === 'number',
    'told it does not, the last note wins and stays a bare frequency');
  const dflt = createTake({ read: stubRead({}) });
  for (const m of notes) dflt.add({ bar: 0, lane: 'lead', step: 0, midi: m, freq: midiFreq(m) });
  assert(typeof dflt.entries()[0].notes16[0] === 'number',
    'and with nothing said the default is the old narrow rule — chord lanes only');
}

// ---- keeping a chord together ----------------------------------------------------
//
// The bug this exists for: three keys pressed "together" are pressed over twenty or
// thirty milliseconds, each asks the clock separately, and a hand that lands either side
// of a rounding boundary gets round(4.45)=4 for the bottom note and round(4.52)=5 for
// the two above. The chord comes out as a note plus a dyad a step later — rare enough to
// look like the recorder dropping notes at random.
{
  // A hand landing on a chord: three presses 12ms apart, straddling the boundary.
  let a = null;
  const steps = [];
  for (const [ms, raw] of [[1000, 4], [1012, 5], [1024, 5]]) {
    const r = chordAnchor(a, ms, raw);
    a = r.anchor;
    steps.push(r.step);
  }
  assert(json(steps) === '[4,4,4]',
    'three notes inside the window all take the FIRST one’s step — a chord stays a chord'
    + ' even when the hand lands across a rounding boundary');
}
{
  // Two deliberate sixteenths are ~125ms apart at 120bpm, far outside the window.
  const first = chordAnchor(null, 1000, 4);
  const next = chordAnchor(first.anchor, 1125, 5);
  assert(first.step === 4 && next.step === 5,
    'and two notes played APART keep their own steps — the window must not glue a run'
    + ' of sixteenths into one stacked chord');
}
{
  // Anchored to the first press, not the previous one, so a slow roll cannot chain.
  let a = null;
  const steps = [];
  for (const [ms, raw] of [[0, 4], [30, 5], [60, 6], [90, 7]]) {
    const r = chordAnchor(a, ms, raw);
    a = r.anchor;
    steps.push(r.step);
  }
  assert(json(steps) === '[4,4,6,6]',
    'the anchor is the first press rather than the last, so a strum spreads out again'
    + ' after the window instead of chaining indefinitely into one chord');
}
assert(chordAnchor(null, 0, 7).step === 7 && chordAnchor({ ms: 0, step: 3 }, NaN, 7).step === 7,
  'no anchor, or no usable clock, and a note simply takes the step it landed on');

// ---- the take: overdub -----------------------------------------------------------
//
// The read is injected, so the test can hand it a bar and see exactly what comes back.

{
  const bass = new Array(16).fill(null);
  bass[0] = A2;
  bass[8] = A2;
  const take = createTake({ read: stubRead({ '0:bass': bass }) });
  const fifth = midiFreq(M(A2) + 7);
  take.add({ bar: 0, lane: 'bass', step: 4, midi: M(fifth), freq: fifth });
  const [e] = take.entries();
  assert(e.notes16[4] === fifth, 'the recorded note lands on its step');
  assert(e.notes16[0] === A2 && e.notes16[8] === A2,
    'and the notes already in the bar are still there — recording OVERDUBS');
  assert(e.notes16.filter((v) => v != null).length === 3,
    'nothing else in the bar was touched');
  assert(e.lengths16 === null,
    'and with no note-off measured, the take says NOTHING about lengths');
  assert(take.count() === 1 && json(take.bars()) === '[0]'
    && json([...take.lanes()]) === '["bass"]',
    'the take knows what it caught, for the toast and the undo label');
}

// ---- the take: melodic replace, chord stack --------------------------------------
{
  // Worth stating plainly, because it is the one that reads as a bug from outside: a
  // chord played into `bass` keeps ONE note. Not a recorder limitation — a melodic lane
  // holds a single frequency per step and there is physically nowhere for the other two
  // to go. The desk says so in a toast rather than letting it look like dropped notes.
  const take = createTake({ read: stubRead({}) });
  const a = midiFreq(60);
  const b = midiFreq(64);
  const c = midiFreq(67);
  take.add({ bar: 0, lane: 'bass', step: 0, midi: 60, freq: a });
  take.add({ bar: 0, lane: 'bass', step: 0, midi: 64, freq: b });
  take.add({ bar: 0, lane: 'bass', step: 0, midi: 67, freq: c });
  const held = take.entries()[0].notes16[0];
  assert(held === c && typeof held === 'number',
    'a chord played into a MONOPHONIC lane keeps one note — the last — and keeps it as a'
    + ' bare frequency, never an array (an array on a melodic lane throws in scheduleStep)');
}
{
  // And the same three notes on a chord lane keep all three. Same gesture, same code
  // path, different lane — which is the whole point of deciding by lane rather than by
  // looking at the value.
  const take = createTake({ read: stubRead({}) });
  for (const m of [60, 64, 67]) {
    take.add({ bar: 0, lane: 'chords', step: 0, midi: m, freq: midiFreq(m) });
  }
  assert(take.entries()[0].notes16[0].length === 3,
    'while a CHORD lane keeps all three — the difference is the lane, not the playing');
}
{
  const take = createTake({ read: stubRead({}) });
  const c = midiFreq(60);
  const e = midiFreq(64);
  const g = midiFreq(67);
  take.add({ bar: 0, lane: 'chords', step: 0, midi: 67, freq: g });
  take.add({ bar: 0, lane: 'chords', step: 0, midi: 60, freq: c });
  take.add({ bar: 0, lane: 'chords', step: 0, midi: 64, freq: e });
  const held = take.entries()[0].notes16[0];
  assert(Array.isArray(held) && held.length === 3,
    'on a CHORD lane the notes stack — that is what makes it a chord lane');
  assert(held[0] < held[1] && held[1] < held[2],
    'and the array comes out sorted, so two routes to one chord write one file');
  assert(!held.some((v) => typeof v !== 'number'),
    'never a bare number and never a nested array — either throws inside scheduleStep');
}

// ---- the take: percussion --------------------------------------------------------
{
  // A lane the song does not have yet reads as sixteen nulls.
  const take = createTake({ read: stubRead({}) });
  take.add({ bar: 0, lane: 'hats', step: 2 });
  take.add({ bar: 0, lane: 'hats', step: 6 });
  const [e] = take.entries();
  assert(e.notes16[2] === true && e.notes16[6] === true, 'a pad writes a `true`');
  assert(e.notes16.every((v) => v === true || v === false),
    'and every other step comes back FALSE, not null — a drum lane stays all-boolean'
    + ' or it stops writing out as seq(...) shorthand');
  assert(e.lengths16 === null, 'a drum never gets a length; there is nothing to hear');
}
{
  const hats = new Array(16).fill(false);
  hats[0] = true;
  const take = createTake({ read: stubRead({ '0:hats': hats }) });
  const t = take.add({ bar: 0, lane: 'hats', step: 0 });
  take.close(t, 4);
  const [e] = take.entries();
  assert(e.notes16[0] === true, 'striking a pad that is already on is a no-op');
  assert(e.lengths16 === null,
    'and closing a drum hit still writes no length — record adds hits, nothing else');
}

// ---- the take: note-off becomes a length -----------------------------------------
{
  const take = createTake({ read: stubRead({}) });
  const f = midiFreq(48);
  const t = take.add({ bar: 0, lane: 'bass', step: 4, midi: 48, freq: f });
  assert(take.entries()[0].lengths16 === null,
    'while the key is still down the take has no length to report');
  take.close(t, 4);
  const [e] = take.entries();
  assert(e.lengths16 && e.lengths16[4] === 4, 'the held length lands with the note');
  assert(e.lengths16.filter((v) => v != null).length === 1,
    'and says nothing about any other step');
}
{
  // `vox` and `shout` have hand-timed envelopes and nothing for a length to override.
  const take = createTake({ read: stubRead({}), resizable: (l) => l !== 'vox' });
  const t = take.add({ bar: 0, lane: 'vox', step: 0, midi: 60, freq: midiFreq(60) });
  take.close(t, 8);
  assert(take.entries()[0].lengths16 === null,
    'a lane that cannot hold a length is not given one');
}
{
  // A whole chord held and released together, which is the ordinary way to play one.
  // This came out `[null, null, 3]` — only the last tone getting a length — because the
  // release rebuilt the entire array from the snapshot each note took on the way DOWN,
  // and for a chord every note went down seeing a shorter chord than the one that ended
  // up there. Three releases wrote three differently-shaped arrays and the last won.
  const take = createTake({ read: stubRead({}) });
  const tokens = [60, 64, 67].map((m) => ({
    m, t: take.add({ bar: 0, lane: 'chords', step: 0, midi: m, freq: midiFreq(m) }),
  }));
  for (const { t } of tokens) take.close(t, 3);
  const [e] = take.entries();
  assert(e.notes16[0].length === 3, 'the triad is all three tones');
  assert(json(e.lengths16[0]) === '[3,3,3]',
    'and EVERY tone of a chord held and released together gets the length — a release'
    + ' says one thing about one tone, so it must not rebuild the other two from a'
    + ' snapshot taken before they existed');
}
{
  // Tones released at different times: an arpeggio held down into a chord.
  const take = createTake({ read: stubRead({}) });
  const a = take.add({ bar: 0, lane: 'chords', step: 0, midi: 60, freq: midiFreq(60) });
  const b = take.add({ bar: 0, lane: 'chords', step: 0, midi: 64, freq: midiFreq(64) });
  const c = take.add({ bar: 0, lane: 'chords', step: 0, midi: 67, freq: midiFreq(67) });
  take.close(b, 2);
  take.close(c, 8);
  take.close(a, 5);
  const [e] = take.entries();
  const notes = e.notes16[0];
  const lens = e.lengths16[0];
  assert(notes.length === 3 && lens.length === 3,
    'lengths stay one per tone whatever order the keys come up in');
  assert(lens[notes.indexOf(midiFreq(60))] === 5
    && lens[notes.indexOf(midiFreq(64))] === 2
    && lens[notes.indexOf(midiFreq(67))] === 8,
    'and each tone keeps ITS OWN length, aligned with its own frequency — sort them'
    + ' apart and the song plays the right notes at each other’s lengths');
}
{
  // The positional-alignment hazard: lengths are PAIRED with the frequencies, so a
  // second note re-sorting the chord has to carry the first one's length with it.
  const take = createTake({ read: stubRead({}) });
  const g = midiFreq(67);
  const c = midiFreq(60);
  const tg = take.add({ bar: 0, lane: 'chords', step: 0, midi: 67, freq: g });
  take.close(tg, 6);
  take.add({ bar: 0, lane: 'chords', step: 0, midi: 60, freq: c });
  const [e] = take.entries();
  const notes = e.notes16[0];
  const lens = e.lengths16[0];
  assert(Array.isArray(notes) && Array.isArray(lens) && notes.length === lens.length,
    'a chord’s lengths are an array, one per tone, the same length as the frequencies');
  assert(lens[notes.indexOf(g)] === 6,
    'and the G keeps ITS six steps after the C sorted in below it — sort the two apart'
    + ' and a song plays the right notes at each other’s lengths');
}
{
  // A new note replacing a different one must not inherit its length.
  const bass = new Array(16).fill(null);
  bass[0] = A2;
  const lens = new Array(16).fill(null);
  lens[0] = 8;
  const take = createTake({ read: stubRead({ '0:bass': bass, '0:bassLen': lens }) });
  const other = midiFreq(M(A2) + 5);
  take.add({ bar: 0, lane: 'bass', step: 0, midi: M(other), freq: other });
  const [e] = take.entries();
  assert(e.notes16[0] === other, 'the new note took the step');
  assert(e.lengths16 && e.lengths16[0] === null,
    'and the eight steps the OLD note rang for did not come with it');
}

// ---- a note still held when the take is flushed -----------------------------------
//
// The desk writes every beat and clears the take. A key that is still DOWN has not
// finished being a note, so the desk re-adds it to the fresh take and repoints its token
// (`carryHeld` in mixer-entry.js). This pins the half the take is responsible for: that a
// token from before a `clear()` is dead, and a re-added note can still be given a length.
{
  const written = new Array(16).fill(null);
  const take = createTake({ read: stubRead({ '0:bass': written }) });
  const f = midiFreq(48);
  const stale = take.add({ bar: 0, lane: 'bass', step: 2, midi: 48, freq: f });
  take.clear();
  // The note has been written by now, so the fresh seed contains it — as it will on the
  // real desk, where the read goes through the draft the flush just updated.
  written[2] = f;
  take.close(stale, 8);
  assert(take.entries().length === 0,
    'a token from before the flush is dead — closing it must not resurrect a bar entry');
  const fresh = take.add({ bar: 0, lane: 'bass', step: 2, midi: 48, freq: f });
  take.close(fresh, 8);
  const [e] = take.entries();
  assert(e && e.notes16[2] === f,
    're-adding the held note puts the same frequency back on the same step');
  assert(e.lengths16 && e.lengths16[2] === 8,
    'and the length it was eventually released at still lands — which is what stopped'
    + ' every held note coming out one step long once the flush got four times faster');
  assert(e.notes16.filter((v) => v != null).length === 1,
    'without duplicating it or disturbing the rest of the bar');
}

// ---- the take, all the way through the real write --------------------------------
{
  const bank = {
    bpm: 120,
    sections: [{
      bass: seq('A2 . . . . . . . . . . . . . . . A2 . . . . . . . . . . . . . . .'),
      hats: seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .').map((v) => !!v),
    }],
  };
  const before = json(bank);
  let d = draftOf(bank);

  // The desk's own read: through the delta chain, then the bank, against the bank as
  // it is WRITTEN.
  const take = createTake({ read: (bar, key) => readBarLane(bank, d, bar, key) });
  const fifth = midiFreq(M(A2) + 7);
  const t = take.add({ bar: 0, lane: 'bass', step: 4, midi: M(fifth), freq: fifth });
  take.close(t, 3);
  take.add({ bar: 1, lane: 'hats', step: 8 });

  for (const { bar, lane, notes16, lengths16 } of take.entries()) {
    d = writeBarNotesShared(bank, d, bar, lane, notes16, lengths16);
  }
  const entry = entryOf(bank, d);
  assert(entry && entry.sections?.length === 1 && entry.sections[0].base === 0,
    'a take becomes a layer section, exactly like a drawn note');
  assert(entry.sections[0].bass[4] === fifth, 'carrying the note that was played');
  assert(entry.sections[0].bass[0] === A2,
    'and keeping what the bar already played — the overdub survived the write');
  assert(entry.sections[0][lenKey('bass')]?.[4] === 3,
    'the measured length went into bassLen, at the note’s step');
  assert(entry.sections[0].hats[16 + 8] === true,
    'and the hat recorded into the second bar landed in the second half of the section');
  assert(entry.sections[0].hats.every((v) => v === true || v === false),
    'with the drum lane still all-boolean end to end');
  assert(json(bank) === before,
    'while the composition is untouched — the desk never rewrites a bank');
}

// ---- a take that measured nothing writes no Len key -----------------------------
//
// The invariant tests/null-test.js protects from the far end, asserted here at the
// object where it is cheap. An all-null length array is inaudible and permanent.
{
  const bank = { bpm: 120, sections: [{ bass: seq('A2 . . . . . . . . . . . . . . .') }] };
  let d = draftOf(bank);
  const take = createTake({ read: (bar, key) => readBarLane(bank, d, bar, key) });
  const f = midiFreq(50);
  take.add({ bar: 0, lane: 'bass', step: 6, midi: 50, freq: f });   // never closed
  for (const { bar, lane, notes16, lengths16 } of take.entries()) {
    d = writeBarNotesShared(bank, d, bar, lane, notes16, lengths16);
  }
  const entry = entryOf(bank, d);
  assert(entry.sections[0].bass[6] === f, 'the note is there');
  const lenKeys = Object.keys(entry.sections[0]).filter((k) => /Len$/.test(k));
  assert(lenKeys.length === 0,
    `and NO length key was created (found ${json(lenKeys)}) — a take with no note-off`
    + ' must leave the lane’s own duration standing');
}

// ---- an empty take leaves nothing at all ----------------------------------------
{
  const bank = { bpm: 120, sections: [{ bass: seq('A2 . . . . . . . . . . . . . . .') }] };
  const d = draftOf(bank);
  const take = createTake({ read: (bar, key) => readBarLane(bank, d, bar, key) });
  assert(take.count() === 0 && take.entries().length === 0,
    'arming and playing nothing buffers nothing');
  assert(entryOf(bank, d) === null,
    'so the song gets no arrangement entry — an armed recorder is not an edit');
}

// ---- readBarLane, the read the write is the other half of ------------------------
{
  const bank = {
    bpm: 120,
    sections: [
      { bass: seq('A2 . . . . . . . . . . . . . . . C3 . . . . . . . . . . . . . . .') },
      { base: 0, lead: seq('E4 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .') },
    ],
    order: [0, 1],
  };
  const d = draftOf(bank);
  assert(readBarLane(bank, d, 0, 'bass')[0] === A2,
    'a bar reads its own lane out of its section');
  assert(readBarLane(bank, d, 1, 'bass')[0] === n('C3'),
    'and the second bar reads the second half of it');
  assert(readBarLane(bank, d, 2, 'bass')[0] === A2,
    'a section that overrides the lead says nothing about the bass, so the bass it'
    + ' plays is inherited through `base` — the delta chain, then the bank');
  assert(readBarLane(bank, d, 0, 'nosuchlane').every((v) => v === null),
    'a lane the song has not got reads as sixteen rests, not a crash');
  assert(readBarLane(bank, d, 99, 'bass').every((v) => v === null),
    'and so does a bar that is not there');
}

console.log(failed ? 'NOTE RECORDER: FAILED' : 'NOTE RECORDER: PASSED');
process.exit(failed ? 1 : 0);
