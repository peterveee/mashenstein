// BRAVE COMET — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// House — 124 BPM in C dorian. Four-to-the-floor at 124: clap on the backbeat, open hat off it, piano stabs.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "brave-comet";
export const title = "BRAVE COMET";
export const slug = "brave-comet";
export const group = "scratch";
export const seed = 1614681486;

export const bank = {
  bpm: 124,
  musicTrim: 0.859,
  drumGain: 1.181,
  kickVoice: "stKickPunch",
  clapVoice: "stClapRoom",
  hatsVoice: "stHatTick",
  ohatsVoice: "stHatOpen",
  bassVoice: "stTpBassy",
  chordsVoice: "stTpPianoetta",
  leadVoice: "stTpBah",
  starterLanes: ["kick","clap","hats","ohats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      bass: seq('C3 . . . . . C3 . C3 . . . . . C3 . | F2 . . . . . F2 . F2 . . . . . F2 .'),
      chords: chordSeq('. . C3min7 . . . . . . . . . . . . . | . . F3min7 . . . . . . . . . . . . .'),
      lead: seq('C5 . . . . . . . G5 . . . . . . . | A5 . . . . . . . G5 . . . . . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
