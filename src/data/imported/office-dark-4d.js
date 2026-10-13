// OFFICE DARK 4D — G MINOR, 4B A LITTLE LIGHTER — one song: what it plays, how it is arranged, how it sounds.
//
// Between 4C and 4B: 4B sounds with the Minimoog lead an octave down and the cold pad, but a backbeat
// (2 and 4) and no sour bell. 16 bars at 112.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-dark-4d";
export const title = "OFFICE DARK 4D — G MINOR, 4B A LITTLE LIGHTER";
export const slug = "office-dark-4d";
export const group = "imported";

export const bank = {
  bpm: 112,
  musicTrim: 1,
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead2: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
      lead2Len: [2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null],
      chords2: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null],
      chords2Len: [3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null,3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null],
      bass2: seq('G1 . . D2 B1 . . D2 C2 . . G2 D2 . . A2 | E1 . . B1 C2 . . G2 D2 . . D2 G1 . . D2'),
      bass2Len: [3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1],
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead2: seq('C5 . E5 G5 . . E5 . A5 . C6 . B5 . A5 . | B4 . D5 G5 . . D5 . C5 . E5 . D5 . . .'),
      lead2Len: [2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,1,3,null,null,2,null,2,null,2,null,4,null,null,null],
      chords2: [[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,440],null,null],
      chords2Len: [3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null,3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null],
      bass2: seq('C2 . . G2 C2 . . G2 A1 . . E2 D2 . . A2 | B1 . . D2 G1 . . D2 C2 . . G2 D2 . . A2'),
      bass2Len: [3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1],
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('G3 . A#3 D4 . . A#3 . C4 . D#4 . D4 . A#3 . | G3 . A#3 D4 . . A#3 . C4 . D#4 . D4 . A#3 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,[195.99771799087463,261.6255653005986,311.1269837220809],null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,[195.99771799087463,233.08188075904496,311.1269837220809],null,null,null,[195.99771799087463,261.6255653005986,311.1269837220809],null,null,null,[184.9972113558172,220,293.6647679174076],null,[195.99771799087463,233.08188075904496,293.6647679174076],null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null],
      chordsLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      bass: seq('G1 . G1 . A#1 . A#1 . C2 . C2 . D2 . D2 . | D#2 . D#2 . C2 . C2 . D2 . A#1 . G1 . G1 .'),
      bassLen: [0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('D4 . F4 . . . A#3 . D4 . . . F4 . . . | G4 . . . D#4 . . . A#3 . . . . . . .'),
      leadLen: [1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null,3.8,null,null,null,3.8,null,null,null,7.6,null,null,null,null,null,null,null],
      chords: [[174.61411571650194,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,233.08188075904496,311.1269837220809],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . A#1 . A#1 . A#1 . A#1 . A#1 . A#1 . A#1 . | D#2 . D#2 . D#2 . D#2 . D#2 . D#2 . D#2 . D#2 .'),
      bassLen: [0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('D#4 . G4 . . . C4 . D#4 . . . G4 . . . | F#4 . A4 . . . D4 . F#4 . . . A4 . . .'),
      leadLen: [1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null,1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null],
      chords: [[195.99771799087463,261.6255653005986,311.1269837220809],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 . | D2 . D2 . D2 . D2 . D2 . D2 . D2 . D2 .'),
      bassLen: [0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('F#4 . A4 . . . D4 . C5 . . . A4 . . . | G4 . . . . . . . D4 . . . A#3 . . .'),
      leadLen: [1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null,7.6,null,null,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null],
      chords: [[184.9972113558172,220,261.6255653005986,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D2 . D2 . D2 . D2 . D2 . D2 . D2 . | G1 . G1 . G1 . G1 . G1 . G1 . G1 . G1 .'),
      bassLen: [0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('G3 . A#3 D4 . . A#3 . C4 . D#4 . D4 . A#3 . | G3 . A#3 D4 . . A#3 . C4 . D#4 . D4 . A#3 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,[195.99771799087463,261.6255653005986,311.1269837220809],null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,[195.99771799087463,233.08188075904496,311.1269837220809],null,null,null,[195.99771799087463,261.6255653005986,311.1269837220809],null,null,null,[184.9972113558172,220,293.6647679174076],null,[195.99771799087463,233.08188075904496,293.6647679174076],null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null],
      chordsLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      bass: seq('G1 . G1 . A#1 . A#1 . C2 . C2 . D2 . D2 . | D#2 . D#2 . C2 . C2 . D2 . A#1 . G1 . G1 .'),
      bassLen: [0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('G3 . A#3 D4 . . A#3 . C4 . D#4 . D4 . A#3 . | G3 . . . . . . . . . . . . . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,[195.99771799087463,261.6255653005986,311.1269837220809],null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G1 . G1 . A#1 . A#1 . C2 . C2 . D2 . D2 . | G1 . G1 . G1 . G1 . G1 . G1 . G1 . G1 .'),
      bassLen: [0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null,0.7,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 0 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "hats2", from: "hats", independent: true }],
  labels: {"lead":"SYNTH LEAD (MINIMOOG 8VB)","lead2":"VIBES (LOBBY)","chords":"COLD PAD","chords2":"E.PIANO (LOBBY)","bass":"PULSE BASS","bass2":"BOSSA BASS","twinkle":"SOUR BELL","hats2":"SHAKER"},
  voice: {"leadVoice":"bestClassicMono","chordsVoice":"tngrPolarDrift","bassVoice":"bass80sMono","twinkleVoice":"tngrIceBell","kickVoice":"kickClickTop","snareVoice":"snareFat","hatsVoice":"dsHatClosed","crashVoice":"blastBoom","lead2Voice":"mrdrVibraphone","chords2Voice":"rmndTineEP","bass2Voice":"layerWalkingBass","hats2Voice":"dsShaker","rimVoice":"cr78Rim"},
  fx: { delay: { tone: 2600 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    lead: { gain: -3, send: { delay: 0.2, reverb: 0.45 } },
    chords: { gain: -10, send: { reverb: 0.5 } },
    bass: { gain: -7 },
    twinkle: { gain: -10, pan: 0.4, send: { delay: 0.5, reverb: 0.5 } },
    kick: { gain: -6 },
    snare: { gain: 6, effects: [{ id: "reverb", params: { decay: 1.6, preDelay: 0.005, wet: 0.55 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.05 } }] },
    hats: { gain: -12, pan: 0.2 },
    crash: { gain: -10, send: { reverb: 0.4 } },
    lead2: { gain: -4, send: { reverb: 0.35 } },
    chords2: { gain: -14, pan: 0.15, send: { reverb: 0.3 } },
    bass2: { gain: -12 },
    hats2: { gain: -16, pan: 0.3 },
    rim: { gain: -4, pan: -0.3 },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5,6,7],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
