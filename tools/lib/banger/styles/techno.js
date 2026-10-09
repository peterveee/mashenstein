// TECHNO — 9 Oct 2026 (docs/LAB_STYLES_PLAN.md).
//
// Detroit's side of it, written from the general idea of the genre and the electro-detroit
// sketch Peter heard (work/local/_rave-sketches.mjs), not checked against the records — Peter's
// ear wins over anything here. 128: a 909 four on the floor, swung sixteenth hats, a ride later
// on; a sequenced bass rolling in sixteenths; warm strings held under, and the stab played as
// CHORD MEMORY — one minor-ninth shape moved whole onto every chord's root (`chordMemory`,
// theory.js voicing), wherever that takes it out of the key. Long phrases and no festival drop:
// a Groove by default, its tension in the stab's filter rising and falling across every eight
// bars (`filterMoves`, fx.js). Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const TECHNO = Object.freeze({
  id: 'techno',
  label: 'Techno',
  note: '128 · 909, strings, chord-memory stabs',
  title: '128 BPM: a 909 four on the floor with swung hats, a sequenced bass rolling in sixteenths, warm strings held under, and one minor-ninth stab shape moved whole onto every chord, its filter rising and falling across each phrase. A Groove in the Moody mood: no drops',
  // FLAVOURS (9 Oct 2026; TECHNO_FLAVOURS below): the mood picks one, the voltage now and then surprises.
  flavours: [
    { id: 'detroit', label: 'Detroit', note: 'Strings, a sequenced bass and chord-memory stabs' },
    { id: 'acid', label: 'Acid Techno', note: 'Harder and faster: the 303 distorted and relentless, no chords' },
  ],
  flavourByMood: { dark: 'acid', hypnotic: 'acid', boss: 'acid' },
  bpm: 128,
  tempoRange: [122, 134],
  // The bass line is the style's signature (9 Oct 2026, Peter): a mood never swaps it for the one it
  // suggests (options.js moodBass), and later drops never lift it. A flavour still changes it where it
  // means to, and the Lab's voltage rolls still try the style's own few alternatives.
  bassFixed: true,
  swing: 54,
  // One shape for every stab: the chord-memory button.
  chordMemory: 'm9',
  // The strings hold under the stabs through every groove section.
  padUnder: true,
  defaults: {
    mood: 'moody',
    form: { template: 'groove', doubleDrop: false, hardStop: false, keyLift: 'none' },
    drums: { source: 'replace', kit: 'style', crashes: false, rolls: false, impact: false, fills: true, shaker: false, tambourine: false, ride: true },
    parts: { bass: 'rolling', sub: false, chords: 'stabs', square: false, bell: false, octaveDouble: false, arp: false, choir: false, counter: false },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: true },
  },
  // The stab's filter, rising and falling across every eight bars: the tension is in the filter.
  filterMoves: { saws: { shape: 'riseFall', lo: 700, hi: 9000, Q: 1.6, over: 'phrase' } },
  // The order the parts come in: kick and hats, the bass sequence, the rest of the beat with the
  // stab and the strings, the hook last.
  layers: [
    ['kick', 'hats', 'riffDrums'],
    ['bass', 'sub'],
    ['ohats', 'clap', 'snare', 'fill', 'perc', 'chords', 'arp'],
    ['riff', 'doubles'],
  ],

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'VImaj7', 'iv9', 'v7'],
    major: ['vi9', 'IVmaj7', 'ii9', 'iii7'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The stab in the middle, the strings around it, the bass from E1.
  centres: { saws: 'A4', pad: 'E4', piano: 'D4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    // Off-beat sixteenths, swung by the style's swing.
    hats16: '.x.x.x.x.x.x.x.x',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: [
      { snare: '............x.x.', tom: '..........x.....' },
      { snare: '..........x...x.', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    offbeat: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    // The sequenced bass: sixteenths with octave jumps and a seventh, gaps where the kick is.
    rolling: 'R:1 . O:1 R:1 . R:1 O:1 . R:1 . O:1 R:1 . R:1 7:1 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The stab: syncopated, off the beat.
    pianoStabs: '. . x:1 . . x:1 . . . . x:1 . . x:1 . .',
    arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 2 1 3',
  },

  master: { ...BIG_ROOM.master, fx: { reverb: { decay: 2.2 } } },
  // From the electro-detroit sketch's solo-balanced mix (work/auditions/rave-styles/electro-detroit.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: 1 } },
    clap: { gain: -1, send: { reverb: 0.3 } },
    snare: { gain: -2, send: { reverb: 0.3 } },
    hats: { gain: -6, pan: 0.2 },
    ohats: { gain: -8, pan: -0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.5 } },
    ride: { gain: -13, pan: 0.3 },
    fill: { gain: -6, pan: 0.2, send: { reverb: 0.3 } },
    // About 5 LU under the kick (it was 2 over: Peter, 9 Oct 2026, "bass DOMINATING").
    bass: { gain: -11.5, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 900, Q: 2 } }] },
    sub: { gain: -14 },
    hook: { gain: -2, pan: -0.05, send: { delay: 0.25, reverb: 0.35 } },
    // The chord-memory stab.
    saws: { gain: -6, pan: -0.1, send: { delay: 0.35, reverb: 0.35 } },
    pad: { gain: -8, eq: { low: -6 }, send: { reverb: 0.55 } },
    arp: { gain: -12, pan: -0.25, send: { delay: 0.3, reverb: 0.3 } },
  },
  // After the levels (levels.js roleGainDb): the chord-memory stab up (Peter, 9 Oct 2026: "a little soft").
  balance: { riffTrimDb: -2, roleGainDb: { saws: 3 } },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'BASS Sequence', saws: 'CHORD MEMORY Stab', pad: 'STRINGS', ride: 'PERC Ride',
  },
});

// ---- the flavours (flavours.js), from work/local/_rave-sketches.mjs (9 Oct 2026)
export const TECHNO_FLAVOURS = Object.freeze([
  {
    // ACID TECHNO — 134. Harder and darker: a punchy 909 with grinding sixteenth hats, the Acid bass
    // through a distortion, its filter tearing open and shut across every section, and no chords.
    id: 'acid', label: 'Acid Techno',
    remapParts: { bass: { rolling: 'acid' }, chords: { stabs: 'none' } },
    recipe: {
      bpm: 134,
      tempoRange: [130, 140],
      swing: 50,
      padUnder: false,
      filterMoves: { bass: { shape: 'riseFall', lo: 420, hi: 8000, Q: 4.5, over: 'section' } },
      drums: {
        ...TECHNO.drums,
        hats16: 'xxxxxxxxxxxxxxxx',
        perc: { ...TECHNO.drums.perc, cowbell: '..x..x..x..x.x..' },
      },
      centres: { ...TECHNO.centres, bassFloor: 'F1' },
      strips: {
        ...TECHNO.strips,
        hats: { gain: -5, pan: 0.2 },
        bass: { gain: -14.5, send: { delay: 0.15 }, effects: [{ id: 'distortion', params: { distortion: 0.55, wet: 0.5 } }] },
      },
      labels: { ...TECHNO.labels, bass: 'ACID 303 Dist' },
    },
  },
]);
