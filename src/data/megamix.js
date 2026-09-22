// The jukebox listing, and the Megamix's place at the end of it.
//
// The Megamix used to be COMPUTED here: every jukebox melody lifted from its
// cabinet, key-matched and DJ-mixed over one 120 BPM house kit, rebuilt on
// every load. It was frozen into src/data/songs/megamix.js (see
// tools/migrate-songs.js) and is now a song file like any other — the mixer
// owns it, `npm run mixer` rewrites it, and it no longer changes underneath
// you when a cabinet's melody is edited.
//
// The recipe that built it is gone with the derivation (22 Sep 2026). It had
// no reader left but a test asserting that a frozen file still held its own
// literals, and it pinned a hardcoded list of nine cabinet ids that crashed
// the game on load the moment a cabinet was removed. `git log` has it if the
// mash-up is ever re-derived.
import { CABINETS, CABINET_BY_ID, HUB_THEME, TITLE_THEME, FINALE_THEME } from './cabinets.js';
import { COUNTER_DANCE_MIX_THEME } from './shop-themes.js';
import { SONGS } from './songs/index.js';

// The three themes that open the listing and the one that closes it; the
// cabinet block sits between them.
const OPENING_TRACKS = [
  { name: 'EMPTY ARCADE (TITLE THEME)', bank: TITLE_THEME },
  { name: 'THE FOOD COURT (HUB THEME)', bank: HUB_THEME },
  { name: 'CHECKOUT PROMENADE (SHOPPING)', bank: COUNTER_DANCE_MIX_THEME },
];
const CLOSING_TRACK = { name: 'ONE MORE SWITCH (FINALE THEME)', bank: FINALE_THEME };
const cabinetTracks = (ids) => ids
  .map((id) => CABINET_BY_ID[id])
  .filter(Boolean)
  .map((cabinet) => ({ name: cabinet.name, bank: cabinet.music }));

// The jukebox is a catalogue, not a mix: it walks the cabinets in the order you
// meet them along the food court wall, so row N is the Nth machine you pass.
export const JUKEBOX_TRACKS = [
  ...OPENING_TRACKS,
  ...cabinetTracks(CABINETS.map((cabinet) => cabinet.id)),
  CLOSING_TRACK,
];

// What plays: the frozen song, one file like all the others.
export const MEGAMIX_THEME = SONGS.megamix.bank;
