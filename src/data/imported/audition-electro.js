// ELECTRO AUDITION — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electro — 126 BPM in A minor. Robot pop at 126: a sequenced bell arpeggio, handclaps, hollow vocoder lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "audition-electro";
export const title = "ELECTRO AUDITION";
export const slug = "audition-electro";
export const group = "styleAudition";
export const seed = 368925;

export const bank = {
  bpm: 126,
  musicTrim: 0.81,
  drumGain: 1.288,
  kickVoice: "stKickClick",
  clapVoice: "stClap808",
  hatsVoice: "stDsHatClosed",
  rimVoice: "stZap",
  bassVoice: "stRoundMono",
  chordsVoice: "stPadTriangle",
  twinkleVoice: "stFmBell",
  leadVoice: "stAmHollow",
  starterLanes: ["kick","clap","hats","rim","bass","chords","twinkle","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . C1 . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('. . . . . . . C1 . . . . . . . C1 | . . . . . . . C1 . . . . . . . C1').map((v) => !!v),
      bass: seq('A2 . . A2 . . A2 . A2 . . A2 . . A2 . | F2 . . F2 . . F2 . F2 . . F2 . . F2 .'),
      chords: chordSeq('A3min7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      twinkle: seq('E6 C6 A5 C6 E6 C6 A5 C6 E6 C6 A5 C6 E6 C6 A5 C6 | E6 C6 A5 C6 E6 C6 A5 C6 E6 C6 A5 C6 E6 C6 A5 C6'),
      lead: seq('A4 . . . . . . . . . . . C5 . . . | E5 . . . . . . . . . . . C5 . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
