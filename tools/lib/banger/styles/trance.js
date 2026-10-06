// TRANCE — the second banger recipe. 2 Oct 2026.
//
// Uplifting trance, from the style notes in docs/audio/remixes.md ("Five more styles to
// try"): four on the floor at 138 with a ROLLING off-beat sixteenth bass (the gallop —
// kick, bass, bass, bass), supersaw chords chopped by a sixteenth TRANCE GATE rather than
// pumped, a long breakdown with the hook on a piano before the full supersaw lead comes
// back, snare builds into the drop, a key lift. Data only, like big-room.js: the section
// builders are shared, the sounds are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const TRANCE = Object.freeze({
  id: 'trance',
  label: 'Trance',
  // Now and then the Machine-Gun Sweep into a drop, in place of the stutter (fx.js).
  machineGunSweep: true,
  // What the Style list says beside it, and its tooltip.
  note: '138 · rolling bass, gated saws, long breakdown',
  title: '138 BPM: a rolling sixteenth bass, supersaws trance-gated in sixteenths, a long breakdown with the hook on a piano. Uplifting, Long, and the Anthem form by default',
  bpm: 138,
  tempoRange: [136, 140],
  // Trance rolls its bass, leans uplifting, and wants room for its breakdown: Long by
  // default (about three and a quarter minutes at 138).
  // The Anthem form (templates.js): one long breakdown with the hook alone, one huge drop.
  defaults: { mood: 'uplifting', length: 'long', parts: { bass: 'rolling' }, form: { template: 'anthem' } },

  // The form's natural lengths: a long intro and a long breakdown — the trance shape. When
  // a length is too short for all of it, the breakdown is the last thing given up.
  form: {
    bars: { intro: 8, breakdown: 16 },
    shrink: [
      ['intro', 4], ['drop3', 8], ['reprise', 8], ['drop2', 8], ['outro', 0], ['breakdown', 8],
      ['drop3', 0], ['drop', 8], ['false', 0], ['reprise', 0], ['intro', 0], ['build2', 0],
      ['breakdown', 0], ['drop2', 0], ['build', 0],
    ],
  },

  // Eight-bar drop walks, per mood, per mode. Trance's minor is the epic i–VI–III–VII; its
  // major the lift IV–V–vi.
  progressions: {
    anthemic: {
      minor: [['i'], ['VI'], ['III'], ['VII'], ['i'], ['VI'], ['III'], ['VII']],
      major: [['I'], ['V'], ['vi'], ['IV'], ['I'], ['V'], ['vi'], ['IV']],
    },
    uplifting: {
      minor: [['VI'], ['VII'], ['i'], ['i'], ['VI'], ['VII'], ['III'], ['VII']],
      major: [['IV'], ['V'], ['vi'], ['vi'], ['IV'], ['V'], ['I'], ['I']],
    },
    euphoric: {
      minor: [['i'], ['VII'], ['VI'], ['VII'], ['i'], ['VII'], ['VI'], ['V']],
      major: [['I'], ['iii'], ['vi'], ['IV'], ['I'], ['iii'], ['IV'], ['V']],
    },
    moody: {
      minor: [['i'], ['iv'], ['VI'], ['V'], ['i'], ['iv'], ['VI'], ['V']],
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
      minor: [['i'], ['i'], ['VI'], ['VII'], ['i'], ['i'], ['iv'], ['V']],
      major: [['I'], ['bVI'], ['bVII'], ['I'], ['I'], ['bVI'], ['bVII'], ['V']],
    },
  },
  // The long breakdown: wide, open, emotional — the ninths of trance.
  breakdown: {
    minor: ['VImaj9', 'VIIadd9', 'i9', 'IIIadd9'],
    major: ['IVmaj9', 'Vadd9', 'vi9', 'Iadd9'],
  },
  // The modes' walks are big-room's: they are the modes', not the style's.
  modeHarmony: BIG_ROOM.modeHarmony,
  // In the breakdown the hook is played as written on a piano, not at half speed on its own
  // sound — the trance breakdown — and the full supersaw lead takes it back in the drops.
  breakdownHook: 'piano',
  moods: {
    anthemic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: true, walk: 'bright' },
    uplifting: { colour: { '': 'add9', m: 'm' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': 'add9', m: 'm' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm7' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  centres: { saws: 'A4', pad: 'E4', piano: 'C5', choir: 'A4', arp: 'E5', bassFloor: 'A1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    // The snare build: quarters, eighths, sixteenths, then the last bar's hole.
    rolls: ['x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'],
    // The long trance swell: from eighteen under, on an S-curve, so it creeps then surges.
    rollSwell: { from: -18, shape: 's' },
    fills: [
      { snare: '............xxxx', tom: '........x.x.....' },
      { snare: '..........x.xxxx', tom: '........x.......' },
      { snare: '........xxxxxxxx', tom: '................' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      shaker: '..x...x...x...x.',
      tambourine: '..x...x...x...x.',
      congas: '...x..x....x.x..',
      cowbell: '..x...x..x...x..',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    offbeat: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    // The gallop: the kick takes the beat, the bass the three sixteenths after it.
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:2 . . . x:2 . . . x:2 . . . x:2 .',
    // Three against four: the trance pluck arp.
    arp: '0 1 2 0 1 2 0 1 2 0 1 2 0 1 2 3',
  },

  master: {
    master: 0,
    masterEffects: BIG_ROOM.master.masterEffects,
    fx: { reverb: { decay: 3.6 } },
  },
  strips: {
    ...BIG_ROOM.strips,
    bass: { gain: -8, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1800, Q: 0.9 } }] },
    saws: { gain: -4.1, eq: { low: -3 }, send: { delay: 0.12, reverb: 0.35 } },
    piano: { gain: -2, send: { delay: 0.18, reverb: 0.55 } },
    pad: { gain: -9.59, eq: { low: -4 }, send: { reverb: 0.6 } },
    // A touch down by ear (Peter, 3 Oct 2026: the arpeggio sat a little loud).
    arp: { gain: -11, pan: -0.2, send: { delay: 0.3, reverb: 0.3 }, effects: [{ id: 'autopanner', params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
  },
  // The trance gate: the supersaws chopped in sixteenths, a little open — not a pump.
  pump: { id: 'rhythmgate', params: { division: 0.25, gateLength: 0.55, attack: 0.002, decay: 0.04, depth: 0.9 } },
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    saws: 'CHORDS Gate', bass: 'BASS', piano: 'PIANO',
  },
});
