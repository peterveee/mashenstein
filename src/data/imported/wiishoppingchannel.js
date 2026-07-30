// WIISHOPPINGCHANNEL — imported from WiiShoppingChannel.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
import { seq, chord, n } from '../../engine/notes.js';

export const WIISHOPPINGCHANNEL = {
  bpm: 120,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      bass: seq('D3 . . . . . D3 . . . . . D3 D3 D3 . | . . . . . . . . . . . . . . . .'),
      chords: [[n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], null, [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], null, [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], [n('D4'), n('G4'), n('A4'), n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 1
    {
      bass: seq('G2 . . G2 D2 . . D2 G2 . . G2 D2 . . D2 | G2 . . G2 D2 . . D2 G2 . . G2 D2 . . D2'),
      chords: [null, [n('B3'), n('D4'), n('A4')], [n('B3'), n('D4'), n('A4')], null, [n('B3'), n('D4'), n('G4')], [n('B3'), n('D4'), n('G4')], null, chord('B3min'), chord('B3min'), null, [n('B3'), n('D4'), n('E4')], [n('B3'), n('D4'), n('E4')], null, null, null, null, null, [n('B3'), n('D4'), n('A4')], [n('B3'), n('D4'), n('A4')], null, [n('B3'), n('D4'), n('G4')], [n('B3'), n('D4'), n('G4')], null, chord('B3min'), chord('B3min'), null, [n('B3'), n('D4'), n('E4')], [n('B3'), n('D4'), n('E4')], null, null, null, null],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 2
    {
      bass: seq('C2 . . C2 G2 . . G2 C2 . . C2 G2 . . G2 | C2 . . C2 G2 . . G2 F2 . . F2 C2 . . .'),
      chords: [null, [n('E4'), n('G4'), n('D5')], [n('E4'), n('G4'), n('D5')], null, [n('E4'), n('G4'), n('C5')], [n('E4'), n('G4'), n('C5')], null, chord('E4min'), chord('E4min'), null, [n('E4'), n('G4'), n('A4')], [n('E4'), n('G4'), n('A4')], null, null, null, null, null, [n('D#4'), n('G4'), n('D5')], [n('D#4'), n('G4'), n('D5')], null, [n('D#4'), n('G4'), n('C5')], [n('D#4'), n('G4'), n('C5')], null, chord('D#4'), chord('D#4'), null, [n('C4'), n('D#4'), n('A4')], [n('C4'), n('D#4'), n('A4')], null, chord('C4min'), null, chord('B3min')],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 3
    {
      bass: seq('B2 . . B2 F#2 . . F#2 A#2 . . A#2 E2 . . E2 | A2 . . A2 E2 . . E2 G#2 . . G#2 D2 . . D2'),
      chords: [null, null, null, null, chord('B3min'), null, chord('D4'), [n('A#3'), n('C#4'), n('E4')], [n('C#4')], null, null, null, null, null, null, null, chord('A3min'), null, null, [n('F#3'), n('A3'), n('D#4')], chord('A3min'), [n('A3'), n('C4'), n('F#4')], [n('A3'), n('C4'), n('G4')], [n('C4'), n('E4'), n('A4')], [n('D4'), n('F4'), n('B4')], null, null, null, [n('D4'), n('F4'), n('C5')], null, null, null],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 4
    {
      bass: seq('A2 . . A2 E2 . . G#2 G#2 . . G#2 D#2 . . G2 | G2 . . G2 D2 . . D2 F#2 . . F#2 B1 . . B1'),
      chords: [[n('C4'), n('E4'), n('B4')], null, chord('A3min'), chord('A3min'), null, [n('C4'), n('E4'), n('B4')], null, [n('C4'), n('D#4'), n('A#4')], null, null, chord('G#3'), chord('G#3'), null, [n('C4'), n('D#4'), n('A#4')], null, [n('B3'), n('D4'), n('A4')], null, null, [n('F#5'), n('B5'), n('D6')], null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, chord('A5'), chord('A5'), [n('B5'), n('D#6')], [n('B5'), n('D#6')], [n('B5'), n('D#6')], null],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 5
    {
      bass: seq('E2 . . E2 B1 . . B1 E2 . . E2 B1 . . B1 | E2 . . E2 B1 . . B1 E2 . . E2 B1 . . B1'),
      chords: [null, [n('G#5'), n('B5'), n('F#6')], [n('G#5'), n('B5'), n('F#6')], null, [n('G#5'), n('B5'), n('E6')], [n('G#5'), n('B5'), n('E6')], null, chord('G#5min'), chord('G#5min'), null, [n('G#5'), n('B5'), n('C#6')], [n('G#5'), n('B5'), n('C#6')], null, null, null, null, null, [n('G#5'), n('B5'), n('F#6')], [n('G#5'), n('B5'), n('F#6')], null, [n('G#5'), n('B5'), n('E6')], [n('G#5'), n('B5'), n('E6')], null, chord('G#5min'), chord('G#5min'), null, [n('G#5'), n('B5'), n('C#6')], [n('G#5'), n('B5'), n('C#6')], null, null, null, null],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 6
    {
      bass: seq('E2 . . E2 B1 . . B1 A1 . . A1 E2 . . E2 | D2 . . D2 A2 . . A2 D#2 . . D#2 D2 . . D2'),
      chords: [null, [n('G5'), n('B5'), n('F#6')], [n('G5'), n('B5'), n('F#6')], null, [n('G5'), n('B5'), n('E6')], [n('G5'), n('B5'), n('E6')], null, chord('G5'), chord('G5'), null, [n('G5'), n('B5'), n('C#6')], [n('G5'), n('B5'), n('C#6')], null, null, null, null, null, [n('F#5'), n('A5'), n('E6')], [n('F#5'), n('A5'), n('E6')], null, [n('F#5'), n('A5'), n('D6')], [n('F#5'), n('A5'), n('D6')], null, chord('F#5min'), chord('F#5min'), null, [n('F#5'), n('A5'), n('B5')], [n('F#5'), n('A5'), n('B5')], null, chord('D4min'), null, chord('C#4min')],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 7
    {
      bass: seq('C#2 . . C#2 G#2 . . G#2 C2 . . C2 F#2 . . F#2 | B1 . . B1 F#2 . . F#2 E2 . . E2 B1 . . B1'),
      chords: [null, null, [n('E5'), n('G#5')], [n('E5'), n('G#5')], null, [n('G#5'), n('B5')], null, [n('C5'), n('D#5'), n('F#5')], null, null, null, null, null, null, null, null, null, chord('B4min'), null, [n('B4'), n('D5'), n('F5')], chord('B4min'), [n('B4'), n('D5'), n('G#5')], [n('B4'), n('D5'), n('A5')], [n('D5'), n('F#5'), n('B5')], [n('E5'), n('G#5'), n('C#6')], null, null, null, [n('E5'), n('G#5'), n('C6')], null, null, null],
      kick: seq('C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 C1 . . C1 C1 . . C1').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    // section 8
    {
      bass: seq('A2 A2 A2 A2 A2 . . . . . A2 A2 A2 A2 A2 . | A2 A2 A2 A2 A2 . . . . . . . A2 A2 A2 .'),
      chords: [chord('C#5min7'), chord('C#5min7'), chord('C#5min7'), chord('C#5min7'), chord('C#5min7'), null, null, null, null, null, chord('C#5min7'), chord('C#5min7'), chord('C#5min7'), chord('C#5min7'), chord('C#5min7'), null, chord('C5maj7'), chord('C5maj7'), chord('C5maj7'), chord('C5maj7'), chord('C5maj7'), null, null, null, null, null, null, null, [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], null],
      kick: seq('C1 . . C1 C1 . . . . . . C1 C1 . . C1 | C1 . . C1 C1 . . C1 . . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 . . . . C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 . . . . C1 C1 C1 .').map((v) => !!v),
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8],
};
