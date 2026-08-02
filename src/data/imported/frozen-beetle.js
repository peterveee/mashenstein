// FROZEN BEETLE — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Parade March — 112 BPM in F major. Major, brass and strings, snare on every beat and a taiko on the turn.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "frozen-beetle";
export const title = "FROZEN BEETLE";
export const slug = "frozen-beetle";
export const group = "scratch";
export const seed = 518211842;

export const bank = {
  bpm: 112,
  musicTrim: 0.978,
  drumGain: 1.097,
  kickVoice: "stKickThud",
  snareVoice: "stSnareFlam",
  tomVoice: "stTaiko",
  bassVoice: "stRoundMono",
  chordsVoice: "stSynthStrings",
  leadVoice: "stReedLead",
  starterLanes: ["kick","snare","tom","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('C1 C1 C1 . C1 . . . C1 C1 C1 . C1 . . . | C1 C1 C1 . C1 . . . C1 C1 C1 . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . C1 C1 . . . . . . . . | . . . . . . C1 C1 . . . . . . . .').map((v) => !!v),
      bass: seq('F2 . . . F3 . . . A#2 . A#2 . . . . . | F2 . . . F3 . . . C3 . C3 . . . . .'),
      chords: chordSeq('F3 . F3 . F3 . F3 . A#3 . A#3 . A#3 . A#3 . | F3 . F3 . F3 . F3 . C3 . C3 . C3 . C3 .'),
      lead: seq('F4 . . . C5 . A4 . C5 . . . D5 . . . | F5 . . . D5 . C5 . A4 . . . F4 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
