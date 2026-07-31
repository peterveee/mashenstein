// RUSTY TYPHOON — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Boom Bap — 88 BPM in F dorian. Dorian sevenths at 88 — thud kick, fat snare, electric piano, celeste.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "rusty-typhoon";
export const title = "RUSTY TYPHOON";
export const slug = "rusty-typhoon";
export const group = "scratch";
export const seed = 2209648372;

export const bank = {
  bpm: 88,
  musicTrim: 0.63,
  drumGain: 2.04,
  kickVoice: "kickThud",
  snareVoice: "snareFat",
  hatsVoice: "hatPedal",
  rimVoice: "dsRim",
  bassVoice: "rubberBass",
  chordsVoice: "epiano",
  leadVoice: "celeste",
  starterLanes: ["kick","snare","hats","rim","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . C1 . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 . . C1 . C1 . C1 C1 . . C1 . | C1 . C1 C1 . . C1 . C1 . C1 C1 . . C1 .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . C1 . . . . | . . . . . . . . . . . C1 . . . .').map((v) => !!v),
      bass: seq('F2 . . . . . . . D#2 . . D#2 . . . . | F2 . . . . . . . A#2 . . A#2 . . . .'),
      chords: chordSeq('F3min7 . . . . . F3min7 . D#3maj7 . . . . . D#3maj7 . | F3min7 . . . . . F3min7 . A#3min7 . . . . . A#3min7 .'),
      lead: seq('. . C5 . G#4 . . F4 . . G#4 . C5 . . . | . . D5 . C5 . . G#4 . . F4 . G4 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
