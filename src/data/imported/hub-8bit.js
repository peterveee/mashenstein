// THE FOOD COURT 8-BIT — one song: what it plays, how it is arranged, how it sounds.
//
// THE FOOD COURT as the results screen plays it: every part on the 8-Bit Sound Set, every
// fader where tools/chip-results-levels.js measured the 8-bit part should sit against the
// one it replaces, no reverb. Mix it here: Save, and the game's copy (src/game/results-chip-mixes.js)
// follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.
// The music below is THE FOOD COURT's, copied as it stood (an alternate of hub).
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "hub-8bit";
export const title = "THE FOOD COURT 8-BIT";
export const slug = "hub-8bit";
export const group = "alternate";
export const alternateOf = "hub";

export const bank = {
  bpm: 90,
  musicTrim: 1.05,
  echoEverything: true,
  bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
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
  masterEffects: [{ id: "peq", params: { f1: 110, g1: 4, f2: 500, g2: 0, q2: 1, f5: 1000, g5: 0, q5: 1, f3: 3200, g3: -3, q3: 0.9, f4: 9000, g4: -0.5 } }, { id: "mbComp" }, { id: "l7", params: { threshold: -4.3, ceiling: -1.5 } }, { id: "gain", params: { gain: -7.1 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "crash3", from: "crash2", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }],
  labels: {"bass2":"Square Mono 2","kick":"Kick","snare":"Snare","clap":"Clap","hats":"HH","ohats":"Open Hat","crash2":"Crash","crash3":"Crash Echo"},
  voice: {"kickVoice":"sdsKick","snareVoice":"gameBoySnare","clapVoice":"snareEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine","crash2Voice":"crashEngine","bassVoice":"squareMono","bass2Voice":"toneSine","chordsVoice":"squareOrgan","leadVoice":"toneSquare","leadHarmVoice":"squareTone2","chords2Voice":"squareOrgan","crash3Voice":"crashEngine","lead2Voice":"bestSampleHoldVox","rimVoice":"vl1Sha","crashVoice":"crashEngine","tomVoice":"tomEngine"},
  voiceParams: {"leadHarmVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.132,"waveform":"triangle","attack":0.001,"release":0.002,"trim":0,"vibrato":{"depth":0.01,"rate":5.2},"mono":false,"portamento":0,"starter":false,"transpose":12,"drive":0.73,"chorus":{"mix":0.29},"drivePlace":"pre","kind":"tone","level":0.0642,"peak":0.7013,"songOrigin":"library","songSourceId":"leadHarmVoice"},"lead2Voice":{"label":"BEST S&H Vox","category":"FX","synth":"MRDR-3","dur":2.2,"note":"A synthetic mouth made from a pulse, a nasal bandpass and a held-random filter walk. The steps are quick enough to suggest syllables, but the onset and release leave space for it to sit as a transition or response line.","layer":{"osc1":{"type":"pulse","width":0.22,"ratio":1,"gain":0.82,"attack":0.008,"decay":0.55,"sustain":0.72,"release":0.22,"unison":2,"spread":14,"stereo":0.6},"osc2":{"type":"sawtooth","ratio":2,"gain":0.28,"detune":7,"attack":0.01,"decay":0.48,"sustain":0.5,"release":0.18},"osc3":{"type":"triangle","ratio":0.5,"gain":0.25,"attack":0.01,"decay":0.7,"sustain":0.62,"release":0.25},"lfo":{"type":"samplehold","rate":3.6,"depth":0.78,"target":"filter","delay":0.08,"sync":"tempo","division":"1/32"}},"global":{"filter":{"type":"bandpass","slope":-12,"freq":1050,"Q":2.2,"track":0.18,"env":{"octaves":1.6,"attack":0.025,"decay":0.58,"sustain":0.42,"release":0.22}},"vca":{"attack":0.012,"decay":0.62,"sustain":0.68,"release":0.28}},"drive":0.2323382709,"shape":"soft","tone":{"freq":7000},"portamento":0,"starter":false,"mode":"poly","kind":"tone","level":0.0164,"peak":0.2916,"songOrigin":"library","songSourceId":"lead2Voice"},"kickVoice":{"label":"Simmons · Kick","category":"Kick","homeLane":"kick","dur":2,"note":"The SDS-V bass module: triangle VCO bending 190 to 48, the noise pot low and the click pot up — which is `noise.sag` here, a spike that falls to a fifth of itself in four milliseconds and carries on as body.","osc":{"type":"triangle","from":190,"to":48,"sweep":0.07,"pitchCurve":"snap","attack":0.001,"decay":0.043,"curve":"exp","gain":1},"knock":0.35,"noise":{"type":"lowpass","freq":1400,"Q":0.7,"decay":0.02,"sag":0.2,"sagAt":0.004,"gain":0.3},"drive":0.1780406014,"starter":false,"kind":"drum","level":0.0142,"peak":0.6848,"songOrigin":"library","songSourceId":"kickVoice"},"snareVoice":{"label":"Game Boy Snare","category":"Snare","dur":0.5,"note":"Pink-noise crack with a square body dropping 2.3k to 80 — the handheld backbeat, chokeable against the other arcade drums.","osc":{"type":"triangle","from":2345,"to":80,"sweep":0.37,"decay":0.082,"gain":0.67},"noise":{"type":"bandpass","freq":5530,"Q":2.85,"decay":1.218,"gain":1.98,"color":"pink","sweep":0.08,"to":3940},"trim":1.9,"monoGroup":"1","starter":false,"mode":"mono","knock":0.61,"kind":"drum","level":0.0469,"peak":1.0089,"songOrigin":"user","songSourceId":"snareVoice"},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"sawtooth","attack":0.001,"release":0.054,"trim":0.8,"vibrato":{"depth":0.05,"rate":4.4,"delay":0.004},"mono":false,"portamento":0,"starter":false,"drive":0.2,"kind":"tone","level":0.0406,"peak":0.6673,"songOrigin":"library","songSourceId":"leadVoice"},"chords2Voice":{"label":"Square Organ","category":"Organ","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.463,"waveform":"sawtooth","attack":0.005,"release":0.021,"trim":0.8,"vibrato":{"depth":0,"rate":5},"mono":false,"portamento":0,"starter":false,"filter":{"type":"lowpass","slope":-12,"freq":1420,"Q":3.4,"env":{"octaves":2.9,"attack":0,"decay":0.12,"sustain":0,"release":0.015}},"chorus":{"mix":0.22},"kind":"tone","level":0.0543,"peak":0.8992,"songOrigin":"library","songSourceId":"chords2Voice"},"bassVoice":{"label":"Square Mono","category":"Bass","synth":"CRLS-1","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":2.282,"sustain":0.3,"release":1.205},"filter":{"type":"lowpass","Q":6.4,"rolloff":-12},"filterEnvelope":{"attack":0.001,"decay":0.555,"sustain":0.29,"release":1.044,"baseFrequency":30,"octaves":6.9,"style":"classic"}},"starter":false,"transpose":0,"mono":true,"vibrato":{"depth":0},"kind":"tone","level":0.1327,"peak":1.1171,"songOrigin":"user","songSourceId":"bassVoice"},"bass2Voice":{"label":"Sine Tone","category":"Keys","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator sine replacement for the engine voice.","fixedLength":0.063,"waveform":"triangle","attack":0.01,"release":0.15,"trim":0,"starter":false,"drive":0.85,"kind":"tone","level":0.0819,"peak":0.7,"songOrigin":"library","songSourceId":"bass2Voice"},"chordsVoice":{"label":"Square Organ","category":"Organ","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.463,"waveform":"square","attack":0.011,"release":0.089,"trim":0.8,"vibrato":{"depth":0.33,"rate":5},"mono":false,"portamento":0,"starter":false,"filter":{"type":"lowpass","slope":-12,"freq":3000,"Q":3.4,"env":{"octaves":2.9,"attack":0.014,"decay":0.12,"sustain":0.56,"release":0.015}},"chorus":{"mix":0},"kind":"tone","level":0.1003,"peak":0.6698,"songOrigin":"library","songSourceId":"chordsVoice"},"clapVoice":{"label":"= Arcade Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.0154,"peak":0.5414},"hatsVoice":{"label":"= Arcade Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.0266,"peak":0.8382},"ohatsVoice":{"label":"= Arcade Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.0566,"peak":0.9765},"crash2Voice":{"label":"= Arcade Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.0749,"peak":0.8242},"crash3Voice":{"label":"= Arcade Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.0749,"peak":0.8242},"rimVoice":{"label":"Toy Shaker","category":"Blip","homeLane":"rim","dur":0.5,"note":"The VL-1’s longer shhh: seeded white noise through a high-pass filter, with a clean one-hundred-sixty-millisecond decay.","noise":{"type":"highpass","freq":3000,"Q":0.7,"decay":0.16,"gain":1},"id":"vl1Sha","kind":"drum","factory":true,"level":0.035,"peak":0.8505},"crashVoice":{"label":"= Arcade Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.0749,"peak":0.8242},"tomVoice":{"label":"= Arcade Tom","category":"Tom","homeLane":"tom","dur":1,"note":"The game’s own tom: a triangle falling most of an octave onto the lane’s own note. Tuned by the lane, the way the engine tunes it.","osc":{"type":"triangle","from":234,"to":130,"sweep":0.08,"attack":0.004,"decay":0.4606,"curve":"exp","gain":1},"id":"tomEngine","kind":"drum","factory":true,"level":0.0364,"peak":0.6757}},
  fx: { delay: { level: 0.912, eq: { low: -4.4 } }, reverb: { level: 1.096 } },
  lanes: {
    kick: { gain: -6.8, send: { delay: 0.28 } },
    clap: { gain: 1.7, pan: 0.24, send: { delay: 0.28 } },
    bass: { gain: -12.2, pan: -0.27, send: { delay: 0.021 }, eq: { low: -3.3, high: 1.1 }, effects: [{ id: "distortion", bypass: true, params: { distortion: 0.22 } }, { id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }] },
    lead: { gain: -4.6, pan: 0.113, send: { delay: 0.125 }, eq: { low: -3.5, mid: -4.4, high: 1.5 } },
    leadHarm: { gain: -6.72, send: { delay: 0.208 } },
    chords: { gain: -9.4, send: { delay: 0.432 }, eq: { high: 3.1 }, effects: [{ id: "doubler", params: { delayMs: 11, depth: 0.11, dryPan: -0.72, wetPan: 0.52, wet: 0.33 } }] },
    keyGliss: { gain: 1.5, eq: { low: -1.8, high: 6 }, effects: [{ id: "peq", params: { f1: 120, g1: 0, f2: 500, g2: 0, q2: 1, f5: 1000, g5: 0, q5: 1, f3: 2000, g3: 0, q3: 1, f4: 12000, g4: 5 } }, { id: "pingpong", params: { wet: 0.36, feedback: 0.21 } }] },
    gliss: { gain: -3.1, send: { delay: 0.28 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 8, depth: 0.66, wet: 0.87 } }] },
    vox: { gain: -1.7, pan: -0.256, send: { delay: 0.057 } },
    shout: { gain: 0.4, pan: 0.25, send: { delay: 0.28 }, effects: [{ id: "pingpong", params: { division: 1 } }] },
    snare: { gain: 3.2, send: { delay: 0.187 } },
    hats: { gain: 5.48, pan: -0.13, send: { delay: 0.28 }, eq: { low: -12.5, mid: -9, high: -3.1 } },
    ohats: { gain: -1.2, pan: -0.251, send: { delay: 0.091 }, eq: { low: -6.3, mid: -6.2, high: 0.4 }, effects: [{ id: "filter", params: { frequency: 5210, Q: 5, type: "lowpass" } }] },
    crash2: { gain: -10.9, pan: -0.26, eq: { high: -4.3 } },
    bass2: { gain: -9.4, pan: 0.368, eq: { low: -5.1 } },
    chords2: { gain: -8.56, eq: { high: 3.1 }, effects: [{ id: "delay", params: { division: 0.75, feedback: 0, wet: 0.24 } }] },
    crash3: { gain: -11.3, eq: { low: -6.4 }, effects: [{ id: "chandelay", params: { tone: 4166.228, division: 1, mix: 1, pan: 0.22, feedback: 0.57 } }] },
    lead2: { gain: -11.8, effects: [{ id: "autopanner", params: { rateDivision: 0.5 } }] },
  },
};

export const arrangement = {
  order: [{"s":23,"bars":1},{"s":25,"bars":1,"from":1,"gain":{"keyGliss":-12}},{"s":24,"bars":1},{"s":15,"bars":1,"from":1,"gain":{"leadHarm":-8},"pan":{"leadHarm":-70}},{"s":29,"bars":1,"gain":{"leadHarm":-8},"pan":{"leadHarm":70}},{"s":26,"bars":1,"from":1},{"s":16,"bars":1},{"s":9,"bars":1,"from":1},{"s":12,"bars":1},{"s":17,"bars":1,"from":1},{"s":17,"bars":1},{"s":8,"bars":1,"from":1},18,18,{"s":13,"bars":1,"off":["crash3"]},{"s":19,"bars":1,"from":1},{"s":27,"bars":1},{"s":19,"bars":1,"from":1},{"s":20,"bars":1},{"s":28,"bars":1,"from":1},{"s":20,"bars":1},{"s":11,"bars":1,"from":1},{"s":10,"bars":1,"off":["chords","crash3"]},{"s":21,"bars":1,"from":1,"off":["chords"]},{"s":22,"bars":1,"off":["chords"]},{"s":14,"bars":1,"from":1,"off":["chords","crash3"]}],
  sections: [
    {
      base: 2,
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . C1 . . . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 1,
      bass: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . D2 . B2 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . D2 . B2 .'),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . C1 . C1 C1 . C1 .').map((v) => !!v),
      lead2: seq('. . . . . . . . . . . . . . . . | A2 . . . . . . . . . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      base: 6,
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      chords2: chordSeq('A3min7 . . . E3min7 . . . G3maj7 . . . D3 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash3: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 5,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 C1').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 C1').map((v) => !!v),
    },
    {
      base: 2,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . . . . . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash3: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 4,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash3: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 7,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[0,0,0],null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 C1 C1 C1 . C1').map((v) => !!v),
      crash3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . C1 . . . . . C1 . C1 . C1 .').map((v) => !!v),
      leadHarm: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463],null,null,null,[246.94165062806206],null,null,null],
      leadHarmLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[7.65625],null,null,null,[7.435606],null,null,null],
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
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 5,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 6,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      chords2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,[195.99771799087463,246.94165062806204,293.6647679174075,369.99442271163434],null,null,null,[0,0,0],null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 7,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      chords2: chordSeq('A3min7 . . . E3min7 . . . G3maj7 . . . D3 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
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
      hats: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C8 . . .'),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
    },
    {
      base: 1,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 C1').map((v) => !!v),
    },
    {
      base: 4,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 . . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 5,
      bass2: seq('. . . . . . . . . . . . . . . . | A2 . . . E2 . . . G2 . . . B2 . . .'),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 1,
      bass2: seq('A2 . . . E2 . . . G2 . . . D2 . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('A3 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarmLen: [8.011364,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  choke: {
    hats: "ohats",
  },
  loop: {
    fromBar: 9,
    toBar: 28,
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
