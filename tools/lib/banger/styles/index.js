// MAKE A BANGER — the style recipes. One file per style; a new style is a new file here
// and one line in this list. A recipe is data only: what it must hold is everything
// big-room.js holds (progressions, breakdown, moods, centres, drums, rhythms, master,
// strips, pump, exciter, labels). The section builders are shared. Its SOUNDS are not in
// the recipe: a new style also gets an entry in tools/lib/banger/sounds.js, which the
// Banger Sounds page edits.
import { BIG_ROOM } from './big-room.js';
import { TRANCE } from './trance.js';
import { FUTURE_BASS } from './future-bass.js';
import { EUROBEAT } from './eurobeat.js';
import { CHIPSTEP } from './chipstep.js';
import { CHIPSTEP_LITE } from './chipstep-lite.js';
import { CHIPSTEP_8BIT } from './chipstep-8bit.js';
import { SYNTHWAVE, SYNTHWAVE_FLAVOURS } from './synthwave.js';
import { SYNTHWAVE_LITE } from './synthwave-lite.js';
import { SHIBUYA } from './shibuya.js';
import { DNB, DNB_FLAVOURS } from './dnb.js';
import { ELECTRO } from './electro.js';
import { MEGADRIVE } from './megadrive.js';
import { DEEP_HOUSE } from './deep-house.js';
import { NU_DISCO } from './nu-disco.js';
import { DOWNTEMPO } from './downtempo.js';
import { ELECTRO_FUNK } from './electro-funk.js';
import { FRENCH_HOUSE } from './french-house.js';
import { EURODANCE } from './eurodance.js';
import { ITALO_DISCO } from './italo-disco.js';
import { REGGAETON, REGGAETON_FLAVOURS } from './reggaeton.js';
import { MOOMBAHTON } from './moombahton.js';
import { MERENHOUSE } from './merenhouse.js';
import { AFRO_HOUSE, AFRO_HOUSE_FLAVOURS } from './afro-house.js';
import { withSharedMoods } from '../moods.js';
import { makeFlavour, seedRoll } from './flavours.js';
import { makeFusion, fusionIds } from './fusion.js';

// Every style plays the shared moods (moods.js) unless it has its own take on one.
export const BANGER_STYLES = Object.freeze([BIG_ROOM, TRANCE, FUTURE_BASS, EUROBEAT, CHIPSTEP, SYNTHWAVE, SHIBUYA, DNB, ELECTRO, MEGADRIVE, DEEP_HOUSE, NU_DISCO, DOWNTEMPO,
  EURODANCE, ITALO_DISCO, ELECTRO_FUNK, FRENCH_HOUSE, REGGAETON, MOOMBAHTON, MERENHOUSE, AFRO_HOUSE].map(withSharedMoods));

// SOUND SETS (5 Oct 2026): a style's music on another set of sounds — Light (the cheap synths
// only, for a phone) and 8-Bit (chip blips). Each is a recipe with `base` (the style it
// belongs to) and `soundSet` (the option that picks it), and its own entry in sounds.js. Not
// in the style list: the Sound Set option picks one (soundSetOf, below).
export const BANGER_SOUND_SETS = Object.freeze([CHIPSTEP_LITE, CHIPSTEP_8BIT, SYNTHWAVE_LITE].map(withSharedMoods));
// FLAVOURS (6 Oct 2026, flavours.js): a style's other arrangements — its drums, rhythms, sounds and
// how long its chords are held. Each is a recipe with `base` and `flavour`, and its own entry in
// sounds.js. Not in the style list: a take turns out to be one (the `flavour` option, flavourOf).
export const BANGER_FLAVOURS = Object.freeze([
  ...AFRO_HOUSE_FLAVOURS.map((def) => makeFlavour(withSharedMoods(AFRO_HOUSE), def)),
  ...REGGAETON_FLAVOURS.map((def) => makeFlavour(withSharedMoods(REGGAETON), def)),
  ...SYNTHWAVE_FLAVOURS.map((def) => makeFlavour(withSharedMoods(SYNTHWAVE), def)),
  ...DNB_FLAVOURS.map((def) => makeFlavour(withSharedMoods(DNB), def)),
]);
const BY_ID = new Map([...BANGER_STYLES, ...BANGER_SOUND_SETS, ...BANGER_FLAVOURS].map((s) => [s.id, s]));

// FUSIONS (7 Oct 2026, fusion.js): one recipe's music over another's beat. Not listed — there is
// one for every pair — but made on asking, by the name a take records, and kept once made.
const FUSIONS = new Map();
/** The fusion of `music` over `beat` (recipes, or their ids), or null — never a style over itself. */
export function fusionOf(music, beat) {
  const m = typeof music === 'string' ? BY_ID.get(music) : music;
  const b = typeof beat === 'string' ? BY_ID.get(beat) : beat;
  if (!m || !b || m.fusion || b.fusion || (m.base || m.id) === (b.base || b.id)) return null;
  const id = `${m.id}+${b.id}`;
  if (!FUSIONS.has(id)) FUSIONS.set(id, makeFusion(m, b));
  return FUSIONS.get(id);
}

/** The recipe called `id` — a style, a sound set, a flavour or a fusion — or null. */
export const styleFor = (id) => {
  if (id == null) return null;
  const known = BY_ID.get(id);
  if (known) return known;
  const pair = fusionIds(id);
  return pair ? fusionOf(pair.music, pair.beat) : null;
};

// A sound kept from a seed is named for the style too — `Ride · Future Bass` — and this takes
// that off again, but nothing else: a kit sound's instrument stays, so `Havana Patio · Clave`
// keeps its `Clave`. A flavour's label has a `·` of its own (`Reggaeton · Romántico`), so the
// longest match wins.
const STYLE_LABELS = [...BY_ID.values()].map((s) => s.label).filter(Boolean).sort((a, b) => b.length - a.length);
/** A preset's label without the style it was kept for: `Ride · Future Bass` → `Ride`. */
export const withoutStyleSuffix = (label) => {
  const text = String(label);
  for (const s of STYLE_LABELS) {
    const at = text.lastIndexOf(` · ${s}`);
    const rest = at < 0 ? null : text.slice(at + s.length + 3);
    if (at > 0 && (rest === '' || (rest.startsWith(' ') && !rest.includes('·')))) return text.slice(0, at);
  }
  return text;
};

/** The sound set `set` of a style ('light', '8bit'), or null — 'style' and unknown sets are null. */
export const soundSetOf = (style, set) => BANGER_SOUND_SETS.find((x) => x.base === style?.id && x.soundSet === set) || null;
/** The sound sets a style has, as ids — what the Sound Set option can pick for it. */
export const soundSetsFor = (styleId) => BANGER_SOUND_SETS.filter((x) => x.base === styleId).map((x) => x.soundSet);

/** A style's flavours, its own first: [{ id, label, note }] — empty for a style with none. */
export const flavoursFor = (styleId) => {
  const style = styleFor(styleId);
  return style?.flavours?.length ? style.flavours : [];
};
/** The flavour a style plays in `mood` (its `flavourByMood`), else its own — an id. */
export const moodFlavour = (style, mood) => style?.flavourByMood?.[mood] || style?.flavours?.[0]?.id || null;
/**
 * The recipe a take of `style` is made from for the `flavour` option: 'mood' (the flavour the
 * mood plays — the default; Peter, 6 Oct 2026: "make it dependant on the mood"), a flavour's id,
 * 'random' (drawn from the take's `seed`), or null / 'style' (the style's own). Null wherever
 * the answer is the style itself.
 */
export function flavourOf(style, flavour, { seed = 1, mood = null } = {}) {
  // (A flavour asked for by its own id — the Banger Sounds page's audition — is played as itself.)
  if (!flavour || flavour === 'style' || !style?.flavours?.length || style.base) return null;
  let id = flavour;
  if (flavour === 'mood') id = moodFlavour(style, mood);
  else if (flavour === 'random') id = style.flavours[Math.floor(seedRoll(seed, 0x7f4a7c15) * style.flavours.length)].id;
  return BANGER_FLAVOURS.find((x) => x.base === style.id && x.flavour === id) || null;
}
