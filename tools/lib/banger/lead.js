// WRITE A LEAD — a topline for a riff that has none.
//
// A riff of only chords, or only a bass, or both, has no tune for the banger to hang its
// hook, its doubles and its variations on. This writes one from the riff's own chords and
// hands it back as an ordinary riff part, so everything downstream treats it like a lead
// the person played. Each take (seed) writes a different one.
//
// The recipe is a pop topline's: a one-bar RHYTHM motif that repeats, chord tones on the
// strong sixteenths and the odd scale step between them, a melodic shape that is the same
// in bars one and three (so it reads as a hook), a higher answer in bar two, and bar four
// falling home to the chord's root on a longer note.
//
// Browser-safe: no `node:*` imports.
import { chordRun, midi, nameOf, parseChord } from './theory.js';
import { seamFor } from '../../../src/data/voices.js';

// Onsets, as sixteen characters: `x` starts a note. Each one is a groove a hook could sit on.
const RHYTHMS = [
  'x.x.x..x.x.x....',
  'x..x..x.x.x.x...',
  'x.xx.x.x..x.x...',
  'x...x.x.x..x.x..',
  'x.x..x.xx.x.....',
  '..x.x.x...x.xx..',
  'x..x..x...x.x.x.',
  'x.x.x.x.x...x...',
];
// The answer bar's rhythm ends on a held note, so a four-bar phrase breathes at its end.
const ENDINGS = ['x.x.x...x.......', 'x..x..x.x.......', '..x.x.x.x.......', 'x.x..x..x.......'];

/** True when no part of the riff can carry a tune: nothing melodic above the bass register. */
export function riffNeedsLead(riff) {
  return !riff.parts.some((p) => p.kind === 'melodic' && (p.meanPitch ?? 60) >= 52);
}

const onsetsOf = (pat) => [...pat].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0);
const chordAt = (c, i) => (Array.isArray(c) ? c[Math.min(c.length - 1, Math.floor(i / (16 / c.length)))] : c);

/** The nearest note of `scale` (pitch classes) a step above (+1) or below (-1) `m`. */
function scaleStep(m, dir, scale) {
  for (let x = m + dir; Math.abs(x - m) <= 3; x += dir) if (scale.includes(((x % 12) + 12) % 12)) return x;
  return m;
}

/**
 * Write the lead: one bar-string (theory.js L shorthand) per riff bar. `chords` is the
 * riff's chord per bar (analyse.js riffChords — a symbol, or two for a split bar),
 * `scale` the key's pitch classes, `rng` anything with `.next()`.
 */
export function writeLead({ chords, scale, rng, centre = 'E4', rhythm: given = null, tones: span = 7 }) {
  const pick = (list) => list[Math.floor(rng.next() * list.length)];
  // A verse (cohesion.js) passes its own rhythm — the hook's, thinned — so it is the
  // chorus's cousin; a written lead draws one.
  const rhythm = given || pick(RHYTHMS);
  const ending = pick(ENDINGS);
  // The melodic shape: a step (in chord tones) from each note to the next. Mostly small,
  // the occasional leap — drawn once, so every bar that uses it has the same contour.
  const shape = (n) => Array.from({ length: n }, () => {
    const r = rng.next();
    return r < 0.3 ? 1 : r < 0.6 ? -1 : r < 0.75 ? 0 : r < 0.88 ? 2 : -2;
  });
  const shapeA = shape(onsetsOf(rhythm).length);
  const shapeE = shape(onsetsOf(ending).length);
  const passing = rng.next() < 0.6;
  const low = midi(centre) - 5;

  return chords.map((c, b) => {
    const phraseBar = b % 4;
    // The answer bar: the fourth of a phrase — or the last of a riff shorter than four.
    const last = phraseBar === 3 || (chords.length < 4 && b > 0 && b === chords.length - 1);
    const pat = last ? ending : rhythm;
    const steps = last ? shapeE : shapeA;
    const on = onsetsOf(pat);
    // Bar two answers a little higher; the rest start mid-range.
    let pos = Math.min(span - 1, phraseBar === 1 ? 3 : 2);
    const toks = Array(16).fill('.');
    on.forEach((i, j) => {
      const tones = chordRun(chordAt(c, i), nameOf(low), span).map(midi);
      pos = Math.max(0, Math.min(tones.length - 1, pos + (j === 0 ? 0 : steps[j])));
      let m = tones[pos];
      // The last note of the phrase lands on the chord's root.
      if (last && j === on.length - 1) {
        const root = parseChord(chordAt(c, i)).root;
        const roots = tones.filter((t) => t % 12 === root);
        if (roots.length) m = roots.reduce((best, t) => (Math.abs(t - m) < Math.abs(best - m) ? t : best));
      }
      // Off the beat, now and then, a scale step instead of a chord tone — a passing note.
      else if (passing && i % 4 !== 0 && j > 0 && rng.next() < 0.3) m = scaleStep(m, rng.next() < 0.5 ? 1 : -1, scale);
      const next = on[j + 1] ?? 16;
      const len = Math.max(1, Math.min(last && j === on.length - 1 ? 8 : 4, next - i));
      toks[i] = `${nameOf(m)}:${len}`;
    });
    return toks.join(' ');
  });
}

/** A lane the riff does not already use, for the written lead. */
export function freeLeadLane(riff) {
  const used = new Set(riff.parts.map((p) => p.key));
  for (const k of ['lead', 'lead2', 'lead3', 'lead4', 'lead5', 'lead6', 'lead7', 'lead8']) if (!used.has(k) && seamFor(k)) return k;
  return null;
}
