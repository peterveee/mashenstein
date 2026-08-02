// THUNDER JUKEBOX — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Boom Bap — 88 BPM in A dorian. Dorian sevenths at 88 — thud kick, fat snare, electric piano, celeste.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "thunder-jukebox";
export const title = "THUNDER JUKEBOX";
export const slug = "thunder-jukebox";
export const group = "scratch";
export const seed = 1916143257;

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
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 . . C1 . C1 . C1 C1 . . C1 . | C1 . C1 C1 . . C1 . C1 . C1 C1 . . C1 .').map((v) => !!v),
      rim: seq('. . . C1 . . . C1 . . . . . . . . | . . . C1 . . . C1 . . . . . . . .').map((v) => !!v),
      bass: seq('A2 . . A2 . . . . A2 . . . . . . . | D2 . . D2 . . . . D2 . . . . . . .'),
      chords: chordSeq('A3min7 . . . . . . . . . . . . . . . | D3min7 . . . . . . . . . . . . . . .'),
      lead: seq('. . E5 . C5 . . A4 . . C5 . E5 . . . | . . F#5 . E5 . . C5 . . A4 . B4 . . .'),
    },
  ],
  order: [0,0,0,0,{"s":0,"bars":1}],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
