// CORPORATE KOMBAT — the safe as a bonus target (lab). 15 Oct 2026: office-3 (floor 88, the
// money floor, at dusk) is getting a new bonus, CRACK 3 SAFES, in place of the escort bonus. The safe
// becomes the target. Peter's terms, the same day:
//   * it must read INSTANTLY as a safe at in-run size, and as a PRIZE to crack, not a hazard;
//   * it stands DOUBLE THE HEIGHT of a normal ground obstacle (crate 12x11 / cactus 13x12 box),
//     so every candidate here is a 16x24 box — painted 21x32 world units, the run's 4/3;
//   * it is SHOT to crack — running into it does not — so the cracked state is the result of
//     shots: bullet dents in the door, a flash at the lock, the door blown open;
//   * shooting it open makes MONEY FLY OUT — banknotes and coins bursting from the door, both
//     COLLECTABLE: the coin is the game's own coin pickup, the note a pickup drawn here.
//
// NOW is the shipped `officeSafe` prop (sprites/officeProps.js), a 17x14 jump-it-or-crack-it
// hazard, through the real run painter; today a break just removes it. A–H are new drawings in
// the LIGNE ’89 hand (one ink, flat fill, one lit sliver and one shade band per body), each with
// its own cracked-open state. Nothing here is registered in any gameplay registry.
import { GROUND_Y } from '../engine/camera.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { box, poly, line, circ, ell, rbox, rrPath, pen, fs } from '../engine/stylePacks/officeLigne/line.js';
import { makeObstacle, makePickup } from '../game/entities.js';
import { drawWorldEntity } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { drawOfficeProductionScene } from './office-production.js';

const TAU = Math.PI * 2;
const INK = '#1f1d26';
const LW = 0.55, LWI = 0.32, LWF = 0.2;
const RED = '#e0203a', RED_DK = '#a3162c', RED_LT = '#ff6a78';
const COBALT = '#3f5fd8', COBALT_DK = '#2b3f9c', COBALT_LT = '#7d95f2';
const LEMON = '#f6df4a', LEMON_LT = '#fff4a6';
const TEAL = '#2fbcb0', TEAL_DK = '#1f8a82', TEAL_LT = '#86e3d9';
const STEEL = '#c9ced8', STEEL_DK = '#8e95a4', STEEL_LT = '#f2f4f8';
const CHAR = '#3a3846', CHAR_DK = '#2a2833';
const PAPER = '#ffffff';
const BRASS = '#d9ae45', BRASS_DK = '#a37a22', BRASS_LT = '#f7e08a';
const MARBLE = '#f5f1eb', MARBLE_DK = '#d5cdc3';
const IVORY = '#efe6d2', IVORY_DK = '#cfc3a8';
const CASH = '#8fcf8a', CASH_DK = '#5fa45e';
const VAULT = '#16131d';

// The box every candidate stands in: twice a crate's height (Peter: "double the height of normal
// obstacles"). The painted envelope is the run's 4/3 of it, ground at y = H.
export const SAFE_BOX = Object.freeze([16, 24]);
const W = Math.round(SAFE_BOX[0] * 4 / 3), H = Math.round(SAFE_BOX[1] * 4 / 3); // 21 x 32

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

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
const rr = (x, y, w, h, r) => (p) => rrPath(p, x, y, w, h, r);

function glint(c, x, y, s, col = '#ffffff') {
  if (s <= 0) return;
  poly(c, [x, y - s, x + s * 0.28, y - s * 0.28, x + s, y, x + s * 0.28, y + s * 0.28,
    x, y + s, x - s * 0.28, y + s * 0.28, x - s, y, x - s * 0.28, y - s * 0.28], col);
}

// ------------------------------------------------------------------ parts
// The combination dial: ring, face, twelve ticks and a red pointer turning on its 8-frame ring.
// A cracked dial stops dead.
function dial(c, x, y, r, f, st, ring = STEEL, face = STEEL_LT) {
  const a = st.since >= 0 ? 0.7 : (f / 8) * TAU;
  circ(c, x, y, r, ring, INK, LWI);
  circ(c, x, y, r * 0.7, face, INK, LWF);
  for (let k = 0; k < 12; k++) {
    const q = a + (k / 12) * TAU;
    line(c, x + Math.cos(q) * r * 0.74, y + Math.sin(q) * r * 0.74, x + Math.cos(q) * r * 0.94, y + Math.sin(q) * r * 0.94, INK, 0.16);
  }
  line(c, x, y, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, RED, 0.38);
  circ(c, x, y, r * 0.16, INK);
}

// The spoked handle wheel, three or more spokes with knobs on the ends.
function wheel(c, x, y, r, n, col, a = 0.4) {
  for (let k = 0; k < n; k++) {
    const q = a + (k / n) * TAU;
    line(c, x, y, x + Math.cos(q) * r, y + Math.sin(q) * r, INK, 0.9);
    line(c, x, y, x + Math.cos(q) * r, y + Math.sin(q) * r, col, 0.45);
    circ(c, x + Math.cos(q) * r, y + Math.sin(q) * r, 0.6, col, INK, LWF);
  }
  circ(c, x, y, r * 0.32, col, INK, LWF);
}

// Where the shots landed on the door, in door-local fractions, in the order they hit.
const HOLES = [[0.3, 0.3], [0.68, 0.62], [0.36, 0.78]];
function holes(c, dw, dh, n) {
  for (let i = 0; i < Math.min(n, HOLES.length); i++) {
    const [fx, fy] = HOLES[i];
    const x = fx * dw, y = fy * dh;
    for (let k = 0; k < 4; k++) {
      const q = 0.4 + k * 1.6;
      line(c, x, y, x + Math.cos(q) * 1.4, y + Math.sin(q) * 1.4, INK, 0.14);
    }
    circ(c, x, y, 0.75, STEEL_LT, INK, LWF);
    circ(c, x, y, 0.42, INK);
  }
}

// The open strongbox: a dark cavity with a shelf, banded cash above, gold bars below.
function cavity(c, x, y, w, h, contents = 'both') {
  rbox(c, x, y, w, h, 0.5, VAULT, INK, LWI);
  box(c, x, y, w, 0.9, '#2c2638');
  const shelf = y + h * 0.5;
  line(c, x + 0.3, shelf, x + w - 0.3, shelf, STEEL_DK, 0.5);
  if (contents !== 'gold') {
    const bw = Math.min(4.2, (w - 1.2) / 2);
    for (let k = 0; k < 2; k++) {
      for (let j = 0; j < 2; j++) {
        const bx = x + 0.6 + k * (bw + 0.2), by = shelf - 1.5 - j * 1.5;
        box(c, bx, by, bw, 1.4, CASH, INK, LWF);
        box(c, bx + bw / 2 - 0.4, by, 0.8, 1.4, PAPER);
      }
    }
  }
  if (contents !== 'cash') {
    const n = Math.max(2, Math.floor((w - 1) / 3));
    const by = y + h - 0.4;
    for (let k = 0; k < n; k++) {
      const bx = x + 0.6 + k * ((w - 1.2) / n);
      poly(c, [bx, by, bx + 2.6, by, bx + 2.1, by - 1.5, bx + 0.5, by - 1.5], BRASS, INK, LWF);
    }
    for (let k = 0; k < n - 1; k++) {
      const bx = x + 1.9 + k * ((w - 1.2) / n);
      poly(c, [bx, by - 1.5, bx + 2.6, by - 1.5, bx + 2.1, by - 3.0, bx + 0.5, by - 3.0], BRASS_LT, INK, LWF);
    }
    glint(c, x + w * 0.6, by - 2.8, 1.0, '#fffbe0');
  }
}

// A door hinged at hx (its right edge if hinge = 'right'), swung by p (0 shut, 1 blown open):
// the front face narrows towards the hinge, then the inside face swings out past it, with the
// locking bolts on its free edge. front(c) / back(c) paint in door-local 0..dw x 0..dh.
function swingDoor(c, hx, y, dw, dh, p, hinge, front, back) {
  const k = Math.cos(p * 1.95);
  c.save();
  if (hinge === 'left') { c.translate(hx * 2, 0); c.scale(-1, 1); }
  if (k > 0.02) {
    c.save();
    c.translate(hx - dw * k, y);
    c.scale(k, 1);
    front(c);
    c.restore();
  } else if (k < -0.02) {
    const ak = -k;
    c.save();
    c.translate(hx, y);
    c.scale(ak, 1);
    back(c);
    c.restore();
    // The door's thickness on its free edge, and the bolts that held it.
    const ex = hx + dw * ak;
    box(c, ex, y + 0.4, 1.3, dh - 0.8, STEEL_DK, INK, LWI);
    for (const fy of [0.2, 0.5, 0.8]) box(c, ex + 1.3, y + dh * fy - 0.5, 1.6, 1.0, STEEL, INK, LWF);
  }
  c.restore();
}

// The inside of a steel door: a plain plate with the bolt-work showing.
function doorBack(col, dk) {
  return (dw, dh) => (c) => {
    body(c, rr(0, 0, dw, dh, 0.6), col, (p) => box(p, 0, 0, dw * 0.22, dh, dk));
    rbox(c, dw * 0.25, dh * 0.15, dw * 0.6, dh * 0.7, 0.4, null, INK, LWF);
    line(c, dw * 0.35, dh * 0.5, dw * 0.95, dh * 0.5, STEEL_DK, 0.6);
  };
}

// ---------------------------------------------------------------- the money
// What a crack throws out is COLLECTABLE (Peter, 15 Oct): the game's own coin pickup and a
// banknote pickup drawn for this sheet. Each arcs out of the door's mouth to a resting spot at
// pickup height — some back toward the hero, some over the safe, some beyond it — then hangs
// there bobbing, the way a tossed coin waits to be run through. World units, `s` = seconds since
// the crack. [dx from the mouth, resting alt, flight time, arc height].
const COIN_FLIGHTS = [[-26, 8, 0.55, 14], [-14, 20, 0.5, 10], [4, 30, 0.45, 8], [22, 14, 0.6, 16], [34, 6, 0.7, 18]];
const NOTE_FLIGHTS = [[-20, 13, 0.75, 12], [-6, 28, 0.6, 10], [14, 24, 0.7, 14], [30, 11, 0.85, 16]];
const ease = (u) => 1 - (1 - u) * (1 - u);

// The banknote pickup: a 10x6 green note, inked, a pale border and a white oval with the $,
// a soft lemon halo like the coin's, flipping and swaying as it hangs. Reads as money, not paper.
export function drawNotePickup(ctx, cx, cy, t, phase = 0) {
  const flip = Math.cos(t * 2.6 + phase * 5);
  const w = 10 * (0.35 + 0.65 * Math.abs(flip)), hh = 6;
  ctx.save();
  ctx.translate(cx, cy);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 8.5);
  g.addColorStop(0, 'rgba(246,223,74,0.42)');
  g.addColorStop(1, 'rgba(246,223,74,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-9, -9, 18, 18);
  ctx.rotate(Math.sin(t * 3.1 + phase * 3) * 0.22);
  rbox(ctx, -w / 2, -hh / 2, w, hh, 0.5, CASH, INK, 0.45);
  if (w > 4) {
    rbox(ctx, -w / 2 + 0.8, -hh / 2 + 0.8, w - 1.6, hh - 1.6, 0.3, null, CASH_DK, 0.3);
    ell(ctx, 0, 0, Math.min(2.4, w * 0.24), 1.9, flip > 0 ? PAPER : '#e8f6e6', INK, 0.2);
    if (flip > 0 && w > 7) {
      ctx.font = '700 3.2px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = CASH_DK;
      ctx.fillText('$', 0, 0.2);
    }
  }
  ctx.restore();
}

let coinEnts = null;
function moneyBurst(ctx, mx, my, s, t) {
  if (s < 0) return;
  if (!coinEnts) coinEnts = COIN_FLIGHTS.map(() => makePickup('coin', 0, 0));
  const arc = (dx, alt, dur, ah) => {
    const u = Math.min(1, s / dur), e = ease(u);
    const x1 = mx + dx, y1 = GROUND_Y - alt;
    const bob = u >= 1 ? Math.sin((s - dur) * 4 + dx) * 1.2 : 0;
    return [mx + (x1 - mx) * e, my + (y1 - my) * u - ah * 4 * u * (1 - u) + bob];
  };
  NOTE_FLIGHTS.forEach(([dx, alt, dur, ah], i) => {
    const [x, y] = arc(dx, alt, dur, ah);
    drawNotePickup(ctx, x, y, t, i * 0.37 + 0.1);
  });
  COIN_FLIGHTS.forEach(([dx, alt, dur, ah], i) => {
    const [x, y] = arc(dx, alt, dur, ah);
    const e = coinEnts[i];
    e.x = x - e.w / 2;
    e.alt = GROUND_Y - y - e.h / 2;
    e.bobPhase = i * 0.61;
    drawWorldEntity(ctx, e, 0, t, null, {});
  });
}

// The flash at the lock the instant it gives, and smoke from the hole after.
function crackFlash(c, x, y, s) {
  if (s < 0) return;
  if (s < 0.16) {
    const r = 3 + s * 50, q = 1 - s / 0.16;
    c.save();
    c.globalAlpha = q;
    glint(c, x, y, r, LEMON_LT);
    glint(c, x, y, r * 0.55, PAPER);
    c.restore();
  }
  for (let k = 0; k < 3; k++) {
    const d = ((s * 0.9 + k / 3) % 1);
    if (s < 0.2 + k * 0.15) continue;
    c.save();
    c.globalAlpha = 0.55 * (1 - d);
    circ(c, x + d * 3 + Math.sin(d * 6 + k) * 0.8, y - d * 12, 1 + d * 2.6, '#cfc8d8');
    c.restore();
  }
}

// --------------------------------------------------------- the generic safe
// One upright safe: body, a door on its face, dial and handle on the door, feet. Each candidate
// fills `o` (sizes and colours) and may add its own extras in front of or behind it.
function safe(c, o, t, st) {
  const f = frameOf(t, 8, 6);
  const g = H - 0.3;
  const bx = o.x ?? 1.2, bw = o.w ?? W - 2.4, top = o.top ?? 1.4, bh = (o.bottom ?? g - 1.6) - top;
  const inset = o.inset ?? 1.6;
  const dx = bx + inset, dy = top + inset, dw = bw - inset * 2 - (o.hingeRoom ?? 0.6), dh = bh - inset * 2;
  // Feet.
  if (o.feet !== false) {
    box(c, bx + 0.8, g - 1.8, 3.0, 1.8, INK);
    box(c, bx + bw - 3.8, g - 1.8, 3.0, 1.8, INK);
  }
  body(c, rr(bx, top, bw, bh, o.round ?? 1.0), o.body, (p) => {
    box(p, bx + bw - bw * 0.16, top, bw, bh, o.bodyDk);
    box(p, bx + 0.7, top + 0.8, 0.9, bh - 1.6, o.bodyLt);
  });
  o.onBody?.(c, { bx, bw, top, bh, dx, dy, dw, dh }, t, st);
  const p = st.p;
  if (p > 0) cavity(c, dx, dy, dw, dh, o.contents);
  const front = (c2) => {
    body(c2, rr(0, 0, dw, dh, 0.7), o.door, (q) => box(q, dw - dw * 0.12, 0, dw, dh, o.doorDk ?? o.bodyDk));
    if (o.pin) rbox(c2, 0.8, 0.8, dw - 1.6, dh - 1.6, 0.5, null, o.pin, 0.3);
    o.onDoor?.(c2, dw, dh, f, st);
    const dlx = dw * (o.dialX ?? 0.42), dly = dh * (o.dialY ?? 0.36);
    if (o.dial !== false) dial(c2, dlx, dly, o.dialR ?? 2.9, f, st, o.dialRing, o.dialFace);
    if (o.handle === 'wheel') wheel(c2, dw * 0.5, dh * 0.7, o.wheelR ?? 2.6, o.spokes ?? 4, o.handleCol ?? BRASS);
    else if (o.handle === 'lever') {
      circ(c2, dw * 0.78, dh * 0.38, 0.9, o.handleCol ?? BRASS, INK, LWF);
      box(c2, dw * 0.78 - 0.45, dh * 0.38, 0.9, dh * 0.24, o.handleCol ?? BRASS, INK, LWF);
    }
    holes(c2, dw, dh, st.hits);
  };
  const back = doorBack(o.doorBack ?? STEEL, STEEL_DK)(dw, dh);
  swingDoor(c, dx + dw, dy, dw, dh, p, o.hinge ?? 'right', front, back);
  // Hinges on the body edge.
  const hx = (o.hinge ?? 'right') === 'right' ? dx + dw + 0.1 : dx - 1.1;
  box(c, hx, dy + 2, 1.0, 2.6, STEEL_DK, INK, LWF);
  box(c, hx, dy + dh - 4.6, 1.0, 2.6, STEEL_DK, INK, LWF);
  o.after?.(c, { bx, bw, top, bh, dx, dy, dw, dh }, t, st);
  return { mouthX: dx + dw / 2, mouthY: dy + dh * 0.45, lockX: dx + dw * (o.dialX ?? 0.42), lockY: dy + dh * (o.dialY ?? 0.36) };
}

// ================================================================ candidates
// Each paint(c, t, st) draws inside the 21x32 envelope (ground at y = 32) and returns the door's
// mouth and lock points so the scene can throw the money and the flash from the right place.

// A — the shipped safe, grown to 2x: gunmetal, gold pinstripe, brass wheel.
function paintA(c, t, st) {
  return safe(c, { body: '#34323f', bodyDk: '#24222c', bodyLt: '#55536a', door: '#3c3a48', doorDk: '#302e3a',
    pin: BRASS, handle: 'wheel', handleCol: BRASS, dialY: 0.32, wheelR: 3.0 }, t, st);
}

// B — a round bank-vault door standing in its steel frame: the one silhouette nothing else has.
function paintB(c, t, st) {
  const f = frameOf(t, 8, 6);
  const g = H - 0.3;
  const cx = W / 2, cy = 14.5, R = 8.6;
  // The frame: a square steel plate on a plinth.
  box(c, 2.0, g - 3.0, W - 4.0, 3.0, CHAR, INK, LW);
  body(c, rr(0.6, 2.8, W - 1.2, g - 5.4, 0.8), STEEL, (p) => {
    box(p, W - 3.4, 0, 4, H, STEEL_DK);
    box(p, 1.3, 3.4, 0.9, g - 7, STEEL_LT);
  });
  for (const [x, y] of [[2.2, 4.4], [W - 4.2, 4.4], [2.2, g - 5.0], [W - 4.2, g - 5.0]]) circ(c, x + 0.5, y + 0.5, 0.5, STEEL_DK, INK, LWF);
  const p = st.p;
  if (p > 0) {
    circ(c, cx, cy, R, VAULT, INK, LWI);
    c.save(); c.beginPath(); c.arc(cx, cy, R - 0.3, 0, TAU); c.clip();
    cavity(c, cx - R, cy - R * 0.55, R * 2, R * 1.35);
    c.restore();
  }
  const k = Math.cos(p * 1.95);
  if (k > 0.02) {
    // Front face: an ellipse narrowing toward the hinge on the right.
    const ex = cx + R - R * k;
    ell(c, ex, cy, R * k, R, '#b9bfcc', INK, LW);
    c.save();
    c.translate(ex, cy);
    c.scale(k, 1);
    circ(c, 0, 0, R - 1.4, null, STEEL_DK, 0.5);
    for (let i = 0; i < 12; i++) {
      const q = (i / 12) * TAU;
      circ(c, Math.cos(q) * (R - 0.8), Math.sin(q) * (R - 0.8), 0.42, STEEL_LT, INK, LWF);
    }
    wheel(c, 0, 1.6, 4.6, 6, STEEL_LT, 0.3);
    dial(c, 0, -4.2, 2.1, f, st, STEEL, STEEL_LT);
    for (let i = 0; i < Math.min(st.hits, 3); i++) {
      const [hx, hy] = [[-4, -1], [3.6, -3], [-2.6, 4.6]][i];
      circ(c, hx, hy, 0.75, STEEL_LT, INK, LWF);
      circ(c, hx, hy, 0.42, INK);
    }
    c.restore();
  } else if (k < -0.02) {
    const ak = -k, ex = cx + R + R * ak;
    ell(c, ex, cy, R * ak, R, STEEL, INK, LW);
    ell(c, ex, cy, R * ak * 0.6, R * 0.6, null, STEEL_DK, 0.4);
    box(c, ex + R * ak - 0.2, cy - R * 0.5, 1.4, R, STEEL_DK, INK, LWI);
    for (const fy of [-0.35, 0, 0.35]) box(c, ex + R * ak + 1.0, cy + R * fy - 0.5, 1.8, 1.0, STEEL_LT, INK, LWF);
  }
  box(c, cx + R - 0.4, cy - 2.0, 1.6, 4.0, STEEL_DK, INK, LWF);
  return { mouthX: cx, mouthY: cy, lockX: cx, lockY: cy - 4.2 };
}

// C — the safe on a red hand truck, strapped on: "wheeled in for the heist".
function paintC(c, t, st) {
  const g = H - 0.3;
  // The truck behind: handle rising above, the toe plate, the wheel.
  line(c, W - 2.4, 0.8, W - 2.4, g - 2.6, INK, 1.5);
  line(c, W - 2.4, 0.8, W - 2.4, g - 2.6, RED, 0.75);
  line(c, W - 2.4, 0.8, W - 4.6, 0.4, INK, 1.5);
  line(c, W - 2.4, 0.8, W - 4.6, 0.4, RED, 0.75);
  const r = safe(c, { x: 0.6, w: W - 4.4, top: 4.4, bottom: g - 3.2, feet: false, body: TEAL, bodyDk: TEAL_DK, bodyLt: TEAL_LT,
    door: '#41cbbf', doorDk: TEAL_DK, pin: PAPER, handle: 'lever', handleCol: STEEL_LT, dialRing: CHAR, dialFace: STEEL_LT }, t, st);
  box(c, 0.2, g - 3.2, W - 2.2, 1.4, RED, INK, LWI);
  // Two straps over the body.
  for (const y of [8.4, 21.4]) {
    box(c, 0.4, y, W - 4.0, 1.3, '#ffb23d', INK, LWF);
    box(c, W / 2 - 3.6, y - 0.2, 1.4, 1.7, STEEL, INK, LWF);
  }
  circ(c, W - 3.2, g - 2.2, 2.2, INK);
  circ(c, W - 3.2, g - 2.2, 0.9, STEEL_DK);
  return r;
}

// D — lacquer-red safe whose dial sits in a painted bullseye: the target says "shoot here".
function paintD(c, t, st) {
  return safe(c, { body: RED, bodyDk: RED_DK, bodyLt: RED_LT, door: '#ec3149', doorDk: RED_DK,
    dialX: 0.5, dialY: 0.45, dialR: 2.4, dialRing: CHAR, dialFace: STEEL_LT, handle: 'lever', handleCol: STEEL_LT,
    onDoor: (c2, dw, dh) => {
      const x = dw * 0.5, y = dh * 0.45;
      circ(c2, x, y, 6.2, PAPER, INK, LWF);
      circ(c2, x, y, 4.9, RED);
      circ(c2, x, y, 3.6, PAPER);
    } }, t, st);
}

// E — gold-plated: the money floor's own trophy, with a black door and a white dial.
function paintE(c, t, st) {
  return safe(c, { body: BRASS, bodyDk: BRASS_DK, bodyLt: BRASS_LT, door: CHAR, doorDk: CHAR_DK, pin: BRASS,
    handle: 'wheel', handleCol: BRASS_LT, dialRing: BRASS_LT, dialFace: PAPER,
    after: (c2, b, tt) => glint(c2, b.bx + 2.2, b.top + 2.4, 1.3 + 0.4 * Math.sin(tt * 4)) }, t, st);
}

// F — cobalt, so full the notes stick out of the door seams and flap.
function paintF(c, t, st) {
  const f = frameOf(t, 8, 8);
  return safe(c, { body: COBALT, bodyDk: COBALT_DK, bodyLt: COBALT_LT, door: '#4a6ae0', doorDk: COBALT_DK,
    handle: 'wheel', handleCol: STEEL_LT, dialRing: STEEL, dialFace: STEEL_LT,
    after: (c2, b, tt, s2) => {
      if (s2.p > 0) return;
      // Notes poking out of the seams: top edge, the free edge, the bottom.
      const flap = Math.sin((f / 8) * TAU);
      const seams = [[b.dx + 3, b.dy - 0.2, -1.4], [b.dx + b.dw - 4.5, b.dy - 0.2, -1.2], [b.dx - 0.2, b.dy + 6, 0], [b.dx - 0.2, b.dy + b.dh - 6, 0]];
      seams.forEach(([x, y, a], i) => {
        c2.save();
        c2.translate(x, y);
        c2.rotate(a === 0 ? Math.PI + 0.25 * flap * (i % 2 ? 1 : -1) : -0.2 + 0.25 * flap * (i % 2 ? -1 : 1));
        box(c2, 0, -0.8, 3.0, 1.6, CASH, INK, LWF);
        circ(c2, 1.6, 0, 0.4, CASH_DK);
        c2.restore();
      });
    } }, t, st);
}

// G — a wall safe in a marble pillar, the gilt-framed painting swung aside to show it.
function paintG(c, t, st) {
  const f = frameOf(t, 8, 6);
  const g = H - 0.3;
  box(c, 0.8, g - 2.2, W - 1.6, 2.2, MARBLE_DK, INK, LWI);
  body(c, rr(2.0, 1.0, W - 4.0, g - 3.2, 0.3), MARBLE, (p) => {
    box(p, W - 5.2, 0, 4, H, MARBLE_DK);
    line(p, 4.0, 3, 9.0, 12, '#c9bfb3', 0.25);
    line(p, 6.0, 18, 12.0, 27, '#c9bfb3', 0.25);
  });
  box(c, 0.8, 0.2, W - 1.6, 1.6, MARBLE_DK, INK, LWI);
  // The safe set into the pillar.
  const sx = 4.2, sy = 9.0, sw = 12.6, sh = 12.0;
  rbox(c, sx - 0.8, sy - 0.8, sw + 1.6, sh + 1.6, 0.5, CHAR, INK, LWI);
  if (st.p > 0) cavity(c, sx, sy, sw, sh);
  const front = (c2) => {
    body(c2, rr(0, 0, sw, sh, 0.5), STEEL, (q) => box(q, sw - 1.6, 0, 2, sh, STEEL_DK));
    dial(c2, sw * 0.4, sh * 0.48, 3.1, f, st, CHAR, STEEL_LT);
    circ(c2, sw * 0.82, sh * 0.48, 0.9, BRASS, INK, LWF);
    holes(c2, sw, sh, st.hits);
  };
  swingDoor(c, sx + sw, sy, sw, sh, st.p, 'right', front, doorBack(STEEL, STEEL_DK)(sw, sh));
  // The painting on its hinge, swung off to the left, cord hanging.
  c.save();
  c.translate(sx - 0.8, sy - 2.5);
  c.transform(0.42, -0.12, 0, 1, 0, 0);
  rbox(c, -9.5, 0, 9.5, 11, 0.3, BRASS, INK, LWI);
  box(c, -8.2, 1.3, 6.9, 8.4, '#e9a27c', INK, LWF);
  circ(c, -4.8, 4.6, 1.6, '#f7ead0');
  box(c, -8.2, 6.6, 6.9, 3.1, '#5f7a9a');
  c.restore();
  return { mouthX: sx + sw / 2, mouthY: sy + sh * 0.45, lockX: sx + sw * 0.4, lockY: sy + sh * 0.48 };
}

// H — the two-door strongroom cabinet: ivory, chrome, two dials, a brass EGGCORP plate.
function paintH(c, t, st) {
  const f = frameOf(t, 8, 6);
  const g = H - 0.3;
  const bx = 0.8, bw = W - 1.6, top = 1.2, bh = g - 2.6;
  box(c, bx + 0.6, g - 1.6, bw - 1.2, 1.6, INK);
  body(c, rr(bx, top, bw, bh, 0.8), IVORY, (p) => {
    box(p, bx + bw - 2.6, 0, 4, H, IVORY_DK);
    box(p, bx + 0.6, top + 0.8, 0.8, bh - 1.6, '#fbf6ea');
  });
  rbox(c, W / 2 - 4.2, top + 1.2, 8.4, 2.4, 0.3, BRASS, INK, LWF);
  for (let k = 0; k < 5; k++) box(c, W / 2 - 3.2 + k * 1.4, top + 2.1, 0.9, 0.6, BRASS_DK);
  const dy = top + 5.0, dh = bh - 6.8, dw = (bw - 3.6) / 2, lx = bx + 1.4, rx = W / 2 + 0.4;
  if (st.p > 0) cavity(c, lx, dy, bw - 2.8, dh);
  const door = (side) => (c2) => {
    body(c2, rr(0, 0, dw, dh, 0.5), '#f6efdf', (q) => box(q, side === 'L' ? dw - 1 : 0, 0, 1, dh, IVORY_DK));
    dial(c2, dw * 0.5, dh * 0.3, 2.4, f, st, STEEL, STEEL_LT);
    box(c2, side === 'L' ? dw - 1.6 : 0.6, dh * 0.5, 1.0, dh * 0.22, STEEL, INK, LWF);
    holes(c2, dw, dh, side === 'L' ? Math.min(st.hits, 1) : Math.max(0, st.hits - 1));
  };
  const back = doorBack(IVORY_DK, '#b8ab90')(dw, dh);
  swingDoor(c, lx, dy, dw, dh, st.p, 'left', door('L'), back);
  swingDoor(c, rx + dw, dy, dw, dh, st.p, 'right', door('R'), back);
  return { mouthX: W / 2, mouthY: dy + dh * 0.45, lockX: W / 2, lockY: dy + dh * 0.3 };
}

// ============================================================== the line-up
export const OFFICE_SAFE_CANDIDATES = [
  { letter: 'NOW', id: 'now', name: 'the shipped officeSafe', note: 'Today’s 17x14 “jump it or crack it” hazard through the real run painter (hazard rim and all). Shot, it simply goes — no open state.' },
  { letter: 'A', id: 'gunmetal', name: 'gunmetal, grown to 2x', paint: paintA, note: 'NOW’s gunmetal and gold pinstripe at twice the height, brass four-spoke wheel. Classic, but dark on the dusk lacquer.' },
  { letter: 'B', id: 'vault', name: 'round vault door in a frame', paint: paintB, note: 'A bank-vault door standing in its steel plate: bolt studs round the rim, six-spoke wheel. The silhouette nothing else in the game has.' },
  { letter: 'C', id: 'dolly', name: 'safe on a hand truck', paint: paintC, note: 'A teal safe strapped to a red hand truck — wheeled in for the heist. Busiest outline of the set.' },
  { letter: 'D', id: 'bullseye', name: 'red, dial in a bullseye', paint: paintD, note: 'Lacquer red, the dial at the centre of a painted target: says “shoot here” before it says safe.' },
  { letter: 'E', id: 'gold', name: 'gold-plated', paint: paintE, note: 'Gold body, black door, white dial, a glint that wanders: the prize read, and the brightest thing on floor 88.' },
  { letter: 'F', id: 'bursting', name: 'bursting with cash', paint: paintF, note: 'Cobalt, so full that notes stick out of every door seam and flap — the money is visible before the shot.' },
  { letter: 'G', id: 'wallsafe', name: 'wall safe in a marble pillar', paint: paintG, note: 'The film wall safe: a steel door in a marble pillar, the gilt painting swung aside on its hinge.' },
  { letter: 'H', id: 'strongroom', name: 'two-door strongroom cabinet', paint: paintH, note: 'Ivory and chrome double doors, two dials, a brass plate; both doors blow open.' },
];

// ================================================================= the scene
// Three strips of the real floor-88 production frame at in-run size (no enlargement), cropped to
// the lane; the room scrolls, Lorenzo and the safe hold still:
//   1. INTACT, with a real crate (the run's painter) beside it for the 2x height.
//   2. SHOT: a 3.2 s loop — three shots land, the lock flashes, the door blows open, money flies.
//   3. FROZEN: the same burst 0.3 s and 1.4 s after the crack, side by side.
export const OFFICE_SAFE_CROP = Object.freeze({ top: 118, h: 130, gap: 2 });
export const OFFICE_SAFE_LANE_H = 3 * OFFICE_SAFE_CROP.h + 2 * OFFICE_SAFE_CROP.gap;
const SAFE_X = 122;      // box left, world units from the frame's left; the hero runs at PLAYER_X 59
const LOOP = 3.2;
const SHOTS = [0.35, 0.75, 1.15]; // when each bullet lands; the third cracks it
const BULLET_V = 320;

function state(s) {
  // s = seconds into the loop.
  const hits = SHOTS.filter((h) => s >= h).length;
  const since = s >= SHOTS[2] ? s - SHOTS[2] : -1;
  let p = 0;
  if (since >= 0) {
    const e = clamp01(since / 0.3);
    const c1 = 1.9, c3 = c1 + 1;
    p = 1 + c3 * Math.pow(e - 1, 3) + c1 * Math.pow(e - 1, 2); // ease-out-back: a slam open
  }
  return { hits, since, p };
}

let nowEntity = null, crateEntity = null;
function drawSafeAt(ctx, cand, boxX, t, st) {
  const envX = boxX - (W - SAFE_BOX[0]) / 2, envY = GROUND_Y - H;
  if (cand.id === 'now') {
    if (st.since >= 0) return null;
    if (!nowEntity) nowEntity = makeObstacle('officeSafe', 0);
    nowEntity.x = boxX;
    drawWorldEntity(ctx, nowEntity, 0, t, null, {});
    return { lockX: boxX + 6, lockY: GROUND_Y - 12, mouthX: boxX + 8, mouthY: GROUND_Y - 10, envX: 0, envY: 0 };
  }
  drawSoftContactShadow(ctx, boxX + SAFE_BOX[0] / 2, GROUND_Y - 1, SAFE_BOX[0] * 0.75, 2.4, { alpha: 0.34 });
  ctx.save();
  ctx.translate(envX, envY);
  const r = cand.paint(ctx, t, st);
  if (st.since >= 0) crackFlash(ctx, r.lockX, r.lockY, st.since);
  ctx.restore();
  if (st.since >= 0) moneyBurst(ctx, envX + r.mouthX, envY + r.mouthY, st.since, t);
  return r;
}

function bullet(ctx, s, boxX) {
  const gunX = PLAYER_X + 9, gunY = GROUND_Y - 13;
  for (const h of SHOTS) {
    const fly = (boxX + 2 - gunX) / BULLET_V;
    const d = s - (h - fly);
    if (d < 0 || d >= fly) continue;
    const x = gunX + d * BULLET_V;
    line(ctx, x - 4, gunY, x, gunY, LEMON, 1.2);
    line(ctx, x - 2.5, gunY, x, gunY, PAPER, 0.5);
  }
  for (const h of SHOTS.slice(0, 2)) {
    const d = s - h;
    if (d >= 0 && d < 0.1) glint(ctx, boxX + 3, gunY, 2.4 * (1 - d / 0.1), LEMON_LT);
  }
}

function strip(ctx, t, i, label, camX, world) {
  const { top, h, gap } = OFFICE_SAFE_CROP;
  const y0 = i * (h + gap);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, 480, h);
  ctx.clip();
  ctx.translate(0, y0 - top);
  drawOfficeProductionScene(ctx, t, { floor: 'exec', hazards: [], world }, false, camX + ((t * 110) % 4000));
  ctx.restore();
  ctx.save();
  ctx.font = '600 7px ui-monospace, Menlo, monospace';
  ctx.fillStyle = 'rgba(16,14,22,0.72)';
  ctx.fillRect(4, y0 + 4, ctx.measureText(label).width + 6, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, 7, y0 + 11.5);
  ctx.restore();
}

export function drawOfficeSafeLane(ctx, t, cand) {
  const now = cand.id === 'now';
  strip(ctx, t, 0, now ? '8-3 FLOOR 88 · AS SHIPPED, crate for scale' : '8-3 FLOOR 88 · INTACT, a crate beside it for the 2x height', 1600, (c, tt) => {
    drawSafeAt(c, cand, SAFE_X, tt, { hits: 0, since: -1, p: 0 });
    if (!crateEntity) crateEntity = makeObstacle('crate', 0);
    crateEntity.x = SAFE_X + 40;
    drawWorldEntity(c, crateEntity, 0, tt, null, {});
  });
  strip(ctx, t, 1, now ? 'SHOT — today it just goes' : 'SHOT x3 → CRACKED (3.2 s loop)', 2600, (c, tt) => {
    const s = ((tt % LOOP) + LOOP) % LOOP;
    drawSafeAt(c, cand, SAFE_X, tt, state(s));
    bullet(c, s, SAFE_X);
  });
  strip(ctx, t, 2, 'FROZEN: 0.3 s and 1.4 s after the crack — the coins + notes are pickups', 3600, (c, tt) => {
    [0.3, 1.4].forEach((d, k) => drawSafeAt(c, cand, 104 + k * 86, tt, state(SHOTS[2] + d)));
  });
}
