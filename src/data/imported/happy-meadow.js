// HAPPY MEADOW — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Parade March — 112 BPM in G major. Major, brass and strings, snare on every beat and a taiko on the turn.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "happy-meadow";
export const title = "HAPPY MEADOW";
export const slug = "happy-meadow";
export const group = "scratch";
export const seed = 1720345592;

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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 C1 C1 . C1 . . . C1 C1 C1 . C1 . . . | C1 C1 C1 . C1 . . . C1 C1 C1 . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . C1 C1 . . | . . . . . . . . . . . . C1 C1 . .').map((v) => !!v),
      bass: seq('G2 . . . . . . . C3 . . . . . . . | D3 . . . . . . . G2 . . . . . . .'),
      chords: chordSeq('G3 . G3 . G3 . G3 . C3 . C3 . C3 . C3 . | D3 . D3 . D3 . D3 . G3 . G3 . G3 . G3 .'),
      lead: seq('D5 . . . D5 . . . B4 . G4 . D5 . . . | G5 . . . E5 . . . D5 . B4 . G4 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
