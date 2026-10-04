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
import { energyOf } from '../../../tools/lib/banger/energy.js';
import { generateBanger } from '../../../tools/lib/banger/index.js';
import { normaliseTrackEffects } from '../../../tools/lib/banger/production.js';
import { BANGER_STYLES } from '../../../tools/lib/banger/styles/index.js';
import { BANGER_LIMITS, BANGER_MOODS, styleDefaults, BANGER_EXPRESSION_VERSION } from '../../../tools/lib/banger/options.js';
import { BANGER_SOUNDS } from '../../../tools/lib/banger/sounds.js';
import { resolveSounds } from '../../../tools/lib/banger/sound-rules.js';
import { riffFromNotes, hasNotes } from './riff.js';
import { voltageSettings } from './voltage.js';

// Left out for now: on the 3 Oct WebKit measurement (work/local/_banger-headroom-webkit-
// 2026-10-03.txt) synthwave climbed past the heaviest shipped song and chipstep took the
// page down. They come back once they have phone-safe sounds.
const HELD_BACK = new Set(['synthwave', 'chipstep']);

const caps = (s) => String(s).toUpperCase().replace(/&/g, 'AND');

const STYLE_DESCRIPTIONS = Object.freeze({
  'big-room': 'Huge chords and festival-sized drops',
  trance: 'A long lift with soaring synths',
  'future-bass': 'Bouncy bass and shimmering chords',
  eurobeat: 'Fast drums, bright brass and strings',
  shibuya: 'Playful breakbeats with jazzy sounds',
  dnb: 'Fast breaks, deep bass and airy pads',
  electro: 'Punchy 808 drums and robotic sounds',
  megadrive: 'Retro arcade synths and driving bass',
});

const MOOD_DESCRIPTIONS = Object.freeze({
  anthemic: 'Big festival chords and a bold hook',
  uplifting: 'Bright chords that keep rising',
  euphoric: 'A soaring, hands-in-the-air rush',
  moody: 'A shadowy, reflective groove',
  dark: 'Tense minor chords with an edge',
  heroic: 'A triumphant, cinematic rise',
  nostalgic: 'A warm, wistful, old-school glow',
  funky: 'Bouncy bass and cheeky chords',
  gothic: 'Haunting chords with a dramatic turn',
  bittersweet: 'Tender chords with a sweet-and-sad pull',
  disco: 'Glossy dancefloor chords and bass',
  sunshine: 'Bright, carefree pop chords',
  doowop: 'Sweet, old-school romance',
  lament: 'A grand, sorrowful chord journey',
  lofi: 'Soft, mellow late-night chords',
  dreamy: 'Floating chords, soft and weightless',
  wonder: 'Wide-eyed, cinematic magic',
  lounge: 'Smooth, jazzy cocktail-bar chords',
  boogie: 'Swaggering blues with a danceable bounce',
  hopeful: 'Starts in shadow, turns toward light',
  boss: 'Dark, tense video-game showdown',
  andalusian: 'Flamenco-style tension, then release',
  hypnotic: 'A repeating groove that slowly shifts',
});

/** The styles the jukebox offers, in the desk's order. */
export const MAKER_STYLES = Object.freeze(BANGER_STYLES
  .filter((s) => !HELD_BACK.has(s.id))
  .map((s) => Object.freeze({ id: s.id, label: caps(s.label), description: STYLE_DESCRIPTIONS[s.id] ?? s.note ?? '' })));

/** Every mood plays in every style; show them alphabetically in the Lab. */
export const MAKER_MOODS = Object.freeze(BANGER_MOODS
  .map((m) => Object.freeze({ id: m.id, label: caps(m.label), description: MOOD_DESCRIPTIONS[m.id] ?? m.title ?? '' }))
  .sort((a, b) => a.label.localeCompare(b.label)));

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
 * Default trim for the riff's channel against a style's hook fader, in dB. A kept riff
 * sound keeps its own song's level. A grid riff has no source fader, so it arrives at the
 * hook fader as set for ABSOLUTE ZERO; most styles keep this -3 dB ear adjustment. A style
 * can override it in `balance.riffTrimDb` when its lead arrangement needs the hook forward.
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
  return style ? styleDefaults(style).mood : 'anthemic';
}

export function newSeed() {
  return (Math.random() * 0x7fffffff) >>> 0 || 1;
}

/**
 * A recipe's EXPRESSION VERSION: which playing policy it was made under — today only Auto
 * Portamento, a slide setting on the lead that GO WILD adds (tools/lib/banger/expression.js).
 * A NEW recipe carries 1 (maker.js); one saved before there was any has no `expression` and reads
 * as 0, and is made EXACTLY as it always was, Go Wild included. A kept song is only its recipe,
 * made again whenever it is played, so a recipe that did not say must come out the way it did.
 * It is not RIFF_VERSION (what the grid's numbers mean) and not the generator's version (which
 * the Lab does not record).
 */
export const RECIPE_EXPRESSION = BANGER_EXPRESSION_VERSION;
/** A recipe's expression version, read safely: a whole number from 1, anything else 0 — none. */
export const expressionVersionOf = (value) => (Number.isFinite(value) && value >= 1 ? Math.floor(value) : 0);

/**
 * A recipe → the song: { bank, mix, arrangement, bpm }. Throws if the generator
 * refuses (an empty grid, an unknown style).
 */
export function makeBanger({ notes, lengths = null, mode = 'simple', style, mood, seed, wild = false, variation = null, energy = 'full', expression = 0, production = null, voltage = null }) {
  if (!hasNotes(notes)) throw new Error('the grid is empty');
  const spot = spotFor(style, seed);
  const selectedVariation = ['faithful', 'some', 'wild'].includes(variation) ? variation : (wild ? 'wild' : null);
  const voltageBpmBoost = voltageSettings(voltage).bpmBoost || 0;
  const styleSettings = BANGER_STYLES.find((candidate) => candidate.id === style);
  const voltageTempo = voltageBpmBoost && styleSettings ? {
    tempo: 'custom',
    bpm: Math.min(BANGER_LIMITS.maxBpm, styleSettings.tempoRange?.[1] ?? BANGER_LIMITS.maxBpm,
      styleSettings.bpm + voltageBpmBoost),
  } : {};
  // GO WILD is the Wild variation; with expression 1 it is also the slide setting on the lead.
  // Without `expression` (every recipe saved before it) it is the Wild variation alone, as before.
  const slides = selectedVariation === 'wild' && expressionVersionOf(expression) >= 1;
  const options = {
    style, mood, energy: energyOf(energy), production: normaliseTrackEffects(production), ...(selectedVariation ? { variation: selectedVariation } : {}),
    ...voltageTempo,
    ...(slides ? { expression: { autoPortamento: true, version: BANGER_EXPRESSION_VERSION } } : {}),
    ...(Object.keys(spot).length ? { spot } : {}),
  };
  const out = generateBanger({ riff: riffFromNotes(notes, hookSoundFor(style, mood), mode, lengths), options, seed });
  const lane = out.laneOf?.hook;
  const strip = lane && out.mix.lanes?.[lane];
  const hookTrimDb = Number.isFinite(styleSettings?.balance?.riffTrimDb)
    ? styleSettings.balance.riffTrimDb : RIFF_TRIM_DB;
  if (strip) strip.gain = Math.round(((strip.gain ?? 0) + hookTrimDb) * 10) / 10;
  // `form` is the song's sections (role, bars from–to, counted from 1): the club fires its
  // crowd moments on their changes.
  return { bank: out.bank, mix: out.mix, arrangement: out.arrangement, bpm: out.bank.bpm,
    trackEffects: out.trackEffects,
    form: (out.form || []).map((f) => ({ role: f.role, type: f.type, from: f.from, to: f.to })) };
}
