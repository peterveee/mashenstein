// AFRO HOUSE — 6 Oct 2026.
//
// Peter liked three of the Afro sketches (work/local/_afro-sketches.mjs, WAVs in
// work/auditions/afro-styles/) — Afro House, Melodic Afro and Afro Tech — and wanted ONE style,
// not three: they share their core. So the core is the style, ORGANIC is its own arrangement,
// and MELODIC and TECH are its FLAVOURS (flavours.js) — other arrangements a take can turn out
// to be. The MOOD picks which (`flavourByMood`): Moody is organic, Uplifting melodic, Dark tech.
// The Lab sometimes lands on another one, more often the higher the voltage.
//
//   · ORGANIC (here): a minor-seventh pad, a kalimba hook, choir answers, djembe tones on a
//     3-3-2 and slaps, a shekere, a warm syncopated bass
//   · MELODIC: each chord held two bars, a rolling sixteenth bass, a plucked arp from the
//     first bar, the pan flute on the hook, a Glass Choir pad, congas, rim and shaker
//   · TECH: one chord nearly all the way, an off-beat clav stab (Chords = Pad plays as Piano
//     Stabs), a syncopated mono bass, tribal toms and an agogô
//
// All three: four on the floor, a talking drum calling into each eight (the fill slot), Club-
// shaped with no snare roll, riser, stutter or key lift — every build opens through a low-pass.
// Written from the general idea of the sound, not checked against records. Data only.
import { BIG_ROOM } from './big-room.js';
import { twoBarChords, holdTheOne } from './flavours.js';

export const AFRO_HOUSE = Object.freeze({
  id: 'afro-house',
  label: 'Afro House',
  note: '122 · djembe, shekere, talking drum; mood sets the flavour',
  title: '122 BPM with a light swing: four on the floor under djembe, shekere and a talking drum. The mood picks the flavour — Moody is organic (kalimba, pad, choir), Uplifting and Euphoric melodic (two-bar chords, rolling bass, arp, pan flute), Dark and Hypnotic tech (one chord, clav stabs, mono bass, toms). Starts on the Club form in the Moody mood',
  bpm: 122,
  tempoRange: [118, 126],
  swing: 52,
  defaults: {
    mood: 'moody',
    form: { template: 'club', doubleDrop: false, hardStop: false, keyLift: 'none' },
    drums: { rolls: false, impact: false, shaker: false, tambourine: true, congas: true, cowbell: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'pad', square: false, bell: false, octaveDouble: false, arp: true, choir: false, counter: true },
    fx: { riser: false, filterBuild: true, stutter: false, pump: false, delayThrows: true },
  },
  // The hand drums are the groove: in from the first bar of a drop. The arp joins on the second eight.
  enter: { perc: 0, arp: 1 },
  // Its arrangements (flavours.js): its own first, then AFRO_HOUSE_FLAVOURS below.
  flavours: [
    { id: 'organic', label: 'Organic', note: 'Kalimba, a minor-seventh pad, choir answers, djembe and shekere' },
    { id: 'melodic', label: 'Melodic', note: 'Two-bar chords, a rolling bass, a plucked arp, the pan flute' },
    { id: 'tech', label: 'Tech', note: 'One chord, off-beat clav stabs, a mono bass, tribal toms' },
  ],
  // Which the mood plays; a mood not named plays the style's own (organic).
  flavourByMood: {
    uplifting: 'melodic', euphoric: 'melodic', dreamy: 'melodic', wonder: 'melodic', sunshine: 'melodic', anthemic: 'melodic', heroic: 'melodic',
    dark: 'tech', hypnotic: 'tech', gothic: 'tech', boss: 'tech', flamenco: 'tech', mystery: 'tech',
  },

  progressions: {
    ...BIG_ROOM.progressions,
    // Organic: the i–iv vamp, home by VI–v.
    moody: {
      minor: [['i'], ['i'], ['iv'], ['iv'], ['i'], ['i'], ['VI'], ['v']],
      major: [['vi'], ['vi'], ['ii'], ['ii'], ['vi'], ['vi'], ['IV'], ['iii']],
    },
  },
  breakdown: {
    minor: ['i9', 'iv9', 'VImaj7', 'v7'],
    major: ['vi9', 'ii9', 'IVmaj7', 'iii7'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The pad in the middle, the kalimba and flute above it, the bass from E1.
  centres: { saws: 'E4', pad: 'E4', piano: 'A4', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'C1' },
  tempoFeel: 'four',

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    // The shekere (the style kit's hats).
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // The talking drum calling into the next eight (the fill kit slot).
    fills: [
      { snare: '................', tom: '............x.x.' },
      { snare: '................', tom: '..........x..x..' },
      { snare: '............x...', tom: '........x.....x.' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      ...BIG_ROOM.drums.perc,
      shaker: 'xxxxxxxxxxxxxxxx',
      // Djembe slaps (the tambourine slot).
      tambourine: '......x.......x.',
      // Djembe tones on the 3-3-2 (the congas slot).
      congas: 'x..x..x...x..x..',
      // The agogô's bell pattern (the cowbell slot).
      cowbell: 'x.x.xx.x.x.x.xx.',
    },
  },

  rhythms: {
    // Pushed around the kick, a seventh leading back.
    offbeat: 'R:3 . . R:1 . . 5:2 . . . R:2 . . 7:1 R:2 .',
    rolling: '. R:1 R:1 . R:1 R:1 . R:1 . R:1 R:1 . R:1 R:1 . O:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . . x:1 . . x:1 . . . . x:1 . . . .',
    arp: '0 1 2 1 3 2 1 2 0 1 2 1 3 2 4 2',
  },

  master: BIG_ROOM.master,
  // Set from the Afro House sketch's solo-balanced mix (work/auditions/afro-styles/afro-house.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0 },
    clap: { gain: 2, send: { reverb: 0.3 } },
    snare: { gain: -4, send: { reverb: 0.3 } },
    hats: { gain: -4, pan: -0.2 },
    ohats: { gain: -6.5, pan: 0.2 },
    crash: { gain: -10, pan: 0.2, send: { reverb: 0.6 } },
    fill: { gain: -3, pan: -0.3, send: { delay: 0.25, reverb: 0.3 } },
    shaker: { gain: -14, pan: 0.3 },
    tambourine: { gain: -4, pan: -0.3, send: { reverb: 0.25 } },
    congas: { gain: -1, pan: 0.3, send: { reverb: 0.2 } },
    cowbell: { gain: -12, pan: 0.3, send: { delay: 0.15 } },
    bass: { gain: -1 },
    sub: { gain: -14 },
    hook: { gain: -3.5, pan: 0.1, send: { delay: 0.3, reverb: 0.35 } },
    megaSaw: { gain: -10, send: { delay: 0.2, reverb: 0.45 } },
    counter: { gain: -10, pan: -0.15, send: { delay: 0.2, reverb: 0.6 } },
    arp: { gain: -12, pan: -0.2, send: { delay: 0.35, reverb: 0.4 } },
    pad: { gain: -4, eq: { low: -5 }, send: { reverb: 0.5 } },
    piano: { gain: -8, pan: 0.1, send: { delay: 0.3, reverb: 0.35 } },
    choir: { gain: -8, send: { reverb: 0.6 } },
  },
  pump: { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.4 } },
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    hats: 'SHEKERE', congas: 'DJEMBE Tone', tambourine: 'DJEMBE Slap', cowbell: 'AGOGO', fill: 'TALKING DRUM',
    shaker: 'PERC Shekere', pad: 'PAD', saws: 'CHORDS Pad', megaSaw: 'LEAD 8VA',
  },
});

// ---- the flavours (flavours.js): what each lays over the style
const ORGANIC = AFRO_HOUSE;
export const AFRO_HOUSE_FLAVOURS = Object.freeze([
  {
    // From the Melodic Afro sketch (work/auditions/afro-styles/melodic-afro.mix.json).
    id: 'melodic', label: 'Melodic',
    reshape: twoBarChords,
    recipe: {
      bpm: 120,
      enter: { perc: 0, arp: 0 },
      drums: {
        ...ORGANIC.drums,
        // A shaker on the off-beat sixteenths (the style kit's hats).
        hats16: '.x.x.x.x.x.x.x.x',
        hats8: '..x...x...x...x.',
        perc: { ...ORGANIC.drums.perc, tambourine: '..x..x....x..x..', congas: '......x...x...x.' },
      },
      // The rolling bass is the melodic one's own (Bass = Off-Beat plays it).
      rhythms: { ...ORGANIC.rhythms, offbeat: ORGANIC.rhythms.rolling, arp: '0 1 2 1 3 2 1 2 0 1 2 1 3 2 4 2' },
      strips: {
        ...ORGANIC.strips,
        clap: { gain: 1.5, send: { reverb: 0.35 } },
        hats: { gain: -6, pan: 0.25 },
        tambourine: { gain: -7, pan: -0.25, send: { reverb: 0.2 } },
        congas: { gain: -8.5, pan: 0.3, send: { reverb: 0.2 } },
        bass: { gain: 0, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1100, Q: 0.8 } }] },
        pad: { gain: -5.5, eq: { low: -5 }, send: { reverb: 0.6 } },
        arp: { gain: -9, pan: -0.2, send: { delay: 0.35, reverb: 0.4 } },
        hook: { gain: -5, pan: 0.1, send: { delay: 0.25, reverb: 0.5 } },
      },
      labels: { ...ORGANIC.labels, hats: 'SHAKER', shaker: 'PERC Shaker', tambourine: 'CLAVE', congas: 'CONGA', bass: 'BASS Rolling', arp: 'ARP Pluck' },
    },
  },
  {
    // From the Afro Tech sketch (work/auditions/afro-styles/afro-tech.mix.json).
    id: 'tech', label: 'Tech',
    reshape: holdTheOne,
    // The pad becomes the off-beat stab.
    remapParts: { chords: { pad: 'piano' } },
    recipe: {
      bpm: 124,
      drums: {
        ...ORGANIC.drums,
        hats16: 'x.xxx.xxx.xxx.xx',
        perc: { ...ORGANIC.drums.perc, tambourine: '..x..x..x..x.x..', congas: 'x..x..x.....x...' },
      },
      rhythms: { ...ORGANIC.rhythms, offbeat: 'R:1 . R:1 R:1 . R:1 . . R:1 . R:1 O:1 . R:1 . 5:1' },
      strips: {
        ...ORGANIC.strips,
        clap: { gain: 2.5, send: { reverb: 0.3 } },
        tambourine: { gain: -12, pan: 0.3, send: { delay: 0.15 } },
        congas: { gain: -6, pan: 0.15, send: { reverb: 0.2 } },
        bass: { gain: 1, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 900, Q: 2 } }] },
        piano: { gain: -3.5, pan: 0.1, send: { delay: 0.3, reverb: 0.35 } },
      },
      labels: { ...ORGANIC.labels, tambourine: 'AGOGO', congas: 'TOMS Tribal', piano: 'STAB', bass: 'BASS Mono' },
    },
  },
]);

