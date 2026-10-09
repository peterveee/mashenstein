// EUROBEAT — the fourth banger recipe. 2 Oct 2026.
//
// Initial D racing music, the way HAIRPIN (src/data/imported/speed-remix-hairpin.js) plays
// it: 155 and relentless — four on the floor with off-beat open hats and sixteenth hats, an
// OCTAVE BASS in eighths under everything, dramatic minor progressions (i–III–VI–VII, Em G
// C D), the riff doubled on a sync-razor lead and an octave up on a grand, strings
// holding the chords, brass stabs on the off-beats, a piano breakdown, Simmons tom fills,
// and the last chorus up a tone.
// No pump: eurobeat drives, it does not breathe. Data only, like big-room.js; the sounds
// are in ../sounds.js.
import { BIG_ROOM } from './big-room.js';

export const EUROBEAT = Object.freeze({
  id: 'eurobeat',
  label: 'Eurobeat',
  // What the Style list says beside it, and its tooltip.
  note: '155 · octave bass, strings, brass stabs',
  title: '155 BPM, HAIRPIN\'s shape: four on the floor, an octave bass in eighths, strings, brass stabs on the off-beats, a razor lead doubling the hook. Starts as a Pop Song',
  // FLAVOURS (9 Oct 2026, docs/LAB_STYLES_PLAN.md; EUROBEAT_FLAVOURS below): the mood picks one, the
  // voltage now and then surprises. In the Lab Italo Disco is one of them too (src/game/banger/make.js
  // STYLE_FLAVOURS) — a whole style the take turns into.
  flavours: [
    { id: 'eurobeat', label: 'Eurobeat', note: 'Fast drums, an octave bass in eighths, brass stabs and strings' },
    { id: 'hinrg', label: 'Hi-NRG', note: 'Slower and harder: a galloping octave bass, a big clap, brass stabbing the off-beats' },
  ],
  flavourByMood: { dark: 'hinrg', gothic: 'hinrg', flamenco: 'hinrg', lament: 'hinrg', boss: 'hinrg' },
  bpm: 155,
  // Its bass is its signature: Bass Lifts never moves it.
  bassFixed: true,
  tempoRange: [150, 160],
  // Dramatic and driving, with the brass stabs on; no sub (the octave bass is the floor)
  // and no pump.
  // A Pop Song (templates.js): eurobeat is verses and a chorus, not a drop.
  defaults: { mood: 'anthemic', parts: { sub: false, counter: true }, fx: { pump: false }, form: { template: 'pop' } },

  progressions: {
    // Em G C D: the eurobeat minor.
    anthemic: {
      minor: [['i'], ['III'], ['VI'], ['VII'], ['i'], ['III'], ['VI'], ['VII']],
      major: [['I'], ['V'], ['vi'], ['IV'], ['I'], ['V'], ['IV'], ['V']],
    },
    uplifting: {
      minor: [['VI'], ['VII'], ['i'], ['i'], ['VI'], ['VII'], ['III'], ['VII']],
      major: [['IV'], ['V'], ['I'], ['vi'], ['IV'], ['V'], ['I'], ['I']],
    },
    euphoric: {
      minor: [['i'], ['VII'], ['VI'], ['VII'], ['i'], ['VII'], ['VI'], ['V']],
      major: [['I'], ['iii'], ['IV'], ['V'], ['I'], ['iii'], ['IV'], ['V']],
    },
    moody: {
      minor: [['i'], ['iv'], ['VII'], ['III'], ['VI'], ['iv'], ['V'], ['V']],
      major: [['vi'], ['IV'], ['V'], ['I'], ['vi'], ['IV'], ['V'], ['V']],
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
      minor: [['i'], ['VI'], ['iv'], ['V'], ['i'], ['VI'], ['iv'], ['V']],
      major: [['I'], ['I'], ['bII'], ['I'], ['I'], ['iv'], ['bII'], ['V']],
    },
  },
  breakdown: {
    minor: ['VImaj7', 'VII', 'i', 'V7'],
    major: ['IVmaj7', 'V', 'iii7', 'vi'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // The breakdown is the piano playing the hook, as written.
  breakdownHook: 'piano',
  moods: {
    anthemic: { colour: { '': '', m: 'm' }, exciter: true, high: 3, preferMinor: true, walk: 'bright' },
    uplifting: { colour: { '': '', m: 'm' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': 'add9', m: 'm' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm7' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm' }, exciter: true, high: 2, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  centres: { saws: 'A4', pad: 'E4', piano: 'C5', choir: 'A4', arp: 'E5', stabs: 'B4', bassFloor: 'A1', subFloor: 'C1' },

  drums: {
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    // The gallop build: off-beat eighths pushing against the kick, eighths, the gallop
    // (three of every four sixteenths), sixteenths, then the gallop into the hole.
    rolls: ['..x...x...x...x.', 'x.x.x.x.x.x.x.x.', 'x.xxx.xxx.xxx.xx', 'xxxxxxxxxxxxxxxx', 'x.xxx.xxxxxx....'],
    rollSwell: { from: -10, shape: 'even' },
    // Simmons tom runs — the eurobeat fill.
    fills: [
      { snare: '............x.x.', tom: '........xxxx..x.' },
      { snare: '..........x...xx', tom: '........xx.x.x..' },
      { snare: '........x.x.x.x.', tom: '............xxxx' },
    ],
    halfKick: 'x.......x.......',
    halfClap: '........x.......',
    perc: {
      shaker: 'xxxxxxxxxxxxxxxx',
      tambourine: '..x...x...x...x.',
      congas: '...x..x....x.x..',
      cowbell: '..x...x..x...x..',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    // The octave bass: root and octave in eighths, under everything.
    offbeat: 'R:1 . O:1 . R:1 . O:1 . R:1 . O:1 . R:1 . O:1 .',
    // Rolling, eurobeat's way: the octave in sixteenths.
    rolling: 'R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // Piano chords in three-three-two.
    pianoStabs: 'x:2 . . x:2 . . x:2 . x:2 . . x:2 . . x:2 .',
    arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
    // The brass: triad stabs on every off-beat eighth, as HAIRPIN plays them — the
    // Counter-Melody switch plays these instead of a line in the hook's rests.
    counterStabs: '. . x:1 . . . x:1 . . . x:1 . . . x:1 .',
  },

  // The master and the channels are HAIRPIN's, job for job — the faders, EQ, sends and
  // inserts copied from its mix — so a eurobeat banger starts where that remix was levelled.
  master: {
    master: 0,
    masterEffects: [BIG_ROOM.master.masterEffects[0], { id: 'gain', params: { gain: -5.1 } }],
    fx: {},
  },
  // The channels copied from HAIRPIN, and which of its channels each one was: what the
  // faders are matched against (tools/lib/banger/levels.js). The rest are big-room's.
  seed: {
    song: 'speed-remix-hairpin', bars: [49, 56],
    lanes: {
      kick: 'kick', snare: 'snare', clap: 'clap', hats: 'hats', ohats: 'ohats', crash: 'crash', fill: 'tom',
      bass: 'bass', square: 'lead', bell: 'lead2', arp: 'lead5', counter: 'lead4', saws: 'chords', piano: 'chords2',
    },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: -1.5, eq: { low: -1 }, effects: [{ id: 'peq', params: { f2: 210, g2: -2.5, q2: 1.1 } }] },
    snare: { gain: 5.5, send: { reverb: 0.2 }, eq: { low: 2.8, high: 5.2 }, effects: [{ id: 'peq', params: { f3: 3300, g3: -3.5, q3: 0.8 } }] },
    clap: { gain: 1, pan: 0.1, send: { reverb: 0.3 } },
    hats: { gain: -6, pan: 0.25 },
    ohats: { gain: -8, pan: -0.2 },
    crash: { gain: -5, pan: -0.2, send: { reverb: 0.8 } },
    fill: { gain: -4, pan: 0.3, send: { reverb: 0.35 } },
    bass: { gain: -6.5, effects: [{ id: 'peq', params: { f2: 200, g2: -3, q2: 1 } }] },
    // The razor lead doubling the hook: HAIRPIN's RIFF + SOLO channel.
    square: { gain: -0.5, send: { delay: 0.2, reverb: 0.25 }, effects: [{ id: 'peq', params: { f3: 3200, g3: -6, q3: 0.6 } }] },
    // The grand an octave over the hook: HAIRPIN's SYNTH LEAD Pop Grand.
    bell: { gain: 3.5, send: { delay: 0.15, reverb: 0.3 }, eq: { high: 1.5 }, effects: [{ id: 'peq', params: { f2: 450, g2: -2, q2: 0.9 } }] },
    arp: { gain: -17, pan: 0.3, send: { delay: 0.2 } },
    // The brass stabs: HAIRPIN's BRASS Stabs.
    counter: { gain: -4, pan: -0.25, send: { reverb: 0.25 } },
    // The strings holding the chords: HAIRPIN's STRINGS.
    saws: { gain: -7, send: { reverb: 0.4 }, eq: { low: -3 }, effects: [{ id: 'peq', params: { f2: 400, g2: -2.5, q2: 0.9 } }] },
    // HAIRPIN's PIANO Chords — here also the breakdown's hook.
    piano: { gain: -6, send: { reverb: 0.35 }, eq: { low: -2 }, effects: [{ id: 'peq', params: { f2: 400, g2: -2, q2: 0.9 } }] },
  },
  // Available when the Sidechain Pump switch is turned on — off by default here.
  pump: BIG_ROOM.pump,
  exciter: BIG_ROOM.exciter,

  // Labels name the JOB; the strip adds the sound (`CHORDS · BEST PWM Strings`).
  labels: {
    ...BIG_ROOM.labels,
    saws: 'CHORDS', counter: 'STABS', bass: 'BASS Octave',
  },
});

// ---- the flavours (flavours.js), from work/local/_rave-sketches.mjs (9 Oct 2026)
export const EUROBEAT_FLAVOURS = Object.freeze([
  {
    // HI-NRG — 130. The faster, harder side of the eighties dancefloor, slower than Eurobeat: a four
    // on the floor with a big gated clap, the octave bass galloping, PWM brass stabbing the off-beats
    // over held strings, a bright lead.
    id: 'hinrg', label: 'Hi-NRG',
    recipe: {
      bpm: 130,
      tempoRange: [126, 136],
      drums: {
        ...EUROBEAT.drums,
        hats16: '..x...x...x...x.',
        hats8: '..x...x...x...x.',
        ohats: '..............x.',
      },
      rhythms: {
        ...EUROBEAT.rhythms,
        offbeat: 'R:1 . O:1 O:1 R:1 . O:1 O:1 R:1 . O:1 O:1 R:1 . O:1 O:1',
        pianoStabs: '. . x:1 . . . x:1 . . . x:1 . . . x:1 .',
      },
      strips: {
        ...EUROBEAT.strips,
        clap: { gain: 1, send: { reverb: 0.4 }, effects: [{ id: 'reverb', params: { decay: 1.8, preDelay: 0.005, wet: 0.5 } }, { id: 'noisegate', params: { threshold: -34, attack: 0.002, release: 0.08 } }] },
        bass: { gain: -2, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1600, Q: 1 } }] },
        piano: { gain: -6, pan: 0.15, send: { reverb: 0.3 } },
      },
      labels: { ...EUROBEAT.labels, bass: 'BASS Gallop', piano: 'BRASS Stabs' },
    },
  },
]);
