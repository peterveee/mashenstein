// SESERAGI v2 BRIGHT — one song: what it plays, how it is arranged, how it sounds.
//
// Candidate theme for TERMINAL VELOCITY — version 2 of 3, parked in the desk and
// NOT wired to the level. v1 is the own-motif sketch, v3 turns dark.
// 
// THE JINGLE IS QUOTED: bars 1–7 of work/tracks/yamonote.mid are Seseragi, the JR
// East Yamanote departure melody, used at pitch in C major at 140. The high octave
// doublings ride the twinkle lane. Everything else is ours: a B section over
// IV–V–vi–V, a bridge in A minor, the koto ostinato, the bed. The jingle is a
// six-bar phrase, so an A is twelve: intro 8 / A 12 / B 8 / A 12 / bridge 8, then
// A / B / outro a whole step up in D. 80 bars, about 2:17. JR East copyright: if
// the game ships with it, it needs clearing.
// 
// Written by work/local/_seseragi-v2.mjs through tools/lib/song-source.js — the
// music above the marker is that script's; the desk owns everything below it.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "seseragi-v2-bright";
export const title = "SESERAGI v2 BRIGHT";
export const slug = "seseragi-v2-bright";
export const group = "imported";

export const bank = {
  bpm: 140,
  musicTrim: 0.95,
  bass: seq('C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
  lead: seq('G5 . G4 . A4 . G4 . C5 . G4 . E5 . G4 . | G5 . G4 . A4 . G4 . C5 . G4 . E5 . G4 .'),
  lead2: seq('C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 . | C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 .'),
  twinkle: seq('. . . . . . . . . . . . . . . . | G6 . . . . . . . . . . . . . . .'),
  chords: chordSeq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
  chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead: seq('E3 A3 E4 B4 E5 A5 G#5 G5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [6,6,6,6,6,3,3,24,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: null,
      bass: null,
      kick: null,
      snare: null,
      clap: null,
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      ohats: null,
    },
    {
      lead2: null,
      bass: null,
      kick: null,
      snare: null,
      clap: null,
      ohats: null,
    },
    {
      lead: seq('G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 .'),
      chords: chordSeq('G3 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      lead2: null,
      bass: null,
      kick: null,
      snare: null,
      clap: null,
      ohats: null,
    },
    {
      lead: seq('G4 . E4 . G4 . C5 . C5 . C5 . E5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C6 . . . . . . . E6 . . . . . . . | C6 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      lead: seq('G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 .'),
      lead2: seq('G3 . D4 . G4 . D4 . G3 . D4 . G4 . D4 . | G3 . D4 . G4 . D4 . G3 . D4 . G4 . D4 .'),
      chords: chordSeq('G3 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
    },
    {
      lead: seq('G4 . E4 . G4 . C5 . C5 . C5 . E5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C6 . . . . . . . E6 . . . . . . . | C6 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 . | C4 . G4 . C5 . G4 . E4 . G4 . C5 . G4 .'),
      bass: seq('C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 . | C2 . . . . . . . C2 . C3 . C2 . C3 .'),
    },
    {
      lead: seq('F5 . G5 . A5 . C6 . A5 . G5 . F5 . G5 . | E5 . . . G5 . . . C5 . D5 . E5 . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: seq('F3 . C4 . F4 . C4 . G3 . D4 . G4 . D4 . | A3 . E4 . A4 . E4 . G3 . D4 . G4 . D4 .'),
      chords: chordSeq('F3 . . . . . . . G3 . . . . . . . | A3min . . . . . . . G3 . . . . . . .'),
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('F1 . F2 . F1 . F2 . G1 . G2 . G1 . G2 . | A1 . A2 . A1 . A2 . G1 . G2 . G1 . G2 .'),
    },
    {
      lead: seq('A5 . G5 . E5 . G5 . A5 . C6 . D6 . C6 . | A5 . . . G5 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: seq('F3 . C4 . F4 . C4 . G3 . D4 . G4 . D4 . | A3 . E4 . A4 . E4 . G3 . D4 . G4 . D4 .'),
      chords: chordSeq('F3 . . . . . . . G3 . . . . . . . | A3min . . . . . . . G3 . . . . . . .'),
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('F1 . F2 . F1 . F2 . G1 . G2 . G1 . G2 . | A1 . A2 . A1 . A2 . G1 . G2 . G1 . G2 .'),
    },
    {
      lead: null,
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: seq('A4 . C5 . E5 . A5 . E5 . C5 . A4 . E5 . | F4 . A4 . C5 . F5 . C5 . A4 . F4 . C5 .'),
      chords: chordSeq('A3min . . . . . . . . . . . . . . . | F3 . . . . . . . . . . . . . . .'),
      bass: seq('A1 . . . A1 . . . A1 . A2 . A1 . . . | F1 . . . F1 . . . F1 . F2 . F1 . . .'),
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: null,
      clap: null,
      ohats: null,
    },
    {
      lead: null,
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: seq('C4 . E4 . G4 . C5 . G4 . E4 . C4 . G4 . | G4 . B4 . D5 . G5 . D5 . B4 . G4 . D5 .'),
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      bass: seq('C2 . . . C2 . . . C2 . C3 . C2 . . . | G1 . . . G1 . . . G1 . G2 . G1 . G2 .'),
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
      lead: seq('F5 . G5 . A5 . C6 . A5 . G5 . F5 . G5 . | E5 . . . G5 . . . C5 . D5 . E5 . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: seq('F3 . C4 . F4 . C4 . G3 . D4 . G4 . D4 . | A3 . E4 . A4 . E4 . G3 . D4 . G4 . D4 .'),
      chords: chordSeq('F3 . . . . . . . G3 . . . . . . . | A3min . . . . . . . G3 . . . . . . .'),
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('F1 . F2 . F1 . F2 . G1 . G2 . G1 . G2 . | A1 . A2 . A1 . A2 . G1 . G2 . G1 . G2 .'),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('C6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2: null,
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
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
  labels: {"lead":"CHIME Ice Bell","lead2":"KOTO","twinkle":"OCTAVES Alloy Chime","chords":"PAD Warm Strings"},
  voice: {"leadVoice":"tngrIceBell","lead2Voice":"koto","twinkleVoice":"tngrAlloyChime","chordsVoice":"tngrWarmStrings","bassVoice":"bass80sSynth","kickVoice":"kickMegamix","snareVoice":"ds909Snare","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohat909SixBit","crashVoice":"crashEngine","sweepsVoice":"sweepUp"},
  lanes: {
    lead: { gain: -3, send: { delay: 0.14, reverb: 0.4 } },
    lead2: { gain: -7, pan: 0.32, send: { reverb: 0.22 } },
    twinkle: { gain: -9, pan: -0.2, send: { reverb: 0.5 } },
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
      s: 2,
      bars: 2,
    },
    {
      s: 3,
      bars: 2,
    },
    {
      s: 11,
      bars: 2,
    },
    {
      s: 5,
      bars: 2,
    },
    {
      s: 6,
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
      s: 6,
      bars: 2,
    },
    {
      s: 12,
      bars: 2,
    },
    {
      s: 8,
      bars: 2,
    },
    {
      s: 7,
      bars: 2,
    },
    {
      s: 8,
      bars: 2,
    },
    {
      s: 11,
      bars: 2,
    },
    {
      s: 5,
      bars: 2,
    },
    {
      s: 6,
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
      s: 6,
      bars: 2,
    },
    {
      s: 9,
      bars: 2,
    },
    {
      s: 10,
      bars: 2,
    },
    {
      s: 9,
      bars: 2,
    },
    {
      s: 10,
      bars: 2,
    },
    {
      s: 11,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
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
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 6,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
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
        twinkle: 2,
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
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 6,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 12,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 8,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 7,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 8,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
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
        twinkle: 2,
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
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 6,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
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
        twinkle: 2,
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
        twinkle: 2,
        chords: 2,
      },
    },
    {
      s: 13,
      bars: 2,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        twinkle: 2,
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
