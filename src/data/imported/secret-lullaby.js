// SECRET LULLABY — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a blank starter.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "secret-lullaby";
export const title = "SECRET LULLABY";
export const slug = "secret-lullaby";
export const group = "scratch";
export const seed = 2829265233;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  starterLanes: ["lead"],
  sections: [
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
