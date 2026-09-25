// SPEED ZONE — more of the desert (BAKE-OFF IDEAS, not wired into the game). Peter, 24
// Sep 2026: "Create more ideas for the first 3 cabinets as well… background items, lane
// items, more animated background items would be nice… Be thorough and as detailed as
// possible for all items."
//
// Same contract as src/dev/idea-scene.js: every idea is a painter and a PLACE — `bg`
// scenery drawn over the shipped backdrop in screen space, `lane` props standing on the
// road at world scale in front of the hero, `air` at a flyer's height. This round is
// meant to be judged as finished art, not as a sketch, so each one is drawn in the
// cabinet's own hand:
//
//   BACKGROUND — "rendered in 1994": flat fills with chunky lit and shadow faces, no
//     outlines, light from the low sun on the right. Farther means cooler, flatter and
//     closer to the sky, exactly as the shipped mesas, towers and poles do it. Anything
//     that stands on a ridge is SEATED on it: the painter samples the shipped ridge with
//     ridgeYAt and clips itself to the sky side of every nearer range (and of the
//     roadside signs), so it reads as standing behind them rather than stuck on top.
//   LANE / AIR — the props language: flat fills, a soft hairline contour, a contact
//     shadow, facing LEFT toward the hero like every animal hazard.
//
// Every painter is deterministic in `t` (seeded hashes, never Math.random), moves on
// fractional pixels, and keeps its state changes inside its own save/restore.
import { W, H } from '../engine/renderer.js';
import { GROUND_Y, ZOOM } from '../engine/camera.js';
import { ridgeYAt } from '../engine/stylePacks/index.js';
import { plain, rr, OUTLINE, drawProp } from '../sprites/props.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { drawTextVectorCentered, textYForMid } from '../engine/sprites.js';
// Six of these won and shipped (Peter, 24 Sep 2026): their art now lives in the pack's
// own module, and the cards below are thin wrappers that only do the gallery's placement.
import {
  drawDesertPumpjacks, drawDesertSpeedTrap, drawDesertJet, drawDesertCoyote,
  drawDesertDustDevil, drawDesertTumbleweed,
} from '../engine/stylePacks/desertLandmarks.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
// The cabinet's own inks (stylePacks/index.js, DESERT_*), so an idea is painted from the
// same box of colours as the country it stands in.
const SKY_TOP = '#f08048';
const SKY_LOW = '#f8c060';
const TOWER_INK = '#526b72';
const TOWER_DARK = '#40545c';
const TOWER_LIGHT = '#9baba6';

// ------------------------------------------------------------------ maths
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, v) => { const k = clamp01((v - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
const fract = (v) => v - Math.floor(v);
// Deterministic per-index noise, same recipe as the pack's own neonHash.
const hash = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);

function rgbOf(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
// `a` pulled `k` of the way toward `b`: how every far colour below is hazed.
function mix(a, b, k) {
  const A = rgbOf(a), B = rgbOf(b);
  return toHex([lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)]);
}
function rgba(hex, a) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
// The sky's own colour at screen height y — skyGrad runs 0..GROUND_Y.
const skyAt = (y) => mix(SKY_TOP, SKY_LOW, clamp01(y / GROUND_Y));
// A whole palette hazed toward the sky at height y.
function haze(pal, y, k) {
  const sky = skyAt(y);
  const out = {};
  for (const [key, value] of Object.entries(pal)) out[key] = mix(value, sky, k);
  return out;
}

// ------------------------------------------------------------------ the ranges
// The three shipped ranges, restated from DESERT_FAR / DESERT_MID / DESERT_RIDGE with
// the landscape scenery lift each is translated by (DESERT_SCENERY_LIFT 22, plus
// DESERT_LANDSCAPE_BACK_LIFT 12 for the two back layers). `ridgeYAt` reconstructs the
// tile offset exactly as the blit does, so these are the pixels the pack put there.
const FAR = { amp: 100, wl: 230, factor: 0.12, lift: -34, opts: { mesa: true } };
const MID = { amp: 78, wl: 200, factor: 0.22, lift: -34, opts: { dunes: true } };
const NEAR = { amp: 52, wl: 150, factor: 0.35, lift: -22, opts: { dunes: true } };
const periodOf = (L) => Math.max(16, Math.round(Math.PI * L.wl));
const crestY = (L, x, camX) => ridgeYAt(x, camX, GROUND_Y, L.amp, L.wl, L.factor, L.opts) + L.lift;
// Screen x of a point `px` into a layer's tile, repeated every `span` (a whole number
// of periods, so the copy lands on the same feature). Returns every copy in view.
function layerXs(L, px, camX, span, pad = 80) {
  const travel = camX * L.factor * ZOOM;
  const out = [];
  const first = Math.floor((travel - px - pad) / span);
  for (let k = first; k <= first + Math.ceil((W + pad * 2) / span) + 1; k++) {
    const x = px + k * span - travel;
    if (x > -pad && x < W + pad) out.push(x);
  }
  return out;
}
// Something with its own parallax factor that belongs to no ridge (the sky, a trestle).
function driftX(base, camX, factor, span, pad = 60) {
  const v = base - camX * factor * ZOOM;
  return ((((v + pad) % span) + span) % span) - pad;
}

// The roadside signs (DESERT_SPEED_SIGN_* / DESERT_ROAD_SIGNS) are the nearest plane of
// the backdrop. Their board and post, in landscape, so anything behind them can leave
// a hole where they stand. Kinds cycle speed, highway, autobahn, caution, exit.
const SIGN_KINDS = [
  { w: 62, top: -58, bottom: -26, scale: 0.88 },
  { w: 70, top: -55, bottom: -25, scale: 0.84 },
  { w: 32, top: -60, bottom: -12, scale: 0.80 },
  { w: 44, top: -57, bottom: -18, scale: 0.82 },
  { w: 70, top: -55, bottom: -25, scale: 0.84 },
];
function signHoles(camX) {
  const travel = camX * 0.42 * ZOOM;
  const spacing = 1120; const phase = 420;
  const holes = [];
  const first = Math.floor((travel - phase - 96) / spacing);
  for (let i = first; i <= first + 2; i++) {
    const x = phase + i * spacing - travel;
    if (x < -96 || x > W + 96) continue;
    const k = SIGN_KINDS[((i % 5) + 5) % 5];
    const baseY = 215 - 7 - 37 + 18;
    const half = (k.w * k.scale) / 2 + 1.2;
    const y0 = baseY + k.top * k.scale - 1.2;
    const y1 = baseY + k.bottom * k.scale + 1;
    holes.push([x - half, y0, half * 2, y1 - y0]);
    holes.push([x - 2.2, y1, 4.4, 215 - 7 + k.scale * 33 + 4 - y1]);
  }
  return holes;
}
// Clip to what is visible of a thing standing BEHIND the given crests: the sky side of
// the lowest of them at every x, minus the roadside signs. `crests` are functions of x;
// a thing standing ON a ridge passes that ridge with its bury depth added, so its feet
// are cut along the crest exactly as the shipped horizon props are.
function clipBehind(ctx, camX, x0, x1, crests, signs = true) {
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
  if (signs) clipSigns(ctx, camX, x0, x1);
}
// Just the roadside-sign holes, for the shipped landmarks that clip their own crests.
function clipSigns(ctx, camX, x0, x1) {
  const holes = signHoles(camX).filter(([hx, , hw]) => hx + hw > x0 && hx < x1);
  if (!holes.length) return;
  ctx.beginPath();
  ctx.rect(x0 - 4, -80, x1 - x0 + 8, H + 160);
  for (const [hx, hy, hw, hh] of holes) ctx.rect(hx, hy, hw, hh);
  ctx.clip('evenodd');
}
const nearCrest = (camX) => (x) => crestY(NEAR, x, camX);
const midCrest = (camX) => (x) => crestY(MID, x, camX);
const farCrest = (camX) => (x) => crestY(FAR, x, camX);
// The seat the shipped landmark painters take: each range's crest in screen px.
const seatFor = (camX) => ({ far: farCrest(camX), mid: midCrest(camX), near: nearCrest(camX) });

// ------------------------------------------------------------------ drawing
// A flat fill with no contour: the props module's own `plain`.
const fillPath = plain;
function strokePath(ctx, color, width, path, cap = 'round') {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.stroke();
}
// Props-language fill: flat colour with the shared soft hairline contour. `lw` is in
// world px — the hazards' own contour lands near 0.35 once their box is drawn.
function ink(ctx, fill, path, lw = 0.36, color = OUTLINE) {
  ctx.beginPath(); path(ctx);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}
const circle = (x, y, r) => (c) => c.arc(x, y, Math.max(0.01, r), 0, TAU);
const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
const box = (x, y, w, h, r = 0) => (c) => (r > 0 ? rr(c, x, y, w, h, r) : c.rect(x, y, w, h));
function poly(pts) {
  return (c) => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
}
// A soft radial light, for the few places light actually is.
function glow(ctx, x, y, r, hex, a) {
  if (a <= 0.003 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.45, rgba(hex, a * 0.42));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function contactShadow(ctx, x, y, rx, ry = 1.6, alpha = 0.34) {
  drawSoftContactShadow(ctx, x, y, rx, ry, { alpha });
}

// ================================================================== BACKGROUND

// ---------------------------------------------------------------- oil pumpjacks
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
};

function oilPumpjacks(ctx, t, camX) {
  ctx.save();
  const mid = midCrest(camX);
  const near = nearCrest(camX);
  // Two smaller rigs out on the big mesa cap, hazed like the water towers, pumping out
  // of step — the field reaching back into the distance. (Gallery only: the shipped
  // painter draws the two full-size rigs.)
  const farPeriod = periodOf(FAR);
  const far = farCrest(camX);
  for (const [at, s, rate, ph] of [[0.425, 0.52, 1.7, 2.1], [0.468, 0.46, 2.05, 4.4]]) {
    for (const x of layerXs(FAR, at * farPeriod, camX, farPeriod * 2, 40)) {
      const base = far(x) + 0.8;
      ctx.save();
      clipBehind(ctx, camX, x - 24, x + 24, [(xx) => far(xx) + 1, mid, near]);
      ctx.globalAlpha *= 0.86;
      ctx.translate(x, base);
      ctx.scale(s, s);
      pumpjack(ctx, -t * rate + ph, haze(PUMP_PAL, base - 10, 0.42));
      ctx.restore();
    }
  }
  // The shipped pair, centred between two middle-range summits (DESERT_DUNES[0], [2]).
  const midPeriod = periodOf(MID);
  const half = 0.32 * midPeriod;
  for (const c of layerXs(MID, 0.17 * midPeriod + half, camX, midPeriod * 2, 80 + half)) {
    ctx.save();
    clipSigns(ctx, camX, c - half - 80, c + half + 80);
    drawDesertPumpjacks(ctx, t, c, seatFor(camX));
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- rally buggy
// A rival desert buggy racing you along the middle dunes, throwing a rooster tail. It
// lives in the middle range's own ground coordinates, so it climbs and drops with the
// real crest and parallaxes with it; its height is SIMULATED on a fixed global clock —
// hugging the ground, popped into the air by its suspension as it crosses each summit,
// falling back under gravity — so it catches air off the dunes, and replaying any `t`
// gives the same frame (the window is long enough that every run has landed since).
const BUGGY = {
  body: '#d9462f', bodyLit: '#f7845a', bodyDark: '#8f2a22', white: '#f4efe6',
  cage: '#2d2a2c', tyre: '#2a2422', tread: '#4a403a', hub: '#c9c2b4', helmet: '#f1ede4',
  visor: '#1d2a3a', flag: '#ffb23a', lamp: '#fff4c8',
};
const BUGGY_V = 75;                 // ground px/s along the middle range: it OVERTAKES you
const BUGGY_G = 210;                // px/s²: heavy enough to hug a rolling dune...
const BUGGY_KICK = 30;               // ...until a summit pops it off the suspension
const BUGGY_CRESTS = [0.17, 0.52, 0.81];   // DESERT_DUNES summits
const BUGGY_STEP = 1 / 90;
function buggyS(t) { return 40 + BUGGY_V * t + 6 * Math.sin(t * 1.7); }
function buggyGround(s) { return ridgeYAt(s, 0, GROUND_Y, MID.amp, MID.wl, MID.factor, MID.opts) + MID.lift; }
// The vertical state on the global grid: returns [y at t, vy at t, grounded, samples]
// where samples[k] = { t, s, y, onGround } for the grid steps inside the window.
function buggyTrack(t, windowSec = 2.2) {
  const i0 = Math.floor((t - windowSec) / BUGGY_STEP);
  const i1 = Math.floor(t / BUGGY_STEP);
  let s = buggyS(i0 * BUGGY_STEP);
  let yg = buggyGround(s);
  let y = yg, vy = 0, onGround = true;
  const samples = [];
  const P = periodOf(MID);
  for (let i = i0 + 1; i <= i1 + 1; i++) {
    const ti = i <= i1 ? i * BUGGY_STEP : t;
    const dt = i <= i1 ? BUGGY_STEP : t - i1 * BUGGY_STEP;
    if (dt <= 0) continue;
    const sPrev = s;
    s = buggyS(ti);
    const g = buggyGround(s);
    // Crossing a summit while on the ground pops it into the air.
    if (onGround && BUGGY_CRESTS.some((c) => Math.floor((sPrev - c * P) / P) !== Math.floor((s - c * P) / P))) {
      vy -= BUGGY_KICK;
    }
    vy += BUGGY_G * dt;
    y += vy * dt;
    if (y >= g) {
      // Touchdown or still riding: stick to the ground and take its vertical speed.
      vy = Math.min(vy, (g - yg) / dt);
      y = g;
      onGround = true;
    } else {
      onGround = false;
    }
    yg = g;
    if (i <= i1) samples.push({ t: ti, s, y, onGround });
  }
  return { y, vy, onGround, samples };
}

function dustPuff(ctx, x, y, r, a, pal) {
  if (a <= 0.01 || r <= 0.05) return;
  fillPath(ctx, rgba(pal.shadow, a * 0.9), circle(x - r * 0.18, y + r * 0.16, r));
  fillPath(ctx, rgba(pal.base, a), circle(x, y, r * 0.92));
  fillPath(ctx, rgba(pal.lit, a * 0.95), circle(x + r * 0.26, y - r * 0.28, r * 0.58));
}
const DUST = { base: '#dcae7c', lit: '#f5d6a4', shadow: '#b78c68' };

function drawBuggy(ctx, wheelTurn, pitch, bob, flagT, pal) {
  // Facing RIGHT — it races the hero, it does not come at him. Origin between the
  // wheels on the ground.
  ctx.save();
  ctx.rotate(pitch);
  const wheels = [[-8.5, -3.6], [8.2, -3.6]];
  // Long-travel arms from hubs to chassis, behind the body.
  strokePath(ctx, pal.cage, 0.8, (c) => {
    for (const [wx, wy] of wheels) { c.moveTo(wx, wy); c.lineTo(wx * 0.45, -7.8 + bob); c.moveTo(wx, wy); c.lineTo(wx * 0.4, -5.6 + bob); }
  });
  ctx.save();
  ctx.translate(0, bob);
  // Spare tyre on the rear deck.
  fillPath(ctx, pal.tyre, oval(-10.6, -10.4, 2.3, 2.6));
  fillPath(ctx, pal.hub, oval(-10.4, -10.4, 0.9, 1.1));
  // Roll cage: a braced hoop over the cockpit, the driver's helmet inside it.
  strokePath(ctx, pal.cage, 0.95, (c) => {
    c.moveTo(-6.5, -9.2); c.lineTo(-4.6, -15.6); c.lineTo(2.2, -15.8); c.lineTo(5.6, -9.4);
    c.moveTo(-4.6, -15.6); c.lineTo(-1.2, -9.2); c.moveTo(2.2, -15.8); c.lineTo(-0.2, -12.6);
  });
  fillPath(ctx, pal.helmet, circle(-1.0, -12.6, 1.9));
  fillPath(ctx, pal.visor, (c) => { c.moveTo(-0.2, -13.6); c.lineTo(1.2, -13.2); c.lineTo(1.0, -11.9); c.lineTo(-0.3, -12.2); c.closePath(); });
  // Light bar on the cage roof.
  fillPath(ctx, pal.cage, box(-3.8, -17.2, 5.6, 1.4, 0.4));
  for (const lx of [-3.1, -1.4, 0.3]) fillPath(ctx, pal.lamp, box(lx, -16.9, 1.1, 0.9, 0.3));
  // Whip antenna and its flag, snapping in the wind of its own speed.
  strokePath(ctx, pal.cage, 0.35, (c) => { c.moveTo(-7.8, -9.5); c.quadraticCurveTo(-9.2, -16, -11.6, -22.5); });
  const fl = Math.sin(flagT * 17) * 0.8;
  fillPath(ctx, pal.flag, (c) => {
    c.moveTo(-11.6, -22.5); c.quadraticCurveTo(-14, -22.6 + fl, -16.4, -21.4 - fl * 0.6);
    c.lineTo(-11.4, -20.4); c.closePath();
  });
  // Body: a low wedge, nose down, lit along its top, dark underbelly and skid plate.
  fillPath(ctx, pal.bodyDark, poly([-12.2, -6.8, 11.8, -6.2, 12.8, -4.8, -11.8, -4.6]));
  fillPath(ctx, pal.body, poly([-12.4, -9.8, -7, -10.4, 3.6, -9.8, 12.6, -7.6, 12.8, -6.0, -12.2, -6.6]));
  fillPath(ctx, pal.bodyLit, poly([-12.4, -9.8, -7, -10.4, 3.6, -9.8, 12.6, -7.6, 12.2, -7.0, 3.4, -8.9, -7, -9.4, -12.2, -8.9]));
  // Race number roundel.
  fillPath(ctx, pal.white, circle(-4.6, -8.2, 1.5));
  strokePath(ctx, pal.bodyDark, 0.42, (c) => { c.moveTo(-5.2, -9.0); c.lineTo(-4.0, -9.0); c.lineTo(-4.9, -7.4); });
  // Headlamp at the nose.
  fillPath(ctx, pal.lamp, circle(12.0, -7.4, 0.7));
  ctx.restore();
  // Knobby tyres with turning hubs.
  for (const [wx, wy] of wheels) {
    fillPath(ctx, pal.tyre, circle(wx, wy, 3.7));
    for (let k = 0; k < 10; k++) {
      const a = wheelTurn + (k * TAU) / 10;
      fillPath(ctx, pal.tread, circle(wx + Math.cos(a) * 3.3, wy + Math.sin(a) * 3.3, 0.55));
    }
    fillPath(ctx, pal.hub, circle(wx, wy, 1.6));
    strokePath(ctx, pal.cage, 0.35, (c) => {
      for (let k = 0; k < 3; k++) { const a = wheelTurn + (k * TAU) / 3; c.moveTo(wx, wy); c.lineTo(wx + Math.cos(a) * 1.5, wy + Math.sin(a) * 1.5); }
    });
  }
  ctx.restore();
}

function rallyBuggy(ctx, t, camX) {
  ctx.save();
  const travel = camX * MID.factor * ZOOM;
  const near = nearCrest(camX);
  clipBehind(ctx, camX, -20, W + 20, [near]);
  const pal = haze(BUGGY, 150, 0.12);
  const dust = haze(DUST, 150, 0.1);
  const track = buggyTrack(t);
  const s = buggyS(t);
  // Wrapped on a whole number of dune periods, so the ground under the wrapped copy is
  // the ground the simulation rode.
  const span = periodOf(MID) * 2;
  const shift = Math.floor((s - travel + 120) / span) * span;
  const x = s - travel - shift;
  // Rooster tail: puffs born at the rear wheel on the grid, flung back and up, then
  // left hanging in the ground's own frame while the buggy drives on. Airborne frames
  // throw almost nothing — a wheel in the air kicks no dirt.
  const LIFE = 1.9;
  const n = track.samples.length;
  for (let k = 0; k < n; k++) {
    const smp = track.samples[k];
    const idx = Math.round(smp.t / BUGGY_STEP);
    if (idx % 3 !== 0) continue;
    const age = t - smp.t;
    if (age > LIFE || age < 0) continue;
    const strength = smp.onGround ? 1 : 0.1;
    const h1 = hash(idx), h2 = hash(idx + 7.3);
    const kx = 0.34;
    // Dirt leaves the tread nearly at rest over the ground and straight UP: the buggy
    // drives out from under its own plume, which is what a rooster tail is.
    const vx0 = -8 - h1 * 16;
    const vy0 = -52 - h2 * 34;
    const fly = kx * (1 - Math.exp(-age / kx));
    const px = smp.s - 12 + vx0 * fly - travel - shift - age * 4;
    const py = smp.y - 2 + vy0 * fly - age * 3;
    const r = 1.4 + age * 6.2 + h1 * 1.4;
    const a = strength * 0.46 * Math.min(1, age / 0.07) * (1 - age / LIFE) ** 1.2;
    dustPuff(ctx, px, py, r, a, dust);
  }
  // Body pitch follows the flight path: the ground slope while riding, nose-down as it
  // falls off a summit.
  const vs = BUGGY_V + 6 * 1.7 * Math.cos(t * 1.7);
  const pitch = Math.max(-0.5, Math.min(0.5, Math.atan2(track.vy, vs)));
  const bob = Math.sin(t * 23) * 0.3 * (track.onGround ? 1 : 0.2);
  ctx.save();
  ctx.translate(x, track.y + 0.8);
  ctx.scale(1.45, 1.45);
  drawBuggy(ctx, s / 3.7, pitch, bob, t, pal);
  ctx.restore();
  // Fresh spray right at the rear tyre, in front of the body.
  if (track.onGround) {
    for (let k = 0; k < 3; k++) {
      const ph = fract(t * 6 + k / 3);
      dustPuff(ctx, x - 13 - ph * 5, track.y - 2 - ph * 9, 1.5 + ph * 2.8, 0.6 * (1 - ph), dust);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- tumbleweeds
// Three tumbleweeds bowling along the near dunes on the wind, each on its own hop
// rhythm, spinning as they roll and kicking a puff of dust at every landing. They ride
// the near ridge's crest (sampled, so they climb and drop with it) and pass behind the
// roadside signs. The tangle below is the lane tumbleweed's; the shipped background
// ones draw from stylePacks/desertLandmarks.js.
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
// They roll WITH the wind — the same breeze that leans the shipped campfire smoke to the
// right — so they bowl along the ridge keeping pace with the run, the ground streaming
// under them. Where each starts and how fast it rolls; the art is the shipped painter's.
const WEED_RUNS = [{ s0: 250, v: 58 }, { s0: 420, v: 50 }, { s0: 60, v: 64 }];
function tumbleweedsBg(ctx, t, camX) {
  ctx.save();
  const travel = camX * NEAR.factor * ZOOM;
  const seat = seatFor(camX);
  clipSigns(ctx, camX, -30, W + 30);
  const SPAN = W + 140;
  WEED_RUNS.forEach((w, i) => {
    const s = w.s0 + w.v * t;
    const x = ((((s - travel + 70) % SPAN) + SPAN) % SPAN) - 70;
    drawDesertTumbleweed(ctx, t, x, seat, i, s);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- trestle freight
// A long freight rumbling across a timber trestle in the far distance, exhaust thrown
// back off the lead unit, headlight burning into the dusk. The trestle has its own
// parallax between the far mesas and the middle range, so the middle dunes pass in
// front of it and hide the legs; the deck and the train clear most of their tops.
const TRAIN_FACTOR = 0.17;
const DECK_Y = 132;
const TRAIN_SCALE = 1.22;
const TRAIN_SPEED = 30;             // px/s along the trestle, leftward
const TRESTLE = { timber: '#5c4f4a', timberLit: '#b09880', timberDark: '#3e3532', rail: '#2e2826' };
const TRAIN_CARS = [
  { kind: 'loco', len: 25 }, { kind: 'loco2', len: 23 }, { kind: 'box', len: 21, col: '#8e4b3a' },
  { kind: 'tank', len: 19, col: '#34363d' }, { kind: 'hopper', len: 19, col: '#8b8677' },
  { kind: 'box', len: 21, col: '#a0663e' }, { kind: 'flat', len: 23, col: '#4d6b8c', col2: '#c7763b' },
  { kind: 'box', len: 21, col: '#6f4a3c' }, { kind: 'tank', len: 19, col: '#d9d4c8' },
  { kind: 'hopper', len: 19, col: '#7d6a58' }, { kind: 'box', len: 21, col: '#8e4b3a' },
  { kind: 'caboose', len: 16, col: '#b8392c' },
];
const LOCO = {
  body: '#3d424a', bodyLit: '#9aa3ae', stripe: '#f0b43c', nose: '#e0662a', noseLit: '#ff9a55',
  glass: '#ffe09a', dark: '#23262b',
};

// One car in the train's own frame: x from the car's left end, y up from the deck.
function trainCar(ctx, car, x, pal, loco) {
  const y = -1.4;                   // top of rail
  const L = car.len;
  const truck = (tx) => {
    fillPath(ctx, pal.under, box(tx - 2.7, y - 2.3, 5.4, 1.3));
    fillPath(ctx, pal.wheel, circle(tx - 1.45, y - 0.95, 1.0));
    fillPath(ctx, pal.wheel, circle(tx + 1.45, y - 0.95, 1.0));
    fillPath(ctx, pal.hub, circle(tx - 1.45, y - 0.95, 0.35));
    fillPath(ctx, pal.hub, circle(tx + 1.45, y - 0.95, 0.35));
  };
  truck(x + 3.5); truck(x + L - 3.5);
  const top = y - (car.kind === 'flat' ? 3.4 : car.kind === 'caboose' ? 9.6 : car.kind.startsWith('loco') ? 10.8 : 9.2);
  if (car.kind === 'loco' || car.kind === 'loco2') {
    const lead = car.kind === 'loco';
    const hood0 = lead ? 8.2 : 1;
    // Frame and fuel tank under the walkway.
    fillPath(ctx, loco.dark, box(x + 0.3, y - 3.4, L - 0.6, 1.2));
    fillPath(ctx, loco.dark, box(x + 7, y - 2.4, L - 14, 1.4, 0.6));
    // Long hood, lit along its roof, with radiator louvres at the back.
    fillPath(ctx, loco.body, box(x + hood0, top + 2.6, L - hood0 - 0.8, y - 3.4 - top - 2.6));
    fillPath(ctx, loco.bodyLit, box(x + hood0, top + 2.6, L - hood0 - 0.8, 0.9));
    for (let k = 0; k < 4; k++) fillPath(ctx, rgba('#000000', 0.28), box(x + L - 7.4 + k * 1.5, top + 4.2, 0.7, 3.2));
    fillPath(ctx, loco.stripe, box(x + 0.4, y - 4.9, L - 0.8, 1.0));
    // Exhaust stack.
    fillPath(ctx, loco.dark, box(x + (lead ? 13 : 7), top + 1.4, 2, 1.4));
    if (lead) {
      // Wide safety-cab nose in the road's own orange, windscreen lit by the sunset.
      fillPath(ctx, loco.nose, poly([x + 0.2, y - 3.4, x + 0.2, top + 4.6, x + 2.2, top + 3.8, x + 2.6, top, x + 8.8, top, x + 8.8, y - 3.4]));
      fillPath(ctx, loco.noseLit, poly([x + 2.6, top, x + 8.8, top, x + 8.8, top + 0.9, x + 2.5, top + 0.9]));
      fillPath(ctx, loco.noseLit, poly([x + 0.2, top + 4.6, x + 2.2, top + 3.8, x + 2.2, top + 4.6, x + 0.2, top + 5.4]));
      fillPath(ctx, loco.glass, box(x + 3.0, top + 1.2, 2.3, 2.0));
      fillPath(ctx, loco.glass, box(x + 5.9, top + 1.2, 2.0, 2.0));
      fillPath(ctx, rgba('#ffffff', 0.6), poly([x + 3.2, top + 1.2, x + 4.2, top + 1.2, x + 3.2, top + 2.3]));
      fillPath(ctx, loco.stripe, poly([x + 0.2, y - 4.9, x + 8.8, y - 4.9, x + 8.8, y - 3.9, x + 0.2, y - 3.9]));
    }
    return;
  }
  const col = mix(car.col, pal.sky, pal.k);
  const lit = mix(col, '#fff2d8', 0.38);
  const dark = mix(col, '#1a1210', 0.38);
  if (car.kind === 'box' || car.kind === 'caboose') {
    fillPath(ctx, col, box(x + 0.6, top, L - 1.2, y - 2.3 - top));
    fillPath(ctx, lit, box(x + 0.6, top, L - 1.2, 0.9));
    fillPath(ctx, dark, box(x + 0.6, y - 3.3, L - 1.2, 1));
    if (car.kind === 'box') {
      fillPath(ctx, dark, box(x + L / 2 - 2.7, top + 1.6, 5.4, y - 3.5 - top - 1.6));
      fillPath(ctx, lit, box(x + L / 2 - 2.7, top + 1.6, 0.5, y - 3.5 - top - 1.6));
      for (let k = 1; k < 7; k++) if (Math.abs(k - 3.5) > 1) fillPath(ctx, rgba('#000000', 0.13), box(x + (L * k) / 7, top + 1, 0.4, y - 3.5 - top - 1));
    } else {
      // Caboose cupola and its lit windows.
      fillPath(ctx, col, box(x + 5, top - 2.6, 6, 2.8));
      fillPath(ctx, lit, box(x + 5, top - 2.6, 6, 0.8));
      for (const wx of [6, 8.6]) fillPath(ctx, pal.glass, box(x + wx, top - 1.6, 1.4, 1.1));
      for (const wx of [3, L - 4.6]) fillPath(ctx, pal.glass, box(x + wx, top + 2, 1.6, 1.6));
    }
  } else if (car.kind === 'tank') {
    fillPath(ctx, col, box(x + 0.6, top + 1.2, L - 1.2, y - 2.7 - top - 1.2, 2.6));
    fillPath(ctx, lit, box(x + 2, top + 1.7, L - 4, 1.2, 0.5));
    fillPath(ctx, dark, box(x + L / 2 - 1.2, top, 2.4, 1.5));
    fillPath(ctx, rgba('#000000', 0.2), box(x + 1, y - 4.3, L - 2, 1.2));
  } else if (car.kind === 'hopper') {
    fillPath(ctx, col, poly([x + 0.6, top, x + L - 0.6, top, x + L - 0.6, y - 5, x + L - 4, y - 2.5, x + 4, y - 2.5, x + 0.6, y - 5]));
    fillPath(ctx, lit, box(x + 0.6, top, L - 1.2, 0.9));
    for (let k = 1; k < 6; k++) fillPath(ctx, dark, box(x + (L * k) / 6 - 0.3, top + 0.9, 0.6, y - 5.4 - top));
  } else if (car.kind === 'flat') {
    fillPath(ctx, dark, box(x + 0.4, y - 3.5, L - 0.8, 1.2));
    const c2 = mix(car.col2, pal.sky, pal.k);
    for (const [cx0, cc] of [[1, col], [11.8, c2]]) {
      fillPath(ctx, cc, box(x + cx0, y - 10.9, 10.2, 7.4));
      fillPath(ctx, mix(cc, '#fff2d8', 0.38), box(x + cx0, y - 10.9, 10.2, 0.8));
      for (let k = 1; k < 5; k++) fillPath(ctx, rgba('#000000', 0.15), box(x + cx0 + k * 2, y - 10, 0.35, 6));
    }
  }
}

function trestleTrain(ctx, t, camX) {
  ctx.save();
  const mid = midCrest(camX);
  const near = nearCrest(camX);
  clipBehind(ctx, camX, -10, W + 10, [mid, near]);
  const sky = skyAt(DECK_Y);
  const pal = haze(TRESTLE, DECK_Y, 0.3);
  const carPal = {
    under: mix('#2a2422', sky, 0.25), wheel: mix('#1c1816', sky, 0.25), hub: mix('#8a8078', sky, 0.25),
    glass: '#ffd98a', sky, k: 0.22,
  };
  const loco = haze(LOCO, DECK_Y, 0.16);
  const travel = camX * TRAIN_FACTOR * ZOOM;
  // Trestle bents: splayed timber legs, a centre post, braced near the top. The legs
  // fade out into the distance as they drop — the timber itself thins, rather than a
  // wash laid over the horizon (the pack cut its heat haze for arguing with the road).
  const bent = 36;
  const off = ((travel % bent) + bent) % bent;
  const foot = 206;
  const fade = (hex, a) => {
    const g = ctx.createLinearGradient(0, DECK_Y, 0, 188);
    g.addColorStop(0, rgba(hex, a));
    g.addColorStop(0.55, rgba(hex, a * 0.55));
    g.addColorStop(1, rgba(hex, 0));
    return g;
  };
  const legDark = fade(pal.timberDark, 1), legLit = fade(pal.timberLit, 1), brace = fade(pal.timber, 1);
  for (let bx = -off - bent; bx < W + bent; bx += bent) {
    strokePath(ctx, legDark, 1.3, (c) => {
      c.moveTo(bx - 2.2, DECK_Y + 2); c.lineTo(bx - 9, foot);
      c.moveTo(bx + 2.2, DECK_Y + 2); c.lineTo(bx + 9, foot);
    }, 'butt');
    strokePath(ctx, legDark, 0.8, (c) => { c.moveTo(bx, DECK_Y + 2); c.lineTo(bx, foot); }, 'butt');
    strokePath(ctx, legLit, 0.4, (c) => { c.moveTo(bx + 2.6, DECK_Y + 2.4); c.lineTo(bx + 9.4, foot); }, 'butt');
    strokePath(ctx, brace, 0.55, (c) => {
      const w1 = 2.2 + 6.8 * (14 / (foot - DECK_Y));
      const w2 = 2.2 + 6.8 * (30 / (foot - DECK_Y));
      c.moveTo(bx - w1, DECK_Y + 14); c.lineTo(bx + w1, DECK_Y + 14);
      c.moveTo(bx - w2, DECK_Y + 30); c.lineTo(bx + w2, DECK_Y + 30);
      c.moveTo(bx - w1, DECK_Y + 14); c.lineTo(bx + w2, DECK_Y + 30);
      c.moveTo(bx + w1, DECK_Y + 14); c.lineTo(bx - w2, DECK_Y + 30);
    });
  }
  // Deck: stringer, lit top, rail.
  fillPath(ctx, pal.timberDark, box(-10, DECK_Y, W + 20, 3.4));
  fillPath(ctx, pal.timberLit, box(-10, DECK_Y - 0.1, W + 20, 0.8));
  fillPath(ctx, pal.rail, box(-10, DECK_Y - 1.4, W + 20, 1.3));
  // The train, rolling LEFT at its own pace on top of the trestle's parallax.
  // Wrapped only once the whole consist (about 325 px) is off the left edge.
  const SPAN = 1200;
  const head = ((((420 - TRAIN_SPEED * t - travel) + 380) % SPAN) + SPAN) % SPAN - 380;
  ctx.save();
  ctx.translate(head, DECK_Y);
  ctx.scale(TRAIN_SCALE, TRAIN_SCALE);
  let cx = 0;
  for (const car of TRAIN_CARS) {
    const sx = head + cx * TRAIN_SCALE;
    if (sx < W + 30 && sx + car.len * TRAIN_SCALE > -30) {
      ctx.save();
      ctx.translate(0, Math.sin(t * 19 + cx * 0.7) * 0.12);
      trainCar(ctx, car, cx, carPal, loco);
      ctx.restore();
    }
    cx += car.len + 1.6;
  }
  // Exhaust from the lead unit's stack: puffs born on a fixed grid where the stack was,
  // then left behind — drifting back and up — as the train pulls away under them.
  const EX = 0.07, LIFE = 2.6;
  const iNow = Math.floor(t / EX);
  const ex = haze({ base: '#77726f', lit: '#b9b0a6', shadow: '#55504f' }, DECK_Y - 20, 0.34);
  for (let i = iNow; i > iNow - LIFE / EX; i--) {
    const age = t - i * EX;
    if (age < 0) continue;
    const px = 14 + (TRAIN_SPEED / TRAIN_SCALE) * age + age * 5 + Math.sin(i * 1.7) * 0.5;
    const py = -13.2 - age * 7.5 - age * age * 1.1;
    const r = 0.9 + age * 2.1;
    const a = 0.46 * Math.min(1, age / 0.1) * (1 - age / LIFE) ** 1.6;
    dustPuff(ctx, px, py, r, a, ex);
  }
  // Headlight: a hot core and a long faint cone down the line ahead; ditch lights
  // trading flashes below it.
  const hy = -9.4;
  glow(ctx, 0.3, hy, 8, '#fff1c4', 0.6);
  const cone = ctx.createLinearGradient(0, 0, -52, 0);
  cone.addColorStop(0, 'rgba(255,241,196,0.34)');
  cone.addColorStop(1, 'rgba(255,241,196,0)');
  ctx.fillStyle = cone;
  ctx.beginPath(); ctx.moveTo(0, hy - 0.6); ctx.lineTo(-52, hy - 5.5); ctx.lineTo(-52, hy + 4.5); ctx.lineTo(0, hy + 0.8); ctx.closePath(); ctx.fill();
  fillPath(ctx, '#fffbe8', circle(0.3, hy, 0.75));
  const flash = Math.sin(t * 9) > 0;
  for (const [dx, on] of [[0.5, flash], [0.9, !flash]]) {
    fillPath(ctx, on ? '#fffbe8' : '#b89868', circle(dx, -4.2, 0.45));
    if (on) glow(ctx, dx, -4.2, 3.6, '#fff1c4', 0.55);
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- sonic boom
// A jet crosses the sky low and fast. As it breaks the sound barrier a vapour cone
// blooms round its wings, a shock ring rolls out from the spot and the contrail it
// drags behind spreads and wanders as it ages. Periodic — a flypast, not a fixture.
const JET_PERIOD = 7.2;
function jetBoom(ctx, t, camX) {
  // One pass every JET_PERIOD seconds, entering at x -40 and leaving past W + 30.
  const x0 = -40, x1 = W + 30;
  const tau = ((t + 0.25) % JET_PERIOD + JET_PERIOD) % JET_PERIOD;
  drawDesertJet(ctx, tau / ((x1 - x0) / 132 + 3.4), x0, x1, 104);
}

// ---------------------------------------------------------------- rocket launch
// A launch complex on the big mesa's flat cap: gantry, pad, a rocket venting on the
// stand — then ignition, a ground cloud rolling across the cap, and the climb, pitching
// over downrange with the column of smoke it leaves standing in the dusk. One launch
// every twelve seconds; the column outlives the rocket and drifts off on the wind.
const LAUNCH_PERIOD = 12;
const LAUNCH_T0 = 0.5;              // liftoff, in cycle time
const ROCKET = {
  white: '#f2eee6', lit: '#fffaf0', shade: '#bdb6aa', band: '#2f3033', nose: '#d8432f',
  fin: '#c23a2a', finDark: '#8a2a20', nozzle: '#4a4744',
};
const SMOKE = { base: '#ece4d8', lit: '#fff8ea', shadow: '#b9ada0' };
function rocketAlt(tau) { return tau < LAUNCH_T0 ? 0 : 0.5 * 17 * (tau - LAUNCH_T0) ** 2; }
function rocketDx(a) { return 0.0024 * a * a; }
function drawRocket(ctx, pal) {
  // Base (nozzle exit) at the origin, pointing up.
  fillPath(ctx, pal.nozzle, poly([-1.6, 0, 1.6, 0, 1.2, -1.6, -1.2, -1.6]));
  // Fins: two in profile, one edge-on.
  fillPath(ctx, pal.finDark, poly([-2.4, -1.4, -5.2, 0.4, -5.2, -1.2, -2.4, -6.4]));
  fillPath(ctx, pal.fin, poly([2.4, -1.4, 5.2, 0.4, 5.2, -1.2, 2.4, -6.4]));
  // Body: shaded left third, lit right third — a cylinder in three flat faces.
  fillPath(ctx, pal.white, box(-2.5, -24, 5, 22.6));
  fillPath(ctx, pal.shade, box(-2.5, -24, 1.5, 22.6));
  fillPath(ctx, pal.lit, box(1.1, -24, 1.4, 22.6));
  fillPath(ctx, pal.band, box(-2.5, -9.2, 5, 1.6));
  fillPath(ctx, pal.band, box(-2.5, -19.4, 5, 0.9));
  fillPath(ctx, pal.band, box(-0.6, -16.6, 1.2, 1.2));
  // Ogive nose.
  fillPath(ctx, pal.nose, (c) => { c.moveTo(-2.5, -24); c.quadraticCurveTo(-2.4, -29.6, 0, -32.4); c.quadraticCurveTo(2.4, -29.6, 2.5, -24); c.closePath(); });
  fillPath(ctx, mix(pal.nose, '#ffffff', 0.3), (c) => { c.moveTo(1.1, -24); c.quadraticCurveTo(1.6, -28.6, 0, -32.4); c.quadraticCurveTo(2.4, -29.6, 2.5, -24); c.closePath(); });
  fillPath(ctx, pal.band, box(-0.4, -34.6, 0.8, 2.4));
}
function rocketFlame(ctx, len, flick) {
  glow(ctx, 0, 3, 7 + len * 0.3, '#ffb347', 0.55);
  fillPath(ctx, '#ff7a2a', (c) => { c.moveTo(-1.7, 0); c.quadraticCurveTo(-1.9, len * 0.5, 0, len * (1 + flick * 0.12)); c.quadraticCurveTo(1.9, len * 0.5, 1.7, 0); c.closePath(); });
  fillPath(ctx, '#ffd46a', (c) => { c.moveTo(-1.2, 0); c.quadraticCurveTo(-1.2, len * 0.4, 0, len * (0.72 - flick * 0.08)); c.quadraticCurveTo(1.2, len * 0.4, 1.2, 0); c.closePath(); });
  fillPath(ctx, '#fffbe8', (c) => { c.moveTo(-0.7, 0); c.quadraticCurveTo(0, len * 0.3, 0, len * 0.42); c.quadraticCurveTo(0, len * 0.3, 0.7, 0); c.closePath(); });
}
function rocketLaunch(ctx, t, camX) {
  ctx.save();
  const far = farCrest(camX);
  const mid = midCrest(camX);
  const near = nearCrest(camX);
  const P = periodOf(FAR);
  const tau = (((t + 0.3) % LAUNCH_PERIOD) + LAUNCH_PERIOD) % LAUNCH_PERIOD;
  const rocketPal = haze(ROCKET, 90, 0.2);
  const tower = haze({ ink: TOWER_INK, dark: TOWER_DARK, light: TOWER_LIGHT }, 80, 0.12);
  for (const x of layerXs(FAR, 0.5 * P - 62, camX, 2 * P, 120)) {
    const base = far(x);
    const smoke = haze(SMOKE, base - 30, 0.18);
    // Where the rocket is (and was): its tail in screen space at cycle time `tt`.
    const tail = (tt) => { const a = rocketAlt(tt); return [x + rocketDx(a), base - 3 - a]; };
    // ------------------------------------------------ ground-bound: pad, gantry, cloud
    ctx.save();
    clipBehind(ctx, camX, x - 90, x + 90, [(xx) => far(xx) + 1, mid, near]);
    // Pad and flame trench.
    fillPath(ctx, tower.dark, box(x - 13, base - 3.2, 26, 4.4));
    fillPath(ctx, tower.light, box(x - 13, base - 3.2, 26, 0.8));
    fillPath(ctx, mix(tower.dark, '#000000', 0.3), box(x - 3, base - 2.2, 6, 3));
    // Gantry: a braced lattice with a beacon, its swing arm folding away at ignition.
    const gx = x - 8.6;
    strokePath(ctx, tower.dark, 0.9, (c) => {
      c.moveTo(gx - 2.4, base - 3); c.lineTo(gx - 2.4, base - 36);
      c.moveTo(gx + 2.4, base - 3); c.lineTo(gx + 2.4, base - 36);
      for (let yy = base - 3; yy > base - 36; yy -= 4.6) {
        c.moveTo(gx - 2.4, yy); c.lineTo(gx + 2.4, yy - 4.6);
        c.moveTo(gx + 2.4, yy); c.lineTo(gx - 2.4, yy - 4.6);
      }
    }, 'butt');
    fillPath(ctx, tower.ink, box(gx - 3.4, base - 38, 6.8, 2.2));
    const arm = tau < 0.2 || tau > 9.4 ? 0 : smooth(0.2, 0.45, tau) * (1 - smooth(9.0, 9.4, tau));
    ctx.save();
    ctx.translate(gx + 2.4, base - 25);
    ctx.rotate(-arm * 1.25);
    fillPath(ctx, tower.ink, box(0, -0.8, 5.2, 1.6));
    ctx.restore();
    const beacon = fract(t * 0.8) < 0.18;
    fillPath(ctx, beacon ? '#ff5a3c' : '#7a3a30', circle(gx, base - 39, 0.9));
    if (beacon) glow(ctx, gx, base - 39, 5, '#ff5a3c', 0.6);
    // Ground cloud: billowing out both ways across the cap after ignition.
    if (tau > LAUNCH_T0 - 0.2 && tau < LAUNCH_T0 + 9.5) {
      const EMIT = 0.05;
      for (let te = LAUNCH_T0 - 0.15; te < Math.min(tau, LAUNCH_T0 + 1.6); te += EMIT) {
        const age = tau - te;
        const i = Math.round(te / EMIT);
        const dir = i % 2 ? 1 : -1;
        const sp = 16 + hash(i) * 14;
        const k = 0.9;
        const reach = sp * k * (1 - Math.exp(-age / k));
        const r = 2.4 + age * 1.9 + hash(i + 3) * 1.5;
        const a = 0.9 * Math.min(1, age / 0.12) * Math.max(0, 1 - age / 7.5) ** 1.3;
        dustPuff(ctx, x + dir * (3 + reach), base - 2.4 - age * 1.4 - r * 0.35, r, a, smoke);
      }
    }
    ctx.restore();
    // ------------------------------------------------ the column and the rocket
    ctx.save();
    clipBehind(ctx, camX, x - 120, x + 200, [(xx) => far(xx) + 1, mid, near]);
    if (tau > LAUNCH_T0) {
      const EMIT = 0.06;
      const LIFE = 8;
      const t1 = Math.min(tau, LAUNCH_T0 + 5.2);
      for (let te = LAUNCH_T0 + 0.05; te < t1; te += EMIT) {
        const age = tau - te;
        if (age > LIFE) continue;
        const [px, py] = tail(te);
        const i = Math.round(te / EMIT);
        const r = 1.5 + age * 1.6 + hash(i) * 0.8 + Math.min(4, rocketAlt(te) * 0.02);
        const a = 0.82 * Math.min(1, age / 0.15) * (1 - age / LIFE) ** 1.1;
        const wob = Math.sin(i * 1.3) * (0.4 + age * 0.5);
        dustPuff(ctx, px + age * 3.2 + wob, py + 2 - age * 1.1, r, a, smoke);
      }
    }
    // The rocket: on the stand venting, or climbing on its flame.
    const standby = tau < LAUNCH_T0 || tau > 9.4;
    const a = rocketAlt(tau);
    if (standby || base - a > -40) {
      const [rx, ry] = tail(tau);
      const tilt = Math.atan(0.0048 * a);
      const fadeIn = tau > 9.4 ? smooth(9.4, 9.9, tau) : 1;
      ctx.save();
      ctx.globalAlpha *= fadeIn;
      ctx.translate(rx, ry);
      ctx.rotate(tilt);
      if (!standby || tau > LAUNCH_T0 - 0.12) {
        const len = 7 + Math.min(6, a * 0.08) + (tau < LAUNCH_T0 + 0.6 ? 4 : 0);
        rocketFlame(ctx, len, Math.sin(t * 47) * 0.5 + Math.sin(t * 31) * 0.5);
      }
      drawRocket(ctx, rocketPal);
      ctx.restore();
      if (standby) {
        // Oxygen venting off the stage: wisps curling away on the breeze.
        for (let k = 0; k < 5; k++) {
          const ph = fract(t * 0.7 + k / 5);
          dustPuff(ctx, rx + 3 + ph * 9, ry - 14 - ph * 4 + Math.sin(ph * 5 + k) * 0.8, 0.8 + ph * 2.6, 0.55 * (1 - ph) * fadeIn, smoke);
        }
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- neon lettering
// Tube letters for the roadside signs, on a 3x5 cell. Neon is a LINE, so the letters
// are strokes — a bright core, the coloured tube, and the light it throws — and a dead
// tube still shows as dim glass when a letter drops out.
const NEON_GLYPHS = {
  A: 'M0 5 L1.5 0 L3 5 M0.55 3.2 L2.45 3.2',
  C: 'M3 0.9 Q2.4 0 1.5 0 Q0 0 0 2.5 Q0 5 1.5 5 Q2.4 5 3 4.1',
  D: 'M0 0 L0 5 L1.4 5 Q3 5 3 2.5 Q3 0 1.4 0 Z',
  E: 'M3 0 L0 0 L0 5 L3 5 M0 2.5 L2.2 2.5',
  I: 'M1.5 0 L1.5 5 M0.6 0 L2.4 0 M0.6 5 L2.4 5',
  L: 'M0 0 L0 5 L3 5',
  M: 'M0 5 L0 0 L1.5 3 L3 0 L3 5',
  N: 'M0 5 L0 0 L3 5 L3 0',
  O: 'M1.5 0 Q3 0 3 2.5 Q3 5 1.5 5 Q0 5 0 2.5 Q0 0 1.5 0 Z',
  P: 'M0 5 L0 0 L2 0 Q3 0 3 1.3 Q3 2.6 2 2.6 L0 2.6',
  R: 'M0 5 L0 0 L2 0 Q3 0 3 1.3 Q3 2.6 2 2.6 L0 2.6 M1.3 2.6 L3 5',
  T: 'M0 0 L3 0 M1.5 0 L1.5 5',
  V: 'M0 0 L1.5 5 L3 0',
  Y: 'M0 0 L1.5 2.6 L3 0 M1.5 2.6 L1.5 5',
};
function glyphPath(c, ch, x, y, s) {
  const src = NEON_GLYPHS[ch];
  if (!src) return;
  const tok = src.split(' ');
  for (let i = 0; i < tok.length; i++) {
    const cmd = tok[i][0];
    const num = (k) => Number(k === 0 ? tok[i].slice(1) : tok[i + k]);
    if (cmd === 'M') { c.moveTo(x + num(0) * s, y + num(1) * s); i += 1; }
    else if (cmd === 'L') { c.lineTo(x + num(0) * s, y + num(1) * s); i += 1; }
    else if (cmd === 'Q') { c.quadraticCurveTo(x + num(0) * s, y + num(1) * s, x + num(2) * s, y + num(3) * s); i += 3; }
    else if (cmd === 'Z') c.closePath();
  }
}
// `on` is 0..1 per letter (a function of the index), so single letters can buzz out.
function neonWord(ctx, word, x, y, cap, color, on = () => 1, gap = 0.35) {
  const s = cap / 5;
  const adv = (3 + gap * 5) * s;
  const lw = Math.max(0.5, cap * 0.15);
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch === ' ') continue;
    const lit = on(i);
    const lx = x + i * adv;
    const path = (c) => glyphPath(c, ch, lx, y, s);
    if (lit > 0.02) {
      strokePath(ctx, rgba(color, 0.22 * lit), lw * 3.6, path);
      strokePath(ctx, rgba(color, 0.35 * lit), lw * 2, path);
    }
    strokePath(ctx, lit > 0.02 ? mix(mix(color, '#3a2430', 0.6), color, lit) : mix(color, '#3a2430', 0.62), lw, path);
    if (lit > 0.02) strokePath(ctx, rgba(mix(color, '#ffffff', 0.72), lit), lw * 0.42, path);
  }
  return word.length * adv - gap * 5 * s;
}
const neonWidth = (word, cap, gap = 0.35) => word.length * (3 + gap * 5) * (cap / 5) - gap * cap;

// ---------------------------------------------------------------- diner & motel
// A streamline diner on the hill by the highway: stainless flanks, a lit window band
// with the counter crowd in silhouette, DINER in pink tubes on the roof — and the
// roadside sign stack beside it: EAT over a bulb-chased arrow, MOTEL, and a VACANCY
// panel whose NO keeps buzzing in and out.
const DINER = {
  steel: '#b9c2c8', steelLit: '#eef2f4', steelDark: '#7c868e', flute: '#98a2aa', skirt: '#4f5961',
  enamel: '#c83a3a', enamelLit: '#ee6a5c', roof: '#7b858d', roofLit: '#d6dde2', glass: '#ffd98a',
  glassHot: '#fff0c2', mullion: '#50565d', crowd: '#6b4a3a', pole: '#3d4248', board: '#f3e6c6',
  boardEdge: '#2f8f8a', arrow: '#d23f2f', bulb: '#ffe28a', bulbOff: '#9a7a4a',
  gravel: '#b7906c', gravelLit: '#dcb88c', gravelDark: '#94705a',
};
// The near ridge's second summit (DESERT_DUNES[1]): the roadside hill's landmark slot,
// levelled with a graded lot. Where the pack happens to plant a saguaro on that
// summit, the landmark simply stands in front of it.
function hillSlot(camX) {
  const P = periodOf(NEAR);
  return layerXs(NEAR, 0.52 * P, camX, P * 3, 150);
}
function gravelPad(ctx, pal, halfW) {
  fillPath(ctx, pal.gravel, poly([-halfW, 0, halfW, 0, halfW + 22, 30, -halfW - 22, 30]));
  fillPath(ctx, pal.gravelDark, poly([-halfW, 0, -halfW + 5, 0, -halfW - 12, 30, -halfW - 22, 30]));
  fillPath(ctx, pal.gravelLit, box(-halfW, -0.3, halfW * 2, 0.9));
  for (let i = 0; i < 26; i++) {
    const gx = -halfW - 10 + hash(i + 11) * (halfW * 2 + 20), gy = 1.2 + hash(i + 57) * 12;
    fillPath(ctx, i % 3 ? pal.gravelDark : pal.gravelLit, box(gx, gy, 1.2, 0.6));
  }
}
function roadsideDiner(ctx, t, camX) {
  ctx.save();
  const near = nearCrest(camX);
  const pal = haze(DINER, 170, 0.05);
  for (const x0 of hillSlot(camX)) {
    const y0 = near(x0) - 0.3;
    ctx.save();
    clipBehind(ctx, camX, x0 - 130, x0 + 130, [(x) => near(x) + 1.2]);
    ctx.translate(x0, y0);
    ctx.scale(1.18, 1.18);
    gravelPad(ctx, pal, 50);
    // Warm light spilling from the windows onto the lot.
    glow(ctx, -8, 1, 34, '#ffc870', 0.28);
    // ---- the diner car
    const L = -36, R = 20;
    fillPath(ctx, pal.skirt, box(L + 2, -4, R - L - 4, 4));
    // Stainless lower panel, horizontal fluting.
    fillPath(ctx, pal.steel, box(L, -10.5, R - L, 6.5, 1.2));
    for (let y = -9.6; y < -4.4; y += 1.3) fillPath(ctx, pal.flute, box(L + 0.6, y, R - L - 1.2, 0.5));
    // Enamel belt and the window band above it.
    fillPath(ctx, pal.enamel, box(L, -12, R - L, 1.6));
    fillPath(ctx, pal.enamelLit, box(L, -12, R - L, 0.5));
    fillPath(ctx, pal.mullion, box(L + 1, -18.4, R - L - 2, 6.4));
    const winW = (R - L - 4) / 10;
    for (let k = 0; k < 10; k++) {
      const wx = L + 2 + k * winW;
      fillPath(ctx, pal.glass, box(wx + 0.35, -17.9, winW - 0.7, 5.5, 0.5));
      fillPath(ctx, pal.glassHot, box(wx + 0.35, -17.9, winW - 0.7, 1.6, 0.5));
    }
    // The counter crowd: heads and shoulders in the windows, a waitress on her rounds.
    const waitX = L + 8 + (0.5 + 0.5 * Math.sin(t * 0.9)) * (R - L - 16);
    for (const [hx, big] of [[L + 6.2, 1], [L + 15.5, 0.9], [L + 27, 1.05], [L + 38, 0.95], [waitX, 1.1]]) {
      fillPath(ctx, pal.crowd, (c) => { c.arc(hx, -15.2 + (1 - big) * 2, 1.25 * big, 0, TAU); });
      fillPath(ctx, pal.crowd, box(hx - 2 * big, -13.8, 4 * big, 1.6, 0.8));
    }
    fillPath(ctx, rgba('#ffffff', 0.9), box(waitX - 1.1, -16.9, 2.2, 0.6));   // her cap
    // Upper band, roof and its lit crown; rounded streamline end at the left.
    fillPath(ctx, pal.steelLit, box(L, -20, R - L, 1.6));
    fillPath(ctx, pal.enamel, box(L, -19, R - L, 0.5));
    fillPath(ctx, pal.roof, (c) => { c.moveTo(L - 2, -20); c.quadraticCurveTo((L + R) / 2, -24.6, R + 2, -20); c.closePath(); });
    fillPath(ctx, pal.roofLit, (c) => { c.moveTo(L + 2, -21.2); c.quadraticCurveTo((L + R) / 2, -24.6, R - 2, -21.2); c.quadraticCurveTo((L + R) / 2, -23.6, L + 2, -21.2); c.closePath(); });
    fillPath(ctx, pal.steelDark, (c) => { c.moveTo(L, -20); c.quadraticCurveTo(L - 4.6, -18, L - 3.6, -12); c.lineTo(L - 3.6, -4); c.lineTo(L + 1, -4); c.lineTo(L + 1, -20); c.closePath(); });
    fillPath(ctx, pal.glass, (c) => { c.moveTo(L - 0.4, -18); c.quadraticCurveTo(L - 3, -17, L - 2.6, -12.4); c.lineTo(L + 0.8, -12.4); c.lineTo(L + 0.8, -18); c.closePath(); });
    // Door and its OPEN sign.
    fillPath(ctx, pal.steelDark, box(R - 1, -16, 6.4, 16));
    fillPath(ctx, pal.glass, box(R + 0.4, -14.6, 3.6, 8.4, 0.6));
    fillPath(ctx, pal.steelLit, box(R - 1, -16, 6.4, 0.8));
    neonWord(ctx, 'OPEN', R + 0.7, -13.4, 1.6, '#ff4f7a', () => 1, 0.2);
    // DINER on the roof, pink tubes on a thin frame.
    strokePath(ctx, pal.pole, 0.6, (c) => { c.moveTo(-18, -22.8); c.lineTo(-18, -30.5); c.moveTo(2, -22.8); c.lineTo(2, -30.5); });
    const dw = neonWidth('DINER', 6.2);
    neonWord(ctx, 'DINER', -8 - dw / 2, -31.4, 6.2, '#ff4f7a', (i) => (i === 3 && fract(t * 0.37) > 0.93 ? 0 : 1));
    // ---- the sign stack on its pole
    const px = 36;
    fillPath(ctx, pal.pole, box(px - 1.1, -72, 2.2, 72));
    fillPath(ctx, rgba('#ffffff', 0.25), box(px + 0.3, -72, 0.6, 72));
    // EAT board: letters stacked, with a bulb-chased arrow under it pointing at the door.
    fillPath(ctx, pal.boardEdge, box(px - 7.4, -86, 14.8, 25.4, 1.6));
    fillPath(ctx, pal.board, box(px - 6, -84.6, 12, 22.6, 1));
    for (let i = 0; i < 3; i++) {
      neonWord(ctx, 'EAT'[i], px - 3.3, -83 + i * 7, 5.6, '#e8352f');
    }
    const arrow = [px + 10, -60, px - 12, -60, px - 12, -63, px - 20, -56.5, px - 12, -50, px - 12, -53, px + 10, -53];
    fillPath(ctx, pal.arrow, poly(arrow));
    fillPath(ctx, mix(pal.arrow, '#ffffff', 0.25), poly([px + 10, -60, px - 12, -60, px - 12, -63, px - 14, -61.4, px - 13, -59, px + 10, -59]));
    // Bulbs along the arrow's outline, chasing toward the point.
    const outline = [];
    for (let i = 0; i < arrow.length; i += 2) {
      const ax = arrow[i], ay = arrow[i + 1], bx = arrow[(i + 2) % arrow.length], by = arrow[(i + 3) % arrow.length];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 2.6));
      for (let k = 0; k < n; k++) outline.push([lerp(ax, bx, k / n), lerp(ay, by, k / n)]);
    }
    const chase = Math.floor(t * 9);
    outline.forEach(([bx, by], i) => {
      const on = (i + chase) % 3 === 0;
      fillPath(ctx, on ? pal.bulb : pal.bulbOff, circle(bx, by, 0.72));
      if (on) glow(ctx, bx, by, 2.6, '#ffe28a', 0.5);
    });
    // MOTEL: teal tubes on a dark panel, one letter prone to buzzing.
    fillPath(ctx, pal.pole, box(px - 14, -47, 28, 10, 1.2));
    fillPath(ctx, mix(pal.pole, '#ffffff', 0.2), box(px - 14, -47, 28, 0.7));
    const mw = neonWidth('MOTEL', 6);
    const buzz = hash(Math.floor(t * 14)) > 0.8 ? 0.15 : 1;
    neonWord(ctx, 'MOTEL', px - mw / 2, -45, 6, '#4fe3d6', (i) => (i === 2 ? buzz : 1));
    // VACANCY, with the NO in front of it flickering in bursts.
    fillPath(ctx, pal.pole, box(px - 14, -35.4, 28, 6.2, 1));
    const burst = Math.floor(t * 2.3);
    const noOn = hash(burst) > 0.45 ? (hash(Math.floor(t * 17)) > 0.3 ? 1 : 0.1) : 0;
    neonWord(ctx, 'NO', px - 12.4, -34, 3.4, '#ff4f5a', () => noOn, 0.3);
    neonWord(ctx, 'VACANCY', px - 5.2, -34, 3.4, '#ffd24a', () => 1, 0.3);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- speed trap
// The speed camera that ships (drawDesertSpeedTrap): SMILE!, the flash, the mugshot.
function speedTrap(ctx, t, camX) {
  const seat = seatFor(camX);
  for (const x0 of hillSlot(camX)) {
    ctx.save();
    clipSigns(ctx, camX, x0 - 120, x0 + 120);
    drawDesertSpeedTrap(ctx, t, x0, seat);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- hot-air balloons
// A striped balloon drifting over the country, turning slowly on its lines, the basket
// swinging under it — and every few seconds the pilot opens the burner: a jet of flame
// up the mouth and the whole envelope glows from inside against the sunset. A smaller
// one hangs further off, silhouetted near the sun.
const BALLOON_GORES = ['#d8412f', '#f3b537', '#2e8e9b', '#f5ecd9', '#d8412f', '#f3b537', '#2e8e9b', '#f5ecd9', '#d8412f', '#f3b537', '#2e8e9b', '#f5ecd9'];
const BALLOON_R = 15;
function balloonHalfWidth(y) {
  // Crown at y = -17, widest at y = 2, mouth (3.4 wide) at y = 19.
  if (y <= 2) return BALLOON_R * Math.sqrt(Math.max(0, 1 - ((y - 2) / 19) ** 2));
  const k = Math.min(1, (y - 2) / 17);
  return 1.7 + (BALLOON_R - 1.7) * Math.cos(k * Math.PI / 2) ** 0.85;
}
function drawBalloon(ctx, t, spin, burn, sky, k, people = true) {
  const col = (c) => mix(c, sky, k);
  const outline = (c) => {
    c.moveTo(0, -17);
    for (let y = -17; y <= 19; y += 1) c.lineTo(balloonHalfWidth(y), y);
    for (let y = 19; y >= -17; y -= 1) c.lineTo(-balloonHalfWidth(y), y);
    c.closePath();
  };
  // Lines and basket first: the envelope hangs in front of the top of them.
  strokePath(ctx, col('#4a3a30'), 0.35, (c) => {
    c.moveTo(-1.7, 19); c.lineTo(-2.9, 24.6); c.moveTo(1.7, 19); c.lineTo(2.9, 24.6);
    c.moveTo(-0.6, 19); c.lineTo(-1, 24.6); c.moveTo(0.6, 19); c.lineTo(1, 24.6);
  });
  // Burner frame and its flame.
  fillPath(ctx, col('#3a3634'), box(-1.8, 20.2, 3.6, 1.2, 0.3));
  if (burn > 0.02) {
    glow(ctx, 0, 17, 13, '#ffb347', 0.6 * burn);
    fillPath(ctx, rgba('#ff8a2a', burn), (c) => { c.moveTo(-1.1, 20.4); c.quadraticCurveTo(-1.4, 16, 0, 11.5 - burn * 2); c.quadraticCurveTo(1.4, 16, 1.1, 20.4); c.closePath(); });
    fillPath(ctx, rgba('#fff4c8', burn), (c) => { c.moveTo(-0.5, 20.4); c.quadraticCurveTo(-0.6, 17.4, 0, 14.4 - burn); c.quadraticCurveTo(0.6, 17.4, 0.5, 20.4); c.closePath(); });
  }
  // Basket: wicker, lit rim, a pilot and a passenger — one of them waving.
  if (people) {
    fillPath(ctx, col('#2e2a2a'), circle(-1.3, 23.2, 0.85));
    fillPath(ctx, col('#e8b27e'), circle(1.3, 23.1, 0.85));
    const wave = Math.sin(t * 7) * 0.5;
    strokePath(ctx, col('#e8b27e'), 0.5, (c) => { c.moveTo(2, 24); c.lineTo(3.4 + wave * 0.3, 21.8 - wave); });
  }
  fillPath(ctx, col('#9a6a3a'), box(-3.2, 24.3, 6.4, 5, 0.8));
  fillPath(ctx, col('#d8a868'), box(-3.4, 24.1, 6.8, 1.1, 0.5));
  for (let i = 0; i < 3; i++) fillPath(ctx, col('#6f4a2a'), box(-2.6 + i * 2.1, 25.6, 0.5, 3.3));
  // Envelope: gores on a turning drum, shaded dark on the side away from the sun.
  ctx.save();
  ctx.beginPath(); outline(ctx); ctx.clip();
  const N = BALLOON_GORES.length;
  const half = Math.PI / N;
  for (let g = 0; g < N; g++) {
    // Each gore's centre angle, wrapped so 0 faces the viewer; only the near half shows.
    const raw = spin + ((g + 0.5) / N) * TAU;
    const am = Math.atan2(Math.sin(raw), Math.cos(raw));
    if (Math.abs(am) > Math.PI / 2 + half) continue;
    const e0 = Math.max(-Math.PI / 2, am - half), e1 = Math.min(Math.PI / 2, am + half);
    if (e1 <= e0) continue;
    const light = 0.5 + 0.5 * Math.sin(am);          // +x side faces the sun
    const base = col(BALLOON_GORES[g]);
    const c = mix(mix(base, '#3a1a24', 0.34 * (1 - light)), '#fff4dc', 0.24 * Math.max(0, light - 0.62));
    fillPath(ctx, c, (p) => {
      for (let y = -17; y <= 20; y += 1) p.lineTo(balloonHalfWidth(y) * Math.sin(e0), y);
      for (let y = 20; y >= -17; y -= 1) p.lineTo(balloonHalfWidth(y) * Math.sin(e1), y);
      p.closePath();
    });
  }
  // Crown cap, and the load tape round the equator catching the light.
  fillPath(ctx, col('#f5ecd9'), oval(0, -15.8, 4.6, 1.5));
  strokePath(ctx, rgba('#fff4dc', 0.35), 0.45, (c) => c.ellipse(0, 2, BALLOON_R, 1.4, 0, 0.1, Math.PI - 0.1));
  // The burn: the envelope lit from inside, strongest just above the mouth.
  if (burn > 0.02) {
    const g2 = ctx.createRadialGradient(0, 14, 1, 0, 8, 22);
    g2.addColorStop(0, `rgba(255,214,140,${0.75 * burn})`);
    g2.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(-20, -20, 40, 44);
  }
  // Soft terminator + rim light from the sun.
  fillPath(ctx, rgba('#2a1420', 0.16), (c) => { c.ellipse(-BALLOON_R * 0.55, 0, BALLOON_R * 0.7, 21, 0, 0, TAU); });
  fillPath(ctx, rgba('#fff2d6', 0.2), (c) => { c.ellipse(BALLOON_R * 0.72, -3, BALLOON_R * 0.36, 15, 0.1, 0, TAU); });
  ctx.restore();
}
function hotAirBalloons(ctx, t, camX) {
  ctx.save();
  const burnAt = (tt, period, on) => {
    const u = ((tt % period) + period) % period;
    return u > on && u < on + 0.9 ? Math.min(1, (u - on) / 0.08) * Math.min(1, (on + 0.9 - u) / 0.15) : 0;
  };
  // The far one first, small and hazed near the sun.
  {
    const x = driftX(452 + t * 2.4, camX, 0.05, W + 120, 60);
    const y = 104 + Math.sin(t * 0.5 + 1) * 1.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.46, 0.46);
    ctx.rotate(Math.sin(t * 0.8) * 0.03);
    drawBalloon(ctx, t, t * 0.25 + 1.3, burnAt(t + 1.1, 4.1, 2.0), skyAt(y), 0.4, false);
    ctx.restore();
  }
  const x = driftX(250 + t * 4, camX, 0.08, W + 140, 70);
  const burn = burnAt(t, 3.4, 1.35);
  // Rises a touch after each burn, sinks slowly between.
  const y = 70 + Math.sin(t * 0.55) * 2.2 - burn * 0.6;
  ctx.translate(x, y);
  ctx.scale(1.35, 1.35);
  ctx.rotate(Math.sin(t * 1.1) * 0.035);
  drawBalloon(ctx, t, t * 0.35, burn, skyAt(y), 0.1, true);
  ctx.restore();
}

// ---------------------------------------------------------------- ranch windpump
// A farm windmill on the roadside hill: the many-bladed wheel turning in the evening
// breeze, the tail vane hunting the wind, the pump rod stroking in the tower, and
// water gulping out of the pipe into a round stock tank that throws the sunset back.
const PUMP = {
  leg: '#8a8e87', legLit: '#dcd8c4', legDark: '#5d615b', blade: '#c9ccc5', bladeLit: '#f4f1e2',
  bladeDark: '#7c807a', hub: '#4e524d', vane: '#c2402e', vaneLit: '#e8735a', tank: '#a4a8a2',
  tankLit: '#dcded6', tankDark: '#6e726c', water: '#f0a458', waterLit: '#ffd9a0', pipe: '#5a5e59',
};
function ranchWindpump(ctx, t, camX) {
  ctx.save();
  const near = nearCrest(camX);
  const pal = haze(PUMP, 160, 0.05);
  for (const x0 of hillSlot(camX)) {
    const y0 = near(x0) - 0.3;
    ctx.save();
    clipBehind(ctx, camX, x0 - 110, x0 + 110, [(x) => near(x) + 1.4]);
    ctx.translate(x0, y0);
    gravelPad(ctx, haze(DINER, 170, 0.05), 44);
    ctx.scale(1.3, 1.3);
    const spin = -t * 4.2;
    const stroke = Math.sin(spin) * 1.1;          // one pump stroke per turn of the wheel
    // ---- stock tank on the left, filled from the pump pipe
    const tx = -24;
    fillPath(ctx, pal.tank, box(tx - 10, -6.4, 20, 6.8));
    for (let k = 0; k < 11; k++) fillPath(ctx, k % 2 ? pal.tankLit : pal.tankDark, box(tx - 9.4 + k * 1.8, -5.8, 0.6, 5.6));
    fillPath(ctx, rgba('#000000', 0.18), box(tx - 10, -6.4, 4, 6.8));
    fillPath(ctx, pal.tankLit, oval(tx, -6.4, 10.2, 2.3));
    fillPath(ctx, pal.water, oval(tx, -6.4, 9.2, 1.8));
    fillPath(ctx, pal.waterLit, oval(tx + 3, -6.8, 4.2, 0.5));
    // Ripple rings from the falling water.
    for (let k = 0; k < 2; k++) {
      const ph = fract(t * 0.9 + k * 0.5);
      strokePath(ctx, rgba('#fff0d0', 0.7 * (1 - ph)), 0.35, oval(tx + 6, -6.4, 0.8 + ph * 4, 0.3 + ph * 0.9));
    }
    // Discharge pipe from the pump base to the tank, and the gulping stream.
    strokePath(ctx, pal.pipe, 1.1, (c) => { c.moveTo(0, -3.6); c.lineTo(tx + 8.6, -3.6); c.lineTo(tx + 8.6, -8.6); c.lineTo(tx + 7.2, -8.6); }, 'butt');
    const gulp = 0.5 + 0.5 * Math.sin(spin + 1.2);
    strokePath(ctx, rgba('#ffe2b0', 0.85), 0.5 + gulp * 0.5, (c) => { c.moveTo(tx + 6.7, -8.3); c.quadraticCurveTo(tx + 6.1, -7.6, tx + 6, -6.6); });
    for (let k = 0; k < 3; k++) {
      const ph = fract(t * 2.2 + k / 3);
      fillPath(ctx, rgba('#fff0d0', 0.9 * (1 - ph)), circle(tx + 6 + (k - 1) * ph * 2.2, -6.6 - Math.sin(ph * Math.PI) * 1.6, 0.35));
    }
    // ---- the tower: two near legs, girts and X-bracing, far legs faint behind.
    const top = -46, spread = 8.6, topW = 2;
    const legX = (side, y) => side * (topW + (spread - topW) * (y / top === 0 ? 1 : 1 - y / top));
    strokePath(ctx, pal.legDark, 0.8, (c) => {
      c.moveTo(-spread + 2.4, 0); c.lineTo(-topW + 0.6, top);
      c.moveTo(spread - 2.4, 0); c.lineTo(topW - 0.6, top);
    }, 'butt');
    for (const side of [-1, 1]) {
      strokePath(ctx, side < 0 ? pal.legDark : pal.leg, 1.3, (c) => { c.moveTo(side * spread, 0); c.lineTo(side * topW, top); }, 'butt');
    }
    strokePath(ctx, pal.legLit, 0.45, (c) => { c.moveTo(spread + 0.4, 0); c.lineTo(topW + 0.45, top); }, 'butt');
    strokePath(ctx, pal.leg, 0.45, (c) => {
      const lv = [0, -11, -21, -30, -38, -46];
      for (let i = 0; i < lv.length - 1; i++) {
        const ya = lv[i], yb = lv[i + 1];
        c.moveTo(legX(-1, ya), ya); c.lineTo(legX(1, ya), ya);
        c.moveTo(legX(-1, ya), ya); c.lineTo(legX(1, yb), yb);
        c.moveTo(legX(1, ya), ya); c.lineTo(legX(-1, yb), yb);
      }
    });
    // Pump rod stroking inside the tower, and the wellhead it drives.
    strokePath(ctx, pal.legDark, 0.55, (c) => { c.moveTo(0, top - 1 + stroke); c.lineTo(0, -4 + stroke); });
    fillPath(ctx, pal.pipe, box(-1.6, -5, 3.2, 5));
    fillPath(ctx, pal.legLit, box(-1.6, -5, 3.2, 0.7));
    // Platform and the gearhead.
    fillPath(ctx, pal.legDark, box(-5, top - 0.2, 10, 1.4));
    fillPath(ctx, pal.legLit, box(-5, top - 0.2, 10, 0.5));
    fillPath(ctx, pal.hub, box(-2.2, top - 4.4, 5.6, 4.2, 1.2));
    fillPath(ctx, mix(pal.hub, '#ffffff', 0.3), box(-2.2, top - 4.4, 5.6, 1, 0.5));
    // Tail vane, hunting the wind: its boom swings and the vane's width breathes.
    const hunt = Math.sin(t * 0.7) * 0.12 + Math.sin(t * 1.9) * 0.04;
    const tailL = 17 * Math.cos(0.45 + hunt);
    strokePath(ctx, pal.legDark, 0.7, (c) => { c.moveTo(2.8, top - 2.6); c.lineTo(2.8 + tailL, top - 5.2); });
    const vw = 11 * Math.cos(0.45 + hunt), vx = 2.8 + tailL - vw * 0.6;
    fillPath(ctx, pal.vane, poly([vx, top - 9.6, vx + vw, top - 8.2, vx + vw, top - 2.2, vx, top - 3.6]));
    fillPath(ctx, pal.vaneLit, poly([vx, top - 9.6, vx + vw, top - 8.2, vx + vw, top - 7.2, vx, top - 8.6]));
    fillPath(ctx, rgba('#ffffff', 0.85), poly([vx + vw * 0.2, top - 6.6, vx + vw * 0.8, top - 5.8, vx + vw * 0.8, top - 5.0, vx + vw * 0.2, top - 5.8]));
    // The wheel: eighteen pitched blades on a disc seen three-quarter, turning.
    const cx = -3, cy = top - 3.8, R = 13.2, yaw = Math.cos(0.95 + hunt * 0.6);
    const blades = 18;
    for (let k = 0; k < blades; k++) {
      const a = spin + (k / blades) * TAU;
      const pt = (r, da) => [cx + r * Math.cos(a + da) * yaw, cy + r * Math.sin(a + da)];
      const [x1, y1] = pt(R * 0.36, -0.06), [x2, y2] = pt(R, -0.12), [x3, y3] = pt(R, 0.12), [x4, y4] = pt(R * 0.36, 0.06);
      const face = Math.cos(a);           // the half turned toward the sun catches it
      const c = face > 0.45 ? pal.bladeLit : face < -0.5 ? pal.bladeDark : pal.blade;
      fillPath(ctx, c, poly([x1, y1, x2, y2, x3, y3, x4, y4]));
    }
    strokePath(ctx, pal.legDark, 0.55, (c) => c.ellipse(cx, cy, R * yaw, R, 0, 0, TAU));
    strokePath(ctx, pal.legDark, 0.45, (c) => c.ellipse(cx, cy, R * 0.66 * yaw, R * 0.66, 0, 0, TAU));
    strokePath(ctx, pal.legDark, 0.4, (c) => {
      for (let k = 0; k < 6; k++) { const a = spin + (k / 6) * TAU + 0.17; c.moveTo(cx, cy); c.lineTo(cx + R * 0.66 * Math.cos(a) * yaw, cy + R * 0.66 * Math.sin(a)); }
    });
    fillPath(ctx, pal.hub, circle(cx, cy, 1.5));
    fillPath(ctx, pal.legLit, circle(cx + 0.4, cy - 0.4, 0.55));
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- dust devil
// A thin whirl of dust wandering over the middle dunes — pale, translucent, leaning in
// the breeze, dust streaks winding up it, grit and a scrap of brush orbiting the foot.
// Deliberately light: a tornado reads as weather coming for you, and this is the
// desert's own small, harmless version, over there and minding its business.
function dustDevil(ctx, t, camX) {
  // Its wander across the middle dunes; the whirl itself is the shipped painter's.
  const travel = camX * MID.factor * ZOOM;
  const s = 225 + t * 11 + Math.sin(t * 0.31) * 26;
  const span = periodOf(MID) * 2;
  const bx = ((((s - travel + 80) % span) + span) % span) - 80;
  ctx.save();
  clipSigns(ctx, camX, bx - 90, bx + 120);
  drawDesertDustDevil(ctx, t, bx, seatFor(camX));
  ctx.restore();
}

// ---------------------------------------------------------------- race grandstand
// A checkpoint grandstand on the roadside hill: tiered benches packed with a crowd
// doing THE WAVE, camera flashes popping in the stands, pennants snapping on the roof
// fascia — and a flagman down at the rail swinging the chequered flag as you pass.
const STAND = {
  steel: '#6f7f8c', steelLit: '#c9d4dc', steelDark: '#46525c', bench: '#dcd4c4', riser: '#8a8176',
  roof: '#4f5a63', roofLit: '#9aa6b0', fascia: '#d8392e', fasciaLit: '#f06a55', rail: '#f4f1ea', railRed: '#d8392e',
};
const SHIRTS = ['#d8392e', '#2f7fbf', '#f2c230', '#f4f1ea', '#3f9a5a', '#e8742a', '#8a4fb8', '#243453'];
const SKINS = ['#e8b98f', '#c98a5e', '#8a5a3c', '#f2cfae', '#a86f48'];
function raceGrandstand(ctx, t, camX) {
  ctx.save();
  const near = nearCrest(camX);
  const pal = haze(STAND, 160, 0.05);
  for (const x0 of hillSlot(camX)) {
    const y0 = near(x0) - 0.3;
    ctx.save();
    clipBehind(ctx, camX, x0 - 120, x0 + 120, [(x) => near(x) + 1.2]);
    ctx.translate(x0, y0);
    gravelPad(ctx, haze(DINER, 170, 0.05), 52);
    const L = -42, R = 42, TIERS = 5, TH = 4.3, base = -3.2;
    // Frame behind the tiers, and the side trusses.
    fillPath(ctx, pal.steelDark, box(L, base - TIERS * TH - 2, R - L, TIERS * TH + 2));
    // Tiers, back to front: riser face, bench top, then the crowd sitting on it.
    const wave = fract(t * 0.36) * 1.5 - 0.25;
    for (let k = TIERS - 1; k >= 0; k--) {
      const top = base - (k + 1) * TH;
      fillPath(ctx, pal.riser, box(L + 1, top + 1.1, R - L - 2, TH - 1.1));
      fillPath(ctx, pal.bench, box(L + 1, top, R - L - 2, 1.2));
      const n = 14;
      for (let i = 0; i < n; i++) {
        const seat = k * 31 + i * 7;
        if (hash(seat) < 0.1) continue;                  // the odd empty seat
        const nx = (i + 0.5 + (k % 2) * 0.35) / n;
        const px = L + 2.4 + nx * (R - L - 5);
        const f = Math.exp(-(((nx - wave) / 0.075) ** 2));
        const rise = f * 2.1 + Math.sin(t * 3 + seat) * 0.18;
        const shirt = SHIRTS[Math.floor(hash(seat + 1) * SHIRTS.length)];
        const skin = SKINS[Math.floor(hash(seat + 2) * SKINS.length)];
        const sy = top - rise;
        fillPath(ctx, shirt, box(px - 1.25, sy - 1.9, 2.5, 2.6, 0.8));
        fillPath(ctx, skin, circle(px, sy - 2.9, 0.95));
        if (hash(seat + 3) > 0.72) fillPath(ctx, SHIRTS[Math.floor(hash(seat + 4) * SHIRTS.length)], box(px - 1.05, sy - 4.05, 2.1, 0.8, 0.4));
        if (f > 0.4) {
          strokePath(ctx, skin, 0.5, (c) => { c.moveTo(px - 0.9, sy - 1.6); c.lineTo(px - 1.6, sy - 4.6); c.moveTo(px + 0.9, sy - 1.6); c.lineTo(px + 1.6, sy - 4.6); });
        }
        // Camera flashes popping at random seats.
        const flash = fract(t * 1.7 + hash(seat + 5) * 13);
        if (hash(seat + 6) > 0.82 && flash < 0.06) {
          fillPath(ctx, '#ffffff', circle(px + 0.9, sy - 2.2, 0.55));
          glow(ctx, px + 0.9, sy - 2.2, 4, '#ffffff', 0.8);
        }
      }
    }
    // Side trusses and the roof on its posts.
    for (const side of [L, R]) {
      fillPath(ctx, pal.steel, box(side - 1.6, base - TIERS * TH - 1, 3.2, TIERS * TH + 1));
      fillPath(ctx, pal.steelLit, box(side + (side > 0 ? 0.5 : 0.2), base - TIERS * TH - 1, 0.7, TIERS * TH + 1));
    }
    const roofY = base - TIERS * TH - 10.5;
    for (const px of [L + 0.5, -14, 14, R - 0.5]) fillPath(ctx, pal.steelDark, box(px - 0.6, roofY, 1.2, base - TIERS * TH - roofY));
    fillPath(ctx, pal.roof, poly([L - 4, roofY, R + 4, roofY, R + 2, roofY - 2.4, L - 2, roofY - 2.4]));
    fillPath(ctx, pal.roofLit, poly([L - 2, roofY - 2.4, R + 2, roofY - 2.4, R + 2.6, roofY - 1.8, L - 2.6, roofY - 1.8]));
    fillPath(ctx, pal.fascia, box(L - 4, roofY, R - L + 8, 5.4));
    fillPath(ctx, pal.fasciaLit, box(L - 4, roofY, R - L + 8, 0.8));
    drawTextVectorCentered(ctx, 'SPEED ZONE', 0, textYForMid(roofY + 2.9, 0.5, 'bold'), '#fff6e4', 0.5, 'bold');
    // Pennants strung along the roof, snapping in the wind.
    for (let k = 0; k < 9; k++) {
      const fx = L - 2 + k * ((R - L + 4) / 8);
      const fy = roofY - 2.4;
      strokePath(ctx, pal.steelDark, 0.35, (c) => { c.moveTo(fx, fy); c.lineTo(fx, fy - 6); });
      const w = Math.sin(t * 10 + k * 0.9);
      fillPath(ctx, SHIRTS[k % 6], (c) => { c.moveTo(fx, fy - 6); c.quadraticCurveTo(fx + 2.2, fy - 5.6 + w * 0.5, fx + 4.4, fy - 4.9 + w * 0.9); c.quadraticCurveTo(fx + 2.2, fy - 4.4 + w * 0.5, fx, fy - 3.6); c.closePath(); });
    }
    // Race barrier along the front of the lot, red and white.
    fillPath(ctx, pal.rail, box(L - 6, -3.4, R - L + 12, 2.4, 0.6));
    for (let k = 0; k < 12; k++) fillPath(ctx, pal.railRed, box(L - 6 + k * 8.2, -3.4, 4.1, 2.4));
    // The flagman at the rail, swinging the chequered flag through an arc.
    const fmX = L + 8;
    fillPath(ctx, '#243453', box(fmX - 1.1, -8.2, 2.2, 5, 0.6));
    fillPath(ctx, '#f4f1ea', box(fmX - 1.3, -11.6, 2.6, 3.6, 0.8));
    fillPath(ctx, '#e8b98f', circle(fmX, -12.9, 1.05));
    fillPath(ctx, '#1f1f24', box(fmX - 1.2, -14.1, 2.4, 0.8, 0.4));
    const sw = Math.sin(t * 5.5) * 0.9;
    ctx.save();
    ctx.translate(fmX + 1, -11.4);
    ctx.rotate(-0.9 + sw);
    strokePath(ctx, '#e8b98f', 0.7, (c) => { c.moveTo(0, 0); c.lineTo(0, -2.4); });
    strokePath(ctx, '#3a3431', 0.4, (c) => { c.moveTo(0, -2); c.lineTo(0, -10); });
    ctx.save();
    ctx.beginPath();
    const ripple = (u) => Math.sin(t * 14 - u * 3) * 0.5 * u;
    ctx.moveTo(0.1, -10);
    for (let u = 0; u <= 1.001; u += 0.25) ctx.lineTo(0.1 + u * 5.4, -10 + ripple(u));
    for (let u = 1; u >= -0.001; u -= 0.25) ctx.lineTo(0.1 + u * 5.4, -6 + ripple(u));
    ctx.closePath();
    ctx.fillStyle = '#f4f1ea'; ctx.fill();
    ctx.clip();
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) % 2) continue;
      fillPath(ctx, '#1e1c22', box(0.1 + i * 1.08, -10 + j * 1 + ripple(i / 5 + 0.1) - 0.05, 1.08, 1.02));
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- howling coyote
// A coyote sitting up on a sandstone outcrop on the roadside hill, tail curled round
// its paws, ears swivelling — and every few seconds it throws its head back and howls
// at the sunset, the rings of the song drifting off over the road.
function howlingCoyote(ctx, t, camX) {
  const seat = seatFor(camX);
  for (const x0 of hillSlot(camX)) {
    ctx.save();
    clipSigns(ctx, camX, x0 - 90, x0 + 90);
    drawDesertCoyote(ctx, t, x0, seat);
    ctx.restore();
  }
}

// ================================================================== LANE

// ---------------------------------------------------------------- rattlesnake
// Coiled, rattling, head up — and on a timer it STRIKES, the head lunging out at the
// hero and back. Drawn facing left like every animal hazard.
const SNAKE = {
  body: '#c9a56b', bodyLit: '#ead08f', belly: '#efe0b4', dark: '#7a5534', diamond: '#6b4a2e',
  edge: '#f4e6bf', head: '#b08a58', eye: '#1a1210', tongue: '#d8323a', rattle: '#d9c9a0', rattleDark: '#9c8a68',
};
const SNAKE_PERIOD = 2.6;

function rattlesnake(ctx, t, x, g) {
  ctx.save();
  ctx.translate(x, g);
  const P = SNAKE;
  const u = ((t % SNAKE_PERIOD) + SNAKE_PERIOD) % SNAKE_PERIOD;
  // Strike: 0 at rest, 1 at full reach. Fast out (0.12 s), a beat held, slower back.
  const strike = u < 1.62 ? 0 : u < 1.74 ? smooth(1.62, 1.74, u)
    : u < 1.92 ? 1 : 1 - smooth(1.92, 2.3, u);
  // A crouch before the strike: the neck draws back into a tighter S.
  const wind = smooth(1.2, 1.6, u) * (1 - smooth(1.62, 1.7, u));
  const sway = Math.sin(t * 2.3) * 0.5 * (1 - strike);

  contactShadow(ctx, 0.5, -0.3, 9.5, 1.7, 0.32);

  // The coil is a TUBE laid in three rings, not three discs: each ring is the body's
  // own thickness stroked round an ellipse, shaded under and lit on top along its front
  // arc, so it reads as a round body wound on itself. Bottom ring first — each one
  // above rests on the back of the one below.
  const rings = [
    { cx: 0.7, cy: -2.3, rx: 7.3, ry: 2.05, th: 3.1 },
    { cx: 0.25, cy: -5.0, rx: 5.5, ry: 1.7, th: 2.9 },
    { cx: -0.2, cy: -7.3, rx: 3.6, ry: 1.3, th: 2.7 },
  ];
  for (let i = 0; i < rings.length; i++) {
    const { cx, cy, rx, ry, th } = rings[i];
    strokePath(ctx, 'rgba(26,16,40,0.42)', th + 0.62, oval(cx, cy, rx, ry));
    strokePath(ctx, P.body, th, oval(cx, cy, rx, ry));
    // Belly shadow under the front arc, lit crown along its top.
    strokePath(ctx, P.dark, th * 0.34, (c) => c.ellipse(cx, cy + th * 0.3, rx, ry, 0, 0.08 * Math.PI, 0.92 * Math.PI), 'butt');
    strokePath(ctx, P.bodyLit, th * 0.3, (c) => c.ellipse(cx, cy - th * 0.26, rx, ry, 0, 0.1 * Math.PI, 0.9 * Math.PI), 'butt');
    strokePath(ctx, P.bodyLit, th * 0.24, (c) => c.ellipse(cx, cy - th * 0.22, rx, ry, 0, 1.12 * Math.PI, 1.88 * Math.PI), 'butt');
    // Diamond saddles along the front, cream-edged, narrowing as the ring turns away.
    const n = 5 - i;
    for (let k = 0; k < n; k++) {
      const a = Math.PI * (0.1 + (k + 0.5) * (0.8 / n)) + (i % 2 ? 0.08 : -0.04);
      const dx = cx + Math.cos(a) * rx;
      const dy = cy + Math.sin(a) * ry - th * 0.04;
      const sq = 0.45 + 0.55 * Math.sin(a);
      const s = th * 0.36;
      fillPath(ctx, P.edge, poly([dx - s * 1.4 * sq, dy, dx, dy - s * 1.05, dx + s * 1.4 * sq, dy, dx, dy + s * 1.05]));
      fillPath(ctx, P.diamond, poly([dx - s * 0.95 * sq, dy, dx, dy - s * 0.7, dx + s * 0.95 * sq, dy, dx, dy + s * 0.7]));
    }
  }

  // The rattle: rising out of the back of the coil, buzzing — three ghost positions and
  // a pair of motion ticks, because a blur is what a rattle looks like.
  const buzz = Math.sin(t * 60) * 0.8;
  ctx.save();
  ctx.translate(5.2, -7.4);
  const a0 = ctx.globalAlpha;
  for (let k = 2; k >= 0; k--) {
    const off = (k - 1) * 0.9 + buzz * (k === 1 ? 0.6 : 0.2);
    ctx.globalAlpha = a0 * (k === 1 ? 1 : 0.35);
    ctx.save();
    ctx.rotate(0.35 + off * 0.12);
    for (let s = 0; s < 4; s++) {
      ink(ctx, s % 2 ? P.rattle : P.rattleDark, oval(0, -1.2 - s * 1.35, 1.25 - s * 0.14, 0.78), 0.22);
    }
    ctx.restore();
  }
  ctx.globalAlpha = a0;
  strokePath(ctx, rgba('#fff4d8', 0.7), 0.35, (c) => {
    c.moveTo(2.4, -5.8); c.quadraticCurveTo(3.4, -4.8, 2.6, -3.6);
    c.moveTo(3.6, -6.6); c.quadraticCurveTo(4.8, -5.2, 3.8, -3.8);
  });
  ctx.restore();

  // Neck and head: an S that springs straight when it strikes. The neck is a thick
  // stroke drawn twice (outline under fill) so it joins the coil as one body.
  const rest = [[-1.2, -8.2], [1.6 + wind * 0.8, -11.5], [-2.2 + sway - wind * 1.2, -13.6], [-4.2 + sway - wind * 0.6, -13.9]];
  const hit = [[-1.5, -8.2], [-5, -10.2], [-9.5, -10.9], [-13.8, -10.6]];
  const pts = rest.map((p, i) => [lerp(p[0], hit[i][0], strike), lerp(p[1], hit[i][1], strike)]);
  const neck = (c) => {
    c.moveTo(pts[0][0], pts[0][1]);
    c.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  };
  strokePath(ctx, 'rgba(26,16,40,0.4)', 3.3, neck);
  strokePath(ctx, P.body, 2.6, neck);
  strokePath(ctx, P.belly, 0.9, (c) => {
    c.moveTo(pts[0][0] - 0.4, pts[0][1] + 0.6);
    c.bezierCurveTo(pts[1][0] - 0.6, pts[1][1] + 0.9, pts[2][0], pts[2][1] + 1, pts[3][0] + 0.4, pts[3][1] + 1);
  });
  // A couple of dorsal diamonds on the neck.
  for (const k of [0.35, 0.62]) {
    const bx = bez(pts, k, 0), by = bez(pts, k, 1);
    fillPath(ctx, P.diamond, poly([bx - 0.8, by - 0.6, bx, by - 1.3, bx + 0.8, by - 0.6, bx, by + 0.1]));
  }

  // The head: a pit viper's arrowhead — broad jaw hinge behind the eye, narrow snout —
  // with the jaws opening as it strikes.
  const [hx, hy] = pts[3];
  const gape = smooth(0.2, 1, strike) * 0.6;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-0.1 + strike * 0.2);
  // Lower jaw, dropping open.
  ctx.save();
  ctx.translate(1.6, 0.6);
  ctx.rotate(-gape);
  ink(ctx, P.belly, poly([0.4, -0.4, -5.2, -0.1, -5.0, 0.55, 0.2, 0.9]), 0.26);
  ctx.restore();
  if (gape > 0.05) {
    // Mouth lining and the two fangs.
    fillPath(ctx, '#e0707a', poly([1.8, 0.3, -3.6, 0.3, -3.5 + gape * 1.6, 0.4 + gape * 4.6]));
    fillPath(ctx, '#fffaf0', poly([-3.0, 0.2, -2.55, 0.2, -2.85, 1.7]));
    fillPath(ctx, '#fffaf0', poly([-1.7, 0.2, -1.25, 0.2, -1.55, 1.45]));
  }
  ink(ctx, P.head, (c) => {
    c.moveTo(2.4, 0.9);
    c.quadraticCurveTo(2.9, -1.2, 1.6, -2.3);
    c.quadraticCurveTo(-0.6, -2.7, -2.2, -2.1);
    c.quadraticCurveTo(-3.8, -1.5, -4.3, -0.4);
    c.quadraticCurveTo(-4.4, 0.4, -3.6, 0.45);
    c.lineTo(1.6, 1.2);
    c.closePath();
  }, 0.3);
  // Lit crown, a darker cap stripe, and the pale line from eye to jaw hinge.
  fillPath(ctx, P.bodyLit, (c) => { c.moveTo(1.8, -1.8); c.quadraticCurveTo(-0.8, -2.5, -3.4, -1.1); c.quadraticCurveTo(-0.8, -1.7, 1.9, -1.1); c.closePath(); });
  fillPath(ctx, P.diamond, (c) => { c.moveTo(2.2, -0.6); c.quadraticCurveTo(0.2, -1.2, -1.4, -0.7); c.quadraticCurveTo(0.4, -0.5, 2.3, 0.2); c.closePath(); });
  strokePath(ctx, P.edge, 0.34, (c) => { c.moveTo(-2.2, -0.25); c.quadraticCurveTo(0, 0.1, 2.2, 0.75); });
  // Heavy brow over the eye — the scowl is most of the menace.
  fillPath(ctx, P.dark, poly([-3.2, -1.75, -1.0, -2.25, -1.3, -1.55]));
  fillPath(ctx, P.eye, circle(-2.0, -1.2, 0.58));
  fillPath(ctx, '#f2c14a', circle(-2.0, -1.2, 0.3));
  fillPath(ctx, P.eye, (c) => c.ellipse(-2.0, -1.2, 0.1, 0.27, 0, 0, TAU));
  fillPath(ctx, '#ffffff', circle(-2.2, -1.38, 0.12));
  fillPath(ctx, '#2a1a12', circle(-3.75, -0.5, 0.2));
  // The tongue flicks on its own clock while idle.
  const flick = strike > 0 ? 0 : Math.max(0, Math.sin(t * 7.3)) * (fract(t * 0.9) < 0.45 ? 1 : 0);
  if (flick > 0.1) {
    strokePath(ctx, P.tongue, 0.32, (c) => {
      c.moveTo(-3.6, 0.2); c.lineTo(-3.6 - flick * 2.2, 0.3);
      c.lineTo(-4.3 - flick * 2.4, -0.3); c.moveTo(-3.6 - flick * 2.2, 0.3); c.lineTo(-4.3 - flick * 2.4, 0.8);
    });
  }
  ctx.restore();
  // Strike streaks behind the lunging head.
  if (strike > 0.2 && strike < 0.999) {
    strokePath(ctx, rgba('#fff4d8', 0.6 * strike), 0.35, (c) => {
      c.moveTo(hx + 3, hy - 2.2); c.lineTo(hx + 7.5, hy - 2.6);
      c.moveTo(hx + 3.4, hy + 1); c.lineTo(hx + 7, hy + 1.2);
    });
  }
  ctx.restore();
}
// Point on the cubic through pts at k, component c (0 = x, 1 = y).
function bez(pts, k, c) {
  const m = 1 - k;
  return m * m * m * pts[0][c] + 3 * m * m * k * pts[1][c] + 3 * m * k * k * pts[2][c] + k * k * k * pts[3][c];
}

// ---------------------------------------------------------------- tumbleweed (lane)
// A big tumbleweed bowling down the lane at you, and it BOUNCES: two low hops you
// jump, then a high one you slide under. The rhythm is the read — watch the ball, not
// a sign. Spins as it rolls, squashes on landing, kicks dust.
const LANE_WEED = { dark: '#5b4027', mid: '#9b7346', lit: '#ecd098', core: '#b5895a' };
const LANE_WEED_TWIGS = weedTwigs(7, 48);
const WEED_HOPS = [5, 6, 17];
function laneTumbleweed(ctx, t, x, g) {
  ctx.save();
  const R = 6.8;
  const HOP = 0.72;
  const k = t / HOP;
  const n = Math.floor(k);
  const p = k - n;
  const H = WEED_HOPS[((n % 3) + 3) % 3];
  const lift = H * 4 * p * (1 - p);
  const squash = Math.max(0, 1 - p / 0.12) * 0.9 + Math.max(0, (p - 0.93) / 0.07) * 0.4;
  // Contact shadow that shrinks and fades as it climbs.
  const up = clamp01(lift / 22);
  contactShadow(ctx, x, g - 0.2, 6.6 * (1 - up * 0.5), 1.6 * (1 - up * 0.4), 0.34 * (1 - up * 0.7));
  // Landing puff, thrown both ways off the road.
  const age = p * HOP;
  if (age < 0.36) {
    const dust = { base: '#d8b28a', lit: '#f4dcb4', shadow: '#aa8a6c' };
    for (let q = 0; q < 4; q++) {
      const dir = q < 2 ? -1 : 1;
      dustPuff(ctx, x + dir * (3 + age * (12 + q * 4)), g - 1 - age * 5 - (q % 2) * 1.2, 1 + age * 5, 0.55 * (1 - age / 0.36), dust);
    }
  }
  // Speed ticks trailing behind the ball (it is coming at you, right to left).
  const cy = g - R * (1 - squash * 0.18) - lift;
  strokePath(ctx, rgba('#fff2d8', 0.55), 0.4, (c) => {
    for (const [dy, len] of [[-3, 5], [0.5, 7], [3.6, 4]]) { c.moveTo(x + R + 1.6, cy + dy); c.lineTo(x + R + 1.6 + len, cy + dy + 0.3); }
  });
  ctx.translate(x, cy);
  drawWeed(ctx, R, -t * 5.2, LANE_WEED_TWIGS, LANE_WEED, squash);
  ctx.restore();
}

// ---------------------------------------------------------------- armadillo
// Trundles toward you on its stumpy legs — stompable while it walks. Then it tucks
// into a banded ball and ROLLS, and a ball has to be jumped. Walk, curl, roll, unroll.
const DILLO = {
  shell: '#b8998a', band: '#8f7366', lit: '#e6ccb8', shadow: '#76605a', scale: '#a3887b',
  skin: '#d5a797', skinDark: '#a97f73', ear: '#e3a697', eye: '#1a1210', claw: '#f2e6d4',
};
const DILLO_PERIOD = 4.2;
function dilloShellPath(c, lift) {
  c.moveTo(-6.6, -3.2 - lift * 0.4);
  c.bezierCurveTo(-6.8, -9.4 - lift, 6.8, -10.2 - lift, 7.6, -3.4 - lift * 0.4);
  // Scalloped skirt along the bottom edge.
  for (let k = 0; k <= 7; k++) {
    const sx = 7.6 - (k + 0.5) * (14.2 / 8);
    c.quadraticCurveTo(sx + 0.9, -2.2 - lift * 0.4, sx, -3.2 - lift * 0.4);
  }
  c.closePath();
}
function drawDilloWalking(ctx, t, pal, c) {
  // c: 0 walking, 1 fully tucked (legs gone, head and tail folded under).
  const step = t * 7.5;
  const leg = (lx, ph) => {
    const swing = Math.sin(step + ph) * 1.1 * (1 - c);
    const liftY = Math.max(0, Math.cos(step + ph)) * 0.8 * (1 - c);
    const len = 3.3 * (1 - c);
    if (len < 0.2) return;
    ink(ctx, pal.skinDark, (p) => { p.moveTo(lx - 0.9, -3.2); p.lineTo(lx + 0.9, -3.2); p.lineTo(lx + 0.7 + swing, -3.2 + len - liftY); p.lineTo(lx - 1.1 + swing, -3.2 + len - liftY); p.closePath(); }, 0.28);
    for (let k = 0; k < 3; k++) strokePath(ctx, pal.claw, 0.28, (p) => { p.moveTo(lx - 1 + swing + k * 0.5, -3.2 + len - liftY); p.lineTo(lx - 1.5 + swing + k * 0.5, -3.2 + len - liftY + 0.5); });
  };
  // Far legs first, a shade darker.
  ctx.save(); ctx.globalAlpha *= 0.85;
  leg(-3.2, Math.PI); leg(5.2, 0);
  ctx.restore();
  // Tail: ringed, tapering, curling forward as it tucks.
  ctx.save();
  ctx.translate(7.2, -3.8);
  ctx.rotate(c * 1.6);
  ink(ctx, pal.shell, (p) => { p.moveTo(0, -1.1); p.quadraticCurveTo(3.6, -0.6, 6.4, 1.8); p.lineTo(6.2, 2.3); p.quadraticCurveTo(3.2, 0.9, 0, 1.1); p.closePath(); }, 0.28);
  for (let k = 1; k < 5; k++) strokePath(ctx, pal.band, 0.35, (p) => { p.moveTo(k * 1.3, -0.7 + k * 0.28); p.lineTo(k * 1.3 - 0.2, 0.9 + k * 0.2); });
  ctx.restore();
  // Head: long snout, head shield, big ears — folding down and in as it tucks.
  ctx.save();
  ctx.translate(-5.6, -5);
  ctx.rotate(-c * 1.3 + Math.sin(step * 0.5) * 0.04 * (1 - c));
  ink(ctx, pal.skin, (p) => { p.moveTo(0.4, -1.8); p.quadraticCurveTo(-3.4, -1.9, -6.4, 0.6); p.quadraticCurveTo(-6.6, 1.3, -5.8, 1.3); p.quadraticCurveTo(-2.6, 1.5, 0.6, 1.6); p.closePath(); }, 0.3);
  fillPath(ctx, pal.scale, (p) => { p.moveTo(0.2, -1.8); p.quadraticCurveTo(-2.4, -2.1, -4, -0.9); p.quadraticCurveTo(-2, -0.9, 0.4, -0.6); p.closePath(); });
  fillPath(ctx, pal.skinDark, circle(-6.2, 0.7, 0.4));
  for (const [ex, ey, rot] of [[-0.6, -1.9, -0.25], [0.6, -1.7, 0.1]]) {
    ink(ctx, pal.skin, (p) => p.ellipse(ex, ey - 1.6, 0.9, 1.9, rot, 0, TAU), 0.26);
    fillPath(ctx, pal.ear, (p) => p.ellipse(ex + 0.1, ey - 1.5, 0.45, 1.3, rot, 0, TAU));
  }
  fillPath(ctx, pal.eye, circle(-2.4, -0.5, 0.42));
  fillPath(ctx, '#ffffff', circle(-2.55, -0.65, 0.14));
  ctx.restore();
  // The carapace: shields front and back, the flexible bands between.
  const lift = c * 1.4;
  ink(ctx, pal.shell, (p) => dilloShellPath(p, lift), 0.34);
  ctx.save();
  ctx.beginPath(); dilloShellPath(ctx, lift); ctx.clip();
  for (let k = 0; k < 7; k++) {
    const bx = -2.2 + k * 0.95;
    fillPath(ctx, k % 2 ? pal.band : pal.scale, (p) => { p.moveTo(bx, -12); p.lineTo(bx + 0.62, -12); p.quadraticCurveTo(bx + 1.1, -6, bx + 0.7, -2); p.lineTo(bx + 0.1, -2); p.quadraticCurveTo(bx + 0.5, -6, bx, -12); p.closePath(); });
  }
  // Scale texture on the shields.
  for (let i = 0; i < 18; i++) {
    const sx = i < 9 ? -6 + (i % 3) * 1.3 + Math.floor(i / 3) * 0.2 : 4.4 + (i % 3) * 1.1;
    const sy = -4.4 - Math.floor((i % 9) / 3) * 1.5;
    fillPath(ctx, pal.band, circle(sx, sy - lift * 0.5, 0.33));
  }
  fillPath(ctx, pal.lit, (p) => { p.moveTo(-5.2, -7.4 - lift); p.bezierCurveTo(-3, -9.8 - lift, 3.4, -10.2 - lift, 5.8, -7.6 - lift); p.bezierCurveTo(3.4, -9.0 - lift, -3, -8.8 - lift, -5.2, -7.4 - lift); p.closePath(); });
  fillPath(ctx, rgba(pal.shadow, 0.5), box(-7, -4.6 - lift * 0.4, 15, 1.6));
  ctx.restore();
  // Near legs over the skirt.
  leg(-4.4, 0); leg(4.2, Math.PI);
}
function drawDilloBall(ctx, t, pal, roll) {
  const r = 5.7;
  ink(ctx, pal.shell, circle(0, -r, r), 0.36);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, -r, r, 0, TAU); ctx.clip();
  ctx.save();
  ctx.translate(0, -r);
  ctx.rotate(roll);
  // Bands wrapped round the ball, the head shield and tail tip meeting at the seam.
  for (let k = -4; k <= 4; k++) {
    fillPath(ctx, k % 2 ? pal.band : pal.scale, (p) => { const d = k * 1.25; p.moveTo(d - 0.42, -r); p.quadraticCurveTo(d * 1.18, 0, d - 0.42, r); p.lineTo(d + 0.42, r); p.quadraticCurveTo(d * 1.18 + 0.8, 0, d + 0.42, -r); p.closePath(); });
  }
  // Where head and tail meet: the head shield, an ear folded flat, the ringed tail
  // wrapped over them — the marks that say this ball is an armadillo.
  ctx.save();
  ctx.rotate(0.7);
  fillPath(ctx, pal.skin, (p) => p.ellipse(0, r - 1.5, 2.3, 1.3, 0, 0, TAU));
  fillPath(ctx, pal.scale, (p) => { p.moveTo(-1.9, r - 1.2); p.quadraticCurveTo(0, r - 4.2, 1.9, r - 1.2); p.closePath(); });
  for (let k = 0; k < 3; k++) fillPath(ctx, pal.band, circle(-0.8 + k * 0.8, r - 2.2, 0.28));
  fillPath(ctx, pal.ear, (p) => p.ellipse(2.4, r - 2.4, 0.7, 1.5, 0.9, 0, TAU));
  strokePath(ctx, pal.shadow, 0.3, (p) => p.ellipse(2.4, r - 2.4, 0.7, 1.5, 0.9, 0, TAU));
  strokePath(ctx, pal.shell, 1.3, (p) => { p.moveTo(-4.4, r - 2.2); p.quadraticCurveTo(-2, r - 0.2, 1, r - 0.6); });
  for (let k = 0; k < 4; k++) strokePath(ctx, pal.band, 0.3, (p) => { const u = k / 4; const bx = -4 + u * 4.6; const by = r - 1.9 + Math.sin(u * Math.PI) * 1.3; p.moveTo(bx, by - 0.6); p.lineTo(bx + 0.2, by + 0.6); });
  ctx.restore();
  ctx.restore();
  // Fixed lighting over the turning pattern: sun upper right, shade lower left.
  fillPath(ctx, rgba(pal.lit, 0.55), (p) => p.ellipse(1.6, -r - 2.4, 3.2, 1.7, -0.6, 0, TAU));
  fillPath(ctx, rgba(pal.shadow, 0.45), (p) => { p.arc(0, -r, r, 0.35 * Math.PI, 1.15 * Math.PI); p.arc(0.8, -r - 0.8, r * 0.95, 1.1 * Math.PI, 0.4 * Math.PI, true); p.closePath(); });
  ctx.restore();
}
function armadillo(ctx, t, x, g) {
  ctx.save();
  const u = ((t % DILLO_PERIOD) + DILLO_PERIOD) % DILLO_PERIOD;
  const curl = u < 1.7 ? 0 : u < 2.1 ? smooth(1.7, 2.1, u) : u < 3.8 ? 1 : 1 - smooth(3.8, 4.2, u);
  const rolling = u >= 2.05 && u < 3.85;
  const rollT = u - 2.05;
  // Rolling, it hops over the joins in the road.
  const hop = rolling ? Math.abs(Math.sin(rollT * 7)) * 0.9 : 0;
  contactShadow(ctx, x, g - 0.2, rolling ? 7 : 9.8, 1.6, 0.34);
  ctx.translate(x, g - hop);
  ctx.scale(1.3, 1.3);
  if (curl < 0.7 || !rolling) {
    ctx.save();
    ctx.globalAlpha *= 1 - smooth(0.55, 0.95, curl);
    drawDilloWalking(ctx, t, DILLO, curl);
    ctx.restore();
  }
  if (curl > 0.55) {
    ctx.save();
    ctx.globalAlpha *= smooth(0.55, 0.95, curl);
    drawDilloBall(ctx, t, DILLO, rolling ? -rollT * 9 : -0.4);
    ctx.restore();
    if (rolling) {
      const dust = { base: '#d8b28a', lit: '#f4dcb4', shadow: '#aa8a6c' };
      for (let q = 0; q < 3; q++) {
        const ph = fract(t * 2.6 + q / 3);
        dustPuff(ctx, 5 + ph * 9, -1 - ph * 3.5 - q * 0.4, 0.9 + ph * 2.6, 0.5 * (1 - ph), dust);
      }
      strokePath(ctx, rgba('#fff2d8', 0.55), 0.4, (c) => { c.moveTo(7, -8.5); c.lineTo(12, -8.3); c.moveTo(7.6, -5.4); c.lineTo(13.4, -5.2); });
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- longhorn skull
// A bleached steer skull nailed to a fence post, horns sweeping wide, a red rag tied
// under it snapping in the wind, a loose end of barbed wire — and a little lizard that
// darts up the post and back. Breakable: boot the post and the lot comes down.
const SKULL = {
  bone: '#f0e6d0', boneLit: '#fffaf0', boneShade: '#c8b695', hole: '#3b2a22', horn: '#e9dcc0',
  hornTip: '#6a5540', post: '#8b7866', postLit: '#cdb89e', postDark: '#5b4d40', rag: '#c8352c',
  ragLit: '#ee6454', wire: '#6f6c6a', lizard: '#7f8c4a', lizardDark: '#56602e',
};
function longhornSkull(ctx, t, x, g) {
  ctx.save();
  const P = SKULL;
  contactShadow(ctx, x, g - 0.2, 4.6, 1.3, 0.34);
  ctx.translate(x, g);
  // Post: split and weathered, lit on the sun side, a dark crack down it.
  ink(ctx, P.post, poly([-1.8, 0, 1.8, 0, 1.6, -12.2, -1.6, -12.6]), 0.3);
  fillPath(ctx, P.postLit, poly([0.9, 0, 1.8, 0, 1.6, -12.2, 0.8, -12.3]));
  fillPath(ctx, P.postDark, poly([-1.8, 0, -1.1, 0, -1.0, -12.5, -1.6, -12.6]));
  strokePath(ctx, P.postDark, 0.25, (c) => { c.moveTo(-0.2, -1); c.lineTo(0.1, -5); c.lineTo(-0.3, -9); });
  // A loose end of barbed wire wrapped round the post.
  strokePath(ctx, P.wire, 0.3, (c) => {
    c.moveTo(-1.8, -6.2); c.lineTo(1.8, -5.6); c.quadraticCurveTo(5, -5.6, 6.2, -3.2); c.quadraticCurveTo(6.8, -1.6, 5.4, -1.2);
  });
  strokePath(ctx, P.wire, 0.22, (c) => {
    for (const [bx, by] of [[3.4, -5.4], [5.8, -3.8]]) { c.moveTo(bx - 0.6, by - 0.6); c.lineTo(bx + 0.6, by + 0.6); c.moveTo(bx + 0.6, by - 0.6); c.lineTo(bx - 0.6, by + 0.6); }
  });
  // The lizard: out from behind the post, up, pause, and back down.
  const lz = fract(t / 3.1);
  const climb = lz < 0.25 ? smooth(0, 0.25, lz) : lz < 0.55 ? 1 : lz < 0.8 ? 1 - smooth(0.55, 0.8, lz) : 0;
  if (lz > 0.02 && lz < 0.82) {
    const ly = -1.5 - climb * 7;
    ctx.save();
    ctx.translate(-1.9, ly);
    ctx.rotate(-Math.PI / 2 + (lz > 0.55 ? Math.PI : 0));
    fillPath(ctx, P.lizard, (c) => { c.ellipse(0, 0, 1.6, 0.55, 0, 0, TAU); });
    strokePath(ctx, P.lizard, 0.35, (c) => { c.moveTo(-1.4, 0); c.quadraticCurveTo(-2.8, 0.8 * Math.sin(t * 20), -3.8, 0.2); });
    fillPath(ctx, P.lizard, circle(1.9, 0, 0.55));
    strokePath(ctx, P.lizardDark, 0.25, (c) => { c.moveTo(0.8, -0.4); c.lineTo(1.2, -1.1); c.moveTo(0.8, 0.4); c.lineTo(1.2, 1.1); c.moveTo(-0.8, -0.4); c.lineTo(-1.2, -1.1); c.moveTo(-0.8, 0.4); c.lineTo(-1.2, 1.1); });
    ctx.restore();
  }
  // The rag, knotted round the post under the skull, streaming right.
  const flap = (s) => Math.sin(t * 9 - s * 1.4) * (0.2 + s * 0.35);
  fillPath(ctx, P.rag, box(-1.9, -11.6, 3.8, 1.5, 0.4));
  fillPath(ctx, P.rag, (c) => {
    c.moveTo(1.6, -11.4);
    for (let s = 0; s <= 5; s++) c.lineTo(1.6 + s * 1.2, -11.3 + flap(s) + s * 0.15);
    for (let s = 5; s >= 0; s--) c.lineTo(1.6 + s * 1.2, -10.1 + flap(s) + s * 0.3 - s * 0.05);
    c.closePath();
  });
  fillPath(ctx, P.ragLit, box(-1.9, -11.6, 3.8, 0.45));
  // Horns: out wide and up at the tips, darkening to the points.
  for (const side of [-1, 1]) {
    ink(ctx, P.horn, (c) => {
      c.moveTo(side * 2.2, -16.6);
      c.bezierCurveTo(side * 7, -18.2, side * 11.5, -16.6, side * 13.4, -20.6);
      c.bezierCurveTo(side * 11.8, -18.6, side * 7.4, -15.6, side * 2.6, -15.0);
      c.closePath();
    }, 0.3);
    fillPath(ctx, P.hornTip, (c) => {
      c.moveTo(side * 11.1, -17.5); c.bezierCurveTo(side * 12.2, -17.9, side * 12.8, -18.8, side * 13.4, -20.6);
      c.bezierCurveTo(side * 12.4, -19.2, side * 11.6, -18.6, side * 10.6, -18.1); c.closePath();
    });
    strokePath(ctx, P.boneLit, 0.3, (c) => { c.moveTo(side * 3, -16.7); c.bezierCurveTo(side * 7, -17.9, side * 10.4, -16.8, side * 11.6, -18.2); });
  }
  // Skull: broad crown, long face narrowing to the muzzle, dark sockets and nasal.
  ink(ctx, P.bone, (c) => {
    c.moveTo(-3.6, -17.6); c.quadraticCurveTo(0, -18.6, 3.6, -17.6);
    c.quadraticCurveTo(3.8, -15.2, 2.6, -14.4); c.quadraticCurveTo(2.2, -12, 1.5, -10.4);
    c.quadraticCurveTo(0, -9.8, -1.5, -10.4); c.quadraticCurveTo(-2.2, -12, -2.6, -14.4);
    c.quadraticCurveTo(-3.8, -15.2, -3.6, -17.6); c.closePath();
  }, 0.32);
  fillPath(ctx, P.boneShade, (c) => { c.moveTo(-3.6, -17.4); c.quadraticCurveTo(-3.6, -15.2, -2.6, -14.4); c.quadraticCurveTo(-2.2, -12, -1.5, -10.4); c.lineTo(-1, -10.6); c.quadraticCurveTo(-1.8, -13, -2.2, -15); c.closePath(); });
  fillPath(ctx, P.boneLit, (c) => { c.moveTo(-2.4, -17.8); c.quadraticCurveTo(0.4, -18.5, 3, -17.6); c.quadraticCurveTo(0.6, -17.6, -2.4, -17.2); c.closePath(); });
  fillPath(ctx, P.hole, (c) => c.ellipse(-1.45, -15.5, 0.85, 1.05, -0.3, 0, TAU));
  fillPath(ctx, P.hole, (c) => c.ellipse(1.45, -15.5, 0.85, 1.05, 0.3, 0, TAU));
  fillPath(ctx, P.hole, (c) => { c.moveTo(-0.7, -11.9); c.quadraticCurveTo(0, -13.2, 0.7, -11.9); c.lineTo(0, -10.9); c.closePath(); });
  strokePath(ctx, P.boneShade, 0.22, (c) => { c.moveTo(0.1, -17.6); c.lineTo(-0.3, -16.2); c.lineTo(0.2, -14.8); });
  // Glint running along the right horn now and then.
  const gl = fract(t / 2.6);
  if (gl < 0.14) {
    const k2 = gl / 0.14;
    const gx = lerp(4, 12.6, k2), gy = lerp(-17.2, -19.6, k2 * k2);
    const a = Math.sin(k2 * Math.PI);
    strokePath(ctx, rgba('#ffffff', a), 0.3, (c) => { c.moveTo(gx - 1.6, gy); c.lineTo(gx + 1.6, gy); c.moveTo(gx, gy - 1.6); c.lineTo(gx, gy + 1.6); });
    fillPath(ctx, rgba('#ffffff', a), circle(gx, gy, 0.4));
  }
  ctx.restore();
}

// ---------------------------------------------------------------- stunt ramp
// A plywood kicker with a steel lip, racing-red flanks and chevrons chasing up them,
// bulbs along the deck and a chequered flag at the top. Run up it and launch — hit it
// on a BOOST and you clear the whole next screen.
const RAMP = {
  deck: '#d9b278', deckLit: '#f3d59c', deckEdge: '#9c7446', side: '#cf3b2c', sideLit: '#ea6048',
  sideDark: '#8f2820', chevron: '#fff4dc', chevronDim: '#e7a898', frame: '#5a4838', lip: '#9aa2aa',
  lipLit: '#e4e9ee', bulb: '#ffe28a', bulbOff: '#8a6a3a', pole: '#3d3a38',
};
function stuntRamp(ctx, t, x, g) {
  ctx.save();
  const P = RAMP;
  contactShadow(ctx, x - 1, g - 0.2, 15, 1.7, 0.34);
  ctx.translate(x, g);
  const x0 = -16, x1 = 12, h = 11;
  const deckY = (xx) => -h * (xx - x0) / (x1 - x0);
  // Back frame: studs and a brace under the high end.
  fillPath(ctx, P.frame, box(x1 - 1.2, -h, 1.8, h));
  strokePath(ctx, P.frame, 0.9, (c) => { c.moveTo(x1 - 0.4, -1); c.lineTo(x1 - 8, deckY(x1 - 8) + 1); });
  // Flank: the painted triangle.
  ink(ctx, P.side, poly([x0, 0, x1, -h, x1, 0]), 0.34);
  fillPath(ctx, P.sideDark, poly([x0 + 2, 0, x1, 0, x1, -1.3, x0 + 4.4, -1.3]));
  fillPath(ctx, P.sideLit, poly([x0 + 1.4, -0.9, x1 - 0.6, -h + 0.9, x1 - 0.6, -h + 1.9, x0 + 3.2, -0.9]));
  // Chevrons chasing up the flank, one lit at a time with a trail behind it.
  const lead = fract(t * 1.6) * 5;
  for (let k = 0; k < 4; k++) {
    const cxk = x0 + 7 + k * 5.2;
    const cyk = deckY(cxk) * 0.46 - 0.4;
    const d = lead - k;
    const on = d >= 0 && d < 1 ? 1 : d >= 1 && d < 2 ? 0.45 : 0;
    const col = on > 0.9 ? P.chevron : on > 0.3 ? mix(P.chevronDim, P.chevron, 0.5) : P.chevronDim;
    fillPath(ctx, col, poly([cxk - 1.8, cyk - 2.4, cxk + 0.2, cyk - 2.4 + 1, cxk + 1.6, cyk, cxk + 0.2, cyk + 1.4, cxk - 1.8, cyk + 1.4, cxk - 0.4, cyk]));
  }
  // Deck: the plywood top seen just from above, planked, lit, with a dark edge.
  fillPath(ctx, P.deck, poly([x0, 0, x1, -h, x1 + 0.8, -h - 1.7, x0 + 0.4, -1.3]));
  fillPath(ctx, P.deckLit, poly([x0 + 0.4, -1.3, x1 + 0.8, -h - 1.7, x1 + 0.6, -h - 1.1, x0 + 0.3, -0.9]));
  strokePath(ctx, P.deckEdge, 0.4, (c) => { c.moveTo(x0, 0); c.lineTo(x1, -h); });
  strokePath(ctx, rgba('#7a5a36', 0.45), 0.22, (c) => {
    for (let k = 1; k < 6; k++) { const px = x0 + k * 4.6; c.moveTo(px, deckY(px)); c.lineTo(px + 0.5, deckY(px) - 1.4); }
  });
  // Steel lip at the top.
  ink(ctx, P.lip, poly([x1 - 1, -h - 0.4, x1 + 2.6, -h - 1.6, x1 + 2.8, -h - 0.6, x1 - 0.6, -h + 0.7]), 0.3);
  fillPath(ctx, P.lipLit, poly([x1 - 1, -h - 0.4, x1 + 2.6, -h - 1.6, x1 + 2.6, -h - 1.2, x1 - 1, -h]));
  // Bulbs along the deck edge, chasing up.
  const chase = Math.floor(t * 10);
  for (let k = 0; k < 9; k++) {
    const bx = x0 + 2 + k * 3.1;
    const by = deckY(bx) + 0.9;
    const on = (((k - chase) % 3) + 3) % 3 === 0;
    fillPath(ctx, on ? P.bulb : P.bulbOff, circle(bx, by, 0.5));
    if (on) glow(ctx, bx, by, 2.2, '#ffe28a', 0.55);
  }
  // Chequered flag on a pole at the top, snapping.
  const fx = x1 + 0.4, fy = -h - 9;
  fillPath(ctx, P.pole, box(fx - 0.35, fy, 0.7, 8.4));
  ctx.save();
  ctx.beginPath();
  const wv = (s) => Math.sin(t * 10 - s * 1.2) * 0.45 * s / 5;
  ctx.moveTo(fx + 0.3, fy + 0.2);
  for (let s = 0; s <= 5; s++) ctx.lineTo(fx + 0.3 + s * 1.2, fy + 0.2 + wv(s));
  for (let s = 5; s >= 0; s--) ctx.lineTo(fx + 0.3 + s * 1.2, fy + 3.6 + wv(s));
  ctx.closePath();
  ctx.fillStyle = '#f4f1ea'; ctx.fill();
  ctx.clip();
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
    if ((i + j) % 2) continue;
    fillPath(ctx, '#1e1c22', box(fx + 0.3 + i * 1.2, fy + 0.2 + j * 1.13 + wv(i + 0.5) - 0.1, 1.2, 1.13));
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- ranch wire (slide)
// Two fence posts with barbed wire strung across the lane at head height, the lower
// strands cut and dangling out of the way: SLIDE under the top ones. Red rags tied on
// the lowest strand flutter so it reads at speed; a tin can swings from it.
const WIRE = {
  post: '#8b7866', postLit: '#d0bb9f', postDark: '#5b4d40', wire: '#5e5a58', wireLit: '#b8b2aa',
  rag: '#d23c2c', ragLit: '#f07058', can: '#9aa0a6', canLit: '#e4e8ec', canBand: '#c8402e',
};
function ranchWire(ctx, t, x, g) {
  ctx.save();
  const P = WIRE;
  const posts = [-12.5, 12.5];
  for (const px of posts) contactShadow(ctx, x + px, g - 0.2, 2.6, 1.1, 0.32);
  ctx.translate(x, g);
  const strandY = [-26, -21, -16];
  // Posts, leaning a hair, weathered.
  for (const [i, px] of posts.entries()) {
    const lean = i ? 0.8 : -0.6;
    ink(ctx, P.post, poly([px - 1.5, 0, px + 1.5, 0, px + 1.3 + lean, -28, px - 1.3 + lean, -28.4]), 0.3);
    fillPath(ctx, P.postLit, poly([px + 0.7, 0, px + 1.5, 0, px + 1.3 + lean, -28, px + 0.6 + lean, -28.1]));
    fillPath(ctx, P.postDark, poly([px - 1.5, 0, px - 0.9, 0, px - 0.8 + lean, -28.3, px - 1.3 + lean, -28.4]));
  }
  // Cut strands dangling from both posts, curled at the ends.
  strokePath(ctx, P.wire, 0.32, (c) => {
    c.moveTo(-11.2, -10.5); c.quadraticCurveTo(-8.4, -9.6, -8.6, -5.4); c.quadraticCurveTo(-8.8, -3, -7.2, -3.4);
    c.moveTo(11.4, -6); c.quadraticCurveTo(8.6, -5, 9.2, -2); c.quadraticCurveTo(9.6, -0.6, 8.2, -0.8);
  });
  // The three live strands, sagging and trembling, with twisted barbs.
  const trem = (i) => Math.sin(t * 13 + i * 2.1) * 0.2;
  const sagY = (i, u) => strandY[i] + (1.4 + i * 0.3) * 4 * u * (1 - u) + trem(i) * Math.sin(u * Math.PI);
  for (let i = 0; i < 3; i++) {
    strokePath(ctx, P.wire, 0.48, (c) => {
      for (let k = 0; k <= 20; k++) { const u = k / 20; const px = lerp(-11.5, 11.5, u); k ? c.lineTo(px, sagY(i, u)) : c.moveTo(px, sagY(i, u)); }
    });
    strokePath(ctx, P.wireLit, 0.14, (c) => {
      for (let k = 0; k <= 20; k++) { const u = k / 20; const px = lerp(-11.5, 11.5, u); k ? c.lineTo(px, sagY(i, u) - 0.12) : c.moveTo(px, sagY(i, u) - 0.12); }
    });
    strokePath(ctx, P.wire, 0.28, (c) => {
      for (let k = 1; k < 9; k++) {
        const u = k / 9; const bx = lerp(-11.5, 11.5, u); const by = sagY(i, u);
        c.moveTo(bx - 0.7, by - 0.7); c.lineTo(bx + 0.7, by + 0.7); c.moveTo(bx + 0.7, by - 0.7); c.lineTo(bx - 0.7, by + 0.7);
      }
    });
  }
  // Rags knotted on the strands, streaming out on the wind and snapping.
  for (const [u, ph, i] of [[0.2, 0, 2], [0.48, 1.7, 2], [0.76, 3.1, 2], [0.34, 2.4, 0]]) {
    const rx = lerp(-11.5, 11.5, u), ry = sagY(i, u);
    const f = (s) => Math.sin(t * 12 + ph - s * 1.5) * 0.28 * s;
    fillPath(ctx, P.rag, (c) => {
      c.moveTo(rx, ry - 0.55);
      for (let s = 1; s <= 4; s++) c.lineTo(rx + s * 1.05, ry - 0.55 + f(s) + s * 0.12);
      for (let s = 4; s >= 1; s--) c.lineTo(rx + s * 1.05, ry + 0.55 + f(s) + s * 0.22 - (s === 4 ? 0.4 : 0));
      c.lineTo(rx, ry + 0.55);
      c.closePath();
    });
    fillPath(ctx, P.ragLit, box(rx - 0.4, ry - 0.7, 1.1, 1.4, 0.4));
  }
  // A tin can on a twist of wire, swinging.
  const cu = 0.64, cx0 = lerp(-11.5, 11.5, cu), cy0 = sagY(1, cu);
  const swing = Math.sin(t * 3.4) * 0.32;
  ctx.save();
  ctx.translate(cx0, cy0);
  ctx.rotate(swing);
  strokePath(ctx, P.wire, 0.22, (c) => { c.moveTo(0, 0); c.lineTo(0, 1.6); });
  ink(ctx, P.can, box(-1.1, 1.6, 2.2, 2.8, 0.4), 0.24);
  fillPath(ctx, P.canLit, box(0.3, 1.8, 0.5, 2.4));
  fillPath(ctx, P.canBand, box(-1.1, 2.5, 2.2, 0.8));
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- tyre stack
// A stack of race-circuit tyres, painted red and white, a pennant stuck in the top —
// and it's BOUNCY: every so often it boings as if something just landed on it. Land
// on it yourself and it springs you high; run into it and the stack goes everywhere.
const TYRE = {
  rubber: '#2b2729', rubberLit: '#625a5c', rubberDark: '#141113', red: '#d23a2e', redLit: '#f27a62',
  redDark: '#8a2119', white: '#eeeae2', whiteLit: '#ffffff', whiteDark: '#a9a399', hole: '#0f0d0e',
  pennant: '#ffb02e', pennantDark: '#d9801a', stick: '#5a4838',
};
// One tyre as a squat torus seen a little from above: rounded shoulders, a tread face
// with blocks that foreshorten round the curve, and the donut top with its dark hole.
function tyre(ctx, cx, yb, h, fill, lit, dark, top = false) {
  const a = 6.6, b = 2.1;
  const yt = yb - h;
  const band = (c) => {
    c.moveTo(cx - a, yt);
    c.quadraticCurveTo(cx - a - 1.1, yt + h / 2, cx - a, yb);
    c.ellipse(cx, yb, a, b, 0, Math.PI, 0, true);
    c.quadraticCurveTo(cx + a + 1.1, yt + h / 2, cx + a, yt);
    c.ellipse(cx, yt, a, b, 0, 0, Math.PI, false);
    c.closePath();
  };
  ink(ctx, fill, band, 0.34);
  ctx.save();
  ctx.beginPath(); band(ctx); ctx.clip();
  // Tread: two offset rows of blocks, narrowing toward the sides.
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 12; k++) {
      const th = Math.PI * ((k + (row ? 0.5 : 0) + 0.25) / 12);
      const bx = cx + Math.cos(th) * a;
      const w = 0.95 * Math.sin(th);
      const by = yt + Math.sin(th) * b + 0.55 + row * (h * 0.46);
      fillPath(ctx, rgba('#000000', 0.26), box(bx - w / 2, by, w, h * 0.34));
    }
  }
  // Round shading: the shoulder turned to the sky lit, the underside and left dark.
  fillPath(ctx, rgba(lit, 0.55), (c) => { c.ellipse(cx + 1.5, yt + b * 0.9 + 0.4, a * 0.72, 0.7, 0, 0, TAU); });
  fillPath(ctx, rgba(dark, 0.6), (c) => { c.ellipse(cx, yb + b * 0.95, a + 1, 1.2, 0, 0, TAU); });
  fillPath(ctx, rgba(dark, 0.55), box(cx - a - 1.2, yt - b, 2.4, h + b * 2));
  fillPath(ctx, rgba(lit, 0.5), box(cx + a - 2.4, yt - b, 1.1, h + b * 2));
  ctx.restore();
  if (top) {
    // Donut top: sidewall ring lit toward the sun, the hole dark.
    ink(ctx, fill, (c) => c.ellipse(cx, yt, a, b, 0, 0, TAU), 0.3);
    fillPath(ctx, lit, (c) => { c.ellipse(cx, yt, a, b, 0, Math.PI * 1.08, Math.PI * 1.92); c.ellipse(cx, yt - 0.25, a * 0.78, b * 0.72, 0, Math.PI * 1.92, Math.PI * 1.08, true); c.closePath(); });
    fillPath(ctx, TYRE.hole, (c) => c.ellipse(cx, yt + 0.12, a * 0.5, b * 0.52, 0, 0, TAU));
    fillPath(ctx, rgba(dark, 0.9), (c) => { c.ellipse(cx, yt + 0.12, a * 0.5, b * 0.52, 0, Math.PI, TAU); c.closePath(); });
  }
}
function tyreStack(ctx, t, x, g) {
  ctx.save();
  const P = TYRE;
  // The boing: a damped spring kicked every 2.4 s.
  const u = ((t % 2.4) + 2.4) % 2.4;
  const kick = u > 1.5 ? Math.exp(-(u - 1.5) * 5) * Math.sin((u - 1.5) * 22) : 0;
  contactShadow(ctx, x, g - 0.2, 7.6 * (1 + kick * 0.06), 1.8, 0.36);
  ctx.translate(x, g);
  ctx.scale(1 + kick * 0.07, 1 - kick * 0.14);
  const H = 3.9;
  tyre(ctx, 0, -0.9, H, P.rubber, P.rubberLit, P.rubberDark);
  tyre(ctx, 0.5, -0.9 - H, H, P.red, P.redLit, P.redDark);
  tyre(ctx, -0.4, -0.9 - 2 * H, H, P.white, P.whiteLit, P.whiteDark, true);
  // Pennant stuck down the middle of the top tyre, fluttering.
  const px = 0.6, py = -0.9 - 3 * H + 0.2;
  strokePath(ctx, P.stick, 0.45, (c) => { c.moveTo(px, py + 0.4); c.lineTo(px + 0.5, py - 9); });
  const w = Math.sin(t * 9) * 0.6;
  fillPath(ctx, P.pennant, (c) => {
    c.moveTo(px + 0.5, py - 9); c.quadraticCurveTo(px + 3.2, py - 8.6 + w, px + 5.8, py - 7.7 + w * 1.4);
    c.quadraticCurveTo(px + 3.2, py - 7.1 + w, px + 0.45, py - 6.4); c.closePath();
  });
  fillPath(ctx, P.pennantDark, (c) => { c.moveTo(px + 0.45, py - 6.4); c.quadraticCurveTo(px + 3.2, py - 7.1 + w, px + 5.8, py - 7.7 + w * 1.4); c.quadraticCurveTo(px + 3.2, py - 6.6 + w, px + 0.45, py - 6.4); c.closePath(); });
  ctx.restore();
}

// ---------------------------------------------------------------- ground cuckoo
// The desert's sprinter — a lean streaky ground-cuckoo, crest up and tail streaming,
// legs a blur wheel, bolting straight down the lane at you in a spray of dust. Fast:
// jump it, or stomp it for the coins it drops.
const CUCKOO = {
  back: '#7a5b42', streak: '#e3cfae', dark: '#43321f', belly: '#ebdcbf', crest: '#3f2f22',
  bill: '#3a3432', leg: '#6d7d90', legDark: '#4f5d6e', patchBlue: '#9fcbea', patchRed: '#e3643a', eye: '#1a1210',
};
function groundCuckoo(ctx, t, x, g) {
  ctx.save();
  const P = CUCKOO;
  const run = t * 15;
  const bob = Math.abs(Math.sin(run)) * 0.9;
  contactShadow(ctx, x + 1, g - 0.2, 6.8, 1.5, 0.34);
  // Dust kicked up behind (to the right — it is running left).
  const dust = { base: '#d8b28a', lit: '#f4dcb4', shadow: '#aa8a6c' };
  for (let q = 0; q < 5; q++) {
    const ph = fract(t * 3 + q / 5);
    dustPuff(ctx, x + 4 + ph * 16, g - 1 - ph * 4 + (q % 2), 0.8 + ph * 2.8, 0.55 * (1 - ph), dust);
  }
  ctx.translate(x, g - bob);
  // Legs: the cartoon wheel — a blurred disc with three ghost legs round it.
  const hip = [1, -7.6];
  fillPath(ctx, rgba(P.leg, 0.1), circle(hip[0] - 0.4, -3.4, 3.9));
  for (let k = 0; k < 3; k++) {
    const a = -run * 1.2 + k * (TAU / 3);
    const fx = hip[0] - 0.4 + Math.cos(a) * 3.6, fy = -3.4 + Math.sin(a) * 3.6;
    const alpha = k === 0 ? 1 : 0.5;
    strokePath(ctx, rgba(k ? P.legDark : P.leg, alpha), 0.6, (c) => { c.moveTo(hip[0], hip[1]); c.quadraticCurveTo((hip[0] + fx) / 2 + 1.2, (hip[1] + fy) / 2, fx, fy); });
    strokePath(ctx, rgba(P.leg, alpha), 0.4, (c) => { c.moveTo(fx, fy); c.lineTo(fx - 1.3, fy + 0.4); c.moveTo(fx, fy); c.lineTo(fx + 1.1, fy + 0.5); });
  }
  strokePath(ctx, rgba('#fff2d8', 0.6), 0.35, (c) => c.arc(hip[0] - 0.4, -3.4, 4.3, -0.4, 1.1));
  // Tail: long, streaming back and flicking, white-tipped.
  const flick = Math.sin(t * 5.3) * 0.12;
  ctx.save();
  ctx.translate(4.8, -10);
  ctx.rotate(-0.42 + flick);
  ink(ctx, P.dark, (c) => {
    c.moveTo(0, -1.1); c.quadraticCurveTo(6, -2.1, 11.2, -2.7); c.lineTo(12.3, -1.4); c.lineTo(11.6, -0.3);
    c.lineTo(12.1, 0.7); c.lineTo(10.8, 1.3); c.quadraticCurveTo(5.6, 1.2, 0, 1.1); c.closePath();
  }, 0.3);
  fillPath(ctx, P.back, (c) => { c.moveTo(0, -0.8); c.quadraticCurveTo(5, -1.7, 9.6, -2.1); c.lineTo(9.7, -1.3); c.quadraticCurveTo(5, -0.8, 0, -0.1); c.closePath(); });
  fillPath(ctx, '#f6f0e4', poly([10.1, -2.5, 11.2, -2.7, 12.3, -1.4, 11.6, -0.3, 12.1, 0.7, 10.8, 1.3, 10.4, 0.2, 10.8, -1.1]));
  ctx.restore();
  // Body: lean and streaky, pitched forward into the sprint.
  ink(ctx, P.back, (c) => { c.moveTo(-5, -10.6); c.quadraticCurveTo(0, -13.4, 6.2, -10.8); c.quadraticCurveTo(4.4, -6.6, -1, -6.8); c.quadraticCurveTo(-4.6, -7.4, -5, -10.6); c.closePath(); }, 0.34);
  fillPath(ctx, P.belly, (c) => { c.moveTo(-4.6, -9.4); c.quadraticCurveTo(-3.6, -6.9, 0, -6.9); c.quadraticCurveTo(3.6, -7.1, 5.2, -9); c.quadraticCurveTo(1, -8, -4.6, -9.4); c.closePath(); });
  for (let k = 0; k < 6; k++) {
    const sx = -3.4 + k * 1.6, sy = -11.4 + Math.abs(k - 2.5) * 0.3;
    strokePath(ctx, P.streak, 0.35, (c) => { c.moveTo(sx, sy); c.lineTo(sx + 1.1, sy + 0.5); });
    strokePath(ctx, P.dark, 0.3, (c) => { c.moveTo(sx + 0.3, sy + 0.9); c.lineTo(sx + 1.2, sy + 1.3); });
  }
  // Folded wing with pale-edged coverts.
  ink(ctx, P.dark, (c) => { c.moveTo(-1.6, -10.4); c.quadraticCurveTo(3, -11.6, 5.6, -9.8); c.quadraticCurveTo(2.6, -8.6, -1.2, -9.2); c.closePath(); }, 0.26);
  strokePath(ctx, P.streak, 0.3, (c) => { c.moveTo(-0.6, -9.8); c.quadraticCurveTo(2.4, -10.6, 4.8, -9.9); });
  // Neck and head thrust forward, crest raised and fluttering, long straight bill.
  ink(ctx, P.back, (c) => { c.moveTo(-3.4, -10.8); c.quadraticCurveTo(-5.2, -12.4, -6.2, -13.6); c.lineTo(-7.8, -12.2); c.quadraticCurveTo(-6.4, -10.8, -4.6, -9.2); c.closePath(); }, 0.3);
  ink(ctx, P.back, (c) => c.ellipse(-7.4, -13.9, 2.1, 1.6, -0.15, 0, TAU), 0.3);
  const ruffle = Math.sin(t * 17) * 0.25;
  ink(ctx, P.crest, (c) => {
    c.moveTo(-8.4, -15); c.lineTo(-7.9, -18.2 + ruffle); c.lineTo(-7.4, -15.6); c.lineTo(-6.5, -18.4 - ruffle);
    c.lineTo(-6.2, -15.5); c.lineTo(-5, -17.4 + ruffle); c.lineTo(-5.4, -14.4); c.closePath();
  }, 0.26);
  ink(ctx, P.bill, (c) => { c.moveTo(-9.2, -14.4); c.lineTo(-14.6, -13.5); c.lineTo(-9.2, -13.1); c.closePath(); }, 0.22);
  // The bare patch behind the eye: blue fading to red.
  fillPath(ctx, P.patchBlue, (c) => c.ellipse(-6.3, -14.1, 1.1, 0.6, 0, 0, TAU));
  fillPath(ctx, P.patchRed, (c) => c.ellipse(-5.5, -14, 0.6, 0.5, 0, 0, TAU));
  fillPath(ctx, '#f4efe6', circle(-7.9, -14.3, 0.62));
  fillPath(ctx, P.eye, circle(-8.1, -14.3, 0.36));
  fillPath(ctx, '#ffffff', circle(-8.2, -14.45, 0.12));
  // Speed lines.
  strokePath(ctx, rgba('#fff2d8', 0.6), 0.38, (c) => {
    for (const [yy, len] of [[-15, 6], [-11.8, 9], [-8.6, 5]]) { c.moveTo(8.5, yy); c.lineTo(8.5 + len, yy + 0.2); }
  });
  ctx.restore();
}

// ================================================================== AIR

// ---------------------------------------------------------------- TV camera copter
// The race is being televised: a little news helicopter hangs at head height ahead of
// you, its camera locked on the hero, red tally lamp blinking. Rotor a blur, tail rotor
// spinning, nose dipped. Slide under it.
const COPTER = {
  body: '#d8392e', bodyLit: '#f06a55', bodyDark: '#8f2620', white: '#f4f1ea', glass: '#8fc8e4',
  glassLit: '#e4f6ff', steel: '#4a4f56', steelLit: '#a8b0b8', camera: '#24262b', lens: '#5ab0e0',
};
function cameraCopter(ctx, t, x, y) {
  ctx.save();
  const P = COPTER;
  const bob = Math.sin(t * 2.2) * 1.2;
  ctx.translate(x, y - 2 + bob);
  ctx.rotate(-0.07 + Math.sin(t * 1.3) * 0.03);
  // Tail boom, fin and the tail rotor's spinning disc.
  ink(ctx, P.body, poly([4.4, -2.2, 16.4, -2.6, 16.6, -1.2, 4.4, 0.6]), 0.3);
  fillPath(ctx, P.bodyLit, poly([4.4, -2.2, 16.4, -2.6, 16.4, -2.1, 4.4, -1.6]));
  ink(ctx, P.bodyDark, poly([15.2, -2.4, 16.6, -7.2, 18, -7.2, 17.2, -1.4]), 0.28);
  fillPath(ctx, rgba('#e8eef2', 0.3), circle(17.2, -3.6, 2.6));
  const tr = t * 60;
  strokePath(ctx, P.steel, 0.4, (c) => { c.moveTo(17.2 + Math.cos(tr) * 2.5, -3.6 + Math.sin(tr) * 2.5); c.lineTo(17.2 - Math.cos(tr) * 2.5, -3.6 - Math.sin(tr) * 2.5); });
  // Skids.
  strokePath(ctx, P.steel, 0.5, (c) => { c.moveTo(-6.4, 5.6); c.lineTo(4.4, 5.6); c.quadraticCurveTo(5.6, 5.6, 5.8, 4.6); c.moveTo(-3.2, 5.6); c.lineTo(-2.4, 3); c.moveTo(2.2, 5.6); c.lineTo(1.6, 3); });
  // Cabin: painted body with a white cheat-line and a station roundel.
  ink(ctx, P.body, (c) => { c.moveTo(-3, -4.6); c.quadraticCurveTo(3.4, -5.2, 5.2, -2.2); c.quadraticCurveTo(5.4, 1.4, 3, 3.4); c.lineTo(-4.4, 3.4); c.closePath(); }, 0.32);
  fillPath(ctx, P.white, poly([-3.6, -0.2, 5.4, -0.6, 5.3, 0.5, -3.8, 0.9]));
  fillPath(ctx, P.white, circle(1.6, 1.9, 1.15));
  strokePath(ctx, P.body, 0.38, (c) => { c.moveTo(1.1, 1.3); c.lineTo(2.1, 1.3); c.lineTo(1.4, 2.6); });
  fillPath(ctx, P.bodyLit, (c) => { c.moveTo(-1.6, -4.6); c.quadraticCurveTo(3.4, -5.1, 4.8, -2.8); c.quadraticCurveTo(2.6, -4.2, -1.4, -4.0); c.closePath(); });
  // Bubble canopy with the sky in it.
  ink(ctx, P.glass, (c) => c.ellipse(-4.4, -0.8, 4.2, 3.6, 0, 0, TAU), 0.3);
  fillPath(ctx, P.glassLit, (c) => c.ellipse(-5.2, -2.2, 1.8, 0.9, -0.5, 0, TAU));
  fillPath(ctx, rgba('#1d3344', 0.5), circle(-3.2, -0.6, 1.2));    // the pilot
  // Mast and the main rotor: a translucent disc with two blades sweeping it.
  fillPath(ctx, P.steel, box(0, -6.8, 1.2, 2.4));
  fillPath(ctx, rgba('#eef3f6', 0.22), (c) => c.ellipse(0.6, -7, 13, 1.5, 0, 0, TAU));
  const ra = t * 31;
  for (const s of [0, Math.PI]) {
    const bx = Math.cos(ra + s) * 13, by = Math.sin(ra + s) * 1.5;
    strokePath(ctx, rgba(P.steel, 0.9), 0.55, (c) => { c.moveTo(0.6, -7); c.lineTo(0.6 + bx, -7 + by); });
    strokePath(ctx, rgba(P.steel, 0.3), 0.55, (c) => { c.moveTo(0.6, -7); c.lineTo(0.6 + Math.cos(ra + s - 0.35) * 13, -7 + Math.sin(ra + s - 0.35) * 1.5); });
  }
  fillPath(ctx, P.steelLit, circle(0.6, -7, 0.7));
  // Gimballed camera under the nose, aimed at the hero, tally lamp blinking.
  const aim = 0.35 + Math.sin(t * 0.9) * 0.08;
  ctx.save();
  ctx.translate(-3.8, 4);
  ctx.rotate(aim);
  ink(ctx, P.camera, box(-4.2, -1.4, 5, 2.8, 0.5), 0.28);
  ink(ctx, P.camera, box(-5.8, -1.1, 1.8, 2.2, 0.4), 0.24);
  fillPath(ctx, P.lens, (c) => c.ellipse(-5.9, 0, 0.5, 0.95, 0, 0, TAU));
  const sweep = fract(t * 0.45);
  if (sweep < 0.2) fillPath(ctx, rgba('#ffffff', Math.sin(sweep / 0.2 * Math.PI)), (c) => c.ellipse(-5.95, -0.3, 0.2, 0.45, 0, 0, TAU));
  const tally = fract(t * 1.3) < 0.55;
  fillPath(ctx, tally ? '#ff3030' : '#5a1616', circle(-0.6, -1.9, 0.5));
  if (tally) glow(ctx, -0.6, -1.9, 2.6, '#ff3030', 0.6);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- hubcap
// A chrome hubcap spun off something fast and skimming down the lane at head height,
// wobbling on its edge, spokes turning, the sunset sliding round its dish — and a
// glint every time the rim swings through the light. Slide under it.
function hubcap(ctx, t, x, y) {
  ctx.save();
  const spin = -t * 11;
  const wob = Math.sin(t * 3.1) * 0.1;
  const rx = 7.4, ry = 3.2;
  // Motion streaks behind it (it flies right to left).
  strokePath(ctx, rgba('#fff2d8', 0.55), 0.4, (c) => {
    for (const [dy, len, off] of [[-1.6, 7, 0], [0.4, 10, 1], [2.2, 6, 0.5]]) { c.moveTo(x + rx + 1 + off, y + dy); c.lineTo(x + rx + 1 + off + len, y + dy + 0.4); }
  });
  ctx.translate(x, y + Math.sin(t * 4.4) * 0.8);
  ctx.rotate(-0.3 + wob);
  // The lip: a thin edge band under the dish.
  fillPath(ctx, '#5e6268', (c) => { c.ellipse(0, 0.7, rx, ry, 0, 0, Math.PI); c.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true); c.closePath(); });
  // The dish: chrome as reflected bands — sky, bright horizon, dark land, warm road.
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
  const bands = [[-ry, '#f6a55a'], [-ry * 0.55, '#ffd49a'], [-ry * 0.22, '#fffaf0'], [ry * 0.02, '#4e4450'], [ry * 0.2, '#b97a52'], [ry * 0.6, '#8a5a44'], [ry, '#6a4638']];
  for (let i = 0; i < bands.length - 1; i++) fillPath(ctx, bands[i][1], box(-rx - 1, bands[i][0], rx * 2 + 2, bands[i + 1][0] - bands[i][0] + 0.05));
  // Slots turning with the spin.
  for (let k = 0; k < 5; k++) {
    const a = spin + (k / 5) * TAU;
    const p = (r, da) => [Math.cos(a + da) * rx * r, Math.sin(a + da) * ry * r];
    const [ax, ay] = p(0.36, -0.2), [bx, by] = p(0.82, -0.12), [cx, cy] = p(0.82, 0.12), [dx, dy] = p(0.36, 0.2);
    fillPath(ctx, rgba('#1e1a20', 0.75), poly([ax, ay, bx, by, cx, cy, dx, dy]));
  }
  ctx.restore();
  // Rim rings and the centre cap with its star.
  strokePath(ctx, '#7f858d', 0.8, (c) => c.ellipse(0, 0, rx, ry, 0, 0, TAU));
  strokePath(ctx, '#dfe4e8', 0.45, (c) => c.ellipse(0, 0, rx - 0.55, ry - 0.4, 0, 0, TAU));
  strokePath(ctx, rgba('#ffffff', 0.95), 0.4, (c) => c.ellipse(0, -0.05, rx - 0.3, ry - 0.2, 0, Math.PI * 1.08, Math.PI * 1.7));
  strokePath(ctx, rgba('#3a3036', 0.6), 0.35, (c) => c.ellipse(0, 0, rx - 0.3, ry - 0.2, 0, Math.PI * 0.15, Math.PI * 0.85));
  fillPath(ctx, '#d8dde2', (c) => c.ellipse(0, 0, rx * 0.3, ry * 0.3, 0, 0, TAU));
  fillPath(ctx, '#c8402e', (c) => { for (let k = 0; k < 5; k++) { const a = spin + k * (TAU / 5); const a2 = a + TAU / 10; c.lineTo(Math.cos(a) * rx * 0.24, Math.sin(a) * ry * 0.24); c.lineTo(Math.cos(a2) * rx * 0.1, Math.sin(a2) * ry * 0.1); } c.closePath(); });
  // The glint: a flare that fires when the spinning rim passes the specular angle.
  const spec = Math.cos(spin - 0.6);
  const flare = Math.max(0, spec) ** 14;
  if (flare > 0.05) {
    const gx = rx * 0.66, gy = -ry * 0.72;
    strokePath(ctx, rgba('#ffffff', flare), 0.35, (c) => { c.moveTo(gx - 3.2 * flare, gy); c.lineTo(gx + 3.2 * flare, gy); c.moveTo(gx, gy - 2.4 * flare); c.lineTo(gx, gy + 2.4 * flare); });
    glow(ctx, gx, gy, 3 * flare + 0.5, '#ffffff', 0.8 * flare);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- swooping vulture
// The backdrop's vultures are drawn NOT to read as hazards (soaring V, no hazard
// colour, rare flaps). This is the one that does: it drops out of the thermal to
// lane height — bald red head forward, talons down, wings pumping.
const VULTURE = {
  wing: '#3b2a26', wingDark: '#241917', wingLit: '#6b5448', quill: '#8a7466',
  body: '#33241f', ruff: '#e9ddc8', head: '#cf5a45', headLit: '#ef8a6a', beak: '#efe2b8',
  talon: '#d9b56a', eye: '#1a0f0c',
};
function vultureSwoop(ctx, t, x, y) {
  ctx.save();
  const P = VULTURE;
  // A slow swoop: dips and climbs across a 2.4 s cycle, pitched into the dive.
  const s = t * TAU / 2.4;
  const dy = Math.sin(s) * 3.2;
  const pitch = Math.cos(s) * 0.16;
  // Flap: fast strokes on the climb, a held V on the dip. Biased up, so the resting
  // pose is the raised dihedral rather than an edge-on sliver.
  const flap = 0.28 + 0.72 * Math.sin(t * 11) * (0.5 + 0.5 * Math.max(0, -Math.cos(s)));
  ctx.translate(x, y + dy);
  ctx.rotate(pitch);

  // Far wing (behind the body), darker, a touch behind the near shoulder.
  wing(ctx, [2.4, -1.4], flap * 0.92 + 0.08, P.wingDark, P.wingDark, P.body, false);
  // Tail fan, feather tips notched.
  ink(ctx, P.wing, (c) => {
    c.moveTo(5.0, -0.5); c.lineTo(9.6, -1.9); c.lineTo(10.3, -1.2); c.lineTo(10.0, -0.5);
    c.lineTo(10.7, 0.1); c.lineTo(10.2, 0.8); c.lineTo(10.6, 1.5); c.lineTo(9.4, 1.9); c.lineTo(5.0, 1.3);
    c.closePath();
  }, 0.3);
  strokePath(ctx, P.wingLit, 0.3, (c) => { c.moveTo(5.8, -0.3); c.lineTo(9.6, -1.4); });
  // Body.
  ink(ctx, P.body, oval(1.8, 0.4, 5.4, 2.6, -0.06), 0.34);
  fillPath(ctx, P.wingLit, oval(2.4, -0.9, 3.8, 0.9, -0.08));
  // Talons, swung forward and down for the grab.
  for (const [ox, a] of [[0.4, 0.5], [1.8, 0.35]]) {
    strokePath(ctx, P.talon, 0.62, (c) => { c.moveTo(ox, 2.2); c.lineTo(ox - 1.2, 4.6); });
    strokePath(ctx, P.talon, 0.42, (c) => {
      c.moveTo(ox - 1.2, 4.6); c.lineTo(ox - 2.3, 5.2 + a);
      c.moveTo(ox - 1.2, 4.6); c.lineTo(ox - 1.5, 5.7);
      c.moveTo(ox - 1.2, 4.6); c.lineTo(ox - 0.3, 5.5);
    });
  }
  // Pale ruff (a scalloped collar, not a ball), then the bare neck and the red head.
  ink(ctx, P.ruff, (c) => {
    c.moveTo(-1.2, -1.9); c.quadraticCurveTo(-2.6, -2.3, -3.6, -1.5);
    c.quadraticCurveTo(-4.3, -0.6, -3.7, 0.4); c.quadraticCurveTo(-3.2, 1.2, -2.2, 1.0);
    c.lineTo(-1.8, 1.5); c.lineTo(-1.2, 0.9); c.lineTo(-0.6, 1.3); c.lineTo(-0.5, 0.2);
    c.closePath();
  }, 0.28);
  fillPath(ctx, '#c9b9a0', (c) => { c.moveTo(-3.7, 0.1); c.quadraticCurveTo(-3.1, 1.1, -2.2, 1.0); c.lineTo(-1.8, 1.5); c.lineTo(-1.3, 0.6); c.quadraticCurveTo(-2.6, 0.7, -3.7, 0.1); c.closePath(); });
  strokePath(ctx, P.head, 1.3, (c) => { c.moveTo(-3.4, -0.5); c.quadraticCurveTo(-5.2, -1.6, -6.4, -1.4); });
  ink(ctx, P.head, oval(-6.9, -1.5, 1.8, 1.4, -0.2), 0.28);
  fillPath(ctx, P.headLit, oval(-7.0, -2.2, 1.0, 0.45, -0.2));
  ink(ctx, P.beak, (c) => { c.moveTo(-8.2, -1.9); c.quadraticCurveTo(-10.2, -1.9, -10.1, -0.5); c.quadraticCurveTo(-9.3, -1.1, -8.3, -0.7); c.closePath(); }, 0.24);
  fillPath(ctx, P.eye, circle(-7.2, -1.9, 0.42));
  fillPath(ctx, '#ffffff', circle(-7.3, -2.05, 0.14));
  // Near wing, in front of everything, with the silver flight-feather band.
  wing(ctx, [0.9, -0.9], flap, P.wing, P.quill, P.wingLit, true);
  ctx.restore();
}
// One wing, built in its own span/chord frame and projected: the SPAN swings from
// straight up (lift 1) through edge-on to down-and-back (lift < 0), while the CHORD
// always runs back along the body. That shear is what a flapping wing looks like from
// the side — rotating a finished wing shape instead flips the trailing edge forward on
// the downstroke. Fingered primaries at the tip say "vulture" at any size; the pale
// rear half of the wing is the bird's field mark.
function wing(ctx, [sx0, sy0], lift, fill, band, lit, near) {
  const L = 12.6;
  const spanX = 0.2 + 0.2 * (1 - Math.min(1, Math.abs(lift)));
  const spanY = -lift;
  const P = (s, c) => [sx0 + s * L * spanX + c, sy0 + s * L * spanY + c * 0.12];
  const outline = [
    [0, -0.4], [0.3, -0.9], [0.5, -1.0], [0.72, -0.6],
    [1.03, -0.15], [0.86, 0.6], [1.01, 0.8], [0.84, 1.45], [0.97, 1.65], [0.8, 2.25],
    [0.92, 2.5], [0.74, 3.0], [0.84, 3.3], [0.66, 3.9],
    [0.55, 4.5], [0.46, 4.1], [0.36, 4.6], [0.27, 4.2], [0.17, 4.6], [0.07, 4.2], [0, 3.6],
  ];
  const trace = (c, pts) => {
    const [x0, y0] = P(pts[0][0], pts[0][1]);
    c.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) { const [px, py] = P(pts[i][0], pts[i][1]); c.lineTo(px, py); }
    c.closePath();
  };
  const path = (c) => trace(c, outline);
  ink(ctx, fill, path, near ? 0.32 : 0.26);
  ctx.save();
  ctx.beginPath(); path(ctx); ctx.clip();
  // Flight feathers: the rear half of the chord, silver on the near wing.
  fillPath(ctx, band, (c) => trace(c, [[0, 2.1], [0.6, 1.6], [0.95, 0.4], [1.2, 0.4], [1.2, 5], [0, 5]]));
  // Feather splits across the band.
  for (let k = 1; k < 6; k++) {
    const s = k * 0.15;
    strokePath(ctx, rgba('#1c1210', 0.35), 0.22, (c) => { const [a, b] = P(s, 2.3); const [d, e] = P(s + 0.04, 4.6); c.moveTo(a, b); c.lineTo(d, e); });
  }
  // Leading edge catching the sun.
  strokePath(ctx, lit, 0.55, (c) => {
    const [a, b] = P(0.02, -0.2); const [d, e] = P(0.5, -0.75); const [f, g] = P(0.9, -0.3);
    c.moveTo(a, b); c.quadraticCurveTo(d, e, f, g);
  });
  ctx.restore();
}

// The gallery's placement for this cabinet, shared with the sign-gag bake-off
// (src/dev/speed-sign-gags.js) so its entries stand exactly where the shipped one does.
export const SPEED_IDEA_PLACEMENT = { seatFor, hillSlot, clipSigns };

export const SPEED_IDEAS = [
  // ------------------------------------------------------------------ background
  { id: 'pumpjack', place: 'bg', name: 'SHIPS · Oil pumpjacks nodding', paint: oilPumpjacks,
    note: 'An oil field in the desert: full-size rigs on graded pads atop the middle dunes, two small hazed ones out on the big mesa\'s flat cap, all pumping out of step. The linkage is solved, not faked — the crank swings its counterweight, the pitman arm keeps its length, the walking beam rocks to suit, and the horse head\'s arc keeps the polished rod going dead straight up and down. Middle range and far mesa, a rig every few screens; the nodding reads at a glance.' },
  { id: 'buggy', place: 'bg', name: 'Rival buggy on the dunes', paint: rallyBuggy,
    note: 'A roll-caged race buggy overtaking you along the middle dunes, whip-flag snapping, a rooster tail of dust hanging behind it. Its height is simulated on a fixed clock over the real crest — it hugs the troughs, pops off every summit, and the near dunes pass in front of it. Middle range, an occasional overtaking event: the race made visible — somebody else out here is going fast too.' },
  { id: 'tumbleweeds', place: 'bg', name: 'SHIPS · Tumbleweeds on the wind', paint: tumbleweedsBg,
    note: 'Three tumbleweeds bowling along the near ridge on the same breeze that leans the campfire smoke, each on its own hop rhythm — spinning as they roll, squashing on landing, puffing dust. They ride the sampled crest and pass behind the roadside signs, keeping pace with the run while the ground streams under them. Near ridge, any stage; the most "desert" motion there is and cheap to scatter.' },
  { id: 'train', place: 'bg', name: 'Freight train on a trestle', paint: trestleTrain,
    note: 'A long freight — orange lead unit, a second unit, boxcars, tanks, hoppers, containers, a red caboose — rumbling across a timber trestle in the far distance, exhaust peeling off the stack, headlight cone burning and ditch lights trading flashes. The trestle has its own parallax between the mesas and the middle range, so the middle dunes hide its legs and the line threads behind the hills. A far-layer event every twenty seconds or so: a long, slow moving thing is the best foil for the speed of the road.' },
  { id: 'jet', place: 'bg', name: 'SHIPS · Jet breaking the sound barrier', paint: jetBoom,
    note: 'A fighter crosses the sky fast; as it goes supersonic a vapour cone blooms round its wings, a shock ring rolls out from the spot and the contrail spreads and wanders as it ages. Sky layer, one pass per 7 s cycle — the three frames show the cone, the ring, and the aftermath. The villain claims he invented speed; this is the sky agreeing with him.' },
  { id: 'rocket', place: 'bg', name: 'Rocket launch from the mesa', paint: rocketLaunch,
    note: 'A launch complex on the big mesa\'s flat cap: a gantry with a blinking beacon and a rocket venting on the stand, then ignition, a ground cloud rolling across the cap, and the climb — pitching over downrange, the smoke column left standing and drifting on the wind. Far layer, a launch every 12 s; it could take the butte\'s job as a stage\'s pinned landmark (lift-off at the finish).' },
  { id: 'diner', place: 'bg', name: 'Diner & motel neon', paint: roadsideDiner,
    note: 'A streamline diner on the roadside hill: stainless flutes, a lit window band with the counter crowd and a waitress on her rounds, DINER in pink tubes on the roof, and the sign stack — EAT over a bulb-chased arrow, MOTEL with one tube buzzing, and VACANCY with its NO flickering in bursts. Planted on a graded lot on the near ridge\'s second summit. A once-a-stage landmark: neon at sunset is the most 1994-highway thing we could add.' },
  { id: 'speedtrap', place: 'bg', name: 'Speed camera — SMILE! (ships)', paint: speedTrap,
    note: 'What ships (picked in src/dev/speed-sign-gags.js): the board says SMILE! YOU\'RE ON SPEED CAMERA, the camera on its pole flashes, and the board turns into a blurred lineup mugshot of whoever just went through with GOTCHA! and a $1986 fine stamped on, while the patrol car behind it lights up. Near-ridge landmark on a graded lot; the original villain\'s-boast billboard lives on in the sign-gag bake-off.' },
  { id: 'balloon', place: 'bg', name: 'Hot-air balloons at sunset', paint: hotAirBalloons,
    note: 'A striped balloon drifting across the sky, turning slowly on its lines, basket swinging and a passenger waving — every few seconds the burner fires and the whole envelope glows from inside. A second, smaller one hangs further off by the sun. Sky layer, slow and calm: the breathing room between the busy things.' },
  { id: 'windpump', place: 'bg', name: 'Ranch windpump and stock tank', paint: ranchWindpump,
    note: 'An old farm windmill on the roadside hill: the many-bladed wheel turning three-quarter on, the tail vane hunting the wind, the pump rod stroking in the tower and water gulping from the pipe into a round stock tank that throws the sunset back. Near ridge, one or two a stage. A different silhouette from the shipped turbines on the horizon — old machinery near, new machinery far.' },
  { id: 'dustdevil', place: 'bg', name: 'SHIPS · Dust devil over the dunes', paint: dustDevil,
    note: 'A slender, pale whirl of dust wandering across the middle dunes, leaning downwind, streaks winding up it, grit and a scrap of brush orbiting its foot and wisps fraying off the top. Kept light and translucent on purpose: a tornado reads as weather coming for you (the note on the campfire smoke says so), and this is the desert\'s small harmless one, minding its own business. Middle range, occasional.' },
  { id: 'grandstand', place: 'bg', name: 'Race grandstand doing the wave', paint: raceGrandstand,
    note: 'A checkpoint grandstand on the roadside hill: tiered benches packed with a crowd doing THE WAVE, camera flashes popping in the stands, pennants snapping along a SPEED ZONE fascia, and a flagman at the red-and-white rail swinging the chequered flag. Near-ridge landmark for a stage finish or a checkpoint; it turns the highway into a race, which is what the cabinet keeps pretending it is.' },
  { id: 'coyote', place: 'bg', name: 'SHIPS · Coyote howling on a rock', paint: howlingCoyote,
    note: 'A coyote sitting up on a sandstone ledge on the roadside hill, tail curled round its paws, ears swivelling — every five seconds it throws its head back and howls at the sunset, the rings of the song drifting off over the road. Near ridge, rare; the rock uses the shipped near-rock palette so it belongs to the same hills.' },
  // ------------------------------------------------------------------ the lane
  { id: 'rattlesnake', place: 'lane', name: 'SHIPS · Rattlesnake (timed strike)', paint: rattlesnake,
    note: 'Coiled in three rings of diamond-backed body, head up, rattle buzzing, tongue flicking — and every 2.6 s it winds back and STRIKES, lunging a head-length at the hero with its jaws open. A jump hazard whose reach changes on a timer: clear it on the recoil or jump long. Stompable between strikes.' },
  { id: 'tumbleweed', place: 'lane', name: 'Bouncing tumbleweed', paint: laneTumbleweed,
    note: 'A big tumbleweed rolling down the lane at you in a rhythm — two low hops you jump, then a high one you slide under. It spins, squashes on landing and kicks dust, and its shadow shrinks as it climbs so the height reads off the road. A moving hazard that asks you to read motion, not shape.' },
  { id: 'armadillo', place: 'lane', name: 'Armadillo (walks, then rolls)', paint: armadillo,
    note: 'Trundles toward you on stumpy legs — stomp it while it walks. Then it tucks into a banded ball and ROLLS at you in a spray of dust, and a ball has to be jumped. A two-state moving hazard on a 4.2 s cycle: walk, curl, roll, unroll.' },
  { id: 'skull', place: 'lane', name: 'Longhorn skull on a post', paint: longhornSkull,
    note: 'A bleached steer skull nailed to a fence post, horns sweeping wide, a red rag under it snapping in the wind, a loose end of barbed wire — and a little lizard that darts up the post and back. A tall breakable jump: boot the post and the lot comes down. The horns are a silhouette nothing else on the road has.' },
  { id: 'ramp', place: 'lane', name: 'Stunt ramp', paint: stuntRamp,
    note: 'A plywood kicker with a steel lip, racing-red flanks with chevrons chasing up them, bulbs along the deck and a chequered flag. Not a hazard: run up it and launch — hit it on a BOOST and you clear the next screen. The cabinet\'s mechanic, given a physical object.' },
  { id: 'wire', place: 'lane', name: 'Ranch wire (slide)', paint: ranchWire, zoom: 4,
    note: 'Two fence posts with barbed wire strung across the lane at head height, the lower strands cut and dangling out of the way: SLIDE under the top ones. Red rags knotted on the strands stream in the wind so it reads at speed, and a tin can swings on the wire. The cabinet\'s first standing slide hazard.' },
  { id: 'tyres', place: 'lane', name: 'Tyre stack (bouncy)', paint: tyreStack,
    note: 'Race-circuit tyres stacked and painted red and white, a pennant stuck in the top, boinging every so often as if something just landed on it. Land on it and it springs you high — a spring pad in racing clothes; run into it and the stack scatters. Circuit furniture for a highway that thinks it is a racetrack.' },
  { id: 'cuckoo', place: 'lane', name: 'Sprinting ground cuckoo', paint: groundCuckoo,
    note: 'The desert\'s sprinter: a lean, streaky ground-cuckoo, crest up and tail streaming, legs a blur-wheel, bolting down the lane at you in a spray of dust. A fast moving hazard — jump it, or stomp it for the coins it drops. A generic bird, no borrowed character.' },
  // ------------------------------------------------------------------ the air
  { id: 'vulture', place: 'air', name: 'Swooping vulture (flyer)', paint: vultureSwoop,
    note: 'The backdrop\'s vultures are drawn NOT to read as hazards; this is the one that drops out of the thermal to lane height — bald red head thrust forward, talons down, silver flight feathers flashing as it pumps, dipping and climbing on a 2.4 s swoop. A flyer to slide under; a desert replacement for the buzzbird on later SPEED stages.' },
  { id: 'copter', place: 'air', name: 'TV camera copter', paint: cameraCopter,
    note: 'The race is being televised: a little news helicopter hangs at head height, camera gimballed onto the hero, red tally lamp blinking, rotor a blur and nose dipped into the chase. A flyer to slide under; on a BOOST it could drop behind and have to catch up.' },
  { id: 'hubcap', place: 'air', name: 'Flying hubcap', paint: hubcap,
    note: 'A chrome hubcap spun off something fast and skimming down the lane at head height — wobbling on its edge, slots turning, the sunset sliding round its dish, and a glint that flares whenever the rim swings through the light. A small fast flyer to slide under; it could be what the rival buggy throws.' },
];
