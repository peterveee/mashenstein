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
// That turned out to be true of far more than the write path, so the grid itself —
// the batching, the paint drag, the window, the playhead, the ruler, the selection
// and the shared-editing switch — now lives in `mixer-bar-grid.js` and the roll uses
// the same one. What is left here is what makes this the KIT: the house figures, the
// row order, and the fact that a cell holds a boolean.
//
// WHAT A CLICK ACTUALLY WRITES. Nothing here touches a composition. A step edit
// becomes a layer section on the ARRANGEMENT — a delta over what the bar already
// played — so it is written below the desk's marker in the song file, next to the
// mix, and deleting the entry puts the song back exactly as it was composed. The
// bank's own `kick: seq('C1 . . .')` line is never rewritten.
import { LANES } from '../src/engine/lanes.js';
import { baseLane } from '../src/data/voices.js';
import { DRUM_LANES } from './lib/arrangement-edit.js';
import { createBarGrid } from './mixer-bar-grid.js';

// Where they live now. Re-exported because they were always general — they are about
// bars and patterns, not about drums — and tests/arrangement.js imports them here.
export {
  sharedPatternGroups, sharedPatternDescription, playheadCell, playheadWindow,
} from './mixer-bar-grid.js';

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
  // Eight canonical rows are always present. Extra independent sounds are appended
  // in the order they are added and remain there while notes and voices change.
  let kitOrder = null;
  const kit = () => (kitOrder = drumRowOrder(kitLanes(), kitOrder));
  const inSong = (lane) => kitLanes().includes(lane);

  const grid = createBarGrid({
    el, Audio, bank, editBank, draft, sel, apply, engineBank, laneLabel,
    ns: 'stepseq',
    // No `headerHost`: this is a window, so its controls go in its own header, with the
    // title, the ✕ and the handle. The roll hands its controls to the effects region
    // because it lives in it; the kit does not live anywhere.
    onClose: () => { kitOrder = null; onClose(); },

    // A drum row IS its lane: one line per piece of the kit, which is the channel
    // rack every drum machine has had since the 808.
    rows: () => kit().map((lane) => ({
      key: lane,
      lane,
      label: laneLabel(lane),
      colour: laneColour(lane),
      unused: !inSong(lane),
      contextMenu: (ev) => laneMenu(ev, lane),
    })),

    // The three lines that make this the KIT rather than the roll. A percussion lane
    // holds booleans, and its rest is `false` — not `null`, which is what a melodic
    // lane rests with. tests/preview.js pins that difference, and `.map((v) => !!v)`
    // is how every bank spells the lane, so writing null here would change the file.
    isOn: (row, value) => !!value,
    withCell: (row, value, on) => on,
    // No frequency, on purpose: the bank says a hit happens and the lane's own note
    // key is what a preset kit gets struck at.
    preview: (row) => Audio.previewNote(row.lane, null, { bank: engineBank() }),

    title: (c) => `Step sequencer · ${c.barSpan}${c.linked ? ' · shared editing' : ''}`,

    // The `+` sits before the title, where the arrangement's own add control is.
    lead: () => {
      const add = document.createElement('button');
      add.className = 'ssqx ssqadd';
      add.textContent = '+';
      add.title = 'Add another independent percussion sound';
      add.setAttribute('aria-label', 'Add instrument');
      add.onclick = (ev) => { ev.stopPropagation(); addInstrument(); };
      return [add];
    },

    headerExtra: () => {
      const kitBtn = document.createElement('button');
      kitBtn.className = 'ssqlink';
      kitBtn.textContent = 'Apply groove ▾';
      kitBtn.title = 'Lay a whole groove down across these bars — every drum lane at once';
      kitBtn.onclick = kitMenu;
      return [kitBtn];
    },

    // The same header cell the arrangement rows carry: number, then name, so the two
    // lists read as one list. The button is NOT the strip's mute — it drops the lane
    // out of these bars, which is an arrangement decision — so it is spelled out in
    // the title rather than borrowed from the channel.
    rowHeader: (row, c) => {
      const muted = grid.mutedIn(c.range.from, row.lane);
      const num = document.createElement('span');
      num.className = 'ssqnum';
      num.textContent = String(laneNumber(row.lane) ?? '');
      const led = document.createElement('span');
      led.className = 'ssqled';
      led.setAttribute('aria-hidden', 'true');
      const name = document.createElement('button');
      name.className = 'ssqname' + (row.unused ? ' unused' : '') + (muted ? ' muted' : '');
      name.textContent = row.label;
      name.title = muted
        ? `${row.label} is silenced in ${c.barSpan} by the arrangement — the steps are`
          + ' still there. Click to let it back in.'
        : `Click to silence ${row.label} in ${c.barSpan} without touching its steps`;
      name.onclick = () => grid.toggleMute(row.lane);
      // The lane's own figures. A button as well as a right-click, because a menu that
      // only exists on right-click is a menu most people never find — and the right-
      // click is on the whole row, so it works from the cells too.
      const pick = document.createElement('button');
      pick.className = 'ssqpick';
      pick.textContent = '▾';
      pick.title = `Figures ${row.label} plays — laid down across ${c.barSpan}`;
      pick.onclick = (ev) => laneMenu(ev, row.lane);
      return [num, led, name, pick];
    },
  });
  grid.setRulerLabel('Channel rack');

  /** The figures this lane plays, plus the two that every lane does. */
  function laneMenu(ev, lane) {
    ev.preventDefault();
    ev.stopPropagation();
    const span = grid.barSpan();
    const items = (PATTERNS[baseLane(lane)] || []).map(([label, s]) => ({
      label, run: () => grid.layDown({ [lane]: P(s) }),
    }));
    items.push({ label: `Clear ${laneLabel(lane)}`, run: () => grid.layDown({ [lane]: P(OFF16) }) });
    menu(ev.clientX, ev.clientY, `${laneLabel(lane)} · ${span}`, items);
  }

  /** A whole kit at once. */
  function kitMenu(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const span = grid.barSpan();
    // Every drum lane, including the ones the groove leaves out: a house bar with
    // last week's rim still in it is not the groove that was offered.
    const spread = (figures) => Object.fromEntries(
      kit().map((k) => [k, P(figures[k] || OFF16)]),
    );
    const items = GROOVES.map(([label, figures]) => ({
      label, run: () => grid.layDown(spread(figures)),
    }));
    items.push({ label: `Clear the kit in ${span}`, run: () => grid.layDown(spread({})) });
    menu(ev.clientX, ev.clientY, `Kit · ${span}`, items);
  }

  return {
    open: grid.open,
    close: grid.close,
    isOpen: grid.isOpen,
    refresh: grid.refresh,
    follow: grid.follow,
    songChanged() { kitOrder = null; grid.songChanged(); },
  };
}
