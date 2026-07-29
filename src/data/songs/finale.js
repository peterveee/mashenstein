// ONE MORE SWITCH — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "finale";
export const title = "ONE MORE SWITCH";
export const slug = "finale-theme";
export const group = "theme";

export const bank = {
  bpm: 126,
  musicTrim: 0.95,
  bassType: "square",
  bassDur: 0.95,
  bassGain: 0.2,
  bassAttack: 0.001,
  chordType: "square",
  chordDur: 0.32,
  chordGain: 0.09,
  chordAttack: 0.005,
  twinkle: seq('E6 . . . . . . . . . . . . . . . | E6 . . . . . . . . . . . . . . .'),
  twinkleGain: 0.05,
  twinkleDur: 0.22,
  twinkleAttack: 0.004,
  echoLevel: 0.22,
  bass: seq('. . A3 . A3 . E3 . . . G3 . G3 . D3 . | . . A3 . A3 . E3 . . . G3 . G3 . B3 .'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
  sections: [
    {
      rim: seq('C1 . . C1 . . . . C1 . . C1 . . . . | C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v),
    },
    {
      bass: null,
      rim: seq('C1 . . C1 . . . . C1 . . C1 . . . . | C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
    },
    {
      bass: null,
      kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
      chordType: "triangle",
      chordDur: 3.2,
      chordGain: 0.05,
      echoLevel: 0.55,
      gliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . G5 . . .'),
    },
    {
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
      chordType: "sawtooth",
      chordDur: 0.28,
      chordGain: 0.1,
      bass: seq('A1 . . . . . A1 . E1 . . . . . E1 . | G1 . . . . . G1 . D1 . . . . . D1 .'),
      bassType: "sawtooth",
      bassDur: 3.2,
      bassGain: 0.19,
      bassRepeat: 3,
      bassRepeatGain: 0.38,
      bassRepeatDur: 0.7,
      sweeps: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      sweepDur: 12,
      sweepGain: 0.016,
    },
    {
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
      chordType: "sawtooth",
      chordDur: 0.28,
      chordGain: 0.1,
      bass: seq('A1 . . . . . A1 . E1 . . . . . E1 . | G1 . . . . . G1 . D1 . . . . . D1 .'),
      bassType: "sawtooth",
      bassDur: 3.2,
      bassGain: 0.19,
      bassRepeat: 3,
      bassRepeatGain: 0.38,
      bassRepeatDur: 0.7,
      sweeps: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      sweepDur: 12,
      sweepGain: 0.016,
      lead: seq('A4 . C5 . E5 . C5 . E4 . G4 . B4 . G4 . | G4 . B4 . D5 . B4 . D4 . F#4 . A4 . F#4 .'),
      leadType: "sawtooth",
      leadDur: 1.7,
      leadGain: 0.08,
      leadAttack: 0.006,
    },
    {
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
      chordType: "sawtooth",
      chordDur: 0.28,
      chordGain: 0.1,
      bass: seq('A1 . . . . . A1 . E1 . . . . . E1 . | G1 . . . . . G1 . D1 . . . . . D1 .'),
      bassType: "sawtooth",
      bassDur: 3.2,
      bassGain: 0.19,
      bassRepeat: 3,
      bassRepeatGain: 0.38,
      bassRepeatDur: 0.7,
      sweeps: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      sweepDur: 12,
      sweepGain: 0.016,
      lead: seq('A4 . C5 . E5 . C5 . E4 . G4 . B4 . G4 . | G4 . B4 . D5 . B4 . D4 . F#4 . A4 . F#4 .'),
      leadType: "sawtooth",
      leadDur: 1.7,
      leadGain: 0.08,
      leadAttack: 0.006,
      vox: seq('. . . . . . A3 . . . . . . . . . | . . . . . . A3 . . . . . . . . .'),
    },
    {
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
      chordType: "sawtooth",
      chordDur: 0.28,
      chordGain: 0.1,
      bass: seq('A1 . . . . . A1 . E1 . . . . . E1 . | G1 . . . . . G1 . D1 . . . . . D1 .'),
      bassType: "sawtooth",
      bassDur: 3.2,
      bassGain: 0.19,
      bassRepeat: 3,
      bassRepeatGain: 0.38,
      bassRepeatDur: 0.7,
      sweeps: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      sweepDur: 12,
      sweepGain: 0.016,
      lead: seq('A5 . C6 . E6 . C6 . E5 . G5 . B5 . G5 . | G5 . B5 . D6 . B5 . D5 . F#5 . A5 . F#5 .'),
      leadType: "sawtooth",
      leadDur: 1.7,
      leadGain: 0.09,
      leadAttack: 0.006,
      vox: seq('. . . . . . A3 . . . . . . . . . | . . . . . . A3 . . . . . . . . .'),
    },
    {
      kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      sweeps: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: null,
      rim: seq('C1 . . C1 . . . . C1 . . C1 . . . . | C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v),
    },
    {
      bass: null,
      rim: seq('C1 . . C1 . . . . C1 . . C1 . . . . | C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      crashDur: 7,
      crashGain: 0.1,
      crashEcho: true,
    },
    {
      rim: seq('C1 . . C1 . . . . C1 . . C1 . . . . | C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: null,
      chords: chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . | G3maj7 . . . . . . . D3 . . . . . . .'),
      chordType: "triangle",
      chordDur: 3.2,
      chordGain: 0.05,
      echoLevel: 0.55,
      gliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . G5 . . .'),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim: seq('C1 . . C1 . . . . C1 . . C1 . . . . | C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v),
    },
  ],
  order: [8,9,0,0,10,10,2,2,2,2,4,4,5,5,6,6,5,6,2,2,11,11,4,4,5,5,6,6,5,6,2,2,11,11,4,4,5,5,6,6,6,6,7,0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: -0.5,
  lanes: {
    kick: {
      gain: -2,
    },
    clap: {
      gain: -2,
    },
    hats: {
      gain: -2,
    },
    lead: {
      send: {
        delay: 1,
      },
    },
    twinkle: {
      send: {
        delay: 1,
      },
    },
    chords: {
      send: {
        delay: 1,
      },
    },
    gliss: {
      send: {
        delay: 1,
      },
    },
    sweeps: {
      send: {
        delay: 1,
      },
    },
    rim: {
      send: {
        delay: 1,
      },
    },
    crash: {
      send: {
        delay: 1,
      },
    },
  },
};

export const arrangement = null;
