// The focused Banger Sound Palette editor. Full sound-table editing remains at /advanced.
import { Audio } from '../src/engine/audio.js';
import { VOICES } from '../src/data/voices.js';
import { resolveTrack, listTracks } from '../src/data/tracks.js';
import { MIX } from '../src/data/mix.js';
import { ARRANGEMENTS } from '../src/data/arrangements.js';
import { deskBank, laneList, songBars } from '../src/engine/lanes.js';
import { draftOf } from './lib/arrangement-edit.js';
import { generateBanger, extractRiff, BANGER_MOODS, BANGER_STYLES, styleFor } from './lib/banger/index.js';
import { PART_SLOTS, RANDOM_JOBS, resolveSounds, slotChoices, soundIssues, phoneStyle } from './lib/banger/sound-rules.js';
import { BANGER_PALETTE, paletteIssues, paletteSnapshot, resolvePalette, tidyPalette } from './lib/banger/palette.js';
import { INSERT_EFFECTS, EFFECT_BY_ID, MAX_EFFECTS, TEMPO_DIVISIONS, AUTOPANNER_RATE_DIVISIONS, paramRange, visibleParams } from '../src/engine/effects.js';

const $ = (id) => document.getElementById(id);
const clone = (value) => structuredClone(value);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
};

const BUILT_IN = {
  version: 1, source: { id: 'absolute-zero', title: 'FROST HOOK', from: 0, to: 0, bpm: 128 }, bars: 1, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Electric Grand', kind: 'melodic', role: 'hook', voice: 'mrdrElectricGrand', voiceParams: null,
    engineKeys: null, strip: null, meanPitch: 74, bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .'] }],
};
const CATEGORIES = {
  Chords: [['part:saws', 'Supersaws'], ['part:pad', 'Pad'], ['part:piano', 'Piano Stabs'], ['part:choir', 'Choir'], ['riff:chords', 'Source Chords']],
  Bass: [['part:bass', 'Main Bass'], ['part:sub', 'Sub / Wobble'], ['riff:bass', 'Source Bass']],
  Leads: [['riff:hook', 'Main Riff'], ['part:square', 'Hook Double'], ['part:squareDense', 'Busy Hook Double'], ['part:bell', 'Octave Bell'],
    ['part:megaSaw', 'Octave Lead'], ['part:third', 'Third Harmony'], ['part:counter', 'Counter Melody'], ['riff:counter', 'Source Counter']],
  Arp: [['part:arp', 'Arpeggio']],
};
const LABEL = Object.fromEntries(Object.values(CATEGORIES).flat());
const MOOD_LABEL = (id) => BANGER_MOODS.find((m) => m.id === id)?.label || id;
const styleOptions = BANGER_STYLES.map((s) => [s.id, s.label]).sort((a, b) => a[1].localeCompare(b[1]));
const moodOptions = BANGER_MOODS.map((m) => [m.id, m.label]).sort((a, b) => a[1].localeCompare(b[1]));
const state = {
  sounds: null, palette: null, saved: '', hash: null,
  scope: 'style', styleId: BANGER_STYLES[0].id, moodId: 'anthemic', previewStyle: BANGER_STYLES[0].id,
  previewMood: 'anthemic', category: 'Bass', part: 'part:bass', source: 'builtin', riffMode: 'random',
  seed: 173, playing: false, playingKey: null, previewOut: null, previewContext: null, previewAudition: null,
  previewPulseSteps: null, pulseDots: new Map(), pulseFrame: 0, pulseLastStep: null, pulseUntil: 0,
  openedEffects: null, errors: [], showAllChoices: false,
};

const titleOf = (id) => VOICES[id]?.label || id;
const contextStyle = () => state.scope === 'mood' ? state.previewStyle : state.styleId;
const contextMood = () => state.scope === 'style' ? state.previewMood : state.moodId;
const styleOf = () => styleFor(contextStyle());
const dirty = () => state.palette && JSON.stringify(tidyPalette(state.palette)) !== state.saved;

function partSlot(part) {
  const [kind, role] = part.split(':');
  return kind === 'part' ? PART_SLOTS.find((x) => x.key === role) : RANDOM_JOBS.find((x) => x.key === role);
}
function scopesFor(styleId, moodId) {
  return [
    state.palette.styles?.[styleId]?.parts,
    state.palette.moods?.[moodId]?.parts,
    state.palette.combinations?.[styleId]?.[moodId]?.parts,
  ];
}
function baseIds(part, styleId, moodId) {
  const resolved = resolveSounds(state.sounds, styleId, moodId);
  const [kind, role] = part.split(':');
  if (kind === 'riff') return [...new Set(resolved.random?.[role] || [])];
  return [...new Set([resolved.parts?.[role], ...(resolved.choices?.[role] || [])].filter(Boolean))];
}
function candidates(part = state.part, styleId = contextStyle(), moodId = contextMood()) {
  const map = new Map(baseIds(part, styleId, moodId).map((id) => [id, {
    id, enabled: true, favourite: false, trimDb: 0, origin: 'Style / mood default',
  }]));
  const chain = scopesFor(styleId, moodId);
  for (const [index, patches] of chain.entries()) {
    const entries = patches?.[part]?.entries || {};
    const origin = ['Style', 'Mood', 'Combination'][index];
    for (const [id, patch] of Object.entries(entries)) {
      const old = map.get(id) || { id, enabled: false, favourite: false, trimDb: 0 };
      map.set(id, { ...old, ...clone(patch), id,
        enabled: patch.enabled ?? old.enabled, favourite: patch.favourite ?? old.favourite,
        trimDb: patch.trimDb ?? old.trimDb, origin });
    }
  }
  return [...map.values()];
}
function usedInLastPreview(part = state.part) {
  if (!previewContextMatches()) return new Set();
  return new Set((state.previewOut?.banger?.palette || [])
    .filter((entry) => entry.part === part).map((entry) => entry.preset));
}
function previewContextMatches() {
  const context = state.previewContext;
  return !!context && context.styleId === contextStyle() && context.moodId === contextMood()
    && context.source === state.source && context.riffMode === state.riffMode;
}
function renderPreviewStatus() {
  const status = $('preview-status');
  const out = state.previewOut;
  if (!out) { status.textContent = ''; status.className = ''; return; }
  status.className = '';
  const styleLabel = styleFor(out.banger.style)?.label || out.banger.style;
  const moodLabel = MOOD_LABEL(out.banger.options.mood);
  const prefix = state.playing ? 'Preview' : 'Last preview';
  if (!previewContextMatches()) {
    status.textContent = `${prefix}: ${styleLabel} · ${moodLabel} · seed ${out.banger.seed} · preview again to mark this context`;
    return;
  }
  const choices = [...new Set((out.banger.palette || [])
    .filter((entry) => entry.part === state.part).map((entry) => titleOf(entry.preset)))];
  const partLabel = LABEL[state.part] || state.part;
  const audition = state.previewAudition;
  const position = audition
    ? (audition.firstBar == null
      ? ` · starts at bar ${audition.startBar}; this part has no notes in the take`
      : ` · starts at bar ${audition.startBar}${audition.startBar < audition.firstBar
        ? `, just before the part enters at bar ${audition.firstBar}` : ''}`)
    : '';
  status.textContent = `${prefix}: ${styleLabel} · ${moodLabel} · seed ${out.banger.seed} · ${partLabel}: ${choices.length ? choices.join(', ') : 'no palette preset used'}${position}`;
}
function isCompatible(id, part = state.part, styleId = contextStyle()) {
  return !soundIssues(id, partSlot(part), { never: state.sounds[styleId]?.never || [], phone: phoneStyle(styleId) }).blocked.length;
}
function targetScope() {
  if (state.scope === 'style') return state.palette.styles[state.styleId] ||= { parts: {} };
  if (state.scope === 'mood') return state.palette.moods[state.moodId] ||= { parts: {} };
  const styles = state.palette.combinations[state.styleId] ||= {};
  return styles[state.moodId] ||= { parts: {} };
}
function targetEntries() {
  const scope = targetScope();
  const patch = scope.parts[state.part] ||= { entries: {} };
  return patch.entries;
}
function removeTargetEntry(id) {
  const removeFromScope = (scope) => {
    const entries = scope?.parts?.[state.part]?.entries;
    if (!entries || !Object.hasOwn(entries, id)) return;
    delete entries[id];
    if (!Object.keys(entries).length) delete scope.parts[state.part];
    if (!Object.keys(scope.parts).length) return true;
    return false;
  };
  if (state.scope === 'style') {
    const scopes = state.palette.styles;
    if (removeFromScope(scopes[state.styleId])) delete scopes[state.styleId];
  } else if (state.scope === 'mood') {
    const scopes = state.palette.moods;
    if (removeFromScope(scopes[state.moodId])) delete scopes[state.moodId];
  } else {
    const moods = state.palette.combinations[state.styleId];
    if (moods && removeFromScope(moods[state.moodId])) delete moods[state.moodId];
    if (moods && !Object.keys(moods).length) delete state.palette.combinations[state.styleId];
  }
}
function existingTargetEntries() {
  const scope = state.scope === 'style' ? state.palette.styles?.[state.styleId]
    : state.scope === 'mood' ? state.palette.moods?.[state.moodId]
      : state.palette.combinations?.[state.styleId]?.[state.moodId];
  return scope?.parts?.[state.part]?.entries || {};
}
function updateEntry(id, delta) {
  const entries = targetEntries();
  entries[id] = { ...(entries[id] || {}), ...delta };
  updateStatus();
}
function removeEntry(id) {
  const lower = baseIds(state.part, contextStyle(), contextMood()).includes(id)
    || scopesFor(contextStyle(), contextMood()).slice(0, state.scope === 'style' ? 0 : state.scope === 'mood' ? 1 : 2)
      .some((patches) => patches?.[state.part]?.entries?.[id]);
  if (lower) { updateEntry(id, { enabled: false }); render(); }
  else { removeTargetEntry(id); render(); }
}
function restoreEntry(id) { removeTargetEntry(id); render(); }

function createSelect(options, value, onChange, label = '') {
  const el = h('select', { 'aria-label': label });
  for (const option of options) {
    const [id, text, disabled] = option;
    el.append(h('option', { value: id, disabled: disabled || null }, text));
  }
  el.value = value;
  el.addEventListener('change', () => onChange(el.value));
  return el;
}
function field(label, control) { return h('label', { class: 'field' }, label, control); }

function renderScope() {
  const box = $('scope-controls'); box.textContent = '';
  const setScope = (value) => {
    if (state.playing) stop();
    if (state.scope === 'mood' && value !== 'mood') state.styleId = state.previewStyle;
    if (state.scope === 'style' && value !== 'style') state.moodId = state.previewMood;
    if (state.scope === 'combination' && value === 'style') state.previewMood = state.moodId;
    if (state.scope === 'combination' && value === 'mood') state.previewStyle = state.styleId;
    state.scope = value;
    render();
  };
  box.append(field('Edit scope', createSelect([
    ['style', 'Style palette'], ['mood', 'Mood palette · all styles'], ['combination', 'Style + Mood'],
  ], state.scope, setScope, 'Edit scope')));
  if (state.scope !== 'mood') box.append(field('Style', createSelect(styleOptions, state.styleId, (id) => {
    if (state.playing) stop(); state.styleId = id; if (state.scope === 'style') state.previewStyle = id; render();
  }, 'Style')));
  if (state.scope !== 'style') box.append(field('Mood', createSelect(moodOptions, state.moodId, (id) => { if (state.playing) stop(); state.moodId = id; render(); }, 'Mood')));
  if (state.scope === 'mood') box.append(field('Preview style', createSelect(styleOptions, state.previewStyle,
    (id) => { if (state.playing) stop(); state.previewStyle = id; render(); }, 'Preview style')));
  if (state.scope === 'style') box.append(field('Preview mood', createSelect(moodOptions, state.previewMood,
    (id) => { if (state.playing) stop(); state.previewMood = id; render(); }, 'Preview mood')));
  $('scope-summary').textContent = state.scope === 'style'
    ? `Editing ${styleOf().label}; the preview uses ${MOOD_LABEL(state.previewMood)}.`
    : state.scope === 'mood' ? `Editing ${MOOD_LABEL(state.moodId)} across styles; previewing ${styleOf().label}.`
      : `Editing ${styleOf().label} · ${MOOD_LABEL(state.moodId)}.`;
  const mood = BANGER_MOODS.find((m) => m.id === contextMood());
  $('scope-detail').textContent = [styleOf().title || styleOf().note, mood?.title].filter(Boolean).join('  ');
}

function renderPartChooser() {
  const box = $('category-tabs'); box.textContent = '';
  for (const category of Object.keys(CATEGORIES)) {
    const button = h('button', { class: category === state.category ? 'active' : '', text: category });
    button.onclick = () => { state.category = category; state.part = CATEGORIES[category][0][0]; render(); };
    box.append(button);
  }
  const list = CATEGORIES[state.category];
  if (!list.some(([key]) => key === state.part)) state.part = list[0][0];
  $('part-title').textContent = state.category;
  const picker = $('part-select'); picker.replaceChildren(...list.map(([key, text]) => h('option', { value: key, text })));
  picker.value = state.part;
  picker.onchange = () => { state.part = picker.value; state.openedEffects = null; render(); };
}

function effectBase(role) {
  try {
    const out = generateBanger({ riff: getRiff(), options: { style: contextStyle(), mood: contextMood(), length: 'short', variation: 'some',
      parts: { riffSound: 'keep', partSounds: 'style' } }, seed: state.seed, sounds: state.sounds, palette: null });
    const [kind, key] = role.split(':');
    const lane = kind === 'part' ? out.laneOf[key] : (key === 'hook' ? out.laneOf.hook : out.laneOf[`riff:${key}`]);
    return lane ? out.mix.lanes[lane] || {} : {};
  } catch { return {}; }
}
function fxArray(entry) {
  if (Array.isArray(entry.inserts)) return clone(entry.inserts);
  return clone(effectBase(state.part).effects || []);
}
function effectiveSend(entry) { return { ...(effectBase(state.part).send || {}), ...(entry.send || {}) }; }
function saveFxArray(id, chain) { updateEntry(id, { inserts: chain }); }

function renderEffectEditor(box, item) {
  const current = item.inserts ?? effectBase(state.part).effects ?? [];
  const chain = clone(current);
  const sends = effectiveSend(item);
  const effects = h('div', { class: 'fx' });
  effects.append(h('div', { class: 'hint' }, item.inserts == null ? 'Inherited channel chain. Add or change an effect to save a palette override.' : 'Palette effect chain'));
  chain.forEach((fx, index) => {
    const def = EFFECT_BY_ID[fx.id]; if (!def) return;
    const paramsValue = { ...(def.defaults || {}), ...(fx.params || {}) };
    const header = h('div', { class: 'fxrow' }, h('b', {}, def.name || fx.id));
    const bypass = h('label', {}, h('input', { type: 'checkbox', checked: fx.bypass || null, onchange: (e) => { chain[index].bypass = e.target.checked; saveFxArray(item.id, chain); } }), ' Bypass');
    const up = h('button', { text: '↑', disabled: index === 0 || null, title: 'Move effect earlier' });
    up.onclick = () => { [chain[index - 1], chain[index]] = [chain[index], chain[index - 1]]; saveFxArray(item.id, chain); render(); };
    const down = h('button', { text: '↓', disabled: index === chain.length - 1 || null, title: 'Move effect later' });
    down.onclick = () => { [chain[index + 1], chain[index]] = [chain[index], chain[index + 1]]; saveFxArray(item.id, chain); render(); };
    const remove = h('button', { text: 'Remove' }); remove.onclick = () => { chain.splice(index, 1); saveFxArray(item.id, chain); render(); };
    header.append(bypass, up, down, remove);
    effects.append(header);
    const params = h('div', { class: 'fxparams' });
    const shown = visibleParams(def, paramsValue);
    for (const name of shown) {
      const range = paramRange(name, def); const value = paramsValue[name] ?? range.min;
      let input;
      if (range.options) {
        input = h('select', { 'aria-label': name });
        for (const option of range.options) input.append(h('option', { value: option, text: option }));
        input.value = value;
      } else if (range.division) {
        const divisions = def.id === 'autopanner' ? AUTOPANNER_RATE_DIVISIONS : TEMPO_DIVISIONS;
        input = h('select', { 'aria-label': name });
        for (const [label, beats] of Object.entries(divisions)) input.append(h('option', { value: beats, text: label }));
        input.value = String(value);
      } else if (range.toggle) {
        input = h('input', { type: 'checkbox', checked: value >= 0.5 ? true : null, 'aria-label': name });
      } else {
        input = h('input', { type: 'number', min: range.min, max: range.max,
          step: range.step || 0.01, value, 'aria-label': name });
      }
      input.onchange = () => {
        let next;
        if (range.toggle) next = input.checked ? 1 : 0;
        else if (range.options) next = input.value;
        else next = Number(input.value);
        if (typeof next === 'number' && !Number.isFinite(next)) return;
        chain[index].params = { ...(chain[index].params || {}), [name]: next };
        saveFxArray(item.id, chain);
        if (name === 'sync' || name === 'rateSync') render();
      };
      params.append(h('label', {}, name, input));
    }
    if (params.childElementCount) effects.append(params);
  });
  const add = createSelect([['', chain.length >= MAX_EFFECTS ? 'Effect limit reached' : '+ Add effect…', chain.length >= MAX_EFFECTS],
    ...INSERT_EFFECTS.map((def) => [def.id, def.name, chain.length >= MAX_EFFECTS])], '', (effectId) => {
    if (!effectId || chain.length >= MAX_EFFECTS) return;
    chain.push({ id: effectId, params: clone(EFFECT_BY_ID[effectId].defaults || {}) });
    saveFxArray(item.id, chain); render();
  }, 'Add channel effect');
  add.disabled = chain.length >= MAX_EFFECTS;
  effects.append(add);
  for (const [send, label] of [['delay', 'Delay send'], ['reverb', 'Reverb send']]) {
    const input = h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: sends[send] || 0 });
    const read = h('span', { text: `${label}: ${(sends[send] || 0).toFixed(2)}` });
    input.oninput = () => { read.textContent = `${label}: ${Number(input.value).toFixed(2)}`; updateEntry(item.id, { send: { ...(item.send || {}), [send]: Number(input.value) } }); };
    effects.append(h('div', { class: 'fxparams' }, h('label', {}, read, input)));
  }
  box.append(effects);
}

function renderPresets() {
  const box = $('presets'); box.textContent = '';
  state.pulseDots = new Map();
  const entries = candidates();
  const usedPresets = usedInLastPreview();
  const slot = partSlot(state.part);
  const allowed = slotChoices(slot, { never: state.sounds[contextStyle()]?.never || [], phone: phoneStyle(contextStyle()) });
  const blockedById = new Map(allowed.filter((x) => x.blocked.length).map((x) => [x.id, x.blocked[0]]));
  for (const item of entries) {
    const problem = blockedById.get(item.id);
    const inLastPreview = usedPresets.has(item.id);
    const pulseKey = `${state.part}\u0000${item.id}`;
    const pulse = inLastPreview
      ? h('span', { class: 'part-pulse', title: 'Pulses in time with this part during preview', 'aria-hidden': 'true' },
        h('span', { class: 'part-pulse-dot' })) : null;
    if (pulse) state.pulseDots.set(pulseKey, pulse);
    const name = h('div', { class: 'preset-name' }, h('div', { class: 'preset-name-title' }, pulse, h('b', {}, titleOf(item.id)),
      inLastPreview ? h('span', { class: 'used-badge', text: 'Used in last preview' }) : null),
      h('small', {}, `${item.id} · ${VOICES[item.id]?.category || ''}${problem ? ` · ${problem}` : ''}`));
    const enabled = h('input', { type: 'checkbox', checked: item.enabled, 'aria-label': `Enable ${titleOf(item.id)}` });
    enabled.onchange = () => { updateEntry(item.id, { enabled: enabled.checked }); render(); };
    const favourite = h('button', { text: item.favourite ? '★ Favourite' : '☆ Favourite', title: 'Favourite presets are three times as likely to be chosen' });
    favourite.onclick = () => { updateEntry(item.id, { favourite: !item.favourite }); renderPresets(); };
    const hear = h('button', { text: 'Hear this preset', disabled: !item.enabled || !isCompatible(item.id) || (state.part.startsWith('riff:') && state.riffMode !== 'random') });
    hear.onclick = () => playPreview(state.part, item);
    const editSound = h('button', { text: 'Edit Sound', title: 'Open the preset editor over a banger playing this sound',
      disabled: !item.enabled || !isCompatible(item.id) || null });
    editSound.onclick = () => openEditor(state.part, item);
    const effectButton = h('button', { text: state.openedEffects === item.id ? 'Hide Effects' : 'Effects' });
    effectButton.onclick = () => { state.openedEffects = state.openedEffects === item.id ? null : item.id; renderPresets(); };
    const remove = h('button', { text: 'Remove', title: 'Remove this preset from this scope' }); remove.onclick = () => removeEntry(item.id);
    const top = h('div', { class: 'preset-top' }, enabled, name, h('span', { class: 'origin', text: item.origin }), favourite, hear, editSound, effectButton, remove);
    const range = h('input', { type: 'range', min: -18, max: 6, step: 0.1, value: item.trimDb || 0, disabled: !item.enabled || null });
    const number = h('input', { type: 'number', min: -18, max: 6, step: 0.1, value: item.trimDb || 0, disabled: !item.enabled || null, 'aria-label': `${titleOf(item.id)} level in dB` });
    const setTrim = (value) => { const n = Math.max(-18, Math.min(6, Number(value))); if (!Number.isFinite(n)) return; number.value = range.value = n; updateEntry(item.id, { trimDb: Math.round(n * 10) / 10 }); };
    range.oninput = () => setTrim(range.value); number.onchange = () => setTrim(number.value);
    const restore = h('button', { text: 'Restore inherited', disabled: !hasLocalEntry(item.id) || null }); restore.onclick = () => restoreEntry(item.id);
    box.append(h('article', { class: `preset${inLastPreview ? ' used-in-preview' : ''}` }, top,
      h('div', { class: 'level' }, h('span', { text: 'Relative level' }), range, number, h('span', { text: 'dB' }), restore),
      state.openedEffects === item.id ? effectEditorMount(item) : null));
  }
  renderAddPreset(allowed, entries);
  $('preview-play').textContent = state.playing ? '■ Stop' : 'Preview Song';
  renderPreviewStatus();
  syncPartPulse();
}
function hasLocalEntry(id) { return !!existingTargetEntries()[id]; }
function effectEditorMount(item) { const box = h('div'); renderEffectEditor(box, item); return box; }

function renderAddPreset(allowed, existing) {
  const select = $('add-preset');
  const used = new Set(existing.map((x) => x.id));
  const options = [['', '+ Add a preset…']];
  const slot = partSlot(state.part);
  const commonCategories = slot.categories || slot.prefer || [];
  const available = allowed.filter((x) => !x.blocked.length && !used.has(x.id)
    && (state.showAllChoices || !commonCategories.length || commonCategories.includes(x.category)));
  const labelCounts = new Map();
  for (const choice of available) labelCounts.set(choice.label, (labelCounts.get(choice.label) || 0) + 1);
  for (const choice of available) options.push([choice.id,
    `${choice.label} · ${choice.category}${labelCounts.get(choice.label) > 1 ? ` · ${choice.id}` : ''}`]);
  select.replaceChildren(...options.map(([id, text]) => h('option', { value: id, text })));
  select.value = '';
  select.onchange = () => {
    const id = select.value; if (!id) return;
    updateEntry(id, { enabled: true });
    state.openedEffects = id;
    render();
  };
  $('all-choices').checked = state.showAllChoices;
  $('all-choices').onchange = () => { state.showAllChoices = $('all-choices').checked; renderPresets(); };
}

function tracksForRiff() {
  return listTracks().filter((track) => resolveTrack(track.id)?.bank);
}
function renderRiffPicker() {
  const options = [['builtin', 'Built-in Frost Hook'], ...tracksForRiff().map((track) => [track.id, `${track.title} · ${track.group}`])];
  const select = $('riff-select'); select.replaceChildren(...options.map(([id, label]) => h('option', { value: id, text: label })));
  if (!options.some(([id]) => id === state.source)) state.source = 'builtin';
  select.value = state.source;
  select.onchange = () => { state.source = select.value; state.seed++; if (state.playing) stop(); render(); };
  $('riff-mode').value = state.riffMode;
  $('riff-mode').onchange = () => { if (state.playing) stop(); state.riffMode = $('riff-mode').value; renderPresets(); };
}
function getRiff() {
  if (state.source === 'builtin') return BUILT_IN;
  const track = resolveTrack(state.source);
  if (!track?.bank) return BUILT_IN;
  const bank = deskBank(track.bank, MIX[state.source] || null);
  const draft = draftOf(bank, ARRANGEMENTS[state.source] || null);
  const from = Math.max(1, Math.min(draft.plan.length, 1)) - 1;
  const to = Math.max(from, Math.min(draft.plan.length - 1, from + 3));
  return extractRiff({ bank, draft, mix: MIX[state.source] || null, from, to,
    laneKeys: laneList(bank).map((lane) => lane.key), source: { id: state.source, title: track.title } });
}

function selectedSnapshot(part, item) {
  const styleId = contextStyle(); const moodId = contextMood();
  const snapshot = paletteSnapshot(state.palette, styleId, moodId, { sounds: state.sounds });
  const list = candidates(part, styleId, moodId);
  const configured = list.find((entry) => entry.id === item.id) || item;
  snapshot.parts[part] = [{ ...clone(configured), enabled: true, weight: configured.favourite ? 3 : 1, audition: true }];
  return snapshot;
}
function makePreview(part = null, item = null, riffMode = state.riffMode) {
  const styleId = contextStyle(); const moodId = contextMood();
  let palette = paletteSnapshot(state.palette, styleId, moodId, { sounds: state.sounds });
  if (part && item) palette = selectedSnapshot(part, item);
  const out = generateBanger({ riff: getRiff(), options: {
    style: styleId, mood: moodId, variation: 'some', length: 'short',
    parts: { riffSound: riffMode, partSounds: 'roll' },
  }, seed: state.seed, sounds: state.sounds, palette });
  return out;
}
function noteOffsetsInBar(values, half) {
  if (!Array.isArray(values)) return [];
  const from = half === 1 ? 16 : 0;
  const hasNote = (value) => Array.isArray(value)
    ? value.some(hasNote) : value != null && value !== false;
  return values.slice(from, from + 16).flatMap((value, step) => hasNote(value) ? [step] : []);
}
function hasNoteInBar(values, half) { return noteOffsetsInBar(values, half).length > 0; }
function makePreviewPulseSteps(out) {
  const bars = songBars(out.bank);
  const laneSteps = new Map();
  const plans = new Map();
  for (const entry of out.banger.palette || []) {
    if (!laneSteps.has(entry.lane)) {
      const steps = new Set();
      bars.forEach(({ b, half }, barIndex) => {
        for (const step of noteOffsetsInBar(b?.[entry.lane], half)) steps.add(barIndex * 16 + step);
      });
      laneSteps.set(entry.lane, steps);
    }
    const key = `${entry.part}\u0000${entry.preset}`;
    const steps = plans.get(key) || new Set();
    for (const step of laneSteps.get(entry.lane)) steps.add(step);
    plans.set(key, steps);
  }
  return plans;
}
function clearPartPulse() {
  if (state.pulseFrame) cancelAnimationFrame(state.pulseFrame);
  state.pulseFrame = 0;
  state.pulseLastStep = null;
  state.pulseUntil = 0;
  for (const dot of state.pulseDots.values()) dot.classList.remove('is-active');
}
function syncPartPulse() {
  if (!state.playing || !state.previewPulseSteps || !state.pulseDots.size) {
    if (state.pulseFrame) clearPartPulse();
    return;
  }
  if (!state.pulseFrame) state.pulseFrame = requestAnimationFrame(updatePartPulse);
}
function updatePartPulse(now) {
  state.pulseFrame = 0;
  if (!state.playing || !state.previewPulseSteps || !state.pulseDots.size) {
    clearPartPulse();
    return;
  }
  const beat = Audio.songBeat?.();
  if (Number.isFinite(beat)) {
    const heardStep = beat * 4;
    const gridStep = Math.floor(heardStep);
    const swing = Number(Audio.swing) || 0;
    const swingDelay = swing > 50 && Math.abs(gridStep % 2) === 1 ? (swing - 50) / 50 : 0;
    const step = Math.floor(heardStep - swingDelay + 0.001);
    if (step !== state.pulseLastStep) {
      state.pulseLastStep = step;
      if ([...state.pulseDots.keys()].some((key) => state.previewPulseSteps.get(key)?.has(step))) {
        state.pulseUntil = now + 105;
      }
    }
    for (const [key, dot] of state.pulseDots) {
      dot.classList.toggle('is-active', now < state.pulseUntil && state.previewPulseSteps.get(key)?.has(step));
    }
  }
  state.pulseFrame = requestAnimationFrame(updatePartPulse);
}
function auditionStart(out, part, item) {
  const lanes = new Set((out.banger.palette || [])
    .filter((entry) => entry.part === part && entry.preset === item.id)
    .map((entry) => entry.lane));
  const bars = songBars(out.bank);
  const firstIndex = lanes.size ? bars.findIndex(({ b, half }) =>
    [...lanes].some((lane) => hasNoteInBar(b?.[lane], half))) : -1;
  const firstBar = firstIndex < 0 ? null : firstIndex + 1;
  // A one-bar lead-in makes the entrance clear without asking the user to wait through
  // an unrelated intro. Keep the full arrangement after that point for context.
  const startBar = firstBar == null ? 1 : Math.max(1, firstBar - 1);
  const arrangement = {
    ...(out.arrangement || {}),
    loop: { ...(out.arrangement?.loop || {}), startBar, fromBar: startBar, toBar: bars.length },
  };
  return { startBar, firstBar, arrangement };
}
function stop() {
  if (!state.playing) return;
  Audio.setBank(null); state.playing = false;
  clearPartPulse();
  state.playingKey = null;
  $('preview-play').textContent = 'Preview Song';
  renderPreviewStatus();
}
function playPreview(part = null, item = null) {
  const key = part && item ? `${part}:${item.id}` : 'all';
  if (state.playing && state.playingKey === key) { stop(); return; }
  if (state.playing) stop();
  try {
    Audio.ensure(); Audio.resumeAfterPanic?.();
    const previewOut = makePreview(part, item);
    const audition = part && item ? auditionStart(previewOut, part, item) : null;
    Audio.setBank(previewOut.bank, previewOut.mix, audition?.arrangement || previewOut.arrangement,
      { startAtBeginning: !audition, gap: 0.05 });
    state.previewOut = previewOut;
    state.previewAudition = audition ? { startBar: audition.startBar, firstBar: audition.firstBar } : null;
    state.previewPulseSteps = makePreviewPulseSteps(previewOut);
    state.pulseLastStep = null; state.pulseUntil = 0;
    state.previewContext = { styleId: contextStyle(), moodId: contextMood(), source: state.source, riffMode: state.riffMode };
    state.playing = true; state.playingKey = key;
    $('preview-play').textContent = '■ Stop';
    renderPresets();
  } catch (err) {
    $('preview-status').textContent = `Could not make this preview: ${err.message}`;
    $('preview-status').className = 'warning';
  }
}

// ---------------------------------------------------------------- Edit Sound
// The desk's preset editor, in a frame over this page (tools/banger-voice-entry.js), playing
// a preview banger with this preset in its part. The frame is a page of its own with its
// own engine, so this page's preview stops while it is up; it says when it saved something,
// and this page's copy of the preset follows. A Save as New is swapped in for the sound it
// was made from, in the scope being edited, for Save Changes to keep.
let editorFrame = null;
let editorPayload = null;
function partLabel(part) {
  if (LABEL[part]) return LABEL[part];
  const key = part.slice(part.indexOf(':') + 1);
  return key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}
function scopeLabel() {
  if (state.scope === 'style') return `${styleOf().label} style palette`;
  if (state.scope === 'mood') return `${MOOD_LABEL(state.moodId)} mood palette`;
  return `${styleOf().label} · ${MOOD_LABEL(state.moodId)} palette`;
}
function setEditStatus(text, cls = '') {
  const el = $('edit-status');
  el.textContent = text;
  el.className = cls;
  el.hidden = !text;
}
function openEditor(part, item) {
  if (editorFrame) return;
  if (state.playing) stop();
  let out; let audition;
  try {
    // A riff part only plays a palette preset when its sound is drawn from the palette.
    out = makePreview(part, item, part.startsWith('riff:') ? 'random' : state.riffMode);
    audition = auditionStart(out, part, item);
  } catch (err) {
    setEditStatus(`Could not make a banger to edit this sound in: ${err.message}`, 'warning');
    return;
  }
  // A lane on a song-local copy (a generated riser) plays that copy, not a preset.
  const copies = new Set(Object.keys(out.mix?.voiceParams || {}));
  const sounds = (out.banger.palette || []).filter((e) => !copies.has(`${e.lane}Voice`))
    .map((e) => ({ lane: e.lane, part: e.part, label: partLabel(e.part), preset: e.preset }));
  editorPayload = {
    type: 'banger-edit', preset: item.id, sounds,
    context: `${styleOf().label} · ${MOOD_LABEL(contextMood())}`,
    song: JSON.parse(JSON.stringify({ bank: out.bank, mix: out.mix, arrangement: audition.arrangement })),
  };
  setEditStatus('');
  editorFrame = h('iframe', { id: 'sound-editor', src: '/edit', title: 'Sound editor', allow: 'autoplay; midi' });
  document.body.append(editorFrame);
  document.body.classList.add('editing');
}
function closeEditor() {
  editorFrame?.remove();
  editorFrame = null;
  editorPayload = null;
  document.body.classList.remove('editing');
}
/** The frame saved `id`: this page's catalogue entry becomes what was filed. */
function applySaved({ id, kind, preset, level, peak, library, from, part }) {
  const filed = { ...clone(preset), id, kind, level, peak, ...(library ? { factory: true } : { user: true }) };
  const live = VOICES[id];
  if (live) { for (const key of Object.keys(live)) delete live[key]; Object.assign(live, filed); }
  else VOICES[id] = filed;
  try { if (Audio.ctx) Audio.refreshVoice(id); } catch { /* nothing of it is sounding */ }
  const name = titleOf(id);
  if (!from || from === id) {
    setEditStatus(`Saved ${name}. Every song and banger that names it plays the new version — reload the game to hear it there.`);
  } else if (part && LABEL[part]) {
    swapIn(part, from, id);
    setEditStatus(`Saved ${name} as a new preset and swapped it in for ${titleOf(from)} on ${LABEL[part]} in the ${scopeLabel()}. Save Changes to keep the swap.`);
  } else {
    setEditStatus(`Saved ${name} as a new preset. ${part ? partLabel(part) : 'That part'} is not on this palette — put it in place on the Advanced page to use it.`);
  }
  render();
}
/** Put `to` where `from` was in this scope, with its level, effects and sends. */
function swapIn(part, from, to) {
  const old = candidates(part).find((e) => e.id === from) || {};
  const scope = targetScope();
  const entries = (scope.parts[part] ||= { entries: {} }).entries;
  entries[to] = {
    enabled: true,
    ...(old.favourite ? { favourite: true } : {}),
    ...(old.trimDb ? { trimDb: old.trimDb } : {}),
    ...(Array.isArray(old.inserts) ? { inserts: clone(old.inserts) } : {}),
    ...(old.send ? { send: clone(old.send) } : {}),
  };
  entries[from] = { ...(entries[from] || {}), enabled: false };
}
addEventListener('message', (ev) => {
  if (!editorFrame || ev.origin !== location.origin || ev.source !== editorFrame.contentWindow) return;
  const msg = ev.data || {};
  if (msg.type === 'banger-voice-ready' && editorPayload) editorFrame.contentWindow.postMessage(editorPayload, location.origin);
  else if (msg.type === 'banger-voice-saved') applySaved(msg);
  else if (msg.type === 'banger-voice-close') closeEditor();
});

function updateStatus() {
  if (!state.palette) return;
  const isDirty = dirty();
  const status = $('status'); status.className = isDirty ? 'dirty' : '';
  status.textContent = isDirty ? 'Unsaved palette changes' : 'Palette saved';
  $('save').disabled = !isDirty;
  $('discard').disabled = !isDirty;
}
function render() {
  if (!state.palette || !state.sounds) return;
  renderScope(); renderPartChooser(); renderRiffPicker(); renderPresets(); updateStatus();
}
async function save() {
  const issues = paletteIssues(state.palette, { sounds: state.sounds });
  if (issues.length) { $('status').className = 'bad'; $('status').textContent = issues[0]; return; }
  const response = await fetch('/palette/save', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ palette: tidyPalette(state.palette), hash: state.hash }) });
  const body = await response.json();
  if (!response.ok) {
    $('status').className = 'bad';
    $('status').textContent = body.issues?.length ? `${body.error}: ${body.issues[0]}` : body.error || `Save failed (${response.status})`;
    return;
  }
  state.palette = tidyPalette(state.palette); state.saved = JSON.stringify(state.palette); state.hash = body.hash; render();
  $('status').textContent = 'Saved palette. Reload the game before making new Bangers with these choices.';
}
$('save').onclick = save;
$('discard').onclick = () => { state.palette = JSON.parse(state.saved); render(); };
$('preview-play').onclick = () => {
  if (state.playing) { stop(); return; }
  playPreview(state.part, candidates().find((item) => item.enabled && isCompatible(item.id)) || null);
};
$('new-preview').onclick = () => { state.seed = (state.seed + 2654435761) >>> 0; if (state.playing) stop(); playPreview(); };

Promise.all([fetch('/sounds').then((r) => r.json()), fetch('/palette').then((r) => r.json())]).then(([soundReply, paletteReply]) => {
  state.sounds = soundReply.table;
  state.palette = tidyPalette(paletteReply.palette || BANGER_PALETTE);
  state.hash = paletteReply.hash;
  state.saved = JSON.stringify(state.palette);
  render();
}).catch((err) => { $('status').className = 'bad'; $('status').textContent = `Could not load the palette: ${err.message}`; });
addEventListener('beforeunload', (event) => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
