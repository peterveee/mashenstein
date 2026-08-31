// RHYTHM BANKRUPTCY COPY 2 — one song: what it plays, how it is arranged, how it sounds.
//
// A copy of RHYTHM BANKRUPTCY (rhythm), taken from the TRK-24.
// Everything below is that song as the desk had it at the moment of the copy.
// It is a snapshot and nothing more: the game does not play this file, no
// cabinet can select it, and RHYTHM BANKRUPTCY is untouched by anything done here.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "rhythm-bankruptcy-copy-2";
export const title = "RHYTHM BANKRUPTCY COPY 2";
export const slug = "rhythm-bankruptcy-copy-2";
export const group = "copy";

export const bank = {
  bpm: 124,
  musicTrim: 1.05,
  crashGain: 0.48,
  sweepGain: 0.34,
  bass: seq('C2 . . C3 . . G2 . G2 . . G3 . . A2 . | A2 . . A3 . . F2 . F2 . . F3 . . F2 .'),
  lead: seq('C5 . E5 G5 C5 . E5 G5 G4 . B4 D5 G4 . B4 D5 | A4 . C5 E5 A4 . C5 E5 A4 . C5 F5 A4 . C5 F5'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
  hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | C1 . . . C1 . . . C1 . . . C1 C1 . C1').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -1,
  layers: [{ key: "bass2", from: "bass", independent: true }, { key: "lead2", from: "lead", independent: true }],
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","bassVoice":"simpleSawtooth","bass2Voice":"toneTriangle","lead2Voice":"tngrCloudMemory","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","leadVoice":"squareTone2"},
  voiceParams: {"bassVoice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"pwm"},"envelope":{"attack":0.001,"decay":0.302,"sustain":0.88,"release":0.087},"filter":{"type":"lowpass","Q":5.35,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.177,"sustain":0.54,"release":0.25,"baseFrequency":280,"octaves":3.4}},"starter":false,"mode":"mono","kind":"tone","level":0.1395909449179106,"peak":1.2684204257950096,"songOrigin":"library","songSourceId":"bassVoice"},"kickVoice":{"label":"= Engine Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.305,"curve":"exp","gain":1},"knock":0.4,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"id":"kickEngine","kind":"drum","factory":true,"level":0.03437,"peak":0.7966},"snareVoice":{"label":"= Engine Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.015394,"peak":0.5414},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.052286,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.0566,"peak":0.9765},"crashVoice":{"label":"= Engine Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.0749,"peak":0.8242},"lead2Voice":{"label":"Cloud Memory","category":"Pad","synth":"TNGR-2","dur":6,"note":"A soft low-motion warm pad for ambience and dialogue beds.","tngr2":{"oscA":{"table":"warmHarmonics","position":0.15,"envAmount":0.32,"level":0.78,"unison":2,"spread":12,"lfoAmount":0},"oscB":{"table":"vowelAEIOU","position":0.32,"envAmount":0.3,"level":0.35000000000000003,"unison":2,"spread":9,"interval":12,"detune":2},"amp":{"attack":0.013,"decay":3.108,"sustain":0.62,"release":0.068},"positionEnv":{"attack":0.604,"decay":2.6,"sustain":0.5},"filter":{"type":"lowpass","cutoff":5165,"resonance":4.35,"keyTrack":0.35},"filterEnv":{"amount":0.3,"attack":0.276,"decay":2,"sustain":0.4},"master":{"gain":0.6},"lfo1":{"shape":"sine"}},"starter":false,"vibrato":{"depth":0.04},"drive":0.12,"chorus":{"mix":0.07},"kind":"tone","level":0.052923,"peak":0.4159,"songOrigin":"library","songSourceId":"lead2Voice"},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.132,"waveform":"square","attack":0.001,"release":0.051,"trim":0,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"transpose":0,"chorus":{"mix":0.27},"drive":0.02,"kind":"tone","level":0.052128905438333595,"peak":0.7616563646617353,"songOrigin":"library","songSourceId":"leadVoice"},"bass2Voice":{"label":"Triangle Tone","category":"Lead","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator triangle replacement for the engine voice.","fixedLength":0.063,"waveform":"triangle","attack":0.006,"release":0.03,"trim":0,"starter":false,"vibrato":{"depth":0.08},"drive":0.45,"drivePlace":"pre","filter":{"type":"bandpass","slope":-12,"freq":645,"to":4000,"Q":4.75,"sweep":0.12,"track":0.81,"env":{"octaves":2.8}},"chorus":{"mix":0.29},"kind":"tone","level":0.0007187126493479729,"peak":0.08652776710242718,"songOrigin":"library","songSourceId":"bass2Voice"}},
  lanes: {
    lead: { gain: -4.56, send: { delay: 0.28, reverb: 0.446 }, effects: [{ id: "chorus2", params: { width: 0.38 } }, { id: "autopanner", params: { rateDivision: 32, depth: 0.54 } }] },
    bass: { gain: -8.48, send: { delay: 0.003 }, noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"pedalLow","rate":1,"octaves":2,"limit":0,"rangeLimit":true,"rangeLo":36,"rangeHi":48,"repeat":true,"gate":80,"retrigger":"chord","latch":true}} },
    bass2: { gain: -6.6, effects: [{ id: "pingpong", params: { division: 0.25 } }, { id: "rhythmgate", params: { decay: 0.123, attack: 0.001, division: 0.25 } }] },
    lead2: { gain: -6.4, mute: true, send: { delay: 0.015, reverb: 0.309 } },
    snare: { gain: 2.112, send: { reverb: 0.65 } },
    hats: { gain: 2.592, pan: -0.301, send: { reverb: 0.225 } },
    ohats: { gain: 2.5, pan: 0.28, send: { reverb: 0.3 } },
    clap: { pan: 0.201, send: { reverb: 0.615 } },
    kick: { send: { reverb: 0.391 } },
    crash: { gain: -0.16, pan: 0.37, send: { delay: 0.332, reverb: 0.5 }, eq: { high: -5.3 } },
    sweeps: { gain: 1.536, send: { delay: 0.24, reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [
    {
      s: 0,
      off: ["bass","bass2","lead","lead2"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 1,
      off: ["bass","bass2","lead","lead2"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 0,
      off: ["bass2","lead","lead2"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 2,
      off: ["bass2","lead","lead2"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 3,
      off: ["lead"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 1,
      off: ["lead"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 0,
      off: ["lead"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 2,
      off: ["lead"],
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 0,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 1,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 2,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 4,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 8,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 6,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 5,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 7,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 5,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 6,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 7,
      transpose: {
        bass2: 12,
      },
    },
    {
      s: 9,
      transpose: {
        bass2: 12,
      },
    },
  ],
  sections: [
    {
      bass2: seq('. C2 . . C3 . . G2 . G2 . . G3 . . A2 | . A2 . . A3 . . F2 . F2 . . F3 . . F2'),
      lead2: chordSeq('. . . C4maj7 . . . C4maj7 . . . G3 . . . G3 | . . . A3min7 . . . A3min7 . . . F3maj7 . . . F3maj7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
    },
    {
      bass: seq('D2 . . D3 . . G2 . G2 . . G3 . . C2 . | C2 . . C3 . . A2 . A2 . . A3 . . A2 .'),
      bass2: seq('. D2 . . D3 . . G2 . G2 . . G3 . . C2 | . C2 . . C3 . . A2 . A2 . . A3 . . A2'),
      lead: seq('A4 . D5 F5 A4 . D5 F5 G4 . B4 D5 G4 . B4 D5 | C5 . E5 G5 C5 . E5 G5 A4 . C5 E5 A4 . C5 E5'),
      lead2: chordSeq('. . . D3min7 . . . D3min7 . . . G3 . . . G3 | . . . C4maj7 . . . C4maj7 . . . A3min7 . . . A3min7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
    },
    {
      bass: seq('A2 . . A3 . . F2 . F2 . . F3 . . G2 . | G2 . . G3 . . G2 . G2 . . G3 . . G2 .'),
      bass2: seq('. A2 . . A3 . . F2 . F2 . . F3 . . G2 | . G2 . . G3 . . G2 . G2 . . G3 . . G2'),
      lead: seq('A4 . C5 E5 A4 . C5 E5 A4 . C5 F5 A4 . C5 F5 | G4 . B4 D5 G4 . B4 D5 G4 . B4 D5 G4 . B4 D5'),
      lead2: chordSeq('. . . A3min7 . . . A3min7 . . . F3maj7 . . . F3maj7 | . . . G3 . . . G3 . . . G3 . . . G3'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
    },
    {
      bass2: seq('. C2 . . C3 . . G2 . G2 . . G3 . . A2 | . A2 . . A3 . . F2 . F2 . . F3 . . F2'),
      lead2: chordSeq('. . . C4maj7 . . . C4maj7 . . . G3 . . . G3 | . . . A3min7 . . . A3min7 . . . F3maj7 . . . F3maj7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . . F3 . . G2 . G2 . . G3 . . C2 . | C2 . . C3 . . C2 . C2 . . C3 . . C2 .'),
      bass2: seq('. F2 . . F3 . . G2 . G2 . . G3 . . C2 | . C2 . . C3 . . C2 . C2 . . C3 . . C2'),
      lead: seq('A4 . C5 F5 A4 . C5 F5 G4 . B4 D5 G4 . B4 D5 | C5 . E5 G5 C5 . E5 G5 C5 . E5 G5 C5 . E5 G5'),
      lead2: chordSeq('. . . F3maj7 . . . F3maj7 . . . G3 . . . G3 | . . . C4maj7 . . . C4maj7 . . . C4maj7 . . . C4maj7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | C1 . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass2: seq('. C2 . . C3 . . G2 . G2 . . G3 . . A2 | . A2 . . A3 . . F2 . F2 . . F3 . . F2'),
      lead: seq('A5 . G5 . A5 . E5 . D5 . A5 . . . . . | A5 . G5 . A5 . E5 . D5 . A5 . . . . .'),
      leadLen: [0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null],
      lead2: chordSeq('. . . C4maj7 . . . C4maj7 . . . G3 . . . G3 | . . . A3min7 . . . A3min7 . . . F3maj7 . . . F3maj7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
    },
    {
      bass: seq('D2 . . D3 . . G2 . G2 . . G3 . . C2 . | C2 . . C3 . . A2 . A2 . . A3 . . A2 .'),
      bass2: seq('. D2 . . D3 . . G2 . G2 . . G3 . . C2 | . C2 . . C3 . . A2 . A2 . . A3 . . A2'),
      lead: seq('A5 . G5 . A5 . E5 . D5 . A5 . . . . . | A5 . G5 . A5 . E5 . D5 . A5 . . . . .'),
      leadLen: [0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null],
      lead2: chordSeq('. . . D3min7 . . . D3min7 . . . G3 . . . G3 | . . . C4maj7 . . . C4maj7 . . . A3min7 . . . A3min7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
    },
    {
      bass: seq('A2 . . A3 . . F2 . F2 . . F3 . . G2 . | G2 . . G3 . . G2 . G2 . . G3 . . G2 .'),
      bass2: seq('. A2 . . A3 . . F2 . F2 . . F3 . . G2 | . G2 . . G3 . . G2 . G2 . . G3 . . G2'),
      lead: seq('A5 . G5 . A5 . E5 . D5 . A5 . . . . . | A5 . G5 . A5 . E5 . D5 . A5 . . . . .'),
      leadLen: [0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null],
      lead2: chordSeq('. . . A3min7 . . . A3min7 . . . F3maj7 . . . F3maj7 | . . . G3 . . . G3 . . . G3 . . . G3'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
    },
    {
      bass2: seq('. C2 . . C3 . . G2 . G2 . . G3 . . A2 | . A2 . . A3 . . F2 . F2 . . F3 . . F2'),
      lead: seq('A5 . G5 . A5 . E5 . D5 . A5 . . . . . | A5 . G5 . A5 . E5 . D5 . A5 . . . . .'),
      leadLen: [0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null],
      lead2: chordSeq('. . . C4maj7 . . . C4maj7 . . . G3 . . . G3 | . . . A3min7 . . . A3min7 . . . F3maj7 . . . F3maj7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . . F3 . . G2 . G2 . . G3 . . C2 . | C2 . . C3 . . C2 . C2 . . C3 . . C2 .'),
      bass2: seq('. F2 . . F3 . . G2 . G2 . . G3 . . C2 | . C2 . . C3 . . C2 . C2 . . C3 . . C2'),
      lead: seq('A5 . G5 . A5 . E5 . D5 . A5 . . . . . | A5 . G5 . A5 . E5 . D5 . A5 . . . . .'),
      leadLen: [0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,0.8,null,null,null,null,null],
      lead2: chordSeq('. . . F3maj7 . . . F3maj7 . . . G3 . . . G3 | . . . C4maj7 . . . C4maj7 . . . C4maj7 . . . C4maj7'),
      lead2Len: [null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5,null,null,null,1.5],
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | C1 . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
    },
  ],
  choke: {
    hats: "ohats",
  },
  loop: {
    startBar: 5,
    fromBar: 9,
    toBar: 40,
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
