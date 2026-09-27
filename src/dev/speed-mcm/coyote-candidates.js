// SPEED ZONE mid-century bake-off — THE COYOTE BAKE-OFF (Peter, 25 Sep 2026: the first
// re-cut "looks a bit like an aardvark!" … "a few more styles for the coyote in a
// bakeoff"). The aardvark was the head: a long thin drooping snout with the nose on the
// very tip, no stop between skull and muzzle, the ears set far back — a tube on a neck.
// A coyote wants a brow and a stop, a shorter pointed muzzle with a jaw, tall ears ON
// TOP of the head and close together, a ruff, a narrow sly eye.
//
// Seven coyotes, one seat. Every candidate sits on the same ledge at the same place and
// scale as the card's coyote, faces either way, sits and howls on the shipped 5 s clock
// (head up, mouth open, the song in rings), and draws no stroke outside its own
// silhouette. They share coyote.js's engine — the paper coyote's pose model and show
// clocks, and its print passes (a slipped ink plate, a card rim, or none) — and differ
// in the drawing, each a separate mid-century take rather than a tweak of one:
//   0 CURRENT            the first re-cut, as it is (the control)
//   A RE-PROPORTIONED    the control's hand with the head fixed (all four shows)
//   B CHUCK JONES        the Wile E. read: lanky, big head, enormous ears, sly lids
//   C CHARLEY HARPER     a handful of triangles, a half-disc and a wedge; no line
//   D BLAIR / UPA        one bold sitting mass with a flame tail, one accent colour
//   E PAPER PORT         the paper coyote's exact geometry in flat colour (all four shows)
//   F GOLDEN BOOK        a friendly card-cut coyote: round ruff, bushy tail, big eye
//
// Each is { id, name, note, draw(ctx, t, x, ledgeTop, facing, colours, opts) }, the
// signature mcm.js's coyote seam takes (drawSpeedMcmScene(…, { coyote: cand.draw })).
import {
  CURRENT_MODEL, drawCoyoteModel, drawMcmCoyote, winkShow, part, line, plate,
  poly, oval, lerp, lerpPts, mix, MCM_COYOTE_MODES,
} from './coyote.js';
import { MCM_PALETTES, drawCoyoteLedge } from './mcm.js';

const TAU = Math.PI * 2;

// A closed smooth blob through the midpoints of its control polygon.
const blob = (pts) => (c) => {
  const n = pts.length / 2;
  const P = (i) => [pts[(i % n) * 2], pts[(i % n) * 2 + 1]];
  const [ax, ay] = P(n - 1);
  const [bx, by] = P(0);
  c.moveTo((ax + bx) / 2, (ay + by) / 2);
  for (let i = 0; i < n; i++) {
    const [px, py] = P(i);
    const [qx, qy] = P(i + 1);
    c.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
  }
  c.closePath();
};
const shift = (pts, dx, dy) => pts.map((v, i) => v + (i % 2 ? dy : dx));

// A triangular ear on a base (x0,y0)-(x1,y1), `len` long, leaning `rot` (0 = straight up,
// negative = back), with an optional inner colour.
function ear(ctx, pass, x0, y0, x1, y1, len, rot, fill, inner = null) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const tip = [mx + Math.sin(rot) * len, my - Math.cos(rot) * len];
  part(ctx, pass, poly([x0, y0, tip[0], tip[1], x1, y1]), fill);
  if (inner) {
    part(ctx, pass, poly([lerp(x0, mx, 0.45), lerp(y0, my, 0.45) - 0.15, lerp(mx, tip[0], 0.78), lerp(my, tip[1], 0.78),
      lerp(x1, mx, 0.45), lerp(y1, my, 0.45) - 0.15]), inner, false);
  }
}

// An open jaw hinged at (hx, hy): the dark mouth wedge from the upper lip line, and the
// lower jaw (and tongue) rotated down by `jaw`.
function jawOpen(ctx, pass, K, h, hx, hy, len, lip, colour) {
  if (h.jaw <= 0.05) return;
  const jx = hx + Math.cos(h.jaw) * len;
  const jy = hy + Math.sin(h.jaw) * len;
  part(ctx, pass, poly([hx + 0.1, hy - 0.45, lip[0], lip[1], jx, jy]), K.mouth);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(h.jaw);
  if (h.tongue > 0.02) part(ctx, pass, oval(len * 0.62, -0.35, len * 0.4 * h.tongue, 0.5, -0.1), K.tongue, false);
  part(ctx, pass, poly([0, -0.35, len, -0.15, len * 0.94, 0.5, 0, 1.05]), colour);
  ctx.restore();
}

// Eyelids for the yawn's waking blink: the coat drawn down over the top of an eye.
function lids(ctx, pass, K, h, cx, cy, rx, ry, rot) {
  if (h.lids <= 0.05) return;
  part(ctx, pass, (c) => { c.ellipse(cx, cy, rx * 1.08, ry * 1.12, rot, Math.PI, Math.PI + Math.PI * h.lids); c.lineTo(cx, cy); c.closePath(); }, K.coat, false);
}

// ================================================================== A RE-PROPORTIONED
// The control's body and hand, the head rebuilt: a skull with a brow and a stop, a
// muzzle a third shorter with a slight upturn and a jaw, the ears up on the crown and
// close together, a jagged ruff at the throat and cheek and a scruff at the nape, and a
// narrow almond eye under a heavy lid.
function bodyA(ctx, pass, K, pose) {
  CURRENT_MODEL.body(ctx, pass, K, pose);
  const k = pose.lie;
  part(ctx, pass, poly(shift([0.9, -13.6, -0.8, -13.3, -0.2, -12.8, -1.8, -12.2, -0.9, -11.8, -2.5, -10.9, -1.3, -10.4],
    3.5 * k, 6.8 * k)), K.back);
  part(ctx, pass, poly(shift([1.3, -13.0, 4.9, -11.3, 4.2, -10.7, 5.4, -9.9, 4.3, -9.4, 4.9, -8.4, 3.4, -8.6, 2.6, -10.6],
    3.4 * k, 5.8 * k)), K.cream, false);
}
function headA(ctx, pass, K, h) {
  ctx.rotate(h.rot);
  const L = 1 - h.earBack * 0.25;
  ear(ctx, pass, -0.9, -2.7, 0.8, -3.2, 5.0 * L, -0.14 - h.flick - h.earBack * 0.95, K.dark);
  ear(ctx, pass, 0.4, -3.3, 2.3, -3.1, 5.3 * L, 0.08 - h.earBack * 0.95, K.coat, K.ear);
  jawOpen(ctx, pass, K, h, 3.2, 0.1, 3.1, [6.1, -0.8], K.cream);
  part(ctx, pass, poly([-1.7, -0.4, -1.3, -2.4, 0.0, -3.4, 1.8, -3.5, 2.9, -2.8, 3.3, -2.2, 5.4, -1.75, 6.1, -1.6,
    6.35, -1.05, 6.0, -0.6, 5.2, -0.35, 3.4, 0.15, 2.1, 0.9, 0.6, 1.2, -1.0, 0.8]), K.coat);
  part(ctx, pass, poly([3.3, -1.2, 6.2, -0.95, 6.0, -0.6, 5.2, -0.35, 3.4, 0.15, 2.4, -0.3]), K.cream, false);
  part(ctx, pass, poly([-0.9, 0.5, 0.1, 2.4, 0.7, 1.5, 1.5, 2.7, 2.0, 1.5, 2.7, 1.8, 2.5, 0.6]), K.cream);
  part(ctx, pass, oval(6.12, -1.18, 0.55, 0.45), K.nose, false);
  if (h.eye === 'shut') {
    line(ctx, pass, K.eye, 0.36, (c) => { c.moveTo(1.1, -2.1); c.quadraticCurveTo(2.0, -1.6, 2.9, -2.1); });
  } else {
    part(ctx, pass, oval(2.05, -2.0, 0.95, 0.36, -0.2), K.cream, false);
    part(ctx, pass, oval(2.32, -1.98, 0.3, 0.3), K.eye, false);
    lids(ctx, pass, K, h, 2.05, -2.0, 0.95, 0.36, -0.2);
  }
  part(ctx, pass, poly([0.9, -2.6, 3.1, -2.9, 2.95, -2.42, 1.05, -2.28]), K.back, false);
}
const MODEL_A = {
  body: bodyA, head: headA, headSit: [2.9, -13.0], headLie: [9.2, -3.4],
  ringReach: 6.8, modes: MCM_COYOTE_MODES, wink: winkShow,
};

// ================================================================== B CHUCK JONES
// The Maurice Noble-era Wile E.: scrawny and tall, sat up with a slight hunch; a big
// cranium with enormous ears, a pointed snout ending in a black nose, heavy sly lids;
// a scraggly chest tuft, stick arms to the ledge, a thin bony tail with a bushy tip.
function bodyB(ctx, pass, K, pose) {
  const tw = pose.tw;
  // A bony tail along the ledge, its brush drooping over the ledge's end.
  part(ctx, pass, poly([-4.4, -1.5, -10.4, -1.3, -10.5, -0.6, -4.4, -0.4]), K.coat);
  part(ctx, pass, poly([-9.6, -1.5, -12.2, -2.5 + tw * 0.3, -14.6, -1.5 + tw * 0.4, -15.6, 1.4 + tw * 0.5, -14.2, 2.3, -13.0, 0.2, -10.2, -0.5]), K.coat);
  part(ctx, pass, poly([-14.4, -1.2 + tw * 0.4, -14.6, -1.5 + tw * 0.4, -15.6, 1.4 + tw * 0.5, -14.2, 2.3, -13.8, 0.6]), K.tip);
  part(ctx, pass, poly([-5.4, -0.4, -5.6, -3.6, -4.4, -7.2, -2.2, -8.0, -0.6, -6.2, -0.4, -2.8, -1.8, -0.6]), K.coat);
  part(ctx, pass, poly([-5.4, -0.4, -5.6, -3.6, -4.8, -5.8, -3.6, -3.4, -3.0, -0.5]), K.dark, false);
  part(ctx, pass, poly([-3.0, 0, 1.4, 0, 1.7, -0.8, -2.6, -1.2]), K.dark);
  const h = pose.heave;
  part(ctx, pass, poly([-3.8, -5.0, -3.2, -11.4, -1.6, -15.4, 1.2, -16.2, 2.4 + h, -13.4, 2.2 + h, -8.0, 1.2, -2.4, -1.8, -1.6]), K.coat);
  part(ctx, pass, poly([-3.8, -5.0, -3.2, -11.4, -1.6, -15.4, -0.5, -15.6, -2.0, -11.8, -2.6, -6.0]), K.back, false);
  part(ctx, pass, poly([1.2, -15.6, 2.8 + h, -14.0, 2.2 + h, -13.6, 3.2 + h, -12.6, 2.2 + h, -12.2, 2.9 + h, -11.1, 1.8, -11.0, 2.2, -9.6, 1.0, -10.4, 0.6, -13.4]), K.cream, false);
  part(ctx, pass, poly([0.2, -13.4, 1.1, -13.2, 2.0, -0.9, 1.2, -0.9]), K.dark);
  part(ctx, pass, poly([0.9, -12.9, 1.9, -12.7, 3.3, -0.8, 2.4, -0.8]), K.coat);
  part(ctx, pass, oval(1.8, -0.45, 0.95, 0.45), K.dark);
  part(ctx, pass, oval(3.1, -0.42, 1.0, 0.45), K.coat);
}
function headB(ctx, pass, K, h) {
  ctx.rotate(h.rot);
  ear(ctx, pass, -2.6, -2.4, -0.6, -4.0, 7.0, -0.34 - h.flick, K.dark);
  ear(ctx, pass, -1.2, -4.4, 1.9, -4.2, 7.6, -0.12, K.coat, K.ear);
  jawOpen(ctx, pass, K, h, 3.6, 0.3, 3.9, [7.3, -0.5], K.cream);
  part(ctx, pass, poly([-2.9, -0.8, -2.7, -3.0, -1.4, -4.6, 0.9, -5.1, 2.8, -4.3, 3.6, -3.2, 3.9, -2.6, 7.0, -1.5, 7.9, -1.1,
    7.8, -0.55, 7.1, -0.35, 4.6, 0.3, 3.2, 1.5, 0.8, 1.9, -1.6, 1.1]), K.coat);
  part(ctx, pass, poly([4.0, -1.7, 7.4, -0.7, 7.1, -0.35, 4.6, 0.3, 3.2, 1.5, 2.2, 0.4]), K.cream, false);
  part(ctx, pass, oval(7.72, -0.95, 0.8, 0.62), K.nose, false);
  if (h.eye === 'shut') {
    line(ctx, pass, K.eye, 0.4, (c) => { c.moveTo(1.2, -2.8); c.quadraticCurveTo(2.3, -2.2, 3.4, -2.75); });
  } else if (pass === 'paint') {
    part(ctx, pass, oval(2.3, -2.8, 1.2, 0.95, -0.1), K.cream, false);
    part(ctx, pass, oval(2.72, -2.5, 0.46, 0.5), K.eye, false);
    // The heavy lid: the coat drawn half down over the eye, a dark rim along it.
    ctx.save();
    ctx.beginPath();
    oval(2.3, -2.8, 1.25, 1.0, -0.1)(ctx);
    ctx.clip();
    part(ctx, pass, (c) => c.rect(0.8, -4.2, 3.2, 1.45), K.coat, false);
    ctx.restore();
    line(ctx, pass, K.back, 0.42, (c) => { c.moveTo(1.1, -2.78); c.lineTo(3.5, -2.72); });
  }
  part(ctx, pass, poly([0.9, -4.0, 3.5, -3.9, 3.3, -3.45, 1.1, -3.55]), K.back, false);
}
const MODEL_B = { body: bodyB, head: headB, headSit: [1.2, -16.0], ringReach: 8.6, scale: 0.87, modes: ['howl'] };

// ================================================================== C CHARLEY HARPER
// A coyote from a handful of flat shapes and no line at all: a half-disc haunch, a
// wedge of a body split light and dark, two bar legs, a tail as one tapered wedge with
// a black tip, and a crisp symmetric triangle of a head — coat above the axis, cream
// below, a dot eye, a triangle nose. The howl opens the lower half like a hinge.
// Harper's inks: a rustier ochre, a deep back, a pale ochre instead of cream so the
// light side still holds against the palest sky.
function tonesC(K) {
  return {
    coat: mix(K.coat, '#b8652f', 0.3),
    back: mix(K.back, '#3e2620', 0.25),
    light: mix(K.cream, '#e09a62', 0.4),
  };
}
function bodyC(ctx, pass, K, pose) {
  const C = tonesC(K);
  const tw = pose.tw * 0.4;
  part(ctx, pass, poly([-5.0, -2.6, -13.2, -0.6 + tw, -5.0, -0.1]), C.coat);
  part(ctx, pass, poly([-10.4, -1.28 + tw * 0.66, -13.2, -0.6 + tw, -10.4, -0.43 + tw * 0.66]), K.tip);
  part(ctx, pass, (c) => { c.moveTo(-7.8, 0); c.arc(-2.4, 0, 5.4, Math.PI, TAU); c.closePath(); }, C.coat);
  part(ctx, pass, poly([-4.2, -4.0, 1.0, -13.6, 4.6 + pose.heave, -10.4, 3.8, 0, -0.4, 0]), C.coat);
  part(ctx, pass, poly([-4.2, -4.0, 1.0, -13.6, -0.6, -4.6]), C.back, false);
  part(ctx, pass, poly([1.9, -12.2, 4.6 + pose.heave, -10.4, 3.7, -0.4]), C.light, false);
  part(ctx, pass, poly([1.3, -8.5, 2.4, -8.5, 2.4, 0, 1.3, 0]), C.back);
  part(ctx, pass, poly([2.7, -8.5, 3.8, -8.5, 3.8, 0, 2.7, 0]), C.coat);
}
function headC(ctx, pass, K, h) {
  const C = tonesC(K);
  K = { ...K, coat: C.coat, back: C.back, cream: C.light };
  ctx.rotate(h.rot);
  ctx.scale(1.3, 1.3);
  part(ctx, pass, poly([-2.2, -2.1, -2.4 - h.flick * 2, -7.6, -0.6, -2.5]), K.back);
  part(ctx, pass, poly([-1.0, -2.4, -0.4, -8.2, 1.2, -1.9]), K.coat);
  part(ctx, pass, poly([-0.5, -2.6, -0.3, -6.6, 0.6, -2.2]), K.ear, false);
  // The front of the lower half hinges down under the eye; the mouth is what opens.
  if (h.jaw > 0.05) {
    const a = h.jaw * 0.55;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const R = (x, y) => [1.2 + (x - 1.2) * c - (y + 0.4) * s, -0.4 + (x - 1.2) * s + (y + 0.4) * c];
    part(ctx, pass, poly([1.2, -0.4, 6.0, -0.4, ...R(6.0, -0.4)]), K.mouth);
    part(ctx, pass, poly([-1.4, -0.4, 1.2, -0.4, 1.2, 1.16, -1.4, 2.0]), K.cream);
    part(ctx, pass, poly([1.2, -0.4, ...R(6.0, -0.4), ...R(1.2, 1.16)]), K.cream);
  } else {
    part(ctx, pass, poly([-1.4, -0.4, 6.0, -0.4, -1.4, 2.0]), K.cream);
  }
  part(ctx, pass, poly([-1.4, -2.8, 6.0, -0.4, -1.4, -0.4]), K.coat);
  part(ctx, pass, poly([6.0, -0.4, 5.0, -1.05, 5.0, -0.4]), K.nose, false);
  if (h.eye === 'shut') {
    part(ctx, pass, poly([0.5, -1.35, 2.2, -1.35, 2.2, -1.0, 0.5, -1.0]), K.eye, false);
  } else {
    part(ctx, pass, oval(1.3, -1.25, 0.85, 0.85), '#fff6e2', false);
    part(ctx, pass, oval(1.42, -1.25, 0.52, 0.52), K.eye, false);
    part(ctx, pass, oval(1.58, -1.44, 0.15, 0.15), '#ffffff', false);
  }
}
const MODEL_C = {
  body: bodyC, head: headC, headSit: [2.4, -13.0], ringReach: 8.4, modes: ['howl'],
  print: (ctx, K, fn) => fn('paint'),
};

// ================================================================== D BLAIR / UPA
// One bold sitting mass in a single deep colour: a pear of a body, a head with a sharp
// snout, two pointed ears, a flame of a tail — with one accent: a crescent on the chest
// and the slit of an eye. An accent plate slips out from under the dark, off register.
// It has to read by shape alone.
function bodyD(ctx, pass, K, pose) {
  const S = K.silhouette;
  const tw = pose.tw * 1.4;
  part(ctx, pass, (c) => {
    c.moveTo(-4.0, -0.6);
    c.quadraticCurveTo(-9.8, -0.4, -11.2, -4.2);
    c.quadraticCurveTo(-12.0, -7.6, -9.4 + tw, -11.0);
    c.quadraticCurveTo(-10.4, -7.4, -8.6, -4.8);
    c.quadraticCurveTo(-7.2, -2.8, -4.4, -3.2);
    c.closePath();
  }, S);
  part(ctx, pass, blob([-6.6, 0.3, -7.2, -4.8, -4.4, -9.6, -0.6, -13.8, 2.2, -14.4, 4.4 + pose.heave, -11.0, 4.8 + pose.heave, -5.8, 4.6, 0.3]), S);
  part(ctx, pass, blob([2.6, -12.8, 4.1 + pose.heave, -10.8, 4.3 + pose.heave, -5.6, 3.7, -1.2, 3.1, -6.4, 2.5, -10.4]), K.accent, false);
}
function headD(ctx, pass, K, h) {
  const S = K.silhouette;
  ctx.rotate(h.rot);
  // The ears lie back and shorten as the head goes up, so the howl stays one shape:
  // the snout is the only spike.
  const up = Math.max(0, Math.min(1, -h.rot / 0.95));
  ctx.save();
  ctx.translate(0.4, -3.0);
  ctx.rotate(-0.45 * up);
  ctx.scale(1, 1 - 0.28 * up);
  ctx.translate(-0.4, 3.0);
  part(ctx, pass, poly([-1.6, -2.4, -1.4 - h.flick * 2, -8.8, 0.6, -3.0]), S);
  part(ctx, pass, poly([0.2, -3.0, 1.4, -8.6, 2.4, -2.6]), S);
  ctx.restore();
  part(ctx, pass, (c) => {
    c.moveTo(-2.2, 0.9);
    c.quadraticCurveTo(-3.4, -2.6, 0.0, -3.4);
    c.lineTo(2.4, -3.0);
    c.lineTo(3.0, -2.3);
    c.lineTo(6.8, -0.8);
    c.lineTo(3.4, -0.1);
    c.lineTo(1.4, 0.4);
    c.quadraticCurveTo(-0.4, 1.8, -2.2, 0.9);
    c.closePath();
  }, S);
  ctx.save();
  ctx.translate(1.6, 0.2);
  ctx.rotate(h.jaw * 0.75);
  part(ctx, pass, poly([-0.4, -0.3, 4.8, -0.9, 1.8, 0.7, -0.6, 1.0]), S);
  ctx.restore();
  part(ctx, pass, oval(1.6, -1.7, 0.85, h.eye === 'shut' ? 0.1 : 0.26, -0.2), K.accent, false);
}
const MODEL_D = {
  body: bodyD, head: headD, headSit: [2.6, -13.4], ringReach: 7.4, modes: ['howl'],
  print: (ctx, K, fn) => {
    plate(ctx, K.accent, [-0.9, 0.75], 0, fn);
    fn('paint');
  },
};

// ================================================================== E PAPER PORT
// The shipped paper coyote's own geometry (drawDesertCoyote and its helpers in
// desertLandmarks.js), every curve and pivot, in the MCM coyote's flat colours with the
// hugging contour. The safe option: the one Peter loves, in this print.
const E_TORSO = [[-6.4, -4, -5.4, -10, 0.8, -13.2, 4.4, -10.4, 4.6, -5, 2.8, -1, -3, -0.4],
  [-6.6, -3.2, -3, -6.8, 4.4, -6.6, 8.0, -4.8, 8.6, -2.0, 6.6, -0.3, -3, -0.2]];
const E_CHEST = [[4.4, -10.4, 5, -5.6, 3.2, -1.2, 1.8, -1.2, 3.2, -6, 2.4, -10.6],
  [8.0, -4.8, 8.8, -2.4, 6.8, -0.5, 5.4, -0.5, 7.0, -2.6, 6.4, -5.2]];
const E_BACKLIT = [[-5.6, -7.2, -3.6, -11.4, 0.8, -13.2, 1.4, -12.4, -3, -10.6, -5.2, -6.2],
  [-6, -5, -2, -7.2, 4.4, -6.6, 4.6, -5.9, -2, -6.4, -5.8, -4.3]];
const eCurve = (Q, h) => (c) => {
  c.moveTo(Q[0] + h, Q[1]);
  c.quadraticCurveTo(Q[2] + h, Q[3], Q[4], Q[5]);
  c.lineTo(Q[6], Q[7]);
  c.quadraticCurveTo(Q[8], Q[9], Q[10], Q[11]);
  c.closePath();
};
function bodyE(ctx, pass, K, pose) {
  const k = pose.lie;
  const h = pose.heave;
  const tw = pose.tw;
  const lit = mix(K.coat, K.cream, 0.45);
  part(ctx, pass, (c) => { c.moveTo(-6, -1.6); c.quadraticCurveTo(-8.6, 0.4, -4.6, 0.6); c.quadraticCurveTo(1, 0.9, 5.4 + tw, -0.4); c.quadraticCurveTo(1.4, -1.4, -2.8, -1.8); c.closePath(); }, K.coat);
  part(ctx, pass, (c) => { c.moveTo(3.6 + tw * 0.6, 0.6); c.quadraticCurveTo(5.4 + tw, 0.2, 5.4 + tw, -0.4); c.quadraticCurveTo(4.2, -0.9, 3.2, -0.6); c.closePath(); }, K.tip);
  part(ctx, pass, oval(-3, lerp(-3.6, -2.8, k), lerp(4.6, 4.8, k), lerp(3.8, 3.0, k)), K.coat);
  part(ctx, pass, (c) => { c.ellipse(-3.6, lerp(-2.6, -2.1, k), 3.6, lerp(2.6, 2.0, k), 0, 0.4 * Math.PI, 1.3 * Math.PI); c.closePath(); }, K.dark, false);
  const T = lerpPts(E_TORSO[0], E_TORSO[1], k);
  part(ctx, pass, (c) => { c.moveTo(T[0], T[1]); c.quadraticCurveTo(T[2], T[3], T[4], T[5]); c.lineTo(T[6] + h, T[7]); c.quadraticCurveTo(T[8] + h, T[9], T[10], T[11]); c.lineTo(T[12], T[13]); c.closePath(); }, K.coat);
  part(ctx, pass, eCurve(lerpPts(E_CHEST[0], E_CHEST[1], k), h), K.cream, false);
  part(ctx, pass, eCurve(lerpPts(E_BACKLIT[0], E_BACKLIT[1], k), 0), lit, false);
  for (const lx of [1.6, 3.2]) {
    ctx.save();
    ctx.translate(lerp(lx, lx + 3.6, k), lerp(-8, -1.9, k));
    ctx.rotate(lerp(0, -Math.PI / 2, k));
    part(ctx, pass, (c) => c.roundRect(-0.7, 0, 1.4, lerp(8, 6.6, k), 0.5), lx > 2 ? K.coat : K.dark);
    ctx.restore();
    part(ctx, pass, oval(lerp(lx + 0.2, lx + 10.3, k), lerp(-0.3, -0.55, k), lerp(1, 1.15, k), 0.5), K.cream);
  }
}
function headE(ctx, pass, K, h) {
  const lit = mix(K.coat, K.cream, 0.45);
  ctx.rotate(h.rot);
  part(ctx, pass, oval(0.6, -1.3, 2.6, 2.2, -0.1), K.coat);
  for (const [ex, rot0, far] of [[-0.6, -0.25 - h.flick, true], [0.9, 0.05, false]]) {
    const rot = rot0 - h.earBack * 0.95;
    const L = 1 - h.earBack * 0.25;
    part(ctx, pass, poly([ex - 1.1, -2.6, ex + Math.sin(rot) * 3.4 * L, -2.6 - Math.cos(rot) * 3.6 * L, ex + 1.1, -2.8]), far ? K.dark : K.coat);
    if (!far) part(ctx, pass, poly([ex - 0.5, -2.9, ex + Math.sin(rot) * 2.6 * L, -2.8 - Math.cos(rot) * 2.8 * L, ex + 0.5, -3]), K.ear, false);
  }
  const jaw = h.jaw;
  if (jaw > 0.05) {
    const jx = 2.2 + Math.cos(jaw) * 4.1 - Math.sin(jaw) * 0.55;
    const jy = -0.8 + Math.sin(jaw) * 4.1 + Math.cos(jaw) * 0.55;
    part(ctx, pass, poly([2.3, -0.3, 6.8, -0.6, jx, jy]), K.mouth);
  }
  ctx.save();
  ctx.translate(2.2, -0.8);
  ctx.rotate(jaw);
  if (h.tongue > 0.02) part(ctx, pass, oval(2.6, -0.25, 1.7 * h.tongue, 0.45, -0.1), K.tongue, false);
  part(ctx, pass, poly([0, 0.1, 4.3, 0.2, 4.1, 1.0, 0, 1.4]), K.cream);
  ctx.restore();
  part(ctx, pass, poly([1.6, -2.8, 6.9, -1.35, 7.0, -0.25, 2.0, 0.35]), K.coat);
  part(ctx, pass, poly([1.6, -2.8, 6.9, -1.35, 6.7, -1.0, 1.8, -2.2]), lit, false);
  part(ctx, pass, oval(6.9, -0.95, 0.6, 0.6), K.nose, false);
  if (h.eye === 'shut') {
    line(ctx, pass, K.eye, 0.35, (c) => { c.moveTo(1.2, -2.2); c.lineTo(2.4, -1.8); });
  } else {
    part(ctx, pass, oval(1.9, -1.9, 0.42, 0.42), K.eye, false);
    part(ctx, pass, oval(2.05, -2.0, 0.14, 0.14), '#f6d98a', false);
    lids(ctx, pass, K, h, 1.9, -1.9, 0.55, 0.55, 0);
  }
}
const MODEL_E = {
  body: bodyE, head: headE, headSit: [2.6, -12.6], headLie: [9.0, -3.2],
  ringReach: 7.4, modes: MCM_COYOTE_MODES, wink: winkShow,
};

// ================================================================== F GOLDEN BOOK
// A friendlier 1950s picture-book coyote cut from card: grizzled grey-tan with rusty
// legs, a scalloped cream cheek ruff and bib, a moderate muzzle with a clear stop, a
// big round eye with a highlight, a smile, and a fat brush of a tail with a black tip
// (a fox's would be white) curled round the front of the paws. Card-cut: a pale card
// rim round the whole figure and a soft shadow behind it, no ink.
function tonesF(K) {
  return {
    coat: mix(K.coat, '#9c948b', 0.38),
    back: mix(K.back, '#6c645d', 0.35),
    rust: mix(K.coat, '#b4562e', 0.45),
    tail: mix(mix(K.coat, '#9c948b', 0.38), K.back, 0.3),
    rustDark: mix(K.dark, '#8e4428', 0.45),
  };
}
function bodyF(ctx, pass, K, pose) {
  const F = tonesF(K);
  const h = pose.heave;
  const tw = pose.tw;
  part(ctx, pass, oval(-3.2, -4.2, 5.0, 4.6), F.coat);
  part(ctx, pass, blob([-7.4, -3.2, -6.0, -9.6, -1.2, -14.0, 2.8, -14.2, 5.2 + h, -10.4, 5.0 + h, -4.6, 3.6, -0.4, -4.6, -0.2]), F.coat);
  part(ctx, pass, blob([-7.2, -4.0, -5.6, -9.6, -1.2, -13.8, 0.8, -13.6, -2.6, -10.6, -4.6, -6.4, -5.4, -3.2]), F.back, false);
  part(ctx, pass, blob([2.0, -13.4, 4.8 + h, -11.2, 5.3 + h, -7.2, 4.2, -3.4, 2.6, -5.2, 1.4, -9.2]), K.cream, false);
  // The brush: in front of the haunch, round to the front of the paws, a cream fringe
  // under it and a black tip clear of them.
  part(ctx, pass, blob([-7.8, -3.0, -9.8, -0.6, -6.0, 1.0, 0.0, 1.3, 5.0, 1.1, 7.8 + tw, -0.4, 5.8, -1.9, 1.0, -1.7, -4.0, -2.3, -6.4, -4.8]), F.tail);
  part(ctx, pass, blob([-8.8, -1.2, -6.0, 1.0, 0.0, 1.3, 4.4, 1.0, 0.0, 0.5, -5.8, 0.1]), K.cream, false);
  part(ctx, pass, blob([4.6, 1.0, 7.8 + tw, -0.4, 6.2, -1.9, 4.6, -1.3]), K.tip, false);
  part(ctx, pass, (c) => c.roundRect(1.5, -8.8, 1.5, 8.6, 0.7), F.rustDark);
  part(ctx, pass, (c) => c.roundRect(3.2, -8.8, 1.5, 8.6, 0.7), F.rust);
  part(ctx, pass, oval(2.3, -0.4, 1.1, 0.6), K.cream);
  part(ctx, pass, oval(4.1, -0.4, 1.1, 0.6), K.cream);
}
function headF(ctx, pass, K, h) {
  const F = tonesF(K);
  ctx.rotate(h.rot);
  ear(ctx, pass, -1.8, -2.4, 0.3, -3.4, 5.9, -0.18 - h.flick - h.earBack * 0.9, F.back);
  ear(ctx, pass, 0.1, -3.4, 2.6, -3.0, 6.0, 0.02 - h.earBack * 0.9, F.coat, F.rust);
  // The scalloped ruff behind the cheek.
  const R = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (0.18 + (k / 10) * 1.02);
    const r = k % 2 ? 2.45 : 3.35;
    R.push(0.2 + Math.cos(a) * r, 0.1 + Math.sin(a) * r);
  }
  R.push(0.4, -0.6);
  part(ctx, pass, blob(R), K.cream);
  jawOpen(ctx, pass, K, h, 2.9, 0.25, 2.9, [5.6, -0.55], K.cream);
  part(ctx, pass, oval(0.5, -1.2, 2.9, 2.6), F.coat);
  part(ctx, pass, poly([2.0, -2.9, 3.0, -2.2, 5.2, -1.55, 5.95, -1.05, 5.8, -0.5, 3.4, 0.3, 2.0, -0.4]), F.coat);
  part(ctx, pass, poly([2.6, -0.95, 5.7, -0.62, 5.2, -0.1, 3.3, 0.8, 2.0, 0.45]), K.cream, false);
  part(ctx, pass, oval(5.72, -1.02, 0.62, 0.5), K.nose, false);
  part(ctx, pass, oval(5.55, -1.2, 0.17, 0.11), '#ffffff', false);
  if (h.eye === 'shut') {
    line(ctx, pass, K.eye, 0.38, (c) => { c.moveTo(1.1, -1.5); c.quadraticCurveTo(1.9, -2.3, 2.8, -1.5); });
  } else {
    part(ctx, pass, oval(1.85, -1.7, 0.85, 0.9), K.cream, false);
    part(ctx, pass, oval(2.05, -1.62, 0.56, 0.62), K.eye, false);
    part(ctx, pass, oval(2.25, -1.9, 0.18, 0.18), '#ffffff', false);
  }
  line(ctx, pass, F.back, 0.34, (c) => { c.moveTo(0.9, -2.95); c.quadraticCurveTo(1.8, -3.5, 2.7, -3.1); });
  if (h.jaw <= 0.05) line(ctx, pass, K.dark, 0.3, (c) => { c.moveTo(3.4, 0.25); c.quadraticCurveTo(4.2, 0.55, 4.9, 0.05); });
}
const MODEL_F = {
  body: bodyF, head: headF, headSit: [3.0, -13.8], ringReach: 6.6, modes: ['howl'],
  print: (ctx, K, fn) => {
    plate(ctx, 'rgba(40,20,20,0.26)', [1.1, 0.9], 0.3, fn);
    plate(ctx, K.card, [0, 0], 0.75, fn);
    fn('paint');
  },
};

// ================================================================== the list
const model = (M) => (ctx, t, x, ledgeTop, facing, K, opts) => drawCoyoteModel(ctx, t, x, ledgeTop, facing, K, M, opts);

export const COYOTE_CANDIDATES = [
  {
    id: 'current', name: '0 CURRENT', draw: drawMcmCoyote,
    note: 'The first re-cut, as it is: the paper coyote\'s seat and shows in flat angular shapes with one slipped ink '
      + 'contour. Peter: "looks a bit like an aardvark" — the snout is long and droops, the ears sit back on a neck.',
  },
  {
    id: 'reproportioned', name: 'A RE-PROPORTIONED', draw: model(MODEL_A),
    note: 'The control\'s hand with the head fixed: a brow and a stop, a muzzle a third shorter with a slight upturn '
      + 'and a jaw, tall ears up on the crown and close together, a jagged throat and cheek ruff, a narrow lidded eye. '
      + 'Sits, howls, dozes, sings with the pup and winks.',
  },
  {
    id: 'chuck-jones', name: 'B CHUCK JONES', draw: model(MODEL_B),
    note: 'The Maurice Noble-era Wile E. read: scrawny and tall with a slight hunch, a big cranium, enormous ears, a '
      + 'pointed snout with a black nose, heavy sly lids, a scraggly chest tuft, stick arms, a bony tail with a bushy tip.',
  },
  {
    id: 'charley-harper', name: 'C CHARLEY HARPER', draw: model(MODEL_C),
    note: 'Geometric and lineless: a half-disc haunch, a wedge body split light and dark, bar legs, a tail as one '
      + 'tapered wedge with a black tip, and a crisp symmetric triangle head with a dot eye; the howl hinges the jaw open.',
  },
  {
    id: 'blair-silhouette', name: 'D BLAIR / UPA SILHOUETTE', draw: model(MODEL_D),
    note: 'One bold sitting mass in a single deep colour — pear body, sharp snout, pointed ears, a flame of a tail — '
      + 'with one accent (a chest crescent, the eye slit) and an accent plate slipped out from under it. Reads by shape.',
  },
  {
    id: 'paper-port', name: 'E PAPER PORT', draw: model(MODEL_E),
    note: 'The shipped paper coyote\'s exact geometry — every curve, pivot and show — in flat MCM colours with the '
      + 'hugging contour. The safe option, closest to the one Peter loves. Sits, howls, dozes, sings with the pup and winks.',
  },
  {
    id: 'golden-book', name: 'F GOLDEN BOOK', draw: model(MODEL_F),
    note: 'A friendlier 1950s picture-book coyote cut from card: grizzled grey-tan, rusty legs, a scalloped cheek ruff, '
      + 'a big round eye and a smile, a fat brush tail with a black tip round the paws; a pale card rim, a soft shadow, no ink.',
  },
];

// ================================================================== the close-up
// A 480x270 tile: the candidate on its ledge twice at ~3x — SUNSET on the left facing
// right, MIDDAY on the right facing left — over a scrap of each palette's sky and
// hills. It runs the howl on the shipped 5 s clock: t=0 sits, t≈3 howls.
export function drawCoyoteCloseUp(ctx, t, cand, w = 480, h = 270) {
  const half = w / 2;
  const Z = 3 * (w / 480);
  [['sunset', 1], ['midday', -1]].forEach(([id, facing], i) => {
    const pal = MCM_PALETTES[id];
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * half, 0, half, h);
    ctx.clip();
    ctx.translate(i * half + half / 2, h * 0.72);
    ctx.scale(Z, Z);
    const X = half / 2 / Z + 4;
    const top = -h * 0.72 / Z - 4;
    ctx.fillStyle = pal.sky[3];
    ctx.fillRect(-X, top, X * 2, 80);
    ctx.fillStyle = pal.sky[4];
    ctx.fillRect(-X, -36, X * 2, 60);
    // A middle hill behind, and the near dune the ledge stands on.
    ctx.beginPath();
    ctx.moveTo(-X, 40);
    ctx.lineTo(-X, -6);
    ctx.quadraticCurveTo(-X * 0.3, -30, X * 0.4, -18);
    ctx.quadraticCurveTo(X * 0.8, -12, X, -14);
    ctx.lineTo(X, 40);
    ctx.closePath();
    ctx.fillStyle = pal.mid.fill;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-X, 40);
    ctx.lineTo(-X, 9);
    ctx.quadraticCurveTo(0, -3, X, 9);
    ctx.lineTo(X, 40);
    ctx.closePath();
    ctx.fillStyle = pal.near.fill;
    ctx.fill();
    drawCoyoteLedge(ctx, 0, 0, id);
    cand.draw(ctx, t, 0, -12.4, facing, pal.coyote, { mode: 'howl' });
    ctx.restore();
  });
}
