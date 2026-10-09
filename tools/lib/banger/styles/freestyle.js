// FREESTYLE — 9 Oct 2026 (docs/LAB_STYLES_PLAN.md).
//
// Electro with a Latin heart, written from the general idea of the genre and the
// electro-freestyle sketch Peter heard (work/local/_rave-sketches.mjs), not checked against the
// records — Peter's ear wins over anything here. 116: an 808 kick on a syncopated figure, claps on
// two and four, sixteenth hats, congas and a cowbell; a sequenced synth bass in octaves; a
// dramatic minor walk to the big V under strings; orchestra hits on the downbeats (the counter
// part, played as stabs); the hook on a bright bell. The Club form in the Heroic mood (a Pop Song until
// 9 Oct 2026: Peter wanted fewer).
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const FREESTYLE = Object.freeze({
  id: 'freestyle',
  label: 'Freestyle',
  note: '116 · Latin electro, orchestra hits, synth bass',
  title: '116 BPM: an 808 kick on a syncopated Latin figure, claps, sixteenth hats, congas and a cowbell, a sequenced synth bass in octaves, strings under a dramatic minor walk, orchestra hits on the downbeats and the hook on a bell. Starts on the Club form in the Heroic mood',
  bpm: 116,
  tempoRange: [110, 122],
  // The bass line is the style's signature (9 Oct 2026, Peter): a mood never swaps it for the one it
  // suggests (options.js moodBass), and later drops never lift it. A flavour still changes it where it
  // means to, and the Lab's voltage rolls still try the style's own few alternatives.
  bassFixed: true,
  defaults: {
    mood: 'heroic',
    form: { template: 'club', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { source: 'replace', kit: 'style', crashes: true, rolls: false, shaker: false, ride: false, congas: true, cowbell: true },
    parts: { bass: 'rolling', sub: false, chords: 'pad', square: true, bell: false, octaveDouble: false, arp: false, choir: false, counter: true },
    fx: { pump: false, riser: false, delayThrows: true },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'VI', 'VII', 'V'],
    major: ['vi', 'IV', 'V', 'III'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The orchestra hit low and wide (its own register, `stabs`), the bass from E1.
  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1', stabs: 'E3' },

  drums: {
    // The 808 kick on the syncopated electro figure, the second bar pushing one more in.
    kick: ['x.....x.x.......', 'x.....x.x..x....'],
    clap: '....x.......x...',
    ohats: '..............x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // 808 tom runs, high to low, with timbale-like answers.
    fills: [
      { snare: '............x.x.', tom: '........xxx.....' },
      { snare: '..........x...xx', tom: '........x.x.x...' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      congas: '..x..x....x..x.x',
      cowbell: 'x..x..x...x.x...',
    },
  },

  rhythms: {
    offbeat: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    // The sequenced synth bass, octaves on the off-sixteenths.
    rolling: 'R:1 . R:1 O:1 . R:1 . R:1 R:1 . R:1 O:1 . R:1 5:1 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:1 . . . x:1 . . . x:1 . . . x:1 .',
    // The orchestra hit on the downbeat of every bar it plays in.
    counterStabs: 'x:2 . . . . . . . . . . . . . . .',
    arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 2 1 3',
  },

  master: BIG_ROOM.master,
  // From the electro-freestyle sketch's solo-balanced mix (work/auditions/rave-styles/electro-freestyle.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 1, eq: { low: 1 } },
    clap: { gain: 0, send: { reverb: 0.3 } },
    snare: { gain: 0, send: { reverb: 0.3 } },
    hats: { gain: -7, pan: 0.2 },
    ohats: { gain: -10, pan: -0.15 },
    congas: { gain: -9, pan: -0.3, send: { reverb: 0.15 } },
    cowbell: { gain: -13, pan: 0.35 },
    bass: { gain: -6.5, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1500, Q: 1 } }] },
    sub: { gain: -12 },
    hook: { gain: -2, pan: 0.05, send: { delay: 0.3, reverb: 0.4 } },
    // The bell doubling the hook.
    square: { gain: -6, pan: 0.15, send: { delay: 0.3, reverb: 0.4 } },
    // The orchestra hits.
    counter: { gain: -5, send: { reverb: 0.5 } },
    pad: { gain: -8, eq: { low: -6 }, send: { reverb: 0.5 } },
  },
  // After the levels (levels.js roleGainDb): the orchestra hits up (Peter, 9 Oct 2026: stabs "a little soft").
  balance: { riffTrimDb: -2, roleGainDb: { counter: 2 } },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'SYNTH BASS', square: 'BELL', counter: 'ORCH HIT', pad: 'STRINGS', congas: 'PERC Congas', cowbell: 'PERC Cowbell',
  },
});
