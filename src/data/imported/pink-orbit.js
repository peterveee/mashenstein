// PINK ORBIT — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Bell Box — 96 BPM in A major. No drums anywhere: music box, celeste, glass pad and a sub underneath.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "pink-orbit";
export const title = "PINK ORBIT";
export const slug = "pink-orbit";
export const group = "scratch";
export const seed = 2489928741;

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
      bass: seq('A2 . . . . . . . A2 . . . . . . . | D3 . . . . . . . D3 . . . . . . .'),
      chords: chordSeq('A3maj7 . . . . . . . . . . . . . . . | D3maj7 . . . . . . . . . . . . . . .'),
      twinkle: seq('A6 . . . . . . . . . F#6 . . . . . | E6 . . . . . . . . . C#6 . . . . .'),
      lead: seq('A4 . B4 . C#5 . . . E5 . F#5 . E5 . . . | C#5 . A4 . B4 . . . C#5 . A4 . A4 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
