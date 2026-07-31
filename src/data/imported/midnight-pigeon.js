// MIDNIGHT PIGEON — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in A minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "midnight-pigeon";
export const title = "MIDNIGHT PIGEON";
export const slug = "midnight-pigeon";
export const group = "scratch";
export const seed = 3239407375;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  kickVoice: "kickPunch",
  snareVoice: "snareCrisp",
  hatsVoice: "hatTick",
  bassVoice: "roundMono",
  chordsVoice: "fmKeys",
  leadVoice: "monoBright",
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . C1 . . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . C1 C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      bass: seq('A2 . . . . . . . D3 . . . . . . . | G2 . . . . . . . A2 . . . . . . .'),
      chords: chordSeq('A3min . . . . . . . D3min . . . . . . . | G3 . . . . . . . A3min . . . . . . .'),
      lead: seq('E5 . E5 . C5 . . A4 C5 . E5 . F5 . . E5 | C5 . A4 . C5 . . D5 F5 . E5 . C5 . . A4'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
