// SPACE THEME 6 — FINAL FRONTIER — one song: what it plays, how it is arranged, how it sounds.
//
// Starship-lounge: a wordless soprano line over vibraphone maj7 planing (F, E-flat, D-flat),
// bongos, shaker and a tumbao bass, lightly swung. F major, 120 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-6-final-frontier";
export const title = "SPACE THEME 6 — FINAL FRONTIER";
export const slug = "space-theme-6-final-frontier";
export const group = "imported";

export const bank = {
  bpm: 120,
  musicTrim: 1,
  swing: 56,
  sections: [
    {
      bass: seq('F2 . . C2 . . F2 . . . F2 . C2 . . . | F2 . . C2 . . F2 . . . F2 . C2 . . .'),
      bassLen: [2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null,2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null],
      lead: seq('C5 . . . . . . . . . . . . . F5 . | E5 . . . . . . . C5 . . . . . A4 .'),
      leadLen: [14.4,null,null,null,null,null,null,null,null,null,null,null,null,null,2.4,null,8.4,null,null,null,null,null,null,null,6.4,null,null,null,null,null,2.4,null],
      chords: [[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,[220,261.6255653005986,329.6275569128699,349.2282314330039],null,null,null,null,null],
      chordsLen: [3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . C1 . . . . | C1 . . . . . . . C1 . . C1 . . . .').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . C1 | . . C1 . . C1 . . . . C1 . . C1 . C1').map((v) => !!v),
      tom: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('D#2 . . A#1 . . D#2 . . . D#2 . A#1 . . . | D#2 . . A#1 . . D#2 . . . D#2 . A#1 . . .'),
      bassLen: [2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null,2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null],
      lead: seq('D5 . . . . . . . . . . . . . G5 . | F5 . . . . . . . D5 . . . . . . .'),
      leadLen: [14.4,null,null,null,null,null,null,null,null,null,null,null,null,null,2.4,null,8.4,null,null,null,null,null,null,null,8.4,null,null,null,null,null,null,null],
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076,311.1269837220809],null,null,null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076,311.1269837220809],null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076,311.1269837220809],null,null,null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076,311.1269837220809],null,null,null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076,311.1269837220809],null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076,311.1269837220809],null,null,null,null,null],
      chordsLen: [3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . C1 . . . . | C1 . . . . . . . C1 . . C1 . . . .').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . C1 | . . C1 . . C1 . . . . C1 . . C1 . C1').map((v) => !!v),
      tom: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('C#2 . . G#1 . . C#2 . . . C#2 . G#1 . . . | C#2 . . G#1 . . C#2 . . . C#2 . G#1 . . .'),
      bassLen: [2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null,2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null],
      lead: seq('C5 . . . . . . . F5 . . . G#5 . . . | G5 . . . . . . . . . . . F5 . . .'),
      leadLen: [8.4,null,null,null,null,null,null,null,4.4,null,null,null,4.4,null,null,null,12.4,null,null,null,null,null,null,null,null,null,null,null,4.4,null,null,null],
      chords: [[174.61411571650194,207.65234878997256,261.6255653005986,277.1826309768721],null,null,null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,277.1826309768721],null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,277.1826309768721],null,null,null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,277.1826309768721],null,null,null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,277.1826309768721],null,null,null,[174.61411571650194,207.65234878997256,261.6255653005986,277.1826309768721],null,null,null,null,null],
      chordsLen: [3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . C1 . . . . | C1 . . . . . . . C1 . . C1 . . . .').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . C1 | . . C1 . . C1 . . . . C1 . . C1 . C1').map((v) => !!v),
      tom: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('C2 . . G1 . . C2 . . . C2 . G1 . . . | C2 . . G1 . . C2 . . . C2 . G1 . . .'),
      bassLen: [2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null,2.4000000000000004,null,null,2.4000000000000004,null,null,3,null,null,null,1.6,null,3,null,null,null],
      lead: seq('F5 . . . . . . . G5 . . . A#5 . . . | A5 . . . . . . . G5 . . . E5 . . .'),
      leadLen: [8.4,null,null,null,null,null,null,null,4.4,null,null,null,4.4,null,null,null,8.4,null,null,null,null,null,null,null,4.4,null,null,null,4.4,null,null,null],
      chords: [[195.99771799087463,233.08188075904496,261.6255653005986,349.2282314330039],null,null,null,null,null,[195.99771799087463,233.08188075904496,261.6255653005986,349.2282314330039],null,null,null,[195.99771799087463,233.08188075904496,261.6255653005986,349.2282314330039],null,null,null,null,null,[195.99771799087463,233.08188075904496,261.6255653005986,329.6275569128699],null,null,null,null,null,[195.99771799087463,233.08188075904496,261.6255653005986,329.6275569128699],null,null,null,[195.99771799087463,233.08188075904496,261.6255653005986,329.6275569128699],null,null,null,null,null],
      chordsLen: [3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,3,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . C1 . . . . | C1 . . . . . . . C1 . . C1 . . . .').map((v) => !!v),
      rim: seq('. . C1 . . C1 . . . . C1 . . C1 . C1 | . . C1 . . C1 . . . . C1 . . C1 . C1').map((v) => !!v),
      tom: seq('C1 . . . . . . C1 C1 . . . . . . . | C1 . . . . . . C1 C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"tpBassGuitar","leadVoice":"jmjrChoirOoh","chordsVoice":"mrdrVibraphone","kickVoice":"tr808Kick","rimVoice":"bongoHigh","tomVoice":"bongoLow","hatsVoice":"shaker"},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -7 },
    lead: { gain: 1, send: { reverb: 0.5 } },
    chords: { gain: -10, pan: 0.15, send: { reverb: 0.35 } },
    kick: { gain: -10 },
    rim: { gain: -5, pan: 0.3 },
    tom: { gain: -8, pan: -0.25 },
    hats: { gain: -4, pan: 0.15 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
