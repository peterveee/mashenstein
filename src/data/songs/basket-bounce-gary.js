// BASKET-BOUNCE-GARY — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "basket-bounce-gary";
export const title = "BASKET-BOUNCE-GARY";
export const slug = "basket-bounce-gary";
export const group = "audition";

export const bank = {
  bpm: 114,
  bass: seq('F2 . C3 . D2 A2 . D2 . G2 . D3 . C2 G2 . | C2 . F2 . C3 . D2 A2 . D2 . G2 . C3 . C2'),
  lead: seq('A4 . C5 D5 . C5 A4 . G4 . A4 C5 . A4 . F4 | . G4 A4 . C5 . A4 G4 . E4 . G4 A4 . G4 .'),
  chords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[195.99771799087463,233.08188075904494,293.6647679174075,349.2282314330038],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,[0,0,0],null,null,null],
  sections: [
    {
      organChords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[195.99771799087463,233.08188075904494,293.6647679174075,349.2282314330038],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,[0,0,0],null,null,null],
    },
    {
      bass: seq('A2 . E3 . D2 A2 . D2 . G2 . D3 . C2 G2 . | C2 . A2 . E3 . D2 A2 . D2 . G2 . C3 . C2'),
      lead: seq('C5 . E5 F5 . E5 C5 . A4 . C5 E5 . C5 . A4 | . A#4 C5 . E5 . C5 A4 . G4 . A4 C5 . A4 .'),
      leadHarm: seq('. . . . A4 . C5 . . . G4 . . A#4 . . | . . C5 . . A4 . . . . G4 . A#4 . . .'),
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[195.99771799087463,233.08188075904494,293.6647679174075,349.2282314330038],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,[0,0,0],null,null,null],
      organChords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[195.99771799087463,233.08188075904494,293.6647679174075,349.2282314330038],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1],
  leadType: "triangle",
  leadGain: 0.058,
  leadDur: 1.55,
  leadAttack: 0.012,
  leadHarm: seq('. . . . F4 . A4 . . . E4 . . G4 . . | . . A4 . . F4 . . . . E4 . G4 . . .'),
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
  rimGain: 0.075,
  organChords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[195.99771799087463,233.08188075904494,293.6647679174075,349.2282314330038],null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,[0,0,0],null,null,null],
  organGain: 0.015,
  organDur: 7.4,
  organAttack: 0.045,
  organEcho: true,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 1,
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
    organChords: {
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
