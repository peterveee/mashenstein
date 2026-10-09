// SHIBUYA-KEI SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Shibuya-Kei's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-shibuya";
export const title = "SHIBUYA-KEI SEED";
export const slug = "banger-seed-shibuya";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 126,
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
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
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
  crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: chordSeq('F3maj7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,null,null,null],
      bass: seq('F1 . . C2 C2 . . . F1 . . C2 C2 . . . | F1 . . C2 C2 . . . F1 . . C2 . . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,null,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      lead5: seq('A4 C5 F5 C5 A4 C5 F5 C5 A4 C5 F5 C5 A4 C5 F5 C5 | A4 C5 F5 C5 A4 C5 F5 C5 A4 C5 F5 C5 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('F1 . . C2 C2 . . . F1 . . C2 C2 . . . | F1 . . C2 C2 . . . F1 . . C2 C2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,277.1826309768721,329.6275569128699],null,null,[220,277.1826309768721,329.6275569128699],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . A1 . . E2 E2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('A1 . . E2 E2 . . . A1 . . E2 E2 . . . | F1 . . C2 C2 . . . F1 . . C2 C2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('A1 . . . . . . . A1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,277.1826309768721,329.6275569128699],null,null,[220,277.1826309768721,329.6275569128699],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . A1 . . E2 E2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('F1 . . C2 C2 . . . F1 . . C2 C2 . . . | F1 . . C2 C2 . . . F1 . . C2 C2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,277.1826309768721,329.6275569128699],null,null,[220,277.1826309768721,329.6275569128699],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . A1 . . E2 E2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[116.54094037952248,174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[146.8323839587038,220,233.08188075904496,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,195.99771799087463,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[587.3295358348151,880,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[116.54094037952248,174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[146.8323839587038,220,233.08188075904496,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,195.99771799087463,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[587.3295358348151,880,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . D2 . . A2 A2 . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699],null,[220,246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,2,null,2,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,[220,261.6255653005986,329.6275569128699],null,[220,246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,2,null,1,null,2,null,null,null,null,null],
      bass: seq('D2 . . A2 A2 . . . D2 . . A2 A2 . . . | D2 . . A2 A2 . . . A1 . B1 B2 . . . .'),
      bassLen: [3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,3,null,null,1,4,null,null,null,2,null,1,1,null,null,null,null],
      bass2: seq('D2 . . . . . . . D2 . . . . . . . | D2 . . . . . . . A1 . B1 . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,2,null,2,null,null,null,null,null],
      lead5: seq('A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 | A5 F5 D5 A4 A5 F5 D5 A4 A5 E5 D#5 A4 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . E2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . E2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . E5 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . C5 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[987.7666025122483,1975.533205024496],null,[1174.6590716696303,2349.31814333926],null,[1479.9776908465376,2959.955381693075],null,[1174.6590716696303,2349.31814333926],null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,[1046.5022612023945,2093.004522404789],null,[783.9908719634985,1567.981743926997],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('B1 . B2 . B1 . B2 . B1 . B2 . B1 . B2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | G1 . . . . . . . G1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 D5 F#5 B5 D6 F#6 B6 D7 B4 D5 F#5 B5 D6 F#6 B6 D7 | B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('B5 . D6 . F#6 . D6 . B5 . . . A5 . C6 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[369.9944227116344,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . E2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[1174.6590716696303,2349.31814333926],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,[880,1760],null,[783.9908719634985,1567.981743926997],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,391.99543598174927],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('G1 . . . . . . . G1 . . . . . . . | G1 . . . . . . . G1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7 | B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[369.9944227116344,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . E2 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,[246.94165062806206,293.6647679174076,329.6275569128699,391.99543598174927],null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null],
      chordsLen: [2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null,2,null,null,2,null,null,3,null,null,null,2,null,null,2,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E2 . . . . . . . E2 . . . . . . . | E2 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . . C1 . . . . C1 . . C1 . . | . . C1 . . C1 . . . . C1 . . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      chords2: [[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 6,
  "style": "shibuya",
  "options": {
    "style": "shibuya",
    "mood": "lounge",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 126,
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
      "arpPattern": "vary",
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
      "riser": true,
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
    "styleId": "shibuya",
    "moodId": "lounge",
    "parts": {}
  },
  "palette": [
    {
      "lane": "kick",
      "part": "part:kick",
      "preset": "dsKick",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "snare",
      "part": "part:snare",
      "preset": "snareCrisp",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "dsRim",
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
      "preset": "dsHatOpen",
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
      "preset": "dsTom",
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
      "lane": "crash3",
      "part": "part:ride",
      "preset": "ride909SixBit",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "bass",
      "part": "part:bass",
      "preset": "tngrRoundBass",
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
      "preset": "mrdrAcousticGuitar",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "addDrawbar",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "mrdrVibraphone",
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
      "preset": "mrdrMutedTrumpet",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:arp",
      "preset": "mrdrHarpsichord",
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
      "preset": "epiano",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "mrdrConcertFlute",
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
    "riser": "crash2",
    "fill": "tom",
    "shaker": "rim",
    "tambourine": "rim2",
    "cowbell": "rim3",
    "congas": "tom2",
    "ride": "crash3",
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
      "label": "Pre-Chorus",
      "from": 5,
      "to": 8,
      "energy": 0.6
    },
    {
      "id": "club:drop:1",
      "role": "drop",
      "type": "drop",
      "label": "Chorus",
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
      "label": "Pre-Chorus 2",
      "from": 41,
      "to": 44,
      "energy": 0.65
    },
    {
      "id": "club:drop:2",
      "role": "drop2",
      "type": "drop",
      "label": "Chorus 2",
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
      "style": "Shibuya-Kei",
      "mood": "lounge",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 126,
      "seconds": 122,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Shibuya-Kei's own · kick · DS Kick, bars 45–52",
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
        "lane": "snare",
        "job": "snare",
        "how": "sound",
        "from": "Shibuya-Kei's own · snare · Snare, bars 45–52",
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
        "lane": "clap",
        "job": "clap",
        "how": "sound",
        "from": "Shibuya-Kei's own · clap · DS Rim, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -5,
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
        "from": "Shibuya-Kei's own · hats · DS Closed Hat, bars 45–52",
        "base": -11,
        "before": -11,
        "after": -11,
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
        "from": "Shibuya-Kei's own · ohats · DS Open Hat, bars 45–52",
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
        "lane": "crash",
        "job": "crash",
        "how": "sound",
        "from": "Shibuya-Kei's own · crash · =909 Crash, bars 45–52",
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
        "from": "Shibuya-Kei's own · fill · DS Tom, bars 52–59",
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
        "lane": "crash3",
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
        "from": "Shibuya-Kei's own · bass · Round Bass, bars 45–52",
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
        "lane": "bass2",
        "job": "sub",
        "how": "part",
        "from": "Shibuya-Kei's own · sub · Sub Sine (starter), bars 45–52",
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
        "job": "piano",
        "how": "part",
        "from": "Shibuya-Kei's own · piano · Acoustic Guitar, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -6.1,
        "move": -0.1,
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
        "from": "Shibuya-Kei's own · pad · Warm Strings, bars 1–4",
        "base": -13,
        "before": -13,
        "after": -10.3,
        "move": 2.7,
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
        "from": "Shibuya-Kei's own · square · Vibraphone, bars 45–52",
        "base": -4,
        "before": -4,
        "after": -2.9,
        "move": 1.1,
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
        "from": "Shibuya-Kei's own · bell · Celesta, bars 45–52",
        "base": -11,
        "before": -11,
        "after": -14.9,
        "move": -3.9,
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
        "from": "Shibuya-Kei's own · megaSaw · Muted Trumpet, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -3.2,
        "move": 1.8,
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
        "from": "Shibuya-Kei's own · arp · Acoustic Guitar, bars 45–52",
        "base": -13,
        "before": -13,
        "after": -12.9,
        "move": 0.1,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead6",
        "job": "choir",
        "how": "part",
        "from": "Shibuya-Kei's own · choir · Choir Ooh, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -15.8,
        "move": -5.8,
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
        "from": "Shibuya-Kei's own · third · Electric Piano, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -8.1,
        "move": 0.9,
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
        "from": "Shibuya-Kei's own · counter · Concert Flute, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -4.5,
        "move": 0.5,
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
          "gain": 0,
          "send": {
            "delay": 0.12,
            "reverb": 0.3
          },
          "pan": -0.05,
          "eq": {
            "high": 1.5
          }
        },
        "noteFX": null
      },
      {
        "role": "kick",
        "lane": "kick",
        "label": "KICK",
        "voice": "dsKick",
        "voiceParams": null,
        "strip": {
          "gain": -3,
          "eq": {
            "low": -1
          }
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "SNARE Roll",
        "voice": "snareCrisp",
        "voiceParams": null,
        "strip": {
          "gain": -1,
          "eq": {
            "high": 1
          },
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "RIM",
        "voice": "dsRim",
        "voiceParams": null,
        "strip": {
          "gain": -5,
          "pan": -0.1,
          "send": {
            "reverb": 0.2
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
          "gain": -11,
          "pan": 0.25
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "dsHatOpen",
        "voiceParams": null,
        "strip": {
          "gain": -13,
          "pan": -0.2
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
          "pan": 0.3,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "riser",
        "lane": "crash2",
        "label": "RISER",
        "voice": null,
        "voiceParams": {
          "label": "Noise Riser",
          "category": "Sweep",
          "homeLane": "crash",
          "kind": "drum",
          "dur": 3.8095238095238093,
          "note": "White noise through a band climbing 250 Hz to 8 kHz over 3.81s as it fades in: the lift into a drop.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 3.8095238095238093,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 3.5047619047619047,
            "hold": 0,
            "decay": 0.30476190476190473,
            "curve": "exp",
            "gain": 1
          },
          "drive": 0.08,
          "peak": 0.034
        },
        "strip": {
          "gain": -15.5,
          "send": {
            "reverb": 0.8
          },
          "eq": {
            "low": 5.5,
            "high": 2
          }
        },
        "noteFX": null
      },
      {
        "role": "fill",
        "lane": "tom",
        "label": "FILL TOMS",
        "voice": "dsTom",
        "voiceParams": null,
        "strip": {
          "gain": -7,
          "pan": 0.3,
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
        "lane": "crash3",
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
        "label": "BASS · Round Bass",
        "voice": "tngrRoundBass",
        "voiceParams": null,
        "strip": {
          "gain": -3
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
        "role": "piano",
        "lane": "chords",
        "label": "GUITAR Bossa · Acoustic Guitar",
        "voice": "mrdrAcousticGuitar",
        "voiceParams": null,
        "strip": {
          "gain": -6.1,
          "pan": -0.25,
          "send": {
            "reverb": 0.2
          }
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "ORGAN · Drawbar Organ",
        "voice": "addDrawbar",
        "voiceParams": null,
        "strip": {
          "gain": -10.3,
          "send": {
            "reverb": 0.35
          }
        },
        "noteFX": null
      },
      {
        "role": "square",
        "lane": "lead2",
        "label": "VIBES · Vibraphone",
        "voice": "mrdrVibraphone",
        "voiceParams": null,
        "strip": {
          "gain": -2.9,
          "pan": -0.15,
          "send": {
            "reverb": 0.35
          }
        },
        "noteFX": null
      },
      {
        "role": "bell",
        "lane": "lead3",
        "label": "CELESTA · Celesta",
        "voice": "tngrCelesta",
        "voiceParams": null,
        "strip": {
          "gain": -14.9,
          "pan": 0.25,
          "send": {
            "reverb": 0.45
          }
        },
        "noteFX": null
      },
      {
        "role": "megaSaw",
        "lane": "lead4",
        "label": "TRUMPET 8VA · Muted Trumpet",
        "voice": "mrdrMutedTrumpet",
        "voiceParams": null,
        "strip": {
          "gain": -3.2,
          "pan": -0.1,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead5",
        "label": "HARPSICHORD · Harpsichord",
        "voice": "mrdrHarpsichord",
        "voiceParams": null,
        "strip": {
          "gain": -12.9,
          "pan": 0.3,
          "send": {
            "delay": 0.2,
            "reverb": 0.25
          }
        },
        "noteFX": null
      },
      {
        "role": "choir",
        "lane": "lead6",
        "label": "CHOIR Ba-Ba · BEST Choir Aah",
        "voice": "bestChoirAah",
        "voiceParams": null,
        "strip": {
          "gain": -15.8,
          "send": {
            "reverb": 0.6
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead7",
        "label": "KEYS 3RD · Electric Piano",
        "voice": "epiano",
        "voiceParams": null,
        "strip": {
          "gain": -8.1,
          "pan": 0.15,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "counter",
        "lane": "lead8",
        "label": "FLUTE · Concert Flute",
        "voice": "mrdrConcertFlute",
        "voiceParams": null,
        "strip": {
          "gain": -4.5,
          "pan": 0.2,
          "send": {
            "delay": 0.15,
            "reverb": 0.4
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
        "production": "7fd26637"
      },
      "kick": {
        "notes": "963061db",
        "voice": "132b3ad7",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "c6f0d2b1",
        "voice": "4fdb061e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "d559375b",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
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
        "voice": "46c8999c",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "9285c3df",
        "voice": "2fe4894",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "riser": {
        "notes": "2529eb27",
        "voice": "2f65e84f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "ce4dd3c6"
      },
      "fill": {
        "notes": "9f3ec29",
        "voice": "4c3a868b",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "shaker": {
        "notes": "5d2e9abd",
        "voice": "573ce642",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "93cbdd3d",
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
        "notes": "47602c3d",
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
        "notes": "59e2d94",
        "voice": "29e31830",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "a20d7073",
        "voice": "94966028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "39ed4b90",
        "voice": "963522ee",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "pad": {
        "notes": "84470f3b",
        "voice": "bcab7bb0",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "square": {
        "notes": "9871906e",
        "voice": "5f5246fd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "bell": {
        "notes": "1cca66aa",
        "voice": "3e86c2d8",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "fa1160bd"
      },
      "megaSaw": {
        "notes": "b22ea12a",
        "voice": "b71a9e71",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "arp": {
        "notes": "f2c9b8e7",
        "voice": "b1adf2f0",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "dee7c738"
      },
      "choir": {
        "notes": "9e5a9414",
        "voice": "e9a11dc1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "third": {
        "notes": "706e51dd",
        "voice": "6e89ee2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "counter": {
        "notes": "392a1609",
        "voice": "b8a4dbcd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "aa4ccac1"
      }
    },
    "master": "f52c1fee"
  },
  "seedOf": "shibuya",
  "made": "2026-10-05T10:54:50.626Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","rim","rim2","rim3","tom2","crash3","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"RIM","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom2":"PERC Congas","crash3":"RIDE","bass":"BASS · Round Bass","bass2":"SUB · Sub Sine (starter)","chords":"GUITAR Bossa · Acoustic Guitar","chords2":"ORGAN · Drawbar Organ","lead":"RIFF Grand · HOOK","lead2":"VIBES · Vibraphone","lead3":"CELESTA · Celesta","lead4":"TRUMPET 8VA · Muted Trumpet","lead5":"HARPSICHORD · Harpsichord","lead6":"CHOIR Ba-Ba · BEST Choir Aah","lead7":"KEYS 3RD · Electric Piano","lead8":"FLUTE · Concert Flute"},
  voice: {"kickVoice":"dsKick","snareVoice":"snareCrisp","clapVoice":"dsRim","hatsVoice":"dsHatClosed","ohatsVoice":"dsHatOpen","crashVoice":"ds909Crash","tomVoice":"dsTom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"ds808Cowbell","tom2Voice":"congaMid","crash3Voice":"ride909SixBit","bassVoice":"tngrRoundBass","bass2Voice":"stSubSine","chordsVoice":"mrdrAcousticGuitar","chords2Voice":"addDrawbar","leadVoice":"mrdrElectricGrand","lead2Voice":"mrdrVibraphone","lead3Voice":"tngrCelesta","lead4Voice":"mrdrMutedTrumpet","lead5Voice":"mrdrHarpsichord","lead6Voice":"bestChoirAah","lead7Voice":"epiano","lead8Voice":"mrdrConcertFlute"},
  voiceParams: {"crash2Voice":{"label":"Noise Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":3.8095238095238093,"note":"White noise through a band climbing 250 Hz to 8 kHz over 3.81s as it fades in: the lift into a drop.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":3.8095238095238093,"Q":1.6,"slope":-24,"color":"white","attack":3.5047619047619047,"hold":0,"decay":0.30476190476190473,"curve":"exp","gain":1},"drive":0.01756248699,"peak":0.0337,"trim":0.04859517898,"level":0.1154}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: -3, eq: { low: -1 } },
    snare: { gain: -1, send: { reverb: 0.3 }, eq: { high: 1 } },
    clap: { gain: -5, pan: -0.1, send: { reverb: 0.2 } },
    hats: { gain: -11, pan: 0.25 },
    ohats: { gain: -13, pan: -0.2 },
    crash: { gain: -10, pan: 0.3, send: { reverb: 0.3 } },
    crash2: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -7, pan: 0.3, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -13, pan: 0.25, send: { reverb: 0.15 } },
    tom2: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    crash3: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -3 },
    bass2: { gain: -16.1 },
    chords: { gain: -6.1, pan: -0.25, send: { reverb: 0.2 } },
    chords2: { gain: -10.3, send: { reverb: 0.35 } },
    lead: { pan: -0.05, send: { delay: 0.12, reverb: 0.3 }, eq: { high: 1.5 } },
    lead2: { gain: -2.9, pan: -0.15, send: { reverb: 0.35 } },
    lead3: { gain: -14.9, pan: 0.25, send: { reverb: 0.45 } },
    lead4: { gain: -3.2, pan: -0.1, send: { reverb: 0.3 } },
    lead5: { gain: -12.9, pan: 0.3, send: { delay: 0.2, reverb: 0.25 } },
    lead6: { gain: -15.8, send: { reverb: 0.6 } },
    lead7: { gain: -8.1, pan: 0.15, send: { reverb: 0.3 } },
    lead8: { gain: -4.5, pan: 0.2, send: { delay: 0.15, reverb: 0.4 } },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  swing: 56,
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
