// Track preset selector. Shared facets browse sounds; this host owns lane eligibility and assignment.

import { registerPresetWindow, bringPresetWindowToFront } from './lib/preset-window-stack.js';
import {
  VOICES, VOICE_LANES, seamFor, isLayer, baseLane, defaultVoiceOf, isKitVoice,
  PERCUSSION_LANES, defaultAddedVoice,
} from '../src/data/voices.js';
import { offeredVoices } from '../src/data/voices-in-play.js';
import { createPresetBrowser, revealPresetRow } from './lib/preset-browser.js';
import { presetClassification } from '../src/data/preset-browsing.js';
import { emptyPresetFilters } from './lib/preset-browser-model.js';
import { heavyUi } from './lib/heavy-ui.js';

const $ = (id) => document.getElementById(id);

// ---- the seam ---------------------------------------------------------------
// `pendingAddTrack`, `trackId` and `track` are thunks: the desk reassigns all three, and
// the pending track is MUTATED through its getter — picking a kit voice re-keys the
// track being created onto the piece of the kit it actually is.
let pendingAddTrack, closeMenu, mixFor, trackId, commitPendingAddTrack, targetLabel,
  setRestorablePopup, isIndependentLane, kitLaneOf, nextLayerKey, setLaneVoice, track, cap, undoPreset, canUndoPreset;

/** Hand the picker the desk whose channel it is choosing a sound for. */
export function installVoicePicker(deps) {
  ({
    pendingAddTrack, closeMenu, mixFor, trackId, commitPendingAddTrack, targetLabel,
    setRestorablePopup, isIndependentLane, kitLaneOf, nextLayerKey, setLaneVoice, track, cap, undoPreset, canUndoPreset,
  } = deps);
}

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
  let chosen = mixFor(trackId()).voice?.[seam.voiceKey];
  // A preset the library would otherwise leave off the menu is still offered while
  // this lane is the thing playing it — a picker cannot hide the row it is meant to
  // be highlighting. Today that is only the song quotations nothing in the game plays
  // any more, which were pickable before they were filtered; see offeredVoices.
  const offer = { keep: chosen || null };
  let pending = pendingAddTrack()?.key === laneKey;
  // A duplicate layer has no engine default to go back to. An independent editor lane
  // is different: it is empty, not copied, and its neutral engine fallback is still a
  // valid starting point while the user chooses a preset.
  const independent = isIndependentLane(laneKey);
  const layer = isLayer(laneKey) && !independent;
  const el = $('voicepicker');
  registerPresetWindow(el);
  el.textContent = '';

  const pick = (id) => {
    rememberSearch();
    const wasPending = pending;
    // A freshly added lane is only a proposal until its first sound is chosen. Commit
    // once; subsequent choices replace the sound on that same new channel.
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
        laneKey = newKey;
        commitPendingAddTrack(newKey, id);
      } else {
        commitPendingAddTrack(laneKey, id);
      }
      pending = false;
      setRestorablePopup({ kind: 'voicePicker', laneKey });
      head.querySelector('.voicewhy')?.remove();
    } else {
      setLaneVoice(laneKey, id);
    }
    chosen = id;
    selectedPreset = VOICES[id];
    offer.keep = id;
    who.textContent = `${targetLabel(laneKey)} voice`;
    updateCurrent();
    if (wasPending) {
      const scrollTop = results.querySelector('.preset-list')?.scrollTop || 0;
      browser.refresh({ reconcile: true });
      results.querySelector('.preset-list').scrollTop = scrollTop;
      currentRow()?.focus({ preventScroll: true });
    }
    // Keep filters, scroll position, and keyboard focus while switching sounds.
    for (const button of results.querySelectorAll('[data-voice]')) {
      const active = button.dataset.voice === id;
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    bringPresetWindowToFront(el);
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

  let selectedPreset = VOICES[chosen]
    || (independent ? VOICES[defaultAddedVoice(laneKey)] : defaultVoiceOf(track()?.bank, laneKey));
  const drumsOnly = () => pending ? !!pendingAddTrack()?.drumsOnly
    : PERCUSSION_LANES.includes(baseLane(laneKey));
  const voices = () => offeredVoices(laneKey, offer)
    .filter((v) => !drumsOnly() || isKitVoice(v) || v.id === chosen);

  const head = document.createElement('div'); head.className = 'voicehead';
  const who = document.createElement('span'); who.className = 'voicewho';
  who.textContent = `${targetLabel(laneKey)} voice`;
  head.append(who);
  const search = document.createElement('input');
  search.className = 'voicesearch'; search.type = 'search';
  search.setAttribute('list', 'preset-recent-searches');
  search.autocomplete = 'off';
  search.placeholder = 'Search presets…';
  search.setAttribute('aria-label', 'Search presets');
  const recent = document.createElement('datalist'); recent.id = 'preset-recent-searches';
  const historyKey = 'mash-preset-recent-searches';
  let history = [];
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
    if (Array.isArray(saved)) history = saved.filter(v => typeof v === 'string' && v.trim()).slice(0, 12);
  } catch { /* Browsing still works with unavailable storage. */ }
  const showHistory = () => recent.replaceChildren(...history.map(value => {
    const option = document.createElement('option'); option.value = value; return option;
  }));
  function rememberSearch() {
    const value = search.value.trim();
    if (!value) return;
    history = [value, ...history.filter(v => v.toLowerCase() !== value.toLowerCase())].slice(0, 12);
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Optional history. */ }
    showHistory();
  }
  showHistory();
  search.addEventListener('change', rememberSearch);
  search.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { rememberSearch(); ev.stopPropagation(); }
  });
  const results = document.createElement('div'); results.className = 'voiceresults';
  const browser = createPresetBrowser({
    voices, query: () => search.value,
    // Start with related sounds across every engine; new tracks browse everything.
    state: { ...emptyPresetFilters(),
      category: !pending && selectedPreset ? presetClassification(selectedPreset).category : 'all' },
    onClear: () => { search.value = ''; },
    renderPreset: (v, row) => {
      const button = entry(v.id, v.label, row.engine,
        `${v.label} — ${row.category} / ${row.subcategory}\n${v.note || ''}`
        + (v.lanes ? `\nOnly on: ${v.lanes.map((k) => cap(VOICE_LANES[k].label)).join(', ')}` : ''));
      button.classList.toggle('on', v.id === selectedPreset?.id);
      return button;
    },
  });
  results.append(browser.element);
  const now = document.createElement('button');
  now.className = 'voicenow'; now.type = 'button'; now.title = 'Show current preset';
  now.onclick = () => browser.reveal(selectedPreset.id);
  function updateCurrent() {
    now.hidden = pending || !selectedPreset;
    if (selectedPreset) {
      now.textContent = 'Show current preset';
      now.disabled = !voices().some((v) => v.id === selectedPreset.id);
    }
  }
  const undoButton = document.createElement('button');
  undoButton.type = 'button'; undoButton.className = 'voiceundo';
  undoButton.textContent = 'Undo'; undoButton.title = 'Undo the last desk change';
  undoButton.disabled = !canUndoPreset();
  undoButton.onclick = () => {
    undoPreset();
    // Undoing the initial add removes the channel itself.
    if (isLayer(laneKey) && !(mixFor(trackId()).layers || []).some(l => l.key === laneKey)) {
      closeMenu(); return;
    }
    chosen = mixFor(trackId()).voice?.[seamFor(laneKey).voiceKey];
    selectedPreset = VOICES[chosen] || defaultVoiceOf(track()?.bank, laneKey);
    offer.keep = chosen || null;
    who.textContent = `${targetLabel(laneKey)} voice`;
    updateCurrent();
    const list = results.querySelector('.preset-list');
    const scrollTop = list?.scrollTop || 0;
    browser.refresh();
    results.querySelector('.preset-list').scrollTop = scrollTop;
    undoButton.disabled = !canUndoPreset();
  };
  updateCurrent();
  const toolbar = document.createElement('div'); toolbar.className = 'voicetoolbar';
  toolbar.append(search, now, undoButton, browser.element.querySelector('.preset-clear'));
  head.append(toolbar, recent);
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
  search.oninput = () => browser.refresh();
  el.onkeydown = (ev) => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault(); ev.stopPropagation();
    if (ev.target === search && search.value) {
      search.value = ''; browser.refresh();
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
    revealPresetRow(currentRow());
    search.focus({ preventScroll: true });
  });
}


export { openVoicePicker };
