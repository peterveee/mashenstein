// MAKE A BANGER — Fill In: a simple riff embellished. 3 Oct 2026.
//
// A riff of plain quarter notes, or eighths with gaps, has room in it, and the oldest
// trick in music fills it: DIMINUTION — a long note divided into shorter ones. Three
// flavours, each a figure the ear knows:
//
//   Repeat     the note struck again halfway through its span — 1 _ 2 _ becomes 1 1 2 2.
//   Passing    a scale note stepping between two notes a third or more apart, halfway
//              through the first one's span: C _ E _ becomes C D E _.
//   Neighbour  a long note stepping up a scale note and back: C _ _ _ becomes C _ D C.
//
// HOW MUCH, AND HOW OFTEN — every time is a lot (Peter, 3 Oct). Fill Notes caps the
// figures a bar gets, earliest first, so a bar is a busy start and a plain finish; Fill
// Every says which passes of the riff are filled at all (sections.js: every pass, every
// second, every fourth — the last pass of each group, so the fill lands as an answer).
// Same bar, same pass, same fill, every time. Every added note is a note of the banger's
// key — the scale the riff's lines move in — and a busy riff has no spans to divide and
// comes through untouched. Chords (a step holding several notes) are only ever repeated.
//
// Browser-safe: no `node:*` imports.
import { clonePart, midi, nameOf, clampMidi } from './theory.js';

export const FILL_INS = Object.freeze([
  { id: 'off', label: 'Off', note: 'The riff as it is' },
  { id: 'repeat', label: 'Repeat', note: 'Notes struck twice — 1 _ 2 _ becomes 1 1 2 2' },
  { id: 'passing', label: 'Passing', note: 'A scale note stepping between notes a third or more apart' },
  { id: 'neighbour', label: 'Neighbour', note: 'Long notes stepping up a scale note and back' },
]);
/** Which passes of the riff are filled: the last of every group of N. */
export const FILL_EVERY = Object.freeze([
  { id: '1', label: 'Every Pass', note: 'Every time the riff comes round' },
  { id: '2', label: 'Every 2nd', note: 'Every second time — plain, then filled' },
  { id: '4', label: 'Every 4th', note: 'Every fourth time — the pass before the phrase turns round' },
]);
/** How many figures a filled bar gets, earliest first. */
export const FILL_NOTES = Object.freeze([
  { id: '1', label: 'One', note: 'One figure a bar' },
  { id: '2', label: 'Two', note: 'Two figures a bar' },
  { id: 'all', label: 'Every Gap', note: 'Every gap that has room' },
]);

const STEPS = 16;
const single = (v) => v != null && !Array.isArray(v);

/** The scale note `dir` steps from `m` (1 up, -1 down), never `m` itself. */
function scaleStep(m, dir, scale) {
  for (let x = m + dir; Math.abs(x - m) <= 12; x += dir) if (scale.includes(((x % 12) + 12) % 12)) return x;
  return m + dir * 2;
}

/** The scale note between `a` and `b` nearest their middle, or null when they are a step apart. */
function between(a, b, scale) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  let best = null;
  for (let x = lo + 1; x < hi; x++) {
    if (!scale.includes(((x % 12) + 12) % 12)) continue;
    if (best == null || Math.abs(x - (a + b) / 2) < Math.abs(best - (a + b) / 2)) best = x;
  }
  return best;
}

/** Where each onset's span ends: the next onset, or the bar line. */
const spansOf = (part) => {
  const on = [];
  for (let i = 0; i < STEPS; i++) if (part.notes[i] != null) on.push(i);
  return on.map((i, k) => ({ i, span: (on[k + 1] ?? STEPS) - i }));
};

/** The first note of a bar, for a passing note leading over the bar line. */
const firstOf = (part) => part?.notes.find((v) => v != null) ?? null;

/**
 * One bar filled in. `next` is the bar after it (the cell wraps), `scale` its pitch
 * classes, `notes` how many figures at most ('all' for every gap), earliest first.
 */
export function fillInBar(part, how, scale, next = null, notes = 'all') {
  if (!part || !how || how === 'off') return part;
  const out = clonePart(part);
  const len = (i) => out.lens[i] ?? 1;
  const spans = spansOf(part);
  const cap = notes === 'all' ? Infinity : Number(notes) || Infinity;
  let made = 0;
  spans.forEach(({ i, span }, k) => {
    if (made >= cap) return;
    const v = part.notes[i];
    const before = JSON.stringify(out);
    if (how === 'repeat') {
      if (span < 4 || span % 2) return;
      const h = span / 2;
      out.lens[i] = Math.min(len(i), h);
      out.notes[i + h] = Array.isArray(v) ? [...v] : v;
      out.lens[i + h] = Math.min(part.lens[i] ?? 1, h);
    } else if (how === 'passing') {
      if (span < 4 || span % 2 || !single(v)) return;
      const to = k + 1 < spans.length ? part.notes[spans[k + 1].i] : firstOf(next);
      if (!single(to)) return;
      const a = midi(v);
      const b = midi(to);
      if (Math.abs(b - a) < 3 || Math.abs(b - a) > 9) return;
      const x = between(a, b, scale);
      if (x == null) return;
      const h = span / 2;
      out.lens[i] = Math.min(len(i), h);
      out.notes[i + h] = nameOf(clampMidi(x));
      out.lens[i + h] = h;
    } else if (how === 'neighbour') {
      if (span < 4 || span % 4 || !single(v)) return;
      const q = span / 4;
      const m = midi(v);
      out.lens[i] = Math.min(len(i), 2 * q);
      out.notes[i + 2 * q] = nameOf(clampMidi(scaleStep(m, 1, scale)));
      out.lens[i + 2 * q] = q;
      out.notes[i + 3 * q] = v;
      out.lens[i + 3 * q] = q;
    }
    if (JSON.stringify(out) !== before) made++;
  });
  return out;
}

/** Every bar of a riff part filled in the same way — the cell wraps for the last bar's lead-on. */
export const fillIn = (bars, how, scale, notes = 'all') => (!how || how === 'off' ? bars
  : bars.map((bar, b) => fillInBar(bar, how, scale, bars[(b + 1) % bars.length], notes)));

/** Is the pass of the riff that bar `at` of a section belongs to a filled one? */
export const passFilled = (at, passBars, every) => {
  const n = Number(every) || 1;
  return Math.floor(at / Math.max(1, passBars)) % n === n - 1;
};
