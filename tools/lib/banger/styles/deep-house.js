// DEEP HOUSE — the twelfth recipe, and the first of the chill ones. 5 Oct 2026.
//
// Peter picked it from the chill sketches (work/local/_chill-sketches.mjs, 5 Oct 2026):
// written from the general idea of the genre, not checked against the records — Peter's
// ear wins over anything here. 122 with a light swing: a soft four on the floor, a clap on
// two and four, sixteenth hats around open hats on the off-beats, a shaker; a warm round
// bass syncopated around the kick; minor-ninth Rhodes stabs on the off-beats with an echo
// after them; a pad breathing with the kick; a wordless "ooh" answering the hook. No
// drops: a Groove by default — parts arriving one at a time, a drums-out dip, then leaving
// — with no riser, roll, impact, stutter or key lift, every one of them still a switch.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

// Every plain chord a seventh, every minor a ninth: deep house never plays a bare triad.
const DEEP = { colour: { '': 'maj7', m: 'm9' } };

export const DEEP_HOUSE = Object.freeze({
  id: 'deep-house',
  label: 'Deep House',
  note: '122 · soft four-on-the-floor, Rhodes stabs, no drops',
  title: '122 BPM with a light swing: a soft four on the floor, minor-ninth Rhodes stabs on the off-beats, a warm round bass, a pad breathing with the kick, an "ooh" answering the hook. Starts as a Groove in the Moody mood — no drops',
  // FLAVOURS (9 Oct 2026; DEEP_HOUSE_FLAVOURS below): the mood picks one, the voltage now and then surprises.
  flavours: [
    { id: 'deep', label: 'Deep House', note: 'Rhodes stabs, a round bass, a pad breathing with the kick' },
    { id: 'piano', label: 'Piano House', note: 'The bright end: big piano chords, an organ bass and a diva "oh"' },
  ],
  flavourByMood: { uplifting: 'piano', euphoric: 'piano', soulful: 'piano', sunshine: 'piano', anthemic: 'piano', heroic: 'piano' },
  bpm: 122,
  tempoRange: [118, 126],
  swing: 54,
  // The pad holds under the stabs through every groove section, breathing with the kick.
  padUnder: true,
  // CHORD MEMORY, by mood (9 Oct 2026, Peter): in the darker moods the stabs are one shape moved
  // onto every root — the warehouse side of deep house — and in the rest they stay voiced to the key.
  chordMemory: { moody: 'm9', mystery: 'm9', dark: 'm7', hypnotic: 'm7' },
  defaults: {
    mood: 'moody',
    // The chords come in with the second layer, at bar 9 of a Groove song (9 Oct 2026: they waited for bar 17).
    form: { template: 'groove', doubleDrop: false, hardStop: false, keyLift: 'none', chordsEarly: true },
    drums: { crashes: false, rolls: false, impact: false, fills: false, shaker: true, tambourine: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'piano', square: false, bell: false, octaveDouble: false, arp: false, choir: true, counter: true },
    fx: { riser: false, filterBuild: false, stutter: false, pump: true, delayThrows: true },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i9', 'iv9', 'VImaj7', 'v7'],
    major: ['IVmaj9', 'iii7', 'ii9', 'Vsus4'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, {
    ...m, ...(m.colour[''] === '' && m.colour.m === 'm' ? DEEP : {}), exciter: false,
  }])),

  // The stabs low in the middle (the ninth on top), the bass from E1.
  centres: { saws: 'E4', pad: 'E4', piano: 'C4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    // Sixteenths around the open hats, never on them.
    hats16: 'xx.xxx.xxx.xxx.x',
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
      shaker: 'xxxxxxxxxxxxxxxx',
      tambourine: '..x...x...x...x.',
      congas: '...x..x....x.x..',
    },
  },

  rhythms: {
    // The deep-house bass: pushed around the kick rather than between it.
    offbeat: 'R:2 . . R:1 . . 5:2 . . . R:2 . 5:1 . O:2 .',
    rolling: 'R:1 . O:1 R:1 . . 5:1 . R:1 . O:1 . . R:1 5:1 .',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The Rhodes stabs: the "a" of one, the "and" of two, the "a" of three, the "and" of four.
    pianoStabs: '. . . x:2 . . x:2 . . . . x:2 . . x:3 .',
    arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 2 1 3',
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/chill-styles/deep-house.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0, eq: { low: 1, high: -3 } },
    clap: { gain: 2.5, send: { reverb: 0.5 } },
    snare: { gain: -2, send: { reverb: 0.4 } },
    hats: { gain: -3, pan: -0.2 },
    ohats: { gain: -4.5, pan: 0.2, eq: { high: -2 } },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.6 } },
    fill: { gain: -8, pan: 0.25, send: { reverb: 0.3 } },
    shaker: { gain: -14, pan: 0.3 },
    bass: { gain: -1 },
    sub: { gain: -14 },
    hook: { gain: -1, pan: -0.05, send: { delay: 0.2, reverb: 0.35 } },
    bell: { gain: -10, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    counter: { gain: -6, pan: 0.2, send: { delay: 0.3, reverb: 0.5 } },
    // The stabs, with an echo trailing off them.
    piano: { gain: -10, pan: -0.15, send: { delay: 0.25, reverb: 0.3 }, effects: [{ id: 'chorus', params: { wet: 0.3 } }] },
    pad: { gain: -4, eq: { low: -4 }, send: { reverb: 0.5 } },
    choir: { gain: -3, pan: 0.15, send: { delay: 0.35, reverb: 0.6 } },
    arp: { gain: -12, pan: -0.25, send: { delay: 0.3, reverb: 0.3 } },
  },
  // A gentle pump: the pad breathing with the kick, not ducking under it.
  pump: { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.4 } },
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    piano: 'KEYS Stabs', pad: 'PAD', saws: 'CHORDS Pad', choir: 'CHOIR', counter: 'VOX Ooh', square: 'HOOK DOUBLE', shaker: 'PERC Shaker',
  },
});

// ---- the flavours (flavours.js), from work/local/_rave-sketches.mjs (9 Oct 2026)
export const DEEP_HOUSE_FLAVOURS = Object.freeze([
  {
    // PIANO HOUSE — 123. The bright end of house: a 909 groove with a tambourine, an organ bass
    // bouncing round the kick, big piano chords on the off-beat syncopation, a diva "oh" answering.
    id: 'piano', label: 'Piano House',
    remap: { drums: { tambourine: { false: true } } },
    recipe: {
      bpm: 123,
      tempoRange: [120, 128],
      padUnder: false,
      drums: {
        ...DEEP_HOUSE.drums,
        perc: { ...DEEP_HOUSE.drums.perc, tambourine: '....x.......x...' },
      },
      rhythms: {
        ...DEEP_HOUSE.rhythms,
        offbeat: 'R:1 . . R:1 . . O:1 . . R:1 . R:1 . . O:1 .',
        pianoStabs: '. . x:2 . . . x:1 . . x:2 . . x:2 . . .',
      },
      centres: { ...DEEP_HOUSE.centres, piano: 'G4' },
      strips: {
        ...DEEP_HOUSE.strips,
        tambourine: { gain: -12, pan: 0.3 },
        bass: { gain: -10 },
        piano: { gain: -9.5, pan: -0.1, send: { reverb: 0.3 } },
        counter: { gain: -5, pan: 0.15, send: { delay: 0.25, reverb: 0.5 } },
      },
      labels: { ...DEEP_HOUSE.labels, bass: 'ORGAN BASS', piano: 'PIANO', counter: 'VOX Diva' },
    },
  },
]);
