// Track-id resolution: the one place that decides what "megamix" or "shop" means.
//
// This was tools/lib/tracks.js, where only the offline render tools could see it.
// The mixing desk needs the same registry at runtime — a saved mix is keyed by
// track id, and the running game only ever holds a bank object — so it lives here
// now and tools/lib/tracks.js re-exports it.
//
// Keeping one registry is what lets a mix be looked up by bank identity instead of
// stamping a `mixId` onto all 34 bank literals, which would be one more thing to
// keep in step by hand.
import { CABINET_BY_ID, HUB_THEME, TITLE_THEME, FINALE_THEME } from './cabinets.js';
import { SHOP_THEME_BY_ID, COUNTER_DANCE_MIX_THEME } from './shop-themes.js';
import { MEGAMIX_THEME } from './megamix.js';

// Friendly aliases for the named themes plus the in-game shop theme. "shop"
// resolves to COUNTER_DANCE_MIX_THEME — the approved bank both counters actually
// play — rather than one of the parked audition candidates.
const ALIASES = {
  hub: { bank: HUB_THEME, slug: 'food-court', title: 'THE FOOD COURT' },
  title: { bank: TITLE_THEME, slug: 'title-theme', title: 'EMPTY ARCADE' },
  finale: { bank: FINALE_THEME, slug: 'finale-theme', title: 'ONE MORE SWITCH' },
  megamix: { bank: MEGAMIX_THEME, slug: 'megamix', title: 'MONSTER MEGAMIX' },
  shop: { bank: COUNTER_DANCE_MIX_THEME, slug: 'shop-theme', title: 'CHECKOUT PROMENADE' },
};

// Songs registered while the process is running: everything in src/data/imported/,
// plus a .mid that has only just been converted and is not in that folder's index
// yet. The desk and the node tools import src/data/imported/index.js, which fills
// this in; the game never does, so no scratch import can reach the build.
const RUNTIME = new Map();

/**
 * Make a bank resolvable by id for the rest of this process.
 *
 * Registering the same id again replaces it, which is what re-importing a .mid over
 * itself means. Registering an id a hand-written song already owns does nothing —
 * the built-in registries below always win, so an import cannot shadow the game.
 */
export function registerTrack({ id, bank, title, slug }) {
  if (!id || !bank) return null;
  if (ALIASES[id] || SHOP_THEME_BY_ID[id] || CABINET_BY_ID[id]?.music) return null;
  RUNTIME.set(id, { bank, title: title || id.toUpperCase(), slug: slug || id });
  // Never over the id a built-in already gave this bank. The moment an imported bank
  // is put IN the game — `music: COOL_SONG` on a cabinet — the same object is both
  // `cool-song` and `crypt`, and the game only knows it as `crypt`. If the desk
  // looked it up as `cool-song` it would mix one song and ship another.
  if (!ID_BY_BANK.has(bank)) ID_BY_BANK.set(bank, id);
  return resolveTrack(id);
}

export function resolveTrack(trackId) {
  if (ALIASES[trackId]) return { id: trackId, ...ALIASES[trackId] };
  if (SHOP_THEME_BY_ID[trackId]) {
    return { id: trackId, bank: SHOP_THEME_BY_ID[trackId], slug: trackId, title: trackId.toUpperCase() };
  }
  const cabinet = CABINET_BY_ID[trackId];
  if (cabinet && cabinet.music) {
    return { id: trackId, bank: cabinet.music, slug: `${trackId}-panic`, title: (cabinet.name || trackId).toUpperCase() };
  }
  const imported = RUNTIME.get(trackId);
  if (imported) return { id: trackId, ...imported };
  return null;
}

// Every track id the resolver accepts, so a picker never has to guess or duplicate
// the rules. Aliases first — they are the real in-game cues — then cabinets, then
// the parked shop candidates.
// `group` is for a picker: these are four different kinds of thing — the cues the
// game plays, the cabinet songs, the parked shop candidates nobody ships, and
// whatever has been imported from a .mid — and a flat list of thirty-odd makes you
// read all of them to find the one you want. The registry decides, because the
// registry is what knows.
export function listTracks() {
  const groups = [
    ['theme', Object.keys(ALIASES)],
    ['cabinet', Object.keys(CABINET_BY_ID).filter((id) => CABINET_BY_ID[id].music)],
    ['audition', Object.keys(SHOP_THEME_BY_ID)],
    ['imported', [...RUNTIME.keys()]],
  ];
  const seen = new Set();
  const out = [];
  for (const [group, ids] of groups) {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const { bank, ...rest } = resolveTrack(id);
      out.push({ ...rest, group });
    }
  }
  return out;
}

// bank -> id, built once from the built-in registries and added to by
// registerTrack(). The game calls Audio.setBank(cabinet.music) and never mentions an
// id, so this is how a running song finds its saved mix.
const ID_BY_BANK = new Map();
for (const { id } of listTracks()) {
  const t = resolveTrack(id);
  if (t && t.bank && !ID_BY_BANK.has(t.bank)) ID_BY_BANK.set(t.bank, id);
}

export function trackIdOf(bank) {
  return bank ? ID_BY_BANK.get(bank) || null : null;
}
