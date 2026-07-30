// WII SHOP CHANNEL — imported from Wii Shop Channel.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
import { seq, chordSeq, chord, n } from '../../engine/notes.js';

export const WII_SHOP_CHANNEL = {
  bpm: 148,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      bass: seq('C4 . . . . . . . . . . . C4 . . . | . . . . . . . . C4 C4 C4 C4 C4 . . .'),
      lead: seq('D2 . . . . . . . . . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('C4 . . . . . . . . . . . C4 . . . | . . . . . . . . C4 C4 C4 C4 C4 . . .'),
      chords: chordSeq('E4min7 . E4min7 . E4min7 . E4min7 . E4min7 . . . E4min7 . E4min7 . | E4min7 . E4min7 . E4min7 . . . E4min7 E4min7 E4min7 E4min7 E4min7 . . .'),
    },
    // section 1
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
    },
    // section 2
    {
      lead: seq('G2 . C4 . C4 . G2 . D3 . C4 . C4 . D3 . | G2 . C4 . C4 . G2 . D3 . C4 . C4 . D3 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [null, null, chord('B3min7'), null, chord('B3min7'), null, null, null, [n('B3'), n('D4'), n('G4')], null, [n('B3'), n('D4'), n('G4')], null, null, null, chord('B3min'), null, chord('B3min'), null, null, null, [n('B3'), n('D4'), n('E4')], null, [n('B3'), n('D4'), n('E4')], null, null, null, null, null, null, null, null, null],
    },
    // section 3
    {
      lead: seq('G2 . C4 . C4 . G2 . D3 . C4 . C4 . D3 . | G2 . C4 . C4 . G2 . D3 . C4 . C4 . C3 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [null, null, chord('B3min7'), null, chord('B3min7'), null, null, null, [n('B3'), n('D4'), n('G4')], null, [n('B3'), n('D4'), n('G4')], null, null, null, chord('B3min'), null, chord('B3min'), null, null, null, [n('B3'), n('D4'), n('E4')], null, [n('B3'), n('D4'), n('E4')], null, null, null, null, null, null, null, null, null],
    },
    // section 4
    {
      lead: seq('C4 . C4 . C4 . C3 . G2 . C4 . C4 . G2 . | C3 . C4 . C4 . C3 . G2 . C4 . C4 . G2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [null, null, chord('E4min7'), null, chord('E4min7'), null, null, null, [n('E4'), n('G4'), n('C5')], null, [n('E4'), n('G4'), n('C5')], null, null, null, chord('E4min'), null, chord('E4min'), null, null, null, [n('E4'), n('G4'), n('A4')], null, [n('E4'), n('G4'), n('A4')], null, null, null, null, null, null, null, null, null],
    },
    // section 5
    {
      lead: seq('C3 . C4 . C4 . C3 . G2 . C4 . C4 . F2 . | C4 . C4 . C4 . F2 . C3 . C4 . C4 . C3 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [null, null, chord('D#4maj7'), null, chord('D#4maj7'), null, null, null, [n('D#4'), n('G4'), n('C5')], null, [n('D#4'), n('G4'), n('C5')], null, null, null, chord('D#4'), null, chord('D#4'), null, null, null, [n('D#4'), n('G4'), n('A4')], null, [n('D#4'), n('G4'), n('A4')], null, null, null, [n('D#5'), n('G5')], null, null, null, null, null],
    },
    // section 6
    {
      lead: seq('B2 . C4 . C4 . B2 . F#2 . C4 . C4 . F#2 . | A#2 . C4 . C4 . A#2 . E2 . C4 . C4 . E2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('D5'), n('F#5')], null, null, null, null, null, null, null, chord('B3min'), null, null, null, [n('A4')], null, [n('A#3'), n('C#4'), n('E4')], null, [n('C#5'), n('E5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    },
    // section 7
    {
      lead: seq('A2 . C4 . C4 . A2 . E2 . C4 . C4 . E2 . | G#2 . C4 . C4 . E3 . C4 . F#2 . C4 . G#2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('C5')], null, null, null, null, null, [n('A3'), n('C4'), n('D#4')], null, [n('E4')], null, [n('A3'), n('C4'), n('F#4')], null, [n('G4')], null, [n('A4')], null, [n('D4'), n('G#4'), n('B4'), n('D5'), n('F5')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('C5')], null, null, null, null, null, null, null],
    },
    // section 8
    {
      lead: seq('A2 . C4 . C4 . A2 . E2 . C4 . C4 . E2 . | G#2 . C4 . C4 . G#2 . D#3 . C4 . C4 . G2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('C4'), n('E4'), n('B4')], null, null, null, [n('C4'), n('E4'), n('G5'), n('C6')], null, [n('C4'), n('E4')], null, null, null, [n('C4'), n('E4'), n('G4'), n('B4'), n('G5'), n('C6')], null, null, null, [n('C4'), n('F#4'), n('A#4')], null, null, null, null, null, [n('C4'), n('D#4'), n('F#5'), n('C6')], null, [n('C4'), n('D#4')], null, null, null, [n('C4'), n('F#4'), n('A#4'), n('F#5'), n('C6')], null, null, null, chord('B3min7'), null],
    },
    // section 9
    {
      lead: seq('C4 . C4 . C4 . G2 . D3 . C4 . C4 . G2 . | F#2 . C4 . C4 . B2 . C4 . C4 . C4 . E2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, null, null, null, null, null, chord('A5'), null, chord('A5'), null, [n('A5'), n('C6'), n('D#6')], null, [n('A5'), n('C6'), n('D#6')], null, [n('A5'), n('C6'), n('D#6')], null, null, null],
    },
    // section 10
    {
      lead: seq('C4 . C4 . C4 . E2 . B2 . C4 . C4 . E2 . | C4 . C4 . C4 . E2 . B2 . C4 . C4 . B2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [chord('G#5min'), null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, null, null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, null, null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, null, null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, null, null, null],
    },
    // section 11
    {
      lead: seq('E2 . C4 . C4 . E2 . B2 . C4 . C4 . E3 . | C4 . C4 . C4 . G#2 . B2 . C4 . C4 . E2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('B4'), n('D#5'), n('F#5'), n('G#5')], null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, null, null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, null, null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, null, null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, null, null, null],
    },
    // section 12
    {
      lead: seq('C4 . C4 . C4 . E2 . B2 . C4 . C4 . G2 . | A2 . C4 . C4 . A2 . E3 . C4 . C4 . D3 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('B4'), n('D5'), n('E5'), n('G5')], null, [n('F#4'), n('G4'), n('B4'), n('D5'), n('F#5')], null, [n('F#4'), n('G4'), n('B4'), n('D5'), n('F#5')], null, null, null, [n('E4'), n('G4'), n('B4'), n('E5')], null, [n('E4'), n('G4'), n('B4'), n('E5')], null, null, null, [n('D4'), n('G4'), n('B4'), n('D5')], null, [n('D4'), n('G4'), n('B4'), n('D5')], null, null, null, [n('C#4'), n('G4'), n('B4'), n('C#5')], null, [n('C#4'), n('G4'), n('B4'), n('C#5')], null, null, null, [n('C#5'), n('E5'), n('F#5'), n('A5')], null, null, null, null, null],
    },
    // section 13
    {
      lead: seq('C4 . C4 . C4 . D3 . A2 . C4 . C4 . D#3 . | C4 . C4 . C4 . D#3 . D3 . C4 . C4 . C#3 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('A4'), n('B4'), n('D5'), n('F#5')], null, [n('E4'), n('F#4'), n('A4'), n('C#5'), n('E5')], null, [n('E4'), n('F#4'), n('A4'), n('C#5'), n('E5')], null, null, null, [n('D4'), n('F#4'), n('A4'), n('D5')], null, [n('D4'), n('F#4'), n('A4'), n('D5')], null, null, null, [n('C#4'), n('F#4'), n('A4'), n('C#5')], null, [n('C#4'), n('F#4'), n('A4'), n('C#5')], null, null, null, [n('B3'), n('F4'), n('A4'), n('B4')], null, [n('B3'), n('F4'), n('A4'), n('B4')], null, null, null, [n('C#5'), n('F5'), n('A5')], null, null, null, null, null],
    },
    // section 14
    {
      lead: seq('C4 . C4 . C4 . C#3 . G#2 . C4 . C4 . G#2 . | C3 . C4 . C4 . C3 . F#2 . C4 . C4 . F#2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('B4'), n('E5'), n('G#5')], null, null, null, [n('E5'), n('G#5')], null, [n('E5'), n('G#5')], null, null, null, [n('G#5'), n('B5')], null, null, null, [n('D#5'), n('F#5')], null, [n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('A4')], null, null, null, null, null, null, null],
    },
    // section 15
    {
      lead: seq('B2 . C4 . C4 . B2 . F#2 . C4 . C4 . F#2 . | E2 . C4 . C4 . E3 . C4 . F#2 . C4 . G#2 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('D5')], null, [n('D5'), n('F#5')], null, null, null, [n('C#5'), n('F5')], null, [n('D5'), n('F#5')], null, [n('E5'), n('G#5')], null, [n('F#5'), n('A5')], null, [n('G#5'), n('B5')], null, [n('G#5'), n('C#6')], null, null, null, null, null, null, null, chord('F5min'), null, null, null, null, null, null, null],
    },
    // section 16
    {
      lead: seq('A2 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . A2 . C4 . C4 . C4 . C4 . C4 .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      chords: [[n('C#4'), n('E4'), n('G#4'), n('B4'), n('C#5'), n('E5'), n('G#5'), n('B5')], null, chord('C#5min7'), null, chord('C#5min7'), null, chord('C#5min7'), null, chord('C#5min7'), null, null, null, null, null, null, null, null, null, null, null, [n('C#4'), n('E4'), n('G#4'), n('B4'), n('C#5'), n('E5'), n('G#5'), n('B5')], null, chord('C#5min7'), null, chord('C#5min7'), null, chord('C#5min7'), null, chord('C#5min7'), null, null, null],
    },
    // section 17
    {
      bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C4 C4 C4 C4 C4 . . .'),
      lead: seq('A2 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . . . C4 . C4 C4 . C4 . . . . . .'),
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . . . . . . . . . . .'),
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . . . . . . . . . . . . .'),
      chords: [[n('C4'), n('E4'), n('G4'), n('B4'), n('C5'), n('E5'), n('G5'), n('B5')], null, chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], null, null, null],
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
};
