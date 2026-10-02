// AFTER-HOURS-LAYAWAY-GARY-ORGAN — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "after-hours-layaway-gary-organ";
export const title = "AFTER-HOURS-LAYAWAY-GARY-ORGAN";
export const slug = "after-hours-layaway-gary-organ";
export const group = "audition";

export const bank = {
  bpm: 96,
  bass: seq('D2 . . A2 . . B2 . F#2 . . G2 . . D2 . | A2 . . D2 . . A2 . . B2 . F#2 . . G2 .'),
  lead: seq('F#4 . . A4 . D5 . . C#5 . A4 . . E4 F#4 . | . . A4 . . B4 . F#4 . . E4 . D4 . . .'),
  chords: [[146.8323839587038,184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038,184.9972113558172],null,null,null,null,null,null,null,[110,138.59131548843604,164.81377845643496],null,null,null,[0,0,0],null,null,null],
  sections: [
    {
      organChords: [[146.8323839587038,184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038,184.9972113558172],null,null,null,null,null,null,null,[110,138.59131548843604,164.81377845643496],null,null,null,[0,0,0],null,null,null],
    },
    {
      bass: seq('G2 . . D3 . . F#2 . C#3 . . B2 . . F#2 . | E2 . . G2 . . D3 . . F#2 . C#3 . . E2 .'),
      lead: seq('B4 . . D5 . F#5 . . E5 . D5 . . A4 B4 . | . . D5 . . E5 . B4 . . A4 . F#4 . . .'),
      leadHarm: seq('. . D4 . . B4 . . . . A4 . . F#4 . . | . . B4 . . G4 . . . . F#4 . . D4 . .'),
      chords: [[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[0,0,0],null,null,null],
      organChords: [[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1],
  leadType: "triangle",
  leadGain: 0.058,
  leadDur: 1.55,
  leadAttack: 0.012,
  leadHarm: seq('. . A3 . . F#4 . . . . E4 . . C#4 . . | . . F#4 . . D4 . . . . C#4 . . A3 . .'),
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
  ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
  organChords: [[146.8323839587038,184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038,184.9972113558172],null,null,null,null,null,null,null,[110,138.59131548843604,164.81377845643496],null,null,null,[0,0,0],null,null,null],
  organGain: 0.015,
  organDur: 7.4,
  organAttack: 0.045,
  organEcho: true,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 2.1,
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
  },
};

export const arrangement = {
  order: [{"s":0,"bars":1,"from":1,"off":["hats","kick","ohats","snare"]},0,0,0,1,1],
};
