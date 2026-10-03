// MEGA DRIVE — the eleventh recipe. 3 Oct 2026.
//
// Sixteen-bit FM game music, written from the general idea of the sound, not checked
// against the records — Peter's ear wins over anything here. Chipstep's older sibling:
// where chipstep is square waves, this is the FM chip. 150 and driving: a punchy kit with
// a crushed kick and FM toms, a slap-FM bass bouncing in octaves, FM keys stabbing the
// off-beats instead of supersaws, the hook on a bright FM lead with an FM bell an octave
// over it, a hard FM lead an octave up later. Song-shaped like synthwave (a stage tune
// has verses and a chorus, not a drop), no riser, no pump, no filter build — the chip had
// none of them — and a short room. Data only, like big-room.js; the sounds are in
// ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const MEGADRIVE = Object.freeze({
  id: 'megadrive',
  label: 'Mega Drive',
  note: '150 · FM bass, FM keys, FM lead',
  title: '150 BPM, sixteen-bit FM: a slap-FM bass in octaves, FM keys on the off-beats, the hook on an FM lead with an FM bell over it, FM toms. A Pop Song in the Heroic mood by default — no riser, pump or filter build',
  bpm: 150,
  tempoRange: [132, 164],
  defaults: {
    mood: 'heroic',
    form: { template: 'pop', doubleDrop: false, hardStop: false },
    drums: { source: 'replace', impact: false, shaker: false, ride: false },
    parts: { bass: 'octaves', chords: 'piano', sub: false, octaveDouble: false },
    fx: { pump: false, filterBuild: false, stutter: false, riser: false },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'VI', 'III', 'VII'],
    major: ['IV', 'V', 'iii', 'vi'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // Plain triads, no exciter: the FM lead is bright already.
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'E5', bassFloor: 'A1', subFloor: 'C1' },

  drums: {
    // A driving rock-ish beat: the kick on the one, the "and" of two and three.
    kick: ['x.....x.x.......', 'x.....x.x.....x.'],
    clap: '....x.......x...',
    ohats: '..............x.',
    hats16: 'x.x.x.x.x.x.x.x.',
    hats8: 'x...x...x...x...',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // FM tom runs down the kit.
    fills: [
      { snare: '............xxxx', tom: '........x.x.....' },
      { snare: '........x.......', tom: '..........xxxxxx' },
      { snare: '..........x.x.xx', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: { ...BIG_ROOM.drums.perc },
  },

  rhythms: {
    // The slap-FM bass, root and octave with a push before the three.
    offbeat: 'R:2 . O:1 R:1 . R:1 O:2 . R:2 . O:1 R:1 . 5:1 O:2 .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // FM keys on the off-beats, a push into the next bar.
    pianoStabs: '. . x:2 . . . x:2 . . . x:2 . . x:1 x:2 .',
    arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
  },

  master: {
    master: 0,
    masterEffects: BIG_ROOM.master.masterEffects,
    fx: { reverb: { decay: 1.2 } },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: -1 } },
    clap: { gain: 0, eq: { high: 1 }, send: { reverb: 0.15 } },
    snare: { gain: 1, eq: { high: 2 }, send: { reverb: 0.15 } },
    hats: { gain: -8, pan: 0.2 },
    ohats: { gain: -11, pan: -0.15 },
    crash: { gain: -9, pan: 0.2, send: { reverb: 0.3 } },
    fill: { gain: -3, pan: 0.2, send: { reverb: 0.15 } },
    bass: { gain: -4 },
    sub: { gain: -12 },
    square: { gain: -2, pan: 0.05, send: { delay: 0.08, reverb: 0.15 } },
    bell: { gain: -8, pan: 0.25, send: { delay: 0.15, reverb: 0.2 } },
    megaSaw: { gain: -6, pan: -0.1, send: { reverb: 0.15 } },
    third: { gain: -8, pan: 0.15, send: { reverb: 0.15 } },
    counter: { gain: -7, pan: -0.2, send: { delay: 0.12, reverb: 0.15 } },
    piano: { gain: -4, pan: -0.15, send: { reverb: 0.15 } },
    pad: { gain: -10, send: { reverb: 0.3 } },
    arp: { gain: -11, pan: 0.25, send: { delay: 0.12, reverb: 0.15 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'BASS FM Slap', square: 'LEAD FM', bell: 'FM BELL 8VA', megaSaw: 'LEAD FM 8VA', piano: 'FM KEYS',
    fill: 'FILL FM TOMS', counter: 'FM COUNTER', arp: 'FM ARP',
  },
});
