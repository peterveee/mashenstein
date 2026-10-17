// MINUTE WALTZ · FOUR TO THE FLOOR — one song: what it plays, how it is arranged, how it sounds.
//
// Chopin's Minute Waltz (Valse Op. 64 No. 1) as an 80-bar, 4/4 happy-hardcore club banger.
// The opening circle and high answering phrase are transcribed from Mutopia's public-domain MIDI,
// then given a fourth beat, an off-beat reply, a fake drop, and a lifted final drop.
// Source: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483
// Regenerate with node tools/make-minute-waltz-club.js --force.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "chopin-minute-waltz-club";
export const title = "MINUTE WALTZ · FOUR TO THE FLOOR";
export const slug = "chopin-minute-waltz-club";
export const group = "imported";
export const seed = 6401;

export const bank = {
  bpm: 170,
  musicTrim: 0.93,
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead9: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead7: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . A#4 . G#4 . C5 . A#4 . . . . .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . . . . . . C#2 . . . . . . . | C#2 . . . . . . . C#2 . . . . . . .'),
      bassLen: [4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . F#5 . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . . . . . . C#2 . . . . . . . | G#1 . . . . . . . G#1 . . . . . . .'),
      bassLen: [4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#5 . . . . . G#5 . F#5 . F5 . . . . . | F5 . D#5 . D#5 . D5 . D#5 . . . . . . .'),
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . F5 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('G#1 . . . . . . . G#1 . . . . . . . | G#1 . . . . . . . G#1 . . . . . . .'),
      bassLen: [4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . G#5 . F#5 . F5 . . . . . | F5 . D#5 . D5 . D#5 . F5 . A#4 . . . . .'),
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . F5 | . . . . . . . . . . . . . G#4 . C#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . . . . . . C#2 . . . . . . . | G#1 . . . . . . . G#1 . . . . . . .'),
      bassLen: [4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      chords2: [[261.6255653005986,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A#4 . C5 . D#5 . C#5 . A#4 . C5 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      chords2: [[233.08188075904496,311.1269837220809,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: seq('D#5 . A#5 D#6 . F#5 A#5 . D#6 . F#6 A#5 . F#5 D#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . C5 . D#5 . C#5 . A#4 . C5 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . F4 . F4 . G#4 . F#4 . . . . . | F4 . F4 . F4 . F#4 . F#4 . G#4 . F4 . F4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
    },
    {
      lead: seq('A#4 . C5 . D#5 . C#5 . A#4 . C5 . . . . . | F5 . D#5 . D5 . D#5 . D#5 . . . C5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . C#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . . .').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 | . D#2 D#2 D#2 . D#2 D#2 D#2 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . D#1 . . . D#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead3: seq('A#4 . C5 . D#5 . C#5 . A#4 . C5 . . . . . | F5 . D#5 . D5 . D#5 . D#5 . . . C5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . G#4 . C5 . A#4 . F#4 . G#4 . . . . . | C#5 . C5 . C5 . C5 . C5 . . . G#4 . . .'),
      lead8Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      chords2: [[261.6255653005986,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      chords2: [[261.6255653005986,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | D#5 . C6 D#6 . G#5 C6 . D#6 . G#6 C6 . G#5 D#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('F4 . . . F4 . F4 . G#4 . F4 . . . . . | F4 . F4 . F4 . F#4 . F#4 . G#4 . F4 . F4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('G#5 . . . G5 . G#5 . C6 . A#5 . . . . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('G#5 . . . G5 . G#5 . C6 . A#5 . . . . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | . . A#4 . C5 . C#5 . D#5 . F5 . F#5 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | . . A#4 . C5 . C#5 . D#5 . F5 . F#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . F4 . G#4 . F4 . F4 . F4 . . . . . | . . F#4 . G#4 . A#4 . C5 . C#5 . D#5 . . .'),
      lead8Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead4: seq('G5 . G#5 . C6 . A#5 . G5 . G#5 . . . . . | . . A#5 . C6 . C#6 . D#6 . F6 . F#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead5: seq('G5 . G#5 . C6 . A#5 . G5 . G#5 . . . . . | . . A#5 . C6 . C#6 . D#6 . F6 . F#6 . . .'),
      lead5Len: [2,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . G#4 . | . . . . . . . . . . . . . . A#4 .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . G#5 . F#5 . F5 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . F5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[466.1637615180899,554.3652619537442,739.9888454232688],null,null,[466.1637615180899,554.3652619537442,739.9888454232688],null,null,[466.1637615180899,554.3652619537442,739.9888454232688],null,null,null,[466.1637615180899,554.3652619537442,739.9888454232688],null,[466.1637615180899,554.3652619537442,739.9888454232688],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F#1 . . . F#1 . . . F#1 . . . F#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F#5 . C#6 F#6 . A#5 C#6 . F#6 . A#6 C#6 . A#5 F#6 . | D#5 . C6 D#6 . G#5 C6 . D#6 . G#6 C6 . G#5 D#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#5 . . . . . G#5 . F#5 . F5 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#5 . . . . . F5 . D#5 . C#5 . . . . . | F4 . F4 . F4 . F#4 . F#4 . G#4 . F4 . F4 .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('A#6 . . . . . G#6 . F#6 . F6 . . . . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('A#6 . . . . . G#6 . F#6 . F6 . . . . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . G#5 . F#5 . C6 . . . . . | F5 . D#5 . D5 . D#5 . D#5 . . . C5 . . .'),
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . . .').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 | . D#2 D#2 D#2 . D#2 D#2 D#2 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . D#1 . . . D#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('D#5 . A#5 D#6 . F#5 A#5 . D#6 . F#6 A#5 . F#5 D#6 . | D#5 . A#5 D#6 . F#5 A#5 . D#6 . G#6 C6 . G#5 D#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#5 . . . . . G#5 . F#5 . C6 . . . . . | F5 . D#5 . D5 . D#5 . D#5 . . . C5 . . .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#5 . . . . . F5 . D#5 . G#5 . . . . . | C#5 . C5 . C5 . C5 . C5 . . . G#4 . . .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead4: seq('A#6 . . . . . G#6 . F#6 . C7 . . . . . | F6 . D#6 . D6 . D#6 . D#6 . . . C6 . . .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead5: seq('A#6 . . . . . G#6 . F#6 . C7 . . . . . | F6 . D#6 . D6 . D#6 . D#6 . . . C6 . . .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . G#4 . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | D#5 . C6 D#6 . G#5 C6 . D#6 . G#6 C6 . G#5 D#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . G#4 . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F4 . . . F4 . F4 . G#4 . F4 . . F4 . . | F4 . F4 . F4 . F#4 . F#4 . G#4 . F4 . F4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('G#5 . . . G5 . G#5 . C6 . A#5 . . G#5 . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('G#5 . . . G5 . G#5 . C6 . A#5 . . G#5 . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,3,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#4 . C5 . D#5 . C#5 . A#4 . C5 . . . . . | . . A#4 . C5 . C#5 . D#5 . F5 . F#5 . . G#5'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      lead2: seq('. . . . . . . . . . . . . D#5 . C#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('D#5 . A#5 D#6 . F#5 A#5 . D#6 . F#6 A#5 . F#5 D#6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . C5 . D#5 . C#5 . A#4 . C5 . . . . . | . . A#4 . C5 . C#5 . D#5 . F5 . F#5 . . G#5'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#4 . G#4 . C5 . A#4 . F#4 . G#4 . . . . . | . . F#4 . G#4 . A#4 . C5 . C#5 . D#5 . . F5'),
      lead8Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      lead4: seq('A#5 . C6 . D#6 . C#6 . A#5 . C6 . . . . . | . . A#5 . C6 . C#6 . D#6 . F6 . F#6 . . G#6'),
      lead4Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      lead5: seq('A#5 . C6 . D#6 . C#6 . A#5 . C6 . . . . . | . . A#5 . C6 . C#6 . D#6 . F6 . F#6 . . G#6'),
      lead5Len: [2,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,3,null,null,1],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . A#4 .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . G#5 . F#5 . F5 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . D#5 . F5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[466.1637615180899,554.3652619537442,739.9888454232688],null,null,[466.1637615180899,554.3652619537442,739.9888454232688],null,null,[466.1637615180899,554.3652619537442,739.9888454232688],null,null,null,[466.1637615180899,554.3652619537442,739.9888454232688],null,[466.1637615180899,554.3652619537442,739.9888454232688],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 . F#1 F#1 F#1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F#1 . . . F#1 . . . F#1 . . . F#1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F#5 . C#6 F#6 . A#5 C#6 . F#6 . A#6 C#6 . A#5 F#6 . | D#5 . C6 D#6 . G#5 C6 . D#6 . G#6 C6 . G#5 D#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#5 . . . . . G#5 . F#5 . F5 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#5 . . . . . F5 . D#5 . C#5 . . . . . | F4 . F4 . F4 . F#4 . F#4 . G#4 . F4 . F4 .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('A#6 . . . . . G#6 . F#6 . F6 . . . . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('A#6 . . . . . G#6 . F#6 . F6 . . . . . | G5 . G#5 . G#5 . A#5 . A#5 . C6 . G5 . G#5 .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A#5 . . . . . G#5 . F#5 . C6 . . . . . | F5 . D#5 . D5 . D#5 . D#5 . . . C5 . . .'),
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      chords: [[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,[369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 . D#2 D#2 D#2 | . D#2 D#2 D#2 . D#2 D#2 D#2 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . D#1 . . . D#1 . . . D#1 . . . D#1 . | . . D#1 . . . D#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('D#5 . A#5 D#6 . F#5 A#5 . D#6 . F#6 A#5 . F#5 D#6 . | D#5 . A#5 D#6 . F#5 A#5 . D#6 . G#6 C6 . G#5 D#6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#5 . . . . . G#5 . F#5 . C6 . . . . . | F5 . D#5 . D5 . D#5 . D#5 . . . C5 . . .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('F#5 . . . . . F5 . D#5 . G#5 . . . . . | C#5 . C5 . C5 . C5 . C5 . . . G#4 . . .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead4: seq('A#6 . . . . . G#6 . F#6 . C7 . . . . . | F6 . D#6 . D6 . D#6 . D#6 . . . C6 . . .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead5: seq('A#6 . . . . . G#6 . F#6 . C7 . . . . . | F6 . D#6 . D6 . D#6 . D#6 . . . C6 . . .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . . . . . G4 . . . G#4 . . . | C5 . . . A#4 . . . . . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: [[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C#1 . . . . . . . . . . . . . . . | C#1 . . . . . . . . . . . . . . .'),
      bass3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('G#5 . . . G5 . G#5 . C6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [4,null,null,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[415.3046975799451,622.2539674441618,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[369.9944227116344,554.3652619537442,698.4564628660078,932.3275230361799],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G4 . . . G#4 . . . A#4 . . . G#4 . . . | C5 . . . A#4 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C#1 . . . . . . . . . . . . . . . | C#1 . . . . . . . . . . . . . . .'),
      bass3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('G5 . G#5 . A#5 . G#5 . C6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[415.3046975799451,622.2539674441618,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,622.2539674441618,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G4 . . . G#4 . . . C5 . . . A#4 . . . | G4 . . . G#4 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,311.1269837220809,349.2282314330039,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C#1 . . . . . . . . . . . . . . . | C#1 . . . . . . . . . . . . . . .'),
      bass3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('G5 . G#5 . C6 . A#5 . G5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[415.3046975799451,622.2539674441618,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,622.2539674441618,698.4564628660078,1046.5022612023945],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A#4 . . . C5 . . . C#5 . . . D#5 . . . | F5 . . . F#5 . . . . . . . . . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      chords2: [[184.9972113558172,277.1826309768721,311.1269837220809,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,207.65234878997256,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . . . . . . . . . . . | C#2 . . . . . . . . . . . . . . .'),
      bass2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C#1 . . . . . . . . . . . . . . . | C#1 . . . . . . . . . . . . . . .'),
      bass3Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('A#5 . C6 . C#6 . D#6 . F6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7: [[369.9944227116344,554.3652619537442,622.2539674441618,932.3275230361799],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,415.3046975799451,622.2539674441618,830.6093951598903],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . G#4 . A#4 . A#4 . C5 . G4 . G#4 .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,[415.3046975799451,523.2511306011972,622.2539674441618],null,[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      chords2: [[261.6255653005986,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . G#1 . . . G#1 . . . G#1 . . . G#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      snare: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null,[466.1637615180899,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,null,null,null,null],
      chords2: [[261.6255653005986,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. F1 F1 F1 . F1 F1 F1 . F1 F1 F1 . F1 F1 F1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . . . .'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,null,null,null],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . A#1 . . . A#1 . . . A#1 . . . . .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | F5 . C#6 F6 . A#5 C#6 . F6 . A#6 C#6 . . . .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,null,null,null],
      lead3: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . . . . . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,8,null,null,null,null,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: chordSeq('C#4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . . . . . . . | G#4 . . . G4 . G#4 . . . . . . . . .'),
      leadLen: [4,null,null,null,2,null,2,null,8,null,null,null,null,null,null,null,4,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      chords2: chordSeq('C#4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: [[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[587.3295358348151,1174.6590716696303],null,[523.2511306011972,1046.5022612023945],null,null,null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[440,880],null,[466.1637615180899,932.3275230361799],null],
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . A#5 . A5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G1 G1 G1 . G1 G1 G1 . G1 G1 G1 . G1 G1 G1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G5 . D6 G6 . A#5 D6 . G6 . A#6 D6 . A#5 G6 . | F5 . D6 F6 . A#5 D6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . A4 . A#4 . D5 . C5 . . . . . | A4 . A#4 . A#4 . C5 . C5 . D5 . A4 . A#4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: seq('G4 . . . G4 . G4 . A#4 . G4 . . . . . | G4 . G4 . G4 . G#4 . G#4 . A#4 . G4 . G4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('A#5 . . . A5 . A#5 . D6 . C6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('A#5 . . . A5 . A#5 . D6 . C6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[622.2539674441618,1244.5079348883237],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[622.2539674441618,1244.5079348883237],null,[698.4564628660078,1396.9129257320155],null,[783.9908719634985,1567.981743926997],null,[830.6093951598903,1661.2187903197805],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . F5 . D#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F2 F2 F2 . F2 F2 F2 . F2 F2 F2 . F2 F2 F2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . C2 . . . C2 . . . C2 . . . C2 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | G5 . D#6 G6 . C6 D#6 . G6 . C7 D#6 . C6 G6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C5 . D5 . F5 . D#5 . C5 . D5 . . . . . | . . C5 . D5 . D#5 . F5 . G5 . G#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#4 . A#4 . D5 . C5 . G#4 . A#4 . . . . . | . . G#4 . A#4 . C5 . D5 . D#5 . F5 . . .'),
      lead8Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead4: seq('C6 . D6 . F6 . D#6 . C6 . D6 . . . . . | . . C6 . D6 . D#6 . F6 . G6 . G#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead5: seq('C6 . D6 . F6 . D#6 . C6 . D6 . . . . . | . . C6 . D6 . D#6 . F6 . G6 . G#6 . . .'),
      lead5Len: [2,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . C5 .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1046.5022612023945,2093.004522404789],null,null,null,null,null,[932.3275230361799,1864.6550460723597],null,[830.6093951598903,1661.2187903197805],null,[783.9908719634985,1567.981743926997],null,null,null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[440,880],null,[466.1637615180899,932.3275230361799],null],
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . F5 . G5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[523.2511306011972,622.2539674441618,830.6093951598903],null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G#5 . D#6 G#6 . C6 D#6 . G#6 . C7 D#6 . C6 G#6 . | F5 . D6 F6 . A#5 D6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C6 . . . . . A#5 . G#5 . G5 . . . . . | A4 . A#4 . A#4 . C5 . C5 . D5 . A4 . A#4 .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#5 . . . . . G5 . F5 . D#5 . . . . . | G4 . G4 . G4 . G#4 . G#4 . A#4 . G4 . G4 .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('C7 . . . . . A#6 . G#6 . G6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('C7 . . . . . A#6 . G#6 . G6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1046.5022612023945,2093.004522404789],null,null,null,null,null,[932.3275230361799,1864.6550460723597],null,[830.6093951598903,1661.2187903197805],null,[1174.6590716696303,2349.31814333926],null,null,null,null,null,[783.9908719634985,1567.981743926997],null,[698.4564628660078,1396.9129257320155],null,[659.2551138257398,1318.5102276514797],null,[698.4564628660078,1396.9129257320155],null,[698.4564628660078,1396.9129257320155],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null],
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F2 F2 F2 . F2 F2 F2 . F2 F2 F2 . F2 F2 F2 | . F2 F2 F2 . F2 F2 F2 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | F5 . C6 F6 . G#5 C6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C6 . . . . . A#5 . G#5 . D6 . . . . . | G5 . F5 . E5 . F5 . F5 . . . D5 . . .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#5 . . . . . G5 . F5 . A#5 . . . . . | D#5 . D5 . D5 . D5 . D5 . . . A#4 . . .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead4: seq('C7 . . . . . A#6 . G#6 . D7 . . . . . | G6 . F6 . E6 . F6 . F6 . . . D6 . . .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead5: seq('C7 . . . . . A#6 . G#6 . D7 . . . . . | G6 . F6 . E6 . F6 . F6 . . . D6 . . .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[587.3295358348151,1174.6590716696303],null,[523.2511306011972,1046.5022612023945],null,null,[466.1637615180899,932.3275230361799],null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[440,880],null,[466.1637615180899,932.3275230361799],null],
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . A#5 . A5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G1 G1 G1 . G1 G1 G1 . G1 G1 G1 . G1 G1 G1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G5 . D6 G6 . A#5 D6 . G6 . A#6 D6 . A#5 G6 . | F5 . D6 F6 . A#5 D6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . A4 . A#4 . D5 . C5 . . A#4 . . | A4 . A#4 . A#4 . C5 . C5 . D5 . A4 . A#4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G4 . . . G4 . G4 . A#4 . G4 . . G4 . . | G4 . G4 . G4 . G#4 . G#4 . A#4 . G4 . G4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('A#5 . . . A5 . A#5 . D6 . C6 . . A#5 . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('A#5 . . . A5 . A#5 . D6 . C6 . . A#5 . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,3,null,null,3,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[440,880],null,[466.1637615180899,932.3275230361799],null,[587.3295358348151,1174.6590716696303],null,[523.2511306011972,1046.5022612023945],null,[440,880],null,[466.1637615180899,932.3275230361799],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[622.2539674441618,1244.5079348883237],null,[698.4564628660078,1396.9129257320155],null,[783.9908719634985,1567.981743926997],null,[830.6093951598903,1661.2187903197805],null,null,[932.3275230361799,1864.6550460723597]],
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      lead2: seq('. . . . . . . . . . . . . D5 . C5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G1 G1 G1 . G1 G1 G1 . G1 G1 G1 . G1 G1 G1 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . C2 . . . C2 . . . C2 . . . C2 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G5 . D6 G6 . A#5 D6 . G6 . A#6 D6 . A#5 G6 . | G5 . D#6 G6 . C6 D#6 . G6 . C7 D#6 . C6 G6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A4 . A#4 . D5 . C5 . A4 . A#4 . . . . . | . . C5 . D5 . D#5 . F5 . G5 . G#5 . . A#5'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G4 . G4 . A#4 . G4 . G4 . G4 . . . . . | . . G#4 . A#4 . C5 . D5 . D#5 . F5 . . G5'),
      lead8Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      lead4: seq('A5 . A#5 . D6 . C6 . A5 . A#5 . . . . . | . . C6 . D6 . D#6 . F6 . G6 . G#6 . . A#6'),
      lead4Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,1],
      lead5: seq('A5 . A#5 . D6 . C6 . A5 . A#5 . . . . . | . . C6 . D6 . D#6 . F6 . G6 . G#6 . . A#6'),
      lead5Len: [2,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,3,null,null,1],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . C5 .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1046.5022612023945,2093.004522404789],null,null,null,null,null,[932.3275230361799,1864.6550460723597],null,[830.6093951598903,1661.2187903197805],null,[783.9908719634985,1567.981743926997],null,null,null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[440,880],null,[466.1637615180899,932.3275230361799],null],
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . F5 . G5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[523.2511306011972,622.2539674441618,830.6093951598903],null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G#5 . D#6 G#6 . C6 D#6 . G#6 . C7 D#6 . C6 G#6 . | F5 . D6 F6 . A#5 D6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C6 . . . . . A#5 . G#5 . G5 . . . . . | A4 . A#4 . A#4 . C5 . C5 . D5 . A4 . A#4 .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#5 . . . . . G5 . F5 . D#5 . . . . . | G4 . G4 . G4 . G#4 . G#4 . A#4 . G4 . G4 .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('C7 . . . . . A#6 . G#6 . G6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('C7 . . . . . A#6 . G#6 . G6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1046.5022612023945,2093.004522404789],null,null,null,null,null,[932.3275230361799,1864.6550460723597],null,[830.6093951598903,1661.2187903197805],null,[1174.6590716696303,2349.31814333926],null,null,null,null,null,[783.9908719634985,1567.981743926997],null,[698.4564628660078,1396.9129257320155],null,[659.2551138257398,1318.5102276514797],null,[698.4564628660078,1396.9129257320155],null,[698.4564628660078,1396.9129257320155],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null],
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      snareVelocity: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.35,null,null,null,null,null],
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F2 F2 F2 . F2 F2 F2 . F2 F2 F2 . F2 F2 F2 | . F2 F2 F2 . F2 F2 F2 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | F5 . C6 F6 . G#5 C6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C6 . . . . . A#5 . G#5 . D6 . . . . . | G5 . F5 . E5 . F5 . F5 . . . D5 . . .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#5 . . . . . G5 . F5 . A#5 . . . . . | D#5 . D5 . D5 . D5 . D5 . . . A#4 . . .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead4: seq('C7 . . . . . A#6 . G#6 . D7 . . . . . | G6 . F6 . E6 . F6 . F6 . . . D6 . . .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead5: seq('C7 . . . . . A#6 . G#6 . D7 . . . . . | G6 . F6 . E6 . F6 . F6 . . . D6 . . .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[466.1637615180899,932.3275230361799],null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[587.3295358348151,1174.6590716696303],null,[523.2511306011972,1046.5022612023945],null,null,null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[440,880],null,[466.1637615180899,932.3275230361799],null],
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . A#5 . A5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,783.9908719634985],null,[466.1637615180899,587.3295358348151,783.9908719634985],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G1 G1 G1 . G1 G1 G1 . G1 G1 G1 . G1 G1 G1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G1 . . . G1 . . . G1 . . . G1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G5 . D6 G6 . A#5 D6 . G6 . A#6 D6 . A#5 G6 . | F5 . D6 F6 . A#5 D6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('A#4 . . . A4 . A#4 . D5 . C5 . . . . . | A4 . A#4 . A#4 . C5 . C5 . D5 . A4 . A#4 .'),
      lead3Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G4 . . . G4 . G4 . A#4 . G4 . . . . . | G4 . G4 . G4 . G#4 . G#4 . A#4 . G4 . G4 .'),
      lead8Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('A#5 . . . A5 . A#5 . D6 . C6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead4Len: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('A#5 . . . A5 . A#5 . D6 . C6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead5Len: [3,null,null,null,2,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . A#4 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[391.99543598174927,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[698.4564628660078,1396.9129257320155],null,[622.2539674441618,1244.5079348883237],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,null,null,null,null,null,null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[622.2539674441618,1244.5079348883237],null,[698.4564628660078,1396.9129257320155],null,[783.9908719634985,1567.981743926997],null,[830.6093951598903,1661.2187903197805],null,null,null],
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . F5 . D#5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,null,[523.2511306011972,622.2539674441618,783.9908719634985],null,[523.2511306011972,622.2539674441618,783.9908719634985],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F2 F2 F2 . F2 F2 F2 . F2 F2 F2 . F2 F2 F2 | . C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . C2 C2 C2'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . C2 . . . C2 . . . C2 . . . C2 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | G5 . D#6 G6 . C6 D#6 . G6 . C7 D#6 . C6 G6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C5 . D5 . F5 . D#5 . C5 . D5 . . . . . | . . C5 . D5 . D#5 . F5 . G5 . G#5 . . .'),
      lead3Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#4 . A#4 . D5 . C5 . G#4 . A#4 . . . . . | . . G#4 . A#4 . C5 . D5 . D#5 . F5 . . .'),
      lead8Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead4: seq('C6 . D6 . F6 . D#6 . C6 . D6 . . . . . | . . C6 . D6 . D#6 . F6 . G6 . G#6 . . .'),
      lead4Len: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null],
      lead5: seq('C6 . D6 . F6 . D#6 . C6 . D6 . . . . . | . . C6 . D6 . D#6 . F6 . G6 . G#6 . . .'),
      lead5Len: [2,null,2,null,2,null,2,null,2,null,3,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . C5 .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[391.99543598174927,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1046.5022612023945,2093.004522404789],null,null,null,null,null,[932.3275230361799,1864.6550460723597],null,[830.6093951598903,1661.2187903197805],null,[783.9908719634985,1567.981743926997],null,null,null,null,null,[440,880],null,[466.1637615180899,932.3275230361799],null,[466.1637615180899,932.3275230361799],null,[523.2511306011972,1046.5022612023945],null,[523.2511306011972,1046.5022612023945],null,[587.3295358348151,1174.6590716696303],null,[440,880],null,[466.1637615180899,932.3275230361799],null],
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. . . . . . . . . . . . . F5 . G5 | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords: [[523.2511306011972,622.2539674441618,830.6093951598903],null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,null,[523.2511306011972,622.2539674441618,830.6093951598903],null,[523.2511306011972,622.2539674441618,830.6093951598903],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 . G#1 G#1 G#1 | . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . G#1 . . . G#1 . . . G#1 . . . G#1 . | . . A#1 . . . A#1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('G#5 . D#6 G#6 . C6 D#6 . G#6 . C7 D#6 . C6 G#6 . | F5 . D6 F6 . A#5 D6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C6 . . . . . A#5 . G#5 . G5 . . . . . | A4 . A#4 . A#4 . C5 . C5 . D5 . A4 . A#4 .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#5 . . . . . G5 . F5 . D#5 . . . . . | G4 . G4 . G4 . G#4 . G#4 . A#4 . G4 . G4 .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead4: seq('C7 . . . . . A#6 . G#6 . G6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead5: seq('C7 . . . . . A#6 . G#6 . G6 . . . . . | A5 . A#5 . A#5 . C6 . C6 . D6 . A5 . A#5 .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: [[1046.5022612023945,2093.004522404789],null,null,null,null,null,[932.3275230361799,1864.6550460723597],null,[830.6093951598903,1661.2187903197805],null,[1174.6590716696303,2349.31814333926],null,null,null,null,null,[783.9908719634985,1567.981743926997],null,[698.4564628660078,1396.9129257320155],null,[659.2551138257398,1318.5102276514797],null,[698.4564628660078,1396.9129257320155],null,[698.4564628660078,1396.9129257320155],null,null,null,[587.3295358348151,1174.6590716696303],null,null,null],
      leadLen: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . . .').map((v) => !!v),
      chords: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,[466.1637615180899,587.3295358348151,698.4564628660078],null,[466.1637615180899,587.3295358348151,698.4564628660078],null,null,null],
      chordsLen: [2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null,2,null,null,2,null,null,2,null,null,null,2,null,2,null,null,null],
      bass2: seq('. F2 F2 F2 . F2 F2 F2 . F2 F2 F2 . F2 F2 F2 | . F2 F2 F2 . F2 F2 F2 . A#1 A#1 A#1 . A#1 A#1 A#1'),
      bass2Len: [null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1,null,1,1,1],
      bass3: seq('. . F1 . . . F1 . . . F1 . . . F1 . | . . F1 . . . F1 . . . A#1 . . . A#1 .'),
      bass3Len: [null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead6: seq('F5 . C6 F6 . G#5 C6 . F6 . G#6 C6 . G#5 F6 . | F5 . C6 F6 . G#5 C6 . F6 . A#6 D6 . A#5 F6 .'),
      lead6Len: [1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null,1,null,1,1,null,1,1,null],
      lead3: seq('C6 . . . . . A#5 . G#5 . D6 . . . . . | G5 . F5 . E5 . F5 . F5 . . . D5 . . .'),
      lead3Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      rim2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead8: seq('G#5 . . . . . G5 . F5 . A#5 . . . . . | D#5 . D5 . D5 . D5 . D5 . . . A#4 . . .'),
      lead8Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead4: seq('C7 . . . . . A#6 . G#6 . D7 . . . . . | G6 . F6 . E6 . F6 . F6 . . . D6 . . .'),
      lead4Len: [6,null,null,null,null,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null],
      lead5: seq('C7 . . . . . A#6 . G#6 . D7 . . . . . | G6 . F6 . E6 . F6 . F6 . . . D6 . . .'),
      lead5Len: [3,null,null,null,null,null,2,null,2,null,3,null,null,null,null,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null],
      lead9: seq('. . . . . . . . . . . . . . C5 . | . . . . . . . . . . . . . . . .'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead7: [[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,null,null,[349.2282314330039,466.1637615180899,587.3295358348151],null,null,null,null,null,null,null],
      lead7Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash3: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G#4 . . . G4 . G#4 . C5 . A#4 . . . . . | G4 . G#4 . A#4 . G#4 . C5 . A#4 . . . . .'),
      leadLen: [4,null,null,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . G#5 . G5 | . . . . . . . . . . . . . C5 . A#4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . . . . . . C#2 . . . . . . . | C#2 . . . . . . . C#2 . . . . . . .'),
      bassLen: [4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G4 . G#4 . C5 . A#4 . G4 . G#4 . . . . . | A#4 . C5 . C#5 . D#5 . F5 . F#5 . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . C5 . A#4 | . . . . . . . . . . . . . G#5 . A#5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1],
      bass: seq('C#2 . . . . . . . C#2 . . . . . . . | G#1 . . . . . . . G#1 . . . . . . .'),
      bassLen: [4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . C1 . C1 . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39],
};

export const banger = {
  "version": 1,
  "generator": 11,
  "style": "rave-happy",
  "flavour": "happy",
  "options": {
    "style": "rave",
    "mood": "euphoric",
    "mode": "major",
    "riffNotes": "keep",
    "length": "custom",
    "customBars": 80,
    "energy": "maximum",
    "variation": "wild",
    "tempo": "style",
    "bpm": 140,
    "hook": "auto",
    "combo": null,
    "flavour": "happy",
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
      "doubleDrop": true,
      "keyLift": "whole",
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
      "drop2Way": "more",
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
      "bass": "rolling",
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
      "fillNotes": "2",
      "writeLead": "auto",
      "riffSound": "keep",
      "partSounds": "style",
      "soundSet": "style"
    },
    "spot": {
      "intoDrop": "machineGun",
      "outOf": "wash",
      "quiet": "echo",
      "intro": "style",
      "ending": "tapeStop",
      "riser": "none"
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
  "seed": 6401,
  "paletteSnapshot": {
    "version": 1,
    "resolved": true,
    "styleId": "rave-happy",
    "moodId": "euphoric",
    "parts": {}
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
      "preset": "snareCrisp",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "clap",
      "part": "part:clap",
      "preset": "ds909Clap",
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
      "preset": "blastImpact",
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
      "lane": "crash3",
      "part": "part:ride",
      "preset": "ride909SixBit",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "bass2",
      "part": "part:bass",
      "preset": "layerBass80s",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "bass3",
      "part": "part:sub",
      "preset": "stSubSine",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords",
      "part": "part:piano",
      "preset": "mrdrPopGrand",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "chords2",
      "part": "part:pad",
      "preset": "bestPwmStrings",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead3",
      "part": "part:square",
      "preset": "mrdrFestivalStab",
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
      "preset": "mrdrFestivalStab",
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
      "preset": "bestChoirAah",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead8",
      "part": "part:third",
      "preset": "mrdrPopGrand",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    },
    {
      "lane": "lead9",
      "part": "part:counter",
      "preset": "mrdrPopGrand",
      "trimDb": 0,
      "favourite": false,
      "origin": "style default"
    }
  ],
  "riff": {
    "version": 1,
    "source": {
      "id": "chopin-minute-waltz-op64-1",
      "title": "Chopin: Minute Waltz, Op. 64 No. 1",
      "from": 0,
      "to": 7,
      "bpm": 170
    },
    "bars": 8,
    "grid": 16,
    "stats": {},
    "parts": [
      {
        "key": "lead",
        "label": "Minute Waltz piano",
        "kind": "melodic",
        "role": "hook",
        "meanPitch": 77,
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          "G#4:4 . . . G4:2 . G#4:2 . C5:2 . A#4:2 . . . . .",
          "G4:2 . G#4:2 . A#4:2 . G#4:2 . C5:2 . A#4:2 . . . . .",
          "G4:2 . G#4:2 . C5:2 . A#4:2 . G4:2 . G#4:2 . . . . .",
          "A#4:2 . C5:2 . C#5:2 . D#5:2 . F5:2 . F#5:2 . . . . .",
          "A#5:6 . . . . . G#5:2 . F#5:2 . F5:2 . . . . .",
          "F5:2 . D#5:2 . D#5:2 . D5:2 . D#5:4 . . . . . . .",
          "A#5:6 . . . . . G#5:2 . F#5:2 . F5:2 . . . . .",
          "F5:2 . D#5:2 . D5:2 . D#5:2 . F5:2 . A#4:2 . . . . ."
        ]
      },
      {
        "key": "lead2",
        "label": "The fourth-beat answer",
        "kind": "melodic",
        "role": "counter",
        "meanPitch": 78,
        "voice": "tngrIceBell",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          ". . . . . . . . . . . . . G#5:1 . G5:1",
          ". . . . . . . . . . . . . C5:1 . A#4:1",
          ". . . . . . . . . . . . . C5:1 . A#4:1",
          ". . . . . . . . . . . . . G#5:1 . A#5:1",
          ". . . . . . . . . . . . . D#5:1 . F5:1",
          ". . . . . . . . . . . . . G#5:1 . A#5:1",
          ". . . . . . . . . . . . . D#5:1 . F5:1",
          ". . . . . . . . . . . . . G#4:1 . C#5:1"
        ]
      },
      {
        "key": "bass",
        "label": "D-flat anchor",
        "kind": "melodic",
        "role": "bass",
        "meanPitch": 37,
        "voice": "bass80sFM",
        "voiceParams": null,
        "engineKeys": null,
        "strip": null,
        "bars": [
          "C#2:4 . . . . . . . C#2:2 . . . . . . .",
          "C#2:4 . . . . . . . C#2:2 . . . . . . .",
          "C#2:4 . . . . . . . C#2:2 . . . . . . .",
          "G#1:4 . . . . . . . G#1:2 . . . . . . .",
          "G#1:4 . . . . . . . G#1:2 . . . . . . .",
          "G#1:4 . . . . . . . G#1:2 . . . . . . .",
          "C#2:4 . . . . . . . C#2:2 . . . . . . .",
          "G#1:4 . . . . . . . G#1:2 . . . . . . ."
        ]
      }
    ]
  },
  "source": {
    "id": "chopin-minute-waltz-op64-1",
    "title": "Chopin: Minute Waltz, Op. 64 No. 1",
    "from": 0,
    "to": 7
  },
  "take": 1,
  "laneOf": {
    "hook": "lead",
    "riff:lead2": "lead2",
    "riff:bass": "bass",
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
    "bass": "bass2",
    "sub": "bass3",
    "piano": "chords",
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
      "id": "fakeout:intro",
      "role": "intro",
      "type": "intro",
      "label": "Intro",
      "from": 1,
      "to": 8,
      "energy": 0.3
    },
    {
      "id": "fakeout:build",
      "role": "build",
      "type": "build",
      "label": "Build",
      "from": 9,
      "to": 12,
      "energy": 0.6
    },
    {
      "id": "fakeout:fake",
      "role": "drop",
      "type": "halfDrop",
      "label": "Fake Drop",
      "from": 13,
      "to": 16,
      "energy": 0.65,
      "hook": true
    },
    {
      "id": "fakeout:again",
      "role": "build2",
      "type": "build",
      "label": "Build Again",
      "from": 17,
      "to": 20,
      "energy": 0.6
    },
    {
      "id": "fakeout:drop",
      "role": "drop2",
      "type": "drop",
      "label": "Drop",
      "from": 21,
      "to": 36,
      "energy": 0.85,
      "hook": true
    },
    {
      "id": "fakeout:breakdown",
      "role": "breakdown",
      "type": "breakdown",
      "label": "Breakdown",
      "from": 37,
      "to": 44,
      "energy": 0.25
    },
    {
      "id": "fakeout:build2",
      "role": "build2",
      "type": "build",
      "label": "Build 2",
      "from": 45,
      "to": 48,
      "energy": 0.6
    },
    {
      "id": "fakeout:false",
      "role": "false",
      "type": "falseEnding",
      "label": "False Ending",
      "from": 49,
      "to": 52,
      "energy": 0.15
    },
    {
      "id": "fakeout:final",
      "role": "drop3",
      "type": "drop",
      "label": "Final Drop",
      "from": 53,
      "to": 76,
      "energy": 1,
      "hook": true
    },
    {
      "id": "fakeout:outro",
      "role": "outro",
      "type": "outro",
      "label": "Outro",
      "from": 77,
      "to": 80,
      "energy": 0.35
    }
  ],
  "report": {
    "version": 1,
    "summary": {
      "style": "Rave · Happy Hardcore",
      "mood": "euphoric",
      "key": "C# major",
      "reads": "C# major",
      "bars": 80,
      "bpm": 170,
      "seconds": 113,
      "variation": "wild",
      "hook": "Minute Waltz piano"
    },
    "warnings": [],
    "levels": [
      {
        "lane": "kick",
        "job": "kick",
        "how": "sound",
        "from": "Rave's own · kick · =909 Kick Punch, bars 45–52",
        "base": 0.5,
        "before": 0.5,
        "after": 0.5,
        "move": 0,
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
        "from": "Rave's own · snare · Crisp Snare, bars 45–52",
        "base": 2,
        "before": 2,
        "after": 2,
        "move": 0,
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
        "from": "Rave's own · clap · =909 Clap, bars 45–52",
        "base": 0,
        "before": 0,
        "after": 0,
        "move": 0,
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
        "from": "Rave's own · hats · = Arcade Hat, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -5,
        "move": 0,
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
        "from": "Rave's own · ohats · =909 Open Hat, bars 45–52",
        "base": -8,
        "before": -8,
        "after": -8,
        "move": 0,
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
        "after": -7.8,
        "move": -0.8,
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
        "after": -5,
        "move": 0,
        "window": [
          59,
          66
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
        "from": "BIG-ROOM HOUSE SEED · ride · Ride · 909 Six-Bit, bars 45–52",
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
        "lane": "bass2",
        "job": "bass",
        "how": "part",
        "from": "Rave's own · bass · Walking Sine Bass, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -8.8,
        "move": -3.8,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "bass3",
        "job": "sub",
        "how": "part",
        "from": "Rave's own · sub · Sub Sine, bars 45–52",
        "base": -10,
        "before": -10,
        "after": -11.9,
        "move": -1.9,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "chords",
        "job": "piano",
        "how": "part",
        "from": "Big-Room House's own · piano · Electric Grand, bars 45–52",
        "base": -3,
        "before": -3,
        "after": -4.4,
        "move": -1.4,
        "window": [
          52,
          59
        ],
        "calibrated": true
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
          8,
          11
        ],
        "calibrated": true
      },
      {
        "lane": "lead3",
        "job": "square",
        "how": "part",
        "from": "Rave's own · square · Hoover, bars 45–52",
        "base": -5,
        "before": -5,
        "after": -8.5,
        "move": -3.5,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "lead4",
        "job": "bell",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · bell · Ice Bell, bars 45–52",
        "base": -6.9,
        "before": -6,
        "after": -10.1,
        "move": -4.1,
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
        "from": "Rave's own · megaSaw · Hoover, bars 45–52",
        "base": -6,
        "before": -6,
        "after": -8.5,
        "move": -2.5,
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
        "from": "BIG-ROOM HOUSE SEED · arp · Crystal Trigger, bars 45–52",
        "base": -10.5,
        "before": -10.5,
        "after": -12.8,
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
        "from": "BIG-ROOM HOUSE SEED · choir · BEST Choir Aah, bars 45–52",
        "base": -11.21,
        "before": -7,
        "after": -9.6,
        "move": -2.6,
        "window": [
          52,
          59
        ],
        "calibrated": true
      },
      {
        "lane": "lead8",
        "job": "third",
        "how": "part",
        "from": "BIG-ROOM HOUSE SEED · third · Electric Grand, bars 45–52",
        "base": -6.3,
        "before": -7,
        "after": -7.1,
        "move": -0.1,
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
        "after": -6.3,
        "move": 2.7,
        "window": [
          52,
          59
        ],
        "calibrated": true
      }
    ],
    "transitions": [
      {
        "bar": 8,
        "from": "Intro",
        "to": "Build",
        "delta": 0.3,
        "moves": [
          "fill"
        ]
      },
      {
        "bar": 36,
        "from": "Drop",
        "to": "Breakdown",
        "delta": -0.6,
        "moves": [
          "throw"
        ]
      },
      {
        "bar": 44,
        "from": "Breakdown",
        "to": "Build 2",
        "delta": 0.35,
        "moves": [
          "fill"
        ]
      },
      {
        "bar": 48,
        "from": "Build 2",
        "to": "False Ending",
        "delta": -0.45,
        "moves": [
          "halfTimeBar"
        ]
      },
      {
        "bar": 76,
        "from": "Final Drop",
        "to": "Outro",
        "delta": -0.65,
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
        "label": "RIFF Minute Waltz piano · HOOK",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": 0,
          "send": {
            "delay": 0.12,
            "reverb": 0.3
          },
          "pan": -0.05,
          "eq": {
            "high": 3
          }
        },
        "noteFX": null
      },
      {
        "role": "riff:lead2",
        "lane": "lead2",
        "label": "RIFF The fourth-beat answer",
        "voice": "tngrIceBell",
        "voiceParams": null,
        "strip": {
          "gain": -2
        },
        "noteFX": null
      },
      {
        "role": "riff:bass",
        "lane": "bass",
        "label": "RIFF D-flat anchor",
        "voice": "bass80sFM",
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
        "voice": "ds909KickPunch",
        "voiceParams": null,
        "strip": {
          "gain": 0.5,
          "eq": {
            "low": -2
          }
        },
        "noteFX": null
      },
      {
        "role": "snare",
        "lane": "snare",
        "label": "SNARE",
        "voice": "snareCrisp",
        "voiceParams": null,
        "strip": {
          "gain": 2,
          "eq": {
            "high": 3
          },
          "send": {
            "reverb": 0.15
          }
        },
        "noteFX": null
      },
      {
        "role": "clap",
        "lane": "clap",
        "label": "CLAP",
        "voice": "ds909Clap",
        "voiceParams": null,
        "strip": {
          "gain": 0,
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
        "voice": "hatEngine",
        "voiceParams": null,
        "strip": {
          "gain": -5,
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
          "gain": -8,
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
          "gain": -7.8,
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
          "dur": 5.647058823529412,
          "note": "White noise through a band climbing 250 Hz to 8 kHz over 5.65s as it fades in: the lift into a drop.",
          "noise": {
            "type": "bandpass",
            "freq": 250,
            "to": 8000,
            "sweep": 5.647058823529412,
            "Q": 1.6,
            "slope": -24,
            "color": "white",
            "attack": 5.19529411764706,
            "hold": 0,
            "decay": 0.45176470588235296,
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
        "voice": "blastImpact",
        "voiceParams": null,
        "strip": {
          "gain": -2.4,
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
        "lane": "bass2",
        "label": "BASS Off-Beat · Layer 80s Bass",
        "voice": "layerBass80s",
        "voiceParams": null,
        "strip": {
          "gain": -8.8,
          "effects": [
            {
              "id": "filter",
              "params": {
                "type": "lowpass",
                "frequency": 1400,
                "Q": 1
              }
            }
          ]
        },
        "noteFX": null
      },
      {
        "role": "sub",
        "lane": "bass3",
        "label": "SUB · Sub Sine",
        "voice": "stSubSine",
        "voiceParams": null,
        "strip": {
          "gain": -11.9
        },
        "noteFX": null
      },
      {
        "role": "piano",
        "lane": "chords",
        "label": "PIANO · Bright Pop Grand",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": -4.4,
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
        "label": "PAD · PWM Strings",
        "voice": "bestPwmStrings",
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
        "label": "SAW STAB · Festival Stab",
        "voice": "mrdrFestivalStab",
        "voiceParams": null,
        "strip": {
          "gain": -8.5,
          "pan": 0.1,
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
        "label": "HOOK 8VA · Ice Bell",
        "voice": "tngrIceBell",
        "voiceParams": null,
        "strip": {
          "gain": -10.1,
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
        "label": "HOOVER 8VA · Festival Stab",
        "voice": "mrdrFestivalStab",
        "voiceParams": null,
        "strip": {
          "gain": -8.5,
          "pan": -0.1,
          "send": {
            "delay": 0.15,
            "reverb": 0.25
          }
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
          "gain": -12.8,
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
        "lane": "lead7",
        "label": "CHOIR · Synth Choir Aah",
        "voice": "bestChoirAah",
        "voiceParams": null,
        "strip": {
          "gain": -9.6,
          "send": {
            "reverb": 0.5
          }
        },
        "noteFX": null
      },
      {
        "role": "third",
        "lane": "lead8",
        "label": "THIRD BELOW · Bright Pop Grand",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": -7.1,
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
        "label": "COUNTER-MELODY · Bright Pop Grand",
        "voice": "mrdrPopGrand",
        "voiceParams": null,
        "strip": {
          "gain": -6.3,
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
        "notes": "c71b5abb",
        "voice": "1605d054",
        "auto": "f5f534b2",
        "expression": "77074ba4",
        "production": "7fd26637"
      },
      "riff:lead2": {
        "notes": "e739dade",
        "voice": "c6497533",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "riff:bass": {
        "notes": "ff248d15",
        "voice": "6a9054d9",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "kick": {
        "notes": "34891b4b",
        "voice": "9f0161bb",
        "auto": "4d3b54a5",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "snare": {
        "notes": "b355e2e7",
        "voice": "4fdb061e",
        "auto": "223e0ae4",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "clap": {
        "notes": "f96273a5",
        "voice": "b837a92d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "bbb4dcb3"
      },
      "hats": {
        "notes": "fa9222a5",
        "voice": "2e5964eb",
        "auto": "4d3b54a5",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "ohats": {
        "notes": "25e91fdd",
        "voice": "8be5eeea",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "crash": {
        "notes": "f64b79d4",
        "voice": "2fe4894",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ae0a06d"
      },
      "riser": {
        "notes": "5b6fd888",
        "voice": "1bbf2e18",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "ce4dd3c6"
      },
      "impact": {
        "notes": "8faa1a85",
        "voice": "c741592e",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "f1464940"
      },
      "fill": {
        "notes": "281db009",
        "voice": "e0417259",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "shaker": {
        "notes": "fa29acfd",
        "voice": "573ce642",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "tambourine": {
        "notes": "3754af73",
        "voice": "4a3e77e",
        "auto": "4d3b54a5",
        "expression": "77074ba4",
        "production": "b66f11a0"
      },
      "ride": {
        "notes": "2fd5543d",
        "voice": "2371fa8d",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "3ca95014"
      },
      "bass": {
        "notes": "3472ac2f",
        "voice": "80a0e84b",
        "auto": "54b9bc63",
        "expression": "77074ba4",
        "production": "c24bc571"
      },
      "sub": {
        "notes": "510bf5fa",
        "voice": "94966028",
        "auto": "54b9bc63",
        "expression": "77074ba4",
        "production": "1d66975"
      },
      "piano": {
        "notes": "f5da347d",
        "voice": "1605d054",
        "auto": "c81bf7a1",
        "expression": "77074ba4",
        "production": "a9289503"
      },
      "pad": {
        "notes": "5e8934a8",
        "voice": "afc790ea",
        "auto": "72cb218b",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "square": {
        "notes": "e5b0084a",
        "voice": "295e70c1",
        "auto": "54b9bc63",
        "expression": "77074ba4",
        "production": "9ece8a69"
      },
      "bell": {
        "notes": "5730e8ef",
        "voice": "c6497533",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "19ca504f"
      },
      "megaSaw": {
        "notes": "57ab0803",
        "voice": "295e70c1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "a4ed6bf2"
      },
      "arp": {
        "notes": "db62b804",
        "voice": "7537d16d",
        "auto": "54b9bc63",
        "expression": "77074ba4",
        "production": "59ba867a"
      },
      "choir": {
        "notes": "b56fa5d",
        "voice": "e9a11dc1",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "8643a741"
      },
      "third": {
        "notes": "3299fd1b",
        "voice": "1605d054",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "576591d9"
      },
      "counter": {
        "notes": "74a1481",
        "voice": "1605d054",
        "auto": "77074ba4",
        "expression": "77074ba4",
        "production": "181c5976"
      }
    },
    "master": "357a5480"
  }
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -5.8 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "crash3", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "bass3", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }, { key: "lead9", from: "lead", independent: true }, { key: "lead2", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","crash2","tom","tom2","rim","rim2","crash3","bass2","bass3","chords","chords2","lead","lead3","lead4","lead5","lead6","lead7","lead8","lead9","lead2","bass"],
  labels: {"kick":"KICK","snare":"SNARE","clap":"CLAP","hats":"HATS","ohats":"OPEN HATS","crash":"CRASH","crash2":"RISER","tom":"IMPACT","tom2":"FILL TOMS","rim":"PERC Shaker","rim2":"PERC Tambourine","crash3":"RIDE","bass2":"BASS Off-Beat · Layer 80s Bass","bass3":"SUB · Sub Sine","chords":"PIANO · Bright Pop Grand","chords2":"PAD · PWM Strings","lead":"RIFF Minute Waltz piano · HOOK","lead3":"SAW STAB · Festival Stab","lead4":"HOOK 8VA · Ice Bell","lead5":"HOOVER 8VA · Festival Stab","lead6":"ARP · Sparkle Pluck","lead7":"CHOIR · Synth Choir Aah","lead8":"THIRD BELOW · Bright Pop Grand","lead9":"COUNTER-MELODY · Bright Pop Grand","lead2":"RIFF The fourth-beat answer","bass":"RIFF D-flat anchor"},
  voice: {"kickVoice":"ds909KickPunch","snareVoice":"snareCrisp","clapVoice":"ds909Clap","hatsVoice":"hatEngine","ohatsVoice":"ds909OpenHat","crashVoice":"ds909Crash","tomVoice":"blastImpact","tom2Voice":"ds909Tom","rimVoice":"shaker","rim2Voice":"tambourine","crash3Voice":"ride909SixBit","bass2Voice":"layerBass80s","bass3Voice":"stSubSine","chordsVoice":"mrdrPopGrand","chords2Voice":"bestPwmStrings","leadVoice":"mrdrPopGrand","lead3Voice":"mrdrFestivalStab","lead4Voice":"tngrIceBell","lead5Voice":"mrdrFestivalStab","lead6Voice":"tngrCrystalTrigger","lead7Voice":"bestChoirAah","lead8Voice":"mrdrPopGrand","lead9Voice":"mrdrPopGrand","lead2Voice":"tngrIceBell","bassVoice":"bass80sFM"},
  voiceParams: {"crash2Voice":{"label":"Long Riser","category":"Sweep","homeLane":"crash","kind":"drum","dur":5.647058823529412,"note":"White noise through a band climbing 250 Hz to 8 kHz over 5.65s as it fades in: the lift into a drop.","noise":{"type":"bandpass","freq":250,"to":8000,"sweep":5.647058823529412,"Q":1.6,"slope":-24,"color":"white","attack":5.19529411764706,"hold":0,"decay":0.45176470588235296,"curve":"exp","gain":1},"drive":0.08,"peak":0.034}},
  fx: { reverb: { decay: 2.8 } },
  lanes: {
    kick: { gain: 0.5, eq: { low: -2 } },
    snare: { gain: 2, send: { reverb: 0.15 }, eq: { high: 3 } },
    clap: { send: { reverb: 0.25 } },
    hats: { gain: -5, pan: 0.2 },
    ohats: { gain: -8, pan: -0.2 },
    crash: { gain: -7.8, pan: 0.2, send: { reverb: 0.9 } },
    crash2: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    tom: { gain: -2.4, send: { reverb: 0.6 } },
    tom2: { gain: -5, pan: 0.2, send: { reverb: 0.3 } },
    rim: { gain: -15, pan: 0.3 },
    rim2: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    crash3: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass2: { gain: -8.8, effects: [{ id: "filter", params: { type: "lowpass", frequency: 1400, Q: 1 } }] },
    bass3: { gain: -11.9 },
    chords: { gain: -4.4, pan: -0.1, send: { reverb: 0.3 } },
    chords2: { gain: -9.1, send: { reverb: 0.5 }, eq: { low: -4 } },
    lead: { pan: -0.05, send: { delay: 0.12, reverb: 0.3 }, eq: { high: 3 } },
    lead3: { gain: -8.5, pan: 0.1, send: { delay: 0.2, reverb: 0.35 } },
    lead4: { gain: -10.1, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    lead5: { gain: -8.5, pan: -0.1, send: { delay: 0.15, reverb: 0.25 } },
    lead6: { gain: -12.8, pan: -0.25, send: { delay: 0.2, reverb: 0.2 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    lead7: { gain: -9.6, send: { reverb: 0.5 } },
    lead8: { gain: -7.1, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    lead9: { gain: -6.3, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
    lead2: { gain: -2 },
    bass: { gain: -2 },
  },
};

export const arrangement = {
  automation: {
    __master: {
      fx: [
        {
          from: [12,8],
          to: [13,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.125,
                retrigger: 0,
                fade: 0,
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
        {
          from: [20,8],
          to: [21,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.125,
                retrigger: 0,
                fade: 0,
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
        {
          from: [36,8],
          to: [37,0],
          chain: [
            {
              id: "reverb",
              params: {
                decay: 4.5,
                preDelay: 0.02,
                low: 0,
                mid: 0,
                high: -3,
                width: 1,
                wet: 0.55,
              },
            },
          ],
        },
        {
          from: [48,8],
          to: [49,0],
          chain: [
            {
              id: "reverb",
              params: {
                decay: 4.5,
                preDelay: 0.02,
                low: 0,
                mid: 0,
                high: -3,
                width: 1,
                wet: 0.55,
              },
            },
          ],
        },
        {
          from: [52,8],
          to: [53,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0.125,
                retrigger: 0,
                fade: 0,
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
        {
          from: [76,8],
          to: [77,0],
          chain: [
            {
              id: "reverb",
              params: {
                decay: 4.5,
                preDelay: 0.02,
                low: 0,
                mid: 0,
                high: -3,
                width: 1,
                wet: 0.55,
              },
            },
          ],
        },
        {
          from: [79,0],
          to: [81,0],
          chain: [
            {
              id: "stutter",
              params: {
                slice: 0,
                retrigger: 0,
                fade: 0,
                stop: 8,
              },
            },
          ],
        },
      ],
    },
    lead: {
      points: [[53,0,0],[53,0,-2.5],[77,0,-2.5],[77,0,0]],
      cuts: [[49,0]],
      fx: [
        {
          from: [37,0],
          to: [45,0],
          chain: [
            {
              id: "pingpong",
              params: {
                sync: 1,
                division: 0.5,
                feedback: 0.35,
                wet: 0.3,
              },
            },
          ],
        },
      ],
    },
    chords: {
      cuts: [[49,0]],
      fx: [
        {
          from: [9,0],
          to: [13,0],
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
          from: [17,0],
          to: [21,0],
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
          from: [37,0],
          to: [45,0],
          chain: [
            {
              id: "pingpong",
              params: {
                sync: 1,
                division: 0.5,
                feedback: 0.35,
                wet: 0.3,
              },
            },
          ],
        },
        {
          from: [45,0],
          to: [49,0],
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
          from: [9,0],
          to: [13,0],
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
          from: [17,0],
          to: [21,0],
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
          from: [45,0],
          to: [49,0],
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
      cuts: [[49,0]],
      fx: [
        {
          from: [9,0],
          to: [13,0],
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
          from: [17,0],
          to: [21,0],
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
          from: [45,0],
          to: [49,0],
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
    bass3: {
      cuts: [[49,0]],
      fx: [
        {
          from: [9,0],
          to: [13,0],
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
          from: [17,0],
          to: [21,0],
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
          from: [45,0],
          to: [49,0],
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
      cuts: [[49,0]],
      fx: [
        {
          from: [9,0],
          to: [13,0],
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
          from: [17,0],
          to: [21,0],
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
          from: [45,0],
          to: [49,0],
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
      cuts: [[49,0]],
      fx: [
        {
          from: [9,0],
          to: [13,0],
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
          from: [17,0],
          to: [21,0],
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
          from: [45,0],
          to: [49,0],
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
      points: [[9,0,0],[9,0,-12],[13,0,0],[17,0,0],[17,0,-12],[21,0,0],[45,0,0],[45,0,-12],[49,0,0]],
      cuts: [[49,0]],
    },
    kick: {
      cuts: [[49,0]],
    },
    hats: {
      cuts: [[49,0]],
    },
    rim2: {
      cuts: [[49,0]],
    },
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
