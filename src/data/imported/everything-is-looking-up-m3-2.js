// EVERYTHING IS LOOKING UP M3 — imported from Everything Is Looking Up M3.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 22 parts in the file, 22 lanes here — nothing was merged onto anything else.
// 16 of them are layers (lead2, lead3, lead4, lead5, lead6, lead7, lead8, lead9, lead10, lead11, bass2, chords2, lead12, lead13, lead14, lead15): real lanes with the
// notes below, declared in the mix at the foot of this file. A layer is a preset and
// nothing else.
//
// Every pitched lane starts on a MonoSynth starter — Simple Sawtooth on the bass,
// Simple Square on the rest — because a MIDI file carries no timbre and arriving as one
// arcade square on every lane is a poor first hearing of somebody's arrangement. Kit
// lanes start on the Tom. All of it is a starting point: choose the real sounds on the
// desk and it rewrites the mix below.
import { seq, chordSeq, n } from '../../engine/notes.js';

export const id = "everything-is-looking-up-m3-2";
export const title = "EVERYTHING IS LOOKING UP M3";
export const slug = "everything-is-looking-up-m3-2";
export const group = "imported";

export const bank = {
  bpm: 135,
  musicTrim: 0.7,
  sections: [
    // section 0
    {

    },
    // section 1
    {
      chords: chordSeq('C47 . . . . . . . . . . . . . . . | A#37 . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[5,4,4,5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 2
    {
      lead4: seq('. . . . . . . . . . . . . . . . | . . G3 G3 . . A#3 . G3 . . . F3 . . .'),
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,null,null,1,null,1,null,null,null,1,null,null,null],
      chords: chordSeq('G37 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 3
    {
      bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . B2 . . . B2 .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null],
      lead: seq('C7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . B2 . . . B2 .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null],
      lead15: seq('. . . . . . . . . . . . . . . . | C3 . . . . . . . . . . . . . . .'),
      lead15Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: chordSeq('G37 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 4
    {
      bass: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 5
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | . . G3 G3 . . A#3 . G3 . . . F3 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,null,null,1,null,1,null,null,null,1,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 6
    {
      bass: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      chords: chordSeq('C47 . . . . . . . . . . . . . . . | A#37 . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[5,4,4,5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
      organChords: chordSeq('C47 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 7
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead: seq('C7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      chords: chordSeq('G37 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 8
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | . . G3 . . . A#3 . G3 . . . F3 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,1,null,null,null,1,null,null,null],
      lead8: seq('. . . . . . . . . . . . . . . . | . . G3 . . . A#3 . . . C4 . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      leadHarm: [[n('F4'), n('A4'), n('C5'), n('D#5')], null, null, null, null, null, [n('G4'), n('B4'), n('D5'), n('F5')], null, null, null, null, null, [n('A4'), n('C5'), n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[4,4,4,4],null,null,null,null,null,[3,3,3,3],null,null,null,null,null,[12,12,12,13],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 9
    {
      bass: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . A#3 . C4 . A#3 . C4 . A#3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('C5 . . . . . D5 . . . . . A#4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,5,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . A#4 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 10
    {
      bass: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . F3 . G3 . F3 . G3 . F3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('G4 . . . . . A4 . . . . . F4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,4,null,null,null,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . F4 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 11
    {
      bass: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . A#3 . C4 . A#3 . C4 . A#3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('C5 . . . . . D5 . . . . . A#4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,4,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . A#3 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 12
    {
      bass: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . F3 . G3 . F3 . G3 . F3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('G4 . . . . . A4 . . . . . F4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,2,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . F3 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 13
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 14
    {
      bass: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead7: seq('A#4 . . . . . A4 . . . . . A#4 . A4 . | G#4 . . . . . G4 . . . . . . . . .'),
      lead7Len: [5,null,null,null,null,null,2,null,null,null,null,null,1,null,1,null,6,null,null,null,null,null,2,null,null,null,null,null,null,null,null,null],
      chords: chordSeq('C47 . . . . . . . . . . . . . . . | A#37 . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[5,4,4,5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
      organChords: chordSeq('C47 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 15
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead10: seq('D#5 . . . . . F5 . . . . . G5 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [19,null,null,null,null,null,13,null,null,null,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead11: seq('D#5 . . . . . F5 . . . . . G5 . . . | . . . . . . . . . . . . . . . .'),
      lead11Len: [19,null,null,null,null,null,13,null,null,null,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 16
    {
      bass: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      chords: chordSeq('C47 . . . . . D4min7 . . . . . . . . . | A#37 . . . . . A3min7 . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,null,null,null,null,[5,4,4,5],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
      organChords: chordSeq('C47 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 17
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | . . G3 G3 . . A#3 . G3 . . . F3 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,null,null,1,null,1,null,null,null,1,null,null,null],
      leadHarm: [[n('F4'), n('A4'), n('C5'), n('D#5')], null, null, null, null, null, [n('G4'), n('B4'), n('D5'), n('F5')], null, null, null, null, null, [n('A4'), n('C5'), n('E5'), n('G5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      leadHarmLen: [[4,4,4,4],null,null,null,null,null,[3,3,3,3],null,null,null,null,null,[12,12,12,13],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 18
    {
      bass: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead13: seq('. . . . . . . . . . . . . . . . | . . . . C3 . . . C3 . B2 . . . A#2 .'),
      lead13Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,2,null,null,null,5,null],
      chords: chordSeq('C47 . . . . . D4min7 . . . . . . . . . | A#37 . . . . . A3min7 . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,null,null,null,null,[5,4,4,5],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
      organChords: chordSeq('C47 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChordsLen: [[4,4,4,4],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 19
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | . . G3 . . . A#3 . G3 . . . F3 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,1,null,null,null,1,null,null,null],
      lead8: seq('. . . . . . . . . . . . . . . . | . . G3 . . . A#3 . . . C4 . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 20
    {
      bass: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . A#3 . C4 . A#3 . C4 . A#3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('C5 . . . . . D5 . . . . . A#4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,5,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . A#4 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead14: seq('. . . . . . . . . . . . C3 . . . | . . . . . . . . . . . . . . . .'),
      lead14Len: [null,null,null,null,null,null,null,null,null,null,null,null,14,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead15: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . C3'),
      lead15Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15],
      twinkle: [[n('C4'), n('E4'), n('G4'), n('A#4')], null, null, null, null, null, [n('D4'), n('F4'), n('A4'), n('C5')], null, null, null, null, null, [n('A#3'), n('D4'), n('F4'), n('G#4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[4,4,4,3],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,[16,16,15,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 21
    {
      bass: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . F3 . G3 . F3 . G3 . F3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('G4 . . . . . A4 . . . . . F4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,4,null,null,null,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . F4 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [[n('A3'), n('C4'), n('E4'), n('G4')], null, null, null, null, null, [n('B3'), n('D4'), n('F4'), n('A4')], null, null, null, null, null, [n('G3'), n('B3'), n('D4'), n('F4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[4,3,3,4],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,[16,16,16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 22
    {
      bass: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . D#3 . C3 . D#3 . F3 . . . D#3 . A#2 . | . . A#2 . . . A#2 . . . A#2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,2,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . A#3 . C4 . A#3 . C4 . A#3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('C5 . . . . . D5 . . . . . A#4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,4,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . A#3 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead14: seq('. . . . . . . . . . . . C3 . . . | . . . . . . . . . . . . . . . .'),
      lead14Len: [null,null,null,null,null,null,null,null,null,null,null,null,17,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead15: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . C3'),
      lead15Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15],
      twinkle: [[n('C4'), n('E4'), n('G4'), n('A#4')], null, null, null, null, null, [n('D4'), n('F4'), n('A4'), n('C5')], null, null, null, null, null, [n('A#3'), n('D4'), n('F4'), n('G#4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[4,4,4,3],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,[16,16,15,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 23
    {
      bass: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . A#2 . G2 . A#2 . C3 . . . C3 . G2 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      lead6: seq('. . . . . . . . . . . . . . . . | . . F3 . G3 . F3 . G3 . F3 . . . . .'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null],
      lead7: seq('G4 . . . . . A4 . . . . . F4 . . . | . . . . . . . . . . . . . . . .'),
      lead7Len: [6,null,null,null,null,null,2,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead10: seq('. . . . . . . . . . . . F3 . . . | . . . . . . . . . . . . . . . .'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [[n('A3'), n('C4'), n('E4'), n('G4')], null, null, null, null, null, [n('B3'), n('D4'), n('F4'), n('A4')], null, null, null, null, null, [n('G3'), n('B3'), n('D4'), n('F4')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [[4,3,3,4],null,null,null,null,null,[2,2,2,2],null,null,null,null,null,[16,16,16,16],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 24
    {
      bass: seq('C3 . . . . . C3 . . . C3 . . . C3 . | . . A#2 . A#2 . . . A2 . . . . . . .'),
      bassLen: [1,null,null,null,null,null,1,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . . . . . C3 . . . C3 . . . C3 . | . . A#2 . A#2 . . . A2 . . . . . . .'),
      lead2Len: [1,null,null,null,null,null,1,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 25
    {
      bass: seq('G#2 . . . . . G#2 . . . G#2 . . . G#2 . | . . G2 . G2 . . . G2 . . . . . . .'),
      bassLen: [2,null,null,null,null,null,2,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G#2 . . . . . G#2 . . . G#2 . . . G#2 . | . . G2 . G2 . . . G2 . . . . . . .'),
      lead2Len: [2,null,null,null,null,null,2,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      lead12: seq('C5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead12Len: [28,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead15: seq('. . . . . . . . . . . . . . . C3 | . . . . . . . . . . . . . . . .'),
      lead15Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,18,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 26
    {
      bass: seq('C3 . . . . . C3 . . . C3 . . . C3 . | . . A#2 . A#2 . . . A2 . . . . . . .'),
      bassLen: [1,null,null,null,null,null,1,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . . . . . C3 . . . C3 . . . C3 . | . . A#2 . A#2 . . . A2 . . . . . . .'),
      lead2Len: [1,null,null,null,null,null,1,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      lead9: seq('G5 . C6 . D6 . G6 . . . D6 . C6 . G5 . | . . C6 . D6 . G6 . . . . . . . . .'),
      lead9Len: [6,null,4,null,2,null,4,null,null,null,3,null,3,null,6,null,null,null,4,null,2,null,4,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 27
    {
      bass: seq('G#2 . . . . . G#2 . . . G#2 . . . G#2 . | . . G2 . G2 . . . G2 . . . . . . .'),
      bassLen: [2,null,null,null,null,null,2,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G#2 . . . . . G#2 . . . G#2 . . . G#2 . | . . G2 . G2 . . . G2 . . . . . . .'),
      lead2Len: [2,null,null,null,null,null,2,null,null,null,1,null,null,null,3,null,null,null,1,null,1,null,null,null,2,null,null,null,null,null,null,null],
      lead12: seq('C5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead12Len: [27,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 28
    {
      bass: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead2: seq('C3 . C4 . C3 . G3 . C3 . . . D#3 . F3 . | . . C3 . . . C3 . . . C3 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead5: seq('C3 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [31,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 29
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead: seq('C7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [28,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead5: seq('G2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [31,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 30
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead5: seq('G2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [31,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 31
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead3: seq('. . . . . . . . . . . . . . . . | . . G3 . . . A#3 . G3 . . . F3 . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,1,null,null,null,1,null,null,null],
      lead8: seq('. . . . . . . . . . . . . . . . | . . G3 . . . A#3 . . . C4 . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,null,null,2,null,null,null,null,null],
      chords: chordSeq('F37 . . . . . G37 . . . . . A3min7 . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [[4,4,4,4],null,null,null,null,null,[3,3,3,3],null,null,null,null,null,[12,12,12,13],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 32
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead: seq('C7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [26,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead5: seq('G2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [31,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 33
    {
      bass: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      bassLen: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      lead2: seq('G2 . G3 . G2 . D3 . G2 . . . A#2 . C3 . | . . G2 . . . G2 . . . G2 . . . . .'),
      lead2Len: [1,null,1,null,1,null,1,null,1,null,null,null,1,null,2,null,null,null,2,null,null,null,1,null,null,null,1,null,null,null,null,null],
      lead5: seq('G2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [31,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead13: seq('. . . . . . . . . . . . . . . . | . . . . C3 . . . C3 . B2 . . . A#2 .'),
      lead13Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,null,null,1,null,2,null,null,null,6,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 34
    {
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 35
    {
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . D2 D2'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,1,1],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
    // section 36
    {
      bass2: seq('. . . . D2 . . D2 . . . . D2 . . . | . . . . D2 . . D2 . . . . E2 . . .'),
      bass2Len: [null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,1,null,null,null,null,1,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | C7 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,21,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: [[n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('A#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('F#2')], null, [n('D2'), n('F#2')], null, [n('F#2')], null],
      chords2Len: [[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null,[2],null,[2],null,[2,2],null,[1],null,[2],null,[2],null,[2,2],null,[2],null],
    },
  ],
  order: [0, 1, 2, 1, 3, 4, 5, 6, 7, 4, 5, 4, 8, 9, 10, 11, 12, 4, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 14, 15, 28, 29, 28, 30, 4, 5, 16, 31, 20, 21, 22, 23, 28, 32, 28, 33, 34, 35, 36],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead8", from: "lead", independent: true }, { key: "lead9", from: "lead", independent: true }, { key: "lead10", from: "lead", independent: true }, { key: "lead11", from: "lead", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead12", from: "lead", independent: true }, { key: "lead13", from: "lead", independent: true }, { key: "lead14", from: "lead", independent: true }, { key: "lead15", from: "lead", independent: true }],
  labels: {"chords":"Kontakt","organChords":"Kontakt","lead":"Analog Classique 2","leadHarm":"Kontakt","twinkle":"Kontakt","bass":"Polysix","lead2":"Polysix","lead3":"BA EL VintagePickMute_JW","lead4":"BA EL VintagePickMute_JW","lead5":"Sunburst Power Chords","lead6":"BA EL VintagePickMute_JW","lead7":"LED Hard Leader","lead8":"HS Phasebook","lead9":"JL Danger Wheel","lead10":"SW Flute pad","lead11":"SW Flute pad","bass2":"2-Step Sparse Beat","chords2":"Breaks Low Funk Beat 01","lead12":"FM8","lead13":"Whistle Hit","lead14":"Hummmm","lead15":"Ahhhhh"},
  voice: {"bassVoice":"simpleSawtooth","bass2Voice":"simpleSawtooth","leadVoice":"simpleSquare","lead2Voice":"simpleSquare","lead3Voice":"simpleSquare","lead4Voice":"simpleSquare","lead5Voice":"simpleSquare","lead6Voice":"simpleSquare","lead7Voice":"simpleSquare","lead8Voice":"simpleSquare","lead9Voice":"simpleSquare","lead10Voice":"simpleSquare","lead11Voice":"simpleSquare","lead12Voice":"simpleSquare","lead13Voice":"simpleSquare","lead14Voice":"simpleSquare","lead15Voice":"simpleSquare","leadHarmVoice":"simpleSquare","twinkleVoice":"simpleSquare","chordsVoice":"simpleSquare","chords2Voice":"simpleSquare","organChordsVoice":"simpleSquare"},
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
