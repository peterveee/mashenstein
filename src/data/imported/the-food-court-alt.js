// THE FOOD COURT ALT — one song: what it plays, how it is arranged, how it sounds.
//
// An alternate of THE FOOD COURT (hub), saved from the Song Mixer.
// The music below is THE FOOD COURT's, copied as it stood. Nothing in the game
// plays this file — "Save over THE FOOD COURT" in the desk is what decides that.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "the-food-court-alt";
export const title = "THE FOOD COURT ALT";
export const slug = "the-food-court-alt";
export const group = "alternate";
export const alternateOf = "hub";

export const bank = {
  bpm: 90,
  musicTrim: 1.05,
  echoEverything: true,
  bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
  kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
  hats: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
  sections: [
    {

    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A4 . . .'),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      lead: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      gliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      chords: chordSeq('A3min7 . . . . . . . G3maj7 . . . . . . . | A3min7 . . . . . . . G3maj7 . . . . . . .'),
    },
    {
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      bassType: "sawtooth",
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      vox: seq('. . . . . . A3 . . . . . . . . . | . . . . . . A3 . . . . . . . . .'),
      chords: chordSeq('A3min7 . . . . . . . G3maj7 . . . . . . . | A3min7 . . . . . . . G3maj7 . . . . . . .'),
    },
    {
      kick: seq('C1 . . . C1 . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . C1 . C1 . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 D4 F#4 A4 F#4 | A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 B3 D4 F4 D4'),
      leadHarm: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      bassType: "sawtooth",
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      vox: seq('. . . . A3 . . . . . C4 . . . . . | . . . . A3 . . . . . E4 . . . . .'),
      shout: seq('. . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .'),
      gliss: seq('A5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[0,0,0],null,null,null],
    },
    {
      kick: seq('C1 . . . C1 . C1 . C1 . . . C1 . C1 . | C1 . . . C1 . C1 . C1 . . . C1 . C1 .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 D4 F#4 A4 F#4 | A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 B3 D4 F4 D4'),
      leadHarm: seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3'),
      bassType: "sawtooth",
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      vox: seq('. . . . A3 . . . . . C4 . . . . . | . . . . A3 . . . . . E4 . . . . .'),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . A5 . . . . . . .'),
      chords: [[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[0,0,0],null,null,null],
    },
  ],
  order: [0,0,1,1,2,2,3,3,4,4,5,5,6,7],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 1.1,
  masterEffects: [{ id: "mbCompN" }],
  layers: [{ key: "crash2", from: "crash", independent: true }],
  voice: {"kickVoice":"fatKick","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","crash2Voice":"crashFinale","bassVoice":"bestPwmBass","leadVoice":"squareMono","chordsVoice":"bestPwmClav","leadHarmVoice":"squareMono"},
  voiceParams: {"snareVoice":{"label":"= Engine Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.0154,"peak":0.5414},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.0523,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.0266,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.0566,"peak":0.9765},"crash2Voice":{"label":"= Finale Crash","category":"Crash","homeLane":"crash","dur":7,"note":"The finale’s crash: the same closing lowpass as the engine’s, two thirds the length, because the finale runs at 126 and asks for seven steps of it.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":0.8333,"Q":0.7,"attack":0.005,"decay":1.0495,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashFinale","kind":"drum","factory":true,"level":0.06291,"peak":0.9676},"leadHarmVoice":{"label":"Square Mono","category":"Bass","synth":"MonoSynth","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"fatsawtooth"},"envelope":{"attack":0.001,"decay":0.22,"sustain":0,"release":0.27},"filter":{"type":"lowpass","Q":24,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":1.22,"sustain":0.13,"release":0.3,"baseFrequency":18000,"octaves":0}},"starter":false,"transpose":0,"mono":true,"kind":"tone","level":0.023991337540674604,"peak":0.45414295603925847,"songOrigin":"user","songSourceId":"leadHarmVoice"},"bassVoice":{"label":"BEST PWM Bass","category":"Bass","synth":"MRDR-3","dur":1.8,"note":"A moving pulse body over a sine sub that is deliberately left ALONE — modulate the sub and the weight goes with it. Everything above 100 Hz drifts; the bottom octave does not move at all.","layer":{"osc1":{"type":"pulse","width":0.38,"ratio":1,"gain":0.85,"attack":0.005,"decay":0.064,"sustain":0.8,"release":0.04666666666666667,"pwm":{"type":"sine","rate":0.24,"depth":0.45,"delay":0}},"osc2":{"type":"sine","ratio":0.5,"gain":1,"attack":0.004,"decay":0.08,"sustain":0.95,"release":0.04666666666666667},"osc3":{"type":"pulse","width":0.28,"ratio":1,"detune":-9,"gain":0.4,"attack":0.006,"decay":0.056,"sustain":0.7,"release":0.039999999999999994,"pwm":{"type":"sine","rate":0.33,"depth":0.4,"delay":0}}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":140,"Q":0.2,"track":0.4,"env":{"octaves":0.9,"attack":0.01,"decay":0.5,"sustain":0.3,"release":0.16}},"vca":{"attack":0.005,"decay":0.08,"sustain":0.93,"release":0.06}},"drive":0.3,"shape":"soft","tone":{"freq":5600},"mono":true,"portamento":0.04,"starter":false,"kind":"tone","level":0.15475423921956846,"peak":0.6975263145530999,"songOrigin":"library","songSourceId":"bassVoice"},"leadVoice":{"label":"Square Mono","category":"Bass","synth":"MonoSynth","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0.22,"sustain":0,"release":0.27},"filter":{"type":"lowpass","Q":0.1,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":1.22,"sustain":0.13,"release":0.3,"baseFrequency":18000,"octaves":0}},"starter":false,"transpose":0,"mono":true,"id":"squareMono","kind":"tone","user":true,"level":0.043368,"peak":0.7338},"kickVoice":{"label":"Fat Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"triangle","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.42,"curve":"exp","gain":1},"knock":1,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"starter":false,"id":"fatKick","kind":"drum","user":true,"level":0.035113,"peak":0.9364},"chordsVoice":{"label":"BEST PWM Clav","category":"Keys","synth":"MRDR-3","dur":1.2,"note":"Percussive and narrow: a 15% pulse with a filter envelope that shuts almost as fast as it opens. The PWM is shallow and quick — on a note this short it reads as the string still ringing rather than as modulation.","layer":{"osc1":{"type":"pulse","width":0.15,"ratio":1,"gain":1,"attack":0.002,"decay":0.28,"sustain":0.25,"release":0.1,"pwm":{"type":"sine","rate":2.4,"depth":0.3,"delay":0}},"osc2":{"type":"pulse","width":0.22,"ratio":2,"len":0.6,"detune":8,"gain":0.32,"attack":0.002,"decay":0.18,"sustain":0.15,"release":0.08,"pwm":{"type":"sine","rate":3.1,"depth":0.28,"delay":0}},"osc3":{"type":"sawtooth","ratio":0.5,"gain":0.3,"attack":0.002,"decay":0.3,"sustain":0.2,"release":0.08}},"global":{"filter":{"type":"lowpass","slope":-24,"freq":700,"Q":3.6,"track":0.55,"env":{"octaves":3.4,"attack":0.003,"decay":0.22,"sustain":0.14,"release":0.1}},"vca":{"attack":0.002,"decay":0.3,"sustain":0.3,"release":0.12}},"drive":0.38,"shape":"soft","tone":{"freq":12000},"id":"bestPwmClav","kind":"tone","factory":true,"level":0.128452,"peak":0.9613}},
  fx: { delay: { division: 0.5 }, reverb: { eq: { low: -6.7 } } },
  lanes: {
    kick: { gain: -0.1, send: { delay: 0.009, reverb: 0.168 } },
    clap: { gain: -2.9, pan: 0.26, send: { delay: 0.025, reverb: 0.949 }, eq: { high: 3.3 } },
    bass: { gain: -10, eq: { low: -3.6 }, effects: [{ id: "vowel", params: { air: 0.92, body: 0.3, rateDivision: 0.5, voice: "robotic", wet: 1, reso: 3, spread: 0.81, glide: 0.66, depth: 0.63, tilt: 0.75 } }, { id: "chandelay", params: { feedback: 0.3, tone: 1890.389, mix: 0.38 } }] },
    lead: { gain: -5.6, send: { delay: 0.125, reverb: 0.044 }, eq: { low: -3.5, mid: -4.4, high: -1.4 } },
    leadHarm: { gain: -4.5, pan: 0.344, send: { delay: 0.104, reverb: 0.127 }, effects: [{ id: "widener", bypass: true }] },
    chords: { gain: -10.7, send: { delay: 0.094, reverb: 0.051 }, eq: { high: 3.1 }, effects: [{ id: "doubler", params: { delayMs: 11, depth: 0.11, dryPan: -0.72, wetPan: 0.52, wet: 0.33 } }, { id: "reverb", params: { wet: 0.19 } }] },
    keyGliss: { gain: 2.8, send: { delay: 0.03, reverb: 1.084 }, eq: { low: -1.8, high: 3.3 }, effects: [{ id: "bitcrusher", bypass: true, params: { bits: 4, downsample: 12, wet: 0.55 } }, { id: "autopanner", params: { rateSync: 1, depth: 0.71, rateDivision: 0.5 } }, { id: "pingpong", bypass: true, params: { wet: 0.34, feedback: 0.21 } }] },
    gliss: { gain: -8.9, send: { delay: 0.28, reverb: 0.044 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 8, depth: 0.66, wet: 0.87 } }] },
    vox: { gain: -5.8, pan: -0.502, send: { delay: 0.057, reverb: 0.512 } },
    shout: { pan: 0.493, send: { delay: 0.28 }, effects: [{ id: "pingpong", params: { division: 1 } }] },
    snare: { gain: -0.8, send: { delay: 0.117, reverb: 0.176 }, eq: { mid: 2.5, high: 1.8 } },
    hats: { gain: -6.5, pan: -0.458, send: { delay: 0.28, reverb: 0.006 }, effects: [{ id: "exciter", params: { timbre: 0.41, mix: 0.7, tune: 1847.725, drive: 0.7 } }] },
    ohats: { gain: 0.3, pan: -0.407, send: { delay: 0.28, reverb: 0.018 }, effects: [{ id: "peq", params: { g4: 8, f4: 4941.675 } }] },
    crash2: { gain: -3.9, pan: 0.642, send: { reverb: 0.984 } },
  },
};

export const arrangement = {
  order: [
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
      s: 15,
      bars: 1,
    },
    {
      s: 29,
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
      s: 17,
      bars: 1,
    },
    {
      s: 9,
      bars: 1,
      from: 1,
    },
    {
      s: 12,
      bars: 1,
    },
    {
      s: 19,
      bars: 1,
      from: 1,
    },
    {
      s: 20,
      bars: 1,
    },
    {
      s: 8,
      bars: 1,
      from: 1,
    },
    {
      s: 30,
      bars: 1,
    },
    {
      s: 22,
      bars: 1,
      from: 1,
    },
    {
      s: 21,
      bars: 1,
    },
    {
      s: 22,
      bars: 1,
      from: 1,
    },
    {
      s: 13,
      bars: 1,
    },
    {
      s: 23,
      bars: 1,
      from: 1,
    },
    {
      s: 24,
      bars: 1,
    },
    {
      s: 23,
      bars: 1,
      from: 1,
    },
    {
      s: 25,
      bars: 1,
    },
    {
      s: 26,
      bars: 1,
      from: 1,
    },
    {
      s: 25,
      bars: 1,
    },
    {
      s: 11,
      bars: 1,
      from: 1,
    },
    {
      s: 10,
      bars: 1,
    },
    {
      s: 27,
      bars: 1,
      from: 1,
    },
    {
      s: 28,
      bars: 1,
    },
    {
      s: 14,
      bars: 1,
      from: 1,
    },
  ],
  sections: [
    {
      base: 2,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 1,
      bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . D2 . B2 .'),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 6,
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 C1').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      base: 2,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      base: 4,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 7,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      base: 0,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 0,
      hats: seq('. . . . C1 . . . . . . . C1 . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . D2 . . .'),
    },
    {
      base: 1,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      base: 1,
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 2,
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 2,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 3,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 3,
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      base: 4,
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      base: 4,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 5,
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      base: 6,
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      base: 7,
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 16,
      bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . A2 . B2 .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3,null,2,null],
    },
    {
      base: 21,
      leadLen: [3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  loop: {
    fromBar: 9,
    toBar: 28,
  },
};

export const variants = null;
