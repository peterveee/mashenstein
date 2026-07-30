// SALTY TANGO — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a blank starter.
// Bell Box — 100 BPM in A major. No drums anywhere: music box, celeste, glass pad and a sub underneath.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "salty-tango";
export const title = "SALTY TANGO";
export const slug = "salty-tango";
export const group = "scratch";
export const seed = 1833946616;

export const bank = {
  bpm: 100,
  musicTrim: 0.6,
  leadVoice: "musicBox",
  starterLanes: ["lead"],
  sections: [
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
  ],
  order: [0,{"s":0,"bars":1}],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
