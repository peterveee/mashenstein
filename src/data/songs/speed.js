// SPEED ZONE — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "speed";
export const title = "SPEED ZONE";
export const slug = "speed-panic";
export const group = "cabinet";

export const bank = {
  bpm: 128,
  musicTrim: 0.87,
  bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . | A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'),
  lead: seq('E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4 | E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
  echoLevel: 0.16,
  bassEcho: true,
  sections: [
    {

    },
    {
      bass: seq('A1 A1 . A1 . A1 . . C2 C2 . C2 . C2 . . | D2 D2 . D2 . D2 . . E2 . G2 . E2 . C2 .'),
      lead: seq('A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5 | A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
    },
    {
      bass: seq('B1 B1 . B1 . B1 . . D2 D2 . D2 . D2 . . | E2 E2 . E2 . E2 . . F#2 . A2 . F#2 . D2 .'),
      lead: seq('B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5 | B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
    },
    {
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .'),
      keyGlissGain: 0.035,
    },
    {
      bass: seq('A1 A1 . A1 . A1 . . C2 C2 . C2 . C2 . . | D2 D2 . D2 . D2 . . E2 . G2 . E2 . C2 .'),
      lead: seq('A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5 | A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . B5 . . .'),
      keyGlissGain: 0.035,
    },
    {
      bass: seq('B1 B1 . B1 . B1 . . D2 D2 . D2 . D2 . . | E2 E2 . E2 . E2 . . F#2 . A2 . F#2 . D2 .'),
      lead: seq('B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5 | B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      keyGlissGain: 0.035,
    },
  ],
  order: [0,0,0,0,0,0,0,3,1,4,2,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 0.7,
  layers: [{ key: "hats2", from: "hats", independent: true }, { key: "lead2", from: "lead" }, { key: "crash2", from: "crash", independent: true }],
  voice: {"kickVoice":"dsKickHard","snareVoice":"snareFat","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","leadVoice":"toneSquare","bassVoice":"roundBass","hats2Voice":"hat808","lead2Voice":"toneSquare","crash2Voice":"ds909Crash"},
  voiceParams: {"kickVoice":{"label":"DS Kick","category":"Kick","dur":1,"note":"The drum-synth 808: a sine dropping an octave and a half into a long sub tail, with a filtered click on the front and a little drive to round it.","osc":{"type":"triangle","from":165,"to":48,"sweep":0.07,"decay":1.155,"curve":"exp","gain":1.18,"attack":0.016},"noise":{"type":"lowpass","freq":3175,"Q":0.7,"decay":0.015,"gain":0.77},"drive":0.2,"starter":false,"knock":0.3,"kind":"drum","level":0.0773,"peak":0.7,"songOrigin":"library","songSourceId":"kickVoice"},"hats2Voice":{"label":"= 808 Hat","category":"Hats","homeLane":"hats","synth":"MetalSynth","dur":0.5,"note":"The drum-machine closed hat: six detuned squares through a high resonance, gone in forty milliseconds. Metallic in a way no filtered noise gets to.","options":{"harmonicity":5.3,"modulationIndex":38,"resonance":5200,"octaves":1.2,"envelope":{"attack":0.001,"decay":0.05,"release":0.61,"releaseCurve":"exponential","decayCurve":"exponential","attackCurve":"linear"}},"starter":false,"fixedLength":0,"trim":1.8,"transpose":0,"kind":"tone","level":0.04840826389329074,"peak":2.4856460661221815,"songOrigin":"library","songSourceId":"hats2Voice"},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.0523,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.0266,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.0566,"peak":0.9765},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"GameSynth","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.0301,"peak":0.5953},"lead2Voice":{"label":"Square Tone","category":"Lead","synth":"GameSynth","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.028709,"peak":0.5952},"snareVoice":{"label":"Fat Snare","category":"Snare","dur":1,"note":"Lower band, longer tail and much more body — a snare that carries a backbeat on its own rather than sitting on top of one.","noise":{"type":"bandpass","freq":1700,"Q":0.5,"decay":0.16},"body":{"type":"triangle","from":180,"to":110,"decay":0.11,"gain":0.6},"id":"snareFat","kind":"noise","factory":true,"level":0.0182,"peak":0.6748},"crash2Voice":{"label":"=909 Crash","category":"Crash","homeLane":"crash","dur":5,"note":"A bright 909-style crash with a dense front and a high end that darkens as it decays, intended for phrase changes rather than every bar.","noise":{"type":"lowpass","freq":6925,"to":1550,"sweep":0.96,"Q":6.8,"decay":2.995,"gain":1.51,"attack":0.153,"color":"white","slope":-24},"drive":0.4,"starter":false,"bypassed":{"ring":{"type":"bandpass","freq":400,"Q":40,"hit":0.002,"decay":0.25,"curve":"exp","gain":1},"metal":{"wave":"square","freq":990,"spread":1.26,"count":6,"hp":7275,"Q":5,"decay":0.65,"gain":0.58,"sag":0.14}},"kind":"drum","level":0.36325813074366137,"peak":0.7,"songOrigin":"library","songSourceId":"crash2Voice"},"bassVoice":{"label":"Round Bass","category":"Bass","synth":"MonoSynth","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.001,"decay":1.24,"sustain":0.29,"release":0.8},"filter":{"type":"lowpass","Q":2.9,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":1.22,"sustain":0.13,"release":0.3,"baseFrequency":110,"octaves":3.9}},"starter":false,"id":"roundBass","kind":"tone","level":0.0756,"peak":1.183,"user":true}},
  lanes: {
    lead: { gain: -1.5, effects: [{ id: "pingpong", params: { division: 0.5, feedback: 0.1, wet: 0.16 } }] },
    keyGliss: { gain: 3, send: { delay: 0.18 }, effects: [{ id: "autopanner" }] },
    kick: { send: { reverb: 0.125 } },
    snare: { gain: 3.5, send: { reverb: 0.607 }, eq: { mid: 5, high: 4.1 } },
    clap: { gain: 0.3, send: { delay: 0.02, reverb: 0.681 } },
    bass: { gain: -4.6, effects: [{ id: "compressor", params: { ratio: 7.5 } }] },
    hats2: { gain: -0.2, pan: -0.241, send: { reverb: 0.111 }, eq: { high: 5.7 } },
    lead2: { gain: -11.2, mute: true, send: { delay: 0.69, reverb: 3 } },
    hats: { pan: -0.253 },
    crash2: { gain: -1.1, send: { delay: 0.147, reverb: 0.83 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 2, depth: 0.62 } }] },
  },
};

export const arrangement = {
  order: [
    {
      s: 6,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 21,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 8,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 7,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 22,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 9,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 9,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 9,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 9,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 11,
      bars: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 12,
      bars: 1,
      from: 1,
      transpose: {
        bass: -12,
      },
    },
    {
      s: 13,
      bars: 1,
    },
    {
      s: 14,
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
      bass: seq('E2 . . . . E2 . . G2 . . . . . . . | A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'),
      bassLen: [4,null,null,null,null,3,null,null,7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . | A2 . . . . A2 . . B2 . . . B2 . G2 .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,3,null,null,4,null,null,null,3,null,2,null],
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 0,
      bass: seq('E2 . . . . E2 . . G2 . . G2 . G2 . . | A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'),
      bassLen: [4,null,null,null,null,3,null,null,2,null,null,2,null,2,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 3,
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 3,
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 1,
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 1,
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 4,
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 4,
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 2,
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 2,
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 5,
      hats2: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 5,
      hats2: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 7,
      bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . | A2 . . . . A2 . . B2 . . . . . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,null,3,null,null,7,null,null,null,null,null,null,null],
    },
    {
      base: 9,
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
};

export const variants = null;
