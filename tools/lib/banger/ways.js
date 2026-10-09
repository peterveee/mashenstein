// WAYS — a table of ways to play one moment of a banger (the breakdown's hook, a build, the bar
// before a drop), and Varied's draw from it. Each table is a list of { id, label, note, varied?,
// weight?, part? } (breakdown-ways.js, build-ways.js). Browser-safe.

/**
 * Varied's way, from `ways`. Each way in the draw gets its own number off `rng` (an src/engine/rng.js
 * Rng) and the lowest −ln(u)/weight wins: a fair draw by weight, and one where a way joining the draw
 * takes only the takes it wins — every other take keeps the way it had. `soundSet`: no way that adds
 * a part (the phone's budget). `not`: a way to pass over (the one the moment before had), the
 * runner-up playing instead.
 */
export function drawWay(ways, rng, { soundSet = false, not = null } = {}) {
  const ranked = [];
  for (const w of ways) {
    if (!w.varied || (soundSet && w.part)) continue;
    ranked.push({ id: w.id, score: -Math.log(1 - rng.stream(w.id).next()) / (w.weight ?? 1) });
  }
  ranked.sort((a, b) => a.score - b.score);
  return (ranked.find((r) => r.id !== not) || ranked[0])?.id ?? null;
}

/** The ids Varied draws from in `ways`. */
export const variedIds = (ways) => Object.freeze(ways.filter((w) => w.varied).map((w) => w.id));

/** A table's dialog choices: Varied first (naming what it draws from), then every way. */
export const wayOptions = (ways) => [['varied', 'Varied', `A different way each time — ${ways.filter((w) => w.varied).map((w) => w.label).join(', ')}`],
  ...ways.map((w) => [w.id, w.label, w.note])];
