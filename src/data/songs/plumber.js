// PLUMBER PANIC — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "plumber";
export const title = "PLUMBER PANIC";
export const slug = "plumber-panic";
export const group = "cabinet";

export const bank = {
  bpm: 112,
  musicTrim: 0.93,
  bass: seq('A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 . | A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 .'),
  lead: seq('A4 . C5 E5 . A4 . . F4 A4 C5 . E5 . D5 C5 | A4 . C5 E5 . G5 . . F5 E5 D5 . C5 . B4 A4'),
  leadHarm: seq('F4 . A4 C5 . F4 . . D4 F4 A4 . C5 . B4 A4 | F4 . A4 C5 . E5 . . D5 C5 B4 . A4 . G4 F4'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  sections: [
    {
      leadHarm: null,
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      echoLevel: 0,
    },
    {
      leadHarm: null,
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      echoLevel: 0.08,
      lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
    },
    {
      echoLevel: 0.14,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      keyGlissGain: 0.035,
      shout: seq('. . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .'),
      shoutGain: 0.35,
      chords: chordSeq('. . . A3min7 . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('A5 . E5 C5 . A4 . . G4 C5 E5 . D5 . D5 B4 | A5 . E5 C5 . C5 . . G4 C5 E5 . B4 . G4 A4'),
      leadHarm: seq('F5 . C5 A4 . F4 . . E4 A4 C5 . B4 . B4 G4 | F5 . C5 A4 . A4 . . E4 A4 C5 . G4 . E4 F4'),
      echoLevel: 0.2,
      chords: chordSeq('. . . A3min7 . . . . . . . . . . . . | . . . . . . . F3maj7 . . . . . . . .'),
    },
    {
      lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
      leadHarm: seq('C5 . A4 F4 . C5 . . E5 C5 A4 . B4 . G4 B4 | C5 . A4 F4 . F5 . . E5 D5 C5 . B4 . A4 G4'),
      echoLevel: 0.27,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .'),
      keyGlissGain: 0.035,
      chords: chordSeq('. . . A3min7 . . . . . . . C4maj7 . . . . | . . . A3min7 . . . . . . . C4maj7 . . . .'),
    },
    {
      echoLevel: 0.35,
      shout: seq('A3 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      shoutGain: 0.35,
      chords: chordSeq('. . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3 | . . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3'),
    },
  ],
  order: [0,0,1,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  voice: {"snareVoice":"dsCrackSnare2"},
  lanes: {
    kick: { gain: 3.2 },
    snare: { gain: 2, send: { reverb: 0.37 } },
    ohats: { eq: { high: 11 } },
  },
};

export const arrangement = {
  order: [{"s":9,"bars":1},{"s":6,"bars":1,"from":1},{"s":9,"bars":1},{"s":10,"bars":1,"from":1},{"s":7,"bars":1},{"s":8,"bars":1,"from":1},{"s":7,"bars":1},{"s":13,"bars":1,"from":1},2,3,{"s":12,"bars":1},{"s":11,"bars":1,"from":1},5],
  sections: [
    {
      base: 0,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 1,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 7,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      base: 6,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 6,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 4,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 4,
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      base: 7,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 . C1').map((v) => !!v),
    },
  ],
};
