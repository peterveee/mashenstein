// MAKE A BANGER — FLAVOURS. 6 Oct 2026.
//
// A style's other arrangements of itself. Peter, on Afro House's three sketches: one style,
// not three — "i don't think we should be afraid to embrace this sort of thing so we get more
// interesting combinations perhaps unexpectedly — i want the user to potentially just reroll and
// get a nice surprise". So a flavour is not a style in the list: it is what a take of the style
// may turn out to be. The Lab rolls it with the voltage (src/game/banger/make.js labFlavour);
// the desk can ask for one by name, or Random (the take's seed draws it).
//
// A flavour is a recipe with `base` (its style) and `flavour` (its id), built from the style
// with the shared moods already in (withSharedMoods) and its own `recipe` laid over: drums,
// rhythms, strips, labels, centres — anything a recipe holds. Two things more:
//   · `reshape` rewrites every eight-bar progression, the shared moods' and the modes' too —
//     a chord held for two bars, or one chord nearly all the way — so the mood still chooses
//     the chords and the flavour chooses how long each is held
//   · `remapParts` (as a Sound Set's) moves a part's setting, e.g. Chords = Pad to Piano Stabs;
//     `remap` moves any switch in any group, off as well as on — { fx: { riser: { true: false } } }
// Its sounds are its own row of sounds.js, `<style>-<flavour>`, edited on the Banger Sounds page.
// Browser-safe: no `node:*` imports.

const mapWalk = (walk, reshape) => ({ major: reshape(walk.major), minor: reshape(walk.minor) });

/** The flavour `def` of the recipe `base` (with its shared moods in), as a recipe of its own. */
export function makeFlavour(base, def) {
  const reshape = def.reshape || ((p) => p);
  // A flavour's OWN progressions, mode harmony and moods win over the base's, mood by mood
  // and mode by mode; whatever it does not name is the base's. Before 8 Oct 2026 the base's
  // were rebuilt over the top of the recipe, so a flavour that brought its own chord walks
  // (Italo Disco moving under Eurobeat, docs/LAB_STYLES_PLAN.md) lost them without a word.
  // No flavour carried any until then, so every existing one is made exactly as before.
  const own = def.recipe || {};
  const progressions = Object.fromEntries(Object.entries({ ...base.progressions, ...own.progressions })
    .map(([id, w]) => [id, mapWalk(w, reshape)]));
  const modeHarmony = Object.fromEntries(Object.entries({ ...base.modeHarmony, ...own.modeHarmony }).map(([mode, walks]) => [mode,
    Object.fromEntries(Object.entries(walks).map(([k, h]) => [k, { ...h, progression: reshape(h.progression) }]))]));
  // `recolour` rewrites every mood's chord colours (and anything else a mood holds) the same way.
  const ownMoods = own.moods ? { ...base.moods, ...own.moods } : base.moods;
  const moods = def.recolour ? Object.fromEntries(Object.entries(ownMoods || {}).map(([id, m]) => [id, def.recolour(m)])) : ownMoods;
  return Object.freeze({
    ...base,
    ...(def.recipe || {}),
    progressions,
    modeHarmony,
    moods,
    ...(def.remapParts ? { remapParts: def.remapParts } : {}),
    ...(def.remap ? { remap: def.remap } : {}),
    id: `${base.id}-${def.id}`,
    label: `${base.label} · ${def.label}`,
    base: base.id,
    flavour: def.id,
  });
}

/** Each chord of an eight-bar walk held for two bars: bars 1, 3, 5 and 7's. */
export const twoBarChords = (prog) => prog.map((_, i) => prog[i - (i % 2)]);
/** One chord nearly all the way: the first for six bars, then the walk's own last two. */
export const holdTheOne = (prog) => prog.map((bar, i) => (i < 6 ? prog[0] : bar));
/** The first chord for half the walk, then its bars 5 to 8 as written. */
export const holdFirstHalf = (prog) => prog.map((bar, i) => (i < 4 ? prog[0] : bar));

/**
 * A 32-bit hash of a take's seed and a salt — the same take always draws the same flavour,
 * without moving any of the generator's own random streams.
 */
export function seedRoll(seed, salt) {
  let h = (Number(seed) >>> 0) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}
