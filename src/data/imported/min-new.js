// MIN New — one song: what it plays, how it is arranged, how it sounds.
//
// A copy of MIN3 (min3), taken from the Song Mixer.
// Everything below is that song as the desk had it at the moment of the copy.
// It is a snapshot and nothing more: the game does not play this file, no
// cabinet can select it, and MIN3 is untouched by anything done here.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "min-new";
export const title = "MIN New";
export const slug = "min-new";
export const group = "copy";

export const bank = {
  bpm: 120,
  musicTrim: 0.7,
  sections: [
    {
      lead: seq('. . . . . . . . . . . . . . G4 . | G#4 . C5 . A#4 . G4 G#4 . G#4 . C5 A#4 . G4 .'),
    },
    {
      bass: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      lead: seq('G#4 . C5 . A#4 . G4 G#4 . G#4 . C5 A#4 . G4 . | G#4 . C5 . A#4 . G4 G#4 . G#4 . C5 A#4 . G4 .'),
      chords: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('G#2 . . . . . G#2 . . . G#2 . G2 . D#2 . | G#2 . G#2 . . . G#2 . . . G#2 . G2 D2 D#2 .'),
      lead: seq('A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 . | A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 .'),
      twinkle: seq('A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . . | A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . .'),
      chords: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      lead: seq('G3 . G#3 . C4 . A#3 G3 . G3 . G#3 C4 . A#3 . | G3 . G#3 . A#3 . C4 C#4 . D#4 . F4 . . F#4 .'),
      chords: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('G#2 . . . . . G#2 . . . G#2 . G2 . G2 . | G#2 . G#2 . . . G#2 . . . G#2 . G2 . D#2 .'),
      lead: seq('A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 . | A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 .'),
      twinkle: seq('A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . . | A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . .'),
      chords: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . A#1 . | C2 . . . C2 . C#2 . . . C#2 . . . C#2 .'),
      lead: seq('F4 . E4 . F#4 . E4 F4 . F4 . E4 F4 A#4 . . | G#4 . G4 . C5 . A#4 G#4 . G#4 . G4 G#4 C#5 . .'),
      leadHarm: seq('A4 . A4 . A4 . A4 A#4 . A#4 . A#4 . A#4 . A#4 | C5 . C5 . C5 . C5 C#5 . C#5 . C#5 . C#5 . C#5'),
      chords: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . . . C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . D#2 . | . . D#2 . . . D#2 . C#2 . . . C#2 . . .'),
      lead: seq('C5 . A#4 . G#4 . F#4 F4 . D#4 . C#4 . C4 . . | G3 . G#3 . C4 . A#3 G3 . G#3 . A#3 C4 C#4 D#4 E4'),
      leadHarm: seq('D#5 . D#5 . D#5 . D#5 F5 . F5 . F5 . F5 . F5 | F#5 . F#5 . F#5 . F#5 G#5 . G#5 . G#5 . G#5 . G#5'),
      chords: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . C2 . | . . C2 . . . C2 . C#2 . . . C#2 . . .'),
      lead: seq('F4 E4 E4 E4 F#4 . E4 F4 . F4 . E4 F4 A#4 . . | G#4 . G4 . C5 . A#4 G#4 . G#4 . G4 G#4 . F5 .'),
      leadHarm: seq('A4 . A4 . A4 . A4 A#4 . A#4 . A#4 . A#4 . A#4 | C5 . C5 . C5 . C5 C#5 . C#5 . C#5 . C#5 . C#5'),
      chords: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      lead: seq('D#5 . C#5 . C5 A#4 G#4 F#4 F4 D#4 C#4 C4 A#3 G#3 . . | A3 . C4 A#3 . F3 F#3 C3 C#3 . . . . . . .'),
      leadHarm: seq('D#5 . D#5 . D#5 . D#5 F5 . F5 . F5 . F5 . F5 | G#5 . G#5 . G#5 . G#5 C#5 . C#5 . C#5 . C#5 . .'),
      chords: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . A#1 . | C2 . . . C2 . C#2 . . . C#2 . . . C#2 .'),
      chords: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . . . C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . D#2 . | . . D#2 . . . D#2 . C#2 . . . C#2 . . .'),
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . A#3 C4 C#4'),
      chords: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . C2 . | . . C2 . . . C2 . C#2 . . . C#2 . . .'),
      lead: seq('D#4 E4 D#4 E4 . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      chords: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('G#1 . . . . . . G#1 . . G#1 . . G#1 . . | C#2 . . . . . . . G#1 . . . . . . .'),
      chords: [[369.9944227116344,415.3046975799451,523.2511306011972,103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[554.3652619537442,138.59131548843604],null,[415.3046975799451,554.3652619537442],null,null,[415.3046975799451,554.3652619537442],null,null,[698.4564628660078,103.82617439498628],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . C1 . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      bass: seq('D#2 . . D#2 . . D#2 . G#1 . . G#1 . . G#1 . | C#2 . . C#2 . . C#2 . F2 . . F2 . . F2 .'),
      chords: [[523.2511306011972,739.9888454232688,155.56349186104046],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[622.2539674441618,103.82617439498628],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,[554.3652619537442,698.4564628660078,138.59131548843604],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . C1 . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      bass: seq('G#1 . . . . . . G#1 . . G#1 . . G#1 . . | C#2 . . . . . . . G#1 . . . . . . .'),
      lead: seq('G#5 . D#5 . G#5 . D#5 G#5 . G#5 D#5 . G#5 . E5 . | G#5 . G#5 . G#5 . F5 F6 . . . . . . . .'),
      twinkle: seq('G#4 . D#4 . G#4 . D#4 G#4 . G#4 D#4 . G#4 . E4 . | G#4 . G#4 . G#4 . F4 F5 . . . . . . . .'),
      chords: [[369.9944227116344,415.3046975799451,523.2511306011972,103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[554.3652619537442,138.59131548843604],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[698.4564628660078,103.82617439498628],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('D#2 . . D#2 . . D#2 . G#1 . . G#1 . . G#1 . | C#2 . . C#2 . . C#2 . F2 . . F2 . . F2 .'),
      lead: seq('F6 . A#5 . F6 . A#5 F6 . F6 A#5 . F6 . C6 . | D#6 D#6 D#6 . D#6 . C#6 C6 . D#6 . C#6 . A#5 . .'),
      twinkle: seq('F5 . A#4 . F5 . A#4 F5 . F5 A#4 . F5 . C5 . | D#5 D#5 D#5 . D#5 . C#5 C5 . D#5 . C#5 . A#4 . .'),
      chords: [[523.2511306011972,739.9888454232688,155.56349186104046],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,[622.2539674441618,103.82617439498628],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,[554.3652619537442,698.4564628660078,138.59131548843604],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . C1 . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('G#1 . . G#1 . . G#1 . G#1 . . G#1 . . G#1 . | C#2 . . C#2 . . C#2 . B1 . . B1 . . B1 .'),
      lead: seq('G#5 . D#5 . G#5 . D#5 G#5 . G#5 D#5 . G#5 . E5 . | G#5 . G#5 . G#5 . F5 F6 . . . . . . . .'),
      twinkle: seq('G#4 . D#4 . G#4 . D#4 G#4 . G#4 D#4 . G#4 . E4 . | G#4 . G#4 . G#4 . F4 F5 . . . . . . . .'),
      chords: [[369.9944227116344,523.2511306011972,103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[554.3652619537442,138.59131548843604],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[698.4564628660078,123.47082531403103],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . . C2 . . C2 . C1 . . C1 . . C1 . | F1 . . F1 . . F1 . F1 . . F1 . . F1 .'),
      lead: seq('C6 C#6 C6 . B5 . C6 . G#6 G#6 . A#5 G6 G6 . A5 | F#6 F#6 . G#5 F6 F6 . F5 . . . . . . . .'),
      leadHarm: seq('C5 C#5 C5 . B4 . C5 . G#5 . . A#4 G5 . . A4 | F#5 . . G#4 F5 . . F4 . . . . . . . .'),
      chords: [[523.2511306011972,130.8127826502993],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,[391.99543598174927,659.2551138257398,65.40639132514966],null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,[349.2282314330039,174.61411571650194],null,[349.2282314330039,523.2511306011972],null,null,null,null,null,[698.4564628660078,87.30705785825097,174.61411571650194],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      lead: seq('D#5 . C#5 . C5 A#4 G#4 F#4 F4 D#4 C#4 C4 A#3 G#3 . . | A3 . C4 A#3 . F3 F#3 C3 C#2 . . . . . . .'),
      leadHarm: seq('D#5 . D#5 . D#5 . D#5 F5 . F5 . F5 . F5 . F5 | G#5 . G#5 . G#5 . G#5 C#5 . C#5 . C#5 . C#5 . .'),
      chords: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,1,2,3,4,9,10,11,12,5,6,7,8,13,14,15,16,17,18,1,2,3,4,5,6,7,19],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -2.2,
  masterEffects: [{ id: "mbCompN" }, { id: "l7", params: { threshold: -6.2 } }],
  layers: [{ key: "chords3", from: "chords", independent: true }, { key: "chords4", from: "chords3", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "bass2", from: "bass", independent: true }],
  voice: {"kickVoice":"dsKick","snareVoice":"dsCrackSnare2","clapVoice":"clapRoom","hatsVoice":"hatOpen","ohatsVoice":"ohatSustainWash","leadVoice":"tpSuperSaw","chordsVoice":"layerShopLead","twinkleVoice":"tpMarimba","leadHarmVoice":"reedLead","bassVoice":"roundBass","chords2Voice":"roundMono2","bass2Voice":"toneSquare","chords3Voice":"shopOrgan2","chords4Voice":"toneTriangle"},
  voiceParams: {"chordsVoice":{"label":"Shop Lead","category":"Lead","synth":"MRDR-3","dur":1.55,"note":"Triangle with the octave-sine brightener on top: the shop’s lead, which needs air to read over the organ.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":1,"attack":0.007,"decay":1.55,"vca":"env"},"osc2":{"type":"sine","ratio":2,"gain":0.4,"len":0.68,"attack":0.0016666666666666668,"decay":1.054},"osc3":{"gain":1.11,"detune":18,"ratio":0.5,"type":"sawtooth","attack":0.056,"len":0.78}},"starter":false,"global":{"filter":{"type":"lowpass","slope":-12,"freq":1880,"Q":12.15,"env":{"octaves":0.1}}},"bypassed":{"$quick.global.filter":{"type":"lowpass","slope":-12,"freq":8000,"Q":0.7,"env":{"octaves":0}},"layer.osc1.fm":{"type":"sine","ratio":1.4,"index":1,"decay":1}},"vibrato":{"depth":0.04,"delay":0.004},"sync":"1+3","kind":"tone","level":0.0786022098371385,"peak":0.9435728753052546,"songOrigin":"library","songSourceId":"chordsVoice"},"kickVoice":{"label":"DS Kick","category":"Kick","dur":1,"note":"The drum-synth 808: a sine dropping an octave and a half into a long sub tail, with a filtered click on the front and a little drive to round it.","osc":{"type":"sine","from":165,"to":48,"sweep":0.045,"decay":0.45,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":3200,"Q":0.7,"decay":0.015,"gain":0.4},"drive":0.2,"id":"dsKick","kind":"drum","factory":true,"level":0.054285,"peak":0.7},"snareVoice":{"label":"DS Crack Snare 2","category":"Snare","dur":1,"note":"Tight and driven: a short square knock, highpassed air, everything over in a tenth of a second. The backbeat for fast songs.","osc":{"type":"square","from":255,"to":440,"sweep":0.025,"decay":0.05,"curve":"exp","gain":0.55},"noise":{"type":"highpass","freq":2300,"Q":2.1,"decay":0.3,"gain":1,"color":"blue"},"drive":0.35,"starter":false,"knock":0.99,"kind":"drum","level":0.1002528777729989,"peak":0.7,"songOrigin":"library","songSourceId":"snareVoice"},"clapVoice":{"label":"Big Room Clap","category":"Clap","dur":1,"note":"Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants space in the arrangement.","noise":{"type":"bandpass","freq":1500,"Q":0.9,"decay":0.5,"gain":0.88},"taps":[0,0.014,0.037,0.058,0.083],"tapFalloff":0.89,"id":"clapRoom","kind":"noise","factory":true,"level":0.027296,"peak":0.3999},"leadVoice":{"label":"Super Saw","category":"Lead","synth":"Synth","dur":1.4,"note":"Three sawtooths thirty cents apart — the trance lead, and the widest single sound here.","origin":"Tonejs/Presets Synth/SuperSaw","options":{"oscillator":{"type":"fatsawtooth","count":3,"spread":30},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.5,"release":0.4,"attackCurve":"exponential"}},"id":"tpSuperSaw","kind":"tone","factory":true,"level":0.024461,"peak":0.2661},"leadHarmVoice":{"label":"Reed","category":"Orch","synth":"MonoSynth","dur":1.6,"note":"Slow attack into a narrow filter — a clarinet-ish breath rather than a stab.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.06,"decay":0.1,"sustain":0.8,"release":0.3},"filter":{"type":"lowpass","Q":1,"rolloff":-12},"filterEnvelope":{"attack":0.08,"decay":0.2,"sustain":0.6,"release":0.3,"baseFrequency":400,"octaves":2}},"id":"reedLead","kind":"tone","factory":true,"level":0.114797,"peak":0.8357},"twinkleVoice":{"label":"Synth Marimba","category":"Bells","synth":"Synth","dur":2,"note":"Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.","origin":"Tonejs/Presets Synth/Marimba","options":{"oscillator":{"partials":[1,0,2,0,3],"type":"square"},"envelope":{"attack":0.001,"decay":1.2,"sustain":0,"release":1.2}},"starter":false,"kind":"tone","level":0.08668136701948612,"peak":0.6670168490685039,"songOrigin":"library","songSourceId":"twinkleVoice"},"chords2Voice":{"label":"Plain Square","category":"Lead","synth":"Synth","dur":7.7,"note":"Simple Square Tone","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0.39,"sustain":0.06,"release":0.14}},"id":"roundMono2","kind":"tone","factory":true,"level":0.061825,"peak":0.6477},"bassVoice":{"label":"Round Bass","category":"Bass","synth":"CRLS-1","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.001,"decay":1.24,"sustain":0.29,"release":0.482},"filter":{"type":"lowpass","Q":6.85,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":1.22,"sustain":0.13,"release":0.3,"baseFrequency":110,"octaves":3.5}},"starter":false,"kind":"tone","level":0.12486103299853497,"peak":1.6380503489100666,"songOrigin":"user","songSourceId":"bassVoice"},"bass2Voice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"sine","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"shape":"fold","drive":0.36,"drivePlace":"post","bypassed":{"filter":{"type":"lowpass","slope":-12,"freq":465,"to":4000,"Q":0.7,"sweep":0.12}},"kind":"tone","level":0.08796517443573863,"peak":0.666854759557988,"songOrigin":"library","songSourceId":"bass2Voice"},"chords3Voice":{"label":"Shop Organ 2","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":6.92,"note":"The shop theme’s own: bright, percussive, short and dry — comping rather than holding, so it sits under the lead instead of over it.","additive":{"bars":[0,0,1,0.78,0.48,0.53,0.33,0.64,0.75],"attack":0.004,"decay":6.92,"echo":false,"perc":{"ratio":7,"gain":2,"attack":0.005,"decay":0.072},"type":"triangle","stretch":0,"pitch":{"semitones":-19},"damp":1.7},"starter":false,"trim":3,"fixedLength":1.103,"humanize":{"pitch":0.0011559128538236596},"chorus":{"mix":0.33},"kind":"tone","level":0.24587399878379823,"peak":2.153426109562159,"songOrigin":"library","songSourceId":"chords3Voice"},"ohatsVoice":{"label":"Open Hat · Dark Wash","category":"Hats","homeLane":"ohats","dur":4,"note":"A slower, darker open hat wash: resonant air closes down over a long tail for wide gaps and half-time grooves.","noise":{"type":"bandpass","freq":4335,"to":2500,"sweep":0.394,"Q":3.2,"decay":1.145,"gain":1,"hold":0.016,"color":"blue"},"drive":0.12,"starter":false,"kind":"drum","level":0.03495890722059069,"peak":0.41359498514950055,"songOrigin":"library","songSourceId":"ohatsVoice"},"hatsVoice":{"label":"Open Hat","category":"Hats","dur":2,"note":"The same band left to ring for a third of a second.","noise":{"type":"bandpass","freq":2800,"Q":0.7,"decay":0.135,"color":"violet","sag":0.29,"gain":1.33,"curve":"exp"},"starter":false,"trim":-2,"kind":"drum","level":0.012196738226774516,"peak":0.29363266520600845,"songOrigin":"library","songSourceId":"hatsVoice"},"chords4Voice":{"label":"Triangle Tone","category":"Lead","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator triangle replacement for the engine voice.","fixedLength":0.063,"waveform":"triangle","attack":0.01,"release":0.015,"trim":0,"id":"toneTriangle","kind":"tone","factory":true,"level":0.022763,"peak":0.6582}},
  lanes: {
    kick: { gain: 3.2 },
    snare: { gain: 2.4, send: { reverb: 0.561 }, eq: { low: 1.7, mid: 3.7 } },
    clap: { gain: -2.1, pan: 0.376, send: { reverb: 0.782 } },
    hats: { gain: -3.8, pan: -0.424 },
    ohats: { gain: -3.8, pan: -0.331 },
    lead: { gain: -3.8, send: { delay: 0.215, reverb: 0.007 }, eq: { low: -3.5 }, effects: [{ id: "doubler" }] },
    chords: { gain: -9, pan: -0.551, send: { delay: 0.045, reverb: 0.446 }, effects: [{ id: "vowel", bypass: true, params: { voice: "robotic", stack: "a e i o u", rateSync: 1, rateDivision: 0.25, frequency: 0.5, waveform: "square", depth: 1, glide: 0.09, articulation: 0.65, reso: 2.4, spread: 0.65, tilt: 0.05, intensity: 0.72, excite: 0.55, breath: 0.08, body: 0.38, air: 0.71, wet: 1 } }, { id: "tremolo", params: { rateSync: 1, rateDivision: 0.25, frequency: 8, depth: 1, spread: 180, wet: 1 } }, { id: "chandelay", params: { division: 0.333, sync: 1 } }, { id: "doubler" }] },
    twinkle: { pan: 0.182, send: { delay: 0.01, reverb: 0.936 } },
    leadHarm: { gain: -1.68, send: { reverb: 0.415 } },
    bass: { gain: 0.5, send: { reverb: 0.019 } },
    chords2: { gain: -11.8, pan: 0.446, send: { reverb: 0.37 }, eq: { high: 3.5 }, effects: [{ id: "pingpong" }, { id: "doubler" }] },
    bass2: { gain: -2.1 },
    chords3: { gain: -14.7, pan: 0.707, send: { delay: 0.045, reverb: 0.446 }, effects: [{ id: "vowel", bypass: true, params: { voice: "robotic", stack: "a e i o u", rateSync: 1, rateDivision: 0.25, frequency: 0.5, waveform: "square", depth: 1, glide: 0.04, articulation: 0.65, reso: 2.4, spread: 0.65, tilt: 0.05, intensity: 0.72, excite: 0.55, breath: 0.08, body: 0.38, air: 0.71, wet: 1 } }, { id: "chandelay", bypass: true, params: { division: 0.333 } }] },
    chords4: { gain: -14.9, pan: -0.325, send: { delay: 0.045, reverb: 0.446 }, effects: [{ id: "vowel", bypass: true, params: { voice: "robotic", stack: "a e i o u", rateSync: 1, rateDivision: 0.25, frequency: 0.5, waveform: "square", depth: 1, glide: 0.04, articulation: 0.65, reso: 2.4, spread: 0.65, tilt: 0.05, intensity: 0.72, excite: 0.55, breath: 0.08, body: 0.38, air: 0.71, wet: 1 } }, { id: "chandelay", params: { division: 0.75 } }, { id: "reverb", params: { decay: 5.5, preDelay: 0.04, low: -2, mid: 0, high: -2, width: 1.8, wet: 0.66 } }, { id: "gain", params: { gain: 16.5 } }, { id: "tremolo", params: { rateSync: 1, rateDivision: 0.5, frequency: 4, depth: 1, spread: 180, wet: 1 } }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"diverge","rate":1,"octaves":3,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":false,"gate":80,"retrigger":"bar","latch":false}} },
  },
};

export const arrangement = {
  order: [
    {
      s: 67,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 68,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 58,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 60,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 61,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 62,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 63,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 64,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 65,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 66,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 28,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 29,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 30,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 32,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 33,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 34,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 35,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 59,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 21,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 22,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 23,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 24,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 25,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 26,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 27,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 36,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 37,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 38,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 39,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 40,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 41,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 42,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 43,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 28,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 29,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 30,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 32,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 33,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 34,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 35,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 44,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 45,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 46,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 47,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 48,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 49,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 50,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 51,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 52,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 53,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 54,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 55,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 20,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 21,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 22,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 23,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 24,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 25,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 26,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 27,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 28,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 29,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 30,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 32,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 33,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 56,
      bars: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
    {
      s: 57,
      bars: 1,
      from: 1,
      noteFx: {
        chords2: {
          mode: "on",
          arp: {
            enabled: false,
          },
        },
      },
    },
  ],
  sections: [
    {
      base: 1,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('F5 F2 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 1,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | F5 G#4 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 2,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('F5 G#4 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#2 . . . . . G#2 . . . G#2 . G2 . D#2 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 2,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | F#5 G#4 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | G#2 . G#2 . . . G#2 . . . G#2 . G2 D2 D#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 3,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('F#5 G#4 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 3,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | F5 G#4 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 4,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('F5 G#4 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#2 . . . . . G#2 . . . G#2 . G2 . G2 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 4,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | F#5 G#4 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5 F#5 G#4 C5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | G#2 . G#2 . . . G#2 . . . G#2 . G2 . D#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . A#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | C2 . . . C2 . C#2 . . . C#2 . . . C#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 6,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . D#2 . | . . . . . . . . . . . . . . . .'),
      chords3: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 6,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . D#2 . . . D#2 . C#2 . . . C#2 . . .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 7,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . C2 . | . . . . . . . . . . . . . . . .'),
      chords3: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 7,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . C2 . . . C2 . C#2 . . . C#2 . . .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 8,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 8,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 9,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . A#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 9,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | C2 . . . C2 . C#2 . . . C#2 . . . C#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 10,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . D#2 . | . . . . . . . . . . . . . . . .'),
      chords3: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 10,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . D#2 . . . D#2 . C#2 . . . C#2 . . .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 11,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . C2 . | . . . . . . . . . . . . . . . .'),
      chords3: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[220,349.2282314330039,523.2511306011972,622.2539674441618],null,null,null,null,null,null,null,[233.08188075904496,349.2282314330039,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 11,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . C2 . . . C2 . C#2 . . . C#2 . . .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,[277.1826309768721,349.2282314330039,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 12,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 12,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 13,
      chords: [[103.82617439498628,369.9944227116344,415.3046975799451,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('G#2 F#4 F#4 G#4 C5 F#4 G#4 C5 G#2 G#2 F#4 G#4 C5 F#4 G#4 C5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#1 . . . . . . G#1 . . G#1 . . G#1 . . | . . . . . . . . . . . . . . . .'),
      chords3: [[103.82617439498628,369.9944227116344,415.3046975799451,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[103.82617439498628,369.9944227116344,415.3046975799451,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 13,
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,[415.3046975799451,554.3652619537442],null,null,[103.82617439498628,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,[2.227983,2.227983],null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | C#3 C#5 G#4 C#5 G#4 G#4 C#5 G#4 G#2 F5 G#4 C#5 F5 G#4 C#5 F5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . . . . . . . G#1 . . . . . . .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,[415.3046975799451,554.3652619537442],null,null,[103.82617439498628,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,[2.227983,2.227983],null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,[415.3046975799451,554.3652619537442],null,null,[103.82617439498628,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,[2.227983,2.227983],null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null],
    },
    {
      base: 14,
      chords: [[155.56349186104046,523.2511306011972,739.9888454232688],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[103.82617439498628,622.2539674441618],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('D#3 C5 G#4 C5 F#5 G#4 C5 F#5 G#2 D#5 G#4 D#5 F#5 G#4 D#5 F#5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D#2 . . D#2 . . D#2 . G#1 . . G#1 . . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[155.56349186104046,523.2511306011972,739.9888454232688],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[103.82617439498628,622.2539674441618],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[155.56349186104046,523.2511306011972,739.9888454232688],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,[103.82617439498628,622.2539674441618],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 14,
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | C#3 C#5 G#4 C#5 F5 G#4 C#5 F5 F3 F3 G#4 C#5 F5 G#4 C#5 F5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . . C#2 . . C#2 . F2 . . F2 . . F2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,[2.227983,2.227983,2.227983],null,null],
    },
    {
      base: 15,
      chords: [[103.82617439498628,369.9944227116344,415.3046975799451,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('G#2 F#4 F#4 G#4 C5 F#4 G#4 C5 G#2 G#2 F#4 G#4 C5 F#4 G#4 C5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#1 . . . . . . G#1 . . G#1 . . G#1 . . | . . . . . . . . . . . . . . . .'),
      chords3: [[103.82617439498628,369.9944227116344,415.3046975799451,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[103.82617439498628,369.9944227116344,415.3046975799451,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 15,
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[103.82617439498628,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | C#3 C#5 G#4 C#5 G#4 C#5 G#4 C#5 G#2 F5 G#4 C#5 F5 G#4 C#5 F5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . . . . . . . G#1 . . . . . . .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[103.82617439498628,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[103.82617439498628,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
    },
    {
      base: 16,
      chords: [[155.56349186104046,523.2511306011972,739.9888454232688],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,[103.82617439498628,622.2539674441618],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('D#3 C5 G#4 C5 F#5 G#4 C5 F#5 G#2 D#5 G#4 D#5 F#5 G#4 D#5 F#5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D#2 . . D#2 . . D#2 . G#1 . . G#1 . . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[155.56349186104046,523.2511306011972,739.9888454232688],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,[103.82617439498628,622.2539674441618],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[155.56349186104046,523.2511306011972,739.9888454232688],null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,[103.82617439498628,622.2539674441618],null,[415.3046975799451,622.2539674441618,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 16,
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | C#3 C#5 G#4 C#5 F5 G#4 C#5 F5 F3 F3 G#4 C#5 F5 G#4 C#5 F5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . . C#2 . . C#2 . F2 . . F2 . . F2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,[174.61411571650194],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
    },
    {
      base: 17,
      chords: [[103.82617439498628,369.9944227116344,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('G#2 F#4 F#4 G#4 C5 F#4 G#4 C5 G#2 G#2 F#4 G#4 C5 F#4 G#4 C5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#1 . . G#1 . . G#1 . G#1 . . G#1 . . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[103.82617439498628,369.9944227116344,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[103.82617439498628,369.9944227116344,523.2511306011972],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,[103.82617439498628],null,[369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 17,
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[123.47082531403103,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | C#3 C#5 G#4 C#5 G#4 C#5 G#4 C#5 B2 F5 G#4 C#5 F5 G#4 C#5 F5'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . . C#2 . . C#2 . B1 . . B1 . . B1 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[123.47082531403103,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,554.3652619537442],null,[415.3046975799451,554.3652619537442],null,null,null,null,null,[123.47082531403103,698.4564628660078],null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null],
    },
    {
      base: 18,
      chords: [[130.8127826502993,523.2511306011972],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,[65.40639132514966,391.99543598174927,659.2551138257398],null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('C3 C5 G#4 C5 F5 G#4 C5 F5 C2 G4 G4 C5 E5 G4 C5 E5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C2 . . C2 . . C2 . C1 . . C1 . . C1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[130.8127826502993,523.2511306011972],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,[65.40639132514966,391.99543598174927,659.2551138257398],null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[130.8127826502993,523.2511306011972],null,[415.3046975799451,523.2511306011972,698.4564628660078],null,null,null,null,null,[65.40639132514966,391.99543598174927,659.2551138257398],null,[391.99543598174927,523.2511306011972,659.2551138257398],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983,2.227983],null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 18,
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,349.2282314330039],null,[349.2282314330039,523.2511306011972],null,null,null,null,null,[87.30705785825097,174.61411571650194,698.4564628660078],null,null,null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      chords2: seq('. . . . . . . . . . . . . . . . | F3 F4 F4 C5 F4 C5 F4 C5 F2 F3 F5 F2 F3 F5 F2 F3'),
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      bass2: seq('. . . . . . . . . . . . . . . . | F1 . . F1 . . F1 . F1 . . F1 . . F1 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,349.2282314330039],null,[349.2282314330039,523.2511306011972],null,null,null,null,null,[87.30705785825097,174.61411571650194,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[174.61411571650194,349.2282314330039],null,[349.2282314330039,523.2511306011972],null,null,null,null,null,[87.30705785825097,174.61411571650194,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983],null,[2.227983,2.227983],null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 19,
      chordsLen: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [[184.9972113558172,369.9944227116344,466.1637615180899,622.2539674441618],null,null,null,null,null,null,null,[207.65234878997256,349.2282314330039,415.3046975799451,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 19,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,369.9944227116344,415.3046975799451,523.2511306011972],null,null,null,null,null,null,null,[138.59131548843604,415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null,[2.227983,2.227983,2.227983,2.227983],null,null,null,null,null,null,null],
    },
    {
      base: 1,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 1,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: seq('C#3 G#4 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 F5 G#4 C#5 | . . . . . . . . . . . . . . . .'),
      chords2Len: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 1,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 2,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#2 . . . . . G#2 . . . G#2 . G2 . D#2 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 2,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | G#2 . G#2 . . . G#2 . . . G#2 . G2 D2 D#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 3,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 3,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,554.3652619537442,698.4564628660078],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 4,
      chordsLen: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G#2 . . . . . G#2 . . . G#2 . G2 . G2 . | . . . . . . . . . . . . . . . .'),
      chords3: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords4: [null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 4,
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | G#2 . G#2 . . . G#2 . . . G#2 . G2 . D#2 .'),
      chords3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      chords4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[415.3046975799451,523.2511306011972,739.9888454232688],null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2.227983,2.227983,2.227983],null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 0,
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      ohats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1').map((v) => !!v),
    },
  ],
  bpm: 130,
  choke: {
    hats: "ohats",
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
