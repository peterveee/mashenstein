// JOLLY SIREN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in D harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "jolly-siren";
export const title = "JOLLY SIREN";
export const slug = "jolly-siren";
export const group = "scratch";
export const seed = 1618699073;

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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . C1 . C1 . . . | . . . . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bass: seq('D3 . D3 . D4 . D3 . G2 . G2 . G3 . G2 . | A2 . A2 . A3 . A2 . D3 . D3 . D4 . D3 .'),
      chords: chordSeq('D3min . . . D3min . . . G3min . . . G3min . . . | A3 . . . A3 . . . D3min . . . D3min . . .'),
      lead: seq('D5 D5 E5 F5 E5 . D5 . A5 . A5 . G5 . F5 . | E5 D5 F5 E5 D5 . C#6 . D5 . E5 . F5 . D5 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = null;

export const arrangement = null;

export const variants = null;
