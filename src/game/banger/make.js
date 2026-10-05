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
import { BANGER_STYLES, styleFor, soundSetOf } from '../../../tools/lib/banger/styles/index.js';
import { BANGER_LIMITS, BANGER_MOODS, styleDefaults, moodBass, BANGER_EXPRESSION_VERSION } from '../../../tools/lib/banger/options.js';
import { BANGER_SOUNDS } from '../../../tools/lib/banger/sounds.js';
import { BANGER_PALETTE, resolvePalette } from '../../../tools/lib/banger/palette.js';
import { resolveSounds } from '../../../tools/lib/banger/sound-rules.js';
import { balanceForStyle } from '../../../tools/lib/banger/style-balance.js';
import { riffFromNotes, hasNotes } from './riff.js';
import { voltageLevel, voltageSettings } from './voltage.js';

// SOUND SETS in the Lab (5 Oct 2026). Chipstep and synthwave were held back after the 3 Oct
// WebKit measurement (work/local/_banger-headroom-webkit-2026-10-03.txt): synthwave climbed
// past the heaviest shipped song and chipstep took the page down. Both come back on their
// LIGHT set — the same music on the cheap synths only (tools/lib/banger/styles/index.js
// BANGER_SOUND_SETS). `label` is the Lab's name where it is not the desk's; `sometimes` is
// another set a take comes out on, by its seed, in every mode — Peter: chiptune "only short
// blippy video-game sounds … as an occasional result" — more often the higher the voltage
// (`chance` by voltage level 0–3: Safe, Charged, Surge, Overload).
const LAB_SOUND_SETS = Object.freeze({
  chipstep: { set: 'light', label: 'Chiptune', sometimes: { set: '8bit', chance: [1 / 6, 1 / 4, 1 / 3, 1 / 2] } },
  synthwave: { set: 'light' },
});

const caps = (s) => String(s).toUpperCase().replace(/&/g, 'AND');

const STYLE_DESCRIPTIONS = Object.freeze({
  chipstep: 'Game-console bleeps and a wobbly drop',
  synthwave: 'Neon 80s drive, gated drums and strings',
  'big-room': 'Huge chords and festival-sized drops',
  trance: 'A long lift with soaring synths',
  'future-bass': 'Bouncy bass and shimmering chords',
  eurobeat: 'Fast drums, bright brass and strings',
  shibuya: 'Playful breakbeats with jazzy sounds',
  dnb: 'Fast breaks, deep bass and airy pads',
  electro: 'Punchy 808 drums and robotic sounds',
  megadrive: 'Retro arcade synths and driving bass',
  'deep-house': 'A warm, swung groove with Rhodes stabs',
  'nu-disco': 'Sunny slow disco with guitar and congas',
  downtempo: 'A slow, heavy break with Rhodes and trumpet',
  eurodance: 'Piano stabs, a supersaw chorus, hands up',
  'italo-disco': 'Galloping synth bass and a robot singer',
  'electro-funk': 'Slap bass, clav and a talking synth',
  'french-house': 'A filtered disco loop that pumps',
  reggaeton: 'The dembow beat, an 808 and marimba',
  moombahton: 'Festival-sized dembow, toms and saw stabs',
  merenhouse: 'Fast merengue: güira, tambora and sax',
  'afro-house': 'Djembe, shekere and a deep groove',
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
  fiesta: 'A Latin party: bouncy, sunny, all night',
});

/** The styles the jukebox offers, in the desk's order. */
export const MAKER_STYLES = Object.freeze(BANGER_STYLES
  .map((s) => Object.freeze({ id: s.id, label: caps(LAB_SOUND_SETS[s.id]?.label ?? s.label), description: STYLE_DESCRIPTIONS[s.id] ?? s.note ?? '' })));

/** The Sound Set a take in `style` plays on ('style', 'light', '8bit'), read off its seed and voltage. */
export function labSoundSet(style, seed, voltage = null) {
  const lab = LAB_SOUND_SETS[style];
  if (!lab) return 'style';
  const chance = lab.sometimes?.chance[voltageLevel(voltage) ?? 1] ?? 0;
  return rollOf(seed, 0x0b175e75) < chance ? lab.sometimes.set : lab.set;
}
/** Whose row of the sounds table a take plays: the style's, or its Sound Set's. */
const soundsIdFor = (style, seed, voltage) => soundSetOf(styleFor(style), labSoundSet(style, seed, voltage))?.id ?? style;

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
export function hookSoundFor(styleId, moodId, seed = null, voltage = null) {
  // With no seed (a preview), the Lab's own set for the style rather than an occasional one.
  const id = seed == null ? (soundSetOf(styleFor(styleId), LAB_SOUND_SETS[styleId]?.set)?.id ?? styleId) : soundsIdFor(styleId, seed, voltage);
  return resolveSounds(BANGER_SOUNDS, id, moodId).random?.hook?.[0] ?? 'simpleSquare';
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
 * 16-Bit (the console powering down). Trance and Eurobeat live on the lift into the
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
 *              Bitcrush one in five, only where crushed sound belongs — 16-Bit, Electro, Downtempo
 *   breakdown  Underwater (muffled, opening up across it), one take in six
 */
export const INTRO_LOWPASS_CHANCE = 1 / 4;
export const INTRO_BITCRUSH_CHANCE = 1 / 5;
export const UNDERWATER_CHANCE = 1 / 6;
const BITCRUSH_STYLES = new Set(['megadrive', 'electro', 'downtempo']);

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

/**
 * VOLTAGE ROLLS (recipe expression 2 — Peter, 4 Oct 2026): what a take draws for itself, off
 * its seed, so a RECHARGE with nothing changed is audibly a different take. The higher the
 * voltage, the further it strays from the style:
 *
 *   lead      the riff's sound drawn from the style's lead shortlist every take, at any voltage —
 *             the style's own among them (the desk's Riff Sound = Random)
 *   bass      another line under the drops — Surge one take in four, Overload one in
 *             two. Never where the mood already picked one (Funky's funk line), nor in a style
 *             whose bass IS the style (Eurobeat)
 *   gate      the chords' gate at another rate, or the supersaws as off-beat stabs instead —
 *             Charged one in four, Surge one in two, Overload three in four, in the
 *             styles that pump their chords
 *   choir     the choir gated with the chords (Gate the Choir), where there is a gate —
 *             Surge one take in four, Overload one in two
 *
 * and OVERLOAD changes the song's make-up as well:
 *
 *   chords    played another way (Pumping Supersaws / Supersaw Stabs / Piano Stabs / Pad), one
 *             take in three
 *   chop      a style that does not pump its chords gets a gate — eighths, sixteenths or dotted
 *             eighths — or supersaw stabs, one take in two. Only on supersaws or a pad: piano
 *             stabs are already a rhythm, and the generator never gates them
 *   kit       another drum kit, one take in three
 *   key lift  the last drop up a major third, one take in three
 *   half time the first eight bars of drop two at half time (Club form only), one take in four
 *   false end stop after the last drop and come back for one more, one take in four
 *
 * and, from Surge, the desk's Surprise Me and Go Crazy moves that cost the phone nothing
 * — no new parts, only effects on the mix for a bar or a section, and the form's shape:
 *
 *   spot FX   into a drop (stutter, beat repeat, high-pass sweep, reverb wash), out of one (delay
 *             throw, reverb wash, low-pass down), over a breakdown (ping-pong echo, big reverb) —
 *             each Surge one take in four, Overload one in two; a radio intro, High
 *             Voltage one in four. The Lab's own Spot FX (spotFor) win where both say something.
 *             Never an ending: the jukebox loops the song, and a fade or a stop would loop too
 *   build-up  the intro built in layers, or the beat and bass alone — Surge one in four,
 *             Overload one in three
 *   key way   a key lift arriving by a walk-up, a pivot, a two-step or a borrowed step — High
 *             Voltage one in two
 *   breakdown the hook at its own speed in the breakdown, or resting — Overload one in four
 */
// Never Sequencer: its echo is a channel of its own (BASS ECHO), and the rolls add no parts.
const BASS_ROLLS = Object.freeze({
  'big-room': ['rolling', 'octaves', 'gallop', 'rootFifth'],
  trance: ['offbeat', 'octaves', 'gallop', 'rootFifth'],
  'future-bass': ['long808', 'octaves', 'rootFifth'],
  shibuya: ['walking', 'funk', 'rootFifth', 'octaves'],
  dnb: ['long808', 'octaves', 'pedal'],
  electro: ['long808', 'funk', 'octaves', 'rootFifth'],
  megadrive: ['rootFifth', 'gallop', 'arpeggiated', 'rolling'],
  'deep-house': ['rolling', 'walking', 'octaves', 'pedal'],
  'nu-disco': ['octaves', 'walking', 'rootFifth', 'funk'],
  downtempo: ['pedal', 'walking', 'reese', 'long808'],
  eurodance: ['octaves', 'rolling', 'gallop', 'rootFifth'],
  'italo-disco': ['octaves', 'gallop', 'offbeat', 'arpeggiated'],
  'electro-funk': ['funk', 'octaves', 'walking', 'long808'],
  'french-house': ['funk', 'octaves', 'walking', 'rolling'],
  reggaeton: ['long808', 'pedal', 'rootFifth'],
  moombahton: ['reese', 'long808', 'octaves', 'rolling'],
  merenhouse: ['rootFifth', 'walking', 'octaves', 'funk'],
  'afro-house': ['rolling', 'sequencer', 'arpeggiated', 'pedal'],
});
// `stabs` in a gate draw is Supersaw Stabs in place of a gate.
const GATE_ROLLS = Object.freeze(['pump', 'eighths', 'sixteenths', 'dotted', 'energy', 'stabs']);
const CHOP_ROLLS = Object.freeze(['eighths', 'sixteenths', 'dotted', 'stabs']);
const CHORD_ROLLS = Object.freeze(['saws', 'stabs', 'piano', 'pad']);
const KIT_ROLLS = Object.freeze(['studio', '909', '808', 'ds', 'cr78']);
const SPOT_ROLLS = Object.freeze({
  intoDrop: ['stutter', 'repeat', 'sweep', 'wash'], outOf: ['throw', 'wash', 'lowpass'], quiet: ['echo', 'reverb'],
});
const APPROACH_ROLLS = Object.freeze(['walkup', 'pivot', 'twostep', 'borrowed']);
/** The rate a pumping style's own gate runs at (fx.js GATES), so a roll never lands on it. */
const OWN_GATE = { trance: 'sixteenths', 'future-bass': 'eighths' };
/** The chance of each roll, by voltage level 0–3. */
export const VOLTAGE_ROLL_ODDS = Object.freeze({
  bass: [0, 0, 1 / 4, 1 / 2], gate: [0, 1 / 4, 1 / 2, 3 / 4], choir: [0, 0, 1 / 4, 1 / 2],
  chords: [0, 0, 0, 1 / 3], chop: [0, 0, 0, 1 / 2], kit: [0, 0, 0, 1 / 3],
  keyLift: [0, 0, 0, 1 / 3], halfTime: [0, 0, 0, 1 / 4], falseEnding: [0, 0, 0, 1 / 4],
  spot: [0, 0, 1 / 4, 1 / 2], radio: [0, 0, 0, 1 / 4], buildUp: [0, 0, 1 / 4, 1 / 3],
  approach: [0, 0, 0, 1 / 2], breakdownHook: [0, 0, 0, 1 / 4],
});

/** This take's voltage rolls, as partial generator options: `{ parts, fx?, drums?, form?, spot? }`. */
export function voltageRollsFor(styleId, moodId, voltage, seed) {
  const style = BANGER_STYLES.find((s) => s.id === styleId);
  // The style's own lead stays in the draw, one take in as many as there are leads to draw from:
  // Riff Sound = Random alone always moves off it.
  const leads = resolveSounds(BANGER_SOUNDS, soundsIdFor(styleId, seed, voltage), moodId).random?.hook?.length || 1;
  const out = { parts: rollOf(seed, 0x0f6a5f3d) < 1 / leads ? {} : { riffSound: 'random' } };
  if (!style) return out;
  const level = voltageLevel(voltage) ?? 1;
  const own = styleDefaults(style);
  // Each roll has its own salt, so one coming up never moves another.
  const rolls = (key, salt) => rollOf(seed, salt) < VOLTAGE_ROLL_ODDS[key][level];
  const pick = (list, salt) => list[Math.floor(rollOf(seed, salt) * list.length)];
  const set = (group, key, value) => { out[group] = { ...out[group], [key]: value }; };
  const basses = BASS_ROLLS[styleId];
  if (basses && !style.bassFixed && moodBass(style, moodId) === own.parts.bass
    && rolls('bass', 0x5b1d0a77)) out.parts.bass = pick(basses, 0x1e9f3c25);
  // A style whose chords ARE its pad (Drum & Bass) keeps them: its breakdowns play the pad
  // anyway, so chords of any other kind would be a channel more.
  const padChords = own.parts.chords === 'pad';
  if (!padChords && rolls('chords', 0x510e527f)) out.parts.chords = pick(CHORD_ROLLS.filter((c) => c !== own.parts.chords), 0x9b05688c);
  const chords = out.parts.chords || own.parts.chords;
  const gateOrStabs = (g) => { if (g === 'stabs') out.parts.chords = 'stabs'; else set('fx', 'gate', g); };
  const chops = padChords ? CHOP_ROLLS.filter((g) => g !== 'stabs') : CHOP_ROLLS;
  if (chords === 'saws' || chords === 'pad') {
    if (own.fx.pump) {
      if (rolls('gate', 0x6a09e667)) gateOrStabs(pick(GATE_ROLLS.filter((g) => g !== (OWN_GATE[styleId] || 'pump')), 0x3c6ef372));
    } else if (rolls('chop', 0x1f83d9ab)) {
      const g = pick(chops, 0x5be0cd19);
      if (g !== 'stabs') set('fx', 'pump', true);
      gateOrStabs(g);
    }
  }
  if (own.parts.choir && (own.fx.pump || out.fx?.pump) && rolls('choir', 0xab1c5ed5)) set('fx', 'gateChoir', true);
  if (rolls('kit', 0x428a2f98)) set('drums', 'kit', pick(KIT_ROLLS, 0x71374491));
  if (own.form.keyLift !== 'third' && rolls('keyLift', 0xb5c0fbcf)) set('form', 'keyLift', 'third');
  if (own.form.template === 'club' && !own.form.halfTime && rolls('halfTime', 0xe9b5dba5)) set('form', 'halfTime', true);
  if (!own.form.falseEnding && rolls('falseEnding', 0x3956c25b)) set('form', 'falseEnding', true);
  for (const [i, [key, list]] of Object.entries(SPOT_ROLLS).entries()) {
    if (rolls('spot', 0x59f111f1 + i)) set('spot', key, pick(list, 0x923f82a4 + i));
  }
  if (rolls('radio', 0xd807aa98)) set('spot', 'intro', 'radio');
  if (own.form.layers === 'off' && !own.form.grooveIntro && rolls('buildUp', 0x12835b01)) {
    if (rollOf(seed, 0x243185be) < 1 / 2) set('form', 'layers', 'always'); else set('form', 'grooveIntro', true);
  }
  if (rolls('approach', 0x550c7dc3)) set('form', 'keyApproach', pick(APPROACH_ROLLS, 0x72be5d74));
  if (rolls('breakdownHook', 0x80deb1fe)) set('form', 'breakdownHook', pick(['written', 'none'].filter((h) => h !== own.form.breakdownHook), 0x9bdc06a7));
  // A form that names no template is read as Club (options.js, for takes made before there
  // were templates): say the style's own, or Eurobeat's pop song would become a club track.
  if (out.form) out.form = { template: own.form.template, ...out.form };
  return out;
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
 * Version 2 adds the VOLTAGE ROLLS (voltageRollsFor). Version 3 adds Voltage-driven section FX. A NEW recipe carries 3 (maker.js); one saved
 * at 1 has the slide but no rolls, and one saved before there was any has no `expression` and reads
 * as 0, and is made EXACTLY as it always was, Go Wild included. A kept song is only its recipe,
 * made again whenever it is played, so a recipe that did not say must come out the way it did.
 * It is not RIFF_VERSION (what the grid's numbers mean) and not the generator's version (which
 * the Lab does not record).
 */
export const RECIPE_EXPRESSION = 3;
/** A recipe's expression version, read safely: a whole number from 1, anything else 0 — none. */
export const expressionVersionOf = (value) => (Number.isFinite(value) && value >= 1 ? Math.floor(value) : 0);

/**
 * A recipe → the song: { bank, mix, arrangement, bpm }. Throws if the generator
 * refuses (an empty grid, an unknown style).
 */
export function makeBanger({ notes, lengths = null, mode = 'simple', style, mood, seed, wild = false, variation = null, energy = 'full', expression = 0, production = null, voltage = null, paletteSnapshot: savedPalette = null, useCurrentPalette = false }) {
  if (!hasNotes(notes)) throw new Error('the grid is empty');
  const spot = spotFor(style, seed);
  const selectedVariation = ['faithful', 'some', 'more', 'wild'].includes(variation) ? variation : (wild ? 'wild' : null);
  const palette = savedPalette || (useCurrentPalette ? BANGER_PALETTE : null);
  const hasHookPalette = !!resolvePalette(palette, style, mood)?.['riff:hook']?.length;
  const voltageBpmBoost = voltageSettings(voltage).bpmBoost || 0;
  const styleSettings = BANGER_STYLES.find((candidate) => candidate.id === style);
  const voltageTempo = voltageBpmBoost && styleSettings ? {
    tempo: 'custom',
    bpm: Math.min(BANGER_LIMITS.maxBpm, styleSettings.tempoRange?.[1] ?? BANGER_LIMITS.maxBpm,
      styleSettings.bpm + voltageBpmBoost),
  } : {};
  // GO WILD is the Wild variation; with expression 1 it is also the slide setting on the lead.
  // Without `expression` (every recipe saved before it) it is the Wild variation alone, as before.
  // From 2 the Lab picks VARIATION apart from VOLTAGE, and the slide is Overload's (`wild`):
  // it is how the lead is played, not which notes it plays.
  const slides = expressionVersionOf(expression) >= 2 ? !!wild
    : selectedVariation === 'wild' && expressionVersionOf(expression) >= 1;
  const rolls = expressionVersionOf(expression) >= 2 ? voltageRollsFor(style, mood, voltage, seed) : {};
  const soundSet = labSoundSet(style, seed, voltage);
  const parts = { ...rolls.parts, ...(hasHookPalette ? { riffSound: 'random' } : {}), ...(soundSet !== 'style' ? { soundSet } : {}) };
  const options = {
    style, mood, energy: energyOf(energy), production: normaliseTrackEffects(production), ...(selectedVariation ? { variation: selectedVariation } : {}),
    ...voltageTempo,
    ...(expressionVersionOf(expression) >= 3 ? { sectionFx: { mode: voltageSettings(voltage).sectionFx } } : {}),
    ...(slides ? { expression: { autoPortamento: true, version: BANGER_EXPRESSION_VERSION } } : {}),
    ...(Object.keys(parts).length ? { parts } : {}),
    ...(rolls.fx ? { fx: rolls.fx } : {}),
    ...(rolls.drums ? { drums: rolls.drums } : {}),
    ...(rolls.form ? { form: rolls.form } : {}),
    ...(Object.keys(spot).length || rolls.spot ? { spot: { ...rolls.spot, ...spot } } : {}),
  };
  const out = generateBanger({ riff: riffFromNotes(notes, hookSoundFor(style, mood, seed, voltage), mode, lengths), options, seed,
    palette });
  const lane = out.laneOf?.hook;
  const strip = lane && out.mix.lanes?.[lane];
  const configuredHookTrim = balanceForStyle(styleSettings).riffTrimDb;
  const hookTrimDb = Number.isFinite(configuredHookTrim) ? configuredHookTrim : RIFF_TRIM_DB;
  if (strip) strip.gain = Math.round(((strip.gain ?? 0) + hookTrimDb) * 10) / 10;
  // `form` is the song's sections (role, bars from–to, counted from 1): the club fires its
  // crowd moments on their changes. `laneOf` (each part's lane), `kit` and `soundsId` (whose
  // row of the sounds table the take plays) are what the club's sound swaps need
  // (club-voices.js).
  return { bank: out.bank, mix: out.mix, arrangement: out.arrangement, bpm: out.bank.bpm,
    trackEffects: out.trackEffects,
    paletteSnapshot: out.banger.paletteSnapshot,
    laneOf: { ...(out.laneOf || {}) }, kit: out.banger?.options?.drums?.kit || 'style', soundsId: soundsIdFor(style, seed, voltage),
    form: (out.form || []).map((f) => ({ role: f.role, type: f.type, from: f.from, to: f.to })) };
}
