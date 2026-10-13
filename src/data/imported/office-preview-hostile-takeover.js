// OFFICE PREVIEW 6 — HOSTILE TAKEOVER — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT preview, a 1988 action score (126): the hook in G harmonic minor (B to Bb, E to Eb)
// on French horns, trumpets on the B section, marcato string ostinato, cello eighths, timpani,
// taiko, brass stabs, a march snare. 12 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-preview-hostile-takeover";
export const title = "OFFICE PREVIEW 6 — HOSTILE TAKEOVER";
export const slug = "office-preview-hostile-takeover";
export const group = "imported";

export const bank = {
  bpm: 126,
  musicTrim: 1,
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead3: seq('G4 G4 A#4 G4 D5 G4 A#4 G4 G4 G4 C5 G4 F#5 A4 D5 A4 | G4 G4 A#4 G4 D#5 G4 C5 G4 A4 A4 A#4 G4 D5 G4 A#4 G4'),
      lead3Len: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      bass: seq('G2 . G2 . A#2 . A#2 . C2 . C2 . D2 . D2 . | D#2 . D#2 . C2 . C2 . D2 . A#2 . G2 . G2 .'),
      bassLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chords2: [[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,[233.08188075904496,293.6647679174076,391.99543598174927],null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead3: seq('G4 G4 A#4 G4 D5 G4 A#4 G4 G4 G4 C5 G4 F#5 A4 D5 A4 | G4 G4 A#4 G4 D#5 G4 C5 G4 A4 A4 A#4 G4 D5 G4 A#4 G4'),
      lead3Len: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      bass: seq('G2 . G2 . A#2 . A#2 . C2 . C2 . D2 . D2 . | D#2 . D#2 . C2 . C2 . D2 . A#2 . G2 . G2 .'),
      bassLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chords2: [[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,[233.08188075904496,293.6647679174076,391.99543598174927],null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,4,null,null,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead: seq('G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 . | G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null],
      chords: [[293.6647679174076,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead3: seq('G4 G4 C5 G4 D#5 G4 C5 G4 G4 G4 C5 G4 F#5 A4 D5 A4 | G4 G4 A#4 G4 D5 G4 A#4 G4 G4 G4 C5 G4 F#5 A4 D5 A4'),
      lead3Len: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      bass: seq('C2 . C2 . C2 . C2 . A2 . A2 . D2 . D2 . | A#2 . A#2 . G2 . G2 . C2 . C2 . D2 . D2 .'),
      bassLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chords2: [[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead: seq('C5 . D#5 G5 . . D#5 . A5 . C6 . A#5 . A5 . | A#4 . D5 G5 . . D5 . C5 . D#5 . D5 . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,3.8,null,null,null],
      chords: [[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead3: seq('G4 G4 A#4 G4 D#5 G4 A#4 G4 G4 G4 A#4 G4 D#5 G4 A#4 G4 | G4 G4 C5 G4 D#5 G4 C5 G4 G4 G4 C5 G4 D#5 G4 C5 G4'),
      lead3Len: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      bass: seq('D#2 . D#2 . D#2 . D#2 . D#2 . D#2 . D#2 . D#2 . | C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .'),
      bassLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chords2: [[233.08188075904496,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead: seq('D#4 . G4 A#4 . . G4 . A4 . G4 . F#4 . D#4 . | C4 . D#4 G4 . . D#4 . G4 . D#4 . D4 . C4 .'),
      leadLen: [1.8,null,0.9,2.7,null,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,0.9,2.7,null,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null],
      chords: [[311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead2: seq('D#5 . G5 A#5 . . G5 . A5 . G5 . F#5 . D#5 . | C5 . D#5 G5 . . D#5 . G5 . D#5 . D5 . C5 .'),
      lead2Len: [1.8,null,0.9,2.7,null,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,0.9,2.7,null,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null],
      snare: seq('C1 . . C1 C1 . C1 . C1 . . C1 C1 . C1 . | C1 . . C1 C1 . C1 . C1 . . C1 C1 . C1 .').map((v) => !!v),
    },
    {
      lead3: seq('G4 G4 C5 G4 D#5 G4 C5 G4 A4 A4 D5 A4 F#5 A4 D5 A4 | A4 A4 C5 A4 D5 A4 C5 A4 A4 A4 C5 A4 D5 A4 C5 A4'),
      lead3Len: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      bass: seq('A2 . A2 . A2 . A2 . D2 . D2 . D2 . D2 . | D2 . D2 . D2 . D2 . D2 . D2 . D2 . D2 .'),
      bassLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chords2: [[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,[220,293.6647679174076,369.9944227116344],null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead: seq('A3 . C4 D#4 . . C4 . D4 . D#4 . F#4 . G4 . | A4 . F#4 D4 . . C4 . A3 . . . D4 . . .'),
      leadLen: [1.8,null,0.9,2.7,null,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,0.9,2.7,null,null,1.8,null,3.6,null,null,null,3.6,null,null,null],
      chords: [[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead2: seq('A4 . C5 D#5 . . C5 . D5 . D#5 . F#5 . G5 . | A5 . F#5 D5 . . C5 . A4 . . . D5 . . .'),
      lead2Len: [1.8,null,0.9,2.7,null,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,1.8,null,0.9,2.7,null,null,1.8,null,3.6,null,null,null,3.6,null,null,null],
      snare: seq('C1 . . C1 C1 . C1 . C1 . . C1 C1 . C1 . | C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead3: seq('G4 G4 A#4 G4 D5 G4 A#4 G4 G4 G4 C5 G4 F#5 A4 D5 A4 | G4 G4 A#4 G4 D5 G4 A#4 G4 G4 G4 A#4 G4 D5 G4 A#4 G4'),
      lead3Len: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      bass: seq('G2 . G2 . A#2 . A#2 . C2 . C2 . D2 . D2 . | G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .'),
      bassLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chords2: [[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,[220,293.6647679174076,369.9944227116344],null,null,null,[233.08188075904496,293.6647679174076,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      tom: seq('C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1 | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      tom2: seq('C1 . . . . . . . . . C1 . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('G4 . A#4 D5 . . A#4 . C5 . D#5 . D5 . A#4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,15.2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[293.6647679174076,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead2: seq('G5 . A#5 D6 . . A#5 . C6 . D#6 . D6 . A#5 . | G5 . . . . . . . . . . . . . . .'),
      lead2Len: [1.9,null,0.95,2.8499999999999996,null,null,1.9,null,1.9,null,1.9,null,1.9,null,1.9,null,15.2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 0.5 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "tom2", from: "tom", independent: true }],
  labels: {"lead":"FRENCH HORNS","lead2":"TRUMPETS","lead3":"STRING OSTINATO","chords":"BRASS STABS","chords2":"STRINGS","bass":"CELLOS","tom":"TIMPANI","tom2":"TAIKO"},
  voice: {"leadVoice":"mrdrFrenchHorn","lead2Voice":"tngrBrassSection","lead3Voice":"mrdrViolinMarcato","chordsVoice":"mrdrHornStab","chords2Voice":"tngrWarmStrings","bassVoice":"mrdrCello","tomVoice":"timpaniHit","tom2Voice":"taikoHit","snareVoice":"snareFlam","crashVoice":"crash808Long","kickVoice":"kickEngine"},
  fx: { delay: { feedback: 0.25, tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    lead: { gain: -2, send: { reverb: 0.4 } },
    lead2: { gain: -3, pan: 0.15, send: { reverb: 0.4 } },
    lead3: { gain: -10, pan: -0.25, send: { reverb: 0.3 } },
    chords: { gain: -7, send: { reverb: 0.4 } },
    chords2: { gain: -16, send: { reverb: 0.5 } },
    bass: { gain: -9, send: { reverb: 0.3 } },
    tom: { gain: -10, send: { reverb: 0.5 } },
    tom2: { gain: -11, send: { reverb: 0.5 } },
    snare: { gain: -4, send: { reverb: 0.3 } },
    crash: { gain: -8, send: { reverb: 0.5 } },
    kick: { gain: -8 },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
