// Pattern-authoring helpers for the music banks: note names and chord names in,
// 32-step frequency arrays out.
//
// These used to live at the bottom of audio.js, which made every bank file import
// the whole audio engine just to spell a bassline. That became a real problem once
// the engine needed to look a song's mix up by track id: audio.js -> tracks.js ->
// cabinets.js -> audio.js is a cycle, and the bank files ran before the engine's
// own constants were initialised. They are data utilities, not engine internals,
// so they live on their own now and the cycle cannot come back.
const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * The inverse of n(): 110 -> 'A2'. Rounded to the nearest semitone, because what
 * comes back out of a bank has been through a detune or a glide and is not going to
 * land on the cent. For reading a pattern back, which is what the desk does with it.
 */
export function noteName(hz) {
  if (!(hz > 0)) return null;
  const semi = Math.round(12 * Math.log2(hz / 440) + 69);
  return NAMES[((semi % 12) + 12) % 12] + (Math.floor(semi / 12) - 1);
}

/** n('A2') -> frequency in Hz. */
export function n(name) {
  if (name == null) return null;
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return null;
  const semitone = NOTES[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (semitone - 69) / 12);
}

// Chord names: <note><octave> + maj | min | 7 | maj7 | min7 | 9 (default maj).
const CHORD_IV = {
  maj: [0, 4, 7], min: [0, 3, 7], 7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], 9: [0, 4, 7, 14],
};

/**
 * "A3min7" -> the chord's frequencies, null if that is not a chord name.
 *
 * One chord on its own, for a lane written as an array rather than a string: a MIDI
 * import spells the chords it recognises and writes the rest out as their own notes,
 * so both spellings have to sit in the same array.
 */
export function chord(name) {
  const m = String(name).match(/^([A-G]#?\d+)(maj7|min7|maj|min|9|7)?$/);
  if (!m) return null;
  const root = n(m[1]);
  return CHORD_IV[m[2] || 'maj'].map((semi) => root * Math.pow(2, semi / 12));
}

// A lane is two bars. At the sixteenth grid every song has always been written on, that
// is 32 slots — which is why it was a literal here for so long, and why it stays the
// default: every one of the ~180 hand-written banks calls these with one argument and
// must keep producing exactly what it always did.
//
// A song stored on a finer grid writes the count it needs: 64 at `resolution: 32`, 96 at
// 48, 192 at 96. `tools/lib/song-source.js` is what emits that second argument, and the
// `|` in the shorthand stays purely cosmetic at every size — token COUNT is the timing.
export const TWO_BARS_OF_SIXTEENTHS = 32;

/** "A3min7 . . . F3maj7 . . ." -> `slots`-length array of frequency-arrays (or null). */
export function chordSeq(str, slots = TWO_BARS_OF_SIXTEENTHS) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < slots; i++) {
    const tk = toks[i % toks.length];
    out.push(tk === '.' ? null : chord(tk));
  }
  return out;
}

/** "A2 . . A2 | C3 . . ." -> `slots`-length note array (pads/truncates), '.' = rest. */
export function seq(str, slots = TWO_BARS_OF_SIXTEENTHS) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < slots; i++) out.push(n(toks[i % toks.length] === '.' ? null : toks[i % toks.length]));
  return out;
}
