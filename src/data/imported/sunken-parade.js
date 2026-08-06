// SUNKEN PARADE — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in G minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "sunken-parade";
export const title = "SUNKEN PARADE";
export const slug = "sunken-parade";
export const group = "scratch";
export const seed = 463582355;

export const bank = {
  bpm: 120,
  musicTrim: 1.147,
  drumGain: 0.926,
  kickVoice: "stKickPunch",
  snareVoice: "stSnareCrisp",
  hatsVoice: "stHatTick",
  bassVoice: "stRoundMono",
  chordsVoice: "stFmKeys",
  leadVoice: "stMonoBright",
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . C1 . C1 . . . | C1 . . . C1 . . . C1 . C1 . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass: seq('G2 . . . G3 . . . D#3 . . . D#4 . . . | A#2 . . . A#3 . . . F2 . . . F3 . . .'),
      chords: chordSeq('G3min . . . G3min . . . D#3 . . . D#3 . . . | A#3 . . . A#3 . . . F3 . . . F3 . . .'),
      lead: seq('G4 . . . A#4 . D5 . A#4 . . . G4 . A#4 . | D#5 . . . D5 . G4 . A#4 . . . C5 . D#5 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
