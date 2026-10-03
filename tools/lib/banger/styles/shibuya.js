// SHIBUYA-KEI — the eighth recipe. 3 Oct 2026.
//
// Nineties Tokyo pop that sounds like a record collection: sixties bossa nova and French
// pop, lounge jazz chords, a bright breakbeat under it. Written from the general idea of
// the genre, not checked against the records — Peter's ear wins over anything here.
//
// 126 with a light swing. A breakbeat kick with a rim click on the backbeat, shaker and
// tambourine; a bass guitar in the bossa figure (a dotted quarter and an eighth, root to
// fifth); the chords as a nylon guitar comping in bossa rhythm; the hook doubled on vibes,
// a flute answering in its rests, a muted trumpet an octave up in the later choruses, a
// celesta over the top; strings for the swell, an organ under the verses, a "ba-ba" choir
// in the last chorus. Song-shaped, like synthwave: a Pop Song with a pre-chorus and a
// chorus, the last one a step up — arriving by a ii–V, the Lounge mood's way in. Data
// only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

const JAZZY = { colour: { '': 'maj7', m: 'm7' } };

export const SHIBUYA = Object.freeze({
  id: 'shibuya',
  label: 'Shibuya-Kei',
  note: '126 · bossa bass, breakbeat, flute and vibes',
  title: '126 BPM with a light swing: a breakbeat with a rim click, a bossa bass guitar, nylon guitar comping, vibes doubling the hook, a flute answering it. Starts as a Pop Song in the Lounge mood',
  bpm: 126,
  tempoRange: [112, 134],
  // A light swing on the sixteenths (the arrangement's Swing: 50 is straight).
  swing: 56,
  // The flute (Counter-Melody) on; the guitar comps the chords; no supersaws, no pump, no
  // drop-music hits.
  defaults: {
    mood: 'lounge',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { impact: false, shaker: true, tambourine: true, ride: false, rolls: false },
    parts: { counter: true, chords: 'piano', bass: 'offbeat', sub: false, choir: true, octaveDouble: false },
    fx: { pump: false, filterBuild: false, stutter: false },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  // Big-room's walks, every chord a seventh — and the shared moods, Lounge first.
  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'iv9', 'VImaj7', 'V7'],
    major: ['IVmaj9', 'iii7', 'ii9', 'V7sus4'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? JAZZY : {}), exciter: false,
  }])),

  // The guitar and the vibes in the middle of the piano, the bass guitar from E1.
  centres: { saws: 'E4', pad: 'C4', piano: 'D4', choir: 'A4', arp: 'A4', stabs: 'E4', bassFloor: 'E1', subFloor: 'E1' },

  drums: {
    // A light breakbeat: the kick on one, the "and" of two and the "a" of three; the rim
    // click (the clap's job here) on two and four; eighth hats, an open hat on the last
    // "and".
    kick: 'x.....x...x..x..',
    clap: '....x.......x...',
    ohats: '..............x.',
    hats16: 'x.xxx.xxx.xxx.xx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '..........x.x.x.', tom: '........x.x.....' },
      { snare: '............xxxx', tom: '........xx.x....' },
      { snare: '........x..x..x.', tom: '..........x..x..' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      // The bossa shaker, the sixties tambourine on the backbeat, congas answering.
      shaker: 'x.xxx.xxx.xxx.xx',
      tambourine: '....x.......x...',
      congas: '..x..x....x..x..',
    },
  },

  rhythms: {
    // The bossa bass: a dotted quarter on the root, an eighth on the fifth, held over.
    offbeat: 'R:3 . . 5:1 5:4 . . . R:3 . . 5:1 5:4 . . .',
    // Walking quarters (the Rolling switch here).
    rolling: 'R:4 . . . 3:4 . . . 5:4 . . . 7:4 . . .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The nylon guitar comping in bossa rhythm (Chords = Piano Stabs).
    pianoStabs: 'x:2 . . x:2 . . x:3 . . . x:2 . . x:2 . .',
    arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1',
  },

  master: BIG_ROOM.master,
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: -3, eq: { low: -1 } },
    snare: { gain: -1, eq: { high: 1 }, send: { reverb: 0.3 } },
    clap: { gain: -5, pan: -0.1, send: { reverb: 0.2 } },
    hats: { gain: -11, pan: 0.25 },
    ohats: { gain: -13, pan: -0.2 },
    crash: { gain: -10, pan: 0.3, send: { reverb: 0.3 } },
    fill: { gain: -7, pan: 0.3, send: { reverb: 0.3 } },
    bass: { gain: -3 },
    sub: { gain: -16 },
    // The vibes doubling the hook.
    square: { gain: -4, pan: -0.15, send: { reverb: 0.35 } },
    bell: { gain: -11, pan: 0.25, send: { reverb: 0.45 } },
    // The muted trumpet an octave up in the later choruses.
    megaSaw: { gain: -5, pan: -0.1, send: { reverb: 0.3 } },
    // The flute answering the hook.
    counter: { gain: -5, pan: 0.2, send: { delay: 0.15, reverb: 0.4 } },
    third: { gain: -9, pan: 0.15, send: { reverb: 0.3 } },
    arp: { gain: -13, pan: 0.3, send: { delay: 0.2, reverb: 0.25 } },
    // The nylon guitar comping the chords.
    piano: { gain: -6, pan: -0.25, send: { reverb: 0.2 } },
    // The strings (Chords = Pumping Supersaws) keep big-room's strip, and so its reference:
    // the levelling matches them to it.
    pad: { gain: -13, send: { reverb: 0.35 } },
    choir: { gain: -10, send: { reverb: 0.6 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'RIM', square: 'VIBES', bell: 'CELESTA', megaSaw: 'TRUMPET 8VA', counter: 'FLUTE', third: 'KEYS 3RD',
    piano: 'GUITAR Bossa', saws: 'STRINGS', pad: 'ORGAN', choir: 'CHOIR Ba-Ba', arp: 'HARPSICHORD', shaker: 'PERC Shaker',
  },
});
