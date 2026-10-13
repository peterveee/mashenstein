// OFFICE DARK 2 — D IN G MINOR — one song: what it plays, how it is arranged, how it sounds.
//
// Tune D moved into G minor (B to Bb, E to Eb): hook over Gm Cm D, answer over Bb Eb, middle Cm D D7 Gm.
// Plain POWER SUIT sounds. 12 bars at 112.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-dark-2-g-minor";
export const title = "OFFICE DARK 2 — D IN G MINOR";
export const slug = "office-dark-2-g-minor";
export const group = "imported";

export const bank = {
  bpm: 112,
  musicTrim: 1,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 . | G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
      chords: [[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,[391.99543598174927,466.1637615180899,622.2539674441618],null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,[369.9944227116344,440,587.3295358348151],null,[391.99543598174927,466.1637615180899,587.3295358348151],null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      bass: seq('G1 . G2 G1 . . A#2 . C2 . C3 C2 . D2 D3 . | D#2 . D#3 D#2 . . C3 . D2 . A#2 A#1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . . . A#4 . D5 . . . F5 . . . | G5 . . . D#5 . . . A#4 . . . . . . .'),
      leadLen: [1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null,3.8,null,null,null,3.8,null,null,null,7.6,null,null,null,null,null,null,null],
      chords: [[293.6647679174076,349.2282314330039,466.1637615180899],null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . A#2 A#1 . . A#2 . A#1 . A#2 A#1 . A#1 A#2 . | D#2 . D#3 D#2 . . D#3 . D#2 . D#3 D#2 . D#2 D#3 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('D#5 . G5 . . . C5 . D#5 . . . G5 . . . | F#5 . A5 . . . D5 . F#5 . . . A5 . . .'),
      leadLen: [1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null,1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null],
      chords: [[261.6255653005986,311.1269837220809,391.99543598174927],null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . C3 C2 . . C3 . C2 . C3 C2 . C2 C3 . | D2 . D3 D2 . . D3 . D2 . D3 D2 . D2 D3 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('F#5 . A5 . . . D5 . C6 . . . A5 . . . | G5 . . . . . . . D5 . . . A#4 . . .'),
      leadLen: [1.9,null,3.8,null,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null,7.6,null,null,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null],
      chords: [[261.6255653005986,293.6647679174076,369.9944227116344,440],null,null,[261.6255653005986,293.6647679174076,369.9944227116344,440],null,null,null,null,[261.6255653005986,293.6647679174076,369.9944227116344,440],null,null,[261.6255653005986,293.6647679174076,369.9944227116344,440],null,null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[369.9944227116344,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D2 . . D3 . D2 . D3 D2 . D2 D3 . | G1 . G2 G1 . . G2 . G1 . G2 G1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 . | G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
      chords: [[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,[391.99543598174927,466.1637615180899,622.2539674441618],null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,[369.9944227116344,440,587.3295358348151],null,[391.99543598174927,466.1637615180899,587.3295358348151],null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      bass: seq('G1 . G2 G1 . . A#2 . C2 . C3 C2 . D2 D3 . | D#2 . D#3 D#2 . . C3 . D2 . A#2 A#1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G1 . G2 G1 . . A#2 . C2 . C3 C2 . D2 D3 . | G1 . G2 G1 . . G2 . G1 . G2 G1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 0 } }],
  layers: [{ key: "chords2", from: "chords", independent: true }],
  labels: {"lead":"SAX","chords":"DX E.PIANO","chords2":"PAD","bass":"FM SLAP"},
  voice: {"leadVoice":"mrdrSaxophone","chordsVoice":"mrdrDx7Keys","chords2Voice":"bestPwmPadWide","bassVoice":"rmndDxSlap","kickVoice":"kickClickTop","snareVoice":"snareFat","hatsVoice":"dsHatClosed"},
  fx: { delay: { feedback: 0.3, tone: 3000 }, reverb: { preDelay: 0.02 } },
  lanes: {
    lead: { gain: -3, send: { delay: 0.15, reverb: 0.3 } },
    chords: { gain: -12, pan: 0.2, send: { reverb: 0.3 } },
    chords2: { gain: -21, send: { reverb: 0.5 } },
    bass: { gain: -9.5 },
    kick: { gain: -6.5 },
    snare: { gain: 8, effects: [{ id: "reverb", params: { decay: 1.6, preDelay: 0.005, wet: 0.55 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.05 } }] },
    hats: { gain: -11, pan: 0.2 },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
