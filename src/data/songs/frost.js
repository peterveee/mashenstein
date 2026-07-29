// FROST FORTRESS — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "frost";
export const title = "FROST FORTRESS";
export const slug = "frost-panic";
export const group = "cabinet";

export const bank = {
  bpm: 100,
  musicTrim: 1.74,
  bass: seq('D2 . . . A2 . . . B1 . . . F2 . . . | G1 . . . D2 . . . G2 . . . A2 . . .'),
  lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'),
  leadType: "triangle",
  kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
  hats: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
  snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -0.7,
  lanes: {
    lead: { send: { delay: 1 } },
  },
};

export const arrangement = {
  order: [
    {
      s: 1,
      bars: 1,
    },
    {
      s: 0,
      bars: 1,
      from: 1,
    },
  ],
  sections: [
    {

    },
    {
      base: 0,
      kick: seq('C1 . . . . . C1 . . . . . . . C1 . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
};
