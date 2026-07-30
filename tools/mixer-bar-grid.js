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
import { resolveSection } from '../src/data/arrangements.js';
import { lenKey } from '../src/engine/lanes.js';
import { writeBarNotes, writeBarNotesShared, setLanesOff } from './lib/arrangement-edit.js';

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
export function playheadCell(step) {
  if (!Number.isFinite(step) || step < 0) return null;
  const whole = Math.floor(step);
  return { bar: Math.floor(whole / 16), step: whole % 16 };
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

/**
 * The arrows, as a step and a row.
 *
 * Rows run highest-first, so UP is a row less — the one place in this file where the
 * screen's direction and the array's direction disagree, and the reason it is a table
 * rather than a sign flip somewhere in a handler.
 *
 * With ⇧ the step becomes a bar and the row an octave: the same gesture at the scale
 * you actually work in when a phrase is in the wrong place rather than slightly out.
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
  on = false, edge = false, sizeable = false,
} = {}) {
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
export function movedNote({ bar, step, rowAt }, dStep, dRow, { bars, rows }) {
  const g = Math.max(0, Math.min(bars * 16 - 1, bar * 16 + step + dStep));
  return { bar: Math.floor(g / 16), step: g % 16, rowAt: Math.max(0, Math.min(rows - 1, rowAt + dRow)) };
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
 * One step is the floor. Pull a whole note back to a quarter and the sixteenths beside
 * it cannot follow that far, so they stop at a step and stay there — the same
 * compromise every editor makes at the bottom of the range, and better than refusing
 * the drag because one note in the set has run out of room.
 */
export function stretched(lens, by) {
  return lens.map((len) => Math.max(1, (len ?? 1) + by));
}

export function clampDelta(notes, dStep, dRow, { bars, rows }) {
  if (!notes.length) return { dStep: 0, dRow: 0 };
  const gs = notes.map((n) => n.bar * 16 + n.step);
  const rs = notes.map((n) => n.rowAt);
  const lowG = Math.min(...gs);
  const highG = Math.max(...gs);
  const lowR = Math.min(...rs);
  const highR = Math.max(...rs);
  return {
    dStep: Math.max(-lowG, Math.min(bars * 16 - 1 - highG, dStep)),
    dRow: Math.max(-lowR, Math.min(rows - 1 - highR, dRow)),
  };
}

export function drawnSpan(field, at, len) {
  if (!(len > 1)) return 1;
  let span = Math.min(Math.floor(len), field.length - at);
  for (let k = 1; k < span; k++) {
    if (field[at + k].on) { span = k; break; }
  }
  return Math.max(1, span);
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
 * @param title       (ctx) => the window's title line
 * @param headerExtra (ctx) => [HTMLElement] — buttons between the title and the ✕
 * @param rowHeader   (row, ctx) => [HTMLElement] — the sticky left cell's contents
 * @param lead        (ctx) => [HTMLElement] — anything before the title (the grid's `+`)
 */
export function createBarGrid({
  el, Audio, bank, editBank, draft, sel, apply, engineBank, onClose = () => {},
  ns = 'grid', rows, isOn, withCell, preview = () => {},
  // ---- lengths, and the gestures that need them
  //
  // A panel that says nothing about length gets the behaviour it had before lengths
  // existed: `withLen` never changes one, `cellLen` never widens a note, `movable` is
  // off and a press on a filled cell begins an erase-drag as it always did. That is
  // the step grid, exactly — a drum hit has no length and dragging one to another
  // beat is not a gesture anybody performs on a kit.
  withLen = () => null, cellLen = () => null, resizable = () => false, movable = false,
  // A panel whose rows are an INSTRUMENT rather than a track list: it shows all of
  // them and only draws the ones in view. `rowHeight` is the pixel height of one row,
  // which the panel owns (it is in the CSS) and the spacers need in numbers.
  virtual = false, rowHeight = 0,
  // Which gesture a press performs — see `gestureFor`. `auto` reads where you pressed;
  // the named tools each do one thing, for when holding a modifier or aiming at a
  // note's edge is not something you want to have to do.
  tool = () => 'auto',
  // Whether notes can be picked out in sets: ⌘-drag a rectangle round them, ⇧-click to
  // add one, then move, stretch or delete the lot as one edit.
  selectable = false,
  // A pattern panel is scoped to the bars you selected and pages two at a time as the
  // song plays. A piano roll is not: it shows the whole part and scrolls, because a
  // melody is a shape across bars and a two-bar window cannot show you one. `docked`
  // goes with it — a panel that shows everything wants the width of the page, and it
  // gives up the floating frame, the remembered position and the drag to get it.
  wholeSong = false, docked = false,
  // Where the panel's own controls go. Given a host, they are placed INTO it rather than
  // into a header of their own — so a docked panel adds its controls to the row the region
  // already has instead of stacking a second row under it. Two headers naming the same
  // channel is a row of chrome for nothing.
  headerHost = null,
  title, headerExtra = () => [], rowHeader = () => [], lead = () => [],
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
  let linked = localStorage.getItem(LINK_KEY) === '1';

  // Edits made but not yet handed to the desk, keyed by the bar and the LANE they
  // land on — which is the unit `writeBarNotes` takes, and the reason a roll drawing
  // thirty pitch rows still commits one array per bar like the grid does.
  const pending = new Map();
  const kof = (b, lane) => `${b}:${lane}`;

  let plan = [];
  let range = { from: 0, to: 0 };
  let cols = new Map();     // `${bar}:${step}` -> the cells in that column
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
  let bodyEl = null;
  let rendered = null;
  let scrollAt = { top: 0, left: 0 };
  // The notes picked out, as places — see `noteKey`. Survives a rebuild because it
  // holds strings rather than elements, and survives a move because whatever moves the
  // notes rebuilds the keys alongside them.
  let selection = new Set();
  let marquee = null;       // the rubber band, while one is being drawn

  const isOpen = () => el.classList.contains('show');
  const barSpan = () => (range.from === range.to
    ? `bar ${range.from + 1}` : `bars ${range.from + 1}-${range.to + 1}`);

  /** What the panel hands its callbacks: everything they could reasonably ask. */
  const ctx = () => ({ plan, range, linked, barSpan: barSpan(), bank: bank() });

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
    if (!bar) return new Array(16).fill(null);
    const view = bank();
    const resolved = (bar.sec != null ? resolveSection(view, bar.sec) : null) || {};
    const arr = resolved[key] ?? view[key];
    if (!Array.isArray(arr)) return new Array(16).fill(null);
    const at = bar.half * 16;
    return Array.from({ length: 16 }, (_, i) => arr[at + i] ?? null);
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
   * `drawn` is a length in steps — what a resize is FOR. Absent (a paint, an erase,
   * a keyboard press) the panel decides what happens to the length that was there,
   * which for the roll means: a new note inherits nothing and an erased one takes its
   * length with it. Nothing here knows which; `withLen` does.
   */
  function setCell(row, b, step, on, drawn = null) {
    const key = kof(b, row.lane);
    const cur = readPair(b, row.lane);
    const value = cur.notes[step] ?? null;
    const len = cur.lengths[step] ?? null;
    const nextValue = withCell(row, value, on);
    const nextLen = withLen(row, value, len, on, drawn);
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
   * Stage sixteen steps on a lane across every bar on screen, then commit once.
   *
   * The selection is the scope, as it is everywhere else here: one bar selected puts
   * the figure in that bar, four puts it in four.
   */
  function layDown(byLane) {
    // A figure is new notes, so the lengths that were there belonged to notes that are
    // not. Sixteen nulls rather than "say nothing": laying a groove over a part
    // somebody had drawn long notes into must not play the new one at the old lengths.
    const cleared = Array.from({ length: 16 }, () => null);
    for (const [lane, steps] of Object.entries(byLane)) {
      for (let b = range.from; b <= range.to; b++) {
        pending.set(kof(b, lane), { notes: steps.slice(), lengths: cleared.slice() });
      }
    }
    commit();
  }

  /** Mute the lane across the shown bars, or let it back in — the channel mute. */
  function toggleMute(lane) {
    const off = !mutedIn(range.from, lane);
    apply(setLanesOff(draft(), range.from, range.to, [lane], off),
      `${laneLabel(lane)} ${off ? 'out of' : 'back in'} ${barSpan()}`);
    build();
  }

  // ---- drawing ---------------------------------------------------------------------

  /**
   * Where a step sits in the count, as classes.
   *
   * `beat` identifies every fourth step; alternating groups and `gap` carry the quiet
   * emphasis without drawing a rule through every row. `barstart` separates the bars.
   */
  const stepClasses = (b, i) => (i % 4 === 0 ? ' beat' : '')
    + (Math.floor(i / 4) % 2 ? ' group-alt' : '')
    + (i % 4 === 0 && i ? ' gap' : '')
    + (i === 0 && b !== range.from ? ' barstart' : '');

  function build() {
    if (!isOpen()) return;
    // Nothing to draw before a song is loaded. Reachable: the panel can be opened from
    // the keyboard in the same frame the audio gate is dismissed, and `draftOf` reads
    // `bank.sections` off a bank that is not there yet. It threw once and the next paint
    // was fine, which is the worst kind of error to leave in.
    if (!bank()) return;
    const d = draft();
    if (!d?.plan) return;
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
    cols = new Map();
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
      build();
    };

    const host = headerHost?.();
    if (host) {
      // Replaced, not appended: `build` runs on every repaint and the host is not ours to
      // empty — it holds the region's own fold and view switch.
      // Named per panel. Both views share one host, so a bare `.ssqhostbar` meant the
      // grid closing took the roll's controls away with it — the close path removed the
      // first one it found, which was not its own.
      host.querySelector(`.ssqhostbar[data-of="${ns}"]`)?.remove();
      const bar = document.createElement('span');
      bar.className = 'ssqhostbar';
      bar.dataset.of = ns;
      // No title and no ✕ out here: the region's header already names the channel, and the
      // way out is the view switch beside it.
      bar.append(...lead(c), ...headerExtra(c), link);
      host.append(bar);
    } else {
      head.append(...lead(c), titleEl, ...headerExtra(c), link, shut);
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

    // Rulers and lanes live in ONE scroll surface. Keeping the rulers outside the
    // body's horizontal scroller made a wide selection lie: the steps moved while
    // their bar and beat numbers stayed behind. The row headers are sticky inside
    // this surface, which is the channel-rack behaviour — names stay put while the
    // pattern moves under them.
    const scroll = document.createElement('div');
    scroll.className = 'ssqscroll';

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
      pad.textContent = label;
      const cellsEl = document.createElement('div');
      cellsEl.className = 'ssqcells';
      for (let b = range.from; b <= range.to; b++) {
        for (let i = 0; i < 16; i++) {
          const n = document.createElement('div');
          n.className = 'ssqbarnum' + stepClasses(b, i);
          const t = text(b, i);
          if (t != null) n.textContent = t;
          cellsEl.append(n);
        }
      }
      rowEl.append(pad, cellsEl);
      scroll.append(rowEl);
    };
    strip('ssqbars', rulerLabel, (b, i) => (i === 0 ? `Bar ${b + 1}` : null));
    strip('ssqnums', 'Beat', (b, i) => (i % 4 === 0 ? `${i / 4 + 1}` : null));

    // ---- a row per whatever the panel says a row is
    const body = document.createElement('div');
    body.className = 'ssqbody';
    // The playhead, as ONE line down the field rather than a mark on each cell in the
    // column. Drawn per cell it was a stack of segments with a seam at every row
    // boundary, and it had to be added and removed from thirty elements a step; here it
    // is one absolutely-positioned element and `follow` moves it. Which panel actually
    // shows it is a CSS decision — the step grid keeps its ring round the playing
    // square, because there a cell is a switch and the ring is what says "this one".
    // The grid, as ONE element. It was three gradients on every row — twenty-five
    // paints of the same three lines — and before that an inset shadow on every cell,
    // which is six thousand of them across sixteen bars. One overlay draws the whole
    // field once, and the lines are continuous by construction rather than by every row
    // happening to agree.
    const rules = document.createElement('div');
    rules.className = 'ssqrules';
    body.append(rules);
    playhead = document.createElement('div');
    playhead.className = 'ssqplayhead';
    playhead.hidden = true;
    body.append(playhead);
    const list = rows(c) || [];
    rowIndex = new Map(list.map((r) => [String(r.key), r]));
    rowList = list;
    bodyEl = body;
    // The cells are gone with the rest of the panel, so this draw is never a no-op
    // however little the window moved.
    rendered = null;
    scroll.append(body);
    // In the page BEFORE the rows are drawn: which rows are in view is a measurement,
    // and a measurement of something that is not in the document yet is zero.
    el.append(scroll);
    // Rows first, THEN the scroll position. The other way round the panel is only as
    // tall as its rulers at the moment the scroll is set, the browser clamps it to
    // nothing, and every rebuild quietly walks you back to the top of the keyboard.
    //
    // Scrolling is how you reach the rest of the instrument, so where you are is state
    // worth keeping: `build` runs on every commit, and an edit that moved the field
    // under your hand would make working in the middle of a part impossible.
    renderRows(c);
    scroll.scrollTop = scrollAt.top;
    scroll.scrollLeft = scrollAt.left;
    scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
    // And once more if the clamp moved it — a shorter song, or a panel that has just
    // been resized, can leave the remembered position past the end.
    renderRows(c);
    scroll.addEventListener('scroll', () => {
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      // Only the rows, and only when the window has actually moved on: this fires on
      // every frame of a scroll, and rebuilding the header would take the pointer out
      // of whatever it was over.
      if (virtual) renderRows(ctx());
    }, { passive: true });
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
    if (rendered && rendered.from === win.from && rendered.to === win.to) return;
    rendered = win;
    cols = new Map();
    lit = [];
    for (const old of [...bodyEl.querySelectorAll('.ssqrow, .ssqpad')]) old.remove();
    const pad = (h) => {
      if (!(h > 0)) return null;
      const d = document.createElement('div');
      d.className = 'ssqpad';
      d.style.height = `${h}px`;
      return d;
    };
    const top = pad(win.padTop);
    if (top) bodyEl.append(top);
    for (const row of list.slice(win.from, win.to + 1)) {
      const rowEl = document.createElement('div');
      const muted = mutedIn(range.from, row.lane);
      rowEl.className = 'ssqrow ssqlane'
        + (row.unused ? ' unused' : '')
        + (muted ? ' muted' : '')
        + (row.className ? ` ${row.className}` : '');
      if (row.colour) rowEl.style.setProperty('--lane', row.colour);
      rowEl.dataset.row = row.key;

      const headCell = document.createElement('div');
      headCell.className = 'ssqhead-cell';
      headCell.append(...rowHeader(row, c));
      if (row.contextMenu) rowEl.oncontextmenu = (ev) => row.contextMenu(ev, row);

      const cells = document.createElement('div');
      cells.className = 'ssqcells';
      // The row is read WHOLE before a single cell is built, because how wide a note
      // is drawn depends on the note after it: a four-step note with another note two
      // steps later is drawn two steps long. The roll must not draw one rectangle
      // through another — they still both sound, and the engine lets them ring
      // together, but a picture of overlapping notes is a picture of nothing.
      const field = [];
      for (let b = range.from; b <= range.to; b++) {
        const pair = readPair(b, row.lane);
        const off = mutedIn(b, row.lane);
        for (let i = 0; i < 16; i++) {
          const value = pair.notes[i] ?? null;
          field.push({ b, i, off, value, len: pair.lengths[i] ?? null, on: isOn(row, value) });
        }
      }
      field.forEach((f, at) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'ssqcell' + stepClasses(f.b, f.i)
          + (f.on ? ' on' : '')
          + (f.off ? ' muted' : '');
        cell.dataset.bar = f.b;
        cell.dataset.step = f.i;
        cell.dataset.row = row.key;
        cell.setAttribute('aria-pressed', f.on ? 'true' : 'false');
        cell.setAttribute('aria-label',
          `${row.label}, bar ${f.b + 1}, beat ${Math.floor(f.i / 4) + 1}, sixteenth ${f.i % 4 + 1}`);
        if (f.on) {
          const span = drawnSpan(field, at, cellLen(row, f.value, f.len));
          if (span > 1) cell.style.setProperty('--len', String(span));
          if (resizable(row)) cell.classList.add('sizeable');
          // A selection is a set of PLACES, so it redraws from the same strings after
          // every rebuild — nothing about it is held in an element.
          if (selection.size && selection.has(noteKey(f.b, f.i, row.key))) cell.classList.add('sel');
        }
        cells.append(cell);
        const col = kof(f.b, f.i);
        if (!cols.has(col)) cols.set(col, []);
        cols.get(col).push(cell);
      });
      rowEl.append(headCell, cells);
      bodyEl.append(rowEl);
    }
    const bottom = pad(win.padBottom);
    if (bottom) bodyEl.append(bottom);
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
    if (!virtual || !(rowHeight > 0)) {
      return { from: 0, to: total - 1, padTop: 0, padBottom: 0 };
    }
    const scroll = el.querySelector('.ssqscroll');
    // Where the rows begin inside the scroller: under the two ruler strips, and under
    // the shared-editing banner when there is one. Measured rather than assumed —
    // both of those come and go.
    const top = rowsTop(scroll);
    const height = scroll?.clientHeight || (rowHeight * 20);
    const first = Math.max(0, Math.floor((scrollAt.top - top) / rowHeight) - OVERSCAN);
    const last = Math.min(total - 1, first + Math.ceil(height / rowHeight) + OVERSCAN * 2);
    return {
      from: first,
      to: Math.max(first, last),
      padTop: first * rowHeight,
      padBottom: Math.max(0, (total - 1 - last) * rowHeight),
    };
  }

  // ---- the gesture -----------------------------------------------------------------
  //
  // One listener on the container rather than one per cell: `build()` replaces every
  // cell in the panel, and a listener per cell is a listener per cell per rebuild.

  const cellFrom = (t) => (t && t.closest ? t.closest('.ssqcell') : null);
  const rowOf = (cell) => rowIndex.get(cell?.dataset.row);

  function hit(cell) {
    if (!cell) return;
    const row = rowOf(cell);
    if (!row) return;
    const b = Number(cell.dataset.bar);
    const i = Number(cell.dataset.step);
    if (!setCell(row, b, i, paint)) return;
    cell.classList.toggle('on', paint);
    cell.setAttribute('aria-pressed', paint ? 'true' : 'false');
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
    const row = rowOf(cell);
    if (!row) return false;
    const b = Number(cell.dataset.bar);
    const i = Number(cell.dataset.step);
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
  // Nothing happens until the pointer has travelled. That threshold is the whole
  // reason a click still works: press and release on a note erases it, exactly as it
  // did before any of this existed, and a slightly shaky hand does not silently move
  // somebody's melody one step to the right.
  //
  // Only where the panel says `movable`. In the step grid a press on a filled cell
  // still begins an erase-drag, because a drum hit has no length to grab and dragging
  // a kick to another beat is not a gesture anybody performs on a kit.
  const EDGE_PX = 6;         // how much of a note's right end grabs its length
  const TRAVEL_PX = 4;       // how far a press must move before it is a drag

  let drag = null;

  const cellAt = (x, y) => cellFrom(document.elementFromPoint(x, y));
  const cellOf = (cell) => ({
    row: rowOf(cell), b: Number(cell.dataset.bar), i: Number(cell.dataset.step),
  });
  /** Where a cell stands in the whole field, so "two steps later" survives a bar line. */
  const globalStep = (b, i) => b * 16 + i;
  /** How many steps wide the note in this cell is drawn — 1 unless something says else. */
  const spanOf = (cell) => Number(cell.style.getPropertyValue('--len')) || 1;
  const cellFor = (rowKey, b, i) => el.querySelector(
    `.ssqcell[data-row="${CSS.escape(String(rowKey))}"][data-bar="${b}"][data-step="${i}"]`);

  const showLen = (cell, span) => {
    if (span > 1) cell.style.setProperty('--len', String(span));
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
    showLen(cell, cellLen(row, value, pair.lengths[i] ?? null) || 1);
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
  }

  function select(keys, { add = false } = {}) {
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
        len: cellLen(row, value, pair.lengths[step] ?? null),
      });
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
      len: cellLen(row, pair.notes[i] ?? null, pair.lengths[i] ?? null),
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
      const want = Math.max(1, Math.ceil((e.clientX - r.left) / r.width));
      if (want === drag.span) return;
      drag.span = want;
      // The whole set stretches, and it has to LOOK like the whole set stretching —
      // for the same reason the move preview draws every note where it is going.
      // Watching one note grow while the others waited for the release said the
      // resize was not reaching them, and there is no reason to trust a release over
      // your own eyes.
      const set = dragSet(drag);
      const lens = stretched(set.map((nt) => nt.len), want - (drag.len ?? 1));
      set.forEach((nt, i) => {
        const cell = cellFor(rowList[nt.rowAt]?.key, nt.bar, nt.step);
        if (cell) showLen(cell, lens[i]);
      });
      return;
    }
    // How far the set is going, from the GEOMETRY rather than from what is under the
    // pointer. `elementFromPoint` cannot answer this any more: a note is one rectangle
    // several cells wide and a pseudo-element is hit-tested as part of the element it
    // belongs to, so every point along a long note reports the cell the note starts on
    // — which is how the first version of this looked like a move that did nothing.
    // Steps are one width apart and rows one height apart, so the answer is arithmetic.
    const r = drag.cell.getBoundingClientRect();
    const set = dragSet(drag);
    const bounds = { bars: plan.length, rows: rowList.length };
    const want = clampDelta(set,
      Math.round((e.clientX - drag.x) / r.width),
      Math.round((e.clientY - drag.y) / r.height), bounds);
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
      // This was a click, and a click is what it always was: `begin` reads the note that
      // is there and erases it. Two presses have already done their work by the time
      // they get here and must not be undone by it — one that DREW a note (a tap on an
      // empty cell leaves a one-step note, as it always did) and one that PICKED notes
      // out (clicking a note you have selected keeps it; ⌫ is how a selection goes).
      if (cancelled) { endBand(); return; }
      if (!d.drawn && !d.set.length) begin(d.cell);
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
   * A note cannot go under one step, so a set pulled shorter than its shortest member
   * allows keeps that member at one step while the rest come in. It is the same
   * compromise every editor makes at the bottom of the range, and the alternative —
   * refusing the whole drag because one note has run out of room — is worse.
   */
  function resizeNotes(notes, by) {
    if (!by) return;
    const lens = stretched(notes.map((nt) => nt.len), by);
    notes.forEach((nt, i) => setCell(nt.row, nt.bar, nt.step, true, lens[i]));
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
    const bounds = { bars: plan.length, rows: rowList.length };
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
    const cell = cellFrom(ev.target);
    if (!cell) return;
    ev.preventDefault();
    const row = rowOf(cell);
    if (!row) return;
    // What this press means is one lookup — see `gestureFor`, which is the whole table.
    const g = gestureAt(cell, row, ev);
    // A press that is not about the selection drops it, so there is always a way out:
    // click anywhere. ⇧ and ⌘ are the two that build on what is already picked out.
    if (selectable && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey && !isSelected(cell)) {
      clearSelection();
    }
    if (g === 'marquee') {
      beginDrag('marquee', cell, ev);
    } else if (g === 'select') {
      // ⇧ adds one or takes one out; a plain press in Select mode is "just this one",
      // and dragging from it moves whatever is now picked out.
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
      if (drag) { endDrag(e?.type === 'pointercancel'); return; }
      paint = null;
      commit();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
  });

  // The cursor says which of the two a press would begin, so the edge is discoverable
  // rather than something you find by accident. Only written when it changes: this runs
  // on every pointer move over the panel.
  el.addEventListener('pointermove', (ev) => {
    if (!movable || drag) return;
    const cell = cellFrom(ev.target);
    const row = cell && rowOf(cell);
    // The handle is only offered where pressing would actually take it — so it goes
    // quiet in Paint, Draw and Erase, where the answer does not depend on aim.
    const near = !!row && cell.classList.contains('sizeable')
      && tool() === 'auto' && gestureAt(cell, row, ev) === 'resize';
    if (near === cell?.classList.contains('atedge')) return;
    for (const c of el.querySelectorAll('.ssqcell.atedge')) c.classList.remove('atedge');
    if (near) cell.classList.add('atedge');
  });
  // Or the pointer leaves entirely, which fires no move: a resize cursor left standing on
  // a panel nobody is pointing at is an offer that is not being made.
  el.addEventListener('pointerleave', () => {
    if (drag) return;
    for (const c of el.querySelectorAll('.ssqcell.atedge')) c.classList.remove('atedge');
  });

  // What a selection is FOR, at the keyboard: ⌫ takes it out, ⎋ lets it go. Bound on
  // the document because a rubber band leaves the focus wherever it was — but only ever
  // acting when this panel is open and holding something, and never while somebody is
  // typing into a field.
  addEventListener('keydown', (ev) => {
    if (!selectable || !selection.size || !isOpen()) return;
    if (ev.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (ev.key === 'Escape') { clearSelection(); return; }
    if (ev.key === 'Backspace' || ev.key === 'Delete') {
      ev.preventDefault();
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
    // ⌥ makes them longer and shorter instead of moving them — the keyboard's version
    // of dragging the right end, and the only way to do it a step at a time exactly.
    if (ev.altKey) resizeNotes(notes, dir.step);
    else moveNotes(notes, dir.step * (ev.shiftKey ? 16 : 1), dir.row * (ev.shiftKey ? 12 : 1));
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
      pending.clear();
      headerHost?.()?.querySelector(`.ssqhostbar[data-of="${ns}"]`)?.remove();
      onClose();
      return;
    }
    autoBar = null;
    build();
    if (docked) return;
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { pos = null; }
    const r = el.getBoundingClientRect();
    place(pos?.x ?? Math.max(4, (innerWidth - r.width) / 2), pos?.y ?? 90);
  }

  return {
    open,
    close: () => open(false),
    isOpen,
    /** Repaint: the selection moved, or the song changed under us. */
    refresh: () => { autoBar = null; if (isOpen()) build(); },
    /** Repaint without clearing the auto-page — for a control inside the panel. */
    redraw: build,
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
      if (i < 0 || !scroll || !(rowHeight > 0)) return;
      const want = rowsTop(scroll) + i * rowHeight - scroll.clientHeight * at + rowHeight;
      scroll.scrollTop = Math.max(0, want);
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      if (virtual) renderRows(ctx());
    },
    /** Move the window by whole rows — an octave at a time, in the roll's case. */
    scrollRows(n) {
      const scroll = el.querySelector('.ssqscroll');
      if (!scroll || !(rowHeight > 0)) return;
      scroll.scrollTop = Math.max(0, scroll.scrollTop + n * rowHeight);
      scrollAt = { top: scroll.scrollTop, left: scroll.scrollLeft };
      if (virtual) renderRows(ctx());
    },
    /** A hard context boundary: no pending gesture or old-song DOM crosses it. */
    songChanged() {
      pending.clear();
      paint = null;
      drag = null;
      selection = new Set();
      endBand();
      scrollAt = { top: 0, left: 0 };
      rendered = null;
      plan = [];
      range = { from: 0, to: 0 };
      cols = new Map();
      lit = [];
      autoBar = null;
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
      const at = playheadCell(step);
      if (!at) return;
      if (wholeSong) {
        // Every bar is already drawn, so there is nothing to re-page — the view follows
        // by SCROLLING, which is what a roll does. Only when the column has actually left
        // the visible strip: scrolling on every step would drag the field out from under
        // a hand that had scrolled somewhere else on purpose.
        lit = cols.get(kof(at.bar, at.step)) || [];
        for (const c of lit) c.classList.add('playing');
        const first = lit[0];
        if (playhead && first) {
          playhead.hidden = false;
          playhead.style.left = `${first.offsetLeft}px`;
          playhead.style.width = `${first.offsetWidth}px`;
        }
        const scroll = el.querySelector('.ssqscroll');
        if (scroll && first) {
          const x = first.offsetLeft;
          const pad = scroll.clientWidth * 0.25;
          if (x < scroll.scrollLeft + pad || x > scroll.scrollLeft + scroll.clientWidth - pad) {
            scroll.scrollLeft = Math.max(0, x - pad);
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
      lit = cols.get(kof(at.bar, at.step)) || [];
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
    /** Stage whole lanes across the shown bars and commit once — figures, grooves. */
    layDown,
    toggleMute,
    barSpan,
    setRulerLabel(label) { rulerLabel = label; },
    get linked() { return linked; },
    get range() { return range; },
    get plan() { return plan; },
  };
}
