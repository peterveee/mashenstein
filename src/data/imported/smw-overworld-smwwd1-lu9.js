// SMW_OVERWORLD_SMWWD1_LU9 — imported from SMW_Overworld_smwwd1_Lu9.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 13 parts in the file, 13 lanes here — nothing was merged onto anything else.
// 7 of them are layers (chords2, chords3, lead2, bass2, lead3, chords4, chords5): real lanes with the
// notes below, declared in the mix at the foot of this file, and SILENT until you
// give each one a voice on the desk. A layer is a preset and nothing else.
import { seq, chord, n } from '../../engine/notes.js';

export const id = "smw-overworld-smwwd1-lu9";
export const title = "SMW_OVERWORLD_SMWWD1_LU9";
export const slug = "smw-overworld-smwwd1-lu9";
export const group = "imported";

export const bank = {
  bpm: 132,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      bass: seq('A#3 . . . F3 . . D3 C3 . D3 E3 . . . . | F2 . . . D2 . . . G2 . . . C2 . . .'),
      bassLen: [4,null,null,null,3,null,null,1,1,null,1,5,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | F2 . . . D2 . . . G2 . . . C2 . . .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      leadHarm: seq('D6 . . . A#5 . . F5 E5 . F5 G5 . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [4,null,null,null,3,null,null,1,1,null,1,5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 D4 F#4 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords: [[n('F5'), n('D6')], null, null, null, [n('D5'), n('A#5')], null, null, [n('D5'), n('F5')], [n('C5'), n('E5')], null, [n('D5'), n('F5')], [n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[4,4],null,null,null,[3,3],null,null,[1,1],[1,1],null,[1,1],[5,5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')], null, [n('C#5'), n('F#5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')]],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1]],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')], null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('G4'), n('A#4')], null, null, null, [n('C#4'), n('F#4')], null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,8],null,null,null,[4,4],null,null,null],
    },
    // section 1
    {
      bass: seq('F2 . . . D2 . . . G2 . F#2 . . . . . | F2 . . . A2 . . . A#2 . . . B2 . . .'),
      bassLen: [2,null,null,null,2,null,null,null,1,null,6,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      bass2: seq('F2 . . . D2 . . . G2 . F#2 . . . . . | F2 . . . A2 . . . A#2 . . . B2 . . .'),
      bass2Len: [2,null,null,null,2,null,null,null,2,null,6,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | A4 . . . F4 . . C4 D4 F4 . F4 . . . D4'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,3,null,null,1,1,1,null,4,null,null,null,1],
      lead2: seq('. . . . . . . . . . . . . . . . | . . A4 . . . F4 . . C4 D4 F4 . F4 . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,3,null,null,1,1,1,null,4,null,null],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 . . . | F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 D4 F#4 .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,1,null,1,null,null,null,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords2: [[n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('G5'), n('A#5')], null, [n('C#5'), n('F#5'), n('A#5')], null, null, null, null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('B5')], null, [n('D5'), n('F5'), n('B5')], [n('D5'), n('F5'), n('B5')]],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[5,5,5],null,null,null,null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1]],
      chords3: [[n('C#5'), n('F#5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('G5'), n('A#5')], null, [n('C#5'), n('F#5'), n('A#5')], null, null, null, null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('B5')], null],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[5,5,5],null,null,null,null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null],
      organChords: [[n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('G4'), n('A#4')], null, [n('C#4'), n('F#4'), n('A#4')], null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, [n('D4'), n('F4'), n('B4')], null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[2,2,2],null,[6,6,6],null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null],
    },
    // section 2
    {
      bass: seq('A2 . . . G#2 . . . G2 . C2 . D2 . E2 . | F2 . . . A2 . . . A#2 . . . B2 . . .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      bass2: seq('A2 . . . G#2 . . . G2 . C2 . D2 . E2 . | F2 . . . A2 . . . A#2 . . . B2 . . .'),
      bass2Len: [2,null,null,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead: seq('C4 . F4 . F4 . C5 . A4 . . G4 . . . C4 | A4 . . . F4 . . C4 D4 F4 . F4 . . . D4'),
      leadLen: [1,null,1,null,1,null,2,null,3,null,null,4,null,null,null,1,4,null,null,null,3,null,null,1,1,1,null,4,null,null,null,1],
      lead2: seq('. D4 C4 . F4 . F4 . C5 . A4 . . G4 . . | . C4 A4 . . . F4 . . C4 D4 F4 . F4 . .'),
      lead2Len: [null,1,1,null,1,null,1,null,2,null,3,null,null,4,null,null,null,1,4,null,null,null,3,null,null,1,1,1,null,4,null,null],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . F#4 . F#4 F#4 | F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 D4 F#4 .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,1,null,1,null,1,1,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords2: [[n('C5'), n('E5'), n('A5')], null, [n('C5'), n('E5'), n('A5')], [n('C5'), n('E5'), n('A5')], [n('C5'), n('D#5'), n('G#5')], null, [n('C5'), n('D#5'), n('G#5')], [n('C5'), n('D#5'), n('G#5')], [n('A#4'), n('D5'), n('G5')], null, [n('A#4'), n('D5'), n('G5')], [n('A#4'), n('D5'), n('G5')], [n('C5'), n('E5'), n('A#5')], null, [n('C5'), n('E5'), n('A#5')], [n('C5'), n('E5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('B5')], null, [n('D5'), n('F5'), n('B5')], [n('D5'), n('F5'), n('B5')]],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1]],
      chords3: [[n('D5'), n('F5'), n('B5')], [n('D5'), n('F5'), n('B5')], [n('C5'), n('E5'), n('A5')], null, [n('C5'), n('E5'), n('A5')], [n('C5'), n('E5'), n('A5')], [n('C5'), n('D#5'), n('G#5')], null, [n('C5'), n('D#5'), n('G#5')], [n('C5'), n('D#5'), n('G#5')], [n('A#4'), n('D5'), n('G5')], null, [n('A#4'), n('D5'), n('G5')], [n('A#4'), n('D5'), n('G5')], [n('C5'), n('E5'), n('A#5')], null, [n('C5'), n('E5'), n('A#5')], [n('C5'), n('E5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('B5')], null],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null],
      organChords: [[n('C4'), n('E4'), n('A4')], null, null, null, [n('C4'), n('D#4'), n('G#4')], null, null, null, [n('A#3'), n('D4'), n('G4')], null, null, null, [n('E4'), n('G4'), n('A#4')], null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, [n('D4'), n('F4'), n('B4')], null, null, null],
      organChordsLen: [[4,4,4],null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null],
    },
    // section 3
    {
      bass: seq('C3 . C2 . E2 . G2 . F2 . C2 . F2 . . . | F2 . . . A2 . . . A#2 . . . B2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      bass2: seq('C3 . C2 . E2 . G2 . F2 . C2 . F2 . . . | F2 . . . A2 . . . A#2 . . . B2 . . .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead: seq('C4 . F4 . A#4 A4 G4 F4 . . . . . . . . | A4 . . . F4 . . C4 D4 F4 . F4 . . . D4'),
      leadLen: [1,null,1,null,1,1,1,8,null,null,null,null,null,null,null,null,4,null,null,null,3,null,null,1,1,1,null,4,null,null,null,1],
      lead2: seq('. D4 C4 . F4 . A#4 A4 G4 F4 . . . . . . | . . A4 . . . F4 . . C4 D4 F4 . F4 . .'),
      lead2Len: [null,1,1,null,1,null,1,1,1,8,null,null,null,null,null,null,null,null,4,null,null,null,3,null,null,1,1,1,null,4,null,null],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 . . . | F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 D4 F#4 .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,1,null,1,null,null,null,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords2: [[n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], null, [n('D5'), n('E5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('B5')], null, [n('D5'), n('F5'), n('B5')], [n('D5'), n('F5'), n('B5')]],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1]],
      chords3: [[n('D5'), n('F5'), n('B5')], [n('D5'), n('F5'), n('B5')], [n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], null, [n('D5'), n('E5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('B5')], null],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null],
      organChords: [[n('C4'), n('E4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, [n('D4'), n('F4'), n('B4')], null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null],
    },
    // section 4
    {
      bass: seq('C3 . C2 . E2 . G2 . F2 . C2 . F2 . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C3 . C2 . E2 . G2 . F2 . C2 . F2 . . . | A#2 . B2 . C3 . D3 . C3 . A2 . F2 . G2 .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead: seq('C4 . F4 . A#4 A4 G4 F4 . . . . . . . . | A4 . . F4 . . C4 . A4 . . F4 . . . .'),
      leadLen: [1,null,1,null,1,1,1,8,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,5,null,null,null,null],
      lead2: seq('. D4 C4 . F4 . A#4 A4 G4 F4 . . . . . . | . . A4 . . F4 . . C4 . A4 . . F4 . .'),
      lead2Len: [null,1,1,null,1,null,1,1,1,8,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,5,null,null],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 . . . | F#4 C#5 F#4 C4 D4 . C4 . F#4 D4 . F#4 D4 . . .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,1,null,1,null,null,null,1,1,1,1,1,null,1,null,1,1,null,1,1,null,null,null],
      chords2: [[n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], null, [n('D5'), n('E5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')]],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
      chords3: [[n('D5'), n('F5'), n('B5')], [n('D5'), n('F5'), n('B5')], [n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], null, [n('D5'), n('E5'), n('A#5')], [n('D5'), n('E5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')]],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
      organChords: [[n('C4'), n('E4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null],
    },
    // section 5
    {
      bass2: seq('G#2 . B2 . D3 . F3 . G3 . F3 . E3 . C3 . | A#2 . A2 . A#2 . D3 . F3 . E3 . C3 . A2 .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead: seq('G#4 F4 C4 . G#4 . . G4 . . . . . . . . | A4 . . F4 . . C4 . A4 . . F4 . . . .'),
      leadLen: [1,1,1,null,3,null,null,9,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,5,null,null,null,null],
      lead2: seq('. . G#4 F4 C4 . G#4 . . G4 . . . . . . | . . A4 . . F4 . . C4 . A4 . . F4 . .'),
      lead2Len: [null,null,1,1,1,null,3,null,null,9,null,null,null,null,null,null,null,null,3,null,null,3,null,null,2,null,3,null,null,5,null,null],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . F#4 D4 . F#4 D4 . . . | F#4 C#5 F#4 C4 D4 . C4 . F#4 D4 . F#4 D4 . . .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,null,1,1,null,null,null,1,1,1,1,1,null,1,null,1,1,null,1,1,null,null,null],
      chords2: [[n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('A#4'), n('E5'), n('G5')], null, [n('A#4'), n('E5'), n('G5')], [n('A#4'), n('E5'), n('G5')], chord('C5'), null, chord('C5'), chord('C5'), [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')]],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
      chords3: [[n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('A#4'), n('E5'), n('G5')], null, [n('A#4'), n('E5'), n('G5')], [n('A#4'), n('E5'), n('G5')], chord('C5'), null, chord('C5'), chord('C5'), [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], null, [n('D5'), n('F5'), n('A#5')], [n('D5'), n('F5'), n('A#5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')]],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
      organChords: [[n('B3'), n('F4'), n('G#4')], null, null, null, null, null, null, null, [n('A#3'), n('E4'), n('G4')], null, null, null, [n('C4')], null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[4,8,8],null,null,null,[4],null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null],
    },
    // section 6
    {
      bass: seq('. . . . . . . . . . . . . . . . | F2 . . . F2 . . . D#2 . . . D#2 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      bass2: seq('B2 . D3 . F3 . B2 . A#2 . D3 . C3 . E3 . | F2 . . . F2 . . . D#2 . . . D#2 . . .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead: seq('G#4 F4 C4 . C5 . . . . . . . . . . . | A4 . . . F4 . . C4 D4 F4 . F4 . . . G4'),
      leadLen: [1,1,2,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,3,null,null,1,1,1,null,4,null,null,null,1],
      lead2: seq('. . G#4 F4 C4 . C5 . . . . . . . . . | . . A4 . . . F4 . . C4 D4 F4 . F4 . .'),
      lead2Len: [null,null,1,1,2,null,12,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,3,null,null,1,1,1,null,4,null,null],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . F#4 D4 . F#4 D4 . . . | F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 D4 F#4 .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,null,1,1,null,null,null,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords2: [[n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('A#4'), n('D5'), n('G5')], null, [n('A#4'), n('D5'), n('G5')], [n('A#4'), n('D5'), n('G5')], chord('C5'), null, chord('C5'), chord('C5'), [n('C5'), n('E5'), n('F5'), n('G5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')]],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1]],
      chords3: [[n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], null, [n('B4'), n('F5'), n('G#5')], [n('B4'), n('F5'), n('G#5')], [n('A#4'), n('D5'), n('G5')], null, [n('A#4'), n('D5'), n('G5')], [n('A#4'), n('D5'), n('G5')], chord('C5'), null, chord('C5'), chord('C5'), [n('C5'), n('E5'), n('F5'), n('G5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null],
      organChords: [[n('B3'), n('F4'), n('G#4')], null, null, null, null, null, null, null, [n('A#3'), n('D4'), n('G4')], null, null, null, [n('C4'), n('E4')], null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('C4'), n('D#4'), n('A4')], null, null, null, null, null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[4,4,8],null,null,null,[4,4],null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null],
    },
    // section 7
    {
      bass: seq('D2 . . . D2 . . . C#2 . . . C#2 . . . | C2 . . . . . . . . . . . D2 . E2 .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null],
      bass2: seq('D2 . . . D2 . . . C#2 . . . C#2 . . . | C2 . . . . . . . . . . . D2 . E2 .'),
      bass2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null],
      lead: seq('A4 F4 C4 . D4 . . F4 . . . . . . . D4 | C5 . D5 . C5 . D5 . C5 . . C4 A#4 A4 G4 .'),
      leadLen: [1,1,2,null,3,null,null,8,null,null,null,null,null,null,null,1,2,null,2,null,2,null,2,null,3,null,null,1,1,1,2,null],
      lead2: seq('. G4 A4 F4 C4 . D4 . . F4 . . . . . . | . D4 C5 . D5 . C5 . D5 . C5 . . C4 A#4 A4'),
      lead2Len: [null,1,1,1,2,null,3,null,null,8,null,null,null,null,null,null,null,1,2,null,2,null,2,null,2,null,3,null,null,1,1,1],
      twinkle: seq('F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 . . . | F#4 C#5 F#4 C4 D4 . C4 . C4 D4 F#4 . C4 D4 F#4 .'),
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,1,null,1,null,null,null,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords2: [[n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('G5'), n('A#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [[n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('G5'), n('A#5')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('D4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, [n('C#4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('G4'), n('A#4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 8
    {
      bass: seq('F2 . . . C2 . . . F2 . . . F2 . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F2 . . . C2 . . . F2 . . . F2 . . . | A#2 . A2 . A#2 . B2 . C3 . C#3 . D3 . A2 .'),
      bass2Len: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead: seq('F4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G4 . F4 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | D4 . F4 . D4 F4 G4 G#4 A4 G#4 G4 F#4 A4 D4 D#4 E4'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null,1,1,1,1,1,1,1,1,1,1,1,1],
      twinkle: [n('F#4'), n('C#5'), n('F#4'), n('C4'), n('D4'), null, n('C4'), null, n('C4'), n('D4'), n('F#4'), null, n('C4'), null, n('C4'), n('C4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), [n('C4'), n('F#4')], null, n('F4'), n('C4'), null, n('F4'), n('C4'), null, null, null],
      twinkleLen: [1,1,1,1,1,null,1,null,1,1,1,null,1,null,1,1,1,1,1,1,1,1,[1,1],null,1,1,null,1,1,null,null,null],
      chords2: [[n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5'), n('F5')], [n('A#4'), n('D5')], null, [n('D5'), n('F5')], null, null, [n('E5'), n('G5')], null, [n('F5'), n('A5')], [n('E5'), n('G#5')], [n('D#5'), n('G5')], [n('D5'), n('F#5')], null, null, null, null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],[2,2],null,[3,3],null,null,[2,2],null,[1,1],[1,1],[1,1],[5,5],null,null,null,null],
      organChords: [[n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, chord('D4'), null, null, null],
      organChordsLen: [[16,16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null],
    },
    // section 9
    {
      bass2: seq('G2 . A#2 . A2 . G2 . F2 . D2 . C2 . F2 . | A#2 . A2 . A#2 . B2 . C3 . C#3 . D3 . A2 .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      lead3: seq('F4 . D4 . F4 G4 G#4 A4 G#4 A4 F4 D4 C4 F4 A3 A#3 | D4 . F4 . D4 F4 G4 G#4 A4 G#4 G4 F#4 A4 D4 D#4 E4'),
      lead3Len: [2,null,2,null,2,1,1,1,1,1,1,1,1,1,1,1,2,null,2,null,2,1,1,1,1,1,1,1,1,1,1,1],
      twinkle: [n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), [n('C4'), n('F#4')], null, n('F4'), n('C4'), null, n('F4'), n('C4'), null, null, null, n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), [n('C4'), n('F#4')], null, n('F4'), n('C4'), null, n('F4'), n('C4'), null, null, null],
      twinkleLen: [1,1,1,1,1,1,[1,1],null,1,1,null,1,1,null,null,null,1,1,1,1,1,1,[1,1],null,1,1,null,1,1,null,null,null],
      chords4: [[n('D5'), n('F5')], [n('A#4'), n('D5')], null, [n('D5'), n('F5')], null, null, [n('E5'), n('G5')], null, [n('F5'), n('A5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords4Len: [[1,1],[2,2],null,[3,3],null,null,[2,2],null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords5: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D4'), n('F4')], [n('A#3'), n('D4')], null, [n('D4'), n('F4')], null, null, [n('D4'), n('G4')], null, [n('F4'), n('A4')], [n('G4'), n('A#4')], [n('A4'), n('C5')], [n('A#4'), n('D5')], null, null, null, [n('D4'), n('F4')]],
      chords5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],[2,2],null,[3,3],null,null,[2,2],null,[1,1],[1,1],[1,1],[4,4],null,null,null,[1,1]],
      organChords: [[n('D4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('A#4')], null, null, null, null, null, null, null, chord('F4'), null, null, null, [n('F#4'), n('A4'), n('C5')], null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,[4,4,4],null,null,null],
    },
    // section 10
    {
      bass: seq('. . . . . . . . . . . . . . . . | F2 . . . D2 . . . G2 . . . C2 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      bass2: seq('G2 . A#2 . A2 . G2 . F2 . C2 . F2 . . . | F2 . . . D2 . . . G2 . . . C2 . . .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null],
      lead3: seq('F4 . D4 . F4 G4 G#4 A4 G#4 A4 F4 D4 C4 F4 A3 A#3 | . . . . . . . . . . . . . . . .'),
      lead3Len: [2,null,2,null,2,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), [n('C4'), n('F#4')], null, n('F4'), n('C4'), null, n('F4'), n('C4'), null, null, null, n('F#4'), n('C#5'), n('F#4'), n('C4'), n('D4'), null, n('C4'), null, n('C4'), n('D4'), n('F#4'), null, n('C4'), n('D4'), n('F#4'), null],
      twinkleLen: [1,1,1,1,1,1,[1,1],null,1,1,null,1,1,null,null,null,1,1,1,1,1,null,1,null,1,1,1,null,1,1,1,null],
      chords2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')], null, [n('C#5'), n('F#5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')]],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1]],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], null, [n('C5'), n('F5'), n('A5')], [n('C5'), n('F5'), n('A5')], [n('D5'), n('G5'), n('A#5')], null, [n('D5'), n('G5'), n('A#5')], [n('D5'), n('G5'), n('A#5')], [n('C#5'), n('F#5'), n('A#5')], null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],[1,1,1],null],
      chords5: [[n('D4'), n('F4')], [n('A#3'), n('D4')], null, [n('D4'), n('F4')], null, null, [n('D4'), n('G4')], null, [n('C4'), n('F4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords5Len: [[1,1],[2,2],null,[3,3],null,null,[2,2],null,[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('D4'), n('G4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('D4'), n('G4'), n('A#4')], null, null, null, [n('C#4'), n('F#4')], null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,8],null,null,null,[4,4],null,null,null],
    },
    // section 11
    {
      bass2: seq('G2 . A#2 . A2 . G2 . F2 . C2 . F2 . . . | . . . . . . . . . . . . . . . .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: [n('F4'), null, n('D4'), null, n('F4'), n('G4'), n('G#4'), n('A4'), n('G#4'), n('A4'), n('F4'), n('D4'), n('C4'), n('F4'), n('A3'), n('A#3'), [n('F3'), n('F4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      lead3Len: [2,null,2,null,2,1,1,1,1,1,1,1,1,1,1,1,[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), n('F#4'), [n('C4'), n('F#4')], null, n('F4'), n('C4'), null, n('F4'), n('C4'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [1,1,1,1,1,1,[1,1],null,1,1,null,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords5: [[n('D4'), n('F4')], [n('A#3'), n('D4')], null, [n('D4'), n('F4')], null, null, [n('D4'), n('G4')], null, [n('C4'), n('F4')], null, null, null, null, null, null, null, [n('A3'), n('F4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords5Len: [[1,1],[2,2],null,[3,3],null,null,[2,2],null,[4,4],null,null,null,null,null,null,null,[2,2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('D4'), n('G4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, [n('C4'), n('F4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[8,8,8],null,null,null,null,null,null,null,[8,8,8],null,null,null,null,null,null,null,[4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0, 1, 2, 3, 2, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 2, 4, 5, 6, 7, 8, 9, 11],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "chords2", from: "chords", independent: true, label: "Ching chigga ching chigga" }, { key: "chords3", from: "chords", independent: true, label: "Ching chigga ching chigga (E" }, { key: "lead2", from: "lead", independent: true, label: "Lead (Echo)" }, { key: "bass2", from: "bass", independent: true, label: "Bum bum bum bum" }, { key: "lead3", from: "lead", independent: true, label: "Breakitdown" }, { key: "chords4", from: "chords", independent: true, label: "Breakitdown" }, { key: "chords5", from: "chords", independent: true, label: "Breakitdown" }],
};

export const arrangement = null;

export const variants = null;
