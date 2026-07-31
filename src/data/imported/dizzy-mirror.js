// DIZZY MIRROR — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in A minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "dizzy-mirror";
export const title = "DIZZY MIRROR";
export const slug = "dizzy-mirror";
export const group = "scratch";
export const seed = 7784430;

export const bank = {
  bpm: 120,
  musicTrim: 1.147,
  drumGain: 0.927,
  kickVoice: "kickPunch",
  snareVoice: "snareCrisp",
  hatsVoice: "hatTick",
  bassVoice: "roundMono",
  chordsVoice: "fmKeys",
  leadVoice: "monoBright",
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      bass: seq('A2 . . . . . . . G2 . . . . . . . | F2 . . . . . . . E2 . . . . . . .'),
      chords: chordSeq('A3min . . A3min . . A3min . G3 . . G3 . . G3 . | F3 . . F3 . . F3 . E3 . . E3 . . E3 .'),
      lead: seq('A4 . A4 . C5 . E5 . F5 . E5 . C5 . A4 . | E5 . C5 . A4 . C5 . D5 . C5 . A4 . A4 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
