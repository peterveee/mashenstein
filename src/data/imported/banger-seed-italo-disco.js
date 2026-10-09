// ITALO DISCO SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Italo Disco's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-italo-disco";
export const title = "ITALO DISCO SEED";
export const slug = "banger-seed-italo-disco";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 118,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 . . . .'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | D2 D2 D3 D2 D2 D2 D3 D2 A1 A1 A2 A1 A1 A1 A2 A1'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A4 F5 D5 A5 A4 F5 D5 A5 A4 E5 C#5 A5 A4 E5 C#5 A5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A#4 . . . C5 . . . C5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C5 . . . C5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('A1 A1 A2 A1 A1 A1 A2 A1 A1 A1 A2 A1 A1 A1 A2 A1 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 E5 C5 A5 A4 E5 C5 A5 A4 E5 C5 A5 A4 E5 C5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A#4 . . . C5 . . . C5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | D2 D2 D3 D2 D2 D2 D3 D2 A1 A1 A2 A1 A1 A1 A2 A1'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A4 F5 D5 A5 A4 F5 D5 A5 A4 E5 C#5 A5 A4 E5 C#5 A5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . D5 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A#4 . . . C5 . . . C5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A#4 . . . C5 . . . C5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 C5 G5 E5 C6 C5 G5 E5 C6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A#4 . . . C5 . . . C5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | D2 D2 D3 D2 D2 D2 D3 D2 A1 A1 A2 A1 A1 A1 A2 A1'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A4 F5 D5 A5 A4 F5 D5 A5 A4 E5 C#5 A5 A4 E5 C#5 A5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . D5 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords: [[174.61411571650194,220,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,440,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[587.3295358348151,698.4564628660078,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords: [[233.08188075904496,293.6647679174076,391.99543598174927,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,587.3295358348151,783.9908719634985,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords: [[174.61411571650194,220,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,440,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[587.3295358348151,698.4564628660078,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords: [[233.08188075904496,293.6647679174076,391.99543598174927,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,587.3295358348151,783.9908719634985,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 C2 C2 C3 C2 C2 C2 C3 C2'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      bass: seq('D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 | A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 B1 B1 B2 B1 . . . .'),
      bassLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . A#1 . . . A#1 . . . B0 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead5: seq('A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 A4 F5 D5 A5 | A#4 F5 D5 A#5 A#4 F5 D5 A#5 B4 F#5 D#5 B5 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | C2 . C2 C2 C2 . C2 C2 D2 . D2 D2 D2 . D2 D2'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . C2 . . . C2 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | C5 G5 E5 C6 C5 G5 E5 C6 D5 A5 F#5 D6 D5 A5 F#5 D6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . C5 . . . D5 . . . D5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | C2 . C2 C2 C2 . C2 C2 D2 . D2 D2 D2 . D2 D2'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . C2 . . . C2 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | C5 G5 E5 C6 C5 G5 E5 C6 D5 A5 F#5 D6 D5 A5 F#5 D6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . E5 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . D5 . . . D5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . C5 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[987.7666025122483,1975.533205024496],null,[1174.6590716696303,2349.31814333926],null,[1479.9776908465376,2959.955381693075],null,[1174.6590716696303,2349.31814333926],null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,[1046.5022612023945,2093.004522404789],null,[783.9908719634985,1567.981743926997],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[293.6647679174076,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | C2 . C2 C2 C2 . C2 C2 D2 . D2 D2 D2 . D2 D2'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . B1 . . . B1 . . . B1 . . . B1 . | . . C2 . . . C2 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 F#5 D5 B5 B4 F#5 D5 B5 B4 F#5 D5 B5 B4 F#5 D5 B5 | C5 G5 E5 C6 C5 G5 E5 C6 D5 A5 F#5 D6 D5 A5 F#5 D6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('B5 . D6 . F#6 . D6 . B5 . . . A5 . C6 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . C5 . . . D5 . . . D5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[369.9944227116344,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | E2 . E2 E2 E2 . E2 E2 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | B4 G5 E5 B5 B4 G5 E5 B5 B4 F#5 D#5 B5 B4 F#5 D#5 B5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . E5 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | C2 . C2 C2 C2 . C2 C2 D2 . D2 D2 D2 . D2 D2'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . C2 . . . C2 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | C5 G5 E5 C6 C5 G5 E5 C6 D5 A5 F#5 D6 D5 A5 F#5 D6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . C5 . . . D5 . . . D5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[1174.6590716696303,2349.31814333926],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,[880,1760],null,[783.9908719634985,1567.981743926997],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | C2 . C2 C2 C2 . C2 C2 D2 . D2 D2 D2 . D2 D2'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . C2 . . . C2 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | C5 G5 E5 C6 C5 G5 E5 C6 D5 A5 F#5 D6 D5 A5 F#5 D6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . C5 . . . D5 . . . D5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | C2 . C2 C2 C2 . C2 C2 D2 . D2 D2 D2 . D2 D2'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . C2 . . . C2 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | C5 G5 E5 C6 C5 G5 E5 C6 D5 A5 F#5 D6 D5 A5 F#5 D6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . C5 . . . D5 . . . D5 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,440,587.3295358348151],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      bass: seq('E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | E2 . E2 E2 E2 . E2 E2 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 B4 G5 E5 B5 | B4 G5 E5 B5 B4 G5 E5 B5 B4 F#5 D#5 B5 B4 F#5 D#5 B5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . E5 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 6,
  "style": "italo-disco",
  "options": {
    "style": "italo-disco",
    "mood": "anthemic",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 118,
    "hook": "auto",
    "combo": null,
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
      "keyLift": "whole",
      "keyApproach": "mood",
      "mood2": "none",
      "moodSwitch": "breakdown",
      "hardStop": false,
      "falseEnding": false,
      "halfTime": false,
      "outro": true,
      "breakdownHook": "half"
    },
    "drums": {
      "source": "add",
      "kit": "style",
      "crashes": true,
      "fills": true,
      "rolls": false,
      "impact": false,
      "shaker": true,
      "tambourine": true,
      "congas": true,
      "cowbell": true,
      "ride": true
    },
    "parts": {
      "bass": "rolling",
      "sub": true,
      "chords": "pad",
      "square": true,
      "bell": true,
      "octaveDouble": true,
      "riffBass": "replace",
      "bassLift": true,
      "thirdBelow": true,
      "arp": true,
      "arpPattern": "style",
      "choir": true,
      "counter": true,
      "fillIn": "off",
      "fillEvery": "2",
      "fillNotes": "2",
      "writeLead": "auto",
      "riffSound": "keep",
      "partSounds": "style",
      "soundSet": "style"
    },
    "spot": {
      "intoDrop": "style",
      "outOf": "style",
      "quiet": "none",
      "intro": "style",
      "ending": "style"
    },
    "fx": {
      "gate": "style",
      "riser": false,
      "filterBuild": false,
      "stutter": false,
      "pump": false,
      "delayThrows": true,
      "lowpassIntro": false,
      "bitcrushIntro": false,
      "tapeStop": false,
      "gateChoir": false
    }
  },
  "seed": 1,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "italo-disco",
    "moodId": "anthemic",
    "parts": {}
  },
  "palette": [
    {
      "lane": "kick",
      "part": "part:kick",
      "preset": "ds909Kick",
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
      "preset": "dsCr78Hat",
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
      "preset": "ds909Crash",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom",
      "part": "part:fill",
      "preset": "sdDiscoTom",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "rim",
      "part": "part:shaker",
      "preset": "shaker",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "rim2",
      "part": "part:tambourine",
      "preset": "tambourine",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "rim3",
      "part": "part:cowbell",
      "preset": "ds808Cowbell",
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
      "lane": "crash2",
      "part": "part:ride",
      "preset": "ride909SixBit",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "bass",
      "part": "part:bass",
      "preset": "bass80sFM",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "bass2",
      "part": "part:sub",
      "preset": "stSubSine",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords",
      "part": "part:pad",
      "preset": "tngrPolarDrift",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "tngrBerlinSignal",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:bell",
      "preset": "tngrIceBell",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:megaSaw",
      "preset": "tngrHorizonSolo",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:arp",
      "preset": "tngrCrystalTrigger",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:choir",
      "preset": "bestChoirAah",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
      "part": "part:third",
      "preset": "tngrDigitalEp84",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "tngrCrystalTrigger",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    }
  ],
  "riff": {
    "version": 1,
    "source": {
      "id": "banger-seed",
      "title": "SEED",
      "from": 0,
      "to": 1,
      "bpm": 128
    },
    "bars": 2,
    "grid": 16,
    "stats": {},
    "parts": [
      {
        "key": "lead",
        "label": "Grand",
        "kind": "melodic",
        "role": "hook",
        "meanPitch": 74,
        "voice": "mrdrElectricGrand",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          "D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .",
          "D5:4 . . . A4:2 . . . F5:2 . . . E5:2 . . ."
        ]
      }
    ]
  },
  "source": {
    "id": "banger-seed",
    "title": "SEED",
    "from": 0,
    "to": 1
  },
  "take": 1,
  "laneOf": {
    "hook": "lead",
    "kick": "kick",
    "snare": "snare",
    "clap": "clap",
    "hats": "hats",
    "ohats": "ohats",
    "crash": "crash",
    "fill": "tom",
    "shaker": "rim",
    "tambourine": "rim2",
    "cowbell": "rim3",
    "congas": "tom2",
    "ride": "crash2",
    "bass": "bass",
    "sub": "bass2",
    "pad": "chords",
    "square": "lead2",
    "bell": "lead3",
    "megaSaw": "lead4",
    "arp": "lead5",
    "choir": "lead6",
    "third": "lead7",
    "counter": "lead8"
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
      "style": "Italo Disco",
      "mood": "anthemic",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 118,
      "seconds": 130,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Italo Disco's own · kick · =909 Kick, bars 45–52",
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
        "from": "Italo Disco's own · snare · =808 Snare, bars 45–52",
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
        "from": "Italo Disco's own · clap · =808 Clap, bars 45–52",
        "base": 1.5,
        "before": 1.5,
        "after": 1.5,
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
        "from": "Italo Disco's own · hats · =CR78 Hat, bars 45–52",
        "base": -1,
        "before": -1,
        "after": -1,
        "move": 0,
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
        "from": "Italo Disco's own · ohats · =808 Open Hat, bars 45–52",
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
        "lane": "crash",
        "job": "crash",
        "how": "sound",
        "from": "Italo Disco's own · crash · =909 Crash, bars 45–52",
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
        "from": "Italo Disco's own · fill · Syndrum · Disco Tom, bars 52–59",
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
        "job": "shaker",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · shaker · Shaker, bars 45–52",
        "base": -15,
        "before": -15,
        "after": -15,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "rim2",
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
        "lane": "rim3",
        "job": "cowbell",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · cowbell · =808 Cowbell, bars 45–52",
        "base": -13,
        "before": -13,
        "after": -13,
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
        "lane": "crash2",
        "job": "ride",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · ride · Ride · 909 Six-Bit, bars 45–52",
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
        "lane": "bass",
        "job": "bass",
        "how": "part",
        "from": "Italo Disco's own · bass · =BASS 80s FM, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -5.2,
        "move": -0.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "bass2",
        "job": "sub",
        "how": "part",
        "from": "Italo Disco's own · sub · Sub Sine (starter), bars 45–52",
        "base": -16,
        "before": -16,
        "after": -16.1,
        "move": -0.1,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "chords",
        "job": "pad",
        "how": "part",
        "from": "Italo Disco's own · pad · Synth Strings (starter), bars 45–52",
        "base": -7.5,
        "before": -7.5,
        "after": -5.9,
        "move": 1.6,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead2",
        "job": "square",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · square · Plain Square vs Synth, bars 45–52",
        "base": 1.1,
        "before": 0,
        "after": -6.6,
        "move": -6.6,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead3",
        "job": "bell",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · bell · Ice Bell, bars 45–52",
        "base": -6.9,
        "before": -6,
        "after": -9.1,
        "move": -3.1,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead4",
        "job": "megaSaw",
        "how": "part",
        "from": "Italo Disco's own · megaSaw · Horizon Solo, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -12.2,
        "move": -2.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead5",
        "job": "arp",
        "how": "part",
        "from": "Italo Disco's own · arp · Night Sequence, bars 45–52",
        "base": -15,
        "before": -15,
        "after": -22.5,
        "move": -7.5,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead7",
        "job": "third",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · third · Electric Grand, bars 45–52",
        "base": -6.3,
        "before": -7,
        "after": -4.8,
        "move": 2.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead8",
        "job": "counter",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · counter · Crystal Trigger, bars 46–53",
        "base": -8.3,
        "before": -9,
        "after": -8,
        "move": 1,
        "window": [
          45,
          52
        ],
        "calibrated": false
      }
    ],
    "transitions": [],
    "expression": [],
    "lanes": [
      {
        "role": "hook",
        "lane": "lead",
        "label": "RIFF Grand · HOOK",
        "voice": "mrdrElectricGrand",
        "voiceParams": null,
        "strip": {
          "gain": -5,
          "send": {
            "delay": 0.25,
            "reverb": 0.4
          },
          "pan": 0.05,
          "eq": {
            "high": 2.6
          }
        },
        "noteFX": null
      },
      {
        "role": "kick",
        "lane": "kick",
        "label": "KICK",
        "voice": "ds909Kick",
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
            "reverb": 0.35
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
          "gain": 1.5,
          "send": {
            "reverb": 0.4
          }
        },
        "noteFX": null
      },
      {
        "role": "hats",
        "lane": "hats",
        "label": "HATS",
        "voice": "dsCr78Hat",
        "voiceParams": null,
        "strip": {
          "gain": -1,
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
          "gain": -10,
          "pan": 0.2
        },
        "noteFX": null
      },
      {
        "role": "crash",
        "lane": "crash",
        "label": "CRASH",
        "voice": "ds909Crash",
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
        "label": "DISCO TOM",
        "voice": "sdDiscoTom",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "pan": 0.15,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "shaker",
        "lane": "rim",
        "label": "PERC Shaker",
        "voice": "shaker",
        "voiceParams": null,
        "strip": {
          "gain": -15,
          "pan": 0.3
        },
        "noteFX": null
      },
      {
        "role": "tambourine",
        "lane": "rim2",
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
        "lane": "rim3",
        "label": "PERC Cowbell",
        "voice": "ds808Cowbell",
        "voiceParams": null,
        "strip": {
          "gain": -13,
          "pan": 0.25,
          "send": {
            "reverb": 0.15
          }
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
        "role": "ride",
        "lane": "crash2",
        "label": "RIDE",
        "voice": "ride909SixBit",
        "voiceParams": null,
        "strip": {
          "gain": -12,
          "pan": 0.3,
          "send": {
            "reverb": 0.2
          }
        },
        "noteFX": null
      },
      {
        "role": "bass",
        "lane": "bass",
        "label": "BASS · =BASS 80s FM",
        "voice": "bass80sFM",
        "voiceParams": null,
        "strip": {
          "gain": -5.2
        },
        "noteFX": null
      },
      {
        "role": "sub",
        "lane": "bass2",
        "label": "SUB · Sub Sine (starter)",
        "voice": "stSubSine",
        "voiceParams": null,
        "strip": {
          "gain": -16.1
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords",
        "label": "STRINGS · Polar Drift",
        "voice": "tngrPolarDrift",
        "voiceParams": null,
        "strip": {
          "gain": -5.9,
          "eq": {
            "low": -5
          },
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "square",
        "lane": "lead2",
        "label": "HOOK DOUBLE · Berlin Signal",
        "voice": "tngrBerlinSignal",
        "voiceParams": null,
        "strip": {
          "gain": -6.6,
          "pan": 0.05,
          "send": {
            "delay": 0.1,
            "reverb": 0.2
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f3": 3000,
                "g3": -2,
                "q3": 0.9
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "bell",
        "lane": "lead3",
        "label": "HOOK 8VA · Ice Bell",
        "voice": "tngrIceBell",
        "voiceParams": null,
        "strip": {
          "gain": -9.1,
          "pan": 0.2,
          "send": {
            "delay": 0.25,
            "reverb": 0.45
          }
        },
        "noteFX": null
      },
      {
        "role": "megaSaw",
        "lane": "lead4",
        "label": "LEAD 8VA · Horizon Solo",
        "voice": "tngrHorizonSolo",
        "voiceParams": null,
        "strip": {
          "gain": -12.2,
          "send": {
            "reverb": 0.35
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead5",
        "label": "ARP · Crystal Trigger",
        "voice": "tngrCrystalTrigger",
        "voiceParams": null,
        "strip": {
          "gain": -22.5,
          "pan": -0.25,
          "effects": [
            {
              "id": "pingpong",
              "params": {
                "sync": 1,
                "division": 0.75,
                "feedback": 0.35,
                "wet": 0.3
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "choir",
        "lane": "lead6",
        "label": "CHOIR · BEST Choir Aah",
        "voice": "bestChoirAah",
        "voiceParams": null,
        "strip": {
          "gain": -10,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead7",
        "label": "THIRD BELOW · Digital EP 84",
        "voice": "tngrDigitalEp84",
        "voiceParams": null,
        "strip": {
          "gain": -4.8,
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
        "lane": "lead8",
        "label": "COUNTER-MELODY · Crystal Trigger",
        "voice": "tngrCrystalTrigger",
        "voiceParams": null,
        "strip": {
          "gain": -8,
          "pan": -0.2,
          "send": {
            "delay": 0.2,
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
        "notes": "3d57d585",
        "voice": "eced1f8e",
        "auto": "59199ae3",
        "expression": "77074ba4",
        "production": "a56d52a0"
      },
      "kick": {
        "notes": "7df628cb",
        "voice": "4c0dc4a1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "e06f9924",
        "voice": "e0352a86",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "9ebbb05",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19b0da9a"
      },
      "hats": {
        "notes": "d5a9cd05",
        "voice": "6230b7e6",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "e293761d",
        "voice": "4322ced2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "9285c3df",
        "voice": "2fe4894",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "fill": {
        "notes": "ac7a736e",
        "voice": "39c9208d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "shaker": {
        "notes": "6368f53d",
        "voice": "573ce642",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "58aabcbd",
        "voice": "4a3e77e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "cowbell": {
        "notes": "e63c42bd",
        "voice": "b399644f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "congas": {
        "notes": "51f2c23d",
        "voice": "3e7da3dc",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "ride": {
        "notes": "121261bd",
        "voice": "2371fa8d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "e040693a",
        "voice": "6a9054d9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "6c7792d6",
        "voice": "94966028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "pad": {
        "notes": "f73bd56f",
        "voice": "71f608d6",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "9871906e",
        "voice": "a2fb0683",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5327d298"
      },
      "bell": {
        "notes": "1cca66aa",
        "voice": "c6497533",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "b22ea12a",
        "voice": "b6d7cde5",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "arp": {
        "notes": "c2fc4630",
        "voice": "7537d16d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "fe56ac4"
      },
      "choir": {
        "notes": "e9e00f66",
        "voice": "e9a11dc1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "706e51dd",
        "voice": "c49cf45e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "5417c9eb",
        "voice": "7537d16d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "181c5976"
      }
    },
    "master": "f52c1fee"
  },
  "seedOf": "italo-disco",
  "made": "2026-10-05T10:54:51.490Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","rim","rim2","rim3","tom2","crash2","bass","bass2","chords","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"DISCO TOM","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom2":"PERC Congas","crash2":"RIDE","bass":"BASS · =BASS 80s FM","bass2":"SUB · Sub Sine (starter)","chords":"STRINGS · Polar Drift","lead":"RIFF Grand · HOOK","lead2":"HOOK DOUBLE · Berlin Signal","lead3":"HOOK 8VA · Ice Bell","lead4":"LEAD 8VA · Horizon Solo","lead5":"ARP · Crystal Trigger","lead6":"CHOIR · BEST Choir Aah","lead7":"THIRD BELOW · Digital EP 84","lead8":"COUNTER-MELODY · Crystal Trigger"},
  voice: {"kickVoice":"ds909Kick","snareVoice":"ds808Snare","clapVoice":"seedTranceClap","hatsVoice":"dsCr78Hat","ohatsVoice":"ds808OpenHat","crashVoice":"ds909Crash","tomVoice":"sdDiscoTom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"cb808Unclamped","tom2Voice":"congaMid","crash2Voice":"ride909SixBit","bassVoice":"bass80sFM","bass2Voice":"stSubSine","chordsVoice":"tngrPolarDrift","leadVoice":"mrdrElectricGrand","lead2Voice":"tngrBerlinSignal","lead3Voice":"tngrIceBell","lead4Voice":"tngrHorizonSolo","lead5Voice":"tngrCrystalTrigger","lead6Voice":"bestChoirAah","lead7Voice":"tngrDigitalEp84","lead8Voice":"tngrCrystalTrigger"},
  voiceParams: {"clapVoice":{"label":"Big Room Clap · Trance","category":"Clap","dur":1,"note":"Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants space in the arrangement.","noise":{"type":"bandpass","freq":1500,"Q":0.9,"decay":0.355,"gain":0.88},"taps":[0,0.0116,0.0232,0.04],"tapFalloff":0.82,"tapDetune":0.94,"tapTone":0.97,"starter":false,"trim":3,"kind":"drum","level":0.018103500107979925,"peak":0.4646041578335689,"songOrigin":"user","songSourceId":"clapVoice"},"kickVoice":{"label":"=909 Kick","category":"Kick","homeLane":"kick","dur":2,"note":"A compact 909-style kick: hard beater click, fast pitch drop and a firm low body that stays out of the sub for the next bass note.","osc":{"type":"sine","from":185,"to":45,"sweep":0.035,"attack":0.001,"decay":0.42,"curve":"exp","gain":1},"noise":{"type":"highpass","freq":2600,"Q":1.2,"decay":0.012,"gain":0.34},"drive":0.3125449432,"id":"ds909Kick","kind":"drum","factory":true,"level":0.06057658152,"peak":0.8721816207},"snareVoice":{"label":"=808 Snare","category":"Snare","homeLane":"snare","dur":1,"note":"A round 808-style snare with a low electronic shell under a broad, slightly darker noise body than the sharper 909 family.","osc":{"type":"triangle","from":190,"to":145,"sweep":0.035,"decay":0.13,"curve":"exp","gain":0.62},"noise":{"type":"bandpass","freq":1750,"Q":0.7,"decay":0.18,"gain":1},"drive":0.1639708518,"id":"ds808Snare","kind":"drum","factory":true,"level":0.01920839646,"peak":0.7351761003},"hatsVoice":{"label":"=CR78 Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"A dry, dusty CR78-style hat with a lower cutoff and a short envelope that keeps the machine pulse present without sounding glossy.","noise":{"type":"highpass","freq":4800,"Q":0.7,"decay":0.055,"gain":0.8},"id":"dsCr78Hat","kind":"drum","factory":true,"level":0.016717,"peak":0.6253},"ohatsVoice":{"label":"=808 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open 808-style cymbal partner: the same inharmonic cluster left ringing with a lower filter so its body is audible as it fades, plus a restrained resonant tail.","metal":{"freq":540,"spread":1,"count":6,"hp":6100,"Q":0.9,"slope":-24,"decay":0.42,"resonator":{"feedback":0.92,"drive":1.2,"leak":0.00025}},"humanize":{"gain":0.04},"id":"ds808OpenHat","kind":"drum","factory":true,"level":0.063614,"peak":0.5898},"crashVoice":{"label":"=909 Crash","category":"Crash","homeLane":"crash","dur":5,"note":"A bright 909-style crash with a dense front and a high end that darkens as it decays, intended for phrase changes rather than every bar.","noise":{"type":"lowpass","freq":9200,"to":2400,"sweep":0.9,"Q":0.8,"decay":1.35,"gain":1},"metal":{"wave":"square","freq":610,"spread":1,"count":6,"hp":3300,"Q":0.8,"decay":0.65,"gain":0.8},"drive":0.456928151,"id":"ds909Crash","kind":"drum","factory":true,"level":0.3556911555,"peak":1.864136921},"tomVoice":{"label":"Syndrum · Disco Tom","category":"Sweep","homeLane":"tom","dur":2,"note":"The falling tom that is on every record from 1978: a triangle jumping to 460 Hz and discharging onto 62 in two hundred milliseconds, with twelve milliseconds of lowpassed noise for the trigger click on the front.","osc":{"type":"triangle","from":460,"to":62,"sweep":0.2,"pitchCurve":"snap","attack":0.0008,"decay":0.42,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":1800,"Q":0.7,"decay":0.012,"gain":0.22},"drive":0.1493023052,"id":"sdDiscoTom","kind":"drum","factory":true,"level":0.03704142445,"peak":0.6935033265},"rimVoice":{"label":"Shaker","category":"Perc","homeLane":"rim","dur":0.5,"note":"A soft band with no attack to speak of. Sixteenths of this sit under anything without competing.","noise":{"type":"bandpass","freq":6000,"Q":1.1,"decay":0.06},"id":"shaker","kind":"drum","factory":true,"level":0.010894,"peak":0.4346},"rim2Voice":{"label":"Tambourine","category":"Perc","homeLane":"rim","dur":1,"note":"Bright, jangly and slightly longer, with a touch of pitch in it.","osc":{"type":"square","from":900,"to":780,"sweep":0.05,"decay":0.05,"gain":0.12},"noise":{"type":"highpass","freq":5200,"Q":0.6,"decay":0.14},"id":"tambourine","kind":"drum","factory":true,"level":0.034686,"peak":0.8969},"rim3Voice":{"label":"Cowbell · 808 Unclamped","category":"Perc","homeLane":"tom","dur":2,"note":"The actual TR-808 topology — 540 and 800 Hz squares through a 1.3 kHz bandpass at Q4 — with the 200 ms hardware gate taken off. Same front as the factory bell, three and a half times the ring, with a controlled resonant tail.","metal":{"wave":"square","freq":540,"ratios":[1,1.481481],"count":2,"spread":1,"filter":"bandpass","hp":1300,"Q":4,"slope":-12,"attack":0,"decay":0.88,"sag":0.34,"sagAt":0.03,"gain":1,"resonator":{"feedback":0.95,"drive":1.35,"leak":0.0004}},"drive":0.08064240676,"id":"cb808Unclamped","kind":"drum","factory":true,"level":0.02235562553,"peak":0.4552238438},"tom2Voice":{"label":"Conga · Mid","category":"Perc","homeLane":"tom","dur":1,"note":"A centered open conga with a warm falling body and a little shell noise on the front, designed to answer the high and low voices cleanly.","osc":{"type":"sine","from":285,"to":205,"sweep":0.045,"decay":0.32,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":1700,"Q":0.65,"decay":0.022,"gain":0.3},"drive":0.09899432523,"id":"congaMid","kind":"drum","factory":true,"level":0.03777199276,"peak":0.68599135},"crash2Voice":{"label":"Ride · 909 Six-Bit","category":"Crash","homeLane":"crash","dur":4,"note":"A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is half of why the sound is recognisable, so the crush is doing the work here that the filter sweeps do on the 808 presets.","ring":{"freq":2500,"Q":70,"hit":0.0018,"decay":0.25,"gain":0.6},"metal":{"wave":"square","freq":780,"count":6,"spread":1.12,"filter":"highpass","hp":5400,"Q":0.8,"slope":-24,"attack":0.004,"decay":1.6,"sag":0.3,"sagAt":0.06,"gain":0.55},"drive":0.6,"shape":"crush","tone":{"type":"lowpass","freq":9500,"Q":0.7},"humanize":{"gain":0.03},"id":"ride909SixBit","kind":"drum","factory":true,"level":0.0532,"peak":1.0339},"bassVoice":{"label":"=BASS 80s FM","category":"Bass","synth":"RMND-2","dur":1.8,"note":"A bright digital 80s bass: a sine body with a square modulator, tuned for the glassy attack of an FM workstation under a pop groove.","options":{"harmonicity":1.5,"modulationIndex":7,"oscillator":{"type":"sine"},"modulation":{"type":"square"},"envelope":{"attack":0.003,"decay":0.34,"sustain":0.36,"release":0.24},"modulationEnvelope":{"attack":0.002,"decay":0.18,"sustain":0.22,"release":0.16}},"id":"bass80sFM","kind":"tone","factory":true,"level":0.021042,"peak":0.2208},"bass2Voice":{"label":"Sub Sine (starter)","category":"Bass","kind":"tone","synth":"CRLS-1","dur":2.2,"note":"Pure weight, no harmonics. Wants room underneath it and a lead up top.","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.012,"decay":0.3,"sustain":0.8,"release":0.4}},"id":"stSubSine","starter":true,"factory":true,"level":0.11677,"peak":0.6891},"chordsVoice":{"label":"Polar Drift","category":"Pad","synth":"TNGR-2","dur":8,"note":"Wide cold sparse partials with independent slow movement.","tngr2":{"oscA":{"table":"crystal","position":0.35,"envAmount":0.42,"lfoAmount":0.12,"level":0.68,"unison":3,"spread":18,"stereo":0.9},"oscB":{"table":"alloy","position":0.7,"envAmount":-0.3,"lfoAmount":-0.1,"level":0.25,"unison":2,"spread":15,"stereo":0.9,"interval":-12},"amp":{"attack":0.03,"decay":2.5,"sustain":0.7,"release":1.387},"positionEnv":{"attack":2.8,"decay":3.5,"sustain":0.45},"filter":{"type":"lowpass","cutoff":5600,"resonance":1.92},"lfo1":{"shape":"triangle","rate":0.07,"amount":0.22},"master":{"gain":0.46}},"id":"tngrPolarDrift","kind":"tone","factory":true,"level":0.053682,"peak":0.3928},"leadVoice":{"label":"Electric Grand","category":"Keys","synth":"MRDR-3","dur":2.2,"note":"The CP-70: real strings on a pickup, so a thinner body, a brighter strike and the chorus it was always played through.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.7,"attack":0.001,"decay":2.2,"sustain":0,"release":0.3,"unison":2,"spread":6,"stereo":0.5,"filter":{"type":"lowpass","slope":-12,"freq":900,"Q":0.8,"track":0.9,"env":{"octaves":2.5,"attack":0.001,"decay":0.25,"sustain":0,"release":0.2}}},"osc2":{"type":"triangle","ratio":2,"gain":0.25,"attack":0.001,"decay":1.2,"sustain":0,"release":0.25},"osc3":{"type":"noise","ratio":1,"gain":0.07,"color":"white","attack":0.001,"decay":0.018,"sustain":0,"release":0.02,"filter":{"type":"bandpass","slope":-12,"freq":2400,"Q":1.2,"track":0.4}}},"humanize":{"entry":0.005,"gain":0.07},"chorus":{"mix":0.35,"rate":0.6,"depth":0.4,"width":1},"id":"mrdrElectricGrand","kind":"tone","factory":true,"level":0.0443,"peak":0.4886},"lead2Voice":{"label":"Berlin Signal","category":"Lead","synth":"TNGR-2","dur":1.5,"note":"A clear bright mono lead with slow spectral animation and useful glide.","mode":"mono","portamento":0.08,"tngr2":{"oscA":{"table":"sawForm","position":0.35,"envAmount":0.25,"level":0.78,"unison":2,"spread":7},"oscB":{"table":"warmHarmonics","position":0.2,"level":0.18,"interval":12},"amp":{"attack":0.012,"decay":0.2,"sustain":0.82,"release":0.18},"filter":{"type":"lowpass","cutoff":5200,"resonance":2.16},"filterEnv":{"amount":1.1,"attack":0.01,"decay":0.18,"sustain":0.42},"positionEnv":{"attack":0.04,"decay":0.6,"sustain":0.4},"master":{"gain":0.62}},"id":"tngrBerlinSignal","kind":"tone","factory":true,"level":0.006938,"peak":0.1312},"lead3Voice":{"label":"Ice Bell","category":"Bells","synth":"TNGR-2","dur":3,"note":"Sparse crystal partials with a long decay and controlled high notes.","tngr2":{"oscA":{"table":"bellFold","position":0.84,"envAmount":-0.2,"level":0.76},"oscB":{"table":"crystal","position":0.65,"level":0.16,"interval":12},"amp":{"attack":0.001,"decay":1.7,"sustain":0.03,"release":0.9},"positionEnv":{"attack":0,"decay":1.1,"sustain":0.12},"filter":{"type":"lowpass","cutoff":9800,"resonance":1.2},"master":{"gain":0.5}},"id":"tngrIceBell","kind":"tone","factory":true,"level":0.032051,"peak":0.422},"lead4Voice":{"label":"Horizon Solo","category":"Lead","synth":"TNGR-2","dur":2,"note":"An expressive legato lead with position movement during held notes.","mode":"legato","portamento":0.12,"tngr2":{"oscA":{"table":"vowelGlass","position":0.18,"envAmount":0.52,"level":0.78,"unison":2,"spread":8},"oscB":{"table":"darkToAir","position":0.35,"envAmount":0.35,"level":0.16,"interval":12},"amp":{"attack":0.06,"decay":0.32,"sustain":0.82,"release":0.28},"filter":{"type":"lowpass","cutoff":4300,"resonance":2.28},"filterEnv":{"amount":1.2,"attack":0.06,"decay":0.45,"sustain":0.4},"positionEnv":{"attack":0.3,"decay":1.1,"sustain":0.72},"master":{"gain":0.6}},"id":"tngrHorizonSolo","kind":"tone","factory":true,"level":0.010567,"peak":0.1453},"lead5Voice":{"label":"Crystal Trigger","category":"Pluck","synth":"TNGR-2","dur":1.2,"note":"A sparkling high-partial attack with a clean short body.","tngr2":{"oscA":{"table":"crystal","position":0.8,"envAmount":-0.68,"level":0.78},"oscB":{"table":"bellFold","position":0.72,"level":0.14,"interval":12},"amp":{"attack":0.001,"decay":0.45,"sustain":0.04,"release":0.16},"positionEnv":{"attack":0,"decay":0.32,"sustain":0},"filter":{"type":"lowpass","cutoff":8500,"resonance":2.4},"master":{"gain":0.52}},"id":"tngrCrystalTrigger","kind":"tone","factory":true,"level":0.010504,"peak":0.171},"lead6Voice":{"label":"BEST Choir Aah","category":"Orch","synth":"MRDR-3","dur":8,"note":"Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with the pitch moving underneath them. Delayed vibrato and a slow swell do the rest: this is how a voice works, not an impression of one.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.9,"attack":0.1204,"decay":1.2,"sustain":0.85,"release":0.9,"attackCurve":"lin","unison":3,"spread":9,"stereo":0.8,"filter":{"type":"bandpass","slope":-12,"freq":800,"Q":7,"track":0}},"osc2":{"type":"sawtooth","ratio":1,"gain":0.55,"detune":6,"attack":0.14448,"decay":1.4,"sustain":0.8,"release":0.9,"attackCurve":"lin","unison":2,"spread":13,"stereo":0.7,"filter":{"type":"bandpass","slope":-12,"freq":1150,"Q":9,"track":0}},"osc3":{"type":"sawtooth","ratio":1,"gain":0.3,"detune":-7,"attack":0.172,"decay":1.6,"sustain":0.7,"release":1,"attackCurve":"lin","unison":2,"spread":16,"stereo":0.9,"filter":{"type":"bandpass","slope":-12,"freq":2900,"Q":11,"track":0}},"lfo":{"type":"sine","rate":0.7,"depth":0.14,"target":"level","delay":0.9}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":3800,"Q":0.7,"track":0.3,"env":{"octaves":1.3,"attack":0.6,"decay":1.6,"sustain":0.55,"release":0.9}},"vca":{"attack":0.1548,"decay":1.6,"sustain":0.88,"release":1.2,"attackCurve":"lin"}},"drive":0.03502625267,"shape":"soft","humanize":{"entry":0.022},"vibrato":{"depth":0.18,"rate":5.2,"delay":0.6,"spread":0.75},"id":"bestChoirAah","kind":"tone","factory":true,"level":0.01885742234,"peak":0.1341854474},"lead7Voice":{"label":"Digital EP 84","category":"Keys","synth":"TNGR-2","dur":2.4,"note":"A bright struck transient moving quickly to a warmer sustained frame.","tngr2":{"oscA":{"table":"bellFold","position":0.72,"envAmount":-0.42,"level":0.75},"oscB":{"table":"warmHarmonics","position":0.48,"envAmount":-0.18,"level":0.2,"interval":-12},"amp":{"attack":0.004,"decay":1.3,"sustain":0.25,"release":0.45},"positionEnv":{"attack":0,"decay":0.8,"sustain":0.1},"filter":{"type":"lowpass","cutoff":6200,"resonance":2.16},"filterEnv":{"amount":1.6,"attack":0.001,"decay":0.7,"sustain":0.1},"master":{"gain":0.58}},"id":"tngrDigitalEp84","kind":"tone","factory":true,"level":0.023083,"peak":0.27},"lead8Voice":{"label":"Crystal Trigger","category":"Pluck","synth":"TNGR-2","dur":1.2,"note":"A sparkling high-partial attack with a clean short body.","tngr2":{"oscA":{"table":"crystal","position":0.8,"envAmount":-0.68,"level":0.78},"oscB":{"table":"bellFold","position":0.72,"level":0.14,"interval":12},"amp":{"attack":0.001,"decay":0.45,"sustain":0.04,"release":0.16},"positionEnv":{"attack":0,"decay":0.32,"sustain":0},"filter":{"type":"lowpass","cutoff":8500,"resonance":2.4},"master":{"gain":0.52}},"id":"tngrCrystalTrigger","kind":"tone","factory":true,"level":0.010504,"peak":0.171}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    snare: { gain: -3, send: { reverb: 0.35 } },
    clap: { gain: 1.5, send: { reverb: 0.378 }, eq: { mid: 1.9, high: 0.4 } },
    hats: { gain: -0.3, pan: -0.2 },
    ohats: { gain: -10, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    tom: { gain: -6, pan: 0.15, send: { reverb: 0.3 } },
    rim: { gain: -12.6, pan: 0.3 },
    rim2: { gain: -9.4, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -6.4, pan: 0.25, send: { reverb: 0.15 } },
    tom2: { gain: -7.1, pan: -0.2, send: { reverb: 0.15 } },
    crash2: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -5.2 },
    bass2: { gain: -16.1 },
    chords: { gain: -5.9, send: { reverb: 0.5 }, eq: { low: -5 } },
    lead: { gain: -5, pan: 0.05, send: { delay: 0.25, reverb: 0.4 }, eq: { high: 2.6 } },
    lead2: { gain: -6.6, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead3: { gain: -9.1, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead4: { gain: -12.2, send: { reverb: 0.35 } },
    lead5: { gain: -22.5, pan: -0.25, effects: [{ id: "pingpong", params: { sync: 1, division: 0.75, feedback: 0.35, wet: 0.3 } }] },
    lead6: { gain: -10, send: { reverb: 0.5 } },
    lead7: { gain: -4.8, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -8, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  automation: {
    lead: {
      points: [[45,0,0],[45,0,-2.5],[61,0,-2.5],[61,0,0]],
      fx: [
        {
          from: [32,12],
          to: [33,0],
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
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
