// BELL BOX AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Bell Box — 96 BPM in F major. No drums anywhere: music box, celeste, glass pad and a sub underneath.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-bellbox";
export const title = "BELL BOX AUDITION";
export const slug = "audition-bellbox";
export const group = "styleAudition";
export const seed = 368925;

export const bank = {
  bpm: 96,
  musicTrim: 1.506,
  bassVoice: "stSubSine",
  chordsVoice: "stGlassPad",
  twinkleVoice: "stCeleste",
  leadVoice: "stMusicBox",
  starterLanes: ["bass","chords","twinkle","lead"],
  sections: [
    {
      bass: seq('F2 . . . . . . . . . . . . . . . | A#2 . . . . . . . . . . . . . . .'),
      chords: chordSeq('F3maj7 . . . F3maj7 . . . . . . . . . . . | A#3maj7 . . . A#3maj7 . . . . . . . . . . .'),
      twinkle: seq('. . F5 . . . C6 . . . A5 . . . C6 . | . . F5 . . . C6 . . . A5 . . . C6 .'),
      lead: seq('F4 . A4 . C5 . . . A4 . F4 . C5 . . . | D5 . C5 . A4 . . . G4 . F4 . F4 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
