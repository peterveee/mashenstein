// KRAFTWERK — the sixth recipe, and the first that is not a banger. 2 Oct 2026.
//
// Kraftwerk in the vein of Pocket Calculator and Neon Lights (Peter's brief, 2 Oct 2026):
// the melodic, pop side of The Man-Machine and Computer World rather than the cold
// sequencer side. A steady, dry electronic kit — four on the floor, a noisy backbeat, tight
// eighth hats; a Minimoog bouncing in staccato octaves; a string machine holding the
// chords; the hook doubled on a plain square with a music bell an octave over it; little
// calculator bleeps answering in its rests (tuned, on the chords — never fixed-pitch drums);
// a sparkle of bells in the later themes; a vocoder singing under the hook in the second
// theme. Repetition, so the riff is kept as written by default.
//
// Not a banger: no build, riser, snare roll, crash, impact, fill, pump, stutter, filter
// build, delay throw or key lift — every one of them a switch under More Options, so these
// are only the defaults.
//
// ITS OWN FORM (Peter's re-model brief, 2 Oct 2026): `script`, 128 bars at 120, every
// change on an eight- or sixteen-bar block, nothing announced by a riser or a crash —
// parts simply arrive and leave. Ignition: a lone sixteenth arp in the dark, a sonar ping
// from bar 9. Motorik: the kick at 17, the noise snare and accented sixteenth hats at 25.
// Engine: the piston bass at 33, the hook on a warm analog lead at 41. Voice: the vocoder
// sings the hook at 49; counter-arps and rim clicks at 65. Isolation: kit and bass gone,
// the vocoder and the arp alone in an eighth-note ping-pong, the vocoder saying one word
// in eighths from 89. Full Power: everything back at once at 97, lead and vocoder in
// octaves. Power Down: kick and bass out at 113, the voices fade at 121, the kit stops at
// 125 and the arp closes down a step a bar to one dry low pulse. Any other length scales
// it (form.js scriptForm). Style's Own Form off, it is the switch-built form: four bars of
// drums and bass, then theme, interlude, theme two, outro — or, on a Long song, layers.
//
// AUSSENDIENST's blips and Casio pi-po were tried here and taken out (Peter, 2 Oct 2026):
// drums at a fixed pitch clash with a riff in another key, and loops lifted from one song's
// hook are clutter under any other. Data only, like big-room.js; the sounds are in
// ../sounds.js. No seed remix: the channels are set here, by hand, like trance's.
import { BIG_ROOM } from './big-room.js';

// The motorik bed the middle of the song stands on.
const MOTORIK = ['arp', 'sonar', 'kick', 'snare', 'hats'];

export const KRAFTWERK = Object.freeze({
  id: 'kraftwerk',
  label: 'Kraftwerk',
  bpm: 120,
  // Its bass is its signature: Bass Lifts never moves it.
  bassFixed: true,
  tempoRange: [112, 128],
  // The sequencer arp IS the style: Arp Pattern never moves it off its own figure.
  arpFixed: true,
  defaults: {
    mood: 'uplifting',
    variation: 'faithful',
    length: 'custom',
    customBars: 128,
    form: { script: true, layers: 'long', grooveIntro: true, build: false, doubleDrop: false, keyLift: 'none', hardStop: false },
    drums: { crashes: false, rolls: false, impact: false, fills: false, shaker: false, ride: false },
    // The counter-arps are the Counter-Melody, the analog lead the Square Double. No chord
    // part: the arps carry the harmony (Chords on, a string machine joins the Voice and
    // Full Power sections).
    parts: { sub: false, chords: 'none', octaveDouble: false, thirdBelow: true, counter: true },
    fx: { riser: false, filterBuild: false, stutter: false, pump: false, delayThrows: false },
  },
  // Style's Own Form. Each section's blocks: [bar of the section, what plays from it, extras].
  script: [
    { role: 'intro', label: 'Ignition', bars: 16, plays: [
      [0, ['arp']],
      [8, ['arp', 'sonar']],
    ] },
    { role: 'groove', label: 'Motorik', bars: 16, plays: [
      [0, ['arp', 'sonar', 'kick']],
      [8, MOTORIK],
    ] },
    { role: 'drop', label: 'Engine', bars: 16, plays: [
      [0, [...MOTORIK, 'bass']],
      [8, [...MOTORIK, 'bass', 'lead']],
    ] },
    { role: 'drop2', label: 'Voice', bars: 32, grows: true, dropIndex: 1, plays: [
      [0, [...MOTORIK, 'bass', 'vocoder', 'chords']],
      [16, [...MOTORIK, 'bass', 'vocoder', 'chords', 'counter', 'rim']],
    ] },
    { role: 'breakdown', label: 'Isolation', bars: 16, dropIndex: 1, plays: [
      [0, ['vocoder', 'arp'], { echo: ['vocoder', 'arp'] }],
      [8, ['vocoder', 'word', 'arp'], { echo: ['vocoder', 'word', 'arp'] }],
    ] },
    { role: 'drop3', label: 'Full Power', bars: 16, dropIndex: 2, plays: [
      [0, ['arp', 'kick', 'snare', 'hats', 'rim', 'bass', 'lead', 'vocoder', 'counter', 'chords']],
    ] },
    { role: 'outro', label: 'Power Down', bars: 16, dropIndex: 2, plays: [
      [0, ['arp', 'snare', 'hats', 'rim', 'lead', 'vocoder', 'counter']],
      [8, ['arp', 'snare', 'hats', 'rim', 'lead', 'vocoder'], { fadeOut: ['lead', 'vocoder'] }],
      [12, ['arp'], { filterDown: ['arp'], end: true }],
    ] },
  ],
  sectionLabels: { drop: 'Theme', drop2: 'Theme 2', drop3: 'Theme 3', breakdown: 'Interlude', reprise: 'Reprise' },
  // Four bars of drums and bass, whatever the length: a longer song grows its themes, its
  // interlude and its outro instead.
  form: {
    bars: { intro: 4 },
    grow: [
      ['drop', 32], ['drop2', 16], ['breakdown', 16], ['outro', 8], ['drop2', 32], ['drop3', 32],
      ['reprise', 16], ['outro', 16], ['drop', 48], ['drop2', 48], ['drop3', 48],
    ],
  },
  // The order Build in Layers brings the parts in on a Long song: the beat, the Minimoog,
  // the backbeat, the strings, the hook with its bleeps and sparkle, then its doubles.
  layers: [
    ['kick', 'hats', 'ohats'],
    ['bass', 'sub'],
    ['clap', 'snare', 'fill', 'perc', 'riffDrums'],
    ['chords'],
    ['riff', 'counter', 'arp'],
    ['doubles'],
  ],

  // Simple, slow-moving harmony: a chord held for two bars.
  progressions: {
    anthemic: {
      minor: [['i'], ['i'], ['VI'], ['VI'], ['III'], ['III'], ['VII'], ['VII']],
      major: [['I'], ['I'], ['vi'], ['vi'], ['IV'], ['IV'], ['V'], ['V']],
    },
    uplifting: {
      minor: [['III'], ['III'], ['VII'], ['VII'], ['VI'], ['VI'], ['VII'], ['VII']],
      major: [['I'], ['I'], ['iii'], ['iii'], ['IV'], ['IV'], ['V'], ['V']],
    },
    euphoric: {
      minor: [['VI'], ['VI'], ['VII'], ['VII'], ['III'], ['III'], ['i'], ['i']],
      major: [['IV'], ['IV'], ['V'], ['V'], ['iii'], ['iii'], ['vi'], ['vi']],
    },
    moody: {
      minor: [['i'], ['i'], ['iv'], ['iv'], ['VI'], ['VI'], ['v'], ['v']],
      major: [['vi'], ['vi'], ['IV'], ['IV'], ['I'], ['I'], ['V'], ['V']],
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
      minor: [['i'], ['i'], ['i'], ['i'], ['VI'], ['VI'], ['VII'], ['VII']],
      major: [['I'], ['I'], ['bVII'], ['bVII'], ['IV'], ['IV'], ['I'], ['I']],
    },
  },
  breakdown: {
    minor: ['VI', 'III', 'iv', 'VII'],
    major: ['IV', 'I', 'ii', 'V'],
  },
  modeHarmony: BIG_ROOM.modeHarmony,
  // Plain triads, as a string machine plays them; Moody alone reaches for sevenths.
  moods: {
    anthemic: { colour: { '': '', m: 'm' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
    uplifting: { colour: { '': '', m: 'm' }, exciter: true, high: 2, preferMinor: false, walk: 'bright' },
    euphoric: { colour: { '': '', m: 'm' }, exciter: true, high: 2.5, preferMinor: false, walk: 'bright' },
    moody: { colour: { '': 'maj7', m: 'm7' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    dark: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    gothic: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    heroic: { colour: { '': '', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    nostalgic: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    funky: { colour: { '': '9', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
  },

  centres: { saws: 'A4', pad: 'A4', piano: 'C5', choir: 'E5', arp: 'A5', counter: 'C4', sonar: 'A4', bassFloor: 'E1', subFloor: 'A1' },

  drums: {
    // Four on the floor, the backbeat on two and four, no open hat: dry and steady. Its
    // own form plays sixteenth hats accented — the eighths full, the sixteenths between
    // them on a channel of their own a step down (`hatsSoft`) — and rim clicks on the
    // off-beats.
    kick: 'x...x...x...x...',
    clap: '....x.......x...',
    ohats: '................',
    hats16: 'x.x.x.x.x.x.x.x.',
    hats8: 'x.x.x.x.x.x.x.x.',
    hatsSoft: '.x.x.x.x.x.x.x.x',
    rim: '..x...x...x...x.',
    crash: 'x...............',
    rolls: BIG_ROOM.drums.rolls,
    // Simmons tom runs, for when Fills is switched on.
    fills: [
      { snare: '............x.x.', tom: '........xxxx..x.' },
      { snare: '..........x...xx', tom: '........xx.x.x..' },
    ],
    halfKick: 'x.......x.......',
    halfClap: '........x.......',
    perc: BIG_ROOM.drums.perc,
  },

  rhythms: {
    // The piston: the root in rigid staccato eighths.
    offbeat: 'R:1 . R:1 . R:1 . R:1 . R:1 . R:1 . R:1 . R:1 .',
    // Rolling: the root in sixteenths.
    rolling: 'R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1 R:1',
    sub: 'R:4 . . . R:4 . . . R:4 . . . R:4 . . .',
    subOff: '. . R:2 . . . R:2 . . . R:2 . . . R:2 .',
    pedal: 'R:16 . . . . . . . . . . . . . . .',
    // Brass in three-three-two.
    pianoStabs: 'x:2 . . x:2 . . x:2 . . . . . . . . .',
    // The arp: the triad climbing in sixteenths, high and dry, over and over.
    arp: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3',
    // The counter-arps: the triad up and back in eighths, under the vocoder — the
    // Counter-Melody switch plays these instead of a line in the hook's rests, so they are
    // there whether the hook leaves room or not.
    counterFigure: '0 . 1 . 2 . 1 . 0 . 1 . 2 . 1 .',
    // The sonar: the chord's root, once, left to ring.
    sonar: 'R:8 . . . . . . . . . . . . . . .',
  },

  master: {
    master: 0,
    masterEffects: [BIG_ROOM.master.masterEffects[0], { id: 'gain', params: { gain: -3 } }],
    fx: {},
  },
  // Set by hand (no seed remix), matched to the style's own default parts.
  strips: {
    ...BIG_ROOM.strips,
    // The motorik kick is all punch: no sub under it.
    kick: { gain: -2, eq: { low: -4 } },
    snare: { gain: 4, send: { reverb: 0.3 } },
    clap: { gain: -2, send: { reverb: 0.25 } },
    hats: { gain: -4, pan: 0.25, eq: { high: 2 } },
    // 75 against 100: the accent, as a fader.
    hatsSoft: { gain: -6.5, pan: 0.25, eq: { high: 2 } },
    rim: { gain: -8, pan: -0.3, eq: { high: 2 } },
    fill: { gain: -4, pan: 0.3, send: { reverb: 0.35 } },
    bass: { gain: -8, eq: { low: -2 } },
    square: { gain: 0, send: { delay: 0.12, reverb: 0.25 } },
    bell: { gain: -10, pan: 0.2, send: { delay: 0.2, reverb: 0.35 } },
    megaSaw: { gain: -8, send: { delay: 0.15, reverb: 0.3 } },
    third: { gain: -4, pan: -0.1, send: { reverb: 0.35 }, effects: [{ id: 'chorus', params: { wet: 0.25 } }] },
    counter: { gain: -8, pan: -0.2, send: { delay: 0.1, reverb: 0.15 } },
    // Dry, bouncing left and right in sixteenths.
    arp: { gain: -10, send: { reverb: 0.1 }, effects: [{ id: 'pingpong', params: { sync: 1, division: 0.25, feedback: 0.15, wet: 0.4 } }] },
    // Low-passed, ringing out into the delay.
    sonar: { gain: -12, send: { delay: 0.35, reverb: 0.5 }, effects: [{ id: 'filter', params: { type: 'lowpass', frequency: 1400, Q: 0.9 } }] },
    vocoder: { gain: -4, send: { delay: 0.1, reverb: 0.25 }, effects: [{ id: 'chorus', params: { wet: 0.25 } }] },
    word: { gain: -6, pan: 0.15, send: { delay: 0.2, reverb: 0.2 } },
    pad: { gain: -11, send: { reverb: 0.55 } },
    choir: { gain: -11, send: { reverb: 0.5 } },
    piano: { gain: -6, send: { reverb: 0.3 } },
  },
  // Available when the Sidechain Pump switch is turned on — off by default here.
  pump: BIG_ROOM.pump,
  exciter: { id: 'exciter', params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.3 } },

  labels: {
    ...BIG_ROOM.labels,
    clap: 'BACKBEAT', snare: 'SNARE', fill: 'SIMMONS Toms', bass: 'PISTON BASS', pad: 'STRINGS', saws: 'CHORDS',
    piano: 'BRASS', choir: 'CHOIR', arp: 'ARP', counter: 'COUNTER ARP', third: 'VOCODER THIRD', square: 'ANALOG LEAD',
    sonar: 'SONAR', vocoder: 'VOCODER', word: 'VOCODER WORD', rim: 'RIM CLICKS', hatsSoft: 'HATS SOFT',
  },
});
