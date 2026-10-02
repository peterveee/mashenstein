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
import { KRAFTWERK } from './kraftwerk.js';
import { SYNTHWAVE } from './synthwave.js';

export const BANGER_STYLES = Object.freeze([BIG_ROOM, TRANCE, FUTURE_BASS, EUROBEAT, CHIPSTEP, KRAFTWERK, SYNTHWAVE]);
const BY_ID = new Map(BANGER_STYLES.map((s) => [s.id, s]));

/** The recipe called `id`, or null. */
export const styleFor = (id) => (id == null ? null : BY_ID.get(id) || null);
