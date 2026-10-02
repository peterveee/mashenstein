// MAKE A BANGER — seed bangers, Use as Style, and Sound Combos. 2 Oct 2026.
//
// A SEED BANGER is a style laid out to be tuned: one real song per style, made with every
// part switched on, kept in src/data/imported on its own shelf of the desk's songs (Style
// Seeds). Open it on the desk and tune it in context — swap the drum sounds, try other
// presets, ride the faders, EQ, sends, inserts, the master — then press Use as Style, which
// reads it back:
//
//   · each channel's sound   → the style's sounds (tools/lib/banger/sounds.js — the table
//                              the Banger Sounds page edits too)
//   · each channel's settings → tools/lib/banger/channels.js, over the recipe's own
//   · the master              → channels.js
//   · and the seed becomes what new bangers' faders are matched against (levels-data.js)
//
// A deliberate press, never a live link: trying something on the seed changes no banger
// until somebody says so.
//
// A SOUND COMBO is the same reading of any banger, kept under a name instead
// (tools/lib/banger/combos.js), and chosen in the Make a Banger dialog over the style's own.
//
// A sound tuned on the desk (the voice editor's Save to Song) is a copy only that song has,
// and the sounds table holds library presets only. So Use as Style KEEPS it the way the voice
// editor's Save as New would: a user preset of its own, named for its style and job ("Wide
// Detune · Eurobeat", id seedEurobeatBass), measured, and updated in place the next time
// rather than added again. A combo's get their own (comboEurobeatIcyAnthemBass). Without a way
// to measure (`measure`), a tuned sound is named in the answer instead.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VOICES, seamFor } from '../../src/data/voices.js';
import { upsertPreset, setMeasured, USER_TABLES } from './voices-source.js';
import { soundKey } from './banger/levels.js';
import { songFile } from './song-source.js';
import { IMPORTED_DIR, songFileIn, writeImportedIndex } from './imported-index.js';
import { compactArrangement, normaliseArrangementResolution } from './arrangement-edit.js';
import { generateBanger } from './banger/index.js';
import { styleFor } from './banger/styles/index.js';
import { KIT_ROLES, tableIssues, forgetOffered } from './banger/sound-rules.js';
import { soundsSource, tidyTable } from './banger/sounds-source.js';
import { songFrom, bangerRefs, buildAllRefs, readLevelData, writeLevelData, CHANNELS_FILE } from './banger-refs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const SEED_GROUP = 'bangerSeed';
export const SOUNDS_FILE = 'tools/lib/banger/sounds.js';
export const COMBOS_FILE = 'tools/lib/banger/combos.js';
export const seedIdOf = (styleId) => `banger-seed-${styleId}`;

const fresh = (root, rel) => import(`${pathToFileURL(join(root, rel)).href}?v=${Date.now()}`);
const clone = (x) => (x == null ? x : structuredClone(x));
const KIT = new Set(KIT_ROLES.map((r) => r.key));

// ---------------------------------------------------------------- the seeds
// What a seed is made from: ABSOLUTE ZERO's hook, and a second bar that leaves the hook room
// so the counter-melody has gaps to play in. On ABSOLUTE ZERO's own Electric Grand.
const SEED_RIFF = {
  version: 1, source: { id: 'banger-seed', title: 'SEED', from: 0, to: 1, bpm: 128 }, bars: 2, grid: 16, stats: {},
  parts: [{
    key: 'lead', label: 'Grand', kind: 'melodic', role: 'hook', meanPitch: 74, voice: 'mrdrElectricGrand',
    voiceParams: null, engineKeys: null, strip: null,
    bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .', 'D5:4 . . . A4:2 . . . F5:2 . . . E5:2 . . .'],
  }],
};
/**
 * Every part a style can play, switched on — so every channel it has is there to tune — on
 * the style's OWN sounds, never a roll from its shortlists.
 */
export const seedOptions = (style) => ({
  style: style.id,
  parts: { sub: true, thirdBelow: true, counter: true, arp: true, choir: true, bell: true, square: true, octaveDouble: true, partSounds: 'style' },
  drums: { shaker: true, tambourine: true, congas: true, cowbell: true, ride: true },
});

/**
 * Make a style's seed banger (again, with `force` — the tuning on the old one is lost).
 * Returns `{ id, file, path }`.
 */
export function makeSeed(root, style, { force = false } = {}) {
  const id = seedIdOf(style.id);
  const path = join(root, IMPORTED_DIR, `${id}.js`);
  if (existsSync(path) && !force) throw new Error(`${id} is already made — make it again with force, and its tuning is lost`);
  const out = generateBanger({ riff: SEED_RIFF, options: seedOptions(style), seed: 1 });
  const arrangement = out.arrangement
    ? normaliseArrangementResolution(out.bank, compactArrangement(out.bank, out.arrangement)) : null;
  const title = `${style.label.toUpperCase()} SEED`;
  const note = [
    `${style.label}'s SEED BANGER: the style laid out to be tuned, every part switched on.`,
    'Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the',
    'master — then Use as Style (the drawer) makes new bangers start from it.',
    'Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.',
  ].join('\n');
  mkdirSync(join(root, IMPORTED_DIR), { recursive: true });
  const source = songFile({
    id, title, slug: id, group: SEED_GROUP, bank: out.bank, mix: out.mix, arrangement, variants: null, note,
    seed: 1, banger: { ...out.banger, seedOf: style.id, made: new Date().toISOString() },
  });
  writeFileSync(path, source);
  writeImportedIndex(root);
  return { id, file: `${IMPORTED_DIR}/${id}.js`, path };
}

// ---------------------------------------------------------------- reading a tuned banger back
/** A banger's song file, read fresh: `{ mod, rel }`, or null. */
async function readBanger(root, id) {
  const path = songFileIn(root, id);
  if (!path) return null;
  const rel = path.slice(root.length + 1);
  return { mod: await fresh(root, rel), rel };
}

/** A channel's settings as a style keeps them: everything but the desk's mute and solo. */
function stripOf(mix, lane) {
  const strip = clone(mix.lanes?.[lane] || {});
  for (const k of ['mute', 'solo', 'muted', 'soloed']) delete strip[k];
  return strip;
}

/**
 * What a banger says about its style: `{ style, sounds: { parts, kits: { style } },
 * channels: { strips, master, pump, exciter }, copies, problems }`. The chords' gate and the
 * hook's exciter are switches of their own (the Sidechain Pump, the mood), so they come off
 * those channels into `pump` and `exciter` rather than being doubled next time. `copies` are
 * the channels playing a sound tuned on the desk — `{ job, lane, kit, params }`.
 */
export function styleFromBanger(mod) {
  const recipe = mod.banger || null;
  const problems = [];
  const style = styleFor(recipe?.seedOf || recipe?.style);
  if (!recipe || !style) return { style: null, problems: ['not a banger'] };
  const laneOf = recipe.laneOf;
  if (!laneOf) return { style, problems: ['made before bangers kept which lane does which job — make it again'] };
  const mix = mod.mix || {};
  const bank = mod.bank || {};
  const parts = {};
  const kit = {};
  const strips = {};
  let pump = null;
  let exciter = null;
  const copies = [];
  for (const [job, lane] of Object.entries(laneOf)) {
    if (job.startsWith('riff:')) continue;
    const strip = stripOf(mix, lane);
    const name = mix.labels?.[lane] || lane;
    if (job === 'hook') {
      // The hook plays the riff's own sound on the riff's own channel; what the style sets
      // is where it sits — and the exciter the mood puts on it.
      exciter = clone((strip.effects || []).find((e) => e.id === 'exciter')) || null;
      strips.hook = Object.fromEntries(['gain', 'pan', 'send'].filter((k) => strip[k] != null).map((k) => [k, strip[k]]));
      continue;
    }
    if (job === 'saws' || job === 'pad') {
      const gate = (strip.effects || []).find((e) => e.id === style.pump?.id);
      if (gate && job === 'saws') pump = clone(gate);
      if (gate) strip.effects = strip.effects.filter((e) => e !== gate);
    }
    strips[job] = strip;
    if (job === 'riser') continue;   // its sound is the song's own noise, made fresh each time
    const vk = seamFor(lane)?.voiceKey;
    if (mix.voiceParams?.[vk]) {
      copies.push({ job, lane, name, kit: KIT.has(job), params: mix.voiceParams[vk] });
      continue;
    }
    const id = mix.voice?.[vk] ?? bank[vk];
    if (!id) continue;
    if (KIT.has(job)) kit[job] = id;
    else parts[job] = id;
  }
  const master = { master: mix.master ?? 0, masterEffects: clone(mix.masterEffects || []), fx: clone(mix.fx || {}) };
  return { style, sounds: { parts, kits: { style: kit } }, channels: { strips, master, pump, exciter }, copies, problems };
}

// ---------------------------------------------------------------- keeping tuned sounds
const pascal = (s) => String(s).split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
/** The library id a sound tuned on a seed (or a combo's banger) is kept under. */
export const tunedPresetId = (styleId, job, combo = null) => `${combo ? 'combo' : 'seed'}${pascal(styleId)}${combo ? pascal(combo) : ''}${pascal(job)}`;
// What a song's copy carries that a library entry does not (or works out for itself).
const COPY_ONLY = ['id', 'kind', 'level', 'peak', 'factory', 'user', 'songOrigin', 'songSourceId', 'songLocal'];

/**
 * Keep the sounds tuned on the desk: each copy becomes — or updates — a user preset of its
 * own (USER_TONE / USER_DRUM in src/data/voices.js), measured with `measure(id, preset, src)`
 * the way the voice editor's save measures one; `restart()` is called after each write so a
 * renderer bundles the file as it is now. A copy already kept as that same sound is left
 * alone. Returns the copies with the `id` each was kept under; registers each with this
 * process's catalogue, so the rules can be asked about it straight away.
 */
async function keepTunedSounds(root, copies, { styleLabel, idFor, measure, restart = async () => {}, voicesFile }) {
  const file = voicesFile || join(root, 'src/data/voices.js');
  const kept = [];
  for (const c of copies) {
    const id = idFor(c.job);
    const preset = Object.fromEntries(Object.entries(structuredClone(c.params)).filter(([k]) => !COPY_ONLY.includes(k)));
    preset.label = `${String(c.params.label || c.job).replace(/ · [^·]+$/, '')} · ${styleLabel}`;
    preset.starter = false;
    const kind = c.params.kind === 'drum' ? 'drum' : 'tone';
    if (VOICES[id] && soundKey({ ...VOICES[id], label: preset.label }) === soundKey({ ...preset, id })) {
      kept.push({ ...c, id });
      continue;
    }
    const before = readFileSync(file, 'utf8');
    const src = upsertPreset(before, id, preset, kind === 'drum' ? USER_TABLES.drum : USER_TABLES.tone);
    writeFileSync(file, src);
    await restart();
    let m;
    try {
      m = await measure(id, preset, src);
    } catch (err) {
      writeFileSync(file, before);
      await restart();
      throw new Error(`${c.name}'s sound could not be measured, so it was not kept: ${err.message || err}`);
    }
    if (!(m?.level > 0)) {
      writeFileSync(file, before);
      await restart();
      throw new Error(`${c.name}'s sound renders silent, so it was not kept`);
    }
    writeFileSync(file, setMeasured(src, id, { level: m.level, peak: m.peak }));
    await restart();
    VOICES[id] = { ...preset, id, kind, user: true, level: m.level, peak: m.peak };
    kept.push({ ...c, id });
  }
  if (kept.length) forgetOffered();
  return kept;
}

/** Fold kept sounds into a reading: each tuned channel now names its library preset. */
function withKept(read, kept) {
  for (const k of kept) {
    if (k.kit) read.sounds.kits.style[k.job] = k.id;
    else read.sounds.parts[k.job] = k.id;
  }
  read.copies = [];
  return read;
}

/** The copies as problems, for a caller with no way to measure. */
const copiesAsProblems = (read) => read.copies.map((c) => `${c.name} plays a sound tuned on the desk, and nothing here can measure it to keep it`);

// ---------------------------------------------------------------- the tables
const channelsHeader = () => readFileSync(join(ROOT, CHANNELS_FILE), 'utf8').split('\nexport const')[0];
const combosHeader = () => readFileSync(join(ROOT, COMBOS_FILE), 'utf8').split('\nexport const')[0];
export const channelsSource = (table) => `${channelsHeader()}\nexport const BANGER_CHANNELS = ${JSON.stringify(table, null, 2)};\n`;
export const combosSource = (table) => `${combosHeader()}\nexport const BANGER_COMBOS = ${JSON.stringify(table, null, 2)};\n`;

/** Write `file` from `source`, unless somebody changed it since `before` was read. */
function writeIfUnchanged(root, file, before, source) {
  const path = join(root, file);
  if (readFileSync(path, 'utf8') !== before) throw new Error(`${file} changed underneath — nothing written; try again`);
  if (source !== before) writeFileSync(path, source);
}

/** The style's sounds with a banger's read over them — or the rules it breaks. */
function soundsWith(table, styleId, sounds) {
  const next = structuredClone(table);
  const s = next[styleId];
  s.parts = { ...s.parts, ...sounds.parts };
  // A sound that is now the style's own comes off its shortlist — it is in every draw already.
  for (const [k, list] of Object.entries(s.choices || {})) s.choices[k] = list.filter((id) => id !== s.parts[k]);
  s.kits = { ...s.kits, style: { ...(s.kits?.style || {}), ...sounds.kits.style } };
  const tidy = tidyTable(next);
  const issues = tableIssues(tidy).filter((i) => i.where.startsWith(styleId));
  return { tidy, issues };
}

/**
 * Use as Style: the seed banger `id` becomes its style's starting point — its sounds into
 * sounds.js, its channels and master into channels.js, its parts into the levels'
 * references. Returns `{ ok, style, problems, changed: { sounds, channels } }`.
 */
export async function useAsStyle(root, id, { measure = null, restart, voicesFile } = {}) {
  const found = await readBanger(root, id);
  if (!found) return { ok: false, problems: [`no song called ${id}`] };
  const read = styleFromBanger(found.mod);
  if (found.mod.group !== SEED_GROUP) read.problems.push('only a style\'s seed banger can be used as the style — Save as Combo keeps any other');
  if (!measure) read.problems.push(...copiesAsProblems(read));
  if (read.problems.length) return { ok: false, style: read.style?.id ?? null, problems: read.problems };
  const styleId = read.style.id;
  let kept = [];
  try {
    kept = await keepTunedSounds(root, read.copies, { styleLabel: read.style.label, idFor: (job) => tunedPresetId(styleId, job), measure, restart, voicesFile });
  } catch (err) {
    return { ok: false, style: styleId, problems: [err.message] };
  }
  withKept(read, kept);

  const soundsBefore = readFileSync(join(root, SOUNDS_FILE), 'utf8');
  const { BANGER_SOUNDS } = await fresh(root, SOUNDS_FILE);
  const { tidy, issues } = soundsWith(BANGER_SOUNDS, styleId, read.sounds);
  if (issues.length) return { ok: false, style: styleId, problems: issues.map((i) => `${i.where}: ${i.id ? `${i.id} — ` : ''}${i.reason}`) };
  const changedSounds = Object.keys(read.sounds.parts).filter((k) => BANGER_SOUNDS[styleId].parts[k] !== read.sounds.parts[k]).length
    + Object.keys(read.sounds.kits.style).filter((k) => BANGER_SOUNDS[styleId].kits?.style?.[k] !== read.sounds.kits.style[k]).length;

  const channelsBefore = readFileSync(join(root, CHANNELS_FILE), 'utf8');
  const { BANGER_CHANNELS } = await fresh(root, CHANNELS_FILE);
  const channels = { ...structuredClone(BANGER_CHANNELS), [styleId]: { seed: id, at: new Date().toISOString(), ...read.channels } };

  writeIfUnchanged(root, SOUNDS_FILE, soundsBefore, soundsSource(tidy));
  writeIfUnchanged(root, CHANNELS_FILE, channelsBefore, channelsSource(channels));
  const data = await readLevelData(root);
  data.refs = await buildAllRefs(root, { channels });
  writeLevelData(root, data);
  return {
    ok: true, style: styleId, problems: [],
    changed: { sounds: changedSounds, channels: Object.keys(read.channels.strips).length },
    kept: kept.map((k) => ({ job: k.job, id: k.id, label: VOICES[k.id]?.label || k.id })),
  };
}

// ---------------------------------------------------------------- combos
const slug = (label) => String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'combo';

/**
 * Save as Combo: banger `id`'s sounds and channels, under `label`, for its style — with the
 * banger itself as what the combo's faders are matched against. Returns
 * `{ ok, style, combo, label, problems }`.
 */
export async function saveCombo(root, id, label, { measure = null, restart, voicesFile } = {}) {
  const found = await readBanger(root, id);
  if (!found) return { ok: false, problems: [`no song called ${id}`] };
  const read = styleFromBanger(found.mod);
  const name = String(label || '').trim();
  if (!name) read.problems.push('a combo needs a name');
  if (!measure) read.problems.push(...copiesAsProblems(read));
  if (read.problems.length) return { ok: false, style: read.style?.id ?? null, problems: read.problems };
  const styleId = read.style.id;
  try {
    const kept = await keepTunedSounds(root, read.copies, {
      styleLabel: `${read.style.label} ${name}`, idFor: (job) => tunedPresetId(styleId, job, slug(name)), measure, restart, voicesFile,
    });
    withKept(read, kept);
  } catch (err) {
    return { ok: false, style: styleId, problems: [err.message] };
  }
  const { BANGER_SOUNDS } = await fresh(root, SOUNDS_FILE);
  const { issues } = soundsWith(BANGER_SOUNDS, styleId, read.sounds);
  if (issues.length) return { ok: false, style: styleId, problems: issues.map((i) => `${i.id ? `${i.id} — ` : ''}${i.reason}`) };

  const before = readFileSync(join(root, COMBOS_FILE), 'utf8');
  const { BANGER_COMBOS } = await fresh(root, COMBOS_FILE);
  const combos = structuredClone(BANGER_COMBOS);
  const mine = (combos[styleId] ||= {});
  // The same name again is the same combo, saved over; a new name is a new one.
  let combo = slug(name);
  const sameName = Object.entries(mine).find(([, c]) => c.label.toLowerCase() === name.toLowerCase());
  if (sameName) combo = sameName[0];
  else for (let i = 2; mine[combo]; i++) combo = `${slug(name)}-${i}`;
  const song = songFrom(found.mod, id);
  const recipe = found.mod.banger;
  mine[combo] = {
    label: name, from: id, made: new Date().toISOString(),
    sounds: read.sounds, channels: read.channels,
    refs: bangerRefs(song, { laneOf: recipe.laneOf, form: recipe.form || [], label: song.title, tag: { song: id } }),
  };
  writeIfUnchanged(root, COMBOS_FILE, before, combosSource(combos));
  return { ok: true, style: styleId, combo, label: name, problems: [] };
}

/** Delete a combo. Returns whether there was one. */
export async function deleteCombo(root, styleId, combo) {
  const before = readFileSync(join(root, COMBOS_FILE), 'utf8');
  const { BANGER_COMBOS } = await fresh(root, COMBOS_FILE);
  if (!BANGER_COMBOS[styleId]?.[combo]) return false;
  const combos = structuredClone(BANGER_COMBOS);
  delete combos[styleId][combo];
  if (!Object.keys(combos[styleId]).length) delete combos[styleId];
  writeIfUnchanged(root, COMBOS_FILE, before, combosSource(combos));
  return true;
}
