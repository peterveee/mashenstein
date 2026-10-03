// MAKE A BANGER, in the game — the generator, as the jukebox calls it. 3 Oct 2026.
//
// The desk's own generator (tools/lib/banger), given only a riff, a style and a mood;
// every other switch stays at the style's defaults. It is deterministic, so a kept
// banger is stored as its recipe — notes, style, mood, seed — and made again when it
// is played, a few milliseconds on a Mac. `mode` is the grid's (riff.js RIFF_MODES).
//
// It lives in tools/ because the desk is where it is being built; the game imports it
// from there for now. It is browser-safe (no node:* imports), and it adds about 390KB
// minified to the bundle on top of what the game already ships.
import { generateBanger } from '../../../tools/lib/banger/index.js';
import { BANGER_STYLES } from '../../../tools/lib/banger/styles/index.js';
import { BANGER_MOODS, styleDefaults } from '../../../tools/lib/banger/options.js';
import { BANGER_SOUNDS } from '../../../tools/lib/banger/sounds.js';
import { resolveSounds } from '../../../tools/lib/banger/sound-rules.js';
import { riffFromNotes, hasNotes } from './riff.js';

// Left out for now: on the 3 Oct WebKit measurement (work/local/_banger-headroom-webkit-
// 2026-10-03.txt) synthwave climbed past the heaviest shipped song and chipstep took the
// page down. They come back once they have phone-safe sounds.
const HELD_BACK = new Set(['synthwave', 'chipstep']);

const caps = (s) => String(s).toUpperCase().replace(/&/g, 'AND');

/** The styles the jukebox offers, in the desk's order. */
export const MAKER_STYLES = Object.freeze(BANGER_STYLES
  .filter((s) => !HELD_BACK.has(s.id))
  .map((s) => Object.freeze({ id: s.id, label: caps(s.label) })));

/** Every mood plays in every style. */
export const MAKER_MOODS = Object.freeze(BANGER_MOODS.map((m) => Object.freeze({ id: m.id, label: caps(m.label) })));

export const styleLabel = (id) => MAKER_STYLES.find((s) => s.id === id)?.label ?? caps(id);
export const moodLabel = (id) => MAKER_MOODS.find((m) => m.id === id)?.label ?? caps(id);

/**
 * The riff plays on the style's own hook sound — the first on its shortlist (Electric
 * Grand for Big-Room House and Trance) — never on the plain lead the grid previews
 * with. Peter, 3 Oct 2026.
 */
export function hookSoundFor(styleId, moodId) {
  return resolveSounds(BANGER_SOUNDS, styleId, moodId).random?.hook?.[0] ?? 'simpleSquare';
}

/**
 * Where the riff's channel sits against the style's hook fader, in dB. The generator
 * leaves a kept riff sound where its own song had it; a grid riff has no song, so it
 * arrives at the hook fader as set for ABSOLUTE ZERO. By ear (Peter, 3 Oct) that is too
 * loud, although the level model's match says otherwise — this is the ear's number.
 */
export const RIFF_TRIM_DB = -3;

/**
 * Where a tape stop fits a style (3 Oct 2026): into the drops for the styles built on
 * the drop's impact, out of the choruses for Big-Room (its stutter keeps the way in) and
 * Mega Drive (the console powering down). Trance and Eurobeat live on the lift into the
 * drop, so they never get one.
 */
const TAPE_STOP_AT = { 'future-bass': 'intoDrop', dnb: 'intoDrop', electro: 'intoDrop', 'big-room': 'outOf', megadrive: 'outOf' };
/** It comes up now and then, not every time: about one take in three, where it fits. */
export const TAPE_STOP_CHANCE = 1 / 3;

/**
 * The Spot FX slot that gets a tape stop on this take, or null. Read off the seed, so a
 * kept song made again from its recipe gets the same answer.
 */
export function tapeStopFor(style, seed) {
  const at = TAPE_STOP_AT[style];
  if (!at) return null;
  return rollOf(seed, 0) < TAPE_STOP_CHANCE ? at : null;
}

/**
 * A roll in [0, 1) read off the seed, one per `salt`, so each effect is decided apart from
 * the others and a kept song made again gets the same ones. Salt 0 is the tape stop's.
 */
const rollOf = (seed, salt) => (Math.imul((seed ^ salt) >>> 0, 2654435761) >>> 0) / 2 ** 32;

/**
 * The other Spot FX the jukebox gives a take now and then (Peter, 3 Oct 2026) — the desk's
 * extras, which the style defaults leave off:
 *
 *   intro      Low-Pass (the intro through a wall, opening up), one take in four, any style;
 *              Bitcrush one in five, only where crushed sound belongs — Mega Drive, Electro
 *   breakdown  Underwater (muffled, opening up across it), one take in six
 */
export const INTRO_LOWPASS_CHANCE = 1 / 4;
export const INTRO_BITCRUSH_CHANCE = 1 / 5;
export const UNDERWATER_CHANCE = 1 / 6;
const BITCRUSH_STYLES = new Set(['megadrive', 'electro']);

/** This take's Spot FX, as the generator's `spot` options. */
export function spotFor(style, seed) {
  const spot = {};
  const at = tapeStopFor(style, seed);
  if (at) spot[at] = 'tapeStop';
  const intro = rollOf(seed, 0x2c1b3c6d);
  if (intro < INTRO_LOWPASS_CHANCE) spot.intro = 'lowpass';
  else if (BITCRUSH_STYLES.has(style) && intro < INTRO_LOWPASS_CHANCE + INTRO_BITCRUSH_CHANCE) spot.intro = 'bitcrush';
  if (rollOf(seed, 0x297a2d39) < UNDERWATER_CHANCE) spot.quiet = 'underwater';
  return spot;
}

/** The mood a style is written around — where the MOOD picker starts. */
export function defaultMoodFor(styleId) {
  const style = BANGER_STYLES.find((s) => s.id === styleId);
  return style ? styleDefaults(style).mood : MAKER_MOODS[0].id;
}

export function newSeed() {
  return (Math.random() * 0x7fffffff) >>> 0 || 1;
}

/**
 * A recipe → the song: { bank, mix, arrangement, bpm }. Throws if the generator
 * refuses (an empty grid, an unknown style).
 */
export function makeBanger({ notes, mode = 'simple', style, mood, seed }) {
  if (!hasNotes(notes)) throw new Error('the grid is empty');
  const spot = spotFor(style, seed);
  const options = { style, mood, ...(Object.keys(spot).length ? { spot } : {}) };
  const out = generateBanger({ riff: riffFromNotes(notes, hookSoundFor(style, mood), mode), options, seed });
  const lane = out.laneOf?.hook;
  const strip = lane && out.mix.lanes?.[lane];
  if (strip) strip.gain = Math.round(((strip.gain ?? 0) + RIFF_TRIM_DB) * 10) / 10;
  // `form` is the song's sections (role, bars from–to, counted from 1): the club fires its
  // crowd moments on their changes.
  return { bank: out.bank, mix: out.mix, arrangement: out.arrangement, bpm: out.bank.bpm,
    form: (out.form || []).map((f) => ({ role: f.role, type: f.type, from: f.from, to: f.to })) };
}
