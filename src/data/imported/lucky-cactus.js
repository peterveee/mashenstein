// LUCKY CACTUS — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in D minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "lucky-cactus";
export const title = "LUCKY CACTUS";
export const slug = "lucky-cactus";
export const group = "scratch";
export const seed = 4217541998;

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
      kick: seq('C1 . . . C1 . . C1 C1 . . . C1 . . . | C1 . . . C1 . . C1 C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      bass: seq('D3 . . . . . . . G2 . . . G3 . . . | C3 . . . . . . . D3 . . . D4 . . .'),
      chords: chordSeq('D3min . . . . . . . G3min . . . . . . . | C3 . . . . . . . D3min . . . . . . .'),
      lead: seq('A5 . A5 . F5 . D5 . F5 . A5 . A#5 . A5 . | F5 . D5 . F5 . G5 . A#5 . A5 . F5 . D5 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
