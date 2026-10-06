// DRUM & BASS — the ninth recipe. 3 Oct 2026.
//
// Liquid-leaning drum & bass, written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 174, and every bar feels
// like two: the two-step beat (the kick on the one and the "and" of three, the snare on
// two and four) with a ghost kick and a ghost snare on the second bar, shuffling sixteenth
// hats, a reese bass holding two notes a bar over a sine sub, held pads instead of pumping
// supersaws, a pluck doubling the hook, a glass bell an octave over it. The riff's own
// drums are replaced by default: a four-on-the-floor riff would undo the two-step. Data
// only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';
import { holdTheOne } from './flavours.js';

const SEVENTHS = { colour: { '': 'maj7', m: 'm9' } };

export const DNB = Object.freeze({
  id: 'dnb',
  label: 'Drum & Bass',
  note: '174 · two-step breaks, reese bass, held pads',
  title: '174 BPM: the two-step beat with ghost notes, shuffling hats, a reese bass under held pads, a pluck doubling the hook. Moody by default, the riff\'s own drums replaced',
  bpm: 174,
  // FLAVOURS (6 Oct 2026, flavours.js; DNB_FLAVOURS below): the mood picks one.
  flavours: [
    { id: 'rolling', label: 'Rolling', note: 'Two-step, a reese holding two notes a bar, held pads, a pluck' },
    { id: 'liquid', label: 'Liquid', note: 'Soulful: a round sub, Rhodes in sevenths and ninths, an airy pad' },
    { id: 'neuro', label: 'Neuro', note: 'Technical: a reese in jabs, a growl biting, clipped stabs, one chord' },
  ],
  flavourByMood: {
    nostalgic: 'liquid', dreamy: 'liquid', lofi: 'liquid', bittersweet: 'liquid', lounge: 'liquid', soulful: 'liquid', uplifting: 'liquid',
    dark: 'neuro', gothic: 'neuro', boss: 'neuro', hypnotic: 'neuro', flamenco: 'neuro', mystery: 'neuro',
  },
  tempoRange: [166, 178],
  defaults: {
    mood: 'moody',
    drums: { source: 'replace', shaker: false, ride: true },
    parts: { bass: 'reese', chords: 'pad', octaveDouble: false },
    fx: { pump: false },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'VImaj9', 'iv9', 'v7'],
    major: ['IVmaj9', 'iii7', 'vi9', 'Vsus4'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // Big-room's moods, with sevenths and ninths wherever they were plain triads.
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? SEVENTHS : {}),
  }])),

  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'E5', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    // The two-step: the kick on the one and the "and" of three, a ghost kick before the
    // second bar's backbeat; the snare on two and four, a ghost on the second bar's "a".
    kick: ['x.........x.....', 'x.........x..x..'],
    clap: ['....x.......x...', '....x.......x..x'],
    ohats: ['..............x.', '......x.........'],
    // Shuffling sixteenths: the beat's own skip, not a straight line.
    hats16: ['x.xxx.x.x.xxx.xx', 'x.xxx.x.x.xxxxx.'],
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    // The roll from the backbeat through dotted eighths and the gallop to sixteenths,
    // stopping dead half a bar before the drop.
    rolls: ['....x.......x...', 'x..x..x..x..x.x.', 'x.xxx.xxx.xxx.xx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxx........'],
    rollSwell: { from: -8, shape: 'even' },
    fills: [
      { snare: '..........x.x.xx', tom: '........x.......' },
      { snare: '........x..x.xxx', tom: '..........x.....' },
      { snare: '............xxxx', tom: '........x.x.....' },
    ],
    halfKick: 'x...............',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: 'x.xxx.x.x.xxx.xx',
      tambourine: '....x.......x...',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    // Off-Beat here is the two-step bass: under the kicks, held over.
    offbeat: 'R:6 . . . . . . . . . R:6 . . . . .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:8 . . . . . . . R:8 . . . . . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . . . . . x:2 . . . . . . . x:2 .',
    arp: '0 1 2 3 4 3 2 1 0 2 1 3 2 4 3 2',
  },

  master: {
    master: 0,
    masterEffects: BIG_ROOM.master.masterEffects,
    fx: { reverb: { decay: 3.4 } },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: -1 } },
    // The backbeat snare is the loudest thing in the kit.
    clap: { gain: 2, eq: { high: 2 }, send: { reverb: 0.25 } },
    snare: { gain: 1, eq: { high: 2 }, send: { reverb: 0.3 } },
    hats: { gain: -6, pan: 0.2 },
    ohats: { gain: -10, pan: -0.15 },
    ride: { gain: -14, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -6, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1800, Q: 0.9 } }] },
    sub: { gain: -7 },
    square: { gain: -3, pan: 0.05, send: { delay: 0.2, reverb: 0.35 } },
    bell: { gain: -8, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    pad: { gain: -5, send: { reverb: 0.6 } },
    choir: { gain: -8, send: { reverb: 0.65 } },
    arp: { gain: -12, pan: -0.25, send: { delay: 0.25, reverb: 0.3 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE Two-Step', snare: 'SNARE Roll', bass: 'BASS Reese', square: 'HOOK PLUCK', bell: 'HOOK 8VA',
    pad: 'PAD', saws: 'CHORDS',
  },
});

// ---- the flavours (flavours.js), from work/local/_flavour-sketches.mjs (6 Oct 2026)
// Every plain chord a seventh, every minor a ninth: liquid never plays a bare triad.
const SOUL = (m) => ({ ...m, colour: { '': 'maj7', m: 'm9', ...Object.fromEntries(Object.entries(m.colour || {}).filter(([, v]) => v && v !== 'm')) } });
export const DNB_FLAVOURS = Object.freeze([
  {
    // LIQUID — a round sub holding long notes (Bass = Reese plays the two-step sub), Rhodes
    // chords in sevenths and ninths (the pad becomes the Rhodes, the pad held under it), a
    // breathy hook.
    id: 'liquid', label: 'Liquid',
    recolour: SOUL,
    remapParts: { bass: { reese: 'offbeat' }, chords: { pad: 'piano' } },
    recipe: {
      padUnder: true,
      rhythms: {
        ...DNB.rhythms,
        offbeat: 'R:6 . . . . . R:2 . . . R:4 . . . 5:2 .',
        pianoStabs: 'x:3 . . . . . x:2 . . . x:4 . . . . .',
      },
      centres: { ...DNB.centres, bassFloor: 'C1', piano: 'E4', pad: 'A4' },
      strips: {
        ...DNB.strips,
        bass: { gain: 0 },
        piano: { gain: -3, pan: -0.1, send: { delay: 0.2, reverb: 0.35 }, effects: [{ id: 'chorus', params: { wet: 0.3 } }] },
        pad: { gain: -9, eq: { low: -6 }, send: { reverb: 0.6 } },
        hook: { gain: -4, send: { delay: 0.3, reverb: 0.6 } },
      },
      labels: { ...DNB.labels, bass: 'BASS Round', piano: 'RHODES', pad: 'PAD Air' },
    },
  },
  {
    // NEURO — a reese in sixteenth jabs (Bass = Reese plays them), a growl biting on the
    // off-beats (the Sub, on), a clipped stab (the pad becomes stabs), one chord for six bars,
    // a tight two-step.
    id: 'neuro', label: 'Neuro',
    reshape: holdTheOne,
    remapParts: { bass: { reese: 'offbeat' }, chords: { pad: 'piano' } },
    remap: { parts: { sub: { false: true } } },
    recipe: {
      // The Machine-Gun Sweep now and then into a drop (fx.js): Neuro only — at 174 its
      // thirty-seconds buzz, which suits the jabs and not Liquid's or Rolling's soul.
      machineGunSweep: true,
      drums: {
        ...DNB.drums,
        kick: ['x.........x.....', 'x.x.......x.....'],
        clap: '....x.......x...',
        hats16: 'x.x.x.x.x.x.x.x.',
      },
      rhythms: {
        ...DNB.rhythms,
        offbeat: 'R:1 . R:1 . . R:2 . R:1 R:1 . . R:2 . . R:1 .',
        subOff: '. . . . . . O:1 . . . . . . O:1 . O:1',
        pianoStabs: '. . x:1 . . . . . . . x:1 . . . . .',
      },
      centres: { ...DNB.centres, subFloor: 'E1' },
      strips: {
        ...DNB.strips,
        bass: { gain: -1, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1200, Q: 1.2 } }] },
        sub: { gain: -6, effects: [{ id: 'filter', params: { type: 'bandpass', frequency: 900, Q: 1.5 } }] },
        piano: { gain: -6, pan: 0.2, send: { delay: 0.3, reverb: 0.25 } },
      },
      labels: { ...DNB.labels, bass: 'BASS Reese', sub: 'GROWL', piano: 'STAB' },
    },
  },
]);
