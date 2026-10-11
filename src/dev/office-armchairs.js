// CORPORATE KOMBAT — floor 88 armchair bake-off (Peter, 12 Oct 2026: "give me a bake off of the arm
// chairs"). Candidates only: nothing in the run imports this file. Each paints one armchair seen
// front on, standing on the floor line `b`, from its left edge `x`, in the LIGNE '89 hand at the
// size the corridor draws it (the shipped Grand Confort armchair is 34 wide, 27 tall).
import { box, rbox, line, lines, ell, circ, poly, fs } from '../engine/stylePacks/officeLigne/line.js';

const LWM = 0.5;
const CHROME = '#c9ced8', CHROME_DK = '#7d8494';

// ---------------------------------------------------------------- Grand Confort (LC2)
function grandConfort(g, x, b, P, [hide, hideDk, hideLt]) {
  const ink = P.inkM, w = 34;
  rbox(g, x + 8.4, b - 27, w - 16.8, 15, 2.2, hide, ink, LWM);
  line(g, x + 10, b - 25.4, x + w - 10, b - 25.4, hideLt, 0.6);
  rbox(g, x + 8.4, b - 13, w - 16.8, 7, 1.8, hide, ink, LWM);
  line(g, x + 10, b - 11.6, x + w - 10, b - 11.6, hideLt, 0.5);
  for (const ax of [x + 1, x + w - 8]) {
    rbox(g, ax, b - 22, 7, 16, 1.6, hideDk, ink, LWM);
    line(g, ax + 1.6, b - 20.6, ax + 1.6, b - 8, hide, 0.6);
  }
  lines(g, [
    x, b - 22.6, x + 8.4, b - 22.6, x + w - 8.4, b - 22.6, x + w, b - 22.6,
    x, b - 5.4, x + w, b - 5.4,
    x + 0.3, b - 22.6, x + 0.3, b - 1, x + w - 0.3, b - 22.6, x + w - 0.3, b - 1,
    x + 8.4, b - 22.6, x + 8.4, b - 5.4, x + w - 8.4, b - 22.6, x + w - 8.4, b - 5.4,
  ], CHROME_DK, 1.4);
  lines(g, [x, b - 22.9, x + 8.4, b - 22.9, x + w - 8.4, b - 22.9, x + w, b - 22.9, x, b - 5.7, x + w, b - 5.7], CHROME, 0.6);
  for (const fx of [x - 0.6, x + w - 1.6]) box(g, fx, b - 1.2, 2.2, 1.2, '#1b1a22');
}

// ---------------------------------------------------------------- Barcelona
// Black leather slabs welted into rectangles, lifted on the chrome X legs that show at each side.
function barcelona(g, x, b, P) {
  const ink = P.inkM, w = 36, hide = '#1f1c26', weld = '#3a3646', lt = '#6a6578';
  // the far legs, then the slabs, then the near curves
  for (const sx of [x + 2, x + w - 2]) {
    g.beginPath();
    g.moveTo(sx, b - 29);
    g.quadraticCurveTo(sx + (sx < x + w / 2 ? -3 : 3), b - 12, sx, b);
    g.strokeStyle = CHROME_DK; g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = CHROME; g.lineWidth = 0.9; g.stroke();
  }
  rbox(g, x + 3, b - 30, w - 6, 17, 1.6, hide, ink, LWM);
  line(g, x + 4, b - 21.6, x + w - 4, b - 21.6, weld, 0.45);
  for (let c = 1; c < 3; c++) line(g, x + 3 + (c * (w - 6)) / 3, b - 29, x + 3 + (c * (w - 6)) / 3, b - 14, weld, 0.45);
  line(g, x + 5, b - 28.8, x + w - 5, b - 28.8, lt, 0.5);
  rbox(g, x + 2, b - 14, w - 4, 6, 1.6, hide, ink, LWM);
  for (let c = 1; c < 3; c++) line(g, x + 2 + (c * (w - 4)) / 3, b - 13.4, x + 2 + (c * (w - 4)) / 3, b - 8.6, weld, 0.45);
  line(g, x + 4, b - 12.8, x + w - 4, b - 12.8, lt, 0.5);
  // the crossbars under the seat and the glides
  line(g, x + 3, b - 7, x + w - 3, b - 7, CHROME_DK, 1);
  for (const fx of [x + 1, x + w - 3]) box(g, fx, b - 1, 2, 1, '#1b1a22');
}

// ---------------------------------------------------------------- Eames lounge + ottoman
function eames(g, x, b, P) {
  const ink = P.inkM, wood = '#7a3f24', woodLt = '#a35a34', hide = '#1f1c26', lt = '#5c5868';
  const cx = x + 15;
  // the swivel base: a star of aluminium feet and a short column
  lines(g, [cx - 11, b - 0.6, cx + 11, b - 0.6, cx - 6, b - 1.6, cx + 6, b - 1.6], CHROME_DK, 1.2);
  line(g, cx, b - 9, cx, b - 1, CHROME, 1.6);
  // shells: seat, back, headrest; each a rosewood tray with a black leather cushion in it
  const shell = (sx, sy, sw, sh) => {
    rbox(g, sx, sy, sw, sh, 2.2, wood, ink, LWM);
    line(g, sx + 1.4, sy + 0.8, sx + sw - 1.4, sy + 0.8, woodLt, 0.5);
    rbox(g, sx + 2, sy + 1.6, sw - 4, sh - 2.6, 1.8, hide, ink, 0.4);
    line(g, sx + 3, sy + 2.6, sx + sw - 3, sy + 2.6, lt, 0.45);
  };
  shell(cx - 10, b - 37, 20, 8);
  shell(cx - 12, b - 29, 24, 12);
  shell(cx - 13, b - 16, 26, 7);
  // the arms: black leather pads on bent ply
  for (const sd of [-1, 1]) {
    rbox(g, cx + sd * 13.5 - 2.2, b - 20, 4.4, 9, 1.6, hide, ink, 0.4);
  }
  // the ottoman beside it
  const ox = x + 34;
  lines(g, [ox, b - 0.6, ox + 14, b - 0.6], CHROME_DK, 1.1);
  line(g, ox + 7, b - 6, ox + 7, b - 1, CHROME, 1.3);
  rbox(g, ox, b - 10, 14, 5, 2, wood, ink, LWM);
  rbox(g, ox + 1.4, b - 9.4, 11.2, 3.4, 1.4, hide, ink, 0.4);
}

// ---------------------------------------------------------------- Chesterfield club chair
function chesterfield(g, x, b, P) {
  const ink = P.inkM, w = 36, hide = '#5e1a26', dk = '#40111a', lt = '#8e3445', stud = '#2a0b12';
  // back, button-tufted, the same height as the scrolled arms
  rbox(g, x + 5, b - 25, w - 10, 13, 2.4, hide, ink, LWM);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) circ(g, x + 9 + c * 6 + (r % 2) * 3, b - 21.6 + r * 4.4, 0.6, stud);
  line(g, x + 7, b - 23.6, x + w - 7, b - 23.6, lt, 0.5);
  // the seat cushion
  rbox(g, x + 6, b - 13, w - 12, 6, 2, hide, ink, LWM);
  line(g, x + 8, b - 11.6, x + w - 8, b - 11.6, lt, 0.5);
  // the arms, ending in the scroll
  for (const ax of [x, x + w - 8]) {
    box(g, ax + 0.6, b - 20, 7.4, 14, dk, ink, LWM);
    circ(g, ax + 4.3, b - 20.4, 4, hide, ink, LWM);
    circ(g, ax + 4.3, b - 20.4, 1.6, null, lt, 0.5);
    for (let k = 0; k < 3; k++) circ(g, ax + 4.3, b - 15 + k * 3.2, 0.5, stud);
  }
  // the skirt and the bun feet
  box(g, x + 1, b - 7, w - 2, 3.6, dk, ink, 0.4);
  for (const fx of [x + 2, x + w - 5]) rbox(g, fx, b - 3.4, 3, 3.4, 1.2, '#3a2418', ink, 0.3);
}

// ---------------------------------------------------------------- Wassily
// The chrome tube drawn as a line, the leather as flat black straps hung in it.
function wassily(g, x, b, P) {
  const w = 32, strap = '#1f1c26', lt = '#5c5868';
  const tube = (pts) => {
    lines(g, pts, CHROME_DK, 1.3);
    lines(g, pts, CHROME, 0.5);
  };
  // the sled runners and uprights, the arm rails, the back frame
  tube([
    x, b - 0.7, x + 8, b - 0.7, x + w - 8, b - 0.7, x + w, b - 0.7,
    x + 0.6, b - 0.7, x + 0.6, b - 18, x + w - 0.6, b - 0.7, x + w - 0.6, b - 18,
    x + 0.6, b - 18, x + 8, b - 18, x + w - 8, b - 18, x + w - 0.6, b - 18,
    x + 6, b - 30, x + w - 6, b - 30, x + 6, b - 30, x + 6, b - 9, x + w - 6, b - 30, x + w - 6, b - 9,
  ]);
  // the straps: back, seat, and the arm straps
  box(g, x + 6, b - 27, w - 12, 8, strap);
  line(g, x + 7, b - 26, x + w - 7, b - 26, lt, 0.45);
  box(g, x + 6, b - 12, w - 12, 4, strap);
  line(g, x + 7, b - 11.2, x + w - 7, b - 11.2, lt, 0.45);
  for (const ax of [x + 0.6, x + w - 8]) box(g, ax, b - 17.6, 7.4, 3, strap);
}

// ---------------------------------------------------------------- Togo
// Low and crumpled: three pleated rolls of tan leather on the floor, no legs at all.
function togo(g, x, b, P) {
  const ink = P.inkM, w = 40, hide = '#a26a40', dk = '#7c4c2a', lt = '#c99064';
  const roll = (rx, ry, rw, rh, n) => {
    rbox(g, rx, ry, rw, rh, rh / 2.2, hide, ink, LWM);
    for (let k = 1; k < n; k++) {
      const px = rx + (k * rw) / n;
      g.beginPath();
      g.moveTo(px, ry + 0.8);
      g.quadraticCurveTo(px + 1.2, ry + rh / 2, px, ry + rh - 0.8);
      g.strokeStyle = dk; g.lineWidth = 0.5; g.stroke();
    }
    line(g, rx + rh / 2, ry + 1.2, rx + rw - rh / 2, ry + 1.2, lt, 0.5);
  };
  roll(x + 3, b - 21, w - 6, 9, 6);
  roll(x, b - 13, w, 8, 7);
  roll(x + 1, b - 6, w - 2, 6, 7);
}

// ---------------------------------------------------------------- executive swivel chair
function executive(g, x, b, P) {
  const ink = P.inkM, hide = '#1f1c26', lt = '#5c5868', cx = x + 15;
  // the five-star chrome base on casters, the gas column
  lines(g, [cx - 12, b - 2.4, cx + 12, b - 2.4, cx - 7, b - 3.4, cx + 7, b - 3.4], CHROME_DK, 1.2);
  for (const fx of [cx - 12, cx - 6, cx, cx + 6, cx + 12]) circ(g, fx, b - 1, 1, '#1b1a22');
  line(g, cx, b - 11, cx, b - 3, CHROME, 1.8);
  // the high channel-tufted back
  rbox(g, cx - 10, b - 42, 20, 28, 4, hide, ink, LWM);
  for (let k = 0; k < 4; k++) line(g, cx - 8, b - 36 + k * 5.6, cx + 8, b - 36 + k * 5.6, lt, 0.45);
  line(g, cx - 7, b - 40.6, cx + 7, b - 40.6, '#7a7688', 0.5);
  // the seat, and the padded arms on chrome
  rbox(g, cx - 12, b - 15, 24, 5, 2, hide, ink, LWM);
  for (const sd of [-1, 1]) {
    line(g, cx + sd * 12.6, b - 20, cx + sd * 12.6, b - 12, CHROME, 1);
    rbox(g, cx + sd * 12.6 - 2.4, b - 22, 4.8, 3, 1.4, hide, ink, 0.4);
  }
}

// ---------------------------------------------------------------- side on
// The three whose shape IS their silhouette, drawn in profile facing right. A part is a stroked
// polyline: the ink pass a little wider under the fill pass, round ends, so a slab, a shell or a
// tube is one line of the right weight.
function stroke(g, pts, w, col, ink = 'rgba(30,26,38,0.72)', cap = 'round') {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = cap;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  if (ink) { g.strokeStyle = ink; g.lineWidth = w + 0.9; g.stroke(); }
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  g.restore();
}
function curve(g, x0, y0, c1x, c1y, c2x, c2y, x1, y1, w, col, hi) {
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1);
  g.strokeStyle = CHROME_DK; g.lineWidth = w; g.stroke();
  g.strokeStyle = hi; g.lineWidth = w * 0.4; g.stroke();
  g.restore();
}

// Barcelona in profile: the two chrome curves crossing in the X, the back slab and the seat
// slab, black leather with its welts showing on the edge.
function barcelonaSide(g, x, b, P) {
  const hide = '#1f1c26', weld = '#4a4658';
  // the far curve: under the seat's front, sweeping back down to the rear foot
  curve(g, x + 33, b - 14, x + 35, b - 4, x + 18, b + 0.5, x + 3, b - 0.6, 2.2, CHROME);
  // the slabs: back (leaning back) then seat (tipped back a little)
  stroke(g, [x + 9.5, b - 31, x + 13, b - 15.5], 4.6, hide);
  stroke(g, [x + 13.5, b - 14.6, x + 32, b - 15.6], 4.4, hide);
  for (const t of [0.33, 0.66]) {
    const px = x + 9.5 + 3.5 * t, py = b - 31 + 15.5 * t;
    line(g, px - 2.1, py + 0.4, px + 2.1, py - 0.4, weld, 0.5);
  }
  for (const t of [0.33, 0.66]) line(g, x + 13.5 + 18.5 * t, b - 16.8, x + 13.5 + 18.5 * t, b - 12.6, weld, 0.5);
  // the near curve: from the top of the back, bowing behind it, down to the front foot
  curve(g, x + 8, b - 32, x + 3, b - 15, x + 14, b - 1, x + 34, b - 0.6, 2.2, '#eef0f4');
  for (const fx of [x + 2, x + 33]) box(g, fx, b - 1, 2.4, 1, '#1b1a22');
}

// Eames lounge in profile: three rosewood shells, the black cushions in them, a reclined back,
// the arm, the swivel base; the ottoman in front of it.
function eamesSide(g, x, b, P) {
  const wood = '#7a3f24', woodLt = '#a35a34', hide = '#1f1c26', lt = '#5c5868';
  // base: a column and the spread of the star feet
  lines(g, [x + 6, b - 0.8, x + 24, b - 0.8], CHROME_DK, 1.3);
  line(g, x + 15, b - 10, x + 15, b - 1, CHROME, 1.8);
  // shells first (behind), then the cushions on them
  stroke(g, [x + 7, b - 11.4, x + 25, b - 13.6], 2.2, wood);
  stroke(g, [x + 5, b - 13.4, x + 1.6, b - 28.6], 2.2, wood);
  stroke(g, [x + 1.2, b - 30.2, x + 0.2, b - 37], 2.2, wood);
  stroke(g, [x + 9, b - 14.4, x + 24, b - 16.2], 4.4, hide);
  stroke(g, [x + 7, b - 15.4, x + 4.2, b - 28], 4.4, hide);
  stroke(g, [x + 3.6, b - 30.4, x + 3, b - 36], 4.2, hide);
  line(g, x + 10, b - 16, x + 23, b - 17.6, lt, 0.5);
  // the arm: a ply bracket and its black leather pad
  stroke(g, [x + 10, b - 13, x + 14, b - 20.4], 1.6, wood);
  stroke(g, [x + 8, b - 21.4, x + 20, b - 21.6], 2.8, hide);
  line(g, x + 9, b - 22.2, x + 19, b - 22.3, woodLt, 0.4);
  // the ottoman
  lines(g, [x + 30, b - 0.8, x + 44, b - 0.8], CHROME_DK, 1.2);
  line(g, x + 37, b - 7, x + 37, b - 1, CHROME, 1.5);
  stroke(g, [x + 29, b - 8.2, x + 45, b - 9.4], 2, wood);
  stroke(g, [x + 30, b - 10.6, x + 44, b - 11.6], 3.6, hide);
}

// Wassily in profile: the tube is the drawing, the leather a few black bands slung in it.
function wassilySide(g, x, b, P) {
  const strap = '#1f1c26';
  const tube = (pts) => { lines(g, pts, CHROME_DK, 1.4); lines(g, pts, CHROME, 0.55); };
  // runners, the front upright and the arm rail, the raked back frame and its seat rail
  tube([
    x + 2, b - 0.8, x + 32, b - 0.8,
    x + 31.4, b - 0.8, x + 31.4, b - 18.4,
    x + 31.4, b - 18.4, x + 9, b - 18.4,
    x + 4, b - 0.8, x + 7.6, b - 31,
    x + 9, b - 18.4, x + 9.6, b - 11,
    x + 9.6, b - 11, x + 31.4, b - 13,
  ]);
  // the leather: the back band, the seat sling, the arm strap
  stroke(g, [x + 7.6, b - 29, x + 10.4, b - 17.2], 3.6, strap, null, 'butt');
  stroke(g, [x + 11, b - 10.2, x + 30.6, b - 12.4], 3, strap, null, 'butt');
  stroke(g, [x + 11, b - 17.2, x + 30.6, b - 17.2], 2.8, strap, null, 'butt');
}

export const ARMCHAIRS = Object.freeze([
  { id: 'A', name: 'A — Grand Confort, oxblood (as shipped)', note: 'oxblood leather in a chrome cage; matches the sofas', paint: (g, x, b, P) => grandConfort(g, x, b, P, ['#6e2232', '#4c1522', '#a0475a']) },
  { id: 'B', name: 'B — Grand Confort, black', note: 'the same cage in black leather', paint: (g, x, b, P) => grandConfort(g, x, b, P, ['#26222e', '#17141d', '#5c5868']) },
  { id: 'C', name: 'C — Barcelona', note: 'welted black slabs on chrome X legs; the reception classic', paint: barcelona },
  { id: 'D', name: 'D — Eames lounge + ottoman', note: 'rosewood shells, black leather, swivel base; the CEO’s corner', paint: eames },
  { id: 'E', name: 'E — Chesterfield club chair', note: 'button-tufted oxblood, scrolled arms, bun feet; the banker', paint: chesterfield },
  { id: 'F', name: 'F — Wassily', note: 'chrome tube and black leather straps; the most line-art of them', paint: wassily },
  { id: 'G', name: 'G — Togo', note: 'low crumpled tan leather, no legs; design magazine rather than boardroom', paint: togo },
  { id: 'C2', name: 'C2 — Barcelona, side on', note: 'the X of the chrome legs in profile', paint: barcelonaSide },
  { id: 'D2', name: 'D2 — Eames lounge + ottoman, side on', note: 'the reclined shells in profile', paint: eamesSide },
  { id: 'F2', name: 'F2 — Wassily, side on', note: 'the tube frame in profile, leather slung in it', paint: wassilySide },
  { id: 'H', name: 'H — Executive swivel', note: 'high channel-tufted black back on a chrome five-star base', paint: executive },
]);
