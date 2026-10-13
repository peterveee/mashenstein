// OFFICE PREVIEW 4 — NEW JACK BOARDROOM — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT preview, 1989 new jack swing (108, swing 58): 808 kick and crisp snare, swung 16th
// hats, FM pop bass, brass-stab chords, orchestra hits, a reedy synth on the hook, a robot saying
// SYNERGY and MEETING ADJOURNED. 12 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-preview-new-jack";
export const title = "OFFICE PREVIEW 4 — NEW JACK BOARDROOM";
export const slug = "office-preview-new-jack";
export const group = "imported";

export const bank = {
  bpm: 108,
  musicTrim: 1,
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null],
      bass: seq('G1 . . G1 . . B2 . . C2 . . A2 . D2 . | E1 . . E1 . . C3 . . D2 . . D2 . G1 .'),
      bassLen: [1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null,1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null],
      kick: seq('C1 . . C1 . . . . . . C1 . . C1 . . | C1 . . C1 . . . . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C4 . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,6,null,null,null,null,null],
    },
    {
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null],
      bass: seq('G1 . . G1 . . B2 . . C2 . . A2 . D2 . | E1 . . E1 . . C3 . . D2 . . D2 . G1 .'),
      bassLen: [1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null,1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null],
      kick: seq('C1 . . C1 . . . . . . C1 . . C1 . . | C1 . . C1 . . . . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
      leadLen: [1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null],
      clap: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      chords: [null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,null,null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null],
      bass: seq('C2 . . C2 . . C3 . . A1 . . A2 . D2 . | B1 . . B1 . . G2 . . C2 . . A2 . D2 .'),
      bassLen: [1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null,1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null],
      kick: seq('C1 . . C1 . . . . . . C1 . . C1 . . | C1 . . C1 . . . . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead: seq('C5 . E5 G5 . . E5 . A5 . C6 . B5 . A5 . | B4 . D5 G5 . . D5 . C5 . E5 . D5 . . .'),
      leadLen: [1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,3.2,null,null,null],
    },
    {
      chords: [null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null],
      bass: seq('E1 . . E1 . . E2 . . E1 . . B1 . E1 . | C2 . . C2 . . C3 . . C2 . . G2 . C2 .'),
      bassLen: [1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null,1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null],
      kick: seq('C1 . . C1 . . . . . . C1 . . C1 . . | C1 . . C1 . . . . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead: seq('E5 . G5 B5 . . G5 . A5 . G5 . F#5 . E5 . | C5 . E5 G5 . . E5 . G5 . E5 . D5 . C5 .'),
      leadLen: [1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null],
      clap: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      chords: [null,null,[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,null,null,[329.6275569128699,391.99543598174927,440,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440],null,null,null,null,null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,[293.6647679174076,369.9944227116344,440,523.2511306011972],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null],
      bass: seq('A1 . . A1 . . A2 . . D2 . . A2 . D2 . | D2 . . D2 . . D3 . . D2 . . A2 . D2 .'),
      bassLen: [1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null,1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null],
      kick: seq('C1 . . C1 . . . . . . C1 . . C1 . . | C1 . . C1 . . . . . . C1 . . C1 . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . C4 . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,6,null,null,null,null,null],
      lead: seq('A4 . C5 E5 . . C5 . D5 . E5 . F#5 . G5 . | A5 . F#5 D5 . . C5 . A4 . . . D5 . . .'),
      leadLen: [1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,0.8,2.4000000000000004,null,null,1.6,null,3.2,null,null,null,3.2,null,null,null],
    },
    {
      chords: [null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[261.6255653005986,329.6275569128699,391.99543598174927,493.8833012561241],null,null,null,null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,[293.6647679174076,391.99543598174927,493.8833012561241],null,null,null,null,null],
      chordsLen: [null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null,null,null,1,null,null,null,null,1,null,null,1,null,null,null,null,null],
      bass: seq('G1 . . G1 . . B2 . . C2 . . A2 . D2 . | G1 . . G1 . . G2 . . G1 . . D2 . G1 .'),
      bassLen: [1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null,1,null,null,0.5,null,null,0.5,null,null,1,null,null,0.5,null,0.5,null],
      kick: seq('C1 . . C1 . . . . . . C1 . . C1 . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . . . . . . . . . . . . . . .'),
      leadLen: [1.6,null,0.8,2.4000000000000004,null,null,1.6,null,1.6,null,1.6,null,1.6,null,1.6,null,4,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap: seq('C1 . . . . . C1 . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | . . C4 . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,14,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 150, highFrequency: 2200, "low.threshold": -26, "low.ratio": 3.5, "low.attack": 0.05, "low.release": 0.2, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3, "mid.attack": 0.02, "mid.release": 0.09, "mid.knee": 12, "high.threshold": -24, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }, { id: "gain", params: { gain: -0.7 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }],
  labels: {"lead":"REED LEAD","lead2":"ROBOT: SYNERGY","lead3":"ROBOT: MEETING ADJOURNED","chords":"BRASS STABS","bass":"FM POP","clap":"ORCH HIT"},
  voice: {"leadVoice":"tngrNeonReed","chordsVoice":"bestPwmBrass","bassVoice":"rmndDxPop","kickVoice":"tr808Kick","snareVoice":"snareCrisp","hatsVoice":"tr808ClosedHat","ohatsVoice":"tr808OpenHat","clapVoice":"mrdrOrchHit","lead2Voice":"jmjrCabinetVoice","lead3Voice":"jmjrCabinetVoice"},
  voiceParams: {"lead2Voice":{"label":"Robot: SYNERGY","category":"FX","synth":"JMJR-4","dur":2,"note":"Song-local: the jmjrCabinetVoice preset saying \"synergy\".","jmjr4":{"mode":"speak","voice":"robot","phrase":"synergy","bits":6,"rate":9,"ending":"fall","perKey":"phrase","pitchFollows":"fixed","speed":0.9,"pitchHz":90,"range":0.6,"phraseIr":{"source":{"phrase":"synergy","voice":"robot","speed":0.9,"pitchHz":90,"range":0.6,"step":0,"ending":"fall","tract":1,"press":0.5,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":33579,"total_seconds":0.76144,"seed":7,"formants":{"t":[0,0.11111,0.13611,0.26611,0.32611,0.33389,0.39389,0.47167,0.49167,0.54278,0.62278,0.74144],"f1":[200,200,420,420,320,320,490,490,200,200,300,300],"f2":[1800,1800,1900,1900,1250,1250,1350,1350,2000,2000,2200,2200],"f3":[2600,2600,2600,2600,2200,2200,1690,1690,2600,2600,2900,2900]},"voicing":{"t":[0,0,0.11111,0.12311,0.27611,0.30311,0.35389,0.38089,0.47667,0.49167,0.60278,0.61278,0.62478,0.74644,0.76144],"v":[0,0,0,1,1,0.22,0.22,1,1,0,0,0,1,1,0]},"aspiration":{"t":[0,0,0.11111,0.13111,0.27111,0.31111,0.34889,0.38889,0.47167,0.49167,0.54278,0.54578,0.61278,0.63278,0.74144,0.76144],"v":[0,0,0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0]},"voicebar":{"t":[0,0.49167,0.49567,0.54278,0.54578,0.76144],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.25111,0.29611,0.36389,0.40889,0.76144],"v":[250,250,1550,1550,250,250],"active":true},"pitch":[[0,90],[0.08,90],[0.085,90.35747],[0.11,92.68968],[0.115,93.12468],[0.18,98.81684],[0.185,98.96516],[0.32,89.92803],[0.325,87.97148],[0.6,85.43042],[0.605,85.26066],[0.76,75.76401],[0.765,75.73993]],"extras":[{"start":0,"samples":4900,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.2,"voiced":false},{"start":23936,"samples":2646,"spec":[[3000,2,1]],"shape":["ad",0.006,0.06],"ratio":0.117,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07935,"asp_gain":1.30349,"bar_gain":0.32028,"extra_gains":[0.05888,0.07639],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":33579,"total_seconds":0.76144,"seed":7,"formants":{"t":[0,0.11111,0.13611,0.26611,0.32611,0.33389,0.39389,0.47167,0.49167,0.54278,0.62278,0.74144],"f1":[200,200,420,420,320,320,490,490,200,200,300,300],"f2":[1800,1800,1900,1900,1250,1250,1350,1350,2000,2000,2200,2200],"f3":[2600,2600,2600,2600,2200,2200,1690,1690,2600,2600,2900,2900]},"voicing":{"t":[0,0,0.11111,0.12311,0.27611,0.30311,0.35389,0.38089,0.47667,0.49167,0.60278,0.61278,0.62478,0.74644,0.76144],"v":[0,0,0,1,1,0.22,0.22,1,1,0,0,0,1,1,0]},"aspiration":{"t":[0,0,0.11111,0.13111,0.27111,0.31111,0.34889,0.38889,0.47167,0.49167,0.54278,0.54578,0.61278,0.63278,0.74144,0.76144],"v":[0,0,0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0]},"voicebar":{"t":[0,0.49167,0.49567,0.54278,0.54578,0.76144],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.25111,0.29611,0.36389,0.40889,0.76144],"v":[250,250,1550,1550,250,250],"active":true},"pitch":[[0,90],[0.08,90],[0.085,90.35747],[0.11,92.68968],[0.115,93.12468],[0.18,98.81684],[0.185,98.96516],[0.32,89.92803],[0.325,87.97148],[0.6,85.43042],[0.605,85.26066],[0.76,75.76401],[0.765,75.73993]],"extras":[{"start":0,"samples":4900,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.2,"voiced":false},{"start":23936,"samples":2646,"spec":[[3000,2,1]],"shape":["ad",0.006,0.06],"ratio":0.117,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07935,"asp_gain":1.30349,"bar_gain":0.32028,"extra_gains":[0.05888,0.07639],"derived":"browser tables"}}],"transcript":["synergy: S IH1 N ER0 JH IY0"],"unknown":[]}},"id":"jmjrCabinetVoice","kind":"tone","factory":true,"level":0.033054,"peak":0.2785},"lead3Voice":{"label":"Robot: MEETING ADJOURNED","category":"FX","synth":"JMJR-4","dur":2,"note":"Song-local: the jmjrCabinetVoice preset saying \"meeting adjourned\".","jmjr4":{"mode":"speak","voice":"robot","phrase":"meeting adjourned","bits":6,"rate":9,"ending":"fall","perKey":"phrase","pitchFollows":"fixed","speed":0.85,"pitchHz":84,"range":0.5,"phraseIr":{"source":{"phrase":"meeting adjourned","voice":"robot","speed":0.85,"pitchHz":84,"range":0.5,"step":0,"ending":"fall","tract":1,"press":0.5,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":56977,"total_seconds":1.292,"seed":7,"formants":{"t":[0.02,0.04529,0.10735,0.25294,0.27294,0.34706,0.38706,0.46206,0.52706,0.55118,0.64647,0.66647,0.68647,0.74412,0.82412,1.06818,1.13318,1.18024,1.20024,1.28],"f1":[320,320,300,300,200,200,420,420,280,280,500,500,200,200,490,490,320,320,200,200],"f2":[1150,1150,2200,2200,1800,1800,1900,1900,1300,1300,1400,1400,2000,2000,1350,1350,1250,1250,1800,1800],"f3":[2050,2050,2900,2900,2600,2600,2600,2600,2500,2500,2500,2500,2600,2600,1690,1690,2200,2200,2600,2600]},"voicing":{"t":[0,0.012,0.06735,0.09435,0.25794,0.27294,0.36706,0.41706,0.42906,0.47206,0.49906,0.56618,0.59882,0.62847,0.67147,0.68647,0.80412,0.81412,0.82612,1.07818,1.10518,1.18524,1.20024,1.292,1.292],"v":[0,0.22,0.22,1,1,0,0,0,1,1,0.22,0.22,0.55,1,1,0,0,0,1,1,0.22,0.22,0,0,0]},"aspiration":{"t":[0,0.02,0.06235,0.10235,0.25294,0.27294,0.34706,0.35006,0.41706,0.43706,0.46706,0.50706,0.56118,0.58118,0.61647,0.63647,0.66647,0.68647,0.74412,0.74712,0.81412,0.83412,1.07318,1.11318,1.18024,1.20024,1.28,1.283,1.292,1.292],"v":[0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.68647,0.69047,0.74412,0.74712,1.20024,1.20424,1.28,1.283,1.292],"v":[0,0,0.3,0.3,0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.005,0.07735,0.12235,0.44706,0.49206,0.57618,0.58618,1.05318,1.09818,1.19524,1.20524,1.292],"v":[250,750,750,250,250,3000,3000,250,250,1550,1550,250,250],"active":true},"pitch":[[0,84],[0.05,84],[0.055,84.18154],[0.08,85.91558],[0.085,86.2536],[0.155,90.95659],[0.16,91.1353],[0.3,84.53119],[0.305,82.93805],[0.77,80.76325],[0.775,80.77551],[0.91,85.70361],[0.915,85.81643],[0.92,85.78081],[1.09,74.58819],[1.095,74.44001],[1.295,74.44001]],"extras":[{"start":15305,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.143,"voiced":false},{"start":32815,"samples":2646,"spec":[[3000,2,1]],"shape":["ad",0.006,0.06],"ratio":0.117,"voiced":false},{"start":56448,"samples":529,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.04875,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07732,"asp_gain":1.66132,"bar_gain":0.31206,"extra_gains":[0.05794,0.07443,0.01704],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":28991,"total_seconds":0.65741,"seed":7,"formants":{"t":[0.02,0.04529,0.10735,0.25294,0.27294,0.34706,0.38706,0.51006,0.57506,0.63741],"f1":[320,320,300,300,200,200,420,420,280,280],"f2":[1150,1150,2200,2200,1800,1800,1900,1900,1300,1300],"f3":[2050,2050,2900,2900,2600,2600,2600,2600,2500,2500]},"voicing":{"t":[0,0.012,0.06735,0.09435,0.25794,0.27294,0.36706,0.41706,0.42906,0.52006,0.54706,0.64241,0.65741],"v":[0,0.22,0.22,1,1,0,0,0,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0.02,0.06235,0.10235,0.25294,0.27294,0.34706,0.35006,0.41706,0.43706,0.51506,0.55506,0.63741,0.65741],"v":[0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,0.65741],"v":[0,0]},"nasal_zero":{"t":[0,0.005,0.07735,0.12235,0.49506,0.54006,0.65241,0.65741],"v":[250,750,750,250,250,3000,3000,250],"active":true},"pitch":[[0,84],[0.05,84],[0.055,84.18154],[0.08,85.91558],[0.085,86.23752],[0.155,90.49227],[0.16,90.63814],[0.3,83.24495],[0.305,81.64728],[0.365,81.02461],[0.37,80.8502],[0.535,72.70782],[0.66,72.70779]],"extras":[{"start":15305,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.143,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07684,"asp_gain":1.95232,"bar_gain":0.31013,"extra_gains":[0.05758],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":29790,"total_seconds":0.67553,"seed":7,"formants":{"t":[0.02,0.05,0.07,0.12765,0.20765,0.45171,0.51671,0.56376,0.58376,0.66353],"f1":[500,500,200,200,490,490,320,320,200,200],"f2":[1400,1400,2000,2000,1350,1350,1250,1250,1800,1800],"f3":[2500,2500,2600,2600,1690,1690,2200,2200,2600,2600]},"voicing":{"t":[0,0.012,0.055,0.07,0.18765,0.19765,0.20965,0.46171,0.48871,0.56876,0.58376,0.67553,0.67553],"v":[0,1,1,0,0,0,1,1,0.22,0.22,0,0,0]},"aspiration":{"t":[0,0.02,0.05,0.07,0.12765,0.13065,0.19765,0.21765,0.45671,0.49671,0.56376,0.58376,0.66353,0.66653,0.67553,0.67553],"v":[0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.07,0.074,0.12765,0.13065,0.58376,0.58776,0.66353,0.66653,0.67553],"v":[0,0,0.3,0.3,0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.43671,0.48171,0.57876,0.58876,0.67553],"v":[250,250,1550,1550,250,250],"active":true},"pitch":[[0,84],[0.155,82.43709],[0.16,82.50258],[0.295,87.95227],[0.3,88.0212],[0.305,87.87557],[0.475,74.85632],[0.48,74.78659],[0.68,74.78659]],"extras":[{"start":5629,"samples":2646,"spec":[[3000,2,1]],"shape":["ad",0.006,0.06],"ratio":0.117,"voiced":false},{"start":29261,"samples":529,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.04875,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07796,"asp_gain":1.56719,"bar_gain":0.31465,"extra_gains":[0.07504,0.01718],"derived":"browser tables"}}],"transcript":["meeting: M IY1 T IH0 NG","adjourned: AH0 JH ER1 N D"],"unknown":[]}},"id":"jmjrCabinetVoice","kind":"tone","factory":true,"level":0.033054,"peak":0.2785}},
  fx: { delay: { feedback: 0.3, tone: 3000 }, reverb: { decay: 1.8, preDelay: 0.02 } },
  lanes: {
    lead: { gain: -11, send: { delay: 0.15, reverb: 0.25 } },
    lead2: { gain: 3, send: { reverb: 0.2 } },
    lead3: { gain: 3, send: { reverb: 0.3 } },
    chords: { gain: -11.5, pan: 0.15 },
    bass: { gain: -6 },
    kick: { gain: -7.3 },
    snare: { gain: 3, send: { reverb: 0.2 } },
    hats: { gain: -11, pan: 0.2 },
    ohats: { gain: -14, pan: -0.2 },
    clap: { gain: -5, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5],
  swing: 58,
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
