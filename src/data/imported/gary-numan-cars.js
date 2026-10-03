// GARY_NUMAN_CARS — imported from Gary_Numan_Cars.mid by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// 11 parts in the file, 12 lanes here — nothing was merged onto anything else.
// 1 of them is a layer (lead2): real lanes with the
// notes below, declared in the mix at the foot of this file. A layer is a preset and
// nothing else.
//
// Every pitched lane starts on a MonoSynth starter — Simple Sawtooth on the bass,
// Simple Square on the rest — because a MIDI file carries no timbre and arriving as one
// arcade square on every lane is a poor first hearing of somebody's arrangement. Kit
// lanes start on the Tom. All of it is a starting point: choose the real sounds on the
// desk and it rewrites the mix below.
import { seq, n } from '../../engine/notes.js';

export const id = "gary-numan-cars";
export const title = "GARY_NUMAN_CARS";
export const slug = "gary-numan-cars";
export const group = "imported";

export const bank = {
  bpm: 126,
  musicTrim: 0.7,
  sections: [
    // section 0
    {
      lead2: seq('. . D3 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,46,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    // section 1
    {
      bass: seq('. . . . . . . . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,71,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . C1 C1 C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 2
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    // section 3
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,6,null,null,null,null,null,5,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 4
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [6,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,71,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 5
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [6,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('G4')], null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3],null,[2],null,[2],null,[2],null,null,null,null,null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 6
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [[n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('G4')], null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('A4')], null],
      chordsLen: [[2],null,[2],null,[2],null,[2],null,null,null,null,null,[2],null,[2],null,[2],null,[2],null,[2],null,[2],null,null,null,null,null,[1],null,[1],null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    // section 7
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      chords: [[n('D5')], null, [n('D5')], null, [n('D5')], [n('E5')], [n('C#5')], null, null, null, null, null, [n('A4')], null, null, null, [n('B4')], null, [n('G4')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1],null,[1],null,[1],[1],[2],null,null,null,null,null,[2],null,null,null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 8
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('G4')], null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[2],null,null,null,null,null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 9
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [[n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('G4')], null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, [n('A4')], null, [n('A4')], null, [n('A4')], null],
      chordsLen: [[2],null,[2],null,[2],null,[2],null,null,null,null,null,[2],null,[2],null,[3],null,[2],null,[2],null,[2],null,null,null,[1],null,[1],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    // section 10
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      chords: [[n('D5')], null, [n('D5')], null, [n('D5')], [n('E5')], null, null, [n('C#5')], null, null, null, [n('A4')], null, null, null, [n('B4')], null, [n('G4')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1],null,[1],null,[1],[3],null,null,[4],null,null,null,[5],null,null,null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 11
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . . . D4 . A3 . . . B3 . C4 . B3 .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,128,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('B5')], null, [n('C6')], null, [n('B5')], null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,null,null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 12
    {
      bass: seq('D3 . . . D4 . A3 . . . F4 . E4 . . . | D3 . . . D4 . A3 . . . B3 . C4 . B3 .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,3,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null],
      organChords: [[n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('F6')], null, [n('E6')], null, null, null, [n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('B5')], null, [n('C6')], null, [n('B5')], null],
      organChordsLen: [[2],null,null,null,[2],null,[2],null,null,null,[3],null,[2],null,null,null,[2],null,null,null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    // section 13
    {
      bass: [n('D3'), null, null, null, null, null, n('D3'), null, null, null, [n('G3'), n('A3')], null, n('D4'), null, null, null, n('D3'), null, null, null, n('D4'), null, n('A3'), null, null, null, n('B3'), null, n('C4'), null, n('B3'), null],
      bassLen: [2,null,null,null,null,null,1,null,null,null,[1,2],null,2,null,null,null,2,null,null,null,2,null,1,null,null,null,1,null,2,null,2,null],
      organChords: [[n('D5')], null, null, null, null, null, [n('D5')], null, null, null, [n('G5'), n('A5')], null, [n('D6')], null, null, null, [n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('B5')], null, [n('C6')], null, [n('B5')], null],
      organChordsLen: [[2],null,null,null,null,null,[1],null,null,null,[1,2],null,[2],null,null,null,[2],null,null,null,[2],null,[1],null,null,null,[1],null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . C1 C1 C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    // section 14
    {
      bass: seq('D3 . . . D4 . A3 . . . F4 . E4 . . . | D3 . . . D4 . A3 . . . B3 . C4 . B3 .'),
      bassLen: [2,null,null,null,2,null,1,null,null,null,2,null,2,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,3,null,2,null],
      organChords: [[n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('F6')], null, [n('E6')], null, null, null, [n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('B5')], null, [n('C6')], null, [n('B5')], null],
      organChordsLen: [[2],null,null,null,[2],null,[1],null,null,null,[2],null,[2],null,null,null,[2],null,null,null,[2],null,[2],null,null,null,[2],null,[3],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . C1 . . . . . | C1 . . . . . C1 . . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    // section 15
    {
      bass: seq('D3 . G3 . A3 . D4 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,3,null,2,null,7,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('G4')], null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3],null,[2],null,[2],null,[2],null,null,null,null,null,[2],null,[2],null],
      organChords: [[n('D5')], null, [n('G5')], null, [n('A5')], null, [n('D6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[2],null,[3],null,[2],null,[7],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 . C1 . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . . . . . . . . . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 16
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [[n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('G4')], null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, null, null, [n('A4')], null, [n('A4')], null],
      chordsLen: [[2],null,[2],null,[1],null,[4],null,null,null,null,null,[2],null,[1],null,[2],null,[2],null,[2],null,[2],null,null,null,null,null,[1],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    // section 17
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      chords: [[n('D5')], null, [n('D5')], null, [n('E5')], null, null, null, [n('C#5')], null, null, null, [n('A4')], null, null, null, [n('B4')], null, [n('G4')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1],null,[1],null,[4],null,null,null,[4],null,null,null,[4],null,null,null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 18
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, [n('A4')], null, [n('A4')], null, [n('G4')], null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,[2],null,[2],null,[2],null,null,null,[1],null,[2],null,[1],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 19
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      chords: [[n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, [n('A4')], null, [n('A4')], null, null, null, [n('D5')], null, [n('C#5')], null, [n('G4')], null, [n('A4')], null, null, null, [n('A4')], null, [n('A4')], null, null, null],
      chordsLen: [[2],null,[2],null,[2],null,[2],null,null,null,[1],null,[2],null,null,null,[2],null,[2],null,[2],null,[2],null,null,null,[1],null,[2],null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    // section 20
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      chords: [[n('D5')], null, [n('D5')], null, [n('E5')], null, null, null, [n('C#5')], null, null, null, [n('A4')], null, null, null, [n('B4')], null, [n('G4')], null, null, null, null, null, null, null, null, null, null, null, null, null],
      chordsLen: [[1],null,[1],null,[4],null,null,null,[4],null,null,null,[3],null,null,null,[2],null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 21
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . . . D4 . A3 . . . B3 . C4 . B3 .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,127,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('B5')], null, [n('C6')], null, [n('B5')], null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,null,null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 22
    {
      bass: seq('D3 . G3 . A3 . D4 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,3,null,2,null,7,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,71,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('D5')], null, [n('G5')], null, [n('A5')], null, [n('D6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[2],null,[3],null,[2],null,[7],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 . C1 . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . . . . . . . . . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 23
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,6,null,null,null,null,null,5,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 . C1 . C1 C1 C1 C1 | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 24
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . . . D4 . A3 . . . B3 . C4 . B3 .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,null,null,2,null,2,null,null,null,2,null,2,null,2,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,128,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [6,null,null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [n('D5')], null, null, null, [n('D6')], null, [n('A5')], null, null, null, [n('B5')], null, [n('C6')], null, [n('B5')], null],
      organChordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2],null,null,null,[2],null,[2],null,null,null,[2],null,[2],null,[2],null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 25
    {
      bass: seq('D3 . G3 . A3 . D4 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,3,null,2,null,7,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('. . . . . . . . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      organChords: [[n('D5')], null, [n('G5')], null, [n('A5')], null, [n('D6')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      organChordsLen: [[2],null,[3],null,[2],null,[7],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 . C1 . C1 C1 C1 C1 | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . . . . . . . . . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 26
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . B5 . . . | A5 . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,6,null,null,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 27
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 28
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . B5 . . . | A5 . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,6,null,null,null,null,null,4,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . . . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 29
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | C#5 . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 30
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . B5 . . . | A5 . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,6,null,null,null,null,null,4,null,null,null],
      twinkle: seq('. . . . . . . . . . . . B4 . . . | C5 . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . C1 . . C1 . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 31
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('B4 . . . . . . G4 . . . . . . . . | C#5 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,10,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 32
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . B5 . . . | A5 . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,6,null,null,null,null,null,4,null,null,null],
      twinkle: seq('. . . . . . . . . . . . B4 . . . | C5 . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,5,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . . . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 33
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('B4 . . . . . . . G4 . . . . . . . | C#5 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 34
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('B4 . . . . . . . G4 . . . . . . . | C#5 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,9,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 35
    {
      bass: seq('D3 . C#3 . G2 . A2 . . . A2 . A2 . F#2 . | G2 . . . B2 . G2 . . . . . . . F#2 .'),
      bassLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      lead: seq('D4 . C#4 . G3 . A3 . . . A2 . A2 . F#3 . | G3 . . . B3 . G3 . . . . . . . F#3 .'),
      leadLen: [2,null,2,null,2,null,2,null,null,null,1,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null,null,null,null,null,2,null],
      leadHarm: seq('. . . . . . . . . . . . B5 . . . | A5 . . . . . G5 . . . . . D5 . . .'),
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,6,null,null,null,null,null,6,null,null,null,null,null,4,null,null,null],
      twinkle: seq('. . . . . . . . . . . . B4 . . . | C5 . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . . . C1 . C1 . C1 . C1 . . . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    // section 36
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | D3 . C#3 . G2 . A2 . . . A2 . A2 . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | D4 . C#4 . G3 . A3 . . . A2 . A2 . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,null,null],
      lead2: seq('. . . . . . . . . . . . . . . . | D3 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | A5 . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,60,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: [n('B4'), null, null, null, null, null, null, n('G4'), null, null, null, null, null, null, null, null, [n('G4'), n('C#5')], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      twinkleLen: [8,null,null,null,null,null,null,7,null,null,null,null,null,null,null,null,[1,60],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | C1 . . . . . C1 . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    // section 37
    {
      bass: seq('G2 . . . B2 . G2 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('G3 . . . B3 . G3 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [2,null,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadHarm: seq('B4 . . . . . G4 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [7,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('B4 . . . . . . G4 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0, 1, 2, 3, 4, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 12, 13, 14, 22, 2, 3, 4, 2, 23, 24, 12, 13, 14, 25, 2, 26, 27, 2, 28, 29, 2, 30, 31, 2, 32, 33, 2, 30, 34, 2, 35, 36, 2, 30, 34, 2, 35, 36, 2, 30, 34, 2, 35, 37],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "lead2", from: "lead", independent: true }],
  labels: {"bass":"Bass Guitar - Paul Gardiner","lead":"Synth 1","leadHarm":"Lead Synth","twinkle":"Lead Synth counter melody","chords":"Vocals","organChords":"Chorus Synth","lead2":"Intro& Verse Synth"},
  voice: {"bassVoice":"simpleSawtooth","leadVoice":"simpleSquare","lead2Voice":"simpleSquare","leadHarmVoice":"simpleSquare","twinkleVoice":"simpleSquare","chordsVoice":"simpleSquare","organChordsVoice":"simpleSquare"},
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
