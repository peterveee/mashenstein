// THE LIVE WIRE'S ZAP (15 Oct 2026). Peter picked it from the lab bake-off
// (src/dev/zap-candidates.js, "GRAVITY GRID — zapped by the live wire"): "lets go with b
// and occasionally c". On contact the hero goes rigid — arms flung up, legs braced, a few
// px off the rail, buzzing, glowing, arcs climbing from the wire into his boots (B, JOLT)
// — and now and then the same jolt strobes with his own X-ray (C). Same length, same arcs
// and the same sound either way, so it is one event with two gags, never two events.
//
// Drawn on the hero as a whole: the toon goes into an offscreen layer under the caller's
// transform so it can be tinted and glowed as one picture and put back where it was. The
// X-ray needs a skeleton laid out for the hero's frame; ZAP_SKELETONS has the ones drawn
// so far, and a hero without one only ever gets the jolt (zapCanXray).
import { drawToon } from './toons.js';

// How long the jolt holds, in seconds of game time. The mercy window (1.4s of i-frames)
// carries on after it with the ordinary blink.
export const ZAP_T = 0.5;
// How often the X-ray plays instead of the plain jolt — and never twice running.
export const ZAP_XRAY_CHANCE = 1 / 3;
// HERO_DRAW_H (game/draw.js), restated: draw.js imports this module.
const U = 24;
const ARC_INK = 'rgba(10,30,60,0.85)', ARC_CYAN = '#1fa8ff', ARC_CORE = '#e8fbff';
const HAIR = '#5a3212';
export const zapHash = (n) => { const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453; return s - Math.floor(s); };
const hash = zapHash;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- the hero as a layer
// The hero drawn into an offscreen canvas under the tile's own transform, so it can be
// tinted, inverted or glowed as one flat picture and put back exactly where it was.
const pool = [];
export function layer(i, ctx, box, paint) {
  const m = ctx.getTransform();
  const xs = [], ys = [];
  for (const [x, y] of [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]) {
    xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f);
  }
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  const w = Math.ceil(Math.max(...xs)) - x, h = Math.ceil(Math.max(...ys)) - y;
  let cv = pool[i];
  if (!cv) cv = pool[i] = document.createElement('canvas');
  if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h); }
  const o = cv.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
  o.clearRect(0, 0, cv.width, cv.height);
  o.setTransform(m.a, m.b, m.c, m.d, m.e - x, m.f - y);
  paint(o);
  o.setTransform(1, 0, 0, 1, 0, 0);
  return { cv, o, x, y, w, h, scale: Math.hypot(m.a, m.b) };
}
export function tint(L, color, op = 'source-atop') {
  L.o.save(); L.o.globalCompositeOperation = op; L.o.fillStyle = color; L.o.fillRect(0, 0, L.w, L.h); L.o.restore();
}
// Photo negative: difference against white, then cut back to the hero's own outline.
export function invert(L, mask) {
  L.o.save();
  L.o.globalCompositeOperation = 'difference'; L.o.fillStyle = '#fff'; L.o.fillRect(0, 0, L.w, L.h);
  L.o.globalCompositeOperation = 'destination-in'; L.o.drawImage(mask.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  L.o.restore();
}
export function blit(ctx, L, { alpha = 1, glow = null, blur = 0 } = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur * L.scale; }
  ctx.drawImage(L.cv, 0, 0, L.w, L.h, L.x, L.y, L.w, L.h);
  ctx.restore();
}
export const heroBox = (cx, fy) => [cx - 0.7 * U, fy - 1.35 * U, cx + 0.7 * U, fy + 0.25 * U];

// Rigid, side-on (no turn to camera): arms flung up and out, legs braced apart. A jump
// kind with grounded set so the face is the startled one and the body takes no stretch.
export const joltPose = (t) => ({
  kind: 'jump', time: t, vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true,
  dance: { hands: [[0.85, -1.0], [0.85, -1.0]], feet: [[-0.2, 0], [0.2, 0]], ankles: [0, 0] },
});

// ---------------------------------------------------------------- electricity
function strokePath(c, pts, layers) {
  for (const [col, width] of layers) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = col; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }
}
// A jagged bolt between two points, re-formed on every tick of `seed`.
export function bolt(c, x0, y0, x1, y1, seed, jag = 1.4, w = 1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, n = Math.max(3, Math.round(len / 2.2));
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const q = i / n, off = (hash(seed * 7.13 + i * 1.7) - 0.5) * 2 * jag * Math.sin(q * Math.PI) ** 0.5;
    pts.push([x0 + dx * q + nx * off, y0 + dy * q + ny * off]);
  }
  pts.push([x1, y1]);
  strokePath(c, pts, [[ARC_INK, 1.7 * w], [ARC_CYAN, 0.95 * w], [ARC_CORE, 0.4 * w]]);
}
// Little arcs crawling over the body: short bolts between two points on it, kept below
// the chin so they never scribble over the face.
export function bodyArcs(c, cx, fy, t, n = 3) {
  const tick = Math.floor(t * 20);
  for (let i = 0; i < n; i++) {
    const s = tick * 13 + i * 5;
    if (hash(s + 0.3) < 0.25) continue;      // a gap now and then so it crackles rather than hums
    const ax = cx + (hash(s + 1) - 0.5) * 0.5 * U, ay = fy - (0.08 + hash(s + 2) * 0.42) * U;
    const ang = hash(s + 3) * Math.PI * 2, len = (0.15 + 0.15 * hash(s + 4)) * U;
    const bx = ax + Math.cos(ang) * len, by = Math.max(fy - 0.55 * U, ay + Math.sin(ang) * len);
    bolt(c, ax, ay, bx, by, s, 1, 0.8);
  }
}
// The wire biting back: bolts from the rail (railY) up into each boot (footY).
export function bootArcs(c, cx, railY, footY, t) {
  const tick = Math.floor(t * 24);
  for (const [i, fx] of [[0, -0.2], [1, 0.2]]) {
    const x = cx + fx * U;
    bolt(c, x + (hash(tick + i * 9) - 0.5) * 6, railY, x, footY - 1, tick * 3 + i, 1.2, 1);
  }
}
// Hair standing on end, poking out from under the cap. Drawn BEHIND the hero so the cap
// and face cover the roots and only the tips show.
export function frizz(c, cx, fy, amt, t) {
  if (amt <= 0) return;
  const hx = cx + 0.01 * U, hy = fy - 0.74 * U;
  c.save(); c.fillStyle = HAIR; c.strokeStyle = 'rgba(20,10,4,0.9)'; c.lineWidth = 0.35; c.lineJoin = 'round';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.12 + 0.76 * i / (n - 1)) + (hash(i + Math.floor(t * 30)) - 0.5) * 0.12;
    const r0 = 0.14 * U, r1 = (0.34 + 0.08 * hash(i * 3.3)) * U * amt + r0 * (1 - amt);
    const half = 0.16;
    c.beginPath();
    c.moveTo(hx + Math.cos(a - half) * r0, hy + Math.sin(a - half) * r0);
    c.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
    c.lineTo(hx + Math.cos(a + half) * r0, hy + Math.sin(a + half) * r0);
    c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}
// The X-ray: Lorenzo's skeleton laid over the jolt pose (u units from his feet).
function skeleton(c, cx, fy) {
  const P2 = (x, y) => [cx + x * U, fy + y * U];
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = '#7fe0ff'; c.shadowBlur = 0;
  const bone = (pts, w) => {
    c.beginPath(); c.moveTo(...P2(...pts[0])); for (const p of pts.slice(1)) c.lineTo(...P2(...p));
    c.strokeStyle = '#eaf8ff'; c.lineWidth = w * U; c.stroke();
  };
  const knob = (x, y, r) => { c.beginPath(); c.arc(...P2(x, y), r * U, 0, Math.PI * 2); c.fillStyle = '#eaf8ff'; c.fill(); };
  // arms, straight up and out
  bone([[-0.1, -0.52], [-0.21, -0.63], [-0.31, -0.74]], 0.045); knob(-0.31, -0.74, 0.045);
  bone([[0.12, -0.52], [0.23, -0.64], [0.33, -0.76]], 0.045); knob(0.33, -0.76, 0.045);
  // legs, braced
  bone([[-0.05, -0.22], [-0.13, -0.11], [-0.2, -0.02]], 0.05); knob(-0.13, -0.11, 0.035);
  bone([[0.05, -0.22], [0.13, -0.11], [0.21, -0.02]], 0.05); knob(0.13, -0.11, 0.035);
  // pelvis and spine
  c.beginPath(); c.ellipse(...P2(0, -0.23), 0.1 * U, 0.05 * U, 0, 0, Math.PI * 2); c.fillStyle = '#eaf8ff'; c.fill();
  bone([[0, -0.25], [0, -0.56]], 0.035);
  // ribs
  for (const [y, w] of [[-0.5, 0.13], [-0.44, 0.14], [-0.38, 0.12]]) {
    c.beginPath(); c.ellipse(...P2(0, y), w * U, 0.035 * U, 0, Math.PI * 0.05, Math.PI * 0.95); c.strokeStyle = '#eaf8ff'; c.lineWidth = 0.03 * U; c.stroke();
    c.beginPath(); c.ellipse(...P2(0, y), w * U, 0.035 * U, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  // collarbones
  bone([[-0.1, -0.53], [0.12, -0.53]], 0.03);
  // skull, jaw, sockets
  c.beginPath(); c.arc(...P2(0.02, -0.76), 0.15 * U, 0, Math.PI * 2); c.fillStyle = '#eaf8ff'; c.fill();
  c.beginPath(); c.roundRect(...P2(-0.05, -0.65), 0.15 * U, 0.07 * U, 0.02 * U); c.fill();
  c.fillStyle = '#0e2a4a';
  for (const ex of [-0.03, 0.08]) { c.beginPath(); c.ellipse(...P2(ex, -0.78), 0.035 * U, 0.042 * U, 0, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.moveTo(...P2(0.025, -0.73)); c.lineTo(...P2(0.005, -0.69)); c.lineTo(...P2(0.045, -0.69)); c.closePath(); c.fill();
  for (let i = 0; i < 4; i++) c.fillRect(...P2(-0.035 + i * 0.035, -0.64), 0.006 * U, 0.04 * U);
  c.restore();
}

// B33P has no bones: the X-ray shows the works.
const BONE = '#eaf8ff', XNAVY = '#0e2a4a';
function b33pInnards(c, cx, fy, t) {
  const P2 = (x, y) => [cx + x * U, fy + y * U];
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = BONE; c.fillStyle = BONE;
  const rod = (pts, w) => { c.beginPath(); c.moveTo(...P2(...pts[0])); for (const p of pts.slice(1)) c.lineTo(...P2(...p)); c.lineWidth = w * U; c.stroke(); };
  const servo = (x, y) => { c.beginPath(); c.arc(...P2(x, y), 0.035 * U, 0, Math.PI * 2); c.fill(); c.fillStyle = XNAVY; c.beginPath(); c.arc(...P2(x, y), 0.013 * U, 0, Math.PI * 2); c.fill(); c.fillStyle = BONE; };
  // limbs: rods between servos — the cannon arm hanging, the far arm thrown up
  rod([[-0.13, -0.5], [-0.18, -0.46], [-0.16, -0.32]], 0.03); servo(-0.13, -0.5); servo(-0.18, -0.46);
  rod([[0.14, -0.52], [0.24, -0.65], [0.33, -0.77]], 0.03); servo(0.14, -0.52); servo(0.24, -0.65);
  rod([[-0.06, -0.3], [-0.12, -0.16], [-0.2, -0.03]], 0.035); servo(-0.12, -0.16);
  rod([[0.06, -0.3], [0.14, -0.16], [0.22, -0.03]], 0.035); servo(0.14, -0.16);
  // chest: a gear turning and a battery cell
  const gx = -0.05, gy = -0.44, r = 0.075, teeth = 8, rot = t * 9;
  c.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = rot + i * Math.PI / teeth, rr = (i % 2 ? r : r * 1.3) * U;
    const [x, y] = P2(gx, gy); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.fill();
  c.fillStyle = XNAVY; c.beginPath(); c.arc(...P2(gx, gy), 0.028 * U, 0, Math.PI * 2); c.fill(); c.fillStyle = BONE;
  c.lineWidth = 0.018 * U; c.strokeRect(...P2(0.06, -0.52), 0.07 * U, 0.15 * U);
  c.fillRect(...P2(0.08, -0.54), 0.03 * U, 0.02 * U);
  c.fillRect(...P2(0.075, -0.43), 0.04 * U, 0.05 * U);
  // the dome: a CPU chip with its pins, wired down the neck
  const [hx, hy] = P2(-0.04, -0.86), s = 0.13 * U;
  c.fillRect(hx - s / 2, hy - s / 2, s, s);
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * s * 0.3;
    c.fillRect(hx + o - 0.006 * U, hy - s / 2 - 0.035 * U, 0.012 * U, 0.035 * U);
    c.fillRect(hx + o - 0.006 * U, hy + s / 2, 0.012 * U, 0.035 * U);
    c.fillRect(hx - s / 2 - 0.035 * U, hy + o - 0.006 * U, 0.035 * U, 0.012 * U);
    c.fillRect(hx + s / 2, hy + o - 0.006 * U, 0.035 * U, 0.012 * U);
  }
  c.fillStyle = XNAVY; c.fillRect(hx - s * 0.25, hy - s * 0.25, s * 0.5, s * 0.5);
  c.lineWidth = 0.014 * U; c.beginPath(); c.moveTo(hx, hy + s / 2 + 0.03 * U); c.bezierCurveTo(hx, hy + 0.14 * U, ...P2(-0.03, -0.62), ...P2(-0.05, -0.52)); c.stroke();
  c.restore();
}
// Ramon's limbs float, so his X-ray floats too: bones in each part, nothing between.
function ramonBones(c, cx, fy) {
  const P2 = (x, y) => [cx + x * U, fy + y * U];
  c.save(); c.lineCap = 'round'; c.strokeStyle = BONE; c.fillStyle = BONE;
  // skull
  c.beginPath(); c.arc(...P2(0, -0.86), 0.13 * U, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.roundRect(...P2(-0.06, -0.77), 0.13 * U, 0.06 * U, 0.02 * U); c.fill();
  c.fillStyle = XNAVY;
  for (const ex of [-0.05, 0.05]) { c.beginPath(); c.ellipse(...P2(ex, -0.88), 0.03 * U, 0.038 * U, 0, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.moveTo(...P2(0, -0.84)); c.lineTo(...P2(-0.018, -0.8)); c.lineTo(...P2(0.018, -0.8)); c.closePath(); c.fill();
  for (let i = 0; i < 4; i++) c.fillRect(...P2(-0.045 + i * 0.03, -0.765), 0.005 * U, 0.04 * U);
  // a little ribcage and spine in the floating torso
  c.lineWidth = 0.03 * U;
  c.beginPath(); c.moveTo(...P2(0, -0.66)); c.lineTo(...P2(0, -0.38)); c.stroke();
  for (const [y, w] of [[-0.6, 0.1], [-0.53, 0.11], [-0.46, 0.09]]) {
    c.beginPath(); c.ellipse(...P2(0, y), w * U, 0.03 * U, 0, Math.PI * 0.05, Math.PI * 0.95); c.lineWidth = 0.025 * U; c.stroke();
    c.beginPath(); c.ellipse(...P2(0, y), w * U, 0.03 * U, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  // finger bones in each glove, pointing up and out
  for (const [gx, dir] of [[-0.335, -1], [0.335, 1]]) {
    c.lineWidth = 0.022 * U;
    for (let f = 0; f < 4; f++) {
      const a = -Math.PI / 2 + dir * (-0.5 + f * 0.33);
      const [x0, y0] = P2(gx, -0.9);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(a) * 0.08 * U, y0 + Math.sin(a) * 0.08 * U); c.stroke();
    }
    c.beginPath(); c.arc(...P2(gx, -0.9), 0.03 * U, 0, Math.PI * 2); c.fill();
  }
  // foot bones in each shoe
  for (const fx of [-0.2, 0.2]) {
    c.lineWidth = 0.022 * U;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(...P2(fx - 0.06, -0.2 + (i - 1) * 0.02)); c.lineTo(...P2(fx + 0.07, -0.2 + (i - 1) * 0.022)); c.stroke(); }
    c.beginPath(); c.arc(...P2(fx - 0.06, -0.2), 0.025 * U, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
export const ZAP_SKELETONS = { lorenzo: (c, cx, fy) => skeleton(c, cx, fy), b33p: b33pInnards, ramon: ramonBones };


export function zapCanXray(heroId) { return !!ZAP_SKELETONS[heroId]; }
// Rigs whose feet are not on the floor: Ramon's shoes float, so the arcs reach up to them.
const ZAP_FOOT_LIFT = { ramon: 0.2 };

// THE JOLT. `w` is seconds since contact (0..ZAP_T), `t` a running clock for the flicker,
// cx/feetY where the hero stands in this frame (the rail is at feetY). Heroes are drawn
// side-on at HERO_DRAW_H; `xray` strobes the skeleton in at 12 Hz.
export function drawZapHero(c, heroId, cx0, feetY, w, t, { xray = false } = {}) {
  const q = clamp01(w / ZAP_T);
  const lift = 3 * Math.min(1, w / 0.05) * (1 - clamp01((q - 0.85) / 0.15));
  const jx = (hash(Math.floor(t * 30)) - 0.5) * 1.4, jy = (hash(Math.floor(t * 30) + 7) - 0.5) * 0.8;
  const cx = cx0 + jx, fy = feetY - lift + jy;
  const showX = xray && zapCanXray(heroId) && Math.floor(w * 12) % 2 === 1;
  const paint = (o) => {
    if (heroId === 'lorenzo') frizz(o, cx, fy, Math.min(1, w / 0.06), t);
    drawToon(o, heroId, joltPose(t), cx, fy, U);
  };
  // A context with no transform to read (a test stub) or no DOM gets the plain pose.
  const L = typeof document !== 'undefined' && c.getTransform ? layer(0, c, heroBox(cx, fy), paint) : null;
  if (!L) paint(c);
  else if (showX) {
    tint(L, XNAVY);
    blit(c, L, { glow: '#41c8ff', blur: 5 });
    ZAP_SKELETONS[heroId](c, cx, fy, t);
  } else {
    if (Math.floor(t * 15) % 2) tint(L, 'rgba(190,240,255,0.55)');
    blit(c, L, { glow: '#41c8ff', blur: 4 });
  }
  bootArcs(c, cx, feetY, fy - (ZAP_FOOT_LIFT[heroId] || 0) * U, t);
  bodyArcs(c, cx, fy, t, 2);
}
