// BOOM BAP AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Boom Bap — 88 BPM in F dorian. Dorian sevenths at 88 — thud kick, fat snare, electric piano, celeste.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-boombap";
export const title = "BOOM BAP AUDITION";
export const slug = "audition-boombap";
export const group = "styleAudition";
export const seed = 368925;

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
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . C1 . . . . | . . . . . . . . . . . C1 . . . .').map((v) => !!v),
      bass: seq('F2 . . . . . . . D2 . . D2 . . . . | G2 . . . . . . . D#2 . . D#2 . . . .'),
      chords: chordSeq('. . F3min7 . . . F3min7 . . . D3maj7 . . . D3maj7 . | . . G3min7 . . . G3min7 . . . D#3 . . . D#3 .'),
      lead: seq('F4 . . . . . G#4 . C5 . . . . . G#4 . | G4 . . . . . F4 . C5 . . . . . D5 .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
