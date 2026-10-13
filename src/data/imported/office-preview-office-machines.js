// OFFICE PREVIEW 3 — OFFICE MACHINES — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT preview: the office is the drum kit. Typewriter keys for hats, the carriage-return
// bell every two bars, a stapler snare, a dot-matrix printer in bursts, fax whooshes into each
// section, a desk-drawer knock, the phone ringing at phrase ends. Clav hook, synth slap bass, wah
// chicken-scratch. 12 bars at 116.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-preview-office-machines";
export const title = "OFFICE PREVIEW 3 — OFFICE MACHINES";
export const slug = "office-preview-office-machines";
export const group = "imported";

export const bank = {
  bpm: 116,
  musicTrim: 1,
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sections: [
    {
      bass: seq('G1 . . G2 . . B1 . . C2 C3 . D2 . D3 . | E1 . . E2 . . C2 . . D2 B2 . G1 . G2 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1 | C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead2: seq('. . . . . . . . . . . . . . . . | B5 G5 B5 G5 . . B5 G5 B5 G5 . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.5,0.5,0.5,0.5,null,null,0.5,0.5,0.5,0.5,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . E6 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('G1 . . G2 . . B1 . . C2 C3 . D2 . D3 . | E1 . . E2 . . C2 . . D2 B2 . G1 . G2 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1 | C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . E6 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null],
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
      leadLen: [1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null],
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . . C3 . . C2 . . A1 A2 . D2 . D3 . | B1 . . B2 . . G1 . . C2 C3 . D2 . D3 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1 | C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . B5 G5 B5 G5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.5,0.5,0.5,0.5],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('C5 . E5 G5 . . E5 . A5 . C6 . B5 . A5 . | B4 . D5 G5 . . D5 . C5 . E5 . D5 . . .'),
      leadLen: [1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,2.8,null,null,null],
      chords: [null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,440,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440],null],
      chordsLen: [null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('E1 . . E2 . . E1 . . E1 E2 . E1 . E2 . | C2 . . C3 . . C2 . . C2 C3 . C2 . C3 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1 | C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . E6 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null],
      lead: seq('E5 . G5 B5 . . G5 . A5 . G5 . F#5 . E5 . | C5 . E5 G5 . . E5 . G5 . E5 . D5 . C5 .'),
      leadLen: [1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null],
      chords: [null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null],
      chordsLen: [null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . C1 C1 C1 C1 C1 C1 C1 C1 . . . .').map((v) => !!v),
    },
    {
      bass: seq('A1 . . A2 . . A1 . . D2 D3 . D2 . D3 . | D2 . . D3 . . D2 . . D2 D3 . D2 . D3 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1 | C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . B5 G5 B5 G5'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.5,0.5,0.5,0.5],
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('A4 . C5 E5 . . C5 . D5 . E5 . F#5 . G5 . | A5 . F#5 D5 . . C5 . A4 . . . D5 . . .'),
      leadLen: [1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,0.7,2.0999999999999996,null,null,1.4,null,2.8,null,null,null,2.8,null,null,null],
      chords: [null,null,[329.6275569128699,440,523.2511306011972],null,null,null,[329.6275569128699,440,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null],
      chordsLen: [null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass: seq('G1 . . G2 . . B1 . . C2 C3 . D2 . D3 . | G1 . . G2 . . G1 . . G1 G2 . G1 . G2 .'),
      bassLen: [0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null,0.6,null,null,0.6,null,null,0.6,null,null,0.6,0.6,null,0.6,null,0.6,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 . C1 C1 . C1 C1 C1 . C1 C1 . C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      twinkle: seq('. . . . . . . . . . . . . . . . | E6 . . . . . . . . . . . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [1.4,null,0.7,2.0999999999999996,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[329.6275569128699,391.99543598174927,523.2511306011972],null,null,null,[293.6647679174076,369.9944227116344,440],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null],
      chordsLen: [null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null,null,null,0.5,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: 1.7 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }],
  labels: {"lead":"CLAV","lead2":"PHONE","twinkle":"TYPEWRITER BELL","chords":"WAH","bass":"SLAP","hats":"TYPEWRITER","ohats":"DOT-MATRIX","snare":"STAPLER","clap":"DRAWER","tom":"FAX"},
  voice: {"leadVoice":"clav","lead2Voice":"squareTone2","twinkleVoice":"addBell","chordsVoice":"mrdrWahGuitar","bassVoice":"mrdrSynthSlap","kickVoice":"kickEngine","snareVoice":"clapMetal","hatsVoice":"kwBlipTick","ohatsVoice":"hatGrit","clapVoice":"woodBlock","tomVoice":"syn3Whoosh"},
  fx: { delay: { feedback: 0.25, tone: 3000 }, reverb: { decay: 1.6, preDelay: 0.01 } },
  lanes: {
    lead: { gain: -3, send: { delay: 0.12 } },
    lead2: { gain: -8, pan: 0.35 },
    twinkle: { gain: -1, pan: -0.3, send: { reverb: 0.3 } },
    chords: { gain: -12, pan: -0.25 },
    bass: { gain: -8 },
    kick: { gain: -5.5 },
    snare: { send: { reverb: 0.15 } },
    hats: { gain: -9, pan: 0.2 },
    ohats: { gain: -14, pan: -0.25 },
    clap: { gain: -10, pan: 0.3 },
    tom: { gain: -8, send: { reverb: 0.3 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
