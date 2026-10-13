// OFFICE PREVIEW 1 — ELEVATOR TO THE TOP — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT preview: the song climbs the tower. Lobby muzak in G (bossa, vibraphone,
// electric piano), DING, floor 23 a tone up (funk: clav, slap bass, horn stabs, the B section),
// DING, the penthouse in C (brass section and trumpets, strings, timpani, walking bass), DING, the
// lobby again. 14 bars at 112.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-preview-elevator";
export const title = "OFFICE PREVIEW 1 — ELEVATOR TO THE TOP";
export const slug = "office-preview-elevator";
export const group = "imported";

export const bank = {
  bpm: 112,
  musicTrim: 1,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
      leadLen: [2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null],
      chordsLen: [3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null,3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null],
      bass: seq('G1 . . D2 B1 . . D2 C2 . . G2 D2 . . A2 | E1 . . B1 C2 . . G2 D2 . . D2 G1 . . D2'),
      bassLen: [3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      kick: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('C5 . E5 G5 . . E5 . A5 . C6 . B5 . A5 . | B4 . D5 G5 . . D5 . C5 . E5 . D5 . . .'),
      leadLen: [2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,1,3,null,null,2,null,2,null,2,null,4,null,null,null],
      chords: [[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,440],null,null],
      chordsLen: [3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null,3,null,null,2,null,null,3,null,null,null,3,null,null,2,null,null],
      bass: seq('C2 . . G2 C2 . . G2 A1 . . E2 D2 . . A2 | B1 . . D2 G1 . . D2 C2 . . G2 D2 . . A2'),
      bassLen: [3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      kick: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
    },
    {
      chords: [null,null,[277.1826309768721,369.9944227116344,440],null,null,[277.1826309768721,369.9944227116344,440],null,null,null,null,[277.1826309768721,369.9944227116344,440],null,null,[277.1826309768721,369.9944227116344,440],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,[293.6647679174076,369.9944227116344,440],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('F#1 . . F#2 . . F#1 . . F#1 F#2 . F#1 . F#2 . | D2 . . D3 . . D2 . . D2 D3 . D2 . D3 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . C1 . . C1 . . . C1 . . . . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      lead2: seq('F#5 . A5 C#6 . . A5 . B5 . A5 . G#5 . F#5 . | D5 . F#5 A5 . . F#5 . A5 . F#5 . E5 . D5 .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null],
      twinkle: seq('E6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,440,554.3652619537442],null,[369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,[369.9944227116344,440,587.3295358348151],null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null],
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      chords: [null,null,[293.6647679174076,369.9944227116344,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,493.8833012561241],null,null,null,null,[329.6275569128699,415.3046975799451,493.8833012561241],null,null,[329.6275569128699,415.3046975799451,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,415.3046975799451,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,415.3046975799451,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,415.3046975799451,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,415.3046975799451,493.8833012561241],null,null],
      chordsLen: [null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,1,null,null],
      bass: seq('B1 . . B2 . . B1 . . E1 E2 . E1 . E2 . | E1 . . E2 . . E1 . . E1 E2 . E1 . E2 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . C1 . . C1 . . . C1 . . . . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      lead2: seq('B4 . D5 F#5 . . D5 . E5 . F#5 . G#5 . A5 . | B5 . G#5 E5 . . D5 . B4 . . . E5 . . .'),
      lead2Len: [1.2,null,0.6,1.7999999999999998,null,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,1.2,null,0.6,1.7999999999999998,null,null,1.2,null,2,null,null,null,2,null,null,null],
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,415.3046975799451,493.8833012561241],null,[329.6275569128699,415.3046975799451,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,415.3046975799451,493.8833012561241,587.3295358348151],null,[329.6275569128699,415.3046975799451,493.8833012561241,587.3295358348151],null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null],
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass: seq('C2 . E2 . G2 . E2 . F1 . A1 . D2 . G2 . | A1 . C2 . C2 . F2 . G1 . E2 . G2 . C3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      twinkle: seq('E6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead3: seq('C5 . E5 G5 . . E5 . F5 . A5 . G5 . E5 . | C5 . E5 G5 . . E5 . F5 . A5 . G5 . E5 .'),
      lead3Len: [1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null],
      lead4: seq('C5 . E5 G5 . . E5 . F5 . A5 . G5 . E5 . | C5 . E5 G5 . . E5 . F5 . A5 . G5 . E5 .'),
      lead4Len: [1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null],
      chords2: [[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,440,523.2511306011972],null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,[329.6275569128699,391.99543598174927,523.2511306011972],null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F1 . A1 . C2 . F2 . D2 . F2 . D2 . G2 . | E1 . E2 . G2 . C3 . F1 . A1 . D2 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('F5 . A5 C6 . . A5 . D6 . F6 . E6 . D6 . | E5 . G5 C6 . . G5 . F5 . A5 . G5 . . .'),
      lead3Len: [1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,3.68,null,null,null],
      lead4: seq('F5 . A5 C6 . . A5 . D6 . F6 . E6 . D6 . | E5 . G5 C6 . . G5 . F5 . A5 . G5 . . .'),
      lead4Len: [1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,1.84,null,0.92,2.7600000000000002,null,null,1.84,null,1.84,null,1.84,null,3.68,null,null,null],
      chords2: [[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,440],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [2,null,1,3,null,null,2,null,2,null,2,null,2,null,2,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G1 . . D2 G1 . . D2 G1 . . D2 G1 . . D2 | G1 . . D2 G1 . . D2 G1 . . D2 G1 . . D2'),
      bassLen: [3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      twinkle: seq('E6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3,4,5,6],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 1.2 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }, { key: "hats2", from: "hats", independent: true }],
  labels: {"lead":"VIBES","lead2":"CLAV","lead3":"BRASS","lead4":"MUTED TRUMPET","twinkle":"DING","chords":"E.PIANO","chords2":"STRINGS","chords3":"HORN STABS","tom":"TIMPANI","rim":"BOSSA RIM","hats":"SHAKER","hats2":"FUNK HATS"},
  voice: {"leadVoice":"mrdrVibraphone","lead2Voice":"bestPwmClav","lead3Voice":"tngrBrassSection","lead4Voice":"mrdrMutedTrumpet","twinkleVoice":"tngrMusicBell","chordsVoice":"rmndTineEP","chords2Voice":"bestPwmStrings","chords3Voice":"mrdrHornStab","bassVoice":"layerWalkingBass","kickVoice":"kickEngine","snareVoice":"snareTight","hatsVoice":"dsShaker","hats2Voice":"dsHatClosed","ohatsVoice":"ohatEngine","rimVoice":"cr78Rim","crashVoice":"crashEngine","tomVoice":"timpaniHit"},
  fx: { delay: { feedback: 0.3, tone: 3000 }, reverb: { decay: 2.4, preDelay: 0.02 } },
  lanes: {
    lead: { gain: -4, send: { reverb: 0.35 } },
    lead2: { gain: -4, pan: -0.15 },
    lead3: { gain: -1, send: { reverb: 0.3 } },
    lead4: { gain: -12, pan: 0.2, send: { reverb: 0.3 } },
    twinkle: { gain: 2, send: { reverb: 0.5 } },
    chords: { gain: -14, pan: 0.15, send: { reverb: 0.3 } },
    chords2: { gain: -14, send: { reverb: 0.5 } },
    chords3: { gain: -10, pan: -0.2 },
    bass: { gain: -12 },
    kick: { gain: -5 },
    snare: { gain: -2, send: { reverb: 0.2 } },
    hats: { gain: -16, pan: 0.3 },
    hats2: { gain: -16, pan: -0.2 },
    ohats: { gain: -14 },
    rim: { gain: -4, pan: -0.3 },
    crash: { gain: -8, send: { reverb: 0.4 } },
    tom: { gain: -12, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5,6],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
