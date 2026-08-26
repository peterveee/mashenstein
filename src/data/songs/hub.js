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
  layers: [{ key: "crash2", from: "crash", independent: true }, { key: "crash3", from: "crash2", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "lead2", from: "lead", independent: true }],
  labels: {"bass2":"Square Mono 2","kick":"Kick","snare":"Snare","clap":"Clap","hats":"HH","ohats":"Open Hat","crash2":"Crash","crash3":"Crash Echo"},
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"hatSnapOpen","crash2Voice":"crashFinale","bassVoice":"toneSquare","bass2Voice":"squareMono","chordsVoice":"shopOrgan2","leadVoice":"toneSquare","leadHarmVoice":"squareTone2","chords2Voice":"shopOrgan2","crash3Voice":"crashFinale","lead2Voice":"bestSampleHoldVox"},
  voiceParams: {"kickVoice":{"label":"= Engine Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.305,"curve":"exp","gain":1},"knock":0.4,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"id":"kickEngine","kind":"drum","factory":true,"level":0.0344,"peak":0.7966},"snareVoice":{"label":"= Engine Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.0154,"peak":0.5414},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.0523,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":4720,"Q":1,"decay":0.668,"gain":1,"color":"blue"},"starter":false,"kind":"drum","level":0.07126435277983555,"peak":0.8978768525740196,"songOrigin":"library","songSourceId":"hatsVoice"},"crash2Voice":{"label":"= Finale Crash","category":"Crash","homeLane":"crash","dur":7,"note":"The finale’s crash: the same closing lowpass as the engine’s, two thirds the length, because the finale runs at 126 and asks for seven steps of it.","noise":{"type":"lowpass","freq":1945,"to":320,"sweep":0.8333,"Q":1.55,"attack":0.014,"decay":2.304,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"starter":false,"kind":"drum","level":0.034842412665916894,"peak":0.5053163693506781,"songOrigin":"library","songSourceId":"crash2Voice"},"bass2Voice":{"label":"Square Mono","category":"Bass","synth":"CRLS-1","dur":1.8,"note":"Saw through a lowpass that closes as the note decays — the classic synth bass.","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.695,"sustain":0.06,"release":2.366},"filter":{"type":"lowpass","Q":1.85,"rolloff":-24},"filterEnvelope":{"attack":0.001,"decay":0.34,"sustain":0.13,"release":0.3,"baseFrequency":1050,"octaves":2.4}},"starter":false,"transpose":-12,"mono":true,"fine":16,"trim":-1.9,"kind":"tone","level":0.04695835429260011,"peak":0.6757380065131527,"songOrigin":"user","songSourceId":"bassVoice"},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.002,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"kind":"tone","level":0.055705191727645424,"peak":0.6468,"songOrigin":"library","songSourceId":"leadVoice"},"leadHarmVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.132,"waveform":"square","attack":0.001,"release":0.002,"trim":0,"vibrato":{"depth":0.07,"rate":10.9},"mono":false,"portamento":0,"starter":false,"transpose":0,"drive":0.12,"chorus":{"mix":0.15},"kind":"tone","level":0.06338162672530669,"peak":0.732185518312908,"songOrigin":"library","songSourceId":"leadHarmVoice"},"chordsVoice":{"label":"Shop Organ 2","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":6.92,"note":"The shop theme’s own: bright, percussive, short and dry — comping rather than holding, so it sits under the lead instead of over it.","additive":{"bars":[0,0.24,0.58,0.78,0.48,0.53,0.3,0.62,0.73],"attack":0.018,"decay":0.707,"echo":false,"perc":{"ratio":6,"gain":2,"attack":0.002,"decay":0.072},"type":"sine","stretch":0,"sustain":0,"release":0.139},"starter":false,"trim":3,"fixedLength":1.103,"vibrato":{"depth":0.05},"chorus":{"mix":0.16},"kind":"tone","level":0.10255471274783895,"peak":2.145179927016518,"songOrigin":"library","songSourceId":"chordsVoice"},"bassVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.055714,"peak":0.6468},"chords2Voice":{"label":"Shop Organ 2","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":6.92,"note":"The shop theme’s own: bright, percussive, short and dry — comping rather than holding, so it sits under the lead instead of over it.","additive":{"bars":[0,0.24,0.58,0.78,0.48,0.53,0.3,0.62,0.73],"attack":0.001,"decay":0.896,"echo":false,"perc":{"ratio":6,"gain":2,"attack":0.002,"decay":0.072},"type":"sine","stretch":0,"sustain":0,"release":0.139},"starter":false,"trim":3,"fixedLength":1.103,"vibrato":{"depth":0.05},"chorus":{"mix":0.16},"kind":"tone","level":0.11318516897317495,"peak":2.3543063702586764,"songOrigin":"library","songSourceId":"chordsVoice"},"crash3Voice":{"label":"= Finale Crash","category":"Crash","homeLane":"crash","dur":7,"note":"The finale’s crash: the same closing lowpass as the engine’s, two thirds the length, because the finale runs at 126 and asks for seven steps of it.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":0.8333,"Q":0.7,"attack":0.005,"decay":1.0495,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashFinale","kind":"drum","factory":true,"level":0.06291,"peak":0.9676},"ohatsVoice":{"label":"= Snap Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The same hat held open: the sweep runs the other way over four tenths of a second, so the wash goes dull as it dies the way a real cymbal does.","noise":{"type":"highpass","freq":7195,"to":3510,"sweep":0.4,"Q":1.2,"decay":0.493,"gain":1,"hold":0.006,"color":"violet"},"drive":0,"starter":false,"trim":2.7,"kind":"drum","level":0.07096176764008852,"peak":0.9917616844177245,"songOrigin":"library","songSourceId":"ohatsVoice"},"lead2Voice":{"label":"BEST S&H Vox","category":"FX","synth":"MRDR-3","dur":2.2,"note":"A synthetic mouth made from a pulse, a nasal bandpass and a held-random filter walk. The steps are quick enough to suggest syllables, but the onset and release leave space for it to sit as a transition or response line.","layer":{"osc1":{"type":"pulse","width":0.22,"ratio":1,"gain":0.82,"attack":0.008,"decay":0.55,"sustain":0.72,"release":0.22,"unison":2,"spread":14,"stereo":0.6},"osc2":{"type":"sawtooth","ratio":2,"gain":0.28,"detune":7,"attack":0.01,"decay":0.48,"sustain":0.5,"release":0.18},"osc3":{"type":"triangle","ratio":0.5,"gain":0.25,"attack":0.01,"decay":0.7,"sustain":0.62,"release":0.25},"lfo":{"type":"samplehold","rate":3.6,"depth":0.78,"target":"filter","delay":0.08,"sync":"tempo","division":"1/32"}},"global":{"filter":{"type":"bandpass","slope":-12,"freq":1050,"Q":2.2,"track":0.18,"env":{"octaves":1.6,"attack":0.025,"decay":0.58,"sustain":0.42,"release":0.22}},"vca":{"attack":0.012,"decay":0.62,"sustain":0.68,"release":0.28}},"drive":0.3,"shape":"soft","tone":{"freq":7000},"portamento":0,"starter":false,"mode":"poly","kind":"tone","level":0.041276000148998696,"peak":0.6047999475936309,"songOrigin":"library","songSourceId":"lead2Voice"}},
  fx: { delay: { level: 1.148, eq: { low: -4.4 } }, reverb: { level: 1.096 } },
  lanes: {
    kick: { gain: -0.4, send: { delay: 0.28, reverb: 0.02 } },
    clap: { gain: 0.4, pan: 0.24, send: { delay: 0.28, reverb: 1.13 } },
    bass: { gain: -15.5, send: { delay: 0.559 }, eq: { low: -3.3, high: 1.1 }, effects: [{ id: "distortion", params: { distortion: 0.22 } }, { id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }] },
    lead: { gain: -4, send: { delay: 0.125, reverb: 0.044 }, eq: { low: -3.5, mid: -4.4, high: 1.5 } },
    leadHarm: { gain: -4, send: { delay: 0.126, reverb: 0.127 }, effects: [{ id: "widener" }] },
    chords: { gain: -5.6, send: { delay: 0.432, reverb: 0.109 }, eq: { high: 3.1 }, effects: [{ id: "doubler", params: { delayMs: 11, depth: 0.11, dryPan: -0.72, wetPan: 0.52, wet: 0.33 } }] },
    keyGliss: { gain: 1.5, send: { reverb: 0.764 }, eq: { low: -1.8, high: 6 }, effects: [{ id: "peq", params: { f1: 120, g1: 0, f2: 500, g2: 0, q2: 1, f5: 1000, g5: 0, q5: 1, f3: 2000, g3: 0, q3: 1, f4: 12000, g4: 5 } }, { id: "pingpong", params: { wet: 0.36, feedback: 0.21 } }] },
    gliss: { gain: -3.1, send: { delay: 0.28, reverb: 0.044 }, effects: [{ id: "autopanner", params: { rateSync: 1, rateDivision: 8, depth: 0.66, wet: 0.87 } }] },
    vox: { gain: 0.5, pan: -0.256, send: { delay: 0.057, reverb: 0.615 } },
    shout: { gain: 0.4, pan: 0.25, send: { delay: 0.28 }, effects: [{ id: "pingpong", params: { division: 1 } }] },
    snare: { gain: 0.7, send: { delay: 0.28, reverb: 0.395 } },
    hats: { gain: 2.976, pan: -0.13, send: { delay: 0.28, reverb: 0.006 }, eq: { low: -12.5, mid: -9, high: -3.1 } },
    ohats: { gain: 1.9, pan: -0.251, send: { delay: 0.28, reverb: 0.018 }, eq: { low: -6.3, mid: -6.2, high: 0.4 }, effects: [{ id: "filter", params: { frequency: 5210, Q: 5, type: "lowpass" } }] },
    crash2: { gain: -11.4, pan: -0.26, send: { reverb: 0.984 }, eq: { high: -4.3 } },
    bass2: { gain: -20.8 },
    chords2: { gain: -5.6, send: { reverb: 0.484 }, eq: { high: 3.1 }, effects: [{ id: "delay", params: { division: 0.75, feedback: 0, wet: 0.37 } }] },
    crash3: { gain: -9.7, send: { reverb: 0.984 }, eq: { low: -6.4 }, effects: [{ id: "chandelay", params: { tone: 4166.228, division: 1, mix: 1, pan: 0.22, feedback: 0.57 } }] },
    lead2: { gain: -13.5, effects: [{ id: "autopanner" }] },
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
