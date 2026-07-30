// TINY SUNDAE — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Techno — 136 BPM in D phrygian. Phrygian at 136: dirty kick, cowbell, acid bass rolling under one dark chord.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "tiny-sundae";
export const title = "TINY SUNDAE";
export const slug = "tiny-sundae";
export const group = "scratch";
export const seed = 149753742;

export const bank = {
  bpm: 136,
  musicTrim: 0.87,
  drumGain: 0.72,
  kickVoice: "kickDirty",
  clapVoice: "clapTight",
  hatsVoice: "metalHatClosed",
  rimVoice: "cowbell",
  bassVoice: "acidSquelch",
  chordsVoice: "breathPad",
  leadVoice: "tpLectric",
  starterLanes: ["kick","clap","hats","rim","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      bass: seq('. . D2 D2 . . D2 D2 . . D2 D2 . . D2 D2 | . . D2 D2 . . D2 D2 . . D2 D2 . . D2 D2'),
      chords: chordSeq('D3min . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . . . . . . . . . . . . . . . | D#5 . . . . . . . . . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
