// The desk's vertical budget — every minimum, every automatic target, and the four
// handles that argue with them.
//
// Lifted out of mixer-entry.js whole, and deliberately at the same column: its own
// header already said it existed to be the one place these numbers live, and it had
// simply never left the file. What it does is measure the window, plan a height for
// each region, apply that plan, fit the strips inside it, and schedule the whole pass
// off a frame — plus the splitter, arrangement, device and effects drag gestures, which
// are the same arithmetic driven by a pointer.
//
// It is a layout engine, so it reads a lot of the desk and calls back into it. Both
// directions go through `installDeskLayout` rather than through the file's shared
// scope: what it needs to KNOW arrives as values and thunks, what it needs to DO
// arrives as the desk's own functions, and what the desk calls it exports by name.
//
// A seam of assignments rather than a factory closure, because this is a singleton —
// there is one desk — and because wrapping 1,200 lines in a function would indent every
// one of them, which is a diff nobody can read over a change that is not there.
//
// Three pieces of state that used to live here went home instead of travelling:
// `fxDockSide` and `FX_SIDE_KEY` belong to the device panel that writes them, and
// `autoDevH` is written by reserveDevices. One line of each was here and the rest were
// four hundred lines away beside their owner.

const $ = (id) => document.getElementById(id);

// ---- the seam ---------------------------------------------------------------
// Assigned once by installDeskLayout, before anything below is called. The three
// thunks are values the desk reassigns, so they are asked for rather than captured;
// `deferRollResize` is the only thing this ever says to the piano roll, so the roll
// itself never has to be handed over.
let notesOpen, selectedLane, isPartHidden, rearrangePanelOpen, autoDevH, STRIP_PARTS,
  clamp, toast, deferRollResize, setNotesFolded, setDevicesFolded, setMixerFolded,
  setArrangeCollapsed, beginPlaybackVisualHold, endPlaybackVisualHold,
  forgetArrangementGeometry, reserveDevices, syncMixerScroll, updateArrangementNoteScale,
  rememberSongLayout;

/**
 * Hand the budget the desk. Must be called before the first frame — everything below
 * runs off a requestAnimationFrame or a pointer, so installing during the desk's own
 * synchronous boot is early enough.
 */
export function installDeskLayout(deps) {
  ({
    notesOpen, selectedLane, isPartHidden, rearrangePanelOpen, autoDevH, STRIP_PARTS,
    clamp, toast, deferRollResize, setNotesFolded, setDevicesFolded, setMixerFolded,
    setArrangeCollapsed, beginPlaybackVisualHold, endPlaybackVisualHold,
    forgetArrangementGeometry, reserveDevices, syncMixerScroll, updateArrangementNoteScale,
    rememberSongLayout,
  } = deps);
  // Deferred to here for the same reason the seam exists: it wants applyWorkRatio and
  // a desk fit, and neither means anything until the desk is on the other end.
  writeWorkRatio(upperWorkRatio, false);
}

// ---- the desk's vertical budget, in one place --------------------------------
// Every minimum and every automatic target the layout uses. They used to be six
// numbers spread across five functions — a 48 in the fader, a 140 in the --striph
// floor, a 96 in the effects panel, an 8 called a floor in the arrangement, and two
// ceiling expressions that disagreed with each other about what the effects panel
// was allowed to take. Anything that wants to know how small a region may be asks
// here, and there is one answer.

// The fader is the desk's shock absorber. In a short window it gives up height so
// the EQ and send rows above it stay on screen — they are read constantly while
// balancing, where the fader is a grip you can still hit, with an exact dB readout
// under it either way. Given room it takes all of it — there is no cap, so the
// strips always fill the rack exactly and a tall window ends up with long faders
// rather than a band of empty desk under short ones.
//
// A comfortable height rather than a floor: this is the fader the rack ASKS for when
// it is deciding how much of the window to want (see rackWant), and it is also the
// number the shrink ladder BARGAINS with — a rung is worth standing on only if the
// fader and its meter come out of it at a height you can still read and still grab.
//
// This number is what the ladder is FOR, and it is a bar with a cliff under it: a rung
// that misses it by a pixel loses a whole block, and the block it loses hands back thirty
// to sixty pixels of fader at once. So it wants to sit where a fader stops being worth
// having, and NOT a pixel higher — every pixel above that is a block shed for a fader
// that was already long enough.
//
// Both edges of that have been walked into. At 48 a rung counted as fitting whenever the
// fader could still be hit with a mouse, and a laptop window sat for a wide band of
// heights showing three EQ bands and two sends over 80px of travel — every row legible
// except the one control being held. At 120 the desk shed the sends off a rack whose
// next rung down was 115px, five short of the bar, and paid for it with a 179px fader
// nobody asked for. A hundred is under the first and over the second: a fader you can
// still ride, with the blocks kept until it genuinely is not one.
//
// The rows are read; the fader is used. Only the last rung, with nothing left to trade,
// goes below this — see FADER_FLOOR.
const FADER_MIN = 100;
// Two numbers rather than one, because the last rung has nothing left to shed: with
// the inserts, the sends and the EQ all gone there is no block left to trade, so the
// fader takes the rest of the squeeze itself and this is where it stops. Only that
// rung ever sees it — every rung above it hands a block back instead, which is the
// whole point of the ladder. A fader is still a fader at this height.
//
// It used to be what the ladder bargained with too, on the argument that compressing
// the fader another fourteen pixels was worth one more block. It is not: it bought a
// wide band of every window height where the strip showed three EQ bands, two sends
// and the insert slots over a fader and a meter squeezed to nothing — which is the
// one control on the strip you are actually holding while you mix. The cliff at each
// rung (shed a block, hand the freed height straight to the fader) is the same size
// either way, because the rungs are cumulative; all the lower number changed was how
// small the fader got before the cliff.
const FADER_FLOOR = 34;
// The arrangement's automatic answer. Eight lanes is enough to read a song's shape
// and the rest is a scroll. It is a TARGET, not a floor: the floor is one lane, and
// calling the eight a floor is most of why this used to be hard to reason about.
// Read from the shell rather than written here twice: the CSS cap on #arrange is the
// same eight, and the two being separate numbers is a bug waiting for the day one of
// them is changed.
const ARR_AUTO_LANES = () => {
  const n = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--arrmax-lanes'));
  return Number.isFinite(n) && n >= 1 ? n : 8;
};
// The effects panel below its own header: enough for one card's controls. Below it
// the panel is a title bar with a sliver under it, which tells you nothing and
// still costs the height.
const DEV_MIN_EXTRA = 48;
// And the least the same panel may be while it is showing the piano roll instead:
// about eight keys under the scope, which is a hand's worth of range. A roll is a
// much taller thing than a rack of cards, and one floor cannot serve both.
const DEV_MIN_ROLL = 8 * 29;
/**
 * The rack's own vertical chrome: its padding, plus whatever the horizontal
 * scrollbar takes at the bottom. Measured, because `scrollbar-gutter: stable`
 * reserves that space whether or not the bar is showing — assuming 20px left six
 * pixels unaccounted for, which was enough to put a vertical scrollbar down the rack
 * and cut the padding under the strips.
 */
/**
 * The room the strips actually stand in: #rack's content box. Everything the rack's
 * own chrome takes — its padding, the horizontal scroll rail below it, the wrapper's
 * border — is already off it by construction, which is what rackPad() has to
 * reconstruct from the outside.
 */
function rackInner() {
  const rack = $('rack');
  if (!rack) return 0;
  return Math.max(0, rack.clientHeight - px(rack, 'paddingTop') - px(rack, 'paddingBottom'));
}

function rackPad() {
  const rack = $('rack');
  if (!rack) return 20;
  const wrap = $('rackwrap');
  return px(rack, 'paddingTop') + px(rack, 'paddingBottom')
    + (rack.offsetHeight - rack.clientHeight)
    + h($('mixscroll')) + px($('mixscroll'), 'marginTop')
    // And the wrapper's own border, which is the one piece of the rack's chrome that is
    // not inside it. A pixel, and it was the pixel between "the strip fills the rack"
    // and "the strip is one taller than the rack it is in" — see rackInner(), which has
    // to reconstruct none of this.
    + (wrap ? wrap.offsetHeight - wrap.clientHeight : 0);
}

const h = (el) => (el ? el.getBoundingClientRect().height : 0);
const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;

/**
 * Every pixel #desk has to divide between its four regions:
 * the window, less the things that live outside the desk and are never
 * negotiated with.
 *
 * Note what is NOT in here: the effects panel is allocated by planDesk, not treated as
 * page chrome. Its natural or dragged height is subtracted there alongside the other
 * desk regions, while every border hit area remains layout-free.
 */
const deskPool = () => innerHeight
  - h(document.querySelector('header')) - h($('timeline'))
  - h(document.querySelector('footer')) - h($('err'));

// The window height the remembered panel sizes were dragged on. The sizes themselves
// are absolute pixels — coming back to the desk you left is the whole point of keeping
// them — but a height set on a tall display would swallow a laptop screen whole. A
// shorter window scales them all by the ratio the desk itself shrank by, so the panels
// keep their proportions, and the STORED numbers are left alone: plug the big screen
// back in and you get the desk you set up on it, not the squeezed version.
const DESK_VH_KEY = 'mash-mixer-deskvh';
const storedDeskVh = Number(localStorage.getItem(DESK_VH_KEY));
const deskScale = Number.isFinite(storedDeskVh) && storedDeskVh > 200
  ? Math.min(1, innerHeight / storedDeskVh)
  : 1;
// Clamped on the way in: a stale or nonsense height (drag hard upwards and it goes
// negative) would otherwise pin a panel shut on every load with no way to tell why.
const restoredDeskH = (value, floor) => (Number.isFinite(value) && value > floor
  ? Math.round(value * deskScale)
  : null);

// A height the user dragged the Notes border to, which beats the automatic fit until
// they double-click it away. Kept across reloads: it is a preference about this
// screen, not about the mix.
const ARR_KEY = 'mash-mixer-arrh';
const storedArrH = Number(localStorage.getItem(ARR_KEY));
let userArrH = restoredDeskH(storedArrH, 40);
// A one-lane height can be useful while actively dragging, but restoring one on the
// next load looks exactly like the arrangement has lost its other instruments. Keep
// that temporary squeeze for the current session; stale one-lane preferences fall
// back to automatic fitting once the rows have been built.
let restoredArrH = userArrH != null;

// A height the user dragged the Notes border to. Like the arrangement height, this
// is a preference about the desk rather than a mix edit, so it lives outside the song
// draft and returns on the next visit. Double-clicking the border clears it and lets
// the measured roll height take over again. DEV_KEY remains the persisted key for
// compatibility with existing mixer sessions.
const DEV_KEY = 'mash-mixer-devh';
const storedDevH = Number(localStorage.getItem(DEV_KEY));
let userDevH = restoredDeskH(storedDevH, 40);
const clampDeviceH = (value, max = notesRoom()) => clamp(value, MIN.notes(), max);

// Effects has its own remembered height. This is the panel's content room below
// its header, kept separate from DEV_KEY, which belongs to Notes.
const FX_KEY = 'mash-mixer-fxh';
const storedFxH = Number(localStorage.getItem(FX_KEY));
let userFxH = restoredDeskH(storedFxH, DEV_MIN_EXTRA);

// The FX inspector is a piece of desk furniture rather than song state. Keep its side
// beside its remembered height, so reopening the mixer does not make the hand hunt for
// a control that was deliberately moved to the other edge.

/**
 * Write the three dragged panel heights and the window they belong to.
 *
 * All three together, never one on its own: the window stamp is what the next load
 * scales them by, so a single height written on a laptop would leave the other two
 * claiming to have been chosen there too, at their full desktop size.
 *
 * Called when a gesture ENDS, not while it runs — the drag handlers move these values
 * every frame, and localStorage is not a place to put a frame loop.
 */
function rememberDeskHeights() {
  const set = (key, value) => (value == null
    ? localStorage.removeItem(key)
    : localStorage.setItem(key, String(Math.round(value))));
  set(ARR_KEY, userArrH);
  set(DEV_KEY, userDevH);
  set(FX_KEY, userFxH);
  localStorage.setItem(DESK_VH_KEY, String(Math.round(innerHeight)));
}

// The arrangement's height is its header, its landing, the panel rule, and a whole
// number of row stacks. Every term is MEASURED off the live elements, so changing
// --arrrow, --arrgap, --arrgrid-pad or the header's control size in the shell moves
// the snap with it and nothing here needs touching.
//
// The gap belongs to the stack: leaving it out makes the last visible row spill below
// a snapped height. There is no trailing gap, so N rows carry N-1 of them.
const laneRowHeight = () => {
  const row = document.querySelector('.arrrow');
  if (row) return h(row);
  const arrange = $('arrange');
  const css = arrange ? Number.parseFloat(getComputedStyle(arrange).getPropertyValue('--arrrow')) : NaN;
  return Number.isFinite(css) ? css : 0;
};
const laneRowGap = () => px($('arrgrid'), 'rowGap');
const laneStackHeight = (count) => count * laneRowHeight()
  + Math.max(0, count - 1) * laneRowGap();
// The landing under the last visible row. It is #arrange's padding, NOT #arrgrid's:
// inside the scroller it is scroll content, which is only under the last row when you
// happen to be scrolled to the bottom — every other scroll position spent it on the
// gap and the top few pixels of the next lane, so a panel that had snapped correctly
// still showed a sliver of a row it had not made room for.
const laneLanding = () => px($('arrange'), 'paddingBottom');
const arrangeChrome = () => h($('arrhead')) + laneLanding()
  + px($('arrange'), 'borderBottomWidth');
const laneCount = () => document.querySelectorAll('.arrrow').length || 1;
/**
 * How many whole lanes fit in `px` of arrangement. Below one is a fold, not a row.
 *
 * The epsilon is load-bearing. Heights come from getBoundingClientRect and are
 * fractional, so a request built as "the header plus an eight-row stack" divides back
 * out to 7.99999… and Math.floor hands back seven — the automatic fit was one row short
 * of what it had just asked for, on every window tall enough to grant it.
 */
const lanesIn = (px, round = Math.round) => {
  const row = laneRowHeight();
  const gap = laneRowGap();
  const body = px - arrangeChrome();
  return round((body + gap) / (row + gap) + 1e-6);
};
/**
 * The nearest height that shows whole lanes, at least one. Rounding to the NEAREST is
 * right under the hand on the border — half a lane either way should settle on the
 * one you meant. It is wrong against a ceiling: rounding up there hands the rack back
 * a few pixels it was promised, and a strip four pixels short scrolls its last send
 * row out of sight. So the automatic fit passes Math.floor.
 */
const arrangeSnap = (px, round = Math.round) => arrangeChrome()
  + laneStackHeight(clamp(lanesIn(px, round), 1, laneCount()));

/**
 * And the most it can use: every lane at once. The scroller's content is now exactly
 * the row stacks — the landing lives outside it — so its scrollHeight adds straight
 * onto the chrome.
 */
function arrangementWants() {
  const arrange = $('arrange');
  if (arrange.classList.contains('collapsed')) return h(arrange);
  return arrangeChrome() + $('arrgrid').scrollHeight;
}

/**
 * Keep the selected lane inside the arrangement's window while the panel is resized.
 *
 * The scroller holds its scrollTop as the panel shrinks, so the lanes that drop out of
 * sight are the ones nearest the border under the hand — and the lane being worked on
 * is as likely to be one of them as any other. Scroll by the least that puts it back:
 * down when it has fallen off the bottom, up when it sits above the top. A folded panel
 * has nothing to keep visible, and neither has a selection with no row of its own,
 * which is what the master is.
 *
 * The offsets come from the lane's INDEX, not its rect: every row is one fixed height
 * with one fixed gap between, the same two numbers arrangeSnap is written off, and
 * nothing but rows goes into the scroller. A rect would measure from #arrange — the
 * nearest positioned ancestor — and so would carry the header along with it.
 */
function keepSelectedLaneVisible() {
  const grid = $('arrgrid');
  if (!grid || $('arrange').classList.contains('collapsed')) return;
  const index = [...grid.querySelectorAll('.arrrow')]
    .findIndex((el) => el.classList.contains('sel'));
  if (index < 0) return;
  const row = laneRowHeight();
  const view = grid.clientHeight;
  if (!(row > 0) || view <= 0) return;
  const top = index * (row + laneRowGap());
  const bottom = top + row;
  // Below the window: bring its bottom edge in, but never far enough to push its top
  // out — a window too short for a whole row shows the top of the lane, not its feet.
  if (bottom > grid.scrollTop + view) grid.scrollTop = Math.min(bottom - view, top);
  else if (top < grid.scrollTop) grid.scrollTop = top;
}

/**
 * Make the arrangement follow the channel selection in both state and position.
 *
 * Selection can happen before its rows exist (notably buildRack during song load), so
 * buildArrangement calls this again after creating them. The caller chooses whether to
 * reveal it: a channel click and a restored piano-roll track do; an unrelated rebuild
 * only restores the selected mark and preserves the user's manual arrangement scroll.
 */
function syncArrangementLaneSelection({ reveal = false } = {}) {
  for (const el of document.querySelectorAll('.arrrow')) {
    const selected = el.dataset.lane === selectedLane();
    el.classList.toggle('sel', selected);
    el.setAttribute('aria-selected', selected ? 'true' : 'false');
  }
  if (reveal) keepSelectedLaneVisible();
}

// Asked for by a gesture that changes the arrangement's height, spent by the fit that
// gesture scheduled: the lane can only be scrolled back into view once applyDesk has
// written the new height, and that lands a frame later.
let keepLanePending = false;

/**
 * What the strip body needs when nothing is squeezing it. Measured by taking the
 * body out of the flex layout for one frame rather than by adding up rows: the rows
 * carry margins as well as the container's gap and padding, and summing the pieces
 * by hand quietly lost the margins — which cost the last send row its slider.
 */
function naturalHeight(body) {
  const was = body.style.flex;
  body.style.flex = '0 0 auto';
  const natural = body.scrollHeight;
  body.style.flex = was;
  return natural;
}

/**
 * Everything in a strip whose height does not move with the fader — the pan, the
 * buttons and the readout are all fixed, so the fader is the only variable left.
 *
 * Measured across EVERY strip, not off the first one: the insert buttons live in the
 * foot, so a channel with five effects on it stands a hundred pixels taller in the
 * fixed parts than a channel with none. Sizing the rack from the first strip gave the
 * busy ones a body too short for their own rows, and the body scrolls without a
 * scrollbar — so the EQ and sends simply vanished off the bottom.
 *
 * Rounded up: a strip half a pixel short scrolls the last send row's slider out of
 * view, which is the whole thing this is here to prevent.
 */
/**
 * The rack's shrink ladder, in the order the blocks go. Inserts first — they are the
 * one block you set once and then leave alone. Sends next. EQ last, because it is the
 * one you are most likely to be reaching for while the window is small. Below the
 * bottom of this list is the strip you balance on: name, type, fader, dB, pan and
 * mute/solo, with nothing left to take.
 *
 * The same three blocks the header switches hide, hidden the same way — see the
 * #rackwrap.shed-* rules. A DIFFERENT set of classes from the switches, so growing
 * the window back restores exactly what is ticked and nothing more.
 */
const SHED_ORDER = ['effects', 'sends', 'eq'];
/**
 * And the one block outside that order: the master's insert chain, which the three
 * above leave alone on purpose — it is the copy that outlives every other strip's.
 * It is not a rung, because shedding it saves nobody but the master any height; it is
 * the last thing on the desk to go, once the ladder has shed every block it has and the
 * window still cannot pay for it — and then whole, so that it is never half-shown behind
 * a hidden scrollbar. See the #masterslot rules and sizeStrips.
 */
const MASTER_FX_SHED = 'shed-masterfx';
// One id space with the switches, and the class derived from theirs rather than
// spelled again: the insert block is `effects` to a switch and `fx` to a stylesheet,
// and writing that mapping down twice is how the two sets drift apart.
const shedClass = (id) => STRIP_PARTS.find((p) => p.id === id).cls.replace('no-', 'shed-');

/**
 * Measure the rack `n` blocks into the ladder, rather than wherever it happens to be
 * standing. Every number the fit is steered by has to be independent of the rung it
 * is currently on, or the fit stops being a function of the window and starts being a
 * function of its own last answer — which is a latch, and a short window once meant a
 * short window forever.
 *
 * `measuring` also lifts --striph off .strip and --bodyh off .stripbody,
 * both of which are given a height explicitly and would otherwise answer the question
 * with the previous answer — the body worst of all, since a body held at last rung's
 * height reports that height back and --bodyh would only ever climb. The fader is
 * pinned for the same reason: left live, a strip measures taller on a tall window than
 * on a short one and the rack's floor ratchets up as the window grows.
 */
function atShed(n, fn) {
  const wrap = $('rackwrap');
  // MASTER_FX_SHED with them: the question this pass answers is how tall the master's
  // chain is, and asking it with the chain already hidden answers zero — which puts it
  // back, which hides it again on the next pass.
  const had = [...SHED_ORDER.map(shedClass), MASTER_FX_SHED]
    .filter((c) => wrap.classList.contains(c));
  wrap.classList.remove(...SHED_ORDER.map(shedClass), MASTER_FX_SHED);
  wrap.classList.add(...SHED_ORDER.slice(0, n).map(shedClass), 'measuring');
  wrap.style.setProperty('--faderh', `${FADER_FLOOR}px`);
  try {
    return fn();
  } finally {
    wrap.style.removeProperty('--faderh');
    wrap.classList.remove('measuring', ...SHED_ORDER.map(shedClass), MASTER_FX_SHED);
    wrap.classList.add(...had);
  }
}

/**
 * Two numbers from one pass, `n` blocks into the ladder: the body height every strip
 * is held to at this rung, and everything in a strip whose height does not move with
 * the fader — header, body, inserts, readout, pan and buttons are all fixed, so the
 * fader is the only variable left.
 *
 * The MAX of the bodies, not each strip's own — that is what --bodyh is: the rack
 * reserves the tallest body on every strip, so a master with nothing in its body and a
 * channel with three EQ rows and two sends start their faders on the same line.
 *
 * The rest is a max across EVERY strip too, not off the first one: the insert buttons
 * live in the foot, so a channel with five effects on it stands a hundred pixels taller
 * in the fixed parts than a channel with none, and sizing the rack from the first strip
 * gave the busy ones a body too short for their own rows. The two maxes are added
 * rather than the per-strip sums maxed: the tallest body and the tallest foot need not
 * start out on the same strip, and after --bodyh they are on every strip.
 *
 * Rounded up: a strip half a pixel short cuts the last row it is showing.
 */
function measureRungAt(n) {
  return atShed(n, () => {
    let body = 0, rest = 0, master = 0, send = 0;
    for (const s of document.querySelectorAll('.strip')) {
      const b = s.querySelector('.stripbody');
      if (!b) continue;
      // The master's body is measured APART from the others, and it is not folded back
      // in anywhere: the master strip sizes itself. The band is what the CHANNELS and
      // the returns need for the rows they are showing, and the master's number is what
      // its own strip needs for its own chain — two independent questions, answered
      // separately below. Its body is `height: auto` in the stylesheet, so what it does
      // not spend on its chain goes to its own fader rather than standing as a band.
      if (s.classList.contains('master')) master = naturalHeight(b);
      // A RETURN IS THE SAME EXCEPTION AS THE MASTER, for the same reason: it carries a
      // thing no channel has — the device summary that says what the return IS — and
      // with the send rows switched off that made the two returns the tallest bodies on
      // the desk. The band is held on every strip, so sixteen channels each carried an
      // empty row the size of the returns' summary between their chain and their fader.
      // The band is what a CHANNEL needs; a strip carrying more than that keeps its own
      // body and pays for it out of its own fader.
      else if (s.classList.contains('send')) send = Math.max(send, naturalHeight(b));
      else body = Math.max(body, naturalHeight(b));
      // Each strip's own fader comes out of its own total — that is the part this is
      // solving for, and a strip without one has none to subtract.
      rest = Math.max(rest, px(s, 'paddingTop') + px(s, 'paddingBottom')
        + h(s.querySelector('.striphead'))
        + h(s.querySelector('.stripfoot')) - h(s.querySelector('.faderwrap')));
    }
    return {
      // The band: what a channel strip needs for the rows it is showing.
      body: Math.ceil(body),
      master: Math.ceil(master),
      // What the ladder bargains with — the TALLEST strip that has to keep a fader worth
      // having, which is the returns whenever their summary row outweighs the send rows a
      // channel is showing. Bargaining with the band alone would leave a return's fader
      // short by exactly the difference; nothing about it is sheddable, so the room has to
      // be found before the rung is chosen rather than after.
      chrome: Math.ceil(Math.max(body, send) + rest) + 2,
      // And what the MASTER strip needs around its own, which is a different number
      // because its body holds a different thing. Its chain IS sheddable — see masterShed.
      masterChrome: Math.ceil(master + rest) + 2,
    };
  });
}

/**
 * The four rungs, cached: chrome and body height, one pair per rung of the ladder.
 * Measuring all of them costs four passes over the rack, so it is done once and thrown
 * away by forgetStripMetrics() when something that could move them moves — a rack
 * rebuild, a typeface change, or a part switch, since a block you have already hidden
 * by hand has no height for the ladder to save by hiding it again.
 */
let chromeRungs = null;
const forgetStripMetrics = () => { chromeRungs = null; };
function stripRungAt(n) {
  if (!chromeRungs) {
    // Asked before the first buildRack — applyFont() and reserveDevices() both run at
    // load. Plausible numbers rather than a throw; the real ones arrive with the first
    // fit after the rack exists, and forgetStripMetrics() is what fetches them.
    // These are only a pre-build safety estimate. Keep them aligned with the current
    // selector-free strip: the preset now lives in the header and adds no body row.
    // No body number to guess at: nothing is on screen for --bodyh to hold level, and
    // the first real fit writes it before a strip exists to read it.
    if (!document.querySelector('.strip[data-lane]')) {
      const guess = [230, 190, 150, 110][n];
      return { chrome: guess, masterChrome: guess, body: 0, master: 0, send: 0 };
    }
    chromeRungs = SHED_ORDER.map((_, i) => measureRungAt(i));
    chromeRungs.push(measureRungAt(SHED_ORDER.length));
  }
  return chromeRungs[n];
}
// What a CHANNEL strip needs at rung `n`. The master is not in it: it sizes itself, so
// its chain is never a reason to take a block off sixteen other strips.
const stripChromeAt = (n) => stripRungAt(n).chrome;

/** What a full strip needs, and what the last one standing needs. */
const stripChrome = () => stripChromeAt(0);
// The bottom of everything: last rung, and the master's chain gone with the rest. The
// rack's floor has to be this rather than the band with the chain in it, or a mix bus
// carrying six inserts would raise the desk's minimum mixer height by two hundred
// pixels and take them out of the arrangement above it.
const bareChrome = () => stripChromeAt(SHED_ORDER.length);

/**
 * The least the rack may be: a strip with every sheddable block gone and the fader at
 * its own minimum, plus the rack's padding. Nothing is hidden behind this — there is
 * no scrolled-away row under it, because the ladder hides whole blocks and says so on
 * the header switch rather than letting a body scroll silently.
 */
function rackFloor() { return bareChrome() + FADER_FLOOR + rackPad(); }

// The roll's scope strip, measured while it is up and kept while it is not. Zero only
// before the roll has ever been built, which is the same nothing the old direct
// measurement returned then.
let lastRollScopeH = 0;
function rollScopeH() {
  const now = h($('pianoroll').querySelector('.ssqscope'));
  if (now) lastRollScopeH = now;
  return lastRollScopeH;
}

/**
 * The least each region may be while it is OPEN, measured rather than written down:
 * every one of these moves with the typeface, and two of them move with the song. A
 * FOLDED region is not in here — its height is its own header and there is nothing
 * to negotiate about it.
 */
const MIN = {
  /** Fixed by CSS at 30 or 44; the sections fold is the only thing that moves it. */
  timeline: () => h($('timeline')),
  /** Header and one row. Whole rows only, always — see arrangeSnap. */
  arrange: () => arrangeChrome() + laneStackHeight(1),
  /** A strip with every sheddable block gone, and the rack's padding. */
  mixer: () => rackFloor(),
  /** The notes panel: header plus enough of a keyboard to play against. The scope
   *  strip is measured when it is on screen and REMEMBERED when it is not — a drum
   *  channel takes the roll out of the panel (see laneHidesRoll), and a floor that
   *  drops by the height of a hidden strip would let a cramped desk claw back room
   *  from the panel every time the selection landed on the kick. */
  notes: () => h($('notehead')) + rollScopeH() + DEV_MIN_ROLL,
  /** Effects panel: header plus room for one card row. */
  devices: () => h($('devhead')) + DEV_MIN_EXTRA,
};

/** What each region asks for when nothing is squeezing it. A dragged height wins. */
const WANT = {
  arrange: () => (userArrH != null ? userArrH
    : Math.min(arrangementWants(),
      arrangeChrome() + laneStackHeight(ARR_AUTO_LANES()))),
  /** Notes panel wants enough height for the roll. */
  notes: () => (userDevH != null ? userDevH : (autoDevH() || 204)),
};

// The height the effect cards themselves ask for, measured by reserveDevices().
/** FX is a right-side column, so it does not consume vertical desk height. */
const effectsNaturalHeight = () => 0;

/** Maximum effects room while leaving the other open panels at their floors. */
function effectsRoom() {
  const arrH = $('arrange').classList.contains('collapsed')
    ? h($('arrange')) : plannedArrangeHeight();
  const notesH = $('notes').classList.contains('collapsed')
    ? h($('notes')) : Math.max(MIN.notes(), userDevH ?? MIN.notes());
  const rackH = $('rackwrap').classList.contains('collapsed') ? 0 : MIN.mixer();
  return Math.max(DEV_MIN_EXTRA, Math.floor(deskPool()
    - h($('mixhead')) - arrH - notesH - rackH - h($('devhead'))));
}
const clampEffectsH = (value) => clamp(value, DEV_MIN_EXTRA, effectsRoom());

/** The height the arrangement will be given, from preferences and content alone. */
const plannedArrangeHeight = () => ($('arrange').classList.contains('collapsed')
  ? h($('arrange'))
  : arrangeSnap(WANT.arrange(), Math.floor));

/**
 * What the notes panel is allowed to take — the room between the rack's floor and
 * the effects panel's selected height at the bottom.
 */
function notesRoom(arrH = plannedArrangeHeight()) {
  const fxH = effectsNaturalHeight();
  const room = deskPool()
    - h($('mixhead'))
    - arrH
    - ($('rackwrap').classList.contains('collapsed') ? 0 : MIN.mixer())
    - fxH;
  return Math.max(MIN.notes(), Math.floor(room));
}

/**
 * Exactly one region in the desk is elastic, chosen in this order: the rack, then
 * the arrangement, then the notes panel, then the empty band at the end. The effects
 * panel has its own selected height and is outside that elastic chain.
 */
const DESK_CHAIN = ['rackwrap', 'arrange', 'notes', 'deskslack'];
function applyDeskChain() {
  const winner = DESK_CHAIN
    .filter((id) => id !== 'arrange')
    .find((id) => id === 'deskslack' || !$(id).classList.contains('collapsed'));
  for (const id of DESK_CHAIN) $(id).classList.toggle('greedy', id === winner);
}

/**
 * Who gets which pixels, worked out before anything is written.
 *
 * The effects panel at the bottom takes its natural or manually selected height. If
 * that leaves the window short, the Mixer gives up its room first; only then do the
 * other panels surrender space to preserve their minimums.
 */
function planDesk() {
  const arrOpen = !$('arrange').classList.contains('collapsed');
  const rackOpen = !$('rackwrap').classList.contains('collapsed');
  // The FOLD, and only the fold. A panel with its roll out is still open and still
  // holds its room — see laneHidesRoll.
  const notesOpen = !$('notes').classList.contains('collapsed');

  if (restoredArrH && laneCount() > 1) {
    if (userArrH <= MIN.arrange() + 1) {
      userArrH = null;
      rememberDeskHeights();
    }
    restoredArrH = false;
  }

  const fxH = effectsNaturalHeight();
  // When the effects panel is collapsed, its header still occupies space in the
  // flex layout but effectsNaturalHeight() returns 0. Account for it so the rack
  // doesn't get over-allocated height that the header then steals.
  const fxCollapsedHeader = (!$('devices').classList.contains('collapsed') || fxH > 0) ? 0 : h($('devhead'));
  const fixed = h($('mixhead'))
    + (arrOpen ? 0 : h($('arrange')))
    + (notesOpen ? 0 : h($('notes')))
    + fxH + fxCollapsedHeader;
  const arrMin = arrOpen ? MIN.arrange() : 0;
  const notesMin = notesOpen ? MIN.notes() : 0;
  const rackMin = rackOpen ? MIN.mixer() : 0;
  const chrome = rackOpen ? stripChrome() : 0;
  const rackWant = !rackOpen ? 0
    : notesOpen ? MIN.mixer()
      : chrome + FADER_MIN + rackPad();
  const room = deskPool() - fixed;
  const lane = laneRowHeight() + laneRowGap();

  let arrH = !arrOpen ? 0
    : arrangeSnap(rackOpen ? WANT.arrange()
      : (userArrH != null ? userArrH : arrangementWants()), Math.floor);
  let notesH = notesOpen ? Math.max(notesMin, WANT.notes()) : 0;
  let rackH = room - arrH - notesH;

  const byHand = (arrOpen && userArrH != null)
    || (notesOpen && userDevH != null) || userFxH != null;

  const clawBack = (short, forced) => {
    if (notesOpen && (forced || !byHand)) {
      const give = Math.min(short, notesH - notesMin);
      notesH -= give;
      short -= give;
    }
    if (short > 0 && arrOpen && (forced || !byHand)) {
      arrH -= Math.min(Math.ceil(short / lane) * lane, arrH - arrMin);
    }
    rackH = room - arrH - notesH;
  };

  if (rackH < rackWant) clawBack(rackWant - rackH, false);
  if (rackH < rackMin) clawBack(rackMin - rackH, true);
  const cramped = rackH < rackMin - 1;
  return { arrOpen, rackOpen, notesOpen, arrH, notesH, fxH, chrome, rackH: rackOpen ? rackH : 0, cramped };
}

/** Write the plan out. */
function applyDesk({ arrOpen, rackOpen, notesOpen, arrH, notesH, fxH, chrome, rackH, cramped }) {
  $('desk').classList.toggle('cramped', cramped);
  $('arrange').style.maxHeight = arrOpen ? `${Math.round(arrH)}px` : '';
  // Notes panel height. When folded or greedy, let CSS handle it.
  if (!notesOpen) {
    $('notes').style.height = '';
  } else if ($('notes').classList.contains('greedy')) {
    $('notes').style.height = '';
  } else {
    $('notes').style.height = `${Math.round(notesH)}px`;
  }
  // Effects panel: natural or manually selected height.
  if (fxH > 0) {
    $('devices').style.height = `${Math.round(fxH)}px`;
  } else {
    $('devices').style.height = '';
  }
  if (rackOpen) sizeStrips(Math.floor(rackH - rackPad()));
}

/**
 * The rack's shrink ladder. `strips` is the height one strip may occupy — the rack's
 * own height less its padding and its horizontal scrollbar.
 *
 * The fader goes first and goes furthest: it is the shock absorber, uncapped upwards
 * so a tall window ends up with long faders rather than a band of empty desk, and
 * squeezed to FADER_MIN before any block is touched. Past that the desk starts shedding
 * whole BLOCKS, in SHED_ORDER — inserts, then sends, then EQ — until a strip fits, so
 * the fader and its meter stay a control you can read and hold at every rung. Only the
 * last rung, with nothing left to shed, lets it down to FADER_FLOOR.
 *
 * It never scrolls a strip body: a row half out of sight is a row you cannot read and
 * cannot click, and it goes without saying that it has gone. A hidden block says so on
 * its header switch instead.
 *
 * The rung is a state of the whole rack rather than of one strip. --striph, --bodyh
 * and --faderh are root variables, the measurement takes its MAX across every strip
 * precisely so they all stand level, and a per-strip ladder would put the faders on
 * three different lines. The precedent is the part switches themselves, which hide a
 * block on every strip at once for the same reason.
 */
function sizeStrips(strips) {
  // Called before the first buildRack, from applyFont() and from the fold restore.
  // Nothing to size, and every measurement below would be zero.
  if (!document.querySelector('.strip[data-lane]')) return;
  const wrap = $('rackwrap');
  const root = document.documentElement.style;

  // The fewest blocks that make a strip fit. Fewest, so the desk gives up as little
  // as it has to and hands each block back at the same height it took it away at.
  //
  // FADER_MIN, not FADER_FLOOR: a rung only counts as fitting if the fader and its
  // meter come out of it usable. Bargaining with the floor instead left a wide band of
  // window heights showing every block over a 34px fader — see FADER_FLOOR. The floor
  // is still what gets APPLIED below, and it is never larger than the number bargained
  // with here, so no strip is ever handed more content than height.
  let shed = 0;
  while (shed < SHED_ORDER.length && strips < stripChromeAt(shed) + FADER_MIN) shed++;
  const gone = SHED_ORDER.slice(0, shed);

  for (const id of SHED_ORDER) wrap.classList.toggle(shedClass(id), gone.includes(id));
  markShedParts(gone);
  // THE MASTER IS ASKED ABOUT ITS OWN STRIP, AND ONLY ITS OWN. Its chain goes when the
  // rack cannot hold that chain over a fader worth having — nothing to do with what the
  // channels are carrying. Comparing the two is what used to hide it: a mix bus generally
  // carries more than any single channel, so "taller than the busiest channel's body" was
  // the ordinary case, and with EQ and Sends off a channel body IS its chain. Four
  // effects across the mix, a desk with room for all of them, and none of them shown.
  //
  // Whole when it goes, never half a chain over a hidden scrollbar — the silent shedding
  // the ladder exists to avoid — and its copy on the Effects panel is unaffected either
  // way.
  const rung = stripRungAt(shed);
  const masterShed = strips < rung.masterChrome + FADER_MIN;
  wrap.classList.toggle(MASTER_FX_SHED, masterShed);

  // Nothing here about the preset editor any more. It used to be a rack item wearing
  // --striph, so the bottom rung squashed a full editor into the height of a bare strip
  // and the ladder had to close it on the way past. It is a window over the desk now:
  // the rack can shed every block it has without the editor noticing.

  // The band between the head and the foot, the same on every strip: the tallest body
  // at this rung. Written here with --faderh and --striph and for the same reason —
  // the three of them are one layout, and a rung that changed how long the fader is
  // without fixing where it starts would put the master's back off its neighbours'
  // line. The rows a strip does not have are this band, not extra fader.
  const chrome = rung.chrome;
  root.setProperty('--bodyh', `${rung.body}px`);
  // FADER_FLOOR, which is never LARGER than the number the shed loop above bargains
  // with — that is the invariant, not that the two are equal. Floored above what the
  // loop settled for, a strip would be given more content than height, and a strip body
  // that overflows scrolls, silently, which is the one thing this whole ladder exists to
  // avoid. Below it, as here, the rung the loop chose simply has fader to spare, and
  // only the last rung — nothing left to shed — ever comes down this far.
  const fader = Math.max(FADER_FLOOR, strips - chrome);
  root.setProperty('--faderh', `${Math.round(fader)}px`);
  // Sized to the rack, never past it: there is no vertical scrollbar on the rack, so
  // a strip that wanted more would simply be cut off. `strips` already accounts for
  // the rack's padding and its horizontal scrollbar, so this fills the space exactly
  // and leaves the padding showing under the last strip.
  root.setProperty('--striph', `${Math.round(Math.min(strips, chrome + fader))}px`);
}

/**
 * Mark the header switches for the blocks the desk is hiding of its own accord.
 *
 * The switch stays ON — it is still what you want, and it comes back the moment there
 * is room — but it is struck through, so "there is no space for this" reads as a
 * different thing from "you turned this off". This is the affordance the whole ladder
 * rests on: the reason it is allowed to hide a block at all is that it says it has.
 */
function markShedParts(gone) {
  for (const b of document.querySelectorAll('[data-mixer-part-filter] button[data-part]')) {
    const off = isPartHidden(b.dataset.part);
    const shed = !off && gone.includes(b.dataset.part);
    b.classList.toggle('shed', shed);
    if (!shed) continue;
    b.title = `No room for ${STRIP_PARTS.find((p) => p.id === b.dataset.part).what}`
      + ' — the window is too short. Give the mixer more height and it comes back.';
  }
}

/**
 * The rack alone, from the room it has this instant.
 *
 * Split out of fitStrips because it has to run in places the full fit deliberately does
 * not: a splitter drag defers the fit to the release, and a window resize waits out its
 * settle timer. GROWING survives that wait — the strips stretch to the rack on their own
 * (see .strip) — but SHRINKING does not: --striph is a floor, so until the ladder has
 * run the strips stand taller than the rack they are in and their feet are cut off at
 * the bottom. This is the cheap half of the fit — one layout read and three custom
 * properties, with the rung heights already measured and cached — so it can run on every
 * pointer move, and the expensive half (lane visibility, clipped names, the editors)
 * still waits for the gesture to end.
 */
function fitRack() {
  if ($('desk').dataset.lowerView !== 'mixer') return;
  // The splitter's bound first, since it is what stops the rack being handed less than a
  // bare strip in the first place — and a window being dragged shorter moves that bound
  // without anyone touching the splitter. Two property writes; the fit re-applies it for
  // the other lower views, which have no rack to size.
  applyWorkRatio();
  // #rack's own content box, not the wrapper's height less a reconstructed pad: the
  // strips stand in that box, and rebuilding it from the outside missed #rackwrap's
  // bottom border and handed every strip a pixel more than the room it had.
  sizeStrips(Math.floor(Math.max(rackFloor() - rackPad(), rackInner())));
}

/** Size the desk to the window. */
function fitStrips() {
  // The unified workspace lets flex resolve exactly two rooms. The old four-panel
  // planner must not write heights back into them: it was designed to bargain among
  // Arrangement, Notes, Mixer and Effects, three of which are no longer simultaneous
  // regions. The rack still needs its shrink ladder, so size it from the lower room it
  // actually owns and retain the common post-layout housekeeping below.
  if ($('upperwork') && $('lowerwork')) {
    // The splitter's bound moves with the rack's floor, with the window and with which
    // view is in the lower workspace, and all three move without anyone touching the
    // splitter — a shorter window, a font change, a song whose busiest channel is taller,
    // a switch to the roll. Re-applied here, where every one of those already arrives,
    // rather than only at the drag. The ASK is untouched, so this is a bound and not an
    // edit: give the room back and the split comes back with it.
    applyWorkRatio();
    fitRack();
    if (keepLanePending) {
      keepLanePending = false;
      keepSelectedLaneVisible();
    }
    scheduleMarkClipped();
    return;
  }
  applyDeskChain();
  applyDesk(planDesk());
  // After every write in the frame, so the one forced reflow it costs is the last one.
  if (keepLanePending) {
    keepLanePending = false;
    keepSelectedLaneVisible();
  }
  // Name clipping is a tooltip convenience, not part of the layout decision. Reading
  // scrollWidth/clientWidth immediately after the flex writes above forces the browser
  // to finish the whole desk reflow in the same task that opened a panel. Defer that
  // read so a fold only does the measurements needed to keep playback alive.
  scheduleMarkClipped();
}

// Panel folds can change several flex constraints at once. Coalesce all of the
// resulting requests into one frame, after the browser has applied the new classes,
// rather than measuring once before flex settles and again afterwards.
let deskFitPending = 0;
let deskFitSettle = false;
function scheduleDeskFit(settle = false) {
  deskFitSettle ||= settle;
  if (deskFitPending) return;
  deskFitPending = requestAnimationFrame(() => {
    deskFitPending = 0;
    fitStrips();
    // Flex assigns the newly freed/claimed panel pixels in this frame, while the
    // rack's strip height is written by fitStrips. A fold therefore gets one bounded
    // follow-up measurement so that the cards fill the new rack height instead of
    // leaving the old card height and a blank band below it.
    if (deskFitSettle) {
      deskFitSettle = false;
      deskFitPending = requestAnimationFrame(() => {
        deskFitPending = 0;
        fitStrips();
      });
    }
  });
}

let clippedMarkPending = 0;
function scheduleMarkClipped() {
  if (clippedMarkPending) return;
  const run = () => {
    clippedMarkPending = 0;
    markClipped();
  };
  if (typeof requestIdleCallback === 'function') {
    clippedMarkPending = requestIdleCallback(run, { timeout: 400 });
  } else {
    clippedMarkPending = setTimeout(run, 0);
  }
}

/**
 * A tooltip only where the name is cut off. "Electro-Fx" fits in a strip and needs no
 * hover; the ones that ellipsis do, and there is no way to read them otherwise. It is
 * a measurement, not a property of the name, so it is re-taken whenever the layout
 * moves — a name that fits at one window width is truncated at another.
 */
function markClipped(root = document) {
  for (const el of root.querySelectorAll('.strip h3, .arrname')) {
    const full = el.dataset.full || el.textContent;
    el.dataset.full = full;
    // Track names have the desk tooltip now; a native title appearing later would
    // compete with it when a long name is truncated.
    el.title = el.dataset.tip ? '' : el.scrollWidth > el.clientWidth + 1 ? full : '';
  }
}

// One resizer between the permanent upper and lower workspaces. Store a ratio rather
// than pixels so the same choice survives moving between monitors or rotating a tablet.
const UPPER_WORK_KEY = 'mash-mixer-upper-work-ratio';
/**
 * The least the lower workspace may be while the MIXER is the view in it: the rack's
 * own floor — a strip with every sheddable block gone, its fader at FADER_FLOOR and the
 * rack's padding — plus the Mixer header above it.
 *
 * Without this the splitter could hand the rack less height than the bare strip it is
 * already standing on, and a rack that overflows is clipped rather than scrolled: the
 * bottom of every strip — pan, mute and solo — simply left the screen with nothing
 * saying it had. The ladder's whole promise is that a block goes away visibly or not at
 * all, and past two thirds of the splitter's travel it was quietly breaking it.
 *
 * The roll and the pattern grid have their own scrollers and are happy at any height,
 * so this bound is the mixer's alone.
 */
const lowerWorkFloor = () => (document.querySelector('.strip[data-lane]')
  ? h($('mixhead')) + rackFloor() : 0);
const clampWorkRatio = (value) => {
  const want = Number.isFinite(Number(value)) ? Number(value) : 0.44;
  const desk = h($('desk'));
  // Measured rather than written down: the splitter is 7px of desk that belongs to
  // neither workspace, and a ratio that forgot it would be 7px optimistic every time.
  const room = desk - h($('worksplitter'));
  let most = 0.76;
  if (room > 0 && $('desk')?.dataset.lowerView === 'mixer') {
    most = Math.min(most, Math.max(0.24, (room - lowerWorkFloor()) / desk));
  }
  return Math.max(0.24, Math.min(most, want));
};
const restoredWorkRatio = Number.parseFloat(localStorage.getItem(UPPER_WORK_KEY));
// The split you ASKED for, which is a different number from the one on screen whenever
// the rack's floor is holding the splitter back. Storing the ask rather than the bound
// is what lets a temporary squeeze — a shorter window, a busier song — end: shrink the
// window and the splitter rides up to keep the mixer whole, grow it again and the split
// you chose is still there. Stored bounded, the squeeze would be permanent and every
// resize would eat a little more of a choice nobody withdrew.
let upperWorkRatio = Math.max(0.24, Math.min(0.76,
  Number.isFinite(restoredWorkRatio) ? restoredWorkRatio : 0.44));
/** The ask, put on screen through whatever bound is in force right now. */
const applyWorkRatio = () => {
  const shown = clampWorkRatio(upperWorkRatio);
  document.documentElement.style.setProperty('--upper-work-height', `${shown * 100}%`);
  $('worksplitter').setAttribute('aria-valuemin', '24');
  $('worksplitter').setAttribute('aria-valuemax', String(Math.round(clampWorkRatio(0.76) * 100)));
  $('worksplitter').setAttribute('aria-valuenow', String(Math.round(shown * 100)));
};
const writeWorkRatio = (value, remember = true, fit = true) => {
  upperWorkRatio = Math.max(0.24, Math.min(0.76,
    Number.isFinite(Number(value)) ? Number(value) : 0.44));
  applyWorkRatio();
  if (remember) localStorage.setItem(UPPER_WORK_KEY, String(upperWorkRatio));
  keepLanePending = true;
  if (fit) scheduleDeskFit();
};
// (moved into installDeskLayout — see above)

(() => {
  const splitter = $('worksplitter');
  let dragging = false;
  let dragDesk = null;
  const setFromPointer = (event) => {
    const desk = dragDesk || $('desk').getBoundingClientRect();
    if (!(desk.height > 0)) return;
    // The CSS variable is the cheap live part of the gesture. Defer the EDITOR fit until
    // release; doing that full measure/write pass on every pointer move is exactly the
    // main-thread work that can steal a scheduler turn.
    writeWorkRatio((event.clientY - desk.top) / desk.height, false, false);
    // The rack is not deferrable, though — dragging the splitter DOWN takes room away
    // from strips whose floor is still the old rung's, and a floor taller than the rack
    // is a foot cut off at the bottom for the whole length of the drag. This is the
    // cheap half: the rungs are already measured, so it is a read and three properties.
    fitRack();
  };
  splitter.addEventListener('pointerdown', (event) => {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    dragDesk = $('desk').getBoundingClientRect();
    beginPlaybackVisualHold();
    deferRollResize(true);
    splitter.classList.add('dragging');
    try { splitter.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    setFromPointer(event);
    event.preventDefault();
  });
  splitter.addEventListener('pointermove', (event) => { if (dragging) setFromPointer(event); });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    dragDesk = null;
    splitter.classList.remove('dragging');
    localStorage.setItem(UPPER_WORK_KEY, String(upperWorkRatio));
    scheduleDeskFit(true);
    requestAnimationFrame(() => {
      deferRollResize(false);
      // Let the settled fit and the roll's deferred row pass land before restoring
      // decorative playback work.
      requestAnimationFrame(endPlaybackVisualHold);
    });
  };
  splitter.addEventListener('pointerup', stop);
  splitter.addEventListener('pointercancel', stop);
  splitter.addEventListener('dblclick', () => writeWorkRatio(0.44));
  splitter.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') writeWorkRatio(0.44);
    else writeWorkRatio(upperWorkRatio + (event.key === 'ArrowDown' ? 0.02 : -0.02));
  });
})();

// Every border sizes the panel ABOVE it, so a handler never lives on the element it
// resizes. This is the first one: the top border of Notes, which is the Arrangement's
// bottom edge. Dragging it is a claim about how much Arrangement you want to see;
// double-clicking it withdraws the claim.
(() => {
  const edge = $('notes');
  let from = 0, startH = 0, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    deferRollResize(true);
    from = e.clientY;
    startH = h($('arrange'));
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - from;
    const asked = startH + dy;
    const notesCollapsed = $('notes').classList.contains('collapsed');
    // Pulled up past the first lane: fold it away. Half a lane is not a thing to
    // leave someone looking at, and the fold is where they were heading anyway. If
    // Notes is the folded side of this border, dragging upward across it opens it —
    // the room the arrangement gives up has to go somewhere you can see.
    if (lanesIn(asked) < 1) {
      setArrangeCollapsed(true);
      userArrH = null;
      if (notesCollapsed && dy < 0) setNotesFolded(false, false);
    } else {
      setArrangeCollapsed(false);
      userArrH = arrangeSnap(asked);
    }
    // Taking lanes away should never take away the one being worked on: the drag is
    // about how much arrangement to show, not about which part of it.
    keepLanePending = true;
    scheduleDeskFit();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
    rememberDeskHeights();
    // Again for the settling fit — the rack can claw a lane back at the end of a drag.
    keepLanePending = true;
    scheduleDeskFit(true);
    requestAnimationFrame(() => deferRollResize(false));
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
  edge.addEventListener('dblclick', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    userArrH = null;
    rememberDeskHeights();
    keepLanePending = true;
    scheduleDeskFit(true);
    toast('Arrangement back to fitting itself');
  });
})();

// A drag on the window edge fires this continuously, and a fit measures every strip in
// the rack to find the tallest chrome. Wait for the viewport to settle before paying
// that forced-reflow cost; flex/CSS keeps the desk visually responsive in the meantime.
const MIXER_RESIZE_SETTLE_MS = 120;
let fitPending = 0;
// PLAYBACK WINS, AND A HIDDEN RACK IS NOT WORTH MEASURING. M8TRX's panel covers the desk
// edge to edge, so every strip this fit measures while it is open is a forced reflow for
// something nobody can see — and dragging the window edge during M8TRX playback was
// audibly spending the one core the audio graph has on exactly that. The fit is not
// skipped, it is DEFERRED: the debt is remembered and paid the moment the panel closes,
// because the rack still has to be right when it comes back.
let deskFitOwed = false;
let deskResizeSettleTimer = 0;
let deskResizeVisualHeld = false;
const scheduleDeskResize = () => {
  // Every width the arrangement scroller was measured against has just changed.
  forgetArrangementGeometry();
  // The rack goes now rather than after the settle timer, for the same reason it goes on
  // every pointer move of the splitter: a window being dragged shorter takes the room out
  // from under strips whose floor is still the old rung's, and they spend the whole
  // gesture with their feet cut off. Everything expensive still waits below.
  fitRack();
  if (!deskResizeVisualHeld) {
    deskResizeVisualHeld = true;
    beginPlaybackVisualHold();
  }
  clearTimeout(deskResizeSettleTimer);
  deskResizeSettleTimer = setTimeout(() => {
    deskResizeSettleTimer = 0;
    cancelAnimationFrame(fitPending);
    fitPending = requestAnimationFrame(() => {
      fitPending = 0;
      if (rearrangePanelOpen()) deskFitOwed = true;
      else {
        scheduleDeskFit(true);
        syncMixerScroll();
        updateArrangementNoteScale();
        forgetArrangementGeometry();
      }
      // The fit is itself coalesced into the next frame. Hold one more frame so the
      // scheduler is not competing with the final layout write or deferred row pass.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!deskResizeVisualHeld) return;
        deskResizeVisualHeld = false;
        endPlaybackVisualHold();
      }));
    });
  }, MIXER_RESIZE_SETTLE_MS);
};
addEventListener('resize', scheduleDeskResize);
window.visualViewport?.addEventListener('resize', scheduleDeskResize);

// The second resize edge is the top border of the Mixer header, which is Notes'
// BOTTOM edge: moving it DOWN gives Notes more room, moving it UP gives Notes less.
// That is the opposite sense from when this handler sat on Notes' own top border, and
// the reason every sign in here is inverted from the Effects handler below — that one
// still grows a panel upward, this one grows it downward. It keeps the current height
// live while dragging and only writes the preference when the gesture ends, so a
// resize cannot fill localStorage with intermediate pixels.
(() => {
  const edge = $('mixhead');
  const panel = $('notes');
  let from = 0, startH = 0, startCollapsed = false, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    deferRollResize(true);
    from = e.clientY;
    startH = h(panel);
    startCollapsed = panel.classList.contains('collapsed');
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - from;
    // A folded Notes panel starts at its header height, which is below the normal
    // open minimum. A downward drag must open it immediately; keep the gesture's
    // distance above the minimum so the panel grows with the pointer from there.
    const asked = startCollapsed && dy > 0
      ? MIN.notes() + dy
      : startH + dy;
    const mixerCollapsed = $('rackwrap').classList.contains('collapsed');
    // Like Arrangement, Notes folds once its open minimum would be crossed. Dragging
    // back across that same boundary reopens it and restores the roll's content. If
    // Mixer is folded, moving the border UP gives that side room instead — the Mixer
    // is below this border now, so it is an upward drag that hands it space.
    if (startCollapsed && dy > 0) {
      setNotesFolded(false, false);
      userDevH = clampDeviceH(asked);
    } else if (asked <= MIN.notes()) {
      setNotesFolded(true, false);
      userDevH = null;
      if (mixerCollapsed && dy < 0) setMixerFolded(false, false);
    } else {
      setNotesFolded(false, false);
      userDevH = clampDeviceH(asked);
      if (mixerCollapsed && dy < 0) setMixerFolded(false, false);
    }
    scheduleDeskFit();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
    rememberDeskHeights();
    scheduleDeskFit(true);
    requestAnimationFrame(() => deferRollResize(false));
    // The same drag folds and unfolds Notes as it crosses the panel's minimum, and
    // that fold belongs to the song, not to the desk.
    rememberSongLayout();
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
  edge.addEventListener('dblclick', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    userDevH = null;
    rememberDeskHeights();
    reserveDevices();
    scheduleDeskFit(true);
    toast('Notes panel back to fitting itself');
  });
})();

// Effects uses its top border as the resize edge. Moving it UP grows the shelf and
// takes room from the Mixer; moving it DOWN gives the Mixer room back. A folded shelf
// opens on the first upward movement, just like Notes.
(() => {
  const edge = $('devices');
  let from = 0, startH = 0, startCollapsed = false, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    deferRollResize(true);
    from = e.clientY;
    startH = h(edge);
    startCollapsed = edge.classList.contains('collapsed');
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - from;
    const asked = startCollapsed && dy < 0
      ? MIN.devices() - dy
      : startH - dy;
    const bodyH = asked - h($('devhead'));
    if (startCollapsed && dy < 0) {
      setDevicesFolded(false, false);
      userFxH = clampEffectsH(bodyH);
    } else if (asked <= MIN.devices()) {
      setDevicesFolded(true, false);
      userFxH = null;
    } else {
      setDevicesFolded(false, false);
      userFxH = clampEffectsH(bodyH);
    }
    scheduleDeskFit();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
    rememberDeskHeights();
    scheduleDeskFit(true);
    requestAnimationFrame(() => deferRollResize(false));
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
  edge.addEventListener('dblclick', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    userFxH = null;
    rememberDeskHeights();
    reserveDevices();
    scheduleDeskFit(true);
    toast('Effects panel back to fitting itself');
  });
})();


// ---- what the desk calls ----------------------------------------------------
export {
  // What the desk measures with. One genuine call site outside this file.
  h,
  // The pass itself, and the ways in to part of it.
  scheduleDeskFit, fitStrips, forgetStripMetrics, markClipped,
  // The arrangement's share of the budget.
  syncArrangementLaneSelection, laneRowHeight, laneRowGap,
  writeWorkRatio,
};

/** Spend the lane reveal once more after the next fit settles. */
export const keepLaneAfterFit = () => { keepLanePending = true; };
/** The upper/lower split, for the code that reads it back. */
export const workRatio = () => upperWorkRatio;
/** The effects panel's remembered height, or null while it is fitting itself. */
export const fxHeight = () => userFxH;
/**
 * Was a fit deferred while Rearrange covered the rack? Answering CLEARS the debt, so
 * the caller cannot forget to — it was a bare flag read and reset on both sides before.
 */
export function takeDeskFitDebt() {
  if (!deskFitOwed) return false;
  deskFitOwed = false;
  return true;
}
