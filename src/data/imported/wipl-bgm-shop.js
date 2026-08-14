// WIPL_BGM_SHOP — imported from WIPL_BGM_SHOP.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 12 parts in the file, 12 lanes here — nothing was merged onto anything else.
// 6 of them are layers (lead2, lead3, chords2, chords3, chords4, chords5): real lanes with the
// notes below, declared in the mix at the foot of this file, and SILENT until you
// give each one a voice on the desk. A layer is a preset and nothing else.
import { seq, chordSeq, chord, n } from '../../engine/notes.js';

export const id = "wipl-bgm-shop";
export const title = "WIPL_BGM_SHOP";
export const slug = "wipl-bgm-shop";
export const group = "imported";

export const bank = {
  bpm: 148,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      bass: seq('C4 . . . . . . . . . . . C4 . . . | . . . . . . . . C4 C4 C4 C4 C4 . . .'),
      bassLen: [2,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,null,null,null],
      leadHarm: seq('C4 . . . . . . . . . . . C4 . . . | . . . . . . . . C4 C4 C4 C4 C4 . . .'),
      leadHarmLen: [4,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,4,null,null,null],
      chords: chordSeq('E4min7 . E4min7 . E4min7 . E4min7 . E4min7 . . . E4min7 . E4min7 . | E4min7 . E4min7 . E4min7 . . . E4min7 E4min7 E4min7 E4min7 E4min7 . . .'),
      chordsLen: [[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null],
      organChords: [[n('D2')], null, null, null, null, null, null, null, null, null, null, null, [n('D2')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[3],null,null,null,null,null,null,null,null,null,null,null,[3],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 1
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
    },
    // section 2
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [null, null, chord('B3min7'), null, chord('B3min7'), null, null, null, [n('B3'), n('D4'), n('G4')], null, [n('B3'), n('D4'), n('G4')], null, null, null, chord('B3min'), null, chord('B3min'), null, null, null, [n('B3'), n('D4'), n('E4')], null, [n('B3'), n('D4'), n('E4')], null, null, null, null, null, null, null, null, null],
      chordsLen: [null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,null,null,null,null,null,null],
      organChords: [[n('G2')], null, null, null, null, null, [n('G2')], null, [n('D3')], null, null, null, null, null, [n('D3')], null, [n('G2')], null, null, null, null, null, [n('G2')], null, [n('D3')], null, null, null, null, null, [n('D3')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null],
    },
    // section 3
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [null, null, chord('B3min7'), null, chord('B3min7'), null, null, null, [n('B3'), n('D4'), n('G4')], null, [n('B3'), n('D4'), n('G4')], null, null, null, chord('B3min'), null, chord('B3min'), null, null, null, [n('B3'), n('D4'), n('E4')], null, [n('B3'), n('D4'), n('E4')], null, null, null, null, null, null, null, null, null],
      chordsLen: [null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,null,null,null,null,null,null],
      organChords: [[n('G2')], null, null, null, null, null, [n('G2')], null, [n('D3')], null, null, null, null, null, [n('D3')], null, [n('G2')], null, null, null, null, null, [n('G2')], null, [n('D3')], null, null, null, null, null, [n('C3')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null],
    },
    // section 4
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [null, null, chord('E4min7'), null, chord('E4min7'), null, null, null, [n('E4'), n('G4'), n('C5')], null, [n('E4'), n('G4'), n('C5')], null, null, null, chord('E4min'), null, chord('E4min'), null, null, null, [n('E4'), n('G4'), n('A4')], null, [n('E4'), n('G4'), n('A4')], null, null, null, null, null, null, null, null, null],
      chordsLen: [null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, [n('C3')], null, [n('G2')], null, null, null, null, null, [n('G2')], null, [n('C3')], null, null, null, null, null, [n('C3')], null, [n('G2')], null, null, null, null, null, [n('G2')], null],
      organChordsLen: [null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null],
    },
    // section 5
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [null, null, chord('D#4maj7'), null, chord('D#4maj7'), null, null, null, [n('D#4'), n('G4'), n('C5')], null, [n('D#4'), n('G4'), n('C5')], null, null, null, chord('D#4'), null, chord('D#4'), null, null, null, [n('D#4'), n('G4'), n('A4')], null, [n('D#4'), n('G4'), n('A4')], null, null, null, null, null, null, null, null, null],
      chordsLen: [null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,[1,1,1],null,[1,1,1],null,null,null,null,null,null,null,null,null],
      chords3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('G5')], null, null, null, null, null],
      chords3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6],null,null,null,null,null],
      chords4: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('G5')], null, null, null, null, null],
      chords4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6],null,null,null,null,null],
      organChords: [[n('C3')], null, null, null, null, null, [n('C3')], null, [n('G2')], null, null, null, null, null, [n('F2')], null, null, null, null, null, null, null, [n('F2')], null, [n('C3')], null, null, null, null, null, [n('C3')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null,null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null],
    },
    // section 6
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [null, null, null, null, null, null, null, null, chord('B3min'), null, null, null, [n('A4')], null, [n('A#3'), n('C#4'), n('E4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [null,null,null,null,null,null,null,null,[2,2,2],null,null,null,[1],null,[6,6,6],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [[n('D5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('E5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [[16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,32],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4: [[n('D5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('E5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords4Len: [[16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,32],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('B2')], null, null, null, null, null, [n('B2')], null, [n('F#2')], null, null, null, null, null, [n('F#2')], null, [n('A#2')], null, null, null, null, null, [n('A#2')], null, [n('E2')], null, null, null, null, null, [n('E2')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null],
    },
    // section 7
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [null, null, null, null, null, null, [n('A3'), n('C4'), n('D#4')], null, [n('E4')], null, [n('A3'), n('C4'), n('F#4')], null, [n('G4')], null, [n('A4')], null, [n('D4'), n('G#4'), n('B4')], null, null, null, null, null, null, null, [n('D4'), n('F4'), n('C5')], null, null, null, null, null, null, null],
      chordsLen: [null,null,null,null,null,null,[2,2,2],null,[1],null,[1,1,1],null,[1],null,[1],null,[8,8,8],null,null,null,null,null,null,null,[1,1,1],null,null,null,null,null,null,null],
      chords3: [[n('C5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5'), n('F5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [[16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4: [[n('C5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5'), n('F5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords4Len: [[16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('A2')], null, null, null, null, null, [n('A2')], null, [n('E2')], null, null, null, null, null, [n('E2')], null, [n('G#2')], null, null, null, null, null, [n('E3')], null, null, null, [n('F#2')], null, null, null, [n('G#2')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[3],null,null,null,[3],null,null,null,[1],null],
    },
    // section 8
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords: [[n('C4'), n('E4'), n('B4')], null, null, null, [n('C4'), n('E4')], null, [n('C4'), n('E4')], null, null, null, chord('C4maj7'), null, null, null, [n('C4'), n('F#4'), n('A#4')], null, null, null, null, null, [n('C4'), n('D#4')], null, [n('C4'), n('D#4')], null, null, null, [n('C4'), n('F#4'), n('A#4')], null, null, null, chord('B3min7'), null],
      chordsLen: [[1,1,1],null,null,null,[1,1],null,[1,1],null,null,null,[1,1,1,1],null,null,null,[4,4,4],null,null,null,null,null,[1,1],null,[1,1],null,null,null,[1,1,1],null,null,null,[10,10,10,10],null],
      chords3: [null, null, null, null, [n('G5'), n('C6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('F#5'), n('C6')], null, null, null, null, null, null, null, null, null, null, null],
      chords3Len: [null,null,null,null,[1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],null,null,null,null,null,null,null,null,null,null,null],
      chords4: [null, null, null, null, [n('G5'), n('C6')], null, null, null, null, null, [n('G5'), n('C6')], null, null, null, null, null, null, null, null, null, [n('F#5'), n('C6')], null, null, null, null, null, [n('F#5'), n('C6')], null, null, null, null, null],
      chords4Len: [null,null,null,null,[1,1],null,null,null,null,null,[1,1],null,null,null,null,null,null,null,null,null,[1,1],null,null,null,null,null,[1,1],null,null,null,null,null],
      organChords: [[n('A2')], null, null, null, null, null, [n('A2')], null, [n('E2')], null, null, null, null, null, [n('E2')], null, [n('G#2')], null, null, null, null, null, [n('G#2')], null, [n('D#3')], null, null, null, null, null, [n('G2')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null],
    },
    // section 9
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords3: [null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, null, null, null, null, null, chord('A5'), null, chord('A5'), null, [n('A5'), n('C6'), n('D#6')], null, [n('A5'), n('C6'), n('D#6')], null, [n('A5'), n('C6'), n('D#6')], null, null, null],
      chords3Len: [null,null,null,null,[1,1,1],null,null,null,null,null,[1,1,1],null,null,null,null,null,null,null,null,null,[1,1,1],null,[1,1,1],null,[1,1,1],null,[1,1,1],null,[1,1,1],null,null,null],
      chords4: [null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, null, [n('F#5'), n('B5'), n('D6')], null, null, null, null, null, null, null, null, null, chord('A5'), null, chord('A5'), null, [n('A5'), n('C6'), n('D#6')], null, [n('A5'), n('C6'), n('D#6')], null, [n('A5'), n('C6'), n('D#6')], null, null, null],
      chords4Len: [null,null,null,null,[1,1,1],null,null,null,null,null,[1,1,1],null,null,null,null,null,null,null,null,null,[1,1,1],null,[1,1,1],null,[1,1,1],null,[1,1,1],null,[1,1,1],null,null,null],
      organChords: [null, null, null, null, null, null, [n('G2')], null, [n('D3')], null, null, null, null, null, [n('G2')], null, [n('F#2')], null, null, null, null, null, [n('B2')], null, null, null, null, null, null, null, [n('E2')], null],
      organChordsLen: [null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null,null,null,null,null,null,null,[7],null],
    },
    // section 10
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords2: [null, null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, null, null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, null, null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, null, null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, null, null, null, null, null, null, null, null],
      chords2Len: [null,null,[1,1,1,1,1],null,[1,1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null],
      chords3: [chord('G#5min'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, null, null, null],
      chords3Len: [[1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6,6],null,null,null,null,null],
      chords4: [chord('G#5min'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, null, null, null],
      chords4Len: [[1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6,6],null,null,null,null,null],
      organChords: [null, null, null, null, null, null, [n('E2')], null, [n('B2')], null, null, null, null, null, [n('E2')], null, null, null, null, null, null, null, [n('E2')], null, [n('B2')], null, null, null, null, null, [n('B2')], null],
      organChordsLen: [null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null,null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null],
    },
    // section 11
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords2: [null, null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, [n('F#4'), n('G#4'), n('B4'), n('D#5'), n('F#5')], null, null, null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, [n('E4'), n('G#4'), n('B4'), n('E5')], null, null, null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, [n('D#4'), n('G#4'), n('B4'), n('D#5')], null, null, null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, [n('C#4'), n('G#4'), n('B4'), n('C#5')], null, null, null, null, null, null, null, null, null],
      chords2Len: [null,null,[1,1,1,1,1],null,[1,1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null],
      chords3: [[n('B4'), n('D#5'), n('F#5'), n('G#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, null, null, null],
      chords3Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6,6],null,null,null,null,null],
      chords4: [[n('B4'), n('D#5'), n('F#5'), n('G#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5'), n('G#5'), n('B5')], null, null, null, null, null],
      chords4Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6,6],null,null,null,null,null],
      organChords: [[n('E2')], null, null, null, null, null, [n('E2')], null, [n('B2')], null, null, null, null, null, [n('E3')], null, null, null, null, null, null, null, [n('G#2')], null, [n('B2')], null, null, null, null, null, [n('E2')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null,null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null],
    },
    // section 12
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords2: [null, null, [n('F#4'), n('G4'), n('B4'), n('D5'), n('F#5')], null, [n('F#4'), n('G4'), n('B4'), n('D5'), n('F#5')], null, null, null, [n('E4'), n('G4'), n('B4'), n('E5')], null, [n('E4'), n('G4'), n('B4'), n('E5')], null, null, null, [n('D4'), n('G4'), n('B4'), n('D5')], null, [n('D4'), n('G4'), n('B4'), n('D5')], null, null, null, [n('C#4'), n('G4'), n('B4'), n('C#5')], null, [n('C#4'), n('G4'), n('B4'), n('C#5')], null, null, null, null, null, null, null, null, null],
      chords2Len: [null,null,[1,1,1,1,1],null,[1,1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null],
      chords3: [[n('B4'), n('D5'), n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('E5'), n('F#5'), n('A5')], null, null, null, null, null],
      chords3Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6,6],null,null,null,null,null],
      chords4: [[n('B4'), n('D5'), n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('E5'), n('F#5'), n('A5')], null, null, null, null, null],
      chords4Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6,6],null,null,null,null,null],
      organChords: [null, null, null, null, null, null, [n('E2')], null, [n('B2')], null, null, null, null, null, [n('G2')], null, [n('A2')], null, null, null, null, null, [n('A2')], null, [n('E3')], null, null, null, null, null, [n('D3')], null],
      organChordsLen: [null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null],
    },
    // section 13
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords2: [null, null, [n('E4'), n('F#4'), n('A4'), n('C#5'), n('E5')], null, [n('E4'), n('F#4'), n('A4'), n('C#5'), n('E5')], null, null, null, [n('D4'), n('F#4'), n('A4'), n('D5')], null, [n('D4'), n('F#4'), n('A4'), n('D5')], null, null, null, [n('C#4'), n('F#4'), n('A4'), n('C#5')], null, [n('C#4'), n('F#4'), n('A4'), n('C#5')], null, null, null, [n('B3'), n('F4'), n('A4'), n('B4')], null, [n('B3'), n('F4'), n('A4'), n('B4')], null, null, null, null, null, null, null, null, null],
      chords2Len: [null,null,[1,1,1,1,1],null,[1,1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null],
      chords3: [[n('A4'), n('B4'), n('D5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('F5'), n('A5')], null, null, null, null, null],
      chords3Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6],null,null,null,null,null],
      chords4: [[n('A4'), n('B4'), n('D5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C#5'), n('F5'), n('A5')], null, null, null, null, null],
      chords4Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6,6,6],null,null,null,null,null],
      organChords: [null, null, null, null, null, null, [n('D3')], null, [n('A2')], null, null, null, null, null, [n('D#3')], null, null, null, null, null, null, null, [n('D#3')], null, [n('D3')], null, null, null, null, null, [n('C#3')], null],
      organChordsLen: [null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null,null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[7],null],
    },
    // section 14
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords3: [[n('B4'), n('E5'), n('G#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('A4')], null, null, null, null, null, null, null],
      chords3Len: [[24,16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,40],null,null,null,null,null,null,null,[24],null,null,null,null,null,null,null],
      chords4: [[n('B4'), n('E5'), n('G#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D#5'), n('F#5')], null, null, null, null, null, null, null, [n('A4')], null, null, null, null, null, null, null],
      chords4Len: [[24,16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,40],null,null,null,null,null,null,null,[24],null,null,null,null,null,null,null],
      chords5: [null, null, null, null, [n('E5'), n('G#5')], null, [n('E5'), n('G#5')], null, null, null, [n('G#5'), n('B5')], null, null, null, [n('D#5'), n('F#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords5Len: [null,null,null,null,[1,1],null,[1,1],null,null,null,[1,1],null,null,null,[4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, [n('C#3')], null, [n('G#2')], null, null, null, null, null, [n('G#2')], null, [n('C3')], null, null, null, null, null, [n('C3')], null, [n('F#2')], null, null, null, null, null, [n('F#2')], null],
      organChordsLen: [null,null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null],
    },
    // section 15
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords3: [[n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G#5'), n('C#6')], null, null, null, null, null, null, null, [n('F5'), n('C6')], null, null, null, null, null, null, null],
      chords3Len: [[32],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
      chords4: [[n('D5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('G#5'), n('C#6')], null, null, null, null, null, null, null, [n('F5'), n('C6')], null, null, null, null, null, null, null],
      chords4Len: [[32],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16,8],null,null,null,null,null,null,null,[8,8],null,null,null,null,null,null,null],
      chords5: [null, null, [n('D5'), n('F#5')], null, null, null, [n('C#5'), n('F5')], null, [n('D5'), n('F#5')], null, [n('E5'), n('G#5')], null, [n('F#5'), n('A5')], null, [n('G#5'), n('B5')], null, [n('G#5'), n('C#6')], null, null, null, null, null, null, null, [n('G#5'), n('C6')], null, null, null, null, null, null, null],
      chords5Len: [null,null,[1,1],null,null,null,[2,2],null,[1,1],null,[1,1],null,[1,1],null,[1,1],null,[8,8],null,null,null,null,null,null,null,[1,1],null,null,null,null,null,null,null],
      organChords: [[n('B2')], null, null, null, null, null, [n('B2')], null, [n('F#2')], null, null, null, null, null, [n('F#2')], null, [n('E2')], null, null, null, null, null, [n('E3')], null, null, null, [n('F#2')], null, null, null, [n('G#2')], null],
      organChordsLen: [[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[1],null,[5],null,null,null,null,null,[3],null,null,null,[3],null,null,null,[1],null],
    },
    // section 16
    {
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . C4 . C4 . . . . . C4 .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . C4 . . . . . C4 . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null],
      chords2: chordSeq('C#4min7 . . . . . . . . . . . . . . . | . . . . C#4min7 . . . . . . . . . . .'),
      chords2Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null],
      chords3: chordSeq('C#5min7 . C#5min7 . C#5min7 . C#5min7 . C#5min7 . . . . . . . | . . . . C#5min7 . C#5min7 . C#5min7 . C#5min7 . C#5min7 . . .'),
      chords3Len: [[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null],
      chords4: chordSeq('C#5min7 . C#5min7 . C#5min7 . C#5min7 . C#5min7 . . . . . . . | . . . . C#5min7 . C#5min7 . C#5min7 . C#5min7 . C#5min7 . . .'),
      chords4Len: [[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null],
      chords5: [[n('B5')], null, [n('B5')], null, [n('B5')], null, [n('B5')], null, [n('B5')], null, null, null, null, null, null, null, null, null, null, null, [n('B5')], null, [n('B5')], null, [n('B5')], null, [n('B5')], null, [n('B5')], null, null, null],
      chords5Len: [[1],null,[1],null,[1],null,[1],null,[1],null,null,null,null,null,null,null,null,null,null,null,[1],null,[1],null,[1],null,[1],null,[1],null,null,null],
      organChords: [[n('A2')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('A2')], null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[3],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3],null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 17
    {
      bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C4 C4 C4 C4 C4 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,null,null,null],
      lead: seq('C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 . | C4 . . . . . . . . . . . . . . .'),
      leadLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . C4 . C4 C4 . C4 . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,1,2,null,2,null,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | . . . . C4 . C4 C4 . C4 . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,1,2,null,2,null,null,null,null,null,null],
      leadHarm: seq('C4 . . . . . C4 . C4 . . . . . C4 . | C4 . . . . . . . . . . . . . . .'),
      leadHarmLen: [4,null,null,null,null,null,2,null,4,null,null,null,null,null,2,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C4 . . . . . C4 . . . . . C4 . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [2,null,null,null,null,null,2,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: chordSeq('C4maj7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords2Len: [[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3: [chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], null, null, null],
      chords3Len: [[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null],
      chords4: [chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, chord('C5maj7'), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], [n('C5'), n('E5'), n('F#5'), n('B5')], null, null, null],
      chords4Len: [[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,[1,1,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],null,null,null],
      chords5: [[n('B5')], null, [n('B5')], null, [n('B5')], null, [n('B5')], null, [n('B5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords5Len: [[1],null,[1],null,[1],null,[1],null,[1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('A2')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[3],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }, { key: "chords4", from: "chords", independent: true }, { key: "chords5", from: "chords", independent: true }],
};

export const arrangement = null;

export const variants = null;
