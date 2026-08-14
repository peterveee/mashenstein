// SHOP 80BPM — imported from shop 80bpm.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 7 parts in the file, 7 lanes here — nothing was merged onto anything else.
// 1 of them is a layer (chords2): real lanes with the
// notes below, declared in the mix at the foot of this file, and SILENT until you
// give each one a voice on the desk. A layer is a preset and nothing else.
import { seq, chordSeq, chord, n } from '../../engine/notes.js';

export const id = "shop-80bpm";
export const title = "SHOP 80BPM";
export const slug = "shop-80bpm";
export const group = "imported";

export const bank = {
  bpm: 80,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      chords: chordSeq('E4min7 E4min7 E4min7 E4min7 E4min7 . E4min7 E4min7 E4min7 E4min7 E4min7 . E4min7 E4min7 E4min7 . | . . . . . . . . . . . . . . . .'),
      chordsLen: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 1
    {
      chords: [null, chord('B3min7'), chord('B3min7'), null, [n('B3'), n('D4'), n('G4')], [n('B3'), n('D4'), n('G4')], null, chord('B3min'), chord('B3min'), null, [n('B3'), n('D4'), n('E4')], [n('B3'), n('D4'), n('E4')], null, null, null, null, null, chord('B3min7'), chord('B3min7'), null, [n('B3'), n('D4'), n('G4')], [n('B3'), n('D4'), n('G4')], null, chord('B3min'), chord('B3min'), null, [n('B3'), n('D4'), n('E4')], [n('B3'), n('D4'), n('E4')], null, null, null, null],
      chordsLen: [null,[1,1,1,1],[1,1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,null,null,null],
    },
    // section 2
    {
      bass: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('G5')], null, null],
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3,3],null,null],
      twinkle: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('G5')], null, null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3,3],null,null],
      chords: [null, chord('E4min7'), chord('E4min7'), null, [n('E4'), n('G4'), n('C5')], [n('E4'), n('G4'), n('C5')], null, chord('E4min'), chord('E4min'), null, [n('E4'), n('G4'), n('A4')], [n('E4'), n('G4'), n('A4')], null, null, null, null, null, chord('D#4maj7'), chord('D#4maj7'), null, [n('D#4'), n('G4'), n('C5')], [n('D#4'), n('G4'), n('C5')], null, chord('D#4'), chord('D#4'), null, [n('D#4'), n('G4'), n('A4')], [n('D#4'), n('G4'), n('A4')], null, null, null, null],
      chordsLen: [null,[1,1,1,1],[1,1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,null,null,null,null,[1,1,1,1],[1,1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,[1,1,1],[1,1,1],null,null,null,null],
    },
    // section 3
    {
      bass: [[n('D5'), n('F#5')], null, null, null, null, null, null, null, [n('C#5'), n('E5')], null, null, null, null, null, null, null, n('C5'), null, null, null, null, null, null, null, [n('D5'), n('F5')], null, null, null, null, null, null, null],
      bassLen: [[8,8],null,null,null,null,null,null,null,[8,16],null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
      twinkle: [[n('D5'), n('F#5')], null, null, null, null, null, null, null, [n('C#5'), n('E5')], null, null, null, null, null, null, null, n('C5'), null, null, null, null, null, null, null, [n('D5'), n('F5')], null, null, null, null, null, null, null],
      twinkleLen: [[8,8],null,null,null,null,null,null,null,[8,16],null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
      chords: [null, null, null, null, chord('B3min'), null, [n('A4')], [n('A#3'), n('C#4'), n('E4')], null, null, null, null, null, null, null, null, null, null, null, [n('A3'), n('C4'), n('D#4')], [n('E4')], [n('A3'), n('C4'), n('F#4')], [n('G4')], [n('A4')], [n('D4'), n('G#4'), n('B4')], null, null, null, [n('D4'), n('F4'), n('C5')], null, null, null],
      chordsLen: [null,null,null,null,[1,1,1],null,[1],[3,3,3],null,null,null,null,null,null,null,null,null,null,null,[1,1,1],[1],[1,1,1],[1],[1],[4,4,4],null,null,null,[1,1,1],null,null,null],
    },
    // section 4
    {
      bass: [null, null, [n('G5'), n('C6')], null, null, [n('G5'), n('C6')], null, null, null, null, [n('F#5'), n('C6')], null, null, [n('F#5'), n('C6')], null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, [n('A5'), n('C#6'), n('E6')], [n('A5'), n('C#6'), n('E6')], [n('A5'), n('C6'), n('D#6')], [n('A5'), n('C6'), n('D#6')], [n('A5'), n('C6'), n('D#6')], null],
      bassLen: [null,null,[1,1],null,null,[1,1],null,null,null,null,[1,1],null,null,[1,1],null,null,null,null,[1,1,1],null,null,[1,1,1],null,null,null,null,[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],null],
      twinkle: [null, null, [n('G5'), n('C6')], null, null, null, null, null, null, null, [n('F#5'), n('C6')], null, null, null, null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, [n('A5'), n('C#6'), n('E6')], [n('A5'), n('C#6'), n('E6')], [n('A5'), n('C6'), n('D#6')], [n('A5'), n('C6'), n('D#6')], [n('A5'), n('C6'), n('D#6')], null],
      twinkleLen: [null,null,[1,1],null,null,null,null,null,null,null,[1,1],null,null,null,null,null,null,null,[1,1,1],null,null,[1,1,1],null,null,null,null,[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],null],
      chords: [[n('C4'), n('E4'), n('B4')], null, [n('C4'), n('E4')], [n('C4'), n('E4')], null, chord('C4maj7'), null, [n('C4'), n('F#4'), n('A#4')], null, null, [n('C4'), n('D#4')], [n('C4'), n('D#4')], null, [n('C4'), n('F#4'), n('A#4')], null, chord('B3min7'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1,1,1],null,[1,1],[1,1],null,[1,1,1,1],null,[2,2,2],null,null,[1,1],[1,1],null,[1,1,1],null,[5,5,5,5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 5
    {
      bass: [[n('G#5'), n('B5'), n('D#6')], null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, [n('B4'), n('D#5'), n('F#5'), n('G#5')], null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null],
      bassLen: [[1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3,3],null,null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3,3],null,null],
      twinkle: [[n('G#5'), n('B5'), n('D#6')], null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, [n('B4'), n('D#5'), n('F#5'), n('G#5')], null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null],
      twinkleLen: [[1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3,3],null,null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3,3],null,null],
      organChords: [null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, [n('E4'), n('G#4'), n('B4'), n('E5')], [n('E4'), n('G#4'), n('B4'), n('E5')], null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, null, null, null, null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, [n('E4'), n('G#4'), n('B4'), n('E5')], [n('E4'), n('G#4'), n('B4'), n('E5')], null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, null, null, null],
      organChordsLen: [null,[1,1,1,1,1],[1,1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,null,null,null,null,[1,1,1,1,1],[1,1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,null,null,null],
    },
    // section 6
    {
      bass: [[n('B4'), n('D5'), n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('E5'), n('F#5'), n('A5')], null, null, [n('A4'), n('B4'), n('D5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('F5'), n('A5')], null, null],
      bassLen: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3,3],null,null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3],null,null],
      twinkle: [[n('B4'), n('D5'), n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('E5'), n('F#5'), n('A5')], null, null, [n('A4'), n('B4'), n('D5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('F5'), n('A5')], null, null],
      twinkleLen: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3,3],null,null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,[3,3,3],null,null],
      organChords: [null, [n('F#4'), n('G4'), n('B4'), n('D5'), n('F#5')], [n('F#4'), n('G4'), n('B4'), n('D5'), n('F#5')], null, [n('E4'), n('G4'), n('B4'), n('E5')], [n('E4'), n('G4'), n('B4'), n('E5')], null, [n('D4'), n('G4'), n('B4'), n('D5')], [n('D4'), n('G4'), n('B4'), n('D5')], null, [n('C#4'), n('G4'), n('B4'), n('C#5')], [n('C#4'), n('G4'), n('B4'), n('C#5')], null, null, null, null, null, [n('E4'), n('F#4'), n('A4'), n('C#5'), n('E5')], [n('E4'), n('F#4'), n('A4'), n('C#5'), n('E5')], null, [n('D4'), n('F#4'), n('A4'), n('D5')], [n('D4'), n('F#4'), n('A4'), n('D5')], null, [n('C#4'), n('F#4'), n('A4'), n('C#5')], [n('C#4'), n('F#4'), n('A4'), n('C#5')], null, [n('B3'), n('F4'), n('A4'), n('B4')], [n('B3'), n('F4'), n('A4'), n('B4')], null, null, null, null],
      organChordsLen: [null,[1,1,1,1,1],[1,1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,null,null,null,null,[1,1,1,1,1],[1,1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],null,null,null,null],
    },
    // section 7
    {
      bass: [[n('B4'), n('E5'), n('G#5')], null, null, null, null, null, null, null, [n('D#5'), n('F#5')], null, null, null, n('A4'), null, null, null, n('D5'), null, null, null, null, null, null, null, [n('G#5'), n('C#6')], null, null, null, [n('F5'), n('C6')], null, null, null],
      bassLen: [[12,8,8],null,null,null,null,null,null,null,[8,20],null,null,null,12,null,null,null,16,null,null,null,null,null,null,null,[8,4],null,null,null,[4,4],null,null,null],
      twinkle: [[n('B4'), n('E5'), n('G#5')], null, null, null, null, null, null, null, [n('D#5'), n('F#5')], null, null, null, n('A4'), null, null, null, n('D5'), null, null, null, null, null, null, null, [n('G#5'), n('C#6')], null, null, null, [n('F5'), n('C6')], null, null, null],
      twinkleLen: [[12,8,8],null,null,null,null,null,null,null,[8,20],null,null,null,12,null,null,null,16,null,null,null,null,null,null,null,[8,4],null,null,null,[4,4],null,null,null],
      chords2: [null, null, [n('E5'), n('G#5')], [n('E5'), n('G#5')], null, [n('G#5'), n('B5')], null, [n('D#5'), n('F#5')], null, null, null, null, null, null, null, null, null, [n('D5'), n('F#5')], null, [n('C#5'), n('F5')], [n('D5'), n('F#5')], [n('E5'), n('G#5')], [n('F#5'), n('A5')], [n('G#5'), n('B5')], [n('G#5'), n('C#6')], null, null, null, [n('G#5'), n('C6')], null, null, null],
      chords2Len: [null,null,[1,1],[1,1],null,[1,1],null,[2,2],null,null,null,null,null,null,null,null,null,[1,1],null,[1,1],[1,1],[1,1],[1,1],[1,1],[4,4],null,null,null,[1,1],null,null,null],
    },
    // section 8
    {
      bass: [[n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], null, null, null, null, null, [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], null, [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], null, null, null, null, null, null, null, [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], null],
      bassLen: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],null],
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C4 C4 C4 C4 . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C4 C4 C4 C4 . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,null,null],
      twinkle: [[n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], null, null, null, null, null, [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], [n('C#5'), n('E5'), n('G#5'), n('B5')], null, [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], [n('C5'), n('E5'), n('G5'), n('B5')], null, null, null, null, null, null, null, [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], null],
      twinkleLen: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],null],
      chords2: [[n('B5')], [n('B5')], [n('B5')], [n('B5')], [n('B5')], null, null, null, null, null, [n('B5')], [n('B5')], [n('B5')], [n('B5')], [n('B5')], null, [n('B5')], [n('B5')], [n('B5')], [n('B5')], [n('B5')], null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[1],[1],[1],[1],[1],null,null,null,null,null,[1],[1],[1],[1],[1],null,[1],[1],[1],[1],[1],null,null,null,null,null,null,null,null,null,null,null],
      organChords: chordSeq('C#4min7 . . . . . . . . . C#4min7 . . . . . | C4maj7 . . . . . . . . . . . . . . .'),
      organChordsLen: [[1,1,1,1],null,null,null,null,null,null,null,null,null,[1,1,1,1],null,null,null,null,null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "chords2", from: "chords", independent: true }],
};

export const arrangement = null;

export const variants = null;
