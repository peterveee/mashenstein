// 8-BIT RESULTS — each cabinet's 8-bit mix, kept as a desk alternate. 8 Oct 2026.
//
// Peter, 8 Oct 2026: "perhaps we should save the 8bit mixes as a set of alternates so I can
// tweak those levels" — and then "we need 8 bit versions of theme songs in addition to the
// cabinet" for SETTINGS ▸ SOUNDTRACK. So every game song (src/data/songs) has one: `<id>-8bit` in src/data/imported, an
// ordinary alternate (the parent's music copied, its own mix on top) the desk opens, plays,
// mixes and saves like any other song — every lane on the 8-Bit Sound Set, every fader where the
// level tool measured it should sit (tools/chip-results-levels.js), and no reverb (Peter, 8 Oct
// 2026: "retro consoles did not have reverb!"): every send to it at zero, which also lets the
// mixer unhook the convolver, and every reverb insert on a lane or the master MUTED. Muted, not
// removed or turned dry: a chain that changes shape, or a reverb that changes its settings,
// cannot be moved at an audio time, so the switch would rebuild every chain on the beat and cut
// every tail with it (results-chip.js handOver). A link's mute is two gains, which can.
//
// Alternates are not in the shipped game, so what the results screen plays is EXPORTED from
// them: src/game/results-chip-mixes.js holds, per cabinet, how its alternate's mix differs from
// the level's own — the sounds, the strips, anything else the desk changed — and the game lays
// that over the level's mix on the beat of the switch (results-chip.js, patchMix). The desk
// exports after every save that touches one of these songs (tools/mixer.js /save), and
// tests/results-chip.js fails if the export and the alternates disagree.
//
//   makeChipAlternate(root, cabinetId, { force })   write the alternate (kept if it exists)
//   exportChipMixes(root, { dry })                  write the game's copy of them
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { applyArrangement } from '../../src/data/arrangements.js';
import { deskBank } from '../../src/engine/lanes.js';
import { voiceOf, registerSongVoice, engineBankKeys, VOICE_LANES } from '../../src/data/voices.js';
import { mixWithVoices } from '../../src/game/banger/club-voices.js';
import { chipVoices, mixPatch } from '../../src/game/results-chip.js';
import { songFile } from './song-source.js';
import { writeImportedIndex, IMPORTED_DIR } from './imported-index.js';
import { compactArrangement, normaliseArrangementResolution } from './arrangement-edit.js';

export const CHIP_MIXES_FILE = 'src/game/results-chip-mixes.js';
export const TRIMS_FILE = 'tools/lib/chip-results-trims.js';
/** The alternate that holds cabinet song `parentId`'s 8-bit mix. */
export const chipAltId = (parentId) => `${parentId}-8bit`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
// Not songs: the folder's index and the shared note helpers.
const NOT_SONGS = new Set(['index.js', 'shared.js']);
/** Every game song — the cabinets and the theme songs, src/data/songs — by id. */
export const chipParents = (root = ROOT) => readdirSync(join(root, 'src/data/songs'))
  .filter((f) => f.endsWith('.js') && !NOT_SONGS.has(f)).map((f) => f.slice(0, -3)).sort();

let seq = 0;
const fresh = (file) => import(`${pathToFileURL(file).href}?v=${Date.now()}-${++seq}`);
const songPath = (root, id) => [join(root, 'src/data/songs', `${id}.js`), join(root, IMPORTED_DIR, `${id}.js`)].find(existsSync) || null;

// audio.js's withVoices, which it keeps to itself: the voice block and the song's own copies
// merged onto the bank, so chipVoices reads each lane's sound as the game plays it.
function withVoices(bank, entry, trackId) {
  if (!bank || !entry || (!entry.voice && !entry.voiceParams)) return bank;
  const out = { ...bank, ...entry.voice };
  for (const [vk, params] of Object.entries(entry.voiceParams || {})) {
    const id = registerSongVoice(vk, trackId, params);
    if (id) out[vk] = id;
  }
  for (const key of Object.keys(VOICE_LANES)) {
    const keys = engineBankKeys(voiceOf(out, key), key);
    if (keys) Object.assign(out, keys);
  }
  return out;
}

// The reverb effects a lane or the master can carry as an insert (src/engine/effects.js).
const REVERBS = new Set(['reverb', 'spring']);

/** `mix` with no reverb in it: every send to the reverb at zero, every reverb insert muted. */
export function withoutReverb(mix) {
  const dry = (chain) => (Array.isArray(chain) && chain.some((e) => REVERBS.has(e?.id))
    ? chain.map((e) => (REVERBS.has(e?.id) ? { ...e, mute: true } : e))
    : chain);
  const out = { ...(mix || {}), lanes: { ...(mix?.lanes || {}) } };
  for (const [lane, l] of Object.entries(out.lanes)) {
    if (!l) continue;
    const next = { ...l };
    if (next.send?.reverb) next.send = { ...next.send, reverb: 0 };
    if (next.effects) next.effects = dry(next.effects);
    out.lanes[lane] = next;
  }
  if (out.masterEffects) out.masterEffects = dry(out.masterEffects);
  return out;
}

/** The level's own mix with every lane on the 8-Bit set and each fader moved by its trim. */
export function chipMixFor(parentId, song, trims = {}) {
  const played = withVoices(deskBank(applyArrangement(song.bank, parentId, song.arrangement ? { [parentId]: song.arrangement } : {}), song.mix), song.mix, parentId);
  const voices = chipVoices(played);
  const mix = withoutReverb(mixWithVoices(song.mix, voices));
  for (const [lane, db] of Object.entries(trims)) {
    if (!voices.has(lane)) continue;
    mix.lanes[lane] = { ...(mix.lanes[lane] || {}), gain: Math.round(((mix.lanes[lane]?.gain ?? 0) + db) * 100) / 100 };
  }
  return { mix, changed: voices.size };
}

/** Write cabinet song `parentId`'s 8-bit alternate. One that exists is Peter's and is kept. */
export async function makeChipAlternate(root, parentId, { force = false, trims = {} } = {}) {
  const id = chipAltId(parentId);
  const file = join(root, IMPORTED_DIR, `${id}.js`);
  if (existsSync(file) && !force) return { id, file, kept: true };
  const parentFile = songPath(root, parentId);
  if (!parentFile) throw new Error(`no song file for ${parentId}`);
  const parent = await fresh(parentFile);
  const { mix, changed } = chipMixFor(parentId, parent, trims);
  const source = songFile({
    id,
    title: `${parent.title} 8-BIT`,
    slug: id,
    group: 'alternate',
    alternateOf: parentId,
    bank: parent.bank,
    mix,
    arrangement: normaliseArrangementResolution(parent.bank, compactArrangement(parent.bank, parent.arrangement ?? null)),
    variants: null,
    note: `${parent.title} as the results screen plays it: every part on the 8-Bit Sound Set, every\n`
      + `fader where tools/chip-results-levels.js measured the 8-bit part should sit against the\n`
      + `one it replaces, no reverb. Mix it here: Save, and the game's copy (${CHIP_MIXES_FILE})\n`
      + `follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.\n`
      + `The music below is ${parent.title}'s, copied as it stood (an alternate of ${parentId}).`,
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  return { id, file, kept: false, changed };
}

/** The game's copy of every 8-bit alternate: how each differs from its level's mix. */
export async function exportChipMixes(root, { dry = false } = {}) {
  const table = {};
  for (const parentId of chipParents()) {
    const altFile = join(root, IMPORTED_DIR, `${chipAltId(parentId)}.js`);
    const parentFile = songPath(root, parentId);
    if (!existsSync(altFile) || !parentFile) continue;
    const [parent, alt] = await Promise.all([fresh(parentFile), fresh(altFile)]);
    if (alt.alternateOf !== parentId) continue;
    table[parentId] = mixPatch(parent.mix ?? null, alt.mix ?? null);
  }
  const body = Object.keys(table).sort().map((id) => `  ${id}: ${JSON.stringify(table[id])},`).join('\n');
  const source = `// 8-BIT — what each game song's 8-bit version lays over its own mix: the sounds, the faders
// and anything else its 8-bit alternate changed (results-chip.js, patchMix) — played by the
// results screens and by SETTINGS ▸ SOUNDTRACK: 8-BIT. A field set to null is one the
// alternate took away.
//
// EXPORTED from the alternates src/data/imported/<id>-8bit.js by tools/lib/chip-results-mixes.js —
// the desk does it on every save that touches one; \`node tools/chip-results-alternates.js export\`
// by hand. Mix the alternates, not this file.
export const CHIP_RESULT_MIXES = {
${body}
};
`;
  const out = join(root, CHIP_MIXES_FILE);
  const changed = !existsSync(out) || readFileSync(out, 'utf8') !== source;
  if (changed && !dry) writeFileSync(out, source);
  return { changed, source, ids: Object.keys(table) };
}

/** Whether saving `ids` is a reason to export again: one of them is an 8-bit alternate or its level. */
export const touchesChipMixes = (ids) => {
  const parents = new Set(chipParents());
  return ids.some((id) => parents.has(id) || (id.endsWith('-8bit') && parents.has(id.slice(0, -5))));
};

/** Every alternate written or kept, then the export — what `make` does in one go. */
export async function makeAll(root, { force = false, only = null } = {}) {
  const trims = existsSync(join(root, TRIMS_FILE))
    ? (await fresh(join(root, TRIMS_FILE))).CHIP_RESULT_TRIMS || {} : {};
  const made = [];
  for (const parentId of chipParents()) {
    if (only && !only.includes(parentId)) continue;
    made.push(await makeChipAlternate(root, parentId, { force, trims: trims[parentId] || {} }));
  }
  writeImportedIndex(root);
  return { made, exported: await exportChipMixes(root) };
}
