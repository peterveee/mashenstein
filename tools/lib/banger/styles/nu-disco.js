// NU-DISCO — the thirteenth recipe. 5 Oct 2026.
//
// Slow, sunny disco: the chill sketch Peter liked as "balearic" and asked to call nu-disco
// (work/local/_chill-sketches.mjs, 5 Oct 2026). Written from the general idea of the genre,
// not checked against the records — Peter's ear wins over anything here. 112 with the
// lightest swing: an easy four on the floor, a snare on two and four, open hats on the
// off-beats, congas and a tambourine; a bass guitar walking root, octave and fifth; a
// picked acoustic guitar running through the chords from the start; soft strings holding
// them; the hook on a flute. A Groove (a Pop Song until 9 Oct 2026: Peter wanted fewer) in
// the Nostalgic mood (the royal road, IV–V–iii–vi) with no riser, roll, impact, pump or stutter — every one still a switch.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

const SEVENTHS = { colour: { '': 'maj7', m: 'm7' } };

export const NU_DISCO = Object.freeze({
  id: 'nu-disco',
  label: 'Nu-Disco',
  note: '112 · slow disco, picked guitar, congas, flute',
  title: '112 BPM: an easy four on the floor with congas and a tambourine, a walking bass guitar, a picked acoustic guitar through the chords, soft strings, the hook on a flute. Starts as a Groove in the Nostalgic mood — no drops',
  bpm: 112,
  tempoRange: [104, 118],
  swing: 52,
  // The picked guitar is the style: it plays its own figure, from the first phrase.
  arpFixed: true,
  enter: { arp: 0 },
  defaults: {
    mood: 'nostalgic',
    // The chords come in with the second layer, at bar 9 of a Groove song (9 Oct 2026: they waited for bar 17).
    form: { template: 'groove', doubleDrop: false, hardStop: false, keyApproach: 'mood', chordsEarly: true },
    drums: { impact: false, rolls: false, shaker: false, tambourine: true, congas: true, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'pad', square: false, bell: false, octaveDouble: false, arp: true, arpPattern: 'style', choir: false, counter: false },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['VImaj7', 'v7', 'iv7', 'VII7sus4'],
    major: ['IVmaj7', 'iii7', 'ii7', 'V7sus4'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? SEVENTHS : {}), exciter: false,
  }])),

  // The strings over the guitar, the guitar from D4, the bass guitar from E1.
  centres: { saws: 'A4', pad: 'A4', piano: 'E4', choir: 'A4', arp: 'D4', bassFloor: 'E1', subFloor: 'E1' },

  drums: {
    kick: 'x...x...x...x...',
    // The backbeat is a snare here (the style kit's clap slot).
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'x.x.x.x.x.x.x.x.',
    hats8: 'x...x...x...x...',
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
      // The tambourine on every off sixteenth, congas answering each other.
      tambourine: '.x.x.x.x.x.x.x.x',
      congas: '...x..x....x..x.',
      shaker: 'xxxxxxxxxxxxxxxx',
    },
  },

  rhythms: {
    // The walking disco bass: root, octave, fifth, a third on the way back down.
    offbeat: 'R:2 . . R:1 O:2 . 5:2 . R:2 . . 3:1 O:2 . 5:1 .',
    rolling: 'R:2 . O:2 . R:2 . O:2 . R:2 . O:2 . R:2 . O:2 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // Rhodes chops, if Chords is set to Piano Stabs.
    pianoStabs: '. . x:1 . . x:2 . . . . x:1 . . x:2 . .',
    // The picked guitar: a broken chord in sixteenths, with air in it.
    arp: '0 . 1 2 . 1 3 . 2 . 1 2 . 1 3 .',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/chill-styles/balearic.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { high: -3 } },
    clap: { gain: -1.5, send: { reverb: 0.4 } },
    snare: { gain: -3, send: { reverb: 0.3 } },
    hats: { gain: -9, pan: -0.2 },
    ohats: { gain: -3.5, pan: 0.2, eq: { high: -2 } },
    crash: { gain: -10, pan: 0.25, send: { reverb: 0.5 } },
    fill: { gain: -6, pan: 0.3, send: { reverb: 0.3 } },
    tambourine: { gain: -7, pan: -0.3 },
    congas: { gain: -8, pan: 0.35, send: { reverb: 0.2 } },
    shaker: { gain: -14, pan: 0.3 },
    bass: { gain: -2.5 },
    sub: { gain: -16 },
    hook: { gain: -2, pan: 0.1, send: { delay: 0.2, reverb: 0.5 } },
    bell: { gain: -11, pan: 0.25, send: { reverb: 0.45 } },
    megaSaw: { gain: -6, pan: -0.1, send: { reverb: 0.3 } },
    counter: { gain: -5, pan: -0.2, send: { delay: 0.15, reverb: 0.4 } },
    third: { gain: -9, pan: 0.15, send: { reverb: 0.3 } },
    // The picked guitar.
    arp: { gain: -1, pan: -0.25, send: { reverb: 0.3 } },
    piano: { gain: -8, pan: -0.2, send: { delay: 0.1, reverb: 0.3 } },
    pad: { gain: -6.5, eq: { low: -4 }, send: { reverb: 0.5 }, effects: [{ id: 'widener', params: { width: 0.7 } }] },
    choir: { gain: -10, send: { reverb: 0.6 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE', arp: 'GUITAR Picked', pad: 'STRINGS', saws: 'STRINGS', piano: 'KEYS Rhodes', counter: 'COUNTER-MELODY',
    tambourine: 'PERC Tambourine', congas: 'PERC Congas',
  },
});
