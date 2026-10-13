// SPACE THEME 2 — MOONBASE — one song: what it plays, how it is arranged, how it sounds.
//
// Mid-70s TV-action funk: a brass fanfare over string pads, a wah guitar scratching
// sixteenths and a syncopated octave bass. C minor, 112 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-2-moonbase";
export const title = "SPACE THEME 2 — MOONBASE";
export const slug = "space-theme-2-moonbase";
export const group = "imported";

export const bank = {
  bpm: 112,
  musicTrim: 1,
  sections: [
    {
      bass: seq('C2 . . C3 . . A#2 . C2 . C2 . . G2 A#2 . | C2 . . C3 . . A#2 . C2 . C2 . G2 . G2 .'),
      bassLen: [2,null,null,2,null,null,1.4,null,1.4,null,2,null,null,0.7,1.4,null,2,null,null,2,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null],
      lead: seq('C5 . . . . . G4 . C5 . D#5 . . . F5 . | G5 . . . . . . . . . F5 . D#5 . D5 .'),
      leadLen: [5.5200000000000005,null,null,null,null,null,1.84,null,1.84,null,3.68,null,null,null,1.84,null,9.200000000000001,null,null,null,null,null,null,null,null,null,1.84,null,1.84,null,1.84,null],
      twinkle: seq('. D#4 D#4 . D#4 . D#4 D#4 . D#4 D#4 . D#4 . D#4 D#4 | . D#4 D#4 . D#4 . D#4 D#4 . D#4 D#4 . D#4 . D#4 D#4'),
      twinkleLen: [null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5],
      chords: [[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('G#1 . . G#2 . . F#2 . G#1 . G#1 . . D#2 F#2 . | A#1 . . A#2 . . G#2 . A#1 . A#1 . . F2 G#2 .'),
      bassLen: [2,null,null,2,null,null,1.4,null,1.4,null,2,null,null,0.7,1.4,null,2,null,null,2,null,null,1.4,null,1.4,null,2,null,null,0.7,1.4,null],
      lead: seq('D#5 . . . . . C5 . . . . . . . . . | D5 . . . F5 . . . G#5 . . . G5 . F5 .'),
      leadLen: [5.5200000000000005,null,null,null,null,null,9.200000000000001,null,null,null,null,null,null,null,null,null,3.68,null,null,null,3.68,null,null,null,3.68,null,null,null,1.84,null,1.84,null],
      twinkle: seq('. D#4 D#4 . D#4 . D#4 D#4 . D#4 D#4 . D#4 . D#4 D#4 | . D4 D4 . D4 . D4 D4 . D4 D4 . D4 . D4 D4'),
      twinkleLen: [null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5],
      chords: [[207.65234878997256,261.6255653005986,311.1269837220809,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,233.08188075904496,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('C2 . . C3 . . A#2 . C2 . C2 . . G2 A#2 . | C2 . . C3 . . A#2 . C2 . C2 . G2 . G2 .'),
      bassLen: [2,null,null,2,null,null,1.4,null,1.4,null,2,null,null,0.7,1.4,null,2,null,null,2,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null],
      lead: seq('G5 . . . . . C6 . . . . . A#5 . G5 . | A#5 . . . . . G5 . . . . . . . D#5 .'),
      leadLen: [5.5200000000000005,null,null,null,null,null,5.5200000000000005,null,null,null,null,null,1.84,null,1.84,null,5.5200000000000005,null,null,null,null,null,7.36,null,null,null,null,null,null,null,1.84,null],
      twinkle: seq('. D#4 D#4 . D#4 . D#4 D#4 . D#4 D#4 . D#4 . D#4 D#4 | . D#4 D#4 . D#4 . D#4 D#4 . D#4 D#4 . D#4 . D#4 D#4'),
      twinkleLen: [null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5],
      chords: [[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[261.6255653005986,311.1269837220809,391.99543598174927,466.1637615180899],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F1 . . F2 . . D#2 . F1 . F1 . . C2 D#2 . | G1 . . G2 . . F2 . G1 . G1 . B1 . D2 .'),
      bassLen: [2,null,null,2,null,null,1.4,null,1.4,null,2,null,null,0.7,1.4,null,2,null,null,2,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null],
      lead: seq('F5 . . . G#5 . . . C6 . . . A#5 . G#5 . | G5 . . . . . . . . . . . B4 . D5 .'),
      leadLen: [3.68,null,null,null,3.68,null,null,null,3.68,null,null,null,1.84,null,1.84,null,11.040000000000001,null,null,null,null,null,null,null,null,null,null,null,1.84,null,1.84,null],
      twinkle: seq('. C4 C4 . C4 . C4 C4 . C4 C4 . C4 . C4 C4 | . D4 D4 . D4 . D4 D4 . D4 D4 . D4 . D4 D4'),
      twinkleLen: [null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5,null,0.5,0.5,null,0.5,null,0.5,0.5],
      chords: [[207.65234878997256,261.6255653005986,311.1269837220809,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . C1 . . C1 . . . . . | C1 . . . . . . C1 . . C1 . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"tpBassGuitar","leadVoice":"tngrBrassSection","twinkleVoice":"mrdrWahGuitar","chordsVoice":"bestPwmStrings","kickVoice":"dsKick","snareVoice":"snareTight","hatsVoice":"dsHatClosed","ohatsVoice":"dsHatOpen"},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -6 },
    lead: { gain: 4, send: { reverb: 0.25 } },
    twinkle: { gain: -6, pan: -0.35, send: { delay: 0.15 } },
    chords: { gain: -13, pan: 0.2, send: { reverb: 0.4 } },
    kick: { gain: -6 },
    snare: { gain: 8, send: { reverb: 0.2 } },
    hats: { gain: -5, pan: 0.25 },
    ohats: { gain: 2, pan: 0.25 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
