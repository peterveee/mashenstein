// SPACE THEME 1 — TIME VORTEX — one song: what it plays, how it is arranged, how it sounds.
//
// Radiophonic Workshop nod: a galloping octave bass, a swooping theremin that glides on
// every overlap (portamento 0.22 s), ring-mod bleeps and deep syndrum pews. E minor, 138 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-1-time-vortex";
export const title = "SPACE THEME 1 — TIME VORTEX";
export const slug = "space-theme-1-time-vortex";
export const group = "imported";

export const bank = {
  bpm: 138,
  musicTrim: 1,
  sections: [
    {
      bass: seq('E2 . E2 E3 E2 . E2 E3 E2 . E2 E3 E2 . E2 E3 | E2 . E2 E3 E2 . E2 E3 E2 . E2 E3 E2 . E2 E3'),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      lead: seq('B4 . . . . . E5 . . . . . . . . . | G5 . . . . . F#5 . . . E5 . . . B4 .'),
      leadLen: [6.6,null,null,null,null,null,10.6,null,null,null,null,null,null,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,4.6,null,null,null,2.6,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . E6 . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null,null,null],
      chords: chordSeq('E3min . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chordsLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 | C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 C2 . C2 C3'),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      lead: seq('C5 . . . . . G5 . . . . . E6 . . . | D6 . . . . . . . B5 . . . . . . .'),
      leadLen: [6.6,null,null,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,8.6,null,null,null,null,null,null,null,8.6,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . G6 . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null],
      chords: [[164.81377845643496,195.99771799087463,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('A1 . A1 A2 A1 . A1 A2 A1 . A1 A2 A1 . A1 A2 | A1 . A1 A2 A1 . A1 A2 A1 . A1 A2 A1 . A1 A2'),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      lead: seq('C6 . . . . . A5 . . . . . E5 . . . | A5 . . . . . . . G5 . . . F#5 . E5 .'),
      leadLen: [6.6,null,null,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,8.6,null,null,null,null,null,null,null,4.6,null,null,null,2.6,null,2.6,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . A6 . . . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null,null,null],
      chords: [[164.81377845643496,220,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('B1 . B1 B2 B1 . B1 B2 B1 . B1 B2 B1 . B1 B2 | B1 . B1 B2 A1 . A1 A2 G1 . G1 G2 F#1 . F#1 F#2'),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      lead: seq('D#5 . . . . . F#5 . . . . . B5 . . . | A5 . . . . . F#5 . . . D#5 . . . . .'),
      leadLen: [6.6,null,null,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,6.6,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . B6 . . . . . F#6 . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null,null,null,1.5,null,null,null],
      chords: [[155.56349186104046,184.9972113558172,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"roundMono","leadVoice":"cryptTheremin","twinkleVoice":"ringMod","chordsVoice":"tngrPolarDrift","kickVoice":"kickEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","tomVoice":"syn3PewDeep"},
  voiceParams: {"leadVoice":{"label":"Crypt Theremin","category":"Lead","synth":"MRDR-3","dur":2.8,"note":"A floating graveyard melody: sine body, a faint octave overtone, delayed vibrato and legato glide.","layer":{"osc1":{"type":"sine","ratio":1,"gain":0.9,"attack":0.055,"decay":0.3,"sustain":0.85,"release":0.3},"osc2":{"type":"sine","ratio":2,"gain":0.075,"attack":0.09,"decay":0.4,"sustain":0.65,"release":0.28}},"vibrato":{"depth":0.3,"rate":5.6,"delay":0.25},"mono":true,"portamento":0.22,"id":"cryptTheremin","kind":"tone","factory":true,"level":0.119153,"peak":0.6295}},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -6 },
    lead: { gain: -2, send: { delay: 0.25, reverb: 0.35 } },
    twinkle: { gain: 5, pan: 0.35, send: { delay: 0.6, reverb: 0.4 } },
    chords: { gain: -8, send: { reverb: 0.5 } },
    kick: { gain: -4 },
    hats: { gain: -5, pan: -0.2 },
    ohats: { gain: 6 },
    tom: { gain: -7, send: { reverb: 0.4 } },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
