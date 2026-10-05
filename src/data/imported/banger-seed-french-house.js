// FRENCH HOUSE SEED — one song: what it plays, how it is arranged, how it sounds.
//
// French House's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-french-house";
export const title = "FRENCH HOUSE SEED";
export const slug = "banger-seed-french-house";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 124,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
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
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,null,null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,1,null,null,null,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | F1 . F2 . . F1 . F2 . F1 . . . . . .'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,null,null,null,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . F1 . . . F1 . . . F1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . C5 C5 . A4 F5 . C5 . A4 C5 . . . .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | F1 . F2 . . F1 . F2 . F1 . . C2 . F2 F1'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . C5 C5 . A4 F5 . C5 . A4 C5 . F5 C5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . A1 . . E2 . A2 A1'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . C#5 . A4 C#5 . E5 C#5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('A1 . A2 . . A1 . A2 . A1 . . E2 . A2 A1 | F1 . F2 . . F1 . F2 . F1 . . C2 . F2 F1'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . C5 C5 . A4 E5 . C5 . A4 C5 . E5 C5 . | A4 . C5 C5 . A4 F5 . C5 . A4 C5 . F5 C5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . A1 . . E2 . A2 A1'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . C#5 . A4 C#5 . E5 C#5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | F1 . F2 . . F1 . F2 . F1 . . C2 . F2 F1'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . C5 C5 . A4 F5 . C5 . A4 C5 . F5 C5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . A1 . . E2 . A2 A1'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . C#5 . A4 C#5 . E5 C#5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,1,null,null,null,null],
      bass: seq('D2 . D3 . . D2 . D3 . D2 . . A2 . D3 D2 | D2 . D3 . . D2 . D3 . D2 . . . . . .'),
      bassLen: [1,null,1,null,null,1,null,1,null,1,null,null,1,null,1,1,1,null,1,null,null,1,null,1,null,1,null,null,null,null,null,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . . . .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . A#4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[880,1760],null,[1046.5022612023945,2093.004522404789],null,[1318.5102276514797,2637.02045530296],null,[1046.5022612023945,2093.004522404789],null,[880,1760],null,null,null,[783.9908719634985,1567.981743926997],null,[932.3275230361799,1864.6550460723597],null,[698.4564628660078,1396.9129257320155],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[880,1760],null,null,null,[783.9908719634985,1567.981743926997],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 . | F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . C5 C5 . A4 E5 . C5 . A4 C5 . E5 C5 . | A4 . C5 C5 . A4 F5 . C5 . A4 C5 . F5 C5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[440,880],null,null,null,[329.6275569128699,659.2551138257398],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . A1 . A2 . A1 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . C#5 . A4 C#5 . E5 C#5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . F4 . . . C4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[698.4564628660078,1396.9129257320155],null,[880,1760],null,[1046.5022612023945,2093.004522404789],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[698.4564628660078,1396.9129257320155],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[880,1760],null,null,null,[783.9908719634985,1567.981743926997],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,[261.6255653005986,349.2282314330039,440],null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . C5 C5 . A4 F5 . C5 . A4 C5 . F5 C5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
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
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[440,880],null,null,null,[329.6275569128699,659.2551138257398],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null,1,null,2,null,null,2,null,1,null,1,null,2,null,null,1,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . A1 . A2 . A1 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A4 . D5 D5 . A4 F5 . D5 . A4 D5 . F5 D5 . | A4 . D5 D5 . A4 F5 . C#5 . A4 C#5 . E5 C#5 .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . F4 . . . C4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 6,
  "style": "french-house",
  "options": {
    "style": "french-house",
    "mood": "funky",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 124,
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
      "keyLift": "none",
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
      "bass": "offbeat",
      "sub": true,
      "chords": "piano",
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
      "filterBuild": true,
      "stutter": false,
      "pump": false,
      "delayThrows": false,
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
    "styleId": "french-house",
    "moodId": "funky",
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
      "preset": "ds909Snare",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "ds909Clap",
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
      "preset": "ds909OpenHat",
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
      "preset": "ds909Tom",
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
      "preset": "tngrPickedBass",
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
      "part": "part:piano",
      "preset": "tngrElectricKeys",
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
      "lane": "lead2",
      "part": "part:square",
      "preset": "mrdrElectricGrand",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:bell",
      "preset": "tngrCelesta",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:megaSaw",
      "preset": "tngrBrassSection",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:arp",
      "preset": "mrdrWahGuitar",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:choir",
      "preset": "jmjrChoirOoh",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
      "part": "part:third",
      "preset": "tngrElectricKeys",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "mrdrFunkGuitarMuted",
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
    "piano": "chords",
    "pad": "chords2",
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
      "style": "French House",
      "mood": "funky",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 124,
      "seconds": 124,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "French House's own · kick · =909 Kick, bars 45–52",
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
        "from": "French House's own · snare · =909 Snare, bars 45–52",
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
        "from": "French House's own · clap · =909 Clap, bars 45–52",
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
        "from": "French House's own · hats · DS Closed Hat, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -6,
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
        "from": "French House's own · ohats · =909 Open Hat, bars 45–52",
        "base": -4.5,
        "before": -4.5,
        "after": -4.5,
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
        "from": "French House's own · crash · =909 Crash, bars 45–52",
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
        "from": "French House's own · fill · =909 Tom, bars 52–59",
        "base": -7,
        "before": -7,
        "after": -7,
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
        "from": "French House's own · bass · Picked Bass, bars 45–52",
        "base": -0.5,
        "before": -0.5,
        "after": -0.6,
        "move": -0.1,
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
        "from": "French House's own · sub · Sub Sine (starter), bars 45–52",
        "base": -16,
        "before": -16,
        "after": -16,
        "move": 0,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "chords",
        "job": "piano",
        "how": "part",
        "from": "French House's own · piano · Electric Keys, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -6.2,
        "move": -0.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "chords2",
        "job": "pad",
        "how": "part",
        "from": "French House's own · pad · Soft Strings, bars 1–4",
        "base": -9,
        "before": -9,
        "after": -11.3,
        "move": -2.3,
        "window": [
          0,
          3
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
        "after": -5.7,
        "move": -5.7,
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
        "after": -14.8,
        "move": -8.8,
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
        "from": "French House's own · megaSaw · Brass Section, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -11,
        "move": -2,
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
        "from": "French House's own · arp · Funk Guitar · Muted, bars 45–52",
        "base": -8.5,
        "before": -8.5,
        "after": -12.2,
        "move": -3.7,
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
        "after": -5.4,
        "move": 1.6,
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
        "after": -2.3,
        "move": 6.7,
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
          "gain": -3,
          "send": {
            "delay": 0.15,
            "reverb": 0.3
          },
          "pan": 0.05,
          "eq": {
            "high": 2
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
        "voice": "ds909Snare",
        "voiceParams": null,
        "strip": {
          "gain": -3,
          "send": {
            "reverb": 0.25
          }
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "CLAP",
        "voice": "ds909Clap",
        "voiceParams": null,
        "strip": {
          "gain": 1.5,
          "send": {
            "reverb": 0.25
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
          "gain": -6,
          "pan": -0.2
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "ds909OpenHat",
        "voiceParams": null,
        "strip": {
          "gain": -4.5,
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
        "label": "FILL TOMS",
        "voice": "ds909Tom",
        "voiceParams": null,
        "strip": {
          "gain": -7,
          "pan": 0.25,
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
        "label": "BASS · Picked Bass",
        "voice": "tngrPickedBass",
        "voiceParams": null,
        "strip": {
          "gain": -0.6,
          "effects": [
            {
              "id": "rhythmgate",
              "params": {
                "division": 1,
                "gateLength": 1,
                "attack": 0.16,
                "decay": 0.02,
                "depth": 0.7
              }
            }
          ]
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
          "gain": -16
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "LOOP Keys · Electric Keys",
        "voice": "tngrElectricKeys",
        "voiceParams": null,
        "strip": {
          "gain": -6.2,
          "send": {
            "reverb": 0.2
          },
          "effects": [
            {
              "id": "phaser",
              "params": {
                "wet": 0.25
              }
            },
            {
              "id": "rhythmgate",
              "params": {
                "division": 1,
                "gateLength": 1,
                "attack": 0.16,
                "decay": 0.02,
                "depth": 0.7
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
          "gain": -11.3,
          "eq": {
            "low": -4
          },
          "send": {
            "reverb": 0.4
          },
          "effects": [
            {
              "id": "rhythmgate",
              "params": {
                "division": 1,
                "gateLength": 1,
                "attack": 0.16,
                "decay": 0.02,
                "depth": 0.7
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "square",
        "lane": "lead2",
        "label": "HOOK DOUBLE · Electric Grand",
        "voice": "mrdrElectricGrand",
        "voiceParams": null,
        "strip": {
          "gain": -5.7,
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
        "label": "HOOK 8VA · Celesta",
        "voice": "tngrCelesta",
        "voiceParams": null,
        "strip": {
          "gain": -14.8,
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
        "label": "LEAD 8VA · Brass Section",
        "voice": "tngrBrassSection",
        "voiceParams": null,
        "strip": {
          "gain": -11,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead5",
        "label": "GUITAR Wah · Wah Guitar",
        "voice": "mrdrWahGuitar",
        "voiceParams": null,
        "strip": {
          "gain": -12.2,
          "pan": 0.25,
          "effects": [
            {
              "id": "rhythmgate",
              "params": {
                "division": 1,
                "gateLength": 1,
                "attack": 0.16,
                "decay": 0.02,
                "depth": 0.7
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "choir",
        "lane": "lead6",
        "label": "CHOIR · Choir Ooh",
        "voice": "jmjrChoirOoh",
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
        "label": "THIRD BELOW · Electric Keys",
        "voice": "tngrElectricKeys",
        "voiceParams": null,
        "strip": {
          "gain": -5.4,
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
        "label": "COUNTER-MELODY · Funk Guitar · Muted",
        "voice": "mrdrFunkGuitarMuted",
        "voiceParams": null,
        "strip": {
          "gain": -2.3,
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
        "notes": "79a88c56",
        "voice": "eced1f8e",
        "auto": "8041cc00",
        "expression": "77074ba4",
        "production": "60b27394"
      },
      "kick": {
        "notes": "7df628cb",
        "voice": "4c0dc4a1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "44fe840b",
        "voice": "c3b485de",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "b837a92d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "hats": {
        "notes": "6fc3159d",
        "voice": "66d7c48",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "e293761d",
        "voice": "8be5eeea",
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
        "notes": "1dc75bb7",
        "voice": "e0417259",
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
        "notes": "de6faf7a",
        "voice": "ef506c56",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "2364231f"
      },
      "sub": {
        "notes": "738c83a2",
        "voice": "94966028",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "3b9d4c2f",
        "voice": "c67888fa",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "ca6e07d7"
      },
      "pad": {
        "notes": "2985be6d",
        "voice": "8fe72f42",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "e28d405c"
      },
      "square": {
        "notes": "7b213e98",
        "voice": "eced1f8e",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "5327d298"
      },
      "bell": {
        "notes": "6f951555",
        "voice": "3e86c2d8",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "244e980d",
        "voice": "b7854edb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "arp": {
        "notes": "ebf2d90a",
        "voice": "f7881399",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "2364231f"
      },
      "choir": {
        "notes": "31ecf050",
        "voice": "5feefb54",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "ca167b57",
        "voice": "c67888fa",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "a0020b05",
        "voice": "2526ea06",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "181c5976"
      }
    },
    "master": "f52c1fee"
  },
  "seedOf": "french-house",
  "made": "2026-10-05T10:54:51.653Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","rim","rim2","rim3","tom2","crash2","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom2":"PERC Congas","crash2":"RIDE","bass":"BASS · Picked Bass","bass2":"SUB · Sub Sine (starter)","chords":"LOOP Keys · Electric Keys","chords2":"PAD · Warm Strings","lead":"RIFF Grand · HOOK","lead2":"HOOK DOUBLE · Electric Grand","lead3":"HOOK 8VA · Celesta","lead4":"LEAD 8VA · Brass Section","lead5":"GUITAR Wah · Wah Guitar","lead6":"CHOIR · Choir Ooh","lead7":"THIRD BELOW · Electric Keys","lead8":"COUNTER-MELODY · Funk Guitar · Muted"},
  voice: {"kickVoice":"ds909Kick","snareVoice":"ds909Snare","clapVoice":"ds909Clap","hatsVoice":"dsHatClosed","ohatsVoice":"ds909OpenHat","crashVoice":"ds909Crash","tomVoice":"ds909Tom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"ds808Cowbell","tom2Voice":"congaMid","crash2Voice":"ride909SixBit","bassVoice":"tngrPickedBass","bass2Voice":"stSubSine","chordsVoice":"tngrElectricKeys","chords2Voice":"tngrWarmStrings","leadVoice":"mrdrElectricGrand","lead2Voice":"mrdrElectricGrand","lead3Voice":"tngrCelesta","lead4Voice":"tngrBrassSection","lead5Voice":"mrdrWahGuitar","lead6Voice":"jmjrChoirOoh","lead7Voice":"tngrElectricKeys","lead8Voice":"mrdrFunkGuitarMuted"},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    snare: { gain: -3, send: { reverb: 0.25 } },
    clap: { gain: 1.5, send: { reverb: 0.25 } },
    hats: { gain: -6, pan: -0.2 },
    ohats: { gain: -4.5, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    tom: { gain: -7, pan: 0.25, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -13, pan: 0.25, send: { reverb: 0.15 } },
    tom2: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    crash2: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -0.6, effects: [{ id: "rhythmgate", params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.7 } }] },
    bass2: { gain: -16 },
    chords: { gain: -6.2, send: { reverb: 0.2 }, effects: [{ id: "phaser", params: { wet: 0.25 } }, { id: "rhythmgate", params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.7 } }] },
    chords2: { gain: -11.3, send: { reverb: 0.4 }, eq: { low: -4 }, effects: [{ id: "rhythmgate", params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.7 } }] },
    lead: { gain: -3, pan: 0.05, send: { delay: 0.15, reverb: 0.3 }, eq: { high: 2 } },
    lead2: { gain: -5.7, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead3: { gain: -14.8, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead4: { gain: -11, send: { reverb: 0.3 } },
    lead5: { gain: -12.2, pan: 0.25, effects: [{ id: "rhythmgate", params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.7 } }] },
    lead6: { gain: -10, send: { reverb: 0.5 } },
    lead7: { gain: -5.4, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -2.3, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  swing: 52,
  automation: {
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
    bass: {
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
    lead5: {
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
    lead2: {
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
    lead: {
      points: [[45,0,0],[45,0,-2.5],[61,0,-2.5],[61,0,0]],
    },
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
