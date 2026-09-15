// FROST FORTRESS — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "frost";
export const title = "FROST FORTRESS";
export const slug = "frost-panic";
export const group = "cabinet";

export const bank = {
  bpm: 100,
  musicTrim: 1.74,
  bass: seq('D2 . . . A2 . . . B1 . . . F2 . . . | G1 . . . D2 . . . G2 . . . A2 . . .'),
  lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'),
  leadType: "triangle",
  kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
  hats: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
  snare: seq('. . . . . . . . C1 . . . . . . . | . . . . . . . . C1 . . . . . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -0.7,
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }],
  layers: [{ key: "bass2", from: "bass", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead5", independent: true }],
  voice: {"kickVoice":"fatKick","snareVoice":"dsCrackSnare2","clapVoice":"bigRoomClap","hatsVoice":"simple808StyleHat","ohatsVoice":"ds909OpenHat","bassVoice":"tpBassy","leadVoice":"breathPad","bass2Voice":"tpBassy","lead2Voice":"tngrPolarDrift","lead3Voice":"bestPwmStrings","lead4Voice":"tngrWireHarp","lead5Voice":"jmjrSmallVoice","lead6Voice":"jmjrSmallVoice"},
  voiceParams: {"hatsVoice":{"label":"Simple 808 Style Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"Metal with a little Blue noise","noise":{"type":"bandpass","freq":3680,"Q":0.7,"decay":0.701,"gain":1.44,"color":"blue"},"metal":{"freq":435,"spread":1,"count":6,"hp":6100,"Q":0.9,"slope":-24,"decay":0.316,"sag":0.32,"gain":0.94,"wave":"square"},"humanize":{"gain":0.04},"starter":false,"kind":"drum","level":0.05428358942720679,"peak":1.2118000728598228,"songOrigin":"user","songSourceId":"hatsVoice"},"bassVoice":{"label":"Bassy","category":"Bass","synth":"CRLS-1","dur":1.8,"note":"Built from explicit partials rather than a waveform name, with a resonant lowpass over it. Fat and slightly hollow.","origin":"Tonejs/Presets MonoSynth/Bassy","options":{"portamento":0.08,"oscillator":{"partials":[2,1,3,2,0.4],"type":"fatsawtooth"},"filter":{"Q":1,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.04,"decay":0.496,"sustain":0.46,"release":0.336},"filterEnvelope":{"attack":0.01,"decay":0.64,"sustain":0.71,"release":1.949,"baseFrequency":160,"octaves":3.4}},"starter":false,"kind":"tone","level":0.0372075769379477,"peak":0.47693085668371044,"songOrigin":"library","songSourceId":"bassVoice"},"bass2Voice":{"label":"Bassy","category":"Bass","synth":"CRLS-1","dur":1.8,"note":"Built from explicit partials rather than a waveform name, with a resonant lowpass over it. Fat and slightly hollow.","origin":"Tonejs/Presets MonoSynth/Bassy","options":{"portamento":0.08,"oscillator":{"partials":[2,1,3,2,0.4]},"filter":{"Q":1.35,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.001,"decay":0.015,"sustain":0.4,"release":0.052},"filterEnvelope":{"attack":0.009,"decay":0.372,"sustain":0.6,"release":1.5,"baseFrequency":1570,"octaves":10}},"starter":false,"kind":"tone","level":0.0432540031048376,"peak":0.389044110778971,"songOrigin":"library","songSourceId":"bassVoice"},"lead2Voice":{"label":"Polar Drift","category":"Pad","synth":"TNGR-2","dur":8,"note":"Wide cold sparse partials with independent slow movement.","tngr2":{"oscA":{"table":"crystal","position":0.35,"envAmount":0.42,"lfoAmount":0.12,"level":0.68,"unison":3,"spread":18,"stereo":0.9},"oscB":{"table":"alloy","position":0.7,"envAmount":-0.3,"lfoAmount":-0.1,"level":0.25,"unison":2,"spread":15,"stereo":0.9,"interval":-12},"amp":{"attack":0.03,"decay":2.5,"sustain":0.7,"release":1.387},"positionEnv":{"attack":2.8,"decay":3.5,"sustain":0.45},"filter":{"type":"lowpass","cutoff":5600,"resonance":1.92},"lfo1":{"shape":"triangle","rate":0.07,"amount":0.22},"master":{"gain":0.46}},"id":"tngrPolarDrift","kind":"tone","factory":true,"level":0.053682,"peak":0.3928},"leadVoice":{"label":"Breath","category":"Orch","synth":"MRDR-3","dur":4.5,"note":"Two slightly detuned layers swelling together. Big and slow.","layer":{"osc1":{"type":"triangle","ratio":1,"detune":0,"gain":1,"attack":0.001,"decay":0.4,"sustain":0.8,"release":1.4},"osc2":{"type":"sawtooth","ratio":1,"detune":17.2,"gain":1,"attack":0.001,"decay":0.4,"sustain":0.7,"release":1.6}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":200,"Q":1,"track":0,"env":{"octaves":3,"attack":0.01,"decay":0.001,"sustain":1,"release":0.5}}},"vibrato":{"depth":0.04,"rate":2.5},"starter":false,"kind":"tone","level":0.14862797470291686,"peak":0.7774180195619461,"songOrigin":"library","songSourceId":"leadVoice"},"lead4Voice":{"label":"Wire Harp","category":"Pluck","synth":"TNGR-2","dur":1.4,"note":"A metallic reed onset decaying toward a simpler waveform.","tngr2":{"oscA":{"table":"alloy","position":0.72,"envAmount":-0.55,"level":0.76},"oscB":{"table":"reedWire","position":0.6,"level":0.18,"interval":12},"amp":{"attack":0.012,"decay":0.75,"sustain":0.33,"release":0.22},"positionEnv":{"attack":0.012,"decay":0.62,"sustain":0.04},"filter":{"type":"lowpass","cutoff":7300,"resonance":1.92},"master":{"gain":0.55},"filterEnv":{"attack":0.009}},"starter":false,"vibrato":{"depth":0.08,"delay":0.208},"drive":0.06,"kind":"tone","level":0.011153,"peak":0.1735,"songOrigin":"library","songSourceId":"lead4Voice"},"snareVoice":{"label":"DS Crack Snare 2","category":"Snare","dur":1,"note":"Tight and driven: a short square knock, highpassed air, everything over in a tenth of a second. The backbeat for fast songs.","osc":{"type":"square","from":255,"to":440,"sweep":0.025,"decay":0.05,"curve":"exp","gain":0.55},"noise":{"type":"highpass","freq":2900,"Q":0.8,"decay":0.3,"gain":1},"drive":0.35,"id":"dsCrackSnare2","kind":"drum","factory":true,"level":0.101559,"peak":0.7},"clapVoice":{"label":"Big Room Clap","category":"Clap","dur":1,"note":"Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants space in the arrangement.","noise":{"type":"bandpass","freq":1500,"Q":0.9,"decay":0.355,"gain":0.88},"taps":[0,0.014,0.028,0.048],"tapFalloff":0.82,"tapDetune":0.94,"tapTone":0.97,"starter":false,"trim":3,"id":"bigRoomClap","kind":"drum","user":true,"level":0.018317,"peak":0.354},"lead3Voice":{"label":"BEST PWM Strings","category":"Orch","synth":"MRDR-3","dur":8,"note":"The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates chosen not to line up — over a clean saw sub. The shimmer is the two widths passing through each other, which is why they must never share a rate.","layer":{"osc1":{"type":"pulse","width":0.5,"ratio":1,"gain":0.5,"attack":0.136667,"decay":2,"sustain":0.85,"release":1.2,"attackCurve":"lin","unison":2,"spread":9,"stereo":0.85,"pwm":{"type":"sine","rate":0.28,"depth":0.62,"delay":0}},"osc2":{"type":"pulse","width":0.46,"ratio":1,"detune":-7,"gain":0.42,"attack":0.164,"decay":2.2,"sustain":0.82,"release":1.3,"attackCurve":"lin","unison":2,"spread":13,"stereo":0.7,"pwm":{"type":"sine","rate":0.37,"depth":0.58,"delay":0}},"osc3":{"type":"sawtooth","ratio":0.5,"gain":0.2,"attack":0.123,"decay":2.4,"sustain":0.9,"release":1.2,"attackCurve":"lin"}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":2400,"Q":0.55,"track":0.3,"env":{"octaves":1.4,"attack":0.8,"decay":2.4,"sustain":0.6,"release":1}},"vca":{"attack":0.150333,"decay":2.4,"sustain":0.9,"release":1.5,"attackCurve":"lin"}},"vibrato":{"depth":0.07,"rate":4.2,"delay":1.4},"id":"bestPwmStrings","kind":"tone","factory":true,"level":0.132846,"peak":0.7017},"lead5Voice":{"label":"Small Voice","category":"Lead","synth":"JMJR-4","dur":1.5,"note":"A smaller, higher tract on laa, two of them.","jmjr4":{"voice":"small","line":"laa","unison":2,"spread":20,"tilt":2,"amp":{"attack":0.05,"decay":0.2,"sustain":1,"release":0.35}},"vibrato":{"depth":0.21,"rate":5,"delay":0.15},"id":"jmjrSmallVoice","kind":"tone","factory":true,"level":0.017325,"peak":0.1521},"lead6Voice":{"label":"Small Voice","category":"Lead","synth":"JMJR-4","dur":1.5,"note":"A smaller, higher tract on laa, two of them.","jmjr4":{"voice":"small","line":"laa","unison":2,"spread":20,"tilt":2,"amp":{"attack":0.05,"decay":0.2,"sustain":1,"release":0.35}},"vibrato":{"depth":0.21,"rate":5,"delay":0.15},"id":"jmjrSmallVoice","kind":"tone","factory":true,"level":0.017325,"peak":0.1521},"kickVoice":{"label":"Fat Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"triangle","from":165,"to":48,"sweep":0.05,"attack":0,"decay":1.237,"curve":"exp","gain":1},"knock":0.66,"starter":false,"drive":0.18,"tune":0,"mode":"poly","shape":"fold","bypassed":{"noise":{"type":"highpass","freq":9195,"Q":1,"decay":0.005,"gain":0.31}},"metal":{"wave":"sine","freq":800,"spread":1,"count":6,"hp":3000,"Q":0.7,"attack":0.001,"decay":0.2,"gain":0.23},"kind":"drum","level":0.07462715855078177,"peak":0.6974362105644105,"songOrigin":"user","songSourceId":"kickVoice"},"ohatsVoice":{"label":"=909 Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The open partner to =909 Hat: the same bright attack opening into a controlled metallic wash instead of a long cymbal tail.","noise":{"type":"highpass","freq":7600,"to":5200,"sweep":0.35,"Q":1.2,"decay":0.38,"gain":1},"drive":0.2,"id":"ds909OpenHat","kind":"drum","factory":true,"level":0.080241,"peak":0.7}},
  fx: { delay: { level: 0.638 } },
  lanes: {
    lead: { gain: -2.1, send: { delay: 0.005, reverb: 0.327 }, eq: { high: 5 } },
    kick: { gain: 2.5, send: { reverb: 0.076 }, eq: { low: 4.2 } },
    snare: { gain: 4.608, send: { reverb: 1.497 }, eq: { high: 5 } },
    hats: { gain: 1.536, pan: -0.326, eq: { low: -9, mid: -5.3, high: 3.6 } },
    bass: { gain: 1.6, eq: { low: 1.5 } },
    bass2: { gain: -6.6 },
    lead2: { gain: -9.6, send: { reverb: 0.789 }, effects: [{ id: "pingpong" }] },
    clap: { send: { delay: 0.317, reverb: 0.102 } },
    lead4: { gain: -10.3, pan: 0.332, send: { reverb: 0.395 }, eq: { low: 1.9 }, effects: [{ id: "compressor" }, { id: "chandelay" }, { id: "phaser" }] },
    lead5: { gain: -12.4, pan: -0.394, send: { delay: 0.1, reverb: 0.057 }, eq: { high: 3.3 } },
    lead6: { gain: -15.3, pan: 0.469, send: { delay: 0.1, reverb: 0.057 }, eq: { high: 3.3 } },
    lead3: { gain: -3.5 },
    ohats: { gain: 1.2, pan: -0.269, send: { delay: 0.392 }, eq: { high: 8.4 } },
  },
};

export const arrangement = {
  order: [
    {
      s: 3,
      bars: 1,
      off: ["bass2","lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 4,
      bars: 1,
      from: 1,
      off: ["bass2","lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 3,
      bars: 1,
      off: ["lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 4,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      off: ["lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 6,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      off: ["lead","lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 13,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      inlineFx: {
        lead5: [
          {
            id: "ambience",
            params: {
              space: 0.7,
              damping: 0.94,
              wet: 0.38,
            },
          },
        ],
        lead6: [
          {
            id: "ambience",
            params: {
              space: 0.7,
              damping: 0.94,
              wet: 0.38,
            },
          },
        ],
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      off: ["lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 6,
      bars: 1,
      from: 1,
      off: ["lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      off: ["lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 6,
      bars: 1,
      from: 1,
      off: ["lead2"],
      offset: {
        lead6: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      offset: {
        lead6: 4,
      },
    },
    {
      s: 6,
      bars: 1,
      from: 1,
      offset: {
        lead6: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      offset: {
        lead6: 4,
      },
    },
    {
      s: 6,
      bars: 1,
      from: 1,
      offset: {
        lead6: 4,
      },
    },
    {
      s: 7,
      bars: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 2,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 2,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 8,
      bars: 1,
      off: ["lead2"],
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 9,
      bars: 1,
      from: 1,
      off: ["lead2"],
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 8,
      bars: 1,
      off: ["lead2"],
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 9,
      bars: 1,
      from: 1,
      off: ["lead2"],
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 8,
      bars: 1,
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 9,
      bars: 1,
      from: 1,
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 8,
      bars: 1,
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 9,
      bars: 1,
      from: 1,
      transpose: {
        lead5: -12,
        lead6: -12,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 10,
      bars: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead5: -8,
        lead6: -8,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 11,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead5: -8,
        lead6: -8,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 12,
      bars: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead5: -8,
        lead6: -8,
      },
      offset: {
        lead6: 4,
      },
    },
    {
      s: 11,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass2: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead5: -8,
        lead6: -8,
      },
      offset: {
        lead6: 4,
      },
    },
  ],
  sections: [
    {

    },
    {
      base: 0,
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [[92.4986056779086],null,[92.4986056779086],null,null,null,[92.4986056779086],null,[92.4986056779086],null,null,null,[103.82617439498628],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[1],null,[2],null,null,null,[1],null,[2],null,null,null,[3],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G1 . . . D2 . . . G2 . . . A2 .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null],
      lead2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3.5495389999999993,3.754083999999999,2.7892409999999987],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[77.78174593052023],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[9],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: [[73.41619197935188],null,null,null,null,null,null,null,[61.7354126570155],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3Len: [[7.901101],null,null,null,null,null,null,null,[7.974077],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G1 . . . D2 . . . G2 . . . A2 .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null],
      lead2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3.5495389999999993,3.754083999999999,2.7892409999999987],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[48.999429497718666],null,null,null,null,null,null,null,[61.7354126570155],null,null,null,null,null,null,null],
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[7.938033],null,null,null,null,null,null,null,[8.044212],null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G1 . . . D2 . . . G2 . . . A2 .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null],
      lead2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3.5495389999999993,3.754083999999999,2.7892409999999987],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [[92.4986056779086],null,[92.4986056779086],null,null,null,[92.4986056779086],null,[92.4986056779086],null,null,null,[82.4068892282175],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[1],null,[2],null,null,null,[1],null,[2],null,null,null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | . . . . . . . . . . . . . . . .'),
      lead6: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | . . . . . . . . . . . . . . . .'),
    },
    {
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G1 . . . D2 . . . G2 . . . A2 .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null],
      lead2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3.5495389999999993,3.754083999999999,2.7892409999999987],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . . . . . . . . . | D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'),
      lead6: seq('. . . . . . . . . . . . . . . . | D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [[92.4986056779086],null,[92.4986056779086],null,null,null,[92.4986056779086],null,[92.4986056779086],null,null,null,[82.4068892282175],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[1],null,[2],null,null,null,[1],null,[2],null,null,null,[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | . . . . . . . . . . . . . . . .'),
    },
    {
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G1 . . . D2 . . . G2 . . . A2 .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null],
      lead2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3.5495389999999993,3.754083999999999,2.7892409999999987],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[77.78174593052023],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[9],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . . . . . . . . . | D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      kick: seq('C1 . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('. . D2 . . . A2 . . . B1 . . . F2 . | . . . . . . . . . . . . . . . .'),
      bass2Len: [null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: [[174.61411571650194,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [[3.7315349999999974,3.865057,3.778231999999999],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [[92.4986056779086],null,[92.4986056779086],null,null,null,[92.4986056779086],null,[92.4986056779086],null,null,null,[103.82617439498628],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[1],null,[2],null,null,null,[1],null,[2],null,null,null,[3],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | . . . . . . . . . . . . . . . .'),
    },
    {
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null],
      bass2: seq('. . . . . . . . . . . . . . . . | . . G1 . . . D2 . . . G2 . . . A2 .'),
      bass2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null,null,null,1.60902,null],
      lead2: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[3.5495389999999993,3.754083999999999,2.7892409999999987],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.890447],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[587.3295358348151],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.890447],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
  ],
  loop: {
    fromBar: 13,
    toBar: 32,
  },
};

export const variants = {
  select: [
    {
      when: "always",
      loop: { fromBar: 1, toBar: 2 },
      treatment: [{ id: "tremolo", params: { rateSync: 1, rateDivision: 1, depth: 0.72 } }],
      patch: {
        lanes: {
          kick: { mute: true },
          snare: { mute: true },
        },
      },
      exit: { quantize: "bar", crossfadeBars: 0, loopRelease: "atTransition" },
    },
  ],
};

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
