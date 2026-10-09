// BREAKDOWN HOOK — every way a breakdown can play the hook, in one table (9 Oct 2026). Peter: the
// hook at half speed in every breakdown was "a bit predictable", and more ways should be easy to add.
//
// The table is what the dialog's Breakdown Hook list and the Form row's Plays list show. A way is
// played by its line in sections.js (BREAKDOWN_LINES) and, if it has one, an effect over the part
// in fx.js (BREAKDOWN_FX). `varied: true` puts it in Varied's draw; `weight` (1 if not given) is how
// often it comes up there against the others. `part` is a part the way adds to the song: under a
// Sound Set (the phone's budget) Varied never draws a way that adds one.
//
// ADDING A WAY: an entry here, its line in BREAKDOWN_LINES, an effect in BREAKDOWN_FX if it has
// one. It can be picked by name straight away. Giving it `varied: true` re-draws only the takes it
// wins (variedWay) — but a kept Lab song is made again from its recipe every time it plays, so a
// change to the draw wants a new recipe expression (src/game/banger/make.js) to keep those as they were.
export const BREAKDOWN_WAYS = Object.freeze([
  { id: 'half', label: 'Half Speed', note: 'Every note twice as long — the classic', varied: true },
  { id: 'tease', label: 'Tease', note: 'Only the hook\'s opening, every other bar, with echoes filling the gaps', varied: true },
  { id: 'late', label: 'Held Back', note: 'The pad and the choir alone; the hook comes in for the last two bars', varied: true },
  { id: 'outline', label: 'Outline', note: 'The hook as long notes — the one on each strong beat', varied: true },
  { id: 'piano', label: 'Piano', note: 'The hook as written, on the style\'s piano', varied: true, part: 'piano' },
  { id: 'tune', label: 'New Tune', note: 'A new line over the breakdown\'s chords, grown from the end of the hook', varied: true },
  { id: 'arp', label: 'Arp', note: 'The hook\'s notes broken into running sixteenths', varied: true },
  { id: 'answer', label: 'Call and Answer', note: 'The hook for a bar, the bell answering it in the next', varied: true, part: 'bell' },
  { id: 'muffled', label: 'Muffled', note: 'The hook as written, starting dull and opening up across the breakdown', varied: true },
  { id: 'written', label: 'As Written', note: 'The hook at its own speed, over the pad' },
  { id: 'none', label: 'No Hook', note: 'The pad, the choir and the pedal alone' },
]);
export const BREAKDOWN_WAY = Object.freeze(Object.fromEntries(BREAKDOWN_WAYS.map((w) => [w.id, w])));
/** The ways Varied draws from. */
export const VARIED_WAYS = Object.freeze(BREAKDOWN_WAYS.filter((w) => w.varied).map((w) => w.id));

/**
 * Varied's way for a take. Each way in the draw gets its own number off the take's stream (`rng`, an
 * src/engine/rng.js Rng) and the lowest −ln(u)/weight wins: a fair draw by weight, and one where a way
 * joining the draw takes only the takes it wins — every other take keeps the way it had. `soundSet`:
 * the take is on a Sound Set, so no way that adds a part.
 */
export function variedWay(rng, { soundSet = false } = {}) {
  let best = null;
  for (const w of BREAKDOWN_WAYS) {
    if (!w.varied || (soundSet && w.part)) continue;
    const score = -Math.log(1 - rng.stream(w.id).next()) / (w.weight ?? 1);
    if (!best || score < best.score) best = { id: w.id, score };
  }
  return best ? best.id : 'half';
}
