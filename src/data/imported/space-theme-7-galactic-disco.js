// SPACE THEME 7 — GALACTIC DISCO — one song: what it plays, how it is arranged, how it sounds.
//
// 1977 space-disco: four on the floor, octave bass, disco strings, a PWM brass lead and
// syndrum pews on the off-beat. A minor, 124 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-7-galactic-disco";
export const title = "SPACE THEME 7 — GALACTIC DISCO";
export const slug = "space-theme-7-galactic-disco";
export const group = "imported";

export const bank = {
  bpm: 124,
  musicTrim: 1,
  sections: [
    {
      bass: seq('A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 A2 | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 D3'),
      bassLen: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9],
      lead: seq('E5 . . . . . A5 . . . . . G5 . E5 . | F5 . . . . . . . . . D5 . E5 . F5 .'),
      leadLen: [5.699999999999999,null,null,null,null,null,5.699999999999999,null,null,null,null,null,1.9,null,1.9,null,9.5,null,null,null,null,null,null,null,null,null,1.9,null,1.9,null,1.9,null],
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 G2 | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 C3'),
      bassLen: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9],
      lead: seq('G5 . . . . . D5 . . . B4 . . . D5 . | E5 . . . . . . . . . . . . . . .'),
      leadLen: [5.699999999999999,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null,1.9,null,15.2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [[195.99771799087463,246.94165062806206,293.6647679174076,391.99543598174927],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F1 . F2 . F1 . F2 . F1 . F2 . F1 . F2 F2 | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 D3'),
      bassLen: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9],
      lead: seq('A5 . . . . . C6 . . . . . A5 . G5 . | F5 . . . . . . . A5 . . . F5 . D5 .'),
      leadLen: [5.699999999999999,null,null,null,null,null,5.699999999999999,null,null,null,null,null,1.9,null,1.9,null,7.6,null,null,null,null,null,null,null,3.8,null,null,null,1.9,null,1.9,null],
      chords: [[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 E2 | E1 . E2 . E1 . E2 . E1 . E2 . E1 . E2 E2'),
      bassLen: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,0.9],
      lead: seq('E5 . . . . . G#5 . . . . . B5 . . . | D6 . . . . . B5 . . . G#5 . . . E5 .'),
      leadLen: [5.699999999999999,null,null,null,null,null,5.699999999999999,null,null,null,null,null,3.8,null,null,null,5.699999999999999,null,null,null,null,null,3.8,null,null,null,3.8,null,null,null,1.9,null],
      chords: [[207.65234878997256,246.94165062806206,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[207.65234878997256,246.94165062806206,293.6647679174076,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"bass80sSynth","leadVoice":"bestPwmBrass","chordsVoice":"bestPwmStrings","kickVoice":"tr808Kick","clapVoice":"tr808Clap","hatsVoice":"tr808ClosedHat","ohatsVoice":"tr808OpenHat","tomVoice":"sdDiscoTom"},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -7.5 },
    lead: { gain: 1, send: { delay: 0.15, reverb: 0.3 } },
    chords: { gain: -12, send: { reverb: 0.45 } },
    kick: { gain: -7.5 },
    clap: { send: { reverb: 0.2 } },
    hats: { gain: -5, pan: 0.2 },
    ohats: { gain: -11, pan: -0.2 },
    tom: { gain: -5, send: { reverb: 0.35 } },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
