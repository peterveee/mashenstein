// CHROME SUNDAE — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Motorik Driver — 168 BPM in A dorian. One chord, straight eighths, 168 BPM. A pad, a detuned bass, no let-up.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "chrome-sundae";
export const title = "CHROME SUNDAE";
export const slug = "chrome-sundae";
export const group = "scratch";
export const seed = 1332880983;

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
      snare: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bass: seq('A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 . | A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 .'),
      chords: chordSeq('A3min . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead: seq('E5 . C5 . . . . . . . . . A4 . . . | B4 . C5 . . . . . . . . . A4 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
