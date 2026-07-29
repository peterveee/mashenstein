// RHYTHM BANKRUPTCY — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "rhythm";
export const title = "RHYTHM BANKRUPTCY";
export const slug = "rhythm-panic";
export const group = "cabinet";

export const bank = {
  bpm: 124,
  musicTrim: 1.05,
  bass: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
  lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . . | C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
  hats: seq('. . C1 . . . C1 . . . C1 . . C1 . C1 | . . C1 . . . C1 . . . C1 . . C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: -1,
  lanes: {
    lead: {
      send: {
        delay: 1,
      },
    },
  },
};

export const arrangement = null;
