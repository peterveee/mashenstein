// Track preset selector. Shared facets browse sounds; this host owns lane eligibility and assignment.

import { registerPresetWindow, bringPresetWindowToFront } from './lib/preset-window-stack.js';
import {
  VOICES, VOICE_LANES, seamFor, isLayer, baseLane, defaultVoiceOf, isKitVoice,
  PERCUSSION_LANES, defaultAddedVoice,
} from '../src/data/voices.js';
import { offeredVoices } from '../src/data/voices-in-play.js';
import { createPresetBrowser } from './lib/preset-browser.js';
import { presetEngine } from './lib/preset-browser-model.js';
import { heavyUi } from './lib/heavy-ui.js';

const $ = (id) => document.getElementById(id);

// ---- the seam ---------------------------------------------------------------
// `pendingAddTrack`, `trackId` and `track` are thunks: the desk reassigns all three, and
// the pending track is MUTATED through its getter — picking a kit voice re-keys the
// track being created onto the piece of the kit it actually is.
let pendingAddTrack, closeMenu, mixFor, trackId, commitPendingAddTrack, targetLabel,
  setRestorablePopup, isIndependentLane, kitLaneOf, nextLayerKey, setLaneVoice, track, cap;

/** Hand the picker the desk whose channel it is choosing a sound for. */
export function installVoicePicker(deps) {
  ({
    pendingAddTrack, closeMenu, mixFor, trackId, commitPendingAddTrack, targetLabel,
    setRestorablePopup, isIndependentLane, kitLaneOf, nextLayerKey, setLaneVoice, track, cap,
  } = deps);
}

let voicePickerQuery = '';

/**
 * The voice picker — the longest list the desk builds, one row per offered preset.
 *
 * Same armour as the Note FX panel and for the same reason: it is a synchronous DOM
 * build on the sequencer's thread, and choosing a sound is something you do WHILE the
 * song plays. A picker that clicks the music on the way open is the one moment you are
 * listening hardest.
 */
function openVoicePicker(x, y, laneKey) {
  return heavyUi('open voice picker', () => buildVoicePicker(x, y, laneKey));
}

function buildVoicePicker(x, y, laneKey) {
  closeMenu();
  setRestorablePopup({ kind: 'voicePicker', laneKey });
  const seam = seamFor(laneKey);
  const chosen = mixFor(trackId()).voice?.[seam.voiceKey];
  // A preset the library would otherwise leave off the menu is still offered while
  // this lane is the thing playing it — a picker cannot hide the row it is meant to
  // be highlighting. Today that is only the song quotations nothing in the game plays
  // any more, which were pickable before they were filtered; see offeredVoices.
  const offer = { keep: chosen || null };
  const pending = pendingAddTrack()?.key === laneKey;
  // A duplicate layer has no engine default to go back to. An independent editor lane
  // is different: it is empty, not copied, and its neutral engine fallback is still a
  // valid starting point while the user chooses a preset.
  const independent = isIndependentLane(laneKey);
  const layer = isLayer(laneKey) && !independent;
  const el = $('voicepicker');
  registerPresetWindow(el);
  el.textContent = '';

  const pick = (id) => {
    // A freshly added lane is only a proposal until its first sound is chosen. Commit
    // before closing so closeMenu does not treat this successful choice as a cancel.
    if (pendingAddTrack()?.key === laneKey) {
      // The voice the user picked is what the track IS, not whatever lane happened to be
      // selected when they clicked +. A pitched voice re-keys the pending track as a
      // melodic independent lane instead of leaving it a drum; a kit voice re-keys it
      // onto the piece of the kit it actually is, which is what gives it that drum's
      // figures, its place in the row order and its share of a groove — chosen straight
      // from the library, a clap staged as a tom would otherwise stay a tom playing a
      // clap. Only where the two disagree, so nothing moves for no reason.
      //
      // The pitched half cannot happen from the PATTERN EDITOR: there the list holds
      // nothing but the kit. It is the rule rather than the list that has to be true —
      // a pitched voice arriving here would make a row the kit cannot show a note of.
      const voice = VOICES[id];
      const home = voice && isKitVoice(voice) ? kitLaneOf(voice) : 'lead';
      const blocked = home === 'lead' && pendingAddTrack().drumsOnly;
      if (voice && home && home !== pendingAddTrack().from && !blocked) {
        const newKey = nextLayerKey(home);
        pendingAddTrack().key = newKey;
        pendingAddTrack().from = home;
        commitPendingAddTrack(newKey, id);
      } else {
        commitPendingAddTrack(laneKey, id);
      }
      closeMenu();
      return;
    }
    closeMenu();
    setLaneVoice(laneKey, id);
  };
  const entry = (id, label, kind, title) => {
    const btn = document.createElement('button');
    btn.className = (id === chosen || (!id && !chosen)) ? 'on' : '';
    // Named, so the header's readout can scroll to the row it is naming without
    // searching the panel for a label that two presets could share.
    if (id) btn.dataset.voice = id;
    const n = document.createElement('span');
    n.textContent = label;
    const k = document.createElement('span');
    k.className = 'vkind';
    k.textContent = kind;
    btn.title = title;
    btn.append(n, k);
    btn.onclick = () => pick(id);
    return btn;
  };

  const selectedPreset = VOICES[chosen]
    || (independent ? VOICES[defaultAddedVoice(laneKey)] : defaultVoiceOf(track()?.bank, laneKey));
  const drumsOnly = pending ? !!pendingAddTrack()?.drumsOnly
    : PERCUSSION_LANES.includes(baseLane(laneKey));
  const voices = () => offeredVoices(laneKey, offer)
    .filter((v) => !drumsOnly || isKitVoice(v) || v.id === chosen);

  const head = document.createElement('div'); head.className = 'voicehead';
  const who = document.createElement('span'); who.className = 'voicewho';
  who.textContent = `${targetLabel(laneKey)} voice`;
  head.append(who);
  const search = document.createElement('input');
  search.className = 'voicesearch'; search.type = 'search';
  search.placeholder = 'Search presets…'; search.value = voicePickerQuery;
  search.setAttribute('aria-label', 'Search presets');
  const results = document.createElement('div'); results.className = 'voiceresults';
  const browser = createPresetBrowser({
    voices, query: () => search.value,
    onClear: () => { search.value = ''; voicePickerQuery = ''; },
    renderPreset: (v, row) => {
      const button = entry(v.id, v.label, row.engine,
        `${v.label} — ${row.category} / ${row.subcategory}\n${v.note || ''}`
        + (v.lanes ? `\nOnly on: ${v.lanes.map((k) => cap(VOICE_LANES[k].label)).join(', ')}` : ''));
      button.classList.toggle('on', v.id === selectedPreset?.id);
      return button;
    },
  });
  results.append(browser.element);
  if (!pending && selectedPreset) {
    const available = voices().some((v) => v.id === selectedPreset.id);
    const now = document.createElement(available ? 'button' : 'span');
    now.className = 'voicenow';
    now.textContent = `${selectedPreset.label} · ${presetEngine(selectedPreset)}`;
    if (available) {
      now.type = 'button'; now.title = 'Show current preset';
      now.onclick = () => browser.reveal(selectedPreset.id);
    }
    head.append(now);
  }
  head.append(search);
  if (layer || pending) {
    const why = document.createElement('span'); why.className = 'voicewhy';
    const source = (mixFor(trackId()).layers || []).find((l) => l.key === laneKey)?.from || baseLane(laneKey);
    why.textContent = pending ? 'Choose a preset for this new track'
      : `A duplicate of ${targetLabel(source)} — it plays that part with whatever you choose here`;
    head.append(why);
  }
  const close = document.createElement('button'); close.type = 'button';
  close.className = 'voiceclose popclose'; close.textContent = '✕';
  close.setAttribute('aria-label', 'Close preset selector');
  close.onclick = () => closeMenu(); head.append(close);
  search.oninput = () => { voicePickerQuery = search.value; browser.refresh(); };
  el.onkeydown = (ev) => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault(); ev.stopPropagation();
    if (ev.target === search && search.value) {
      search.value = ''; voicePickerQuery = ''; browser.refresh();
    } else closeMenu();
  };
  const currentRow = () => [...results.querySelectorAll('[data-voice]')]
    .find((b) => b.dataset.voice === selectedPreset?.id);
  el.append(head, results);

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.classList.add('show');
  bringPresetWindowToFront(el);
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 6))}px`;
  requestAnimationFrame(() => {
    if (!el.classList.contains('show')) return;
    // Opening ON the sound the lane already plays, rather than at the top of a list it
    // is somewhere inside. `nearest` so a row that is already visible does not move,
    // and `preventScroll` on the focus after it so the caret does not undo the scroll.
    currentRow()?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    search.focus({ preventScroll: true });
  });
}


export { openVoicePicker };
