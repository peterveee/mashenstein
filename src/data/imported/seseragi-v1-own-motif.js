// SESERAGI v1 OWN MOTIF — one song: what it plays, how it is arranged, how it sounds.
//
// Candidate theme for TERMINAL VELOCITY — version 1 of 3, parked in the desk and
// NOT wired to the level. v2 quotes the real jingle; v3 turns dark.
// 
// This is the sketch made before the jingle arrived: an ORIGINAL motif in the
// Seseragi idiom — a major-pentatonic chime that climbs in fourths, rests high and
// ends on a lift — in D major at 128. Intro 8 / A 16 / B 8 / A 8 / bridge 8, then
// A–B–outro a whole step up in E. 80 bars, about 2:30.
// 
// Written by work/local/_seseragi-v1.mjs through tools/lib/song-source.js — the
// music above the marker is that script's; the desk owns everything below it.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "seseragi-v1-own-motif";
export const title = "SESERAGI v1 OWN MOTIF";
export const slug = "seseragi-v1-own-motif";
export const group = "imported";

export const bank = {
  bpm: 128,
  musicTrim: 0.95,
  bass: seq('D2 . D3 . D2 . D3 . B1 . B2 . B1 . B2 . | G1 . G2 . G1 . G2 . A1 . A2 . A1 . A2 .'),
  lead: seq('D5 . F#5 . A5 . B5 . A5 . . . F#5 . A5 . | D6 . . . B5 . A5 . F#5 . E5 . D5 . . .'),
  lead2: seq('D4 . A4 . D5 . A4 . B3 . F#4 . B4 . F#4 . | G3 . D4 . G4 . D4 . A3 . E4 . A4 . E4 .'),
  chords: chordSeq('D4 . . . . . . . B3min . . . . . . . | G3 . . . . . . . A3 . . . . . . .'),
  chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead: seq('D5 . F#5 . A5 . B5 . A5 . . . F#5 . A5 . | D6 . . . B5 . A5 . F#5 . E5 . D5 . . .'),
      chords: chordSeq('D4 . . . . . . . B3min . . . . . . . | G3 . . . . . . . A3 . . . . . . .'),
      lead2: null,
      bass: null,
      kick: null,
      snare: null,
      clap: null,
      ohats: null,
    },
    {
      lead: seq('E5 . F#5 . A5 . B5 . D6 . . . B5 . A5 . | F#5 . . . A5 . B5 . A5 . . . E5 . . .'),
      chords: chordSeq('D4 . . . . . . . B3min . . . . . . . | G3 . . . . . . . A3 . . . . . . .'),
      lead2: null,
      bass: null,
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: null,
      clap: null,
      ohats: null,
    },
    {

    },
    {
      lead: seq('E5 . F#5 . A5 . B5 . D6 . . . B5 . A5 . | F#5 . . . A5 . B5 . A5 . . . E5 . . .'),
    },
    {
      lead: seq('G5 . A5 . B5 . D6 . B5 . A5 . G5 . A5 . | F#5 . . . A5 . . . D5 . E5 . F#5 . . .'),
      lead2: seq('G3 . D4 . G4 . D4 . A3 . E4 . A4 . E4 . | B3 . F#4 . B4 . F#4 . A3 . E4 . A4 . E4 .'),
      chords: chordSeq('G3 . . . . . . . A3 . . . . . . . | B3min . . . . . . . A3 . . . . . . .'),
      bass: seq('G1 . G2 . G1 . G2 . A1 . A2 . A1 . A2 . | B1 . B2 . B1 . B2 . A1 . A2 . A1 . A2 .'),
    },
    {
      lead: seq('B5 . A5 . F#5 . A5 . B5 . D6 . E6 . D6 . | B5 . . . A5 . . . . . . . . . . .'),
      lead2: seq('G3 . D4 . G4 . D4 . A3 . E4 . A4 . E4 . | B3 . F#4 . B4 . F#4 . A3 . E4 . A4 . E4 .'),
      chords: chordSeq('G3 . . . . . . . A3 . . . . . . . | B3min . . . . . . . A3 . . . . . . .'),
      bass: seq('G1 . G2 . G1 . G2 . A1 . A2 . A1 . A2 . | B1 . B2 . B1 . B2 . A1 . A2 . A1 . A2 .'),
    },
    {
      lead: null,
      lead2: seq('B4 . D5 . F#5 . B5 . F#5 . D5 . B4 . F#5 . | G4 . B4 . D5 . G5 . D5 . B4 . G4 . D5 .'),
      chords: chordSeq('B3min . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('B1 . . . B1 . . . B1 . B2 . B1 . . . | G1 . . . G1 . . . G1 . G2 . G1 . . .'),
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: null,
      clap: null,
      ohats: null,
    },
    {
      lead: null,
      lead2: seq('D4 . F#4 . A4 . D5 . A4 . F#4 . D4 . A4 . | A4 . C#5 . E5 . A5 . E5 . C#5 . A4 . E5 .'),
      chords: chordSeq('D4 . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . D2 . . . D2 . D3 . D2 . . . | A1 . . . A1 . . . A1 . A2 . A1 . A2 .'),
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      clap: null,
      ohats: null,
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .'),
    },
    {
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G5 . A5 . B5 . D6 . B5 . A5 . G5 . A5 . | F#5 . . . A5 . . . D5 . E5 . F#5 . . .'),
      lead2: seq('G3 . D4 . G4 . D4 . A3 . E4 . A4 . E4 . | B3 . F#4 . B4 . F#4 . A3 . E4 . A4 . E4 .'),
      chords: chordSeq('G3 . . . . . . . A3 . . . . . . . | B3min . . . . . . . A3 . . . . . . .'),
      bass: seq('G1 . G2 . G1 . G2 . A1 . A2 . A1 . A2 . | B1 . B2 . B1 . B2 . A1 . A2 . A1 . A2 .'),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: null,
      chords: chordSeq('D4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      kick: null,
      snare: null,
      clap: null,
      hats: null,
      ohats: null,
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 2,
  layers: [{ key: "lead2", from: "lead", independent: true }],
  labels: {"lead":"CHIME Ice Bell","lead2":"KOTO","chords":"PAD Warm Strings"},
  voice: {"leadVoice":"tngrIceBell","lead2Voice":"koto","chordsVoice":"tngrWarmStrings","bassVoice":"bass80sSynth","kickVoice":"kickMegamix","snareVoice":"ds909Snare","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohat909SixBit","crashVoice":"crashEngine","sweepsVoice":"sweepUp"},
  lanes: {
    lead: { gain: -3, send: { delay: 0.14, reverb: 0.4 } },
    lead2: { gain: -7, pan: 0.32, send: { reverb: 0.22 } },
    chords: { gain: -10, send: { reverb: 0.5 } },
    bass: { gain: -3 },
    snare: { gain: -2, send: { reverb: 0.08 } },
    clap: { gain: -5, send: { reverb: 0.2 } },
    hats: { gain: -7, pan: -0.3 },
    ohats: { gain: -9, pan: -0.3 },
    crash: { gain: -7, pan: 0.4, send: { reverb: 0.4 } },
    sweeps: { gain: -6, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [
    {
      s: 0,
      bars: 2,
    },
    {
      s: 1,
      bars: 2,
    },
    {
      s: 0,
      bars: 2,
    },
    {
      s: 1,
      bars: 2,
    },
    {
      s: 8,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 2,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 2,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 2,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 9,
      bars: 2,
    },
    {
      s: 5,
      bars: 2,
    },
    {
      s: 4,
      bars: 2,
    },
    {
      s: 5,
      bars: 2,
    },
    {
      s: 8,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 2,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 6,
      bars: 2,
    },
    {
      s: 7,
      bars: 2,
    },
    {
      s: 6,
      bars: 2,
    },
    {
      s: 7,
      bars: 2,
    },
    {
      s: 8,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 3,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 2,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 3,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 2,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 3,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 2,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 3,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 9,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 5,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 4,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 5,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 10,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 10,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 10,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
    {
      s: 11,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        chords: 2,
      },
    },
  ],
  loop: {
    fromBar: 9,
    toBar: 80,
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
