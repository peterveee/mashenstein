// HAPPY ANCHOR — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// House — 124 BPM in D dorian. Four-to-the-floor at 124: clap on the backbeat, open hat off it, piano stabs.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "happy-anchor";
export const title = "HAPPY ANCHOR";
export const slug = "happy-anchor";
export const group = "scratch";
export const seed = 2921008563;

export const bank = {
  bpm: 124,
  musicTrim: 0.76,
  drumGain: 1.09,
  kickVoice: "kickPunch",
  clapVoice: "clapRoom",
  hatsVoice: "hatTick",
  ohatsVoice: "hatOpen",
  bassVoice: "tpBassy",
  chordsVoice: "tpPianoetta",
  leadVoice: "tpBah",
  starterLanes: ["kick","clap","hats","ohats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bass: seq('D3 . . . . . D3 . B2 . . . . . B2 . | G2 . . . . . G2 . A2 . . . . . A2 .'),
      chords: chordSeq('. . D3min7 . . . D3min7 . . . B3maj7 . . . B3maj7 . | . . G3min7 . . . G3min7 . . . A3min7 . . . A3min7 .'),
      lead: seq('D5 . . . . . F5 . . . . . A5 . . . | F5 . . . . . E5 . . . . . D5 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
