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
import { BANGER_STYLES, BANGER_FLAVOURS, styleFor, soundSetOf, moodFlavour, flavourOf, fusionOf } from '../../../tools/lib/banger/styles/index.js';
import { BANGER_LIMITS, BANGER_MOODS, styleDefaults, moodBass, BANGER_EXPRESSION_VERSION } from '../../../tools/lib/banger/options.js';
import { currentMood, MOOD_PAIRS, firstMood, STYLE_MOODS } from '../../../tools/lib/banger/moods.js';
import { BANGER_SOUNDS } from '../../../tools/lib/banger/sounds.js';
import { BANGER_PALETTE, resolvePalette } from '../../../tools/lib/banger/palette.js';
import { resolveSounds } from '../../../tools/lib/banger/sound-rules.js';
import { balanceForStyle } from '../../../tools/lib/banger/style-balance.js';
import { kitRollsFor } from '../../../tools/lib/banger/kit-rolls.js';
import { riffFromNotes, hasNotes } from './riff.js';
import { voltageLevel, voltageSettings } from './voltage.js';
import { VOICES } from '../../data/voices.js';
import { synthFamily, MRDR3, TNGR2, KNDO5, WNDR9 } from '../../engine/synth-families.js';

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
  'acid-house': 'A squelching 303 line over a 909 groove',
  techno: 'Driving 909s and parallel chord stabs',
  rave: 'Breakbeats, hoovers and rave stabs',
  'uk-garage': 'Skippy 2-step beats and organ bass',
  freestyle: 'Latin electro beats and orchestra hits',
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
  boss: 'Dark, tense video-game showdown',
  flamenco: 'Flamenco-style tension, then release',
  hypnotic: 'A repeating groove that slowly shifts',
  fiesta: 'A Latin party: bouncy, sunny, all night',
  soulful: 'Warm gospel chords with a churchy lift',
  mystery: 'A sneaky minor line, full of suspense',
  playful: 'Cheeky cartoon chords that tiptoe and bounce',
});

// The Lab's picker order (Peter, 6 Oct 2026: "big room house and trance to be first followed
// by any related styles … don't want it alphabetical"), FAMILY BY FAMILY since 9 Oct 2026
// (docs/LAB_STYLES_PLAN.md): each family a colour, shown as a dot by the style's name, so the list
// says what goes together without needing to come in fours. Chillout Room last.
// A style missing from this list goes on the end, in the desk's order.
export const LAB_FAMILIES = Object.freeze([
  Object.freeze({ id: 'festival', label: 'Festival & Euro', styles: Object.freeze(['big-room', 'trance', 'future-bass', 'eurodance', 'eurobeat']) }),
  Object.freeze({ id: 'ukrave', label: 'UK Rave', styles: Object.freeze(['rave', 'dnb', 'uk-garage']) }),
  Object.freeze({ id: 'club', label: 'Club', styles: Object.freeze(['acid-house', 'techno', 'deep-house', 'afro-house']) }),
  Object.freeze({ id: 'latin', label: 'Latin', styles: Object.freeze(['moombahton', 'reggaeton', 'merenhouse']) }),
  Object.freeze({ id: 'disco', label: 'Disco & 80s', styles: Object.freeze(['nu-disco', 'electro-funk', 'electro', 'freestyle']) }),
  Object.freeze({ id: 'synths', label: 'Synths & Games', styles: Object.freeze(['synthwave', 'megadrive', 'chipstep']) }),
  Object.freeze({ id: 'chill', label: 'Chill', styles: Object.freeze(['shibuya', 'downtempo']) }),
]);
/**
 * The INFUSIONS EXPERIMENT leans to over each FORMULA (Peter, 10 Oct 2026): from another family, sharing
 * two or more of FORMULA's recommended moods (moods.js STYLE_MOODS), real-world hybrids where there is one —
 * liquid DnB, UK funky, moombahton's slowed Dutch house. Picked on paper, none heard yet.
 */
export const LAB_INFUSIONS = Object.freeze({
  'big-room': ['rave', 'synthwave', 'chipstep'],
  trance: ['rave', 'synthwave', 'afro-house'],
  'future-bass': ['shibuya', 'synthwave', 'downtempo'],
  eurodance: ['freestyle', 'rave', 'synthwave'],
  eurobeat: ['megadrive', 'synthwave', 'rave'],
  rave: ['acid-house', 'trance', 'chipstep'],
  dnb: ['deep-house', 'downtempo', 'techno', 'synthwave'],
  'uk-garage': ['deep-house', 'afro-house', 'nu-disco'],
  'acid-house': ['electro', 'rave'],
  techno: ['electro', 'downtempo', 'uk-garage'],
  'deep-house': ['downtempo', 'uk-garage', 'dnb'],
  'afro-house': ['reggaeton', 'uk-garage', 'trance'],
  moombahton: ['big-room', 'afro-house', 'eurodance'],
  reggaeton: ['afro-house', 'eurodance', 'electro'],
  merenhouse: ['nu-disco', 'electro-funk'],
  'nu-disco': ['shibuya', 'merenhouse'],
  'electro-funk': ['megadrive', 'uk-garage'],
  electro: ['acid-house', 'techno', 'megadrive'],
  freestyle: ['synthwave', 'eurodance'],
  synthwave: ['freestyle', 'eurobeat', 'shibuya'],
  megadrive: ['eurobeat', 'electro-funk', 'rave'],
  chipstep: ['big-room', 'eurobeat', 'rave'],
  shibuya: ['nu-disco', 'future-bass', 'synthwave'],
  downtempo: ['deep-house', 'dnb', 'synthwave'],
});
/** The family a style is in (its dot's colour, in maker.js), or null. */
export const familyOf = (id) => LAB_FAMILIES.find((f) => f.styles.includes(id))?.id ?? null;
const LAB_STYLE_ORDER = Object.freeze([...LAB_FAMILIES.flatMap((f) => f.styles), 'italo-disco', 'french-house']);
// Names the Lab gives a style where the desk's is a record-shop word (Peter, 6 Oct 2026:
// "could downtempo be called chill or something like that instead", then "chillout room? bit
// of a throwback").
const LAB_LABELS = Object.freeze({ downtempo: 'Chillout Room' });
const labRank = (id) => { const i = LAB_STYLE_ORDER.indexOf(id); return i < 0 ? LAB_STYLE_ORDER.length : i; };
// Styles the Lab leaves out of its pickers, but still makes and names — the desk keeps them all.
// Italo Disco and French House (9 Oct 2026): in the Lab they are flavours of Eurobeat and Nu-Disco
// (STYLE_FLAVOURS, below), so a take can land on one but nobody picks it. Boogie, hidden on 7 Oct,
// came back the same day the five new styles were heard (Peter: "Sounds great").
const LAB_HIDDEN = new Set(['italo-disco', 'french-house']);

// Every style as the Lab names it, hidden ones too, so a song kept on one still reads as itself.
const LAB_STYLES = Object.freeze([...BANGER_STYLES]
  .sort((a, b) => labRank(a.id) - labRank(b.id))
  .map((s) => Object.freeze({ id: s.id, label: caps(LAB_LABELS[s.id] ?? LAB_SOUND_SETS[s.id]?.label ?? s.label), description: STYLE_DESCRIPTIONS[s.id] ?? s.note ?? '',
    family: familyOf(s.id) })));
/** The styles the jukebox offers, in the Lab's order (LAB_STYLE_ORDER). */
export const MAKER_STYLES = Object.freeze(LAB_STYLES.filter((s) => !LAB_HIDDEN.has(s.id)));

/** The Sound Set a take in `style` plays on ('style', 'light', '8bit'), read off its seed and voltage. */
export function labSoundSet(style, seed, voltage = null) {
  const lab = LAB_SOUND_SETS[style];
  if (!lab) return 'style';
  const chance = lab.sometimes?.chance[voltageLevel(voltage) ?? 1] ?? 0;
  return rollOf(seed, 0x0b175e75) < chance ? lab.sometimes.set : lab.set;
}
/**
 * FLAVOURS in the Lab (styles/flavours.js), with no control of their own: the mood's
 * arrangement of the style — and now and then another, more often the higher the voltage, so a
 * re-roll can land somewhere unexpected (Peter, 6 Oct 2026: "i want the user to potentially just
 * reroll and get a nice surprise", "tie it to the voltage", "make it dependant on the mood").
 * Chance of a surprise by voltage level: Safe, Charged, Surge, Overload.
 */
export const FLAVOUR_SURPRISE = Object.freeze([0, 1 / 5, 1 / 3, 1 / 2]);
/**
 * STYLES PLAYED AS FLAVOURS (9 Oct 2026, docs/LAB_STYLES_PLAN.md). In the Lab, Italo Disco is one of
 * Eurobeat's flavours and French House one of Nu-Disco's — a surprise the mood or the voltage lands
 * on, like any flavour (Peter: "I like that they may be a surprise, that's the whole point of
 * flavours"). The desk keeps both as styles, and a take that lands on one is made as THAT style,
 * whole — its own recipe, sounds, seed and levels — so each sounds exactly as it always did. Kept as
 * `{ style: 'eurobeat', flavour: 'italo' }`; a song kept on Italo Disco itself plays as it was.
 */
const STYLE_FLAVOURS = Object.freeze({
  eurobeat: Object.freeze({ italo: Object.freeze({ style: 'italo-disco', moods: Object.freeze(['nostalgic', 'dreamy', 'disco', 'wonder', 'bittersweet']) }) }),
  'nu-disco': Object.freeze({ french: Object.freeze({ style: 'french-house', moods: Object.freeze(['funky', 'boogie', 'hypnotic', 'lounge']) }) }),
});
/** The style a Lab flavour is played as, when it is a whole style (STYLE_FLAVOURS); else null. */
export const styleFlavour = (style, flavour) => STYLE_FLAVOURS[style]?.[flavour]?.style ?? null;
/**
 * Styles whose flavours came after takes of them could be kept without one (9 Oct 2026). A take of
 * one kept with no flavour was made as the style itself and stays so — never rolled into a flavour
 * that did not exist when it was kept. Every take made since keeps its flavour (maker.js).
 */
const FLAVOURED_SINCE = Object.freeze(new Set(['eurobeat', 'nu-disco', 'deep-house', 'electro-funk', 'downtempo']));
const keptFlavourOf = (style, flavour) => flavour ?? (FLAVOURED_SINCE.has(style) ? 'style' : null);
/** The flavour id a take in `style` and `mood` plays, or null for a style without flavours. */
export function labFlavour(style, mood, seed = null, voltage = null) {
  const st = styleFor(style);
  const whole = STYLE_FLAVOURS[style] || null;
  if (!st?.flavours?.length && !whole) return null;
  const real = st?.flavours?.map((f) => f.id) || [];
  const m = firstMood(mood);
  // A whole-style flavour the mood names comes first; otherwise the mood's own flavour, or the style.
  const own = Object.entries(whole || {}).find(([, w]) => w.moods.includes(m))?.[0]
    ?? (real.length ? moodFlavour(st, m) : 'style');
  if (seed == null || rollOf(seed, 0x6a09e667) >= (FLAVOUR_SURPRISE[voltageLevel(voltage) ?? 1] ?? 0)) return own;
  const others = [...(real.length ? real : ['style']), ...Object.keys(whole || {})].filter((id) => id !== own);
  return others[Math.floor(rollOf(seed, 0x3c6ef372) * others.length)];
}
/** Whether `flavour` is the style's own arrangement (or the style has none). */
const ownFlavour = (style, flavour) => !flavour || flavour === 'style' || flavour === styleFor(style)?.flavours?.[0]?.id;
/**
 * Whose row of the sounds table a take plays: a flavour's (one not the style's own — it has its
 * own sounds, phone-light where the style's Lab set is), else the style's Sound Set's, else the
 * style's. `flavour` is the take's kept one; without it, rolled as labFlavour rolls it.
 */
function soundsIdFor(style, seed, voltage, mood = null, flavour = null) {
  const f = flavour ?? labFlavour(style, mood, seed, voltage);
  const whole = styleFlavour(style, f);
  if (whole) return soundsIdFor(whole, seed, voltage, mood, 'style');
  if (!ownFlavour(style, f) && BANGER_SOUNDS[`${style}-${f}`]) return `${style}-${f}`;
  const set = seed == null ? LAB_SOUND_SETS[style]?.set : labSoundSet(style, seed, voltage);
  return soundSetOf(styleFor(style), set)?.id ?? style;
}

/** Every mood plays in every style; show them alphabetically in the Lab. */
/**
 * Where a MOOD PAIR's second mood takes over, in the words of the form the song is in: a Pop Song's
 * choruses are a Club track's drops and a Groove's peaks.
 */
const PAIR_WHERE = Object.freeze({
  choruses: { pop: 'in every chorus', groove: 'at every peak', other: 'in every drop' },
  final: { pop: 'for the last chorus', groove: 'for the finale', other: 'for the last drop' },
  breakdown: { pop: 'from the middle 8', groove: 'for the second half', other: 'after the break' },
});
const moodName = (id) => BANGER_MOODS.find((m) => m.id === id)?.label ?? id;
/** A pair's line under its name: `Moody, turning Uplifting in every chorus` — for the form `template`. */
export function pairDescription(id, template = 'club') {
  const p = MOOD_PAIRS[id];
  if (!p) return '';
  return `${moodName(p.first)}, turning ${moodName(p.second)} ${PAIR_WHERE[p.switch][template === 'pop' || template === 'groove' ? template : 'other']}`;
}
/** ELEMENT's list: the moods alphabetically, then the MOOD PAIRS (moods.js), alphabetically too. */
export const MAKER_MOODS = Object.freeze([
  ...BANGER_MOODS
    .map((m) => Object.freeze({ id: m.id, label: caps(m.label), description: MOOD_DESCRIPTIONS[m.id] ?? m.title ?? '' }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  ...Object.entries(MOOD_PAIRS)
    .map(([id, p]) => Object.freeze({ id, label: caps(p.label), description: pairDescription(id), pair: true }))
    .sort((a, b) => a.label.localeCompare(b.label)),
]);

export const styleLabel = (id) => LAB_STYLES.find((s) => s.id === id)?.label ?? caps(id);

/**
 * INFUSION (tools/lib/banger/styles/fusion.js; Peter, 7 Oct 2026): the selector beside FORMULA. NONE,
 * or another formula whose SOUND — its chords, instruments and arrangement — plays over FORMULA's
 * GROOVE: its drums, bass and tempo. The generator calls the sound the style (`music`) and the groove
 * its `fusion` (`beat`). A take keeps the infusion as it played (`infusion`): the style, or the flavour
 * of it its mood picks (labInfusion), so a flavour added to that style later never moves a kept song.
 * FORMULA keeps its own flavour as ever (`flavour`, labFlavour), and that is the groove.
 */
/** The style a kept infusion belongs to — a flavour's own style — or null for anything that is not one. */
export const infusionStyle = (infusion) => {
  const st = infusion ? styleFor(infusion) : null;
  return st && !st.fusion && !st.soundSet ? (st.base || st.id) : null;
};
/** The infusion a take in `mood` keeps for the style `id`: its mood's flavour where that is not its own, else the style. */
export function labInfusion(id, mood) {
  const st = styleFor(infusionStyle(id));
  if (!st) return null;
  const whole = Object.values(STYLE_FLAVOURS[st.id] || {}).find((w) => w.moods.includes(firstMood(mood)));
  if (whole) return whole.style;
  const f = moodFlavour(st, firstMood(mood));
  if (!f || f === st.flavours?.[0]?.id) return st.id;
  return BANGER_FLAVOURS.find((x) => x.base === st.id && x.flavour === f)?.id ?? st.id;
}
/**
 * LENGTH and SHAPE (Peter, 10 Oct 2026): picked in MUTATIONS' chooser, kept on the recipe as `songLength`
 * and `shape`. Absent is DEFAULT — the formula's own, as every recipe before them — so nothing kept moves.
 * A picked SHAPE is never rolled away by the voltage's form roll. Over an INFUSION DEFAULT is the Club form,
 * and a picked SHAPE overrides it (Peter: "let user override an infusion so it can be not club").
 */
export const LAB_LENGTHS = Object.freeze([
  // Named for records (Peter, 10 Oct 2026); the ids are the desk's lengths, and the fourth, the Lab's own,
  // is the desk's Custom length at `bars`.
  // (`bars` is the desk's length, BANGER_LENGTHS; MUTATIONS' hint turns it into a running time, labLengthHint)
  Object.freeze({ id: 'short', label: 'Radio Edit', bars: 48 }),
  Object.freeze({ id: 'medium', label: 'Single', bars: 64 }),
  Object.freeze({ id: 'long', label: 'Album Version', bars: 112 }),
  Object.freeze({ id: 'xlong', label: '12 Inch', bars: 160, custom: true }),
]);
export const LAB_SHAPES = Object.freeze([
  Object.freeze({ id: 'club', label: 'Club', description: 'Build and drop, a breakdown, then a bigger drop' }),
  Object.freeze({ id: 'pop', label: 'Pop Song', description: 'Verses, choruses and a middle 8' }),
  Object.freeze({ id: 'anthem', label: 'Anthem', description: 'A long breakdown into one huge final drop' }),
  Object.freeze({ id: 'groove', label: 'Groove', description: 'No drops: one groove, its parts coming and going' }),
]);
/** LENGTH as the generator's options: a length it names, or Extra Long as its Custom length. Nothing for DEFAULT. */
const lengthOptions = (id) => {
  const l = LAB_LENGTHS.find((x) => x.id === id);
  return !l ? {} : l.custom ? { length: 'custom', customBars: l.bars } : { length: l.id };
};
/**
 * A LENGTH's hint in MUTATIONS: its bars and about how long they run at FORMULA's tempo (the groove's, which an
 * INFUSION keeps) — `112 bars, about 3:30 at 128 BPM`. Rounded to five seconds: a flavour's own tempo and
 * Overload's push move it a little.
 */
export function labLengthHint(id, style) {
  const l = LAB_LENGTHS.find((x) => x.id === id);
  const bpm = styleFor(style)?.bpm;
  if (!l) return '';
  if (!bpm) return `${l.bars} bars`;
  const s = Math.round((l.bars * 4 * 60 / bpm) / 5) * 5;
  return `${l.bars} bars, about ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} at ${bpm} BPM`;
}
/** A recipe's LENGTH or SHAPE as one the Lab offers, or null (DEFAULT). */
export const labLength = (id) => (LAB_LENGTHS.some((l) => l.id === id) ? id : null);
export const labShape = (id) => (LAB_SHAPES.some((t) => t.id === id) ? id : null);
/**
 * What DEFAULT is for FORMULA (and INFUSION): `{ songLength, shape }`. The length is the sound's — the
 * infusion's when there is one, as the generator reads it — and the shape the formula's own, Club with an
 * infusion.
 */
export function labDefaults(style, infusion = null) {
  const sound = styleFor(infusionStyle(infusion) || style);
  const own = sound ? styleDefaults(sound) : null;
  return { songLength: own?.length ?? 'medium', shape: infusion ? 'club' : (styleFor(style) ? styleDefaults(styleFor(style)).form.template : 'club') };
}
/**
 * The moods ELEMENT marks as suiting the song (moods.js STYLE_MOODS): FORMULA's, or with an INFUSION
 * the ones both suit — the mood's chords come from the infusion, its tempo and bass from FORMULA —
 * and the infusion's own where the two share none.
 */
export function labSuitedMoods(style, infusion = null) {
  const suits = (id) => STYLE_MOODS[styleFor(id)?.base ?? id] ?? [];
  const groove = suits(style);
  if (!infusion) return groove;
  const sound = suits(infusion);
  const both = sound.filter((m) => groove.includes(m));
  return both.length ? both : sound;
}
/** The recipe FORMULA's groove plays on: its flavour where that is not its own, else the style on its Lab Sound Set. */
function grooveRecipeId(style, flavour, seed, voltage) {
  const whole = styleFlavour(style, flavour);
  if (whole) return grooveRecipeId(whole, 'style', seed, voltage);
  if (!ownFlavour(style, flavour)) {
    const f = BANGER_FLAVOURS.find((x) => x.base === style && x.flavour === flavour);
    if (f) return f.id;
  }
  const set = seed == null ? LAB_SOUND_SETS[style]?.set : labSoundSet(style, seed, voltage);
  return soundSetOf(styleFor(style), set)?.id ?? style;
}
/**
 * A song kept in the first hour of fusions (7 Oct 2026) named its SOUND `style` (with that style's
 * `flavour`) and its GROOVE `fusion`. Rewritten in place as FORMULA (`style`, `flavour`) and `infusion`,
 * so it is made exactly as it was.
 */
export function upgradeFusionRecipe(r) {
  const groove = styleFor(r.fusion);
  if (groove && !groove.fusion) {
    const sound = r.flavour && !ownFlavour(r.style, r.flavour) && BANGER_FLAVOURS.find((x) => x.base === r.style && x.flavour === r.flavour);
    r.infusion = sound ? sound.id : r.style;
    r.style = groove.base || groove.id;
    const own = styleFor(r.style)?.flavours?.[0]?.id;
    if (groove.flavour || own) r.flavour = groove.flavour || own; else delete r.flavour;
  }
  delete r.fusion;
  return r;
}
/** A kept song's formula as the Lab names it: REGGAETON, or REGGAETON × TRANCE with an infusion. */
export const formulaLabel = (style, infusion = null) => {
  const sound = infusionStyle(infusion);
  return sound && sound !== style ? `${styleLabel(style)} × ${styleLabel(sound)}` : styleLabel(style);
};
export const moodLabel = (id) => MAKER_MOODS.find((m) => m.id === id)?.label ?? caps(id);

/**
 * The riff plays on the style's own hook sound — the first on its shortlist (Electric
 * Grand for Big-Room House and Trance) — never on the plain lead the grid previewed
 * with. Peter, 3 Oct 2026. The grid previews on one of the style's leads that holds a note
 * (labLeadSound), which is this one when it does.
 */
export function hookSoundFor(styleId, moodId, seed = null, voltage = null, flavour = null) {
  return hookShortlist(styleId, moodId, seed, voltage, flavour)[0] ?? 'simpleSquare';
}
/** The style's lead sounds, its own hook first. */
function hookShortlist(styleId, moodId, seed = null, voltage = null, flavour = null) {
  // With no seed (a preview), the Lab's own set for the style rather than an occasional one.
  const id = soundsIdFor(styleId, seed, voltage, moodId, flavour);
  return resolveSounds(BANGER_SOUNDS, id, moodId).random?.hook ?? [];
}

// A held note keeps at least half its level for as long as it is held. The desk's own line for a
// slide (engine/auto-portamento.js) is a fifth, which still lets a clav or a pluck through.
const HELD_SUSTAIN = 0.5;
/**
 * Does this preset hold a note for as long as the grid drew it? Read off whichever envelope owns
 * the level in its engine. A struck piano or a bell dies away however long the note is, so a long
 * note and a short one sound alike on it.
 */
export function presetHolds(id) {
  const v = VOICES[id];
  if (!v || v.kind !== 'tone') return false;
  // A KNDO-5 length of its own is the note's length in a preview (audio.js noteSeconds).
  if (v.fixedLength > 0) return false;
  const family = synthFamily(v.synth);
  if (family === MRDR3) {
    // Each layer's own sustain, through the global VCA's when there is one, weighed by its level.
    const vca = v.global?.vca ? (v.global.vca.sustain ?? 0) : 1;
    const layers = ['osc1', 'osc2', 'osc3'].map((k) => v.layer?.[k]).filter((l) => l && (l.gain ?? 1) > 0);
    const sum = layers.reduce((a, l) => a + (l.gain ?? 1), 0);
    const held = layers.reduce((a, l) => a + (l.gain ?? 1) * (l.vca === 'through' ? 1 : (l.sustain ?? 0)), 0);
    return sum > 0 && (held / sum) * vca >= HELD_SUSTAIN;
  }
  if (family === TNGR2) return (v.tngr2?.amp?.sustain ?? 0.7) >= HELD_SUSTAIN;
  if (family === WNDR9) return (v.additive?.sustain ?? 0) >= HELD_SUSTAIN;
  // KNDO-5 is a gate unless it says otherwise; CRLS-1 and RMND-2 state theirs.
  return (v.options?.envelope?.sustain ?? (family === KNDO5 ? 1 : 0)) >= HELD_SUSTAIN;
}

/**
 * The lead the Lab's grid plays the riff on (Peter, 10 Oct 2026): one of the lead sounds a take in
 * this FORMULA, INFUSION and ELEMENT draws its hook from — resolved as makeBanger resolves them, with
 * no seed, so the Lab's own Sound Set and the mood's own flavour, and the infusion's sound over a
 * groove. The first on that list that holds a note (presetHolds), so a long note on the grid sounds
 * long; with `noTngr2` (the dev build, Peter) the first that is not a TNGR-2 either. None of them
 * does: Simple Square.
 */
export function labLeadSound(style, mood, infusion = null, { noTngr2 = false } = {}) {
  mood = currentMood(mood);
  if (MOOD_PAIRS[mood]) mood = MOOD_PAIRS[mood].first;
  let flavour = null;
  // the infusion as a take keeps it (maker.js make): its mood's flavour of it
  const kept = infusion ? labInfusion(infusion, mood) : null;
  const sound = infusionStyle(kept);
  if (sound && sound !== style) {
    style = sound;
    flavour = styleFor(kept)?.flavour ?? 'style';
  }
  flavour = flavour ?? labFlavour(style, mood);
  const whole = styleFlavour(style, flavour);
  if (whole) { style = whole; flavour = 'style'; }
  const ok = (id) => presetHolds(id) && !(noTngr2 && synthFamily(VOICES[id].synth) === TNGR2);
  return hookShortlist(style, mood, null, null, flavour).find(ok) ?? 'simpleSquare';
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
 *
 * and, from recipe expression 4 (Peter, 7 Oct 2026: "occasionally change it, but more towards doing
 * club if it's not already"), from Charged up:
 *
 *   form      another shape for the song (FORM_ROLLS). A style that is not Club becomes Club three
 *             times in four, else another; a Club style changes half as often, never to Club.
 *             Charged one take in six, Surge one in four, Overload one in three
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
  // The 303 sound plays the others too, without slides or accents.
  'acid-house': ['rolling', 'octaves', 'pedal'],
  techno: ['acid', 'octaves', 'pedal', 'offbeat'],
  rave: ['rolling', 'octaves', 'reese', 'long808'],
  'uk-garage': ['funk', 'walking', 'octaves', 'rootFifth'],
  freestyle: ['octaves', 'funk', 'gallop', 'offbeat'],
});
// `stabs` in a gate draw is Supersaw Stabs in place of a gate.
const GATE_ROLLS = Object.freeze(['pump', 'eighths', 'sixteenths', 'dotted', 'energy', 'stabs']);
const CHOP_ROLLS = Object.freeze(['eighths', 'sixteenths', 'dotted', 'stabs']);
const CHORD_ROLLS = Object.freeze(['saws', 'stabs', 'piano', 'pad']);
// The kits a recipe before version 11 rolls to; from 11, the style's own list (kit-rolls.js).
const KIT_ROLLS = Object.freeze(['studio', '909', '808', 'ds', 'cr78']);
const SPOT_ROLLS = Object.freeze({
  intoDrop: ['stutter', 'repeat', 'sweep', 'wash'], outOf: ['throw', 'wash', 'lowpass'], quiet: ['echo', 'reverb'],
});
const APPROACH_ROLLS = Object.freeze(['walkup', 'pivot', 'twostep', 'borrowed']);
/** The forms a take can roll to (tools/lib/banger/templates.js, and Club). */
const FORM_ROLLS = Object.freeze(['club', 'pop', 'anthem', 'groove']);
/** The rate a pumping style's own gate runs at (fx.js GATES), so a roll never lands on it. */
const OWN_GATE = { trance: 'sixteenths', 'future-bass': 'eighths' };
/** The chance of each roll, by voltage level 0–3. */
export const VOLTAGE_ROLL_ODDS = Object.freeze({
  bass: [0, 0, 1 / 4, 1 / 2], gate: [0, 1 / 4, 1 / 2, 3 / 4], choir: [0, 0, 1 / 4, 1 / 2],
  chords: [0, 0, 0, 1 / 3], chop: [0, 0, 0, 1 / 2], kit: [0, 0, 0, 1 / 3],
  keyLift: [0, 0, 1 / 3, 1 / 2], keyLiftChill: [0, 0, 0, 1 / 4], halfTime: [0, 0, 0, 1 / 4], falseEnding: [0, 0, 0, 1 / 4],
  spot: [0, 0, 1 / 4, 1 / 2], radio: [0, 0, 0, 1 / 4], buildUp: [0, 0, 1 / 4, 1 / 3],
  approach: [0, 0, 1 / 3, 1 / 2], breakdownHook: [0, 0, 0, 1 / 4],
  form: [0, 1 / 6, 1 / 4, 1 / 3],
});
/**
 * The key lift and its approach before version 9 (10 Oct 2026): Overload alone, one take in three lifted a
 * major third and one in two came in another way. A recipe kept before 9 still rolls these.
 */
const KEY_ROLL_ODDS_BEFORE_9 = Object.freeze({ keyLift: [0, 0, 0, 1 / 3], approach: [0, 0, 0, 1 / 2] });
/** The lifts a take can roll to (version 9): the style's own is left out, so a roll is always a change. */
const KEY_LIFT_ROLLS = Object.freeze(['none', 'half', 'whole', 'third']);

/**
 * This take's voltage rolls, as partial generator options: `{ parts, fx?, drums?, form?, spot? }`. Over
 * another style's beat (`beat`, a recipe id) the bass lines and the chords' gate are the beat's.
 * `version` is the recipe's expression version: the form roll is 4's.
 */
export function voltageRollsFor(styleId, moodId, voltage, seed, beat = null, version = 3, flavour = null, shape = null) {
  const plain = BANGER_STYLES.find((s) => s.id === styleId);
  const style = (beat && plain && fusionOf(plain, beat)) || plain;
  // whose per-style tables (bass lines, the chords' gate) the groove is: the beat recipe's own style
  const groove = style?.fusion ? (styleFor(beat)?.base || beat) : styleId;
  // The style's own lead stays in the draw, one take in as many as there are leads to draw from:
  // Riff Sound = Random alone always moves off it.
  const leads = resolveSounds(BANGER_SOUNDS, soundsIdFor(styleId, seed, voltage, moodId, flavour), moodId).random?.hook?.length || 1;
  const out = { parts: rollOf(seed, 0x0f6a5f3d) < 1 / leads ? {} : { riffSound: 'random' } };
  if (!style) return out;
  const level = voltageLevel(voltage) ?? 1;
  const own = styleDefaults(style);
  // A recipe kept before its style's form moved (FORMS_BEFORE_5) rolls from the form it had.
  if (!beat && formBefore(styleId, version)) own.form.template = formBefore(styleId, version);
  // Each roll has its own salt, so one coming up never moves another.
  const rolls = (key, salt) => rollOf(seed, salt) < VOLTAGE_ROLL_ODDS[key][level];
  const pick = (list, salt) => list[Math.floor(rollOf(seed, salt) * list.length)];
  const set = (group, key, value) => { out[group] = { ...out[group], [key]: value }; };
  const basses = BASS_ROLLS[groove];
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
      if (rolls('gate', 0x6a09e667)) gateOrStabs(pick(GATE_ROLLS.filter((g) => g !== (OWN_GATE[groove] || 'pump')), 0x3c6ef372));
    } else if (rolls('chop', 0x1f83d9ab)) {
      const g = pick(chops, 0x5be0cd19);
      if (g !== 'stabs') set('fx', 'pump', true);
      gateOrStabs(g);
    }
  }
  if (own.parts.choir && (own.fx.pump || out.fx?.pump) && rolls('choir', 0xab1c5ed5)) set('fx', 'gateChoir', true);
  if (rolls('kit', 0x428a2f98)) set('drums', 'kit', pick(version >= 11 ? kitRollsFor(groove, { lab: true }) : KIT_ROLLS, 0x71374491));
  // THE KEY LIFT (version 9, 10 Oct 2026; Peter: the Lab's lift was predictable — every take of a style
  // lifted the same way below Overload). From Surge a style that lifts draws another lift — none, half,
  // whole or third, never its own — one take in three, one in two at Overload. A style that says none
  // (the chill grooves) stays unlifted below Overload, where one take in four lifts a half step. Before
  // 9, Overload alone, one in three, and only up to a third.
  if (version >= 9) {
    if (own.form.keyLift === 'none') {
      if (rolls('keyLiftChill', 0xb5c0fbcf)) set('form', 'keyLift', 'half');
    } else if (rolls('keyLift', 0xb5c0fbcf)) {
      set('form', 'keyLift', pick(KEY_LIFT_ROLLS.filter((l) => l !== own.form.keyLift), 0x7a3d9c41));
    }
  } else if (own.form.keyLift !== 'third' && rollOf(seed, 0xb5c0fbcf) < KEY_ROLL_ODDS_BEFORE_9.keyLift[level]) {
    set('form', 'keyLift', 'third');
  }
  // The form, now and then (version 4) — Club, mostly, for a style that is not Club already.
  // Over another style's beat (an INFUSION) the form is Club's, always (Peter, 8 Oct 2026) — no roll.
  // A SHAPE the player picked (labShape) is the form, over an INFUSION's beat too: no roll moves it.
  const picked = labShape(shape);
  let template = picked || (beat ? 'club' : own.form.template);
  if (version >= 4 && !beat && !picked) {
    const club = template === 'club';
    if (rollOf(seed, 0x2f8bd2a1) < VOLTAGE_ROLL_ODDS.form[level] * (club ? 1 / 2 : 1)) {
      template = !club && rollOf(seed, 0x6d1f3b55) < 3 / 4 ? 'club' : pick(FORM_ROLLS.filter((t) => t !== 'club' && t !== template), 0x4c1a7e93);
      set('form', 'template', template);
    }
  }
  if (template === 'club' && !own.form.halfTime && rolls('halfTime', 0xe9b5dba5)) set('form', 'halfTime', true);
  if (!own.form.falseEnding && rolls('falseEnding', 0x3956c25b)) set('form', 'falseEnding', true);
  for (const [i, [key, list]] of Object.entries(SPOT_ROLLS).entries()) {
    if (rolls('spot', 0x59f111f1 + i)) set('spot', key, pick(list, 0x923f82a4 + i));
  }
  if (rolls('radio', 0xd807aa98)) set('spot', 'intro', 'radio');
  if (own.form.layers === 'off' && !own.form.grooveIntro && rolls('buildUp', 0x12835b01)) {
    // From version 8 always the layers — riff first under Tune First — never the Drums & Bass Intro,
    // which keeps a casual listener waiting for a tune (Peter, 9 Oct 2026).
    if (version >= 8 || rollOf(seed, 0x243185be) < 1 / 2) set('form', 'layers', 'always'); else set('form', 'grooveIntro', true);
  }
  // How the lift arrives: from Surge too since version 9 (the ear hears the approach bar before the new key).
  if (rollOf(seed, 0x550c7dc3) < (version >= 9 ? VOLTAGE_ROLL_ODDS : KEY_ROLL_ODDS_BEFORE_9).approach[level]) set('form', 'keyApproach', pick(APPROACH_ROLLS, 0x72be5d74));
  if (rolls('breakdownHook', 0x80deb1fe)) set('form', 'breakdownHook', pick(['written', 'none'].filter((h) => h !== own.form.breakdownHook), 0x9bdc06a7));
  // A form that names no template is read as Club (options.js, for takes made before there
  // were templates): say the style's own, or Eurobeat's pop song would become a club track.
  if (out.form) out.form = { template: picked || (beat ? 'club' : own.form.template), ...out.form };
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
 * Version 2 adds the VOLTAGE ROLLS (voltageRollsFor). Version 3 adds Voltage-driven section FX. Version 4 (7 Oct
 * 2026) adds the form roll. Version 5 (9 Oct 2026) starts seven styles off the Pop Song (FORMS_BEFORE_5).
 * Version 6 (9 Oct 2026) plays the breakdown, the builds and the bar before each drop Varied — ways
 * drawn by the take (breakdown-ways.js, build-ways.js); every recipe before it plays Half Speed, the
 * snare roll and straight in. Version 7 (9 Oct 2026) brings the chords in with the second layer
 * where a style says Chords Early (Deep House, Nu-Disco, Boogie, Downtempo); every recipe before it
 * plays them in the style's old place. Version 8 (9–10 Oct 2026) plays the intro, the riser, its
 * Spot FX, the drop hit and drop 2 Varied (intro-ways.js, build-ways.js, drop-ways.js) with Tune First
 * on and a Groove's parts every four bars, and never rolls the Drums & Bass Intro; every
 * recipe before it plays the riff intro, the slow layers and the noise riser, as it did. Version 9
 * (10 Oct 2026) rolls the key lift from Surge — none, half, whole or third, never the style's own; a
 * style that says none lifts a half step one Overload take in four — and the lift's approach from Surge;
 * every recipe before it lifts the style's own way below Overload, and at Overload a third one take in three.
 * Version 10 (10 Oct 2026) plays the breakdown's backing and a Club song's shape Varied (breakdown-ways.js,
 * templates.js CLUB_SHAPES); every recipe before it plays the pad and choir, and the Club form.
 * Version 11 (10 Oct 2026) rolls the drum kit from the style's own list — the five machine kits and
 * the creative kits that suit it (tools/lib/banger/kit-rolls.js); every recipe before it rolls from
 * the five alone.
 * A NEW recipe carries 11 (maker.js); one saved
 * at 1 has the slide but no rolls, and one saved before there was any has no `expression` and reads
 * as 0, and is made EXACTLY as it always was, Go Wild included. A kept song is only its recipe,
 * made again whenever it is played, so a recipe that did not say must come out the way it did.
 * It is not RIFF_VERSION (what the grid's numbers mean) and not the generator's version (which
 * the Lab does not record).
 */
export const RECIPE_EXPRESSION = 11;
/**
 * The form each of these styles started on before version 5 (9 Oct 2026, Peter: "I'd like less pop
 * songs" — five went to Club and two to Groove). A recipe kept before then is made in its old form.
 */
export const FORMS_BEFORE_5 = Object.freeze({
  eurodance: 'pop', 'italo-disco': 'pop', merenhouse: 'pop', freestyle: 'pop', 'uk-garage': 'pop', 'nu-disco': 'pop', 'electro-funk': 'pop',
});
/** The form a style starts on in a recipe of `version`, if it is not the style's form today; else null. */
const formBefore = (styleId, version) => (version < 5 && FORMS_BEFORE_5[styleId]) || null;
/** A recipe's expression version, read safely: a whole number from 1, anything else 0 — none. */
export const expressionVersionOf = (value) => (Number.isFinite(value) && value >= 1 ? Math.floor(value) : 0);

/**
 * A recipe → the song: { bank, mix, arrangement, bpm }. Throws if the generator
 * refuses (an empty grid, an unknown style).
 */
export function makeBanger({ notes, lengths = null, mode = 'simple', style, mood, seed, wild = false, variation = null, energy = 'full', expression = 0, production = null, voltage = null, paletteSnapshot: savedPalette = null, useCurrentPalette = false, flavour: keptFlavour = null, infusion = null, songLength = null, shape = null }) {
  if (!hasNotes(notes)) throw new Error('the grid is empty');
  // LENGTH and SHAPE (LAB_LENGTHS, LAB_SHAPES): null is DEFAULT, the formula's own — the Club form over an
  // INFUSION. A picked SHAPE wins over both.
  songLength = labLength(songLength);
  // A song kept in a mood since retired is made in the mood it became.
  mood = currentMood(mood);
  // A MOOD PAIR (moods.js): its first mood makes the song, and its second takes over where it says
  // (the generator's Second Mood and Switch At).
  const pair = MOOD_PAIRS[mood] || null;
  if (pair) mood = pair.first;
  // INFUSION: FORMULA (its flavour, on its Lab Sound Set) becomes the GROOVE, and from here on `style`
  // is the infusion — the SOUND, which the generator makes — playing the flavour it was kept with.
  let beat = null;
  const sound = infusionStyle(infusion);
  if (sound && sound !== style) {
    beat = grooveRecipeId(style, keptFlavourOf(style, keptFlavour) ?? labFlavour(style, mood, seed, voltage), seed, voltage);
    style = sound;
    keptFlavour = styleFor(infusion).flavour ?? 'style';
  }
  // The take's flavour: the one its recipe kept (maker.js, so a flavour added later never moves a
  // saved song), else rolled. One that is a whole style (STYLE_FLAVOURS) is made as that style.
  let flavour = keptFlavourOf(style, keptFlavour) ?? labFlavour(style, mood, seed, voltage);
  const whole = styleFlavour(style, flavour);
  if (whole) { style = whole; flavour = 'style'; }
  const spot = spotFor(style, seed);
  const selectedVariation = ['faithful', 'some', 'more', 'wild'].includes(variation) ? variation : (wild ? 'wild' : null);
  const palette = savedPalette || (useCurrentPalette ? BANGER_PALETTE : null);
  const hasHookPalette = !!resolvePalette(palette, style, mood)?.['riff:hook']?.length;
  const styleSettings = BANGER_STYLES.find((candidate) => candidate.id === style);
  // (The flavour, above: one that is not the style's own plays instead of the Lab's Sound Set.)
  // Overload's boost is on the tempo the take plays at — its flavour's, inside its flavour's range
  // (6 Oct 2026: it was the style's own, so Romántico and Darksynth jumped 8 and Outrun slowed).
  const voltageBpmBoost = voltageSettings(voltage).bpmBoost || 0;
  // With an infusion, the tempo is the groove's.
  const tempoOf = beat ? styleFor(beat) : (styleSettings && flavourOf(styleSettings, flavour, { seed, mood })) || styleSettings;
  const voltageTempo = voltageBpmBoost && tempoOf ? {
    tempo: 'custom',
    bpm: Math.min(BANGER_LIMITS.maxBpm, tempoOf.tempoRange?.[1] ?? BANGER_LIMITS.maxBpm,
      tempoOf.bpm + voltageBpmBoost),
  } : {};
  // GO WILD is the Wild variation; with expression 1 it is also the slide setting on the lead.
  // Without `expression` (every recipe saved before it) it is the Wild variation alone, as before.
  // From 2 the Lab picks VARIATION apart from VOLTAGE, and the slide is Overload's (`wild`):
  // it is how the lead is played, not which notes it plays.
  const slides = expressionVersionOf(expression) >= 2 ? !!wild
    : selectedVariation === 'wild' && expressionVersionOf(expression) >= 1;
  const picked = labShape(shape);
  const rolls = expressionVersionOf(expression) >= 2 ? voltageRollsFor(style, mood, voltage, seed, beat, expressionVersionOf(expression), flavour, picked) : {};
  const soundSet = ownFlavour(style, flavour) ? labSoundSet(style, seed, voltage) : 'style';
  const parts = { ...rolls.parts, ...(hasHookPalette ? { riffSound: 'random' } : {}), ...(soundSet !== 'style' ? { soundSet } : {}) };
  // A pair's switch goes on the form, which must name its template (a form that names none is Club).
  // A recipe kept before its style's form moved is made in the form it had (FORMS_BEFORE_5).
  const keptForm = !beat && !picked && formBefore(style, expressionVersionOf(expression)) ? { template: formBefore(style, expressionVersionOf(expression)) } : null;
  const pairForm = pair ? { template: picked ?? rolls.form?.template ?? keptForm?.template ?? (styleSettings && styleDefaults((beat && fusionOf(styleSettings, beat)) || styleSettings).form.template),
    ...rolls.form, mood2: pair.second, moodSwitch: pair.switch } : null;
  // An INFUSION is the Club form — the build-and-drop banger, never a Pop Song (Peter, 8 Oct 2026) — unless
  // the player picked a SHAPE (10 Oct 2026).
  const clubForm = beat && !picked ? { template: 'club' } : null;
  // The breakdown, the builds and the bar before each drop (version 6): Varied, or as every recipe kept
  // before it — Half Speed, the snare roll, straight in — said outright either way, so the form is
  // always given, on the template the generator would start it on.
  const varied = expressionVersionOf(expression) >= 6;
  const breakdownHook = rolls.form?.breakdownHook ?? (varied ? 'varied' : 'half');
  // The intro, Tune First and the riser (version 8), likewise.
  const opens = expressionVersionOf(expression) >= 8;
  // The breakdown's backing and the Club shape (version 10), likewise.
  const shapes = expressionVersionOf(expression) >= 10;
  const ways = { buildWay: varied ? 'varied' : 'roll', dropIn: varied ? 'varied' : 'straight', introWay: opens ? 'varied' : 'riff', tuneFirst: opens, groovePace: opens ? 'four' : 'eight', drop2Way: opens ? 'varied' : 'more',
    breakdownBacking: shapes ? 'varied' : 'classic', clubShape: shapes ? 'varied' : 'club' };
  const ownForm = styleDefaults(styleFor(style) || styleSettings).form;
  const ownTemplate = beat ? 'club' : ownForm.template;
  // Chords Early (version 7): the style's own say; off in every recipe kept before it.
  const chordsEarly = expressionVersionOf(expression) >= 7 && !!ownForm.chordsEarly;
  const formOptions = { template: ownTemplate, ...keptForm, ...(pairForm || rolls.form), ...(picked ? { template: picked } : {}), ...clubForm, breakdownHook, ...ways, chordsEarly };
  const options = {
    // The Varied draws of its time (ways.js WAYS_ERA): the first for versions 6 and 7, the third for 8
    // and 9, the fourth from 10.
    waysEra: shapes ? 4 : opens ? 3 : 1,
    style, mood, ...(flavour ? { flavour } : {}), ...(beat ? { fusion: beat } : {}), ...lengthOptions(songLength), energy: energyOf(energy), production: normaliseTrackEffects(production), ...(selectedVariation ? { variation: selectedVariation } : {}),
    ...voltageTempo,
    ...(expressionVersionOf(expression) >= 3 ? { sectionFx: { mode: voltageSettings(voltage).sectionFx } } : {}),
    ...(slides ? { expression: { autoPortamento: true, version: BANGER_EXPRESSION_VERSION } } : {}),
    ...(Object.keys(parts).length ? { parts } : {}),
    // (and the riser: Varied from version 8, the noise riser before it — said outright, as the form's ways are)
    fx: { ...rolls.fx, riserWay: opens ? 'varied' : 'noise', dropHit: opens ? 'varied' : 'style' },
    ...(rolls.drums ? { drums: rolls.drums } : {}),
    form: formOptions,
    // (Riser FX: Varied from version 8, none before it — said outright, so Spot FX is always given)
    spot: { ...rolls.spot, ...spot, riser: opens ? 'varied' : 'none' },
  };
  const out = generateBanger({ riff: riffFromNotes(notes, hookSoundFor(style, mood, seed, voltage, flavour), mode, lengths), options, seed,
    palette });
  const lane = out.laneOf?.hook;
  const strip = lane && out.mix.lanes?.[lane];
  const configuredHookTrim = balanceForStyle(styleSettings).riffTrimDb;
  const hookTrimDb = Number.isFinite(configuredHookTrim) ? configuredHookTrim : RIFF_TRIM_DB;
  if (strip) strip.gain = Math.round(((strip.gain ?? 0) + hookTrimDb) * 10) / 10;
  // `form` is the song's sections (role, bars from–to, counted from 1): the club fires its
  // crowd moments on their changes. `laneOf` (each part's lane), `kit` and `soundsId` (whose
  // row of the sounds table the take plays) are what the club's sound swaps need
  // (club-voices.js). The mix carries THE CEILING (mixer.js CEILING): the club's faders go to +3 dB.
  return { bank: out.bank, mix: { ...out.mix, ceiling: true }, arrangement: out.arrangement, bpm: out.bank.bpm,
    trackEffects: out.trackEffects,
    paletteSnapshot: out.banger.paletteSnapshot,
    laneOf: { ...(out.laneOf || {}) }, kit: out.banger?.options?.drums?.kit || 'style',
    // A fusion's sounds are its two rows put together (sound-rules.js soundsRow reads the name).
    soundsId: out.banger?.fusion ? out.banger.style : soundsIdFor(style, seed, voltage, mood, flavour),
    form: (out.form || []).map((f) => ({ role: f.role, type: f.type, from: f.from, to: f.to })) };
}
