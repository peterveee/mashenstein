// NEON BLASTERS — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "neon";
export const title = "NEON BLASTERS";
export const slug = "neon-panic";
export const group = "cabinet";

export const bank = {
  bpm: 120,
  musicTrim: 0.93,
  bass: seq('A2 . E2 . A2 . E2 . F2 . C2 . F2 . C2 . | D2 . A1 . D2 . A1 . E2 . E2 . G2 . B2 .'),
  lead: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5 | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
  leadType: "sawtooth",
  kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
  hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 1.1,
  voice: {"kickVoice":"kickEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine"},
  lanes: {
    kick: { eq: { high: 15 }, effects: [{ id: "reverb" }] },
    clap: { send: { delay: 0.345, reverb: 1.38 } },
    hats: { pan: -0.402, eq: { high: 8.9 } },
    bass: { eq: { low: -6.4, mid: -4.1, high: 5.6 } },
    lead: { send: { delay: 0.28 }, effects: [{ id: "pingpong", params: { wet: 0.39, feedback: 0.23 } }] },
  },
};

export const arrangement = null;
