// Note FX and Spot FX — the two editors that hang off a bar or a track.
//
// Lifted out of mixer-entry.js. Note FX is the strum and the arpeggiator: what a lane
// does to the notes it was given, as opposed to what it sounds like. Spot FX (called Bar
// Effects in the code and the data, which predate the name) is an effect chain a stretch
// of the song carries on top of the channel's, down to a 1/32 and on the master too. They travel together
// because they are the same window with two contents — the same anchor, the same
// restore-on-rebuild handling, the same scope of "this track, or these bars".
//
// Both are handed the desk they edit; neither reaches for it.

import {
  resolveNoteFx, NOTE_FX_RANGE_MIN, NOTE_FX_RANGE_MAX, NOTE_FX_LIMIT_MAX,
} from '../src/engine/note-fx.js';
import { EFFECT_BY_ID, MAX_EFFECTS, SECTION_EFFECTS } from '../src/engine/effects.js';
import { laneCurve, fxSectionAt, MASTER_KEY } from '../src/data/automation.js';
import { groupIdOf, GROUP_BY_ID } from '../src/data/group-buses.js';
import { setBarNoteFx, setBarSections, renderArpToNotes } from './lib/arrangement-edit.js';
import { createCustomSelect } from './lib/custom-select.js';
import { deskNoteName } from './mixer-note-names.js';
import { heavyUi } from './lib/heavy-ui.js';
import { fillEffectControls } from './mixer-effect-cards.js';

const $ = (id) => document.getElementById(id);

// ---- the seam ---------------------------------------------------------------
// `arrDraftOf` and `editBank` are declared thousands of lines below the install, so they
// arrive as thunks. `restorablePopup` is the desk's record of what a rebuild should put
// back on screen — read, written and mutated here, so it comes as a pair.
let targetLabel, closeMenu, clamp, toast, gap, selectLane, markBar, jumpTo,
  applyArrangementEdit, regionPanelBusy, noteFxFor, setTrackNoteFx, clearTrackArp,
  powerIcon, trashIcon, closeIcon, effectsOf, arrDraftOf, editBank, openPicker, closePicker,
  restorablePopup, setRestorablePopup, retuneSpotFx;

/** Hand the two editors the desk they edit. */
export function installNoteFxEditors(deps) {
  ({
    targetLabel, closeMenu, clamp, toast, gap, selectLane, markBar, jumpTo,
    applyArrangementEdit, regionPanelBusy, noteFxFor, setTrackNoteFx, clearTrackArp,
    powerIcon, trashIcon, closeIcon, effectsOf, arrDraftOf, editBank, openPicker, closePicker,
    restorablePopup, setRestorablePopup, retuneSpotFx,
  } = deps);
}

/**
 * The bounds the arpeggiator's range offers, spelled the way the desk spells every other
 * pitch: the same eighty-eight keys as the on-screen keyboard, so a window can be put
 * anywhere a note can be played. The two ends are offered from different slices of that
 * span because the fold needs a whole octave to work in — the highest Lowest and the
 * lowest Highest are a window exactly one octave tall, so no pick on either list is an
 * impossible one.
 */
const NOTE_FX_RANGE_BOUNDS = Array.from(
  { length: NOTE_FX_RANGE_MAX - NOTE_FX_RANGE_MIN + 1 },
  (_, i) => [NOTE_FX_RANGE_MIN + i, deskNoteName(NOTE_FX_RANGE_MIN + i, { fancy: true })]);
const NOTE_FX_RANGE_LO_OPTIONS = NOTE_FX_RANGE_BOUNDS
  .filter(([midi]) => midi <= NOTE_FX_RANGE_MAX - 12);
const NOTE_FX_RANGE_HI_OPTIONS = NOTE_FX_RANGE_BOUNDS
  .filter(([midi]) => midi >= NOTE_FX_RANGE_MIN + 12);
// Desk C2–C4: two octaves around the register a chord lane already sits in, so switching
// the range on is a decision about where the arpeggio lives, not an instant transposition.
const NOTE_FX_RANGE_DEFAULT_LO = 48;
const NOTE_FX_RANGE_DEFAULT_HI = 72;

/**
 * What an unset Note FX reads as on the panel — the value each control is BUILT with,
 * and the value Reset writes back into it. One object rather than two lists of `?? 80`
 * fallbacks, because a default that lives in the constructor and again in the reset is
 * a default that will eventually disagree with itself.
 */
const NOTE_FX_BLANK = Object.freeze({
  strum: Object.freeze({ enabled: false, direction: 'up', gapMs: 18 }),
  arp: Object.freeze({ enabled: false, direction: 'up', rate: 1, octaves: 1, limit: 0,
    rangeLimit: false, rangeLo: NOTE_FX_RANGE_DEFAULT_LO, rangeHi: NOTE_FX_RANGE_DEFAULT_HI,
    repeat: true, gate: 80, retrigger: 'chord', latch: false }),
});

/**
 * A saved Note FX as the panel shows it.
 *
 * Strum and Arpeggiator are one choice, not two: the processor hands an arpeggiated lane
 * ONE tone per tick, and a strum needs two to have anything to spread, so a lane with
 * both switched on has only ever played the arpeggio. The panel says so — the strum
 * reads off next to a live arp — which makes a setting that was always dead visible
 * rather than merely ineffective.
 */
const shownNoteFx = (fx = {}) => {
  const arp = { ...NOTE_FX_BLANK.arp, ...(fx?.arp || {}) };
  const strum = { ...NOTE_FX_BLANK.strum, ...(fx?.strum || {}) };
  return { arp, strum: { ...strum, enabled: strum.enabled && !arp.enabled } };
};

/**
 * Open the Note FX panel — and queue past building it.
 *
 * The panel is a few hundred DOM nodes and a dozen custom selects, built synchronously
 * on the thread the sequencer runs on. That is the same shape as the whole-song piano
 * roll heavy-ui.js was written for, and it arrived as the same report: the desk crackled
 * on OPENING this window, with nothing applied and nothing changed. Unwrapped it held
 * the thread across the queue and the hole was audible; the diagnostics could only call
 * it `unattributed`, because a PerformanceObserver knows a task was long and only the
 * call site knows what it was.
 *
 * Wrapped at the DEFINITION rather than at the five call sites — a context menu, a row
 * header, a bar scope, a popup restore and the panel reopening itself after a render —
 * because they are all one gesture and none of them should have to remember.
 */
function openNoteFxEditor(x, y, key, scope = null) {
  if (regionPanelBusy()) return;
  heavyUi('open note fx', () => buildNoteFxEditor(x, y, key, scope));
}

/** The panel itself. Every line of it is DOM — see the caller for why that is wrapped. */
function buildNoteFxEditor(x, y, key, scope) {
  closeMenu();
  setRestorablePopup({ kind: 'noteFx', laneKey: key,
    scope: scope ? { from: scope.from, to: scope.to } : null });
  const panel = $('regionedit'); panel.textContent = ''; panel.classList.add('notefxmodal');
  const trackDefault = noteFxFor(key);
  const firstOverride = scope ? arrDraftOf().plan?.[scope.from]?.noteFx?.[key] : null;
  const current = firstOverride?.mode === 'on'
    ? { ...trackDefault, ...firstOverride,
      strum: { ...(trackDefault.strum || {}), ...(firstOverride.strum || {}) },
      arp: { ...(trackDefault.arp || {}), ...(firstOverride.arp || {}) } }
    : trackDefault;
  const view = shownNoteFx(current);
  const head = document.createElement('div'); head.className = 'reghead';
  const title = document.createElement('div'); title.className = 'regtitle';
  title.textContent = `Note FX · ${targetLabel(key)}${scope ? ` · bars ${scope.from + 1}–${scope.to + 1}` : ''}`;
  const close = document.createElement('button'); close.className = 'regclose'; close.textContent = '×';
  close.title = 'Close without applying these staged Note FX changes';
  close.setAttribute('aria-label', close.title);
  close.onclick = closeMenu; head.append(title, close); panel.append(head);

  const form = document.createElement('div'); form.className = 'regcontrols notefxcontrols';
  const help = document.createElement('div'); help.className = 'notefxhelp';
  help.textContent = scope
    ? `Apply + Play saves and plays from bar ${scope.from + 1}, leaving this window open. Reset stages these bars back to the track setting.`
    : 'Apply saves the track Note FX and leaves this window open. Reset empties every setting here. Nothing changes until you apply.';
  form.append(help);
  // Where the next control lands. Two pots that are one decision — a pattern and its
  // rate, an octave count and where to stop climbing it, the two ends of a window —
  // share a line, so the panel spends its size on width rather than on height. The
  // checkboxes head their sections and stay full width.
  let host = form;
  const pairRow = () => {
    host = document.createElement('div'); host.className = 'notefxpair'; form.append(host);
  };
  const fullRow = () => { host = form; };
  const setCheck = (input, value) => {
    input.checked = !!value;
    input.nextElementSibling?.classList.toggle('on', input.checked);
  };
  const check = (label, value) => {
    const row = document.createElement('label'); row.className = 'regcheck checkrow';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!value;
    const sw = document.createElement('span');
    sw.className = `fxswitch${input.checked ? ' on' : ''}`;
    sw.setAttribute('aria-hidden', 'true');
    sw.append(document.createElement('i'));
    input.addEventListener('change', () => setCheck(input, input.checked));
    const text = document.createElement('span'); text.textContent = label;
    row.append(input, sw, text); host.append(row); return input;
  };
  const field = (label, options, value, tip = null) => {
    const row = document.createElement('label'); row.className = 'regcontrol';
    const name = document.createElement('span'); name.textContent = label;
    const select = createCustomSelect({
      label, options, value,
      idPrefix: `notefx-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    });
    if (tip) {
      row.dataset.tip = tip.name;
      row.dataset.tipsays = tip.says;
      select.dataset.tip = tip.name;
      select.dataset.tipsays = tip.says;
    }
    row.append(name, select); host.append(row); return select;
  };
  const number = (label, min, max, step, value, suffix, tip = null) => {
    const row = document.createElement('label'); row.className = 'regcontrol';
    const name = document.createElement('span'); name.textContent = label;
    const input = document.createElement('input'); input.type = 'number';
    input.min = min; input.max = max; input.step = step; input.value = value;
    const read = document.createElement('div'); read.className = 'regread'; read.textContent = suffix;
    if (tip) {
      row.dataset.tip = tip.name;
      row.dataset.tipsays = tip.says;
    }
    row.append(name, input, read); host.append(row); return input;
  };

  const mode = scope ? field('Bar override', [['inherit', 'Inherit track'], ['off', 'Off in these bars'],
    ['on', 'Use these settings']], firstOverride?.mode || 'inherit', {
      name: 'Bar Note FX override',
      says: 'Bars inherit the track Note FX by default. Use these settings merges this bar’s settings over the track defaults; Off disables the track Note FX in these bars. The two effects are not automatically exclusive, so disable an unwanted Strum or Arpeggiator explicitly.'
    }) : null;

  const strumOn = check('Strum', view.strum.enabled);
  pairRow();
  // Short entries, because a combobox as wide as its longest sentence sets the width of
  // the whole panel. What the words gave up — that Random is seeded rather than fresh
  // every bar — the hover card keeps.
  const strumDir = field('Direction', [['up', 'Up · low to high'], ['down', 'Down · high to low'],
    ['random', 'Random']], view.strum.direction, {
      name: 'Strum direction',
      says: 'The order the chord’s notes are spread in. Random is seeded from the lane and the position in the song, so the same bar strums the same way every play and every render — a shuffle, not a dice roll.',
    });
  const gap = number('Gap', 0, 250, 1, view.strum.gapMs, 'milliseconds between notes');
  fullRow();
  const arpOn = check('Arpeggiator', view.arp.enabled);
  pairRow();
  const arpDir = field('Pattern', [['up', 'Up'], ['down', 'Down'], ['updown', 'Up / Down'],
    ['downup', 'Down / Up'], ['updownHold', 'Up / Down · held'],
    ['downupHold', 'Down / Up · held'], ['up2', 'Up · thirds'], ['down2', 'Down · thirds'],
    ['converge', 'Outside in'], ['diverge', 'Inside out'], ['pedalLow', 'Pedal · low'],
    ['pedalHigh', 'Pedal · high'], ['cascade', 'Cascade'],
    ['random', 'Random'], ['asPlayed', 'As played']],
  view.arp.direction, {
    name: 'Arpeggiator pattern',
    says: 'The order the stack is climbed in. Up / Down turns without striking the top and bottom twice; the held pair strikes them twice on purpose. Thirds takes every other note and wraps back for the ones it skipped — a triad comes out C G E. Outside in walks the two ends towards each other and Inside out opens from the middle. A Pedal alternates the lowest or the highest note against all the rest. Cascade climbs three and steps back two. As played keeps the order the notes are stored in the bar rather than sorting them by pitch. Random is seeded from the lane and the position in the song, so it plays the same way every time. Shapes that need three notes fall back to a plain climb on two.',
  });
  // Triplet rates, now that the transport can hold them. The arp fires on integral phase
  // (`(step - started) / rate`), which used to make a third impossible however it was
  // spelled — `step` only ever moved in 1s and 0.5s, so `rate: 2/3` fired every TWO
  // sixteenths rather than three to the beat. The counter behind `step` is exact at 48
  // and 96 now, so these land. Same labels and order as the roll's snap menu.
  const arpRate = field('Rate', [[4, '1/4'], [8 / 3, '1/4T'], [2, '1/8'], [4 / 3, '1/8T'],
    [1, '1/16'], [2 / 3, '1/16T'], [0.5, '1/32'], [1 / 3, '1/32T']],
    view.arp.rate);
  pairRow();
  const octaves = number('Octaves', 1, 4, 1, view.arp.octaves, 'octaves');
  // Octaves builds the stack; this stops the climb partway up it. Two controls because
  // the useful shape is between the octave counts — a seventh over two octaves cut to
  // five notes is not one octave and not two, and no octave count can spell it.
  const limit = number('Note limit', 0, NOTE_FX_LIMIT_MAX, 1, view.arp.limit,
    'notes · 0 plays them all', {
      name: 'Arpeggiator note limit',
      says: 'Stops the pattern after this many notes, counted up the stack Octaves built — set Octaves to 2 and this to 5 and a seventh plays its four notes plus the lowest one again an octave up. Counted after the range folds, so the number here is the number you hear. Without Repeat the pattern stops there; with Repeat it cycles those notes instead.',
    });
  fullRow();
  const rangeTip = {
    name: 'Arpeggiator range',
    says: 'Folds every arpeggiated note by whole octaves until it lands between these two, so the pattern plays in the same register whatever octave the chord was written in. Notes already inside keep their octave. The window is at least an octave tall — moving one end pushes the other — and an octave stack taller than the window folds back into it rather than sounding above it.',
  };
  const rangeOn = check('Keep notes inside a range', view.arp.rangeLimit);
  pairRow();
  const rangeLo = field('Lowest', NOTE_FX_RANGE_LO_OPTIONS, view.arp.rangeLo, rangeTip);
  const rangeHi = field('Highest', NOTE_FX_RANGE_HI_OPTIONS, view.arp.rangeHi, rangeTip);
  fullRow();
  // The fold needs a whole octave to work in — in anything shorter some pitch class has
  // nowhere to land. Rather than take a narrower window and quietly play a wider one,
  // the two ends push each other apart on screen, so the panel reads as it sounds.
  const keepAnOctave = (moved) => {
    const lo = Number(rangeLo.value);
    const hi = Number(rangeHi.value);
    if (hi - lo >= 12) return;
    if (moved === rangeLo) rangeHi.value = lo + 12;
    else rangeLo.value = hi - 12;
  };
  rangeLo.addEventListener('input', () => keepAnOctave(rangeLo));
  rangeHi.addEventListener('input', () => keepAnOctave(rangeHi));
  const repeat = check('Repeat pattern', view.arp.repeat !== false);
  pairRow();
  const gate = number('Gate', 1, 150, 1, view.arp.gate, 'percent of rate');
  const retrigger = field('Retrigger', [['chord', 'Each chord'], ['bar', 'Each bar'],
    ['continuous', 'Continuous']], view.arp.retrigger);
  fullRow();
  const latch = check('Latch until the next chord', view.arp.latch);

  // Render belongs to the arpeggiator, not to the panel's own actions. Everything in the
  // footer decides what happens to this window; this one reaches past it and writes notes
  // into the song, and it only means anything while there is an arpeggiator to consume.
  // Down there it read as a fourth way of leaving, and took a whole line to do it.
  const renderButton = document.createElement('button');
  renderButton.className = 'notefxrender';
  renderButton.textContent = 'Render Arp to Notes';
  renderButton.title = scope
    ? `Write ${targetLabel(key)}'s arpeggiator as ordinary notes in these bars`
    : `Write ${targetLabel(key)}'s arpeggiator as ordinary notes across the song`;
  // The SAVED arpeggiator, not the staged one: this writes the notes the song plays
  // today, so an arp that exists only as an unapplied tick in this window has nothing
  // for it to render.
  renderButton.disabled = !resolveNoteFx(trackDefault,
    scope ? arrDraftOf().plan?.[scope.from] : null, key)?.arp?.enabled;
  form.append(renderButton);

  // A bar editor opens in Inherit mode so merely opening and applying it cannot create
  // an empty override. Once somebody actually edits a Note FX control, however, that
  // edit is necessarily meant for these bars; leaving it on Inherit silently threw the
  // change away and made single-bar Note FX appear broken.
  const armBarOverride = () => {
    if (mode) mode.value = 'on';
  };
  for (const control of [strumOn, strumDir, gap, arpOn, arpDir, arpRate, octaves, limit,
    rangeOn, rangeLo, rangeHi,
    repeat, gate, retrigger, latch]) control.addEventListener('input', armBarOverride);

  // Strum and Arpeggiator are one choice — see `shownNoteFx`, and the processor it
  // describes. Switching either on switches the other off rather than leaving a tick on
  // screen the engine was always going to ignore, and whichever effect is off greys the
  // controls that belong to it, so the panel shows one live effect at a time.
  const setLive = (control, live) => {
    control.disabled = !live;
    control.closest('.regcontrol, .regcheck')?.classList.toggle('notefxoff', !live);
  };
  const syncEnabled = () => {
    for (const control of [strumDir, gap]) setLive(control, strumOn.checked);
    for (const control of [arpDir, arpRate, octaves, limit, rangeOn, repeat, gate,
      retrigger, latch]) setLive(control, arpOn.checked);
    // The two ends of the window answer to the tick above them as well as to the arp.
    for (const control of [rangeLo, rangeHi]) setLive(control, arpOn.checked && rangeOn.checked);
  };
  strumOn.addEventListener('input', () => {
    if (strumOn.checked) arpOn.checked = false;
    syncEnabled();
  });
  arpOn.addEventListener('input', () => {
    if (arpOn.checked) strumOn.checked = false;
    syncEnabled();
  });
  rangeOn.addEventListener('input', syncEnabled);
  syncEnabled();
  panel.append(form);

  /** Put a saved Note FX back into the controls, without arming the bar override. */
  const writeFields = (fx) => {
    const next = shownNoteFx(fx);
    setCheck(strumOn, next.strum.enabled);
    strumDir.value = next.strum.direction;
    gap.value = next.strum.gapMs;
    setCheck(arpOn, next.arp.enabled);
    arpDir.value = next.arp.direction;
    arpRate.value = next.arp.rate;
    octaves.value = next.arp.octaves;
    limit.value = next.arp.limit;
    setCheck(rangeOn, next.arp.rangeLimit);
    rangeLo.value = next.arp.rangeLo;
    rangeHi.value = next.arp.rangeHi;
    setCheck(repeat, next.arp.repeat !== false);
    gate.value = next.arp.gate;
    retrigger.value = next.arp.retrigger;
    setCheck(latch, next.arp.latch);
    syncEnabled();
  };

  const playBarScope = () => {
    if (!scope) return;
    selectLane(key);
    markBar(key, scope.from, scope.to);
    jumpTo(scope.from * 16, { start: true, immediate: true });
  };
  const collect = () => ({
    strum: { enabled: strumOn.checked, direction: strumDir.value,
      gapMs: clamp(Number(gap.value) || 0, 0, 250) },
    arp: { enabled: arpOn.checked, direction: arpDir.value,
      rate: clamp(Number(arpRate.value) || 1, 1 / 3, 4),
      octaves: clamp(Math.round(Number(octaves.value) || 1), 1, 4),
      limit: clamp(Math.round(Number(limit.value) || 0), 0, NOTE_FX_LIMIT_MAX),
      rangeLimit: rangeOn.checked,
      rangeLo: clamp(Math.round(Number(rangeLo.value) || NOTE_FX_RANGE_DEFAULT_LO),
        NOTE_FX_RANGE_MIN, NOTE_FX_RANGE_MAX - 12),
      rangeHi: clamp(Math.round(Number(rangeHi.value) || NOTE_FX_RANGE_DEFAULT_HI),
        NOTE_FX_RANGE_MIN + 12, NOTE_FX_RANGE_MAX),
      repeat: repeat.checked,
      gate: clamp(Number(gate.value) || 80, 1, 150), retrigger: retrigger.value,
      latch: latch.checked },
  });
  /** Save what the panel says. Answers whether it took, so Apply & Close can refuse. */
  const applyNoteFx = ({ play = true } = {}) => {
    const next = collect();
    if (scope) {
      const override = mode.value === 'inherit' ? null
        : mode.value === 'off' ? { mode: 'off' } : { mode: 'on', ...next };
      // ---- QUEUE PAST THIS, BUT NOT WHEN IT ENDS IN A SEEK ---------------------
      //
      // Applying Note FX rebuilds the rack and repaints the whole arrangement grid —
      // the DOM-projection class of stall heavy-ui.js exists for, and the one the desk
      // reported as "crackling when changing Note FX". Unwrapped, it held the main
      // thread across the sequencer's whole queue and the hole was audible.
      //
      // The prefill is skipped on the branch that PLAYS, and that is not caution, it is
      // the opposite failure: `playBarScope` seeks, a seek only moves `nextTime`, and
      // notes already booked into the graph still sound. Queueing two seconds ahead of
      // the old position and then jumping would play both. A seek is already a
      // discontinuity, so it is the one gesture that does not need covering.
      const edit = () => applyArrangementEdit(
        setBarNoteFx(arrDraftOf(), scope.from, scope.to, key, override), '');
      const ok = play ? edit() : heavyUi('note fx bars', edit);
      if (!ok) return false;
      if (play) {
        playBarScope();
        toast(`Playing ${targetLabel(key)} from bar ${scope.from + 1} with Note FX — ⌘Z to undo`);
      } else {
        toast(`${targetLabel(key)} Note FX applied to bars ${scope.from + 1}–${scope.to + 1} — ⌘Z to undo`);
      }
    } else {
      // Nothing seeks on this branch, so it takes the armour in full — see above.
      heavyUi('note fx track', () => setTrackNoteFx(key, next));
      toast(`${targetLabel(key)} Note FX applied — ⌘Z to undo`);
    }
    return true;
  };

  renderButton.onclick = () => {
    const draft = arrDraftOf();
    const from = scope?.from ?? 0;
    const to = scope?.to ?? Math.max(0, draft.plan.length - 1);
    // A whole-song render consumes the track arpeggiator outright, so it is retired
    // here rather than suppressed bar by bar. Telling the render that up front is what
    // lets it leave the bars unmarked instead of stamping an arp-off override on
    // every one of them.
    const retireTrackArp = !scope && Boolean(trackDefault.arp?.enabled);
    // Writing an arpeggiator out as notes rewrites every bar it covers and then rebuilds
    // the editors from the result — the heaviest thing this panel can be asked to do. The
    // prefill covers the whole task that follows it, not merely the call it wraps, so
    // `clearTrackArp`'s own rebuild below rides the same queued audio. Skipped on the
    // scoped branch for the reason given in `applyNoteFx`: it ends in a seek.
    const render = () => applyArrangementEdit(
      renderArpToNotes(editBank(), draft, from, to, key, trackDefault,
        { trackArpCleared: retireTrackArp }), '');
    const ok = scope ? render() : heavyUi('note fx render', render);
    if (!ok) return;
    if (retireTrackArp) clearTrackArp(key);
    if (scope) {
      selectLane(key);
      markBar(key, from, to);
      jumpTo(from * 16, { start: true, immediate: true });
      toast(`Playing ${targetLabel(key)} from bar ${from + 1} with rendered Note FX — ⌘Z to undo`);
    } else {
      toast(`${targetLabel(key)} arpeggiator rendered to notes and switched off — ⌘Z to undo`);
      // The panel is now describing an arp that no longer exists. Redraw it from the
      // track it just changed, so Render reads as spent rather than still offered.
      openNoteFxEditor(x, y, key, scope);
    }
  };

  // Four actions, and only two of them touch the song. Cancel and Reset are both ways of
  // undoing this window — one by leaving, one by staying — and Reset is where Clear Note
  // FX went: it used to wipe the setting the instant it was pressed, which made it the
  // one control here that did not wait for an Apply. Now it empties the panel and the
  // Apply beside it is what commits that.
  const foot = document.createElement('div'); foot.className = 'regfoot notefxfoot';
  const cancelButton = document.createElement('button'); cancelButton.textContent = 'Cancel';
  cancelButton.title = 'Close without applying these staged Note FX changes';
  cancelButton.setAttribute('aria-label', cancelButton.title);
  cancelButton.onclick = closeMenu;
  const resetButton = document.createElement('button'); resetButton.textContent = 'Reset';
  resetButton.title = scope
    ? `Stage these bars back to ${targetLabel(key)}'s track Note FX — Apply to commit it`
    : `Empty every Note FX setting for ${targetLabel(key)} — Apply to commit it`;
  resetButton.setAttribute('aria-label', resetButton.title);
  resetButton.onclick = () => {
    writeFields(scope ? trackDefault : {});
    if (mode) mode.value = 'inherit';
  };
  const applyButton = document.createElement('button');
  applyButton.className = `notefxapply${scope ? ' notefxplay' : ''}`;
  applyButton.textContent = scope ? 'Apply + Play' : 'Apply';
  applyButton.title = scope
    ? `Save these Note FX settings and play ${targetLabel(key)} from bar ${scope.from + 1}`
    : `Save ${targetLabel(key)}'s track Note FX without starting playback`;
  applyButton.setAttribute('aria-label', applyButton.title);
  applyButton.onclick = () => applyNoteFx();
  const applyCloseButton = document.createElement('button');
  applyCloseButton.className = 'regapply';
  applyCloseButton.textContent = 'Apply & Close';
  applyCloseButton.title = `Save ${targetLabel(key)}'s Note FX and close this window`;
  applyCloseButton.setAttribute('aria-label', applyCloseButton.title);
  applyCloseButton.onclick = () => {
    if (applyNoteFx({ play: false })) closeMenu();
  };
  foot.append(cancelButton, resetButton, applyButton, applyCloseButton); panel.append(foot);
  panel.style.left = `${x}px`; panel.style.top = `${y}px`; panel.classList.add('show');
  const rect = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(6, Math.min(x, innerWidth - rect.width - 6))}px`;
  panel.style.top = `${Math.max(6, Math.min(y, innerHeight - rect.height - 6))}px`;
}

/** The Note FX panel's sibling in the same window, and the same build cost. */
function openBarEffectsEditor(x, y, key, scope) {
  if (regionPanelBusy()) return undefined;
  return heavyUi('open bar effects', () => buildBarEffectsEditor(x, y, key, scope));
}

// The steps a section can be painted on — the grid's cell, in sixteenths — and the finest
// of them, which is the unit the painted state is kept in whatever the grid is showing, so
// switching from 1/32 to 1/4 and back loses nothing that was painted.
const SECTION_GRIDS = [['1/4', 4], ['1/8', 2], ['1/16', 1], ['1/32', 0.5]];
const CELL = 0.5;
const cloneChain = (chain) => JSON.parse(JSON.stringify(chain || []));
const chainSig = (chain) => JSON.stringify(chain || []);
const chainLabel = (chain) => (chain || []).map((effect) => EFFECT_BY_ID[effect.id]?.short
  || EFFECT_BY_ID[effect.id]?.name || effect.id).join(' + ');
const sixteenthsText = (n) => (n % 4 === 0
  ? `${n / 4} beat${n === 4 ? '' : 's'}`
  : `${n} sixteenth${n === 1 ? '' : 's'}`);
// A slot's own coverage as a strip: its lit runs in the accent, the rest clear.
const coverageStrip = (mask) => {
  const n = mask?.length || 0;
  if (!n) return 'none';
  const stops = [];
  for (let i = 0; i < n;) {
    let j = i + 1;
    while (j < n && !!mask[j] === !!mask[i]) j++;
    stops.push(`${mask[i] ? 'var(--accent)' : 'transparent'} ${((i / n) * 100).toFixed(2)}% ${((j / n) * 100).toFixed(2)}%`);
    i = j;
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
};

/**
 * Spot FX: an effect chain over a stretch of the song, on one track or — under
 * `__master` — on the whole mix (src/data/automation.js, a lane's `fx`).
 *
 * The chain is a column of insert slots on the left, as on a strip — power, name, cross,
 * drag to reorder — with a dashed + under the last one that opens the effect catalogue;
 * the slot that is selected has its card beside the list. WHERE, across the top, is the
 * selected bars as a grid of steps. On ALL EFFECTS, the default, they are the chain's: the
 * whole chain plays where they are lit. On EACH EFFECT every slot has steps of its own and
 * the grid shows the selected one's, so a Bit Crusher can run across all the bars while a
 * tape stop takes only the last beat; the steps the other effects play on are marked
 * faintly, and each slot carries a thin strip of its own coverage. Where several are lit
 * they chain in slot order. A new effect takes the chain's steps, or on EACH EFFECT every
 * step, so selecting bars and adding one is still the whole of the simple case.
 */
function buildBarEffectsEditor(x, y, key, {
  from, to, chain: restoredChain = null, masks: restoredMasks = null, grid: restoredGrid = null,
  selected: restoredSelected = null, selectedId: restoredSelectedId = null, own: restoredOwn = false,
}) {
  closeMenu();
  const panel = $('regionedit'); panel.textContent = ''; panel.classList.add('barfxmodal');
  const master = key === MASTER_KEY;
  // A group bus's sections (`__group:group1`) are a bus lane like the master's: no per-bar
  // snapshots to fall back to, nothing to snapshot from, and not a track to select.
  const group = groupIdOf(key);
  const bus = master || !!group;
  const draft = arrDraftOf();
  const base = from * 16;
  const count = ((to - from + 1) * 16) / CELL;
  const curve = laneCurve(draft.automation?.[key]);
  // What each step of the range plays through now: a section, or on a track the bar's own
  // per-bar snapshot wherever no section covers it — the order the engine reads them in.
  const chainAt = (pos) => fxSectionAt(curve, pos)?.chain
    || (bus ? null : draft.plan?.[Math.floor(pos / 16)]?.inlineFx?.[key]) || null;
  const now = Array.from({ length: count }, (_, i) => chainAt(base + (i + 0.5) * CELL));
  // ---- the chain, and where each of its effects plays ----
  // The window holds ONE list of effects — the slots — and, for each, the steps it plays on.
  // Wherever several are lit they chain in slot order. What the song file gets is a section
  // per stretch where the set that plays changes (see `sections`), so the engine and the
  // format are the same as every other section's.
  //
  // Opened on a range, the sections already there are read back into that form: their chains
  // merged into one list, in order, each effect lit wherever a chain holding it plays. An
  // effect is the same effect wherever its settings are the same. Two chains holding the same
  // effects in different orders keep a second copy of the one out of order — two slots of one
  // name are two places in the chain, which is what the song plays.
  const effectKey = (e) => JSON.stringify([e.id, e.params || {}, !!e.bypass, !!e.mute]);
  const merged = [];
  const picks = new Map();
  for (const c of now) {
    if (!c?.length || picks.has(chainSig(c))) continue;
    const picked = [];
    let last = -1;
    for (const e of c) {
      const k = effectKey(e);
      let at = -1;
      for (let u = last + 1; u < merged.length; u++) {
        if (merged[u].key === k && !picked.includes(merged[u])) { at = u; break; }
      }
      if (at < 0) { at = last + 1; merged.splice(at, 0, { effect: cloneChain([e])[0], key: k }); }
      picked.push(merged[at]);
      last = at;
    }
    picks.set(chainSig(c), picked);
  }
  const fullMask = () => new Array(count).fill(1);
  let chain = merged.map((m) => m.effect);
  let masks = merged.map((m) => now.map((c) => (c?.length && picks.get(chainSig(c)).includes(m) ? 1 : 0)));
  // Every change is written as it is made, so the draft is what this window shows — after a
  // reload, a rebuild or a ⌘Z alike. The one thing the draft cannot hold is an effect lit on
  // no step (it writes nothing), and only that comes back from the stored record. A record
  // from before effects had steps of their own is a chain for an empty range, lit throughout.
  if (Array.isArray(restoredMasks) && Array.isArray(restoredChain)) {
    restoredChain.forEach((effect, i) => {
      if ((restoredMasks[i] || []).some(Boolean)) return;
      if (chain.length >= MAX_EFFECTS) return;
      chain.push(cloneChain([effect])[0]);
      masks.push(new Array(count).fill(0));
    });
  } else if (!chain.length && Array.isArray(restoredChain) && restoredChain.length) {
    chain = cloneChain(restoredChain);
    masks = chain.map(() => fullMask());
  }
  // ALL EFFECTS — the default — paints one set of steps for the whole chain; EACH EFFECT gives
  // every slot its own. Steps that already differ can only be shown the second way.
  const differ = () => masks.some((m) => m.some((v, i) => v !== masks[0][i]));
  let own = restoredOwn === true || differ();
  // A new effect's steps: the chain's while they are shared, otherwise every step.
  const newSteps = () => (!own && masks[0] ? [...masks[0]] : fullMask());
  // The grid opens as fine as what is already there needs, and never coarser than a 1/16.
  let grid = restoredGrid || (masks.some((m) => m.some((v, i) => i % 2 && v !== m[i - 1])) ? 0.5 : 1);
  // Which slot's card is showing. Found again by the effect, not just the place: a rebuild
  // reads the draft, and after an undone reorder the same place holds a different effect.
  let selected = Number.isInteger(restoredSelected) ? restoredSelected : 0;
  if (restoredSelectedId != null && chain[selected]?.id !== restoredSelectedId) {
    const found = chain.findIndex((e) => e.id === restoredSelectedId);
    if (found >= 0) selected = found;
  }
  const remember = () => {
    const popup = restorablePopup();
    if (popup?.kind !== 'barEffects') return;
    popup.chain = cloneChain(chain);
    popup.masks = masks.map((m) => [...m]);
    popup.grid = grid;
    popup.selected = selected;
    popup.selectedId = chain[selected]?.id ?? null;
    popup.own = own;
  };
  setRestorablePopup({ kind: 'barEffects', laneKey: key, from, to, chain: cloneChain(chain),
    masks: masks.map((m) => [...m]), grid, own });
  const span = from === to ? `bar ${from + 1}` : `bars ${from + 1}–${to + 1}`;
  const head = document.createElement('div'); head.className = 'reghead';
  const title = document.createElement('div'); title.className = 'regtitle';
  title.textContent = `Spot FX · ${targetLabel(key)} · ${span}`;
  title.title = 'Changes play as you make them — ⌘Z undoes; a knob drag is one undo';
  const close = document.createElement('button'); close.className = 'regclose'; close.textContent = '×';
  close.title = 'Close — every change is already playing';
  close.setAttribute('aria-label', close.title);
  close.onclick = () => { flush(); closeMenu(); }; head.append(title, close); panel.append(head);

  // ---- live ----
  // Like an insert: what you change is what plays, with nothing to press. `heard` is the
  // chain the engine is playing for these cards — what a knob retunes FROM, so a drag
  // moves the nodes already sounding (tail kept, Stutter not re-grabbed) instead of
  // building a branch per value. A knob writes at most once a frame and its undo steps
  // coalesce on the card's tag; everything else writes at once, as its own ⌘Z.
  let heard = cloneChain(chain);
  let frame = null;
  let frameTag = null;
  // The chains these steps play, one per set of lit effects — what the engine holds a branch
  // for. Read with `list` standing in for the slots, so the same steps give the chains as
  // they were heard and as they are now, pair by pair.
  const playing = (list) => {
    const seen = new Map();
    for (let i = 0; i < count; i++) {
      const lit = masks.map((m) => (m[i] ? 1 : 0)).join('');
      if (!lit.includes('1') || seen.has(lit)) continue;
      seen.set(lit, list.filter((_, e) => masks[e]?.[i]));
    }
    return [...seen.values()];
  };
  const commit = (tag = null) => {
    if (frame != null) { cancelAnimationFrame(frame); frame = null; }
    // A knob moves every chain its effect is in, each on the nodes already playing it.
    const before = heard.length === chain.length ? playing(heard) : [];
    const after = playing(chain);
    const retuned = [];
    if (before.length === after.length) {
      before.forEach((old, n) => {
        if (chainSig(old) !== chainSig(after[n]) && retuneSpotFx?.(key, old, after[n])) retuned.push(n);
      });
    }
    const ok = applyArrangementEdit(setBarSections(arrDraftOf(), from, to, key, sections()), '',
      { undoTag: tag });
    if (ok) heard = cloneChain(chain);
    else for (const n of retuned) retuneSpotFx?.(key, after[n], before[n]);
    remember();
    refreshStatus();
    return ok;
  };
  const commitSoon = (tag) => {
    frameTag = tag;
    if (frame == null) frame = requestAnimationFrame(() => { frame = null; commit(frameTag); });
  };
  const flush = () => { if (frame != null) commit(frameTag); };

  const status = document.createElement('div'); status.className = 'barfxstatus';
  status.setAttribute('aria-live', 'polite');
  const coverage = (mask) => {
    const lit = (mask || []).reduce((n, v) => n + (v ? 1 : 0), 0) * CELL;
    return lit === count * CELL ? `all of ${span}` : lit ? `${sixteenthsText(lit)} of ${span}` : 'no step';
  };
  // Where each effect plays — a long chain names three and counts the rest, rather than
  // growing the window a line an effect.
  const each = () => {
    const all = chain.map((e, i) => `${chainLabel([e])}: ${coverage(masks[i])}`);
    return all.length > 4 ? [...all.slice(0, 3), `${all.length - 3} more`] : all;
  };
  const refreshStatus = () => {
    const place = master ? 'on the whole mix, after the master inserts'
      : group ? `on ${GROUP_BY_ID[group].name}, after its inserts`
        : `on ${targetLabel(key)}, ahead of its own inserts`;
    status.textContent = !chain.length
      ? `No effects yet. Add one with + and it plays across ${span}; then light only the steps it should play on.`
      : own ? `${each().join(' · ')} — ${place}.`
        : `${chainLabel(chain)}: ${coverage(masks[0])} — ${place}.`;
  };

  // ---- where ----
  const where = document.createElement('div'); where.className = 'barfxwhere';
  const whereHead = document.createElement('div'); whereHead.className = 'barfxwherehead';
  const whereName = document.createElement('span'); whereName.textContent = 'Where';
  // Whose steps the grid is: the chain's (ALL EFFECTS) or the selected slot's (EACH EFFECT).
  const modeSeg = document.createElement('div'); modeSeg.className = 'seg barfxmodeseg';
  modeSeg.setAttribute('role', 'group');
  modeSeg.setAttribute('aria-label', 'Whose steps the grid paints');
  const seg = document.createElement('div'); seg.className = 'seg barfxgridseg';
  const rows = document.createElement('div'); rows.className = 'barfxrows';
  const drawGrid = () => {
    for (const button of seg.children) button.classList.toggle('on', Number(button.dataset.size) === grid);
    for (const button of modeSeg.children) {
      const on = (button.dataset.own === '1') === own;
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    // Whose steps these are: the chain's, or the selected slot's.
    const named = own && chain[selected] ? chainLabel([chain[selected]]) : null;
    whereName.textContent = named ? `Where · ${named}` : 'Where';
    const whose = named ? 'the selected effect' : 'the chain';
    rows.setAttribute('aria-label', `Steps of ${span} ${whose} plays on`);
    rows.title = `The steps ${whose} plays on. Click a step to light it or put it out, drag to paint`
      + ` across.${named ? ' Faintly marked steps are where the chain\'s other effects play.' : ''}`
      + ' Effect tails ring on after their steps.';
    for (const [button, tip] of [[fillAll, `Play ${named || 'the chain'} on every step of ${span}`],
      [fillNone, `Take ${named || 'the chain'} off every step of ${span}`]]) {
      button.title = tip;
      button.setAttribute('aria-label', tip);
    }
    rows.textContent = '';
    const per = grid / CELL;
    const perBar = 16 / grid;
    const mine = masks[selected] || null;
    rows.style.setProperty('--cells', perBar);
    rows.classList.toggle('empty', !mine);
    for (let b = 0; b <= to - from; b++) {
      const row = document.createElement('div'); row.className = 'barfxrow';
      const number = document.createElement('span'); number.className = 'barfxbarno';
      number.textContent = String(from + b + 1);
      const strip = document.createElement('div'); strip.className = 'barfxcells';
      for (let j = 0; j < perBar; j++) {
        const first = (b * perBar + j) * per;
        const values = mine ? mine.slice(first, first + per) : [0];
        const value = values.every((v) => v === values[0]) ? values[0] : null;
        const cell = document.createElement('span'); cell.className = 'barfxcell';
        cell.dataset.index = String(first);
        cell.dataset.state = value === 1 ? 'on' : value === 0 ? 'off' : 'mixed';
        // Where the chain's OTHER effects play, so the one being painted is never painted blind.
        if (value !== 1) {
          for (let i = first; i < first + per; i++) {
            if (masks.some((m, e) => e !== selected && m[i])) { cell.dataset.also = '1'; break; }
          }
        }
        if ((j * grid) % 4 === 0) cell.classList.add('beat');
        strip.append(cell);
      }
      row.append(number, strip);
      rows.append(row);
    }
  };
  for (const [name, size] of SECTION_GRIDS) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'segbtn'; button.textContent = name;
    button.dataset.size = String(size);
    button.title = `Paint in ${name} steps`;
    button.onclick = () => { grid = size; drawGrid(); remember(); };
    seg.append(button);
  }
  // Back to ALL EFFECTS from steps that differ: every effect takes the ones on show — the
  // selected effect's. That changes the song, so it is written, and ⌘Z brings them back.
  const setOwn = (value) => {
    if (value === own) return;
    flush();
    own = value;
    if (!own && differ()) {
      const kept = chainLabel([chain[selected]]);
      const steps = masks[selected] || masks[0];
      masks = masks.map(() => [...steps]);
      draw(); commit();
      toast(`Every effect now plays on ${kept}'s steps — ⌘Z to undo`);
      return;
    }
    draw();
  };
  for (const [value, label, tip] of [
    [false, 'All effects', 'One set of steps for the whole chain: every effect plays where the grid is lit'],
    [true, 'Each effect', 'Every effect has steps of its own: select a slot to see and paint where it plays'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'segbtn'; button.textContent = label;
    button.dataset.own = value ? '1' : '0';
    button.title = tip;
    button.onclick = () => setOwn(value);
    modeSeg.append(button);
  }
  // What a stroke paints: the selected effect's steps, or on ALL EFFECTS every effect's.
  const painted = () => (own ? [masks[selected]] : masks).filter(Boolean);
  const fill = (value, label) => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'barfxfill'; button.textContent = label;
    button.onclick = () => {
      if (!masks[selected]) return;
      for (const mine of painted()) mine.fill(value);
      draw(); commit();
    };
    return button;
  };
  const fillAll = fill(1, 'All');
  const fillNone = fill(0, 'None');
  whereHead.append(whereName, modeSeg, seg, fillAll, fillNone);
  // Click a step to light it or put it out, drag to paint the same across — the step grid's
  // own gesture. Captured, so a drag that leaves the grid keeps painting when it comes back.
  let paint = null;
  const paintCell = (el) => {
    if (!el || paint == null || !masks[selected] || !rows.contains(el)) return;
    const first = Number(el.dataset.index);
    for (const mine of painted()) for (let i = first; i < first + grid / CELL; i++) mine[i] = paint;
    el.dataset.state = paint ? 'on' : 'off';
  };
  rows.addEventListener('pointerdown', (ev) => {
    const el = ev.target.closest?.('.barfxcell');
    if (!el || ev.button !== 0 || !masks[selected]) return;
    ev.preventDefault();
    paint = el.dataset.state === 'on' ? 0 : 1;
    paintCell(el);
    try { rows.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
  });
  rows.addEventListener('pointermove', (ev) => {
    if (paint == null) return;
    paintCell(document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.barfxcell'));
  });
  // One stroke, one write, one ⌘Z.
  const endPaint = () => { if (paint == null) return; paint = null; draw(); commit(); };
  rows.addEventListener('pointerup', endPaint);
  rows.addEventListener('pointercancel', endPaint);
  where.append(whereHead, rows);

  // ---- the chain ----
  // Slots on the left, the selected one's card on the right. Every change ends in the same
  // `draw(); commit();` the rest of the window uses, so it plays as it is made.
  const split = document.createElement('div'); split.className = 'barfxsplit';
  const slots = document.createElement('div'); slots.className = 'barfxslots';
  slots.setAttribute('role', 'group');
  slots.setAttribute('aria-label', 'Effect chain, in signal order');
  const cardPane = document.createElement('div'); cardPane.className = 'barfxcard';
  split.append(slots, cardPane);
  // This window's own drag, never the strips': a slot dragged here cannot land on a strip,
  // and a strip's slot cannot land here.
  let dragFrom = null;
  const selectSlot = (i, { focus = false } = {}) => {
    if (!chain.length) return;
    const next = clamp(i, 0, chain.length - 1);
    if (next !== selected) {
      flush();
      selected = next;
      remember(); drawSlots(); drawCard(); drawGrid();
      cardPane.scrollTop = 0;
    }
    if (focus) slots.querySelector('.barfxslot.selected')?.focus({ preventScroll: true });
  };
  const toggleBypass = (i) => { chain[i] = { ...chain[i], bypass: !chain[i].bypass }; draw(); commit(); };
  // The selection follows the effect that was selected, wherever the move puts it.
  const move = (src, dst) => {
    if (src === dst || !chain[src] || dst < 0 || dst >= chain.length) return;
    const keep = chain[selected];
    const [moved] = chain.splice(src, 1);
    chain.splice(dst, 0, moved);
    const [steps] = masks.splice(src, 1);
    masks.splice(dst, 0, steps);
    selected = chain.indexOf(keep);
    draw(); commit();
  };
  const removeAt = (i) => {
    if (!chain[i]) return;
    chain.splice(i, 1);
    masks.splice(i, 1);
    if (i < selected) selected -= 1;
    draw(); commit();
  };
  // At the END of the chain, where the + is drawn — as on a strip — and selected, so its
  // card is the one beside the list.
  const addPicked = (id) => {
    const def = EFFECT_BY_ID[id];
    if (!def || !slots.isConnected) return;   // the window went while the catalogue was up
    if (chain.length >= MAX_EFFECTS) return toast(`A chain holds at most ${MAX_EFFECTS} effects`);
    chain.push({ id: def.id, params: JSON.parse(JSON.stringify(def.defaults || {})) });
    masks.push(newSteps());                       // the chain's steps, or on EACH EFFECT all of them
    selected = chain.length - 1;
    draw(); commit();
    slots.querySelector('.barfxslot.selected')?.focus({ preventScroll: true });
  };
  const drawSlots = () => {
    const focused = slots.contains(document.activeElement);
    slots.textContent = '';
    chain.forEach((effect, index) => {
      const def = EFFECT_BY_ID[effect.id];
      const name = def?.name || effect.id;
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `barfxslot${effect.bypass ? '' : ' on'}${index === selected ? ' selected' : ''}`;
      slot.dataset.idx = String(index);
      if (index === selected) slot.setAttribute('aria-current', 'true');
      slot.title = `${name} — click to edit it\nDrag, or ⌥↑ ⌥↓, to move it · Delete removes it`;
      const power = document.createElement('span'); power.className = 'pwrhit';
      power.append(powerIcon());
      power.title = effect.bypass ? `Turn ${name} on` : `Turn ${name} off`;
      power.onclick = (ev) => { ev.stopPropagation(); toggleBypass(index); };
      const label = document.createElement('span'); label.className = 'fxname';
      label.textContent = name;
      const cross = document.createElement('span'); cross.className = 'rmhit';
      cross.append(closeIcon());
      cross.title = `Remove ${name}`;
      cross.onclick = (ev) => { ev.stopPropagation(); removeAt(index); };
      slot.append(power, label, cross);
      // On EACH EFFECT, a thin strip along the slot's foot: where in the range it plays.
      if (own) {
        const mini = document.createElement('span'); mini.className = 'barfxmini';
        mini.style.background = coverageStrip(masks[index]);
        slot.append(mini);
      }
      slot.onclick = () => selectSlot(index);
      slot.draggable = true;
      slot.addEventListener('dragstart', (ev) => {
        dragFrom = index;
        slot.classList.add('dragging');
        if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', name); }
      });
      slot.addEventListener('dragend', () => {
        dragFrom = null;
        for (const el of slots.children) el.classList.remove('dragging', 'dropzone', 'after');
      });
      slot.addEventListener('dragover', (ev) => {
        if (dragFrom == null || dragFrom === index) return;
        ev.preventDefault();
        slot.classList.add('dropzone');
        slot.classList.toggle('after', dragFrom < index);
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('dropzone', 'after'));
      slot.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const src = dragFrom;
        dragFrom = null;
        if (src != null) move(src, index);
      });
      slots.append(slot);
    });
    const add = document.createElement('button'); add.type = 'button'; add.className = 'barfxaddslot';
    add.textContent = '+';
    const full = chain.length >= MAX_EFFECTS;
    add.disabled = full;
    add.title = full ? `A chain holds at most ${MAX_EFFECTS} effects`
      : 'Add an effect to the end of the chain. Effects with a look-ahead are not offered:'
        + ' switching one in would move the music by it.';
    add.setAttribute('aria-label', full ? add.title : 'Add an effect');
    add.onclick = () => {
      if (closePicker()) return;                     // the + also puts it away
      // Over the card it is about to replace, and only what is on time — EFFECT_LATENCY_MS.
      const pane = cardPane.getBoundingClientRect();
      openPicker({ anchor: add, x: pane.left + 6, y: pane.top + 6,
        ids: SECTION_EFFECTS.map((def) => def.id), onPick: addPicked });
    };
    slots.append(add);
    if (focused) slots.querySelector('.barfxslot.selected')?.focus({ preventScroll: true });
  };
  const drawCard = () => {
    const scrolled = cardPane.scrollTop;
    cardPane.textContent = '';
    const index = selected;
    const effect = chain[index];
    if (!effect) {
      const empty = document.createElement('div'); empty.className = 'devnote barfxempty';
      empty.textContent = 'No effects yet — add one with +.';
      cardPane.append(empty);
      return;
    }
    const def = EFFECT_BY_ID[effect.id];
    const name = def?.name || effect.id;
    const card = document.createElement('div');
    card.className = `device barfxdevice${effect.bypass ? ' bypassed' : ''}`;
    card.dataset.idx = String(index);
    const bar = document.createElement('div'); bar.className = 'devbar';
    const bypass = document.createElement('button');
    bypass.className = `devtoggle${effect.bypass ? '' : ' on'}`;
    bypass.append(powerIcon());
    bypass.title = effect.bypass ? `Turn ${name} on` : `Turn ${name} off`;
    bypass.setAttribute('aria-label', bypass.title);
    bypass.onclick = () => toggleBypass(index);
    const heading = document.createElement('h4'); heading.textContent = name;
    const remove = document.createElement('button'); remove.className = 'devclose';
    remove.append(trashIcon());
    remove.title = `Remove ${name} from this chain`;
    remove.setAttribute('aria-label', remove.title);
    remove.onclick = () => removeAt(index);
    bar.append(bypass, heading, remove); card.append(bar);
    const grid = document.createElement('div'); grid.className = 'devgrid'; card.append(grid);
    fillEffectControls({
      grid, def, entry: effect, rebuild: drawCard,
      patch: (params, tag) => {
        if (!chain[index]) return;
        chain[index] = { ...chain[index], params: { ...(chain[index].params || {}), ...params } };
        commitSoon(tag);
      },
      replaceParams: (params, tag) => {
        if (!chain[index]) return;
        chain[index] = { ...chain[index], params };
        commitSoon(tag);
      },
      // A drag is one ⌘Z, as on an insert card — see pushUndo.
      tag: (part) => (part ? `spotfx:${key}:${from}:${index}:${part}` : null),
      // A section's card: the Filter's SWEEP shows here and nowhere else.
      section: true,
    });
    cardPane.append(card);
    cardPane.scrollTop = scrolled;
  };
  const draw = () => {
    // One mask per effect, whatever replaced the chain (Clear, Snapshot Inserts).
    while (masks.length < chain.length) masks.push(newSteps());
    masks.length = chain.length;
    selected = clamp(selected, 0, Math.max(0, chain.length - 1));
    remember();
    refreshStatus();
    drawSlots();
    drawCard();
    drawGrid();
  };
  // ↑ ↓ choose, ⌥↑ ⌥↓ move, Home and End, Delete (or the Mac's Backspace) removes.
  slots.addEventListener('keydown', (ev) => {
    const at = Number(ev.target.closest?.('.barfxslot')?.dataset.idx);
    if (!Number.isInteger(at)) return;
    const step = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
    if (step && ev.altKey) { selectSlot(at); move(at, at + step); slots.querySelector('.barfxslot.selected')?.focus(); }
    else if (step) selectSlot(at + step, { focus: true });
    else if (ev.key === 'Home' || ev.key === 'End') selectSlot(ev.key === 'Home' ? 0 : chain.length - 1, { focus: true });
    else if (ev.key === 'Delete' || ev.key === 'Backspace') removeAt(at);
    else return;
    ev.preventDefault();
    ev.stopPropagation();
  });
  panel.append(where, split); draw();
  // The window's own keys. Delete and Backspace never reach the desk while it has focus —
  // with a bar range selected behind it, the desk would erase that range's notes. Escape
  // puts the catalogue away first, then closes whichever window this is.
  panel.onkeydown = (ev) => {
    if (ev.key === 'Delete' || ev.key === 'Backspace') ev.stopPropagation();
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    if (!closePicker()) panel.querySelector('.reghead .regclose')?.click();
  };

  /**
   * The painted steps as sections: one per run of steps where the same effects are lit, each
   * holding those effects in slot order. Bit Crusher across a bar and a tape stop on its last
   * beat is two — the Crusher alone, then the Crusher into the Stutter — and the second is a
   * section of its own, so the Stutter grabs where its beat starts.
   */
  const sections = () => {
    const out = [];
    const litAt = (i) => masks.map((m) => (m[i] ? 1 : 0)).join('');
    for (let i = 0; i < count;) {
      const lit = litAt(i);
      let j = i + 1;
      while (j < count && litAt(j) === lit) j++;
      const sub = chain.filter((_, e) => masks[e][i]);
      if (sub.length) out.push({ from: base + i * CELL, to: base + j * CELL, chain: cloneChain(sub) });
      i = j;
    }
    return out;
  };

  const foot = document.createElement('div'); foot.className = 'regfoot barfxfoot';
  const snapshot = document.createElement('button'); snapshot.textContent = 'Snapshot Inserts';
  snapshot.title = 'Copy this channel’s current insert chain into these cards';
  snapshot.setAttribute('aria-label', snapshot.title);
  snapshot.onclick = () => {
    chain = JSON.parse(JSON.stringify(effectsOf(key).slice(0, MAX_EFFECTS)));
    masks = chain.map(() => newSteps());
    draw(); commit();
  };
  const clear = document.createElement('button'); clear.textContent = 'Clear';
  clear.title = 'Remove every effect from these cards';
  clear.setAttribute('aria-label', clear.title);
  clear.onclick = () => { chain = []; masks = []; draw(); commit(); };
  const closeButton = document.createElement('button'); closeButton.textContent = 'Close';
  closeButton.title = 'Close — every change is already playing';
  closeButton.setAttribute('aria-label', closeButton.title);
  closeButton.onclick = () => { flush(); closeMenu(); };
  const play = document.createElement('button'); play.className = 'regapply barfxplay';
  play.textContent = '▶ Play';
  play.title = `Jump to bar ${from + 1} and play ${master ? 'the song' : targetLabel(key)} from there`;
  play.setAttribute('aria-label', play.title);
  // Every press jumps, playing or not: it is how you hear the same spot again.
  play.onclick = () => {
    flush();
    if (!bus) {
      selectLane(key);
      markBar(key, from, to);
    }
    jumpTo(from * 16, { start: true, immediate: true });
  };
  foot.append(...(bus ? [] : [snapshot]), clear, closeButton, play);
  panel.append(status, foot);
  panel.style.left = `${x}px`; panel.style.top = `${y}px`; panel.classList.add('show');
  const rect = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(6, Math.min(x, innerWidth - rect.width - 6))}px`;
  panel.style.top = `${Math.max(6, Math.min(y, innerHeight - rect.height - 6))}px`;
}

export { openNoteFxEditor, openBarEffectsEditor };
