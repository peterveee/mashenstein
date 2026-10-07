// THE MIXER'S ICONS BAKE-OFF — the heads of the Lab mixer's strips (Peter, 7 Oct 2026: "do a
// bake off with better icons for the mixer in the lab ... for drums, keyboard, bass, melody,
// tempo"). Today's (src/game/banger/mixer-icons.js) are a can that reads as a database, a sine,
// three bars like a barcode, one note, and a metronome — thin and small.
//
// Every candidate is a whole set, the five drawn as one family:
//   A LINE KIT     the instruments, outlined: a snare with its sticks, a bass guitar, piano keys,
//                  two beamed notes, a metronome on its plinth
//   B SOLID KIT    filled silhouettes, details knocked out: a drum kit, a bass guitar, a synth
//                  keyboard, two beamed notes, a metronome
//   C NOTATION     as written: hi-hat crosses, a bass clef, a chord on one stem, a treble clef,
//                  and the tempo mark (a crotchet =)
//   D SCOPE        each part as its wave on a little screen: two kicks, a fat sine, three stacked
//                  lines, a saw, and a click track lit on the beat
//   E PIXEL        8-bit glyphs, the LED board's family: a snare and sticks, a bass guitar, keys,
//                  two notes, a metronome that ticks between two frames
//   F ON THE BEAT  A's drawings, moving while their part plays: the sticks hit, the bass nods,
//                  the keys go down, the notes hop; still while it is muted
//
// Each icon is MIXER_ICONS's shape: `(g, x, y, r, { u, beat, on, cut })`, centred on (x, y),
// the ink set by the caller as both strokeStyle and fillStyle. Every one stays inside ±0.85r
// up and down (the MUTE / SOLO row sits 1.15r under the icon's middle) and saves and restores
// what it changes.
//
// PICKED 7 Oct 2026: A, in today's finer line (the strip's own 0.9u), its keys F to B — four
// white, three black ("i like A but with a finer line style (like current) and i want the chord
// to be from f to B"). That is the mixer's now (mixer-icons.js MIXER_ICONS), drawn by the shapes
// that moved there; A here stays in the heavier line it was shown in.

import { snare, bassGuitar, pianoKeys, quavers, metronome } from '../game/banger/mixer-icons.js';

const TAU = Math.PI * 2;

function rrect(g, x, y, w, h, rad) {
  g.beginPath();
  g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath();
}
const seg = (g, x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
const dot = (g, x, y, rad) => { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); };
/** Round caps and joins, the line `k` of the icon's size. */
const pen = (g, r, k = 0.12) => { g.lineWidth = r * k; g.lineCap = 'round'; g.lineJoin = 'round'; };
/** How far into its beat the song is, 0–1. */
const phase = (beat) => ((beat % 1) + 1) % 1;
/** A quick lift and fall: 1 at `at` into the beat, gone `len` later. */
const hop = (p, at, len) => { const d = (((p - at) % 1) + 1) % 1; return d < len ? Math.sin(Math.PI * d / len) : 0; };

// --------------------------------------------------------------------------------------- sets

const LINE_KIT = {
  drums: (g, x, y, r) => { g.save(); snare(g, x, y, r); g.restore(); },
  bass: (g, x, y, r) => { g.save(); bassGuitar(g, x, y, r); g.restore(); },
  chords: (g, x, y, r) => { g.save(); pianoKeys(g, x, y, r); g.restore(); },
  lead: (g, x, y, r) => { g.save(); pen(g, r); quavers(g, x, y, r); g.restore(); },
  tempo: (g, x, y, r, { beat = 0 } = {}) => { g.save(); metronome(g, x, y, r, beat); g.restore(); },
};

const SOLID_KIT = {
  // a kit, front on: the bass drum with its hoop knocked out, a tom on its left, the hi-hat on its stand
  drums: (g, x, y, r, { cut = '#0e0e18' } = {}) => {
    g.save(); pen(g, r, 0.12);
    const ky = y + r * 0.34;
    dot(g, x - r * 0.08, ky, r * 0.46);
    g.save(); g.strokeStyle = cut; g.lineWidth = r * 0.07; g.beginPath(); g.arc(x - r * 0.08, ky, r * 0.34, 0, TAU); g.stroke(); g.restore();
    dot(g, x - r * 0.08, ky, r * 0.1);
    g.beginPath(); g.ellipse(x - r * 0.52, y - r * 0.36, r * 0.25, r * 0.21, 0, 0, TAU); g.fill();     // the tom
    g.save(); g.strokeStyle = cut; g.lineWidth = r * 0.05; g.beginPath(); g.ellipse(x - r * 0.52, y - r * 0.36, r * 0.16, r * 0.13, 0, 0, TAU); g.stroke(); g.restore();
    seg(g, x + r * 0.62, y - r * 0.5, x + r * 0.62, y + r * 0.8);                                         // the hi-hat's stand
    seg(g, x + r * 0.62, y + r * 0.8, x + r * 0.44, y + r * 0.8); seg(g, x + r * 0.62, y + r * 0.8, x + r * 0.8, y + r * 0.8);
    for (const dy of [-0.62, -0.48]) { g.beginPath(); g.ellipse(x + r * 0.62, y + r * dy, r * 0.3, r * 0.065, 0, 0, TAU); g.fill(); }
    g.restore();
  },
  bass: (g, x, y, r, { cut } = {}) => { g.save(); bassGuitar(g, x, y, r, { solid: true, cut }); g.restore(); },
  // a synth: the keys in silver with the black ones knocked out, under a strip of knobs
  chords: (g, x, y, r, { cut = '#0e0e18' } = {}) => {
    g.save();
    const W = r * 1.66, Hh = r * 1.16, l = x - W / 2, t = y - Hh / 2, n = 6, kw = W / n, top = Hh * 0.3;
    rrect(g, l, t, W, Hh, r * 0.12); g.fill();
    g.fillStyle = cut; g.strokeStyle = cut;
    dot(g, l + W * 0.16, t + top * 0.5, r * 0.075); dot(g, l + W * 0.32, t + top * 0.5, r * 0.075);
    g.fillRect(l + W * 0.5, t + top * 0.4, W * 0.36, top * 0.22);
    g.fillRect(l + r * 0.06, t + top, W - r * 0.12, r * 0.05);
    g.lineWidth = r * 0.05;
    const kt = t + top + r * 0.05, kb = t + Hh - r * 0.06;
    for (let i = 1; i < n; i++) seg(g, l + kw * i, kt, l + kw * i, kb);
    for (const i of [1, 2, 4, 5]) g.fillRect(l + kw * i - kw * 0.27, kt, kw * 0.54, (kb - kt) * 0.58);
    g.restore();
  },
  lead: (g, x, y, r) => { g.save(); pen(g, r, 0.13); quavers(g, x, y, r, { k: 1.15 }); g.restore(); },
  tempo: (g, x, y, r, { beat = 0, cut } = {}) => { g.save(); metronome(g, x, y, r, beat, { solid: true, cut }); g.restore(); },
};

const NOTATION = {
  // hi-hat quavers, as a drum part writes them: crosses for heads
  drums: (g, x, y, r) => { g.save(); pen(g, r); quavers(g, x, y, r, { heads: 'x' }); g.restore(); },
  // the bass clef: its curl from the dot, and the two dots either side of the F line
  bass: (g, x, y, r) => {
    g.save(); pen(g, r, 0.15);
    const X = (v) => x + (v - 0.1) * r, Y = (v) => y + v * r;
    dot(g, X(-0.46), Y(-0.22), r * 0.16);
    g.beginPath(); g.moveTo(X(-0.5), Y(-0.24));
    g.bezierCurveTo(X(-0.5), Y(-0.7), X(0.3), Y(-0.78), X(0.32), Y(-0.2));
    g.bezierCurveTo(X(0.34), Y(0.28), X(-0.06), Y(0.6), X(-0.56), Y(0.78));
    g.stroke();
    dot(g, X(0.62), Y(-0.42), r * 0.09); dot(g, X(0.62), Y(-0.02), r * 0.09);
    g.restore();
  },
  // a chord: three heads stacked a third apart on one stem
  chords: (g, x, y, r) => {
    g.save(); pen(g, r, 0.11);
    const hx = x - r * 0.12;
    g.save(); g.lineWidth = r * 0.06; g.globalAlpha *= 0.7;           // the lines they sit on
    for (const hy of [0.56, 0.2, -0.16]) seg(g, hx - r * 0.42, y + hy * r, hx + r * 0.42, y + hy * r);
    g.restore();
    for (const hy of [0.56, 0.2, -0.16]) { g.beginPath(); g.ellipse(hx, y + hy * r, r * 0.215, r * 0.14, -0.38, 0, TAU); g.fill(); }
    seg(g, hx + r * 0.21, y + r * 0.52, hx + r * 0.21, y - r * 0.84);
    g.restore();
  },
  // the treble clef: its curl round the G line, up through the top loop and down the spine to its foot
  lead: (g, x, y, r) => {
    g.save(); pen(g, r, 0.12);
    const k = 0.84, X = (v) => x + v * r * k, Y = (v) => y + (v - 0.02) * r * k;
    g.beginPath();
    g.moveTo(X(0.06), Y(0.42));
    g.bezierCurveTo(X(-0.16), Y(0.4), X(-0.14), Y(0.12), X(0.04), Y(0.1));
    g.bezierCurveTo(X(0.32), Y(0.07), X(0.42), Y(0.4), X(0.24), Y(0.56));
    g.bezierCurveTo(X(0.04), Y(0.74), X(-0.42), Y(0.64), X(-0.4), Y(0.3));
    g.bezierCurveTo(X(-0.38), Y(0.02), X(-0.04), Y(-0.2), X(0.1), Y(-0.44));
    g.bezierCurveTo(X(0.24), Y(-0.66), X(0.2), Y(-0.98), X(0.05), Y(-0.94));
    g.bezierCurveTo(X(-0.1), Y(-0.9), X(-0.1), Y(-0.55), X(-0.03), Y(-0.2));
    g.lineTo(X(0.08), Y(0.78));
    g.bezierCurveTo(X(0.12), Y(1.0), X(-0.16), Y(1.02), X(-0.2), Y(0.86));
    g.stroke();
    dot(g, X(-0.13), Y(0.84), r * k * 0.11);
    g.restore();
  },
  // the tempo mark: a crotchet and its equals sign, the crotchet bumping on the beat
  tempo: (g, x, y, r, { beat = 0 } = {}) => {
    g.save(); pen(g, r, 0.12);
    const b = 1 + 0.14 * Math.exp(-phase(beat) * 6);
    const hx = x - r * 0.38, hy = y + r * 0.42;
    g.save(); g.translate(hx, hy); g.scale(b, b);
    g.beginPath(); g.ellipse(0, 0, r * 0.23, r * 0.16, -0.4, 0, TAU); g.fill();
    g.restore();
    seg(g, hx + r * 0.2 * b, hy - r * 0.04, hx + r * 0.2 * b, y - r * 0.68);
    g.lineWidth = r * 0.11;
    seg(g, x + r * 0.16, y - r * 0.02, x + r * 0.64, y - r * 0.02);
    seg(g, x + r * 0.16, y + r * 0.26, x + r * 0.64, y + r * 0.26);
    g.restore();
  },
};

/** A little screen, and the trace `f(s)` (s 0–1 across it, the value in r) drawn in it. */
function scope(g, x, y, r, f, { lw = 0.11, samples = 48 } = {}) {
  const w = r * 0.8, h = r * 0.6;
  pen(g, r, 0.085);
  rrect(g, x - w, y - h, w * 2, h * 2, r * 0.16); g.stroke();
  g.save();
  rrect(g, x - w, y - h, w * 2, h * 2, r * 0.16); g.clip();
  pen(g, r, lw);
  g.beginPath();
  for (let i = 0; i <= samples; i++) {
    const s = i / samples, px = x - w * 0.84 + s * w * 1.68, py = y - f(s) * r;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.stroke();
  g.restore();
}

const SCOPE = {
  // two kicks: a hit, ringing down
  drums: (g, x, y, r) => {
    g.save();
    scope(g, x, y, r, (s) => [0.06, 0.54].reduce((v, s0) => (s > s0 ? v + Math.exp(-(s - s0) * 10) * Math.sin((s - s0) * 46) * 0.44 : v), 0), { samples: 96 });
    g.restore();
  },
  // a fat, slow sine
  bass: (g, x, y, r) => { g.save(); scope(g, x, y, r, (s) => Math.sin(s * TAU) * 0.34, { lw: 0.17 }); g.restore(); },
  // three voices stacked
  chords: (g, x, y, r) => {
    g.save();
    scope(g, x, y, r, () => 0, { lw: 0 });
    const w = r * 0.8;
    pen(g, r, 0.08);
    [[-0.27, 2], [0, 2.5], [0.27, 3]].forEach(([dy, n]) => {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const s = i / 40, px = x - w * 0.84 + s * w * 1.68, py = y + dy * r - Math.sin(s * TAU * n) * r * 0.07;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.stroke();
    });
    g.restore();
  },
  // a saw, bright
  lead: (g, x, y, r) => {
    g.save();
    scope(g, x, y, r, (s) => { const p = (s * 3 + 0.5) % 1; return (p - 0.5) * 0.66; }, { samples: 240 });
    g.restore();
  },
  // a click track: four ticks a bar, the one on the beat standing up
  tempo: (g, x, y, r, { beat = 0 } = {}) => {
    g.save();
    scope(g, x, y, r, () => 0, { lw: 0 });
    const w = r * 0.8, now = ((Math.floor(beat) % 4) + 4) % 4, fall = Math.exp(-phase(beat) * 3);
    pen(g, r, 0.13);
    for (let i = 0; i < 4; i++) {
      const px = x - w * 0.6 + i * w * 0.4, hgt = r * (i === now ? 0.16 + 0.24 * fall : 0.12);
      seg(g, px, y + r * 0.28, px, y + r * 0.28 - hgt * 2);
    }
    g.restore();
  },
};

// ---------------------------------------------------------------------------------- pixel art

/**
 * A glyph of rows ('#' ink), centred on (x, y), its cells `c` of r. `flip` is a set of cells
 * ('i,j') turned over: ink where the glyph is empty, a hole where it is inked.
 */
function pixels(g, x, y, r, rows, { c = 0.158, flip = null } = {}) {
  const cell = r * c, w = rows[0].length, h = rows.length;
  const l = x - (w * cell) / 2, t = y - (h * cell) / 2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if ((rows[j][i] === '#') !== !!flip?.has(`${i},${j}`)) g.fillRect(l + i * cell, t + j * cell, cell + 0.02 * r, cell + 0.02 * r);
  }
  return { l, t, cell };
}

const PX = {
  drums: [
    '#.........#',
    '.#.......#.',
    '..#.....#..',
    '...#...#...',
    '.#########.',
    '#.........#',
    '.#########.',
    '.#.#.#.#.#.',
    '.#.#.#.#.#.',
    '.#########.',
  ],
  bass: [
    '.........##',
    '........###',
    '.......##..',
    '......##...',
    '.....##....',
    '...###.....',
    '.#####.....',
    '##.###.....',
    '###.#......',
    '#####......',
    '.###.......',
  ],
  chords: [
    '###########',
    '##...#...##',
    '##...#...##',
    '##...#...##',
    '###.###.###',
    '###.###.###',
    '###.###.###',
  ],
  lead: [
    '...########',
    '...########',
    '...#......#',
    '...#......#',
    '...#......#',
    '...#......#',
    '.###....###',
    '####...####',
    '####...####',
    '.##.....##.',
  ],
  tempo: [
    '...........',
    '....###....',
    '....###....',
    '...##.##...',
    '...#...#...',
    '..##...##..',
    '..##...##..',
    '.###...###.',
    '.#########.',
    '###########',
    '###########',
  ],
};

const PIXEL = {
  drums: (g, x, y, r) => { pixels(g, x, y, r, PX.drums); },
  bass: (g, x, y, r) => { pixels(g, x, y, r, PX.bass); },
  chords: (g, x, y, r) => { pixels(g, x, y, r, PX.chords); },
  lead: (g, x, y, r) => { pixels(g, x, y, r, PX.lead); },
  // a solid body with a window in its face, and the arm a line of cells from the pivot to one of
  // two tips, ticking across on each beat: ink in the window and above, cut where it crosses the body
  tempo: (g, x, y, r, { beat = 0 } = {}) => {
    const right = ((Math.floor(beat) % 2) + 2) % 2 === 1;
    const [x0, y0] = [5, 8], [x1, y1] = right ? [8, 0] : [2, 0];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), arm = new Set();
    for (let s = 0; s <= n; s++) arm.add(`${Math.round(x0 + (x1 - x0) * s / n)},${Math.round(y0 + (y1 - y0) * s / n)}`);
    pixels(g, x, y, r, PX.tempo, { flip: arm });
  },
};

// ------------------------------------------------------------------------------------ on beat

const ON_THE_BEAT = {
  // the sticks take turns: left on the beat, right on the and
  drums: (g, x, y, r, { beat = 0, on = true } = {}) => {
    const p = phase(beat);
    g.save(); snare(g, x, y, r, { lift: on ? [liftOf(p, 0), liftOf(p, 0.5)] : [0, 0] }); g.restore();
  },
  // the bass nods its head on every beat
  bass: (g, x, y, r, { beat = 0, on = true } = {}) => {
    const nod = on ? 0.16 * Math.exp(-phase(beat) * 7) : 0;
    g.save(); bassGuitar(g, x, y, r, { nod }); g.restore();
  },
  // a chord goes down on each beat, the shape changing beat to beat
  chords: (g, x, y, r, { beat = 0, on = true } = {}) => {
    const CHORDS = [[0, 2, 4], [1, 3], [0, 2, 4], [1, 4]];
    const down = [0, 0, 0, 0, 0];
    if (on) {
      const k = Math.exp(-phase(beat) * 4), held = CHORDS[((Math.floor(beat) % 4) + 4) % 4];
      for (const i of held) down[i] = k;
    }
    g.save(); pianoKeys(g, x, y, r, { down }); g.restore();
  },
  // the notes hop in turn, each on its own quaver
  lead: (g, x, y, r, { beat = 0, on = true } = {}) => {
    const p = phase(beat);
    const lift = on ? [hop(p, 0, 0.32), hop(p, 0.5, 0.32)] : [0, 0];
    g.save(); pen(g, r); quavers(g, x, y, r, { lift }); g.restore();
  },
  tempo: LINE_KIT.tempo,
};

/** A stick's lift across the beat: up from the last hit, down onto the head at `at`. */
function liftOf(p, at) {
  const d = (((p - at) % 1) + 1) % 1;                   // time since this stick's hit
  return d < 0.12 ? 0 : Math.min(1, (d - 0.12) / 0.3) * (d > 0.82 ? Math.max(0, (1 - d) / 0.18) : 1);
}

export const MIXER_ICON_CANDIDATES = Object.freeze([
  { letter: 'A', name: 'LINE KIT', icons: LINE_KIT,
    description: 'The instruments, outlined in a heavier line: a snare with its sticks crossed on the head, a bass guitar, piano keys (five white, three black where a piano has them), two beamed quavers, the metronome on a plinth.' },
  { letter: 'B', name: 'SOLID KIT', icons: SOLID_KIT,
    description: 'Filled silhouettes with the detail knocked out: a drum kit front on (bass drum, tom, hi-hat), a bass guitar, a synth with its knobs and black keys cut out, heavier quavers, a solid metronome.' },
  { letter: 'C', name: 'NOTATION', icons: NOTATION,
    description: 'As the parts are written: hi-hat crosses, the bass clef, a chord of three heads on one stem, the treble clef, and the tempo mark — a crotchet and its equals sign, bumping on the beat.' },
  { letter: 'D', name: 'SCOPE', icons: SCOPE,
    description: 'Each part as its wave on a little screen: two kicks ringing down, a fat slow sine, three voices stacked, a bright saw, and a click track with the beat standing up.' },
  { letter: 'E', name: 'PIXEL', icons: PIXEL,
    description: '8-bit glyphs, the LED board’s family: a snare and its sticks, a bass guitar, keys, two quavers, a metronome whose arm ticks between two frames on the beat.' },
  { letter: 'F', name: 'ON THE BEAT', icons: ON_THE_BEAT,
    description: 'A’s drawings, moving while their part plays: the sticks take turns on the head, the bass nods on the beat, a chord goes down on the keys, the quavers hop in turn. A muted part holds still.' },
]);
