// BASKET-BOUNCE-DOLORES — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "basket-bounce-dolores";
export const title = "BASKET-BOUNCE-DOLORES";
export const slug = "basket-bounce-dolores";
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
  master: 5.8,
  voice: {
    chordsVoice: "hornSwell",
  },
  lanes: {
    lead: {
      send: {
        delay: 0.12,
      },
    },
    leadHarm: {
      send: {
        delay: 0.12,
      },
    },
    chords: {
      gain: 6,
      send: {
        delay: 0.12,
        reverb: 1.295,
      },
      eq: {
        high: 9.4,
      },
    },
    organChords: {
      send: {
        delay: 0.12,
      },
    },
    rim: {
      send: {
        delay: 0.0048,
      },
    },
  },
};

export const arrangement = {
  order: [{"s":0,"bars":1,"from":1,"off":["hats","kick","rim"]},{"s":0,"bars":1,"from":1},{"s":0,"bars":1,"from":1,"off":["hats"]},{"s":0,"bars":1,"from":1,"off":["hats"]},{"s":0,"bars":1,"from":1,"off":["hats","rim"]},{"s":0,"bars":1,"from":1,"off":["hats"]},{"s":0,"bars":1,"from":1,"off":["hats"]},{"s":0,"bars":1,"from":1},{"s":0,"off":["hats","rim"]},{"s":0,"off":["hats"]},{"s":0,"off":["hats"]},{"s":0,"off":["hats"]},{"s":0,"off":["hats"]},0,0,1,1],
};
