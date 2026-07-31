// BITTER LULLABY — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in D harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "bitter-lullaby";
export const title = "BITTER LULLABY";
export const slug = "bitter-lullaby";
export const group = "scratch";
export const seed = 3866430408;

export const bank = {
  bpm: 152,
  musicTrim: 0.689,
  drumGain: 1.285,
  kickVoice: "kickTight",
  snareVoice: "snareRim",
  hatsVoice: "hatTick",
  rimVoice: "clave",
  bassVoice: "tpBassGuitar",
  chordsVoice: "clav",
  leadVoice: "synthPluck",
  starterLanes: ["kick","snare","hats","rim","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . C1 . . . . . | C1 . . . C1 . . . C1 . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bass: seq('D3 . D3 . . . D3 . G2 . G2 . . . G2 . | A2 . A2 . . . A2 . D3 . D3 . . . D3 .'),
      chords: chordSeq('. . D3min . . . D3min . . . G3min . . . G3min . | . . A3 . . . A3 . . . D3min . . . D3min .'),
      lead: seq('A5 . G5 . F5 . E5 . D5 . E5 . F5 . G5 . | A5 . A#5 . C#6 . D6 . C#6 . A#5 . A5 . G5 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
