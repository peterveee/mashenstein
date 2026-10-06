// CHIPSTEP — the fifth banger recipe. 2 Oct 2026.
//
// Chip-house into dubstep, the way CHIPSTEP (src/data/imported/field-service-chipstep.js)
// plays it: square and pulse voices, six-bit hats and a Game Boy snare, built like a modern
// track. 140, four on the floor through the intro and the builds with an OCTAVE SQUARE BASS
// in eighths; the first drop goes HALF TIME — the kick on the one and the "and" of two, the
// snare on three — with a WOBBLE holding each chord and the square hitting with the kick; the
// later drops come back to four on the floor with the wobble STUTTERING on the off-beats.
// The hook is doubled on a pulse, a square takes it an octave up, the arcade chorus sings
// under it from drop two, a screamer takes the peak, square arps run through the chords,
// and a ZAP lands every drop. Data only, like big-room.js; the sounds are in ../sounds.js.
//
// The half-time first drop is `halfTimeUntil` — future bass's `fullTimeFrom` the other way
// round: the drops before it play `drums.halfTime` and `rhythms.halfTime` over the rest.
import { BIG_ROOM } from './big-room.js';

export const CHIPSTEP = Object.freeze({
  id: 'chipstep',
  label: 'Chipstep',
  // Now and then the Machine-Gun Sweep into a drop, in place of the stutter (fx.js).
  machineGunSweep: true,
  // What the Style list says beside it, and its tooltip.
  note: '140 · chip-house, square bass, half-time wobble drop',
  title: '140 BPM, CHIPSTEP\'s shape: chip-house builds on an octave square bass, a half-time first drop with a wobble, full-time drops after it, a Game Boy snare',
  bpm: 140,
  // Its bass is its signature: Bass Lifts never moves it.
  bassFixed: true,
  tempoRange: [136, 145],
  // The half-time drop is the style, and a riff's own backbeat would undo it — so the
  // riff's drums are replaced by default, as in future bass. The arcade chorus (the Third
  // Below) sings from drop two. No shaker: nothing in a chip kit shakes.
  defaults: { drums: { source: 'replace', shaker: false }, parts: { thirdBelow: true } },
  // The first drop is half time (drums.halfTime, rhythms.halfTime); the rest is full time.
  halfTimeUntil: 1,

  // CHIPSTEP's own walk is Am F C G, two chords a bar: i–VI | III–VII, which is Anthemic.
  progressions: {
    anthemic: {
      minor: [['i', 'VI'], ['III', 'VII'], ['i', 'VI'], ['III', 'VII'], ['i', 'VI'], ['III', 'VII'], ['i', 'VI'], ['III', 'VII']],
      major: [['vi', 'IV'], ['I', 'V'], ['vi', 'IV'], ['I', 'V'], ['vi', 'IV'], ['I', 'V'], ['vi', 'IV'], ['I', 'V']],
    },
    uplifting: {
      minor: [['VI'], ['VII'], ['i'], ['i'], ['VI'], ['VII'], ['III'], ['VII']],
      major: [['IV'], ['V'], ['vi'], ['I'], ['IV'], ['V'], ['I'], ['V']],
    },
    euphoric: {
      minor: [['VI'], ['VII'], ['v'], ['i'], ['VI'], ['VII'], ['i'], ['i']],
      major: [['IV'], ['V'], ['iii'], ['vi'], ['IV'], ['V'], ['I'], ['I']],
    },
    moody: {
      minor: [['i'], ['iv'], ['VI'], ['v'], ['i'], ['iv'], ['VI'], ['v']],
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
      minor: [['i'], ['i'], ['bII'], ['i'], ['i'], ['iv'], ['bII'], ['V']],
      major: [['I'], ['I'], ['bII'], ['I'], ['I'], ['iv'], ['bII'], ['V']],
    },
  },
  // CHIPSTEP's breakdown sits on F and C under the hook: VI and III, then home.
  breakdown: {
    minor: ['VImaj7', 'III', 'VII', 'i'],
    major: ['IVmaj7', 'I', 'V', 'vi'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // Chip chords are plain triads; only Moody reaches for sevenths.
  moods: {
    anthemic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: true, walk: 'bright' },
    uplifting: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': '', m: 'm' }, exciter: true, high: 3, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm7' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm' }, exciter: false, high: 1, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  // CHIPSTEP's registers: the PWM chords around A4, the square arp from A4, the octave bass
  // and the wobble from E1 (A1, F1, C2, G1).
  centres: { saws: 'A4', pad: 'E4', piano: 'C5', choir: 'A4', arp: 'A4', bassFloor: 'E1', subFloor: 'E1' },

  drums: {
    // Full time — the chip-house verse and drop two.
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '..x...x...x...x.',
    hats16: 'xxxxxxxxxxxxxxxx',
    hats8: 'x.x.x.x.x.x.x.x.',
    crash: 'x...............',
    // The noise roll: the backbeat, quarters into eighths, eighths snapping into
    // sixteenths halfway — a resonant high-pass climbing under it, the chip pitch-up.
    rolls: ['....x.......x...', 'x...x...x.x.x.x.', 'x.x.x.x.xxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'],
    rollSwell: { from: -6, shape: 'even' },
    rollSweep: { type: 'highpass', from: 300, to: 4000, Q: 1.4 },
    // The verse's Game Boy run on the last beat, and two with a blip answering.
    fills: [
      { snare: '....x.......xxxx', tom: '................' },
      { snare: '............x.xx', tom: '........x.x.....' },
      { snare: '........x.x.xxxx', tom: '..........x.x...' },
    ],
    halfKick: 'x.........x.....',
    halfClap: '........x.......',
    // The first drop, half time, as CHIPSTEP has it: the kick on the one and the "and" of
    // two, the snare on three, eighth hats, an open hat before each snare and each one.
    halfTime: {
      kick: 'x.........x.....',
      clap: '........x.......',
      ohats: '......x.......x.',
      hats16: 'x.x.x.x.x.x.x.x.',
    },
    perc: {
      shaker: 'x.x.x.x.x.x.x.x.',
      tambourine: '..x...x...x...x.',
      congas: '...x..x....x.x..',
      cowbell: '..x...x..x...x..',
      ride: 'x.x.x.x.x.x.x.x.',
    },
  },

  rhythms: {
    // The octave square bass in eighths — CHIPSTEP's verse.
    offbeat: 'R:1 . O:1 . R:1 . O:1 . R:1 . O:1 . R:1 . O:1 .',
    // Rolling: the octave in sixteenths.
    rolling: 'R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1 O:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    // The wobble stuttering on the off-beat eighths — CHIPSTEP's drop two.
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    pianoStabs: '. . x:2 . . . x:2 . . . x:2 . . . x:2 .',
    // CHIPSTEP's square arp: up the chord and again from its second note.
    arp: '0 1 2 3 1 2 3 4 0 1 2 3 1 2 3 4',
    // The half-time drop: the square hits with the kick, the wobble holds each chord.
    halfTime: {
      offbeat: 'R:3 . . . . . . . . . R:3 . . . . .',
      rolling: 'R:3 . . . . . . . . . R:3 . . . . .',
      sub: 'R:8 . . . . . . . R:8 . . . . . . .',
      subOff: 'R:8 . . . . . . . R:8 . . . . . . .',
    },
  },

  // CHIPSTEP's master: ABSOLUTE ZERO's multiband, 5 dB down.
  master: {
    master: 0,
    masterEffects: [BIG_ROOM.master.masterEffects[0], { id: 'gain', params: { gain: -5 } }],
    fx: {},
  },
  // The channels copied from CHIPSTEP, and which of its channels each one was: what the
  // faders are matched against (tools/lib/banger/levels.js). Bars 45–52 are its drop two,
  // full time, like a banger's last drop. The rest are big-room's.
  seed: {
    song: 'field-service-chipstep', bars: [45, 52],
    lanes: {
      kick: 'kick', snare: 'snare', clap: 'snare2', hats: 'hats', ohats: 'ohats', crash: 'crash', impact: 'tom',
      bass: 'bass', sub: 'bass3', square: 'lead', third: 'lead3', arp: 'lead4', megaSaw: 'lead6', saws: 'chords', pad: 'chords',
    },
  },
  strips: {
    ...BIG_ROOM.strips,
    kick: { gain: -3 },
    // The Game Boy snare: the backbeat in the verse, the rolls in the builds.
    snare: { gain: 2, send: { reverb: 0.15 } },
    // The 909 crack on the backbeat: CHIPSTEP's SNARE 909 Crack.
    clap: { gain: 0, send: { reverb: 0.3 } },
    hats: { gain: -6, pan: 0.2 },
    ohats: { gain: -7, pan: -0.2 },
    crash: { gain: -9, pan: 0.3, send: { reverb: 0.3 } },
    riser: { gain: -16.8, send: { reverb: 0.8 }, eq: { low: 5.5 } },
    // The ZAP on every drop, thrown across the room.
    impact: { gain: -2, send: { reverb: 0.5 }, effects: [{ id: 'pingpong', params: { sync: 1, division: 0.75, feedback: 0.5, wet: 0.45 } }] },
    bass: { gain: -6 },
    // The wobble: CHIPSTEP's STUTTER, which is what it plays in the last drop.
    sub: { gain: -6 },
    // The pulse doubling the hook: CHIPSTEP's HOOK Pulse.
    square: { gain: -1, send: { delay: 0.15, reverb: 0.2 } },
    // The arcade chorus: CHIPSTEP's ARCADE CHORUS.
    third: { gain: -4, pan: 0.2, send: { reverb: 0.3 } },
    arp: { gain: -7, pan: -0.3, send: { delay: 0.2 }, effects: [{ id: 'autopanner', params: { rateSync: 1, rateDivision: 2, depth: 0.6, wet: 1 } }] },
    // The screamer at the peak: CHIPSTEP's SCREAMER.
    megaSaw: { gain: -12, pan: 0.25, send: { reverb: 0.3 } },
    // CHIPSTEP's PAD PWM Wide, less its widener (the styles add none) and its gate (that is
    // the Sidechain Pump switch).
    saws: { gain: -9.06, send: { reverb: 0.64 } },
    pad: { gain: -9.06, send: { reverb: 0.64 } },
  },
  // CHIPSTEP's pump on the PWM chords: every beat, a little softer than big-room's.
  pump: { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.14, decay: 0.02, depth: 0.6 } },
  exciter: BIG_ROOM.exciter,

  // Labels name the JOB; a tuned part's strip adds the sound (`THIRD BELOW · Arcade Chorus`).
  labels: {
    ...BIG_ROOM.labels,
    clap: 'BACKBEAT', bass: 'BASS Octave', sub: 'WOBBLE', saws: 'CHORDS Pump', fill: 'FILL Blips',
  },
});
