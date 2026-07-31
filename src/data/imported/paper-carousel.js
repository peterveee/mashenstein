// PAPER CAROUSEL — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in D minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "paper-carousel";
export const title = "PAPER CAROUSEL";
export const slug = "paper-carousel";
export const group = "scratch";
export const seed = 275212201;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      bass: seq('D3 . . . D4 . . . C3 . . . C4 . . . | A#2 . . . A#3 . . . A2 . . . A3 . . .'),
      chords: chordSeq('D3min . . . . . . . C3 . . . . . . . | A#3 . . . . . . . A3 . . . . . . .'),
      lead: seq('D5 . F5 . A5 . . A#5 A5 . F5 . E5 . . F5 | A5 . A#5 . D6 . . A#5 A5 . F5 . E5 . . D5'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
