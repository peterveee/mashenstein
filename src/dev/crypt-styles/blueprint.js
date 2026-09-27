// CRYPT style bake-off — BLUEPRINT. The graveyard as an architect's sheet on cyanotype
// paper: a mottled Prussian-blue ground with faint fibre, a fine cyan grid, and every
// object a white line drawing. No solid fills anywhere: mass is a faint white wash or a
// light hatch, openings are cross-hatched, and the ruined wall tops are section-hatched
// where they are "cut".
//
// Depth is line weight and brightness: the far ridge is thin and faint, the graveyard
// hill a step brighter, the near bank the heaviest line on the sheet. Each depth layer
// is its own overlaid sheet: its ground (and every building standing on it) is re-laid
// with paper and carries a grid that scrolls with that layer, so no grid line ever slides
// across a building. The sky's grid is fixed to the sheet. The gas lamp is the one warm
// line on the drawing.
//
// Consumes cryptFrame() exactly as ink.js does: sky, then bg -> mid -> fg with the abbey
// behind its ridge, fog between mid and fg and along the lane's back edge.
import { CRYPT_PLAN } from './plan.js';

const TAU = Math.PI * 2;
// The baked sheet covers the frame plus overscan.
const SX = -40;
const SY = -80;
const SW = 560;
const SH = 440;

const LINE = [228, 244, 255];
const CYAN = [120, 204, 255];
const AMBER = [255, 206, 122];
const PAPER_MEAN = [12, 49, 100];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${(a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3)})`;
// An opaque line colour: LINE laid over the average paper at alpha a. Used where strokes
// overlap (tube outlines), so joints do not double up in brightness.
const solid = (c, a) => rgba([
  Math.round(PAPER_MEAN[0] + (c[0] - PAPER_MEAN[0]) * a),
  Math.round(PAPER_MEAN[1] + (c[1] - PAPER_MEAN[1]) * a),
  Math.round(PAPER_MEAN[2] + (c[2] - PAPER_MEAN[2]) * a),
], 1);

// Line dashes, in logical px.
const CENTRE = [4.2, 1.1, 0.8, 1.1];
const HIDDEN = [1.8, 1.4];

// Per layer: line alpha, outline weight, grid alphas and the translucent wash on mass.
const LAYER = {
  bg: { a: 0.5, w: 0.55, grid: 0.045, major: 0.09, wash: 0.022, band: 4 },
  mid: { a: 0.72, w: 0.72, grid: 0.04, major: 0.085, wash: 0.03, band: 4 },
  fg: { a: 0.94, w: 1.0, grid: 0.035, major: 0.075, wash: 0.04, band: 0 },
};

function seeded(i) {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}
function ihash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, cell, seed) {
  const gx = x / cell;
  const gy = y / cell;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = ihash(ix, iy, seed);
  const b = ihash(ix + 1, iy, seed);
  const c = ihash(ix, iy + 1, seed);
  const d = ihash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ------------------------------------------------------------------ the paper
// Baked once: a vertical ramp from deep Prussian at the top of the sky to a slightly
// paler cyanotype blue at the horizon, mottled at three scales, a faint cyan cast that
// wanders, per-pixel tooth, a soft darkening at the frame edges, and paper fibre.
const PAPER_RAMP = [
  [-80, [7, 30, 68]],
  [40, [9, 40, 86]],
  [160, [12, 51, 104]],
  [232, [14, 57, 112]],
  [360, [14, 57, 112]],
];
// Baked at the device's pixel ratio (rounded), so laying paper is a 1:1 copy.
const PAPERS = new Map();
function paperCanvas(R) {
  if (PAPERS.has(R)) return PAPERS.get(R);
  // The slow fields at logical resolution first.
  const mott = new Float32Array(SW * SH);
  const cast = new Float32Array(SW * SH);
  for (let py = 0; py < SH; py++) {
    for (let px = 0; px < SW; px++) {
      const o = py * SW + px;
      mott[o] = 0.5 * vnoise(px, py, 64, 3) + 0.32 * vnoise(px, py, 21, 7) + 0.18 * vnoise(px, py, 6, 11);
      cast[o] = vnoise(px, py, 90, 19) - 0.5;
    }
  }
  const W = SW * R;
  const H = SH * R;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let dy = 0; dy < H; dy++) {
    const py = Math.min(SH - 1, Math.floor(dy / R));
    const y = dy / R + SY;
    let k = 0;
    while (k < PAPER_RAMP.length - 2 && y > PAPER_RAMP[k + 1][0]) k++;
    const [y0, c0] = PAPER_RAMP[k];
    const [y1, c1] = PAPER_RAMP[k + 1];
    const f = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    const br = c0[0] + (c1[0] - c0[0]) * f;
    const bg = c0[1] + (c1[1] - c0[1]) * f;
    const bb = c0[2] + (c1[2] - c0[2]) * f;
    for (let dx = 0; dx < W; dx++) {
      const px = Math.min(SW - 1, Math.floor(dx / R));
      const x = dx / R + SX;
      const o = py * SW + px;
      // Edges of the visible frame run a touch darker, as a coated sheet does.
      const edge = Math.min(x + 6, 486 - x, y + 6, 60);
      const vig = 0.9 + 0.1 * Math.max(0, Math.min(1, edge / 60));
      const tooth = (ihash(dx, dy, 5 + R) - 0.5) * 4;
      const mul = (1 + (mott[o] - 0.5) * 0.3) * vig;
      const q = (dy * W + dx) * 4;
      d[q] = br * mul + tooth;
      d[q + 1] = bg * mul + cast[o] * 9 + tooth;
      d[q + 2] = bb * mul + cast[o] * 5 + tooth * 1.4;
      d[q + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Fibre: short, faintly curved strands, most a shade paler than the sheet.
  g.scale(R, R);
  g.lineCap = 'round';
  for (let i = 0; i < 700; i++) {
    const x = ihash(i, 1, 31) * SW;
    const y = ihash(i, 2, 31) * SH;
    const ang = ihash(i, 3, 31) * TAU;
    const len = 3 + ihash(i, 4, 31) * 11;
    const bend = (ihash(i, 5, 31) - 0.5) * 4;
    const dark = ihash(i, 6, 31) < 0.25;
    g.strokeStyle = dark ? 'rgba(2,12,34,0.16)' : `rgba(170,214,255,${(0.04 + ihash(i, 7, 31) * 0.05).toFixed(3)})`;
    g.lineWidth = 0.4 + ihash(i, 8, 31) * 0.4;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo((x + ex) / 2 - Math.sin(ang) * bend, (y + ey) / 2 + Math.cos(ang) * bend, ex, ey);
    g.stroke();
  }
  PAPERS.set(R, c);
  return c;
}

// The paper as a pattern locked to the sheet whatever the current transform, so a
// rotated headstone or a scaled bat is filled with exactly the paper beneath it.
const patterns = new WeakMap();
function paperPattern(S) {
  const { ctx } = S;
  let m = patterns.get(ctx);
  if (!m) patterns.set(ctx, (m = new Map()));
  let p = m.get(S.paper);
  if (!p) {
    p = ctx.createPattern(S.paper, 'no-repeat');
    m.set(S.paper, p);
  }
  p.setTransform(ctx.getTransform().invertSelf().multiplySelf(S.sheetM));
  return p;
}

// ------------------------------------------------------------------ primitives
// Lay fresh paper inside a path (drawn in the current transform), optionally with a
// faint white wash over it.
function paper(S, pathFn, wash = 0, rule = 'nonzero') {
  const { ctx } = S;
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = paperPattern(S);
  ctx.fill(rule);
  if (wash) {
    ctx.fillStyle = rgba(LINE, wash);
    ctx.fill(rule);
  }
}

// The same, then run `after` in frame coordinates, still clipped: a layer's grid. `box`
// bounds the work in frame coordinates, [x0, y0, x1, y1].
function sheet(S, pathFn, after, box) {
  const { ctx } = S;
  const x0 = Math.max(SX, Math.floor(box[0]));
  const y0 = Math.max(SY, Math.floor(box[1]));
  const x1 = Math.min(SX + SW, Math.ceil(box[2]));
  const y1 = Math.min(SY + SH, Math.ceil(box[3]));
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save();
  ctx.beginPath();
  pathFn(ctx);
  ctx.clip();
  ctx.setTransform(S.base);
  const R = S.R;
  ctx.drawImage(S.paper, (x0 - SX) * R, (y0 - SY) * R, (x1 - x0) * R, (y1 - y0) * R, x0, y0, x1 - x0, y1 - y0);
  if (after) after(ctx, [x0, y0, x1, y1]);
  ctx.restore();
}

function stroke(ctx, style, width, dash) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.setLineDash(dash || []);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function poly(ctx, pts, close) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  if (close) ctx.closePath();
}

// Parallel 45-degree lines over a box: dir 1 is '/', -1 is '\'. `off` anchors the
// family so a moving thing keeps its own hatch.
function hatch(ctx, x0, y0, x1, y1, sp, dir, off = 0) {
  if (dir > 0) {
    const c0 = Math.floor((x0 + y0 - off) / sp) * sp + off;
    for (let C = c0; C <= x1 + y1; C += sp) {
      ctx.moveTo(C - y1, y1);
      ctx.lineTo(C - y0, y0);
    }
  } else {
    const c0 = Math.floor((x0 - y1 - off) / sp) * sp + off;
    for (let C = c0; C <= x1 - y0; C += sp) {
      ctx.moveTo(C + y0, y0);
      ctx.lineTo(C + y1, y1);
    }
  }
}

// A grid: minor every 8 px, major every 40. Verticals scroll with `shift`; horizontals
// are the sheet's own and never move. It steps down in strength toward the lane so the
// strip above it stays quiet. `box` bounds it; `top(x)` (a ridge) starts each vertical
// lower and `runs(y)` gives the spans of each horizontal, so a hill's grid needs no clip.
const FADE = [[150, 1], [185, 0.8], [210, 0.6], [Infinity, 0.4]];
function fadeLevel(y) {
  let k = 0;
  while (y >= FADE[k][0]) k++;
  return k;
}
function grid(S, shift, aMinor, aMajor, box = [SX, SY, SX + SW, 240], top = null, runs = null) {
  const { ctx } = S;
  const still = shift === 0;
  const y0 = box[1];
  const y1 = Math.min(240, box[3]);
  for (const [step, a, minor] of [[8, aMinor, true], [40, aMajor, false]]) {
    const paths = FADE.map(() => []);
    const off = ((shift % step) + step) % step;
    const bx0 = Math.floor((box[0] + off) / step) * step - off;
    for (let x = bx0; x <= box[2]; x += step) {
      if (minor) {
        const k = Math.round((x + shift) / 8);
        if (((k % 5) + 5) % 5 === 0) continue;
      }
      const X = still ? S.snap(x) : x;
      let ya = top ? Math.max(y0, top(x)) : y0;
      while (ya < y1) {
        const k = fadeLevel(ya);
        const yb = Math.min(y1, FADE[k][0]);
        paths[k].push(X, ya, X, yb);
        ya = yb;
      }
    }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      if (minor && ((y / 8) % 5 + 5) % 5 === 0) continue;
      const Y = S.snap(y);
      const k = fadeLevel(y);
      for (const [xa, xb] of runs ? runs(y) : [[box[0], box[2]]]) paths[k].push(xa, Y, xb, Y);
    }
    paths.forEach((segs, k) => {
      if (!segs.length) return;
      ctx.beginPath();
      for (let n = 0; n < segs.length; n += 4) {
        ctx.moveTo(segs[n], segs[n + 1]);
        ctx.lineTo(segs[n + 2], segs[n + 3]);
      }
      stroke(ctx, rgba(CYAN, a * FADE[k][1]), S.hair);
    });
  }
}

// The spans of a horizontal line at `y` that lie under a crest (below it on screen).
function crestRuns(crest, y) {
  const out = [];
  let start = crest[0].y < y ? crest[0].x : null;
  for (let k = 1; k < crest.length; k++) {
    const q = crest[k - 1];
    const p = crest[k];
    const inP = p.y < y;
    if (inP !== q.y < y) {
      const xc = q.x + ((p.x - q.x) * (y - q.y)) / (p.y - q.y);
      if (inP) start = xc;
      else { out.push([start, xc]); start = null; }
    }
  }
  if (start !== null) out.push([start, crest[crest.length - 1].x]);
  return out;
}

// Text on a paper mask, like a CAD label knocked out of whatever it sits on.
function label(S, text, x, y, size, a, rot = 0, opts = {}) {
  const { ctx } = S;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.font = `${opts.weight || 500} ${size}px sans-serif`;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const lx = opts.align === 'left' ? 0 : opts.align === 'right' ? -w : -w / 2;
  if (opts.mask !== false) paper(S, (c) => c.rect(lx - 0.8, -size * 0.55, w + 1.6, size * 1.1));
  ctx.fillStyle = rgba(opts.color || LINE, a);
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

// Architectural tick: a short 45-degree slash through a dimension line's end.
function tick(ctx, x, y, len = 1.6) {
  ctx.moveTo(x - len, y + len);
  ctx.lineTo(x + len, y - len);
}
function arrow(ctx, x, y, ang, len = 2.6) {
  // Filled open-ended engineering arrowhead pointing along `ang`, tip at (x, y).
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(ang - 0.32) * len, y - Math.sin(ang - 0.32) * len);
  ctx.lineTo(x - Math.cos(ang + 0.32) * len, y - Math.sin(ang + 0.32) * len);
  ctx.closePath();
}

// Horizontal dimension string: extension-free, ticks at every station, one label.
function dimH(S, xs, y, text, a, w, size = 4.6) {
  const { ctx } = S;
  ctx.beginPath();
  ctx.moveTo(xs[0] - 2, y);
  ctx.lineTo(xs[xs.length - 1] + 2, y);
  for (const x of xs) tick(ctx, x, y);
  stroke(ctx, rgba(LINE, a), w);
  label(S, text, (xs[0] + xs[xs.length - 1]) / 2, y - size * 0.75, size, a * 1.05);
}

// Vertical dimension with arrowheads, label rotated to read up the line in a gap.
function dimV(S, x, y0, y1, text, a, w, size = 4.8) {
  const { ctx } = S;
  const mid = (y0 + y1) / 2;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  stroke(ctx, rgba(LINE, a), w);
  ctx.beginPath();
  arrow(ctx, x, y0, Math.PI / 2);
  arrow(ctx, x, y1, -Math.PI / 2);
  ctx.fillStyle = rgba(LINE, a);
  ctx.fill();
  label(S, text, x, mid, size, a * 1.05, -Math.PI / 2);
}

function callout(S, cx, cy, n, tx, ty, a) {
  const { ctx } = S;
  const r = 3.9;
  const ang = Math.atan2(ty - cy, tx - cx);
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
  ctx.lineTo(tx, ty);
  stroke(ctx, rgba(LINE, a * 0.8), S.hair * 1.2);
  ctx.beginPath();
  ctx.arc(tx, ty, 0.8, 0, TAU);
  ctx.fillStyle = rgba(LINE, a);
  ctx.fill();
  paper(S, (c) => c.arc(cx, cy, r, 0, TAU));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  stroke(ctx, rgba(LINE, a), 0.6);
  label(S, String(n), cx, cy + 0.1, 4.8, a, 0, { mask: false, weight: 600 });
}

function centreLine(S, x0, y0, x1, y1, a) {
  const { ctx } = S;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  stroke(ctx, rgba(CYAN, a), S.hair * 1.1, CENTRE);
}

// Drafting overshoot: faint construction lines run on past a corner, the way a
// hand-drawn elevation's lines cross instead of meeting. Each entry is a segment.
function overshoot(S, segs, e, a, scale = 1) {
  const { ctx } = S;
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of segs) {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = ((x1 - x0) / len) * e;
    const uy = ((y1 - y0) / len) * e;
    ctx.moveTo(x0 - ux, y0 - uy);
    ctx.lineTo(x1 + ux, y1 + uy);
  }
  stroke(ctx, rgba(CYAN, a), S.hair / scale);
}

// Outlined tubes: every outline pass, then every paper pass, so joints merge into one
// drawing with a single contour. Paths are in frame coordinates. Each limb tapers to
// `taper` of its width at the tip, laid as short round-capped pieces.
function tubes(S, paths, w, lw, a, taper = 1) {
  const { ctx } = S;
  const pieces = [];
  for (const p of paths) {
    const pts = p.pts;
    let total = 0;
    for (let k = 2; k < pts.length; k += 2) total += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
    let run = 0;
    for (let k = 2; k < pts.length; k += 2) {
      const x0 = pts[k - 2];
      const y0 = pts[k - 1];
      const len = Math.hypot(pts[k] - x0, pts[k + 1] - y0);
      const n = taper === 1 ? 1 : Math.max(1, Math.ceil(len / 3));
      for (let j = 0; j < n; j++) {
        const u0 = j / n;
        const u1 = (j + 1) / n;
        const along = (run + len * (u0 + u1) * 0.5) / (total || 1);
        pieces.push({
          x0: x0 + (pts[k] - x0) * u0, y0: y0 + (pts[k + 1] - y0) * u0,
          x1: x0 + (pts[k] - x0) * u1, y1: y0 + (pts[k + 1] - y0) * u1,
          w: w * (p.w ?? 1) * (1 - (1 - taper) * along),
        });
      }
      run += len;
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pat = paperPattern(S);
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? pat : solid(LINE, a);
    for (const q of pieces) {
      ctx.lineWidth = q.w + (pass ? 0 : lw * 2);
      ctx.beginPath();
      ctx.moveTo(q.x0, q.y0);
      ctx.lineTo(q.x1, q.y1);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

// ------------------------------------------------------------------ sky
function sheetFurniture(S) {
  const { ctx } = S;
  const a = 0.62;
  // Crop marks at the two top corners.
  ctx.beginPath();
  ctx.moveTo(3, 9); ctx.lineTo(3, 3); ctx.lineTo(9, 3);
  ctx.moveTo(471, 3); ctx.lineTo(477, 3); ctx.lineTo(477, 9);
  stroke(ctx, rgba(LINE, a * 0.7), 0.5);

  // North arrow: a ring, a kite half hatched, N above.
  const nx = 19;
  const ny = 24;
  paper(S, (c) => c.arc(nx, ny, 7, 0, TAU));
  ctx.beginPath();
  ctx.arc(nx, ny, 7, 0, TAU);
  stroke(ctx, rgba(LINE, a * 0.8), 0.5);
  ctx.beginPath();
  ctx.arc(nx, ny, 5.6, 0, TAU);
  stroke(ctx, rgba(CYAN, a * 0.5), S.hair);
  const kite = [[nx, ny - 10], [nx + 3, ny + 5], [nx, ny + 2.5], [nx - 3, ny + 5]];
  ctx.save();
  ctx.beginPath();
  poly(ctx, [[nx, ny - 10], [nx, ny + 2.5], [nx - 3, ny + 5]], true);
  ctx.clip();
  ctx.beginPath();
  hatch(ctx, nx - 4, ny - 11, nx + 1, ny + 6, 1.1, 1);
  stroke(ctx, rgba(LINE, a * 0.9), S.hair);
  ctx.restore();
  ctx.beginPath();
  poly(ctx, kite, true);
  stroke(ctx, rgba(LINE, a), 0.6);
  label(S, 'N', nx, ny - 14, 6, a, 0, { weight: 700 });

  // Scale bar: alternate bays hatched.
  const x0 = 34;
  const y0 = 26;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    if (k % 2 === 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + k * 10, y0, 10, 2.4);
    ctx.clip();
    ctx.beginPath();
    hatch(ctx, x0 + k * 10, y0, x0 + k * 10 + 10, y0 + 2.4, 1, 1);
    stroke(ctx, rgba(LINE, a * 0.9), S.hair);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.rect(x0, y0, 40, 2.4);
  for (let k = 1; k < 4; k++) { ctx.moveTo(x0 + k * 10, y0); ctx.lineTo(x0 + k * 10, y0 + 2.4); }
  stroke(ctx, rgba(LINE, a), 0.5);
  for (const [k, t] of [[0, '0'], [1, '5'], [2, '10'], [4, '20 m']]) label(S, t, x0 + k * 10 + (k === 4 ? 4 : 0), y0 - 3, 3.8, a * 0.85);
  label(S, 'SCALE 1:250', x0, y0 + 7, 3.8, a * 0.75, 0, { align: 'left' });

  // Title block, top right.
  const bx = 402;
  const by = 5;
  const bw = 72;
  const bh = 19;
  paper(S, (c) => c.rect(bx, by, bw, bh));
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.moveTo(bx, by + 11); ctx.lineTo(bx + bw, by + 11);
  ctx.moveTo(bx + 50, by + 11); ctx.lineTo(bx + 50, by + bh);
  stroke(ctx, rgba(LINE, a * 0.8), 0.5);
  ctx.beginPath();
  ctx.rect(bx - 1.2, by - 1.2, bw + 2.4, bh + 2.4);
  stroke(ctx, rgba(CYAN, a * 0.45), S.hair);
  label(S, 'CRYPT SHIFT', bx + bw / 2, by + 5.6, 6, a * 1.1, 0, { weight: 700, mask: false });
  label(S, 'W. ELEVATION', bx + 25, by + 15.2, 3.8, a * 0.85, 0, { mask: false });
  label(S, 'A-07', bx + 61, by + 15.2, 4.2, a * 0.95, 0, { mask: false, weight: 700 });
}

function stars(S, f) {
  const { ctx } = S;
  // Batched by strength: a handful of strokes, not one per star.
  const crosses = new Map();
  const rings = new Map();
  const add = (m, a, fn) => {
    const q = Math.round(a * 20) / 20;
    if (!m.has(q)) m.set(q, []);
    m.get(q).push(fn);
  };
  for (const s of f.stars) {
    const a = 0.25 + 0.6 * s.twinkle * (0.5 + s.s * 0.35);
    const arm = 0.7 + s.s * 0.9;
    add(crosses, a, (c) => {
      c.moveTo(s.x - arm, s.y); c.lineTo(s.x + arm, s.y);
      c.moveTo(s.x, s.y - arm); c.lineTo(s.x, s.y + arm);
    });
    // The bright ones read as survey stations: a ring round the cross.
    if (s.s > 1.25) add(rings, a * 0.8, (c) => { c.moveTo(s.x + arm * 0.8, s.y); c.arc(s.x, s.y, arm * 0.8, 0, TAU); });
  }
  for (const [m, col, w] of [[crosses, LINE, 0.45], [rings, CYAN, S.hair]]) {
    for (const [a, fns] of m) {
      ctx.beginPath();
      for (const fn of fns) fn(ctx);
      stroke(ctx, rgba(col, a), w);
    }
  }
}

function moon(S, m) {
  const { ctx } = S;
  const { x, y, r } = m;
  sheet(S, (c) => c.arc(x, y, r, 0, TAU), (c) => {
    const g = c.createRadialGradient(x - 7, y - 7, 2, x, y, r);
    g.addColorStop(0, rgba(LINE, 0.16));
    g.addColorStop(1, rgba(LINE, 0.06));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    // The shaded limb: light hatch outside a displaced circle.
    c.beginPath();
    c.rect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4);
    c.arc(x + 7, y - 6, r + 1, 0, TAU, true);
    c.clip();
    c.beginPath();
    hatch(c, x - r, y - r, x + r, y + r, 2, 1);
    stroke(c, rgba(LINE, 0.22), S.hair);
  }, [x - r - 1, y - r - 1, x + r + 1, y + r + 1]);
  // Craters: hidden-line circles.
  ctx.beginPath();
  for (const [dx, dy, cr] of [[-8, -5, 5], [6, 7, 4], [9, -9, 2.5], [-3, 10, 2]]) {
    ctx.moveTo(x + dx + cr, y + dy);
    ctx.arc(x + dx, y + dy, cr, 0, TAU);
  }
  stroke(ctx, rgba(LINE, 0.42), 0.45, [1.2, 0.9]);
  // Construction: the compass circle, a larger dashed one, centre lines through.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  stroke(ctx, rgba(LINE, 0.95), 1.0);
  ctx.beginPath();
  ctx.arc(x, y, r + 5, 0, TAU);
  stroke(ctx, rgba(CYAN, 0.32), S.hair, [2, 2]);
  centreLine(S, x - r - 12, y, x + r + 12, y, 0.5);
  centreLine(S, x, y - r - 12, x, y + r + 12, 0.5);
  // Compass swing marks where the construction crossed above the disc.
  ctx.beginPath();
  ctx.arc(x - 12, y, r + 8, -Math.PI / 2 + 0.05, -Math.PI / 2 + 0.55);
  ctx.moveTo(x + 12 + (r + 8) * Math.cos(-Math.PI / 2 - 0.55), y + (r + 8) * Math.sin(-Math.PI / 2 - 0.55));
  ctx.arc(x + 12, y, r + 8, -Math.PI / 2 - 0.55, -Math.PI / 2 - 0.05);
  stroke(ctx, rgba(CYAN, 0.4), S.hair);
  // Centre mark and the radius, arrowed to the rim.
  const ang = -0.72;
  const ex = x + Math.cos(ang) * r;
  const ey = y + Math.sin(ang) * r;
  ctx.beginPath();
  ctx.arc(x, y, 1.1, 0, TAU);
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  stroke(ctx, rgba(LINE, 0.85), 0.5);
  ctx.beginPath();
  arrow(ctx, ex, ey, ang, 3);
  ctx.fillStyle = rgba(LINE, 0.9);
  ctx.fill();
  const lx = x + Math.cos(ang) * r * 0.52 + Math.sin(ang) * 3.2;
  const ly = y + Math.sin(ang) * r * 0.52 - Math.cos(ang) * 3.2;
  label(S, 'R 24.00', lx, ly, 4.4, 0.9, ang, { mask: false });
}

// Clouds are revision clouds: a scalloped outline round a lumpy stadium.
function cloudPath(c) {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const hw = c.w / 2;
  const hh = c.h / 2;
  const dense = [];
  const N = 120;
  for (let k = 0; k < N; k++) {
    const th = (k / N) * TAU;
    const sx = Math.cos(th);
    const sy = Math.sin(th);
    const lump = sy < 0 ? 1.15 + 0.3 * Math.sin(th * 3 + c.i * 1.7) : 0.62;
    dense.push([
      cx + hw * Math.sign(sx) * Math.pow(Math.abs(sx), 0.55),
      cy + hh * lump * Math.sign(sy) * Math.pow(Math.abs(sy), 0.75),
    ]);
  }
  const cum = [0];
  for (let k = 1; k <= N; k++) {
    const p = dense[k - 1];
    const q = dense[k % N];
    cum.push(cum[k - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const total = cum[N];
  const n = Math.max(8, Math.round(total / 7.5));
  const pts = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * total;
    while (cum[j + 1] < s) j++;
    const p = dense[j];
    const q = dense[(j + 1) % N];
    const u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    pts.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
  }
  return (ctx) => {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 0; k < n; k++) {
      const p = pts[k];
      const q = pts[(k + 1) % n];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      const b = 0.5 * len;
      ctx.quadraticCurveTo((p[0] + q[0]) / 2 + (dy / len) * b, (p[1] + q[1]) / 2 - (dx / len) * b, q[0], q[1]);
    }
    ctx.closePath();
  };
}

function cloud(S, c) {
  const { ctx } = S;
  const path = cloudPath(c);
  paper(S, path, 0.025);
  ctx.beginPath();
  path(ctx);
  stroke(ctx, rgba(LINE, 0.42), 0.55);
  // A dotted inner contour along the belly.
  ctx.beginPath();
  ctx.moveTo(c.x + c.w * 0.16, c.y + c.h * 0.62);
  ctx.lineTo(c.x + c.w * 0.84, c.y + c.h * 0.62);
  stroke(ctx, rgba(CYAN, 0.35), S.hair, [0.6, 1.8]);
  if (c.i === 0) {
    // The revision delta that goes with a revision cloud.
    const tx = c.x + c.w + 8;
    const ty = c.y + 2;
    paper(S, (g) => poly(g, [[tx, ty - 4], [tx + 4.2, ty + 3], [tx - 4.2, ty + 3]], true));
    ctx.beginPath();
    poly(ctx, [[tx, ty - 4], [tx + 4.2, ty + 3], [tx - 4.2, ty + 3]], true);
    stroke(ctx, rgba(LINE, 0.5), 0.5);
    label(S, '1', tx, ty + 0.9, 3.8, 0.55, 0, { mask: false, weight: 700 });
  }
}

function bat(S, b) {
  const { ctx } = S;
  const up = Math.cos(b.flap * TAU);
  const ty = -6 * up;
  const shape = (c) => {
    for (const sd of [-1, 1]) {
      c.moveTo(sd * 1.3, -0.8);
      c.lineTo(sd * 4.8, -1.6 - 2.6 * up);
      c.lineTo(sd * 10, ty);
      c.quadraticCurveTo(sd * 8.6, ty * 0.35 + 0.4, sd * 7, ty * 0.3 + 1.6);
      c.quadraticCurveTo(sd * 5.6, ty * 0.1 + 0.8, sd * 4, ty * 0.12 + 2.2);
      c.quadraticCurveTo(sd * 2.8, 1.2, sd * 1.3, 2.2);
      c.closePath();
    }
    c.moveTo(1.5, 0.3);
    c.ellipse(0, 0.3, 1.5, 2.3, 0, 0, TAU);
    c.moveTo(-1.2, -1.4);
    c.lineTo(-1.0, -3.2);
    c.lineTo(-0.3, -1.9);
    c.lineTo(0.3, -1.9);
    c.lineTo(1.0, -3.2);
    c.lineTo(1.2, -1.4);
  };
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.s, b.s);
  paper(S, shape);
  ctx.beginPath();
  shape(ctx);
  stroke(ctx, rgba(LINE, 0.78), 0.5 / b.s);
  // Wing bones: one hairline from shoulder to tip.
  ctx.beginPath();
  for (const sd of [-1, 1]) {
    ctx.moveTo(sd * 1.3, -0.4);
    ctx.lineTo(sd * 4.8, -1.4 - 2.6 * up);
    ctx.lineTo(sd * 7, ty * 0.3 + 1.4);
  }
  stroke(ctx, rgba(CYAN, 0.45), S.hair / b.s);
  ctx.restore();
}

function sky(S, f) {
  const { ctx } = S;
  ctx.drawImage(S.paper, SX, SY, SW, SH);
  grid(S, 0, 0.06, 0.12);
  stars(S, f);
  moon(S, f.moon);
  for (const c of f.clouds) cloud(S, c);
  for (const b of f.bats) bat(S, b);
  sheetFurniture(S);
}

// ------------------------------------------------------------------ land
// The layer's own sheet inside a mass: its grid (scrolling with it) and its wash.
function layerSheet(S, L, cfg, washMul = 1) {
  return (c, box) => {
    grid(S, L.shift, cfg.grid, cfg.major, box);
    c.fillStyle = rgba(LINE, cfg.wash * washMul);
    c.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  };
}

function ridge(S, L, cfg) {
  const { ctx } = S;
  const crest = L.crest;
  const last = crest[crest.length - 1];
  paper(S, (c) => {
    c.moveTo(crest[0].x, 360);
    for (const p of crest) c.lineTo(p.x, p.y);
    c.lineTo(last.x, 360);
    c.closePath();
  }, cfg.wash);
  grid(S, L.shift, cfg.grid, cfg.major, [crest[0].x, SY, last.x, 240], L.ridge, (y) => crestRuns(crest, y));
  if (cfg.band) {
    // Ground line in section: a narrow band of earth hatch under the crest, each stroke
    // anchored in the layer so it rides with the hill.
    const sp = 2.6;
    const off = ((L.shift % sp) + sp) % sp;
    ctx.beginPath();
    for (let x = Math.ceil((crest[0].x + cfg.band + off) / sp) * sp - off; x <= last.x; x += sp) {
      const y = L.ridge(x);
      const yb = L.ridge(x - cfg.band) + cfg.band;
      ctx.moveTo(x, y);
      ctx.lineTo(x - (yb - y), yb);
    }
    stroke(ctx, rgba(LINE, cfg.a * 0.3), S.hair);
  }
  ctx.beginPath();
  crest.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  const a = L.name === 'fg' ? cfg.a * 0.55 : cfg.a;
  stroke(ctx, rgba(LINE, a), cfg.w * 1.15);
}

function lancet(ctx, x, y, w, h) {
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + w * 0.6);
  ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h - w * 0.3);
  ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.6);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
}

const NAVE_TOP = [[-54, -24], [-48, -30], [-40, -28], [-34, -36], [-22, -34], [-16, -40], [-8, -37], [2, -40]];
const TRANS_TOP = [[18, -26], [28, -34], [32, -30], [38, -36], [50, -24]];
const ARCHES = [-42, -27, -12];

function abbey(S, it, L, cfg) {
  const { ctx } = S;
  const a = cfg.a;
  const w = cfg.w;
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.scale(it.s, it.s);
  const nave = [[-54, 2], ...NAVE_TOP, [2, 2]];
  const trans = [[18, 2], ...TRANS_TOP, [50, 2]];
  const spire = [[0, -54], [10, -86], [20, -54]];
  const silhouette = (c) => {
    poly(c, nave, true);
    c.rect(2, -54, 16, 56);
    poly(c, spire, true);
    poly(c, trans, true);
  };
  sheet(S, silhouette, layerSheet(S, L, cfg, 1.6), [it.x - 56 * it.s, it.y - 88 * it.s, it.x + 52 * it.s, it.y + 4 * it.s]);

  // Masonry coursing on the walls, stopping short of the cut tops and the openings.
  const body = (top, x1, x0) => [...top.map(([x, y]) => [x, y + 3]), [x1, 2], [x0, 2]];
  ctx.save();
  ctx.beginPath();
  poly(ctx, body(NAVE_TOP, 2, -54), true);
  poly(ctx, body(TRANS_TOP, 50, 18), true);
  for (const x of ARCHES) lancet(ctx, x, -6, 8, 20);
  ctx.moveTo(38.5, -17);
  ctx.arc(34, -17, 4.5, 0, TAU);
  ctx.clip('evenodd');
  ctx.beginPath();
  for (let y = -2; y > -42; y -= 4) { ctx.moveTo(-56, y); ctx.lineTo(52, y); }
  // Perpends, staggered course by course.
  for (let y = -2, r = 0; y > -42; y -= 4, r++) {
    for (let x = -54 + (r % 2) * 4; x < 52; x += 8) { ctx.moveTo(x, y); ctx.lineTo(x, y - 4); }
  }
  stroke(ctx, rgba(LINE, a * 0.2), S.hair);
  ctx.restore();

  // Section hatch where the ruin is cut: a cross-hatched band under each broken top.
  ctx.save();
  ctx.beginPath();
  for (const top of [NAVE_TOP, TRANS_TOP]) {
    poly(ctx, [...top, ...top.slice().reverse().map(([x, y]) => [x, y + 3])], true);
  }
  ctx.clip();
  ctx.beginPath();
  hatch(ctx, -56, -44, 52, -20, 1.5, 1);
  hatch(ctx, -56, -44, 52, -20, 1.5, -1);
  stroke(ctx, rgba(LINE, a * 0.55), S.hair);
  ctx.restore();

  // Tower: string courses, a cornice, a lancet; spire courses and a finial.
  ctx.beginPath();
  for (const y of [-51, -44, -20]) { ctx.moveTo(2, y); ctx.lineTo(18, y); }
  for (const y of [-62, -70, -78]) {
    const hw = ((y + 86) / 32) * 10;
    ctx.moveTo(10 - hw, y);
    ctx.lineTo(10 + hw, y);
  }
  ctx.moveTo(10, -86); ctx.lineTo(10, -91);
  ctx.moveTo(8, -89); ctx.lineTo(12, -89);
  stroke(ctx, rgba(LINE, a * 0.6), w * 0.8);
  // Arches: opening, an inner reveal, a sill.
  ctx.beginPath();
  for (const x of ARCHES) lancet(ctx, x, -6, 8, 20);
  lancet(ctx, 10, -28, 5, 10);
  stroke(ctx, rgba(LINE, a), w);
  ctx.beginPath();
  for (const x of ARCHES) {
    lancet(ctx, x, -6, 6, 19);
    ctx.moveTo(x - 5.5, -6); ctx.lineTo(x + 5.5, -6);
  }
  stroke(ctx, rgba(LINE, a * 0.5), S.hair);
  // Rose window: two rings and eight spokes.
  ctx.beginPath();
  ctx.arc(34, -17, 4.5, 0, TAU);
  ctx.moveTo(35.8, -17);
  ctx.arc(34, -17, 1.8, 0, TAU);
  for (let k = 0; k < 8; k++) {
    const an = (k / 8) * TAU;
    ctx.moveTo(34 + Math.cos(an) * 1.8, -17 + Math.sin(an) * 1.8);
    ctx.lineTo(34 + Math.cos(an) * 4.5, -17 + Math.sin(an) * 4.5);
  }
  stroke(ctx, rgba(LINE, a * 0.9), w * 0.8);
  // The outline, heaviest line on the building.
  ctx.beginPath();
  silhouette(ctx);
  ctx.lineJoin = 'round';
  stroke(ctx, rgba(LINE, a * 1.15), w * 1.5);
  ctx.lineJoin = 'miter';

  overshoot(S, [
    [2, 2, 2, -54], [18, 2, 18, -54], [2, -54, 18, -54],
    [-54, 2, -54, -24], [50, 2, 50, -24], [18, 2, 18, -26],
    [0, -54, 10, -86], [20, -54, 10, -86],
  ], 4, a * 0.6);

  // Construction: springing line across the arcade, a centre line through each arch and
  // up the spire, compass centres ticked.
  const spring = -6 - 20 + 8 * 0.6;
  ctx.beginPath();
  ctx.moveTo(-62, spring);
  ctx.lineTo(4, spring);
  for (const x of ARCHES) {
    for (const sx of [x - 4, x + 4]) { ctx.moveTo(sx - 1, spring - 1); ctx.lineTo(sx + 1, spring + 1); ctx.moveTo(sx + 1, spring - 1); ctx.lineTo(sx - 1, spring + 1); }
  }
  stroke(ctx, rgba(CYAN, a * 0.7), S.hair);
  for (const x of ARCHES) centreLine(S, x, -1, x, -50, a * 0.75);
  centreLine(S, 10, -24, 10, -96, a * 0.75);

  // Dimensions: overall height to the spire, and the arcade bays.
  ctx.beginPath();
  ctx.moveTo(6, -86); ctx.lineTo(-68, -86);
  ctx.moveTo(-56, 0); ctx.lineTo(-68, 0);
  stroke(ctx, rgba(CYAN, a * 0.7), S.hair);
  dimV(S, -65, 0, -86, '12.40', a * 1.1, S.hair * 1.4);
  dimH(S, ARCHES, -47, '2 @ 1.50', a * 1.1, S.hair * 1.4, 4.2);
  callout(S, 64, -50, 1, 36.5, -20, a * 1.1);
  ctx.restore();
}

// A dead tree's limbs (frame coordinates), as the ink reference lays them out.
function treeLimbs(x, y, s, L) {
  return [
    { pts: [x, y + 1, x + L * 4 * s, y - 26 * s, x + L * 8 * s, y - 50 * s], w: 1.3 },
    { pts: [x + L * 3 * s, y - 20 * s, x - 12 * s, y - 32 * s, x - 17 * s, y - 42 * s], w: 0.8 },
    { pts: [x - 12 * s, y - 32 * s, x - 21 * s, y - 34 * s], w: 0.55 },
    { pts: [x + L * 5 * s, y - 30 * s, x + 13 * s, y - 40 * s, x + 20 * s, y - 42 * s], w: 0.8 },
    { pts: [x + 13 * s, y - 40 * s, x + 15 * s, y - 49 * s], w: 0.55 },
    { pts: [x + L * 7 * s, y - 42 * s, x - 3 * s, y - 52 * s], w: 0.55 },
  ];
}

function grove(S, it, cfg) {
  const { ctx } = S;
  const n = 3 + (it.i % 3);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let top = it.y;
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (seeded(it.i * 7 + k) - 0.5) * 6;
    const sc = (0.42 + seeded(it.i * 11 + k) * 0.24) * it.s;
    top = Math.min(top, it.y + 2 - 52 * sc);
    for (const p of treeLimbs(it.x + dx, it.y + 2, sc, (seeded(k + it.i) - 0.5) * 0.6)) {
      ctx.beginPath();
      ctx.moveTo(p.pts[0], p.pts[1]);
      for (let j = 2; j < p.pts.length; j += 2) ctx.lineTo(p.pts[j], p.pts[j + 1]);
      stroke(ctx, rgba(LINE, cfg.a), 0.35 + p.w * 0.5);
    }
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  // The grove's crown envelope, dash-dot, the way an elevation marks planting.
  const h = it.y - top;
  ctx.beginPath();
  ctx.ellipse(it.x, it.y - h * 0.62, (n * 6 + 12) * it.s, h * 0.5, 0, 0, TAU);
  stroke(ctx, rgba(CYAN, cfg.a * 0.55), S.hair, CENTRE);
}

function deadTree(S, it, cfg) {
  const { ctx } = S;
  const s = it.s;
  const lean = it.variant === 1 ? -0.8 : 0.2;
  const limbs = treeLimbs(it.x, it.y, s, lean);
  // Crown envelope behind the limbs.
  ctx.beginPath();
  ctx.ellipse(it.x + lean * 4 * s, it.y - 36 * s, 25 * s, 19 * s, 0, 0, TAU);
  stroke(ctx, rgba(CYAN, cfg.a * 0.45), S.hair, CENTRE);
  tubes(S, limbs, 2.5 * s, 0.42, cfg.a, 0.5);
  const tr = limbs[0].pts;
  centreLine(S, tr[0], tr[1] + 4, tr[2], tr[3], cfg.a * 0.6);
  if (it.variant === 0 && it.s === 1) callout(S, it.x + 30 * s, it.y - 58 * s, 3, it.x + 19 * s, it.y - 42 * s, cfg.a);
}

function mausoleum(S, it, L, cfg) {
  const { ctx } = S;
  const a = cfg.a;
  const s = it.s;
  const w = cfg.w / s;
  const hair = S.hair / s;
  const dome = it.variant === 1;
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.scale(s, s);
  const silhouette = (c) => {
    c.rect(-24, -4, 48, 6);
    c.rect(-20, -8, 40, 4);
    c.rect(-18, -32, 36, 24);
    if (dome) {
      c.rect(-20, -36, 40, 4);
      c.moveTo(-14, -36);
      c.arc(0, -36, 14, Math.PI, 0);
      c.closePath();
    } else {
      poly(c, [[-22, -32], [0, -44], [22, -32]], true);
    }
  };
  sheet(S, silhouette, layerSheet(S, L, cfg, 1.6), [it.x - 25 * s, it.y - 51 * s, it.x + 25 * s, it.y + 3 * s]);

  // Doorway: dark by cross-hatch alone.
  ctx.save();
  ctx.beginPath();
  lancet(ctx, 0, -8, 12, 16);
  ctx.clip();
  ctx.beginPath();
  hatch(ctx, -7, -28, 7, -7, 1.3, 1);
  hatch(ctx, -7, -28, 7, -7, 1.3, -1);
  stroke(ctx, rgba(LINE, a * 0.42), hair);
  ctx.restore();

  // Detail lines.
  ctx.beginPath();
  // Step treads and the body's plinth course.
  ctx.moveTo(-24, -1); ctx.lineTo(24, -1);
  ctx.moveTo(-18, -12); ctx.lineTo(18, -12);
  // Columns: shafts with a flute line, capitals and bases.
  for (const x of [-15, 11]) {
    ctx.rect(x, -29.5, 4, 20);
    ctx.rect(x - 0.8, -31.5, 5.6, 2);
    ctx.rect(x - 0.8, -9.5, 5.6, 1.5);
  }
  if (dome) {
    ctx.moveTo(-20, -34); ctx.lineTo(20, -34);
    // Dome ribs and the cross finial.
    ctx.moveTo(0, -50);
    ctx.ellipse(0, -36, 6, 14, 0, -Math.PI / 2, Math.PI, true);
    ctx.moveTo(0, -50);
    ctx.ellipse(0, -36, 6, 14, 0, -Math.PI / 2, 0);
    ctx.moveTo(0, -50); ctx.lineTo(0, -57);
    ctx.moveTo(-2.6, -54.5); ctx.lineTo(2.6, -54.5);
  } else {
    poly(ctx, [[-17, -34.2], [0, -41.6], [17, -34.2]], true);
    ctx.moveTo(2, -37); ctx.arc(0, -37, 2, 0, TAU);
  }
  stroke(ctx, rgba(LINE, a * 0.7), w * 0.75);
  ctx.beginPath();
  for (const x of [-13, 13]) { ctx.moveTo(x, -29.5); ctx.lineTo(x, -9.5); }
  stroke(ctx, rgba(LINE, a * 0.45), hair);
  ctx.beginPath();
  lancet(ctx, 0, -8, 12, 16);
  lancet(ctx, 0, -8, 9.6, 14.6);
  stroke(ctx, rgba(LINE, a * 0.85), w * 0.8);
  // Outline.
  ctx.beginPath();
  silhouette(ctx);
  stroke(ctx, rgba(LINE, a * 1.1), w * 1.35);
  overshoot(S, [
    [-24, -4, 24, -4], [-20, -8, 20, -8], [-18, -8, -18, -32], [18, -8, 18, -32],
    dome ? [-20, -36, 20, -36] : [-22, -32, 22, -32],
  ], 3.5, a * 0.55, s);
  centreLine(S, 0, 4, 0, dome ? -60 : -50, a * 0.6);

  // Dimensions: width across the cornice above, height at the right.
  const topY = dome ? -50 : -44;
  const dy = dome ? -63 : -53;
  const half = dome ? 20 : 22;
  ctx.beginPath();
  for (const sx of [-half, half]) { ctx.moveTo(sx, dome ? -38 : -34); ctx.lineTo(sx, dy - 2.5); }
  ctx.moveTo(dome ? 4 : 2, topY); ctx.lineTo(33, topY);
  ctx.moveTo(25, 2); ctx.lineTo(33, 2);
  stroke(ctx, rgba(CYAN, a * 0.6), hair);
  dimH(S, [-half, half], dy, dome ? '4.00' : '4.40', a, hair * 1.3, 4.6);
  dimV(S, 30.5, 2, topY, dome ? '5.00' : '4.40', a, hair * 1.3, 4.6);
  if (!dome) callout(S, -30, -42, 2, -3, -18, a);
  ctx.restore();
}

function stone(S, it, cfg) {
  const { ctx } = S;
  const s = it.s;
  const a = cfg.a * 0.92;
  ctx.save();
  ctx.translate(it.x, it.y + 1);
  ctx.rotate((seeded(it.i * 3.3) - 0.5) * 0.26);
  ctx.scale(s, s);
  const shape = (c) => {
    if (it.variant === 2) {
      c.rect(-4, -3, 8, 3);
      poly(c, [[-2.6, -3], [-1.8, -18], [0, -21], [1.8, -18], [2.6, -3]], true);
    } else if (it.variant === 1) {
      poly(c, [[-5, 0], [-5, -12], [-1.5, -12], [0, -14], [1.5, -12], [5, -12], [5, 0]], true);
    } else {
      c.moveTo(-4.5, 0);
      c.lineTo(-4.5, -9);
      c.arc(0, -9, 4.5, Math.PI, 0);
      c.lineTo(4.5, 0);
      c.closePath();
    }
  };
  paper(S, shape);
  ctx.beginPath();
  if (it.variant === 2) {
    ctx.moveTo(-1.85, -17.5); ctx.lineTo(1.85, -17.5);
  } else if (it.variant === 1) {
    ctx.moveTo(0, -10); ctx.lineTo(0, -4);
    ctx.moveTo(-2, -8.2); ctx.lineTo(2, -8.2);
  } else {
    ctx.moveTo(-3.2, -1.2);
    ctx.lineTo(-3.2, -9);
    ctx.arc(0, -9, 3.2, Math.PI, 0);
    ctx.lineTo(3.2, -1.2);
    ctx.moveTo(-2, -7); ctx.lineTo(2, -7);
    ctx.moveTo(-1.6, -5); ctx.lineTo(1.6, -5);
  }
  stroke(ctx, rgba(LINE, a * 0.5), S.hair / s);
  ctx.beginPath();
  shape(ctx);
  stroke(ctx, rgba(LINE, a), cfg.w * 0.9 / s);
  if (it.variant === 2) centreLine(S, 0, 2.5, 0, -24, cfg.a * 0.55);
  ctx.restore();
}

function cross(S, it, cfg) {
  const { ctx } = S;
  const s = it.s;
  const a = cfg.a * 0.92;
  ctx.save();
  ctx.translate(it.x, it.y + 1);
  ctx.rotate((seeded(it.i * 5.1) - 0.5) * 0.18);
  ctx.scale(s, s);
  const celtic = it.i % 2 === 0;
  const shape = (c) => poly(c, [
    [-1.6, 0], [-1.6, -11], [-6, -11], [-6, -14.5], [-1.6, -14.5], [-1.6, -20],
    [1.6, -20], [1.6, -14.5], [6, -14.5], [6, -11], [1.6, -11], [1.6, 0],
  ], true);
  if (celtic) {
    const ring = (c) => {
      c.arc(0, -12.75, 5, 0, TAU);
      c.moveTo(3.4, -12.75);
      c.arc(0, -12.75, 3.4, 0, TAU, true);
    };
    paper(S, ring);
    ctx.beginPath();
    ctx.arc(0, -12.75, 5, 0, TAU);
    ctx.moveTo(3.4, -12.75);
    ctx.arc(0, -12.75, 3.4, 0, TAU);
    stroke(ctx, rgba(LINE, a * 0.85), cfg.w * 0.75 / s);
  }
  paper(S, shape);
  ctx.beginPath();
  shape(ctx);
  stroke(ctx, rgba(LINE, a), cfg.w * 0.9 / s);
  ctx.beginPath();
  ctx.moveTo(-8, -12.75); ctx.lineTo(8, -12.75);
  stroke(ctx, rgba(CYAN, cfg.a * 0.4), S.hair / s, [2.4, 0.8, 0.6, 0.8]);
  centreLine(S, 0, 2.5, 0, -23, cfg.a * 0.5);
  ctx.restore();
}

function gnarl(S, it, cfg) {
  const { ctx } = S;
  const s = it.s;
  const x = it.x;
  const y = it.y + 2;
  const flip = it.variant === 1 ? -1 : 1;
  const X = (dx) => x + dx * s * flip;
  const Y = (dy) => y + dy * s;
  const trunk = [X(0), Y(0), X(-4), Y(-30), X(4), Y(-58), X(0), Y(-84)];
  tubes(S, [
    { pts: trunk, w: 1.6 },
    { pts: [X(2), Y(-50), X(24), Y(-66), X(44), Y(-64), X(58), Y(-74)], w: 0.9 },
    { pts: [X(44), Y(-64), X(52), Y(-56), X(62), Y(-58)], w: 0.5 },
    { pts: [X(30), Y(-66), X(36), Y(-82), X(48), Y(-92)], w: 0.55 },
    { pts: [X(0), Y(-80), X(-14), Y(-100), X(-26), Y(-104)], w: 0.8 },
    { pts: [X(-14), Y(-100), X(-12), Y(-114)], w: 0.45 },
    { pts: [X(1), Y(-84), X(14), Y(-104), X(30), Y(-112), X(38), Y(-124)], w: 0.7 },
    { pts: [X(20), Y(-107), X(28), Y(-100), X(36), Y(-102)], w: 0.4 },
    { pts: [X(-2), Y(-36), X(-18), Y(-46), X(-26), Y(-44)], w: 0.6 },
    { pts: [X(-6), Y(0), X(-14), Y(3)], w: 0.9 },
    { pts: [X(5), Y(0), X(14), Y(3)], w: 0.9 },
  ], 7.6 * s, 0.8, cfg.a, 0.45);
  // The twist: slanted contour lines across the trunk, a centre line up its axis.
  const tw = 7 * s * 1.6 * 0.5;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const x0 = trunk[k * 2];
    const y0 = trunk[k * 2 + 1];
    const x1 = trunk[k * 2 + 2];
    const y1 = trunk[k * 2 + 3];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    for (let u = 0.18; u < 0.95; u += 0.2) {
      const cx = x0 + (x1 - x0) * u;
      const cy = y0 + (y1 - y0) * u;
      const sk = 2.4 * s;
      ctx.moveTo(cx - nx * tw * 0.8, cy - ny * tw * 0.8 + sk);
      ctx.quadraticCurveTo(cx, cy + sk * 0.2, cx + nx * tw * 0.8, cy + ny * tw * 0.8 - sk);
    }
  }
  stroke(ctx, rgba(LINE, cfg.a * 0.32), S.hair);
  ctx.beginPath();
  ctx.moveTo(trunk[0], trunk[1] + 6);
  for (let k = 2; k < trunk.length; k += 2) ctx.lineTo(trunk[k], trunk[k + 1]);
  ctx.lineTo(trunk[6], trunk[7] - 8 * s);
  stroke(ctx, rgba(CYAN, cfg.a * 0.5), S.hair * 1.1, CENTRE);
}

function fence(S, it, L, cfg) {
  const { ctx } = S;
  const a = cfg.a * 0.6;
  const gateHalf = 15;
  const bars = [];
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    bars.push(x);
  }
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    ctx.moveTo(x, b + 1);
    ctx.lineTo(x, b - 20);
    ctx.moveTo(x - 1.7, b - 20);
    ctx.lineTo(x, b - 24.5);
    ctx.lineTo(x + 1.7, b - 20);
    ctx.closePath();
  }
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  for (const [x0, x1] of runs) {
    for (const h of [5, 16, 17.6]) {
      for (let x = x0; x <= x1; x += 4) {
        const yy = L.ridge(x) - h;
        x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
    }
  }
  stroke(ctx, rgba(LINE, a), 0.55);

  // Bay spacing, dimensioned between the rails two-thirds along the run.
  if (bars.length > 5) {
    const k = Math.floor(bars.length * 0.68);
    const b = L.ridge(bars[k + 1]);
    dimH(S, [bars[k], bars[k + 1], bars[k + 2]], b - 8.5, '0.70', a * 1.15, S.hair * 1.2, 3.8);
  }

  if (it.gate != null) {
    const g = it.gate;
    const b = L.foot(g, gateHalf);
    const posts = (c) => {
      for (const px of [g - gateHalf, g + gateHalf]) {
        c.rect(px - 1.6, b - 32, 3.2, 33);
        c.moveTo(px + 2.4, b - 34.5);
        c.arc(px, b - 34.5, 2.4, 0, TAU);
      }
    };
    paper(S, posts);
    ctx.beginPath();
    posts(ctx);
    stroke(ctx, rgba(LINE, cfg.a * 0.8), 0.7);
    ctx.beginPath();
    for (const off of [0, 1.6]) {
      ctx.moveTo(g - gateHalf + 1.6, b - 26 + off);
      ctx.quadraticCurveTo(g, b - 40 + off, g + gateHalf - 1.6, b - 26 + off);
    }
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      ctx.moveTo(x, b);
      ctx.lineTo(x, b - 26 - 6 * Math.cos(((x - g) / gateHalf) * 1.4));
    }
    ctx.moveTo(g - gateHalf + 1.6, b - 12); ctx.lineTo(g + gateHalf - 1.6, b - 12);
    ctx.moveTo(g - gateHalf + 1.6, b - 10.6); ctx.lineTo(g + gateHalf - 1.6, b - 10.6);
    // The gate's scroll: a small circle between the rails.
    ctx.moveTo(g + 3, b - 18);
    ctx.arc(g, b - 18, 3, 0, TAU);
    stroke(ctx, rgba(LINE, a * 1.1), 0.55);
    centreLine(S, g, b + 2, g, b - 44, cfg.a * 0.45);
    ctx.beginPath();
    for (const px of [g - gateHalf, g + gateHalf]) { ctx.moveTo(px, b - 38); ctx.lineTo(px, b - 49); }
    stroke(ctx, rgba(CYAN, cfg.a * 0.5), S.hair);
    dimH(S, [g - gateHalf, g + gateHalf], b - 46, '3.00', a * 1.15, S.hair * 1.2, 4.2);
  }
}

function lamp(S, it, L, cfg) {
  const { ctx } = S;
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const t = S.t;
  const flicker = 0.9 + 0.1 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const ly = y - 40.5 * s;
  // The one warm thing on the sheet: a soft glow and a lighting-plan's isolux rings.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(x, ly, 1, x, ly, 30 * s);
  glow.addColorStop(0, `rgba(255,190,100,${(0.34 * flicker).toFixed(3)})`);
  glow.addColorStop(0.45, `rgba(255,170,90,${(0.1 * flicker).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 32 * s, ly - 32 * s, 64 * s, 64 * s);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, ly, 12 * s, 0, TAU);
  ctx.moveTo(x + 21 * s, ly);
  ctx.arc(x, ly, 21 * s, 0, TAU);
  stroke(ctx, rgba(AMBER, 0.34 * flicker), S.hair * 1.2, [1.4, 1.6]);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const post = (c) => {
    c.rect(-1.4, -34, 2.8, 34);
    c.rect(-3.5, -3, 7, 3);
    c.rect(-2.3, -36.2, 4.6, 2.2);
    poly(c, [[-6, -45], [0, -50], [6, -45]], true);
    poly(c, [[-5, -36], [5, -36], [4, -45], [-4, -45]], true);
  };
  paper(S, post, cfg.wash);
  ctx.beginPath();
  ctx.rect(-1.4, -34, 2.8, 34);
  ctx.rect(-3.5, -3, 7, 3);
  ctx.rect(-2.3, -36.2, 4.6, 2.2);
  poly(ctx, [[-6, -45], [0, -50], [6, -45]], true);
  ctx.moveTo(0, -50); ctx.lineTo(0, -52);
  ctx.moveTo(1, -53); ctx.arc(0, -53, 1, 0, TAU);
  // The ladder bar.
  ctx.moveTo(-5.5, -30); ctx.lineTo(5.5, -30);
  ctx.moveTo(-5.5, -30.5); ctx.arc(-6, -30, 0.7, 0, TAU);
  ctx.moveTo(6.7, -30); ctx.arc(6, -30, 0.7, 0, TAU);
  stroke(ctx, rgba(LINE, cfg.a * 0.85), 0.7 / s);
  // The lantern in warm line: glass, glazing bar, the flame.
  ctx.beginPath();
  poly(ctx, [[-5, -36], [5, -36], [4, -45], [-4, -45]], true);
  ctx.moveTo(0, -36); ctx.lineTo(0, -45);
  stroke(ctx, rgba(AMBER, 0.95), 0.7 / s);
  ctx.beginPath();
  ctx.moveTo(-1.3, -38.4);
  ctx.quadraticCurveTo(-1.5, -41, 0, -43 + flicker * 0.4);
  ctx.quadraticCurveTo(1.5, -41, 1.3, -38.4);
  ctx.closePath();
  ctx.fillStyle = rgba(AMBER, 0.55 + 0.3 * flicker);
  ctx.fill();
  ctx.restore();
}

function grass(S, it, cfg) {
  const { ctx } = S;
  const s = it.s;
  const base = it.y + 2;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 1.9 * s;
    const h = (7 + seeded(it.i * 13 + k) * 6) * s;
    const bend = ((k - 3) * 1.3 + (seeded(it.i + k * 5) - 0.5) * 1.5) * s;
    ctx.moveTo(it.x + dx * 0.5, base);
    ctx.quadraticCurveTo(it.x + dx * 0.8, base - h * 0.55, it.x + dx + bend, base - h);
  }
  stroke(ctx, rgba(LINE, cfg.a * 0.52), 0.5);
  if (it.i % 2 === 0) {
    // A thistle head on the tallest stem.
    const hx = it.x + 0.4 * s;
    const hy = base - 14.5 * s;
    ctx.beginPath();
    ctx.moveTo(it.x, base);
    ctx.quadraticCurveTo(it.x + 0.2 * s, base - 8 * s, hx, hy + 1.6 * s);
    ctx.moveTo(hx + 1.5 * s, hy);
    ctx.arc(hx, hy, 1.5 * s, 0, TAU);
    for (let k = 0; k < 5; k++) {
      const an = -Math.PI / 2 + (k - 2) * 0.42;
      ctx.moveTo(hx + Math.cos(an) * 1.5 * s, hy + Math.sin(an) * 1.5 * s);
      ctx.lineTo(hx + Math.cos(an) * 3.6 * s, hy + Math.sin(an) * 3.6 * s);
    }
    stroke(ctx, rgba(LINE, cfg.a * 0.55), 0.5);
  }
}

// ------------------------------------------------------------------ fog
// Fog as contour lines: the band's upper envelope dashed, an inner contour dotted, each
// dash anchored in the band's own space so it rides with the fog.
function fogBand(S, band, b) {
  const { ctx } = S;
  if (!band.puffs.length) return;
  const p0 = band.puffs[0];
  const shift = CRYPT_PLAN.fog.puffs[p0.i] + b * 47 - p0.x;
  const env = (x, k) => {
    let yy = Infinity;
    for (const p of band.puffs) {
      const d = (x - p.x) / (p.rx * k);
      if (d > -1 && d < 1) yy = Math.min(yy, p.y - p.ry * k * Math.sqrt(1 - d * d));
    }
    return yy;
  };
  const a = b === 0 ? 0.5 : 0.38;
  ctx.beginPath();
  for (const p of band.puffs) {
    ctx.moveTo(p.x + p.rx, p.y);
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU);
  }
  ctx.fillStyle = rgba(LINE, 0.03);
  ctx.fill();
  const marks = (k, period, len) => {
    ctx.beginPath();
    const off = ((shift % period) + period) % period;
    const start = Math.floor((SX + off) / period) * period - off;
    for (let xs = start; xs < 520; xs += period) {
      const ya = env(xs, k);
      const ym = env(xs + len / 2, k);
      const yb = env(xs + len, k);
      if (!Number.isFinite(ya) || !Number.isFinite(yb) || !Number.isFinite(ym)) continue;
      if (Math.abs(yb - ya) > len * 2.5) continue;
      ctx.moveTo(xs, ya);
      ctx.lineTo(xs + len / 2, ym);
      ctx.lineTo(xs + len, yb);
    }
  };
  marks(1, 5, 3);
  stroke(ctx, rgba(LINE, a), 0.5);
  marks(0.62, 2.5, 0.5);
  stroke(ctx, rgba(CYAN, a * 0.9), 0.55);
}

// ------------------------------------------------------------------ layers
function layer(S, f, name) {
  const L = f.layers[name];
  const cfg = LAYER[name];
  for (const it of L.items) if (it.kind === 'abbey') abbey(S, it, L, cfg);
  ridge(S, L, cfg);
  for (const it of L.items) {
    if (it.kind === 'grove') grove(S, it, cfg);
    else if (it.kind === 'mausoleum') mausoleum(S, it, L, cfg);
    else if (it.kind === 'tree') deadTree(S, it, cfg);
    else if (it.kind === 'stone') stone(S, it, cfg);
    else if (it.kind === 'cross') cross(S, it, cfg);
    else if (it.kind === 'gnarl') gnarl(S, it, cfg);
    else if (it.kind === 'fence') fence(S, it, L, cfg);
    else if (it.kind === 'lamp') lamp(S, it, L, cfg);
    else if (it.kind === 'grass') grass(S, it, cfg);
  }
}

export const STYLE = {
  id: 'blueprint',
  name: 'BLUEPRINT',
  note: 'An architect\'s elevation on cyanotype paper: white line work over a mottled Prussian blue with a fine '
    + 'cyan grid, section hatching in the ruined walls, dimension strings, callouts and a compass-drawn moon. '
    + 'Depth by line weight, far ridge faintest; the gas lamp is the only warm line.',
  paint(ctx, f) {
    const base = ctx.getTransform();
    const dev = Math.max(1, Math.hypot(base.a, base.b));
    const R = Math.min(3, Math.max(1, Math.round(dev)));
    const S = {
      ctx,
      base,
      R,
      sheetM: base.translate(SX, SY).scale(1 / R),
      t: f.t,
      paper: paperCanvas(R),
      hair: 1 / dev,
      snap: (v) => (Math.round(v * dev - 0.5) + 0.5) / dev,
    };
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    sky(S, f);
    layer(S, f, 'bg');
    layer(S, f, 'mid');
    fogBand(S, f.fog[0], 0);
    layer(S, f, 'fg');
    fogBand(S, f.fog[1], 1);
  },
};
