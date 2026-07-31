// CRIMSON DIVER — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in E harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "crimson-diver";
export const title = "CRIMSON DIVER";
export const slug = "crimson-diver";
export const group = "scratch";
export const seed = 3389410186;

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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bass: seq('E2 . E2 . E3 . E2 . C3 . C3 . C4 . C3 . | B2 . B2 . B3 . B2 . E2 . E2 . E3 . E2 .'),
      chords: chordSeq('E3min . . . E3min . . . C3 . . . C3 . . . | B3 . . . B3 . . . E3min . . . E3min . . .'),
      lead: seq('E4 E4 F#4 G4 F#4 . E4 . B4 . B4 . A4 . G4 . | F#4 E4 G4 F#4 E4 . D#5 . E4 . F#4 . G4 . E4 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
