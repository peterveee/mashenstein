// BANGER SOUNDS, browser half — `npm run banger-sounds`. See tools/banger-sounds.js.
//
// The page holds a DRAFT of the sounds table and renders every section from it. Every
// dropdown is built from the rulebook (tools/lib/banger/sound-rules.js): what may go in a
// slot is listed and choosable, what may not is listed shut, with the reason. Every
// audition and the test banger play the draft through the game's own engine, so what you
// hear is what Make a Banger… would make once you Save.
import { Audio } from '../src/engine/audio.js';
import { VOICES } from '../src/data/voices.js';
import { resolveTrack, listTracks } from '../src/data/tracks.js';
import { MIX } from '../src/data/mix.js';
import { ARRANGEMENTS } from '../src/data/arrangements.js';
import { deskBank, laneList } from '../src/engine/lanes.js';
import { draftOf } from './lib/arrangement-edit.js';
import { createCustomSelect } from './lib/custom-select.js';
import {
  generateBanger, extractRiff, BANGER_MOODS, BANGER_STYLES, BANGER_SOUND_SETS, BANGER_VARIATIONS, BANGER_LENGTHS, styleFor,
} from './lib/banger/index.js';
import {
  PART_SLOTS, KIT_ROLES, KITS, RANDOM_JOBS, CHOICE_SLOTS, MOOD_IDS, soundIssues, slotChoices, tableIssues, slotsFor,
} from './lib/banger/sound-rules.js';
import { tidyTable } from './lib/banger/sounds-source.js';
import { BANGER_COMBOS } from './lib/banger/combos.js';
import { auditionSong } from './lib/banger/audition.js';

const $ = (id) => document.getElementById(id);
const clone = (v) => JSON.parse(JSON.stringify(v));
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const labelOf = (id) => VOICES[id]?.label || id || '—';
const metaOf = (id) => {
  const v = VOICES[id];
  if (!v) return '';
  return `${v.category || ''} · ${v.synth || (v.kind === 'drum' ? 'KLNG8' : v.kind)}${v.starter ? ' · frozen' : ''}`;
};

// ---------------------------------------------------------------- state
const state = {
  table: null,          // the draft
  saved: '',            // the table as last loaded or saved, tidy JSON
  hash: null,           // the file's hash when it was read — a Save is refused if it moved
  styleId: BANGER_STYLES[0].id,
  playing: null,        // the key of whatever is sounding
  harvest: null,        // songs from /harvest
  harvestGroups: new Set(['alternate', 'copy']),
  test: { source: 'az', from: 1, to: 1, mood: 'anthemic', variation: 'some', length: 'short', kit: 'style', riffSound: 'keep', seed: 1 },
};
const sounds = () => state.table[state.styleId];
const style = () => styleFor(state.styleId);
const never = () => sounds().never || [];
// A phone style (a lite recipe) shuts MRDR-3 and JMJR-4: sound-rules.js.
const phone = () => !!style()?.phone;
const dirty = () => JSON.stringify(tidyTable(state.table)) !== state.saved;

// ---------------------------------------------------------------- dropdowns
// Every preset a slot could hold, choosable or shut — cached per slot and never-list, the
// rulebook being asked several thousand questions per render otherwise.
const choiceCache = new Map();
function choicesFor(slot) {
  const key = `${slot.kind}|${slot.family}|${slot.busy ? 1 : 0}|${slot.random ? 1 : 0}|${slot.key}|${phone() ? 1 : 0}|${never().join(',')}`;
  if (!choiceCache.has(key)) choiceCache.set(key, slotChoices(slot, { never: never(), phone: phone() }));
  return choiceCache.get(key);
}
let selectSeq = 0;
function presetSelect({ slot, value, onChange, empty = null, exclude = [], label = slot.label }) {
  const rows = [];
  if (empty != null) rows.push(['', empty, '']);
  for (const c of choicesFor(slot)) {
    if (exclude.includes(c.id) && c.id !== value) continue;
    const note = c.blocked.length ? `✕ ${c.blocked[0]}`
      : `${c.category} · ${c.synth}${c.starter ? ' · frozen' : ''}${c.warnings.length ? ` · ${c.warnings[0]}` : ''}`;
    rows.push([c.id, c.label, note, c.blocked.length > 0]);
  }
  if (value && !rows.some(([id]) => id === value)) rows.unshift([value, labelOf(value), '✕ not available here', true]);
  const field = createCustomSelect({
    label, idPrefix: `bs-${++selectSeq}`, options: rows, value: value ?? '',
    fieldClass: 'bsel', menuClass: 'bsmenu', optionClass: 'bsopt',
  });
  field.addEventListener('input', () => onChange(field.value));
  return field;
}
function plainSelect({ label, options, value, onChange }) {
  const field = createCustomSelect({
    label, idPrefix: `bs-${++selectSeq}`, options, value,
    fieldClass: 'bsel', menuClass: 'bsmenu', optionClass: 'bsopt',
  });
  field.addEventListener('input', () => onChange(field.value));
  return field;
}

// ---------------------------------------------------------------- the engine
let armed = false;
function ensureAudio() {
  if (armed) return;
  Audio.ensure();
  Audio.resumeAfterPanic?.();
  armed = true;
}
function play(key, bank, mix, arrangement = null) {
  ensureAudio();
  Audio.setBank(bank, mix, arrangement, { startAtBeginning: true, gap: 0.05 });
  state.playing = key;
  paintPlaying();
}
function stop() {
  if (!state.playing) return;
  Audio.setBank(null);
  state.playing = null;
  paintPlaying();
}
function toggle(key, make) {
  if (state.playing === key) { stop(); return; }
  const { bank, mix, arrangement } = make();
  play(key, bank, mix, arrangement);
}
function paintPlaying() {
  document.querySelectorAll('[data-play]').forEach((b) => {
    const on = b.dataset.play === state.playing;
    b.classList.toggle('on', on);
    if (b.classList.contains('play')) b.textContent = on ? '■' : '▶';
  });
  const tb = $('testplay');
  if (tb) tb.textContent = state.playing === 'test' ? '■ Stop' : '▶ Play';
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.playing && !document.querySelector('.bsmenu:not([hidden])')) stop();
});

// ---------------------------------------------------------------- auditions
// Two bars of the slot's real job — see tools/lib/banger/audition.js.
const auditionOf = (slot, id) => auditionSong({
  slot, id, style: style(), kit: sounds().kits.style, beat: !!$('withbeat')?.checked,
});
function playButton(key, slot, idOf) {
  const b = h('button', { class: 'play', 'data-play': key, title: 'Audition — the sound in its real job' }, '▶');
  b.onclick = () => {
    const id = idOf();
    if (!id) return;
    toggle(key, () => auditionOf(slot, id));
  };
  return b;
}

// ---------------------------------------------------------------- the test banger
// The ABSOLUTE ZERO hook, so there is always a riff without picking a song.
const BUILT_IN = {
  version: 1, source: { id: 'absolute-zero', title: 'FROST HOOK', from: 0, to: 0, bpm: 128 }, bars: 1, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Electric Grand', kind: 'melodic', role: 'hook', voice: 'mrdrElectricGrand',
    voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
    bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .'] }],
};
const testSongs = () => listTracks().filter((t) => (t.group === 'cabinet' || t.group === 'theme') && resolveTrack(t.id)?.bank);
function testRiff() {
  const t = state.test;
  if (t.source === 'az') return BUILT_IN;
  const track = resolveTrack(t.source);
  const bank = deskBank(track.bank, MIX[t.source] || null);
  const draft = draftOf(bank, ARRANGEMENTS[t.source] || null);
  const from = Math.max(1, Math.min(draft.plan.length, t.from)) - 1;
  const to = Math.max(from, Math.min(draft.plan.length - 1, Math.min(from + 7, t.to - 1)));
  return extractRiff({ bank, draft, mix: MIX[t.source] || null, from, to, laneKeys: laneList(bank).map((l) => l.key), source: { id: t.source, title: track.title } });
}
let testOut = null;
function makeTest() {
  const t = state.test;
  testOut = generateBanger({
    riff: testRiff(),
    options: { style: state.styleId, mood: t.mood, variation: t.variation, length: t.length,
      drums: { kit: t.kit }, parts: { riffSound: t.riffSound }, combo: BANGER_COMBOS[state.styleId]?.[t.combo] ? t.combo : null },
    seed: t.seed,
    sounds: tidyTable(state.table),
  });
  return { bank: testOut.bank, mix: testOut.mix, arrangement: testOut.arrangement };
}

/**
 * The test banger, as it stands on this page (unsaved choices and all), written as a banger
 * of its own and opened on the desk — so a sound can be tuned in a whole mix rather than in
 * two bars. There, Save as Combo keeps what you settle on.
 */
async function openOnDesk() {
  makeTest();
  $('status').className = '';
  $('status').textContent = 'Writing the test banger…';
  const res = await fetch('/open-on-desk', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ generated: testOut }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    $('status').className = 'bad';
    $('status').textContent = body.error || `Not written (${res.status})`;
    return;
  }
  $('status').textContent = `${body.title} is on the desk's Bangers shelf — tune it there, then Save as Combo`;
  window.open(`${location.protocol}//${location.hostname}:8010/?song=${encodeURIComponent(body.id)}`, '_blank', 'noopener');
}
function renderTest() {
  const box = $('testcontrols');
  box.textContent = '';
  const t = state.test;
  const field = (label, el) => h('label', {}, label, el);
  const sources = [['az', 'Frost hook (built in)', '1 bar'], ...testSongs().map((s) => [s.id, s.title, s.group])];
  box.append(
    field('Riff', plainSelect({ label: 'Riff', options: sources, value: t.source, onChange: (v) => { t.source = v; renderTest(); } })),
    t.source === 'az' ? '' : field('From Bar', h('input', { type: 'number', min: 1, value: t.from, oninput: (e) => { t.from = Number(e.target.value) || 1; } })),
    t.source === 'az' ? '' : field('To Bar', h('input', { type: 'number', min: 1, value: t.to, oninput: (e) => { t.to = Number(e.target.value) || 1; } })),
    field('Mood', plainSelect({ label: 'Mood', options: BANGER_MOODS.map((m) => [m.id, m.label]), value: t.mood, onChange: (v) => { t.mood = v; } })),
    field('Variation', plainSelect({ label: 'Variation', options: BANGER_VARIATIONS.map((v) => [v.id, v.label]), value: t.variation, onChange: (v) => { t.variation = v; } })),
    field('Length', plainSelect({ label: 'Length', options: BANGER_LENGTHS.filter((l) => l.bars).map((l) => [l.id, `${l.label} · ${l.bars} bars`]), value: t.length, onChange: (v) => { t.length = v; } })),
    field('Kit', plainSelect({ label: 'Kit', options: KITS.map((k) => [k.key, k.label]), value: t.kit, onChange: (v) => { t.kit = v; } })),
    field('Riff Sound', plainSelect({ label: 'Riff Sound', options: [['keep', 'Keep'], ['random', 'Random']], value: t.riffSound, onChange: (v) => { t.riffSound = v; } })),
    Object.keys(BANGER_COMBOS[state.styleId] || {}).length
      ? field('Sounds', plainSelect({ label: 'Sounds', options: [['', 'Style Sounds'], ...Object.entries(BANGER_COMBOS[state.styleId]).map(([id, c]) => [id, c.label])], value: t.combo || '', onChange: (v) => { t.combo = v || null; } }))
      : '',
    field('Seed', h('input', { type: 'number', min: 1, value: t.seed, oninput: (e) => { t.seed = Number(e.target.value) || 1; } })),
    h('button', { onclick: () => { t.seed = Math.floor(Math.random() * 1e6) + 1; renderTest(); if (state.playing === 'test') { stop(); playTest(); } }, title: 'A new seed — another take' }, 'Another Take'),
    h('button', { id: 'testplay', class: 'primary', 'data-play': 'test', onclick: () => (state.playing === 'test' ? stop() : playTest()) }, state.playing === 'test' ? '■ Stop' : '▶ Play'),
    h('button', { id: 'testdesk', onclick: openOnDesk, title: 'Write this test banger as a banger of its own and open it on the desk, to tune its sounds in a whole mix' }, 'Open on the Desk'),
  );
}
function playTest() {
  try {
    const song = makeTest();
    play('test', song.bank, song.mix, song.arrangement);
  } catch (err) {
    $('readout').textContent = `Could not make it: ${err.message}`;
    return;
  }
  paintReadout();
}
function paintReadout() {
  const box = $('readout');
  if (!testOut) { box.textContent = ''; return; }
  const sm = testOut.summary;
  const beat = state.playing === 'test' ? Audio.songBeat?.() : null;
  const bar = beat != null ? ((Math.floor(beat / 4)) % sm.bars) + 1 : null;
  box.textContent = '';
  box.append(
    h('div', {}, `${sm.style} · ${sm.mood} · ${sm.key} · ${sm.variation} · ${sm.bars} bars at ${sm.bpm} BPM`
      + `${bar ? ` · bar ${bar}` : ''} · hook ${sm.hook}`),
    h('div', { class: 'form' }, testOut.form.map((f) => h('span', { class: bar && bar >= f.from && bar <= f.to ? 'now' : '' }, `${f.label} ${f.from}–${f.to}`))),
  );
}
setInterval(() => { if (state.playing === 'test') paintReadout(); }, 300);

// ---------------------------------------------------------------- sections
function changed() {
  choiceCache.clear();
  renderAll();
}
function problemsOf(id, slot) {
  if (!id) return null;
  const { blocked, warnings } = soundIssues(id, slot, { never: never(), phone: phone() });
  if (blocked.length) return h('span', { class: 'problem' }, `✕ ${blocked.join('; ')}`);
  if (warnings.length) return h('span', { class: 'warn' }, warnings.join('; '));
  return h('span', { class: 'note' }, metaOf(id));
}

function renderParts() {
  const box = $('partrows');
  box.textContent = '';
  let group = null;
  for (const slot of slotsFor(state.styleId)) {
    if (slot.group !== group) { group = slot.group; box.append(h('h3', {}, group)); }
    const id = sounds().parts[slot.key];
    const field = presetSelect({ slot, value: id, onChange: (v) => { sounds().parts[slot.key] = v; changed(); } });
    if (problemsOf(id, slot)?.classList.contains('problem')) field.classList.add('problem-field');
    box.append(h('div', { class: 'row' },
      h('div', { class: 'name' }, h('b', {}, slot.label), slot.note ? h('small', {}, slot.note) : ''),
      field,
      playButton(`part:${slot.key}`, slot, () => sounds().parts[slot.key]),
      problemsOf(id, slot)));
  }
}

function renderKits() {
  const box = $('kittable');
  box.textContent = '';
  const table = h('table', { class: 'kits' });
  table.append(h('tr', {}, h('th', {}, ''), KITS.map((k) => h('th', {}, k.label))));
  for (const role of KIT_ROLES) {
    const tr = h('tr', {}, h('th', {}, role.label));
    for (const kit of KITS) {
      const roles = sounds().kits[kit.key] ||= {};
      const id = roles[role.key];
      const field = presetSelect({
        slot: role, value: id || '', label: `${kit.label} ${role.label}`,
        empty: kit.key === 'style' ? null : '— style kit —',
        onChange: (v) => { if (v) roles[role.key] = v; else delete roles[role.key]; changed(); },
      });
      const p = problemsOf(id, role);
      if (p?.classList.contains('problem')) field.classList.add('problem-field');
      tr.append(h('td', {}, h('div', { class: 'cell' }, field,
        playButton(`kit:${kit.key}:${role.key}`, role, () => roles[role.key] || sounds().kits.style[role.key])),
      p?.classList.contains('problem') ? p : ''));
    }
    table.append(tr);
  }
  box.append(table);
}

function chip({ id, slot, key, onRemove }) {
  // A chip with no slot (a mood's skip, the never-use list) only has to name a real preset.
  const { blocked, warnings } = slot ? soundIssues(id, slot, { never: never(), phone: phone() })
    : { blocked: VOICES[id] ? [] : ['not a preset in the library'], warnings: [] };
  return h('span', { class: `chip${blocked.length ? ' bad' : warnings.length ? ' warned' : ''}`, title: [metaOf(id), ...blocked, ...warnings].join(' — ') },
    slot ? playButton(key, slot, () => id) : '',
    h('span', {}, labelOf(id)),
    blocked.length ? h('small', { class: 'problem' }, '✕') : warnings.length ? h('small', { class: 'warn' }, '!') : '',
    h('button', { class: 'x', title: 'Remove', onclick: onRemove }, '×'));
}

function renderRandom() {
  const box = $('randomlists');
  box.textContent = '';
  for (const job of RANDOM_JOBS) {
    const list = sounds().random[job.key] ||= [];
    const add = presetSelect({
      slot: job, value: '', empty: '+ Add…', exclude: list, label: `Add to the ${job.label} list`,
      onChange: (v) => { if (v && !list.includes(v)) list.push(v); changed(); },
    });
    add.style.width = '220px';
    box.append(h('div', { class: 'job' },
      h('b', {}, job.label), h('span', { class: 'note' }, ` ${list.length} sounds · categories: ${job.categories.join(', ')}`),
      h('div', { class: 'chips' }, list.map((id, i) => chip({
        id, slot: job, key: `random:${job.key}:${id}`, onRemove: () => { list.splice(i, 1); changed(); },
      })), add)));
  }
}

function renderChoices() {
  const box = $('choicelists');
  box.textContent = '';
  const choices = sounds().choices ||= {};
  for (const k of CHOICE_SLOTS) {
    const slot = slotsFor(state.styleId).find((p) => p.key === k);
    if (!slot) continue;
    const list = choices[k] ||= [];
    const own = sounds().parts[k];
    const add = presetSelect({
      slot, value: '', empty: '+ Add…', exclude: [own, ...list], label: `Add to the ${slot.label} shortlist`,
      onChange: (v) => { if (v && v !== own && !list.includes(v)) list.push(v); changed(); },
    });
    add.style.width = '220px';
    box.append(h('div', { class: 'job' },
      h('b', {}, slot.label), h('span', { class: 'note' }, list.length ? ` the style's own (${labelOf(own)}) + ${list.length}` : ' always the style\'s own'),
      h('div', { class: 'chips' }, list.map((id, i) => chip({
        id, slot, key: `choices:${k}:${id}`, onRemove: () => { list.splice(i, 1); changed(); },
      })), add)));
  }
}

function renderMoods() {
  const box = $('moodlist');
  box.textContent = '';
  for (const mood of MOOD_IDS) {
    const m = sounds().moods[mood] ||= { parts: {}, skip: [] };
    m.parts ||= {}; m.skip ||= [];
    const label = BANGER_MOODS.find((x) => x.id === mood)?.label || mood;
    const rows = Object.entries(m.parts).map(([k, id]) => {
      const slot = slotsFor(state.styleId).find((p) => p.key === k);
      if (!slot) return '';
      return h('div', { class: 'row' },
        h('div', { class: 'name' }, h('b', {}, slot.label), h('small', {}, `instead of ${labelOf(sounds().parts[k])}`)),
        presetSelect({ slot, value: id, onChange: (v) => { m.parts[k] = v; changed(); } }),
        playButton(`mood:${mood}:${k}`, slot, () => m.parts[k]),
        h('span', {}, problemsOf(id, slot), ' ', h('button', { onclick: () => { delete m.parts[k]; changed(); } }, 'Remove')));
    });
    const free = slotsFor(state.styleId).filter((p) => !(p.key in m.parts));
    const addOverride = plainSelect({
      label: `Override a part for ${label}`, value: '',
      options: [['', '+ Override a Part…'], ...free.map((p) => [p.key, p.label, `now ${labelOf(sounds().parts[p.key])}`])],
      onChange: (k) => { if (k) { m.parts[k] = sounds().parts[k]; changed(); } },
    });
    addOverride.style.width = '240px';
    const pool = [...new Set(RANDOM_JOBS.flatMap((j) => sounds().random[j.key] || []))].filter((id) => !m.skip.includes(id));
    const addSkip = plainSelect({
      label: `Skip from Random for ${label}`, value: '',
      options: [['', '+ Skip from Random…'], ...pool.map((id) => [id, labelOf(id), metaOf(id)])],
      onChange: (id) => { if (id) { m.skip.push(id); changed(); } },
    });
    addSkip.style.width = '240px';
    box.append(h('div', { class: 'mood' },
      h('h3', {}, label),
      rows.length ? rows : h('div', { class: 'note' }, 'Every part is the style\'s own choice.'),
      h('div', { class: 'chips', style: 'margin-top:8px' }, addOverride),
      h('div', { class: 'note', style: 'margin-top:10px' }, 'Skipped from Random:'),
      h('div', { class: 'chips' }, m.skip.map((id, i) => chip({ id, slot: null, onRemove: () => { m.skip.splice(i, 1); changed(); } })), addSkip)));
  }
}

function renderNever() {
  const box = $('neverlist');
  box.textContent = '';
  const list = sounds().never ||= [];
  const all = Object.entries(VOICES).filter(([id, v]) => !v.songLocal && !v.nameOnly && !list.includes(id))
    .sort((a, b) => (a[1].category || '').localeCompare(b[1].category || '') || (a[1].label || a[0]).localeCompare(b[1].label || b[0]));
  const add = plainSelect({
    label: 'Never use', value: '',
    options: [['', '+ Never Use…'], ...all.map(([id, v]) => [id, v.label || id, `${v.category || ''} · ${v.synth || v.kind}`])],
    onChange: (id) => { if (id) { list.push(id); changed(); } },
  });
  add.style.width = '260px';
  box.append(h('div', { class: 'chips' }, list.length ? '' : h('span', { class: 'note' }, 'Nothing yet.'),
    list.map((id, i) => chip({ id, slot: null, onRemove: () => { list.splice(i, 1); changed(); } })), add));
}

// ---------------------------------------------------------------- from your songs
const HARVEST_GROUPS = [
  ['alternate', 'Remixes & Alternates'], ['copy', 'Saved Copies'], ['game', 'Game Songs'],
  ['scratch', 'Scratch Songs'], ['styleAudition', 'Style Auditions'], ['imported', 'MIDI Imports'],
];
const HARVEST_SHELVES = [
  ['Leads & Keys', (f) => ['lead', 'leadHarm', 'twinkle'].includes(f)],
  ['Bass', (f) => f === 'bass'],
  ['Chords & Pads', (f) => ['chords', 'organChords'].includes(f)],
  ['Drums & Percussion', (f) => ['kick', 'snare', 'clap', 'rim', 'hats', 'ohats', 'crash', 'tom'].includes(f)],
  ['Everything Else', () => true],
];
/** Every slot an id may go in, as Use As… targets: `[value, label, note]`. */
function targetsFor(id) {
  const out = [];
  const nv = never();
  for (const slot of slotsFor(state.styleId)) {
    if (soundIssues(id, slot, { never: nv, phone: phone() }).blocked.length || sounds().parts[slot.key] === id) continue;
    out.push([`part:${slot.key}`, `Part · ${slot.label}`, `now ${labelOf(sounds().parts[slot.key])}`]);
  }
  for (const kit of KITS) {
    for (const role of KIT_ROLES) {
      if (soundIssues(id, role, { never: nv, phone: phone() }).blocked.length || sounds().kits[kit.key]?.[role.key] === id) continue;
      out.push([`kit:${kit.key}:${role.key}`, `Kit · ${kit.label} · ${role.label}`, `now ${labelOf(sounds().kits[kit.key]?.[role.key] || sounds().kits.style[role.key])}`]);
    }
  }
  for (const job of RANDOM_JOBS) {
    if (soundIssues(id, job, { never: nv, phone: phone() }).blocked.length || (sounds().random[job.key] || []).includes(id)) continue;
    out.push([`random:${job.key}`, `Random · add to the ${job.label} list`, `${(sounds().random[job.key] || []).length} there now`]);
  }
  return out;
}
function useAs(id, target) {
  const [kind, a, b] = target.split(':');
  if (kind === 'part') sounds().parts[a] = id;
  if (kind === 'kit') (sounds().kits[a] ||= {})[b] = id;
  if (kind === 'random') (sounds().random[a] ||= []).push(id);
  changed();
}
/** Where an id already is in the table, in words. */
function placesOf(id) {
  const out = [];
  for (const [k, v] of Object.entries(sounds().parts)) if (v === id) out.push(PART_SLOTS.find((p) => p.key === k)?.label || k);
  for (const [kit, roles] of Object.entries(sounds().kits)) for (const [r, v] of Object.entries(roles)) if (v === id) out.push(`${KITS.find((k) => k.key === kit)?.label || kit} ${r}`);
  for (const [job, list] of Object.entries(sounds().random)) if (list.includes(id)) out.push(`${job} list`);
  return out;
}
function auditionSlotFor(v, family) {
  if (v.kind === 'drum') return KIT_ROLES.find((r) => r.family === family) || PART_SLOTS.find((p) => p.family === family && p.kind === 'drum') || KIT_ROLES[0];
  if (family === 'bass') return RANDOM_JOBS.find((j) => j.key === 'bass');
  if (family === 'chords' || family === 'organChords') return RANDOM_JOBS.find((j) => j.key === 'chords');
  return RANDOM_JOBS.find((j) => j.key === 'hook');
}
function renderHarvest() {
  const box = $('harvest');
  box.textContent = '';
  if (!state.harvest) {
    box.append(h('button', { id: 'scan', onclick: scan }, 'Scan Songs'));
    return;
  }
  const filters = h('div', { class: 'harvest-filters' }, HARVEST_GROUPS.map(([g, label]) => {
    const n = state.harvest.filter((s) => s.group === g).length;
    return h('label', {}, h('input', {
      type: 'checkbox', checked: state.harvestGroups.has(g) || null,
      onchange: (e) => { if (e.target.checked) state.harvestGroups.add(g); else state.harvestGroups.delete(g); renderHarvest(); },
    }), `${label} (${n})`);
  }), h('button', { onclick: scan }, 'Scan Again'));
  box.append(filters);
  const presets = new Map();
  for (const song of state.harvest) {
    if (!state.harvestGroups.has(song.group)) continue;
    for (const { family, id } of song.voices) {
      const p = presets.get(id) || { id, families: new Set(), songs: new Map() };
      p.families.add(family);
      p.songs.set(song.id, song.title || song.id);
      presets.set(id, p);
    }
  }
  if (!presets.size) { box.append(h('div', { class: 'note' }, 'No songs in the ticked groups.')); return; }
  const shelved = new Set();
  for (const [shelf, test] of HARVEST_SHELVES) {
    const rows = [...presets.values()].filter((p) => !shelved.has(p.id) && [...p.families].some(test))
      .sort((a, b) => b.songs.size - a.songs.size || labelOf(a.id).localeCompare(labelOf(b.id)));
    if (!rows.length) continue;
    rows.forEach((p) => shelved.add(p.id));
    box.append(h('h3', {}, `${shelf} · ${rows.length}`));
    for (const p of rows) {
      const v = VOICES[p.id];
      const slot = auditionSlotFor(v, [...p.families][0]);
      const targets = targetsFor(p.id);
      const places = placesOf(p.id);
      const use = targets.length
        ? plainSelect({ label: `Use ${labelOf(p.id)} as`, value: '', options: [['', 'Use As…'], ...targets], onChange: (t) => { if (t) useAs(p.id, t); } })
        : h('span', { class: 'note' }, v.kind === 'engine' ? 'engine sound — no banger slot' : 'no slot allows it');
      box.append(h('div', { class: 'hrow' },
        slot ? playButton(`harvest:${p.id}`, slot, () => p.id) : h('span'),
        h('div', {}, h('b', {}, labelOf(p.id)), ' ', h('span', { class: 'note' }, p.id)),
        h('span', { class: 'note' }, metaOf(p.id)),
        h('span', { class: 'count', title: [...p.songs.values()].join('\n') }, `${p.songs.size} song${p.songs.size === 1 ? '' : 's'}`),
        h('span', { class: 'used' }, places.length ? `in: ${places.join(', ')}` : ''),
        use));
    }
  }
}
async function scan() {
  $('harvest').textContent = 'Reading the songs…';
  try {
    const res = await fetch('/harvest');
    state.harvest = (await res.json()).songs;
  } catch (err) {
    $('harvest').textContent = `Could not read the songs: ${err.message}`;
    return;
  }
  renderHarvest();
}

// ---------------------------------------------------------------- status, save
function renderStatus() {
  const issues = tableIssues(tidyTable(state.table));
  const isDirty = dirty();
  const st = $('status');
  st.className = issues.length ? 'bad' : isDirty ? 'dirty' : '';
  st.textContent = issues.length ? `${issues.length} problem${issues.length === 1 ? '' : 's'} — fix them to save`
    : isDirty ? 'Unsaved changes' : 'Saved';
  $('save').disabled = !isDirty || issues.length > 0;
  $('revert').disabled = !isDirty;
  const box = $('issues');
  box.textContent = '';
  for (const i of issues.slice(0, 12)) box.append(h('div', {}, `✕ ${i.where}${i.id ? ` (${labelOf(i.id)})` : ''}: ${i.reason}`));
  if (issues.length > 12) box.append(h('div', {}, `… and ${issues.length - 12} more`));
}
function renderStylePick() {
  const box = $('stylepick');
  box.textContent = '';
  // The Sound Sets (Chipstep · Light …) are edited here like a style: each has its own row.
  const options = [...BANGER_STYLES, ...BANGER_SOUND_SETS].filter((s) => state.table[s.id]).map((s) => [s.id, s.label]);
  box.append(plainSelect({ label: 'Style', options, value: state.styleId, onChange: (v) => { state.styleId = v; changed(); } }));
}
function renderAll() {
  document.dispatchEvent(new Event('mash-close-custom-select'));
  renderStylePick();
  renderTest();
  renderParts();
  renderKits();
  renderRandom();
  renderChoices();
  renderMoods();
  renderNever();
  renderHarvest();
  renderStatus();
  paintPlaying();
}
async function save() {
  const res = await fetch('/save', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ table: tidyTable(state.table), hash: state.hash }) });
  const body = await res.json();
  if (!res.ok) {
    $('status').className = 'bad';
    $('status').textContent = body.error || `Save failed (${res.status})`;
    return;
  }
  state.hash = body.hash;
  state.table = tidyTable(state.table);
  state.saved = JSON.stringify(state.table);
  renderAll();
  $('status').textContent = 'Saved — tools/lib/banger/sounds.js';
}
$('save').onclick = save;
$('revert').onclick = () => { state.table = JSON.parse(state.saved); changed(); };
addEventListener('beforeunload', (e) => { if (state.table && dirty()) { e.preventDefault(); e.returnValue = ''; } });

(async function boot() {
  const res = await fetch('/sounds');
  const { table, hash } = await res.json();
  state.table = tidyTable(table);
  state.saved = JSON.stringify(state.table);
  state.hash = hash;
  if (!state.table[state.styleId]) state.styleId = Object.keys(state.table)[0];
  renderAll();
}());
