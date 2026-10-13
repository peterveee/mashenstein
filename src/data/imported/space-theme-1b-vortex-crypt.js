// SPACE 1B — VORTEX × CRYPT SHIFT — one song: what it plays, how it is arranged, how it sounds.
//
// TIME VORTEX carrying CRYPT SHIFT: the crypt lament moved into E minor on the theremin, its
// falling sequence as the middle, a glass choir underneath and a tolling bell on the downbeats.
// E minor, 92 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-1b-vortex-crypt";
export const title = "SPACE 1B — VORTEX × CRYPT SHIFT";
export const slug = "space-theme-1b-vortex-crypt";
export const group = "imported";

export const bank = {
  bpm: 92,
  musicTrim: 1,
  sections: [
    {
      bass: seq('E2 . E2 E3 . . . . E2 . E2 E3 . . . . | B1 . B1 B2 . . . . B1 . B1 B2 . . . .'),
      lead: seq('E5 . . . . . G5 . . . F#5 . . . E5 . | D#5 . . . . . . . . . . . . . B4 .'),
      twinkle: seq('E4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null],
      leadLen: [6.6,null,null,null,null,null,4.6,null,null,null,4.6,null,null,null,2.6,null,14.6,null,null,null,null,null,null,null,null,null,null,null,null,null,2.6,null],
      twinkleLen: [12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('E2 . E2 E3 . . . . E2 . E2 E3 . . . . | B1 . B1 B2 . . . . B1 . B1 B2 . . . .'),
      lead: seq('E5 . . . . . G5 . . . F#5 . . . B5 . | D#5 . . . . . F#5 . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null],
      leadLen: [6.6,null,null,null,null,null,4.6,null,null,null,4.6,null,null,null,2.6,null,6.6,null,null,null,null,null,10.6,null,null,null,null,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('G1 . G1 G2 . . . . G1 . G1 G2 . . . . | D2 . D2 D3 . . . . D2 . D2 D3 . . . .'),
      lead: seq('G5 . . . . . B5 . . . A5 . . . . . | F#5 . . . . . A5 . . . G5 . . . . .'),
      twinkle: seq('E4 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[146.8323839587038,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null],
      leadLen: [6.6,null,null,null,null,null,4.6,null,null,null,6.6,null,null,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,6.6,null,null,null,null,null],
      twinkleLen: [12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('E2 . E2 E3 . . . . E2 . E2 E3 . . . . | B1 . B1 B2 . . . . B1 . B1 B2 . . . .'),
      lead: seq('E5 . . . G5 . . . F#5 . . . E5 . . . | D#5 . . . . . F#5 . . . B5 . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | B3 . . . . . . . . . . . . . . .'),
      chords: [[164.81377845643496,195.99771799087463,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,184.9972113558172,246.94165062806206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      bassLen: [0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null,0.8,null,0.8,0.8,null,null,null,null],
      leadLen: [4.6,null,null,null,4.6,null,null,null,4.6,null,null,null,4.6,null,null,null,6.6,null,null,null,null,null,4.6,null,null,null,6.6,null,null,null,null,null],
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"roundMono","leadVoice":"cryptTheremin","kickVoice":"kickEngine","hatsVoice":"hatEngine","tomVoice":"syn3PewDeep","twinkleVoice":"mrdrTollingBell","chordsVoice":"tngrGlassChoir"},
  voiceParams: {"leadVoice":{"label":"Crypt Theremin","category":"Lead","synth":"MRDR-3","dur":2.8,"note":"A floating graveyard melody: sine body, a faint octave overtone, delayed vibrato and legato glide.","layer":{"osc1":{"type":"sine","ratio":1,"gain":0.9,"attack":0.055,"decay":0.3,"sustain":0.85,"release":0.3},"osc2":{"type":"sine","ratio":2,"gain":0.075,"attack":0.09,"decay":0.4,"sustain":0.65,"release":0.28}},"vibrato":{"depth":0.32,"rate":5.2,"delay":0.3},"mono":true,"portamento":0.26,"id":"cryptTheremin","kind":"tone","factory":true,"level":0.119153,"peak":0.6295}},
  fx: { delay: { feedback: 0.42, tone: 2600 }, reverb: { decay: 4.5, preDelay: 0.03 } },
  lanes: {
    bass: { gain: -3 },
    lead: { gain: -3, send: { delay: 0.3, reverb: 0.5 } },
    twinkle: { gain: 7.5, pan: 0.35, send: { delay: 0.6, reverb: 0.5 } },
    chords: { gain: -6, send: { reverb: 0.6 } },
    kick: { gain: -1, send: { reverb: 0.15 } },
    hats: { gain: 0.5, pan: -0.2, send: { reverb: 0.2 } },
    tom: { gain: -6.5, send: { reverb: 0.5 } },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
