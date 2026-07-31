// CRYPT SHIFT — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "crypt";
export const title = "CRYPT SHIFT";
export const slug = "crypt-panic";
export const group = "cabinet";

export const bank = {
  bpm: 90,
  musicTrim: 1.6,
  bass: seq('A1 . . . A1 . . . A1 . . . C2 . B1 . | A1 . . . A1 . . . F1 . . . E1 . . .'),
  lead: seq('A4 . . . . . C5 . . . B4 . . . . . | A4 . . . . . C5 . . . B4 . . . . .'),
  leadType: "triangle",
  kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
  hats: seq('. . . C1 . . . C1 . . . C1 . . . C1 | . . . C1 . . . C1 . . . C1 . . . C1').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -0.2,
  voice: {"kickVoice":"kickEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine"},
  lanes: {
    lead: { send: { delay: 1 } },
  },
};

export const arrangement = null;
