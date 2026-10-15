// REDRAWS of ten older lane obstacles that were painted in the faint hand of
// props.js (no outline, or a 30%-alpha one), redrawn in the bold
// 15 Oct 2026 hand (Peter, 15 Oct 2026): a SOLID dark contour at ~0.55 envelope
// units, interior lines ~0.34 and fine ~0.2, flat saturated fills with one lit
// sliver and one shade band — and FLAT AND FRONT-ON: no perspective, no top
// plane, no receding side, no ellipse rim seen from above.
//
// THESE ARE REDRAWS, NOT NEW OBJECTS. Each keeps the silhouette, the colours and
// the motion of the painter it replaces (`replaces`, a PROP_PAINTERS name), so
// the bird still flaps on six frames, the drone's rotor still turns on six with
// a marked tip, the eye drone still sweeps its lens over sixteen with the rotor's
// five turns folded inside, and the rake still swings on its fifteen.
//
// THE COORDINATES. Every painter fills its PAINTED ENVELOPE in world units — box
// x 4/3 x PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h; the fliers
// fill theirs and the kit lifts them to their altitude. `t` is a clock each
// painter quantises to its own ring with frameOf.
//
// The generic pieces (bird, drones, cone, rake) take the game-wide crate and
// barrel's ink (sprites/crateBarrel.js), so they sit on every cabinet's ground
// the way those two do. The tombstone is Crypt's own and wears the gouache of the
// shipped crypt cast (sprites/cryptProps.js); the ice crystals are Frost's own
// and are cut pieces in the frost sheet's slate ink (sprites/frostProps.js).
//
// SHIPPED 15 Oct 2026 ("Othewise I am happy to ship all these", the drone given an
// eye like the eye drone's first): props.js paints each of these through
// REDRAW_PAINTERS below. Nothing here imports props.js, draw.js or the bake-off kit.

import * as G from '../sprites/crateBarrel.js';
import { outlined } from './outline.js';
import * as CR from '../sprites/cryptProps.js';
import * as FR from '../sprites/frostProps.js';
import * as PL from '../sprites/plumberProps.js';

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;
const TAU = Math.PI * 2;
const { INK, LW, LWI, LWF, pen, box, line, circ, ell, body, rrect, shape } = G;

// ------------------------------------------------------------------ A buzzbird
// The orange songbird, six frames of wingbeat at 16fps, body and head held still
// (the entity bob already moves it). Drawn right-facing and mirrored once, as the
// original is: it flies beak-first toward the hero, right to left.
const BIRD = '#e8762c', BIRD_DK = '#b8521c', BIRD_LT = '#ffa65a';
const WING = '#ffbe78', WING_DK = '#e0843a';
const BELLY = '#ffd9a0';
const BEAK = '#f6d33c', BEAK_DK = '#c99a18';
const EYE = '#1a1028';

function buzzbirdBody(c, w, h, f) {
  const ph = (f / 6) * TAU;
  const beat = Math.sin(ph); // +1 up, -1 down
  // Height and tilt off sin, breadth off SIGNED cos: broad on the downstroke,
  // feathered on the recovery — the same split that keeps the original's six
  // frames distinct.
  const ang = 0.02 + beat * 0.82;          // radians above the horizontal, pointing back
  const breadth = 2.7 - Math.cos(ph) * 0.75;
  const sx = 11.4, sy = 6.6, L = 7.8;      // shoulder, wing length
  const dx = -Math.cos(ang), dy = -Math.sin(ang);
  const nx = -dy, ny = dx;
  const tipX = sx + dx * L, tipY = sy + dy * L;
  const wing = (p) => {
    p.moveTo(sx + nx * breadth * 0.55, sy + ny * breadth * 0.55);
    p.quadraticCurveTo(sx + dx * L * 0.55 + nx * breadth, sy + dy * L * 0.55 + ny * breadth, tipX, tipY);
    p.quadraticCurveTo(sx + dx * L * 0.5 - nx * breadth, sy + dy * L * 0.5 - ny * breadth,
      sx - nx * breadth * 0.55, sy - ny * breadth * 0.55);
    p.closePath();
  };
  // The tail: two short feathers out of the back, under the wing.
  body(c, shape([6.2, 7.0, 0.5, 5.6, 0.9, 7.8, 0.6, 9.8, 6.4, 9.4]), BIRD_DK, (p) => {
    line(p, 5.6, 8.2, 1.0, 7.8, INK, LWF);
  });
  // The body and head: one plump oval, a cream breast low at the front, the lit
  // sliver along the crown and back, the shade band under the belly.
  const cx = 12.6, cy = 7.3, rx = 6.8, ry = 4.2;
  body(c, (p) => p.ellipse(cx, cy, rx, ry, 0, 0, TAU), BIRD, (p) => {
    ell(p, cx + 3.4, cy + 2.6, 4.2, 2.6, BELLY);
    ell(p, cx - 0.6, cy - ry - 0.2, rx * 0.86, 1.3, BIRD_LT);
    ell(p, cx - 1.6, cy + ry + 0.6, rx * 0.95, 1.7, BIRD_DK);
  });
  // The near wing, over the body, its feather tips a step darker: it rises clear of
  // the back on the upstroke and drops below the belly on the down.
  body(c, wing, WING, (p) => {
    p.save();
    p.translate(tipX, tipY);
    p.rotate(Math.atan2(dy, dx));
    box(p, -2.2, -4, 6, 8, WING_DK);
    p.restore();
  });
  // The beak: a yellow wedge with its parting line.
  body(c, shape([18.7, 5.8, 21.2, 7.2, 18.7, 8.6]), BEAK, (p) => {
    box(p, 18, 7.2, 4, 2, BEAK_DK);
  }, INK, LWI + 0.08);
  line(c, 19.0, 7.2, 20.4, 7.2, INK, LWF);
  // The eye, with its catch-light.
  circ(c, 16.3, 5.9, 0.95, EYE);
  circ(c, 16.6, 5.6, 0.32, '#ffffff');
}
function buzzbird(c, w, h, t) {
  const f = frameOf(t, 6, 16);
  c.save();
  c.translate(w, 0);
  c.scale(-1, 1);
  c.save();
  c.scale(w / 21.6, h / 12.6);
  buzzbirdBody(c, 21.6, 12.6, f);
  c.restore();
  c.restore();
}

// ------------------------------------------------------------- B, C the drones
const PURPLE = '#8858c8', PURPLE_DK = '#5a3890', PURPLE_LT = '#b48ae8';
const LILAC = '#d2c4f0', LILAC_DK = '#a594cf';
const LAMP = '#f6d33c', LAMP_OFF = '#7a6a2a';
const BLADE = '#dcdcea', BLADE_DK = '#9898b0';
const TIP = '#ff6a3c';

// A rotor seen side-on: a blade pill whose width foreshortens with the turn, a
// hub on the mast, and the one marked tip that says which way it is going.
function rotor(c, cx, y, half, tipX, tipY) {
  const bh = 1.15;
  body(c, rrect(cx - half, y - bh / 2, half * 2, bh, bh / 2), BLADE, (p) => {
    box(p, cx - half, y + 0.05, half * 2, 1, BLADE_DK);
  }, INK, LWI + 0.08);
  circ(c, tipX, tipY, 0.62, TIP, INK, LWF);
  box(c, cx - 0.8, y - 0.55, 1.6, 1.1, PURPLE_DK, INK, LWF);
}

// B — THE WORKHORSE. The purple pill under a rotor, the yellow lamp blinking on
// the beat, the lilac window. Six frames at 24fps: the rotor's width repeats
// every half turn, the marked tip orbits the mast and is somewhere new every frame.
function droneBody(c, w, h, f) {
  const ang = ((f % 6) / 6) * TAU;   // the rotor: a turn every six frames, as ever
  const span = 0.12 + 0.82 * Math.abs(Math.cos(ang));
  const cx = w / 2, ry = 1.95;
  const half = Math.max(0.6, (w * span) / 2 - 0.4);
  // The mast.
  box(c, cx - 0.65, ry, 1.3, 2.2, PURPLE_DK, INK, LWI);
  // The hull: a flat pill, lit along its top, shaded along its belly.
  const X0 = 3.0, X1 = 18.6, Y0 = 3.9, Y1 = 10.9;
  body(c, rrect(X0, Y0, X1 - X0, Y1 - Y0, 3.3), PURPLE, (p) => {
    box(p, X0, Y0, X1 - X0, 1.1, PURPLE_LT);
    box(p, X0, Y1 - 1.9, X1 - X0, 2, PURPLE_DK);
  });
  // THE EYE, as the eye drone has (Peter, 15 Oct 2026: "id like the regular drone to
  // have an eyeball like the flying one"): lilac lens ring, yellow iris, the pupil
  // looking about on the ring. A small lamp beside it still blinks, four lit, two dark.
  // The eye looks slowly side to side, once across and back over the whole two-second ring
  // (Peter: "why is the eye blinking like crazy, it's just a side to side - much slower").
  // The small phase keeps every frame of the ring its own pose.
  const ey = (Y0 + Y1) / 2, look = Math.sin((f / DRONE_FRAMES) * TAU + 0.3) * 0.9;
  circ(c, cx, ey, 2.75, LILAC, INK, LWI);
  circ(c, cx + look, ey, 1.65, LAMP, INK, LWF);
  circ(c, cx + look * 1.35, ey, 0.66, EYE);
  circ(c, cx + look * 1.35 - 0.55, ey - 0.6, 0.3, '#ffffff');
  const lit = f < DRONE_FRAMES / 2;   // the lamp: a second on, a second off
  circ(c, X0 + 2.4, ey, 0.85, lit ? LAMP : LAMP_OFF, INK, LWF);
  rotor(c, cx, ry, half, cx + Math.cos(ang) * half, ry + Math.sin(ang) * 0.42);
}
// 48 frames at 24fps: two seconds, so the eye's look can be slow while the rotor keeps
// its six-frame turn.
export const DRONE_FRAMES = 48;
function drone(c, w, h, t) {
  const f = frameOf(t, DRONE_FRAMES, 24);
  c.save();
  c.scale(w / 21.6, h / 12.6);
  droneBody(c, 21.6, 12.6, f);
  c.restore();
}

// C — THE WATCHER. A lens in a round housing under a single rotor, a thruster
// burning under it. Sixteen frames at 12fps, cut for the slow lens sweep, with
// the rotor's five whole turns folded inside — five and sixteen share no factor,
// so the tip never lands twice in one place.
const DRONE_EYE_FRAMES = 16;
function droneEyeBody(c, w, h, f) {
  const ph = (f / DRONE_EYE_FRAMES) * TAU;
  const spin = ph * 5;
  const span = 0.2 + 0.6 * Math.abs(Math.cos(spin));
  const cx = w / 2, ry = 1.8;
  const half = Math.max(0.6, (w * span) / 2 - 0.4);
  // The thruster: a dark nozzle and a flame that breathes on the slow clock.
  const burn = 0.5 + 0.5 * Math.sin(ph);
  const fl = 0.7 + burn * 0.9;
  body(c, shape([cx - 1.9, 10.6, cx - 1.1 - burn * 0.3, 10.6 + fl, cx, 10.7 + fl + 0.25,
    cx + 1.1 + burn * 0.3, 10.6 + fl, cx + 1.9, 10.6]), '#ff9a3c', (p) => {
    ell(p, cx, 10.7, 0.9, fl * 0.75, LAMP);
  }, INK, LWI);
  box(c, cx - 2.2, 9.7, 4.4, 1.15, PURPLE_DK, INK, LWI);
  // The mast.
  box(c, cx - 0.6, ry, 1.2, 1.9, PURPLE_DK, INK, LWI);
  // The housing: a flat disc face-on, lit at the top, shaded at the foot.
  const hy = 6.6, hrx = 7.6, hry = 3.55;
  body(c, (p) => p.ellipse(cx, hy, hrx, hry, 0, 0, TAU), PURPLE, (p) => {
    ell(p, cx, hy - hry - 0.1, hrx * 0.8, 1.15, PURPLE_LT);
    ell(p, cx, hy + hry + 0.5, hrx, 1.6, PURPLE_DK);
  });
  // The lens drifts and eases at each end of the sweep.
  const look = Math.sin(ph) * 1.25;
  circ(c, cx, hy, 2.55, LILAC, INK, LWI);
  circ(c, cx + look, hy, 1.55, LAMP, INK, LWF);
  circ(c, cx + look * 1.35, hy, 0.62, EYE);
  circ(c, cx + look * 1.35 - 0.55, hy - 0.6, 0.3, '#ffffff');
  rotor(c, cx, ry, half, cx + Math.cos(spin) * half, ry + Math.sin(spin) * 0.38);
}
function droneEye(c, w, h, t) {
  const f = frameOf(t, DRONE_EYE_FRAMES, 12);
  c.save();
  c.scale(w / 21.6, h / 12.6);
  droneEyeBody(c, 21.6, 12.6, f);
  c.restore();
}

// --------------------------------------------------------------- D trafficCone
// The orange cone with its two white bands and blunt moulded crown, on a square
// foot. Front-on: the foot is a flat slab across the front, no top seen.
const CONE = '#f0661e', CONE_DK = '#b8420e', CONE_LT = '#ff9a5c';
const BAND = '#fbfbff', BAND_DK = '#c9cde0';
function trafficCone(c, w, h) {
  const W = 13.33, H = 17.33;
  c.save();
  c.scale(w / W, h / H);
  const cx = W / 2, foot = H - 2.4, top = 2.2;
  const bx0 = 2.5, bx1 = W - 2.5;               // body width at the foot
  const tx0 = cx - 0.95, tx1 = cx + 0.95, ty = 3.5; // where the sides meet the crown
  const cone = (p) => {
    p.moveTo(bx0, foot + 0.4);
    p.lineTo(tx0, ty);
    p.quadraticCurveTo(cx, top - 0.9, tx1, ty);
    p.lineTo(bx1, foot + 0.4);
    p.closePath();
  };
  const halfAt = (y) => (tx1 - cx) + ((bx1 - tx1) * (y - ty)) / (foot + 0.4 - ty);
  body(c, cone, CONE, (p) => {
    // The two reflective bands, low on the body where it is widest.
    for (const [y0, y1] of [[7.4, 9.5], [10.9, 13.0]]) {
      p.beginPath();
      p.moveTo(cx - halfAt(y0) - 1, y0); p.lineTo(cx + halfAt(y0) + 1, y0);
      p.lineTo(cx + halfAt(y1) + 1, y1); p.lineTo(cx - halfAt(y1) - 1, y1); p.closePath();
      p.fillStyle = BAND; p.fill();
      line(p, 0, y0, W, y0, INK, LWF);
      line(p, 0, y1, W, y1, INK, LWF);
    }
    // Lit sliver down the left flank, shade band down the right.
    p.beginPath();
    p.moveTo(bx0 + 0.2, foot + 1); p.lineTo(tx0 + 0.1, ty - 0.4); p.lineTo(tx0 + 0.6, ty - 0.4); p.lineTo(bx0 + 1.2, foot + 1);
    p.closePath(); p.fillStyle = CONE_LT; p.globalAlpha = 0.7; p.fill(); p.globalAlpha = 1;
    p.beginPath();
    p.moveTo(cx + 0.45, ty - 2); p.lineTo(tx1 + 1, ty - 2); p.lineTo(bx1 + 1, foot + 1); p.lineTo(bx1 - 1.9, foot + 1);
    p.closePath(); p.fillStyle = CONE_DK; p.globalAlpha = 0.4; p.fill(); p.globalAlpha = 1;
  });
  // The square foot, across the front.
  body(c, rrect(0.6, foot, W - 1.2, H - 0.35 - foot, 0.6), CONE, (p) => {
    box(p, 0.6, foot, W, 0.55, CONE_LT);
    box(p, W - 2.8, foot, 3, 3, CONE_DK);
  });
  c.restore();
}

// ----------------------------------------------------------------- E tombstone
// Crypt's low marker: the round-topped slab with the cross cut in it, standing in
// a mound of grave soil, in the shipped crypt cast's gouache and ink.
function tombstone(c, w, h) {
  const W = 12, H = 8.67;
  c.save();
  c.scale(w / W, h / H);
  const X0 = 1.5, X1 = 10.5, r = (X1 - X0) / 2, acy = 0.55 + r, Y1 = H - 0.9;
  const slab = (p) => {
    p.moveTo(X0, Y1);
    p.lineTo(X0, acy);
    p.arc(W / 2, acy, r, Math.PI, 0);
    p.lineTo(X1, Y1);
    p.closePath();
  };
  CR.mass(c, [X0, 0.6, X1 - X0, Y1 - 0.6], slab, CR.PAINT.stone, (p) => {
    // The shade band down the side away from the moon.
    p.globalAlpha = 0.55;
    box(p, X1 - 1.6, 0, 2, H, CR.STONE_DK);
    p.globalAlpha = 1;
    // The cross, cut in: the recess dark, its lit lower edge where the moon catches the cut.
    const cut = CR.shape([5.4, 2.0, 6.6, 2.0, 6.6, 3.3, 7.9, 3.3, 7.9, 4.4, 6.6, 4.4, 6.6, 6.9,
      5.4, 6.9, 5.4, 4.4, 4.1, 4.4, 4.1, 3.3, 5.4, 3.3]);
    CR.fillShape(p, cut, '#5a6684', CR.INK, CR.LWF);
    CR.stroke(p, [[5.55, 6.75], [6.45, 6.75], [6.45, 4.3], [7.8, 4.3]], css(CR.PAINT.stone.lit), 0.22);
  }, 0.52);
  // The grave soil heaped round its foot, lumpy along the top.
  const mound = CR.shape([0.4, H - 0.3, 0.9, H - 1.5, 2.4, H - 1.95, 4.2, H - 1.6, 6.0, H - 1.85,
    7.9, H - 1.55, 9.7, H - 1.95, 11.1, H - 1.4, 11.6, H - 0.3]);
  CR.mass(c, [0.4, H - 1.95, 11.2, 1.65], mound, CR.PAINT.soil, null, 0.46);
  c.restore();
}
function css(rgb) { return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }

// --------------------------------------------------------------- F iceCrystals
// Frost's crystal cluster: five hexagonal spikes grown out of a drift, each split
// into a lit face toward the low sun and a cold one away from it, a ridge down the
// middle — now cut pieces with the frost sheet's solid slate ink.
function iceCrystals(c, w, h) {
  const W = 17.33, H = 24;
  c.save();
  c.scale(w / W, h / H);
  // [centre x, height, half-width, lean] as fractions of the envelope, back row first.
  const spikes = [
    [0.30, 0.64, 0.115, -0.10], [0.72, 0.60, 0.115, 0.10],
    [0.17, 0.45, 0.105, -0.16], [0.52, 0.955, 0.14, 0.02], [0.83, 0.42, 0.105, 0.16],
  ];
  const foot = H * 0.9;
  spikes.forEach(([fx, ht, hw, lean], i) => {
    const back = i < 2;
    const x = fx * W, half = hw * W;
    const tipX = x + lean * W, tipY = H - ht * H;
    const shoulderY = tipY + half * 1.3;
    const sx = lean * W * 0.8;
    const outline = FR.shape([x - half, foot, x - half * 0.9 + sx, shoulderY, tipX, tipY,
      x + half * 0.9 + sx, shoulderY, x + half, foot]);
    FR.piece(c, outline, back ? FR.ICE_MID : FR.ICE, (p) => {
      // The cold face: the right half, a step deeper.
      FR.poly(p, [tipX, tipY, x + half * 0.9 + sx, shoulderY, x + half, foot, x + sx * 0.5, foot],
        back ? FR.ICE_DK : FR.ICE_MID);
      // The lit face's streak, the one sliver of white.
      FR.poly(p, [x - half * 0.62 + sx * 0.6, foot - 1.8, x - half * 0.58 + sx * 0.9, shoulderY + 0.6,
        x - half * 0.25 + sx * 0.9, shoulderY + 1.0, x - half * 0.25 + sx * 0.6, foot - 1.8], FR.ICE_LT);
      // The ridge.
      FR.line(p, tipX, tipY, x + sx * 0.5, foot, FR.ICE_DEEP, FR.LWF);
    }, { lw: back ? FR.LWI + 0.1 : FR.LW, shadow: !back });
  });
  // The drift they grow out of, over their feet.
  const drift = (p) => {
    p.moveTo(0.4, H - 0.3);
    p.quadraticCurveTo(0.9, H * 0.83, W * 0.3, H * 0.865);
    p.quadraticCurveTo(W * 0.5, H * 0.815, W * 0.7, H * 0.865);
    p.quadraticCurveTo(W * 0.94, H * 0.835, W - 0.4, H - 0.3);
    p.closePath();
  };
  FR.piece(c, drift, FR.SNOW, (p) => {
    FR.box(p, 0, H - 1.5, W, 2, FR.SNOW_SH);
  }, { shadow: false });
  // Two glints on the tall spike.
  FR.glint(c, 0.52 * W + 0.3, 3.4, 1.0);
  FR.glint(c, 0.36 * W, H * 0.52, 0.65);
  c.restore();
}

// ---------------------------------------------------------------------- G rake
// Field Service's rake, lying in the grass tines up with the handle out behind;
// tread on it and the handle swings up into the face, quivers and topples back.
// The same fifteen frames as the original: frame 0 lying still, 1–14 the swing,
// chosen by the run's swingT, not the clock (the kit steps it at 1fps). The
// original is line art that skips the shared hazard rim; here it carries its own
// solid contour instead, side-on, flat.
const RAKE_FRAMES = 15, RAKE_SWING_T = 0.9;
const RAKE_SPAN = { left: 12, right: 33, top: 38, handle: 31 };
function rakeSwingAngle(u) {
  if (u < 0) return 0;
  if (u < 0.12) return (u / 0.12) * 1.95;
  if (u < 0.6) return 1.85 + Math.exp(-(u - 0.12) * 7) * Math.sin((u - 0.12) * 30) * 0.18;
  if (u < 0.9) return 1.85 * (1 - ((u - 0.6) / 0.3) ** 2);
  return 0;
}
const WOOD = '#c98f4e', WOOD_DK = '#8e5f2c', WOOD_LT = '#ecbd7c';
const STEEL = '#9aa4ae', STEEL_DK = '#5e666e', STEEL_LT = '#d6dce2';
const TINE = '#e6ebf0';   // the bright steel of the teeth and the head bar
// ONE INK for the whole steel head, teeth and bar alike, halfway between the steel's own
// dark and the black (Peter, 16 Oct: the teeth read as "a separate part than the rake
// head" — "split the difference").
const TOOTH_INK = '#33373f';
const STAR = '#fff09a', STAR_DK = '#f2b33c';
function rake(c, w, h, t) {
  const f = frameOf(t, RAKE_FRAMES, 1);
  const u = f === 0 ? -1 : ((f - 0.5) / (RAKE_FRAMES - 1)) * RAKE_SWING_T;
  const a = rakeSwingAngle(u);
  const s = Math.min(w / (RAKE_SPAN.left + RAKE_SPAN.right), h / RAKE_SPAN.top);
  c.save();
  c.translate(RAKE_SPAN.left * s, h);
  c.scale(s, s);
  // Line weights are envelope units; undo the drawing's own scale.
  const k = 1 / s, lw = LW * k, lwi = LWI * k, lwf = LWF * k;
  const L = RAKE_SPAN.handle, py = -1.5;
  const ca = Math.cos(a), sa = Math.sin(a);
  const ex = ca * L, ey = py - sa * L;
  // The handle: a wooden pole pivoting on the head, a lit sliver along its upper
  // side, a shade band along its lower, a dark butt cap at the end.
  {
    const nx = -sa, ny = -ca; // unit normal on the handle's upper side
    const r = 0.95;
    const pole = shape([nx * r, py + ny * r, ex + nx * r, ey + ny * r, ex - nx * r, ey - ny * r, -nx * r, py - ny * r]);
    body(c, pole, WOOD, (p) => {
      p.beginPath();
      p.moveTo(nx * r, py + ny * r); p.lineTo(ex + nx * r, ey + ny * r);
      p.lineTo(ex + nx * 0.3, ey + ny * 0.3); p.lineTo(nx * 0.3, py + ny * 0.3); p.closePath();
      p.fillStyle = WOOD_LT; p.fill();
      p.beginPath();
      p.moveTo(-nx * r, py - ny * r); p.lineTo(ex - nx * r, ey - ny * r);
      p.lineTo(ex - nx * 0.35, ey - ny * 0.35); p.lineTo(-nx * 0.35, py - ny * 0.35); p.closePath();
      p.fillStyle = WOOD_DK; p.fill();
    }, INK, lw);
    circ(c, ex, ey, r * 0.95, WOOD_DK, INK, lwi);
  }
  // The tines, then the head bar over their roots, then the ferrule.
  // SILVER, NOT INK (Peter, 16 Oct 2026: "the teeth dont read as silver anymore"): at
  // in-run size a tine is barely wider than the black line round it, so the line WAS
  // the tine. They are pale bright steel now with a white edge catching the light, and
  // the teeth and the bar they hang from share one steel ink (TOOTH_INK).
  for (let i = 0; i < 7; i++) {
    const tx = -4.5 + i * 1.5;
    // Lit half and shaded half, like the spike plate's teeth beside it on the same road.
    body(c, shape([tx - 0.7, -2.2, tx, -6.4, tx + 0.7, -2.2]), TINE, (p) => {
      box(p, tx, -7, 1, 5, STEEL);
      p.beginPath(); p.moveTo(tx - 0.35, -2.2); p.lineTo(tx - 0.05, -5.6);
      pen(p, '#ffffff', LWF);
      p.stroke();
    }, TOOTH_INK, LWI);
  }
  body(c, rrect(-5.2, -2.6, 10.4, 2.0, 0.6), TINE, (p) => {
    box(p, -5.2, -2.6, 10.4, 0.6, '#ffffff');
    box(p, -5.2, -1.3, 10.4, 0.8, STEEL);
  }, TOOTH_INK, (lw + lwi) / 2);
  box(c, -1.1, -3.1, 2.2, 1.4, STEEL_DK, INK, lwi);
  // THWACK at the top of the swing, on the hero's side of the handle's end.
  if (u > 0.08 && u < 0.34) {
    const q = (u - 0.08) / 0.26;
    const sr = 3.4 + q * 2.4;
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const aa = (i / 16) * TAU + 0.2, rr = i % 2 ? sr * 0.45 : sr;
      pts.push(ex - 2.5 + Math.cos(aa) * rr, ey + 1.5 + Math.sin(aa) * rr);
    }
    c.save();
    c.globalAlpha *= 1 - q * 0.45;
    body(c, shape(pts), STAR, (p) => {
      circ(p, ex - 2.5, ey + 1.5, sr * 0.35, '#ffffff');
    }, STAR_DK, lwi);
    c.restore();
  }
  // Quiver ticks either side of the handle while it shakes upright.
  if (u > 0.12 && u < 0.62) {
    pen(c, INK, lwi);
    for (const side of [-1, 1]) {
      const th = -a - 0.13 * side;
      c.beginPath();
      c.arc(0, py, L * 0.9, th - 0.05, th + 0.05);
      c.stroke();
    }
  }
  c.restore();
}

// -------------------------------------------------------------------- H target
// The floating bullseye you smash or shoot: red and white rings, flat face-on,
// a solid contour round the outside and an interior line between every ring so
// the bands hold apart at a dozen pixels. Lit crescent upper left, shade lower right.
const T_RED = '#e23a40', T_RED_DK = '#a8222e', T_RED_LT = '#ff7a70';
const T_WHITE = '#fbf8f2', T_WHITE_DK = '#d6cfc6';
function target(c, w, h) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 0.45;
  const rings = [[R, T_WHITE, T_WHITE_DK], [R * 0.72, T_RED, T_RED_DK], [R * 0.45, T_WHITE, T_WHITE_DK], [R * 0.2, T_RED, T_RED_DK]];
  rings.forEach(([r, fill, dk], i) => {
    body(c, (p) => p.arc(cx, cy, r, 0, TAU), fill, i > 0 ? null : (p) => {
      // Shade band on the outer ring only: the disc minus itself shifted up-left
      // leaves a flat crescent at the lower right (no bevel on the inner rings).
      p.beginPath();
      p.arc(cx, cy, r, 0, TAU);
      p.arc(cx - r * 0.1, cy - r * 0.1, r, 0, TAU, true);
      p.fillStyle = dk; p.fill('evenodd');
    }, INK, i === 0 ? LW : LWI);
  });
  // The lit sliver: one short arc of highlight on the outer ring, upper left.
  pen(c, '#ffffff', 0.55);
  c.beginPath(); c.arc(cx, cy, R * 0.86, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  circ(c, cx - R * 0.07, cy - R * 0.08, R * 0.06, T_RED_LT);
}

// ------------------------------------------------------------- I, J thistles
// Field Service's thistle: a magenta brush head seated in a hatched green cup,
// a silver-pink spine fan off its crown, two spiked leaves on a dark stalk. In the
// plumber sheet's hand (sprites/plumberProps.js), so it stands with the beehive and
// the scarecrow. Six frames at 11fps, as the original: the stalk shears about its
// planted root and the heavy head's fan bobs a beat behind it — sin(p) alone
// repeats (frames 1/2, 4/5), the lagged bob is what makes all six distinct.
const TH_STEM = '#2f5722', TH_STEM_DK = '#1d3a15';
const TH_LEAF = '#3f7a2c', TH_LEAF_LT = '#76b04c', TH_LEAF_DK = '#29531c';
const TH_CUP = '#5c7f2e', TH_CUP_LT = '#8fb050', TH_CUP_DK = '#3c5a1e';
const TH_MAG = '#cc3290', TH_MAG_DK = '#8c1a5e', TH_MAG_LT = '#f27abf';
const TH_FLORET = '#e85aa8', TH_PALE = '#f8e2f2';
function thistlePaint(c, w, h, t) {
  const f = frameOf(t, 6, 11);
  const p = (f / 6) * TAU;
  const base = h - 0.2;
  const k = 0.035 * Math.sin(p);
  const bob = h * 0.022 * Math.sin(p + 2.1);
  const X = (u) => w * u, Y = (v) => h * v;
  // The soil it grows from: a flat lump across the front, outside the shear.
  const soil = (q) => {
    q.moveTo(X(0.16), base);
    q.quadraticCurveTo(X(0.5), base - 2.4, X(0.84), base);
    q.closePath();
  };
  c.save();
  c.transform(1, 0, -k, 1, k * base, 0);
  // The stalk.
  const sw = Math.max(1.5, w * 0.1);
  PL.body(c, PL.rect(X(0.5) - sw / 2, Y(0.42), sw, base - Y(0.42)), TH_STEM, (q) => {
    PL.box(q, X(0.5) + sw * 0.1, 0, sw, h, TH_STEM_DK);
  }, PL.INK, PL.LWI + 0.08);
  // Two spiked leaves, one each side at different heights.
  const leafL = [X(0.49), Y(0.8), X(0.15), Y(0.68), X(0.29), Y(0.75), X(0.08), Y(0.8), X(0.31), Y(0.85)];
  const leafR = [X(0.51), Y(0.66), X(0.86), Y(0.54), X(0.71), Y(0.62), X(0.92), Y(0.665), X(0.68), Y(0.72)];
  for (const [pts, lit] of [[leafL, true], [leafR, false]]) {
    PL.body(c, PL.shape(pts), TH_LEAF, (q) => {
      // Shade along the underside, then the midrib in the lit green.
      PL.poly(q, [pts[0], pts[1] + 4, pts[2], pts[3] + 4, pts[6], pts[7], pts[8], pts[9]], TH_LEAF_DK);
      PL.line(q, pts[0], pts[1], pts[6], pts[7], TH_LEAF_LT, PL.LWF * 1.3);
    }, PL.INK, PL.LWI + 0.1);
  }
  // The cup: a hatched green bulb the head sits in.
  const cup = (q) => {
    q.moveTo(X(0.32), Y(0.29));
    q.lineTo(X(0.68), Y(0.29));
    q.lineTo(X(0.66), Y(0.43));
    q.quadraticCurveTo(X(0.5), Y(0.56), X(0.34), Y(0.43));
    q.closePath();
  };
  PL.body(c, cup, TH_CUP, (q) => {
    PL.box(q, X(0.55), 0, w, h, TH_CUP_DK);
    PL.box(q, X(0.3), Y(0.29), w * 0.4, 0.7, TH_CUP_LT);
    const segs = [];
    for (let i = -3; i <= 3; i++) {
      const x = X(0.5) + i * 1.3;
      segs.push(x - 2, Y(0.29), x + 2, Y(0.52), x + 2, Y(0.29), x - 2, Y(0.52));
    }
    PL.lines(q, segs, PL.INK, PL.LWF);
  });
  // The magenta brush, flaring to the crown.
  const head = (q) => {
    q.moveTo(X(0.37), Y(0.31));
    q.lineTo(X(0.33), Y(0.185));
    q.quadraticCurveTo(X(0.5), Y(0.15), X(0.67), Y(0.185));
    q.lineTo(X(0.63), Y(0.31));
    q.quadraticCurveTo(X(0.5), Y(0.345), X(0.37), Y(0.31));
    q.closePath();
  };
  // The spine fan off the crown, bobbing behind the stalk: inked spikes, the
  // magenta over the ink, then three pale spines through them.
  const fan = [[0.38, -1.0], [0.44, -0.45], [0.5, 0], [0.56, 0.45], [0.62, 1.0]];
  const spike = (sx, dx, top) => [[X(sx), Y(0.2)], [X(sx + dx * 0.085), top + bob]];
  for (const [sx, dx] of fan) {
    const [a, b] = spike(sx, dx, Y(0.055));
    PL.line(c, a[0], a[1], b[0], b[1], PL.INK, 0.6 + PL.LW * 2);
  }
  for (const [sx, dx] of fan) {
    const [a, b] = spike(sx, dx, Y(0.055));
    PL.line(c, a[0], a[1], b[0], b[1], TH_FLORET, 0.6);
  }
  for (const [sx, dx] of [[0.42, -0.75], [0.5, -0.2], [0.58, 0.7]]) {
    const [a, b] = spike(sx, dx, Y(0.065));
    PL.line(c, a[0], a[1], b[0], b[1], TH_PALE, 0.32);
  }
  PL.body(c, head, TH_MAG, (q) => {
    PL.box(q, X(0.56), 0, w, h, TH_MAG_DK);
    PL.box(q, X(0.37), Y(0.15), 0.7, Y(0.2), TH_MAG_LT);
  });
  c.restore();
  PL.body(c, soil, PL.SOIL, (q) => { PL.box(q, 0, base - 0.7, w, 1, '#4a2f1a'); }, PL.INK, PL.LWI + 0.08);
}
function thistle(c, w, h, t) { thistlePaint(c, w, h, t); }
function thistleBig(c, w, h, t) { thistlePaint(c, w, h, t); }

// ------------------------------------------------------------------- the sheet
export const REDRAW = {
  candidates: [
    { letter: 'A', id: 'buzzbird', name: 'BUZZBIRD', slot: 'high', paint: buzzbird, replaces: 'buzzbird', cabinet: 'plumber',
      note: 'The orange songbird in solid ink: plump oval with a cream breast, yellow wedge beak, two-feather tail, and the near wing beating over it on the same six frames at 16fps — broad on the downstroke, feathered on the recovery.' },
    { letter: 'B', id: 'drone', name: 'DRONE', slot: 'low', paint: drone, replaces: 'drone', cabinet: 'speed',
      note: 'The workhorse: purple pill hull lit along the top and shaded along the belly, an eyeball like the eye drone\u2019s looking about, a small yellow lamp blinking four-on two-off, and a mast-mounted rotor that foreshortens through its turn with an orange marked tip — six frames at 24fps.' },
    { letter: 'C', id: 'droneEye', name: 'EYE DRONE', slot: 'low', paint: droneEye, replaces: 'droneEye', cabinet: 'speed',
      note: 'The watcher: a round purple housing with a lilac lens ring and a yellow iris that sweeps and eases, a thruster flame breathing under it, the rotor turning five times inside the sixteen-frame 12fps sweep.' },
    { letter: 'D', id: 'trafficCone', name: 'TRAFFIC CONE', slot: 'cone', paint: trafficCone, replaces: 'trafficCone', cabinet: 'speed',
      note: 'Orange cone with the blunt moulded crown and two white bands low on the body, lit sliver down the left, shade down the right, on a flat front-on square foot.' },
    { letter: 'E', id: 'tombstone', name: 'TOMBSTONE', slot: 'tomb', paint: tombstone, replaces: 'tombstone', cabinet: 'crypt',
      note: 'The round-topped slab in the crypt cast\'s moonlit stone gouache with the cross cut in, a shade band down its far side, standing in a lumpy mound of grave soil.' },
    { letter: 'F', id: 'iceCrystals', name: 'ICE CRYSTALS',
      slot: { box: [13, 12], tall: 1.5, name: 'STANDING', was: 'iceCrystals — 13x12, jump, breakable' },
      paint: iceCrystals, replaces: 'iceCrystals', cabinet: 'frost',
      note: 'The five hexagonal spikes out of a snow drift, now cut pieces in slate ink: pale lit face with a white streak, deeper cold face, a ridge down each, two glints on the tall one.' },
    { letter: 'G', id: 'rake', name: 'RAKE',
      slot: { box: [20, 7], tall: 2.45, visual: 1.38, name: 'STANDING', was: 'rake — 20x7, jump, breakable' },
      paint: rake, replaces: 'rake', cabinet: 'plumber',
      note: 'The garden rake tines up with the handle out behind, now a solid-contoured wooden pole and steel head; the same fifteen frames — lying still, then the swing up into the face with the THWACK star, the quiver and the topple back.' },
    { letter: 'H', id: 'target', name: 'TARGET', slot: 'skyTarget', paint: target, replaces: 'target', cabinet: 'neon',
      note: 'The bullseye in solid ink: white, red, white, red bull, an ink line between every ring, a flat shade crescent lower right on the outer ring and one white highlight arc upper left.' },
    { letter: 'I', id: 'thistle', name: 'THISTLE', slot: 'stand', paint: thistle, replaces: 'thistle', cabinet: 'plumber',
      note: 'The magenta brush head in a hatched green cup with an inked spine fan off its crown, two spiked leaves on a dark stalk, in a soil lump; sways from the root and the head lags, six frames at 11fps.' },
    { letter: 'J', id: 'thistleBig', name: 'BIG THISTLE', slot: 'big', paint: thistleBig, replaces: 'thistleBig', cabinet: 'plumber',
      note: 'The same thistle in the big standing box, as the original (one drawing, two sizes), six frames at 11fps.' },
  ],
};

// props.js's tables, keyed by the painter each replaces. props.js hands a painter the
// raster size of its envelope and a FRAME; these take a clock, so the frame goes in as
// frame / fps on the ring each was drawn on (the same rings props.js declares).
const RING_FPS = { buzzbird: 16, drone: 24, droneEye: 12, rake: 1, thistle: 11, thistleBig: 11 };
export const REDRAW_PAINTERS = Object.fromEntries(REDRAW.candidates.map((c) => [c.replaces,
  outlined((ctx, w, h, frame = 0) => c.paint(ctx, w, h, frame / (RING_FPS[c.replaces] || 1)))]));
