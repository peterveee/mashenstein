// CORPORATE KOMBAT — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office";
export const title = "CORPORATE KOMBAT";
export const slug = "office-panic";
export const group = "cabinet";

export const bank = {
  bpm: 116,
  musicTrim: 0.93,
  bass: seq('G1 . G1 . B1 . B1 . C2 . C2 . D2 . D2 . | E2 . E2 . C2 . C2 . D2 . B1 . G1 . . .'),
  lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
  kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
  hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  voice: {"kickVoice":"kickEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine"},
  lanes: {
    lead: { send: { delay: 0.28 } },
  },
};

export const arrangement = null;
