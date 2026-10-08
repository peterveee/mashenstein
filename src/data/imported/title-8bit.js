// EMPTY ARCADE 8-BIT — one song: what it plays, how it is arranged, how it sounds.
//
// EMPTY ARCADE as the results screen plays it: every part on the 8-Bit Sound Set, every
// fader where tools/chip-results-levels.js measured the 8-bit part should sit against the
// one it replaces, no reverb. Mix it here: Save, and the game's copy (src/game/results-chip-mixes.js)
// follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.
// The music below is EMPTY ARCADE's, copied as it stood (an alternate of title).
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "title-8bit";
export const title = "EMPTY ARCADE 8-BIT";
export const slug = "title-8bit";
export const group = "alternate";
export const alternateOf = "title";

export const bank = {
  bpm: 56,
  musicTrim: 3.33,
  bass: seq('A2 . . . . . . . F2 . . . . . . . | C3 . . . . . . . G2 . . . . . . .'),
  bassType: "sine",
  bassGain: 0.045,
  bassDur: 7.4,
  bassAttack: 0.18,
  lead: seq('A4 . . C5 . . E5 . F4 . . A4 . . C5 . | E5 . . G5 . . E5 . D5 . . C5 . . . A4'),
  leadType: "sine",
  leadGain: 0.035,
  leadDur: 5.5,
  leadAttack: 0.16,
  leadHarm: seq('E4 . . . . . C5 . C4 . . . . . A4 . | G4 . . . . . C5 . B4 . . . . . G4 .'),
  harmType: "triangle",
  harmGain: 0.016,
  harmDur: 6.2,
  harmAttack: 0.28,
  twinkle: seq('. . . . E6 . . . . . . . . . . . | . . G6 . . . . . . . . . . . . .'),
  twinkleGain: 0.012,
  twinkleDur: 7,
  twinkleAttack: 0.06,
  keyGlissGain: 0.008,
  sweeps: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sweepGain: 0.013,
  sweepDur: 10,
  chords: chordSeq('A3min7 . . . . . . . F3maj7 . . . . . . . | C4maj7 . . . . . . . G3 . . . . . . .'),
  chordType: "triangle",
  chordGain: 0.018,
  chordDur: 7.6,
  chordAttack: 0.35,
  echoLevel: 0.52,
  sections: [
    {

    },
    {
      twinkle: seq('. . E6 . . . . . . C6 . . . . . . | . . G6 . . . . . . E6 . . . . . .'),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E6 . . .'),
      sweeps: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      twinkle: seq('. E6 . . . C6 . . . . E6 . . G6 . . | . C7 . . . E6 . . G6 . . . C6 . . .'),
      keyGliss: seq('. . . . . . . . . . . . C6 . . . | . . . . . . . . . . . . G6 . . .'),
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
    },
    {
      twinkle: seq('E6 . C6 . . E6 . G6 . . C7 . . G6 . E6 | . . C6 E6 . . G6 . C7 . . E6 . G6 . E6'),
      keyGliss: seq('. . . . . . . . . . E6 . . . . . | . . . . . . . . . . . . C7 . . .'),
      sweeps: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
  ],
  order: [0,0,1,1,2,2,3,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -19.4,
  limiter: true,
  masterEffects: [{ id: "compressor", bypass: true, params: { threshold: -12, ratio: 2, attack: 0.03, release: 0.25 } }, { id: "reverb", mute: true, params: { decay: 7, wet: 0.36, preDelay: 0.034 } }, { id: "gain", params: { gain: 8.9 } }],
  layers: [{ key: "bass2", from: "bass" }, { key: "bass3", from: "bass" }],
  voice: {"bass2Voice":"toneTriangle","bassVoice":"toneSawtooth","leadVoice":"simpleSawtooth","chordsVoice":"squareTone2","kickVoice":"sdsKick","snareVoice":"gameBoySnare","clapVoice":"snareEngine","rimVoice":"vl1Sha","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","tomVoice":"tomEngine","bass3Voice":"toneSquare"},
  voiceParams: {"leadVoice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.002,"decay":1.272,"sustain":0,"release":0.2},"filter":{"type":"lowpass","Q":0.1,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.12,"sustain":0.34,"release":0.25,"baseFrequency":4175,"octaves":1.2}},"starter":false,"kind":"tone","level":0.069537,"peak":0.7751,"songOrigin":"library","songSourceId":"leadVoice"},"bass2Voice":{"label":"Triangle Tone","category":"Lead","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator triangle replacement for the engine voice.","fixedLength":0.063,"waveform":"triangle","attack":0.004,"release":0.015,"trim":0,"starter":false,"transpose":12,"drive":0.27,"kind":"tone","level":0.022763,"peak":0.6582,"songOrigin":"library","songSourceId":"bass2Voice"},"bassVoice":{"label":"Sawtooth Tone","category":"Lead","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator sawtooth replacement for the engine voice.","fixedLength":0.063,"waveform":"sawtooth","attack":0.01,"release":0.015,"trim":0,"id":"toneSawtooth","kind":"tone","factory":true,"level":0.020703,"peak":0.5903},"chordsVoice":{"label":"Short Square","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.132,"waveform":"square","attack":0.001,"release":0.089,"trim":0,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"transpose":0,"id":"squareTone2","kind":"tone","factory":true,"level":0.053305,"peak":0.6435},"kickVoice":{"label":"Simmons · Kick","category":"Kick","homeLane":"kick","dur":2,"note":"The SDS-V bass module: triangle VCO bending 190 to 48, the noise pot low and the click pot up — which is `noise.sag` here, a spike that falls to a fifth of itself in four milliseconds and carries on as body.","osc":{"type":"triangle","from":190,"to":48,"sweep":0.07,"pitchCurve":"snap","attack":0.001,"decay":0.42,"curve":"exp","gain":1},"knock":0.35,"noise":{"type":"lowpass","freq":1400,"Q":0.7,"decay":0.02,"sag":0.2,"sagAt":0.004,"gain":0.3},"drive":0.18,"id":"sdsKick","kind":"drum","factory":true,"level":0.0341,"peak":0.7197},"snareVoice":{"label":"Game Boy Snare","category":"Snare","dur":0.5,"note":"Pink-noise crack with a square body dropping 2.3k to 80 — the handheld backbeat, chokeable against the other arcade drums.","osc":{"type":"square","from":2345,"to":80,"sweep":0.37,"decay":0.37,"gain":1.02},"noise":{"type":"bandpass","freq":3710,"Q":2.85,"decay":0.905,"gain":1.98,"color":"pink"},"trim":1.9,"monoGroup":"1","starter":false,"id":"gameBoySnare","kind":"drum","user":true,"level":0.086707,"peak":1.1273},"clapVoice":{"label":"= Arcade Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.015394,"peak":0.5414},"rimVoice":{"label":"Toy Shaker","category":"Blip","homeLane":"rim","dur":0.5,"note":"The VL-1’s longer shhh: seeded white noise through a high-pass filter, with a clean one-hundred-sixty-millisecond decay.","noise":{"type":"highpass","freq":3000,"Q":0.7,"decay":0.16,"gain":1},"id":"vl1Sha","kind":"drum","factory":true,"level":0.034957,"peak":0.8505},"hatsVoice":{"label":"= Arcade Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382},"ohatsVoice":{"label":"= Arcade Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.056556,"peak":0.9765},"crashVoice":{"label":"= Arcade Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.074854,"peak":0.8242},"tomVoice":{"label":"= Arcade Tom","category":"Tom","homeLane":"tom","dur":1,"note":"The game’s own tom: a triangle falling most of an octave onto the lane’s own note. Tuned by the lane, the way the engine tunes it.","osc":{"type":"triangle","from":234,"to":130,"sweep":0.08,"attack":0.004,"decay":0.4606,"curve":"exp","gain":1},"id":"tomEngine","kind":"drum","factory":true,"level":0.036372,"peak":0.6757},"bass3Voice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.055714,"peak":0.6468}},
  lanes: {
    sweeps: { gain: -1.2, pan: 0.923, send: { delay: 0.81 }, eq: { mid: 3.3, high: 5.4 } },
    bass: { gain: 4.1, pan: -0.211, send: { delay: 0.31 }, effects: [{ id: "pingpong", params: { wet: 0.88, feedback: 0.65, division: 0.25 } }] },
    leadHarm: { gain: 1.6, pan: 0.07, send: { delay: 0.53 }, eq: { high: 5.7 } },
    twinkle: { pan: 0.24, send: { delay: 0.92 }, eq: { low: -2.6, mid: -4.4, high: 3.9 } },
    keyGliss: { gain: 3.6, pan: -0.326, send: { delay: 1.04 } },
    chords: { gain: 3.2, send: { delay: 0.88 }, effects: [{ id: "vibrato", params: { wet: 0.71 } }, { id: "autopanner", params: { rateSync: 1, rateDivision: 8, wet: 0.74, depth: 0.49 } }] },
    lead: { gain: 6, pan: -0.169, send: { delay: 0.151 } },
    bass2: { gain: -7.9, pan: 0.42, send: { delay: 0.31 }, effects: [{ id: "delay", params: { feedback: 0.58, wet: 0.75 } }] },
    bass3: { gain: -7.5, effects: [{ id: "chandelay", params: { feedback: 0.57, division: 0.25, mix: 0.51, tone: 1905.237 } }] },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
