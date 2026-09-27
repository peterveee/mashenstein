// SPEED ZONE mid-century bake-off — THE COYOTE, re-cut from the shipped paper one
// (Peter, 25 Sep 2026: "I love how it looks in the paper mode"; the first MCM coyote's
// loose off-register ink read as stray sticks at game size).
//
// The paper coyote (drawDesertCoyote in src/engine/stylePacks/desertLandmarks.js) is the
// model: the same seat on the ledge, the same proportions and coyote space (origin on
// the ledge top under the haunch, muzzle toward +x, drawn at 1.5), the same pivots, and
// its shows re-played from the same clocks — the howl every 5 s, the yawn and settle,
// the chorus with a pup, the square-on wink. Only the cut changes: flat angular
// Jones/Noble shapes (a lanky wedge of a body, a long tapered snout, big pointed ears,
// a brush of a tail), a tan coat with a cream chest and muzzle, a darker back and tail
// tip — and ONE contour. The whole silhouette is printed in ink a hair larger than the
// figure and slipped ~1 px up and right, then the colour goes over it: a misregistered
// key plate that can only ever show along the figure's own edge, never as a stroke.
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
const HEAD_SIT = [2.6, -12.6];
const HEAD_LIE = [9.0, -3.2];
function yawnShow(u, t, dir) {
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
  const ax = lerp(HEAD_SIT[0], HEAD_LIE[0], lie);
  const ay = lerp(HEAD_SIT[1], HEAD_LIE[1], lie);
  for (let i = 0; i < 4; i++) {
    const age = (u - 3.5 - i * 0.8) / 1.7;
    if (age <= 0 || age >= 1 || u > 6.4) continue;
    p.marks.push({ x: ax + 2 + age * 3.5 + Math.sin(age * 5 + i) * 0.6, y: ay - 4.5 - age * 8,
      s: 0.9 + age * 0.7, a: Math.min(1, age * 5) * (1 - smooth(0.65, 1, age)) });
  }
  return [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, p]];
}
function chorusShow(u, t, dir) {
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
    [{ ox: 9.5 * dir, oy: -11.9, s: 1.1, dir, headScale: 1.12, pup: true }, B],
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
};
export const MCM_COYOTE_MODES = ['howl', 'yawn', 'chorus', 'wink'];

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
 * (null = looped on t).
 */
export function drawCoyoteModel(ctx, t, x, ledgeTop, facing, K, model, { mode = 'howl', since = null, pace = 1 } = {}) {
  const dir = facing < 0 ? -1 : 1;
  const m0 = ctx.getTransform();
  FRAME_SCALE = Math.hypot(m0.a, m0.b) || 1;
  if (!(model.modes ?? ['howl']).includes(mode)) mode = 'howl';
  ctx.save();
  ctx.translate(x, ledgeTop + 12.4);
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
    cast = mode === 'yawn' ? yawnShow(u, t, dir) : chorusShow(u, t, dir);
  } else {
    cast = [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, howlLoop(t)]];
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
