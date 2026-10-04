// REGGAETON — 5 Oct 2026. The first Latin style.
//
// Peter picked it from the pop sketches (work/local/_pop-sketches.mjs, WAVs in
// work/auditions/pop-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 92 and straight: the dembow —
// a kick on every beat, the snare on the boom-ch-boom-chick (the style kit's clap slot) —
// an 808 on the kick, a filtered pad holding the chords (Chords = Pad), the hook on a
// marimba, "aah" chops answering it (the counter-melody), congas and a shaker.
//
// THE BEAT SWITCH: every half-time bar is Latin trap instead — a half-time kick, one snare
// on three and sixteenth hats with rolls (`halfHats`). A Pop Song's middle 8 is the switch;
// Half-Time Switch, or a Half-Time Drop in the Form row, puts one in a chorus too.
// Song-shaped: a Pop Song in the Uplifting mood (i–VI–III–VII in minor), with no riser,
// roll, impact, pump or stutter — every one still a switch.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const REGGAETON = Object.freeze({
  id: 'reggaeton',
  label: 'Reggaeton',
  note: '92 · dembow, 808, marimba, a trap beat switch',
  title: '92 BPM: the dembow beat under an 808, a filtered pad, the hook on a marimba with vocal chops answering it — and a beat switch to Latin trap in the middle 8. Starts as a Pop Song in the Uplifting mood',
  bpm: 92,
  tempoRange: [86, 100],
  defaults: {
    mood: 'uplifting',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { rolls: false, impact: false, shaker: true, tambourine: false, congas: true, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'pad', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: true },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'VI', 'III', 'VII'],
    major: ['vi', 'IV', 'I', 'V'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The pad in the middle under the marimba, the 808 from E1.
  centres: { saws: 'A4', pad: 'A4', piano: 'E4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    // The dembow: the "a" of one, the "and" of two, the "a" of three, the "and" of four.
    clap: '...x..x....x..x.',
    ohats: '..............x.',
    hats16: 'x.x.x.x.x.x.x.x.',
    hats8: 'x...x...x...x...',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // Conga and tom runs into the next eight (the fill kit slot plays them).
    fills: [
      { snare: '...x..x.........', tom: '........x.x.xxx.' },
      { snare: '...x..x....x....', tom: '............xxxx' },
    ],
    // The beat switch: Latin trap.
    halfKick: 'x......x..x.....',
    halfClap: '........x.......',
    halfHats: ['x.x.x.x.xxxxx.x.', 'x.x.x.x.x.x.xxxx'],
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: '.x.x.x.x.x.x.x.x',
      congas: '......x...x.....',
    },
  },

  rhythms: {
    // The 808 on the kick, a pickup into the third beat.
    offbeat: 'R:3 . . . R:3 . . R:1 R:3 . . . R:3 . . .',
    rolling: 'R:2 . . R:1 . . R:2 . R:2 . . R:1 . . R:2 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:1 . . . x:2 . . . x:1 . . . x:2 .',
    arp: '. . 0 1 . . 2 . . . 0 1 . . 2 .',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/pop-styles/reggaeton.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    // The dembow snare.
    clap: { gain: 6, send: { reverb: 0.15 } },
    snare: { gain: -6, send: { reverb: 0.15 } },
    hats: { gain: -1, pan: -0.15 },
    ohats: { gain: -10, pan: 0.15 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -7, pan: 0.3, send: { reverb: 0.2 } },
    shaker: { gain: -8, pan: 0.3 },
    congas: { gain: -9, pan: 0.35, send: { reverb: 0.2 } },
    // The 808, its top taken off so it stays a bass.
    bass: { gain: -4, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1200, Q: 0.7 } }] },
    sub: { gain: -14 },
    hook: { gain: -8, pan: -0.1, send: { delay: 0.2, reverb: 0.25 } },
    megaSaw: { gain: -12, pan: 0.1, send: { reverb: 0.3 } },
    // The vocal chops.
    counter: { gain: -11, pan: 0.15, send: { delay: 0.35, reverb: 0.5 } },
    pad: { gain: -10, eq: { low: -6 }, send: { reverb: 0.5 }, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 2200, Q: 0.8 } }] },
    piano: { gain: -9, send: { reverb: 0.25 } },
    choir: { gain: -11, send: { reverb: 0.5 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE Dembow', bass: '808', pad: 'PAD', counter: 'VOX Chops', fill: 'FILL Perc',
    shaker: 'PERC Shaker', congas: 'PERC Congas',
  },
});
