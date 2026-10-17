// NEON GOODNIGHT · DARKSYNTH — one song: what it plays, how it is arranged, how it sounds.
//
// Based on Johannes Brahms' Wiegenlied (Lullaby and Goodnight), Op. 49 No. 4.
// The public-domain opening melody is adapted from 3/4 to this 4/4 arrangement.
// Synthwave · Darksynth at 112 BPM; the melody is recast in phrygian mode.
// An off-beat answering voice, wild phrase variations and layered counter-lines play against the hook.
// Source score: https://github.com/OpenScore/Lieder/blob/main/scores/Brahms,_Johannes/5_Lieder,_Op.49/4_Wiegenlied/lc5701612.mscx
// Regenerate with node tools/make-brahms-remixes.js --force.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "brahms-lullaby-synthwave";
export const title = "NEON GOODNIGHT · DARKSYNTH";
export const slug = "brahms-lullaby-synthwave";
export const group = "imported";
export const seed = 4905;

export const bank = {
  bpm: 112,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . . . . . F#4 . . . F#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . F5 . . . C#5 . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . B4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . F#4 . . . A#4 .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 C1 | C1 . . . C1 . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('A#4 . F5 A#5 . C#5 F5 . A#5 . C#6 F5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | C#5 . B4 . A#4 . . . B4 . . . F#4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . G#5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . C1 .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | C#5 . B4 . A#4 . . . B4 . . . F#4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | A#4 . G#4 . F#4 . . . G#4 . . . D#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 C1 | C1 . . . C1 . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . B4 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . B4 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . B4 . . . A#4 . . . . . . . G#4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . B5 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead5: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . B5 .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('B4 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('B4 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('B5 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('B5 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . D#5 . . . | C#5 . B4 . A#4 . . . B4 . . . F#4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . C1 .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 | F#1 . F#1 F#1 F#1 . F#1 F#1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('C#2 . . . . . . . C#2 . . . . . . . | F#1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . . . . . F4 . . . D#5 . . . | C#5 . B4 . A#4 . . . B4 . . . F#4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . B4 . . . | A#4 . G#4 . F#4 . . . G#4 . . . D#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . . . . . F5 . . . D#6 . . . | C#6 . B5 . A#5 . . . B5 . . . F#5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('G#5 . . . . . . . F5 . . . D#6 . . . | C#6 . B5 . A#5 . . . B5 . . . F#5 . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . G#4 F#4 F#4 . G#4 F#4 | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . G#4 F#4 F#4 . G#4 F#4 | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . F#4 D#4 D#4 . F#4 D#4 | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . G#5 F#5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('. . . . . . . . F#5 . G#5 F#5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('C#5 . . . D#5 . C#5 . A#4 . B4 A#4 C#5 . D#5 C#5 | C#5 B4 D#5 . F5 D#5 C#5 . . . D#5 . C#5 . B4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead2: seq('. . . . G#5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F5 A#5 . C#5 F5 . A#5 . C#6 F5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C#5 . . . D#5 . C#5 . A#4 . B4 A#4 C#5 . D#5 C#5 | C#5 B4 D#5 . F5 D#5 C#5 . . . D#5 . C#5 . B4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A#4 . . . A#4 . A#4 . F#4 . G#4 F#4 A#4 . A#4 A#4 | A#4 G#4 B4 . C#5 B4 A#4 . . . B4 . A#4 . G#4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead4: seq('C#6 . . . D#6 . C#6 . A#5 . B5 A#5 C#6 . D#6 C#6 | C#6 B5 D#6 . F6 D#6 C#6 . . . D#6 . C#6 . B5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead5: seq('C#6 . . . D#6 . C#6 . A#5 . B5 A#5 C#6 . D#6 C#6 | C#6 B5 D#6 . F6 D#6 C#6 . . . D#6 . C#6 . B5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,3,null,null,null,2,null,2,null,2,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('B4 . C#5 B4 A#4 . B4 A#4 F4 . F#4 F4 F#4 . G#4 F#4 | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('B4 . C#5 B4 A#4 . B4 A#4 F4 . F#4 F4 F#4 . G#4 F#4 | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#4 . A#4 G#4 F#4 . G#4 F#4 C#4 . D#4 C#4 D#4 . F4 D#4 | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('B5 . C#6 B5 A#5 . B5 A#5 F5 . F#5 F5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('B5 . C#6 B5 A#5 . B5 A#5 F5 . F#5 F5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . A#4 . G#4 . F4 . F#4 F4 G#4 . A#4 D#5 | C#5 . B4 . A#4 . B4 A#4 B4 . . . F#4 . . .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 | F#1 . F#1 F#1 F#1 . F#1 F#1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('C#2 . . . . . . . C#2 . . . . . . . | F#1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . A#4 . G#4 . F4 . F#4 F4 G#4 . A#4 D#5 | C#5 . B4 . A#4 . B4 A#4 B4 . . . F#4 . . .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . F#4 . F4 . C#4 . D#4 C#4 F4 . F#4 B4 | A#4 . G#4 . F#4 . G#4 F#4 G#4 . . . D#4 . . .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . A#5 . G#5 . F5 . F#5 F5 G#5 . A#5 D#6 | C#6 . B5 . A#5 . B5 A#5 B5 . . . F#5 . . .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      lead5: seq('G#5 . . . A#5 . G#5 . F5 . F#5 F5 G#5 . A#5 D#6 | C#6 . B5 . A#5 . B5 A#5 B5 . . . F#5 . . .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | F#4 . . . . . . . F#4 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[277.1826309768721,415.3046975799451,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,233.08188075904496,246.94165062806206,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[554.3652619537442,830.6093951598903,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,466.1637615180899,493.8833012561241,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . . . . . . . . . | F#4 . . . . . . . F#4 . . . . . . .'),
      leadLen: [12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,369.9944227116344,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [6,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[466.1637615180899,698.4564628660078,739.9888454232688,1108.7305239074883],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,554.3652619537442,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . . . . . . . . . | F#4 . . . . . . . A#4 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[277.1826309768721,415.3046975799451,466.1637615180899,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,233.08188075904496,246.94165062806206,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | A#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[554.3652619537442,830.6093951598903,932.3275230361799,1396.9129257320155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,466.1637615180899,493.8833012561241,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('D#5 . . . . . . . C#5 . . . . . . . | . . . . . . . . B4 . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[233.08188075904496,349.2282314330039,369.9944227116344,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,369.9944227116344,415.3046975799451,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      bass: seq('A#1 . . . . . . . . . . . . . . . | G#1 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A#1 . . . . . . . . . . . . . . . | G#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('D#6 . . . C#6 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[466.1637615180899,698.4564628660078,739.9888454232688,1108.7305239074883],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[493.8833012561241,739.9888454232688,830.6093951598903,1244.5079348883237],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 C1 | C1 . . . C1 . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: [null,null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,[622.2539674441618,1244.5079348883237],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[493.8833012561241,987.7666025122483],null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . G#5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F5 A#5 . C#5 F5 . A#5 . C#6 F5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | . . D#5 . . . C#5 . . . . . . . B4 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . B4 . . . A#4 . . . . . . . G#4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('C#6 . . . . . . . A#5 . . . C#6 . . . | . . D#6 . . . C#6 . . . . . . . B5 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead5: seq('C#6 . . . . . . . A#5 . . . C#6 . . . | . . D#6 . . . C#6 . . . . . . . B5 .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[493.8833012561241,987.7666025122483],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('B4 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('B5 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('B5 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: chordSeq('F#4 . . . . . . . . . . . . . . . | F#4 . . . . . . . . . . . . . . .'),
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[415.3046975799451,830.6093951598903],null,null,null,null,null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[622.2539674441618,1244.5079348883237],null,null,null,[554.3652619537442,1108.7305239074883],null,[493.8833012561241,987.7666025122483],null,[466.1637615180899,932.3275230361799],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . C1 .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 | F#1 . F#1 F#1 F#1 . F#1 F#1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('C#2 . . . . . . . C#2 . . . . . . . | F#1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . . . . . F4 . . . D#5 . . . | C#5 . B4 . A#4 . . . B4 . . . F#4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . B4 . . . | A#4 . G#4 . F#4 . . . G#4 . . . D#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . . . . . F5 . . . D#6 . . . | C#6 . B5 . A#5 . . . B5 . . . F#5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('G#5 . . . . . . . F5 . . . D#6 . . . | C#6 . B5 . A#5 . . . B5 . . . F#5 . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [null,null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,[415.3046975799451,830.6093951598903],[369.9944227116344,739.9888454232688],[369.9944227116344,739.9888454232688],null,[415.3046975799451,830.6093951598903],[369.9944227116344,739.9888454232688],[466.1637615180899,932.3275230361799],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('B1 . . . . . . . B1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . G#4 F#4 F#4 . G#4 F#4 | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . F#4 D#4 D#4 . F#4 D#4 | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . G#5 F#5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('. . . . . . . . F#5 . G#5 F#5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[466.1637615180899,932.3275230361799],null,null,null,[493.8833012561241,987.7666025122483],null,[466.1637615180899,932.3275230361799],null,[369.9944227116344,739.9888454232688],null,[415.3046975799451,830.6093951598903],[369.9944227116344,739.9888454232688],[466.1637615180899,932.3275230361799],null,[493.8833012561241,987.7666025122483],[466.1637615180899,932.3275230361799],[554.3652619537442,1108.7305239074883],[493.8833012561241,987.7666025122483],[622.2539674441618,1244.5079348883237],null,[698.4564628660078,1396.9129257320155],[622.2539674441618,1244.5079348883237],[554.3652619537442,1108.7305239074883],null,null,null,[622.2539674441618,1244.5079348883237],null,[554.3652619537442,1108.7305239074883],null,[493.8833012561241,987.7666025122483],null],
      leadLen: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,[311.1269837220809,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | B1 . B1 B1 B1 . B1 B1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | B1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | B4 . F#5 B5 . D#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . B4 . A#4 . F#4 . G#4 F#4 A#4 . B4 A#4 | C#5 B4 D#5 . F5 D#5 C#5 . . . D#5 . C#5 . B4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . . . G#4 . F#4 . D#4 . F4 D#4 F#4 . G#4 F#4 | A#4 G#4 B4 . C#5 B4 A#4 . . . B4 . A#4 . G#4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead4: seq('A#5 . . . B5 . A#5 . F#5 . G#5 F#5 A#5 . B5 A#5 | C#6 B5 D#6 . F6 D#6 C#6 . . . D#6 . C#6 . B5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead5: seq('A#5 . . . B5 . A#5 . F#5 . G#5 F#5 A#5 . B5 A#5 | C#6 B5 D#6 . F6 D#6 C#6 . . . D#6 . C#6 . B5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,3,null,null,null,2,null,2,null,2,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[493.8833012561241,987.7666025122483],null,[554.3652619537442,1108.7305239074883],[493.8833012561241,987.7666025122483],[466.1637615180899,932.3275230361799],null,[493.8833012561241,987.7666025122483],[466.1637615180899,932.3275230361799],[349.2282314330039,698.4564628660078],null,[369.9944227116344,739.9888454232688],[349.2282314330039,698.4564628660078],[369.9944227116344,739.9888454232688],null,[415.3046975799451,830.6093951598903],[369.9944227116344,739.9888454232688],[466.1637615180899,932.3275230361799],null,null,null,[493.8833012561241,987.7666025122483],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('F#1 . . . . . . . F#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 . | A#4 . F#5 A#5 . C#5 F#5 . A#5 . C#6 F#5 . C#5 A#5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('B4 . C#5 B4 A#4 . B4 A#4 F4 . F#4 F4 F#4 . G#4 F#4 | A#4 . . . B4 . . . C#5 . . . A#4 . . .'),
      lead3Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#4 . A#4 G#4 F#4 . G#4 F#4 C#4 . D#4 C#4 D#4 . F4 D#4 | F#4 . . . G#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('B5 . C#6 B5 A#5 . B5 A#5 F5 . F#5 F5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead4Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('B5 . C#6 B5 A#5 . B5 A#5 F5 . F#5 F5 F#5 . G#5 F#5 | A#5 . . . B5 . . . C#6 . . . A#5 . . .'),
      lead5Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: chordSeq('F#4 . . . . . . . . . . . . . . . | F#4 . . . . . . . . . . . . . . .'),
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[415.3046975799451,830.6093951598903],null,null,null,[466.1637615180899,932.3275230361799],null,[415.3046975799451,830.6093951598903],null,[349.2282314330039,698.4564628660078],null,[369.9944227116344,739.9888454232688],[349.2282314330039,698.4564628660078],[415.3046975799451,830.6093951598903],null,[466.1637615180899,932.3275230361799],[622.2539674441618,1244.5079348883237],[554.3652619537442,1108.7305239074883],null,[493.8833012561241,987.7666025122483],null,[466.1637615180899,932.3275230361799],null,[493.8833012561241,987.7666025122483],[466.1637615180899,932.3275230361799],[493.8833012561241,987.7666025122483],null,null,null,[369.9944227116344,739.9888454232688],null,null,null],
      leadLen: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      chords: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null],
      chordsLen: [2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null],
      bass: seq('C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 C#2 . C#2 C#2 | F#1 . F#1 F#1 F#1 . F#1 F#1 B1 . B1 B1 B1 . B1 B1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('C#2 . . . . . . . C#2 . . . . . . . | F#1 . . . . . . . B1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead6: seq('C#5 . G#5 C#6 . F5 G#5 . C#6 . F6 G#5 . F5 C#6 . | A#4 . F#5 A#5 . C#5 F#5 . B5 . D#6 F#5 . D#5 B5 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . A#4 . G#4 . F4 . F#4 F4 G#4 . A#4 D#5 | C#5 . B4 . A#4 . B4 A#4 B4 . . . F#4 . . .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . F#4 . F4 . C#4 . D#4 C#4 F4 . F#4 B4 | A#4 . G#4 . F#4 . G#4 F#4 G#4 . . . D#4 . . .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . A#5 . G#5 . F5 . F#5 F5 G#5 . A#5 D#6 | C#6 . B5 . A#5 . B5 A#5 B5 . . . F#5 . . .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      lead5: seq('G#5 . . . A#5 . G#5 . F5 . F#5 F5 G#5 . A#5 D#6 | C#6 . B5 . A#5 . B5 A#5 B5 . . . F#5 . . .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,3,null,null,null,3,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead7: [[349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[369.9944227116344,493.8833012561241,622.2539674441618],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . . . . . F#4 . . . F#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . F5 . . . C#5 . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[246.94165062806206,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . B4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . F#4 . . . A#4 .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 11,
  "style": "synthwave-darksynth",
  "flavour": "darksynth",
  "options": {
    "style": "synthwave",
    "mood": "dark",
    "mode": "phrygian",
    "riffNotes": "fit",
    "length": "custom",
    "customBars": 64,
    "energy": "maximum",
    "variation": "wild",
    "tempo": "style",
    "bpm": 118,
    "hook": "auto",
    "combo": null,
    "flavour": "darksynth",
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
      "template": "fakeout",
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
      "rolls": true,
      "impact": false,
      "shaker": true,
      "tambourine": true,
      "congas": false,
      "cowbell": false,
      "ride": true
    },
    "parts": {
      "bass": "gallop",
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
      "counter": false,
      "fillIn": "neighbour",
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
      "riser": true,
      "riserWay": "varied",
      "dropHit": "varied",
      "filterBuild": true,
      "stutter": true,
      "pump": true,
      "delayThrows": true,
      "lowpassIntro": false,
      "bitcrushIntro": false,
      "tapeStop": false,
      "gateChoir": false
    }
  },
  "seed": 4905,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "synthwave-darksynth",
    "moodId": "dark",
    "parts": {
      "riff:hook": [
        {
          "id": "tngrRubyScanner",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "tngrBerlinSignal",
          "enabled": true,
          "favourite": false,
          "trimDb": 0,
          "origin": "style default",
          "weight": 1
        },
        {
          "id": "tngrHorizonSolo",
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
          "id": "tngrNeonReed",
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
      "preset": "sdsKick",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "snare",
      "part": "part:snare",
      "preset": "sdsSnare",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "kit_simmons_clap",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "hats",
      "part": "part:hats",
      "preset": "kit_simmons_hats",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "ohats",
      "part": "part:ohats",
      "preset": "kit_simmons_ohats",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "crash",
      "part": "part:crash",
      "preset": "sdsCymbal",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom",
      "part": "part:fill",
      "preset": "sdsTomMid",
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
      "preset": "tngrHollowVector",
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
      "preset": "tngrSoftStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "tngrPolarDrift",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:square",
      "preset": "tngrRubyScanner",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:bell",
      "preset": "tngrIceBell",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:megaSaw",
      "preset": "tngrNeonReed",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:arp",
      "preset": "tngrCrystalTrigger",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
      "part": "part:choir",
      "preset": "tngrGlassChoir",
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
        "voice": "bestPwmHollowLead",
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
        "voice": "tngrIceBell",
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
    "riser": "crash2",
    "fill": "tom",
    "shaker": "rim",
    "tambourine": "rim2",
    "ride": "crash3",
    "bass": "bass",
    "sub": "bass2",
    "saws": "chords",
    "pad": "chords2",
    "square": "lead3",
    "bell": "lead4",
    "megaSaw": "lead5",
    "arp": "lead6",
    "choir": "lead7",
    "third": "lead8"
  },
  "form": [
    {
      "id": "fakeout:intro",
      "role": "intro",
      "type": "intro",
      "label": "Intro",
      "from": 1,
      "to": 4,
      "energy": 0.3
    },
    {
      "id": "fakeout:build",
      "role": "build",
      "type": "build",
      "label": "Pre-Chorus",
      "from": 5,
      "to": 8,
      "energy": 0.6
    },
    {
      "id": "fakeout:fake",
      "role": "drop",
      "type": "halfDrop",
      "label": "Fake Drop",
      "from": 9,
      "to": 12,
      "energy": 0.65,
      "hook": true
    },
    {
      "id": "fakeout:again",
      "role": "build2",
      "type": "build",
      "label": "Build Again",
      "from": 13,
      "to": 16,
      "energy": 0.6
    },
    {
      "id": "fakeout:drop",
      "role": "drop2",
      "type": "drop",
      "label": "Chorus",
      "from": 17,
      "to": 32,
      "energy": 0.85,
      "hook": true
    },
    {
      "id": "fakeout:breakdown",
      "role": "breakdown",
      "type": "breakdown",
      "label": "Breakdown",
      "from": 33,
      "to": 40,
      "energy": 0.25
    },
    {
      "id": "fakeout:build2",
      "role": "build2",
      "type": "build",
      "label": "Build 2",
      "from": 41,
      "to": 44,
      "energy": 0.6
    },
    {
      "id": "fakeout:final",
      "role": "drop3",
      "type": "drop",
      "label": "Final Drop",
      "from": 45,
      "to": 60,
      "energy": 1,
      "hook": true
    },
    {
      "id": "fakeout:outro",
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
      "style": "Synthwave · Darksynth",
      "mood": "dark",
      "key": "A# phrygian",
      "reads": "A# major",
      "bars": 64,
      "bpm": 112,
      "seconds": 137,
      "variation": "wild",
      "hook": "Lullaby melody"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "FIELD SERVICE — NIGHT DRIVE · kick, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -0.8,
        "move": 2.2,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · snare, bars 45–52",
        "base": 2,
        "before": -2,
        "after": 8,
        "move": 10,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · clap, bars 45–52",
        "base": -3,
        "before": 2,
        "after": -2.3,
        "move": -4.3,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · hats, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -14,
        "move": -5,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · ohats, bars 45–52",
        "base": -11,
        "before": -11,
        "after": -10.6,
        "move": 0.4,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · crash, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -5.9,
        "move": 3.1,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · TOM Hi, bars 9–16",
        "base": -6,
        "before": -6,
        "after": -6.2,
        "move": -0.2,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · BASS 80s Mono, bars 45–52",
        "base": -7,
        "before": -4,
        "after": -3,
        "move": 1,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · SUB, bars 45–52",
        "base": -15,
        "before": -15,
        "after": -15,
        "move": 0,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · PAD String Machine, bars 45–52",
        "base": -9.88,
        "before": -9.47,
        "after": -3.4,
        "move": 6.1,
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
        "from": "BIG-ROOM HOUSE SEED · pad · Polar Drift, bars 1–4",
        "base": -11.06,
        "before": -8,
        "after": -9.1,
        "move": -1.1,
        "window": [
          0,
          3
        ],
        "calibrated": false
      },
      {
        "lane": "lead3",
        "job": "square",
        "how": "part",
        "from": "FIELD SERVICE — NIGHT DRIVE · HOOK Hero Lead, bars 45–52",
        "base": 1,
        "before": 1,
        "after": -4.1,
        "move": -5.1,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · HOOK 8va Ice Bell, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -8.6,
        "move": 0.4,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · VERSE Hollow PWM, bars 5–12",
        "base": -2,
        "before": -2,
        "after": -11,
        "move": -9,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · ARP Crystal, bars 45–52",
        "base": -13,
        "before": -13,
        "after": -12.5,
        "move": 0.5,
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
        "from": "FIELD SERVICE — NIGHT DRIVE · CHOIR Glass, bars 33–40",
        "base": -9.53,
        "before": -8.54,
        "after": -5.1,
        "move": 3.4,
        "window": [
          44,
          51
        ],
        "calibrated": false
      },
      {
        "lane": "lead8",
        "job": "third",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · third · Electric Grand, bars 45–52",
        "base": -6.3,
        "before": -7,
        "after": -4.6,
        "move": 2.4,
        "window": [
          44,
          51
        ],
        "calibrated": false
      }
    ],
    "transitions": [
      {
        "bar": 4,
        "from": "Intro",
        "to": "Pre-Chorus",
        "delta": 0.3,
        "moves": [
          "fill"
        ]
      },
      {
        "bar": 32,
        "from": "Chorus",
        "to": "Breakdown",
        "delta": -0.6,
        "moves": [
          "halfTimeBar"
        ]
      },
      {
        "bar": 40,
        "from": "Breakdown",
        "to": "Build 2",
        "delta": 0.35,
        "moves": [
          "fill"
        ]
      },
      {
        "bar": 60,
        "from": "Final Drop",
        "to": "Outro",
        "delta": -0.65,
        "moves": [
          "halfTimeBar"
        ]
      }
    ],
    "expression": [],
    "lanes": [
      {
        "role": "hook",
        "lane": "lead",
        "label": "RIFF Lullaby melody · HOOK",
        "voice": "bestPwmHollowLead",
        "voiceParams": null,
        "strip": {
          "gain": 0,
          "send": {
            "delay": 0.25,
            "reverb": 0.35
          },
          "eq": {
            "high": 1
          }
        },
        "noteFX": null
      },
      {
        "role": "riff:lead2",
        "lane": "lead2",
        "label": "RIFF After-hours answer",
        "voice": "tngrIceBell",
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
        "voice": "sdsKick",
        "voiceParams": null,
        "strip": {
          "gain": -0.8,
          "eq": {
            "low": -2
          }
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "SNARE Roll",
        "voice": "sdsSnare",
        "voiceParams": null,
        "strip": {
          "gain": 8,
          "effects": [
            {
              "id": "reverb",
              "params": {
                "decay": 1.8,
                "preDelay": 0.005,
                "wet": 0.55
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
        "label": "SNARE Gated",
        "voice": "kit_simmons_clap",
        "voiceParams": null,
        "strip": {
          "gain": -2.3,
          "eq": {
            "high": -1
          },
          "effects": [
            {
              "id": "reverb",
              "params": {
                "decay": 1.8,
                "preDelay": 0.005,
                "wet": 0.55
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
        "voice": "kit_simmons_hats",
        "voiceParams": null,
        "strip": {
          "gain": -14,
          "pan": -0.25
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "kit_simmons_ohats",
        "voiceParams": null,
        "strip": {
          "gain": -10.6,
          "pan": 0.25
        },
        "noteFX": null
      },
      {
        "role": "crash",
        "lane": "crash",
        "label": "CRASH",
        "voice": "sdsCymbal",
        "voiceParams": null,
        "strip": {
          "gain": -5.9,
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
          "label": "Pitch Riser",
          "category": "Sweep",
          "homeLane": "crash",
          "kind": "drum",
          "dur": 4.285714285714286,
          "note": "A saw climbing three octaves to the home note over 4.29s, over a little noise.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 4.285714285714286,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 3.942857142857143,
            "hold": 0,
            "decay": 0.34285714285714286,
            "curve": "exp",
            "gain": 0.37
          },
          "drive": 0,
          "peak": 0.034,
          "osc": {
            "type": "sawtooth",
            "from": 123.47082531403103,
            "to": 987.7666025122483,
            "sweep": 4.285714285714286,
            "pitchCurve": "exp",
            "attack": 3.857142857142857,
            "hold": 0,
            "decay": 0.4285714285714286,
            "curve": "exp",
            "gain": 0.22
          }
        },
        "strip": {
          "gain": -21.5,
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
        "label": "SIMMONS Toms",
        "voice": "sdsTomMid",
        "voiceParams": null,
        "strip": {
          "gain": -6.2,
          "pan": 0.35,
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
        "label": "BASS Dist · Hollow Glide Bass",
        "voice": "tngrHollowVector",
        "voiceParams": null,
        "strip": {
          "gain": -3,
          "effects": [
            {
              "id": "filter",
              "params": {
                "type": "lowpass",
                "frequency": 1400,
                "Q": 1.5
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
          "gain": -15
        },
        "noteFX": null
      },
      {
        "role": "saws",
        "lane": "chords",
        "label": "CHORDS Stabs · Soft Strings",
        "voice": "tngrSoftStrings",
        "voiceParams": null,
        "strip": {
          "gain": -3.4,
          "send": {
            "reverb": 0.439
          }
        },
        "noteFX": null
      },
      {
        "role": "pad",
        "lane": "chords2",
        "label": "PAD · Cold Wide Pad",
        "voice": "tngrPolarDrift",
        "voiceParams": null,
        "strip": {
          "gain": -9.1,
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
        "lane": "lead3",
        "label": "HOOK DOUBLE · Pulsing Lead",
        "voice": "tngrRubyScanner",
        "voiceParams": null,
        "strip": {
          "gain": -4.1,
          "send": {
            "delay": 0.18,
            "reverb": 0.3
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f3": 3200,
                "g3": -4,
                "q3": 0.8
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "bell",
        "lane": "lead4",
        "label": "HOOK 8VA · Ice Bell",
        "voice": "tngrIceBell",
        "voiceParams": null,
        "strip": {
          "gain": -8.6,
          "pan": 0.2,
          "send": {
            "delay": 0.2,
            "reverb": 0.45
          }
        },
        "noteFX": null
      },
      {
        "role": "megaSaw",
        "lane": "lead5",
        "label": "LEAD 8VA · Reedy Lead",
        "voice": "tngrNeonReed",
        "voiceParams": null,
        "strip": {
          "gain": -11,
          "pan": -0.05,
          "send": {
            "delay": 0.22,
            "reverb": 0.35
          },
          "effects": [
            {
              "id": "chorus",
              "params": {
                "wet": 0.35
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "arp",
        "lane": "lead6",
        "label": "ARP · Sparkle Pluck",
        "voice": "tngrCrystalTrigger",
        "voiceParams": null,
        "strip": {
          "gain": -12.5,
          "pan": -0.3,
          "send": {
            "delay": 0.25,
            "reverb": 0.2
          },
          "effects": [
            {
              "id": "peq",
              "params": {
                "f3": 3500,
                "g3": -4,
                "q3": 0.8
              }
            },
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
        "lane": "lead7",
        "label": "CHOIR · Glass Choir",
        "voice": "tngrGlassChoir",
        "voiceParams": null,
        "strip": {
          "gain": -5.1,
          "send": {
            "reverb": 0.804
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead8",
        "label": "THIRD BELOW · Digital E-Piano",
        "voice": "tngrDigitalEp84",
        "voiceParams": null,
        "strip": {
          "gain": -4.6,
          "pan": 0.15,
          "send": {
            "delay": 0.1,
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
        "notes": "8f2211bf",
        "voice": "b831b9f7",
        "auto": "8041cc00",
        "expression": "77074ba4",
        "production": "d694f080"
      },
      "riff:lead2": {
        "notes": "2444ede5",
        "voice": "c6497533",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "kick": {
        "notes": "6bd2ca39",
        "voice": "e4e65554",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "784f4815",
        "voice": "bf8711b5",
        "auto": "9b59a09",
        "expression": "77074ba4",
        "production": "43ecb6a3"
      },
      "clap": {
        "notes": "4442759b",
        "voice": "7c1fbd44",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "43ecb6a3"
      },
      "hats": {
        "notes": "1633508d",
        "voice": "e0ef0028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "8b10ed23",
        "voice": "1474d1e7",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "cd203545",
        "voice": "60227150",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "riser": {
        "notes": "503b81e2",
        "voice": "cf4bd5ab",
        "auto": "c678316e",
        "expression": "77074ba4",
        "production": "ce4dd3c6"
      },
      "fill": {
        "notes": "12605a1e",
        "voice": "e83628dc",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "shaker": {
        "notes": "570fd37d",
        "voice": "573ce642",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "9dcd14e0",
        "voice": "4a3e77e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "ride": {
        "notes": "a33c0dd5",
        "voice": "2371fa8d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "f7250a12",
        "voice": "71691d77",
        "auto": "d77467ef",
        "expression": "77074ba4",
        "production": "4fee82c"
      },
      "sub": {
        "notes": "8322ff7e",
        "voice": "94966028",
        "auto": "d77467ef",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "saws": {
        "notes": "97b64e3d",
        "voice": "d01b65e3",
        "auto": "d77467ef",
        "expression": "77074ba4",
        "production": "787a400a"
      },
      "pad": {
        "notes": "95796f82",
        "voice": "71f608d6",
        "auto": "d77467ef",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "5c5730cc",
        "voice": "e8445a03",
        "auto": "d77467ef",
        "expression": "77074ba4",
        "production": "c887ac5e"
      },
      "bell": {
        "notes": "27d0d111",
        "voice": "c6497533",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "76cef996"
      },
      "megaSaw": {
        "notes": "d936c60c",
        "voice": "3d6bddf7",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "2a61ec45"
      },
      "arp": {
        "notes": "e748c80d",
        "voice": "7537d16d",
        "auto": "d77467ef",
        "expression": "77074ba4",
        "production": "3ab2a664"
      },
      "choir": {
        "notes": "ad8ba84",
        "voice": "1d17ad96",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "82631532"
      },
      "third": {
        "notes": "51c4bcd7",
        "voice": "c49cf45e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      }
    },
    "master": "149a53e5"
  }
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -3.6 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }, { key: "lead2", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","rim","rim2","crash3","bass","bass2","chords","chords2","lead","lead3","lead4","lead5","lead6","lead7","lead8","lead2"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"SNARE Gated","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"SIMMONS Toms","rim":"PERC Shaker","rim2":"PERC Tambourine","crash3":"RIDE","bass":"BASS Dist · Hollow Glide Bass","bass2":"SUB · Sub Sine","chords":"CHORDS Stabs · Soft Strings","chords2":"PAD · Cold Wide Pad","lead":"RIFF Lullaby melody · HOOK","lead3":"HOOK DOUBLE · Pulsing Lead","lead4":"HOOK 8VA · Ice Bell","lead5":"LEAD 8VA · Reedy Lead","lead6":"ARP · Sparkle Pluck","lead7":"CHOIR · Glass Choir","lead8":"THIRD BELOW · Digital E-Piano","lead2":"RIFF After-hours answer"},
  voice: {"kickVoice":"sdsKick","snareVoice":"sdsSnare","clapVoice":"kit_simmons_clap","hatsVoice":"kit_simmons_hats","ohatsVoice":"kit_simmons_ohats","crashVoice":"sdsCymbal","tomVoice":"sdsTomMid","rimVoice":"shaker","rim2Voice":"tambourine","crash3Voice":"ride909SixBit","bassVoice":"tngrHollowVector","bass2Voice":"stSubSine","chordsVoice":"tngrSoftStrings","chords2Voice":"tngrPolarDrift","leadVoice":"bestPwmHollowLead","lead3Voice":"tngrRubyScanner","lead4Voice":"tngrIceBell","lead5Voice":"tngrNeonReed","lead6Voice":"tngrCrystalTrigger","lead7Voice":"tngrGlassChoir","lead8Voice":"tngrDigitalEp84","lead2Voice":"tngrIceBell"},
  voiceParams: {"crash2Voice":{"label":"Pitch Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":4.285714285714286,"note":"A saw climbing three octaves to the home note over 4.29s, over a little noise.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":4.285714285714286,"Q":1.6,"slope":-24,"color":"white","attack":3.942857142857143,"hold":0,"decay":0.34285714285714286,"curve":"exp","gain":0.37},"drive":0,"peak":0.034,"osc":{"type":"sawtooth","from":123.47082531403103,"to":987.7666025122483,"sweep":4.285714285714286,"pitchCurve":"exp","attack":3.857142857142857,"hold":0,"decay":0.4285714285714286,"curve":"exp","gain":0.22}}},
  lanes: {
    kick: { gain: -0.8, eq: { low: -2 } },
    snare: { gain: 8, effects: [{ id: "reverb", params: { decay: 1.8, preDelay: 0.005, wet: 0.55 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.08 } }] },
    clap: { gain: -2.3, eq: { high: -1 }, effects: [{ id: "reverb", params: { decay: 1.8, preDelay: 0.005, wet: 0.55 } }, { id: "noisegate", params: { threshold: -34, attack: 0.002, release: 0.08 } }] },
    hats: { gain: -14, pan: -0.25 },
    ohats: { gain: -10.6, pan: 0.25 },
    crash: { gain: -5.9, pan: 0.3, send: { reverb: 0.3 } },
    crash2: { gain: -21.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -6.2, pan: 0.35, send: { reverb: 0.35 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    crash3: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -3, effects: [{ id: "filter", params: { type: "lowpass", frequency: 1400, Q: 1.5 } }] },
    bass2: { gain: -15 },
    chords: { gain: -3.4, send: { reverb: 0.439 } },
    chords2: { gain: -9.1, send: { reverb: 0.5 }, eq: { low: -4 } },
    lead: { send: { delay: 0.25, reverb: 0.35 }, eq: { high: 1 } },
    lead3: { gain: -4.1, send: { delay: 0.18, reverb: 0.3 }, effects: [{ id: "peq", params: { f3: 3200, g3: -4, q3: 0.8 } }] },
    lead4: { gain: -8.6, pan: 0.2, send: { delay: 0.2, reverb: 0.45 } },
    lead5: { gain: -11, pan: -0.05, send: { delay: 0.22, reverb: 0.35 }, effects: [{ id: "chorus", params: { wet: 0.35 } }] },
    lead6: { gain: -12.5, pan: -0.3, send: { delay: 0.25, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3500, g3: -4, q3: 0.8 } }, { id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    lead7: { gain: -5.1, send: { reverb: 0.804 } },
    lead8: { gain: -4.6, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead2: { gain: -2 },
  },
};

export const arrangement = {
  loop: {
    fromBar: 5,
    toBar: 64,
  },
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
          from: [13,0],
          to: [17,0],
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
          from: [13,0],
          to: [17,0],
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
          from: [13,0],
          to: [17,0],
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
          from: [13,0],
          to: [17,0],
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
    lead6: {
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
          from: [13,0],
          to: [17,0],
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
    lead3: {
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
          from: [13,0],
          to: [17,0],
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
    snare: {
      points: [[5,0,0],[5,0,-6],[9,0,0],[13,0,0],[13,0,-6],[17,0,0],[41,0,0],[41,0,-6],[45,0,0]],
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
          from: [16,12],
          to: [16,14],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.25,
                retrigger: 0,
                fade: -1,
              },
            },
            {
              id: "filter",
              params: {
                type: "highpass",
                frequency: 500,
                Q: 0.9,
              },
            },
          ],
        },
        {
          from: [16,14],
          to: [17,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.125,
                retrigger: 0,
                fade: -1,
              },
            },
            {
              id: "filter",
              params: {
                type: "highpass",
                frequency: 1200,
                Q: 0.9,
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
    },
    crash2: {
      fx: [
        {
          from: [7,0],
          to: [9,0],
          chain: [
            {
              id: "autopanner",
              params: {
                rateSync: 0,
                rateDivision: 2,
                frequency: 4,
                depth: 1,
                wet: 1,
              },
            },
          ],
        },
        {
          from: [15,0],
          to: [17,0],
          chain: [
            {
              id: "autopanner",
              params: {
                rateSync: 0,
                rateDivision: 2,
                frequency: 4,
                depth: 1,
                wet: 1,
              },
            },
          ],
        },
        {
          from: [43,0],
          to: [45,0],
          chain: [
            {
              id: "autopanner",
              params: {
                rateSync: 0,
                rateDivision: 2,
                frequency: 4,
                depth: 1,
                wet: 1,
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
