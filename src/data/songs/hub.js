// THE FOOD COURT — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "hub";
export const title = "THE FOOD COURT";
export const slug = "food-court";
export const group = "theme";

export const bank = {
  bpm: 90,
  musicTrim: 1.05,
  echoEverything: true,
  bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
  kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
  hats: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
  sections: [
    {

    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A4 . . .'),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      lead: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      gliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      chords: chordSeq('A3min7 . . . . . . . G3maj7 . . . . . . . | A3min7 . . . . . . . G3maj7 . . . . . . .'),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      bassType: "sawtooth",
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      vox: seq('. . . . . . A3 . . . . . . . . . | . . . . . . A3 . . . . . . . . .'),
      chords: chordSeq('A3min7 . . . . . . . G3maj7 . . . . . . . | A3min7 . . . . . . . G3maj7 . . . . . . .'),
    },
    {
      kick: seq('C1 . . . C1 . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . C1 . C1 . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 D4 F#4 A4 F#4 | A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 B3 D4 F4 D4'),
      leadHarm: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      bassType: "sawtooth",
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      vox: seq('. . . . A3 . . . . . C4 . . . . . | . . . . A3 . . . . . E4 . . . . .'),
      shout: seq('. . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .'),
      gliss: seq('A5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[0,0,0],null,null,null],
    },
    {
      kick: seq('C1 . . . C1 . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . C1 . C1 . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 D4 F#4 A4 F#4 | A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 B3 D4 F4 D4'),
      leadHarm: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      bassType: "sawtooth",
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      vox: seq('. . . . A3 . . . . . C4 . . . . . | . . . . A3 . . . . . E4 . . . . .'),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . A5 . . . . . . .'),
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1,2,2,3,3,4,4,5,5,6,7],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -0.7,
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine"},
  lanes: {
    kick: { gain: -1, send: { delay: 1 } },
    clap: { gain: -1, send: { delay: 1 } },
    bass: { send: { delay: 1 } },
    lead: { send: { delay: 1 } },
    leadHarm: { send: { delay: 1 } },
    chords: { send: { delay: 1 } },
    keyGliss: { send: { delay: 1 } },
    gliss: { send: { delay: 1 } },
    vox: { send: { delay: 1 } },
    shout: { send: { delay: 1 } },
    snare: { send: { delay: 1 } },
    hats: { send: { delay: 1 } },
    ohats: { send: { delay: 1 } },
  },
};

export const arrangement = null;
