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

  const isOpen = () => el.classList.contains('show');
  const barSpan = () => (range.from === range.to
    ? `bar ${range.from + 1}` : `bars ${range.from + 1}-${range.to + 1}`);

  /** What the panel hands its callbacks: everything they could reasonably ask. */
  const ctx = () => ({ plan, range, linked, barSpan: barSpan(), bank: bank() });

  /**
   * The sixteen raw values a bar plays on one lane.
   *
   * Read through the delta chain, then fall through to the bank exactly as the
   * sequencer does: a section that overrides the snare says nothing about the kick,
   * and the kick it plays is the song's. Raw, not coerced — a boolean lane and a
   * melodic one are the same read, and only the caller knows which it wanted.
   */
  function readBar(b, lane) {
    const pend = pending.get(kof(b, lane));
    if (pend) return pend;
    const bar = plan[b];
    if (!bar) return new Array(16).fill(null);
    const view = bank();
    const resolved = (bar.sec != null ? resolveSection(view, bar.sec) : null) || {};
    const arr = resolved[lane] ?? view[lane];
    if (!Array.isArray(arr)) return new Array(16).fill(null);
    const at = bar.half * 16;
    return Array.from({ length: 16 }, (_, i) => arr[at + i] ?? null);
  }

  const mutedIn = (b, lane) => (plan[b]?.off || []).includes(lane);

  // ---- editing -------------------------------------------------------------------

  /** Stage one cell. Returns false when it already held that, so a drag can skip it. */
  function setCell(row, b, step, on) {
    const cur = readBar(b, row.lane);
    const next = withCell(row, cur[step] ?? null, on);
    if (Object.is(next, cur[step] ?? null)) return false;
    const arr = cur.slice();
    arr[step] = next;
    pending.set(kof(b, row.lane), arr);
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
    for (const [k, steps] of pending) {
      const cut = k.indexOf(':');
      const b = Number(k.slice(0, cut));
      const lane = k.slice(cut + 1);
      lanes.add(lane);
      bars.add(b);
      d = write(eb, d, b, lane, steps);
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
    for (const [lane, steps] of Object.entries(byLane)) {
      for (let b = range.from; b <= range.to; b++) pending.set(kof(b, lane), steps.slice());
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
    for (const row of list) {
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
      for (let b = range.from; b <= range.to; b++) {
        const steps = readBar(b, row.lane);
        const off = mutedIn(b, row.lane);
        for (let i = 0; i < 16; i++) {
          const on = isOn(row, steps[i] ?? null);
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'ssqcell' + stepClasses(b, i)
            + (on ? ' on' : '')
            + (off ? ' muted' : '');
          cell.dataset.bar = b;
          cell.dataset.step = i;
          cell.dataset.row = row.key;
          cell.setAttribute('aria-pressed', on ? 'true' : 'false');
          cell.setAttribute('aria-label',
            `${row.label}, bar ${b + 1}, beat ${Math.floor(i / 4) + 1}, sixteenth ${i % 4 + 1}`);
          cells.append(cell);
          const col = kof(b, i);
          if (!cols.has(col)) cols.set(col, []);
          cols.get(col).push(cell);
        }
      }
      rowEl.append(headCell, cells);
      body.append(rowEl);
    }
    scroll.append(body);
    el.append(scroll);
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

  /** The gesture both the pointer and the keyboard perform, so both get everything. */
  function begin(cell) {
    const row = rowOf(cell);
    if (!row) return false;
    const b = Number(cell.dataset.bar);
    const i = Number(cell.dataset.step);
    // The first cell decides whether this drag paints or erases, so dragging across a
    // half-filled row fills it rather than inverting it square by square.
    paint = !isOn(row, readBar(b, row.lane)[i] ?? null);
    hit(cell);
    return true;
  }

  el.addEventListener('pointerdown', (ev) => {
    const cell = cellFrom(ev.target);
    if (!cell) return;
    ev.preventDefault();
    if (!begin(cell)) return;
    const move = (e) => {
      if (paint != null) hit(cellFrom(document.elementFromPoint(e.clientX, e.clientY)));
    };
    const stop = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', stop);
      removeEventListener('pointercancel', stop);
      paint = null;
      commit();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
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
    /** A hard context boundary: no pending gesture or old-song DOM crosses it. */
    songChanged() {
      pending.clear();
      paint = null;
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
        // shows that chosen range. Never replace the DOM under an active paint gesture.
        if (paint != null) return;
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
