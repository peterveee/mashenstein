// ELECTRIC LANTERN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electro — 126 BPM in C minor. Robot pop at 126: a sequenced bell arpeggio, handclaps, hollow vocoder lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "electric-lantern";
export const title = "ELECTRIC LANTERN";
export const slug = "electric-lantern";
export const group = "scratch";
export const seed = 3523902689;

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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. . . . . . . C1 . . . . . . . C1 | . . . . . . . C1 . . . . . . . C1').map((v) => !!v),
      bass: seq('C3 . . . . . . . C3 . . . . . . . | G#2 . . . . . . . G#2 . . . . . . .'),
      chords: chordSeq('C3min . . . . . . . . . . . . . . . | G#3 . . . . . . . . . . . . . . .'),
      twinkle: seq('G6 D#6 C6 D#6 G6 D#6 C6 D#6 G6 D#6 C6 D#6 G6 D#6 C6 D#6 | G6 D#6 C6 D#6 G6 D#6 C6 D#6 G6 D#6 C6 D#6 G6 D#6 C6 D#6'),
      lead: seq('C5 . . . . . . . C5 . . . . . . . | G5 . . . . . . . D#5 . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
