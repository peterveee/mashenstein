// AFTER-HOURS-LAYAWAY-DOLORES — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "after-hours-layaway-dolores";
export const title = "AFTER-HOURS-LAYAWAY-DOLORES";
export const slug = "after-hours-layaway-dolores";
export const group = "audition";

export const bank = {
  bpm: 96,
  bass: seq('D2 . . A2 . . B2 . F#2 . . G2 . . D2 . | A2 . . D2 . . A2 . . B2 . F#2 . . G2 .'),
  lead: seq('F#4 . . A4 . D5 . . C#5 . A4 . . E4 F#4 . | . . A4 . . B4 . F#4 . . E4 . D4 . . .'),
  chords: [[146.8323839587038,184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038,184.9972113558172],null,null,null,null,null,null,null,[110,138.59131548843604,164.81377845643496],null,null,null,[0,0,0],null,null,null],
  sections: [
    {

    },
    {
      bass: seq('G2 . . D3 . . F#2 . C#3 . . B2 . . F#2 . | E2 . . G2 . . D3 . . F#2 . C#3 . . E2 .'),
      lead: seq('B4 . . D5 . F#5 . . E5 . D5 . . A4 B4 . | . . D5 . . E5 . B4 . . A4 . F#4 . . .'),
      leadHarm: seq('. . D4 . . B4 . . . . A4 . . F#4 . . | . . B4 . . G4 . . . . F#4 . . D4 . .'),
      chords: [[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,[123.47082531403103,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[0,0,0],null,null,null],
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
  hats: seq('. . . . . . . . . . C1 . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
  echoLevel: 0.12,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 9.3,
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
