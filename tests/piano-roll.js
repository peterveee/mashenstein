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
import {
  noteCell, noteOn, pitchRows, laneSpan, autoRange, keyboardRange, keyGeometry,
  pianoRowHeight, pianoKeyPhase, pianoLayout, noteActiveAt,
  midiFreq, freqMidi, rollEditable, noteDrawLength, noteLength, noteSpan,
  ROLL_TOOLS, ROLL_TOOL_IDS, rollTool,
  NOTE_LENGTH_OPTIONS,
} from '../tools/mixer-piano-roll.js';
import {
  gestureFor, noteKey, movedNote, clampDelta, stretched, MIN_NOTE_LENGTH, quantiseLength, drawnSpan,
  centeredRangeOffset, displayCols,
} from '../tools/mixer-bar-grid.js';
import { draftOf, writeBarNotes, entryOf } from '../tools/lib/arrangement-edit.js';
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

// `null` first and default: a short click draws a note one snap division long, so the
// thing you draw is the division you chose to draw it on. The triplet values are here
// for the times you want a 1/16T note on a 1/16 snap, which is the case the picker is
// still for.
assert(JSON.stringify(NOTE_LENGTH_OPTIONS) === JSON.stringify([
  { value: null, label: 'Snap' },
  { value: 1 / 3, label: '1/32T' },
  { value: 0.5, label: '1/32' },
  { value: 2 / 3, label: '1/16T' },
  { value: 1, label: '1/16' },
  { value: 4 / 3, label: '1/8T' },
  { value: 2, label: '1/8' },
  { value: 8 / 3, label: '1/4T' },
  { value: 4, label: '1/4' },
  { value: 8, label: '1/2' },
  { value: 16, label: '1' },
]), 'new-note lengths run 1/32T to a whole note, defaulting to the snap division');

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
const stackedLegacy = noteCell({ midi: freqMidi(third), freq: third, chord: true }, A2ROW.freq, true);
assert(Array.isArray(stackedLegacy) && stackedLegacy.length === 2
  && stackedLegacy.includes(A2ROW.freq) && stackedLegacy.includes(third),
  'switching a mono lane to Poly keeps its existing scalar note when adding a second pitch');
assert(noteSpan({ midi: freqMidi(A2), chord: true }, A2ROW.freq, 4) === 4,
  'a legacy scalar note remains visible at its stored length in Poly');
assert(JSON.stringify(noteLength({ midi: freqMidi(third), freq: third, chord: true }, A2ROW.freq, 4, true, 4))
  === JSON.stringify([4, 4]),
  'adding a Poly pitch preserves the legacy scalar note length');
const unstacked = noteCell({ ...A2ROW, chord: true }, [A2ROW.freq, fifth], false);
assert(Array.isArray(unstacked) && unstacked.length === 1 && unstacked[0] === fifth,
  'clearing takes only that note out of the chord');
assert(noteCell({ ...A2ROW, chord: true }, [A2ROW.freq], false) === null,
  'and emptying the last one leaves a rest, not an empty array');
assert(noteCell({ ...A2ROW, chord: true }, null, true)[0] === A2ROW.freq,
  'drawing on a silent chord lane starts a chord — never a bare number, which throws'
  + ' inside scheduleStep');
assert(noteDrawLength({ lane: 'chords', midi: freqMidi(A2) }, null, null) === null,
  'an empty chord cell has no draw length and can start a drag safely');

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

// ---- and the rows themselves are the whole instrument ---------------------------
//
// `autoRange` says where to OPEN. What you can reach is every key there is: a part whose
// lowest note is C2 still has a C1 to click on, because the note you want next is as
// often below the part as inside it. The old roll derived its rows from the part and
// therefore refused exactly that note.
const keys = keyboardRange(song, 'bass');
assert(keys.low === 21 && keys.high === 108,
  'the roll spans A0 to C8 — an eighty-eight key piano, whatever the part plays');
assert(pitchRows(keys.low, keys.high).length === 88, 'which is eighty-eight rows');
const deep = keyboardRange({ bass: [midiFreq(9)] }, 'bass');
assert(deep.low === 9,
  'and widens for a bank holding something off the end of the keyboard — a note that'
  + ' exists must be reachable, or the roll is lying about the part');

// Selection focus uses the same rule on time and pitch: a small range fits whole,
// while a range wider than the viewport exposes its useful middle.
assert(centeredRangeOffset(100, 122, 60) === 81,
  'a short selected range is centred with all of it visible');
assert(centeredRangeOffset(100, 300, 60) === 170,
  'a range wider than the viewport centres its middle instead of overscrolling');

// ---- the keyboard's geometry ----------------------------------------------------------
// The white faces remain equal, while the chromatic rows are grouped: five rows from
// C through E fill three white-key heights, and seven rows from F through B fill four.
const ROW = 19;
const octave = [...Array(12).keys()].map((pc) => keyGeometry(60 + pc, ROW));
const whites = octave.filter((k) => !k.black);
const blacks = octave.filter((k) => k.black);
assert(whites.length === 7 && blacks.length === 5,
  'twelve semitones are seven white keys and five black ones');
const whiteHeight = ROW * (12 / 7);
assert(whites.every((k) => k.height === whiteHeight),
  'every white key has the same physical height');
assert(Math.abs(whites.reduce((t, k) => t + k.height, 0) - ROW * 12) < 1e-9,
  'seven white keys tile the twelve-semitone octave');
const blackPitchRatio = 26 / 39;
const blackHeight = whiteHeight * blackPitchRatio;
assert(blacks.every((k) => k.height === blackHeight),
  'black keys use the physical keyboard pitch width');
const geometryAt = (unit) => {
  const w = unit * (12 / 7);
  const ce = pianoRowHeight(60, unit);
  const fb = pianoRowHeight(65, unit);
  const layout = pianoLayout(60, 72, unit);
  const byMidi = new Map(layout.rows.map((row) => [row.midi, row]));
  const rowTop = (midi) => layout.before + byMidi.get(midi).top;
  const rowBottom = (midi) => rowTop(midi) + byMidi.get(midi).height;
  const keyTop = (midi) => rowTop(midi) + byMidi.get(midi).keyFace.top;
  const keyBottom = (midi) => keyTop(midi) + byMidi.get(midi).keyFace.height;
  const descendingWhites = [72, 71, 69, 67, 65, 64, 62, 60];
  const blackSeams = new Map([[70, 2], [68, 3], [66, 4], [63, 6], [61, 7]]);
  return {
    w, ce, fb, layout, byMidi, rowTop, rowBottom, keyTop, keyBottom,
    descendingWhites, blackSeams,
  };
};

for (const unit of [12, ROW, 30]) {
  const g = geometryAt(unit);
  assert(Math.abs(5 * g.ce - 3 * g.w) < 1e-9
    && Math.abs(7 * g.fb - 4 * g.w) < 1e-9,
    `unit ${unit}: C–E and F–B rows end flush with equal white-key spans`);
  assert(Math.abs(5 * g.ce + 7 * g.fb - 12 * unit) < 1e-9,
    `unit ${unit}: grouped rows preserve one octave's total height`);
  assert(Math.abs(pianoKeyPhase(unit) - (g.ce - g.w)) < 1e-9,
    `unit ${unit}: the key phase is derived from the C–E group, not a fixed pixel offset`);
  assert(Math.abs(g.rowBottom(60) - g.keyBottom(60)) < 1e-9
    && Math.abs(g.rowBottom(65) - g.keyBottom(65)) < 1e-9,
    `unit ${unit}: C and F row bottoms meet their key bottoms`);
  assert(Math.abs(g.rowTop(71) - g.keyTop(71)) < 1e-9
    && Math.abs(g.rowTop(64) - g.keyTop(64)) < 1e-9,
    `unit ${unit}: B and E row tops meet their key tops`);
  assert(g.descendingWhites.every((midi, i) => Math.abs(g.keyTop(midi) - i * g.w) < 1e-9),
    `unit ${unit}: equal white faces tile the octave after the phase correction`);
  assert([...g.blackSeams].every(([midi, seam]) => {
    const row = g.byMidi.get(midi);
    return Math.abs(g.rowTop(midi) + row.keyFace.top + row.keyFace.height / 2 - seam * g.w) < 1e-9;
  }), `unit ${unit}: black keys remain centred over their white-key seams`);
}

const standard = pianoLayout(21, 108, ROW);
const expanded = pianoLayout(9, 120, ROW);
assert(standard.before > 0 && standard.after > 0,
  'the standard 88-key range has room for both end-key faces');
assert(expanded.before > 0 && expanded.after > 0,
  'an expanded range also derives complete end-key padding');

assert(noteActiveAt(3.8, 0, 3, 1), 'a key lights for the sixteenth where its note begins');
assert(noteActiveAt(5.2, 0, 3, 4), 'and remains lit across the note rectangle’s full length');
assert(!noteActiveAt(7, 0, 3, 4) && !noteActiveAt(null, 0, 3, 4),
  'the key goes dark at note-off and whenever playback stops');
assert(noteActiveAt(0.5, 0, 1, 1, 32) && !noteActiveAt(0, 0, 1, 1, 32),
  'a 1/32 onset lights on its half-sixteenth, not on the preceding grid line');
// A drawn column stopped being a stored slot at Stage 4b, and `--len` counts COLUMNS.
// Two columns of a 48-slot song drawn sixteen to the bar is six slots, so the key stays
// lit for a full eighth note rather than going dark a third of the way through it.
assert(noteActiveAt(1.9, 0, 0, 2, 48, 16) && !noteActiveAt(2.1, 0, 0, 2, 48, 16),
  'a note two DRAWN columns long lights its key for two columns, not for two slots');

// The range opens with the part at the BOTTOM of the window and room above it, rather
// than snapped to an octave that leaves the part floating in the middle.
const bassish = { bass: seq('F2 . . . C3 . . . . . . . . . . .') };
const opened = autoRange(bassish, 'bass');
const lowest = laneSpan(bassish, 'bass').low;
assert(opened.low === lowest - 2,
  'the bottom row is a tone under the lowest note the part plays');
assert(opened.high >= laneSpan(bassish, 'bass').high,
  'and the top still contains the highest');

// ---- what a press does -------------------------------------------------------------
//
// The interaction model as a table. Auto is modeless and reads the press; the named
// tools each do one thing, so that neither a held modifier nor a six-pixel target is
// ever the only way to reach a gesture.
const press = (o) => gestureFor({ sizeable: true, ...o });
assert(press({ on: false }) === 'draw' && press({ on: true }) === 'move'
  && press({ on: true, edge: true }) === 'resize',
  'Auto reads where you pressed: empty draws, a note moves, its right end resizes');
assert(press({ on: true, edge: true, sizeable: false }) === 'move',
  'except on a lane with no length to give — vox and shout move but do not stretch');
assert(press({ alt: true, on: false }) === 'run' && press({ alt: true, on: true }) === 'run',
  '⌥ is the momentary Paint, whatever is under it and whatever mode you are in');
assert(press({ tool: 'draw', on: false }) === 'draw'
  && press({ tool: 'draw', on: true }) === 'resize',
  'Draw makes notes and takes hold of their length — it never moves one');
assert(press({ tool: 'draw', on: true, sizeable: false }) === 'run',
  'and on a lane with no length, drawing over a note is the plain toggle it always was');
assert(press({ tool: 'paint', on: false }) === 'run' && press({ tool: 'paint', on: true }) === 'run',
  'Paint is the step grid’s drag: a run of separate notes, or a run rubbed out');
assert(press({ tool: 'erase', on: true }) === 'erase' && press({ tool: 'erase', on: false }) === 'erase',
  'Erase erases, including from the empty cell you happened to start the drag on');
assert(press({ tool: 'nonsense', on: false }) === 'draw',
  'and an unknown tool is Auto rather than nothing at all');

// ---- the right button ----------------------------------------------------------------
//
// The eraser is always under your other finger. It answers before the tool, before the
// modifiers and before what it landed on, because a rule with exceptions is one you
// have to remember — and the whole point of putting erase on the right button was to
// free a LEFT click on a note to mean "pick this one out" rather than destroy it.
for (const tool of ROLL_TOOL_IDS) {
  assert(press({ secondary: true, tool, on: true }) === 'erase'
    && press({ secondary: true, tool, on: false }) === 'erase',
    `right-click rubs out in ${tool} too — the eraser is not a mode you have to be in`);
}
assert(press({ secondary: true, meta: true, on: true }) === 'erase'
  && press({ secondary: true, shift: true, on: true }) === 'erase'
  && press({ secondary: true, alt: true, on: true }) === 'erase'
  && press({ secondary: true, on: true, edge: true }) === 'erase',
  'and no modifier and no six-pixel edge can turn it into something else');
assert(press({ secondary: false, on: true }) === 'move',
  'while the left button on a note is still the move it was — right-click took the'
  + ' erase off it, not the drag');
assert(ROLL_TOOL_IDS[0] === 'auto' && rollTool('draw') === 'draw' && rollTool(null) === 'auto',
  'Auto is the default, and a remembered mode that no longer exists falls back to it');
assert(ROLL_TOOLS.every((t) => t.hint && t.label),
  'every mode says what it does — a mode you cannot see is one that surprises you');

// ---- picking notes out in sets -----------------------------------------------------
assert(press({ meta: true, on: false }) === 'marquee' && press({ meta: true, on: true }) === 'marquee',
  '⌘ draws a rectangle round notes, in any mode and over anything');
assert(press({ shift: true, on: true }) === 'select',
  '⇧ on a note adds it to the set or takes it out');
assert(press({ shift: true, on: false }) === 'draw',
  'but ⇧ over empty space is not a selection gesture — there is nothing there to pick');
assert(press({ tool: 'select', on: false }) === 'marquee'
  && press({ tool: 'select', on: true }) === 'select',
  'Select mode: empty space bands, a note is taken hold of');
assert(press({ tool: 'select', alt: true, on: false }) === 'run',
  'and ⌥ still borrows Paint out of it, so no mode is a dead end');

// The arithmetic of moving a set: every note moves by the SAME amount, so a phrase
// keeps its shape, and the whole set stops when its leading note reaches the edge.
const bounds = { bars: 2, rows: 88 };
const setOf = [{ bar: 0, step: 14, rowAt: 40 }, { bar: 1, step: 2, rowAt: 44 }];
assert(json(movedNote(setOf[0], 4, -2, bounds)) === json({ bar: 1, step: 2, rowAt: 38 }),
  'a note moved past the end of its bar lands in the next one');
// Two bars is thirty-two steps, and the set's leading note is on step 18, so thirteen
// is as far as the whole thing can go however far the pointer went.
const clamped = clampDelta(setOf, 40, 0, bounds);
assert(clamped.dStep === 13,
  `a set dragged past the end of the song stops as a whole (${clamped.dStep} of the 40 asked for)`);
assert(json(setOf.map((nt) => movedNote(nt, clamped.dStep, 0, bounds)).map((nt) => nt.bar * 16 + nt.step))
  === json([27, 31]),
  'and keeps its shape when it stops — four steps apart before, four steps apart after');
assert(clampDelta(setOf, 0, -50, bounds).dRow === -40,
  'the same upwards: the set stops when its highest note reaches the top of the keyboard');
assert(clampDelta([], 5, 5, bounds).dStep === 0, 'and an empty set goes nowhere');

// Stretching a set: BY the same amount, not TO the same length. A quarter note and two
// sixteenths pulled out by a beat stay a quarter note and two sixteenths.
assert(json(stretched([4, 1, 1], 4)) === json([8, 5, 5]),
  'a set stretches by the same amount, so the phrase keeps its rhythm');
assert(json(stretched([16, 1, 1], -12)) === json([4, 1, 1]),
  'a whole note pulled back to a quarter leaves the sixteenths beside it at a step —'
  + ' they cannot follow that far, and stopping is better than refusing the drag');
assert(json(stretched([null, null], 3)) === json([4, 4]),
  'notes with no length of their own are one step, so they end up alike — which is what'
  + ' you would expect from a set that all looked the same');
assert(json(stretched([8, 2], 0)) === json([8, 2]), 'and a drag that ends where it began changes nothing');
assert(MIN_NOTE_LENGTH === 0.25
  && stretched([0.5], -10, MIN_NOTE_LENGTH)[0] === MIN_NOTE_LENGTH,
  'freehand resizing allows sub-sixteenths but never reaches zero');
assert(quantiseLength(1.49) === 1 && quantiseLength(1.5) === 2
  && quantiseLength(0.2) === 1 && quantiseLength(0.74, 0.5) === 0.5
  && quantiseLength(0.76, 0.5) === 1,
  'length quantisation is explicit and snaps to one-sixteenth steps only when requested');
const fractionalField = [{ on: true }, { on: false }, { on: true }, { on: false }];
assert(drawnSpan(fractionalField, 0, 1.5) === 1.5
  && drawnSpan(fractionalField, 0, 0.5) === 0.5,
  'the roll keeps fractional note lengths in the drawn rectangle, including sub-sixteenths');
assert(drawnSpan(fractionalField, 0, 4.5) === 2,
  'a later note clips only the visible rectangle and does not quantise its stored length');

// ---- the display grid, which is no longer the storage grid ------------------------
//
// One triplet bar puts a whole song on a 48-slot grid and it stays there — the
// normaliser will not demote while that note exists. Drawing all forty-eight columns
// for sixty-five bars is what made a mostly-sixteenth song read as a triplet song, so
// the SNAP decides how many columns a bar is drawn in, under three rules that everything
// downstream leans on.
for (const slots of [16, 32, 48, 96]) {
  for (const snap of [1, 2, 3, 4, 6, 8, 12, 16, 24]) {
    if (slots % snap) continue;                  // not a snap this grid can hold
    const cols = displayCols(slots, snap);
    const stride = slots / cols;
    assert(Number.isInteger(stride) && stride >= 1
      && cols >= 16 && snap % stride === 0 && Number.isInteger(cols / 4),
      `${slots} slots at a ${snap}-slot snap draws ${cols} columns: a whole stride, never`
      + ' coarser than a sixteenth, a line under every snap division, and four beats');
  }
}
assert(displayCols(48, 3) === 16 && displayCols(96, 6) === 16 && displayCols(32, 2) === 16,
  'a 1/16 snap draws sixteen columns a bar whatever the song is stored on — which is the'
  + ' whole of why the split exists');
assert(displayCols(48, 2) === 24 && displayCols(96, 4) === 24,
  'and a 1/16T snap draws twenty-four, so the triplets stand on lines of their own');
assert(displayCols(48, 8) === 24 && displayCols(96, 16) === 24,
  'a 1/4T snap is twelve columns short of showing itself at sixteen: the rule is a'
  + ' MULTIPLE of the snap divisions, not merely enough of them');
assert(displayCols(16, 1) === 16 && displayCols(32, 1) === 32
  && displayCols(48, 1) === 48 && displayCols(96, 1) === 96,
  'and a panel with no snap of its own — the step grid — draws every slot, exactly as it'
  + ' did before any of this existed');

// An off-grid note is drawn INSIDE the column it falls in, and it is a note: nothing
// may be drawn through it, and it is not clipped by the column line it hangs off.
const insetField = [
  { on: true, insets: [{ at: 1 / 3 }] },
  { on: false, insets: [] },
  { on: false, insets: [{ at: 2 / 3 }] },
  { on: false, insets: [] },
];
assert(drawnSpan(insetField, 0, 4) === 1 / 3,
  'a note on the column line is clipped by an off-grid note a third of the way across it');
assert(Math.abs(drawnSpan(insetField, 0, 4, 1 / 3) - (2 + 2 / 3 - 1 / 3)) < 1e-9,
  'and that off-grid note runs on to the next one, measured from where it really starts');
assert(drawnSpan(insetField, 1, 4) === 1 + 2 / 3,
  'an empty column is clipped by the off-grid note in the column after it');
assert(noteKey(3, 7, '48') === '3:7:48',
  'a selected note is a PLACE — bar, step and row — so it survives a rebuild as a string');

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
