// Gallery-only TERMINAL VELOCITY crate and barrel: the generic platformer box and
// barrel redrawn in the neon city's hand (15 Oct 2026). Peter: "a new box and
// barrel in the new style" — the shared warehouse crate and saloon barrel are still
// the commonest ground reads on a road of glass and light.
//
// THE HAND is src/dev/neon-obstacle-candidates.js's: flat bodies in one ink at one
// weight with one lit sliver and one shade band, and the LIGHT on each thing is
// tube — a faint wide stroke, the colour, a white-hot core. Danger is RED; the
// backdrop owns cyan, magenta and the coin amber. That module imports the bakeoff
// kit, which these sheets may not, so the few palette lines and helpers used here
// are copied from it verbatim rather than imported.
//
// TWO SKIES. neon-1 opens in golden-hour paper and turns to night on the strike;
// a prop is a raster that does not change with it. So both bodies are inked dark
// to stand off the peach, and carry enough red to stand off the night.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units with the
// ground at y = h: the box 16x15 (crate 12x11 x 4/3), the barrel 17x17 (13x13 x
// 4/3). The barrel is drawn still, upright and centred; the run spins the whole
// drawing about its centre as it rolls.
//
// Nothing here is registered in any gameplay registry.

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;


// ------------------------------------------------------------------ palette
// (copied from neon-obstacle-candidates.js)
const INK = '#0b0920';
const LW = 0.55;
const LWI = 0.32;
const LWF = 0.2;
const RED = '#ff2e4d', RED_DK = '#a8122e', RED_HOT = '#ffd0d8';
const CYAN = '#38d8f8';
const WHITE = '#ffffff';
const CAB = '#1d1a33', CAB_LT = '#36315a', CAB_DK = '#100e20';
const HULL_LT = '#524c9e';
const SLATE = '#4c5488', SLATE_LT = '#6d76b0', SLATE_DK = '#343a68';
const STEEL = '#aab1d0', STEEL_LT = '#e2e6f6';

// ------------------------------------------------------------------ helpers
// (copied from neon-obstacle-candidates.js)
function pen(c, col, lw) {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function fillStroke(c, fill, ink = INK, lw = LW) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink && lw > 0) { pen(c, ink, lw); c.stroke(); }
}
function box(c, x, y, w, h, fill, ink = null, lw = LW) {
  c.beginPath(); c.rect(x, y, w, h); fillStroke(c, fill, ink, lw);
}
function rbox(c, x, y, w, h, r, fill, ink = null, lw = LW) {
  c.beginPath(); c.roundRect(x, y, w, h, r); fillStroke(c, fill, ink, lw);
}
function line(c, x0, y0, x1, y1, col, lw) {
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); pen(c, col, lw); c.stroke();
}
const rr = (x, y, w, h, r) => (p) => p.roundRect(x, y, w, h, r);

// A flat body: fill the path, its lit sliver and shade band clipped inside it,
// then the ink over both.
function body(c, path, fill, inner = null, ink = INK, lw = LW) {
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inner) { c.clip(); inner(c); }
  c.restore();
  c.beginPath();
  path(c);
  pen(c, ink, lw);
  c.stroke();
}

const hotCache = new Map();
function whiteHot(hex, amt = 0.55) {
  const key = hex + amt;
  if (!hotCache.has(key)) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    hotCache.set(key, `rgb(${v.map((ch) => Math.round(ch + (255 - ch) * amt)).join(',')})`);
  }
  return hotCache.get(key);
}

// A NEON LINE: a faint wide stroke for the light the tube throws, the colour, and a
// white-hot core. `lit` dims the whole tube without changing its shape.
function tube(c, color, width, path, lit = 1, glow = 0.24) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const a = c.globalAlpha;
  c.globalAlpha = a * glow * lit;
  c.strokeStyle = color;
  c.lineWidth = width * 3;
  c.beginPath(); path(c); c.stroke();
  c.globalAlpha = a * (0.25 + 0.75 * lit);
  c.lineWidth = width;
  c.beginPath(); path(c); c.stroke();
  c.globalAlpha = a * lit;
  c.strokeStyle = whiteHot(color);
  c.lineWidth = width * 0.42;
  c.beginPath(); path(c); c.stroke();
  c.restore();
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — BOTTLE CRATE (stack 16x15). The plastic crate stacked outside every izakaya
// back door: hazard-red moulding, a lattice of dark holes, a hand slot, a row of
// empty bottles standing in it. A red tube along the rim runs a slow chase.
function neonBox(c, w, h, t) {
  const f = frameOf(t, 8, 8);
  const g = h - 0.2;
  const X0 = 1.0, X1 = 15.0, TOP = 5.2;
  // The bottles, standing in the crate behind its front wall.
  for (let i = 0; i < 5; i++) {
    const x = 3.0 + i * 2.5;
    body(c, (p) => {
      p.moveTo(x - 1.0, TOP + 1);
      p.lineTo(x - 1.0, TOP - 1.2);
      p.quadraticCurveTo(x - 1.0, TOP - 2.4, x - 0.45, TOP - 3.0);
      p.lineTo(x - 0.45, TOP - 4.2);
      p.lineTo(x + 0.45, TOP - 4.2);
      p.lineTo(x + 0.45, TOP - 3.0);
      p.quadraticCurveTo(x + 1.0, TOP - 2.4, x + 1.0, TOP - 1.2);
      p.lineTo(x + 1.0, TOP + 1);
      p.closePath();
    }, HULL_LT, (p) => { box(p, x + 0.3, TOP - 5, 1, 7, CAB_LT); box(p, x - 0.7, TOP - 2.4, 0.4, 3, STEEL_LT); }, INK, LWI);
    box(c, x - 0.55, TOP - 4.7, 1.1, 0.7, STEEL, INK, LWF);
  }
  // The crate: one moulding, lit down its left, a shade band at its foot.
  body(c, rr(X0, TOP, X1 - X0, g - TOP, 0.8), RED, (p) => {
    box(p, X0, g - 1.6, X1 - X0, 1.6, RED_DK);
    box(p, X1 - 1.4, TOP, 1.4, g - TOP, RED_DK);
    box(p, X0 + 0.5, TOP + 0.9, 0.6, g - TOP - 2.8, RED_HOT);
  });
  // The rim lip.
  rbox(c, X0 - 0.3, TOP - 0.3, X1 - X0 + 0.6, 1.3, 0.5, RED, INK, LWI);
  box(c, X0 + 0.2, TOP - 0.05, X1 - X0 - 0.4, 0.3, RED_HOT);
  // The hand slot, and the lattice of holes below it.
  rbox(c, 5.4, TOP + 1.7, 5.2, 1.3, 0.65, CAB_DK, INK, LWI);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      rbox(c, 2.5 + col * 3.0, TOP + 4.0 + row * 2.6, 2.0, 1.6, 0.5, CAB_DK, INK, LWF);
    }
  }
  // A red tube in the rim, a brighter pulse chasing along it.
  tube(c, RED, 0.5, (p) => { p.moveTo(X0 + 0.6, TOP + 0.35); p.lineTo(X1 - 0.6, TOP + 0.35); }, 0.55, 0.3);
  const k = f / 8, px = X0 + 0.8 + k * (X1 - X0 - 1.6);
  tube(c, RED, 0.5, (p) => { p.moveTo(px - 0.6, TOP + 0.35); p.lineTo(px + 0.6, TOP + 0.35); }, 1, 0.4);
}

// B — COOLANT DRUM (barrel 17x17). A steel drum off a server-farm truck in the
// junction boxes' slate, two red tube hoops round it and a white-hot core in each,
// a small cyan coolant gauge as the one cool detail. The hoops breathe on the ring.
function neonBarrel(c, w, h, t) {
  const f = frameOf(t, 8, 8);
  const cx = w / 2, Y0 = 1.2, Y1 = h - 1.2, HW = 6.8;
  const drum = rr(cx - HW, Y0, HW * 2, Y1 - Y0, 4.6);
  body(c, drum, SLATE, (p) => {
    box(p, cx + HW - 3.0, 0, 4, h, SLATE_DK);
    box(p, cx - HW + 1.3, Y0 + 3.4, 0.8, Y1 - Y0 - 6.8, SLATE_LT);
    // The rolled chimes at the ends.
    box(p, 0, Y0, w, 1.0, SLATE_DK);
    box(p, 0, Y1 - 1.0, w, 1.0, SLATE_DK);
  });
  // The hoops: pressed steel bands carrying the red tube.
  const lit = [1, 0.9, 0.75, 0.6, 0.55, 0.6, 0.75, 0.9][f];
  for (const y of [Y0 + (Y1 - Y0) * 0.3, Y0 + (Y1 - Y0) * 0.7]) {
    rbox(c, cx - HW + 0.2, y - 0.8, HW * 2 - 0.4, 1.6, 0.6, CAB, INK, LWI);
    tube(c, RED, 0.75, (p) => { p.moveTo(cx - HW + 0.9, y); p.lineTo(cx + HW - 0.9, y); }, lit, 0.3);
  }
  // The coolant gauge: a little cyan window on the belly, and the bung on the lid.
  rbox(c, cx - 1.6, h / 2 - 1.0, 3.2, 2.0, 0.5, CAB_DK, INK, LWI);
  box(c, cx - 1.1, h / 2 - 0.1, 2.2, 0.6, CYAN);
  line(c, cx - 1.1, h / 2 - 0.1, cx + 1.1, h / 2 - 0.1, WHITE, 0.18);
  rbox(c, cx + 1.8, Y0 - 0.5, 2.2, 1.2, 0.3, STEEL, INK, LWF);
  box(c, cx + 1.9, Y0 - 0.4, 2.0, 0.3, STEEL_LT);
  // The ink once more round the whole drum, so the silhouette is one line.
  c.beginPath();
  drum(c);
  pen(c, INK, LW);
  c.stroke();
}

export const CRATE_BARREL = {
  cabinet: 'neon',
  candidates: [
    { letter: 'A', id: 'neonBox', name: 'BOTTLE CRATE', slot: 'stack', paint: neonBox,
      note: 'The plastic bottle crate stacked outside every izakaya back door: hazard-red moulding with a lit sliver and a shade band, a hand slot, a lattice of dark holes, empties standing in it, and a red tube in the rim with a pulse chasing along it. Replaces the crate; stacks two high.' },
    { letter: 'B', id: 'neonBarrel', name: 'COOLANT DRUM', slot: 'barrel', paint: neonBarrel,
      note: 'A slate steel drum, the junction boxes\' colour, with two red tube hoops (white-hot cores, breathing on the ring) and a small cyan coolant gauge. Drawn still and rounded; the run rolls it. Replaces the barrel.' },
  ],
};
