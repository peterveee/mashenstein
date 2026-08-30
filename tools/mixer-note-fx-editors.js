// Note FX and Bar Effects — the two editors that hang off a bar or a track.
//
// Lifted out of mixer-entry.js. Note FX is the strum and the arpeggiator: what a lane
// does to the notes it was given, as opposed to what it sounds like. Bar Effects is the
// insert chain a range of bars carries on top of the channel's. They travel together
// because they are the same window with two contents — the same anchor, the same
// restore-on-rebuild handling, the same scope of "this track, or these bars".
//
// Both are handed the desk they edit; neither reaches for it.

import {
  resolveNoteFx, NOTE_FX_RANGE_MIN, NOTE_FX_RANGE_MAX, NOTE_FX_LIMIT_MAX,
} from '../src/engine/note-fx.js';
import { EFFECTS, EFFECT_BY_ID, MAX_EFFECTS } from '../src/engine/effects.js';
import { setBarNoteFx, setBarEffects, renderArpToNotes } from './lib/arrangement-edit.js';
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
  powerIcon, trashIcon, effectsOf, arrDraftOf, editBank,
  restorablePopup, setRestorablePopup;

/** Hand the two editors the desk they edit. */
export function installNoteFxEditors(deps) {
  ({
    targetLabel, closeMenu, clamp, toast, gap, selectLane, markBar, jumpTo,
    applyArrangementEdit, regionPanelBusy, noteFxFor, setTrackNoteFx, clearTrackArp,
    powerIcon, trashIcon, effectsOf, arrDraftOf, editBank,
    restorablePopup, setRestorablePopup,
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

function buildBarEffectsEditor(x, y, key, { from, to, chain: restoredChain = null }) {
  closeMenu();
  const panel = $('regionedit'); panel.textContent = ''; panel.classList.add('barfxmodal');
  let chain = JSON.parse(JSON.stringify(restoredChain
    || arrDraftOf().plan?.[from]?.inlineFx?.[key] || []));
  setRestorablePopup({ kind: 'barEffects', laneKey: key, from, to, chain });
  const head = document.createElement('div'); head.className = 'reghead';
  const title = document.createElement('div'); title.className = 'regtitle';
  title.textContent = `Bar Effects · ${targetLabel(key)} · bars ${from + 1}–${to + 1}`;
  const close = document.createElement('button'); close.className = 'regclose'; close.textContent = '×';
  close.title = 'Close without applying these staged changes';
  close.setAttribute('aria-label', 'Close without applying these staged changes');
  close.onclick = closeMenu; head.append(title, close); panel.append(head);

  const form = document.createElement('div'); form.className = 'regcontrols barfxcontrols';
  const list = document.createElement('div'); list.className = 'barfxlist';
  const status = document.createElement('div'); status.className = 'barfxstatus';
  const chainNames = () => chain.map((effect) => EFFECT_BY_ID[effect.id]?.short
    || EFFECT_BY_ID[effect.id]?.name || effect.id).join(' + ');
  const refreshStatus = () => {
    status.textContent = chain.length
      ? `${chainNames()} replaces the channel inserts only in bars ${from + 1}–${to + 1}.`
        + ' Apply + Play saves it, starts at this range, and leaves this window open.'
      : `No bar insert is active in bars ${from + 1}–${to + 1}. The normal channel plays there.`;
  };
  const rememberChain = () => {
    if (restorablePopup()?.kind === 'barEffects') {
      restorablePopup().chain = JSON.parse(JSON.stringify(chain));
    }
  };
  const draw = () => {
    rememberChain();
    refreshStatus();
    list.textContent = '';
    if (!chain.length) {
      const empty = document.createElement('div'); empty.className = 'devnote';
      empty.textContent = 'No bar effects. Later bars use the normal channel and any tail from this chain can finish.';
      list.append(empty);
    }
    chain.forEach((effect, index) => {
      const def = EFFECT_BY_ID[effect.id];
      const name = def?.name || effect.id;
      const card = document.createElement('div');
      card.className = `device barfxdevice${effect.bypass ? ' bypassed' : ''}`;
      card.dataset.idx = String(index);
      const bar = document.createElement('div'); bar.className = 'devbar';
      const bypass = document.createElement('button');
      bypass.className = `devtoggle${effect.bypass ? '' : ' on'}`;
      bypass.append(powerIcon());
      bypass.title = effect.bypass ? `Enable ${name}` : `Bypass ${name}`;
      bypass.setAttribute('aria-label', bypass.title);
      bypass.onclick = () => { chain[index] = { ...chain[index], bypass: !effect.bypass }; draw(); };
      const heading = document.createElement('h4'); heading.textContent = name;
      const up = document.createElement('button'); up.className = 'barfxmove'; up.textContent = '↑';
      up.disabled = index === 0; up.title = `Move ${name} earlier in the chain`;
      up.setAttribute('aria-label', up.title);
      up.onclick = () => {
        if (index <= 0) return;
        [chain[index - 1], chain[index]] = [chain[index], chain[index - 1]]; draw();
      };
      const down = document.createElement('button'); down.className = 'barfxmove'; down.textContent = '↓';
      down.disabled = index === chain.length - 1; down.title = `Move ${name} later in the chain`;
      down.setAttribute('aria-label', down.title);
      down.onclick = () => {
        if (index >= chain.length - 1) return;
        [chain[index], chain[index + 1]] = [chain[index + 1], chain[index]]; draw();
      };
      const remove = document.createElement('button'); remove.className = 'devclose';
      remove.append(trashIcon());
      remove.title = `Remove ${name} from this bar effect snapshot`;
      remove.setAttribute('aria-label', remove.title);
      remove.onclick = () => { chain.splice(index, 1); draw(); };
      bar.append(bypass, heading, up, down, remove); card.append(bar);
      const grid = document.createElement('div'); grid.className = 'devgrid'; card.append(grid);
      fillEffectControls({
        grid, def, entry: effect, rebuild: draw,
        patch: (params) => {
          if (!chain[index]) return;
          chain[index] = { ...chain[index], params: { ...(chain[index].params || {}), ...params } };
          rememberChain();
        },
        replaceParams: (params) => {
          if (!chain[index]) return;
          chain[index] = { ...chain[index], params };
          rememberChain();
        },
      });
      list.append(card);
    });
  };
  form.append(status, list);
  const addRow = document.createElement('label'); addRow.className = 'regcontrol';
  const addName = document.createElement('span'); addName.textContent = 'Add effect';
  const picker = document.createElement('select');
  picker.add(new Option('Choose an effect…', ''));
  for (const def of EFFECTS) picker.add(new Option(def.name, def.id));
  const add = document.createElement('button'); add.textContent = 'Add';
  add.disabled = true;
  picker.onchange = () => { add.disabled = !picker.value; };
  add.onclick = () => {
    if (chain.length >= MAX_EFFECTS) return toast(`A bar holds at most ${MAX_EFFECTS} effects`);
    const def = EFFECT_BY_ID[picker.value];
    if (def) chain.push({ id: def.id, params: JSON.parse(JSON.stringify(def.defaults || {})) });
    draw();
  };
  add.title = 'Add the selected effect to the end of this bar effect snapshot';
  add.setAttribute('aria-label', add.title);
  const addHelp = document.createElement('div'); addHelp.className = 'barfxhelp';
  addHelp.textContent = 'Add creates an editable card. Changes remain staged until Apply.';
  addRow.append(addName, picker, add, addHelp); form.append(addRow); panel.append(form); draw();

  const foot = document.createElement('div'); foot.className = 'regfoot barfxfoot';
  const snapshot = document.createElement('button'); snapshot.textContent = 'Snapshot Inserts';
  snapshot.title = 'Copy this channel’s current insert chain into the bar snapshot';
  snapshot.setAttribute('aria-label', snapshot.title);
  snapshot.onclick = () => { chain = JSON.parse(JSON.stringify(effectsOf(key).slice(0, MAX_EFFECTS))); draw(); };
  const clear = document.createElement('button'); clear.textContent = 'Clear';
  clear.title = 'Remove every effect from this bar snapshot';
  clear.setAttribute('aria-label', clear.title);
  clear.onclick = () => { chain = []; draw(); };
  const closeButton = document.createElement('button'); closeButton.textContent = 'Close';
  closeButton.title = 'Close without applying these staged bar-effect changes';
  closeButton.setAttribute('aria-label', closeButton.title);
  closeButton.onclick = closeMenu;
  const applyPlay = document.createElement('button'); applyPlay.className = 'regapply barfxplay';
  applyPlay.textContent = 'Apply + Play';
  applyPlay.title = `Save these effects and play ${targetLabel(key)} from bar ${from + 1}`;
  applyPlay.setAttribute('aria-label', applyPlay.title);
  applyPlay.onclick = () => {
    const ok = applyArrangementEdit(setBarEffects(arrDraftOf(), from, to, key, chain), '');
    if (!ok) return;
    selectLane(key);
    markBar(key, from, to);
    jumpTo(from * 16, { start: true, immediate: true });
    toast(`Playing ${targetLabel(key)} from bar ${from + 1} with ${chain.length || 'no'} bar effects — ⌘Z to undo`);
  };
  const guide = document.createElement('div'); guide.className = 'barfxguide';
  guide.innerHTML = '<span><strong>Per-bar insert</strong> replaces the channel inserts only while these bars play.</span>'
    + '<span><strong>Apply + Play</strong> saves the snapshot, starts here, and keeps this window open.</span>'
    + '<span><strong>Snapshot Inserts</strong> replaces these cards with a copy of the channel chain.</span>'
    + '<span><strong>Power / arrows</strong> bypass and reorder the staged chain.</span>'
    + '<span><strong>Close</strong> discards staged changes.</span>'
    + '<span><strong>Effect tails</strong> may continue after the selected bars.</span>';
  foot.append(snapshot, clear, closeButton, applyPlay);
  panel.append(guide, foot);
  panel.style.left = `${x}px`; panel.style.top = `${y}px`; panel.classList.add('show');
  const rect = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(6, Math.min(x, innerWidth - rect.width - 6))}px`;
  panel.style.top = `${Math.max(6, Math.min(y, innerHeight - rect.height - 6))}px`;
}

export { openNoteFxEditor, openBarEffectsEditor };
