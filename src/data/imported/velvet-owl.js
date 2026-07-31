// VELVET OWL — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electropop — 120 BPM in E minor. Four-on-the-floor, eighth-note melody, the engine's own square lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "velvet-owl";
export const title = "VELVET OWL";
export const slug = "velvet-owl";
export const group = "scratch";
export const seed = 553917937;

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
      kick: seq('C1 . . . C1 . . C1 C1 . . . C1 . . . | C1 . . . C1 . . C1 C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass: seq('E2 . . . . . . . A2 . . . . . . . | D3 . . . . . . . E2 . . . . . . .'),
      chords: chordSeq('E3min . . . E3min . . . A3min . . . A3min . . . | D3 . . . D3 . . . E3min . . . E3min . . .'),
      lead: seq('E4 . . . G4 . B4 . G4 . . . E4 . G4 . | C5 . . . B4 . E4 . G4 . . . A4 . C5 .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
