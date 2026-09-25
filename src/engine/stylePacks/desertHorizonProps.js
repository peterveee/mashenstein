// SPEED ZONE's horizon landmarks — the mesa-top props that won the 24 Sep 2026
// bake-off against the old three-dish satellite cluster (src/dev/desert-dish-candidates.js).
// Peter: "i really like C.. but instead of lots of satellites. lets also work in E,G,F
// throught all the 3 levels for a lot more variety" — "also D once".
//
//   big-ear    C — one large steerable telescope; re-aims in step-and-hold moves
//   mast       D — guyed lattice radio mast with microwave drums and beacons
//   wind-pump  E — ranch wind pump over a stock tank; the wheel turns, the rod strokes
//   launch-pad F — rocket and service gantry, venting LOX downwind
//   lookout    G — fire lookout tower; its windows glint on a BEARING, not a clock
//
// Placement (which slot, which level) lives in stylePacks/index.js
// (desertHorizonPropKind). This module only draws one prop with its origin at the
// slot centre on the cap: local y = -2 is the cap surface, and the mesa is painted
// afterwards, covering everything below it.
//
// Colour: far props are the old dish inks with 26% of the sky mixed IN (an opaque
// palette) rather than drawn at alpha 0.74, so lattice members that cross do not
// darken each other.
//
// Nothing here imports stylePacks/index.js: that module imports this one.
import { GROUND_Y } from '../camera.js';

const TAU = Math.PI * 2;
const SKY_TOP = '#f08048';
const SKY_LOW = '#f8c060';
// The shipped dish palette, and the pack's far-prop haze (group alpha 0.74).
const INK = '#4f6f6a';
const DARK = '#324e52';
const LIGHT = '#99aa96';
const PALE = '#c3c9b8';
const RUST = '#8a5a48';
const HAZE = 0.26;
const SUN_X = 380;

// ------------------------------------------------------------------ colour
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, v) => { const k = clamp01((v - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
function rgbOf(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, k) {
  const A = rgbOf(a), B = rgbOf(b);
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(lerp(A[0], B[0], k))}${c(lerp(A[1], B[1], k))}${c(lerp(A[2], B[2], k))}`;
}
function rgba(hex, a) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${clamp01(a).toFixed(3)})`;
}
const skyAt = (y) => mix(SKY_TOP, SKY_LOW, clamp01(y / GROUND_Y));
function palette(skyY) {
  const sky = skyAt(skyY);
  const h = (c) => mix(c, sky, HAZE);
  return {
    sky, ink: h(INK), dark: h(DARK), light: h(LIGHT), pale: h(PALE), rust: h(RUST),
    // Lamps are light, not paint: they sit on top of the haze.
    red: '#ff5a3c', amber: '#ffd27a',
  };
}

// ------------------------------------------------------------------ drawing kit
function strokePath(ctx, color, width, draw, cap = 'round') {
  ctx.beginPath();
  draw(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function fillPath(ctx, color, draw) {
  ctx.beginPath();
  draw(ctx);
  ctx.fillStyle = color;
  ctx.fill();
}
function seg(c, x0, y0, x1, y1) { c.moveTo(x0, y0); c.lineTo(x1, y1); }
function poly(c, pts) {
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
function lamp(ctx, x, y, on, p, r = 1.1) {
  if (on <= 0.01) {
    fillPath(ctx, p.dark, (c) => c.arc(x, y, r * 0.8, 0, TAU));
    return;
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  g.addColorStop(0, rgba(p.red, 0.55 * on));
  g.addColorStop(1, rgba(p.red, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  fillPath(ctx, mix(p.dark, p.red, on), (c) => c.arc(x, y, r, 0, TAU));
  fillPath(ctx, rgba('#fff0d8', 0.8 * on), (c) => c.arc(x, y, r * 0.45, 0, TAU));
}
// An aviation beacon: a soft on/off rather than a hard pop, on its own period.
const beacon = (t, period = 1.6, phase = 0) => {
  const u = ((t / period + phase) % 1 + 1) % 1;
  return smooth(0, 0.06, u) * (1 - smooth(0.26, 0.4, u));
};
// A block footing sitting on the cap (the cap itself is at local y = -2).
function footing(ctx, p, x0, x1, h = 2.2) {
  fillPath(ctx, p.dark, (c) => poly(c, [x0, -1.5, x0 + 1, -1.5 - h, x1 - 1, -1.5 - h, x1, -1.5]));
  strokePath(ctx, p.light, 0.6, (c) => seg(c, x0 + 1.4, -1.2 - h, x1 - 1.4, -1.2 - h), 'butt');
}
// A small equipment hut: ink walls, lit right face, dark flat roof.
function hut(ctx, p, x, w, h) {
  fillPath(ctx, p.ink, (c) => c.rect(x, -1.5 - h, w, h));
  fillPath(ctx, p.light, (c) => c.rect(x + w - 1.6, -1.5 - h, 1.6, h));
  fillPath(ctx, p.dark, (c) => c.rect(x - 0.6, -2.5 - h, w + 1.2, 1.3));
  fillPath(ctx, p.dark, (c) => c.rect(x + w * 0.3, -1.5 - h * 0.62, w * 0.22, h * 0.62));
}
// A tapered lattice between two sloped legs, `panels` X-braced panels.
function lattice(ctx, p, { baseHalf, topHalf, top, panels, leg = 1.2, brace = 0.55, lit = true }) {
  const at = (k) => ({ y: -1.5 + (top + 1.5) * k, half: lerp(baseHalf, topHalf, k) });
  strokePath(ctx, p.ink, brace, (c) => {
    for (let i = 0; i < panels; i++) {
      const a = at(i / panels), b = at((i + 1) / panels);
      seg(c, -a.half, a.y, b.half, b.y);
      seg(c, a.half, a.y, -b.half, b.y);
      if (i > 0) seg(c, -a.half, a.y, a.half, a.y);
    }
  }, 'butt');
  strokePath(ctx, p.dark, leg, (c) => {
    seg(c, -baseHalf, -1.5, -topHalf, top);
    seg(c, baseHalf, -1.5, topHalf, top);
  }, 'butt');
  if (lit) {
    strokePath(ctx, p.light, leg * 0.42, (c) => seg(c, baseHalf - leg * 0.25, -1.5, topHalf - leg * 0.25, top), 'butt');
  }
}

// A parabolic dish seen three-quarter on, its axis along local -y, rotated
// about the bearing at its back. R is the rim radius.
function dish(ctx, p, R, tilt, { feed = 0.9, lampOn = null } = {}) {
  const rimY = -R * 0.46;
  const ry = R * 0.3;
  ctx.save();
  ctx.rotate(tilt);
  // back shell
  fillPath(ctx, p.ink, (c) => {
    c.moveTo(-R, rimY);
    c.quadraticCurveTo(0, R * 0.34, R, rimY);
    c.ellipse(0, rimY, R, ry, 0, 0, Math.PI, false);
  });
  // rim face — the concave interior, lit
  fillPath(ctx, p.light, (c) => c.ellipse(0, rimY, R, ry, 0, 0, TAU));
  // the interior's shaded far wall
  fillPath(ctx, mix(p.light, p.ink, 0.45), (c) => {
    c.ellipse(0, rimY, R, ry, 0, Math.PI, TAU, false);
    c.ellipse(0, rimY + ry * 0.35, R * 0.86, ry * 0.62, 0, TAU, Math.PI, true);
  });
  strokePath(ctx, p.dark, Math.max(0.6, R * 0.06), (c) => {
    c.ellipse(0, rimY, R, ry, 0, 0, TAU);
    c.moveTo(-R, rimY);
    c.quadraticCurveTo(0, R * 0.34, R, rimY);
  });
  // feed legs to the focus
  const fy = rimY - R * feed;
  strokePath(ctx, p.dark, Math.max(0.45, R * 0.045), (c) => {
    seg(c, -R * 0.78, rimY + ry * 0.4, 0, fy);
    seg(c, R * 0.78, rimY + ry * 0.4, 0, fy);
    seg(c, 0, rimY + ry * 0.95, 0, fy);
  });
  const box = Math.max(1.4, R * 0.13);
  fillPath(ctx, p.dark, (c) => c.rect(-box / 2, fy - box * 0.9, box, box));
  if (lampOn != null) lamp(ctx, 0, fy - box * 1.3, lampOn, p, Math.max(0.8, R * 0.05));
  ctx.restore();
}

// ------------------------------------------------------------------ the props
// Each painter draws one slot with its origin at the slot centre on the cap
// (local y = -2 is the cap's surface; the mesa covers everything below it).
// `slot` = { t, x (screen x of the centre), seatDy(dx), p (hazed palette) }.

// C — one big steerable telescope on a wheeled alidade, plus its hut.
function paintBigEar(ctx, slot) {
  const { t, p } = slot;
  const tilt = stepAim(t, [-0.42, -0.2, -0.55, -0.3, -0.08], 5);
  footing(ctx, p, -19, 19, 2.4);
  // the alidade: a braced trapezoid frame up to the elevation bearing
  lattice(ctx, p, { baseHalf: 14, topHalf: 6, top: -24, panels: 2, leg: 1.6, brace: 0.7 });
  strokePath(ctx, p.dark, 1.2, (c) => seg(c, -7, -24, 7, -24), 'butt');
  // counterweight below the bearing, opposite the dish
  ctx.save();
  ctx.translate(0, -24);
  ctx.save();
  ctx.rotate(tilt);
  fillPath(ctx, p.dark, (c) => c.rect(-3, 2, 6, 5));
  fillPath(ctx, p.light, (c) => c.rect(1.6, 2, 1.4, 5));
  ctx.restore();
  dish(ctx, p, 23, tilt, { feed: 0.86, lampOn: beacon(t, 2.2) });
  fillPath(ctx, p.dark, (c) => c.arc(0, 0, 1.8, 0, TAU));
  fillPath(ctx, p.light, (c) => c.arc(0.5, -0.5, 0.7, 0, TAU));
  ctx.restore();
  hut(ctx, p, 25, 12, 6);
  strokePath(ctx, p.dark, 0.5, (c) => seg(c, 34, -9.5, 34, -15), 'butt');
}

// D — a guyed lattice radio mast with a blinking beacon and microwave drums.
function paintMast(ctx, slot) {
  const { t, p } = slot;
  const H = 60;
  // guys first so the mast crosses over them
  const guys = [[-20, -30], [-40, -44], [-56, -44], [-20, 30], [-40, 44], [-56, 44]];
  strokePath(ctx, rgba(p.dark, 0.7), 0.42, (c) => {
    for (const [y, ax] of guys) {
      const k = y / -H;
      seg(c, Math.sign(ax) * lerp(3.4, 0.9, k), y, ax, -2 + slot.seatDy(ax));
    }
  });
  for (const ax of [-30, -44, 30, 44]) {
    fillPath(ctx, p.dark, (c) => c.rect(ax - 1, -3 + slot.seatDy(ax), 2, 1.4));
  }
  hut(ctx, p, -14, 8, 5);
  lattice(ctx, p, { baseHalf: 3.4, topHalf: 0.9, top: -H, panels: 12, leg: 0.95, brace: 0.45 });
  strokePath(ctx, p.dark, 0.7, (c) => seg(c, 0, -H, 0, -H - 6), 'butt');
  // microwave drums
  const drum = (x, y, dir) => {
    fillPath(ctx, p.ink, (c) => c.rect(dir > 0 ? x : x - 3.2, y - 2.4, 3.2, 4.8));
    fillPath(ctx, p.light, (c) => c.ellipse(x + dir * 3.2, y, 1.2, 2.5, 0, 0, TAU));
    strokePath(ctx, p.dark, 0.45, (c) => c.ellipse(x + dir * 3.2, y, 1.2, 2.5, 0, 0, TAU));
  };
  drum(-1.6, -40, -1);
  drum(1.4, -33, 1);
  lamp(ctx, 0, -30, beacon(t, 1.6, 0.5) * 0.7, p, 0.8);
  lamp(ctx, 0, -H - 6.5, beacon(t, 1.6), p, 1.2);
}

// E — a farm wind pump over a stock tank; the wheel turns, the rod pumps.
function paintWindPump(ctx, slot) {
  const { t, p } = slot;
  const spin = t * 2.1;
  // stock tank
  ctx.save();
  ctx.translate(24, 0);
  fillPath(ctx, p.ink, (c) => c.rect(-11, -7.5, 22, 6));
  fillPath(ctx, p.light, (c) => c.rect(7, -7.5, 4, 6));
  strokePath(ctx, p.dark, 0.5, (c) => { seg(c, -11, -4.6, 11, -4.6); }, 'butt');
  fillPath(ctx, p.dark, (c) => c.ellipse(0, -7.5, 11, 1.8, 0, 0, TAU));
  fillPath(ctx, mix(p.sky, p.light, 0.35), (c) => c.ellipse(0, -7.3, 9.6, 1.1, 0, 0, TAU));
  ctx.restore();
  strokePath(ctx, p.dark, 0.6, (c) => { seg(c, 0, -4, 13, -4); }, 'butt');
  // tower
  lattice(ctx, p, { baseHalf: 9, topHalf: 1.8, top: -40, panels: 4, leg: 1.2, brace: 0.5 });
  fillPath(ctx, p.dark, (c) => c.rect(-4, -41.2, 8, 1.4));
  // pump rod, stroking with the crank
  const stroke = 1.3 * Math.sin(spin);
  strokePath(ctx, p.dark, 0.55, (c) => seg(c, 0, -43 + stroke, 0, -5), 'butt');
  fillPath(ctx, p.light, (c) => c.rect(-0.8, -12 + stroke, 1.6, 1.6));
  // tail vane
  strokePath(ctx, p.dark, 0.7, (c) => seg(c, -3, -46, 11, -45.5), 'butt');
  fillPath(ctx, p.light, (c) => poly(c, [9, -49, 17, -50.5, 17, -42, 9, -43]));
  strokePath(ctx, p.dark, 0.5, (c) => poly(c, [9, -49, 17, -50.5, 17, -42, 9, -43]));
  fillPath(ctx, p.dark, (c) => c.rect(-2, -47, 4, 3.2));
  // the wheel, three-quarter on: blades as slats on a tilted ellipse
  const cx = -4, cy = -46, rx = 6.2, ry = 12.5;
  const blades = 18;
  // Each blade is a thin wedge on the tilted wheel, lit when it faces the sun
  // side, so the turning reads as blades passing rather than a rolling eye.
  for (let i = 0; i < blades; i++) {
    const a = spin + i * TAU / blades;
    const a2 = a + TAU / blades * 0.55;
    const pt = (ang, r) => [cx + Math.sin(ang) * rx * r, cy - Math.cos(ang) * ry * r];
    const lit = Math.sin(a) > -0.1;
    fillPath(ctx, lit ? p.light : p.ink, (c) => {
      const [x0, y0] = pt(a, 0.3), [x1, y1] = pt(a, 1), [x2, y2] = pt(a2, 1), [x3, y3] = pt(a2, 0.3);
      c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath();
    });
  }
  strokePath(ctx, p.dark, 0.5, (c) => c.ellipse(cx, cy, rx, ry, 0, 0, TAU));
  strokePath(ctx, p.dark, 0.4, (c) => c.ellipse(cx, cy, rx * 0.62, ry * 0.62, 0, 0, TAU));
  fillPath(ctx, p.dark, (c) => c.ellipse(cx, cy, 1.1, 1.8, 0, 0, TAU));
}

// F — a rocket on its launch mount beside a service gantry, venting — and on
// speed-2-3, LAUNCHING (Peter, 24 Sep: "can the rocket take off?").
//
// `slot.launch` is the launch clock in seconds (null = never, < 0 = still on the
// pad). The caller derives it from where the pad is on screen rather than from
// the wall clock, so a rewind or a retry puts the rocket back exactly where it was
// for that camera — the same rule the speed-3 jet flies by. Timeline: vent until
// 0; ignition, the arms swing back and the base smoke billows to LIFT; then a
// constant-acceleration climb with a smoke trail that stays behind, drifting
// downwind, long after the rocket has gone off the top.
const ROCKET_LIFT = 1.6;       // seconds of ignition before it leaves the mount
const ROCKET_ACCEL = 16;       // px/s² of climb, in the prop's own units
const ROCKET_GONE = 440;       // altitude past which nothing is left to draw
const ROCKET_TRAIL_STEP = 0.2;  // seconds between trail puffs
const rocketAlt = (tau) => (tau <= ROCKET_LIFT ? 0 : 0.5 * ROCKET_ACCEL * (tau - ROCKET_LIFT) ** 2);

function rocketBody(ctx, p) {
  const booster = (x) => {
    fillPath(ctx, p.pale, (c) => { c.moveTo(x - 1.6, -4.5); c.lineTo(x - 1.6, -24); c.lineTo(x, -28.5); c.lineTo(x + 1.6, -24); c.lineTo(x + 1.6, -4.5); c.closePath(); });
    fillPath(ctx, p.ink, (c) => c.rect(x - 1.6, -24, 1.1, 19.5));
    fillPath(ctx, p.dark, (c) => c.rect(x - 1.8, -6.5, 3.6, 2));
  };
  booster(1.2);
  booster(12.8);
  // core stage
  const L = 3.8, Rr = 10.2;
  fillPath(ctx, p.pale, (c) => {
    c.moveTo(L, -4.5); c.lineTo(L, -46);
    c.quadraticCurveTo(L + 0.3, -52, 7, -56.5);
    c.quadraticCurveTo(Rr - 0.3, -52, Rr, -46);
    c.lineTo(Rr, -4.5); c.closePath();
  });
  fillPath(ctx, mix(p.pale, p.ink, 0.55), (c) => c.rect(L, -46, 2, 41.5));
  fillPath(ctx, p.dark, (c) => { c.rect(L, -34, Rr - L, 1.6); c.rect(L, -20, Rr - L, 1.2); });
  fillPath(ctx, p.ink, (c) => { c.moveTo(L + 0.4, -51.5); c.quadraticCurveTo(L + 1, -54.5, 7, -56.5); c.lineTo(7, -51.5); c.closePath(); });
  strokePath(ctx, p.dark, 0.5, (c) => {
    c.moveTo(L, -4.5); c.lineTo(L, -46);
    c.quadraticCurveTo(L + 0.3, -52, 7, -56.5);
    c.quadraticCurveTo(Rr - 0.3, -52, Rr, -46);
    c.lineTo(Rr, -4.5);
  });
}

// Three nozzles' worth of flame hanging off the bottom of the stack, `k` 0..1 of
// full thrust. Light, not paint: it is not hazed.
function rocketFlame(ctx, t, k) {
  const flick = 1 + 0.16 * Math.sin(t * 47) + 0.1 * Math.sin(t * 31 + 1.3);
  const glow = ctx.createRadialGradient(7, -2, 0, 7, -2, 16);
  glow.addColorStop(0, `rgba(255,200,110,${(0.5 * k).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-9, -18, 32, 32);
  for (const [x, w, len] of [[1.2, 1.5, 7], [7, 2.8, 11], [12.8, 1.5, 7]]) {
    const h = len * k * flick;
    fillPath(ctx, 'rgba(255,120,48,0.85)', (c) => {
      c.moveTo(x - w, -4.5); c.quadraticCurveTo(x - w * 0.9, -4.5 + h * 0.55, x, -4.5 + h);
      c.quadraticCurveTo(x + w * 0.9, -4.5 + h * 0.55, x + w, -4.5); c.closePath();
    });
    fillPath(ctx, '#fff1b8', (c) => {
      c.moveTo(x - w * 0.5, -4.5); c.quadraticCurveTo(x - w * 0.4, -4.5 + h * 0.4, x, -4.5 + h * 0.62);
      c.quadraticCurveTo(x + w * 0.4, -4.5 + h * 0.4, x + w * 0.5, -4.5); c.closePath();
    });
  }
}

function paintLaunchPad(ctx, slot) {
  const { t, p } = slot;
  const tau = Number.isFinite(slot.launch) ? slot.launch : -1;
  const smoke = mix(p.pale, '#ffffff', 0.25);
  footing(ctx, p, -22, 16, 3);
  // gantry
  ctx.save();
  ctx.translate(-12, 0);
  lattice(ctx, p, { baseHalf: 5, topHalf: 4, top: -58, panels: 8, leg: 1.1, brace: 0.5 });
  strokePath(ctx, p.dark, 0.6, (c) => seg(c, 0, -58, 0, -66), 'butt');
  ctx.restore();
  // service arms, swinging back to the tower at ignition
  const reach = 1.5 - 8.5 * smooth(0, 0.7, tau);
  strokePath(ctx, p.dark, 1.1, (c) => { seg(c, -8, -46, reach, -46); seg(c, -8, -30, reach, -30); }, 'butt');
  strokePath(ctx, p.light, 0.4, (c) => { seg(c, -8, -46.6, reach, -46.6); }, 'butt');
  // the trail, puffs laid where the stack's base was when each was shed
  if (tau > ROCKET_LIFT) {
    const n = Math.min(80, Math.floor((tau - ROCKET_LIFT) / ROCKET_TRAIL_STEP));
    for (let k = 0; k <= n; k++) {
      const born = ROCKET_LIFT + k * ROCKET_TRAIL_STEP;
      const alt = rocketAlt(born);
      if (alt > ROCKET_GONE) break;
      const age = tau - born;
      const a = 0.62 * Math.exp(-age / 7) * smooth(0, 0.15, age);
      if (a < 0.02) continue;
      const r = 2.6 + Math.min(age, 8) * 1.25;
      fillPath(ctx, rgba(smoke, a), (c) => c.arc(7 + age * 2.2 + Math.sin(k * 2.1) * 0.8, -2 - alt + r * 0.3, r, 0, TAU));
    }
  }
  // the stack: on the mount, trembling through ignition, then climbing
  const alt = rocketAlt(tau);
  if (alt < ROCKET_GONE) {
    const shake = tau > 0 && tau < ROCKET_LIFT + 1 ? Math.sin(t * 61) * 0.35 * smooth(0, 0.5, tau) : 0;
    ctx.save();
    ctx.translate(shake, -alt);
    if (tau > 0) rocketFlame(ctx, t, smooth(0, 0.9, tau));
    rocketBody(ctx, p);
    ctx.restore();
  }
  // launch mount
  fillPath(ctx, p.dark, (c) => c.rect(-2, -6, 17, 2.4));
  if (tau < 0) {
    // LOX vent: puffs leave the core's lit side and drift downwind
    const Rr = 10.2;
    for (let i = 0; i < 5; i++) {
      const age = ((t * 0.42 + i / 5) % 1);
      const x = Rr + 1 + age * 17;
      const y = -31 - age * 5 + Math.sin(age * 5 + i) * 0.6;
      const r = 0.9 + age * 3.4;
      fillPath(ctx, rgba(smoke, 0.62 * (1 - age) * smooth(0, 0.08, age)), (c) => c.arc(x, y, r, 0, TAU));
    }
  } else {
    // the base billow: smoke thrown out both ways along the pad from ignition,
    // spreading and thinning over the next ten seconds
    const grow = smooth(0, 3.5, tau);
    const fade = 1 - smooth(4, 12, tau);
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const reachX = (4 + (i >> 1) * 5.6) * (0.35 + grow);
      const r = (3.4 + (i >> 1) * 0.9) * (0.5 + grow * 0.8);
      const x = 7 + side * reachX + Math.sin(t * 0.9 + i) * 0.6 + tau * 0.6;
      const y = -3 - r * 0.45 - Math.sin(i * 1.7) * 0.8;
      fillPath(ctx, rgba(smoke, 0.8 * fade * smooth(0, 0.25, tau - i * 0.03)), (c) => c.arc(x, y, r, 0, TAU));
    }
  }
  ctx.save();
  ctx.translate(-12, 0);
  lamp(ctx, 0, -66.5, beacon(t, tau >= 0 ? 0.7 : 1.8), p, 1.1);
  ctx.restore();
}

// G — a fire lookout: braced timber tower, glazed cab, a flag, and a glint that
// is an ANGLE — the windows catch the sun as the camera carries the tower past
// a bearing, never on a clock.
function paintLookout(ctx, slot) {
  const { t, p } = slot;
  lattice(ctx, p, { baseHalf: 11, topHalf: 6.5, top: -38, panels: 4, leg: 1.4, brace: 0.55 });
  // stair flights zig-zagging up the centre
  strokePath(ctx, p.light, 0.45, (c) => {
    const flights = 5;
    for (let i = 0; i < flights; i++) {
      const y0 = -2 - i * 7.2, y1 = y0 - 7.2;
      const w = lerp(6.5, 3.8, i / flights);
      if (i % 2) seg(c, w, y0, -w, y1); else seg(c, -w, y0, w, y1);
    }
  }, 'butt');
  // catwalk
  strokePath(ctx, p.dark, 0.9, (c) => seg(c, -12, -38.5, 12, -38.5), 'butt');
  strokePath(ctx, p.dark, 0.45, (c) => {
    seg(c, -12, -42, 12, -42);
    for (const x of [-12, -9.5, 9.5, 12]) seg(c, x, -38.5, x, -42);
  }, 'butt');
  // cab
  fillPath(ctx, p.ink, (c) => c.rect(-9, -49, 18, 10.5));
  const glint = Math.exp(-(((slot.x - (SUN_X - 150)) / 55) ** 2));
  const glass = mix(mix(p.sky, p.light, 0.55), '#fff6dc', glint * 0.85);
  fillPath(ctx, glass, (c) => c.rect(-8, -47.2, 16, 4.6));
  fillPath(ctx, p.light, (c) => c.rect(7, -49, 2, 10.5));
  strokePath(ctx, p.dark, 0.5, (c) => { for (const x of [-4, 0, 4]) seg(c, x, -47.2, x, -42.6); }, 'butt');
  if (glint > 0.05) {
    // The streak slides across the panes with the bearing it is caught at.
    const sx = -8 + 16 * clamp01((slot.x - (SUN_X - 230)) / 160);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-8, -47.2, 16, 4.6);
    ctx.clip();
    fillPath(ctx, rgba('#ffffff', 0.7 * glint), (c) => poly(c, [sx - 1, -42.6, sx + 1.5, -47.2, sx + 3.2, -47.2, sx + 0.7, -42.6]));
    ctx.restore();
  }
  // hip roof
  fillPath(ctx, p.dark, (c) => poly(c, [-11, -48.6, -3, -54.5, 3, -54.5, 11, -48.6]));
  strokePath(ctx, p.light, 0.6, (c) => seg(c, 3, -54.3, 10.4, -49), 'butt');
  // flag
  strokePath(ctx, p.dark, 0.5, (c) => seg(c, 0, -54.5, 0, -64), 'butt');
  const flap = (u) => Math.sin(t * 5.2 - u * 3.2) * 0.9 * u;
  fillPath(ctx, p.rust, (c) => {
    c.moveTo(0, -63.8);
    for (let i = 1; i <= 4; i++) { const u = i / 4; c.lineTo(u * 7, -63.8 + flap(u)); }
    for (let i = 4; i >= 0; i--) { const u = i / 4; c.lineTo(u * 7, -60.2 + flap(u)); }
    c.closePath();
  });
}

// A tracking antenna does not wag: it holds a bearing, re-aims, settles, holds.
// Smoothstep between set bearings, `hold` seconds each.
function stepAim(t, aims, hold) {
  const u = t / hold;
  const k = Math.floor(u);
  const f = u - k;
  const at = (i) => aims[((i % aims.length) + aims.length) % aims.length];
  return lerp(at(k), at(k + 1), smooth(0.6, 1, f));
}


const PAINTERS = {
  'big-ear': paintBigEar,
  mast: paintMast,
  'wind-pump': paintWindPump,
  'launch-pad': paintLaunchPad,
  lookout: paintLookout,
};

export const DESERT_HORIZON_PROP_KINDS = Object.freeze(Object.keys(PAINTERS));
export function isDesertHorizonProp(kind) { return Object.hasOwn(PAINTERS, kind); }

/**
 * One horizon prop. `x`, `baseY` = the slot centre on the cap in the current (far-layer)
 * coordinates; `skyY` = the screen y the haze is sampled at (the far layer is translated,
 * so the caller adds its offset); `seat(x)` = the cap's crest (+2) at any x, for props
 * whose feet or guys land away from the centre. Portrait stretches the prop 1.18x
 * vertically, as it did the dishes.
 */
export function drawDesertHorizonProp(ctx, kind, { t = 0, x = 0, baseY = 0, skyY = baseY - 24,
  seat = null, portrait = false, launch = null } = {}) {
  const paint = PAINTERS[kind];
  if (!paint) return;
  const seatDy = seat ? (dx) => seat(x + dx) - baseY : () => 0;
  ctx.save();
  ctx.translate(x, baseY);
  if (portrait) ctx.scale(1, 1.18);
  paint(ctx, { t: Number.isFinite(Number(t)) ? Number(t) : 0, x, seatDy, p: palette(skyY), launch });
  ctx.restore();
}
