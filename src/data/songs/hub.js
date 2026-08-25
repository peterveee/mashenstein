// THE FOOD COURT — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "hub";
export const title = "THE FOOD COURT";
export const slug = "food-court";
export const group = "theme";

export const bank = {
  bpm: 90,
  musicTrim: 1.05,
  echoEverything: true,
  bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
  // Keep the basic groove audible before the arrangement adds its other layers:
  // quarter-note kick with the engine snare on beats 2 and 4.
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
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
  master: -1.9,
  masterEffects: [{ id: "peq", params: { f1: 110, g1: 4, f2: 500, g2: 0, q2: 1, f5: 1000, g5: 0, q5: 1, f3: 3200, g3: -3, q3: 0.9, f4: 9000, g4: -0.5 } }, { id: "mbComp" }, { id: "l7", params: { threshold: -4.3, ceiling: -1.5 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "bass2", from: "bass", independent: true }],
  labels: {"bass2":"Square Mono 2","kick":"Kick","snare":"Snare","clap":"Clap","hats":"HH","ohats":"Open Hat","crash2":"Crash"},
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","crash2Voice":"crashFinale","bassVoice":"toneSquare","bass2Voice":"squareMono","chordsVoice":"shopOrgan2","leadVoice":"toneSquare","leadHarmVoice":"squareTone2"},
  voiceParams: {"kickVoice":{"label":"= Engine Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.305,"curve":"exp","gain":1},"knock":0.4,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"id":"kickEngine","kind":"drum","factory":true,"level":0.0344,"peak":0.7966},"snareVoice":{"label":"= Engine Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.0154,"peak":0.5414},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.0523,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.0266,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.0566,"peak":0.9765},"crash2Voice":{"label":"= Finale Crash","category":"Crash","homeLane":"crash","dur":7,"note":"The finale’s crash: the same closing lowpass as the engine’s, two thirds the length, because the finale runs at 126 and asks for seven steps of it.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":0.8333,"Q":0.7,"attack":0.005,"decay":1.0495,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashFinale","kind":"drum","factory":true,"level":0.06291,"peak":0.9676},"bass2Voice":{"label":"Square Mono","category":"Bass","synth":"CRLS-1","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.695,"sustain":0.06,"release":2.366},"filter":{"type":"lowpass","Q":1.85,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":0.34,"sustain":0.13,"release":0.3,"baseFrequency":1050,"octaves":2.4}},"starter":false,"transpose":-12,"mono":true,"fine":16,"trim":-1.9,"kind":"tone","level":0.04695835429260011,"peak":0.6757380065131527,"songOrigin":"user","songSourceId":"bassVoice"},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.002,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"kind":"tone","level":0.055705191727645424,"peak":0.6468,"songOrigin":"library","songSourceId":"leadVoice"},"leadHarmVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.132,"waveform":"square","attack":0.001,"release":0.002,"trim":0,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"transpose":0,"drive":0.12,"chorus":{"mix":0.15},"kind":"tone","level":0.06337541561263485,"peak":0.7350316524231878,"songOrigin":"library","songSourceId":"leadHarmVoice"},"chordsVoice":{"label":"Shop Organ 2","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":6.92,"note":"The shop theme’s own: bright, percussive, short and dry — comping rather than holding, so it sits under the lead instead of over it.","additive":{"bars":[0,0.24,1,0.78,0.48,0.53,0.3,0.46,0.42],"attack":0.018,"decay":0.451,"echo":false,"perc":{"ratio":6,"gain":2,"attack":0.002,"decay":0.072},"type":"sine","stretch":0,"sustain":0,"release":0.139},"starter":false,"trim":3,"fixedLength":1.103,"vibrato":{"depth":0.05},"kind":"tone","level":0.08800844015923955,"peak":2.0312686871593186,"songOrigin":"library","songSourceId":"chordsVoice"},"bassVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.055714,"peak":0.6468}},
  fx: { delay: { level: 1.148, eq: { low: -4.4 } }, reverb: { level: 1.096 } },
  lanes: {
    kick: { gain: -0.4, send: { delay: 0.28, reverb: 0.02 } },
    clap: { gain: 0.4, pan: 0.24, send: { delay: 0.28, reverb: 1.13 } },
    bass: { gain: -15.5, send: { delay: 0.559 }, eq: { low: -3.3, high: 1.1 }, effects: [{ id: "distortion", params: { distortion: 0.22 } }, { id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }] },
    lead: { gain: -4, send: { delay: 0.125, reverb: 0.044 }, eq: { low: -3.5, mid: -4.4, high: 1.5 } },
    leadHarm: { gain: -4, send: { delay: 0.126, reverb: 0.127 }, effects: [{ id: "widener" }] },
    chords: { gain: -5.6, send: { delay: 0.432, reverb: 0.051 }, eq: { high: 3.1 }, effects: [{ id: "doubler", params: { delayMs: 11, depth: 0.11, dryPan: -0.72, wetPan: 0.52, wet: 0.33 } }, { id: "reverb", bypass: true, params: { wet: 0.94, decay: 5.9, high: 5, low: -9, width: 1.36, preDelay: 0.012 } }] },
    keyGliss: { gain: 0.6, send: { delay: 0.03, reverb: 0.454 }, eq: { low: -1.8, high: 6 }, effects: [{ id: "bitcrusher", bypass: true, params: { bits: 4, drive: 4, tone: 3945.696, wet: 0.55 } }, { id: "autopanner", params: { rateSync: 1, depth: 0.71, rateDivision: 0.5 } }, { id: "pingpong", params: { wet: 0.34, feedback: 0.21 } }] },
    gliss: { gain: -1.8, send: { delay: 0.28, reverb: 0.044 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 8, depth: 0.66, wet: 0.87 } }] },
    vox: { gain: 0.5, pan: -0.256, send: { delay: 0.057, reverb: 0.615 } },
    shout: { gain: 0.4, pan: 0.25, send: { delay: 0.28 }, effects: [{ id: "pingpong", params: { division: 1 } }] },
    snare: { gain: 0.7, send: { delay: 0.28, reverb: 0.395 } },
    hats: { pan: -0.13, send: { delay: 0.28, reverb: 0.006 } },
    ohats: { pan: -0.179, send: { delay: 0.28, reverb: 0.018 } },
    crash2: { gain: -3.9, send: { reverb: 0.984 } },
    bass2: { gain: -20.8 },
  },
};

export const arrangement = {
  order: [{"s":23,"bars":1},{"s":25,"bars":1,"from":1},{"s":24,"bars":1},{"s":15,"bars":1,"from":1},{"s":16,"bars":1},{"s":26,"bars":1,"from":1},{"s":16,"bars":1},{"s":9,"bars":1,"from":1},{"s":12,"bars":1},{"s":17,"bars":1,"from":1},{"s":17,"bars":1},{"s":8,"bars":1,"from":1},18,18,{"s":13,"bars":1},{"s":19,"bars":1,"from":1},19,20,{"s":20,"bars":1},{"s":11,"bars":1,"from":1},{"s":10,"bars":1},{"s":21,"bars":1,"from":1},{"s":22,"bars":1},{"s":14,"bars":1,"from":1}],
  sections: [
    {
      base: 2,
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . C1 . . . . . C1 C1 C1 .').map((v) => !!v),
    },
    {
      base: 1,
      bass: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . D2 . B2 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . D2 . B2 .'),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 6,
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 5,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 C1').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 2,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 4,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 7,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 0,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . C1 . . . . . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 1,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 2,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 3,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 4,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 5,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 6,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
    },
    {
      base: 7,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 0,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 1,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 C1').map((v) => !!v),
    },
  ],
  loop: {
    fromBar: 9,
    toBar: 28,
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
