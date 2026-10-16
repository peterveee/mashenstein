// THE KAIJU — Terminal Velocity 3's closing set piece (16 Oct 2026). A neon-sign kaiju
// rises out of the street behind the road near the end of neon-3, burns the top off a
// tower with his laser eyes as you reach the finish, and smirks while it falls.
//
// Drawn in two passes from the neon pack's bg(): the tower he cuts (and its blast) in
// the city between the middle and near rows, and HIM after the near row but before the
// smog veil — in front of the buildings, in the haze, never in the lane. Grown out of
// the bake-off on the lab sheet `kaiju-mockup` (src/dev/kaiju-candidates.js, which
// draws with this module); the history of his look is in that file's header.
//
// One state object drives both passes: { t, ph, kx, tx, shape, look, rise, stomp, style }:
// `t` the scenery clock, `ph` seconds into the attack (the timeline below), `kx` his
// feet and `tx` the tower's left edge in frame px, `shape` his proportions, `look` the beams' colour,
// `rise` px he still has to climb out of the street, `stomp` 0..1 how much he walks,
// `style` 'sign' (shipped: a neon sign come to life — Peter's sketch) or 'tube' (the
// earlier, more detailed cut, kept on the lab sheet).
import { GROUND_Y } from '../engine/camera.js';

// The attack, in seconds from the start of the charge.
const CHARGE = [0.9, 2.0];     // the eyes (and the plates, tail to head) light
const SWEEP = [2.0, 3.0];      // the beams cut across the tower
const CUT = SWEEP[1];          // the top lets go
const SMIRK = [2.4, 3.0];      // the smirk grows as the beams bite...
const UNSMIRK = [5.4, 6.2];    // ...and fades back to a straight face
export const KAIJU_TIMELINE = Object.freeze({ CHARGE, SWEEP, CUT, SMIRK, UNSMIRK });
// The goodbye wink, as the speed-3 coyote's: the eye shuts a moment before the ding, the star
// pops off it on the ding, the eye opens again. `wink` on the state is seconds since the ding.
const WINK_SHUT = [-0.25, 0.6];
const WINK_STAR = 0.8;
const KX = 186;                // his feet, frame px
// He stands below the road's far edge, cut off by it — we never see the city's feet,
// so we don't see his (Peter: "we only see the top of his body from about the road").
// Sunk by SINK and grown by SCALE so his head still clears the near row.
const SINK = 50;
const SCALE = 1.0;            // "he could be a little smaller overall" (was 1.15)

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const span = (ph, [a, b]) => clamp01((ph - a) / (b - a));

// The sign's tubes.
const MINT = '#5cf2d6', PINK = '#ff4fd8', YEL = '#ffd23a', CYAN = '#38d8f8', VIOLET = '#b45cff';
const BODY = '#0c081e';

export const KAIJU_RED = Object.freeze({ id: 'red', glow: '#ff3a4a' });
// His proportions (`sx`/`sy` the torso about the hips, `lean` forward in rad, `hs` head
// size, `off` the head against the shoulders, `snout` the muzzle past the hinge): the
// lab sheet's E, THE LIZARD — "actually do the lizard instead".
export const KAIJU_SHAPE = Object.freeze({ sx: 0.88, sy: 1.3, lean: 0.06, hs: 0.8, off: [8, -6], snout: 1.45 });

// ------------------------------------------------------------- path helpers
function taper(p0, c, p1, w0, w1, n = 10) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const [x, y] = quadAt(p0, c, p1, u);
    const [tx, ty] = quadTan(p0, c, p1, u);
    const w = (w0 + (w1 - w0) * u) / 2;
    L.push([x - ty * w, y + tx * w]);
    R.push([x + ty * w, y - tx * w]);
  }
  const p = new Path2D();
  p.moveTo(...L[0]);
  for (const q of L.slice(1)) p.lineTo(...q);
  for (const q of R.reverse()) p.lineTo(...q);
  p.closePath();
  return p;
}
function quadAt(p0, c, p1, u) {
  const v = 1 - u;
  return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]];
}
function quadTan(p0, c, p1, u) {
  const v = 1 - u;
  const tx = 2 * v * (c[0] - p0[0]) + 2 * u * (p1[0] - c[0]);
  const ty = 2 * v * (c[1] - p0[1]) + 2 * u * (p1[1] - c[1]);
  const m = Math.hypot(tx, ty) || 1;
  return [tx / m, ty / m];
}
function cubicAt(p, u) {
  const v = 1 - u;
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
}

// A tube: the light it throws, then the glass. `k` scales the glow.
function tube(ctx, path, color, width = 1.2, k = 1) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.globalAlpha *= 0.3 * k;
  ctx.lineWidth = width * 4;
  ctx.stroke(path);
  ctx.globalAlpha /= 0.3 * k;
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.restore();
}
const P = (fn) => { const p = new Path2D(); fn(p); return p; };

// ------------------------------------------------------------------- the rig
// Facing right, feet at the origin, up is −y; about 175 frame px tall. Chubby: a pear
// of a body, a head nearly as wide as it, stubby arms, a curled tail on the ground.
const BACK = [[-28, -30], [-44, -72], [-32, -112], [-6, -126]];  // hip → nape, cubic
const NECK = [8, -122];
const JAW_PIVOT = [30, -134];
const EYE = [24, -151];

function poseAt(ph, t, { stomp = 1, rise = 0, shape = null, style = 'tube', kx = KX, flip = false, wink = null } = {}) {
  const walk = t * 3.2;
  const charge = ease(span(ph, CHARGE));
  const firing = ph >= SWEEP[0] && ph < SWEEP[1];
  // A STRAIGHT FACE until the beams bite, then the smirk, held while the top falls.
  const happy0 = ease(span(ph, SMIRK)) * (1 - ease(span(ph, UNSMIRK)));
  // IDLE, always on under everything else, so he never stands frozen — at the finish
  // above all ("should not be freezing his animation when we land on finish"): he
  // breathes (chest up, arms lifting with it), sways his tail, nods a little and blinks.
  const breath = Math.sin(t * 2.1);
  // How much of the wink's whole-face squeeze is on (0..1): in just before the ding, held, out.
  const winkW = wink == null ? 0 : ease((wink - WINK_SHUT[0]) / 0.2) * (1 - ease((wink - (WINK_SHUT[1] - 0.15)) / 0.15));
  const blink = !firing && charge < 0.1 && (t % 3.7) < 0.13;
  return {
    walk,
    bob: -Math.abs(Math.sin(walk)) * 3 * stomp - (breath + 1) * 0.7,
    nod: (firing ? 0 : 0.035 * Math.sin(t * 1.05 + 0.6)) + 0.12 * winkW,
    blink: blink && winkW < 0.05,
    winkW,
    wink,
    rock: Math.sin(walk) * 0.03 * stomp,
    rise,
    kx,
    flip,
    shape,
    style,
    tail: Math.sin(t * 1.3) * 9,
    charge: firing ? 1 : charge * (ph < SWEEP[0] ? 1 : 0),
    firing,
    jaw: 0,
    happy: Math.max(happy0, winkW),
    // ARMS, as a turn about the shoulder (+ = down/back, − = up): a swing with the
    // stomp, held a little higher while the beams are on.
    armN: 0.28 * Math.sin(walk) * stomp - (firing ? 0.2 : 0) - 0.1 * breath,
    armF: -0.28 * Math.sin(walk) * stomp - (firing ? 0.15 : 0) - 0.08 * breath,
  };
}

// Where his eyes are in the frame, for the beams — the same transforms drawKaiju makes.
const SHAPE_NOW = { sx: 1, sy: 1, lean: 0, hs: 1, off: [0, 0], snout: 1 };
// The torso's own frame: leaned and stretched about the hips. Everything but the head
// is drawn in it.
function torsoMatrix(sh) {
  return new DOMMatrix().translate(0, -30).rotate(sh.lean * 180 / Math.PI).scale(sh.sx, sh.sy).translate(0, 30);
}
function bodyMatrix(pose) {
  return new DOMMatrix().translate(pose.kx ?? KX, GROUND_Y + SINK + (pose.rise || 0) + pose.bob).scale(pose.flip ? -SCALE : SCALE, SCALE).translate(0, -30)
    .rotate(pose.rock * 180 / Math.PI).translate(0, 30).multiply(torsoMatrix(pose.shape || SHAPE_NOW));
}
// The head, in the torso's frame but undistorted by it: it sits where the torso puts
// the neck, plus `off`, at its own size, and turns about the neck to aim.
function headMatrix(aim, pose) {
  const sh = pose.shape || SHAPE_NOW;
  const T = torsoMatrix(sh);
  const n = new DOMPoint(...NECK).matrixTransform(T);
  return T.inverse().translate(n.x + sh.off[0], n.y + sh.off[1]).rotate(aim * 180 / Math.PI)
    .scale(sh.hs).translate(-NECK[0], -NECK[1]);
}
// Both eyes in the frame: the near one, and the far one just behind it.
function eyesAt(pose, aim) {
  const m = bodyMatrix(pose).multiply(headMatrix(aim, pose));
  return [[0, 0], [-3, -1.5]].map(([dx, dy]) => {
    const p = new DOMPoint(EYE[0] + dx, EYE[1] + dy).matrixTransform(m);
    return [p.x, p.y];
  });
}

function drawKaiju(ctx, pose, aim, t, look) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-20, -20, 520, GROUND_Y + 20);
  ctx.clip();
  ctx.setTransform(ctx.getTransform().multiply(bodyMatrix(pose)));
  const solid = (p) => { ctx.fillStyle = BODY; ctx.fill(p); };
  // THE SIGN (Peter's sketch, 16 Oct: "is this possible", then "i like the latest one -
  // no cable though... imagine he is a neon sign come to life... he needs a bit more
  // embellishment though. i would like if his mouth and snout were like the
  // reference"): one mint line round him, the pink and cyan plates and yellow claws
  // kept, no scales, stripes or blush — and the sketch's head: a big rounded snout
  // overhanging a shorter lower jaw, the mouth a little open.
  const sign = pose.style === 'sign';
  const stepN = Math.max(0, Math.sin(pose.walk)) * 5;
  const stepF = Math.max(0, -Math.sin(pose.walk)) * 5;

  // FAR SIDE — leg, foot and raised arm, behind everything.
  const farThigh = P((p) => p.ellipse(14, -32, 18, 21, -0.1, 0, Math.PI * 2));
  const farFoot = P((p) => p.ellipse(26, -5 - stepF, 15, 6, 0, 0, Math.PI * 2));
  const fa = armGeom([20, -104], [36, -96], [50, -104], pose.armF);
  const farArm = taper(...fa.pts, 11, 7);
  for (const part of [farThigh, farFoot, farArm]) { tube(ctx, part, MINT, 1, 0.5); solid(part); }
  claws(ctx, fa.pts[2], fa.ang, 0.8);
  const na = armGeom([12, -100], [30, -82], [46, -90], pose.armN);
  const arm = taper(...na.pts, 14, 8);
  if (!sign) toes(ctx, [38, -4 - stepF], 0.8);

  // TAIL — fat at the hip, along the road, curling up at the tip.
  const sw = pose.tail;
  const tailA = taper([-20, -40], [-70, -2 + sw * 0.3], [-104, -14 + sw], 34, 14, 12);
  const tailB = taper([-104, -14 + sw], [-128, -26 + sw], [-112, -30 + sw * 0.6], 14, 3, 8);

  // PLATES — ONE unbroken row of triangles (Peter: "make sure the spikes on his back and
  // head are continuous and not broken up"): a ridge line from the tail tip along the
  // tail's top, up the back, across the neck and over the crown, with the plates spaced
  // evenly along it — pink and cyan by turn, small at the tail tip, biggest mid-back,
  // small again on the head. They charge from the tail tip (k 0) to the head (k 1).
  const ridge = [];
  const tq = [[-20, -40], [-70, -2 + sw * 0.3], [-104, -14 + sw]];
  for (let i = 12; i >= 2; i--) {
    const u = i / 12;
    const c = quadAt(...tq, u), tn = quadTan(...tq, u);
    const half = (34 + (14 - 34) * u) / 2 * 0.85;
    ridge.push([c[0] - tn[1] * half, c[1] + tn[0] * half]);
  }
  for (let i = 1; i <= 16; i++) ridge.push(cubicAt(BACK, i / 16));
  const skullBack = [[-14, -128], [-18, -164], [18, -180], [40, -164]];
  const hm = headMatrix(aim, pose);
  for (let i = 1; i <= 8; i++) {
    const q = new DOMPoint(...cubicAt(skullBack, 0.05 + 0.4 * i / 8)).matrixTransform(hm);
    ridge.push([q.x, q.y]);
  }
  ridgePlates(ridge, 10.5).forEach((pl, i) => {
    const p = platePath(pl);
    const ink = i % 2 ? CYAN : PINK;
    const lit = pose.firing ? 0.75 + 0.25 * Math.sin(t * 40 + pl.k * 9) : clamp01((pose.charge * 1.35 - pl.k) * 4);
    solid(p);
    tube(ctx, p, lit > 0 ? mix(ink, '#ffffff', lit * 0.7) : ink, 1, 0.7 + lit * 1.5);
    if (lit > 0) { ctx.save(); ctx.globalAlpha = lit * 0.35; ctx.fillStyle = ink; ctx.fill(p); ctx.restore(); }
  });

  // THE SILHOUETTE — tail, body, near thigh and head as one shape: the mint rim round
  // the lot, the dark fill over it, so only the outside edge is lit.
  const body = P((p) => {
    p.moveTo(-28, -30);
    p.bezierCurveTo(-44, -72, -32, -112, -6, -126);
    p.lineTo(28, -112);
    p.bezierCurveTo(44, -92, 46, -50, 26, -24);
    p.bezierCurveTo(10, -12, -16, -14, -28, -30);
  });
  const thigh = P((p) => p.ellipse(-4, -32, 22, 24, 0.1, 0, Math.PI * 2));
  const foot = P((p) => p.ellipse(8, -5 - stepN, 18, 6.5, 0, 0, Math.PI * 2));
  const headM = headMatrix(aim, pose);
  // The muzzle past the hinge, longer or shorter.
  const sn = (x) => (x <= 30 ? x : 30 + (x - 30) * (pose.shape || SHAPE_NOW).snout);
  // The sign's mouth hangs a little open, always: the sketch's.
  const jawOpen = sign ? Math.max(pose.jaw, 0.34) : pose.jaw;
  const jawM = headM.translate(...JAW_PIVOT).rotate(jawOpen * 180 / Math.PI).translate(-JAW_PIVOT[0], -JAW_PIVOT[1]);
  const skull = P((p) => {
    p.moveTo(-14, -128);
    p.bezierCurveTo(-18, -164, 18, -180, sn(40), -164);
    if (sign) {
      // A big rounded snout, bulbing forward and down past the jaw.
      p.bezierCurveTo(sn(52), -161, sn(65), -156, sn(65), -145);
      p.bezierCurveTo(sn(65), -136, sn(60), -132.5, sn(54), -133.5);
      p.lineTo(30, -135);
    } else {
      p.bezierCurveTo(sn(50), -158, sn(60), -152, sn(61), -145);
      p.quadraticCurveTo(sn(62), -138, sn(56), -136);
      p.lineTo(30, -135);
    }
    p.lineTo(-2, -116);
    p.closePath();
  });
  // The sign's lower jaw stops short of the snout, under it.
  const jawTip = sign ? 47 : 56;
  const jaw = P((p) => {
    p.moveTo(28, -135);
    p.lineTo(sn(jawTip), -135);
    p.quadraticCurveTo(sn(jawTip), -127, sn(jawTip - 10), -124);
    p.lineTo(18, -122);
    p.closePath();
  });
  const pt = (m, x, y) => { const q = new DOMPoint(x, y).matrixTransform(m); return [q.x, q.y]; };
  const hinge = pt(headM, ...JAW_PIVOT), lip = pt(headM, sn(jawTip), sign ? -134 : -136), chin = pt(jawM, sn(jawTip), -135);
  const mouth = P((p) => { p.moveTo(...hinge); p.lineTo(...lip); p.lineTo(...chin); p.closePath(); });
  const sil = new Path2D();
  // A throat (in the head's frame), so the underside of the jaw runs into the chest
  // without a notch, and a neck from the shoulders up into it — the head may sit
  // higher or further out than the chibi's.
  const throat = new Path2D();
  throat.addPath(P((p) => p.ellipse(20, -123, 18, 11, -0.2, 0, Math.PI * 2)), headM);
  const headBase = pt(headM, 10, -128);
  const neck = taper([4, -112], [(4 + headBase[0]) / 2, (-112 + headBase[1]) / 2 + 2], headBase, 42, 36 * (pose.shape || SHAPE_NOW).hs);
  for (const part of [tailA, tailB, body, thigh, foot, arm, neck, throat]) sil.addPath(part);
  sil.addPath(skull, headM);
  sil.addPath(jaw, jawM);
  // The sign's mouth is a gap the line runs into, as in the sketch — not filled.
  if (!sign) sil.addPath(mouth);
  tube(ctx, sil, MINT, 1.6, 1);
  // Filled part by part: as one path, overlapping parts wound opposite ways cancel
  // under nonzero and leave holes (the arm across the chest did).
  for (const part of [tailA, tailB, body, thigh, foot, arm, neck, throat, ...(sign ? [] : [mouth])]) solid(part);
  for (const [part, m] of [[skull, headM], [jaw, jawM]]) { const q = new Path2D(); q.addPath(part, m); solid(q); }

  // Inside the mouth: dark, a pink tongue. (The sign's is just the line round it.)
  if (pose.jaw > 0.15 && !sign) {
    ctx.save();
    ctx.fillStyle = '#3a0a28';
    ctx.fill(mouth);
    ctx.clip(mouth);
    ctx.fillStyle = '#ff6fae';
    ctx.beginPath();
    ctx.ellipse((hinge[0] + chin[0]) / 2 + 4, (hinge[1] + chin[1]) / 2 + 1, 9, 3.5, Math.atan2(chin[1] - hinge[1], chin[0] - hinge[0]), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // SCALES — little arcs in the sign's colours, sprinkled over the body and tail.
  if (!sign) {
    ctx.save();
    ctx.clip(sil);
    const inks = [PINK, YEL, CYAN, VIOLET];
    // A few, not a coat of them — he is meant to be cute.
    const spots = [[-14, -96], [-24, -62], [-4, -76], [-46, -26], [-78, -14]];
    spots.forEach(([x, y], i) => {
      tube(ctx, P((p) => p.arc(x, y, 3.2, 0.15, Math.PI - 0.15)), inks[i % 4], 1, 0.6);
    });
    // Belly bands, pink, curved across the front.
    for (let y = -98; y < -30; y += 15) {
      tube(ctx, P((p) => { p.moveTo(14, y + 3); p.quadraticCurveTo(28, y - 1, 42, y + 4 - (y + 100) * 0.04); }), PINK, 1.1, 0.7);
    }
    // The thigh by a curl, not a ring.
    tube(ctx, P((p) => p.ellipse(-4, -32, 22, 24, 0.1, -2.6, -0.4)), MINT, 1, 0.6);
    ctx.restore();
    toes(ctx, [22, -4 - stepN], 1);
  }

  // HEAD DETAIL — in the head's frame.
  ctx.save();
  ctx.setTransform(ctx.getTransform().multiply(headM));
  // THE FACE, after Peter's second reference (a grumpy-cute vinyl kaiju: "i kinda want
  // this expression"): a heavy brow pulled down over a big round eye, the pupil large
  // and forward, the mouth shut in a pout with two little bottom fangs poking up. As the
  // tower goes (`happy`), the back corner of the mouth lifts into a smirk.
  const hp = pose.happy;
  // The eye: cream, a violet ring, a big dark pupil looking ahead, two highlights.
  // (On the sign: a mint ring and a mint pupil, nothing filled.)
  if (!sign) {
    ctx.fillStyle = '#f4ecdc';
    ctx.beginPath(); ctx.arc(...EYE, 7.5, 0, Math.PI * 2); ctx.fill();
  }
  tube(ctx, P((p) => p.arc(...EYE, 7.5, 0, Math.PI * 2)), sign ? MINT : VIOLET, 1.3, 0.8);
  const pupil = [EYE[0] + 2.2, EYE[1] + 0.8];
  ctx.fillStyle = sign ? MINT : '#120820';
  ctx.beginPath(); ctx.arc(...pupil, sign ? 3 : 4.6, 0, Math.PI * 2); ctx.fill();
  // Lit while charging and firing: the beam's colour in the pupil, and a bloom.
  const heat = pose.firing ? 1 : pose.charge;
  if (heat > 0) {
    ctx.save();
    ctx.globalAlpha = heat;
    ctx.fillStyle = look.glow;
    ctx.beginPath(); ctx.arc(...pupil, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const r = 3 + 9 * heat;
    const g = ctx.createRadialGradient(...pupil, 0, ...pupil, r);
    g.addColorStop(0, look.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(pupil[0] - r, pupil[1] - r, r * 2, r * 2);
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(pupil[0] + 1.2, pupil[1] - 1.8, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(pupil[0] - 2.2, pupil[1] + 1.4, 0.9, 0.9);
  // A blink: the eye shut to a line.
  // THE WINK, the whole face: the eye a tight upturned arch, the cheek pushed up under
  // it, the brow dragged down onto it (below) and the mouth's corner hauled into the smirk.
  const wk = pose.winkW || 0;
  if (wk > 0.05) {
    ctx.fillStyle = BODY;
    ctx.beginPath(); ctx.arc(...EYE, 9.2, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalAlpha = wk;
    tube(ctx, P((p) => { p.moveTo(EYE[0] - 7.5, EYE[1] + 4.5); p.quadraticCurveTo(EYE[0], EYE[1] + 4.5 - 13 * wk, EYE[0] + 7.5, EYE[1] + 4.5); }), '#ffffff', 2.4, 1.6);
    tube(ctx, P((p) => { p.moveTo(EYE[0] - 8, EYE[1] + 10); p.quadraticCurveTo(EYE[0], EYE[1] + 7, EYE[0] + 8.5, EYE[1] + 10.5); }), MINT, 1.3, 0.8);
    ctx.restore();
  }
  if (pose.blink) {
    ctx.fillStyle = BODY;
    ctx.beginPath(); ctx.arc(...EYE, 8.6, 0, Math.PI * 2); ctx.fill();
    tube(ctx, P((p) => { p.moveTo(EYE[0] - 6.5, EYE[1] + 1); p.quadraticCurveTo(EYE[0], EYE[1] + 3.5, EYE[0] + 6.5, EYE[1] + 1); }), sign ? MINT : VIOLET, 1.3, 0.8);
  }
  // The wink's star, off the shut eye on the ding: a flat four-point glint that swells,
  // turns and fades (the coyote's, speedMcmCoyote.js star).
  if (pose.wink != null && pose.wink > 0 && pose.wink < WINK_STAR) {
    const k = pose.wink / WINK_STAR;
    const R = (k < 0.14 ? k / 0.14 : 1 - ((k - 0.14) / 0.86) * 0.55) * 15, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const sx = EYE[0] + 1, sy = EYE[1] - 1, rot = k * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = rot + i * Math.PI / 4, r = i % 2 === 0 ? R : R * 0.22;
      ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(ang) * r, sy + Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // The brow comes down over the top of the eye, lowest at the front: the scowl. Cut
  // with the body's own fill, then the ridge drawn as a thick, rounded tube on top.
  const lidAt = (x) => EYE[1] - 4.6 - hp * 0.8 + (x - EYE[0]) * 0.38;
  ctx.save();
  ctx.beginPath(); ctx.arc(...EYE, 9.2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.moveTo(EYE[0] - 10, EYE[1] - 12);
  ctx.lineTo(EYE[0] + 10, EYE[1] - 12);
  ctx.lineTo(EYE[0] + 10, lidAt(EYE[0] + 10));
  ctx.lineTo(EYE[0] - 10, lidAt(EYE[0] - 10));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const lidB = (x) => lidAt(x) + (pose.winkW || 0) * 2.2;
  tube(ctx, P((p) => {
    p.moveTo(EYE[0] - 10, lidB(EYE[0] - 10) - 2.5);
    p.quadraticCurveTo(EYE[0] - 1, lidB(EYE[0] - 1) - 5.5, EYE[0] + 9, lidB(EYE[0] + 9) - 1.2);
    p.quadraticCurveTo(EYE[0] + 11.5, lidB(EYE[0] + 11) + 0.2, EYE[0] + 11, lidB(EYE[0] + 11) + 2.2);
  }), MINT, 2.2, 0.8);
  // The mouth: shut, the lip line dipping at the back into a pout — or, as he smirks,
  // that corner curling up instead.
  if (sign) {
    if (hp > 0.05) {
      ctx.save();
      ctx.globalAlpha = hp;
      tube(ctx, P((p) => { p.moveTo(31, -135.5); p.quadraticCurveTo(28, -137, 28.5, -140.5); }), MINT, 1.3, 0.8);
      ctx.restore();
    }
  } else tube(ctx, P((p) => {
    p.moveTo(sn(57), -137);
    p.quadraticCurveTo(sn(44), -135.2 - hp * 0.6, 33, -135.6 + 1.2 * (1 - hp) - 2.2 * hp);
    p.quadraticCurveTo(30.5, -135.4 + 1.8 * (1 - hp) - 3.6 * hp, 30, -134.2 + 2.4 * (1 - hp) - 6 * hp);
  }), MINT, 1.3, 0.8);
  // Two little bottom fangs, poking up over the lip near the front.
  ctx.fillStyle = '#f4ecdc';
  if (!sign) for (const x of [sn(43), sn(49.5)]) {
    ctx.beginPath(); ctx.moveTo(x - 1.4, -135.9); ctx.lineTo(x, -139.6); ctx.lineTo(x + 1.4, -135.9); ctx.closePath(); ctx.fill();
  }
  // Blush, three pink dashes; a nostril.
  if (!sign) for (let i = 0; i < 3; i++) tube(ctx, P((p) => { p.moveTo(EYE[0] - 10 + i * 3, EYE[1] + 13); p.lineTo(EYE[0] - 8 + i * 3, EYE[1] + 10); }), PINK, 1, 0.6);
  tube(ctx, P((p) => p.arc(sn(sign ? 60 : 56), sign ? -150 : -148, 1.6, Math.PI, Math.PI * 1.9)), MINT, 0.9, 0.5);
  ctx.restore();

  // NEAR ARM — stubby, rooted INSIDE the body: refilled over the belly bands, and
  // outlined only from a third of the way out, so it grows out of him with no seam.
  solid(arm);
  tube(ctx, armOutline(...na.pts, 14, 8, 0.35), MINT, 1.3, 0.8);
  claws(ctx, na.pts[2], na.ang, 1);
  ctx.restore();
}

// An arm turned `a` about its shoulder; `ang` is the way the hand points.
function armGeom(sh, el, hand, a) {
  const r = ([x, y]) => [sh[0] + (x - sh[0]) * Math.cos(a) - (y - sh[1]) * Math.sin(a),
    sh[1] + (x - sh[0]) * Math.sin(a) + (y - sh[1]) * Math.cos(a)];
  const e = r(el), h = r(hand);
  return { pts: [sh, e, h], ang: Math.atan2(h[1] - e[1], h[0] - e[0]) - 0.4 };
}
// A taper's outline from `u0` out round the tip and back — open at the root.
function armOutline(p0, c, p1, w0, w1, u0, n = 10) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const u = u0 + (1 - u0) * i / n;
    const [x, y] = quadAt(p0, c, p1, u);
    const [tx, ty] = quadTan(p0, c, p1, u);
    const w = (w0 + (w1 - w0) * u) / 2;
    L.push([x - ty * w, y + tx * w]);
    R.push([x + ty * w, y - tx * w]);
  }
  return P((p) => {
    p.moveTo(...L[0]);
    for (const q of L.slice(1)) p.lineTo(...q);
    const tip = quadAt(p0, c, p1, 1), [tx, ty] = quadTan(p0, c, p1, 1);
    p.quadraticCurveTo(tip[0] + tx * w1 * 0.8, tip[1] + ty * w1 * 0.8, ...R[n]);
    for (const q of R.reverse().slice(1)) p.lineTo(...q);
  });
}

// Plates every `gap` along a polyline (tail tip → head): each with its point, the
// line's direction, the outward normal (to the left of travel — up and back), a size
// rising to mid-back and falling to the head, and its place along the line as `k`.
function ridgePlates(pts, gap) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  const n = Math.max(2, Math.round(total / gap));
  const out = [];
  for (let j = 0; j < n; j++) {
    let d = (j + 0.5) * total / n, i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const a = pts[i], b = pts[i + 1], u = seg[i] ? d / seg[i] : 0;
    const tn = [(b[0] - a[0]) / (seg[i] || 1), (b[1] - a[1]) / (seg[i] || 1)];
    const k = (j + 0.5) / n;
    out.push({
      at: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
      tn, n: [tn[1], -tn[0]], k,
      size: 6 + 14 * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.08)), 1.3),
    });
  }
  return out;
}

function platePath({ at, n, tn, size }) {
  // A plain triangle, base sunk into the back ("standard triangular scale things").
  const b = size * 0.5;
  const q = (a, o) => [at[0] + tn[0] * a + n[0] * o, at[1] + tn[1] * a + n[1] * o];
  return P((p) => {
    p.moveTo(...q(-b, -3));
    p.lineTo(...q(0, size * 0.9));
    p.lineTo(...q(b, -3));
    p.closePath();
  });
}

// Three yellow hooks at a hand, fanned about `ang`.
function claws(ctx, [x, y], ang, k) {
  for (let i = -1; i <= 1; i++) {
    const a = ang + i * 0.5;
    const tx = x + Math.cos(a) * 4, ty = y + Math.sin(a) * 4;
    tube(ctx, P((p) => { p.moveTo(x, y); p.quadraticCurveTo(tx + Math.cos(a - 1.2) * 2, ty + Math.sin(a - 1.2) * 2, tx + Math.cos(a + 0.8) * 2.5, ty + Math.sin(a + 0.8) * 2.5); }), YEL, 1.1 * k, 0.7);
  }
}
// The reference's "ccc": three yellow toe hooks along the front of a foot.
function toes(ctx, [x, y], k) {
  for (let i = 0; i < 3; i++) tube(ctx, P((p) => p.arc(x + i * 4.5, y - 1, 2.2, Math.PI * 0.4, Math.PI * 1.6)), YEL, 1.1 * k, 0.7);
}

function mix(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}


// ------------------------------------------------------------------ the tower
// A wire tower like the near row's, riding in at its parallax. Before CUT it stands;
// after, the cut top tips away from the beams and drops behind the row into the smog.
const TW = 36, TH = 172;
const SLICE_R = GROUND_Y - 116, SLICE_L = GROUND_Y - 110;   // the cut, sloping down-left

function towerBody(ctx, x, top, t, ink) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 4.8;
  ctx.strokeRect(x + 0.5, top + 0.5, TW, 270 - top);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.5, top + 0.5, TW, 270 - top);
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = top + 9; y < 268; y += 9) { ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + TW + 0.5, y + 0.5); }
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#f6d33c';
  for (let k = 0; k < 22; k++) {
    if (hash(k + 3) > 0.5 || Math.sin(t * 0.55 + k * 7) < -0.3) continue;
    ctx.fillRect(x + 3 + Math.floor(hash(k * 7) * (TW - 6)), top + 11 + Math.floor(hash(k * 13) * 14) * 9, 2, 2);
  }
  // Stepped crown and a mast with its lamp.
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6.5, top - 7.5, TW - 12, 8);
  ctx.beginPath(); ctx.moveTo(x + TW / 2 + 0.5, top - 8); ctx.lineTo(x + TW / 2 + 0.5, top - 24); ctx.stroke();
  if (Math.sin(t * 2.2) > 0) { ctx.fillStyle = '#ff4a5a'; ctx.fillRect(x + TW / 2 - 0.5, top - 26, 2, 2); }
  ctx.restore();
}

function cutClip(ctx, x, above) {
  ctx.beginPath();
  if (above) { ctx.moveTo(x - 60, -50); ctx.lineTo(x + TW + 60, -50); }
  else { ctx.moveTo(x - 60, 300); ctx.lineTo(x + TW + 60, 300); }
  ctx.lineTo(x + TW + 60, SLICE_R + (SLICE_R - SLICE_L) * (60 / TW));
  ctx.lineTo(x - 60, SLICE_L - (SLICE_R - SLICE_L) * (60 / TW));
  ctx.closePath();
  ctx.clip();
}

function drawTower(ctx, ph, t, x) {
  const top = GROUND_Y - TH;
  const ink = '#38d8f8';
  if (ph < CUT) { towerBody(ctx, x, top, t, ink); return; }
  const tc = ph - CUT;
  // The stump.
  ctx.save(); cutClip(ctx, x, false); towerBody(ctx, x, top, t, ink); ctx.restore();
  // The top: tips about the cut's far corner, then falls.
  const piv = [x + TW, SLICE_R];
  const ang = Math.min(1.6, 1.4 * tc * tc + 0.2 * tc);
  const drop = tc > 0.5 ? 0.5 * 420 * (tc - 0.5) ** 2 : 0;
  if (drop < 300) {
    ctx.save();
    ctx.translate(piv[0] + drop * 0.12, piv[1] + drop);
    ctx.rotate(ang);
    ctx.translate(-piv[0], -piv[1]);
    cutClip(ctx, x, true);
    towerBody(ctx, x, top, t, ink);
    ctx.restore();
  }
  // The molten cut along the stump, cooling.
  const heat = clamp01(1 - tc / 2.5);
  if (heat > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,160,60,${heat})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, SLICE_L); ctx.lineTo(x + TW, SLICE_R); ctx.stroke();
    ctx.restore();
  }
}

// The fireball, the debris and the smoke at the cut.
function drawBlast(ctx, ph, tx) {
  if (ph < CUT) return;
  const tc = ph - CUT;
  const x = tx + TW / 2, y = (SLICE_L + SLICE_R) / 2;
  // Smoke first, rising off the stump and leaning back with the run.
  for (let i = 0; i < 9; i++) {
    const age = tc - i * 0.22;
    if (age <= 0) continue;
    const r = 5 + age * 7;
    ctx.globalAlpha = Math.max(0, 0.42 - age * 0.11);
    ctx.fillStyle = i % 2 ? '#3a2a4a' : '#2a2038';
    ctx.beginPath();
    ctx.arc(x + (hash(i) - 0.5) * 14 + age * 10, y - age * 22 - hash(i + 9) * 6, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (tc < 1.1) {
    const k = tc / 1.1;
    const r = 12 + 34 * Math.sqrt(k);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,220,${1 - k})`);
    g.addColorStop(0.35, `rgba(255,170,60,${0.9 * (1 - k)})`);
    g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Debris: chips of the tower's glass and lit sparks, under gravity.
  for (let i = 0; i < 22; i++) {
    const vx = (hash(i * 3) - 0.35) * 150, vy = -40 - hash(i * 5) * 130;
    const px = x + vx * tc, py = y + vy * tc + 0.5 * 320 * tc * tc;
    if (py > GROUND_Y + 10) continue;
    ctx.globalAlpha = clamp01(1.6 - tc);
    ctx.fillStyle = i % 3 ? '#ffb050' : '#38d8f8';
    ctx.fillRect(px, py, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 1);
  }
  // Embers off the cut, all the while.
  for (let i = 0; i < 10; i++) {
    const a = (tc * 0.8 + hash(i)) % 1;
    ctx.globalAlpha = (1 - a) * 0.9;
    ctx.fillStyle = '#ff9a40';
    ctx.fillRect(x + (hash(i + 4) - 0.5) * TW + a * 8, y - a * 40, 1, 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Where the beams land: a point sweeping the cut, right to left.
function beamTarget(ph, tx, flip = false) {
  const s = ease(span(ph, SWEEP));
  const x = tx + TW + 2 - (TW + 4) * s;
  return [flip ? 2 * (tx + TW / 2) - x : x, SLICE_R + (SLICE_L - SLICE_R) * s];
}


// ------------------------------------------------------------------- the beams
// One beam per eye, from the eye to where the cut is: a glow, a body, a white core —
// or, for C, a crackle.
function drawLasers(ctx, look, eyes, to, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  eyes.forEach((from, e) => {
    const end = [to[0] - e * 2, to[1] - e * 1.5];
    const dx = end[0] - from[0], dy = end[1] - from[1];
    const len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const along = (s, o) => [from[0] + dx * s + nx * o, from[1] + dy * s + ny * o];
    ctx.save();
    ctx.globalAlpha = e ? 0.7 : 1;
    if (look.id === 'zigzag') {
      const seed = Math.floor(t * 14) + e * 97;
      [['#38d8f8', 0], ['#5cff9a', 1], ['#ffffff', 2]].forEach(([c, k]) => {
        const pts = [from];
        for (let i = 1; i < 9; i++) {
          const s = i / 9;
          const amp = (2 + 9 * s) * (k === 2 ? 0.5 : 1);
          pts.push(along(s, (i % 2 ? 1 : -1) * amp * (0.5 + hash(seed * 31 + i + k * 7))));
        }
        pts.push(end);
        for (const [w, a] of [[5, 0.18], [1.6, 0.9]]) {
          ctx.globalAlpha = a * (e ? 0.7 : 1);
          ctx.strokeStyle = c;
          ctx.lineWidth = w * (k === 2 ? 0.6 : 1);
          ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke();
        }
      });
    } else {
      const flick = 0.85 + 0.15 * Math.sin(t * 70 + e);
      for (const [w, a, c] of [[9 * flick, 0.18, look.glow], [3.2 * flick, 0.75, look.glow], [1.1, 1, '#ffffff']]) {
        ctx.globalAlpha = a * (e ? 0.7 : 1);
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(...from); ctx.lineTo(...end); ctx.stroke();
      }
    }
    ctx.restore();
  });
  // The contact: a hot spot and sparks.
  const r = 11 + 3 * Math.sin(t * 50);
  const g = ctx.createRadialGradient(to[0], to[1], 0, to[0], to[1], r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, look.glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(to[0] - r, to[1] - r, r * 2, r * 2);
  ctx.strokeStyle = '#ffe0a0';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 7; i++) {
    const a = -0.4 + hash(i + Math.floor(t * 30)) * 2.2, l = 4 + hash(i * 3 + Math.floor(t * 30)) * 9;
    ctx.beginPath(); ctx.moveTo(...to); ctx.lineTo(to[0] + Math.cos(a) * l, to[1] + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
}

// He looks at the tower from the moment it is in view, and along the beams.
function aimAt(ph, pose, tx) {
  const tgt = pose.firing ? beamTarget(ph, tx, pose.flip) : [tx + TW / 2, SLICE_R];
  const [m] = eyesAt(pose, 0);
  const want = Math.atan2(tgt[1] - m[1], pose.flip ? m[0] - tgt[0] : tgt[0] - m[0]);
  return Math.max(-0.1, Math.min(0.35, want * 0.6));
}

// ------------------------------------------------------------------ entry points
/** The tower and its blast — in the city, between the middle and near rows. */
export function drawKaijuTower(ctx, st) {
  // Facing left (`flip`): the tower and its blast are drawn mirrored about the tower's
  // own middle, so the cut slopes the other way and the top falls away to the left.
  ctx.save();
  if (st.flip) { const c = st.tx + TW / 2; ctx.translate(c, 0); ctx.scale(-1, 1); ctx.translate(-c, 0); }
  drawTower(ctx, st.ph, st.t, st.tx);
  drawBlast(ctx, st.ph, st.tx);
  ctx.restore();
}
/** Him and his beams — after the near row, before the smog veil. */
export function drawKaijuFront(ctx, st) {
  const pose = poseAt(st.ph, st.t, st);
  const aim = aimAt(st.ph, pose, st.tx) + pose.nod;
  const look = st.look || KAIJU_RED;
  drawKaiju(ctx, pose, aim, st.t, look);
  if (pose.firing) drawLasers(ctx, look, eyesAt(pose, aim), beamTarget(st.ph, st.tx, pose.flip), st.t);
}
/** How bright the street should flash this instant (the beams, then the blast). */
export function kaijuFlash(ph) {
  const firing = ph >= SWEEP[0] && ph < SWEEP[1];
  return (firing ? 0.06 : 0) + (ph > CUT ? Math.max(0, 0.2 * (1 - (ph - CUT) / 0.6)) : 0);
}
