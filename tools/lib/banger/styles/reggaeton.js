// REGGAETON — 5 Oct 2026. The first Latin style.
//
// Peter picked it from the pop sketches (work/local/_pop-sketches.mjs, WAVs in
// work/auditions/pop-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. 92 and straight: the dembow —
// a kick on every beat, the snare on the boom-ch-boom-chick (the style kit's clap slot) —
// an 808 on the kick, a filtered pad holding the chords (Chords = Pad), the hook on a
// marimba, "aah" chops answering it (the counter-melody), congas and a shaker.
//
// FULLER (Peter, 5 Oct 2026: "a bit disappointing and bare"): the chords now ride the beat —
// an acoustic guitar strumming the 3-3-2 (Chords = Piano Stabs) with the pad held under it
// (`padUnder`) — a marimba arp in the dembow's gaps, a sweep and a boom into each chorus, the
// hook in octaves in the last one, eighth hats in the verses, and the pad, hook and chops up.
//
// THE BEAT SWITCH: every half-time bar is Latin trap instead — a half-time kick, one snare
// on three and sixteenth hats with rolls (`halfHats`). A Pop Song's middle 8 is the switch;
// Half-Time Switch, or a Half-Time Drop in the Form row, puts one in a chorus too.
// Song-shaped: a Pop Song in the Uplifting mood (i–VI–III–VII in minor), with no riser,
// roll, impact, pump or stutter — every one still a switch.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';
import { twoBarChords, holdFirstHalf } from './flavours.js';

export const REGGAETON = Object.freeze({
  id: 'reggaeton',
  label: 'Reggaeton',
  note: '96 · dembow, 808, guitar, marimba, a trap beat switch',
  title: '96 BPM: the dembow beat under an 808, a filtered pad, the hook on a marimba with vocal chops answering it — and a beat switch to Latin trap in the middle 8. Starts as a Pop Song in the Uplifting mood, the chords strummed on a guitar over the pad',
  bpm: 96,
  tempoRange: [90, 104],
  defaults: {
    mood: 'uplifting',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { rolls: false, impact: true, shaker: true, tambourine: false, congas: true, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: true, arp: true, choir: false, counter: true },
    fx: { riser: true, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  // The pad holds the chords under the guitar's strums.
  padUnder: true,
  // FLAVOURS (6 Oct 2026, flavours.js; REGGAETON_FLAVOURS below): the mood picks one.
  flavours: [
    { id: 'clasico', label: 'Clásico', note: 'The dembow, an 808, a strummed guitar and marimba' },
    { id: 'romantico', label: 'Romántico', note: 'Soft: bongos, güira, a picked guitar, two-bar chords' },
    { id: 'perreo', label: 'Perreo', note: 'Hard: a distorted 808, a loud dembow, clav stabs' },
  ],
  flavourByMood: {
    moody: 'romantico', nostalgic: 'romantico', bittersweet: 'romantico', dreamy: 'romantico', lofi: 'romantico', soulful: 'romantico', lament: 'romantico',
    dark: 'perreo', boss: 'perreo', gothic: 'perreo', hypnotic: 'perreo', flamenco: 'perreo', funky: 'perreo',
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i', 'VI', 'III', 'VII'],
    major: ['vi', 'IV', 'I', 'V'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The pad in the middle under the marimba, the 808 from E1.
  centres: { saws: 'A4', pad: 'A4', piano: 'E4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    // The dembow: the "a" of one, the "and" of two, the "a" of three, the "and" of four.
    clap: '...x..x....x..x.',
    ohats: '..............x.',
    hats16: 'x.x.x.xxx.x.x.xx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // Conga and tom runs into the next eight (the fill kit slot plays them).
    fills: [
      { snare: '...x..x.........', tom: '........x.x.xxx.' },
      { snare: '...x..x....x....', tom: '............xxxx' },
    ],
    // The beat switch: Latin trap.
    halfKick: 'x......x..x.....',
    halfClap: '........x.......',
    halfHats: ['x.x.x.x.xxxxx.x.', 'x.x.x.x.x.x.xxxx'],
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: '.x.x.x.x.x.x.x.x',
      congas: '......x...x.....',
    },
  },

  rhythms: {
    // The 808 on the kick, a pickup into the third beat.
    offbeat: 'R:3 . . . R:3 . . R:1 R:3 . . . R:3 . . .',
    rolling: 'R:2 . . R:1 . . R:2 . R:2 . . R:1 . . R:2 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The guitar's strums: the 3-3-2, twice a bar.
    pianoStabs: 'x:2 . . x:2 . . x:2 . x:2 . . x:2 . . x:2 .',
    arp: '. . 0 1 . . 2 . . . 0 1 . . 2 .',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/pop-styles/reggaeton.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    // The dembow snare.
    clap: { gain: 6, send: { reverb: 0.15 } },
    snare: { gain: -6, send: { reverb: 0.15 } },
    hats: { gain: -1, pan: -0.15 },
    ohats: { gain: -10, pan: 0.15 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    fill: { gain: -7, pan: 0.3, send: { reverb: 0.2 } },
    shaker: { gain: -8, pan: 0.3 },
    congas: { gain: -9, pan: 0.35, send: { reverb: 0.2 } },
    // The 808, its top taken off so it stays a bass.
    bass: { gain: -4, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1200, Q: 0.7 } }] },
    sub: { gain: -14 },
    hook: { gain: -5, pan: -0.1, send: { delay: 0.2, reverb: 0.25 } },
    megaSaw: { gain: -12, pan: 0.1, send: { reverb: 0.3 } },
    // The vocal chops.
    counter: { gain: -8, pan: 0.15, send: { delay: 0.35, reverb: 0.5 } },
    pad: { gain: -8, eq: { low: -6 }, send: { reverb: 0.5 }, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 3200, Q: 0.7 } }] },
    // The guitar strumming the chords.
    piano: { gain: -6, pan: -0.2, eq: { low: -3 }, send: { delay: 0.1, reverb: 0.25 } },
    arp: { gain: -11, pan: 0.25, send: { delay: 0.25, reverb: 0.3 } },
    choir: { gain: -11, send: { reverb: 0.5 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    clap: 'SNARE Dembow', bass: '808', pad: 'PAD', piano: 'GUITAR', arp: 'ARP', counter: 'VOX Chops', fill: 'FILL Perc',
    shaker: 'PERC Shaker', congas: 'PERC Congas',
    // The cowbell slot plays a clave, and the crash slot a ride.
    cowbell: 'PERC Clave', crash: 'CRASH Ride',
  },
});

// ---- the flavours (flavours.js), from work/local/_flavour-sketches.mjs (6 Oct 2026)
export const REGGAETON_FLAVOURS = Object.freeze([
  {
    // ROMÁNTICO — 92. The dembow kept light on a rim, bongos playing the martillo, a güira,
    // a nylon guitar picking the chords (the arp) over a warm pad (Chords = Piano Stabs
    // plays as Pad), a round bass on the 3-3-2, every chord held two bars.
    id: 'romantico', label: 'Romántico',
    reshape: twoBarChords,
    remapParts: { chords: { piano: 'pad' } },
    // No sweep and no boom: it eases into a chorus.
    remap: { fx: { riser: { true: false } }, drums: { impact: { true: false } } },
    recipe: {
      bpm: 92,
      tempoRange: [90, 98],
      enter: { arp: 0 },
      drums: {
        ...REGGAETON.drums,
        hats16: 'x.x.x.x.x.x.x.x.',
        hats8: 'x...x...x...x...',
        perc: { ...REGGAETON.drums.perc, shaker: 'x.x.x.x.x.x.x.x.', congas: 'x.xxx.xxx.xxx.xx' },
        fills: [
          { snare: '................', tom: '......x.......x.' },
          { snare: '................', tom: '......x.....x.x.' },
        ],
      },
      rhythms: { ...REGGAETON.rhythms, offbeat: 'R:3 . . R:3 . . R:2 . R:3 . . R:3 . . 5:2 .', arp: '0 . 1 2 . 1 2 . 0 . 1 2 . 1 3 .' },
      centres: { ...REGGAETON.centres, arp: 'E4', pad: 'E4' },
      strips: {
        ...REGGAETON.strips,
        clap: { gain: 1, pan: 0.1, send: { reverb: 0.2 } },
        snare: { gain: -10, send: { reverb: 0.2 } },
        hats: { gain: -6, pan: -0.25 },
        shaker: { gain: -12, pan: 0.25 },
        congas: { gain: -5, pan: 0.3, send: { reverb: 0.15 } },
        fill: { gain: -5, pan: 0.35, send: { reverb: 0.15 } },
        bass: { gain: -2 },
        arp: { gain: -4, pan: -0.2, send: { delay: 0.15, reverb: 0.3 } },
        pad: { gain: -7, eq: { low: -6 }, send: { reverb: 0.5 } },
        hook: { gain: -4, send: { delay: 0.3, reverb: 0.5 } },
      },
      labels: { ...REGGAETON.labels, clap: 'DEMBOW Clave', snare: 'CLAVE Roll', hats: 'GÜIRA', shaker: 'PERC Shaker', congas: 'BONGO Macho', fill: 'BONGO Hembra', arp: 'GUITAR Nylon', bass: 'BASS' },
    },
  },
  {
    // PERREO — 100. A distorted 808 under a kick on every beat, the dembow snare loud and dry,
    // sixteenth hats rolling, the first chord held half the walk and stabbed short on a clav
    // (the guitar's strums become stabs), and a high pluck answering itself (the arp).
    id: 'perreo', label: 'Perreo',
    reshape: holdFirstHalf,
    recipe: {
      bpm: 100,
      tempoRange: [96, 108],
      drums: {
        ...REGGAETON.drums,
        hats16: ['x.x.x.x.x.x.xxxx', 'x.x.x.x.xxx.x.x.'],
        hats8: 'x.x.x.x.x.x.x.x.',
        ohats: '..............x.',
      },
      rhythms: {
        ...REGGAETON.rhythms,
        offbeat: 'R:3 . . R:1 . . R:2 . R:4 . . . O:2 . R:2 .',
        pianoStabs: 'x:1 . . x:1 . . . . . . . x:1 . . . .',
        arp: '. . . . . . . . 0 . 1 . 2 . . 1',
      },
      strips: {
        ...REGGAETON.strips,
        clap: { gain: 8, send: { reverb: 0.1 } },
        hats: { gain: 1, pan: -0.15 },
        bass: { gain: -2, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1600, Q: 0.7 } }] },
        piano: { gain: -4, pan: 0.15, send: { delay: 0.25, reverb: 0.3 } },
        arp: { gain: -7, pan: -0.1, send: { delay: 0.3, reverb: 0.3 } },
        pad: { gain: -14, eq: { low: -6 }, send: { reverb: 0.4 } },
      },
      labels: { ...REGGAETON.labels, bass: '808 Dist', piano: 'STAB', arp: 'PLUCK Riff' },
    },
  },
]);
