// FROST FORTRESS's wildlife and hill dwellings (Peter, 25 Sep 2026, from the FROST
// Background V2 bake-off, src/dev/frost-background-v2.js: "those are all great fantastic -
// please incorporate into the levels but spread things across all 3... factor in it gets
// snowier later on in level 3"; "the wolves can reappear a few times like the coyote
// does"). Everything stands on the NEAR ridge, drawn inside that layer's pass after its
// snow and before its rocks and pines, so the ridge's scenery stands in front and the
// foreground hills bury what they cross — the slot the chair lift and herd use on the far
// ridge. The pack hands in the ridge's crest, colour, light and scenery (drawFrostWildlife).
//
// THE SCHEDULE is FROST_WILDLIFE below: each item once, pinned to a point in its stage,
// placed by how heavy the blizzard is there (frost-1 clear, then light; frost-2 moderate
// to heavy; frost-3 heavy and heavier). The small and pale ones come while the air is
// clear, the buildings before the storm builds, the dark and moving ones into it; the
// wolves recur once a level, the coyote's way, turned the other way each time.
//
// The finish is Frost's cut paper: flat pieces, no ink line, each over a hazy paper
// shadow a hair down and back, every colour pulled toward the stage's light — only
// emitted light (a window, a lamp) keeps its warmth at dusk.
//
// Nothing here imports stylePacks/index.js: that module imports this one.
import { ZOOM } from '../camera.js';

const TAU = Math.PI * 2;
const SHADOW = 'rgba(52,74,98,0.28)';
const fract = (v) => v - Math.floor(v);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const u = clamp01((v - a) / (b - a)); return u * u * (3 - 2 * u); };

function fill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function stroke(ctx, color, w, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
const poly = (p) => (c) => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); };
const circle = (x, y, r) => (c) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };
const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU);
const box = (x, y, w, h) => (c) => c.rect(x, y, w, h);
// The test canvas has no bezierCurveTo, roundRect or arcTo (frostLandmarks.js says the
// same), so curves are drawn from what it has: a cubic as a run of short lines from an
// explicit start point, and rounded corners as quadratics.
function cubic(c, x0, y0, x1, y1, x2, y2, x3, y3, n = 10) {
  for (let i = 1; i <= n; i++) {
    const u = i / n, v = 1 - u;
    c.lineTo(v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
      v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3);
  }
}
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.moveTo(x + k, y);
  c.lineTo(x + w - k, y); c.quadraticCurveTo(x + w, y, x + w, y + k);
  c.lineTo(x + w, y + h - k); c.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  c.lineTo(x + k, y + h); c.quadraticCurveTo(x, y + h, x, y + h - k);
  c.lineTo(x, y + k); c.quadraticCurveTo(x, y, x + k, y);
  c.closePath();
}
// A doorway: square at the foot, rounded over the top.
function arch(c, x, y, w, h, r) {
  c.moveTo(x, y + h); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h); c.closePath();
}
// A cut piece over its paper shadow (Frost's paper-shadow move), in local units.
function piece(ctx, color, path, dx = -0.35, dy = 0.45) {
  ctx.save(); ctx.translate(dx, dy); fill(ctx, SHADOW, path); ctx.restore();
  fill(ctx, color, path);
}
function strip(ctx, color, w, path, dx = -0.35, dy = 0.45) {
  ctx.save(); ctx.translate(dx, dy); stroke(ctx, SHADOW, w, path); ctx.restore();
  stroke(ctx, color, w, path);
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, k) {
  const A = rgb(a), B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
function rgba(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }
// The stage's light on a paper colour: the scenery's own tint first, then — on the far
// ridge — a little of the haze, so it sits back with that ridge.
function toner(fr) {
  const L = fr.light;
  const cache = new Map();
  return (hex) => {
    if (!L) return hex;
    let c = cache.get(hex);
    if (!c) {
      c = mix(hex, L.tint, L.tintAmount * 0.9);
      if (fr.depth === 'far') c = mix(c, L.haze, 0.18);
      cache.set(hex, c);
    }
    return c;
  };
}
const tonePal = (pal, tone) => Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, tone(v)]));
// Emitted light: day barely shows it, dusk makes it the brightest thing on the hill.
const glowGain = (fr) => ({ day: 0.45, 'low sun': 0.7, dusk: 1 })[fr.light?.name] ?? 0.6;

// ---------------------------------------------------------------- on the ridge
// Everything above the crest (plus `sink`): what stands on the ridge is cut at the snow.
function clipSky(ctx, fr, x0, x1, sink = 1.5, hides = null) {
  const hidden = hides ? (x) => hides.some(([a, b]) => x >= a && x <= b) : () => false;
  ctx.beginPath();
  ctx.moveTo(x0, -400); ctx.lineTo(x1, -400);
  for (let x = x1; x >= x0; x -= 1) ctx.lineTo(x, fr.crest(x) + (hidden(x) ? -0.6 : sink));
  ctx.closePath();
  ctx.clip();
}
// THE FOOT OF A BUILDING. It stands level at `base` (a hair into the crown of its
// summit); the hill rises to meet it — a drift of the ridge's own paper, flat against
// the foot across [x0, x1] and easing back down to the crest over `spread` either side —
// so it sits IN the top of the hill rather than on it. `groundTop(x)` is that surface.
function groundTop(fr, x0, x1, base, lip = 2.4, spread = 10) {
  return (x) => {
    const inside = x >= x0 && x <= x1 ? 1 : 1 - smooth(0, spread, x < x0 ? x0 - x : x - x1);
    // A little crowned across the foot, so the drift reads as snow and not a plinth.
    const crown = x >= x0 && x <= x1 ? 0.9 * Math.sin(Math.PI * (x - x0) / (x1 - x0)) : 0;
    const c = fr.crest(x);
    return Math.min(c, c + (base - lip - crown - c) * inside);
  };
}
function clipAbove(ctx, x0, x1, top) {
  ctx.beginPath();
  ctx.moveTo(x0, -400); ctx.lineTo(x1, -400);
  for (let x = x1; x >= x0; x -= 1) ctx.lineTo(x, top(x) + 0.6);
  ctx.closePath();
  ctx.clip();
}
function mound(ctx, fr, x0, x1, top, spread = 10) {
  const a = x0 - spread, b = x1 + spread;
  fill(ctx, fr.color, (c) => {
    c.moveTo(a, fr.crest(a) + 4);
    for (let x = a; x <= b; x += 1) c.lineTo(x, top(x));
    c.lineTo(b, fr.crest(b) + 4);
    c.closePath();
  });
  // The ridge's pale seam, along the top of the drift.
  stroke(ctx, 'rgba(255,255,255,0.45)', 0.6, (c) => {
    const m = x0 + (x1 - x0) * 0.08;
    c.moveTo(m, top(m) + 0.6);
    for (let x = m; x <= x1 - (x1 - x0) * 0.25; x += 1) c.lineTo(x, top(x) + 0.6);
  });
}
function sceneryHides(fr) {
  return fr.scenery()
    .filter((p) => p.kind !== 'pine' && Array.isArray(p.surface) && p.surface.length > 1)
    .map((p) => [p.x + p.surface[0].dx, p.x + p.surface[p.surface.length - 1].dx]);
}
// A soft puff of white (smoke, steam, spray) with its paper shadow.
function puff(ctx, x, y, r, a, color = '#ffffff') {
  if (a <= 0.01) return;
  fill(ctx, `rgba(52,74,98,${0.18 * a})`, circle(x - 0.4, y + 0.5, r));
  fill(ctx, rgba(color, a), circle(x, y, r));
}

// ================================================================ THE WOLVES
// Three grey wolves on an ice-capped ledge, a chorus: the leader throws its head back
// and howls, and the other two join in one after the other. Built the way the Speed
// Zone coyote is (stylePacks/desertLandmarks.js drawDesertCoyote): seated side-on, a
// lit rim along the back and a darker far side, a cream chest, the head a separate
// piece that tips back for the howl with the jaw dropping, ears that flick, a tail that
// twitches, an eye with a catch-light, and song rings drifting off the muzzle. A wolf,
// not a coyote: heavier, a ruff at the neck and cheeks, a dark saddle, shorter rounder
// ears, a broader muzzle and amber eyes.
const WOLF = {
  fur: '#8b919b', furLit: '#d9dde2', furDark: '#5b616c', saddle: '#4a4f59', cream: '#ecebe6',
  tip: '#2c2f36', ear: '#b39a92', nose: '#1d1b1c', eye: '#e4b44a', pupil: '#1d1b1c', mouth: '#5a2a24',
};
const HUSKY = {
  fur: '#7c8591', furLit: '#c9cfd6', furDark: '#565d69', saddle: '#3f4550', cream: '#f4f4f1',
  tip: '#3f4550', ear: '#c9a7a0', nose: '#1d1b1c', eye: '#8fc4ec', pupil: '#1d1b1c', mouth: '#5a2a24',
};
// One seated canine, facing +x, origin on the seat under the haunch, ~16 tall at s=1.
// pose: { up 0..1 (head thrown back), jaw, look, flick, tw (tail), blink, curl (husky
// tail over the back) }.
function drawSeatedCanine(ctx, P, pose, t) {
  const { up = 0, jaw = 0, look = 0, flick = 0, tw = 0, blink = false, curl = false } = pose;
  // Tail: a wolf's hangs and curls round the paws; a husky's curls up over its back.
  if (curl) {
    piece(ctx, P.fur, (c) => { c.moveTo(-5.6, -5); cubic(c, -5.6, -5, -10.4, -6 + tw * 0.4, -10.8, -12.6, -6.2, -11.4); c.quadraticCurveTo(-8, -9.4, -4.6, -7.2); c.closePath(); });
    fill(ctx, P.cream, (c) => { c.moveTo(-9.6, -10); c.quadraticCurveTo(-9.4, -12.4, -6.2, -11.4); c.quadraticCurveTo(-8, -10.6, -8.6, -9); c.closePath(); });
  } else {
    piece(ctx, P.fur, (c) => { c.moveTo(-6.2, -1.8); c.quadraticCurveTo(-9.2, 0.4, -4.8, 0.7); c.quadraticCurveTo(1.2, 1, 5.8 + tw, -0.4); c.quadraticCurveTo(1.4, -1.5, -2.9, -1.9); c.closePath(); });
    fill(ctx, P.tip, (c) => { c.moveTo(3.8 + tw * 0.6, 0.7); c.quadraticCurveTo(5.8 + tw, 0.2, 5.8 + tw, -0.4); c.quadraticCurveTo(4.4, -1, 3.3, -0.6); c.closePath(); });
  }
  // Haunch, the far side of it in shadow.
  piece(ctx, P.fur, oval(-3, -3.8, 4.9, 4));
  fill(ctx, P.furDark, (c) => { c.ellipse(-3.6, -2.7, 3.8, 2.8, 0, 0.4 * Math.PI, 1.3 * Math.PI); c.closePath(); });
  // Torso to the shoulders, heavier than the coyote's; the chest heaves in the howl.
  const heave = jaw > 0.1 ? Math.sin(t * 9) * 0.25 : 0;
  piece(ctx, P.fur, (c) => { c.moveTo(-6.8, -4); c.quadraticCurveTo(-5.8, -10.8, 0.6, -14); c.lineTo(5 + heave, -10.8); c.quadraticCurveTo(5.2 + heave, -5, 3.1, -1); c.lineTo(-3, -0.4); c.closePath(); });
  // The dark saddle over the back, and the lit rim above it.
  fill(ctx, P.saddle, (c) => { c.moveTo(-6.2, -6.2); c.quadraticCurveTo(-4.4, -11.4, 0.6, -14); c.lineTo(1, -12.4); c.quadraticCurveTo(-3.2, -10.4, -4.9, -5.4); c.closePath(); });
  fill(ctx, P.furLit, (c) => { c.moveTo(-6.3, -6.9); c.quadraticCurveTo(-4.3, -12, 0.6, -14); c.lineTo(0.7, -13.4); c.quadraticCurveTo(-3.8, -11.6, -5.8, -6.4); c.closePath(); });
  // Cream chest.
  fill(ctx, P.cream, (c) => { c.moveTo(5 + heave, -10.8); c.quadraticCurveTo(5.6 + heave, -5.6, 3.4, -1.2); c.lineTo(1.9, -1.2); c.quadraticCurveTo(3.4, -6, 2.5, -11); c.closePath(); });
  // Front legs, straight, paws on the seat.
  for (const lx of [1.7, 3.4]) {
    fill(ctx, lx > 2 ? P.fur : P.furDark, (c) => rr(c, lx - 0.75, -8, 1.5, 8, 0.5));
    fill(ctx, P.cream, oval(lx + 0.25, -0.3, 1.05, 0.5));
  }
  // The ruff: a ragged collar of fur at the neck, over the shoulders.
  piece(ctx, P.fur, poly([-0.6, -13.6, 1.2, -15, 3, -14.4, 4.6, -13.2, 5.8, -11.6, 5.2, -10.6, 5.9, -9.4, 4.4, -9.6, 3.2, -10.8, 0.8, -11.6]));
  fill(ctx, P.cream, poly([4.2, -12.8, 5.8, -11.6, 5.2, -10.6, 5.9, -9.4, 4.4, -9.6, 4.1, -11]));
  // Head: level and looking about, or thrown back for the howl.
  ctx.save();
  ctx.translate(2.8, -13.2);
  ctx.rotate(-up * 0.95 + look);
  piece(ctx, P.fur, oval(0.5, -1.3, 2.9, 2.5, -0.1));
  // Ears: shorter and rounder than the coyote's, one flicking now and then.
  for (const [ex, rot, dark] of [[-0.7, -0.3 - flick, true], [0.9, 0.02, false]]) {
    fill(ctx, dark ? P.furDark : P.fur, (c) => { c.moveTo(ex - 1.3, -2.6); c.quadraticCurveTo(ex + Math.sin(rot) * 2.6 - 0.5, -2.6 - Math.cos(rot) * 3.2, ex + Math.sin(rot) * 2.9, -2.6 - Math.cos(rot) * 3); c.lineTo(ex + 1.2, -2.9); c.closePath(); });
    if (!dark) fill(ctx, P.ear, (c) => { c.moveTo(ex - 0.55, -2.9); c.lineTo(ex + Math.sin(rot) * 2.1, -2.8 - Math.cos(rot) * 2.2); c.lineTo(ex + 0.55, -3); c.closePath(); });
  }
  // The open mouth, dark, between the jaws.
  if (jaw > 0.05) {
    const jx = 2.2 + Math.cos(jaw) * 4 - Math.sin(jaw) * 0.6, jy = -0.7 + Math.sin(jaw) * 4 + Math.cos(jaw) * 0.6;
    fill(ctx, P.mouth, poly([2.3, -0.3, 6.5, -0.5, jx, jy]));
  }
  // Lower jaw, cream.
  ctx.save();
  ctx.translate(2.2, -0.7);
  ctx.rotate(jaw);
  fill(ctx, P.cream, poly([0, 0.1, 4.1, 0.25, 3.9, 1.1, 0, 1.5]));
  ctx.restore();
  // Cheek ruff, the cream mask round the jaw.
  fill(ctx, P.cream, poly([-1.8, -0.9, 0.2, -1.6, 2.4, -0.6, 1.6, 0.9, 0, 1.3, -1.3, 0.8, -2.1, 0.2]));
  // Muzzle, broad and blunt, lit along the top.
  fill(ctx, P.fur, poly([1.4, -3, 6.5, -1.6, 6.7, -0.1, 2, 0.5]));
  fill(ctx, P.furLit, poly([1.4, -3, 6.5, -1.6, 6.3, -1.2, 1.6, -2.4]));
  fill(ctx, P.cream, poly([3.4, -0.6, 6.6, -0.5, 6.7, -0.1, 3.4, 0.3]));
  fill(ctx, P.nose, circle(6.55, -1.05, 0.72));
  if (blink || jaw > 0.1) {
    stroke(ctx, P.pupil, 0.38, (c) => { c.moveTo(1.1, -2.1); c.lineTo(2.5, -1.8); });
  } else {
    fill(ctx, P.eye, circle(1.9, -1.95, 0.5));
    fill(ctx, P.pupil, circle(2.05, -1.95, 0.24));
    fill(ctx, '#fff6d8', circle(2.15, -2.1, 0.1));
  }
  // The brow, dark over the eye.
  stroke(ctx, P.furDark, 0.4, (c) => { c.moveTo(0.8, -2.8); c.quadraticCurveTo(1.9, -3.2, 2.9, -2.6); });
  ctx.restore();
}
// The song: rings drifting off the muzzle, the way the coyote's do.
function songRings(ctx, t, up, gain, headX = 2.8, headY = -13.2, reach = 7) {
  if (gain <= 0) return;
  const dirA = -up * 0.95 - 0.1;
  const mx = headX + Math.cos(dirA) * reach, my = headY + Math.sin(dirA) * reach - 1;
  for (let k = 0; k < 3; k++) {
    const ph = fract(t * 1.2 + k / 3);
    const a = 0.8 * (1 - ph) * gain;
    stroke(ctx, `rgba(255,247,226,${a})`, 0.45, (c) => c.arc(mx + Math.cos(dirA) * ph * 9, my + Math.sin(dirA) * ph * 9, 1.2 + ph * 4.4, dirA - 0.75, dirA + 0.75));
  }
}
// A howl as a pose over a local clock: head up at a, howling a..b, down by b + 0.5.
function howlPose(u, a, b, t, seed) {
  const up = u < a - 0.35 ? 0 : u < a ? smooth(a - 0.35, a, u) : u < b ? 1 : 1 - smooth(b, b + 0.45, u);
  const howl = u > a && u < b;
  return {
    up,
    jaw: howl ? 0.35 + Math.sin(t * 6 + seed) * 0.08 : 0,
    look: Math.sin(t * 0.8 + seed * 2) * 0.13 * (1 - up),
    flick: fract(t * 0.43 + seed * 0.31) < 0.06 ? 0.3 : 0,
    tw: Math.sin(t * 2.2 + seed) * 0.5,
    blink: !howl && fract(t * 0.27 + seed * 0.17) < 0.03,
    song: howl ? 1 : 0,
  };
}
// The ledge: a slab of Frost's ice rock in two steps, a snow cap poured over the top.
const LEDGE = { body: '#6c8299', lit: '#9fb2c5', dark: '#4f6379', snow: '#f4f8fc', snowShade: '#d5e0ec' };
function drawLedge(ctx, P) {
  const outline = [-30, 12, -29, -4, -25, -7.6, -12, -8.2, -9.5, -12.6, 2, -14, 13.5, -13, 16, -8, 27, -7.2, 31, -2, 32, 12];
  piece(ctx, P.body, poly(outline), -0.6, 0.8);
  ctx.save();
  ctx.beginPath(); poly(outline)(ctx); ctx.clip();
  fill(ctx, P.lit, poly([-29, -4, -25, -7.6, -12, -8.2, -12.5, -5.5, -24, -4.8, -28, -1]));
  fill(ctx, P.lit, poly([-9.5, -12.6, 2, -14, 1, -10.5, -8.6, -9.6]));
  fill(ctx, P.dark, poly([13.5, -13, 16, -8, 27, -7.2, 31, -2, 32, 12, 22, 12, 21, -2, 15, -3.5, 12, -9]));
  fill(ctx, P.dark, poly([-12, -8.2, -9.5, -12.6, -8.4, -8, -10.5, 1, -13, 12, -16, 12, -13, -2]));
  // Facet seams, the paper's own folds.
  stroke(ctx, 'rgba(255,255,255,0.28)', 0.5, (c) => { c.moveTo(-20, 12); c.lineTo(-17, -1); c.lineTo(-12.4, -5); c.moveTo(4, 12); c.lineTo(6, -2); c.lineTo(3, -9); });
  ctx.restore();
  // The snow cap, poured over each step, a few drips down the faces.
  const cap = (x0, x1, y0, y1, drips) => {
    piece(ctx, P.snow, (c) => {
      c.moveTo(x0 - 1, y0 + 0.4);
      c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 2.1, x1 + 1, y1 + 0.4);
      for (const [dx, dd] of drips) { c.lineTo(x0 + dx + 1.2, y0 + (y1 - y0) * dx / (x1 - x0) + 0.8); c.quadraticCurveTo(x0 + dx, y0 + (y1 - y0) * dx / (x1 - x0) + dd, x0 + dx - 1.2, y0 + (y1 - y0) * dx / (x1 - x0) + 0.8); }
      c.closePath();
    }, -0.3, 0.5);
    stroke(ctx, P.snowShade, 0.5, (c) => { c.moveTo(x0 + 1, y0 + 0.9); c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 0.5, x1 - 1, y1 + 0.9); });
  };
  cap(-9.5, 13.5, -12.6, -13, [[18, 3.2], [9, 2.2], [2, 3.6]].sort((a, b) => b[0] - a[0]));
  cap(-29, -12, -4, -8.2, [[12, 2.6], [5, 3.2]].sort((a, b) => b[0] - a[0]));
  cap(16, 31, -8, -2, [[9, 2.4], [3, 3]].sort((a, b) => b[0] - a[0]));
}
function paintWolves(ctx, f) {
  const P = tonePal(WOLF, f.tone);
  const R = tonePal(LEDGE, f.tone);
  const S = 1.45;
  const u = f.clock % 7;                      // the chorus, every 7 s
  const x0 = f.x;
  const y0 = f.crest(x0) + 2.2;
  const top = groundTop(f, x0 - 30 * S, x0 + 31 * S, y0 + 1.5, 2.4, 14);
  ctx.save();
  clipAbove(ctx, x0 - 80, x0 + 80, top);
  ctx.save();
  ctx.translate(x0, y0);
  // `facing` -1 turns the whole group, ledge and all, so a repeat is not a copy.
  ctx.scale(S * (f.facing < 0 ? -1 : 1), S);
  drawLedge(ctx, R);
  // [seat x, seat y, facing, scale, howl from, to, seed]
  const pack = [
    [-20, -5.3, 1, 0.84, 1.1, 3.3, 2.1],
    [24.2, -4.6, -1, 0.8, 1.5, 3.4, 4.3],
    [1.4, -13.6, 1, 1, 0.5, 3.5, 0],
  ];
  for (const [sx, sy, dir, s, a, b, seed] of pack) {
    const pose = howlPose(u, a, b, f.t, seed);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir * s, s);
    drawSeatedCanine(ctx, P, pose, f.t + seed);
    songRings(ctx, f.t + seed, pose.up, pose.song);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
  mound(ctx, f, x0 - 30 * S, x0 + 31 * S, top, 14);
}

// THE WOLVES ROUND A FIRE (frost-3; Peter, 25 Sep 2026: "perhaps the wolves in level 3 could
// be around. fire??"). The same three, no ledge: a campfire in the crown of the hill, a
// ring of stones and crossed logs, one wolf either side facing in and the leader behind
// the flames. The chorus is the ledge's; the fire flickers, lights the pack and throws
// sparks off downwind.
const CAMPFIRE = { stone: '#5d6878', stoneLit: '#8e97a6', log: '#5b4336', logEnd: '#a07e63' };
// Firelit silhouettes: at dusk the day wolves' grey is the far ridge's own value and they
// dissolve into it (only the saddle and rim showed, as floating arcs). Dark against the
// hills instead, the rim along each back warmed by the fire, the cream parts dimmed.
const FIRE_WOLF = {
  fur: '#4b515c', furLit: '#d08a55', furDark: '#343943', saddle: '#2b2f37', cream: '#a39d95',
  tip: '#202329', ear: '#86665c', nose: '#141213', eye: '#f2c152', pupil: '#141213', mouth: '#4a1f1a',
};
function paintWolvesFire(ctx, f) {
  const P = { ...tonePal(FIRE_WOLF, f.tone), furLit: FIRE_WOLF.furLit, eye: FIRE_WOLF.eye };
  const C = tonePal(CAMPFIRE, f.tone);
  const g = glowGain(f);
  const S = 1.45;
  const u = f.clock % 7;
  const x0 = f.x;
  const y0 = f.crest(x0) + 1.4;
  const flick = 0.82 + 0.1 * Math.sin(f.t * 11.3) + 0.08 * Math.sin(f.t * 17.9);
  const top = groundTop(f, x0 - 30 * S, x0 + 30 * S, y0, 1.6, 14);
  const wolf = (sx, sy, dir, s, a, b, seed) => {
    const pose = howlPose(u, a, b, f.t, seed);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir * s, s);
    drawSeatedCanine(ctx, P, pose, f.t + seed);
    songRings(ctx, f.t + seed, pose.up, pose.song);
    ctx.restore();
  };
  ctx.save();
  clipAbove(ctx, x0 - 90, x0 + 90, top);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(S, S);
  // The leader, behind the fire, a step up the far side of the crown and a touch smaller.
  wolf(1.5, -0.9, 1, 0.84, 0.5, 3.5, 0);
  // The fire: stones, crossed logs, flames.
  for (const [sx, r] of [[-5, 1.3], [-2.6, 1.1], [0, 1.2], [2.6, 1.1], [5, 1.3]]) {
    fill(ctx, C.stone, oval(sx, -0.2, r * 1.2, r * 0.8));
    fill(ctx, mix(C.stoneLit, '#ffc070', 0.35 * g), oval(sx - 0.2, -0.6, r * 0.8, r * 0.35));
  }
  stroke(ctx, C.log, 1.3, (c) => { c.moveTo(-4.2, -0.4); c.lineTo(3, -3); c.moveTo(4.2, -0.4); c.lineTo(-3, -3); });
  fill(ctx, C.logEnd, circle(-4.2, -0.4, 0.65)); fill(ctx, C.logEnd, circle(4.2, -0.4, 0.65));
  ctx.save();
  ctx.translate(0, -1.8);
  tongue(ctx, '#ff7a35', 3.2, 8 * (0.85 + 0.15 * Math.sin(f.t * 9.1)), 1.2 + Math.sin(f.t * 5) * 0.6);
  tongue(ctx, '#ffab45', 2.3, 6 * (0.8 + 0.2 * Math.sin(f.t * 12.7 + 1)), 0.8 + Math.sin(f.t * 6.3) * 0.5);
  tongue(ctx, '#ffe39a', 1.3, 3.6 * (0.8 + 0.2 * Math.sin(f.t * 15.3 + 2)), 0.3);
  ctx.restore();
  // Either side, facing in.
  wolf(-18, 0, 1, 0.88, 1.1, 3.3, 2.1);
  wolf(19.5, 0, -1, 0.86, 1.5, 3.4, 4.3);
  ctx.restore();
  ctx.restore();
  mound(ctx, f, x0 - 30 * S, x0 + 30 * S, top, 14);
  // The firelight over the pack and the snow, then the sparks. Unclipped.
  const fx = x0, fy = y0 - 5 * S;
  halo(ctx, fx, fy, 34 * S, 0.42 * g * flick);
  halo(ctx, fx, fy, 8 * S, 0.5 * g * flick, [255, 230, 170]);
  const pool = ctx.createRadialGradient(fx, y0, 0, fx, y0, 26 * S);
  pool.addColorStop(0, `rgba(255,200,120,${0.35 * g * flick})`);
  pool.addColorStop(1, 'rgba(255,200,120,0)');
  fill(ctx, pool, oval(fx, y0 + 1, 26 * S, 4 * S));
  for (let i = 0; i < 8; i++) {
    const k = fract(f.t * 0.75 + i / 8);
    const sx = fx + (k * 20 + Math.sin(k * 9 + i * 2) * 2.5) * S;
    const sy = fy - (3 + k * 20 - k * k * 6) * S;
    fill(ctx, `rgba(255,${200 + ((i * 37) % 50)},120,${(1 - k) * 0.95})`, circle(sx, sy, 0.45 * S));
  }
}

// ================================================================ THE LOG CABIN
// A trapper's cabin in the saddle of a summit: two flat faces of cut paper, the gable
// end square to us and the long wall going back in shade, logs in two browns pulled
// toward the ridge's blue, a roof buried under a slab of snow with icicles along the
// eaves, a stone chimney with smoke curling off downwind, and warm windows — the one
// warm thing on the hill at dusk. A woodpile of log ends against the wall.
const CABIN = {
  logA: '#86695a', logB: '#735a4c', logEnd: '#b0927a', logRing: '#8a6e5c',
  sideA: '#6b5549', sideB: '#5d4a40', roof: '#4f4448', snow: '#f5f8fb', snowShade: '#d4dfeb',
  stone: '#8792a0', stoneDark: '#646f7e', frame: '#4b3a32', door: '#5b4538', ice: '#e4f1fb',
};
function paintCabin(ctx, f) {
  const P = tonePal(CABIN, f.tone);
  const g = glowGain(f);
  const S = 1.4;
  const x0 = f.x - 6 * S;
  const y0 = f.crest(f.x) + 1.6;
  const top = groundTop(f, x0 - 16 * S, x0 + 35 * S, y0, 2.6, 20);
  ctx.save();
  clipAbove(ctx, x0 - 70, x0 + 90, top);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(S, S);
  // ---- the long wall, going back in shade
  const side = [6, 0, 6, -14, 27, -14, 27, 0];
  piece(ctx, P.sideA, poly(side));
  ctx.save(); ctx.beginPath(); poly(side)(ctx); ctx.clip();
  for (let y = -14, i = 0; y < 0; y += 2.4, i++) fill(ctx, i % 2 ? P.sideB : P.sideA, box(6, y, 21, 2.4));
  ctx.restore();
  // Its window, lit from inside.
  const flick = 0.88 + 0.07 * Math.sin(f.t * 7.3) + 0.05 * Math.sin(f.t * 12.9);
  fill(ctx, P.frame, box(13.2, -10.2, 6.4, 5.2));
  fill(ctx, mix('#6a5a58', '#ffcf73', g * flick), box(13.8, -9.6, 5.2, 4));
  fill(ctx, P.frame, box(16.1, -9.6, 0.6, 4)); fill(ctx, P.frame, box(13.8, -7.9, 5.2, 0.6));
  fill(ctx, P.snow, box(12.8, -5.2, 7.2, 0.9));
  // ---- the roof over the long wall: dark boards under a slab of snow
  piece(ctx, P.roof, poly([-4.5, -27.5, 16, -27.5, 29.5, -12.6, 8.6, -12.6]), -0.5, 0.7);
  piece(ctx, P.snow, (c) => {
    c.moveTo(-4.5, -28.8);
    c.quadraticCurveTo(6, -30.4, 16.5, -28.8);
    c.lineTo(29.8, -13.8);
    // The lip over the eave, sagging between icicles.
    c.quadraticCurveTo(24, -12.4, 19, -13.4);
    c.quadraticCurveTo(14, -12.2, 9, -13.4);
    c.closePath();
  }, -0.4, 0.6);
  stroke(ctx, P.snowShade, 0.6, (c) => { c.moveTo(16, -27.6); c.lineTo(27.8, -14.6); });
  // Icicles along the long eave, glinting as the light crosses them.
  for (const [ix, il] of [[10.5, 2.4], [12.6, 1.4], [15, 3], [18.2, 1.8], [21, 2.6], [24.4, 1.5], [27, 2.2]]) {
    const yy = -13.2 + (ix - 9) * 0.02;
    fill(ctx, P.ice, poly([ix - 0.55, yy, ix + 0.55, yy, ix, yy + il]));
  }
  // ---- the gable end, square to us
  const gable = [-15, 0, -15, -14, -4.5, -25.5, 6, -14, 6, 0];
  piece(ctx, P.logA, poly(gable));
  ctx.save(); ctx.beginPath(); poly(gable)(ctx); ctx.clip();
  for (let y = -26, i = 0; y < 0; y += 2.4, i++) fill(ctx, i % 2 ? P.logB : P.logA, box(-16, y, 23, 2.4));
  // Log ends stacked at both corners, the cabin's own signature.
  for (let y = -12.8, i = 0; y < 0; y += 2.4, i++) {
    for (const cx of [-14.2, 5.2]) {
      fill(ctx, P.logEnd, circle(cx + (i % 2 ? 0.3 : -0.3), y + 1.2, 1.15));
      fill(ctx, P.logRing, circle(cx + (i % 2 ? 0.3 : -0.3), y + 1.2, 0.45));
    }
  }
  ctx.restore();
  // The door, and a warm lamp over it.
  fill(ctx, P.frame, (c) => arch(c, -9.1, -9.6, 6.2, 9.8, 2.4));
  fill(ctx, P.door, (c) => arch(c, -8.5, -9, 5, 9, 2));
  fill(ctx, P.frame, box(-6.25, -9, 0.5, 9));
  fill(ctx, mix('#6a5a58', '#ffd988', g * flick), circle(-4.4, -4.6, 0.45));
  // The gable window, a four-pane cross.
  fill(ctx, P.frame, box(-7.3, -20.6, 5.6, 5));
  fill(ctx, mix('#6a5a58', '#ffcf73', g * flick), box(-6.8, -20.1, 4.6, 4));
  fill(ctx, P.frame, box(-4.8, -20.1, 0.6, 4)); fill(ctx, P.frame, box(-6.8, -18.4, 4.6, 0.6));
  // Snow thick along the gable's two roof edges, and the ridge-cap.
  strip(ctx, P.snow, 2.2, (c) => { c.moveTo(-16.6, -12.8); c.lineTo(-4.5, -27.2); c.lineTo(7.6, -12.8); });
  fill(ctx, P.snow, poly([-17.4, -12.2, -15.4, -14.1, -15.1, -11.2]));
  for (const [ix, il] of [[-15.6, 2.2], [-13.9, 1.2], [6.6, 1.8]]) fill(ctx, P.ice, poly([ix - 0.5, -12, ix + 0.5, -12, ix, -12 + il]));
  // ---- the chimney: stone, up through the snow on the long roof, capped with snow
  piece(ctx, P.stone, box(18.6, -30.5, 4.6, 13));
  for (const [sx, sy, sw] of [[18.6, -27, 2.4], [21, -24.6, 2.2], [18.6, -22, 2.8], [21.4, -19.4, 1.8]]) fill(ctx, P.stoneDark, box(sx, sy, sw, 1.1));
  fill(ctx, P.snow, (c) => { c.moveTo(18, -30.3); c.quadraticCurveTo(20.9, -32.6, 23.8, -30.3); c.closePath(); });
  // A woodpile of log ends against the long wall.
  for (const [lx, ly] of [[28.6, -1.1], [31, -1.1], [33.4, -1.1], [29.8, -3.2], [32.2, -3.2], [31, -5.3]]) {
    fill(ctx, P.logEnd, circle(lx, ly, 1.15));
    fill(ctx, P.logRing, circle(lx, ly, 0.45));
  }
  fill(ctx, P.snow, (c) => { c.moveTo(29.4, -5.6); c.quadraticCurveTo(31, -7.4, 32.6, -5.6); c.closePath(); });
  ctx.restore();
  ctx.restore();
  // Smoke off the chimney, downwind: slow puffs, growing and thinning. Unclipped.
  for (let i = 0; i < 6; i++) {
    const k = fract(f.t * 0.16 + i / 6);
    const sx = x0 + (20.9 + k * 22 + Math.sin(k * 5 + f.t * 0.7 + i) * 2.2) * S;
    const sy = y0 + (-32 - k * 30) * S;
    puff(ctx, sx, sy, (1.4 + k * 4.2) * S, 0.62 * (1 - k) * smooth(0, 0.08, k));
  }
  mound(ctx, f, x0 - 16 * S, x0 + 35 * S, top, 20);
  // The window's light on the snow below it, at dusk.
  if (g > 0.6) {
    const lg = ctx.createRadialGradient(x0 - 4 * S, y0 + 1, 0, x0 - 4 * S, y0 + 1, 12 * S);
    lg.addColorStop(0, `rgba(255,214,140,${0.28 * (g - 0.5) * flick})`);
    lg.addColorStop(1, 'rgba(255,214,140,0)');
    fill(ctx, lg, oval(x0 - 4 * S, y0 + 1, 12 * S, 3.4 * S));
  }
}

// ================================================================ THE IGLOO
// An igloo in the crown of a summit: a dome of cut snow blocks, the far side in shade,
// the entrance tunnel toward us with a warm glow in its doorway, steam from the vent at
// the top, and a husky sat by the door (the wolves' own figure in husky colours, tail
// curled over its back) that looks about and, now and then, answers something with a
// short howl.
const IGLOO = { snow: '#f3f7fb', shade: '#d4e0ec', seam: '#b9cadc', deep: '#a8bcd2', door: '#39344a', warm: '#ffc867' };
function paintIgloo(ctx, f) {
  const P = tonePal(IGLOO, f.tone);
  const H = tonePal(HUSKY, f.tone);
  const g = glowGain(f);
  const S = 1.55;
  const x0 = f.x;
  const y0 = f.crest(x0) + 1.4;
  const flick = 0.85 + 0.09 * Math.sin(f.t * 6.1) + 0.06 * Math.sin(f.t * 14.3);
  const top = groundTop(f, x0 - 17 * S, x0 + 17 * S, y0, 1.8, 18);
  ctx.save();
  clipAbove(ctx, x0 - 70, x0 + 70, top);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(S, S);
  // ---- the dome
  const dome = (c) => { c.moveTo(-17, 0.5); cubic(c, -17, 0.5, -17, -11, -9.6, -17, 0, -17, 14); cubic(c, 0, -17, 9.6, -17, 17, -11, 17, 0.5, 14); c.closePath(); };
  piece(ctx, P.snow, dome, -0.6, 0.8);
  ctx.save(); ctx.beginPath(); dome(ctx); ctx.clip();
  // The far side in shade: the light is from the left.
  fill(ctx, P.shade, (c) => c.ellipse(13, -4, 11, 19, -0.15, 0, TAU));
  // Block courses, each a little shallower up the dome, joints staggered course to course.
  const courses = [0.5, -3.6, -7.4, -10.8, -13.6, -15.8];
  for (let i = 1; i < courses.length; i++) {
    const y = courses[i];
    stroke(ctx, P.seam, 0.5, (c) => { c.moveTo(-18, y + 0.6); c.quadraticCurveTo(0, y - 1.1, 18, y + 0.6); });
  }
  for (let i = 0; i < courses.length - 1; i++) {
    const yb = courses[i], yt = courses[i + 1];
    const half = 17 * Math.sqrt(Math.max(0, 1 - ((yb + yt) / 2 / 17.5) ** 2));
    const n = Math.max(2, Math.round(half / 4.2));
    for (let k = 0; k <= n * 2; k++) {
      const jx = -half + (k + (i % 2 ? 0.5 : 0)) * (half / n);
      if (jx <= -half + 0.8 || jx >= half - 0.8) continue;
      stroke(ctx, P.seam, 0.45, (c) => { c.moveTo(jx, yb - 0.2); c.lineTo(jx * 0.97, yt + 0.5); });
    }
  }
  ctx.restore();
  // The vent at the crown.
  fill(ctx, P.deep, oval(1.5, -16.6, 1.8, 0.7));
  // ---- the entrance tunnel, toward us, a little left of centre
  const tunnel = (c) => { c.moveTo(-12.5, 0.5); cubic(c, -12.5, 0.5, -12.5, -6.5, -9.2, -9.6, -5, -9.6); cubic(c, -5, -9.6, -0.8, -9.6, 2.5, -6.5, 2.5, 0.5); c.closePath(); };
  piece(ctx, P.snow, tunnel, -0.5, 0.7);
  ctx.save(); ctx.beginPath(); tunnel(ctx); ctx.clip();
  fill(ctx, P.shade, (c) => c.ellipse(3.5, -2, 5, 11, 0, 0, TAU));
  for (const y of [-3.4, -6.6]) stroke(ctx, P.seam, 0.45, (c) => { c.moveTo(-13, y + 0.5); c.quadraticCurveTo(-5, y - 0.9, 3, y + 0.5); });
  ctx.restore();
  // The doorway: dark, with the warm light of the room inside it.
  const door = (c) => { c.moveTo(-8.4, 0.5); cubic(c, -8.4, 0.5, -8.4, -4.4, -6.9, -6.1, -5, -6.1); cubic(c, -5, -6.1, -3.1, -6.1, -1.6, -4.4, -1.6, 0.5); c.closePath(); };
  fill(ctx, P.door, door);
  ctx.save(); ctx.beginPath(); door(ctx); ctx.clip();
  const dg = ctx.createRadialGradient(-5, -0.4, 0, -5, -0.4, 5.8);
  dg.addColorStop(0, rgba('#ffd98c', 0.95 * g * flick));
  dg.addColorStop(0.55, rgba(IGLOO.warm, 0.7 * g * flick));
  dg.addColorStop(1, rgba(IGLOO.warm, 0));
  fill(ctx, dg, box(-9, -7, 8, 8));
  ctx.restore();
  stroke(ctx, P.seam, 0.5, (c) => { c.moveTo(-8.9, 0.4); cubic(c, -8.9, 0.4, -8.9, -4.8, -7.1, -6.7, -5, -6.7); cubic(c, -5, -6.7, -2.9, -6.7, -1.1, -4.8, -1.1, 0.4); });
  // ---- the husky, sat by the door, facing out along the hill
  const u = f.clock % 9;
  const pose = howlPose(u, 1.7, 3, f.t, 1.7);
  ctx.save();
  ctx.translate(8.6, 0.2);
  ctx.scale(0.62, 0.62);
  drawSeatedCanine(ctx, H, { ...pose, curl: true }, f.t);
  songRings(ctx, f.t, pose.up, pose.song * 0.8);
  ctx.restore();
  ctx.restore();
  ctx.restore();
  // Steam from the vent, rising straight then leaning downwind.
  for (let i = 0; i < 5; i++) {
    const k = fract(f.t * 0.2 + i / 5);
    const sx = x0 + (1.5 + k * k * 12 + Math.sin(k * 6 + i) * 0.8) * S;
    const sy = y0 + (-18 - k * 22) * S;
    puff(ctx, sx, sy, (0.9 + k * 3) * S, 0.5 * (1 - k) * smooth(0, 0.1, k));
  }
  mound(ctx, f, x0 - 17 * S, x0 + 17 * S, top, 18);
  // The door's light spilling onto the snow in front, at dusk.
  if (g > 0.6) {
    const lx = x0 - 5 * S, ly = y0 + 1.2;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 10 * S);
    lg.addColorStop(0, `rgba(255,208,130,${0.4 * (g - 0.5) * flick})`);
    lg.addColorStop(1, 'rgba(255,208,130,0)');
    fill(ctx, lg, oval(lx, ly, 10 * S, 2.8 * S));
  }
}

// ================================================================ THE POLAR BEAR
// A polar bear and her cub ambling along the crest, the cub trotting to keep up, both
// passing behind the ridge's rocks. The bear's real shape, simplified to what paper can
// cut: the rump higher than the shoulders, a long neck carried low, a long Roman-nosed
// head, small round ears, heavy legs with broad paws, in a four-beat walk. Warm cream,
// the far legs in the cool shade of the snow, black nose and eye.
const BEAR = { fur: '#f1ebdd', shade: '#cdd5df', belly: '#e1ddd3', dark: '#1f1c1c', paw: '#d9d3c6' };
function bearLeg(ctx, P, color, hx, hy, p, fore) {
  const a = p * TAU;
  const lift = 1.5 * Math.max(0, Math.cos(a)) ** 1.5;
  const fx = hx + 2.8 * Math.sin(a) + (fore ? 0.8 : -0.2);
  const fy = -lift;
  const kx = (hx + fx) / 2 + (fore ? -0.2 - lift * 0.5 : 1.1), ky = (hy + fy) / 2;
  strip(ctx, color, fore ? 4.4 : 5, (c) => { c.moveTo(hx, hy - 1.2); c.lineTo(kx, ky); });
  strip(ctx, color, 3.2, (c) => { c.moveTo(kx, ky); c.lineTo(fx, fy - 0.9); });
  fill(ctx, color === P.fur ? P.paw : color, oval(fx + 0.8, fy - 0.65, 2.3, 1.05));
}
function drawBear(ctx, P, phase) {
  const a = phase * TAU;
  const bob = 0.3 * Math.cos(2 * a);
  // Four-beat walk: far hind, far fore, near hind, near fore.
  bearLeg(ctx, P, P.shade, -9.4, -8.2 + bob, phase, false);
  bearLeg(ctx, P, P.shade, 5.4, -8.6 + bob, phase + 0.25, true);
  ctx.save();
  ctx.translate(0, bob);
  piece(ctx, P.fur, (c) => {
    c.moveTo(-13.6, -8.2);
    c.quadraticCurveTo(-14.4, -14.8, -9, -15.4);
    c.quadraticCurveTo(-3, -15.8, 2, -14.4);
    c.quadraticCurveTo(5.6, -13.8, 8.2, -12.2);
    c.lineTo(10.8, -10.6);
    c.lineTo(10.2, -7.8);
    c.quadraticCurveTo(6, -6.2, 3, -6);
    c.quadraticCurveTo(-4, -5.2, -10.4, -6);
    c.closePath();
  });
  // The belly's shade, and the tail's nub.
  fill(ctx, P.belly, (c) => { c.moveTo(-10, -6.3); c.quadraticCurveTo(-3, -5.6, 4, -6.3); c.quadraticCurveTo(-3, -7.4, -10, -7.1); c.closePath(); });
  fill(ctx, P.fur, circle(-13.9, -11.8, 1));
  ctx.restore();
  bearLeg(ctx, P, P.fur, -8.8, -8.2 + bob, phase + 0.5, false);
  bearLeg(ctx, P, P.fur, 4.8, -8.6 + bob, phase + 0.75, true);
  // The head, low on the long neck, swinging a little with the walk.
  ctx.save();
  ctx.translate(9.4, -10.6 + bob);
  ctx.rotate(0.06 * Math.sin(a) + 0.08);
  piece(ctx, P.fur, (c) => {
    c.moveTo(-0.8, -1.8);
    c.quadraticCurveTo(2.4, -2.9, 4.8, -1.6);
    c.lineTo(7.6, -0.2);
    c.quadraticCurveTo(8.2, 0.7, 7.3, 1.2);
    c.lineTo(3.4, 1.9);
    c.quadraticCurveTo(0.6, 2.2, -0.6, 1);
    c.closePath();
  });
  fill(ctx, P.fur, circle(1.4, -2.2, 1));
  fill(ctx, P.shade, circle(1.5, -2.1, 0.45));
  fill(ctx, P.dark, circle(7.6, 0.2, 0.62));
  fill(ctx, P.dark, circle(4.2, -0.9, 0.36));
  stroke(ctx, P.shade, 0.35, (c) => { c.moveTo(5.2, 1.3); c.quadraticCurveTo(6.2, 1.5, 7, 1.1); });
  ctx.restore();
}
function paintPolarBears(ctx, f) {
  const P = tonePal(BEAR, f.tone);
  // Walking with the run, slowly: a stride of ~5.6 px every 1.25 s.
  const walk = f.held ? 0 : f.clock * 4.5;
  const hides = sceneryHides(f);
  ctx.save();
  clipSky(ctx, f, f.x - 90, f.x + 90, 1.2, hides);
  const beast = (x, s, phase, tiltK = 0.8) => {
    const tilt = Math.atan2(f.crest(x + 8) - f.crest(x - 8), 16) * tiltK;
    ctx.save();
    ctx.translate(x, f.crest(x) + 1.2);
    ctx.rotate(tilt);
    ctx.scale(s, s);
    drawBear(ctx, P, phase);
    ctx.restore();
  };
  // The cub behind, quicker steps, bobbing.
  beast(f.x + walk + 29, 0.5, fract(f.t * 1.25 + 0.3));
  beast(f.x + walk, 1.1, fract(f.t * 0.8));
  ctx.restore();
}

// ================================================================ ARCTIC FOX
// A fox mousing: it trots in along the crest, stops, cocks its head at something under
// the snow, leaps high and dives nose-first into the drift, its tail wagging out of the
// hole, then backs out with a shake. The blue-morph arctic fox — dark slate in winter —
// because a white fox vanishes on the snow.
const FOX = { fur: '#6d7a8c', furLit: '#9aa7b8', dark: '#4b5566', face: '#b7c1cd', eye: '#141214' };
function drawFox(ctx, P, { trot = 0, crouch = 0, tilt = 0, tail = 0 } = {}) {
  const a = trot * TAU;
  const leg = (hx, ph, col) => {
    const sw = trot ? Math.sin(a + ph) * 0.55 : 0;
    const lift = trot ? Math.max(0, Math.cos(a + ph)) * 0.8 : 0;
    stroke(ctx, col, 0.95, (c) => { c.moveTo(hx, -3.2 + crouch); c.lineTo(hx + sw * 2.4, -lift); });
  };
  leg(-3, 0, P.dark); leg(3, Math.PI, P.dark);
  // The brush: big and low, swinging.
  ctx.save();
  ctx.translate(-4.2, -4.3 + crouch);
  ctx.rotate(tail);
  piece(ctx, P.fur, (c) => { c.moveTo(0.4, -0.8); cubic(c, 0.4, -0.8, -3, -2.4, -7.4, -1.4, -8.4, 0.8); cubic(c, -8.4, 0.8, -6.4, 1.6, -2.6, 1.6, 0.4, 0.9); c.closePath(); });
  fill(ctx, P.furLit, (c) => { c.moveTo(-8.4, 0.8); c.quadraticCurveTo(-7.6, -0.8, -6, -1.2); c.quadraticCurveTo(-7, 0, -6.6, 1.1); c.closePath(); });
  ctx.restore();
  piece(ctx, P.fur, oval(0, -4.4 + crouch, 4.8, 2.1));
  fill(ctx, P.furLit, (c) => { c.ellipse(-0.3, -5.2 + crouch, 4, 1.1, 0, Math.PI, TAU); c.closePath(); });
  leg(-2.2, Math.PI * 0.9, P.fur); leg(3.6, Math.PI * 1.9, P.fur);
  // Head and ears, cocked.
  ctx.save();
  ctx.translate(4, -5.4 + crouch);
  ctx.rotate(tilt);
  piece(ctx, P.fur, poly([-1.2, -1.2, 1, -2, 4.4, -0.2, 4.2, 0.5, 0.6, 1.2, -1, 0.6]));
  fill(ctx, P.face, poly([1, 0, 4.2, 0.1, 4.2, 0.5, 0.6, 1.2]));
  fill(ctx, P.furLit, poly([-0.7, -1.4, 0.1, -3.9, 1, -1.8]));
  fill(ctx, P.fur, poly([0.6, -1.7, 1.6, -3.8, 2.1, -1.4]));
  fill(ctx, P.eye, circle(1.9, -0.7, 0.3));
  fill(ctx, P.eye, circle(4.35, 0.1, 0.33));
  ctx.restore();
}
function paintFox(ctx, f) {
  const P = tonePal(FOX, f.tone);
  // The 5 s performance played at 1.35x, so the dive lands inside a ~4 s pass — ONCE: in
  // a level it then stands where it landed, looking about, rather than jumping back to
  // the start (a held gallery card loops it).
  const u0 = f.clock * 1.35;
  const u = f.held ? u0 % 6 : Math.min(u0, 6);
  const S = 1.9;
  // The timeline, in seconds: trot in, stop and listen, leap, dive, wag, back out, shake.
  let dx = 0, dy = 0, rot = 0, trot = 0, crouch = 0, tilt = 0, tail = 0, sink = 0;
  const LX = 11;                     // where the pounce lands, from the listening spot
  if (u < 1.4) { dx = -16 * (1 - u / 1.4); trot = fract(u * 2.6); tail = 0.1 * Math.sin(u * 16); }
  else if (u < 2.3) { tilt = Math.sin((u - 1.4) * 5) * 0.28; crouch = 0.9 * smooth(1.9, 2.3, u); tail = -0.1; }
  else if (u < 2.95) {
    const k = (u - 2.3) / 0.65;
    dx = LX * k; dy = -15 * 4 * k * (1 - k); rot = -0.8 + 2.3 * k; tail = 0.4 - 0.6 * k;
  } else if (u < 3.9) {
    dx = LX; rot = 1.5; sink = 6.4; tail = Math.sin((u - 2.95) * 22) * 0.45;
  } else if (u < 4.3) {
    const k = (u - 3.9) / 0.4;
    dx = LX + 1.5 * k; rot = 1.5 * (1 - k); sink = 6.4 * (1 - k); dy = -2.2 * Math.sin(Math.PI * k);
  } else if (u < 5) { dx = LX + 1.5; rot = Math.sin((u - 4.3) * 30) * 0.08 * (1 - (u - 4.3) / 0.7); }
  else { dx = LX + 1.5; tilt = Math.sin(f.t * 1.3) * 0.18; tail = 0.12 * Math.sin(f.t * 2.4); }
  const x = f.x + dx * S;
  const base = f.crest(x) + 0.6;
  ctx.save();
  clipSky(ctx, f, f.x - 60, f.x + 60, 0.6, sceneryHides(f));
  ctx.save();
  ctx.translate(x, base + dy * S);
  ctx.rotate(rot);
  ctx.translate(0, sink);
  ctx.scale(S, S);
  drawFox(ctx, P, { trot, crouch, tilt, tail });
  ctx.restore();
  ctx.restore();
  // The snow thrown up by the dive, and again on the way out.
  const burst = (t0, n) => {
    const k = (u - t0) / 0.95;
    if (k < 0 || k > 1) return;
    const bx = f.x + (LX + 2.6) * S, by = f.crest(f.x + (LX + 2.6) * S);
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2;
      puff(ctx, bx + Math.cos(ang) * k * 8, by + Math.sin(ang) * k * 9 + k * k * 6, 1.3 + k * 1.2, 0.9 * (1 - k));
    }
  };
  burst(2.9, 7); burst(3.9, 5);
}

// ================================================================ DOG SLED
// A husky team hauling a sled along the crest: three pairs at a gallop on the gangline,
// the sled's basket packed under a red tarp, the musher on the runners in a fur-hooded
// parka with a scarf streaming behind, snow kicked up off the runners. The dogs are the
// husky's own colours.
function drawRunningDog(ctx, P, phase, far) {
  const a = phase * TAU;
  const body = far ? P.furDark : P.fur;
  const legC = far ? P.saddle : P.furDark;
  const lift = Math.max(0, Math.sin(a)) * 0.5;
  ctx.save();
  ctx.translate(0, -lift);
  const leg = (hx, hy, ang, bend) => {
    const kx = hx + Math.sin(ang) * 1.9, ky = hy + Math.cos(ang) * 1.9;
    stroke(ctx, legC, 1.1, (c) => { c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(kx + Math.sin(ang + bend) * 2, ky + Math.cos(ang + bend) * 2); });
  };
  leg(2.4, -3.6, 0.9 * Math.sin(a - 0.4), -0.8 * Math.max(0, Math.cos(a - 0.4)));
  leg(-2.6, -3.8, 0.8 * Math.sin(a + Math.PI * 0.9 - 0.4), 0.4);
  // Tail curled over the back.
  fill(ctx, body, (c) => { c.moveTo(-3.2, -4.6); c.quadraticCurveTo(-5.8, -6, -4.4, -7.8); c.quadraticCurveTo(-4.4, -6.2, -2.4, -5.4); c.closePath(); });
  fill(ctx, body, oval(0, -4.4, 3.8, 1.9, -0.05));
  if (!far) fill(ctx, P.cream, (c) => { c.ellipse(0.4, -3.4, 2.8, 0.8, 0, 0, Math.PI); c.closePath(); });
  // The harness: a red strap round the chest.
  stroke(ctx, far ? '#8a3a32' : '#c9483c', 0.55, (c) => { c.moveTo(1.6, -5.6); c.lineTo(2.2, -3); });
  // Head, ears up, reaching forward.
  fill(ctx, body, poly([2.6, -5.2, 3.8, -6.4, 4.6, -6.3, 6.4, -5.3, 6.2, -4.6, 3.8, -4, 2.8, -4.2]));
  fill(ctx, body, poly([3.6, -6.2, 3.9, -7.8, 4.6, -6.3]));
  if (!far) {
    fill(ctx, P.cream, poly([4.6, -5, 6.3, -5, 6.2, -4.6, 4.4, -4.3]));
    fill(ctx, P.nose, circle(6.3, -5.15, 0.3));
  }
  leg(2, -3.6, 0.9 * Math.sin(a), -0.8 * Math.max(0, Math.cos(a)));
  leg(-3, -3.8, 0.8 * Math.sin(a + Math.PI * 0.9), 0.4);
  ctx.restore();
}
const SLED = { wood: '#7a5d49', runner: '#3b3e48', tarp: '#b94a3e', tarpDark: '#8d372f', parka: '#2f6c8f', parkaDark: '#244f6a', fur: '#d9cdb8', face: '#e6bc98', scarf: '#f0c24a', boot: '#2d2a2e' };
function paintDogSled(ctx, f) {
  const H = tonePal(HUSKY, f.tone);
  const P = tonePal(SLED, f.tone);
  const S = 1.65;
  // The team runs with the run, a good deal slower than the camera.
  const run = f.held ? 0 : f.clock * 14;
  const lead = f.x + run;
  const hides = sceneryHides(f);
  ctx.save();
  clipSky(ctx, f, lead - 140, lead + 30, 1.2, hides);
  const at = (x) => f.crest(x) + 1.1;
  const slope = (x) => Math.atan2(f.crest(x + 6) - f.crest(x - 6), 12) * 0.8;
  const sledX = lead - 44 * S;
  // The gangline, from the sled's bow to the leaders' collars.
  stroke(ctx, P.runner, 0.6, (c) => {
    c.moveTo(sledX + 6 * S, at(sledX + 6 * S) - 4 * S);
    for (let k = 0; k <= 8; k++) { const xx = sledX + 6 * S + (lead - sledX - 3 * S) * k / 8; c.lineTo(xx, at(xx) - 4.6 * S); }
  });
  // Three pairs, the far dog of each a step behind and in shade.
  for (let pr = 0; pr < 3; pr++) {
    for (const far of [true, false]) {
      const dx = lead - pr * 13 * S - (far ? 2.2 * S : 0);
      ctx.save();
      ctx.translate(dx, at(dx) - (far ? 0.8 : 0));
      ctx.rotate(slope(dx));
      ctx.scale(S, S);
      drawRunningDog(ctx, H, fract(f.t * 2.8 + pr * 0.23 + (far ? 0.4 : 0)), far);
      ctx.restore();
    }
  }
  // The sled and the musher.
  ctx.save();
  ctx.translate(sledX, at(sledX));
  ctx.rotate(slope(sledX));
  ctx.scale(S, S);
  const bounce = Math.sin(f.t * 5.6) * 0.25;
  // Runners, curled up at the bow.
  stroke(ctx, P.runner, 0.7, (c) => { c.moveTo(-9, -0.4); c.lineTo(5, -0.4); c.quadraticCurveTo(8, -0.4, 7.6, -3.4); });
  // Basket and the load under its tarp.
  stroke(ctx, P.wood, 0.7, (c) => { for (const sx of [-6.5, -1, 4]) { c.moveTo(sx, -0.4); c.lineTo(sx, -3.2); } c.moveTo(-8, -3.2); c.lineTo(6.2, -3.2); });
  piece(ctx, P.tarp, (c) => { c.moveTo(-7, -3.2 + bounce); c.quadraticCurveTo(-6.6, -7.2 + bounce, -1.4, -7.4 + bounce); c.quadraticCurveTo(4.4, -7.2 + bounce, 5.4, -3.2 + bounce); c.closePath(); });
  stroke(ctx, P.tarpDark, 0.5, (c) => { c.moveTo(-4, -6.6 + bounce); c.lineTo(-3.4, -3.3 + bounce); c.moveTo(1.4, -7 + bounce); c.lineTo(1.8, -3.3 + bounce); });
  // The handlebar, and the musher standing on the runners' tails.
  stroke(ctx, P.wood, 0.7, (c) => { c.moveTo(-7.4, -3.2); c.lineTo(-8.6, -9.4); });
  stroke(ctx, P.boot, 1.1, (c) => { c.moveTo(-10.4, -0.9); c.lineTo(-10.8, -4.6); c.moveTo(-8.6, -0.9); c.lineTo(-9.8, -4.6); });
  piece(ctx, P.parka, poly([-12.2, -4.6, -8.6, -4.6, -8.8, -11.2, -11, -12.2, -12.8, -10.6]));
  fill(ctx, P.parkaDark, poly([-12.2, -4.6, -11.2, -4.6, -11.6, -10.8, -12.8, -10.6]));
  stroke(ctx, P.parka, 1.1, (c) => { c.moveTo(-9.4, -10.4); c.lineTo(-8.6, -9.4); });
  // Hood: a ruff of fur round the face.
  fill(ctx, P.parka, circle(-10.3, -13.7, 2.3));
  fill(ctx, P.fur, circle(-9.4, -13.5, 1.6));
  fill(ctx, P.face, circle(-9.2, -13.5, 1.05));
  fill(ctx, '#1d1b1c', circle(-8.8, -13.7, 0.22));
  // The scarf, streaming back and flapping.
  const fl = Math.sin(f.t * 11);
  fill(ctx, P.scarf, (c) => { c.moveTo(-10.6, -11.8); c.quadraticCurveTo(-13.4, -12.6 + fl * 0.5, -16.4, -11.8 + fl); c.lineTo(-16, -10.8 + fl * 0.8); c.quadraticCurveTo(-13.2, -11.2, -10.4, -10.8); c.closePath(); });
  // THE LANTERN (frost-3, Peter 25 Sep 2026: "Lets do the sled with lantern @ 78%"): on a
  // bent pole off the bow, swinging with the sled's jolts — the warm thing in the storm.
  let lamp = null;
  if (f.lantern) {
    const sw = Math.sin(f.t * 3.1) * 0.28 + bounce * 0.4;
    stroke(ctx, P.wood, 0.55, (c) => { c.moveTo(5.2, -3.2); c.lineTo(6.4, -10.6); c.lineTo(8.6, -11.2); });
    ctx.save();
    ctx.translate(8.6, -11.2);
    ctx.rotate(sw);
    stroke(ctx, P.runner, 0.3, (c) => { c.moveTo(0, 0); c.lineTo(0, 1.1); });
    fill(ctx, P.runner, box(-1.3, 1.1, 2.6, 0.6));
    fill(ctx, mix('#6a5a58', '#ffd27a', glowGain(f) * (0.9 + 0.1 * Math.sin(f.t * 9))), box(-1.1, 1.7, 2.2, 2.6));
    fill(ctx, P.runner, box(-1.3, 4.3, 2.6, 0.5));
    ctx.restore();
    // Where the glass hangs, in the sled's frame (translate, rotate, scale), taken back
    // out for the glow drawn outside the clip.
    const px = (8.6 - Math.sin(sw) * 3) * S, py = (-11.2 + Math.cos(sw) * 3) * S;
    const th = slope(sledX);
    lamp = {
      x: sledX + px * Math.cos(th) - py * Math.sin(th),
      y: at(sledX) + px * Math.sin(th) + py * Math.cos(th),
      ground: at(sledX + 8 * S),
    };
  }
  ctx.restore();
  ctx.restore();
  if (lamp) {
    // The glow round the lantern, and its light on the snow ahead of the team.
    const lx = lamp.x, ly = lamp.y;
    const g = glowGain(f);
    const flick = 0.9 + 0.1 * Math.sin(f.t * 9);
    // Big and warm: at 78% of frost-3 it has the heaviest snow of the act to shine through.
    const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, 24 * S);
    halo.addColorStop(0, `rgba(255,220,140,${0.75 * g * flick})`);
    halo.addColorStop(0.18, `rgba(255,200,115,${0.4 * g * flick})`);
    halo.addColorStop(1, 'rgba(255,196,110,0)');
    fill(ctx, halo, circle(lx, ly, 24 * S));
    const pool = ctx.createRadialGradient(lx + 4 * S, lamp.ground, 0, lx + 4 * S, lamp.ground, 16 * S);
    pool.addColorStop(0, `rgba(255,208,130,${0.3 * g * flick})`);
    pool.addColorStop(1, 'rgba(255,208,130,0)');
    fill(ctx, pool, oval(lx + 4 * S, lamp.ground, 16 * S, 3.2 * S));
  }
  // Snow kicked off the runners.
  for (let i = 0; i < 5; i++) {
    const k = fract(f.t * 1.6 + i / 5);
    const sx = sledX - 9 * S - k * 14;
    puff(ctx, sx, at(sledX - 9 * S) - 1 - k * 3, 0.7 + k * 1.6, 0.7 * (1 - k));
  }
}


// ================================================================ FROST 3's STORM PIECES
// From the storm-pieces bake-off (src/dev/frost-storm-candidates.js; Peter, 25 Sep 2026:
// "i like all the options, for frost level 3, lets incorporate all of them spread out").
// Frost-3 is dusk in the heaviest snow of the act, so both are built round a light.
// A flame tongue, base at (0, 0), `h` tall and `w` wide, licking to one side.
function tongue(ctx, color, w, h, lean) {
  fill(ctx, color, (c) => {
    c.moveTo(-w, 0);
    c.quadraticCurveTo(-w * 0.9, -h * 0.55, lean, -h);
    c.quadraticCurveTo(w * 0.8, -h * 0.5, w, 0);
    c.closePath();
  });
}
function halo(ctx, x, y, r, a, color = [255, 196, 110]) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`);
  g.addColorStop(0.4, `rgba(${color[0]},${color[1]},${color[2]},${a * 0.4})`);
  g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  fill(ctx, g, circle(x, y, r));
}

// ================================================================ THE BEACON TOWER
// A timber watchtower in the crown of a near hill with a signal fire burning in an iron
// basket on its platform — the fortress's outpost, lit against the storm. Splayed legs,
// cross-braced, a ladder up the front, snow on the platform and the bracing, a pennant
// streaming downwind; the fire flickers, throws sparks and smoke off to the right, and
// lights the timbers nearest it.
const TOWER = {
  wood: '#6e574a', woodDark: '#4f3f37', woodLit: '#a9785a', iron: '#34343b', snow: '#f4f8fc',
  snowShade: '#d3dfeb', pennant: '#3d6f9e', pennantDark: '#2d5579',
};
function paintBeaconTower(ctx, f) {
  const P = tonePal(TOWER, f.tone);
  const g = glowGain(f);
  const S = 1.3;
  const x0 = f.x;
  const y0 = f.crest(x0) + 1.6;
  const top = groundTop(f, x0 - 12 * S, x0 + 12 * S, y0, 1.8, 14);
  const flick = 0.82 + 0.1 * Math.sin(f.t * 11.3) + 0.08 * Math.sin(f.t * 17.9);
  ctx.save();
  clipAbove(ctx, x0 - 80, x0 + 80, top);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(S, S);
  // The far legs, thinner and in shade.
  strip(ctx, P.woodDark, 1.1, (c) => { c.moveTo(-6.5, 0.5); c.lineTo(-2.6, -34); c.moveTo(6.5, 0.5); c.lineTo(2.6, -34); });
  // Cross-bracing between the near legs, three bays.
  const legX = (side, y) => side * (9.5 - (5.5 * -y) / 34);
  for (const [ya, yb] of [[0, -11.5], [-11.5, -23], [-23, -34]]) {
    stroke(ctx, P.woodDark, 0.7, (c) => {
      c.moveTo(legX(-1, ya), ya); c.lineTo(legX(1, yb), yb);
      c.moveTo(legX(1, ya), ya); c.lineTo(legX(-1, yb), yb);
      c.moveTo(legX(-1, yb), yb); c.lineTo(legX(1, yb), yb);
    });
    // Snow lodged on each crossbar.
    fill(ctx, P.snow, (c) => { c.moveTo(legX(-1, yb) + 0.6, yb - 0.3); c.quadraticCurveTo(0, yb - 1.3, legX(1, yb) - 0.6, yb - 0.3); c.closePath(); });
  }
  // The near legs.
  strip(ctx, P.wood, 1.6, (c) => { c.moveTo(-9.5, 0.5); c.lineTo(-4, -34); c.moveTo(9.5, 0.5); c.lineTo(4, -34); });
  // The fire's light on the tops of the legs.
  stroke(ctx, rgba(TOWER.woodLit, 0.8 * g * flick), 1.6, (c) => { c.moveTo(-5, -30); c.lineTo(-4, -34); c.moveTo(5, -30); c.lineTo(4, -34); });
  // The ladder up the front.
  stroke(ctx, P.woodDark, 0.5, (c) => {
    c.moveTo(-1.4, 0.5); c.lineTo(-1.2, -34); c.moveTo(1.4, 0.5); c.lineTo(1.2, -34);
    for (let y = -2; y > -34; y -= 2.6) { c.moveTo(-1.35, y); c.lineTo(1.35, y); }
  });
  // The platform, its railing, snow along the deck.
  piece(ctx, P.wood, box(-8, -36, 16, 2.2));
  fill(ctx, P.woodDark, box(-8, -34.4, 16, 0.6));
  stroke(ctx, P.wood, 0.6, (c) => {
    for (const px of [-7.4, -2.5, 2.5, 7.4]) { c.moveTo(px, -36); c.lineTo(px, -40.2); }
    c.moveTo(-7.8, -40.2); c.lineTo(7.8, -40.2); c.moveTo(-7.8, -38.2); c.lineTo(7.8, -38.2);
  });
  fill(ctx, P.snow, (c) => { c.moveTo(-8.6, -35.6); c.quadraticCurveTo(0, -37.4, 8.6, -35.6); c.lineTo(8.2, -35.2); c.lineTo(-8.2, -35.2); c.closePath(); });
  fill(ctx, P.snow, box(-8, -40.8, 16, 0.7));
  // The pennant, off the back corner, streaming downwind.
  strip(ctx, P.woodDark, 0.6, (c) => { c.moveTo(7.4, -36); c.lineTo(7.4, -53); });
  const fl = f.t * 7;
  fill(ctx, P.pennant, (c) => {
    c.moveTo(7.6, -53);
    for (let k = 1; k <= 6; k++) c.lineTo(7.6 + k * 2.2, -53 + k * 0.35 + Math.sin(fl - k * 0.9) * 0.7 * (k / 6));
    for (let k = 6; k >= 1; k--) c.lineTo(7.6 + k * 2.2, -50.6 + k * 0.1 + Math.sin(fl - k * 0.9) * 0.7 * (k / 6) - k * 0.25);
    c.lineTo(7.6, -50.4);
    c.closePath();
  });
  fill(ctx, P.pennantDark, box(7.6, -53, 1.2, 2.6));
  // The iron basket, and the fire in it.
  fill(ctx, P.iron, poly([-3.4, -41.2, 3.4, -41.2, 2.2, -38.4, -2.2, -38.4]));
  stroke(ctx, P.iron, 0.5, (c) => { c.moveTo(-1.6, -38.4); c.lineTo(-2.2, -36); c.moveTo(1.6, -38.4); c.lineTo(2.2, -36); });
  ctx.save();
  ctx.translate(0, -41);
  const h1 = 7.5 * (0.85 + 0.15 * Math.sin(f.t * 9.1)), h2 = 5.8 * (0.8 + 0.2 * Math.sin(f.t * 12.7 + 1)), h3 = 3.6 * (0.8 + 0.2 * Math.sin(f.t * 15.3 + 2));
  tongue(ctx, '#ff7a35', 3.4, h1, 1.4 + Math.sin(f.t * 5) * 0.6);
  tongue(ctx, '#ffab45', 2.5, h2, 0.9 + Math.sin(f.t * 6.3) * 0.5);
  tongue(ctx, '#ffe39a', 1.4, h3, 0.4);
  ctx.restore();
  ctx.restore();
  ctx.restore();
  mound(ctx, f, x0 - 12 * S, x0 + 12 * S, top, 14);
  // The fire's glow, then its sparks and smoke blown off downwind. Unclipped.
  const fx = x0, fy = y0 - 44 * S;
  halo(ctx, fx, fy, 30 * S, 0.5 * g * flick);
  halo(ctx, fx, fy, 9 * S, 0.5 * g * flick, [255, 230, 170]);
  for (let i = 0; i < 9; i++) {
    const k = fract(f.t * 0.7 + i / 9);
    const sx = fx + (k * 26 + Math.sin(k * 9 + i * 2) * 3) * S;
    const sy = fy - (4 + k * 18 - k * k * 6) * S;
    fill(ctx, `rgba(255,${200 + ((i * 37) % 50)},120,${(1 - k) * 0.95})`, circle(sx, sy, 0.45 * S));
  }
  for (let i = 0; i < 4; i++) {
    const k = fract(f.t * 0.22 + i / 4);
    puff(ctx, fx + (3 + k * 30) * S, fy - (8 + k * 16) * S, (1.4 + k * 4) * S, 0.35 * (1 - k) * smooth(0, 0.1, k), '#c9c6d4');
  }
}

// ================================================================ THE SNOW GROOMER
// A piste basher crawling along the near crest in the storm: a red cab on long tracks,
// the blade up front, the tiller combing corduroy into the snow behind it. Two headlight
// beams reach out ahead through the snow and an amber beacon on the roof turns; exhaust
// puffs off the stack. It works along the ridge with the run, slower than the camera.
const GROOMER = {
  body: '#cf4b33', bodyDark: '#9e3625', glass: '#bcd3e6', track: '#2e3036', wheel: '#565a63',
  blade: '#4b4f58', tiller: '#6a6e77', snow: '#f4f8fc', stack: '#3a3c42',
};
function paintSnowGroomer(ctx, f) {
  const P = tonePal(GROOMER, f.tone);
  const g = glowGain(f);
  const S = 1.45;
  const run = f.held ? 0 : f.clock * 10;
  const x = f.x + run;
  const y = f.crest(x) + 0.8;
  const th = Math.atan2(f.crest(x + 8) - f.crest(x - 8), 16) * 0.85;
  const toScreen = (px, py) => [x + (px * Math.cos(th) - py * Math.sin(th)) * S, y + (px * Math.sin(th) + py * Math.cos(th)) * S];
  // Corduroy: the combed snow it leaves behind, fine lines along the crest.
  ctx.save();
  clipSky(ctx, f, x - 150, x + 40, 2.5);
  for (let i = 0; i < 3; i++) {
    stroke(ctx, `rgba(255,255,255,${0.35 - i * 0.08})`, 0.5, (c) => {
      const x1 = x - 18 * S, x2 = x - 120;
      c.moveTo(x1, f.crest(x1) + 0.8 + i * 0.9);
      for (let xx = x1; xx >= x2; xx -= 3) c.lineTo(xx, f.crest(xx) + 0.8 + i * 0.9);
    });
  }
  ctx.restore();
  ctx.save();
  clipSky(ctx, f, x - 150, x + 150, 1.4, sceneryHides(f));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(th);
  ctx.scale(S, S);
  const jig = Math.sin(f.t * 14) * 0.12;
  // The tiller behind, on its arm.
  stroke(ctx, P.tiller, 0.8, (c) => { c.moveTo(-11, -3); c.lineTo(-15, -2.4); });
  piece(ctx, P.tiller, (c) => rr(c, -19.5, -3.8, 5.4, 3.4, 1));
  // Tracks: a long rounded belt, road wheels, treads running back.
  piece(ctx, P.track, (c) => rr(c, -12, -4.6, 22, 4.6, 2.3));
  for (const wx of [-9.4, -5, -0.6, 3.8, 7.6]) {
    fill(ctx, P.wheel, circle(wx, -2.3, 1.55));
    fill(ctx, P.track, circle(wx, -2.3, 0.5));
  }
  const tread = fract(f.t * 2.2);
  stroke(ctx, P.wheel, 0.4, (c) => {
    for (let k = 0; k < 11; k++) { const tx = -11 + ((k + tread) * 2) % 22; c.moveTo(tx, -4.6); c.lineTo(tx, -3.9); }
  });
  ctx.translate(0, jig);
  // Hull and cab.
  piece(ctx, P.body, poly([-11.5, -4.6, 10.2, -4.6, 11, -8.6, 7.6, -10, -11.5, -10]));
  fill(ctx, P.bodyDark, box(-11.5, -6.2, 21.6, 1.1));
  piece(ctx, P.body, poly([-5, -10, 7.4, -10, 5.8, -17.2, -4.4, -17.2]));
  // Windows, lit a little from inside at dusk.
  fill(ctx, mix(GROOMER.glass, '#ffd98a', 0.35 * g), poly([-3.4, -11, 5.9, -11, 4.7, -16.2, -3.2, -16.2]));
  fill(ctx, P.body, box(0.8, -16.2, 0.8, 5.2));
  // Snow on the roof, the exhaust stack, the beacon.
  fill(ctx, P.snow, (c) => { c.moveTo(-4.8, -17.1); c.quadraticCurveTo(0.7, -18.6, 6.2, -17.1); c.closePath(); });
  stroke(ctx, P.stack, 0.9, (c) => { c.moveTo(-8.6, -10); c.lineTo(-8.6, -15); });
  const spin = fract(f.t * 1.4);
  const beacon = 0.35 + 0.65 * Math.max(0, Math.cos(spin * TAU));
  fill(ctx, P.stack, box(-0.3, -18.4, 1.8, 0.6));
  fill(ctx, mix('#6a5040', '#ffb530', beacon * (0.5 + 0.5 * g)), (c) => rr(c, 0, -19.8, 1.2, 1.5, 0.5));
  // The blade up front, and the headlamps.
  piece(ctx, P.blade, (c) => { c.moveTo(10.4, -9.6); c.quadraticCurveTo(14.6, -7.6, 14, -0.4); c.lineTo(12.4, -0.4); c.quadraticCurveTo(12.6, -6.6, 10.2, -8.4); c.closePath(); });
  stroke(ctx, P.blade, 0.8, (c) => { c.moveTo(8.8, -6); c.lineTo(11.4, -5.2); });
  fill(ctx, '#fff6dc', circle(6.5, -15.6, 0.6));
  fill(ctx, '#fff6dc', circle(10.3, -8.9, 0.55));
  ctx.restore();
  ctx.restore();
  // The beams, reaching out ahead into the snow; the beacon's flash; the lamps' glare.
  // Drawn outside the clip, in screen space.
  const beam = (px, py, len, spread, a) => {
    const [bx, by] = toScreen(px, py);
    const dir = th + 0.06;
    const ex = bx + Math.cos(dir) * len, ey = by + Math.sin(dir) * len;
    const gr = ctx.createLinearGradient(bx, by, ex, ey);
    gr.addColorStop(0, `rgba(255,244,214,${a})`);
    gr.addColorStop(1, 'rgba(255,244,214,0)');
    fill(ctx, gr, (c) => {
      c.moveTo(bx, by);
      c.lineTo(ex - Math.sin(dir) * spread, ey + Math.cos(dir) * spread * 0.6);
      c.lineTo(ex + Math.sin(dir) * spread * 0.3, ey - Math.cos(dir) * spread * 0.9);
      c.closePath();
    });
    halo(ctx, bx, by, 4 * S, a * 1.2, [255, 244, 214]);
  };
  const a = 0.18 + 0.32 * g;
  beam(6.5, -15.6, 62 * S / 1.45, 12, a);
  beam(10.3, -8.9, 52 * S / 1.45, 9, a * 0.9);
  const [rx, ry] = toScreen(0.6, -19.2);
  halo(ctx, rx, ry, 9 * S, 0.5 * beacon * (0.4 + 0.6 * g), [255, 181, 48]);
  // Exhaust.
  for (let i = 0; i < 4; i++) {
    const k = fract(f.t * 0.5 + i / 4);
    const [sx, sy] = toScreen(-8.6, -15.5);
    puff(ctx, sx - k * 14, sy - k * 12, 0.8 + k * 2.4, 0.45 * (1 - k), '#8a8a94');
  }
}

// ================================================================ in the levels
// [kind, fraction of the stage its pinned point arrives mid-picture at, facing]. The herd
// (frost-2, 0.78-0.95), the chair lift (frost-1's start) and the sleigh (frost-3's
// finish) are frostLandmarks.js's and are left their own stretches.
//
// NOTHING BEHIND THE HIGH PATH (Peter, 25 Sep 2026: "there is a high path that I would like
// to avoid having animation behind as it's not seen"): Frost's spring-pad fork lifts the
// run onto the sky road at 0.55 for ~6 s, about 0.53-0.65 of every stage, so nothing
// passes then. Frost-2's wolves and sled moved earlier on his word ("say 25 % and 40%"),
// the cabin ahead of them; frost-1's wolves came forward out of it too.
//
// Each fraction was nudged with work/local/frost-v2/tune.js to the nearest point whose spot
// (resolveSpot) has its foot clear of the foreground hills through the pass and no
// glacier or fortress behind it — at ZOOM 2, the gallery's; the device's zoom moves the
// ridge under a point, so in a run the spot lands a little either side. A spot can sit
// up to 660 px either side of its pinned point; at ZOOM 2 each passes mid-screen at about: frost-1 fox 21%, wolves 29%, bears 44%,
// igloo 86%; frost-2 cabin 5%, wolves 21%, sled 40%; frost-3 wolves 21% (before the
// storm's first step up — nearer the start a fortress stood behind them).
export const FROST_WILDLIFE = Object.freeze({
  1: [['fox', 0.22], ['wolves', 0.312], ['bears', 0.442], ['igloo', 0.872]],
  2: [['cabin', 0.07], ['wolves', 0.232, -1], ['sled', 0.402]],
  3: [['wolvesFire', 0.19], ['beacon', 0.37], ['groomer', 0.69], ['sledLantern', 0.78]],
});
// HOW EACH IS PLACED — ONCE, AND THEN IT STAYS PUT (Peter, 25 Sep 2026: "noticed wolves
// teleporting in level 2 ... these must be static ... all of these one off things need
// to be stable"; "they disappeared before the edge"). An item's spot is worked out one
// time per slot, from the picture the camera has when the item is mid-screen (and a
// picture either side, so the ridge's scenery is known well past the item's ends), as an
// offset from its pinned point; after that it rides the near ridge like the ridge's own
// rocks, and is drawn for exactly as long as any of its ink is on screen.
//
// `extent` is the ink's span across the pass, relative to the spot, walking included.
// `summit` ones stand in a crown flat enough that the drift under them never bridges a
// dip; `avoid` is what may not stand across that span — a tree or rock in front of a
// building, or a tree in front of anything (Peter: "make sure there are no trees in front
// of these"); walkers may pass behind a low rock, the way the reindeer do.
const FROST_WILDLIFE_KINDS = {
  wolves: { paint: paintWolves, summit: true, extent: [-48, 48], avoid: 'all' },
  wolvesFire: { paint: paintWolvesFire, summit: true, extent: [-44, 44], avoid: 'all' },
  cabin: { paint: paintCabin, summit: true, extent: [-32, 42], avoid: 'all' },
  igloo: { paint: paintIgloo, summit: true, extent: [-30, 30], avoid: 'all' },
  fox: { paint: paintFox, summit: true, extent: [-46, 40], avoid: 'all' },
  bears: { paint: paintPolarBears, extent: [-18, 72], avoid: 'pines' },
  sled: { paint: paintDogSled, extent: [-96, 92], avoid: 'pines' },
  sledLantern: { paint: (ctx, f) => paintDogSled(ctx, { ...f, lantern: true }), extent: [-96, 92], avoid: 'pines' },
  beacon: { paint: paintBeaconTower, summit: true, extent: [-16, 30], avoid: 'all' },
  groomer: { paint: paintSnowGroomer, extent: [-30, 84], avoid: 'pines' },
};
const NEAR_FACTOR = 0.3;          // the near ridge's parallax
const FROST_RUN_SPEED = 201.6;    // world px/s: frost's 18144 px in 90 s
const PORTRAIT_PACE = 1.5;        // portrait's narrower picture is crossed sooner
const SUMMIT_SAG = 8;             // px the crest may fall across a summit item's middle 60%
function sceneryExtent(p) {
  return p.surface && p.surface.length > 1
    ? [p.x + p.surface[0].dx, p.x + p.surface[p.surface.length - 1].dx] : [p.x - 10, p.x + 10];
}
// The spot's offset from the pinned point, in near-ridge px, or null when the stretch has
// no spot that passes (then the item is left out rather than put somewhere wrong).
// `fr.crestAt(cam)` and `fr.sceneryAt(cam)` are the ridge at another camera.
function resolveSpot(fr, K, camMid, reject = () => false) {
  const k = NEAR_FACTOR * ZOOM;
  const center = fr.view.left + fr.view.width / 2;
  const crest = fr.crestAt(camMid);
  const spans = [];
  for (const d of [-660, -440, -220, 0, 220, 440, 660]) {
    const cam = camMid + d / k;
    for (const p of fr.sceneryAt(cam)) {
      if (p.kind === 'snowbank') continue;
      if (K.avoid === 'pines' && p.kind !== 'pine') continue;
      const [a, b] = sceneryExtent(p);
      spans.push([a + d, b + d]);
    }
  }
  const [lo, hi] = K.extent;
  // Three ridge periods either side: the zoom is the device's (1.6 on a desktop, 2
  // zoomed in, 2.2 on a phone, more in portrait) and moves the near ridge under a pinned
  // point, and a spot must also keep its distance from the stage's others, so the search
  // has to be wide enough to find a clear crown at any of them. Nearest wins.
  for (let dx = 0; dx <= 660; dx += 1) {
    for (const X of dx ? [center + dx, center - dx] : [center]) {
      if (reject(camMid + (X - center) / k)) continue;
      if (spans.some(([a, b]) => b > X + lo - 6 && a < X + hi + 6)) continue;
      if (K.summit) {
        const y = crest(X);
        if (!(y <= crest(X - 3) && y <= crest(X + 3))) continue;
        let sag = 0;
        for (let x = X + lo * 0.6; x <= X + hi * 0.6; x += 2) sag = Math.max(sag, crest(x) - y);
        if (sag > SUMMIT_SAG) continue;
      }
      return X - center;
    }
  }
  return null;
}
// Where nothing of this file may pass mid-screen, as fractions of the stage: the spring-
// pad high path (cabinets.js frost `forks`, at 0.55 with a 6 s dwell — the camera is up
// on the sky road and the ridge out of sight), and the stretches frostLandmarks.js's own
// set pieces hold (the chair lift at frost-1's start, the herd, the sleigh at the finish).
const FROST_WILDLIFE_KEEP_OUT = {
  1: [[0.52, 0.66], [0, 0.12]],
  2: [[0.52, 0.66], [0.76, 0.97]],
  3: [[0.52, 0.66], [0.93, 1]],
};
const MIN_GAP = 0.06;             // of the stage between two items passing (≈5 s)
// The stage's spots, settled in schedule order so each keeps MIN_GAP from the ones
// before it (the zoom can slide two toward one summit).
const spots = new Map();
function stageSpot(fr, list, i) {
  const key = `${fr.stageIndex}:${fr.totalDist}:${fr.portrait ? 1 : 0}:${ZOOM}`;
  let row = spots.get(key);
  if (!row) {
    if (spots.size > 16) spots.clear();
    row = [];
    spots.set(key, row);
  }
  const k = NEAR_FACTOR * ZOOM;
  const keepOut = FROST_WILDLIFE_KEEP_OUT[fr.stageIndex] || [];
  for (let j = 0; j <= i; j++) {
    if (row[j] !== undefined) continue;
    const [kind, at] = list[j];
    const camMid = at * fr.totalDist;
    const taken = row.slice(0, j).filter((r) => r).map((r) => r.pass);
    const reject = (cam) => {
      const f = cam / fr.totalDist;
      return keepOut.some(([a, b]) => f > a && f < b)
        || taken.some((c) => Math.abs(c - cam) < MIN_GAP * fr.totalDist);
    };
    const dx = resolveSpot(fr, FROST_WILDLIFE_KINDS[kind], camMid, reject);
    row[j] = dx == null ? null : { dx, pass: camMid + dx / k };
  }
  return row[i];
}
// Each gag's clock starts as it comes into view, latched on the wall clock like the
// coyote's (keyed by stage and slot; cleared when it is back off the right edge, so a
// retry that jumps the camera back plays it again). A picture with no run takes the
// clock from how far it has come in.
const latch = new Map();
/**
 * The near ridge's wildlife for this stage. `fr`: { t, camX, view, crest, crestAt, color,
 * light, scenery, sceneryAt, depth, stageIndex, totalDist, run, portrait }.
 */
export function drawFrostWildlife(ctx, fr) {
  if (fr.depth !== 'near') return;
  const list = FROST_WILDLIFE[fr.stageIndex];
  if (!list || !Number.isFinite(fr.totalDist) || fr.totalDist <= 0) return;
  const k = NEAR_FACTOR * ZOOM;
  const right = fr.view.left + fr.view.width;
  const center = fr.view.left + fr.view.width / 2;
  const pace = fr.portrait ? PORTRAIT_PACE : 1;
  let tone = null;
  for (let i = 0; i < list.length; i++) {
    const [kind, at, facing = 1] = list[i];
    const K = FROST_WILDLIFE_KINDS[kind];
    const camMid = at * fr.totalDist;
    const pinned = center + (camMid - fr.camX) * k;
    const [lo, hi] = K.extent;
    // Nowhere near the picture: not even worth placing yet.
    if (pinned + hi + 680 < fr.view.left || pinned + lo - 680 > right) continue;
    const spot = stageSpot(fr, list, i);
    if (!spot) continue;
    const dx = spot.dx;
    const x = pinned + dx;
    if (x + hi + 12 < fr.view.left || x + lo - 12 > right) continue;
    const entry = right - 24;
    const lkey = `${fr.stageIndex}:${kind}:${at}`;
    let clock = 0;
    if (fr.run) {
      if (x > entry) latch.delete(lkey);
      else {
        if (!latch.has(lkey) || latch.get(lkey) > fr.t) {
          if (latch.size > 32) latch.clear();
          latch.set(lkey, fr.t);
        }
        clock = (fr.t - latch.get(lkey)) * pace;
      }
    } else clock = Math.max(0, (entry - x) / (FROST_RUN_SPEED * k)) * pace;
    tone = tone || toner(fr);
    ctx.save();
    K.paint(ctx, { ...fr, x, clock, held: false, tone, facing });
    ctx.restore();
  }
}

// The painters and the light, for the bake-off (src/dev/frost-background-v2.js); the
// summit rule and the kinds for the placement tuner (work/local).
export { resolveSpot as frostWildlifeSpot, stageSpot as frostWildlifeStageSpot, FROST_WILDLIFE_KINDS };
// The cut-paper kit, for bake-off candidates drawn the same way (src/dev/).
export const FROST_PAPER = {
  fill, stroke, poly, circle, oval, box, cubic, rr, arch, piece, strip, mix, rgba, tonePal, glowGain,
  clipSky, groundTop, clipAbove, mound, sceneryHides, puff, fract, clamp01, smooth,
};
export {
  paintWolves as drawFrostWolves, paintCabin as drawFrostCabin, paintIgloo as drawFrostIgloo,
  paintPolarBears as drawFrostPolarBears, paintFox as drawFrostFox, paintDogSled as drawFrostDogSled,
  paintBeaconTower as drawFrostBeaconTower, paintSnowGroomer as drawFrostSnowGroomer,
  paintWolvesFire as drawFrostWolvesFire,
  toner as frostWildlifeToner,
};
