// SERVICE-BELL-STROLL-DOLORES — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "service-bell-stroll-dolores";
export const title = "SERVICE-BELL-STROLL-DOLORES";
export const slug = "service-bell-stroll-dolores";
export const group = "audition";

export const bank = {
  bpm: 118,
  bass: seq('G2 . D3 . E2 B2 . E2 . A2 . E3 . D2 A2 . | D2 . G2 . D3 . E2 B2 . E2 . A2 . D3 . D2'),
  lead: seq('B4 D5 . E5 . D5 B4 . A4 B4 . D5 B4 . G4 . | A4 B4 . D5 . B4 A4 . F#4 A4 . B4 A4 . D5 .'),
  chords: [[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[0,0,0],null,null,null],
  sections: [
    {
      organChords: [[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[0,0,0],null,null,null],
    },
    {
      bass: seq('C3 . G3 . B2 F#3 . B2 . E2 . B2 . A2 E3 . | A2 . C3 . G3 . B2 F#3 . B2 . E2 . A2 . D2'),
      lead: seq('E5 G5 . B5 . G5 E5 . D5 E5 . G5 E5 . C5 . | D5 E5 . G5 . E5 D5 . B4 D5 . E5 D5 . A5 .'),
      leadHarm: seq('. . C5 . . . E5 . . B4 . . D5 . . . | . . E5 . . . C5 . . . B4 . D5 . . .'),
      chords: [[261.6255653005986,329.6275569128699,391.99543598174927,493.88330125612407],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[0,0,0],null,null,null],
      organChords: [[261.6255653005986,329.6275569128699,391.99543598174927,493.88330125612407],null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[0,0,0],null,null,null],
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
  hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  echoLevel: 0.12,
  organChords: [[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[0,0,0],null,null,null],
  organGain: 0.015,
  organDur: 7.4,
  organAttack: 0.045,
  organEcho: true,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = {
  master: 5.3,
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
      send: {
        delay: 0.12,
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

export const arrangement = null;
