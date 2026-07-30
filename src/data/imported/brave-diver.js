// BRAVE DIVER — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a beat starter.
// Electropop — 120 BPM in E minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "brave-diver";
export const title = "BRAVE DIVER";
export const slug = "brave-diver";
export const group = "scratch";
export const seed = 2440591235;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  starterLanes: ["kick","snare","hats"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . C1 . C1 . . . | C1 . . . C1 . . . C1 . C1 . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
