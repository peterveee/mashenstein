// SPACE 1D SLOW — VORTEX × CARDBOARD · FALLING LINE — one song: what it plays, how it is arranged, how it sounds.
//
// TIME VORTEX × CARDBOARD KINGDOM. The call (E-D-C ... G) turned minor on the theremin.
// Bass falls by semitones under E minor (E D# D C# C), then G D/F# Cmaj7 Am7 Fmaj7 (flat II) B7.
// E minor, 112 BPM, 16 bars, melody at half speed.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-1d-slow-vortex-cardboard-cliche";
export const title = "SPACE 1D SLOW — VORTEX × CARDBOARD · FALLING LINE";
export const slug = "space-theme-1d-slow-vortex-cardboard-cliche";
export const group = "imported";

export const bank = {
  bpm: 112,
  musicTrim: 1,
  sections: [
    {
      bass: seq('E2 . E2 E3 E2 . E2 E3 E2 . E2 E3 E2 . E2 E3 | D#2 . D#2 D#3 D#2 . D#2 D#3 D#2 . D#2 D#3 D#2 . D#2 D#3'),
      lead: seq('G5 . F#5 . E5 . . . . . B4 . . . . . | G5 . F#5 . E5 . . . F#5 . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [2.5,null,2.5,null,6.5,null,null,null,null,null,6.5,null,null,null,null,null,2.5,null,2.5,null,4.5,null,null,null,8.5,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('D2 . D2 D3 D2 . D2 D3 D2 . D2 D3 D2 . D2 D3 | C#2 . C#2 C#3 C#2 . C#2 C#3 C#2 . C#2 C#3 C#2 . C#2 C#3'),
      lead: seq('G5 . . . . . . . . . . . . . . . | E5 . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . E6 . . . . .'),
      chords: [[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,164.81377845643496,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [16.5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16.5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 | E2 . E2 E3 E2 . E2 E3 G2 . G2 G3 G2 . G2 G3'),
      lead: seq('G5 . F#5 . E5 . . . . . B4 . . . . . | G5 . F#5 . E5 . . . B5 . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [2.5,null,2.5,null,6.5,null,null,null,null,null,6.5,null,null,null,null,null,2.5,null,2.5,null,4.5,null,null,null,8.5,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F#1 . F#1 F#2 F#1 . F#1 F#2 A1 . A1 A2 A1 . A1 A2 | B1 . B1 B2 B1 . B1 B2 B1 . B1 B2 B1 . B1 B2'),
      lead: seq('A5 . . . . . . . . . . . . . . . | F#5 . . . . . . . D#5 . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . B6 . . .'),
      chords: [[184.9972113558172,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,220,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [16.5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8.5,null,null,null,null,null,null,null,8.5,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('G1 . G1 G2 G1 . G1 G2 G1 . G1 G2 G1 . G1 G2 | F#1 . F#1 F#2 F#1 . F#1 F#2 F#1 . F#1 F#2 F#1 . F#1 F#2'),
      lead: seq('B5 . A5 . G5 . . . . . D5 . . . . . | A5 . G5 . F#5 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [2.5,null,2.5,null,6.5,null,null,null,null,null,6.5,null,null,null,null,null,2.5,null,2.5,null,12.5,null,null,null,null,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 C2 . C2 C3 | A1 . A1 A2 A1 . A1 A2 A1 . A1 A2 A1 . A1 A2'),
      lead: seq('G5 . . . . . . . . . . . E5 . . . | . . . . C5 . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . D6 . . . . .'),
      chords: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,164.81377845643496,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [12.5,null,null,null,null,null,null,null,null,null,null,null,8.5,null,null,null,null,null,null,null,12.5,null,null,null,null,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F1 . F1 F2 F1 . F1 F2 F1 . F1 F2 F1 . F1 F2 | A1 . A1 A2 A1 . A1 A2 C2 . C2 C3 C2 . C2 C3'),
      lead: seq('A5 . G5 . F5 . . . . . C5 . . . . . | A5 . G5 . F5 . . . E5 . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[130.8127826502993,174.61411571650194,220,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [2.5,null,2.5,null,6.5,null,null,null,null,null,6.5,null,null,null,null,null,2.5,null,2.5,null,4.5,null,null,null,8.5,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('B1 . B1 B2 B1 . B1 B2 B1 . B1 B2 B1 . B1 B2 | D#2 . D#2 D#3 D#2 . D#2 D#3 F#2 . F#2 F#3 F#2 . F#2 F#3'),
      lead: seq('D#5 . . . . . . . . . . . F#5 . . . | . . . . A5 . . . . . . . B5 . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . F#6 . . . . . . . . .'),
      chords: [[155.56349186104046,184.9972113558172,220,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,220,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8,0.8,null,0.8,0.8],
      leadLen: [12.5,null,null,null,null,null,null,null,null,null,null,null,8.5,null,null,null,null,null,null,null,8.5,null,null,null,null,null,null,null,4.5,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3,4,5,6,7],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"roundMono","leadVoice":"cryptTheremin","kickVoice":"kickEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","tomVoice":"syn3PewDeep","twinkleVoice":"ringMod","chordsVoice":"tngrPolarDrift"},
  voiceParams: {"leadVoice":{"label":"Crypt Theremin","category":"Lead","synth":"MRDR-3","dur":2.8,"note":"A floating graveyard melody: sine body, a faint octave overtone, delayed vibrato and legato glide.","layer":{"osc1":{"type":"sine","ratio":1,"gain":0.9,"attack":0.055,"decay":0.3,"sustain":0.85,"release":0.3},"osc2":{"type":"sine","ratio":2,"gain":0.075,"attack":0.09,"decay":0.4,"sustain":0.65,"release":0.28}},"vibrato":{"depth":0.3,"rate":5.4,"delay":0.28},"mono":true,"portamento":0.2,"id":"cryptTheremin","kind":"tone","factory":true,"level":0.119153,"peak":0.6295}},
  fx: { delay: { feedback: 0.42, tone: 2600 }, reverb: { decay: 4.5, preDelay: 0.03 } },
  lanes: {
    bass: { gain: -6.5 },
    lead: { gain: -3, send: { delay: 0.28, reverb: 0.45 } },
    twinkle: { gain: 7, pan: 0.35, send: { delay: 0.6, reverb: 0.5 } },
    chords: { gain: -7, send: { reverb: 0.55 } },
    kick: { gain: -4.5, send: { reverb: 0.12 } },
    hats: { gain: -5, pan: -0.2, send: { reverb: 0.2 } },
    ohats: { gain: 5, pan: 0.2 },
    tom: { gain: -5.5, send: { reverb: 0.5 } },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
