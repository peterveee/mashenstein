// CASTLE — imported from castle.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 9 parts in the file, 9 lanes here — nothing was merged onto anything else.
// 2 of them are layers (chords2, chords3): real lanes with the
// notes below, declared in the mix at the foot of this file, and SILENT until you
// give each one a voice on the desk. A layer is a preset and nothing else.
import { seq, n } from '../../engine/notes.js';

export const id = "castle";
export const title = "CASTLE";
export const slug = "castle";
export const group = "imported";

export const bank = {
  bpm: 102,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . F1 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('G2')], [n('G#2')], [n('C3')], [n('C#3')], [n('G3')], [n('G#3')], [n('C4')], [n('G4')], [n('C5')], [n('C#5'), n('G5')], null, null, null, null, null, null, [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')]],
      chordsLen: [[16],[4],[14],[4],[4],[11],[10],[4],[8],[7,7],null,null,null,null,null,null,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
    },
    // section 1
    {
      lead: seq('G1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . F1 . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')]],
      chordsLen: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
    },
    // section 2
    {
      lead: seq('G1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . F1 . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | G#3 . . . . . . . F3 . . . C3 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords: [[n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')]],
      chordsLen: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
    },
    // section 3
    {
      lead: seq('G1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . F1 . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      leadHarm: seq('D3 . . . F3 . . . . . . . . . . . | . . . . C3 . . . F3 . . . C4 . . .'),
      leadHarmLen: [4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      chords: [[n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')], [n('C5'), n('G#5')]],
      chordsLen: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
    },
    // section 4
    {
      lead: seq('G1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . F1 . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      leadHarm: seq('G#3 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')]],
      chordsLen: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
    },
    // section 5
    {
      bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . F2 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      lead: seq('G1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . F1 . . .'),
      leadLen: [8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      leadHarm: seq('G#3 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . F2 . . .'),
      leadHarmLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . F6 . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('B4'), n('G5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('C5'), n('F5')], [n('F3'), n('A3')], null, null, null],
      chordsLen: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[4,4],null,null,null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('F2'), n('F3')], null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null],
    },
    // section 6
    {
      bass: seq('G2 . . . F1 . . . G1 . . . F2 . . . | G2 . . . F1 . . . G1 . . . F2 . . .'),
      bassLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      lead: seq('G1 . . . F1 . . . G1 . . . F1 . . . | G1 . . . F1 . . . G1 . . . F1 . . .'),
      leadLen: [8,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      leadHarm: seq('G2 . . . F1 . . . G1 . . . F2 . . . | G2 . . . F1 . . . G1 . . . F2 . . .'),
      leadHarmLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null],
      twinkle: seq('G6 . . . . . . . . . . . F6 . . . | G6 . . . . . . . . . . . F6 . . .'),
      twinkleLen: [4,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null],
      chords: [[n('G3'), n('B3')], null, null, null, null, null, null, null, null, null, null, null, [n('F3'), n('A3')], null, null, null, [n('G3'), n('B3')], null, null, null, null, null, null, null, null, null, null, null, [n('F3'), n('A3')], null, null, null],
      chordsLen: [[4,4],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null],
      organChords: [[n('G2'), n('G3')], null, null, null, null, null, null, null, null, null, null, null, [n('F2'), n('F3')], null, null, null, [n('G2'), n('G3')], null, null, null, null, null, null, null, null, null, null, null, [n('F2'), n('F3')], null, null, null],
      organChordsLen: [[4,4],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null],
      snare: seq('. . . . C1 . . . C1 . . . . . . . | . . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    // section 7
    {
      bass: seq('G2 . . . G#2 . . . F#2 . . . G2 . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('G1 . . . G#1 . . . F#1 . . . G1 . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [5,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('G2 . . . G#2 . . . F#2 . . . G2 . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('G6 . . . G#6 . . . F#6 . . . G6 . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [4,null,null,null,4,null,null,null,4,null,null,null,24,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('G3'), n('B3')], null, null, null, [n('G#3'), n('C4')], null, null, null, [n('F#3'), n('A#3')], null, null, null, [n('G3'), n('B3')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('G2'), n('G3')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 8
    {
      twinkle: [null, null, null, null, n('F6'), [n('D6'), n('F6')], n('B5'), [n('G#5'), n('D6')], n('B5'), [n('G5'), n('G#5')], [n('F5'), n('G5')], [n('D5'), n('F5')], [n('B4'), n('D5')], [n('G#4'), n('B4')], [n('F4'), n('G4'), n('G#4')], [n('D4'), n('F4'), n('G4')], n('B3'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [null,null,null,null,1,[1,1],1,[1,1],1,[1,1],[1,1],[1,1],[1,1],[1,1],[1,1,1],[1,1,1],1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')], [n('D#4')], [n('C4'), n('D#4')]],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C2')], null, null, null, null, null, null, null, [n('C2')], null, null, null, null, null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[7],null,null,null,null,null,null,null,[7],null,null,null,null,null,null,null],
    },
    // section 9
    {
      chords: [[n('C4')], [n('A3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('A4')], [n('D#4'), n('A4')], [n('C5')], [n('A4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('A4'), n('C5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D#4'), n('F#4')], [n('C4')], [n('G#3'), n('C4')], [n('F4')], [n('C4'), n('F4')], [n('G#4')], [n('F4'), n('G#4')], [n('C5')], [n('G#4'), n('C5')], [n('F5')], [n('C5'), n('F5')], [n('C5')], [n('G#4'), n('C5')], [n('G#4')], [n('F4'), n('G#4')], [n('F4')], [n('C4'), n('F4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      organChords: [[n('F#2')], null, null, null, null, null, null, null, [n('F#2')], null, null, null, null, null, null, null, [n('F2')], null, null, null, null, null, null, null, [n('F2')], null, null, null, null, null, null, null],
      organChordsLen: [[7],null,null,null,null,null,null,null,[7],null,null,null,null,null,null,null,[7],null,null,null,null,null,null,null,[7],null,null,null,null,null,null,null],
    },
    // section 10
    {
      bass: seq('. . . . . . . . . . . . . . . . | C2 . . . C2 . . . C2 . . . C2 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')], [n('D#4')], [n('C4'), n('D#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      organChords: [[n('G2')], null, null, null, null, null, null, null, [n('G2')], null, null, null, null, null, null, null, [n('C2')], null, null, null, [n('C3')], null, null, null, [n('C2')], null, null, null, null, null, null, null],
      organChordsLen: [[7],null,null,null,null,null,null,null,[7],null,null,null,null,null,null,null,[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null],
    },
    // section 11
    {
      bass: seq('F#2 . . . F#2 . . . F#2 . . . F#2 . . . | F2 . . . F2 . . . F2 . . . F2 . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords: [[n('C4')], [n('A3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('A4')], [n('D#4'), n('A4')], [n('C5')], [n('A4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('A4'), n('C5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D#4'), n('F#4')], [n('C4')], [n('G#3'), n('C4')], [n('F4')], [n('C4'), n('F4')], [n('G#4')], [n('F4'), n('G#4')], [n('C5')], [n('G#4'), n('C5')], [n('F5')], [n('C5'), n('F5')], [n('C5')], [n('G#4'), n('C5')], [n('G#4')], [n('F4'), n('G#4')], [n('F4')], [n('C4'), n('F4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      organChords: [[n('F#2')], null, null, null, [n('F#3')], null, null, null, [n('F#2')], null, null, null, null, null, null, null, [n('F2')], null, null, null, [n('F3')], null, null, null, [n('F2')], null, null, null, null, null, null, null],
      organChordsLen: [[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null,[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null],
    },
    // section 12
    {
      bass: seq('G2 . . . G2 . . . G2 . . . G2 . . . | C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')], [n('D#4')], [n('C4'), n('D#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G4'), n('D#5')], null, null, null, null, null, null, null, [n('D#4'), n('C5')], null, null, null, [n('C4'), n('G4')], null, null, null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      organChords: [[n('G2')], null, null, null, [n('G3')], null, null, null, [n('G2')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 13
    {
      bass: seq('F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . | F2 . F2 . F2 . F2 . F2 . F2 . F2 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[n('C4')], [n('A3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('A4')], [n('D#4'), n('A4')], [n('C5')], [n('A4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('A4'), n('C5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D#4'), n('F#4')], [n('C4')], [n('G#3'), n('C4')], [n('F4')], [n('C4'), n('F4')], [n('G#4')], [n('F4'), n('G#4')], [n('C5')], [n('G#4'), n('C5')], [n('F5')], [n('C5'), n('F5')], [n('C5')], [n('G#4'), n('C5')], [n('G#4')], [n('F4'), n('G#4')], [n('F4')], [n('C4'), n('F4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('C4'), n('F#4')], null, null, null, [n('F#4'), n('C5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G4'), n('G#4')], null, null, null, [n('G4'), n('C5')], null, null, null, [n('G4'), n('G5')], null, null, null],
      chords2Len: [[4,4],null,null,null,[12,12],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 14
    {
      bass: seq('G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 . | C2 . . . C2 . . . C2 . . . C2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')], [n('D#4')], [n('C4'), n('D#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('F4'), n('D#5')], null, null, null, null, null, null, null, [n('G4'), n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C2')], null, null, null, [n('C3')], null, null, null, [n('C2')], null, null, null, null, null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null],
    },
    // section 15
    {
      bass: seq('G2 . . . G2 . . . G2 . . . G2 . . . | C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('G3')], [n('G3'), n('C4')], [n('C4')], [n('C4'), n('D#4')], [n('D#4')], [n('G4'), n('C5')], [n('G4')], [n('G4'), n('C5')], [n('C5')], [n('C5'), n('D#5')], [n('D#5')], [n('G4'), n('C5')], [n('C5')], [n('D#4'), n('G4')], [n('G4')], [n('C4'), n('D#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G4'), n('D#5')], null, null, null, null, null, null, null, [n('D#4'), n('C5')], null, null, null, [n('C4'), n('G4')], null, null, null],
      chords2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      organChords: [[n('G2')], null, null, null, [n('G3')], null, null, null, [n('G2')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 16
    {
      bass: seq('F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . | F2 . F2 . F2 . F2 . F2 . F2 . F2 . F2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[n('A3')], [n('C4'), n('D#4')], [n('C4')], [n('D#4'), n('A4')], [n('D#4')], [n('A4'), n('C5')], [n('A4')], [n('C5'), n('D#5')], [n('C5')], [n('C5'), n('D#5')], [n('A4')], [n('A4'), n('C5')], [n('D#4')], [n('D#4'), n('A4')], [n('C4')], [n('C4'), n('D#4')], [n('G#3')], [n('G#3'), n('C4')], [n('C4')], [n('C4'), n('F4')], [n('F4')], [n('F4'), n('G#4')], [n('G#4')], [n('G#4'), n('C5')], [n('C5')], [n('C5'), n('F5')], [n('F5')], [n('G#4'), n('C5')], [n('C5')], [n('F4'), n('G#4')], [n('G#4')], [n('C4'), n('F4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('C4'), n('F#4')], null, null, null, [n('F#4'), n('C5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G4'), n('G#4')], null, null, null, [n('G4'), n('C5')], null, null, null, [n('G4'), n('G5')], null, null, null],
      chords2Len: [[4,4],null,null,null,[12,12],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 17
    {
      bass: seq('G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 . | G#2 . G#2 . G#2 . G#2 . G#2 . G#2 . G#2 . G#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('G5')], [n('D#5'), n('G5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('F4'), n('D#5')], null, null, null, null, null, null, null, [n('G4'), n('D5')], null, null, null, null, null, null, null, null, null, null, null, [n('G4'), n('C5')], null, null, null, [n('C5'), n('G5')], null, null, null, [n('G5'), n('C6')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G4')], null, null, null, [n('D5')], null, null, null, [n('D5'), n('G5')], null, null, null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4],null,null,null,[4],null,null,null,[4,4],null,null,null],
    },
    // section 18
    {
      bass: seq('D3 . D3 . D3 . D3 . D3 . D3 . D3 . D3 . | G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      twinkle: seq('. . . . B5 . C6 . C#6 . . . D6 . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,2,null,2,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('D4')], [n('B3'), n('D4')], [n('G4')], [n('D4'), n('G4')], [n('B4')], [n('G4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('G5')], [n('D5'), n('G5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('G4'), n('B4')], [n('G4')], [n('D4'), n('G4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('D5'), n('G#5')], null, null, null, null, null, null, null, [n('D5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, [n('D4'), n('G4')], null, null, null, [n('G4'), n('D5')], null, null, null, [n('B4'), n('G5')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [[n('D#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('A3'), n('D4')], null, null, null, [n('D4'), n('A4')], null, null, null, [n('A4'), n('D5')], null, null, null],
      chords3Len: [[4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 19
    {
      bass: seq('C3 . C3 . C3 . C3 . C3 . C3 . C3 . C3 . | A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      twinkle: seq('. . . . A5 . A#5 . B5 . . . C6 . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,2,null,2,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')], [n('D#4')], [n('C4'), n('D#4')], [n('D#4')], [n('C4'), n('D#4')], [n('F#4')], [n('D#4'), n('F#4')], [n('A4')], [n('F#4'), n('A4')], [n('C5')], [n('A4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('A4'), n('C5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D#4'), n('F#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('G4'), n('F5')], null, null, null, null, null, null, null, [n('G4'), n('D#5')], null, null, null, null, null, null, null, null, null, null, null, [n('A4'), n('D#5')], null, null, null, [n('F#4'), n('D5')], null, null, null, [n('F#4'), n('C5')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [[n('A4'), n('C5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('E4'), n('A#4')], null, null, null, [n('C#4'), n('A4')], null, null, null, [n('C#4'), n('G4')], null, null, null],
      chords3Len: [[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 20
    {
      bass: seq('F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . | D2 . D2 . D2 . D2 . D2 . D2 . D2 . D2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      twinkle: seq('. . . . F#5 . G5 . G#5 . . . A5 . . . | A5 . . . . . . . . . G#5 . A5 . C6 .'),
      twinkleLen: [null,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null],
      chords: [[n('D4')], [n('A3'), n('D4')], [n('F#4')], [n('D4'), n('F#4')], [n('A4')], [n('F#4'), n('A4')], [n('C5')], [n('F#4'), n('C5')], [n('D5')], [n('A4'), n('D5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D4'), n('F#4')], [n('D4')], [n('A3'), n('D4')], [n('D4')], [n('A3'), n('D4')], [n('F#4')], [n('D4'), n('F#4')], [n('A4')], [n('F#4'), n('A4')], [n('D5')], [n('A4'), n('D5')], [n('F#5')], [n('D5'), n('F#5')], [n('D5')], [n('A4'), n('D5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D4'), n('F#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('F#4'), n('D5')], null, null, null, null, null, null, null, [n('D4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, [n('A4'), n('D5')], null, null, null, [n('F#4'), n('C5')], null, null, null, [n('F#4'), n('D5')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [[n('E4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('E4'), n('A4')], null, null, null, [n('C#4'), n('G4')], null, null, null, [n('E4'), n('A4')], null, null, null],
      chords3Len: [[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 21
    {
      bass: seq('G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 . | C2 . . . C2 . . . C2 . . . C2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      twinkle: seq('D#6 . . . . . D6 C6 D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [6,null,null,null,null,null,1,1,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('F5')], [n('D5'), n('F5')], [n('G5')], [n('F5'), n('G5')], [n('B5')], [n('G5'), n('B5')], [n('D6')], [n('B5'), n('D6')], [n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')], [n('D#4')], [n('C4'), n('D#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('G4'), n('D#5')], null, null, null, null, null, null, null, [n('F4'), n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [[n('D4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [[4,4],null,null,null,null,null,null,null,[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C2')], null, null, null, [n('C3')], null, null, null, [n('C2')], null, null, null, null, null, null, null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4],null,null,null,[4],null,null,null,[4],null,null,null,null,null,null,null],
    },
    // section 22
    {
      bass: seq('G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 . | G#2 . G#2 . G#2 . G#2 . G#2 . G#2 . G#2 . G#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('D#5')], [n('C5'), n('D#5')], [n('G5')], [n('D#5'), n('G5')], [n('D#5')], [n('C5'), n('D#5')], [n('C5')], [n('G4'), n('C5')], [n('G4')], [n('D#4'), n('G4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('F4'), n('D#5')], null, null, null, null, null, null, null, [n('G4'), n('D5')], null, null, null, null, null, null, null, null, null, null, null, [n('G4'), n('C5')], null, null, null, [n('C5'), n('G5')], null, null, null, [n('G5'), n('C6')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D4'), n('G4')], null, null, null, [n('G4'), n('D5')], null, null, null, [n('D5'), n('G5')], null, null, null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 23
    {
      bass: seq('D3 . D3 . D3 . D3 . D3 . D3 . D3 . D3 . | G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      twinkle: seq('. . . . B5 . C6 . C#6 . . . D6 . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,2,null,2,null,4,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('D4')], [n('B3'), n('D4')], [n('F4')], [n('D4'), n('F4')], [n('B4')], [n('F4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('F5')], [n('D5'), n('F5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('F4'), n('B4')], [n('F4')], [n('D4'), n('F4')], [n('D4')], [n('B3'), n('D4')], [n('G4')], [n('D4'), n('G4')], [n('B4')], [n('G4'), n('B4')], [n('D5')], [n('B4'), n('D5')], [n('G5')], [n('D5'), n('G5')], [n('D5')], [n('B4'), n('D5')], [n('B4')], [n('G4'), n('B4')], [n('G4')], [n('D4'), n('G4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('D5'), n('G#5')], null, null, null, null, null, null, null, [n('D5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, [n('D4'), n('G4')], null, null, null, [n('G4'), n('D5')], null, null, null, [n('B4'), n('G5')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('A3'), n('D4')], null, null, null, [n('D4'), n('A4')], null, null, null, [n('A4'), n('D5')], null, null, null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 24
    {
      bass: seq('F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . F#2 . | D2 . D2 . D2 . D2 . D2 . D2 . D2 . D2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      twinkle: seq('. . . . F#5 . G5 . G#5 . . . A5 . . . | A5 . . . . . . . . . G#5 . A5 . C6 .'),
      twinkleLen: [null,null,null,null,2,null,2,null,4,null,null,null,4,null,null,null,10,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null],
      chords: [[n('D4')], [n('A3'), n('D4')], [n('F#4')], [n('D4'), n('F#4')], [n('A4')], [n('F#4'), n('A4')], [n('C5')], [n('F#4'), n('C5')], [n('D5')], [n('A4'), n('D5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D4'), n('F#4')], [n('D4')], [n('A3'), n('D4')], [n('D4')], [n('A3'), n('D4')], [n('F#4')], [n('D4'), n('F#4')], [n('A4')], [n('F#4'), n('A4')], [n('D5')], [n('A4'), n('D5')], [n('F#5')], [n('D5'), n('F#5')], [n('D5')], [n('A4'), n('D5')], [n('A4')], [n('F#4'), n('A4')], [n('F#4')], [n('D4'), n('F#4')]],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1]],
      chords2: [[n('F#4'), n('D5')], null, null, null, null, null, null, null, [n('D4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, [n('A4'), n('D5')], null, null, null, [n('F#4'), n('C5')], null, null, null, [n('F#4'), n('D5')], null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('E4'), n('A4')], null, null, null, [n('C#4'), n('G4')], null, null, null, [n('E4'), n('A4')], null, null, null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[4,4],null,null,null,[4,4],null,null,null,[4,4],null,null,null],
    },
    // section 25
    {
      bass: seq('G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 . | . . . . . . . . . . . . . . . .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('D#6 . . . . . D6 C6 D6 . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [6,null,null,null,null,null,1,1,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[n('C4')], [n('G3'), n('C4')], [n('D#4')], [n('C4'), n('D#4')], [n('G4')], [n('D#4'), n('G4')], [n('C5')], [n('G4'), n('C5')], [n('F5')], [n('D5'), n('F5')], [n('G5')], [n('F5'), n('G5')], [n('B5')], [n('G5'), n('B5')], [n('D6')], [n('B5'), n('D6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],[1],[1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('G4'), n('D#5')], null, null, null, null, null, null, null, [n('F4'), n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[8,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [[n('D4'), n('A#4')], null, null, null, null, null, null, null, [n('C4'), n('A4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [[4,4],null,null,null,null,null,null,null,[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0, 1, 2, 3, 4, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 11, 15, 16, 17, 18, 19, 20, 21, 11, 12, 13, 14, 11, 15, 16, 22, 23, 19, 24, 25],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }],
};

export const arrangement = null;

export const variants = null;
