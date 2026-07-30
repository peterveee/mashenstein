// FROZEN DIVER — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electro — 126 BPM in A minor. Robot pop at 126: a sequenced bell arpeggio, handclaps, hollow vocoder lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "frozen-diver";
export const title = "FROZEN DIVER";
export const slug = "frozen-diver";
export const group = "scratch";
export const seed = 2106003089;

export const bank = {
  bpm: 126,
  musicTrim: 0.76,
  drumGain: 0.72,
  kickVoice: "kickClick",
  clapVoice: "clap808",
  hatsVoice: "dsHatClosed",
  rimVoice: "zap",
  bassVoice: "roundMono",
  chordsVoice: "padTriangle",
  twinkleVoice: "fmBell",
  leadVoice: "amHollow",
  starterLanes: ["kick","clap","hats","rim","bass","chords","twinkle","lead"],
  sections: [
    {
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. . . . . . C1 . . . . . . . . . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      bass: seq('A2 . . A2 . . A2 . A2 . . A2 . . A2 . | F2 . . F2 . . F2 . F2 . . F2 . . F2 .'),
      chords: chordSeq('A3min7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      twinkle: seq('E6 . C6 . A5 . C6 . E6 . C6 . A5 . C6 . | E6 . C6 . A5 . C6 . E6 . C6 . A5 . C6 .'),
      lead: seq('E5 . . . E5 . . . C5 . . . . . . . | A4 . . . C5 . . . A4 . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
