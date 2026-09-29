// SPEED ZONE in MID-CENTURY MODERN — THE COYOTE. The shipped one is the CHUCK JONES
// model (Peter, 28 Sep 2026, from the coyote bake-off, lab section
// speed-mcm-coyote-bakeoff): the Maurice Noble-era Wile E. — scrawny and tall, a big
// cranium with enormous ears, a pointed snout ending in a black nose, heavy sly lids.
//
// This file is the coyote's engine: the paper coyote's pose model and show clocks
// (drawDesertCoyote in desertLandmarks.js), re-played so each show lands on the same beat
// as the paper one, and its print — the whole silhouette printed in ink a hair larger
// than the figure and slipped ~1 px up and right, then the colour over it: a
// misregistered key plate that can only ever show along the figure's own edge. A model
// is only the drawing; every model gets the same seat, clocks and shows. The bake-off's
// other candidates (src/dev/speed-mcm/coyote-candidates.js) are models on this engine.
//
// The first re-cut (CURRENT_MODEL below, Peter: "looks a bit like an aardvark!") is kept
// as the bake-off's control.
const TAU = Math.PI * 2;
export const fract = (v) => v - Math.floor(v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (e0, e1, v) => {
  const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};
function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, k) {
  const A = rgbOf(a);
  const B = rgbOf(b);
  const c = (i) => Math.round(lerp(A[i], B[i], k)).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}
export function rgba(hex, a) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

// The key plate: how far the ink silhouette slips (screen px) and how much it grows.
const SLIP = [0.7, -0.55];
const GROW = 0.62;

// ------------------------------------------------------------------ drawing kit
export const poly = (pts) => (c) => {
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
};
export const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
export const lerpPts = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// One drawing call serves both passes. In the 'ink' pass every silhouette part is filled
// and stroked in ink (the stroke is the growth, kept GROW screen px whatever the local
// scale); in the 'paint' pass each part is filled in its own colour. Details inside the
// figure (sil = false) only paint.
// FRAME_SCALE is the frame's own device scale (2 on a 2x card), taken as the coyote is
// entered, so SLIP and GROW are in the frame's logical px at any local scale.
let FRAME_SCALE = 1;
let GROW_NOW = GROW;
export function part(ctx, pass, path, fill, sil = true) {
  if (pass !== 'paint') {
    if (!sil) return;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    if (GROW_NOW > 0) {
      const m = ctx.getTransform();
      ctx.lineWidth = (2 * GROW_NOW) / (Math.hypot(m.a, m.b) / FRAME_SCALE);
      ctx.stroke();
    }
    return;
  }
  ctx.beginPath();
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
// A thin line INSIDE the figure (a shut eye, a brow): paint pass only.
export function line(ctx, pass, color, width, path) {
  if (pass !== 'paint') return;
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// One silhouette plate: the figure's outline filled in `colour`, grown by `grow` and
// slipped by `slip` (both frame px, the slip in screen directions whichever way the
// figure faces).
export function plate(ctx, colour, slip, grow, fn) {
  const m = ctx.getTransform();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, slip[0] * FRAME_SCALE, slip[1] * FRAME_SCALE);
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineJoin = 'round';
  GROW_NOW = grow;
  fn('plate');
  ctx.restore();
}

// Draw `fn(pass)` twice: the slipped ink silhouette, then the colour over it.
export function printed(ctx, ink, fn) {
  plate(ctx, ink, SLIP, GROW, fn);
  fn('paint');
}

// ------------------------------------------------------------------ poses
// The paper's own pose model and show clocks, re-played so each show lands on the same
// beat as the shipped coyote's.
export function rest(t) {
  return {
    lie: 0, heave: 0, lean: 0, tw: Math.sin(t * 2.2) * 0.5,
    head: {
      rot: Math.sin(t * 0.8) * 0.12, jaw: 0, eye: 'open', earBack: 0, lids: 0,
      flick: fract(t * 0.43) < 0.06 ? 0.3 : 0, tongue: 0,
    },
    rings: 0, ringDir: 0, ringRate: 1.2, ringSize: 1, marks: [],
  };
}
export function howlAt(p, u, t, from, to, rate = 6) {
  const up = smooth(from, from + 0.3, u) * (1 - smooth(to, to + 0.4, u));
  const howl = u > from + 0.3 && u < to;
  p.head.rot = -up * 0.95 + p.head.rot * (1 - up);
  p.head.jaw = howl ? 0.35 + Math.sin(t * rate) * 0.08 : 0;
  p.head.eye = howl ? 'shut' : 'open';
  p.heave = howl ? Math.sin(t * 9) * 0.25 : 0;
  p.rings = howl ? 1 : up > 0.5 ? 0.4 : 0;
  p.ringDir = -up * 0.95 - 0.1;
  return p;
}
// The default: head up at 0.5 of a 5 s cycle, the song over 0.58..0.88.
export function howlLoop(t) {
  const p = rest(t);
  const cyc = fract(t / 5);
  const up = cyc < 0.5 ? 0 : cyc < 0.58 ? smooth(0.5, 0.58, cyc) : cyc < 0.88 ? 1 : 1 - smooth(0.88, 0.98, cyc);
  const howl = cyc > 0.58 && cyc < 0.88;
  p.head.rot = -up * 0.95 + p.head.rot * (1 - up);
  p.head.jaw = howl ? 0.35 + Math.sin(t * 6) * 0.08 : 0;
  p.head.eye = howl ? 'shut' : 'open';
  p.heave = howl ? Math.sin(t * 9) * 0.25 : 0;
  p.rings = howl ? 1 : up > 0.5 ? 0.4 : 0;
  p.ringDir = -up * 0.95 - 0.1;
  return p;
}
// THE HOWL HELD TO THE EDGE (Peter, 28 Sep 2026: "he should be howling at least from
// halfway across and keep howling until off screen"). `u` is seconds since the run's
// latch let go: the head comes up over 0.3 s and the song runs from there, never
// ending. Taken with the loop's own rise, so a head already up stays up — no dip.
export function howlHold(t, u) {
  const p = howlLoop(t);
  const cyc = fract(t / 5);
  const loopUp = cyc < 0.5 ? 0 : cyc < 0.58 ? smooth(0.5, 0.58, cyc) : cyc < 0.88 ? 1 : 1 - smooth(0.88, 0.98, cyc);
  const up = Math.max(loopUp, smooth(0, 0.3, u));
  const howl = (cyc > 0.58 && cyc < 0.88) || u > 0.3;
  p.head.rot = -up * 0.95 + rest(t).head.rot * (1 - up);
  p.head.jaw = howl ? 0.35 + Math.sin(t * 6) * 0.08 : 0;
  p.head.eye = howl ? 'shut' : 'open';
  p.heave = howl ? Math.sin(t * 9) * 0.25 : 0;
  p.rings = howl ? 1 : up > 0.5 ? 0.4 : 0;
  p.ringDir = -up * 0.95 - 0.1;
  return p;
}
const HEAD_SIT = [2.6, -12.6];
const HEAD_LIE = [9.0, -3.2];
// `sit` and `lie` are the model's head anchors, where the doze's Z's rise from.
function yawnShow(u, t, dir, sit = HEAD_SIT, lieAt = HEAD_LIE, markAt = [0, 0]) {
  const p = rest(t);
  const h = p.head;
  if (u >= 7.8) return [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, howlAt(p, u, t, 8.2, 9.9)]];
  const yawn = smooth(0.8, 1.3, u) * (1 - smooth(2.2, 2.5, u));
  h.rot = lerp(h.rot, -0.5, yawn);
  h.jaw = yawn * (1.05 + (yawn > 0.95 ? Math.sin(t * 16) * 0.03 : 0));
  h.eye = yawn > 0.25 ? 'shut' : 'open';
  h.earBack = 0.75 * yawn;
  h.tongue = yawn;
  p.heave = 0.5 * yawn;
  p.lean = -0.05 * yawn;
  const lie = smooth(2.6, 3.4, u) * (1 - smooth(6.4, 7.1, u));
  p.lie = lie;
  if (lie > 0) {
    h.rot = lerp(h.rot, 0.12, lie);
    if (u > 3.0 && u < 6.3) h.eye = 'shut';
    else if (u >= 6.3 && u < 6.7) h.lids = 0.6;
    p.heave += Math.sin(t * 2.4) * 0.3 * lie;
    h.flick = u > 5.1 && u < 5.25 ? 0.5 : 0;
    p.tw = lerp(p.tw, Math.sin(t * 0.9) * 0.3, lie);
  }
  const ax = lerp(sit[0], lieAt[0], lie);
  const ay = lerp(sit[1], lieAt[1], lie);
  for (let i = 0; i < 4; i++) {
    const age = (u - 3.5 - i * 0.8) / 1.7;
    if (age <= 0 || age >= 1 || u > 6.4) continue;
    p.marks.push({ x: ax + markAt[0] + 2 + age * 3.5 + Math.sin(age * 5 + i) * 0.6, y: ay + markAt[1] - 4.5 - age * 8,
      s: 0.9 + age * 0.7, a: Math.min(1, age * 5) * (1 - smooth(0.65, 1, age)) });
  }
  return [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, p]];
}
// `pupDx` is how far along the ledge the pup sits (a bigger-headed model wants room).
function chorusShow(u, t, dir, pupDx = 9.5) {
  const A = howlAt(rest(t), u, t, 0.8, 3.4);
  const B = rest(t + 1.3);
  const upB = smooth(1.6, 1.8, u) * (1 - smooth(3.4, 3.8, u));
  const yipT = u - 1.8;
  const yip = yipT > 0 && yipT < 0.75 ? Math.max(0, Math.sin((yipT / 0.25) * Math.PI)) : 0;
  const howlB = u > 2.55 && u < 3.4;
  B.head.rot = -upB * (howlB ? 1.05 : 0.7) + B.head.rot * (1 - upB);
  B.head.jaw = howlB ? 0.4 + Math.sin(t * 7.3) * 0.08 : yip * 0.45;
  B.head.eye = howlB ? 'shut' : 'open';
  B.rings = howlB ? 1 : yip > 0.3 ? 0.8 : 0;
  B.ringDir = B.head.rot - 0.1;
  B.ringRate = 1.9;
  B.ringSize = 0.62;
  const after = smooth(3.9, 4.3, u) * (1 - smooth(5.2, 5.6, u));
  A.head.rot = lerp(A.head.rot, 0.62, after);
  if (after > 0.8) A.head.eye = 'shut';
  B.head.rot = lerp(B.head.rot, -0.4, after);
  B.tw += Math.sin(t * 8) * 0.9 * after;
  return [
    [{ ox: -6 * dir, oy: -12.2, s: 1.5, dir }, A],
    [{ ox: pupDx * dir, oy: -11.9, s: 1.1, dir, headScale: 1.12, pup: true }, B],
  ];
}

// ------------------------------------------------------------------ the side figure
// Sitting (lie 0) and lying along the ledge (lie 1), as flat angular plates.
const TORSO = [
  [-6.6, -3.6, -5.4, -9.2, -1.8, -12.4, 0.9, -13.6, 4.6, -10.6, 5.0, -5.4, 3.0, -0.8, -3.0, -0.4],
  [-6.6, -3.2, -4.2, -5.6, 0.5, -6.8, 4.4, -6.8, 8.0, -4.8, 8.7, -2.2, 6.6, -0.3, -3.0, -0.2],
];
// The darker saddle down the back, from the haunch to the withers.
const SADDLE = [
  [-6.6, -3.6, -5.4, -9.2, -1.8, -12.4, 0.9, -13.6, 0.1, -12.0, -3.0, -10.0, -4.8, -6.8, -5.3, -3.4],
  [-6.6, -3.2, -4.2, -5.6, 0.5, -6.8, 4.4, -6.8, 4.1, -5.9, 0.4, -5.8, -3.8, -4.7, -5.3, -3.0],
];
const CHEST = [
  [4.6, -10.6, 5.2, -5.8, 3.3, -1.1, 1.9, -1.1, 3.1, -6.0, 2.4, -10.9],
  [8.0, -4.8, 8.9, -2.4, 6.8, -0.5, 5.4, -0.5, 7.0, -2.6, 6.4, -5.2],
];

function currentBody(ctx, pass, K, pose) {
  const k = pose.lie;
  const h = pose.heave;
  const tw = pose.tw;
  // The brush: a long tapering tail curled round the front of the paws, tip dark.
  part(ctx, pass, poly([-6.0, -1.9, -7.7, -0.7, -6.4, 0.75, -1.2, 1.0, 5.6 + tw, -0.25, 2.4, -1.5, -2.6, -2.1]), K.coat);
  part(ctx, pass, poly([3.0, 0.72, 5.6 + tw, -0.25, 3.3, -1.25]), K.tip);
  // Haunch, its shaded back, the torso wedge, the saddle, the bib.
  part(ctx, pass, oval(-3, lerp(-3.7, -2.9, k), lerp(4.9, 5.0, k), lerp(3.9, 3.0, k), -0.12), K.coat);
  part(ctx, pass, (c) => { c.ellipse(-3.5, lerp(-2.7, -2.2, k), 3.9, lerp(2.7, 2.1, k), -0.12, 0.45 * Math.PI, 1.3 * Math.PI); c.closePath(); }, K.dark, false);
  const T = lerpPts(TORSO[0], TORSO[1], k);
  T[8] += h;
  T[10] += h;
  part(ctx, pass, poly(T), K.coat);
  part(ctx, pass, poly(lerpPts(SADDLE[0], SADDLE[1], k)), K.back, false);
  const C = lerpPts(CHEST[0], CHEST[1], k);
  C[0] += h;
  C[2] += h;
  part(ctx, pass, poly(C), K.cream, false);
  // Forelegs: straight down sitting, laid forward along the ledge lying; cream paws.
  for (const lx of [1.6, 3.3]) {
    ctx.save();
    ctx.translate(lerp(lx, lx + 3.6, k), lerp(-8.2, -1.9, k));
    ctx.rotate(lerp(0, -Math.PI / 2, k));
    const L = lerp(8.2, 6.8, k);
    part(ctx, pass, poly([-0.8, 0, 0.75, 0, 0.6, L, -0.6, L]), lx < 2 ? K.dark : K.coat);
    ctx.restore();
    part(ctx, pass, oval(lerp(lx + 0.3, lx + 10.3, k), lerp(-0.35, -0.55, k), lerp(1.05, 1.15, k), 0.52), K.cream);
  }
}

// The head: big pointed ears, a flat skull running into a long tapered snout, a cream
// muzzle, and a jaw that drops for the howl and the yawn.
function currentHead(ctx, pass, K, h) {
  ctx.rotate(h.rot);
  for (const [ex, rot0, far] of [[-0.7, -0.28 - h.flick, true], [0.9, 0.04, false]]) {
    const rot = rot0 - h.earBack * 0.95;
    const L = 1 - h.earBack * 0.25;
    const tip = [ex + Math.sin(rot) * 4.6 * L, -2.8 - Math.cos(rot) * 4.8 * L];
    part(ctx, pass, poly([ex - 1.25, -2.4, tip[0], tip[1], ex + 1.25, -2.9]), far ? K.dark : K.coat);
    if (!far) part(ctx, pass, poly([ex - 0.5, -2.9, lerp(ex, tip[0], 0.78), lerp(-2.9, tip[1], 0.78), ex + 0.55, -3.1]), K.ear, false);
  }
  const jaw = h.jaw;
  if (jaw > 0.05) {
    const jx = 2.3 + Math.cos(jaw) * 4.9;
    const jy = 0.1 + Math.sin(jaw) * 4.9;
    part(ctx, pass, poly([2.4, -0.3, 7.3, -0.55, jx, jy]), K.mouth);
    ctx.save();
    ctx.translate(2.3, 0.1);
    ctx.rotate(jaw);
    if (h.tongue > 0.02) part(ctx, pass, oval(3.0, -0.35, 1.9 * h.tongue, 0.5, -0.1), K.tongue, false);
    part(ctx, pass, poly([0, -0.35, 4.9, -0.15, 4.7, 0.55, 0, 1.15]), K.cream);
    ctx.restore();
  }
  part(ctx, pass, poly([-1.9, -1.0, -1.1, -3.0, 1.3, -3.5, 2.9, -2.8, 7.3, -1.35, 7.6, -0.6, 7.05, 0.05, 2.4, 0.45, 0.8, 1.0, -1.0, 0.75]), K.coat);
  part(ctx, pass, poly([2.5, -0.95, 7.45, -0.8, 7.05, 0.05, 2.4, 0.45]), K.cream, false);
  part(ctx, pass, poly([-1.4, 0.45, 1.7, 0.8, -0.3, 2.1]), K.cream);
  part(ctx, pass, oval(7.4, -0.75, 0.6, 0.5), K.nose, false);
  if (h.eye === 'shut') {
    line(ctx, pass, K.eye, 0.38, (c) => { c.moveTo(1.1, -2.0); c.quadraticCurveTo(1.9, -1.35, 2.8, -1.85); });
  } else {
    part(ctx, pass, oval(1.9, -1.8, 0.88, 0.58, -0.15), K.cream, false);
    part(ctx, pass, oval(2.15, -1.78, 0.42, 0.44), K.eye, false);
    if (h.lids > 0.05) part(ctx, pass, (c) => { c.ellipse(1.9, -1.8, 0.95, 0.66, -0.15, Math.PI, Math.PI + Math.PI * h.lids); c.lineTo(1.9, -1.8); c.closePath(); }, K.coat, false);
  }
  part(ctx, pass, poly([0.7, -2.75, 2.9, -3.0, 2.7, -2.55, 0.9, -2.4]), K.back, false);
}

function rings(ctx, t, K, pose, anchor, reach) {
  if (pose.rings <= 0) return;
  const dirA = pose.ringDir;
  const S = pose.ringSize;
  const mx = anchor[0] + Math.cos(dirA) * reach;
  const my = anchor[1] + Math.sin(dirA) * reach - 1;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const ph = fract(t * pose.ringRate + k / 3);
    ctx.beginPath();
    ctx.arc(mx + Math.cos(dirA) * ph * 9 * S, my + Math.sin(dirA) * ph * 9 * S, (1.2 + ph * 4.4) * S, dirA - 0.75, dirA + 0.75);
    ctx.strokeStyle = rgba(K.song, 0.8 * (1 - ph) * pose.rings);
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }
}

// A Z for the doze: a flat cream plate with the letter cut in ink, un-mirrored.
function zMark(ctx, K, m, dir) {
  if (m.a <= 0.01) return;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(dir * m.s, m.s);
  const z = (c) => { c.moveTo(-1, -1); c.lineTo(1, -1); c.lineTo(-1, 1); c.lineTo(1, 1); };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  z(ctx);
  ctx.strokeStyle = rgba(K.spark, m.a * 0.9);
  ctx.lineWidth = 1.05;
  ctx.stroke();
  ctx.beginPath();
  z(ctx);
  ctx.strokeStyle = rgba(K.tip, m.a);
  ctx.lineWidth = 0.45;
  ctx.stroke();
  ctx.restore();
}

// A side-on figure from a model: { body(ctx, pass, K, pose), head(ctx, pass, K, head,
// pose), headSit, headLie, ringReach, scale, print(ctx, K, fn) }.
function sideFigure(ctx, t, K, pose, fig, model) {
  ctx.save();
  ctx.translate(fig.ox, fig.oy);
  const s = fig.s * (model.scale ?? 1);
  ctx.scale(s * fig.dir, s);
  if (pose.lean) {
    ctx.translate(-3, 0);
    ctx.rotate(pose.lean);
    ctx.translate(3, 0);
  }
  const lie = model.headLie ?? model.headSit;
  const anchor = [lerp(model.headSit[0], lie[0], pose.lie), lerp(model.headSit[1], lie[1], pose.lie)];
  (model.print ?? ((c, P, fn) => printed(c, P.ink, fn)))(ctx, K, (pass) => {
    model.body(ctx, pass, K, pose);
    ctx.save();
    ctx.translate(anchor[0], anchor[1]);
    if (fig.headScale) ctx.scale(fig.headScale, fig.headScale);
    model.head(ctx, pass, K, pose.head, pose);
    ctx.restore();
  });
  rings(ctx, t, K, pose, anchor, model.ringReach ?? 7.8);
  for (const m of pose.marks) zMark(ctx, K, m, fig.dir);
  ctx.restore();
}

// ------------------------------------------------------------------ the winker
// Sat square to the camera from the start (never turns): haunches either side, the bib,
// both forelegs, the tail out along the ledge; a brow, a slow wink with a flat star off
// the shut eye, a toothy grin and a glint.
function star(ctx, K, x, y, R, rot, a) {
  if (R <= 0.02 || a <= 0.01) return;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? R : R * 0.22;
    if (i === 0) ctx.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    else ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(K.spark, a);
  ctx.fill();
}

function frontHead(ctx, pass, K, h) {
  for (const s of [-1, 1]) {
    const tip = [s * (3.9 - h.flick * s), -7.2];
    part(ctx, pass, poly([s * 2.9, -0.8, tip[0], tip[1], s * 0.6, -2.7]), s < 0 ? K.dark : K.coat);
    part(ctx, pass, poly([s * 2.4, -1.4, lerp(s * 2.4, tip[0], 0.72), lerp(-1.4, tip[1], 0.72), s * 1.1, -2.6]), K.ear, false);
  }
  part(ctx, pass, poly([-2.9, -1.2, -1.6, -3.1, 1.6, -3.1, 2.9, -1.2, 2.6, 0.9, 0, 3.4, -2.6, 0.9]), K.coat);
  for (const s of [-1, 1]) {
    const lift = (s > 0 ? h.wink * 0.35 : 0) + h.grin * 0.25;
    part(ctx, pass, poly([s * 1.2, -2.2, s * 3.1, -0.9, s * 3.3, 1.3 - lift, s * 1.0, 3.0]), K.coat);
  }
  part(ctx, pass, poly([-1.45, -0.9, -1.2, 2.2, 0, 3.4, 1.2, 2.2, 1.45, -0.9]), K.cream, false);
  part(ctx, pass, poly([-0.5, -2.8, 0.5, -2.8, 0.32, 0.6, -0.32, 0.6]), K.back, false);
  const g = h.grin;
  if (g > 0.03) {
    const w = 0.75 + g * 0.95;
    const yM = 2.05;
    const drop = 0.35 + g * 0.8;
    const cu = g * 0.5;
    const mouth = (c) => { c.moveTo(-w, yM - cu); c.quadraticCurveTo(0, yM + drop * 1.3, w, yM - cu); c.quadraticCurveTo(0, yM + drop * 0.3, -w, yM - cu); c.closePath(); };
    part(ctx, pass, mouth, K.mouth, false);
    if (g > 0.4 && pass === 'paint') {
      ctx.save();
      ctx.beginPath();
      mouth(ctx);
      ctx.clip();
      part(ctx, pass, (c) => { c.moveTo(-w, yM - cu); c.quadraticCurveTo(0, yM + drop * 0.3, w, yM - cu); c.lineTo(w, yM - cu + 0.55); c.quadraticCurveTo(0, yM + drop * 0.75, -w, yM - cu + 0.55); c.closePath(); }, '#fffaf0', false);
      ctx.restore();
    }
  } else {
    line(ctx, pass, K.dark, 0.3, (c) => { c.moveTo(0, 1.9); c.lineTo(0, 2.35); c.moveTo(-0.6, 2.5); c.quadraticCurveTo(0, 2.72, 0.6, 2.5); });
  }
  part(ctx, pass, oval(0, 1.45, 0.8, 0.55), K.nose, false);
  const eyeY = -1.0;
  for (const s of [-1, 1]) {
    const ex = s * 1.35;
    const wink = s > 0 ? h.wink : 0;
    part(ctx, pass, oval(ex, eyeY, 0.85, 0.7, s * -0.25), K.cream, false);
    if (wink > 0.6) {
      line(ctx, pass, K.eye, 0.55, (c) => { c.moveTo(ex - 0.8, eyeY + 0.25); c.quadraticCurveTo(ex, eyeY - 0.75, ex + 0.8, eyeY + 0.25); });
      continue;
    }
    part(ctx, pass, oval(ex, eyeY + 0.05, 0.52, 0.58), K.eye, false);
    const lid = Math.max(wink / 0.6, h.blink);
    if (lid > 0.02 && pass === 'paint') {
      ctx.save();
      ctx.beginPath();
      oval(ex, eyeY, 0.95, 0.8, s * -0.25)(ctx);
      ctx.clip();
      const ly = eyeY - 1.0 + 1.8 * Math.min(1, lid);
      part(ctx, pass, (c) => c.rect(ex - 1.2, eyeY - 1.0, 2.4, ly - eyeY + 1.05), K.coat, false);
      ctx.restore();
    }
  }
  if (h.brow > 0.03) {
    const b = h.brow;
    line(ctx, pass, K.back, 0.5, (c) => { c.moveTo(-2.25, eyeY - 1.05 - b * 0.5); c.quadraticCurveTo(-1.4, eyeY - 1.55 - b * 0.9, -0.55, eyeY - 1.2 - b * 0.35); });
  }
}

const FRONT_HEAD = [0, -15.2];
const FRONT_S = 1.14;
export function winkShow(ctx, t, K, u, idleBlink = null) {
  const brow = smooth(0.4, 0.7, u) * (1 - smooth(2.8, 3.1, u));
  const wink = smooth(0.8, 1.15, u) * (1 - smooth(2.3, 2.45, u));
  const grin = (0.3 * smooth(0.4, 0.7, u) + 0.7 * smooth(1.1, 1.3, u)) * (1 - smooth(3.0, 3.3, u));
  const tilt = 0.16 * smooth(1.0, 1.3, u) * (1 - smooth(2.2, 2.5, u));
  const blink = idleBlink != null ? idleBlink
    : u > 4.6 && u < 4.75 ? Math.sin(((u - 4.6) / 0.15) * Math.PI) : 0;
  const wag = Math.sin(t * 10) * 0.9 * smooth(1.2, 1.4, u) * (1 - smooth(2.5, 2.8, u));
  const flick = fract(t * 0.43) < 0.06 ? 0.3 : 0;
  ctx.save();
  ctx.translate(0, -12.2);
  ctx.scale(1.5, 1.5);
  const tw = Math.sin(t * 2.2) * 0.5 + wag;
  printed(ctx, K.ink, (pass) => {
    part(ctx, pass, poly([-3.4, -2.5, -7.6, -2.1, -9.8 + tw * 0.4, -0.9 + tw * 0.3, -7.6, 0.2, -3.4, -0.2]), K.coat);
    part(ctx, pass, poly([-8.0 + tw * 0.3, -1.75, -9.8 + tw * 0.4, -0.9 + tw * 0.3, -7.8, -0.05]), K.tip);
    for (const s of [-1, 1]) part(ctx, pass, oval(s * 3.2, -2.9, 2.6, 2.9), s < 0 ? K.dark : K.coat);
    part(ctx, pass, poly([-4.1, -1.6, -4.0, -8.6, -2.2, -12.8, 2.2, -12.8, 4.0, -8.6, 4.1, -1.6]), K.coat);
    part(ctx, pass, poly([-2.2, -12.8, -1.2, -12.0, 1.2, -12.0, 2.2, -12.8]), K.back, false);
    part(ctx, pass, poly([-1.8, -11.8, -2.3, -6.0, -1.3, -2.2, 1.3, -2.2, 2.3, -6.0, 1.8, -11.8]), K.cream, false);
    for (const s of [-1, 1]) {
      part(ctx, pass, poly([s * 1.05 - 0.75, -8, s * 1.05 + 0.75, -8, s * 1.05 + 0.6, 0, s * 1.05 - 0.6, 0]), s < 0 ? K.dark : K.coat);
      part(ctx, pass, oval(s * 1.1, -0.3, 1, 0.5), K.cream);
      part(ctx, pass, oval(s * 4.3, -0.35, 1.1, 0.45), K.cream);
    }
    ctx.save();
    ctx.translate(FRONT_HEAD[0], FRONT_HEAD[1]);
    ctx.rotate(tilt);
    ctx.scale(FRONT_S, FRONT_S);
    frontHead(ctx, pass, K, { brow, wink, grin, blink, flick });
    ctx.restore();
  });
  const [hx, hy] = FRONT_HEAD;
  const k = (u - 1.13) / 0.8;
  if (k > 0 && k < 1) {
    star(ctx, K, hx + 4.0 * FRONT_S, hy + (-1.0 - 1.4) * FRONT_S,
      (k < 0.14 ? k / 0.14 : 1 - ((k - 0.14) / 0.86) * 0.55) * 3.6, k * 1.4, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
  }
  const gk = (u - 2.5) / 0.45;
  if (gk > 0 && gk < 1) star(ctx, K, hx + 0.9, hy + 2.6, 1.5 * Math.sin(gk * Math.PI), gk * 2, 1);
  ctx.restore();
}

// ------------------------------------------------------------------ entry
const SHOWS = {
  yawn: { loop: 10.4, start: 0.55 },
  chorus: { loop: 6, start: 0.5 },
  wink: { loop: 6, start: 0.2 },
  winkWait: { loop: 6, start: 0.2 },
};
export const MCM_COYOTE_MODES = ['howl', 'yawn', 'chorus', 'wink'];
// THE WINK WAITS FOR THE FINISH, as the paper one does (desertLandmarks.js 'winkWait'):
// until the run says the hero is on the finish pad (`since` null) it sits square on and
// only blinks; then it plays the wink once and holds this still moment of it.
const WINK_IDLE_U = 5.5;
function idleBlink(t) {
  const k = (t % 3.3) / 0.16;
  return k < 1 ? Math.sin(k * Math.PI) : 0;
}

// The model this file draws: the first MCM coyote, the bake-off's control.
export const CURRENT_MODEL = {
  body: currentBody, head: currentHead, headSit: HEAD_SIT, headLie: HEAD_LIE,
  ringReach: 7.8, modes: MCM_COYOTE_MODES, wink: winkShow,
};

/**
 * A coyote model on its ledge. (x, ledgeTop) is the ledge centre's top surface — the
 * paper coyote's (x0, y0 - 12.4). facing 1 looks right, -1 left; the ledge is the
 * caller's. mode is the paper's: 'howl' (default), 'yawn', 'chorus' or 'wink', where the
 * model has it (else the howl); `since` and `pace` latch a show as the paper does
 * (null = looped on t). For the howl, `since` holds the song from then on (howlHold).
 */
export function drawCoyoteModel(ctx, t, x, ledgeTop, facing, K, model, { mode = 'howl', since = null, pace = 1, look = 0 } = {}) {
  const dir = facing < 0 ? -1 : 1;
  const m0 = ctx.getTransform();
  FRAME_SCALE = Math.hypot(m0.a, m0.b) || 1;
  const modes = model.modes ?? ['howl'];
  if (mode === 'winkWait' && !modes.includes('wink')) mode = 'howl';
  else if (mode !== 'winkWait' && !modes.includes(mode)) mode = 'howl';
  ctx.save();
  ctx.translate(x, ledgeTop + 12.4);
  if (mode === 'winkWait') {
    // Before the hero lands: the show's first moment, blinking, watching him (`look`).
    if (since == null) model.wink(ctx, t, K, 0, idleBlink(t), look);
    else {
      const u = SHOWS.winkWait.start + Math.max(0, since) * pace;
      if (u < WINK_IDLE_U) model.wink(ctx, t, K, u, null, look);
      else model.wink(ctx, t, K, WINK_IDLE_U, idleBlink(t), look);
    }
    ctx.restore();
    return;
  }
  if (mode === 'wink' && model.wink) {
    const show = SHOWS.wink;
    const clock = since == null ? t : show.start + Math.max(0, since) * pace;
    model.wink(ctx, t, K, fract(clock / show.loop) * show.loop);
    ctx.restore();
    return;
  }
  let cast;
  if (mode === 'yawn' || mode === 'chorus') {
    const show = SHOWS[mode];
    const clock = since == null ? t : show.start + Math.max(0, since) * pace;
    const u = fract(clock / show.loop) * show.loop;
    cast = mode === 'yawn'
      ? yawnShow(u, t, dir, model.headSit, model.headLie ?? model.headSit, model.marks)
      : chorusShow(u, t, dir, model.pupDx);
  } else {
    cast = [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, since == null ? howlLoop(t) : howlHold(t, Math.max(0, since))]];
  }
  for (const [fig, pose] of cast) {
    const P = fig.pup
      ? Object.fromEntries(Object.entries(K).map(([k, v]) => [k,
        typeof v !== 'string' || ['nose', 'eye', 'tip', 'ink', 'mouth', 'song', 'spark'].includes(k) ? v : mix(v, '#f0d2a4', 0.14)]))
      : K;
    sideFigure(ctx, t, P, pose, fig, model);
  }
  ctx.restore();
}

export function drawMcmCoyote(ctx, t, x, ledgeTop, facing, K, opts = {}) {
  drawCoyoteModel(ctx, t, x, ledgeTop, facing, K, CURRENT_MODEL, opts);
}

// ================================================================== drawing helpers
// Shared by the models here and the bake-off's candidates.
// A triangular ear on a base (x0,y0)-(x1,y1), `len` long, leaning `rot` (0 = straight up,
// negative = back), with an optional inner colour.
export function ear(ctx, pass, x0, y0, x1, y1, len, rot, fill, inner = null) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const tip = [mx + Math.sin(rot) * len, my - Math.cos(rot) * len];
  part(ctx, pass, poly([x0, y0, tip[0], tip[1], x1, y1]), fill);
  if (inner) {
    part(ctx, pass, poly([lerp(x0, mx, 0.45), lerp(y0, my, 0.45) - 0.15, lerp(mx, tip[0], 0.78), lerp(my, tip[1], 0.78),
      lerp(x1, mx, 0.45), lerp(y1, my, 0.45) - 0.15]), inner, false);
  }
}

// An open jaw hinged at (hx, hy): the dark mouth wedge from the upper lip line, and the
// lower jaw (and tongue) rotated down by `jaw`.
export function jawOpen(ctx, pass, K, h, hx, hy, len, lip, colour) {
  if (h.jaw <= 0.05) return;
  const jx = hx + Math.cos(h.jaw) * len;
  const jy = hy + Math.sin(h.jaw) * len;
  part(ctx, pass, poly([hx + 0.1, hy - 0.45, lip[0], lip[1], jx, jy]), K.mouth);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(h.jaw);
  if (h.tongue > 0.02) part(ctx, pass, oval(len * 0.62, -0.35, len * 0.4 * h.tongue, 0.5, -0.1), K.tongue, false);
  part(ctx, pass, poly([0, -0.35, len, -0.15, len * 0.94, 0.5, 0, 1.05]), colour);
  ctx.restore();
}

// Eyelids for the yawn's waking blink: the coat drawn down over the top of an eye.
export function lids(ctx, pass, K, h, cx, cy, rx, ry, rot) {
  if (h.lids <= 0.05) return;
  part(ctx, pass, (c) => { c.ellipse(cx, cy, rx * 1.08, ry * 1.12, rot, Math.PI, Math.PI + Math.PI * h.lids); c.lineTo(cx, cy); c.closePath(); }, K.coat, false);
}

// ================================================================== CHUCK JONES
// The Maurice Noble-era Wile E.: scrawny and tall, sat up with a slight hunch; a big
// cranium with enormous ears, a pointed snout ending in a black nose, heavy sly lids;
// a scraggly chest tuft, stick arms to the ledge, a thin bony tail with a bushy tip.
// Sitting is the bake-off's drawing exactly. Lying (the doze, pose.lie 1) is the same
// figure let down along the ledge: haunch flattened, the torso a long low wedge, the
// arms laid forward with the chin on the paws.
const JONES = {
  haunch: [
    [-5.4, -0.4, -5.6, -3.6, -4.4, -7.2, -2.2, -8.0, -0.6, -6.2, -0.4, -2.8, -1.8, -0.6],
    [-5.8, -0.3, -6.3, -2.6, -5.1, -4.9, -2.8, -5.5, -1.0, -4.5, -0.4, -2.2, -1.8, -0.3],
  ],
  haunchDark: [
    [-5.4, -0.4, -5.6, -3.6, -4.8, -5.8, -3.6, -3.4, -3.0, -0.5],
    [-5.8, -0.3, -6.3, -2.6, -5.5, -4.1, -4.1, -2.4, -3.2, -0.3],
  ],
  // Heave is added to points 4 and 5 (the chest front).
  torso: [
    [-3.8, -5.0, -3.2, -11.4, -1.6, -15.4, 1.2, -16.2, 2.4, -13.4, 2.2, -8.0, 1.2, -2.4, -1.8, -1.6],
    [-4.4, -2.2, -3.6, -5.6, -0.4, -6.9, 4.4, -7.1, 7.6, -5.3, 8.1, -2.6, 6.2, -0.4, -1.8, -0.4],
  ],
  saddle: [
    [-3.8, -5.0, -3.2, -11.4, -1.6, -15.4, -0.5, -15.6, -2.0, -11.8, -2.6, -6.0],
    [-4.4, -2.2, -3.6, -5.6, -0.4, -6.9, 3.8, -7.1, -0.2, -6.1, -3.2, -4.4],
  ],
  // Heave on points 1..5.
  tuft: [
    [1.2, -15.6, 2.8, -14.0, 2.2, -13.6, 3.2, -12.6, 2.2, -12.2, 2.9, -11.1, 1.8, -11.0, 2.2, -9.6, 1.0, -10.4, 0.6, -13.4],
    [6.4, -6.5, 8.0, -5.1, 7.5, -4.7, 8.4, -3.7, 7.4, -3.4, 7.9, -2.3, 6.8, -2.4, 7.0, -1.3, 6.0, -2.0, 5.8, -4.7],
  ],
  armFar: [
    [0.2, -13.4, 1.1, -13.2, 2.0, -0.9, 1.2, -0.9],
    [4.6, -2.8, 5.2, -1.6, 12.2, -1.0, 12.2, -1.8],
  ],
  armNear: [
    [0.9, -12.9, 1.9, -12.7, 3.3, -0.8, 2.4, -0.8],
    [5.4, -2.2, 5.8, -1.0, 12.9, -0.4, 12.9, -1.2],
  ],
  pawFar: [[1.8, -0.45], [12.5, -1.25]],
  pawNear: [[3.1, -0.42], [13.4, -0.62]],
};
function jonesBody(ctx, pass, K, pose) {
  const k = pose.lie || 0;
  const tw = pose.tw;
  const h = pose.heave;
  const at = (key) => lerpPts(JONES[key][0], JONES[key][1], k);
  // A bony tail along the ledge, its brush drooping over the ledge's end.
  part(ctx, pass, poly([-4.4, -1.5, -10.4, -1.3, -10.5, -0.6, -4.4, -0.4]), K.coat);
  part(ctx, pass, poly([-9.6, -1.5, -12.2, -2.5 + tw * 0.3, -14.6, -1.5 + tw * 0.4, -15.6, 1.4 + tw * 0.5, -14.2, 2.3, -13.0, 0.2, -10.2, -0.5]), K.coat);
  part(ctx, pass, poly([-14.4, -1.2 + tw * 0.4, -14.6, -1.5 + tw * 0.4, -15.6, 1.4 + tw * 0.5, -14.2, 2.3, -13.8, 0.6]), K.tip);
  part(ctx, pass, poly(at('haunch')), K.coat);
  part(ctx, pass, poly(at('haunchDark')), K.dark, false);
  part(ctx, pass, poly([-3.0, 0, 1.4, 0, 1.7, -0.8, -2.6, -1.2]), K.dark);
  const T = at('torso');
  T[8] += h;
  T[10] += h;
  part(ctx, pass, poly(T), K.coat);
  part(ctx, pass, poly(at('saddle')), K.back, false);
  const C = at('tuft');
  for (const i of [2, 4, 6, 8, 10]) C[i] += h;
  part(ctx, pass, poly(C), K.cream, false);
  part(ctx, pass, poly(at('armFar')), K.dark);
  part(ctx, pass, poly(at('armNear')), K.coat);
  const pf = lerpPts(JONES.pawFar[0], JONES.pawFar[1], k);
  const pn = lerpPts(JONES.pawNear[0], JONES.pawNear[1], k);
  part(ctx, pass, oval(pf[0], pf[1], 0.95, 0.45), K.dark);
  part(ctx, pass, oval(pn[0], pn[1], 1.0, 0.45), K.coat);
}
function jonesHead(ctx, pass, K, h) {
  ctx.rotate(h.rot);
  const L = 1 - h.earBack * 0.25;
  ear(ctx, pass, -2.6, -2.4, -0.6, -4.0, 7.0 * L, -0.34 - h.flick - h.earBack * 0.9, K.dark);
  ear(ctx, pass, -1.2, -4.4, 1.9, -4.2, 7.6 * L, -0.12 - h.earBack * 0.9, K.coat, K.ear);
  jawOpen(ctx, pass, K, h, 3.6, 0.3, 3.9, [7.3, -0.5], K.cream);
  part(ctx, pass, poly([-2.9, -0.8, -2.7, -3.0, -1.4, -4.6, 0.9, -5.1, 2.8, -4.3, 3.6, -3.2, 3.9, -2.6, 7.0, -1.5, 7.9, -1.1,
    7.8, -0.55, 7.1, -0.35, 4.6, 0.3, 3.2, 1.5, 0.8, 1.9, -1.6, 1.1]), K.coat);
  part(ctx, pass, poly([4.0, -1.7, 7.4, -0.7, 7.1, -0.35, 4.6, 0.3, 3.2, 1.5, 2.2, 0.4]), K.cream, false);
  part(ctx, pass, oval(7.72, -0.95, 0.8, 0.62), K.nose, false);
  if (h.eye === 'shut') {
    line(ctx, pass, K.eye, 0.4, (c) => { c.moveTo(1.2, -2.8); c.quadraticCurveTo(2.3, -2.2, 3.4, -2.75); });
  } else if (pass === 'paint') {
    part(ctx, pass, oval(2.3, -2.8, 1.2, 0.95, -0.1), K.cream, false);
    part(ctx, pass, oval(2.72, -2.5, 0.46, 0.5), K.eye, false);
    // The heavy lid: the coat drawn half down over the eye, a dark rim along it; lower
    // still as it wakes from the doze.
    const lid = 1.45 + 0.9 * (h.lids || 0);
    ctx.save();
    ctx.beginPath();
    oval(2.3, -2.8, 1.25, 1.0, -0.1)(ctx);
    ctx.clip();
    part(ctx, pass, (c) => c.rect(0.8, -4.2, 3.2, lid), K.coat, false);
    ctx.restore();
    line(ctx, pass, K.back, 0.42, (c) => { c.moveTo(1.1, -4.2 + lid + 0.02); c.lineTo(3.5, -4.2 + lid + 0.08); });
  }
  part(ctx, pass, poly([0.9, -4.0, 3.5, -3.9, 3.3, -3.45, 1.1, -3.55]), K.back, false);
}

// ------------------------------------------------------------------ the Jones winker
// Square to the camera from the start (never turns), as the paper winker is: the
// cranium between two enormous ears, the long snout seen end on as a tapering muzzle
// down to the big black nose, the heavy lids, and Wile E.'s grin — wide, sly, all teeth.
// Below it the same scrawny frame: a narrow chest with its scraggly tuft, stick arms,
// knobbly haunches either side and the tail out along the ledge.
// `h` is the face: brow and browR (each brow's lift), wink (the right eye shut), grin
// (the toothy one), smirk (a closed mouth with one corner hooked up), look (-1..1, the
// features slid toward a side, so the head reads as turned that way), lick (0..1 how far
// out the tongue is, lickX where along the mouth), blink and flick.
function jonesFrontHead(ctx, pass, K, h) {
  const lk = h.look || 0;
  // The ears: long, leaning out, the inner colour down the middle. A turned head swings
  // them a little the other way.
  for (const s of [-1, 1]) {
    const flick = s < 0 ? h.flick * 2 : 0;
    const base0 = [s * 3.4 - lk * 0.5, -1.6];
    const base1 = [s * 1.1 - lk * 0.5, -3.6];
    const tip = [s * (6.2 - flick) - lk * 1.2, -10.4 + flick + (s * lk > 0 ? lk * s * 0.6 : 0)];
    part(ctx, pass, poly([base0[0], base0[1], tip[0], tip[1], base1[0], base1[1]]), s < 0 ? K.dark : K.coat);
    part(ctx, pass, poly([lerp(base0[0], base1[0], 0.3), lerp(base0[1], base1[1], 0.3) - 0.3, lerp(s * 2.4 - lk * 0.5, tip[0], 0.8), lerp(-2.4, tip[1], 0.8),
      lerp(base0[0], base1[0], 0.72), lerp(base0[1], base1[1], 0.72) - 0.3]), K.ear, false);
  }
  // The cranium and cheeks: wide at the eyes, narrowing to the muzzle.
  part(ctx, pass, poly([-3.6, -1.0, -3.0, -3.2, -1.2, -4.2, 1.2, -4.2, 3.0, -3.2, 3.6, -1.0, 3.1 + lk * 0.4, 1.4, 2.6 + lk * 0.7, 3.4, 1.4 + lk, 5.0,
    lk * 1.1, 5.4, -1.4 + lk, 5.0, -2.6 + lk * 0.7, 3.4, -3.1 + lk * 0.4, 1.4]), K.coat);
  // Everything on the face slides with the look.
  const fx = lk * 1.1;
  ctx.save();
  ctx.translate(fx, 0);
  // The muzzle end on: a cream wedge from between the eyes down to the nose, and the
  // pale chin under it that the grin opens across.
  part(ctx, pass, poly([-1.1, -1.2, 1.1, -1.2, 1.7, 2.2, 0, 3.0, -1.7, 2.2]), K.cream, false);
  part(ctx, pass, poly([-2.3, 3.1, 0, 2.7, 2.3, 3.1, 1.4, 4.9, 0, 5.3, -1.4, 4.9]), K.cream, false);
  part(ctx, pass, poly([-0.5, -3.9, 0.5, -3.9, 0.35, -1.5, -0.35, -1.5]), K.back, false);
  // The grin, under the nose and out across the cheeks.
  const g = h.grin || 0;
  const yM = 3.8;
  if (g > 0.03) {
    const w = 1.3 + g * 1.3;
    const up = g * 0.9;
    const drop = 0.4 + g * 0.85;
    const mouth = (c) => {
      c.moveTo(-w, yM - up);
      c.quadraticCurveTo(0, yM + drop * 1.4, w, yM - up);
      c.quadraticCurveTo(0, yM + drop * 0.35, -w, yM - up);
      c.closePath();
    };
    part(ctx, pass, mouth, K.mouth, false);
    if (g > 0.35 && pass === 'paint') {
      // The teeth: a white band along the top of the grin, cut into a row.
      ctx.save();
      ctx.beginPath();
      mouth(ctx);
      ctx.clip();
      part(ctx, pass, (c) => {
        c.moveTo(-w, yM - up);
        c.quadraticCurveTo(0, yM + drop * 0.35, w, yM - up);
        c.lineTo(w, yM - up + 0.75);
        c.quadraticCurveTo(0, yM + drop * 0.8, -w, yM - up + 0.75);
        c.closePath();
      }, '#fffaf0', false);
      ctx.restore();
      line(ctx, pass, K.mouth, 0.14, (c) => {
        for (let i = -3; i <= 3; i++) {
          const x = (i / 3.5) * w;
          const y = yM - up + (1 - (x / w) ** 2) * (drop * 0.35 + up);
          c.moveTo(x, y - 0.1);
          c.lineTo(x, y + 0.7);
        }
      });
    }
  } else if ((h.lick || 0) > 0.03) {
    // Licking his chops: a little open mouth and the tongue run along it.
    const L = h.lick;
    part(ctx, pass, oval(0, yM + 0.2, 1.4 * L + 0.3, 0.55 * L + 0.1), K.mouth, false);
    part(ctx, pass, oval((h.lickX || 0) * 1.6, yM + 0.15 - 0.2 * L, 0.95 * L, 0.55 * L, (h.lickX || 0) * 0.4), K.tongue, false);
  } else {
    const sm = h.smirk || 0;
    // The resting line, or a smirk: the right corner hooked up, a dimple tick beside it.
    line(ctx, pass, K.dark, 0.3 + sm * 0.1, (c) => {
      c.moveTo(-1.3 + sm * 0.2, yM - 0.1 + sm * 0.15);
      c.quadraticCurveTo(0, yM + 0.5 - sm * 0.1, 1.3 + sm * 0.4, yM - 0.1 - sm * 1.0);
    });
    if (sm > 0.3) line(ctx, pass, K.dark, 0.22, (c) => { c.moveTo(1.9, yM - 1.3 * sm); c.lineTo(2.05, yM - 0.6 * sm); });
  }
  part(ctx, pass, oval(0, 2.45, 1.05, 0.75), K.nose, false);
  part(ctx, pass, oval(-0.3, 2.2, 0.3, 0.16), '#ffffff', false);
  // The eyes, close together under the brow, each under its heavy lid; the pupils look
  // a touch further than the face turns.
  const eyeY = -2.0;
  for (const s of [-1, 1]) {
    const ex = s * 1.35;
    const wink = s > 0 ? (h.wink || 0) : 0;
    part(ctx, pass, oval(ex, eyeY, 1.05, 0.95, s * -0.2), K.cream, false);
    if (wink > 0.6) {
      line(ctx, pass, K.eye, 0.55, (c) => { c.moveTo(ex - 0.95, eyeY + 0.2); c.quadraticCurveTo(ex, eyeY - 0.75, ex + 0.95, eyeY + 0.2); });
      continue;
    }
    part(ctx, pass, oval(ex + s * 0.15 + lk * 0.45, eyeY + 0.2, 0.45, 0.52), K.eye, false);
    if (pass === 'paint') {
      const lid = Math.max(h.lidMin ?? 0.46, wink / 0.6, h.blink || 0);
      ctx.save();
      ctx.beginPath();
      oval(ex, eyeY, 1.1, 1.0, s * -0.2)(ctx);
      ctx.clip();
      const ly = eyeY - 1.1 + 2.2 * Math.min(1, lid);
      part(ctx, pass, (c) => c.rect(ex - 1.4, eyeY - 1.2, 2.8, ly - eyeY + 1.2), K.coat, false);
      ctx.restore();
      line(ctx, pass, K.back, 0.4, (c) => { c.moveTo(ex - 1.05, ly + 0.02); c.lineTo(ex + 1.05, ly + 0.02 + s * -0.12); });
    }
  }
  // The brows: the left one raised for the wink, either lifted for a waggle.
  const brow = (s, b) => {
    if (b <= 0.03) return;
    line(ctx, pass, K.back, 0.55, (c) => {
      c.moveTo(s * 2.6, eyeY - 1.25 - b * 0.55);
      c.quadraticCurveTo(s * 1.5, eyeY - 1.8 - b * 1.0, s * 0.4, eyeY - 1.3 - b * 0.4);
    });
  };
  brow(-1, h.brow || 0);
  brow(1, h.browR || 0);
  ctx.restore();
}

// The Jones figure's size against the paper coyote's (the bake-off's 0.87; Peter, 28 Sep
// 2026: "Can the coyote be a little smaller").
const JONES_SCALE = 0.74;
export const JONES_HEAD_FRONT = [0, -17.6];
export const JONES_FRONT_S = 1.08;

/**
 * The Jones coyote sat square on, posed by `f`: the face (jonesFrontHead's `h` fields),
 * tilt (the head's roll), wag (the tail), and salute (0..1, the near paw up to the brow).
 * Drawn about the ledge top at the origin, in the figure's own units after
 * frontFrame(); `extra(pass)` paints more into the same print (a prop in the paws).
 */
export function jonesFrontFigure(ctx, t, K, f, extra = null) {
  const tw = Math.sin(t * 2.2) * 0.5 + (f.wag || 0);
  const sal = f.salute || 0;
  printed(ctx, K.ink, (pass) => {
    // The tail out along the ledge, its brush at the end.
    part(ctx, pass, poly([-2.6, -1.3, -9.4, -1.1, -9.5, -0.4, -2.6, -0.3]), K.coat);
    part(ctx, pass, poly([-8.6, -1.4, -11.2, -2.4 + tw * 0.3, -13.6, -1.4 + tw * 0.4, -14.6, 1.4 + tw * 0.5, -13.2, 2.2, -12.0, 0.2, -9.2, -0.4]), K.coat);
    part(ctx, pass, poly([-13.4, -1.1 + tw * 0.4, -13.6, -1.4 + tw * 0.4, -14.6, 1.4 + tw * 0.5, -13.2, 2.2, -12.8, 0.6]), K.tip);
    // Knobbly haunches either side, the far one in shade, and the back feet.
    for (const s of [-1, 1]) {
      part(ctx, pass, poly([s * 1.6, -0.3, s * 1.8, -4.4, s * 3.2, -6.4, s * 4.6, -5.4, s * 5.0, -2.4, s * 4.2, -0.3]), s < 0 ? K.dark : K.coat);
      part(ctx, pass, oval(s * 4.4, -0.35, 1.25, 0.45), s < 0 ? K.dark : K.coat);
    }
    // The chest: a narrow hunched column.
    part(ctx, pass, poly([-2.4, -1.2, -2.6, -8.8, -2.1, -14.2, -1.0, -16.2, 1.0, -16.2, 2.1, -14.2, 2.6, -8.8, 2.4, -1.2]), K.coat);
    part(ctx, pass, poly([-1.0, -16.2, -0.4, -15.4, 0.4, -15.4, 1.0, -16.2]), K.back, false);
    // The scraggly tuft down the chest.
    part(ctx, pass, poly([-1.3, -15.0, -1.9, -12.6, -1.2, -12.9, -1.7, -10.2, -0.8, -10.8, 0, -8.4, 0.8, -10.8, 1.7, -10.2,
      1.2, -12.9, 1.9, -12.6, 1.3, -15.0]), K.cream, false);
    // Stick arms straight down to the ledge, paws together; the near one can come up.
    part(ctx, pass, poly([-2.0, -13.8, -1.0, -13.8, -0.7, -0.8, -1.6, -0.8]), K.dark);
    part(ctx, pass, oval(-1.3, -0.4, 0.95, 0.45), K.dark);
    if (sal < 0.02) {
      part(ctx, pass, poly([1.0, -13.8, 2.0, -13.8, 1.6, -0.8, 0.7, -0.8]), K.coat);
      part(ctx, pass, oval(1.3, -0.4, 0.95, 0.45), K.coat);
    }
    if (extra) extra(pass);
    // The head, then (in front of it) a raised paw.
    ctx.save();
    ctx.translate(JONES_HEAD_FRONT[0], JONES_HEAD_FRONT[1]);
    ctx.rotate(f.tilt || 0);
    ctx.scale(JONES_FRONT_S, JONES_FRONT_S);
    jonesFrontHead(ctx, pass, K, f);
    ctx.restore();
    if (sal >= 0.02) {
      const S = [1.5, -13.8];
      const E = [lerp(1.4, 6.4, sal), lerp(-7.3, -16.8, sal)];
      const P = [lerp(1.2, 3.8, sal), lerp(-0.8, -21.6, sal)];
      const limb2 = (a, b, w) => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const L = Math.hypot(dx, dy) || 1;
        const nx = (-dy / L) * w;
        const ny = (dx / L) * w;
        return poly([a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny, b[0] - nx, b[1] - ny, a[0] - nx, a[1] - ny]);
      };
      part(ctx, pass, limb2(S, E, 0.5), K.coat);
      part(ctx, pass, limb2(E, P, 0.45), K.coat);
      part(ctx, pass, oval(E[0], E[1], 0.55, 0.55), K.coat);
      part(ctx, pass, oval(P[0], P[1], 0.95, 0.6, -0.5 * sal), K.coat);
    }
  });
}
// Into the winker's frame: the ledge top at the origin, the figure's units.
export function jonesFrontFrame(ctx) {
  ctx.translate(0, -12.2);
  ctx.scale(1.5 * JONES_SCALE, 1.5 * JONES_SCALE);
}
// The flat star off a shut eye (k 0..1 through it) and a glint (k 0..1) at (x, y).
export function jonesWinkStar(ctx, K, k) {
  if (!(k > 0 && k < 1)) return;
  const [hx, hy] = JONES_HEAD_FRONT;
  star(ctx, K, hx + 4.2 * JONES_FRONT_S, hy + (-2.0 - 1.6) * JONES_FRONT_S,
    (k < 0.14 ? k / 0.14 : 1 - ((k - 0.14) / 0.86) * 0.55) * 3.6, k * 1.4, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
}
export function jonesGlint(ctx, K, k, x, y) {
  if (k > 0 && k < 1) star(ctx, K, x, y, 1.5 * Math.sin(k * Math.PI), k * 2, 1);
}
export const jonesIdleBlink = (u) => (u > 4.6 && u < 4.75 ? Math.sin(((u - 4.6) / 0.15) * Math.PI) : 0);
export const jonesFlick = (t) => (fract(t * 0.43) < 0.06 ? 0.3 : 0);

// THE SHIPPED WINK (Peter, 28 Sep 2026, from the wink bake-off: "i like the look both
// ways but with the groucho at the end", then: "his head should be following the
// movement of the hero, then when he lands he faces forward and we get the wink with the
// groucho and smirk"). `lookIn` (-1..1) is where the hero is, left or right of him: until
// the show starts he watches the hero come (u 0, see drawCoyoteModel's winkWait); from
// the landing he turns square on, then both brows bounce twice under low sly lids, a
// closed smirk, and the wink with its star. Settled by ~3, so the held moment (u 5.5)
// is still.
const hold = (a, b, c, d, u) => smooth(a, b, u) * (1 - smooth(c, d, u));
export function jonesWinkShow(ctx, t, K, u, idle = null, lookIn = 0) {
  const look = (lookIn || 0) * (1 - smooth(0.2, 0.55, u));
  const bounce = (a) => (u > a && u < a + 0.3 ? Math.max(0, Math.sin(((u - a) / 0.3) * Math.PI)) : 0);
  const waggle = bounce(0.75) + bounce(1.15);
  const f = {
    look,
    tilt: -0.1 * look + 0.1 * hold(1.6, 1.9, 2.4, 2.7, u),
    brow: waggle, browR: waggle,
    lidMin: 0.46 + 0.25 * hold(0.6, 0.8, 1.5, 1.7, u),
    smirk: hold(0.7, 1.0, 2.6, 3.0, u),
    wink: hold(1.5, 1.8, 2.5, 2.65, u),
    blink: idle != null ? idle : jonesIdleBlink(u),
    flick: jonesFlick(t),
  };
  ctx.save();
  jonesFrontFrame(ctx);
  jonesFrontFigure(ctx, t, K, f);
  jonesWinkStar(ctx, K, (u - 1.83) / 0.8);
  ctx.restore();
}

// The bake-off's first cut, kept for the lab: a raised brow, the slow wink with a star,
// and Wile E.'s toothy grin with a glint off a tooth.
export function jonesGrinShow(ctx, t, K, u, idle = null) {
  const f = {
    brow: smooth(0.4, 0.7, u) * (1 - smooth(2.8, 3.1, u)),
    wink: smooth(0.8, 1.15, u) * (1 - smooth(2.3, 2.45, u)),
    grin: (0.3 * smooth(0.4, 0.7, u) + 0.7 * smooth(1.1, 1.3, u)) * (1 - smooth(3.0, 3.3, u)),
    tilt: 0.16 * smooth(1.0, 1.3, u) * (1 - smooth(2.2, 2.5, u)),
    blink: idle != null ? idle : jonesIdleBlink(u),
    wag: Math.sin(t * 10) * 0.9 * smooth(1.2, 1.4, u) * (1 - smooth(2.5, 2.8, u)),
    flick: jonesFlick(t),
  };
  ctx.save();
  jonesFrontFrame(ctx);
  jonesFrontFigure(ctx, t, K, f);
  jonesWinkStar(ctx, K, (u - 1.13) / 0.8);
  jonesGlint(ctx, K, (u - 2.5) / 0.45, JONES_HEAD_FRONT[0] + 1.4 * JONES_FRONT_S, JONES_HEAD_FRONT[1] + 3.3 * JONES_FRONT_S);
  ctx.restore();
}

export const JONES_MODEL = {
  // The doze's Z's rise over the snout, clear of those ears.
  body: jonesBody, head: jonesHead, headSit: [1.2, -16.0], headLie: [9.8, -4.4], marks: [5, -1], pupDx: 11.5,
  ringReach: 8.6, scale: JONES_SCALE, modes: MCM_COYOTE_MODES, wink: jonesWinkShow,
};

// The shipped coyote: the Jones model on the engine. (x, ledgeTop) is the ledge centre's
// top surface; the ledge is the caller's (speedMcm.js MCM_PAINT.ledge).
export function drawJonesCoyote(ctx, t, x, ledgeTop, facing, K, opts = {}) {
  drawCoyoteModel(ctx, t, x, ledgeTop, facing, K, JONES_MODEL, opts);
}
