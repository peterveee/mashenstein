// MINUTE WALTZ · BOOGIE AFTER HOURS — one song: what it plays, how it is arranged, how it sounds.
//
// A separate 4/4 boogie remix of Chopin's Minute Waltz, Op. 64 No. 1.
// The score-derived piano phrase from MINUTE WALTZ · FOUR TO THE FLOOR is pushed onto
// sixteenth off-beats; an 808 groove, slap bass, clav and horns answer its gaps.
// Source: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483
// Regenerate with node tools/make-minute-waltz-boogie.js --force.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "chopin-minute-waltz-boogie";
export const title = "MINUTE WALTZ · BOOGIE AFTER HOURS";
export const slug = "chopin-minute-waltz-boogie";
export const group = "imported";
export const seed = 6427;

export const bank = {
  bpm: 116,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . C#3 . . . C#2 . . C#3 . . . C#2 . | C#2 . . C#3 . . . C#2 . . C#3 . . . C#2 .'),
      bassLen: [2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null,2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . C#3 . . . C#2 . . C#3 . . . C#2 . | G#1 . . G#2 . . . G#1 . . G#2 . . . G#1 .'),
      bassLen: [2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null,2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      chords2: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . . . . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,8,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,null,null,null],
      chords2: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 . . . .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,null,null,null,null],
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . . . .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('C#6 . . . . . . C6 . A#5 . G#5 . . . . | . F5 D#5 . . F#5 F5 . . G#5 F#5 . . F5 D#5 .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,2,2,null],
      lead2: seq('. . . . . . . . . . . . . F#5 . G#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('. . C#4 . . C#4 . C#4 . . C#4 . . C#4 . C#4 | . . C#4 . . C#4 . C#4 . . C#4 . . C#4 . C#4'),
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . A#5 . . . . F#5 . F5 . . . . | . F5 D#5 . . D5 D#5 . D#5 . . . C5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . G#4 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . G#4 . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . F#4 .'),
      lead6Len: [null,null,2,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . . G#5 . F#5 . F5 . . . . | . F5 D#5 . . D#5 D5 . . D#5 . . . . . .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,4,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . F5 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . F#4 . . . . . . . F#4 . | . . . . . . . . . . . . . . G#4 .'),
      lead6Len: [null,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . . G#5 . F#5 . C6 . . . . | . F5 D#5 . . D5 D#5 . D#5 . . . C5 . . .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      lead6: seq('. . . . . . F#4 . . . . . . . F#4 . | . . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . G#4 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . G#4 . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . F#4 .'),
      lead6Len: [null,null,2,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('C#6 . . . . . . C6 . A#5 . G#5 . . . . | . F5 D#5 . . F#5 F5 . . G#5 F#5 . . F5 D#5 .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,2,2,null],
      lead2: seq('. . . . . . . . . . . . . F#5 . G#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('. . C#4 . . C#4 . C#4 . . C#4 . . C#4 . C#4 | . . C#4 . . C#4 . C#4 . . C#4 . . C#4 . C#4'),
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . F4 . . . . . . . F4 . | . . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . A#5 . . . . F#5 . F5 . . . . | . F5 D#5 . . D5 D#5 . D#5 . . . C5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      lead6: seq('. . . . . . . . . . . . . . F#4 . | . . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . . . G4 . . . G#4 . | . . C5 . . . A#4 . . . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: [[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . G4 . G#4 . . . . . A#4 . G#4 . . . | . . C5 . A#4 . . . . . . . . . . .'),
      leadLen: [null,null,4,null,4,null,null,null,null,null,4,null,4,null,null,null,null,null,4,null,4,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,415.3046975799451,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G4 . . . . . G#4 . . . C5 . . . A#4 . | . . G4 . . . G#4 . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null],
      chords2: [[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . A#4 . C5 . . . . . C#5 . D#5 . . . | . . F5 . F#5 . . . . . . . . . . .'),
      leadLen: [null,null,4,null,4,null,null,null,null,null,4,null,4,null,null,null,null,null,4,null,4,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[261.6255653005986,311.1269837220809,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,415.3046975799451,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      chords2: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . . . . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,8,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,null,null,null],
      chords2: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 . . . .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,null,null,null,null],
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . . . .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | C5 . G#5 C6 . F5 G#5 . C6 . F6 G#5 . F5 C6 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . G#4 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('G#5 . . . . G5 . G#5 . C6 . A#5 . . . . | . G5 G#5 . . A#5 G#5 . . C6 A#5 . . . . .'),
      lead3Len: [3,null,null,null,null,2,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,3,null,null,1,3,null,null,null,null,null],
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . G#4 . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . F#4 .'),
      lead6Len: [null,null,2,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('G5 . . G#5 . C6 . A#5 . G5 . G#5 . . . . | . A#5 C6 . . C#6 D#6 . . F6 F#6 . . . . .'),
      lead3Len: [3,null,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,3,null,null,1,3,null,null,null,null,null],
    },
    {
      lead: seq('A#5 . . . . . . G#5 . F#5 . F5 . . . . | . F5 D#5 . . D#5 D5 . . D#5 . . . . . .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,4,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . F5 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('A#4 . F#5 A#5 . D#5 F#5 . A#5 . D#6 F#5 . D#5 A#5 . | C5 . G#5 C6 . D#5 G#5 . C6 . D#6 G#5 . D#5 C6 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . F#4 . . . . . . . F#4 . | . . . . . . . . . . . . . . G#4 .'),
      lead6Len: [null,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('A#6 . . . . . . G#6 . F#6 . F6 . . . . | . F6 D#6 . . D#6 D6 . . D#6 . . . . . .'),
      lead3Len: [3,null,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,3,null,null,3,null,null,null,null,null,null],
    },
    {
      lead: seq('A#5 . . . . . . G#5 . F#5 . C6 . . . . | . F5 D#5 . . D5 D#5 . D#5 . . . C5 . . .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('A#4 . F#5 A#5 . D#5 F#5 . A#5 . D#6 F#5 . D#5 A#5 . | C5 . G#5 C6 . D#5 G#5 . C6 . D#6 G#5 . D#5 C6 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 . C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('. . . . . . F#4 . . . . . . . F#4 . | . . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('A#6 . . . . . . G#6 . F#6 . C7 . . . . | . F6 D#6 . . D6 D#6 . D#6 . . . C6 . . .'),
      lead3Len: [3,null,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,2,null,3,null,null,null,3,null,null,null],
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451],null,[261.6255653005986,311.1269837220809,349.2282314330039,415.3046975799451]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F1 . . F1 . F2 F1 . . C2 . F1 D#2 . C2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | C5 . G#5 C6 . F5 G#5 . C6 . F6 G#5 . F5 C6 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . G#4 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('G#5 . . . . G5 . G#5 . C6 . A#5 . . . . | . G5 G#5 . . A#5 G#5 . . C6 A#5 . . . . .'),
      lead3Len: [3,null,null,null,null,2,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,3,null,null,1,3,null,null,null,null,null],
      lead5: seq('F4 . . . . F4 . F4 . G#4 . F#4 . . . . | . F4 F4 . . F#4 F4 . . G#4 F#4 . . . . .'),
      lead5Len: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,[277.1826309768721,369.9944227116344,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . G#4 . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . F#4 .'),
      lead6Len: [null,null,2,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('G5 . . G#5 . C6 . A#5 . G5 . G#5 . . . . | . A#5 C6 . . C#6 D#6 . . F6 F#6 . . . . .'),
      lead3Len: [3,null,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,3,null,null,1,3,null,null,null,null,null],
      lead5: seq('F4 . . F4 . G#4 . F#4 . F4 . F4 . . . . | . F#4 G#4 . . A#4 C5 . . C#5 D#5 . . . . .'),
      lead5Len: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
    },
    {
      lead: seq('C#6 . . . . . . C6 . A#5 . G#5 . . . . | . F5 D#5 . . F#5 F5 . . G#5 F#5 . . F5 D#5 .'),
      leadLen: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,2,2,null],
      lead2: seq('. . . . . . . . . . . . . F#5 . G#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('. . C#4 . . C#4 . C#4 . . C#4 . . C#4 . C#4 | . . C#4 . . C#4 . C#4 . . C#4 . . C#4 . C#4'),
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 . | C#2 . . C#2 . C#3 C#2 . . G#2 . C#2 B2 . G#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead6: seq('. . . . . . F4 . . . . . . . F4 . | . . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('C#7 . . . . . . C7 . A#6 . G#6 . . . . | . F6 D#6 . . F#6 F6 . . G#6 F#6 . . F6 D#6 .'),
      lead3Len: [3,null,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,1,3,null,null,1,3,null,null,1,3,null,null,1,2,null],
      lead5: seq('A#5 . . . . . . G#5 . F#5 . F5 . . . . | . C#5 C5 . . D#5 C#5 . . F5 D#5 . . C#5 C5 .'),
      lead5Len: [6,null,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,2,2,null],
    },
    {
      lead: seq('A#5 . . . A#5 . . . . F#5 . F5 . . . . | . F5 D#5 . . D5 D#5 . D#5 . . . C5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,[277.1826309768721,311.1269837220809,369.9944227116344,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899],null,[261.6255653005986,311.1269837220809,369.9944227116344,415.3046975799451,466.1637615180899]],
      chordsLen: [null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,1,null,1],
      bass2: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | G#1 . . G#1 . G#2 G#1 . . D#2 . G#1 F#2 . D#2 .'),
      bass2Len: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead4: seq('A#4 . F#5 A#5 . D#5 F#5 . A#5 . D#6 F#5 . D#5 A#5 . | C5 . G#5 C6 . D#5 G#5 . C6 . D#6 G#5 . D#5 C6 .'),
      lead4Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      rim2: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      lead6: seq('. . . . . . . . . . . . . . F#4 . | . . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      lead3: seq('A#6 . . . A#6 . . . . F#6 . F6 . . . . | . F6 D#6 . . D6 D#6 . D#6 . . . C6 . . .'),
      lead3Len: [3,null,null,null,3,null,null,null,null,2,null,3,null,null,null,null,null,1,3,null,null,1,2,null,3,null,null,null,3,null,null,null],
      lead5: seq('F#5 . . . F#5 . . . . D#5 . C#5 . . . . | . C#5 C5 . . C5 C5 . C5 . . . G#4 . . .'),
      lead5Len: [4,null,null,null,4,null,null,null,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('G#4 . . . . G4 . G#4 . C5 . A#4 . . . . | . G4 G#4 . . A#4 G#4 . . C5 A#4 . . . . .'),
      leadLen: [4,null,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . C#3 . . . C#2 . . C#3 . . . C#2 . | C#2 . . C#3 . . . C#2 . . C#3 . . . C#2 .'),
      bassLen: [2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null,2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G4 . . G#4 . C5 . A#4 . G4 . G#4 . . . . | . A#4 C5 . . C#5 D#5 . . F5 F#5 . . . . .'),
      leadLen: [2,null,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,2,null,null,2,2,null,null,2,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . C#3 . . . C#2 . . C#3 . . . C#2 . | G#1 . . G#2 . . . G#1 . . G#2 . . . G#1 .'),
      bassLen: [2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null,2,null,null,1,null,null,null,1,null,null,2,null,null,null,1,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 11,
  "style": "electro-funk",
  "options": {
    "style": "electro-funk",
    "mood": "funky",
    "mode": "major",
    "riffNotes": "keep",
    "length": "custom",
    "customBars": 64,
    "energy": "huge",
    "variation": "more",
    "tempo": "custom",
    "bpm": 116,
    "hook": "auto",
    "combo": null,
    "flavour": "boogie",
    "waysEra": 4,
    "production": {
      "mode": "style",
      "version": 1
    },
    "sectionFx": {
      "mode": "style",
      "assignments": {},
      "firstEffect": "none",
      "firstPart": "hook",
      "firstSection": "intro",
      "firstRange": "whole",
      "secondEffect": "none",
      "secondPart": "arp",
      "secondSection": "drop",
      "secondRange": "whole"
    },
    "expression": {
      "autoPortamento": false,
      "version": 1
    },
    "form": {
      "template": "club",
      "sections": null,
      "script": false,
      "intro": true,
      "layers": "off",
      "grooveIntro": false,
      "build": true,
      "breakdown": true,
      "secondDrop": true,
      "doubleDrop": false,
      "keyLift": "none",
      "keyApproach": "mood",
      "mood2": "none",
      "moodSwitch": "breakdown",
      "hardStop": false,
      "falseEnding": false,
      "halfTime": false,
      "outro": true,
      "breakdownHook": "half",
      "buildWay": "roll",
      "dropIn": "straight",
      "introWay": "riff",
      "tuneFirst": true,
      "groovePace": "eight",
      "drop2Way": "answer",
      "breakdownBacking": "classic",
      "clubShape": "club",
      "chordsEarly": false
    },
    "drums": {
      "source": "add",
      "kit": "style",
      "crashes": true,
      "fills": true,
      "rolls": false,
      "impact": false,
      "shaker": false,
      "tambourine": true,
      "congas": true,
      "cowbell": true,
      "ride": false
    },
    "parts": {
      "bass": "funk",
      "sub": false,
      "chords": "piano",
      "square": false,
      "bell": false,
      "octaveDouble": false,
      "riffBass": "replace",
      "bassLift": true,
      "thirdBelow": false,
      "arp": true,
      "arpPattern": "syncopated",
      "choir": false,
      "counter": true,
      "fillIn": "neighbour",
      "fillEvery": "4",
      "fillNotes": "1",
      "writeLead": "auto",
      "riffSound": "keep",
      "partSounds": "style",
      "soundSet": "style"
    },
    "spot": {
      "intoDrop": "repeat",
      "outOf": "throw",
      "quiet": "none",
      "intro": "style",
      "ending": "echo",
      "riser": "none"
    },
    "fx": {
      "gate": "style",
      "riser": false,
      "riserWay": "noise",
      "dropHit": "style",
      "filterBuild": true,
      "stutter": false,
      "pump": false,
      "delayThrows": true,
      "lowpassIntro": false,
      "bitcrushIntro": false,
      "tapeStop": false,
      "gateChoir": false
    }
  },
  "seed": 6427,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "electro-funk",
    "moodId": "funky",
    "parts": {}
  },
  "palette": [
    {
      "lane": "kick",
      "part": "part:kick",
      "preset": "ds808Kick",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "snare",
      "part": "part:snare",
      "preset": "ds808Snare",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "ds808Clap",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "hats",
      "part": "part:hats",
      "preset": "dsHatClosed",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "ohats",
      "part": "part:ohats",
      "preset": "ds808OpenHat",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "crash",
      "part": "part:crash",
      "preset": "cy808Cymbal",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom",
      "part": "part:fill",
      "preset": "ds808Tom",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "rim",
      "part": "part:tambourine",
      "preset": "tambourine",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "rim2",
      "part": "part:cowbell",
      "preset": "tr808CowbellClassic",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom2",
      "part": "part:congas",
      "preset": "congaMid",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "bass2",
      "part": "part:bass",
      "preset": "mrdrSynthSlap",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords",
      "part": "part:piano",
      "preset": "syncWireClav",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "tngrWarmStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:megaSaw",
      "preset": "tngrBrassSection",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:arp",
      "preset": "mrdrFunkGuitarMuted",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:third",
      "preset": "rmndDxPiano",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:counter",
      "preset": "mrdrHornStab",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    }
  ],
  "riff": {
    "version": 1,
    "source": {
      "id": "chopin-minute-waltz-boogie-source",
      "title": "Chopin: Minute Waltz, Op. 64 No. 1",
      "from": 0,
      "to": 7,
      "bpm": 116
    },
    "bars": 8,
    "grid": 16,
    "stats": {},
    "parts": [
      {
        "key": "lead",
        "label": "Waltz off the beat",
        "kind": "melodic",
        "role": "hook",
        "meanPitch": 77,
        "voice": "bestRobotVox",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          "G#4:4 . . . . G4:2 . G#4:2 . C5:2 . A#4:2 . . . .",
          ". G4:2 G#4:2 . . A#4:2 G#4:2 . . C5:2 A#4:2 . . . . .",
          "G4:2 . . G#4:2 . C5:2 . A#4:2 . G4:2 . G#4:2 . . . .",
          ". A#4:2 C5:2 . . C#5:2 D#5:2 . . F5:2 F#5:2 . . . . .",
          "A#5:6 . . . . . . G#5:2 . F#5:2 . F5:2 . . . .",
          ". F5:2 D#5:2 . . D#5:2 D5:2 . . D#5:4 . . . . . .",
          "A#5:6 . . . . . . G#5:2 . F#5:2 . F5:2 . . . .",
          ". F5:2 D#5:2 . . D5:2 D#5:2 . . F5:2 A#4:2 . . . . ."
        ]
      },
      {
        "key": "lead2",
        "label": "Horn replies",
        "kind": "melodic",
        "role": "counter",
        "meanPitch": 78,
        "voice": "bestPwmBrass",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          ". . . . . . . . . . . . . G#5:1 . G5:1",
          ". . . . . . . . . . . . . C5:1 . A#4:1",
          ". . . . . . . . . . . . . C5:1 . A#4:1",
          ". . . . . . . . . . . . . G#5:1 . A#5:1",
          ". . . . . . . . . . . . . D#5:1 . F5:1",
          ". . . . . . . . . . . . . G#5:1 . A#5:1",
          ". . . . . . . . . . . . . D#5:1 . F5:1",
          ". . . . . . . . . . . . . G#4:1 . C#5:1"
        ]
      },
      {
        "key": "bass",
        "label": "Slap-push bass cue",
        "kind": "melodic",
        "role": "bass",
        "meanPitch": 37,
        "voice": "bass80sFM",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          "C#2:2 . . C#3:1 . . . C#2:1 . . C#3:2 . . . C#2:1 .",
          "C#2:2 . . C#3:1 . . . C#2:1 . . C#3:2 . . . C#2:1 .",
          "C#2:2 . . C#3:1 . . . C#2:1 . . C#3:2 . . . C#2:1 .",
          "G#1:2 . . G#2:1 . . . G#1:1 . . G#2:2 . . . G#1:1 .",
          "G#1:2 . . G#2:1 . . . G#1:1 . . G#2:2 . . . G#1:1 .",
          "G#1:2 . . G#2:1 . . . G#1:1 . . G#2:2 . . . G#1:1 .",
          "C#2:2 . . C#3:1 . . . C#2:1 . . C#3:2 . . . C#2:1 .",
          "G#1:2 . . G#2:1 . . . G#1:1 . . G#2:2 . . . G#1:1 ."
        ]
      }
    ]
  },
  "source": {
    "id": "chopin-minute-waltz-boogie-source",
    "title": "Chopin: Minute Waltz, Op. 64 No. 1",
    "from": 0,
    "to": 7
  },
  "take": 1,
  "laneOf": {
    "hook": "lead",
    "riff:lead2": "lead2",
    "riff:bass": "bass",
    "kick": "kick",
    "snare": "snare",
    "clap": "clap",
    "hats": "hats",
    "ohats": "ohats",
    "crash": "crash",
    "fill": "tom",
    "tambourine": "rim",
    "cowbell": "rim2",
    "congas": "tom2",
    "bass": "bass2",
    "piano": "chords",
    "pad": "chords2",
    "megaSaw": "lead3",
    "arp": "lead4",
    "third": "lead5",
    "counter": "lead6"
  },
  "form": [
    {
      "id": "club:intro:1",
      "role": "intro",
      "type": "intro",
      "label": "Intro",
      "from": 1,
      "to": 4,
      "energy": 0.3
    },
    {
      "id": "club:build:1",
      "role": "build",
      "type": "build",
      "label": "Build",
      "from": 5,
      "to": 8,
      "energy": 0.6
    },
    {
      "id": "club:drop:1",
      "role": "drop",
      "type": "drop",
      "label": "Drop",
      "from": 9,
      "to": 32,
      "energy": 0.85
    },
    {
      "id": "club:breakdown:1",
      "role": "breakdown",
      "type": "breakdown",
      "label": "Breakdown",
      "from": 33,
      "to": 40,
      "energy": 0.25
    },
    {
      "id": "club:build:2",
      "role": "build2",
      "type": "build",
      "label": "Build 2",
      "from": 41,
      "to": 44,
      "energy": 0.65
    },
    {
      "id": "club:drop:2",
      "role": "drop2",
      "type": "drop",
      "label": "Drop 2",
      "from": 45,
      "to": 60,
      "energy": 0.9
    },
    {
      "id": "club:outro:1",
      "role": "outro",
      "type": "outro",
      "label": "Outro",
      "from": 61,
      "to": 64,
      "energy": 0.35
    }
  ],
  "report": {
    "version": 1,
    "summary": {
      "style": "Boogie",
      "mood": "funky",
      "key": "C# major",
      "reads": "C# major",
      "bars": 64,
      "bpm": 116,
      "seconds": 132,
      "variation": "more",
      "hook": "Waltz off the beat"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Boogie's own · kick · =808 Kick, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 0,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "snare",
        "job": "snare",
        "how": "sound",
        "from": "Boogie's own · snare · =808 Snare, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -3,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "clap",
        "job": "clap",
        "how": "sound",
        "from": "Boogie's own · clap · =808 Clap, bars 45–52",
        "base": 1,
        "before": 1,
        "after": 1,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "hats",
        "job": "hats",
        "how": "sound",
        "from": "Boogie's own · hats · Synth Closed Hat, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -5.2,
        "move": -2.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "ohats",
        "job": "ohats",
        "how": "sound",
        "from": "Boogie's own · ohats · =808 Open Hat, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -8,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "crash",
        "job": "crash",
        "how": "sound",
        "from": "Boogie's own · crash · 808 Cymbal, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -10,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "tom",
        "job": "fill",
        "how": "sound",
        "from": "Boogie's own · fill · =808 Tom, bars 52–59",
        "base": -6,
        "before": -6,
        "after": -6,
        "move": 0,
        "window": [
          51,
          58
        ],
        "calibrated": false
      },
      {
        "lane": "rim",
        "job": "tambourine",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · tambourine · Tambourine, bars 45–52",
        "base": -12,
        "before": -12,
        "after": -12,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "rim2",
        "job": "cowbell",
        "how": "sound",
        "from": "Boogie's own · cowbell · Classic 808 Cowbell, bars 45–52",
        "base": -12,
        "before": -12,
        "after": -12,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "tom2",
        "job": "congas",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · congas · Conga · Mid, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -8,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "bass2",
        "job": "bass",
        "how": "part",
        "from": "Boogie's own · bass · Synth Slap, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -1.7,
        "move": 1.3,
        "window": [
          44,
          51
        ],
        "calibrated": true
      },
      {
        "lane": "chords",
        "job": "piano",
        "how": "part",
        "from": "Boogie's own · piano · Sync Wire Clav, bars 45–52",
        "base": -8.5,
        "before": -8.5,
        "after": -9.1,
        "move": -0.6,
        "window": [
          44,
          51
        ],
        "calibrated": true
      },
      {
        "lane": "chords2",
        "job": "pad",
        "how": "part",
        "from": "Boogie's own · pad · Soft Strings, bars 1–4",
        "base": -10,
        "before": -10,
        "after": -11.2,
        "move": -1.2,
        "window": [
          4,
          7
        ],
        "calibrated": false
      },
      {
        "lane": "lead3",
        "job": "megaSaw",
        "how": "part",
        "from": "Boogie's own · megaSaw · Brass Section, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -7.1,
        "move": 1.9,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead4",
        "job": "arp",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · arp · Crystal Trigger, bars 45–52",
        "base": -10.5,
        "before": -10.5,
        "after": -11,
        "move": -0.5,
        "window": [
          44,
          51
        ],
        "calibrated": true
      },
      {
        "lane": "lead5",
        "job": "third",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · third · Electric Grand, bars 45–52",
        "base": -6.3,
        "before": -7,
        "after": -7.8,
        "move": -0.8,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "lead6",
        "job": "counter",
        "how": "part",
        "from": "Boogie's own · counter · Horn Section Stab, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -5.5,
        "move": 0.5,
        "window": [
          44,
          51
        ],
        "calibrated": true
      }
    ],
    "transitions": [],
    "expression": [],
    "lanes": [
      {
        "role": "hook",
        "lane": "lead",
        "label": "RIFF Waltz off the beat · HOOK",
        "voice": "bestRobotVox",
        "voiceParams": null,
        "strip": {
          "gain": -4.5,
          "send": {
            "delay": 0.2,
            "reverb": 0.3
          },
          "pan": 0,
          "eq": {
            "high": 2
          }
        },
        "noteFX": null
      },
      {
        "role": "riff:lead2",
        "lane": "lead2",
        "label": "RIFF Horn replies",
        "voice": "bestPwmBrass",
        "voiceParams": null,
        "strip": {
          "gain": -2
        },
        "noteFX": null
      },
      {
        "role": "riff:bass",
        "lane": "bass",
        "label": "RIFF Slap-push bass cue",
        "voice": "bass80sFM",
        "voiceParams": null,
        "strip": {
          "gain": -2
        },
        "noteFX": null
      },
      {
        "role": "kick",
        "lane": "kick",
        "label": "KICK",
        "voice": "ds808Kick",
        "voiceParams": null,
        "strip": {
          "gain": 0
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "SNARE Roll",
        "voice": "ds808Snare",
        "voiceParams": null,
        "strip": {
          "gain": -3,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "CLAP",
        "voice": "ds808Clap",
        "voiceParams": null,
        "strip": {
          "gain": 1,
          "send": {
            "reverb": 0.35
          }
        },
        "noteFX": null
      },
      {
        "role": "hats",
        "lane": "hats",
        "label": "HATS",
        "voice": "dsHatClosed",
        "voiceParams": null,
        "strip": {
          "gain": -5.2,
          "pan": -0.2
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "ds808OpenHat",
        "voiceParams": null,
        "strip": {
          "gain": -8,
          "pan": 0.2
        },
        "noteFX": null
      },
      {
        "role": "crash",
        "lane": "crash",
        "label": "CRASH",
        "voice": "cy808Cymbal",
        "voiceParams": null,
        "strip": {
          "gain": -10,
          "pan": 0.2,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "fill",
        "lane": "tom",
        "label": "FILL TOMS",
        "voice": "ds808Tom",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "pan": 0.25,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "tambourine",
        "lane": "rim",
        "label": "PERC Tambourine",
        "voice": "tambourine",
        "voiceParams": null,
        "strip": {
          "gain": -12,
          "pan": -0.3,
          "send": {
            "reverb": 0.15
          }
        },
        "noteFX": null
      },
      {
        "role": "cowbell",
        "lane": "rim2",
        "label": "PERC Cowbell",
        "voice": "tr808CowbellClassic",
        "voiceParams": null,
        "strip": {
          "gain": -12,
          "pan": 0.3
        },
        "noteFX": null
      },
      {
        "role": "congas",
        "lane": "tom2",
        "label": "PERC Congas",
        "voice": "congaMid",
        "voiceParams": null,
        "strip": {
          "gain": -8,
          "pan": -0.2,
          "send": {
            "reverb": 0.15
          }
        },
        "noteFX": null
      },
      {
        "role": "bass",
        "lane": "bass2",
        "label": "BASS · Synth Slap",
        "voice": "mrdrSynthSlap",
        "voiceParams": null,
        "strip": {
          "gain": -1.7
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "CLAV · Sync Wire Clav",
        "voice": "syncWireClav",
        "voiceParams": null,
        "strip": {
          "gain": -9.1,
          "pan": -0.3,
          "effects": [
            {
              "id": "autowah",
              "params": {
                "wet": 0.5
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "PAD · Warm Strings",
        "voice": "tngrWarmStrings",
        "voiceParams": null,
        "strip": {
          "gain": -11.2,
          "eq": {
            "low": -4
          },
          "send": {
            "reverb": 0.4
          }
        },
        "noteFX": null
      },
      {
        "role": "megaSaw",
        "lane": "lead3",
        "label": "LEAD 8VA · Brass Section",
        "voice": "tngrBrassSection",
        "voiceParams": null,
        "strip": {
          "gain": -7.1,
          "pan": -0.1,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead4",
        "label": "ARP · Funk Guitar · Muted",
        "voice": "mrdrFunkGuitarMuted",
        "voiceParams": null,
        "strip": {
          "gain": -11,
          "pan": -0.25,
          "send": {
            "delay": 0.2,
            "reverb": 0.2
          },
          "effects": [
            {
              "id": "autopanner",
              "params": {
                "rateSync": 1,
                "rateDivision": 2,
                "depth": 0.5,
                "wet": 1
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead5",
        "label": "THIRD BELOW · FM Piano",
        "voice": "rmndDxPiano",
        "voiceParams": null,
        "strip": {
          "gain": -7.8,
          "pan": 0.15,
          "send": {
            "delay": 0.1,
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "counter",
        "lane": "lead6",
        "label": "HORNS · Horn Section Stab",
        "voice": "mrdrHornStab",
        "voiceParams": null,
        "strip": {
          "gain": -5.5,
          "pan": 0.2,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      }
    ]
  },
  "sectionEffects": {
    "version": 1,
    "mode": "style",
    "decisions": []
  },
  "prints": {
    "roles": {
      "hook": {
        "notes": "71f9967f",
        "voice": "a364122b",
        "auto": "ae2fe64b",
        "expression": "77074ba4",
        "production": "181c5976"
      },
      "riff:lead2": {
        "notes": "a6bdd065",
        "voice": "2beb46e7",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "riff:bass": {
        "notes": "6437bb51",
        "voice": "6a9054d9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "kick": {
        "notes": "22f18bcb",
        "voice": "b38f6af9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "3a3f4d5a",
        "voice": "e0352a86",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "9ebbb05",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "hats": {
        "notes": "d5a9cd05",
        "voice": "66d7c48",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "e491dbb5",
        "voice": "4322ced2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "9285c3df",
        "voice": "3eff875c",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "fill": {
        "notes": "78c0b022",
        "voice": "352acb51",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "tambourine": {
        "notes": "58aabcbd",
        "voice": "4a3e77e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "cowbell": {
        "notes": "831100a3",
        "voice": "e60365e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "congas": {
        "notes": "51f2c23d",
        "voice": "3e7da3dc",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "bass": {
        "notes": "d8c1d82e",
        "voice": "6d9b30eb",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "fdbd6e09",
        "voice": "84a53cc",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "2a4ca3a9"
      },
      "pad": {
        "notes": "bf81d85",
        "voice": "8fe72f42",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "19b0da9a"
      },
      "megaSaw": {
        "notes": "e86e62ef",
        "voice": "b7854edb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "arp": {
        "notes": "58134f5c",
        "voice": "2526ea06",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "59ba867a"
      },
      "third": {
        "notes": "a53ca717",
        "voice": "70ed5af2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "ab8fb181",
        "voice": "9df4c652",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      }
    },
    "master": "6fddd94"
  }
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead2", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","rim","rim2","tom2","bass2","chords","chords2","lead","lead3","lead4","lead5","lead6","lead2","bass"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"FILL TOMS","rim":"PERC Tambourine","rim2":"PERC Cowbell","tom2":"PERC Congas","bass2":"BASS · Synth Slap","chords":"CLAV · Sync Wire Clav","chords2":"PAD · Warm Strings","lead":"RIFF Waltz off the beat · HOOK","lead3":"LEAD 8VA · Brass Section","lead4":"ARP · Funk Guitar · Muted","lead5":"THIRD BELOW · FM Piano","lead6":"HORNS · Horn Section Stab","lead2":"RIFF Horn replies","bass":"RIFF Slap-push bass cue"},
  voice: {"kickVoice":"fatKick","snareVoice":"gbSnare","clapVoice":"ds808Clap","hatsVoice":"cr78Hat","ohatsVoice":"ds808OpenHat","crashVoice":"cy808Cymbal","tomVoice":"ds808Tom","rimVoice":"tambourine","rim2Voice":"tr808CowbellClassic","tom2Voice":"congaMid","bass2Voice":"mrdrSynthSlap","chordsVoice":"syncWireClav","chords2Voice":"tngrWarmStrings","leadVoice":"initSquare","lead3Voice":"tngrBrassSection","lead4Voice":"mrdrFunkGuitarMuted","lead5Voice":"rmndDxPiano","lead6Voice":"mrdrHornStab","lead2Voice":"bestPwmBrass","bassVoice":"bass80sFM"},
  voiceParams: {"hatsVoice":{"label":"CR-78 Hi-Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"Noise into the hat's 9.1 kHz LC resonance, 60 ms to fall away.","noise":{"type":"bandpass","freq":9100,"Q":1.5,"attack":0,"decay":0.642,"gain":1},"starter":false,"kind":"drum","level":0.03244307781141548,"peak":0.4550973083335056,"songOrigin":"library","songSourceId":"hatsVoice"},"ohatsVoice":{"label":"=808 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open 808-style cymbal partner: the same inharmonic cluster left ringing with a lower filter so its body is audible as it fades, plus a restrained resonant tail.","metal":{"freq":540,"spread":1,"count":6,"hp":7670,"Q":0.9,"slope":-24,"decay":0.752,"resonator":{"feedback":0.92,"drive":1.2,"leak":0.00025},"hold":0.005,"hpSweep":0.212},"humanize":{"gain":0.04},"starter":false,"kind":"drum","level":0.08453904319470468,"peak":0.5953692748033416,"songOrigin":"library","songSourceId":"ohatsVoice"},"kickVoice":{"label":"Fat Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"triangle","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.42,"curve":"exp","gain":1},"knock":1,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"starter":false,"id":"fatKick","kind":"drum","user":true,"level":0.035113,"peak":0.9364},"snareVoice":{"label":"GB Snare","category":"Snare","dur":1,"note":"Cheap simple game snare","osc":{"type":"square","from":2310,"to":20.85,"sweep":0.392,"decay":0.27,"curve":"exp","gain":0.55},"noise":{"type":"bandpass","freq":6590,"Q":2.9,"decay":0.768,"gain":1.84,"to":475,"color":"pink","sweep":0.395,"sag":0.3,"slope":-12},"drive":0.397771,"shape":"soft","tone":{"type":"lowpass","Q":0.7,"freq":7085},"taps":[0,0.012],"tapFalloff":0.52,"starter":false,"trim":-0.383609,"id":"gbSnare","kind":"drum","user":true,"level":0.126075,"peak":1.1525},"clapVoice":{"label":"=808 Clap","category":"Clap","homeLane":"clap","dur":1,"note":"A wide 808-style clap with a low, roomy burst and four taps that spread into a soft machine-room tail.","noise":{"type":"bandpass","freq":1450,"to":950,"sweep":0.16,"Q":1,"decay":0.18,"gain":1},"taps":[0,0.012,0.027,0.046],"tapFalloff":0.86,"id":"ds808Clap","kind":"drum","factory":true,"level":0.014409,"peak":0.3172},"crashVoice":{"label":"808 Cymbal","category":"Crash","homeLane":"crash","dur":4,"note":"The 808’s CY rather than its hat — the same six squares, but bandpassed and left to ring for two seconds with the centre climbing from 3.6 to 5.2 kHz as it goes, with a restrained resonant tail. The band the ear follows moves up through the decay, which is what the analysis says a real cymbal does.","metal":{"wave":"square","freq":540,"count":6,"spread":1,"filter":"bandpass","hp":3600,"hpTo":5200,"hpSweep":1.2,"Q":1.3,"slope":-12,"decay":1.9,"sag":0.35,"sagAt":0.08,"gain":0.6,"resonator":{"feedback":0.9,"drive":1.2,"leak":0.0003}},"drive":0.127588,"humanize":{"gain":0.03},"id":"cy808Cymbal","kind":"drum","factory":true,"level":0.045108,"peak":0.3517},"tomVoice":{"label":"=808 Tom","category":"Tom","homeLane":"tom","dur":2,"note":"A deep 808-style tom with a long sine drop and a clean, rounded tail for syncopated fills and tuned percussion lines.","osc":{"type":"sine","from":215,"to":92,"sweep":0.1,"decay":0.48,"curve":"exp","gain":1},"drive":0.099843,"id":"ds808Tom","kind":"drum","factory":true,"level":0.044775,"peak":0.6978},"rimVoice":{"label":"Tambourine","category":"Perc","homeLane":"rim","dur":1,"note":"Bright, jangly and slightly longer, with a touch of pitch in it.","osc":{"type":"square","from":900,"to":780,"sweep":0.05,"decay":0.05,"gain":0.12},"noise":{"type":"highpass","freq":5200,"Q":0.6,"decay":0.14},"id":"tambourine","kind":"drum","factory":true,"level":0.032351,"peak":0.9308},"rim2Voice":{"label":"Classic 808 Cowbell","category":"Perc","homeLane":"tom","dur":1,"note":"The reference TR-808 balance: 540 and 800 Hz squares, a 1.3 kHz 12 dB/oct bandpass at Q4, and a 200ms exponential decay to the -60 dB floor.","metal":{"wave":"square","freq":540,"ratios":[1,1.481481],"spread":1,"count":2,"filter":"bandpass","hp":1300,"Q":4,"slope":-12,"attack":0,"decay":0.2,"floor":0.001,"hardStop":true,"resonator":{"feedback":0.96,"drive":1.4,"leak":0.0005}},"id":"tr808CowbellClassic","kind":"drum","factory":true,"level":0.02003,"peak":0.4688},"tom2Voice":{"label":"Conga · Mid","category":"Perc","homeLane":"tom","dur":1,"note":"A centered open conga with a warm falling body and a little shell noise on the front, designed to answer the high and low voices cleanly.","osc":{"type":"sine","from":285,"to":205,"sweep":0.045,"decay":0.32,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":1700,"Q":0.65,"decay":0.022,"gain":0.3},"drive":0.098995,"id":"congaMid","kind":"drum","factory":true,"level":0.03776,"peak":0.686},"bass2Voice":{"label":"Synth Slap","category":"Bass","synth":"MRDR-3","dur":1,"note":"The analogue answer: saw and square through a resonant 24 dB lowpass whose envelope spits open and shuts. Rubbery rather than stringy — the Jupiter/SH-101 take on slap that half of eighties pop actually used.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.8,"attack":0.001,"decay":0.6,"sustain":0.5,"release":0.07},"osc2":{"type":"square","ratio":1,"gain":0.45,"detune":-6,"attack":0.001,"decay":0.6,"sustain":0.5,"release":0.07},"osc3":{"type":"sine","ratio":0.5,"gain":0.35,"attack":0.001,"decay":0.7,"sustain":0.6,"release":0.07}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":180,"Q":4,"track":0.7,"env":{"octaves":4.6,"attack":0.001,"decay":0.09,"sustain":0.05,"release":0.06}}},"drive":0.306445,"shape":"soft","humanize":{"entry":0.004,"gain":0.08},"id":"mrdrSynthSlap","kind":"tone","factory":true,"level":0.185584,"peak":1.6434},"chordsVoice":{"label":"Sync Wire Clav","category":"Keys","synth":"MRDR-3","dur":0.9,"note":"A short square slave is reset at a lopsided interval for a taut, metallic clav attack without using an FM operator.","sync":"1+2","layer":{"osc1":{"type":"triangle","ratio":1,"gain":1,"attack":0.001,"decay":0.24,"sustain":0.05,"release":0.06},"osc2":{"type":"square","ratio":3.91,"gain":0.86,"len":0.76,"attack":0.001,"decay":0.19,"sustain":0.02,"release":0.045}},"global":{"filter":{"type":"bandpass","slope":-12,"freq":1250,"Q":2.1,"track":0.48,"env":{"octaves":2.4,"attack":0.001,"decay":0.16,"sustain":0.04,"release":0.05}},"vca":{"attack":0.001,"decay":9.77,"sustain":0.09,"release":0.07}},"drive":0.417119,"shape":"soft","tone":{"freq":9200},"bypassed":{"layer.osc1.filter":{"type":"lowpass","freq":1150,"Q":1.15}},"trim":5.637978,"id":"syncWireClav","kind":"tone","factory":true,"level":0.040546,"peak":0.7612},"chords2Voice":{"label":"Warm Strings","category":"Orch","synth":"TNGR-2","dur":6,"note":"A restrained ensemble-style string bed with slow natural articulation.","tngr2":{"oscA":{"table":"sawForm","position":0.18,"envAmount":0.06,"level":0.76,"unison":1},"amp":{"attack":0.42,"decay":1.2,"sustain":0.82,"release":1.5},"filter":{"type":"lowpass","slope":-24,"cutoff":3300,"resonance":0.96},"filterEnv":{"amount":0.35,"attack":0.5,"decay":1.4,"sustain":0.55},"positionEnv":{"attack":0.8,"decay":2.2,"sustain":0.35},"master":{"gain":0.57}},"id":"tngrWarmStrings","kind":"tone","factory":true,"level":0.036406,"peak":0.246},"leadVoice":{"label":"Triple Square","category":"Keys","synth":"MRDR-3","dur":1.5,"note":"Three squares at the same pitch, seven cents either side of centre. No filter, no sweep, no modulation — the shortest thing this synth can be and still be one.","layer":{"osc1":{"type":"square","ratio":1,"detune":0,"gain":0.6,"attack":0,"decay":0.25,"sustain":0.75,"release":0.12},"osc2":{"type":"square","ratio":1,"detune":-7,"gain":0.6,"attack":0,"decay":0.25,"sustain":0.75,"release":0.12},"osc3":{"type":"square","ratio":1,"detune":7,"gain":0.6,"attack":0,"decay":0.25,"sustain":0.75,"release":0.12}},"id":"initSquare","kind":"tone","factory":true,"level":0.205348,"peak":1.1476},"lead3Voice":{"label":"Brass Section","category":"Orch","synth":"TNGR-2","dur":3,"note":"A direct ensemble brass patch with a modest opening bite.","tngr2":{"oscA":{"table":"sawForm","position":0.34,"envAmount":0.24,"level":0.85,"unison":1},"amp":{"attack":0.055,"decay":0.5,"sustain":0.78,"release":0.38},"filter":{"type":"lowpass","slope":-24,"cutoff":1550,"resonance":0.8},"filterEnv":{"amount":2.1,"attack":0.06,"decay":0.42,"sustain":0.3},"positionEnv":{"attack":0.08,"decay":0.45,"sustain":0.23,"release":0.477},"master":{"gain":0.58},"oscB":{"table":"reedWire","position":0.12,"level":0.09,"unison":1,"detune":3}},"chorus":{"mix":0.15,"rate":2,"depth":0.19},"id":"tngrBrassSection","kind":"tone","factory":true,"level":0.028819,"peak":0.381},"lead4Voice":{"label":"Funk Guitar · Muted","category":"Pluck","homeLane":"chords","synth":"MRDR-3","dur":0.25,"note":"The same clean funk guitar with the palm on the strings: every pick a dry scratch, mostly pick and quack, gone in a sixteenth. For the scratch between the chops.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.5,"attack":0.001,"decay":0.07,"sustain":0,"release":0.03,"filter":{"type":"lowpass","slope":-12,"freq":1800,"Q":0.9,"track":0.6,"env":{"octaves":1.2,"attack":0.001,"decay":0.04,"sustain":0,"release":0.03}}},"osc2":{"type":"pulse","width":0.22,"ratio":1,"gain":0.45,"detune":4,"attack":0.001,"decay":0.06,"sustain":0,"release":0.03,"filter":{"type":"bandpass","slope":-12,"freq":1500,"Q":1.6,"track":0.3}},"osc3":{"type":"noise","ratio":1,"gain":0.14,"color":"white","attack":0.001,"decay":0.025,"sustain":0,"release":0.01,"filter":{"type":"bandpass","slope":-12,"freq":2600,"Q":1.2,"track":0}}},"global":{"filter":{"type":"highpass","slope":-12,"freq":250,"Q":0.7,"track":0},"vca":{"attack":0.001,"decay":0.08,"sustain":0,"release":0.03}},"humanize":{"entry":0.004,"gain":0.12},"id":"mrdrFunkGuitarMuted","kind":"tone","factory":true,"level":0.002152,"peak":0.1848},"lead5Voice":{"label":"FM Piano","category":"Keys","synth":"RMND-2","dur":2.4,"note":"Harmonicity 1 is a full harmonic series; the index falls from bright to nearly a sine across the first second. The DX7 piano everybody has heard.","options":{"harmonicity":1,"modulationIndex":2.4,"oscillator":{"type":"sine"},"modulation":{"type":"sine"},"envelope":{"attack":0.002,"decay":2.4,"sustain":0.02,"release":0.6},"modulationEnvelope":{"attack":0.001,"decay":0.9,"sustain":0.06,"release":0.5}},"id":"rmndDxPiano","kind":"tone","factory":true,"level":0.02674,"peak":0.2183},"lead6Voice":{"label":"Horn Section Stab","category":"Orch","synth":"MRDR-3","dur":0.8,"note":"Trumpet, tenor and trombone hitting one short note together, funk-band style: three saws an octave apart, a fall-in from a semitone above, and a filter that barks open and is closed again before the next sixteenth.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.7,"attack":0.006,"decay":0.2,"sustain":0.3,"release":0.06,"unison":3,"spread":10,"stereo":0.5,"pitch":{"semitones":1,"decay":0.03}},"osc2":{"type":"sawtooth","ratio":0.5,"gain":0.4,"attack":0.008,"decay":0.2,"sustain":0.3,"release":0.06},"osc3":{"type":"sawtooth","ratio":2,"gain":0.22,"attack":0.006,"decay":0.15,"sustain":0.2,"release":0.05}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":1300,"Q":1.2,"track":0.4,"env":{"octaves":1.8,"attack":0.006,"decay":0.12,"sustain":0.25,"release":0.06}},"vca":{"attack":0.006,"decay":0.22,"sustain":0.35,"release":0.07}},"drive":0.14721,"shape":"soft","humanize":{"entry":0.005,"gain":0.06},"id":"mrdrHornStab","kind":"tone","factory":true,"level":0.02808,"peak":0.6742},"lead2Voice":{"label":"PWM Brass","category":"Orch","synth":"MRDR-3","dur":2.4,"note":"The Jupiter brass stab: a pulse leaning on a saw, the width moving fast enough to be heard inside a short note, and the shared filter opening three octaves as the section leans in.","layer":{"osc1":{"type":"pulse","width":0.37,"ratio":1,"gain":0.9,"attack":0.012,"decay":0.7,"sustain":0.8,"release":0.25,"pwm":{"type":"sine","rate":1.23,"depth":0.52,"delay":0.05}},"osc2":{"type":"sawtooth","ratio":1,"detune":7,"gain":0.6,"attack":0.033,"decay":0.7,"sustain":0.75,"release":0.25,"unison":2,"spread":11},"osc3":{"type":"pulse","width":0.5,"ratio":0.5,"gain":0.4,"attack":0.03,"decay":0.8,"sustain":0.85,"release":0.22,"pwm":{"type":"sine","rate":1.61,"depth":0.42,"delay":0.05}}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":520,"Q":1.15,"track":0.5,"env":{"octaves":1.4,"attack":0.044,"decay":0.75,"sustain":0.45,"release":0.3}},"vca":{"attack":0.019,"decay":0.8,"sustain":0.85,"release":0.32,"attackCurve":"lin"}},"drive":0,"shape":"soft","tone":{"freq":11000},"vibrato":{"depth":0.11,"rate":5,"delay":0.5},"chorus":{"mix":0.2},"id":"bestPwmBrass","kind":"tone","factory":true,"level":0.170536,"peak":1.7208},"bassVoice":{"label":"=80s FM Bass","category":"Bass","synth":"RMND-2","dur":1.8,"note":"A bright digital 80s bass: a sine body with a square modulator, tuned for the glassy attack of an FM workstation under a pop groove.","options":{"harmonicity":1.5,"modulationIndex":7,"oscillator":{"type":"sine"},"modulation":{"type":"square"},"envelope":{"attack":0.003,"decay":0.34,"sustain":0.36,"release":0.24},"modulationEnvelope":{"attack":0.002,"decay":0.18,"sustain":0.22,"release":0.16}},"id":"bass80sFM","kind":"tone","factory":true,"level":0.021042,"peak":0.2208}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    snare: { gain: 1.632, send: { reverb: 0.3 } },
    clap: { gain: 3.072, send: { reverb: 0.35 } },
    hats: { gain: 1.872, pan: -0.2, eq: { high: 4.7 } },
    ohats: { gain: 3.024, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    tom: { gain: -6, pan: 0.25, send: { reverb: 0.3 } },
    rim: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    rim2: { gain: -12, pan: 0.3 },
    tom2: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    bass2: { gain: -1.7 },
    chords: { gain: -4.88, pan: -0.3, send: { delay: 0.274, reverb: 1.384 }, effects: [{ id: "autowah", params: { wet: 0.5 } }] },
    chords2: { gain: -11.2, send: { reverb: 0.4 }, eq: { low: -4 } },
    lead: { gain: -0.7, mute: true, send: { delay: 0.2, reverb: 0.3 }, eq: { high: 2 } },
    lead3: { gain: -7.1, pan: -0.1, send: { reverb: 0.3 } },
    lead4: { gain: -11, pan: -0.25, send: { delay: 0.2, reverb: 0.2 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    lead5: { gain: -7.8, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead6: { gain: -5.5, pan: 0.2, send: { reverb: 0.3 } },
    lead2: { gain: -2 },
    bass: { gain: -2 },
    kick: { gain: 1.824 },
  },
};

export const arrangement = {
  swing: 55,
  choke: {
    hats: "ohats",
  },
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  automation: {
    __master: {
      fx: [
        {
          from: [8,8],
          to: [8,12],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.5,
                retrigger: 0,
                fade: 0,
              },
            },
          ],
        },
        {
          from: [8,12],
          to: [9,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.25,
                retrigger: 0,
                fade: -1,
              },
            },
          ],
        },
        {
          from: [44,8],
          to: [44,12],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.5,
                retrigger: 0,
                fade: 0,
              },
            },
          ],
        },
        {
          from: [44,12],
          to: [45,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.25,
                retrigger: 0,
                fade: -1,
              },
            },
          ],
        },
        {
          from: [63,0],
          to: [65,0],
          chain: [
            {
              id: "delay",
              params: {
                sync: 1,
                division: 0.75,
                feedback: 0.65,
                wet: 0.55,
              },
            },
          ],
        },
      ],
    },
    lead: {
      fx: [
        {
          from: [32,8],
          to: [33,4],
          chain: [
            {
              id: "delay",
              params: {
                sync: 1,
                division: 0.75,
                feedback: 0.6,
                wet: 0.5,
              },
            },
          ],
        },
        {
          from: [60,8],
          to: [61,4],
          chain: [
            {
              id: "delay",
              params: {
                sync: 1,
                division: 0.75,
                feedback: 0.6,
                wet: 0.5,
              },
            },
          ],
        },
      ],
    },
    chords: {
      fx: [
        {
          from: [5,0],
          to: [9,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
        {
          from: [41,0],
          to: [45,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
      ],
    },
    chords2: {
      fx: [
        {
          from: [5,0],
          to: [9,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
        {
          from: [41,0],
          to: [45,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
      ],
    },
    bass2: {
      fx: [
        {
          from: [5,0],
          to: [9,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
        {
          from: [41,0],
          to: [45,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
      ],
    },
    lead4: {
      fx: [
        {
          from: [5,0],
          to: [9,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
        {
          from: [41,0],
          to: [45,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 350,
                Q: 1.1,
                sweep: 1,
                sweepTo: 14000,
              },
            },
          ],
        },
      ],
    },
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
