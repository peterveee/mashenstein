// ELECTRIC TANGO — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "electric-tango";
export const title = "ELECTRIC TANGO";
export const slug = "electric-tango";
export const group = "scratch";
export const seed = 3633055451;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . . C1 . . C1 C1 . . . C1 . . . | C1 . . . C1 . . C1 C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      bass: seq('A2 . . . . . . . F2 . . . . . . . | C3 . . . . . . . G2 . . . . . . .'),
      chords: [[220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null],
      lead: seq('A4 . A4 . C5 . E5 . F5 . E5 . C5 . A4 . | E5 . C5 . A4 . C5 . D5 . C5 . A4 . A4 .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
