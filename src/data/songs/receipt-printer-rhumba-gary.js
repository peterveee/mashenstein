// RECEIPT-PRINTER-RHUMBA-GARY — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "receipt-printer-rhumba-gary";
export const title = "RECEIPT-PRINTER-RHUMBA-GARY";
export const slug = "receipt-printer-rhumba-gary";
export const group = "audition";

export const bank = {
  bpm: 116,
  bass: seq('D#2 . A#2 . C3 . G2 . F2 . C3 . A#2 . F2 . | D#2 . A#2 . C3 . G2 . G#2 . A#2 . A#2 . D3 .'),
  lead: seq('G4 . A#4 G4 . D#5 . C5 A#4 . G4 . F4 G4 . A#4 | . . D#5 . D5 A#4 . G4 . F4 G4 A#4 . G4 . D#4'),
  chords: [[155.56349186104046,195.99771799087466,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,[130.8127826502993,155.56349186104043,195.99771799087463,233.08188075904494],null,null,null,null,null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,311.1269837220809],null,null,null,null,null,null,null,[116.54094037952248,146.8323839587038,174.61411571650194],null,null,null,[0,0,0],null,null,null],
  sections: [
    {

    },
    {
      bass: seq('G#2 . D#3 . G2 . D3 . C3 . G3 . F2 . C3 . | G#2 . D#3 . G2 . D3 . F2 . A#2 . A#2 . D3 .'),
      lead: seq('C5 . D#5 . G5 D#5 . C5 . A#4 . D5 . F5 D5 . | C5 . . . D#5 D5 . C5 . G5 . F5 D#5 . C5 .'),
      leadHarm: seq('. D#4 . . . C5 . . . . G4 . . A#4 . . | . . D#5 . . . C5 . . . G4 . . A#4 . .'),
      chords: [[207.65234878997256,261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,[195.99771799087463,233.08188075904494,293.6647679174075,349.2282314330038],null,null,null,null,null,null,null,[130.8127826502993,155.56349186104043,195.99771799087463,233.08188075904494],null,null,null,null,null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,311.1269837220809],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1],
  leadType: "triangle",
  leadGain: 0.058,
  leadDur: 1.55,
  leadAttack: 0.012,
  leadHarm: seq('. A#3 . . . G4 . . . . D#4 . . F4 . . | . . A#4 . . . G4 . . . D#4 . . F4 . .'),
  harmType: "sine",
  harmGain: 0.026,
  harmDur: 1.35,
  bassType: "sine",
  bassGain: 0.105,
  bassDur: 1.85,
  bassRepeat: 3,
  bassRepeatGain: 0.22,
  bassRepeatDur: 0.55,
  chordType: "triangle",
  chordGain: 0.038,
  chordDur: 1.75,
  chordAttack: 0.02,
  kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
  kickGain: 0.45,
  kickTail: 0.15,
  kickKnock: 0.5,
  hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  twinkle: seq('. . . . . . . . G5 . . . . . . . | . . . . . . . . C6 . . . . . . .'),
  twinkleGain: 0.011,
  twinkleDur: 2.4,
  echoLevel: 0.2,
  rim: seq('. . . C1 . . . . . . C1 . . . . . | . . . C1 . . . . . . C1 . . . . .').map((v) => !!v),
  rimGain: 0.1,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 1.8,
  lanes: {
    lead: {
      send: {
        delay: 0.2,
      },
    },
    leadHarm: {
      send: {
        delay: 0.2,
      },
    },
    twinkle: {
      send: {
        delay: 0.2,
      },
    },
    chords: {
      send: {
        delay: 0.2,
      },
    },
    rim: {
      send: {
        delay: 0.06,
      },
    },
  },
};

export const arrangement = null;
