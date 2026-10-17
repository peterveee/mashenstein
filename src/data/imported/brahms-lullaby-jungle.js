// ROCK-A-BYE BREAKS · JUNGLE — one song: what it plays, how it is arranged, how it sounds.
//
// Based on Johannes Brahms' Wiegenlied (Lullaby and Goodnight), Op. 49 No. 4.
// The public-domain opening melody is adapted from 3/4 to this 4/4 arrangement.
// Drum & Bass · Jungle at 165 BPM; the melody is recast in harmonic mode.
// An off-beat answering voice, wild phrase variations and layered counter-lines play against the hook.
// Source score: https://github.com/OpenScore/Lieder/blob/main/scores/Brahms,_Johannes/5_Lieder,_Op.49/4_Wiegenlied/lc5701612.mscx
// Regenerate with node tools/make-brahms-remixes.js --force.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "brahms-lullaby-jungle";
export const title = "ROCK-A-BYE BREAKS · JUNGLE";
export const slug = "brahms-lullaby-jungle";
export const group = "imported";
export const seed = 4907;

export const bank = {
  bpm: 165,
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
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead9: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . . . . . F#4 . . . F#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . F5 . . . C#5 . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . C5 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . F#4 . . . A#4 .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('C1 . . C1 . . C1 . . C1 . . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . A5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,[369.9944227116344,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,[349.2282314330039,440,523.2511306011972],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 F1 . F1 F1 F1 . F1 F1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . A4 F#4 F#4 . A4 F#4 | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead3: seq('. . . . . . . . F#4 . A4 F#4 F#4 . A4 F#4 | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . F4 D#4 D#4 . F4 D#4 | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . A5 F#5 F#5 . A5 F#5 | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . C5 . A#4 . F#4 . A4 F#4 A#4 . C5 A#4 | C#5 C5 D#5 . F5 D#5 C#5 . . . D#5 . C#5 . C5 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('A#4 . . . C5 . A#4 . F#4 . A4 F#4 A#4 . C5 A#4 | C#5 C5 D#5 . F5 D#5 C#5 . . . D#5 . C#5 . C5 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F#4 . . . A4 . F#4 . D#4 . F4 D#4 F#4 . A4 F#4 | A#4 A4 C5 . C#5 C5 A#4 . . . C5 . A#4 . A4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      lead4: seq('A#5 . . . C6 . A#5 . F#5 . A5 F#5 A#5 . C6 A#5 | C#6 C6 D#6 . F6 D#6 C#6 . . . D#6 . C#6 . C6 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,1,1,2,null,1,1,4,null,null,null,2,null,2,null,2,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('C5 . C#5 C5 A#4 . C5 A#4 F4 . F#4 F4 F#4 . A4 F#4 | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,[369.9944227116344,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead3: seq('C5 . C#5 C5 A#4 . C5 A#4 F4 . F#4 F4 F#4 . A4 F#4 | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A4 . A#4 A4 F#4 . A4 F#4 C#4 . D#4 C#4 D#4 . F4 D#4 | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . C#6 C6 A#5 . C6 A#5 F5 . F#5 F5 F#5 . A5 F#5 | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . A4 . G#4 . F4 . F#4 F4 G#4 . A4 C#5 | C#5 . C5 . A#4 . C5 A#4 A4 . . . F4 . . .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,[349.2282314330039,440,523.2511306011972],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 F1 . F1 F1 F1 . F1 F1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . . . . . C1 . . C1 . C1 C1 C1').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('G#4 . . . A4 . G#4 . F4 . F#4 F4 G#4 . A4 C#5 | C#5 . C5 . A#4 . C5 A#4 A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . F4 . F4 . C#4 . D#4 C#4 F4 . F4 A#4 | A#4 . A4 . F#4 . A4 F#4 F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
      lead4: seq('G#5 . . . A5 . G#5 . F5 . F#5 F5 G#5 . A5 C#6 | C#6 . C6 . A#5 . C6 A#5 A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,1,1,2,null,1,1,2,null,2,null,2,null,1,1,4,null,null,null,4,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
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
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('C1 . . C1 . . C1 . . C1 . . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 | A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1'),
      bassLen: [2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1,2,null,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead6: seq('F#5 . D#6 F#6 . A#5 D#6 . F#6 . A#6 D#6 . A#5 F#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | D#5 . . . C#5 . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead6: seq('F#5 . D#6 F#6 . A#5 D#6 . F#6 . A#6 D#6 . A#5 F#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
    },
    {
      lead: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: seq('F#5 . D#6 F#6 . A#5 D#6 . F#6 . A#6 D#6 . A#5 F#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
    },
    {
      lead: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,[369.9944227116344,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F#5 . C#6 F#6 . A#5 C#6 . F#6 . A#6 C#6 . A#5 F#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead5: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
    },
    {
      lead: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . F1 F1 F1 . . . .'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,null,null,null],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A6 C6 . . . .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . . . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . . . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null],
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . . . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      lead5: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . . . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,null,null,null,null],
    },
    {
      lead: [null,null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead6: seq('F#5 . D#6 F#6 . A#5 D#6 . F#6 . A#6 D#6 . A#5 F#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,[622.2539674441618,1244.5079348883237],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . A5 . . . . . F5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C#5 . . . . . . . A#4 . . . C#5 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('C#6 . . . . . . . A#5 . . . C#6 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('C#6 . . . . . . . A#5 . . . C#6 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[523.2511306011972,1046.5022612023945],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,[369.9944227116344,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F#5 . C#6 F#6 . A#5 C#6 . F#6 . A#6 C#6 . A#5 F#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[415.3046975799451,830.6093951598903],null,null,null,null,null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[554.3652619537442,1108.7305239074883],null,[523.2511306011972,1046.5022612023945],null,[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,null,null,[349.2282314330039,698.4564628660078],null,null,null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,[349.2282314330039,440,523.2511306011972],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . F1 F1 F1 . F1 F1 F1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . . . . . . . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A6 C6 . A5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead5: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . . . . . | . . . . . . . . F#4 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: [null,null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead6: seq('F#5 . D#6 F#6 . A#5 D#6 . F#6 . A#6 D#6 . A#5 F#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('. . . . . . . . D#4 . . . D#4 . . . | F#4 . . . A4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . A#4 . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . F#5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[466.1637615180899,932.3275230361799],null,null,null,null,null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,null,null,[622.2539674441618,1244.5079348883237],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead2: seq('. . . . F5 . . . . . C#5 . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 . D#1 D#1 D#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('D#1 . . . . . . . D#1 . . . . . . . | A#1 . . . . . . . A#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: seq('F#5 . D#6 F#6 . A#5 D#6 . F#6 . A#6 D#6 . A#5 F#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . . . . . F#4 . . . A#4 . . . | . . D#5 . . . C#5 . . . . . . . C5 .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F#4 . . . . . . . D#4 . . . F#4 . . . | . . C5 . . . A#4 . . . . . . . A4 .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead4: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,null,null,2,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('A#5 . . . . . . . F#5 . . . A#5 . . . | . . D#6 . . . C#6 . . . . . . . C6 .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null,2,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[523.2511306011972,1046.5022612023945],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[369.9944227116344,739.9888454232688],null,null,null,[466.1637615180899,932.3275230361799],null,null,null,[523.2511306011972,1046.5022612023945],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[466.1637615180899,932.3275230361799],null,null,null],
      leadLen: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . C#5 . . . F5 . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,[369.9944227116344,466.1637615180899,554.3652619537442],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | F#1 . . . . . . . F#1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      clapVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      snare: seq('. . . . C1 . . C1 . C1 . . C1 . . . | . . C1 . C1 . . C1 . . . . C1 . . C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,0.35,null,0.35,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,0.35],
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F#5 . C#6 F#6 . A#5 C#6 . F#6 . A#6 C#6 . A#5 F#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C5 . . . A#4 . . . F4 . . . F#4 . . . | A#4 . . . C5 . . . C#5 . . . A#4 . . .'),
      lead3Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('A4 . . . F#4 . . . C#4 . . . D#4 . . . | F#4 . . . A#4 . . . A#4 . . . F#4 . . .'),
      lead8Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead4: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,2,null,null,null,2,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . . . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('C6 . . . A#5 . . . F5 . . . F#5 . . . | A#5 . . . C6 . . . C#6 . . . A#5 . . .'),
      lead5Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[415.3046975799451,830.6093951598903],null,null,null,null,null,null,null,[349.2282314330039,698.4564628660078],null,null,null,[554.3652619537442,1108.7305239074883],null,null,null,[554.3652619537442,1108.7305239074883],null,[523.2511306011972,1046.5022612023945],null,[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,null,null,[349.2282314330039,698.4564628660078],null,null,null],
      leadLen: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,[349.2282314330039,440,523.2511306011972],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,2,null],
      bass: seq('. A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . F1 F1 F1 . F1 F1 F1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('A#1 . . . . . . . A#1 . . . . . . . | A#1 . . . . . . . F1 . . . . . . .'),
      bass2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      clap: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . C1 . . C1 . C1 . . C1 . C1 .').map((v) => !!v),
      clapVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. C1 . . C1 . . C1 . . . . C1 . . C1 | . . . . . . . . . . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,0.35,null,null,null,null,null,0.35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: seq('F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A6 C6 . A5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . . . . . F4 . . . C#5 . . . | C#5 . C5 . A#4 . . . A4 . . . F4 . . .'),
      lead3Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 . C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . C1 . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . . . . . C#4 . . . A#4 . . . | A#4 . A4 . F#4 . . . F4 . . . C#4 . . .'),
      lead8Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead4: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead4Len: [4,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead9: seq('. . . . . . A#4 . . . A#4 . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      rim2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead7: [[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[349.2282314330039,440,523.2511306011972],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead5: seq('G#5 . . . . . . . F5 . . . C#6 . . . | C#6 . C6 . A#5 . . . A5 . . . F5 . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . F#4 . . . F#4 . . . | A#4 . . . . . . . F#4 . . . F#4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,6,null,null,null,null,null,null,null,2,null,null,null,4,null,null,null],
      lead2: seq('. . . F5 . . . C#5 . . . . . . . . | . . . . . . F5 . . . C#5 . . . . .'),
      lead2Len: [null,null,null,2,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . C1 . . . . . . . C1 . . . . .').map((v) => !!v),
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
      kick: seq('C1 . . . . . . . . . C1 . . C1 . . | C1 . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . C1 . C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
};

export const banger = {
  "version": 1,
  "generator": 11,
  "style": "dnb-jungle",
  "flavour": "jungle",
  "options": {
    "style": "dnb",
    "mood": "boss",
    "mode": "harmonic",
    "riffNotes": "fit",
    "length": "custom",
    "customBars": 64,
    "energy": "maximum",
    "variation": "wild",
    "tempo": "style",
    "bpm": 174,
    "hook": "auto",
    "combo": null,
    "flavour": "jungle",
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
      "doubleDrop": true,
      "keyLift": "none",
      "keyApproach": "mood",
      "mood2": "none",
      "moodSwitch": "breakdown",
      "hardStop": true,
      "falseEnding": true,
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
      "crashes": true,
      "fills": true,
      "rolls": true,
      "impact": true,
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
      "counter": true,
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
      "pump": false,
      "delayThrows": true,
      "lowpassIntro": false,
      "bitcrushIntro": false,
      "tapeStop": false,
      "gateChoir": false
    }
  },
  "seed": 4907,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "dnb-jungle",
    "moodId": "boss",
    "parts": {}
  },
  "palette": [
    {
      "lane": "kick",
      "part": "part:kick",
      "preset": "kit_breakbeat_kick",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "snare",
      "part": "part:snare",
      "preset": "kit_breakbeat_snare",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "kit_breakbeat_clap",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "hats",
      "part": "part:hats",
      "preset": "kit_breakbeat_hats",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "ohats",
      "part": "part:ohats",
      "preset": "kit_breakbeat_ohats",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "crash",
      "part": "part:crash",
      "preset": "kit_breakbeat_crash",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom",
      "part": "part:impact",
      "preset": "crash808Long",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "tom2",
      "part": "part:fill",
      "preset": "kit_breakbeat_tom",
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
      "preset": "tngrSoftStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "glassPad",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:square",
      "preset": "tngrWireHarp",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead4",
      "part": "part:bell",
      "preset": "tngrAlloyChime",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead5",
      "part": "part:megaSaw",
      "preset": "bestPwmHollowLead",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead6",
      "part": "part:arp",
      "preset": "tngrWireHarp",
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
      "preset": "rmndTineEP",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead9",
      "part": "part:counter",
      "preset": "tngrAlloyChime",
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
        "voice": "tngrWireHarp",
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
    "impact": "tom",
    "fill": "tom2",
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
      "to": 24,
      "energy": 0.85
    },
    {
      "id": "club:breakdown:1",
      "role": "breakdown",
      "type": "breakdown",
      "label": "Breakdown",
      "from": 25,
      "to": 28,
      "energy": 0.25
    },
    {
      "id": "club:build:2",
      "role": "build2",
      "type": "build",
      "label": "Build 2",
      "from": 29,
      "to": 32,
      "energy": 0.65
    },
    {
      "id": "club:drop:2",
      "role": "drop2",
      "type": "drop",
      "label": "Drop 2",
      "from": 33,
      "to": 40,
      "energy": 0.9
    },
    {
      "id": "club:drop:3",
      "role": "drop3",
      "type": "drop",
      "label": "Drop 3",
      "from": 41,
      "to": 48,
      "energy": 1
    },
    {
      "id": "club:falseEnding:1",
      "role": "false",
      "type": "falseEnding",
      "label": "False Ending",
      "from": 49,
      "to": 52,
      "energy": 0.15
    },
    {
      "id": "club:drop:4",
      "role": "reprise",
      "type": "drop",
      "label": "Reprise",
      "from": 53,
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
      "style": "Drum & Bass · Jungle",
      "mood": "boss",
      "key": "A# harmonic minor",
      "reads": "A# major",
      "bars": 64,
      "bpm": 165,
      "seconds": 93,
      "variation": "wild",
      "hook": "Lullaby melody"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Drum & Bass's own · kick · =909 Kick Punch, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 0.2,
        "move": 0.2,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "snare",
        "job": "snare",
        "how": "sound",
        "from": "Drum & Bass's own · snare · Tight Snare, bars 45–52",
        "base": 1,
        "before": 1,
        "after": -4.8,
        "move": -5.8,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "clap",
        "job": "clap",
        "how": "sound",
        "from": "Drum & Bass's own · clap · Crack Snare, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 4.2,
        "move": 4.2,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "hats",
        "job": "hats",
        "how": "sound",
        "from": "Drum & Bass's own · hats · = Arcade Hat, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -5.8,
        "move": 0.2,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "ohats",
        "job": "ohats",
        "how": "sound",
        "from": "Drum & Bass's own · ohats · Open Hat, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -10.6,
        "move": -0.6,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "crash",
        "job": "crash",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · crash · Blast · Boom, bars 45–52",
        "base": -2.9,
        "before": -7,
        "after": -7,
        "move": 0,
        "window": [
          52,
          59
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
        "after": 3,
        "move": 6,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "tom2",
        "job": "fill",
        "how": "sound",
        "from": "BIG-ROOM HOUSE SEED · fill · =909 Tom, bars 52–59",
        "base": -5,
        "before": -5,
        "after": -7.1,
        "move": -2.1,
        "window": [
          59,
          59
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
          52,
          59
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
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "crash3",
        "job": "ride",
        "how": "sound",
        "from": "Drum & Bass's own · ride · 909 Lo-Fi Ride, bars 45–52",
        "base": -14,
        "before": -14,
        "after": -14,
        "move": 0,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "bass",
        "job": "bass",
        "how": "part",
        "from": "Drum & Bass's own · bass · Reese Bass, bars 45–52",
        "base": -2,
        "before": -2,
        "after": -3.2,
        "move": -1.2,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "bass2",
        "job": "sub",
        "how": "part",
        "from": "Drum & Bass's own · sub · Sub Sine, bars 45–52",
        "base": -7,
        "before": -7,
        "after": -8.5,
        "move": -1.5,
        "window": [
          52,
          59
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
        "after": -4.1,
        "move": -8.1,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "chords2",
        "job": "pad",
        "how": "part",
        "from": "Drum & Bass's own · pad · Dream Pad, bars 45–52",
        "base": -9,
        "before": -9,
        "after": -7.1,
        "move": 1.9,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "lead3",
        "job": "square",
        "how": "part",
        "from": "Drum & Bass's own · square · Metal Harp, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -1.9,
        "move": 1.1,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "lead4",
        "job": "bell",
        "how": "part",
        "from": "Drum & Bass's own · bell · Ice Bell, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -7.7,
        "move": 0.3,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "lead5",
        "job": "megaSaw",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · megaSaw · Mega Saw Lead, bars 45–52",
        "base": -5.5,
        "before": -6,
        "after": -6.9,
        "move": -0.9,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "lead6",
        "job": "arp",
        "how": "part",
        "from": "Drum & Bass's own · arp · Random Pulse Keys, bars 45–52",
        "base": -12,
        "before": -12,
        "after": -14.3,
        "move": -2.3,
        "window": [
          52,
          59
        ],
        "calibrated": false
      },
      {
        "lane": "lead7",
        "job": "choir",
        "how": "part",
        "from": "Drum & Bass's own · choir · Synth Choir Ooh, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -8.8,
        "move": -0.8,
        "window": [
          52,
          59
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
        "after": -7.2,
        "move": -0.2,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "lead9",
        "job": "counter",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · counter · Crystal Trigger, bars 46–53",
        "base": -8.3,
        "before": -9,
        "after": -7.6,
        "move": 1.4,
        "window": [
          52,
          59
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
        "voice": "tngrWireHarp",
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
        "voice": "kit_breakbeat_kick",
        "voiceParams": null,
        "strip": {
          "gain": 0.2,
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 12,
                "downsample": 2,
                "wet": 0.5
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
        "voice": "kit_breakbeat_snare",
        "voiceParams": null,
        "strip": {
          "gain": -4.8,
          "send": {
            "reverb": 0.15
          },
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 12,
                "downsample": 2,
                "wet": 0.5
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "SNARE Two-Step",
        "voice": "kit_breakbeat_clap",
        "voiceParams": null,
        "strip": {
          "gain": 4.2,
          "send": {
            "reverb": 0.15
          },
          "effects": [
            {
              "id": "bitcrusher",
              "params": {
                "bits": 12,
                "downsample": 2,
                "wet": 0.5
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
        "voice": "kit_breakbeat_hats",
        "voiceParams": null,
        "strip": {
          "gain": -5.8,
          "pan": 0.2
        },
        "noteFX": null
      },
      {
        "role": "ohats",
        "lane": "ohats",
        "label": "OPEN HATS",
        "voice": "kit_breakbeat_ohats",
        "voiceParams": null,
        "strip": {
          "gain": -10.6,
          "pan": -0.15
        },
        "noteFX": null
      },
      {
        "role": "crash",
        "lane": "crash",
        "label": "CRASH",
        "voice": "kit_breakbeat_crash",
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
          "label": "Long Riser",
          "category": "Sweep",
          "homeLane": "crash",
          "kind": "drum",
          "dur": 5.818181818181818,
          "note": "White noise through a band climbing 250 Hz to 8 kHz over 5.82s as it fades in: the lift into a drop.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 5.818181818181818,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 5.3527272727272734,
            "hold": 0,
            "decay": 0.46545454545454545,
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
        "voice": "crash808Long",
        "voiceParams": null,
        "strip": {
          "gain": -1.4,
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
        "voice": "kit_breakbeat_tom",
        "voiceParams": null,
        "strip": {
          "gain": -7.1,
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
        "role": "ride",
        "lane": "crash3",
        "label": "RIDE",
        "voice": "ride909SixBit",
        "voiceParams": null,
        "strip": {
          "gain": -14,
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
          "gain": -3.2
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
          "gain": -8.5
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
          "gain": -4.1,
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
        "label": "STRINGS · Glass Pad",
        "voice": "glassPad",
        "voiceParams": null,
        "strip": {
          "gain": -7.1,
          "eq": {
            "low": -6
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
        "label": "HOOK PLUCK · Metal Harp",
        "voice": "tngrWireHarp",
        "voiceParams": null,
        "strip": {
          "gain": -1.9,
          "pan": 0.05,
          "send": {
            "delay": 0.2,
            "reverb": 0.35
          }
        },
        "noteFX": null
      },
      {
        "role": "bell",
        "lane": "lead4",
        "label": "HOOK 8VA · Dark Metal Chime",
        "voice": "tngrAlloyChime",
        "voiceParams": null,
        "strip": {
          "gain": -7.7,
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
        "lane": "lead5",
        "label": "LEAD 8VA · PWM Hollow Lead",
        "voice": "bestPwmHollowLead",
        "voiceParams": null,
        "strip": {
          "gain": -6.9,
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
        "lane": "lead6",
        "label": "ARP · Metal Harp",
        "voice": "tngrWireHarp",
        "voiceParams": null,
        "strip": {
          "gain": -14.3,
          "pan": -0.25,
          "send": {
            "delay": 0.25,
            "reverb": 0.3
          }
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
          "gain": -8.8,
          "send": {
            "reverb": 0.65
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead8",
        "label": "THIRD BELOW · Tine Electric Piano",
        "voice": "rmndTineEP",
        "voiceParams": null,
        "strip": {
          "gain": -7.2,
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
        "label": "COUNTER-MELODY · Dark Metal Chime",
        "voice": "tngrAlloyChime",
        "voiceParams": null,
        "strip": {
          "gain": -7.6,
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
        "notes": "b43779bc",
        "voice": "cff79153",
        "auto": "2250275d",
        "expression": "77074ba4",
        "production": "67950eff"
      },
      "riff:lead2": {
        "notes": "1be33d5",
        "voice": "c6497533",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "kick": {
        "notes": "872daa76",
        "voice": "47a8549f",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "22f38560"
      },
      "snare": {
        "notes": "50de1eef",
        "voice": "3e6a97e8",
        "auto": "8796479a",
        "expression": "77074ba4",
        "production": "145657b7"
      },
      "clap": {
        "notes": "df54f25b",
        "voice": "ab86838b",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "145657b7"
      },
      "hats": {
        "notes": "cc3fd77d",
        "voice": "ffadbeb",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "67032c6a",
        "voice": "b82e42a2",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "7caa9009",
        "voice": "7e0fc6e6",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ae0a06d"
      },
      "riser": {
        "notes": "bf4c36ad",
        "voice": "1f277560",
        "auto": "f2ccf066",
        "expression": "77074ba4",
        "production": "ce4dd3c6"
      },
      "impact": {
        "notes": "f24a6ffa",
        "voice": "8c1df3f",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "fill": {
        "notes": "c965cec3",
        "voice": "1f4d4ef3",
        "auto": "4d3b54a5",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "shaker": {
        "notes": "e90775b8",
        "voice": "573ce642",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "e6ab970a",
        "voice": "4a3e77e",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "ride": {
        "notes": "a6ff733d",
        "voice": "2371fa8d",
        "auto": "4d3b54a5",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "7052600e",
        "voice": "f9cf1993",
        "auto": "7101cf6b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "sub": {
        "notes": "ccfd837a",
        "voice": "94966028",
        "auto": "7101cf6b",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "saws": {
        "notes": "a8e5390e",
        "voice": "d01b65e3",
        "auto": "7101cf6b",
        "expression": "77074ba4",
        "production": "b57fa6ed"
      },
      "pad": {
        "notes": "1dea9ba0",
        "voice": "bedfb835",
        "auto": "5306acaa",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "square": {
        "notes": "455b20d1",
        "voice": "cff79153",
        "auto": "7101cf6b",
        "expression": "77074ba4",
        "production": "9ece8a69"
      },
      "bell": {
        "notes": "ed31c813",
        "voice": "61873e04",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "cc3c3429"
      },
      "megaSaw": {
        "notes": "5e95e385",
        "voice": "b831b9f7",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "arp": {
        "notes": "ac3c45c2",
        "voice": "cff79153",
        "auto": "7101cf6b",
        "expression": "77074ba4",
        "production": "8ac28975"
      },
      "choir": {
        "notes": "cce6b85d",
        "voice": "1d17ad96",
        "auto": "4d3b54a5",
        "expression": "77074ba4",
        "production": "6cfc83ef"
      },
      "third": {
        "notes": "50d3d168",
        "voice": "20a08fc2",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "a5907f22",
        "voice": "61873e04",
        "auto": "89f05c70",
        "expression": "77074ba4",
        "production": "181c5976"
      }
    },
    "master": "94499354"
  }
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }, { key: "lead9", from: "lead", independent: true }, { key: "lead2", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","tom2","rim","rim2","crash3","bass","bass2","chords","chords2","lead","lead3","lead4","lead5","lead6","lead7","lead8","lead9","lead2"],
  labels: {"kick":"KICK","snare":"BREAK","clap":"SNARE Two-Step","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"IMPACT","tom2":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","crash3":"RIDE","bass":"SUB · Walking Sine Bass","bass2":"SUB · Sub Sine","chords":"CHORDS Stabs · Soft Strings","chords2":"STRINGS · Glass Pad","lead":"RIFF Lullaby melody · HOOK","lead3":"HOOK PLUCK · Metal Harp","lead4":"HOOK 8VA · Dark Metal Chime","lead5":"LEAD 8VA · PWM Hollow Lead","lead6":"ARP · Metal Harp","lead7":"CHOIR · Glass Choir","lead8":"THIRD BELOW · Tine Electric Piano","lead9":"COUNTER-MELODY · Dark Metal Chime","lead2":"RIFF After-hours answer"},
  voice: {"kickVoice":"kit_breakbeat_kick","snareVoice":"kit_breakbeat_snare","clapVoice":"kit_breakbeat_clap","hatsVoice":"kit_breakbeat_hats","ohatsVoice":"kit_breakbeat_ohats","crashVoice":"kit_breakbeat_crash","tomVoice":"crash808Long","tom2Voice":"kit_breakbeat_tom","rimVoice":"shaker","rim2Voice":"tambourine","crash3Voice":"ride909SixBit","bassVoice":"layerWalkingBass","bass2Voice":"stSubSine","chordsVoice":"tngrSoftStrings","chords2Voice":"glassPad","leadVoice":"tngrWireHarp","lead3Voice":"tngrWireHarp","lead4Voice":"tngrAlloyChime","lead5Voice":"bestPwmHollowLead","lead6Voice":"tngrWireHarp","lead7Voice":"tngrGlassChoir","lead8Voice":"rmndTineEP","lead9Voice":"tngrAlloyChime","lead2Voice":"tngrIceBell"},
  voiceParams: {"crash2Voice":{"label":"Long Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":5.818181818181818,"note":"White noise through a band climbing 250 Hz to 8 kHz over 5.82s as it fades in: the lift into a drop.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":5.818181818181818,"Q":1.6,"slope":-24,"color":"white","attack":5.3527272727272734,"hold":0,"decay":0.46545454545454545,"curve":"exp","gain":1},"drive":0.08,"peak":0.034}},
  fx: { reverb: { decay: 3.4 } },
  lanes: {
    kick: { gain: 0.2, effects: [{ id: "bitcrusher", params: { bits: 12, downsample: 2, wet: 0.5 } }] },
    snare: { gain: -4.8, send: { reverb: 0.15 }, effects: [{ id: "bitcrusher", params: { bits: 12, downsample: 2, wet: 0.5 } }] },
    clap: { gain: 4.2, send: { reverb: 0.15 }, effects: [{ id: "bitcrusher", params: { bits: 12, downsample: 2, wet: 0.5 } }] },
    hats: { gain: -5.8, pan: 0.2 },
    ohats: { gain: -10.6, pan: -0.15 },
    crash: { gain: -7, pan: 0.2, send: { reverb: 0.9 } },
    crash2: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -1.4, send: { reverb: 0.6 } },
    tom2: { gain: -7.1, pan: 0.2, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    crash3: { gain: -14, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -3.2 },
    bass2: { gain: -8.5 },
    chords: { gain: -4.1, send: { reverb: 0.25 }, eq: { low: -3 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    chords2: { gain: -7.1, send: { reverb: 0.6 }, eq: { low: -6 } },
    lead: { pan: -0.05, send: { delay: 0.12, reverb: 0.3 }, eq: { high: 2 }, effects: [{ id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.18 } }] },
    lead3: { gain: -1.9, pan: 0.05, send: { delay: 0.2, reverb: 0.35 } },
    lead4: { gain: -7.7, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    lead5: { gain: -6.9, send: { reverb: 0.25 }, eq: { low: -3 } },
    lead6: { gain: -14.3, pan: -0.25, send: { delay: 0.25, reverb: 0.3 } },
    lead7: { gain: -8.8, send: { reverb: 0.65 } },
    lead8: { gain: -7.2, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead9: { gain: -7.6, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
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
      cuts: [[40,12],[49,0]],
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
          from: [29,0],
          to: [33,0],
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
      cuts: [[40,12]],
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
          from: [29,0],
          to: [33,0],
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
      cuts: [[40,12],[49,0]],
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
          from: [29,0],
          to: [33,0],
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
      cuts: [[40,12],[49,0]],
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
          from: [29,0],
          to: [33,0],
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
      cuts: [[40,12],[49,0]],
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
          from: [29,0],
          to: [33,0],
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
      cuts: [[40,12],[49,0]],
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
          from: [29,0],
          to: [33,0],
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
      points: [[5,0,0],[5,0,-8],[9,0,0],[29,0,0],[29,0,-8],[33,0,0]],
      cuts: [[40,12],[49,0]],
    },
    __master: {
      fx: [
        {
          from: [8,12],
          to: [8,14],
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
          from: [8,14],
          to: [9,0],
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
          from: [32,8],
          to: [32,12],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.5,
                retrigger: 0,
                fade: 0,
              },
            },
          ],
        },
        {
          from: [32,12],
          to: [33,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.25,
                retrigger: 0,
                fade: -1,
              },
            },
          ],
        },
        {
          from: [52,8],
          to: [52,12],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.5,
                retrigger: 0,
                fade: -1,
              },
            },
            {
              id: "filter",
              params: {
                type: "highpass",
                frequency: 250,
                Q: 0.9,
              },
            },
          ],
        },
        {
          from: [52,12],
          to: [52,14],
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
                frequency: 600,
                Q: 0.9,
              },
            },
          ],
        },
        {
          from: [52,14],
          to: [53,0],
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
                frequency: 1500,
                Q: 0.9,
              },
            },
          ],
        },
      ],
    },
    lead: {
      points: [[41,0,0],[41,0,-2.5],[49,0,-2.5],[49,0,0],[53,0,0],[53,0,-2.5],[61,0,-2.5],[61,0,0]],
      cuts: [[40,12],[49,0]],
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
          from: [40,8],
          to: [40,12],
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
      ],
    },
    lead4: {
      cuts: [[40,12],[49,0]],
    },
    lead5: {
      cuts: [[40,12],[49,0]],
    },
    lead8: {
      cuts: [[40,12],[49,0]],
    },
    kick: {
      cuts: [[40,12],[49,0]],
    },
    clap: {
      cuts: [[40,12],[49,0]],
    },
    ohats: {
      cuts: [[40,12],[49,0]],
    },
    hats: {
      cuts: [[40,12],[49,0]],
    },
    rim: {
      cuts: [[40,12],[49,0]],
    },
    rim2: {
      cuts: [[40,12],[49,0]],
    },
    lead9: {
      cuts: [[40,12],[49,0]],
    },
    lead7: {
      cuts: [[49,0]],
    },
    crash3: {
      cuts: [[49,0]],
    },
    tom2: {
      cuts: [[49,0]],
    },
    crash2: {
      fx: [
        {
          from: [5,0],
          to: [9,0],
          chain: [
            {
              id: "bitcrusher",
              params: {
                bits: 6,
                downsample: 4,
                wet: 0.7,
              },
            },
          ],
        },
        {
          from: [29,0],
          to: [33,0],
          chain: [
            {
              id: "bitcrusher",
              params: {
                bits: 6,
                downsample: 4,
                wet: 0.7,
              },
            },
          ],
        },
        {
          from: [37,0],
          to: [41,0],
          chain: [
            {
              id: "bitcrusher",
              params: {
                bits: 6,
                downsample: 4,
                wet: 0.7,
              },
            },
          ],
        },
        {
          from: [49,0],
          to: [53,0],
          chain: [
            {
              id: "bitcrusher",
              params: {
                bits: 6,
                downsample: 4,
                wet: 0.7,
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
