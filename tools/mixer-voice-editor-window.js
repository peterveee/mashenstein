// The preset editor, as a window.
//
// Lifted out of mixer-entry.js. It is ALWAYS a window — opened from a channel's menu as
// much as from the preset library. It used to be a rack item beside the strip that
// opened it, and that is the thing the strip has given up: see `stripMenu` on the desk,
// and `placeVoiceEditor` below for what replaced the pair.
//
// It writes nothing of the desk's own: every function here places a window, reads which
// preset a lane is on, or hands a change back through `editMix`/`rebank`, which are the
// desk's. That is why the seam below is all inputs and only three names come back.

import { VOICES, seamFor, defaultVoiceOf } from '../src/data/voices.js';
import { isQuickVoice } from './mixer-voice-editor.js';

const $ = (id) => document.getElementById(id);

// ---- the seam ---------------------------------------------------------------
// `trackId`, `track` and `voiceLibrary` are thunks: the first two the desk reassigns as
// songs change, and the library is built a few lines AFTER this, so asking is the only
// way to be sure of an answer.
let voiceEditor, voiceEditEl, laneVoiceId, dismissVoiceEditor, clamp, editMix, rebank,
  applyToEngine, mixFor, trackId, targetLabel, toast, voiceLibrary, dockIntoLibrary,
  track, closeMenu, selectLane;

/** Hand the window the desk it floats over. */
export function installVoiceEditorWindow(deps) {
  ({
    voiceEditor, voiceEditEl, laneVoiceId, dismissVoiceEditor, clamp, editMix, rebank,
    applyToEngine, mixFor, trackId, targetLabel, toast, voiceLibrary, dockIntoLibrary,
    track, closeMenu, selectLane,
  } = deps);
  // Bound here rather than at module scope: the element arrives with the deps.
  // Dragged by its header, like every other window here. Delegated from the panel rather
  // than bound to the header, because `build()` replaces the header on every repaint — a
  // listener on the header itself would survive exactly until the first slider moved.
  voiceEditEl.addEventListener('pointerdown', (ev) => {
    if (!voiceEditEl.classList.contains('vefloat')) return;
    const head = ev.target.closest('.vehead');
    if (!head || ev.target.closest('button, input, select, textarea')) return;
    ev.preventDefault();
    const r = voiceEditEl.getBoundingClientRect();
    const dx = ev.clientX - r.left;
    const dy = ev.clientY - r.top;
    const move = (e) => placeFloatingEditor(e.clientX - dx, e.clientY - dy);
    const stop = () => { head.removeEventListener('pointermove', move); head.classList.remove('dragging'); };
    head.classList.add('dragging');
    try { head.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', stop, { once: true });
    head.addEventListener('pointercancel', stop, { once: true });
  });
}

//
// It is ALWAYS a window now — opened from a channel's menu as much as from the preset
// library. It used to be a rack item beside the strip that opened it, and that is the
// thing the strip has given up: see `stripMenu`, and `placeVoiceEditor` for what
// replaced the pair.

const VE_POS_KEY = 'mash-mixer-voiceedit-pos';

/** Put the floating editor somewhere on the screen, and remember where. */
function placeFloatingEditor(x, y) {
  const el = voiceEditEl;
  if (x == null) {
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(VE_POS_KEY) || 'null'); } catch { pos = null; }
    const r = el.getBoundingClientRect();
    // First open: to the right of the library window, which opens centred — so the two
    // are side by side rather than the editor landing on top of the list it came from.
    x = pos?.x ?? Math.max(4, innerWidth - r.width - 40);
    y = pos?.y ?? 120;
  }
  const { left, top } = clampFloatingEditor(x, y);
  localStorage.setItem(VE_POS_KEY, JSON.stringify({ x: left, y: top }));
}

/**
 * Put the window at x/y, pulled back on screen — and remember NOTHING.
 *
 * The split from `placeFloatingEditor` is which positions count as a choice. Dragging
 * the header is a choice and is remembered; being re-placed by a repaint, or centred on
 * open, is the desk moving its own furniture, and writing either of those to `VE_POS_KEY`
 * would quietly overwrite where the user last put it.
 */
function clampFloatingEditor(x, y) {
  const el = voiceEditEl;
  const r = el.getBoundingClientRect();
  const left = clamp(x, 4, Math.max(4, innerWidth - r.width - 4));
  const top = clamp(y, 4, Math.max(4, innerHeight - r.height - 4));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  return { left, top };
}

/**
 * Open the window where the click that asked for it was.
 *
 * It used to be hung off an ELEMENT — the channel strip, and then the arrangement row —
 * and neither reads as "here": the strip is a hundred-pixel column at the bottom of the
 * desk, the row's name is at the far left, and a window placed against either one lands
 * a long way from the hand that asked for it. The pointer is the honest answer, and it is
 * the same answer for every door into the editor: a right-click on a strip puts the panel
 * beside that strip because that is where you clicked, and the track panel's own buttons
 * put it beside the track panel for the same reason.
 *
 * Just off the pointer, flipped to its other side where the window will not fit, and
 * clamped from there — so a strip clicked at the bottom of the screen gets a panel that
 * rides up to fit rather than one hanging off the edge. `x`/`y` missing means nobody
 * clicked: the tour and a restored session both arrive that way, and the middle of the
 * screen is the only honest answer to "where did this come from".
 */
const EDITOR_POINTER_GAP = 12;
function placeEditorAtPointer(at) {
  const r = voiceEditEl.getBoundingClientRect();
  if (!at || at.x == null || at.y == null) {
    clampFloatingEditor((innerWidth - r.width) / 2, (innerHeight - r.height) / 2);
    return;
  }
  const right = at.x + EDITOR_POINTER_GAP;
  const left = right + r.width <= innerWidth ? right : at.x - EDITOR_POINTER_GAP - r.width;
  clampFloatingEditor(left, at.y);
}


/**
 * Keep the editor pointed at whatever its lane is actually playing.
 *
 * The panel edits ONE preset, beside ONE strip, drawn as a single object with it — so
 * the moment the lane is put on something else, every control on it is aimed at a
 * sound nothing on screen is making. It follows the lane instead: onto the new preset
 * where there is one to open, and off the desk entirely where there is not — the
 * engine's own voice has no entry behind it at all, and an engine preset is a bundle
 * of bank keys the hand-written lane reads rather than a synth, which is why `open`
 * refuses one.
 *
 * Following RE-OPENS rather than re-labels. `open` takes the sound it finds as the
 * baseline, and the baseline belongs to the preset you have arrived at, not the one
 * you left — otherwise Revert on the new preset would put back the old one's shape.
 * Edits made to the preset you left are still on it: the editor mutates the catalogue
 * entry in place, so stepping back onto it finds them.
 *
 * Returns true only when the panel CLOSED, because that is the case the caller has to
 * repaint for: the panel and its strip share a wrapper and the wrapper has to go.
 * Following needs no repaint — `build` refills the panel where it already sits, which
 * is what keeps the ‹ › audition loop from losing the hover under the pointer.
 */
function syncVoiceEditorToLane(laneKey, { autoCopy = true } = {}) {
  // Standalone Advanced deliberately hides the compact panel behind it. That does not
  // mean the editor has let go of the lane: the full window still reads and writes the
  // same state.voice, and a preset chosen in its own title bar must move that state onto
  // the lane's new song-local copy. Treating only the compact panel's `show` class as
  // ownership changed the lane but left Advanced editing the detached previous object.
  if ((!voiceEditor.isOpen() && !voiceEditor.fullOpen)
      || !laneKey || voiceEditor.laneKey !== laneKey) return false;
  let chosen = laneVoiceId(laneKey);
  let preset = chosen && VOICES[chosen];
  if (!preset || preset.kind === 'engine') { dismissVoiceEditor(); return true; }
  // Auto-copy a library preset into the song so the editor never mutates the shared
  // catalogue through a lane strip. A normal lane choice always copies; the explicit
  // `autoCopy: false` exception is only safe when the lane already points at the editor's
  // current PRESET (the Save-as-New handoff, where the panel is already holding the very
  // object the lane was just put on). If the choice changed, copy it even in that mode,
  // otherwise opening can be refused by the library guard and leave the old Quick surface
  // attached to the new, detailed synth.
  const choiceChanged = chosen !== voiceEditor.editing || preset !== voiceEditor.voice;
  if (!preset.songLocal && (autoCopy || choiceChanged)) {
    const seam = seamFor(laneKey);
    if (seam) {
      editMix((m) => {
        m.voiceParams = { ...(m.voiceParams || {}), [seam.voiceKey]: JSON.parse(JSON.stringify(preset)) };
      });
      rebank();
      applyToEngine(mixFor(trackId()));
      chosen = laneVoiceId(laneKey);
      preset = VOICES[chosen];
    }
  }
  // Still on it only if the panel is holding the very OBJECT the lane plays.
  //
  // THE BUG THIS PINS: a song-local copy is keyed by lane and song — `bassVoice@neon` —
  // so the id does not move when you put the lane on a different preset. The copy of the
  // new choice is registered under that same id, as a NEW object, and an id comparison
  // read that as "already on it" and returned before the re-open. The panel went on
  // drawing the object it was handed when it opened: pick MRDR-3 while the strip's editor
  // was on a DuoSynth and you got DuoSynth's Note/detailed cards over an MRDR-3 lane, no
  // Quick macros and no ADVANCED — and the same in reverse, MRDR-3's Quick surface over a
  // DuoSynth. Both surfaces are resolved from `state.voice` at build time and were
  // correct; nothing ever rebuilt. See the `voice` getter on the editor.
  if (chosen === voiceEditor.editing && preset === voiceEditor.voice) return false;
  // A REFUSED open is the state this whole function exists to prevent.
  //
  // `open` turns a preset away for reasons that have nothing to do with the lane — a
  // library sound the copy above could not make song-local because the lane has no seam
  // to hold one, an entry that has gone from the catalogue between the choice and here.
  // Refused, the panel would keep drawing the preset you LEFT: MRDR-3's Quick macros on
  // a strip now playing a KNDO-5, an ADVANCED button onto a window with no layout
  // behind it, and every pot aimed at a sound nothing is making. There is no surface to
  // fall back to in that case, so the editor comes off the desk instead — and `forget`
  // takes the full window with it. The caller repaints, which is what the `true` says.
  if (!voiceEditor.open(chosen, { laneKey, laneLabel: targetLabel(laneKey) })) {
    dismissVoiceEditor();
    return true;
  }
  return false;
}

/**
 * Keep the editor on screen, wherever the desk repaints around it.
 *
 * IT IS A WINDOW, NOT A RACK ITEM. It used to be one: the panel was inserted into the
 * rack beside the strip that opened it, the two wrapped in a `.voicepair` that took the
 * border and drew one shared header over both halves, so an edited channel simply got
 * wider. That is gone with the strip's » — a channel is about a hundred pixels wide and
 * the editor is three of them, so opening one shoved the rest of the rack sideways, tied
 * the panel's height to whatever rung the shrink ladder was standing on, and put the
 * controls at the bottom of the screen because that is where the rack is. Centred, it is
 * in the same place every time and the rack does not move at all.
 *
 * What survives from the rack-item days is why the ELEMENT is held in a variable rather
 * than rebuilt: `buildRack` used to detach it on every repaint, and keeping the node
 * meant keeping its inputs and their focus. It is parked on the body now, so a repaint
 * cannot touch it — but a save or a rename still calls through here, and re-placing
 * rather than rebuilding is still what keeps the caret in the name field.
 *
 * A lane that has gone — deleted, or filtered out of the view — leaves the editor
 * describing a channel that is not there, so it closes.
 */
function placeVoiceEditor() {
  const el = voiceEditEl;
  const laneKey = voiceEditor.laneKey;
  if (!voiceEditor.isOpen()) { el.remove(); return; }
  // Inside the library, if it is open: that window has a slot down its right side and
  // the three panels are one workspace. Only ever a lane-free editor — the library is
  // where you browse the catalogue, and a channel's preset is a song's own copy.
  if (!laneKey && voiceLibrary().slots) { dockIntoLibrary(); return; }
  // Not `close()`: this runs FROM buildRack, and close rebuilds the rack. Tearing the
  // panel down without asking for another repaint is the whole difference between
  // closing an editor and re-entering the function that is already running.
  if (laneKey && !document.querySelector(`.strip[data-lane="${CSS.escape(laneKey)}"]`)) {
    dismissVoiceEditor();
    return;
  }
  if (el.parentElement !== document.body) document.body.append(el);
  el.classList.remove('vedocked');
  el.classList.add('vefloat');
  // Where it already is, clamped back on screen — not re-placed. This runs on every
  // repaint, and a window that jumped back to the last pointer position each time a fader
  // moved would be unusable. `placeEditorAtPointer` is called once, by whatever opened it.
  const r = el.getBoundingClientRect();
  if (laneKey) clampFloatingEditor(r.left, r.top); else placeFloatingEditor();
}

/**
 * Open the editor on a lane's chosen preset.
 *
 * It used to take an `isNew` option, for a menu item that opened the editor already
 * forked onto a copy. The editor has its own **Save as new**, which is the same gesture
 * at the moment you want it — after you have moved something and decided to keep it —
 * so the option had no caller left and is gone rather than left as a branch nothing
 * takes. The editor's own `state.isNew` is unaffected: that is what its Save as new sets.
 *
 * WHICH SURFACE IT LANDS ON. Every family accepted by `isQuickVoice` has both, and
 * `advanced` says which one was asked for:
 *
 *   undefined  the caller has no opinion, so the preset decides: a drum goes to the full
 *              window, because its Quick surface is eight pots of a kit that has
 *              hundreds, and everything else gets the small panel. The tour is the last
 *              caller that asks this way.
 *   true       the full window, standalone — nothing behind it.
 *   false      the small Simple panel, on a drum as much as on anything else.
 *
 * The track panel and the channel menu pass it explicitly on both of their items, so
 * **Edit Simple** and **Edit Advanced** each do exactly what they are called. A preset
 * with only one surface ignores it; there is nothing else to open.
 *
 * Either way the window opens at the POINTER — `at` is the click that asked for it, and
 * `placeEditorAtPointer` is where it lands.
 */
function editVoice(laneKey, { advanced, at = null } = {}) {
  let chosen = laneVoiceId(laneKey);
  // A GENERATED SONG NAMES ITS INSTRUMENTS IN THE BANK, NOT IN THE MIX.
  //
  // `bassVoice: 'stRoundMono'` is written into the composition by the style pack — see
  // `resolveDefault` — so the desk reads it back for the strip's heading and the picker
  // shows it as what the lane is on, but `laneVoiceId` has nothing to return: the mix
  // names no preset and holds no copy. That made every lane of every new song answer
  // the pen with "this lane is on the engine's own voice", which is both wrong and a
  // dead end — the sound has a name on the strip, and there was no way to edit it short
  // of picking some other preset first.
  //
  // The bank's own name is the answer, and the fork below turns it into the song's copy
  // exactly as it does for one chosen from the picker. That is also what makes a FROZEN
  // STARTER editable: it is immutable in the catalogue on purpose, and a song-local copy
  // is not the catalogue — `registerSongVoice` clears the flag, and Save can only ever
  // put it in the library under a new name.
  const named = chosen ? null : defaultVoiceOf(track()?.bank, laneKey);
  // An ENGINE preset is the exception this message was written for, and stays it: it is
  // a bundle of the bank keys the hand-written voice reads rather than a synth, so there
  // is nothing for the editor to draw. See `open` in the editor, which refuses one too.
  const source = chosen ? VOICES[chosen] : (named?.kind === 'engine' ? null : named);
  // Only when the lane names nothing at all. A mix pointed at an id the catalogue no
  // longer holds is a different failure, and `open` has the words for it.
  if (!chosen && !source) {
    // Nothing to copy and nothing to edit. The engine's own voice is not a preset —
    // it is what plays when no preset is named — so there is no entry behind it.
    toast('This lane is on the engine’s own voice. Choose a preset first, then edit it'
      + ' — or copy one into a new preset.');
    return;
  }
  // Opening the editor from a lane always works on a song-local copy. The library
  // preset is never mutated through a channel strip — edit it from the library
  // browser if you mean to change it for every song.
  if (source && !source.songLocal && source.kind !== 'engine') {
    const seam = seamFor(laneKey);
    if (seam) {
      editMix((m) => {
        m.voiceParams = { ...(m.voiceParams || {}), [seam.voiceKey]: JSON.parse(JSON.stringify(source)) };
      });
      rebank();
      applyToEngine(mixFor(trackId()));
      chosen = laneVoiceId(laneKey);  // now returns the song-local id
    }
  }
  // The fork is the only way a bank-named preset becomes something the editor can open,
  // so a lane with no seam to hold the copy has to say so rather than open on nothing.
  if (!chosen) {
    toast(`${source?.label ?? 'That sound'} is named by the song itself, and this lane has`
      + ' nowhere to keep its own copy — so there is nothing here to edit.');
    return;
  }
  closeMenu();
  selectLane(laneKey);
  // Whether there is a second surface to ask for at all. Both windowed branches below
  // are gated on it, so `advanced: true` on a preset that has only the one panel opens
  // that panel rather than nothing.
  const hasAdvanced = isQuickVoice(VOICES[chosen]);
  const strip = document.querySelector(`.strip[data-lane="${CSS.escape(laneKey)}"]`);
  // BOTH WINDOWS OPEN AT THE POINTER, not against an element. `at` is where the click
  // that asked for them was — see `placeEditorAtPointer`, and the `at` branch of the full
  // window's own `open`. Every caller that has a pointer hands it over; the ones that do
  // not (the tour, a restored session) get the middle of the screen.
  //
  // Already open on this very preset: leave it where it is and stop. Re-opening would
  // call `open` again, which takes the CURRENT sound as the baseline — so a second ask
  // for the editor would quietly make your unsaved edits the thing Revert goes back to.
  if (voiceEditor.isOpen() && voiceEditor.laneKey === laneKey
      && voiceEditor.editing === chosen) {
    // Except when the full window is what was asked for and it is not up yet — then the
    // panel already being open is no reason to refuse. Not `standalone`: there IS a
    // panel behind this one, it was there first, and closing the window should reveal it
    // rather than put the preset down.
    if (advanced && hasAdvanced && !voiceEditor.fullOpen) {
      voiceEditor.openFull(1, { at, avoidTransport: true });
      return;
    }
    return;
  }
  if (!voiceEditor.open(chosen, { laneKey, laneLabel: targetLabel(laneKey) })) return;
  const fullEngine = VOICES[chosen]?.kind === 'drum' ? 'drum' : VOICES[chosen]?.synth;
  // Straight to the full window with nothing docked behind it. `standalone` is what
  // says so: closing the window puts the preset down, rather than uncovering a panel
  // the user never asked to open. A drum takes this route on its own — see the note on
  // `advanced` above — and `advanced: false` is the one thing that overrules it.
  if (strip && ((fullEngine === 'drum' && advanced !== false) || (advanced && hasAdvanced))) {
    voiceEditEl.classList.remove('show');
    voiceEditor.openFull(1, { standalone: true, at, avoidTransport: true });
    return;
  }
  placeVoiceEditor();
  placeEditorAtPointer(at);
}

export { editVoice, syncVoiceEditorToLane, placeVoiceEditor };
