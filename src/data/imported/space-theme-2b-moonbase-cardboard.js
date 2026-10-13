// SPACE 2B — MOONBASE × CARDBOARD KINGDOM — one song: what it plays, how it is arranged, how it sounds.
//
// MOONBASE carrying CARDBOARD KINGDOM: its E-D-C ... G call turned minor on a muted trumpet,
// the answer held back a bar, then sequenced up a third. Soft strings, sparse wah, half-time.
// C minor, 88 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-2b-moonbase-cardboard";
export const title = "SPACE 2B — MOONBASE × CARDBOARD KINGDOM";
export const slug = "space-theme-2b-moonbase-cardboard";
export const group = "imported";

export const bank = {
  bpm: 88,
  musicTrim: 1,
  sections: [
    {
      bass: seq('C2 . . . . . . . C2 . . C3 . . . . | C2 . . . . . . . C2 . . C3 . . . .'),
      lead: seq('D#5 D5 C5 . . G4 . . D#5 D5 C5 . D5 . . . | D#5 . . . . . . . . . . . . . . .'),
      twinkle: seq('. . D#4 . . . . D#4 . . D#4 . . . . . | . . D#4 . . . . D#4 . . D#4 . . . . .'),
      chords: [[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null],
      leadLen: [0.9,0.9,2.7,null,null,2.7,null,null,0.9,0.9,1.8,null,3.6,null,null,null,14.4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkleLen: [null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null,null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('G#1 . . . . . . . G#1 . . G#2 . . . . | A#1 . . . . . . . A#1 . . A#2 . . . .'),
      lead: seq('D#5 D5 C5 . . G#4 . . D#5 D5 C5 . G5 . . . | F5 . . . . . . . D5 . . . A#4 . . .'),
      twinkle: seq('. . D#4 . . . . D#4 . . D#4 . . . . . | . . D4 . . . . D4 . . D4 . . . . .'),
      chords: [[207.65234878997256,261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[233.08188075904496,293.6647679174076,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null],
      leadLen: [0.9,0.9,2.7,null,null,2.7,null,null,0.9,0.9,1.8,null,3.6,null,null,null,7.2,null,null,null,null,null,null,null,3.6,null,null,null,3.6,null,null,null],
      twinkleLen: [null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null,null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . . . . . . . C2 . . C3 . . . . | C2 . . . . . . . C2 . . C3 . . . .'),
      lead: seq('G5 F5 D#5 . . C5 . . G5 F5 D#5 . F5 . . . | G5 . . . . . . . . . . . . . . .'),
      twinkle: seq('. . D#4 . . . . D#4 . . D#4 . . . . . | . . D#4 . . . . D#4 . . D#4 . . . . .'),
      chords: [[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null],
      leadLen: [0.9,0.9,2.7,null,null,2.7,null,null,0.9,0.9,1.8,null,3.6,null,null,null,14.4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkleLen: [null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null,null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F1 . . . . . . . F1 . . F2 . . . . | G1 . . . . . . . G1 . . G2 . . . .'),
      lead: seq('G#5 G5 F5 . . C5 . . G#5 G5 F5 . D#5 . . . | D5 . . . . . . . B4 . . . . . . .'),
      twinkle: seq('. . C4 . . . . C4 . . C4 . . . . . | . . D4 . . . . D4 . . D4 . . . . .'),
      chords: [[207.65234878997256,261.6255653005986,311.1269837220809,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      bassLen: [3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,3,null,null,null,null],
      leadLen: [0.9,0.9,2.7,null,null,2.7,null,null,0.9,0.9,1.8,null,3.6,null,null,null,7.2,null,null,null,null,null,null,null,7.2,null,null,null,null,null,null,null],
      twinkleLen: [null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null,null,null,0.5,null,null,null,null,0.5,null,null,0.5,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"tpBassGuitar","twinkleVoice":"mrdrWahGuitar","kickVoice":"dsKick","snareVoice":"snareTight","hatsVoice":"dsHatClosed","ohatsVoice":"dsHatOpen","leadVoice":"mrdrMutedTrumpet","chordsVoice":"tngrSoftStrings"},
  fx: { delay: { feedback: 0.42, tone: 2600 }, reverb: { decay: 4.5, preDelay: 0.03 } },
  lanes: {
    bass: { gain: -5.5 },
    lead: { send: { delay: 0.2, reverb: 0.4 } },
    twinkle: { gain: -2, pan: -0.35, send: { delay: 0.3, reverb: 0.2 } },
    chords: { gain: -9, pan: 0.2, send: { reverb: 0.55 } },
    kick: { gain: -8 },
    snare: { gain: 12.5, send: { reverb: 0.35 } },
    hats: { gain: -4, pan: 0.25 },
    ohats: { pan: 0.25 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
