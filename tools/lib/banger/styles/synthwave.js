// SYNTHWAVE — the seventh recipe. 2 Oct 2026.
//
// Outrun, the way NIGHT DRIVE (src/data/imported/field-service-night-drive.js) plays it —
// built from our own remix and docs/audio/remixes.md, not checked against the records, so
// Peter's ear wins over anything here. 118, straight and driving, an 80s film score: a
// GATED-REVERB snare (a reverb, then a noise gate), sixteenth hats, Simmons tom fills; a
// brassy mono bass in root–octave sixteenths over a sine sub; a string machine pumping on
// the beat, every chord a seventh; a crystal arp in threes against fours; the hook doubled
// on a hero lead with an ice bell an octave over it; brass stabs answering; and the last
// chorus a whole step up — the truck-driver key change.
//
// Song-shaped rather than drop-shaped: its sections are called the pre-chorus and the
// chorus, there is no double drop or hard stop, no impact. It keeps the riser, the snare
// roll and the stutter into each chorus, as NIGHT DRIVE does. Data only, like
// big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';
import { twoBarChords } from './flavours.js';

export const SYNTHWAVE = Object.freeze({
  id: 'synthwave',
  label: 'Synthwave',
  // What the Style list says beside it, and its tooltip.
  note: '118 · gated snare, root–octave bass, string machine',
  title: '118 BPM, NIGHT DRIVE\'s outrun: a gated-reverb snare, a root–octave sixteenth bass, a pumping string machine, brass stabs. Starts as a Pop Song with the last chorus a step up',
  bpm: 118,
  // FLAVOURS (6 Oct 2026, flavours.js; SYNTHWAVE_FLAVOURS below): the mood picks one. Both are
  // phone-light (no MRDR-3, no JMJR-4), so the Lab — which plays synthwave on the Light set —
  // can land on them too.
  flavours: [
    { id: 'nightdrive', label: 'Night Drive', note: 'Gated snare, a brassy root–octave bass, string machine, crystal arp' },
    { id: 'outrun', label: 'Outrun', note: 'Faster and brighter: a racing octave bass, a hero lead' },
    { id: 'darksynth', label: 'Darksynth', note: 'Heavier: half time, a huge gated snare, distorted bass, brass stabs' },
  ],
  flavourByMood: {
    uplifting: 'outrun', euphoric: 'outrun', heroic: 'outrun', sunshine: 'outrun', hopeful: 'outrun', wonder: 'outrun',
    dark: 'darksynth', gothic: 'darksynth', boss: 'darksynth', hypnotic: 'darksynth', andalusian: 'darksynth', lament: 'darksynth',
  },
  // Its bass is its signature: Bass Lifts never moves it.
  bassFixed: true,
  tempoRange: [100, 120],
  // The brass stabs (Counter-Melody) on; a chorus, a breakdown, a chorus a whole step up.
  defaults: {
    // A Pop Song (templates.js) — NIGHT DRIVE has verses, a pre-chorus and a chorus.
    form: { template: 'pop', doubleDrop: false, hardStop: false },
    drums: { impact: false, shaker: false, ride: false },
    parts: { counter: true },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  // NIGHT DRIVE's chorus moves every half bar — | Am F | C G | then | Am C | F G | — which is
  // Anthemic here.
  progressions: {
    anthemic: {
      minor: [['i', 'VI'], ['III', 'VII'], ['i', 'VI'], ['III', 'VII'], ['i', 'III'], ['VI', 'VII'], ['i', 'III'], ['VI', 'VII']],
      major: [['vi', 'IV'], ['I', 'V'], ['vi', 'IV'], ['I', 'V'], ['vi', 'I'], ['IV', 'V'], ['vi', 'I'], ['IV', 'V']],
    },
    uplifting: {
      minor: [['VI'], ['VII'], ['i'], ['i'], ['VI'], ['VII'], ['III'], ['VII']],
      major: [['IV'], ['V'], ['vi'], ['I'], ['IV'], ['V'], ['I'], ['V']],
    },
    euphoric: BIG_ROOM.progressions.euphoric,
    moody: {
      minor: [['i'], ['VI'], ['iv'], ['v'], ['i'], ['VI'], ['iv'], ['v']],
      major: [['vi'], ['IV'], ['I'], ['V'], ['vi'], ['IV'], ['iii'], ['V']],
    },
    // Heroic: the film-score victory lift, bVI–bVII–I.
    heroic: {
      minor: [['i'], ['VI'], ['VII'], ['i'], ['i'], ['VI'], ['VII'], ['V']],
      major: [['I'], ['bVI'], ['bVII'], ['I'], ['I'], ['bVI'], ['bVII'], ['V']],
    },
    // Nostalgic: the city-pop "royal road", IV–V–iii–vi, then home by ii–V.
    nostalgic: {
      minor: [['VI'], ['VII'], ['v'], ['i'], ['iv'], ['VII'], ['III'], ['III']],
      major: [['IV'], ['V'], ['iii'], ['vi'], ['ii'], ['V'], ['I'], ['I']],
    },
    // Funky: a two-chord dorian vamp, i–IV, turned round at the end.
    funky: {
      minor: [['i'], ['IV'], ['i'], ['IV'], ['i'], ['IV'], ['VII'], ['IV']],
      major: [['I'], ['IV'], ['I'], ['IV'], ['I'], ['IV'], ['ii'], ['V']],
    },
    // Gothic: the Andalusian descent (i–VII–VI–V) and a plagal iv, landing on the big V.
    gothic: {
      minor: [['i'], ['VII'], ['VI'], ['V'], ['i'], ['iv'], ['VI'], ['V']],
      major: [['I'], ['bVII'], ['bVI'], ['V'], ['I'], ['iv'], ['bVI'], ['V']],
    },
    dark: {
      minor: [['i'], ['i'], ['VI'], ['V'], ['i'], ['i'], ['iv'], ['V']],
      major: BIG_ROOM.progressions.dark.major,
    },
  },
  breakdown: {
    minor: ['i9', 'VImaj7', 'IIImaj7', 'VII'],
    major: ['vi9', 'IVmaj7', 'Imaj7', 'V'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // A chord a bar in minor with seventh and ninth colour — NIGHT DRIVE's Am7 and Fmaj7.
  moods: {
    anthemic: { colour: { '': 'maj7', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
    uplifting: { colour: { '': 'add9', m: 'm7' }, exciter: true, high: 2, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': 'maj7', m: 'm7' }, exciter: true, high: 2.5, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  // NIGHT DRIVE's registers: the string machine around F4, the brass from E4, the arp from
  // A4, the bass and the sub from E1 (A1, F1, C2).
  centres: { saws: 'F4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'A4', stabs: 'E4', bassFloor: 'E1', subFloor: 'E1' },

  drums: {
    // The chorus: four on the floor, the backbeat on two and four, sixteenth hats, open
    // hats off the beat.
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // Simmons tom runs.
    fills: [
      { snare: '............x.x.', tom: '........xxxx..x.' },
      { snare: '..........x...xx', tom: '........xx.x.x..' },
      { snare: '........x.x.x.x.', tom: '............xxxx' },
    ],
    // The verse's kick — one and three and the "and" of three — for the Half-Time Switch.
    halfKick: 'x.......x.x.....',
    halfClap: '....x.......x...',
    perc: BIG_ROOM.drums.perc,
  },

  rhythms: {
    // Root–octave sixteenths: NIGHT DRIVE's chorus bass.
    offbeat: 'R:1 R:1 O:1 R:1 R:1 R:1 O:1 R:1 R:1 R:1 O:1 R:1 R:1 R:1 O:1 R:1',
    // Rolling: the octave on every other sixteenth.
    rolling: 'R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    // The sine sub holding each half bar.
    subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:2 . . . . . . . x:2 . . . x:1 .',
    // The crystal arp: threes against fours, starting again on the half bar.
    arp: '0 1 2 0 1 2 0 1 0 1 2 0 1 2 0 1',
    // The brass stabs, NIGHT DRIVE's rhythm: the Counter-Melody switch plays these.
    counterStabs: '. . x:2 . . . . . . . x:2 . . . x:1 .',
  },

  master: {
    master: 0,
    masterEffects: [BIG_ROOM.master.masterEffects[0], { id: 'gain', params: { gain: -3.6 } }],
    fx: {},
  },
  // The channels copied from NIGHT DRIVE, and which of its channels each one was: what the
  // faders are matched against (tools/lib/banger/levels.js). Bars 45–52 are its last
  // chorus, a whole step up, the brass in. The rest are big-room's.
  seed: {
    song: 'field-service-night-drive', bars: [45, 52],
    lanes: {
      kick: 'kick', snare: 'snare', clap: 'clap', hats: 'hats', ohats: 'ohats', crash: 'crash', fill: 'tom',
      bass: 'bass', sub: 'bass2', square: 'lead', bell: 'lead2', megaSaw: 'lead3', arp: 'lead4', counter: 'lead5',
      piano: 'lead6', saws: 'chords', choir: 'chords2',
    },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: -3, eq: { low: -2 } },
    // The gated-reverb snare: a short bright room, cut off by a gate.
    snare: {
      gain: 2, eq: { high: -1.5 },
      effects: [
        { id: 'reverb', params: { decay: 1.6, preDelay: 0.005, wet: 0.55 } },
        { id: 'noisegate', params: { threshold: -34, attack: 0.002, release: 0.05 } },
      ],
    },
    clap: { gain: -3, pan: 0.1, send: { reverb: 0.25 } },
    hats: { gain: -9, pan: -0.25 },
    ohats: { gain: -11, pan: 0.25 },
    crash: { gain: -9, pan: 0.3, send: { reverb: 0.3 } },
    fill: { gain: -6, pan: 0.35, send: { reverb: 0.35 } },
    bass: { gain: -7 },
    sub: { gain: -15 },
    // The hero lead doubling the hook: NIGHT DRIVE's HOOK Hero Lead.
    square: { gain: 1, send: { delay: 0.18, reverb: 0.3 }, effects: [{ id: 'peq', params: { f3: 3200, g3: -4, q3: 0.8 } }] },
    bell: { gain: -9, pan: 0.2, send: { delay: 0.2, reverb: 0.45 } },
    // The hollow PWM lead an octave up in the later choruses: NIGHT DRIVE's verse lead.
    megaSaw: { gain: -2, pan: -0.05, send: { delay: 0.22, reverb: 0.35 }, effects: [{ id: 'chorus', params: { wet: 0.35 } }] },
    arp: {
      gain: -13, pan: -0.3, send: { delay: 0.25, reverb: 0.2 },
      effects: [{ id: 'peq', params: { f3: 3500, g3: -4, q3: 0.8 } }, { id: 'autopanner', params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }],
    },
    counter: { gain: -5.5, pan: 0.25, send: { reverb: 0.25 } },
    piano: { gain: -12, pan: -0.15, send: { reverb: 0.4 } },
    // NIGHT DRIVE's PAD String Machine, less its widener (the styles add none) and its gate
    // (the Sidechain Pump switch).
    saws: { gain: -9.47, send: { reverb: 0.439 } },
    choir: { gain: -8.54, send: { reverb: 0.804 } },
  },
  // NIGHT DRIVE's string machine pump: every beat, a slower attack than big-room's.
  pump: { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.55 } },
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    saws: 'CHORDS String Machine', counter: 'BRASS Stabs', fill: 'SIMMONS Toms', piano: 'KEYS', megaSaw: 'LEAD 8VA',
  },
});

// ---- the flavours (flavours.js), from work/local/_flavour-sketches.mjs (6 Oct 2026)
const GATED_SNARE = [
  { id: 'reverb', params: { decay: 1.8, preDelay: 0.005, wet: 0.55 } },
  { id: 'noisegate', params: { threshold: -34, attack: 0.002, release: 0.08 } },
];
export const SYNTHWAVE_FLAVOURS = Object.freeze([
  {
    // OUTRUN — 128. The octave bass racing on every other sixteenth (Bass = Off-Beat plays the
    // Rolling figure), the crystal arp from the first bar, each chord held two bars, a hero lead.
    id: 'outrun', label: 'Outrun',
    reshape: twoBarChords,
    remapParts: { bass: { offbeat: 'rolling' } },
    recipe: {
      bpm: 128,
      tempoRange: [124, 134],
      phone: true,
      enter: { arp: 0 },
      strips: {
        ...SYNTHWAVE.strips,
        bass: { gain: -5, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1800, Q: 1 } }] },
        arp: { gain: -8, pan: -0.25, send: { delay: 0.3, reverb: 0.3 } },
        hook: { gain: 1, pan: 0.05, send: { delay: 0.25, reverb: 0.4 } },
      },
      labels: { ...SYNTHWAVE.labels, bass: 'BASS Octaves', arp: 'ARP' },
    },
  },
  {
    // DARKSYNTH — 112. A half-time kick and a huge gated snare on three, a distorted bass in
    // jabs, brass stabbing the chord (the strings become stabs), the brass answering, toms
    // rolling into each eight.
    id: 'darksynth', label: 'Darksynth',
    remapParts: { chords: { saws: 'piano', pad: 'piano' } },
    // The brass is the chords now: no second brass answering them.
    remap: { parts: { counter: { true: false } } },
    recipe: {
      bpm: 112,
      tempoRange: [104, 118],
      phone: true,
      drums: {
        ...SYNTHWAVE.drums,
        kick: ['x.....x...x.....', 'x.....x...x...x.'],
        clap: '........x.......',
        ohats: '..............x.',
        hats16: 'x.x.x.x.x.x.x.x.',
        hats8: 'x...x...x...x...',
        halfKick: 'x.........x.....',
        halfClap: '........x.......',
      },
      rhythms: {
        ...SYNTHWAVE.rhythms,
        offbeat: 'R:2 . R:1 R:1 . R:1 R:2 . R:1 R:1 . R:1 R:2 . O:2 .',
        pianoStabs: 'x:2 . . . . . x:1 . . . . . . . . .',
      },
      strips: {
        ...SYNTHWAVE.strips,
        clap: { gain: 2, eq: { high: -1 }, effects: GATED_SNARE },
        snare: { gain: -2, effects: GATED_SNARE },
        bass: { gain: -4, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1400, Q: 1.5 } }] },
        piano: { gain: -5, send: { reverb: 0.4 } },
        hook: { gain: 0, send: { delay: 0.25, reverb: 0.35 } },
      },
      labels: { ...SYNTHWAVE.labels, clap: 'SNARE Gated', bass: 'BASS Dist', piano: 'BRASS Stabs' },
    },
  },
]);
