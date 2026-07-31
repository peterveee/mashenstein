// SILENT ROCKET — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Surf Spy — 152 BPM in D harmonic minor. Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "silent-rocket";
export const title = "SILENT ROCKET";
export const slug = "silent-rocket";
export const group = "scratch";
export const seed = 1757572199;

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
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bass: seq('D3 . D3 . D4 . D3 . A2 . A2 . A3 . A2 . | D3 . D3 . D4 . D3 . A2 . A2 . A3 . A2 .'),
      chords: chordSeq('D3min . . . D3min . . . A3 . . . A3 . . . | D3min . . . D3min . . . A3 . . . A3 . . .'),
      lead: seq('D5 . D5 E5 F5 . E5 . D5 . . . A5 . . . | A5 . G5 F5 E5 . D5 . F5 . . . E5 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
