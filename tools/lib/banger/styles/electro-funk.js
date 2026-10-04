// BOOGIE (id `electro-funk`) — 5 Oct 2026. Shown as Boogie so it never reads as Electro.
//
// Peter picked it from the pop sketches (work/local/_pop-sketches.mjs, WAVs in
// work/auditions/pop-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 108 and swung: an 808 boogie
// beat with a cowbell, a slap synth bass popping octaves, a clav comping sixteenths (Chords =
// Piano Stabs), horn stabs answering in the hook's rests (the counter-melody), the hook on a
// talkbox. Song-shaped: a Pop Song in the Funky mood, with no riser, roll, impact, pump or
// stutter — every one still a switch.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const ELECTRO_FUNK = Object.freeze({
  id: 'electro-funk',
  label: 'Boogie',
  note: '108 · 808 boogie, slap bass, clav, talkbox',
  title: '108 BPM and swung: an 808 boogie beat with a cowbell, a slap synth bass, a clav comping sixteenths, horn stabs in the gaps, the hook on a talkbox. Starts as a Pop Song in the Funky mood',
  bpm: 108,
  tempoRange: [100, 116],
  swing: 55,
  defaults: {
    mood: 'funky',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { rolls: false, impact: false, shaker: false, tambourine: false, congas: false, cowbell: true, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: true },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i7', 'IV9', 'VII9', 'v7'],
    major: ['ii7', 'V9', 'Imaj7', 'vi7'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The clav in the middle, the talkbox's answers above it, the slap bass from E1.
  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    // The boogie kick, two bars: the second pushes into the next downbeat.
    kick: ['x.....x...x..x..', 'x.....x.x.....x.'],
    clap: '....x.......x...',
    ohats: '..............x.',
    hats16: 'x.xxx.xxx.xxx.xx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '............x.x.', tom: '........x.x.....' },
      { snare: '..........x..x.x', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      cowbell: '..x.....x.x...x.',
    },
  },

  rhythms: {
    // The slap line: the thumb on the root, the pop on the octave, a seventh on the way.
    offbeat: 'R:1 . . R:1 O:1 . R:1 . . 7:1 . R:1 . O:1 5:1 .',
    rolling: 'R:1 O:1 . R:1 . O:1 R:1 . R:1 O:1 . R:1 . O:1 5:1 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The clav: short chops around the beat, never on the one.
    pianoStabs: '. . x:1 . . x:1 . x:1 . . x:1 . . x:1 . x:1',
    arp: '0 . 1 2 . 1 3 . 2 . 1 2 . 1 3 .',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/pop-styles/electro-funk.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    clap: { gain: 1, send: { reverb: 0.35 } },
    snare: { gain: -3, send: { reverb: 0.3 } },
    hats: { gain: -3, pan: -0.2 },
    ohats: { gain: -8, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -6, pan: 0.25, send: { reverb: 0.3 } },
    cowbell: { gain: -12, pan: 0.3 },
    bass: { gain: -3 },
    sub: { gain: -16 },
    hook: { gain: -4.5, pan: 0, send: { delay: 0.2, reverb: 0.3 } },
    megaSaw: { gain: -9, pan: -0.1, send: { reverb: 0.3 } },
    // The clav, through an auto-wah.
    piano: { gain: -8.5, pan: -0.3, effects: [{ id: 'autowah', params: { wet: 0.5 } }] },
    // The horn stabs.
    counter: { gain: -6, pan: 0.2, send: { reverb: 0.3 } },
    pad: { gain: -10, eq: { low: -4 }, send: { reverb: 0.4 } },
    choir: { gain: -10, send: { reverb: 0.5 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    piano: 'CLAV', counter: 'HORNS', megaSaw: 'LEAD 8VA', cowbell: 'PERC Cowbell',
  },
});
