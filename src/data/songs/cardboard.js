// CARDBOARD KINGDOM — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "cardboard";
export const title = "CARDBOARD KINGDOM";
export const slug = "cardboard-panic";
export const group = "cabinet";

export const bank = {
  bpm: 108,
  musicTrim: 1.18,
  bass: seq('C2 . G1 . C2 . G1 . F1 . C2 . F1 . C2 . | G1 . D2 . G1 . D2 . C2 . E2 . G2 . C3 .'),
  lead: seq('E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . . | E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . .'),
  leadType: "triangle",
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('. C1 . . . C1 . C1 . C1 . . . C1 . C1 | . C1 . . . C1 . C1 . C1 . . . C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: -0.1,
  lanes: {
    lead: {
      send: {
        delay: 1,
      },
    },
  },
};

export const arrangement = null;
