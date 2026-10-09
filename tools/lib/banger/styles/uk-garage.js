// UK GARAGE — 9 Oct 2026 (docs/LAB_STYLES_PLAN.md).
//
// The 2-step, written from the general idea of the genre and the garage-2step sketch Peter heard
// (work/local/_rave-sketches.mjs), not checked against the records — Peter's ear wins over
// anything here. 132, swung hard: the kick skips beat three and the gaps are the point — the
// organ bass replies in them, short and bouncing; snare and clap on two and four, shuffled hats,
// a shaker. The organ stabs are CHORD MEMORY (`chordMemory`), one minor-seventh shape moved onto
// every root, and a chopped "oh" answers the hook. The Club form (a Pop Song until 9 Oct 2026: Peter wanted fewer).
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const UK_GARAGE = Object.freeze({
  id: 'uk-garage',
  label: 'UK Garage',
  note: '132 · swung 2-step, organ bass, organ stabs',
  title: '132 BPM with a heavy swing: the 2-step kick leaving its gaps, the organ bass bouncing in them, snare and clap on two and four, shuffled hats and a shaker, minor-seventh organ stabs moved as one shape, a chopped "oh" answering the hook. Starts on the Club form in the Moody mood',
  // FLAVOURS (9 Oct 2026; UK_GARAGE_FLAVOURS below): the mood picks one, the voltage now and then surprises.
  flavours: [
    { id: 'twostep', label: '2-Step', note: 'The kick skipping beat three, the organ bass in its gaps' },
    { id: 'speed', label: 'Speed Garage', note: 'The kick on every beat, off-beat open hats and the wobble bass' },
  ],
  flavourByMood: { dark: 'speed', hypnotic: 'speed', boss: 'speed', mystery: 'speed' },
  bpm: 132,
  tempoRange: [128, 136],
  // The bass line is the style's signature (9 Oct 2026, Peter): a mood never swaps it for the one it
  // suggests (options.js moodBass), and later drops never lift it. A flavour still changes it where it
  // means to, and the Lab's voltage rolls still try the style's own few alternatives.
  bassFixed: true,
  swing: 60,
  // The organ stab: one shape for every chord.
  chordMemory: 'm7',
  defaults: {
    mood: 'moody',
    form: { template: 'club', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { source: 'replace', kit: 'style', crashes: true, rolls: false, impact: false, shaker: true, tambourine: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: true },
    fx: { riser: false, stutter: true, pump: false, delayThrows: true },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'VImaj7', 'iv9', 'v7'],
    major: ['vi9', 'IVmaj7', 'ii9', 'iii7'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The stab and the chops around G4, the organ bass from E1.
  centres: { saws: 'A4', pad: 'E4', piano: 'G4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1', stabs: 'C5' },

  drums: {
    // The 2-step: the third beat left empty, the second bar pushing one in before it.
    kick: ['x.........x.....', 'x......x..x.....'],
    clap: '....x.......x...',
    ohats: '..x.......x.....',
    hats16: 'x.xxx.x.x.xxx.x.',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '............x.x.', tom: '..........x.....' },
      { snare: '..........x..xx.', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: 'xxxxxxxxxxxxxxxx',
    },
  },

  rhythms: {
    // The organ bass: a short push on the one, then replies in the kick's gaps.
    offbeat: 'R:2 . . R:1 . . . . . . R:2 . . O:1 R:1 .',
    rolling: 'R:1 . O:1 . . R:1 . . R:1 . . O:1 . R:1 5:1 .',
    sub: 'R:4 . . . . . . . . . R:4 . . . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The organ stabs: the one and the "a" of one, and the "and" of three.
    pianoStabs: 'x:1 . . x:1 . . . . . . x:1 . . . . .',
    arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 2 1 3',
  },

  master: BIG_ROOM.master,
  // From the garage-2step sketch's solo-balanced mix (work/auditions/rave-styles/garage-2step.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: 1 } },
    snare: { gain: -1, send: { reverb: 0.2 } },
    clap: { gain: -2, send: { reverb: 0.25 } },
    hats: { gain: -6, pan: 0.2 },
    ohats: { gain: -9, pan: -0.2 },
    shaker: { gain: -14, pan: -0.3 },
    bass: { gain: -9 },
    sub: { gain: -12 },
    hook: { gain: -2, pan: -0.05, send: { delay: 0.25, reverb: 0.3 } },
    // The organ stabs.
    piano: { gain: -6, pan: -0.1, send: { delay: 0.25, reverb: 0.3 } },
    // The chopped "oh".
    counter: { gain: -6, pan: 0.15, send: { delay: 0.3, reverb: 0.4 } },
    pad: { gain: -10, eq: { low: -5 }, send: { reverb: 0.5 } },
  },
  // After the levels (levels.js roleGainDb): the organ stabs and a stab-lead up, the chopped "oh"
  // down (Peter, 9 Oct 2026: stabs "a little soft", leads "a bit loud sometimes").
  balance: { riffTrimDb: 1, roleGainDb: { piano: 2, counter: -3 } },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'ORGAN BASS', piano: 'ORGAN Stabs', counter: 'VOX Chop', shaker: 'PERC Shaker',
  },
});

// ---- the flavours (flavours.js), from work/local/_rave-sketches.mjs (9 Oct 2026)
export const UK_GARAGE_FLAVOURS = Object.freeze([
  {
    // SPEED GARAGE — 134. The kick back on every beat, off-beat open hats and a shuffle, and the
    // wobble bass — long notes talking in eighths on a tempo-locked LFO — under off-beat organ stabs.
    id: 'speed', label: 'Speed Garage',
    recipe: {
      bpm: 134,
      tempoRange: [130, 138],
      swing: 57,
      drums: {
        ...UK_GARAGE.drums,
        kick: 'x...x...x...x...',
        ohats: '..x...x...x...x.',
        hats16: 'x.xxx.xxx.xxx.xx',
      },
      rhythms: {
        ...UK_GARAGE.rhythms,
        offbeat: 'R:6 . . . . . R:3 . . O:2 . R:4 . . . .',
        pianoStabs: '. . x:1 . . . x:1 . . . x:1 . . . x:1 .',
      },
      strips: {
        ...UK_GARAGE.strips,
        bass: { gain: -10 },
        ohats: { gain: -7, pan: -0.2 },
      },
      labels: { ...UK_GARAGE.labels, bass: 'WOBBLE BASS' },
    },
  },
]);
