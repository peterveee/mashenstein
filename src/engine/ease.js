// THE CURVES, in one place.
//
// clamp01 and smooth had been written out by hand in five separate modules —
// cabinet-dive, credits-handoff, door-walk, animals and visualisers — and
// menus.js was importing `clamp, smooth` FROM the visualiser module, which is a
// menu screen reaching into the spectrum analyser for arithmetic. None of that
// was a decision; it is what happens when a two-line helper is cheaper to retype
// than to find. They are here so the next set piece has somewhere to look.
//
// Every one of these clamps its input, so a caller may hand over a raw
// (t - start) / span without guarding the ends itself.

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, u) => a + (b - a) * u;

// Zero velocity at both ends. The default for anything that starts and stops.
export const smooth = (u) => { const x = clamp01(u); return x * x * (3 - 2 * x); };

// Zero velocity AND zero acceleration at both ends, so a camera push can begin,
// pass through the middle and stop without a seam anywhere in it. Worth the
// extra multiply on any move long enough to watch.
export const smoother = (u) => { const x = clamp01(u); return x * x * x * (x * (x * 6 - 15) + 10); };

// Accelerating away / arriving slowly. easeIn is the one that reads as weight:
// a shot that falls with a hand wants to be still at the top and fastest at the
// bottom, which is easeIn and not smooth.
export const easeIn = (u) => clamp01(u) ** 2;
export const easeOut = (u) => 1 - (1 - clamp01(u)) ** 2;

// Named curves, for data that has to say which one it wants in a string —
// the intro's shot table is authored as JSON-shaped literals and cannot carry a
// function. Anything reading this map should fall back to `smooth` rather than
// throw on a typo: a wrong curve is a slightly wrong move, a missing one is a
// black screen.
export const EASES = { linear: clamp01, smooth, smoother, easeIn, easeOut };
