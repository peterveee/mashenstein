// S*N*C SPECIAL STAGE — one song: what it plays, how it is arranged, how it sounds.
//
// A copy of SPECIAL-STAGE (1) (special-stage-1), taken from the Song Mixer.
// Everything below is that song as the desk had it at the moment of the copy.
// It is a snapshot and nothing more: the game does not play this file, no
// cabinet can select it, and SPECIAL-STAGE (1) is untouched by anything done here.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "s-n-c-special-stage";
export const title = "S*N*C SPECIAL STAGE";
export const slug = "s-n-c-special-stage";
export const group = "copy";

export const bank = {
  bpm: 150,
  musicTrim: 0.7,
  sections: [
    {
      lead2: seq('E5 E5 . . G#5 E5 . G#5 B5 B5 . . A5 A5 . . | G#5 . . . . . F#5 F#5 E5 E5 . . D#5 . . .'),
      lead2Len: [1,1,null,null,1,2,null,1,1,1,null,null,1,1,null,null,6,null,null,null,null,null,1,1,1,1,null,null,18,null,null,null],
      lead3: seq('E4 E4 . . G#4 E4 . G#4 B4 B4 . . A4 A4 . . | G#4 . . . . . F#4 F#4 E4 E4 . . D#4 . . .'),
      lead3Len: [1,1,null,null,1,2,null,1,1,1,null,null,1,1,null,null,6,null,null,null,null,null,1,1,1,1,null,null,18,null,null,null],
      chords2: [[329.6275569128699,659.2551138257398],[329.6275569128699,659.2551138257398],null,null,[415.3046975799451,830.6093951598903],[329.6275569128699,659.2551138257398],null,[415.3046975799451,830.6093951598903],[493.8833012561241,987.7666025122483],[493.8833012561241,987.7666025122483],null,null,[440,880],[440,880],null,null,[415.3046975799451,830.6093951598903],null,null,null,null,null,[369.9944227116344,739.9888454232688],[369.9944227116344,739.9888454232688],[329.6275569128699,659.2551138257398],[329.6275569128699,659.2551138257398],null,null,[311.1269837220809,622.2539674441618],null,null,null],
      chords2Len: [[1,1],[1,1],null,null,[1,1],[2,2],null,[1,1],[1,1],[1,1],null,null,[1,1],[1,1],null,null,[6,6],null,null,null,null,null,[1,1],[1,1],[1,1],[1,1],null,null,[18,18],null,null,null],
      organChords: [[329.6275569128699],[329.6275569128699],null,null,[415.3046975799451],[329.6275569128699],null,[415.3046975799451],[493.8833012561241],[493.8833012561241],null,null,[440],[440],null,null,[415.3046975799451],null,null,null,null,null,[369.9944227116344],[369.9944227116344],[329.6275569128699],[329.6275569128699],null,null,[311.1269837220809],null,null,null],
      organChordsLen: [[1],[1],null,null,[1],[2],null,[1],[1],[1],null,null,[1],[1],null,null,[6],null,null,null,null,null,[1],[1],[1],[1],null,null,[18],null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . . . . . . . . . . . . . . . | G#4 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G#5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | E5 . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . . . . . . . . . . . . . . . | G4 . . G#4 . . A4 . A#4 . . B4 . . C5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G4 . . G#4 . . A4 . A#4 . . B4 . . C5 .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | D#4 . . E4 . . F4 . F#4 . . G4 . . G#4 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 . | C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('B4 . . C5 . . C#5 . C5 . . C#5 . . D5 . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      leadLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead4: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead5: seq('. . . . . . . . . . . . . . . . | . . E5 . . . G#5 . B5 . . . A5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null],
      leadHarm: seq('B4 . . C5 . . C#5 . C5 . . C#5 . . D5 . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('G4 . . G#4 . . A4 . G#4 . . A4 . . A#4 . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . C1 | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . C1 . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 . | C1 . . C1 C1 C1 C1 C1 . C1 C1 . C1 C1 . C1').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D5 . . . . . . . . . . . . . . .'),
      lead4Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('G#5 . . . F#5 . . . E5 . . . G#5 . F#5 . | E5 . D5 . . . . . . . . . . . . .'),
      lead5Len: [4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G#4 . . G#4 . . G#4 . F#4 . . G#4 . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | E4 . . E4 . . E4 . D4 . . E4 . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 . C1 C1 . C1 C1 . C1 | C1 . C1 . C1 . C1 . C1 . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead4: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead5: seq('. . . . . . . . . . . . . . . . | . . E5 . . . G#5 . B5 . . . A5 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null],
      leadHarm: seq('G#4 . . G#4 . . G#4 . F#4 . . G#4 . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('E4 . . E4 . . E4 . D4 . . E4 . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . C1 . . . . . C1 . C1 . . . C1 C1 | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 . C1 . C1 . C1 . . . C1 . C1 . | C1 . . C1 C1 C1 C1 C1 . C1 C1 . C1 C1 . C1').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D6 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D6 . . . . . . . . . . . . . . .'),
      lead4Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('G#5 . . . F#5 . . . E5 . . . G#5 . F#5 . | E5 . D6 . . . . . . . . . . . . .'),
      lead5Len: [4,null,null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G#4 . . . . . G#4 . G#4 . . . . . G#4 .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | E4 . . . . . E4 . E4 . . . . . E4 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 . C1 C1 . C1 C1 . C1 | C1 . C1 . C1 . C1 . C1 . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead4: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead5: seq('. . . . . . . . . . . . . . . . | G#5 . . . B5 . D#6 . . . C#6 . . . B5 .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      leadHarm: seq('G#4 . . . . . G#4 . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [1,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('E4 . . . . . E4 . E4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . C1 . . . . . C1 . C1 . . . C1 C1 | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 . C1 . C1 . C1 . . . C1 . C1 . | C1 . . C1 C1 C1 C1 C1 . C1 C1 . C1 C1 . C1').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D5 . . . . . . . . . . . . . . .'),
      lead4Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . A5 . . . G#5 . . . B5 . A5 . G#5 . | F#5 . . . . . . . . . . . . . . .'),
      lead5Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G#4 . . G#4 . . G#4 . F#4 . . G#4 . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | E4 . . E4 . . E4 . D4 . . E4 . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 . C1 C1 . C1 C1 . C1 | C1 . C1 . C1 . C1 . C1 . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead4: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead5: seq('. . . . . . . . . . . . . . . . | G#5 . . . B5 . D#6 . . . C#6 . . . B5 .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      leadHarm: seq('G#4 . . G#4 . . G#4 . F#4 . . G#4 . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('E4 . . E4 . . E4 . D4 . . E4 . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,null,1,null,null,1,null,3,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . C1 . . . . . C1 . C1 . . . C1 C1 | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 . C1 . C1 . C1 . . . C1 . C1 . | C1 . . C1 C1 C1 C1 C1 . C1 C1 . C1 C1 . C1').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D6 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D6 . . . . . . . . . . . . . . .'),
      lead4Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . A5 . . . G#5 . . . B5 . A5 . G#5 . | G6 . . . . . . . . . . . . . . .'),
      lead5Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G#4 . . . . . G#4 . G#4 . . . . . G#4 .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | E4 . . . . . E4 . E4 . . . . . E4 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 . C1 C1 . C1 C1 . C1 C1 . C1 | C1 . C1 . C1 . C1 . C1 . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('. . . . . . . . . . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      leadHarm: seq('G#4 . . . . . G#4 . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      leadHarmLen: [1,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      twinkle: seq('E4 . . . . . E4 . E4 . . . . . . . | G#4 . G#4 . A4 G#4 . . B4 . . . B4 . . .'),
      twinkleLen: [1,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . C1 . . . . . C1 . C1 . . . C1 C1 | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 . C1 . C1 . C1 . . . C1 . C1 . | C1 . . C1 C1 . . C1 . C1 C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      leadLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      leadHarm: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      leadHarmLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      twinkle: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | G#4 . G#4 . A4 G#4 . . B4 . B4 . A4 B4 . .'),
      twinkleLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . C1 C1 . . C1 . C1 C1 . C1 . C1 . | C1 . . C1 C1 . . C1 . C1 C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      leadLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      lead4: seq('. . . . . . . . . . . . . . . . | B5 . B5 . C#6 B5 . . E6 . . . E6 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      lead5: seq('. . . . . . . . . . . . . . . . | G#4 . G#4 . A4 G#4 . . B4 . . . B4 . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      leadHarm: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      leadHarmLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      twinkle: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | G#4 . G#4 . A4 G#4 . . B4 . . . B4 . . .'),
      twinkleLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . C1 C1 . . C1 . C1 C1 . C1 . C1 . | C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      leadLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      lead4: seq('B5 . B5 . C#6 B5 . . G#5 . . . . . . . | B5 . B5 . C#6 B5 . . E6 . E6 . C#6 E6 . .'),
      lead4Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      lead5: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | G#4 . G#4 . A4 G#4 . . B4 . B4 . A4 B4 . .'),
      lead5Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      leadHarm: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      leadHarmLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      twinkle: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | G#4 . G#4 . A4 G#4 . . B4 . B4 . A4 B4 . .'),
      twinkleLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 . | C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | E2 E3 G#1 . A1 . A#1 . G2 G3 C#2 . D2 . D#2 .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null],
      lead: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      leadLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead4: seq('B5 . B5 . C#6 B5 . . G#5 . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead4Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      lead5: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | . . E5 . . . G#5 . B5 . . . A5 . . .'),
      lead5Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null],
      leadHarm: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 . | C1 . . C1 C1 C1 C1 C1 . C1 C1 . C1 C1 . C1').map((v) => !!v),
    },
    {
      bass: seq('E2 E3 G#1 . A1 . A#1 . B1 B2 C#2 . D2 . D#2 . | . . . . . . . . . . . . . . . .'),
      bassLen: [1,1,2,null,2,null,2,null,1,1,2,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('B5 . B5 . C#6 B5 . . G#5 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('G#4 . G#4 . A4 G#4 . . E4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . C1 . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 C1 C1 C1 . C1 . C1 C1 C1 C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,4,5,6,7,8,9,10,11,12,13,14,15,4,5,6,7,8,9,10,11,12,13,14,15,4,5,6,7,8,9,10,11,12,13,14,15,4,5,6,7,8,9,10,11,12,13,14,16],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbComp" }],
  layers: [{ key: "lead6", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "clap2", from: "clap", independent: true }, { key: "chords2", from: "chords", independent: true }],
  voice: {"leadVoice":"glassLead","bassVoice":"roundBass","kickVoice":"fatKick","snareVoice":"dsSnareCrack","hatsVoice":"ds808OpenHat","twinkleVoice":"tpBrassCircuit","leadHarmVoice":"layerBrassStack","lead6Voice":"layerLeadBright","lead4Voice":"tpMarimba","lead5Voice":"tpKalimba","clap2Voice":"dsClap","chords2Voice":"tngrElectricKeys"},
  voiceParams: {"twinkleVoice":{"label":"Brass Circuit","category":"Orch","synth":"MonoSynth","dur":1.6,"note":"A slow filter swell over a saw — the horn-section lean, done with an envelope.","origin":"Tonejs/Presets MonoSynth/BrassCircuit","options":{"portamento":0.01,"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.005,"decay":0.1,"sustain":0.6,"release":0.5},"filterEnvelope":{"attack":0.011,"decay":0.8,"sustain":0.54,"release":1.5,"baseFrequency":2000,"octaves":1.5}},"starter":false,"kind":"tone","level":0.06037193545132352,"peak":1.0703261313811745,"songOrigin":"library","songSourceId":"twinkleVoice"},"leadHarmVoice":{"label":"Layer Brass Stack","category":"Orch","synth":"MRDR-3","dur":2.4,"note":"Three saws with no filters of their own, arriving at one shared lowpass that opens across the note — the stack reads as one horn section rather than three oscillators. A two-semitone blip gives it its attack.","layer":{"osc1":{"type":"sawtooth","ratio":1,"gain":0.46,"attack":0.002,"decay":0.5,"sustain":0.8,"release":0.12,"unison":2,"spread":11,"pitch":{"semitones":2,"decay":0.04}},"osc2":{"type":"sawtooth","ratio":2,"gain":0.2,"len":0.9,"attack":0.003,"decay":0.5,"sustain":0.7,"release":0.1},"osc3":{"type":"square","ratio":0.5,"gain":0.19,"attack":0.002,"decay":0.6,"sustain":0.75,"release":0.12}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":420,"Q":1.1,"track":0.35,"env":{"octaves":3.4,"attack":0.03,"decay":0.45,"sustain":0.3,"release":0.12}},"vca":{"attack":0.002,"decay":0.4,"sustain":0.78,"release":0.14}},"tone":{"freq":9500},"starter":false,"kind":"tone","level":0.0690063750029856,"peak":0.7924628164327042,"songOrigin":"library","songSourceId":"leadHarmVoice"},"snareVoice":{"label":"DS Crack Snare","category":"Snare","dur":1,"note":"Tight and driven: a short square knock, highpassed air, everything over in a tenth of a second. The backbeat for fast songs.","osc":{"type":"square","from":255,"to":200,"sweep":0.025,"decay":0.05,"curve":"exp","gain":0.55},"noise":{"type":"highpass","freq":2430,"Q":0.8,"decay":0.343,"gain":1,"sag":0.44,"color":"pink"},"drive":0.35,"starter":false,"kind":"drum","level":0.06969038605811591,"peak":0.7,"songOrigin":"library","songSourceId":"snareVoice"},"lead6Voice":{"label":"Bright Lead","category":"Lead","synth":"MRDR-3","dur":1.2,"note":"The bright-octave lead as layers: the lane’s square with a quiet octave sine on top, adding air without changing the character underneath.","layer":{"osc1":{"type":"pulse","ratio":1,"gain":1,"attack":0.01,"decay":5.659,"pwm":{"depth":0.49},"sustain":0.63,"release":1.254},"osc2":{"type":"square","ratio":0.5,"gain":0.12,"len":0.68,"attack":0.004,"decay":0.816}},"starter":false,"transpose":-12,"mode":"poly","vibrato":{"depth":0.26,"delay":0.553},"fine":12,"kind":"tone","level":0.09744376333727257,"peak":1.0170874612381224,"songOrigin":"library","songSourceId":"lead6Voice"},"clap2Voice":{"label":"DS Clap","category":"Clap","dur":1,"note":"Four bursts through a band that slides DOWN as it decays — the room going dull after the hit, which is what the filter sweep is for.","noise":{"type":"bandpass","freq":1550,"to":1050,"sweep":0.12,"Q":1.3,"decay":0.326,"gain":1},"taps":[0,0.016,0.0335,0.053],"tapFalloff":0.8,"starter":false,"kind":"drum","level":0.015678891549288195,"peak":0.2568931840138811,"songOrigin":"library","songSourceId":"clap2Voice"},"bassVoice":{"label":"Round Bass","category":"Bass","synth":"MonoSynth","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.001,"decay":1.24,"sustain":0.29,"release":0.8},"filter":{"type":"lowpass","Q":2.9,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":1.22,"sustain":0.13,"release":0.3,"baseFrequency":110,"octaves":3.9}},"starter":false,"id":"roundBass","kind":"tone","user":true,"level":0.075557,"peak":1.183},"kickVoice":{"label":"Fat Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"triangle","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.42,"curve":"exp","gain":1},"knock":1,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"starter":false,"id":"fatKick","kind":"drum","user":true,"level":0.035113,"peak":0.9364},"hatsVoice":{"label":"=808 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open 808-style cymbal partner: the same inharmonic cluster left ringing with a lower filter so its body is audible as it fades.","metal":{"freq":540,"spread":1,"count":6,"hp":6100,"Q":0.9,"slope":-24,"decay":0.42},"humanize":{"gain":0.04},"id":"ds808OpenHat","kind":"drum","factory":true,"level":0.056353,"peak":1.0138},"lead4Voice":{"label":"Synth Marimba","category":"Bells","synth":"Synth","dur":2,"note":"Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.","origin":"Tonejs/Presets Synth/Marimba","options":{"oscillator":{"partials":[1,0,2,0,3]},"envelope":{"attack":0.001,"decay":1.2,"sustain":0,"release":1.2}},"id":"tpMarimba","kind":"tone","factory":true,"level":0.056977,"peak":0.6906},"lead5Voice":{"label":"Kalimba","category":"Bells","synth":"FMSynth","dur":2.4,"note":"Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.","origin":"Tonejs/Presets FMSynth/Kalimba","options":{"harmonicity":8,"modulationIndex":2,"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":2,"sustain":0.1,"release":2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.002,"decay":0.2,"sustain":0,"release":0.2}},"id":"tpKalimba","kind":"tone","factory":true,"level":0.028046,"peak":0.2195},"chords2Voice":{"label":"Electric Keys","category":"Keys","synth":"TNGR-2","dur":3,"note":"A conventional soft electric keyboard with a gentle tine at the front.","tngr2":{"oscA":{"table":"basic","position":0.08,"envAmount":0.27,"level":0.82,"unison":1,"lfoAmount":0},"oscB":{"table":"bellFold","position":0.28,"level":0.08,"unison":1,"interval":12},"amp":{"attack":0.005,"decay":1.15,"sustain":0.32,"release":0.007},"filter":{"type":"lowpass","cutoff":2945,"resonance":0.96},"positionEnv":{"attack":0,"decay":0.85,"sustain":0.08},"master":{"gain":0.62}},"starter":false,"transpose":12,"chorus":{"mix":0.21},"kind":"tone","level":0.009868,"peak":0.0492,"songOrigin":"library","songSourceId":"chords2Voice"},"leadVoice":{"label":"Glass","category":"Lead","synth":"FMSynth","dur":1.2,"note":"High harmonicity, short modulation — thin and clear, sits over a dense mix.","options":{"harmonicity":5,"modulationIndex":3,"oscillator":{"type":"sine"},"modulation":{"type":"sine"},"envelope":{"attack":0.004,"decay":0.2,"sustain":0.5,"release":0.3},"modulationEnvelope":{"attack":0.002,"decay":0.15,"sustain":0.1,"release":0.2}},"id":"glassLead","kind":"tone","factory":true,"level":0.020582,"peak":0.2129}},
  lanes: {
    lead: { gain: 0.912, pan: -0.11, send: { delay: 0.017, reverb: 0.205 }, effects: [{ id: "vibrato" }, { id: "chorus2" }] },
    snare: { gain: 4.176, send: { reverb: 0.222 }, eq: { mid: 0.8 } },
    hats: { gain: 1.728, pan: -0.171, send: { reverb: 0.011 } },
    chords: { gain: -7.6, send: { delay: 0.121, reverb: 0.051 }, eq: { high: 6.1 } },
    twinkle: { gain: 5.136, pan: 0.209, send: { delay: 0.045, reverb: 2.153 } },
    leadHarm: { gain: 2.784, pan: -0.279, send: { delay: 0.083, reverb: 1.322 } },
    lead6: { gain: -5.84, pan: 0.182, send: { delay: 0.023, reverb: 0.179 } },
    kick: { eq: { low: 4.6 } },
    lead4: { gain: 0.336, pan: -0.336, send: { reverb: 0.205 }, eq: { high: 4.9 } },
    lead5: { gain: -4.24, pan: 0.294, send: { reverb: 0.325 }, eq: { high: 9.1 } },
    clap2: { gain: -2.16, send: { reverb: 1.012 }, eq: { high: 5.9 }, effects: [{ id: "autopanner", params: { rateDivision: 16, depth: 0.73 } }] },
    chords2: { gain: -10.4, send: { delay: 0.121, reverb: 0.051 }, eq: { high: 7.1 }, effects: [{ id: "autopanner", params: { rateDivision: 32 } }] },
  },
};

export const arrangement = {
  order: [
    {
      s: 17,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 18,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 19,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 20,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 21,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 22,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 23,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 24,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 25,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 26,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 27,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 28,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 29,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 30,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 31,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 20,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 21,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 22,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 23,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 24,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 25,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 26,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 27,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 33,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 34,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 35,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 36,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 37,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 38,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 39,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 40,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 20,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 21,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 22,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 23,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 24,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 25,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 26,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 27,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 28,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 29,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 30,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 31,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 20,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 21,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 22,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 23,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 24,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 25,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 26,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 27,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 33,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 34,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 35,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 36,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 37,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 38,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 39,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 40,
      bars: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 20,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 21,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 22,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 23,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 24,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 25,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 26,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 27,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 28,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 29,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 30,
      transpose: {
        lead: 12,
      },
    },
    {
      s: 32,
      transpose: {
        lead: 12,
      },
    },
  ],
  sections: [
    {
      base: 1,
      lead6: seq('. . . . . . . . . . . . . . . . | G#4 . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 2,
      lead6: seq('. . . . . . . . . . . . . . . . | G4 . . G#4 . . A4 . A#4 . . B4 . . C5 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 3,
      lead6: seq('B4 . . C5 . . C#5 . C5 . . C#5 . . D5 . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead6Len: [3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 4,
      lead6: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D5 . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 5,
      lead6: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 6,
      lead6: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D6 . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 7,
      lead6: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 8,
      lead6: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D5 . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 9,
      lead6: seq('. . . . . . . . . . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 10,
      lead6: seq('. . F#5 . . . E5 . . . G#5 . F#5 . E5 . | D6 . . . . . . . . . . . . . . .'),
      lead6Len: [null,null,4,null,null,null,4,null,null,null,2,null,2,null,2,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 11,
      lead6: seq('. . . . . . . . . . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 12,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 13,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 14,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 15,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | E5 . . . G#5 . B5 . . . A5 . . . G#5 .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,4,null,null,null,2,null,4,null,null,null,4,null,null,null,4,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 16,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 11,
      lead6: seq('. . . . . . . . . . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      clap2: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 12,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 12,
      lead6: seq('. . . . . . . . . . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      clap2: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 13,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 13,
      lead6: seq('. . . . . . . . . . . . . . . . | B4 . B4 . C#5 B4 . . E5 . . . E5 . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,2,null,null,null,2,null,null,null],
      clap2: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 14,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 14,
      lead6: seq('. . . . . . . . . . . . . . . . | B4 . B4 . C#5 B4 . . E5 . E5 . C#5 E5 . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,3,null,null,1,null,1,null,1,3,null,null],
      clap2: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null],
    },
    {
      base: 15,
      lead6: seq('B4 . B4 . C#5 B4 . . G#4 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead6Len: [1,null,1,null,1,3,null,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords2: [[830.6093951598903],null,[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],[830.6093951598903],null,[830.6093951598903],[659.2551138257398],null,[739.9888454232688],null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2Len: [[2],null,[2],null,[2],null,[1],[2],null,[1],[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
