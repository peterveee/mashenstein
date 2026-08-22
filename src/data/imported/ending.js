// ENDING — imported from ending.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 6 parts in the file, 6 lanes here — nothing was merged onto anything else.
import { seq, chord, n } from '../../engine/notes.js';

export const id = "ending";
export const title = "ENDING";
export const slug = "ending";
export const group = "imported";

export const bank = {
  bpm: 133,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      chords: [chord('F4maj7'), null, null, null, null, null, null, chord('F4maj7'), chord('F4maj7'), null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5')], [n('G4'), n('B4'), n('D#5'), n('G5')], null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5')], [n('G4'), n('B4'), n('D#5'), n('G5')], null, null, null, null, null, null, null],
      chordsLen: [[3,3,3,3],null,null,null,null,null,null,[1,1,1,1],[3,3,3,3],null,null,null,null,null,null,[1,1,1,1],[3,3,3,3],null,null,null,null,null,null,[1,1,1,1],[4,4,4,4],null,null,null,null,null,null,null],
      organChords: [null, null, null, [n('D2'), n('D3')], [n('D2'), n('D3')], null, null, null, null, null, null, [n('D2'), n('D3')], [n('D2'), n('D3')], null, null, null, null, null, null, [n('G2'), n('G3')], [n('G2'), n('G3')], null, null, null, null, null, null, null, [n('G2'), n('G3')], null, null, null],
      organChordsLen: [null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,null,[4,4],null,null,null],
    },
    // section 1
    {
      lead: [n('C3'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('B2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      twinkle: seq('E5 . . G5 A5 . . G5 . . . . . . . A5 | B5 . . C6 B5 A#5 . A5 . . . . . . . D#5'),
      twinkleLen: [1,null,null,1,1,null,null,5,null,null,null,null,null,null,null,1,1,null,null,1,1,2,null,5,null,null,null,null,null,null,null,1],
    },
    // section 2
    {
      lead: [n('A#2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, null, n('E2'), null, null, null, [n('C#3'), n('G3')], null, null, n('E2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      twinkle: seq('E5 . . G5 A5 . . G5 . . . . . . . G#5 | A5 . . A#5 A5 G#5 . G5 . . . . . . . G#5'),
      twinkleLen: [1,null,null,1,1,null,null,5,null,null,null,null,null,null,null,1,1,null,null,1,1,2,null,5,null,null,null,null,null,null,null,1],
    },
    // section 3
    {
      lead: [n('F2'), null, null, null, [n('C3'), n('F3')], null, null, n('F2'), n('F#2'), null, null, null, [n('C3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('A3')], null, null, null],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[4,4],null,null,null],
      twinkle: seq('A5 . . B5 C6 . . A5 . . . . . . . G#5 | G5 . . G#5 A5 . . E5 . . . . . . . .'),
      twinkleLen: [1,null,null,1,1,null,null,5,null,null,null,null,null,null,null,1,1,null,null,1,1,null,null,5,null,null,null,null,null,null,null,null],
    },
    // section 4
    {
      lead: [[n('D2'), n('D3'), n('F3'), n('C4')], null, null, null, null, null, null, [n('D2'), n('D3'), n('F3'), n('C4')], null, null, null, null, [n('D2'), n('D3'), n('F3'), n('C4')], null, null, [n('G2'), n('D3'), n('G3'), n('B3')], null, null, null, null, null, null, null, [n('G2'), n('D3'), n('G3'), n('B3')], [n('A2'), n('E3'), n('A3'), n('C4')], null, null, [n('A2'), n('E3'), n('A3'), n('C4')], [n('B2'), n('F3'), n('B3'), n('D4')], null, null, [n('B2'), n('F3'), n('B3'), n('D4')]],
      leadLen: [[5,5,5,5],null,null,null,null,null,null,[4,4,4,5],null,null,null,null,[1,1,1,1],null,null,[6,6,6,6],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[1,1,1,1]],
      twinkle: seq('E5 . . C5 A4 . . E5 C5 . . A4 C5 . . G5 | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,null,1,1,null,null,1,1,null,null,1,1,null,null,6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 5
    {
      lead: [n('C3'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('B2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('E5 . . . . . . . . . . . . . . . | D#5 . . . . . . . . . . . B5 . . A5'),
      leadHarmLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,3,null,null,1],
      chords: [[n('C4'), n('E4')], null, null, [n('E4'), n('G4')], [n('E4'), n('A4')], null, null, [n('E4'), n('G4')], null, null, null, null, null, null, null, [n('E4'), n('A4')], [n('G4'), n('B4')], null, null, [n('G4'), n('C5')], [n('G4'), n('B4')], [n('G4'), n('A#4')], null, [n('D#4'), n('A4')], null, null, null, null, null, null, null, [n('D#4')]],
      chordsLen: [[1,1],null,null,[1,1],[1,1],null,null,[5,5],null,null,null,null,null,null,null,[1,1],[1,1],null,null,[1,1],[1,1],[2,2],null,[5,5],null,null,null,null,null,null,null,[1]],
    },
    // section 6
    {
      lead: [n('A#2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, null, n('E2'), null, null, null, [n('C#3'), n('G3')], null, null, n('E2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('G5 . . . . . . . . . . . D5 . . . | C#5 . . . . . . . . . . . A4 . . .'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('D4'), n('E4')], null, null, [n('D4'), n('G4')], [n('D4'), n('A4')], null, null, [n('D4'), n('G4')], null, null, null, null, null, null, null, [n('D4'), n('G#4')], [n('E4'), n('A4')], null, null, [n('E4'), n('A#4')], [n('E4'), n('A4')], [n('E4'), n('G#4')], null, [n('E4'), n('G4')], null, null, null, null, null, null, null, [n('E4'), n('G#4')]],
      chordsLen: [[1,1],null,null,[1,1],[1,1],null,null,[5,5],null,null,null,null,null,null,null,[1,1],[1,1],null,null,[1,1],[1,1],[2,2],null,[5,5],null,null,null,null,null,null,null,[1,1]],
    },
    // section 7
    {
      lead: [n('F2'), null, null, null, [n('C3'), n('F3')], null, null, n('F2'), n('F#2'), null, null, null, [n('C3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('A3')], null, null, null],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[4,4],null,null,null],
      leadHarm: seq('C5 . . . . . . . . . . . A4 . . . | E5 . . . . . . . . . . . D#5 . . E5'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1],
      chords: [[n('F4'), n('A4')], null, null, [n('G4'), n('B4')], [n('A4'), n('C5')], null, null, [n('F#4'), n('A4')], null, null, null, null, null, null, null, [n('F#4'), n('G#4')], [n('E4'), n('G4')], null, null, [n('E4'), n('G#4')], [n('E4'), n('A4')], null, null, [n('G4'), n('E5')], null, null, null, null, null, null, null, null],
      chordsLen: [[1,1],null,null,[1,1],[1,1],null,null,[5,5],null,null,null,null,null,null,null,[1,1],[1,1],null,null,[1,1],[1,1],null,null,[5,5],null,null,null,null,null,null,null,null],
    },
    // section 8
    {
      lead: [[n('D2'), n('D3'), n('F3'), n('C4')], null, null, null, null, null, null, [n('G2'), n('D3'), n('G3'), n('B3')], null, null, null, null, [n('G2'), n('D3'), n('G3'), n('B3')], null, null, [n('C3'), n('E3'), n('G3'), n('C4')], null, null, null, null, [n('E3'), n('G3'), n('C4')], null, null, [n('E3'), n('G3'), n('C4')], [n('D#3'), n('F#3'), n('B3')], null, null, [n('D#3'), n('F#3'), n('B3')], [n('D3'), n('F3'), n('A#3')], null, null, [n('D3'), n('F3'), n('A#3')]],
      leadLen: [[5,5,5,5],null,null,null,null,null,null,[4,4,4,4],null,null,null,null,[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,[1,1,1],null,null,[1,1,1],[1,1,1],null,null,[1,1,1],[1,1,1],null,null,[1,1,1]],
      leadHarm: seq('A5 . . . . . . E5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [5,null,null,null,null,null,null,13,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('E4'), n('C5')], null, null, [n('E4'), n('C5')], [n('D#4'), n('B4')], null, null, [n('D#4'), n('B4')], [n('D4'), n('A#4')], null, null, [n('D4'), n('A#4')]],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],null,null,[1,1],[1,1],null,null,[1,1],[1,1],null,null,[1,1]],
      chords: [[n('A4'), n('E5')], null, null, [n('G#4'), n('D#5')], [n('A4'), n('E5')], null, null, [n('F4'), n('C5')], null, null, null, [n('F4'), n('C5')], [n('F4'), n('A4')], null, null, [n('E4'), n('C5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1,1],null,null,[1,1],[1,1],null,null,[1,1],null,null,null,[1,1],[1,1],null,null,[5,5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 9
    {
      lead: [n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, n('A2'), n('E2'), null, null, null, [n('C#3'), n('G3')], null, null, n('E2'), n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, n('A2'), n('E2'), null, null, null, [n('A2'), n('C#3'), n('G3')], n('E2'), null, n('D#2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[1,3,3],2,null,1],
      leadHarm: seq('A4 . . . A4 . . A4 E5 . . A4 B4 . . A4 | A4 . . . E5 . . A4 B4 . . A4 G#4 . . A4'),
      leadHarmLen: [4,null,null,null,3,null,null,1,3,null,null,1,3,null,null,1,4,null,null,null,3,null,null,1,3,null,null,1,3,null,null,1],
      chords: [[n('C#4'), n('A4')], null, null, null, [n('G4'), n('E5')], null, null, null, [n('G4'), n('E5')], null, null, [n('G4'), n('E5')], [n('F#4'), n('D#5')], null, null, [n('G4'), n('E5')], [n('A4'), n('F5')], null, null, [n('G4'), n('E5')], [n('E4'), n('C#5')], null, null, [n('C#4'), n('A4')], null, null, null, null, null, null, null, [n('C#4'), n('A4')]],
      chordsLen: [[4,4],null,null,null,[4,4],null,null,null,[1,1],null,null,[1,1],[1,1],null,null,[1,1],[3,3],null,null,[1,1],[1,1],null,null,[5,5],null,null,null,null,null,null,null,[1,1]],
    },
    // section 10
    {
      lead: [n('D2'), null, null, null, [n('C3'), n('F#3')], null, null, n('D2'), n('A2'), null, null, null, [n('C3'), n('F#3')], null, null, n('A2'), n('D2'), null, null, null, [n('C3'), n('F#3')], null, null, n('A2'), n('D2'), null, null, n('D2'), [n('E2'), n('C3'), n('F#3')], null, null, n('F#2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,1,null,null,1,[1,3,3],null,null,1],
      leadHarm: seq('A4 . . . D5 . . A4 B4 . . A4 G#4 . . A4 | . . . G#4 A4 . . D5 . . . . . . . .'),
      leadHarmLen: [4,null,null,null,3,null,null,1,3,null,null,1,3,null,null,4,null,null,null,1,1,null,null,8,null,null,null,null,null,null,null,null],
      chords: [[n('G4'), n('E5')], null, null, [n('F#4'), n('D5')], [n('G4'), n('E5')], null, null, [n('F#4'), n('D5')], [n('G4'), n('E5')], null, null, [n('F#4'), n('D5')], [n('D4'), n('C5')], null, null, [n('C4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[3,3],null,null,[1,1],[3,3],null,null,[1,1],[3,3],null,null,[1,1],[1,1],null,null,[9,9],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 11
    {
      lead: [n('G2'), null, null, null, [n('B2'), n('F3')], null, null, n('G2'), n('D2'), null, null, null, [n('B2'), n('F3')], null, null, n('D2'), n('G2'), null, null, null, [n('B2'), n('F3')], null, null, n('G2'), n('G2'), null, null, null, [n('G2'), n('B2'), n('F3')], n('A2'), null, n('B2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[1,3,3],2,null,1],
      leadHarm: seq('G4 . . . D5 . . G4 A4 . . G4 F#4 . . G4 | G4 . . . D5 . . G4 A4 . . G4 F#4 . . G4'),
      leadHarmLen: [4,null,null,null,3,null,null,1,3,null,null,1,3,null,null,1,4,null,null,null,3,null,null,1,3,null,null,1,3,null,null,1],
      chords: [[n('B3'), n('G4')], null, null, null, [n('F4'), n('D5')], null, null, null, [n('F4'), n('D5')], null, null, [n('F4'), n('D5')], [n('E4'), n('C#5')], null, null, [n('F4'), n('D5')], [n('G4'), n('E5')], null, null, [n('F4'), n('D5')], [n('D4'), n('B4')], null, null, [n('B3'), n('G4')], null, null, null, null, null, null, null, [n('F4'), n('D5')]],
      chordsLen: [[4,4],null,null,null,[4,4],null,null,null,[1,1],null,null,[1,1],[1,1],null,null,[1,1],[3,3],null,null,[1,1],[1,1],null,null,[6,6],null,null,null,null,null,null,null,[1,1]],
    },
    // section 12
    {
      lead: [[n('C3'), n('E3'), n('G3')], null, null, null, [n('C3'), n('E3'), n('G3')], null, null, null, [n('C3'), n('E3'), n('G3')], null, null, [n('D3'), n('F3'), n('A3')], null, [n('D#3'), n('F#3'), n('A#3')], null, null, [n('E3'), n('G3'), n('B3')], null, null, null, null, null, null, null, [n('G2'), n('B2'), n('D#3'), n('G3')], null, null, null, null, null, null, null],
      leadLen: [[4,4,4],null,null,null,[4,4,4],null,null,null,[3,3,3],null,null,[2,2,2],null,[3,3,3],null,null,[3,3,3],null,null,null,null,null,null,null,[8,8,8,8],null,null,null,null,null,null,null],
      leadHarm: seq('C5 . . . C5 . . . C5 . . B4 . A4 . . | G4 . G4 A4 B4 C5 D5 E5 F5 G5 . . . . . .'),
      leadHarmLen: [4,null,null,null,4,null,null,null,3,null,null,2,null,3,null,null,2,null,1,1,1,1,1,1,1,7,null,null,null,null,null,null],
      chords: [[n('E4'), n('C5')], null, null, null, [n('E4'), n('C5')], null, null, null, [n('E4'), n('C5')], null, null, [n('F4'), n('D5')], null, [n('F#4'), n('D#5')], null, null, [n('G4'), n('E5')], null, null, null, null, null, null, null, [n('D#4'), n('G4')], null, null, null, null, null, null, null],
      chordsLen: [[4,4],null,null,null,[4,4],null,null,null,[3,3],null,null,[2,2],null,[3,3],null,null,[4,3],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
    },
    // section 13
    {
      lead: [n('C3'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('B2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('E5 . . . . . . . . . . . . . . . | D#5 . . . . . . . . . . . B5 . . A5'),
      leadHarmLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,3,null,null,1],
      chords: [[n('G3'), n('C4'), n('E4')], null, null, chord('C4'), [n('C4'), n('E4'), n('A4')], null, null, chord('C4'), null, null, null, null, null, null, null, [n('C4'), n('E4'), n('A4')], [n('D#4'), n('G4'), n('B4')], null, null, [n('D#4'), n('G4'), n('C5')], [n('D#4'), n('G4'), n('B4')], chord('D#4'), null, [n('B3'), n('D#4'), n('A4')], null, null, null, null, null, null, null, [n('B3'), n('D#4')]],
      chordsLen: [[1,1,1],null,null,[1,1,1],[1,1,1],null,null,[5,5,5],null,null,null,null,null,null,null,[1,1,1],[1,1,1],null,null,[1,1,1],[1,1,1],[2,2,2],null,[5,5,5],null,null,null,null,null,null,null,[1,1]],
    },
    // section 14
    {
      lead: [n('A#2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, null, n('E2'), null, null, null, [n('C#3'), n('G3')], null, null, n('E2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('G5 . . . . . . . . . . . D5 . . . | C#5 . . . . . . . . . . . A4 . . .'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('A#3'), n('D4'), n('E4')], null, null, [n('A#3'), n('D4'), n('G4')], [n('A#3'), n('D4'), n('A4')], null, null, [n('A#3'), n('D4'), n('G4')], null, null, null, null, null, null, null, [n('A#3'), n('D4'), n('G#4')], [n('C#4'), n('E4'), n('A4')], null, null, [n('C#4'), n('E4'), n('A#4')], [n('C#4'), n('E4'), n('A4')], chord('C#4min'), null, [n('C#4'), n('E4'), n('G4')], null, null, null, null, null, null, null, chord('C#4min')],
      chordsLen: [[1,1,1],null,null,[1,1,1],[1,1,1],null,null,[5,5,5],null,null,null,null,null,null,null,[1,1,1],[1,1,1],null,null,[1,1,1],[1,1,1],[2,2,2],null,[5,5,5],null,null,null,null,null,null,null,[1,1,1]],
    },
    // section 15
    {
      lead: [n('F2'), null, null, null, [n('C3'), n('F3')], null, null, n('F2'), n('F#2'), null, null, null, [n('C3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('A2'), n('C#3'), n('A3')], n('E2'), null, n('D#2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[1,4,4],2,null,1],
      leadHarm: seq('C5 . . . . . . . . . . . A4 . . . | E5 . . . . . . . . . . . D#5 . . E5'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1],
      chords: [[n('C4'), n('F4'), n('A4')], null, null, [n('C4'), n('G4'), n('B4')], [n('C4'), n('A4'), n('C5')], null, null, [n('D#4'), n('F#4'), n('A4')], null, null, null, null, null, null, null, [n('D#4'), n('F#4'), n('G#4')], chord('C4'), null, null, [n('C4'), n('E4'), n('G#4')], [n('C4'), n('E4'), n('A4')], null, null, [n('C#4'), n('G4'), n('E5')], null, null, null, null, null, null, null, null],
      chordsLen: [[1,1,1],null,null,[1,1,1],[1,1,1],null,null,[5,5,5],null,null,null,null,null,null,null,[1,1,1],[1,1,1],null,null,[1,1,1],[1,1,1],null,null,[5,5,5],null,null,null,null,null,null,null,null],
    },
    // section 16
    {
      lead: [n('C3'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('B2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('E5 . . . . . . . . . . . . . . . | D#5 . . . . . . . . . . . B5 . . A5'),
      leadHarmLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,3,null,null,1],
      chords: [[n('G3'), n('C4'), n('E4'), n('E5')], null, null, [n('C4'), n('E4'), n('G4'), n('G5')], [n('C4'), n('E4'), n('A4'), n('A5')], null, null, [n('C4'), n('E4'), n('G4'), n('G5')], null, null, null, null, null, null, null, [n('C4'), n('E4'), n('A4'), n('A5')], [n('D#4'), n('G4'), n('B4'), n('B5')], null, null, [n('D#4'), n('G4'), n('C5'), n('C6')], [n('D#4'), n('G4'), n('B4'), n('B5')], [n('D#4'), n('G4'), n('A#4'), n('A#5')], null, [n('B3'), n('D#4'), n('A4'), n('A5')], null, null, null, null, null, null, null, [n('B3'), n('D#4'), n('D#5')]],
      chordsLen: [[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],[2,2,2,2],null,[5,5,5,5],null,null,null,null,null,null,null,[1,1,1]],
    },
    // section 17
    {
      lead: [n('A#2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, null, n('E2'), null, null, null, [n('C#3'), n('G3')], null, null, n('E2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('G5 . . . . . . . . . . . D5 . . . | C#5 . . . . . . . . . . . A4 . . .'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('A#3'), n('D4'), n('E4'), n('E5')], null, null, [n('A#3'), n('D4'), n('G4'), n('G5')], [n('A#3'), n('D4'), n('A4'), n('A5')], null, null, [n('A#3'), n('D4'), n('G4'), n('G5')], null, null, null, null, null, null, null, [n('A#3'), n('D4'), n('G#4'), n('G#5')], [n('C#4'), n('E4'), n('A4'), n('A5')], null, null, [n('C#4'), n('E4'), n('A#4'), n('A#5')], [n('C#4'), n('E4'), n('A4'), n('A5')], [n('C#4'), n('E4'), n('G#4'), n('G#5')], null, [n('C#4'), n('E4'), n('G4'), n('G5')], null, null, null, null, null, null, null, [n('C#4'), n('E4'), n('G#4'), n('G#5')]],
      chordsLen: [[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],[2,2,2,2],null,[5,5,5,5],null,null,null,null,null,null,null,[1,1,1,1]],
    },
    // section 18
    {
      lead: [n('F2'), null, null, null, [n('C3'), n('F3')], null, null, n('F2'), n('F#2'), null, null, null, [n('C3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('A2'), n('C#3'), n('A3')], n('E2'), null, n('D#2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[1,4,4],2,null,1],
      leadHarm: seq('C5 . . . . . . . . . . . A4 . . . | E5 . . . . . . . . . . . D#5 . . E5'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1],
      chords: [[n('C4'), n('F4'), n('A4'), n('A5')], null, null, [n('C4'), n('G4'), n('B4'), n('B5')], [n('C4'), n('A4'), n('C5'), n('C6')], null, null, [n('D#4'), n('F#4'), n('A4'), n('A5')], null, null, null, null, null, null, null, [n('D#4'), n('F#4'), n('G#4'), n('G#5')], [n('C4'), n('E4'), n('G4'), n('G5')], null, null, [n('C4'), n('E4'), n('G#4'), n('G#5')], [n('C4'), n('E4'), n('A4'), n('A5')], null, null, [n('C#4'), n('G4'), n('E5'), n('E6')], null, null, null, null, null, null, null, null],
      chordsLen: [[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,null,null,null,null],
    },
    // section 19
    {
      chords: [[n('F4'), n('A4'), n('C5'), n('E5'), n('E6')], null, null, null, null, null, null, [n('F4'), n('A4'), n('C5'), n('E5'), n('E6')], [n('F4'), n('A4'), n('C5'), n('E5'), n('E6')], null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], null, null, null],
      chordsLen: [[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,[3,3,3,3,3],null,null,null],
      organChords: [null, null, null, [n('D2'), n('D3')], [n('D2'), n('D3')], null, null, null, null, null, null, [n('D2'), n('D3')], [n('D2'), n('D3')], null, null, null, null, null, null, [n('G2'), n('G3')], [n('G2'), n('G3')], null, null, null, null, null, null, [n('G2'), n('G3')], null, null, null, [n('G2'), n('G3')]],
      organChordsLen: [null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],null,null,null,[1,1]],
    },
    // section 20
    {
      lead: [n('C3'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('B2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('E5 . . . . . . . . . . . . . . . | D#5 . . . . . . . . . . . B5 . . A5'),
      leadHarmLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,3,null,null,1],
      chords: [[n('C4'), n('E4'), n('A4'), n('A5')], null, null, [n('C4'), n('E4'), n('G4'), n('G5')], [n('C4'), n('E4'), n('A4'), n('A5')], null, null, [n('C4'), n('E4'), n('G4'), n('G5')], null, null, null, null, null, null, null, [n('C4'), n('E4'), n('A4'), n('A5')], [n('B3'), n('D#4'), n('G4'), n('B4'), n('B5')], null, null, null, [n('B3'), n('D#4'), n('G4'), n('B4'), n('B5')], null, null, [n('B3'), n('D#4'), n('G4'), n('A4'), n('A5')], null, null, null, null, null, null, null, null],
      chordsLen: [[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1],[3,3,3,3,3],null,null,null,[3,3,3,3,3],null,null,[9,9,9,9,9],null,null,null,null,null,null,null,null],
    },
    // section 21
    {
      lead: [n('A#2'), null, null, null, [n('E3'), n('G3')], null, null, null, n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('C#3'), n('G3')], null, null, null, n('E2'), null, null, null, [n('C#3'), n('G3')], null, null, n('E2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('G5 . . . . . . . . . . . D5 . . . | C#5 . . . . . . . . . . . A4 . . .'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('A#3'), n('D4'), n('A4'), n('A5')], null, null, [n('A#3'), n('D4'), n('G4'), n('G5')], [n('A#3'), n('D4'), n('A4'), n('A5')], null, null, [n('A#3'), n('D4'), n('G4'), n('G5')], null, null, null, null, null, null, null, [n('A#3'), n('D4'), n('G#4'), n('G#5')], [n('C#4'), n('G4'), n('A4'), n('A5')], null, null, null, [n('C#4'), n('G4'), n('A4'), n('A5')], null, null, [n('C#4'), n('G4'), n('A4'), n('G5')], null, null, null, null, null, null, null, [n('C#4'), n('E4'), n('G#4'), n('G#5')]],
      chordsLen: [[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1],[3,3,3,3],null,null,null,[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1]],
    },
    // section 22
    {
      lead: [n('F2'), null, null, null, [n('C3'), n('F3')], null, null, n('F2'), n('F#2'), null, null, null, [n('C3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('A2'), n('C#3'), n('A3')], n('E2'), null, n('D#2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[1,4,4],2,null,1],
      leadHarm: seq('C5 . . . . . . . . . . . A4 . . . | E5 . . . . . . . . . . . D#5 . . E5'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1],
      chords: [[n('C4'), n('F4'), n('A4'), n('A5')], null, null, [n('C4'), n('G4'), n('B4'), n('B5')], [n('C4'), n('A4'), n('C5'), n('C6')], null, null, [n('D#4'), n('F#4'), n('A4'), n('A5')], null, null, null, null, null, null, null, [n('D#4'), n('F#4'), n('G#4'), n('G#5')], [n('C4'), n('E4'), n('G4'), n('G5')], null, null, [n('C4'), n('E4'), n('G#4'), n('G#5')], [n('C4'), n('E4'), n('A4'), n('A5')], null, null, [n('C#4'), n('G4'), n('E5'), n('E6')], null, null, null, null, null, null, null, null],
      chordsLen: [[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1],[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[5,5,5,5],null,null,null,null,null,null,null,null],
    },
    // section 23
    {
      leadHarm: [[n('E5'), n('G5'), n('C6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[32,32,32],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('E3'), n('C4')], null, null, null, null, [n('E3'), n('C4')], null, null, [n('E3'), n('A#3')], null, null, null, null, [n('E3'), n('A#3')], null, null, [n('C3'), n('A3')], null, null, null, null, [n('C3'), n('A3')], null, null, [n('C3'), n('G#3')], null, null, null, null, [n('C3'), n('G#3')], null, null],
      organChordsLen: [[3,3],null,null,null,null,[3,3],null,null,[3,3],null,null,null,null,[3,3],null,null,[3,3],null,null,null,null,[3,3],null,null,[3,3],null,null,null,null,[3,3],null,null],
    },
    // section 24
    {
      bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . G#4 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      leadHarm: seq('G3 . . B3 . D#4 . . G4 . . B4 . D#5 . . | G5 . . . . . . . . . . . D#4 . . .'),
      leadHarmLen: [32,null,null,29,null,23,null,null,20,null,null,17,null,19,null,null,16,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      organChords: [[n('B2'), n('G3')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#3')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[28,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[12],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 25
    {
      bass: seq('A4 . C5 . D5 . C5 . . . . . . . D5 . | E5 . . . E5 . D5 . . . . . . . G#4 .'),
      bassLen: [2,null,2,null,2,null,8,null,null,null,null,null,null,null,2,null,4,null,null,null,2,null,8,null,null,null,null,null,null,null,2,null],
      leadHarm: [[n('C3'), n('E4')], null, [n('E3'), n('G4')], null, [n('G3'), n('A4')], null, [n('C4'), n('G4')], null, [n('E5'), n('G5')], null, null, null, null, null, n('A4'), null, [n('B2'), n('B4')], null, n('D#3'), null, [n('G3'), n('B4')], null, [n('B3'), n('A4')], null, [n('D#5'), n('G5')], null, null, null, null, null, n('D#4'), null],
      leadHarmLen: [[16,2],null,[14,2],null,[12,2],null,[10,8],null,[8,8],null,null,null,null,null,2,null,[16,4],null,14,null,[12,2],null,[10,8],null,[8,8],null,null,null,null,null,2,null],
    },
    // section 26
    {
      bass: seq('A4 . C5 . D5 . C5 . . . . . . . C#5 . | D5 . . . D5 . C5 . . . . . . . . .'),
      bassLen: [2,null,2,null,2,null,8,null,null,null,null,null,null,null,2,null,4,null,null,null,2,null,10,null,null,null,null,null,null,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . E2'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1],
      leadHarm: [[n('A#2'), n('E4')], null, [n('D3'), n('G4')], null, [n('G3'), n('A4')], null, [n('D4'), n('G4')], null, [n('A#4'), n('G5')], null, null, null, null, null, n('G#4'), null, [n('A2'), n('A4')], null, n('C#3'), null, [n('G3'), n('A4')], null, [n('E4'), n('G4')], null, [n('A4'), n('G5')], null, null, null, null, null, null, null],
      leadHarmLen: [[16,2],null,[14,2],null,[12,2],null,[10,8],null,[8,8],null,null,null,null,null,2,null,[16,4],null,14,null,[12,2],null,[10,10],null,[8,8],null,null,null,null,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#4'), n('E4'), n('G#4'), n('G#5')]],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1,1]],
    },
    // section 27
    {
      lead: [n('F2'), null, null, null, [n('C3'), n('F3')], null, null, n('F2'), n('F#2'), null, null, null, [n('C3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('E3'), n('G3')], null, null, n('G2'), n('A2'), null, null, null, [n('A2'), n('C#3'), n('A3')], n('E2'), null, n('D#2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[1,4,4],2,null,1],
      leadHarm: seq('C5 . . . . . . . . . . . . . . . | E5 . . . . . . . . . . . D#5 . . E5'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1],
      chords: [[n('C4'), n('F4'), n('A4'), n('A5')], null, null, [n('C4'), n('G4'), n('B4'), n('B5')], [n('C4'), n('A4'), n('C5'), n('C6')], null, null, [n('D#4'), n('F#4'), n('A4'), n('A5')], null, null, null, null, null, null, null, [n('D#4'), n('F#4'), n('G#4'), n('G#5')], [n('C4'), n('E4'), n('G4'), n('G5')], null, null, [n('C4'), n('E4'), n('G#4'), n('G#5')], [n('C4'), n('E4'), n('A4'), n('A5')], null, null, [n('C#4'), n('G4'), n('E5'), n('E6')], null, null, null, null, null, null, null, null],
      chordsLen: [[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,null,[1,1,1,1],[1,1,1,1],null,null,[5,5,5,5],null,null,null,null,null,null,null,null],
    },
    // section 28
    {
      chords: [[n('F4'), n('A4'), n('C5'), n('E5'), n('E6')], null, null, null, null, null, null, [n('F4'), n('A4'), n('C5'), n('E5'), n('E6')], [n('F4'), n('A4'), n('C5'), n('E5'), n('E6')], null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], [n('G4'), n('B4'), n('D#5'), n('G5'), n('G6')], null, null, null, null, null, null, null],
      chordsLen: [[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[4,4,4,4,4],null,null,null,null,null,null,null],
      organChords: [null, null, null, [n('D2'), n('D3')], [n('D2'), n('D3')], null, null, null, null, null, null, [n('D2'), n('D3')], [n('D2'), n('D3')], null, null, null, null, null, null, [n('G2'), n('G3')], [n('G2'), n('G3')], null, null, null, null, null, null, null, [n('G2'), n('G3')], null, null, null],
      organChordsLen: [null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,null,[4,4],null,null,null],
    },
    // section 29
    {
      lead: [n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('B2'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('B2'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null],
      leadHarm: [[n('G4'), n('C5'), n('E5')], null, [n('C5'), n('E5'), n('G5')], null, [n('C5'), n('E5'), n('A5')], null, [n('C5'), n('E5'), n('G5')], null, null, null, null, null, null, null, [n('C5'), n('E5'), n('A5')], null, [n('D#5'), n('G5'), n('B5')], null, null, null, [n('D#5'), n('G5'), n('B5')], null, [n('D#5'), n('G5'), n('A5')], null, null, null, null, null, null, null, [n('A4'), n('B4'), n('D#5')], null],
      leadHarmLen: [[2,2,2],null,[1,1,1],null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null,[4,4,4],null,null,null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null],
      twinkle: seq('. . . . . . . . . . G5 . A5 . C6 . | B5 C6 B5 . . . . . . . E5 . G5 . B5 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,1,1,4,null,null,null,null,null,null,null,2,null,2,null,2,null],
    },
    // section 30
    {
      lead: [n('A#2'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('A#2'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null],
      leadHarm: [[n('A#4'), n('D5'), n('E5')], null, [n('A#4'), n('D5'), n('G5')], null, [n('A#4'), n('D5'), n('A5')], null, [n('A#4'), n('D5'), n('G5')], null, null, null, null, null, null, null, [n('A#4'), n('D5'), n('G#5')], null, [n('C#5'), n('E5'), n('A5')], null, null, null, [n('C#5'), n('E5'), n('A5')], null, [n('C#5'), n('E5'), n('G5')], null, null, null, null, null, null, null, [n('C#5'), n('E5'), n('G#5')], null],
      leadHarmLen: [[2,2,2],null,[1,1,1],null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null,[4,4,4],null,null,null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null],
      twinkle: seq('A5 B5 A5 . . . . . . . D5 . E5 . A5 . | G5 A5 G5 . . . . . . . F4 G4 A4 B4 C5 D5'),
      twinkleLen: [1,1,4,null,null,null,null,null,null,null,2,null,2,null,2,null,1,1,4,null,null,null,null,null,null,null,1,1,1,1,1,1],
    },
    // section 31
    {
      lead: [n('F2'), null, [n('C3'), n('F3')], null, n('A2'), null, [n('C3'), n('F3')], null, n('F#2'), null, [n('C3'), n('F#3')], null, n('A2'), null, [n('C3'), n('F#3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C3'), null, [n('E3'), n('G3')], null, n('A2'), null, [n('E3'), n('G3')], null, n('C#3'), null, [n('E3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null],
      leadHarm: [[n('C5'), n('F5'), n('A5')], null, [n('C5'), n('G5'), n('B5')], null, [n('C5'), n('A5'), n('C6')], null, [n('D#5'), n('F#5'), n('A5')], null, null, null, null, null, null, null, [n('C5'), n('D#5'), n('G#5')], null, [n('C5'), n('E5'), n('G5')], null, [n('C5'), n('E5'), n('G#5')], null, [n('C5'), n('G5'), n('A5')], null, [n('A4'), n('C#5'), n('E5')], null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[2,2,2],null,[2,2,2],null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[1,1,1],null,[9,9,9],null,null,null,null,null,null,null,null,null],
      twinkle: seq('E5 F5 E5 . . . . . . . A4 B4 C5 D5 E5 F5 | G5 A5 G5 . . . . . . . D5 E5 F5 G5 A5 B5'),
      twinkleLen: [1,1,4,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,4,null,null,null,null,null,null,null,1,1,1,1,1,1],
    },
    // section 32
    {
      lead: [n('D3'), null, [n('F3'), n('A3')], null, n('A2'), null, [n('F3'), n('A3')], null, n('D3'), null, [n('F3'), n('A3')], null, n('A2'), null, [n('F3'), n('A3')], null, n('G2'), null, [n('G3'), n('B3')], null, n('D3'), null, [n('G3'), n('B3')], null, n('G2'), null, [n('G3'), n('B3')], null, n('D3'), null, [n('G3'), n('B3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null],
      leadHarm: [[n('A4'), n('C5'), n('E5')], null, null, [n('F4'), n('A4'), n('D#5')], [n('F4'), n('A4'), n('D5')], null, [n('A4'), n('C5'), n('E5')], null, null, [n('F4'), n('A4'), n('D#5')], [n('F4'), n('A4'), n('D5')], null, [n('A4'), n('C5'), n('E5')], null, [n('F4'), n('A4'), n('D5')], null, [n('B4'), n('D5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[3,3,3],null,null,[1,1,1],[1,1,1],null,[3,3,3],null,null,[1,1,1],[1,1,1],null,[1,1,1],null,[1,1,1],null,[15,15,15],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C6 . . . . . . . . . . . . . . . | B5 . . . . . . . . . B5 C6 B5 A5 G5 F5'),
      twinkleLen: [14,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1],
    },
    // section 33
    {
      lead: [n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('B2'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('B2'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null],
      leadHarm: [[n('G4'), n('C5'), n('E5')], null, [n('C5'), n('E5'), n('G5')], null, [n('C5'), n('E5'), n('A5')], null, [n('C5'), n('E5'), n('G5')], null, null, null, null, null, null, null, [n('C5'), n('E5'), n('A5')], null, [n('D#5'), n('G5'), n('B5')], null, null, null, [n('D#5'), n('G5'), n('B5')], null, [n('D#5'), n('G5'), n('A5')], null, null, null, null, null, null, null, [n('A4'), n('B4'), n('D#5')], null],
      leadHarmLen: [[2,2,2],null,[1,1,1],null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null,[4,4,4],null,null,null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null],
      twinkle: seq('E5 . . . . . . . . . G5 . A5 . C6 . | B5 C6 B5 . . . . . . . E5 . G5 . B5 .'),
      twinkleLen: [6,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,1,1,4,null,null,null,null,null,null,null,2,null,2,null,2,null],
    },
    // section 34
    {
      lead: [n('F2'), null, [n('C3'), n('F3')], null, n('A2'), null, [n('C3'), n('F3')], null, n('F#2'), null, [n('C3'), n('F#3')], null, n('A2'), null, [n('C3'), n('F#3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C3'), null, [n('E3'), n('G3')], null, n('A2'), null, [n('E3'), n('G3')], null, n('C#3'), null, [n('E3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null],
      leadHarm: [[n('C5'), n('F5'), n('A5')], null, [n('C5'), n('G5'), n('B5')], null, [n('C5'), n('A5'), n('C6')], null, [n('D#5'), n('F#5'), n('A5')], null, null, null, null, null, null, null, [n('C5'), n('D#5'), n('G#5')], null, [n('C5'), n('E5'), n('G5')], null, [n('C5'), n('E5'), n('G#5')], null, [n('C5'), n('G5'), n('A5')], null, [n('A5'), n('C#6'), n('E6')], null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[2,2,2],null,[2,2,2],null,[1,1,1],null,[8,8,8],null,null,null,null,null,null,null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[1,1,1],null,[9,9,9],null,null,null,null,null,null,null,null,null],
      twinkle: seq('E5 F5 E5 . . . . . . . A4 B4 C5 D5 E5 F5 | G5 A5 G5 . . . . . . . D5 E5 F5 G5 A5 B5'),
      twinkleLen: [1,1,4,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,4,null,null,null,null,null,null,null,1,1,1,1,1,1],
    },
    // section 35
    {
      lead: [n('D3'), null, [n('F3'), n('A3')], null, n('A2'), null, [n('F3'), n('A3')], null, n('G2'), null, [n('G3'), n('B3')], null, n('D3'), null, [n('G3'), n('B3')], null, n('C3'), null, [n('E3'), n('C4')], null, n('G2'), null, [n('E3'), n('C4')], null, n('C3'), null, [n('C3'), n('E3'), n('C4')], null, n('B2'), null, [n('A#2'), n('E3'), n('C4')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2,2],null],
      leadHarm: [[n('A5'), n('C6'), n('E6')], null, [n('G#5'), n('B5'), n('D#6')], null, [n('A5'), n('C6'), n('E6')], null, [n('F5'), n('A5'), n('C6')], null, null, null, [n('F5'), n('A5'), n('C6')], null, [n('D5'), n('F5'), n('A5')], null, null, null, [n('E5'), n('G5'), n('C6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[2,2,2],null,[2,2,2],null,[2,2,2],null,[4,4,4],null,null,null,[2,2,2],null,[4,4,4],null,null,null,[8,8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C6 . . . . . . . B5 . . . . . . . | C6 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 36
    {
      lead: [n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('A2'), n('C#3'), n('G3')], null, n('B2'), null, [n('C#3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2],null],
      leadHarm: [[n('C#4'), n('A4')], null, null, null, [n('G4'), n('E5')], null, null, null, null, null, [n('G4'), n('E5')], null, [n('F#4'), n('D#5')], null, [n('G4'), n('E5')], null, [n('A4'), n('F5')], null, [n('G4'), n('E5')], null, null, null, [n('C#4'), n('A4')], null, null, null, null, null, null, null, [n('C#4'), n('A4')], null],
      leadHarmLen: [[4,4],null,null,null,[2,2],null,null,null,null,null,[2,2],null,[2,2],null,[2,2],null,[2,2],null,[2,2],null,null,null,[6,6],null,null,null,null,null,null,null,[2,2],null],
      twinkle: [[n('C#5'), n('A5')], null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('A5')], null, null, null, [n('G5'), n('E6')], null, null, null, null, null, null, null, null, null, [n('G5'), n('E6')], null, [n('F#5'), n('D#6')], null, [n('G5'), n('E6')], null],
      twinkleLen: [[10,10],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[8,8],null,null,null,null,null,null,null,null,null,[2,2],null,[2,2],null,[2,2],null],
    },
    // section 37
    {
      lead: [n('D3'), null, [n('F#3'), n('A3')], null, n('A2'), null, [n('F#3'), n('A3')], null, n('D3'), null, [n('F#3'), n('A3')], null, n('A2'), null, [n('F#3'), n('A3')], null, n('D3'), null, [n('F#3'), n('A3')], null, n('A2'), null, [n('F#3'), n('A3')], null, n('D3'), null, [n('C3'), n('F#3'), n('A3')], null, n('B2'), null, [n('A2'), n('F#3'), n('A3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2,2],null],
      leadHarm: [[n('G4'), n('E5')], null, [n('F#4'), n('D5')], null, [n('G4'), n('E5')], null, [n('F#4'), n('D5')], null, [n('G4'), n('E5')], null, [n('F#4'), n('D5')], null, null, null, [n('C4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[2,2],null,[2,2],null,[2,2],null,[2,2],null,[2,2],null,[2,2],null,null,null,[10,10],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [[n('C6'), n('A6')], null, null, null, null, null, null, null, [n('G5'), n('E6')], null, null, null, null, null, null, null, [n('F#5'), n('D6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[6,6],null,null,null,null,null,null,null,[6,6],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 38
    {
      lead: [n('G2'), null, [n('F3'), n('B3')], null, n('D3'), null, [n('F3'), n('B3')], null, n('G2'), null, [n('F3'), n('B3')], null, n('D3'), null, [n('F3'), n('B3')], null, n('G2'), null, [n('F3'), n('B3')], null, n('D3'), null, [n('F3'), n('B3')], null, n('G2'), null, [n('G2'), n('F3'), n('B3')], null, n('A2'), null, [n('B2'), n('F3'), n('B3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2,2],null],
      leadHarm: [[n('B3'), n('G4')], null, null, null, [n('F4'), n('D5')], null, null, null, null, null, [n('F4'), n('D5')], null, [n('E4'), n('C#5')], null, [n('F4'), n('D5')], null, [n('G4'), n('E5')], null, [n('F4'), n('D5')], null, null, null, [n('B3'), n('G4')], null, null, null, null, null, null, null, [n('F4'), n('D5')], null],
      leadHarmLen: [[4,4],null,null,null,[2,2],null,null,null,null,null,[2,2],null,[2,2],null,[2,2],null,[2,2],null,[2,2],null,null,null,[6,6],null,null,null,null,null,null,null,[2,2],null],
      twinkle: [[n('B4'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, [n('B4'), n('G5')], null, null, null, [n('F5'), n('D6')], null, null, null, null, null, null, null, null, null, null, null, [n('F5'), n('D6')], null, null, null],
      twinkleLen: [[10,10],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[10,10],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null],
    },
    // section 39
    {
      lead: [n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('E2'), null, [n('E3'), n('G#3')], null, n('B2'), null, [n('E3'), n('G#3')], null, n('E2'), null, [n('E2'), n('E3'), n('G#3')], null, n('F#2'), null, [n('G#2'), n('E3'), n('G#3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2,2],null],
      leadHarm: [[n('E4'), n('C5')], null, null, null, [n('E4'), n('C5')], null, null, null, [n('E4'), n('C5')], null, null, [n('F4'), n('D5')], null, [n('F#4'), n('D#5')], null, null, [n('G#4'), n('E5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[4,4],null,null,null,[4,4],null,null,null,[3,3],null,null,[2,2],null,[3,3],null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [[n('E5'), n('C6')], null, null, null, null, null, null, null, [n('E5'), n('C6')], null, null, [n('F5'), n('D6')], null, [n('G5'), n('D#6')], null, null, [n('G#5'), n('E6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[8,8],null,null,null,null,null,null,null,[3,3],null,null,[2,2],null,[3,3],null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 40
    {
      lead: [n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('C#3'), n('G3')], null, n('E2'), null, [n('C#3'), n('G3')], null, n('A2'), null, [n('A2'), n('C#3'), n('G3')], null, n('B2'), null, [n('C#3'), n('G3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2],null],
      leadHarm: [[n('C#4'), n('A4'), n('A5')], null, null, null, [n('G4'), n('E5'), n('E6')], null, null, null, null, null, [n('G4'), n('E5'), n('E6')], null, [n('F#4'), n('D#5'), n('D#6')], null, [n('G4'), n('E5'), n('E6')], null, [n('A4'), n('F5'), n('F6')], null, [n('G4'), n('E5'), n('E6')], null, null, null, [n('C#4'), n('A4'), n('A5')], null, null, null, null, null, null, null, [n('C#4'), n('A4'), n('A5')], null],
      leadHarmLen: [[4,4,4],null,null,null,[2,2,2],null,null,null,null,null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,null,null,[6,6,6],null,null,null,null,null,null,null,[2,2,2],null],
      twinkle: [[n('C#5'), n('A5')], null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('A5')], null, null, null, [n('G5'), n('E6')], null, null, null, null, null, null, null, null, null, [n('G5'), n('E6')], null, [n('F#5'), n('D#6')], null, [n('G5'), n('E6')], null],
      twinkleLen: [[10,10],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[8,8],null,null,null,null,null,null,null,null,null,[2,2],null,[2,2],null,[2,2],null],
    },
    // section 41
    {
      lead: [n('D3'), null, [n('F#3'), n('A3')], null, n('A2'), null, [n('F#3'), n('A3')], null, n('D3'), null, [n('F#3'), n('A3')], null, n('A2'), null, [n('F#3'), n('A3')], null, n('D3'), null, [n('F#3'), n('A3')], null, n('A2'), null, [n('F#3'), n('A3')], null, n('D3'), null, [n('C3'), n('F#3'), n('A3')], null, n('B2'), null, [n('A2'), n('F#3'), n('A3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2,2],null],
      leadHarm: [[n('G4'), n('E5'), n('E6')], null, [n('F#4'), n('D5'), n('D6')], null, [n('G4'), n('E5'), n('E6')], null, [n('F#4'), n('D5'), n('D6')], null, [n('G4'), n('E5'), n('E6')], null, [n('F#4'), n('D5'), n('D6')], null, null, null, [n('C4'), n('A4'), n('A5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,null,null,[10,10,10],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [[n('C6'), n('A6')], null, null, null, null, null, null, null, [n('G5'), n('E6')], null, null, null, null, null, null, null, [n('F#5'), n('D6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[6,5],null,null,null,null,null,null,null,[6,6],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 42
    {
      lead: [n('G2'), null, [n('F3'), n('B3')], null, n('D3'), null, [n('F3'), n('B3')], null, n('G2'), null, [n('F3'), n('B3')], null, n('D3'), null, [n('F3'), n('B3')], null, n('G2'), null, [n('F3'), n('B3')], null, n('D3'), null, [n('F3'), n('B3')], null, n('G2'), null, [n('G2'), n('F3'), n('B3')], null, n('A2'), null, [n('B2'), n('F3'), n('B3')], null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2,2],null,2,null,[2,2,2],null],
      leadHarm: [[n('B3'), n('G4'), n('G5')], null, null, null, [n('F4'), n('D5'), n('D6')], null, null, null, null, null, [n('F4'), n('D5'), n('D6')], null, [n('E4'), n('C#5'), n('C#6')], null, [n('F4'), n('D5'), n('D6')], null, [n('G4'), n('E5'), n('E6')], null, [n('F4'), n('D5'), n('D6')], null, null, null, [n('B3'), n('G4'), n('G5')], null, null, null, null, null, null, null, [n('F4'), n('D5'), n('D6')], null],
      leadHarmLen: [[4,4,4],null,null,null,[2,2,2],null,null,null,null,null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,[2,2,2],null,null,null,[6,6,6],null,null,null,null,null,null,null,[2,2,2],null],
      twinkle: [[n('B4'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, [n('B4'), n('G5')], null, null, null, [n('F5'), n('D6')], null, null, null, null, null, null, null, null, null, null, null, [n('F5'), n('D6')], null, null, null],
      twinkleLen: [[10,10],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[10,10],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null],
    },
    // section 43
    {
      lead: [n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C3'), null, [n('E3'), n('G3')], null, n('G2'), null, [n('E3'), n('G3')], null, n('C2'), null, null, null, null, null, null, null, n('G2'), null, null, null, null, null, null, null],
      leadLen: [2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,2,null,[2,2],null,4,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadHarm: [[n('E4'), n('C5'), n('C6')], null, null, null, [n('E4'), n('C5'), n('C6')], null, null, null, [n('E4'), n('C5'), n('C6')], null, null, [n('F4'), n('D5'), n('D6')], null, [n('F#4'), n('D#5'), n('D#6')], null, null, [n('G4'), n('E5'), n('E6')], null, null, null, null, null, null, null, [n('G4'), n('B4'), n('D#5'), n('G5')], null, null, null, null, null, null, null],
      leadHarmLen: [[4,4,4],null,null,null,[4,4,4],null,null,null,[3,3,3],null,null,[2,2,2],null,[3,3,3],null,null,[4,4,4],null,null,null,null,null,null,null,[8,8,8,8],null,null,null,null,null,null,null],
      twinkle: [[n('E5'), n('C6')], null, null, null, null, null, null, null, [n('E5'), n('C6')], null, null, [n('F5'), n('D6')], null, [n('F#5'), n('D#6')], null, null, [n('G5'), n('E6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[8,8],null,null,null,null,null,null,null,[3,3],null,null,[2,2],null,[3,3],null,null,[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 44
    {
      chords: [[n('F#4'), n('A#4'), n('C#5'), n('F5'), n('F6')], null, null, null, null, null, null, [n('F#4'), n('A#4'), n('C#5'), n('F5'), n('F6')], [n('F#4'), n('A#4'), n('C#5'), n('F5'), n('F6')], null, null, null, null, null, null, [n('G#4'), n('C5'), n('E5'), n('G#5'), n('G#6')], [n('G#4'), n('C5'), n('E5'), n('G#5'), n('G#6')], null, null, null, null, null, null, [n('G#4'), n('C5'), n('E5'), n('G#5'), n('G#6')], [n('G#4'), n('C5'), n('E5'), n('G#5'), n('G#6')], null, null, null, [n('G#4'), n('C5'), n('E5'), n('G#5'), n('G#6')], null, null, null],
      chordsLen: [[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,null,null,null,[1,1,1,1,1],[3,3,3,3,3],null,null,null,[3,3,3,3,3],null,null,null],
      organChords: [null, null, null, [n('D#2'), n('D#3')], [n('D#2'), n('D#3')], null, null, null, null, null, null, [n('D#2'), n('D#3')], [n('D#2'), n('D#3')], null, null, null, null, null, null, [n('G#2'), n('G#3')], [n('G#2'), n('G#3')], null, null, null, null, null, null, [n('G#2'), n('G#3')], null, null, null, [n('G#2'), n('G#3')]],
      organChordsLen: [null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],[3,3],null,null,null,null,null,null,[1,1],null,null,null,[1,1]],
    },
    // section 45
    {
      lead: [n('C#3'), null, null, null, [n('F3'), n('G#3')], null, null, null, n('G#2'), null, null, null, [n('F3'), n('G#3')], null, null, n('G#2'), n('C3'), null, null, null, [n('F3'), n('G#3')], null, null, null, n('G#2'), null, null, null, [n('F3'), n('G#3')], null, null, n('G#2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('F5 . . . . . . . . . . . . . . . | E5 . . . . . . . . . . . C6 . . A#5'),
      leadHarmLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,3,null,null,1],
      chords: [[n('C#4'), n('F4'), n('A#4'), n('A#5')], null, null, [n('C#4'), n('F4'), n('G#4'), n('G#5')], [n('C#4'), n('F4'), n('A#4'), n('A#5')], null, null, [n('C#4'), n('F4'), n('G#4'), n('G#5')], null, null, null, null, null, null, null, [n('C#4'), n('F4'), n('A#4'), n('A#5')], [n('C4'), n('E4'), n('G#4'), n('C5'), n('C6')], null, null, null, [n('C4'), n('E4'), n('G#4'), n('C5'), n('C6')], null, null, [n('C4'), n('E4'), n('G#4'), n('A#4'), n('A#5')], null, null, null, null, null, null, null, null],
      chordsLen: [[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1],[3,3,3,3,3],null,null,null,[3,3,3,3,3],null,null,[9,9,9,9,9],null,null,null,null,null,null,null,null],
    },
    // section 46
    {
      lead: [n('B2'), null, null, null, [n('F3'), n('G#3')], null, null, null, n('G#2'), null, null, null, [n('F3'), n('G#3')], null, null, n('G#2'), n('A#2'), null, null, null, [n('D3'), n('G#3')], null, null, null, n('F2'), null, null, null, [n('D3'), n('G#3')], null, null, n('F2')],
      leadLen: [4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,null,4,null,null,null,[3,3],null,null,1],
      leadHarm: seq('G#5 . . . . . . . . . . . D#5 . . . | D5 . . . . . . . . . . . A#4 . . .'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('B3'), n('D#4'), n('A#4'), n('A#5')], null, null, [n('B3'), n('D#4'), n('G#4'), n('G#5')], [n('B3'), n('D#4'), n('A#4'), n('A#5')], null, null, [n('B3'), n('D#4'), n('G#4'), n('G#5')], null, null, null, null, null, null, null, [n('B3'), n('D#4'), n('A4'), n('A5')], [n('D4'), n('G#4'), n('A#4'), n('A#5')], null, null, null, [n('D4'), n('G#4'), n('A#4'), n('A#5')], null, null, [n('D4'), n('G#4'), n('A#4'), n('G#5')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A4'), n('A5')]],
      chordsLen: [[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1],[3,3,3,3],null,null,null,[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1]],
    },
    // section 47
    {
      lead: [n('F#2'), null, null, null, [n('C#3'), n('F#3')], null, null, n('F#2'), n('G2'), null, null, null, [n('C#3'), n('G3')], null, null, n('G2'), n('G#2'), null, null, null, [n('F3'), n('G#3')], null, null, n('G#2'), n('A#2'), null, null, null, [n('A#2'), n('D3'), n('A#3')], n('F2'), null, n('E2')],
      leadLen: [4,null,null,null,[3,3],null,null,1,4,null,null,null,[3,3],null,null,1,4,null,null,null,[4,4],null,null,1,4,null,null,null,[1,4,4],2,null,1],
      leadHarm: seq('C#5 . . . . . . . . . . . A#4 . . . | F5 . . . . . . . . . . . E5 . . F5'),
      leadHarmLen: [12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,1,null,null,1],
      chords: [[n('C#4'), n('F#4'), n('A#4'), n('A#5')], null, null, [n('C#4'), n('G#4'), n('C5'), n('C6')], [n('C#4'), n('A#4'), n('C#5'), n('C#6')], null, null, [n('E4'), n('G4'), n('A#4'), n('A#5')], null, null, null, null, null, null, null, [n('E4'), n('G4'), n('A4'), n('A5')], [n('C#4'), n('F4'), n('G#4'), n('G#5')], null, null, [n('C#4'), n('F4'), n('A4'), n('A5')], [n('C#4'), n('F4'), n('A#4'), n('A#5')], null, null, [n('D4'), n('G#4'), n('F5'), n('F6')], null, null, null, null, null, null, null, null],
      chordsLen: [[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[8,8,8,8],null,null,null,null,null,null,null,[1,1,1,1],[3,3,3,3],null,null,[1,1,1,1],[3,3,3,3],null,null,[5,5,5,5],null,null,null,null,null,null,null,null],
    },
    // section 48
    {
      lead: seq('C#2 . . C#2 . C#2 . . F2 . . F2 . F2 . . | F#2 . . F#2 . F#2 . . G2 . . G2 . G2 . .'),
      leadLen: [3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null,3,null,null,2,null,3,null,null],
      leadHarm: [[n('F5'), n('G#5'), n('C#6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[32,32,32],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('F4'), n('G#4'), n('C#5')], null, null, null, null, [n('F4'), n('G#4'), n('C#5')], null, null, [n('F4'), n('G#4'), n('B4')], null, null, null, null, [n('F4'), n('G#4'), n('B4')], null, null, [n('C#4'), n('F#4'), n('A#4')], null, null, null, null, [n('C#4'), n('F#4'), n('A#4')], null, null, [n('C#4'), n('F#4'), n('A4')], null, null, null, null, [n('C#4'), n('F#4'), n('A4')], null, null],
      chordsLen: [[3,3,3],null,null,null,null,[3,3,3],null,null,[3,3,3],null,null,null,null,[3,3,3],null,null,[3,3,3],null,null,null,null,[3,3,3],null,null,[3,3,3],null,null,null,null,[3,3,3],null,null],
    },
    // section 49
    {
      lead: seq('G#2 . . . . . . . G#2 . . . . C#2 . . | . . . . . . . . . . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,5,null,null,null,null,19,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('C4'), n('D#4'), n('G#4')], null, null, null, null, null, null, null, [n('G#3'), n('C4'), n('E4')], null, null, null, null, chord('G#3min'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[7,7,7],null,null,null,null,null,null,null,[5,5,5],null,null,null,null,[19,19,19],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 16, 17, 18, 19, 20, 21, 22, 19, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 30, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 29, 30, 31, 32, 33, 30, 34, 0, 16, 17, 18, 19, 20, 21, 22, 19, 44, 45, 46, 47, 44, 48, 49],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "kick2", from: "kick", independent: true }, { key: "snare2", from: "snare", independent: true }, { key: "clap2", from: "clap", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "hats2", from: "hats", independent: true }, { key: "ohats2", from: "ohats", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash2", from: "crash", independent: true }],
  voice: {"kick2Voice":"ds909KickPunch","snare2Voice":"snareCrisp","clap2Voice":"clap808","rim2Voice":"rimWood","hats2Voice":"hatClosed","ohats2Voice":"hatOpen","tom2Voice":"ds909Tom","crash2Voice":"ds909Crash"},
  voiceParams: {"snare2Voice":{"label":"Snare","category":"Snare","dur":1,"note":"The engine’s own snare as a preset: a bright noise band, a short decay and a hint of body. The one every song already uses.","noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.09},"body":{"type":"triangle","from":210,"to":140,"decay":0.06,"gain":0.375},"id":"snareCrisp","kind":"noise","factory":true,"level":0.01243,"peak":0.4818},"clap2Voice":{"label":"Clap","category":"Clap","dur":1,"note":"Four bursts a few milliseconds apart, each quieter than the last — which is all a clap is: one hit heard several times in a small room.","noise":{"type":"bandpass","freq":1900,"Q":1.4,"decay":0.11},"taps":[0,0.011,0.023,0.036],"tapFalloff":0.78,"id":"clap808","kind":"noise","factory":true,"level":0.010142,"peak":0.241},"rim2Voice":{"label":"= Wood Rim","category":"Perc","homeLane":"rim","dur":0.5,"note":"Lower and rounder, struck with a softer stick: a square knock on the front and a shell ringing under it. Sits where a wood block sits without being one.","osc":{"type":"square","from":1900,"to":1750,"sweep":0.006,"decay":0.012,"curve":"lin","gain":0.16},"ring":{"freq":780,"Q":80,"hit":0.004,"decay":0.2,"gain":1.2},"tone":{"freq":7000},"id":"rimWood","kind":"drum","factory":true,"level":0.004839,"peak":0.1212},"hats2Voice":{"label":"Closed Hat","category":"Hats","dur":0.5,"note":"A very short highpassed tick. The cheapest sound in the library and the one you need most of.","noise":{"type":"highpass","freq":7000,"Q":0.7,"decay":0.028},"id":"hatClosed","kind":"noise","factory":true,"level":0.013707,"peak":0.6646},"ohats2Voice":{"label":"Open Hat","category":"Hats","dur":2,"note":"The same band left to ring for a third of a second.","noise":{"type":"highpass","freq":6500,"Q":0.7,"decay":0.33},"id":"hatOpen","kind":"noise","factory":true,"level":0.056805,"peak":0.866}},
};

export const arrangement = {
  order: [{"s":50,"bars":1},{"s":29,"bars":1,"from":1},30,31,32,33,30,34,35,36,37,38,39,40,41,42,43,29,30,31,32,33,30,34],
  sections: [
    {
      base: 29,
      kick2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats2: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats2: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
};

export const variants = null;
