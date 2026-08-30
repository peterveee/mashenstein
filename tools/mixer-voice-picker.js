// The voice picker — the longest list the desk builds, one row per offered preset.
//
// Lifted out of mixer-entry.js. Sixty-five presets in a context menu is a scrolling list
// you cannot read, so this is laid out the way the effect catalogue is: a column per
// category, everything visible at once. Categories are about the SOUND, not the lane — a
// bass preset on the lead is a lead — and the only entries a lane hides are the few
// engine ones that are genuinely bass-only code paths.

import {
  VOICES, VOICE_LANES, seamFor, isLayer, baseLane, defaultVoiceOf, isKitVoice,
  PERCUSSION_LANES, defaultAddedVoice,
} from '../src/data/voices.js';
import { offeredVoices, offeredByCategory } from '../src/data/voices-in-play.js';
import { synthDisplayName, synthShortName, synthStyleName } from './lib/synth-display.js';
import { createCustomSelect } from './lib/custom-select.js';
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

/**
 * The voice library, as a panel.
 *
 * Sixty-five presets in a context menu is a scrolling list you cannot read, so this
 * is laid out the way the effect catalogue is: a column per category, everything
 * visible at once. Categories are about the SOUND, not the lane — a bass preset on
 * the lead is a lead, and the only entries a lane hides are the few engine ones that
 * are genuinely bass-only code paths.
 *
 * The head row carries the lane, kind/engine filters and search. Existing tracks keep
 * their lane kind fixed; the plus picker is the only route where kind is a choice.
 */
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

  const engineOf = (v) => v?.kind === 'drum' ? 'drum' : v?.synth || null;
  // Through the shared map rather than the one hard-coded drum case this used to carry:
  // a second place spelling a family's name is a second place to get it wrong, and the
  // renames mean there are now four of them to keep straight.
  const engineLabel = (id) => synthDisplayName(id);
  const selectedPreset = VOICES[chosen]
    || (independent ? VOICES[defaultAddedVoice(laneKey)] : defaultVoiceOf(track()?.bank, laneKey));
  const selectedEngine = engineOf(selectedPreset);

  // The search box. A hundred presets in sixteen columns is quick to scan when you
  // know roughly where you are going and slow when you only know the word — so
  // typing filters the lot, across labels AND the descriptions, which is where words
  // like "808", "gated" or "detune" actually live.
  const search = document.createElement('input');
  search.className = 'voicesearch';
  search.type = 'search';
  search.placeholder = 'Search presets…';
  search.value = voicePickerQuery;
  search.setAttribute('aria-label', 'Search presets');

  // The head row: what you are choosing for, how to find it, and the way back.
  //
  const head = document.createElement('div');
  head.className = 'voicehead';
  const who = document.createElement('span');
  who.className = 'voicewho';
  who.textContent = `${targetLabel(laneKey)} voice`;

  // WHAT THE LANE IS ON NOW, named rather than only highlighted.
  //
  // The chosen row carries `on`, and a highlight answers this only while the row is on
  // screen. It routinely is not: the panel opens filtered to the engine the lane plays,
  // keeps the search from the last time it was opened, and wraps a hundred presets over
  // sixteen columns — so the one preset you most want named is the one scrolled past.
  // And on a generated song, whose lane names its sound in the BANK rather than in the
  // mix, no row is highlighted at all; the sound has a name and the panel never said it.
  //
  // `selectedPreset` above is that name, already worked out for the engine filter: the
  // chosen preset, or the song's own copy, or the bank's default, in that order.
  //
  // A button when the library holds a row for it — clicking is the way BACK to the row,
  // dropping whatever filter is hiding it — and a plain span when it does not, which is
  // a frozen starter on a generated song. There is nothing to scroll to there, and a
  // button that does nothing is worse than a label.
  //
  // The PLUS picker has none of this: a track that does not exist yet is not on
  // anything, and the head already says so in the line under it.
  const nowPreset = pending ? null : selectedPreset;
  const nowInList = !!nowPreset && offeredVoices(laneKey, offer).some((v) => v.id === nowPreset.id);
  const now = pending ? null : document.createElement(nowInList ? 'button' : 'span');
  if (now) {
    now.className = 'voicenow';
    if (nowInList) now.type = 'button';
    const nowName = document.createElement('span');
    nowName.className = 'voicenow-name';
    nowName.textContent = nowPreset?.label || 'the engine’s own voice';
    now.append(nowName);
    if (nowPreset?.category) {
      const nowCat = document.createElement('span');
      nowCat.className = 'voicenow-cat';
      nowCat.textContent = nowPreset.category;
      now.append(nowCat);
    }
    now.title = nowPreset
      ? `This lane is on ${nowPreset.label}`
        + (nowInList ? ' — click to show it in the list below' : '')
      : 'This lane is on the engine’s own voice — no preset is chosen';
  }
  // The row for the current preset, or null while a filter is hiding it.
  const currentRow = () => (nowPreset
    ? results.querySelector(`button[data-voice="${CSS.escape(nowPreset.id)}"]`)
    : null);
  // Put that row back on screen, whatever is hiding it. The filters are only dropped
  // when one of them is the thing in the way, so clicking this while the row is already
  // visible leaves the panel exactly as it was bar the scroll.
  const revealCurrent = () => {
    if (!currentRow()) {
      voicePickerQuery = '';
      search.value = '';
      engine = 'all';
      if (KINDS.some((k) => k.id === 'all')) kind = 'all';
      for (const c of chips.children) c.classList.toggle('on', c.textContent === 'All');
      refreshEngineOptions();
      draw('');
    }
    currentRow()?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  if (now && nowInList) now.onclick = (ev) => { ev.stopPropagation(); revealCurrent(); };

  // Drums or not — the one split the catalogue's categories do not make, and the only
  // one that is about the LANE. A lead strip has no use for seven columns of kit before
  // it reaches the Lead, so the panel opens on the kind the lane plays.
  //
  // On a PERCUSSION lane it is a rule and not a view, and the chips do not appear at all.
  // A drum lane holds booleans: a step says a hit happens and carries no pitch, so a
  // melodic preset there is a synth being struck at whatever note the lane happens to
  // name, over and over. That is not a sound anybody is reaching for, and it was reachable
  // from every route into this picker — the strip, the row menu, the drum editor. The
  // other direction stays open: a snare through a bass lane is a legitimate noise.
  //
  // The one exception is a preset the lane is ALREADY playing. A picker cannot hide the
  // row it is meant to be highlighting, and hiding it would leave a drum whose sound has
  // no entry — see `offer.keep` above.
  const drumsOnly = pending
    ? !!pendingAddTrack()?.drumsOnly
    : PERCUSSION_LANES.includes(baseLane(laneKey));
  const isDrumChoice = (v) => isKitVoice(v) || (chosen && v?.id === chosen);
  const KINDS = drumsOnly ? [{ id: 'drums', label: 'Drums', keep: isDrumChoice }] : [
    { id: 'all', label: 'All', keep: () => true },
    { id: 'pitched', label: 'Pitched', keep: (v) => !isKitVoice(v) },
    { id: 'drums', label: 'Drums', keep: (v) => isKitVoice(v) },
  ];
  // The plus button is deliberately neutral: it is creating a new track, not adding
  // another Tom. Existing lanes still open on their useful lane-specific family.
  let kind = drumsOnly ? 'drums' : pending ? 'all'
    : PERCUSSION_LANES.includes(baseLane(laneKey)) ? 'drums' : 'pitched';
  let engine = 'all';
  const keepOf = (id) => (KINDS.find((k) => k.id === id) || KINDS[0]).keep;
  // A lane whose own kind is empty opens on everything rather than on nothing. Nothing
  // in the catalogue does that today; a preset library one edit from now might.
  if (!drumsOnly && !offeredVoices(laneKey, offer).some(keepOf(kind))) kind = 'all';
  const enginesForKind = (kindId) => [...new Set(offeredVoices(laneKey, offer)
    .filter(keepOf(kindId)).map(engineOf).filter(Boolean))]
    .sort((a, b) => engineLabel(a).localeCompare(engineLabel(b)));
  const initialEngines = enginesForKind(kind);
  if (!pending && selectedEngine && initialEngines.includes(selectedEngine)) engine = selectedEngine;
  const chips = document.createElement('div');
  chips.className = 'voicekinds';
  const chipFor = (k) => {
    const c = document.createElement('button');
    c.className = 'voicekind' + (k.id === kind ? ' on' : '');
    c.textContent = k.label;
    c.title = k.id === 'all' ? 'Every preset in the library'
      : k.id === 'drums' ? 'kicks, snares, claps, hats and percussion'
        : 'Everything that plays a note';
    c.onclick = () => {
      kind = k.id;
      for (const other of chips.children) other.classList.toggle('on', other === c);
      refreshEngineOptions();
      draw(search.value);
    };
    return c;
  };
  // Existing tracks cannot change between melodic and drum lanes, so those filters
  // are useful only while the plus picker is deciding what kind of track to create.
  if (pending && !drumsOnly) for (const k of KINDS) chips.append(chipFor(k));
  // THE DESK'S OWN DROPDOWN, not the operating system's.
  //
  // A native <select> can draw one run of text per row, so the engine and what it does
  // had to be one string — `MRDR-3 · Layered analogue` — and eight of those stack into
  // eight names and eight descriptions with nothing lining up. The custom control gives
  // the description its own column, which is what it always was. It also brings the list
  // inside the desk's palette; a macOS popup over a dark desk is the one surface here
  // that could never be themed.
  //
  // Rebuilt rather than repopulated: the options are fixed at construction, and the list
  // changes when the kind chips do. The replacement carries the same classes and the
  // same `engine` value, so the only thing the chips see is a different element.
  let engineSelect = null;
  const refreshEngineOptions = () => {
    const availableEngines = enginesForKind(kind);
    if (engine !== 'all' && !availableEngines.includes(engine)) engine = 'all';
    const next = createCustomSelect({
      label: 'Engine',
      title: 'Show presets for the current engine, or all engines',
      idPrefix: 'voicepicker-engine',
      // The two halves separately rather than the joined label: the columns ARE the
      // join, made by the layout instead of by a separator. Short name, the same one the
      // library's filter draws — `DuoSynth` in one list and `Duo` in the other is two
      // names for one engine, which is the thing this whole pass is undoing.
      options: [['all', 'All engines'],
        ...availableEngines.map((id) => [id, synthShortName(id), synthStyleName(id)])],
      value: engine,
      fieldClass: 'deskselect',
    });
    next.classList.add('voiceengine');
    next.hidden = availableEngines.length < 2;
    next.addEventListener('input', () => { engine = next.value; draw(search.value); });
    if (engineSelect) engineSelect.replaceWith(next);
    engineSelect = next;
  };
  refreshEngineOptions();
  head.append(who);
  if (now) head.append(now);
  head.append(chips);
  head.append(engineSelect);
  head.append(search);
  if (layer) {
    // A layer carries the identity of the part it copies, so its explanatory note stays
    // in the header rather than adding another filter control.
    const why = document.createElement('span');
    why.className = 'voicewhy';
    // The lane it actually copies, which is not always the engine lane it is named
    // after: a copy of `lead3` plays lead 3's part, not the song's own lead.
    const source = (mixFor(trackId()).layers || []).find((l) => l.key === laneKey)?.from
      || baseLane(laneKey);
    why.textContent = `A duplicate of ${targetLabel(source)} — it plays that`
      + ' part with whatever you choose here';
    head.append(why);
  } else if (pending) {
    const why = document.createElement('span');
    why.className = 'voicewhy';
    why.textContent = 'Choose a preset for this new track';
    head.append(why);
  }

  // Keep the picker’s way out in the same place and style as the other desk
  // overlays. It is deliberately separate from preset rows so a close never
  // changes the current voice.
  const close = document.createElement('button');
  close.className = 'voiceclose popclose';
  close.type = 'button';
  close.textContent = '✕';
  close.title = 'Close preset selector';
  close.setAttribute('aria-label', 'Close preset selector');
  close.onclick = (ev) => { ev.stopPropagation(); closeMenu(); };
  head.append(close);

  // Nothing about EDITING a preset lives here. This panel answers "which sound",
  // which is a different question from "what should this sound be like" — and the way
  // into the second is on the strip header and the two items on the right-click menu.

  const results = document.createElement('div');
  results.className = 'voiceresults';

  const draw = (query) => {
    results.textContent = '';
    const q = query.trim().toLowerCase();
    const hit = (v) => !q || `${v.label} ${v.category} ${v.note} ${v.kind}`.toLowerCase().includes(q);
    const keep = keepOf(kind);
    const keepEngine = (v) => engine === 'all' || engineOf(v) === engine;

    let shown = 0;
    for (const [category, list] of offeredByCategory(laneKey, offer)) {
      const matches = list.filter((v) => keep(v) && keepEngine(v) && hit(v));
      if (!matches.length) continue;
      shown += matches.length;
      const g = document.createElement('div');
      g.className = 'fxgroup';
      const h5 = document.createElement('h5');
      h5.textContent = category;
      g.append(h5);
      for (const v of matches) {
        g.append(entry(v.id, v.label, v.kind === 'engine' ? 'Built in' : '',
          `${v.label} — ${v.note}`
          + (v.lanes ? `\n\nOnly on: ${v.lanes.map((k) => cap(VOICE_LANES[k].label)).join(', ')}.` : '')));
      }
      results.append(g);
    }
    // A query is a request for a SOUND, not a request to be told that the currently
    // selected engine cannot make it. If the engine-specific view is empty but the same
    // query exists elsewhere in the offered catalogue, broaden to All engines and keep
    // the query in place so the result appears without a second click or retype.
    if (q && !shown && engine !== 'all') {
      const elsewhere = offeredVoices(laneKey, offer)
        .some((v) => keep(v) && hit(v));
      if (elsewhere) {
        engine = 'all';
        refreshEngineOptions();
        draw(query);
        return;
      }
    }
    // A search that finds nothing has to say so. An empty panel reads as broken.
    //
    // If there really is no match in the offered kind, say so plainly rather than leaving
    // a blank panel that reads as broken.
    if (q && !shown) {
      const none = document.createElement('div');
      none.className = 'fxgroup voicesearch-none';
      none.textContent = `Nothing matches “${query.trim()}” in ${kind}`;
      results.append(none);
    }
  };

  search.addEventListener('input', () => {
    voicePickerQuery = search.value;
    draw(search.value);
  });
  // Escape clears the filter first and closes the panel only when it is already
  // empty — one key, and it never throws away a search you were still reading.
  search.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    ev.stopPropagation();
    if (search.value) {
      voicePickerQuery = '';
      search.value = '';
      draw('');
    } else closeMenu();
  });
  el.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || ev.target === search) return;
    ev.preventDefault();
    ev.stopPropagation();
    closeMenu();
  });

  draw(search.value);
  el.append(head, results);

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.classList.add('show');
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
