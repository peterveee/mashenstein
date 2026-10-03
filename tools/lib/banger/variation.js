// MAKE A BANGER — what may be done to the hook, and the eight-bar plans that use it.
//
// THERE IS NO INVERSION HERE, and there must never be one: no mirror, no retrograde, no
// upside-down answer. Peter turned that down for the cabinet remixes ("keep his melody
// as it is") and the banger is held to the same rule — vary the SETTING, and where the
// variation level allows, the tune's position in the scale or its phrase ends. Every
// operation below keeps the hook's own rhythm and contour.
//
//   Faithful  as written · octaves (as layers) · half speed · a third below (own lane)
//             · cut short before a drop
//   Some      + sequenced up the scale (+2 / +4 degrees, ABSOLUTE ZERO's drop) · a
//             turnaround onto the dominant · the head alone · a chop
//   Wild      + a fragment developed across the bar · displaced by an eighth · a leap
//             at the phrase's peak
//
// WILD IS NEVER A ONE-OFF. A new idea heard once sounds like a mistake; heard again, it
// is part of the tune. So the fragment comes back in the same bar of the phrase's second
// half, the displacement and the leap sit in the same bars of both plans, and A and B
// differ in one bar only — different enough to move on, the same enough to remember.
//
// Browser-safe: no `node:*` imports.
import {
  blank, clonePart, diatonic, midi, nameOf, clampMidi, parseChord, cut, hasNotes,
} from './theory.js';

/** The note at the end of a part's first half — where a head stops. */
const lastStruckBefore = (part, step) => {
  for (let i = Math.min(15, step); i >= 0; i--) if (part.notes[i] != null) return i;
  return -1;
};
const topName = (v) => (Array.isArray(v) ? v[v.length - 1] : v);

/**
 * The head: the bar up to the downbeat of its third beat, the last note held — no
 * pickup into the next bar. ABSOLUTE ZERO's HEAD, the bar before a drop.
 */
export function head(part) {
  const out = cut(part, 9);
  const last = lastStruckBefore(out, 8);
  if (last >= 0) out.lens[last] = Math.max(out.lens[last] ?? 1, Math.min(8, 16 - last));
  return out;
}

/** The pitch-class set of a chord, and the chord tone nearest a note. */
function nearestChordTone(name, sym, dir = 0) {
  const { pcs } = parseChord(sym);
  const m = midi(name);
  let best = null;
  for (let d = -11; d <= 11; d++) {
    if (dir < 0 && d > 0) continue;
    if (dir > 0 && d < 0) continue;
    const x = m + d;
    if (!pcs.includes(((x % 12) + 12) % 12)) continue;
    if (!best || Math.abs(d) < Math.abs(best - m)) best = x;
  }
  return nameOf(clampMidi(best ?? m));
}

/**
 * The turnaround: the bar's first half as written, then two long notes of the dominant
 * stepping down to the leading note — ABSOLUTE ZERO's CAD (D F A F, then E – C# over A).
 */
export function turnaround(part, dominant) {
  const out = cut(part, 8);
  const last = lastStruckBefore(out, 7);
  const from = last >= 0 ? topName(out.notes[last]) : null;
  if (!from) return out;
  const a = nearestChordTone(from, dominant, 0);
  const b = nearestChordTone(nameOf(midi(a) - 1), dominant, -1);
  out.notes[8] = a; out.lens[8] = 4;
  out.notes[12] = b; out.lens[12] = 4;
  return out;
}

/** The answer a short riff pads its cell with: the first bar's head, landing home. */
export function answerBar(first, tonicChord) {
  const out = head(first);
  const last = lastStruckBefore(out, 8);
  if (last >= 0) {
    const v = out.notes[last];
    out.notes[last] = Array.isArray(v) ? v : nearestChordTone(v, tonicChord, 0);
    out.lens[last] = Math.max(out.lens[last] ?? 1, 16 - last);
  }
  return out;
}

/** The first beat copied over the second — a hand on the sampler's pad. */
export function chop(part) {
  const out = clonePart(part);
  for (let i = 0; i < 4; i++) {
    out.notes[4 + i] = part.notes[i];
    out.lens[4 + i] = part.notes[i] != null ? Math.min(4 - i, part.lens[i] ?? 1) : null;
  }
  if (out.notes[0] != null) out.lens[0] = Math.min(4, out.lens[0] ?? 1);
  return out;
}

/**
 * A fragment developed: the first beat's motif, stated on each beat and walked up the
 * scale (0, +1, +2, back home) — the head of the hook, sequenced. Same rhythm cell, same
 * contour, never turned over.
 */
export function fragment(part, scale) {
  const motif = blank();
  for (let i = 0; i < 4; i++) {
    motif.notes[i] = part.notes[i];
    motif.lens[i] = part.notes[i] != null ? Math.min(4 - i, part.lens[i] ?? 1) : null;
  }
  if (!hasNotes(motif)) return clonePart(part);
  const out = blank();
  [0, 1, 2, 0].forEach((deg, beat) => {
    const moved = diatonic(motif, deg, scale);
    for (let i = 0; i < 4; i++) {
      out.notes[beat * 4 + i] = moved.notes[i];
      out.lens[beat * 4 + i] = moved.lens[i];
    }
  });
  return out;
}

/** Displaced by an eighth: everything two sixteenths later, wrapping round the bar. */
export function displace(part, by = 2) {
  const out = blank();
  part.notes.forEach((v, i) => {
    if (v == null) return;
    const j = (i + by) % 16;
    out.notes[j] = v;
    out.lens[j] = Math.min(part.lens[i] ?? 1, 16 - j);
  });
  return out;
}

/** A leap at the peak: the bar's last note an octave up, while that stays singable. */
export function leap(part) {
  const out = clonePart(part);
  const last = lastStruckBefore(out, 15);
  if (last < 0) return out;
  const v = out.notes[last];
  const names = Array.isArray(v) ? v : [v];
  if (names.every((x) => midi(x) + 12 <= 96)) out.notes[last] = Array.isArray(v) ? v.map((x) => nameOf(midi(x) + 12)) : nameOf(midi(v) + 12);
  return out;
}

/** The ops each level may use, in the order the plans name them. */
export const OPS_BY_VARIATION = Object.freeze({
  faithful: ['as', 'cut'],
  some: ['as', 'cut', 'k2', 'k4', 'turn', 'head', 'chop'],
  wild: ['as', 'cut', 'k2', 'k4', 'turn', 'head', 'chop', 'frag', 'disp', 'leap'],
});

/**
 * Eight-bar drop plans, by cell length (1, 2, 4 or 8 bars) and level: each bar is
 * `[cell bar, op]`. Two plans per level, A and B — consecutive phrases alternate, so no
 * two phrases of a drop play the hook the same way. At Wild they differ in one bar, so
 * what changes is heard against what comes back (see the note at the top). C=1 Some A is ABSOLUTE ZERO's drop:
 * H, H3, H, H5, H, H3, H, CAD.
 */
const PLANS = {
  1: {
    faithful: [[0, 0, 0, 0, 0, 0, 0, 0].map((s) => [s, 'as'])],
    some: [
      [[0, 'as'], [0, 'k2'], [0, 'as'], [0, 'k4'], [0, 'as'], [0, 'k2'], [0, 'as'], [0, 'turn']],
      [[0, 'as'], [0, 'k2'], [0, 'k4'], [0, 'turn'], [0, 'as'], [0, 'k2'], [0, 'chop'], [0, 'turn']],
    ],
    wild: [
      [[0, 'as'], [0, 'frag'], [0, 'as'], [0, 'disp'], [0, 'as'], [0, 'frag'], [0, 'leap'], [0, 'turn']],
      [[0, 'as'], [0, 'frag'], [0, 'k2'], [0, 'disp'], [0, 'as'], [0, 'frag'], [0, 'leap'], [0, 'turn']],
    ],
  },
  2: {
    faithful: [[0, 1, 0, 1, 0, 1, 0, 1].map((s) => [s, 'as'])],
    some: [
      [[0, 'as'], [1, 'as'], [0, 'k2'], [1, 'k2'], [0, 'as'], [1, 'as'], [0, 'as'], [1, 'turn']],
      [[0, 'as'], [1, 'as'], [0, 'as'], [1, 'chop'], [0, 'k4'], [1, 'k2'], [0, 'as'], [1, 'turn']],
    ],
    wild: [
      [[0, 'as'], [1, 'frag'], [0, 'as'], [1, 'disp'], [0, 'as'], [1, 'frag'], [0, 'leap'], [1, 'turn']],
      [[0, 'as'], [1, 'frag'], [0, 'k2'], [1, 'disp'], [0, 'as'], [1, 'frag'], [0, 'leap'], [1, 'turn']],
    ],
  },
  4: {
    faithful: [[0, 1, 2, 3, 0, 1, 2, 3].map((s) => [s, 'as'])],
    some: [
      [[0, 'as'], [1, 'as'], [2, 'as'], [3, 'as'], [0, 'k2'], [1, 'k2'], [2, 'as'], [3, 'turn']],
      [[0, 'as'], [1, 'as'], [2, 'as'], [3, 'chop'], [0, 'as'], [1, 'as'], [2, 'k2'], [3, 'turn']],
    ],
    wild: [
      [[0, 'as'], [1, 'frag'], [2, 'as'], [3, 'disp'], [0, 'as'], [1, 'frag'], [2, 'leap'], [3, 'turn']],
      [[0, 'as'], [1, 'frag'], [2, 'k2'], [3, 'disp'], [0, 'as'], [1, 'frag'], [2, 'leap'], [3, 'turn']],
    ],
  },
  8: {
    faithful: [[0, 1, 2, 3, 4, 5, 6, 7].map((s) => [s, 'as'])],
    some: [
      [[0, 'as'], [1, 'as'], [2, 'as'], [3, 'as'], [4, 'as'], [5, 'as'], [6, 'as'], [7, 'turn']],
      [[0, 'as'], [1, 'as'], [2, 'as'], [3, 'as'], [4, 'k2'], [5, 'as'], [6, 'chop'], [7, 'turn']],
    ],
    // An eight-bar cell has no second half that repeats the first, so the fragment of
    // bar 2 is played again in bar 6 — the same source bar, so the same music.
    wild: [
      [[0, 'as'], [1, 'frag'], [2, 'as'], [3, 'disp'], [4, 'as'], [1, 'frag'], [6, 'leap'], [7, 'turn']],
      [[0, 'as'], [1, 'frag'], [2, 'k2'], [3, 'disp'], [4, 'as'], [1, 'frag'], [6, 'leap'], [7, 'turn']],
    ],
  },
};

/** How many bars the riff's cell is: 1, 2, 4 or 8. */
export const cellLength = (bars) => (bars <= 2 ? bars : bars <= 4 ? 4 : 8);

/**
 * The hook's cell: the riff's hook bars, padded to 1, 2, 4 or 8. Faithful pads with the
 * riff's own bars from the top (3 bars → 1 2 3 1); Some and Wild pad with an answer.
 */
export function hookCell(hookBars, variation, tonicChord) {
  const C = cellLength(hookBars.length);
  const out = hookBars.map(clonePart);
  for (let i = hookBars.length; i < C; i++) {
    out.push(variation === 'faithful' ? clonePart(hookBars[i % hookBars.length]) : answerBar(hookBars[0], tonicChord));
  }
  return out;
}

/** Plan A or B for a phrase. `flip` swaps which comes first (a seed's choice). */
export function phrasePlan(C, variation, phrase, flip = false) {
  const set = PLANS[C][variation] || PLANS[C].faithful;
  return set[(phrase + (flip ? 1 : 0)) % set.length];
}

/** A plan bar realised: the cell bar it names, with its op applied. */
export function realise(cell, [src, op], { scale, dominant }) {
  const bar = cell[src % cell.length];
  switch (op) {
    case 'k2': return diatonic(bar, 2, scale);
    case 'k4': return diatonic(bar, 4, scale);
    case 'turn': return turnaround(bar, dominant);
    case 'head': return head(bar);
    case 'chop': return chop(bar);
    case 'frag': return fragment(bar, scale);
    case 'disp': return displace(bar);
    case 'leap': return leap(bar);
    case 'cut': return cut(bar, 12);
    default: return clonePart(bar);
  }
}

/** The ops a plan uses must all be allowed at its level — asserted by the tests. */
export const planOps = (C, variation) => [...new Set((PLANS[C][variation] || []).flat().map(([, op]) => op))];
