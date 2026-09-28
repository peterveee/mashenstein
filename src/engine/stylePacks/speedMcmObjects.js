// SPEED ZONE in MID-CENTURY MODERN — every object the paper desert stands on its country
// (desertHorizonProps.js, desertLandmarks.js, the pack's water tower, turbines and road
// signs), redrawn in speedMcm.js's hand: flat colour plates, the ink line slipped out of
// register, dry-brush and sponge in the fields, starbursts where the paper art uses a
// glow. Painted for the lab's object sheet (Peter, 27 Sep 2026: "put all objects from the
// background in the lab"), shipped as painted on 28 Sep. Same size, same anchor, same
// clocks as the paper painter each stands in for, so the pack places them with the
// paper desert's own placement code.
//
// Every painter takes (ctx, x, y, ...) with (x, y) the anchor the paper one uses — the
// cap or crest under its centre, in the backdrop's px — and draws upward.
import { MCM_KIT, MCM_OBJ } from './speedMcm.js';
import { drawTextVectorCentered, textYForMid } from '../sprites.js';
import { drawToon } from '../../sprites/toons.js';

const { REG, REG_SMALL, smooth, flat, ink, inkBlob, inkLine, disc, circlePts, burst, pathPill, texFill } = MCM_KIT;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const fract = (v) => v - Math.floor(v);

const OBJ = MCM_OBJ;
const objOf = (pal) => pal.obj || OBJ[pal.id] || OBJ.sunset;

// ------------------------------------------------------------------ shared pieces
// A tapered lattice: a flat plate of colour, and the legs and X braces drawn over it
// off register. (x, y) is the foot centre; h the height.
function lattice(ctx, x, y, { baseHalf, topHalf, h, panels, plate, plateA = 0.55, reg, col, w = 0.5, legW = 0.9 }) {
  flat(ctx, [[x - baseHalf, y], [x - topHalf, y - h], [x + topHalf, y - h], [x + baseHalf, y]], plate, { a: plateA });
  const at = (k) => ({ yy: y - h * k, hw: lerp(baseHalf, topHalf, k) });
  ctx.beginPath();
  for (let i = 0; i < panels; i++) {
    const a = at(i / panels);
    const b = at((i + 1) / panels);
    ctx.moveTo(x - a.hw + reg[0], a.yy + reg[1]);
    ctx.lineTo(x + b.hw + reg[0], b.yy + reg[1]);
    ctx.moveTo(x + a.hw + reg[0], a.yy + reg[1]);
    ctx.lineTo(x - b.hw + reg[0], b.yy + reg[1]);
    if (i > 0) {
      ctx.moveTo(x - a.hw + reg[0] - 0.3, a.yy + reg[1]);
      ctx.lineTo(x + a.hw + reg[0] + 0.3, a.yy + reg[1]);
    }
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const r3 = [reg[0] * 0.3, reg[1] * 0.3];
  inkLine(ctx, [[x - baseHalf, y], [x - topHalf, y - h]], r3, col, legW, 0.9);
  inkLine(ctx, [[x + baseHalf, y], [x + topHalf, y - h]], r3, col, legW, 0.9);
}

// A light is a flat dot that swaps colour, a flat halo disc and a little starburst.
function lamp(ctx, x, y, on, O, r = 1.1) {
  if (on > 0.05) {
    disc(ctx, x, y, r * 3.4, O.lamp, 0.22 * on);
    ctx.globalAlpha = on;
    burst(ctx, x, y, r * 3.6, 0.3, O.lamp, 0.5, 8);
    ctx.globalAlpha = 1;
  }
  disc(ctx, x, y, r, on > 0.4 ? O.lamp : O.plateDark);
  if (on > 0.4) disc(ctx, x - r * 0.25, y - r * 0.25, r * 0.4, '#fff8e6', on);
}
const beacon = (t, period = 1.6, phase = 0) => {
  const u = fract(t / period + phase);
  return smooth(0, 0.06, u) * (1 - smooth(0.26, 0.4, u));
};
// A tracking antenna holds a bearing, re-aims, settles, holds (the shipped rule).
function stepAim(t, aims, hold) {
  const u = t / hold;
  const k = Math.floor(u);
  const at = (i) => aims[((i % aims.length) + aims.length) % aims.length];
  return lerp(at(k), at(k + 1), smooth(0.6, 1, u - k));
}
// A concrete footing slab on the cap.
function footing(ctx, x, y, x0, x1, h, O, pal, P, seed) {
  const v = [[x + x0, y + 0.8], [x + x0 + 1, y - h], [x + x1 - 1, y - h], [x + x1, y + 0.8]];
  flat(ctx, v, O.slabCap, { tex: P.dryD, ta: 0.15, ax: x, ay: y });
  flat(ctx, [v[0], v[1], [v[1][0] + 3, v[1][1]], [v[0][0] + 4, v[0][1]]], pal.shade, { a: pal.shadeA * 0.8 });
  ink(ctx, v, seed, REG.far, pal.ink, { closed: false, w: 0.55, over: 0.4, gapP: 0.1 });
}
// A small equipment hut: a flat box, its roof slab, a door.
function hut(ctx, x, y, w, h, O, pal, P, seed) {
  const v = [[x, y], [x, y - h], [x + w, y - h], [x + w, y]];
  flat(ctx, v, O.alt, { tex: P.dryD, ta: 0.12, ax: x, ay: y });
  flat(ctx, [[x, y], [x, y - h], [x + w * 0.3, y - h], [x + w * 0.3, y]], pal.shade, { a: pal.shadeA });
  flat(ctx, [[x - 0.8, y - h - 1.2], [x + w + 0.8, y - h - 1.2], [x + w + 0.8, y - h], [x - 0.8, y - h]], O.plateDark);
  flat(ctx, [[x + w * 0.5, y], [x + w * 0.5, y - h * 0.62], [x + w * 0.72, y - h * 0.62], [x + w * 0.72, y]], O.plateDark);
  ink(ctx, v, seed, REG.far, pal.ink, { closed: false, w: 0.5, over: 0.4 });
}
// Text in the game's own vector face.
function txt(ctx, str, x, midY, scale, color) {
  drawTextVectorCentered(ctx, str, x, textYForMid(midY, scale, 'bold'), color, scale, 'bold');
}

// ================================================================== the big ear
// One large steerable telescope on its alidade, re-aiming in step-and-hold moves; the
// feed lamp blinks as a starburst. Anchor: the cap under the alidade.
export function mcmBigEar(ctx, x, y, t, pal, P) {
  const O = objOf(pal);
  const I = pal.ink;
  const reg = REG.far;
  const tilt = stepAim(t, [-0.42, -0.2, -0.55, -0.3, -0.08], 5);
  footing(ctx, x, y - 1.5, -19, 19, 2.4, O, pal, P, 1101);
  hut(ctx, x + 25, y - 1.5, 12, 6, O, pal, P, 1103);
  lattice(ctx, x, y - 3.5, { baseHalf: 14, topHalf: 6, h: 20.5, panels: 2, plate: O.plate, plateA: 0.6, reg, col: I, w: 0.6, legW: 1.1 });
  inkLine(ctx, [[x - 7, y - 24], [x + 7, y - 24]], [0, 0], I, 1.1, 0.95);
  ctx.save();
  ctx.translate(x, y - 24);
  ctx.rotate(tilt);
  flat(ctx, [[-3, 2], [3, 2], [3, 7], [-3, 7]], O.plateDark);
  const R = 23;
  const rimY = -R * 0.46;
  const ry = R * 0.3;
  // The back shell, a flat lens of steel under the rim.
  ctx.beginPath();
  ctx.moveTo(-R, rimY);
  ctx.quadraticCurveTo(0, R * 0.34, R, rimY);
  ctx.ellipse(0, rimY, R, ry, 0, 0, Math.PI, false);
  ctx.fillStyle = O.plate;
  ctx.fill();
  // The bowl: cream, sponged, with a flat shadow crescent across its far wall.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, rimY, R, ry, 0, 0, TAU);
  ctx.fillStyle = O.cream;
  ctx.fill();
  texFill(ctx, P.spD, 0, rimY, 0.12);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(-R * 0.1, rimY - ry * 0.55, R * 1.05, ry * 0.9, 0, 0, TAU);
  ctx.fillStyle = pal.shade;
  ctx.globalAlpha = pal.shadeA;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  inkBlob(ctx, circlePts(0, rimY, R, 16, ry / R), 1105, reg, I, { w: 0.65, jit: 0.5, dash: [40, 4, 30, 6] });
  const shell = [];
  for (let k = 0; k <= 10; k++) {
    const u = k / 10;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    shell.push([a * -R + c * R, a * rimY + b * R * 0.34 + c * rimY]);
  }
  inkLine(ctx, shell, reg, I, 0.6, 0.8);
  // Feed legs to the focus, the feed box and its lamp.
  const fy = rimY - R * 0.86;
  inkLine(ctx, [[-R * 0.78, rimY + ry * 0.4], [0, fy]], [0, 0], I, 0.55, 0.9);
  inkLine(ctx, [[R * 0.78, rimY + ry * 0.4], [0, fy]], [0, 0], I, 0.55, 0.9);
  inkLine(ctx, [[0, rimY + ry * 0.95], [0, fy]], [0, 0], I, 0.5, 0.8);
  flat(ctx, [[-1.6, fy - 2.6], [1.6, fy - 2.6], [1.6, fy + 0.3], [-1.6, fy + 0.3]], O.plateDark);
  lamp(ctx, 0, fy - 3.8, beacon(t, 2.2), O, 1.1);
  ctx.restore();
  disc(ctx, x, y - 24, 1.8, O.plateDark);
  disc(ctx, x + 0.5, y - 24.5, 0.7, O.cream);
}

// ================================================================== the radio mast
// A guyed lattice mast with microwave drums and two blinking beacons. `seat(x)` is the
// cap's crest at any x, for the guy anchors.
export function mcmMast(ctx, x, y, t, pal, P, seat = () => y) {
  const O = objOf(pal);
  const I = pal.ink;
  const reg = REG.far;
  const H = 60;
  ctx.beginPath();
  for (const [yy, ax] of [[-20, -30], [-40, -44], [-56, -44], [-20, 30], [-40, 44], [-56, 44]]) {
    const k = yy / -H;
    ctx.moveTo(x + Math.sign(ax) * lerp(3.4, 0.9, k), y - 2 + yy);
    ctx.lineTo(x + ax, seat(x + ax) - 0.5);
  }
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.4;
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (const ax of [-30, -44, 30, 44]) flat(ctx, [[x + ax - 1.2, seat(x + ax)], [x + ax - 0.8, seat(x + ax) - 1.6], [x + ax + 0.8, seat(x + ax) - 1.6], [x + ax + 1.2, seat(x + ax)]], O.plateDark);
  hut(ctx, x - 14, y - 1.5, 8, 5, O, pal, P, 1201);
  lattice(ctx, x, y - 1.5, { baseHalf: 3.4, topHalf: 0.9, h: H - 1.5, panels: 12, plate: O.plate, plateA: 0.8, reg, col: I, w: 0.4, legW: 0.75 });
  inkLine(ctx, [[x, y - 2 - H], [x, y - 2 - H - 6]], [0, 0], I, 0.7, 0.95);
  // Microwave drums: cream capsules with a mustard face.
  const drum = (cx, cy, dir) => {
    ctx.beginPath();
    pathPill(ctx, cx + dir * 1.6, cy, 4.4, 4.8);
    ctx.fillStyle = O.cream;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + dir * 3.6, cy, 1.2, 2.5, 0, 0, TAU);
    ctx.fillStyle = O.mustard;
    ctx.fill();
    inkBlob(ctx, circlePts(cx + dir * 1.9, cy, 2.8, 10, 0.9), 1210 + cx, REG_SMALL, I, { w: 0.45, dash: [8, 2, 6, 3] });
  };
  drum(x - 1.6, y - 2 - 40, -1);
  drum(x + 1.4, y - 2 - 33, 1);
  lamp(ctx, x, y - 2 - 30, beacon(t, 1.6, 0.5) * 0.7, O, 0.8);
  lamp(ctx, x, y - 2 - H - 6.5, beacon(t, 1.6), O, 1.2);
}

// ================================================================== the fire lookout
// A braced timber tower, a glazed cab, a pennant. The windows catch the sun on a
// BEARING — as the tower is carried past it — and the catch is a starburst.
const SUN_X = 380;
// `sunX` is where the sun stands across the picture (the card's 380 unless told).
export function mcmLookout(ctx, x, y, t, pal, P, sunX = SUN_X) {
  const O = objOf(pal);
  const I = pal.ink;
  const reg = REG.far;
  lattice(ctx, x, y - 1.5, { baseHalf: 11, topHalf: 6.5, h: 36.5, panels: 4, plate: O.wood, plateA: 0.45, reg, col: I, w: 0.55, legW: 1.2 });
  // Stair flights zig-zagging up the middle, in cream.
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const y0 = y - 2 - i * 7.2;
    const y1 = y0 - 7.2;
    const w = lerp(6.5, 3.8, i / 5);
    ctx.moveTo(x + (i % 2 ? w : -w), y0);
    ctx.lineTo(x + (i % 2 ? -w : w), y1);
  }
  ctx.strokeStyle = O.cream;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Catwalk and rail.
  inkLine(ctx, [[x - 12, y - 38.5], [x + 12, y - 38.5]], [0, 0], I, 0.9, 0.95);
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 42);
  ctx.lineTo(x + 12, y - 42);
  for (const dx of [-12, -9.5, 9.5, 12]) {
    ctx.moveTo(x + dx, y - 38.5);
    ctx.lineTo(x + dx, y - 42);
  }
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.45;
  ctx.stroke();
  // The cab: a flat box, a band of glass, the sun side lit.
  const cab = [[x - 9, y - 38.5], [x - 9, y - 49], [x + 9, y - 49], [x + 9, y - 38.5]];
  flat(ctx, cab, O.plate, { tex: P.dryD, ta: 0.12, ax: x, ay: y });
  const glint = Math.exp(-(((x - (sunX - 150)) / 55) ** 2));
  flat(ctx, [[x - 8, y - 42.6], [x - 8, y - 47.2], [x + 8, y - 47.2], [x + 8, y - 42.6]], O.glass);
  if (glint > 0.02) flat(ctx, [[x - 8, y - 42.6], [x - 8, y - 47.2], [x + 8, y - 47.2], [x + 8, y - 42.6]], O.cream, { a: 0.85 * glint });
  flat(ctx, [[x + 7, y - 38.5], [x + 7, y - 49], [x + 9, y - 49], [x + 9, y - 38.5]], O.cream, { a: 0.45 });
  ctx.beginPath();
  for (const dx of [-4, 0, 4]) {
    ctx.moveTo(x + dx, y - 47.2);
    ctx.lineTo(x + dx, y - 42.6);
  }
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.45;
  ctx.stroke();
  ink(ctx, cab, 1301, reg, I, { w: 0.55, over: 0.5 });
  if (glint > 0.05) {
    const sx = x - 8 + 16 * clamp01((x - (sunX - 230)) / 160);
    ctx.globalAlpha = glint;
    burst(ctx, sx, y - 45, 2 + 4.5 * glint, 0.4, '#fffdf2', 0.7, 8);
    ctx.globalAlpha = 1;
  }
  // Hip roof, a flat coral slab.
  const roof = [[x - 11, y - 48.6], [x - 3, y - 54.5], [x + 3, y - 54.5], [x + 11, y - 48.6]];
  flat(ctx, roof, O.coral);
  flat(ctx, [[x - 11, y - 48.6], [x - 3, y - 54.5], [x - 1, y - 54.5], [x - 6, y - 48.6]], pal.shade, { a: pal.shadeA });
  ink(ctx, roof, 1303, reg, I, { w: 0.55, over: 0.6 });
  // The pennant.
  inkLine(ctx, [[x, y - 54.5], [x, y - 64]], [0, 0], I, 0.5, 0.95);
  const flap = (u) => Math.sin(t * 5.2 - u * 3.2) * 0.9 * u;
  const flag = [];
  for (let i = 0; i <= 4; i++) flag.push([x + (i / 4) * 8, y - 63.8 + flap(i / 4) + (i / 4) * 1.6]);
  for (let i = 4; i >= 0; i--) flag.push([x + (i / 4) * 8, y - 60.2 + flap(i / 4) - (i / 4) * 1.6]);
  flat(ctx, flag, O.mustard);
  ink(ctx, flag, 1305, REG_SMALL, I, { w: 0.45, over: 0.3, gapP: 0.3 });
}

// ================================================================== the rocket
// The rocket on its mount beside the service gantry — venting, then LAUNCHING. `tau` is
// the shipped launch clock in seconds (< 0 on the pad, ignition at 0, off the mount at
// ROCKET_LIFT). The 1950s rocket: cream capsules, a coral nose, swept mustard fins, and
// a flame of stacked flat teardrops rather than a glow.
const ROCKET_LIFT = 1.6;
const ROCKET_ACCEL = 16;
const ROCKET_GONE = 440;
const ROCKET_TRAIL_STEP = 0.2;
const rocketAlt = (tau) => (tau <= ROCKET_LIFT ? 0 : 0.5 * ROCKET_ACCEL * (tau - ROCKET_LIFT) ** 2);

function puff(ctx, x, y, r, a, O, seed, I) {
  if (a <= 0.01 || r <= 0.1) return;
  const lobe = (s) => [[x - r * s, y + r * 0.2], [x - r * 0.7 * s, y - r * 0.7 * s], [x, y - r * s], [x + r * 0.75 * s, y - r * 0.6 * s],
    [x + r * s, y + r * 0.15], [x + r * 0.5 * s, y + r * 0.7 * s], [x - r * 0.4 * s, y + r * 0.72 * s]];
  flat(ctx, lobe(1).map(([px, py]) => [px + r * 0.22, py + r * 0.16]), O.smoke[1], { smooth: true, a: a * 0.5 });
  flat(ctx, lobe(1), O.smoke[0], { smooth: true, a });
  if (seed % 3 === 0) inkBlob(ctx, lobe(1), seed, REG.far, I, { w: 0.45, a: 0.35 * a, dash: [r * 1.4, r, r * 0.8, r * 2.5] });
}

function rocketBody(ctx, O, pal, P) {
  const I = pal.ink;
  const booster = (bx, side) => {
    const v = [[bx - 1.6, -4.5], [bx - 1.6, -24], [bx, -28.5], [bx + 1.6, -24], [bx + 1.6, -4.5]];
    flat(ctx, [[bx + 1.9 * side, -4.5], [bx + 4.4 * side, -2.2], [bx + 1.6 * side, -11]], O.mustard);
    flat(ctx, v, O.cream);
    flat(ctx, [[bx - 1.6, -24], [bx, -28.5], [bx + 1.6, -24]], O.coral);
    flat(ctx, [[bx - 1.6, -4.5], [bx - 1.6, -24], [bx - 0.5, -24], [bx - 0.5, -4.5]], pal.shade, { a: pal.shadeA });
    flat(ctx, [[bx - 1.8, -6.5], [bx + 1.8, -6.5], [bx + 1.8, -4.5], [bx - 1.8, -4.5]], O.plateDark);
    ink(ctx, v, 1400 + bx, REG_SMALL, I, { closed: false, w: 0.45, over: 0.3 });
  };
  booster(1.2, -1);
  booster(12.8, 1);
  const L = 3.8;
  const Rr = 10.2;
  const core = [[L, -4.5], [L, -46], [L + 0.6, -50.5], [7, -56.5], [Rr - 0.6, -50.5], [Rr, -46], [Rr, -4.5]];
  flat(ctx, core, O.cream, { tex: P.spD, ta: 0.1, ax: 7, ay: -30 });
  flat(ctx, [[L, -46], [L + 0.6, -50.5], [7, -56.5], [Rr - 0.6, -50.5], [Rr, -46]], O.coral);
  flat(ctx, [[L, -34], [Rr, -34], [Rr, -31.8], [L, -31.8]], O.coral);
  flat(ctx, [[L, -20], [Rr, -20], [Rr, -18.6], [L, -18.6]], O.plate);
  flat(ctx, [[L, -4.5], [L, -46], [L + 2.2, -46], [L + 2.2, -4.5]], pal.shade, { a: pal.shadeA });
  disc(ctx, 7, -41, 1.3, O.glass);
  ink(ctx, core, 1411, REG.far, I, { closed: false, w: 0.55, over: 0.3 });
}

function rocketFlame(ctx, t, k, O) {
  const flick = 1 + 0.16 * Math.sin(t * 47) + 0.1 * Math.sin(t * 31 + 1.3);
  disc(ctx, 7, -1, 13 * k, O.flame[1], 0.2 * k);
  for (const [x, w, len] of [[1.2, 1.5, 7], [7, 2.8, 11], [12.8, 1.5, 7]]) {
    const h = len * k * flick;
    [[1, 1, 0], [0.7, 0.72, 1], [0.42, 0.4, 2]].forEach(([sw, sh, c]) => {
      ctx.beginPath();
      ctx.moveTo(x - w * sw, -4.5);
      ctx.quadraticCurveTo(x - w * sw, -4.5 + h * sh * 0.6, x, -4.5 + h * sh);
      ctx.quadraticCurveTo(x + w * sw, -4.5 + h * sh * 0.6, x + w * sw, -4.5);
      ctx.closePath();
      ctx.fillStyle = O.flame[c];
      ctx.fill();
    });
  }
}

export function mcmLaunchPad(ctx, x, y, t, tau, pal, P) {
  const O = objOf(pal);
  const I = pal.ink;
  const reg = REG.far;
  footing(ctx, x, y - 1.5, -22, 16, 3, O, pal, P, 1401);
  ctx.save();
  ctx.translate(x, y);
  // The gantry: a tall teal plate with its lattice drawn over it off register.
  lattice(ctx, -12, -4.5, { baseHalf: 5, topHalf: 4, h: 53.5, panels: 8, plate: O.plate, plateA: 0.75, reg, col: I, w: 0.45, legW: 0.9 });
  inkLine(ctx, [[-12, -58], [-12, -66]], [0, 0], I, 0.6, 0.95);
  // Service arms, swinging back at ignition.
  const reach = 1.5 - 8.5 * smooth(0, 0.7, tau);
  inkLine(ctx, [[-8, -46], [reach, -46]], [0, 0], O.plateDark, 1.2, 1);
  inkLine(ctx, [[-8, -30], [reach, -30]], [0, 0], O.plateDark, 1.2, 1);
  inkLine(ctx, [[-8, -46.7], [reach, -46.7]], [0, 0], O.cream, 0.4, 0.8);
  // The trail: puffs laid where the stack's base was when each was shed.
  if (tau > ROCKET_LIFT) {
    const n = Math.min(80, Math.floor((tau - ROCKET_LIFT) / ROCKET_TRAIL_STEP));
    for (let k = 0; k <= n; k++) {
      const born = ROCKET_LIFT + k * ROCKET_TRAIL_STEP;
      const alt = rocketAlt(born);
      if (alt > ROCKET_GONE) break;
      const age = tau - born;
      const a = 0.9 * Math.exp(-age / 7) * smooth(0, 0.15, age);
      if (a < 0.03) continue;
      const r = 2.6 + Math.min(age, 8) * 1.25;
      puff(ctx, 7 + age * 2.2 + Math.sin(k * 2.1) * 0.8, -2 - alt + r * 0.3, r, a, O, k, I);
    }
  }
  const alt = rocketAlt(tau);
  if (alt < ROCKET_GONE) {
    const shake = tau > 0 && tau < ROCKET_LIFT + 1 ? Math.sin(t * 61) * 0.35 * smooth(0, 0.5, tau) : 0;
    ctx.save();
    ctx.translate(shake, -alt);
    if (tau > 0) rocketFlame(ctx, t, smooth(0, 0.9, tau), O);
    rocketBody(ctx, O, pal, P);
    ctx.restore();
  }
  flat(ctx, [[-2, -6], [15, -6], [15, -3.6], [-2, -3.6]], O.plateDark);
  if (tau < 0) {
    // The LOX vent: flat puffs off the core's sun side, drifting downwind.
    for (let i = 0; i < 5; i++) {
      const age = fract(t * 0.42 + i / 5);
      puff(ctx, 11.2 + age * 17, -31 - age * 5 + Math.sin(age * 5 + i) * 0.6, 0.9 + age * 3.4,
        0.85 * (1 - age) * smooth(0, 0.08, age), O, i + 1, I);
    }
  } else {
    // The base billow, thrown both ways along the pad.
    const grow = smooth(0, 3.5, tau);
    const fade = 1 - smooth(4, 12, tau);
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const reachX = (4 + (i >> 1) * 5.6) * (0.35 + grow);
      const r = (3.4 + (i >> 1) * 0.9) * (0.5 + grow * 0.8);
      puff(ctx, 7 + side * reachX + Math.sin(t * 0.9 + i) * 0.6 + tau * 0.6, -3 - r * 0.45 - Math.sin(i * 1.7) * 0.8, r,
        fade * smooth(0, 0.25, tau - i * 0.03), O, i + 3, I);
    }
  }
  lamp(ctx, -12, -66.5, beacon(t, tau >= 0 ? 0.7 : 1.8), O, 1.1);
  ctx.restore();
}
// The gallery loop for the launch: 3 s venting, the launch, the trail thinning out.
export const MCM_ROCKET_LOOP = 15;
export const rocketClock = (t) => (((t % MCM_ROCKET_LOOP) + MCM_ROCKET_LOOP) % MCM_ROCKET_LOOP) - 3;

// ================================================================== the water tower
// A municipal tank on stilts: a cream drum with a coral band and a little cone roof.
// Anchor: the lower mesa's cap, as shipped (scale 0.92).
export function mcmWaterTower(ctx, x, y, pal, P) {
  const O = objOf(pal);
  const I = pal.ink;
  const reg = REG.far;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.92, 0.92);
  flat(ctx, [[-15, 0], [-9, -39], [9, -39], [15, 0]], O.plate, { a: 0.28 });
  ctx.beginPath();
  for (const [a, b] of [[[-9, -39], [-15, 0]], [[9, -39], [15, 0]], [[0, -39], [0, 0]], [[-11, -36], [11, -22]], [[11, -36], [-11, -22]],
    [[-12, -21], [14, -5]], [[12, -21], [-14, -5]], [[-12, -20], [12, -20]], [[-14, -5], [14, -5]]]) {
    ctx.moveTo(a[0] + reg[0], a[1] + reg[1]);
    ctx.lineTo(b[0] + reg[0], b[1] + reg[1]);
  }
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
  inkLine(ctx, [[-9, -39], [-15, 0]], [0, 0], O.plateDark, 1.4, 0.9);
  inkLine(ctx, [[9, -39], [15, 0]], [0, 0], O.plateDark, 1.4, 0.9);
  const foot = [[-19, 1], [-18, -1.5], [18, -1.5], [19, 1]];
  flat(ctx, foot, O.slabCap);
  ink(ctx, foot, 1501, reg, I, { closed: false, w: 0.55, over: 0.4 });
  // The tank.
  const tank = [[-11, -57], [0, -58.4], [11, -57], [15.4, -54.5], [16, -50], [16, -43], [15.4, -38.6], [11, -37], [0, -36], [-11, -37],
    [-15.4, -38.6], [-16, -43], [-16, -50], [-15.4, -54.5]];
  ctx.save();
  ctx.beginPath();
  MCM_KIT.pathBlob(ctx, tank);
  ctx.fillStyle = O.cream;
  ctx.fill();
  texFill(ctx, P.spD, 0, -48, 0.1);
  ctx.clip();
  ctx.fillStyle = O.coral;
  ctx.fillRect(-17, -51, 34, 4.2);
  ctx.fillStyle = O.plate;
  ctx.fillRect(-17, -40, 34, 5);
  ctx.fillStyle = pal.shade;
  ctx.globalAlpha = pal.shadeA;
  ctx.fillRect(-17, -60, 10, 26);
  ctx.globalAlpha = 1;
  ctx.restore();
  inkBlob(ctx, tank, 1503, reg, I, { w: 0.7, jit: 0.5, dash: [30, 4, 24, 5] });
  // The cone roof and its finial.
  const roof = [[-12.5, -57], [0, -63.5], [12.5, -57]];
  flat(ctx, roof, O.plate);
  flat(ctx, [[-12.5, -57], [0, -63.5], [-3, -57]], pal.shade, { a: pal.shadeA });
  ink(ctx, roof, 1505, reg, I, { closed: false, w: 0.6, over: 0.8 });
  disc(ctx, 0, -64.6, 1.2, O.mustard);
  ctx.restore();
}

// ================================================================== the wind farm
// Three turbines on one cap, as shipped (at -42, 0 and +42; the middle one larger). Each
// is a tapered cream mast and three leaf blades turning on the shipped clock.
export function mcmWindFarm(ctx, x, t, pal, P, seat, index = 3) {
  const O = objOf(pal);
  const I = pal.ink;
  [[-42, 0.72], [0, 0.82], [42, 0.72]].forEach(([dx, s], variant) => {
    const bx = x + dx;
    const by = seat(bx);
    const rot = t * 2.4 + (index + variant * 0.7) * 0.22;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(s, s);
    const mast = [[-5, 0], [-1.15, -39], [1.15, -39], [5, 0]];
    flat(ctx, mast, O.cream, { tex: P.dryD, ta: 0.08, ax: bx, ay: by });
    flat(ctx, [[-5, 0], [-1.15, -39], [0, -39], [-1.2, 0]], pal.shade, { a: pal.shadeA });
    ink(ctx, mast, 1600 + variant, REG.far, I, { closed: false, w: 0.65, over: 0.3 });
    ctx.beginPath();
    pathPill(ctx, 1.5, -41, 7.4, 3.4);
    ctx.fillStyle = O.plate;
    ctx.fill();
    ctx.save();
    ctx.translate(0, -41);
    ctx.rotate(rot);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 3);
      const blade = [[-1, -2], [2.6, -8], [1.6, -21], [-1.6, -17.5], [-2.8, -7]];
      flat(ctx, blade, O.cream, { smooth: true });
      flat(ctx, [[-1, -2], [-2.8, -7], [-1.6, -17.5], [-0.4, -9]], pal.shade, { a: pal.shadeA, smooth: false });
      inkBlob(ctx, blade, 1610 + i + variant * 3, [0.6, -0.5], I, { w: 0.55, jit: 0.3, dash: [16, 2, 12, 3] });
      ctx.restore();
    }
    disc(ctx, 0, 0, 2.6, O.plate);
    disc(ctx, -0.5, -0.5, 1, O.cream);
    ctx.restore();
    ctx.restore();
  });
}

// ================================================================== the pumpjacks
// Two nodding donkeys on a middle-range summit each, out of step: the shipped linkage
// (crank, pitman arm of fixed length, walking beam, a horse head whose arc keeps the rod
// vertical) cut in flat plates — a mustard head, a rose beam, a coral counterweight.
// `x` is the group's centre; `seatMid(x)` the middle range's crest.
function beamTail(px, py, rTail, kx, ky, len) {
  const dx = kx - px;
  const dy = ky - py;
  const d = Math.hypot(dx, dy);
  const a = (rTail * rTail - len * len + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, rTail * rTail - a * a));
  const bx = px + (a * dx) / d;
  const by = py + (a * dy) / d;
  const s1 = [bx - (h * dy) / d, by + (h * dx) / d];
  const s2 = [bx + (h * dy) / d, by - (h * dx) / d];
  return s1[1] < s2[1] ? s1 : s2;
}

function pumpjack(ctx, crankAngle, O, pal) {
  const I = pal.ink;
  const reg = [1.2, -1.0];
  const P0 = [1, -27];
  const R_HEAD = 18;
  const R_TAIL = 15;
  const C = [15.5, -9.5];
  const R_CRANK = 5.4;
  const LEN = Math.hypot(P0[0] + R_TAIL - C[0], P0[1] - C[1]);
  const K = [C[0] + Math.cos(crankAngle) * R_CRANK, C[1] + Math.sin(crankAngle) * R_CRANK];
  const T = beamTail(P0[0], P0[1], R_TAIL, K[0], K[1], LEN);
  const phi = Math.atan2(T[1] - P0[1], T[0] - P0[0]);
  const wellX = P0[0] - R_HEAD;
  const carrierY = -12 - R_HEAD * phi;
  flat(ctx, [[-22, -4.6], [26, -4.6], [26, -2], [-22, -2]], O.plateDark);
  // Wellhead, rod and bridle.
  flat(ctx, [[wellX - 1.6, -3.5], [wellX - 1.6, -8.5], [wellX + 1.6, -8.5], [wellX + 1.6, -3.5]], O.plateDark);
  flat(ctx, [[wellX - 4.2, -5.5], [wellX - 4.2, -7.4], [wellX + 4.2, -7.4], [wellX + 4.2, -5.5]], O.plate);
  for (const s of [-1, 1]) disc(ctx, wellX + s * 4.4, -6.45, 1.15, O.coral);
  inkLine(ctx, [[wellX, -11], [wellX, carrierY]], [0, 0], O.cream, 0.6, 1);
  flat(ctx, [[wellX - 2.2, carrierY - 0.6], [wellX + 2.2, carrierY - 0.6], [wellX + 2.2, carrierY + 0.7], [wellX - 2.2, carrierY + 0.7]], O.plateDark);
  inkLine(ctx, [[wellX - 1.2, carrierY], [wellX - 1.2, P0[1]]], [0, 0], I, 0.35, 0.9);
  inkLine(ctx, [[wellX + 1.2, carrierY], [wellX + 1.2, P0[1]]], [0, 0], I, 0.35, 0.9);
  // Motor and belt.
  flat(ctx, [[20.5, -4.5], [20.5, -9.5], [27.5, -9.5], [27.5, -4.5]], O.plate);
  inkLine(ctx, [[21.5, -8.6], [C[0] + 1, C[1] - 1.8]], [0, 0], I, 0.5, 0.8);
  // Samson post: the far leg in shade, the near one plate.
  flat(ctx, [[7.5, -4.6], [9.8, -4.6], [P0[0] + 1.3, P0[1] + 1], [P0[0] - 0.2, P0[1] + 1]], pal.shade, { a: 0.7 });
  const post = [[-7.6, -4.6], [-5, -4.6], [P0[0] + 0.6, P0[1] + 1], [P0[0] - 1.3, P0[1] + 1]];
  flat(ctx, post, O.plate);
  ink(ctx, post, 1701, reg, I, { closed: false, w: 0.45, over: 0.3 });
  inkLine(ctx, [[-4.2, -15], [6.2, -15]], [0, 0], O.plate, 1.1, 1);
  inkLine(ctx, [[-2.4, -21], [4.2, -21]], [0, 0], O.plate, 1.1, 1);
  // Gearbox.
  const gb = [[C[0] - 5.2, C[1] + 5], [C[0] - 5.2, C[1] - 3.6], [C[0] + 5.2, C[1] - 3.6], [C[0] + 5.2, C[1] + 5]];
  flat(ctx, gb, O.alt);
  ink(ctx, gb, 1703, reg, I, { w: 0.45, over: 0.3 });
  // The counterweight wedge swinging round the shaft.
  ctx.save();
  ctx.translate(C[0], C[1]);
  ctx.rotate(crankAngle + Math.PI);
  ctx.beginPath();
  ctx.moveTo(2.4, -3.2);
  ctx.lineTo(8.8, -4.9);
  ctx.arc(0, 0, 9.4, -0.52, 0.52);
  ctx.lineTo(2.4, 3.2);
  ctx.closePath();
  ctx.fillStyle = O.coral;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2.4, 1.4);
  ctx.lineTo(9.1, 2.3);
  ctx.arc(0, 0, 9.4, 0.25, 0.52);
  ctx.lineTo(2.4, 3.2);
  ctx.closePath();
  ctx.fillStyle = pal.shade;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(reg[0], reg[1], 9.4, -0.52, 0.52);
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.45;
  ctx.stroke();
  ctx.restore();
  inkLine(ctx, [C, K], [0, 0], O.plateDark, 1.5, 1);
  disc(ctx, C[0], C[1], 1.15, O.cream);
  // Pitman arm.
  inkLine(ctx, [K, T], [0, 0], I, 1.1, 0.95);
  disc(ctx, K[0], K[1], 0.9, O.plateDark);
  // Walking beam and horse head, together about the pivot.
  ctx.save();
  ctx.translate(P0[0], P0[1]);
  ctx.rotate(phi);
  const beam = [[-R_HEAD + 3.5, -1.7], [R_TAIL + 1, -1.7], [R_TAIL + 1, 1.7], [-R_HEAD + 3.5, 1.7]];
  flat(ctx, beam, O.alt);
  flat(ctx, [[-R_HEAD + 3.5, 0.6], [R_TAIL + 1, 0.6], [R_TAIL + 1, 1.7], [-R_HEAD + 3.5, 1.7]], pal.shade, { a: pal.shadeA });
  ink(ctx, beam, 1705, reg, I, { w: 0.45, over: 0.3 });
  flat(ctx, [[R_TAIL - 1.8, -2.6], [R_TAIL + 1.6, -2.6], [R_TAIL + 1.6, 2.6], [R_TAIL - 1.8, 2.6]], O.plateDark);
  const span = 0.42;
  ctx.beginPath();
  ctx.arc(0, 0, R_HEAD + 0.4, Math.PI - span, Math.PI + span);
  ctx.lineTo(Math.cos(Math.PI + span * 0.8) * (R_HEAD - 6), Math.sin(Math.PI + span * 0.8) * (R_HEAD - 6));
  ctx.lineTo(-R_HEAD + 5.5, 0);
  ctx.lineTo(Math.cos(Math.PI - span * 0.8) * (R_HEAD - 6), Math.sin(Math.PI - span * 0.8) * (R_HEAD - 6));
  ctx.closePath();
  ctx.fillStyle = O.mustard;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(reg[0] * 0.6, reg[1] * 0.6, R_HEAD + 0.4, Math.PI - span, Math.PI + span);
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.55;
  ctx.stroke();
  ctx.restore();
  disc(ctx, P0[0], P0[1], 2, O.plateDark);
  disc(ctx, P0[0] + 0.4, P0[1] - 0.2, 0.8, O.cream);
}

// The graded pad: a level slab cut into the summit, its fill spilling down both sides
// as a berm (the shipped pad's shape, in flat plates).
// `deep` digs the berm 30 px down with wider toes, as the paper lot is: drawn so, and
// clipped along the crest by the caller, its fill meets the hill wherever the ground
// falls away under the pad instead of stopping short in the air.
function plinth(ctx, x0, y0, halfL, halfR, O, pal, P, seed, deep = false) {
  const top = y0 - 4.5;
  const foot = deep ? top + 30 : y0 + 9;
  const toe = deep ? 22 : 16;
  const berm = [[x0 - halfL - toe, foot], [x0 - halfL, top], [x0 + halfR, top], [x0 + halfR + toe, foot]];
  flat(ctx, berm, O.slab[0], { tex: P.dryD, ta: 0.14, ax: x0, ay: y0 });
  flat(ctx, [berm[0], berm[1], [x0 - halfL + 5, top], [x0 - halfL - toe + 10, foot]], pal.near.shade, { a: 0.4 });
  ink(ctx, berm, seed, REG_SMALL, pal.ink, { closed: false, gapP: 0.15, w: 0.55, over: 0.2, jit: 0.2 });
  const cap = [[x0 - halfL + 1, top + 1.4], [x0 - halfL + 1, top], [x0 + halfR, top], [x0 + halfR, top + 1.4]];
  flat(ctx, cap, O.slabCap);
  for (let i = 0; i < 10; i++) {
    const gx = x0 - halfL - 6 + MCM_KIT.hash(seed + i * 3.1) * (halfL + halfR + 12);
    const gy = top + 3 + MCM_KIT.hash(seed + i * 7.3) * 7;
    disc(ctx, gx, gy, 0.55, i % 2 ? O.slab[1] : O.slabCap);
  }
}

const PUMP_HALF_GAP = 0.32 * Math.round(Math.PI * 200);
export function mcmPumpjacks(ctx, x, t, pal, P, seatMid) {
  const O = objOf(pal);
  const S = 1.3;
  for (const [dx, rate, ph] of [[-PUMP_HALF_GAP, 2.25, 0.6], [PUMP_HALF_GAP, 1.85, 3.7]]) {
    const xr = x + dx;
    const base = seatMid(xr) - 0.4;
    plinth(ctx, xr, base + 4.5, 31, 34, O, pal, P, 1720 + (dx > 0 ? 5 : 0));
    ctx.save();
    ctx.translate(xr, base);
    ctx.scale(S, S);
    pumpjack(ctx, -t * rate + ph, O, pal);
    ctx.restore();
  }
}

// ================================================================== the speed trap
// SMILE! YOU'RE ON SPEED CAMERA, as a 1950s roadside billboard: a cream board in a mustard
// frame under three floodlights that throw flat cones of light, a press camera on a pole
// whose flash is an atomic starburst, and behind the board a finned black-and-white
// cruiser with one bubble light. The gallery loop is the shipped one: 3 s, the flash at
// 0.5, then the mugshot (the hero's own figure), GOTCHA! and the $1986 fine.
const PORTRAIT_W = 34;
const PORTRAIT_H = 44;
const PORTRAIT_SS = 6;
const portraits = new Map();
function heroPortrait(heroId) {
  if (portraits.has(heroId)) return portraits.get(heroId);
  let c = null;
  if (typeof document !== 'undefined') {
    c = document.createElement('canvas');
    c.width = PORTRAIT_W * PORTRAIT_SS;
    c.height = PORTRAIT_H * 0.62 * PORTRAIT_SS;
    const g = c.getContext('2d');
    g.scale(PORTRAIT_SS, PORTRAIT_SS);
    drawToon(g, heroId, {
      kind: 'run', phase: 0.3, time: 0.3, vy: 0, grounded: true, squash: 0, lean: 0.25,
      roll: false, float: false, stomp: false, headless: false, facing: 1,
    }, PORTRAIT_W / 2 - 3, PORTRAIT_H - 2, PORTRAIT_H - 8);
  }
  portraits.set(heroId, c);
  return c;
}

function cruiser(ctx, t, O, pal, lights) {
  const I = pal.ink;
  const body = [[-10, -2.2], [-10.6, -5.2], [-8.5, -6.6], [3, -6.9], [5.8, -10.2], [11.4, -10.2], [14.4, -7], [21, -6.5], [23.2, -5.4], [23.2, -2.6]];
  flat(ctx, [[-9.2, -6.3], [-12, -9.4], [-6.8, -6.6]], O.car);
  flat(ctx, body, O.car);
  flat(ctx, [[4.4, -6.6], [14.2, -6.8], [14, -2.6], [4.4, -2.5]], O.carWhite);
  flat(ctx, [[-9.6, -5.8], [3.4, -6.6], [3.4, -2.5], [-9.6, -2.4]], O.carWhite);
  flat(ctx, [[6.6, -9.7], [11.1, -9.7], [13.5, -7], [6.6, -7]], O.glass);
  flat(ctx, [[3.6, -6.9], [6.1, -9.7], [6.3, -9.7], [6.3, -7]], O.glass);
  disc(ctx, 9.4, -4.6, 1.05, O.mustard);
  ink(ctx, body, 1801, REG_SMALL, I, { closed: false, w: 0.45, over: 0.3, gapP: 0.2 });
  for (const wx of [-4, 17.4]) {
    disc(ctx, wx, -2.2, 2.3, O.car);
    disc(ctx, wx, -2.2, 1.35, O.carWhite);
    disc(ctx, wx, -2.2, 0.6, O.car);
  }
  // The bubble light: one dome, red then blue.
  const beat = Math.floor(t * 7);
  const redOn = lights && beat % 4 < 2;
  const blueOn = lights && !redOn;
  const col = redOn ? O.lamp : blueOn ? O.blue : O.plateDark;
  disc(ctx, 8.9, -11, 1.5, col);
  if (lights) {
    disc(ctx, 8.9, -11, 5.5, col, 0.22);
    burst(ctx, 8.9, -11, 5.2, t * 3, col, 0.5, 8);
  }
}

function pressCamera(ctx, x, top, flash, O, pal, approach = null) {
  const I = pal.ink;
  inkLine(ctx, [[x, 1], [x, top]], [0, 0], O.wood, 1.6, 1);
  inkLine(ctx, [[x + 0.6, 1], [x + 0.6, top]], [0.6, -0.4], I, 0.5, 0.8);
  ctx.save();
  ctx.translate(x, top);
  ctx.rotate(0.12);
  const box = [[-5.6, 0], [-5.6, -5.4], [4.4, -5.4], [4.4, 0]];
  flat(ctx, box, O.plate);
  flat(ctx, [[-5.6, -5.4], [4.4, -5.4], [4.4, -4.3], [-5.6, -4.3]], O.cream, { a: 0.6 });
  disc(ctx, -3.9, -2.6, 1.8, O.car);
  disc(ctx, -4.3, -3, 0.65, O.glass);
  ink(ctx, box, 1811, REG_SMALL, I, { w: 0.45, over: 0.3 });
  // The flash gun: a reflector dish on an arm, a bulb in it.
  inkLine(ctx, [[3, -5.4], [3, -8.6]], [0, 0], I, 0.5, 0.9);
  ctx.beginPath();
  ctx.arc(3, -9.4, 2.8, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fillStyle = O.cream;
  ctx.fill();
  // The tally lamp: blinking red as the pole closes in, faster the nearer it is.
  if (approach != null && approach < 110) {
    const rate = 3 + (1 - approach / 110) * 9;
    const on = Math.sin(approach / 110 * 40 + rate) > 0 || approach < 8;
    disc(ctx, -4.4, -5.9, 0.7, on ? O.lamp : O.plateDark);
    if (on) disc(ctx, -4.4, -5.9, 1.9, O.lamp, 0.25);
  }
  const pre = preFlash(approach);
  disc(ctx, 3, -10.4, 0.8, flash > 0.05 || pre > 0.2 ? '#ffffff' : O.glass);
  if (pre > 0.02 && flash <= 0.02) {
    disc(ctx, 3, -10.4, 4 + 7 * pre, '#fffdf0', 0.3 * pre);
    ctx.globalAlpha = pre;
    burst(ctx, 3, -10.4, 5 + 5 * pre, 0.35, '#ffffff', 0.7, 8);
    ctx.globalAlpha = 1;
  }
  if (flash > 0.02) {
    disc(ctx, 3, -10.4, 7 + 24 * flash, '#fffdf0', 0.35 * flash);
    ctx.globalAlpha = flash;
    burst(ctx, 3, -10.4, 8 + 16 * flash, 0.2, '#ffffff', 0.9, 12);
    burst(ctx, 3, -10.4, 5 + 9 * flash, 0.5, O.mustard, 0.6, 8);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function mugshot(ctx, x, y, w, h, heroId) {
  flat(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], '#dfe3dc');
  flat(ctx, [[x, y + h * 0.62], [x + w, y + h * 0.62], [x + w, y + h], [x, y + h]], '#c9d0c8');
  for (let k = 0; k < 6; k++) {
    const ly = y + 2.6 + k * 3.6;
    flat(ctx, [[x, ly], [x + w, ly], [x + w, ly + (k % 2 ? 0.35 : 0.6)], [x, ly + (k % 2 ? 0.35 : 0.6)]], '#6f7c82', { a: k % 2 ? 0.45 : 0.75 });
  }
  // Speed streaks as flat pills behind the hero.
  for (const [dy, len] of [[-4.5, 9], [-1, 13], [2.5, 10], [6.5, 12], [10, 8]]) {
    ctx.beginPath();
    pathPill(ctx, x + w * 0.6 - 6.5 - len / 2, y + h * 0.38 + dy, len, 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  const art = heroPortrait(heroId);
  if (art) {
    const hh = h * 1.02;
    const k = hh / (PORTRAIT_H * 0.62);
    const ww = PORTRAIT_W * k;
    for (const [dx, a] of [[-7.5, 0.16], [-4, 0.3], [0, 1]]) {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(x + w * 0.52 + dx, y + h * 0.5);
      ctx.rotate(0.08);
      ctx.drawImage(art, -ww / 2, -hh * 0.5, ww, hh);
      ctx.restore();
    }
  }
  burst(ctx, x + w * 0.84, y + h * 0.18, 3.2, 0.3, '#ffffff', 0.5, 8);
}

// `since` is the paper trap's latch (drawDesertSpeedTrap): undefined loops the gag on t
// (the gallery), null holds SMILE! before the flash, and a number is seconds since the
// camera fired — 0.5 on the loop is the flash, and the last frame is held.
// `seat` (the near crest at any x, in the caller's units) seats the lot in the hill: the
// berm is dug deep and everything is clipped along the crest, as the paper trap is.
// `approach` is how many px the camera pole still has to travel before it fires (the
// run's latch; null when it has fired, or in the gallery): on the way in the flash gun
// pops three times and a red lamp on the camera blinks faster and faster.
export function mcmSpeedTrap(ctx, x, y, t, pal, P, heroId = 'lorenzo', since = undefined, seat = null, approach = null) {
  const O = objOf(pal);
  const I = pal.ink;
  const LOOP = 3.0;
  const u = since === undefined ? fract(t / LOOP) * LOOP
    : since === null ? 0.25 : Math.min(LOOP - 0.01, 0.5 + since);
  const flash = u > 0.5 && u < 0.85 ? 1 - (u - 0.5) / 0.35 : 0;
  const shot = smooth(0.62, 0.95, u);
  ctx.save();
  if (seat) {
    ctx.beginPath();
    ctx.moveTo(x - 130, -400);
    ctx.lineTo(x + 130, -400);
    for (let xx = x + 130; xx >= x - 132; xx -= 2) ctx.lineTo(xx, seat(xx) + 1.2);
    ctx.closePath();
    ctx.clip();
  }
  plinth(ctx, x, y + 3.5, 52, 52, O, pal, P, 1830, !!seat);
  ctx.save();
  ctx.translate(x, y - 1);
  const S = 1.28;
  ctx.save();
  ctx.translate(21, 0);
  ctx.scale(S, S);
  cruiser(ctx, t, O, pal, u > 0.5);
  ctx.restore();
  const bx0 = -44;
  const by0 = -37;
  const bx1 = 33;
  const by1 = -6;
  for (const px of [-36, -5, 25]) {
    flat(ctx, [[px - 1.2, 1], [px - 1.2, by1], [px + 1.2, by1], [px + 1.2, 1]], O.wood);
    inkLine(ctx, [[px + 1.2, 1], [px + 1.2, by1]], [0.6, -0.4], I, 0.45, 0.8);
  }
  // The board: a mustard frame, the cream face slipped a hair off it, a coral keyline.
  flat(ctx, [[bx0 - 1.6, by0 - 1.6], [bx1 + 1.6, by0 - 1.6], [bx1 + 1.6, by1 + 1.6], [bx0 - 1.6, by1 + 1.6]], O.mustard);
  const face = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]];
  flat(ctx, face, O.cream, { tex: P.dryD, ta: 0.08, ax: x, ay: y });
  ink(ctx, [[bx0 - 1.6, by0 - 1.6], [bx1 + 1.6, by0 - 1.6], [bx1 + 1.6, by1 + 1.6], [bx0 - 1.6, by1 + 1.6]], 1841, REG_SMALL, I, { w: 0.55, over: 0.6 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx0, by0, bx1 - bx0, by1 - by0);
  ctx.clip();
  // A boomerang of teal in the corner, the period's shorthand for "modern".
  flat(ctx, [[bx1 - 16, by1], [bx1 + 2, by0 + 4], [bx1 + 2, by0 + 12], [bx1 - 8, by1]], O.plate, { a: 0.22, smooth: true });
  if (shot < 0.99) {
    ctx.save();
    ctx.globalAlpha *= 1 - shot;
    txt(ctx, 'SMILE!', -5.5, by0 + 12.5, 1.55, O.coral);
    txt(ctx, "YOU'RE ON SPEED CAMERA", -5.5, by0 + 23.5, 0.44, I);
    ctx.restore();
  }
  if (shot > 0.01) {
    ctx.save();
    ctx.globalAlpha *= shot;
    const px0 = bx0 + 2.2;
    const py0 = by0 + 2.2;
    const pw = 30;
    const ph = 26.6;
    ctx.save();
    ctx.translate(px0 + pw / 2, py0 + ph / 2);
    ctx.rotate(-0.035);
    ctx.translate(-pw / 2, -ph / 2);
    flat(ctx, [[0.8, 1], [pw + 0.8, 1], [pw + 0.8, ph + 1], [0.8, ph + 1]], I, { a: 0.3 });
    flat(ctx, [[0, 0], [pw, 0], [pw, ph], [0, ph]], '#fbfaf3');
    ctx.save();
    ctx.beginPath();
    ctx.rect(1.6, 1.6, pw - 3.2, ph - 5.4);
    ctx.clip();
    mugshot(ctx, 1.6, 1.6, pw - 3.2, ph - 5.4, heroId);
    ctx.restore();
    txt(ctx, '88MPH', pw - 7.9, ph - 6.1, 0.4, O.coral);
    ctx.restore();
    txt(ctx, 'GOTCHA!', 11, by0 + 8, 0.7, O.coral);
    const slam = smooth(1.35, 1.5, u);
    if (slam > 0) {
      ctx.save();
      ctx.translate(11, by0 + 20.5);
      ctx.rotate(-0.16);
      const sc = 1 + (1 - slam) * 0.9;
      ctx.scale(sc, sc);
      ctx.globalAlpha *= slam;
      ctx.beginPath();
      ctx.rect(-12.5, -5.6, 25, 11.2);
      ctx.strokeStyle = O.coral;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      txt(ctx, 'FINE', 0, -2.1, 0.5, O.coral);
      txt(ctx, '$1986', 0, 2.3, 0.72, O.coral);
      ctx.restore();
    }
    ctx.restore();
  }
  // Floodlight cones: flat pale wedges down the face.
  for (const lx of [-32, -6, 20]) {
    flat(ctx, [[lx + 2.6, by0], [lx - 6, by1], [lx + 12, by1]], '#fffdf0', { a: 0.14 });
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(0.6 * flash).toFixed(3)})`;
    ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  }
  ctx.restore();
  for (const lx of [-32, -6, 20]) {
    inkLine(ctx, [[lx, by0 - 1.6], [lx, by0 - 4], [lx + 3, by0 - 4.6]], [0, 0], I, 0.55, 0.9);
    flat(ctx, [[lx + 1.6, by0 - 5.6], [lx + 5, by0 - 4.8], [lx + 4.4, by0 - 3.2], [lx + 1.6, by0 - 3.8]], O.plateDark);
    flat(ctx, [[lx + 2.4, by0 - 3.9], [lx + 4.4, by0 - 3.9], [lx + 4.4, by0 - 3.3], [lx + 2.4, by0 - 3.3]], O.cream);
  }
  const pending = since === null && approach != null ? approach : since === undefined ? loopApproach(u) : null;
  pressCamera(ctx, -52, -30, flash, O, pal, pending);
  ctx.restore();
  ctx.restore();
}
// The gallery's loop has no run to measure: its 0.5 s before the flash stands in for
// the last 70 px (roughly the lot's scroll in that time).
const loopApproach = (u) => (u < 0.5 ? (0.5 - u) * 140 : null);
// The pre-flashes: three quick pops at these distances out, each PRE_POP px wide.
const PRE_POPS = [64, 42, 20];
const PRE_POP = 5;
function preFlash(a) {
  if (a == null) return 0;
  let k = 0;
  for (const c of PRE_POPS) k = Math.max(k, 1 - Math.abs(a - c) / PRE_POP);
  return Math.max(0, k);
}

// ================================================================== the jet
// A 1950s swept-wing fighter crossing fast; as it goes supersonic a flat vapour cone
// blooms round it, a ring rolls out from the boom as a pale band with its ink line off
// register, and the contrail it drags is a widening flat ribbon in two plates. The pass
// maths is the shipped one (k in 0..1; x0..x1 the pass; y its altitude).
const JET_SPEED = 132;
const JET_TRAIL = 3.4;
const JET_BOOM = 1.0;
export function mcmJetAt(k, x0, x1, y) {
  const T = (x1 - x0) / JET_SPEED + JET_TRAIL;
  const tau = k * T;
  return [x0 + JET_SPEED * tau, y - 8 * tau - 2 * Math.sin(tau * 1.3)];
}

function jetBody(ctx, burn, J, O, I) {
  flat(ctx, [[-2, -0.6], [-8.5, -4.2], [-6.6, -4.2], [1.8, -0.8]], J.under);
  const fin = [[-11.8, -1.2], [-14.2, -8], [-11, -8], [-6.6, -1.4]];
  flat(ctx, fin, J.body);
  flat(ctx, [[-14.2, -8], [-11, -8], [-11.3, -6.8], [-13.8, -6.8]], J.stripe);
  const hull = [[13.4, 0.2], [8, -2.2], [2, -2.1], [-12.6, -1.6], [-13.4, 0.2], [-12.6, 1.5], [2, 1.7], [8, 1.6]];
  flat(ctx, hull, J.body);
  flat(ctx, [[13, 0], [8, -2.2], [2, -2.1], [-12.4, -1.6], [-12.2, -0.9], [2, -1.2], [8, -1.3]], J.lit);
  flat(ctx, [[-12.6, 1.5], [2, 1.7], [8, 1.4], [2, 0.9], [-12.6, 0.8]], J.under);
  // A nose intake ring, the Sabre's signature.
  disc(ctx, 13.2, 0.2, 0.9, J.under);
  flat(ctx, [[7.6, -1.6], [5.4, -3.9], [2.4, -2.1]], J.glass, { smooth: true });
  flat(ctx, [[-4, -0.4], [1, -0.4], [1, 0.2], [-4, 0.2]], J.stripe);
  const wing = [[3.4, 0.4], [-7.4, 5.4], [-9.4, 5.4], [-6.4, 0.9]];
  flat(ctx, wing, J.body);
  flat(ctx, [[3.4, 0.4], [-7.4, 5.4], [-8.2, 5.4], [-1.6, 1.4]], J.lit);
  ink(ctx, hull, 1901, [0.5, -0.4], I, { w: 0.4, over: 0.2, gapP: 0.2 });
  ink(ctx, wing, 1903, [0.5, -0.4], I, { closed: false, w: 0.4, over: 0.2 });
  // Afterburner as stacked flat teardrops.
  [[O.flame[0], 7, 1.3], [O.flame[1], 4.6, 0.9], [O.flame[2], 2.6, 0.5]].forEach(([c, len, hw]) => {
    ctx.beginPath();
    ctx.moveTo(-13.2, -hw);
    ctx.quadraticCurveTo(-13.2 - len * burn * 0.6, -hw * 0.6, -13.2 - len * burn, 0.1);
    ctx.quadraticCurveTo(-13.2 - len * burn * 0.6, hw * 0.6, -13.2, hw);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  });
}

export function mcmJet(ctx, k, x0, x1, y, pal) {
  if (!(k >= 0 && k < 1)) return;
  const O = objOf(pal);
  const I = pal.ink;
  const T = (x1 - x0) / JET_SPEED + JET_TRAIL;
  const tau = k * T;
  const jetAt = (tt) => [x0 + JET_SPEED * tt, y - 8 * tt - 2 * Math.sin(tt * 1.3)];
  const [bx, by] = jetAt(JET_BOOM);
  // The contrail: a flat ribbon in two plates, fading in three steps, not a ramp.
  const pts = [];
  for (let back = 0; back <= Math.min(tau, JET_TRAIL); back += 0.04) {
    const [px, py] = jetAt(tau - back);
    const drift = Math.sin((tau - back) * 3.1 + back * 1.3) * back * 1.1;
    pts.push([px - 13, py + 0.1 + drift + back * 1.6, back]);
  }
  ctx.lineCap = 'round';
  for (const [dx, dy, col, wk] of [[1.4, 1.1, O.smoke[1], 1.1], [0, 0, O.smoke[0], 1]]) {
    for (let i = 1; i < pts.length; i++) {
      const [xa, ya, b0] = pts[i - 1];
      const [xb, yb] = pts[i];
      const step = b0 < JET_TRAIL * 0.33 ? 0.9 : b0 < JET_TRAIL * 0.66 ? 0.6 : 0.3;
      ctx.beginPath();
      ctx.moveTo(xa + dx, ya + dy);
      ctx.lineTo(xb + dx, yb + dy);
      ctx.strokeStyle = col;
      ctx.lineWidth = (1.4 + b0 * 3.6) * wk;
      ctx.globalAlpha = step * (col === O.smoke[1] ? 0.5 : 1) * Math.min(1, b0 / 0.05 + 0.3);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // A few ink dashes riding the ribbon's upper edge.
  ctx.beginPath();
  for (let i = 4; i < pts.length - 3; i += 9) {
    const [xa, ya, b0] = pts[i];
    const [xb, yb] = pts[i + 3];
    const off = (1.4 + b0 * 3.6) / 2 + 0.8;
    ctx.moveTo(xa + 1.2, ya - off - 0.8);
    ctx.lineTo(xb + 1.2, yb - off - 0.8);
  }
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.45;
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The shock ring and the boom's starburst.
  const age = tau - JET_BOOM;
  if (age > 0 && age < 2.6) {
    const rx = 10 + 78 * age ** 0.62;
    const ry = rx * 0.64;
    const a = (1 - age / 2.6) ** 1.6;
    ctx.beginPath();
    ctx.ellipse(bx - 4, by, rx * 0.95, ry * 0.95, 0, 0, TAU);
    ctx.strokeStyle = O.smoke[0];
    ctx.lineWidth = 4.5;
    ctx.globalAlpha = 0.4 * a;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bx - 4 + 1.6, by - 1.3, rx, ry, 0, 0, TAU);
    ctx.setLineDash([rx * 0.7, rx * 0.12, rx * 0.4, rx * 0.2]);
    ctx.strokeStyle = I;
    ctx.lineWidth = 0.55;
    ctx.globalAlpha = 0.55 * a;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (age < 0.3) {
      const f = 1 - age / 0.3;
      disc(ctx, bx - 4, by, 16 * f + 4, '#fffdf0', 0.5 * f);
      ctx.globalAlpha = f;
      burst(ctx, bx - 4, by, 10 + 12 * (1 - f), 0.3, '#ffffff', 0.8, 12);
      ctx.globalAlpha = 1;
    }
  }
  const [jx, jy] = jetAt(tau);
  if (jx > x0 + 10 && jx < x1) {
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(-0.05);
    ctx.scale(1.3, 1.3);
    const cone = clamp01(1 - Math.abs(tau - JET_BOOM) / 0.5);
    if (cone > 0) {
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.bezierCurveTo(2, -6.5, -7, -10.5, -17, -12);
      ctx.lineTo(-17, 12);
      ctx.bezierCurveTo(-7, 10.5, 2, 6.5, 5, 0);
      ctx.closePath();
      ctx.fillStyle = O.smoke[0];
      ctx.globalAlpha = 0.75 * cone;
      ctx.fill();
      ctx.globalAlpha = cone * 0.7;
      for (const [dx, ry] of [[-2.5, 6.8], [-7, 9.3], [-11.5, 10.9]]) {
        ctx.beginPath();
        ctx.ellipse(dx + 0.8, -0.6, 1.4, ry, 0, 0, TAU);
        ctx.strokeStyle = I;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    jetBody(ctx, 0.8 + 0.2 * Math.sin(tau * 40 - 10), O.jet, O, I);
    ctx.restore();
  }
}

// ================================================================== road signs
// The five roadside boards, in the shipped cycle (speed, highway, autobahn, caution,
// next exit) and the shipped sizes: a flat face slipped a hair off its ink border, dry
// brush in the paint, the post a wood plate with its ink line beside it, and a kidney
// of disturbed soil at the foot. (x, baseY) is the shipped anchor; `footY` the post's
// foot in frame px.
export const MCM_SIGN_KINDS = Object.freeze(['speed', 'highway', 'route', 'caution', 'exit']);
const SIGNS = {
  speed: { w: 62, top: -58, bottom: -26, scale: 0.88 },
  highway: { w: 70, top: -55, bottom: -25, scale: 0.84 },
  route: { w: 32, top: -60, bottom: -12, scale: 0.80 },
  caution: { w: 44, top: -57, bottom: -18, scale: 0.82 },
  exit: { w: 70, top: -55, bottom: -25, scale: 0.84 },
};

function roundRect(w, top, bottom, r) {
  const pts = [];
  const x0 = -w / 2;
  const x1 = w / 2;
  const corner = (cx, cy, a0) => {
    for (let k = 0; k <= 3; k++) {
      const a = a0 + (k / 3) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, top + r, -Math.PI / 2);
  corner(x1 - r, bottom - r, 0);
  corner(x0 + r, bottom - r, Math.PI / 2);
  corner(x0 + r, top + r, Math.PI);
  return pts;
}

// A lemniscate `w` wide centred on (x, y), in a stroke weight like the sign's numerals.
function infinityMark(ctx, x, y, w, color) {
  const a = w / 2;
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const th = (i / 64) * TAU;
    const d = 1 + Math.sin(th) ** 2;
    const px = x + (a * Math.cos(th)) / d;
    const py = y + (a * 1.25 * Math.sin(th) * Math.cos(th)) / d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = w * 0.08;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function mcmRoadSign(ctx, kind, x, baseY, footY, value, pal, P) {
  const O = objOf(pal);
  const I = pal.ink;
  const s = SIGNS[kind];
  if (!s) return;
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(s.scale, s.scale);
  const foot = (footY - baseY) / s.scale;
  const h = s.bottom - s.top;
  // Soil, post.
  flat(ctx, [[-9, foot + 1], [-5, foot - 1.8], [0, foot - 1], [5, foot - 2], [9, foot + 0.8], [4, foot + 3.6], [-4, foot + 3.8]],
    pal.near.shade, { smooth: true, a: 0.45 });
  const postTop = kind === 'caution' ? s.bottom - h * 0.08 : s.bottom;
  flat(ctx, [[-1.4, foot], [-1.4, postTop], [1.4, postTop], [1.4, foot]], O.wood);
  inkLine(ctx, [[1.6, foot], [1.6, postTop]], [0.6, -0.5], I, 0.55, 0.85);
  const reg = [1.3, -1.1];
  if (kind === 'caution') {
    const tri = [[0, s.top + h * 0.06], [s.w * 0.46, s.bottom - h * 0.08], [-s.w * 0.46, s.bottom - h * 0.08]];
    flat(ctx, tri, O.coral);
    const c = [0, (tri[0][1] + tri[1][1] * 2) / 3];
    const inner = tri.map(([px, py]) => [c[0] + (px - c[0]) * 0.72, c[1] + (py - c[1]) * 0.72]);
    flat(ctx, inner, O.signFace, { tex: P.dryD, ta: 0.08 });
    ink(ctx, tri, 2001, reg, I, { w: 0.7, over: 1.2 });
    txt(ctx, 'mc²', 0, s.bottom - h * 0.3, 1.25, I);
  } else if (kind === 'route') {
    // The paper sign's own Zeichen 330.1 (drawRoadSign, shape 'autobahn'; Peter, 28 Sep
    // 2026: "the same as the original … but with the new colour"): the white panel and
    // its blue face as separate rounded rects, and the glyph's exact polygons from the
    // 601 x 601 reference vector. Only the colours and the slipped ink line are this hand's.
    const hgt = s.bottom - s.top;
    const rrect = (x, y, w, hh, r) => {
      const rr = Math.min(r, w / 2, hh / 2);
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + hh - rr);
      ctx.quadraticCurveTo(x + w, y + hh, x + w - rr, y + hh);
      ctx.lineTo(x + rr, y + hh);
      ctx.quadraticCurveTo(x, y + hh, x, y + hh - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    };
    ctx.beginPath();
    rrect(-s.w / 2, s.top, s.w, hgt, (s.w * 29.2) / 600);
    ctx.fillStyle = O.cream;
    ctx.fill();
    const inset = (s.w * 12.5) / 600;
    ctx.beginPath();
    rrect(-s.w / 2 + inset, s.top + inset, s.w - inset * 2, hgt - inset * 2, (s.w * 19.2) / 600);
    ctx.fillStyle = O.signBlue;
    ctx.fill();
    texFill(ctx, P.dryL, 0, 0, 0.08);
    const pt = (x, y) => [(x / 601.00134 - 0.5) * s.w, s.top + (y / 601.00159) * hgt];
    ctx.beginPath();
    for (const pts of [
      [[211.25, 219.229], [264.39, 65.742], [291.485, 65.742], [285.576, 219.229]],
      [[315.425, 219.229], [309.536, 65.742], [336.626, 65.742], [389.77, 219.229]],
      [[65.7425, 237.2953], [535.25875, 237.2953], [535.25875, 255.3166], [65.7425, 255.3166]],
      [[115.4, 255.3166], [160.5475, 255.3166], [160.5475, 282.4566], [115.4, 282.4566]],
      [[440.459, 255.3166], [485.6, 255.3166], [485.6, 282.4566], [440.459, 282.4566]],
      [[101.846, 535.273], [189.365, 282.457], [283.14, 282.457], [273.413, 535.273]],
      [[327.588, 535.273], [317.881, 282.457], [411.636, 282.457], [499.155, 535.273]],
    ]) {
      pts.forEach(([x, y], i) => {
        const [px, py] = pt(x, y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    }
    ctx.fillStyle = O.cream;
    ctx.fill();
    ink(ctx, roundRect(s.w, s.top, s.bottom, (s.w * 29.2) / 600), 2011, reg, I, { w: 0.7, over: 0.4 });
  } else {
    const green = kind !== 'speed';
    const board = roundRect(s.w, s.top, s.bottom, 3);
    flat(ctx, board, green ? O.signGreen : O.signFace, { tex: P.dryD, ta: 0.1 });
    const key = roundRect(s.w - 4.4, s.top + 2.2, s.bottom - 2.2, 2);
    inkBlob(ctx, key, 2021, [0.5, -0.4], green ? O.cream : O.coral, { w: 0.8, a: 0.9, dash: [50, 3, 40, 5] });
    ink(ctx, board, 2023, reg, I, { w: 0.7, over: 0.4, gapP: 0.1 });
    const fg = green ? O.cream : I;
    const label = kind === 'speed' ? 'SPEED LIMIT' : kind === 'highway' ? 'HIGHWAY' : 'NEXT EXIT';
    const dx = kind === 'exit' ? 6 : 0;
    txt(ctx, label, dx, s.top + h * 0.26, kind === 'highway' ? 0.7 : 0.62, fg);
    const vy = s.top + h * 0.64;
    const vc = kind === 'speed' ? I : O.mustard;
    // The font's ∞ is a small glyph; drawn, it fills the line the numbers do (Peter, 28
    // Sep 2026: "make the infinity speed symbol larger").
    if (value === '∞') infinityMark(ctx, dx, vy, s.w * 0.34, vc);
    else txt(ctx, value, dx, vy, kind === 'speed' ? 1.62 : 1.7, vc);
    if (kind === 'exit') {
      // The exit arrow, a flat mustard boomerang pointing off the road.
      const ay = s.top + h * 0.56;
      flat(ctx, [[-27, ay], [-19, ay - 7], [-19, ay - 3], [-12, ay - 3], [-12, ay + 3], [-19, ay + 3], [-19, ay + 7]], O.mustard);
    }
  }
  ctx.restore();
}
