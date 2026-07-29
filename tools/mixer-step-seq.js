// The step grid: what the kit plays, as sixteen squares a bar.
//
// The desk could already ARRANGE drums — drop the kit out of a bar, build up over
// four passes — but not change what the kit plays. Moving a snare meant editing
// src/data/songs/<id>.js by hand and reloading. This is the other half.
//
// Drums first, and drums only, because a percussion lane is booleans: there is no
// pitch axis to design and no new data type to invent. The write path underneath
// (`writeBarNotes`) is the same one a piano roll will use, which is the real reason
// to build the easy half of it first.
//
// WHAT A CLICK ACTUALLY WRITES. Nothing here touches a composition. A step edit
// becomes a layer section on the ARRANGEMENT — a delta over what the bar already
// played — so it is written below the desk's marker in the song file, next to the
// mix, and deleting the entry puts the song back exactly as it was composed. The
// bank's own `kick: seq('C1 . . .')` line is never rewritten.
import { resolveSection } from '../src/data/arrangements.js';
import { LANES } from '../src/engine/lanes.js';
import { baseLane } from '../src/data/voices.js';
import { writeBarNotes, writeBarNotesShared, setLanesOff, DRUM_LANES } from './lib/arrangement-edit.js';

// Capitalised on the way in, for the same reason mixer-entry.js capitalises them:
// the engine's lane names are keys down there and words up here.
const LABELS = Object.fromEntries(
  LANES.map((l) => [l.key, l.label.charAt(0).toUpperCase() + l.label.slice(1)]),
);

// ---- the patterns ---------------------------------------------------------------
//
// Written as sixteen characters because that is what they are, and because a figure
// you can read in the source is a figure you can check against the grid.
//
// These are the game's OWN house vocabulary, not a general drum-machine preset pack:
// `src/data/megamix.js` has been building every megamix section out of HOUSE_KICK,
// HOUSE_HATS, HOUSE_OHATS, HOUSE_BACKBEAT, HOUSE_FILL, HOUSE_RIM_OFF, HOUSE_RIM_FILL
// and CRASH_DOWNBEAT since it was written. Restating them here as a second, slightly
// different idea of what house is would give the game two — so where a figure exists
// there already, this is the same figure.
const P = (s) => Array.from({ length: 16 }, (_, i) => s[i] === 'x');

const FOUR = 'x...x...x...x...';
const BACKBEAT = '....x.......x...';       // megamix's HOUSE_BACKBEAT
const OFFBEAT = '..x...x...x...x.';        // HOUSE_HATS — `seq('. . C1 .')` cycled
const AND = '......x.......x.';            // HOUSE_OHATS
const RIM_OFF = '...x......x.....';        // HOUSE_RIM_OFF
const OFF16 = '................';

/** Per lane, the figures that lane actually plays. */
const PATTERNS = {
  kick: [['Four on the floor', FOUR], ['Two to the bar', 'x.......x.......'],
    ['Boom bap', 'x.........x.....'], ['Offbeat', OFFBEAT]],
  snare: [['On 2 and 4', BACKBEAT], ['On 2 and 4, with ghosts', '....x..x....x..x'],
    ['Half time — on 3', '........x.......'], ['Fill', '....x.......x.xx']],
  clap: [['On 2 and 4', BACKBEAT], ['On 4 only', '............x...']],
  hats: [['Eighths', 'x.x.x.x.x.x.x.x.'], ['Sixteenths', 'xxxxxxxxxxxxxxxx'],
    ['Offbeat — house', OFFBEAT], ['Four to the bar', FOUR]],
  ohats: [['On every and', AND], ['Once, on the last and', '..............x.']],
  rim: [['Off the three', RIM_OFF], ['Fill', '.............xxx']],
  crash: [['On the one', 'x...............']],
  tom: [['Four to the bar', FOUR], ['Toms on 1 and 3', 'x.......x.......'],
    ['Syncopated', 'x.....x...x...x.'], ['Fill', '............xxxx']],
};

/**
 * Whole kits. A groove names EVERY drum lane, including the ones it leaves silent —
 * "make this bar a house bar" is a statement about the whole kit, and one that left
 * yesterday's rim playing underneath would not be the groove it offered.
 */
const GROOVES = [
  ['Four on the floor', { kick: FOUR, clap: BACKBEAT, hats: 'x.x.x.x.x.x.x.x.' }],
  ['House', { kick: FOUR, hats: OFFBEAT, ohats: AND, snare: BACKBEAT }],
  ['Deep house', { kick: FOUR, hats: OFFBEAT, ohats: AND, rim: RIM_OFF }],
  ['Boom bap', { kick: 'x.........x.....', snare: '....x..x....x..x', hats: 'x.x.x.x.x.x.x.x.' }],
  ['Breakbeat', { kick: 'x..x....x..x....', snare: BACKBEAT, hats: 'x.x.x.x.x.x.x.x.' }],
  ['Half time', { kick: 'x.......x.......', snare: '........x.......', hats: 'x.x.x.x.x.x.x.x.' }],
];

/**
 * Keep the canonical eight in one dependable order, then append extra sounds.
 *
 * Painting the first snare note must not move its row under the pointer that clicked
 * it. Added sounds likewise stay where they arrived; deletion is the only edit that
 * removes one. A new song is the context boundary that deliberately starts afresh.
 */
export function drumRowOrder(active, current = null) {
  const order = Array.isArray(active) ? active : [];
  const extras = order.filter((key) => DRUM_LANES.includes(baseLane(key))
    && !DRUM_LANES.includes(key));
  const wanted = [...DRUM_LANES, ...extras];
  if (!current) return wanted;
  const kept = current.filter((key) => DRUM_LANES.includes(key) || wanted.includes(key));
  const next = [...kept, ...wanted.filter((key) => !kept.includes(key))];
  return next.length === current.length && next.every((key, i) => key === current[i])
    ? current : next;
}

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
 * @param el         the panel's own div, held rather than looked up — it is detached
 * @param bank       () => the song as it PLAYS, for reading what a bar currently has
 * @param editBank   () => the song as it is WRITTEN, which is what an edit is relative
 *                   to. Handing the seam the arranged bank double-counts the layer
 *                   sections and the second edit to a song writes past the end of the
 *                   list — see `editBank` in mixer-entry.js.
 * @param draft      () => the current bar list
 * @param sel        () => { from, to } — the bars to show, already defaulted
 * @param apply      (draft, what) => the desk's arrangement-edit path: undo, validate,
 *                   engine, redraw. A note edit is an arrangement edit, so it inherits
 *                   ⌘Z, the A/B and Save without any of them knowing about this file.
 */
export function createStepSeq({
  el, Audio, bank, editBank, draft, sel, apply, laneColour, engineBank, toast,
  // The desk's own row order and numbering, so this reads as the same track list as
  // the arrangement above it rather than a second opinion about the kit.
  kitLanes, laneNumber, laneLabel = (key) => LABELS[key] || key, addInstrument = () => {},
  // The desk's context menu, so the pattern lists look like every other list on it.
  menu, onClose = () => {},
}) {
  const POS_KEY = 'mash-mixer-stepseq-pos';
  const LINK_KEY = 'mash-mixer-stepseq-linked';

  // Off: an edit forks the bar, and the other bars playing that section carry on as
  // they were. On: the whole loop changes together. Both are real gestures — "fix
  // this bar" and "the hats are wrong in this song" — and neither is a good default
  // for the other, so it is a switch rather than a guess. Remembered, because whoever
  // wants one of them usually wants it for a while.
  let linked = localStorage.getItem(LINK_KEY) === '1';

  // Edits made but not yet handed to the desk. A paint-drag across twelve steps is
  // ONE gesture and should be one undo step and one re-render, so the cells are
  // painted straight onto the DOM as the pointer moves and the draft is built once,
  // on release.
  const pending = new Map();
  const kof = (b, lane) => `${b}:${lane}`;

  // Eight canonical rows are always present. Extra independent sounds are appended
  // in the order they are added and remain there while notes and voices change.
  let kitOrder = null;
  const kit = () => (kitOrder = drumRowOrder(kitLanes(), kitOrder));
  const inSong = (lane) => kitLanes().includes(lane);

  let plan = [];
  let range = { from: 0, to: 0 };
  let cols = new Map();     // `${bar}:${step}` -> the cells in that column
  let lit = [];             // the column the playhead is standing on
  let paint = null;         // the value a drag is painting, decided by its first cell
  let autoBar = null;       // first bar of the two-bar page being heard

  const isOpen = () => el.classList.contains('show');

  /** The sixteen steps a bar plays on one lane, as booleans. */
  function stepsOf(b, lane) {
    const pend = pending.get(kof(b, lane));
    if (pend) return pend;
    const bar = plan[b];
    if (!bar) return new Array(16).fill(false);
    const view = bank();
    // Read through the delta chain, then fall through to the bank exactly as the
    // sequencer does: a section that overrides the snare says nothing about the kick,
    // and the kick it plays is the song's.
    const resolved = (bar.sec != null ? resolveSection(view, bar.sec) : null) || {};
    const arr = resolved[lane] ?? view[lane];
    if (!Array.isArray(arr)) return new Array(16).fill(false);
    const at = bar.half * 16;
    return Array.from({ length: 16 }, (_, i) => !!arr[at + i]);
  }

  const mutedIn = (b, lane) => (plan[b]?.off || []).includes(lane);

  // ---- editing -----------------------------------------------------------------

  function setStep(b, lane, step, on) {
    const cur = stepsOf(b, lane);
    if (cur[step] === on) return false;
    const next = cur.slice();
    next[step] = on;
    pending.set(kof(b, lane), next);
    return true;
  }

  /**
   * Hand everything the drag touched to the desk, as one edit.
   *
   * Each bar is written on its own — `writeBarNotes` takes sixteen steps and puts them
   * at that bar's half of the section — and each write is chained onto the draft the
   * last one returned, so forking one bar cannot lose another's edit. `false` rather
   * than `null` for a step that is off, so the lane stays all-boolean and writes back
   * out as `seq('C1 . . .').map((v) => !!v)` rather than a raw array.
   */
  function commit() {
    if (!pending.size) return;
    const write = linked ? writeBarNotesShared : writeBarNotes;
    const eb = editBank();
    let d = draft();
    const lanes = new Set();
    for (const [k, steps] of pending) {
      const cut = k.indexOf(':');
      const b = Number(k.slice(0, cut));
      const lane = k.slice(cut + 1);
      lanes.add(lane);
      d = write(eb, d, b, lane, steps);
    }
    const bars = new Set([...pending.keys()].map((k) => Number(k.slice(0, k.indexOf(':')))));
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
   * Lay a figure down across every bar on screen.
   *
   * The selection is the scope, as it is everywhere else here: one bar selected puts
   * the figure in that bar, four puts it in four. One commit, so it is one undo.
   */
  function layDown(figures) {
    for (const [lane, s] of Object.entries(figures)) {
      for (let b = range.from; b <= range.to; b++) pending.set(kof(b, lane), P(s));
    }
    commit();
  }

  /** The figures this lane plays, plus the two that every lane does. */
  function showLaneMenu(x, y, lane) {
    const items = (PATTERNS[baseLane(lane)] || []).map(([label, s]) => ({
      label, run: () => layDown({ [lane]: s }),
    }));
    items.push({ label: `Clear ${laneLabel(lane)}`, run: () => layDown({ [lane]: OFF16 }) });
    menu(x, y, `${laneLabel(lane)} · ${barSpan()}`, items);
  }

  function laneMenu(ev, lane) {
    ev.preventDefault();
    ev.stopPropagation();
    showLaneMenu(ev.clientX, ev.clientY, lane);
  }

  /** A whole kit at once. */
  function kitMenu(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const items = GROOVES.map(([label, figures]) => ({
      label,
      // Every drum lane, including the ones the groove leaves out: a house bar with
      // last week's rim still in it is not the groove that was offered.
      run: () => layDown(Object.fromEntries(kit().map((k) => [k, figures[k] || OFF16]))),
    }));
    items.push({
      label: `Clear the kit in ${barSpan()}`,
      run: () => layDown(Object.fromEntries(kit().map((k) => [k, OFF16]))),
    });
    menu(ev.clientX, ev.clientY, `Kit · ${barSpan()}`, items);
  }

  /** Mute the lane across the shown bars, or let it back in — the channel mute. */
  function toggleMute(lane) {
    const off = !mutedIn(range.from, lane);
    apply(setLanesOff(draft(), range.from, range.to, [lane], off),
      `${laneLabel(lane)} ${off ? 'out of' : 'back in'} ${barSpan()}`);
    build();
  }

  const barSpan = () => (range.from === range.to
    ? `bar ${range.from + 1}` : `bars ${range.from + 1}-${range.to + 1}`);

  // ---- drawing -------------------------------------------------------------------

  function build() {
    if (!isOpen()) return;
    plan = draft().plan;
    const chosen = sel();
    const wanted = autoBar != null
      ? { ...chosen, from: autoBar, to: Math.min(plan.length - 1, autoBar + 1) }
      : chosen;
    range = {
      from: Math.max(0, Math.min(wanted.from, plan.length - 1)),
      to: Math.max(0, Math.min(wanted.to, plan.length - 1)),
    };
    cols = new Map();
    lit = [];
    el.textContent = '';

    // ---- the header, which is also the handle
    const head = document.createElement('div');
    head.className = 'ssqhead';
    const add = document.createElement('button');
    add.className = 'ssqx ssqadd';
    add.textContent = '+';
    add.title = 'Add another independent percussion sound';
    add.setAttribute('aria-label', 'Add instrument');
    add.onclick = (ev) => { ev.stopPropagation(); addInstrument(); };
    const title = document.createElement('span');
    title.className = 'ssqtitle';
    title.textContent = `Step sequencer · ${barSpan()}${linked ? ' · shared editing' : ''}`;
    title.title = 'Sixteen sixteenths to the bar. Select bars on the arrangement to'
      + ' widen or narrow what is shown — the edit is always one bar at a time.';

    const kitBtn = document.createElement('button');
    kitBtn.className = 'ssqlink';
    kitBtn.textContent = 'Apply groove ▾';
    kitBtn.title = 'Lay a whole groove down across these bars — every drum lane at once';
    kitBtn.onclick = kitMenu;

    const link = document.createElement('button');
    link.className = 'ssqlink' + (linked ? ' on' : '');
    link.textContent = linked ? 'Edit all repeats' : 'Edit selected bars';
    link.setAttribute('aria-pressed', linked ? 'true' : 'false');
    link.title = linked
      ? 'Editing every bar that plays this part — plumber holds section 0 for four bars,'
        + ' and all four change together'
      : 'Editing only the bar you click; the other bars playing the same part are left'
        + ' as they were';
    link.onclick = () => {
      linked = !linked;
      localStorage.setItem(LINK_KEY, linked ? '1' : '0');
      build();
    };

    const shut = document.createElement('button');
    shut.className = 'ssqx popclose';
    shut.textContent = '✕';
    shut.title = 'close';
    shut.onclick = () => open(false);
    head.append(add, title, kitBtn, link, shut);
    el.append(head);

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
    // their bar and beat numbers stayed behind. The lane headers are sticky inside
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
    // Both are built out of the same per-step divs as a lane row and carry the same
    // beat and bar classes, so everything lines up by construction rather than by a
    // width calculation that has to know about every gap and margin below it.
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
    strip('ssqbars', 'Channel rack', (b, i) => (i === 0 ? `Bar ${b + 1}` : null));
    strip('ssqnums', 'Beat', (b, i) => (i % 4 === 0 ? `${i / 4 + 1}` : null));

    // ---- a row per drum lane, in the desk's own order
    const body = document.createElement('div');
    body.className = 'ssqbody';
    for (const lane of kit()) {
      const row = document.createElement('div');
      const muted = mutedIn(range.from, lane);
      row.className = 'ssqrow ssqlane' + (inSong(lane) ? '' : ' unused') + (muted ? ' muted' : '');
      row.style.setProperty('--lane', laneColour(lane));

      // The same header cell the arrangement rows carry: number, then name, so the
      // two lists read as one list. The button is NOT the strip's mute — it drops the
      // lane out of these bars, which is an arrangement decision — so it is spelled
      // out in the title rather than borrowed from the channel.
      const head2 = document.createElement('div');
      head2.className = 'ssqhead-cell';
      const num = document.createElement('span');
      num.className = 'ssqnum';
      num.textContent = String(laneNumber(lane) ?? '');
      const led = document.createElement('span');
      led.className = 'ssqled';
      led.setAttribute('aria-hidden', 'true');
      const name = document.createElement('button');
      name.className = 'ssqname' + (inSong(lane) ? '' : ' unused') + (muted ? ' muted' : '');
      name.textContent = laneLabel(lane);
      name.title = muted
        ? `${laneLabel(lane)} is silenced in ${barSpan()} by the arrangement — the steps are`
          + ' still there. Click to let it back in.'
        : `Click to silence ${laneLabel(lane)} in ${barSpan()} without touching its steps`;
      name.onclick = () => toggleMute(lane);
      // The lane's own figures. A button as well as a right-click, because a menu that
      // only exists on right-click is a menu most people never find — and the right-
      // click is on the whole row, so it works from the cells too.
      const pick = document.createElement('button');
      pick.className = 'ssqpick';
      pick.textContent = '▾';
      pick.title = `Figures ${laneLabel(lane)} plays — laid down across ${barSpan()}`;
      pick.onclick = (ev) => laneMenu(ev, lane);
      row.oncontextmenu = (ev) => laneMenu(ev, lane);
      head2.append(num, led, name, pick);

      const cells = document.createElement('div');
      cells.className = 'ssqcells';
      for (let b = range.from; b <= range.to; b++) {
        const steps = stepsOf(b, lane);
        const off = mutedIn(b, lane);
        for (let i = 0; i < 16; i++) {
          const c = document.createElement('button');
          c.type = 'button';
          c.className = 'ssqcell' + stepClasses(b, i)
            + (steps[i] ? ' on' : '')
            + (off ? ' muted' : '');
          c.dataset.bar = b;
          c.dataset.step = i;
          c.dataset.lane = lane;
          c.setAttribute('aria-pressed', steps[i] ? 'true' : 'false');
          c.setAttribute('aria-label', `${laneLabel(lane)}, bar ${b + 1}, beat ${Math.floor(i / 4) + 1}, sixteenth ${i % 4 + 1}`);
          cells.append(c);
          const col = kof(b, i);
          if (!cols.has(col)) cols.set(col, []);
          cols.get(col).push(c);
        }
      }
      row.append(head2, cells);
      body.append(row);
    }
    scroll.append(body);
    el.append(scroll);
  }

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

  // ---- the gesture ---------------------------------------------------------------
  //
  // One listener on the container rather than one per cell: `build()` replaces every
  // cell in the panel, and a listener per cell is a listener per cell per rebuild.

  const cellFrom = (t) => (t && t.closest ? t.closest('.ssqcell') : null);

  function hit(cell) {
    if (!cell) return;
    const b = Number(cell.dataset.bar);
    const i = Number(cell.dataset.step);
    const lane = cell.dataset.lane;
    if (!setStep(b, lane, i, paint)) return;
    cell.classList.toggle('on', paint);
    cell.setAttribute('aria-pressed', paint ? 'true' : 'false');
    // Only on the way in. A drag that erases twelve steps should not play twelve
    // kicks, and hearing the one you just added is the whole point of the preview.
    if (paint) Audio.previewNote(lane, null, { bank: engineBank() });
  }

  el.addEventListener('pointerdown', (ev) => {
    const cell = cellFrom(ev.target);
    if (!cell) return;
    ev.preventDefault();
    // The first cell decides whether this drag paints or erases, so dragging across a
    // half-filled row fills it rather than inverting it square by square.
    paint = !stepsOf(Number(cell.dataset.bar), cell.dataset.lane)[Number(cell.dataset.step)];
    hit(cell);
    const move = (e) => { if (paint != null) hit(cellFrom(document.elementFromPoint(e.clientX, e.clientY))); };
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
    paint = !stepsOf(Number(cell.dataset.bar), cell.dataset.lane)[Number(cell.dataset.step)];
    hit(cell);
    paint = null;
    commit();
  });

  // ---- the window ----------------------------------------------------------------

  function place(x, y) {
    const r = el.getBoundingClientRect();
    const left = Math.max(4, Math.min(x, Math.max(4, innerWidth - r.width - 4)));
    const top = Math.max(4, Math.min(y, Math.max(4, innerHeight - r.height - 4)));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    localStorage.setItem(POS_KEY, JSON.stringify({ x: left, y: top }));
  }

  // Delegated from the container, not the header: `build()` replaces the header.
  el.addEventListener('pointerdown', (ev) => {
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
    if (!on) { pending.clear(); onClose(); return; }
    autoBar = null;
    build();
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
    /** A hard context boundary: no pending gesture or old-song DOM crosses it. */
    songChanged() {
      pending.clear();
      paint = null;
      plan = [];
      range = { from: 0, to: 0 };
      cols = new Map();
      lit = [];
      autoBar = null;
      kitOrder = null;
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
    },
  };
}
