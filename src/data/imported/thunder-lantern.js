// THUNDER LANTERN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Dub Chamber — 76 BPM in E minor. One drop at 76, organ on the offbeat, and everything in the echo.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "thunder-lantern";
export const title = "THUNDER LANTERN";
export const slug = "thunder-lantern";
export const group = "scratch";
export const seed = 1852474556;

export const bank = {
  bpm: 76,
  musicTrim: 0.88,
  drumGain: 0.77,
  echoLevel: 0.5,
  bassEcho: true,
  kickVoice: "kickDeep",
  snareVoice: "snareCrisp",
  hatsVoice: "hatSizzle",
  bassVoice: "fmGrowl",
  organChordsVoice: "amOrgan",
  leadVoice: "glassLead",
  starterLanes: ["kick","snare","hats","bass","organChords","lead"],
  sections: [
    {
      kick: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bass: seq('E2 . . . . . E2 . E2 . E2 . . . . . | A2 . . . . . A2 . A2 . A2 . . . . .'),
      organChords: chordSeq('. . E3min . . . . . . . . . . . . . | . . A3min . . . . . . . . . . . . .'),
      lead: seq('E4 . . . . . B4 . . . . . C5 . . . | B4 . . . . . G4 . . . . . E4 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
