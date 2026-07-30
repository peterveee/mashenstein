// VELVET GARDEN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Boom Bap — 88 BPM in C dorian. Dorian sevenths at 88 — thud kick, fat snare, electric piano, celeste.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "velvet-garden";
export const title = "VELVET GARDEN";
export const slug = "velvet-garden";
export const group = "scratch";
export const seed = 4131565022;

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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . C1 . . . . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 . . C1 . C1 . C1 C1 . . C1 . | C1 . C1 C1 . . C1 . C1 . C1 C1 . . C1 .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . C1 . . . . | . . . . . . . . . . . C1 . . . .').map((v) => !!v),
      bass: seq('C2 . . C2 . . . . A#2 . . . . . . . | C2 . . C2 . . . . F2 . . . . . . .'),
      chords: chordSeq('C3min7 . . . . . . . A#3maj7 . . . . . . . | C3min7 . . . . . . . F3min7 . . . . . . .'),
      lead: seq('C5 . . . . . G5 . A5 . . . . . G5 . | D#5 . . . . . C5 . D5 . . . . . C5 .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
