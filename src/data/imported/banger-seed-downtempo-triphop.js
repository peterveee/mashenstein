// DOWNTEMPO · TRIP-HOP SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Downtempo · Trip-Hop's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-downtempo-triphop";
export const title = "DOWNTEMPO · TRIP-HOP SEED";
export const slug = "banger-seed-downtempo-triphop";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 86,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
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
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: chordSeq('F3maj7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null],
      bass: seq('F1 . . . . . . . . . . . F1 . . . | F1 . . . . . . . . . . . . . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      lead5: seq('A4 . C5 . F5 . C5 . A4 . F5 . A5 . F5 . | A4 . C5 . F5 . C5 . A4 . F5 . . . . .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: chordSeq('F3maj7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('F1 . . . . . . . . . . . F1 . . . | F1 . . . . . . . . . . . F1 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,[220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . A1 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: chordSeq('A3min . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,440],null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('A1 . . . . . . . . . . . A1 . . . | F1 . . . . . . . . . . . F1 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('A1 . . . . . . . A1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,[220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . A1 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: chordSeq('F3maj7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('F1 . . . . . . . . . . . F1 . . . | F1 . . . . . . . . . . . F1 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,[220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . A1 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,195.99771799087463,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[233.08188075904496,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,195.99771799087463,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,195.99771799087463,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[233.08188075904496,349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,195.99771799087463,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[466.1637615180899,698.4564628660078,880,1174.6590716696303],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . D2 . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . D2 . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [10,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      lead5: seq('A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 | A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7 | A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7 | A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . A#4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[880,1760],null,[1046.5022612023945,2093.004522404789],null,[1318.5102276514797,2637.02045530296],null,[1046.5022612023945,2093.004522404789],null,[880,1760],null,null,null,[783.9908719634985,1567.981743926997],null,[932.3275230361799,1864.6550460723597],null,[698.4564628660078,1396.9129257320155],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[880,1760],null,null,null,[783.9908719634985,1567.981743926997],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: chordSeq('A3min . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,440],null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 . | F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('A1 . . . . . . . A1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 C5 E5 A5 C6 E6 A6 C7 A4 C5 E5 A5 C6 E6 A6 C7 | A4 C5 F5 A5 C6 F6 A6 C7 A4 C5 F5 A5 C6 F6 A6 C7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[329.6275569128699,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[440,880],null,null,null,[329.6275569128699,659.2551138257398],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,[220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . A1 . A2 . A1 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7 | A4 D5 F5 A5 D6 F6 A6 D7 A4 C#5 E5 A5 C#6 E6 A6 C#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . F4 . . . C#4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7 | A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[698.4564628660078,1396.9129257320155],null,[880,1760],null,[1046.5022612023945,2093.004522404789],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[698.4564628660078,1396.9129257320155],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[880,1760],null,null,null,[783.9908719634985,1567.981743926997],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: chordSeq('F3maj7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 . | F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 C5 F5 A5 C6 F6 A6 C7 A4 C5 F5 A5 C6 F6 A6 C7 | A4 C5 F5 A5 C6 F6 A6 C7 A4 C5 F5 A5 C6 F6 A6 C7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: chordSeq('F4maj7 . . . . . . . . . . . . . . . | F4maj7 . . . . . . . . . . . . . . .'),
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[698.4564628660078,1396.9129257320155],null,null,null,[659.2551138257398,1318.5102276514797],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7 | A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[880,1760],null,[698.4564628660078,1396.9129257320155],null,[587.3295358348151,1174.6590716696303],null,null,null,[523.2511306011972,1046.5022612023945],null,[659.2551138257398,1318.5102276514797],null,[587.3295358348151,1174.6590716696303],null,null,null,[440,880],null,null,null,[440,880],null,null,null,[329.6275569128699,659.2551138257398],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,[220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,[261.6255653005986,293.6647679174076,329.6275569128699,349.2282314330039,440],null,null,null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      bass: seq('D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . A1 . A2 . A1 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      lead5: seq('A4 D5 F5 A5 D6 F6 A6 D7 A4 D5 F5 A5 D6 F6 A6 D7 | A4 D5 F5 A5 D6 F6 A6 D7 A4 C#5 E5 A5 C#6 E6 A6 C#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972,587.3295358348151,659.2551138257398],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . F4 . . . C#4 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      crash: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      chords2: [[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 10,
  "style": "downtempo-triphop",
  "flavour": "triphop",
  "options": {
    "style": "downtempo",
    "mood": "dark",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 94,
    "hook": "auto",
    "combo": null,
    "flavour": "triphop",
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
      "source": "replace",
      "kit": "style",
      "crashes": false,
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
    "styleId": "downtempo-triphop",
    "moodId": "dark",
    "parts": {
      "riff:hook": [
        {
          "id": "mrdrMutedTrumpet",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrVibraphone",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "rmndTineEP",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrClarinet",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "wndrFeltPiano",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrCello",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrShakuhachi",
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
      "preset": "fatKick",
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
      "preset": "snareFat",
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
      "preset": "hatOpen",
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
      "preset": "ds808Cowbell",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom2",
      "part": "part:congas",
      "preset": "congaLow",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "crash",
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
      "part": "part:piano",
      "preset": "rmndTineEP",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "tngrSoftStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "cryptTheremin",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:bell",
      "preset": "mrdrVibraphone",
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
      "preset": "mrdrVibraphone",
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
      "preset": "mrdrVibraphone",
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
    "fill": "tom",
    "shaker": "rim",
    "tambourine": "rim2",
    "cowbell": "rim3",
    "congas": "tom2",
    "ride": "crash",
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
      "style": "Downtempo · Trip-Hop",
      "mood": "dark",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 86,
      "seconds": 179,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Downtempo's own · kick · =909 Kick, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 2.7,
        "move": 2.7,
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
        "from": "Downtempo's own · snare · Fat Snare, bars 45–52",
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
        "lane": "clap",
        "job": "clap",
        "how": "sound",
        "from": "Downtempo's own · clap · Fat Snare, bars 45–52",
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
        "lane": "hats",
        "job": "hats",
        "how": "sound",
        "from": "Downtempo's own · hats · DS Closed Hat, bars 45–52",
        "base": -7,
        "before": -7,
        "after": -8.7,
        "move": -1.7,
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
        "from": "Downtempo's own · ohats · DS Open Hat, bars 45–52",
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
        "lane": "tom",
        "job": "fill",
        "how": "sound",
        "from": "Downtempo's own · fill · DS Tom, bars 52–59",
        "base": -4,
        "before": -4,
        "after": -4.9,
        "move": -0.9,
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
        "from": "Downtempo's own · shaker · Shaker, bars 45–52",
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
        "job": "tambourine",
        "how": "sound",
        "from": "Downtempo's own · tambourine · Tambourine, bars 45–52",
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
        "after": -8.5,
        "move": -0.5,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "crash",
        "job": "ride",
        "how": "sound",
        "from": "Downtempo's own · ride · Ride · 909 Six-Bit, bars 45–52",
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
        "from": "Downtempo's own · bass · Round Bass, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 6,
        "move": 6,
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
        "from": "Downtempo's own · sub · Sub Sine (starter), bars 45–52",
        "base": -14,
        "before": -14,
        "after": -14,
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
        "from": "Downtempo's own · piano · Tine Electric Piano, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -6.9,
        "move": -0.9,
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
        "from": "Downtempo's own · pad · Warm Strings, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -1.7,
        "move": 1.3,
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
        "before": -5,
        "after": -4.5,
        "move": 0.5,
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
        "from": "BIG-ROOM HOUSE SEED · megaSaw · Mega Saw Lead, bars 45–52",
        "base": -5.5,
        "before": -6,
        "after": -8.9,
        "move": -2.9,
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
        "from": "Downtempo's own · third · Tine Electric Piano, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -6.9,
        "move": 1.1,
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
        "from": "Downtempo's own · counter · Vibraphone, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -5.6,
        "move": 0.4,
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
          "gain": -2,
          "send": {
            "delay": 0.3,
            "reverb": 0.6
          },
          "pan": 0.15,
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
        "voice": "fatKick",
        "voiceParams": null,
        "strip": {
          "gain": 2.7,
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 10,
                "downsample": 3,
                "wet": 0.45
              }
            },
            {
              "id": "tape",
              "params": {
                "drive": 8,
                "bias": 0.1,
                "tone": 6000,
                "wow": 0.2,
                "flutter": 0.1,
                "wet": 0.7
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "BREAK",
        "voice": "snareFat",
        "voiceParams": null,
        "strip": {
          "gain": 0,
          "send": {
            "reverb": 0.2
          },
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 10,
                "downsample": 3,
                "wet": 0.45
              }
            },
            {
              "id": "tape",
              "params": {
                "drive": 8,
                "bias": 0.1,
                "tone": 6000,
                "wow": 0.2,
                "flutter": 0.1,
                "wet": 0.7
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "SNARE Break",
        "voice": "snareFat",
        "voiceParams": null,
        "strip": {
          "gain": -1,
          "send": {
            "reverb": 0.2
          },
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 10,
                "downsample": 3,
                "wet": 0.45
              }
            },
            {
              "id": "tape",
              "params": {
                "drive": 8,
                "bias": 0.1,
                "tone": 6000,
                "wow": 0.2,
                "flutter": 0.1,
                "wet": 0.7
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
        "voice": "hatEngine",
        "voiceParams": null,
        "strip": {
          "gain": -8.7,
          "pan": 0.2,
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 10,
                "downsample": 3,
                "wet": 0.45
              }
            },
            {
              "id": "tape",
              "params": {
                "drive": 8,
                "bias": 0.1,
                "tone": 6000,
                "wow": 0.2,
                "flutter": 0.1,
                "wet": 0.7
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "hatOpen",
        "voiceParams": null,
        "strip": {
          "gain": -6.2,
          "pan": 0.2
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
          "gain": -4.9,
          "pan": 0.3,
          "send": {
            "reverb": 0.35
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
          "gain": -12,
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
          "gain": -10,
          "pan": -0.3
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
        "voice": "congaLow",
        "voiceParams": null,
        "strip": {
          "gain": -8.5,
          "pan": -0.2,
          "send": {
            "reverb": 0.15
          }
        },
        "noteFX": null
      },
      {
        "role": "ride",
        "lane": "crash",
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
          "gain": 6
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
          "gain": -14
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "RHODES · Tine Electric Piano",
        "voice": "rmndTineEP",
        "voiceParams": null,
        "strip": {
          "gain": -6.9,
          "pan": -0.15,
          "send": {
            "delay": 0.2,
            "reverb": 0.35
          },
          "effects": [
            {
              "id": "tape",
              "params": {
                "drive": 4,
                "bias": 0.1,
                "tone": 7000,
                "wow": 0.35,
                "flutter": 0.1,
                "wet": 0.6
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "STRINGS · Soft Strings",
        "voice": "tngrSoftStrings",
        "voiceParams": null,
        "strip": {
          "gain": -1.7,
          "eq": {
            "low": -3
          },
          "send": {
            "reverb": 0.6
          }
        },
        "noteFX": null
      },
      {
        "role": "square",
        "lane": "lead2",
        "label": "THEREMIN · Crypt Theremin",
        "voice": "cryptTheremin",
        "voiceParams": null,
        "strip": {
          "gain": -4.5,
          "pan": 0.1,
          "send": {
            "delay": 0.3,
            "reverb": 0.6
          }
        },
        "noteFX": null
      },
      {
        "role": "bell",
        "lane": "lead3",
        "label": "HOOK 8VA · Vibraphone",
        "voice": "mrdrVibraphone",
        "voiceParams": null,
        "strip": {
          "gain": -10,
          "pan": 0.2,
          "send": {
            "delay": 0.3,
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "megaSaw",
        "lane": "lead4",
        "label": "LEAD 8VA · Muted Trumpet",
        "voice": "mrdrMutedTrumpet",
        "voiceParams": null,
        "strip": {
          "gain": -8.9,
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
        "label": "ARP · Vibraphone",
        "voice": "mrdrVibraphone",
        "voiceParams": null,
        "strip": {
          "gain": -10,
          "pan": -0.25,
          "send": {
            "delay": 0.3,
            "reverb": 0.4
          }
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
          "gain": -8,
          "send": {
            "reverb": 0.7
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
          "gain": -6.9,
          "pan": 0.15,
          "send": {
            "reverb": 0.4
          }
        },
        "noteFX": null
      },
      {
        "role": "counter",
        "lane": "lead8",
        "label": "COUNTER-MELODY · Vibraphone",
        "voice": "mrdrVibraphone",
        "voiceParams": null,
        "strip": {
          "gain": -5.6,
          "pan": -0.2,
          "send": {
            "delay": 0.3,
            "reverb": 0.5
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
        "auto": "59199ae3",
        "expression": "77074ba4",
        "production": "34c46d28"
      },
      "kick": {
        "notes": "4c79fb37",
        "voice": "da3f26a1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "980a90d5"
      },
      "snare": {
        "notes": "fa8dab86",
        "voice": "73b0da2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a98dacf4"
      },
      "clap": {
        "notes": "8a0f2571",
        "voice": "73b0da2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a98dacf4"
      },
      "hats": {
        "notes": "8627740d",
        "voice": "2e5964eb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "980a90d5"
      },
      "ohats": {
        "notes": "e491dbb5",
        "voice": "6b0bdbf5",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "fill": {
        "notes": "1dc75bb7",
        "voice": "352acb51",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
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
        "production": "1d66975"
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
        "voice": "cad40454",
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
        "notes": "fae1306b",
        "voice": "f9cf1993",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "685dcb0a",
        "voice": "94966028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "5e14f754",
        "voice": "20a08fc2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "c9d7bd84"
      },
      "pad": {
        "notes": "c921ad51",
        "voice": "d01b65e3",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "square": {
        "notes": "7b213e98",
        "voice": "b734ef84",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "34c46d28"
      },
      "bell": {
        "notes": "6f951555",
        "voice": "5f5246fd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "cc3c3429"
      },
      "megaSaw": {
        "notes": "244e980d",
        "voice": "b71a9e71",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "arp": {
        "notes": "d3046cf6",
        "voice": "5f5246fd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5fa96782"
      },
      "choir": {
        "notes": "7c52c5e7",
        "voice": "5feefb54",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5dc58e2f"
      },
      "third": {
        "notes": "eb6366b3",
        "voice": "20a08fc2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19b0da9a"
      },
      "counter": {
        "notes": "a0020b05",
        "voice": "5f5246fd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "cc3c3429"
      }
    },
    "master": "c88eed7b"
  },
  "seedOf": "downtempo-triphop",
  "made": "2026-10-08T16:41:39.329Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "tape", params: { drive: 0.35, wow: 0.2, flutter: 0.15, tone: 7500, wet: 1 } }, { id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","tom","rim","rim2","rim3","tom2","crash","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"BREAK","clap":"SNARE Break","hats":"HATS","ohats":"OPEN HATS","tom":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom2":"PERC Congas","crash":"RIDE","bass":"SUB · Walking Sine Bass","bass2":"SUB · Sub Sine","chords":"RHODES · Tine Electric Piano","chords2":"STRINGS · Soft Strings","lead":"RIFF Grand · HOOK","lead2":"THEREMIN · Crypt Theremin","lead3":"HOOK 8VA · Vibraphone","lead4":"LEAD 8VA · Muted Trumpet","lead5":"ARP · Vibraphone","lead6":"CHOIR · Sung Choir Ooh","lead7":"THIRD BELOW · Tine Electric Piano","lead8":"COUNTER-MELODY · Vibraphone"},
  voice: {"kickVoice":"fatKick","snareVoice":"snareFat","clapVoice":"snareFat","hatsVoice":"hatEngine","ohatsVoice":"hatOpen","tomVoice":"ds808Tom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"ds808Cowbell","tom2Voice":"congaLow","crashVoice":"ride909SixBit","bassVoice":"layerWalkingBass","bass2Voice":"stSubSine","chordsVoice":"rmndTineEP","chords2Voice":"tngrSoftStrings","leadVoice":"mrdrElectricGrand","lead2Voice":"cryptTheremin","lead3Voice":"mrdrVibraphone","lead4Voice":"mrdrMutedTrumpet","lead5Voice":"mrdrVibraphone","lead6Voice":"jmjrChoirOoh","lead7Voice":"rmndTineEP","lead8Voice":"mrdrVibraphone"},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: 2.7, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    snare: { send: { reverb: 0.2 }, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    clap: { gain: -1, send: { reverb: 0.2 }, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    hats: { gain: -8.7, pan: 0.2, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    ohats: { gain: -6.2, pan: 0.2 },
    tom: { gain: -4.9, pan: 0.3, send: { reverb: 0.35 } },
    rim: { gain: -12, pan: 0.3 },
    rim2: { gain: -10, pan: -0.3 },
    rim3: { gain: -13, pan: 0.25, send: { reverb: 0.15 } },
    tom2: { gain: -8.5, pan: -0.2, send: { reverb: 0.15 } },
    crash: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: 6 },
    bass2: { gain: -14 },
    chords: { gain: -6.9, pan: -0.15, send: { delay: 0.2, reverb: 0.35 }, effects: [{ id: "tape", params: { drive: 4, bias: 0.1, tone: 7000, wow: 0.35, flutter: 0.1, wet: 0.6 } }] },
    chords2: { gain: -1.7, send: { reverb: 0.6 }, eq: { low: -3 } },
    lead: { gain: -2, pan: 0.15, send: { delay: 0.3, reverb: 0.6 }, eq: { high: 1 } },
    lead2: { gain: -4.5, pan: 0.1, send: { delay: 0.3, reverb: 0.6 } },
    lead3: { gain: -10, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    lead4: { gain: -8.9, send: { reverb: 0.25 }, eq: { low: -3 } },
    lead5: { gain: -10, pan: -0.25, send: { delay: 0.3, reverb: 0.4 } },
    lead6: { gain: -8, send: { reverb: 0.7 } },
    lead7: { gain: -6.9, pan: 0.15, send: { reverb: 0.4 } },
    lead8: { gain: -5.6, pan: -0.2, send: { delay: 0.3, reverb: 0.5 } },
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
