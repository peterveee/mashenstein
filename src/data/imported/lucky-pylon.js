// LUCKY PYLON — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Bell Box — 96 BPM in A major. No drums anywhere: music box, celeste, glass pad and a sub underneath.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "lucky-pylon";
export const title = "LUCKY PYLON";
export const slug = "lucky-pylon";
export const group = "scratch";
export const seed = 2301540433;

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
      bass: seq('A2 . . . . . . . . . . . . . . . | F#2 . . . . . . . . . . . . . . .'),
      chords: chordSeq('A3 . . . A3 . . . E3 . . . E3 . . . | F#3min . . . F#3min . . . D3 . . . D3 . . .'),
      twinkle: seq('. . E6 . . . C#6 . . . A5 . . . C#6 . | . . E6 . . . F#6 . . . E6 . . . C#6 .'),
      lead: seq('A4 . . . . . C#5 . E5 . . . C#5 . . . | A4 . . . . . E5 . F#5 . . . E5 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
