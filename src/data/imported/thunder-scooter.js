// THUNDER SCOOTER — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Half-time Dirge — 72 BPM in C minor. Half the tempo and half the backbeat: reed organ, sub bass, a taiko.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "thunder-scooter";
export const title = "THUNDER SCOOTER";
export const slug = "thunder-scooter";
export const group = "scratch";
export const seed = 1435160789;

export const bank = {
  bpm: 72,
  musicTrim: 2.018,
  drumGain: 0.691,
  kickVoice: "stKickDeep",
  snareVoice: "stSnareBrush",
  tomVoice: "stTaiko",
  bassVoice: "stSubSine",
  organChordsVoice: "stReedOrgan",
  leadVoice: "stVibratoLead",
  starterLanes: ["kick","snare","tom","bass","organChords","lead"],
  sections: [
    {
      kick: seq('C1 . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      tom: seq('C1 . . . C1 . . . . . . . . . . . | C1 . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('C3 . . . . . . . . . . . . . A#2 . | G#2 . . . . . . . . . . . . . C3 .'),
      organChords: chordSeq('C3min . . . . . . . A#3 . . . . . . . | G#3 . . . . . . . C3min . . . . . . .'),
      lead: seq('C5 . . . D5 . . . D#5 . . . . . . . | G5 . . . D#5 . . . C5 . . . . . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
