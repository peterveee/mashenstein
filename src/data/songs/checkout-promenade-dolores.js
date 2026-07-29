// CHECKOUT-PROMENADE-DOLORES — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "checkout-promenade-dolores";
export const title = "CHECKOUT-PROMENADE-DOLORES";
export const slug = "checkout-promenade-dolores";
export const group = "audition";

export const bank = {
  bpm: 108,
  bass: seq('C2 . G2 . A2 . E2 . D2 . A2 . G2 . D2 . | C2 . G2 . A2 . E2 . F2 . G2 . G2 . B2 .'),
  lead: seq('E4 . G4 . A4 G4 . E4 . D4 . F4 A4 . G4 . | . . E4 G4 . C5 . B4 G4 . F4 . D4 F4 . G4'),
  chords: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
  sections: [
    {

    },
    {
      bass: seq('F2 . C3 . E2 . B2 . A2 . E3 . D2 . A2 . | F2 . C3 . E2 . B2 . D2 . G2 . G2 . B2 .'),
      lead: seq('A4 . C5 . E5 . C5 A4 . G4 . B4 . D5 B4 . | A4 . . . C5 B4 . A4 . E5 . D5 B4 . A4 .'),
      leadHarm: seq('. . . . F4 . A4 . . . . . G4 . B4 . | . . . . A4 . C5 . . . . . G4 . D4 .'),
      chords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1],
  leadType: "triangle",
  leadGain: 0.052,
  leadDur: 0.82,
  leadAttack: 0.006,
  harmType: "sine",
  harmGain: 0.018,
  harmDur: 0.72,
  bassType: "triangle",
  bassGain: 0.075,
  bassDur: 1.25,
  chordType: "triangle",
  chordGain: 0.027,
  chordDur: 0.82,
  chordAttack: 0.008,
  kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
  kickGain: 0.34,
  kickTail: 0.12,
  kickKnock: 0.38,
  rim: seq('. . . C1 . . . . . . C1 . . . . . | . . . C1 . . . . . . C1 . . . . .').map((v) => !!v),
  rimGain: 0.085,
  rimEcho: 0.04,
  hats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
  echoLevel: 0.12,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 6.6,
  lanes: {
    lead: {
      send: {
        delay: 1,
      },
    },
    leadHarm: {
      send: {
        delay: 1,
      },
    },
    chords: {
      send: {
        delay: 1,
      },
    },
    rim: {
      send: {
        delay: 1,
      },
    },
  },
};

export const arrangement = null;
