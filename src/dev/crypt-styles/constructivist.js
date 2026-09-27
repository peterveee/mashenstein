// CRYPT style bake-off — RUSSIAN CONSTRUCTIVISM. Rodchenko, El Lissitzky's "Beat the
// Whites with the Red Wedge", the Stenberg brothers' film posters: a night graveyard cut
// from four papers — black, deep red, signal red and cream — plus one warm grey.
//
// The picture is organised by two diagonals. The sky is a hard-stepped band of darkening
// reds tilted up to the right, and a red wedge drives in along that axis from the left
// edge and stabs into a cream moon; thin searchlight beams fan out of the moon the other
// way. Every ridge is resampled on a fixed world grid into straight facets, so hills are
// folded paper rather than curves, and each layer is tipped a few degrees against its
// neighbour so the horizons cross.
//
// Depth is carried by alternating planes, not by haze: the far ridge is signal red, the
// graveyard hill and everything on it is black cut out against that red, and the near
// bank is black with its railings, grass and lamp post printed in deep red so the strip
// behind the lane stays dark and quiet. The gas lamp's glass and its cone of light are
// the only cream below the sky. Fog is laid on as sheared grey paper strips.
//
// Consumes cryptFrame() exactly as ink.js does: sky, then bg -> mid -> fg with the abbey
// behind its ridge, fog between mid and fg and along the lane's back edge.

const TAU = Math.PI * 2;

// Papers.
const BLACK = '#161011';
const RED = '#c8102e';
const RED_FOLD = '#9c0c24'; // the same red in shadow, for the ridge folds
const DEEP = '#4f0b17'; // night red
const CREAM = '#ede3c8';
const GREY = '#7b7169';

// Sky: a hard-stepped band, darkest at the top, tipped up to the right.
const SKY_STEPS = [
  [-400, '#120d0d'],
  [30, '#1c0b0d'],
  [66, '#270b10'],
  [100, '#330c13'],
  [134, '#410d16'],
];
const SKY_TILT = -0.13; // radians; negative rises to the right
const SKY_PIVOT = [240, 120];

// Each layer is tipped against its neighbour (screen px of rise per px across).
const TILT = { bg: -0.03, mid: 0.02, fg: 0 };
// Facet grid step per layer, in the layer's own u, dividing its period exactly.
const FACET = { bg: 30, mid: 32, fg: 36 };
const PERIOD = { bg: 1440, mid: 1280, fg: 1800 };
// Footprint half-widths, as plan.js uses them to seat a thing on its crest.
const HALF_W = { abbey: 50, mausoleum: 22, gnarl: 8, tree: 4, lamp: 3 };

function seeded(i) {
  const x = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Tileable value noise on a 32 px lattice over the 256 px grain tile, for the blotches.
function mottle(x, y) {
  const n = 8;
  const gx = x / 32;
  const gy = y / 32;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  let fx = gx - x0;
  let fy = gy - y0;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const h = (i, j) => seeded(((i % n) + n) % n * 31.7 + (((j % n) + n) % n) * 7.1 + 500);
  const a = h(x0, y0);
  const b = h(x0 + 1, y0);
  const c = h(x0, y0 + 1);
  const d = h(x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

// ------------------------------------------------------------------ paper grain
// Baked once: uneven ink take-up (pale specks), a few darker fibres. Laid over the
// finished backdrop so every paper reads as the same aged stock.
let grain = null;
function grainPattern(ctx) {
  if (grain) return grain;
  const S = 256;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const k = (y * S + x) * 4;
      const n = seeded(x * 1.7 + y * 313.1);
      const m = seeded(x * 0.37 + y * 0.91 + 77);
      const mot = mottle(x, y);
      if (n > 0.997) { // a pale speck where the ink skipped
        d[k] = 237; d[k + 1] = 227; d[k + 2] = 200; d[k + 3] = 22 + m * 30;
      } else if (n < 0.012) { // a dark fleck in the stock
        d[k] = 20; d[k + 1] = 12; d[k + 2] = 12; d[k + 3] = 30 + m * 30;
      } else if (mot > 0.5) { // pale blotches where the stock has faded
        d[k] = 236; d[k + 1] = 222; d[k + 2] = 190; d[k + 3] = (mot - 0.5) * 26 + m * 5;
      } else { // and darker ones where it has foxed
        d[k] = 30; d[k + 1] = 14; d[k + 2] = 10; d[k + 3] = (0.5 - mot) * 30 + m * 5;
      }
    }
  }
  g.putImageData(img, 0, 0);
  // Fibres: short pale hairlines at random angles.
  g.strokeStyle = 'rgba(236,224,196,0.07)';
  g.lineWidth = 0.6;
  for (let i = 0; i < 70; i++) {
    const x = seeded(i * 3.1) * S;
    const y = seeded(i * 5.7 + 9) * S;
    const a = seeded(i * 7.3 + 4) * TAU;
    const l = 3 + seeded(i * 2.9 + 1) * 9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  grain = ctx.createPattern(c, 'repeat');
  return grain;
}

// ------------------------------------------------------------------ primitives
function poly(ctx, fill, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function rect(ctx, fill, x, y, w, h) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function disc(ctx, fill, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

// A straight polyline of bars that taper along its length — the constructivist tree.
// `pts` flat [x0,y0,x1,y1,...]; widths from w0 at the root to w1 at the tip.
function taperBars(ctx, fill, pts, w0, w1) {
  const n = pts.length / 2 - 1;
  ctx.fillStyle = fill;
  for (let k = 0; k < n; k++) {
    const ax = pts[k * 2];
    const ay = pts[k * 2 + 1];
    const bx = pts[k * 2 + 2];
    const by = pts[k * 2 + 3];
    const wa = w0 + (w1 - w0) * (k / n);
    const wb = w0 + (w1 - w0) * ((k + 1) / n);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    // Overlap each bar a touch into the next so the joint stays solid.
    const ex = (bx - ax) / len * wb * 0.35;
    const ey = (by - ay) / len * wb * 0.35;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2);
    ctx.lineTo(bx + ex + nx * wb / 2, by + ey + ny * wb / 2);
    ctx.lineTo(bx + ex - nx * wb / 2, by + ey - ny * wb / 2);
    ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
    ctx.closePath();
    ctx.fill();
  }
}

// ------------------------------------------------------------------ sky
function sky(ctx, f) {
  const [px, py] = SKY_PIVOT;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(SKY_TILT);
  ctx.translate(-px, -py);
  for (let k = 0; k < SKY_STEPS.length; k++) {
    const y0 = SKY_STEPS[k][0];
    const y1 = k + 1 < SKY_STEPS.length ? SKY_STEPS[k + 1][0] : 700;
    rect(ctx, SKY_STEPS[k][1], -300, y0, 1100, y1 - y0 + 1);
  }
  ctx.restore();

  const m = f.moon;
  beams(ctx, f);
  stars(ctx, f);

  // Moon: a cream disc on a thin offset orbit ring, the red wedge driven into it.
  ctx.beginPath();
  ctx.arc(m.x + 5, m.y - 4, m.r + 9, 0, TAU);
  ctx.strokeStyle = CREAM;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  disc(ctx, CREAM, m.x, m.y, m.r);
  redWedge(ctx, m);

  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
}

// Searchlight beams fanning left out of the moon, sweeping a few degrees on a slow clock.
function beams(ctx, f) {
  const m = f.moon;
  const sweep = 0.035 * Math.sin(f.t * 0.35);
  const R = 900;
  const fan = [
    // [angle, half-width, colour, alpha]
    [Math.PI + 0.46 + sweep, 0.09, DEEP, 1],
    [Math.PI + 0.43 + sweep, 0.012, CREAM, 0.9],
    [Math.PI + 0.72 - sweep * 0.6, 0.006, CREAM, 0.75],
    [Math.PI - 0.5 + sweep * 0.8, 0.05, '#5a0c19', 1],
    [Math.PI - 0.47 + sweep * 0.8, 0.008, CREAM, 0.7],
  ];
  for (const [a, hw, col, al] of fan) {
    ctx.globalAlpha = al;
    poly(ctx, col, [
      m.x, m.y,
      m.x + Math.cos(a - hw) * R, m.y + Math.sin(a - hw) * R,
      m.x + Math.cos(a + hw) * R, m.y + Math.sin(a + hw) * R,
    ]);
  }
  ctx.globalAlpha = 1;
}

function stars(ctx, f) {
  ctx.fillStyle = CREAM;
  for (const s of f.stars) {
    const r = s.s * (0.55 + 0.45 * s.twinkle);
    ctx.globalAlpha = 0.45 + 0.55 * s.twinkle;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - r);
    ctx.lineTo(s.x + r, s.y);
    ctx.lineTo(s.x, s.y + r);
    ctx.lineTo(s.x - r, s.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// El Lissitzky's wedge: a long signal-red triangle from off the left edge, its point
// buried in the moon.
function redWedge(ctx, m) {
  const ax = m.x - 4;
  const ay = m.y + 3;
  poly(ctx, RED, [-60, 122, ax, ay, -60, 170]);
  // A black counter-bar along its lower edge: the cut-paper shadow.
  poly(ctx, BLACK, [-60, 170, ax, ay, ax - 60, ay + 13.5, -60, 176]);
}

// A cloud is two overlapping grey paper strips, tipped with the sky.
function cloud(ctx, c) {
  ctx.save();
  ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
  ctx.rotate(SKY_TILT * 0.6 + (seeded(c.i * 4.1) - 0.5) * 0.08);
  const w = c.w;
  const h = c.h;
  rect(ctx, GREY, -w / 2, -h / 2, w * 0.74, h * 0.46);
  rect(ctx, '#5d544e', -w / 2 + w * 0.3, -h / 2 + h * 0.52, w * 0.7, h * 0.4);
  rect(ctx, BLACK, -w / 2 + w * 0.12, -h / 2 + h * 0.46, w * 0.28, h * 0.14);
  ctx.restore();
}

// A bat: a red paper cut-out — two angular wings with a stepped trailing edge and a
// black diamond body — on a black twin knocked a pixel off, so it holds on the red too.
function bat(ctx, b) {
  const up = Math.cos(b.flap * TAU);
  const wing = (sx) => {
    const tipY = -7 * up - 1;
    ctx.moveTo(sx * 1, -1);
    ctx.lineTo(sx * 11, tipY);
    ctx.lineTo(sx * 9, tipY * 0.35 + 2);
    ctx.lineTo(sx * 6.5, tipY * 0.2 + 1);
    ctx.lineTo(sx * 4.5, 2.4);
    ctx.lineTo(sx * 1, 1.5);
    ctx.closePath();
  };
  for (const [dx, dy, fill] of [[1, 1, BLACK], [0, 0, RED]]) {
    ctx.save();
    ctx.translate(b.x + dx, b.y + dy);
    ctx.scale(b.s, b.s);
    ctx.fillStyle = fill;
    ctx.beginPath();
    wing(-1);
    wing(1);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.s, b.s);
  poly(ctx, BLACK, [0, -3, 2, 0.5, 0, 3.5, -2, 0.5]);
  ctx.restore();
}

// ------------------------------------------------------------------ land
// Resample a layer's ridge onto a fixed world grid so its crest is straight facets that
// scroll with the layer, tip it by the layer's tilt, and seat items on that polyline.
function facetLayer(f, name) {
  const L = f.layers[name];
  const step = FACET[name];
  const cells = PERIOD[name] / step;
  const tilt = TILT[name];
  const k0 = Math.floor((-80 + L.shift) / step);
  const k1 = Math.ceil((f.W + 80 + L.shift) / step);
  const pts = [];
  for (let k = k0; k <= k1; k++) {
    const kk = ((k % cells) + cells) % cells;
    const u = k * step + (seeded(kk * 1.31 + name.length * 17) - 0.5) * step * 0.45;
    const x = u - L.shift;
    pts.push({ x, y: L.ridge(x) + (x - 240) * tilt, kk });
  }
  const yAt = (x) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (x <= b.x) {
        const t = (x - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * Math.max(0, Math.min(1, t));
      }
    }
    return pts[pts.length - 1].y;
  };
  const foot = (x, halfW) => {
    let y = -Infinity;
    for (let dx = -halfW; dx <= halfW; dx += 2) y = Math.max(y, yAt(x + dx));
    return y;
  };
  const items = L.items.map((it) => {
    if (it.kind === 'fence') return it;
    const hw = (HALF_W[it.kind] ?? 3) * it.s;
    return { ...it, y: foot(it.x, hw) };
  });
  return { L, pts, yAt, foot, items, tilt };
}

function crestPath(ctx, pts, dy) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, 360);
  for (const p of pts) ctx.lineTo(p.x, p.y + dy);
  ctx.lineTo(pts[pts.length - 1].x, 360);
  ctx.closePath();
}

function ridgeFill(ctx, F, fill, fold, low) {
  const { pts } = F;
  crestPath(ctx, pts, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  if (!fold) return;
  // Folds: every facet that falls away from the moon (rising to the right) is in shade,
  // cut as a sharp triangle down into the hill.
  ctx.fillStyle = fold;
  ctx.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (b.y >= a.y - 0.5) continue;
    const depth = 10 + seeded(a.kk * 2.7) * 14;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(a.x + (b.x - a.x) * 0.2, a.y + depth);
    ctx.closePath();
  }
  ctx.fill();
  // A hard step down to a darker red a band's width under the crest, so the red that
  // stands behind the hazards' heads is the quiet one.
  if (low) {
    crestPath(ctx, pts, low[0]);
    ctx.fillStyle = low[1];
    ctx.fill();
  }
}

// The abbey as stacked blocks: a nave wall broken off in steps, three red lancet slits,
// a tower with a two-tone spire wedge, and a roofless transept with a red rose.
function abbey(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.scale(it.s, it.s);
  // Nave.
  poly(ctx, BLACK, [
    -54, 4, -54, -26, -48, -26, -48, -31, -38, -31, -38, -28, -33, -28, -33, -37,
    -22, -37, -22, -34, -16, -34, -16, -41, -6, -41, -6, -38, 2, -38, 2, 4,
  ]);
  for (const x of [-42, -27, -12]) {
    poly(ctx, RED, [x - 3, -6, x - 3, -22, x, -27, x + 3, -22, x + 3, -6]);
  }
  // A red sill bar under the lancets.
  rect(ctx, DEEP, -52, -6, 52, 2);
  // Tower, tipped a hair as if the ruin has settled.
  ctx.save();
  ctx.translate(10, 2);
  ctx.rotate(0.035);
  ctx.translate(-10, -2);
  rect(ctx, BLACK, 2, -54, 16, 58);
  rect(ctx, DEEP, 14, -54, 4, 58);
  poly(ctx, RED, [8, -32, 8, -42, 10, -45, 12, -42, 12, -32]);
  // Spire: the left half black, the moon side red.
  poly(ctx, BLACK, [0, -54, 10, -88, 10, -54]);
  poly(ctx, RED, [10, -88, 20, -54, 10, -54]);
  rect(ctx, BLACK, -1, -56, 22, 3);
  ctx.restore();
  // Transept, its roof sheared off on a diagonal.
  poly(ctx, BLACK, [18, 4, 18, -27, 29, -35, 33, -31, 38, -36, 50, -23, 50, 4]);
  disc(ctx, RED, 34, -17, 4.8);
  rect(ctx, BLACK, 33.2, -21.8, 1.6, 9.6);
  rect(ctx, BLACK, 29.2, -17.8, 9.6, 1.6);
  ctx.restore();
}

// A dead tree as a structure of straight tapering bars forking at hard angles.
function deadTree(ctx, x, y, s, lean, fill, w = 3) {
  const L = lean;
  const P = (dx, dy) => [x + dx * s, y + dy * s];
  taperBars(ctx, fill, [...P(0, 2), ...P(L * 4, -24), ...P(L * 8, -52)], w * 1.3 * s, w * 0.35 * s);
  taperBars(ctx, fill, [...P(L * 3, -18), ...P(-11, -32), ...P(-18, -44)], w * 0.8 * s, w * 0.25 * s);
  taperBars(ctx, fill, [...P(-11, -32), ...P(-22, -35)], w * 0.5 * s, w * 0.2 * s);
  taperBars(ctx, fill, [...P(L * 5, -29), ...P(13, -39), ...P(21, -43)], w * 0.8 * s, w * 0.25 * s);
  taperBars(ctx, fill, [...P(13, -39), ...P(15, -50)], w * 0.5 * s, w * 0.2 * s);
  taperBars(ctx, fill, [...P(L * 6.5, -41), ...P(-4, -53)], w * 0.5 * s, w * 0.2 * s);
}

function grove(ctx, it) {
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (seeded(it.i * 7 + k) - 0.5) * 6;
    const sc = (0.42 + seeded(it.i * 11 + k) * 0.24) * it.s;
    deadTree(ctx, it.x + dx, it.y + 2, sc, (seeded(k + it.i) - 0.5) * 0.8, BLACK, 3.2);
  }
}

function mausoleum(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.scale(it.s, it.s);
  rect(ctx, BLACK, -24, -4, 48, 8);
  rect(ctx, BLACK, -20, -8, 40, 4);
  rect(ctx, BLACK, -18, -32, 36, 24);
  // Columns and door jambs printed in deep red on the black block.
  rect(ctx, DEEP, -15, -31, 3, 23);
  rect(ctx, DEEP, 12, -31, 3, 23);
  rect(ctx, DEEP, -20, -8, 40, 1.2);
  poly(ctx, DEEP, [-6.5, -8, -6.5, -19, 0, -25, 6.5, -19, 6.5, -8]);
  poly(ctx, BLACK, [-4.5, -8, -4.5, -18, 0, -22.5, 4.5, -18, 4.5, -8]);
  if (it.variant === 1) {
    rect(ctx, BLACK, -20, -36, 40, 4);
    ctx.beginPath();
    ctx.arc(0, -36, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = BLACK;
    ctx.fill();
    rect(ctx, BLACK, -0.9, -57, 1.8, 8);
    rect(ctx, BLACK, -3.5, -54, 7, 1.8);
  } else {
    poly(ctx, BLACK, [-23, -32, 0, -45, 23, -32]);
    poly(ctx, DEEP, [-15, -34, 0, -42, 15, -34]);
  }
  ctx.restore();
}

function stone(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y + 1.5);
  ctx.rotate((seeded(it.i * 3.3) - 0.5) * 0.36);
  ctx.scale(it.s, it.s);
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  if (it.variant === 2) {
    ctx.rect(-4, -3, 8, 4);
    ctx.moveTo(-2.6, -3); ctx.lineTo(-1.6, -18); ctx.lineTo(0, -22); ctx.lineTo(1.6, -18); ctx.lineTo(2.6, -3);
  } else if (it.variant === 1) {
    ctx.moveTo(-5, 1); ctx.lineTo(-5, -12); ctx.lineTo(-1.8, -12); ctx.lineTo(0, -14.5);
    ctx.lineTo(1.8, -12); ctx.lineTo(5, -12); ctx.lineTo(5, 1);
  } else {
    ctx.moveTo(-4.5, 1); ctx.lineTo(-4.5, -9); ctx.arc(0, -9, 4.5, Math.PI, 0); ctx.lineTo(4.5, 1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cross(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y + 1.5);
  ctx.rotate((seeded(it.i * 5.1) - 0.5) * 0.3);
  ctx.scale(it.s, it.s);
  if (it.i % 2 === 0) {
    ctx.beginPath();
    ctx.arc(0, -14.5, 4.4, 0, TAU);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  rect(ctx, BLACK, -1.7, -21, 3.4, 22);
  rect(ctx, BLACK, -6.2, -16.2, 12.4, 3.4);
  ctx.restore();
}

// The near tree: straight black bars, claw branches reaching right, one red bar struck
// across it as the moon catches the trunk.
function gnarl(ctx, it) {
  const s = it.s;
  const x = it.x;
  const y = it.y + 3;
  const flip = it.variant === 1 ? -1 : 1;
  const P = (dx, dy) => [x + dx * s * flip, y + dy * s];
  const T = (pts, w0, w1) => taperBars(ctx, BLACK, pts, w0 * s, w1 * s);
  T([...P(0, 0), ...P(-5, -30), ...P(4, -58), ...P(0, -86)], 11, 5);
  T([...P(2, -50), ...P(24, -66), ...P(44, -63), ...P(60, -75)], 5.5, 1.4);
  T([...P(44, -63), ...P(53, -55), ...P(63, -58)], 2.4, 0.9);
  T([...P(30, -66), ...P(36, -83), ...P(49, -93)], 3, 0.9);
  T([...P(0, -80), ...P(-14, -100), ...P(-27, -105)], 4.2, 1.2);
  T([...P(-14, -100), ...P(-11, -115)], 2.2, 0.8);
  T([...P(1, -84), ...P(14, -104), ...P(30, -112), ...P(39, -125)], 4, 1);
  T([...P(21, -107), ...P(29, -100), ...P(37, -103)], 2, 0.8);
  T([...P(-2, -36), ...P(-18, -47), ...P(-27, -44)], 3.4, 1);
  // Roots: two black wedges.
  poly(ctx, BLACK, [...P(-4, -6), ...P(-16, 4), ...P(0, 4)]);
  poly(ctx, BLACK, [...P(4, -6), ...P(16, 4), ...P(0, 4)]);
}

// Railings: a rhythmic row of deep-red bars with spear points, two rails, and a gate of
// taller bars under a half-disc arch.
function fence(ctx, it, F) {
  const gateHalf = 15;
  ctx.fillStyle = DEEP;
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    const b = F.yAt(x);
    ctx.fillRect(x - 0.9, b - 20, 1.8, 21);
    ctx.beginPath();
    ctx.moveTo(x - 2, b - 20); ctx.lineTo(x, b - 25); ctx.lineTo(x + 2, b - 20);
    ctx.closePath();
    ctx.fill();
  }
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  ctx.strokeStyle = DEEP;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      ctx.moveTo(a, F.yAt(a) - h);
      for (let x = a + 6; x < b; x += 6) ctx.lineTo(x, F.yAt(x) - h);
      ctx.lineTo(b, F.yAt(b) - h);
    }
  }
  ctx.stroke();
  if (it.gate != null) {
    const g = it.gate;
    const b = F.foot(g, gateHalf);
    rect(ctx, DEEP, g - gateHalf - 1.6, b - 32, 3.2, 33);
    rect(ctx, DEEP, g + gateHalf - 1.6, b - 32, 3.2, 33);
    ctx.beginPath();
    ctx.arc(g, b - 26, gateHalf, Math.PI, 0);
    ctx.lineWidth = 2;
    ctx.strokeStyle = DEEP;
    ctx.stroke();
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      const top = b - 26 - Math.sqrt(Math.max(0, gateHalf * gateHalf - (x - g) * (x - g)));
      rect(ctx, DEEP, x - 0.8, top, 1.6, b - top + 1);
    }
    rect(ctx, DEEP, g - gateHalf, b - 13, gateHalf * 2, 1.6);
    for (const x of [g - gateHalf, g + gateHalf]) poly(ctx, DEEP, [x - 3, b - 32, x, b - 37, x + 3, b - 32]);
  }
}

// The gas lamp: a black post, a cream pane, and a hard cone of light thrown down.
function lamp(ctx, it, t) {
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const flicker = 0.9 + 0.1 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  ctx.globalAlpha = 0.13 * flicker;
  poly(ctx, CREAM, [x - 4 * s, y - 40 * s, x + 4 * s, y - 40 * s, x + 22 * s, y + 2, x - 22 * s, y + 2]);
  ctx.globalAlpha = 0.2 * flicker;
  disc(ctx, CREAM, x, y - 41 * s, 11 * s);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  rect(ctx, BLACK, -1.5, -35, 3, 36);
  rect(ctx, BLACK, -4, -3, 8, 4);
  rect(ctx, BLACK, -5, -37, 10, 2);
  poly(ctx, CREAM, [-4.5, -37, 4.5, -37, 3.5, -46, -3.5, -46]);
  rect(ctx, BLACK, -0.6, -46, 1.2, 9);
  poly(ctx, BLACK, [-6.5, -45.5, 0, -52, 6.5, -45.5]);
  ctx.restore();
}

// Grass: a fan of thin deep-red spikes.
function grass(ctx, it) {
  ctx.fillStyle = DEEP;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 2.2 * it.s;
    const h = (7 + seeded(it.i * 13 + k) * 7) * it.s;
    const bend = (seeded(it.i + k * 5) - 0.4) * 6 * it.s;
    const bx = it.x + dx;
    ctx.moveTo(bx - 1, it.y + 3);
    ctx.lineTo(bx + bend, it.y - h);
    ctx.lineTo(bx + 1, it.y + 3);
    ctx.closePath();
  }
  ctx.fill();
}

// Fog: each puff a sheared grey paper strip; a second, shorter strip on top gives the
// band a hard two-step edge instead of a soft one.
function fogBand(ctx, band, alpha) {
  const shear = 5;
  for (const [a, sh, sx] of [[alpha, 1, 1], [alpha * 0.9, 0.45, 0.62]]) {
    ctx.globalAlpha = a;
    ctx.fillStyle = GREY;
    ctx.beginPath();
    for (const p of band.puffs) {
      const rx = p.rx * sx;
      const top = p.y - p.ry * sh;
      const bot = p.y + p.ry * sh * 0.8;
      ctx.moveTo(p.x - rx + shear, top);
      ctx.lineTo(p.x + rx + shear, top);
      ctx.lineTo(p.x + rx, bot);
      ctx.lineTo(p.x - rx, bot);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawItems(ctx, f, F) {
  for (const it of F.items) {
    if (it.kind === 'grove') grove(ctx, it);
    else if (it.kind === 'mausoleum') mausoleum(ctx, it);
    else if (it.kind === 'tree') deadTree(ctx, it.x, it.y, it.s, it.variant === 1 ? -0.8 : 0.2, BLACK, 3.4);
    else if (it.kind === 'stone') stone(ctx, it);
    else if (it.kind === 'cross') cross(ctx, it);
    else if (it.kind === 'gnarl') gnarl(ctx, it);
    else if (it.kind === 'fence') fence(ctx, it, F);
    else if (it.kind === 'lamp') lamp(ctx, it, f.t);
    else if (it.kind === 'grass') grass(ctx, it);
  }
}

export const STYLE = {
  id: 'constructivist',
  name: 'RED WEDGE',
  note: 'Russian constructivist poster: black, signal red and cream paper on hard diagonals. A red wedge '
    + 'stabs a cream moon, the hills are folded into straight facets, and the graveyard is cut out in black '
    + 'against a red horizon.',
  paint(ctx, f) {
    sky(ctx, f);
    const bg = facetLayer(f, 'bg');
    for (const it of bg.items) if (it.kind === 'abbey') abbey(ctx, it);
    ridgeFill(ctx, bg, RED, RED_FOLD, [15, '#7a0b1e']);
    drawItems(ctx, f, bg);
    const mid = facetLayer(f, 'mid');
    ridgeFill(ctx, mid, BLACK, null);
    drawItems(ctx, f, mid);
    fogBand(ctx, f.fog[0], 0.24);
    const fg = facetLayer(f, 'fg');
    ridgeFill(ctx, fg, BLACK, null);
    drawItems(ctx, f, fg);
    fogBand(ctx, f.fog[1], 0.2);
    // The paper: one grain pass over the whole print.
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(-40, -80, f.W + 80, f.H + 160);
  },
};
