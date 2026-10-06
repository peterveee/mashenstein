// FUTURE BASS — the third banger recipe. 2 Oct 2026.
//
// Kawaii future bass, the way SNOW GLOBE (src/data/imported/frost-remix-snow-globe.js)
// plays it: 140 at half time — the kick on the one and the "and" of two, the clap on
// three — with hat rolls, supersaw chords STUTTERED by an eighth-note gate, an 808 under
// a talking "yoi" wobble, the hook doubled by a vowel chop with a music box an octave up,
// crystal sparkle, a bright pop grand in the breakdown, and a second drop that goes FULL
// TIME. Data only, like big-room.js; the sounds are in ../sounds.js. For the full kawaii
// sound of SNOW GLOBE on a minor riff, pick Mode = Major and Riff Notes = Fit to the Mode.
import { BIG_ROOM } from './big-room.js';

export const FUTURE_BASS = Object.freeze({
  id: 'future-bass',
  label: 'Future Bass',
  // Now and then the Machine-Gun Sweep into a drop, in place of the stutter (fx.js).
  machineGunSweep: true,
  // What the Style list says beside it, and its tooltip.
  note: '140 half time · 808, wobble, stuttered chords',
  title: '140 BPM felt at half time: hat rolls, an 808 under a talking wobble, chords stuttered in eighths, a full-time second drop. Euphoric by default',
  bpm: 140,
  tempoRange: [138, 150],
  // The half-time groove IS the style, and a riff's own backbeat on two and four would
  // undo it — so the riff's drums are replaced by default (Source Drums can bring them back).
  defaults: { mood: 'euphoric', drums: { source: 'replace' } },
  // From drop two on, the drums leave half time for four on the floor (drums.fullTime).
  fullTimeFrom: 1,
  // The sub layer is the talking wobble, not a sine: under a riff that is itself the bass
  // there is no 808, and a wobble alone is too much to stand a banger on (sections.js).
  wobbleSub: true,

  progressions: {
    anthemic: {
      minor: [['VI'], ['VII'], ['i'], ['i'], ['VI'], ['VII'], ['III'], ['VII']],
      major: [['IV'], ['V'], ['vi'], ['I'], ['IV'], ['V'], ['vi'], ['V']],
    },
    uplifting: {
      minor: [['i'], ['VI'], ['III'], ['VII'], ['i'], ['VI'], ['III'], ['VII']],
      major: [['I'], ['V'], ['vi'], ['IV'], ['I'], ['V'], ['vi'], ['IV']],
    },
    // The royal road — IV V iii vi — the kawaii progression.
    euphoric: {
      minor: [['VI'], ['VII'], ['v'], ['i'], ['VI'], ['VII'], ['i'], ['i']],
      major: [['IV'], ['V'], ['iii'], ['vi'], ['IV'], ['V'], ['I'], ['I']],
    },
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
      minor: [['i'], ['iv'], ['VI'], ['V'], ['i'], ['iv'], ['VI'], ['V']],
      major: [['I'], ['I'], ['bII'], ['I'], ['I'], ['iv'], ['bII'], ['V']],
    },
  },
  breakdown: {
    minor: ['VImaj9', 'VIIadd9', 'i9', 'IIIadd9'],
    major: ['IVmaj9', 'Vadd9', 'iii7', 'vi9'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // The breakdown is the bright pop grand playing the hook as written.
  breakdownHook: 'piano',
  // Future bass is all sevenths and ninths.
  moods: {
    anthemic: { colour: { '': 'add9', m: 'm7' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    uplifting: { colour: { '': 'add9', m: 'm7' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': 'maj7', m: 'm7' }, exciter: true, high: 3.5, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm7' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  centres: { saws: 'C5', pad: 'E4', piano: 'C5', choir: 'A4', arp: 'E5', bassFloor: 'E1', subFloor: 'A1' },

  // Future Bass stacks several hook doubles and an arp at once. Lift those parts so the
  // stack stays audible over the harmony, and leave the user-entered hook at its style
  // fader. The wide supersaw and pad chords still sit forward, so pull them back 6 dB.
  balance: {
    leadCautionDb: 0,
    riffTrimDb: 0,
    roleGainDb: { square: 2, bell: 2, megaSaw: 2, arp: 2, choir: 2, third: 2, counter: 2, saws: -6, pad: -6 },
  },

  drums: {
    // Half time, as SNOW GLOBE has it: the kick on the one and the "and" of two, answered
    // on the second bar; the clap on three.
    kick: ['x.........x.....', 'x.........x..x..'],
    clap: '........x.......',
    ohats: '..............x.',
    // Hat rolls — the second bar of each pair rolls into the next.
    hats16: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.xxxxxx', 'x.x.x.x.x.x.x.x.', 'x.x.xxx.x.x.xxxx'],
    hats8: 'x...x...x...x...',
    crash: 'x...............',
    // The snare build at half time: the backbeat, doubled, three against four in dotted
    // eighths, sixteenths — a high-pass opening under it like a pitch climbing.
    rolls: ['........x.......', '....x.......x...', 'x..x..x..x..x..x', 'xxxxxxxxxxxxxxxx', 'x.x.xxxxxxxx....'],
    rollSwell: { from: -15, shape: 'equal' },
    rollSweep: { type: 'highpass', from: 150, to: 1800, Q: 0.9 },
    fills: [
      { snare: '............xxxx', tom: '........x.x.....' },
      { snare: '........x.x.xxxx', tom: '................' },
    ],
    halfKick: 'x...............',
    halfClap: '........x.......',
    // The second drop, full time.
    fullTime: {
      kick: 'x...x...x...x...',
      clap: '....x.......x...',
      ohats: '..x...x...x...x.',
      hats16: ['xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'x.x.xxxxx.x.xxxx'],
    },
    perc: {
      shaker: 'x.x.x.x.x.x.x.x.',
      tambourine: '....x.......x...',
      congas: '...x..x....x.x..',
      cowbell: '..x...x..x...x..',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    // The 808: long notes on the one and the "and" of two.
    offbeat: 'R:10 . . . . . . . . . R:6 . . . . .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:16 . . . . . . . . . . . . . . .',
    // The wobble talks back in the gaps.
    subOff: '. . . . . . R:4 . . . R:3 . . R:3 . .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:2 . x:2 . . . x:2 . x:2 . . . . .',
    arp: '0 1 2 3 2 1 0 1 2 3 4 3 2 1 2 3',
  },

  master: {
    master: 0,
    masterEffects: BIG_ROOM.master.masterEffects,
    fx: { reverb: { decay: 3.2 } },
  },
  // The channels copied from SNOW GLOBE, and which of its channels each one was: what the
  // faders are matched against (tools/lib/banger/levels.js). The rest are big-room's.
  seed: {
    song: 'frost-remix-snow-globe', bars: [39, 46],
    lanes: {
      kick: 'kick', snare: 'snare', clap: 'clap', hats: 'hats', bass: 'bass', sub: 'bass2',
      square: 'lead', bell: 'lead2', piano: 'lead4', saws: 'chords', pad: 'chords2',
    },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: 0.5, eq: { low: -3 } },
    clap: { gain: -1, pan: -0.05, send: { reverb: 0.45 } },
    snare: { gain: 3.7, send: { reverb: 0.3 }, eq: { low: 2.8, high: 5.2 } },
    hats: { gain: -1, pan: 0.2 },
    bass: { gain: -12, effects: [{ id: 'distortion', params: { distortion: 0.3, wet: 0.45 } }] },
    sub: { gain: -3, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 5000, Q: 0.7 } }] },
    square: { gain: 0, send: { delay: 0.2, reverb: 0.35 }, eq: { mid: -2, high: 2 } },
    bell: { gain: -3, pan: 0.15, send: { delay: 0.25, reverb: 0.4 }, eq: { high: 3 } },
    saws: { gain: 4, send: { reverb: 0.25 }, eq: { low: -1, high: 4 }, effects: [{ id: 'peq', params: { f2: 450, g2: -2, q2: 0.9 } }] },
    pad: { gain: -2, send: { reverb: 0.5 }, eq: { high: 2 } },
    piano: { gain: -1, send: { delay: 0.15, reverb: 0.45 } },
  },
  // The stutter: the supersaws chopped in eighths — SNOW GLOBE's gate.
  pump: { id: 'rhythmgate', params: { division: 0.5, gateLength: 0.6, attack: 0.004, decay: 0.06, depth: 0.85 } },
  exciter: BIG_ROOM.exciter,

  labels: {
    ...BIG_ROOM.labels,
    saws: 'CHORDS Stutter', bass: 'BASS 808', sub: 'WOBBLE', square: 'HOOK DOUBLE', piano: 'PIANO',
  },
});
