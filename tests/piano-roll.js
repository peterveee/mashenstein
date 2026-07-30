// The piano roll's note semantics, and the arrangement write underneath them.
//
// The panel is DOM and is checked by hand; this is the part that decides what a note
// IS, which is not a matter of taste. Three step shapes live in a bank — a frequency,
// an array of them, or a boolean — and a roll that wrote the wrong one does not draw
// badly, it writes a bank that throws inside scheduleStep (see src/data/voices.js on
// the bare-number-on-a-chord-lane hazard) or a file that has quietly changed shape.
//
// So this pins:
//
//   1. what a cell becomes when drawn and cleared, monophonic and chordal
//   2. that clearing is row-local — an eraser dragged along one row must not take out
//      the notes above and below it, which a naive `on ? freq : null` would
//   3. that the roll only offers lanes it can honestly draw
//   4. that the whole thing lands in the arrangement, through the same writeBarNotes
//      the step grid uses, without touching the composition
import { noteCell, noteOn, pitchRows, laneSpan, autoRange, keyGeometry, midiFreq, freqMidi, rollEditable }
  from '../tools/mixer-piano-roll.js';
import { draftOf, writeBarNotes, entryOf } from '../tools/lib/arrangement-edit.js';
import { seq, n } from '../src/engine/notes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const A2 = n('A2');
const row = (midi) => ({ midi, freq: midiFreq(midi) });
const A2ROW = row(freqMidi(A2));

// ---- pitch <-> semitone --------------------------------------------------------
assert(freqMidi(midiFreq(57)) === 57 && freqMidi(A2) === 45,
  'a semitone survives the trip to hertz and back');

// ---- monophonic cells -----------------------------------------------------------
assert(noteCell({ ...A2ROW, chord: false }, null, true) === A2ROW.freq,
  'drawing on an empty step puts the row’s note there');
assert(noteCell({ ...A2ROW, chord: false }, A2ROW.freq, false) === null,
  'clearing the note you drew leaves a rest');
// The one that a naive implementation gets wrong.
const other = midiFreq(freqMidi(A2) + 7);
assert(noteCell({ ...A2ROW, chord: false }, other, false) === other,
  'clearing a row that is not sounding leaves the step alone — an eraser dragged along'
  + ' one row must not take out the note two rows up');
assert(noteCell({ ...A2ROW, chord: false }, other, true) === A2ROW.freq,
  'a monophonic lane holds one note, so drawing replaces what was there');
assert(noteCell({ ...A2ROW, chord: false }, null, false) === null,
  'clearing an empty step is a rest, not a false — that is a percussion lane’s rest');

// ---- chord cells ------------------------------------------------------------------
const third = midiFreq(freqMidi(A2) + 3);
const fifth = midiFreq(freqMidi(A2) + 7);
const stacked = noteCell({ ...A2ROW, chord: true }, [third], true);
assert(Array.isArray(stacked) && stacked.length === 2 && stacked.includes(A2ROW.freq)
  && stacked.includes(third),
  'a chord lane STACKS: drawing adds a note rather than replacing the chord');
assert(stacked[0] < stacked[1],
  'and the array comes out sorted, so two routes to one chord write one file');
const unstacked = noteCell({ ...A2ROW, chord: true }, [A2ROW.freq, fifth], false);
assert(Array.isArray(unstacked) && unstacked.length === 1 && unstacked[0] === fifth,
  'clearing takes only that note out of the chord');
assert(noteCell({ ...A2ROW, chord: true }, [A2ROW.freq], false) === null,
  'and emptying the last one leaves a rest, not an empty array');
assert(noteCell({ ...A2ROW, chord: true }, null, true)[0] === A2ROW.freq,
  'drawing on a silent chord lane starts a chord — never a bare number, which throws'
  + ' inside scheduleStep');

// ---- reading a step back ----------------------------------------------------------
assert(noteOn(A2ROW, A2) && !noteOn(A2ROW, fifth), 'a melodic step lights its own row');
assert(noteOn(A2ROW, [fifth, A2]) && !noteOn(A2ROW, [fifth]),
  'a chord lights every row it contains');
assert(!noteOn(A2ROW, null) && !noteOn(A2ROW, true) && !noteOn(A2ROW, false),
  'a rest lights nothing, and neither does a percussion hit — it has no pitch to plot');

// ---- which lanes the roll offers ----------------------------------------------------
assert(rollEditable('bass') && rollEditable('lead') && rollEditable('chords')
  && rollEditable('bass2'),
  'melodic and chordal lanes are editable, layers included');
assert(!rollEditable('kick') && !rollEditable('snare') && !rollEditable('hats'),
  'percussion belongs to the step grid, which has no pitch axis to get wrong');
assert(!rollEditable('keyGliss') && !rollEditable('gliss') && !rollEditable('organSwoop'),
  'the gesture lanes are left out: their timing is internal, so a note in a roll would'
  + ' misrepresent what they play');

// ---- the rows and the range -----------------------------------------------------------
const rows = pitchRows(48, 72);
assert(rows.length === 25 && rows[0] === 72 && rows.at(-1) === 48,
  'a range of rows, highest first');

// The span is taken over the WHOLE song, sections included — a range derived from the
// bar on screen is what made showBar's roll unwritable, and it would move under the
// pointer every time you paged to the next bar.
const song = {
  bass: seq('A2 . . . . . . . . . . . . . . .'),
  sections: [{ bass: seq('C3 . . . . . . . . . . . . . . .') },
             { bass: seq('F2 . . . . . . . . . . . . . . .') }],
};
const span = laneSpan(song, 'bass');
assert(span.low === freqMidi(n('F2')) && span.high === freqMidi(n('C3')),
  'the span reaches into the sections, not just the top-level lane');
assert(laneSpan({ chords: [[n('A3'), n('E4')]] }, 'chords').high === freqMidi(n('E4')),
  'and a chord counts every note in the stack');
assert(laneSpan({}, 'bass') === null, 'a silent lane has no span at all');

const auto = autoRange(song, 'bass');
assert(auto.low <= span.low && auto.high >= span.high,
  'and it contains every note the part plays');
assert(auto.high - auto.low + 1 >= 25,
  'with at least two octaves of it, so there is always somewhere to write');
const tight = autoRange({ bass: seq('A2 . . . . . . . . . . . . . . .') }, 'bass');
assert(tight.high - tight.low + 1 >= 25,
  'a one-note part still gets room rather than a single row');
const silent = autoRange({}, 'bass');
assert(silent.high - silent.low === 24,
  'a lane with nothing in it still opens somewhere playable');

// ---- the keyboard's geometry ----------------------------------------------------------
// Seven white keys span twelve semitones, so a real board's whites are uneven. If they
// tile the octave exactly then the column is a keyboard; if they are all one row tall it
// is twelve equal bars, which is what equal heights looked like and why they went back.
const ROW = 19;
const octave = [...Array(12).keys()].map((pc) => keyGeometry(60 + pc, ROW));
const whites = octave.filter((k) => !k.black);
const blacks = octave.filter((k) => k.black);
assert(whites.length === 7 && blacks.length === 5,
  'twelve semitones are seven white keys and five black ones');
assert(whites.reduce((t, k) => t + k.height, 0) === 12 * ROW,
  'and the whites tile the octave exactly — no gaps, no overlaps');
assert(blacks.every((k) => k.height === ROW && k.top === 0),
  'a black key is one row, on its own row: no note is harder to hit than any other');
assert(keyGeometry(60, ROW).height === ROW * 1.5 && keyGeometry(60, ROW).top === -ROW / 2,
  'C reaches up into C# and stops where B meets it');
assert(keyGeometry(62, ROW).height === ROW * 2,
  'D has a black key either side, so it is two rows tall');
assert(keyGeometry(64, ROW).height === ROW * 1.5 && keyGeometry(64, ROW).top === 0,
  'E reaches down into D# and stops where F meets it');

// The range opens with the part at the BOTTOM of the window and room above it, rather
// than snapped to an octave that leaves the part floating in the middle.
const bassish = { bass: seq('F2 . . . C3 . . . . . . . . . . .') };
const opened = autoRange(bassish, 'bass');
const lowest = laneSpan(bassish, 'bass').low;
assert(opened.low === lowest - 2,
  'the bottom row is a tone under the lowest note the part plays');
assert(opened.high >= laneSpan(bassish, 'bass').high,
  'and the top still contains the highest');

// ---- and it lands in the arrangement ----------------------------------------------
const bank = {
  bpm: 120,
  bass: seq('A2 . . . . . . . . . . . . . . .'),
  sections: [{ bass: seq('A2 . . . . . . . . . . . . . . .') }],
  order: [0, 0],
};
const before = JSON.stringify(bank.sections[0].bass);
let d = draftOf(bank);
// Draw a fifth on step 4 of bar 1, the way the panel does: read the bar, change one
// cell, hand back sixteen values.
const bar0 = Array.from({ length: 16 }, (_, i) => bank.sections[0].bass[i] ?? null);
bar0[4] = noteCell({ ...row(freqMidi(A2) + 7), chord: false }, bar0[4], true);
d = writeBarNotes(bank, d, 0, 'bass', bar0);
const entry = entryOf(bank, d);
assert(entry && entry.sections?.length === 1 && entry.sections[0].base === 0,
  'the edit becomes a layer section — a delta over what the bar already played');
assert(entry.sections[0].bass[4] === midiFreq(freqMidi(A2) + 7),
  'carrying the note that was drawn');
assert(entry.sections[0].bass[0] === A2,
  'and keeping the rest of the bar it inherited');
assert(JSON.stringify(bank.sections[0].bass) === before,
  'while the composition is untouched — the desk never rewrites a bank');

console.log(failed ? 'PIANO ROLL: FAILED' : 'PIANO ROLL: PASSED');
process.exit(failed ? 1 : 0);
