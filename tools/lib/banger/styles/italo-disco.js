// ITALO DISCO — 5 Oct 2026.
//
// Peter picked it from the pop sketches (work/local/_pop-sketches.mjs, WAVs in
// work/auditions/pop-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 118: a machine four on the
// floor, a galloping sixteenth octave bass (Bass = Rolling), a glassy arpeggio running from
// the first phrase in its own figure, synth strings holding the chords (Chords = Pad), the
// hook on a vocoder, a disco tom dropping into the end of every eight. Song-shaped: a Pop
// Song in the Anthemic mood, with no riser, roll, impact, pump or stutter — every one still
// a switch.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const ITALO_DISCO = Object.freeze({
  id: 'italo-disco',
  label: 'Italo Disco',
  note: '118 · galloping octave bass, arpeggios, vocoder',
  title: '118 BPM: a machine four on the floor, a galloping sixteenth octave bass, a glassy arpeggio, synth strings, the hook on a vocoder and a disco tom into every eight. Starts as a Pop Song in the Anthemic mood',
  bpm: 118,
  tempoRange: [112, 124],
  // The arpeggio is the style: it plays its own figure, from the first phrase.
  arpFixed: true,
  enter: { arp: 0 },
  defaults: {
    mood: 'anthemic',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { rolls: false, impact: false, shaker: false, tambourine: false, congas: false, ride: false },
    parts: { bass: 'rolling', sub: false, chords: 'pad', square: false, bell: false, octaveDouble: false, arp: true, arpPattern: 'style', choir: false, counter: false },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'VI', 'iv', 'V7'],
    major: ['vi', 'IV', 'ii', 'V'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The arpeggio an octave over the strings, the bass from E1.
  centres: { saws: 'E4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'x.xxx.xxx.xxx.xx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // The disco tom falling into the next eight (the fill kit slot plays it).
    fills: [
      { snare: '................', tom: '............x.x.' },
      { snare: '............x...', tom: '........x...x.x.' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: BIG_ROOM.drums.perc,
  },

  rhythms: {
    // Root, octave eighths.
    offbeat: 'R:1 . O:1 . R:1 . O:1 . R:1 . O:1 . R:1 . O:1 .',
    // The gallop: two roots and the octave, over and over.
    rolling: 'R:1 R:1 O:1 R:1 R:1 R:1 O:1 R:1 R:1 R:1 O:1 R:1 R:1 R:1 O:1 R:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:2 . . . x:2 . . . x:2 . . . x:2 .',
    arp: '0 2 1 3 0 2 1 3 0 2 1 3 0 2 1 3',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/pop-styles/italo-disco.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    clap: { gain: 1.5, send: { reverb: 0.4 } },
    snare: { gain: -3, send: { reverb: 0.35 } },
    hats: { gain: -1, pan: -0.2 },
    ohats: { gain: -10, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -6, pan: 0.15, send: { reverb: 0.3 } },
    bass: { gain: -5 },
    sub: { gain: -16 },
    hook: { gain: -5, pan: 0.05, send: { delay: 0.25, reverb: 0.4 } },
    megaSaw: { gain: -10, send: { reverb: 0.35 } },
    arp: { gain: -15, pan: -0.25, effects: [{ id: 'pingpong', params: { sync: 1, division: 0.75, feedback: 0.35, wet: 0.3 } }] },
    pad: { gain: -7.5, eq: { low: -5 }, send: { reverb: 0.5 } },
    piano: { gain: -8, send: { reverb: 0.3 } },
    choir: { gain: -10, send: { reverb: 0.5 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    arp: 'ARP', pad: 'STRINGS', saws: 'STRINGS', fill: 'DISCO TOM',
  },
});
