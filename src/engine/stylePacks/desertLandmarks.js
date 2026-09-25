// SPEED ZONE's desert landmarks — the art of six painters that won the 24 Sep 2026
// bake-off (src/dev/speed-ideas.js), ported pixel for pixel with their PLACEMENT taken
// out. The pack decides where and when each one appears; this module only knows how to
// draw one at a given screen x, seated on the ranges it is handed:
//
//   seat = { far(x), mid(x), near(x) } — each range's crest y in screen px, in the
//   CURRENT ctx coordinates (the caller derives them from the pack's real layer bases
//   and offsets, so they hold in portrait too).
//
// Every call is one sealed save/restore, deterministic in its time argument, culls
// nothing and never rounds an animated position. The painters clip themselves to the
// sky side of every nearer crest (and seat their feet into their own crest), which is
// how a thing drawn after the whole backdrop still reads as standing BEHIND the dunes.
//
// Nothing here imports stylePacks/index.js: that module imports this one.
import { GROUND_Y } from '../camera.js';
import { plain, rr, drawProp } from '../../sprites/props.js';
import { drawTextVectorCentered, textYForMid } from '../sprites.js';
import { drawToon } from '../../sprites/toons.js';

const TAU = Math.PI * 2;
const SKY_TOP = '#f08048';
const SKY_LOW = '#f8c060';
const ROCK = '#a97558';
const NEAR_ROCK = '#b8845e';
const NEAR_ROCK_LIT = '#d9aa76';
const NEAR_ROCK_DARK = '#654e4a';

// ------------------------------------------------------------------ maths & colour
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, v) => { const k = clamp01((v - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
const fract = (v) => v - Math.floor(v);
const hash = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);
function rgbOf(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a, b, k) {
  const A = rgbOf(a), B = rgbOf(b);
  return toHex([lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)]);
}
function rgba(hex, a) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
// The sky's own colour at height y (skyGrad runs 0..GROUND_Y): far colours haze toward it.
const skyAt = (y) => mix(SKY_TOP, SKY_LOW, clamp01(y / GROUND_Y));
function haze(pal, y, k) {
  const sky = skyAt(y);
  const out = {};
  for (const [key, value] of Object.entries(pal)) out[key] = mix(value, sky, k);
  return out;
}

// ------------------------------------------------------------------ drawing kit
const fillPath = plain;
function strokePath(ctx, color, width, path, cap = 'round') {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.stroke();
}
const circle = (x, y, r) => (c) => c.arc(x, y, Math.max(0.01, r), 0, TAU);
const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
const box = (x, y, w, h, r = 0) => (c) => (r > 0 ? rr(c, x, y, w, h, r) : c.rect(x, y, w, h));
function poly(pts) {
  return (c) => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
}
function glow(ctx, x, y, r, hex, a) {
  if (a <= 0.003 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.45, rgba(hex, a * 0.42));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function dustPuff(ctx, x, y, r, a, pal) {
  if (a <= 0.01 || r <= 0.05) return;
  fillPath(ctx, rgba(pal.shadow, a * 0.9), circle(x - r * 0.18, y + r * 0.16, r));
  fillPath(ctx, rgba(pal.base, a), circle(x, y, r * 0.92));
  fillPath(ctx, rgba(pal.lit, a * 0.95), circle(x + r * 0.26, y - r * 0.28, r * 0.58));
}
const DUST = { base: '#dcae7c', lit: '#f5d6a4', shadow: '#b78c68' };
// Clip to the sky side of the lowest of `crests` across x0..x1: what is visible of a
// thing standing behind them. A thing standing ON a range passes that crest with its
// bury depth added, so its feet are cut along the crest itself.
function clipSky(ctx, x0, x1, crests) {
  ctx.beginPath();
  ctx.moveTo(x0, -60);
  ctx.lineTo(x1, -60);
  for (let x = x1; x >= x0 - 2; x -= 2) {
    let y = Infinity;
    for (const f of crests) y = Math.min(y, f(x));
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.clip();
}
// A levelled lot cut into a summit: drawn deep, so the clip along the crest ends it and
// the fill shows only where the hill falls away below the pad.
const GRAVEL = { gravel: '#b7906c', gravelLit: '#dcb88c', gravelDark: '#94705a' };
function gravelPad(ctx, pal, halfW) {
  fillPath(ctx, pal.gravel, poly([-halfW, 0, halfW, 0, halfW + 22, 30, -halfW - 22, 30]));
  fillPath(ctx, pal.gravelDark, poly([-halfW, 0, -halfW + 5, 0, -halfW - 12, 30, -halfW - 22, 30]));
  fillPath(ctx, pal.gravelLit, box(-halfW, -0.3, halfW * 2, 0.9));
  for (let i = 0; i < 26; i++) {
    const gx = -halfW - 10 + hash(i + 11) * (halfW * 2 + 20), gy = 1.2 + hash(i + 57) * 12;
    fillPath(ctx, i % 3 ? pal.gravelDark : pal.gravelLit, box(gx, gy, 1.2, 0.6));
  }
}

// ================================================================== pumpjacks
// Two-circle intersection: where the walking beam's tail must be for a pitman arm of
// length `len` hanging from crank pin (kx, ky). Screen coordinates, tail to the right.
function beamTail(px, py, rTail, kx, ky, len) {
  const dx = kx - px, dy = ky - py;
  const d = Math.hypot(dx, dy);
  const a = (rTail * rTail - len * len + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, rTail * rTail - a * a));
  const bx = px + (a * dx) / d, by = py + (a * dy) / d;
  // The two solutions sit either side of the pivot-to-pin line; the tail is the one
  // ABOVE the pin (the pitman arm hangs from it).
  const s1x = bx - (h * dy) / d, s1y = by + (h * dx) / d;
  const s2x = bx + (h * dy) / d, s2y = by - (h * dx) / d;
  return s1y < s2y ? [s1x, s1y] : [s2x, s2y];
}

// One pumpjack, base centre at the origin, drawn facing left (well on the left). The
// linkage is solved rather than faked: the crank turns, the pitman arm keeps its length,
// the beam rocks to suit, and the bridle hangs from the horse head's arc so the polished
// rod goes straight up and down — which is the whole point of that curved head.
function pumpjack(ctx, crankAngle, pal) {
  const P = [1, -27];             // walking-beam pivot, top of the samson post
  const R_HEAD = 18;              // horse-head arc radius, centred on the pivot
  const R_TAIL = 15;
  const C = [15.5, -9.5];         // crank shaft
  const R_CRANK = 5.4;
  const LEN = Math.hypot(P[0] + R_TAIL - C[0], P[1] - C[1]);
  const K = [C[0] + Math.cos(crankAngle) * R_CRANK, C[1] + Math.sin(crankAngle) * R_CRANK];
  const T = beamTail(P[0], P[1], R_TAIL, K[0], K[1], LEN);
  const phi = Math.atan2(T[1] - P[1], T[0] - P[0]);   // >0: tail down, head up
  const wellX = P[0] - R_HEAD;
  const carrierY = -12 - R_HEAD * phi;

  // The steel skid, lit along its top.
  fillPath(ctx, pal.dark, box(-22, -4.6, 48, 2.6));
  fillPath(ctx, pal.lit, box(-22, -4.6, 48, 0.8));

  // Wellhead: casing, a tee with its two valve wheels, the stuffing box.
  fillPath(ctx, pal.dark, box(wellX - 1.6, -8.5, 3.2, 5));
  fillPath(ctx, pal.body, box(wellX - 4.2, -7.4, 8.4, 1.9));
  for (const s of [-1, 1]) fillPath(ctx, pal.accent, circle(wellX + s * 4.4, -6.45, 1.15));
  fillPath(ctx, pal.body, box(wellX - 1.1, -11.3, 2.2, 3));
  // Polished rod, carrier bar and the twin bridle wires up to the arc's tangent point.
  strokePath(ctx, pal.lit, 0.55, (c) => { c.moveTo(wellX, -11); c.lineTo(wellX, carrierY); });
  fillPath(ctx, pal.dark, box(wellX - 2.2, carrierY - 0.6, 4.4, 1.3));
  strokePath(ctx, pal.wire, 0.42, (c) => {
    c.moveTo(wellX - 1.2, carrierY); c.lineTo(wellX - 1.2, P[1]);
    c.moveTo(wellX + 1.2, carrierY); c.lineTo(wellX + 1.2, P[1]);
  });

  // Prime mover and the belt to the gearbox.
  fillPath(ctx, pal.body, box(20.5, -9.5, 7, 5, 1));
  fillPath(ctx, pal.lit, box(20.5, -9.5, 7, 1.1));
  strokePath(ctx, pal.dark, 0.7, (c) => { c.moveTo(21.5, -8.6); c.lineTo(C[0] + 1, C[1] - 1.8); c.moveTo(21.5, -5.6); c.lineTo(C[0] + 1, C[1] + 1.8); });

  // Samson post: an A-frame, far leg darker, with its cross brace.
  fillPath(ctx, pal.shadow, poly([7.5, -4.6, 9.8, -4.6, P[0] + 1.3, P[1] + 1, P[0] - 0.2, P[1] + 1]));
  fillPath(ctx, pal.body, poly([-7.6, -4.6, -5, -4.6, P[0] + 0.6, P[1] + 1, P[0] - 1.3, P[1] + 1]));
  fillPath(ctx, pal.lit, poly([-5.6, -4.6, -5, -4.6, P[0] + 0.6, P[1] + 1, P[0] + 0.05, P[1] + 1]));
  strokePath(ctx, pal.body, 1.1, (c) => { c.moveTo(-4.2, -15); c.lineTo(6.2, -15); c.moveTo(-2.4, -21); c.lineTo(4.2, -21); }, 'butt');

  // Gearbox around the crank shaft.
  fillPath(ctx, pal.body, box(C[0] - 5.2, C[1] - 3.6, 10.4, 8.6, 1.4));
  fillPath(ctx, pal.lit, box(C[0] - 5.2, C[1] - 3.6, 10.4, 1.2, 0.6));
  fillPath(ctx, pal.shadow, box(C[0] - 5.2, C[1] + 3.2, 10.4, 1.8, 0.6));

  // Crank arm and its counterweight: a heavy wedge swinging round the shaft. The lit
  // face is whichever edge is currently on top, so the block reads as turning, not as
  // a flat sticker rotating.
  ctx.save();
  ctx.translate(C[0], C[1]);
  ctx.rotate(crankAngle + Math.PI);
  fillPath(ctx, pal.weight, (c) => {
    c.moveTo(2.4, -3.2); c.lineTo(8.8, -4.9); c.arc(0, 0, 9.4, -0.52, 0.52); c.lineTo(2.4, 3.2); c.closePath();
  });
  fillPath(ctx, pal.weightDark, (c) => { c.moveTo(2.4, 1.4); c.lineTo(9.1, 2.3); c.arc(0, 0, 9.4, 0.25, 0.52); c.lineTo(2.4, 3.2); c.closePath(); });
  ctx.restore();
  // Which edge of the wedge faces the sun: a thin highlight along the upper rim.
  const up = crankAngle + Math.PI;
  const rimA = Math.sin(up) < 0 ? up - 0.5 : up + 0.5;
  strokePath(ctx, pal.weightLit, 0.8, (c) => { c.arc(C[0], C[1], 8.9, rimA - 0.32, rimA + 0.32); }, 'butt');
  strokePath(ctx, pal.dark, 1.5, (c) => { c.moveTo(C[0], C[1]); c.lineTo(K[0], K[1]); });
  fillPath(ctx, pal.lit, circle(C[0], C[1], 1.15));

  // Pitman arm, crank pin up to the equalizer.
  strokePath(ctx, pal.shadow, 1.25, (c) => { c.moveTo(K[0], K[1]); c.lineTo(T[0], T[1]); });
  fillPath(ctx, pal.dark, circle(K[0], K[1], 0.9));

  // Walking beam + horse head, rotated together about the pivot.
  ctx.save();
  ctx.translate(P[0], P[1]);
  ctx.rotate(phi);
  fillPath(ctx, pal.body, box(-R_HEAD + 3.5, -1.7, R_HEAD + R_TAIL - 2.5, 3.4, 0.6));
  fillPath(ctx, pal.lit, box(-R_HEAD + 3.5, -1.7, R_HEAD + R_TAIL - 2.5, 0.9));
  fillPath(ctx, pal.shadow, box(-R_HEAD + 3.5, 0.9, R_HEAD + R_TAIL - 2.5, 0.8));
  // Equalizer yoke at the tail.
  fillPath(ctx, pal.dark, box(R_TAIL - 1.8, -2.6, 3.4, 5.2, 0.8));
  // The horse head: a thick curved plate whose face IS the arc the bridle rides.
  const span = 0.42;
  fillPath(ctx, pal.head, (c) => {
    c.arc(0, 0, R_HEAD + 0.4, Math.PI - span, Math.PI + span);
    c.lineTo(Math.cos(Math.PI + span * 0.8) * (R_HEAD - 6), Math.sin(Math.PI + span * 0.8) * (R_HEAD - 6));
    c.lineTo(-R_HEAD + 5.5, 0);
    c.lineTo(Math.cos(Math.PI - span * 0.8) * (R_HEAD - 6), Math.sin(Math.PI - span * 0.8) * (R_HEAD - 6));
    c.closePath();
  });
  fillPath(ctx, pal.headLit, (c) => {
    c.arc(0, 0, R_HEAD + 0.4, Math.PI - span * 0.2, Math.PI + span);
    c.arc(0, 0, R_HEAD - 1.2, Math.PI + span * 0.96, Math.PI - span * 0.2, true);
    c.closePath();
  });
  fillPath(ctx, pal.headDark, (c) => {
    c.arc(0, 0, R_HEAD - 3.6, Math.PI - span * 0.7, Math.PI + span * 0.7);
    c.arc(0, 0, R_HEAD - 5.2, Math.PI + span * 0.6, Math.PI - span * 0.6, true);
    c.closePath();
  });
  ctx.restore();
  // Saddle bearing on top of the post.
  fillPath(ctx, pal.dark, box(P[0] - 2.4, P[1] - 1.4, 4.8, 3.2, 0.8));
  fillPath(ctx, pal.lit, circle(P[0] + 0.4, P[1] - 0.2, 0.8));
}

const PUMP_PAL = {
  body: '#56625f', lit: '#b3b39c', shadow: '#3c4645', dark: '#2e3637',
  wire: '#2e3637', accent: '#a0463a',
  head: '#c29b48', headLit: '#ecc978', headDark: '#8e6c35',
  weight: '#8e4f40', weightDark: '#5f352d', weightLit: '#d58a64',
  berm: '#c2a27a', bermLit: '#e2c79c', bermDark: '#9c7f5f', pad: '#8f8374', padLit: '#c9bfae',
};

// The graded pad a rig stands on: a level cut with its fill spilling down both sides.
// Drawn deep, so the clip along the crest is what ends it — it shows only where the
// hill falls away below the pad, which is exactly where a berm would be.
function pumpPad(ctx, pal) {
  fillPath(ctx, pal.berm, poly([-31, 0, 34, 0, 50, 24, -47, 24]));
  fillPath(ctx, pal.bermDark, poly([-31, 0, -26, 0, -40, 24, -47, 24]));
  fillPath(ctx, pal.bermLit, box(-30, -0.2, 63, 0.9));
  for (let i = 0; i < 14; i++) {
    const gx = -38 + hash(i + 3) * 82, gy = 1.5 + hash(i + 41) * 9;
    fillPath(ctx, i % 2 ? pal.bermDark : pal.bermLit, box(gx, gy, 1.1, 0.6));
  }
  // Concrete footing under the skid.
  fillPath(ctx, pal.pad, box(-24, -2.3, 50, 2.3));
  fillPath(ctx, pal.padLit, box(-24, -2.3, 50, 0.7));
}

// Two rigs a little over half a middle-dune period apart (DESERT_DUNES[0] and [2]
// are 0.64 of a period apart), so both can stand on summits when the group is centred
// between them. They pump out of step.
const PUMP_HALF_GAP = 0.32 * Math.round(Math.PI * 200);
/**
 * Two full-size pumpjacks on graded pads, seated on the MIDDLE range.
 * x: the group's centre in screen px; the rigs stand at x ± PUMP_HALF_GAP (~201 px).
 * Ink reaches about ±70 px around each rig (pad berms included) and ~45 px above
 * its crest; it is clipped behind the near dunes.
 */
export function drawDesertPumpjacks(ctx, t, x, seat) {
  ctx.save();
  const S = 1.3;
  for (const [dx, rate, ph] of [[-PUMP_HALF_GAP, 2.25, 0.6], [PUMP_HALF_GAP, 1.85, 3.7]]) {
    const xr = x + dx;
    const base = seat.mid(xr) - 0.4;
    const pal = haze(PUMP_PAL, base - 25, 0.16);
    ctx.save();
    clipSky(ctx, xr - 70, xr + 70, [(xx) => seat.mid(xx) + 1.4, seat.near]);
    ctx.translate(xr, base);
    ctx.scale(S, S);
    pumpPad(ctx, pal);
    pumpjack(ctx, -t * rate + ph, pal);
    ctx.restore();
  }
  ctx.restore();
}

// ================================================================== speed trap
const TRAP = {
  post: '#4d4540', postLit: '#8f7f70', board: '#f0e2bf', boardEdge: '#b53a2c', frame: '#3a3431',
  lamp: '#2e2b2a', ink: '#3a2a26', red: '#c8402e',
  carBlack: '#23242a', carWhite: '#eceef0', carLit: '#ffffff', chrome: '#c9ced2', tyre: '#1b1a1c',
  glass: '#7fb7d6', glassLit: '#d8f0ff', skin: '#e0a47a', hat: '#1f2a44', badge: '#f0c24a',
  gun: '#2a2d33',
};
/**
 * The speed trap as first shipped — the villain's boast on the billboard ("I INVENTED
 * SPEED."), the patrol car hiding behind it and the YOUR SPEED sign — kept drawable for
 * the sign-gag bake-off. Same anchor and extents as drawDesertSpeedTrap.
 */
export function drawDesertSpeedTrapBoast(ctx, t, x, seat) {
  ctx.save();
  const pal = haze(TRAP, 165, 0.05);
  const x0 = x;
  const y0 = seat.near(x0) - 0.3;
  clipSky(ctx, x0 - 120, x0 + 120, [(xx) => seat.near(xx) + 1.2]);
  ctx.translate(x0, y0);
  gravelPad(ctx, haze(GRAVEL, 170, 0.05), 52);
  // ---- the cruiser, parked behind the board, nose poking out to the right
  const CAR_X = 21, CAR_S = 1.28;
  ctx.save();
  ctx.translate(CAR_X, 0);
  ctx.scale(CAR_S, CAR_S);
  fillPath(ctx, pal.carBlack, (c) => {
    c.moveTo(-10, -2.2); c.lineTo(-10, -6.2); c.lineTo(3.2, -6.6);
    c.lineTo(6.2, -10.4); c.lineTo(11.6, -10.4); c.lineTo(14.6, -6.8);
    c.lineTo(21.6, -6.2); c.quadraticCurveTo(23.2, -5.6, 23, -2.6); c.lineTo(-10, -2.2); c.closePath();
  });
  fillPath(ctx, pal.carWhite, poly([4.4, -6.5, 14.2, -6.7, 14, -2.6, 4.4, -2.5]));      // white door
  fillPath(ctx, pal.carLit, box(14.8, -6.8, 6.8, 0.6));                                  // hood highlight
  fillPath(ctx, pal.glass, poly([6.8, -9.8, 11.2, -9.8, 13.6, -6.9, 6.8, -6.9]));
  fillPath(ctx, pal.glassLit, poly([11.2, -9.8, 13.6, -6.9, 12.4, -6.9, 10.4, -9.8]));
  fillPath(ctx, pal.badge, (c) => { c.arc(9.4, -4.6, 1.05, 0, TAU); });
  fillPath(ctx, pal.chrome, box(21.4, -4.4, 1.8, 1.8, 0.4));                             // headlight
  strokePath(ctx, pal.chrome, 0.5, (c) => { c.moveTo(23.4, -5.2); c.lineTo(24.4, -5.2); c.lineTo(24.4, -2.2); c.lineTo(22.8, -2.2); });  // push bar
  for (const wx of [-4, 17.4]) {
    fillPath(ctx, pal.tyre, circle(wx, -2.2, 2.3));
    fillPath(ctx, pal.chrome, circle(wx, -2.2, 0.95));
  }
  // The officer: hat brim, shades, and an arm out of the window with the radar gun.
  fillPath(ctx, pal.skin, circle(8.9, -8.2, 1.25));
  fillPath(ctx, pal.hat, box(7.3, -10.1, 3.4, 1.2, 0.4));
  fillPath(ctx, pal.hat, box(8.3, -9.1, 2.8, 0.45));
  fillPath(ctx, '#101114', box(8.6, -8.7, 1.7, 0.6, 0.2));
  strokePath(ctx, pal.skin, 0.8, (c) => { c.moveTo(10, -7); c.lineTo(12.6, -8.6); });
  fillPath(ctx, pal.gun, poly([12, -9.8, 15.6, -9.2, 15.6, -7.8, 12.4, -8.2]));
  fillPath(ctx, pal.gun, box(12.6, -8.3, 1.1, 2));
  const reading = fract(t * 1.1) < 0.5;
  fillPath(ctx, reading ? '#ff4040' : '#5a1a1a', box(12.5, -9.6, 1.4, 0.8));
  // Light bar on the roof, mostly hidden behind the board's edge.
  const beat = Math.floor(t * 7);
  const redOn = beat % 4 === 0 || beat % 4 === 1;
  fillPath(ctx, redOn ? '#ff3b3b' : '#6a1f1f', box(6.4, -11.8, 2.4, 1.3, 0.4));
  fillPath(ctx, !redOn ? '#3b7bff' : '#1f2e6a', box(9.0, -11.8, 2.4, 1.3, 0.4));
  ctx.restore();
  // ---- the billboard
  const bx0 = -44, bx1 = 33, by0 = -37, by1 = -6;
  for (const px of [-36, -5, 25]) {
    fillPath(ctx, pal.post, box(px - 1.2, by1 - 1, 2.4, -by1 + 2));
    fillPath(ctx, pal.postLit, box(px + 0.4, by1 - 1, 0.6, -by1 + 2));
  }
  fillPath(ctx, pal.frame, box(bx0 - 1.2, by0 - 1.2, bx1 - bx0 + 2.4, by1 - by0 + 2.4, 0.8));
  fillPath(ctx, pal.board, box(bx0, by0, bx1 - bx0, by1 - by0));
  strokePath(ctx, pal.boardEdge, 0.9, box(bx0 + 1, by0 + 1, bx1 - bx0 - 2, by1 - by0 - 2));
  // The villain himself, and his boast.
  ctx.save();
  ctx.beginPath(); ctx.rect(bx0 + 1.5, by0 + 1.5, bx1 - bx0 - 3, by1 - by0 - 3); ctx.clip();
  drawProp(ctx, 'eggshell', bx0 + 1.8, by0 + 4.6, 28.8, 24);
  ctx.restore();
  drawTextVectorCentered(ctx, 'I INVENTED', 9.5, textYForMid(by0 + 7, 0.66, 'bold'), pal.ink, 0.66, 'bold');
  drawTextVectorCentered(ctx, 'SPEED.', 9.5, textYForMid(by0 + 16, 1.24, 'bold'), pal.red, 1.24, 'bold');
  drawTextVectorCentered(ctx, 'IN 1987. NO ONE THANKED ME.', 9.5, textYForMid(by0 + 25.2, 0.34, 'bold'), pal.ink, 0.34, 'bold');
  // Floodlights on arms over the top edge, pooling warm light down the face.
  for (const lx of [-32, -6, 20]) {
    strokePath(ctx, pal.lamp, 0.6, (c) => { c.moveTo(lx, by0 - 1.2); c.lineTo(lx, by0 - 4); c.lineTo(lx + 3, by0 - 4.6); });
    fillPath(ctx, pal.lamp, poly([lx + 2, by0 - 5.6, lx + 5, by0 - 4.8, lx + 4.4, by0 - 3.2, lx + 1.6, by0 - 3.8]));
    fillPath(ctx, '#fff4c8', box(lx + 2.4, by0 - 3.9, 2, 0.6));
    ctx.save();
    ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.clip();
    glow(ctx, lx + 3.4, by0 + 1, 12, '#ffe7b0', 0.3);
    ctx.restore();
  }
  // The light bar's wash over the board edge and the dusk around it.
  const redNow = Math.floor(t * 7) % 4 < 2;
  const lit = redNow ? '#ff3b3b' : '#3b7bff';
  const barX = CAR_X + (redNow ? 7.6 : 10.2) * CAR_S, barY = -11.2 * CAR_S;
  glow(ctx, barX, barY, 20, lit, 0.5);
  ctx.save();
  ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.clip();
  glow(ctx, bx1 + 2, barY - 2, 30, lit, 0.35);
  ctx.restore();
  // ---- YOUR SPEED radar sign on its own post, always reading over.
  const sx = -52, sy = -31;
  fillPath(ctx, pal.post, box(sx - 0.8, sy, 1.6, -sy + 2));
  fillPath(ctx, '#f2d23a', box(sx - 7, sy - 12, 14, 12.4, 1));
  fillPath(ctx, '#1d1d22', box(sx - 6, sy - 11, 12, 10.4, 0.6));
  drawTextVectorCentered(ctx, 'YOUR SPEED', sx, textYForMid(sy - 9.6, 0.2, 'bold'), '#f2d23a', 0.2, 'bold');
  const speed = 88 + Math.floor(fract(t * 0.23) * 4) * 11;
  const blinkOn = fract(t * 2.4) < 0.62;
  if (blinkOn) {
    drawTextVectorCentered(ctx, String(speed), sx, textYForMid(sy - 5.2, 0.62, 'bold'), '#ffb02e', 0.62, 'bold');
    glow(ctx, sx, sy - 5.2, 8, '#ffb02e', 0.3);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ SMILE! (ships)
// The speed trap Peter picked from the sign-gag bake-off (24 Sep 2026): the board says
// SMILE! YOU'RE ON SPEED CAMERA; the camera on its pole fires, the face flares white and
// the board becomes a lineup mugshot of whoever just went through — smeared across the
// photo by their own speed — with GOTCHA! and a $1986 fine stamped on. The patrol car
// behind the board lights up the moment the shutter fires. Only lettering that reads at
// game size is kept.
function trapCruiser(ctx, t, pal, lights) {
  fillPath(ctx, pal.carBlack, (c) => {
    c.moveTo(-10, -2.2); c.lineTo(-10, -6.2); c.lineTo(3.2, -6.6);
    c.lineTo(6.2, -10.4); c.lineTo(11.6, -10.4); c.lineTo(14.6, -6.8);
    c.lineTo(21.6, -6.2); c.quadraticCurveTo(23.2, -5.6, 23, -2.6); c.lineTo(-10, -2.2); c.closePath();
  });
  fillPath(ctx, pal.carWhite, poly([4.4, -6.5, 14.2, -6.7, 14, -2.6, 4.4, -2.5]));
  fillPath(ctx, pal.carWhite, poly([-9.6, -6.1, 3.4, -6.5, 3.4, -2.5, -9.6, -2.4]));
  fillPath(ctx, pal.carLit, box(14.8, -6.8, 6.8, 0.6));
  fillPath(ctx, pal.carLit, box(-9.6, -6.4, 12.6, 0.5));
  fillPath(ctx, pal.glass, poly([6.8, -9.8, 11.2, -9.8, 13.6, -6.9, 6.8, -6.9]));
  fillPath(ctx, pal.glassLit, poly([11.2, -9.8, 13.6, -6.9, 12.4, -6.9, 10.4, -9.8]));
  fillPath(ctx, pal.glass, poly([3.6, -6.8, 6.2, -9.8, 6.4, -9.8, 6.4, -6.9]));
  fillPath(ctx, pal.badge, circle(9.4, -4.6, 1.05));
  fillPath(ctx, '#ff5a3c', box(-10, -5.6, 0.8, 1.4, 0.3));
  fillPath(ctx, pal.chrome, box(21.4, -4.4, 1.8, 1.8, 0.4));
  strokePath(ctx, pal.chrome, 0.5, (c) => { c.moveTo(23.4, -5.2); c.lineTo(24.4, -5.2); c.lineTo(24.4, -2.2); c.lineTo(22.8, -2.2); });
  for (const wx of [-4, 17.4]) { fillPath(ctx, pal.tyre, circle(wx, -2.2, 2.3)); fillPath(ctx, pal.chrome, circle(wx, -2.2, 0.95)); }
  fillPath(ctx, pal.skin, circle(8.9, -8.2, 1.25));
  fillPath(ctx, pal.hat, box(7.3, -10.1, 3.4, 1.2, 0.4));
  fillPath(ctx, pal.hat, box(8.3, -9.1, 2.8, 0.45));
  fillPath(ctx, '#101114', box(8.6, -8.7, 1.7, 0.6, 0.2));
  const beat = Math.floor(t * 7);
  const redOn = lights && beat % 4 < 2;
  const blueOn = lights && !redOn;
  fillPath(ctx, pal.carBlack, box(6, -11.2, 5.8, 0.6));
  fillPath(ctx, redOn ? '#ff3b3b' : '#6a1f1f', box(6.4, -11.8, 2.4, 1.3, 0.4));
  fillPath(ctx, blueOn ? '#3b7bff' : '#1f2e6a', box(9.0, -11.8, 2.4, 1.3, 0.4));
}
function trapCamera(ctx, pal, x, top, flash, aim) {
  fillPath(ctx, pal.camDark, box(x - 0.8, top, 1.6, -top + 1));
  fillPath(ctx, pal.camLit, box(x + 0.1, top, 0.4, -top + 1));
  ctx.save();
  ctx.translate(x, top);
  ctx.rotate(aim);
  fillPath(ctx, pal.camDark, box(-1.6, -1.2, 3.2, 2.4, 0.5));
  fillPath(ctx, pal.cam, box(-5.6, -5.2, 10, 5.2, 0.8));
  fillPath(ctx, pal.camLit, box(-5.6, -5.2, 10, 1, 0.5));
  fillPath(ctx, pal.camDark, poly([-6.6, -5.8, 4.6, -5.8, 4.6, -5.2, -5.6, -5.2]));
  fillPath(ctx, '#15171a', circle(-4.2, -2.6, 1.6));
  fillPath(ctx, '#5ab0e0', circle(-4.5, -2.9, 0.6));
  fillPath(ctx, flash > 0.05 ? '#ffffff' : '#c9d6dc', box(0.4, -4.2, 3, 1.4, 0.3));
  if (flash > 0.02) {
    glow(ctx, 1.9, -3.5, 26 * flash + 4, '#ffffff', 0.9 * flash);
    strokePath(ctx, rgba('#ffffff', flash), 0.5, (c) => {
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; c.moveTo(1.9 + Math.cos(a) * 3, -3.5 + Math.sin(a) * 3); c.lineTo(1.9 + Math.cos(a) * (6 + 9 * flash), -3.5 + Math.sin(a) * (6 + 9 * flash)); }
    });
  }
  ctx.restore();
}
// The mugshot inside the speed camera's print: a lineup height chart, the hero caught
// mid-stride — purple cap, moustache, teal shirt, eyes like saucers — with the ghosts
// of where he was a moment ago smeared out behind him and speed streaks through them.
// Bold shapes throughout: the whole print is about 40 px wide at game size.
// EVERY HERO'S MUGSHOT (Peter, 24 Sep: "can the mugshot be created for all heroes?").
// The hero's own figure — rig, costume, colours — caught mid-sprint and framed from the
// waist up, drawn by the same painter the lane uses and baked ONCE per hero into a small
// canvas, so the photo costs a blit a frame. PORTRAIT_H is the figure's full height in
// the photo's units; the frame shows its top half.
const PORTRAIT_W = 34, PORTRAIT_H = 44, PORTRAIT_SS = 6;
const portraitCache = new Map();
function heroPortrait(heroId) {
  if (portraitCache.has(heroId)) return portraitCache.get(heroId);
  let c = null;
  if (typeof document !== 'undefined') {
    try {
      c = document.createElement('canvas');
      c.width = PORTRAIT_W * PORTRAIT_SS; c.height = (PORTRAIT_H * 0.62) * PORTRAIT_SS;
      const g = c.getContext('2d');
      g.scale(PORTRAIT_SS, PORTRAIT_SS);
      // Mid-stride, leaning into it: the run cycle's reach, facing right toward the camera.
      drawToon(g, heroId, {
        kind: 'run', phase: 0.3, time: 0.3, vy: 0, grounded: true, squash: 0, lean: 0.25,
        roll: false, float: false, stomp: false, headless: false, facing: 1,
      }, PORTRAIT_W / 2 - 3, PORTRAIT_H - 2, PORTRAIT_H - 8);
    } catch { c = null; }
  }
  portraitCache.set(heroId, c);
  return c;
}
function drawHeroPortrait(ctx, heroId, cx, cy, h) {
  const art = heroPortrait(heroId);
  if (!art) return false;
  const k = h / (PORTRAIT_H * 0.62);
  const w = PORTRAIT_W * k;
  for (const [dx, a] of [[-7.5, 0.16], [-4, 0.3], [0, 1]]) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(cx + dx, cy);
    ctx.rotate(0.08);
    ctx.drawImage(art, -w / 2, -h * 0.5, w, h);
    ctx.restore();
  }
  // Sweat flying off the back of the head.
  for (const [dx, dy, r] of [[-5.5, -9, 0.8], [-7, -6, 0.6]]) {
    fillPath(ctx, '#7fc4ec', (c) => { c.arc(cx + dx, cy + dy, r, 0, TAU); });
    fillPath(ctx, '#ffffff', circle(cx + dx + 0.2, cy + dy - 0.2, r * 0.35));
  }
  return true;
}

// WHOEVER IS RUNNING (Peter, 24 Sep: "show the relevant hero, not just lorenzo"): Lorenzo
// keeps the hand-drawn startled portrait below; every other hero is their own figure
// (heroPortrait), smeared by the same speed.
function mugshotPhoto(ctx, x, y, w, h, heroId = 'lorenzo') {
  fillPath(ctx, '#d6dde0', box(x, y, w, h));
  fillPath(ctx, '#c3ccd0', box(x, y + h * 0.62, w, h * 0.38));
  for (let k = 0; k < 6; k++) {
    const ly = y + 2.6 + k * 3.6;
    fillPath(ctx, rgba('#6f7c82', k % 2 ? 0.45 : 0.75), box(x, ly, w, k % 2 ? 0.35 : 0.6));
    fillPath(ctx, rgba('#6f7c82', 0.8), box(x, ly - 0.3, 2.2 + (k % 2 ? 0 : 1.2), 1.1));
  }
  const cx = x + w * 0.6, cy = y + h * 0.38;
  // Speed streaks behind him, and the ghosts of him a blink ago.
  strokePath(ctx, rgba('#ffffff', 0.85), 0.7, (c) => {
    for (const [dy, len] of [[-4.5, 9], [-1, 13], [2.5, 10], [6.5, 12], [10, 8]]) { c.moveTo(cx - 6.5, cy + dy); c.lineTo(cx - 6.5 - len, cy + dy); }
  });
  if (heroId === 'lorenzo' || !drawHeroPortrait(ctx, heroId, x + w * 0.52, y + h * 0.5, h * 1.02)) {
    for (const [dx, a] of [[-7.5, 0.16], [-4, 0.3]]) {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(cx + dx, cy);
      ctx.rotate(0.12);
      fillPath(ctx, '#2fa3a8', box(-7.5, 4.6, 14, 12, 4));
      fillPath(ctx, '#f3c49c', circle(0, 0, 5.4));
      fillPath(ctx, '#8a55c8', (c) => { c.ellipse(0, -2.8, 5.9, 3.9, 0, Math.PI, TAU); c.closePath(); });
      ctx.restore();
    }
    heroMugshot(ctx, cx, cy);
  }
  // Flash glare on the print's gloss.
  glow(ctx, x + w * 0.82, y + h * 0.2, 7, '#ffffff', 0.4);
}
function heroMugshot(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.12);                        // leaning into the sprint
  // Shirt and overall straps, the near arm pumping forward.
  fillPath(ctx, '#2fa3a8', box(-7.5, 4.6, 14, 12, 4));
  fillPath(ctx, '#1f7c82', box(-7.5, 4.6, 4.2, 12, 3));
  fillPath(ctx, '#27407e', box(-3.6, 5.2, 2, 11));
  fillPath(ctx, '#27407e', box(2.4, 5.2, 2, 11));
  fillPath(ctx, '#f2c14a', circle(-2.6, 9.4, 0.7));
  fillPath(ctx, '#f2c14a', circle(3.4, 9.4, 0.7));
  strokePath(ctx, '#2fa3a8', 3, (c) => { c.moveTo(4.6, 7.4); c.lineTo(9.6, 4); });
  fillPath(ctx, '#f3c49c', circle(10.4, 3.4, 1.8));
  // Neck, head, ear, hair.
  fillPath(ctx, '#e0ab84', box(-1.6, 3.4, 3.6, 2.4));
  fillPath(ctx, '#f3c49c', circle(0, 0, 5.4));
  fillPath(ctx, '#dca07a', (c) => { c.arc(0, 0, 5.4, 0.55 * Math.PI, 1.45 * Math.PI); c.arc(1.2, 0, 5.2, 1.4 * Math.PI, 0.6 * Math.PI, true); c.closePath(); });
  fillPath(ctx, '#e8b08a', circle(-4.8, 0.8, 1.3));
  fillPath(ctx, '#5a3624', (c) => { c.ellipse(-4.6, -2.2, 2, 1.4, 0.4, 0, TAU); });
  // Cap: purple dome, lit crown, brim out to the front.
  fillPath(ctx, '#8a55c8', (c) => { c.ellipse(0, -2.6, 5.9, 3.9, 0, Math.PI, TAU); c.closePath(); });
  fillPath(ctx, '#b58ae8', (c) => { c.ellipse(0.8, -4.4, 3.4, 1.4, -0.1, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); });
  fillPath(ctx, '#6c3fa8', poly([2.4, -3.1, 9.6, -2.6, 9.4, -1.3, 2.6, -1.6]));
  fillPath(ctx, '#6c3fa8', circle(0, -6.4, 0.7));
  // Startled: brows high, eyes like saucers, pupils shot sideways at the flash.
  strokePath(ctx, '#3a2418', 0.8, (c) => { c.moveTo(-1.8, -2.1); c.quadraticCurveTo(-0.3, -3, 1, -2.1); c.moveTo(2.4, -2.2); c.quadraticCurveTo(3.8, -3.1, 5, -2.3); });
  for (const ex of [-0.4, 3.6]) {
    fillPath(ctx, '#ffffff', oval(ex, 0, 1.5, 1.9));
    fillPath(ctx, '#1d1416', circle(ex - 0.6, 0.1, 0.6));
  }
  // Big nose, bushy moustache, mouth an O of surprise.
  fillPath(ctx, '#e4a07e', circle(2.6, 1.9, 1.4));
  fillPath(ctx, '#4a2c1e', (c) => {
    c.moveTo(-1.2, 3.4); c.quadraticCurveTo(0.8, 2.1, 2.6, 3); c.quadraticCurveTo(4.6, 2.1, 6.4, 3.3);
    c.quadraticCurveTo(5.8, 4.8, 4.2, 4.2); c.quadraticCurveTo(2.6, 4.8, 1, 4.2); c.quadraticCurveTo(-0.6, 4.9, -1.2, 3.4); c.closePath();
  });
  fillPath(ctx, '#7a2a24', oval(2.6, 5.2, 0.9, 0.8));
  // Sweat flying off the back of his head.
  for (const [dx, dy, r] of [[-7, -3, 0.8], [-8.2, 0.4, 0.6]]) {
    fillPath(ctx, '#7fc4ec', (c) => { c.arc(dx, dy, r, 0, TAU); });
    fillPath(ctx, '#ffffff', circle(dx + 0.2, dy - 0.2, r * 0.35));
  }
  ctx.restore();
}
const trapText = (ctx, str, x, midY, scale, color) =>
  drawTextVectorCentered(ctx, str, x, textYForMid(midY, scale, 'bold'), color, scale, 'bold');
const CAM = { cam: '#8b949b', camLit: '#d9dfe3', camDark: '#4a5157' };
/**
 * The speed trap that ships: SMILE! YOU'RE ON SPEED CAMERA, the camera flash, the
 * mugshot with GOTCHA! and the $1986 fine, the patrol car behind the board — on a graded
 * lot on a NEAR-dune summit. With `since` (seconds since the camera fired, or null for
 * not yet) it plays ONCE: SMILE! until the flash, then the snapshot held. Without it
 * (the gallery) it loops every 3 s: flash at 0.5 s, mugshot until the cycle ends.
 * x: the lot's centre (put it on a summit). Solid ink spans x-58 .. x+57 and up to ~43 px
 * above the crest (the board's lamps); the berm spills ~26 px further each side, cut by
 * the crest. Glows: the flash reaches ~30 px round the camera head (to x-85, ~66 px up)
 * for a third of a second, the light bar's ~20 px past the car (to x+60).
 */
export function drawDesertSpeedTrap(ctx, t, x, seat, heroId = 'lorenzo', since = undefined) {
  ctx.save();
  const pal = { ...haze(TRAP, 165, 0.05), ...haze(CAM, 165, 0.05) };
  const y0 = seat.near(x) - 0.3;
  clipSky(ctx, x - 130, x + 130, [(xx) => seat.near(xx) + 1.2]);
  ctx.translate(x, y0);
  gravelPad(ctx, haze(GRAVEL, 170, 0.05), 52);
  const P = 3.0;
  // Triggered: 0.5 is the flash, so `since` maps onto the loop's own timeline and is
  // held on its last frame; not yet fired sits in the SMILE! stretch before it.
  const u = since === undefined ? fract(t / P) * P
    : since === null ? 0.25 : Math.min(P - 0.01, 0.5 + since);
  const burst = u > 0.5 && u < 0.85 ? 1 - (u - 0.5) / 0.35 : 0;
  const shot = smooth(0.62, 0.95, u);
  const bx0 = -44, by0 = -37, bx1 = 33, by1 = -6;
  const face = () => { ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.clip(); };
  // The car behind the board: dark until the shutter fires.
  const CAR_X = 21, S = 1.28;
  ctx.save(); ctx.translate(CAR_X, 0); ctx.scale(S, S); trapCruiser(ctx, t, pal, u > 0.5); ctx.restore();
  // The board.
  for (const px of [-36, -5, 25]) {
    fillPath(ctx, pal.post, box(px - 1.2, by1 - 1, 2.4, -by1 + 2));
    fillPath(ctx, pal.postLit, box(px + 0.4, by1 - 1, 0.6, -by1 + 2));
  }
  fillPath(ctx, pal.frame, box(bx0 - 1.2, by0 - 1.2, bx1 - bx0 + 2.4, by1 - by0 + 2.4, 0.8));
  fillPath(ctx, pal.board, box(bx0, by0, bx1 - bx0, by1 - by0));
  strokePath(ctx, pal.boardEdge, 0.9, box(bx0 + 1, by0 + 1, bx1 - bx0 - 2, by1 - by0 - 2));
  ctx.save();
  face();
  // Idle: SMILE! YOU'RE ON SPEED CAMERA.
  if (shot < 0.99) {
    ctx.save();
    ctx.globalAlpha *= 1 - shot;
    trapText(ctx, 'SMILE!', -5.5, by0 + 12.5, 1.55, pal.red);
    trapText(ctx, "YOU'RE ON SPEED CAMERA", -5.5, by0 + 23.5, 0.44, pal.ink);
    ctx.restore();
  }
  // The photo: a print on the board — lineup height chart behind, the hero caught
  // mid-stride and smeared by his own speed, the camera's orange speed stamp.
  if (shot > 0.01) {
    ctx.save();
    ctx.globalAlpha *= shot;
    const px0 = bx0 + 2.2, py0 = by0 + 2.2, pw = 30, ph = 26.6;
    ctx.save();
    ctx.translate(px0 + pw / 2, py0 + ph / 2);
    ctx.rotate(-0.035);
    ctx.translate(-pw / 2, -ph / 2);
    fillPath(ctx, rgba('#2a1e18', 0.35), box(0.7, 0.9, pw, ph, 0.5));        // print's shadow
    fillPath(ctx, '#fbfaf3', box(0, 0, pw, ph, 0.5));                           // paper border
    const ix = 1.6, iy = 1.6, iw = pw - 3.2, ih = ph - 5.4;
    ctx.save();
    ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    mugshotPhoto(ctx, ix, iy, iw, ih, heroId);
    ctx.restore();
    // The camera's own date-stamp style readout, burned into the corner in orange.
    glow(ctx, ix + iw - 6.5, iy + ih - 2.4, 6, '#ff8a1e', 0.35);
    trapText(ctx, '88MPH', ix + iw - 6.4, iy + ih - 2.3, 0.4, '#ff8a1e');
    ctx.restore();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= shot;
    trapText(ctx, 'GOTCHA!', 11, by0 + 8, 0.7, pal.red);
    // The fine, stamped on and slammed in.
    const slam = smooth(1.35, 1.5, u);
    if (slam > 0) {
      ctx.save();
      ctx.translate(11, by0 + 20.5);
      ctx.rotate(-0.16);
      const sc = 1 + (1 - slam) * 0.9;
      ctx.scale(sc, sc);
      ctx.globalAlpha *= slam;
      strokePath(ctx, pal.red, 0.9, box(-12.5, -5.6, 25, 11.2, 1.2));
      trapText(ctx, 'FINE', 0, -2.1, 0.5, pal.red);
      trapText(ctx, '$1986', 0, 2.3, 0.72, pal.red);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
  // Floodlights on arms over the top edge, pooling warm light down the face.
  for (const lx of [-32, -6, 20]) {
    strokePath(ctx, pal.lamp, 0.6, (c) => { c.moveTo(lx, by0 - 1.2); c.lineTo(lx, by0 - 4); c.lineTo(lx + 3, by0 - 4.6); });
    fillPath(ctx, pal.lamp, poly([lx + 2, by0 - 5.6, lx + 5, by0 - 4.8, lx + 4.4, by0 - 3.2, lx + 1.6, by0 - 3.8]));
    fillPath(ctx, '#fff4c8', box(lx + 2.4, by0 - 3.9, 2, 0.6));
    ctx.save(); face(); glow(ctx, lx + 3.4, by0 + 1, 12, '#ffe7b0', 0.3); ctx.restore();
  }
  // The light bar's wash once it is going.
  if (u > 0.5) {
    const redNow = Math.floor(t * 7) % 4 < 2;
    const lit = redNow ? '#ff3b3b' : '#3b7bff';
    const barY = -11.2 * S;
    glow(ctx, CAR_X + (redNow ? 7.6 : 10.2) * S, barY, 20, lit, 0.5);
    ctx.save(); face(); glow(ctx, bx1 + 2, barY - 2, 30, lit, 0.35); ctx.restore();
  }
  // The flash washes the face white for an instant.
  if (burst > 0) { ctx.save(); face(); ctx.fillStyle = rgba('#ffffff', 0.55 * burst); ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0); ctx.restore(); }
  trapCamera(ctx, pal, -52, -30, burst, 0.12);
  ctx.restore();
}

// ================================================================== the jet
// A fighter crosses fast; as it goes supersonic a vapour cone blooms round its wings, a
// shock ring rolls out from the spot, and the contrail it drags spreads and wanders as
// it ages. Everything is a function of the pass's progress.
const JET = { body: '#465262', lit: '#9eabb8', under: '#2e3642', stripe: '#d0452f', glass: '#ffcf6e' };
function drawJet(ctx, burn, pal) {
  // Facing right, nose at +13.
  // Far wing, tail fin and stabiliser.
  fillPath(ctx, pal.under, poly([-2, -0.6, -8.5, -4.2, -6.6, -4.2, 1.8, -0.8]));
  fillPath(ctx, pal.body, poly([-11.8, -1.2, -13.6, -7.6, -11.2, -7.6, -6.6, -1.4]));
  fillPath(ctx, pal.lit, poly([-13.6, -7.6, -11.2, -7.6, -11.0, -6.9, -13.3, -6.9]));
  // Fuselage: long needle nose, lit spine, dark belly.
  fillPath(ctx, pal.body, (c) => {
    c.moveTo(13.4, 0.2); c.quadraticCurveTo(8, -2.4, 2, -2.1); c.lineTo(-12.6, -1.6);
    c.lineTo(-13.4, 0.2); c.lineTo(-12.6, 1.5); c.lineTo(2, 1.7); c.quadraticCurveTo(8, 1.6, 13.4, 0.2); c.closePath();
  });
  fillPath(ctx, pal.lit, (c) => { c.moveTo(13, 0); c.quadraticCurveTo(8, -2.3, 2, -2.1); c.lineTo(-12.4, -1.6); c.lineTo(-12.2, -0.9); c.lineTo(2, -1.2); c.quadraticCurveTo(8, -1.3, 13, 0); c.closePath(); });
  fillPath(ctx, pal.under, poly([-12.6, 1.5, 2, 1.7, 8, 1.4, 2, 0.9, -12.6, 0.8]));
  // Canopy catching the sunset.
  fillPath(ctx, pal.glass, (c) => { c.moveTo(7.6, -1.6); c.quadraticCurveTo(5.4, -3.9, 2.4, -2.1); c.closePath(); });
  fillPath(ctx, '#fff6dc', poly([6.6, -2.2, 5.4, -3.0, 4.6, -2.3]));
  fillPath(ctx, pal.stripe, box(-4, -0.4, 5, 0.6));
  // Near wing: a swept delta.
  fillPath(ctx, pal.body, poly([3.4, 0.4, -7.4, 5.4, -9.4, 5.4, -6.4, 0.9]));
  fillPath(ctx, pal.lit, poly([3.4, 0.4, -7.4, 5.4, -8.2, 5.4, -1.6, 1.4]));
  // Afterburner: a white core with shock diamonds trailing into orange.
  fillPath(ctx, '#ff9a3c', (c) => { c.moveTo(-13.2, -1.2); c.lineTo(-13.2 - 7 * burn, 0.1); c.lineTo(-13.2, 1.3); c.closePath(); });
  fillPath(ctx, '#fff2c0', (c) => { c.moveTo(-13.2, -0.7); c.lineTo(-13.2 - 4.4 * burn, 0.1); c.lineTo(-13.2, 0.9); c.closePath(); });
  for (let k = 1; k <= 3; k++) fillPath(ctx, rgba('#fffbe8', 0.9 - k * 0.2), oval(-13.2 - k * 1.8 * burn, 0.1, 0.55, 0.5 - k * 0.08));
}
const JET_SPEED = 132;     // px per unit of pass time
const JET_TRAIL = 3.4;     // how long (pass time) the contrail lingers
const JET_BOOM = 1.0;      // pass time at which it goes supersonic
/**
 * ONE pass of the jet. k in 0..1 is the progress: 0 = entering at x0, the jet reaches
 * x1 at about k = 1 - 3.4 / T (T = (x1 - x0) / 132 + 3.4 pass units), and by k = 1 its
 * contrail and shock ring have faded — nothing is drawn at k >= 1. y is its altitude
 * (it climbs ~30 px over the pass). The ring reaches ~90 px round the boom point, which
 * sits 132 px after x0; the contrail runs back toward x0.
 */
export function drawDesertJet(ctx, k, x0, x1, y) {
  if (!(k >= 0 && k < 1)) return;
  ctx.save();
  const T = (x1 - x0) / JET_SPEED + JET_TRAIL;
  const tau = k * T;
  const jetAt = (tt) => [x0 + JET_SPEED * tt, y - 8 * tt - 2 * Math.sin(tt * 1.3)];
  const TB = JET_BOOM;
  const [bx, by] = jetAt(TB);
  const TRAIL = JET_TRAIL;
  const pts = [];
  for (let back = 0; back <= Math.min(tau, TRAIL); back += 0.04) {
    const [px, py] = jetAt(tau - back);
    const drift = Math.sin((tau - back) * 3.1 + back * 1.3) * back * 1.1;
    pts.push([px - 13, py + 0.1 + drift + back * 1.6, back]);
  }
  for (let i = 1; i < pts.length; i++) {
    const [xa, ya, b0] = pts[i - 1];
    const [xb, yb] = pts[i];
    const fade = (1 - b0 / TRAIL);
    const a = 0.62 * fade * fade * Math.min(1, b0 / 0.05 + 0.2);
    strokePath(ctx, rgba('#fff4e2', a * 0.55), 1.4 + b0 * 3.4, (c) => { c.moveTo(xa, ya); c.lineTo(xb, yb); }, 'butt');
    strokePath(ctx, rgba('#ffffff', a), 0.8 + b0 * 1.2, (c) => { c.moveTo(xa, ya); c.lineTo(xb, yb); }, 'butt');
  }
  const age = tau - TB;
  if (age > 0 && age < 2.6) {
    const rx = 10 + 78 * age ** 0.62;
    const ry = rx * 0.64;
    const a = 0.72 * (1 - age / 2.6) ** 1.6;
    strokePath(ctx, rgba('#fff8ea', a * 0.35), 5.5, oval(bx - 4, by, rx * 0.93, ry * 0.93));
    strokePath(ctx, rgba('#ffffff', a), 1.2, oval(bx - 4, by, rx, ry));
    strokePath(ctx, rgba('#fff2d4', a * 0.6), 0.8, oval(bx - 4, by, rx * 0.8, ry * 0.8));
    if (age < 0.22) glow(ctx, bx - 4, by, 18, '#ffffff', 0.7 * (1 - age / 0.22));
  }
  const [jx, jy] = jetAt(tau);
  if (jx > x0 + 10 && jx < x1) {
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(-0.05);
    ctx.scale(1.3, 1.3);
    const cone = clamp01(1 - Math.abs(tau - TB) / 0.5);
    if (cone > 0) {
      const g = ctx.createLinearGradient(5, 0, -17, 0);
      g.addColorStop(0, `rgba(255,255,255,${0.92 * cone})`);
      g.addColorStop(0.4, `rgba(255,250,240,${0.5 * cone})`);
      g.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.bezierCurveTo(2, -6.5, -7, -10.5, -17, -12);
      ctx.lineTo(-17, 12);
      ctx.bezierCurveTo(-7, 10.5, 2, 6.5, 5, 0);
      ctx.closePath();
      ctx.fill();
      for (const [dx, ry, a] of [[-2.5, 6.8, 0.8], [-7, 9.3, 0.5], [-11.5, 10.9, 0.3]]) {
        strokePath(ctx, rgba('#ffffff', a * cone), 0.7, (c) => c.ellipse(dx, 0, 1.4, ry, 0, 0, TAU));
      }
      strokePath(ctx, rgba('#ffffff', cone), 1.0, (c) => { c.moveTo(-2, -7.4); c.quadraticCurveTo(4, -3.6, 5, 0); c.quadraticCurveTo(4, 3.6, -2, 7.4); });
    }
    // The afterburner flickers on the pass clock.
    drawJet(ctx, 0.8 + 0.2 * Math.sin(tau * 40 - 10), haze(JET, jy, 0.12));
    ctx.restore();
  }
  ctx.restore();
}

// ================================================================== the coyote
const COYOTE = {
  fur: '#9e8568', furLit: '#e4c193', furDark: '#6b5847', cream: '#ead8b8', tip: '#3a302a',
  ear: '#c48a6a', nose: '#241c18', eye: '#241c18',
};
/**
 * A coyote on a sandstone ledge, howling every 5 s, seated on the NEAR dunes.
 * x: the ledge's centre (a summit suits it). Ink spans about x-26 .. x+25 and ~40 px
 * above the crest; the song rings drift a further ~15 px up and right.
 * facing: 1 howls to the right (at the sun), -1 to the left. Only the animal turns —
 * the ledge keeps its sun-lit face, and the rings go the way the muzzle points.
 *
 * mode (the coyote bake-off, Peter 24 Sep 2026): 'howl' (the default, above), 'yawn'
 * (a yawn, down on the ledge to doze, back up, then a howl, alternating), 'chorus' (a
 * pup on the ledge too, yipping then howling with it) or 'wink' (a coyote sat square to
 * the camera from the start — it never turns — that cocks a brow and winks). The last
 * three run a performance clock: looped on t, or — when the caller passes `since`,
 * the seconds since this ledge came into view — started from there, `pace` times
 * faster (portrait crosses a narrow picture quickly). See drawCoyotePerformance.
 */
export function drawDesertCoyote(ctx, t, x, seat, facing = 1, { mode = 'howl', since = null, pace = 1 } = {}) {
  ctx.save();
  const P = haze(COYOTE, 160, 0.04);
  const rock = haze({ body: NEAR_ROCK, lit: NEAR_ROCK_LIT, dark: NEAR_ROCK_DARK, band: ROCK }, 170, 0.04);
  const x0 = x;
  const y0 = seat.near(x0);
  clipSky(ctx, x0 - 90, x0 + 90, [(xx) => seat.near(xx) + 2]);
  ctx.translate(x0, y0);
  // The outcrop: a flat-topped sandstone ledge in the near-rock palette, strata and all.
  const outline = [-26, 14, -24, -3, -19, -9, -8, -12.4, 9, -12.2, 17, -9.6, 22, -4, 25, 14];
  fillPath(ctx, rock.body, poly(outline));
  ctx.save();
  ctx.beginPath(); poly(outline)(ctx); ctx.clip();
  fillPath(ctx, rock.lit, poly([-19, -9, -8, -12.4, 9, -12.2, 17, -9.6, 16, -8.4, 8, -10.8, -8, -11, -18, -7.8]));
  for (const [yy, hh] of [[-6.2, 1.4], [-2.2, 1], [1.8, 1.6]]) fillPath(ctx, rgba(rock.band, 0.7), box(-30, yy, 60, hh));
  fillPath(ctx, rgba(rock.dark, 0.75), poly([-26, 14, -24, -3, -19, -9, -16, -8, -20, 0, -21, 14]));
  fillPath(ctx, rgba(rock.dark, 0.5), poly([17, -9.6, 22, -4, 25, 14, 20, 14, 19, -3]));
  ctx.restore();
  if (mode !== 'howl' && COYOTE_SHOWS[mode]) {
    drawCoyotePerformance(ctx, t, P, facing < 0 ? -1 : 1, mode, since, pace);
    ctx.restore();
    return;
  }
  // ---- the coyote, sitting on the ledge facing the sun (right) or away from it
  const cyc = fract(t / 5);
  const up = cyc < 0.5 ? 0 : cyc < 0.58 ? smooth(0.5, 0.58, cyc) : cyc < 0.88 ? 1 : 1 - smooth(0.88, 0.98, cyc);
  const howl = cyc > 0.58 && cyc < 0.88 ? 1 : 0;
  const dir = facing < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(-3 * dir, -12.2);
  ctx.scale(1.5 * dir, 1.5);
  // Tail, bushy, curled round the front of the paws, tip twitching.
  const tw = Math.sin(t * 2.2) * 0.5;
  fillPath(ctx, P.fur, (c) => { c.moveTo(-6, -1.6); c.quadraticCurveTo(-8.6, 0.4, -4.6, 0.6); c.quadraticCurveTo(1, 0.9, 5.4 + tw, -0.4); c.quadraticCurveTo(1.4, -1.4, -2.8, -1.8); c.closePath(); });
  fillPath(ctx, P.tip, (c) => { c.moveTo(3.6 + tw * 0.6, 0.6); c.quadraticCurveTo(5.4 + tw, 0.2, 5.4 + tw, -0.4); c.quadraticCurveTo(4.2, -0.9, 3.2, -0.6); c.closePath(); });
  // Haunch and back.
  fillPath(ctx, P.fur, (c) => c.ellipse(-3, -3.6, 4.6, 3.8, 0, 0, TAU));
  fillPath(ctx, P.furDark, (c) => { c.ellipse(-3.6, -2.6, 3.6, 2.6, 0, 0.4 * Math.PI, 1.3 * Math.PI); c.closePath(); });
  // Torso rising to the shoulders; cream chest; the chest heaves while it howls.
  const heave = howl ? Math.sin(t * 9) * 0.25 : 0;
  fillPath(ctx, P.fur, (c) => { c.moveTo(-6.4, -4); c.quadraticCurveTo(-5.4, -10, 0.8, -13.2); c.lineTo(4.4 + heave, -10.4); c.quadraticCurveTo(4.6 + heave, -5, 2.8, -1); c.lineTo(-3, -0.4); c.closePath(); });
  fillPath(ctx, P.cream, (c) => { c.moveTo(4.4 + heave, -10.4); c.quadraticCurveTo(5 + heave, -5.6, 3.2, -1.2); c.lineTo(1.8, -1.2); c.quadraticCurveTo(3.2, -6, 2.4, -10.6); c.closePath(); });
  fillPath(ctx, P.furLit, (c) => { c.moveTo(-5.6, -7.2); c.quadraticCurveTo(-3.6, -11.4, 0.8, -13.2); c.lineTo(1.4, -12.4); c.quadraticCurveTo(-3, -10.6, -5.2, -6.2); c.closePath(); });
  // Front legs, straight, paws on the ledge.
  for (const lx of [1.6, 3.2]) {
    fillPath(ctx, lx > 2 ? P.fur : P.furDark, box(lx - 0.7, -8, 1.4, 8, 0.5));
    fillPath(ctx, P.cream, (c) => c.ellipse(lx + 0.2, -0.3, 1, 0.5, 0, 0, TAU));
  }
  // Head: level and looking about, or thrown back for the howl.
  const look = Math.sin(t * 0.8) * 0.12 * (1 - up);
  ctx.save();
  ctx.translate(2.6, -12.6);
  ctx.rotate(-up * 0.95 + look);
  const jaw = howl ? 0.35 + Math.sin(t * 6) * 0.08 : 0;
  fillPath(ctx, P.fur, (c) => c.ellipse(0.6, -1.3, 2.6, 2.2, -0.1, 0, TAU));
  // Ears: tall and pointed, one flicking now and then.
  const flick = fract(t * 0.43) < 0.06 ? 0.3 : 0;
  for (const [ex, rot, dark] of [[-0.6, -0.25 - flick, true], [0.9, 0.05, false]]) {
    fillPath(ctx, dark ? P.furDark : P.fur, (c) => { c.moveTo(ex - 1.1, -2.6); c.lineTo(ex + Math.sin(rot) * 3.4, -2.6 - Math.cos(rot) * 3.6); c.lineTo(ex + 1.1, -2.8); c.closePath(); });
    if (!dark) fillPath(ctx, P.ear, (c) => { c.moveTo(ex - 0.5, -2.9); c.lineTo(ex + Math.sin(rot) * 2.6, -2.8 - Math.cos(rot) * 2.8); c.lineTo(ex + 0.5, -3); c.closePath(); });
  }
  // Muzzle, long and tapering, lower jaw dropping for the howl — the open mouth dark
  // between them.
  if (jaw > 0.05) {
    const jx = 2.2 + Math.cos(jaw) * 4.1 - Math.sin(jaw) * 0.55, jy = -0.8 + Math.sin(jaw) * 4.1 + Math.cos(jaw) * 0.55;
    fillPath(ctx, '#5a2a24', poly([2.3, -0.3, 6.8, -0.6, jx, jy]));
  }
  ctx.save();
  ctx.translate(2.2, -0.8);
  ctx.rotate(jaw);
  fillPath(ctx, P.cream, poly([0, 0.1, 4.3, 0.2, 4.1, 1.0, 0, 1.4]));
  ctx.restore();
  fillPath(ctx, P.fur, poly([1.6, -2.8, 6.9, -1.35, 7.0, -0.25, 2.0, 0.35]));
  fillPath(ctx, P.furLit, poly([1.6, -2.8, 6.9, -1.35, 6.7, -1.0, 1.8, -2.2]));
  fillPath(ctx, P.nose, circle(6.9, -0.95, 0.6));
  if (howl) {
    strokePath(ctx, P.eye, 0.35, (c) => { c.moveTo(1.2, -2.2); c.lineTo(2.4, -1.8); });
  } else {
    fillPath(ctx, P.eye, circle(1.9, -1.9, 0.42));
    fillPath(ctx, '#f6d98a', circle(2.05, -2.0, 0.14));
  }
  ctx.restore();
  // The song: rings drifting off the muzzle while it howls.
  if (howl || up > 0.5) {
    const dirA = -up * 0.95 - 0.1;
    const mx = 2.6 + Math.cos(dirA) * 7.4, my = -12.6 + Math.sin(dirA) * 7.4 - 1;
    for (let k = 0; k < 3; k++) {
      const ph = fract(t * 1.2 + k / 3);
      const a = 0.75 * (1 - ph) * (howl ? 1 : 0.4);
      strokePath(ctx, rgba('#fff4dc', a), 0.45, (c) => c.arc(mx + Math.cos(dirA) * ph * 9, my + Math.sin(dirA) * ph * 9, 1.2 + ph * 4.4, dirA - 0.75, dirA + 0.75));
    }
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------ the coyote's performances
// The coyote bake-off (src/dev/coyote-candidates.js, 24 Sep 2026): Peter picked the
// yawn, the chorus with a pup, and a wink — from a coyote that is ALREADY square to
// the camera ("no turning from profile to facing the camera, anywhere… nothing else
// does this"). Everything here is the howler's own construction generalised into a
// pose: the same tail, haunch, torso, chest, legs, head, ears, muzzle and song rings
// at lie 0, in coyote space (origin on the ledge top under the haunch, muzzle toward
// +x, drawn at 1.5). Each show is a clock u (s) -> a pose, and ends where it began.
const COYOTE_MOUTH = '#5a2a24';
const COYOTE_TONGUE = '#c86a6a';
const COYOTE_SONG = '#fff4dc';
const COYOTE_SPARK = '#fffbea';
const COYOTE_HEAD_SIT = [2.6, -12.6];
const COYOTE_HEAD_LIE = [9.0, -3.2];
function coyoteRest(t) {
  return {
    lie: 0, heave: 0, lean: 0, tw: Math.sin(t * 2.2) * 0.5,
    head: {
      rot: Math.sin(t * 0.8) * 0.12, jaw: 0, eye: 'open', earBack: 0, lids: 0,
      flick: fract(t * 0.43) < 0.06 ? 0.3 : 0, tongue: 0,
    },
    rings: 0, ringDir: 0, ringRate: 1.2, ringSize: 1, marks: [],
  };
}
// The howl on a clock: head up at `from`, the song from `from`+0.3 to `to`, down after.
function coyoteHowlAt(p, u, t, from, to, rate = 6) {
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
// Sitting (lie 0 — the howler's body exactly) morphing to lying along the ledge.
const COYOTE_TORSO = [[-6.4, -4, -5.4, -10, 0.8, -13.2, 4.4, -10.4, 4.6, -5, 2.8, -1, -3, -0.4],
  [-6.6, -3.2, -3, -6.8, 4.4, -6.6, 8.0, -4.8, 8.6, -2.0, 6.6, -0.3, -3, -0.2]];
const COYOTE_CHEST = [[4.4, -10.4, 5, -5.6, 3.2, -1.2, 1.8, -1.2, 3.2, -6, 2.4, -10.6],
  [8.0, -4.8, 8.8, -2.4, 6.8, -0.5, 5.4, -0.5, 7.0, -2.6, 6.4, -5.2]];
const COYOTE_BACKLIT = [[-5.6, -7.2, -3.6, -11.4, 0.8, -13.2, 1.4, -12.4, -3, -10.6, -5.2, -6.2],
  [-6, -5, -2, -7.2, 4.4, -6.6, 4.6, -5.9, -2, -6.4, -5.8, -4.3]];
const lerpPts = ([a, b], k) => a.map((v, i) => lerp(v, b[i], k));
function coyoteCurve(ctx, color, Q, h) {
  fillPath(ctx, color, (c) => { c.moveTo(Q[0] + h, Q[1]); c.quadraticCurveTo(Q[2] + h, Q[3], Q[4], Q[5]); c.lineTo(Q[6], Q[7]); c.quadraticCurveTo(Q[8], Q[9], Q[10], Q[11]); c.closePath(); });
}
function coyoteSideBody(ctx, P, pose) {
  const k = pose.lie, h = pose.heave, tw = pose.tw;
  fillPath(ctx, P.fur, (c) => { c.moveTo(-6, -1.6); c.quadraticCurveTo(-8.6, 0.4, -4.6, 0.6); c.quadraticCurveTo(1, 0.9, 5.4 + tw, -0.4); c.quadraticCurveTo(1.4, -1.4, -2.8, -1.8); c.closePath(); });
  fillPath(ctx, P.tip, (c) => { c.moveTo(3.6 + tw * 0.6, 0.6); c.quadraticCurveTo(5.4 + tw, 0.2, 5.4 + tw, -0.4); c.quadraticCurveTo(4.2, -0.9, 3.2, -0.6); c.closePath(); });
  fillPath(ctx, P.fur, oval(-3, lerp(-3.6, -2.8, k), lerp(4.6, 4.8, k), lerp(3.8, 3.0, k)));
  fillPath(ctx, P.furDark, (c) => { c.ellipse(-3.6, lerp(-2.6, -2.1, k), 3.6, lerp(2.6, 2.0, k), 0, 0.4 * Math.PI, 1.3 * Math.PI); c.closePath(); });
  const T = lerpPts(COYOTE_TORSO, k);
  fillPath(ctx, P.fur, (c) => { c.moveTo(T[0], T[1]); c.quadraticCurveTo(T[2], T[3], T[4], T[5]); c.lineTo(T[6] + h, T[7]); c.quadraticCurveTo(T[8] + h, T[9], T[10], T[11]); c.lineTo(T[12], T[13]); c.closePath(); });
  coyoteCurve(ctx, P.cream, lerpPts(COYOTE_CHEST, k), h);
  coyoteCurve(ctx, P.furLit, lerpPts(COYOTE_BACKLIT, k), 0);
  // Front legs: straight down sitting, laid forward along the ledge lying.
  for (const lx of [1.6, 3.2]) {
    ctx.save();
    ctx.translate(lerp(lx, lx + 3.6, k), lerp(-8, -1.9, k));
    ctx.rotate(lerp(0, -Math.PI / 2, k));
    fillPath(ctx, lx > 2 ? P.fur : P.furDark, box(-0.7, 0, 1.4, lerp(8, 6.6, k), 0.5));
    ctx.restore();
    fillPath(ctx, P.cream, oval(lerp(lx + 0.2, lx + 10.3, k), lerp(-0.3, -0.55, k), lerp(1, 1.15, k), 0.5));
  }
}
// The howler's head, with ears laid back, a jaw that can open to a yawn and a tongue.
function coyoteSideHead(ctx, P, h) {
  ctx.rotate(h.rot);
  fillPath(ctx, P.fur, oval(0.6, -1.3, 2.6, 2.2, -0.1));
  for (const [ex, rot0, dark] of [[-0.6, -0.25 - h.flick, true], [0.9, 0.05, false]]) {
    const rot = rot0 - h.earBack * 0.95, L = 1 - h.earBack * 0.25;
    fillPath(ctx, dark ? P.furDark : P.fur, (c) => { c.moveTo(ex - 1.1, -2.6); c.lineTo(ex + Math.sin(rot) * 3.4 * L, -2.6 - Math.cos(rot) * 3.6 * L); c.lineTo(ex + 1.1, -2.8); c.closePath(); });
    if (!dark) fillPath(ctx, P.ear, (c) => { c.moveTo(ex - 0.5, -2.9); c.lineTo(ex + Math.sin(rot) * 2.6 * L, -2.8 - Math.cos(rot) * 2.8 * L); c.lineTo(ex + 0.5, -3); c.closePath(); });
  }
  const jaw = h.jaw;
  if (jaw > 0.05) {
    const jx = 2.2 + Math.cos(jaw) * 4.1 - Math.sin(jaw) * 0.55, jy = -0.8 + Math.sin(jaw) * 4.1 + Math.cos(jaw) * 0.55;
    fillPath(ctx, COYOTE_MOUTH, poly([2.3, -0.3, 6.8, -0.6, jx, jy]));
  }
  ctx.save();
  ctx.translate(2.2, -0.8);
  ctx.rotate(jaw);
  if (h.tongue > 0.02) fillPath(ctx, COYOTE_TONGUE, oval(2.6, -0.25, 1.7 * h.tongue, 0.45, -0.1));
  fillPath(ctx, P.cream, poly([0, 0.1, 4.3, 0.2, 4.1, 1.0, 0, 1.4]));
  ctx.restore();
  fillPath(ctx, P.fur, poly([1.6, -2.8, 6.9, -1.35, 7.0, -0.25, 2.0, 0.35]));
  fillPath(ctx, P.furLit, poly([1.6, -2.8, 6.9, -1.35, 6.7, -1.0, 1.8, -2.2]));
  fillPath(ctx, P.nose, circle(6.9, -0.95, 0.6));
  if (h.eye === 'shut') {
    strokePath(ctx, P.eye, 0.35, (c) => { c.moveTo(1.2, -2.2); c.lineTo(2.4, -1.8); });
  } else {
    fillPath(ctx, P.eye, circle(1.9, -1.9, 0.42));
    fillPath(ctx, '#f6d98a', circle(2.05, -2.0, 0.14));
    if (h.lids > 0.05) fillPath(ctx, P.fur, (c) => { c.ellipse(1.9, -1.9, 0.6, 0.6, 0, Math.PI, Math.PI + Math.PI * h.lids); c.lineTo(1.9, -1.9); c.closePath(); });
  }
}
function coyoteRings(ctx, t, pose, anchor) {
  if (pose.rings <= 0) return;
  const dirA = pose.ringDir, S = pose.ringSize;
  const mx = anchor[0] + Math.cos(dirA) * 7.4, my = anchor[1] + Math.sin(dirA) * 7.4 - 1;
  for (let k = 0; k < 3; k++) {
    const ph = fract(t * pose.ringRate + k / 3);
    const a = 0.75 * (1 - ph) * pose.rings;
    strokePath(ctx, rgba(COYOTE_SONG, a), 0.45, (c) => c.arc(mx + Math.cos(dirA) * ph * 9 * S, my + Math.sin(dirA) * ph * 9 * S, (1.2 + ph * 4.4) * S, dirA - 0.75, dirA + 0.75));
  }
}
function coyoteStar(ctx, x, y, R, rot, a) {
  if (R <= 0.02 || a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.5);
  g.addColorStop(0, rgba('#ffffff', 0.55 * a));
  g.addColorStop(1, rgba('#fff4d0', 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R * 1.5, 0, TAU); ctx.fill();
  fillPath(ctx, rgba(COYOTE_SPARK, a), (c) => {
    for (let i = 0; i < 8; i++) {
      const ang = rot + (i * Math.PI) / 4, r = i % 2 === 0 ? R : R * 0.22;
      if (i === 0) c.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      else c.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    }
    c.closePath();
  });
}
function coyoteZ(ctx, x, y, s, a, dir) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(dir * s, s);   // un-mirrored: a Z reads as a Z both ways
  const z = (c) => { c.moveTo(-1, -1); c.lineTo(1, -1); c.lineTo(-1, 1); c.lineTo(1, 1); };
  strokePath(ctx, rgba(COYOTE_SPARK, a * 0.9), 1.05, z);
  strokePath(ctx, rgba(COYOTE.tip, a), 0.45, z);
  ctx.restore();
}
// One side-on animal: fig = { ox, oy, s, dir, headScale } places coyote space on the
// ledge (the howler's own: -3·dir, -12.2, 1.5).
function coyoteSideFigure(ctx, t, P, pose, fig) {
  ctx.save();
  ctx.translate(fig.ox, fig.oy);
  ctx.scale(fig.s * fig.dir, fig.s);
  if (pose.lean) { ctx.translate(-3, 0); ctx.rotate(pose.lean); ctx.translate(3, 0); }
  coyoteSideBody(ctx, P, pose);
  const anchor = [lerp(COYOTE_HEAD_SIT[0], COYOTE_HEAD_LIE[0], pose.lie), lerp(COYOTE_HEAD_SIT[1], COYOTE_HEAD_LIE[1], pose.lie)];
  ctx.save();
  ctx.translate(anchor[0], anchor[1]);
  if (fig.headScale) ctx.scale(fig.headScale, fig.headScale);
  coyoteSideHead(ctx, P, pose.head);
  ctx.restore();
  coyoteRings(ctx, t, pose, anchor);
  for (const m of pose.marks) coyoteZ(ctx, m.x, m.y, m.s, m.a, fig.dir);
  ctx.restore();
}

// YAWN AND SETTLE, then the howl: a jaw-cracking yawn (head back, tongue curled, ears
// flat), down on the ledge chin on paws with Z's, back up, and a howl at 8.2–9.9.
function coyoteYawnShow(u, t, dir) {
  const p = coyoteRest(t);
  const h = p.head;
  if (u >= 7.8) return [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, coyoteHowlAt(p, u, t, 8.2, 9.9)]];
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
  const ax = lerp(COYOTE_HEAD_SIT[0], COYOTE_HEAD_LIE[0], lie), ay = lerp(COYOTE_HEAD_SIT[1], COYOTE_HEAD_LIE[1], lie);
  for (let i = 0; i < 4; i++) {
    const age = (u - 3.5 - i * 0.8) / 1.7;
    if (age <= 0 || age >= 1 || u > 6.4) continue;
    p.marks.push({ x: ax + 2 + age * 3.5 + Math.sin(age * 5 + i) * 0.6, y: ay - 4.5 - age * 8,
      s: 0.9 + age * 0.7, a: Math.min(1, age * 5) * (1 - smooth(0.65, 1, age)) });
  }
  return [[{ ox: -3 * dir, oy: -12.2, s: 1.5, dir }, p]];
}
// CHORUS: a sandier pup in front of the adult, both side-on and facing the same way.
// The adult howls; the pup yips three times, finds the note, and they hold it together
// in two sizes of ring. After, the adult bows its head to nose the pup's ear and the
// pup looks up. Nobody turns round.
function coyoteChorusShow(u, t, dir) {
  const A = coyoteHowlAt(coyoteRest(t), u, t, 0.8, 3.4);
  const B = coyoteRest(t + 1.3);
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

// THE WINKER: a coyote sat square to the camera — haunches either side, cream bib,
// both forelegs, the tail out along the ledge — from the moment it is on screen. It
// cocks a brow, winks slowly with a star twinkle off the shut eye and a toothy grin,
// then a glint off the teeth. The face is built from big flat shapes (a pale mask,
// dark eyes, the nose the darkest mark) so the wink survives game scale.
function coyoteFrontHead(ctx, P, h) {
  for (const s of [-1, 1]) {
    fillPath(ctx, s < 0 ? P.furDark : P.fur, poly([s * 2.9, -0.8, s * (3.5 - h.flick * s), -6.4, s * 0.7, -2.7]));
    fillPath(ctx, P.ear, poly([s * 2.4, -1.4, lerp(s * 2.4, s * 3.5, 0.72), lerp(-1.4, -6.4, 0.72), s * 1.1, -2.6]));
  }
  fillPath(ctx, P.fur, oval(0, -0.9, 2.8, 2.2));
  for (const s of [-1, 1]) {
    const lift = (s > 0 ? h.wink * 0.35 : 0) + h.grin * 0.25;
    fillPath(ctx, P.fur, poly([s * 1.2, -2.2, s * 3.0, -0.9, s * 3.25, 1.3 - lift, s * 1.0, 3.0]));
    fillPath(ctx, P.furLit, poly([s * 2.3, 0.1 - lift, s * 3.1, 1.2 - lift, s * 1.6, 2.1 - lift * 0.5]));
  }
  fillPath(ctx, P.furLit, oval(0, -2.1, 1.7, 0.75));
  fillPath(ctx, P.cream, (c) => { c.moveTo(-1.45, -0.9); c.quadraticCurveTo(-1.35, 2.6, 0, 3.35); c.quadraticCurveTo(1.35, 2.6, 1.45, -0.9); c.closePath(); });
  fillPath(ctx, P.furLit, poly([-0.5, -2.6, 0.5, -2.6, 0.32, 0.6, -0.32, 0.6]));
  const g = h.grin;
  if (g > 0.03) {
    const w = 0.75 + g * 0.95, yM = 2.05, drop = 0.35 + g * 0.8, cu = g * 0.5;
    const mouth = (c) => { c.moveTo(-w, yM - cu); c.quadraticCurveTo(0, yM + drop * 1.3, w, yM - cu); c.quadraticCurveTo(0, yM + drop * 0.3, -w, yM - cu); c.closePath(); };
    fillPath(ctx, COYOTE_MOUTH, mouth);
    if (g > 0.4) {
      ctx.save();
      ctx.beginPath(); mouth(ctx); ctx.clip();
      fillPath(ctx, '#fffaf0', (c) => { c.moveTo(-w, yM - cu); c.quadraticCurveTo(0, yM + drop * 0.3, w, yM - cu); c.lineTo(w, yM - cu + 0.55); c.quadraticCurveTo(0, yM + drop * 0.75, -w, yM - cu + 0.55); c.closePath(); });
      ctx.restore();
    }
  } else {
    strokePath(ctx, P.furDark, 0.3, (c) => { c.moveTo(0, 1.9); c.lineTo(0, 2.35); c.moveTo(-0.6, 2.5); c.quadraticCurveTo(0, 2.72, 0.6, 2.5); });
  }
  fillPath(ctx, P.nose, oval(0, 1.45, 0.8, 0.55));
  fillPath(ctx, rgba('#ffffff', 0.35), oval(-0.25, 1.27, 0.26, 0.13));
  const eyeY = -1.0;
  for (const s of [-1, 1]) {
    const ex = s * 1.35;
    const wink = s > 0 ? h.wink : 0;
    fillPath(ctx, P.cream, oval(ex, eyeY, 0.85, 0.7, s * -0.25));
    if (wink > 0.6) {
      strokePath(ctx, P.eye, 0.55, (c) => { c.moveTo(ex - 0.8, eyeY + 0.25); c.quadraticCurveTo(ex, eyeY - 0.75, ex + 0.8, eyeY + 0.25); });
      continue;
    }
    fillPath(ctx, P.eye, oval(ex, eyeY + 0.05, 0.52, 0.58));
    fillPath(ctx, '#f6d98a', circle(ex + 0.18, eyeY - 0.12, 0.16));
    const lid = Math.max(wink / 0.6, h.blink);
    if (lid > 0.02) {
      ctx.save();
      ctx.beginPath(); oval(ex, eyeY, 0.95, 0.8, s * -0.25)(ctx); ctx.clip();
      const ly = eyeY - 1.0 + 1.8 * Math.min(1, lid);
      fillPath(ctx, P.fur, box(ex - 1.2, eyeY - 1.0, 2.4, ly - eyeY + 1.0 + 0.05));
      strokePath(ctx, P.eye, 0.3, (c) => { c.moveTo(ex - 1, ly); c.lineTo(ex + 1, ly); });
      ctx.restore();
    }
  }
  if (h.brow > 0.03) {
    const b = h.brow;
    strokePath(ctx, P.furDark, 0.5, (c) => { c.moveTo(-2.25, eyeY - 1.05 - b * 0.5); c.quadraticCurveTo(-1.4, eyeY - 1.55 - b * 0.9, -0.55, eyeY - 1.2 - b * 0.35); });
  }
}
const COYOTE_FRONT_HEAD = [0, -15.2];
const COYOTE_FRONT_S = 1.14;
function coyoteWinkShow(ctx, t, P, u, idleBlink = null) {
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
  // Tail out along the ledge to the shade side, tip twitching.
  const tw = Math.sin(t * 2.2) * 0.5 + wag;
  fillPath(ctx, P.fur, (c) => { c.moveTo(-3.4, -2.4); c.quadraticCurveTo(-7.4, -2.2, -9.4 + tw * 0.4, -0.9 + tw * 0.3); c.quadraticCurveTo(-7.8, 0.2, -3.4, -0.2); c.closePath(); });
  fillPath(ctx, P.tip, (c) => { c.moveTo(-8.0 + tw * 0.3, -1.6); c.quadraticCurveTo(-9.4 + tw * 0.4, -1.4 + tw * 0.3, -9.4 + tw * 0.4, -0.9 + tw * 0.3); c.quadraticCurveTo(-8.6, -0.3, -7.6, -0.4); c.closePath(); });
  // Haunches either side, then the torso rising to the neck, lit on the sun side.
  for (const s of [-1, 1]) {
    fillPath(ctx, P.fur, oval(s * 3.2, -2.9, 2.5, 2.9));
    fillPath(ctx, P.cream, oval(s * 4.3, -0.35, 1.1, 0.45));
  }
  fillPath(ctx, P.furDark, (c) => { c.ellipse(-3.2, -2.9, 2.5, 2.9, 0, 0.5 * Math.PI, 1.4 * Math.PI); c.closePath(); });
  fillPath(ctx, P.fur, (c) => { c.moveTo(-4.1, -1.6); c.quadraticCurveTo(-4.4, -9, -2.2, -12.8); c.lineTo(2.2, -12.8); c.quadraticCurveTo(4.4, -9, 4.1, -1.6); c.closePath(); });
  fillPath(ctx, P.furLit, (c) => { c.moveTo(2.2, -12.8); c.quadraticCurveTo(4.4, -9, 4.1, -1.6); c.lineTo(3.3, -1.8); c.quadraticCurveTo(3.5, -8.6, 1.5, -12.2); c.closePath(); });
  fillPath(ctx, P.cream, (c) => { c.moveTo(-1.8, -11.8); c.quadraticCurveTo(-2.5, -6, -1.3, -2.2); c.lineTo(1.3, -2.2); c.quadraticCurveTo(2.5, -6, 1.8, -11.8); c.closePath(); });
  for (const s of [-1, 1]) {
    fillPath(ctx, s < 0 ? P.furDark : P.fur, box(s * 1.05 - 0.7, -8, 1.4, 8, 0.5));
    fillPath(ctx, P.cream, oval(s * 1.1, -0.3, 1, 0.5));
  }
  ctx.save();
  ctx.translate(COYOTE_FRONT_HEAD[0], COYOTE_FRONT_HEAD[1]);
  ctx.rotate(tilt);
  ctx.scale(COYOTE_FRONT_S, COYOTE_FRONT_S);
  coyoteFrontHead(ctx, P, { brow, wink, grin, blink, flick });
  ctx.restore();
  // The twinkle off the shut eye the instant it closes; a glint off the teeth later.
  const [hx, hy] = COYOTE_FRONT_HEAD;
  const k = (u - 1.13) / 0.8;
  if (k > 0 && k < 1) {
    coyoteStar(ctx, hx + 4.0 * COYOTE_FRONT_S, hy + (-1.0 - 1.4) * COYOTE_FRONT_S,
      (k < 0.14 ? k / 0.14 : 1 - ((k - 0.14) / 0.86) * 0.55) * 3.6, k * 1.4, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
  }
  const gk = (u - 2.5) / 0.45;
  if (gk > 0 && gk < 1) coyoteStar(ctx, hx + 0.9, hy + 2.6, 1.5 * Math.sin(gk * Math.PI), gk * 2, 1);
  ctx.restore();
}

// loop: the show's period on t; start: where a latched show begins (its first move
// comes a beat later).
const COYOTE_SHOWS = {
  yawn: { loop: 10.4, start: 0.55 },
  chorus: { loop: 6, start: 0.5 },
  wink: { loop: 6, start: 0.2 },
  winkWait: { loop: 6, start: 0.2 },
};
// THE WINK WAITS FOR THE FINISH (Peter, 25 Sep 2026: "the winking coyote doesn't wink
// until after we have jumped on the finish pad?.. he can blink before then"). The finish
// coyote on speed-3 sits square to the camera blinking — both eyes, every few seconds —
// and `since` here is the seconds since the finish pad, null until then: from it, the
// brow, the wink and the grin play once, and it goes back to blinking.
const COYOTE_IDLE_U = 5.5;           // a moment of the wink show with nothing moving
function coyoteIdleBlink(t) {
  const k = (t % 3.3) / 0.16;
  return k < 1 ? Math.sin(k * Math.PI) : 0;
}
function drawCoyotePerformance(ctx, t, P, dir, mode, since, pace) {
  const show = COYOTE_SHOWS[mode];
  if (mode === 'winkWait') {
    const u = since == null ? Infinity : show.start + Math.max(0, since) * pace;
    if (u < COYOTE_IDLE_U) coyoteWinkShow(ctx, t, P, u);
    else coyoteWinkShow(ctx, t, P, COYOTE_IDLE_U, coyoteIdleBlink(t));
    return;
  }
  const clock = since == null ? t : show.start + Math.max(0, since) * pace;
  const u = fract(clock / show.loop) * show.loop;
  if (mode === 'wink') { coyoteWinkShow(ctx, t, P, u); return; }
  const cast = mode === 'yawn' ? coyoteYawnShow(u, t, dir) : coyoteChorusShow(u, t, dir);
  const pup = cast.length > 1 ? Object.fromEntries(Object.entries(P).map(([key, v]) => [key,
    key === 'nose' || key === 'eye' || key === 'tip' ? v : mix(v, '#f0d2a4', 0.14)])) : null;
  for (const [fig, pose] of cast) coyoteSideFigure(ctx, t, fig.pup ? pup : P, pose, fig);
}

// ================================================================== the dust devil
const DEVIL = {
  base: '#c89a6e', lit: '#f5d7a6', shadow: '#8e6a4c', edge: '#6e5038', rim: '#fff0cc', grit: '#4a3626',
};
/**
 * One dust devil standing on the MIDDLE dunes at screen x (its wander is the caller's,
 * through x; the sway and whirl are its own). Ink leans up to ~45 px right of x at its
 * top, ~20 px left at the foot, and rises ~120 px above the crest; clipped behind the
 * near dunes.
 */
export function drawDesertDustDevil(ctx, t, x, seat) {
  ctx.save();
  const bx = x;
  const groundY = seat.mid(bx) + 2;
  const pal = haze(DEVIL, groundY - 40, 0.04);
  clipSky(ctx, bx - 90, bx + 120, [(xx) => seat.mid(xx) + 6, seat.near]);
  const Hh = 112;
  // The column's spine: leaning downwind, swaying, the top wandering further.
  const spine = (u) => {
    const lean = 20 * u * u + Math.sin(t * 0.9 + u * 2.4) * 5 * u + Math.sin(t * 2.3 + u * 6) * 1.4 * u;
    return [bx + lean, groundY - u * Hh];
  };
  const radius = (u) => 3 + 19 * u ** 1.8 + Math.sin(t * 3 + u * 9) * 0.6 * u;
  // Body: one silhouette of real dust — dense and opaque through the lower two thirds,
  // fraying only near the top — with a sunlit flank on the right and a shadowed one on
  // the left in flat bands, so it holds its shape against both the sky and the dunes.
  const band = (fromFrac, toFrac, color, a0) => {
    const g = ctx.createLinearGradient(0, groundY, 0, groundY - Hh);
    g.addColorStop(0, rgba(color, a0));
    g.addColorStop(0.55, rgba(color, a0 * 0.85));
    g.addColorStop(0.85, rgba(color, a0 * 0.4));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30; const [cx, cy] = spine(u); ctx.lineTo(cx + radius(u) * fromFrac, cy); }
    for (let i = 30; i >= 0; i--) { const u = i / 30; const [cx, cy] = spine(u); ctx.lineTo(cx + radius(u) * toFrac, cy); }
    ctx.closePath();
    ctx.fill();
  };
  band(-1, 1, pal.base, 0.8);
  band(-1, -0.3, pal.shadow, 0.6);
  band(0.25, 0.95, pal.lit, 0.62);
  // Edges: a dark shadow-side contour and a bright sunlit rim, fading with the dust.
  const edge = (frac, color, a0, w) => {
    for (let i = 1; i <= 26; i++) {
      const u0 = (i - 1) / 30, u1 = i / 30;
      const [ax, ay] = spine(u0), [cx, cy] = spine(u1);
      const a = a0 * (1 - smooth(0.55, 0.88, u1));
      strokePath(ctx, rgba(color, a), w, (c) => { c.moveTo(ax + radius(u0) * frac, ay); c.lineTo(cx + radius(u1) * frac, cy); }, 'butt');
    }
  };
  edge(-0.97, pal.edge, 0.55, 0.9);
  edge(0.93, pal.rim, 0.6, 0.7);
  // Dust bands winding up it — irregular pitch, the near side bright, the far dim.
  for (let b = 0; b < 5; b++) {
    const ph = b * 1.7 + hash(b) * 2;
    const pitch = 9 + hash(b + 4) * 5;
    let prev = null;
    for (let i = 0; i <= 44; i++) {
      const u = i / 44;
      const [cx, cy] = spine(u);
      const r = radius(u) * (0.8 + 0.2 * Math.sin(u * 7 + b));
      const ang = t * 6.5 - u * pitch + ph;
      const px = cx + Math.sin(ang) * r, py = cy + Math.cos(ang) * r * 0.22;
      const front = Math.cos(ang) > 0;
      if (prev) {
        const a = (front ? 0.75 : 0.3) * (1 - smooth(0.6, 1, u)) * (0.65 + 0.35 * Math.sin(u * 11 + t * 2 + b));
        if (a > 0.02) strokePath(ctx, rgba(front ? pal.rim : pal.edge, a), 0.7 + u * 2, (c) => { c.moveTo(prev[0], prev[1]); c.lineTo(px, py); });
      }
      prev = [px, py];
    }
  }
  // Frayed top: loose wisps shed downwind.
  for (let k = 0; k < 6; k++) {
    const ph = fract(t * 0.32 + k / 6);
    const [cx, cy] = spine(0.82 + ph * 0.2);
    dustPuff(ctx, cx + 5 + ph * 20 + k * 2.5, cy - ph * 7, 3.6 + ph * 8, 0.3 * (1 - ph), pal);
  }
  // Skirt: a thick cloud boiling round the foot.
  for (let k = 0; k < 9; k++) {
    const ang = t * 4.2 + k * (TAU / 9);
    const r = 6 + (k % 3) * 3;
    dustPuff(ctx, bx + Math.sin(ang) * r, groundY - 2.5 - (k % 3) * 1.8, 3.4 + (k % 3) * 1.4, 0.55, pal);
  }
  // Debris in orbit: grit, twigs of brush and a small tumbleweed, dark on the near side.
  for (let k = 0; k < 11; k++) {
    const u = 0.05 + (k / 11) * 0.5;
    const ang = t * (9 - k * 0.5) + k * 2.3;
    const [cx, cy] = spine(u);
    const r = radius(u) + 3;
    const front = Math.cos(ang) > 0;
    const gx = cx + Math.sin(ang) * r, gy = cy + Math.cos(ang) * r * 0.24 - Math.sin(t * 3 + k) * 1.4;
    const a = front ? 0.95 : 0.45;
    if (k === 2) {
      strokePath(ctx, rgba(pal.grit, a), 0.55, (c) => { c.arc(gx, gy, 2.2, ang, ang + 5.5); c.moveTo(gx - 1.4, gy - 0.6); c.arc(gx, gy, 1.3, ang + 1, ang + 4.2); });
    } else if (k % 4 === 1) {
      strokePath(ctx, rgba(pal.grit, a), 0.6, (c) => { c.moveTo(gx - 1.6, gy); c.lineTo(gx + 1.6, gy - 0.8 + Math.sin(ang) * 0.8); c.moveTo(gx, gy - 0.4); c.lineTo(gx + 0.6, gy - 1.6); });
    } else {
      fillPath(ctx, rgba(pal.grit, a), box(gx - 0.65, gy - 0.65, 1.3, 1.3));
    }
  }
  ctx.restore();
}

// ================================================================== tumbleweeds
const WEED = { dark: '#6f5236', mid: '#a47d52', lit: '#e7c893', core: '#b88d5c' };
function weedTwigs(seed, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = (k) => hash(seed * 31.7 + i * 7.13 + k * 1.91);
    const r = 0.45 + h(1) * 0.55;          // arc radius, fraction of the ball
    const d = (1 - r) * (0.2 + h(2) * 0.8); // centre offset so the arc stays inside
    const ca = h(3) * TAU;
    out.push({ cx: Math.cos(ca) * d, cy: Math.sin(ca) * d, r, a0: h(4) * TAU, span: 1.1 + h(5) * 1.9, w: 0.7 + h(6) * 0.6 });
  }
  return out;
}
const WEED_TWIGS = [weedTwigs(1, 34), weedTwigs(2, 30), weedTwigs(3, 38)];
function drawWeed(ctx, R, spin, twigs, pal, squash = 0) {
  ctx.save();
  ctx.scale(1 + squash * 0.18, 1 - squash * 0.22);
  // A thin core so the ball has body against busy country; the tangle does the rest.
  fillPath(ctx, rgba(pal.core, 0.34), circle(0, 0, R * 0.92));
  const lw = Math.max(0.45, R * 0.085);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = pass; i < twigs.length; i += 3) {
      const tw = twigs[i];
      const ca = Math.cos(spin), sa = Math.sin(spin);
      const cx = (tw.cx * ca - tw.cy * sa) * R, cy = (tw.cx * sa + tw.cy * ca) * R;
      const a0 = tw.a0 + spin;
      const mid = a0 + tw.span / 2;
      // Lit toward the upper right, where the low sun is.
      const mx = cx + Math.cos(mid) * tw.r * R, my = cy + Math.sin(mid) * tw.r * R;
      const lightness = (mx - my) / (R * 1.4);
      const col = pass === 0 ? pal.dark : lightness > 0.25 ? pal.lit : lightness < -0.3 ? pal.dark : pal.mid;
      strokePath(ctx, col, lw * tw.w * (pass === 0 ? 1.15 : 1), (c) => c.arc(cx, cy, tw.r * R, a0, a0 + tw.span));
    }
  }
  // A few broken stems poking out of the silhouette.
  strokePath(ctx, pal.dark, lw * 0.8, (c) => {
    for (let k = 0; k < 5; k++) {
      const a = spin + k * 1.37 + 0.4;
      c.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
      c.lineTo(Math.cos(a + 0.18) * R * 1.18, Math.sin(a + 0.18) * R * 1.18);
    }
  });
  ctx.restore();
}
// Three variants: size, hop rhythm, hop height and phase, and their own tangle.
const WEEDS = [
  { R: 9.0, hop: 0.66, H: 15, ph: 0.1, twigs: 0 },
  { R: 6.8, hop: 0.5, H: 10, ph: 0.55, twigs: 1 },
  { R: 11.0, hop: 0.84, H: 19, ph: 0.3, twigs: 2 },
];
/**
 * ONE tumbleweed bouncing along the NEAR crest at screen x. i (0..2) picks the
 * variant. `roll` is the ground distance it has rolled, in px — it turns the ball
 * (spin = roll / radius); pass the same coordinate that moves it so the spin matches
 * its travel (it defaults to x). Ink stays within x ± 22 and up to ~45 px above the
 * crest at the top of its highest hop.
 */
export function drawDesertTumbleweed(ctx, t, x, seat, i, roll = x) {
  ctx.save();
  const w = WEEDS[((i % 3) + 3) % 3];
  clipSky(ctx, x - 40, x + 40, [(xx) => seat.near(xx) + 30]);
  const pal = haze(WEED, 190, 0.06);
  const dust = haze(DUST, 190, 0.05);
  const g = seat.near(x);
  const k = t / w.hop + w.ph;
  const hopN = Math.floor(k);
  const p = k - hopN;
  const H = w.H * (0.55 + 0.7 * hash(hopN * 3.1 + w.R));
  const lift = H * 4 * p * (1 - p);
  const squash = Math.max(0, 1 - p / 0.1) * 0.8 + Math.max(0, (p - 0.94) / 0.06) * 0.5;
  const age = p * w.hop;
  if (age < 0.4) {
    for (let q = 0; q < 3; q++) {
      const dir = q - 1;
      dustPuff(ctx, x + dir * (2 + age * 22), g - 1.5 - age * 7 - q * 0.6, 1.5 + age * 7, 0.45 * (1 - age / 0.4), dust);
    }
  }
  ctx.translate(x, g - w.R * (1 - squash * 0.2) - lift + 1.2);
  drawWeed(ctx, w.R, roll / w.R, WEED_TWIGS[w.twigs], pal, squash);
  ctx.restore();
}
