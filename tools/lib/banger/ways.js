// WAYS — a table of ways to play one moment of a banger (the breakdown's hook, a build, the bar
// before a drop), and Varied's draw from it. Each table is a list of { id, label, note, varied?,
// weight?, part? } (breakdown-ways.js, build-ways.js). Browser-safe.

/**
 * WAYS ERA — which generation of the Varied draws a request makes (options.js `waysEra`). A way that
 * joined a draw later says `since`; a request of an earlier era never draws it, so a kept Lab song —
 * made again from its recipe every time it plays — keeps the way it had (src/game/banger/make.js).
 *   1  the first draws (9 Oct 2026)
 *   2  Gated Hook, Octave Echo, Low and Muffled join the breakdown's (10 Oct 2026)
 *   3  the style and mood rules (`notFor`) shape the breakdown's, the builds' and the drop-ins' too
 *   4  Breakdown Backing and Club Shape join (10 Oct 2026)
 */
export const WAYS_ERA = 4;

/**
 * STYLE FAMILIES for the rules (`notFor` / `onlyFor` on a way — Peter, 10 Oct 2026: "make sure that we
 * are excluding anything that is inappropriate for any particular styles"). By style id; '8bit' is the
 * 8-Bit Sound Set. A style in no family — Big Room, Trance, Future Bass, Eurodance, Rave, Electro,
 * Drum & Bass, Moombahton — takes everything but what names it.
 */
export const FAMILY = Object.freeze({
  chill: ['deep-house', 'downtempo', 'nu-disco', 'afro-house', 'shibuya'],
  disco: ['nu-disco', 'electro-funk', 'italo-disco', 'french-house', 'freestyle'],
  retro: ['synthwave', 'eurobeat', 'italo-disco', 'freestyle'],
  latin: ['reggaeton', 'merenhouse'],
  underground: ['acid-house', 'techno', 'uk-garage'],
  chip: ['chipstep', 'megadrive', '8bit'],
});
/** The moods too soft for the hard-edged ways. */
export const CHILL_MOODS = Object.freeze(['dreamy', 'lofi', 'lounge', 'lament', 'soulful']);
/** A `notFor` naming these families (and, with `moods`, the chill moods), plus any `styles`. */
export const notFor = (families, { moods = false, styles = [] } = {}) => Object.freeze({
  styles: [...new Set([...families.flatMap((f) => FAMILY[f]), ...styles])], ...(moods ? { moods: CHILL_MOODS } : {}),
});

/**
 * Varied's way, from `ways`. Each way in the draw gets its own number off `rng` (an src/engine/rng.js
 * Rng) and the lowest −ln(u)/weight wins: a fair draw by weight, and one where a way joining the draw
 * takes only the takes it wins — every other take keeps the way it had. `soundSet`: no way that adds
 * a part (the phone's budget). `not`: a way to pass over (the one the moment before had), the
 * runner-up playing instead. `exclude`: ways that never go with what is around them (build-ways.js).
 * `era`: the request's WAYS ERA.
 */
export function drawWay(ways, rng, { soundSet = false, not = null, exclude = [], era = WAYS_ERA } = {}) {
  const ranked = [];
  for (const w of ways) {
    if (!w.varied || (soundSet && w.part) || exclude.includes(w.id) || (w.since ?? 1) > era) continue;
    ranked.push({ id: w.id, score: -Math.log(1 - rng.stream(w.id).next()) / (w.weight ?? 1) });
  }
  ranked.sort((a, b) => a.score - b.score);
  return (ranked.find((r) => r.id !== not) || ranked[0])?.id ?? null;
}

/**
 * The ways in `ways` that are not for this song: `notFor` its style (the requested one, by id) or its
 * Sound Set, or its mood — or `onlyFor` other styles. Varied passes over them; picked by name they play as asked.
 */
export const unsuited = (ways, { style = null, mood = null, soundSet = null } = {}) => ways.filter((w) => (w.notFor
  && ((w.notFor.styles || []).some((s) => s === style || s === soundSet) || (w.notFor.moods || []).includes(mood)))
  || (w.onlyFor?.styles && !w.onlyFor.styles.includes(style))).map((w) => w.id);

/** The ids Varied draws from in `ways`. */
export const variedIds = (ways) => Object.freeze(ways.filter((w) => w.varied).map((w) => w.id));

/** A table's dialog choices: Varied first (naming what it draws from), then every way. */
export const wayOptions = (ways) => [['varied', 'Varied', `A different way each time — ${ways.filter((w) => w.varied).map((w) => w.label).join(', ')}`],
  ...ways.map((w) => [w.id, w.label, w.note])];
