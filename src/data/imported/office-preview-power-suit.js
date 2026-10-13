// OFFICE PREVIEW 2 — POWER SUIT — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT preview, 1987 sophisti-pop: FM slap bass, gated snare, DX bell electric piano in
// 9ths, saxophone on the hook, brass stabs answering, a wide PWM pad. 12 bars at 112.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-preview-power-suit";
export const title = "OFFICE PREVIEW 2 — POWER SUIT";
export const slug = "office-preview-power-suit";
export const group = "imported";

export const bank = {
  bpm: 112,
  musicTrim: 1,
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      bass: seq('G1 . G2 G1 . . B2 . C2 . C3 C2 . D2 D3 . | E1 . E2 E1 . . C3 . D2 . B2 B1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      bass: seq('G1 . G2 G1 . . B2 . C2 . C3 C2 . D2 D3 . | E1 . E2 E1 . . C3 . D2 . B2 B1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,391.99543598174927,440,493.8833012561241,587.3295358348151],null,[369.9944227116344,391.99543598174927,440,493.8833012561241,587.3295358348151],null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[246.94165062806206,261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[246.94165062806206,261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[391.99543598174927,440,493.8833012561241,523.2511306011972,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      bass: seq('C2 . C3 C2 . . C3 . A1 . A2 A1 . D2 D3 . | B1 . B2 B1 . . G2 . C2 . C3 C2 . D2 D3 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      lead: seq('C5 . E5 G5 . . E5 . A5 . C6 . B5 . A5 . | B4 . D5 G5 . . D5 . C5 . E5 . D5 . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,3.8,null,null,null],
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,369.9944227116344,440,523.2511306011972,587.3295358348151],null,[329.6275569128699,369.9944227116344,440,523.2511306011972,587.3295358348151],null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,369.9944227116344,391.99543598174927],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[369.9944227116344,391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('E1 . E2 E1 . . E2 . E1 . E2 E1 . E1 E2 . | C2 . C3 C2 . . C3 . C2 . C3 C2 . C2 C3 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      lead: seq('E5 . G5 B5 . . G5 . A5 . G5 . F#5 . E5 . | C5 . E5 G5 . . E5 . G5 . E5 . D5 . C5 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
    },
    {
      chords: [[246.94165062806206,261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[246.94165062806206,261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,369.9944227116344,440],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,440,493.8833012561241,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A1 . A2 A1 . . A2 . D2 . D3 D2 . D2 D3 . | D2 . D3 D2 . . D3 . D2 . D3 D2 . D2 D3 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      lead: seq('A4 . C5 E5 . . C5 . D5 . E5 . F#5 . G5 . | A5 . F#5 D5 . . C5 . A4 . . . D5 . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,3.8,null,null,null,3.8,null,null,null],
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,369.9944227116344,440,523.2511306011972,587.3295358348151],null,null,null,null,null,[329.6275569128699,369.9944227116344,440,523.2511306011972,587.3295358348151],null,[329.6275569128699,369.9944227116344,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927,440],null,null,null,null],
      chordsLen: [3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null,3,null,null,2,null,null,null,null],
      chords2: [[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[391.99543598174927,493.8833012561241,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[369.9944227116344,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G1 . G2 G1 . . B2 . C2 . C3 C2 . D2 D3 . | G1 . G2 G1 . . G2 . G1 . G2 G1 . G1 G2 .'),
      bassLen: [1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null,1,null,0.5,1,null,null,0.5,null,1,null,0.5,1,null,1,0.5,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 0 } }],
  layers: [{ key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }, { key: "tom2", from: "tom", independent: true }],
  labels: {"lead":"SAX","chords":"DX E.PIANO","chords2":"PAD","chords3":"BRASS STABS","bass":"FM SLAP","tom":"TOM HI","tom2":"TOM LO"},
  voice: {"leadVoice":"mrdrSaxophone","chordsVoice":"mrdrDx7Keys","chords2Voice":"bestPwmPadWide","chords3Voice":"bestPwmBrass","bassVoice":"rmndDxSlap","kickVoice":"kickClickTop","snareVoice":"snareFat","hatsVoice":"dsHatClosed","tomVoice":"sdsTomHigh","tom2Voice":"sdsTomLow","crashVoice":"crashEngine"},
  fx: { delay: { feedback: 0.3, tone: 3000 }, reverb: { preDelay: 0.02 } },
  lanes: {
    lead: { gain: -3, send: { delay: 0.15, reverb: 0.3 } },
    chords: { gain: -12, pan: 0.2, send: { reverb: 0.3 }, effects: [{ id: "chorus", params: { wet: 0.4 } }] },
    chords2: { gain: -21, send: { reverb: 0.5 } },
    chords3: { gain: -13, pan: -0.2, send: { reverb: 0.25 } },
    bass: { gain: -9.5 },
    kick: { gain: -6.5 },
    snare: { gain: 8, effects: [{ id: "reverb", params: { decay: 1.6, preDelay: 0.005, wet: 0.55 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.05 } }] },
    hats: { gain: -11, pan: 0.2 },
    tom: { gain: -8, pan: 0.3, send: { reverb: 0.3 } },
    tom2: { gain: -8, pan: -0.3, send: { reverb: 0.3 } },
    crash: { gain: -9, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
