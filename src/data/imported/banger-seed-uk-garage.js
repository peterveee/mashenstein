// UK GARAGE SEED — one song: what it plays, how it is arranged, how it sounds.
//
// UK Garage's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-uk-garage";
export const title = "UK GARAGE SEED";
export const slug = "banger-seed-uk-garage";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 132,
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('F4min7 . . F4min7 . . . . . . F4min7 . . . . . | F4min7 . . F4min7 . . . . . . F4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('F1 . . F1 . . . . . . F1 . . F2 F1 . | F1 . . F1 . . . . . . F1 . . F2 F1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead5: seq('A4 C5 F5 C5 A4 C5 F5 A5 A4 C5 F5 C5 A4 F5 C5 A5 | A4 C5 F5 C5 A4 C5 F5 A5 A4 C5 F5 C5 A4 F5 C5 A5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('F4min7 . . F4min7 . . . . . . F4min7 . . . . . | F4min7 . . F4min7 . . . . . . F4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('F1 . . F1 . . . . . . F1 . . F2 F1 . | F1 . . F1 . . . . . . F1 . . F2 F1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . A3min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . A1 . . A2 A1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('A3min7 . . A3min7 . . . . . . A3min7 . . . . . | F4min7 . . F4min7 . . . . . . F4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('A1 . . A1 . . . . . . A1 . . A2 A1 . | F1 . . F1 . . . . . . F1 . . F2 F1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . A3min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . A1 . . A2 A1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('F4min7 . . F4min7 . . . . . . F4min7 . . . . . | F4min7 . . F4min7 . . . . . . F4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('F1 . . F1 . . . . . . F1 . . F2 F1 . | F1 . . F1 . . . . . . F1 . . F2 F1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . A3min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . A1 . . A2 A1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,659.2551138257398,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . . . . . A4 . . . . . . . | F5 . . . . . . . E5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[523.2511306011972,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min7 . . D4min7 . . . . . . D4min7 . . . . . | D4min7 . . D4min7 . . . . . . D4min7 . . . . .'),
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . D2 . . D3 D2 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,440],null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344,440],null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,null,null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,[293.6647679174076,349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,[261.6255653005986,329.6275569128699,440,523.2511306011972],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('D2 . . D2 . . . . . . D2 . . D3 D2 . | D2 . . D2 . . . . . . A1 . . B2 B1 .'),
      bassLen: [2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null,2,null,null,1,null,null,null,null,null,null,2,null,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A0 . . . B0 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead5: seq('A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 | A5 F5 D5 A4 A5 F5 D5 A4 A5 E5 C5 A4 A5 F#5 D#5 A4'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . E5 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . C5 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[987.7666025122483,1975.533205024496],null,[1174.6590716696303,2349.31814333926],null,[1479.9776908465376,2959.955381693075],null,[1174.6590716696303,2349.31814333926],null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,[1046.5022612023945,2093.004522404789],null,[783.9908719634985,1567.981743926997],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('B1 . B2 . B1 . B2 . B1 . B2 . B1 . B2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . B1 . . . B1 . . . B1 . . . B1 . | . . G1 . . . G1 . . . G1 . . . G1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 D5 F#5 B5 D6 F#6 B6 D7 B4 D5 F#5 B5 D6 F#6 B6 D7 | B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('B5 . D6 . F#6 . D6 . B5 . . . A5 . C6 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[440,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D#4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[1174.6590716696303,2349.31814333926],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,[880,1760],null,[783.9908719634985,1567.981743926997],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[987.7666025122483,1975.533205024496],null,null,null,[880,1760],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,null,null,null,[391.99543598174927,466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . G1 . . . G1 . . . G1 . . . G1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7 | B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . E5 . . . D5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 . | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,[329.6275569128699,391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,[246.94165062806206,293.6647679174076,369.9944227116344,440],null,null,null,null,null],
      chordsLen: [1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null,1,null,null,1,null,null,null,null,null,null,1,null,null,null,null,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . . . . . C1 . . . . . | . . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('C5 . E5 . G5 . E5 . C5 . . . B4 . D5 . | C5 . . . G4 . . . G4 . . . D#4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
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
  "generator": 10,
  "style": "uk-garage",
  "options": {
    "style": "uk-garage",
    "mood": "moody",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 132,
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
      "source": "replace",
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
      "riser": false,
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
    "styleId": "uk-garage",
    "moodId": "moody",
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
      "preset": "clapTight",
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
      "preset": "dsShaker",
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
      "preset": "mrdrOrganBass",
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
      "preset": "mrdrHouseOrganStab",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "tngrCloudMemory",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "mrdrVocalOh",
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
      "preset": "mrdrHouseOrganStab",
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
      "preset": "jmjrChoirOoh",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
      "part": "part:third",
      "preset": "rmndTineEP",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "mrdrVocalOh",
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
      "style": "UK Garage",
      "mood": "moody",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 132,
      "seconds": 116,
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
          "gain": -2,
          "send": {
            "delay": 0.25,
            "reverb": 0.3
          },
          "pan": -0.05,
          "eq": {
            "high": 0.5
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
          "gain": 0,
          "eq": {
            "low": 1
          }
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
          "gain": -1,
          "send": {
            "reverb": 0.2
          }
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "CLAP",
        "voice": "clapTight",
        "voiceParams": null,
        "strip": {
          "gain": -2,
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
          "gain": -9,
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
        "role": "fill",
        "lane": "tom",
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
        "voice": "dsShaker",
        "voiceParams": null,
        "strip": {
          "gain": -14,
          "pan": -0.3
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
        "label": "ORGAN BASS · Organ Bass",
        "voice": "mrdrOrganBass",
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
          "gain": -12
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "ORGAN Stabs · House Organ Stab",
        "voice": "mrdrHouseOrganStab",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "pan": -0.1,
          "send": {
            "delay": 0.25,
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "PAD · Soft Ambient Pad",
        "voice": "tngrCloudMemory",
        "voiceParams": null,
        "strip": {
          "gain": -10,
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
        "label": "HOOK DOUBLE · Vocal Oh",
        "voice": "mrdrVocalOh",
        "voiceParams": null,
        "strip": {
          "gain": 0,
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
        "label": "LEAD 8VA · House Organ Stab",
        "voice": "mrdrHouseOrganStab",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "eq": {
            "low": -3
          },
          "send": {
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
        "label": "CHOIR · Sung Choir Ooh",
        "voice": "jmjrChoirOoh",
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
        "label": "THIRD BELOW · Tine Electric Piano",
        "voice": "rmndTineEP",
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
        "label": "VOX Chop · Vocal Oh",
        "voice": "mrdrVocalOh",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "pan": 0.15,
          "send": {
            "delay": 0.3,
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
        "production": "8ac28975"
      },
      "kick": {
        "notes": "5a4fd6a5",
        "voice": "4c0dc4a1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "ad0efe6",
        "voice": "c3b485de",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "c5432b44",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "hats": {
        "notes": "44638c45",
        "voice": "66d7c48",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "c5d0bfbd",
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
        "production": "3ae0a06d"
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
        "voice": "5dd14459",
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
        "notes": "93d17fa7",
        "voice": "83490599",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "32a1cf39",
        "voice": "94966028",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "24013db2",
        "voice": "c05bd5b6",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "8ac28975"
      },
      "pad": {
        "notes": "963dad1d",
        "voice": "98f5f533",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "9871906e",
        "voice": "74d9cff9",
        "auto": "5c415a17",
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
        "voice": "c05bd5b6",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "arp": {
        "notes": "51aef61a",
        "voice": "7537d16d",
        "auto": "5c415a17",
        "expression": "77074ba4",
        "production": "59ba867a"
      },
      "choir": {
        "notes": "3dbe2df4",
        "voice": "5feefb54",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "ad244c0d",
        "voice": "20a08fc2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "392a1609",
        "voice": "74d9cff9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5fa96782"
      }
    },
    "master": "efa40044"
  },
  "seedOf": "uk-garage",
  "made": "2026-10-08T16:06:58.030Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","rim","rim2","rim3","tom2","crash2","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom2":"PERC Congas","crash2":"RIDE","bass":"ORGAN BASS · Organ Bass","bass2":"SUB · Sub Sine","chords":"ORGAN Stabs · House Organ Stab","chords2":"PAD · Soft Ambient Pad","lead":"RIFF Grand · HOOK","lead2":"HOOK DOUBLE · Vocal Oh","lead3":"HOOK 8VA · Ice Bell","lead4":"LEAD 8VA · House Organ Stab","lead5":"ARP · Sparkle Pluck","lead6":"CHOIR · Sung Choir Ooh","lead7":"THIRD BELOW · Tine Electric Piano","lead8":"VOX Chop · Vocal Oh"},
  voice: {"kickVoice":"ds909Kick","snareVoice":"ds909Snare","clapVoice":"clapTight","hatsVoice":"dsHatClosed","ohatsVoice":"ds909OpenHat","crashVoice":"blastImpact","tomVoice":"ds909Tom","rimVoice":"dsShaker","rim2Voice":"tambourine","rim3Voice":"ds808Cowbell","tom2Voice":"congaMid","crash2Voice":"ride909SixBit","bassVoice":"mrdrOrganBass","bass2Voice":"stSubSine","chordsVoice":"mrdrHouseOrganStab","chords2Voice":"tngrCloudMemory","leadVoice":"mrdrElectricGrand","lead2Voice":"mrdrVocalOh","lead3Voice":"tngrIceBell","lead4Voice":"mrdrHouseOrganStab","lead5Voice":"tngrCrystalTrigger","lead6Voice":"jmjrChoirOoh","lead7Voice":"rmndTineEP","lead8Voice":"mrdrVocalOh"},
  voiceParams: {"chordsVoice":{"label":"House Organ Stab","category":"Organ","homeLane":"chords","synth":"MRDR-3","dur":0.6,"note":"The house-music organ chord: two square drawbars an octave apart and a sine pip a twelfth up that speaks only on the strike, a filter that flashes open and closes again, and no sustain at all, so every off-beat stab stops before the next.","layer":{"osc1":{"type":"square","ratio":1,"gain":0.55,"attack":0.003,"decay":0.758,"sustain":0,"release":0.08},"osc2":{"type":"square","ratio":2,"gain":0.4,"attack":0.003,"decay":0.28,"sustain":0,"release":0.07,"delay":0.03},"osc3":{"type":"sine","ratio":3,"gain":0.35,"attack":0.001,"decay":0.09,"sustain":0,"release":0.04}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":2600,"Q":0.8,"track":0.5,"env":{"octaves":1.4,"attack":0.001,"decay":0.839,"sustain":0,"release":0.06}},"vca":{"attack":0.002,"decay":7.97,"sustain":0,"release":0.08}},"humanize":{"entry":0.003,"gain":0.05},"starter":false,"kind":"tone","level":0.041417220712348185,"peak":0.5334987927545874,"songOrigin":"library","songSourceId":"chordsVoice"},"lead5Voice":{"label":"Sparkle Pluck","category":"Pluck","synth":"TNGR-2","dur":1.2,"note":"A sparkling high-partial attack with a clean short body.","drive":0,"tngr2":{"oscA":{"table":"crystal","position":0.58,"envAmount":-0.71,"level":0.83,"detune":-4},"oscB":{"table":"bellFold","position":0.72,"level":0.14,"interval":12,"detune":6},"amp":{"attack":0.001,"decay":0.726,"sustain":0.26,"release":0.048},"positionEnv":{"attack":0.003,"decay":0.715,"sustain":0.79},"filter":{"type":"lowpass","cutoff":1946.16,"resonance":2.4,"keyTrack":0.38},"master":{"gain":0.52},"filterEnv":{"sustain":0.21,"release":0.029,"decay":0.093}},"chorus":{"mix":0.2},"starter":false,"kind":"tone","level":0.022313,"peak":0.2709,"songOrigin":"library","songSourceId":"lead5Voice"},"snareVoice":{"label":"=909 Snare","category":"Snare","homeLane":"snare","dur":1,"note":"A bright 909-style snare: a pitched shell under a wide, slightly metallic noise burst with enough decay to carry a backbeat.","osc":{"type":"triangle","from":135,"to":285,"sweep":0.03,"decay":0.165,"curve":"exp","gain":0.72,"hold":0},"knock":1,"noise":{"type":"bandpass","freq":1950,"Q":0.8,"decay":0.985,"gain":1.62,"hold":0.023,"attack":0.001,"color":"white","slope":-24,"sweep":0.155},"drive":0.31,"shape":"fold","trim":1.6,"starter":false,"kind":"drum","level":0.05749024552592818,"peak":0.3052998956916732,"songOrigin":"library","songSourceId":"snareVoice"},"kickVoice":{"label":"=909 Kick","category":"Kick","homeLane":"kick","dur":2,"note":"A compact 909-style kick: hard beater click, fast pitch drop and a firm low body that stays out of the sub for the next bass note.","osc":{"type":"sine","from":185,"to":45,"sweep":0.035,"attack":0.001,"decay":0.42,"curve":"exp","gain":1},"noise":{"type":"highpass","freq":2600,"Q":1.2,"decay":0.012,"gain":0.34},"drive":0.312548,"id":"ds909Kick","kind":"drum","factory":true,"level":0.060598,"peak":0.8722},"clapVoice":{"label":"Tight Clap","category":"Clap","dur":1,"note":"Three closer, shorter bursts. Reads as one hand rather than a room full.","noise":{"type":"bandpass","freq":2400,"Q":2,"decay":0.055},"taps":[0,0.008,0.016],"tapFalloff":0.7,"id":"clapTight","kind":"drum","factory":true,"level":0.006711,"peak":0.2175},"hatsVoice":{"label":"Synth Closed Hat","category":"Hats","dur":0.5,"note":"A resonant highpassed tick — sharper than the plain closed hat, closer to metal without being metal.","noise":{"type":"highpass","freq":7800,"Q":1.2,"decay":0.156,"gain":1},"starter":false,"kind":"drum","level":0.030109795203187142,"peak":0.7511022513864939,"songOrigin":"library","songSourceId":"hatsVoice"},"ohatsVoice":{"label":"=909 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open partner to =909 Hat: the same bright attack opening into a controlled metallic wash instead of a long cymbal tail.","noise":{"type":"highpass","freq":7600,"to":5200,"sweep":0.35,"Q":1.2,"decay":0.88,"gain":1,"hold":0.022},"drive":0.217597,"starter":false,"kind":"drum","level":0.11808847760348713,"peak":0.8463253356990921,"songOrigin":"library","songSourceId":"ohatsVoice"},"tomVoice":{"label":"=909 Tom","category":"Tom","homeLane":"tom","dur":1,"note":"A tuned 909-style tom with a clean electronic pitch fall and a small low skin click at the front of the note.","osc":{"type":"sine","from":260,"to":125,"sweep":0.08,"decay":0.34,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":1500,"Q":0.8,"decay":0.025,"gain":0.2},"drive":0.120223,"id":"ds909Tom","kind":"drum","factory":true,"level":0.039082,"peak":0.7026},"rimVoice":{"label":"Synth Shaker","category":"Perc","homeLane":"rim","dur":0.5,"note":"The one drum here with an ATTACK: the noise fades in over twenty milliseconds, which is the whole difference between a shaker and a hat.","noise":{"type":"bandpass","freq":6300,"Q":1.4,"attack":0.018,"decay":0.05,"gain":1},"id":"dsShaker","kind":"drum","factory":true,"level":0.017053,"peak":0.5496},"rim2Voice":{"label":"Tambourine","category":"Perc","homeLane":"rim","dur":1,"note":"Bright, jangly and slightly longer, with a touch of pitch in it.","osc":{"type":"square","from":900,"to":780,"sweep":0.05,"decay":0.05,"gain":0.12},"noise":{"type":"highpass","freq":5200,"Q":0.6,"decay":0.14},"id":"tambourine","kind":"drum","factory":true,"level":0.032351,"peak":0.9308},"rim3Voice":{"label":"=808 Cowbell","category":"Perc","homeLane":"tom","dur":1,"note":"The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares through a 1.3 kHz bandpass, with a 200ms exponential VCA cut-off.","metal":{"wave":"square","freq":540,"ratios":[1,1.481481],"spread":1,"count":2,"filter":"bandpass","hp":1300,"Q":4,"slope":-12,"attack":0,"decay":0.2,"floor":0.001,"hardStop":true,"resonator":{"feedback":0.96,"drive":1.4,"leak":0.0005}},"id":"ds808Cowbell","kind":"drum","factory":true,"level":0.02003,"peak":0.4688},"tom2Voice":{"label":"Conga · Mid","category":"Perc","homeLane":"tom","dur":1,"note":"A centered open conga with a warm falling body and a little shell noise on the front, designed to answer the high and low voices cleanly.","osc":{"type":"sine","from":285,"to":205,"sweep":0.045,"decay":0.32,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":1700,"Q":0.65,"decay":0.022,"gain":0.3},"drive":0.098995,"id":"congaMid","kind":"drum","factory":true,"level":0.03776,"peak":0.686},"crash2Voice":{"label":"909 Lo-Fi Ride","category":"Crash","homeLane":"crash","dur":4,"note":"A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is half of why the sound is recognisable, so the crush is doing the work here that the filter sweeps do on the 808 presets.","ring":{"freq":2500,"Q":70,"hit":0.0018,"decay":0.25,"gain":0.6},"metal":{"wave":"square","freq":780,"count":6,"spread":1.12,"filter":"highpass","hp":5400,"Q":0.8,"slope":-24,"attack":0.004,"decay":1.6,"sag":0.3,"sagAt":0.06,"gain":0.55},"drive":0.6,"shape":"crush","tone":{"type":"lowpass","freq":9500,"Q":0.7},"humanize":{"gain":0.03},"id":"ride909SixBit","kind":"drum","factory":true,"level":0.053247,"peak":1.0339},"bassVoice":{"label":"Organ Bass","category":"Bass","synth":"MRDR-3","dur":0.6,"note":"The house and garage organ bass: a sine at the note, a square an octave up behind a low filter for the reedy edge, and a third-harmonic click that speaks only on the strike. Round, short and punchy, so it bounces rather than holds.","layer":{"osc1":{"type":"sine","ratio":1,"gain":1,"attack":0.002,"decay":0.5,"sustain":0.35,"release":0.06},"osc2":{"type":"square","ratio":2,"gain":0.3,"attack":0.002,"decay":0.3,"sustain":0.2,"release":0.05,"filter":{"type":"lowpass","slope":-12,"freq":900,"Q":0.7,"track":0.3}},"osc3":{"type":"sine","ratio":3,"gain":0.35,"attack":0.001,"decay":0.05,"sustain":0,"release":0.03}},"global":{"vca":{"attack":0.002,"decay":0.45,"sustain":0.4,"release":0.06}},"drive":0.131265,"shape":"soft","mode":"mono","id":"mrdrOrganBass","kind":"tone","factory":true,"level":0.065672,"peak":0.8376},"bass2Voice":{"label":"Sub Sine","category":"Bass","kind":"tone","synth":"CRLS-1","dur":2.2,"note":"Pure weight, no harmonics. Wants room underneath it and a lead up top.","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.012,"decay":0.3,"sustain":0.8,"release":0.4}},"id":"stSubSine","starter":true,"factory":true,"level":0.11677,"peak":0.6891},"chords2Voice":{"label":"Soft Ambient Pad","category":"Pad","synth":"TNGR-2","dur":6,"note":"A soft low-motion warm pad for ambience and dialogue beds.","tngr2":{"oscA":{"table":"warmHarmonics","position":0.15,"envAmount":0.22,"level":0.78,"unison":2,"spread":12},"oscB":{"table":"choirBreath","position":0.32,"envAmount":0.3,"level":0.22,"unison":2,"spread":9,"interval":12},"amp":{"attack":0.011,"decay":1.5,"sustain":0.82,"release":2.4},"positionEnv":{"attack":1.4,"decay":2.6,"sustain":0.5},"filter":{"type":"lowpass","cutoff":3600,"resonance":1.44},"filterEnv":{"amount":0.8,"attack":1.2,"decay":2,"sustain":0.4},"master":{"gain":0.6}},"id":"tngrCloudMemory","kind":"tone","factory":true,"level":0.045693,"peak":0.379},"leadVoice":{"label":"Electric Grand","category":"Keys","synth":"MRDR-3","dur":2.2,"note":"The CP-70: real strings on a pickup, so a thinner body, a brighter strike and the chorus it was always played through.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.789,"attack":0.001,"decay":2.2,"sustain":0,"release":0.3,"unison":2,"spread":6,"stereo":0.5,"filter":{"type":"lowpass","slope":-12,"freq":900,"Q":0.8,"track":0.9,"env":{"octaves":2.5,"attack":0.001,"decay":0.25,"sustain":0,"release":0.2}}},"osc2":{"type":"triangle","ratio":0.5,"gain":0.155,"attack":0.001,"decay":1.2,"sustain":0,"release":0.25,"detune":8},"osc3":{"type":"noise","ratio":1,"gain":0.151,"color":"white","attack":0.001,"decay":0.04,"sustain":0,"release":0.02,"filter":{"type":"bandpass","slope":-12,"freq":2400,"Q":1.2,"track":0.4},"detune":0}},"humanize":{"entry":0,"gain":0},"chorus":{"mix":0,"rate":0.6,"depth":0.54,"width":1},"id":"mrdrElectricGrand","kind":"tone","factory":true,"level":0.044228,"peak":0.6441},"lead2Voice":{"label":"Vocal Oh","category":"Pad","synth":"MRDR-3","dur":3,"note":"One voice singing \"oh\": a saw through the two formants of that vowel, 450 Hz and 800 Hz, with breath on the front and a singer's late, slow vibrato. The euphoric drop's \"ohhh\" when there is no sample to chop.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.9,"attack":0.06,"decay":0.6,"sustain":0.85,"release":0.35,"unison":2,"spread":6,"stereo":0.3,"filter":{"type":"bandpass","slope":-12,"freq":450,"Q":4,"track":0}},"osc2":{"type":"sawtooth","ratio":1,"gain":0.55,"detune":-4,"attack":0.07,"decay":0.6,"sustain":0.85,"release":0.35,"filter":{"type":"bandpass","slope":-12,"freq":800,"Q":5,"track":0}},"osc3":{"type":"noise","ratio":1,"gain":0.05,"color":"pink","attack":0.02,"decay":0.25,"sustain":0.15,"release":0.2,"filter":{"type":"bandpass","slope":-12,"freq":2600,"Q":1.5,"track":0}}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":3200,"Q":0.6,"track":0.3},"vca":{"attack":0.06,"decay":0.6,"sustain":0.9,"release":0.4}},"humanize":{"entry":0.01,"pitch":0.002313,"gain":0.05},"vibrato":{"depth":0.2,"rate":5.4,"delay":0.35,"spread":0.3},"id":"mrdrVocalOh","kind":"tone","factory":true,"level":0.021763,"peak":0.2586},"lead3Voice":{"label":"Ice Bell","category":"Bells","synth":"TNGR-2","dur":3,"note":"Sparse crystal partials with a long decay and controlled high notes.","tngr2":{"oscA":{"table":"bellFold","position":0.84,"envAmount":-0.2,"level":0.76},"oscB":{"table":"crystal","position":0.65,"level":0.16,"interval":12,"envAmount":0},"amp":{"attack":0.001,"decay":1.7,"sustain":0.03,"release":0.9},"positionEnv":{"attack":0,"decay":1.278,"sustain":0.17},"filter":{"type":"lowpass","cutoff":13180,"resonance":1.2},"master":{"gain":0.5},"filterEnv":{"decay":0.356,"attack":0.007}},"id":"tngrIceBell","kind":"tone","factory":true,"level":0.026608,"peak":0.4184},"lead4Voice":{"label":"House Organ Stab","category":"Organ","homeLane":"chords","synth":"MRDR-3","dur":0.6,"note":"The house-music organ chord: two square drawbars an octave apart and a sine pip a twelfth up that speaks only on the strike, a filter that flashes open and closes again, and no sustain at all, so every off-beat stab stops before the next.","layer":{"osc1":{"type":"square","ratio":1,"gain":0.55,"attack":0.002,"decay":0.35,"sustain":0,"release":0.08},"osc2":{"type":"square","ratio":2,"gain":0.4,"attack":0.002,"decay":0.28,"sustain":0,"release":0.07},"osc3":{"type":"sine","ratio":3,"gain":0.35,"attack":0.001,"decay":0.09,"sustain":0,"release":0.04}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":2600,"Q":0.8,"track":0.5,"env":{"octaves":1.4,"attack":0.001,"decay":0.14,"sustain":0,"release":0.06}},"vca":{"attack":0.002,"decay":0.38,"sustain":0,"release":0.08}},"humanize":{"entry":0.003,"gain":0.05},"id":"mrdrHouseOrganStab","kind":"tone","factory":true,"level":0.023594,"peak":0.7484},"lead6Voice":{"label":"Sung Choir Ooh","category":"Pad","synth":"JMJR-4","dur":8,"note":"Two singers on ooh, rounder and darker than the aah beside it.","jmjr4":{"voice":"announcer","line":"ooh","unison":2,"spread":20,"amp":{"attack":0.09,"decay":0.2,"sustain":1,"release":0.5}},"vibrato":{"depth":0.21,"rate":5,"delay":0.15},"id":"jmjrChoirOoh","kind":"tone","factory":true,"level":0.0335,"peak":0.1928},"lead7Voice":{"label":"Tine Electric Piano","category":"Keys","synth":"RMND-2","dur":2.8,"note":"A 7:1 operator for the tine's ping, gone in an eighth of a second, over a sine that holds a little. The Rhodes end of \"piano\".","options":{"harmonicity":7,"modulationIndex":2.4,"oscillator":{"type":"sine"},"modulation":{"type":"sine"},"envelope":{"attack":0.002,"decay":2.8,"sustain":0.1,"release":0.7},"modulationEnvelope":{"attack":0.001,"decay":0.12,"sustain":0.08,"release":0.3}},"id":"rmndTineEP","kind":"tone","factory":true,"level":0.030054,"peak":0.2206},"lead8Voice":{"label":"Vocal Oh","category":"Pad","synth":"MRDR-3","dur":3,"note":"One voice singing \"oh\": a saw through the two formants of that vowel, 450 Hz and 800 Hz, with breath on the front and a singer's late, slow vibrato. The euphoric drop's \"ohhh\" when there is no sample to chop.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.9,"attack":0.06,"decay":0.6,"sustain":0.85,"release":0.35,"unison":2,"spread":6,"stereo":0.3,"filter":{"type":"bandpass","slope":-12,"freq":450,"Q":4,"track":0}},"osc2":{"type":"sawtooth","ratio":1,"gain":0.55,"detune":-4,"attack":0.07,"decay":0.6,"sustain":0.85,"release":0.35,"filter":{"type":"bandpass","slope":-12,"freq":800,"Q":5,"track":0}},"osc3":{"type":"noise","ratio":1,"gain":0.05,"color":"pink","attack":0.02,"decay":0.25,"sustain":0.15,"release":0.2,"filter":{"type":"bandpass","slope":-12,"freq":2600,"Q":1.5,"track":0}}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":3200,"Q":0.6,"track":0.3},"vca":{"attack":0.06,"decay":0.6,"sustain":0.9,"release":0.4}},"humanize":{"entry":0.01,"pitch":0.002313,"gain":0.05},"vibrato":{"depth":0.2,"rate":5.4,"delay":0.35,"spread":0.3},"id":"mrdrVocalOh","kind":"tone","factory":true,"level":0.021763,"peak":0.2586},"crashVoice":{"label":"Blast · Impact","category":"Crash","homeLane":"crash","dur":4,"note":"The game’s impact crash: the shorter cousin of the boom, a lowpass falling from 6 kHz to 260 in two thirds of a second over a quick sine thud. A crash you can play every bar.","osc":{"type":"sine","from":145,"to":38,"sweep":0.3,"decay":0.063,"curve":"exp","gain":0.55},"noise":{"type":"lowpass","freq":6200,"to":260,"sweep":1.992,"Q":0.7,"attack":0.008,"decay":1.662,"sag":0.45,"sagAt":0.15,"gain":1},"ring":{"type":"highpass","freq":3600,"Q":0.7,"hit":0.045,"decay":0.045,"gain":0.75},"starter":false,"kind":"drum","level":0.06625496016383212,"peak":0.820325102621769,"songOrigin":"library","songSourceId":"crashVoice"}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { eq: { low: 1 } },
    snare: { gain: -1, send: { reverb: 0.2 } },
    clap: { gain: -2, send: { reverb: 0.25 } },
    hats: { gain: -4.4, pan: 0.2 },
    ohats: { gain: -6, pan: -0.2 },
    crash: { gain: 3.84, pan: 0.2, send: { reverb: 0.9 }, eq: { high: 2.7 } },
    tom: { gain: -5, pan: 0.2, send: { reverb: 0.3 } },
    rim: { gain: -14, pan: -0.3 },
    rim2: { gain: -9.52, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -9.52, pan: 0.323, send: { reverb: 0.869 } },
    tom2: { gain: -8, pan: -0.2, send: { reverb: 0.15 }, eq: { low: -2.4 } },
    crash2: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -2 },
    bass2: { gain: -12 },
    chords: { gain: -5.4, pan: -0.1, send: { delay: 0.021, reverb: 0.3 } },
    chords2: { gain: -10, send: { reverb: 0.5 }, eq: { low: -5 } },
    lead: { gain: -2, pan: -0.05, send: { delay: 0.052, reverb: 0.3 }, eq: { high: 0.5 } },
    lead2: { gain: -1.1, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead3: { gain: -4.7, pan: 0.2, send: { delay: 0.063, reverb: 0.45 } },
    lead4: { gain: -4.2, send: { reverb: 0.25 }, eq: { low: -3 } },
    lead5: { gain: -8.3, pan: -0.25, send: { delay: 0.02, reverb: 0.2 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    lead6: { gain: -7, send: { reverb: 0.5 }, effects: [{ id: "widener" }] },
    lead7: { gain: -7, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -6.6, pan: 0.15, send: { delay: 0.073, reverb: 0.4 } },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  swing: 60,
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
    __master: {
      fx: [
        {
          from: [8,0],
          to: [9,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "highpass",
                frequency: 150,
                Q: 1.2,
                sweep: 1,
                sweepTo: 6000,
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
                slice: 0,
                retrigger: 0,
                fade: 0,
                stop: 1,
              },
            },
          ],
        },
      ],
    },
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
