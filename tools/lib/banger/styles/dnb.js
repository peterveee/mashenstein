// DRUM & BASS — the ninth recipe. 3 Oct 2026.
//
// Liquid-leaning drum & bass, written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 174, and every bar feels
// like two: the two-step beat (the kick on the one and the "and" of three, the snare on
// two and four) with a ghost kick and a ghost snare on the second bar, shuffling sixteenth
// hats, a reese bass holding two notes a bar over a sine sub, held pads instead of pumping
// supersaws, a pluck doubling the hook, a glass bell an octave over it. The riff's own
// drums are replaced by default: a four-on-the-floor riff would undo the two-step. Data
// only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

const SEVENTHS = { colour: { '': 'maj7', m: 'm9' } };

export const DNB = Object.freeze({
  id: 'dnb',
  label: 'Drum & Bass',
  note: '174 · two-step breaks, reese bass, held pads',
  title: '174 BPM: the two-step beat with ghost notes, shuffling hats, a reese bass under held pads, a pluck doubling the hook. Moody by default, the riff\'s own drums replaced',
  bpm: 174,
  tempoRange: [166, 178],
  defaults: {
    mood: 'moody',
    drums: { source: 'replace', shaker: false, ride: true },
    parts: { bass: 'reese', chords: 'pad', octaveDouble: false },
    fx: { pump: false },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'VImaj9', 'iv9', 'v7'],
    major: ['IVmaj9', 'iii7', 'vi9', 'Vsus4'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // Big-room's moods, with sevenths and ninths wherever they were plain triads.
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? SEVENTHS : {}),
  }])),

  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'E5', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    // The two-step: the kick on the one and the "and" of three, a ghost kick before the
    // second bar's backbeat; the snare on two and four, a ghost on the second bar's "a".
    kick: ['x.........x.....', 'x.........x..x..'],
    clap: ['....x.......x...', '....x.......x..x'],
    ohats: ['..............x.', '......x.........'],
    // Shuffling sixteenths: the beat's own skip, not a straight line.
    hats16: ['x.xxx.x.x.xxx.xx', 'x.xxx.x.x.xxxxx.'],
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '..........x.x.xx', tom: '........x.......' },
      { snare: '........x..x.xxx', tom: '..........x.....' },
      { snare: '............xxxx', tom: '........x.x.....' },
    ],
    halfKick: 'x...............',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: 'x.xxx.x.x.xxx.xx',
      tambourine: '....x.......x...',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    // Off-Beat here is the two-step bass: under the kicks, held over.
    offbeat: 'R:6 . . . . . . . . . R:6 . . . . .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:8 . . . . . . . R:8 . . . . . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . . . . . x:2 . . . . . . . x:2 .',
    arp: '0 1 2 3 4 3 2 1 0 2 1 3 2 4 3 2',
  },

  master: {
    master: 0,
    masterEffects: BIG_ROOM.master.masterEffects,
    fx: { reverb: { decay: 3.4 } },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: -1 } },
    // The backbeat snare is the loudest thing in the kit.
    clap: { gain: 2, eq: { high: 2 }, send: { reverb: 0.25 } },
    snare: { gain: 1, eq: { high: 2 }, send: { reverb: 0.3 } },
    hats: { gain: -6, pan: 0.2 },
    ohats: { gain: -10, pan: -0.15 },
    ride: { gain: -14, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -6, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1800, Q: 0.9 } }] },
    sub: { gain: -7 },
    square: { gain: -3, pan: 0.05, send: { delay: 0.2, reverb: 0.35 } },
    bell: { gain: -8, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    pad: { gain: -5, send: { reverb: 0.6 } },
    choir: { gain: -8, send: { reverb: 0.65 } },
    arp: { gain: -12, pan: -0.25, send: { delay: 0.25, reverb: 0.3 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE Two-Step', snare: 'SNARE Roll', bass: 'BASS Reese', square: 'HOOK PLUCK', bell: 'HOOK 8VA',
    pad: 'PAD', saws: 'CHORDS',
  },
});
