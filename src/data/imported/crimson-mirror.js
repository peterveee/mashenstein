// CRIMSON MIRROR — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a beat starter.
// Parade March — 112 BPM in C major. Major, brass and strings, snare on every beat and a taiko on the turn.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "crimson-mirror";
export const title = "CRIMSON MIRROR";
export const slug = "crimson-mirror";
export const group = "scratch";
export const seed = 2717321838;

export const bank = {
  bpm: 112,
  musicTrim: 0.49,
  drumGain: 1.57,
  kickVoice: "kickThud",
  snareVoice: "snareFlam",
  tomVoice: "taiko",
  starterLanes: ["kick","snare","tom"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . . . C1 . C1 . C1 . . . | C1 . C1 . C1 . . . C1 . C1 . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . C1 C1 . . . . . . . . | . . . . . . C1 C1 . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
