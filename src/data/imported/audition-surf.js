// SURF SPY AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in A harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-surf";
export const title = "SURF SPY AUDITION";
export const slug = "audition-surf";
export const group = "styleAudition";
export const seed = 368925;

export const bank = {
  bpm: 152,
  musicTrim: 0.689,
  drumGain: 1.283,
  kickVoice: "stKickTight",
  snareVoice: "stSnareRim",
  hatsVoice: "stHatTick",
  rimVoice: "stClave",
  bassVoice: "stTpBassGuitar",
  chordsVoice: "stClav",
  leadVoice: "stSynthPluck",
  starterLanes: ["kick","snare","hats","rim","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . C1 . . . . . | C1 . . . C1 . . . C1 . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bass: seq('A2 . . . A3 . A2 . D3 . . . D4 . . . | E2 . . . E3 . E2 . A2 . . . A3 . . .'),
      chords: chordSeq('. . A3min . . . A3min . . . D3min . . . D3min . | . . E3 . . . E3 . . . A3min . . . A3min .'),
      lead: seq('A4 B4 C5 E5 C5 . B4 . A4 . G#5 . A4 . B4 . | C5 E5 F5 E5 C5 . B4 . A4 . G#5 . A4 . A4 .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
