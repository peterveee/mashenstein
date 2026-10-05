// REGGAETON SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Reggaeton's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-reggaeton";
export const title = "REGGAETON SEED";
export const slug = "banger-seed-reggaeton";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 92,
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
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,1,null,null,null,null],
      bass: seq('F1 . . . F1 . . F1 F1 . . . F1 . . . | F1 . . . F1 . . F1 F1 . . . . . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,null,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      lead5: seq('. . A4 C5 . . F5 . . . A4 C5 . . F5 . | . . A4 C5 . . F5 . . . A4 C5 . . . .'),
      lead5Len: [null,null,1,1,null,null,1,null,null,null,1,1,null,null,1,null,null,null,1,1,null,null,1,null,null,null,1,1,null,null,null,null],
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('F1 . . . F1 . . F1 F1 . . . F1 . . . | F1 . . . F1 . . F1 F1 . . . F1 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 A1 . . . A1 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[329.6275569128699,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,329.6275569128699,440],null,null,[261.6255653005986,329.6275569128699,440],null,null,[261.6255653005986,329.6275569128699,440],null,[261.6255653005986,329.6275569128699,440],null,null,[261.6255653005986,329.6275569128699,440],null,null,[261.6255653005986,329.6275569128699,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('A1 . . . A1 . . A1 A1 . . . A1 . . . | F1 . . . F1 . . F1 F1 . . . F1 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('A1 . . . . . . . A1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 A1 . . . A1 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null,null,[261.6255653005986,349.2282314330039,391.99543598174927,440],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('F1 . . . F1 . . F1 F1 . . . F1 . . . | F1 . . . F1 . . F1 F1 . . . F1 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('F1 . . . . . . . F1 . . . . . . . | F1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('F6 . A6 . C7 . A6 . F6 . . . E6 . G6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . A4 . . . A4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null,null,[277.1826309768721,329.6275569128699,440],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 A1 . . . A1 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . A1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 C1 C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . A4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[349.2282314330039,440,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[220,261.6255653005986,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[440,523.2511306011972,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords2: [[349.2282314330039,440,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[293.6647679174076,349.2282314330039,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[220,261.6255653005986,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [[440,523.2511306011972,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: chordSeq('D4min . . D4min . . D4min . D4min . . D4min . . D4min . | D4min . . D4min . . D4min . D4min . . D4min . . D4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 D2 . . . D2 . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . D1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[369.9944227116344,440,622.2539674441618],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,null,[293.6647679174076,349.2282314330039,440],null,[311.1269837220809,369.9944227116344,440],null,null,[311.1269837220809,369.9944227116344,440],null,null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,1,null,null,null,null],
      bass: seq('D2 . . . D2 . . D2 D2 . . . D2 . . . | D2 . . . D2 . . D2 B1 . . . . . . .'),
      bassLen: [3,null,null,null,3,null,null,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,1,3,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . D1 . . . . . . . | D1 . . . . . . . B0 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      lead5: seq('A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 A5 F5 D5 A4 | A5 F5 D5 A4 A5 F5 D5 A4 A5 F#5 D#5 A4 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: [[659.2551138257398,1318.5102276514797],null,[783.9908719634985,1567.981743926997],null,[987.7666025122483,1975.533205024496],null,[783.9908719634985,1567.981743926997],null,[659.2551138257398,1318.5102276514797],null,null,null,[587.3295358348151,1174.6590716696303],null,[739.9888454232688,1479.9776908465376],null,[659.2551138257398,1318.5102276514797],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[783.9908719634985,1567.981743926997],null,null,null,[739.9888454232688,1479.9776908465376],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('E4min . . E4min . . E4min . E4min . . E4min . . E4min . | E4min . . E4min . . E4min . E4min . . E4min . . E4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E1 . . . . . . . E1 . . . . . . . | E1 . . . . . . . E1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
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
      chords2: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('E4min . . E4min . . E4min . E4min . . E4min . . E4min . | E4min . . E4min . . E4min . E4min . . E4min . . E4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E1 . . . . . . . E1 . . . . . . . | E1 . . . . . . . E1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . E5 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
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
      chords2: [[369.9944227116344,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[293.6647679174076,369.9944227116344,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,493.8833012561241],null,[293.6647679174076,369.9944227116344,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,493.8833012561241],null,null,[293.6647679174076,369.9944227116344,493.8833012561241],null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('B1 . B2 . B1 . B2 . B1 . B2 . B1 . B2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | G1 . . . . . . . G1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 D5 F#5 B5 D6 F#6 B6 D7 B4 D5 F#5 B5 D6 F#6 B6 D7 | B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('B5 . D6 . F#6 . D6 . B5 . . . A5 . C6 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[369.9944227116344,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E1 . . . . . . . E1 . . . . . . . | E1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('E4min . . E4min . . E4min . E4min . . E4min . . E4min . | E4min . . E4min . . E4min . E4min . . E4min . . E4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E1 . . . . . . . E1 . . . . . . . | E1 . . . . . . . E1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
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
      chords2: [[391.99543598174927,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,440,493.8833012561241],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('G1 . . . . . . . G1 . . . . . . . | G1 . . . . . . . G1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7 | B4 D5 G5 B5 D6 G6 B6 D7 B4 D5 G5 B5 D6 G6 B6 D7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . B4 . . . B4 .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: [[391.99543598174927,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,440,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      chords2: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: chordSeq('E4min . . E4min . . E4min . E4min . . E4min . . E4min . | E4min . . E4min . . E4min . E4min . . E4min . . E4min .'),
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E1 . . . . . . . E1 . . . . . . . | E1 . . . . . . . E1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
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
      chords2: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null],
      chordsLen: [2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null,2,null,null,2,null,null,2,null],
      bass: seq('E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 . | E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      bass2: seq('E1 . . . . . . . E1 . . . . . . . | E1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . C1 . . C1 .').map((v) => !!v),
      lead5: seq('B4 E5 G5 B5 E6 G6 B6 E7 B4 E5 G5 B5 E6 G6 B6 E7 | B4 E5 G5 B5 E6 G6 B6 E7 B4 D#5 F#5 B5 D#6 F#6 B6 D#7'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      snare: seq('. . . C1 . . C1 . . . . C1 . . C1 . | . . . C1 . . C1 . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 C1 C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . . . . C1 . . . C1 . . . . . | . . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . B4 . . . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      lead6: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
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
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . C1 . . C1 . . . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 C1 C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 6,
  "style": "reggaeton",
  "options": {
    "style": "reggaeton",
    "mood": "uplifting",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 92,
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
    "styleId": "reggaeton",
    "moodId": "uplifting",
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
      "preset": "snareTight",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "snareTight",
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
      "part": "part:impact",
      "preset": "syn3PewDeep",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom2",
      "part": "part:fill",
      "preset": "kit_havana_patio_tom",
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
      "preset": "kit_havana_patio_rim",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom3",
      "part": "part:congas",
      "preset": "congaHigh",
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
      "preset": "mrdrDist808",
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
      "preset": "tngrDreamCircuit",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "marimba",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:bell",
      "preset": "tpKalimba",
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
      "preset": "tngrDataMarimba",
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
      "preset": "tngrDataMarimba",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "jmjrChoirAah",
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
      "style": "Reggaeton",
      "mood": "uplifting",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 92,
      "seconds": 167,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Reggaeton's own · kick · =808 Kick, bars 45–52",
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
        "from": "Reggaeton's own · snare · Tight Snare, bars 45–52",
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
        "lane": "clap",
        "job": "clap",
        "how": "sound",
        "from": "Reggaeton's own · clap · Tight Snare, bars 45–52",
        "base": 6,
        "before": 6,
        "after": 6,
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
        "from": "Reggaeton's own · hats · DS Closed Hat, bars 45–52",
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
        "from": "Reggaeton's own · ohats · =808 Open Hat, bars 45–52",
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
        "from": "Reggaeton's own · crash · Cymbal · 808 CY, bars 45–52",
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
        "job": "impact",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · impact · Synare · Deep Pew, bars 45–52",
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
        "lane": "tom2",
        "job": "fill",
        "how": "sound",
        "from": "Reggaeton's own · fill · Havana Patio · Conga, bars 52–59",
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
        "from": "Reggaeton's own · shaker · DS Shaker, bars 45–52",
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
        "after": -11.8,
        "move": 1.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "tom3",
        "job": "congas",
        "how": "sound",
        "from": "Reggaeton's own · congas · Conga · High, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -9,
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
        "from": "Reggaeton's own · bass · Distorted 808, bars 45–52",
        "base": -4,
        "before": -4,
        "after": -4.2,
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
        "from": "Reggaeton's own · sub · Sub Sine (starter), bars 45–52",
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
        "from": "Reggaeton's own · piano · Acoustic Guitar, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -5.7,
        "move": 0.3,
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
        "from": "Reggaeton's own · pad · Cloud Memory, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -13.6,
        "move": -5.6,
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
        "after": 0.3,
        "move": 0.3,
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
        "after": -11.9,
        "move": -5.9,
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
        "from": "Reggaeton's own · megaSaw · Horizon Solo, bars 45–52",
        "base": -12,
        "before": -12,
        "after": -14.2,
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
        "from": "Reggaeton's own · arp · Wire Harp, bars 45–52",
        "base": -11,
        "before": -11,
        "after": -14.3,
        "move": -3.3,
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
        "after": -4.5,
        "move": 2.5,
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
        "from": "Reggaeton's own · counter · Choir Aah, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -7.8,
        "move": 0.2,
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
            "delay": 0.2,
            "reverb": 0.25
          },
          "pan": -0.1,
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
        "voice": "snareTight",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "send": {
            "reverb": 0.15
          }
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "SNARE Dembow",
        "voice": "snareTight",
        "voiceParams": null,
        "strip": {
          "gain": 6,
          "send": {
            "reverb": 0.15
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
          "gain": -1,
          "pan": -0.15
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
          "pan": 0.15
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
        "role": "riser",
        "lane": "crash2",
        "label": "RISER",
        "voice": null,
        "voiceParams": {
          "label": "Noise Riser",
          "category": "Sweep",
          "homeLane": "crash",
          "kind": "drum",
          "dur": 5.217391304347826,
          "note": "White noise through a band climbing 250 Hz to 8 kHz over 5.22s as it fades in: the lift into a drop.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 5.217391304347826,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 4.800000000000001,
            "hold": 0,
            "decay": 0.4173913043478261,
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
        "label": "FILL Perc",
        "voice": "kit_havana_patio_tom",
        "voiceParams": null,
        "strip": {
          "gain": -7,
          "pan": 0.3,
          "send": {
            "reverb": 0.2
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
          "gain": -8,
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
        "voice": "kit_havana_patio_rim",
        "voiceParams": null,
        "strip": {
          "gain": -11.8,
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
        "voice": "congaHigh",
        "voiceParams": null,
        "strip": {
          "gain": -9,
          "pan": 0.35,
          "send": {
            "reverb": 0.2
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
        "label": "808 · Distorted 808",
        "voice": "mrdrDist808",
        "voiceParams": null,
        "strip": {
          "gain": -4.2,
          "effects": [
            {
              "id": "filter",
              "params": {
                "type": "lowpass",
                "frequency": 1200,
                "Q": 0.7
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
          "gain": -14
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "GUITAR · Acoustic Guitar",
        "voice": "mrdrAcousticGuitar",
        "voiceParams": null,
        "strip": {
          "gain": -5.7,
          "pan": -0.2,
          "eq": {
            "low": -3
          },
          "send": {
            "delay": 0.1,
            "reverb": 0.25
          }
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "PAD · Dream Circuit",
        "voice": "tngrDreamCircuit",
        "voiceParams": null,
        "strip": {
          "gain": -13.6,
          "eq": {
            "low": -6
          },
          "send": {
            "reverb": 0.5
          },
          "effects": [
            {
              "id": "filter",
              "params": {
                "type": "lowpass",
                "frequency": 3200,
                "Q": 0.7
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "square",
        "lane": "lead2",
        "label": "HOOK DOUBLE · Marimba",
        "voice": "marimba",
        "voiceParams": null,
        "strip": {
          "gain": 0.3,
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
        "label": "HOOK 8VA · Kalimba",
        "voice": "tpKalimba",
        "voiceParams": null,
        "strip": {
          "gain": -11.9,
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
          "gain": -14.2,
          "pan": 0.1,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead5",
        "label": "ARP · Data Marimba",
        "voice": "tngrDataMarimba",
        "voiceParams": null,
        "strip": {
          "gain": -14.3,
          "pan": 0.25,
          "send": {
            "delay": 0.25,
            "reverb": 0.3
          }
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
          "gain": -11,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead7",
        "label": "THIRD BELOW · Data Marimba",
        "voice": "tngrDataMarimba",
        "voiceParams": null,
        "strip": {
          "gain": -4.5,
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
        "label": "VOX Chops · Choir Aah",
        "voice": "jmjrChoirAah",
        "voiceParams": null,
        "strip": {
          "gain": -7.8,
          "pan": 0.15,
          "send": {
            "delay": 0.35,
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
        "notes": "3d57d585",
        "voice": "eced1f8e",
        "auto": "59199ae3",
        "expression": "77074ba4",
        "production": "dee7c738"
      },
      "kick": {
        "notes": "7df628cb",
        "voice": "b38f6af9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "682c68b0",
        "voice": "23e6385f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "clap": {
        "notes": "8b06531d",
        "voice": "23e6385f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "hats": {
        "notes": "e5f27021",
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
      "riser": {
        "notes": "2529eb27",
        "voice": "ae7d77d4",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "ce4dd3c6"
      },
      "impact": {
        "notes": "d2eaa2cf",
        "voice": "989606db",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "fill": {
        "notes": "a25c3624",
        "voice": "4fb2c0ef",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "shaker": {
        "notes": "29524b3d",
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
        "voice": "5624050f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "congas": {
        "notes": "ad8fef3d",
        "voice": "c12ccd2a",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "ride": {
        "notes": "121261bd",
        "voice": "2371fa8d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "e824d571",
        "voice": "51c2cf",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "2353d573"
      },
      "sub": {
        "notes": "2448d1f1",
        "voice": "94966028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "6599759e",
        "voice": "963522ee",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "ca7d79c5"
      },
      "pad": {
        "notes": "d6938480",
        "voice": "108691f1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "720f584d"
      },
      "square": {
        "notes": "9871906e",
        "voice": "5d6384cb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5327d298"
      },
      "bell": {
        "notes": "1cca66aa",
        "voice": "8ebbf813",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "b22ea12a",
        "voice": "b6d7cde5",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "arp": {
        "notes": "b600faf5",
        "voice": "62c70bfc",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8ac28975"
      },
      "choir": {
        "notes": "6bc512be",
        "voice": "5feefb54",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "706e51dd",
        "voice": "62c70bfc",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "392a1609",
        "voice": "6db7d0b4",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1fb1fafc"
      }
    },
    "master": "f52c1fee"
  },
  "seedOf": "reggaeton",
  "made": "2026-10-05T10:50:44.417Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom3", from: "tom", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","tom2","rim","rim2","rim3","tom3","crash3","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"SNARE Dembow","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"IMPACT","tom2":"FILL Perc","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom3":"PERC Congas","crash3":"RIDE","bass":"808 · Distorted 808","bass2":"SUB · Sub Sine (starter)","chords":"GUITAR · Acoustic Guitar","chords2":"PAD · Dream Circuit","lead":"RIFF Grand · HOOK","lead2":"HOOK DOUBLE · Marimba","lead3":"HOOK 8VA · Kalimba","lead4":"LEAD 8VA · Horizon Solo","lead5":"ARP · Data Marimba","lead6":"CHOIR · Choir Ooh","lead7":"THIRD BELOW · Data Marimba","lead8":"VOX Chops · Choir Aah"},
  voice: {"kickVoice":"ds808Kick","snareVoice":"snareTight","clapVoice":"snareTight","hatsVoice":"dsHatClosed","ohatsVoice":"ds808OpenHat","crashVoice":"seedFutureBassRide","tomVoice":"syn3PewDeep","tom2Voice":"kit_havana_patio_tom","rimVoice":"dsShaker","rim2Voice":"tambourine","rim3Voice":"kit_havana_patio_rim","tom3Voice":"congaHigh","crash3Voice":"ride909SixBit","bassVoice":"mrdrDist808","bass2Voice":"stSubSine","chordsVoice":"mrdrAcousticGuitar","chords2Voice":"tngrDreamCircuit","leadVoice":"mrdrElectricGrand","lead2Voice":"marimba","lead3Voice":"tpKalimba","lead4Voice":"tngrHorizonSolo","lead5Voice":"tngrDataMarimba","lead6Voice":"jmjrChoirOoh","lead7Voice":"tngrDataMarimba","lead8Voice":"jmjrChoirAah"},
  voiceParams: {"crash2Voice":{"label":"Noise Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":5.217391304347826,"note":"White noise through a band climbing 250 Hz to 8 kHz over 5.22s as it fades in: the lift into a drop.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":5.217391304347826,"Q":1.6,"slope":-24,"color":"white","attack":4.800000000000001,"hold":0,"decay":0.4173913043478261,"curve":"exp","gain":1},"drive":0.08,"peak":0.034},"kickVoice":{"label":"=808 Kick","category":"Kick","homeLane":"kick","dur":3,"note":"A long 808-style sub kick: deep sine drop, soft front click and a tail that can become the bass line when it is tuned in a pattern.","osc":{"type":"sine","from":170,"to":36,"sweep":0.06,"attack":0.001,"decay":0.78,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":2200,"Q":0.7,"decay":0.02,"gain":0.25},"drive":0.12,"id":"ds808Kick","kind":"drum","factory":true,"level":0.046,"peak":0.7114},"snareVoice":{"label":"Tight Snare","category":"Snare","dur":1,"note":"Gated: cut off almost before it starts. Sits under a busy hat pattern without smearing it.","osc":{"type":"triangle","from":240,"to":170,"sweep":0.03,"decay":0.03,"gain":0.3},"noise":{"type":"bandpass","freq":3200,"Q":1.1,"decay":0.045},"id":"snareTight","kind":"drum","factory":true,"level":0.007971,"peak":0.4103},"clapVoice":{"label":"Tight Snare","category":"Snare","dur":1,"note":"Gated: cut off almost before it starts. Sits under a busy hat pattern without smearing it.","osc":{"type":"triangle","from":240,"to":170,"sweep":0.03,"decay":0.03,"gain":0.3},"noise":{"type":"bandpass","freq":3200,"Q":1.1,"decay":0.045},"id":"snareTight","kind":"drum","factory":true,"level":0.007971,"peak":0.4103},"hatsVoice":{"label":"DS Closed Hat","category":"Hats","dur":0.5,"note":"A resonant highpassed tick — sharper than the plain closed hat, closer to metal without being metal.","noise":{"type":"highpass","freq":7800,"Q":1.2,"decay":0.032,"gain":1},"id":"dsHatClosed","kind":"drum","factory":true,"level":0.015363,"peak":0.7135},"ohatsVoice":{"label":"=808 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open 808-style cymbal partner: the same inharmonic cluster left ringing with a lower filter so its body is audible as it fades, plus a restrained resonant tail.","metal":{"freq":540,"spread":1,"count":6,"hp":6100,"Q":0.9,"slope":-24,"decay":0.42,"resonator":{"feedback":0.92,"drive":1.2,"leak":0.00025}},"humanize":{"gain":0.04},"id":"ds808OpenHat","kind":"drum","factory":true,"level":0.063614,"peak":0.5898},"crashVoice":{"label":"Ride · Future Bass","category":"Crash","homeLane":"crash","dur":4,"note":"A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is half of why the sound is recognisable, so the crush is doing the work here that the filter sweeps do on the 808 presets.","ring":{"freq":2500,"Q":70,"hit":0.0018,"decay":0.25,"gain":0.6},"metal":{"wave":"square","freq":780,"count":6,"spread":1.12,"filter":"highpass","hp":5400,"Q":0.8,"slope":-24,"attack":0.004,"decay":1.6,"sag":0.3,"sagAt":0.06,"gain":0.55},"drive":0.6,"shape":"crush","tone":{"type":"lowpass","freq":9500,"Q":0.7},"humanize":{"gain":0.03},"starter":false,"id":"seedFutureBassRide","kind":"drum","user":true,"level":0.053247,"peak":1.0339},"tomVoice":{"label":"Synare · Deep Pew","category":"Sweep","homeLane":"tom","dur":4,"note":"The long one: 3 kHz to 60 over a second and a half, with two seconds of envelope under it so the bottom of the fall is still audible when it arrives. Five and a half octaves — a whole bar of descent at a disco tempo.","osc":{"type":"sine","from":3000,"to":60,"sweep":1.5,"pitchCurve":"exp","attack":0.004,"hold":1.05,"decay":1.05,"curve":"lin","gain":1},"drive":0.12,"id":"syn3PewDeep","kind":"drum","factory":true,"level":0.3637,"peak":0.7},"tom2Voice":{"label":"Havana Patio · Conga","category":"Perc","homeLane":"tom","dur":1,"note":"Latin house: a solid club kick and handclaps, with open conga, woody clave and sandy shaker accents over a four-on-the-floor groove.","osc":{"type":"sine","from":235,"to":195,"sweep":0.015,"attack":0.001,"decay":0.28,"curve":"exp","gain":1},"osc2":{"type":"sine","from":325,"to":315,"sweep":0.008,"decay":0.075,"gain":0.18},"noise":{"type":"lowpass","freq":1700,"Q":0.65,"decay":0.022,"gain":0.3},"drive":0.12,"id":"kit_havana_patio_tom","kind":"drum","factory":true,"level":0.035658,"peak":0.8241},"rimVoice":{"label":"DS Shaker","category":"Perc","homeLane":"rim","dur":0.5,"note":"The one drum here with an ATTACK: the noise fades in over twenty milliseconds, which is the whole difference between a shaker and a hat.","noise":{"type":"bandpass","freq":6300,"Q":1.4,"attack":0.018,"decay":0.05,"gain":1},"id":"dsShaker","kind":"drum","factory":true,"level":0.017053,"peak":0.5496},"rim2Voice":{"label":"Tambourine","category":"Perc","homeLane":"rim","dur":1,"note":"Bright, jangly and slightly longer, with a touch of pitch in it.","osc":{"type":"square","from":900,"to":780,"sweep":0.05,"decay":0.05,"gain":0.12},"noise":{"type":"highpass","freq":5200,"Q":0.6,"decay":0.14},"id":"tambourine","kind":"drum","factory":true,"level":0.034686,"peak":0.8969},"rim3Voice":{"label":"Havana Patio · Clave","category":"Perc","homeLane":"rim","dur":0.5,"note":"Latin house: a solid club kick and handclaps, with open conga, woody clave and sandy shaker accents over a four-on-the-floor groove.","osc":{"type":"triangle","from":1900,"to":1790,"sweep":0.016,"curve":"exp","attack":0.0006,"decay":0.075,"gain":0.6},"ring":{"freq":2500,"Q":70,"hit":0.001,"decay":0.045,"gain":0.35},"drive":0.08,"tone":{"type":"lowpass","freq":5200,"Q":0.7},"id":"kit_havana_patio_rim","kind":"drum","factory":true,"level":0.013359,"peak":0.4104},"tom3Voice":{"label":"Conga · High","category":"Perc","homeLane":"tom","dur":1,"note":"A high conga: a short pitched slap into a light skin body, tuned for the top voice of a three-drum conga figure.","osc":{"type":"triangle","from":375,"to":285,"sweep":0.028,"decay":0.2,"curve":"exp","gain":0.82},"noise":{"type":"lowpass","freq":2400,"Q":0.7,"decay":0.018,"gain":0.32},"drive":0.08,"id":"congaHigh","kind":"drum","factory":true,"level":0.0203,"peak":0.5193},"crash3Voice":{"label":"Ride · 909 Six-Bit","category":"Crash","homeLane":"crash","dur":4,"note":"A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is half of why the sound is recognisable, so the crush is doing the work here that the filter sweeps do on the 808 presets.","ring":{"freq":2500,"Q":70,"hit":0.0018,"decay":0.25,"gain":0.6},"metal":{"wave":"square","freq":780,"count":6,"spread":1.12,"filter":"highpass","hp":5400,"Q":0.8,"slope":-24,"attack":0.004,"decay":1.6,"sag":0.3,"sagAt":0.06,"gain":0.55},"drive":0.6,"shape":"crush","tone":{"type":"lowpass","freq":9500,"Q":0.7},"humanize":{"gain":0.03},"id":"ride909SixBit","kind":"drum","factory":true,"level":0.0532,"peak":1.0339},"bassVoice":{"label":"Distorted 808","category":"Bass","synth":"MRDR-3","dur":2,"note":"The trap 808 pushed into a shaper: a sine that drops a few semitones into its note, driven hard enough to grow upper harmonics so it reads on a phone speaker, with a long tail that is the note itself.","layer":{"osc1":{"type":"sine","ratio":1,"gain":1,"attack":0.002,"decay":1.6,"sustain":0.5,"release":0.3,"pitch":{"semitones":7,"decay":0.05}},"osc2":{"type":"triangle","ratio":1,"gain":0.25,"attack":0.002,"decay":0.2,"sustain":0.2,"release":0.2}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":2200,"Q":0.7,"track":0.2},"vca":{"attack":0.002,"decay":1.6,"sustain":0.55,"release":0.3}},"drive":0.7,"shape":"soft","id":"mrdrDist808","kind":"tone","factory":true,"level":0.1904,"peak":0.7},"bass2Voice":{"label":"Sub Sine (starter)","category":"Bass","kind":"tone","synth":"CRLS-1","dur":2.2,"note":"Pure weight, no harmonics. Wants room underneath it and a lead up top.","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.012,"decay":0.3,"sustain":0.8,"release":0.4}},"id":"stSubSine","starter":true,"factory":true,"level":0.11677,"peak":0.6891},"chordsVoice":{"label":"Acoustic Guitar","category":"Pluck","synth":"MRDR-3","dur":2.2,"note":"A steel-string pick: a bright triangle-and-saw string whose top falls away faster than its body, a wooden box resonance at 220 Hz and a scrape of pick noise on the front. Strummed chords come from the part, a few milliseconds apart.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.55,"attack":0.001,"decay":1.6,"sustain":0,"release":0.3,"filter":{"type":"lowpass","slope":-12,"freq":1600,"Q":0.7,"track":0.7,"env":{"octaves":2.2,"attack":0.001,"decay":0.35,"sustain":0,"release":0.2}}},"osc2":{"type":"triangle","ratio":1,"gain":0.7,"detune":3,"attack":0.001,"decay":1.9,"sustain":0,"release":0.3,"filter":{"type":"bandpass","slope":-12,"freq":220,"Q":2.2,"track":0}},"osc3":{"type":"noise","ratio":1,"gain":0.1,"color":"white","attack":0.001,"decay":0.03,"sustain":0,"release":0.02,"filter":{"type":"highpass","slope":-12,"freq":3500,"Q":0.8,"track":0}}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":5200,"Q":0.6,"track":0.3},"vca":{"attack":0.001,"decay":1.8,"sustain":0,"release":0.3}},"humanize":{"entry":0.006,"pitch":0.001734,"gain":0.08},"id":"mrdrAcousticGuitar","kind":"tone","factory":true,"level":0.0599,"peak":0.6801},"chords2Voice":{"label":"Dream Circuit","category":"Pad","synth":"TNGR-2","dur":8,"note":"An unmistakable evolving digital pad with musical rather than noisy motion.","tngr2":{"oscA":{"table":"digitalSteps","position":0.08,"envAmount":0.92,"level":0.7,"unison":2,"spread":12},"oscB":{"table":"spectralPWM","position":0.7,"envAmount":-0.65,"level":0.28,"unison":2,"spread":10,"interval":-12},"amp":{"attack":0.015,"decay":2,"sustain":0.78,"release":0.707},"positionEnv":{"attack":1.6,"decay":3.8,"sustain":0.52},"filter":{"type":"lowpass","cutoff":4800,"resonance":2.88},"lfo1":{"shape":"triangle","sync":true,"division":"1/2","amount":0.24},"master":{"gain":0.5}},"id":"tngrDreamCircuit","kind":"tone","factory":true,"level":0.09742,"peak":0.4712},"leadVoice":{"label":"Electric Grand","category":"Keys","synth":"MRDR-3","dur":2.2,"note":"The CP-70: real strings on a pickup, so a thinner body, a brighter strike and the chorus it was always played through.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.7,"attack":0.001,"decay":2.2,"sustain":0,"release":0.3,"unison":2,"spread":6,"stereo":0.5,"filter":{"type":"lowpass","slope":-12,"freq":900,"Q":0.8,"track":0.9,"env":{"octaves":2.5,"attack":0.001,"decay":0.25,"sustain":0,"release":0.2}}},"osc2":{"type":"triangle","ratio":2,"gain":0.25,"attack":0.001,"decay":1.2,"sustain":0,"release":0.25},"osc3":{"type":"noise","ratio":1,"gain":0.07,"color":"white","attack":0.001,"decay":0.018,"sustain":0,"release":0.02,"filter":{"type":"bandpass","slope":-12,"freq":2400,"Q":1.2,"track":0.4}}},"humanize":{"entry":0.005,"gain":0.07},"chorus":{"mix":0.35,"rate":0.6,"depth":0.4,"width":1},"id":"mrdrElectricGrand","kind":"tone","factory":true,"level":0.0443,"peak":0.4886},"lead2Voice":{"label":"Marimba","category":"Bells","synth":"RMND-2","dur":1.4,"note":"Wooden and short. The mallet is the whole sound; there is no sustain to speak of.","options":{"harmonicity":4,"modulationIndex":3,"oscillator":{"type":"sine"},"modulation":{"type":"triangle"},"envelope":{"attack":0.001,"decay":0.35,"sustain":0,"release":0.35},"modulationEnvelope":{"attack":0.001,"decay":0.1,"sustain":0,"release":0.1}},"id":"marimba","kind":"tone","factory":true,"level":0.013661,"peak":0.2153},"lead3Voice":{"label":"Kalimba","category":"Bells","synth":"RMND-2","dur":2.4,"note":"Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.","origin":"Tonejs/Presets FMSynth/Kalimba","options":{"harmonicity":8,"modulationIndex":2,"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":2,"sustain":0.1,"release":2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.002,"decay":0.2,"sustain":0,"release":0.2}},"id":"tpKalimba","kind":"tone","factory":true,"level":0.028046,"peak":0.2195},"lead4Voice":{"label":"Horizon Solo","category":"Lead","synth":"TNGR-2","dur":2,"note":"An expressive legato lead with position movement during held notes.","mode":"legato","portamento":0.12,"tngr2":{"oscA":{"table":"vowelGlass","position":0.18,"envAmount":0.52,"level":0.78,"unison":2,"spread":8},"oscB":{"table":"darkToAir","position":0.35,"envAmount":0.35,"level":0.16,"interval":12},"amp":{"attack":0.06,"decay":0.32,"sustain":0.82,"release":0.28},"filter":{"type":"lowpass","cutoff":4300,"resonance":2.28},"filterEnv":{"amount":1.2,"attack":0.06,"decay":0.45,"sustain":0.4},"positionEnv":{"attack":0.3,"decay":1.1,"sustain":0.72},"master":{"gain":0.6}},"id":"tngrHorizonSolo","kind":"tone","factory":true,"level":0.010567,"peak":0.1453},"lead5Voice":{"label":"Data Marimba","category":"Pluck","synth":"TNGR-2","dur":1.3,"note":"A woody-digital table journey distinct from KLNG8 percussion.","tngr2":{"oscA":{"table":"organShift","position":0.35,"envAmount":-0.3,"level":0.8},"oscB":{"table":"crystal","position":0.2,"level":0.13,"interval":12},"amp":{"attack":0.002,"decay":0.48,"sustain":0.06,"release":0.18},"positionEnv":{"attack":0,"decay":0.38,"sustain":0.05},"filter":{"type":"lowpass","cutoff":5400,"resonance":1.68},"master":{"gain":0.55}},"id":"tngrDataMarimba","kind":"tone","factory":true,"level":0.008376,"peak":0.0833},"lead6Voice":{"label":"Choir Ooh","category":"Pad","synth":"JMJR-4","dur":8,"note":"Two singers on ooh, rounder and darker than the aah beside it.","jmjr4":{"voice":"announcer","line":"ooh","unison":2,"spread":20,"amp":{"attack":0.09,"decay":0.2,"sustain":1,"release":0.5}},"vibrato":{"depth":0.21,"rate":5,"delay":0.15},"id":"jmjrChoirOoh","kind":"tone","factory":true,"level":0.031107,"peak":0.2042},"lead7Voice":{"label":"Data Marimba","category":"Pluck","synth":"TNGR-2","dur":1.3,"note":"A woody-digital table journey distinct from KLNG8 percussion.","tngr2":{"oscA":{"table":"organShift","position":0.35,"envAmount":-0.3,"level":0.8},"oscB":{"table":"crystal","position":0.2,"level":0.13,"interval":12},"amp":{"attack":0.002,"decay":0.48,"sustain":0.06,"release":0.18},"positionEnv":{"attack":0,"decay":0.38,"sustain":0.05},"filter":{"type":"lowpass","cutoff":5400,"resonance":1.68},"master":{"gain":0.55}},"id":"tngrDataMarimba","kind":"tone","factory":true,"level":0.008376,"peak":0.0833},"lead8Voice":{"label":"Choir Aah","category":"Pad","synth":"JMJR-4","dur":8,"note":"Three singers on a warm throat, wide formants, a slow swell and a delayed vibrato. The choir the synth exists for. It was four until the fourth was measured: a quarter of the note-on cost for a fullness nobody could hear.","jmjr4":{"voice":"chorister","line":"aah","morphTo":"AH","unison":3,"spread":24,"tilt":3,"breath":0.42,"resonance":38,"amp":{"attack":0.3,"decay":0.4,"sustain":1,"release":1.2}},"vibrato":{"depth":0.22,"rate":5.2,"delay":0.35},"id":"jmjrChoirAah","kind":"tone","factory":true,"level":0.027448,"peak":0.1415}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    snare: { gain: -0.8, send: { reverb: 0.15 } },
    clap: { gain: 6, send: { reverb: 0.15 } },
    hats: { gain: 4.512, pan: -0.15 },
    ohats: { gain: -1.44, pan: 0.15 },
    crash: { gain: -2.96, pan: 0.2, send: { reverb: 0.5 } },
    crash2: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -3, send: { reverb: 0.6 } },
    tom2: { gain: -7, pan: 0.3, send: { reverb: 0.2 } },
    rim: { gain: -5.68, pan: 0.3 },
    rim2: { gain: -6.08, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -7.44, pan: 0.25, send: { reverb: 0.15 } },
    tom3: { gain: -11.1, pan: 0.35, send: { reverb: 0.2 } },
    crash3: { gain: -1.12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -4.2, effects: [{ id: "filter", params: { type: "lowpass", frequency: 1200, Q: 0.7 } }] },
    bass2: { gain: -14 },
    chords: { gain: -5.7, pan: -0.2, send: { delay: 0.1, reverb: 0.25 }, eq: { low: -3 } },
    chords2: { gain: -13.6, send: { reverb: 0.5 }, eq: { low: -6 }, effects: [{ id: "filter", params: { type: "lowpass", frequency: 3200, Q: 0.7 } }] },
    lead: { gain: -5, pan: -0.1, send: { delay: 0.2, reverb: 0.25 }, eq: { high: 2.6 } },
    lead2: { gain: 0.3, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead3: { gain: -11.9, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead4: { gain: -14.2, pan: 0.1, send: { reverb: 0.3 } },
    lead5: { gain: -14.3, pan: 0.25, send: { delay: 0.25, reverb: 0.3 } },
    lead6: { gain: -11, send: { reverb: 0.5 } },
    lead7: { gain: -4.5, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -7.8, pan: 0.15, send: { delay: 0.35, reverb: 0.5 } },
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
