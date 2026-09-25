// SPEED ZONE — what stands on the high mesa? A gallery-only bake-off for the slot
// the satellite-dish cluster holds today (horizon slots 1 and 4 of the six-slot
// far-mesa cycle, centred on the broad cap, about one pass a stage). Nothing here
// is registered as scenery; the run is untouched.
//
// THE SLOT, as the shipped painter defines it (stylePacks/index.js):
//   - far mesa layer, parallax 0.12, painted BEFORE the mesa so the cap swallows
//     the last 2px of every foot (baseY = crest + 2);
//   - centred on the cap (DESERT_HIGH_MESA_PHASE), whose flat top is ~173px wide;
//   - the cluster is three dishes at -24/0/+24, 0.68/0.86/0.68 scale, ~36px tall,
//     group alpha 0.74; portrait stretches the prop 1.18x vertically.
//
// HOW A CANDIDATE GETS INTO THE REAL SCENE. The shipped dish painter is not
// exported, and the pack cannot be edited, so drawDesertDishScene runs the REAL
// pack.bg with the three shipped dish colours (DESERT_SATELLITE_INK / DARK / LIGHT,
// used by nothing else in the file) suppressed, and at the moment the pack reaches
// its first dish draw — i.e. in the far layer, before the mesa — paints the
// candidate at the same slot, from the pack's own placements and ridge sampler.
// Depth order, planting and parallax are therefore the pack's, not a copy.
//
// Colour: the shipped props are ink at alpha 0.74 over the sky. Painting a lattice
// that way darkens every crossing, so candidates pre-mix the same 26% of sky into
// an opaque palette instead — identical over sky, clean where members overlap.
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { __testing as PACK } from '../engine/stylePacks/index.js';
import { backgroundParallaxOffset, resolveSceneryLayout } from '../engine/scenery-layout.js';
import { resolveCompositionProfile } from '../engine/composition-profile.js';
import { frameForViewport, PORTRAIT_BACKGROUND_ZOOM } from '../engine/frame.js';
import { portraitHudLayout } from '../game/portrait-layout.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';

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
const DESERT_FAR_WL = 230;
const DESERT_FAR_FACTOR = 0.12;
const PORTRAIT_STRETCH = 1.18;
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

// ------------------------------------------------------------------ candidates
// Each painter draws one slot with its origin at the slot centre on the cap
// (local y = -2 is the cap's surface; the mesa covers everything below it).
// `slot` = { t, x (screen x of the centre), seatDy(dx), p (hazed palette) }.

// B — four telescopes on A-frame yokes along a rail, slewing together.
function paintArray(ctx, slot) {
  const { t, p } = slot;
  const tilt = -0.62 + 0.16 * Math.sin(t * 0.31);
  strokePath(ctx, p.dark, 0.8, (c) => seg(c, -68, -2.4, 68, -2.4), 'butt');
  strokePath(ctx, p.light, 0.4, (c) => seg(c, -68, -3.1, 68, -3.1), 'butt');
  hut(ctx, p, 68, 13, 6.5);
  for (const dx of [-54, -18, 18, 54]) {
    ctx.save();
    ctx.translate(dx, slot.seatDy(dx));
    footing(ctx, p, -5, 5, 1.8);
    strokePath(ctx, p.dark, 1.5, (c) => { seg(c, -4.2, -3, 0, -14); seg(c, 4.2, -3, 0, -14); }, 'butt');
    strokePath(ctx, p.ink, 0.6, (c) => seg(c, -2.4, -8, 2.4, -8), 'butt');
    ctx.translate(0, -14);
    dish(ctx, p, 11, tilt, { feed: 0.95 });
    fillPath(ctx, p.dark, (c) => c.arc(0, 0, 1.1, 0, TAU));
    ctx.restore();
  }
}

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

// F — a rocket on its launch mount beside a service gantry, venting.
function paintLaunchPad(ctx, slot) {
  const { t, p } = slot;
  footing(ctx, p, -22, 16, 3);
  // gantry
  ctx.save();
  ctx.translate(-12, 0);
  lattice(ctx, p, { baseHalf: 5, topHalf: 4, top: -58, panels: 8, leg: 1.1, brace: 0.5 });
  strokePath(ctx, p.dark, 0.6, (c) => seg(c, 0, -58, 0, -66), 'butt');
  ctx.restore();
  // service arms
  strokePath(ctx, p.dark, 1.1, (c) => { seg(c, -8, -46, 1.5, -46); seg(c, -8, -30, 1.5, -30); }, 'butt');
  strokePath(ctx, p.light, 0.4, (c) => { seg(c, -8, -46.6, 1.5, -46.6); }, 'butt');
  // side boosters
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
  // launch mount
  fillPath(ctx, p.dark, (c) => c.rect(-2, -6, 17, 2.4));
  // LOX vent: puffs leave the core's lit side and drift downwind
  for (let i = 0; i < 5; i++) {
    const age = ((t * 0.42 + i / 5) % 1);
    const x = Rr + 1 + age * 17;
    const y = -31 - age * 5 + Math.sin(age * 5 + i) * 0.6;
    const r = 0.9 + age * 3.4;
    fillPath(ctx, rgba(mix(p.pale, '#ffffff', 0.25), 0.62 * (1 - age) * smooth(0, 0.08, age)), (c) => c.arc(x, y, r, 0, TAU));
  }
  ctx.save();
  ctx.translate(-12, 0);
  lamp(ctx, 0, -66.5, beacon(t, 1.8), p, 1.1);
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

export const DESERT_DISH_CANDIDATES = [
  { id: 'now', letter: 'A', name: 'NOW — the shipped horizon (C)',
    note: 'What ships since 24 Sep: the big ear in this slot (drawn by the real pack). The old three-dish cluster still draws in the production gallery (satellite-dish-cluster).' },
  { id: 'array', letter: 'B', name: 'ARRAY ROW', paint: paintArray,
    note: 'Four radio telescopes on A-frame yokes along a rail, all slewing together as one instrument. A row reads as a place with a purpose; the dishes stop being three separate toys.' },
  { id: 'big-ear', letter: 'C', name: 'THE BIG EAR · SHIPS', paint: paintBigEar,
    note: 'One large steerable telescope on a braced alidade with its hut and a blinking feed lamp. It re-aims in slow step-and-hold moves like a real tracking antenna instead of wagging; one landmark, twice the size, instead of a busy cluster.' },
  { id: 'mast', letter: 'D', name: 'RADIO MAST · SHIPS (speed-2)', paint: paintMast,
    note: 'A guyed lattice mast with microwave drums, an equipment hut and a red beacon blinking at the top. The tallest, thinnest silhouette on the horizon, and the beacon is the motion.' },
  { id: 'wind-pump', letter: 'E', name: 'WIND PUMP & TANK · SHIPS (speed-1)', paint: paintWindPump,
    note: 'A ranch wind pump over a stock tank: the slatted wheel turns and the pump rod strokes with it. Pure Western; the turning wheel sits one slot away from the wind farm, so it is a different rhythm, not a repeat.' },
  { id: 'launch-pad', letter: 'F', name: 'LAUNCH PAD · SHIPS (speed-3)', paint: paintLaunchPad,
    note: 'A rocket with two boosters on its mount beside a service gantry, venting LOX puffs downwind, with a beacon on the gantry. Keeps the dishes\' space theme but as one bold vertical story.' },
  { id: 'lookout', letter: 'G', name: 'FIRE LOOKOUT · SHIPS (speed-2)', paint: paintLookout,
    note: 'A braced timber lookout tower with a glazed cab and a flapping flag. Its windows glint as the camera carries it past the sun\'s bearing, so the highlight is an angle, not a clock.' },
];

const BY_ID = new Map(DESERT_DISH_CANDIDATES.map((c) => [c.id, c]));

// ------------------------------------------------------------------ slot geometry
function farGeometry(ctx, backgroundContext) {
  const portrait = !!backgroundContext?.portrait;
  const amp = portrait ? PACK.DESERT_FAR_PORTRAIT_AMP : PACK.DESERT_FAR_AMP;
  const band = backgroundContext?.sceneryLayout?.bands?.farLandmark;
  const baseY = (band && Number.isFinite(Number(band.center)) ? Number(band.center) + amp : GROUND_Y)
    + (portrait ? PACK.DESERT_FAR_PORTRAIT_DROP : 0);
  const offset = -PACK.desertSceneryLift(portrait)
    - (portrait ? 0 : PACK.DESERT_LANDSCAPE_BACK_LIFT)
    + backgroundParallaxOffset(backgroundContext?.cameraShiftY, 'far');
  return { portrait, amp, baseY, offset };
}

// The dish slots in view, one per cluster, in far-layer coordinates.
export function desertDishSlots(ctx, camX, backgroundContext = null) {
  const g = farGeometry(ctx, backgroundContext);
  // SETTLED 24 Sep 2026: C shipped (stylePacks/desertHorizonProps.js) and took over
  // the dish slot, so the old cluster no longer draws and 'now' shows the shipped
  // horizon. The slot is now the big ear's.
  const dishes = PACK.desertLandmarkPropPlacements(ctx, camX, g.baseY, { portrait: g.portrait })
    .filter((d) => d.kind === 'big-ear');
  const clusters = new Map();
  for (const d of dishes) {
    const cx = d.x;
    if (!clusters.has(d.index)) clusters.set(d.index, { index: d.index, x: cx });
  }
  const left = PACK.backgroundPaintCoverage(ctx).left;
  const ridge = (x) => PACK.ridgeYAt(x, camX, g.baseY, g.amp, DESERT_FAR_WL, DESERT_FAR_FACTOR,
    { mesa: true, coverageLeft: left }) + 2;
  return [...clusters.values()].map((s) => {
    const baseY = ridge(s.x);
    return { ...s, baseY, seatDy: (dx) => ridge(s.x + dx) - baseY, offset: g.offset, portrait: g.portrait };
  });
}

function paintSlots(ctx, t, candidate, slots) {
  for (const s of slots) {
    ctx.save();
    ctx.translate(s.x, s.baseY);
    if (s.portrait) ctx.scale(1, PORTRAIT_STRETCH);
    const p = palette(s.baseY + s.offset - 24);
    candidate.paint(ctx, { t, x: s.x, seatDy: s.seatDy, p });
    ctx.restore();
  }
}

// The real pack.bg, with the shipped dish swapped for `candidate` in its own
// slot and at its own depth. 'now' runs the pack untouched.
export function drawDesertDishBackdrop(ctx, t, camX, cab, pack, candidateId, backgroundContext = null, totalDist = Infinity) {
  const candidate = BY_ID.get(candidateId);
  if (!candidate || !candidate.paint) {
    pack.bg(ctx, t, camX, cab, totalDist, null, 0, backgroundContext);
    return;
  }
  // SETTLED: the pack now draws the big ear in this slot. The pack's harness hook
  // paints the candidate there instead, in the pack's own far-layer frame.
  ctx.__mashDesertHorizonOverride = (c, prop, o) => {
    if (prop.kind !== 'big-ear') return false;
    c.save();
    c.translate(prop.x, prop.baseY);
    if (o.portrait) c.scale(1, PORTRAIT_STRETCH);
    const p = palette(prop.baseY + (o.skyOffset || 0) - 24);
    candidate.paint(c, { t, x: prop.x, seatDy: (dx) => o.seat(prop.x + dx) - prop.baseY, p });
    c.restore();
    return true;
  };
  try {
    pack.bg(ctx, t, camX, cab, totalDist, null, 0, backgroundContext);
  } finally {
    delete ctx.__mashDesertHorizonOverride;
  }
}

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// The camera position that puts the dish slot's centre at screen x `screenX`
// (landscape, run zoom). Slot index 1 is the first cluster of a stage.
export function desertDishCamX(screenX = 240, index = 1) {
  const period = Math.max(16, Math.round(Math.PI * DESERT_FAR_WL));
  const phase = PACK.DESERT_HIGH_MESA_PHASE;
  return (phase + index * period - screenX) / (DESERT_FAR_FACTOR * ZOOM);
}

// A 480x270 landscape frame: real backdrop, lane and hero, candidate in the slot.
export function drawDesertDishScene(ctx, t, cab, pack, candidateId, camX) {
  drawDesertDishBackdrop(ctx, t, camX, cab, pack, candidateId);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}

// A magnified crop of that same landscape frame, centred on the slot.
export function drawDesertDishCloseUp(ctx, t, cab, pack, candidateId, w, h, zoom = 3) {
  const camX = desertDishCamX(240);
  const slot = desertDishSlots(ctx, camX)[0];
  const sx = slot ? slot.x : 240;
  const sy = slot ? slot.baseY + slot.offset : 100;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.translate(w / 2 - zoom * sx, h * 0.8 - zoom * sy);
  ctx.scale(zoom, zoom);
  drawDesertDishBackdrop(ctx, t, camX, cab, pack, candidateId);
  ctx.restore();
}

// The portrait read: the speed backdrop as an iPhone (390x844) frame paints it —
// the pack's portrait branch, the resolved scenery bands, the 1.78 backdrop zoom
// around the groundline — cropped to the band from the sky to the far ridges.
// The lane and HUD are left out; the slot is centred in the picture.
let portraitCache = null;
function portraitSetup() {
  if (portraitCache) return portraitCache;
  const frame = frameForViewport({
    mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
    safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
  });
  const zoom = PORTRAIT_BACKGROUND_ZOOM;
  const sceneryLayout = resolveSceneryLayout({
    frame, hud: portraitHudLayout(frame), groundY: GROUND_Y, backgroundZoom: zoom,
    bands: resolveCompositionProfile('speed').bands,
  });
  const half = 240;
  const coverage = Object.freeze({
    left: -half / zoom + half, right: half / zoom + half, width: 480 / zoom, lookahead: 96 / zoom,
  });
  portraitCache = {
    frame, zoom, coverage, frameShift: frame.groundScreenY - GROUND_Y,
    context: {
      portrait: true, stageIndex: 1, heroId: 'lorenzo', heroFrac: 0.2, progress: 0.4,
      roadGaps: [], cameraShiftY: 0, frameShift: 0, sceneryLayout, backgroundZoom: zoom,
      worldZoom: 3.5, backgroundXOffset: 0, worldXOffset: 0,
    },
  };
  return portraitCache;
}

export function drawDesertDishPortrait(ctx, t, cab, pack, candidateId, w, h, { cropTop = 170 } = {}) {
  const P = portraitSetup();
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, cab.sky[0]);
  sky.addColorStop(1, cab.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.scale(w / 480, w / 480);
  ctx.translate(0, -cropTop + P.frameShift);
  ctx.translate(240, GROUND_Y);
  ctx.scale(P.zoom, P.zoom);
  ctx.translate(-240, -GROUND_Y);
  const prev = ctx.__mashBackgroundCoverage;
  ctx.__mashBackgroundCoverage = P.coverage;
  try {
    // Slot centre on the picture's centre line.
    const period = Math.max(16, Math.round(Math.PI * DESERT_FAR_WL));
    const left = P.coverage.left - P.coverage.lookahead;
    const camX = (left + PACK.DESERT_HIGH_MESA_PHASE + period - 240) / (DESERT_FAR_FACTOR * ZOOM);
    drawDesertDishBackdrop(ctx, t, camX, cab, pack, candidateId, P.context);
  } finally {
    if (prev === undefined) delete ctx.__mashBackgroundCoverage;
    else ctx.__mashBackgroundCoverage = prev;
    ctx.restore();
  }
}

// The candidate alone on a plain cap slice, for the thumbnail row.
export function drawDesertDishCandidate(ctx, candidateId, t = 0, { skyY = 90 } = {}) {
  const c = BY_ID.get(candidateId);
  if (!c?.paint) return;
  c.paint(ctx, { t, x: SUN_X - 150, seatDy: () => 0, p: palette(skyY) });
}
