// GLASS VOLCANO — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in C minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "glass-volcano";
export const title = "GLASS VOLCANO";
export const slug = "glass-volcano";
export const group = "scratch";
export const seed = 2428821011;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . C1 . . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . C1 C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      bass: seq('C3 . . . . . . . F2 . . . . . . . | A#2 . . . . . . . C3 . . . . . . .'),
      chords: chordSeq('C3min . . C3min . . C3min . F3min . . F3min . . F3min . | A#3 . . A#3 . . A#3 . C3min . . C3min . . C3min .'),
      lead: seq('G5 . G5 . D#5 . . C5 D#5 . G5 . G#5 . . G5 | D#5 . C5 . D#5 . . F5 G#5 . G5 . D#5 . . C5'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
