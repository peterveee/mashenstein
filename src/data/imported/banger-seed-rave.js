// RAVE SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Rave's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-rave";
export const title = "RAVE SEED";
export const slug = "banger-seed-rave";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 140,
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
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('F4min7 . . F4min7 . . F4min7 . . . F4min7 . F4min7 . . . | F4min7 . . F4min7 . . F4min7 . . . F4min7 . F4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('F1 . . F1 . . F1 . F1 . . F1 . . F1 . | F1 . . F1 . . F1 . F1 . . F1 . . F1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead5: seq('F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 A6 F6 C6 A5 C6 F6 | F5 A5 C6 F6 C6 A5 F5 A5 C6 F6 A6 F6 C6 A5 C6 F6'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('F4min7 . . F4min7 . . F4min7 . . . F4min7 . F4min7 . . . | F4min7 . . F4min7 . . F4min7 . . . F4min7 . F4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('F1 . . F1 . . F1 . F1 . . F1 . . F1 . | F1 . . F1 . . F1 . F1 . . F1 . . F1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . A4min7 . A4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . A1 . . A1 . . A1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . . . . . C1 . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('A4min7 . . A4min7 . . A4min7 . . . A4min7 . A4min7 . . . | F4min7 . . F4min7 . . F4min7 . . . F4min7 . F4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('A1 . . A1 . . A1 . A1 . . A1 . . A1 . | F1 . . F1 . . F1 . F1 . . F1 . . F1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . A4min7 . A4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . A1 . . A1 . . A1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . . . . . C1 . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,391.99543598174927,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,698.4564628660078,783.9908719634985,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,391.99543598174927,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,698.4564628660078,783.9908719634985,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . . D1 . . D1 . D1 . . D1 . . D1 . | D1 . . D1 . . D1 . D1 . . D1 . . D1 .'),
      bassLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead5: seq('D6 A5 F5 D5 D6 A5 F5 D5 D6 A5 F5 D5 D6 A5 F5 D5 | D6 A5 F5 D5 D6 A5 F5 D5 D6 A5 F5 D5 D6 A5 F5 D5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . D2 . D1 . D2 . D1 . D2 . D1 . D2 . | D1 . D2 . D1 . D2 . D1 . D2 . D1 . D2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('D5 F5 A5 D6 F6 A6 D7 F7 D5 F5 A5 D6 F6 A6 D7 F7 | D5 F5 A5 D6 F6 A6 D7 F7 D5 F5 A5 D6 F6 A6 D7 F7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . . | D4min7 . . D4min7 . . D4min7 . . . D4min7 . D4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('D1 . D2 . D1 . D2 . D1 . D2 . D1 . D2 . | D1 . D2 . D1 . D2 . D1 . D2 . D1 . D2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('D5 F5 A5 D6 F6 A6 D7 F7 D5 F5 A5 D6 F6 A6 D7 F7 | D5 F5 A5 D6 F6 A6 D7 F7 D5 F5 A5 D6 F6 A6 D7 F7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . A#4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('A4min7 . . A4min7 . . A4min7 . . . A4min7 . A4min7 . . . | F4min7 . . F4min7 . . F4min7 . . . F4min7 . F4min7 . . .'),
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 . | F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('E5 A5 C6 E6 A6 C7 E7 A7 E5 A5 C6 E6 A6 C7 E7 A7 | F5 A5 C6 F6 A6 C7 F7 A7 F5 A5 C6 F6 A6 C7 F7 A7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead4: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,null,[440,493.8833012561241,622.2539674441618,739.9888454232688],null,null,null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,null,null,null,null],
      bass: seq('D1 . D2 . D1 . D2 . D1 . D2 . D1 . D2 . | D1 . D2 . D1 . D2 . B1 . C#2 . D2 . D#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . C#2 . D2 . D#2 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('D5 F5 A5 D6 F6 A6 D7 F7 D5 F5 A5 D6 F6 A6 D7 F7 | D5 F5 A5 D6 F6 A6 D7 F7 D#5 A5 B5 D#6 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . . . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . . . . . . . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,null,null,null,null,null,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . . . . . . . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 . | E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 . | E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . G1 . . . G1 . . . G1 . . . G1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('G5 . B5 . D6 . G6 . B6 . G6 . D6 . B5 . | G5 . B5 . D6 . G6 . B6 . G6 . D6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 . | E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 . | E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 . | E1 . E2 . E1 . E2 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . . . . . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null],
      lead5: seq('E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 . | E5 . G5 . B5 . E6 . B6 . F#6 . D#6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D#4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 . | E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 . | E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 . | E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 . | E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . E5 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[493.8833012561241,587.3295358348151,739.9888454232688,880],null,null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,null,null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('B1 . B2 . B1 . B2 . B1 . B2 . B1 . B2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . B1 . . . B1 . . . B1 . . . B1 . | . . G1 . . . G1 . . . G1 . . . G1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      lead5: seq('F#5 . B5 . D6 . F#6 . B6 . F#6 . D6 . B5 . | G5 . B5 . D6 . G6 . B6 . G6 . D6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('B5 . D6 . F#6 . D6 . B5 . . . A5 . C6 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[369.9944227116344,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,[493.8833012561241,587.3295358348151,739.9888454232688,880],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 . | E1 . E2 . E1 . E2 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . C1 . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null],
      snare: seq('. . . . C1 . . C1 . C1 . . . . C1 . | . . . . . . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null],
      lead5: seq('E5 . G5 . B5 . E6 . G6 . E6 . B5 . G5 . | E5 . G5 . B5 . E6 . B6 . F#6 . D#6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D#4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 10,
  "style": "rave",
  "options": {
    "style": "rave",
    "mood": "dark",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 140,
    "hook": "auto",
    "combo": null,
    "flavour": "style",
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
      "doubleDrop": true,
      "keyLift": "whole",
      "keyApproach": "mood",
      "mood2": "none",
      "moodSwitch": "breakdown",
      "hardStop": true,
      "falseEnding": false,
      "halfTime": false,
      "outro": true,
      "breakdownHook": "half"
    },
    "drums": {
      "source": "replace",
      "kit": "style",
      "crashes": true,
      "fills": true,
      "rolls": true,
      "impact": true,
      "shaker": true,
      "tambourine": true,
      "congas": true,
      "cowbell": true,
      "ride": true
    },
    "parts": {
      "bass": "offbeat",
      "sub": true,
      "chords": "stabs",
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
      "filterBuild": true,
      "stutter": true,
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
    "styleId": "rave",
    "moodId": "dark",
    "parts": {
      "riff:hook": [
        {
          "id": "mrdrPopGrand",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrHoover",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "tngrBrightPiano",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrFestivalStab",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "bestScreamerLead",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        }
      ]
    }
  },
  "palette": [
    {
      "lane": "kick",
      "part": "part:kick",
      "preset": "ds909KickPunch",
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
      "preset": "ds909Clap",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "hats",
      "part": "part:hats",
      "preset": "hatEngine",
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
      "part": "part:impact",
      "preset": "syn3PewDeep",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom2",
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
      "lane": "tom3",
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
      "preset": "layerWalkingBass",
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
      "part": "part:saws",
      "preset": "mrdrRaveStab",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "bestPwmStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "mrdrHoover",
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
      "preset": "mrdrHoover",
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
      "preset": "mrdrPopGrand",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "mrdrPopGrand",
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
    "impact": "tom",
    "fill": "tom2",
    "shaker": "rim",
    "tambourine": "rim2",
    "cowbell": "rim3",
    "congas": "tom3",
    "ride": "crash3",
    "bass": "bass",
    "sub": "bass2",
    "saws": "chords",
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
      "to": 24,
      "energy": 0.85
    },
    {
      "id": "club:breakdown:1",
      "role": "breakdown",
      "type": "breakdown",
      "label": "Breakdown",
      "from": 25,
      "to": 32,
      "energy": 0.25
    },
    {
      "id": "club:build:2",
      "role": "build2",
      "type": "build",
      "label": "Build 2",
      "from": 33,
      "to": 36,
      "energy": 0.65
    },
    {
      "id": "club:drop:2",
      "role": "drop2",
      "type": "drop",
      "label": "Drop 2",
      "from": 37,
      "to": 44,
      "energy": 0.9
    },
    {
      "id": "club:drop:3",
      "role": "drop3",
      "type": "drop",
      "label": "Drop 3",
      "from": 45,
      "to": 60,
      "energy": 1
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
      "style": "Rave",
      "mood": "dark",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 140,
      "seconds": 110,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [],
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
            "high": 1
          }
        },
        "noteFX": null
      },
      {
        "role": "kick",
        "lane": "kick",
        "label": "KICK",
        "voice": "ds909KickPunch",
        "voiceParams": null,
        "strip": {
          "gain": 0.5,
          "eq": {
            "low": -2
          }
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "BREAK",
        "voice": "snareCrisp",
        "voiceParams": null,
        "strip": {
          "gain": 2,
          "eq": {
            "high": 3
          },
          "send": {
            "reverb": 0.15
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
          "gain": 0,
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
        "voice": "hatEngine",
        "voiceParams": null,
        "strip": {
          "gain": -5,
          "pan": 0.2
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
          "gain": -8,
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
          "gain": -7,
          "pan": 0.2,
          "send": {
            "reverb": 0.9
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
          "dur": 3.4285714285714284,
          "note": "White noise through a band climbing 250 Hz to 8 kHz over 3.43s as it fades in: the lift into a drop.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 3.4285714285714284,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 3.1542857142857144,
            "hold": 0,
            "decay": 0.2742857142857143,
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
        "role": "impact",
        "lane": "tom",
        "label": "IMPACT",
        "voice": "syn3PewDeep",
        "voiceParams": null,
        "strip": {
          "gain": -3,
          "send": {
            "reverb": 0.6
          }
        },
        "noteFX": null
      },
      {
        "role": "fill",
        "lane": "tom2",
        "label": "FILL TOMS",
        "voice": "ds909Tom",
        "voiceParams": null,
        "strip": {
          "gain": -5,
          "pan": 0.2,
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
        "lane": "tom3",
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
        "label": "SUB · Walking Sine Bass",
        "voice": "layerWalkingBass",
        "voiceParams": null,
        "strip": {
          "gain": -2
        },
        "noteFX": null
      },
      {
        "role": "sub",
        "lane": "bass2",
        "label": "SUB · Sub Sine",
        "voice": "stSubSine",
        "voiceParams": null,
        "strip": {
          "gain": -10
        },
        "noteFX": null
      },
      {
        "role": "saws",
        "lane": "chords",
        "label": "CHORDS Stabs · Rave Stab",
        "voice": "mrdrRaveStab",
        "voiceParams": null,
        "strip": {
          "gain": -4,
          "pan": 0.1,
          "send": {
            "delay": 0.3,
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "PAD · PWM Strings",
        "voice": "bestPwmStrings",
        "voiceParams": null,
        "strip": {
          "gain": -8,
          "eq": {
            "low": -4
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
        "label": "HOOVER · Hoover",
        "voice": "mrdrHoover",
        "voiceParams": null,
        "strip": {
          "gain": -3,
          "pan": 0,
          "send": {
            "reverb": 0.25
          }
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
          "gain": -6,
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
        "label": "HOOVER 8VA · Hoover",
        "voice": "mrdrHoover",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "pan": -0.1,
          "send": {
            "delay": 0.15,
            "reverb": 0.25
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead5",
        "label": "ARP · Sparkle Pluck",
        "voice": "tngrCrystalTrigger",
        "voiceParams": null,
        "strip": {
          "gain": -10.5,
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
        "role": "choir",
        "lane": "lead6",
        "label": "CHOIR · Synth Choir Aah",
        "voice": "bestChoirAah",
        "voiceParams": null,
        "strip": {
          "gain": -7,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead7",
        "label": "THIRD BELOW · Bright Pop Grand",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": -7,
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
        "label": "COUNTER-MELODY · Bright Pop Grand",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": -9,
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
        "notes": "63854d57",
        "voice": "eced1f8e",
        "auto": "48f78757",
        "expression": "77074ba4",
        "production": "7fd26637"
      },
      "kick": {
        "notes": "8aec7ace",
        "voice": "9f0161bb",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "1c86fda",
        "voice": "4fdb061e",
        "auto": "a50d7d1f",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "clap": {
        "notes": "5422eaf8",
        "voice": "b837a92d",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "hats": {
        "notes": "cf6e8349",
        "voice": "2e5964eb",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "1cab35a1",
        "voice": "8be5eeea",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "aff49ba8",
        "voice": "2fe4894",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ae0a06d"
      },
      "riser": {
        "notes": "ad6eb166",
        "voice": "7ab46b14",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "ce4dd3c6"
      },
      "impact": {
        "notes": "18b9a528",
        "voice": "989606db",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "fill": {
        "notes": "11bee5ad",
        "voice": "e0417259",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "shaker": {
        "notes": "b5c3ba75",
        "voice": "573ce642",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "f30546a6",
        "voice": "4a3e77e",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "cowbell": {
        "notes": "261448b8",
        "voice": "b399644f",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "congas": {
        "notes": "7d3ae598",
        "voice": "3e7da3dc",
        "auto": "6b639b5b",
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
        "notes": "a5385270",
        "voice": "f9cf1993",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "a55c9eaa",
        "voice": "94966028",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "saws": {
        "notes": "916a148b",
        "voice": "1d715945",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "ef2121eb"
      },
      "pad": {
        "notes": "e1c7d939",
        "voice": "afc790ea",
        "auto": "944c7053",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "ad07cf3c",
        "voice": "9c9d0758",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "bell": {
        "notes": "69c44ef7",
        "voice": "c6497533",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "1b273511",
        "voice": "9c9d0758",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "a4ed6bf2"
      },
      "arp": {
        "notes": "8917e7e4",
        "voice": "7537d16d",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "59ba867a"
      },
      "choir": {
        "notes": "b87e624c",
        "voice": "e9a11dc1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "838f09a4",
        "voice": "1605d054",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "54abfa37",
        "voice": "1605d054",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "181c5976"
      }
    },
    "master": "37e4e5ec"
  },
  "seedOf": "rave",
  "made": "2026-10-08T16:06:57.963Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom3", from: "tom", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","tom2","rim","rim2","rim3","tom3","crash3","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"BREAK","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"IMPACT","tom2":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom3":"PERC Congas","crash3":"RIDE","bass":"SUB · Walking Sine Bass","bass2":"SUB · Sub Sine","chords":"CHORDS Stabs · Rave Stab","chords2":"PAD · PWM Strings","lead":"RIFF Grand · HOOK","lead2":"HOOVER · Hoover","lead3":"HOOK 8VA · Ice Bell","lead4":"HOOVER 8VA · Hoover","lead5":"ARP · Sparkle Pluck","lead6":"CHOIR · Synth Choir Aah","lead7":"THIRD BELOW · Bright Pop Grand","lead8":"COUNTER-MELODY · Bright Pop Grand"},
  voice: {"kickVoice":"ds909KickPunch","snareVoice":"snareCrisp","clapVoice":"ds909Clap","hatsVoice":"hatEngine","ohatsVoice":"ds909OpenHat","crashVoice":"ds909Crash","tomVoice":"syn3PewDeep","tom2Voice":"ds909Tom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"ds808Cowbell","tom3Voice":"congaMid","crash3Voice":"ride909SixBit","bassVoice":"layerWalkingBass","bass2Voice":"stSubSine","chordsVoice":"mrdrRaveStab","chords2Voice":"bestPwmStrings","leadVoice":"mrdrElectricGrand","lead2Voice":"mrdrHoover","lead3Voice":"tngrIceBell","lead4Voice":"mrdrHoover","lead5Voice":"tngrCrystalTrigger","lead6Voice":"bestChoirAah","lead7Voice":"mrdrPopGrand","lead8Voice":"mrdrPopGrand"},
  voiceParams: {"crash2Voice":{"label":"Noise Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":3.4285714285714284,"note":"White noise through a band climbing 250 Hz to 8 kHz over 3.43s as it fades in: the lift into a drop.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":3.4285714285714284,"Q":1.6,"slope":-24,"color":"white","attack":3.1542857142857144,"hold":0,"decay":0.2742857142857143,"curve":"exp","gain":1},"drive":0.08,"peak":0.034}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: 0.5, eq: { low: -2 } },
    snare: { gain: 2, send: { reverb: 0.15 }, eq: { high: 3 } },
    clap: { send: { reverb: 0.25 } },
    hats: { gain: -5, pan: 0.2 },
    ohats: { gain: -8, pan: -0.2 },
    crash: { gain: -7, pan: 0.2, send: { reverb: 0.9 } },
    crash2: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -3, send: { reverb: 0.6 } },
    tom2: { gain: -5, pan: 0.2, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -13, pan: 0.25, send: { reverb: 0.15 } },
    tom3: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    crash3: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -2 },
    bass2: { gain: -10 },
    chords: { gain: -4, pan: 0.1, send: { delay: 0.3, reverb: 0.3 } },
    chords2: { gain: -8, send: { reverb: 0.5 }, eq: { low: -4 } },
    lead: { pan: -0.05, send: { delay: 0.12, reverb: 0.3 }, eq: { high: 1 } },
    lead2: { gain: -3, send: { reverb: 0.25 } },
    lead3: { gain: -6, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead4: { gain: -6, pan: -0.1, send: { delay: 0.15, reverb: 0.25 } },
    lead5: { gain: -10.5, pan: -0.25, send: { delay: 0.2, reverb: 0.2 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    lead6: { gain: -7, send: { reverb: 0.5 } },
    lead7: { gain: -7, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -9, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  automation: {
    chords: {
      cuts: [[44,12]],
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
          from: [33,0],
          to: [37,0],
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
          from: [33,0],
          to: [37,0],
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
      cuts: [[44,12]],
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
          from: [33,0],
          to: [37,0],
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
      cuts: [[44,12]],
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
          from: [33,0],
          to: [37,0],
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
      cuts: [[44,12]],
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
          from: [33,0],
          to: [37,0],
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
      cuts: [[44,12]],
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
          from: [33,0],
          to: [37,0],
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
    snare: {
      points: [[5,0,0],[5,0,-12],[9,0,0],[33,0,0],[33,0,-12],[37,0,0]],
      cuts: [[44,12]],
    },
    __master: {
      fx: [
        {
          from: [8,8],
          to: [9,0],
          chain: [
            {
              id: "reverb",
              params: {
                decay: 4.5,
                preDelay: 0.02,
                low: 0,
                mid: 0,
                high: -3,
                width: 1,
                wet: 0.55,
              },
            },
          ],
        },
        {
          from: [36,8],
          to: [37,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.125,
                retrigger: 0,
                fade: 0,
              },
            },
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 18000,
                Q: 1.2,
                sweep: 1,
                sweepTo: 200,
              },
            },
          ],
        },
      ],
    },
    lead: {
      points: [[45,0,0],[45,0,-2.5],[61,0,-2.5],[61,0,0]],
      cuts: [[44,12]],
      fx: [
        {
          from: [24,12],
          to: [25,0],
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
          from: [44,8],
          to: [44,12],
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
    lead3: {
      cuts: [[44,12]],
    },
    lead4: {
      cuts: [[44,12]],
    },
    lead7: {
      cuts: [[44,12]],
    },
    lead8: {
      cuts: [[44,12]],
    },
    kick: {
      cuts: [[44,12]],
    },
    clap: {
      cuts: [[44,12]],
    },
    ohats: {
      cuts: [[44,12]],
    },
    hats: {
      cuts: [[44,12]],
    },
    rim: {
      cuts: [[44,12]],
    },
    rim2: {
      cuts: [[44,12]],
    },
    tom3: {
      cuts: [[44,12]],
    },
    rim3: {
      cuts: [[44,12]],
    },
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
