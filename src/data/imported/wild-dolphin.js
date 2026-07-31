// WILD DOLPHIN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in A harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "wild-dolphin";
export const title = "WILD DOLPHIN";
export const slug = "wild-dolphin";
export const group = "scratch";
export const seed = 2936299421;

export const bank = {
  bpm: 152,
  musicTrim: 0.71,
  drumGain: 1.16,
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
      snare: seq('. . . . C1 . . . . . C1 . C1 . . . | . . . . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bass: seq('A2 . . . A3 . A2 . E2 . . . E3 . . . | A2 . . . A3 . A2 . E2 . . . E3 . . .'),
      chords: chordSeq('A3min . . . . . . . E3 . . . . . . . | A3min . . . . . . . E3 . . . . . . .'),
      lead: seq('A4 . A4 . B4 . C5 . B4 . A4 . E5 . E5 . | D5 . C5 . B4 . A4 . C5 . B4 . A4 . G#5 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
