// THE SURGE — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "surge";
export const title = "THE SURGE";
export const slug = "surge-panic";
export const group = "cabinet";

export const bank = {
  bpm: 132,
  musicTrim: 0.7,
  bass: seq('A1 A2 . A1 . A2 A1 . F1 F2 . F1 . F2 F1 . | G1 G2 . G1 . G2 G1 . E2 . E2 E2 . B2 . .'),
  lead: seq('A5 G5 E5 . A5 . G5 E5 D5 . E5 . C5 . E5 . | A5 G5 E5 . A5 . G5 E5 D5 . E5 . C5 . E5 .'),
  leadType: "sawtooth",
  kick: seq('C1 . C1 C1 . C1 C1 . C1 . C1 C1 . C1 C1 . | C1 . C1 C1 . C1 C1 . C1 . C1 C1 . C1 C1 .').map((v) => !!v),
  hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 0.9,
  lanes: {
    lead: {
      send: {
        delay: 1,
      },
    },
  },
};

export const arrangement = null;
