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
// kits of sounds, the row order, and the fact that a cell holds a boolean.
//
// TWO OF THEM, one factory. The window above, and the same kit DOCKED in the Notes
// panel, where a pitched channel has its roll — a percussion channel used to empty that
// panel, and this is what goes in it: the whole song, one bar per click, track names in
// the column the keyboard has next door. The flags at the top of `createStepSeq` are the
// whole difference. Everything a kit IS has to have one definition, which is why this is
// a second instance rather than a second file.
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

/**
 * The figures, and EVERY lane is offered all of them.
 *
 * They used to be per lane — the kick knew about four-on-the-floor, the hats about
 * sixteenths, the crash about the one — which is a good idea about what a kit usually
 * plays and a bad one to build a control out of. It meant the same menu in the same
 * place held a different list on every row, so there was nothing to learn and nothing
 * to reach for twice: you opened it to find out what was in it. Two of them held two
 * items, which reads as a menu with things missing rather than as a short one.
 *
 * These are RHYTHMS, and a rhythm is not the property of a drum. A crash on every
 * offbeat and sixteenths on a tom are both real, both a click away, and neither is
 * something the desk should have an opinion about — the sound is chosen on the strip,
 * and this list is about time.
 *
 * Ordered by density, from every step down to one, then the two that are not a steady
 * pulse. That order is the other half of being predictable: the item you want is found
 * by how busy you want the row to be, not by reading all of them.
 *
 * Named the way the figures are SAID rather than counted — Offbeat, Four on the floor —
 * and Four on the floor is already the name of the groove built out of it.
 *
 * `AND`, a hit on the & of 2 and of 4, is deliberately not one of them: it is two hits of
 * the offbeat and reads as a near-duplicate of it in a list, which is the kind of item
 * that makes a menu something you study rather than use. It is still the open hat's part
 * in the House grooves below, where it belongs to a whole kit rather than to one row.
 */
const FIGURES = [
  ['Sixteenths', 'xxxxxxxxxxxxxxxx'],
  ['Eighths', 'x.x.x.x.x.x.x.x.'],
  ['Offbeat', OFFBEAT],
  ['Four on the floor', FOUR],
  ['On 2 and 4', BACKBEAT],
  ['On 1 and 3', 'x.......x.......'],
  ['On the 1', 'x...............'],
  ['On the 4', '............x...'],
  ['Syncopated', 'x.....x...x...x.'],
  ['Fill', '............xxxx'],
];

/**
 * ---- what a figure lands ON ------------------------------------------------------
 *
 * Two questions, and they are the same two whichever figure or groove you pick, so they
 * are answered once and remembered rather than asked eleven times.
 *
 *   WHERE   the bar being played, the bars you picked out, or all of them. A figure is
 *           one bar long and the docked kit is the whole song, so something has to say
 *           how far it goes — and leaving it implicit means the same click does two
 *           different things depending on whether you happened to have a selection.
 *   HOW     replace what the row plays, or add to it. A figure's RESTS are the whole
 *           difference: replacing writes them, adding ignores them. So "on 2 and 4" then
 *           "fill" is a backbeat with a fill in it when adding, and a bare fill when
 *           replacing.
 *
 * Remembered across panels and songs, like the shared-editing switch: whoever wants to
 * add rather than replace usually wants it for a while. Both live at module scope so the
 * window and the docked kit cannot disagree about what the next click will do.
 */
const SCOPE_KEY = 'mash-mixer-figure-scope';
const MODE_KEY = 'mash-mixer-figure-mode';
const SCOPES = [
  ['bar', 'the bar being played'],
  ['selection', 'the bars I select'],
  ['song', 'the whole song'],
];
const readStored = (key, allowed, fallback) => {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  return allowed.includes(v) ? v : fallback;
};
let figureScope = readStored(SCOPE_KEY, SCOPES.map(([id]) => id), 'selection');
let figureAdds = readStored(MODE_KEY, ['add', 'replace'], 'replace') === 'add';
const setFigureScope = (id) => {
  figureScope = id;
  try { localStorage.setItem(SCOPE_KEY, id); } catch { /* private window */ }
};
const setFigureAdds = (on) => {
  figureAdds = on;
  try { localStorage.setItem(MODE_KEY, on ? 'add' : 'replace'); } catch { /* private window */ }
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
 * Whole kits, as SOUNDS — the other half of the question a groove answers.
 *
 * A groove says which steps; a kit says what they are struck on. Both belong here for
 * the same reason: a vocabulary you can read in the source is one you can check against
 * the desk, and a second copy of it elsewhere would give the game two ideas of what an
 * 808 is.
 *
 * Written out rather than derived from the `ds808*` / `ds909*` prefixes, even though
 * every one of those presets carries a `homeLane` and most of them would derive: 808 has
 * two tom-homed voices and 909 has two kicks and two snares, so a derived kit has to
 * choose anyway — and a table is the readable version of the choice it made.
 *
 * Nothing here is an ENGINE voice, and that is a rule rather than an accident. An engine
 * preset is a bundle of bank keys a hand-written lane body reads, and an added drum is a
 * layer with no body, so `voicesFor` refuses it one. A kit that could re-voice the drums
 * a song has but never bring in the ones it hasn't is a kit that half-arrives — so the
 * game's own Arcade drums stay out of this list until that changes.
 *
 * SOUNDS ONLY: applying one never touches a step. Re-voicing a part you have already
 * programmed must not wipe it, and the groove is the next button along.
 */
export const KITS = [
  ['808', {
    kick: 'ds808Kick', snare: 'ds808Snare', clap: 'ds808Clap',
    hats: 'ds808Hat', ohats: 'ds808OpenHat', tom: 'ds808Tom',
  }],
  ['909', {
    kick: 'ds909Kick', snare: 'ds909Snare', clap: 'ds909Clap', rim: 'ds909Rim',
    hats: 'ds909Hat', ohats: 'ds909OpenHat', tom: 'ds909Tom', crash: 'ds909Crash',
  }],
  ['CR-78', {
    kick: 'dsCr78Kick', snare: 'dsCr78Snare', clap: 'dsCr78Clap',
    hats: 'dsCr78Hat', tom: 'dsCr78Tom',
  }],
  ['DS', {
    kick: 'dsKick', snare: 'dsSnare', clap: 'dsClap', rim: 'dsRim',
    hats: 'dsHatClosed', ohats: 'dsHatOpen', tom: 'dsTom',
  }],
  ['Studio', {
    kick: 'kickPunch', snare: 'snareCrisp', clap: 'clap808', rim: 'rimWood',
    hats: 'hatClosed', ohats: 'hatOpen', tom: 'tom', crash: 'metalCrash',
  }],
];

/**
 * The percussion this song HAS, in the desk's own order, held steady while you work.
 *
 * It used to be the canonical eight whatever the song played. Every song in the game
 * plays three to six drums, so every desk carried two to five rows of nothing — and
 * docked in the Notes panel those would be rows of empty timeline the width of the
 * song. The way to a drum a song lacks is the `+`, which offers them by name.
 *
 * The desk's order verbatim, because `kitLanes` is handed over precisely so this reads
 * as the same track list as the arrangement above it rather than a second opinion about
 * the kit — and the two lists disagree about where `rim` sits.
 *
 * `current` is what keeps it steady. Painting the first snare note must not move its
 * row under the pointer that clicked it, and — now that a row can leave — nor may
 * erasing a lane's last note take the row away from the pointer that emptied it. Added
 * sounds likewise stay where they arrived; deleting the channel is the only edit that
 * removes one. A new song is the context boundary that deliberately starts afresh.
 */
export function drumRowOrder(active, current = null) {
  const order = Array.isArray(active) ? active : [];
  const wanted = order.filter((key) => DRUM_LANES.includes(baseLane(key)));
  if (!current) return wanted;
  // A canonical row stays while the panel is up even once its last note is gone — that
  // is the erase-under-the-pointer case, and `unused` is how it says so. A row that has
  // to leave because its CHANNEL was deleted is a different event, and the desk says so
  // by forgetting the order (see `forgetRows`) rather than by this rule guessing which
  // of the two an absent lane is.
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
  // A whole kit of sounds at once — see KITS. The panel offers the list and the desk
  // performs the edit: a grid writes notes and never touches a mix.
  applyKit = null,
  // The desk's context menu, so the pattern lists look like every other list on it.
  menu, onClose = () => {},

  // ---- which of the two this is ----------------------------------------------------
  //
  // THE WINDOW: the bars you selected, a shared-editing switch, its own header and
  // handle, `Channel rack` down the side. It belongs to the song and floats over the
  // desk, because "move the snare while I am looking at the bassline" is one job.
  //
  // DOCKED: the same kit in the Notes panel, where a pitched channel has its roll. The
  // whole song, one bar per click, no switch, controls in the ruler's corner and track
  // names in the column the keyboard has next door. A percussion channel used to empty
  // that panel; this is what goes in it.
  //
  // One factory and not two files: the house figures, the kits, the row order and the
  // three lines that make a cell a boolean are THE KIT, and there must be one of each.
  // What differs is these flags.
  ns = 'stepseq', docked = false, wholeSong = false, scopeToggle = true,
  rulerLabel = 'Channel rack', headerHost = null,
  // (kind) => { from, to } | null — the desk turning "the bar being played" / "the bars
  // I select" / "the whole song" into actual bars. Only the desk knows the transport and
  // the selection; `null` is the grid's word for the whole of what is shown.
  applyBars = null,
  // The desk's bar selection, drawn on the ruler and changed from it.
  selectedBars = null, onSelectBars = null,
  // In the window a track name is an arrangement mute over the bars on screen. Docked,
  // the bars on screen are the whole song and that reading is gone — so there the name
  // selects the channel, and the mute moves into the row's own menu where it can say
  // which bars it means.
  onPickLane = null, currentLane = () => null,
}) {
  // The rows as last drawn. Reset when the panel closes, when the song changes, and
  // when the desk says the lane set really has changed — see `forgetRows`.
  let kitOrder = null;
  const kit = () => (kitOrder = drumRowOrder(kitLanes(), kitOrder));
  const inSong = (lane) => kitLanes().includes(lane);

  const grid = createBarGrid({
    el, Audio, bank, editBank, draft, sel, apply, engineBank, laneLabel,
    ns,
    // The window has no `headerHost`: its controls go in its own header, with the title,
    // the ✕ and the handle. Docked, they go in a strip of their own above the field —
    // the panel's header row survives a fold and these must not, and a column of track
    // names has no blank half to hold them the way the roll's keyboard does.
    docked, wholeSong, scopeToggle, headerHost, selectedBars, onSelectBars,
    actionRange: applyBars ? () => applyBars(figureScope) : null,
    // Rows are tracks and there are a handful, so the vertical window is never the
    // expensive one. The horizontal window is: `colWindow` needs `virtual` before it
    // will draw a sixty-bar song a screenful of bars at a time.
    virtual: docked, rowHeight: docked ? 29 : 0,
    onClose: () => { kitOrder = null; onClose(); },

    // A drum row IS its lane: one line per piece of the kit, which is the channel
    // rack every drum machine has had since the 808.
    rows: () => kit().map((lane) => ({
      key: lane,
      lane,
      label: laneLabel(lane),
      colour: laneColour(lane),
      unused: !inSong(lane),
      // Which channel the desk is pointed at. Only where a name click means selection:
      // in the window nothing here chooses a channel, so nothing here should claim to.
      className: onPickLane && lane === currentLane() ? 'current' : '',
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

    // The `+` sits first, where the arrangement's own add control is. Then what a click
    // adds: the sounds, the steps, and — where the panel shows more than it acts on —
    // how far a figure reaches and whether it replaces or adds. Same set either way; the
    // window's go in its own header beside the title, the docked kit's in its strip.
    lead: () => [addButton()],
    headerExtra: () => [kitButton(), grooveButton(), ...(docked ? [scopeButton()] : []), modeButton()],

    // The same header cell the arrangement rows carry: number, then name, so the two
    // lists read as one list. The button is NOT the strip's mute — it drops the lane
    // out of these bars, which is an arrangement decision — so it is spelled out in
    // the title rather than borrowed from the channel.
    rowHeader: (row, c) => {
      const muted = grid.mutedIn(c.action.from, row.lane);
      const num = document.createElement('span');
      num.className = 'ssqnum';
      num.textContent = String(laneNumber(row.lane) ?? '');
      const led = document.createElement('span');
      led.className = 'ssqled';
      led.setAttribute('aria-hidden', 'true');
      const name = document.createElement('button');
      name.className = 'ssqname' + (row.unused ? ' unused' : '') + (muted ? ' muted' : '');
      name.textContent = row.label;
      if (onPickLane) {
        // The name IS the preset — every channel on this desk is named by the sound it
        // plays — so clicking it does what clicking a preset anywhere else does: it puts
        // the desk on that drum and opens the library at it. One click for both, because
        // on a kit they are the same intent: this is the drum I am working on, and this
        // is the sound I want it to make.
        name.title = `${row.label} — click to put the desk on this drum and change its sound`;
        name.onclick = (ev) => onPickLane(row.lane, ev.currentTarget);
      } else {
        name.title = muted
          ? `${row.label} is silenced in ${c.barSpan} by the arrangement — the steps are`
            + ' still there. Click to let it back in.'
          : `Click to silence ${row.label} in ${c.barSpan} without touching its steps`;
        name.onclick = () => grid.toggleMute(row.lane);
      }
      // The lane's own figures. A button as well as a right-click, because a menu that
      // only exists on right-click is a menu most people never find — and the right-
      // click is on the whole row, so it works from the cells too.
      const pick = document.createElement('button');
      pick.className = 'ssqpick';
      pick.textContent = '▾';
      pick.title = `Rhythms for ${row.label} — laid down across ${c.actionSpan}`;
      pick.onclick = (ev) => laneMenu(ev, row.lane);
      return [num, led, name, pick];
    },
  });
  grid.setRulerLabel(rulerLabel);

  /** The `+`, where the arrangement's own add control is: before everything else. */
  function addButton() {
    const add = document.createElement('button');
    add.className = 'ssqx ssqadd';
    add.textContent = '+';
    add.title = 'Add a drum this song has not got, or a new percussion track';
    add.setAttribute('aria-label', 'Add instrument');
    add.onclick = (ev) => { ev.stopPropagation(); addInstrument(ev.currentTarget); };
    return add;
  }

  /** The sounds. Beside the steps, because they are the two halves of one question. */
  function kitButton() {
    const btn = document.createElement('button');
    btn.className = 'ssqlink';
    btn.textContent = 'Kit ▾';
    btn.title = 'Put a whole kit of sounds on this song — the drums it has are re-voiced'
      + ' and the ones it has not are added. The steps are left exactly as they are.';
    btn.onclick = kitVoiceMenu;
    return btn;
  }

  /**
   * How far a figure reaches.
   *
   * A control rather than a rule, and a visible one rather than a line inside the menu
   * it governs: it is the answer to "what is that click about to change", and reading
   * that off the panel before clicking is the whole point of it. A figure is one bar
   * long and this field is the song, so the question is unavoidable — the only choice is
   * whether the panel asks it out loud.
   */
  function scopeButton() {
    const btn = document.createElement('button');
    btn.className = 'ssqlink';
    const at = SCOPES.find(([id]) => id === figureScope) || SCOPES[0];
    btn.textContent = `Apply to: ${at[1]} ▾`;
    btn.title = 'Which bars a figure, a groove or a mute is written into';
    btn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      menu(ev.clientX, ev.clientY, 'Apply to', SCOPES.map(([id, label]) => ({
        label: id === figureScope ? `${label}  ✓` : label,
        run: () => { setFigureScope(id); grid.refresh(); },
      })));
    };
    return btn;
  }

  /**
   * And what it does to what is already there.
   *
   * The difference is entirely in a figure's RESTS: replacing writes them, adding
   * ignores them. So "on 2 and 4" then "fill" is a backbeat with a fill in it one way
   * and a bare fill the other. A toggle rather than a menu — there are two answers, and
   * the button says which one is loaded.
   */
  function modeButton() {
    const btn = document.createElement('button');
    btn.className = 'ssqlink' + (figureAdds ? ' on' : '');
    btn.textContent = figureAdds ? 'Add' : 'Replace';
    btn.setAttribute('aria-pressed', figureAdds ? 'true' : 'false');
    btn.title = figureAdds
      ? 'A figure keeps what the row already plays and adds its own hits. Click for'
        + ' replace, where the figure is the whole bar — rests and all.'
      : 'A figure replaces what the row plays, rests and all. Click for add, where only'
        + ' its hits are written and what is there is kept.';
    btn.onclick = (ev) => {
      ev.stopPropagation();
      setFigureAdds(!figureAdds);
      grid.refresh();
    };
    return btn;
  }

  /** And the steps. */
  function grooveButton() {
    const btn = document.createElement('button');
    btn.className = 'ssqlink';
    btn.textContent = 'Apply groove ▾';
    btn.title = 'Lay a whole groove down across these bars — every drum lane at once';
    btn.onclick = grooveMenu;
    return btn;
  }

  /** Whole kits of sounds — see KITS. The desk performs it; this only offers the list. */
  function kitVoiceMenu(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!applyKit) return;
    menu(ev.clientX, ev.clientY, 'Kit', KITS.map(([label, voices]) => ({
      label, run: () => applyKit(label, voices),
    })));
  }

  /** The figures this lane plays, plus the two — or three — that every lane does. */
  function laneMenu(ev, lane) {
    ev.preventDefault();
    ev.stopPropagation();
    const span = grid.actionSpan();
    const items = FIGURES.map(([label, s]) => ({
      label, run: () => grid.layDown({ [lane]: P(s) }, { add: figureAdds }),
    }));
    items.push({ label: `Clear ${laneLabel(lane)}`, run: () => grid.layDown({ [lane]: P(OFF16) }) });
    // The mute, where the name button no longer is. Spelled out with its bars, because
    // here it is one item in a list rather than the thing under your finger.
    if (onPickLane) {
      const off = grid.mutedIn(grid.action.from, lane);
      items.push({
        label: off ? `Let ${laneLabel(lane)} back into ${span}`
          : `Silence ${laneLabel(lane)} in ${span}`,
        run: () => grid.toggleMute(lane),
      });
    }
    menu(ev.clientX, ev.clientY, `${laneLabel(lane)} · ${span}`, items);
  }

  /** A whole groove at once, under the same two settings a single figure obeys. */
  function grooveMenu(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const span = grid.actionSpan();
    // Every drum lane the song HAS, including the ones the groove leaves out: a house
    // bar with last week's rim still in it is not the groove that was offered. It can no
    // longer bring a drum in that the song has not got — that is what the `+` is for.
    const spread = (figures) => Object.fromEntries(kit().map((k) => {
      const base = baseLane(k);
      // An added sound takes the groove's figure for the drum it came from, but only
      // where that drum has no row of its own: a song with both `clap` and `clap2` wants
      // the claps on the clap, not doubled.
      const mine = figures[k] ?? (base !== k && kit().includes(base) ? OFF16 : figures[base]);
      return [k, P(mine || OFF16)];
    }));
    const items = GROOVES.map(([label, figures]) => ({
      label, run: () => grid.layDown(spread(figures), { add: figureAdds }),
    }));
    // Clear is the one thing that cannot be additive: adding nothing to a bar is not an
    // edit, and it is what the mode is switched off FOR.
    items.push({ label: `Clear the kit in ${span}`, run: () => grid.layDown(spread({})) });
    menu(ev.clientX, ev.clientY, `Kit · ${span}`, items);
  }

  return {
    open: grid.open,
    close: grid.close,
    isOpen: grid.isOpen,
    refresh: grid.refresh,
    follow: grid.follow,
    focusRange: grid.focusRange,
    armFollow: grid.armFollow,
    songChanged() { kitOrder = null; grid.songChanged(); },
    /**
     * The lane set really has changed — a track was added or deleted.
     *
     * Not the same event as a lane falling silent, which is why the desk has to say it.
     * A row whose last note you just erased stays where it is, drawn `unused`; a row
     * whose CHANNEL is gone has to go, and this is what lets `drumRowOrder` tell the
     * two apart without guessing from an absent lane.
     */
    forgetRows() { kitOrder = null; },
  };
}
