// NEON ORBIT BANGER — one song: what it plays, how it is arranged, how it sounds.
//
// A BANGER, made on the desk from bars 1–2 of NEON ORBIT.
// Big-Room House · dark · G# major · some · 48 bars at 127 BPM, 91s.
// The hook is Simple Square. Seed 2440772692; generator v1.
// 
//     1–4    Intro
//     5–8    Build
//     9–24   Drop
//    25–28   Breakdown
//    29–32   Build 2
//    33–40   Drop 2
//    41–48   Drop 3 (lifted)
// 
// Written by tools/lib/banger/ (Make a Banger…). The recipe — riff, options, seed — is in
// `banger` below, which is what Another Take re-rolls. Mix it freely: the desk saves under
// the marker and never touches the music above it.
//
// THE LAB'S STARTER SONG (3 Oct 2026): copied from work/bangers/neon-orbit-banger.js as
// Peter saved it on the desk — the dark-mood take, which replaced the first (hypnotic) one
// the same afternoon — so a Lab opens on a song that sounds like this rather than an empty
// list (src/game/banger/starters.js). The game plays this file exactly; it is not
// regenerated.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "neon-orbit-banger";
export const title = "NEON ORBIT BANGER";
export const slug = "neon-orbit-banger";
export const group = "banger";
export const seed = 2440772692;

export const bank = {
  bpm: 127,
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
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . . . . . . .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,8,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,369.9944227116344,466.1637615180899],null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. F#2 F#2 F#2 . F#2 F#2 F#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . F#1 . . . F#1 . . . G#1 . . . G#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . . . . . . .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,8,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . F6 . . . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. F#2 F#2 F#2 . F#2 F#2 F#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . F#1 . . . F#1 . . . G#1 . . . G#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . F6 . . . . . D#6 . . . A6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('C7 . . . G#6 . . . G6 . . . D#7 . . . | G#6 . . . G6 . C#7 . . . G6 . . . C7 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . C2 C2 C2 . C2 C2 C2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('C7 . . . G#6 . . . G6 . . . D#7 . . . | G#6 . . . G6 . C#7 . . . G6 . . . C7 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . A#6 . . . G6 . . .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[391.99543598174927,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. F#2 F#2 F#2 . F#2 F#2 F#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . F#1 . . . F#1 . . . G#1 . . . G#1 . | . . D#1 . . . D#1 . . . D#1 . . . D#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . A#6 . . . G6 . . .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . . . D#7 . . . A7 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G#6 . . . F6 . . . D#6 . . . C7 . . . | G#6 . . . G6 . C#7 . . . G6 . . . C7 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. C#2 C#2 C#2 . C#2 C#2 C#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . C#1 . . . C#1 . . . G#1 . . . G#1 . | . . C1 . . . C1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('G#6 . . . F6 . . . D#6 . . . C7 . . . | G#6 . . . G6 . C#7 . . . G6 . . . C7 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('G#7 . . . F7 . . . D#7 . . . C8 . . . | G#7 . . . G7 . C#8 . . . G7 . . . C8 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . . . D#7 . . . A7 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . A#6 . . . G6 . . .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[391.99543598174927,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. F#2 F#2 F#2 . F#2 F#2 F#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . F#1 . . . F#1 . . . G#1 . . . G#1 . | . . D#1 . . . D#1 . . . D#1 . . . D#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . A#6 . . . G6 . . .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . A#7 . . . G7 . . .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('F#6 . . . . . . . C#6 . . . . . . . | C6 . . . . . . . G#6 . . . . . . .'),
      leadLen: [4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      chords2: [[174.61411571650194,261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('G#2 . . . . . . . . . . . . . . . | G#2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#1 . . . . . . . . . . . . . . . | G#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('F#7 . . . C#7 . . . C7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,null,null,2,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('F6 . . . . . . . D#6 . . . B6 . . . | . . . . D#6 . . . . . . . A6 . . .'),
      leadLen: [4,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,4,null,null,null],
      chords2: [[261.6255653005986,311.1269837220809,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,233.08188075904496,311.1269837220809,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G#2 . . . . . . . . . . . . . . . | G#2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#1 . . . . . . . . . . . . . . . | G#1 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('F7 . . . D#7 . B7 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,null,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G#6 . . . F6 . . . D#6 . . . C7 . . . | F6 . . . D#6 . B6 . . . . . . . . .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,8,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      chords2: [[277.1826309768721,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. C#2 C#2 C#2 . C#2 C#2 C#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . C#1 . . . C#1 . . . G#1 . . . G#1 . | . . C1 . . . C1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead2: seq('G#6 . . . F6 . . . D#6 . . . C7 . . . | F6 . . . D#6 . B6 . . . . . . . . .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,8,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . . . D#7 . . . A7 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      lead4: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . . . D#7 . . . A7 .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,3,null,null,null,3,null,null,null,2,null],
      lead5: seq('D#6 . . . A#5 . . . G#5 . . . F6 . . . | C#6 . . . C6 . G#6 . . . C6 . . . G6 .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('G#6 . . . F6 . . . D#6 . . . C7 . . . | G#6 . . . G6 . C#7 . . . G6 . . . C7 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[311.1269837220809,391.99543598174927,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. C#2 C#2 C#2 . C#2 C#2 C#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . C#1 . . . C#1 . . . G#1 . . . G#1 . | . . C1 . . . C1 . . . C1 . . . C1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead2: seq('G#6 . . . F6 . . . D#6 . . . C7 . . . | G#6 . . . G6 . C#7 . . . G6 . . . C7 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      lead3: seq('G#7 . . . F7 . . . D#7 . . . C8 . . . | G#7 . . . G7 . C#8 . . . G7 . . . C8 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      lead4: seq('G#7 . . . F7 . . . D#7 . . . C8 . . . | G#7 . . . G7 . C#8 . . . G7 . . . C8 .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,3,null,null,null,3,null,null,null,2,null],
      lead5: seq('F6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . A#6 . . . D#6 . . . G#6 .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      chords: [[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2 . G#2 G#2 G#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . . . D#6 . . . A6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      lead3: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . . . D#7 . . . A7 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      lead4: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . . . D#7 . . . A7 .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,3,null,null,null,3,null,null,null,2,null],
      lead5: seq('D#6 . . . A#5 . . . G#5 . . . F6 . . . | C#6 . . . C6 . G#6 . . . C6 . . . G6 .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
    },
    {
      lead: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . A#6 . . . . . . .'),
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,554.3652619537442],null,null,null,null,null,null,null,[311.1269837220809,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[391.99543598174927,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. F#2 F#2 F#2 . F#2 F#2 F#2 . G#2 G#2 G#2 . G#2 G#2 G#2 | . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . . . .'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,null,null,null],
      bass2: seq('. . F#1 . . . F#1 . . . G#1 . . . G#1 . | . . D#1 . . . D#1 . . . D#1 . . . . .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      lead2: seq('F#6 . . . C#6 . . . C6 . . . G#6 . . . | F6 . . . D#6 . B6 . A#6 . . . . . . .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,null,null,null,null],
      lead3: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . A#7 . . . . . . .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,null,null,null,null],
      lead4: seq('F#7 . . . C#7 . . . C7 . . . G#7 . . . | F7 . . . D#7 . B7 . A#7 . . . . . . .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,null,null,null,null],
      lead5: seq('D#6 . . . A#5 . . . G#5 . . . F6 . . . | C#6 . . . C6 . G#6 . G6 . . . . . . .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,null,null,null,null],
    },
    {
      lead: [[1661.2187903197805,3322.437580639561],null,null,null,[1244.5079348883237,2489.0158697766474],null,null,null,[1174.6590716696303,2349.31814333926],null,null,null,[1864.6550460723597,3729.3100921447194],null,null,null,[1567.981743926997,3135.9634878539946],null,null,null,[1396.9129257320155,2793.825851464031],null,[2217.4610478149766,4434.922095629953],null,null,null,[1396.9129257320155,2793.825851464031],null,null,null,[1975.533205024496,3951.066410048992],null],
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. A#2 A#2 A#2 . A#2 A#2 A#2 . A#2 A#2 A#2 . A#2 A#2 A#2 | . A#2 A#2 A#2 . A#2 A#2 A#2 . A#2 A#2 A#2 . A#2 A#2 A#2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . A#1 . . . A#1 . . . A#1 . . . A#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('G#6 . . . D#6 . . . D6 . . . A#6 . . . | G6 . . . F6 . C#7 . . . F6 . . . B6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('G#7 . . . D#7 . . . D7 . . . A#7 . . . | G7 . . . F7 . C#8 . . . F7 . . . B7 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead4: seq('G#7 . . . D#7 . . . D7 . . . A#7 . . . | G7 . . . F7 . C#8 . . . F7 . . . B7 .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,3,null,null,null,3,null,null,null,2,null],
      lead5: seq('F6 . . . C6 . . . A#5 . . . G6 . . . | D#6 . . . D6 . A#6 . . . D6 . . . A6 .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1661.2187903197805,3322.437580639561],null,null,null,[1244.5079348883237,2489.0158697766474],null,null,null,[1174.6590716696303,2349.31814333926],null,null,null,[1864.6550460723597,3729.3100921447194],null,null,null,[1567.981743926997,3135.9634878539946],null,null,null,[1567.981743926997,3135.9634878539946],null,null,null,null,null,[1396.9129257320155,2793.825851464031],null,null,null,[1975.533205024496,3951.066410048992],null],
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . A#2 A#2 A#2 . A#2 A#2 A#2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . A#1 . . . A#1 . | . . C2 . . . C2 . . . C2 . . . C2 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('G#6 . . . D#6 . . . D6 . . . A#6 . . . | G6 . . . G6 . . . . . F6 . . . B6 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('G#7 . . . D#7 . . . D7 . . . A#7 . . . | G7 . . . G7 . . . . . F7 . . . B7 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,2,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead4: seq('G#7 . . . D#7 . . . D7 . . . A#7 . . . | G7 . . . G7 . . . . . F7 . . . B7 .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,2,null],
      lead5: seq('F6 . . . C6 . . . A#5 . . . G6 . . . | D#6 . . . D#6 . . . . . D6 . . . A6 .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,2,null,null,null,2,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[2349.31814333926,4698.63628667852],null,null,null,[1864.6550460723597,3729.3100921447194],null,null,null,[1760,3520],null,null,null,[2793.825851464031,5587.651702928062],null,null,null,[1864.6550460723597,3729.3100921447194],null,null,null,[1760,3520],null,[2489.0158697766474,4978.031739553295],null,null,null,[1760,3520],null,null,null,[2349.31814333926,4698.63628667852],null],
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,[349.2282314330039,440,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. A#2 A#2 A#2 . A#2 A#2 A#2 . D2 D2 D2 . D2 D2 D2 | . D2 D2 D2 . D2 D2 D2 . D2 D2 D2 . D2 D2 D2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . A#1 . . . A#1 . . . D1 . . . D1 . | . . D1 . . . D1 . . . D1 . . . D1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead2: seq('D7 . . . A#6 . . . A6 . . . F7 . . . | A#6 . . . A6 . D#7 . . . A6 . . . D7 .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead3: seq('D8 . . . A#7 . . . A7 . . . F8 . . . | A#7 . . . A7 . D#8 . . . A7 . . . D8 .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead4: seq('D8 . . . A#7 . . . A7 . . . F8 . . . | A#7 . . . A7 . D#8 . . . A7 . . . D8 .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,3,null,null,null,3,null,null,null,2,null],
      lead5: seq('A#6 . . . G6 . . . F6 . . . D7 . . . | G6 . . . F6 . C7 . . . F6 . . . A#6 .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1661.2187903197805,3322.437580639561],null,null,null,[1244.5079348883237,2489.0158697766474],null,null,null,[1174.6590716696303,2349.31814333926],null,null,null,[1864.6550460723597,3729.3100921447194],null,null,null,[1567.981743926997,3135.9634878539946],null,null,null,[1396.9129257320155,2793.825851464031],null,[2217.4610478149766,4434.922095629953],null,[2093.004522404789,4186.009044809578],null,null,null,[1760,3520],null,null,null],
      leadLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,[440,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('. G#2 G#2 G#2 . G#2 G#2 G#2 . A#2 A#2 A#2 . A#2 A#2 A#2 | . F2 F2 F2 . F2 F2 F2 . F2 F2 F2 . F2 F2 F2'),
      bassLen: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass2: seq('. . G#1 . . . G#1 . . . A#1 . . . A#1 . | . . F1 . . . F1 . . . F1 . . . F1 .'),
      bass2Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      lead2: seq('G#6 . . . D#6 . . . D6 . . . A#6 . . . | G6 . . . F6 . C#7 . C7 . . . A6 . . .'),
      lead2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      lead3: seq('G#7 . . . D#7 . . . D7 . . . A#7 . . . | G7 . . . F7 . C#8 . C8 . . . A7 . . .'),
      lead3Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead4: seq('G#7 . . . D#7 . . . D7 . . . A#7 . . . | G7 . . . F7 . C#8 . C8 . . . A7 . . .'),
      lead4Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,3,null,null,null,3,null,null,null],
      lead5: seq('F6 . . . C6 . . . A#5 . . . G6 . . . | D#6 . . . D6 . A#6 . A6 . . . F6 . . .'),
      lead5Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
};

export const banger = {
  "version": 1,
  "generator": 1,
  "style": "big-room",
  "options": {
    "style": "big-room",
    "mood": "dark",
    "key": "keep",
    "length": "short",
    "customBars": 64,
    "variation": "some",
    "tempo": "custom",
    "bpm": 127,
    "hook": "auto",
    "form": {
      "intro": true,
      "build": true,
      "breakdown": true,
      "secondDrop": true,
      "doubleDrop": true,
      "keyLift": "whole",
      "hardStop": true,
      "falseEnding": false,
      "halfTime": true,
      "outro": true
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
      "congas": false,
      "cowbell": false,
      "ride": true
    },
    "parts": {
      "bass": "rolling",
      "sub": true,
      "chords": "saws",
      "square": true,
      "bell": true,
      "octaveDouble": true,
      "thirdBelow": true,
      "arp": false,
      "choir": false,
      "counter": false
    },
    "fx": {
      "riser": false,
      "filterBuild": false,
      "stutter": true,
      "pump": true,
      "delayThrows": true,
      "lowpassIntro": false,
      "bitcrushIntro": false,
      "tapeStop": false
    }
  },
  "seed": 2440772692,
  "riff": {
    "version": 1,
    "source": {
      "id": "neon-orbit",
      "title": "NEON ORBIT",
      "from": 0,
      "to": 1,
      "bpm": 120
    },
    "bars": 2,
    "grid": 16,
    "parts": [
      {
        "key": "lead",
        "label": "Simple Square",
        "kind": "melodic",
        "role": "hook",
        "voice": "simpleSquare",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "meanPitch": 89.11111111111111,
        "bars": [
          "F#6:2 . . . C#6:2 . . . C6:2 . . . G#6:2 . . .",
          "F6:2 . . . D#6:2 . B6:2 . . . D#6:2 . . . A6:2 ."
        ]
      }
    ],
    "stats": {
      "quantised": 0,
      "detuned": 0,
      "transposed": 0
    }
  },
  "source": {
    "id": "neon-orbit",
    "title": "NEON ORBIT",
    "from": 0,
    "to": 1
  },
  "take": 2,
  "made": "2026-10-01T20:44:33.640Z",
  "tailHash": "d1be6190"
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","tom","tom2","rim","rim2","crash2","bass","bass2","chords","chords2","lead","lead2","lead3","lead4","lead5"],
  labels: {"kick":"KICK","snare":"SNARE Roll","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","tom":"IMPACT Deep Pew","tom2":"FILL Toms","rim":"PERC Shaker","rim2":"PERC Tambourine","crash2":"RIDE","bass":"BASS","bass2":"SUB","chords":"SUPERSAW Pump","chords2":"PAD Polar Drift","lead":"RIFF Simple Square · HOOK","lead2":"HOOK Plain Square","lead3":"HOOK 8va Ice Bell","lead4":"HOOK Mega Saw 8va","lead5":"HARMONY Third Below"},
  voice: {"kickVoice":"fatKick","snareVoice":"dsCrackSnare2","clapVoice":"bigRoomClap","hatsVoice":"dsHatClosed","ohatsVoice":"ds909OpenHat","crashVoice":"crash808Long","tomVoice":"syn3PewDeep","tom2Voice":"ds909Tom","rimVoice":"shaker","rim2Voice":"tambourine","crash2Voice":"ride909SixBit","bassVoice":"detuneBass","bass2Voice":"stSubSine","chordsVoice":"tpSuperSaw","chords2Voice":"tngrPolarDrift","leadVoice":"syncRazorLead","lead2Voice":"roundMono2","lead3Voice":"tngrIceBell","lead4Voice":"bestMegaSawLead","lead5Voice":"mrdrElectricGrand"},
  voiceParams: {"kickVoice":{"label":"Fat Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"triangle","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.334,"curve":"exp","gain":1},"knock":1,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.049,"gain":0.31},"starter":false,"drive":0.03,"trim":-1.1,"kind":"drum","level":0.03340013024083686,"peak":0.9497956260608021,"songOrigin":"user","songSourceId":"kickVoice"},"chordsVoice":{"label":"Super Saw","category":"Lead","synth":"CRLS-1","dur":1.4,"note":"Three sawtooths thirty cents apart — the trance lead, and the widest single sound here.","origin":"Tonejs/Presets Synth/SuperSaw","options":{"oscillator":{"type":"fatsawtooth","count":3,"spread":30},"envelope":{"attack":0.001,"decay":0.02,"sustain":0.53,"release":0.148,"attackCurve":"exponential"}},"starter":false,"kind":"tone","level":0.025551049982595612,"peak":0.2820659920011062,"songOrigin":"library","songSourceId":"chordsVoice"},"chords2Voice":{"label":"Polar Drift","category":"Pad","synth":"TNGR-2","dur":8,"note":"Wide cold sparse partials with independent slow movement.","tngr2":{"oscA":{"table":"crystal","position":0.35,"envAmount":0.21,"lfoAmount":0.12,"level":0.99,"unison":3,"spread":18,"stereo":0.9},"oscB":{"table":"alloy","position":0.7,"envAmount":-0.3,"lfoAmount":-0.1,"level":0.42,"unison":2,"spread":15,"stereo":0.9,"interval":-12},"amp":{"attack":0.005,"decay":2.5,"sustain":0.95,"release":0.679},"positionEnv":{"attack":2.202,"decay":5.54,"sustain":0.45,"release":0.051},"filter":{"type":"lowpass","cutoff":5600,"resonance":1.92},"lfo1":{"shape":"triangle","rate":0.07,"amount":0.22},"master":{"gain":0.46}},"starter":false,"trim":1.6,"chorus":{"mix":0.16},"kind":"tone","level":0.053682,"peak":0.3928,"songOrigin":"library","songSourceId":"chords2Voice"},"snareVoice":{"label":"DS Crack Snare 2","category":"Snare","dur":1,"note":"Tight and driven: a short square knock, highpassed air, everything over in a tenth of a second. The backbeat for fast songs.","osc":{"type":"square","from":255,"to":440,"sweep":0.025,"decay":0.05,"curve":"exp","gain":0.67},"noise":{"type":"highpass","freq":2900,"Q":0.8,"decay":0.252,"gain":1.07},"drive":0.26,"starter":false,"knock":0.54,"kind":"drum","level":0.07283743387666206,"peak":0.7514789224227408,"songOrigin":"library","songSourceId":"snareVoice"},"hatsVoice":{"label":"DS Closed Hat","category":"Hats","dur":0.5,"note":"A resonant highpassed tick — sharper than the plain closed hat, closer to metal without being metal.","noise":{"type":"highpass","freq":7800,"Q":1.2,"decay":0.128,"gain":1},"starter":false,"kind":"drum","level":0.028099659958153087,"peak":0.7308203800405796,"songOrigin":"library","songSourceId":"hatsVoice"},"ohatsVoice":{"label":"=909 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open partner to =909 Hat: the same bright attack opening into a controlled metallic wash instead of a long cymbal tail.","noise":{"type":"highpass","freq":7600,"to":5200,"sweep":0.35,"Q":1.2,"decay":0.38,"gain":1},"drive":0.2,"id":"ds909OpenHat","kind":"drum","factory":true,"level":0.080241,"peak":0.7},"crashVoice":{"label":"Crash · 808 Wide","category":"Crash","homeLane":"crash","dur":6,"note":"The cluster pulled a third wider than the 808’s own spacing and left for three and a half seconds, with the highpass FALLING from 4.2 to 2.6 kHz — the top going before the body, which is the other half of the unequal decay and the reason a crash darkens instead of just getting quieter.","metal":{"wave":"square","freq":540,"count":6,"spread":1.35,"filter":"highpass","hp":4200,"hpTo":2600,"hpSweep":2.4,"Q":0.8,"slope":-12,"decay":3.4,"sag":0.42,"sagAt":0.1,"gain":0.4},"drive":0.2,"humanize":{"gain":0.03},"id":"crash808Long","kind":"drum","factory":true,"level":0.107116,"peak":0.7106},"tomVoice":{"label":"Synare · Deep Pew","category":"Sweep","homeLane":"tom","dur":4,"note":"The long one: 3 kHz to 60 over a second and a half, with two seconds of envelope under it so the bottom of the fall is still audible when it arrives. Five and a half octaves — a whole bar of descent at a disco tempo.","osc":{"type":"sine","from":3000,"to":60,"sweep":1.5,"pitchCurve":"exp","attack":0.004,"hold":1.05,"decay":1.05,"curve":"lin","gain":1},"drive":0.12,"id":"syn3PewDeep","kind":"drum","factory":true,"level":0.406959,"peak":0.7},"tom2Voice":{"label":"=909 Tom","category":"Tom","homeLane":"tom","dur":1,"note":"A tuned 909-style tom with a clean electronic pitch fall and a small low skin click at the front of the note.","osc":{"type":"sine","from":260,"to":125,"sweep":0.08,"decay":0.34,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":1500,"Q":0.8,"decay":0.025,"gain":0.2},"drive":0.12,"id":"ds909Tom","kind":"drum","factory":true,"level":0.049216,"peak":0.7},"rimVoice":{"label":"Shaker","category":"Perc","homeLane":"rim","dur":0.5,"note":"A soft band with no attack to speak of. Sixteenths of this sit under anything without competing.","noise":{"type":"bandpass","freq":6000,"Q":1.1,"decay":0.06},"id":"shaker","kind":"drum","factory":true,"level":0.010894,"peak":0.4346},"rim2Voice":{"label":"Tambourine","category":"Perc","homeLane":"rim","dur":1,"note":"Bright, jangly and slightly longer, with a touch of pitch in it.","osc":{"type":"square","from":900,"to":780,"sweep":0.05,"decay":0.05,"gain":0.12},"noise":{"type":"highpass","freq":5200,"Q":0.6,"decay":0.14},"id":"tambourine","kind":"drum","factory":true,"level":0.034686,"peak":0.8969},"crash2Voice":{"label":"Ride · 909 Six-Bit","category":"Crash","homeLane":"crash","dur":4,"note":"A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is half of why the sound is recognisable, so the crush is doing the work here that the filter sweeps do on the 808 presets.","ring":{"freq":2500,"Q":70,"hit":0.0018,"decay":0.25,"gain":0.6},"metal":{"wave":"square","freq":780,"count":6,"spread":1.12,"filter":"highpass","hp":5400,"Q":0.8,"slope":-24,"attack":0.004,"decay":1.6,"sag":0.3,"sagAt":0.06,"gain":0.55},"drive":0.6,"shape":"crush","tone":{"type":"lowpass","freq":9500,"Q":0.7},"humanize":{"gain":0.03},"id":"ride909SixBit","kind":"drum","factory":true,"level":0.053,"peak":0.9332},"bass2Voice":{"label":"Sub Sine (starter)","category":"Bass","kind":"tone","synth":"CRLS-1","dur":2.2,"note":"Pure weight, no harmonics. Wants room underneath it and a lead up top.","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.012,"decay":0.3,"sustain":0.8,"release":0.4}},"id":"stSubSine","starter":true,"factory":true,"level":0.11677,"peak":0.6891},"lead2Voice":{"label":"Plain Square vs Synth","category":"Lead","synth":"CRLS-1","dur":7.7,"note":"Simple Square Tone 2","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0.2,"sustain":0,"release":0.3,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"},"filter":{"type":"lowpass","rolloff":-12,"Q":0.1},"filterEnvelope":{"baseFrequency":18000,"octaves":0,"attack":0.001,"decay":0.2,"sustain":0.5,"release":0.3,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"}},"starter":false,"mode":"legato","portamento":0.059,"kind":"tone","level":0.041468,"peak":0.6824,"songOrigin":"library","songSourceId":"lead2Voice"},"lead3Voice":{"label":"Ice Bell","category":"Bells","synth":"TNGR-2","dur":3,"note":"Sparse crystal partials with a long decay and controlled high notes.","tngr2":{"oscA":{"table":"bellFold","position":0.84,"envAmount":-0.2,"level":0.76},"oscB":{"table":"crystal","position":0.65,"level":0.16,"interval":12},"amp":{"attack":0.001,"decay":1.7,"sustain":0.03,"release":0.9},"positionEnv":{"attack":0,"decay":1.1,"sustain":0.12},"filter":{"type":"lowpass","cutoff":9800,"resonance":1.2},"master":{"gain":0.5}},"id":"tngrIceBell","kind":"tone","factory":true,"level":0.032051,"peak":0.422},"lead4Voice":{"label":"Mega Saw Lead","category":"Lead","synth":"MRDR-3","dur":1.6,"note":"Nine oscillators. Two unison saws a fifth apart, a sub under them, all through one shared filter that opens across every note — the shared stage is the whole point, because nine separate filters would be nine sounds instead of one.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.85,"attack":0.006,"decay":0.5,"sustain":0.8,"release":0.18,"unison":4,"spread":26,"stereo":0.5},"osc2":{"type":"sawtooth","ratio":1.4983,"gain":0.4,"attack":0.01,"decay":0.5,"sustain":0.7,"release":0.18,"unison":4,"spread":34,"stereo":0.65},"osc3":{"type":"pulse","width":0.5,"ratio":0.5,"gain":0.42,"attack":0.004,"decay":0.6,"sustain":0.85,"release":0.16,"pwm":{"type":"sine","rate":0.42,"depth":0.5,"delay":0.1}},"lfo":{"type":"sine","rate":5.4,"depth":0.12,"target":"filter","delay":0.4}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":380,"Q":2.2,"track":0.5,"env":{"octaves":4.6,"attack":0.012,"decay":0.55,"sustain":0.42,"release":0.22}},"vca":{"attack":0.006,"decay":0.5,"sustain":0.85,"release":0.24}},"drive":0.34,"shape":"soft","tone":{"freq":12000},"vibrato":{"depth":0.1,"rate":5.6,"delay":0.5},"id":"bestMegaSawLead","kind":"tone","factory":true,"level":0.139899,"peak":0.8201},"lead5Voice":{"label":"Electric Grand","category":"Keys","synth":"MRDR-3","dur":2.2,"note":"The CP-70: real strings on a pickup, so a thinner body, a brighter strike and the chorus it was always played through.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.7,"attack":0.001,"decay":2.2,"sustain":0,"release":0.3,"unison":2,"spread":6,"stereo":0.5,"filter":{"type":"lowpass","slope":-12,"freq":900,"Q":0.8,"track":0.9,"env":{"octaves":2.5,"attack":0.001,"decay":0.25,"sustain":0,"release":0.2}}},"osc2":{"type":"triangle","ratio":2,"gain":0.25,"attack":0.001,"decay":1.2,"sustain":0,"release":0.25},"osc3":{"type":"noise","ratio":1,"gain":0.07,"color":"white","attack":0.001,"decay":0.018,"sustain":0,"release":0.02,"filter":{"type":"bandpass","slope":-12,"freq":2400,"Q":1.2,"track":0.4}}},"humanize":{"entry":0.005,"gain":0.07},"chorus":{"mix":0.35,"rate":0.6,"depth":0.4,"width":1},"id":"mrdrElectricGrand","kind":"tone","factory":true,"level":0.0443,"peak":0.4886},"clapVoice":{"label":"Big Room Clap","category":"Clap","dur":1,"note":"Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants space in the arrangement.","noise":{"type":"bandpass","freq":1500,"Q":0.9,"decay":0.355,"gain":0.88},"taps":[0,0.014,0.028,0.048],"tapFalloff":0.82,"tapDetune":0.94,"tapTone":0.97,"starter":false,"trim":3,"id":"bigRoomClap","kind":"drum","user":true,"level":0.018317,"peak":0.354},"bassVoice":{"label":"Wide Detune","category":"Bass","synth":"MRDR-3","dur":1.8,"note":"Two layers a few cents apart, saw against square. Big, and wide without a chorus.","layer":{"osc1":{"type":"sawtooth","ratio":1,"detune":0,"gain":1,"attack":0.008,"decay":0.2,"sustain":0.7,"release":0.3},"osc2":{"type":"square","ratio":1,"detune":13.8,"gain":1,"attack":0.012,"decay":0.2,"sustain":0.7,"release":0.3}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":200,"Q":1,"track":0,"env":{"octaves":3,"attack":0.014,"decay":0.001,"sustain":1,"release":0.5}}},"vibrato":{"depth":0.01,"rate":3},"starter":false,"kind":"tone","level":0.1614240270654222,"peak":1.5277139466000256,"songOrigin":"library","songSourceId":"bassVoice"},"leadVoice":{"label":"Sync Razor Lead","category":"Lead","synth":"MRDR-3","dur":1.6,"note":"Osc 2 is hard-synced to Osc 1 at a non-integer interval, making a bright reset edge that stays pitched while the shared filter snaps shut.","sync":"1+2","layer":{"osc1":{"type":"sine","ratio":1,"gain":0.36,"attack":0.004,"decay":0.45,"sustain":0.72,"release":0.16},"osc2":{"type":"sawtooth","ratio":2.37,"gain":0.836,"attack":0.003,"decay":0.42,"sustain":0.68,"release":0.14,"pitch":{"semitones":12,"attack":0,"decay":0.22,"sustain":0}},"osc3":{"type":"sawtooth","ratio":0.5,"gain":0.20600000000000002,"len":0.62,"decay":4.216,"sustain":0.74,"attack":0.044,"vca":"through","detune":23}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":520,"Q":3.1,"track":0.35,"env":{"octaves":4.3,"attack":0.003,"decay":0.38,"sustain":0.24,"release":0.16}},"vca":{"attack":0.003,"decay":0.48,"sustain":0.75,"release":0.18}},"drive":0.28,"shape":"soft","tone":{"freq":10500},"mono":true,"portamento":0.035,"starter":false,"kind":"tone","level":0.11549951638632448,"peak":0.954788202395189,"songOrigin":"library","songSourceId":"leadVoice"}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: 0.5, eq: { low: -3 } },
    snare: { gain: 4, send: { reverb: 0.529 }, eq: { low: 2.8, high: 5.2 } },
    clap: { pan: 0.05, send: { reverb: 1.089 } },
    hats: { gain: -0.2, pan: -0.261 },
    ohats: { gain: -7, pan: -0.15 },
    crash: { gain: -7, pan: 0.2, send: { reverb: 0.9 } },
    tom: { gain: -3, send: { reverb: 0.6 } },
    tom2: { gain: -5, pan: 0.2, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: 0.34, send: { reverb: 0.15 } },
    crash2: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -10.1, eq: { low: 1.6 }, effects: [{ id: "filter", params: { type: "lowpass", frequency: 1400, Q: 0.8 } }] },
    bass2: { gain: -11.7 },
    chords: { gain: -9.98, eq: { low: -3, high: 4.7 }, effects: [{ id: "peq", params: { f1: 120, g1: 0, f2: 500, g2: 0, q2: 1, f5: 1000, g5: 0, q5: 1, f3: 2000, g3: 0, q3: 1, f4: 12000, g4: 5 } }, { id: "widener", params: { width: 0.9 } }, { id: "rhythmgate", params: { division: 0.25, gateLength: 0.53, attack: 0.024, decay: 0.052, depth: 0.76 } }, { id: "reverb", bypass: true, params: { decay: 4.1, wet: 0.57, high: -1, low: -5 } }, { id: "ambience", bypass: true, params: { space: 0.13 } }] },
    chords2: { gain: -14.37, send: { reverb: 0.649 }, eq: { low: -4 }, effects: [{ id: "widener", params: { width: 0.8 } }] },
    lead: { gain: -4.96, pan: -0.05, send: { delay: 0.073, reverb: 0.703 } },
    lead2: { gain: -3.36, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: "peq", params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    lead3: { gain: -1.36, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead4: { gain: -14, send: { reverb: 0.25 }, eq: { low: -3 } },
    lead5: { gain: -16, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
  },
};

export const arrangement = {
  order: [
    {
      s: 0,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 38,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 39,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 2,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 3,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 25,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 4,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 5,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 6,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 7,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 26,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 8,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 27,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 9,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 10,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 11,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 24,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 43,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 42,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 41,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 40,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 14,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 15,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 28,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 16,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 17,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 18,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 19,
      bars: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 29,
      bars: 1,
      from: 1,
      transpose: {
        lead4: -12,
        lead: -12,
      },
    },
    {
      s: 35,
      bars: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 32,
      bars: 1,
      from: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 36,
      bars: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 34,
      bars: 1,
      from: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 30,
      bars: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 37,
      bars: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
    {
      s: 33,
      bars: 1,
      from: 1,
      transpose: {
        lead: -12,
        lead2: -12,
        lead3: -12,
        lead4: -12,
      },
    },
  ],
  sections: [
    {
      base: 11,
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,3.528409,null,null,null,4,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,4.670987,null,null,null,3.835405,null,null,null],
    },
    {
      base: 3,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,4.780895,null,8,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 7,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2.975142,null,4.73331,null,null,null,4,null,null,null],
    },
    {
      base: 8,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,3.052734,null],
    },
    {
      base: 15,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,3.153587,null,8,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 19,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2.865057,null,2,null,4,null,null,null,null,null,null,null],
    },
    {
      base: 22,
      lead: seq('D7 . . . A#6 . . . A6 . . . F7 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 22,
      lead: seq('. . . . . . . . . . . . . . . . | A#6 . . . A6 . D#7 . . . A6 . . . D7 .'),
    },
    {
      base: 20,
      lead: seq('. . . . . . . . . . . . . . . . | G6 . . . F6 . C#7 . . . F6 . . . B6 .'),
    },
    {
      base: 23,
      lead: seq('. . . . . . . . . . . . . . . . | G6 . . . F6 . C#7 . C7 . . . A6 . . .'),
    },
    {
      base: 21,
      lead: seq('. . . . . . . . . . . . . . . . | G6 . . . G6 . . . . . F6 . . . B6 .'),
    },
    {
      base: 20,
      lead: seq('G#6 . . . D#6 . . . D6 . . . A#6 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 21,
      lead: seq('G#6 . . . D#6 . . . D6 . . . A#6 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 23,
      lead: seq('G#6 . . . D#6 . . . D6 . . . A#6 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 0,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2.786932,null],
    },
    {
      base: 1,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,null,2.826705,null],
    },
    {
      base: 13,
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,7.268820999999999,null,null,null,null,null,null,null,7.709162,null,null,null,null,null,null,null],
      bass: seq('. . . . . . . . . . . . . . . . | G#2 . . . . . . . G#2 . . . . . . .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,7.745028,null,null,null,null,null,null,null,7.761009,null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | G#1 . . . . . . . G#1 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,9.682173,null,null,null,null,null,null,null,3.4612929999999995,null,null,null],
    },
    {
      base: 13,
      leadLen: [9.682173,null,null,null,null,null,null,null,9.682173,null,null,null,9.682173,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 12,
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,9.682173,null,null,null,null,null,null,null,9.682173,null,null,null,null,null,null,null],
    },
    {
      base: 12,
      leadLen: [9.682173,null,null,null,null,null,null,null,9.682173,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  loop: {
    fromBar: 5,
    toBar: 48,
  },
  automation: {
    snare: {
      points: [[5,0,0],[5,0,-12],[9,0,0],[29,0,0],[29,0,-12],[33,0,0]],
      cuts: [[40,12]],
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
            {
              id: "gain",
              params: {
                gain: 3.5,
                balance: 0,
                mono: 0,
                sweep: 0,
                gainTo: 0,
                balanceTo: 0,
              },
            },
          ],
        },
        {
          from: [32,12],
          to: [32,14],
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
          from: [32,14],
          to: [33,0],
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
          from: [40,8],
          to: [41,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.125,
                retrigger: 0,
                fade: 0,
                stop: 0,
                sweep: 0,
                sliceTo: 0.25,
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
      points: [[41,0,0],[41,0,-2.5],[49,0,-2.5],[49,0,0]],
      cuts: [[40,12]],
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
          from: [25,0],
          to: [29,0],
          chain: [
            {
              id: "filter",
              params: {
                type: "lowpass",
                frequency: 393.5393960567975,
                Q: 5.4,
                sweep: 1,
                sweepTo: 18000,
              },
            },
            {
              id: "pingpong",
              params: {
                sync: 1,
                division: 0.5,
                delayMs: 250,
                feedback: 0.3,
                wet: 0.53,
                sweep: 0,
                feedbackTo: 0.3,
                wetTo: 0.35,
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
      ],
    },
    lead2: {
      cuts: [[40,12]],
    },
    lead3: {
      cuts: [[40,12]],
    },
    lead4: {
      cuts: [[40,12]],
    },
    lead5: {
      cuts: [[40,12]],
    },
    chords: {
      cuts: [[40,12]],
    },
    bass: {
      cuts: [[40,12]],
    },
    bass2: {
      cuts: [[40,12]],
    },
    kick: {
      cuts: [[40,12]],
    },
    clap: {
      cuts: [[40,12]],
    },
    hats: {
      cuts: [[40,12]],
    },
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
