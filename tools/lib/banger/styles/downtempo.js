// DOWNTEMPO — the fourteenth recipe. 5 Oct 2026.
//
// The trip-hop end of chill, picked by Peter from the chill sketches
// (work/local/_chill-sketches.mjs, 5 Oct 2026). Written from the general idea of the genre,
// not checked against the records — Peter's ear wins over anything here. 90 and swung: a
// slow, heavy breakbeat with a crushed edge (the kick on one, the "and" of two and the "and"
// of three; a fat snare on two and four), a deep round bass that leaves room, Rhodes chords
// trembling, a soft string bed, the hook on a muted trumpet, tape wear over the whole mix.
// The riff's own drums are replaced by default — a four-on-the-floor riff would undo the
// break. A Groove by default, no drops: no riser, roll, impact, pump, stutter or key lift.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

const DEEP = { colour: { '': 'maj7', m: 'm9' } };
// The break's crushed edge.
const CRUSH = { id: 'bitcrusher', params: { bits: 8, downsample: 2, wet: 0.45 } };

export const DOWNTEMPO = Object.freeze({
  id: 'downtempo',
  label: 'Downtempo',
  note: '94 · slow crushed breakbeat, Rhodes, muted trumpet',
  title: '94 BPM and swung: a slow, heavy breakbeat with a crushed edge, a deep round bass, trembling Rhodes chords, soft strings, the hook on a muted trumpet, tape wear over it all. Starts as a Groove in the Moody mood, the riff\'s own drums replaced',
  bpm: 94,
  tempoRange: [90, 108],
  swing: 56,
  // The strings hold under the Rhodes through every groove section.
  padUnder: true,
  defaults: {
    mood: 'moody',
    form: { template: 'groove', doubleDrop: false, hardStop: false, keyLift: 'none' },
    drums: { source: 'replace', crashes: false, rolls: false, impact: false, fills: true, shaker: false, tambourine: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: false },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'VImaj7', 'iv9', 'V7'],
    major: ['vi9', 'IVmaj7', 'ii9', 'V7sus4'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? DEEP : {}), exciter: false,
  }])),

  centres: { saws: 'D4', pad: 'D4', piano: 'F4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    // The break, two bars: the second answers with a late kick.
    kick: ['x.....x...x.....', 'x.....x.......x.'],
    clap: '....x.......x...',
    ohats: '..............x.',
    hats16: 'x.x.x.xxx.x.x.x.',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '............x.xx', tom: '..........x.....' },
      { snare: '..........x..x..', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: 'x.xxx.xxx.xxx.xx',
      tambourine: '....x.......x...',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    // A deep bass that leaves room: held on the one, a push before three, home by the octave.
    offbeat: 'R:6 . . . . . R:2 . 5:4 . . . O:2 . R:2 .',
    rolling: 'R:3 . . R:1 . . R:2 . 5:3 . . 5:1 . . O:2 .',
    sub: 'R:8 . . . . . . . R:8 . . . . . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The Rhodes: two long chords a bar, each just after the beat.
    pianoStabs: '. . x:6 . . . . . . . x:6 . . . . .',
    arp: '0 . 1 . 2 . 1 . 0 . 2 . 3 . 2 .',
  },

  master: {
    ...BIG_ROOM.master,
    masterEffects: [
      { id: 'tape', params: { drive: 0.35, wow: 0.2, flutter: 0.15, tone: 7500, wet: 1 } },
      ...BIG_ROOM.master.masterEffects,
    ],
  },
  // Set from the sketch's solo-balanced mix (work/auditions/chill-styles/downtempo.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, effects: [CRUSH] },
    clap: { gain: 7, send: { reverb: 0.35 }, effects: [CRUSH] },
    snare: { gain: 3, send: { reverb: 0.35 }, effects: [CRUSH] },
    hats: { gain: 3, pan: -0.2, effects: [CRUSH] },
    ohats: { gain: -6, pan: 0.2 },
    crash: { gain: -10, pan: 0.25, send: { reverb: 0.5 } },
    fill: { gain: -4, pan: 0.3, send: { reverb: 0.35 } },
    shaker: { gain: -12, pan: 0.3 },
    tambourine: { gain: -10, pan: -0.3 },
    ride: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: 0 },
    sub: { gain: -14 },
    hook: { gain: -2, pan: 0.15, send: { delay: 0.3, reverb: 0.6 } },
    bell: { gain: -10, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    counter: { gain: -6, pan: -0.2, send: { delay: 0.3, reverb: 0.5 } },
    third: { gain: -8, pan: 0.15, send: { reverb: 0.4 } },
    // The Rhodes, trembling.
    piano: { gain: 1.5, pan: -0.15, send: { reverb: 0.3 }, effects: [{ id: 'tremolo', params: { frequency: 4, depth: 0.4, wet: 1 } }] },
    pad: { gain: -3, eq: { low: -3 }, send: { reverb: 0.6 } },
    choir: { gain: -8, send: { reverb: 0.7 } },
    arp: { gain: -10, pan: -0.25, send: { delay: 0.3, reverb: 0.4 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE Break', piano: 'KEYS Rhodes', pad: 'STRINGS', saws: 'STRINGS', hook: 'HOOK',
  },
});
