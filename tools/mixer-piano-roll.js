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
// the bar does not already contain. So the rows come from a ROOT AND A SCALE — the
// same two controls the on-screen keyboard uses, and the same remembered preference,
// because "what key am I working in" is one answer per person and not one per panel.
//
// Out-of-scale rows are dimmed, never removed. A guide that greys the wrong notes
// helps; one that refuses them is an instrument arguing with you, and the accidental
// you wanted is always the one it would have refused. That is the on-screen
// keyboard's rule, and this is the same instrument.
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
import { CHORD_LANES, PERCUSSION_LANES, baseLane, seamFor } from '../src/data/voices.js';
import { LANES, validLen } from '../src/engine/lanes.js';
import { createBarGrid } from './mixer-bar-grid.js';
import { SCALES, SCALE_BY_ID, PITCH_CLASSES, inScale } from './mixer-voice-library.js';

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
 * A real board: SEVEN white keys spanning TWELVE semitones, so a white key is its own
 * row plus the half-row of each black beside it.
 *
 *   C 1.5   D 2   E 1.5   F 1.5   G 2   A 2   B 1.5   =  12
 *
 * That sum is the test. If the whites tile the octave it is a keyboard; if they are all
 * the same height it is twelve equal bars, and no amount of width or colour makes twelve
 * equal bars read as seven whites with five blacks between them. Equal heights were tried
 * and that is exactly how they looked.
 *
 * The trade: a white key does not line up 1:1 with the field row beside it. That is fine,
 * because the keyboard is not what you aim at — the FIELD is one equal row per semitone
 * and always will be. This column is the axis and the preview, and a keyboard that looks
 * like a keyboard is worth more here than one that lines up with a grid.
 */
const BLACK_ABOVE = new Set([0, 2, 5, 7, 9]);   // C D F G A — a black key sits above
const BLACK_BELOW = new Set([2, 4, 7, 9, 11]);  // D E G A B — and below
// Matches `#pianoroll .ssqrow.ssqlane` in mixer-shell.html. Pixels, because the shape is
// a keyboard's rather than a fraction of a container.
const ROW_H = 19;

/** Where one key sits, in pixels relative to its own row. */
export function keyGeometry(midi, rowH = ROW_H) {
  const pc = ((midi % 12) + 12) % 12;
  if (BLACK.has(pc)) return { black: true, top: 0, height: rowH };
  const up = BLACK_ABOVE.has(pc) ? rowH / 2 : 0;
  const down = BLACK_BELOW.has(pc) ? rowH / 2 : 0;
  return { black: false, top: -up, height: rowH + up + down };
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
 * Can a note on this lane be given a length at all?
 *
 * Everything with a `*Dur` key can: the length overrides it. `vox` and `shout` cannot,
 * and they are the reason this is a question rather than an assumption — their
 * envelopes are hand-timed in absolute seconds ("hey!", "al-RIGHT"), the word is chosen
 * by step index and the formant trajectory is keyed to it, so there is nothing for a
 * length to override. They stay movable, because moving one is just another step; they
 * get no resize handle, because there is nowhere to write what it would say.
 */
export const rollResizable = (key) => !!seamFor(baseLane(key));

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
    hint: 'Auto — empty space draws, a note’s middle moves it, its right end lengthens it',
  },
  { id: 'draw', label: 'Draw', hint: 'Draw — every press makes a note; drag to set how long' },
  {
    id: 'select',
    label: 'Select',
    hint: 'Select — band notes, then move or stretch them together; arrows nudge, ⌫ deletes',
  },
  { id: 'paint', label: 'Paint', hint: 'Paint — drag to lay a run of separate notes' },
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
 * A cluster of header controls that belong to one question.
 *
 * The `data-grp` is for the stylesheet, not for script: the header draws the hairline
 * between clusters off `.ssqgrp + .ssqgrp`, and the name is there so a rule can single
 * one out later without counting positions in the row.
 */
function group(name, ...kids) {
  const g = document.createElement('span');
  g.className = 'ssqgrp';
  g.dataset.grp = name;
  g.append(...kids);
  return g;
}

/**
 * @param lane        () => the lane being edited, chosen on the desk
 * @param setLane     (key) => tell the desk the roll moved to another lane
 * @param editable    () => [laneKey] — which lanes the picker may offer
 * @param scale       () => { root, id } — the key, INJECTED rather than read from
 *                    localStorage, because the on-screen keyboard holds it in module
 *                    state as well as on disk. A second copy here would agree with the
 *                    keyboard until one of them was changed and then quietly disagree
 *                    for the rest of the session, which is the whole failure mode
 *                    sharing the preference was meant to avoid.
 * @param setScale    ({ root, id }) => the desk's own setter, so changing the key in the
 *                    roll re-dims the keyboard's keys too.
 * See `createBarGrid` for the rest; they are passed straight through.
 */
export function createPianoRoll({
  el, Audio, bank, editBank, draft, sel, apply, laneColour, engineBank,
  lane, setLane, editable, laneLabel = (key) => LABELS[key] || key,
  scale = () => ({ root: 0, id: 'chromatic' }), setScale = () => {},
  toast = () => {},
  onClose = () => {},
}) {
  // Which gesture the mouse performs. Remembered, because it is a decision about how
  // you work rather than about this song — and shown in the header, because a mode you
  // cannot see is one you will be surprised by.
  const TOOL_KEY = 'mash-mixer-roll-tool';
  let toolId = rollTool(localStorage.getItem(TOOL_KEY));
  const setTool = (id) => {
    toolId = rollTool(id);
    localStorage.setItem(TOOL_KEY, toolId);
    // The panel wears its mode, so the cursors can say which one it is in.
    for (const t of ROLL_TOOL_IDS) el.classList.toggle(`tool-${t}`, t === toolId);
    toast(ROLL_TOOLS.find((t) => t.id === toolId).hint);
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
  const byOctave = (n) => grid.scrollRows(n * 12);

  const grid = createBarGrid({
    el, Audio, bank, editBank, draft, sel, apply, engineBank, laneLabel,
    ns: 'roll',
    // The two that make this a roll rather than a pattern editor: it shows the whole
    // song and it lives in the page. See createBarGrid.
    wholeSong: true,
    docked: true,
    // Eighty-eight rows, drawn a screenful at a time. ROW_H is the CSS row height and
    // the spacers need it as a number — see the note on ROW_H above.
    virtual: true,
    rowHeight: ROW_H,
    // Its controls join the NOTES panel's header rather than starting a second row.
    // They used to land on `#devhead` — correct while the roll and the effect cards
    // were two views of one region, and wrong the moment those became two panels: a
    // key picker and an octave nudge on a header labelled Effects belong to nothing
    // on screen under it.
    headerHost: () => document.getElementById('notehead'),
    onClose,

    // Every row is a PITCH on one lane, which is the whole difference from the step
    // grid — there, a row was a lane.
    rows: () => {
      const key = lane();
      const { root: scaleRoot, id: scaleId } = scale();
      const steps = SCALE_BY_ID[scaleId]?.steps || null;
      const { low, high } = rangeOf();
      // Every key of the instrument, always — see keyboardRange. Only the ones in view
      // are ever built (the grid's `virtual`), so this list being eighty-eight long
      // costs nothing until you scroll to it. Rows stay the step grid's height rather
      // than shrinking to fit, because the two panels are two views of one song.
      return pitchRows(low, high).map((midi) => ({
        key: String(midi),
        lane: key,
        midi,
        freq: midiFreq(midi),
        label: `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}`,
        colour: laneColour(key),
        className: (BLACK.has(midi % 12) ? 'rollblack' : 'rollwhite')
          // Named the way the on-screen keyboard names them, and coloured the same way:
          // an offscale key gets its own face rather than a dimmed one. Dimming made a
          // white key render grey, which reads as a third kind of key instead of as
          // "not in this scale" — see the CSS.
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
    resizable: () => rollResizable(lane()),
    movable: true,
    tool: () => toolId,
    selectable: true,

    preview: (row) => Audio.previewNote(row.lane, row.freq, { bank: engineBank() }),

    title: (c) => `${laneLabel(lane())} · ${c.barSpan}${c.linked ? ' · shared editing' : ''}`,

    headerExtra: () => {
      const { root: scaleRoot, id: scaleId } = scale();
      const picker = document.createElement('select');
      picker.className = 'fxsel ssqlane-pick';
      picker.title = 'Which part this roll is editing';
      for (const key of editable()) {
        const o = document.createElement('option');
        o.value = key;
        o.textContent = laneLabel(key);
        if (key === lane()) o.selected = true;
        picker.append(o);
      }
      // A lane change is a different part, so the view goes to where that part is —
      // the roll has always opened on the notes rather than at C8.
      picker.onchange = () => { setLane(picker.value); grid.redraw(); showPart(); };

      // What the mouse does. `Auto` first and selected by default — it is the answer
      // for most people most of the time — with the others there for anyone who would
      // rather not hold a key or aim at an edge, which is a real requirement and not a
      // preference. The title says the modifier, because a modifier nobody has been
      // told about is a feature nobody has.
      const tools = document.createElement('select');
      tools.className = 'fxsel ssqtool';
      for (const t of ROLL_TOOLS) {
        const o = document.createElement('option');
        o.value = t.id;
        o.textContent = t.label;
        if (t.id === toolId) o.selected = true;
        tools.append(o);
      }
      tools.title = 'What the mouse does.\n'
        + 'Auto — empty space draws (drag to set the length), a note’s middle moves it,'
        + ' its right end lengthens it.\n'
        + 'Hold ⌘ to drag a rectangle round notes, ⇧-click to add one to the set,'
        + ' then move or stretch them together.\n'
        + 'With notes picked out: arrows nudge them (⇧ by a bar or an octave),'
        + ' ⌥← ⌥→ shorten and lengthen, ⌫ takes them out, ⎋ lets them go.\n'
        + 'Hold ⌥ at any time for Paint: a run of separate notes, or a run rubbed out.\n'
        + 'Draw, Select, Paint and Erase each do one thing, with no modifier and no aiming.';
      tools.onchange = () => setTool(tools.value);

      // The whole keyboard is there; these are how you get about it without a
      // trackpad. Scrolling, not re-ranging: there is nothing left to re-range.
      const down = document.createElement('button');
      down.className = 'ssqoctbtn';
      down.textContent = '−';
      down.title = 'An octave lower';
      down.setAttribute('aria-label', 'Scroll an octave lower');
      down.onclick = (ev) => { ev.stopPropagation(); byOctave(1); };
      const up = document.createElement('button');
      up.className = 'ssqoctbtn';
      up.textContent = '+';
      up.title = 'An octave higher';
      up.setAttribute('aria-label', 'Scroll an octave higher');
      up.onclick = (ev) => { ev.stopPropagation(); byOctave(-1); };
      // One control, two ends — the pair reads as a single octave nudge rather than as
      // two more loose buttons in a row that already has too many.
      const oct = document.createElement('span');
      oct.className = 'ssqoct';
      oct.append(down, up);

      const fit = document.createElement('button');
      fit.className = 'ssqlink';
      fit.textContent = 'Find the part';
      fit.title = 'Back to where this part actually plays';
      fit.onclick = (ev) => { ev.stopPropagation(); showPart(); };

      const root = document.createElement('select');
      root.className = 'fxsel ssqroot';
      for (let i = 0; i < 12; i++) {
        const o = document.createElement('option');
        o.value = String(i); o.textContent = PITCH_CLASSES[i];
        if (i === scaleRoot) o.selected = true;
        root.append(o);
      }
      root.title = 'Which note is home';
      root.disabled = scaleId === 'chromatic';
      root.onchange = () => { setScale({ root: Number(root.value) }); grid.redraw(); };

      const kind = document.createElement('select');
      kind.className = 'fxsel ssqscalekind';
      for (const s of SCALES) {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.label;
        if (s.id === scaleId) o.selected = true;
        kind.append(o);
      }
      kind.title = 'Notes outside the key are dimmed — they still play, because the'
        + ' accidental you wanted is always the one a keyboard would have refused.';
      kind.onchange = () => { setScale({ id: kind.value }); grid.redraw(); };

      // Three clusters, not seven controls in a queue. Each answers one question —
      // what am I editing, where am I looking, what key is it in — and the header
      // rules a hairline between them, so the row is read in three glances instead
      // of scanned left to right. The scope button (`Edit one bar`) is appended by
      // the grid itself and becomes the fourth.
      return [group('part', picker, tools), group('view', oct, fit), group('key', root, kind)];
    },

    // A key, not a track name — and a real one: white notes full width, black notes
    // narrower and darker, which is the picture every hand already has. Only the C is
    // named, on the key itself. Twenty-five rows each labelled is twenty-five things to
    // read past; one landmark an octave is how a keyboard has always said where you are.
    rowHeader: (row) => {
      const key = document.createElement('button');
      const g = keyGeometry(row.midi);
      key.className = 'ssqkey';
      // Positioned in pixels rather than by the row, because a white key is taller than
      // its row — see keyGeometry. The row still owns the pitch; this only draws it.
      key.style.top = `${g.top}px`;
      key.style.height = `${g.height}px`;
      key.textContent = row.midi % 12 === 0 ? row.label : '';
      key.title = `Play ${row.label}`;
      key.setAttribute('aria-label', `Play ${row.label}`);
      key.onclick = () => Audio.previewNote(row.lane, row.freq, { bank: engineBank() });
      return [key];
    },
  });
  grid.setRulerLabel('Keys');

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

  return {
    // Opening lands on the part, and so does arriving at a new song. Everywhere else
    // the scroll position is left exactly where the hand put it — an edit must never
    // move the instrument under you, which is why `build` keeps it.
    open(on = true) {
      grid.open(on);
      if (on === false) return;
      // The panel is rebuilt on open, so the mode's class goes back on with it.
      for (const t of ROLL_TOOL_IDS) el.classList.toggle(`tool-${t}`, t === toolId);
      showPart();
    },
    close: grid.close,
    isOpen: grid.isOpen,
    refresh: grid.refresh,
    follow: grid.follow,
    songChanged() {
      grid.songChanged();
      if (grid.isOpen()) showPart();
    },
  };
}
