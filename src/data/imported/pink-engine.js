// PINK ENGINE — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Bell Box — 96 BPM in C major. No drums anywhere: music box, celeste, glass pad and a sub underneath.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "pink-engine";
export const title = "PINK ENGINE";
export const slug = "pink-engine";
export const group = "scratch";
export const seed = 2572288798;

export const bank = {
  bpm: 96,
  musicTrim: 0.6,
  bassVoice: "subSine",
  chordsVoice: "glassPad",
  twinkleVoice: "celeste",
  leadVoice: "musicBox",
  starterLanes: ["bass","chords","twinkle","lead"],
  sections: [
    {
      bass: seq('C3 . . . . . . . A2 . . . A2 . . . | F2 . . . . . . . G2 . . . G2 . . .'),
      chords: chordSeq('C3 . . . C3 . . . A3min . . . A3min . . . | F3 . . . F3 . . . G3 . . . G3 . . .'),
      twinkle: seq('. . . . . . G6 . . . . . . . E6 . | . . . . . . C6 . . . . . . . E6 .'),
      lead: seq('C5 . E5 . G5 . . . E5 . C5 . G5 . . . | A5 . G5 . E5 . . . D5 . C5 . C5 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
