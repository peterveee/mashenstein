// CRIMSON CAROUSEL — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in B harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "crimson-carousel";
export const title = "CRIMSON CAROUSEL";
export const slug = "crimson-carousel";
export const group = "scratch";
export const seed = 3689714335;

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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bass: seq('B2 . . . B3 . B2 . G2 . . . G3 . . . | F#2 . . . F#3 . F#2 . B2 . . . B3 . . .'),
      chords: chordSeq('. . B3min . . . B3min . . . G3 . . . G3 . | . . F#3 . . . F#3 . . . B3min . . . B3min .'),
      lead: seq('B4 . C#5 D5 F#5 . D5 . C#5 . . . B4 . . . | A#5 . B4 C#5 D5 . F#5 . G5 . . . F#5 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
