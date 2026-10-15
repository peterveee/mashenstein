// CORPORATE KOMBAT — the zombie clerk SIDE ON, for the fire-exit queue (lab). Peter, 15 Oct 2026:
// floor 23's evacuation queue walks right along the back wall, everyone drawn side on (room.js
// walkerSide), and the two zombies in it — first the crypt's own drawing (front / three-quarter, so
// it shuffled sideways), then recoloured office workers, which he turned down: "i meant the new
// style zombie not zombies in the style of the workers". So: the SAME clerk — the crypt's drawing
// as officeLigne/zombies.js drawOfficeZombie puts it in the office (its green skin, heavy-lidded red
// eye, slack jaw and blunt tooth, stitched scalp, glasses, blue suit, cream shirt, orange tie, badge,
// briefcase; the pink temp's raspberry suit, teal tie, auburn hair and mug; its soft cast outline, the
// office's ink, rims and SOFT colours; ZOMBIE_SHAPE's proportions) turned to profile, walking right.
//
// Nothing here is wired into the game. Candidates vary how the profile is got and how it shambles:
//   A  full profile, one arm out — the crypt's own step-and-drag gait, turned
//   B  stooped, both arms out, the briefcase dangling from one outstretched hand
//   C  the crypt's own body kept as drawn, only the head and the feet turned (the least redraw)
//   D  the stiff leg — one leg never bends, the hip hitches over it, the body rocks
//   E  the plod — arms down, briefcase at its side, head hung: in the queue like everyone else
// Each in both outfits. The painter works in the crypt drawing's own units (crypt-enemies.js
// drawCryptZombie: feet at 0, about 116 tall as authored) already stretched to ZOMBIE_SHAPE, so its
// line weights, limb widths and head are the crypt's at the office's proportions.
import { drawCryptZombie, CRYPT_ART_STYLES } from '../sprites/crypt-enemies.js';
import { softColour, zombieHeightOf, ZOMBIE_SHAPE, TEMP_OUTFIT } from '../engine/stylePacks/officeLigne/zombies.js';
import { canvas, PAL } from '../engine/stylePacks/officeLigne/line.js';
import { walkerSide, personFor, OFFICE_SHIRTS, OFFICE_HAIRS, OFFICE_SKINS } from '../engine/stylePacks/officeLigne/room.js';
import { setOfficeMidExtra } from '../engine/stylePacks/officeLigne/index.js';
import { WALL_BASE, FACTORS, OFFICE_ZOOM } from '../engine/stylePacks/officeClimb.js';
import { OFFICE_CORRIDORS, officeFireExitBay } from '../engine/stylePacks/officeLigne/progression.js';
import { drawOfficeProductionScene } from './office-production.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { totalDistFor, BASE_SPEED } from '../game/layout.js';

const TAU = Math.PI * 2;
const ease = (v) => v * v * (3 - 2 * v);
const BLUE = null;                     // the clerk as drawn
export const PROFILE_OUTFITS = [['BLUE', BLUE], ['PINK', TEMP_OUTFIT]];

// crypt-enemies.js painter(), the same helpers (not exported there)
function painter(c, s) {
  const M = s.map || ((x) => x);
  const path = (fill, fn, w = s.edge) => { c.beginPath(); fn(c); c.fillStyle = M(fill); c.fill(); if (w) { c.strokeStyle = M(s.ink); c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); } };
  const poly = (fill, points, w) => path(fill, (p) => { points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); }, w);
  const oval = (fill, x, y, rx, ry, w) => path(fill, (p) => p.ellipse(x, y, rx, ry, 0, 0, TAU), w);
  const box = (fill, x, y, w, h, r = 4, ow) => path(fill, (p) => p.roundRect(x, y, w, h, r), ow);
  const line = (fill, w, points) => { c.beginPath(); points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = M(fill); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); };
  const limb = (fill, w, points) => { line(s.ink, w + s.edge * 1.4, points); line(fill, w, points); };
  return { path, poly, oval, box, line, limb };
}

// A two-bone joint from a to b, the bend on the side `pick` prefers (it scores the two candidates):
// a knee always forward, an elbow always down or back — never inside out.
function joint(a, b, L1, L2, pick) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const r = Math.min(d, L1 + L2 - 1e-3);
  const along = (L1 * L1 - L2 * L2 + r * r) / (2 * r), h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
  const ux = dx / d, uy = dy / d, mx = a[0] + ux * along, my = a[1] + uy * along;
  const p1 = [mx - uy * h, my + ux * h], p2 = [mx + uy * h, my - ux * h];
  return pick(p1) >= pick(p2) ? p1 : p2;
}

// THE GAIT, side on. Each foot is planted for part of the cycle (sliding back under the hip at the
// walking speed, so it never skates) and swings forward for the rest. `D` is the ground covered in a
// cycle, in the drawing's units; a cycle is one step of the lead leg and one drag of the other.
function foot(u, { start, swing, center, lift }, D) {
  const v = ((u - start) % 1 + 1) % 1, half = D * (1 - swing) / 2;
  if (v < swing) {
    const e = ease(v / swing);
    return { x: center - half + 2 * half * e, lift: Math.sin(Math.PI * v / swing) * lift, swing: v / swing, up: true };
  }
  return { x: center + half - 2 * half * (v - swing) / (1 - swing), lift: 0, swing: 0, up: false };
}

// The shaped skeleton (ZOMBIE_SHAPE: legs 1.43, torso 1.15, head 0.68), in the drawing's units.
const ANKLE = -6, HIP = -49, THIGH = 23.5, SHIN = 23, NECK = -38, SHOULDER = -33;
const HEAD = ZOMBIE_SHAPE.head;

export const PROFILE_CANDIDATES = [
  { id: 'A', letter: 'A', name: 'full profile, one arm out',
    note: 'The clerk turned whole: profile head (one heavy-lidded red eye, the slack jaw and its tooth, the stitched scalp, the glasses side on), the suit seen from the side with the shirt, tie and badge at the front. The near arm out ahead at shoulder height, hand drooping; the briefcase in the far hand. The crypt’s own shamble, turned: the near leg steps, the far leg drags its toe to catch up, the body dips as the weight lands.',
    lean: 0.1, jut: 3, loll: 0.12, near: 'reach', far: 'case', D: 30,
    lead: { start: 0, swing: 0.32, center: 4, lift: 6 }, drag: { start: 0.5, swing: 0.4, center: -3, lift: 0.8, scuff: true } },
  { id: 'B', letter: 'B', name: 'stooped, both arms out, briefcase dangling',
    note: 'A bent at the waist, both arms out — the classic zombie walk — head pushed forward and up to see where it is going, and the briefcase (or mug) still held in the far hand, swinging under it. The same step-and-drag, the body bobbing deeper.',
    lean: 0.3, jut: 5, loll: -0.12, near: 'reach', far: 'reachCase', D: 28, bob: 1.5,
    lead: { start: 0, swing: 0.32, center: 6, lift: 6 }, drag: { start: 0.5, swing: 0.42, center: -2, lift: 0.6, scuff: true } },
  { id: 'C', letter: 'C', name: 'the crypt’s body as drawn, head and feet turned',
    note: 'The least redraw: drawCryptZombie’s own suit, reaching arm and briefcase exactly as the office draws them (mirrored to face right), with only the head turned to profile and the legs given a profile step-and-drag with shoes that point the way it walks.',
    tweak: true, D: 30,
    lead: { start: 0, swing: 0.32, center: 4, lift: 6 }, drag: { start: 0.5, swing: 0.4, center: -3, lift: 0.8, scuff: true } },
  { id: 'D', letter: 'D', name: 'the stiff leg',
    note: 'Full profile, one arm out, but the far leg never bends: the zombie vaults over it, the hip rising and falling and the whole body rocking forward and back each step, the stiff foot scraping round to catch up.',
    lean: 0.08, jut: 3, loll: 0.14, near: 'reach', far: 'case', D: 32, stiff: true, rock: 0.09,
    lead: { start: 0, swing: 0.34, center: 5, lift: 7 }, drag: { start: 0.52, swing: 0.4, center: -5, lift: 0, scuff: true } },
  { id: 'E', letter: 'E', name: 'the plod — arms down, head hung',
    note: 'Queuing like everyone else: arms down, the briefcase (or mug) in the near hand, the head hung forward on its neck, an even, slow, flat-footed walk with the feet barely lifting. Only the face and the green give it away.',
    lean: 0.06, jut: 6, loll: 0.36, near: 'case', far: 'hang', D: 26, even: true,
    lead: { start: 0, swing: 0.4, center: 2, lift: 3 }, drag: { start: 0.5, swing: 0.4, center: 0, lift: 3 } },
];
export const PROFILE_BY_ID = Object.fromEntries(PROFILE_CANDIDATES.map((c) => [c.id, c]));

// ---------------------------------------------------------------- the profile clerk
// feet at 0, facing right (+x); `u` the gait phase (0..1)
function drawProfileClerk(c, t, s, cand, u, O) {
  const { path, poly, oval, box, line, limb } = painter(c, s);
  const cloth = O.cloth || '#4797c3', dark = O.dark || '#326594', shoes = '#554061';
  const lead = foot(u, cand.lead, cand.D), drag = foot(u, cand.drag, cand.D);
  // the weight lands on the lead foot: the body dips, then rises as the other drags through
  const landAt = cand.lead.start + cand.lead.swing;
  const lv = ((u - landAt) % 1 + 1) % 1;
  const land = lv < 0.3 ? Math.sin(Math.PI * lv / 0.3) : 0;
  let hipY = HIP + (cand.bob ?? 1.2) * land - 0.25 * lead.lift;
  if (cand.even) hipY = HIP + 0.8 * Math.abs(Math.sin(u * TAU));
  let rock = 0;
  if (cand.stiff) {
    // the stiff leg sets the hip: as straight as the leg is long, over the planted foot
    const L = THIGH + SHIN - 1.5;
    hipY = ANKLE - Math.sqrt(Math.max(0, L * L - drag.x * drag.x)) + 0.6 * land;
    rock = cand.rock * (drag.x / 12);
  }
  const hipX = -1.2 * land;
  const hip = [hipX, hipY];
  const tilt = (cand.lean || 0) + rock + 0.025 * Math.sin(u * TAU - 0.5);

  // a leg: hip -> knee (always forward) -> ankle, then its shoe, toe ahead
  const leg = (f, col, stiff) => {
    const ankle = [f.x, ANKLE - f.lift];
    const knee = stiff ? [(hip[0] + ankle[0]) / 2, (hip[1] + ankle[1]) / 2] : joint(hip, ankle, THIGH, SHIN, (p) => p[0]);
    limb(col, 11, [hip, knee, ankle]);
    c.save(); c.translate(ankle[0], ankle[1]);
    // the dragged foot scuffs toe down; the stepping foot lifts its toe as it swings
    let a = 0;
    if (f.up && f === drag && cand.drag.scuff) a = 0.32 * Math.sin(Math.PI * f.swing);
    else if (f.up) a = -0.22 * Math.sin(Math.PI * f.swing);
    c.rotate(a);
    box(shoes, -7, -3, 21, 9, 4);
    line('#c5b5d0', 1.5, [[-4, 3], [11, 3]]);
    c.restore();
  };

  // the torso's own frame: origin at the hip, rotated by the lean
  const T = (x, y) => [hip[0] + x * Math.cos(tilt) - y * Math.sin(tilt), hip[1] + x * Math.sin(tilt) + y * Math.cos(tilt)];
  const shoulder = T(0, SHOULDER);
  const armBob = 1.4 * land + 1.1 * Math.sin(u * TAU + 1);

  // hands: where each arm's hand goes, in the drawing's frame
  const hand = (kind, near) => {
    const sw = Math.sin(u * TAU + (near ? 0 : Math.PI));
    if (kind === 'reach') return [shoulder[0] + 30, shoulder[1] + 4 + armBob + (near ? 0 : -1.5)];
    if (kind === 'reachCase') return [shoulder[0] + 28, shoulder[1] + 6 + armBob * 0.8];
    if (kind === 'case') return [shoulder[0] + (near ? 5 : -9) + 1.5 * sw, shoulder[1] + 31];
    return [shoulder[0] + 1 + 2.5 * sw, shoulder[1] + 31];              // hang
  };
  const arm = (kind, near, col) => {
    const h = hand(kind, near);
    const sh = near ? shoulder : [shoulder[0] - 1.5, shoulder[1] - 0.5];
    // a reaching arm bends its elbow down; a hanging one bends it back
    const el = joint(sh, h, 17, 17, kind.startsWith('reach') ? (p) => p[1] : (p) => -p[0]);
    limb(col, 8, [sh, el, h]);
    return h;
  };
  const handOval = (h, col, reach) => {
    oval(col, h[0] + (reach ? 3 : 0), h[1] + (reach ? 1 : 1), reach ? 6 : 5, reach ? 5 : 5.5);
    if (reach) for (let i = 0; i < 2; i++) line(s.shade, 1.2, [[h[0] + 2 + i * 4, h[1] + 1], [h[0] + 2 + i * 4, h[1] + 5]]);
  };
  const carry = (h, swingA) => {
    c.save(); c.translate(h[0], h[1]);
    if (O.carry === 'mug') {
      // the mug upright in the hand, its handle to the back
      path('rgba(0,0,0,0)', (p) => p.ellipse(-6, -4, 3.5, 4, 0, 0, TAU));
      box('#f6efe2', -6, -10, 12, 13, 2); box('#e8708f', -6, -5, 12, 3, 0, 0);
      oval('#6b4529', 0, -10, 5.6, 1.6, 0.8);
    } else {
      c.rotate(swingA);
      line('#715044', 2, [[-4, 3], [-4, -1], [4, -1], [4, 3]]);
      box('#a86a42', -10, 3, 20, 17, 3); line('#e3ad70', 1.5, [[-6, 7], [6, 7]]);
    }
    c.restore();
  };

  // ---- far side
  const farCol = dark;
  let farHand = null;
  if (cand.far) {
    farHand = arm(cand.far, false, farCol);
    handOval(farHand, s.shade, cand.far.startsWith('reach'));
  }
  if (cand.far === 'case' || cand.far === 'reachCase') carry(farHand, 0.18 * Math.sin(u * TAU + 0.7) - (cand.far === 'case' ? 0 : 0));
  leg(drag, dark, !!cand.stiff);
  leg(lead, cloth, false);

  // ---- the jacket, side on
  c.save(); c.translate(hip[0], hip[1]); c.rotate(tilt);
  path(cloth, (p) => {
    p.moveTo(-13, -35);
    p.bezierCurveTo(-18, -26, -17, -8, -15.5, 6);
    p.quadraticCurveTo(0, 9, 15, 5);
    p.bezierCurveTo(18, -6, 18, -24, 14, -34);
    p.quadraticCurveTo(7, -42, -3, -41.5);
    p.quadraticCurveTo(-10, -41, -13, -35);
    p.closePath();
  });
  poly(dark, [[-12.5, -34], [-7, -38.5], [-9, -12], [-8.5, 6], [-15, 6], [-16.2, -10], [-16, -27]], 0);
  poly('#fff0cb', [[7, -40], [14.6, -34], [14, -23]], 0);
  poly(dark, [[5, -40.5], [11.5, -31], [10, -21], [5.5, -30]], 0.8);
  box('#fff2d5', 1, -29, 7, 8, 1, 1); box('#e49a60', 2.5, -27, 4, 2.5, 0, 0);
  for (let i = 0; i < 2; i++) oval('#f5dda0', 16, -15 + i * 7, 1.3, 1.3, 0);
  c.restore();
  // the tie hangs from the collar, plumb, whatever the lean
  const collar = T(13.5, -35);
  c.save(); c.translate(collar[0], collar[1]); c.rotate(0.06 * Math.sin(u * TAU - 1));
  poly(O.tie || '#f18765', [[-1.8, 0], [1.8, 0], [2.2, 7], [1.2, 15], [-0.6, 17.5], [-2.2, 8]], 1);
  c.restore();

  // ---- neck and head
  const neckBase = T(3, NECK);
  const neck = [neckBase[0] + (cand.jut || 0), neckBase[1] - 2 + 0.4 * land];
  limb(s.shade, 8, [neckBase, neck]);
  const loll = (cand.loll || 0) + 0.06 * Math.sin((u - 0.2) * TAU);
  drawProfileHead(c, t, s, neck, loll, O, painter(c, s));

  // ---- near side
  if (cand.near) {
    const h = arm(cand.near, true, cloth);
    if (cand.near === 'case') carry(h, 0.12 * Math.sin(u * TAU));
    handOval(h, s.skin, cand.near.startsWith('reach'));
  }
}

// The head side on, facing right, neck at `neck`. Drawn in the crypt's own head units (its head is
// about 44 tall, the face about 40 across) and scaled as ZOMBIE_SHAPE scales it.
function drawProfileHead(c, t, s, neck, loll, O, { path, oval, box, line }) {
  c.save(); c.translate(neck[0], neck[1]); c.rotate(loll); c.scale(HEAD, HEAD);
  // the ear (the crypt draws it as a shade oval at the side of the head)
  path(s.skin, (p) => {
    p.moveTo(-4, 0);
    p.bezierCurveTo(-20, -6, -23, -33, -9, -42);
    p.bezierCurveTo(3, -50, 20, -46, 21.5, -34);
    p.lineTo(22, -28);
    p.lineTo(27.5, -21);                       // the nose
    p.lineTo(22.5, -18.5);
    p.quadraticCurveTo(22, -12, 23, -8);       // the open jaw's upper lip
    p.lineTo(20, -2);
    p.quadraticCurveTo(10, 3, -4, 0);          // the jaw back to the nape
    p.closePath();
  });
  oval(s.shade, -5, -21, 4.5, 6.5);
  oval(s.shade, 7, -9, 8, 5, 0);               // the shade under the cheek
  // the eye: one, side on, heavy lid, small red pupil looking at nothing
  const blinkPhase = ((t + 0.31) % 4.1 + 4.1) % 4.1, blink = Math.max(0, 1 - Math.abs(blinkPhase - 3.88) / 0.11);
  const eyeY = -26, open = 1 - 0.92 * blink;
  oval('#fff4ce', 15, eyeY, 5, 7.5 * open, 0.8);
  oval('#c65458', 17.5, eyeY + 2, 1.4, 2 * open, 0);
  box(s.skin, 9, eyeY - 9, 13, 8.5, 1, 0);
  line(s.shade, 1.6, [[9.5, eyeY], [20, eyeY]]);
  // the slack mouth, open at the front, one blunt tooth
  box('#654254', 15, -14, 9, 9 + Math.sin(t * 2) * 0.7, 3, 0);
  box('#fff1cd', 19, -14, 3.5, 3, 1, 0);
  // the stitched scar, across the temple
  line('#6e9d52', 1.3, [[-2, -38], [9, -35]]);
  for (let i = 0; i < 3; i++) line('#f0ecae', 1, [[0 + i * 3.5, -39.5 + i], [0 + i * 3.5, -35.5 + i]]);
  // the hair: the clerk's side part, seen from the side
  path(O.hair || '#596e7c', (p) => {
    p.moveTo(14, -41);
    p.lineTo(19, -46);
    p.quadraticCurveTo(6, -52, -8, -45);
    p.quadraticCurveTo(-21, -38, -19, -24);
    p.lineTo(-13, -27);
    p.lineTo(-11, -33);
    p.quadraticCurveTo(-2, -41, 8, -37);
    p.closePath();
  });
  if (O.glasses !== false) {
    box('rgba(255,255,255,.08)', 10, -32, 13, 12, 3, 1.4);
    line('#80555b', 1.6, [[10, -28], [-2, -25]]);
  }
  c.restore();
}

// ---------------------------------------------------------------- C: the crypt's body, turned head and feet
// drawCryptZombie's sway/land/dip for the same phase (its own maths), so the turned parts follow it.
function cryptBody(u) {
  const SW = 0.42, land = u >= SW && u < SW + 0.3 ? Math.sin(Math.PI * (u - SW) / 0.3) : 0;
  const v = u < SW ? Math.sin(Math.PI * u / SW) * 5 : 0;
  return { land, dip: 1.8 * land - 0.3 * v, sway: Math.sin(u * TAU - 0.5) };
}
function drawTweakClerk(c, t, s, cand, u, O) {
  const { box, line, limb } = painter(c, s);
  const sh = ZOMBIE_SHAPE, lift = 30 * (sh.legs - 1);
  const B = cryptBody(u);
  // the crypt drawing faces left; mirrored here (and recentred: its body is about x 7..47) so it
  // faces right with its hip near 0
  const bodyDX = -(B.sway * 1.2 - B.land * 1.2), bodyDY = B.dip;
  const hip = [bodyDX, HIP + bodyDY];
  // our legs first, behind the jacket
  const lead = foot(u, cand.lead, cand.D), drag = foot(u, cand.drag, cand.D);
  const leg = (f, col, isDrag) => {
    const ankle = [f.x, ANKLE - f.lift];
    const knee = joint(hip, ankle, THIGH, SHIN, (p) => p[0]);
    limb(col, 11, [hip, knee, ankle]);
    c.save(); c.translate(ankle[0], ankle[1]);
    c.rotate(f.up ? (isDrag ? 0.32 : -0.22) * Math.sin(Math.PI * f.swing) : 0);
    box('#554061', -7, -3, 21, 9, 4); line('#c5b5d0', 1.5, [[-4, 3], [11, 3]]);
    c.restore();
  };
  leg(drag, O.dark || '#326594', true);
  leg(lead, O.cloth || '#4797c3', false);
  // the crypt's own body, clipped above the hips and below the collar (its legs and its front-on
  // head are ours now), the briefcase or mug left whole
  c.save();
  c.scale(-1, 1); c.translate(-27, 0);
  c.beginPath();
  const hem = -30 - lift + 4 + B.dip;
  c.rect(-40, -90 + B.dip, 140, hem + 90 - B.dip);           // the body
  c.rect(46, -45, 26, 33);                             // what the far hand carries
  c.clip();
  drawCryptZombie(c, t, 'clerk', s, { vacant: true, idle: false, phase: u, head: sh.head, legs: sh.legs, torso: sh.torso, arm: sh.arm, outfit: O.cloth ? O : null });
  c.restore();
  // the head turned, on the crypt's neck (x 29 in its frame, mirrored)
  const neckX = -(29 - 27) + bodyDX - 1, neckY = -68 - lift - 38 * (sh.torso - 1) + bodyDY;
  limb(s.shade, 8, [[neckX - 2, neckY + 4], [neckX + 1, neckY - 1]]);
  drawProfileHead(c, t, s, [neckX + 1, neckY - 1], 0.1 + 0.06 * Math.sin((u - 0.2) * TAU), O, painter(c, s));
}

// ---------------------------------------------------------------- the office's look on top
// officeLigne/zombies.js drawOfficeZombie's treatment, step for step: the floor's thin ink, the lit
// rim down the window side and the shade band down the other cut from the figure's own silhouette,
// the colours eased by SOFT. (Its card and rim helpers are private there.)
const LWM = 0.5;
const BOX = { x0: -62, x1: 70, y0: -140, y1: 10 };
const CARDS = new Map();
function card(key, W, H) {
  let cv = CARDS.get(key);
  if (!cv || cv.width !== W || cv.height !== H) { if (CARDS.size > 12) CARDS.clear(); cv = canvas(W, H); CARDS.set(key, cv); }
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  return [cv, g];
}
function rim(src, W, H, key, dx, color) {
  const [r, c] = card(key, W, H);
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out'; c.drawImage(src, dx, 0);
  c.globalCompositeOperation = 'source-over';
  return r;
}
// Ground covered in one gait cycle, in the caller's units, for a figure `h` tall (so a walker can
// set its phase from how far it has gone, and its planted foot holds still on the floor).
export function profileStride(cand, h = ZOMBIE_SHAPE.h) {
  return cand.D * (h / zombieHeightOf('clerk', ZOMBIE_SHAPE)) * (ZOMBIE_SHAPE.slim ?? 1);
}
// One candidate, feet at the origin, facing right, `h` tall; `phase` the gait (cycles; defaults to
// a steady walk on the clock).
export function drawProfileZombie(g, t, id, { outfit = null, h = ZOMBIE_SHAPE.h, phase = null, ink = PAL.open.inkM } = {}) {
  const cand = PROFILE_BY_ID[id];
  const sc = h / zombieHeightOf('clerk', ZOMBIE_SHAPE);
  const base = CRYPT_ART_STYLES[0];
  const style = { ...base, ink, edge: LWM / sc, map: softColour, skin: softColour(base.skin), shade: softColour(base.shade) };
  const u = (((phase ?? t * 0.8) % 1) + 1) % 1;
  const O = outfit || {};
  const paint = (c) => {
    c.scale(sc * (ZOMBIE_SHAPE.slim ?? 1), sc);
    if (cand.tweak) drawTweakClerk(c, t, style, cand, u, O);
    else drawProfileClerk(c, t, style, cand, u, O);
  };
  const m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1;
  const W = Math.ceil((BOX.x1 - BOX.x0) * sc * k) + 2, H = Math.ceil((BOX.y1 - BOX.y0) * sc * k) + 2;
  const [cv, c] = card('fig', W, H);
  c.setTransform(k, 0, 0, k, -BOX.x0 * sc * k, -BOX.y0 * sc * k);
  paint(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const per = h / 51;
  const lit = rim(cv, W, H, 'lit', 0.75 * per * k, softColour('rgba(255,251,242,0.2)'));
  c.globalCompositeOperation = 'source-atop';
  c.drawImage(lit, 0, 0);
  const dark = rim(cv, W, H, 'dark', -2.4 * per * k, softColour('rgba(24,18,36,0.14)'));
  c.drawImage(dark, 0, 0);
  c.globalCompositeOperation = 'source-over';
  g.drawImage(cv, BOX.x0 * sc, BOX.y0 * sc, W / k, H / k);
}

// ---------------------------------------------------------------- in the queue, on floor 23
// The queue as index.js fireExitQueue draws it — at the wall's depth (WALL_BASE), scaled 1.12, 40
// apart, walking 11 a second — here a short stretch of it walking right toward the fire exit, the
// candidate's two zombies among the office's own walkers (walkerSide). Wraps off the left edge.
const EXIT_GAP = 40, EXIT_SPEED = 11, EXIT_SCALE = 1.12;
const QUEUE = ['w', 'w', 'BLUE', 'w', 'w', 'PINK', 'w', 'w', 'w', 'w'];
const STYLES = ['part', 'curls', 'bob', 'crop', 'bun', 'sweep'];
const worker = (n) => ({ ...personFor(900 + n), shirt: OFFICE_SHIRTS[n % OFFICE_SHIRTS.length], hair: OFFICE_HAIRS[(n * 5 + 2) % OFFICE_HAIRS.length],
  skin: OFFICE_SKINS[(n * 3 + 1) % OFFICE_SKINS.length], hairStyle: STYLES[(n * 5) % STYLES.length], glasses: n % 5 === 2 });
const OFFICE = CABINET_BY_ID.office, SPEED = BASE_SPEED * (1 + (OFFICE.speedBonus || 0));
const REAL = totalDistFor(SPEED, 100, OFFICE.mechanic);
const EXIT = officeFireExitBay('open', REAL);
const WALL_RATE = (OFFICE_CORRIDORS.open.wall.factor ?? FACTORS.wall) * OFFICE_ZOOM;
// the camera that puts the fire exit door at screen x 430, the floor in front of it cleared
const EXIT_CAM = EXIT ? ((EXIT.u0 + EXIT.u1) / 2 - 20 - 430) / WALL_RATE : 20000;

function queueStrip(id, t) {
  return (g, f, P, pass) => {
    if (pass !== 'wall') return;
    const door = f.fireExit ? (f.fireExit.u0 + f.fireExit.u1) / 2 - 20 - f.wall.shift : 430;
    const L = EXIT_GAP * QUEUE.length, run = t * EXIT_SPEED;
    g.save();
    g.beginPath(); g.rect(door - L - 60, WALL_BASE - 120, L + 60, 130); g.clip();
    QUEUE.forEach((who, i) => {
      const along = ((run + i * EXIT_GAP) % L + L) % L;
      const x = door - L + along + 10;
      g.save(); g.translate(x, WALL_BASE); g.scale(EXIT_SCALE, EXIT_SCALE);
      if (who === 'w') walkerSide(g, 0, 0, worker(i), 900 + i, t * (EXIT_SPEED / 26) + i, P.inkM);
      else {
        const cand = PROFILE_BY_ID[id];
        // the gait set by the distance walked, so the planted foot holds to the floor
        const dist = (run + i * EXIT_GAP) / EXIT_SCALE;
        drawProfileZombie(g, t, id, { outfit: who === 'PINK' ? TEMP_OUTFIT : null, phase: dist / profileStride(cand), ink: P.inkM });
      }
      g.restore();
    });
    g.restore();
  };
}
export function drawProfileQueueScene(ctx, t, id) {
  const was = setOfficeMidExtra(queueStrip(id, t));
  try { drawOfficeProductionScene(ctx, t, { floor: 'open', hazards: [], tour: REAL }, false, EXIT_CAM); }
  finally { setOfficeMidExtra(was); }
}

// Frames of the walk, both outfits, on plain floor-23 wall colour, at the queue's in-run size: the
// world frame at the run's zoom (the gallery tile is 480x270 like the run's frame).
export function drawProfileFrames(ctx, t, id, { frames = 6, animated = true } = {}) {
  const P = PAL.open;
  ctx.save();
  const cand = PROFILE_BY_ID[id];
  PROFILE_OUTFITS.forEach(([, outfit], row) => {
    const y0 = row ? 130 : 0;
    ctx.fillStyle = '#ece4f0'; ctx.fillRect(0, y0, 480, 140);
    ctx.fillStyle = '#d6cfe0'; ctx.fillRect(0, y0 + 112, 480, 28);
    // the moving one first, then the cycle laid out in `frames` stills
    ctx.save(); ctx.translate(40, y0 + 112); ctx.scale(EXIT_SCALE * 1.0, EXIT_SCALE);
    drawProfileZombie(ctx, t, id, { outfit, phase: animated ? t * EXIT_SPEED / EXIT_SCALE / profileStride(cand) : 0, ink: P.inkM });
    ctx.restore();
    for (let k = 0; k < frames; k++) {
      ctx.save(); ctx.translate(120 + k * 58, y0 + 112); ctx.scale(EXIT_SCALE, EXIT_SCALE);
      drawProfileZombie(ctx, t, id, { outfit, phase: k / frames, ink: P.inkM });
      ctx.restore();
    }
  });
  ctx.restore();
}
