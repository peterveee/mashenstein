// BABY PORTABLE ROCK 4 — imported from baby portable rock 4.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
import { seq, n } from '../../engine/notes.js';

export const BABY_PORTABLE_ROCK_4 = {
  bpm: 161,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      bass: seq('A2 . . . . . A1 . A1 . . . . . A#2 . | . . E2 . . . A#1 . A#1 . G#1 . A1 . A#1 .'),
      lead: seq('A5 . . . . . . . . . . . . . E5 . | . . . . . . . . . . . . C#6 . . .'),
      chords: [[n('G#5'), n('C#6'), n('E6'), n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null, [n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('A#5'), n('C#6'), n('E6'), n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#4'), n('C#5'), n('E5')], null, [n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 1
    {
      bass: seq('B1 . . . . . F#2 . F#2 . . . . . D2 . | . . D2 . . . D2 . D2 . . . B2 . C3 .'),
      lead: seq('B5 . . . . . . . . . . . . . F5 . | . . . . . . F5 . . . . . A5 . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('A5'), n('B5'), n('D6'), n('F6'), n('D4'), n('A4'), n('D5'), n('B4'), n('F5')], null, null, null, [n('D4'), n('A4'), n('D5'), n('B4'), n('F5')], null, null, null, [n('A4'), n('B4'), n('D5'), n('F5')], null, [n('A4'), n('B4'), n('D5'), n('F5')], null, null, null, [n('A4'), n('B4'), n('D5'), n('F5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
    },
    // section 2
    {
      bass: seq('C#3 . . . . . C#2 . C#2 . G#2 . A2 . A#2 . | . . E2 . . . A#1 . A#1 . G#1 . F1 . E1 .'),
      lead: seq('G#5 . . . . . . . . . . . . . A#5 . | . . . . . . . . . . . . C#6 . . .'),
      chords: [[n('G#5'), n('B5'), n('F6'), n('C#4'), n('G#4'), n('C#5'), n('B4'), n('F5')], null, null, null, null, null, [n('G#4'), n('B4'), n('F5')], null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('F5')], null, null, null, null, null, [n('A#5'), n('C#6'), n('E6'), n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#4'), n('C#5'), n('E5')], null, [n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#3'), n('A#4')], null, [n('A#4'), n('C#5'), n('E5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 3
    {
      bass: seq('B2 . . . . . B1 . B1 . . . . . E2 . | . . B1 . . . E1 . E1 . E1 . G1 . G#1 .'),
      lead: seq('B5 . . . . . . . . . . . . . G#5 . | . . . . . . . . . . . . B5 . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('G#5'), n('B5'), n('D6'), n('E4'), n('B4'), n('E5'), n('G#4'), n('D5')], null, null, null, [n('E4'), n('B4'), n('E5'), n('G#4'), n('D5')], null, null, null, [n('G#4'), n('B4'), n('D5')], null, [n('G#4'), n('B4'), n('D5')], null, null, null, [n('G#4'), n('B4'), n('D5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . . . . . . . . . C1 C1 . . C1 C1').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | C1 . C1 C1 . C1 C1 C1 C1 C1 . . C1 C1 . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 4
    {
      bass: seq('A1 . . . . . A1 . A1 . . . . . A#1 . | . . E1 . . . A#1 . A#1 . C#2 . A#1 . G#1 .'),
      lead: seq('A5 . . . . . . . . . . . . . A#5 . | . . . . . . . . . . . . C#6 . . .'),
      chords: [[n('G#5'), n('C#6'), n('E6'), n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null, [n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('A#5'), n('C#6'), n('E6'), n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#4'), n('C#5'), n('E5')], null, [n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#4'), n('C#5'), n('E5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 5
    {
      bass: seq('B1 . . . . . B1 . B1 . C2 . C#2 . D2 . | . . A1 . . . D2 . D2 . C2 . E2 . C2 .'),
      lead: seq('B5 . . . . . . . . . . . . . D5 . | . . . . . . . . . . . . D5 . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('A5'), n('B5'), n('D6'), n('F6'), n('D4'), n('A4'), n('D5'), n('B4'), n('F5')], null, null, null, [n('D4'), n('A4'), n('D5'), n('B4'), n('F5')], null, null, null, [n('A4'), n('B4'), n('D5'), n('F5')], null, [n('A4'), n('B4'), n('D5'), n('F5')], null, null, null, [n('D4'), n('A4'), n('D5')], null, [n('A4'), n('B4'), n('D5'), n('F5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . . . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
    },
    // section 6
    {
      bass: seq('C#2 . . . . . C#2 . F#1 . G#1 . A1 . A#1 . | . . E1 . . . A#1 . A#1 . G#1 . A1 . A#1 .'),
      lead: seq('E5 . . . . . . . . . . . . . A#5 . | . . . . . . . . . . . . C#6 . . .'),
      chords: [[n('G#5'), n('B5'), n('E6'), n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, null, null, [n('G#4'), n('B4'), n('E5')], null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, null, null, [n('A#5'), n('C#6'), n('E6'), n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#3'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#4'), n('C#5'), n('E5')], null, [n('A#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('A#4'), n('C#5'), n('E5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 7
    {
      bass: seq('B1 . . . . . B1 . D2 . B1 . C#2 . E2 . | . . E2 . . . B1 . E2 . . . C#2 . B1 .'),
      lead: seq('B5 . . . . . . . . . . . . . G#5 . | . . . . . . . . . . . . G#5 . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('G#5'), n('B5'), n('D6'), n('E4'), n('B4'), n('E5'), n('G#4'), n('D5')], null, null, null, [n('E4'), n('B4'), n('E5'), n('G#4'), n('D5')], null, null, null, [n('G#4'), n('B4'), n('D5')], null, [n('G#4'), n('B4'), n('D5')], null, null, null, [n('G#4'), n('B4'), n('D5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 8
    {
      bass: seq('D2 . . . . . D2 . D2 . . . . . D2 . | . . A1 . . . D2 . D2 . C2 . D2 . C2 .'),
      lead: seq('F#5 . . . . . . . . . . . . . F5 . | . . . . . . . . . . . . . . . .'),
      chords: [[n('F#5'), n('A5'), n('C#6'), n('D4'), n('A4'), n('D5'), n('C#5')], null, null, null, null, null, [n('A4'), n('C#5'), n('F#5')], null, [n('D4'), n('A4'), n('D5'), n('C#5'), n('F#5')], null, null, null, null, null, [n('A5'), n('C6'), n('F6'), n('D4'), n('A4'), n('D5'), n('C5'), n('F5')], null, null, null, [n('D4'), n('A4'), n('D5'), n('C5'), n('F5')], null, null, null, [n('A4'), n('C5'), n('F5')], null, [n('A4'), n('C5'), n('F5')], null, null, null, [n('A4'), n('C5'), n('F5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 9
    {
      bass: seq('C#2 . . . . . G#2 . A1 . F#1 . E1 . F#1 . | . . F#1 . . . F#1 . F#1 . . . G#1 . . .'),
      lead: seq('G#5 . . . . . . . . . . . . . F#5 . | . . . . . . . . . . . . E5 . . .'),
      chords: [[n('G#5'), n('B5'), n('E6'), n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, null, null, [n('G#4'), n('B4'), n('E5')], null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, null, null, [n('G#5'), n('A#5'), n('C#6'), n('E6'), n('F#3'), n('C#4'), n('F#4'), n('G#4'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('F#3'), n('C#4'), n('F#4'), n('G#4'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('G#4'), n('A#4'), n('C#5'), n('E5')], null, [n('G#4'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('F#3'), n('C#4'), n('F#4')], null, [n('G#4'), n('A#4'), n('C#5'), n('E5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 10
    {
      bass: seq('B1 . . . . . F#2 . F#2 . . . . . B1 . | . . B1 . . . B1 . B1 . . . C2 . C#2 .'),
      lead: seq('D#5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . D#5 . . .'),
      chords: [[n('F#5'), n('A5'), n('C#6'), n('D#6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('C#5'), n('D#5')], null, null, null, null, null, [n('A4'), n('C#5'), n('D#5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('C#5'), n('D#5'), n('F#5')], null, null, null, null, null, [n('A4'), n('C#5'), n('D#5'), n('F#5')], null, null, null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('C#5'), n('D#5'), n('F#5')], null, null, null, [n('A4'), n('C#5'), n('D#5'), n('F#5')], null, [n('A4'), n('C#5'), n('D#5'), n('F#5')], null, null, null, null, null, [n('A4'), n('C#5'), n('D#5'), n('F#5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 11
    {
      bass: seq('D2 . . . . . A2 . E1 . F#1 . F1 . E1 . | . . E1 . . . E1 . E1 . E1 . F#1 . G#1 .'),
      lead: seq('D5 . . . . . . . . . . . . . E5 . | . . . . . . . . . . . . B5 . . .'),
      chords: [[n('F#5'), n('A5'), n('C#6'), n('D4'), n('A4'), n('D5'), n('C#5')], null, null, null, null, null, [n('A4'), n('C#5'), n('F#5')], null, [n('D4'), n('A4'), n('D5'), n('C#5'), n('F#5')], null, null, null, null, null, [n('G#5'), n('B5'), n('D6'), n('E4'), n('B4'), n('E5'), n('G#4'), n('D5')], null, null, null, [n('E4'), n('B4'), n('E5'), n('G#4'), n('D5')], null, null, null, [n('G#4'), n('B4'), n('D5')], null, [n('G#4'), n('B4'), n('D5')], null, null, null, [n('E4'), n('B4'), n('E5')], null, [n('G#4'), n('B4'), n('D5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 12
    {
      bass: seq('A1 . . . . . E2 . E2 . C#2 . B1 . C#2 . | . . C#2 . . . C#2 . C#2 . . . D2 . . .'),
      lead: seq('A5 . . . . . . . . . . . . . E5 . | . . . . . . . . . . . . A5 . . .'),
      chords: [[n('G#5'), n('C#6'), n('E6'), n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null, [n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#5'), n('B5'), n('E6'), n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, [n('G#4'), n('B4'), n('E5')], null, [n('G#4'), n('B4'), n('E5')], null, null, null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 13
    {
      bass: seq('B1 . . . . . B1 . B1 . . . . . E2 . | . . E2 . . . F#1 . E2 . . . G1 . G#1 .'),
      lead: seq('B5 . . . . . . . . . . . . . D5 . | . . . . . . . . . . . . F#5 . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('F#5'), n('A5'), n('D6'), n('E4'), n('E5'), n('A4'), n('D5')], null, null, null, [n('E4'), n('E5'), n('A4'), n('D5'), n('F#5')], null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('A4'), n('D5'), n('F#5')], null, null, null, [n('E4'), n('E5'), n('A4'), n('D5'), n('F#5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 14
    {
      bass: seq('A1 . . . . . E2 . E2 . . . . . C#2 . | . . C#2 . . . C#2 . C#2 . . . B1 . . .'),
      lead: seq('E5 . . . . . . . . . . . . . C#6 . | . . . . . . . . . . . . D#5 . . .'),
      chords: [[n('G#5'), n('C#6'), n('E6'), n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null, [n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#5'), n('B5'), n('E6'), n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, [n('G#4'), n('B4'), n('E5')], null, [n('G#4'), n('B4'), n('E5')], null, null, null, [n('G#4'), n('B4'), n('E5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 15
    {
      bass: seq('B1 . . . . . B1 . B1 . D2 . D#2 . E2 . | . . F#1 . . . E2 . E2 . C#2 . B1 . A1 .'),
      lead: seq('D5 . . . . . . . . . . . . . E5 . | . . . . . . . . . . . . . . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('B3'), n('F#4'), n('B4'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('B3'), n('F#4'), n('B4'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('F#5'), n('A5'), n('D6'), n('E4'), n('E5'), n('A4'), n('D5')], null, null, null, [n('E4'), n('E5'), n('A4'), n('D5'), n('F#5')], null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 16
    {
      bass: seq('D3 . . . . . D2 . D2 . . . . . D3 . | . . A2 . . . D2 . D2 . C2 . A#1 . A1 .'),
      lead: seq('F#5 . . . . . . . . . . . . . A5 . | . . . . . . . . . . . . C6 . . .'),
      chords: [[n('F#5'), n('A5'), n('C#6'), n('D4'), n('A4'), n('D5'), n('C#5')], null, null, null, null, null, [n('A4'), n('C#5'), n('F#5')], null, [n('D4'), n('A4'), n('D5'), n('C#5'), n('F#5')], null, null, null, null, null, [n('A5'), n('C6'), n('F6'), n('D4'), n('A4'), n('D5'), n('C5'), n('F5')], null, null, null, [n('D4'), n('A4'), n('D5'), n('C5'), n('F5')], null, null, null, [n('A4'), n('C5'), n('F5')], null, [n('A4'), n('C5'), n('F5')], null, null, null, [n('D4'), n('A4'), n('D5'), n('C5'), n('F5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 17
    {
      bass: seq('C#2 . . . . . C#2 . C#2 . . . . . F#2 . | . . C#2 . . . F#2 . F#2 . D#2 . C#2 . G#1 .'),
      lead: seq('C#6 . . . . . . . . . . . . . F#5 . | . . . . . . . . . . . . D#5 . . .'),
      chords: [[n('G#5'), n('B5'), n('E6'), n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, null, null, [n('G#4'), n('B4'), n('E5')], null, [n('C#4'), n('G#4'), n('C#5'), n('B4'), n('E5')], null, null, null, null, null, [n('A#5'), n('C#6'), n('E6'), n('F#3'), n('C#4'), n('F#4'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('F#3'), n('C#4'), n('F#4'), n('A#4'), n('C#5'), n('E5')], null, null, null, [n('A#4'), n('C#5'), n('E5')], null, [n('A#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('A#4'), n('C#5'), n('E5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 18
    {
      bass: seq('E1 . . . . . F#2 . F#2 . . . . . E1 . | . . E1 . . . E1 . E1 . . . E1 . F#1 .'),
      lead: seq('D5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[n('F#5'), n('A5'), n('D6'), n('E4'), n('E5'), n('A4'), n('D5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('E4'), n('E5'), n('A4'), n('D5'), n('F#5')], null, null, null, null, null, [n('A4'), n('D5'), n('F#5')], null, null, null, [n('E4'), n('E5'), n('A4'), n('D5'), n('F#5')], null, null, null, [n('A4'), n('D5'), n('F#5')], null, [n('A4'), n('D5'), n('F#5')], null, null, null, [n('E4'), n('E5'), n('A4'), n('D5'), n('F#5')], null, null, null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 19
    {
      bass: seq('A1 . . . . . E2 . E2 . . . . . A1 . | . . A1 . . . A1 . A1 . . . B1 . . .'),
      lead: seq('C#6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[n('G#5'), n('C#6'), n('E6'), n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null, [n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null, null, null, [n('A3'), n('E4'), n('A4'), n('G#4'), n('C#5'), n('E5')], null, null, null, [n('G#4'), n('C#5'), n('E5')], null, [n('G#4'), n('C#5'), n('E5')], null, null, null, null, null, [n('G#4'), n('C#5'), n('E5')], null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | . . C1 . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 . C1 C1 C1 . C1 . . C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 20
    {
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
};
