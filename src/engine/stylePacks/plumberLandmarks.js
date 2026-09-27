// PLUMBER PANIC's landmarks (Peter, 24 Sep 2026, from the countryside ideas bake-off,
// src/dev/plumber-ideas.js): "The barn and silo for level 1 near the beginning and the
// patchwork fields near the end. For level 2, the hot air balloon (twice). For level 3,
// the windmill (but a bit smaller - firmly planted on top of a hill). Put in sheepdog
// and sheep in all."
//
// The art only. PLACEMENT is the pack's: it chooses x (and y for the balloon), culls,
// and hands in `seat` = { near(x), far(x) }, the crest y of the near and far ridges at
// screen x in the CURRENT ctx coordinates — so every piece holds in portrait too. The
// painters are the bake-off's, pixel for pixel, with the gallery's wrapping and its
// hardcoded landscape lift taken out.
//
// THE FINISH. `paper` true wears the backdrop's paper cutout on every sheet (deep lift,
// contact edge, flat fill, fibre grain, white rim — plumberSceneryFill's recipe); false
// is the same shapes as flat fills.
//
// COST. Everything that holds still is painted once into a cached canvas at the ctx's
// device scale (keyed by that scale and the finish) and blitted; only what moves is
// drawn live. No canvas is created per frame and nothing reads Math.random.
//
// Each export is one sealed save/restore. Nothing here imports stylePacks/index.js:
// that module imports this one.
import { ZOOM } from '../camera.js';
import { W } from '../renderer.js';
import { paperTextureSource, PAPER_PATTERN_SCALE } from '../paper-material.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// The finish for the call in progress. Every export sets it and puts it back.
let PAPER = true;
function withFinish(paper, fn) {
  const prev = PAPER;
  PAPER = paper !== false;
  try { fn(); } finally { PAPER = prev; }
}

// ------------------------------------------------------------ baking
const bakes = new Map();
function deviceScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const s = m ? Math.hypot(m.a, m.b) : 1;
  return Math.max(1, Math.min(6, Math.round(s * 4) / 4));
}
// Paint `draw` (in the piece's local space, box x0,y0,w,h) once per device scale and
// finish, then blit it.
function baked(ctx, key, x0, y0, w, h, draw) {
  const s = deviceScale(ctx);
  const id = `${key}|${PAPER ? 'paper' : 'flat'}@${s}`;
  let c = bakes.get(id);
  if (c === undefined) {
    c = null;
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(w * s); cv.height = Math.ceil(h * s);
      const g = cv.getContext('2d');
      if (g) { g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s); draw(g); c = cv; }
    }
    bakes.set(id, c);
  }
  if (c) ctx.drawImage(c, x0, y0, w, h);
  else draw(ctx);
}

// ------------------------------------------------------------ the paper cutout
// The fibre sheet, built once per context from the shared tile and anchored in the
// painter's LOCAL space, so it travels with a moving cutout.
const grainCache = new WeakMap();
function grain(ctx) {
  if (!PAPER) return null;
  let p = grainCache.get(ctx);
  if (p === undefined) {
    const src = paperTextureSource('cardstockClear');
    p = src && typeof ctx.createPattern === 'function' ? ctx.createPattern(src, 'repeat') : null;
    if (p && typeof p.setTransform === 'function' && typeof DOMMatrix === 'function') {
      p.setTransform(new DOMMatrix().scale(PAPER_PATTERN_SCALE));
    }
    grainCache.set(ctx, p);
  }
  return p;
}
const RIM = 'rgba(255,255,255,0.24)';
function pathOf(fn) { const p = new Path2D(); fn(p); return p; }
// One sheet. `o.lift` scales the drop (0 = glued flat), `o.rim` false or a width, `o.rot`
// / `o.fx` the rotation and mirror already on the ctx (the drop still falls down-right),
// `o.rimUnder` a silhouette-only rim for a shape built of overlapping lobes. With the
// finish off it is the flat fill alone.
function cut(ctx, fn, fill, o = {}) {
  const p = typeof fn === 'function' ? pathOf(fn) : fn;   // not instanceof: the test DOM's Path2D fails it
  if (!PAPER) { ctx.fillStyle = fill; ctx.fill(p); return p; }
  const lift = o.lift ?? 1;
  ctx.save();
  if (lift > 0) {
    const r = -(o.rot || 0), cs = Math.cos(r), sn = Math.sin(r), fx = o.fx || 1;
    const off = (ox, oy) => [(ox * fx * cs - oy * sn) * lift, (ox * fx * sn + oy * cs) * lift];
    const [dx, dy] = off(1, 2);
    const [cx, cy] = off(0.35, 0.75);
    ctx.fillStyle = o.deepColor || 'rgba(15,23,36,0.055)';
    ctx.translate(dx, dy); ctx.fill(p);
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    ctx.translate(cx - dx, cy - dy); ctx.fill(p);
    ctx.translate(-cx, -cy);
  }
  if (o.rimUnder && o.rim !== false) {
    ctx.strokeStyle = o.rimColor || RIM;
    ctx.lineWidth = 2 * (typeof o.rim === 'number' ? o.rim : 1.15);
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = o.grain === false ? null : grain(ctx);
  if (pat) { ctx.globalAlpha *= o.grainAlpha ?? 1; ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
  if (o.rim !== false && !o.rimUnder) {
    ctx.save();
    ctx.strokeStyle = o.rimColor || RIM;
    ctx.lineWidth = typeof o.rim === 'number' ? o.rim : 1.15;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(p);
    ctx.restore();
  }
  return p;
}
// A flat tone laid inside a sheet, clipped to it; the fibre goes back over it.
function tone(ctx, parent, fn, fill, grained = true) {
  const p = typeof fn === 'function' ? pathOf(fn) : fn;   // not instanceof: the test DOM's Path2D fails it
  ctx.save();
  ctx.clip(parent);
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = grained ? grain(ctx) : null;
  if (pat) { ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
}
function line(ctx, color, width, fn) {
  ctx.beginPath(); fn(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function flat(ctx, fill, fn) { ctx.beginPath(); fn(ctx); ctx.fillStyle = fill; ctx.fill(); }
function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.05, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
// Clip to the sky side of a crest `crest(x)` between x0 and x1, `bite` px into the
// hill, so a planted foot is cut by the ground line itself at every x.
function clipAbove(ctx, crest, x0, x1, bite = 1, top = -600) {
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x1, top);
  for (let x = x1; x >= x0 - 0.01; x -= 2) ctx.lineTo(x, crest(x) + bite);
  ctx.closePath();
  ctx.clip();
}

// ====================================================================== the barn
const BARN = {
  wall: '#b5524a', wallShade: '#9a433c', trim: '#efe7d6', roof: '#6c5b55', roofShade: '#564842',
  door: '#9e4640', hay: '#e3c46a', hayShade: '#c7a24a', silo: '#aeb8bd', siloShade: '#8f9ba1',
  siloLight: '#d2d9dc', siloCap: '#98a4aa', vane: '#3a3632', window: '#5d6a68', hen: '#f3eee4',
  henShade: '#d9d1c2', henBrown: '#b87a4a', henBrownShade: '#98603a', comb: '#d8453a', beak: '#e8a33c',
};
function barnBody(ctx) {
  const P = BARN;
  // The silo, behind and to the right: a banded steel drum under a dome, a ladder up it.
  const silo = cut(ctx, (c) => { c.moveTo(21, 18); c.lineTo(21, -42); c.bezierCurveTo(21, -49.5, 33, -49.5, 33, -42); c.lineTo(33, 18); c.closePath(); }, P.silo, { lift: 1 });
  tone(ctx, silo, (c) => { c.moveTo(20, -42); c.bezierCurveTo(20, -50.5, 34, -50.5, 34, -42); c.lineTo(34, -41); c.lineTo(20, -41); c.closePath(); }, P.siloCap);
  tone(ctx, silo, (c) => c.rect(28.6, -52, 6, 72), P.siloShade);
  tone(ctx, silo, (c) => c.rect(22.6, -52, 1.3, 72), P.siloLight);
  line(ctx, 'rgba(84,94,100,0.45)', 0.45, (c) => { for (let y = -36; y < 16; y += 6) { c.moveTo(21.3, y); c.lineTo(32.7, y); } });
  line(ctx, 'rgba(66,74,80,0.75)', 0.4, (c) => {
    c.moveTo(24.4, -41); c.lineTo(24.4, 16); c.moveTo(26.3, -41); c.lineTo(26.3, 16);
    for (let y = -39; y < 16; y += 2.4) { c.moveTo(24.4, y); c.lineTo(26.3, y); }
  });
  cut(ctx, (c) => c.rect(26.1, -50.6, 1.8, 2.2), P.siloShade, { lift: 0.3, rim: 0.4 });
  // The barn: a gambrel gable end, planked red and trimmed white.
  const wall = cut(ctx, (c) => { c.moveTo(-17, 10); c.lineTo(-17, -13); c.lineTo(-13.4, -21.4); c.lineTo(0, -28); c.lineTo(13.4, -21.4); c.lineTo(17, -13); c.lineTo(17, 10); c.closePath(); }, P.wall, { lift: 1.2 });
  tone(ctx, wall, (c) => c.rect(9.5, -30, 10, 42), P.wallShade);
  line(ctx, 'rgba(90,30,26,0.32)', 0.4, (c) => { for (let px = -14.5; px < 17; px += 2.5) { c.moveTo(px, -26); c.lineTo(px, 10); } });
  const roofEdge = cut(ctx, (c) => {
    c.moveTo(-19.4, -12.1); c.lineTo(-15.3, -22.5); c.lineTo(0, -30.6); c.lineTo(15.3, -22.5); c.lineTo(19.4, -12.1);
    c.lineTo(17.1, -12.3); c.lineTo(13.4, -20.7); c.lineTo(0, -27.5); c.lineTo(-13.4, -20.7); c.lineTo(-17.1, -12.3); c.closePath();
  }, P.roof, { lift: 0.8, rim: 0.7 });
  tone(ctx, roofEdge, (c) => c.rect(0, -32, 22, 22), P.roofShade);
  line(ctx, P.trim, 0.8, (c) => { c.moveTo(-16.3, -12.6); c.lineTo(-12.9, -20.8); c.lineTo(0, -27.2); c.lineTo(12.9, -20.8); c.lineTo(16.3, -12.6); });
  line(ctx, P.trim, 0.9, (c) => { c.moveTo(-16.6, -12.6); c.lineTo(-16.6, 10); c.moveTo(16.6, -12.6); c.lineTo(16.6, 10); });
  // Hayloft: the door swung open on the hay, the hoist beam's end over it.
  const loft = cut(ctx, (c) => c.rect(-3.4, -21.6, 6.8, 6.2), P.hay, { lift: 0.3, rim: false });
  tone(ctx, loft, (c) => c.rect(-3.4, -17.6, 6.8, 3), P.hayShade);
  line(ctx, P.trim, 0.7, (c) => c.rect(-3.4, -21.6, 6.8, 6.2));
  cut(ctx, (c) => c.rect(-9.3, -21.6, 5.3, 6.2), P.door, { lift: 0.5, rim: 0.5 });
  line(ctx, P.trim, 0.5, (c) => { c.rect(-9.3, -21.6, 5.3, 6.2); c.moveTo(-9.3, -21.6); c.lineTo(-4, -15.4); });
  cut(ctx, (c) => c.rect(-1, -26.3, 2, 1.9), P.roofShade, { lift: 0.4, rim: 0.4 });
  // The big doors, each leaf braced with a white X.
  for (const dx0 of [-7, 0]) {
    cut(ctx, (c) => c.rect(dx0, -10, 7, 20), P.door, { lift: 0.4, rim: false });
    line(ctx, P.trim, 0.75, (c) => { c.rect(dx0 + 0.4, -9.6, 6.2, 19); c.moveTo(dx0 + 0.4, -9.6); c.lineTo(dx0 + 6.6, 9.4); c.moveTo(dx0 + 6.6, -9.6); c.lineTo(dx0 + 0.4, 9.4); });
  }
  for (const wx of [-12.6, 12.6]) {
    cut(ctx, (c) => c.rect(wx - 1.9, -8.6, 3.8, 3.8), P.window, { lift: 0.2, rim: false });
    line(ctx, P.trim, 0.55, (c) => { c.rect(wx - 1.9, -8.6, 3.8, 3.8); c.moveTo(wx, -8.6); c.lineTo(wx, -4.8); c.moveTo(wx - 1.9, -6.7); c.lineTo(wx + 1.9, -6.7); });
  }
  // Hay heaped by the door.
  const pile = cut(ctx, (c) => { c.moveTo(-21, 10); c.quadraticCurveTo(-20, 0.4, -15, -0.2); c.quadraticCurveTo(-10.4, 0.4, -8.8, 10); c.closePath(); }, P.hay, { lift: 0.6, rim: 0.6 });
  tone(ctx, pile, (c) => c.rect(-14.4, -1.5, 7, 12), P.hayShade);
  line(ctx, 'rgba(150,112,36,0.6)', 0.35, (c) => {
    for (const [a, b, e, d] of [[-18.6, 3, -16.4, 1.4], [-15.8, 2.4, -13.6, 1], [-13.2, 4.2, -11.2, 2.4], [-17.2, 5.8, -15.2, 4.6], [-19.4, 6.6, -18.2, 4.6]]) { c.moveTo(a, b); c.lineTo(e, d); }
  });
}
// The rooster weathervane on the barn's ridge. (x, y) is the foot of its rod.
function weathervane(ctx, t, x, y) {
  const P = BARN;
  const a = 1.1 * Math.sin(t * 0.45) + 0.35 * Math.sin(t * 1.3 + 1) + 0.12 * Math.sin(t * 3.1);
  const cs = Math.cos(a), sn = Math.sin(a);
  line(ctx, P.vane, 0.6, (c) => { c.moveTo(x, y); c.lineTo(x, y - 12.6); });
  // The compass arms foreshorten as the vane turns: east-west with cos, north-south with sin.
  line(ctx, P.vane, 0.45, (c) => { c.moveTo(x - 3.4 * Math.abs(cs), y - 5.2); c.lineTo(x + 3.4 * Math.abs(cs), y - 5.2); c.moveTo(x - 3.4 * Math.abs(sn), y - 5.8); c.lineTo(x + 3.4 * Math.abs(sn), y - 5.8); });
  dot(ctx, x, y - 7.8, 0.85, '#d7b35f');
  const k = Math.abs(cs) < 0.1 ? 0.1 * Math.sign(cs || 1) : cs;
  ctx.save();
  ctx.translate(x, y - 10.2);
  ctx.scale(k, 1);
  const o = { fx: Math.sign(k), lift: 0.35, rim: 0.4 };
  cut(ctx, (c) => {
    c.moveTo(-6.4, -0.3); c.lineTo(4.6, -0.3); c.lineTo(4.6, -1.2); c.lineTo(6.8, 0); c.lineTo(4.6, 1.2); c.lineTo(4.6, 0.3); c.lineTo(-6.4, 0.3); c.closePath();
    c.moveTo(-6.6, -1.6); c.lineTo(-4.6, -0.2); c.lineTo(-6.6, 1.6); c.lineTo(-7.8, 1.6); c.lineTo(-5.9, 0); c.lineTo(-7.8, -1.6); c.closePath();
  }, P.vane, o);
  cut(ctx, (c) => {
    c.moveTo(-1.2, -0.3); c.lineTo(-1.6, -2.2);
    c.bezierCurveTo(-3.8, -3, -4.6, -6.4, -3.2, -7.6);
    c.bezierCurveTo(-2.6, -6, -1.9, -4.8, -1.1, -4.1);
    c.bezierCurveTo(-0.3, -4.2, 0.6, -4.3, 1, -5.2);
    c.bezierCurveTo(0.8, -6.3, 1.4, -7.1, 2.3, -6.9);
    c.lineTo(3.4, -6.3); c.lineTo(2.6, -5.7);
    c.bezierCurveTo(2.9, -4.4, 2.6, -3.1, 1.5, -2.2);
    c.lineTo(1, -0.3); c.closePath();
    c.moveTo(1.1, -7.4); c.arc(1.7, -7.5, 0.6, 0, TAU);
  }, P.vane, o);
  ctx.restore();
}
function hen(ctx, x, y, s, dir, peck, brown) {
  const P = BARN;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir };
  flat(ctx, 'rgba(28,64,30,0.2)', (c) => c.ellipse(0, 0.2, 3, 0.6, 0, 0, TAU));
  line(ctx, P.beak, 0.5, (c) => { c.moveTo(-0.4, -1.9); c.lineTo(-0.6, 0); c.moveTo(0.7, -1.9); c.lineTo(0.9, 0); });
  const tilt = peck * 0.9;
  ctx.translate(0, -2);
  ctx.rotate(tilt);
  const col = brown ? P.henBrown : P.hen, sh = brown ? P.henBrownShade : P.henShade;
  const body = cut(ctx, (c) => { c.moveTo(-3.2, -1.6); c.quadraticCurveTo(-3.6, 1.6, 0, 1.6); c.quadraticCurveTo(3, 1.6, 3, -0.8); c.quadraticCurveTo(2.6, -2.6, 1.6, -3); c.quadraticCurveTo(-0.5, -1.6, -1.8, -2); c.lineTo(-3.4, -4.3); c.closePath(); }, col, { ...o, rot: tilt, lift: 0.4, rim: 0.5 });
  tone(ctx, body, (c) => c.ellipse(-0.4, 1.2, 3, 1.1, 0, 0, TAU), sh);
  cut(ctx, (c) => c.arc(2.3, -3.6, 1.2, 0, TAU), col, { ...o, rot: tilt, lift: 0.3, rim: 0.4 });
  flat(ctx, P.comb, (c) => { c.arc(2, -4.8, 0.45, 0, TAU); c.moveTo(3.05, -4.9); c.arc(2.6, -4.9, 0.45, 0, TAU); c.moveTo(3.4, -4.6); c.arc(3, -4.6, 0.4, 0, TAU); });
  flat(ctx, P.comb, (c) => c.ellipse(3, -2.7, 0.35, 0.55, 0, 0, TAU));
  flat(ctx, P.beak, (c) => { c.moveTo(3.3, -3.9); c.lineTo(4.3, -3.5); c.lineTo(3.3, -3.2); c.closePath(); });
  dot(ctx, 2.6, -3.9, 0.25, '#1a1410');
  ctx.restore();
}

/**
 * THE RED BARN, SILO AND ROOSTER VANE, with three hens pecking on the slope below.
 * Anchor `x` = the barn's centre line, planted on a NEAR-ridge summit: its foot sits on
 * `seat.near(x)` and is cut by the crest line (live, so any x holds). Ink extent around
 * (x, seat.near(x)): x -30..+45, y -65..+14 (the silo is the tall right edge).
 */
export function drawPlumberBarn(ctx, t, x, seat, paper = true) {
  ctx.save();
  withFinish(paper, () => {
    const S = 1.25;
    const g = seat.near(x);
    ctx.save();
    clipAbove(ctx, seat.near, x - 40, x + 50, 1.4);
    ctx.translate(x, g);
    ctx.scale(S, S);
    baked(ctx, 'barn', -24, -54, 60, 74, barnBody);
    ctx.restore();
    ctx.save();
    ctx.translate(x, g);
    ctx.scale(S, S);
    weathervane(ctx, t, 0, -30.4);
    const sw = Math.sin(t * 1.7) * 0.2;
    const rx = Math.sin(sw) * 6.5, ry = -24.4 + Math.cos(sw) * 6.5;
    line(ctx, '#c9b089', 0.35, (c) => { c.moveTo(0, -24.4); c.lineTo(rx, ry); });
    line(ctx, '#7a7470', 0.45, (c) => { c.arc(rx, ry + 0.6, 0.6, -Math.PI / 2, Math.PI * 0.8); });
    ctx.restore();
    // Hens scratching about on the face of the hill in front of the doors.
    for (const [dx, depth, dir, brown, seed] of [[-11, 5, 1, false, 0.1], [4, 8, -1, true, 0.5], [14, 4, -1, false, 0.8]]) {
      const hx = x + dx * S;
      const p = (t * 0.85 + seed) % 1;
      const peck = p < 0.22 ? Math.sin(Math.PI * p / 0.22) : 0;
      hen(ctx, hx, seat.near(hx) + depth, 1.15, dir, peck, brown);
    }
  });
  ctx.restore();
}

// ====================================================================== the windmill
// A cloth strip hung from a pole at (px, py), `len` long and `hgt` deep, rippling as
// a wave that travels from the hoist to the fly. Drawn as slices so each fold takes
// its own light: a slice leaning into the light is the base colour, away is shade.
function banner(ctx, px, py, len, hgt, t, seed, fill, shade, taper = 0, emblem = null) {
  const n = 10;
  const wave = (u) => Math.sin(u * 5.2 - t * 6.3 + seed) * (0.4 + u * 1.9) + Math.sin(u * 9 - t * 9.1 + seed * 2) * 0.35 * u;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const droop = u * u * 1.2;
    const dy = wave(u) + droop;
    const half = hgt * (1 - taper * u) * 0.5;
    const x = px + u * len * (1 - 0.06 * Math.abs(Math.sin(u * 5.2 - t * 6.3 + seed)));
    pts.push([x, py + hgt * 0.5 + dy - half, py + hgt * 0.5 + dy + half]);
  }
  const outline = pathOf((c) => {
    c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) c.lineTo(p[0], p[1]);
    for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], pts[i][2]);
    c.closePath();
  });
  cut(ctx, outline, fill, { rim: 0.8, lift: 0.7 });
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const slope = (b[1] - a[1]) / Math.max(0.01, b[0] - a[0]);
    if (slope > 0.12) {
      tone(ctx, outline, (c) => { c.moveTo(a[0], a[1] - 1); c.lineTo(b[0], b[1] - 1); c.lineTo(b[0], b[2] + 1); c.lineTo(a[0], a[2] + 1); c.closePath(); }, shade);
    }
  }
  if (emblem) {
    const k = 0.42;
    const i = Math.round(n * k);
    const p = pts[i];
    ctx.save(); ctx.clip(outline);
    ctx.fillStyle = emblem;
    ctx.beginPath(); ctx.arc(p[0], (p[1] + p[2]) / 2, hgt * 0.22, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
const MILL = {
  wall: '#ece3cb', wallShade: '#d2c4a3', foot: '#b5a687', footShade: '#9a8b6d', joint: 'rgba(110,92,66,0.4)',
  cap: '#b36e5e', capShade: '#8f5345', timber: '#8e6c4c', timberDark: '#6a4f37', canvas: '#f4edd8',
  canvasShade: '#ddd2b3', window: '#687a72', door: '#8b6a48', doorDark: '#6f5238', hub: '#5c4a3e',
  brass: '#d9b35a', sack: '#e6dcc2', sackShade: '#cdbf9f',
};
function millBody(ctx) {
  const P = MILL;
  const tower = cut(ctx, (c) => { c.moveTo(-9.6, 4); c.lineTo(-6.2, -33.5); c.lineTo(6.2, -33.5); c.lineTo(9.6, 4); c.closePath(); }, P.wall, { lift: 1.2 });
  tone(ctx, tower, (c) => { c.moveTo(2.6, -36); c.lineTo(9, -36); c.lineTo(12, 6); c.lineTo(4.4, 6); c.closePath(); }, P.wallShade);
  // Weatherboarding: faint courses up the tower, following its taper.
  line(ctx, 'rgba(150,130,100,0.2)', 0.4, (c) => {
    for (let y = -29; y < -6; y += 4.6) { const hw = lerp(9.6, 6.2, -y / 33.5) - 0.9; c.moveTo(-hw, y); c.lineTo(hw, y); }
  });
  const foot = cut(ctx, (c) => { c.moveTo(-11, 4); c.lineTo(-10.2, -5.5); c.lineTo(10.2, -5.5); c.lineTo(11, 4); c.closePath(); }, P.foot, { lift: 0.8, rim: 0.8 });
  tone(ctx, foot, (c) => c.rect(4, -7, 8, 12), P.footShade);
  line(ctx, P.joint, 0.45, (c) => {
    c.moveTo(-10.6, -2.2); c.lineTo(10.6, -2.2);
    for (const [jx, y0, y1] of [[-6, -5.5, -2.2], [-0.5, -5.5, -2.2], [5, -5.5, -2.2], [-3.5, -2.2, 2], [2.5, -2.2, 2], [8, -2.2, 2]]) { c.moveTo(jx, y0); c.lineTo(jx, y1); }
  });
  const door = cut(ctx, (c) => { c.moveTo(-2.8, -4.6); c.lineTo(-2.8, -10.5); c.arc(0, -10.5, 2.8, Math.PI, 0); c.lineTo(2.8, -4.6); c.closePath(); }, P.door, { lift: 0.3, rim: 0.6 });
  tone(ctx, door, (c) => c.rect(0.9, -15, 3, 11), P.doorDark);
  line(ctx, 'rgba(60,40,24,0.45)', 0.35, (c) => { c.moveTo(-0.9, -12.8); c.lineTo(-0.9, -4.7); c.moveTo(0.9, -13); c.lineTo(0.9, -4.7); });
  dot(ctx, 1.9, -8.2, 0.35, P.brass);
  for (const [wy, ws] of [[-19.5, 2.8], [-27.5, 2.3]]) {
    cut(ctx, (c) => c.rect(-ws / 2 - 0.5, wy - ws / 2, ws, ws * 1.15), P.window, { lift: 0.3, rim: 0.55 });
    line(ctx, 'rgba(236,227,203,0.9)', 0.35, (c) => { c.moveTo(-0.5, wy - ws / 2); c.lineTo(-0.5, wy + ws * 0.65); c.moveTo(-ws / 2 - 0.5, wy + 0.1); c.lineTo(ws / 2 - 0.5, wy + 0.1); });
  }
  // Flour sacks stacked by the door.
  for (const [sx, sy, sw, sh] of [[-8.6, 1.2, 3.6, 4.4], [-5.5, 1.4, 3.2, 3.8], [-7.3, -2.9, 3, 3.5]]) {
    const sack = cut(ctx, (c) => { c.moveTo(sx - sw / 2, sy); c.quadraticCurveTo(sx - sw / 2 - 0.4, sy - sh * 0.7, sx - 0.5, sy - sh); c.lineTo(sx + 0.5, sy - sh); c.quadraticCurveTo(sx + sw / 2 + 0.4, sy - sh * 0.7, sx + sw / 2, sy); c.closePath(); }, P.sack, { lift: 0.5, rim: 0.5 });
    tone(ctx, sack, (c) => c.rect(sx + 0.3, sy - sh - 1, sw, sh + 2), P.sackShade);
  }
  const cap = cut(ctx, (c) => { c.moveTo(-8.4, -32.6); c.quadraticCurveTo(-8, -42.5, 0, -44); c.quadraticCurveTo(8, -42.5, 8.4, -32.6); c.closePath(); }, P.cap, { lift: 1 });
  tone(ctx, cap, (c) => { c.moveTo(1.5, -46); c.quadraticCurveTo(7, -42, 10, -31); c.lineTo(3, -31); c.closePath(); }, P.capShade);
  line(ctx, 'rgba(90,44,34,0.3)', 0.4, (c) => {
    for (const yy of [-35.6, -38.8, -41.6]) { const k = (yy + 32.6) / -11.4; const hw = Math.sqrt(Math.max(0, 1 - k * k)) * 8.2; c.moveTo(-hw, yy); c.lineTo(hw, yy); }
  });
  cut(ctx, (c) => c.rect(-9.2, -33.6, 18.4, 1.8), P.timberDark, { lift: 0.4, rim: false });
  line(ctx, P.timberDark, 0.6, (c) => { c.moveTo(0, -44); c.lineTo(0, -50); });
  dot(ctx, 0, -50.4, 0.8, P.brass);
}

// The hill colour the windmill's mound is cut from — the pack's near hills (cab.hills).
const MILL_MOUND = { hill: '#48a050', hillLight: '#56ab5a', path: '#b9a47c' };
/**
 * THE WINDMILL, FIRMLY PLANTED. A whitewashed tower mill at 0.75 of the bake-off's size,
 * standing on a low grassy mound built up on the summit, so its footing is level even if
 * `x` is a little off the crest's highest point: the foot sits on the highest crest
 * point within ±8px, and the mound fills from there down to the real crest either side.
 * Sails turn, each canvas breathes, a pennant flies off the cap.
 * Anchor `x` = the mill's centre line on a NEAR-ridge summit. Ink extent around
 * (x, seat.near(x)): x -28..+28 (sail tips; the mound spans ±20), y -63..+6.
 */
export function drawPlumberWindmill(ctx, t, x, seat, paper = true, hill = MILL_MOUND.hill) {
  ctx.save();
  withFinish(paper, () => {
    const P = MILL;
    const S = 0.915;
    // The footing: level with the highest crest under the tower, then a mound that
    // swells out of the hill to meet it.
    let g = Infinity;
    for (let dx = -8; dx <= 8; dx += 2) g = Math.min(g, seat.near(x + dx));
    const lift = 3.2;
    const fy = g - lift;
    const half = 20;
    const moundTop = (xx) => {
      const u = Math.min(1, Math.abs(xx - x) / half);
      const k = Math.cos(u * Math.PI / 2) ** 2;
      return lerp(seat.near(xx), Math.min(seat.near(xx), fy + 0.6), k);
    };
    // Only the part standing ABOVE the crest is drawn — below it the mound is the hill
    // itself — and only its top edge takes the paper rim, continuing the ridge's own.
    const mound = pathOf((c) => {
      c.moveTo(x - half, seat.near(x - half) + 0.3);
      for (let xx = x - half; xx <= x + half + 0.01; xx += 1) c.lineTo(xx, moundTop(xx));
      for (let xx = x + half; xx >= x - half - 0.01; xx -= 1) c.lineTo(xx, seat.near(xx) + 0.3);
      c.closePath();
    });
    cut(ctx, mound, hill, { lift: 0, rim: false });
    tone(ctx, mound, (c) => { for (let xx = x - half; xx <= x + half + 0.01; xx += 1) c.lineTo(xx, moundTop(xx) - 0.2); for (let xx = x + half; xx >= x - half; xx -= 1) c.lineTo(xx, moundTop(xx) + 1.1); c.closePath(); }, MILL_MOUND.hillLight);
    if (PAPER) line(ctx, RIM, 1.15, (c) => { c.moveTo(x - half, moundTop(x - half)); for (let xx = x - half; xx <= x + half + 0.01; xx += 1) c.lineTo(xx, moundTop(xx)); });
    // A worn path from the door, down the mound's face.
    ctx.save();
    clipAbove(ctx, (xx) => seat.near(xx) + 5, x - half, x + half, 0);
    flat(ctx, MILL_MOUND.path, (c) => { c.moveTo(x - 2.4, fy); c.lineTo(x + 1.6, fy); c.quadraticCurveTo(x - 1, fy + 3.5, x - 6.5, fy + 7); c.lineTo(x - 9.5, fy + 7); c.quadraticCurveTo(x - 4, fy + 3.2, x - 2.4, fy); c.closePath(); });
    ctx.restore();
    // The tower, its foot cut level by the mound's top.
    ctx.save();
    clipAbove(ctx, moundTop, x - 30, x + 30, 1.2);
    ctx.translate(x, fy);
    ctx.scale(S, S);
    baked(ctx, 'windmill', -14, -52, 28, 60, millBody);
    ctx.restore();
    ctx.save();
    ctx.translate(x, fy);
    ctx.scale(S, S);
    banner(ctx, 0.3, -49.8, 6, 2.6, t * 1.2, 2.2, '#d9533f', '#b23f30', 0.9);
    // Four stocks, the canvas lattice on the trailing side of each.
    const hx = 0, hy = -37.6;
    const a0 = -t * 0.85 + 0.35;
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * TAU / 4;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(a);
      const b = 0.3 * Math.sin(t * 2.1 + i * 1.7);
      const sail = cut(ctx, (c) => { c.moveTo(5.5, 0.9); c.lineTo(27.5, 0.9); c.lineTo(27.5, 6.8 + b); c.lineTo(5.5, 5.6 + b * 0.5); c.closePath(); }, P.canvas, { lift: 0.9, rot: a, rim: 0.8 });
      tone(ctx, sail, (c) => c.rect(5, 0.5, 23, 2.1), P.canvasShade);
      line(ctx, P.timber, 0.5, (c) => {
        for (let r = 5.5; r <= 27.6; r += 3.68) { const k = (r - 5.5) / 22; c.moveTo(r, 0.9); c.lineTo(r, 5.6 + k * 1.2 + b * (0.5 + k * 0.5)); }
        c.moveTo(5.5, 5.6 + b * 0.5); c.lineTo(27.5, 6.8 + b);
      });
      cut(ctx, (c) => { c.moveTo(-1.5, -0.75); c.lineTo(28.5, -0.55); c.lineTo(28.5, 0.75); c.lineTo(-1.5, 0.85); c.closePath(); }, P.timberDark, { lift: 0.7, rot: a, rim: false });
      ctx.restore();
    }
    cut(ctx, (c) => c.arc(hx, hy, 2.6, 0, TAU), P.hub, { lift: 0.6, rim: 0.6 });
    dot(ctx, hx - 0.5, hy - 0.5, 0.9, P.brass);
    ctx.restore();
  });
  ctx.restore();
}

// ====================================================================== the balloon
const BALLOON = {
  a: '#d65b4c', aShade: '#b24537', b: '#f2e7cf', bShade: '#d9cbab', band: '#ebbd4a', skirt: '#b8a27e',
  basket: '#a8764a', basketDark: '#86583a', basketLight: '#c4935f', rope: 'rgba(92,70,50,0.85)',
  flame: '#ffa63a', flameCore: '#fff2a0', sand: '#c8b48c', skin: '#f0c79a', hat: '#3a78c8',
};
function balloonHalfWidth(y) {
  // Crown circle above y=-29, then a taper to the throat at y=-5.
  if (y <= -29) { const k = (y + 29) / 17.5; return 18.5 * Math.sqrt(Math.max(0, 1 - k * k)); }
  const u = clamp01((y + 29) / 24);
  return lerp(18.5, 5.4, smooth(u) * 0.55 + u * 0.45);
}
// (x, y) here is the throat, 26px under the envelope's centre.
function balloonArt(ctx, t, bx, by, P) {
  const per = 3.4, burnLen = 0.8;
  const bp = t % per;
  const burning = bp < burnLen;
  let lift = 0;
  for (let k = 0; k < 2; k++) { const age = bp + k * per; lift += 4 * (1 - Math.exp(-age * 2.2)) * Math.exp(-age * 0.55); }
  const x = bx, y = by - lift;
  const sway = Math.sin(t * 0.7) * 0.03;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  const o = { rot: sway };
  const outline = (c) => {
    c.moveTo(-5.4, -5);
    for (let yy = -5; yy >= -46.5; yy -= 1) c.lineTo(-balloonHalfWidth(yy), yy);
    for (let yy = -46.5; yy <= -5; yy += 1) c.lineTo(balloonHalfWidth(yy), yy);
    c.closePath();
  };
  // Ropes and basket first: the envelope's skirt hangs in front of their tops.
  line(ctx, P.rope, 0.45, (c) => { c.moveTo(-4.6, -3.5); c.lineTo(-4.2, 5.5); c.moveTo(4.6, -3.5); c.lineTo(4.2, 5.5); c.moveTo(-1.8, -3.5); c.lineTo(-1.6, 5.5); c.moveTo(1.8, -3.5); c.lineTo(1.6, 5.5); });
  // Passenger: a head and a waving arm over the rim.
  const wave = Math.max(0, Math.sin(t * 1.1)) ;
  const armA = -1.2 - Math.sin(t * 9) * 0.35 * wave;
  line(ctx, P.skin, 0.9, (c) => { c.moveTo(-1.2, 5.5); c.lineTo(-1.2 + Math.cos(armA) * 3.6 * (0.4 + wave * 0.6), 5.5 + Math.sin(armA) * 3.6 * (0.4 + wave * 0.6)); });
  cut(ctx, (c) => c.arc(1.2, 3.8, 1.7, 0, TAU), P.skin, { ...o, lift: 0.3, rim: 0.4 });
  cut(ctx, (c) => { c.moveTo(-0.7, 3.2); c.quadraticCurveTo(1.2, 0.6, 3.1, 3.2); c.closePath(); }, P.hat, { ...o, lift: 0.3, rim: false });
  const basket = cut(ctx, (c) => { c.moveTo(-4.8, 5.2); c.lineTo(4.8, 5.2); c.lineTo(4.2, 12); c.lineTo(-4.2, 12); c.closePath(); }, P.basket, { ...o, lift: 0.8, rim: 0.6 });
  tone(ctx, basket, (c) => c.rect(1.5, 4, 5, 9), P.basketDark);
  tone(ctx, basket, (c) => c.rect(-5, 5, 10, 1.4), P.basketLight);
  line(ctx, 'rgba(70,44,24,0.4)', 0.35, (c) => { for (const yy of [7.5, 9.6]) { c.moveTo(-4.5, yy); c.lineTo(4.5, yy); } for (let xx = -3; xx <= 3; xx += 2) { c.moveTo(xx, 6.6); c.lineTo(xx * 0.92, 11.8); } });
  for (const s of [-1, 1]) {
    line(ctx, P.rope, 0.35, (c) => { c.moveTo(s * 4.6, 6.5); c.lineTo(s * 5.6, 9.5); });
    cut(ctx, (c) => c.ellipse(s * 5.7, 10.6, 1.1, 1.4, 0, 0, TAU), P.sand, { ...o, lift: 0.3, rim: 0.4 });
  }
  cut(ctx, (c) => c.rect(-1.8, -2.4, 3.6, 2), '#7d7872', { ...o, lift: 0.3, rim: false });
  // The envelope: gores of red and cream, a gold band, a lit underside when burning.
  const env = cut(ctx, outline, P.b, { ...o, lift: 1.3 });
  ctx.save();
  ctx.clip(env);
  for (let k = -4; k < 4; k++) {
    if ((k + 4) % 2) continue;
    const f0 = Math.sin(k * Math.PI / 8), f1 = Math.sin((k + 1) * Math.PI / 8);
    tone(ctx, env, (c) => {
      c.moveTo(f0 * balloonHalfWidth(-46.5), -46.5);
      for (let yy = -46.5; yy <= -4; yy += 1.5) c.lineTo(f0 * balloonHalfWidth(yy), yy);
      for (let yy = -4; yy >= -46.5; yy -= 1.5) c.lineTo(f1 * balloonHalfWidth(yy), yy);
      c.closePath();
    }, P.a);
  }
  tone(ctx, env, (c) => { c.moveTo(-20, -25.5); for (let xx = -20; xx <= 20; xx += 2) c.lineTo(xx, -25.5 + (xx / 20) ** 2 * 1.2); c.lineTo(20, -22.5); for (let xx = 20; xx >= -20; xx -= 2) c.lineTo(xx, -22.5 + (xx / 20) ** 2 * 1.2); c.closePath(); }, P.band);
  flat(ctx, 'rgba(90,40,30,0.16)', (c) => { c.moveTo(6, -50); c.bezierCurveTo(22, -40, 22, -14, 4, -3); c.lineTo(30, -3); c.lineTo(30, -50); c.closePath(); });
  flat(ctx, 'rgba(255,255,255,0.3)', (c) => c.ellipse(-8.5, -36, 3.2, 6.5, 0.35, 0, TAU));
  if (burning) glow(ctx, 0, -8, 16, '255,190,90', 0.35 * Math.sin(Math.PI * (bp / burnLen)));
  ctx.restore();
  const skirt = cut(ctx, (c) => { c.moveTo(-5.6, -5.6); c.lineTo(5.6, -5.6); c.lineTo(4.6, -2.8); c.lineTo(-4.6, -2.8); c.closePath(); }, P.skirt, { ...o, lift: 0.5, rim: 0.5 });
  tone(ctx, skirt, (c) => c.rect(1.4, -7, 5, 5), '#9c8866');
  // The burner's flame, roaring up out of the throat.
  if (burning) {
    const k = bp / burnLen;
    const hgt = (5 + 5 * Math.sin(Math.PI * Math.min(1, k * 1.3))) * (0.85 + 0.15 * Math.sin(t * 40));
    glow(ctx, 0, -5, 9, '255,170,60', 0.5 * Math.sin(Math.PI * k));
    flat(ctx, P.flame, (c) => { c.moveTo(-1.9, -2.2); c.quadraticCurveTo(-2.2, -2.2 - hgt * 0.6, 0.2, -2.2 - hgt); c.quadraticCurveTo(2.1, -2.2 - hgt * 0.5, 1.9, -2.2); c.closePath(); });
    flat(ctx, P.flameCore, (c) => { c.moveTo(-0.8, -2.2); c.quadraticCurveTo(-0.7, -2.2 - hgt * 0.45, 0.1, -2.2 - hgt * 0.62); c.quadraticCurveTo(0.9, -2.2 - hgt * 0.4, 0.8, -2.2); c.closePath(); });
  }
  ctx.restore();
}


// A second livery, so two balloons in one sky are two balloons.
const BALLOON_BLUE = { a: '#3f78c0', aShade: '#2f5f9a', b: '#f4efe0', band: '#ebbd4a' };
/**
 * THE HOT-AIR BALLOON. Every 3.4s the burner roars — flame at the throat, the envelope
 * lit from inside — and it lifts up to ~4px before settling; someone in the basket
 * waves; it sways a little. The pack moves it.
 * (`x`, `y`) = screen position of the ENVELOPE'S CENTRE. Ink extent around it: x ±21,
 * y -25..+40 (the basket hangs below), plus up to 4px of burner lift upward.
 * opts: paper (true), phase (s — offsets the burn/wave/sway clocks so two balloons do
 * not move in lockstep), variant (0 red-and-cream, 1 blue-and-cream).
 */
export function drawPlumberBalloon(ctx, t, x, y, { paper = true, phase = 0, variant = 0 } = {}) {
  ctx.save();
  withFinish(paper, () => balloonArt(ctx, t + phase, x, y + 26, variant ? { ...BALLOON, ...BALLOON_BLUE } : BALLOON));
  ctx.restore();
}

// ====================================================================== the flock
// Eight sheep and a working collie over a near summit. Every sheep is built the same
// way — a baked fleece (a scalloped silhouette, a second row of curls laid inside it,
// belly shade, a tail), live legs with knees and hooves, and a live head with ears, an
// eye and a nose — and each is in its own pose: grazing head-down, head-up chewing, one
// lying down, two lambs. The collie works round the flock — behind it along the crest,
// in front of it down the face — drops into a crouch to give it the eye, and dashes off
// again; the sheep it comes near turn their heads to watch it, and step out of its way.
const FLOCK = {
  wool: '#f2ede1', woolShade: '#d9d0bd', woolLight: '#fbf8f0', curl: 'rgba(150,132,104,0.42)',
  lambWool: '#f9f6ee', face: '#3f3731', faceShade: '#2c2622', faceWhite: '#e8dfce',
  faceWhiteShade: '#cfc3ad', earIn: '#b98a7e', nose: '#1f1a17', noseWhite: '#8a6f64',
  leg: '#3b342e', legFar: '#29231f', hoof: '#1a1613', eye: '#f4efe6',
  dog: '#26221f', dogShade: '#141210', dogWhite: '#f4f1ea', dogWhiteShade: '#d6d0c4',
  tongue: '#e0707a', shadow: 'rgba(28,64,30,0.22)',
};
// The collies' coats: the lap's dog is black and white, the figure of eight's red and
// white (Peter, 25 Sep 2026: "could one of the dogs have different colouring?"). `sheen`
// is the light along the saddle; a red dog has a liver nose.
const COLLIE_COATS = [
  { dog: FLOCK.dog, dogShade: FLOCK.dogShade, sheen: '#3a3430', nose: FLOCK.nose },
  { dog: '#8a4f2c', dogShade: '#5c321c', sheen: '#a8683f', nose: '#3a2018' },
];
// A fleece silhouette: an ellipse with a scalloped rim of curls, flatter along the belly.
function woolPath(c, cx, cy, rx, ry, seed, n = 13) {
  c.moveTo(cx + rx * 0.9, cy);
  c.ellipse(cx, cy, rx * 0.9, ry * 0.86, 0, 0, TAU);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + seed * 0.7;
    const r = (1.35 + hash(seed * 13 + k) * 0.5) * (Math.sin(a) > 0.35 ? 0.72 : 1);
    const px = cx + Math.cos(a) * rx * 0.8, py = cy + Math.sin(a) * ry * 0.72;
    c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU);
  }
}
// The whole still part of a sheep: fleece, inner curls, shading, tail — and for a
// lying sheep its folded legs. Facing +x; the bake is mirrored by `dir` at the blit, so
// its paper drop is baked mirrored the other way.
function fleece(g, seed, dir, lying, lamb) {
  const P = FLOCK;
  const o = { fx: dir };
  const cy = lying ? -3.5 : -6.4, rx = lamb ? 4.6 : 5.6, ry = lying ? 2.9 : (lamb ? 2.9 : 3.3);
  const col = lamb ? P.lambWool : P.wool;
  if (lying) {
    // Folded legs: a hoof and a knee poking out under the fleece, front and back.
    for (const [lx, far] of [[3.6, true], [-3.4, false], [2.2, false]]) {
      cut(g, (c) => { rr(c, lx - 1.6, -1.25, 3.2, 1.2, 0.6); }, far ? P.legFar : P.leg, { ...o, lift: 0.3, rim: false });
      flat(g, P.hoof, (c) => rr(c, lx + 0.8, -1.2, 1, 1.1, 0.4));
    }
  }
  // Tail: a woolly nub at the rump.
  cut(g, (c) => c.ellipse(-rx - 0.4, cy - 0.8, 1.35, 1.8, -0.4, 0, TAU), col, { ...o, lift: 0.4, rim: 0.5 });
  const body = cut(g, (c) => woolPath(c, 0, cy, rx, ry, seed, lamb ? 10 : 13), col, { ...o, lift: 0.7, rim: 0.7 });
  // Belly shade, and a warmer shade toward the rump so the fleece is round.
  tone(g, body, (c) => c.ellipse(0.8, cy + ry * 0.95, rx * 1.2, ry * 0.75, 0, 0, TAU), P.woolShade);
  tone(g, body, (c) => c.ellipse(-rx * 0.95, cy + 0.6, rx * 0.45, ry * 1.2, 0, 0, TAU), P.woolShade);
  // A second row of curls laid inside the silhouette: highlights on the back, and
  // little C-strokes of shadow where one curl tucks under the next.
  for (let k = 0; k < (lamb ? 5 : 8); k++) {
    const u = (k + 0.5) / (lamb ? 5 : 8);
    const px = -rx * 0.75 + u * rx * 1.5 + (hash(seed * 7 + k) - 0.5) * 0.8;
    const py = cy - ry * 0.35 + (k % 2) * ry * 0.45 + (hash(seed * 3 + k) - 0.5) * 0.5;
    const r = 0.95 + hash(seed + k * 5) * 0.45;
    tone(g, body, (c) => c.arc(px, py - r * 0.3, r * 0.8, 0, TAU), P.woolLight);
    line(g, P.curl, 0.35, (c) => c.arc(px, py, r, 0.15 * Math.PI, 0.95 * Math.PI));
  }
}
// A side-on head in its own frame: the poll at the origin, the muzzle toward +x.
function headSide(ctx, whiteFace, lamb, chew, o) {
  const P = FLOCK;
  const face = whiteFace ? P.faceWhite : P.face, shade = whiteFace ? P.faceWhiteShade : P.faceShade;
  // The far ear first, a droop behind the poll.
  cut(ctx, (c) => c.ellipse(-0.9, -0.9, 1.5, 0.55, -0.9, 0, TAU), shade, { ...o, lift: 0.3, rim: 0.35 });
  const head = cut(ctx, (c) => {
    c.moveTo(-1.3, -0.9);
    c.quadraticCurveTo(0.6, -2.1, 2.7, -0.8);
    c.quadraticCurveTo(3.9, 0, 3.4, 1.0);
    c.quadraticCurveTo(2.5, 1.9 + chew * 0.5, 0.7, 1.5);
    c.quadraticCurveTo(-1.4, 1.2, -1.3, -0.9);
    c.closePath();
  }, face, { ...o, lift: 0.4, rim: 0.5 });
  tone(ctx, head, (c) => c.ellipse(1.2, 1.5, 2.6, 0.9, 0, 0, TAU), shade);
  // Eye, nostril, the line of the mouth working when it chews.
  dot(ctx, 1.1, -0.45, 0.5, P.eye);
  dot(ctx, 1.25, -0.45, 0.3, P.nose);
  dot(ctx, 3.25, 0.25, 0.28, whiteFace ? P.noseWhite : '#6b5e56');
  line(ctx, whiteFace ? P.noseWhite : P.faceShade, 0.3, (c) => { c.moveTo(3.2, 0.95); c.quadraticCurveTo(2.6, 1.2 + chew * 0.4, 2.1, 1.05); });
  // The near ear, sticking out sideways with its pink inside, and the woolly topknot.
  const ear = cut(ctx, (c) => c.ellipse(-0.5, -0.5, 1.7, 0.62, -0.35, 0, TAU), face, { ...o, lift: 0.3, rim: 0.4 });
  tone(ctx, ear, (c) => c.ellipse(-0.7, -0.45, 1.0, 0.28, -0.35, 0, TAU), P.earIn, false);
  cut(ctx, (c) => { c.arc(-0.9, -1.3, lamb ? 0.9 : 1.15, 0, TAU); c.moveTo(0.6, -1.6); c.arc(0, -1.6, 0.6, 0, TAU); }, lamb ? P.lambWool : P.wool, { ...o, lift: 0.3, rim: 0.4 });
}
// A head turned to face the viewer — the sheep that has stopped to watch the dog.
function headFront(ctx, whiteFace, lamb, chew, o) {
  const P = FLOCK;
  const face = whiteFace ? P.faceWhite : P.face, shade = whiteFace ? P.faceWhiteShade : P.faceShade;
  for (const s of [-1, 1]) {
    const ear = cut(ctx, (c) => c.ellipse(s * 2.2, -0.9, 1.6, 0.6, s * 0.25, 0, TAU), face, { ...o, lift: 0.3, rim: 0.4 });
    tone(ctx, ear, (c) => c.ellipse(s * 2.3, -0.85, 1.0, 0.27, s * 0.25, 0, TAU), P.earIn, false);
  }
  const head = cut(ctx, (c) => {
    c.moveTo(-1.5, -1.6);
    c.quadraticCurveTo(0, -2.6, 1.5, -1.6);
    c.quadraticCurveTo(1.6, 1.4, 0.8, 2.6 + chew * 0.3);
    c.quadraticCurveTo(0, 3.1 + chew * 0.3, -0.8, 2.6 + chew * 0.3);
    c.quadraticCurveTo(-1.6, 1.4, -1.5, -1.6);
    c.closePath();
  }, face, { ...o, lift: 0.4, rim: 0.5 });
  tone(ctx, head, (c) => c.rect(0.3, -3, 2, 7), shade);
  for (const s of [-1, 1]) { dot(ctx, s * 0.75, -0.5, 0.5, P.eye); dot(ctx, s * 0.75, -0.4, 0.3, P.nose); }
  for (const s of [-1, 1]) dot(ctx, s * 0.35, 2.1, 0.22, whiteFace ? P.noseWhite : '#6b5e56');
  cut(ctx, (c) => { c.arc(0, -2.2, lamb ? 1.0 : 1.3, 0, TAU); c.moveTo(1.6, -1.9); c.arc(1, -1.9, 0.6, 0, TAU); c.moveTo(-0.4, -1.9); c.arc(-1, -1.9, 0.6, 0, TAU); }, lamb ? P.lambWool : P.wool, { ...o, lift: 0.3, rim: 0.4 });
}
// A leg from the hip to the hoof, bending at the knee: `swing` moves the hoof.
function sheepLeg(ctx, hx, hy, swing, far, lamb, bend = 1) {
  const P = FLOCK;
  const kx = hx + swing * 0.45 + bend * 0.35, ky = hy + (-hy) * 0.48;
  const fx = hx + swing, fy = -0.15 - Math.max(0, -swing) * 0.25;
  const col = far ? P.legFar : P.leg;
  line(ctx, col, lamb ? 0.9 : 1.15, (c) => { c.moveTo(hx, hy); c.lineTo(kx, ky); });
  line(ctx, col, lamb ? 0.7 : 0.85, (c) => { c.moveTo(kx, ky); c.lineTo(fx, fy); });
  dot(ctx, kx, ky, lamb ? 0.5 : 0.6, col);
  flat(ctx, P.hoof, (c) => rr(c, fx - 0.55, fy - 0.55, 1.2, 0.75, 0.3));
}
// One sheep, feet at (x, y), facing `dir`. `pose`: 'stand' | 'lie' | 'lamb'.
// `graze` 0..1 puts the head down; `sw` -1..1 is the legs' swing (0 stands square);
// `look` 0..1 turns the head to face the viewer; `hop` lifts a skipping lamb.
function drawSheep(ctx, x, y, s, dir, pose, graze, sw, look, t, seed, whiteFace, hop = 0) {
  const P = FLOCK;
  const lying = pose === 'lie', lamb = pose === 'lamb';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir };
  flat(ctx, P.shadow, (c) => c.ellipse(0.4, 0.2, lying ? 6.6 : 6.0, 1.05, 0, 0, TAU));
  ctx.translate(0, -hop);
  if (!lying) {
    const hy = lamb ? -3.4 : -4.2;
    // Far legs, then (after the fleece) the near ones.
    sheepLeg(ctx, -2.9, hy, -sw * 1.2, true, lamb);
    sheepLeg(ctx, 3.3, hy, sw * 1.2, true, lamb);
  }
  baked(ctx, `fleece2|${seed}|${dir}|${pose}`, -9, -12, 18.5, 13.5, (g) => fleece(g, seed, dir, lying, lamb));
  if (!lying) {
    const hy = lamb ? -3.4 : -4.2;
    sheepLeg(ctx, -2.0, hy, sw * 1.2, false, lamb);
    sheepLeg(ctx, 4.2, hy, -sw * 1.2, false, lamb);
  }
  // Neck and head: down in the grass while it grazes, up and chewing when not, turned
  // to the viewer when it watches the dog. The chewing fades in as the head comes up.
  const chew = smooth((0.6 - graze) / 0.2) * (0.5 + 0.5 * Math.sin(t * 9 + seed));
  const base = lying ? -4.6 : -6.6;
  const hs = lamb ? 1.2 : 1;
  const hx = lerp(6.0, 6.4, graze) * (lamb ? 0.85 : 1), hy = base + lerp(-1.3, 4.8, graze) + chew * 0.2;
  const ha = lerp(-0.2, 1.05, graze);
  // The neck: a thick woolly column, its shaded side toward the ground.
  const nx = hx - Math.cos(ha) * 1.1, ny = hy;
  const na = Math.atan2(ny - base, nx - 3.2), px = -Math.sin(na) * 0.5, py = Math.cos(na) * 0.5;
  line(ctx, P.woolShade, 3.8, (c) => { c.moveTo(3.0 + px, base + py); c.lineTo(nx + px, ny + py); });
  line(ctx, lamb ? P.lambWool : P.wool, 3.0, (c) => { c.moveTo(3.0 - px * 0.6, base - py * 0.6); c.lineTo(nx - px * 0.6, ny - py * 0.6); });
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(hs, hs);
  if (look > 0.5 && graze < 0.2) {
    ctx.translate(-0.4, 0.2);
    headFront(ctx, whiteFace, lamb, chew, o);
  } else {
    ctx.rotate(ha);
    headSide(ctx, whiteFace, lamb, chew, { ...o, rot: ha });
  }
  ctx.restore();
  ctx.restore();
}
// A border collie, feet at (x, y), facing `dir` (±1): `run` is the gallop phase, `crouch`
// 0..1 drops it flat to give the flock the eye, and `lift` px raises it off the ground
// in a hop, its shadow left on the grass and shrinking. `coat`: one of COLLIE_COATS.
function drawCollie(ctx, x, y, s, dir, run, crouch, lift = 0, coat = COLLIE_COATS[0]) {
  const P = { ...FLOCK, ...coat };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir < 0 ? -1 : 1 };
  const st = Math.sin(run), ct = Math.cos(run);
  const gait = 1 - crouch;
  const sh = 1 - Math.min(0.35, lift * 0.08);
  flat(ctx, P.shadow, (c) => c.ellipse(0, 0.2, 5.8 * sh, 0.9 * sh, 0, 0, TAU));
  ctx.translate(0, -lift / s);
  const by = -4.9 + crouch * 2.1 - Math.abs(ct) * 0.5 * gait;
  const pitch = -0.08 * st * gait + crouch * 0.05;
  // A leg in two parts with a white sock: hip or shoulder at (px, py), `a` the swing.
  const leg = (px, py, a, hind, col, sock) => {
    const L1 = (hind ? 2.4 : 2.2) - crouch * 0.6, L2 = (hind ? 2.6 : 2.5) - crouch * 0.7;
    const kx = px + Math.sin(a) * L1, ky = py + Math.cos(a) * L1;
    const b = a + (hind ? 0.9 : -0.6) * (0.4 + 0.6 * gait);
    const fx = kx + Math.sin(b) * L2, fy = Math.min(0, ky + Math.cos(b) * L2);
    line(ctx, col, 1.2, (c) => { c.moveTo(px, py); c.lineTo(kx, ky); });
    line(ctx, col, 0.9, (c) => { c.moveTo(kx, ky); c.lineTo(fx, fy); });
    line(ctx, sock, 0.95, (c) => { c.moveTo(lerp(kx, fx, 0.45), lerp(ky, fy, 0.45)); c.lineTo(fx, fy); });
  };
  // Bounding gallop: the fore pair and hind pair swing against each other.
  const fore = 0.95 * st * gait, hind = -0.95 * st * gait;
  leg(3.4, by + 0.9, fore - 0.25, false, P.dogShade, P.dogWhiteShade);
  leg(-3.4, by + 0.6, hind + 0.2, true, P.dogShade, P.dogWhiteShade);
  ctx.save();
  ctx.translate(0, by);
  ctx.rotate(pitch);
  const po = { ...o, rot: pitch };
  // The tail, a plume streaming back, low in the crouch; white at the tip.
  const tl = crouch * 1.6;
  const tail = cut(ctx, (c) => {
    c.moveTo(-4.6, -0.9);
    c.quadraticCurveTo(-8, -2.6 + st * 0.8 + tl, -10.4, -0.6 + st * 0.5 + tl * 1.6);
    c.quadraticCurveTo(-8.2, 0.6 + tl, -4.6, 0.9);
    c.closePath();
  }, P.dog, { ...po, lift: 0.4, rim: 0.5 });
  tone(ctx, tail, (c) => c.arc(-10, -0.5 + st * 0.5 + tl * 1.6, 1.6, 0, TAU), P.dogWhite);
  // Body: a deep chest tapering to the loin, black saddle over a white underside.
  const body = cut(ctx, (c) => {
    c.moveTo(-5.2, -0.6);
    c.quadraticCurveTo(-4.6, -2.3, -1, -2.2);
    c.quadraticCurveTo(3, -2.4, 4.9, -1.2);
    c.quadraticCurveTo(5.8, 0.6, 4.4, 2);
    c.quadraticCurveTo(2.4, 2.8, 0.4, 1.4);
    c.quadraticCurveTo(-2.4, 1.2, -4.4, 1.3);
    c.quadraticCurveTo(-5.8, 0.8, -5.2, -0.6);
    c.closePath();
  }, P.dog, { ...po, lift: 0.6, rim: 0.6 });
  tone(ctx, body, (c) => { c.moveTo(0, 1.1); c.quadraticCurveTo(3.4, 0.4, 6, -0.2); c.lineTo(6, 4); c.lineTo(0, 4); c.closePath(); }, P.dogWhite);
  tone(ctx, body, (c) => c.ellipse(-1, -1.6, 3.4, 0.5, 0, 0, TAU), P.sheen);
  // The white collar ruff round the neck.
  const ruff = cut(ctx, (c) => c.ellipse(4.1, -0.6, 1.4, 2.1, 0.35, 0, TAU), P.dogWhite, { ...po, lift: 0.3, rim: 0.4 });
  tone(ctx, ruff, (c) => c.ellipse(4.8, 0.4, 1.2, 1.4, 0, 0, TAU), P.dogWhiteShade);
  ctx.restore();
  // Near legs over the body.
  leg(3.9, by + 1.1, fore + 0.15, false, P.dog, P.dogWhite);
  leg(-2.8, by + 0.8, hind - 0.2, true, P.dog, P.dogWhite);
  // Head: level and eager at the run, low and staring in the crouch.
  const hx = 6.3 + crouch * 0.6, hy = by - 2.5 + crouch * 1.6 + ct * 0.3 * gait;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(crouch * 0.18);
  const ho = { ...o, rot: crouch * 0.18 };
  // Ears: the far one pricked, the near one tipped over at the top.
  cut(ctx, (c) => { c.moveTo(-1.3, -0.7); c.lineTo(-0.9, -3.1); c.lineTo(0, -1.1); c.closePath(); }, P.dogShade, { ...ho, lift: 0.3, rim: 0.35 });
  const skull = cut(ctx, (c) => {
    c.moveTo(-1.8, 0.4);
    c.quadraticCurveTo(-1.6, -1.8, 0.4, -1.6);
    c.quadraticCurveTo(1.6, -1.4, 2.2, -0.5);
    c.lineTo(3.7, -0.1);
    c.quadraticCurveTo(4.1, 0.5, 3.5, 0.9);
    c.lineTo(1.4, 1.3);
    c.quadraticCurveTo(-0.6, 1.9, -1.8, 0.4);
    c.closePath();
  }, P.dog, { ...ho, lift: 0.4, rim: 0.5 });
  // The white blaze up the face and the white muzzle.
  tone(ctx, skull, (c) => { c.moveTo(0.3, -1.8); c.lineTo(0.9, -1.8); c.lineTo(2.3, -0.3); c.lineTo(4, 0); c.lineTo(4, 1.6); c.lineTo(1.2, 1.6); c.quadraticCurveTo(1.6, 0.2, 0.3, -1.8); c.closePath(); }, P.dogWhite);
  cut(ctx, (c) => { c.moveTo(-0.3, -1.3); c.lineTo(0.6, -3.2); c.quadraticCurveTo(1.3, -2.9, 1.2, -2.3); c.lineTo(0.9, -2.5); c.lineTo(0.9, -1.2); c.closePath(); }, P.dog, { ...ho, lift: 0.3, rim: 0.35 });
  dot(ctx, 1.2, -0.7, 0.42, P.eye);
  dot(ctx, 1.3, -0.7, 0.26, FLOCK.nose);
  dot(ctx, 3.8, 0.1, 0.4, P.nose);
  // Mouth open and tongue out while it runs; shut and intent in the crouch.
  if (gait > 0.4) flat(ctx, P.tongue, (c) => c.ellipse(2.6, 1.55, 0.75, 0.38, 0.3, 0, TAU));
  ctx.restore();
  // Dust kicked up by the dash out of the crouch.
  if (gait > 0.2 && gait < 0.95) {
    for (let k = 0; k < 3; k++) dot(ctx, -5 - k * 1.8, -0.4 - k * 0.5, 0.55 - k * 0.12, `rgba(210,196,160,${0.55 * (1 - gait) + 0.15})`);
  }
  ctx.restore();
}
// ------------------------------------------------------------ the piglet
// The figure of eight's sheep-pig (Peter, 27 Sep 2026, from the bake-off in
// src/dev/pig-flock-candidates.js: "lets ship B"). He runs the brown collie's figure of
// eight and the flock answers him; she sits up on the crest and watches (THE SHEEP-PIG).
// A Large White piglet — Babe — pale pink with a blush, a big head for his size, ears
// pricked up and tipping forward, the snout a short tube ending in a flat disc. The pink is
// muted to sit in the sheep's paper palette.
const PIG = {
  body: '#f2c4b6', shade: '#dba395', light: '#fadcd2', earIn: '#e7a293', snout: '#eeaa9b',
  nostril: '#8e544b', trotter: '#7e5d55', eye: '#2b1f1c', glint: '#fff6f0', blush: '#eca092',
  mouth: '#b3695f', shadow: 'rgba(28,64,30,0.22)',
};
const PIG_STRIDE = 7;                 // ground px per trotting stride
const PIG_HOP = 2.6;                  // screen px, the turning hop

// Piglet, feet at (x, y), facing `dir`. p: run (stride phase), gait 0..1 (trotting), sit,
// lie, root (snout in the grass), nod (a polite bob of the head), perk (ears up), lift
// (screen px off the ground), t, seed.
function drawPiglet(ctx, x, y, s, dir, p = {}) {
  const { run = 0, gait = 0, sit = 0, lie = 0, root = 0, nod = 0, perk = 0, lift = 0, t = 0, seed = 0 } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const fx = dir < 0 ? -1 : 1;
  const sh = 1 - Math.min(0.35, lift * 0.08);
  flat(ctx, PIG.shadow, (c) => c.ellipse(0.2, 0.2, 4.6 * sh, 0.8 * sh, 0, 0, TAU));
  ctx.translate(0, -lift / s);
  const air = clamp01(lift / 1.2);

  // The body frame: it tips back about the rump to sit, and drops to lie; it bobs at a trot.
  const RX = -3.0, RY = -1.4;
  const a = -0.55 * sit;
  const drop = 1.0 * sit + 1.4 * lie * (1 - sit) - 0.3 * (0.5 + 0.5 * Math.cos(2 * run)) * gait;
  const ca = Math.cos(a), sa = Math.sin(a);
  const B = (px, py) => [RX + (px - RX) * ca - (py - RY) * sa, RY + drop + (px - RX) * sa + (py - RY) * ca];

  // A leg from a body-frame hip to its foot on the grass: a stout pink column narrowing to
  // a dark trotter. Trotting, the diagonal pairs swing together.
  const leg = (hx, hy, phase, hind, col) => {
    const [ax, ay] = B(hx, hy);
    const sw = Math.sin(run + phase) * gait;
    let fx0 = ax + sw * 1.2, fy0 = -Math.max(0, Math.cos(run + phase)) * 0.9 * gait;
    // Sitting: the hind trotters come forward under the belly, the fore stand straight.
    fx0 = lerp(fx0, ax + (hind ? 0.9 : 0.2), sit);
    fy0 = lerp(fy0, 0, sit);
    // Lying: all four tucked, the trotters poking forward.
    fx0 = lerp(fx0, ax + (hind ? 1.3 : 1.6), lie * (1 - sit));
    fy0 = lerp(fy0, -0.25, lie * (1 - sit)) - air * 0.7;
    const mx = lerp(ax, fx0, 0.5), my = lerp(ay, fy0, 0.5);
    line(ctx, col, 1.3, (c) => { c.moveTo(ax, ay); c.lineTo(mx, my); });
    line(ctx, col, 1.0, (c) => { c.moveTo(mx, my); c.lineTo(fx0, fy0); });
    flat(ctx, PIG.trotter, (c) => c.ellipse(fx0 + 0.15, fy0 - 0.25, 0.55, 0.33, 0, 0, TAU));
  };

  // Far legs, then the body.
  leg(-2.7, -2.7, 0, true, PIG.shade);
  leg(1.8, -2.7, Math.PI, false, PIG.shade);

  ctx.save();
  ctx.translate(RX, RY + drop);
  ctx.rotate(a);
  ctx.translate(-RX, -RY);
  const o = { fx, rot: a };
  // The curly tail, wagging at the root; a quicker wag when he is excited.
  ctx.save();
  ctx.translate(-3.8, -4.1);
  ctx.rotate(0.35 * Math.sin(t * (7 + 5 * perk) + seed) * (0.4 + 0.6 * Math.max(gait, perk)));
  line(ctx, PIG.shade, 0.42, (c) => {
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.9, -0.1, -1.1, -0.8);
    c.arc(-0.6, -0.95, 0.5, Math.PI, Math.PI + 1.75 * Math.PI);
  });
  ctx.restore();
  const body = cut(ctx, (c) => {
    c.moveTo(-3.9, -3.6);
    c.quadraticCurveTo(-4.0, -5.6, -1.6, -5.9);
    c.quadraticCurveTo(1.2, -6.1, 3.0, -5.5);
    c.quadraticCurveTo(4.2, -4.8, 3.9, -3.2);
    c.quadraticCurveTo(3.4, -1.7, 1.4, -1.7);
    c.quadraticCurveTo(-0.6, -1.4, -2.4, -1.8);
    c.quadraticCurveTo(-4.0, -2.2, -3.9, -3.6);
    c.closePath();
  }, PIG.body, { ...o, lift: 0.6, rim: 0.55 });
  tone(ctx, body, (c) => c.ellipse(0.2, -1.5, 4.6, 1.1, 0, 0, TAU), PIG.shade);
  tone(ctx, body, (c) => c.ellipse(-3.9, -3.4, 1.1, 2.3, 0, 0, TAU), PIG.shade);
  tone(ctx, body, (c) => c.ellipse(-0.3, -5.5, 2.8, 0.45, -0.03, 0, TAU), PIG.light);
  ctx.restore();

  // Near legs over the body.
  leg(-2.0, -2.6, Math.PI, true, PIG.body);
  leg(2.5, -2.6, 0, false, PIG.body);

  // The head, hung from the neck: down to root, a bob to ask, a lift at the top of a trot.
  const [nx, ny] = B(2.8, -4.4);
  const ha = a * 0.6 + 0.55 * root + 0.05 * Math.sin(t * 14 + seed) * root
    + 0.12 * Math.sin(t * 7 + seed) * nod + 0.18 * lie * (1 - sit) - 0.04 * Math.sin(2 * run) * gait;
  ctx.save();
  ctx.translate(nx, ny + 0.5 * root);
  ctx.rotate(ha);
  const ho = { fx, rot: ha };
  // Ears: pricked, the tips tipping forward, flapping a little at the trot; perk stands
  // them up.
  const flop = 0.3 * Math.sin(run * 2) * gait - 0.35 * perk + 0.2 * lie;
  const ear = (dx, dy, col, inner) => {
    const e = cut(ctx, (c) => {
      c.moveTo(0.2 + dx, -1.6 + dy);
      c.quadraticCurveTo(0.3 + dx, -3.6 + dy, 1.5 + dx, -4.7 + dy + flop * 0.5);
      c.quadraticCurveTo(2.6 + dx + flop, -4.4 + dy + flop, 2.8 + dx + flop, -3.4 + dy + flop);
      c.quadraticCurveTo(2.2 + dx, -2.6 + dy, 1.9 + dx, -1.9 + dy);
      c.closePath();
    }, col, { ...ho, lift: 0.3, rim: 0.35 });
    if (inner) tone(ctx, e, (c) => c.ellipse(1.5 + dx + flop * 0.4, -3.3 + dy, 0.5, 1.1, 0.55, 0, TAU), PIG.earIn, false);
  };
  ear(-0.7, -0.1, PIG.shade, false);
  const head = cut(ctx, (c) => {
    c.moveTo(-0.6, -1.6);
    c.quadraticCurveTo(0.8, -2.6, 2.3, -1.8);
    c.quadraticCurveTo(3.0, -1.3, 3.4, -0.6);
    c.lineTo(4.3, -0.5);
    c.quadraticCurveTo(4.65, 0.2, 4.3, 0.9);
    c.lineTo(3.3, 1.0);
    c.quadraticCurveTo(2.4, 1.9, 0.8, 1.7);
    c.quadraticCurveTo(-0.6, 1.4, -0.9, 0.2);
    c.quadraticCurveTo(-1.0, -1.0, -0.6, -1.6);
    c.closePath();
  }, PIG.body, { ...ho, lift: 0.4, rim: 0.45 });
  tone(ctx, head, (c) => c.ellipse(1.2, 1.5, 2.6, 0.7, 0, 0, TAU), PIG.shade);
  tone(ctx, head, (c) => c.ellipse(1.9, 0.55, 0.75, 0.45, 0, 0, TAU), PIG.blush);
  // Where the snout meets the face, the disc on the end of it and its nostril.
  line(ctx, PIG.shade, 0.22, (c) => { c.moveTo(3.35, -0.5); c.quadraticCurveTo(3.2, 0.2, 3.3, 0.95); });
  flat(ctx, PIG.snout, (c) => c.ellipse(4.45, 0.2, 0.42, 0.78, 0, 0, TAU));
  flat(ctx, PIG.nostril, (c) => c.ellipse(4.55, 0.12, 0.13, 0.24, 0, 0, TAU));
  // The eye with its glint, and a small smile.
  dot(ctx, 2.1, -0.75, 0.36, PIG.eye);
  dot(ctx, 2.2, -0.88, 0.12, PIG.glint);
  line(ctx, PIG.mouth, 0.22, (c) => { c.moveTo(4.0, 1.12); c.quadraticCurveTo(3.4, 1.45, 2.85, 1.15); });
  ear(0, 0, PIG.body, true);
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------ the collie, sat up
// The brown collie of drawCollie sitting up to watch, feet at (x, y), facing `dir`: haunch
// down, forelegs straight, chest and ruff up, her tail along the grass. Her head is
// drawCollie's own, pitched by `tilt`. `happy` 0..1 wags the tail and opens her mouth;
// `lift` px is the hop she turns round in.
function drawSeatedCollie(ctx, x, y, s, dir, { lift = 0, t = 0, happy = 0, tilt = 0 } = {}) {
  const P = { ...FLOCK, ...COLLIE_COATS[1] };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir < 0 ? -1 : 1 };
  const sh = 1 - Math.min(0.35, lift * 0.08);
  flat(ctx, P.shadow, (c) => c.ellipse(-1, 0.2, 5.2 * sh, 0.9 * sh, 0, 0, TAU));
  ctx.translate(0, -lift / s);
  // The tail along the grass: a slow sweep while she watches, a wag when he asks.
  const wag = Math.sin(t * (3 + 9 * happy)) * (0.35 + 0.8 * happy);
  const tail = cut(ctx, (c) => {
    c.moveTo(-3.4, -1.4);
    c.quadraticCurveTo(-6.4, -1.7 + wag * 0.6, -8.6, -0.7 + wag);
    c.quadraticCurveTo(-6.4, 0.1, -3.2, -0.2);
    c.closePath();
  }, P.dog, { ...o, lift: 0.4, rim: 0.5 });
  tone(ctx, tail, (c) => c.arc(-8.3, -0.7 + wag, 1.4, 0, TAU), P.dogWhite);
  const foreleg = (x0, col, sock) => {
    line(ctx, col, 1.2, (c) => { c.moveTo(x0, -4.8); c.lineTo(x0 + 0.2, -2.2); });
    line(ctx, col, 1.0, (c) => { c.moveTo(x0 + 0.2, -2.2); c.lineTo(x0 + 0.3, -0.3); });
    line(ctx, sock, 0.95, (c) => { c.moveTo(x0 + 0.25, -1.7); c.lineTo(x0 + 0.3, -0.3); });
    flat(ctx, sock, (c) => c.ellipse(x0 + 0.7, -0.3, 0.75, 0.35, 0, 0, TAU));
  };
  foreleg(1.3, P.dogShade, P.dogWhiteShade);
  // Body: from the haunch on the grass up to a deep chest.
  const body = cut(ctx, (c) => {
    c.moveTo(-3.9, -1.2);
    c.quadraticCurveTo(-4.4, -4.6, -1.8, -6.4);
    c.quadraticCurveTo(0.2, -8.6, 2.4, -8.4);
    c.quadraticCurveTo(3.8, -7.2, 3.2, -4.6);
    c.quadraticCurveTo(2.6, -2.2, 1.4, -0.6);
    c.lineTo(-3.2, -0.2);
    c.closePath();
  }, P.dog, { ...o, lift: 0.6, rim: 0.6 });
  tone(ctx, body, (c) => c.ellipse(3.0, -5.2, 1.4, 2.9, 0.12, 0, TAU), P.dogWhite);
  tone(ctx, body, (c) => c.ellipse(-1.9, -5.4, 1.9, 0.45, -0.75, 0, TAU), P.sheen);
  const haunch = cut(ctx, (c) => c.ellipse(-1.9, -2.3, 2.3, 2.1, 0, 0, TAU), P.dog, { ...o, lift: 0.4, rim: 0.45 });
  tone(ctx, haunch, (c) => c.ellipse(-1.2, -0.8, 2.3, 0.9, 0, 0, TAU), P.dogShade);
  cut(ctx, (c) => c.ellipse(0.3, -0.4, 1.4, 0.45, 0, 0, TAU), P.dogWhite, { ...o, lift: 0.2, rim: 0.3 });
  foreleg(2.3, P.dog, P.dogWhite);
  const ruff = cut(ctx, (c) => c.ellipse(2.8, -7.5, 1.5, 1.9, 0.3, 0, TAU), P.dogWhite, { ...o, lift: 0.3, rim: 0.4 });
  tone(ctx, ruff, (c) => c.ellipse(3.4, -6.6, 1.2, 1.3, 0, 0, TAU), P.dogWhiteShade);
  // Head — drawCollie's, held up and watching.
  ctx.save();
  ctx.translate(3.1, -9.5);
  ctx.rotate(tilt);
  const ho = { ...o, rot: tilt };
  cut(ctx, (c) => { c.moveTo(-1.3, -0.7); c.lineTo(-0.9, -3.1); c.lineTo(0, -1.1); c.closePath(); }, P.dogShade, { ...ho, lift: 0.3, rim: 0.35 });
  const skull = cut(ctx, (c) => {
    c.moveTo(-1.8, 0.4);
    c.quadraticCurveTo(-1.6, -1.8, 0.4, -1.6);
    c.quadraticCurveTo(1.6, -1.4, 2.2, -0.5);
    c.lineTo(3.7, -0.1);
    c.quadraticCurveTo(4.1, 0.5, 3.5, 0.9);
    c.lineTo(1.4, 1.3);
    c.quadraticCurveTo(-0.6, 1.9, -1.8, 0.4);
    c.closePath();
  }, P.dog, { ...ho, lift: 0.4, rim: 0.5 });
  tone(ctx, skull, (c) => { c.moveTo(0.3, -1.8); c.lineTo(0.9, -1.8); c.lineTo(2.3, -0.3); c.lineTo(4, 0); c.lineTo(4, 1.6); c.lineTo(1.2, 1.6); c.quadraticCurveTo(1.6, 0.2, 0.3, -1.8); c.closePath(); }, P.dogWhite);
  cut(ctx, (c) => { c.moveTo(-0.3, -1.3); c.lineTo(0.6, -3.2); c.quadraticCurveTo(1.3, -2.9, 1.2, -2.3); c.lineTo(0.9, -2.5); c.lineTo(0.9, -1.2); c.closePath(); }, P.dog, { ...ho, lift: 0.3, rim: 0.35 });
  dot(ctx, 1.2, -0.7, 0.42, P.eye);
  dot(ctx, 1.3, -0.7, 0.26, FLOCK.nose);
  dot(ctx, 3.8, 0.1, 0.4, P.nose);
  if (happy > 0.4) flat(ctx, P.tongue, (c) => c.ellipse(2.6, 1.55, 0.75, 0.38 + 0.1 * Math.sin(t * 11), 0.3, 0, TAU));
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------ the flock's choreography
// Everything here is a pure function of t, and all of it is continuous: nothing picks a
// position, a facing or a pose per time slot or on a distance threshold, so nothing can
// snap from one frame to the next.
//
// THE FLOCKS: dx from the anchor, depth px down the hill face below the crest, scale,
// facing, seed, white-faced, pose, and whether a lamb skips. Nobody turns round: a sheep
// the dog presses steps away from it, forwards or backwards, still facing its own way.
//
// A stage passes about two flocks, and they are not the same flock twice (Peter, 25 Sep
// 2026: "should there be a little variation so they don't look identical?"). They take
// turns along the stage (drawPlumberLife counts them), so neighbours always differ:
//   0 THE LAP — nine in one loose line (one lying down, two lambs); the collie laps the
//     whole flock and claps down on the front lane at the right-hand end, facing left.
//   1 THE FIGURE OF EIGHT — six in two knots of three with a gap between; the run is a
//     figure of eight round each knot and through the gap, stopping IN the gap, facing
//     the right-hand knot. Slower, and with a longer hold. Since 27 Sep 2026 it is the
//     sheep-pig's run, not the collie's: see THE SHEEP-PIG.
const FLOCK_S = 1.55;
const PIG_S = FLOCK_S * 0.72;       // the piglet: a lamb's height, three-fifths of the collie's
const FLOCK_SHEEP = [
  [
    [-50, 6, 1.0, 1, 1, false, 'stand'], [-34, 2, 0.95, 1, 2, true, 'stand'],
    [-21, 12, 1.08, -1, 3, false, 'lie'], [0, 3, 1.0, 1, 4, false, 'stand'],
    [8.5, 5, 0.62, 1, 8, false, 'lamb', true], [20, 12, 1.12, -1, 5, true, 'stand'],
    [30, 13, 0.58, -1, 9, true, 'lamb'], [40, 4, 1.0, 1, 6, false, 'stand'],
    [54, 9, 1.05, -1, 7, false, 'stand'],
  ],
  [
    [-51, 9, 1.04, 1, 11, true, 'stand'], [-41, 3.5, 0.6, 1, 12, false, 'lamb', true],
    [-27, 12.5, 1.0, -1, 13, false, 'stand'],
    [27, 6, 1.0, 1, 14, false, 'stand'], [49, 4, 0.97, -1, 15, true, 'stand'],
    [42, 13, 1.1, -1, 16, false, 'stand'],
  ],
];
// THE COLLIE'S RUNS. Distance along a run is GROUND px — a px of depth counts DOG_M — so
// a turn is a true curve on the ground and the gait keeps one cadence all the way round.
// `head` is the x part of the unit tangent; the dog never follows it into a squeeze (see
// THE PACE for how it turns round).
const DOG_M = 2;
const DOG_BACK = 0.6;                              // the crest lane, feet just under the line
const DOG_FRONT_GROUND = 36;                       // back lane to front lane, ground px
const DOG_FRONT = DOG_BACK + DOG_FRONT_GROUND / DOG_M;   // 18.6, the lane in front of the flock
// THE LAP, round the flock, not through it: along the crest BEHIND the sheep running
// right, round the right-hand end and down the face, along the face IN FRONT of them
// running left, and back up round the left-hand end.
const DOG_R = DOG_FRONT_GROUND / 2;                // the turns' ground radius
const DOG_MID = DOG_BACK + DOG_R / DOG_M;          // 9.6, each turn's apex
const DOG_XR = 46.5, DOG_XL = -46.5;               // where the turns begin (ink stays in ±75)
const DOG_STRAIGHT = DOG_XR - DOG_XL;
const DOG_TURN = Math.PI * DOG_R;
const LAP = {
  length: 2 * DOG_STRAIGHT + 2 * DOG_TURN,
  at(u) {
    u = ((u % this.length) + this.length) % this.length;
    if (u < DOG_STRAIGHT) return { x: DOG_XL + u, depth: DOG_BACK, head: 1 };
    u -= DOG_STRAIGHT;
    if (u < DOG_TURN) {
      const a = u / DOG_R;
      return { x: DOG_XR + DOG_R * Math.sin(a), depth: DOG_MID - (DOG_R / DOG_M) * Math.cos(a), head: Math.cos(a) };
    }
    u -= DOG_TURN;
    if (u < DOG_STRAIGHT) return { x: DOG_XR - u, depth: DOG_FRONT, head: -1 };
    const a = (u - DOG_STRAIGHT) / DOG_R;
    return { x: DOG_XL - DOG_R * Math.sin(a), depth: DOG_MID + (DOG_R / DOG_M) * Math.cos(a), head: -Math.cos(a) };
  },
};
// It stops at the apex of each end, turns there, and at the right-hand end holds the eye.
LAP.stops = [
  { at: DOG_STRAIGHT + DOG_TURN / 2, hold: 1.5 },
  { at: 2 * DOG_STRAIGHT + 1.5 * DOG_TURN, hold: 0.55 },
];
// Any closed curve θ -> ground (X, Z), tabled by arc length so it runs at a true speed.
// Position and heading are both interpolated, so neither steps between samples.
function tabledRun(curve, n = 720) {
  const pts = [], cum = [0];
  for (let i = 0; i < n; i++) pts.push(curve((i / n) * TAU));
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1], b = pts[i % n];
    cum.push(cum[i - 1] + Math.hypot(b.X - a.X, b.Z - a.Z));
  }
  const heads = pts.map((_, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    return (b.X - a.X) / Math.hypot(b.X - a.X, b.Z - a.Z);
  });
  const length = cum[n];
  return {
    length,
    arcAt: (theta) => cum[Math.round((((theta / TAU) % 1) + 1) % 1 * n)],
    at(u) {
      u = ((u % length) + length) % length;
      let lo = 0, hi = n;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= u) lo = mid; else hi = mid; }
      const k = (u - cum[lo]) / (cum[lo + 1] - cum[lo]);
      const a = pts[lo], b = pts[(lo + 1) % n];
      return { x: lerp(a.X, b.X, k), depth: lerp(a.Z, b.Z, k) / DOG_M,
        head: lerp(heads[lo], heads[(lo + 1) % n], k) };
    },
  };
}
// THE FIGURE OF EIGHT (a lemniscate of Gerono): one loop round each knot of sheep, the
// two crossing in the gap between them on a diagonal, never head-on to the viewer. It
// spans the same lanes as the lap (crest lane to front lane) and x ±60.
const EIGHT_X = 60, EIGHT_ZC = DOG_BACK * DOG_M + DOG_FRONT_GROUND / 2, EIGHT_Z = DOG_FRONT_GROUND / 2;
const EIGHT = tabledRun((th) => ({ X: EIGHT_X * Math.cos(th), Z: EIGHT_ZC + EIGHT_Z * Math.sin(2 * th) }));
// It turns at the far end of each loop and holds the eye in the gap, facing right.
EIGHT.stops = [
  { at: EIGHT.arcAt(0), hold: 0.55 },
  { at: EIGHT.arcAt(Math.PI), hold: 0.55 },
  { at: EIGHT.arcAt(1.5 * Math.PI), hold: 1.8 },
];
// THE PACE, and how it turns round. The dog runs from stop to stop: it springs away,
// gallops, and slows into the next stop, dropping into its crouch as it does. Every
// change of speed is eased, and the legs are driven by the distance run (DOG_STRIDE a
// stride), so the feet never skate. Between stops it faces the way that leg runs, always
// at full width: a cut-out squeezed through edge-on reads as a card spun round in 3D
// (Peter, 25 Sep 2026: "it looks like just a 180 3d spin"). Where the next leg runs the
// other way it turns the 2D way, standing still: a quick hop from the crouch, mirrored
// at the top of it, down facing back. A leg too short to reach the gallop peaks lower.
const DOG_V = 46;                                  // the lap's gallop, ground px/s
const DOG_STRIDE = 18;                             // ground px per gallop stride
const DOG_ACCEL = 0.9, DOG_DECEL = 1.0;            // s to spring up to speed / slow to a stop
const HOP_AT = 0.1, HOP_D = 0.3, HOP_H = 3.2;      // the turning hop: start, length (s), px
function dogPace(run, v, stops) {
  const n = stops.length;
  const legs = stops.map((st, i) => ((stops[(i + 1) % n].at - st.at) % run.length + run.length) % run.length || run.length);
  const faces = stops.map((st, i) => (run.at(st.at + legs[i] / 2).head < 0 ? -1 : 1));
  const pace = [];
  let t0 = 0, s0 = 0;
  const push = (d, v0, v1, extra) => {
    pace.push({ t0, d, s0, v0, v1, ...extra });
    t0 += d; s0 += d * (v0 + v1) * 0.5;
  };
  stops.forEach((st, i) => {
    const L = legs[i], ramp = (DOG_ACCEL + DOG_DECEL) / 2;
    const vp = Math.min(v, L / ramp);
    const faceIn = faces[(i + n - 1) % n], face = faces[i];
    push(st.hold, 0, 0, { face, faceIn, hold: true });
    push(DOG_ACCEL, 0, vp, { face });
    push((L - ramp * vp) / vp, vp, vp, { face });
    push(DOG_DECEL, vp, 0, { face });
  });
  return { run, v, pace, period: t0, start: stops[0].at };
}
const FLOCK_DOGS = [dogPace(LAP, DOG_V, LAP.stops), dogPace(EIGHT, 40, EIGHT.stops)];
function dogAt(t, D) {
  const lap = Math.floor(t / D.period);
  const u = t - lap * D.period;
  let g = D.pace[D.pace.length - 1];
  for (const seg of D.pace) if (u < seg.t0 + seg.d) { g = seg; break; }
  const k = clamp01((u - g.t0) / (g.d || 1));
  // Speed eases along smoothstep, so distance is its integral, k^3 - k^4/2.
  const along = g.s0 + g.v0 * (u - g.t0) + (g.v1 - g.v0) * g.d * (k * k * k - (k * k * k * k) / 2);
  const p = D.run.at(D.start + along);
  let face = g.face, hop = 0;
  if (g.hold && g.faceIn !== g.face) {
    const h = (u - g.t0 - HOP_AT) / HOP_D;
    if (h < 0.5) face = g.faceIn;
    if (h > 0 && h < 1) hop = Math.sin(h * Math.PI);
  }
  return { x: p.x, depth: p.depth, face, hop, speed: g.v0 + (g.v1 - g.v0) * smooth(k),
    run: ((lap * D.run.length + along) / DOG_STRIDE) * TAU };
}
// THE FLOCK'S ANSWER. Each sheep is shoved away from the dog (in the same ground
// metric) and watches it, read off where the dog was over the last seconds and where
// it is about to be: a weighted sum over fixed time offsets, so it is as smooth as the
// run itself. They start to move as it comes, and drift back after it has gone.
const REACT_DT = 0.1, REACT_FROM = -0.4, REACT_N = 31;   // offsets -0.4 .. 2.6 s
const reactKernel = (tail) => {
  const w = [];
  for (let j = 0; j < REACT_N; j++) {
    const lag = REACT_FROM + j * REACT_DT;
    w.push(lag < 0 ? smooth(1 + lag / -REACT_FROM) : Math.exp(-lag / tail));
  }
  const sum = w.reduce((a, v) => a + v, 0);
  return w.map((v) => v / sum);
};
const SHOVE_W = reactKernel(0.6);    // the shove eases off over a second or so
const ALERT_W = reactKernel(1.1);    // they keep watching for a couple
// Peter, 25 Sep 2026: "the sheep could move a little bit more" — a shove of up to 20 px
// felt from 38 ground px (was 12 from 30), and a grazing shuffle between visits.
const SHOVE = 20, SHOVE_R = 38, ALERT_R = 38, ALERT_GAIN = 2.4;
// THE SHUFFLE: a grazing sheep steps forward a pace or two to fresh grass, and later
// backs up as many; the rest of its own clock it stands. Each step is one smooth pace.
const SHUFFLE_STEP = 2.2, SHUFFLE_DUR = 0.4, SHUFFLE_GAP = 0.55;
function shuffleAt(t, seed) {
  const P = 10 + (seed % 5) * 1.3;
  const u = ((t + seed * 2.9) % P + P) % P;
  const n = 1 + (seed % 2);
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += smooth((u - 1 - i * SHUFFLE_GAP) / SHUFFLE_DUR);
    s -= smooth((u - P * 0.55 - i * SHUFFLE_GAP) / SHUFFLE_DUR);
  }
  return s * SHUFFLE_STEP;
}
// Nobody is shoved over the crest into the sky: depth eases to a floor of 0.8.
const floorDepth = (d) => (d >= 2 ? d : 2 - 1.2 * (1 - Math.exp((d - 2) / 1.2)));
// THE SHEEP-PIG. On the figure of eight the run is the piglet's: he has the collie's own
// path and pace (so the flock answers him with the same sums), hops round at the loop ends
// as she did, and at each stop stands square and asks, with a bob of the head, rather than
// giving the eye. She sits up on the crest in the gap, against the sky, and watches him:
// she hops round to face whichever side he is on, a beat late, and when he stops to ask
// she wags, pants and lifts her nose. Running, she is intent: mouth shut, a slow sweep of
// the tail, her head pitched down to follow him down the face. (Peter, 27 Sep 2026, on the
// bake-off: "I don't notice the dog watching" — she lay in her working crouch at first.)
const PIG_FLY = { x: 3, depth: 0.8 };
const WATCH_LAG = 0.45, WATCH_WIN = 0.32, WATCH_N = 24, FLY_HOP = 2;
// Which side of `x` the run is on, a beat late, read off a window of lagged samples so it
// is a pure function of t; a crossing is a hop round, mirrored at the top of it.
function turnToward(td, D, x, hop) {
  const side = (tt) => (dogAt(tt, D).x - x < 0 ? -1 : 1);
  let pos = 0;
  for (let k = 0; k < WATCH_N; k++) if (side(td - WATCH_LAG - WATCH_WIN / 2 + (k * WATCH_WIN) / (WATCH_N - 1)) > 0) pos++;
  const now = side(td - WATCH_LAG + WATCH_WIN / 2);
  const k = (now > 0 ? pos : WATCH_N - pos) / WATCH_N;
  const turning = pos > 0 && pos < WATCH_N;
  return { face: turning && k < 0.5 ? -now : now, lift: turning ? Math.sin(Math.PI * k) * hop : 0 };
}
function sheepPigState(td, D, d) {
  const still = smooth(1 - d.speed / (0.5 * D.v));
  const pig = { run: ((d.run / TAU) * DOG_STRIDE / PIG_STRIDE) * TAU, gait: smooth(d.speed / 12) * (1 - d.hop),
    nod: still * (1 - d.hop), perk: still, lift: d.hop * PIG_HOP };
  const seen = dogAt(td - 0.25, D);
  const happy = smooth(1 - seen.speed / (0.5 * D.v)) * (1 - seen.hop);
  const fly = { x: PIG_FLY.x, depth: PIG_FLY.depth, ...turnToward(td, D, PIG_FLY.x, FLY_HOP), happy,
    tilt: 0.14 * clamp01((seen.depth - PIG_FLY.depth) / 18) - 0.12 * happy };
  return { pig, fly };
}
/**
 * Flock `variant` (0 the lap, 1 the figure of eight) and its dog at time t, in the
 * flock's frame: x from the anchor, depth px below the crest where each stands. Pure;
 * drawPlumberSheep draws exactly this. `dog` is the run the sheep answer; on the figure of
 * eight that is the piglet (`pig` his pose), and `fly` is the collie sat watching.
 */
export function plumberFlockState(t, variant = 0) {
  const v = variant ? 1 : 0;
  const D = FLOCK_DOGS[v];
  const td = t + v * 3.7;                          // the two dogs are never in step
  const dogs = [];
  for (let j = 0; j <= REACT_N; j++) dogs.push(dogAt(td - REACT_FROM - j * REACT_DT, D));
  const d = dogAt(td, D);
  const dog = {
    x: d.x, depth: d.depth, run: d.run, face: d.face, lift: d.hop * HOP_H,
    // Low at a stop; it straightens a little in the air as it hops round.
    crouch: smooth(1 - d.speed / (0.75 * D.v)) * (1 - 0.55 * d.hop),
  };
  const sheep = FLOCK_SHEEP[v].map(([bx, bd, s, dir, seed, wf, pose, skips]) => {
    const lying = pose === 'lie', sc = s * FLOCK_S;
    // (px, pz) the shove now, (qx, qz) a tick ago — the same sums one sample along.
    let px = 0, pz = 0, qx = 0, qz = 0, seen = 0;
    for (let j = 0; j <= REACT_N; j++) {
      const q = dogs[j];
      const dx = bx - q.x, dz = (bd - q.depth) * DOG_M;
      const dist = Math.max(0.5, Math.hypot(dx, dz));
      const f = SHOVE * smooth(1 - dist / SHOVE_R) / dist;
      const sx = f * dx, sz = (f * dz) / DOG_M;
      if (j < REACT_N) {
        px += SHOVE_W[j] * sx; pz += SHOVE_W[j] * sz;
        // Seen from anywhere, it lifts the head — which stays side-on: no sheep turns its
        // face to the viewer (Peter: no head turns to camera).
        seen += ALERT_W[j] * smooth(1 - dist / ALERT_R);
      }
      if (j > 0) { qx += SHOVE_W[j - 1] * sx; qz += SHOVE_W[j - 1] * sz; }
    }
    if (lying) { px = pz = qx = qz = 0; }
    const alert = smooth(seen * ALERT_GAIN);
    const grazing = smooth((Math.sin(t * 0.55 + seed * 1.9) + 0.35) * 1.6);
    if (!lying && !skips) { px += dir * shuffleAt(t, seed); qx += dir * shuffleAt(t - REACT_DT, seed); }
    // The legs walk the distance it has moved (a stride is 4.8 of its own units), and
    // swing only while it is on the move.
    const pace = Math.hypot(px - qx, (pz - qz) * DOG_M) / REACT_DT;
    let sw = smooth(pace / 5) * Math.sin(((px * dir + pz * DOG_M) / (4.8 * sc)) * TAU + seed);
    // A skipping lamb bounds beside its mother now and then, its legs going only while
    // it does.
    let hop = 0;
    if (skips) {
      const hp = (((t * 0.9 + seed * 0.37) % 2.6) + 2.6) % 2.6;
      if (hp < 0.7) {
        hop = Math.abs(Math.sin((hp / 0.7) * TAU)) * 1.6;
        sw = lerp(sw, Math.sin(t * 10), Math.sin((hp / 0.7) * Math.PI));
      }
    }
    return { x: bx + px, depth: floorDepth(bd + pz), order: bd, s: sc, dir, pose, seed, whiteFace: wf,
      graze: lying ? 0 : grazing * (1 - alert), sw, hop };
  });
  return v ? { dog, sheep, ...sheepPigState(td, D, d) } : { dog, sheep };
}
/**
 * SHEEP AND A WORKING COLLIE, two ways (`variant`, see FLOCK_SHEEP). Sheep over a near
 * summit — grazing head-down or head-up chewing on their own clocks, shuffling a pace or
 * two to fresh grass, a lamb skipping at its mother's side — and a collie working round
 * them, dropping into a crouch to give the flock the eye before it dashes off again.
 * Variant 0: nine sheep, one lying down, and a collie that laps the whole flock. Variant
 * 1: six in two knots, a Babe piglet running a figure of eight round and between them, and
 * the brown collie sat up on the crest watching him.
 * Sheep the dog comes near lift their heads to watch it, and those it passes close step
 * away from it and drift back once it has gone. See plumberFlockState for the motion.
 * Everyone stands on `seat.near` where they are.
 * Anchor `x` = the group's centre, on or just beside a NEAR-ridge summit. Ink extent
 * around x: -75..+75; in y, from 22 above the crest where each stands to 20 below it.
 */
export function drawPlumberSheep(ctx, t, x, seat, paper = true, variant = 0) {
  ctx.save();
  withFinish(paper, () => {
    const { dog, sheep, pig, fly } = plumberFlockState(t, variant);
    const items = sheep.map((q) => {
      const sx = x + q.x;
      return { order: q.order, draw: () => drawSheep(ctx, sx, seat.near(sx) + q.depth, q.s, q.dir, q.pose, q.graze, q.sw, 0, t, q.seed, q.whiteFace, q.hop) };
    });
    const dx = x + dog.x;
    if (pig) {
      const fx = x + fly.x;
      items.push({ order: dog.depth, draw: () => drawPiglet(ctx, dx, seat.near(dx) + dog.depth, PIG_S, dog.face, { ...pig, t, seed: 3 }) });
      items.push({ order: fly.depth, draw: () => drawSeatedCollie(ctx, fx, seat.near(fx) + fly.depth, FLOCK_S * 1.05, fly.face, { ...fly, t }) });
    } else {
      items.push({ order: dog.depth, draw: () => drawCollie(ctx, dx, seat.near(dx) + dog.depth, FLOCK_S * 1.05, dog.face, dog.run, dog.crouch, dog.lift, COLLIE_COATS[0]) });
    }
    // Sheep keep their places in the queue as they are shoved (so two never swap over);
    // the dog files in by its own depth.
    items.sort((a, b) => a.order - b.order);
    for (const it of items) it.draw();
  });
  ctx.restore();
}
// The flock's own parts, for bake-offs that add to it (src/dev/pig-flock-candidates.js)
// without retyping the paper cutout, the sheep, the collie or the runs. Read-only; the
// game draws through drawPlumberSheep alone.
export const PLUMBER_FLOCK_KIT = {
  withFinish, cut, tone, line, flat, dot, FLOCK, COLLIE_COATS, FLOCK_S, FLOCK_DOGS, EIGHT, LAP,
  drawSheep, drawCollie, drawPiglet, drawSeatedCollie, turnToward, PIG_S, PIG_STRIDE, PIG_HOP,
  dogAt, floorDepth, DOG_M, DOG_STRIDE, SHOVE, SHOVE_R, SHOVE_W, ALERT_W,
  ALERT_R, ALERT_GAIN, REACT_N, REACT_DT, REACT_FROM,
};

// ====================================================================== the patchwork
const PATCH = {
  hedge: '#4f7f47', hedgeFar: '#6a9660', tree: '#4a7a44', treeLight: '#65955a', treeFar: '#6f9a66',
  house: '#efe7d6', roof: '#b36e5e', barn: '#b5524a', shadow: 'rgba(36,70,46,0.17)', plough: '#9a7652',
};
const PATCH_P = 480;
// The bands are authored in y RELATIVE TO THE NEAR RIDGE'S SUMMIT LINE (landscape: screen
// y 164). Their sheets run down to PATCH_BOT below it, well under the near valleys.
const PATCH_BOT = 86;
const PATCH_LAYERS = [
  { f: 0.18, base: -14, waves: [[2, 7, 0.4], [3, 4, 2.2], [7, 1.6, 4]], rows: [0, 13, 34], cols: 9, seed: 11,
    colors: ['#9cc27a', '#b8cd8a', '#cfc998', '#c2ae88', '#a9c784', '#d4cda2', '#8fb974'], hedge: '#6a9660', tree: '#6f9a66' },
  { f: 0.24, base: 0, waves: [[2, 8, 2.6], [5, 3.5, 0.9], [9, 1.4, 3.3]], rows: [0, 11, 27, 60], cols: 8, seed: 29,
    colors: ['#7fb565', '#a5c774', '#d6c47c', '#b89a6a', '#8cbd6a', '#e0cf8a', '#6fa85c', '#c9ad78'], hedge: '#4f7f47', tree: '#4a7a44' },
];
const layerCrest = (L, u) => {
  let y = L.base;
  for (const [cyc, amp, ph] of L.waves) y -= amp * Math.sin((cyc * TAU * u) / PATCH_P + ph);
  return y;
};
const layerRowY = (L, u, r) => layerCrest(L, u) + L.rows[r] * (1 + (r ? 0.18 * Math.sin((3 * TAU * u) / PATCH_P + r * 1.7 + L.seed) : 0));
// Column boundaries run down the fall line, each leaning its own way.
const layerCol = (L, j) => {
  const jj = ((j % L.cols) + L.cols) % L.cols;
  const wrap = Math.floor(j / L.cols) * PATCH_P;
  return { u: wrap + (jj + 0.5) * (PATCH_P / L.cols) + (hash(jj * 3.7 + L.seed) - 0.5) * 26, lean: (hash(jj * 5.3 + L.seed + 1) - 0.5) * 1.1 };
};
const colX = (L, j, depth) => { const c = layerCol(L, j); return c.u + c.lean * depth; };
function patchLayerTile(ctx, L, far) {
  const band = pathOf((c) => {
    c.moveTo(-14, PATCH_BOT);
    for (let u = -14; u <= PATCH_P + 14; u += 3) c.lineTo(u, layerCrest(L, u));
    c.lineTo(PATCH_P + 14, PATCH_BOT); c.closePath();
  });
  // The sheet's own lift, drawn without its end caps so the tile has no seam.
  cut(ctx, band, L.colors[0], { lift: far ? 0.9 : 1.3, rim: false });
  ctx.save();
  ctx.clip(band);
  const nr = L.rows.length;
  for (let r = 0; r < nr; r++) {
    const d0 = L.rows[r], d1 = r + 1 < nr ? L.rows[r + 1] : 120;
    for (let j = -2; j <= L.cols + 1; j++) {
      const jj = ((j % L.cols) + L.cols) % L.cols;
      const pick = Math.floor(hash(jj * 31 + r * 7 + L.seed) * L.colors.length);
      const alt = (jj + r) % 2 ? L.colors[pick] : L.colors[(pick + 3) % L.colors.length];
      ctx.fillStyle = alt;
      ctx.beginPath();
      const a0 = colX(L, j, d0), b0 = colX(L, j + 1, d0);
      ctx.moveTo(a0, layerRowY(L, a0, r));
      for (let u = a0; u <= b0; u += 3) ctx.lineTo(u, layerRowY(L, u, r));
      ctx.lineTo(b0, layerRowY(L, b0, r));
      if (r + 1 < nr) {
        const a1 = colX(L, j, d1), b1 = colX(L, j + 1, d1);
        ctx.lineTo(b1, layerRowY(L, b1, r + 1));
        for (let u = b1; u >= a1; u -= 3) ctx.lineTo(u, layerRowY(L, u, r + 1));
        ctx.lineTo(a1, layerRowY(L, a1, r + 1));
      } else {
        ctx.lineTo(colX(L, j + 1, 120), PATCH_BOT + 10); ctx.lineTo(colX(L, j, 120), PATCH_BOT + 10);
      }
      ctx.closePath();
      ctx.fill();
      // Crop rows along the slope in about half the fields, ploughed furrows in the browns.
      if (hash(jj * 13.1 + r * 5.3 + L.seed) > 0.45) {
        ctx.save();
        ctx.clip();
        const mid = (a0 + b0) / 2;
        line(ctx, far ? 'rgba(90,110,60,0.14)' : 'rgba(80,96,50,0.2)', 0.45, (c) => {
          for (let q = 2.4; q < (d1 - d0) + 2; q += 2.4) {
            c.moveTo(a0 - 20, layerRowY(L, a0, r) + q);
            for (let u = a0 - 20; u <= b0 + 20; u += 4) c.lineTo(u, layerRowY(L, u, r) + q + (u - mid) * 0.04);
          }
        });
        ctx.restore();
      }
    }
  }
  const pat = grain(ctx);
  if (pat) { ctx.fillStyle = pat; ctx.fill(band); }
  // Hedgerows: along every contour boundary and down every column boundary.
  const hw = far ? 1 : 1.35;
  line(ctx, L.hedge, hw, (c) => {
    for (let r = 1; r < nr; r++) { c.moveTo(-14, layerRowY(L, -14, r)); for (let u = -14; u <= PATCH_P + 14; u += 3) c.lineTo(u, layerRowY(L, u, r)); }
    for (let j = -2; j <= L.cols + 2; j++) {
      c.moveTo(colX(L, j, 0), layerCrest(L, colX(L, j, 0)) + 0.4);
      for (let d = 3; d <= 120; d += 3) c.lineTo(colX(L, j, d), layerCrest(L, colX(L, j, d)) + d);
    }
  });
  // Round trees along the hedges, bigger in the nearer band.
  for (let j = -2; j <= L.cols + 1; j++) {
    for (let r = 0; r < nr; r++) {
      if (hash(j * 7.7 + r * 3.1 + L.seed) < 0.4) continue;
      const d = L.rows[r] + (r + 1 < nr ? (L.rows[r + 1] - L.rows[r]) * hash(j * 2.3 + r) : 10);
      const u = colX(L, j, d), y = layerCrest(L, u) + d * (1 + (r ? 0 : 0));
      const tr = (far ? 1.5 : 2.1) + (r * 0.35);
      dot(ctx, u, y - tr * 0.7, tr, L.tree);
      dot(ctx, u - tr * 0.35, y - tr, tr * 0.5, far ? PATCH.treeFar : PATCH.treeLight);
    }
  }
  // A farmstead in the nearer band.
  if (!far) {
    const fu = colX(L, 3, 16) + 14, fy = layerRowY(L, fu, 1) + 6;
    cut(ctx, (c) => c.rect(fu, fy - 3.4, 5.4, 3.4), PATCH.house, { lift: 0.4, rim: 0.4 });
    cut(ctx, (c) => { c.moveTo(fu - 0.7, fy - 3.4); c.lineTo(fu + 2.7, fy - 5.8); c.lineTo(fu + 6.1, fy - 3.4); c.closePath(); }, PATCH.roof, { lift: 0.4, rim: 0.4 });
    cut(ctx, (c) => { c.rect(fu + 6.8, fy - 4, 5, 4); }, PATCH.barn, { lift: 0.4, rim: 0.4 });
    cut(ctx, (c) => { c.moveTo(fu + 6.4, fy - 4); c.lineTo(fu + 9.3, fy - 6); c.lineTo(fu + 12.2, fy - 4); c.closePath(); }, '#6c5b55', { lift: 0.3, rim: 0.3 });
    dot(ctx, fu + 15, fy - 2.4, 2.4, PATCH.tree);
  }
  ctx.restore();
  // The crest gets the paper's white rim, and only the crest, so the tile never seams.
  if (PAPER) line(ctx, RIM, 1.15, (c) => { c.moveTo(-14, layerCrest(L, -14)); for (let u = -14; u <= PATCH_P + 14; u += 3) c.lineTo(u, layerCrest(L, u)); });
}
// The plough: a tiny tractor turning one field brown a furrow at a time, gulls after it.
function ploughAndGulls(ctx, t, L) {
  const j = 5, r = 1;
  const d0 = L.rows[r], d1 = L.rows[r + 1];
  const k = (t % 12) / 12;
  const ua = colX(L, j, (d0 + d1) / 2) + 2, ub = colX(L, j + 1, (d0 + d1) / 2) - 2;
  const ux = lerp(ua, ub, k);
  const top = (u) => layerRowY(L, u, r) + 1, mid = (u) => lerp(layerRowY(L, u, r), layerRowY(L, u, r + 1), 0.55);
  flat(ctx, PATCH.plough, (c) => { c.moveTo(ua, top(ua)); for (let u = ua; u <= ux; u += 2) c.lineTo(u, top(u)); c.lineTo(ux, mid(ux)); for (let u = ux; u >= ua; u -= 2) c.lineTo(u, mid(u)); c.closePath(); });
  line(ctx, 'rgba(90,60,36,0.45)', 0.35, (c) => { for (let q = 0.3; q < 1; q += 0.3) { c.moveTo(ua, lerp(top(ua), mid(ua), q)); for (let u = ua; u <= ux; u += 3) c.lineTo(u, lerp(top(u), mid(u), q)); } });
  const ty = mid(ux) - 0.5;
  cut(ctx, (c) => rr(c, ux - 1.5, ty - 2.7, 3.2, 2.2, 0.5), '#c8473b', { lift: 0.3, rim: 0.35 });
  dot(ctx, ux - 0.7, ty - 0.3, 0.9, '#3a3632');
  dot(ctx, ux + 1.2, ty - 0.1, 0.55, '#3a3632');
  for (let q = 0; q < 3; q++) {
    const a = ((t * 1.5 + q / 3) % 1);
    dot(ctx, ux - 2.2 - a * 6, ty - 1 - a * 2.4, 0.6 + a, `rgba(200,180,140,${0.5 * (1 - a)})`);
  }
  // Gulls following the plough, as gulls do.
  for (let q = 0; q < 3; q++) {
    const gx = ux - 4 - q * 3.5 + Math.sin(t * 1.3 + q * 2) * 2, gy = ty - 6 - q * 1.5 + Math.cos(t * 1.7 + q) * 1.2;
    const fl = Math.sin(t * 9 + q * 1.7) * 0.9;
    line(ctx, '#f4f2ec', 0.5, (c) => { c.moveTo(gx - 1.6, gy - 0.3 + fl * 0.4); c.quadraticCurveTo(gx - 0.8, gy - 0.9 - fl, gx, gy); c.quadraticCurveTo(gx + 0.8, gy - 0.9 - fl, gx + 1.6, gy - 0.3 + fl * 0.4); });
  }
}

/**
 * PATCHWORK FIELDS. The farmland under the far range: two rolling bands of foothills,
 * quilted into fields and stitched by hedgerows with trees, a farmstead in one; cloud
 * shadows slide over them and a tiny tractor ploughs one field with gulls behind it.
 * The bands parallax at 0.18 and 0.24 of camX (× ZOOM, like every pack layer) and are
 * drawn across the whole visible coverage — they are a band, not a point.
 *
 * Their height hangs off the near ridge's SUMMIT LINE, `opts.nearTop` (the near ridge's
 * base y minus its amplitude — landscape 164); without it the line is found by sampling
 * `seat.near` across the view. They are clipped to the sky side of `seat.near`, so they
 * sit behind the near hills wherever they are drawn. Drawn INSIDE the pack between the
 * far range and the near hills, the near layer's own trees and flowers then land in
 * front of them for free; drawn after the whole backdrop, the near crest's trees and
 * flowers are covered and need redrawing on top (see the note in the report — that
 * redraw needs the pack's own scenery placements, so it is not in here).
 *
 * `alpha` 0..1 fades the whole piece (the bands are clipped so they never double up).
 * opts.heightAt(band, x) 0..1: a height field over the picture — the land ramps up across it.
 * opts.view = { left, width } of the picture in the ctx's coordinates (default 0..W).
 * Ink extent: the full view width, y from nearTop - 40 to nearTop + 96.
 */
export function drawPlumberPatchwork(ctx, t, camX, seat, paper = true, alpha = 1, opts = {}) {
  if (!(alpha > 0)) return;
  ctx.save();
  withFinish(paper, () => {
    const view = opts.view || { left: 0, width: W };
    const xl = view.left - 20, xr = view.left + view.width + 20;
    let top = opts.nearTop;
    if (!Number.isFinite(top)) {
      top = Infinity;
      for (let x = xl; x <= xr; x += 2) top = Math.min(top, seat.near(x));
    }
    ctx.globalAlpha *= Math.min(1, alpha);
    const fading = alpha < 1;
    const offOf = (f) => ((camX * f * ZOOM % PATCH_P) + PATCH_P) % PATCH_P;
    // One band into `g`, in the piece's local coordinates (y 0 = the near summit line).
    // `shadows` lays the sliding cloud shadows over it — they belong on top of both
    // bands, so they ride with whichever band is painted last.
    const paintBand = (g, li, shadows) => {
      if (li < 0) { paintShadows(g); return; }
      const L = PATCH_LAYERS[li];
      const off = offOf(L.f);
      g.save();
      if (fading && li === 0) {
        // Faded, the back band must not show through the front one.
        const L1 = PATCH_LAYERS[1], off1 = offOf(L1.f);
        g.beginPath();
        g.moveTo(xl, -400);
        g.lineTo(xr, -400);
        for (let x = xr; x >= xl; x -= 3) g.lineTo(x, layerCrest(L1, x + off1));
        g.closePath();
        g.clip();
      }
      for (let n = Math.floor((xl + off) / PATCH_P) - 1; n <= Math.floor((xr + off) / PATCH_P) + 1; n++) {
        const x0 = -off + n * PATCH_P;
        if (x0 > xr || x0 + PATCH_P < xl) continue;
        g.save();
        g.translate(x0, 0);
        if (fading) { g.beginPath(); g.rect(0, -400, PATCH_P, 800); g.clip(); }
        baked(g, 'patch' + li, -2, L.base - 26, PATCH_P + 4, PATCH_BOT - (L.base - 26), (b) => {
          b.save();
          b.beginPath(); b.rect(-2, L.base - 40, PATCH_P + 4, 300); b.clip();
          patchLayerTile(b, L, li === 0);
          b.restore();
        });
        if (li === 1) ploughAndGulls(g, t, L);
        g.restore();
      }
      g.restore();
      if (shadows) paintShadows(g);
    };
    // Cloud shadows sliding over both bands on the wind, confined to the land below the
    // back band's crest.
    const paintShadows = (g) => {
      const off0 = offOf(0.18);
      g.save();
      g.beginPath();
      g.moveTo(xl, PATCH_BOT + 10);
      for (let x = xl; x <= xr; x += 4) g.lineTo(x, layerCrest(PATCH_LAYERS[0], x + off0));
      g.lineTo(xr, PATCH_BOT + 10);
      g.closePath();
      g.clip();
      const span = Math.max(720, view.width + 240);
      for (const [base, w, h, y, sp] of [[60, 80, 10, -4, 9], [330, 100, 12, 8, 7], [560, 70, 9, -8, 11]]) {
        const cx = view.left + ((base + t * sp - camX * 0.21 * ZOOM) % span + span) % span - 120;
        flat(g, PATCH.shadow, (c) => { c.ellipse(cx, y, w * 0.5, h * 0.5, 0, 0, TAU); c.moveTo(cx + w * 0.6, y + 2); c.ellipse(cx + w * 0.3, y + 2, w * 0.3, h * 0.4, 0, 0, TAU); });
      }
      g.restore();
    };

    clipAbove(ctx, seat.near, xl, xr, 0);
    ctx.translate(0, top);

    // opts.heightAt(li, x) -> 0..1: THE LAND ITSELF RAMPS UP. A height field over the
    // picture, one per band and anchored in that band's own parallax plane, so it is
    // geography rather than animation: a field never changes height while you watch it,
    // you just travel onto higher ground and the quilt comes up over the near hills.
    // Each band is painted whole into a scratch canvas and put back in thin vertical
    // strips, each scaled in height about the FOOT — the deepest point of the near crest
    // across the view — so the base of the land never lifts off what it sits behind.
    const heightAt = typeof opts.heightAt === 'function' ? opts.heightAt : null;
    let ramped = false;
    if (heightAt) {
      for (let x = xl; x <= xr && !ramped; x += 8) {
        if (heightAt(0, x) < 1 || heightAt(1, x) < 1) ramped = true;
      }
    }
    // No real canvas (the headless test harness hands the pack a stub with no
    // transform and no document): the ramp cannot be composited, so paint flat.
    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
    if (!ramped || !m || typeof document === 'undefined') {
      paintBand(ctx, 0, false);
      paintBand(ctx, 1, true);
      return;
    }
    let foot = -Infinity;
    for (let x = xl; x <= xr; x += 2) foot = Math.max(foot, seat.near(x) - top);
    const Y0 = -70, Y1 = PATCH_BOT + 20;         // the piece's full ink, local
    const sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
    const cw = Math.max(1, Math.ceil((xr - xl) * sx)), ch = Math.max(1, Math.ceil((Y1 - Y0) * sy));
    const STRIP = 3;
    // Three passes: the back band, the front band, then the cloud shadows on their own —
    // at the BACK band's height, because the back crest is their outline. Riding with
    // the front band, which stands taller on the slope, they came loose into the sky.
    const PASSES = [[0, 0], [1, 1], [-1, 0]];     // [what to paint, whose height]
    for (let pi = 0; pi < PASSES.length; pi++) {
      const [li, hk] = PASSES[pi];
      const cv = patchScratch(pi, cw, ch);
      if (!cv) return;
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cw, ch);
      g.setTransform(sx, 0, 0, sy, -xl * sx, -Y0 * sy);
      paintBand(g, li, false);
      // Back into the picture. Full-height runs go back in one piece; only the slope
      // itself is cut into strips.
      let runX = null;
      const flush = (x) => {
        if (runX == null) return;
        const a = Math.round((runX - xl) * sx), b = Math.round((x - xl) * sx);
        if (b > a) ctx.drawImage(cv, a, 0, b - a, ch, xl + a / sx, Y0, (b - a) / sx, Y1 - Y0);
        runX = null;
      };
      // Strips abut EXACTLY, on whole device pixels. An overlap to hide seams doubled
      // every semi-transparent pixel it covered (the cloud shadows), which drew a fine
      // hatching down the slope; aligned strips have neither seams nor doubling.
      const step = Math.max(1, Math.round(STRIP * sx));   // device px per strip
      for (let px = 0; px < cw; px += step) {
        const w = Math.min(step, cw - px);
        const x = xl + px / sx, wl = w / sx;
        const k = heightAt(hk, x + wl / 2);
        if (k >= 1) { if (runX == null) runX = x; continue; }
        flush(x);
        if (!(k > 0.004)) continue;
        ctx.drawImage(cv, px, 0, w, ch, x, foot + (Y0 - foot) * k, wl, (Y1 - Y0) * k);
      }
      flush(xl + cw / sx);
    }
  });
  ctx.restore();
}
// One scratch canvas per band, reused frame to frame while the ramp is on screen.
const patchScratches = [];
function patchScratch(li, w, h) {
  if (typeof document === 'undefined') return null;
  let cv = patchScratches[li];
  if (!cv) { cv = document.createElement('canvas'); patchScratches[li] = cv; }
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
  return cv;
}
