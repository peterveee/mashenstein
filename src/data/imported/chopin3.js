// CHOPIN3 — imported from CHOPIN3.MID by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
import { seq, n } from '../../engine/notes.js';

export const CHOPIN3 = {
  bpm: 210,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      bass: seq('A2 . . . . . . . . . . . A2 . . . | . . . . . . . . A2 . . . . . . .'),
      leadHarm: seq('E3 . . . . . . . . . . . E3 . . . | . . . . . . . . E3 . . . . . . .'),
      twinkle: seq('A3 . . . . . . . . . . . A3 . . . | . . . . . . . . A3 . . . . . . .'),
      chords: [null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('C#4'), n('E3')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null],
    },
    // section 1
    {
      bass: seq('. . . . B1 . . . B1 . . . E2 . . . | A2 . . . . . . . . . . . A2 . . .'),
      leadHarm: seq('. . . . F#2 . . . F#2 . . . B2 . . . | E3 . . . . . . . . . . . E3 . . .'),
      twinkle: seq('. . . . B2 . . . B2 . . . E3 . . . | A3 . . . . . . . . . . . A3 . . .'),
      chords: [[n('E3'), n('C#4')], null, null, null, [n('F#3'), n('A3'), n('B3'), n('D4')], null, null, null, [n('A3'), n('D4'), n('F#3'), n('B3')], null, null, null, [n('B3'), n('E4'), n('G#3')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('C#4'), n('E3')], null, null, null, null, null, null, null],
    },
    // section 2
    {
      bass: seq('. . . . . . . . A2 . . . . . . . | . . . . B1 . . . B1 . . . E2 . . .'),
      leadHarm: seq('. . . . . . . . E3 . . . . . . . | . . . . F#2 . . . F#2 . . . B2 . . .'),
      twinkle: seq('. . . . . . . . A3 . . . . . . . | . . . . B2 . . . B2 . . . E3 . . .'),
      chords: [[n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, [n('F#3'), n('A3'), n('B3'), n('D4')], null, null, null, [n('A3'), n('D4'), n('F#3'), n('B3')], null, null, null, [n('B3'), n('E4'), n('G#3')], null, null, null],
    },
    // section 3
    {
      bass: seq('E2 . . . . . . . . . . . E2 . . . | . . . . . . . . E2 . . . . . . .'),
      leadHarm: seq('B2 . . . . . . . . . . . B2 . . . | . . . . . . . . B2 . . . . . . .'),
      twinkle: seq('E3 . . . . . . . . . . . E3 . . . | . . . . . . . . E3 . . . . . . .'),
      chords: [null, null, null, null, [n('D3'), n('B3')], null, null, null, [n('F#3'), n('A3'), n('D4')], null, null, null, null, null, null, null, [n('D3'), n('B3')], null, null, null, [n('A3'), n('F#3'), n('D4')], null, null, null, null, null, null, null, [n('B2'), n('G#3')], null, null, null],
    },
    // section 4
    {
      bass: seq('. . . . E2 . . . . . . . . . . . | E2 . . . . . . . . . . . E2 . . .'),
      leadHarm: seq('. . . . B2 . . . . . . . . . . . | B2 . . . . . . . . . . . B2 . . .'),
      twinkle: seq('. . . . E3 . . . . . . . . . . . | E3 . . . . . . . . . . . E3 . . .'),
      chords: [[n('E3'), n('B3')], null, null, null, null, null, null, null, [n('B2'), n('G#3')], null, null, null, [n('E3'), n('B3')], null, null, null, null, null, null, null, [n('D3'), n('B3')], null, null, null, [n('F#3'), n('A3'), n('D4')], null, null, null, null, null, null, null],
    },
    // section 5
    {
      bass: seq('. . . . . . . . E2 . . . . . . . | . . . . E2 . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . B2 . . . . . . . | . . . . B2 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . E3 . . . . . . . | . . . . E3 . . . . . . . . . . .'),
      chords: [[n('D3'), n('B3')], null, null, null, [n('A3'), n('F#3'), n('D4')], null, null, null, null, null, null, null, [n('B2'), n('G#3')], null, null, null, [n('E3'), n('B3')], null, null, null, null, null, null, null, [n('B2'), n('G#3')], null, null, null, [n('E3'), n('B3')], null, null, null],
    },
    // section 6
    {
      bass: seq('B1 . . . . . . . . . . . B1 . . . | B1 . . . D2 . . . A2 . . . . . . .'),
      lead: seq('F#4 . . . B4 . C#5 . D5 . . . F#4 . . . | F#4 . . . F5 . . . . . . . . . . .'),
      leadHarm: seq('F#2 . . . . . . . . . . . F#2 . . . | F#2 . . . A2 . . . E3 . . . . . . .'),
      twinkle: seq('B2 . . . . . . . . . . . B2 . . . | B2 . . . D3 . . . A3 . . . . . . .'),
      chords: [[n('F#4')], null, null, null, [n('B2'), n('F#3'), n('B4')], null, [n('C#5')], null, [n('B3'), n('D3'), n('B4'), n('D5')], null, null, null, [n('B3'), n('F#3'), n('A3'), n('D4'), n('D5'), n('F#4')], null, null, null, [n('F#3'), n('A3'), n('B3'), n('D4'), n('D5'), n('F#4')], null, null, null, [n('A3'), n('B3'), n('D4'), n('F4'), n('A4'), n('F5')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null],
    },
    // section 7
    {
      bass: seq('. . . . A2 . . . . . . . . . . . | F#2 . . . . . . . . . . . B1 . . .'),
      leadHarm: seq('. . . . E3 . . . . . . . . . . . | C#3 . . . . . . . . . . . F#2 . . .'),
      twinkle: seq('. . . . A3 . . . . . . . . . . . | F#3 . . . . . . . . . . . B2 . . .'),
      chords: [[n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('F#3'), n('C#4'), n('E3')], null, null, null, null, null, null, null],
    },
    // section 8
    {
      bass: seq('. . . . . . . . E2 . . . . . . . | . . . . B1 . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . B2 . . . . . . . | . . . . F#2 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . E3 . . . . . . . | . . . . B2 . . . . . . . . . . .'),
      chords: [[n('D#3'), n('A3')], null, null, null, [n('F#3'), n('D#4'), n('C#4')], null, null, null, null, null, null, null, [n('D3'), n('B3')], null, null, null, [n('F#3'), n('A3'), n('D4')], null, null, null, null, null, null, null, [n('F#3'), n('B2')], null, null, null, [n('B3'), n('D3'), n('A3')], null, null, null],
      kick: seq('. . . . . . . . C1 . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 9
    {
      bass: seq('D2 . . . . . . . . . . . D2 . . . | . . . . . . . . A2 . . . . . . .'),
      leadHarm: seq('A2 . . . . . . . . . . . A2 . . . | . . . . . . . . E3 . . . . . . .'),
      twinkle: seq('D3 . . . . . . . . . . . D3 . . . | . . . . . . . . A3 . . . . . . .'),
      chords: [null, null, null, null, [n('F3'), n('A3')], null, null, null, [n('D3'), n('B2'), n('A3')], null, null, null, null, null, null, null, [n('A3'), n('F3')], null, null, null, [n('A3'), n('D3'), n('B2')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null],
      kick: seq('C1 . . . . . . . . . . . C1 . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . C1 . . . C1 . . . . . . . | C1 . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 10
    {
      bass: seq('. . . . A2 . . . . . . . . . . . | F#2 . . . . . . . . . . . B1 . . .'),
      leadHarm: seq('. . . . E3 . . . . . . . . . . . | C#3 . . . . . . . . . . . F#2 . . .'),
      twinkle: seq('. . . . A3 . . . . . . . . . . . | F#3 . . . . . . . . . . . B2 . . .'),
      chords: [[n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('A3'), n('C#3')], null, null, null, [n('E3'), n('F#3'), n('C#4')], null, null, null, null, null, null, null],
      kick: seq('. . . . C1 . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('C1 . . . . . . . C1 . . . C1 . . . | . . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
    },
    // section 11
    {
      bass: seq('. . . . . . . . E2 . . . . . . . | . . . . B1 . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . B2 . . . . . . . | . . . . F#2 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . E3 . . . . . . . | . . . . B2 . . . . . . . . . . .'),
      chords: [[n('D#3'), n('A3')], null, null, null, [n('D#4'), n('F#3'), n('C#4')], null, null, null, null, null, null, null, [n('D3'), n('B3')], null, null, null, [n('F#3'), n('A3'), n('D4')], null, null, null, null, null, null, null, [n('B2'), n('F#3')], null, null, null, [n('B3'), n('D3'), n('A3')], null, null, null],
    },
    // section 12
    {
      bass: seq('D2 . . . . . . . . . . . D2 . . . | . . . . . . . . A2 . . . . . . .'),
      leadHarm: seq('A2 . . . . . . . . . . . A2 . . . | . . . . . . . . E3 . . . . . . .'),
      twinkle: seq('D3 . . . . . . . . . . . D3 . . . | . . . . . . . . A3 . . . . . . .'),
      chords: [null, null, null, null, [n('A3'), n('F3')], null, null, null, [n('D3'), n('B2'), n('A3')], null, null, null, null, null, null, null, [n('A3'), n('F3')], null, null, null, [n('A3'), n('B2'), n('D3')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null],
    },
    // section 13
    {
      bass: seq('. . . . A2 . . . . . . . . . . . | A2 . . . . . . . . . . . B1 . . .'),
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . F#4 . . .'),
      leadHarm: seq('. . . . E3 . . . . . . . . . . . | E3 . . . . . . . . . . . F#2 . . .'),
      twinkle: seq('. . . . A3 . . . . . . . . . . . | A3 . . . . . . . . . . . B2 . . .'),
      chords: [[n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('C#4'), n('E3')], null, null, null, [n('A3'), n('F#3'), n('B3'), n('D4'), n('D5'), n('F#4')], null, null, null],
    },
    // section 14
    {
      bass: seq('B1 . . . D2 . . . A2 . . . . . . . | . . . . A2 . . . . . . . . . . .'),
      lead: seq('F#4 . . . F5 . . . A5 . C#5 . E5 . C#5 . | A4 . A4 . F#5 . D#5 . E5 . C5 . C#5 . F#4 .'),
      leadHarm: seq('F#2 . . . A2 . . . E3 . . . . . . . | . . . . E3 . . . . . . . . . . .'),
      twinkle: seq('B2 . . . D3 . . . A3 . . . . . . . | . . . . A3 . . . . . . . . . . .'),
      chords: [[n('F#3'), n('D4'), n('B3'), n('A3'), n('D5'), n('F#4')], null, null, null, [n('D4'), n('A3'), n('F4'), n('B3'), n('A4'), n('F5')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null],
    },
    // section 15
    {
      bass: seq('F#2 . . . . . . . . . . . B1 . . . | . . . . . . . . E2 . . . . . . .'),
      lead: seq('C#4 . A4 . F#4 . C#5 . A4 . F#5 . D#6 . A5 . | F#6 . D#6 . A5 . A4 . D4 . B4 . A4 . D5 .'),
      leadHarm: seq('C#3 . . . . . . . . . . . F#2 . . . | . . . . . . . . B2 . . . . . . .'),
      twinkle: seq('F#3 . . . . . . . . . . . B2 . . . | . . . . . . . . E3 . . . . . . .'),
      chords: [null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('F#3'), n('C#4'), n('E3')], null, null, null, null, null, null, null, [n('D#3'), n('A3')], null, null, null, [n('F#3'), n('D#4'), n('C#4')], null, null, null, null, null, null, null, [n('D3'), n('B3')], null, null, null],
      kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 16
    {
      bass: seq('. . . . B1 . . . . . . . . . . . | D2 . . . . . . . . . . . D2 . . .'),
      lead: seq('B4 . C#5 . D5 . D5 . D5 . D5 . D5 . A4 . | D5 . F4 . A4 . F4 . D4 . D4 . A3 . F4 .'),
      leadHarm: seq('. . . . F#2 . . . . . . . . . . . | A2 . . . . . . . . . . . A2 . . .'),
      twinkle: seq('. . . . B2 . . . . . . . . . . . | D3 . . . . . . . . . . . D3 . . .'),
      chords: [[n('F#3'), n('A3'), n('D4')], null, null, null, null, null, null, null, [n('F#3'), n('B2')], null, null, null, [n('B3'), n('D3'), n('A3')], null, null, null, null, null, null, null, [n('F3'), n('A3')], null, null, null, [n('D3'), n('B2'), n('A3')], null, null, null, null, null, null, null],
      kick: seq('. . . . C1 . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . . . C1 . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . . . . . . . C1 . . . C1 . . . | . . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
    },
    // section 17
    {
      bass: seq('. . . . . . . . A2 . . . . . . . | . . . . A2 . . . . . . . . . . .'),
      lead: seq('D4 . A4 . F4 . A4 . C#6 . E5 . C#5 . A5 . | C#5 . A4 . F#5 . D#5 . E5 . C5 . C#5 . D4 .'),
      leadHarm: seq('. . . . . . . . E3 . . . . . . . | . . . . E3 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . A3 . . . . . . . | . . . . A3 . . . . . . . . . . .'),
      chords: [[n('A3'), n('F3')], null, null, null, [n('A3'), n('D3'), n('B2')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null],
      kick: seq('. . . . . . . . C1 . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . . . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 18
    {
      bass: seq('F#2 . . . . . . . . . . . B1 . . . | . . . . . . . . E2 . . . . . . .'),
      lead: seq('C#4 . F#4 . A4 . C#5 . F#5 . . . . . . . | . . . . . . D5 . A5 . B4 . D5 . B4 .'),
      leadHarm: seq('C#3 . . . . . . . . . . . F#2 . . . | . . . . . . . . B2 . . . . . . .'),
      twinkle: seq('F#3 . . . . . . . . . . . B2 . . . | . . . . . . . . E3 . . . . . . .'),
      chords: [null, null, null, null, [n('A3'), n('C#3')], null, null, null, [n('E3'), n('F#3'), n('C#4')], null, null, null, null, null, null, null, [n('D#3'), n('A3')], null, null, null, [n('D#4'), n('F#3'), n('C#4')], null, null, null, null, null, null, null, [n('D3'), n('B3')], null, null, null],
      kick: seq('C1 . . . . . . . . . . . C1 . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . C1 . . . C1 . . . . . . . | C1 . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 19
    {
      bass: seq('. . . . B1 . . . . . . . . . . . | D2 . . . . . . . . . . . D2 . . .'),
      lead: seq('A4 . F5 . F#5 . F#5 . F#5 . F#5 . F#5 . D4 . | F5 . A4 . F4 . D5 . F4 . D4 . F5 . A4 .'),
      leadHarm: seq('. . . . F#2 . . . . . . . . . . . | A2 . . . . . . . . . . . A2 . . .'),
      twinkle: seq('. . . . B2 . . . . . . . . . . . | D3 . . . . . . . . . . . D3 . . .'),
      chords: [[n('F#3'), n('A3'), n('D4')], null, null, null, null, null, null, null, [n('B2'), n('F#3')], null, null, null, [n('B3'), n('D3'), n('A3')], null, null, null, null, null, null, null, [n('A3'), n('F3')], null, null, null, [n('D3'), n('B2'), n('A3')], null, null, null, null, null, null, null],
      kick: seq('. . . . C1 . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . . . . . . . C1 . . . C1 . . . | . . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
    },
    // section 20
    {
      bass: seq('. . . . . . . . A2 . . . . . . . | . . . . A2 . . . . . . . . . . .'),
      lead: seq('F4 . D5 . F4 . E4 . F#4 . G#4 F#4 E4 . A4 . | C#5 . C5 . C#5 . C#5 . C#5 . C#5 . C#5 . E4 .'),
      leadHarm: seq('. . . . . . . . E3 . . . . . . . | . . . . E3 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . A3 . . . . . . . | . . . . A3 . . . . . . . . . . .'),
      chords: [[n('A3'), n('F3')], null, null, null, [n('A3'), n('B2'), n('D3')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('E3'), n('C#4')], null, null, null],
      kick: seq('. . . . . . . . C1 . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . . . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 21
    {
      bass: seq('A2 . . . . . . . . . . . B1 . . . | B1 . . . D2 . . . A2 . . . . . . .'),
      lead: seq('C5 . C#5 . D5 . C#5 . A4 . . . . . . . | . . . . . . . . E4 . . . A4 . . .'),
      leadHarm: seq('E3 . . . . . . . . . . . F#2 . . . | F#2 . . . A2 . . . E3 . . . . . . .'),
      twinkle: seq('A3 . . . . . . . . . . . B2 . . . | B2 . . . D3 . . . A3 . . . . . . .'),
      chords: [null, null, null, null, [n('C#3'), n('A3')], null, null, null, [n('C#4'), n('E3')], null, null, null, [n('A3'), n('F#3'), n('B3'), n('D4')], null, null, null, [n('F#3'), n('D4'), n('B3'), n('A3')], null, null, null, [n('D4'), n('A3'), n('F4'), n('B3')], null, null, null, null, null, null, null, [n('C#3'), n('A3')], null, null, null],
      kick: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . C1 . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 22
    {
      bass: seq('. . . . A2 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead: seq('B4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('. . . . E3 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . A3 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[n('C#4'), n('E3')], null, null, null, [n('E3'), n('A3'), n('A5'), n('C#4')], null, null, null, null, null, null, null, null, null, null, null, [n('A2'), n('A5')], null, [n('C#5')], null, [n('C#3'), n('E5'), n('A3')], null, [n('C#5')], null, [n('E3'), n('C#4'), n('A4')], null, [n('A4')], null, [n('F#5'), n('A2')], null, [n('D#5')], null],
      kick: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 23
    {
      chords: [[n('C#3'), n('A3'), n('E5')], null, [n('C5')], null, [n('E3'), n('C#5'), n('C#4')], null, [n('F#4')], null, [n('F#2'), n('C#4')], null, [n('A4')], null, [n('C#3'), n('F#4'), n('A3')], null, [n('C#5')], null, [n('F#3'), n('C#4'), n('A4'), n('E3')], null, [n('F#5')], null, [n('B1'), n('D#6')], null, [n('A5')], null, [n('D#3'), n('F#6'), n('A3')], null, [n('D#6')], null, [n('F#3'), n('D#4'), n('C#4'), n('A5')], null, [n('A4')], null],
    },
    // section 24
    {
      chords: [[n('E2'), n('D4')], null, [n('B4')], null, [n('D3'), n('B3'), n('A4')], null, [n('D5')], null, [n('F#3'), n('A3'), n('B4'), n('D4')], null, [n('C#5')], null, [n('D5'), n('B1')], null, [n('D5')], null, [n('F#3'), n('D5'), n('B2')], null, [n('D5')], null, [n('B3'), n('D5'), n('D3'), n('A3')], null, [n('A4')], null, [n('D2'), n('D5')], null, [n('F4')], null, [n('F3'), n('A3'), n('A4')], null, [n('F4')], null],
    },
    // section 25
    {
      chords: [[n('D3'), n('B2'), n('A3'), n('D4')], null, [n('D4')], null, [n('A3'), n('D2')], null, [n('F4')], null, [n('A3'), n('D4'), n('F3')], null, [n('A4')], null, [n('A3'), n('F4'), n('D3'), n('B2')], null, [n('A4')], null, [n('A2'), n('C#6')], null, [n('E5')], null, [n('C#3'), n('C#5'), n('A3')], null, [n('A5')], null, [n('E3'), n('C#4'), n('C#5')], null, [n('A4')], null, [n('A2'), n('F#5')], null, [n('D#5')], null],
    },
    // section 26
    {
      chords: [[n('C#3'), n('E5'), n('A3')], null, [n('C5')], null, [n('E3'), n('C#5'), n('C#4')], null, [n('D4')], null, [n('C#4'), n('F#2')], null, [n('F#4')], null, [n('A3'), n('C#3'), n('A4')], null, [n('C#5')], null, [n('F#5'), n('E3'), n('F#3'), n('C#4')], null, null, null, [n('B1')], null, null, null, [n('D#3'), n('A3')], null, null, null, [n('D#4'), n('F#3'), n('C#4')], null, [n('D5')], null],
    },
    // section 27
    {
      chords: [[n('E2'), n('A5')], null, [n('B4')], null, [n('D3'), n('B3'), n('D5')], null, [n('B4')], null, [n('F#3'), n('A4'), n('A3'), n('D4')], null, [n('F5')], null, [n('B1'), n('F#5')], null, [n('F#5')], null, [n('B2'), n('F#3'), n('F#5')], null, [n('F#5')], null, [n('B3'), n('D3'), n('A3'), n('F#5')], null, [n('D4')], null, [n('D2'), n('F5')], null, [n('A4')], null, [n('A3'), n('F4'), n('F3')], null, [n('D5')], null],
    },
    // section 28
    {
      chords: [[n('D3'), n('B2'), n('A3'), n('F4')], null, [n('D4')], null, [n('D2'), n('F5')], null, [n('A4')], null, [n('A3'), n('F3'), n('F4')], null, [n('D5')], null, [n('A3'), n('F4'), n('B2'), n('D3')], null, [n('E4')], null, [n('F#4'), n('A2')], null, [n('G#4')], [n('F#4')], [n('C#3'), n('E4'), n('A3')], null, [n('A4')], null, [n('E3'), n('C#4'), n('C#5')], null, [n('C5')], null, [n('A2'), n('C#5')], null, [n('C#5')], null],
    },
    // section 29
    {
      chords: [[n('C#3'), n('A3'), n('C#5')], null, [n('C#5')], null, [n('E3'), n('C#5'), n('C#4')], null, [n('E4')], null, [n('C5'), n('A2')], null, [n('C#5')], null, [n('C#3'), n('A3'), n('D5')], null, [n('C#5')], null, [n('C#4'), n('A4'), n('E3')], null, null, null, [n('A3'), n('F#3'), n('B1'), n('B3'), n('D4')], null, null, null, [n('F#3'), n('D4'), n('B3'), n('B1'), n('A3')], null, null, null, [n('D4'), n('A3'), n('F4'), n('D2'), n('B3')], null, null, null],
    },
    // section 30
    {
      chords: [[n('A2'), n('C#5'), n('E4')], null, null, null, [n('C#4'), n('A4'), n('C#3'), n('A3')], null, null, null, [n('C#4'), n('D4'), n('B4'), n('E3')], null, null, null, [n('E3'), n('A3'), n('A5'), n('A2'), n('C#4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
};
