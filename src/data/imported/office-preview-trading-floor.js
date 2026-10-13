// OFFICE PREVIEW 5 — TRADING FLOOR — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT preview, 1989 piano house (122): bright piano chords in the off-beat house rhythm,
// the hook in piano octaves, organ bass on the off-beats, 909 kick, clap, open hats, ticker blips,
// the phone, a robot shouting BUY and SELL. 12 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-preview-trading-floor";
export const title = "OFFICE PREVIEW 5 — TRADING FLOOR";
export const slug = "office-preview-trading-floor";
export const group = "imported";

export const bank = {
  bpm: 122,
  musicTrim: 1,
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead3: seq('. . . . . . . . . . . . C4 . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('. . G1 . . . B1 . . . C2 . . . D3 . | . . E1 . . . C2 . . . B1 . . . G2 .'),
      bassLen: [null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. C1 . . C1 . C1 . . . C1 . C1 . . C1 | . C1 . . C1 . C1 . . . C1 . C1 . . C1').map((v) => !!v),
      lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C4 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
    },
    {
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('. . G1 . . . B1 . . . C2 . . . D3 . | . . E1 . . . C2 . . . B1 . . . G2 .'),
      bassLen: [null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. C1 . . C1 . C1 . . . C1 . C1 . . C1 | . C1 . . C1 . C1 . . . C1 . C1 . . C1').map((v) => !!v),
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
      leadLen: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null],
      lead2: seq('G3 . B3 D4 . . B3 . C4 . E4 . D4 . B3 . | G3 . B3 D4 . . B3 . C4 . E4 . D4 . B3 .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead3: seq('. . . . . . . . . . . . C4 . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('. . C2 . . . C2 . . . A1 . . . D3 . | . . B1 . . . G1 . . . C2 . . . D3 .'),
      bassLen: [null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. C1 . . C1 . C1 . . . C1 . C1 . . C1 | . C1 . . C1 . C1 . . . C1 . C1 . . C1').map((v) => !!v),
      lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C4 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      lead: seq('C5 . E5 G5 . . E5 . A5 . C6 . B5 . A5 . | B4 . D5 G5 . . D5 . C5 . E5 . D5 . . .'),
      leadLen: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,2.4,null,null,null],
      lead2: seq('C4 . E4 G4 . . E4 . A4 . C5 . B4 . A4 . | B3 . D4 G4 . . D4 . C4 . E4 . D4 . . .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,2.4,null,null,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('. . E1 . . . E1 . . . E1 . . . E2 . | . . C2 . . . C2 . . . C2 . . . C3 .'),
      bassLen: [null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. C1 . . C1 . C1 . . . C1 . C1 . . C1 | . C1 . . C1 . C1 . . . C1 . C1 . . C1').map((v) => !!v),
      lead: seq('E5 . G5 B5 . . G5 . A5 . G5 . F#5 . E5 . | C5 . E5 G5 . . E5 . G5 . E5 . D5 . C5 .'),
      leadLen: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null],
      lead2: seq('E4 . G4 B4 . . G4 . A4 . G4 . F#4 . E4 . | C4 . E4 G4 . . E4 . G4 . E4 . D4 . C4 .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . B5 G5 B5 G5 . B5 G5 B5'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.5,0.5,0.5,0.5,null,0.5,0.5,0.5],
    },
    {
      lead3: seq('. . . . . . . . . . . . C4 . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('. . A1 . . . A1 . . . D2 . . . D3 . | . . D2 . . . D2 . . . D2 . . . D3 .'),
      bassLen: [null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('. C1 . . C1 . C1 . . . C1 . C1 . . C1 | . C1 . . C1 . C1 . . . C1 . C1 . . C1').map((v) => !!v),
      lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C4 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      lead: seq('A4 . C5 E5 . . C5 . D5 . E5 . F#5 . G5 . | A5 . F#5 D5 . . C5 . A4 . . . D5 . . .'),
      leadLen: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,2.4,null,null,null,2.4,null,null,null],
      lead2: seq('A3 . C4 E4 . . C4 . D4 . E4 . F#4 . G4 . | A4 . F#4 D4 . . C4 . A3 . . . D4 . . .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,2.4,null,null,null,2.4,null,null,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('. . G1 . . . B1 . . . C2 . . . D3 . | . . G1 . . . G1 . . . G1 . . . G2 .'),
      bassLen: [null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      rim: seq('. C1 . . C1 . C1 . . . C1 . C1 . . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G3 . B3 D4 . . B3 . C4 . E4 . D4 . B3 . | G3 . . . . . . . . . . . . . . .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 0.2 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }],
  labels: {"lead":"PIANO HOOK","lead2":"PIANO 8VB","lead3":"ROBOT: BUY","lead4":"ROBOT: SELL","lead5":"PHONE","chords":"HOUSE PIANO","bass":"ORGAN BASS","rim":"TICKER"},
  voice: {"leadVoice":"mrdrPopGrand","lead2Voice":"mrdrPopGrand","lead3Voice":"jmjrCabinetVoice","lead4Voice":"jmjrCabinetVoice","lead5Voice":"squareTone2","chordsVoice":"tngrBrightPiano","bassVoice":"mrdrOrganBass","kickVoice":"ds909Kick","clapVoice":"tr909Clap","hatsVoice":"dsHatClosed","ohatsVoice":"ohat909Long","rimVoice":"kwBlipPing","crashVoice":"crashEngine"},
  voiceParams: {"lead3Voice":{"label":"Robot: BUY","category":"FX","synth":"JMJR-4","dur":2,"note":"Song-local: the jmjrCabinetVoice preset saying \"buy\".","jmjr4":{"mode":"speak","voice":"robot","phrase":"buy","bits":6,"rate":9,"ending":"rise","perKey":"phrase","pitchFollows":"fixed","speed":0.9,"pitchHz":110,"range":0.4,"phraseIr":{"source":{"phrase":"buy","voice":"robot","speed":0.9,"pitchHz":110,"range":0.4,"step":0,"ending":"rise","tract":1,"press":0.5,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":20535,"total_seconds":0.46567,"seed":7,"formants":{"t":[0,0.05467,0.08667,0.18637,0.36592,0.44567],"f1":[200,200,700,700,350,350],"f2":[700,700,1200,1200,2100,2100],"f3":[2300,2300,2500,2500,2700,2700]},"voicing":{"t":[0,0,0.06667,0.07467,0.08667,0.45067,0.46567],"v":[0,0,0,0,1,1,0]},"aspiration":{"t":[0,0,0.05467,0.05767,0.07467,0.09467,0.44567,0.46567],"v":[0,0,0,0.32,0.09,0,0,0]},"voicebar":{"t":[0,0,0.004,0.05467,0.05767,0.46567],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.46567],"v":[250,250],"active":false},"pitch":[[0,110],[0.035,110],[0.04,110.13413],[0.065,111.14532],[0.07,111.43468],[0.225,122.24246],[0.23,122.34675],[0.465,123.09061],[0.47,123.07626]],"extras":[{"start":2410,"samples":529,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.16575,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08212,"asp_gain":3.52881,"bar_gain":0.33145,"extra_gains":[0.12373],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":20535,"total_seconds":0.46567,"seed":7,"formants":{"t":[0,0.05467,0.08667,0.18637,0.36592,0.44567],"f1":[200,200,700,700,350,350],"f2":[700,700,1200,1200,2100,2100],"f3":[2300,2300,2500,2500,2700,2700]},"voicing":{"t":[0,0,0.06667,0.07467,0.08667,0.45067,0.46567],"v":[0,0,0,0,1,1,0]},"aspiration":{"t":[0,0,0.05467,0.05767,0.07467,0.09467,0.44567,0.46567],"v":[0,0,0,0.32,0.09,0,0,0]},"voicebar":{"t":[0,0,0.004,0.05467,0.05767,0.46567],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.46567],"v":[250,250],"active":false},"pitch":[[0,110],[0.035,110],[0.04,110.13413],[0.065,111.14532],[0.07,111.43468],[0.225,122.24246],[0.23,122.34675],[0.465,123.09061],[0.47,123.07626]],"extras":[{"start":2410,"samples":529,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.16575,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08212,"asp_gain":3.52881,"bar_gain":0.33145,"extra_gains":[0.12373],"derived":"browser tables"}}],"transcript":["buy: B AY1"],"unknown":[]}},"id":"jmjrCabinetVoice","kind":"tone","factory":true,"level":0.033054,"peak":0.2785},"lead4Voice":{"label":"Robot: SELL","category":"FX","synth":"JMJR-4","dur":2,"note":"Song-local: the jmjrCabinetVoice preset saying \"sell\".","jmjr4":{"mode":"speak","voice":"robot","phrase":"sell","bits":6,"rate":9,"ending":"fall","perKey":"phrase","pitchFollows":"fixed","speed":0.9,"pitchHz":100,"range":0.4,"phraseIr":{"source":{"phrase":"sell","voice":"robot","speed":0.9,"pitchHz":100,"range":0.4,"step":0,"ending":"fall","tract":1,"press":0.5,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":20472,"total_seconds":0.46422,"seed":7,"formants":{"t":[0,0.11111,0.13611,0.31811,0.40311,0.44422],"f1":[200,200,550,550,360,360],"f2":[1800,1800,1700,1700,1100,1100],"f3":[2600,2600,2500,2500,2600,2600]},"voicing":{"t":[0,0,0.11111,0.12311,0.34811,0.37511,0.44922,0.46422],"v":[0,0,0,1,1,0.6,0.6,0]},"aspiration":{"t":[0,0,0.11111,0.13111,0.34311,0.38311,0.44422,0.46422],"v":[0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.46422],"v":[0,0]},"nasal_zero":{"t":[0,0.46422],"v":[250,250],"active":false},"pitch":[[0,100],[0.08,100],[0.085,100.2063],[0.11,101.54268],[0.115,101.73952],[0.18,104.05733],[0.185,104.162],[0.21,104.06173],[0.215,103.77338],[0.36,91.41503],[0.365,91.2276],[0.465,91.2276]],"extras":[{"start":0,"samples":4900,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.2,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.0653,"asp_gain":0.4342,"bar_gain":0.26354,"extra_gains":[0.04845],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":20472,"total_seconds":0.46422,"seed":7,"formants":{"t":[0,0.11111,0.13611,0.31811,0.40311,0.44422],"f1":[200,200,550,550,360,360],"f2":[1800,1800,1700,1700,1100,1100],"f3":[2600,2600,2500,2500,2600,2600]},"voicing":{"t":[0,0,0.11111,0.12311,0.34811,0.37511,0.44922,0.46422],"v":[0,0,0,1,1,0.6,0.6,0]},"aspiration":{"t":[0,0,0.11111,0.13111,0.34311,0.38311,0.44422,0.46422],"v":[0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.46422],"v":[0,0]},"nasal_zero":{"t":[0,0.46422],"v":[250,250],"active":false},"pitch":[[0,100],[0.08,100],[0.085,100.2063],[0.11,101.54268],[0.115,101.73952],[0.18,104.05733],[0.185,104.162],[0.21,104.06173],[0.215,103.77338],[0.36,91.41503],[0.365,91.2276],[0.465,91.2276]],"extras":[{"start":0,"samples":4900,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.2,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.0653,"asp_gain":0.4342,"bar_gain":0.26354,"extra_gains":[0.04845],"derived":"browser tables"}}],"transcript":["sell: S EH1 L"],"unknown":[]}},"id":"jmjrCabinetVoice","kind":"tone","factory":true,"level":0.033054,"peak":0.2785}},
  fx: { delay: { tone: 3000 }, reverb: { decay: 2, preDelay: 0.02 } },
  lanes: {
    lead: { gain: -3, send: { reverb: 0.25 } },
    lead2: { gain: -9, send: { reverb: 0.25 } },
    lead3: { gain: -2, pan: -0.3, send: { delay: 0.3 } },
    lead4: { pan: 0.3, send: { delay: 0.3 } },
    lead5: { gain: -11, pan: 0.4 },
    chords: { gain: -10, send: { reverb: 0.3 } },
    bass: { gain: -10 },
    kick: { gain: -6 },
    clap: { gain: -3, send: { reverb: 0.2 } },
    hats: { gain: -13, pan: 0.2 },
    ohats: { gain: -14, pan: -0.2 },
    rim: { gain: -12, pan: -0.35, send: { delay: 0.3 } },
    crash: { gain: -9, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
