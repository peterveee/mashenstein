// EMPTY ARCADE — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "title";
export const title = "EMPTY ARCADE";
export const slug = "title-theme";
export const group = "theme";

export const bank = {
  bpm: 56,
  musicTrim: 3.33,
  bass: seq('A2 . . . . . . . F2 . . . . . . . | C3 . . . . . . . G2 . . . . . . .'),
  bassType: "sine",
  bassGain: 0.045,
  bassDur: 7.4,
  bassAttack: 0.18,
  lead: seq('A4 . . C5 . . E5 . F4 . . A4 . . C5 . | E5 . . G5 . . E5 . D5 . . C5 . . . A4'),
  leadType: "sine",
  leadGain: 0.035,
  leadDur: 5.5,
  leadAttack: 0.16,
  leadHarm: seq('E4 . . . . . C5 . C4 . . . . . A4 . | G4 . . . . . C5 . B4 . . . . . G4 .'),
  harmType: "triangle",
  harmGain: 0.016,
  harmDur: 6.2,
  harmAttack: 0.28,
  twinkle: seq('. . . . E6 . . . . . . . . . . . | . . G6 . . . . . . . . . . . . .'),
  twinkleGain: 0.012,
  twinkleDur: 7,
  twinkleAttack: 0.06,
  keyGlissGain: 0.008,
  sweeps: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sweepGain: 0.013,
  sweepDur: 10,
  chords: chordSeq('A3min7 . . . . . . . F3maj7 . . . . . . . | C4maj7 . . . . . . . G3 . . . . . . .'),
  chordType: "triangle",
  chordGain: 0.018,
  chordDur: 7.6,
  chordAttack: 0.35,
  echoLevel: 0.52,
  sections: [
    {

    },
    {
      twinkle: seq('. . E6 . . . . . . C6 . . . . . . | . . G6 . . . . . . E6 . . . . . .'),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E6 . . .'),
      sweeps: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      twinkle: seq('. E6 . . . C6 . . . . E6 . . G6 . . | . C7 . . . E6 . . G6 . . . C6 . . .'),
      keyGliss: seq('. . . . . . . . . . . . C6 . . . | . . . . . . . . . . . . G6 . . .'),
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
    },
    {
      twinkle: seq('E6 . C6 . . E6 . G6 . . C7 . . G6 . E6 | . . C6 E6 . . G6 . C7 . . E6 . G6 . E6'),
      keyGliss: seq('. . . . . . . . . . E6 . . . . . | . . . . . . . . . . . . C7 . . .'),
      sweeps: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,0,1,1,2,2,3,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: -19.4,
  limiter: true,
  masterEffects: [
    {
      id: "compressor",
      bypass: true,
      params: {
        threshold: -12,
        ratio: 2,
        attack: 0.03,
        release: 0.25,
      },
    },
    {
      id: "reverb",
      params: {
        decay: 7,
        wet: 0.36,
        preDelay: 0.034,
      },
    },
  ],
  layers: [
    {
      key: "bass2",
      from: "bass",
    },
  ],
  voice: {
    bass2Voice: "tpAlienChorus",
  },
  lanes: {
    sweeps: {
      gain: -1.2,
      pan: 0.923,
      send: {
        delay: 0.81,
        reverb: 0.475,
      },
      eq: {
        mid: 3.3,
        high: 5.4,
      },
    },
    bass: {
      gain: 3.7,
      pan: -0.211,
      send: {
        delay: 0.31,
      },
    },
    leadHarm: {
      pan: 0.07,
      send: {
        delay: 0.53,
      },
      eq: {
        high: 5.7,
      },
    },
    twinkle: {
      pan: 0.24,
      send: {
        delay: 0.92,
      },
      eq: {
        low: -2.6,
        mid: -4.4,
        high: 3.9,
      },
    },
    keyGliss: {
      gain: 3.6,
      pan: -0.326,
      send: {
        delay: 1.04,
      },
    },
    chords: {
      gain: -2.8,
      send: {
        delay: 0.88,
        reverb: 0.61,
      },
      effects: [
        {
          id: "vibrato",
          params: {
            wet: 0.71,
          },
        },
        {
          id: "autopanner",
          params: {
            rateSync: 1,
            rateDivision: 8,
            wet: 0.74,
            depth: 0.49,
          },
        },
      ],
    },
    lead: {
      pan: -0.169,
      send: {
        delay: 0.695,
      },
    },
    bass2: {
      gain: -9,
      pan: 0.42,
      send: {
        delay: 0.31,
      },
    },
  },
};

export const arrangement = null;
