// ELECTRO — the tenth recipe. 3 Oct 2026.
//
// Eighties 808 electro, written from the general idea of the genre, not checked against
// the records — Peter's ear wins over anything here. Kraftwerk's cousin that wants you to
// dance: 126, an 808 kit throughout (a syncopated kick that answers itself, the clap on two
// and four, sixteenth hats), an 808 bass locked to the kick, orchestra-style stabs on the
// off-beats instead of pumping supersaws, the hook doubled by a robot vocoder, a hard FM
// lead an octave up in the later drops. It is still a banger — builds, drops, a riser —
// but dry and straight: no pump, no exciter, a short room. Data only, like big-room.js;
// the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const ELECTRO = Object.freeze({
  id: 'electro',
  label: 'Electro',
  // Now and then the Machine-Gun Sweep into a drop, in place of the stutter (fx.js).
  machineGunSweep: true,
  note: '126 · 808 kit, robot vocoder, stabs',
  title: '126 BPM: an 808 kit with a syncopated kick, an 808 bass locked to it, stabs on the off-beats, a robot vocoder doubling the hook. Dry and straight — no pump. Dark by default',
  bpm: 126,
  tempoRange: [112, 132],
  // The 808 kit is the style: the riff's own drums replaced, no shaker or ride.
  defaults: {
    mood: 'dark',
    drums: { source: 'replace', kit: '808', shaker: false, ride: false, rolls: false },
    parts: { chords: 'piano', sub: false, octaveDouble: false },
    fx: { pump: false },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'VI', 'iv', 'v'],
    major: ['vi', 'IV', 'ii', 'V'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // Plain triads, and no exciter: the vocoder and the stabs are bright enough.
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  centres: { saws: 'A4', pad: 'E4', piano: 'D4', choir: 'A4', arp: 'A4', bassFloor: 'A1', subFloor: 'C1' },

  drums: {
    // The kick on the one, the "a" of two and the "and" of three; the second bar pushes
    // one more in before the backbeat.
    kick: ['x......x..x.....', 'x......x..x..x..'],
    clap: '....x.......x...',
    ohats: '..............x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // 808 tom runs, high to low.
    fills: [
      { snare: '............x.x.', tom: '........xxx.....' },
      { snare: '..........x...xx', tom: '........x.x.x...' },
      { snare: '................', tom: '........x.xxx.xx' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      congas: '..x..x.....x.x..',
    },
  },

  rhythms: {
    // The 808 bass rides the kick: on the one, the "a" of two and the "and" of three.
    offbeat: 'R:6 . . . . . . R:3 . . R:4 . . . . .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:6 . . . . . . R:3 . . R:4 . . . . .',
    subOff: 'R:6 . . . . . . R:3 . . R:4 . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The stabs: short, on the "and" of one and three, and the "a" of four.
    pianoStabs: '. . x:1 . . . . . . . x:1 . . . . x:1',
    arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1',
  },

  master: {
    master: 0,
    masterEffects: BIG_ROOM.master.masterEffects,
    fx: { reverb: { decay: 1.6 } },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 1, eq: { low: 1 } },
    clap: { gain: 0, send: { reverb: 0.2 } },
    snare: { gain: 0, send: { reverb: 0.2 } },
    hats: { gain: -7, pan: 0.15 },
    ohats: { gain: -11, pan: -0.15 },
    fill: { gain: -4, pan: 0.15, send: { reverb: 0.2 } },
    bass: { gain: -5 },
    sub: { gain: -10 },
    // The vocoder doubling the hook, a touch of slap delay.
    square: { gain: -2, pan: 0, send: { delay: 0.15, reverb: 0.15 } },
    bell: { gain: -9, pan: 0.2, send: { delay: 0.2, reverb: 0.25 } },
    megaSaw: { gain: -6, pan: -0.1, send: { delay: 0.15, reverb: 0.2 } },
    // The stabs.
    piano: { gain: -3, send: { delay: 0.1, reverb: 0.25 } },
    pad: { gain: -10, send: { reverb: 0.4 } },
    arp: { gain: -12, pan: -0.2, send: { delay: 0.2, reverb: 0.15 } },
    counter: { gain: -8, pan: 0.2, send: { delay: 0.2, reverb: 0.2 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'BASS 808', square: 'VOCODER', megaSaw: 'LEAD FM 8VA', piano: 'STABS', fill: 'FILL 808 TOMS',
  },
});
