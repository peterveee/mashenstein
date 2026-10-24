// LULLABY AFTER DARK · ITALO DISCO — one song: what it plays, how it is arranged, how it sounds.
//
// Based on Johannes Brahms' Wiegenlied (Lullaby and Goodnight), Op. 49 No. 4.
// The public-domain opening melody is adapted from 3/4 to this 4/4 arrangement.
// Italo Disco at 118 BPM; the melody is recast in harmonic mode.
// An off-beat answering voice, wild phrase variations and layered counter-lines play against the hook.
// Source score: https://github.com/OpenScore/Lieder/blob/main/scores/Brahms,_Johannes/5_Lieder,_Op.49/4_Wiegenlied/lc5701612.mscx
// Regenerate with node tools/make-brahms-remixes.js --force.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "brahms-lullaby-italo";
export const title = "LULLABY AFTER DARK · ITALO DISCO";
export const slug = "brahms-lullaby-italo";
export const group = "imported";
export const seed = 4904;

export const bank = {
  bpm: 118,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead9: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . . . . . F#4 . . . F#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . F5 . . . C#5 . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . C5 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . F#4 . . . A#4 .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 . . . .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,null,null,null,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 . . . .'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . F#1 . . . F#1 . . . F#1 . . . F#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A4 F5 C5 A5 A4 F5 C5 A5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . A4 . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . A4 . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . F4 . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . A5 . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . . . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('C#5 . . . C5 . . . A#4 . C5 . C#5 . D#5 . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . A5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C#5 . . . C5 . . . A#4 . C5 . C#5 . D#5 . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A#4 . . . A4 . . . F#4 . A4 . A#4 . C5 . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('C#6 . . . C6 . . . A#5 . C6 . C#6 . D#6 . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('C5 . . . A#4 . F#4 . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . F#1 . . . F#1 . . . F#1 . . . F#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C5 . . . A#4 . F#4 . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . D#4 . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . F#5 . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . F#4 . . . F4 . F#4 . G#4 . F5 . | C#5 . C5 . A#4 . C5 . C5 . . . A4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A4 F5 C5 A5 A4 F5 C5 A5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('G#4 . . . F#4 . . . F4 . F#4 . G#4 . F5 . | C#5 . C5 . A#4 . C5 . C5 . . . A4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . D#4 . . . C#4 . D#4 . F4 . C#5 . | A#4 . A4 . F#4 . A4 . A4 . . . F4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead4: seq('G#5 . . . F#5 . . . F5 . F#5 . G#5 . F6 . | C#6 . C6 . A#5 . C6 . C6 . . . A5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . F#1 . . . F#1 . . . F#1 . . . F#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A4 F5 C5 A5 A4 F5 C5 A5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | F#4 . . . . . . . F#4 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,233.08188075904496,311.1269837220809,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[554.3652619537442,698.4564628660078,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618,932.3275230361799],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . . . . . . . . . | F#4 . . . . . . . F#4 . . . . . . .'),
      leadLen: [12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,369.9944227116344,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [6,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[466.1637615180899,698.4564628660078,739.9888454232688,1108.7305239074883],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,554.3652619537442,698.4564628660078,932.3275230361799],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . . . . . . . . . | F#4 . . . . . . . A#4 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,233.08188075904496,311.1269837220809,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[554.3652619537442,698.4564628660078,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618,932.3275230361799],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D#5 . . . . . . . C#5 . . . . . . . | . . . . . . . . C5 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,369.9944227116344,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D#6 . . . C#6 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[466.1637615180899,698.4564628660078,739.9888454232688,1108.7305239074883],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[440,622.2539674441618,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 . . . .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,null,null,null,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . A#1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 . . . .'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: [null,null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,[622.2539674441618,1244.5079348883237],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . A5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('C#6 . . . . . . . A#5 . . . C#6 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('C#6 . . . . . . . A#5 . . . C#6 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[523.2511306011972,1046.5022612023945],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . F#1 . . . F#1 . . . F#1 . . . F#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[415.3046975799451,830.6093951598903],null,null,null,null,null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[554.3652619537442,1108.7305239074883],null,[523.2511306011972,1046.5022612023945],null,[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,null,null,[349.2282314330039,698.4564628660078],null,null,null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A4 F5 C5 A5 A4 F5 C5 A5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . C1 . C1 .').map((v) => !!v),
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead5: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [null,null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[369.9944227116344,739.9888454232688],null,[440,880],null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . A4 . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . F4 . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . A5 . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . . . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . F#5 . . . F#5 . A5 . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,null,null,[369.9944227116344,739.9888454232688],null,[440,880],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,null,null,[622.2539674441618,1244.5079348883237],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null],
      leadLen: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 A#4 F#5 D#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('A#4 . . . A4 . . . F#4 . A4 . A#4 . C5 . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . . . F4 . . . D#4 . F4 . F#4 . A#4 . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . A5 . . . F#5 . A5 . A#5 . C6 . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('A#5 . . . A5 . . . F#5 . A5 . A#5 . C6 . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead5Len: [3,null,null,null,3,null,null,null,2,null,2,null,2,null,2,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[523.2511306011972,1046.5022612023945],null,null,null,[466.1637615180899,932.3275230361799],null,[369.9944227116344,739.9888454232688],null,[349.2282314330039,698.4564628660078],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . F#1 . . . F#1 . . . F#1 . . . F#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5 A#4 F#5 C#5 A#5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('C5 . . . A#4 . F#4 . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . D#4 . C#4 . . . D#4 . . . | F#4 . . . A#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . F#5 . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('C6 . . . A#5 . F#5 . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[415.3046975799451,830.6093951598903],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[349.2282314330039,698.4564628660078],null,[369.9944227116344,739.9888454232688],null,[415.3046975799451,830.6093951598903],null,[698.4564628660078,1396.9129257320155],null,[554.3652619537442,1108.7305239074883],null,[523.2511306011972,1046.5022612023945],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,null,null,[440,880],null,null,null],
      leadLen: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,[261.6255653005986,349.2282314330039,440],null],
      chordsLen: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 | A#4 F5 C#5 A#5 A#4 F5 C#5 A#5 A4 F5 C5 A5 A4 F5 C5 A5'),
      lead6Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('G#4 . . . F#4 . . . F4 . F#4 . G#4 . F5 . | C#5 . C5 . A#4 . C5 . C5 . . . A4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . D#4 . . . C#4 . D#4 . F4 . C#5 . | A#4 . A4 . F#4 . A4 . A4 . . . F4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead4: seq('G#5 . . . F#5 . . . F5 . F#5 . G#5 . F6 . | C#6 . C6 . A#5 . C6 . C6 . . . A5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead5: seq('G#5 . . . F#5 . . . F5 . F#5 . G#5 . F6 . | C#6 . C6 . A#5 . C6 . C6 . . . A5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . . . . . F#4 . . . F#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . F5 . . . C#5 . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . C5 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . F#4 . . . A#4 .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 11,
  "style": "italo-disco",
  "options": {
    "style": "italo-disco",
    "mood": "boss",
    "mode": "harmonic",
    "riffNotes": "fit",
    "length": "custom",
    "customBars": 64,
    "energy": "maximum",
    "variation": "wild",
    "tempo": "style",
    "bpm": 118,
    "hook": "auto",
    "combo": null,
    "flavour": "style",
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
      "hardStop": true,
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
      "shaker": true,
      "tambourine": true,
      "congas": false,
      "cowbell": false,
      "ride": true
    },
    "parts": {
      "bass": "funk",
      "sub": true,
      "chords": "stabs",
      "square": true,
      "bell": true,
      "octaveDouble": true,
      "riffBass": "replace",
      "bassLift": true,
      "thirdBelow": true,
      "arp": true,
      "arpPattern": "syncopated",
      "choir": true,
      "counter": true,
      "fillIn": "passing",
      "fillEvery": "2",
      "fillNotes": "all",
      "writeLead": "auto",
      "riffSound": "keep",
      "partSounds": "roll",
      "soundSet": "style"
    },
    "spot": {
      "intoDrop": "style",
      "outOf": "style",
      "quiet": "none",
      "intro": "style",
      "ending": "style",
      "riser": "varied"
    },
    "fx": {
      "gate": "style",
      "riser": false,
      "riserWay": "varied",
      "dropHit": "varied",
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
  "seed": 4904,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "italo-disco",
    "moodId": "boss",
    "parts": {}
  },
  "palette": [
    {
      "lane": "kick",
      "part": "part:kick",
      "preset": "kit_syndrum_disco_kick",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "snare",
      "part": "part:snare",
      "preset": "kit_syndrum_disco_snare",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "kit_syndrum_disco_clap",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "hats",
      "part": "part:hats",
      "preset": "kit_syndrum_disco_hats",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "ohats",
      "part": "part:ohats",
      "preset": "kit_syndrum_disco_ohats",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "crash",
      "part": "part:crash",
      "preset": "kit_syndrum_disco_crash",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom",
      "part": "part:fill",
      "preset": "kit_syndrum_disco_tom",
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
      "part": "part:saws",
      "preset": "stSynthStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "stSynthStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:square",
      "preset": "tngrBerlinSignal",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:bell",
      "preset": "seedTranceBell",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:megaSaw",
      "preset": "tngrHorizonSolo",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:arp",
      "preset": "seedTranceArp",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
      "part": "part:choir",
      "preset": "bestChoirAah",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:third",
      "preset": "tngrDigitalEp84",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead9",
      "part": "part:counter",
      "preset": "seedTranceArp",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    }
  ],
  "riff": {
    "version": 1,
    "source": {
      "id": "brahms-wiegenlied-op49-4",
      "title": "Brahms: Wiegenlied, Op. 49 No. 4",
      "from": 0,
      "to": 7,
      "bpm": 92
    },
    "bars": 8,
    "grid": 16,
    "stats": {},
    "parts": [
      {
        "key": "lead",
        "label": "Lullaby melody",
        "kind": "melodic",
        "role": "hook",
        "meanPitch": 70,
        "voice": "bestRobotVox",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          ". . . . . . . . G4:2 . . . G4:2 . . .",
          "A#4:6 . . . . . . . G4:2 . . . G4:4 . . .",
          "A#4:4 . . . . . . . G4:2 . . . A#4:2 . . .",
          "D#5:4 . . . D5:6 . . . . . . . C5:2 . . .",
          "C5:4 . . . A#4:4 . . . F4:2 . . . G4:2 . . .",
          "G#4:4 . . . F4:4 . . . F4:2 . . . G4:2 . . .",
          "G#4:4 . . . . . . . F4:2 . . . G#4:2 . . .",
          "D5:2 . C5:2 . A#4:4 . . . D5:4 . . . D#5:4 . . ."
        ]
      },
      {
        "key": "lead2",
        "label": "After-hours answer",
        "kind": "melodic",
        "role": "counter",
        "meanPitch": 73,
        "voice": "tngrBerlinSignal",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          ". . . F5:2 . . . D5:1 . . . . . . . .",
          ". . . . . . F5:2 . . . D5:2 . . . . .",
          ". . . . F5:2 . . . . . D5:2 . . . . .",
          ". . . . . . . . . . G4:2 . . . A#4:2 .",
          ". . . . . . . . . . D5:2 . . . F5:2 .",
          ". . . . . . . . . . C5:2 . . . D5:2 .",
          ". . . . D5:2 . . . . . F5:2 . . . . .",
          ". . . . . . G4:2 . . . . . . . . ."
        ]
      }
    ]
  },
  "source": {
    "id": "brahms-wiegenlied-op49-4",
    "title": "Brahms: Wiegenlied, Op. 49 No. 4",
    "from": 0,
    "to": 7
  },
  "take": 1,
  "laneOf": {
    "hook": "lead",
    "riff:lead2": "lead2",
    "kick": "kick",
    "snare": "snare",
    "clap": "clap",
    "hats": "hats",
    "ohats": "ohats",
    "crash": "crash",
    "fill": "tom",
    "shaker": "rim",
    "tambourine": "rim2",
    "ride": "crash2",
    "bass": "bass",
    "sub": "bass2",
    "saws": "chords",
    "pad": "chords2",
    "square": "lead3",
    "bell": "lead4",
    "megaSaw": "lead5",
    "arp": "lead6",
    "choir": "lead7",
    "third": "lead8",
    "counter": "lead9"
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
      "mood": "boss",
      "key": "A# harmonic minor",
      "reads": "A# major",
      "bars": 64,
      "bpm": 118,
      "seconds": 130,
      "variation": "wild",
      "hook": "Lullaby melody"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "ITALO DISCO SEED · kick · =909 Kick, bars 45–52",
        "base": 0,
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
        "lane": "snare",
        "job": "snare",
        "how": "sound",
        "from": "ITALO DISCO SEED · snare · =808 Snare, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -8,
        "move": -5,
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
        "from": "ITALO DISCO SEED · clap · Big Room Clap · Trance, bars 45–52",
        "base": 1.5,
        "before": 1.5,
        "after": 5.9,
        "move": 4.4,
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
        "from": "ITALO DISCO SEED · hats · =CR78 Hat, bars 45–52",
        "base": -0.3,
        "before": -0.3,
        "after": -0.1,
        "move": 0.2,
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
        "from": "ITALO DISCO SEED · ohats · =808 Open Hat, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -5.8,
        "move": 4.2,
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
        "from": "ITALO DISCO SEED · crash · =909 Crash, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -10.4,
        "move": -0.4,
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
        "from": "ITALO DISCO SEED · fill · Syndrum · Disco Tom, bars 52–59",
        "base": -6,
        "before": -6,
        "after": -10,
        "move": -4,
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
        "from": "ITALO DISCO SEED · shaker · Shaker, bars 45–52",
        "base": -12.6,
        "before": -12.6,
        "after": -12.6,
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
        "from": "ITALO DISCO SEED · tambourine · Tambourine, bars 45–52",
        "base": -9.4,
        "before": -9.4,
        "after": -9.4,
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
        "from": "ITALO DISCO SEED · ride · Ride · 909 Six-Bit, bars 45–52",
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
        "from": "ITALO DISCO SEED · bass · =BASS 80s FM, bars 45–52",
        "base": -5.2,
        "before": -5.2,
        "after": -4.4,
        "move": 0.8,
        "window": [
          44,
          51
        ],
        "calibrated": true
      },
      {
        "lane": "bass2",
        "job": "sub",
        "how": "part",
        "from": "ITALO DISCO SEED · sub · Sub Sine (starter), bars 45–52",
        "base": -16.1,
        "before": -16.1,
        "after": -17.4,
        "move": -1.3,
        "window": [
          44,
          51
        ],
        "calibrated": true
      },
      {
        "lane": "chords",
        "job": "saws",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · saws · Super Saw, bars 45–52",
        "base": -10.08,
        "before": 4,
        "after": -8.1,
        "move": -12.1,
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
        "from": "ITALO DISCO SEED · pad · Polar Drift, bars 45–52",
        "base": -5.9,
        "before": -5.9,
        "after": -8.5,
        "move": -2.6,
        "window": [
          0,
          3
        ],
        "calibrated": true
      },
      {
        "lane": "lead3",
        "job": "square",
        "how": "part",
        "from": "ITALO DISCO SEED · square · Berlin Signal, bars 45–52",
        "base": -6.6,
        "before": -6.6,
        "after": -7.4,
        "move": -0.8,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead4",
        "job": "bell",
        "how": "part",
        "from": "ITALO DISCO SEED · bell · Ice Bell, bars 45–52",
        "base": -9.1,
        "before": -9.1,
        "after": -9.7,
        "move": -0.6,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead5",
        "job": "megaSaw",
        "how": "part",
        "from": "ITALO DISCO SEED · megaSaw · Horizon Solo, bars 45–52",
        "base": -12.2,
        "before": -12.2,
        "after": -12.6,
        "move": -0.4,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead6",
        "job": "arp",
        "how": "part",
        "from": "ITALO DISCO SEED · arp · Crystal Trigger, bars 45–52",
        "base": -22.5,
        "before": -22.5,
        "after": -22.9,
        "move": -0.4,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead7",
        "job": "choir",
        "how": "part",
        "from": "ITALO DISCO SEED · choir · BEST Choir Aah, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -11.2,
        "move": -1.2,
        "window": [
          44,
          51
        ],
        "calibrated": true
      },
      {
        "lane": "lead8",
        "job": "third",
        "how": "part",
        "from": "ITALO DISCO SEED · third · Digital EP 84, bars 45–52",
        "base": -4.8,
        "before": -4.8,
        "after": -2.6,
        "move": 2.2,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead9",
        "job": "counter",
        "how": "part",
        "from": "ITALO DISCO SEED · counter · Crystal Trigger, bars 46–53",
        "base": -8,
        "before": -8,
        "after": -7.8,
        "move": 0.2,
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
        "label": "RIFF Lullaby melody · HOOK",
        "voice": "bestRobotVox",
        "voiceParams": null,
        "strip": {
          "gain": -5,
          "send": {
            "delay": 0.25,
            "reverb": 0.4
          },
          "pan": 0.05,
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
        "role": "riff:lead2",
        "lane": "lead2",
        "label": "RIFF After-hours answer",
        "voice": "tngrBerlinSignal",
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
        "voice": "kit_syndrum_disco_kick",
        "voiceParams": null,
        "strip": {
          "gain": 0.3
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "SNARE Roll",
        "voice": "kit_syndrum_disco_snare",
        "voiceParams": null,
        "strip": {
          "gain": -8,
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
        "voice": "kit_syndrum_disco_clap",
        "voiceParams": null,
        "strip": {
          "gain": 5.9,
          "send": {
            "reverb": 0.378
          },
          "eq": {
            "mid": 1.9,
            "high": 0.4
          }
        },
        "noteFX": null
      },
      {
        "role": "hats",
        "lane": "hats",
        "label": "HATS",
        "voice": "kit_syndrum_disco_hats",
        "voiceParams": null,
        "strip": {
          "gain": -0.1,
          "pan": -0.2
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "kit_syndrum_disco_ohats",
        "voiceParams": null,
        "strip": {
          "gain": -5.8,
          "pan": 0.2
        },
        "noteFX": null
      },
      {
        "role": "crash",
        "lane": "crash",
        "label": "CRASH",
        "voice": "kit_syndrum_disco_crash",
        "voiceParams": null,
        "strip": {
          "gain": -10.4,
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
        "voice": "kit_syndrum_disco_tom",
        "voiceParams": null,
        "strip": {
          "gain": -10,
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
          "gain": -12.6,
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
          "gain": -9.4,
          "pan": -0.3,
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
        "label": "BASS · =80s FM Bass · Italo Disco",
        "voice": "bass80sFM",
        "voiceParams": null,
        "strip": {
          "gain": -4.4
        },
        "noteFX": null
      },
      {
        "role": "sub",
        "lane": "bass2",
        "label": "SUB · Sub Sine · Italo Disco",
        "voice": "stSubSine",
        "voiceParams": null,
        "strip": {
          "gain": -17.4
        },
        "noteFX": null
      },
      {
        "role": "saws",
        "lane": "chords",
        "label": "CHORDS Stabs · String Machine",
        "voice": "stSynthStrings",
        "voiceParams": null,
        "strip": {
          "gain": -8.1,
          "eq": {
            "low": -3
          },
          "send": {
            "reverb": 0.25
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
        "role": "pad",
        "lane": "chords2",
        "label": "STRINGS · String Machine",
        "voice": "stSynthStrings",
        "voiceParams": null,
        "strip": {
          "gain": -8.5,
          "send": {
            "reverb": 0.5
          },
          "eq": {
            "low": -5
          }
        },
        "noteFX": null
      },
      {
        "role": "square",
        "lane": "lead3",
        "label": "HOOK DOUBLE · Bright Glide Lead · Italo Disco",
        "voice": "tngrBerlinSignal",
        "voiceParams": null,
        "strip": {
          "gain": -7.4,
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
        "lane": "lead4",
        "label": "HOOK 8VA · Ice Bell · Italo Disco",
        "voice": "seedTranceBell",
        "voiceParams": null,
        "strip": {
          "gain": -9.7,
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
        "lane": "lead5",
        "label": "LEAD 8VA · Legato Solo Lead · Italo Disco",
        "voice": "tngrHorizonSolo",
        "voiceParams": null,
        "strip": {
          "gain": -12.6,
          "send": {
            "reverb": 0.35
          }
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead6",
        "label": "ARP · Sparkle Pluck · Italo Disco",
        "voice": "seedTranceArp",
        "voiceParams": null,
        "strip": {
          "gain": -22.9,
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
        "lane": "lead7",
        "label": "CHOIR · Synth Choir Aah · Italo Disco",
        "voice": "bestChoirAah",
        "voiceParams": null,
        "strip": {
          "gain": -11.2,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead8",
        "label": "THIRD BELOW · Digital E-Piano · Italo Disco",
        "voice": "tngrDigitalEp84",
        "voiceParams": null,
        "strip": {
          "gain": -2.6,
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
        "lane": "lead9",
        "label": "COUNTER-MELODY · Sparkle Pluck · Italo Disco",
        "voice": "seedTranceArp",
        "voiceParams": null,
        "strip": {
          "gain": -7.8,
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
    "decisions": [
      {
        "role": "hook",
        "lane": "lead",
        "origin": "Style preset",
        "section": "Drop",
        "sectionId": "club:drop:1",
        "chain": [
          {
            "id": "delay",
            "params": {
              "sync": 1,
              "division": 0.75,
              "feedback": 0.6,
              "wet": 0.5
            }
          }
        ],
        "from": [
          32,
          12
        ],
        "to": [
          33,
          0
        ],
        "status": "Applied",
        "effects": [
          "delay"
        ],
        "ranges": [
          [
            [
              32,
              12
            ],
            [
              33,
              0
            ]
          ]
        ],
        "reason": "Adapted the saved part effect to the matching section"
      }
    ]
  },
  "prints": {
    "roles": {
      "hook": {
        "notes": "adad5c19",
        "voice": "a364122b",
        "auto": "59199ae3",
        "expression": "77074ba4",
        "production": "df74fe68"
      },
      "riff:lead2": {
        "notes": "cb292d9d",
        "voice": "a2fb0683",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "kick": {
        "notes": "7df628cb",
        "voice": "2f63c6e7",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "d7cf5509",
        "voice": "a56b87c0",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "clap": {
        "notes": "54694e65",
        "voice": "42fcec53",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3d15a924"
      },
      "hats": {
        "notes": "d5a9cd05",
        "voice": "f93a8033",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "e293761d",
        "voice": "b9c9426a",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "9285c3df",
        "voice": "2c28e31e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "fill": {
        "notes": "327f2243",
        "voice": "31cca3db",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "shaker": {
        "notes": "6368f53d",
        "voice": "6957585e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "90d964f3",
        "voice": "b14ac332",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "ride": {
        "notes": "121261bd",
        "voice": "a6101fa8",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "ef0eef1e",
        "voice": "af74276f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "15d1ce65",
        "voice": "69c896f0",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "saws": {
        "notes": "258dc3",
        "voice": "f817c4db",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b57fa6ed"
      },
      "pad": {
        "notes": "f5761605",
        "voice": "f817c4db",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "ba0e4b81",
        "voice": "fbedbe93",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5327d298"
      },
      "bell": {
        "notes": "b54ac306",
        "voice": "5d411c79",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "b0ac4373",
        "voice": "d38bd6d3",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "arp": {
        "notes": "bbb0c5c9",
        "voice": "ec38b869",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "fe56ac4"
      },
      "choir": {
        "notes": "e4c06196",
        "voice": "5ad94883",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "96f6dd03",
        "voice": "9aac38b9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "7eb5fd",
        "voice": "1c39dbe",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "181c5976"
      }
    },
    "master": "f52c1fee"
  }
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }, { key: "lead9", from: "lead", independent: true }, { key: "lead2", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","rim","rim2","crash2","bass","bass2","chords","chords2","lead","lead3","lead4","lead5","lead6","lead7","lead8","lead9","lead2"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"DISCO TOM","rim":"PERC Shaker","rim2":"PERC Tambourine","crash2":"RIDE","bass":"BASS · =80s FM Bass · Italo Disco","bass2":"SUB · Sub Sine · Italo Disco","chords":"CHORDS Stabs · String Machine","chords2":"STRINGS · String Machine","lead":"RIFF Lullaby melody · HOOK","lead3":"HOOK DOUBLE · Bright Glide Lead · Italo Disco","lead4":"HOOK 8VA · Ice Bell · Italo Disco","lead5":"LEAD 8VA · Legato Solo Lead · Italo Disco","lead6":"ARP · Sparkle Pluck · Italo Disco","lead7":"CHOIR · Synth Choir Aah · Italo Disco","lead8":"THIRD BELOW · Digital E-Piano · Italo Disco","lead9":"COUNTER-MELODY · Sparkle Pluck · Italo Disco","lead2":"RIFF After-hours answer"},
  voice: {"kickVoice":"kit_syndrum_disco_kick","snareVoice":"kit_syndrum_disco_snare","clapVoice":"kit_syndrum_disco_clap","hatsVoice":"kit_syndrum_disco_hats","ohatsVoice":"kit_syndrum_disco_ohats","crashVoice":"kit_syndrum_disco_crash","tomVoice":"kit_syndrum_disco_tom","rimVoice":"shaker","rim2Voice":"tambourine","crash2Voice":"ride909SixBit","bassVoice":"bass80sFM","bass2Voice":"stSubSine","chordsVoice":"stSynthStrings","chords2Voice":"stSynthStrings","leadVoice":"bestRobotVox","lead3Voice":"tngrBerlinSignal","lead4Voice":"seedTranceBell","lead5Voice":"tngrHorizonSolo","lead6Voice":"seedTranceArp","lead7Voice":"bestChoirAah","lead8Voice":"tngrDigitalEp84","lead9Voice":"seedTranceArp","lead2Voice":"tngrBerlinSignal"},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: 0.3 },
    snare: { gain: -8, send: { reverb: 0.35 } },
    clap: { gain: 5.9, send: { reverb: 0.378 }, eq: { mid: 1.9, high: 0.4 } },
    hats: { gain: -0.1, pan: -0.2 },
    ohats: { gain: -5.8, pan: 0.2 },
    crash: { gain: -10.4, pan: 0.2, send: { reverb: 0.5 } },
    tom: { gain: -10, pan: 0.15, send: { reverb: 0.3 } },
    rim: { gain: -12.6, pan: 0.3 },
    rim2: { gain: -9.4, pan: -0.3, send: { reverb: 0.15 } },
    crash2: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -4.4 },
    bass2: { gain: -17.4 },
    chords: { gain: -8.1, send: { reverb: 0.25 }, eq: { low: -3 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    chords2: { gain: -8.5, send: { reverb: 0.5 }, eq: { low: -5 } },
    lead: { gain: -5, pan: 0.05, send: { delay: 0.25, reverb: 0.4 }, eq: { high: 2 }, effects: [{ id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.18 } }] },
    lead3: { gain: -9.8, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead4: { gain: -9.7, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead5: { gain: -12.8, send: { reverb: 0.35 } },
    lead6: { gain: -22.9, pan: -0.25, effects: [{ id: "pingpong", params: { sync: 1, division: 0.75, feedback: 0.35, wet: 0.3 } }] },
    lead7: { gain: -11.2, send: { reverb: 0.5 } },
    lead8: { gain: -2.6, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead9: { gain: -7.8, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
    lead2: { gain: -2 },
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
