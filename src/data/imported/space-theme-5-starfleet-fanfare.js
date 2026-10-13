// SPACE THEME 5 — STARFLEET FANFARE — one song: what it plays, how it is arranged, how it sounds.
//
// Late-70s battle-cruiser fanfare: brass section over galloping marcato violins, flat-VII
// and flat-VI turns, march snare and timpani. D major, 132 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-5-starfleet-fanfare";
export const title = "SPACE THEME 5 — STARFLEET FANFARE";
export const slug = "space-theme-5-starfleet-fanfare";
export const group = "imported";

export const bank = {
  bpm: 132,
  musicTrim: 1,
  sections: [
    {
      bass: seq('D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2 | D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2'),
      bassLen: [0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9],
      lead: seq('A4 . . D5 . . . . E5 . F#5 . . . . . | A5 . . . . . . . . . F#5 . . . D5 .'),
      leadLen: [2.8499999999999996,null,null,4.75,null,null,null,null,1.9,null,5.699999999999999,null,null,null,null,null,9.5,null,null,null,null,null,null,null,null,null,3.8,null,null,null,1.9,null],
      twinkle: seq('D4 D4 A4 D4 D4 A4 D4 A4 F#4 F#4 A4 F#4 F#4 A4 F#4 A4 | D4 D4 A4 D4 D4 A4 D4 A4 F#4 F#4 A4 F#4 F#4 A4 F#4 A4'),
      twinkleLen: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      chords: chordSeq('D4 . . . . . . . . . . . . . . . | D4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C2 C2 C3 . C2 C2 C2 . C2 C2 C3 . C2 C2 | G1 . G1 G1 G2 . G1 G1 G1 . G1 G1 G2 . G1 G1'),
      bassLen: [0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9],
      lead: seq('E5 . . . . . G5 . . . . . . . E5 . | D5 . . . . . . . . . . . B4 . D5 .'),
      leadLen: [5.699999999999999,null,null,null,null,null,7.6,null,null,null,null,null,null,null,1.9,null,11.399999999999999,null,null,null,null,null,null,null,null,null,null,null,1.9,null,1.9,null],
      twinkle: seq('C4 C4 G4 C4 C4 G4 C4 G4 E4 E4 G4 E4 E4 G4 E4 G4 | B3 B3 G4 B3 B3 G4 B3 G4 D4 D4 G4 D4 D4 G4 D4 G4'),
      twinkleLen: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      chords: [[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,293.6647679174076,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . C1 . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      bass: seq('D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2 | A#1 . A#1 A#1 A#2 . A#1 A#1 A#1 . A#1 A#1 A#2 . A#1 A#1'),
      bassLen: [0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9],
      lead: seq('A5 . . . . . . . D6 . . . . . A5 . | A#5 . . . . . . . F5 . . . . . D5 .'),
      leadLen: [7.6,null,null,null,null,null,null,null,5.699999999999999,null,null,null,null,null,1.9,null,7.6,null,null,null,null,null,null,null,5.699999999999999,null,null,null,null,null,1.9,null],
      twinkle: seq('D4 D4 A4 D4 D4 A4 D4 A4 F#4 F#4 A4 F#4 F#4 A4 F#4 A4 | A#3 A#3 F4 A#3 A#3 F4 A#3 F4 D4 D4 F4 D4 D4 F4 D4 F4'),
      twinkleLen: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      chords: chordSeq('D4 . . . . . . . . . . . . . . . | A#3 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C2 C2 C3 . C2 C2 C2 . C2 C2 C3 . C2 C2 | A1 . A1 A1 A2 . A1 A1 A1 . A1 A1 A2 . A1 A1'),
      bassLen: [0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9,0.9,null,0.9,0.9],
      lead: seq('E5 . . G5 . . C6 . . . . . B5 . G5 . | A5 . . . . . . . . . . . . . . .'),
      leadLen: [2.8499999999999996,null,null,2.8499999999999996,null,null,5.699999999999999,null,null,null,null,null,1.9,null,1.9,null,15.2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C4 C4 G4 C4 C4 G4 C4 G4 E4 E4 G4 E4 E4 G4 E4 G4 | C#4 C#4 A4 C#4 C#4 A4 C#4 A4 E4 E4 A4 E4 E4 A4 E4 A4'),
      twinkleLen: [0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],
      chords: [[261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[277.1826309768721,329.6275569128699,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . C1 . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"bass80sMono","leadVoice":"tngrBrassSection","twinkleVoice":"mrdrViolinMarcato","chordsVoice":"tngrWarmStrings","kickVoice":"kickEngine","snareVoice":"snareFlam","crashVoice":"crashEngine","tomVoice":"timpaniHit"},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -5 },
    lead: { gain: 4, send: { reverb: 0.3 } },
    twinkle: { gain: -3, pan: -0.25, send: { reverb: 0.2 } },
    chords: { gain: -11, pan: 0.2, send: { reverb: 0.45 } },
    kick: { gain: -6 },
    snare: { gain: 6, send: { reverb: 0.25 } },
    crash: { gain: 3 },
    tom: { gain: -6, send: { reverb: 0.3 } },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
