// GRAVITY GRID — POLARITY DRIVE
// A 32-bar orbit at 120 BPM: launch (D minor / relative F), inversion
// (G minor), weightless bridge (B-flat / E-flat), and a D-minor homecoming.
// The hook rises on launch and answers downward after inversion. The bridge
// sheds the four-on-the-floor pulse; the final dominant turns back into bar 1.
// V3: sustained orbital whistle, telemetry bells, airy sine/triangle pad and
// a half-time reactor pulse. The final eight bars recover the faster hook.
// Voices began in the Rhythm/Speed family and are saved independently
// below so future edits to those songs cannot silently change this one.
import { n, seq, chord } from '../../engine/notes.js';
export const id = 'gravity';
export const title = 'POLARITY DRIVE';
export const slug = 'gravity-grid';
export const group = 'cabinet';

const harmony = [
  'D3min7', 'A#2maj7', 'G2min7', 'A2' + '7',
  'F3maj7', 'C3maj', 'D3min7', 'A2' + '7',
  'G2min7', 'D#3maj7', 'C3min7', 'D3' + '7',
  'G2min7', 'D#3maj7', 'C3min7', 'A2' + '7',
  'A#2maj7', 'F3maj7', 'C3min7', 'F2' + '7',
  'D#3maj7', 'A#2maj7', 'G2min7', 'A2' + '7',
  'D3min7', 'A#2maj7', 'G2min7', 'A2' + '7',
  'F3maj7', 'G2min7', 'A2' + '7', 'A2' + '7',
];
// Close inversions keep common tones between changes. The bass owns the root;
// the pad omits sevenths and its sub oscillator so it stays clear of both bass
// and passing melody notes. Retrigger once per bar with room for the release.
const padVoicings = {
  D3min7: 'D4 F4 A4', 'A#2maj7': 'D4 F4 A#4',
  G2min7: 'D4 G4 A#4', A27: 'C#4 E4 A4',
  F3maj7: 'C4 F4 A4', C3maj: 'C4 E4 G4',
  'D#3maj7': 'D#4 G4 A#4', C3min7: 'D#4 G4 C5',
  D37: 'D4 F#4 A4', F27: 'C4 F4 A4',
};
// Four-bar melodic sentences: space between phrases is part of the hook.
const launch = [
  'D5 . . A4 . . F5 . E5 . D5 . . . A4 .',
  'F5 . . . D5 . C5 . A4 . . . . . . .',
  'G4 . . D5 . . A5 . G5 . F5 . D5 . . .',
  'E5 . . C#5 . . A4 . . . C#5 . E5 . . .',
];
const lift = [
  'A5 . . G5 . . E5 . F5 . . . C5 . . .',
  'E5 . G5 . . . D5 . C5 . . . . . G4 .',
  'A4 . D5 . F5 . A5 . E5 . D5 . . . C5 .',
  'C#5 . . E5 . . G5 . E5 . C#5 . A4 . . .',
];
const bridge = [
  'D5 . . . . . F5 . A5 . . . . . . .',
  'G5 . . . E5 . . . C5 . . . . . . .',
  'D#5 . . . . . G5 . D5 . . . C5 . . .',
  'A4 . . . C5 . . . D#5 . . . . . . .',
  'G5 . . . F5 . . . D5 . . . D#5 . . .',
  'D5 . . . A4 . . . F4 . . . . . . .',
  'A4 . . D5 . . F5 . G5 . . . D5 . . .',
  'E5 . . C#5 . . A4 . G4 . A4 . C#5 . E5 .',
];
const transpose = (line, semis) => seq(line, 16).map(v => v == null ? null : v * 2 ** (semis / 12));
const bars = harmony.map((name, bar) => {
  const tones = chord(name), root = tones[0] / 2;
  const floating = bar >= 16 && bar < 24;
  let lead;
  if (bar < 4) lead = transpose(launch[bar], 0);
  else if (bar < 8) lead = transpose(lift[bar - 4], 0);
  else if (bar < 12) lead = transpose(launch[bar - 8], 5);
  else if (bar < 15) lead = transpose(launch[bar - 12], 5);
  else if (bar === 15) lead = transpose(lift[3], 0);
  else if (floating) lead = transpose(bridge[bar - 16], 0);
  else lead = transpose((bar < 28 ? launch : lift)[bar % 4], 0);
  if (bar === 29) lead = transpose(launch[2], 0);
  if (bar === 30) lead = transpose(lift[3], 0);
  // The return adds a short pickup/answer rather than replaying a copied block.
  if (bar >= 24 && bar % 4 !== 3) { lead[14] = tones[1] * 4; lead[15] = tones[2] * 2; }
  if (bar === 31) lead = transpose('E5 . C#5 . A4 . . . G4 . A4 . C#5 . . .', 0);
  // Long radio-call notes over a half-time pulse; the final eight bars
  // bring back the quicker original answer as the ship comes home.
  if (bar < 24) {
    for (let step = 0; step < 16; step++) if (![0, 6, 10, 14].includes(step)) lead[step] = null;
    if (!lead[6]) lead[6] = tones[2] * 2;
    if (!lead[10]) lead[10] = tones[1] * 4;
  }
  const bass = Array(16).fill(null), lead2 = Array(16).fill(null), chords = Array(16).fill(null);
  for (const s of floating ? [0, 10] : [0, 6, 10, 14]) bass[s] = s === 6 || s === 14 ? root * 2 : root;
  const orbit = bar % 8 < 4 ? [0, 2, 1, 3] : [3, 1, 2, 0];
  for (const s of floating ? [2, 10, 14] : [2, 6, 10, 14]) lead2[s] = tones[(orbit[(s - 2) / 4] ?? 2) % 3] * 4;
  chords[0] = padVoicings[name].split(' ').map(n);
  const pulse = steps => Array.from({ length: 16 }, (_, s) => steps.includes(s));
  return {
    bass, lead, lead2, chords,
    leadLen: lead.map((v, s) => v ? (bar < 24 ? (s === 0 ? 5 : 3) : 1.8) : null),
    bassLen: bass.map(v => v ? (floating ? 3 : 1.5) : null),
    chordsLen: chords.map(v => v ? 14 : null),
    kick: pulse(floating ? [0] : bar % 4 === 3 ? [0, 6, 10, 15] : [0, 10]),
    snare: pulse(floating ? [] : bar % 4 === 3 ? [8, 15] : [8]),
    hats: pulse(floating ? [6, 14] : bar % 4 === 3 ? [2, 6, 10, 13, 14, 15] : [2, 6, 10, 14]),
    ohats: pulse(bar % 4 === 3 ? [14] : []),
  };
});
const sections = Array.from({ length: 16 }, (_, i) => Object.fromEntries(
  Object.keys(bars[0]).map(key => [key, [...bars[i * 2][key], ...bars[i * 2 + 1][key]]]),
));
export const bank = { bpm: 120, musicTrim: 0.87, ...sections[0], sections,
  order: sections.map((_, i) => i), echoLevel: 0.12 };

// THE DESK WRITES BELOW HERE
export const mix = {
  "master": -3,
  "layers": [
    {
      "key": "lead2",
      "from": "lead",
      "independent": true
    }
  ],
  "voice": {
    "kickVoice": "dsKickHard",
    "snareVoice": "ds808Snare",
    "hatsVoice": "hatEngine",
    "ohatsVoice": "ohatEngine",
    "bassVoice": "roundBass",
    "leadVoice": "toneSquare",
    "lead2Voice": "fmKeys",
    "chordsVoice": "bestPwmStrings"
  },
  "voiceParams": {
    "kickVoice": {
      "label": "DS Kick",
      "category": "Kick",
      "dur": 1,
      "note": "The drum-synth 808: a sine dropping an octave and a half into a long sub tail, with a filtered click on the front and a little drive to round it.",
      "osc": {
        "type": "triangle",
        "from": 165,
        "to": 48,
        "sweep": 0.07,
        "decay": 0.3,
        "curve": "exp",
        "gain": 1.18,
        "attack": 0.016
      },
      "noise": {
        "type": "lowpass",
        "freq": 3175,
        "Q": 0.7,
        "decay": 0.015,
        "gain": 0.25
      },
      "drive": 0.2,
      "starter": false,
      "knock": 0.3,
      "kind": "drum",
      "level": 0.06,
      "peak": 0.7,
      "songOrigin": "library",
      "songSourceId": "kickVoice"
    },
    "snareVoice": {
      "label": "=808 Snare",
      "category": "Snare",
      "homeLane": "snare",
      "dur": 1,
      "note": "A round 808-style snare with a low electronic shell under a broad, slightly darker noise body than the sharper 909 family.",
      "osc": {
        "type": "triangle",
        "from": 190,
        "to": 145,
        "sweep": 0.035,
        "decay": 0.13,
        "curve": "exp",
        "gain": 0.62
      },
      "noise": {
        "type": "bandpass",
        "freq": 1750,
        "Q": 0.7,
        "decay": 0.07,
        "gain": 1
      },
      "drive": 0.16,
      "id": "ds808Snare",
      "kind": "drum",
      "factory": true,
      "level": 0.014,
      "peak": 0.7
    },
    "hatsVoice": {
      "label": "= Engine Hat",
      "category": "Hats",
      "homeLane": "hats",
      "dur": 0.5,
      "note": "The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.",
      "noise": {
        "type": "highpass",
        "freq": 5200,
        "Q": 1,
        "decay": 0.025,
        "gain": 1
      },
      "id": "hatEngine",
      "kind": "drum",
      "factory": true,
      "level": 0.012,
      "peak": 0.8382
    },
    "ohatsVoice": {
      "label": "= Engine Open Hat",
      "category": "Hats",
      "homeLane": "ohats",
      "dur": 2,
      "note": "The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.",
      "noise": {
        "type": "highpass",
        "freq": 4200,
        "Q": 1,
        "decay": 0.4232,
        "gain": 1
      },
      "id": "ohatEngine",
      "kind": "drum",
      "factory": true,
      "level": 0.01,
      "peak": 0.9765
    },
    "bassVoice": {
      "label": "Reactor Pulse",
      "category": "Bass",
      "synth": "MonoSynth",
      "dur": 1.8,
      "note": "Saw through a lowpass that closes as the note decays — the classic synth bass.",
      "options": {
        "oscillator": {
          "type": "triangle"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.3,
          "sustain": 0.29,
          "release": 0.15
        },
        "filter": {
          "type": "lowpass",
          "Q": 1,
          "rolloff": -24
        },
        "filterEnvelope": {
          "attack": 0.001,
          "decay": 1.22,
          "sustain": 0.13,
          "release": 0.3,
          "baseFrequency": 110,
          "octaves": 2
        }
      },
      "starter": false,
      "id": "roundBass",
      "kind": "tone",
      "level": 0.09,
      "peak": 1.183,
      "user": true
    },
    "leadVoice": {
      "label": "Orbital Whistle",
      "category": "Lead",
      "synth": "KNDO-5",
      "dur": 1,
      "note": "A direct single-oscillator square-wave replacement for the engine voice.",
      "options": {
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0,
          "sustain": 1,
          "release": 0.01,
          "attackCurve": "exponential"
        }
      },
      "waveform": "sine",
      "attack": 0.03,
      "release": 0.22,
      "trim": 0.75,
      "vibrato": {
        "depth": 0.16,
        "rate": 5.2,
        "delay": 0.16
      },
      "mono": true,
      "portamento": 0.065,
      "starter": false,
      "chorus": {
        "mix": 0
      },
      "drive": 0,
      "drivePlace": "pre",
      "kind": "tone",
      "level": 0.105,
      "peak": 1.0661,
      "songOrigin": "library",
      "songSourceId": "leadVoice"
    },
    "lead2Voice": {
      "label": "Telemetry Bells",
      "category": "Keys",
      "synth": "RMND-2",
      "dur": 2.6,
      "note": "Struck keys, percussive enough to keep a stab from smearing into the next bar.",
      "options": {
        "harmonicity": 2,
        "modulationIndex": 3.5,
        "oscillator": {
          "type": "sine"
        },
        "modulation": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.002,
          "decay": 0.65,
          "sustain": 0,
          "release": 0.18
        },
        "modulationEnvelope": {
          "attack": 0.001,
          "decay": 0.3,
          "sustain": 0,
          "release": 0.1
        }
      },
      "starter": false,
      "vibrato": {
        "depth": 0.03
      },
      "kind": "tone",
      "level": 0.033,
      "peak": 0.21778041797154252,
      "songOrigin": "library",
      "songSourceId": "lead3Voice"
    },
    "chordsVoice": {
      "label": "Orbital Air",
      "category": "Orch",
      "synth": "MRDR-3",
      "dur": 8,
      "note": "The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates chosen not to line up — over a clean saw sub. The shimmer is the two widths passing through each other, which is why they must never share a rate.",
      "layer": {
        "osc1": {
          "type": "sine",
          "width": 0.5,
          "ratio": 1,
          "gain": 0.5,
          "attack": 0.32,
          "decay": 2,
          "sustain": 0.85,
          "release": 0.22,
          "attackCurve": "lin",
          "unison": 2,
          "spread": 4,
          "stereo": 0.85,
          "detune": 0
        },
        "osc2": {
          "type": "triangle",
          "width": 0.46,
          "ratio": 1,
          "detune": -3,
          "gain": 0.42,
          "attack": 0.32,
          "decay": 2.2,
          "sustain": 0.82,
          "release": 0.22,
          "attackCurve": "lin",
          "unison": 2,
          "spread": 4,
          "stereo": 0.7
        },
        "osc3": {
          "type": "triangle",
          "ratio": 0.5,
          "gain": 0,
          "attack": 0.32,
          "decay": 2.4,
          "sustain": 0.9,
          "release": 0.22,
          "attackCurve": "lin",
          "spread": 4,
          "detune": 0
        }
      },
      "global": {
        "filter": {
          "type": "lowpass",
          "slope": -12,
          "freq": 1400,
          "Q": 0.4,
          "track": 0.3,
          "env": {
            "octaves": 0.2,
            "attack": 0.8,
            "decay": 2.4,
            "sustain": 0.6,
            "release": 0.22
          }
        },
        "vca": {
          "attack": 0.32,
          "decay": 2.4,
          "sustain": 0.9,
          "release": 0.22,
          "attackCurve": "lin"
        }
      },
      "vibrato": {
        "depth": 0.07,
        "rate": 4.2,
        "delay": 1.4,
        "spread": 0
      },
      "starter": false,
      "chorus": {
        "mix": 0.09,
        "width": 0.73
      },
      "kind": "tone",
      "level": 0.039,
      "peak": 0.670031805693217,
      "songOrigin": "library",
      "songSourceId": "lead4Voice"
    }
  },
  "lanes": {
    "bass": {
      "gain": 1,
      "pan": 0
    },
    "lead": {
      "gain": 1,
      "pan": -0.08,
      "send": {
        "reverb": 0.25,
        "delay": 0.22
      }
    },
    "lead2": {
      "gain": 1,
      "pan": 0.24,
      "send": {
        "reverb": 0.28,
        "delay": 0.3
      }
    },
    "chords": {
      "gain": 1,
      "pan": 0,
      "send": {
        "reverb": 0.2,
        "delay": 0
      }
    }
  }
};
export const arrangement = {"order":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"loop":{"startBar":1,"fromBar":1,"toBar":32},"choke":{"hats":"ohats"}};
export const variants = null;
