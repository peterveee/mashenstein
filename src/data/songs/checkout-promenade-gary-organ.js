// CHECKOUT-PROMENADE-GARY-ORGAN — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "checkout-promenade-gary-organ";
export const title = "CHECKOUT-PROMENADE-GARY-ORGAN";
export const slug = "checkout-promenade-gary-organ";
export const group = "audition";

export const bank = {
  bpm: 108,
  bass: seq('C2 . G2 . A2 . E2 . D2 . A2 . G2 . D2 . | C2 . G2 . A2 . E2 . F2 . G2 . G2 . B2 .'),
  lead: seq('E4 . G4 . A4 G4 . E4 . D4 . F4 A4 . G4 . | . . E4 G4 . C5 . B4 G4 . F4 . D4 F4 . G4'),
  chords: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
  sections: [
    {
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
    },
    {
      bass: seq('F2 . C3 . E2 . B2 . A2 . E3 . D2 . A2 . | F2 . C3 . E2 . B2 . D2 . G2 . G2 . B2 .'),
      lead: seq('A4 . C5 . E5 . C5 A4 . G4 . B4 . D5 B4 . | A4 . . . C5 B4 . A4 . E5 . D5 B4 . A4 .'),
      leadHarm: seq('. . . . F4 . A4 . . . . . G4 . B4 . | . . . . A4 . C5 . . . . . G4 . D4 .'),
      chords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,[0,0,0],null,null,null],
      organChords: [null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[0,0,0],null,[0,0,0]],
    },
  ],
  order: [0,0,1,1],
  leadType: "triangle",
  leadGain: 0.058,
  leadDur: 1.55,
  leadAttack: 0.012,
  leadHarm: seq('. . . . C4 . E4 . . . . . D4 . F4 . | . . . . E4 . G4 . . . . . D4 . B3 .'),
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
  organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
  organGain: 0.017,
  organDur: 1.18,
  organAttack: 0.004,
  organEcho: false,
  organBright: true,
  organPercussion: true,
  organPercussionDur: 0.52,
  organPercussionGain: 0.78,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 1.3,
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
    organChords: {
      send: {
        delay: 1,
      },
    },
  },
};

export const arrangement = {
  order: [{"s":0,"bars":1,"off":["snare"]},{"s":0,"bars":1,"from":1},0,1,1],
};
