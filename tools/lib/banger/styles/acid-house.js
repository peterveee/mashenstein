// ACID HOUSE — 9 Oct 2026 (docs/LAB_STYLES_PLAN.md).
//
// Written from the general idea of the genre and the acid-house sketch Peter heard
// (work/local/_rave-sketches.mjs), not checked against the records — Peter's ear wins over
// anything here. 122 with a light swing: a 909 four on the floor, open hats on the off-beats,
// the clap arriving later, and the 303 line as both the bass and the point — one phrase for the
// take that evolves, its accents and slides drawn again every eight bars (theory.js acidLine),
// played on Acid 303 so a slide glides and an accent is a harder strike (`${lane}Velocity`).
// Almost no harmony: Hypnotic by default, one minor-seventh organ stab answering now and then.
// It builds by its filter, not by risers: the line's own low-pass rises and falls across every
// section (`filterMoves`, fx.js). A Groove by default — parts arriving and leaving, no drops.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const ACID_HOUSE = Object.freeze({
  id: 'acid-house',
  label: 'Acid House',
  note: '122 · 909 groove, a 303 line that evolves',
  title: '122 BPM with a light swing: a 909 four on the floor and a 303 acid line — slides, accents, octave jumps — whose filter rises and falls across every section, with a single organ stab answering it. A Groove in the Hypnotic mood: no drops, no risers',
  bpm: 122,
  tempoRange: [118, 128],
  // The bass line is the style's signature (9 Oct 2026, Peter): a mood never swaps it for the one it
  // suggests (options.js moodBass), and later drops never lift it. A flavour still changes it where it
  // means to, and the Lab's voltage rolls still try the style's own few alternatives.
  bassFixed: true,
  swing: 54,
  defaults: {
    mood: 'hypnotic',
    form: { template: 'groove', doubleDrop: false, hardStop: false, keyLift: 'none' },
    drums: { source: 'replace', kit: 'style', crashes: false, rolls: false, impact: false, fills: true, shaker: false, tambourine: false, ride: false },
    parts: { bass: 'acid', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: false },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  // The acid line's own low-pass, rising and falling across each section it plays in, with some
  // resonance: the hand on the cutoff knob.
  filterMoves: { bass: { shape: 'riseFall', lo: 380, hi: 5200, Q: 3, over: 'section' } },
  // The order the parts come in: the 303 arrives WITH the kick — the line is the point, and it
  // should not wait half a minute — then the rest of the beat, the stab, and the hook last.
  layers: [
    ['kick', 'bass', 'sub'],
    ['hats', 'ohats', 'clap', 'snare', 'fill', 'perc', 'riffDrums'],
    ['chords', 'arp'],
    ['riff', 'doubles'],
  ],

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i7', 'i7', 'iv7', 'i7'],
    major: ['I7', 'I7', 'IV7', 'I7'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The 303 from A1, the stab low in the middle.
  centres: { saws: 'E4', pad: 'E4', piano: 'D4', choir: 'A4', arp: 'A4', bassFloor: 'A1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    // Sixteenths around the open hats, never on them.
    hats16: 'xx.xxx.xxx.xxx.x',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '............x.x.', tom: '..........x.....' },
      { snare: '..........x...xx', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      cowbell: '...x..x....x..x.',
    },
  },

  rhythms: {
    // Only what the Bass switch falls back to when it is not Acid.
    offbeat: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    rolling: 'R:1 R:1 O:1 R:1 . R:1 7:1 R:1 R:1 5:1 R:1 . 3:1 R:1 R:1 O:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The one stab: the "a" of two, and the "and" of four held a touch.
    pianoStabs: '. . . . . . x:1 . . . . . . . x:2 .',
    arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 2 1 3',
  },

  master: { ...BIG_ROOM.master, fx: { reverb: { decay: 1.8 } } },
  // From the acid-house sketch's solo-balanced mix (work/auditions/rave-styles/acid-house.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: 1 } },
    clap: { gain: 0, send: { reverb: 0.25 } },
    snare: { gain: -2, send: { reverb: 0.25 } },
    hats: { gain: -6, pan: 0.15 },
    ohats: { gain: -8, pan: -0.15 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -6, pan: 0.2, send: { reverb: 0.3 } },
    cowbell: { gain: -14, pan: 0.3, send: { delay: 0.2 } },
    // The 303 sat level with the kick and dominated (Peter, 9 Oct 2026); about 6 LU under it now.
    bass: { gain: -7, send: { delay: 0.12 } },
    sub: { gain: -14 },
    hook: { gain: -2, pan: -0.05, send: { delay: 0.25, reverb: 0.3 } },
    piano: { gain: -8, pan: -0.1, send: { delay: 0.35, reverb: 0.35 } },
    pad: { gain: -10, eq: { low: -4 }, send: { reverb: 0.5 } },
    arp: { gain: -12, pan: -0.25, send: { delay: 0.3, reverb: 0.3 } },
  },
  // After the levels: offsets on what they set (levels.js roleGainDb). Peter, 9 Oct 2026: the acid
  // bass "a bit loud", the chord stab "a little soft", and stabs as the lead "too soft" — the hook's
  // own sound here is an organ stab, which every other lead was matched down to.
  // The hook through the Lab's riff trim (`riffTrimDb`, -3 elsewhere), which reaches it whatever it plays on.
  balance: { riffTrimDb: 2, roleGainDb: { bass: -2, piano: 3 } },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'ACID 303', piano: 'ORGAN Stab', cowbell: 'PERC Cowbell',
  },
});
