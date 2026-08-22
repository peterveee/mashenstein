// THE FOOD COURT ALT 2 — one song: what it plays, how it is arranged, how it sounds.
//
// An alternate of THE FOOD COURT (hub), saved from the Song Mixer.
// The music below is THE FOOD COURT's, copied as it stood. Nothing in the game
// plays this file — "Save over THE FOOD COURT" in the desk is what decides that.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "the-food-court-alt-2";
export const title = "THE FOOD COURT ALT 2";
export const slug = "the-food-court-alt-2";
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
  master: -9.4,
  masterEffects: [{ id: "mbCompN", bypass: true }, { id: "filter", params: { type: "highpass", frequency: 258.122, Q: 5.3 } }, { id: "widener", params: { width: 0, wet: 1 } }],
  layers: [{ key: "crash2", from: "crash", independent: true }],
  voice: {"bassVoice":"arcadeBass","leadVoice":"arcadeLead","leadHarmVoice":"arcadeLead","twinkleVoice":"arcadeLead","chordsVoice":"arcadeChord","organChordsVoice":"arcadeChord","organSwoopVoice":"arcadeLead","electroFxVoice":"arcadeFx","voxVoice":"arcadeLead","shoutVoice":"arcadeLead","glissVoice":"arcadeLead","organGlissVoice":"arcadeLead","keyGlissVoice":"arcadeLead","sweepsVoice":"arcadeFx","kickVoice":"ds808Kick","clapVoice":"arcadeClap","rimVoice":"arcadeRim","hatsVoice":"dsCr78Hat","ohatsVoice":"arcadeOpenHat","tomVoice":"arcadeTom","crashVoice":"arcadeCrash","crash2Voice":"arcadeCrash"},
  voiceParams: {"bassVoice":{"label":"Game Boy Bass","category":"Bass","synth":"Synth","mode":"mono","dur":0.5,"trim":-2.2,"transpose":12,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.37,"sustain":0,"release":0.15}},"starter":false,"kind":"tone","level":0,"peak":1.0133141240784944,"songOrigin":"user","songSourceId":"bassVoice"},"leadVoice":{"label":"Game Boy Main Lead","category":"Lead","synth":"Synth","mode":"mono","dur":0.5,"trim":-2.3,"transpose":12,"options":{"oscillator":{"type":"square"},"envelope":{"attack":0.007,"decay":0.16,"sustain":0,"release":0.024}},"starter":false,"kind":"tone","level":0,"peak":1.018031407136859,"songOrigin":"user","songSourceId":"leadVoice"},"leadHarmVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"twinkleVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"chordsVoice":{"label":"Game Boy Chord Blip","category":"Keys","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.045,"sustain":0,"release":0.024}}},"organChordsVoice":{"label":"Game Boy Chord Blip","category":"Keys","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.045,"sustain":0,"release":0.024}}},"organSwoopVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"electroFxVoice":{"label":"Game Boy FX Blip","category":"FX","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.038,"sustain":0,"release":0.024}}},"voxVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"shoutVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"glissVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"organGlissVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"keyGlissVoice":{"label":"Game Boy Lead","category":"Lead","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}}},"sweepsVoice":{"label":"Game Boy FX Blip","category":"FX","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.038,"sustain":0,"release":0.024}}},"snareVoice":{"label":"Game Boy Noise Snare","category":"Snare","dur":0.5,"trim":3,"monoGroup":"1","noise":{"type":"bandpass","freq":4700,"Q":0.7,"decay":0.33,"gain":1.57,"color":"pink"},"body":{"type":"triangle","from":3458,"to":120,"decay":0.25,"gain":0.37},"starter":false,"kind":"noise","level":0,"peak":1.8813339757382224,"songOrigin":"user","songSourceId":"snareVoice"},"clapVoice":{"label":"Game Boy Clap","category":"Clap","synth":"Synth","mode":"mono","dur":0.5,"trim":0.4,"options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.006,"decay":0.04,"sustain":0,"release":0.024}},"monoGroup":"1","starter":false,"kind":"tone","level":0,"peak":1,"songOrigin":"user","songSourceId":"clapVoice"},"rimVoice":{"label":"Game Boy Rim","category":"Perc","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.006,"decay":0.03,"sustain":0,"release":0.024}},"monoGroup":"1"},"ohatsVoice":{"label":"Game Boy Open Hat","category":"Hats","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.006,"decay":0.04,"sustain":0,"release":0.024}},"monoGroup":"1"},"tomVoice":{"label":"Game Boy Tom","category":"Tom","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.006,"decay":0.06,"sustain":0,"release":0.024}},"monoGroup":"1"},"crashVoice":{"label":"Game Boy Crash","category":"Crash","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}},"monoGroup":"1"},"crash2Voice":{"label":"Game Boy Crash","category":"Crash","kind":"tone","synth":"Synth","mode":"mono","dur":0.5,"trim":0,"options":{"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.006,"decay":0.065,"sustain":0,"release":0.024}},"monoGroup":"1"},"hatsVoice":{"label":"=CR78 Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"A dry, dusty CR78-style hat with a lower cutoff and a short envelope that keeps the machine pulse present without sounding glossy.","noise":{"type":"highpass","freq":8270,"Q":0.7,"decay":0.15,"gain":0.8},"starter":false,"kind":"drum","level":0.025580201395509875,"peak":0.6419119478225811,"songOrigin":"library","songSourceId":"hatsVoice"}},
  fx: { reverb: { level: 0 } },
  lanes: {
    kick: { gain: -0.4, send: { delay: 0.28 } },
    clap: { gain: 1.6, pan: 0.24, send: { delay: 0.28 }, effects: [{ id: "delay" }] },
    lead: { gain: -4.2, pan: 0.413, send: { delay: 0.125 }, eq: { low: -3.5, mid: -4.4, high: 1.5 } },
    leadHarm: { gain: 1.5, send: { delay: 0.104 }, effects: [{ id: "widener", bypass: true }] },
    chords: { gain: -5.6, send: { delay: 0.094 }, eq: { high: 3.1 }, effects: [{ id: "doubler", bypass: true, params: { delayMs: 11, depth: 0.11, dryPan: -0.72, wetPan: 0.52, wet: 0.33 } }, { id: "reverb", bypass: true, params: { wet: 0 } }] },
    keyGliss: { gain: -12.7, send: { delay: 0.03 }, eq: { low: -1.8, high: 3.3 }, effects: [{ id: "bitcrusher", bypass: true, params: { bits: 4, downsample: 12, wet: 0.55 } }, { id: "autopanner", bypass: true, params: { rateSync: 1, depth: 0.71, rateDivision: 0.5 } }, { id: "pingpong", bypass: true, params: { wet: 0.34, feedback: 0.21 } }] },
    gliss: { gain: -5.8, send: { delay: 0.28 }, effects: [{ id: "autopanner", bypass: true, params: { rateSync: 1, rateDivision: 8, depth: 0.66, wet: 0.87 } }] },
    vox: { gain: -2.9, pan: -0.256, send: { delay: 0.057 } },
    shout: { pan: 0.25, send: { delay: 0.28 }, effects: [{ id: "pingpong", bypass: true, params: { division: 1 } }] },
    hats: { gain: -0.8, pan: -0.13, send: { delay: 0.28 }, eq: { high: 4.9 } },
    ohats: { gain: -7, pan: -0.179, send: { delay: 0.112 } },
    crash2: { gain: -18 },
    bass: { gain: -1, pan: -0.314, eq: { high: -3.5 } },
    snare: { gain: -5.4 },
  },
};

export const arrangement = {
  order: [15,15,16,{"s":16,"bars":1},{"s":24,"bars":1,"from":1},{"s":27,"bars":1},{"s":17,"bars":1,"from":1},{"s":17,"bars":1},{"s":23,"bars":1,"from":1},18,18,{"s":28,"bars":1},{"s":19,"bars":1,"from":1},19,20,{"s":20,"bars":1},{"s":26,"bars":1,"from":1},{"s":25,"bars":1},{"s":21,"bars":1,"from":1},{"s":22,"bars":1},{"s":29,"bars":1,"from":1}],
  sections: [
    {
      base: 2,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      base: 1,
      bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . | A2 . . . E2 . . . G2 . . . D2 . B2 .'),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . C1 .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 6,
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 5,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 C1').map((v) => !!v),
    },
    {
      base: 2,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 4,
      crash2: seq('. . C1 . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 7,
      crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 1,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 2,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 3,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 4,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 5,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 6,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 7,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 8,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 9,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,123.47082531403103,null],
    },
    {
      base: 10,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 11,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 12,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 13,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
    {
      base: 14,
      bass: [110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,73.41619197935188,null,146.83238395870376,null,110,null,220,null,82.4068892282175,null,164.813778456435,null,97.99885899543733,null,195.99771799087466,null,123.47082531403103,null,246.94165062806206,null],
    },
  ],
  loop: {
    fromBar: 9,
    toBar: 28,
  },
};

export const variants = null;
