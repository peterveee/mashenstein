// 90s DANCE (id `eurodance`) — 5 Oct 2026. Shown as 90s Dance so it never reads as Eurobeat.
//
// Peter picked it from the pop sketches (work/local/_pop-sketches.mjs, WAVs in
// work/auditions/pop-styles/). Written from the general idea of the genre, not checked
// against the records — Peter's ear wins over anything here. Not Eurobeat (eurobeat.js:
// faster, brass and the driving octave bass): 136, a pounding 909 four on the floor, off-beat
// open hats and an off-beat bass, syncopated grand-piano stabs (Chords = Piano Stabs) with a
// string pad holding under them and pumping (`padUnder`), the hook on a supersaw, the last
// chorus in octaves. Song-shaped — a Pop Song in the Anthemic mood, its choruses the drops,
// with a riser and a snare roll into each.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const EURODANCE = Object.freeze({
  id: 'eurodance',
  label: '90s Dance',
  note: '136 · piano stabs, supersaw chorus, off-beat bass',
  title: '136 BPM: a pounding four on the floor, off-beat open hats and bass, syncopated grand-piano stabs over pumping strings, a supersaw hook and the last chorus in octaves. Starts as a Pop Song in the Anthemic mood',
  bpm: 136,
  tempoRange: [130, 142],
  // The strings hold under the piano stabs through every chorus, pumping with the kick.
  padUnder: true,
  defaults: {
    mood: 'anthemic',
    form: { template: 'pop', doubleDrop: false, hardStop: false, keyApproach: 'mood' },
    drums: { impact: false, shaker: false, tambourine: true, congas: false, ride: false },
    parts: { bass: 'offbeat', sub: true, chords: 'piano', square: false, bell: false, octaveDouble: true, arp: false, choir: false, counter: false },
    fx: { riser: true, filterBuild: false, stutter: false, pump: true, delayThrows: true },
  },
  sectionLabels: {
    build: 'Pre-Chorus', build2: 'Pre-Chorus 2', drop: 'Chorus', drop2: 'Chorus 2', drop3: 'Chorus 3', reprise: 'Last Chorus',
  },

  progressions: BIG_ROOM.progressions,
  breakdown: BIG_ROOM.breakdown,
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: BIG_ROOM.moods,

  // The piano high, where a stab cuts; the strings under it; the bass from F1.
  centres: { saws: 'A4', pad: 'D4', piano: 'D5', choir: 'A4', arp: 'D5', bassFloor: 'F1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    fills: BIG_ROOM.drums.fills,
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: BIG_ROOM.drums.perc,
  },

  rhythms: {
    // The off-beat bass, up an octave on the last off-beat.
    offbeat: '. . R:2 . . . R:2 . . . R:2 . . . O:2 .',
    rolling: BIG_ROOM.rhythms.rolling,
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The piano: the one, the "a" of one, the "and" of two, the "and" of three, the four.
    pianoStabs: 'x:2 . . x:2 . . x:2 . . . x:2 . x:2 . . .',
    arp: BIG_ROOM.rhythms.arp,
  },

  master: BIG_ROOM.master,
  // Set from the sketch's solo-balanced mix (work/auditions/pop-styles/eurodance.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0.5, eq: { low: -2 } },
    clap: { gain: 2.5, send: { reverb: 0.3 } },
    snare: { gain: -1.5, eq: { high: 3 }, send: { reverb: 0.25 } },
    hats: { gain: -2, pan: -0.15 },
    ohats: { gain: -6, pan: 0.15 },
    crash: { gain: -8.5, pan: 0.2, send: { reverb: 0.6 } },
    bass: { gain: -0.5, effects: [{ id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.3 } }] },
    sub: { gain: -12 },
    hook: { gain: -3, pan: 0, send: { delay: 0.25, reverb: 0.45 } },
    megaSaw: { gain: -7, eq: { low: -3 }, send: { reverb: 0.35 } },
    piano: { gain: -3.5, pan: -0.1, send: { reverb: 0.3 } },
    pad: { gain: -8, eq: { low: -5 }, send: { reverb: 0.5 } },
  },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    piano: 'PIANO Stabs', pad: 'STRINGS', saws: 'CHORDS Pump',
  },
});
