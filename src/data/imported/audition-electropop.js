// ELECTROPOP AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in C minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-electropop";
export const title = "ELECTROPOP AUDITION";
export const slug = "audition-electropop";
export const group = "styleAudition";
export const seed = 368925;

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
      bass: seq('C3 . . . C4 . . . A#2 . . . A#3 . . . | G#2 . . . G#3 . . . G2 . . . G3 . . .'),
      chords: chordSeq('C3min . . C3min . . C3min . A#3 . . A#3 . . A#3 . | G#3 . . G#3 . . G#3 . G3 . . G3 . . G3 .'),
      lead: seq('C5 . D#5 . G5 . . G#5 G5 . D#5 . D5 . . D#5 | G5 . G#5 . C6 . . G#5 G5 . D#5 . D5 . . C5'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
