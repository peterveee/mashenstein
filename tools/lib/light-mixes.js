// LIGHT VERSIONS — each trial song's light mix, kept as a desk alternate. 20 Oct 2026.
//
// Peter, 20 Oct 2026: "I could manually tweak the lite versions myself to remove unnecessary
// stuff and then we measure again." So, as with the 8-bit ones (chip-results-mixes.js), every
// song on trial has `<id>-light` in src/data/imported: an ordinary alternate (the parent's
// music copied, its own mix on top) the desk opens, plays, mixes and saves. It starts from
// LIGHT_RECIPES below — the parts that cost most where the iPad tips, muted, and the lane
// inserts that only widen or move a sound, dropped — and from then on it is Peter's mix.
//
// What the game plays (`?lightmix`, on trial) is EXPORTED from the alternates:
// src/game/light-mixes.js holds how each one's mix differs from the level's own, laid over it
// by results-chip.js. The desk exports after every save that touches one of these songs
// (tools/mixer.js /save), and `node tools/light-alternates.js export` does it by hand.
//
//   makeLightAlternate(root, id, { force })   write the alternate (kept if it exists)
//   exportLightMixes(root, { dry })           write the game's copy of them
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mixPatch } from '../../src/game/results-chip.js';
import { songFile } from './song-source.js';
import { IMPORTED_DIR } from './imported-index.js';
import { compactArrangement, normaliseArrangementResolution } from './arrangement-edit.js';

export const LIGHT_MIXES_FILE = 'src/game/light-mixes.js';
/** The alternate that holds song `parentId`'s light mix. */
export const lightAltId = (parentId) => `${parentId}-light`;

// Lane inserts a light mix drops everywhere: the stereo and movement treatments and a lane's
// own compressors. Not the reverb or the delays — the reverb was measured at 3–4 points
// (10 Oct 2026) and they are most of a song's space.
export const LIGHT_DROPPED_EFFECTS = ['doubler', 'widener', 'chorus2', 'autopanner', 'mbCompN', 'compressor', 'exciter'];

// Where each light version STARTS: lanes muted (a muted lane is not synthesised anywhere in
// the game — Audio.setSilentLaneSkip), dB to make up for a lane muted on top of another, and
// `dry`: the reverb taken out the way the 8-bit versions do it — every send to it at zero, so
// the mixer unhooks the convolver, and every reverb insert muted (a muted insert costs nothing
// in the game). Peter's iPad, 20 Oct 2026: Gravity with no reverb got past bar 20 in a level
// for the first time, and played the whole song in the jukebox.
export const LIGHT_RECIPES = {
  // TIME VORTEX. Remade 20 Oct 2026 (Peter): a plain copy of the song — effects and reverb
  // kept — for Peter to put cheap sounds in place of the four JMJR-4 choir lanes (lead3,
  // lead8, lead11, chords5), which are half of the iPad's peak at bars 18–21. Reverb costs the
  // iPad ~5 % (dist/audio-stress.html); with the choir cheap it should not be needed.
  gravity: { effects: [] },
  // (Rhythm had one until the KNDO-5 fix the same evening made the full song play clean on the
  // iPad. A light version is built only where a device needs one — every song that has one
  // plays it on every slow device.)
};

const REVERBS = new Set(['reverb', 'spring']);
/** `mix` with no reverb: sends to it at zero, reverb inserts muted (chip-results-mixes.js withoutReverb). */
function dry(mix) {
  const quiet = (chain) => (Array.isArray(chain) && chain.some((e) => REVERBS.has(e?.id))
    ? chain.map((e) => (REVERBS.has(e?.id) ? { ...e, mute: true } : e)) : chain);
  const lanes = {};
  for (const [lane, l] of Object.entries(mix?.lanes || {})) {
    if (!l) { lanes[lane] = l; continue; }
    const next = { ...l };
    if (next.send?.reverb) next.send = { ...next.send, reverb: 0 };
    if (next.effects) next.effects = quiet(next.effects);
    lanes[lane] = next;
  }
  return { ...mix, lanes, ...(mix?.masterEffects ? { masterEffects: quiet(mix.masterEffects) } : {}) };
}

/** `mix` with `recipe` applied. */
export function recipeMix(mix, recipe) {
  const drop = new Set(recipe.effects || LIGHT_DROPPED_EFFECTS);
  const lanes = { ...(mix?.lanes || {}) };
  for (const [lane, strip] of Object.entries(lanes)) {
    if (!strip?.effects?.some((e) => drop.has(e.id))) continue;
    lanes[lane] = { ...strip, effects: strip.effects.filter((e) => !drop.has(e.id)) };
  }
  for (const lane of recipe.mute || []) lanes[lane] = { ...(lanes[lane] || {}), mute: true };
  for (const [lane, db] of Object.entries(recipe.gain || {})) {
    lanes[lane] = { ...(lanes[lane] || {}), gain: Math.round(((lanes[lane]?.gain ?? 0) + db) * 100) / 100 };
  }
  const out = { ...(mix || {}), lanes };
  return recipe.dry ? dry(out) : out;
}

let seq = 0;
const fresh = (file) => import(`${pathToFileURL(file).href}?v=${Date.now()}-${++seq}`);
const songPath = (root, id) => [join(root, 'src/data/songs', `${id}.js`), join(root, IMPORTED_DIR, `${id}.js`)].find(existsSync) || null;

/** Write song `parentId`'s light alternate. One that exists is Peter's and is kept. */
export async function makeLightAlternate(root, parentId, { force = false } = {}) {
  const id = lightAltId(parentId);
  const file = join(root, IMPORTED_DIR, `${id}.js`);
  if (existsSync(file) && !force) return { id, file, kept: true };
  const recipe = LIGHT_RECIPES[parentId];
  if (!recipe) throw new Error(`no light recipe for ${parentId}`);
  const parentFile = songPath(root, parentId);
  if (!parentFile) throw new Error(`no song file for ${parentId}`);
  const parent = await fresh(parentFile);
  const source = songFile({
    id,
    title: `${parent.title} LIGHT`,
    slug: id,
    group: 'alternate',
    alternateOf: parentId,
    bank: parent.bank,
    mix: recipeMix(parent.mix, recipe),
    arrangement: normaliseArrangementResolution(parent.bank, compactArrangement(parent.bank, parent.arrangement ?? null)),
    variants: null,
    note: `${parent.title} with less for a tablet's audio thread to do: the parts that cost most where\n`
      + `the iPad tipped over muted, the inserts that only widen or move a sound taken out, and${recipe.dry ? ' no' : ' the'}\n`
      + `reverb. Mix it\n`
      + `here: Save, and the game's copy (${LIGHT_MIXES_FILE}) follows — what \`?lightmix\` plays.\n`
      + `The music below is ${parent.title}'s, copied as it stood (an alternate of ${parentId}).`,
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  return { id, file, kept: false };
}

/** The game's copy of every light alternate: how each differs from its level's mix. */
export async function exportLightMixes(root, { dry = false } = {}) {
  const table = {};
  for (const parentId of Object.keys(LIGHT_RECIPES)) {
    const altFile = join(root, IMPORTED_DIR, `${lightAltId(parentId)}.js`);
    const parentFile = songPath(root, parentId);
    if (!existsSync(altFile) || !parentFile) continue;
    const [parent, alt] = await Promise.all([fresh(parentFile), fresh(altFile)]);
    if (alt.alternateOf !== parentId) continue;
    table[parentId] = mixPatch(parent.mix ?? null, alt.mix ?? null);
  }
  const body = Object.keys(table).sort().map((id) => `  ${id}: ${JSON.stringify(table[id])},`).join('\n');
  const source = `// LIGHT — what each trial song's light version lays over its own mix (results-chip.js,
// patchMix), played with \`?lightmix\`. A field set to null is one the alternate took away.
//
// EXPORTED from the alternates src/data/imported/<id>-light.js by tools/lib/light-mixes.js —
// the desk does it on every save that touches one; \`node tools/light-alternates.js export\`
// by hand. Mix the alternates, not this file.
export const LIGHT_MIXES = {
${body}
};
`;
  const out = join(root, LIGHT_MIXES_FILE);
  const changed = !existsSync(out) || readFileSync(out, 'utf8') !== source;
  if (changed && !dry) writeFileSync(out, source);
  return { changed, source, ids: Object.keys(table) };
}

/** Whether saving `ids` is a reason to export again: one is a light alternate or its level. */
export const touchesLightMixes = (ids) => ids.some((id) => LIGHT_RECIPES[id] || (id.endsWith('-light') && LIGHT_RECIPES[id.slice(0, -6)]));
