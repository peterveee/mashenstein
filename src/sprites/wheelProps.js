// THE TWO WHEELS THAT REPLACE THE BARREL (Peter, 28 Oct 2026): Speed Zone's TYRE and Crypt
// Shift's HEARSE WHEEL, after Terminal Velocity's runaway wheel (neonProps.js). Same box and
// answer as the barrel they stand in for — rolls at you, jump it, a heavy kick — and, like the
// wheel, drawn STILL: the roll branch in draw.js turns the whole drawing, which is exactly
// right for a round thing. The marks that make the turn readable (a tread, a yellow dash, the
// spokes) are what carry the rotation. Painted in the same envelope and registry as the other
// cabinets' props; nothing here imports props.js.
import { TAU, circ, line, body, disc } from './neonProps.js';

const INK = '#1a1620';
const LW = 0.55, LWI = 0.32;

// ----------------------------------------------------------------- SPEED ZONE: TYRE
// A fat black road tyre, seen side-on: a tread of blocks round the edge, a paler sidewall with
// one yellow dash that shows the turn, and a dark well where the wheel would go. Warm black,
// not the neon wheel's blue one — this is a desert road.
const RUBBER = '#2b2730', RUBBER_LT = '#4a4452', WALL = '#3b3641', WELL = '#16131a', DASH = '#f6c23c';

function tyre(c, w, h) {
  const R = 8.2, cx = w / 2, cy = h - 0.1 - R;
  circ(c, cx, cy, R, RUBBER, INK, LW);
  // The tread: a block every 30 degrees, lighter than the carcass, so the edge ticks round.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    line(c, cx + Math.cos(a) * (R - 0.4), cy + Math.sin(a) * (R - 0.4),
      cx + Math.cos(a) * (R - 1.5), cy + Math.sin(a) * (R - 1.5), RUBBER_LT, 1.05);
  }
  // The sidewall, with its lit crescent up and to the left.
  body(c, disc(cx, cy, R - 2.1), WALL, (p) => {
    circ(p, cx - 1.5, cy - 1.5, R - 2.6, RUBBER_LT);
    circ(p, cx + 0.4, cy + 0.4, R - 2.6, WALL);
  }, INK, LWI);
  // The yellow dash on the wall: one, so the spin is something you can read.
  line(c, cx + 0.2, cy - (R - 3.0), cx + 0.2, cy - (R - 4.8), DASH, 1.1);
  circ(c, cx, cy, 2.9, WELL, INK, LWI);
  circ(c, cx - 0.7, cy - 0.7, 1.0, RUBBER_LT);
}

// ------------------------------------------------------------ CRYPT SHIFT: HEARSE WHEEL
// A hearse's wheel: a black tyre with a whitewall, a silver wire-spoke hub (the spokes are what
// turn), and a violet cap in the centre for the graveyard's light.
const BLACK = '#1b1722', WHITEWALL = '#e8e4ee', WHITEWALL_DK = '#b6b0c4';
const SILVER = '#c9c7d8', SILVER_LT = '#f3f1fa', SILVER_DK = '#7d7a94', CAP = '#8a5cd6', CAP_LT = '#c9a8ff';

function hearseWheel(c, w, h) {
  const R = 8.2, cx = w / 2, cy = h - 0.1 - R;
  circ(c, cx, cy, R, BLACK, INK, LW);
  // The whitewall, a ring a little inside the tread.
  circ(c, cx, cy, R - 1.5, WHITEWALL, INK, LWI);
  circ(c, cx, cy, R - 2.7, WHITEWALL_DK);
  // The rim, and the wire spokes: sixteen fine ones, so a quarter turn still reads as a wheel.
  body(c, disc(cx, cy, R - 3.0), BLACK, (p) => {
    circ(p, cx, cy, R - 3.0, SILVER_DK);
    circ(p, cx - 1.0, cy - 1.0, R - 3.6, SILVER);
  }, INK, LWI);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU + 0.12;
    line(c, cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4,
      cx + Math.cos(a) * (R - 3.3), cy + Math.sin(a) * (R - 3.3), k % 2 ? SILVER_DK : SILVER_LT, 0.42);
  }
  circ(c, cx, cy, 1.9, SILVER, INK, LWI);
  circ(c, cx, cy, 1.0, CAP);
  circ(c, cx - 0.3, cy - 0.3, 0.4, CAP_LT);
}

export const WHEEL_PROP_SPECS = {
  tyre: { box: [13, 13], frames: 1, fps: 1, paint: (c, w, h) => tyre(c, w, h) },
  hearseWheel: { box: [13, 13], frames: 1, fps: 1, paint: (c, w, h) => hearseWheel(c, w, h) },
};
export { tyre, hearseWheel };
