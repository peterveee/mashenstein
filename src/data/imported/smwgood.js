// SMWGOOD — imported from SMWGood.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 10 parts in the file, 10 lanes here — nothing was merged onto anything else.
// 4 of them are layers (lead2, lead3, lead4, lead5): real lanes with the
// notes below, declared in the mix at the foot of this file, and SILENT until you
// give each one a voice on the desk. A layer is a preset and nothing else.
import { seq, n } from '../../engine/notes.js';

export const id = "smwgood";
export const title = "SMWGOOD";
export const slug = "smwgood";
export const group = "imported";

export const bank = {
  bpm: 149,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      lead2: [null, null, null, null, null, null, null, null, n('D5'), null, n('D5'), null, n('D5'), null, n('D4'), null, n('D5'), null, n('D5'), null, n('D5'), null, n('D4'), null, n('D#5'), [n('C5'), n('D#5')], [n('C5'), n('D#5')], [n('C5'), n('D#5')], [n('C5'), n('D#5')], [n('C5'), n('D#5')], [n('C5'), n('D#5')], [n('C5'), n('D#5')]],
      lead2Len: [null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
      lead3: seq('. . . . . . . . D7 . D7 . D7 . D6 . | D7 . D7 . D7 . D6 . D#7 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,5,null,null,null,null,null,null,null],
      twinkle: [null, null, null, null, null, null, null, null, n('D6'), null, n('D6'), null, n('D6'), null, n('D5'), null, n('D6'), null, n('D6'), null, n('D6'), null, n('D5'), null, n('D#6'), [n('C6'), n('D#6')], [n('C6'), n('D#6')], [n('C6'), n('D#6')], [n('C6'), n('D#6')], [n('C6'), n('D#6')], [n('C6'), n('D#6')], [n('C6'), n('D#6')]],
      twinkleLen: [null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
      organChords: [null, null, null, null, null, null, null, null, [n('D5')], null, [n('D5')], null, [n('D5')], null, [n('D4')], null, [n('D5')], null, [n('D5')], null, [n('D5')], null, [n('D4')], null, [n('F5'), n('A5')], null, null, null, null, null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,[1],null,[1],null,[1],null,[1],null,[1],null,[1],null,[1],null,[1],null,[5,5],null,null,null,null,null,null,null],
    },
    // section 1
    {
      lead: seq('. . . . . . . . . . B4 . B4 . . . | . . B4 . B4 . . . . . B4 . B4 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null],
      lead2: [[n('C5'), n('D5')], null, n('A4'), null, n('D4'), null, null, null, null, null, n('D3'), null, n('G3'), null, null, null, null, null, n('D3'), null, n('G3'), null, null, null, null, null, n('D3'), null, n('B3'), null, null, null],
      lead2Len: [[1,1],null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      lead3: seq('D7 . . . . . D6 . B6 . B6 . B6 . D6 . | B6 . B6 . B6 . D6 . B6 . B6 . B6 . B6 C7'),
      lead3Len: [1,null,null,null,null,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,1,1],
      lead5: seq('. . . . . . D8 . B8 . B8 . B8 . D8 . | B8 . B8 . B8 . D8 . B8 . B8 . B8 . B8 C9'),
      lead5Len: [null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,1],
      twinkle: [[n('C6'), n('D6')], null, n('A5'), null, n('D5'), null, null, null, null, null, n('D4'), null, n('G4'), null, null, null, null, null, n('D4'), null, n('G4'), null, null, null, null, null, n('D4'), null, n('B4'), null, null, null],
      twinkleLen: [[1,1],null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      organChords: [[n('D5'), n('F#5')], null, null, null, null, null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null],
      organChordsLen: [[1,1],null,null,null,null,null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null],
    },
    // section 2
    {
      lead: seq('. . A4 . A4 . . . . . A4 . A4 . . . | . . A4 . A4 . . . . . A4 . . . A4 .'),
      leadLen: [null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,null,null,2,null],
      lead2: seq('A3 . . . A3 . . . . . D3 . A3 . . . | . . D3 . A3 . . . . . D3 . F#3 . . .'),
      lead2Len: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      lead3: seq('B6 . . . A6 . D6 . A6 . A6 . A6 . D6 . | A6 . A6 . A6 . D6 . A6 . A6 . A6 . A6 B6'),
      lead3Len: [4,null,null,null,1,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,1,1],
      lead5: seq('B8 . . . A8 . D8 . A8 . A8 . A8 . C#8 . | A8 . A8 . A8 . C#8 . A8 . A8 . A8 . A8 B8'),
      lead5Len: [2,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,1],
      twinkle: seq('A4 . . . A4 . . . . . D4 . A4 . . . | . . D4 . A4 . . . . . D4 . F#4 . . .'),
      twinkleLen: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      organChords: [[n('D3')], null, [n('F#5')], null, [n('F#5')], null, null, null, [n('D3')], null, [n('F#5')], null, [n('F#5')], null, null, null, [n('D3')], null, [n('F#5')], null, [n('F#5')], null, null, null, [n('D3')], null, [n('F#5')], null, null, null, [n('F#5')], null],
      organChordsLen: [[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,null,null,[2],null],
    },
    // section 3
    {
      lead: seq('. . B4 . B4 . . . . . B4 . B4 . . . | . . F5 . F5 . . . . . G5 . G5 . . .'),
      leadLen: [null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null],
      lead2: seq('G3 . . . G3 . . . . . D3 . G3 . . . | . . F3 . B3 . . . . . G3 . C4 . . .'),
      lead2Len: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      lead3: seq('A6 . . . G6 . D6 . B6 . B6 . B6 . D6 . | B6 . B6 . B6 . D6 . B6 . B6 . B6 . A6 B6'),
      lead3Len: [4,null,null,null,1,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,1,1],
      lead5: seq('A8 . . . G8 . C#8 . B8 . B8 . B8 . D8 . | B8 . B8 . B8 . D8 . B8 . B8 . B8 . A8 B8'),
      lead5Len: [2,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,1],
      leadHarm: seq('. . . . . . . . G6 . . . . . . . | F6 . . . . . . . E6 . . . . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null],
      twinkle: seq('G4 . . . G4 . . . . . D4 . G4 . . . | . . F4 . B4 . . . . . G4 . C5 . . .'),
      twinkleLen: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      organChords: [[n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('B3')], null, [n('B5')], null, [n('B5')], null, null, null, [n('C4')], null, [n('C6')], null, [n('C6')], null, null, null],
      organChordsLen: [[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null],
    },
    // section 4
    {
      lead: seq('. . G5 . G5 . . . . . D5 . D5 . . . | . . C5 . C5 . . . B4 . . . G4 . . .'),
      leadLen: [null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead2: seq('C#4 . . . C#4 . . . . . A3 . D4 . . . | . . F#3 . C4 . . . D3 . . . B2 . . .'),
      lead2Len: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,1,null,null,null,1,null,null,null],
      lead3: seq('C7 . . . E7 . . . D7 . D7 . D7 . D6 . | C7 . C7 . C7 . F#6 . G6 . . . . . . .'),
      lead3Len: [3,null,null,null,3,null,null,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,2,null,5,null,null,null,null,null,null,null],
      lead5: seq('C9 . . . E9 . . . D9 . D9 . D9 . D8 . | C9 . C9 . C9 . F#8 . G8 . . . . . . .'),
      lead5Len: [2,null,null,null,2,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,2,null,null,null,null,null,null,null],
      leadHarm: seq('D#6 . . . . . . . D6 . . . . . . . | C6 . . . . . . . B5 . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null],
      twinkle: seq('C#5 . . . C#5 . . . . . A4 . D5 . . . | . . F#4 . C5 . . . D4 . . . B3 . . .'),
      twinkleLen: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,1,null,null,null,2,null,null,null],
      organChords: [[n('C#4')], null, [n('C#6')], null, [n('C#6')], null, null, null, [n('D4')], null, [n('A5')], null, [n('A5')], null, null, null, [n('F#3')], null, [n('F#5')], null, [n('F#5')], null, null, null, [n('G3')], null, null, null, [n('D3')], null, null, null],
      organChordsLen: [[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,null,null,[2],null,null,null],
    },
    // section 5
    {
      bass: seq('. . . . . . . . G3 . . . . . . . | B3 . . . . . . . C4 . . . . . . .'),
      bassLen: [null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('B4 . . . . . . . G4 . B4 . D5 . B4 . | G4 . B4 . D5 . B4 . C5 . E5 . G5 . E5 .'),
      leadLen: [2,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: seq('. G2 . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('. . . . B5 . . A5 B5 . . . . . . . | D6 . . . . . . . C6 . . . . . . .'),
      lead3Len: [null,null,null,null,3,null,null,1,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      twinkle: seq('. G3 . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null, null, null, null, [n('D6')], null, null, [n('C6')], [n('B5')], null, null, null, [n('D6')], null, null, null, [n('G6')], null, null, null, null, null, [n('F#6')], null, [n('D#6')], null, null, null, [n('E6')], null, null, null],
      chordsLen: [null,null,null,null,[3],null,null,[1],[4],null,null,null,[4],null,null,null,[6],null,null,null,null,null,[2],null,[4],null,null,null,[4],null,null,null],
      organChords: [[n('G3')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 6
    {
      bass: seq('C#4 . . . . . . . D4 . . . . . . . | A3 . . . . . . . B3 . . . . . . .'),
      bassLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('C#5 . E5 . G5 . E5 . D5 . F#5 . A5 . F#5 . | D5 . F#5 . A5 . F#5 . G4 . B4 . D5 . B4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: [null, null, null, null, null, null, null, null, n('F#6'), [n('A5'), n('F#6')], [n('A5'), n('F#6')], [n('A5'), n('F#6')], n('G6'), [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], n('A6'), [n('C6'), n('A6')], [n('C6'), n('A6')], [n('C6'), n('A6')], n('C7'), [n('E6'), n('C7')], [n('E6'), n('C7')], [n('E6'), n('C7')], n('B6'), [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')]],
      lead2Len: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
      lead3: seq('E6 . . . . . . . F#6 . . . G6 . . . | A6 . . . C7 . . . B6 . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null],
      twinkle: [null, null, null, null, null, null, null, null, n('F#6'), [n('A5'), n('F#6')], [n('A5'), n('F#6')], [n('A5'), n('F#6')], n('G6'), [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], n('A6'), [n('C6'), n('A6')], [n('C6'), n('A6')], [n('C6'), n('A6')], n('C7'), [n('E6'), n('C7')], [n('E6'), n('C7')], [n('E6'), n('C7')], n('B6'), [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')]],
      twinkleLen: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
      chords: [[n('A6')], null, null, null, null, null, [n('G6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[6],null,null,null,null,null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 7
    {
      bass: seq('G3 . . . . . . . G3 . . . . . . . | B3 . . . . . . . C4 . . . . . . .'),
      bassLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('G4 . B4 . . . . . G4 . B4 . D5 . B4 . | G4 . D5 . F5 . D5 . C5 . E5 . G5 . E5 .'),
      leadLen: [2,null,2,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: [[n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], n('D6'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      lead2Len: [[1,1],[1,1],[1,1],[1,1],1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('. . . . B5 . . A5 B5 . . . . . . . | D6 . . . . . . . C6 . . . . . . .'),
      lead3Len: [null,null,null,null,3,null,null,1,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      twinkle: [[n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], [n('D6'), n('B6')], n('D6'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[1,1],[1,1],[1,1],[1,1],1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null, null, null, null, [n('D6')], null, null, [n('C6')], [n('B5')], null, null, null, [n('D6')], null, null, null, [n('G6')], null, null, null, null, null, [n('F#6')], null, [n('D#6')], null, null, null, [n('E6')], null, null, null],
      chordsLen: [null,null,null,null,[3],null,null,[1],[4],null,null,null,[4],null,null,null,[6],null,null,null,null,null,[2],null,[4],null,null,null,[4],null,null,null],
    },
    // section 8
    {
      bass: seq('C#4 . . . . . . . D4 . . . . . . . | F#3 . . . . . . . G3 . . . . . . .'),
      bassLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null],
      lead: seq('C#5 . E5 . G5 . E5 . D5 . F#5 . A5 . F#5 . | A4 . D5 . F#5 . D5 . B4 . D5 . A4 . D5 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead2: [null, null, null, null, null, null, null, null, n('F#6'), [n('A5'), n('F#6')], [n('A5'), n('F#6')], [n('A5'), n('F#6')], n('F6'), [n('A5'), n('F6')], n('F#6'), [n('A5'), n('F#6')], n('C7'), [n('D6'), n('C7')], [n('D6'), n('C7')], [n('D6'), n('C7')], [n('D6'), n('C7')], [n('D6'), n('C7')], n('F#6'), [n('A5'), n('F#6')], n('G6'), [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')]],
      lead2Len: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],1,[1,1],1,[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],1,[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
      lead3: seq('E6 . . . . . . . F#6 . . . F6 . F#6 . | C7 . . . . . F#6 . G6 . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,4,null,null,null,2,null,2,null,6,null,null,null,null,null,2,null,8,null,null,null,null,null,null,null],
      twinkle: [null, null, null, null, null, null, null, null, n('F#6'), [n('A5'), n('F#6')], [n('A5'), n('F#6')], [n('A5'), n('F#6')], n('F6'), [n('A5'), n('F6')], n('F#6'), [n('A5'), n('F#6')], n('C7'), [n('D6'), n('C7')], [n('D6'), n('C7')], [n('D6'), n('C7')], [n('D6'), n('C7')], [n('D6'), n('C7')], n('F#6'), [n('A5'), n('F#6')], n('G6'), [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')]],
      twinkleLen: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],1,[1,1],1,[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],1,[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
      chords: [[n('A6')], null, null, null, null, null, [n('G6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[6],null,null,null,null,null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 9
    {
      lead: seq('G4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], n('B5'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      lead2Len: [[1,1],[1,1],[1,1],[1,1],1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('. . . . . . D#6 . E6 . E6 . E6 . F#6 . | G6 . . . C7 . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [null, null, null, null, null, null, null, null, n('F5'), [n('G5'), n('A5')], [n('A#5'), n('C6')], [n('D6'), n('E6')], [n('F6'), n('G6')], [n('A6'), n('A#6')], [n('C7'), n('D7')], [n('E7'), n('F7')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      lead4Len: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [[n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], [n('B5'), n('G6')], n('B5'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[1,1],[1,1],[1,1],[1,1],1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G5'), n('B5')], [n('A5'), n('C6')], null, [n('G5'), n('B5')], [n('F#5'), n('A5')], [n('G5'), n('B5')], null, [n('F#5'), n('A5')]],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],[1,1],null,[1,1],[1,1],[1,1],null,[1,1]],
      organChords: [null, null, null, null, null, null, null, null, [n('C4'), n('G4')], null, null, null, null, null, [n('C4'), n('G4')], null, [n('C4'), n('G4')], null, null, null, null, null, null, null, [n('B3'), n('G4')], null, null, null, null, null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,[5,5],null,null,null,null,null,[2,2],null,[4,4],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
    },
    // section 10
    {
      bass: seq('. . . . B4 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('. . . . . . D#6 . E6 . E6 . E6 . F#6 . | G6 . . . C7 . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [null, null, null, null, null, null, null, null, n('F5'), [n('G5'), n('A5')], [n('A#5'), n('C6')], [n('D6'), n('E6')], [n('F6'), n('G6')], [n('A6'), n('A#6')], [n('C7'), n('D7')], [n('E7'), n('F7')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      lead4Len: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('D5'), n('G5')], null, null, null, [n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G5'), n('B5')], [n('A5'), n('C6')], null, [n('G5'), n('B5')], [n('F#5'), n('A5')], [n('G5'), n('B5')], null, [n('F#5'), n('A5')]],
      chordsLen: [[4,4],null,null,null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],[1,1],null,[1,1],[1,1],[1,1],null,[1,1]],
      organChords: [[n('G3'), n('D4')], null, null, null, null, null, null, null, [n('C4'), n('G4')], null, null, null, null, null, [n('C4'), n('G4')], null, [n('C4'), n('G4')], null, null, null, null, null, null, null, [n('B3'), n('G4')], null, null, null, null, null, null, null],
      organChordsLen: [[8,8],null,null,null,null,null,null,null,[5,5],null,null,null,null,null,[2,2],null,[4,4],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
    },
    // section 11
    {
      bass: seq('. . . . B4 . . . . . . . . . . . | . . . . . . . . A5 . . . . . A5 .'),
      bassLen: [null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,1,null],
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . F#4 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null],
      lead3: seq('. . . . . . D#6 . E6 . E6 . E6 . F#6 . | G6 . . . C7 . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [null, null, null, null, null, null, null, null, n('F5'), [n('G5'), n('A5')], [n('A#5'), n('C6')], [n('D6'), n('E6')], [n('F6'), n('G6')], [n('A6'), n('A#6')], [n('C7'), n('D7')], [n('E7'), n('F7')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      lead4Len: [null,null,null,null,null,null,null,null,1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('D5'), n('G5')], null, null, null, [n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D6')], null, [n('C#6')], null, [n('D6')], null, [n('A5')], null],
      chordsLen: [[4,4],null,null,null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1],null,[1],null,[1],null,[1],null],
      organChords: [[n('G3'), n('D4')], null, null, null, null, null, null, null, [n('C4'), n('G4')], null, null, null, null, null, [n('C4'), n('G4')], null, [n('C4'), n('G4')], null, null, null, null, null, null, null, [n('D4'), n('A4')], null, null, null, null, null, null, null],
      organChordsLen: [[8,8],null,null,null,null,null,null,null,[5,5],null,null,null,null,null,[2,2],null,[4,4],null,null,null,null,null,null,null,[2,2],null,null,null,null,null,null,null],
    },
    // section 12
    {
      bass: seq('A5 . . . . . A4 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [1,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('F#4 . . . . . . . C5 . . . . . . . | A4 . . . . . . . . . . . . . . .'),
      leadLen: [2,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D4 . A4 . D5 . A5 . D6 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | D5 . A5 . D6 . A6 . D7 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | D5 . A5 . D6 . A6 . D7 . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null],
      chords: [[n('D5')], null, [n('C#5')], null, [n('D5')], null, [n('A5')], null, [n('D#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1],null,[1],null,[1],null,[1],null,[6],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('D4'), n('A4')], null, null, null, null, null, null, null, [n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('F#4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[2,2],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,[2,2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 13
    {
      bass: seq('A4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('C5 . . . . . . . . . B4 . B4 . . . | . . B4 . B4 . . . . . B4 . B4 . . .'),
      leadLen: [5,null,null,null,null,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . D3 . G3 . . . | . . D3 . G3 . . . . . D3 . B3 . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      lead3: seq('. . . . . . D6 . B6 . B6 . B6 . D6 . | B6 . B6 . B6 . D6 . B6 . B6 . B6 . B6 C7'),
      lead3Len: [null,null,null,null,null,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,2,null,2,null,2,null,1,null,1,1],
      lead5: seq('. . . . . . D8 . B8 . B8 . B8 . D8 . | B8 . B8 . B8 . D8 . B8 . B8 . B8 . B8 C9'),
      lead5Len: [null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,1],
      twinkle: seq('. . . . . . . . . . D4 . G4 . . . | . . D4 . G4 . . . . . D4 . B4 . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,1,null,1,null,null,null],
      organChords: [[n('D3'), n('F#4'), n('D5')], null, null, null, null, null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null],
      organChordsLen: [[5,5,5],null,null,null,null,null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null],
    },
    // section 14
    {
      lead: seq('. . B4 . B4 . . . . . B4 . B4 . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [null,null,2,null,2,null,null,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G3 . . . G3 . . . . . D3 . G3 . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('A6 . . . G6 . D6 . B6 . B6 . B6 . D6 . | . . . . . . . . . . . . . . . .'),
      lead3Len: [4,null,null,null,1,null,2,null,2,null,2,null,1,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('A8 . . . G8 . C#8 . B8 . B8 . B8 . D8 . | . . . . . . . . . . . . . . . .'),
      lead5Len: [2,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . G6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('G4 . . . G4 . . . . . D4 . G4 . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [1,null,null,null,1,null,null,null,null,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, [n('G3')], null, [n('G5')], null, [n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[2],null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 2, 14],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }],
};

export const arrangement = null;

export const variants = null;
