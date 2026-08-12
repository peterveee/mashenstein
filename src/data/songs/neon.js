// NEON BLASTERS — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "neon";
export const title = "NEON BLASTERS";
export const slug = "neon-panic";
export const group = "cabinet";

export const bank = {
  bpm: 120,
  musicTrim: 0.93,
  bass: seq('A2 . E2 . A2 . E2 . F2 . C2 . F2 . C2 . | D2 . A1 . D2 . A1 . E2 . E2 . G2 . B2 .'),
  lead: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5 | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
  leadType: "sawtooth",
  kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
  hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "snare2", from: "snare", independent: true }, { key: "lead3", from: "lead" }],
  voice: {"kickVoice":"kickEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","bassVoice":"bass80sSynth","snare2Voice":"ds808Snare","leadVoice":"sawtoothTone2","lead3Voice":"toneTriangle"},
  voiceParams: {"snare2Voice":{"label":"DS Crack Snare 2","category":"Snare","dur":1,"note":"Tight and driven: a short square knock, highpassed air, everything over in a tenth of a second. The backbeat for fast songs.","osc":{"type":"square","from":255,"to":440,"sweep":0.025,"decay":0.05,"curve":"exp","gain":1.31},"noise":{"type":"highpass","freq":4900,"Q":6.7,"decay":0.295,"gain":1.77,"to":800,"sweep":0.28,"sag":0.56,"slope":-24},"drive":0.35,"starter":false,"trim":1.7,"knock":1,"kind":"drum","level":0.13019468206272727,"peak":0.7,"songOrigin":"library","songSourceId":"snare2Voice"},"bassVoice":{"label":"=BASS 80s Synth","category":"Bass","synth":"MonoSynth","dur":1.6,"note":"A clean 80s synth bass with a pulse-like square tone, quick decay and a small release that keeps repeated eighth notes from becoming clicks.","options":{"oscillator":{"type":"pwm","count":2,"spread":13},"envelope":{"attack":0.01,"decay":0.82,"sustain":0.11,"release":1.2,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"},"filter":{"type":"lowpass","rolloff":-24,"Q":7.1},"filterEnvelope":{"baseFrequency":150,"octaves":3.4,"attack":0.002,"decay":0.48,"sustain":0.07,"release":0.3,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"}},"starter":false,"mono":true,"trim":1.9,"transpose":0,"kind":"tone","level":0.159,"peak":2.0247,"songOrigin":"library","songSourceId":"bassVoice"},"leadVoice":{"label":"Sawtooth Tone2","category":"Lead","synth":"GameSynth","dur":1.2,"note":"A direct single-oscillator sawtooth replacement for the engine voice.","fixedLength":0.366,"waveform":"sawtooth","attack":0.006,"release":0.244,"trim":0,"starter":false,"vibrato":{"depth":0.12,"rate":11.7},"kind":"tone","level":0.028,"peak":0.578,"songOrigin":"user","songSourceId":"leadVoice"},"kickVoice":{"label":"= Engine Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.305,"curve":"exp","gain":1},"knock":0.4,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"id":"kickEngine","kind":"drum","factory":true,"level":0.0344,"peak":0.7966},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.0523,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.0266,"peak":0.8382},"lead3Voice":{"label":"Triangle Tone","category":"Lead","synth":"GameSynth","dur":1.2,"note":"A direct single-oscillator triangle replacement for the engine voice.","fixedLength":0.397,"waveform":"triangle","attack":0.01,"release":0.568,"trim":0,"starter":false,"kind":"tone","level":0.011842000201465058,"peak":0.55,"songOrigin":"library","songSourceId":"lead3Voice"}},
  lanes: {
    kick: { gain: 2.3, eq: { high: 15 }, effects: [{ id: "reverb" }, { id: "filter" }] },
    clap: { gain: 1.7, send: { delay: 0.023, reverb: 1.38 }, effects: [{ id: "reverb", params: { wet: 0.55 } }, { id: "doubler", params: { delayMs: 11 } }] },
    hats: { gain: -1.2, pan: -0.48, eq: { high: 8.9 } },
    bass: { gain: -3.4, eq: { mid: -7.1, high: -5.4 } },
    lead: { gain: -7, send: { delay: 0.103, reverb: 1.05 }, eq: { high: 5.2 }, effects: [{ id: "pingpong", params: { wet: 0.23, feedback: 0.01, division: 0.5 } }, { id: "autopanner", params: { frequency: 7.05, depth: 0.61, wet: 0.68, rateSync: 1, rateDivision: 32 } }] },
    snare2: { gain: 2.2, send: { delay: 0.008, reverb: 0.25 }, eq: { high: 6 } },
    lead3: { gain: -3, mute: true, send: { delay: 0.103, reverb: 1.05 }, eq: { high: 5.2 }, effects: [{ id: "pingpong", bypass: true, params: { wet: 0.23, feedback: 0.01, division: 0.5 } }, { id: "autopanner", params: { frequency: 7.05, depth: 0.61, wet: 0.68, rateSync: 1, rateDivision: 32 } }, { id: "vibrato" }, { id: "reverb", params: { decay: 3.1, wet: 0.64 } }] },
  },
};

export const arrangement = {
  order: [
    {
      s: 2,
      bars: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 3,
      bars: 1,
      from: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 4,
      bars: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 5,
      bars: 1,
      from: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 6,
      bars: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 7,
      bars: 1,
      from: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 8,
      bars: 1,
      transpose: {
        bass: -6,
        lead: -6,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      transpose: {
        bass: -6,
        lead: -6,
        lead3: -6,
      },
    },
    {
      s: 8,
      bars: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: -4,
        lead: -4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: -2,
        lead: -2,
      },
    },
    {
      s: 9,
      bars: 1,
      from: 1,
      transpose: {
        bass: -2,
        lead: -2,
      },
    },
  ],
  sections: [
    {
      kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      lead3: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5 | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 0,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 1,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
    },
    {
      base: 0,
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 C1 C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 1,
      hats: seq('C1 C1 C1 C1 . C1 . C1 C1 C1 . C1 . C1 C1 C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
    },
    {
      base: 0,
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 C1 C1 . C1 C1 C1 . C1 . C1 . C1').map((v) => !!v),
      snare2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 . C1 C1 C1 . C1').map((v) => !!v),
    },
    {
      base: 1,
      hats: seq('C1 C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      snare2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
    },
    {
      base: 0,
      snare2: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 1,
      snare2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
    },
    {
      base: 0,
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      snare2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      lead: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5 | A5 . . E5 . C5 . E5 A5 . . G5 . . . .'),
      bass: seq('A2 . E2 . A2 . E2 . F2 . C2 . F2 . C2 . | D2 . A1 . D2 . A1 . E2 . E2 . E2 . E2 .'),
    },
    {
      base: 7,
      lead3: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5 | A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'),
    },
  ],
};

export const variants = null;
