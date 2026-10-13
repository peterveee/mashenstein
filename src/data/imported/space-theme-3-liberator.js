// SPACE THEME 3 — LIBERATOR — one song: what it plays, how it is arranged, how it sounds.
//
// Late-70s rebel-starship march: a heroic synth lead rising by fourths over string
// machine chords, a crystal arpeggio, a snare march and timpani turns. A minor, 104 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-3-liberator";
export const title = "SPACE THEME 3 — LIBERATOR";
export const slug = "space-theme-3-liberator";
export const group = "imported";

export const bank = {
  bpm: 104,
  musicTrim: 1,
  sections: [
    {
      bass: seq('A1 . . . E2 . . . A1 . . . E2 . A1 . | F1 . . . C2 . . . F1 . . . C2 . F1 .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null],
      lead: seq('E4 . . . A4 . . . . . . . B4 . C5 . | C5 . . . . . . . A4 . . . . . . .'),
      leadLen: [3.8,null,null,null,7.6,null,null,null,null,null,null,null,1.9,null,1.9,null,7.6,null,null,null,null,null,null,null,7.6,null,null,null,null,null,null,null],
      twinkle: seq('A4 . C5 . E5 . C5 . A4 . C5 . E5 . C5 . | A4 . C5 . F5 . C5 . A4 . C5 . F5 . C5 .'),
      twinkleLen: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1 | C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('G1 . . . D2 . . . G1 . . . D2 . G1 . | E1 . . . B1 . . . E1 . . . B1 . E1 .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null],
      lead: seq('D5 . . . . . . . B4 . . . G4 . . . | E5 . . . . . . . . . . . . . . .'),
      leadLen: [7.6,null,null,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null,15.2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('B4 . D5 . G5 . D5 . B4 . D5 . G5 . D5 . | B4 . E5 . G5 . E5 . B4 . E5 . G5 . E5 .'),
      twinkleLen: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[246.94165062806206,293.6647679174076,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[246.94165062806206,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1 | C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('A1 . . . E2 . . . A1 . . . E2 . A1 . | F1 . . . C2 . . . F1 . . . C2 . F1 .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null],
      lead: seq('E5 . . . A5 . . . . . . . G5 . E5 . | F5 . . . . . E5 . . . C5 . . . A4 .'),
      leadLen: [3.8,null,null,null,7.6,null,null,null,null,null,null,null,1.9,null,1.9,null,5.699999999999999,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null,1.9,null],
      twinkle: seq('A4 . C5 . E5 . C5 . A4 . C5 . E5 . C5 . | A4 . C5 . F5 . C5 . A4 . C5 . F5 . C5 .'),
      twinkleLen: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1 | C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('D1 . . . A1 . . . D1 . . . A1 . D1 . | E1 . . . B1 . . . E1 . . . B1 . E1 .'),
      bassLen: [2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null,2,null,null,null,2,null,null,null,2,null,null,null,2,null,2,null],
      lead: seq('D5 . . . . . F5 . . . A5 . . . G5 . | G#5 . . . . . . . E5 . . . B4 . . .'),
      leadLen: [5.699999999999999,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null,1.9,null,7.6,null,null,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null],
      twinkle: seq('A4 . D5 . F5 . D5 . A4 . D5 . F5 . D5 . | G#4 . B4 . E5 . B4 . G#4 . B4 . E5 . B4 .'),
      twinkleLen: [1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null],
      chords: [[220,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . C1 C1 C1 . . . C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"roundMono","leadVoice":"bestHeroLead","twinkleVoice":"tngrCrystalTrigger","chordsVoice":"synthStrings","kickVoice":"kickEngine","snareVoice":"snareFlam","tomVoice":"timpaniHit"},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -3 },
    lead: { gain: 4, send: { delay: 0.12, reverb: 0.3 } },
    twinkle: { gain: -3, pan: 0.3, send: { delay: 0.3 } },
    chords: { gain: -14, send: { reverb: 0.4 } },
    kick: { gain: -3 },
    snare: { pan: -0.1, send: { reverb: 0.25 } },
    tom: { gain: -5, send: { reverb: 0.3 } },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
