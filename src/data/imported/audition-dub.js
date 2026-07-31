// DUB CHAMBER AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Dub Chamber — 76 BPM in D minor. One drop at 76, organ on the offbeat, and everything in the echo.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-dub";
export const title = "DUB CHAMBER AUDITION";
export const slug = "audition-dub";
export const group = "styleAudition";
export const seed = 368925;

export const bank = {
  bpm: 76,
  musicTrim: 1.552,
  drumGain: 1.488,
  echoLevel: 0.5,
  bassEcho: true,
  kickVoice: "stKickDeep",
  snareVoice: "stSnareCrisp",
  hatsVoice: "stHatSizzle",
  bassVoice: "stFmGrowl",
  organChordsVoice: "stAmOrgan",
  leadVoice: "stGlassLead",
  starterLanes: ["kick","snare","hats","bass","organChords","lead"],
  sections: [
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . A#2 . . . . . | D2 . . . . . . . . . C3 . . . . .'),
      organChords: chordSeq('. . . . . . D3min . . . . . . . A#3 . | . . . . . . D3min . . . . . . . C3 .'),
      lead: seq('. . . . . . D5 . F5 . . . . . . . | . . . . . . A5 . F5 . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
