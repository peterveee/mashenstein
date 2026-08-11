// How the DESK spells a note — which is deliberately not how a SONG FILE spells it.
//
// Two conventions are in play, and each is right where it is:
//
//   MIDI 60 is **C4** in scientific pitch notation. That is what `src/engine/notes.js`
//   uses, what every song bank in the repo is authored in, and what `n('C4')` turns back
//   into 261.63 Hz.
//   MIDI 60 is **C3** in Logic, Live and Cubase — which is what a keyboard gets read
//   against, and what the controller plugged into this desk says on its own display.
//
// So the screen shows the second and the files keep the first. These cannot collapse
// into one function: `noteName` is the exact inverse of `n`, and every bank in the
// catalogue was written through that pair — renumbering it would transpose the whole
// repertoire by an octave without moving a single frequency. Nothing about the SOUND
// changes here. What changes is the number printed under a key.
//
// Everything the eye reads comes through this file, so the desk cannot end up calling
// one MIDI note two things on one screen: the piano roll's key column, the synth
// keyboard, the on-screen keyboard, the bar-grid readouts and the performance panel's
// BASE KEY list are all spelled from here.

/** Octaves between the file's spelling and the desk's: C4 in a bank is C3 on screen. */
export const DESK_OCTAVE_SHIFT = -1;

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// ♯ rather than #, for the surfaces that were already set in it. The glyph is the only
// difference; the octave arithmetic is shared, which is the whole point of this file.
const FANCY = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** 60 -> 'C3'. */
export function deskNoteName(midi, { fancy = false } = {}) {
  if (!Number.isFinite(midi)) return '';
  const names = fancy ? FANCY : SHARP;
  const octave = Math.floor(midi / 12) - 1 + DESK_OCTAVE_SHIFT;
  return `${names[((midi % 12) + 12) % 12]}${octave}`;
}

/**
 * 261.63 -> 'C3'. Null for anything that is not a pitch, which is how the readouts
 * tell a rest from a note without testing the frequency themselves.
 *
 * Rounded to the nearest semitone, for the reason `noteName` rounds: what comes back out
 * of a lane has been through a detune or a glide and will not land on the cent.
 */
export function deskNoteNameHz(hz, options) {
  if (!(hz > 0)) return null;
  return deskNoteName(Math.round(12 * Math.log2(hz / 440) + 69), options);
}
