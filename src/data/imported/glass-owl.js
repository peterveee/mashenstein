// GLASS OWL — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Half-time Dirge — 72 BPM in G minor. Half the tempo and half the backbeat: reed organ, sub bass, a taiko.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "glass-owl";
export const title = "GLASS OWL";
export const slug = "glass-owl";
export const group = "scratch";
export const seed = 301250096;

export const bank = {
  bpm: 72,
  musicTrim: 2.019,
  drumGain: 0.741,
  kickVoice: "kickDeep",
  snareVoice: "snareBrush",
  tomVoice: "taiko",
  bassVoice: "subSine",
  organChordsVoice: "reedOrgan",
  leadVoice: "vibratoLead",
  starterLanes: ["kick","snare","tom","bass","organChords","lead"],
  sections: [
    {
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bass: seq('G2 . . . . . . . G2 . . . . . . . | D#2 . . . . . . . D#2 . . . . . . .'),
      organChords: chordSeq('G3min . . . . . . . G3min . . . . . . . | D#3 . . . . . . . D#3 . . . . . . .'),
      lead: seq('G4 . . . . . A#4 . . . . . . . . . | A4 . . . . . G4 . . . . . . . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
