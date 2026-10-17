// SLEEPWALK RADIO · TRIP-HOP — one song: what it plays, how it is arranged, how it sounds.
//
// Based on Johannes Brahms' Wiegenlied (Lullaby and Goodnight), Op. 49 No. 4.
// The public-domain opening melody is adapted from 3/4 to this 4/4 arrangement.
// Downtempo · Trip-Hop at 86 BPM; the melody is recast in harmonic mode.
// An off-beat answering voice, wild phrase variations and layered counter-lines play against the hook.
// Source score: https://github.com/OpenScore/Lieder/blob/main/scores/Brahms,_Johannes/5_Lieder,_Op.49/4_Wiegenlied/lc5701612.mscx
// Regenerate with node tools/make-brahms-remixes.js --force.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "brahms-lullaby-triphop";
export const title = "SLEEPWALK RADIO · TRIP-HOP";
export const slug = "brahms-lullaby-triphop";
export const group = "imported";
export const seed = 4906;

export const bank = {
  bpm: 86,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead6Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F#5 . C#5 . A#4 . F#5 . A#5 . F#5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead6Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F5 . C#5 . A4 . F5 . A5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,[220,261.6255653005986,349.2282314330039],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead6Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead6Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead7: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F#5 . C#5 . A#4 . F#5 . A#5 . F#5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead6Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F5 . C#5 . A4 . F5 . A5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,[220,261.6255653005986,349.2282314330039],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead6Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead7: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F#5 . C#5 . A#4 . F#5 . A#5 . F#5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F5 . C#5 . A4 . F5 . A5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,[220,261.6255653005986,349.2282314330039],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . D#5 . F#5 . D#5 . A#4 . F#5 . A#5 . F#5 . | A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[311.1269837220809,369.9944227116344,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead6Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead7: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F#5 . C#5 . A#4 . F#5 . A#5 . F#5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead6Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . C1 . . C1 . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead5: seq('A#4 . C#5 . F5 . C#5 . A#4 . F5 . A#5 . F5 . | A#4 . C#5 . F5 . C#5 . A4 . F5 . A5 . F5 .'),
      lead5Len: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null],
      chordsLen: [6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,5,null,null,null,null,null],
      chords2: [[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,277.1826309768721,349.2282314330039],null,null,null,null,null,null,null,[220,261.6255653005986,349.2282314330039],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead6: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead6Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead7: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead7Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass: seq('D#2 . . D#2 . D#3 D#2 . . A#2 . D#2 C#3 . A#2 . | A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | F#1 . . F#1 . F#2 F#1 . . C#2 . F#1 E2 . C#2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . C1 . . . . . . C1 . | . . C1 . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,0.35,null,null,null,null,0.35,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . C1 . . . . . . C1 . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      rim: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      bass: seq('A#1 . . A#1 . A#2 A#1 . . F2 . A#1 G#2 . F2 . | A#1 . . A#1 . A#2 A#1 . . C2 . F1 D#2 . C2 .'),
      bassLen: [3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null,3,null,null,1,null,1,2,null,null,1,null,1,2,null,2,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 11,
  "style": "downtempo-triphop",
  "flavour": "triphop",
  "options": {
    "style": "downtempo",
    "mood": "mystery",
    "mode": "harmonic",
    "riffNotes": "fit",
    "length": "custom",
    "customBars": 64,
    "energy": "maximum",
    "variation": "wild",
    "tempo": "style",
    "bpm": 94,
    "hook": "auto",
    "combo": null,
    "flavour": "triphop",
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
      "template": "groove",
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
      "source": "replace",
      "kit": "style",
      "crashes": false,
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
      "chords": "piano",
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
  "seed": 4906,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "downtempo-triphop",
    "moodId": "mystery",
    "parts": {}
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
      "preset": "tngrWarmStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:square",
      "preset": "cryptTheremin",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:bell",
      "preset": "tngrCelesta",
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
      "part": "part:third",
      "preset": "rmndTineEP",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead7",
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
        "voice": "mrdrMutedTrumpet",
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
        "voice": "cryptTheremin",
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
    "fill": "tom",
    "shaker": "rim",
    "tambourine": "rim2",
    "bass": "bass",
    "sub": "bass2",
    "piano": "chords",
    "pad": "chords2",
    "square": "lead3",
    "bell": "lead4",
    "arp": "lead5",
    "third": "lead6",
    "counter": "lead7"
  },
  "form": [
    {
      "id": "groove:g0",
      "role": "groove",
      "type": "groove",
      "label": "Groove · 1/5",
      "from": 1,
      "to": 8,
      "energy": 0.2
    },
    {
      "id": "groove:g1",
      "role": "groove",
      "type": "groove",
      "label": "Groove · 2/5",
      "from": 9,
      "to": 16,
      "energy": 0.4
    },
    {
      "id": "groove:g2",
      "role": "groove",
      "type": "groove",
      "label": "Groove · 4/5",
      "from": 17,
      "to": 24,
      "energy": 0.8,
      "hook": true
    },
    {
      "id": "groove:g3",
      "role": "groove",
      "type": "groove",
      "label": "Groove",
      "from": 25,
      "to": 32,
      "energy": 1,
      "hook": true
    },
    {
      "id": "groove:g4",
      "role": "groove",
      "type": "groove",
      "label": "Drums Out",
      "from": 33,
      "to": 40,
      "energy": 0.4
    },
    {
      "id": "groove:g5",
      "role": "groove",
      "type": "groove",
      "label": "Groove",
      "from": 41,
      "to": 48,
      "energy": 1,
      "hook": true
    },
    {
      "id": "groove:g6",
      "role": "groove",
      "type": "groove",
      "label": "Groove Out",
      "from": 49,
      "to": 56,
      "energy": 0.6
    },
    {
      "id": "groove:g7",
      "role": "groove",
      "type": "groove",
      "label": "Groove Out",
      "from": 57,
      "to": 64,
      "energy": 0.2
    }
  ],
  "report": {
    "version": 1,
    "summary": {
      "style": "Downtempo · Trip-Hop",
      "mood": "mystery",
      "key": "A# harmonic minor",
      "reads": "A# major",
      "bars": 64,
      "bpm": 86,
      "seconds": 179,
      "variation": "wild",
      "hook": "Lullaby melody"
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
        "after": 1.7,
        "move": 1.7,
        "window": [
          40,
          47
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
          40,
          47
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
          40,
          47
        ],
        "calibrated": false
      },
      {
        "lane": "hats",
        "job": "hats",
        "how": "sound",
        "from": "Downtempo's own · hats · Synth Closed Hat, bars 45–52",
        "base": -7,
        "before": -7,
        "after": -11,
        "move": -4,
        "window": [
          40,
          47
        ],
        "calibrated": false
      },
      {
        "lane": "ohats",
        "job": "ohats",
        "how": "sound",
        "from": "Downtempo's own · ohats · Synth Open Hat, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -5.5,
        "move": 0.5,
        "window": [
          40,
          47
        ],
        "calibrated": false
      },
      {
        "lane": "tom",
        "job": "fill",
        "how": "sound",
        "from": "Downtempo's own · fill · Synth Tom, bars 52–59",
        "base": -4,
        "before": -4,
        "after": -4.9,
        "move": -0.9,
        "window": [
          47,
          47
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
          40,
          47
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
          40,
          47
        ],
        "calibrated": false
      },
      {
        "lane": "bass",
        "job": "bass",
        "how": "part",
        "from": "Downtempo's own · bass · Digital Round Bass, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 3.2,
        "move": 3.2,
        "window": [
          40,
          47
        ],
        "calibrated": false
      },
      {
        "lane": "bass2",
        "job": "sub",
        "how": "part",
        "from": "Downtempo's own · sub · Sub Sine, bars 45–52",
        "base": -14,
        "before": -14,
        "after": -15.6,
        "move": -1.6,
        "window": [
          40,
          47
        ],
        "calibrated": true
      },
      {
        "lane": "chords",
        "job": "piano",
        "how": "part",
        "from": "Downtempo's own · piano · Tine Electric Piano, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -12.3,
        "move": -6.3,
        "window": [
          40,
          47
        ],
        "calibrated": true
      },
      {
        "lane": "chords2",
        "job": "pad",
        "how": "part",
        "from": "Downtempo's own · pad · Warm Strings, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -2.4,
        "move": 0.6,
        "window": [
          40,
          47
        ],
        "calibrated": false
      },
      {
        "lane": "lead3",
        "job": "square",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · square · Plain Square vs Synth, bars 45–52",
        "base": 1.1,
        "before": -5,
        "after": -5,
        "move": 0,
        "window": [
          40,
          47
        ],
        "calibrated": true
      },
      {
        "lane": "lead6",
        "job": "third",
        "how": "part",
        "from": "Downtempo's own · third · Tine Electric Piano, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -6,
        "move": 2,
        "window": [
          40,
          47
        ],
        "calibrated": true
      },
      {
        "lane": "lead7",
        "job": "counter",
        "how": "part",
        "from": "Downtempo's own · counter · Vibraphone, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -5.7,
        "move": 0.3,
        "window": [
          40,
          47
        ],
        "calibrated": true
      }
    ],
    "transitions": [
      {
        "bar": 32,
        "from": "Groove",
        "to": "Drums Out",
        "delta": -0.6,
        "moves": [
          "halfTimeBar"
        ]
      },
      {
        "bar": 48,
        "from": "Groove",
        "to": "Groove Out",
        "delta": -0.4,
        "moves": [
          "throw"
        ]
      },
      {
        "bar": 56,
        "from": "Groove Out",
        "to": "Groove Out",
        "delta": -0.4,
        "moves": [
          "throw"
        ]
      }
    ],
    "expression": [],
    "lanes": [
      {
        "role": "hook",
        "lane": "lead",
        "label": "RIFF Lullaby melody · HOOK",
        "voice": "mrdrMutedTrumpet",
        "voiceParams": null,
        "strip": {
          "gain": -2,
          "send": {
            "delay": 0.3,
            "reverb": 0.6
          },
          "pan": 0.15,
          "eq": {
            "high": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "riff:lead2",
        "lane": "lead2",
        "label": "RIFF After-hours answer",
        "voice": "cryptTheremin",
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
        "voice": "fatKick",
        "voiceParams": null,
        "strip": {
          "gain": 1.7,
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
          "gain": -11,
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
          "gain": -5.5,
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
        "role": "bass",
        "lane": "bass",
        "label": "SUB · Walking Sine Bass",
        "voice": "layerWalkingBass",
        "voiceParams": null,
        "strip": {
          "gain": 3.2
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
          "gain": -15.6
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
          "gain": -12.3,
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
        "label": "STRINGS · Warm Strings",
        "voice": "tngrWarmStrings",
        "voiceParams": null,
        "strip": {
          "gain": -2.4,
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
        "lane": "lead3",
        "label": "THEREMIN · Crypt Theremin",
        "voice": "cryptTheremin",
        "voiceParams": null,
        "strip": {
          "gain": -5,
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
        "lane": "lead4",
        "label": "HOOK 8VA · Celesta",
        "voice": "tngrCelesta",
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
        "role": "third",
        "lane": "lead6",
        "label": "THIRD BELOW · Tine Electric Piano",
        "voice": "rmndTineEP",
        "voiceParams": null,
        "strip": {
          "gain": -6,
          "pan": 0.15,
          "send": {
            "reverb": 0.4
          }
        },
        "noteFX": null
      },
      {
        "role": "counter",
        "lane": "lead7",
        "label": "COUNTER-MELODY · Vibraphone",
        "voice": "mrdrVibraphone",
        "voiceParams": null,
        "strip": {
          "gain": -5.7,
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
        "notes": "839d0f3d",
        "voice": "b71a9e71",
        "auto": "766a2f83",
        "expression": "77074ba4",
        "production": "34c46d28"
      },
      "riff:lead2": {
        "notes": "c2603a7d",
        "voice": "b734ef84",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "kick": {
        "notes": "8a204165",
        "voice": "da3f26a1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "980a90d5"
      },
      "snare": {
        "notes": "c044bf5e",
        "voice": "73b0da2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a98dacf4"
      },
      "clap": {
        "notes": "c75eccd4",
        "voice": "73b0da2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a98dacf4"
      },
      "hats": {
        "notes": "20cf167d",
        "voice": "2e5964eb",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "980a90d5"
      },
      "ohats": {
        "notes": "6c0f21a2",
        "voice": "6b0bdbf5",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "fill": {
        "notes": "1d9a9d29",
        "voice": "352acb51",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "6a8a8972"
      },
      "shaker": {
        "notes": "771e1d61",
        "voice": "573ce642",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "1488e777",
        "voice": "4a3e77e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "bass": {
        "notes": "e83550b8",
        "voice": "f9cf1993",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "a47b43a4",
        "voice": "94966028",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "2c1ebc95",
        "voice": "20a08fc2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "c9d7bd84"
      },
      "pad": {
        "notes": "3f2eb01d",
        "voice": "8fe72f42",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "square": {
        "notes": "308dab3",
        "voice": "b734ef84",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "34c46d28"
      },
      "bell": {
        "notes": "c80d75a3",
        "voice": "3e86c2d8",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "cc3c3429"
      },
      "arp": {
        "notes": "5ffebefd",
        "voice": "5f5246fd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "5fa96782"
      },
      "third": {
        "notes": "e9f5fd75",
        "voice": "20a08fc2",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19b0da9a"
      },
      "counter": {
        "notes": "514d312d",
        "voice": "5f5246fd",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "cc3c3429"
      }
    },
    "master": "c88eed7b"
  }
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "tape", params: { drive: 0.35, wow: 0.2, flutter: 0.15, tone: 7500, wet: 1 } }, { id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "rim2", from: "rim", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead2", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","tom","rim","rim2","bass","bass2","chords","chords2","lead","lead3","lead4","lead5","lead6","lead7","lead2"],
  labels: {"kick":"KICK","snare":"BREAK","clap":"SNARE Break","hats":"HATS","ohats":"OPEN HATS","tom":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","bass":"SUB · Walking Sine Bass","bass2":"SUB · Sub Sine","chords":"RHODES · Tine Electric Piano","chords2":"STRINGS · Warm Strings","lead":"RIFF Lullaby melody · HOOK","lead3":"THEREMIN · Crypt Theremin","lead4":"HOOK 8VA · Celesta","lead5":"ARP · Vibraphone","lead6":"THIRD BELOW · Tine Electric Piano","lead7":"COUNTER-MELODY · Vibraphone","lead2":"RIFF After-hours answer"},
  voice: {"kickVoice":"fatKick","snareVoice":"snareFat","clapVoice":"snareFat","hatsVoice":"hatEngine","ohatsVoice":"hatOpen","tomVoice":"ds808Tom","rimVoice":"shaker","rim2Voice":"tambourine","bassVoice":"layerWalkingBass","bass2Voice":"stSubSine","chordsVoice":"rmndTineEP","chords2Voice":"tngrWarmStrings","leadVoice":"mrdrMutedTrumpet","lead3Voice":"cryptTheremin","lead4Voice":"tngrCelesta","lead5Voice":"mrdrVibraphone","lead6Voice":"rmndTineEP","lead7Voice":"mrdrVibraphone","lead2Voice":"cryptTheremin"},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: 1.7, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    snare: { send: { reverb: 0.2 }, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    clap: { gain: -1, send: { reverb: 0.2 }, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    hats: { gain: -11, pan: 0.2, effects: [{ id: "bitcrusher", params: { bits: 10, downsample: 3, wet: 0.45 } }, { id: "tape", params: { drive: 8, bias: 0.1, tone: 6000, wow: 0.2, flutter: 0.1, wet: 0.7 } }] },
    ohats: { gain: -5.5, pan: 0.2 },
    tom: { gain: -4.9, pan: 0.3, send: { reverb: 0.35 } },
    rim: { gain: -12, pan: 0.3 },
    rim2: { gain: -10, pan: -0.3 },
    bass: { gain: 3.2 },
    bass2: { gain: -15.6 },
    chords: { gain: -12.3, pan: -0.15, send: { delay: 0.2, reverb: 0.35 }, effects: [{ id: "tape", params: { drive: 4, bias: 0.1, tone: 7000, wow: 0.35, flutter: 0.1, wet: 0.6 } }] },
    chords2: { gain: -2.4, send: { reverb: 0.6 }, eq: { low: -3 } },
    lead: { gain: -2, pan: 0.15, send: { delay: 0.3, reverb: 0.6 }, eq: { high: 0.5 } },
    lead3: { gain: -5, pan: 0.1, send: { delay: 0.3, reverb: 0.6 } },
    lead4: { gain: -10, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    lead5: { gain: -10, pan: -0.25, send: { delay: 0.3, reverb: 0.4 } },
    lead6: { gain: -6, pan: 0.15, send: { reverb: 0.4 } },
    lead7: { gain: -5.7, pan: -0.2, send: { delay: 0.3, reverb: 0.5 } },
    lead2: { gain: -2 },
  },
};

export const arrangement = {
  loop: {
    fromBar: 1,
    toBar: 64,
  },
  swing: 56,
  automation: {
    lead: {
      fx: [
        {
          from: [48,12],
          to: [49,0],
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
          from: [56,12],
          to: [57,0],
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
