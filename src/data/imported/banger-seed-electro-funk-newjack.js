// BOOGIE · NEW JACK SWING SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Boogie · New Jack Swing's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-electro-funk-newjack";
export const title = "BOOGIE · NEW JACK SWING SEED";
export const slug = "banger-seed-electro-funk-newjack";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 104,
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
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,null,null],
      bass: seq('F1 . . F1 . . F2 . F1 . . C2 . F1 D#2 . | F1 . . F1 . . F2 . F1 . . C2 . . . .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,null,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead5: seq('A4 . C5 F5 . C5 A5 . F5 . C5 F5 . C5 A5 . | A4 . C5 F5 . C5 A5 . F5 . C5 F5 . . . .'),
      lead5Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('F1 . . F1 . . F2 . F1 . . C2 . F1 D#2 . | F1 . . F1 . . F2 . F1 . . C2 . F1 D#2 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . A1 . . E2 . A1 G2 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 . C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('D3min . . . . . . . . . . D3min . . . . | D3min . . . . . . . . . . D3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('D3min . . . . . . . . . . D3min . . . . | D3min . . . . . . . . . . D3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('A1 . . A1 . . A2 . A1 . . E2 . A1 G2 . | F1 . . F1 . . F2 . F1 . . C2 . F1 D#2 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [[130.8127826502993,164.81377845643496,220],null,null,null,null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,220],null,null,null,null,[130.8127826502993,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[130.8127826502993,174.61411571650194,220],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . A1 . . E2 . A1 G2 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 . C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [[146.8323839587038,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220],null,null,null,null,[146.8323839587038,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[138.59131548843604,164.81377845643496,220],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('D3min . . . . . . . . . . D3min . . . . | D3min . . . . . . . . . . D3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('F1 . . F1 . . F2 . F1 . . C2 . F1 D#2 . | F1 . . F1 . . F2 . F1 . . C2 . F1 D#2 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [[130.8127826502993,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[130.8127826502993,174.61411571650194,220],null,null,null,null,[130.8127826502993,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[130.8127826502993,174.61411571650194,220],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('D3min . . . . . . . . . . D3min . . . . | D3min . . . . . . . . . . D3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . A1 . . E2 . A1 G2 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [[146.8323839587038,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220],null,null,null,null,[146.8323839587038,174.61411571650194,220],null,null,null,null,null,null,null,null,null,null,[138.59131548843604,164.81377845643496,220],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[493.8833012561241,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[174.61411571650194,261.6255653005986,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,523.2511306011972,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[493.8833012561241,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . D2 . . A2 . D2 C3 .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,440],null,[246.94165062806206,311.1269837220809,369.9944227116344,440],null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,2,null,2,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344,440],null,null,null,null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,null,null],
      bass: seq('D2 . . D2 . . D3 . D2 . . A2 . D2 C3 . | D2 . . D2 . . D3 . A1 . . B2 . . . .'),
      bassLen: [1,null,null,1,null,null,1,null,1,null,null,1,null,1,1,null,1,null,null,1,null,null,1,null,1,null,null,1,null,null,null,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . B0 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead5: seq('A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 | A5 F5 D5 A4 A5 F5 D5 A4 A5 E5 D#5 A4 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('E3min . . . . . . . . . . E3min . . . . | E3min . . . . . . . . . . E3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('E3min . . . . . . . . . . E3min . . . . | E3min . . . . . . . . . . E3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,369.9944227116344,440,493.8833012561241],null,null,null,[293.6647679174076,369.9944227116344,440,493.8833012561241],null,null,null,null,[293.6647679174076,369.9944227116344,440,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,440,493.8833012561241],null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [[146.8323839587038,184.9972113558172,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,246.94165062806206],null,null,null,null,[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . C1 . C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,246.94165062806206],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('E3min . . . . . . . . . . E3min . . . . | E3min . . . . . . . . . . E3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: chordSeq('E3min . . . . . . . . . . E3min . . . . | E3min . . . . . . . . . . E3min . . . .'),
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null],
      chordsLen: [null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null,null,null,1,null,null,null,2,null,null,null,null,1,null,null,1,null],
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
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,246.94165062806206],null,null,null,null],
      lead8Len: [2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . . . C1 . C1 . . . C1 . | . . C1 . . . . . C1 . C1 . . . C1 .').map((v) => !!v),
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
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . C1 . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 10,
  "style": "electro-funk-newjack",
  "flavour": "newjack",
  "options": {
    "style": "electro-funk",
    "mood": "moody",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 108,
    "hook": "auto",
    "combo": null,
    "flavour": "newjack",
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
    "styleId": "electro-funk-newjack",
    "moodId": "moody",
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
      "preset": "snareFat",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "clapRoom",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "hats",
      "part": "part:hats",
      "preset": "simple808StyleHat",
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
      "preset": "crash808Long",
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
      "preset": "mrdrSynthSlap",
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
      "preset": "rmndDxPiano",
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
      "preset": "syncWireClav",
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
      "preset": "mrdrFunkGuitarMuted",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:choir",
      "preset": "jmjrChoirAah",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
      "part": "part:third",
      "preset": "rmndDxPiano",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "mrdrOrchHit",
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
      "style": "Boogie · New Jack Swing",
      "mood": "moody",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 104,
      "seconds": 148,
      "variation": "some",
      "hook": "Grand"
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
        "base": 1,
        "before": 1,
        "after": 0.9,
        "move": -0.1,
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
        "base": -1,
        "before": -1,
        "after": -2.7,
        "move": -1.7,
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
        "from": "Boogie's own · hats · DS Closed Hat, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -7.4,
        "move": -4.4,
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
        "from": "Boogie's own · crash · Cymbal · 808 CY, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -8.5,
        "move": 1.5,
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
        "from": "Boogie's own · cowbell · TR-808 Cowbell · Classic, bars 45–52",
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
        "from": "Boogie's own · bass · Synth Slap, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -3.1,
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
        "from": "Boogie's own · sub · Sub Sine (starter), bars 45–52",
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
        "from": "Boogie's own · piano · Sync Wire Clav, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -2.5,
        "move": 2.5,
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
        "from": "Boogie's own · pad · Soft Strings, bars 1–4",
        "base": -10,
        "before": -10,
        "after": -12.2,
        "move": -2.2,
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
        "after": -3,
        "move": -3,
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
        "after": -13.9,
        "move": -7.9,
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
        "from": "Boogie's own · megaSaw · Brass Section, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -7.4,
        "move": 1.6,
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
        "from": "BIG-ROOM HOUSE SEED · arp · Crystal Trigger, bars 45–52",
        "base": -10.5,
        "before": -10.5,
        "after": -11,
        "move": -0.5,
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
        "after": -7.7,
        "move": -0.7,
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
        "from": "Boogie's own · counter · Horn Section Stab, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -11,
        "move": -5,
        "window": [
          44,
          51
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
          "gain": -4.5,
          "send": {
            "delay": 0.2,
            "reverb": 0.3
          },
          "pan": 0,
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
        "voice": "snareFat",
        "voiceParams": null,
        "strip": {
          "gain": 0.9,
          "effects": [
            {
              "id": "reverb",
              "params": {
                "decay": 1.8,
                "preDelay": 0.005,
                "wet": 0.5
              }
            },
            {
              "id": "noisegate",
              "params": {
                "threshold": -34,
                "attack": 0.002,
                "release": 0.08
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "CLAP",
        "voice": "clapRoom",
        "voiceParams": null,
        "strip": {
          "gain": -2.7,
          "effects": [
            {
              "id": "reverb",
              "params": {
                "decay": 1.8,
                "preDelay": 0.005,
                "wet": 0.5
              }
            },
            {
              "id": "noisegate",
              "params": {
                "threshold": -34,
                "attack": 0.002,
                "release": 0.08
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "hats",
        "lane": "hats",
        "label": "HATS",
        "voice": "simple808StyleHat",
        "voiceParams": null,
        "strip": {
          "gain": -7.4,
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
        "voice": "crash808Long",
        "voiceParams": null,
        "strip": {
          "gain": -8.5,
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
        "label": "SYNTH SLAP · Synth Slap",
        "voice": "mrdrSynthSlap",
        "voiceParams": null,
        "strip": {
          "gain": -3.1
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
          "gain": -16
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "FM PIANO · FM Piano",
        "voice": "rmndDxPiano",
        "voiceParams": null,
        "strip": {
          "gain": -2.5,
          "pan": -0.1,
          "send": {
            "reverb": 0.3
          }
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
          "gain": -12.2,
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
        "role": "square",
        "lane": "lead2",
        "label": "HOOK DOUBLE · Sync Wire Clav",
        "voice": "syncWireClav",
        "voiceParams": null,
        "strip": {
          "gain": -3,
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
          "gain": -13.9,
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
          "gain": -7.4,
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
        "role": "choir",
        "lane": "lead6",
        "label": "CHOIR · Sung Choir Aah",
        "voice": "jmjrChoirAah",
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
        "label": "THIRD BELOW · FM Piano",
        "voice": "rmndDxPiano",
        "voiceParams": null,
        "strip": {
          "gain": -7.7,
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
        "label": "ORCH HIT · Orchestra Hit",
        "voice": "mrdrOrchHit",
        "voiceParams": null,
        "strip": {
          "gain": -11,
          "send": {
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
        "production": "181c5976"
      },
      "kick": {
        "notes": "ee76efc3",
        "voice": "b38f6af9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "bac9100",
        "voice": "73b0da2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "7339949e"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "e8d9ed1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "7339949e"
      },
      "hats": {
        "notes": "d5a9cd05",
        "voice": "5a9a0752",
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
        "voice": "8c1df3f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "fill": {
        "notes": "8bfd060c",
        "voice": "352acb51",
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
        "notes": "836b4bd",
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
      "ride": {
        "notes": "121261bd",
        "voice": "2371fa8d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "8e82587f",
        "voice": "6d9b30eb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "3e566021",
        "voice": "94966028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "afb7c320",
        "voice": "70ed5af2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "pad": {
        "notes": "f5f59445",
        "voice": "8fe72f42",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19b0da9a"
      },
      "square": {
        "notes": "9871906e",
        "voice": "84a53cc",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5327d298"
      },
      "bell": {
        "notes": "1cca66aa",
        "voice": "3e86c2d8",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "b22ea12a",
        "voice": "b7854edb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "arp": {
        "notes": "4d36b704",
        "voice": "2526ea06",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "59ba867a"
      },
      "choir": {
        "notes": "60260324",
        "voice": "6db7d0b4",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "ad244c0d",
        "voice": "70ed5af2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "254c6257",
        "voice": "f4162bfa",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19b0da9a"
      }
    },
    "master": "f52c1fee"
  },
  "seedOf": "electro-funk-newjack",
  "made": "2026-10-08T16:41:39.396Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","rim","rim2","rim3","tom2","crash2","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom2":"PERC Congas","crash2":"RIDE","bass":"SYNTH SLAP · Synth Slap","bass2":"SUB · Sub Sine","chords":"FM PIANO · FM Piano","chords2":"PAD · Warm Strings","lead":"RIFF Grand · HOOK","lead2":"HOOK DOUBLE · Sync Wire Clav","lead3":"HOOK 8VA · Celesta","lead4":"LEAD 8VA · Brass Section","lead5":"ARP · Funk Guitar · Muted","lead6":"CHOIR · Sung Choir Aah","lead7":"THIRD BELOW · FM Piano","lead8":"ORCH HIT · Orchestra Hit"},
  voice: {"kickVoice":"ds808Kick","snareVoice":"snareFat","clapVoice":"clapRoom","hatsVoice":"simple808StyleHat","ohatsVoice":"ds808OpenHat","crashVoice":"crash808Long","tomVoice":"ds808Tom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"tr808CowbellClassic","tom2Voice":"congaMid","crash2Voice":"ride909SixBit","bassVoice":"mrdrSynthSlap","bass2Voice":"stSubSine","chordsVoice":"rmndDxPiano","chords2Voice":"tngrWarmStrings","leadVoice":"mrdrElectricGrand","lead2Voice":"syncWireClav","lead3Voice":"tngrCelesta","lead4Voice":"tngrBrassSection","lead5Voice":"mrdrFunkGuitarMuted","lead6Voice":"jmjrChoirAah","lead7Voice":"rmndDxPiano","lead8Voice":"mrdrOrchHit"},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    snare: { gain: 0.9, effects: [{ id: "reverb", params: { decay: 1.8, preDelay: 0.005, wet: 0.5 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.08 } }] },
    clap: { gain: -2.7, effects: [{ id: "reverb", params: { decay: 1.8, preDelay: 0.005, wet: 0.5 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.08 } }] },
    hats: { gain: -7.4, pan: -0.2 },
    ohats: { gain: -8, pan: 0.2 },
    crash: { gain: -8.5, pan: 0.2, send: { reverb: 0.5 } },
    tom: { gain: -6, pan: 0.25, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -12, pan: 0.3 },
    tom2: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    crash2: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -3.1 },
    bass2: { gain: -16 },
    chords: { gain: -2.5, pan: -0.1, send: { reverb: 0.3 } },
    chords2: { gain: -12.2, send: { reverb: 0.4 }, eq: { low: -4 } },
    lead: { gain: -4.5, send: { delay: 0.2, reverb: 0.3 }, eq: { high: 0.5 } },
    lead2: { gain: -3, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead3: { gain: -13.9, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead4: { gain: -7.4, pan: -0.1, send: { reverb: 0.3 } },
    lead5: { gain: -11, pan: -0.25, send: { delay: 0.2, reverb: 0.2 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    lead6: { gain: -10, send: { reverb: 0.5 } },
    lead7: { gain: -7.7, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -11, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
  swing: 62,
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
