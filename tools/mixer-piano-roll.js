// The piano roll: what a melodic lane plays, as pitch against sixteenths.
//
// The other half of the step grid, and deliberately the second half. A drum lane
// holds booleans, so that panel could be built without deciding anything about
// pitch; this one has to decide, and the decisions are all in three functions the
// shared shell (`mixer-bar-grid.js`) asks for — everything else, the batching, the
// paint drag, the window, the playhead, the shared-editing switch, is the grid's.
//
// ---- the range problem ----------------------------------------------------------
//
// `showBar`'s read-only roll derived its rows from the notes already in the bar,
// which is fine for reading and useless for writing: there is nowhere to put a note
// the bar does not already contain. So the rows are the whole instrument — see
// `keyboardRange` — and the key only SHADES them.
//
// Out-of-scale rows are dimmed, never removed. A guide that greys the wrong notes
// helps; one that refuses them is an instrument arguing with you, and the accidental
// you wanted is always the one it would have refused. That is the on-screen
// keyboard's rule, and this is the same instrument — which is why the key comes FROM
// that keyboard and is not chosen a second time in here. "What key am I working in" is
// one answer per person, and a second control for it is a second answer waiting to
// disagree.
//
// ---- what a cell holds ------------------------------------------------------------
//
// Three shapes, decided by the lane and never by looking at the value — a silent lane
// is all-null and all-false alike, so inspection cannot tell them apart:
//
//   melodic   a frequency, `null` to rest
//   chord     an ARRAY of frequencies, `null` to rest. A cell is one note OF the
//             chord, so clicking stacks rather than replaces: that is what makes a
//             chord lane a chord lane, and a roll that overwrote would be a roll that
//             could only ever play one note at a time on the lane built for stacks.
//
// A bare number on a chord lane throws inside scheduleStep and takes the whole render
// page with it (see src/data/voices.js), which is why the array is built here rather
// than left to whatever the last edit happened to leave behind.
import { CHORD_LANES, PERCUSSION_LANES, baseLane, seamFor, voiceOf } from '../src/data/voices.js';
import { LANES, validLen } from '../src/engine/lanes.js';
import { createBarGrid } from './mixer-bar-grid.js';
import { SCALE_BY_ID, PITCH_CLASSES, inScale } from './mixer-voice-library.js';

const LABELS = Object.fromEntries(
  LANES.map((l) => [l.key, l.label.charAt(0).toUpperCase() + l.label.slice(1)]),
);

/** MIDI semitone -> Hz, and back. The engine stores Hz; a keyboard thinks in steps. */
export const midiFreq = (midi) => 440 * (2 ** ((midi - 69) / 12));
export const freqMidi = (hz) => Math.round(12 * Math.log2(hz / 440) + 69);

/** A pitch class that is a black key on a real keyboard — for shading the rows. */
const BLACK = new Set([1, 3, 6, 8, 10]);

/**
 * ---- the keyboard's geometry ----------------------------------------------------
 *
 * The field follows the small compromise used by piano-roll keyboards: the seven white
 * faces stay equal, while the chromatic rows are grouped so C–E occupies three white-key
 * heights across five rows and F–B occupies four white-key heights across seven rows.
 * That keeps the important white-key boundaries flush without pretending every pitch
 * centre can be perfectly aligned at once. The desk's physical keyboard supplies the
 * black-key proportions, and this geometry is shared by the roll's rows and hit map.
 */
// Matches `#pianoroll .ssqrow.ssqlane` in mixer-shell.html. Pixels, because the shape is
// a keyboard's rather than a fraction of a container.
const ROW_H = 19;
const WHITE_PITCHES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = new Map([[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]]);
const WHITE_HEIGHT_RATIO = 12 / 7;
const BLACK_PITCH_RATIO = 26 / 39;
const CE_ROW_RATIO = (3 * WHITE_HEIGHT_RATIO) / 5;
const FB_ROW_RATIO = (4 * WHITE_HEIGHT_RATIO) / 7;
const DESCENDING_PITCHES = [0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

/** The grouped chromatic row height for a MIDI pitch. */
export function pianoRowHeight(midi, rowH = ROW_H) {
  const pc = ((midi % 12) + 12) % 12;
  return rowH * (pc <= 4 ? CE_ROW_RATIO : FB_ROW_RATIO);
}

/** The grouped row's offset from the high-C edge of its octave. */
export function pianoRowOffset(midi, rowH = ROW_H) {
  const pc = ((midi % 12) + 12) % 12;
  let top = 0;
  for (const pitch of DESCENDING_PITCHES) {
    if (pitch === pc) return top;
    top += pianoRowHeight(pitch, rowH);
  }
  return top;
}

/** The phase that makes C/F row bottoms and B/E row tops meet white-key edges. */
export function pianoKeyPhase(rowH = ROW_H) {
  const whiteHeight = rowH * WHITE_HEIGHT_RATIO;
  return pianoRowHeight(0, rowH) - whiteHeight;
}

/** Where one key sits, in pixels relative to its own chromatic row. */
export function keyGeometry(midi, rowH = ROW_H) {
  const pc = ((midi % 12) + 12) % 12;
  const whiteHeight = rowH * WHITE_HEIGHT_RATIO;
  // pitchRows() is highest first. Geometry is LOCAL to that pitch's own grouped row,
  // so subtract its descending row origin from the physical keyboard position. The
  // phase is what makes the C/F bottoms and B/E tops coincide with the equal white-key
  // boundaries. The resulting small overlaps are intentional: the key faces remain
  // equal while the pitch rows make the C–E/F–B group boundaries readable.
  const rowFromC = pianoRowOffset(midi, rowH);
  const phase = pianoKeyPhase(rowH);
  if (BLACK.has(pc)) {
    const height = whiteHeight * BLACK_PITCH_RATIO;
    const after = BLACK_AFTER.get(pc);
    // `after` counts whites upwards from C; the roll runs downwards, hence 7 - after.
    // The black face is centred on that physical white-key seam.
    return {
      black: true,
      top: phase + (7 - after) * whiteHeight - rowFromC - height / 2,
      height,
    };
  }
  const white = WHITE_PITCHES.indexOf(pc);
  const whiteFromC = white === 0 ? 0 : 7 - white;
  return {
    black: false,
    top: phase + whiteFromC * whiteHeight - rowFromC,
    height: whiteHeight,
  };
}

/**
 * Build the complete vertical geometry for a pitch range at one scale.
 *
 * `before` and `after` are physical-key caps: row flow remains pitch-owned, while the
 * body gets enough room to show every key face at the top and bottom of an arbitrary
 * range. The row objects carry the same key face geometry that the header and tests use.
 */
export function pianoLayout(lowMidi, highMidi, rowH = ROW_H) {
  let top = 0;
  let minKeyTop = Infinity;
  let maxKeyBottom = -Infinity;
  const rows = pitchRows(lowMidi, highMidi).map((midi) => {
    const height = pianoRowHeight(midi, rowH);
    const keyFace = keyGeometry(midi, rowH);
    minKeyTop = Math.min(minKeyTop, top + keyFace.top);
    maxKeyBottom = Math.max(maxKeyBottom, top + keyFace.top + keyFace.height);
    const row = { midi, top, height, keyFace };
    top += height;
    return row;
  });
  const before = Number.isFinite(minKeyTop) ? Math.max(0, -minKeyTop) : 0;
  const after = Number.isFinite(maxKeyBottom)
    ? Math.max(0, maxKeyBottom - top) : 0;
  return { rows, before, after, height: before + top + after, pitchUnit: rowH };
}

/** Move a note face from its equal chromatic row centre to its physical key centre. */
export function keyCenterOffset(midi, rowH = ROW_H) {
  const key = keyGeometry(midi, rowH);
  return key.top + key.height / 2 - pianoRowHeight(midi, rowH) / 2;
}

/** Whether a drawn note rectangle is sounding at the heard sixteenth. */
export function noteActiveAt(step, bar, at, span = 1) {
  if (!Number.isFinite(step)) return false;
  const heard = Math.floor(step);
  const start = Number(bar) * 16 + Number(at);
  const length = Math.max(1, Math.floor(Number(span) || 1));
  return Number.isFinite(start) && heard >= start && heard < start + length;
}

/**
 * The lanes this panel can edit.
 *
 * Percussion is the step grid's job — it has no pitch axis, and offering one here would
 * be a second, worse way to do what that panel already does well. The fx lanes are left
 * out for a different reason: they build their own node graphs with timing internal to
 * the gesture, so a note in a roll would misrepresent what they play. They still take a
 * frequency, and a bank can still spell one by hand.
 */
const GESTURE_LANES = ['organGliss', 'organSwoop', 'keyGliss', 'gliss', 'electroFx', 'sweeps'];
export const rollEditable = (key) => {
  const base = baseLane(key);
  return !PERCUSSION_LANES.includes(base) && !GESTURE_LANES.includes(base);
};

/**
 * What a step becomes when a cell on it is drawn or cleared.
 *
 * Pulled out of the panel so it can be tested without a DOM: this is the one place
 * that decides what a note IS, and getting it wrong writes a bad bank rather than a
 * bad pixel. `chord` is the lane's nature, never a guess from the value — a silent
 * chord lane is all-null and looks exactly like a silent melodic one.
 *
 * Rests are `null` here, never `false`: that is a percussion lane's rest, and the two
 * are different values in the file (tests/preview.js pins it).
 */
export function noteCell({ chord, midi, freq }, value, on) {
  if (chord) {
    // A cell is one note OF the chord: stack, do not replace. Sorted so two ways of
    // arriving at the same chord write the same array and the file stops churning.
    const had = Array.isArray(value) ? value.filter((f) => f > 0) : [];
    const without = had.filter((f) => freqMidi(f) !== midi);
    const next = on ? [...without, freq].sort((a, b) => a - b) : without;
    return next.length ? next : null;
  }
  // Monophonic lanes hold ONE frequency, so drawing replaces whatever was on that
  // step — including a note on another row. Clearing only clears the row you clicked,
  // which is why this compares before nulling: dragging an eraser along a row must not
  // silently take out the notes above and below it.
  if (on) return freq;
  const cur = typeof value === 'number' && value > 0 ? value : null;
  return cur != null && freqMidi(cur) === midi ? null : cur;
}

/** Is this row's cell filled, given whatever the step holds? */
export function noteOn({ midi }, value) {
  if (Array.isArray(value)) return value.some((f) => f > 0 && freqMidi(f) === midi);
  return typeof value === 'number' && value > 0 && freqMidi(value) === midi;
}

/**
 * ---- how long a note is -----------------------------------------------------------
 *
 * A lane's lengths sit in a parallel array (`bassLen` beside `bass`, see lanes.js),
 * and on a CHORD lane each entry is itself an array: one length per tone, positionally
 * aligned with the frequencies on that step.
 *
 * Positional alignment is the whole risk in that shape, and it is why these three
 * functions exist rather than a line of arithmetic at each call site. `noteCell` sorts
 * the chord — two ways of arriving at the same chord have to write the same array — so
 * the lengths cannot be sorted separately: they are PAIRED with the frequencies, sorted
 * together, and split apart again. Sort them apart once and a song plays the right
 * notes at each other's lengths, which is the kind of bug that survives a listen.
 */

/**
 * The lengths that go with `noteCell`'s notes.
 *
 * `drawn` is a length in steps, from the resize handle; null means "nothing was said",
 * which is what a newly drawn note gets. A cleared note takes its length with it, and
 * clearing a row that does not hold the note leaves both alone — the same guard
 * `noteCell` has, for the same reason: an eraser dragged along a row must not take the
 * length off the note above it any more than it takes the note.
 */
export function noteLength({ chord, midi, freq }, value, len, on, drawn = null) {
  const one = validLen(drawn) ? drawn : null;
  if (chord) {
    const had = Array.isArray(value) ? value.filter((f) => f > 0) : [];
    // A scalar on a chord step is the whole chord's length — what a hand-written
    // `chordsLen: [4, …]` plainly means — so it spreads onto the tones that remain
    // rather than being lost the first time one of them is edited.
    const lens = Array.isArray(len) ? len : null;
    const lenAt = (i) => (lens ? (validLen(lens[i]) ? lens[i] : null) : (validLen(len) ? len : null));
    const mine = had.findIndex((f) => freqMidi(f) === midi);
    const pairs = had
      .map((f, i) => ({ f, len: lenAt(i) }))
      .filter((p) => freqMidi(p.f) !== midi);
    if (on) pairs.push({ f: freq, len: one ?? (mine >= 0 ? lenAt(mine) : null) });
    pairs.sort((a, b) => a.f - b.f);
    return pairs.some((p) => p.len != null) ? pairs.map((p) => p.len) : null;
  }
  if (on) {
    if (one != null) return one;
    // Drawing on a note that is ALREADY THERE is not a new note, and must leave its
    // length alone: a paint-drag along a row passes over every note in its path, and a
    // drag that flattened them back to one step would be a drag that quietly undid an
    // afternoon's phrasing. A DIFFERENT note replacing this one is new, and inherits
    // nothing — a monophonic lane holds one note, and it is not the one that was here.
    const held = typeof value === 'number' && value > 0 ? value : null;
    return held != null && freqMidi(held) === midi ? (validLen(len) ? len : null) : null;
  }
  const cur = typeof value === 'number' && value > 0 ? value : null;
  return cur != null && freqMidi(cur) === midi ? null : len;
}

/**
 * How long THIS row's note on this step is, in steps, or null for "nothing said".
 *
 * The row is a pitch, so on a chord lane it selects one tone out of the step — and the
 * length that goes with it is the one at the same index. This is what the grid draws a
 * rectangle from and what a move carries to the note's destination.
 */
export function noteSpan({ chord, midi }, value, len) {
  if (chord) {
    const i = Array.isArray(value) ? value.findIndex((f) => f > 0 && freqMidi(f) === midi) : -1;
    if (i < 0) return null;
    const one = Array.isArray(len) ? len[i] : len;
    return validLen(one) ? one : null;
  }
  return validLen(len) ? len : null;
}

/**
 * The two lanes whose hand-written body ignores a length.
 *
 * `vox` and `shout` are the reason this is a question rather than an assumption: their
 * envelopes are hand-timed in absolute seconds ("hey!", "al-RIGHT"), the word is chosen
 * by step index and the formant trajectory is keyed to it, so there is nothing for a
 * length to override. They stay movable, because moving one is just another step.
 *
 * A LAYER of one is not on the list. A layer has no hand-written body — it is a preset
 * and nothing else, which is why voicesFor hides the engine presets from it — so a
 * length on `vox2` is honoured the way it is on any other lane.
 */
const HAND_TIMED_LANES = new Set(['vox', 'shout']);

/**
 * Can a note on this lane be given a length at all?
 *
 * Everything with a `*Dur` key can: the length overrides it. That used to be the whole
 * answer, because the two exceptions had no voice seam and so no `*Dur` — until they
 * were given one, which handed them a resize handle nobody asked for and let the
 * recorder write a `voxLen` the engine reads straight past.
 *
 * So the honest answer needs the bank, the same way `stacks` in tools/lib/note-recorder.js
 * does and for the same reason: WHICH of the two bodies plays a gesture lane is a
 * property of the song, not of the lane's name. `voiced()` in scheduleStep hands the
 * step's length to the rack, and the hand-written body only runs when the rack declined
 * it — so a preset on `vox` honours a length and the engine's own "hey!" does not. With
 * no bank the answer is the conservative one, which is what it always was.
 */
export const rollResizable = (key, bank = null) => {
  if (!seamFor(baseLane(key))) return false;
  if (!HAND_TIMED_LANES.has(key)) return true;
  // An ENGINE preset is not the rack playing the lane — it is a bundle of the bank keys
  // the hand-written body already reads, so the hand-timed envelope is still what sounds.
  const v = voiceOf(bank, key);
  return !!v && v.kind !== 'engine';
};

/**
 * ---- how the mouse behaves ---------------------------------------------------------
 *
 * `auto` is the default and it is what a modern roll does: the pointer reads where you
 * pressed and there is nothing to choose first. The other three are the same gestures
 * as standing modes, and they are here for a plain reason — modeless asks you to HOLD
 * A MODIFIER for the second gesture and to AIM at a six-pixel edge for the third, and
 * neither of those is something a tool should require of everybody. Pick Draw and every
 * press draws, wherever it lands.
 *
 * `hint` is what the desk says when you choose one. A mode you cannot see is a mode
 * that will surprise you later, so choosing one says what it now does.
 */
export const ROLL_TOOLS = [
  {
    id: 'auto',
    label: 'Auto',
    hint: 'Auto — empty space draws, a note’s middle moves it, its right end lengthens it;'
      + ' click a note to pick it out, right-click to rub it out',
  },
  {
    id: 'draw',
    label: 'Draw',
    hint: 'Draw — every press makes a note; drag to set how long, right-click to rub out',
  },
  {
    id: 'select',
    label: 'Select',
    hint: 'Select — band notes, then move or stretch them together; arrows nudge,'
      + ' ⌫ or right-click deletes',
  },
  {
    id: 'paint',
    label: 'Paint',
    hint: 'Paint — drag to lay a run of separate notes, right-drag to rub a run out',
  },
  { id: 'erase', label: 'Erase', hint: 'Erase — drag over notes to rub them out' },
];
export const ROLL_TOOL_IDS = ROLL_TOOLS.map((t) => t.id);
export const rollTool = (id) => (ROLL_TOOL_IDS.includes(id) ? id : 'auto');

/**
 * The pitch rows to draw, highest first.
 *
 * A range, not a count: the roll shows what the part actually uses, so a two-note
 * bassline is two octaves of room and a lead that walks four octaves gets four.
 */
export function pitchRows(lowMidi, highMidi) {
  const rows = [];
  for (let m = highMidi; m >= lowMidi; m--) rows.push(m);
  return rows;
}

/**
 * The highest and lowest note a lane plays ANYWHERE in the song, or null if it is
 * silent throughout.
 *
 * The whole song rather than the bar on screen. That distinction is the entire reason
 * `showBar`'s roll could not be written in: a range derived per bar has nowhere to put
 * a note the bar does not already contain, and it moves under the pointer every time
 * you page to the next bar. Derived per SONG it is stable while you work, and every
 * note the part plays is on screen wherever you are in it.
 */
export function laneSpan(bank, lane) {
  let low = null;
  let high = null;
  const consider = (v) => {
    if (typeof v === 'number' && v > 0) {
      const m = freqMidi(v);
      low = low == null ? m : Math.min(low, m);
      high = high == null ? m : Math.max(high, m);
    } else if (Array.isArray(v)) for (const f of v) consider(f);
  };
  const scan = (b) => { for (const v of b?.[lane] || []) consider(v); };
  scan(bank);
  for (const s of bank?.sections || []) scan(s);
  return low == null ? null : { low, high };
}

/**
 * The range to open a lane on: what it plays, with room to write above and below.
 *
 * Padded then snapped OUT to whole octaves, so the roll always begins and ends on a C
 * and the octave stripes line up with the labels. A silent lane gets a plain two
 * octaves from C3 — it has no opinion yet, and somewhere playable beats nowhere.
 *
 * The bottom is the part's own lowest note, one tone under it — NOT snapped down to the
 * octave. Snapping put plumber's bass, which spans eight semitones, thirty-seven rows up
 * from the bottom of the panel with the part floating in the middle of it. What you want
 * on opening is the part at the bottom of the window and room above to write; scrolling
 * up is easy and hunting for your own bassline is not.
 */
/**
 * ---- the instrument, all of it ----------------------------------------------------
 *
 * A0 to C8: the eighty-eight keys of a piano, and the roll shows every one of them.
 *
 * It used to show a window derived from what the lane already played, padded to two
 * octaves. That is a good answer to "where should this open" and a bad one to "what
 * can I write": a part whose lowest note is C2 had no C1 to click on, so the note you
 * wanted next was the one note the panel would not let you have. A range that is a
 * function of the part is a range that argues with you the moment you want to leave it.
 *
 * So the range is the instrument's, fixed and complete, and where you ARE in it is a
 * scroll position — which is what it is on a real keyboard. `autoRange` stays and does
 * the job it was always really doing: deciding where to open.
 *
 * Widened if a bank ever holds something outside those keys. Nothing in the catalogue
 * does — the lowest note anywhere is a D1 and the highest a C7 — but a bank is data
 * and a note that exists must be reachable, or the roll is lying about the part.
 */
export const KEYBOARD_LOW = 21;    // A0
export const KEYBOARD_HIGH = 108;  // C8
export function keyboardRange(bank, lane) {
  const span = laneSpan(bank, lane);
  return {
    low: Math.min(KEYBOARD_LOW, span ? span.low : KEYBOARD_LOW),
    high: Math.max(KEYBOARD_HIGH, span ? span.high : KEYBOARD_HIGH),
  };
}

const PAD = 2;
const MIN_ROWS = 25;
export function autoRange(bank, lane, fallback = 48) {
  const span = laneSpan(bank, lane);
  if (!span) return { low: fallback, high: fallback + 24 };
  let low = span.low - PAD;
  let high = span.high + PAD;
  // Never so tight that the part fills the window edge to edge: a roll you cannot
  // draw a passing note into is the read-only one again.
  // Room to write goes ABOVE, so the part stays where it opened rather than sliding up
  // the window as the range grows.
  if (high - low + 1 < MIN_ROWS) high = low + MIN_ROWS - 1;
  return { low: Math.max(12, low), high: Math.min(120, high) };
}

/**
 * @param lane        () => the lane being edited, chosen on the desk — the roll follows
 *                    the selected channel and has no picker of its own.
 * @param scale       () => { root, id } — the key, INJECTED rather than read from
 *                    localStorage, because the on-screen keyboard holds it in module
 *                    state as well as on disk. A second copy here would agree with the
 *                    keyboard until one of them was changed and then quietly disagree
 *                    for the rest of the session, which is the whole failure mode
 *                    sharing the preference was meant to avoid. Read-only here: the
 *                    keyboard is where a key is chosen, and the roll only dims by it.
 * @param pitchSize   optional base vertical pitch size in pixels. It is an input to the
 *                    geometry, not a CSS-only scale, so a future zoom control can change
 *                    it while preserving the pitch under the viewport.
 * See `createBarGrid` for the rest; they are passed straight through.
 */
export function createPianoRoll({
  el, Audio, bank, editBank, draft, sel, apply, laneColour, engineBank,
  lane, laneLabel = (key) => LABELS[key] || key,
  scale = () => ({ root: 0, id: 'chromatic' }),
  pitchSize = ROW_H,
  toast = () => {},
  onClose = () => {},
}) {
  let pitchUnit = Number.isFinite(Number(pitchSize)) && Number(pitchSize) > 0
    ? Number(pitchSize) : ROW_H;
  let rollPadding = { before: 0, after: 0 };
  const applyPitchUnitStyle = () => {
    el.style.setProperty('--roll-pitch-unit', `${pitchUnit}px`);
  };
  applyPitchUnitStyle();
  // Which gesture the mouse performs. Remembered, because it is a decision about how
  // you work rather than about this song — and shown beside the field, because a mode
  // you cannot see is one you will be surprised by.
  const TOOL_KEY = 'mash-mixer-roll-tool';
  let toolId = rollTool(localStorage.getItem(TOOL_KEY));
  const setTool = (id) => {
    toolId = rollTool(id);
    localStorage.setItem(TOOL_KEY, toolId);
    // The panel wears its mode, so the cursors can say which one it is in.
    for (const t of ROLL_TOOL_IDS) el.classList.toggle(`tool-${t}`, t === toolId);
    toast(ROLL_TOOLS.find((t) => t.id === toolId).hint);
  };

  const TOOL_TITLE = 'What the mouse does.\n'
    + 'Auto — empty space draws (drag to set the length), a note’s middle moves it,'
    + ' its right end lengthens it, a click picks it out.\n'
    + 'RIGHT-CLICK rubs a note out, in every mode — right-drag rubs out a run.\n'
    + 'Hold ⌘ to drag a rectangle round notes, ⇧-click to add one to the set,'
    + ' then move or stretch them together.\n'
    + 'With notes picked out: arrows nudge them (⇧ by a bar or an octave),'
    + ' ⌥← ⌥→ shorten and lengthen, ⌫ takes them out, ⎋ lets them go.\n'
    + 'Hold ⌥ at any time for Paint: a run of separate notes, or a run rubbed out.\n'
    + 'Draw, Select, Paint and Erase each do one thing, with no modifier and no aiming.';

  /**
   * What the mouse does — the roll's only control besides the zoom.
   *
   * `Auto` first and selected by default: it is the answer for most people most of the
   * time, with the others there for anyone who would rather not hold a key or aim at an
   * edge, which is a real requirement and not a preference. The title says the
   * modifiers, because a modifier nobody has been told about is a feature nobody has.
   *
   * It sits under the zoom in the blank half of the key column rather than in the NOTES
   * header, so the mode you are in is beside the field it applies to instead of at the
   * far end of a row you are not looking at while you draw.
   *
   * Built rather than a `<select>`, and the reason is the LIST, not the closed field.
   * `appearance: none` styles the box and nothing else: the popup a select opens is the
   * operating system's, in the operating system's colours, at the operating system's row
   * height — a slab of Aqua grey dropped over a desk that has nine themes. So the field
   * is a button, the list is ours, and every colour in both comes from the same
   * variables as the channel strip.
   *
   * What that costs is the behaviour a select gives free, which is why it is all here:
   * the arrow keys, Home and End, Enter and Escape, a click outside, and the flip
   * upwards when the list would run off the bottom of the window.
   */
  const toolPicker = () => {
    const field = document.createElement('button');
    field.type = 'button';
    field.className = 'rolltool';
    field.title = TOOL_TITLE;
    // A listbox is announced by the field, not by the TOOL heading over it — that
    // heading is a bare span and names the control on screen to nobody else.
    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-haspopup', 'listbox');
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-label', 'Tool — what the mouse does');
    const value = document.createElement('span');
    value.className = 'rolltool-value';
    field.append(value);

    // In the BODY, not in the panel. The key column is `overflow: hidden` — it has to
    // be, it is a clipped viewport onto a keyboard taller than the desk — so a list
    // drawn inside it would be cut off at the first edge it reached. Fixed to the
    // window, placed against the field's own rectangle each time it opens.
    const menu = document.createElement('div');
    menu.className = 'rolltool-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Tool');
    menu.hidden = true;

    let open = false;
    let active = 0;

    const paint = () => {
      value.textContent = ROLL_TOOLS.find((t) => t.id === toolId).label;
      for (const o of options) {
        const on = o.dataset.tool === toolId;
        o.classList.toggle('on', on);
        o.setAttribute('aria-selected', on ? 'true' : 'false');
      }
    };

    // `active` is the row the keyboard is on, which is not the row that is chosen —
    // arrowing down a list has to be able to pass over the current tool without
    // switching to everything on the way.
    const setActive = (i) => {
      active = (i + options.length) % options.length;
      options.forEach((o, n) => o.classList.toggle('active', n === active));
      field.setAttribute('aria-activedescendant', options[active].id);
    };

    const choose = (id) => {
      setTool(id);
      paint();
      closeMenu({ focus: true });
    };

    const options = ROLL_TOOLS.map((t, i) => {
      const o = document.createElement('div');
      o.className = 'rolltool-option';
      o.id = `rolltool-opt-${t.id}`;
      o.setAttribute('role', 'option');
      o.dataset.tool = t.id;
      o.textContent = t.label;
      o.title = t.hint;
      // pointerdown, not click. The dismissal below listens on pointerdown too, so by
      // the time a click fired the list would be gone and the press would land on the
      // note field underneath it — which in Draw is a note you did not ask for.
      o.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        choose(t.id);
      });
      o.addEventListener('pointerenter', () => setActive(i));
      return o;
    });
    menu.append(...options);

    const onDocDown = (ev) => {
      if (!menu.contains(ev.target) && !field.contains(ev.target)) closeMenu();
    };
    // Anything that moves the field out from under the list closes it rather than
    // chasing it. Capturing, because the scroll that matters is a panel's, not the
    // window's, and a scroll event does not bubble.
    const onDismiss = () => closeMenu();

    const closeMenu = ({ focus = false } = {}) => {
      if (!open) return;
      open = false;
      menu.hidden = true;
      menu.remove();
      field.setAttribute('aria-expanded', 'false');
      field.removeAttribute('aria-activedescendant');
      document.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('resize', onDismiss, true);
      window.removeEventListener('scroll', onDismiss, true);
      if (focus) field.focus();
    };

    const openMenu = () => {
      if (open) return;
      open = true;
      document.body.append(menu);
      menu.hidden = false;
      field.setAttribute('aria-expanded', 'true');
      setActive(Math.max(0, ROLL_TOOLS.findIndex((t) => t.id === toolId)));
      const r = field.getBoundingClientRect();
      menu.style.minWidth = `${Math.round(r.width)}px`;
      menu.style.left = `${Math.round(r.left)}px`;
      // Measured after it is in the page, because a list that has never been laid out
      // has no height to compare the room below against.
      const height = menu.offsetHeight;
      const below = window.innerHeight - r.bottom;
      const flip = below < height + 8 && r.top > below;
      menu.style.top = `${Math.round(flip ? r.top - height - 3 : r.bottom + 3)}px`;
      field.classList.toggle('flipped', flip);
      document.addEventListener('pointerdown', onDocDown, true);
      window.addEventListener('resize', onDismiss, true);
      window.addEventListener('scroll', onDismiss, true);
    };

    field.onclick = (ev) => {
      ev.stopPropagation();
      if (open) closeMenu({ focus: true }); else openMenu();
    };
    // Every one of these is stopped as well as handled. The desk listens for arrows,
    // Escape, ⌫ and the space bar at the document, where they nudge notes, drop a
    // selection and start the transport — a `<select>` swallowed them by being a
    // select, and a button has to say so.
    field.onkeydown = (ev) => {
      if (ev.key === 'Tab') { closeMenu(); return; }
      if (ev.key === 'Escape') {
        if (!open) return;
        ev.preventDefault();
        ev.stopPropagation();
        closeMenu({ focus: true });
        return;
      }
      if (!open) {
        if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(ev.key)) return;
        ev.preventDefault();
        ev.stopPropagation();
        openMenu();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(ev.key)) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.key === 'ArrowDown') setActive(active + 1);
      else if (ev.key === 'ArrowUp') setActive(active - 1);
      else if (ev.key === 'Home') setActive(0);
      else if (ev.key === 'End') setActive(options.length - 1);
      else choose(options[active].dataset.tool);
    };

    paint();
    return field;
  };

  /**
   * Is the cell being edited a chord cell?
   *
   * Two ways in, and the second one is deliberately about the VALUE rather than the lane.
   *
   * A chord lane is always chordal — that is what it is for. Anywhere else, a step is
   * chordal exactly when it already HOLDS an array, which is the same rule the
   * serialiser uses to decide how to write a lane out (`isChordLane` in
   * tools/lib/song-source.js asks `arr.some(Array.isArray)`).
   *
   * Value-based rather than "is this lane poly-capable" on purpose. Most rack-voiced
   * lanes in the game are `bass` and `lead` — single-note parts — and on those, clicking
   * a different pitch on an occupied step is how you CORRECT a note. Making the whole
   * lane chordal would turn that everyday gesture into stack-then-erase on 35 parts to
   * gain something four of them wanted. So a click still replaces, and the chordal
   * behaviour appears only on a step that already contains a chord — one you recorded —
   * where it is what lets you pick a single tone back out of it.
  */
  const isChord = (value) => CHORD_LANES.includes(baseLane(lane())) || Array.isArray(value);
  const rangeOf = () => keyboardRange(bank(), lane());
  // A roll preview uses triggerAttack for sustained Tone voices, so it needs an
  // explicit note-off just like a held keyboard key. Keep every pitch touched by one
  // paint/move gesture and release the set when its pointer goes up.
  const previewNotes = new Map();
  const previewRollNote = (row) => {
    const ok = Audio.previewNote(row.lane, row.freq, { bank: engineBank() });
    if (ok) previewNotes.set(`${row.lane}|${row.freq.toFixed(2)}`, {
      laneKey: row.lane, freq: row.freq,
    });
    return ok;
  };
  const releaseRollNotes = () => {
    for (const { laneKey, freq } of previewNotes.values()) {
      Audio.releasePreviewNote(laneKey, freq);
    }
    previewNotes.clear();
  };
  // Which key face your finger is currently holding down, so the sweep lights the key
  // it is sounding rather than the one you first pressed. `:hover` cannot do this: the
  // pointer is captured by the key you started on, so the browser keeps hovering THAT
  // one all the way up the board. Its own class, not `playing` — that one belongs to
  // the playhead's projection and is cleared wholesale every step (see syncPlayingKeys),
  // which would wipe your held key twice a beat while the song runs.
  let heldKey = null;
  const holdRollKey = (el) => {
    if (heldKey === el) return;
    heldKey?.classList.remove('held');
    heldKey = el || null;
    heldKey?.classList.add('held');
  };
  /**
   * The end of a keyboard gesture, whatever ended it: every sounding preview off, and
   * the held mark with them.
   *
   * ONE function, called from every ending there is — pointerup, pointercancel, the
   * next pointerdown, the window losing the pointer or the tab. A note started with
   * `triggerAttack` sustains until something says otherwise, so a missed release is not
   * a cosmetic bug: it is a tone that runs under the whole song until you reload the
   * desk. Cheap to call when nothing is held, which is what lets it go everywhere.
   */
  const endRollGesture = () => {
    releaseRollNotes();
    holdRollKey(null);
  };
  // The backstop. Capture routes `pointerup` to the key you pressed, but the roll is a
  // VIRTUAL grid — a redraw while your finger is down can destroy that element, and a
  // listener on a node that no longer exists releases nothing. These fire on the window,
  // which outlives every key: whatever the desk was doing, the pointer coming up or the
  // page going away ends the note.
  for (const type of ['pointerup', 'pointercancel']) {
    addEventListener(type, endRollGesture);
  }
  addEventListener('blur', endRollGesture);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) endRollGesture();
  });
  // Nothing is remembered about where you are in the instrument. The roll opens on the
  // part — which is an answer it can always work out — and after that the scroll
  // position is yours until you change lane or song. A stored offset per lane was the
  // old design and it went with the derived range: a number that has to be kept in step
  // with a part that moves under it is a number that goes wrong quietly.
  const showPart = () => {
    const span = laneSpan(bank(), lane());
    // The middle of what the part plays, in the middle of the window: room above it and
    // room below it, because with the whole keyboard there the note you want next is as
    // often under the part as over it. A silent lane opens around middle C, which is
    // where a hand goes.
    const mid = span ? Math.round((span.low + span.high) / 2) : 60;
    // Next frame: the panel is opened and measured in the same breath, and a window
    // whose height is still zero puts the part wherever nothing is.
    requestAnimationFrame(() => grid.scrollToRow(String(mid)));
  };
  /**
   * The first bar of the song this lane writes anything in, or null if it is silent.
   *
   * Read through the grid rather than off the bank, so it sees the song as laid out —
   * sections resolved, repeats expanded, pending edits included. A bar index off the
   * bank would be an index into a part, and the roll's axis is the arrangement.
   */
  const hasNote = (v) => (Array.isArray(v)
    ? v.some(hasNote) : typeof v === 'number' && v > 0);
  const firstSoundingBar = (key) => {
    const bars = grid.plan?.length || 0;
    for (let b = 0; b < bars; b++) {
      if (grid.readBar(b, key).some(hasNote)) return b;
    }
    return null;
  };
  /**
   * Put the window where this lane's notes are.
   *
   * Three answers, in the order they are worth having:
   *
   * The selected bars, when the lane actually plays in them — switching channel to
   * compare the same point in the song should stay at that point. `needRows` is what
   * makes that conditional: the selection is an answer about TIME and `sel()` always
   * has one (with nothing picked out it names the bar under the playhead), so focusing
   * it says nothing about pitch on a lane that is silent there.
   *
   * Otherwise the lane's first written bar — the same place clicking that bar would
   * take you, on both axes.
   *
   * Otherwise the part's own octave, which is all a silent lane can offer.
   */
  const focusSelection = () => {
    const chosen = sel?.();
    if (chosen && grid.focusRange(chosen.from, chosen.to, { needRows: true })) return;
    const first = firstSoundingBar(lane());
    if (first != null && grid.focusRange(first, first, { needRows: true })) return;
    showPart();
  };
  /**
   * Fit the window to the lane the desk is now on.
   *
   * The roll has no picker of its own any more — the channel is chosen on the desk, and
   * every route to that (a strip, an arrangement row, the menu, a deleted lane falling
   * through to the next one) lands in `refresh`. So the lane change is detected here
   * rather than announced from twenty call sites: the part on the new channel can be
   * two octaves from the last one, and with all eighty-eight keys in the field that is
   * an empty window until you go looking for it.
   *
   * Only when it actually changed. `refresh` is also every edit and every selection
   * repaint, and a roll that re-centres itself while you are writing into it is the
   * instrument moving under your hand.
   */
  let fittedLane = null;
  const fitLane = () => {
    if (!grid.isOpen()) return;
    const key = lane();
    if (key === fittedLane) return;
    fittedLane = key;
    // Now, not next frame. The panel is already open and measured — the frame's delay
    // is only needed when it is being built — and clicking a bar in the arrangement
    // selects the lane BEFORE it selects the bar. Deferred, this fit would land after
    // that bar was focused and take the view somewhere else; synchronous, the bar you
    // clicked has the last word, which is the one it should have.
    focusSelection();
  };
  // Selection is stored by the shared grid as note locations. Keep the callback
  // placeholder alive while that grid builds, then replace it with the projection
  // onto the physical key faces once the grid exists.
  let syncSelectedKeys = () => {};

  const grid = createBarGrid({
    el, Audio, bank, editBank, draft, sel, apply, engineBank, laneLabel,
    ns: 'roll',
    // The two that make this a roll rather than a pattern editor: it shows the whole
    // song and it lives in the page. See createBarGrid.
    wholeSong: true,
    docked: true,
    // No `Edit one bar` / `Edit all repeats` switch on this header: the roll edits the
    // bar you click, always. The step grid keeps the switch for the times the answer is
    // "the hats are wrong in this whole song".
    scopeToggle: false,
    // Eighty-eight rows, drawn a screenful at a time. The base pitch size is dynamic so
    // a future zoom control can rebuild this same grid without a second geometry path.
    virtual: true,
    rowHeight: () => pitchUnit,
    rowHeightOf: (row) => row.height,
    rowPadding: () => rollPadding,
    rulerHeader: () => {
      // Same word-in-caps in the same 9.5px the channel strip gives DELAY SEND and
      // MID, because these are the same kind of thing: the name of the control under
      // it. Two of them now — the zoom and the mouse mode are separate fields, spaced
      // apart rather than run together as one stack with a single heading.
      const fieldLabel = (text) => {
        const el = document.createElement('span');
        el.className = 'rollzoom-label';
        el.textContent = text;
        return el;
      };
      const zoom = document.createElement('span');
      zoom.className = 'rollzoom';
      zoom.title = 'Piano-roll pitch zoom';
      zoom.setAttribute('aria-label', 'Piano-roll pitch zoom');
      // 1.5 exists because the step from 1× to 2× is the one people actually want
      // halved: 19px rows are tight for aiming at a black key and 38px shows barely two
      // octaves. Nothing here rounds — the key geometry is all ratios (12/7, 26/39) and
      // 0.5× has been handing it 9.5px rows since the day it was written.
      for (const factor of [0.5, 1, 1.5, 2]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rollzoom-button';
        button.dataset.zoom = String(factor);
        button.textContent = `${factor}×`;
        button.title = `Pitch zoom ${factor}×`;
        button.setAttribute('aria-label', `Pitch zoom ${factor} times`);
        button.setAttribute('aria-pressed', Math.abs(pitchUnit / ROW_H - factor) < 1e-9
          ? 'true' : 'false');
        if (button.getAttribute('aria-pressed') === 'true') button.classList.add('on');
        button.onclick = (ev) => {
          ev.stopPropagation();
          setPitchSize(ROW_H * factor);
        };
        zoom.append(button);
      }
      return [fieldLabel('ZOOM'), zoom, fieldLabel('TOOL'), toolPicker()];
    },
    // Where the roll's controls WOULD go — the NOTES panel's header rather than a second
    // row of its own. There are none left to put there: the zoom and the mouse mode live
    // in the blank half of the key column, beside the field they act on. Kept because it
    // is also what stops the grid building a header of its own inside the scroll area.
    headerHost: () => document.getElementById('notehead'),
    onClose,

    // Every row is a PITCH on one lane, which is the whole difference from the step
    // grid — there, a row was a lane.
    rows: () => {
      const key = lane();
      const { root: scaleRoot, id: scaleId } = scale();
      const steps = SCALE_BY_ID[scaleId]?.steps || null;
      const { low, high } = rangeOf();
      const layout = pianoLayout(low, high, pitchUnit);
      rollPadding = { before: layout.before, after: layout.after };
      // Every key of the instrument, always — see keyboardRange. Only the ones in view
      // are ever built (the grid's `virtual`), so this list being eighty-eight long
      // costs nothing until you scroll to it. The white key faces remain equal, while
      // the pitch rows use the grouped C–E/F–B heights described above.
      return layout.rows.map(({ midi, top, height, keyFace }) => ({
        key: String(midi),
        lane: key,
        midi,
        top,
        height,
        keyFace,
        freq: midiFreq(midi),
        label: `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}`,
        colour: laneColour(key),
        // Do not move the note artwork to force exact centre alignment. The grouped
        // rows are the deliberate visual compromise: the note, its hit region, and its
        // keyboard face all belong to the same measured row, while the white faces keep
        // their equal physical size.
        cssVars: { '--roll-note-y': '0px' },
        hitOffset: 0,
        className: (BLACK.has(midi % 12) ? 'rollblack' : 'rollwhite')
          // `rollwhite`/`rollblack` is the KEYBOARD and nothing else may change it: this
          // one is always chromatic, twelve keys an octave in the colours a piano gives
          // them, whatever key the song is in — and the field's rows wear those same two
          // colours, so a row says which key it is without you tracking back to the
          // board. The scale classes below therefore draw NOTHING — not a face, not a
          // shade, not a rule. They are kept as the answer to "is this row in the key"
          // for anything that wants to ask, and the CSS asks nothing of them: the field
          // says pitch and time, and the key is on the keyboard that sets it.
          + (steps ? (inScale(midi, scaleRoot, steps) ? ' scalekey' : ' offscale') : '')
          + (steps && midi % 12 === scaleRoot ? ' rollroot' : ''),
      }));
    },

    // ---- the three that make this the roll
    isOn: (row, value) => noteOn(row, value),
    withCell: (row, value, on) => noteCell({ ...row, chord: isChord(value) }, value, on),

    // ---- and the four that make its notes have length
    //
    // A note is a rectangle here, so it can be dragged along the field and pulled out
    // at its right edge, and both of those need to know what a length IS on this lane.
    // The step grid answers none of them and gets neither gesture: a drum hit has no
    // length, and there is nothing to move a kick to.
    withLen: (row, value, len, on, drawn) =>
      noteLength({ ...row, chord: isChord(value) }, value, len, on, drawn),
    cellLen: (row, value, len) => noteSpan({ ...row, chord: isChord(value) }, value, len),
    // Read fresh, like `preview` below: putting a preset on a gesture lane is what
    // gives its notes a length, so the handle has to appear the moment one is chosen.
    resizable: () => rollResizable(lane(), engineBank()),
    movable: true,
    tool: () => toolId,
    selectable: true,
    selectionChanged: () => syncSelectedKeys(),

    preview: previewRollNote,
    previewRelease: releaseRollNotes,

    title: (c) => `${laneLabel(lane())} · ${c.barSpan}${c.linked ? ' · shared editing' : ''}`,

    // A key, not a track name — and a real one: white notes full width, black notes
    // narrower and darker, which is the picture every hand already has. Only the C is
    // named, on the key itself. Twenty-five rows each labelled is twenty-five things to
    // read past; one landmark an octave is how a keyboard has always said where you are.
    rowHeader: (row) => {
      const key = document.createElement('button');
      const g = row.keyFace;
      key.className = `ssqkey ${g.black ? 'keyblack' : 'keywhite'}`;
      key.dataset.row = row.key;
      // Positioned relative to the chromatic row's origin. A physical white key spans
      // several field rows and a black key crosses the seam between two white faces;
      // the row still owns the pitch, this only draws the instrument-shaped face.
      key.style.top = `${g.top}px`;
      key.style.height = `${g.height}px`;
      key.textContent = row.midi % 12 === 0 ? row.label : '';
      key.title = `Play ${row.label}`;
      key.setAttribute('aria-label', `Play ${row.label}`);
      let pointerPreview = false;
      key.addEventListener('pointerdown', (ev) => {
        pointerPreview = true;
        ev.preventDefault();
        // Anything still sounding belongs to a gesture that is over. Normally there is
        // nothing, and on the day the release was missed this is what keeps the desk
        // from stacking a second note on top of a stuck one.
        endRollGesture();
        previewRollNote(row);
        holdRollKey(key);
        // Captured so a sweep that runs off the end of the keyboard — into the field,
        // past the top row, outside the window — still ends on this element.
        try { key.setPointerCapture(ev.pointerId); } catch { /* browserless */ }
      });
      // A sweep is ONE gesture looking for one note, not a chord you built by dragging:
      // the key you leave comes up as the key you arrive at goes down, which is what
      // your hand does on a real keyboard and what the mini keyboard already does (see
      // its `pointermove` in mixer-entry.js). The pointer is captured by the key you
      // pressed, so every move arrives here — `elementFromPoint` is what says which key
      // you are actually over, since capture does not move hit testing.
      key.addEventListener('pointermove', (ev) => {
        if (!pointerPreview || !ev.buttons) return;
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const next = under?.closest?.('.ssqkey');
        if (!next || next === heldKey) return;
        const midi = Number(next.dataset.row);
        if (!Number.isFinite(midi)) return;
        releaseRollNotes();
        // The face knows which pitch it is and the lane is whichever channel the roll is
        // showing — the same two things `rows()` builds a row out of.
        previewRollNote({ lane: lane(), freq: midiFreq(midi) });
        holdRollKey(next);
      });
      // Up, cancelled, or the gesture taken away some other way: all of them are the
      // finger coming off, and all of them release. `pointerup` is guaranteed to land
      // here by the capture above; the window-level backstop below covers the one case
      // capture cannot — the key being destroyed under the pointer by a redraw.
      key.addEventListener('pointerup', () => {
        endRollGesture();
        // Normally the click follows pointerup and consumes this flag. Clear it on
        // the next turn too, so a cancelled/native-suppressed click cannot poison the
        // next keyboard activation.
        setTimeout(() => { pointerPreview = false; }, 0);
      });
      key.addEventListener('pointercancel', () => {
        pointerPreview = false;
        endRollGesture();
      });
      key.onclick = () => {
        // Pointer activation already had a down/up pair; suppress the button click
        // so it cannot start a second preview after the note-off.
        if (pointerPreview) { pointerPreview = false; return; }
        previewRollNote(row);
        setTimeout(releaseRollNotes, 120);
      };
      return [key];
    },
  });
  // The corner names the strip it sits on, not the column beneath it: the keyboard says
  // what it is by being a keyboard. Naming the top strip BAR is what lets every bar
  // number below be a bare number stacked over its own beat 1.
  grid.setRulerLabel('Bar');

  let selectedKeys = [];
  const clearSelectedKeys = () => {
    for (const key of selectedKeys) key.classList.remove('selected');
    selectedKeys = [];
  };
  syncSelectedKeys = () => {
    clearSelectedKeys();
    if (!grid.isOpen()) return;
    const seen = new Set();
    for (const cell of el.querySelectorAll('.ssqcell.on:is(.sel,.edited)')) {
      const key = el.querySelector(`.ssqkeys .ssqkey[data-row="${cell.dataset.row}"]`);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      key.classList.add('selected');
      selectedKeys.push(key);
    }
  };

  // Project the sounding note rectangles back to their row-header keys. Looking only
  // for `.playing.on` caught a note on its first sixteenth and then dropped its key for
  // the rest of a longer rectangle; use the same drawn span the roll shows instead.
  // Keep this here, beside the piano-roll wrapper, rather than teaching the generic
  // step grid about pitch faces.
  let playingKeys = [];
  const clearPlayingKeys = () => {
    for (const key of playingKeys) key.classList.remove('playing');
    playingKeys = [];
  };
  const syncPlayingKeys = (step) => {
    clearPlayingKeys();
    if (!grid.isOpen() || !Number.isFinite(step)) return;
    const seen = new Set();
    for (const cell of el.querySelectorAll('.ssqcell.on:not(.muted)')) {
      const span = Number(cell.style.getPropertyValue('--len')) || 1;
      if (!noteActiveAt(step, cell.dataset.bar, cell.dataset.step, span)) continue;
      const key = el.querySelector(`.ssqkeys .ssqkey[data-row="${cell.dataset.row}"]`);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      key.classList.add('playing');
      playingKeys.push(key);
    }
  };

  // The wheel scrolls PITCH, which is the axis this panel is about. A trackpad's
  // horizontal component still reaches the scroller underneath, so a two-finger swipe
  // sideways moves through the bars as it always did — this only claims the vertical
  // part, and only when there is somewhere to go. Passive: false because a wheel over
  // a full-height roll must not also scroll the desk behind it.
  el.addEventListener('wheel', (ev) => {
    const scroll = el.querySelector('.ssqscroll');
    if (!scroll) return;
    const room = scroll.scrollHeight - scroll.clientHeight;
    if (room <= 0) return;                       // the whole range is already shown
    if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;   // that gesture is sideways
    const before = scroll.scrollTop;
    scroll.scrollTop = Math.max(0, Math.min(room, before + ev.deltaY));
    if (scroll.scrollTop !== before) ev.preventDefault();
  }, { passive: false });

  /** Change the pitch scale while keeping the same MIDI row under the viewport. */
  const setPitchSize = (next) => {
    const value = Number(next);
    if (!Number.isFinite(value) || value <= 0 || value === pitchUnit) return false;
    const anchor = grid.captureRowAnchor();
    pitchUnit = value;
    applyPitchUnitStyle();
    if (grid.isOpen()) {
      grid.redraw();
      grid.restoreRowAnchor(anchor);
    }
    return true;
  };

  return {
    // Opening lands on the selected bar when there is one, otherwise on the part, and
    // so does arriving at a new song. Everywhere else the scroll position is left
    // exactly where the hand put it — an edit must never move the instrument under
    // you, which is why `build` keeps it.
    open(on = true) {
      if (on === false) {
        clearPlayingKeys();
        clearSelectedKeys();
      }
      grid.open(on);
      if (on === false) return;
      syncSelectedKeys();
      // The panel is rebuilt on open, so the mode's class goes back on with it.
      for (const t of ROLL_TOOL_IDS) el.classList.toggle(`tool-${t}`, t === toolId);
      // A selected bar is the user's current question. Focus it after the new panel
      // has entered layout; with no selection, retain the older "find this part"
      // opening behaviour.
      fittedLane = lane();
      requestAnimationFrame(focusSelection);
    },
    close() {
      clearPlayingKeys();
      clearSelectedKeys();
      grid.close();
    },
    isOpen: grid.isOpen,
    setPitchSize,
    refresh() {
      clearPlayingKeys();
      grid.refresh();
      syncSelectedKeys();
      // After the rebuild: the new lane's rows have to exist before the window can be
      // put over them.
      fitLane();
    },
    follow(step) {
      grid.follow(step);
      syncSelectedKeys();
      syncPlayingKeys(step);
    },
    armFollow: grid.armFollow,
    /**
     * Forget which lane the window was fitted to, so the next refresh fits it again.
     *
     * The panel can lose its roll entirely while it is still open — a percussion
     * channel has no part to show, see the desk's `laneHidesRoll` — and a box that has
     * been `display: none` comes back with its scroll position gone: at the top of the
     * keyboard, which is C8 and almost never where the part is. `fitLane` cannot see
     * that, because the lane it is looking at may not have changed across the trip; the
     * roll it fitted did. This is the desk saying the window itself went away.
     */
    forgetFit() { fittedLane = null; },
    songChanged() {
      clearPlayingKeys();
      grid.songChanged();
      syncSelectedKeys();
      fittedLane = lane();
      if (grid.isOpen()) requestAnimationFrame(focusSelection);
    },
    focusRange(from, to) {
      return grid.focusRange(from, to);
    },
  };
}
