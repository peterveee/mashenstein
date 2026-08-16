// SUNKEN CACTUS — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Electro — 126 BPM in C minor. Robot pop at 126: a sequenced bell arpeggio, handclaps, hollow vocoder lead.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "sunken-cactus";
export const title = "SUNKEN CACTUS";
export const slug = "sunken-cactus";
export const group = "scratch";
export const seed = 167884810;

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
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . . . . . . C1 . . . . . . . C1 | . . . . . . . C1 . . . . . . . C1').map((v) => !!v),
      bass: seq('C3 . . C3 . . C3 . C3 . . C3 . . C3 . | G#2 . . G#2 . . G#2 . G#2 . . G#2 . . G#2 .'),
      chords: chordSeq('C3min . . . . . . . . . . . . . . . | G#3 . . . . . . . . . . . . . . .'),
      twinkle: seq('. . C6 . . . D#6 . . . G6 . . . C7 . | . . C6 . . . D#6 . . . G6 . . . C7 .'),
      lead: seq('G5 . . . . . . . . . . . G5 . . . | D#5 . . . . . . . . . . . C5 . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = null;

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
