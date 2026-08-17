// A grid of bars against sixteenths, in a floating window — the shell under both the
// step sequencer and the piano roll.
//
// This was all one file. `mixer-step-seq.js` was written drums-first on purpose (see
// its header: a percussion lane is booleans, so there was no pitch axis to design and
// no new data type to invent), with the note that the write path underneath it is the
// one a piano roll would use. It is, and so is most of the rest: the batching, the
// paint gesture, the window, the playhead, the ruler, the selection and the shared-
// editing switch are all about BARS AND STEPS, and know nothing about drums.
//
// So what is left to a panel is small, and it is exactly the interesting part:
//
//   · what a ROW is        — a drum lane, or a pitch on one lane
//   · what a CELL holds    — a boolean, a frequency, or one note of a chord
//   · what a hit SOUNDS    — the lane's kit piece, or the pitch you drew
//
// Three functions say all of that: `isOn` reads a step, `withCell` writes one, and
// `preview` plays it. Everything else is here.
//
// ---- the two rules this inherits ------------------------------------------------
//
// NEVER MUTATE A BANK. Lane arrays are shared by object identity across sections AND
// across lane keys, so every write goes through `arrangement-edit.js`, which clones.
// Nothing in this file writes to a bank; it assembles sixteen values and hands them
// over.
//
// A PENDING EDIT IS ONE GESTURE. A paint-drag across twelve steps is one undo step and
// one re-render: cells are painted straight onto the DOM as the pointer moves, and the
// draft is built once, on release.
import {
  resolveSection, RESOLUTIONS, LEGACY_RESOLUTION, promoteResolution, resolutionOf,
} from '../src/data/arrangements.js';
import { lenKey } from '../src/engine/lanes.js';
import { writeBarNotes, writeBarNotesShared, setLanesOff } from './lib/arrangement-edit.js';
// A whole-song roll is tens of thousands of nodes built in one task — measured at
// ~200ms plus a ~120ms layout follow-up on smw-all-instruments — and the sequencer
// runs on the thread that build blocks, with only a quarter-second queued in front
// of it. Sometimes it survived, sometimes the queue ran dry mid-build: "expanding
// the roll sometimes glitches". So every deliberate rebuild goes through `heavyUi`,
// which queues the audio past it and records the cost under a name the watchdog can
// report. NOT the playhead's own page-flip build, which is two bars, runs
// mid-playback on its own schedule, and must never widen the window an edit is
// waiting to be heard through. See lib/heavy-ui.js.
import { heavyUi } from './lib/heavy-ui.js';

/**
 * The bars a shared edit really reaches.
 *
 * A section contains two bars, so section identity alone is too broad: changing the
 * first half of section 0 changes bars 1 and 3 in plumber, not bars 2 and 4. Keeping
 * this as data (rather than a hopeful caption) lets the panel say exactly what will
 * move before the user touches a step.
 */
export function sharedPatternGroups(plan, from, to) {
  const keyOf = (bar) => `${bar?.sec ?? 'root'}:${bar?.half ?? 0}`;
  const byPattern = new Map();
  plan.forEach((bar, i) => {
    const key = keyOf(bar);
    if (!byPattern.has(key)) byPattern.set(key, []);
    byPattern.get(key).push(i);
  });

  const groups = [];
  const seen = new Set();
  for (let source = from; source <= to; source++) {
    if (!plan[source]) continue;
    const key = keyOf(plan[source]);
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({ source, bars: byPattern.get(key) || [source] });
  }
  return groups;
}

export function sharedPatternDescription(plan, from, to) {
  const groups = sharedPatternGroups(plan, from, to);
  return groups.map(({ source, bars }) => {
    const targets = bars.map((b) => b + 1).join(', ');
    return bars.length > 1
      ? `Bar ${source + 1} pattern changes bars ${targets}`
      : `Bar ${source + 1} pattern is used only here`;
  }).join('  ·  ');
}

/** The integer grid column under the audible (fractional) transport position. */
/**
 * What a length in sixteenths is called, for a readout.
 *
 * Exact matches only, and a plain count of sixteenths otherwise: a note dragged to an
 * arbitrary length has no name, and inventing the nearest one would tell the reader it
 * is on a grid it is not on. Triplet values are thirds, so they are compared with a
 * tolerance rather than by equality.
 */
const LENGTH_NAMES = [
  [1 / 3, '1/32T'], [0.25, '1/64'], [0.5, '1/32'], [2 / 3, '1/16T'], [1, '1/16'],
  [4 / 3, '1/8T'], [2, '1/8'], [8 / 3, '1/4T'], [4, '1/4'], [16 / 3, '1/2T'],
  [8, '1/2'], [16, '1 bar'],
];

export function noteLengthName(sixteenths) {
  for (const [value, name] of LENGTH_NAMES) {
    if (Math.abs(sixteenths - value) < 1e-6) return name;
  }
  return `${Number(sixteenths.toFixed(3))} sixteenths`;
}

export function playheadCell(step, stepsPerBar = 16) {
  if (!Number.isFinite(step) || step < 0) return null;
  const slots = RESOLUTIONS.includes(stepsPerBar) ? stepsPerBar : 16;
  const whole = Math.floor(step * slots / 16);
  return { bar: Math.floor(whole / slots), step: whole % slots };
}

/** The two-bar page containing the audible transport position. */
export function playheadWindow(step, barCount, width = 2) {
  const at = playheadCell(step);
  if (!at || !(barCount > 0) || !(width > 0)) return null;
  const from = Math.floor(at.bar / width) * width;
  if (from >= barCount) return null;
  return { from, to: Math.min(barCount - 1, from + width - 1) };
}

/**
 * The scroll offset that puts a content range in the middle of a viewport.
 *
 * A short range is shown whole, with equal air on either side. If it is wider than
 * the viewport, the best useful answer is its middle — the same rule the roll uses
 * for a selected bar whose notes span more pitches than the panel can show.
 */
export function centeredRangeOffset(start, end, viewSize) {
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  const size = Math.max(0, viewSize);
  const span = b - a;
  return span <= size
    ? a - (size - span) / 2
    : (a + b - size) / 2;
}

/**
 * How many steps wide a note is DRAWN, which is not always how long it sounds.
 *
 * Truncated at the next note on the row, and at the end of the field: a rectangle
 * running through the note after it would be a drawing of something that is not there,
 * and one running off the end of the song would widen the panel it is drawn in. What
 * the note SOUNDS is untouched — the engine lets two notes on a row ring together and
 * that is a real sound somebody may have wanted.
 *
 * A note with no length of its own is one step wide, as every note in the roll was
 * before lengths existed. Deliberately not the lane's own `*Dur`: that is a property
 * of the VOICE — an organ pad rings for seven steps — so drawing every organ note
 * seven cells wide would black out the roll in order to say something about the patch
 * rather than about the part. Drag an edge and the note has a length of its own; then
 * the rectangle is exactly it.
 */
/** Rows built either side of the visible window, so a scroll never shows a gap. */
const OVERSCAN = 6;
/** And the same either side sideways, in whole bars — see `colWindow`. */
const BAR_OVERSCAN = 1;

/**
 * The arrows, as a step and a row.
 *
 * Rows run highest-first, so UP is a row less — the one place in this file where the
 * screen's direction and the array's direction disagree, and the reason it is a table
 * rather than a sign flip somewhere in a handler.
 *
 * In a piano roll, ⇧ on horizontal arrows changes note length, while ⇧⌥ makes the
 * longer horizontal gesture move a phrase by a bar. ⇧ on vertical arrows remains an
 * octave move; the grid itself keeps this table neutral and lets the handler decide.
 */
const ARROWS = {
  ArrowLeft: { step: -1, row: 0 },
  ArrowRight: { step: 1, row: 0 },
  ArrowUp: { step: 0, row: -1 },
  ArrowDown: { step: 0, row: 1 },
};

/**
 * ---- what a press does ------------------------------------------------------------
 *
 * One table, because this is the panel's whole interaction model and it should be
 * readable in one place rather than deduced from a chain of ifs inside an event
 * handler. It is a pure function for the same reason: these are RULES, and rules that
 * can only be exercised by a pointer are rules nobody checks.
 *
 * `auto` is the default and it is modeless — the modern roll's behaviour, where the
 * pointer works out what you meant from where you pressed: empty space draws, a note's
 * body moves it, a note's right end lengthens it. Nothing to choose before you start.
 *
 * The named tools exist because modeless has two costs, and both of them land on the
 * same people. It asks you to HOLD A KEY for the second gesture, and it asks you to
 * AIM at a six-pixel edge. Neither is reasonable to require, so every gesture is also
 * available as a mode that needs no modifier and no precision: Draw, Paint, Erase.
 *
 * `alt` is the momentary override — the "other tool" key in Logic and Cubase, and the
 * one modifier this leaves free is SHIFT, which belongs to selection wherever
 * selection exists and is not a key to spend twice.
 *
 * Returns one of:
 *   draw    a new note, and the drag sets how long it is
 *   move    pick the note up and put it somewhere else
 *   resize  take the note's right end and pull
 *   run     the step grid's drag: a trail of separate notes, or rubbing a trail out,
 *           decided by whether the first cell was filled
 *   erase   the same drag, always rubbing out
 */
export function gestureFor({
  tool = 'auto', alt = false, meta = false, shift = false,
  on = false, edge = false, sizeable = false, secondary = false,
} = {}) {
  // The right button rubs out. Before every other rule, because that is what makes it
  // worth having: an eraser that is always under your other finger, in every mode, with
  // no modifier and nothing to aim at. It is what FL, Reaper and Cubase all do, and it
  // is the reason a LEFT click on a note is free to mean "pick this one out" instead of
  // destroying it — which is what it used to do, and what made an abandoned drag
  // (press, think better of it, release) cost you the note.
  if (secondary) return 'erase';
  // ⌘ (⌃ off a Mac) draws a rectangle round notes, in any mode. That is the standard
  // escape hatch wherever drawing owns the empty-space drag, and it is why Select can
  // be a mode you rarely have to visit.
  if (meta) return 'marquee';
  // ⇧ on a note adds it to the selection or takes it out — the one thing Shift means
  // everywhere, and the reason nothing else was allowed to have it.
  if (shift && on) return 'select';
  if (alt || tool === 'paint') return 'run';
  if (tool === 'erase') return 'erase';
  // Select is the pointer that never writes: empty space draws a rectangle, a note is
  // taken hold of, and dragging one that is already selected moves the whole set.
  if (tool === 'select') return on ? 'select' : 'marquee';
  // Draw makes notes and sets their length, and never moves one: pressing a note it
  // has already made takes hold of its length, which is the same job continued.
  if (tool === 'draw') return on ? (sizeable ? 'resize' : 'run') : 'draw';
  if (!on) return 'draw';
  return edge && sizeable ? 'resize' : 'move';
}

/**
 * A note's place in the panel, as a string — the unit a selection is made of.
 *
 * Position rather than identity, because that is what a note IS here: a bank holds
 * sixteen values per bar and nothing to hang an id on. So a selection is a set of
 * places, and everything that moves notes moves the selection with them by rebuilding
 * the keys rather than by tracking objects that do not exist.
 */
export const noteKey = (bar, step, rowKey) => `${bar}:${step}:${rowKey}`;

/**
 * Where a selected note lands when the set is dragged by `dStep` steps and `dRow` rows.
 *
 * Pure, and the reason is that a multi-note move has exactly one interesting property
 * and it is arithmetic: every note in the set moves by the SAME amount, so the shape
 * of a phrase survives the drag. Getting that wrong is a chord that arrives as an
 * arpeggio, which is the kind of thing a test should catch rather than an ear.
 */
export function movedNote({ bar, step, rowAt }, dStep, dRow, { bars, rows, stepsPerBar = 16 }) {
  const g = Math.max(0, Math.min(bars * stepsPerBar - 1, bar * stepsPerBar + step + dStep));
  return { bar: Math.floor(g / stepsPerBar), step: g % stepsPerBar,
    rowAt: Math.max(0, Math.min(rows - 1, rowAt + dRow)) };
}

/**
 * How far a set may be dragged before some of it would fall off the edge.
 *
 * Clamped as a WHOLE — the whole set stops when its leading note reaches the end,
 * rather than every note stopping on its own. Per note, a drag against the edge would
 * pile the selection up in the last bar and flatten the phrase into a chord.
 */
/**
 * The lengths a set of notes takes when one of them is dragged out by `by` steps.
 *
 * BY the same amount, not TO the same length. A quarter note and two sixteenths pulled
 * out by a beat are still a quarter note and two sixteenths — the phrase keeps its
 * rhythm and only its scale changes. Setting them all to whatever the note under the
 * pointer became flattens that rhythm to one value, which is then yours to rebuild note
 * by note.
 *
 * The generic helper defaults to one step as its floor. The freehand piano roll passes
 * its own 64th-note floor, while other set edits can retain the safer one-step default.
 * Either way, the whole set stops at the floor rather than refusing the drag because
 * one note has run out of room.
 */
export function stretched(lens, by, minimum = 1) {
  const floor = Number(minimum);
  const min = floor > 0 ? floor : 1;
  return lens.map((len) => Math.max(min, (len ?? 1) + by));
}

// One piano-roll step is a sixteenth note, so a quarter of a step is a sixty-fourth.
// Freehand shortening stops here: it remains visibly and audibly non-zero without
// bringing back the old one-sixteenth floor.
export const MIN_NOTE_LENGTH = 0.25;

/**
 * Snap a positive note length to a musical grid, in sequencer steps.
 *
 * One step is one sixteenth in the current bank format. This is deliberately an
 * explicit edit helper rather than something the piano roll applies while drawing:
 * freehand lengths remain continuous, and callers opt into a grid when they want it.
 */
export function quantiseLength(len, grid = 1) {
  const value = Number(len);
  const step = Number(grid);
  if (!(value > 0) || !(step > 0)) return null;
  return Number((Math.max(step, Math.round(value / step) * step)).toFixed(6));
}

export function clampDelta(notes, dStep, dRow, { bars, rows, stepsPerBar = 16 }) {
  if (!notes.length) return { dStep: 0, dRow: 0 };
  const gs = notes.map((n) => n.bar * stepsPerBar + n.step);
  const rs = notes.map((n) => n.rowAt);
  const lowG = Math.min(...gs);
  const highG = Math.max(...gs);
  const lowR = Math.min(...rs);
  const highR = Math.max(...rs);
  return {
    dStep: Math.max(-lowG, Math.min(bars * stepsPerBar - 1 - highG, dStep)),
    dRow: Math.max(-lowR, Math.min(rows - 1 - highR, dRow)),
  };
}

export function drawnSpan(field, at, len, from = 0) {
  if (!(len > 0)) return 1;
  const available = field.length - at;
  if (!(available > 0)) return 1;
  let span = Math.min(len, available - from);
  // A later note on the same pitch is a visual boundary, but it must not quantise
  // the note before it. Keep the real fractional length up to that boundary.
  //
  // A boundary is a column filled at its own left edge — or, where the song is stored
  // finer than it is drawn, the first OFF-GRID note standing part of the way across a
  // column (see `displayCols`). Both are notes on this pitch and neither may be drawn
  // through; `from` is how far into its own column the note being measured begins, so
  // an inset is not clipped by the column start it hangs off.
  for (let k = 0; k < available; k++) {
    const cell = field[at + k];
    const inner = k === 0
      ? cell.insets?.find((x) => x.at > from)?.at
      : (cell.on ? 0 : cell.insets?.[0]?.at);
    if (inner == null) continue;
    span = Math.min(span, k + inner - from);
    break;
  }
  return Math.max(Number.EPSILON, span);
}

/**
 * How many columns a bar is DRAWN in, given the grid it is STORED on.
 *
 * The two stopped being the same thing once a song could be stored at 48 or 96. One
 * triplet bar puts a whole song on a 48-slot grid — the normaliser will not demote
 * while that note exists, and it should not — but drawing forty-eight columns a bar for
 * sixty-five bars makes a mostly-sixteenth song read as a triplet song. The argument is
 * legibility: the roll should look like the music, not like the storage.
 *
 * So the SNAP decides, under three rules: the columns divide the stored grid evenly, so
 * a column holds a whole number of slots; there are never fewer than sixteen, so a 1/4
 * snap does not draw four columns a bar; and every snap division gets a line of its own,
 * which is the difference between a grid and a decoration — a snap you cannot see is a
 * snap you cannot aim at. That last one is a MULTIPLE, not a minimum: 1/8T divides a bar
 * twelve ways, and sixteen columns is more than twelve without any of them landing on a
 * triplet.
 *
 * Draw on 1/16 and a 48-slot song is sixteen columns a bar with its triplets shown as
 * insets; reach for 1/16T and it is twenty-four, with the triplets on the lines and the
 * straight sixteenths between them. Neither picture is a lie and neither loses a note —
 * every slot is still addressable, and `snapSlots` is the one control over which of them
 * get a line of their own.
 *
 * A panel that supplies no snap (the step grid) asks for one column per slot, which is
 * exactly what it drew before any of this existed.
 */
export function displayCols(slots, snapSize = 1) {
  const stored = RESOLUTIONS.includes(slots) ? slots : LEGACY_RESOLUTION;
  const snap = Math.max(1, Math.round(Number(snapSize) || 1));
  // Snap divisions to the bar. Whole for every pairing the pickers can reach, because
  // the song is promoted to a grid that holds the snap before this is asked.
  const divisions = Math.max(1, Math.ceil(stored / snap));
  for (let c = LEGACY_RESOLUTION; c <= stored; c++) {
    if (stored % c === 0 && c % divisions === 0) return c;
  }
  return stored;
}

/**
 * @param el          the panel's own div, held rather than looked up — it is detached
 * @param bank        () => the song as it PLAYS, for reading what a bar currently has
 * @param editBank    () => the song as it is WRITTEN, which is what an edit is relative
 *                    to. Handing the seam the arranged bank double-counts the layer
 *                    sections and the second edit to a song writes past the end of the
 *                    list — see `editBank` in mixer-entry.js.
 * @param draft       () => the current bar list
 * @param sel         () => { from, to } — the bars to show, already defaulted
 * @param apply       (draft, what) => the desk's arrangement-edit path: undo, validate,
 *                    engine, redraw. A note edit is an arrangement edit, so it inherits
 *                    ⌘Z, the A/B and Save without any of them knowing about this file.
 * @param ns          localStorage namespace, so two panels remember their own position
 *                    but SHARE the shared-editing switch — see LINK_KEY below.
 * @param rows        (ctx) => [{ key, lane, label, colour, muted, unused, ... }]. `key`
 *                    identifies the row in the DOM; `lane` is what it writes to. For the
 *                    step grid those are the same thing; for a roll, every row is a
 *                    different pitch on ONE lane.
 * @param isOn        (row, value) => is this row's cell filled, given the step's value
 * @param withCell    (row, value, on) => the step's new value. Returning the rest value
 *                    (`false` for percussion, `null` elsewhere) is how a cell is cleared,
 *                    and which of those it is matters — tests/preview.js pins it.
 * @param preview     (row, value) => sound it. Called only on the way IN: a drag that
 *                    erases twelve steps should not play twelve notes.
 * @param previewRelease () => release every preview started by the current gesture.
 * @param addLength   (row) => the explicit length for a new note, or null when this
 *                    editor does not support per-note lengths. Existing notes never
 *                    call for this value; their stored lengths are preserved.
 * @param title       (ctx) => the window's title line
 * @param headerExtra (ctx) => [HTMLElement] — buttons between the title and the ✕
 * @param rowHeader   (row, ctx) => [HTMLElement] — the sticky left cell's contents
 * @param lead        (ctx) => [HTMLElement] — anything before the title (the grid's `+`)
 */
export function createBarGrid({
  el, Audio, bank, editBank, draft, sel, apply, engineBank, onClose = () => {},
  toast = () => {},
  ns = 'grid', rows, isOn, withCell, preview = () => {}, previewRelease = () => {},
  // ---- lengths, and the gestures that need them
  //
  // A panel that says nothing about length gets the behaviour it had before lengths
  // existed: `withLen` never changes one, `cellLen` never widens a note, `movable` is
  // off and a press on a filled cell begins an erase-drag as it always did. That is
  // the step grid, exactly — a drum hit has no length and dragging one to another
  // beat is not a gesture anybody performs on a kit.
  withLen = () => null, cellLen = () => null, addLength = () => null,
  resizable = () => false, movable = false,
  // Runtime note-onset resolution. The transport and stored lengths remain in
  // sixteenth-step units; only the number of addressable onset slots changes.
  stepsPerBar = () => 16,
  snapSlots = () => 1,
  // A panel whose rows are an INSTRUMENT rather than a track list: it shows all of
  // them and only draws the ones in view. `rowHeight` is the fallback pixel height
  // of one row; an instrument may provide `rowHeightOf(row)` for a deliberate,
  // shared variable row layout. The spacers and hit map use the same measurements.
  // `rowPadding` accounts for a physical instrument whose first/last key extends
  // beyond the first/last editable pitch row.
  virtual = false, rowHeight = 0, rowHeightOf = null,
  rowPadding = () => ({ before: 0, after: 0 }),
  // Which gesture a press performs — see `gestureFor`. `auto` reads where you pressed;
  // the named tools each do one thing, for when holding a modifier or aiming at a
  // note's edge is not something you want to have to do.
  tool = () => 'auto',
  // Whether notes can be picked out in sets: ⌘-drag a rectangle round them, ⇧-click to
  // add one, then move, stretch or delete the lot as one edit.
  selectable = false,
  // A hosted editor may project the selected notes into another visual surface (the
  // piano roll lights its matching key faces). The grid owns selection; the host owns
  // what that selection means outside the cells.
  selectionChanged = () => {},
  // A pattern panel is scoped to the bars you selected and pages two at a time as the
  // song plays. A piano roll is not: it shows the whole part and scrolls, because a
  // melody is a shape across bars and a two-bar window cannot show you one. `docked`
  // goes with it — a panel that shows everything wants the width of the page, and it
  // gives up the floating frame, the remembered position and the drag to get it.
  wholeSong = false, docked = false,
  // Whether this panel offers the shared-editing switch. Off, the panel forks the bar
  // you click and never touches the other bars playing it — the unlinked behaviour,
  // pinned rather than remembered, so a switch thrown in the other panel cannot change
  // what this one does behind its back.
  scopeToggle = true,
  // The bars an ACTION reaches, which is not always the bars on SCREEN.
  //
  // A pattern panel shows the bars you selected and acts on exactly those, so the two are
  // the same thing there. A whole-song panel shows the lot, and there they are not: a
  // figure is a bar long and the field is the song, so something has to say how far it
  // goes. `null` from this means the whole of what is shown — for the kit that is "you
  // picked out four bars, so those four; you picked nothing, so all of it", which is what
  // a rhythm chosen from a whole-song editor means. Clamped into `range` either way, so a
  // stale selection cannot write past the end of a shorter song.
  actionRange = null,
  // The desk's bar selection, and how to change it. A whole-song panel draws the song,
  // so the bars picked out of it are part of what it is showing — and the ruler is where
  // a selection is made everywhere else on this desk, so it is where one is made here.
  // Null from `selectedBars` means nothing is picked out.
  selectedBars = null, onSelectBars = null,
  // A piano-roll time selection is finer than the desk's bar selection. The range is
  // absolute musical sixteenths, end-exclusive (independent of a 16/32-cell drawing),
  // and is deliberately a separate callback so a beat drag never changes the
  // arrangement's selected bars underneath the editor.
  selectedTime = null, onSelectTime = null,
  locatorPositions = null, onLocatorContextMenu = null,
  onLocatorMove = null, onLocatorMoveEnd = null,
  onTimeContextMenu = null,
  onDoubleClickStep = null,
  onSelectTimeEnd = null,
  // Where the panel's own controls go. Given a host, they are placed INTO it rather than
  // into a header of their own — so a docked panel adds its controls to the row the region
  // already has instead of stacking a second row under it. Two headers naming the same
  // channel is a row of chrome for nothing.
  headerHost = null,
  noteLabels = () => true,
  title, headerExtra = () => [], rulerHeader = () => [], rowHeader = () => [], lead = () => [],
  laneLabel = (key) => key,
}) {
  const POS_KEY = `mash-mixer-${ns}-pos`;
  // Deliberately NOT namespaced: "am I editing this bar or every bar that plays it"
  // is one decision about how you are working, not one per panel. Switching it in the
  // step grid and finding the roll disagreed would be two answers to one question.
  const LINK_KEY = 'mash-mixer-stepseq-linked';

  // Off: an edit forks the bar, and the other bars playing that section carry on as
  // they were. On: the whole loop changes together. Both are real gestures — "fix
  // this bar" and "the hats are wrong in this song" — and neither is a good default
  // for the other, so it is a switch rather than a guess. Remembered, because whoever
  // wants one of them usually wants it for a while.
  let linked = scopeToggle && localStorage.getItem(LINK_KEY) === '1';

  // Edits made but not yet handed to the desk, keyed by the bar and the LANE they
  // land on — which is the unit `writeBarNotes` takes, and the reason a roll drawing
  // thirty pitch rows still commits one array per bar like the grid does.
  const pending = new Map();
  const kof = (b, lane) => `${b}:${lane}`;

  let plan = [];
  // ---- the two grids, and the one rule for telling them apart ----------------------
  //
  // `slots` is STORAGE: the address space of every read and write, and the unit of every
  // POSITION — `dataset.step`, `globalStep`, the drag bounds, the paste anchor. `cols` is
  // DISPLAY: what is drawn, one cell per column, chosen by the snap (see `displayCols`).
  // Every WIDTH is in columns, because a width is a number of drawn cells: `cellSpan`,
  // the `--len` multiplier, the length a resize hands back to `setCell`.
  //
  // Getting one backwards renders notes the wrong length, which looks like a data bug
  // rather than a drawing one — so: positions divide by `slotUnit()`, widths by
  // `colUnit()`, and `colStride` converts between them.
  let slots = 16;
  let cols = 16;
  let colStride = 1;
  const slotUnit = () => 16 / slots;
  const colUnit = () => 16 / cols;
  /** The column a storage slot falls in, and the slot that column begins on. */
  const colOf = (i) => Math.floor(i / colStride);
  const colStart = (i) => colOf(i) * colStride;
  const snapSize = () => Math.max(1, Math.round(Number(
    typeof snapSlots === 'function' ? snapSlots(slots) : snapSlots) || 1));
  /** One snap division as a WIDTH — never less than a column, since a column is finer. */
  const snapCols = () => snapSize() / colStride;
  const snappedStep = (step) => Math.max(0, Math.min(slots - 1,
    Math.round(step / snapSize()) * snapSize()));
  let range = { from: 0, to: 0 };
  let colCells = new Map();  // `${bar}:${slot of a column's start}` -> the cells in it
  let lit = [];             // the column the playhead is standing on
  let paint = null;         // the value a drag is painting, decided by its first cell
  let autoBar = null;       // first bar of the two-bar page being heard
  let rulerLabel = '';      // the ruler's own corner, named by the panel
  let playhead = null;      // the one line, moved rather than redrawn
  // The rows as last drawn, by key. The gesture arrives with a DOM dataset and needs
  // the row object back — rebuilt on every draw, because a roll's rows move when the
  // octave does and a stale index would write the note you were looking at before.
  let rowIndex = new Map();
  // The rows as data, the body they are drawn into, and the slice of them that is
  // currently drawn — see `renderRows`. `scrollAt` outlives every rebuild, because
  // where you are in an eighty-eight-row instrument is not something a repaint may
  // take away from you.
  let rowList = [];
  let rowPositions = [0];
  let rowInsets = { before: 0, after: 0 };
  let bodyEl = null;
  let fixedBodyEl = null;
  let rulerEl = null;
  // The hatched band over the bars picked out. ONE element across the whole ruler — both
  // number strips and the air between them — because two of them, one per strip, is two
  // blocks with a seam and a restarted hatch angle rather than one region. It hangs in a
  // clip that starts where the field starts, so it can never reach the corner labels, and
  // it travels sideways on the same `--roll-scroll-x` the ruler's own cells do.
  let selBand = null;
  let timeBand = null;
  let locatorClip = null;
  let locatorDrag = null;
  // The bars strip's own cell container, held rather than looked up: it is the time axis
  // as MEASURED, and both the playhead and the bar window read it — see `rulerCells`.
  let barCellsEl = null;
  // The bars strip's cells, as a list of their own. NOT `barCellsEl.children`: the
  // selection band lives in that container too, so `children[0]` was the band and every
  // measurement taken off "cell zero" was taken off the thing being positioned by it —
  // the band walked itself to the start of the song, one repaint at a time.
  let barCells = [];
  let rendered = null;
  let scrollAt = { top: 0, left: 0 };
  // The field's geometry as last MEASURED — one step's width, and the width of the
  // viewport it scrolls in. Held across rebuilds so a folded region, which measures
  // nothing, still windows its bars against the numbers it had. See `colWindow`.
  let stepPx = 0;
  let fieldPx = 0;
  // Whether the transport is still allowed to drag the field sideways. A hand that
  // scrolls the roll left or right during playback is looking at something, and the
  // playhead walking the view back off it a sixteenth later is the field arguing with
  // its owner. `followX` goes false on the first horizontal move this panel did not
  // make, and comes back when the cursor is comfortably on screen again — scroll back
  // to the playhead and it takes over once more, which is how you ask for it without
  // a control. `autoLeftAt` is the last position the transport set, so the scroll event
  // it causes can be told apart from yours.
  let followX = true;
  let followEnabled = true;
  let autoLeftAt = null;
  // How many rows are drawn is a measurement of the scroller, and the scroller's height
  // is not the panel's to decide: folding the effects panel, dragging the desk splitter
  // or making the window taller all hand it more room without moving the scroll. See
  // `watchSize`.
  let sizeWatch = null;
  // Keep the cheap desk layout live under a resize pointer, but hold the expensive
  // virtual row replacement until the final size has landed. Rebuilding the visible
  // roll while the audio scheduler is refilling its lookahead can create a gap.
  let resizeDeferred = false;
  let resizeDirty = false;
  // The notes picked out, as places — see `noteKey`. Survives a rebuild because it
  // holds strings rather than elements, and survives a move because whatever moves the
  // notes rebuilds the keys alongside them.
  let selection = new Set();
  // The one note last changed by this editor. Unlike selection this is a visual edit
  // marker: it stays on the written note after the pointer is released, so a stopped roll
  // still tells you what you just changed. A new note replaces it immediately.
  let editedKey = null;
  let editScope = null;
  let marquee = null;       // the rubber band, while one is being drawn
  let barViews = new Map();
  // A paste is deliberately a two-step gesture. The clipboard belongs to the piano
  // roll host; the grid owns only the armed preview and the eventual arrangement write.
  let pastePlacement = null;
  let pastePreviewCells = [];

  const isOpen = () => el.classList.contains('show');
  const barWords = (r) => (r.from === r.to
    ? `bar ${r.from + 1}` : `bars ${r.from + 1}-${r.to + 1}`);
  const barSpan = () => barWords(range);
  /** The bars an action lands in — see `actionRange`. The shown bars, unless asked. */
  const scope = () => {
    const want = actionRange ? (actionRange() || range) : (wholeSong ? sel() : range);
    const from = Math.max(range.from, Math.min(want.from ?? range.from, range.to));
    return { from, to: Math.max(from, Math.min(want.to ?? from, range.to)) };
  };
  /**
   * The bars in words. "The whole song" rather than "bars 1-64" when that is what it is:
   * the number is a thing to check and the phrase is a thing to read, and this appears in
   * a menu title above the item that is about to act on them.
   */
  const actionSpan = () => {
    const a = scope();
    return wholeSong && range.to > range.from && a.from === range.from && a.to === range.to
      ? 'the whole song' : barWords(a);
  };

  // Keep row geometry in one place. The piano roll intentionally groups its
  // chromatic rows into two small families, but the step grid remains uniform because
  // its rows are tracks rather than pitches. `rowPositions[i]` is the top of row i in
  // the body, and the last entry is the body's complete pitch/track height.
  const baseRowHeight = () => {
    const value = typeof rowHeight === 'function' ? Number(rowHeight()) : Number(rowHeight);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const rowHeightAt = (row) => {
    const fallback = baseRowHeight();
    const measured = typeof rowHeightOf === 'function' ? Number(rowHeightOf(row)) : fallback;
    if (Number.isFinite(measured) && measured > 0) return measured;
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  };
  const readRowPadding = () => {
    const value = typeof rowPadding === 'function' ? rowPadding() : rowPadding;
    return {
      before: Math.max(0, Number(value?.before) || 0),
      after: Math.max(0, Number(value?.after) || 0),
    };
  };
  const rebuildRowPositions = () => {
    rowInsets = readRowPadding();
    rowPositions = [rowInsets.before];
    for (const row of rowList) {
      rowPositions.push(rowPositions[rowPositions.length - 1] + rowHeightAt(row));
    }
  };
  const rowTotal = () => rowOffset(rowList.length) + rowInsets.after;
  const rowOffset = (index) => {
    const i = Math.max(0, Math.min(rowList.length, Number(index) || 0));
    return rowPositions[i] || 0;
  };
  const rowAtOffset = (offset) => {
    const total = rowList.length;
    if (!total) return -1;
    const y = Math.max(0, Number(offset) || 0);
    if (y >= rowPositions[total]) return total - 1;
    let low = 0;
    let high = total;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rowPositions[middle + 1] <= y) low = middle + 1;
      else high = middle;
    }
    return Math.min(total - 1, low);
  };

  /** What the panel hands its callbacks: everything they could reasonably ask. */
  const ctx = () => ({
    plan, range, linked, barSpan: barSpan(), bank: bank(),
    // The bars a figure, a groove or a mute would land in, and the words for them. The
    // same as `range` on a panel that shows what it acts on — see `actionRange`.
    action: scope(), actionSpan: actionSpan(),
  });

  /** Keep docked piano-roll chrome aligned without making it another scroller. */
  const syncDockedChrome = (scroll) => {
    if (!docked || !scroll) return;
    rulerEl?.style.setProperty('--roll-scroll-x', `${scroll.scrollLeft}px`);
    if (fixedBodyEl) fixedBodyEl.style.transform = `translateY(${-scroll.scrollTop}px)`;
  };

  /**
   * Record where the scroller is, and notice when it was you who moved it sideways.
   *
   * Every horizontal move this panel makes on purpose leaves its target in `autoLeftAt`
   * or lands on the position already in `scrollAt`, so anything else — wheel, trackpad,
   * scrollbar, a keyboard's arrow — is the hand, and the transport gives up the time
   * axis until the playhead is back in view. A pixel of slack because a scroller may
   * land fractionally off what it was handed.
   */
  const noteScroll = (scroll) => {
    const left = scroll.scrollLeft;
    if (left !== scrollAt.left) {
      if (autoLeftAt != null && Math.abs(left - autoLeftAt) <= 1) autoLeftAt = null;
      else followX = false;
    }
    scrollAt = { top: scroll.scrollTop, left };
  };

  /**
   * The sixteen raw values a bar plays on one bank key.
   *
   * Read through the delta chain, then fall through to the bank exactly as the
   * sequencer does: a section that overrides the snare says nothing about the kick,
   * and the kick it plays is the song's. Raw, not coerced — a boolean lane and a
   * melodic one are the same read, and only the caller knows which it wanted.
   *
   * Any key, not just a lane's notes, because a lane's note LENGTHS are read the same
   * way through the same chain — see `readPair`.
   */
  function readKey(b, key) {
    const bar = plan[b];
    if (!bar) return new Array(slots).fill(null);
    const view = bank();
    const resolved = (bar.sec != null ? resolveSection(view, bar.sec) : null) || {};
    const arr = resolved[key] ?? view[key];
    if (!Array.isArray(arr)) return new Array(slots).fill(null);
    // A lane written coarser than the grid occupies every stride'th slot of it. Same
    // fold, same guards, as `sequenceValue` in the engine — these two must agree or the
    // grid draws a note the scheduler will not play.
    const laneResolution = arr.length / 2;
    const stride = slots / laneResolution;
    if (arr.length < slots * 2 && Number.isInteger(stride) && RESOLUTIONS.includes(laneResolution)) {
      const at = bar.half * laneResolution;
      return Array.from({ length: slots }, (_, i) => (i % stride ? null : arr[at + i / stride] ?? null));
    }
    const at = bar.half * slots;
    return Array.from({ length: slots }, (_, i) => arr[at + i] ?? null);
  }

  /**
   * A bar's notes AND their lengths, pending edits included.
   *
   * The two are read and written together, always. A bar handed to the desk with new
   * notes against old lengths is a bar where the note you just drew rings for as long
   * as the one you replaced did — so there is one entry in the pending map holding
   * both, and no code path that can stage half of it.
   *
   * `lengths` is null in the pending entry until something actually writes a length,
   * which is what makes a drum grid and a groove figure say nothing about length at
   * all; the effective lengths then come from the bank, as they do for the drawing.
   */
  function readPair(b, lane) {
    const pend = pending.get(kof(b, lane));
    return {
      notes: pend?.notes || readKey(b, lane),
      lengths: pend?.lengths || readKey(b, lenKey(lane)),
    };
  }

  /** The sixteen raw values a bar plays on one lane, pending edits included. */
  const readBar = (b, lane) => readPair(b, lane).notes;
  const barView = (b) => {
    const root = engineBank?.() || bank();
    if (!root) return null;
    const bar = plan[b];
    if (!bar || bar.sec == null) return root;
    if (barViews.has(bar.sec)) return barViews.get(bar.sec);
    const section = resolveSection(root, bar.sec);
    const merged = section ? { ...root, ...section } : root;
    barViews.set(bar.sec, merged);
    return merged;
  };
  const cellSpan = (row, value, len, b, step) => {
    const length = cellLen(row, value, len, {
    bar: b,
    step,
    blockStep: ((plan[b]?.half ?? 0) * slots) + step,
    view: barView(b),
    });
    // In COLUMNS: this is how wide the note is DRAWN, and a drawn cell is a column.
    return length > 0 ? length / colUnit() : length;
  };

  const mutedIn = (b, lane) => (plan[b]?.off || []).includes(lane);

  // ---- editing -------------------------------------------------------------------

  // A length is a number, or one per chord tone, or nothing — so "is this the same
  // length" is not always `Object.is`.
  const sameLen = (a, b2) => (Array.isArray(a) || Array.isArray(b2)
    ? JSON.stringify(a ?? null) === JSON.stringify(b2 ?? null)
    : Object.is(a ?? null, b2 ?? null));

  /**
   * Stage one cell. Returns false when it already held that, so a drag can skip it.
   *
   * `step` is a STORAGE slot; `drawn` is a length in DRAWN COLUMNS — what a resize is
   * FOR. Absent (a paint, an erase, a keyboard press) the panel decides what happens to
   * the length that was there, which for the roll means: a new note inherits nothing and
   * an erased one takes its length with it. Nothing here knows which; `withLen` does.
   */
  function setCell(row, b, step, on, drawn = null) {
    const key = kof(b, row.lane);
    const cur = readPair(b, row.lane);
    const value = cur.notes[step] ?? null;
    const len = cur.lengths[step] ?? null;
    const nextValue = withCell(row, value, on);
    const nextLen = withLen(row, value, len, on,
      drawn == null ? null : drawn * colUnit());
    const noteChanged = !Object.is(nextValue, value);
    const lenChanged = !sameLen(nextLen, len);
    if (!noteChanged && !lenChanged) return false;
    const notes = cur.notes.slice();
    notes[step] = nextValue;
    // Materialised only once a length is actually in play. A percussion grid never
    // reaches this, so it hands the desk `null` and the lengths key of the lane it
    // writes is left exactly as it was.
    const staged = pending.get(key)?.lengths;
    let lengths = staged || null;
    if (lenChanged || staged) {
      lengths = cur.lengths.slice();
      lengths[step] = nextLen;
    }
    pending.set(key, { notes, lengths });
    const edit = noteKey(b, step, row.key);
    if (on) editedKey = edit;
    else editedKey = null;
    return true;
  }

  /**
   * Hand everything the drag touched to the desk, as one edit.
   *
   * Each bar is written on its own — `writeBarNotes` takes sixteen steps and puts them
   * at that bar's half of the section — and each write is chained onto the draft the
   * last one returned, so forking one bar cannot lose another's edit.
   */
  function commit() {
    if (!pending.size) return;
    const write = linked ? writeBarNotesShared : writeBarNotes;
    const eb = editBank();
    let d = draft();
    const lanes = new Set();
    const bars = new Set();
    for (const [k, edit] of pending) {
      const cut = k.indexOf(':');
      const b = Number(k.slice(0, cut));
      const lane = k.slice(cut + 1);
      lanes.add(lane);
      bars.add(b);
      d = write(eb, d, b, lane, edit.notes, edit.lengths);
    }
    pending.clear();
    const what = `${[...lanes].map((l) => laneLabel(l)).join(', ')} in `
      + (bars.size === 1 ? `bar ${[...bars][0] + 1}` : `${bars.size} bars`)
      + (linked ? ', everywhere it plays' : '');
    // The desk validates and can refuse. Rebuilt either way: on a refusal the cells
    // are showing an edit that did not happen.
    apply(d, what);
    build();
  }

  /**
   * Stage sixteen steps on a lane across every bar in scope, then commit once.
   *
   * The selection is the scope, as it is everywhere else here: one bar selected puts
   * the figure in that bar, four puts it in four. On a panel that shows the whole song
   * that is the desk's selection rather than the bars on screen — see `actionRange`.
   */
  function layDown(byLane, { add = false } = {}) {
    // A figure is new notes, so the lengths that were there belonged to notes that are
    // not. Sixteen nulls rather than "say nothing": laying a groove over a part
    // somebody had drawn long notes into must not play the new one at the old lengths.
    const cleared = Array.from({ length: slots }, () => null);
    const a = scope();
    for (const [lane, steps] of Object.entries(byLane)) {
      // A house figure is written as sixteen sixteenths. On a finer grid it lands on
      // every stride'th slot with rests between, rather than being squashed into the
      // first sixteen slots of the bar.
      const figureStride = steps.length && slots % steps.length === 0 ? slots / steps.length : 1;
      const figure = figureStride > 1
        ? Array.from({ length: slots }, (_, i) => (i % figureStride ? false : steps[i / figureStride]))
        : steps.slice(0, slots);
      for (let b = a.from; b <= a.to; b++) {
        // ADD keeps what the bar already plays and puts the figure on top of it, so
        // "on 2 and 4" and then "fill" is a backbeat with a fill in it rather than a
        // fill on its own. Only a hit can be added — a figure's rests say nothing about
        // the steps they fall on, which is what makes the two modes different: REPLACE
        // is the whole bar as drawn, rests and all.
        const was = add ? readBar(b, lane) : null;
        const notes = add
          ? figure.map((on, i) => (on || !!was?.[i]))
          : figure.slice();
        pending.set(kof(b, lane), { notes, lengths: cleared.slice() });
      }
    }
    commit();
  }

  /** Mute the lane across the bars in scope, or let it back in — the channel mute. */
  function toggleMute(lane) {
    const a = scope();
    const off = !mutedIn(a.from, lane);
    apply(setLanesOff(draft(), a.from, a.to, [lane], off),
      `${laneLabel(lane)} ${off ? 'out of' : 'back in'} ${actionSpan()}`);
    build();
  }

  /**
   * The hatched band across the bars picked out, over the ruler.
   *
   * One element per strip rather than a background on each cell: the timeline draws this
   * selection as 45° stripes, and stripes on a 22px box restart at every box — twenty-two
   * pixels of hatch, a seam, twenty-two more. Measured through `fieldX` like everything
   * else on this axis, so it lands on the same x as the numbers it covers.
   */
  function placeSelBand() {
    if (!selBand) return;
    const picked = selectedBars?.() || null;
    const from = picked ? Math.max(range.from, picked.from) : null;
    const to = picked ? Math.min(range.to, picked.to) : null;
    const left = from != null && to != null && to >= from ? fieldX(from, 0) : null;
    const right = left == null ? null : fieldX(to, slots - 1);
    if (left == null || right == null) { selBand.classList.remove('show'); return; }
    selBand.classList.add('show');
    selBand.style.left = `${left}px`;
    selBand.style.width = `${Math.max(0, right + stepWidth() - left)}px`;
  }

  /** Draw the beat-level time range over the same ruler geometry as the bar band. */
  function placeTimeBand() {
    if (!timeBand) return;
    const picked = selectedTime?.() || null;
    const unit = slotUnit();
    const start = picked ? Math.max(range.from * 16, Number(picked.start) || 0) : null;
    const end = picked ? Math.min((range.to + 1) * 16, Number(picked.end) || 0) : null;
    if (start == null || end == null || end <= start) {
      timeBand.classList.remove('show');
      return;
    }
    const first = Math.max(0, Math.floor(start / unit));
    const last = Math.max(first, Math.ceil(end / unit) - 1);
    const firstBar = Math.floor(first / slots);
    const firstStep = first % slots;
    const lastBar = Math.floor(last / slots);
    const lastStep = last % slots;
    const left = fieldX(firstBar, firstStep);
    const right = fieldX(lastBar, lastStep);
    if (left == null || right == null) { timeBand.classList.remove('show'); return; }
    timeBand.classList.add('show');
    timeBand.style.left = `${left}px`;
    timeBand.style.width = `${Math.max(0, right + stepWidth() - left)}px`;
  }

  /** Position the piano-roll's locator pins in the same measured field as the notes. */
  function placeLocatorPins() {
    if (!locatorClip) return;
    locatorClip.replaceChildren();
    const positions = locatorPositions?.() || null;
    if (!positions) return;
    const unit = slotUnit();
    for (const [id, value] of Object.entries(positions)) {
      if (!Number.isFinite(Number(value))) continue;
      const rendered = Math.max(0, Number(value) / unit);
      const bar = Math.floor(rendered / slots);
      const step = Math.max(0, Math.min(slots - 1, Math.round(rendered - bar * slots)));
      const left = fieldXFine(bar, step);
      if (left == null) continue;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `ssqlocator locator-${String(id).toLowerCase()}`;
      pin.dataset.locator = id;
      pin.style.left = `${left}px`;
      pin.setAttribute('aria-label', `Locator ${id}`);
      pin.dataset.tip = `Locator ${id}`;
      pin.dataset.tipsays = 'Right-click for loop, note selection, erase and locator actions';
      pin.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        locatorDrag = { id, pin, value: Number(value) };
        pin.classList.add('dragging');
        const move = (e) => {
          if (!locatorDrag || !(e.buttons & 1)) return;
          const step = stepUnder(e);
          if (step == null) return;
          const next = Math.max(0, Math.round(step * unit));
          locatorDrag.value = next;
          onLocatorMove?.(id, next);
          const nextBar = Math.floor(step / slots);
          const nextStep = step % slots;
          const nextLeft = fieldXFine(nextBar, nextStep);
          if (nextLeft != null) pin.style.left = `${nextLeft}px`;
        };
        const stop = () => {
          removeEventListener('pointermove', move);
          removeEventListener('pointerup', stop);
          removeEventListener('pointercancel', stop);
          const done = locatorDrag;
          locatorDrag = null;
          pin.classList.remove('dragging');
          if (done) onLocatorMoveEnd?.(done.id, done.value);
        };
        addEventListener('pointermove', move);
        addEventListener('pointerup', stop);
        addEventListener('pointercancel', stop);
      });
      pin.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onLocatorContextMenu?.(ev, id, Number(value));
      });
      locatorClip.append(pin);
    }
  }

  // ---- drawing ---------------------------------------------------------------------

  /**
   * Picking bars out, on the ruler — the gesture the timeline already has.
   *
   * Delegated from the panel's own root and finished on the WINDOW, because marking a
   * selection repaints this panel: the cell the drag started on is thrown away and
   * rebuilt mid-gesture, so a listener living on it would hear the first move and no
   * others. `elementFromPoint` asks the page what is under the pointer NOW, which is the
   * rebuilt cell, so the drag keeps working across every repaint it causes.
   */
  let rulerDrag = null;
  /**
   * Which bar the pointer is over, including where it is over NOTHING.
   *
   * A ruler is not a solid row of cells: a beat opens a 7px gap in front of it and a bar
   * line a 15px one, and both are MARGINS — outside every cell's box, so a press that
   * lands in one hits the container and the drag stops dead at exactly the bar lines you
   * are most likely to aim at. The strips have their own dead pixels above and below the
   * numbers for the same reason.
   *
   * So: the cell if there is one, and otherwise the bar whose column the x falls in,
   * found by halving rather than by walking a thousand cells on every pointermove.
   */
  const barUnder = (ev) => {
    const cell = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.ssqbarnum');
    const hit = cell ? Number(cell.dataset.bar) : NaN;
    if (Number.isFinite(hit)) return hit;
    const cells = rulerCells();
    if (!cells.length) return null;
    const rulerBox = (rulerEl || el).querySelector('.ssqbars')?.parentElement?.getBoundingClientRect();
    if (!rulerBox || ev.clientY < rulerBox.top || ev.clientY > rulerBox.bottom) return null;
    const leftOf = (b) => cells[(b - range.from) * cols].getBoundingClientRect().left;
    if (ev.clientX < leftOf(range.from)) return null;
    let lo = range.from;
    let hi = range.to;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (leftOf(mid) <= ev.clientX) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
  if (onSelectBars) {
    el.addEventListener('pointerdown', (ev) => {
      // Anywhere in the ruler, not only on a cell — `barUnder` is what decides whether
      // there is a bar there, and the gaps between the cells are part of the ruler.
      if (ev.button !== 0 || !ev.target?.closest?.('.ssqruler, .ssqbars, .ssqnums')) return;
      if (onSelectTime && ev.target.closest('.ssqnums')) return;
      const b = barUnder(ev);
      if (b == null) return;
      ev.preventDefault();
      const cur = selectedBars?.();
      // ⇧ extends from where the selection starts, exactly as it does on the timeline.
      if (ev.shiftKey && cur) { rulerDrag = { anchor: cur.from }; onSelectBars(cur.from, b); return; }
      // Pressing INSIDE the selection does not decide yet. Released where it went down
      // it is a click on the region, and a click on a region you already have means you
      // are done with it — that is the way OUT, which a select-only ruler has no other
      // gesture for. Dragged, it is the start of a new one from the bar under the
      // pointer, so keeping the press held is how you pick again without a detour.
      if (cur && b >= cur.from && b <= cur.to) { rulerDrag = { anchor: b, armed: true }; return; }
      rulerDrag = { anchor: b };
      onSelectBars(b, b);
    });
    addEventListener('pointermove', (ev) => {
      if (!rulerDrag || !(ev.buttons & 1)) return;
      const b = barUnder(ev);
      if (b == null) return;
      // Still on the bar it went down on: not a drag yet, and still a possible clear.
      if (rulerDrag.armed) {
        if (b === rulerDrag.anchor) return;
        rulerDrag.armed = false;
      }
      onSelectBars(rulerDrag.anchor, b);
    });
    const endDrag = () => {
      if (rulerDrag?.armed) onSelectBars(null);
      rulerDrag = null;
    };
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);
  }

  // Beat-range selection lives on the BEAT strip, leaving the BAR strip's existing
  // arrangement selection semantics untouched. The selected edges snap outward to
  // whole musical beats (four sixteenths), regardless of 16/32 drawn cells.
  let timeDrag = null;
  const stepUnder = (ev) => {
    const direct = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.ssqbarnum');
    if (direct && direct.closest('.ssqnums')) {
      const b = Number(direct.dataset.bar); const i = Number(direct.dataset.step);
      if (Number.isFinite(b) && Number.isFinite(i)) return b * slots + i;
    }
    const cells = rulerCells();
    let best = null; let distance = Infinity;
    for (const cell of cells) {
      const r = cell.getBoundingClientRect();
      const d = ev.clientX < r.left ? r.left - ev.clientX
        : ev.clientX > r.right ? ev.clientX - r.right : 0;
      if (d < distance) { distance = d; best = cell; if (!d) break; }
    }
    if (!best) return null;
    return Number(best.dataset.bar) * slots + Number(best.dataset.step);
  };
  const snapTime = (a, b) => {
    const unit = slotUnit();
    const low = Math.min(a, b) * unit;
    const high = (Math.max(a, b) + 1) * unit;
    const start = Math.floor(low / 4) * 4;
    const end = Math.min((range.to + 1) * 16, Math.ceil(high / 4) * 4);
    return { start, end: Math.max(start + 4, end) };
  };
  if (onSelectTime) {
    el.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || !ev.target?.closest?.('.ssqnums')) return;
      const step = stepUnder(ev);
      if (step == null) return;
      ev.preventDefault();
      timeDrag = { anchor: step };
      onSelectTime(snapTime(step, step));
      selectionChanged();
      placeTimeBand();
    });
    addEventListener('pointermove', (ev) => {
      if (!timeDrag || !(ev.buttons & 1)) return;
      const step = stepUnder(ev);
      if (step == null) return;
      onSelectTime(snapTime(timeDrag.anchor, step));
      selectionChanged();
      placeTimeBand();
    });
    const endTimeDrag = () => {
      if (timeDrag) onSelectTimeEnd?.(selectedTime?.() || null);
      timeDrag = null;
    };
    addEventListener('pointerup', endTimeDrag);
    addEventListener('pointercancel', endTimeDrag);
  }

  // The selected beat band is visually translucent and intentionally does not take
  // pointer events, so delegate its right-click from the ruler and resolve the hit
  // back to a musical position. This is the range itself as the target, not a locator.
  if (onTimeContextMenu) {
    el.addEventListener('contextmenu', (ev) => {
      if (!ev.target?.closest?.('.ssqruler')) return;
      const picked = selectedTime?.() || null;
      if (!picked || Number(picked.end) <= Number(picked.start)) return;
      const step = stepUnder(ev);
      if (step == null) return;
      const at = step * slotUnit();
      if (at < Number(picked.start) || at >= Number(picked.end)) return;
      ev.preventDefault();
      ev.stopPropagation();
      onTimeContextMenu(ev, picked);
    });
  }

  if (onDoubleClickStep) {
    el.addEventListener('dblclick', (ev) => {
      if (!ev.target?.closest?.('.ssqruler')) return;
      const step = stepUnder(ev);
      if (step == null) return;
      const beat = Math.max(0, Math.floor(step / Math.max(1, slots / 4))
        * Math.max(1, slots / 4));
      ev.preventDefault();
      ev.stopPropagation();
      onDoubleClickStep(beat * slotUnit());
    });
  }

  /**
   * Where a step sits in the count, as classes.
   *
   * `beat` identifies every fourth step; alternating groups and `gap` carry the quiet
   * emphasis without drawing a rule through every row. `barstart` separates the bars.
   */
  /**
   * One slot's place in the count, in words.
   *
   * "sixteenth 3" and "thirty-second 5" are kept for the two grids that have always had
   * them, so every existing readout is unchanged. A triplet grid has no comfortable name
   * for one slot — a 48-step bar's slot is a third of a sixteenth — so it counts instead,
   * which is what a musician reading a triplet does anyway.
   */
  const slotLabel = (i) => {
    const per = Math.max(1, slots / 4);
    const beat = Math.floor(i / per) + 1;
    const word = slots === 16 ? 'sixteenth' : slots === 32 ? 'thirty-second' : null;
    return word
      ? `beat ${beat}, ${word} ${i % per + 1}`
      : `beat ${beat}, step ${i % per + 1} of ${per}`;
  };

  /**
   * Where a COLUMN sits in the count, as classes.
   *
   * `fine` is "not on a sixteenth", which is a question about musical position rather
   * than about column index: a bar drawn in twenty-four columns has a sixteenth every
   * third one, so it cannot be asked as `i % (cols / 16)` — that stride is not whole.
   */
  const stepClasses = (b, i) => {
    const beat = cols / 4;
    return (i % beat === 0 ? ' beat' : '')
    + (Math.floor(i / beat) % 2 ? ' group-alt' : '')
    + (i % beat === 0 && i ? ' gap' : '')
    + ((i * 16) % cols ? ' fine' : '')
    + (i === 0 ? ' downbeat' : '')
    + (i === 0 && b !== range.from ? ' barstart' : '');
  };

  function build() {
    if (!isOpen()) return;
    // Nothing to draw before a song is loaded. Reachable: the panel can be opened from
    // the keyboard in the same frame the audio gate is dismissed, and `draftOf` reads
    // `bank.sections` off a bank that is not there yet. It threw once and the next paint
    // was fine, which is the worst kind of error to leave in.
    if (!bank()) return;
    const d = draft();
    if (!d?.plan) return;
    // The grid draws a column per SLOT of whatever grid the song is stored on. The
    // panel may ask for finer than the song currently is — that is the snap picker
    // reaching for a grid the song is about to be promoted onto — so take the finer of
    // the two, by the same LCM rule the engine promotes by.
    const requestedSlots = Number(typeof stepsPerBar === 'function' ? stepsPerBar(d) : stepsPerBar);
    slots = promoteResolution(
      RESOLUTIONS.includes(requestedSlots) ? requestedSlots : LEGACY_RESOLUTION,
      resolutionOf(d));
    // And a column per SNAP division, which is not the same number — see `displayCols`.
    // After `slots`, because the snap is asked in slots of the grid just chosen.
    cols = displayCols(slots, snapSize());
    colStride = slots / cols;
    barViews = new Map();
    plan = d.plan;
    if (wholeSong) {
      range = { from: 0, to: Math.max(0, plan.length - 1) };
    } else {
      const chosen = sel();
      const wanted = autoBar != null
        ? { ...chosen, from: autoBar, to: Math.min(plan.length - 1, autoBar + 1) }
        : chosen;
      range = {
        from: Math.max(0, Math.min(wanted.from, plan.length - 1)),
        to: Math.max(0, Math.min(wanted.to, plan.length - 1)),
      };
    }
    colCells = new Map();
    lit = [];
    el.textContent = '';
    const c = ctx();

    // ---- the header, which is also the handle
    const head = document.createElement('div');
    head.className = 'ssqhead';
    const titleEl = document.createElement('span');
    titleEl.className = 'ssqtitle';
    titleEl.textContent = title(c);

    const shut = document.createElement('button');
    shut.className = 'ssqx popclose';
    shut.textContent = '✕';
    shut.title = 'close';
    shut.onclick = () => open(false);

    // The shared-editing switch, where the panel has one. A panel without it contributes
    // nothing to the header and stays unlinked — see `scopeToggle`.
    const scopeSwitch = () => {
      const link = document.createElement('button');
      link.className = 'ssqlink' + (linked ? ' on' : '');
      // "Selected bars" is the pattern panel's word for it. A roll has no selection — it
      // shows the whole song — so there the choice is between the one bar you click and
      // every bar that plays the same part.
      link.textContent = linked ? 'Edit all repeats'
        : (wholeSong ? 'Edit one bar' : 'Edit selected bars');
      link.setAttribute('aria-pressed', linked ? 'true' : 'false');
      link.title = linked
        ? 'Editing every bar that plays this part — plumber holds section 0 for four bars,'
          + ' and all four change together'
        : 'Editing only the bar you click; the other bars playing the same part are left'
          + ' as they were';
      if (!linked && wholeSong) link.title = 'Editing only the bar you click — the other bars'
        + ' playing the same part are left as they were';
      link.onclick = () => {
        linked = !linked;
        localStorage.setItem(LINK_KEY, linked ? '1' : '0');
        heavyUi(`scope toggle ${ns}`, build);
      };
      return [link];
    };
    const scopeEls = scopeToggle ? scopeSwitch() : [];

    const host = headerHost?.();
    if (host) {
      // Replaced, not appended: `build` runs on every repaint and the host is not ours to
      // empty — it holds the region's own fold and view switch.
      // Named per panel. Both views share one host, so a bare `.ssqhostbar` meant the
      // grid closing took the roll's controls away with it — the close path removed the
      // first one it found, which was not its own.
      host.querySelector(`.ssqhostbar[data-of="${ns}"]`)?.remove();
      // No title and no ✕ out here: the region's header already names the channel, and the
      // way out is the view switch beside it. A panel with nothing to contribute adds no
      // bar at all rather than an empty span holding a gap open in someone else's header.
      const kids = [...lead(c), ...headerExtra(c), ...scopeEls];
      if (kids.length) {
        const bar = document.createElement('span');
        bar.className = 'ssqhostbar';
        bar.dataset.of = ns;
        bar.append(...kids);
        host.append(bar);
      }
    } else {
      head.append(...lead(c), titleEl, ...headerExtra(c), ...scopeEls, shut);
      el.append(head);
    }

    if (linked) {
      const scope = document.createElement('div');
      scope.className = 'ssqscope';
      const mode = document.createElement('strong');
      mode.textContent = 'Shared editing';
      const detail = document.createElement('span');
      detail.textContent = sharedPatternDescription(plan, range.from, range.to);
      scope.append(mode, detail);
      el.append(scope);
    }

    // The docked piano roll has one scrollable surface: the note canvas. Its rulers
    // and pitch keyboard are fixed chrome, synchronized to that surface below. The
    // floating step grid keeps its original single-surface layout.
    const scroll = document.createElement('div');
    scroll.className = 'ssqscroll';
    const ruler = docked ? document.createElement('div') : null;
    if (ruler) {
      ruler.className = 'ssqruler';
      ruler.style.setProperty('--roll-scroll-x', `${scrollAt.left}px`);
    }

    // ---- the ruler: bars on one line, beats on the next
    //
    // Two strips rather than one, because a bar number standing where beat 1 should be
    // reads as a beat: bars 3-4 came out "3 2 3 4 · 4 2 3 4", which is a bar of 3 and a
    // bar of 4 to anyone glancing at it. Beats always count 1-4, which is how you say
    // where a hit is out loud, and the bar is named above them.
    //
    // Both are built out of the same per-step divs as a row and carry the same beat and
    // bar classes, so everything lines up by construction rather than by a width
    // calculation that has to know about every gap and margin below it.
    const strip = (cls, label, text) => {
      const rowEl = document.createElement('div');
      rowEl.className = `ssqrow ${cls}`;
      const pad = document.createElement('div');
      pad.className = 'ssqhead-cell ssqruler-label';
      const labelEl = document.createElement('span');
      labelEl.className = 'ssqruler-label-text';
      labelEl.textContent = label;
      pad.append(labelEl);
      if (cls === 'ssqbars' && !docked) pad.append(...rulerHeader(c));
      const cellsEl = document.createElement('div');
      cellsEl.className = 'ssqcells';
      if (cls === 'ssqbars') { barCellsEl = cellsEl; barCells = []; }
      const picked = selectedBars?.() || null;
      for (let b = range.from; b <= range.to; b++) {
        const inSel = !!picked && b >= picked.from && b <= picked.to;
        for (let i = 0; i < cols; i++) {
          const n = document.createElement('div');
          // The bars picked out, marked on the ruler itself rather than washed over the
          // field. The timeline says a selection the same way — a band across the numbers
          // — and this is the same selection, so it should not be a second language. It
          // also leaves the steps alone, which is what you are actually reading.
          n.className = 'ssqbarnum' + stepClasses(b, i) + (inSel ? ' insel' : '');
          n.dataset.bar = String(b);
          // The STORAGE slot the column begins on, not the column's index — everything
          // that reads a cell's step back out is asking a question about the song.
          n.dataset.step = String(i * colStride);
          const t = text(b, i);
          if (t != null) n.textContent = t;
          cellsEl.append(n);
          if (cls === 'ssqbars') barCells.push(n);
        }
      }
      if (docked) {
        const track = document.createElement('div');
        track.className = 'ssqruler-track';
        track.append(cellsEl);
        rowEl.append(pad, track);
        ruler.append(rowEl);
      } else {
        rowEl.append(pad, cellsEl);
        scroll.append(rowEl);
      }
    };
    // Name the strip once, or name every number — not both. Where the ruler has a corner
    // label (the docked roll's BAR) the numbers are bare, so `12` sits directly over the
    // `1` of its own first beat instead of being pushed four characters to the right of
    // the barline by a word that the corner already said.
    selBand = null;
    timeBand = null;
    locatorClip = null;
    strip('ssqbars', rulerLabel, (b, i) => (i === 0 ? (rulerLabel ? `${b + 1}` : `Bar ${b + 1}`) : null));
    // Four numbers to a bar, whatever it is drawn in. Counted off the columns rather
    // than every fourth cell, which said 1-8 on a 32-slot song and would have said 1-12
    // on a 48: beats are how you say where a hit is out loud, and there are four.
    strip('ssqnums', 'Beat', (b, i) => (i % (cols / 4) === 0 ? `${i / (cols / 4) + 1}` : null));

    // ---- a row per whatever the panel says a row is
    const body = document.createElement('div');
    body.className = 'ssqbody';
    // The playhead, as ONE line down the field rather than a mark on each cell in the
    // column. Drawn per cell it was a stack of segments with a seam at every row
    // boundary, and it had to be added and removed from thirty elements a step; here it
    // is one absolutely-positioned element and `follow` moves it. Which panel actually
    // shows it is a CSS decision — the step grid keeps its ring round the playing
    // square, because there a cell is a switch and the ring is what says "this one".
    playhead = document.createElement('div');
    playhead.className = 'ssqplayhead';
    playhead.hidden = true;
    body.append(playhead);
    const list = rows(c) || [];
    const nextEditScope = wholeSong ? String(list[0]?.lane ?? '') : null;
    if (wholeSong && editScope !== null && nextEditScope !== editScope) editedKey = null;
    editScope = nextEditScope;
    rowIndex = new Map(list.map((r) => [String(r.key), r]));
    rowList = list;
    rebuildRowPositions();
    bodyEl = body;
    fixedBodyEl = null;
    // The cells are gone with the rest of the panel, so this draw is never a no-op
    // however little the window moved.
    rendered = null;
    scroll.append(body);
    if (docked) {
      rulerEl = ruler;
      if (selectedBars || selectedTime) {
        const clip = document.createElement('div');
        clip.className = 'ssqselclip';
        if (selectedBars) {
          selBand = document.createElement('div');
          selBand.className = 'ssqselband';
          clip.append(selBand);
        }
        if (selectedTime) {
          timeBand = document.createElement('div');
          timeBand.className = 'ssqtimeband';
          clip.append(timeBand);
        }
        ruler.append(clip);
      }
      if (locatorPositions) {
        locatorClip = document.createElement('div');
        locatorClip.className = 'ssqlocatorclip';
        ruler.append(locatorClip);
      }
      const surface = document.createElement('div');
      surface.className = 'ssqdock';
      const keys = document.createElement('div');
      keys.className = 'ssqkeys';
      fixedBodyEl = document.createElement('div');
      fixedBodyEl.className = 'ssqkeys-body';
      const zoom = document.createElement('div');
      zoom.className = 'rollzoom-panel';
      zoom.append(...rulerHeader(c));
      keys.append(zoom, fixedBodyEl);
      surface.append(keys, scroll);
      // Rulers and the keyboard are pinned siblings of the only scroll viewport.
      el.append(ruler, surface);
    } else {
      rulerEl = null;
      el.append(scroll);
    }
    // In the page BEFORE the rows are drawn: which rows are in view is a measurement,
    // and a measurement of something that is not in the document yet is zero.
    // Rows first, THEN the scroll position. The other way round the panel is only as
    // tall as its rulers at the moment the scroll is set, the browser clamps it to
    // nothing, and every rebuild quietly walks you back to the top of the keyboard.
    //
    // Scrolling is how you reach the rest of the instrument, so where you are is state
    // worth keeping: `build` runs on every commit, and an edit that moved the field
    // under your hand would make working in the middle of a part impossible.
    renderRows(c);
    // After the rows: the ruler is measured for this, and a ruler in a panel with no
    // layout yet measures nothing.
    placeSelBand();
    placeTimeBand();
    placeLocatorPins();
    scroll.scrollTop = scrollAt.top;
    scroll.scrollLeft = scrollAt.left;
    scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
    syncDockedChrome(scroll);
    // And once more if the clamp moved it — a shorter song, or a panel that has just
    // been resized, can leave the remembered position past the end.
    renderRows(c);
    placeSelBand();
    placeTimeBand();
    placeLocatorPins();
    scroll.addEventListener('scroll', () => {
      noteScroll(scroll);
      syncDockedChrome(scroll);
      // Only the rows, and only when the window has actually moved on: this fires on
      // every frame of a scroll, and rebuilding the header would take the pointer out
      // of whatever it was over.
      if (virtual) renderRows(ctx());
      syncDockedChrome(scroll);
    }, { passive: true });
    watchSize(scroll);
  }

  /**
   * The rows follow the panel's height, not only its scroll.
   *
   * A virtual window is roughly `clientHeight / baseRowHeight()` rows wide, and until now that was
   * measured at build and then only ever again when something scrolled. Everything that
   * makes the panel TALLER without moving the scroll — folding the effects panel,
   * dragging the desk splitter down, an octave button, the browser window growing —
   * left the roll drawing the old number of rows, so the keyboard stopped halfway and
   * the strip below it was bare spacer with the grid overlay showing through. Scrolling
   * a single pixel put it right, which is what the bug looked like from the outside.
   *
   * Free when nothing moved: `renderRows` returns immediately if the window it computes
   * is the one already drawn, so this may fire as often as the layout likes.
   */
  function watchSize(scroll) {
    if (!virtual || typeof ResizeObserver !== 'function') return;
    // One observer for the life of the panel, re-pointed at each rebuild's scroller —
    // `build` replaces that element, and an observer left on the old one is watching
    // something that is no longer in the page.
    // A closed or folded panel measures zero, and zero is not an answer about how many
    // rows to draw — `rowWindow` falls back to a base-height estimate there. Ignoring it leaves
    // the last good window standing until the panel is really on screen again.
    if (!sizeWatch) {
      sizeWatch = new ResizeObserver(([entry]) => {
        if (!(entry?.target?.clientHeight > 0)) return;
        if (resizeDeferred) { resizeDirty = true; return; }
        renderRows(ctx());
      });
    }
    sizeWatch.disconnect();
    sizeWatch.observe(scroll);
  }

  function setResizeDeferred(on) {
    resizeDeferred = !!on;
    if (resizeDeferred || !resizeDirty) return;
    resizeDirty = false;
    requestAnimationFrame(() => {
      if (resizeDeferred) { resizeDirty = true; return; }
      const scroll = el.querySelector('.ssqscroll');
      if (scroll?.clientHeight > 0) renderRows(ctx());
    });
  }

  /**
   * How far the rows start below the top of the scroller's content.
   *
   * Measured through the rects rather than off `offsetTop`, which is relative to the
   * nearest POSITIONED ancestor — the roll's body is `position: relative` inside a
   * positioned panel, so `offsetTop` answered a question about the page and put the
   * visible window seven hundred pixels out.
   */
  function rowsTop(scroll) {
    if (!scroll || !bodyEl) return 0;
    return bodyEl.getBoundingClientRect().top
      - scroll.getBoundingClientRect().top + scroll.scrollTop;
  }

  /**
   * The rows, into the body — everything that scrolling can change, and nothing else.
   *
   * ---- why only some of them ---------------------------------------------------
   *
   * The roll is a WHOLE KEYBOARD: eighty-eight rows, because the note you want next is
   * as often below the part as inside it, and a window derived from what the part
   * already plays is a window with nowhere to put a low C. Eighty-eight rows across a
   * long song is a hundred and twenty thousand cells, which is not a panel, it is a
   * pause.
   *
   * So the rows in view are built and the rest are two spacers. The body keeps its full
   * height — the scrollbar is honest, the grid overlay and the playhead still span the
   * whole field — and the cells exist only where somebody can see them. `rowIndex`
   * still holds every row, so a gesture that reasons about pitch reasons about all of
   * them and not merely the drawn ones.
   */
  function renderRows(c) {
    if (!bodyEl) return;
    const list = rowList;
    const win = rowWindow(list.length);
    const bars = colWindow();
    if (rendered && rendered.from === win.from && rendered.to === win.to
      && rendered.barFrom === bars.from && rendered.barTo === bars.to) return;
    // Not remembered when the bar window was a guess: the panel had no layout to measure,
    // and a guess that agrees with the real window by luck would otherwise keep its
    // guessed spacers — a field a few bars wide over a song of sixty.
    rendered = bars.estimated ? null : { ...win, barFrom: bars.from, barTo: bars.to };
    colCells = new Map();
    lit = [];
    for (const old of [...bodyEl.querySelectorAll('.ssqrow, .ssqpad')]) old.remove();
    fixedBodyEl?.replaceChildren();
    const pad = (h) => {
      if (!(h > 0)) return null;
      const d = document.createElement('div');
      d.className = 'ssqpad';
      d.style.height = `${h}px`;
      return d;
    };
    const appendPad = (height, { field = true } = {}) => {
      if (field) {
        const top = pad(height);
        if (top) bodyEl.append(top);
      }
      if (fixedBodyEl) {
        const side = pad(height);
        if (side) fixedBodyEl.append(side);
      }
    };
    // ---- the keyboard's headroom is the KEYBOARD'S -------------------------------
    // The top key face stands above its own row — a white C is taller than one
    // chromatic step — so `rowPadding.before` opens both bodies with a spacer that
    // height (see pianoLayout). In the KEY COLUMN that is the room the face needs. In
    // the FIELD it is a band with no cells in it, which means no time rules and no bar
    // lines, sitting against the top edge of the panel: the grid appears to stop short
    // of its own top.
    //
    // So the field folds that height into its first row instead of spacing it out. Row
    // bottoms, row heights below it and the body's total height are all unchanged — the
    // top row simply begins where the field begins, and its cells carry their rules up
    // to the edge. The note drawn in it is pushed back down by --roll-rowpad-top so the
    // top pitch is still drawn at its own size, and rowAtOffset already reads that band
    // as row 0, so a click in it lands where it looks like it lands.
    //
    // Only when the window starts at row 0. Any other padTop is undrawn rows above the
    // viewport, which is what a spacer is actually for.
    //
    // The bottom cap is the same argument upside down: the lowest key face hangs below
    // its own row, and left as a spacer it put a ruleless band between the last bar line
    // and the horizontal scrollbar — the field stopping short of its own bottom while
    // the keyboard beside it ran on. So the last row of the field carries it too, and
    // the rules reach the scroller's floor.
    const headroom = win.from === 0 ? win.padTop : 0;
    const footroom = win.to === list.length - 1 ? win.padBottom : 0;
    appendPad(win.padTop, { field: !headroom });
    const rows = list.slice(win.from, win.to + 1);
    let firstRowOfField = true;
    // The row-level mark reads off the bars a mute would ACT on, which on a whole-song
    // panel is the selection rather than bar 1. The per-cell `off` below stays per bar:
    // that one is a fact about the cell it is drawn in.
    const actionFrom = scope().from;
    for (const row of rows) {
      const rowEl = document.createElement('div');
      const muted = mutedIn(actionFrom, row.lane);
      rowEl.className = 'ssqrow ssqlane'
        + (row.unused ? ' unused' : '')
        + (muted ? ' muted' : '')
        + (row.className ? ` ${row.className}` : '');
      const height = rowHeightAt(row);
      const lead = firstRowOfField ? headroom : 0;
      const trail = row === rows[rows.length - 1] ? footroom : 0;
      firstRowOfField = false;
      if (height > 0) rowEl.style.height = `${height + lead + trail}px`;
      if (lead > 0) rowEl.style.setProperty('--roll-rowpad-top', `${lead}px`);
      if (trail > 0) rowEl.style.setProperty('--roll-rowpad-bottom', `${trail}px`);
      // What the row carries beyond its own pitch, so the arbitration in nearestRow can
      // take it back off: a folded cap moves the box's centre, not the pitch's.
      if (lead > 0) rowEl.dataset.lead = String(lead);
      if (trail > 0) rowEl.dataset.trail = String(trail);
      if (row.colour) rowEl.style.setProperty('--lane', row.colour);
      rowEl.dataset.row = row.key;
      if (row.cssVars) {
        for (const [name, value] of Object.entries(row.cssVars)) {
          rowEl.style.setProperty(name, value);
        }
      }

      const headCell = document.createElement('div');
      headCell.className = 'ssqhead-cell';
      headCell.append(...rowHeader(row, c));
      if (row.contextMenu) rowEl.oncontextmenu = (ev) => row.contextMenu(ev, row);
      if (docked) {
        const fixedRow = document.createElement('div');
        fixedRow.className = rowEl.className;
        fixedRow.dataset.row = row.key;
        if (height > 0) fixedRow.style.height = `${height}px`;
        if (row.colour) fixedRow.style.setProperty('--lane', row.colour);
        if (row.cssVars) {
          for (const [name, value] of Object.entries(row.cssVars)) {
            fixedRow.style.setProperty(name, value);
          }
        }
        if (row.contextMenu) fixedRow.oncontextmenu = (ev) => row.contextMenu(ev, row);
        fixedRow.append(headCell);
        fixedBodyEl.append(fixedRow);
      } else {
        rowEl.append(headCell);
      }

      const cells = document.createElement('div');
      cells.className = 'ssqcells';
      // The bars outside the window, as width and nothing else — see `colWindow`.
      const colPad = (w) => {
        if (!(w > 0)) return;
        const d = document.createElement('div');
        d.className = 'ssqcolpad';
        d.style.width = `${w}px`;
        cells.append(d);
      };
      colPad(bars.padLeft);
      // The row is read WHOLE before a single cell is built, because how wide a note
      // is drawn depends on the note after it: a four-step note with another note two
      // steps later is drawn two steps long. The roll must not draw one rectangle
      // through another — they still both sound, and the engine lets them ring
      // together, but a picture of overlapping notes is a picture of nothing.
      //
      // Whole meaning the WINDOW, since that is what is built: a long note in the last
      // bar drawn cannot see the note in the bar after it and is drawn its full length
      // for as long as that bar is the last one. It is the overscan bar, off screen, and
      // the scroll that brings it into view rebuilds it against its neighbour.
      const field = [];
      for (let b = bars.from; b <= bars.to; b++) {
        const pair = readPair(b, row.lane);
        const off = mutedIn(b, row.lane);
        for (let c = 0; c < cols; c++) {
          const i = c * colStride;
          // The slots this column covers but does not BEGIN on. A song stored finer than
          // it is drawn keeps every one of them, so they are gathered here and drawn
          // where they really are — a fraction of the way across the cell — rather than
          // being folded onto a line they are not on. Ordered, so each is clipped
          // against the next.
          const insets = [];
          for (let k = 1; k < colStride; k++) {
            const value = pair.notes[i + k] ?? null;
            if (!isOn(row, value)) continue;
            insets.push({ at: k / colStride, step: i + k, value, len: pair.lengths[i + k] ?? null });
          }
          const value = pair.notes[i] ?? null;
          field.push({ b, c, i, off, value, on: isOn(row, value), len: pair.lengths[i] ?? null, insets });
        }
      }
      /**
       * One note, as a control — whether it stands on a column line or between two.
       *
       * An inset is a `.ssqcell` like any other, carrying its own bar, STORAGE step and
       * row: that is the whole trick, and it is why selection, dragging, resizing, the
       * marquee and the keyboard all reach an off-grid note without knowing one exists.
       * `--at` is how far across its column it is drawn; `from` is the same number, for
       * clipping it against whatever comes next.
       */
      const noteCell = (f, at, step, from, value, len) => {
        const inset = from > 0;
        const on = inset || f.on;
        // A div where a column is a button, because an inset is drawn INSIDE its column
        // and a button inside a button is not a thing a document may contain. It is still
        // a control: same role, same focus, same Enter/Space, and the panel's own keydown
        // handler is what performs the gesture either way.
        const cell = document.createElement(inset ? 'div' : 'button');
        if (inset) { cell.setAttribute('role', 'button'); cell.tabIndex = 0; }
        else cell.type = 'button';
        cell.className = 'ssqcell' + (inset ? ' ssqinset' : stepClasses(f.b, f.c))
          + (on ? ' on' : '')
          + (on && editedKey === noteKey(f.b, step, row.key) ? ' edited' : '')
          + (f.off ? ' muted' : '');
        cell.dataset.bar = f.b;
        cell.dataset.step = step;
        cell.dataset.row = row.key;
        cell.setAttribute('aria-pressed', on ? 'true' : 'false');
        cell.setAttribute('aria-label',
          `${row.label}, bar ${f.b + 1}, ${slotLabel(step)}`);
        if (inset) cell.style.setProperty('--at', String(from));
        if (on) {
          const span = drawnSpan(field, at, cellSpan(row, value, len, f.b, step), from);
          if (Math.abs(span - 1) > 1e-9) cell.style.setProperty('--len', String(span));
          if (resizable(row)) cell.classList.add('sizeable');
          const musicalLength = span * colUnit();
          const lengthText = noteLengthName(musicalLength);
          cell.dataset.tip = row.label;
          cell.dataset.tipsays = `Bar ${f.b + 1}, ${slotLabel(step)} · `
            + `Length ${lengthText}`;
          // At taller pitch zooms a one-step note is wide enough for the name. Short
          // black-key rows stay clean until their measured height can carry readable
          // text; long notes qualify on width as well as height.
          if (noteLabels?.() !== false && Number(row.height) >= 17 && span >= 0.9) {
            const label = document.createElement('span');
            label.className = 'ssqnote-label';
            label.textContent = row.label;
            label.setAttribute('aria-hidden', 'true');
            cell.append(label);
          }
          // A selection is a set of PLACES, so it redraws from the same strings after
          // every rebuild — nothing about it is held in an element.
          if (selection.size && selection.has(noteKey(f.b, step, row.key))) cell.classList.add('sel');
        }
        return cell;
      };
      field.forEach((f, at) => {
        const cell = noteCell(f, at, f.i, 0, f.value, f.len);
        // Inside the column, because a column is the only box on screen that knows where
        // its own left edge is: the field's geometry is measured, not multiplied, and an
        // inset positioned in the flex row would need a pixel we deliberately never
        // compute. `--at` is a fraction of its parent, which needs no measurement at all.
        for (const mark of f.insets) {
          cell.append(noteCell(f, at, mark.step, mark.at, mark.value, mark.len));
        }
        cells.append(cell);
        const col = kof(f.b, f.i);
        if (!colCells.has(col)) colCells.set(col, []);
        colCells.get(col).push(cell);
      });
      colPad(bars.padRight);
      rowEl.append(cells);
      bodyEl.append(rowEl);
    }
    appendPad(win.padBottom, { field: !footroom });
    // Virtual rows are replaced while the user scrolls. Let a host re-project its
    // selection after the new physical row headers have arrived.
    selectionChanged();
  }

  /**
   * Which rows to build, and how much empty space to leave for the ones that are not.
   *
   * Generous margins either side of what is strictly visible: a scroll is continuous
   * and a rebuild is not, so the rows arrive before the edge of the window reaches
   * them. The whole list, always, for a panel that has not asked for this — the step
   * grid is eight drums and a spacer would be machinery for nothing.
   */
  function rowWindow(total) {
    if (!virtual || !(baseRowHeight() > 0) || !total) {
      return { from: 0, to: total - 1, padTop: rowOffset(0), padBottom: rowTotal() - rowOffset(total) };
    }
    const scroll = el.querySelector('.ssqscroll');
    // Where the rows begin inside the scroller: under the two ruler strips, and under
    // the shared-editing banner when there is one. Measured rather than assumed —
    // both of those come and go.
    const top = rowsTop(scroll);
    const height = scroll?.clientHeight || (baseRowHeight() * 20);
    const visibleTop = Math.max(0, scrollAt.top - top);
    const first = Math.max(0, rowAtOffset(visibleTop) - OVERSCAN);
    const last = Math.min(total - 1,
      rowAtOffset(visibleTop + height) + OVERSCAN);
    return {
      from: first,
      to: Math.max(first, last),
      padTop: rowOffset(first),
      padBottom: Math.max(0, rowTotal() - rowOffset(last + 1)),
    };
  }

  /**
   * How wide one step is drawn, measured off the ruler.
   *
   * The ruler is built out of the same per-step divs as a row and is never windowed, so
   * it is always there to ask — and in the roll every step is exactly one width with no
   * gap between them, because `#pianoroll .gap, #pianoroll .barstart` zero the beat and
   * bar margins the step grid uses. That is what makes the field's geometry arithmetic
   * rather than a search through cells that may not be drawn.
   */
  function stepWidth() {
    const cell = (rulerEl || el).querySelector('.ssqbars .ssqbarnum');
    const w = cell ? cell.getBoundingClientRect().width : 0;
    if (w > 0) stepPx = w;
    // The last good answer while the region is folded: a panel with no layout measures
    // zero, and zero is not an answer about how wide a bar is — see `colWindow`.
    return w > 0 ? w : stepPx;
  }

  /**
   * The ruler's own cells — one per step of every bar in the range, always built.
   *
   * The rows are windowed and the ruler is not, which is what makes it the thing to
   * measure the time axis off: the column being heard, or the bar a spacer has to stand
   * in for, has a cell here whether or not the field currently draws one.
   *
   * The container is held from `build` rather than looked up. This is read per bar while
   * a window is worked out and again on every step of playback, and a `querySelectorAll`
   * of a thousand cells inside that loop is the kind of thing that makes a scroll drop
   * frames — `children[n]` off one element is free.
   */
  const rulerCells = () => barCells;

  /**
   * Where a column stands in the field, in body coordinates. Null before there is one.
   *
   * MEASURED, not multiplied. A step grid puts a gap on every beat and a wider one at
   * every bar line, so the columns are not evenly spaced and `step × width` is a
   * different picture from the one on screen — by a whole bar's worth after fifteen of
   * them. The ruler and the field are built out of the same per-step divs carrying the
   * same beat and bar classes, so the ruler's own x IS the field's x, by construction.
   * The arithmetic is kept for the frame before there is a layout to measure.
   */
  function fieldX(b, i) {
    const cells = rulerCells();
    const at = (b - range.from) * cols + colOf(i);
    const cell = cells[at];
    // Against the first cell of the range, not against the offset parent — that is the
    // ruler, whose own x starts a track column and a seam away from where the field's
    // does. Cell zero IS x zero in both, by construction.
    if (cell) return cell.offsetLeft - cells[0].offsetLeft;
    const w = stepWidth();
    if (!(w > 0)) return null;
    return at * w;
  }

  /**
   * The same x, but honest about where INSIDE a column a slot falls.
   *
   * `fieldX` answers in whole columns, which is what a band or a bar edge wants. The
   * playhead and the locator pins want the real position: on a grid drawn coarser than
   * the song is stored on, a third of the way across a cell is a place a note can be,
   * and a cursor that waits at the column line until the next one is a cursor that has
   * stopped telling you where the music is.
   */
  function fieldXFine(b, i) {
    const x = fieldX(b, i);
    if (x == null) return null;
    const k = i - colStart(i);
    return k ? x + (k / colStride) * stepWidth() : x;
  }

  /**
   * The width of the gap a bar line opens in front of a bar, measured once.
   *
   * Every bar but the first in the range carries it, so one cell is the answer for all
   * of them — and the one call to `getComputedStyle` stays out of the per-bar loop.
   */
  function barGap() {
    const cell = rulerCells()[cols];
    return cell ? (parseFloat(getComputedStyle(cell).marginLeft) || 0) : 0;
  }

  /**
   * Which BARS to build cells for — the sideways half of `renderRows`'s window.
   *
   * The roll shows the WHOLE SONG across, and a row of it is sixteen cells a bar: sixty
   * four bars is a thousand cells on every row, and seventy-five rows of that is
   * seventy-seven thousand buttons to build every time anything asks for a repaint. That
   * is a second of blocked main thread, and the sequencer schedules on the main thread —
   * so a zoom, a scroll or a note edit made the song being played stumble. Nothing about
   * it was zoom's fault; zoom at 0.5x is merely where it shows worst, because half-height
   * rows put twice as many of them on screen.
   *
   * So the bars near the viewport are built and the rest are two spacers, exactly as the
   * rows are. The body keeps its full width — the scrollbar is honest and the grid
   * overlay still spans the song — and the playhead is measured off the ruler rather
   * than off a cell, since the column being heard has none once you scroll away from it.
   *
   * The whole range, always, for the panel that has not asked for this: the step grid
   * draws two bars and a window would be machinery for nothing.
   *
   * A panel with no layout — folded, or building for the first time — measures zero, and
   * zero must NOT fall through to "the whole song": that is the sixty-thousand-cell build
   * this exists to prevent, and it is reachable, because the region can be folded shut
   * while the roll is still the view it holds. So it guesses, and says it guessed:
   * `estimated` keeps the drawn window from being remembered as a good one, and the
   * measurement that follows the panel back into the page replaces it.
   */
  function colWindow() {
    const whole = { from: range.from, to: range.to, padLeft: 0, padRight: 0 };
    if (!virtual || !wholeSong) return whole;
    const scroll = el.querySelector('.ssqscroll');
    const measured = scroll?.clientWidth || 0;
    if (measured > 0) fieldPx = measured;
    const cells = rulerCells();
    const bars = range.to - range.from + 1;
    const tail = cells[cells.length - 1];
    // Every x here is against cell zero — see fieldX.
    const origin = cells[0] ? cells[0].offsetLeft : 0;
    const total = tail ? tail.offsetLeft + tail.offsetWidth - origin : 0;
    // Nothing has ever been measured: there is no pixel to size a spacer in, so the
    // whole range is the only answer that keeps the field the width of the song.
    if (cells.length < bars * cols || !(total > 0)) return whole;
    const estimated = !(measured > 0);
    const width = fieldPx > 0 ? fieldPx : total;
    // ---- off the RULER, bar by bar ------------------------------------------------
    //
    // Not a bar width times an index. A step grid opens a gap on every beat and a wider
    // one at every bar line, so its bars are not even all the same width — the first one
    // in the range has no bar line in front of it — and a spacer sized by multiplication
    // walks the field away from the ruler that counts it, a little further with every bar.
    //
    // `edges[b]` is where bar b BEGINS with its own bar-line gap left out, because the
    // first bar the field draws still carries that margin itself: counted in the spacer
    // as well, it would be counted twice and the field would sit a gap to the right of
    // its own numbers.
    const gap = barGap();
    const edgeAt = (b) => {
      const cell = cells[(b - range.from) * cols];
      if (!cell) return null;
      return cell.offsetLeft - origin - (b === range.from ? 0 : gap);
    };
    const edges = [];
    for (let b = range.from; b <= range.to; b++) edges.push(edgeAt(b) ?? 0);
    const edgeOf = (b) => edges[b - range.from];
    // A spacer is a flex item like any cell, so it brings one more column gap with it —
    // the field sat two pixels right of its own ruler at every scroll position but home.
    // Taken off the spacer rather than off the cells, because the cells are the thing
    // being lined up.
    const flexGap = parseFloat(getComputedStyle(barCellsEl).columnGap) || 0;
    const spacer = (px) => Math.max(0, px - flexGap);
    let first = range.to;
    while (first > range.from && edgeOf(first) > scrollAt.left) first--;
    let last = first;
    while (last < range.to && edgeOf(last + 1) < scrollAt.left + width) last++;
    first = Math.max(range.from, first - BAR_OVERSCAN);
    last = Math.min(range.to, Math.max(first, last + BAR_OVERSCAN));
    return {
      from: first,
      to: last,
      padLeft: first > range.from ? spacer(edgeOf(first)) : 0,
      padRight: last >= range.to ? 0 : spacer(total - edgeOf(last + 1)),
      estimated,
    };
  }

  /**
   * Bring a selected bar/range into the roll's view.
   *
   * The piano roll is a whole-song field, so repainting it must not page it to the
   * current selection by itself. Selection is a separate gesture, though, and that
   * gesture should leave the selected time and the notes written in it visible. The
   * method is kept on the shared grid because both axes are its geometry: the ruler
   * owns time, and the row list owns the pitch/track axis.
   *
   * `needRows` reports whether the pitch axis actually found anything to centre on.
   * Time is always answerable — a bar exists whether or not it is played — but a lane
   * that is silent in those bars gives the row axis nothing, and a caller that only
   * wanted "show me this part" needs to know that so it can fall back to the whole
   * lane rather than accept a window still parked over the previous lane's octave.
   */
  function focusRange(from, to, { needRows = false } = {}) {
    if (!wholeSong || !isOpen()) return false;
    const scroll = el.querySelector('.ssqscroll');
    if (!scroll || !plan.length) return false;

    const firstBar = Math.max(range.from, Math.min(range.to, Math.min(from, to)));
    const lastBar = Math.max(firstBar, Math.min(range.to, Math.max(from, to)));

    // Time first. The ruler has one cell per step even when virtual rows are not
    // currently drawn, so a selected bar can always be found without depending on the
    // pitch window that happened to be visible before the selection.
    const rulerRoot = docked ? el : scroll;
    const ruler = [...rulerRoot.querySelectorAll('.ssqbars .ssqbarnum')];
    const firstAt = (firstBar - range.from) * cols;
    const lastAt = (lastBar - range.from + 1) * cols - 1;
    const startCell = ruler[firstAt];
    const endCell = ruler[lastAt] || startCell;
    if (startCell && endCell) {
      const sr = scroll.getBoundingClientRect();
      const left = startCell.getBoundingClientRect().left - sr.left + scroll.scrollLeft;
      const right = endCell.getBoundingClientRect().right - sr.left + scroll.scrollLeft;
      const max = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      scroll.scrollLeft = Math.max(0, Math.min(max,
        centeredRangeOffset(left, right, scroll.clientWidth)));
      syncDockedChrome(scroll);
    }

    // Then pitch/row. Cache each lane's bar once: a piano roll has one row per pitch,
    // so reading the same lane separately for all 88 rows would turn a small focus
    // gesture into 88 identical arrangement reads per bar.
    let firstRow = Infinity;
    let lastRow = -1;
    for (let b = firstBar; b <= lastBar; b++) {
      const valuesByLane = new Map();
      for (let i = 0; i < rowList.length; i++) {
        const row = rowList[i];
        if (!valuesByLane.has(row.lane)) valuesByLane.set(row.lane, readBar(b, row.lane));
        const values = valuesByLane.get(row.lane);
        if (values.some((value) => isOn(row, value))) {
          firstRow = Math.min(firstRow, i);
          lastRow = Math.max(lastRow, i);
        }
      }
    }
    const foundRows = lastRow >= firstRow && baseRowHeight() > 0;
    if (foundRows) {
      // One quiet row of air keeps a selected note from sitting against the edge when
      // the bar's notes fit. A broad pitch span naturally falls through to the middle.
      firstRow = Math.max(0, firstRow - 1);
      lastRow = Math.min(rowList.length - 1, lastRow + 1);
      const top = rowsTop(scroll) + rowOffset(firstRow);
      const bottom = rowsTop(scroll) + rowOffset(lastRow + 1);
      const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      scroll.scrollTop = Math.max(0, Math.min(max,
        centeredRangeOffset(top, bottom, scroll.clientHeight)));
      syncDockedChrome(scroll);
    }

    scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
    syncDockedChrome(scroll);
    if (virtual) renderRows(ctx());
    // The time axis moved either way, so the caller's fallback only has the pitch axis
    // left to answer for.
    return needRows ? foundRows : true;
  }

  // ---- the gesture -----------------------------------------------------------------
  //
  // One listener on the container rather than one per cell: `build()` replaces every
  // cell in the panel, and a listener per cell is a listener per cell per rebuild.

  const cellFrom = (t) => (t && t.closest ? t.closest('.ssqcell') : null);
  const rowOf = (cell) => rowIndex.get(cell?.dataset.row);

  function hit(cell) {
    if (!cell) return;
    let row = rowOf(cell);
    if (!row) return;
    const b = Number(cell.dataset.bar);
    const i = snappedStep(Number(cell.dataset.step));
    cell = cellFor(row.key, b, i) || cell;
    row = rowOf(cell) || row;
    const value = readBar(b, row.lane)[i] ?? null;
    // The length picker describes a NOTE BEING ADDED. A filled cell is either being
    // erased or painted over as part of an existing note, so its stored phrasing must
    // survive. `addLength` is deliberately a callback: the piano roll owns the picker,
    // while the shared grid owns every way a tap can reach a new cell.
    const drawn = paint && !isOn(row, value) ? addLength(row) / colUnit() : null;
    if (!setCell(row, b, i, paint, drawn)) return;
    cell.classList.toggle('on', paint);
    cell.classList.toggle('edited', paint);
    cell.setAttribute('aria-pressed', paint ? 'true' : 'false');
    // `setCell` stages the new note and its chosen length immediately, but this cell is
    // already on screen. Refresh its rectangle in the same gesture so a 1/2 or 1/4 note
    // does not flash as the legacy one-step width until the next rebuild.
    const pair = readPair(b, row.lane);
    showLen(cell, paint ? (cellSpan(row, pair.notes[i] ?? null, pair.lengths[i] ?? null, b, i) || 1) : 1);
    // Only on the way in. A drag that erases twelve steps should not play twelve
    // notes, and hearing the one you just added is the whole point of the preview.
    if (paint) preview(row, readBar(b, row.lane)[i]);
  }

  /**
   * The gesture both the pointer and the keyboard perform, so both get everything.
   *
   * `force` is for the Erase tool: normally the first cell decides whether the drag
   * paints or rubs out — so dragging across a half-filled row fills it rather than
   * inverting it square by square — but a tool called Erase erases, including on the
   * empty cell you happened to start from.
   */
  function begin(cell, force = null) {
    let row = rowOf(cell);
    if (!row) return false;
    const b = Number(cell.dataset.bar);
    const i = snappedStep(Number(cell.dataset.step));
    cell = cellFor(row.key, b, i) || cell;
    row = rowOf(cell) || row;
    paint = force != null ? force : !isOn(row, readBar(b, row.lane)[i] ?? null);
    hit(cell);
    return true;
  }

  // ---- move and resize -------------------------------------------------------------
  //
  // The same drag on the same note, which is why they are one piece of code: a press
  // on a note's BODY moves it, a press on its right EDGE lengthens it, and both are
  // decided on the way down and committed on the way up.
  //
  // Nothing happens until the pointer has travelled. That threshold is the whole reason
  // a click still works: press and release on a note picks it out, and a slightly shaky
  // hand does not silently move somebody's melody one step to the right.
  //
  // Only where the panel says `movable`. In the step grid a press on a filled cell
  // still begins an erase-drag, because a drum hit has no length to grab and dragging
  // a kick to another beat is not a gesture anybody performs on a kit.
  const EDGE_PX = 6;         // how much of a note's right end grabs its length
  const TRAVEL_PX = 4;       // how far a press must move before it is a drag

  /**
   * Is this the secondary (right) button — the eraser?
   *
   * `button` says which one changed, `buttons` which are held — either will do, and
   * asking both means this reads the same on a press as on the moves that follow it.
   *
   * Deliberately NOT ⌃-click. The OS turns that into a right click on a Mac and the
   * `contextmenu` handler below swallows the menu either way, but `button` still
   * arrives as 0 — and pretending otherwise would take ⌃ away from the marquee it
   * has on every other platform.
   */
  const isSecondary = (ev) => ev.button === 2 || ev.buttons === 2;

  let drag = null;

  const cellOf = (cell) => ({
    row: rowOf(cell), b: Number(cell.dataset.bar), i: Number(cell.dataset.step),
  });
  /** Where a cell stands in the whole field, so "two steps later" survives a bar line. */
  const globalStep = (b, i) => b * slots + i;
  /** How many steps wide the note in this cell is drawn — 1 unless something says else. */
  const spanOf = (cell) => Number(cell.style.getPropertyValue('--len')) || 1;
  const cellFor = (rowKey, b, i) => el.querySelector(
    `.ssqcell[data-row="${CSS.escape(String(rowKey))}"][data-bar="${b}"][data-step="${i}"]`);

  /**
   * The cell under a pointer, including an instrument whose visible pitch centres do
   * not sit in the middle of its equal-height layout rows.
   *
   * `elementFromPoint` still supplies TIME: on a long note its pseudo-element resolves
   * to the note's starting cell, which is exactly what selection and resize need. Pitch
   * comes from the nearest visible key centre. Without this second half, moving the blue
   * face left its empty-grid clicks and hover cursors in the old chromatic row.
   */
  const cellAt = (x, y) => {
    const direct = cellFrom(document.elementFromPoint(x, y));
    if (!direct || !bodyEl) return direct;
    // A visible note wins its own pixels. Physical pitch centres can be slightly
    // closer than one note face is tall, so nearest-centre arbitration at the shared
    // edge could otherwise select the neighbour through a note you plainly clicked.
    if (direct.classList.contains('on')) return direct;
    const visible = [...bodyEl.querySelectorAll('.ssqlane[data-row]')];
    if (!visible.length) return direct;
    let nearest = null;
    let distance = Infinity;
    for (const rowEl of visible) {
      const row = rowIndex.get(rowEl.dataset.row);
      if (!row) continue;
      const rect = rowEl.getBoundingClientRect();
      const offset = Number(row.hitOffset);
      // The first and last rows of the field may be carrying the keyboard's caps (see
      // renderRows). Measure the centre of the PITCH inside the box, or the two rows at
      // the ends of the range would pull clicks towards a centre they do not have.
      const lead = Number(rowEl.dataset.lead) || 0;
      const trail = Number(rowEl.dataset.trail) || 0;
      const centre = rect.top + lead + (rect.height - lead - trail) / 2
        + (Number.isFinite(offset) ? offset : 0);
      const away = Math.abs(y - centre);
      if (away < distance) { nearest = row; distance = away; }
    }
    // The same time, on the nearest pitch. An off-grid note has a cell only on the row
    // it is written on, so a row that has nothing there falls back to the column — which
    // is the cell a press at that x would have found if the inset were not drawn over it.
    return nearest
      ? (cellFor(nearest.key, direct.dataset.bar, direct.dataset.step)
        || cellFor(nearest.key, direct.dataset.bar, colStart(Number(direct.dataset.step)))
        || direct)
      : direct;
  };

  const showLen = (cell, span) => {
    if (span > 0 && Math.abs(span - 1) > 1e-9) cell.style.setProperty('--len', String(span));
    else cell.style.removeProperty('--len');
  };
  const showOn = (cell, on) => {
    cell.classList.toggle('on', on);
    cell.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  /** Draw a cell as what it really holds — for a preview that has moved on. */
  const restore = (cell) => {
    const { row, b, i } = cellOf(cell);
    if (!row) return;
    const pair = readPair(b, row.lane);
    const value = pair.notes[i] ?? null;
    showOn(cell, isOn(row, value));
    showLen(cell, cellSpan(row, value, pair.lengths[i] ?? null, b, i) || 1);
  };

  /**
   * Is the pointer on the note's right END — the few pixels that take hold of its
   * length?
   *
   * Measured off the NOTE, not off the cell. A four-step note is one rectangle four
   * cells wide whose right end is three cells past the cell it belongs to, and a press
   * there has to lengthen it — comparing against the cell's own right edge put the grab
   * zone in the middle of the drawing and made an already-long note impossible to
   * resize.
   */
  function atRightEnd(cell, clientX) {
    const r = cell.getBoundingClientRect();
    const right = r.left + r.width * spanOf(cell);
    const edge = Math.min(EDGE_PX, r.width / 3);
    return right - clientX <= edge && clientX <= right;
  }

  /** What this press does, given the tool, the modifiers and where it landed. */
  const gestureAt = (cell, row, ev) => gestureFor({
    // A panel with no gestures to choose between is the step grid, and it has always
    // done exactly one thing: the run.
    tool: movable ? tool() : 'paint',
    alt: ev.altKey,
    meta: selectable && (ev.metaKey || ev.ctrlKey),
    shift: selectable && ev.shiftKey,
    secondary: isSecondary(ev),
    on: isOn(row, readBar(Number(cell.dataset.bar), row.lane)[Number(cell.dataset.step)] ?? null),
    edge: atRightEnd(cell, ev.clientX),
    sizeable: resizable(row),
  });

  // ---- the selection ---------------------------------------------------------------

  const rowAtOf = (key) => rowList.findIndex((r) => String(r.key) === String(key));
  const keyOfCell = (cell) => noteKey(cell.dataset.bar, cell.dataset.step, cell.dataset.row);
  const isSelected = (cell) => selection.has(keyOfCell(cell));

  /** Draw the selection onto the cells that are on screen. */
  function paintSelection() {
    for (const cell of el.querySelectorAll('.ssqcell')) {
      cell.classList.toggle('sel', selection.size > 0 && isSelected(cell));
    }
    selectionChanged();
  }

  function select(keys, { add = false } = {}) {
    if (!keys.length || keys.some((key) => key !== editedKey)) editedKey = null;
    if (!add) selection = new Set();
    for (const k of keys) selection.add(k);
    paintSelection();
  }
  const clearSelection = () => { if (selection.size) select([]); };

  /**
   * What the selection actually holds, read out of the bank.
   *
   * Notes that are no longer there are dropped on the way — a selection is a set of
   * PLACES, and an undo or an edit from the step grid can empty one of them.
   */
  function selected() {
    const out = [];
    for (const key of selection) {
      const cut = key.indexOf(':');
      const cut2 = key.indexOf(':', cut + 1);
      const bar = Number(key.slice(0, cut));
      const step = Number(key.slice(cut + 1, cut2));
      const rowKey = key.slice(cut2 + 1);
      const row = rowIndex.get(rowKey);
      if (!row) continue;
      const pair = readPair(bar, row.lane);
      const value = pair.notes[step] ?? null;
      if (!isOn(row, value)) continue;
      out.push({
        bar, step, row, rowAt: rowAtOf(rowKey), value,
        len: cellSpan(row, value, pair.lengths[step] ?? null, bar, step),
      });
    }
    return out;
  }

  /** Clear the non-destructive notes shown while Paste is waiting for a click. */
  function clearPastePreview() {
    for (const cell of pastePreviewCells) {
      cell.classList.remove('paste-preview');
      cell.style.removeProperty('--paste-len');
    }
    pastePreviewCells = [];
  }

  /** Show the part of an armed paste that is currently inside the virtualized window. */
  function paintPastePreview(anchor) {
    clearPastePreview();
    if (!pastePlacement || !anchor) return;
    const clip = pastePlacement.clip;
    for (const note of clip.notes || []) {
      const sixteenths = Number(note.offset) || 0;
      const cellStep = Math.round((anchor.step + sixteenths / slotUnit()));
      const b = anchor.bar + Math.floor(cellStep / slots);
      const step = cellStep % slots;
      if (b < range.from || b > range.to || step < 0 || step >= slots) continue;
      const row = rowList.find((candidate) => Number(candidate.midi) === Number(note.midi));
      // A ghost, so a clip note landing between two columns shows in the column it lands
      // in rather than not at all — the real write is at the slot, not at the cell.
      const cell = row ? (cellFor(row.key, b, step) || cellFor(row.key, b, colStart(step))) : null;
      if (!cell) continue;
      cell.classList.add('paste-preview');
      const visualLen = Math.max(0.25, (Number(note.length) || 1) / colUnit());
      cell.style.setProperty('--paste-len', String(visualLen));
      pastePreviewCells.push(cell);
    }
  }

  /** The note set the host may serialize for its session clipboard. */
  function copySelection() {
    const notes = selected();
    if (!notes.length) return null;
    const first = Math.min(...notes.map((note) => note.bar * slots + note.step));
    return {
      resolution: 16,
      notes: notes.map((note) => ({
        midi: Number(note.row.midi),
        offset: (note.bar * slots + note.step - first) * slotUnit(),
        length: Math.max(0.25, (Number(note.len) || 1) * colUnit()),
      })),
    };
  }

  /** Stage a complete clip at an absolute sixteenth position and commit once. */
  function pasteNotes(clip, anchorSixteenths) {
    if (!clip?.notes?.length || !Number.isFinite(Number(anchorSixteenths))) {
      return { count: 0, changed: 0, overflow: false };
    }
    const anchor = Number(anchorSixteenths);
    const end = Math.max(...clip.notes.map((note) =>
      (Number(note.offset) || 0) + (Number(note.length) || 1)));
    if (anchor < 0 || anchor + end > plan.length * 16) {
      return { count: clip.notes.length, changed: 0, overflow: true };
    }
    let changed = 0;
    const nextSelection = [];
    for (const note of clip.notes) {
      const midi = Number(note.midi);
      const row = rowList.find((candidate) => Number(candidate.midi) === midi);
      if (!row) continue;
      const at = anchor + (Number(note.offset) || 0);
      const slot = Math.round(at / slotUnit());
      const b = Math.floor(slot / slots);
      const step = slot % slots;
      if (setCell(row, b, step, true, Math.max(0.25, (Number(note.length) || 1) / colUnit()))) {
        changed++;
      }
      nextSelection.push(noteKey(b, step, row.key));
    }
    if (changed) {
      selection = new Set(nextSelection);
      commit();
    }
    return { count: clip.notes.length, changed, overflow: false };
  }

  function armPaste(clip) {
    clearPastePreview();
    pastePlacement = clip?.notes?.length ? { clip } : null;
    if (!pastePlacement) return false;
    el.classList.add('paste-armed');
    selectionChanged();
    return true;
  }

  function cancelPaste() {
    clearPastePreview();
    pastePlacement = null;
    el.classList.remove('paste-armed');
    selectionChanged();
  }

  function selectAllNotes() {
    const notes = allNotes();
    selection = new Set(notes.map((note) => noteKey(note.bar, note.step, note.row.key)));
    paintSelection();
    return notes.length;
  }

  /** Notes whose attacks fall inside an absolute musical-sixteenth range. */
  function notesInTimeRange(start, end) {
    const from = Number(start); const to = Number(end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
    return allNotes().filter((note) => {
      const at = note.bar * 16 + note.step * slotUnit();
      return at >= from && at < to;
    });
  }

  /** Select every note whose attack falls inside an absolute musical-sixteenth range. */
  function selectTimeRange(start, end) {
    const notes = notesInTimeRange(start, end);
    if (!Number.isFinite(Number(start)) || !Number.isFinite(Number(end)) || Number(end) <= Number(start)) {
      clearSelection();
      return 0;
    }
    select(notes.map((note) => noteKey(note.bar, note.step, note.row.key)));
    return notes.length;
  }

  /** Erase a time range as one undoable piano-roll edit. */
  function eraseTimeRange(start, end) {
    const notes = notesInTimeRange(start, end);
    if (!notes.length) return 0;
    const removed = new Set(notes.map((note) => noteKey(note.bar, note.step, note.row.key)));
    for (const note of notes) setCell(note.row, note.bar, note.step, false);
    selection = new Set([...selection].filter((key) => !removed.has(key)));
    commit();
    return notes.length;
  }

  function allNotes() {
    const out = [];
    for (let b = range.from; b <= range.to; b++) {
      for (const row of rowList) {
        const pair = readPair(b, row.lane);
        for (let step = 0; step < slots; step++) {
          const value = pair.notes[step] ?? null;
          if (!isOn(row, value)) continue;
          out.push({
            bar: b,
            step,
            row,
            rowAt: rowAtOf(row.key),
            value,
            len: cellSpan(row, value, pair.lengths[step] ?? null, b, step),
          });
        }
      }
    }
    return out;
  }

  /** Every note the rubber band is currently round. */
  function notesInBand(rect) {
    const keys = [];
    for (const cell of el.querySelectorAll('.ssqcell.on')) {
      const r = cell.getBoundingClientRect();
      const row = rowOf(cell);
      // The note's own width, not the cell's: a four-step note is caught by a band
      // that crosses any part of the rectangle you can see.
      const right = r.left + r.width * spanOf(cell);
      if (right < rect.left || r.left > rect.right) continue;
      if (r.bottom < rect.top || r.top > rect.bottom) continue;
      if (row) keys.push(keyOfCell(cell));
    }
    return keys;
  }

  function beginDrag(mode, cell, ev, drawn = false) {
    const { row, b, i } = cellOf(cell);
    const pair = readPair(b, row.lane);
    drag = {
      mode, row, cell, b, i, drawn,
      // Everything this gesture is about. A press on a note that is part of a selection
      // takes the whole selection with it; a press anywhere else is about one note, and
      // the selection is dropped on the way in — which is what every editor does and
      // the only way to get out of a selection without a second gesture for it.
      set: mode !== 'marquee' && isSelected(cell) ? selected() : [],
      add: !!ev.shiftKey,
      // The length it has NOW, so a resize that ends where it started changes nothing
      // and a move carries the note's own length to wherever it lands.
      len: cellSpan(row, pair.notes[i] ?? null, pair.lengths[i] ?? null, b, i),
      x: ev.clientX, y: ev.clientY, moved: false,
      // `delta` is how far the set has been dragged so far, `shown` the cells the
      // preview has touched and owes a redraw to.
      span: null, delta: null, shown: [],
    };
  }

  /**
   * The rubber band: press on empty space, drag, and every note the rectangle touches
   * is picked out.
   *
   * Drawn as one element in the body, the way the playhead is, and measured off the
   * cells rather than computed from a step width — the same reason: this panel's
   * geometry is CSS's business and a formula here would drift the first time a margin
   * moved.
   */
  function bandTo(e) {
    const rect = {
      left: Math.min(drag.x, e.clientX), right: Math.max(drag.x, e.clientX),
      top: Math.min(drag.y, e.clientY), bottom: Math.max(drag.y, e.clientY),
    };
    if (!marquee && bodyEl) {
      marquee = document.createElement('div');
      marquee.className = 'ssqband';
      bodyEl.append(marquee);
    }
    if (marquee) {
      const origin = bodyEl.getBoundingClientRect();
      marquee.style.left = `${rect.left - origin.left}px`;
      marquee.style.top = `${rect.top - origin.top}px`;
      marquee.style.width = `${rect.right - rect.left}px`;
      marquee.style.height = `${rect.bottom - rect.top}px`;
    }
    select(notesInBand(rect), { add: drag.add });
  }

  function dragTo(e) {
    if (!drag) return;
    if (!drag.moved
      && Math.abs(e.clientX - drag.x) < TRAVEL_PX && Math.abs(e.clientY - drag.y) < TRAVEL_PX) return;
    drag.moved = true;
    if (drag.mode === 'marquee') { bandTo(e); return; }
    if (drag.mode === 'resize') {
      // Measured off the note's own cell: in the roll every cell is exactly one step
      // wide with no gap, which is what makes this arithmetic rather than a search.
      const r = drag.cell.getBoundingClientRect();
      // Length is continuous in step units. Note starts remain on the bank's existing
      // sixteenth grid, but the right edge may land between two starts. Stop at a 64th
      // note rather than zero, without bringing the sixteenth floor back.
      const want = Math.max(MIN_NOTE_LENGTH, Number(((e.clientX - r.left) / r.width).toFixed(6)));
      if (want === drag.span) return;
      drag.span = want;
      // The whole set stretches, and it has to LOOK like the whole set stretching —
      // for the same reason the move preview draws every note where it is going.
      // Watching one note grow while the others waited for the release said the
      // resize was not reaching them, and there is no reason to trust a release over
      // your own eyes.
      const set = dragSet(drag);
      const lens = stretched(set.map((nt) => nt.len), want - (drag.len ?? 1), MIN_NOTE_LENGTH);
      set.forEach((nt, i) => {
        const cell = cellFor(rowList[nt.rowAt]?.key, nt.bar, nt.step);
        if (cell) showLen(cell, lens[i]);
      });
      return;
    }
    // Horizontal distance is arithmetic: a long note's pseudo-element reports its
    // starting cell everywhere along the rectangle. Vertical distance is not — a piano
    // roll can place pitches on physical key centres — so resolve that half through the
    // same hit map as clicks and hover.
    const r = drag.cell.getBoundingClientRect();
    const set = dragSet(drag);
    const bounds = { bars: plan.length, rows: rowList.length, stepsPerBar: slots };
    const targetCell = cellAt(e.clientX, e.clientY);
    const targetRow = targetCell && rowOf(targetCell);
    const dRow = targetRow
      ? rowAtOf(targetRow.key) - rowAtOf(drag.row.key)
      : Math.round((e.clientY - drag.y) / r.height);
    // Pixels give COLUMNS — a cell is one — and the bounds below count STORAGE slots.
    const rawStep = Math.round((e.clientX - drag.x) / r.width) * colStride;
    const want = clampDelta(set,
      Math.round(rawStep / snapSize()) * snapSize(),
      dRow, bounds);
    if (drag.delta && drag.delta.dStep === want.dStep && drag.delta.dRow === want.dRow) return;
    drag.delta = want;
    // ---- the whole set moves, and it has to LOOK like the whole set moving ----------
    //
    // Every note picked out is drawn where it is going, not just the one under the
    // pointer. Showing one note move while the other eleven sat still was a preview
    // that said the wrong thing about what release would do, and "it only moves the one
    // I clicked" is exactly what it looked like.
    //
    // Sources are emptied before destinations are filled, or a phrase moved one step
    // right would rub out its own next note on the way past.
    for (const cell of drag.shown || []) restore(cell);
    drag.shown = [];
    const mark = (cell, on, span) => {
      if (!cell) return;
      showOn(cell, on);
      showLen(cell, on ? span : 1);
      drag.shown.push(cell);
    };
    for (const nt of set) mark(cellFor(rowList[nt.rowAt]?.key, nt.bar, nt.step), false);
    for (const nt of set) {
      const at = movedNote(nt, want.dStep, want.dRow, bounds);
      mark(cellFor(rowList[at.rowAt]?.key, at.bar, at.step), true, nt.len ?? 1);
    }
  }

  /** Stage the gesture and hand it over — or, if nothing moved, do what a click does. */
  function endDrag(cancelled = false) {
    const d = drag;
    drag = null;
    if (!d) return;
    if (!d.moved) {
      // Nothing was previewed, because nothing moved — so there is nothing to put back.
      // This was a click, and what a click means depends on what it landed on.
      //
      // On a note, in a panel that has a selection: it PICKS THAT NOTE OUT. It used to
      // erase it, and the cost of that was the gesture you abandon — press a note, think
      // better of it, release without travelling the four pixels, and the note was gone.
      // There was also no way to merely point at a note without destroying it, which
      // left the whole selection system (⌫, the arrows, ⌥← ⌥→) reachable only by
      // holding a modifier. Erasing is the right button's job now.
      //
      // Everywhere else it is the toggle it always was: the step grid has no selection
      // to put a note into, so a tap on a hat still takes it out.
      //
      // Two presses have already done their work by the time they get here and must not
      // be undone by it — one that DREW a note (a tap on an empty cell leaves a one-step
      // note, as it always did) and one that arrived inside a selection (clicking a note
      // you have picked out keeps the set; ⌫ is how a selection goes).
      if (cancelled) { endBand(); return; }
      if (!d.drawn && !d.set.length) {
        if (selectable && (d.mode === 'move' || d.mode === 'resize')) select([keyOfCell(d.cell)]);
        else begin(d.cell);
      }
      paint = null;
      commit();
      return;
    }
    // A cancelled drag leaves a preview on screen that never happened.
    if (cancelled) { build(); return; }
    if (d.mode === 'marquee') { endBand(); return; }
    if (d.mode === 'resize') resizeNotes(dragSet(d), d.span - (d.len ?? 1));
    else if (d.delta) moveNotes(dragSet(d), d.delta.dStep, d.delta.dRow);
    commit();
  }

  /** What a drag is about: the selection it started inside, or the one note it holds. */
  const dragSet = (d) => (d.set.length ? d.set : [{
    row: d.row, bar: d.b, step: d.i, rowAt: rowAtOf(d.row.key), len: d.len,
  }]);

  /**
   * Make a set of notes longer or shorter BY THE SAME AMOUNT.
   *
   * By the same amount, not to the same length, and that is the whole point: a quarter
   * note and two sixteenths dragged out by a beat should still be a quarter note and
   * two sixteenths, a beat longer each. Setting them all to what the note under the
   * pointer became flattens the rhythm of the phrase into one value — which is the
   * thing you would then have to undo by hand, note by note.
   *
   * A freehand note cannot go below a 64th note, so a set pulled shorter than its
   * shortest member allows keeps that member at the 0.25-step floor while the rest
   * come in. The alternative — refusing the whole drag because one note has run out
   * of room — is worse.
   */
  function resizeNotes(notes, by) {
    if (!by) return;
    const lens = stretched(notes.map((nt) => nt.len), by, MIN_NOTE_LENGTH);
    notes.forEach((nt, i) => setCell(nt.row, nt.bar, nt.step, true, lens[i]));
  }

  function adjustLengths(scopeKind, percent) {
    const value = Number(percent);
    if (!(value > 0) || Math.abs(value - 100) < 1e-9) return { count: 0, changed: 0 };
    const notes = scopeKind === 'all' ? allNotes() : selected();
    let changed = 0;
    for (const nt of notes) {
      const next = Math.max(MIN_NOTE_LENGTH,
        Number((((nt.len || 1) * value) / 100).toFixed(6)));
      if (setCell(nt.row, nt.bar, nt.step, true, next)) changed++;
    }
    if (changed) commit();
    return { count: notes.length, changed };
  }

  function quantiseLengths(scopeKind, grid = 1) {
    const step = Number(grid);
    if (!(step > 0)) return { count: 0, changed: 0 };
    const notes = scopeKind === 'all' ? allNotes() : selected();
    let changed = 0;
    for (const nt of notes) {
      const next = quantiseLength(nt.len, step / colUnit());
      // If the effective length is already on the requested grid, leave an absent
      // Len entry absent. This keeps quantising an already-quantised legacy part a
      // no-op while still materialising a value when it actually overrides a voice
      // default such as 1.8 steps.
      if (next == null || Math.abs(next - nt.len) < 1e-9) continue;
      if (setCell(nt.row, nt.bar, nt.step, true, next)) changed++;
    }
    if (changed) commit();
    return { count: notes.length, changed };
  }

  function transformNotes(scopeKind, kind, value = null) {
    const notes = scopeKind === 'all' ? allNotes() : selected();
    if (!notes.length) return { count: 0, changed: 0 };
    let changed = 0;
    if (kind === 'legato') {
      const events = [...new Set(allNotes().map((n) => globalStep(n.bar, n.step)))].sort((a, b) => a - b);
      for (const nt of notes) {
        const at = globalStep(nt.bar, nt.step);
        const next = events.find((event) => event > at);
        // The gap between two notes is a distance in STORAGE slots; a length is in drawn
        // columns.
        if (next != null && setCell(nt.row, nt.bar, nt.step, true, (next - at) / colStride)) changed++;
      }
    } else if (kind === 'staccato' || kind === 'gate' || kind === 'scale') {
      const percent = kind === 'staccato' ? 50 : Number(value);
      if (percent > 0) for (const nt of notes) {
        const next = Math.max(1, Number(((nt.len || 1) * percent / 100).toFixed(6)));
        if (setCell(nt.row, nt.bar, nt.step, true, next)) changed++;
      }
    } else if (kind === 'fixed') {
      const visual = Number(value) / colUnit();
      if (visual > 0) for (const nt of notes) {
        if (setCell(nt.row, nt.bar, nt.step, true, visual)) changed++;
      }
    } else if (kind === 'chop') {
      const requested = Math.max(2, Math.min(16, Math.round(Number(value) || 2)));
      for (const nt of notes) {
        const span = Math.max(1, nt.len || 1);
        const count = Math.min(requested, Math.max(1, Math.floor(span)));
        if (count < 2) continue;
        const piece = span / count;
        if (setCell(nt.row, nt.bar, nt.step, true, piece)) changed++;
        const start = globalStep(nt.bar, nt.step);
        for (let i = 1; i < count; i++) {
          // `piece` is a width in columns; where the next piece STARTS is in slots.
          const g = Math.round(start + piece * colStride * i);
          if (g >= plan.length * slots) break;
          const b = Math.floor(g / slots); const step = g % slots;
          if (setCell(nt.row, b, step, true, piece)) changed++;
        }
      }
    } else if (kind === 'quantise') {
      // Note STARTS onto the current snap. `quantiseLengths` is the other half of this
      // and moves nothing — a note can be exactly a sixteenth long and still begin
      // between two of them.
      //
      // Cleared before any are written, and that ordering is the whole of it: two notes
      // can snap onto each other's old slots, and writing as we go would have the second
      // move land on a cell the first had not vacated yet — one note eaten per collision,
      // silently. A note that snaps onto a slot another note KEEPS still merges, which is
      // what quantising means.
      const size = snapSize();
      const moves = [];
      for (const nt of notes) {
        const at = globalStep(nt.bar, nt.step);
        const to = Math.max(0, Math.min(plan.length * slots - 1,
          Math.round(at / size) * size));
        if (to !== at) moves.push({ nt, to });
      }
      for (const { nt } of moves) setCell(nt.row, nt.bar, nt.step, false);
      for (const { nt, to } of moves) {
        const b = Math.floor(to / slots);
        const step = to % slots;
        if (b < plan.length && setCell(nt.row, b, step, true, nt.len)) changed++;
      }
    } else if (kind === 'reverse' || kind === 'invert') {
      const ordered = [...notes].sort((a, b) => globalStep(a.bar, a.step) - globalStep(b.bar, b.step)
        || a.row.midi - b.row.midi);
      const targets = [];
      if (kind === 'reverse') {
        const pitches = ordered.map((n) => n.row.midi).reverse();
        ordered.forEach((nt, i) => targets.push({ nt, midi: pitches[i] }));
      } else {
        const groups = new Map();
        for (const nt of ordered) {
          const key = `${nt.bar}:${nt.step}:${nt.row.lane}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(nt);
        }
        const axis = ordered[0].row.midi;
        for (const group of groups.values()) {
          group.sort((a, b) => a.row.midi - b.row.midi);
          if (group.length > 1) group.forEach((nt, i) => targets.push({
            nt, midi: i === 0 ? nt.row.midi + 12 : nt.row.midi,
          }));
          else targets.push({ nt: group[0], midi: axis * 2 - group[0].row.midi });
        }
      }
      for (const nt of ordered) setCell(nt.row, nt.bar, nt.step, false);
      const nextSelection = [];
      for (const { nt, midi } of targets) {
        const row = rowList.find((candidate) => candidate.midi === midi);
        if (!row) continue;
        if (setCell(row, nt.bar, nt.step, true, nt.len)) changed++;
        nextSelection.push(noteKey(nt.bar, nt.step, row.key));
      }
      if (selection.size) selection = new Set(nextSelection);
    }
    if (changed) commit();
    return { count: notes.length, changed };
  }

  /** Let the band go: what it is round is what is now picked out. */
  function endBand() {
    marquee?.remove();
    marquee = null;
  }

  /**
   * Move a set of notes by the same amount, as one edit.
   *
   * Every source is cleared BEFORE any destination is written, or a phrase moved one
   * step to the right would rub out its own second note on the way past. The lengths
   * travel with the notes; the selection is rebuilt onto where they landed, because a
   * set you have just moved is the set you still have hold of.
   */
  function moveNotes(notes, dStep, dRow) {
    const bounds = { bars: plan.length, rows: rowList.length, stepsPerBar: slots };
    const d = clampDelta(notes, dStep, dRow, bounds);
    if (!d.dStep && !d.dRow) return;
    const landing = notes.map((nt) => ({ nt, at: movedNote(nt, d.dStep, d.dRow, bounds) }));
    for (const { nt } of landing) setCell(nt.row, nt.bar, nt.step, false);
    const next = [];
    for (const { nt, at } of landing) {
      const row = rowList[at.rowAt];
      if (!row) continue;
      setCell(row, at.bar, at.step, true, nt.len);
      next.push(noteKey(at.bar, at.step, row.key));
    }
    if (selection.size) selection = new Set(next);
    // One note, one sound: dragging a chord about should not machine-gun every note in
    // it, and the first is enough to say where the set has landed.
    const first = landing[0];
    if (first) {
      const row = rowList[first.at.rowAt];
      if (row) preview(row, readBar(first.at.bar, row.lane)[first.at.step]);
    }
  }

  /** Rub out everything picked out, as one edit. */
  function deleteSelection() {
    const notes = selected();
    if (!notes.length) return;
    for (const nt of notes) setCell(nt.row, nt.bar, nt.step, false);
    selection = new Set();
    commit();
  }

  el.addEventListener('pointerdown', (ev) => {
    // Left draws, right erases, and the wheel button is nobody's gesture — a press it
    // does not understand should leave the field exactly as it found it rather than
    // pick a meaning at random.
    if (ev.button !== 0 && ev.button !== 2) return;
    let cell = cellAt(ev.clientX, ev.clientY);
    if (!cell) return;
    // Paste owns the next left click. The row is intentionally ignored: copied
    // pitches remain absolute, and the clicked column is the only insertion decision.
    if (pastePlacement && ev.button === 0) {
      ev.preventDefault();
      const anchor = (Number(cell.dataset.bar) * slots + Number(cell.dataset.step)) * slotUnit();
      const result = pasteNotes(pastePlacement.clip, anchor);
      if (result.overflow) {
        toast?.('Paste would run past the end of the song — choose an earlier bar');
      } else {
        cancelPaste();
      }
      return;
    }
    // A different editing gesture takes ownership and only cancels placement; the
    // session clipboard itself remains available for the next Paste command.
    if (pastePlacement) cancelPaste();
    // A missed pointerup (window switch, browser cancellation, or a prior gesture
    // ending outside the panel) must not leave a Tone preview in its sustain stage.
    previewRelease();
    ev.preventDefault();
    let row = rowOf(cell);
    if (!row) return;
    const snapped = snappedStep(Number(cell.dataset.step));
    cell = cellFor(row.key, Number(cell.dataset.bar), snapped) || cell;
    row = rowOf(cell) || row;
    // What this press means is one lookup — see `gestureFor`, which is the whole table.
    const g = gestureAt(cell, row, ev);
    // A press that is not about the selection drops it, so there is always a way out:
    // click anywhere. ⇧ and ⌘ are the two that build on what is already picked out.
    const cellKey = keyOfCell(cell);
    if (selectable && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey
      && !isSelected(cell) && cellKey !== editedKey) {
      clearSelection();
    }
    if (g === 'marquee') {
      beginDrag('marquee', cell, ev);
    } else if (g === 'select') {
      // ⇧ adds one or takes one out; a plain press in Select mode is "just this one",
      // and dragging from it moves whatever is now picked out.
      if (cellKey !== editedKey) editedKey = null;
      if (ev.shiftKey) {
        const key = keyOfCell(cell);
        if (selection.has(key)) selection.delete(key);
        else selection.add(key);
        paintSelection();
      } else if (!isSelected(cell)) {
        select([keyOfCell(cell)]);
      }
      beginDrag('move', cell, ev);
      drag.set = selected();
    } else if (g === 'move' || g === 'resize') {
      beginDrag(g, cell, ev);
    } else if (g === 'draw') {
      // The note goes down at once, and the rest of the drag is its length. `paint` is
      // cleared so the pointer does not also lay a trail of separate notes under the
      // one being drawn. A lane with no length to give — vox, shout — just gets the
      // note; there is nothing for a drag to write.
      if (!begin(cell)) return;
      if (resizable(row)) { beginDrag('resize', cell, ev, true); paint = null; }
    } else if (!begin(cell, g === 'erase' ? false : null)) {
      return;
    }
    const move = (e) => {
      if (drag) dragTo(e);
      else if (paint != null) hit(cellAt(e.clientX, e.clientY));
    };
    const stop = (e) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', stop);
      removeEventListener('pointercancel', stop);
      if (drag) {
        try { endDrag(e?.type === 'pointercancel'); }
        finally { previewRelease(); }
        return;
      }
      paint = null;
      previewRelease();
      commit();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
  });

  // The right button is the eraser, so over the field it cannot also be the browser's
  // menu — "Reload" and "Save Image As" sitting on top of the note you just rubbed out
  // is the menu winning an argument it should not be in.
  //
  // Only over the CELLS. The row headers have menus of their own (`row.contextMenu`),
  // the header and the ruler have none and should keep the browser's, and a blanket
  // handler on the panel would take the first away and the second with it.
  el.addEventListener('contextmenu', (ev) => {
    if (cellAt(ev.clientX, ev.clientY)) ev.preventDefault();
  });

  // The cursor says which of the two a press would begin, so the edge is discoverable
  // rather than something you find by accident. Only written when it changes: this runs
  // on every pointer move over the panel.
  //
  // Which makes it the one handler on the desk that does work with no button held, so
  // what it costs on a move it costs continuously — and it shares a main thread with the
  // sequencer, whose whole safety margin is a 250ms lookahead. Three things keep it off
  // that thread's back, in the order they can be decided:
  //
  //  - The tool and the modifiers, which need no measurement at all. `gestureFor` can
  //    only reach `resize` from `auto` with nothing held, so every other mode answers
  //    "no handle" before the pointer position is even looked at. That is most of the
  //    time the panel is open and being drawn in.
  //  - `atEdge`, remembered rather than queried. Only ever one cell carries the class,
  //    so finding it again with `querySelectorAll` meant walking every cell in the grid
  //    — thousands of them on a whole-song piano roll — to arrive at a node we had just
  //    put the class on ourselves.
  //  - `cellAt`, last, because it is the expensive one: `elementFromPoint` forces a
  //    layout flush and the pitch arbitration measures every visible lane.
  //
  // The early-out below used to be `near === cell?.classList.contains('atedge')`, which
  // is the same test with one hole in it: over a gap between cells there is no cell, and
  // `false === undefined` is false, so the pointer being over NOTHING took the slow path
  // every time. The gaps are not a rare place to be — a beat opens 7px in front of it
  // and a bar line 15px, all of it outside every cell's box (see `barUnder`).
  let atEdge = null;
  const clearEdge = () => {
    atEdge?.classList.remove('atedge');
    atEdge = null;
  };
  el.addEventListener('pointermove', (ev) => {
    if (pastePlacement && !drag) {
      const target = cellAt(ev.clientX, ev.clientY);
      if (target) paintPastePreview({
        bar: Number(target.dataset.bar),
        step: Number(target.dataset.step),
      });
    }
    if (!movable || drag) return;
    // Decided without measuring anything: no mode but `auto` offers the handle, and any
    // modifier means the press is already spoken for.
    if (tool() !== 'auto' || ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey
        || isSecondary(ev)) { clearEdge(); return; }
    const cell = cellAt(ev.clientX, ev.clientY);
    const row = cell && rowOf(cell);
    const near = !!row && cell.classList.contains('sizeable')
      && gestureAt(cell, row, ev) === 'resize';
    if (near ? cell === atEdge : !atEdge) return;
    clearEdge();
    if (near) { cell.classList.add('atedge'); atEdge = cell; }
  });
  // Or the pointer leaves entirely, which fires no move: a resize cursor left standing on
  // a panel nobody is pointing at is an offer that is not being made.
  el.addEventListener('pointerleave', () => {
    if (drag) return;
    if (pastePlacement) clearPastePreview();
    clearEdge();
  });

  // What a selection is FOR, at the keyboard: ⌫ takes it out, ⎋ lets it go. Bound on
  // the document because a rubber band leaves the focus wherever it was — but only ever
  // acting when this panel is open and holding something, and never while somebody is
  // typing into a field.
  addEventListener('keydown', (ev) => {
    if (!isOpen()) return;
    if (ev.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (pastePlacement && ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      cancelPaste();
      return;
    }
    if (!selectable || !selection.size) return;
    // Stopped outright, like the arrows below: Escape is the desk's panic, and letting go
    // of a selection is not an emergency. Only ever reached with notes actually picked
    // out — with none, this listener has already returned and the panic is what ⎋ means.
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      clearSelection();
      return;
    }
    if (ev.key === 'Backspace' || ev.key === 'Delete') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      deleteSelection();
      return;
    }
    const dir = ARROWS[ev.key];
    if (!dir) return;
    // The desk moves the playhead with ← → and changes channel with ↑ ↓, and both
    // listen on this same window — so this has to stop the others outright rather than
    // merely bubbling politely. The precedence reads well as a sentence: while notes
    // are picked out, the arrows are theirs.
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const notes = selected();
    if (!notes.length) return;
    // Horizontal ⇧ is the short, easy-to-reach length gesture. The longer ⇧⌥ form
    // moves the phrase by a whole bar; ⌥ alone remains a compatible length gesture.
    const horizontal = dir.step !== 0;
    const moveBar = horizontal && ev.shiftKey && ev.altKey;
    if (moveBar) moveNotes(notes, dir.step * slots, 0);
    else if (horizontal && (ev.shiftKey || ev.altKey)) resizeNotes(notes, dir.step * snapCols());
    else moveNotes(notes, dir.step * snapSize(), dir.row * (ev.shiftKey ? 12 : 1));
    commit();
  });

  // A step is a real button, not a mouse-only painted square. Enter/Space performs
  // the same one-cell gesture as a pointer click and therefore gets the same preview,
  // validation, undo and arrangement write path.
  el.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const cell = cellFrom(ev.target);
    if (!cell) return;
    ev.preventDefault();
    if (!begin(cell)) return;
    paint = null;
    commit();
  });
  el.addEventListener('keyup', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') previewRelease();
  });
  addEventListener('blur', previewRelease);

  // ---- the window --------------------------------------------------------------------

  function place(x, y) {
    if (docked) return;          // it is in the page now; the page decides where it is
    const r = el.getBoundingClientRect();
    const left = Math.max(4, Math.min(x, Math.max(4, innerWidth - r.width - 4)));
    const top = Math.max(4, Math.min(y, Math.max(4, innerHeight - r.height - 4)));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    localStorage.setItem(POS_KEY, JSON.stringify({ x: left, y: top }));
  }

  // Delegated from the container, not the header: `build()` replaces the header.
  el.addEventListener('pointerdown', (ev) => {
    if (docked) return;
    const head = ev.target.closest?.('.ssqhead');
    if (!head || ev.target.closest('button, input, select')) return;
    ev.preventDefault();
    const r = el.getBoundingClientRect();
    const dx = ev.clientX - r.left;
    const dy = ev.clientY - r.top;
    const move = (e) => place(e.clientX - dx, e.clientY - dy);
    const stop = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', stop);
      el.classList.remove('dragging');
    };
    el.classList.add('dragging');
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop, { once: true });
  });

  function open(on = true) {
    el.classList.toggle('show', on);
    if (!on) {
      previewRelease();
      pending.clear();
      cancelPaste();
      // Nothing to watch while it is shut, and the next `build` points it at the
      // scroller it makes.
      sizeWatch?.disconnect();
      headerHost?.()?.querySelector(`.ssqhostbar[data-of="${ns}"]`)?.remove();
      onClose();
      return;
    }
    autoBar = null;
    heavyUi(`open ${ns}`, build);
    if (docked) return;
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { pos = null; }
    const r = el.getBoundingClientRect();
    place(pos?.x ?? Math.max(4, (innerWidth - r.width) / 2), pos?.y ?? 90);
  }

  /** Capture the pitch and fractional position at a viewport anchor. */
  function captureRowAnchor(at = 0.5) {
    const scroll = el.querySelector('.ssqscroll');
    if (!scroll || !rowList.length || !(baseRowHeight() > 0)) return null;
    const y = scroll.scrollTop - rowsTop(scroll) + scroll.clientHeight * at;
    const index = rowAtOffset(y);
    const row = rowList[index];
    if (!row) return null;
    const height = rowHeightAt(row);
    const fraction = height > 0
      ? Math.max(0, Math.min(1, (y - rowOffset(index)) / height)) : 0.5;
    return { key: String(row.key), fraction, at };
  }

  /** Restore a previously captured pitch anchor after row geometry changes. */
  function restoreRowAnchor(anchor) {
    if (!anchor) return;
    const index = rowList.findIndex((row) => String(row.key) === String(anchor.key));
    const scroll = el.querySelector('.ssqscroll');
    if (index < 0 || !scroll) return;
    const row = rowList[index];
    const height = rowHeightAt(row);
    const fraction = Math.max(0, Math.min(1, Number(anchor.fraction) || 0));
    const at = Math.max(0, Math.min(1, Number(anchor.at) || 0.5));
    const target = rowOffset(index) + height * fraction;
    const want = rowsTop(scroll) + target - scroll.clientHeight * at;
    const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    scroll.scrollTop = Math.max(0, Math.min(max, want));
    scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
    syncDockedChrome(scroll);
    if (virtual) renderRows(ctx());
  }

  return {
    open,
    close: () => open(false),
    isOpen,
    /**
     * The viewport is desk-session state, not song data. Raw pixels are safe here
     * because the snapshot also names the song and lane they came from; clamping on
     * restore handles a resized window or a shorter edited arrangement.
     */
    viewState: () => ({
      top: scrollAt.top, left: scrollAt.left, followX, followEnabled,
      selection: [...selection], editedKey,
    }),
    restoreViewState(state) {
      if (!state || typeof state !== 'object') return;
      scrollAt = {
        top: Math.max(0, Number(state.top) || 0),
        left: Math.max(0, Number(state.left) || 0),
      };
      followEnabled = state.followEnabled !== false;
      followX = followEnabled && state.followX !== false;
      if (Array.isArray(state.selection)) selection = new Set(state.selection.map(String));
      editedKey = typeof state.editedKey === 'string' ? state.editedKey : null;
      autoLeftAt = null;
      const scroll = el.querySelector('.ssqscroll');
      if (!scroll) return; // the next build reads scrollAt
      const maxTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      const maxLeft = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      scroll.scrollTop = Math.min(maxTop, scrollAt.top);
      scroll.scrollLeft = Math.min(maxLeft, scrollAt.left);
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      syncDockedChrome(scroll);
      placeSelBand();
      placeTimeBand();
      placeLocatorPins();
      if (virtual) renderRows(ctx());
    },
    /** Repaint: the selection moved, or the song changed under us. */
    refresh: () => { autoBar = null; if (isOpen()) heavyUi(`refresh ${ns}`, build); },
    /** Repaint without clearing the auto-page — for a control inside the panel. */
    redraw: () => heavyUi(`redraw ${ns}`, build),
    /** Reflow CSS-sized columns without rebuilding the whole song. */
    reflow() {
      const scroll = el.querySelector('.ssqscroll');
      if (!scroll) return;
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      syncDockedChrome(scroll);
      placeSelBand();
      placeTimeBand();
      placeLocatorPins();
      if (virtual) renderRows(ctx());
    },
    setResizeDeferred,
    selectedCount: () => selected().length,
    selectAll: selectAllNotes,
    selectTimeRange,
    eraseTimeRange,
    countTimeRange: (start, end) => notesInTimeRange(start, end).length,
    clearSelection,
    copySelection,
    deleteSelection,
    armPaste,
    cancelPaste,
    pasteArmed: () => !!pastePlacement,
    adjustLengths: ({ scope: scopeKind = 'selection', percent } = {}) =>
      adjustLengths(scopeKind === 'all' ? 'all' : 'selection', percent),
    quantiseLengths: ({ scope: scopeKind = 'selection', grid = 1 } = {}) =>
      quantiseLengths(scopeKind === 'all' ? 'all' : 'selection', grid),
    transformNotes: ({ scope: scopeKind = 'selection', kind, value = null } = {}) =>
      transformNotes(scopeKind === 'all' ? 'all' : 'selection', kind, value),
    captureRowAnchor,
    restoreRowAnchor,
    /**
     * Put a row where it can be seen, and hold it there.
     *
     * `at` is where in the window it should land: 0 the top, 1 the bottom, 0.5 the
     * middle. The roll centres the part it opens on, which is the right answer once the
     * rows are a whole instrument — the note you want next is as often below what you
     * have written as above it, and a part pinned to the top of the window puts one of
     * those two out of reach until you go looking for it.
     */
    scrollToRow(key, at = 0.5) {
      const i = rowList.findIndex((r) => String(r.key) === String(key));
      const scroll = el.querySelector('.ssqscroll');
      if (i < 0 || !scroll || !(baseRowHeight() > 0)) return;
      const want = rowsTop(scroll) + rowOffset(i) - scroll.clientHeight * at
        + rowHeightAt(rowList[i]);
      scroll.scrollTop = Math.max(0, want);
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      syncDockedChrome(scroll);
      if (virtual) renderRows(ctx());
    },
    /**
     * Let the transport have the time axis back.
     *
     * Scrolling the roll sideways while it plays turns the follow off — see `follow` —
     * and moving the transport on purpose is the other way of saying "show me there",
     * so the desk calls this on a seek.
     */
    setFollow(enabled) {
      followEnabled = enabled !== false;
      followX = followEnabled;
      autoLeftAt = null;
      return followEnabled;
    },
    followEnabled: () => followEnabled,
    armFollow() { if (followEnabled) followX = true; autoLeftAt = null; },
    /** Focus a whole-song bar/range without changing the selection or its contents. */
    focusRange,
    /** Move the window by whole rows — an octave at a time, in the roll's case. */
    scrollRows(n) {
      const scroll = el.querySelector('.ssqscroll');
      if (!scroll || !(baseRowHeight() > 0)) return;
      scroll.scrollTop = Math.max(0, scroll.scrollTop + n * baseRowHeight());
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      syncDockedChrome(scroll);
      if (virtual) renderRows(ctx());
    },
    /** A hard context boundary: no pending gesture or old-song DOM crosses it. */
    songChanged() {
      previewRelease();
      pending.clear();
      paint = null;
      drag = null;
      cancelPaste();
      selection = new Set();
      endBand();
      scrollAt = { top: 0, left: 0 };
      followEnabled = true;
      followX = true;
      autoLeftAt = null;
      rendered = null;
      plan = [];
      barViews = new Map();
      range = { from: 0, to: 0 };
      colCells = new Map();
      lit = [];
      autoBar = null;
      editedKey = null;
      editScope = null;
      if (isOpen()) build();
    },
    /**
     * Stand the cursor on the step being heard.
     *
     * Absent rather than wrong when the song is playing outside the bars on screen —
     * a cursor parked on a column the sequencer left is worse than no cursor, because
     * it is still answering the question.
     */
    follow(step) {
      if (!isOpen()) return;
      for (const c of lit) c.classList.remove('playing');
      lit = [];
      const at = playheadCell(step, slots);
      // Stopping re-arms the follow: wherever you scrolled to while it played, the next
      // transport starts by owning the view again.
      if (!at) { followX = followEnabled; autoLeftAt = null; return; }
      if (wholeSong) {
        // The whole song is in the field, so there is nothing to re-page — the view
        // follows by SCROLLING, which is what a roll does. Only when the column has
        // actually left the visible strip: scrolling on every step would drag the field
        // out from under a hand that had scrolled somewhere else on purpose.
        //
        // The ring goes on the cells of that column where there are any, but the LINE is
        // placed off the ruler's geometry — the field only builds the bars near the
        // viewport, so the column being heard has no cell of its own the moment you
        // scroll away from it, and the transport is exactly when you want to be able to.
        // The ring is a mark on a CELL, so it lands on the column the slot falls in; the
        // line is free to stand between two columns and does — see `fieldXFine`.
        lit = colCells.get(kof(at.bar, colStart(at.step))) || [];
        for (const c of lit) c.classList.add('playing');
        const x = fieldXFine(at.bar, at.step);
        if (playhead && x != null) {
          playhead.hidden = false;
          playhead.style.left = `${x}px`;
          playhead.style.width = `${stepWidth()}px`;
        }
        const scroll = el.querySelector('.ssqscroll');
        if (scroll && x != null) {
          const pad = scroll.clientWidth * 0.25;
          const off = x < scroll.scrollLeft + pad
            || x > scroll.scrollLeft + scroll.clientWidth - pad;
          // In the comfortable middle of the strip the roll is following whether it
          // moved or not, so this is also where a hand that scrolled away and then came
          // back hands the time axis over again.
          if (!off) followX = true;
          else if (followEnabled && followX) {
            scroll.scrollLeft = Math.max(0, x - pad);
            // The position as it landed, not as it was asked for: a scroller near the
            // end of the song clamps, and the difference would read as a hand.
            autoLeftAt = scroll.scrollLeft;
            syncDockedChrome(scroll);
          }
        }
        return;
      }
      const window = playheadWindow(step, plan.length);
      if (!window) return;
      if (autoBar !== window.from || range.from !== window.from || range.to !== window.to) {
        // Playback owns the live view: load the two-bar page being heard even if the
        // window opened on an arrangement selection. While stopped, refresh() still
        // shows that chosen range. Never replace the DOM under a gesture in progress —
        // a move holds the cell it started on, and a rebuild would take it away.
        if (paint != null || drag) return;
        autoBar = window.from;
        build();
      }
      lit = colCells.get(kof(at.bar, colStart(at.step))) || [];
      for (const c of lit) c.classList.add('playing');
      // And move the line. Measured off the cell rather than computed from a step width,
      // because the beat and bar gaps are margins — a formula here would have to know
      // about every one of them and would drift the moment one changed.
      if (playhead) {
        const first = lit[0];
        if (!first) { playhead.hidden = true; return; }
        playhead.hidden = false;
        playhead.style.left = `${first.offsetLeft}px`;
        playhead.style.width = `${first.offsetWidth}px`;
      }
    },
    // ---- for the panels on top of this one
    /** What the panel's callbacks are handed, for menus built outside `build()`. */
    context: ctx,
    /** The sixteen raw values a bar plays on one lane, pending edits included. */
    readBar,
    /** Is this lane silenced in this bar by the arrangement? */
    mutedIn,
    /** Stage whole lanes across the bars in scope and commit once — figures, grooves. */
    layDown,
    toggleMute,
    barSpan,
    /** And the bars an action reaches, for a menu that has to name them — see `scope`. */
    actionSpan,
    setRulerLabel(label) { rulerLabel = label; },
    /** The grid the song is STORED on, and the one it is DRAWN in — see `displayCols`. */
    slotsPerBar: () => slots,
    colsPerBar: () => cols,
    get linked() { return linked; },
    get range() { return range; },
    get action() { return scope(); },
    get plan() { return plan; },
  };
}
