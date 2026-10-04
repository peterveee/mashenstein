// FRENCH HOUSE — 5 Oct 2026.
//
// Peter picked it from the pop sketches (work/local/_pop-sketches.mjs, WAVs in
// work/auditions/pop-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 124 with a touch of swing: a
// looped disco phrase — chopped electric-piano chords (Chords = Piano Stabs), a wah guitar
// scratching through the chords (the arp, its own figure from the start), a funky picked
// bass — pumping hard against a plain 909 four on the floor, and opened up through a low-pass
// across every build (Filter Build) in place of a riser or a snare roll. The pump is on the
// loop's own strips, not the Chord Gate: piano stabs are never gated, and the pump is the
// style. The Club form, one drop after the breakdown and no key lift.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

const SEVENTHS = { colour: { '': 'maj7', m: 'm7' } };
// The loop ducking under every kick — harder than big-room's saws.
const LOOP_PUMP = { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.7 } };

export const FRENCH_HOUSE = Object.freeze({
  id: 'french-house',
  label: 'French House',
  note: '124 · filtered disco loop, wah guitar, hard pump',
  title: '124 BPM with a touch of swing: a looped disco phrase of chopped electric piano, a wah guitar and a funky bass, pumping hard against a plain four on the floor and opening through a low-pass in every build. Starts on the Club form in the Funky mood',
  bpm: 124,
  tempoRange: [118, 128],
  swing: 52,
  // The wah guitar is the loop: it plays its own figure, from the first phrase.
  arpFixed: true,
  enter: { arp: 0 },
  defaults: {
    mood: 'funky',
    form: { template: 'club', doubleDrop: false, hardStop: false, keyLift: 'none' },
    drums: { rolls: false, impact: false, shaker: false, tambourine: false, congas: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: true, arpPattern: 'style', choir: false, counter: false },
    fx: { riser: false, filterBuild: true, stutter: false, pump: false, delayThrows: false },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'iv9', 'VIImaj7', 'v7'],
    major: ['IVmaj9', 'iii7', 'ii9', 'V9'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? SEVENTHS : {}), exciter: false,
  }])),

  // The loop in the middle, the guitar just above it, the bass from E1.
  centres: { saws: 'E4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'G4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '............x.x.', tom: '..........x.....' },
      { snare: '..........x...x.', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: BIG_ROOM.drums.perc,
  },

  rhythms: {
    // The disco bass, pushed: root, octave, the push before three, an octave to go round.
    offbeat: 'R:1 . O:1 . . R:1 . O:1 . R:1 . . 5:1 . O:1 R:1',
    rolling: 'R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The chopped loop.
    pianoStabs: 'x:1 . x:2 . . x:2 . x:1 . x:1 . x:2 . . x:1 .',
    // The wah guitar scratching through the chord.
    arp: '0 . 1 1 . 0 2 . 1 . 0 1 . 2 1 .',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/pop-styles/french-house.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    clap: { gain: 1.5, send: { reverb: 0.25 } },
    snare: { gain: -3, send: { reverb: 0.25 } },
    hats: { gain: -6, pan: -0.2 },
    ohats: { gain: -4.5, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -7, pan: 0.25, send: { reverb: 0.3 } },
    bass: { gain: -0.5, effects: [LOOP_PUMP] },
    sub: { gain: -16 },
    hook: { gain: -3, pan: 0.05, send: { delay: 0.15, reverb: 0.3 } },
    megaSaw: { gain: -9, send: { reverb: 0.3 } },
    piano: { gain: -6, send: { reverb: 0.2 }, effects: [{ id: 'phaser', params: { wet: 0.25 } }, LOOP_PUMP] },
    // The wah guitar.
    arp: { gain: -8.5, pan: 0.25, effects: [LOOP_PUMP] },
    pad: { gain: -9, eq: { low: -4 }, send: { reverb: 0.4 }, effects: [LOOP_PUMP] },
    choir: { gain: -10, send: { reverb: 0.5 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    piano: 'LOOP Keys', arp: 'GUITAR Wah', pad: 'PAD',
  },
});
