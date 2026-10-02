// COUPON-CAROUSEL-GARY — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "coupon-carousel-gary";
export const title = "COUPON-CAROUSEL-GARY";
export const slug = "coupon-carousel-gary";
export const group = "audition";

export const bank = {
  bpm: 110,
  bass: seq('A2 . E3 . F#2 C#3 . F#2 . B2 . F#3 . E2 B2 . | E2 . A2 . E3 . F#2 C#3 . F#2 . B2 . E3 . E2'),
  lead: seq('C#5 . E5 F#5 . E5 C#5 . B4 . C#5 E5 . C#5 . A4 | . B4 C#5 . E5 . C#5 B4 . G#4 . B4 C#5 . B4 .'),
  chords: [[220,277.1826309768721,329.6275569128699,415.3046975799451],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null,[164.81377845643496,207.65234878997256,246.94165062806206],null,null,null,[0,0,0],null,null,null],
  sections: [
    {
      organChords: [[220,277.1826309768721,329.6275569128699,415.3046975799451],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null,[164.81377845643496,207.65234878997256,246.94165062806206],null,null,null,[0,0,0],null,null,null],
    },
    {
      bass: seq('D2 . A2 . C#3 G#2 . C#3 . F#2 . C#3 . B2 F#2 . | B2 . D2 . A2 . C#3 G#2 . C#3 . F#2 . B2 . E2'),
      lead: seq('F#4 . A4 C#5 . A4 F#4 . E4 . F#4 A4 . B4 . D5 | . C#5 B4 . A4 . F#4 E4 . G#4 . B4 C#5 . B4 .'),
      leadHarm: seq('. . . . D4 . F#4 . . . C#4 . . E4 . . | . . F#4 . . D4 . . . . C#4 . E4 . . .'),
      chords: [[146.8323839587038,184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[138.59131548843604,164.81377845643496,207.65234878997256,246.94165062806204],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,[0,0,0],null,null,null],
      organChords: [[146.8323839587038,184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[138.59131548843604,164.81377845643496,207.65234878997256,246.94165062806204],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1],
  leadType: "triangle",
  leadGain: 0.058,
  leadDur: 1.55,
  leadAttack: 0.012,
  leadHarm: seq('. . . . A4 . C#5 . . . G#4 . . B4 . . | . . C#5 . . A4 . . . . G#4 . B4 . . .'),
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
  organChords: [[220,277.1826309768721,329.6275569128699,415.3046975799451],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null,[164.81377845643496,207.65234878997256,246.94165062806206],null,null,null,[0,0,0],null,null,null],
  organGain: 0.015,
  organDur: 7.4,
  organAttack: 0.045,
  organEcho: true,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: -1.7,
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

export const arrangement = null;
