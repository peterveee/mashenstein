// RAVE — 9 Oct 2026 (docs/LAB_STYLES_PLAN.md).
//
// Breakbeat hardcore, written from the general idea of the genre and the rave-hardcore sketch
// Peter heard (work/local/_rave-sketches.mjs), not checked against the records — Peter's ear
// wins over anything here. 140: a kick on every beat with a programmed break riding on top of
// it — the backbeat and its GHOST notes (`g` in a pattern, struck softer: theory.js P) — a deep
// sub pulsing on a 3-3-2, and the rave stab as CHORD MEMORY, one minor-seventh shape moved whole
// onto every root (`chordMemory`). The hook is doubled by the hoover, swooping between notes.
// The Club form: snare-roll builds, drops, a breakdown on the stab, the hoover crashing back in.
// Data only, like big-room.js; the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const RAVE = Object.freeze({
  id: 'rave',
  label: 'Rave',
  machineGunSweep: true,
  note: '140 · breakbeat over four-on-the-floor, hoover, rave stabs',
  title: '140 BPM breakbeat hardcore: a kick on every beat with a break and its ghost notes on top, a deep sub on a 3-3-2, one minor-seventh stab shape moved onto every chord, and the hoover doubling the hook. The Club form, Dark by default',
  // FLAVOURS (9 Oct 2026; RAVE_FLAVOURS below): the mood picks one, the voltage now and then surprises.
  flavours: [
    { id: 'hardcore', label: 'Hardcore', note: 'A break over the kick, a deep sub, the rave stab and the hoover' },
    { id: 'happy', label: 'Happy Hardcore', note: 'Faster and brighter: four on the floor, bouncing bass, a piano riff and saw stabs' },
  ],
  flavourByMood: { uplifting: 'happy', euphoric: 'happy', sunshine: 'happy', playful: 'happy', anthemic: 'happy', heroic: 'happy' },
  bpm: 140,
  tempoRange: [134, 146],
  // The bass line is the style's signature (9 Oct 2026, Peter): a mood never swaps it for the one it
  // suggests (options.js moodBass), and later drops never lift it. A flavour still changes it where it
  // means to, and the Lab's voltage rolls still try the style's own few alternatives.
  bassFixed: true,
  // The rave stab: one shape for every chord.
  chordMemory: 'm7',
  defaults: {
    mood: 'dark',
    drums: { source: 'replace', kit: 'style', shaker: false, ride: false },
    parts: { bass: 'offbeat', sub: false, chords: 'stabs', square: true, bell: false, octaveDouble: false, arp: false, choir: false },
    fx: { pump: false },
  },

  progressions: BIG_ROOM.progressions,
  breakdown: {
    minor: ['i7', 'VI', 'iv7', 'v7'],
    major: ['vi7', 'IV', 'ii7', 'iii7'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  moods: Object.fromEntries(Object.entries(BIG_ROOM.moods).map(([id, m]) => [id, { ...m, exciter: false }])),

  // The stab in the middle, the hoover's hook low (its saw an octave under that), the sub from C1.
  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'D5', bassFloor: 'C1', subFloor: 'C1' },
  tempoFeel: 'four',

  drums: {
    kick: 'x...x...x...x...',
    // The break over the kick: the backbeat, and the ghosts around it (`g`), two bars that answer.
    clap: ['....x..g.g....g.', '..g.x..g.g..x.g.'],
    ohats: '..x...x...x...x.',
    hats16: 'x.xxx.xxx.xxx.xx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    // The roll climbs out of the break: its pushes first, then eighths, then the break's sixteenths.
    rolls: ['x...x..xx...x..x', 'x.x.x.x.x.x.x.x.', 'x.xxx.xxx.xxx.xx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'],
    rollSwell: BIG_ROOM.drums.rollSwell,
    fills: [
      { snare: '..........x.xxxx', tom: '........x.x.x...' },
      { snare: '........x.g.x.xx', tom: '............x.x.' },
      { snare: '..g.....x.xxxxxx', tom: '........x.......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: BIG_ROOM.drums.perc,
  },

  rhythms: {
    // The sub on a 3-3-2, every bar.
    offbeat: 'R:3 . . R:3 . . R:2 . R:3 . . R:3 . . R:2 .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:3 . . R:3 . . R:2 . R:3 . . R:3 . . R:2 .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // The rave stab on the 3-3-2, a beat's push at the end.
    pianoStabs: 'x:2 . . x:2 . . x:2 . . . x:2 . x:2 . . .',
    arp: '0 1 2 3 2 1 0 1 2 3 4 3 2 1 2 3',
  },

  master: BIG_ROOM.master,
  // From the rave-hardcore sketch's solo-balanced mix (work/auditions/rave-styles/rave-hardcore.mix.json).
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0.5, eq: { low: -2 } },
    snare: { gain: 2, eq: { high: 3 }, send: { reverb: 0.15 } },
    clap: { gain: 0, send: { reverb: 0.25 } },
    hats: { gain: -5, pan: 0.2 },
    ohats: { gain: -8, pan: -0.2 },
    bass: { gain: -6 },
    sub: { gain: -10 },
    // The hoover doubling the hook.
    square: { gain: -3, pan: 0, send: { reverb: 0.25 } },
    megaSaw: { gain: -6, pan: -0.1, send: { delay: 0.15, reverb: 0.25 } },
    // The rave stab.
    saws: { gain: -4, pan: 0.1, send: { delay: 0.3, reverb: 0.3 } },
  },
  // After the levels (levels.js roleGainDb): the rave stab and the lead up (Peter, 9 Oct 2026: stabs
  // "a little soft", "stabs as leads are too soft").
  balance: { riffTrimDb: -1, roleGainDb: { saws: 2, piano: 2 } },
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    bass: 'SUB', square: 'HOOVER', megaSaw: 'HOOVER 8VA', saws: 'RAVE STAB', snare: 'BREAK',
  },
});

// ---- the flavours (flavours.js), from work/local/_rave-sketches.mjs (9 Oct 2026)
export const RAVE_FLAVOURS = Object.freeze([
  {
    // HAPPY HARDCORE — 170. Four on the floor flat out, no break, off-beat open hats; a bouncing
    // off-beat bass; a bright piano riff on the chords (voiced to the key — no chord memory), and saw
    // stabs doubling the hook.
    id: 'happy', label: 'Happy Hardcore',
    remapParts: { chords: { stabs: 'piano' } },
    recipe: {
      bpm: 170,
      tempoRange: [165, 178],
      chordMemory: null,
      drums: {
        ...RAVE.drums,
        clap: '....x.......x...',
        hats16: 'xxxxxxxxxxxxxxxx',
      },
      rhythms: {
        ...RAVE.rhythms,
        offbeat: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
        pianoStabs: 'x:2 . . x:2 . . x:2 . . . x:2 . x:2 . . .',
      },
      centres: { ...RAVE.centres, piano: 'C5', bassFloor: 'E1' },
      strips: {
        ...RAVE.strips,
        bass: { gain: -5, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1400, Q: 1 } }] },
        piano: { gain: -3, pan: -0.1, send: { reverb: 0.3 } },
        square: { gain: -5, pan: 0.1, send: { delay: 0.2, reverb: 0.35 } },
      },
      labels: { ...RAVE.labels, bass: 'BASS Off-Beat', piano: 'PIANO', square: 'SAW STAB', snare: 'SNARE' },
    },
  },
]);
