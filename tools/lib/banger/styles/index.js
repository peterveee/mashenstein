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
import { SYNTHWAVE } from './synthwave.js';
import { SYNTHWAVE_LITE } from './synthwave-lite.js';
import { SHIBUYA } from './shibuya.js';
import { DNB } from './dnb.js';
import { ELECTRO } from './electro.js';
import { MEGADRIVE } from './megadrive.js';
import { DEEP_HOUSE } from './deep-house.js';
import { NU_DISCO } from './nu-disco.js';
import { DOWNTEMPO } from './downtempo.js';
import { ELECTRO_FUNK } from './electro-funk.js';
import { FRENCH_HOUSE } from './french-house.js';
import { EURODANCE } from './eurodance.js';
import { ITALO_DISCO } from './italo-disco.js';
import { REGGAETON } from './reggaeton.js';
import { withSharedMoods } from '../moods.js';

// Every style plays the shared moods (moods.js) unless it has its own take on one.
export const BANGER_STYLES = Object.freeze([BIG_ROOM, TRANCE, FUTURE_BASS, EUROBEAT, CHIPSTEP, SYNTHWAVE, SHIBUYA, DNB, ELECTRO, MEGADRIVE, DEEP_HOUSE, NU_DISCO, DOWNTEMPO,
  EURODANCE, ITALO_DISCO, ELECTRO_FUNK, FRENCH_HOUSE, REGGAETON].map(withSharedMoods));

// SOUND SETS (5 Oct 2026): a style's music on another set of sounds — Light (the cheap synths
// only, for a phone) and 8-Bit (chip blips). Each is a recipe with `base` (the style it
// belongs to) and `soundSet` (the option that picks it), and its own entry in sounds.js. Not
// in the style list: the Sound Set option picks one (soundSetOf, below).
export const BANGER_SOUND_SETS = Object.freeze([CHIPSTEP_LITE, CHIPSTEP_8BIT, SYNTHWAVE_LITE].map(withSharedMoods));
const BY_ID = new Map([...BANGER_STYLES, ...BANGER_SOUND_SETS].map((s) => [s.id, s]));

/** The recipe called `id` — a style or a sound set — or null. */
export const styleFor = (id) => (id == null ? null : BY_ID.get(id) || null);

/** The sound set `set` of a style ('light', '8bit'), or null — 'style' and unknown sets are null. */
export const soundSetOf = (style, set) => BANGER_SOUND_SETS.find((x) => x.base === style?.id && x.soundSet === set) || null;
/** The sound sets a style has, as ids — what the Sound Set option can pick for it. */
export const soundSetsFor = (styleId) => BANGER_SOUND_SETS.filter((x) => x.base === styleId).map((x) => x.soundSet);
