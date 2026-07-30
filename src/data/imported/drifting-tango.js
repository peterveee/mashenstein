// DRIFTING TANGO — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a full-band starter.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "drifting-tango";
export const title = "DRIFTING TANGO";
export const slug = "drifting-tango";
export const group = "scratch";
export const seed = 2248420335;

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  starterLanes: ["kick","snare","hats","bass","chords","lead"],
  sections: [
    {
      kick: seq('C1 . . C1 . . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . C1 C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass: [110,null,null,null,null,null,null,null,130.8127826502993,null,null,null,261.6255653005986,null,null,null,87.30705785825097,null,null,null,null,null,null,null,97.99885899543733,null,null,null,195.99771799087466,null,null,null],
      chords: [[220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null],
      lead: seq('A4 . C5 . E5 . F5 . E5 . C5 . B4 . C5 . | E5 . F5 . A5 . F5 . E5 . C5 . B4 . A4 .'),
    },
  ],
  order: [0,0,0,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
