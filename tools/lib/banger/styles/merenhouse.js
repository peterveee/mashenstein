// MERENHOUSE — 5 Oct 2026. The third Latin style.
//
// Peter picked it from the Latin sketches (work/local/_latin-sketches.mjs, WAVs in
// work/auditions/latin-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 132 and straight: merengue on
// a house kick. The güira is the hat — short scrapes on every sixteenth (the style kit's
// hats) under a long scrape on each beat (the shaker slot) — the tambora knocks its
// pattern (the congas slot), a slap bass bounces root to fifth ahead of the beat, piano
// chords hit the off-beats (Chords = Piano Stabs) and the hook is a fast sax riff. The
// güira and tambora presets were made for it (src/data/voices.js).
//
// Song-shaped: a Pop Song in the Fiesta mood (moods.js) — merengue's own walk, the tonic and
// its dominant seventh in plain triads. No riser, roll or pump.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const MERENHOUSE = Object.freeze({
  id: 'merenhouse',
  label: 'Merenhouse',
  note: '132 · merengue on a house kick, güira, tambora, sax',
  title: '132 BPM: merengue on a four-on-the-floor kick — a güira scraping sixteenths, the tambora knocking under it, a slap bass, off-beat piano and the hook on a fast sax. Starts as a Pop Song in the Fiesta mood',
  bpm: 132,
  tempoRange: [126, 140],
  defaults: {
    mood: 'fiesta',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { rolls: false, impact: false, shaker: true, tambourine: false, congas: true, cowbell: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: true },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'iv', 'V', 'i'],
    major: ['I', 'IV', 'V', 'I'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The piano in the middle, the sax above it, the slap bass from E1.
  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },
  tempoFeel: 'four',

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..............x.',
    // The güira's short scrapes (the style kit's hats).
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // Tambora runs into the next eight (the fill kit slot plays them).
    fills: [
      { snare: '............x...', tom: '........x.xxx.xx' },
      { snare: '..........x.....', tom: '........xx.xxxxx' },
    ],
    halfKick: 'x.......x.......',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      // The güira's long scrape on every beat (the shaker slot).
      shaker: 'x...x...x...x...',
      // The tambora (the congas slot).
      congas: 'x..x.x..x..x.xx.',
    },
  },

  rhythms: {
    // The slap bass, root and fifth, bouncing ahead of the beat.
    offbeat: 'R:1 . . 5:1 . . R:1 . . . 5:1 . R:1 . . 5:1',
    rolling: 'R:1 . R:1 5:1 . R:1 . 5:1 R:1 . R:1 5:1 . R:1 . 5:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // Piano on the off-beats.
    pianoStabs: '. . x:1 . . . x:1 . . . x:1 . . . x:1 .',
    arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/latin-styles/merenhouse.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    clap: { gain: 2.5, send: { reverb: 0.25 } },
    hats: { gain: -10, pan: -0.25 },
    ohats: { gain: -12, pan: 0.15 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -8, pan: 0.25, send: { reverb: 0.15 } },
    shaker: { gain: -10, pan: -0.25 },
    congas: { gain: -8.5, pan: 0.25, send: { reverb: 0.15 } },
    bass: { gain: -1 },
    hook: { gain: -2.5, pan: 0, send: { delay: 0.15, reverb: 0.35 } },
    counter: { gain: -9, pan: 0.2, send: { delay: 0.2, reverb: 0.35 } },
    piano: { gain: -1.5, pan: -0.1, send: { reverb: 0.25 } },
    pad: { gain: -12, eq: { low: -4 }, send: { reverb: 0.4 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    hats: 'GÜIRA Chk', shaker: 'GÜIRA Scrape', congas: 'TAMBORA', fill: 'FILL Tambora', cowbell: 'PERC Agogo',
    piano: 'PIANO', counter: 'HORNS',
  },
});
