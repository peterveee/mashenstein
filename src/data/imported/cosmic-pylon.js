// COSMIC PYLON — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
// Techno — 136 BPM in F phrygian. Phrygian at 136: dirty kick, cowbell, acid bass rolling under one dark chord.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "cosmic-pylon";
export const title = "COSMIC PYLON";
export const slug = "cosmic-pylon";
export const group = "scratch";
export const seed = 1182134334;

export const bank = {
  bpm: 136,
  musicTrim: 1.021,
  drumGain: 1.034,
  kickVoice: "stKickDirty",
  clapVoice: "stClapTight",
  hatsVoice: "stMetalHatClosed",
  rimVoice: "stCowbell",
  bassVoice: "stAcidSquelch",
  chordsVoice: "stBreathPad",
  leadVoice: "stTpLectric",
  starterLanes: ["kick","clap","hats","rim","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . C1 | C1 . . . C1 . . . C1 . . . C1 . . C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bass: seq('. . F2 F2 . . F2 F2 . . F2 F2 . . F2 F2 | . . F#2 F#2 . . F#2 F#2 . . F#2 F#2 . . F#2 F#2'),
      chords: chordSeq('F3min . . . . . . . . . . . . . . . | F#3 . . . . . . . . . . . . . . .'),
      lead: seq('. . . . . . C5 . . . . . . . . . | . . . . . . F#4 . . . . . . . . .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
