// MOTORIK DRIVER AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Motorik Driver — 168 BPM in D dorian. One chord, straight eighths, 168 BPM. A pad, a detuned bass, no let-up.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-motorik";
export const title = "MOTORIK DRIVER AUDITION";
export const slug = "audition-motorik";
export const group = "styleAudition";
export const seed = 368925;

export const bank = {
  bpm: 168,
  musicTrim: 1.214,
  drumGain: 0.736,
  kickVoice: "stKickTight",
  snareVoice: "stSnareCrisp",
  hatsVoice: "stHatClosed",
  ohatsVoice: "stHatOpen",
  bassVoice: "stDetuneBass",
  chordsVoice: "stWarmPad",
  leadVoice: "stDuoDetune",
  starterLanes: ["kick","snare","hats","ohats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bass: seq('D2 . D2 . D2 . D2 D2 D2 . D2 . D2 . D2 D2 | C3 . C3 . C3 . C3 C3 C3 . C3 . C3 . C3 C3'),
      chords: chordSeq('D3min . . . . . . . . . . . . . . . | C3 . . . . . . . . . . . . . . .'),
      lead: seq('D5 . . . . . . . A5 . . . . . . . | F5 . . . D5 . . . A5 . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
