// MAKE A BANGER — the song's material, all of it grown from the hook, so a Pop Song or an
// Anthem hangs together rather than being a drop with other things glued round it.
//
//   the CHORUS    is the hook — the drop machinery (sections.js dropBar)
//   the VERSE     is the hook's cousin: its own rhythm thinned to the strong eighths,
//                 written lower and narrower over chords that are NOT the chorus's
//                 (lead.js writeLead). Verse 2 is verse 1 again, its second half a step up.
//   the PRE       is the hook's head sequenced upward a step a bar over a climbing walk
//                 that lands on the dominant — the chorus is where it resolves
//   the MIDDLE 8  is somewhere else harmonically (IV and vi, then the borrowed bVI–bVII in
//                 major; VI and iv, then III–VII in minor), its melody the hook's tail
//                 motif developed (variation.js fragment — sequenced, never turned over),
//                 ending on the dominant with the hook's first notes as a pickup
//   the INTRO     can quote the chorus; the OUTRO can tag it
//
// Everything random here draws from its own streams, so the Club form never changes.
// Browser-safe.
import { L, blank, clonePart, diatonic, midi, nameOf } from './theory.js';
import { head, fragment } from './variation.js';
import { romanChord } from './analyse.js';
import { writeLead } from './lead.js';
import { Rng } from '../../../src/engine/rng.js';

/**
 * The chord walks of the sections that are not the chorus, per mode family — a bar a
 * numeral (or two for a split bar), cycled or stretched over the section. The last bar
 * of a pre-chorus and of a middle 8 is always the song's dominant.
 */
export const SECTION_HARMONY = Object.freeze({
  verse: {
    minor: [['i'], ['i'], ['iv'], ['iv'], ['VI'], ['VI'], ['VII'], ['VII']],
    major: [['I'], ['I'], ['IV'], ['IV'], ['vi'], ['vi'], ['V'], ['V']],
  },
  preChorus: {
    minor: [['iv'], ['v'], ['VI'], ['V']],
    major: [['ii'], ['iii'], ['IV'], ['V']],
  },
  middle8: {
    minor: [['VI'], ['VI'], ['iv'], ['iv'], ['III'], ['III'], ['VII'], ['V']],
    major: [['IV'], ['IV'], ['vi'], ['vi'], ['bVI'], ['bVI'], ['bVII'], ['V']],
  },
});
const ENDS_ON_DOMINANT = new Set(['preChorus', 'middle8']);

/** A walk stretched over `n` bars: an 8-bar walk cycles, a 4-bar one stretches to fit. */
function walkOver(walk, n) {
  return Array.from({ length: n }, (_, i) => (walk.length >= 8 ? walk[i % walk.length] : walk[Math.floor((i * walk.length) / n)]));
}

/** The onsets of a bar as a sixteen-character rhythm. */
const rhythmOf = (part) => part.notes.map((v) => (v == null ? '.' : 'x')).join('');

/**
 * Everything the non-chorus sections play, worked out once per song. `ctx` is
 * sections.js's (key, style, mood walk, the hook cell, the dominant); `seed` a number
 * from the song's own `verse` stream, so verse 2 is verse 1's material.
 */
export function songMaterial({ ctx, cell, hookMean, modeHarmony, mood, seed }) {
  const { key, style, scale, dominant } = ctx;
  const family = key.minor ? 'minor' : 'major';

  /** A section's chords, bar by bar, as symbols. */
  const chordsFor = (type, n) => {
    // Under a mode the verse takes the mode's OTHER walk — a dark verse under a bright chorus.
    let walk = style.harmony?.[type]?.[family] || SECTION_HARMONY[type]?.[family];
    if (type === 'verse' && modeHarmony && style.modeHarmony?.[key.mode]) {
      walk = style.modeHarmony[key.mode][mood.walk === 'dark' ? 'bright' : 'dark'].progression;
    }
    const syms = walkOver(walk, n).map((bar) => bar.map((nm) => romanChord(nm, key)));
    const out = syms.map((s) => (s.length === 1 ? s[0] : s));
    if (ENDS_ON_DOMINANT.has(type) && n) out[n - 1] = dominant;
    return out;
  };

  // The verse's rhythm: the hook's, on its eighths only — and on its beats, when that
  // still leaves too much. Too sparse to be a tune, and the lead writer draws its own.
  const hookRhythm = rhythmOf(cell[0]);
  let verseRhythm = [...hookRhythm].map((c, i) => (c === 'x' && i % 2 === 0 ? 'x' : '.')).join('');
  if ((verseRhythm.match(/x/g) || []).length > 5) verseRhythm = [...verseRhythm].map((c, i) => (c === 'x' && (i % 4 === 0 || i === 2) ? 'x' : '.')).join('');
  if ((verseRhythm.match(/x/g) || []).length < 3) verseRhythm = null;
  const verseCentre = nameOf(Math.round(Math.min(hookMean, 79) - 12));

  /** The verse line over `chords` — `nth` verse: the second one's back half a step up. */
  const verseLine = (chords, nth) => {
    const bars = writeLead({ chords, scale, rng: new Rng(seed), centre: verseCentre, rhythm: verseRhythm, tones: 5 }).map(L);
    return nth > 0 ? bars.map((b, i) => (i >= bars.length / 2 ? diatonic(b, 1, scale) : b)) : bars;
  };

  /** The pre-chorus line: the hook's head, up a step a bar. */
  const preLine = (n) => Array.from({ length: n }, (_, j) => {
    const step = Math.floor((j * 4) / n);
    return diatonic(head(cell[j % cell.length]), step, scale);
  });

  /** The middle 8 line: the hook's tail motif, developed, then a pickup into the chorus. */
  const bridgeLine = (n) => {
    const tail = cell[cell.length - 1];
    const moves = [0, 0, 2, 2, -1, -1, 1, 1];
    return Array.from({ length: n }, (_, j) => {
      if (j === n - 1) return pickupBar(cell[0]);
      return diatonic(fragment(j % 2 ? cell[j % cell.length] : tail, scale), moves[Math.floor((j * 8) / n) % 8], scale);
    });
  };

  return { chordsFor, verseLine, preLine, bridgeLine };
}

/**
 * A bar that is silent until its last beat, where the first beat of `first` comes in
 * early: the pickup that leads a middle 8 (or anything) back into the chorus.
 */
export function pickupBar(first) {
  const out = blank();
  for (let i = 0; i < 4; i++) {
    if (first.notes[i] == null) continue;
    out.notes[12 + i] = clonePart(first).notes[i];
    out.lens[12 + i] = Math.min(4 - i, first.lens[i] ?? 1);
  }
  return out;
}

/** Notes a part plays, as midi numbers (the tests' measure of register and density). */
export const pitchesOf = (part) => part.notes.flatMap((v) => (v == null ? [] : [].concat(v).map(midi)));
