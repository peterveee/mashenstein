// HAUNTED SIREN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Boom Bap — 88 BPM in G dorian. Dorian sevenths at 88 — thud kick, fat snare, electric piano, celeste.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "haunted-siren";
export const title = "HAUNTED SIREN";
export const slug = "haunted-siren";
export const group = "scratch";
export const seed = 2000690318;

export const bank = {
  bpm: 88,
  musicTrim: 1.249,
  drumGain: 1.086,
  kickVoice: "stKickThud",
  snareVoice: "stSnareFat",
  hatsVoice: "stHatPedal",
  rimVoice: "stDsRim",
  bassVoice: "stRubberBass",
  chordsVoice: "stEpiano",
  leadVoice: "stCeleste",
  starterLanes: ["kick","snare","hats","rim","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . C1 . . . . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. . . C1 . . . C1 . . . . . . . . | . . . C1 . . . C1 . . . . . . . .').map((v) => !!v),
      bass: seq('G2 . . . . . . . E2 . . E2 . . . . | A2 . . . . . . . F2 . . F2 . . . .'),
      chords: chordSeq('G3min7 . . . . . G3min7 . E3maj7 . . . . . E3maj7 . | A3min7 . . . . . A3min7 . F3 . . . . . F3 .'),
      lead: seq('G4 . . D5 . . E5 . D5 . . A#4 . . G4 . | A4 . . G4 . . A#4 . D5 . . A#4 . . G4 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
