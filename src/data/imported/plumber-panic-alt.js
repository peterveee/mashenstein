// PLUMBER PANIC ALT — one song: what it plays, how it is arranged, how it sounds.
//
// An alternate of PLUMBER PANIC (plumber), saved from the Song Mixer.
// The music below is PLUMBER PANIC's, copied as it stood. Nothing in the game
// plays this file — "Save over PLUMBER PANIC" in the desk is what decides that.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "plumber-panic-alt";
export const title = "PLUMBER PANIC ALT";
export const slug = "plumber-panic-alt";
export const group = "alternate";
export const alternateOf = "plumber";

export const bank = {
  bpm: 112,
  musicTrim: 0.93,
  bass: seq('A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 . | A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 .'),
  lead: seq('A4 . C5 E5 . A4 . . F4 A4 C5 . E5 . D5 C5 | A4 . C5 E5 . G5 . . F5 E5 D5 . C5 . B4 A4'),
  leadHarm: seq('F4 . A4 C5 . F4 . . D4 F4 A4 . C5 . B4 A4 | F4 . A4 C5 . E5 . . D5 C5 B4 . A4 . G4 F4'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  sections: [
    {
      leadHarm: null,
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      echoLevel: 0,
    },
    {
      leadHarm: null,
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      echoLevel: 0.08,
      lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
    },
    {
      echoLevel: 0.14,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      keyGlissGain: 0.035,
      shout: seq('. . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .'),
      shoutGain: 0.35,
      chords: chordSeq('. . . A3min7 . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('A5 . E5 C5 . A4 . . G4 C5 E5 . D5 . D5 B4 | A5 . E5 C5 . C5 . . G4 C5 E5 . B4 . G4 A4'),
      leadHarm: seq('F5 . C5 A4 . F4 . . E4 A4 C5 . B4 . B4 G4 | F5 . C5 A4 . A4 . . E4 A4 C5 . G4 . E4 F4'),
      echoLevel: 0.2,
      chords: chordSeq('. . . A3min7 . . . . . . . . . . . . | . . . . . . . F3maj7 . . . . . . . .'),
    },
    {
      lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
      leadHarm: seq('C5 . A4 F4 . C5 . . E5 C5 A4 . B4 . G4 B4 | C5 . A4 F4 . F5 . . E5 D5 C5 . B4 . A4 G4'),
      echoLevel: 0.27,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .'),
      keyGlissGain: 0.035,
      chords: chordSeq('. . . A3min7 . . . . . . . C4maj7 . . . . | . . . A3min7 . . . . . . . C4maj7 . . . .'),
    },
    {
      echoLevel: 0.35,
      shout: seq('A3 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      shoutGain: 0.35,
      chords: chordSeq('. . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3 | . . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3'),
    },
  ],
  order: [0,0,1,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  voice: {"snareVoice":"dsCrackSnare2","kickVoice":"ds808Kick","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","bassVoice":"roundBass","leadVoice":"toneSquare","leadHarmVoice":"fmBell","chordsVoice":"celeste"},
  voiceParams: {"bassVoice":{"label":"Round Bass","category":"Bass","synth":"MonoSynth","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.001,"decay":1.24,"sustain":0.29,"release":0.8},"filter":{"type":"lowpass","Q":2.9,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":1.22,"sustain":0.13,"release":0.3,"baseFrequency":110,"octaves":3.9}},"starter":false,"transpose":-12,"kind":"tone","level":0.05788668067186038,"peak":1.1797515427825107,"songOrigin":"user","songSourceId":"bassVoice"},"kickVoice":{"label":"=808 Kick","category":"Kick","homeLane":"kick","dur":3,"note":"A long 808-style sub kick: deep sine drop, soft front click and a tail that can become the bass line when it is tuned in a pattern.","osc":{"type":"sine","from":170,"to":36,"sweep":0.06,"attack":0.001,"decay":0.78,"curve":"exp","gain":1},"noise":{"type":"lowpass","freq":2200,"Q":0.7,"decay":0.02,"gain":0.25},"drive":0.26,"starter":false,"kind":"drum","level":0.07003523980325366,"peak":0.7,"songOrigin":"library","songSourceId":"kickVoice"},"snareVoice":{"label":"DS Crack Snare 2","category":"Snare","dur":1,"note":"Tight and driven: a short square knock, highpassed air, everything over in a tenth of a second. The backbeat for fast songs.","osc":{"type":"square","from":255,"to":440,"sweep":0.025,"decay":0.05,"curve":"exp","gain":0.55},"noise":{"type":"highpass","freq":2900,"Q":0.8,"decay":0.3,"gain":1},"drive":0.35,"id":"dsCrackSnare2","kind":"drum","factory":true,"level":0.101559,"peak":0.7},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.052286,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.056556,"peak":0.9765},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"GameSynth","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.028709,"peak":0.5952},"leadHarmVoice":{"label":"FM Bell","category":"Bells","synth":"FMSynth","dur":1.2,"note":"Struck and metallic, decaying rather than held — a bell at long lengths.","options":{"harmonicity":3,"modulationIndex":8,"oscillator":{"type":"sine"},"modulation":{"type":"sine"},"envelope":{"attack":0.003,"decay":0.6,"sustain":0.05,"release":0.6},"modulationEnvelope":{"attack":0.002,"decay":0.35,"sustain":0.02,"release":0.4}},"id":"fmBell","kind":"tone","factory":true,"level":0.018029,"peak":0.2199},"chordsVoice":{"label":"Celeste","category":"Bells","synth":"FMSynth","dur":4,"note":"Small, high and pure, with a very long tail. Made for the twinkle lane.","options":{"harmonicity":7,"modulationIndex":4,"oscillator":{"type":"sine"},"modulation":{"type":"sine"},"envelope":{"attack":0.001,"decay":1.6,"sustain":0.01,"release":1.6},"modulationEnvelope":{"attack":0.001,"decay":0.4,"sustain":0,"release":0.4}},"id":"celeste","kind":"tone","factory":true,"level":0.024454,"peak":0.2195}},
  lanes: {
    kick: { gain: 3.2 },
    snare: { gain: 2, send: { reverb: 0.37 } },
    ohats: { eq: { high: 11 } },
    bass: { gain: -0.4, eq: { low: -1 } },
    lead: { gain: -3.1, pan: -0.101, send: { delay: 0.017, reverb: 0.208 } },
    leadHarm: { pan: 0.155 },
  },
};

export const arrangement = {
  order: [
    {
      s: 14,
      bars: 1,
    },
    {
      s: 6,
      bars: 1,
      from: 1,
    },
    {
      s: 9,
      bars: 1,
    },
    {
      s: 10,
      bars: 1,
      from: 1,
    },
    {
      s: 7,
      bars: 1,
    },
    {
      s: 8,
      bars: 1,
      from: 1,
    },
    {
      s: 7,
      bars: 1,
    },
    {
      s: 13,
      bars: 1,
      from: 1,
    },
    {
      s: 15,
      bars: 1,
    },
    {
      s: 16,
      bars: 1,
      from: 1,
    },
    {
      s: 17,
      bars: 1,
    },
    {
      s: 18,
      bars: 1,
      from: 1,
    },
    {
      s: 12,
      bars: 1,
    },
    {
      s: 11,
      bars: 1,
      from: 1,
    },
    {
      s: 19,
      bars: 1,
    },
    {
      s: 20,
      bars: 1,
      from: 1,
    },
  ],
  sections: [
    {
      base: 0,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
    },
    {
      base: 1,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 7,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
    },
    {
      base: 6,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null],
    },
    {
      base: 6,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 4,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
      chords: [null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.88330125612407],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null,null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null],
    },
    {
      base: 4,
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.88330125612407],null,null,null,null],
      chordsLen: [null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null,null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 7,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 . C1').map((v) => !!v),
      bassLen: [1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.34,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
    },
    {
      base: 9,
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 2,
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 2,
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
    },
    {
      base: 3,
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 3,
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1.5,1.5,1.5,1.5],null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      bassLen: [1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: [null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.88330125612407],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075]],
      chordsLen: [null,null,null,[1.5,1.5,1.5,1.5],null,null,null,[1.5,1.5,1.5,1.5],null,null,null,[1.5,1.5,1.5,1.5],null,null,null,[1.5,1.5,1.5],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null,1.5946,null],
      chords: [null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.88330125612407],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076]],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1.5,1.5,1.5,1.5],null,null,null,[1.5,1.5,1.5,1.5],null,null,null,[1.5,1.5,1.5,1.5],null,null,null,[1.5,1.5,1.5]],
    },
  ],
  swing: 52,
};

export const variants = {
  select: [
    {
      when: "always",
      loop: { fromBar: 1, toBar: 4 },
      treatment: [{ id: "filter", params: { type: "highpass", frequency: 520, Q: 0.9 } }],
      gap: 0.15,
      patch: {
        fx: { reverb: { level: 1.4 } },
        lanes: {
          lead: { mute: true },
          leadHarm: { mute: true },
          bass: { send: { reverb: 0.32 } },
          kick: { send: { reverb: 0.26 } },
          snare: { send: { reverb: 0.6 } },
          hats: { send: { reverb: 0.18 } },
          ohats: { send: { reverb: 0.18 } },
          clap: { send: { reverb: 0.3 } },
        },
      },
      exit: { quantize: "beat", crossfadeBars: 0, loopRelease: "atTransition", swellBars: 0.5, swellTo: 2.8, treatBars: 1.5 },
    },
  ],
};
