// MIN3 — imported from MIN3.MID by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
import { seq, n } from '../../engine/notes.js';

export const MIN3 = {
  bpm: 120,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      lead: seq('. . . . . . . . . . . . . . G4 . | G#4 . C5 . A#4 . G4 G#4 . G#4 . C5 A#4 . G4 .'),
    },
    // section 1
    {
      bass: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      lead: seq('G#4 . C5 . A#4 . G4 G#4 . G#4 . C5 A#4 . G4 . | G#4 . C5 . A#4 . G4 G#4 . G#4 . C5 A#4 . G4 .'),
      chords: [null, null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 2
    {
      bass: seq('G#2 . . . . . G#2 . . . G#2 . G2 . D#2 . | G#2 . G#2 . . . G#2 . . . G#2 . G2 D2 D#2 .'),
      lead: seq('A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 . | A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 .'),
      twinkle: seq('A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . . | A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . .'),
      chords: [null, null, [n('G#4'), n('C5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G#4'), n('C5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 . C1 . C1 .').map((v) => !!v),
    },
    // section 3
    {
      bass: seq('C#2 . . . . . C#2 . . . C#2 . C2 . G#1 . | C#2 . C#2 . . . C#2 . . . C#2 . C2 . G#1 .'),
      lead: seq('G3 . G#3 . C4 . A#3 G3 . G3 . G#3 C4 . A#3 . | G3 . G#3 . A#3 . C4 C#4 . D#4 . F4 . . F#4 .'),
      chords: [null, null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 4
    {
      bass: seq('G#2 . . . . . G#2 . . . G#2 . G2 . G2 . | G#2 . G#2 . . . G#2 . . . G#2 . G2 . D#2 .'),
      lead: seq('A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 . | A#4 . . G#4 . . F#4 . F4 . . D#4 D4 . D#4 .'),
      twinkle: seq('A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . . | A#5 A#5 A#5 G#5 . . F#5 . F5 . . . . . . .'),
      chords: [null, null, [n('G#4'), n('C5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G#4'), n('C5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 5
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . A#1 . | C2 . . . C2 . C#2 . . . C#2 . . . C#2 .'),
      lead: seq('F4 . E4 . F#4 . E4 F4 . F4 . E4 F4 A#4 . . | G#4 . G4 . C5 . A#4 G#4 . G#4 . G4 G#4 C#5 . .'),
      leadHarm: seq('A4 . A4 . A4 . A4 A#4 . A#4 . A#4 . A#4 . A#4 | C5 . C5 . C5 . C5 C#5 . C#5 . C#5 . C#5 . C#5'),
      chords: [[n('A3'), n('F4'), n('C5'), n('D#5')], null, null, null, null, null, null, null, [n('A#3'), n('F4'), n('C#5')], null, null, null, null, null, null, null, [n('C4'), n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('C#4'), n('F4'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . . . C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 6
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . D#2 . | . . D#2 . . . D#2 . C#2 . . . C#2 . . .'),
      lead: seq('C5 . A#4 . G#4 . F#4 F4 . D#4 . C#4 . C4 . . | G3 . G#3 . C4 . A#3 G3 . G#3 . A#3 C4 C#4 D#4 E4'),
      leadHarm: seq('D#5 . D#5 . D#5 . D#5 F5 . F5 . F5 . F5 . F5 | F#5 . F#5 . F#5 . F#5 G#5 . G#5 . G#5 . G#5 . G#5'),
      chords: [[n('F#3'), n('F#4'), n('A#4'), n('D#5')], null, null, null, null, null, null, null, [n('G#3'), n('F4'), n('G#4'), n('C#5')], null, null, null, null, null, null, null, [n('G#3'), n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, null, null, [n('C#3'), n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 7
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . C2 . | . . C2 . . . C2 . C#2 . . . C#2 . . .'),
      lead: seq('F4 E4 E4 E4 F#4 . E4 F4 . F4 . E4 F4 A#4 . . | G#4 . G4 . C5 . A#4 G#4 . G#4 . G4 G#4 . F5 .'),
      leadHarm: seq('A4 . A4 . A4 . A4 A#4 . A#4 . A#4 . A#4 . A#4 | C5 . C5 . C5 . C5 C#5 . C#5 . C#5 . C#5 . C#5'),
      chords: [[n('A3'), n('F4'), n('C5'), n('D#5')], null, null, null, null, null, null, null, [n('A#3'), n('F4'), n('C#5')], null, null, null, null, null, null, null, [n('C4'), n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('C#4'), n('F4'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 8
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      lead: seq('D#5 . C#5 . C5 A#4 G#4 F#4 F4 D#4 C#4 C4 A#3 G#3 . . | A3 . C4 A#3 . F3 F#3 C3 C#3 . . . . . . .'),
      leadHarm: seq('D#5 . D#5 . D#5 . D#5 F5 . F5 . F5 . F5 . F5 | G#5 . G#5 . G#5 . G#5 C#5 . C#5 . C#5 . C#5 . .'),
      chords: [[n('F#3'), n('F#4'), n('A#4'), n('D#5')], null, null, null, null, null, null, null, [n('G#3'), n('F4'), n('G#4'), n('C#5')], null, null, null, null, null, null, null, [n('G#3'), n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, null, null, [n('C#3'), n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 9
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . A#1 . | C2 . . . C2 . C#2 . . . C#2 . . . C#2 .'),
      chords: [[n('A3'), n('F4'), n('C5'), n('D#5')], null, null, null, null, null, null, null, [n('A#3'), n('F4'), n('C#5')], null, null, null, null, null, null, null, [n('C4'), n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('C#4'), n('F4'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . . . C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 10
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . D#2 . | . . D#2 . . . D#2 . C#2 . . . C#2 . . .'),
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . A#3 C4 C#4'),
      chords: [[n('F#3'), n('F#4'), n('A#4'), n('D#5')], null, null, null, null, null, null, null, [n('G#3'), n('F4'), n('G#4'), n('C#5')], null, null, null, null, null, null, null, [n('G#3'), n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, null, null, [n('C#3'), n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 11
    {
      bass: seq('A1 . . . A1 . A1 . A#1 . . . A#1 . C2 . | . . C2 . . . C2 . C#2 . . . C#2 . . .'),
      lead: seq('D#4 E4 D#4 E4 . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[n('A3'), n('F4'), n('C5'), n('D#5')], null, null, null, null, null, null, null, [n('A#3'), n('F4'), n('C#5')], null, null, null, null, null, null, null, [n('C4'), n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('C#4'), n('F4'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 12
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      chords: [[n('F#3'), n('F#4'), n('A#4'), n('D#5')], null, null, null, null, null, null, null, [n('G#3'), n('F4'), n('G#4'), n('C#5')], null, null, null, null, null, null, null, [n('G#3'), n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, null, null, [n('C#3'), n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    // section 13
    {
      bass: seq('G#1 . . . . . . G#1 . . G#1 . . G#1 . . | C#2 . . . . . . . G#1 . . . . . . .'),
      chords: [[n('F#4'), n('G#4'), n('C5'), n('G#2')], null, [n('F#4'), n('G#4'), n('C5')], null, null, [n('F#4'), n('G#4'), n('C5')], null, null, [n('G#2')], null, [n('F#4'), n('G#4'), n('C5')], null, null, [n('F#4'), n('G#4'), n('C5')], null, null, [n('C#5'), n('C#3')], null, [n('G#4'), n('C#5')], null, null, [n('G#4'), n('C#5')], null, null, [n('F5'), n('G#2')], null, [n('G#4'), n('C#5'), n('F5')], null, null, [n('G#4'), n('C#5'), n('F5')], null, null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . C1 . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    // section 14
    {
      bass: seq('D#2 . . D#2 . . D#2 . G#1 . . G#1 . . G#1 . | C#2 . . C#2 . . C#2 . F2 . . F2 . . F2 .'),
      chords: [[n('C5'), n('F#5'), n('D#3')], null, [n('G#4'), n('C5'), n('F#5')], null, null, [n('G#4'), n('C5'), n('F#5')], null, null, [n('D#5'), n('G#2')], null, [n('G#4'), n('D#5'), n('F#5')], null, null, [n('G#4'), n('D#5'), n('F#5')], null, null, [n('C#5'), n('F5'), n('C#3')], null, [n('G#4'), n('C#5'), n('F5')], null, null, [n('G#4'), n('C#5'), n('F5')], null, null, [n('F3')], null, [n('G#4'), n('C#5'), n('F5')], null, null, [n('G#4'), n('C#5'), n('F5')], null, null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . C1 . . . . . | . . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    // section 15
    {
      bass: seq('G#1 . . . . . . G#1 . . G#1 . . G#1 . . | C#2 . . . . . . . G#1 . . . . . . .'),
      lead: seq('G#5 . D#5 . G#5 . D#5 G#5 . G#5 D#5 . G#5 . E5 . | G#5 . G#5 . G#5 . F5 F6 . . . . . . . .'),
      twinkle: seq('G#4 . D#4 . G#4 . D#4 G#4 . G#4 D#4 . G#4 . E4 . | G#4 . G#4 . G#4 . F4 F5 . . . . . . . .'),
      chords: [[n('F#4'), n('G#4'), n('C5'), n('G#2')], null, [n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, [n('G#2')], null, [n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, [n('C#5'), n('C#3')], null, [n('G#4'), n('C#5')], null, null, null, null, null, [n('F5'), n('G#2')], null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    // section 16
    {
      bass: seq('D#2 . . D#2 . . D#2 . G#1 . . G#1 . . G#1 . | C#2 . . C#2 . . C#2 . F2 . . F2 . . F2 .'),
      lead: seq('F6 . A#5 . F6 . A#5 F6 . F6 A#5 . F6 . C6 . | D#6 D#6 D#6 . D#6 . C#6 C6 . D#6 . C#6 . A#5 . .'),
      twinkle: seq('F5 . A#4 . F5 . A#4 F5 . F5 A#4 . F5 . C5 . | D#5 D#5 D#5 . D#5 . C#5 C5 . D#5 . C#5 . A#4 . .'),
      chords: [[n('C5'), n('F#5'), n('D#3')], null, [n('G#4'), n('C5'), n('F#5')], null, null, null, null, null, [n('D#5'), n('G#2')], null, [n('G#4'), n('D#5'), n('F#5')], null, null, null, null, null, [n('C#5'), n('F5'), n('C#3')], null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, [n('F3')], null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . C1 . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . C1 . . C1 .').map((v) => !!v),
    },
    // section 17
    {
      bass: seq('G#1 . . G#1 . . G#1 . G#1 . . G#1 . . G#1 . | C#2 . . C#2 . . C#2 . B1 . . B1 . . B1 .'),
      lead: seq('G#5 . D#5 . G#5 . D#5 G#5 . G#5 D#5 . G#5 . E5 . | G#5 . G#5 . G#5 . F5 F6 . . . . . . . .'),
      twinkle: seq('G#4 . D#4 . G#4 . D#4 G#4 . G#4 D#4 . G#4 . E4 . | G#4 . G#4 . G#4 . F4 F5 . . . . . . . .'),
      chords: [[n('F#4'), n('C5'), n('G#2')], null, [n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, [n('G#2')], null, [n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, [n('C#5'), n('C#3')], null, [n('G#4'), n('C#5')], null, null, null, null, null, [n('F5'), n('B2')], null, [n('G#4'), n('C#5'), n('F5')], null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 18
    {
      bass: seq('C2 . . C2 . . C2 . C1 . . C1 . . C1 . | F1 . . F1 . . F1 . F1 . . F1 . . F1 .'),
      lead: seq('C6 C#6 C6 . B5 . C6 . G#6 G#6 . A#5 G6 G6 . A5 | F#6 F#6 . G#5 F6 F6 . F5 . . . . . . . .'),
      leadHarm: seq('C5 C#5 C5 . B4 . C5 . G#5 . . A#4 G5 . . A4 | F#5 . . G#4 F5 . . F4 . . . . . . . .'),
      chords: [[n('C5'), n('C3')], null, [n('G#4'), n('C5'), n('F5')], null, null, null, null, null, [n('G4'), n('E5'), n('C2')], null, [n('G4'), n('C5'), n('E5')], null, null, null, null, null, [n('F4'), n('F3')], null, [n('F4'), n('C5')], null, null, null, null, null, [n('F5'), n('F2'), n('F3')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    // section 19
    {
      bass: seq('F#1 . . . F#1 . F#1 . G#1 . . . G#1 . G#1 . | . . G#1 . D#2 . D#2 . C#2 . . . C#2 . C#2 .'),
      lead: seq('D#5 . C#5 . C5 A#4 G#4 F#4 F4 D#4 C#4 C4 A#3 G#3 . . | A3 . C4 A#3 . F3 F#3 C3 C#2 . . . . . . .'),
      leadHarm: seq('D#5 . D#5 . D#5 . D#5 F5 . F5 . F5 . F5 . F5 | G#5 . G#5 . G#5 . G#5 C#5 . C#5 . C#5 . C#5 . .'),
      chords: [[n('F#3'), n('F#4'), n('A#4'), n('D#5')], null, null, null, null, null, null, null, [n('G#3'), n('F4'), n('G#4'), n('C#5')], null, null, null, null, null, null, null, [n('G#3'), n('F#4'), n('G#4'), n('C5')], null, null, null, null, null, null, null, [n('C#3'), n('G#4'), n('C#5'), n('F5')], null, null, null, null, null, null, null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      ohats: seq('C1 . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 9, 10, 11, 12, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 19],
};
