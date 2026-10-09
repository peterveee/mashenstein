// EUROBEAT · HI-NRG SEED — one song: what it plays, how it is arranged, how it sounds.
//
// Eurobeat · Hi-NRG's SEED BANGER: the style laid out to be tuned, every part switched on.
// Tune it on the desk — the drum sounds, the presets, the faders, EQ, sends, inserts and the
// master — then Use as Style (the drawer) makes new bangers start from it.
// Made by tools/banger-seeds.js; see tools/lib/banger-seeds.js.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "banger-seed-eurobeat-hinrg";
export const title = "EUROBEAT · HI-NRG SEED";
export const slug = "banger-seed-eurobeat-hinrg";
export const group = "bangerSeed";
export const seed = 1;

export const bank = {
  bpm: 130,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
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
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: [[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: chordSeq('F4 . . . . . . . . . . . . . . . | F4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 | F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 F2 . F3 F3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead5: seq('F5 A5 C6 F6 A6 F6 C6 A5 F5 A5 C6 F6 A6 F6 C6 A5 | F5 A5 C6 F6 A6 F6 C6 A5 F5 A5 C6 F6 A6 F6 C6 A5'),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: chordSeq('F4 . . . . . . . . . . . . . . . | F4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 | F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 F2 . F3 F3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 A1 . A2 A2 A1 . A2 A2'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A1 . A2 A2 A1 . A2 A2 A1 . A2 A2 A1 . A2 A2 | F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 F2 . F3 F3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,[440,523.2511306011972,698.4564628660078],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[329.6275569128699,440,554.3652619537442],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 A1 . A2 A2 A1 . A2 A2'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . A1 . . . A1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . A4 . . . E4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . A5 . . . E5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[440,554.3652619537442,659.2551138257398],null,null,null,[440,554.3652619537442,659.2551138257398],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
    },
    {
      chords3: [[293.6647679174076,440,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,261.6255653005986,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      chords2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead6: [[587.3295358348151,880,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      chords3: [[174.61411571650194,220,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      chords2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead6: [[349.2282314330039,440,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      chords3: [[293.6647679174076,440,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,261.6255653005986,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      chords2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead6: [[587.3295358348151,880,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      chords3: [[174.61411571650194,220,293.6647679174076,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,391.99543598174927,440,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | D2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D1 . . . . . . . . . . . . . . . | D1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('D6 . . . A5 . . . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      chords2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead6: [[349.2282314330039,440,587.3295358348151,880],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[554.3652619537442,783.9908719634985,880,1318.5102276514797],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead5: seq('F6 D6 A5 F5 F6 D6 A5 F5 F6 D6 A5 F5 F6 D6 A5 F5 | F6 D6 A5 F5 F6 D6 A5 F5 F6 D6 A5 F5 F6 D6 A5 F5'),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A7 F7 D7 A6 F6 D6 A5 F5 A7 F7 D7 A6 F6 D6 A5 F5 | A7 F7 D7 A6 F6 D6 A5 F5 A7 F7 D7 A6 F6 D6 A5 F5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead4: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . F6 . . . E6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('A#4 . D5 . F5 . D5 . A#4 . . . A4 . C5 . | A#4 . . . F4 . . . D5 . . . C5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A7 F7 D7 A6 F6 D6 A5 F5 A7 F7 D7 A6 F6 D6 A5 F5 | A7 F7 D7 A6 F6 D6 A5 F5 A7 F7 D7 A6 F6 D6 A5 F5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . D5 . . . F5 . . . E5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . D6 . . . F6 . . . E6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[329.6275569128699,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A1 . A2 A2 A1 . A2 A2 A1 . A2 A2 A1 . A2 A2 | F2 . F3 F3 F2 . F3 F3 F2 . F3 F3 F2 . F3 F3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . A1 . . . A1 . . . A1 . . . A1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A7 E7 C7 A6 E6 C6 A5 E5 A7 E7 C7 A6 E6 C6 A5 E5 | A7 F7 C7 A6 F6 C6 A5 F5 A7 F7 C7 A6 F6 C6 A5 F5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('A5 . C6 . E6 . C6 . A5 . . . G5 . A#5 . | F5 . . . C5 . . . A5 . . . G5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,659.2551138257398],null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,[440,523.2511306011972,698.4564628660078],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
      lead4: seq('A6 . C7 . E7 . C7 . A6 . . . G6 . A#6 . | F6 . . . C6 . . . A6 . . . G6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead7: seq('F5 . A5 . C6 . A5 . F5 . . . E5 . G5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      lead7Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[311.1269837220809,440,493.8833012561241],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      bass: seq('D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 D2 . D3 D3 | D2 . D3 D3 D2 . D3 D3 B1 . C#2 . D2 . D#2 .'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,2,null,2,null,2,null,2,null],
      bass2: seq('. . D1 . . . D1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . C#2 . D2 . D#2 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      lead5: seq('A7 F7 D7 A6 F6 D6 A5 F5 A7 F7 D7 A6 F6 D6 A5 F5 | A7 F7 D7 A6 F6 D6 A5 F5 A7 D#7 B6 A6 . . . .'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('D6 . F6 . A6 . F6 . D6 . . . C6 . E6 . | D6 . . . A5 . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null],
      lead8: [null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . . . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . . . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 | E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 . | G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G2 . G3 G3 G2 . G3 G3 G2 . G3 G3 G2 . G3 G3 | G2 . G3 G3 G2 . G3 G3 G2 . G3 G3 G2 . G3 G3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . G1 . . . G1 . . . G1 . . . G1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('G5 . B5 . D6 . G6 . B6 . G6 . D6 . B5 . | G5 . B5 . D6 . G6 . B6 . G6 . D6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('G5 . B5 . D6 . B5 . G5 . . . F#5 . A5 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('G6 . B6 . D7 . B6 . G6 . . . F#6 . A6 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 | E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 . | G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 | E2 . E3 E3 E2 . E3 E3 B1 . B2 B2 B1 . B2 B2'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . . C1 C1').map((v) => !!v),
      lead5: seq('G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 . | G5 . B5 . E6 . G6 . B6 . F#6 . D#6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . C1 . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[493.8833012561241,622.2539674441618,739.9888454232688],null,null,null,[493.8833012561241,622.2539674441618,739.9888454232688],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 | E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 . | G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 | E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . E1 . . . E1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 . | G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . E5 . . . G5 . . . F#5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . E6 . . . G6 . . . F#6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[369.9944227116344,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B2 B2 B1 . B2 B2 B1 . B2 B2 B1 . B2 B2 | G2 . G3 G3 G2 . G3 G3 G2 . G3 G3 G2 . G3 G3'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . B1 . . . B1 . . . B1 . . . B1 . | . . G1 . . . G1 . . . G1 . . . G1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('F#5 . B5 . D6 . F#6 . B6 . F#6 . D6 . B5 . | G5 . B5 . D6 . G6 . B6 . G6 . D6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('B5 . D6 . F#6 . D6 . B5 . . . A5 . C6 . | G5 . . . D5 . . . B5 . . . A5 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead3: seq('B6 . D7 . F#7 . D7 . B6 . . . A6 . C7 . | G6 . . . D6 . . . B6 . . . A6 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead8: [null,null,[493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[493.8833012561241,587.3295358348151,739.9888454232688],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null,null,null,[493.8833012561241,587.3295358348151,783.9908719634985],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords: [[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 E2 . E3 E3 | E2 . E3 E3 E2 . E3 E3 B1 . B2 B2 B1 . B2 B2'),
      bassLen: [1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1],
      bass2: seq('. . E1 . . . E1 . . . E1 . . . E1 . | . . E1 . . . E1 . . . B1 . . . B1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . . . C1 C1').map((v) => !!v),
      lead5: seq('G5 . B5 . E6 . G6 . B6 . G6 . E6 . B5 . | G5 . B5 . E6 . G6 . B6 . F#6 . D#6 . B5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      lead2: seq('E5 . G5 . B5 . G5 . E5 . . . D5 . F#5 . | E5 . . . B4 . . . B4 . . . F#4 . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . C1 . .').map((v) => !!v),
      lead3: seq('E6 . G6 . B6 . G6 . E6 . . . D6 . F#6 . | E6 . . . B5 . . . B5 . . . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null],
      lead8: [null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[391.99543598174927,493.8833012561241,659.2551138257398],null,null,null,[493.8833012561241,622.2539674441618,739.9888454232688],null,null,null,[493.8833012561241,622.2539674441618,739.9888454232688],null],
      lead8Len: [null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom3: seq('. . . C1 . . C1 . . . . C1 . C1 . . | . . . C1 . . C1 . . . . C1 . C1 . .').map((v) => !!v),
      rim3: seq('. . C1 . . . C1 . . C1 . . . C1 . . | . . C1 . . . C1 . . C1 . . . C1 . .').map((v) => !!v),
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
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . . . A4 . . . F5 . . . E5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,3,null,null,null,2,null,2,null,4,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords3: chordSeq('D4min . . . . . . . . . . . . . . . | D4min . . . . . . . . . . . . . . .'),
      chords3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 . C1 . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 10,
  "style": "eurobeat-hinrg",
  "flavour": "hinrg",
  "options": {
    "style": "eurobeat",
    "mood": "dark",
    "mode": "keep",
    "riffNotes": "keep",
    "length": "medium",
    "customBars": 64,
    "energy": "full",
    "variation": "some",
    "tempo": "style",
    "bpm": 155,
    "hook": "auto",
    "combo": null,
    "flavour": "hinrg",
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
      "source": "add",
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
      "chords": "saws",
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
    "styleId": "eurobeat-hinrg",
    "moodId": "dark",
    "parts": {
      "riff:hook": [
        {
          "id": "syncRazorLead",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "bestPwmBrass",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "tngrBrassSection",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrPopGrand",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "mrdrElectricGrand",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "rmndDxPiano",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "roundMono2",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "tngrClassicSquare",
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
        },
        {
          "id": "bestHeroLead",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "bestPwmHollowLead",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "bestMegaSawLead",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "tngrCrystalTrigger",
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
      "preset": "ds909Snare",
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
      "preset": "bestClassicMono",
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
      "preset": "stSynthStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:piano",
      "preset": "bestPwmBrass",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords3",
      "part": "part:pad",
      "preset": "stSynthStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead2",
      "part": "part:square",
      "preset": "syncRazorLead",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:bell",
      "preset": "mrdrPopGrand",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:megaSaw",
      "preset": "bestHeroLead",
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
      "preset": "syncRazorLead",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:counter",
      "preset": "bestPwmBrass",
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
    "piano": "chords2",
    "pad": "chords3",
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
      "style": "Eurobeat · Hi-NRG",
      "mood": "dark",
      "key": "D minor",
      "reads": "D minor",
      "bars": 64,
      "bpm": 130,
      "seconds": 118,
      "variation": "some",
      "hook": "Grand"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "SPEED ZONE — HAIRPIN · kick, bars 49–56",
        "base": -1.5,
        "before": -1.5,
        "after": -2.1,
        "move": -0.6,
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
        "from": "SPEED ZONE — HAIRPIN · snare, bars 49–56",
        "base": 5.5,
        "before": 5.5,
        "after": -0.5,
        "move": -6,
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
        "from": "SPEED ZONE — HAIRPIN · clap, bars 49–56",
        "base": 1,
        "before": 1,
        "after": -1.3,
        "move": -2.3,
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
        "from": "SPEED ZONE — HAIRPIN · hats, bars 49–56",
        "base": -6,
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
        "lane": "ohats",
        "job": "ohats",
        "how": "sound",
        "from": "SPEED ZONE — HAIRPIN · ohats, bars 49–56",
        "base": -8,
        "before": -8,
        "after": -10,
        "move": -2,
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
        "from": "SPEED ZONE — HAIRPIN · crash, bars 49–56",
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
        "from": "SPEED ZONE — HAIRPIN · TOM Hi, bars 49–56",
        "base": -4,
        "before": -4,
        "after": -4.5,
        "move": -0.5,
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
        "lane": "tom3",
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
        "from": "SPEED ZONE — HAIRPIN · OCTAVE BASS, bars 49–56",
        "base": -6.5,
        "before": -2,
        "after": -7,
        "move": -5,
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
        "from": "BIG-ROOM HOUSE SEED · sub · Sub Sine (starter), bars 45–52",
        "base": -11.1,
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
        "lane": "chords",
        "job": "saws",
        "how": "part",
        "from": "SPEED ZONE — HAIRPIN · STRINGS, bars 49–56",
        "base": -9.54,
        "before": -7,
        "after": -11.7,
        "move": -4.7,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "chords2",
        "job": "piano",
        "how": "part",
        "from": "SPEED ZONE — HAIRPIN · PIANO Chords, bars 37–44",
        "base": -6,
        "before": -6,
        "after": 1.1,
        "move": 7.1,
        "window": [
          24,
          31
        ],
        "calibrated": false
      },
      {
        "lane": "chords3",
        "job": "pad",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · pad · Polar Drift, bars 1–4",
        "base": -11.06,
        "before": -8,
        "after": -11.5,
        "move": -3.5,
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
        "from": "SPEED ZONE — HAIRPIN · RIFF + SOLO Sync Razor, bars 49–56",
        "base": -0.5,
        "before": -0.5,
        "after": -0.7,
        "move": -0.2,
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
        "from": "SPEED ZONE — HAIRPIN · SYNTH LEAD Pop Grand, bars 49–56",
        "base": 3.5,
        "before": 3.5,
        "after": 3.3,
        "move": -0.2,
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
        "after": -2.5,
        "move": 3.5,
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
        "from": "SPEED ZONE — HAIRPIN · ARP Crystal, bars 49–56",
        "base": -17,
        "before": -17,
        "after": -15.1,
        "move": 1.9,
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
        "from": "BIG-ROOM HOUSE SEED · choir · BEST Choir Aah, bars 45–52",
        "base": -11.21,
        "before": -7,
        "after": -8,
        "move": -1,
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
        "after": -10.4,
        "move": -3.4,
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
        "from": "SPEED ZONE — HAIRPIN · BRASS Stabs, bars 49–56",
        "base": -4,
        "before": -4,
        "after": -4,
        "move": 0,
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
          "gain": 0,
          "send": {
            "delay": 0.12,
            "reverb": 0.3
          },
          "pan": -0.05,
          "effects": [
            {
              "id": "exciter",
              "params": {
                "tune": 2500,
                "drive": 0.5,
                "timbre": 0.4,
                "mix": 0.18
              }
            }
          ],
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
        "voice": "ds909KickPunch",
        "voiceParams": null,
        "strip": {
          "gain": -2.1,
          "eq": {
            "low": -1
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f2": 210,
                "g2": -2.5,
                "q2": 1.1
              }
            }
          ]
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
          "gain": -0.5,
          "send": {
            "reverb": 0.2
          },
          "eq": {
            "low": 2.8,
            "high": 5.2
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f3": 3300,
                "g3": -3.5,
                "q3": 0.8
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
          "gain": -1.3,
          "send": {
            "reverb": 0.4
          },
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
        "voice": "dsHatClosed",
        "voiceParams": null,
        "strip": {
          "gain": -9.1,
          "pan": 0.25
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
          "gain": -10,
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
          "gain": -5,
          "pan": -0.2,
          "send": {
            "reverb": 0.8
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
          "dur": 3.6923076923076925,
          "note": "White noise through a band climbing 250 Hz to 8 kHz over 3.69s as it fades in: the lift into a drop.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 3.6923076923076925,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 3.3969230769230774,
            "hold": 0,
            "decay": 0.2953846153846154,
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
          "gain": -4.5,
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
        "label": "BASS Gallop · Classic Mono",
        "voice": "bestClassicMono",
        "voiceParams": null,
        "strip": {
          "gain": -7,
          "effects": [
            {
              "id": "filter",
              "params": {
                "type": "lowpass",
                "frequency": 1600,
                "Q": 1
              }
            }
          ]
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
          "gain": -11
        },
        "noteFX": null
      },
      {
        "role": "saws",
        "lane": "chords",
        "label": "CHORDS · String Machine",
        "voice": "stSynthStrings",
        "voiceParams": null,
        "strip": {
          "gain": -11.7,
          "send": {
            "reverb": 0.4
          },
          "eq": {
            "low": -3
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f2": 400,
                "g2": -2.5,
                "q2": 0.9
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords2",
        "label": "BRASS Stabs · PWM Brass",
        "voice": "bestPwmBrass",
        "voiceParams": null,
        "strip": {
          "gain": 1.1,
          "pan": 0.15,
          "send": {
            "reverb": 0.3
          }
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords3",
        "label": "PAD · String Machine",
        "voice": "stSynthStrings",
        "voiceParams": null,
        "strip": {
          "gain": -11.5,
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
        "label": "HOOK DOUBLE · Sync Razor Lead",
        "voice": "syncRazorLead",
        "voiceParams": null,
        "strip": {
          "gain": -0.7,
          "send": {
            "delay": 0.2,
            "reverb": 0.25
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f3": 3200,
                "g3": -6,
                "q3": 0.6
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "bell",
        "lane": "lead3",
        "label": "HOOK 8VA · Bright Pop Grand",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": 3.3,
          "send": {
            "delay": 0.15,
            "reverb": 0.3
          },
          "eq": {
            "high": 1.5
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f2": 450,
                "g2": -2,
                "q2": 0.9
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "megaSaw",
        "lane": "lead4",
        "label": "LEAD 8VA · Hero Lead",
        "voice": "bestHeroLead",
        "voiceParams": null,
        "strip": {
          "gain": -2.5,
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
          "gain": -15.1,
          "pan": 0.3,
          "send": {
            "delay": 0.2
          }
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
          "gain": -8,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead7",
        "label": "THIRD BELOW · Sync Razor Lead",
        "voice": "syncRazorLead",
        "voiceParams": null,
        "strip": {
          "gain": -10.4,
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
        "label": "STABS · PWM Brass",
        "voice": "bestPwmBrass",
        "voiceParams": null,
        "strip": {
          "gain": -4,
          "pan": -0.25,
          "send": {
            "reverb": 0.25
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
        "notes": "a9ba8507",
        "voice": "eced1f8e",
        "auto": "48f78757",
        "expression": "77074ba4",
        "production": "67950eff"
      },
      "kick": {
        "notes": "8aec7ace",
        "voice": "9f0161bb",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "4f418cc2"
      },
      "snare": {
        "notes": "feb8725c",
        "voice": "c3b485de",
        "auto": "6b1cfdcb",
        "expression": "77074ba4",
        "production": "5e0ed008"
      },
      "clap": {
        "notes": "14af3f06",
        "voice": "e8d9ed1",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "102c161"
      },
      "hats": {
        "notes": "685d8bd1",
        "voice": "66d7c48",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "6029993e",
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
        "production": "ce4dd3c6"
      },
      "riser": {
        "notes": "ad6eb166",
        "voice": "7171ec9f",
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
        "notes": "2ac014f3",
        "voice": "e0417259",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
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
        "notes": "72514c4c",
        "voice": "3a2aa821",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "5669ee5f"
      },
      "sub": {
        "notes": "a55c9eaa",
        "voice": "94966028",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "saws": {
        "notes": "19595a19",
        "voice": "f817c4db",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "c678c5c3"
      },
      "piano": {
        "notes": "ac5f426d",
        "voice": "2beb46e7",
        "auto": "944c7053",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "pad": {
        "notes": "224c5a89",
        "voice": "f817c4db",
        "auto": "944c7053",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "ad07cf3c",
        "voice": "a84415ab",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "82f165bb"
      },
      "bell": {
        "notes": "69c44ef7",
        "voice": "1605d054",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "7c015fb3"
      },
      "megaSaw": {
        "notes": "1b273511",
        "voice": "ab0a90fa",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "arp": {
        "notes": "aa3fecfd",
        "voice": "7537d16d",
        "auto": "f4c42159",
        "expression": "77074ba4",
        "production": "5979fdad"
      },
      "choir": {
        "notes": "d796b08e",
        "voice": "e9a11dc1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "838f09a4",
        "voice": "a84415ab",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "9d67ae27",
        "voice": "2beb46e7",
        "auto": "6b639b5b",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      }
    },
    "master": "9f72ff1d"
  },
  "seedOf": "eurobeat-hinrg",
  "made": "2026-10-08T16:41:39.183Z"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.1 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "rim3", from: "rim", independent: true }, { key: "tom3", from: "tom", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","tom2","rim","rim2","rim3","tom3","crash3","bass","bass2","chords","chords2","chords3","lead","lead2","lead3","lead4","lead5","lead6","lead7","lead8"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"IMPACT","tom2":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","rim3":"PERC Cowbell","tom3":"PERC Congas","crash3":"RIDE","bass":"BASS Gallop · Classic Mono","bass2":"SUB · Sub Sine","chords":"CHORDS · String Machine","chords2":"BRASS Stabs · PWM Brass","chords3":"PAD · String Machine","lead":"RIFF Grand · HOOK","lead2":"HOOK DOUBLE · Sync Razor Lead","lead3":"HOOK 8VA · Bright Pop Grand","lead4":"LEAD 8VA · Hero Lead","lead5":"ARP · Sparkle Pluck","lead6":"CHOIR · Synth Choir Aah","lead7":"THIRD BELOW · Sync Razor Lead","lead8":"STABS · PWM Brass"},
  voice: {"kickVoice":"ds909KickPunch","snareVoice":"ds909Snare","clapVoice":"clapRoom","hatsVoice":"dsHatClosed","ohatsVoice":"ds909OpenHat","crashVoice":"ds909Crash","tomVoice":"syn3PewDeep","tom2Voice":"ds909Tom","rimVoice":"shaker","rim2Voice":"tambourine","rim3Voice":"ds808Cowbell","tom3Voice":"congaMid","crash3Voice":"ride909SixBit","bassVoice":"bestClassicMono","bass2Voice":"stSubSine","chordsVoice":"stSynthStrings","chords2Voice":"bestPwmBrass","chords3Voice":"stSynthStrings","leadVoice":"mrdrElectricGrand","lead2Voice":"syncRazorLead","lead3Voice":"mrdrPopGrand","lead4Voice":"bestHeroLead","lead5Voice":"tngrCrystalTrigger","lead6Voice":"bestChoirAah","lead7Voice":"syncRazorLead","lead8Voice":"bestPwmBrass"},
  voiceParams: {"crash2Voice":{"label":"Noise Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":3.6923076923076925,"note":"White noise through a band climbing 250 Hz to 8 kHz over 3.69s as it fades in: the lift into a drop.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":3.6923076923076925,"Q":1.6,"slope":-24,"color":"white","attack":3.3969230769230774,"hold":0,"decay":0.2953846153846154,"curve":"exp","gain":1},"drive":0.08,"peak":0.034}},
  lanes: {
    kick: { gain: -2.1, eq: { low: -1 }, effects: [{ id: "peq", params: { f2: 210, g2: -2.5, q2: 1.1 } }] },
    snare: { gain: -0.5, send: { reverb: 0.2 }, eq: { low: 2.8, high: 5.2 }, effects: [{ id: "peq", params: { f3: 3300, g3: -3.5, q3: 0.8 } }] },
    clap: { gain: -1.3, send: { reverb: 0.4 }, effects: [{ id: "reverb", params: { decay: 1.8, preDelay: 0.005, wet: 0.5 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.08 } }] },
    hats: { gain: -9.1, pan: 0.25 },
    ohats: { gain: -10, pan: -0.2 },
    crash: { gain: -5, pan: -0.2, send: { reverb: 0.8 } },
    crash2: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -3, send: { reverb: 0.6 } },
    tom2: { gain: -4.5, pan: 0.3, send: { reverb: 0.35 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    rim3: { gain: -13, pan: 0.25, send: { reverb: 0.15 } },
    tom3: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    crash3: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -7, effects: [{ id: "filter", params: { type: "lowpass", frequency: 1600, Q: 1 } }] },
    bass2: { gain: -11 },
    chords: { gain: -11.7, send: { reverb: 0.4 }, eq: { low: -3 }, effects: [{ id: "peq", params: { f2: 400, g2: -2.5, q2: 0.9 } }] },
    chords2: { gain: 1.1, pan: 0.15, send: { reverb: 0.3 } },
    chords3: { gain: -11.5, send: { reverb: 0.5 }, eq: { low: -4 } },
    lead: { pan: -0.05, send: { delay: 0.12, reverb: 0.3 }, eq: { high: 2 }, effects: [{ id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.18 } }] },
    lead2: { gain: -0.7, send: { delay: 0.2, reverb: 0.25 }, effects: [{ id: "peq", params: { f3: 3200, g3: -6, q3: 0.6 } }] },
    lead3: { gain: 3.3, send: { delay: 0.15, reverb: 0.3 }, eq: { high: 1.5 }, effects: [{ id: "peq", params: { f2: 450, g2: -2, q2: 0.9 } }] },
    lead4: { gain: -2.5, send: { reverb: 0.25 }, eq: { low: -3 } },
    lead5: { gain: -15.1, pan: 0.3, send: { delay: 0.2 } },
    lead6: { gain: -8, send: { reverb: 0.5 } },
    lead7: { gain: -10.4, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead8: { gain: -4, pan: -0.25, send: { reverb: 0.25 } },
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
    chords3: {
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
      points: [[5,0,0],[5,0,-10],[9,0,0],[33,0,0],[33,0,-10],[37,0,0]],
      cuts: [[44,12]],
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
          from: [36,12],
          to: [37,0],
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
