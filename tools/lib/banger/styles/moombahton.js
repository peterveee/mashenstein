// MOOMBAHTON — 5 Oct 2026. The second Latin style.
//
// Peter picked it from the Latin sketches (work/local/_latin-sketches.mjs, WAVs in
// work/auditions/latin-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 110 and straight: the dembow
// pushed up towards house tempo and made festival-sized — a kick on every beat, a tight
// snare on the dembow (the style kit's clap slot), a big-room clap on three (the
// tambourine slot), tribal toms (the congas slot), a Reese bass on the dembow, Festival
// Stabs on the same rhythm pumping on the beat (Chords = Supersaw Stabs) and the hook on a
// marimba pluck.
//
// Club-shaped, like big-room: snare-roll builds, a riser into every drop, a harder second
// drop. The stabs pump on their own strip (as French House's loop does), because Supersaw
// Stabs are never gated. Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

const STAB_PUMP = { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.5 } };

export const MOOMBAHTON = Object.freeze({
  id: 'moombahton',
  label: 'Moombahton',
  note: '110 · dembow at festival size, Reese bass, saw stabs',
  title: '110 BPM: the dembow beat made festival-sized — a kick on every beat, tribal toms, a Reese bass and pumping saw stabs on the dembow, the hook on a marimba pluck. Starts on the Club form in the Uplifting mood',
  bpm: 110,
  tempoRange: [104, 114],
  defaults: {
    mood: 'uplifting',
    drums: { shaker: false, tambourine: true, congas: true, cowbell: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'stabs', square: false, bell: false, arp: false, choir: false, counter: false },
    fx: { pump: false },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: BIG_ROOM.breakdown,
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The stabs in the middle under the pluck, the Reese from E1.
  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'D5', bassFloor: 'E1', subFloor: 'C1' },
  tempoFeel: 'four',

  drums: {
    kick: 'x...x...x...x...',
    // The dembow: the "a" of one, the "and" of two, the "a" of three, the "and" of four.
    clap: '...x..x....x..x.',
    ohats: '..............x.',
    hats16: 'x.xxx.x.x.xxx.x.',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // Tom runs into the next eight.
    fills: [
      { snare: '...x..x.........', tom: '........x.x.xxx.' },
      { snare: '...x..x....x....', tom: '............xxxx' },
      { snare: '...x............', tom: '......x.x.x.x.xx' },
    ],
    halfKick: 'x.......x.......',
    halfClap: '...x..x.........',
    perc: {
      ...BIG_ROOM.drums.perc,
      // The big-room clap on three (the tambourine slot).
      tambourine: '........x.......',
      // The tribal toms (the congas slot).
      congas: '..x...x.......x.',
    },
  },

  rhythms: {
    // The Reese on the dembow.
    offbeat: 'R:3 . . R:1 . . R:2 . R:3 . . R:1 . . R:2 .',
    rolling: BIG_ROOM.rhythms.rolling,
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The stabs on the dembow too (Supersaw Stabs and Piano Stabs both play it).
    pianoStabs: 'x:2 . . x:1 . . x:2 . . . . x:1 . . x:2 .',
    arp: '0 . . 1 . . 2 . 0 . . 1 . . 2 .',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/latin-styles/moombahton.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    // The dembow snare.
    clap: { gain: 8, send: { reverb: 0.15 } },
    hats: { gain: 1.5, pan: -0.15 },
    ohats: { gain: -9, pan: 0.15 },
    fill: { gain: -6, pan: 0.2, send: { reverb: 0.25 } },
    // The clap on three.
    tambourine: { gain: -1, send: { reverb: 0.4 } },
    // The tribal toms.
    congas: { gain: -7, pan: 0.2, send: { reverb: 0.25 } },
    // The Reese, its top taken off so it stays a bass.
    bass: { gain: -3, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 900, Q: 0.8 } }] },
    hook: { gain: -9, send: { delay: 0.25, reverb: 0.35 } },
    // The Festival Stabs, pumping.
    saws: { gain: -2, eq: { low: -4 }, send: { reverb: 0.3 }, effects: [STAB_PUMP] },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE Dembow', tambourine: 'CLAP', congas: 'TOMS Tribal', fill: 'FILL Toms',
    bass: 'BASS Reese',
  },
});
