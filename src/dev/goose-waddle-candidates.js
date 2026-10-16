// Gallery-only: THE GOOSE, WADDLING — a bake-off (16 Oct 2026).
//
// After the dogs and cats went onto planted gaits, Peter on the goose: "maybe a waddle
// would be better for the goose". What it does today (sprites/animals.js goose()): two
// straight sticks for legs with no joint, the feet going round an ellipse, so a foot on
// the road moves back at less than half the bird's own speed (vx −50) — it skates — and
// the body only bobs.
//
// THE DRAWING IS THE SHIPPED GOOSE, line for line (body, neck, head, two-mandible beak,
// HONK dashes, wings, the one line), copied here so its pose can be driven; only the legs
// are new — a bird's leg, the shin dropping from inside the body to an ankle that breaks
// BACKWARD, the tarsus down to a webbed foot that lands flat. Every take plants its feet:
// a foot on the road moves back at exactly the ground speed, and the frame rate is set
// from the stride, as the dogs' is. The three takes differ in how a short-legged bird
// keeps up at vx −50:
//   A WADDLE  — just steps: a frantic scurry, rocking side to side, head pumping.
//   B CHARGE  — head down and neck out, wings up and beating, longer running strides.
//   C SKIP    — two waddling steps then a wing-flapped hop, over and over; the hop
//               carries ground, so the steps can be slower.
//
// Nothing here is registered in any gameplay registry.
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X, PLAYER_W } from '../game/player.js';
import { GROUND_Y } from '../engine/camera.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { ANIMAL_TALL, ANIMAL_VISUAL } from '../sprites/animals.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;

// The shipped goose's constants (sprites/animals.js), unchanged.
const GOOSE = {
  body: '#f4f1ea', bodyShade: '#d6d0c4', wingShade: '#c9c1b2', ink: '#2a1a16', beak: '#f08a2c',
  beakDark: '#c4611a', leg: '#f08a2c', legDark: '#c4611a',
};
const GOOSE_LINE = 0.55;
const GOOSE_SPAN = { left: 16.4, right: 9.8, top: 17.2 };
const GOOSE_PAD = 5.5;
const SLOT = { box: [16, 11], vx: 50 };
const ENV_W = Math.round(SLOT.box[0] * 4 / 3 * ANIMAL_VISUAL.goose);
const ENV_H = Math.round(SLOT.box[1] * 4 / 3 * ANIMAL_TALL.goose * ANIMAL_VISUAL.goose);
const FIT = Math.min(ENV_W / (GOOSE_SPAN.left + GOOSE_SPAN.right + GOOSE_PAD), ENV_H / GOOSE_SPAN.top);
export const GOOSE_FRAMES = 16;

function stroke(ctx, color, lw, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function fillP(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function inked(ctx, fill, lw, path, color = GOOSE.ink) {
  ctx.beginPath(); path(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function hermite(p0, p1, m0, m1, v) {
  const v2 = v * v, v3 = v2 * v;
  return (2 * v3 - 3 * v2 + 1) * p0 + (v3 - 2 * v2 + v) * m0 + (-2 * v3 + 3 * v2) * p1 + (v3 - v2) * m1;
}
// Two-bone IK, the joint on the `side` of a->b (+1 left).
function ik(ax, ay, bx, by, l1, l2, side) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const dd = Math.min(d, (l1 + l2) * 0.998);
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { x: ax + ux * a + uy * h * side, y: ay + uy * a - ux * h * side };
}

// ------------------------------------------------------------------ the feet
// Goose units, FACING LEFT (the bird's front is −x), feet on y 0. A foot on the road
// moves BACK (+x) at S per cycle; in the air it swings forward on a Hermite curve that
// leaves and arrives at that speed.
function footAt(phase, td, duty, tdX, S, lift) {
  const u = (((phase - td) % 1) + 1) % 1;
  const loX = tdX + S * duty;
  if (u < duty) return { x: lerp(tdX, loX, u / duty), y: 0, down: true };
  const v = (u - duty) / (1 - duty);
  const m = S * (1 - duty) * 0.45;
  return { x: hermite(loX, tdX, m, m, v), y: lift * Math.pow(Math.sin(Math.PI * v), 1.2), down: false };
}

// ------------------------------------------------------------------ the takes
// Each pose(phase) -> { feet: [near, far], bob, rot, pump, nod, flap, flapOut, gapeK }.
// S is the road per cycle in goose units; the frame rate follows from it.
const WADDLE = {
  S: 9.5,
  pose(ph) {
    const near = footAt(ph, 0, 0.6, -2.4, this.S, 1.5), far = footAt(ph, 0.5, 0.6, -2.4, this.S, 1.5);
    const step = Math.cos(TAU * 2 * (ph - 0.3));          // high mid-stance, twice a cycle
    return {
      feet: [near, far], bob: 0.55 * (0.5 + 0.5 * step),
      // The waddle: the body tips onto each foot in turn — tail swings, breast rocks.
      rot: 0.09 * Math.sin(TAU * ph), tail: 0.9 * Math.sin(TAU * ph),
      pump: 0.9 * Math.cos(TAU * 2 * ph), nod: 0.35 * Math.sin(TAU * 2 * ph),
      flap: 0.25 * Math.sin(TAU * 2 * ph), flapOut: 0, gapeK: 1,
    };
  },
};
const CHARGE = {
  S: 13,
  pose(ph) {
    const near = footAt(ph, 0, 0.42, -3.6, this.S, 2.1), far = footAt(ph, 0.5, 0.42, -3.6, this.S, 2.1);
    const step = Math.cos(TAU * 2 * (ph - 0.21));
    return {
      feet: [near, far], bob: 0.5 + 0.7 * (0.5 - 0.5 * step),
      // Head down, neck out low, leaning into it; wings up and beating twice a stride.
      rot: -0.14 + 0.04 * Math.sin(TAU * ph), tail: 0.5 * Math.sin(TAU * ph),
      pump: 1.6 + 0.5 * Math.cos(TAU * 2 * ph), nod: 1.2,
      flap: Math.sin(TAU * 2 * ph + 0.6), flapOut: 1, gapeK: 1.15,
    };
  },
};
// Two steps over the first 60%, then a hop: both feet up and tucked, the body lifted on
// a downbeat of the wings, landing on the near foot as the cycle wraps.
const SKIP = {
  S: 18,
  pose(ph) {
    const near = footAt(ph, 0, 0.32, -2.6, this.S, 1.4), far = footAt(ph, 0.28, 0.32, -2.6, this.S, 1.4);
    // In the hop (0.6..1) both feet are tucked whatever the swing says.
    const hop = ph > 0.6 ? Math.sin(Math.PI * (ph - 0.6) / 0.4) : 0;
    for (const f of [near, far]) if (!f.down) f.y = Math.max(f.y, 2.6 * hop);
    const step = ph < 0.6 ? 0.5 + 0.5 * Math.cos(TAU * (ph - 0.16) / 0.3) : 0;
    return {
      feet: [near, far], bob: 0.45 * step + 4.2 * hop,
      rot: ph < 0.6 ? 0.08 * Math.sin(TAU * ph / 0.6) : -0.08 * hop, tail: ph < 0.6 ? 0.8 * Math.sin(TAU * ph / 0.6) : -0.6 * hop,
      pump: 0.8 * Math.cos(TAU * ph / 0.3) * (ph < 0.6 ? 1 : 0) + 1.0 * hop, nod: 0.6 * hop,
      // The wings open for the hop and beat once, down as he rises.
      flap: ph < 0.6 ? 0.2 : Math.cos(Math.PI * (ph - 0.6) / 0.4) * 1.2, flapOut: hop > 0 ? Math.min(1, hop * 1.5) : 0, gapeK: 1,
    };
  },
};

// ------------------------------------------------------------------ the bird
// The shipped goose() with its pose driven: `phase` 0..1, the take's pose.
function paintGoose(ctx, w, h, phase, take) {
  const P = GOOSE;
  const q = take.pose(phase);
  const u = phase * TAU;
  const s = Math.min(w / (GOOSE_SPAN.left + GOOSE_SPAN.right + GOOSE_PAD), h / GOOSE_SPAN.top);
  ctx.save();
  ctx.translate(w - GOOSE_SPAN.right * s, h);
  ctx.scale(s, s);
  // The hips ride the body: rotate them about the body's centre with it.
  const pivot = { x: 1.0, y: -6.2 - q.bob };
  const rotPt = (x, y) => {
    const c = Math.cos(q.rot), sn = Math.sin(q.rot);
    const dx = x - pivot.x, dy = y - pivot.y;
    return { x: pivot.x + dx * c - dy * sn, y: pivot.y + dx * sn + dy * c };
  };
  // Legs: shin from inside the body to an ankle that breaks BACKWARD (+x), tarsus to a
  // webbed foot lying flat, toes forward. Far leg darker and drawn first.
  for (const side of [1, 0]) {
    const f = q.feet[side];
    const hip = rotPt(side ? 1.2 : -0.2, -4.6 - q.bob);
    const fy = -f.y;
    const ank = ik(hip.x, hip.y, f.x + 0.1, fy - 0.35, 3.0, 2.9, -1);
    const col = side ? P.legDark : P.leg;
    stroke(ctx, P.ink, 1.25, (c) => { c.moveTo(hip.x, hip.y); c.lineTo(ank.x, ank.y); c.lineTo(f.x + 0.1, fy - 0.35); });
    stroke(ctx, col, 0.72, (c) => { c.moveTo(hip.x, hip.y); c.lineTo(ank.x, ank.y); c.lineTo(f.x + 0.1, fy - 0.35); });
    // The web: flat on the road, folded and toes-down in the air.
    const tilt = f.down ? 0 : 0.6 * Math.min(1, f.y / 1.2);
    ctx.save(); ctx.translate(f.x, fy); ctx.rotate(-tilt);
    inked(ctx, col, GOOSE_LINE, (c) => { c.moveTo(0.6, -0.5); c.lineTo(-2.3, -0.1); c.lineTo(-1.9, 0.45); c.lineTo(0.5, 0.25); c.closePath(); });
    ctx.restore();
  }
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(q.rot);
  ctx.translate(-pivot.x, 0);
  // The body's own drawing as the shipped one, the tail tip riding `tail`.
  const flap = Math.sin(u + 1) * 0.15 + q.flap;
  const wing = (lift, far) => (c) => {
    const a = -0.9 - lift * 0.5 - (far ? 0.25 : 0) - q.flapOut * 0.6;
    const R = 8 + q.flapOut * 1.5;
    const tx = 1 + Math.cos(a) * R, ty = -2 + Math.sin(a) * R;
    c.moveTo(-2, -2.2);
    c.quadraticCurveTo(tx - 4, ty - 1.5, tx, ty);
    c.lineTo(tx + 1.6, ty + 1.4); c.lineTo(tx - 0.2, ty + 1.8); c.lineTo(tx + 1, ty + 3.2); c.lineTo(tx - 1, ty + 3.2);
    c.quadraticCurveTo(3, -1, 3.6, -1.2); c.closePath();
  };
  inked(ctx, P.wingShade, GOOSE_LINE, wing(flap, true));
  const nb = q.nod;
  const pm = -q.pump;   // the head pumps FORWARD (−x)
  const tl = q.tail;
  const body = (c) => {
    c.moveTo(-4.2, -2.4); c.quadraticCurveTo(-5.8, 2.8, 0.8, 3); c.quadraticCurveTo(5.8, 3, 7.2, -1);
    c.lineTo(9.2, -4.8 + tl); c.lineTo(6.4, -3.6); c.quadraticCurveTo(2, -4.4, -4.2, -2.4); c.closePath();
  };
  const neck = (c) => {
    c.moveTo(-0.6, -3.8);
    c.bezierCurveTo(-4.2 + pm * 0.4, -4.9, -6.4 + pm * 0.8, -4.8 + nb, -10.2 + pm, -3.8 + nb);
    c.lineTo(-10.6 + pm, -1.3 + nb);
    c.bezierCurveTo(-7.4 + pm * 0.8, -1.6 + nb, -5.8 + pm * 0.4, -0.4, -3.2, 1.8);
    c.closePath();
  };
  const head = (c) => c.ellipse(-11.2 + pm, -2.5 + nb, 2.2, 1.7, -0.1, 0, TAU);
  const snap = Math.max(0, Math.sin(u * 2));
  const gape = Math.min(1, (snap ** 0.55) * q.gapeK);
  const beakAt = (rot, path) => {
    ctx.save(); ctx.translate(-12.9 + pm, -2.35 + nb); ctx.rotate(rot);
    inked(ctx, P.beak, GOOSE_LINE, path); ctx.restore();
  };
  beakAt(-gape * 0.42, (c) => { c.moveTo(1.6, 0.05); c.lineTo(-3.6, 0.1); c.quadraticCurveTo(-3.4, 0.75, -2.4, 0.95); c.lineTo(1.6, 1.2); c.closePath(); });
  beakAt(gape * 0.3, (c) => { c.moveTo(1.6, -1.05); c.quadraticCurveTo(-1.6, -1.05, -4.2, 0.05); c.lineTo(-3.6, 0.2); c.lineTo(1.6, 0.2); c.closePath(); });
  if (gape > 0.25) {
    const k = (gape - 0.25) / 0.75;
    ctx.save(); ctx.translate(-16.4 + pm, -2.3 + nb);
    ctx.strokeStyle = P.ink; ctx.lineWidth = GOOSE_LINE * 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const a of [-0.75, 0, 0.75]) {
      const r0 = 1.8 + 0.4 * k, r1 = r0 + 1.2 + 1.6 * k, ang = Math.PI + a;
      ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    }
    ctx.stroke(); ctx.restore();
  }
  for (const part of [body, neck, head]) stroke(ctx, P.ink, GOOSE_LINE * 2, part);
  for (const part of [body, neck, head]) fillP(ctx, P.body, part);
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  fillP(ctx, P.bodyShade, (c) => c.ellipse(1.6, 2.8, 7.4, 2.2, 0, 0, TAU));
  ctx.restore();
  ctx.save(); ctx.beginPath(); neck(ctx); ctx.clip();
  fillP(ctx, P.bodyShade, (c) => {
    c.moveTo(-10.8 + pm, -1.2 + nb); c.bezierCurveTo(-7.4 + pm * 0.8, -1.4 + nb, -5.8 + pm * 0.4, -0.2, -3.2, 2.2);
    c.lineTo(-2.6, 0.6); c.bezierCurveTo(-5.6 + pm * 0.4, -1.6, -7.6 + pm * 0.8, -2.2 + nb, -10.8 + pm, -2 + nb); c.closePath();
  });
  ctx.restore();
  fillP(ctx, '#1a1816', (c) => c.arc(-11.4 + pm, -3 + nb, 0.45, 0, TAU));
  inked(ctx, P.body, GOOSE_LINE, wing(flap * 0.8, false));
  ctx.restore();
}

export const GOOSE_CANDIDATES = [
  { letter: 'A', id: 'waddle', name: 'WADDLE', take: WADDLE,
    note: 'Just steps, as asked: the body tips onto each foot in turn (the tail swinging, the breast rocking), the head pumping forward on every step, wings folded. Feet planted. To keep up at its speed on legs this short it has to scurry — about a dozen steps a second.' },
  { letter: 'B', id: 'charge', name: 'CHARGE', take: CHARGE,
    note: 'The angry-goose charge: head down and neck out level, leaning in, wings up and beating, longer running strides. Feet planted. Fewer, bigger steps than A.' },
  { letter: 'C', id: 'skip', name: 'WADDLE + HOP', take: SKIP,
    note: 'Two waddling steps, then a wing-flapped hop, over and over — the hop carries ground, so the waddle can be slower and more readable than A’s. Feet planted on every step.' },
];
export const GOOSE_NOW = { letter: 'NOW', id: 'now', name: 'THE GOOSE (shipped)',
  note: 'What Field Service deals today, through the real run painter — C reworked since 16 Oct: the old body rhythm, quick planted steps, a hop, rooted wings.' };

// ------------------------------------------------------------- frames + fps
// Rasters at 12 px/unit, cycled at the rate that keeps a planted foot on the road:
// road per cycle = S goose units x the fit.
const built = new Map();
function build(cand) {
  if (built.has(cand.id)) return built.get(cand.id);
  const RS = 12;
  const frames = [];
  for (let f = 0; f < GOOSE_FRAMES; f++) {
    const r = document.createElement('canvas'); r.width = ENV_W * RS; r.height = ENV_H * RS;
    const rc = r.getContext('2d'); rc.scale(RS, RS);
    paintGoose(rc, ENV_W, ENV_H, f / GOOSE_FRAMES, cand.take);
    frames.push(r);
  }
  const fps = GOOSE_FRAMES * SLOT.vx / (cand.take.S * FIT);
  const out = { frames, fps };
  built.set(cand.id, out);
  return out;
}

function placeGoose(c, cand, boxX, t) {
  const { frames, fps } = build(cand);
  const fr = frames[Math.floor(t * fps) % GOOSE_FRAMES];
  const [bw] = SLOT.box;
  drawSoftContactShadow(c, boxX + bw / 2, GROUND_Y - 1, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  c.fillStyle = 'rgba(224,72,72,0.32)';
  c.fillRect(boxX, GROUND_Y - 1, bw, 1);
  const ox = boxX - Math.floor((ENV_W - bw) / 2), oy = GROUND_Y - ENV_H;
  c.drawImage(fr, ox, oy, ENV_W, ENV_H);
}
const geese = new Map();
function drawNow(c, x, t, key) {
  if (!geese.has(key)) geese.set(key, makeObstacle('goose', 0));
  const e = geese.get(key);
  e.x = x; e.bobPhase = 0; e.gaitPh = null;
  drawWorldEntity(c, e, 0, t, null, {});
}
const drawAny = (c, cand, x, t, key) => (cand === GOOSE_NOW ? drawNow(c, x, t, key) : placeGoose(c, cand, x, t));

// ------------------------------------------------------------- the tiles
const SCROLL = 110, CLOSE = SCROLL + SLOT.vx;
const START = 262, LOOP = 2.8, HOP_V = 250, HOP_G = 900;
const HERO_C = PLAYER_X + PLAYER_W / 2;
export function drawGooseApproach(ctx, t, strips, cand) {
  const ph = ((t % LOOP) + LOOP) % LOOP;
  const x = START - CLOSE * ph;
  const hop = ph - (START - HERO_C - 34) / CLOSE;
  const air = hop > 0 && hop < (2 * HOP_V) / HOP_G;
  const y = air ? HOP_V * hop - 0.5 * HOP_G * hop * hop : 0;
  drawCabinetLane(ctx, t, 'plumber', strips, (c, tt) => {
    drawAny(c, cand, x, tt, `a${strips.length}`);
    const pose = air
      ? { kind: 'jump', time: tt, vy: HOP_V - HOP_G * hop, grounded: false, facing: 1 }
      : { kind: 'run', phase: tt * 1.6 % 1, time: tt, grounded: true, facing: 1 };
    drawToon(c, 'lorenzo', pose, PLAYER_X, GROUND_Y - y, HERO_DRAW_H);
  }, { hero: null });
}
export function drawGooseLineup(ctx, t, strips) {
  const all = [GOOSE_NOW, ...GOOSE_CANDIDATES];
  const gap = 60, span = gap * all.length;
  drawCabinetLane(ctx, t, 'plumber', strips, (c, tt) => {
    all.forEach((cand, i) => {
      const x = 250 - ((((CLOSE * tt - i * gap) % span) + span) % span) + gap * 0.5;
      drawAny(c, cand, x, tt, `l${i}`);
      c.save();
      c.font = '700 4px ui-monospace, Menlo, monospace'; c.textAlign = 'center';
      const hx = x + SLOT.box[0] / 2;
      c.fillStyle = 'rgba(16,14,22,0.78)'; c.fillRect(hx - 5, GROUND_Y - 33, 10, 5);
      c.fillStyle = '#f6d33c'; c.fillText(cand.letter === 'NOW' ? '·' : cand.letter, hx, GROUND_Y - 29.2);
      c.restore();
    });
  }, { hero: null });
}
export const GOOSE_SIDE_H = 96;
export function drawGooseSideBySide(ctx, t) {
  const all = [GOOSE_NOW, ...GOOSE_CANDIDATES];
  const floor = 70;
  ctx.fillStyle = '#efe9dd'; ctx.fillRect(0, 0, 480, GOOSE_SIDE_H);
  ctx.fillStyle = '#d9d0bf'; ctx.fillRect(0, floor, 480, GOOSE_SIDE_H - floor);
  ctx.save(); ctx.scale(2, 2); ctx.translate(0, floor / 2 - GROUND_Y);
  const step = 240 / all.length;
  all.forEach((cand, i) => drawAny(ctx, cand, step * (i + 0.5) - SLOT.box[0] / 2, t, `s${i}`));
  ctx.restore();
  ctx.font = '700 7px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#4a4238';
  all.forEach((cand, i) => ctx.fillText(cand.letter === 'NOW' ? 'NOW' : `${cand.letter} ${cand.name}`, 480 * (i + 0.5) / all.length, floor + 18));
}

// One take at `phase` into a w x h box (for frame sheets).
export function paintGooseCandidate(ctx, w, h, cand, phase) { paintGoose(ctx, w, h, phase, cand.take); }
export const GOOSE_ENV = { w: ENV_W, h: ENV_H, fit: FIT };
