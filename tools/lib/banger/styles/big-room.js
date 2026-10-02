// BIG-ROOM HOUSE — the first banger recipe. 2 Oct 2026.
//
// ABSOLUTE ZERO (work/local/_frost-remix-absolute-zero.mjs) written down as data: the
// shape, the patterns and the mix Peter signed off on (its sounds are in ../sounds.js),
// so the generator can put any riff through it. A recipe is DATA ONLY — the section builders are shared (see
// ../index.js) — which is what makes the next style a new file beside this one rather
// than a rewrite. The banger kit, from docs/audio/remixes.md:
//
//   · a snare roll accelerating over the build, a riser into every drop
//   · four on the floor, an off-beat bass, pumping supersaw chords (rhythmgate on the beat)
//   · a crash on the one and a fill every eight bars
//   · a second drop that goes harder: an octave-up double, a key lift
//
// Peter's own edits are in here too: keys on the hook, a bright exciter on the lead, a
// loud plain-square double, loud risers and crashes with big reverb sends, a punchy snare.
//
// Chords are written as numerals against the key the banger is in — upper case major,
// lower case minor, a `b` for a borrowed root — so one table serves every key. A bar is
// one numeral, or two for a bar that changes on the half.

export const BIG_ROOM = Object.freeze({
  id: 'big-room',
  label: 'Big-Room House',
  bpm: 128,
  tempoRange: [124, 130],
  // The generator's defaults are this style's already; a later style overrides here.
  defaults: {},

  // Eight-bar drop progressions, per mood, per mode. Anthemic minor is ABSOLUTE ZERO's.
  progressions: {
    anthemic: {
      minor: [['i'], ['VI', 'VII'], ['i'], ['VI', 'VII'], ['i'], ['VI', 'VII'], ['i'], ['iv', 'V']],
      major: [['I'], ['V'], ['vi'], ['IV'], ['I'], ['V'], ['vi'], ['IV', 'V']],
    },
    uplifting: {
      minor: [['i'], ['VI'], ['III'], ['VII'], ['i'], ['VI'], ['III'], ['VII']],
      major: [['I'], ['IV'], ['vi'], ['V'], ['I'], ['IV'], ['vi'], ['V']],
    },
    euphoric: {
      minor: [['VI'], ['VII'], ['v'], ['i'], ['VI'], ['VII'], ['i'], ['VI', 'VII']],
      major: [['IV'], ['V'], ['iii'], ['vi'], ['IV'], ['V'], ['I'], ['I']],
    },
    moody: {
      minor: [['i'], ['v'], ['VI'], ['iv'], ['i'], ['v'], ['VI'], ['iv', 'v']],
      major: [['vi'], ['IV'], ['I'], ['V'], ['vi'], ['IV'], ['I'], ['V']],
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
      minor: [['i'], ['i'], ['bII'], ['i'], ['i'], ['iv'], ['bII'], ['V']],
      major: [['I'], ['bVI'], ['bVII'], ['I'], ['I'], ['bVI'], ['bVII'], ['V']],
    },
  },
  // The breakdown's four chords, re-coloured: rootless ninths over a tonic pedal.
  breakdown: {
    minor: ['i9', 'VImaj9', 'iv9', 'VIIadd9'],
    major: ['IVmaj9', 'vi9', 'Iadd9', 'Vsus4'],
  },
  // The five modes beyond major and minor: an eight-bar drop walk and a breakdown each,
  // leaning on the chord that makes the mode itself — dorian's major IV, phrygian's flat
  // II, harmonic minor's big V, mixolydian's flat VII, lydian's major II. Two of each: a
  // BRIGHT walk that leans on the mode's major chords, for Anthemic, Uplifting and
  // Euphoric, and a DARK one that leans on its minor chords, for Moody and Dark — so the
  // mood still steers the chords once a mode is picked (each mood's `walk`, below). Every
  // chord is diatonic to its mode (tests/banger.js checks), so the colour is the mode's,
  // not an accident; mood colours them (sevenths, ninths) wherever the mode allows.
  modeHarmony: {
    dorian: {
      bright: {
        progression: [['i'], ['IV'], ['VII'], ['IV'], ['i'], ['IV'], ['III'], ['VII', 'IV']],
        breakdown: ['i9', 'IVadd9', 'III', 'VIIadd9'],
      },
      dark: {
        progression: [['i'], ['ii'], ['i'], ['IV'], ['i'], ['v'], ['ii'], ['IV']],
        breakdown: ['i7', 'ii7', 'v7', 'IVadd9'],
      },
    },
    phrygian: {
      bright: {
        progression: [['VI'], ['II'], ['III'], ['i'], ['VI'], ['II'], ['III'], ['II']],
        breakdown: ['VImaj7', 'IImaj7', 'III', 'i7'],
      },
      dark: {
        progression: [['i'], ['II'], ['i'], ['II'], ['VI'], ['vii'], ['i'], ['II']],
        breakdown: ['i7', 'IImaj7', 'VImaj7', 'vii7'],
      },
    },
    harmonic: {
      bright: {
        progression: [['i'], ['VI'], ['iv'], ['V'], ['i'], ['VI'], ['iv'], ['V']],
        breakdown: ['iadd9', 'VImaj7', 'ivadd9', 'V7'],
      },
      dark: {
        progression: [['i'], ['i'], ['iv'], ['V'], ['i'], ['VI'], ['iv'], ['V']],
        breakdown: ['i', 'iv', 'VImaj7', 'V7'],
      },
    },
    mixolydian: {
      bright: {
        progression: [['I'], ['VII'], ['IV'], ['I'], ['I'], ['VII'], ['v'], ['IV', 'VII']],
        breakdown: ['Iadd9', 'VIIadd9', 'IVmaj7', 'v7'],
      },
      dark: {
        progression: [['I'], ['v'], ['VII'], ['IV'], ['vi'], ['v'], ['VII'], ['I']],
        breakdown: ['v7', 'vi7', 'VIIadd9', 'Iadd9'],
      },
    },
    lydian: {
      bright: {
        progression: [['I'], ['II'], ['I'], ['II'], ['iii'], ['II'], ['vi'], ['II', 'V']],
        breakdown: ['Imaj9', 'IIadd9', 'Imaj9', 'iii7'],
      },
      dark: {
        progression: [['vi'], ['II'], ['iii'], ['I'], ['vi'], ['II'], ['vii'], ['I']],
        breakdown: ['vi7', 'IIadd9', 'iii7', 'Imaj7'],
      },
    },
  },
  // How each mood colours a chord (by its quality) and how bright the hook is.
  moods: {
    anthemic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: true, walk: 'bright' },
    uplifting: { colour: { '': 'add9', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': '', m: 'm' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm7' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  // Registers, as the remixes voiced them.
  centres: { saws: 'A4', pad: 'E4', piano: 'E4', choir: 'A4', arp: 'D5', bassFloor: 'A1', subFloor: 'C1' },
  tempoFeel: 'four',

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    // Rolls by bars left before the drop: four or more out, then three, two, one, the last.
    rolls: ['x.......x.......', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'],
    // Fills: snare and toms over the last bar of an eight.
    fills: [
      { snare: '..........x.xxxx', tom: '........x.x.x...' },
      { snare: '........x.x.xxxx', tom: '............x.x.' },
      { snare: '............xxxx', tom: '........x.xx....' },
      { snare: '..........xxxxxx', tom: '........xx......' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    perc: {
      shaker: 'xxxxxxxxxxxxxxxx',
      tambourine: '..x...x...x...x.',
      congas: '...x..x....x.x..',
      cowbell: '..x...x..x...x..',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  // Bass and chord rhythms (the tokens of theory.js bassBar / chordBar).
  rhythms: {
    offbeat: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    rolling: '. R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1 . R:1 R:1 R:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:2 . . . x:2 . . . x:2 . . . x:2 .',
    arp: '0 1 2 3 2 1 0 1 2 3 4 3 2 1 2 3',
  },

  // THE SOUNDS — every part's preset, the drum kits, the Random shortlists, the mood
  // overrides and the never-use list — are not here: they are data, in
  // tools/lib/banger/sounds.js, edited on the Banger Sounds page (`npm run banger-sounds`)
  // and checked against tools/lib/banger/sound-rules.js. A recipe holds the music.

  // The mix, by ROLE — ABSOLUTE ZERO's mix block with Peter's edits in it. The generator
  // maps roles to lanes and keeps only what the song plays.
  master: {
    master: 0,
    masterEffects: [
      { id: 'mbCompN', params: { lowFrequency: 180, highFrequency: 1800, 'low.threshold': -26, 'low.ratio': 4, 'low.attack': 0.06, 'low.release': 0.22, 'low.knee': 8, 'mid.threshold': -22, 'mid.ratio': 3.5, 'mid.attack': 0.018, 'mid.release': 0.08, 'mid.knee': 12, 'high.threshold': -26, 'high.ratio': 2.5, 'high.attack': 0.01, 'high.release': 0.06, 'high.knee': 10 } },
      { id: 'gain', params: { gain: -5.8 } },
    ],
    fx: { reverb: { decay: 2.8 } },
  },
  // The remix these channels were copied from, and which of its channels does each job
  // here: the parts a banger's faders are matched against (tools/lib/banger/levels.js,
  // read out by tools/banger-levels.js). `bars` is a stretch of its final drop.
  seed: {
    song: 'frost-remix-absolute-zero', bars: [41, 48],
    lanes: {
      kick: 'kick', snare: 'snare', clap: 'clap', hats: 'hats', ohats: 'ohats', crash: 'crash', impact: 'tom', fill: 'tom2',
      bass: 'bass', sub: 'bass2', hook: 'lead', square: 'lead2', bell: 'lead3', megaSaw: 'lead4', arp: 'lead5', choir: 'lead6',
      saws: 'chords', pad: 'chords2',
    },
  },
  strips: {
    kick: { gain: 0.5, eq: { low: -3 } },
    snare: { gain: 4, eq: { low: 2.8, high: 5.2 }, send: { reverb: 0.25 } },
    clap: { gain: 0, pan: 0.05, eq: { high: -1.5 }, send: { reverb: 0.35 } },
    hats: { gain: -3, pan: 0.2 },
    ohats: { gain: -7, pan: -0.15 },
    crash: { gain: -7, pan: 0.2, send: { reverb: 0.9 } },
    riser: { gain: -15.5, send: { reverb: 0.8 }, eq: { low: 5.5, high: 2 } },
    impact: { gain: -3, send: { reverb: 0.6 } },
    fill: { gain: -5, pan: 0.2, send: { reverb: 0.3 } },
    shaker: { gain: -15, pan: 0.3 },
    tambourine: { gain: -12, pan: -0.3, send: { reverb: 0.15 } },
    congas: { gain: -8, pan: -0.2, send: { reverb: 0.15 } },
    cowbell: { gain: -13, pan: 0.25, send: { reverb: 0.15 } },
    ride: { gain: -12, pan: 0.3, send: { reverb: 0.2 } },
    bass: { gain: -7, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1400, Q: 0.8 } }] },
    sub: { gain: -11 },
    hook: { gain: 0, pan: -0.05, send: { delay: 0.12, reverb: 0.3 } },
    square: { gain: 0, pan: 0.05, send: { delay: 0.1, reverb: 0.2 }, effects: [{ id: 'peq', params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    bell: { gain: -6, pan: 0.2, send: { delay: 0.25, reverb: 0.45 } },
    megaSaw: { gain: -6, eq: { low: -3 }, send: { reverb: 0.25 } },
    arp: { gain: -10.5, pan: -0.25, send: { delay: 0.2, reverb: 0.2 }, effects: [{ id: 'autopanner', params: { rateSync: 1, rateDivision: 2, depth: 0.5, wet: 1 } }] },
    choir: { gain: -7, send: { reverb: 0.5 } },
    third: { gain: -7, pan: 0.15, send: { delay: 0.1, reverb: 0.3 } },
    counter: { gain: -9, pan: -0.2, send: { delay: 0.2, reverb: 0.3 } },
    saws: { gain: 4, eq: { low: -3 }, send: { reverb: 0.25 }, effects: [{ id: 'peq', params: { f3: 3000, g3: -2, q3: 0.9 } }] },
    pad: { gain: -8, eq: { low: -4 }, send: { reverb: 0.5 } },
    piano: { gain: -1, send: { delay: 0.08, reverb: 0.3 } },
    riff: { gain: -2 },
  },
  // The supersaws pump on every beat — the sidechain move.
  pump: { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.65 } },
  // Peter's bright lead.
  exciter: { id: 'exciter', params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.18 } },

  labels: {
    kick: 'KICK', snare: 'SNARE Roll', clap: 'CLAP', hats: 'HATS', ohats: 'OPEN HATS', crash: 'CRASH',
    riser: 'RISER', impact: 'IMPACT', fill: 'FILL TOMS', shaker: 'PERC Shaker',
    tambourine: 'PERC Tambourine', congas: 'PERC Congas', cowbell: 'PERC Cowbell', ride: 'RIDE',
    bass: 'BASS', sub: 'SUB', square: 'HOOK DOUBLE', bell: 'HOOK 8VA',
    megaSaw: 'LEAD 8VA', arp: 'ARP', choir: 'CHOIR', third: 'THIRD BELOW',
    counter: 'COUNTER-MELODY', saws: 'CHORDS Pump', pad: 'PAD', piano: 'PIANO',
  },
});
