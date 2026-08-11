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
export function registerTrack({
  id, bank, title, slug, group = 'imported', writable = false, alternateOf = null,
}) {
  if (!id || !bank) return null;
  if (ALIASES[id] || SHOP_THEME_BY_ID[id] || CABINET_BY_ID[id]?.music) return null;
  RUNTIME.set(id, {
    bank,
    title: title || id.toUpperCase(),
    slug: slug || id,
    group,
    writable: !!writable,
    // The song this one is an alternate OF: a copy of a game song's music, parked
    // under its own name until somebody decides it is the version to ship. Carried
    // through the registry because it is what the desk's "Save over …" aims at, and
    // a parent guessed from a title is a parent that writes over the wrong song.
    ...(alternateOf ? { alternateOf } : {}),
  });
  // Never over the id a built-in already gave this bank. The moment an imported bank
  // is put IN the game — `music: COOL_SONG` on a cabinet — the same object is both
  // `cool-song` and `crypt`, and the game only knows it as `crypt`. If the desk
  // looked it up as `cool-song` it would mix one song and ship another.
  if (!ID_BY_BANK.has(bank)) ID_BY_BANK.set(bank, id);
  return resolveTrack(id);
}

/** Remove a runtime imported/scratch track without touching built-in game tracks. */
export function unregisterTrack(id) {
  if (!id || ALIASES[id] || SHOP_THEME_BY_ID[id] || CABINET_BY_ID[id]?.music) return false;
  const current = RUNTIME.get(id);
  if (!current) return false;
  RUNTIME.delete(id);
  if (ID_BY_BANK.get(current.bank) === id) ID_BY_BANK.delete(current.bank);
  return true;
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
    ['imported', [...RUNTIME.entries()].filter(([, t]) => (t.group || 'imported') === 'imported').map(([id]) => id)],
    ['scratch', [...RUNTIME.entries()].filter(([, t]) => t.group === 'scratch').map(([id]) => id)],
    // A game song's music with somebody else's mix and arrangement on it, saved under
    // its own name rather than over the song it came from. Its own heading because it
    // is neither scratch material nor a shipped song: it is a candidate, and the whole
    // point of it is that nothing has been decided yet.
    ['alternate', [...RUNTIME.entries()].filter(([, t]) => t.group === 'alternate').map(([id]) => id)],
    // A snapshot of some song exactly as the desk had it — Save As, and no claim of any
    // kind about what it is for. Distinct from an alternate precisely because it makes
    // no claim: an alternate names a parent and can be promoted over it, a copy names
    // nothing and can only ever be itself. Its own heading so that a shelf of a dozen
    // snapshots of one afternoon does not read as a shelf of candidates.
    ['copy', [...RUNTIME.entries()].filter(([, t]) => t.group === 'copy').map(([id]) => id)],
    // Scratch songs in every mechanical sense — same file shape, same writable desk
    // section — but they answer a question the others do not: what does a STYLE PACK
    // sound like. One per pack, written by tools/style-auditions.js at a fixed seed,
    // and the thing tools/adopt-style-voices.js reads a chosen sound back out of.
    // Their own group because a dozen of them landing in Scratch songs buries whatever
    // you were actually working on, and they are development scaffolding rather than
    // material — which is also why the desk lists them last.
    ['styleAudition', [...RUNTIME.entries()].filter(([, t]) => t.group === 'styleAudition').map(([id]) => id)],
  ];
  const seen = new Set();
  const out = [];
  for (const [group, ids] of groups) {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const { bank, ...rest } = resolveTrack(id);
      out.push({ ...rest, group: rest.group || group, writable: rest.writable !== false });
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
