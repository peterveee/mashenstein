// Per-note duration: a length that belongs to the NOTE rather than to the lane.
//
// A lane has always had one length — `bassDur` — and every note on it sounded for
// exactly that long. The piano roll's resize handle writes a parallel array instead
// (`bassLen` beside `bass`), absolute in steps, and this is the suite that says what
// that array means and where it has to be honoured.
//
// The claims, in the order they matter:
//
//   1. ABSENT IS UNCHANGED. No bank in the game has a Len array, and the path taken
//      when there is none must be the path that existed before — that is what keeps
//      tests/null-test.js sample-exact, and it is checked here at the number rather
//      than at the sample so a failure says which key went wrong.
//   2. A CHORD'S TONES ARE INDEPENDENT. The roll draws a rectangle per tone, so the
//      lengths are per tone, positionally aligned with the sorted frequencies. The
//      alignment is the whole risk in that shape: sort them apart from the notes once
//      and a song plays the right pitches at each other's lengths, which is the kind
//      of bug that survives a listen.
//   3. THE TWO ARRAYS ARE WRITTEN TOGETHER. Notes and lengths go into a section in one
//      operation, and everything that removes, copies or clears notes does the same to
//      their lengths — or a note inherits the length of whatever used to be on its step.
//   4. IT REACHES THE SPEAKERS AND THE EXPORTS. A length is audible through the
//      hand-written voices and the preset rack alike, and a MIDI note-off follows it.
import {
  lenKey, isLenKey, validLen, stepLen, toneLen, deskBank, soloBank, LANE_KEYS,
} from '../src/engine/lanes.js';
import {
  noteCell, noteLength, noteSpan, rollResizable, midiFreq, freqMidi,
} from '../tools/mixer-piano-roll.js';
import { drawnSpan } from '../tools/mixer-bar-grid.js';
import {
  draftOf, writeBarNotes, writeBarNotesShared, entryOf, removeLanes, copyLaneBars,
  readBarLane,
} from '../tools/lib/arrangement-edit.js';
// A length that was PLAYED rather than drawn: the last case in this suite runs a take
// through the recorder and out of the real renderer.
import { createTake } from '../tools/lib/note-recorder.js';
import { bankSource } from '../tools/lib/song-source.js';
import { midiBuffer } from '../tools/lib/render-midi-bank.js';
import { openRenderer } from '../tools/lib/render-bank-browser.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { voicesFor } from '../src/data/voices.js';
import { seq, n } from '../src/engine/notes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const json = (v) => JSON.stringify(v);
const A2 = n('A2');
const row = (midi) => ({ midi, freq: midiFreq(midi) });
const A2ROW = row(freqMidi(A2));
const rest16 = () => new Array(16).fill(null);

// ---- the vocabulary -----------------------------------------------------------------
//
// The key is spelled off the LANE and never off its `*Dur` key. Two seams disagree with
// their lane names, and `chordLen` sitting beside `chords` would be one letter from the
// wrong array for ever.
assert(lenKey('bass') === 'bassLen' && lenKey('chords') === 'chordsLen'
  && lenKey('leadHarm') === 'leadHarmLen' && lenKey('bass2') === 'bass2Len',
  'a lane’s lengths are named after the lane — chordsLen, not chordLen');
assert(isLenKey('bassLen') && !isLenKey('bassDur') && !isLenKey('bass'),
  'and nothing else in a bank ends in Len');
assert(validLen(4) && validLen(0.5) && !validLen(0) && !validLen(-2)
  && !validLen(NaN) && !validLen(Infinity) && !validLen(null) && !validLen('4'),
  'a length is a real, positive number of steps — everything else is not a length');

// ---- absent is unchanged --------------------------------------------------------------
assert(stepLen({ bass: [A2] }, 'bass', 0) === null,
  'a lane with no Len array says nothing about any of its notes');
assert(toneLen(null, 1.8) === 1.8,
  'and what it says nothing about falls through to the lane’s own length, exactly');
assert(toneLen(stepLen({ bassLen: [0] }, 'bass', 0), 1.8) === 1.8
  && toneLen(stepLen({ bassLen: [-3] }, 'bass', 0), 1.8) === 1.8
  && toneLen(stepLen({ bassLen: ['4'] }, 'bass', 0), 1.8) === 1.8,
  'a bad length in a hand-edited bank falls back too, rather than scheduling NaN');
assert(stepLen({ bassLen: [6] }, 'bass', 0) === 6 && toneLen(6, 1.8) === 6,
  'a drawn length overrides the lane’s');
assert(json(stepLen({ chordsLen: [[2, null, 8]] }, 'chords', 0)) === json([2, null, 8]),
  'a chord step keeps one length per tone');
assert(toneLen([2, null, 8], 2.6, 0) === 2 && toneLen([2, null, 8], 2.6, 1) === 2.6
  && toneLen([2, null, 8], 2.6, 2) === 8,
  'and each tone reads its own, with the lane’s length under the gaps');
assert(toneLen(4, 2.6, 2) === 4,
  'a scalar on a chord step is the whole chord — what a hand-written chordsLen means');

// ---- what the roll writes ------------------------------------------------------------
assert(noteLength({ ...A2ROW, chord: false }, null, null, true) === null,
  'a note drawn with no resize has no length of its own — it inherits the lane’s');
assert(noteLength({ ...A2ROW, chord: false }, null, null, true, 4) === 4,
  'a resize writes the length in steps');
assert(noteLength({ ...A2ROW, chord: false }, A2, 4, false) === null,
  'erasing a note takes its length with it');
assert(noteLength({ ...A2ROW, chord: false }, A2, 4, true) === 4,
  'drawing on the note that is already there leaves its length alone — a paint-drag along'
  + ' a row passes over every note in its path, and one that flattened them would quietly'
  + ' undo an afternoon of phrasing');
assert(noteLength({ ...A2ROW, chord: false }, midiFreq(freqMidi(A2) + 7), 4, true) === null,
  'but a DIFFERENT note replacing it is new, and inherits nothing');
const otherFreq = midiFreq(freqMidi(A2) + 7);
assert(noteLength({ ...A2ROW, chord: false }, otherFreq, 4, false) === 4,
  'clearing a row that is not sounding leaves the length alone — the same guard noteCell'
  + ' has, for the same reason');
assert(noteLength({ ...A2ROW, chord: false }, null, null, true, 0) === null
  && noteLength({ ...A2ROW, chord: false }, null, null, true, -1) === null
  && noteLength({ ...A2ROW, chord: false }, null, null, true, NaN) === null,
  'an impossible length is refused at the gesture and never reaches a bank');

// Unequal lengths among simultaneous chord tones, through an edit that re-sorts them.
const third = midiFreq(freqMidi(A2) + 3);
const fifth = midiFreq(freqMidi(A2) + 7);
// The chord is [third, fifth] with the fifth held twice as long; now A2 is drawn UNDER
// both of them, so the sorted array changes shape and the lengths must move with it.
const chordBefore = [third, fifth];
const lensBefore = [2, 8];
const chordAfter = noteCell({ ...A2ROW, chord: true }, chordBefore, true);
const lensAfter = noteLength({ ...A2ROW, chord: true }, chordBefore, lensBefore, true, 4);
assert(json(chordAfter) === json([A2, third, fifth]),
  'drawing under a chord sorts the new tone into it');
assert(json(lensAfter) === json([4, 2, 8]),
  'and the lengths are sorted WITH the frequencies — 4 for the new note, 2 and 8 still'
  + ' on the notes they belonged to');
assert(lensAfter.length === chordAfter.length,
  'so the two arrays stay the same length, which is what makes the pairing readable');
const droppedNotes = noteCell({ ...row(freqMidi(third)), chord: true }, chordAfter, false);
const droppedLens = noteLength({ ...row(freqMidi(third)), chord: true }, chordAfter, lensAfter, false);
assert(json(droppedNotes) === json([A2, fifth]) && json(droppedLens) === json([4, 8]),
  'taking one tone out of a chord takes its length out at the same index');
assert(noteLength({ ...A2ROW, chord: true }, [A2], [4], false) === null,
  'and emptying the chord leaves no lengths at all, not an empty array');
const spread = noteLength({ ...A2ROW, chord: true }, [third, fifth], 6, true, 3);
assert(json(spread) === json([3, 6, 6]),
  'a scalar length spreads onto the tones that remain rather than vanishing on the first edit');
const kept = noteLength({ ...A2ROW, chord: true }, [A2, third], [5, 2], true);
assert(json(kept) === json([5, 2]),
  'a chord tone drawn again keeps its own length, and its neighbours keep theirs');
const allDefault = noteLength({ ...A2ROW, chord: true }, [third], null, true);
assert(allDefault === null,
  'a chord where nobody drew a length writes none — the file stays as clean as it was');

// ---- what the roll draws ---------------------------------------------------------------
assert(noteSpan({ ...A2ROW, chord: false }, A2, 4) === 4,
  'a monophonic note is drawn as long as it is');
assert(noteSpan({ ...A2ROW, chord: true }, [A2, third, fifth], [4, 2, 8]) === 4
  && noteSpan({ ...row(freqMidi(fifth)), chord: true }, [A2, third, fifth], [4, 2, 8]) === 8,
  'and a chord tone is drawn as long as ITS entry, not the chord’s first');
assert(noteSpan({ ...A2ROW, chord: true }, [third], [2]) === null,
  'a row the chord does not contain has nothing to draw');

const field = (ons) => ons.map((on) => ({ on }));
assert(drawnSpan(field([true, false, false, false]), 0, 4) === 4,
  'a four-step note over empty steps is drawn four steps wide');
assert(drawnSpan(field([true, false, true, false]), 0, 4) === 2,
  'truncated at the next note on the row: a rectangle through another note is a drawing'
  + ' of something that is not there');
assert(drawnSpan(field([true, false]), 0, 8) === 2,
  'and at the end of the field, so a long note cannot widen the panel it is drawn in');
assert(drawnSpan(field([true, false, false]), 0, null) === 1
  && drawnSpan(field([true, false, false]), 0, 1) === 1,
  'a note with no length of its own is one step, as every note in the roll was before'
  + ' lengths existed');

// ---- which lanes can be resized at all -------------------------------------------------
assert(rollResizable('bass') && rollResizable('chords') && rollResizable('organChords')
  && rollResizable('bass2'),
  'every lane with a length key can be given one per note, layers included');
assert(!rollResizable('vox') && !rollResizable('shout'),
  'vox and shout cannot: their envelopes are hand-timed in seconds and the word is chosen'
  + ' by step, so there is nowhere for a length to be written. They stay movable.');
assert(!rollResizable('vox2') && !rollResizable('shout2'),
  'and layers of the word lanes stay out too — per-note length now belongs only to the'
  + ' melodic note tracks, not to every pitched lane with a voice seam');

// ---- the write path --------------------------------------------------------------------
const bank = {
  bpm: 120,
  bass: seq('A2 . A2 . . . . . . . . . . . . .'),
  sections: [{ bass: seq('A2 . A2 . . . . . . . . . . . . .') }],
  order: [0, 0],
};
const notes0 = Array.from({ length: 16 }, (_, i) => bank.sections[0].bass[i] ?? null);
// One gesture, both halves: a note drawn on step 4 and a length pulled out on step 0.
const drawn0 = notes0.slice(); drawn0[4] = fifth;
const lens0 = rest16(); lens0[0] = 4;
let d = writeBarNotes(bank, draftOf(bank), 0, 'bass', drawn0, lens0);
let entry = entryOf(bank, d);
assert(entry?.sections?.[0]?.bassLen?.[0] === 4,
  'a length written with the notes lands in the section beside them');
assert(entry.sections[0].bassLen.length === 32 && entry.sections[0].bassLen[2] === null,
  'as a lane-shaped array, so the notes with no length of their own still have none');
assert(entry.sections[0].bass[4] === fifth && entry.sections[0].bass[0] === A2,
  'and the notes go in with it — one write, so nothing can observe new notes against'
  + ' old lengths');

// The null-test property, at the object: nothing in, nothing out.
const untouched = entryOf(bank, writeBarNotes(bank, draftOf(bank), 0, 'bass', notes0));
assert(untouched === null,
  'a write that says nothing about length leaves no Len key — a song nobody resized is'
  + ' byte-identical, which is what keeps the null test exact');
const cleared = entryOf(bank, writeBarNotes(bank, draftOf(bank), 0, 'bass', notes0, rest16()));
assert(cleared === null,
  'and sixteen nulls DELETE the key rather than writing [null × 32], which compactSections'
  + ' cannot drop for us and every song would carry for ever');

// Erase and re-draw on the same step must not resurrect the old length.
let re = writeBarNotes(bank, draftOf(bank), 0, 'bass', notes0, lens0);
const erasedNotes = notes0.slice(); erasedNotes[0] = null;
re = writeBarNotes(bank, re, 0, 'bass', erasedNotes, rest16());
const redrawn = notes0.slice();
re = writeBarNotes(bank, re, 0, 'bass', redrawn, rest16());
assert(entryOf(bank, re)?.sections?.[0]?.bassLen === undefined,
  'erase then re-draw leaves no stale length on the step');

// Shared editing — the gesture the draft plan forgot. Bar 1 is the SECOND half of
// section 0, so its steps land at 16..31 of the lane; that is `laneWith`'s job and this
// only has to look in the right place for it.
const sharedLens = rest16(); sharedLens[2] = 6;
const shared = entryOf(bank, writeBarNotesShared(bank, draftOf(bank), 1, 'bass', notes0, sharedLens));
assert(shared?.sections?.some((s) => s.bassLen?.[18] === 6),
  '“Edit all repeats” carries lengths too — writeBarNotesShared and writeBarNotes must'
  + ' not diverge, or a resize works in one mode and silently does nothing in the other');

// A move across a bar line is two writes, and the length travels with the note.
const moveBank = {
  bpm: 120,
  bass: seq('A2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  order: [0],
};
let moved = draftOf(moveBank);
const emptyFirst = rest16();
moved = writeBarNotes(moveBank, moved, 0, 'bass', rest16(), emptyFirst);
const landing = rest16(); landing[0] = A2;
const landingLens = rest16(); landingLens[0] = 5;
moved = writeBarNotes(moveBank, moved, 1, 'bass', landing, landingLens);
const movedEntry = entryOf(moveBank, moved);
// Two bars, so two forks: each bar gets its own delta holding the whole lane with its
// own half rewritten. The destination's section is the one with a length in it.
const landed = movedEntry.sections.find((s) => s.bassLen);
const left = movedEntry.sections.find((s) => s !== landed);
assert(landed.bassLen[16] === 5 && landed.bass[16] === A2,
  'a note moved into the next bar arrives with its length');
assert(left.bass[0] === null && !validLen(left.bassLen?.[0]),
  'and leaves neither a note nor a length behind it');

// ---- everything else that touches a lane -----------------------------------------------
const withLens = { sections: [{ bass: [A2], bassLen: [4], lead: [A2], leadLen: [2] }], plan: [] };
const stripped = removeLanes(withLens, ['bass']);
assert(stripped.sections[0].bass === undefined && stripped.sections[0].bassLen === undefined,
  'deleting a track deletes its lengths — or adding it back gives the new one the old'
  + ' one’s note lengths, for notes that are not there');
assert(stripped.sections[0].leadLen?.[0] === 2, 'and leaves the other lanes alone');

const clipBank = {
  bpm: 120,
  bass: seq('A2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bassLen: [7, ...new Array(31).fill(null)],
  order: [0],
};
const clip = copyLaneBars(clipBank, draftOf(clipBank), 0, 0, 'bass');
assert(clip.lengths?.[0]?.[0] === 7,
  'a copied clip carries the lengths of the notes in it');
const emptyClip = copyLaneBars({ bpm: 120, bass: seq('A2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'), order: [0] },
  draftOf({ bpm: 120, bass: [], order: [0] }), 0, 0, 'bass');
assert(Array.isArray(emptyClip.lengths) && emptyClip.lengths[0].every((v) => v === null),
  'and a clip from a part with no lengths says so explicitly, so a paste CLEARS the'
  + ' destination rather than landing new notes on old lengths');

// A duplicated track is a double: same notes, same lengths.
const layered = deskBank({ bass: [A2, A2], bassLen: [4, null] },
  { layers: [{ key: 'bass2', from: 'bass' }] });
assert(layered.bass2 === layered.bass && layered.bass2Len === layered.bassLen,
  'a layer plays the source lane’s notes AT ITS LENGTHS — without this a duplicated bass'
  + ' throws every drawn length away and reads as the copy being wrong');
// Shared by reference, which is the point — and safe, because every write clones. A
// layer whose lengths are edited must not drag the lane it was copied from with it.
const layerBank = {
  bpm: 120,
  ...deskBank({
    bass: seq('A2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    bassLen: [4, ...new Array(31).fill(null)],
  }, { layers: [{ key: 'bass2', from: 'bass' }] }),
  order: [0],
};
const layerLens = rest16(); layerLens[0] = 9;
const layerEdit = writeBarNotes(layerBank, draftOf(layerBank), 0, 'bass2',
  Array.from({ length: 16 }, (_, i) => layerBank.bass2[i] ?? null), layerLens);
const layerSection = entryOf(layerBank, layerEdit).sections.find((s) => s.bass2Len);
assert(layerSection.bass2Len[0] === 9 && layerBank.bassLen[0] === 4,
  'a layer’s lengths can then be edited on their own — the arrays are shared by'
  + ' reference and every write clones, so the source lane keeps its own');

const deleted = deskBank({ bass: [A2], bassLen: [4] }, { off: ['bass'] });
assert(deleted.bass === undefined && deleted.bassLen === undefined,
  'and a deleted track takes its lengths out of the bank with it');

const solo = soloBank({ bpm: 120, bass: [A2, A2], bassLen: [4, 9] }, 'bass', A2, 1);
assert(solo.bassLen === undefined,
  'the keyboard’s preview has no lengths at all: a preview happens at no step of the song,'
  + ' so the key you press must not sound for as long as whatever lives on step 1');

// ---- the file ---------------------------------------------------------------------------
const src = bankSource({ bass: seq('A2 . A2 .'.padEnd(0) + ' . . . . . . . . . . . .'), bassLen: [4, ...new Array(31).fill(null)] });
assert(/bassLen: \[4,/.test(src),
  'lengths are written as plain numbers — never through seq(), which would put a line in'
  + ' the file that reads as music and is not');
assert(/bass: seq\(/.test(src), 'while the notes beside them keep their shorthand');

// The round trip, through a real file: what the desk writes below its marker has to come
// back as the same arrangement, or a saved resize is a resize you lose on reload.
const dir = mkdtempSync(join(tmpdir(), 'mash-len-'));
const file = join(dir, 'arrangement.mjs');
const saved = entryOf(bank, writeBarNotes(bank, draftOf(bank), 0, 'bass', drawn0, lens0));
// The note helpers come with it, because a 32-step section lane still serialises as
// `seq(...)` — the lengths beside it are the only thing here written as plain numbers.
const notesUrl = pathToFileURL(new URL('../src/engine/notes.js', import.meta.url).pathname).href;
writeFileSync(file,
  `import { seq, chordSeq } from ${JSON.stringify(notesUrl)};\n`
  + `export const arrangement = ${bankSource(saved)};\n`);
const reloaded = (await import(pathToFileURL(file).href)).arrangement;
assert(json(reloaded) === json(saved),
  'and a saved arrangement reloads as exactly what was saved — lengths included');
assert(reloaded.sections[0].bassLen[0] === 4,
  'with the length still on the note it was drawn on');

// ---- MIDI export -------------------------------------------------------------------------
//
// The note-off follows the rectangle. Two exports of one bank, one with a length and one
// without, must differ — and the one with it must be longer by exactly what was drawn.
const midiBank = {
  bpm: 120,
  bass: [A2, ...new Array(31).fill(null)],
  order: [0],
};
const plain = midiBuffer(midiBank, { title: 'plain' });
const held = midiBuffer({ ...midiBank, bassLen: [8, ...new Array(31).fill(null)] }, { title: 'held' });
// `midiBuffer` hands back a Uint8Array now — it is bundled into the deployed desk,
// where Node's Buffer does not exist — so the comparison wraps it here, on the Node
// side, where Buffer is fine.
assert(plain.buffer.length !== held.buffer.length
  || !Buffer.from(plain.buffer).equals(Buffer.from(held.buffer)),
  'a drawn length changes the exported MIDI — a note-off derived from the lane alone'
  + ' would export every note the same length whatever the roll shows');
const lastTick = (info, name) => (info.tracks || []).find((w) => w.name === name)?.lastTick;
assert(lastTick(held, 'Bass') > lastTick(plain, 'Bass'),
  'and the held note’s note-off is later than the lane default’s');
assert(lastTick(plain, 'Bass') === Math.round(1.8 * 24),
  'while a note nobody resized still ends where bassDur says (1.8 steps at 24 ticks each)');

// ---- and it is audible -------------------------------------------------------------------
//
// Everything above is what the file says. This is what comes out of the speakers, offline
// in the same Chromium the null test uses — because a length that reads correctly and does
// not change the sound is the one bug none of the assertions above can see.
const A2LANE = () => [A2, ...new Array(31).fill(null)];
const energy = (r) => r.outL.reduce((t, v) => t + v * v, 0);
// Loudest instantaneous sample. The right measure for "is another oscillator running":
// total energy over a window is interference-dominated between close pitches — two
// sines a third apart can carry LESS energy than a different pair, while the peak of
// the summed waveform still rises with every voice added.
const peak = (r) => r.outL.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const same = (a, b) => a.outL.length === b.outL.length
  && a.outL.every((v, i) => v === b.outL[i]);

const renderer = await openRenderer();
try {
  const play = (bank) => renderer.render({ bpm: 120, ...bank }, { repeat: 1, mix: null, trackId: null });

  // The exactness claim, at the sample. `bassDur` defaults to 1.8 steps, so a drawn
  // length of 1.8 must be the same render — not nearly, exactly. If this drifts, the
  // arithmetic in `noteSeconds` has been reassociated and the null test is next.
  const plainBass = await play({ bass: A2LANE() });
  const sameBass = await play({ bass: A2LANE(), bassLen: [1.8, ...new Array(31).fill(null)] });
  assert(same(plainBass, sameBass),
    'a drawn length equal to the lane’s own renders bit-identically — absolute steps,'
    + ' and no arithmetic between the roll and the oscillator');

  const heldBass = await play({ bass: A2LANE(), bassLen: [6, ...new Array(31).fill(null)] });
  assert(energy(heldBass) > energy(plainBass) * 1.5,
    `a note drawn six steps long sounds for longer through the hand-written voice`
    + ` (energy ${energy(heldBass).toFixed(1)} against ${energy(plainBass).toFixed(1)})`);

  // The same note through the PRESET path, which is a different line of code entirely:
  // playVoice hands the rack a length in seconds and the lane block never runs.
  const preset = voicesFor('bass').find((v) => v.kind === 'tone');
  const plainVoice = await play({ bass: A2LANE(), bassVoice: preset.id });
  const heldVoice = await play({
    bass: A2LANE(), bassVoice: preset.id, bassLen: [8, ...new Array(31).fill(null)],
  });
  assert(energy(heldVoice) > energy(plainVoice) * 1.5,
    `${preset.id} plays it longer too — the preset path reads the same key`
    + ` (energy ${energy(heldVoice).toFixed(1)} against ${energy(plainVoice).toFixed(1)})`);

  // WHEN a note sounds, through the same two paths. The lane block reaches the clock
  // through `scheduleAt`; `playVoice` builds its own time from `nextTime` and an offset,
  // and for a while that offset carried the per-bar lane nudge but not the song's swing.
  // The lane went on shuffling and the identical lane with a preset on it played dead
  // straight — invisible unless you had assigned a voice, which on hats everybody has.
  const HATS = () => new Array(32).fill(true);
  const hatPreset = voicesFor('hats').find((v) => v.kind === 'noise');
  const straightPlain = await play({ hats: HATS() });
  const swungPlain = await play({ hats: HATS(), swing: 200 / 3 });
  assert(!same(straightPlain, swungPlain),
    'swing moves the hand-written hats off the grid');

  const straightVoiced = await play({ hats: HATS(), hatsVoice: hatPreset.id });
  const swungVoiced = await play({ hats: HATS(), hatsVoice: hatPreset.id, swing: 200 / 3 });
  assert(!same(straightVoiced, swungVoiced),
    `and the same hats through ${hatPreset.id} — the preset path takes its own route to`
    + ' the clock, and it has to arrive at the same time the lane block would');

  // Straight is not "nearly straight": 50 is the grid, at the sample. This is the same
  // claim the null test makes for the whole engine, made here where a failure names the
  // path that broke it.
  assert(same(straightVoiced, await play({ hats: HATS(), hatsVoice: hatPreset.id, swing: 50 })),
    'a swing of 50 through the preset path is bit-identical to no swing at all');

  // Unequal lengths among simultaneous chord tones: the whole reason the lengths are per
  // tone rather than per onset.
  const chordLane = () => [[A2, third, fifth], ...new Array(31).fill(null)];
  const shortChord = await play({ chords: chordLane(), chordsLen: [[1, 1, 1], ...new Array(31).fill(null)] });
  const oneHeld = await play({ chords: chordLane(), chordsLen: [[1, 1, 10], ...new Array(31).fill(null)] });
  assert(energy(oneHeld) > energy(shortChord) * 1.4,
    `one tone of a chord can outlast the others`
    + ` (energy ${energy(oneHeld).toFixed(1)} against ${energy(shortChord).toFixed(1)})`);

  // Numeric "transpose all" used to take every array-valued key of the bank and multiply
  // its numbers by 2^(n/12). It survived only because the arrays it reached were harmless;
  // a length array is not, and an octave up would have doubled every note's LENGTH along
  // with its pitch. So: a bar transposed up an octave must render exactly as the same bar
  // written an octave higher.
  const held8 = [8, ...new Array(31).fill(null)];
  const shifted = await play({
    bass: A2LANE(), bassLen: held8, order: [{ transpose: 12 }],
  });
  const written = await play({
    bass: [A2 * 2, ...new Array(31).fill(null)], bassLen: held8, order: [{}],
  });
  assert(same(shifted, written),
    'a transposed bar changes pitch and nothing else — the lengths are not frequencies');

  // ---- and a length that was PLAYED, not drawn ------------------------------------
  //
  // Recording captures how long a key was held and writes it here, so the last claim of
  // this suite is the one that closes the loop: a take goes through the real recorder,
  // the real chained write, and comes out of the real renderer sounding longer. Written
  // correctly and inaudible is the failure mode the object-level assertions in
  // tests/note-recorder.js cannot see.
  const recorded = async (hold) => {
    const bank = { bpm: 120, sections: [{ bass: new Array(32).fill(null) }] };
    let d = draftOf(bank);
    const take = createTake({ read: (bar, key) => readBarLane(bank, d, bar, key) });
    const t = take.add({ bar: 0, lane: 'bass', step: 0, midi: freqMidi(A2), freq: A2 });
    if (hold) take.close(t, hold);
    for (const e of take.entries()) {
      d = writeBarNotesShared(bank, d, e.bar, e.lane, e.notes16, e.lengths16);
    }
    const entry = entryOf(bank, d);
    return play({ ...bank, sections: [...bank.sections, ...entry.sections], order: entry.order });
  };
  // ---- a chord on a lane that is not a chord lane ---------------------------------
  //
  // `CHORD_LANES` names the two lanes whose hand-written playback loops over the step.
  // The rack does not care: "the same sound is one voice on a bass lane and five on a
  // chord lane". So a preset-voiced `lead` holding an array must sound as a chord, and
  // sound like the same chord on a real chord lane — otherwise recording a pad into a
  // new song writes a bank the engine plays wrong.
  const chordOn = (lane, extra) => play({
    [lane]: [[A2, third, fifth], ...new Array(31).fill(null)], ...extra,
  });
  const oneOn = (lane, extra) => play({
    [lane]: [[A2], ...new Array(31).fill(null)], ...extra,
  });
  const leadOne = await oneOn('lead', { leadVoice: 'fmBell' });
  const leadChord = await chordOn('lead', { leadVoice: 'fmBell' });
  assert(energy(leadChord) > energy(leadOne) * 1.8,
    `a chord on a PRESET-voiced lead sounds as three notes, not one`
    + ` (energy ${energy(leadChord).toFixed(1)} against ${energy(leadOne).toFixed(1)})`);
  // And on the ENGINE voice too, which is the whole point of the loops in scheduleStep:
  // `play()` builds an oscillator per call, so a chord is three calls. Without them a
  // lead had to be given a preset before it could hold a chord — a rule that contradicted
  // what anybody could hear by pressing two keys at once.
  //
  // Asserted as a MONOTONIC rise across one, two and three tones rather than against a
  // ratio. Three sines a third apart do not sum to three times the energy of one — they
  // interfere — so a threshold picked to look right is a threshold that means nothing.
  // "Each tone you add is audible" is the actual claim.
  for (const lane of ['lead', 'bass', 'twinkle']) {
    const at = async (tones) => peak(await play({
      [lane]: [tones.length === 1 ? tones[0] : tones, ...new Array(31).fill(null)],
    }));
    const one = await at([A2]);
    const two = await at([A2, third]);
    const three = await at([A2, third, fifth]);
    assert(two > one * 1.2 && three > two * 1.05,
      `every tone added to a chord on the ENGINE-voiced ${lane} is another oscillator`
      + ` (peak ${one.toFixed(3)} -> ${two.toFixed(3)} -> ${three.toFixed(3)})`);
  }
  const chordsOne = await oneOn('chords', { chordsVoice: 'fmBell' });
  const chordsChord = await chordOn('chords', { chordsVoice: 'fmBell' });
  const ratio = (a, b) => energy(a) / energy(b);
  assert(Math.abs(ratio(leadChord, leadOne) - ratio(chordsChord, chordsOne)) < 0.05,
    'and it thickens by the same ratio as the identical chord on a real chord lane —'
    + ' the rack is lane-agnostic, so there is one polyphony rule and not two');
  // The other half of the claim, and the reason `polyLane` needs the bank: an
  // engine-voiced lane is hand-written `play(b.lead[s], …)` and must be left alone.
  const engineLead = await play({ lead: A2LANE() });
  assert(energy(engineLead) > 0,
    'while a single note on any of them still renders exactly as before — tests/null-test'
    + ' checks that claim at the sample, across two whole songs');

  const stab = await recorded(null);
  const sustained = await recorded(6);
  assert(energy(stab) > 0,
    'a note played into an empty lane sounds at all — the take reached the speakers');
  assert(energy(sustained) > energy(stab) * 1.5,
    `and a key held six steps rings for longer than one that was stabbed`
    + ` (energy ${energy(sustained).toFixed(1)} against ${energy(stab).toFixed(1)}),`
    + ` so a captured note-off is audible rather than merely written`);
} finally {
  await renderer.close();
}

console.log(failed ? 'NOTE DURATION: FAILED' : 'NOTE DURATION: PASSED');
process.exit(failed ? 1 : 0);
