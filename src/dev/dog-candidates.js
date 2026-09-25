// THE KENNEL — dog redesign bake-off (gallery-only, 24 Sep 2026).
//
// Peter: "can we do a bake off and redo ALL the dogs? they look super rough at the
// moment (including the sign)". Every dog in the game, and the BEWARE OF DOG sign:
//
//   bruiser  — dogBruiser, SPEED ZONE (also Neon and Cardboard). Low, wide, slow.
//   snarler  — dogSnarler, CORPORATE KOMBAT. Lean doberman, spiked collar, fast.
//   feral    — dogFeral, CRYPT SHIFT. Tall, gaunt, hackles up, fastest.
//   finish   — finishDog, PLUMBER PANIC: the guard at the tape, wearing one of the
//              three rigs (finishSnarler / finishBruiser / finishFeral) at 22x15.
//   collie   — the working collie behind the flock on PLUMBER's near ridge
//              (stylePacks/plumberLandmarks.js drawCollie — not exported, so card A
//              is a faithful copy of it, finish and all).
//   sign     — dogSign, the BEWARE OF DOG board a screen before the plumber finish.
//
// NOTHING HERE IS WIRED INTO THE GAME. Card A of every role is the shipped art —
// the lane dogs and the sign through the real drawWorldEntity / propSprite, the
// collie through a copy (see above).
//
// EVERY TAKE IS A HOUSE STYLE. B–E are one rig — one gallop, one skeleton, one head
// assembly — drawn four ways, so any of them can be adopted cast-wide (the KENNEL
// cards) or picked per role. The rig keeps each dog's box, TALL and VISUAL numbers
// exactly as shipped, so a candidate stands on screen at the size the dog does now
// and a swap would touch no hitbox. Candidates are rasterized the way the game
// rasterizes the shipped dogs (16 px per box unit, detail 2 x SS 8; the finish dog
// and the sign at detail 3), so NOW and the takes are judged through the same
// resample.
//
// The gallop is a real one, keyed rather than driven by a sine: extended suspension
// -> fore lead lands -> fores push -> GATHERED suspension (all four tucked, hinds
// crossing ahead of the fores) -> hinds land -> hinds drive -> extended again. The
// shipped dogs swing their feet round an ellipse on a single sine, which is why they
// read as trotting on the spot. Eight frames, same as ANIMAL_FRAMES, same fps.
//
// ONE LINE, EVERYWHERE (the goose rule, sprites/animals.js GOOSE_LINE): every visible
// part of a dog is ONE silhouette. All its parts are stroked once as a single path at
// twice the line, then filled, so the fills bury every inner edge and the only ink
// left is the outside of the animal. The shipped dogs outline every leg bone, fur
// spike, ear and collar stud separately, which is most of why they read as rough.
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { W, H } from '../engine/renderer.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { makeObstacle } from '../game/entities.js';
import { PLAYER_X } from '../game/player.js';
import { drawToon } from '../sprites/toons.js';
import { propSprite } from '../sprites/props.js';
import { WAS_DOG_PAINTERS } from './dogs-was.js';
import { drawCollieDog } from '../sprites/dogs.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { paperTextureSource, PAPER_PATTERN_SCALE } from '../engine/paper-material.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };

// ------------------------------------------------------------------ the roles
// Box, TALL, VISUAL, detail and fps are the shipped numbers (game/entities.js,
// sprites/animals.js ANIMAL_TALL / ANIMAL_VISUAL / ANIMAL_FPS, props.js tables).
export const DOG_ROLES = [
  { id: 'bruiser', type: 'dogBruiser', breed: 'bruiser', cab: 'speed', box: [15, 10], tall: 1.0, vis: 1.16, detail: 2, fps: 18,
    name: 'BRUISER', where: 'dogBruiser · SPEED ZONE (also Neon, Cardboard) · 15x10u · the slow one' },
  { id: 'snarler', type: 'dogSnarler', breed: 'snarler', cab: 'office', box: [16, 11], tall: 1.05, vis: 1.16, detail: 2, fps: 16,
    name: 'SNARLER', where: 'dogSnarler · CORPORATE KOMBAT · 16x11u · corporate security' },
  { id: 'feral', type: 'dogFeral', breed: 'feral', cab: 'crypt', box: [17, 12], tall: 1.15, vis: 1.16, detail: 2, fps: 15,
    name: 'FERAL', where: 'dogFeral · CRYPT SHIFT · 17x12u · the fastest' },
  { id: 'finish', type: 'finishDog', skin: 'finishSnarler', breed: 'snarler', cab: 'plumber', box: [22, 15], tall: 1.05, vis: 1.16, detail: 3, fps: 16,
    name: 'FINISH DOG', where: 'finishDog · PLUMBER PANIC tape guard · 22x15u · wears all three rigs + long tail' },
];
export const FINISH_SKINS = [
  { skin: 'finishSnarler', breed: 'snarler', base: 'dogSnarler', tall: 1.05, fps: 16 },
  { skin: 'finishBruiser', breed: 'bruiser', base: 'dogBruiser', tall: 1.0, fps: 18 },
  { skin: 'finishFeral', breed: 'feral', base: 'dogFeral', tall: 1.15, fps: 15 },
];
const ROLE = Object.fromEntries(DOG_ROLES.map((r) => [r.id, r]));
const FRAMES = 8;
const SS = 8;

// ------------------------------------------------------------------ the styles
export const DOG_STYLES = [
  { id: 'now', letter: 'A', name: 'WAS — the old quadruped rig / paper-cut collie',
    note: 'What shipped until 24 Sep (the dogs: a verbatim copy, src/dev/dogs-was.js, rasterized as propSprite did; the collie: a copy of the old drawCollie). Every bone, spike, ear and stud carries its own contour, the fur is rows of jagged spikes, and the feet ride one sine round an ellipse — which is why it reads as trotting on the spot.' },
  { id: 'line', letter: 'B', name: 'CLEAN LINE — one silhouette, one fine line · SHIPS (24 Sep)', ships: true,
    note: 'SHIPPED 24 Sep for the whole kennel (sprites/dogs.js) — every card draws the real shipped painters. The collie\'s B card is NOT shipped: it was ported and then reverted the same day for the sheep\'s paper-cut finish (work/local/collie-port.patch). Naturalistic breeds (doberman, bull terrier-ish bruiser, starved wolf-dog) drawn as ONE silhouette with the goose\'s one-line contour, two flat tones and the breed\'s own markings. No fur spikes: the feral\'s hackles are one raised ridge in the outline. Keyed rotary gallop with a real gathered and extended flight.' },
  { id: 'toon', letter: 'C', name: 'TOON — cast from the hero rig',
    note: 'Built like the heroes: a head a third bigger, the whites of the eyes and a heavy brow slab (the heroes\' expression lives there too), chunky paws, rounder masses and the hero contour weight. Reads as a character at lane size because the face is big enough to have one. Same gallop, pushed with squash and stretch.' },
  { id: 'poster', letter: 'D', name: 'POSTER — flat hazard silhouette',
    note: 'Legibility first: one dark flat shape per dog with a single warm rim light along its back, glowing eyes and white teeth — nothing else inside the silhouette. The same language as the sign pictogram, so the board and the animal it warns about read as one thing.' },
  { id: 'clump', letter: 'E', name: 'NOW, REDRAWN — same dogs, cleaned up',
    note: 'Keeps every idea the shipped dogs argue for — hackles, ruff, ribs on the feral, the spiked collar, slit eyes — but the fur is four or five big clumps that belong to the outline instead of rows of loose spikes, and it runs the keyed gallop. The least change of character for the most cleanup.' },
];
const STYLE = Object.fromEntries(DOG_STYLES.map((s) => [s.id, s]));

// --------------------------------------------------------------- the gallop
// Eight keys, one per frame. Feet are relative to the shoulder (fore) or hip (hind)
// in units of the breed's leg length L; `y` is lift above the ground. Angles are the
// lowest segment's direction: fore = carpus -> foot, hind = foot -> hock, in degrees,
// canvas convention (y down), authored FACING RIGHT (the painter mirrors).
//   k0 extended flight · k1 fore lead lands · k2 fores carry · k3 fores push
//   k4 GATHERED flight · k5 hinds land (ahead of where the fores were) · k6 hinds
//   carry · k7 hinds drive off.
const GAIT = {
  foreX: [0.60, 0.46, 0.06, -0.32, -0.46, -0.14, 0.24, 0.54],
  foreY: [0.26, 0.00, 0.00, 0.03, 0.42, 0.62, 0.55, 0.40],
  foreA: [72, 84, 92, 116, 196, 238, 160, 96],
  hindX: [-0.64, -0.50, -0.26, 0.12, 0.42, 0.42, 0.04, -0.40],
  hindY: [0.28, 0.52, 0.62, 0.46, 0.22, 0.00, 0.00, 0.03],
  hindA: [-38, -5, 25, -55, -98, -104, -96, -62],
  lift: [0.10, 0.03, -0.06, 0.00, 0.09, 0.01, -0.05, 0.03],
  pitch: [0.00, -0.05, -0.08, -0.03, 0.03, 0.07, 0.05, 0.02],
  flex: [0.00, 0.15, 0.42, 0.78, 1.00, 0.80, 0.48, 0.14],
  gape: [1.00, 0.80, 0.30, 0.12, 0.40, 0.70, 0.85, 0.95],   // widest ON frame 0: run.js times the finish dog's bark to the wrap
  nod: [0.00, 0.35, 0.80, 0.45, -0.20, -0.55, -0.35, -0.10],
};
// Periodic Catmull-Rom through the keys, so a continuous phase (the 6x close-up
// runs on wall time) passes exactly through every keyed frame.
function cyc(keys, p) {
  const n = keys.length;
  const x = (((p % 1) + 1) % 1) * n;
  const i = Math.floor(x), f = x - i;
  const k0 = keys[(i - 1 + n) % n], k1 = keys[i % n], k2 = keys[(i + 1) % n], k3 = keys[(i + 2) % n];
  return 0.5 * ((2 * k1) + (-k0 + k2) * f + (2 * k0 - 5 * k1 + 4 * k2 - k3) * f * f
    + (-k0 + 3 * k1 - 3 * k2 + k3) * f * f * f);
}

// Two-bone IK with a FIXED bend side: `side` +1 puts the joint on the left of the
// directed line a->b (canvas coords), -1 on the right. Fixed, so a joint can never
// flip mid-cycle (memory: no-impossible-poses).
function ik(ax, ay, bx, by, l1, l2, side) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const dd = Math.min(d, (l1 + l2) * 0.998);
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { x: ax + ux * a + uy * h * side, y: ay + uy * a - ux * h * side, reach: d / (l1 + l2) };
}

// ------------------------------------------------------------------ breeds
// World units, facing right, ground at y 0, x 0 the middle of the art box. Each
// breed is sized to fill its role's art box (box x 4/3 x VISUAL wide, x TALL high).
const BREEDS = {
  snarler: {
    L: 8.0, spine: 8.2, cx: -0.6, chestUp: 2.1, chestDown: 2.3, chestRx: 2.5,
    rumpUp: 2.0, rumpDown: 1.7, rumpRx: 2.1, tuck: 1.25, arch: 0.15,
    neckLen: 4.6, neckAng: -48, neckW: 1.85, headR: 1.75, muzzle: 2.9, muzzleH: 1.3,
    ear: 'crop', earLen: 2.7, tail: 'whip', legW: [1.25, 0.72, 0.56], pawR: 0.62,
    collar: 'spiked', teeth: 1.0,
    pal: { coat: '#36313f', far: '#24202b', shade: '#28242f', mark: '#b87a44', markShade: '#94602f', eye: '#f6d33c', collar: '#7a2a1c' },
    marks: 'dobe',
  },
  bruiser: {
    L: 6.3, spine: 7.4, cx: -0.9, chestUp: 2.7, chestDown: 2.6, chestRx: 3.5,
    rumpUp: 2.2, rumpDown: 1.6, rumpRx: 2.2, tuck: 1.0, arch: -0.25,
    neckLen: 3.5, neckAng: -42, neckW: 3.3, headR: 2.6, muzzle: 1.4, muzzleH: 2.0,
    ear: 'rose', earLen: 1.7, tail: 'stub', legW: [2.0, 1.3, 1.0], pawR: 0.95,
    collar: 'spiked', teeth: 1.4, bowed: 0.35,
    pal: { coat: '#c68d4c', far: '#94622f', shade: '#a6733c', mark: '#f2e2c4', markShade: '#d9c3a0', eye: '#e04848', collar: '#5a2a18' },
    marks: 'blaze',
  },
  feral: {
    L: 11.4, stride: 0.62, spine: 8.6, cx: -0.4, chestUp: 2.2, chestDown: 2.3, chestRx: 2.5,
    rumpUp: 2.0, rumpDown: 1.7, rumpRx: 2.1, tuck: 1.6, arch: 1.0,
    neckLen: 4.1, neckAng: -30, neckW: 2.1, headR: 2.05, muzzle: 2.8, muzzleH: 1.35,
    ear: 'prick', earLen: 2.4, tail: 'brush', legW: [1.2, 0.66, 0.52], pawR: 0.62,
    collar: 'none', teeth: 1.15, ribs: true, hackles: 1,
    pal: { coat: '#858594', far: '#575764', shade: '#6a6a79', mark: '#aaa49c', markShade: '#8d8780', saddle: '#4c4c57', eye: '#f2e27a', collar: '#000' },
    marks: 'wolf',
  },
  collie: {
    L: 6.2, spine: 8.0, cx: 0, chestUp: 2.2, chestDown: 2.3, chestRx: 2.5,
    rumpUp: 2.0, rumpDown: 1.8, rumpRx: 2.2, tuck: 0.9, arch: 0.2,
    neckLen: 3.9, neckAng: -40, neckW: 2.3, headR: 1.7, muzzle: 2.2, muzzleH: 1.2,
    ear: 'semi', earLen: 1.8, tail: 'plume', legW: [1.15, 0.7, 0.55], pawR: 0.6,
    collar: 'none', teeth: 0, friendly: true,
    pal: { coat: '#26221f', far: '#141210', shade: '#1a1715', mark: '#f4f1ea', markShade: '#d6d0c4', eye: '#5a3a1c', collar: '#000' },
    marks: 'collie',
  },
};

// Per-style reshaping. Multipliers on the breed so the three dogs stay three dogs.
const SHAPE = {
  line: { head: 1.0, muzzle: 1.0, leg: 1.0, legW: 1.0, paw: 1.0, body: 1.0, ear: 1.0, lw: 0.26, gapeK: 1.0 },
  toon: { head: 1.34, muzzle: 0.82, leg: 0.9, legW: 1.18, paw: 1.35, body: 1.06, ear: 1.1, lw: 0.24, gapeK: 1.25 },
  poster: { head: 1.08, muzzle: 1.05, leg: 1.0, legW: 1.08, paw: 1.0, body: 1.0, ear: 1.25, lw: 0.30, gapeK: 1.3 },
  clump: { head: 1.0, muzzle: 1.0, leg: 1.0, legW: 1.0, paw: 1.0, body: 1.0, ear: 1.0, lw: 0.26, gapeK: 1.1 },
};
// Poster palettes: one dark flat body per breed, rim light, glowing eyes.
const POSTER_PAL = {
  snarler: { body: '#221e29', rim: '#ffd9a0', eye: '#ffd23a' },
  bruiser: { body: '#6e3f1c', rim: '#ffe3b0', eye: '#ff5a4a' },
  feral: { body: '#2e2e38', rim: '#d8e6ff', eye: '#b8ff6a' },
  collie: { body: '#1c1917', rim: '#fff4dc', eye: '#ffd98a' },
};
const INK = 'rgba(26,16,40,0.52)';
const MOUTH = '#5a1422';
const TONGUE = '#e2607a';
const TOOTH = '#fbf6ec';

// ---------------------------------------------------------------- the pose
// Everything a painter needs for one phase, in world units facing right.
// `crouch` 0..1 blends toward the collie's eye-on-the-flock drop.
function pose(B, S, phase, { crouch = 0, stretch = 0 } = {}) {
  const L = B.L * S.leg;
  const g = (k) => cyc(GAIT[k], phase);
  const run = 1 - crouch;
  const lift = g('lift') * run - crouch * 0.42;
  const flex = g('flex');
  const pitch = g('pitch') * run + crouch * 0.03;
  // Squash and stretch for the toon: the spine lengthens in the extended flight
  // and shortens gathered, on top of what every style's flex already does.
  const spine = B.spine * (1 - 0.10 * flex * run + stretch * (0.5 - flex) * 0.24 * run);
  const cx = B.cx;
  const baseY = -(L * 0.96 + lift * L);
  const half = spine / 2;
  const S0 = { x: cx + half * Math.cos(pitch), y: baseY - half * Math.sin(pitch) };
  const H0 = { x: cx - half * Math.cos(pitch), y: baseY + half * Math.sin(pitch) };
  const leg = (root, isFore, off) => {
    const p = phase + off;
    const fx = root.x + (isFore ? cyc(GAIT.foreX, p) : cyc(GAIT.hindX, p)) * L * run * (B.stride || 1)
      + (isFore ? 0.2 : -0.1) * L * crouch;
    const fy = -Math.max(0, (isFore ? cyc(GAIT.foreY, p) : cyc(GAIT.hindY, p))) * L * run;
    const ang = (isFore ? cyc(GAIT.foreA, p) : cyc(GAIT.hindA, p)) * run
      + (isFore ? 118 : -128) * crouch;
    if (isFore) {
      const a3 = L * 0.17, a1 = L * 0.47, a2 = L * 0.44;
      // carpus -> foot points along `ang`, so the carpus sits back along it.
      const C = { x: fx - Math.cos(ang * DEG) * a3, y: fy - Math.sin(ang * DEG) * a3 };
      // Elbow on the TAIL side of shoulder->carpus.
      const E = ik(root.x, root.y, C.x, C.y, a1, a2, -1);
      return { root, mid: E, low: C, foot: { x: fx, y: fy }, fore: true };
    }
    const b3 = L * 0.36, b1 = L * 0.50, b2 = L * 0.50;
    const Hk = { x: fx + Math.cos(ang * DEG) * b3, y: fy + Math.sin(ang * DEG) * b3 };
    // Stifle on the NOSE side of hip->hock.
    const K = ik(root.x, root.y, Hk.x, Hk.y, b1, b2, 1);
    return { root, mid: K, low: Hk, foot: { x: fx, y: fy }, fore: false };
  };
  const nod = g('nod') * run;
  const neckAng = (B.neckAng + nod * 6 + crouch * 30) * DEG + pitch * -1;
  const headR = B.headR * S.head;
  const Hc = {
    x: S0.x + Math.cos(neckAng) * B.neckLen + crouch * 1.0,
    y: S0.y + Math.sin(neckAng) * B.neckLen + nod * 0.35,
  };
  const gape = B.teeth ? clamp01(g('gape') * run) : (0.35 + 0.25 * g('gape')) * run;
  return {
    L, S: S0, Hp: H0, pitch, flex, lift, run, crouch, spine,
    fore: leg({ x: S0.x, y: S0.y }, true, 0), foreFar: leg({ x: S0.x - 0.2, y: S0.y }, true, 0.085),
    hind: leg({ x: H0.x, y: H0.y }, false, 0), hindFar: leg({ x: H0.x - 0.2, y: H0.y }, false, 0.085),
    Hc, headR, tilt: -0.06 + nod * 0.08 + crouch * 0.15 - pitch * 0.5, gape,
    wag: Math.sin(phase * TAU * 2),
  };
}

// ------------------------------------------------------------ path helpers
function capsule(p, ax, ay, bx, by, ra, rb) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const nx = -dy / d, ny = dx / d;
  const a0 = Math.atan2(ny, nx);
  p.moveTo(ax + nx * ra, ay + ny * ra);
  p.lineTo(bx + nx * rb, by + ny * rb);
  // Both caps bulge OUTWARD (anticlockwise from the +normal side): the other way
  // round they bite a notch into every joint.
  p.arc(bx, by, rb, a0, a0 - Math.PI, true);
  p.lineTo(ax - nx * ra, ay - ny * ra);
  p.arc(ax, ay, ra, a0 - Math.PI, a0 - TAU, true);
  p.closePath();
}
// A smooth closed curve through points (Catmull-Rom as cubic Beziers).
function smoothClosed(p, pts, k = 1) {
  const n = pts.length;
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t = k / 6;
    p.bezierCurveTo(p1.x + (p2.x - p0.x) * t, p1.y + (p2.y - p0.y) * t,
      p2.x - (p3.x - p1.x) * t, p2.y - (p3.y - p1.y) * t, p2.x, p2.y);
  }
  p.closePath();
}
function smoothOpen(p, pts, k = 1, move = true) {
  const n = pts.length;
  if (move) p.moveTo(pts[0].x, pts[0].y); else p.lineTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const t = k / 6;
    p.bezierCurveTo(p1.x + (p2.x - p0.x) * t, p1.y + (p2.y - p0.y) * t,
      p2.x - (p3.x - p1.x) * t, p2.y - (p3.y - p1.y) * t, p2.x, p2.y);
  }
}
const P2 = (fn) => { const p = new Path2D(); fn(p); return p; };
const pt = (x, y) => ({ x, y });

// ------------------------------------------------------------- the painter
// paintDog(ctx, breedId, styleId, phase, opts) draws in WORLD units, facing LEFT
// (the way obstacles arrive), feet on y 0, x 0 the art box's middle.
export function paintDog(ctx, breedId, styleId, phase, opts = {}) {
  const B0 = BREEDS[breedId];
  const S = SHAPE[styleId] || SHAPE.line;
  const B = { ...B0, id: breedId, ...(opts.override || {}) };
  if (opts.longTail) B.tail = 'long';
  const P = pose(B, S, phase, { crouch: opts.crouch || 0, stretch: styleId === 'toon' ? 1 : 0 });
  const poster = styleId === 'poster';
  const pal = poster ? { ...B.pal, ...POSTER_PAL[breedId] } : B.pal;
  const coat = poster ? pal.body : pal.coat;
  const far = poster ? shadeHex(pal.body, -0.28) : pal.far;
  const LW = S.lw;
  ctx.save();
  ctx.scale(-1, 1);          // authored facing right; obstacles face left
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // ---- the far pair and the far ear: a silhouette of their own, behind.
  const back = [];
  for (const lg of [P.hindFar, P.foreFar]) back.push({ path: legPath(lg, B, S, 0.9), fill: far });
  const farEar = earPath(B, S, P, true);
  if (farEar) back.push({ path: farEar, fill: far });
  silhouette(ctx, back, LW, poster);

  // ---- the near silhouette: tail, torso, neck, head, jaw, mouth, near legs, ear.
  const parts = [];
  const tail = tailPath(B, P, styleId);
  if (tail) parts.push({ path: tail, fill: coat, id: 'tail' });
  const torso = torsoPath(B, S, P);
  parts.push({ path: torso, fill: coat, id: 'torso' });
  if (styleId === 'clump' || (styleId === 'poster' && B.hackles)) {
    for (const f of furClumps(B, P, styleId)) parts.push({ path: f, fill: coat, id: 'fur' });
  } else if (B.hackles && styleId !== 'toon') {
    parts.push({ path: hackleRidge(B, P), fill: coat, id: 'fur' });
  }
  const neck = neckPath(B, S, P);
  parts.push({ path: neck, fill: coat, id: 'neck' });
  const hd = headPaths(B, S, P, styleId);
  parts.push({ path: hd.mouth, fill: MOUTH, id: 'mouth' });
  parts.push({ path: hd.jaw, fill: coat, id: 'jaw' });
  parts.push({ path: hd.skull, fill: coat, id: 'skull' });
  const nearLegs = [P.hind, P.fore].map((lg) => legPath(lg, B, S, 1));
  for (const lp of nearLegs) parts.push({ path: lp, fill: coat, id: 'leg' });
  const nearEar = earPath(B, S, P, false);
  if (nearEar) parts.push({ path: nearEar, fill: coat, id: 'ear' });
  silhouette(ctx, parts, LW, poster);
  const all = new Path2D();
  for (const q of parts) all.addPath(q.path);

  if (poster) {
    posterFinish(ctx, all, parts, pal, B, P, hd, LW);
  } else {
    // ---- shading and markings, clipped to the silhouette they sit in.
    shadeBody(ctx, torso, pal, B, P);
    markings(ctx, B, S, P, hd, pal, parts, nearLegs, styleId, torso, neck);
    if (B.ribs && styleId !== 'toon') ribs(ctx, torso, P, B, LW);
  }
  // ---- collar, teeth, nose, eye, brow.
  collar(ctx, B, P, pal, LW, styleId);
  face(ctx, B, S, P, hd, pal, LW, styleId);
  // A near ear's inner and the mouth's tongue sit on top of the finished head.
  if (nearEar && !poster && B.ear !== 'rose' && B.ear !== 'flop') earInner(ctx, B, S, P, pal);
  // Dust off the planted hind feet (C and E): pins the dog to the road.
  if ((styleId === 'toon' || styleId === 'clump') && !opts.noDust) dust(ctx, P, phase);
  ctx.restore();
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Stroke every part once as ONE path at twice the line, then fill each part. The
// fills bury the inner half of the stroke and every inner edge.
function silhouette(ctx, parts, LW, poster) {
  if (!parts.length) return;
  const all = new Path2D();
  for (const q of parts) all.addPath(q.path);
  ctx.strokeStyle = poster ? 'rgba(12,8,18,0.62)' : INK;
  ctx.lineWidth = LW * 2;
  ctx.stroke(all);
  for (const q of parts) { ctx.fillStyle = q.fill; ctx.fill(q.path); }
}

function legPath(lg, B, S, k) {
  const [w0, w1, w2] = B.legW.map((v) => v * S.legW * k * 0.5);
  const pr = B.pawR * S.paw * k;
  const p = new Path2D();
  const { root, mid, low, foot } = lg;
  if (lg.fore) {
    capsule(p, root.x, root.y, mid.x, mid.y, w0 * 1.25, w1 * 1.05);
    capsule(p, mid.x, mid.y, low.x, low.y, w1 * 1.05, w2 * 0.95);
    capsule(p, low.x, low.y, foot.x, foot.y, w2 * 0.95, w2 * 0.8);
  } else {
    // The thigh is a haunch, not a bone: a fat teardrop from hip to stifle.
    capsule(p, root.x, root.y + w0 * 0.3, mid.x, mid.y, w0 * 1.35, w1 * 1.2);
    capsule(p, mid.x, mid.y, low.x, low.y, w1 * 1.1, w2 * 0.85);
    capsule(p, low.x, low.y, foot.x, foot.y, w2 * 0.85, w2 * 0.78);
  }
  // The paw: a flattened oval lying along the last segment's direction, toes forward.
  const a = Math.atan2(foot.y - low.y, foot.x - low.x);
  const toe = lg.fore ? 1 : 1;
  const px = foot.x + Math.cos(a) * pr * 0.2 + toe * pr * 0.25, py = foot.y - pr * 0.25;
  p.moveTo(px + pr, py);
  p.ellipse(px, py, pr, pr * 0.62, 0, 0, TAU);
  return p;
}

function torsoPath(B, S, P) {
  const { S: Sh, Hp } = P;
  const k = S.body;
  const mid = { x: (Sh.x + Hp.x) / 2, y: (Sh.y + Hp.y) / 2 };
  const up = (v) => v * k;
  const pts = [
    pt(Sh.x + B.chestRx * 0.95 * k, Sh.y + 0.1),                  // prosternum
    pt(Sh.x + B.chestRx * 0.55 * k, Sh.y - up(B.chestUp) * 0.85),  // front of withers
    pt(Sh.x - 0.4, Sh.y - up(B.chestUp)),                          // withers
    pt(mid.x, mid.y - up(B.chestUp) * 0.82 - B.arch),              // back
    pt(Hp.x + 0.5, Hp.y - up(B.rumpUp) - B.arch * 0.25),           // loin / croup
    pt(Hp.x - B.rumpRx * 0.75 * k, Hp.y - up(B.rumpUp) * 0.6),     // tail set
    pt(Hp.x - B.rumpRx * k, Hp.y + 0.2),                            // buttock
    pt(Hp.x - B.rumpRx * 0.35 * k, Hp.y + up(B.rumpDown)),          // under the rump
    pt(mid.x - 0.8, mid.y + up(B.chestDown) - B.tuck * 1.35),       // tucked flank
    pt(Sh.x - 0.9, Sh.y + up(B.chestDown) * 1.05),                  // brisket
    pt(Sh.x + B.chestRx * 0.6 * k, Sh.y + up(B.chestDown) * 0.75),  // front of chest
  ];
  return P2((p) => smoothClosed(p, pts, 1));
}

function neckPath(B, S, P) {
  const { S: Sh, Hc, headR } = P;
  const nw = B.neckW * S.body;
  const ang = Math.atan2(Hc.y - Sh.y, Hc.x - Sh.x);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const top0 = pt(Sh.x - 0.6 - nx * nw * 0.2, Sh.y - B.chestUp * 0.9);
  const top1 = pt(Hc.x - nx * headR * 0.55 - Math.cos(ang) * headR * 0.3, Hc.y - ny * headR * 0.55);
  const bot1 = pt(Hc.x + nx * headR * 0.6 + Math.cos(ang) * headR * 0.1, Hc.y + ny * headR * 0.6);
  const bot0 = pt(Sh.x + B.chestRx * 0.85, Sh.y + 0.2);
  const midTop = pt((top0.x + top1.x) / 2 - nx * nw * 0.28, (top0.y + top1.y) / 2 - ny * nw * 0.28);
  const midBot = pt((bot0.x + bot1.x) / 2 + nx * nw * 0.18, (bot0.y + bot1.y) / 2 + ny * nw * 0.18);
  return P2((p) => smoothClosed(p, [top0, midTop, top1, bot1, midBot, bot0], 0.9));
}

// The head in its own rotated frame. Returns skull (skull + upper muzzle), jaw,
// mouth, and the points the face needs.
function headPaths(B, S, P, styleId) {
  const R = P.headR;
  const M = B.muzzle * S.muzzle * (styleId === 'toon' ? 1 : 1);
  const mh = B.muzzleH * (styleId === 'toon' ? 1.1 : 1);
  const th = P.tilt, cs = Math.cos(th), sn = Math.sin(th);
  const T = (u, v) => pt(P.Hc.x + u * cs - v * sn, P.Hc.y + u * sn + v * cs);
  const gape = P.gape * S.gapeK;
  const hinge = { u: R * 0.05, v: R * 0.42 };
  const ja = gape * (B.friendly ? 0.22 : 0.52);
  const J = (u, v) => {
    const du = u - hinge.u, dv = v - hinge.v;
    return T(hinge.u + du * Math.cos(ja) - dv * Math.sin(ja), hinge.v + du * Math.sin(ja) + dv * Math.cos(ja));
  };
  const noseX = R + M;
  const lipY = -R * 0.12 + mh * 0.62;
  // Skull + upper muzzle: one smooth outline, with the STOP (skull stepping down
  // onto the bridge) as the one corner that says dog rather than bear.
  const skullPts = [
    T(-R * 0.95, R * 0.15),
    T(-R * 0.75, -R * 0.62),
    T(-R * 0.1, -R * 0.98),
    T(R * 0.55, -R * 0.78),
    T(R * 0.85, -R * 0.42),               // the stop
    T(noseX - M * 0.35, -R * 0.36),
    T(noseX, -R * 0.26),
    T(noseX + 0.12, -R * 0.02),
    T(noseX - 0.1, lipY),
    T(R * 0.55, lipY + 0.08),
    T(R * 0.05, R * 0.55),
    T(-R * 0.55, R * 0.72),
  ];
  const skull = P2((p) => smoothClosed(p, skullPts, 0.85));
  // Lower jaw, hinged under the ear, rotated open.
  const jawPts = [
    J(-R * 0.35, R * 0.35),
    J(R * 0.5, lipY + 0.02),
    J(noseX - M * 0.2, lipY + 0.05),
    J(noseX - M * 0.12, lipY + mh * 0.34),
    J(R * 0.45, lipY + mh * 0.52),
    J(-R * 0.3, R * 0.85),
  ];
  const jaw = P2((p) => smoothClosed(p, jawPts, 0.8));
  // Mouth interior between the two: lip corner back at the cheek, forward to where
  // both jaws end.
  const mouth = P2((p) => {
    const a = T(R * 0.2, lipY - 0.1), b = T(noseX - 0.2, lipY - 0.05);
    const c = J(noseX - M * 0.15, lipY + 0.1), d = J(R * 0.3, lipY + 0.1);
    p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); p.lineTo(c.x, c.y); p.lineTo(d.x, d.y); p.closePath();
  });
  return { skull, jaw, mouth, T, J, R, M, noseX, lipY, mh, gape };
}

function earPath(B, S, P, far) {
  const R = P.headR, L = B.earLen * S.ear;
  const th = P.tilt, cs = Math.cos(th), sn = Math.sin(th);
  const o = far ? -R * 0.35 : 0;
  const T = (u, v) => pt(P.Hc.x + u * cs - v * sn, P.Hc.y + u * sn + v * cs);
  const base = { u: -R * 0.25 + o, v: -R * 0.72 };
  const p = new Path2D();
  const poly = (pts) => smoothClosed(p, pts, 0.35);
  if (B.ear === 'crop') {
    // Cropped blade, bolt upright and raked slightly back.
    poly([T(base.u - R * 0.25, base.v + R * 0.25), T(base.u - L * 0.18, base.v - L * 0.98),
      T(base.u + L * 0.08, base.v - L * 0.9), T(base.u + R * 0.55, base.v + R * 0.1)]);
  } else if (B.ear === 'prick') {
    // Swept back flat along the skull: pinned, committed.
    poly([T(base.u + R * 0.35, base.v + R * 0.15), T(base.u - L * 0.95, base.v - L * 0.62),
      T(base.u - L * 0.62, base.v - L * 0.05), T(base.u - R * 0.2, base.v + R * 0.42)]);
  } else if (B.ear === 'rose') {
    // A small folded rose ear, laid back: a bruiser's ears are for not being bitten.
    poly([T(base.u + R * 0.2, base.v + R * 0.1), T(base.u - L * 0.55, base.v - L * 0.62),
      T(base.u - L * 0.95, base.v - L * 0.1), T(base.u - R * 0.25, base.v + R * 0.45)]);
  } else if (B.ear === 'semi') {
    // The collie's: up, with the tip tipped over.
    poly([T(base.u - R * 0.2, base.v + R * 0.2), T(base.u - L * 0.1, base.v - L * 0.9),
      T(base.u + L * 0.45, base.v - L * 0.62), T(base.u + R * 0.45, base.v + R * 0.1)]);
  } else return null;
  return p;
}
function earInner(ctx, B, S, P, pal) {
  if (B.ear !== 'crop' && B.ear !== 'prick') return;
  const R = P.headR, L = B.earLen * S.ear * 0.62;
  const th = P.tilt, cs = Math.cos(th), sn = Math.sin(th);
  const T = (u, v) => pt(P.Hc.x + u * cs - v * sn, P.Hc.y + u * sn + v * cs);
  const base = { u: -R * 0.2, v: -R * 0.8 };
  ctx.fillStyle = 'rgba(40,14,24,0.35)';
  ctx.beginPath();
  if (B.ear === 'crop') {
    const a = T(base.u - R * 0.05, base.v), b = T(base.u - L * 0.2, base.v - L * 0.92), c = T(base.u + R * 0.3, base.v + R * 0.02);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
  } else {
    const a = T(base.u + R * 0.2, base.v + R * 0.1), b = T(base.u - L * 0.95, base.v - L * 0.6), c = T(base.u - R * 0.1, base.v + R * 0.35);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
  }
  ctx.closePath(); ctx.fill();
}

function tailPath(B, P, styleId) {
  const { Hp } = P;
  const w = P.wag * (P.crouch ? 0.2 : 1);
  const t0 = pt(Hp.x - B.rumpRx * 0.7, Hp.y - B.rumpUp * 0.55);
  const p = new Path2D();
  if (B.tail === 'whip') {
    // Streaming back and up at speed, tapering to a point.
    const tip = pt(t0.x - 2.9, t0.y - 3.6 + w * 0.5);
    const c1 = pt(t0.x - 2.2, t0.y - 0.6 + w * 0.2);
    p.moveTo(t0.x + 0.2, t0.y - 0.5);
    p.quadraticCurveTo(c1.x, c1.y - 0.45, tip.x, tip.y);
    p.quadraticCurveTo(c1.x + 0.2, c1.y + 0.45, t0.x + 0.1, t0.y + 0.5);
    p.closePath();
  } else if (B.tail === 'stub') {
    const a = -2.35 + w * 0.12;
    capsule(p, t0.x + 0.3, t0.y + 0.1, t0.x + Math.cos(a) * 1.9, t0.y + Math.sin(a) * 1.9, 0.62, 0.42);
  } else if (B.tail === 'brush') {
    // A wolf's tail at the charge: out behind, level, bushy — not up.
    const tip = pt(t0.x - 3.6, t0.y + 0.4 + w * 0.35);
    const pts = [pt(t0.x + 0.4, t0.y - 0.7), pt(t0.x - 2.2, t0.y - 1.05 + w * 0.2), pt(tip.x + 0.6, tip.y - 0.75),
      tip, pt(tip.x + 1.2, tip.y + 0.55), pt(t0.x - 2.4, t0.y + 1.0 + w * 0.2), pt(t0.x + 0.3, t0.y + 0.8)];
    smoothClosed(p, pts, 0.9);
  } else if (B.tail === 'plume') {
    const lo = P.crouch * 1.6;
    const tip = pt(t0.x - 4.4, t0.y + 0.5 + lo * 1.3 + w * 0.4);
    const pts = [pt(t0.x + 0.4, t0.y - 0.6), pt(t0.x - 2.4, t0.y - 1.1 + lo), pt(tip.x, tip.y - 0.4),
      pt(tip.x + 0.4, tip.y + 0.7), pt(t0.x - 2.2, t0.y + 0.6 + lo * 0.6), pt(t0.x + 0.3, t0.y + 0.7)];
    smoothClosed(p, pts, 0.9);
  } else if (B.tail === 'long') {
    // The finish guard's long tail: one raised sweep with a curl over the croup.
    const tip = pt(t0.x - 3.2, t0.y - 4.2 + w * 0.5);
    p.moveTo(t0.x + 0.3, t0.y - 0.5);
    p.bezierCurveTo(t0.x - 3.5, t0.y - 0.4, t0.x - 5.6, t0.y - 2.8 + w * 0.3, tip.x, tip.y);
    p.bezierCurveTo(t0.x - 4.4, t0.y - 2.2 + w * 0.3, t0.x - 3.0, t0.y + 0.7, t0.x + 0.2, t0.y + 0.6);
    p.closePath();
  } else return null;
  return p;
}

// One smooth raised ridge from withers to loin: hackles as SHAPE, not spikes.
function hackleRidge(B, P) {
  const { S: Sh, Hp } = P;
  const a = pt(Sh.x - 0.3, Sh.y - B.chestUp * 0.9);
  const b = pt(Hp.x + 1.4, Hp.y - B.rumpUp * 0.92 - B.arch * 0.3);
  const mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2 - B.arch - 0.35);
  const hi = 1.05;
  return P2((p) => smoothClosed(p, [
    pt(a.x + 0.9, a.y + 0.6), pt(a.x + 0.3, a.y - hi * 0.9), pt(mid.x + 0.8, mid.y - hi * 0.95),
    pt(b.x + 0.4, b.y - hi * 0.45), pt(b.x - 0.3, b.y + 0.4), pt(mid.x, mid.y + 0.9),
  ], 0.9));
}

// Style E's fur: FEW BIG CLUMPS that belong to the outline. A clump is a leaf-shaped
// lobe rooted inside the body and raked back.
function furClumps(B, P, styleId) {
  const { S: Sh, Hp, Hc, headR } = P;
  const out = [];
  const lobe = (x, y, len, ang, wid) => P2((p) => {
    const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
    const nx = -Math.sin(ang) * wid, ny = Math.cos(ang) * wid;
    p.moveTo(x + nx, y + ny);
    p.quadraticCurveTo(x + (tx - x) * 0.45 + nx * 0.9, y + (ty - y) * 0.45 + ny * 0.9, tx, ty);
    p.quadraticCurveTo(x + (tx - x) * 0.45 - nx * 1.1, y + (ty - y) * 0.45 - ny * 1.1, x - nx, y - ny);
    p.closePath();
  });
  const k = B.hackles ? 2.1 : (B.id === 'bruiser' ? 1.3 : 1.25);
  // Ruff behind the skull and over the crest of the neck.
  const nA = Math.atan2(Hc.y - Sh.y, Hc.x - Sh.x);
  for (let i = 0; i < 3; i++) {
    const f = 0.25 + i * 0.22;
    const x = lerp(Hc.x - headR * 0.4, Sh.x - 0.5, f) - Math.sin(nA) * 0.2;
    const y = lerp(Hc.y - headR * 0.55, Sh.y - B.chestUp * 0.95, f);
    out.push(lobe(x, y + 0.45, (1.3 + 0.4 * Math.sin(i * 2.1)) * k, Math.PI + 0.55 - i * 0.12, 0.72));
  }
  // Hackles along the back, tallest at the withers.
  const n = B.hackles ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    const x = lerp(Sh.x - 1.0, Hp.x + 1.6, f * 0.85);
    const y = lerp(Sh.y - B.chestUp * 0.95, Hp.y - B.rumpUp * 0.95, f * 0.85) - B.arch * Math.sin(f * Math.PI) * 0.9;
    out.push(lobe(x, y + 0.5, (1.25 - f * 0.45 + 0.2 * Math.sin(i * 2.7)) * k, Math.PI + 0.48, 0.75));
  }
  if (B.hackles) {
    // Throat ruff under the jaw and a shaggy rump, for the starved one only.
    out.push(lobe(Sh.x + B.chestRx * 0.6, Sh.y + B.chestDown * 0.55, 1.2, 2.15, 0.55));
    out.push(lobe(Sh.x + B.chestRx * 0.2, Sh.y + B.chestDown * 0.95, 1.0, 1.95, 0.5));
    out.push(lobe(Hp.x - B.rumpRx * 0.8, Hp.y + 0.4, 1.1, 2.55, 0.5));
  }
  return out;
}

// A cel shade along the belly: the torso minus itself shifted up.
function shadeBody(ctx, torso, pal, B, P) {
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = pal.shade;
  ctx.fill(torso);
  ctx.translate(0.35, -(B.chestDown * 0.48));
  ctx.fillStyle = pal.coat;
  ctx.fill(torso);
  ctx.restore();
}

function markings(ctx, B, S, P, hd, pal, parts, nearLegs, styleId, torso, neck) {
  const { T, J, R, noseX, lipY, mh } = hd;
  const clipTo = (paths, fn) => {
    ctx.save();
    const c = new Path2D(); for (const q of paths) c.addPath(q);
    ctx.clip(c); fn(); ctx.restore();
  };
  const skull = parts.find((q) => q.id === 'skull').path;
  const jaw = parts.find((q) => q.id === 'jaw').path;
  const fillP = (col, fn) => { ctx.fillStyle = col; ctx.beginPath(); fn(ctx); ctx.fill(); };
  if (B.marks === 'dobe') {
    // Tan points: muzzle and cheek, the pip over the eye, the chest, the lower legs.
    clipTo([skull, jaw], () => {
      fillP(pal.mark, (c) => {
        const a = T(R * 0.3, lipY - mh * 0.35), b = T(noseX + 0.3, lipY - mh * 0.2);
        const d = T(noseX + 0.3, lipY + 3), e = T(-R * 0.2, R * 1.3);
        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath();
      });
      const pip = T(R * 0.3, -R * 0.55);
      fillP(pal.mark, (c) => c.ellipse(pip.x, pip.y, R * 0.2, R * 0.13, P.tilt, 0, TAU));
    });
    clipTo([torso, neck], () => {
      fillP(pal.mark, (c) => c.ellipse(P.S.x + B.chestRx * 0.75, P.S.y + 0.2, 1.0, 1.25, 0.3, 0, TAU));
    });
    clipTo(nearLegs, () => {
      for (const lg of [P.fore, P.hind]) {
        fillP(pal.mark, (c) => c.arc(lg.foot.x, lg.foot.y, B.L * 0.3, 0, TAU));
      }
    });
  } else if (B.marks === 'blaze') {
    // White blaze: muzzle, down the throat, the chest; white feet.
    clipTo([skull, jaw], () => {
      fillP(pal.mark, (c) => {
        const a = T(R * 0.55, -R * 0.95), b = T(R * 0.95, -R * 0.95), d = T(noseX + 0.5, -R * 0.1);
        const e = T(noseX + 0.5, lipY + 4), f = T(R * 0.1, R * 1.2), g = T(R * 0.5, -R * 0.1);
        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.lineTo(f.x, f.y); c.lineTo(g.x, g.y); c.closePath();
      });
    });
    clipTo([torso, neck], () => {
      fillP(pal.mark, (c) => c.ellipse(P.S.x + B.chestRx * 0.7, P.S.y + B.chestDown * 0.2, 1.7, 2.4, 0.25, 0, TAU));
    });
    clipTo(nearLegs, () => {
      for (const lg of [P.fore, P.hind]) fillP(pal.mark, (c) => c.arc(lg.foot.x, lg.foot.y, B.L * 0.2, 0, TAU));
    });
  } else if (B.marks === 'wolf') {
    // Pale mask and underparts, dark saddle down the back.
    clipTo([skull, jaw], () => {
      fillP(pal.mark, (c) => {
        const a = T(-R * 0.2, R * 0.05), b = T(noseX - M_of(hd) * 0.4, lipY - mh * 0.15), d = T(noseX + 0.5, lipY + 0.2);
        const e = T(noseX + 0.5, lipY + 3), f = T(-R * 0.4, R * 1.2);
        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.lineTo(f.x, f.y); c.closePath();
      });
    });
    clipTo([torso], () => {
      const mx = (P.S.x + P.Hp.x) / 2, my = (P.S.y + P.Hp.y) / 2;
      ctx.globalAlpha = 0.7;
      fillP(pal.saddle, (c) => c.ellipse(mx + 0.3, my - B.chestUp * 0.95 - B.arch * 1.1, P.spine * 0.62, 1.5, -P.pitch, 0, TAU));
      ctx.globalAlpha = 1;
    });
    clipTo([neck], () => {
      fillP(pal.mark, (c) => c.ellipse(P.S.x + B.chestRx * 0.9, P.S.y - 0.6, 1.2, 2.2, 0.5, 0, TAU));
    });
  } else if (B.marks === 'collie') {
    // White ruff ring, blaze, socks, tail tip.
    clipTo([neck, torso], () => {
      fillP(pal.mark, (c) => {
        const a = P.Hc, s = P.S;
        c.ellipse(lerp(a.x, s.x, 0.62) + 0.4, lerp(a.y, s.y, 0.62) + 0.7, 1.7, 2.7, -0.5, 0, TAU);
      });
    });
    clipTo([skull, jaw], () => {
      fillP(pal.mark, (c) => {
        const a = T(R * 0.25, -R * 1.2), b = T(R * 0.75, -R * 1.2), d = T(noseX + 0.5, -R * 0.2);
        const e = T(noseX + 0.5, lipY + 4), f = T(R * 0.3, R * 1.2), g = T(R * 0.35, -R * 0.2);
        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.lineTo(f.x, f.y); c.lineTo(g.x, g.y); c.closePath();
      });
    });
    clipTo(nearLegs, () => {
      for (const lg of [P.fore, P.hind]) fillP(pal.mark, (c) => c.arc(lg.foot.x, lg.foot.y, B.L * 0.28, 0, TAU));
    });
    const tail = parts.find((q) => q.id === 'tail');
    if (tail) clipTo([tail.path], () => {
      const t0 = pt(P.Hp.x - B.rumpRx * 0.7 - 4.2, P.Hp.y - B.rumpUp * 0.55 + 0.6 + P.crouch * 2);
      fillP(pal.mark, (c) => c.arc(t0.x, t0.y, 1.3, 0, TAU));
    });
  }
  // A lit top plane on the skull and back: the heroes carry one.
  if (styleId !== 'line') {
    clipTo([skull], () => {
      const s = T(R * 0.2, -R * 1.3);
      ctx.fillStyle = 'rgba(255,246,232,0.14)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, R * 1.3, R * 0.75, P.tilt, 0, TAU); ctx.fill();
    });
  }
}
const M_of = (hd) => hd.M;

function ribs(ctx, torso, P, B, LW) {
  ctx.save(); ctx.clip(torso);
  ctx.strokeStyle = 'rgba(26,16,40,0.16)'; ctx.lineWidth = LW * 0.9;
  for (let i = 0; i < 3; i++) {
    const x = P.S.x - 1.4 - i * 0.95;
    ctx.beginPath();
    ctx.moveTo(x + 0.3, P.S.y - B.chestUp * 0.35);
    ctx.quadraticCurveTo(x - 0.35, P.S.y + 0.5, x + 0.15, P.S.y + B.chestDown * 0.55 - i * 0.15);
    ctx.stroke();
  }
  ctx.restore();
}

function posterFinish(ctx, all, parts, pal, B, P, hd, LW) {
  // One warm rim light along every top edge: the silhouette, shifted down and
  // filled back over itself in the body colour.
  ctx.save();
  ctx.clip(all);
  ctx.fillStyle = pal.rim;
  ctx.globalAlpha = 0.92;
  ctx.fill(all);
  ctx.globalAlpha = 1;
  ctx.translate(-0.12, 0.42);
  ctx.fillStyle = pal.body;
  ctx.fill(all);
  ctx.restore();
  // The mouth stays a mouth.
  ctx.fillStyle = MOUTH;
  ctx.fill(parts.find((q) => q.id === 'mouth').path);
}

function collar(ctx, B, P, pal, LW, styleId) {
  if (B.collar !== 'spiked') return;
  const { S: Sh, Hc, headR } = P;
  const ang = Math.atan2(Hc.y - Sh.y, Hc.x - Sh.x);
  const f = 0.52;
  const cx = lerp(Hc.x, Sh.x, f), cy = lerp(Hc.y, Sh.y, f);
  const half = B.neckW * 0.62 + headR * 0.18, thick = 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  // A band across the neck, drawn as one stroked rect in the same line.
  ctx.beginPath(); ctx.rect(-thick, -half, thick * 2, half * 2);
  ctx.fillStyle = styleId === 'poster' ? '#b0302a' : pal.collar;
  ctx.strokeStyle = INK; ctx.lineWidth = LW;
  ctx.fill(); ctx.stroke();
  // Studs ON the band, a row of three.
  ctx.fillStyle = '#d8d8e4';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.arc(0, i * half * 0.6, 0.26, 0, TAU); ctx.fill();
  }
  if (styleId === 'toon' && B.id !== 'bruiser' && B.marks === 'dobe') {
    // Corporate security: an ID tag swinging off the collar.
    ctx.rotate(-ang);
    const sw = Math.sin(P.flex * 3) * 0.3;
    ctx.translate(0.4, half * 0.6);
    ctx.rotate(sw);
    ctx.beginPath(); ctx.rect(-0.55, 0.2, 1.1, 1.3);
    ctx.fillStyle = '#e8f0fa'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a78c8'; ctx.fillRect(-0.55, 0.2, 1.1, 0.4);
  }
  ctx.restore();
}

function face(ctx, B, S, P, hd, pal, LW, styleId) {
  const { T, J, R, noseX, lipY, mh } = hd;
  const poster = styleId === 'poster';
  const toon = styleId === 'toon';
  // Teeth: two fangs each jaw, ON the lips, and a tongue in the gape.
  if (B.teeth) {
    const tk = 0.34 * B.teeth * (toon ? 1.15 : 1) * (poster ? 1.2 : 1);
    if (hd.gape > 0.3 && !poster) {
      const t0 = J(R * 0.55, lipY + mh * 0.2);
      const t1 = J(noseX - hd.M * 0.35, lipY + mh * 0.12);
      ctx.fillStyle = TONGUE;
      ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.quadraticCurveTo((t0.x + t1.x) / 2, (t0.y + t1.y) / 2 + 0.5, t1.x, t1.y);
      ctx.lineTo(t1.x - 0.1, t1.y - 0.35); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = TOOTH;
    const fang = (a, dir) => {
      ctx.beginPath();
      ctx.moveTo(a.x - tk * 0.45, a.y); ctx.lineTo(a.x + tk * 0.45, a.y); ctx.lineTo(a.x + tk * 0.1, a.y + dir * tk * 1.7);
      ctx.closePath(); ctx.fill();
    };
    fang(T(noseX - hd.M * 0.28, lipY - 0.05), 1);
    fang(T(noseX - hd.M * 0.72, lipY - 0.02), 1);
    fang(J(noseX - hd.M * 0.35, lipY + 0.15), -1);
    if (toon) fang(J(noseX - hd.M * 0.8, lipY + 0.15), -1);
  } else if (hd.gape > 0.2) {
    // The collie: a panting tongue, no teeth.
    const t0 = J(noseX - hd.M * 0.4, lipY + 0.2);
    ctx.fillStyle = TONGUE;
    ctx.beginPath(); ctx.ellipse(t0.x, t0.y + 0.35, 0.6, 0.38, 0.3, 0, TAU); ctx.fill();
  }
  // Nose.
  const n = T(noseX - 0.05, -R * 0.12);
  ctx.fillStyle = poster ? '#0c0a10' : '#17121c';
  ctx.beginPath(); ctx.ellipse(n.x, n.y, 0.5 * (toon ? 1.25 : 1), 0.38 * (toon ? 1.2 : 1), P.tilt, 0, TAU); ctx.fill();
  if (!poster) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(n.x + 0.12, n.y - 0.14, 0.12, 0, TAU); ctx.fill(); }
  // Eye.
  const e = T(R * 0.32, -R * 0.3);
  if (toon) {
    // The heroes' eye: a white almond, a big dark pupil, a glint, and a brow slab.
    const ew = R * 0.34, eh = R * 0.28;
    ctx.fillStyle = '#fdfaf4';
    ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = LW * 0.8; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.15, 0, TAU); ctx.clip();
    ctx.fillStyle = pal.eye;
    ctx.beginPath(); ctx.arc(e.x + ew * 0.3, e.y + eh * 0.08, eh * 0.78, 0, TAU); ctx.fill();
    ctx.fillStyle = '#150f1c';
    ctx.beginPath(); ctx.arc(e.x + ew * 0.36, e.y + eh * 0.08, eh * 0.46, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e.x + ew * 0.5, e.y - eh * 0.2, eh * 0.18, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = LW * 0.8;
    ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.15, 0, TAU); ctx.stroke();
    // Brow: the heaviest mark on the face, driven down toward the nose.
    const b0 = T(R * 0.02, -R * 0.78), b1 = T(R * 0.78, -R * 0.42);
    ctx.strokeStyle = '#15101e'; ctx.lineWidth = R * 0.2;
    if (!B.friendly) { ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke(); }
    return;
  }
  if (poster) {
    // Glowing slit, no sclera.
    ctx.fillStyle = pal.eye;
    ctx.beginPath(); ctx.moveTo(e.x - R * 0.34, e.y - R * 0.12); ctx.lineTo(e.x + R * 0.3, e.y + R * 0.02);
    ctx.lineTo(e.x - R * 0.2, e.y + R * 0.14); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.arc(e.x - R * 0.02, e.y + R * 0.01, R * 0.26, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  // B and E: a narrowed almond set well back, under a hard brow line.
  const ew = R * 0.3, eh = styleId === 'clump' ? R * 0.14 : R * 0.18;
  ctx.fillStyle = B.friendly ? '#2a1a10' : '#fdfaf4';
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.2, 0, TAU); ctx.fill();
  if (!B.friendly) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.2, 0, TAU); ctx.clip();
    ctx.fillStyle = pal.eye; ctx.beginPath(); ctx.arc(e.x + ew * 0.25, e.y, R * 0.16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#150f1c'; ctx.beginPath(); ctx.arc(e.x + ew * 0.3, e.y, R * 0.085, 0, TAU); ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x + ew * 0.3, e.y - eh * 0.3, eh * 0.3, 0, TAU); ctx.fill();
  }
  if (!B.friendly) {
    const b0 = T(-R * 0.02, -R * 0.62), b1 = T(R * 0.72, -R * 0.36);
    ctx.strokeStyle = 'rgba(21,16,30,0.85)'; ctx.lineWidth = R * 0.13;
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
    // The snarl: one crease over the muzzle.
    const w0 = T(R * 1.0, -R * 0.42), w1 = T(R * 1.35, -R * 0.2);
    ctx.strokeStyle = 'rgba(21,16,30,0.4)'; ctx.lineWidth = LW * 0.8;
    ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.quadraticCurveTo(w0.x + 0.25, w0.y + 0.05, w1.x, w1.y); ctx.stroke();
  }
}

function dust(ctx, P, phase) {
  for (const lg of [P.hind, P.hindFar]) {
    if (lg.foot.y < -0.05) continue;
    const k = 0.6 + 0.4 * Math.sin(phase * TAU * 3);
    ctx.fillStyle = 'rgba(214,200,172,0.42)';
    ctx.beginPath();
    ctx.ellipse(lg.foot.x - 1.2, -0.35, 0.95 * k, 0.4 * k, 0, 0, TAU);
    ctx.ellipse(lg.foot.x - 2.4, -0.7, 0.55 * k, 0.3 * k, 0, 0, TAU);
    ctx.fill();
  }
}

// ------------------------------------------------------------- rasterizing
// Candidates go through the same resample the game gives the shipped dogs: the
// painter's box is (box.w * 4/3 * VIS) world units wide, rasterized at detail x SS
// device pixels per BOX unit.
const rasters = new Map();
function roleArt(role, breed = role.breed, tall = role.tall) {
  const [bw, bh] = role.box;
  const aw = bw * 4 / 3 * role.vis, ah = bh * tall * 4 / 3 * role.vis;
  return { aw, ah, bw, bh: bh * tall };
}
function candidateRaster(role, styleId, frame, { breed = role.breed, tall = role.tall, longTail = role.id === 'finish' } = {}) {
  const name = role.id === 'finish' ? FINISH_SKINS.find((f) => f.breed === breed).skin : role.type;
  // B SHIPPED: its cards draw the real painter through the real raster cache.
  if (styleId === 'line') return propSprite(name, role.box[0], role.box[1] * tall, frame);
  const key = `${role.id}|${breed}|${styleId}|${frame}`;
  let c = rasters.get(key);
  if (c) return c;
  const { aw, ah, bw, bh } = roleArt(role, breed, tall);
  const px = role.detail * SS;                   // raster px per box unit
  if (styleId === 'now') {
    // A: the rig that shipped until 24 Sep, a copy (src/dev/dogs-was.js), rasterized
    // exactly as propSprite rasterized it.
    c = document.createElement('canvas');
    c.width = Math.round(bw * px); c.height = Math.round(bh * px);
    const g0 = c.getContext('2d');
    g0.scale(SS, SS);
    WAS_DOG_PAINTERS[name](g0, bw * role.detail, bh * role.detail, frame);
    rasters.set(key, c);
    return c;
  }
  c = document.createElement('canvas');
  c.width = Math.round(bw * px); c.height = Math.round(bh * px);
  const g = c.getContext('2d');
  const s = c.width / aw;                         // raster px per world unit
  g.setTransform(s, 0, 0, s, c.width / 2, c.height);
  // Every take is FITTED to the art box over its whole cycle: the tallest ear and the
  // longest reach across all eight frames touch the box, so a candidate stands on
  // screen as large as the shipped dog does (a gallop is longer and lower than the
  // shipped trot, and unfitted it read a size smaller in the lane).
  const fit = dogFit(breed, styleId, longTail, aw, ah);
  g.scale(fit.k, fit.k);
  g.translate(fit.dx, 0);
  paintDog(g, breed, styleId, frame / FRAMES, { longTail });
  rasters.set(key, c);
  return c;
}
// The union of a take's ink over all eight frames, measured once off an unclipped
// render, and the scale + x shift that seat it in an aw x ah box (feet on the floor).
const fits = new Map();
function dogBounds(breed, styleId, longTail) {
  const key = `${breed}|${styleId}|${longTail ? 1 : 0}`;
  let b = fits.get(key);
  if (b) return b;
  const PX = 8, CW = 480, CH = 320, OX = 240, OY = 280;
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const g = c.getContext('2d', { willReadFrequently: true });
  for (let f = 0; f < FRAMES; f++) {
    g.setTransform(PX, 0, 0, PX, OX, OY);
    paintDog(g, breed, styleId, f / FRAMES, { longTail, noDust: true });
  }
  const d = g.getImageData(0, 0, CW, CH).data;
  let x0 = CW, x1 = 0, y0 = CH;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (d[(y * CW + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  b = { minX: (x0 - OX) / PX, maxX: (x1 + 1 - OX) / PX, minY: (y0 - OY) / PX };
  fits.set(key, b);
  return b;
}
function dogFit(breed, styleId, longTail, aw, ah) {
  const b = dogBounds(breed, styleId, longTail);
  const k = Math.min((aw * 0.97) / (b.maxX - b.minX), (ah * 0.975) / -b.minY);
  return { k, dx: -(b.minX + b.maxX) / 2 };
}

// ----------------------------------------------------------- the lane draw
// Mirrors drawWorldEntity for a self-outlined ground animal: contact shadow, the red
// AVOID tick, then the art (box x 4/3 x VISUAL, TALL above, bottom-anchored).
function frameAt(t, fps, x) { return Math.floor(t * fps + ((x * 0.05) % TAU) * 4) % FRAMES; }
export function drawDogEntity(ctx, roleId, styleId, worldX, camX, t, pack, { skin = null } = {}) {
  const role = ROLE[roleId];
  if (styleId === 'line') {
    const e = makeObstacle(role.type, worldX);
    if (role.id === 'finish') e.skin = skin || role.skin;
    drawWorldEntity(ctx, e, camX, t, pack, { smoothMotion: true });
    return;
  }
  const fs = skin ? FINISH_SKINS.find((f) => f.skin === skin) : null;
  const breed = fs ? fs.breed : role.breed;
  const tall = role.id === 'finish' && fs ? fs.tall : role.tall;
  const fps = fs ? fs.fps : role.fps;
  const [bw, bh] = role.box;
  const x = worldX - camX;
  drawSoftContactShadow(ctx, x + bw / 2, GROUND_Y - 1, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  ctx.fillStyle = 'rgba(224,72,72,0.32)';
  ctx.fillRect(x, GROUND_Y - 1, bw, 1);
  const img = candidateRaster(role, styleId, frameAt(t, fps, worldX), { breed, tall });
  const w0 = Math.round(bw * 4 / 3 * role.vis), h0 = Math.round(bh * 4 / 3 * tall * role.vis);
  const ox = x - Math.floor((w0 - bw) / 2);
  const oy = GROUND_Y - bh - (h0 - bh);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, ox, oy, w0, h0);
  ctx.imageSmoothingEnabled = prev;
}

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// The whole 480x270 landscape frame: the role's own cabinet, the hero on his mark,
// the dog 58u ahead of him on the road.
export const DOG_AHEAD = 58;
export function drawDogScene(ctx, t, roleId, styleId, cab, pack, { skin = null } = {}) {
  const camX = 1200 + t * 60;
  pack.bg(ctx, t, camX, cab, 1000, cab.id === 'rhythm' ? { stageIndex: 1 } : null);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  drawDogEntity(ctx, roleId, styleId, camX + PLAYER_X + DOG_AHEAD, camX, t, pack, { skin });
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (pack.weather) pack.weather(ctx, t);
}

// A crop of the PORTRAIT frame (a 390x844 phone): the run's 3.5 world zoom, the hero
// on the portrait anchor (heroAnchorX 16), the groundline where portrait puts it.
// The backdrop is the landscape painter scaled by the portrait background zoom about
// the groundline — the lane is what is being judged here, not the scenery bands.
export const PORTRAIT_TILE = { w: 480, h: 560 };
const PORTRAIT_Z = 3.5, PORTRAIT_HERO_X = 16, PORTRAIT_GROUND = 430;
export function drawDogPortrait(ctx, t, roleId, styleId, cab, pack, { skin = null } = {}) {
  const camX = 1200 + t * 60;
  const { w, h } = PORTRAIT_TILE;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, cab.sky?.[0] || '#78c8f0'); sky.addColorStop(1, cab.sky?.[1] || '#bfe6f8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  // Backdrop: scaled 480/270 about the groundline, groundline at PORTRAIT_GROUND.
  ctx.save();
  const bz = 480 / 270;
  ctx.translate(240, PORTRAIT_GROUND);
  ctx.scale(bz, bz);
  ctx.translate(-240, -GROUND_Y);
  try { pack.bg(ctx, t, camX, cab, 1000, cab.id === 'rhythm' ? { stageIndex: 1 } : null); } catch { /* sky only */ }
  ctx.restore();
  ctx.fillStyle = cab.groundDark || '#303030'; ctx.fillRect(0, PORTRAIT_GROUND, w, h - PORTRAIT_GROUND);
  ctx.save();
  const xOff = (PORTRAIT_HERO_X - PLAYER_X) * PORTRAIT_Z;
  applyWorld(ctx, PORTRAIT_Z, PORTRAIT_GROUND - GROUND_Y, GROUND_Y, xOff);
  const viewW = (w - xOff) / PORTRAIT_Z;
  pack.ground(ctx, camX, cab, [], [], t * 60, viewW);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  drawDogEntity(ctx, roleId, styleId, camX + PLAYER_X + 72, camX, t, pack, { skin });
  ctx.restore();
  ctx.restore();
}

// The 6x close-up: the dog alone at 6 logical px per world unit, on its cabinet's
// sky and ground, wall-clock animated through the same raster the lane uses.
export const CLOSE_Z = 6;
export function drawDogCloseUp(ctx, t, roleId, styleId, cab, w, h, { skin = null } = {}) {
  const role = ROLE[roleId];
  closeBack(ctx, cab, w, h);
  const floor = h - 14;
  const fs = skin ? FINISH_SKINS.find((f) => f.skin === skin) : null;
  const tall = fs ? fs.tall : role.tall;
  const [bw, bh] = role.box;
  const w0 = bw * 4 / 3 * role.vis, h0 = bh * tall * 4 / 3 * role.vis;
  ctx.save();
  ctx.translate(w / 2, floor);
  ctx.scale(CLOSE_Z, CLOSE_Z);
  const fps = fs ? fs.fps : role.fps;
  const frame = Math.floor(t * fps) % FRAMES;
  drawSoftContactShadow(ctx, 0, -0.5, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  const img = candidateRaster(role, styleId, frame, { breed: fs ? fs.breed : role.breed, tall });
  ctx.imageSmoothingEnabled = true;
  if (img) ctx.drawImage(img, -w0 / 2, -h0, w0, h0);
  // The hitbox, dashed: nothing about it moves.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1 / CLOSE_Z * 1.2;
  ctx.setLineDash([2 / CLOSE_Z * 2, 2 / CLOSE_Z * 2]);
  ctx.strokeRect(-bw / 2, -bh, bw, bh);
  ctx.setLineDash([]);
  ctx.restore();
}
function closeBack(ctx, cab, w, h) {
  const floor = h - 14;
  const g = ctx.createLinearGradient(0, 0, 0, floor);
  g.addColorStop(0, cab.sky?.[0] || '#9cc8e8'); g.addColorStop(1, cab.sky?.[1] || '#d8ecf8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, floor);
  ctx.fillStyle = cab.ground || '#6a8a4a'; ctx.fillRect(0, floor, w, 3);
  ctx.fillStyle = cab.groundDark || '#3a4a2a'; ctx.fillRect(0, floor + 3, w, h - floor - 3);
}

// The full run cycle: all eight frames side by side, each the lane raster at 4
// logical px per world unit, with the ground line and a tick where each foot is down.
export const STRIP_Z = 4;
export function stripSize(roleId) {
  const role = ROLE[roleId];
  const [bw, bh] = role.box;
  const w0 = bw * 4 / 3 * role.vis, h0 = bh * role.tall * 4 / 3 * role.vis * (roleId === 'finish' ? 1 : 1.1);
  return { cw: Math.ceil(w0 * STRIP_Z) + 6, w: (Math.ceil(w0 * STRIP_Z) + 6) * FRAMES, h: Math.ceil(h0 * STRIP_Z) + 22 };
}
export function drawDogStrip(ctx, roleId, styleId, cab, { skin = null } = {}) {
  const role = ROLE[roleId];
  const { cw, w, h } = stripSize(roleId);
  const fs = skin ? FINISH_SKINS.find((f) => f.skin === skin) : null;
  const tall = fs ? fs.tall : role.tall;
  const [bw, bh] = role.box;
  const w0 = bw * 4 / 3 * role.vis, h0 = bh * tall * 4 / 3 * role.vis;
  ctx.fillStyle = '#ecebe6'; ctx.fillRect(0, 0, w, h);
  const floor = h - 16;
  for (let f = 0; f < FRAMES; f++) {
    const x0 = f * cw;
    ctx.fillStyle = f % 2 ? '#e2e1db' : '#ecebe6'; ctx.fillRect(x0, 0, cw, h);
    ctx.fillStyle = '#b9b4a8'; ctx.fillRect(x0, floor, cw, 1);
    const img = candidateRaster(role, styleId, f, { breed: fs ? fs.breed : role.breed, tall });
    ctx.imageSmoothingEnabled = true;
    if (img) ctx.drawImage(img, x0 + cw / 2 - w0 * STRIP_Z / 2, floor - h0 * STRIP_Z, w0 * STRIP_Z, h0 * STRIP_Z);
    ctx.fillStyle = '#6a655c';
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(String(f), x0 + 4, h - 4);
  }
}

// ------------------------------------------------------------- the kennel
// One style, every dog: the three lane dogs, the finish guard in all three skins,
// and the collie, side by side at 4 logical px per world unit on a neutral floor.
export const KENNEL = { w: 1180, h: 150 };
export function drawDogKennel(ctx, t, styleId) {
  const { w, h } = KENNEL;
  ctx.fillStyle = '#eceae3'; ctx.fillRect(0, 0, w, h);
  const floor = h - 18;
  ctx.fillStyle = '#c9c3b5'; ctx.fillRect(0, floor, w, 2);
  const Z = 4;
  let x = 12;
  const put = (img, aw, ah, label) => {
    ctx.imageSmoothingEnabled = true;
    if (img) ctx.drawImage(img, x, floor - ah * Z, aw * Z, ah * Z);
    ctx.fillStyle = '#6a655c'; ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(label, x, h - 5);
    x += aw * Z + 14;
  };
  for (const id of ['bruiser', 'snarler', 'feral']) {
    const role = ROLE[id];
    const { aw, ah, bw, bh } = roleArt(role);
    const f = Math.floor(t * role.fps) % FRAMES;
    const img = candidateRaster(role, styleId, f);
    put(img, aw, ah, role.name);
  }
  for (const fs of FINISH_SKINS) {
    const role = ROLE.finish;
    const [bw, bh] = role.box;
    const aw = bw * 4 / 3 * role.vis, ah = bh * fs.tall * 4 / 3 * role.vis;
    const f = Math.floor(t * fs.fps) % FRAMES;
    const img = candidateRaster(role, styleId, f, { breed: fs.breed, tall: fs.tall });
    put(img, aw, ah, 'FINISH/' + fs.breed.toUpperCase());
  }
}

// ================================================================= THE COLLIE
// Card A is a faithful copy of stylePacks/plumberLandmarks.js drawCollie (not
// exported) with that file's paper-cut helpers; B–E are the rig in collie trim,
// run out and back along the crest with the same clock, crouching at each turn.
const FLOCK = {
  dog: '#26221f', dogShade: '#141210', dogWhite: '#f4f1ea', dogWhiteShade: '#d6d0c4',
  eye: '#f4efe6', nose: '#1f1a17', tongue: '#e0707a', shadow: 'rgba(28,64,30,0.22)',
};
const grainCache = new WeakMap();
function grain(ctx) {
  let p = grainCache.get(ctx);
  if (p === undefined) {
    const src = paperTextureSource('cardstockClear');
    p = src && typeof ctx.createPattern === 'function' ? ctx.createPattern(src, 'repeat') : null;
    if (p && typeof p.setTransform === 'function' && typeof DOMMatrix === 'function') {
      p.setTransform(new DOMMatrix().scale(PAPER_PATTERN_SCALE));
    }
    grainCache.set(ctx, p);
  }
  return p;
}
function pcut(ctx, fn, fill, o = {}) {
  const p = P2(fn);
  const lift = o.lift ?? 1;
  ctx.save();
  if (lift > 0) {
    const r = -(o.rot || 0), cs = Math.cos(r), sn = Math.sin(r), fx = o.fx || 1;
    const off = (ox, oy) => [(ox * fx * cs - oy * sn) * lift, (ox * fx * sn + oy * cs) * lift];
    const [dx, dy] = off(1, 2);
    const [cx, cy] = off(0.35, 0.75);
    ctx.fillStyle = 'rgba(15,23,36,0.055)';
    ctx.translate(dx, dy); ctx.fill(p);
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    ctx.translate(cx - dx, cy - dy); ctx.fill(p);
    ctx.translate(-cx, -cy);
  }
  ctx.fillStyle = fill; ctx.fill(p);
  const g = grain(ctx);
  if (g) { ctx.save(); ctx.clip(p); ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.fill(p); ctx.restore(); }
  if (o.rim !== false) {
    ctx.save(); ctx.clip(p);
    ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.lineWidth = 2 * (typeof o.rim === 'number' ? o.rim : 1.15) * 0.5;
    ctx.stroke(p); ctx.restore();
  }
  ctx.restore();
  return p;
}
function ptone(ctx, clip, fn, fill) { ctx.save(); ctx.clip(clip); ctx.fillStyle = fill; ctx.beginPath(); fn(ctx); ctx.fill(); ctx.restore(); }
function pline(ctx, col, w, fn) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); fn(ctx); ctx.stroke(); }
function pdot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function pflat(ctx, col, fn) { ctx.fillStyle = col; ctx.beginPath(); fn(ctx); ctx.fill(); }
function collieNow(ctx, x, y, s, dir, run, crouch) {
  const P = FLOCK;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir };
  const st = Math.sin(run), ct = Math.cos(run);
  const gait = 1 - crouch;
  pflat(ctx, P.shadow, (c) => c.ellipse(0, 0.2, 5.8, 0.9, 0, 0, TAU));
  const by = -4.9 + crouch * 2.1 - Math.abs(ct) * 0.5 * gait;
  const pitch = -0.08 * st * gait + crouch * 0.05;
  const leg = (px, py, a, hind, col, sock) => {
    const L1 = (hind ? 2.4 : 2.2) - crouch * 0.6, L2 = (hind ? 2.6 : 2.5) - crouch * 0.7;
    const kx = px + Math.sin(a) * L1, ky = py + Math.cos(a) * L1;
    const b = a + (hind ? 0.9 : -0.6) * (0.4 + 0.6 * gait);
    const fx = kx + Math.sin(b) * L2, fy = Math.min(0, ky + Math.cos(b) * L2);
    pline(ctx, col, 1.2, (c) => { c.moveTo(px, py); c.lineTo(kx, ky); });
    pline(ctx, col, 0.9, (c) => { c.moveTo(kx, ky); c.lineTo(fx, fy); });
    pline(ctx, sock, 0.95, (c) => { c.moveTo(lerp(kx, fx, 0.45), lerp(ky, fy, 0.45)); c.lineTo(fx, fy); });
  };
  const fore = 0.95 * st * gait, hind = -0.95 * st * gait;
  leg(3.4, by + 0.9, fore - 0.25, false, P.dogShade, P.dogWhiteShade);
  leg(-3.4, by + 0.6, hind + 0.2, true, P.dogShade, P.dogWhiteShade);
  ctx.save();
  ctx.translate(0, by);
  ctx.rotate(pitch);
  const po = { ...o, rot: pitch };
  const tl = crouch * 1.6;
  const tail = pcut(ctx, (c) => {
    c.moveTo(-4.6, -0.9);
    c.quadraticCurveTo(-8, -2.6 + st * 0.8 + tl, -10.4, -0.6 + st * 0.5 + tl * 1.6);
    c.quadraticCurveTo(-8.2, 0.6 + tl, -4.6, 0.9);
    c.closePath();
  }, P.dog, { ...po, lift: 0.4, rim: 0.5 });
  ptone(ctx, tail, (c) => c.arc(-10, -0.5 + st * 0.5 + tl * 1.6, 1.6, 0, TAU), P.dogWhite);
  const body = pcut(ctx, (c) => {
    c.moveTo(-5.2, -0.6);
    c.quadraticCurveTo(-4.6, -2.3, -1, -2.2);
    c.quadraticCurveTo(3, -2.4, 4.9, -1.2);
    c.quadraticCurveTo(5.8, 0.6, 4.4, 2);
    c.quadraticCurveTo(2.4, 2.8, 0.4, 1.4);
    c.quadraticCurveTo(-2.4, 1.2, -4.4, 1.3);
    c.quadraticCurveTo(-5.8, 0.8, -5.2, -0.6);
    c.closePath();
  }, P.dog, { ...po, lift: 0.6, rim: 0.6 });
  ptone(ctx, body, (c) => { c.moveTo(0, 1.1); c.quadraticCurveTo(3.4, 0.4, 6, -0.2); c.lineTo(6, 4); c.lineTo(0, 4); c.closePath(); }, P.dogWhite);
  ptone(ctx, body, (c) => c.ellipse(-1, -1.6, 3.4, 0.5, 0, 0, TAU), '#3a3430');
  const ruff = pcut(ctx, (c) => c.ellipse(4.1, -0.6, 1.4, 2.1, 0.35, 0, TAU), P.dogWhite, { ...po, lift: 0.3, rim: 0.4 });
  ptone(ctx, ruff, (c) => c.ellipse(4.8, 0.4, 1.2, 1.4, 0, 0, TAU), P.dogWhiteShade);
  ctx.restore();
  leg(3.9, by + 1.1, fore + 0.15, false, P.dog, P.dogWhite);
  leg(-2.8, by + 0.8, hind - 0.2, true, P.dog, P.dogWhite);
  const hx = 6.3 + crouch * 0.6, hy = by - 2.5 + crouch * 1.6 + ct * 0.3 * gait;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(crouch * 0.18);
  const ho = { ...o, rot: crouch * 0.18 };
  pcut(ctx, (c) => { c.moveTo(-1.3, -0.7); c.lineTo(-0.9, -3.1); c.lineTo(0, -1.1); c.closePath(); }, P.dogShade, { ...ho, lift: 0.3, rim: 0.35 });
  const skull = pcut(ctx, (c) => {
    c.moveTo(-1.8, 0.4);
    c.quadraticCurveTo(-1.6, -1.8, 0.4, -1.6);
    c.quadraticCurveTo(1.6, -1.4, 2.2, -0.5);
    c.lineTo(3.7, -0.1);
    c.quadraticCurveTo(4.1, 0.5, 3.5, 0.9);
    c.lineTo(1.4, 1.3);
    c.quadraticCurveTo(-0.6, 1.9, -1.8, 0.4);
    c.closePath();
  }, P.dog, { ...ho, lift: 0.4, rim: 0.5 });
  ptone(ctx, skull, (c) => { c.moveTo(0.3, -1.8); c.lineTo(0.9, -1.8); c.lineTo(2.3, -0.3); c.lineTo(4, 0); c.lineTo(4, 1.6); c.lineTo(1.2, 1.6); c.quadraticCurveTo(1.6, 0.2, 0.3, -1.8); c.closePath(); }, P.dogWhite);
  pcut(ctx, (c) => { c.moveTo(-0.3, -1.3); c.lineTo(0.6, -3.2); c.quadraticCurveTo(1.3, -2.9, 1.2, -2.3); c.lineTo(0.9, -2.5); c.lineTo(0.9, -1.2); c.closePath(); }, P.dog, { ...ho, lift: 0.3, rim: 0.35 });
  pdot(ctx, 1.2, -0.7, 0.42, P.eye);
  pdot(ctx, 1.3, -0.7, 0.26, P.nose);
  pdot(ctx, 3.8, 0.1, 0.4, P.nose);
  if (gait > 0.4) pflat(ctx, P.tongue, (c) => c.ellipse(2.6, 1.55, 0.75, 0.38, 0.3, 0, TAU));
  ctx.restore();
  if (gait > 0.2 && gait < 0.95) {
    for (let k = 0; k < 3; k++) pdot(ctx, -5 - k * 1.8, -0.4 - k * 0.5, 0.55 - k * 0.12, `rgba(210,196,160,${0.55 * (1 - gait) + 0.15})`);
  }
  ctx.restore();
}
// A candidate collie as ONE paper sheet: the rig drawn into an offscreen canvas at
// the ctx's device scale, then laid with the pack's paper drop, grain and rim.
const collieBuf = { c: null };
function collieCandidate(ctx, styleId, x, y, s, dir, phase, crouch) {
  const m = ctx.getTransform();
  const dev = Math.hypot(m.a, m.b) * s;
  const PAD = 14;
  const bw = 34, bh = 22;
  const cw = Math.ceil(bw * dev), ch = Math.ceil(bh * dev);
  if (!collieBuf.c) collieBuf.c = document.createElement('canvas');
  const c = collieBuf.c;
  if (c.width < cw || c.height < ch) { c.width = Math.max(c.width, cw); c.height = Math.max(c.height, ch); }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.setTransform(dev * -dir, 0, 0, dev, cw / 2, ch - 2 * dev);
  paintDog(g, 'collie', styleId, phase, { crouch, noDust: true });
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // The paper drop, then the sheet.
  pflat(ctx, FLOCK.shadow, (k) => k.ellipse(0, 0.2, 5.8, 0.9, 0, 0, TAU));
  const sx = -bw / 2, sy = -bh + 2;
  ctx.globalAlpha = 0.07;
  ctx.filter = 'brightness(0)';
  ctx.drawImage(c, 0, 0, cw, ch, sx + 0.5, sy + 1, bw, bh);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.drawImage(c, 0, 0, cw, ch, sx, sy, bw, bh);
  ctx.restore();
  void PAD;
}
// The collie's run, the flock's own clock (drawPlumberSheep): out and back 56 px
// either side of the flock centre, crouching at each turn.
export function collieState(t) {
  const dp = t * 0.75;
  const v = Math.cos(dp);
  return { dx: Math.sin(dp) * 56, dir: v >= 0 ? 1 : -1, crouch: smooth(1 - Math.abs(v) * 2.4), run: t * 15 };
}
// B (ported, then REVERTED 24 Sep for the paper finish): the B collie, as plumberLandmarks.js drawCollie would lay it (shadow,
// the sprites/dogs.js dog, dust out of the crouch).
function collieShipped(ctx, x, y, s, dir, run, crouch) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  pflat(ctx, FLOCK.shadow, (c) => c.ellipse(0, 0.2, 5.8, 0.9, 0, 0, TAU));
  drawCollieDog(ctx, run / TAU, crouch);
  const gait = 1 - crouch;
  if (gait > 0.2 && gait < 0.95) {
    for (let k = 0; k < 3; k++) pdot(ctx, -5 - k * 1.8, -0.4 - k * 0.5, 0.55 - k * 0.12, `rgba(210,196,160,${0.55 * (1 - gait) + 0.15})`);
  }
  ctx.restore();
}
export function drawCollieAt(ctx, styleId, x, y, t, s = 1.55 * 1.05) {
  const st = collieState(t);
  if (styleId === 'line') collieShipped(ctx, x + st.dx, y, s, st.dir, st.run, st.crouch);
  else if (styleId === 'now') collieNow(ctx, x + st.dx, y, s, st.dir, st.run, st.crouch);
  else collieCandidate(ctx, styleId, x + st.dx, y, s, st.dir, ((st.run / TAU) % 1), st.crouch);
}
// The collie on the plumber near ridge: the real backdrop, the dog running its crest
// line at the real backdrop scale (the flock centre is pinned to the frame so the
// run stays in view).
export function drawCollieScene(ctx, t, styleId, cab, pack) {
  const camX = 1200 + t * 60;
  pack.bg(ctx, t, camX, cab, 1000, null);
  const x = 300, y = 170;
  drawCollieAt(ctx, styleId, x, y, t);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}
// 6x close-up of the collie alone on a grass line.
export function drawCollieCloseUp(ctx, t, styleId, w, h, { fixed = null } = {}) {
  ctx.fillStyle = '#a8e0f8'; ctx.fillRect(0, 0, w, h);
  const floor = h - 12;
  ctx.fillStyle = '#3a9c48'; ctx.fillRect(0, floor, w, h - floor);
  ctx.save();
  ctx.translate(w / 2, floor);
  // 6 logical px per backdrop px: the collie at six times the size it runs the ridge.
  ctx.scale(CLOSE_Z, CLOSE_Z);
  const st = fixed || collieState(t);
  const S0 = 1.55 * 1.05;
  if (styleId === 'line') collieShipped(ctx, 0, 0, S0, st.dir, st.run, st.crouch);
  else if (styleId === 'now') collieNow(ctx, 0, 0, S0, st.dir, st.run, st.crouch);
  else collieCandidate(ctx, styleId, 0, 0, S0, st.dir, ((st.run / TAU) % 1), st.crouch);
  ctx.restore();
}

// =================================================================== THE SIGN
// dogSign: a 13x9 box, TALL 1.5, detail 3, VISUAL 1.3, a `sign` (run through it).
// Painters take (ctx, w, h) in the raster's box like every prop painter, and must
// keep EVERYTHING inside 0..w x 0..h (the raster clips).
export const DOG_SIGN_CANDIDATES = [
  { id: 'was', letter: 'A', name: 'WAS — red board, cream panel, dog head',
    note: 'What shipped until 24 Sep (a faithful copy of the old props.js dogSign, now replaced by E). A red board on the jump sign\'s post with a cream panel and a left-facing dog head punched out in dark. At lane size the head is a dark blot on a pale square.' },
  { id: 'triangle', letter: 'B', name: 'WARNING TRIANGLE — running dog',
    note: 'The road-sign grammar every player already knows: a red-rimmed white triangle, a black dog in full gallop inside it, running the way the real one will come. The whole body rather than a head, because a running silhouette is still a dog at 8 px and a head is not.' },
  { id: 'plate', letter: 'C', name: 'ENAMEL PLATE, REDRAWN',
    note: 'NOW\'s idea done properly: a square red enamel plate with a white rim and two screws, and a doberman head in profile that fills it — cropped ears, open jaw, two fangs, one eye — cut from a single clean silhouette.' },
  { id: 'plank', letter: 'D', name: 'FARM PLANK — DOG!',
    note: 'The plumber farm\'s own sign: a weathered plank nailed crooked to a stake, DOG! hand-painted in red in three strokes (three letters survive the lane the way JUMP\'s four do), and a bite taken out of the corner. Tells the joke before the dog arrives.' },
  { id: 'paw', letter: 'E', name: 'BITTEN DISC — paw print · SHIPS (24 Sep)', ships: true,
    note: 'SHIPPED 24 Sep — Peter: "yes to the paw sign with the bite". Drawn here by the real props.js dogSign. A round red disc with a white ring and a big white paw print — the most legible dog mark there is at tiny sizes — and a semicircle bitten out of its edge with the tooth marks left in. Shape and bite say dog before the paw does.' },
];
const SIGN_BOX = [13, 9], SIGN_TALL = 1.5, SIGN_DETAIL = 3, SIGN_VIS = 1.3;
const SIGN_INK = 'rgba(26,16,40,0.55)';
const signRasters = new Map();
function signRaster(id) {
  let c = signRasters.get(id);
  if (c) return c;
  const [bw, bh0] = SIGN_BOX;
  const bh = bh0 * SIGN_TALL;
  const rw = bw * SIGN_DETAIL, rh = bh * SIGN_DETAIL;
  c = document.createElement('canvas');
  c.width = rw * SS; c.height = rh * SS;
  const g = c.getContext('2d');
  g.scale(SS, SS);
  SIGN_PAINTERS[id](g, rw, rh);
  signRasters.set(id, c);
  return c;
}
function tintedOf(src, color) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
const rimCache = new Map();
export function drawSignEntity(ctx, id, worldX, camX, t, pack) {
  if (id === 'now' || id === 'paw') {
    const e = makeObstacle('dogSign', worldX);
    drawWorldEntity(ctx, e, camX, t, pack, { smoothMotion: true });
    return;
  }
  const [bw, bh] = SIGN_BOX;
  const x = worldX - camX;
  drawSoftContactShadow(ctx, x + bw / 2, GROUND_Y - 1, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  ctx.fillStyle = 'rgba(224,72,72,0.32)';
  ctx.fillRect(x, GROUND_Y - 1, bw, 1);
  const w0 = Math.round(bw * 4 / 3 * SIGN_VIS), h0 = Math.round(bh * 4 / 3 * SIGN_TALL * SIGN_VIS);
  const ox = x - Math.floor((w0 - bw) / 2), oy = GROUND_Y - bh - (h0 - bh);
  const img = signRaster(id);
  // The shared two-pass hazard rim, exactly as the run lays it round the shipped sign.
  let rims = rimCache.get(id);
  if (!rims) { rims = { lite: tintedOf(img, '#f0f0f8'), dark: tintedOf(img, '#101018') }; rimCache.set(id, rims); }
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5);
  ctx.drawImage(rims.lite, ox - 1, oy, w0, h0); ctx.drawImage(rims.lite, ox + 1, oy, w0, h0);
  ctx.globalAlpha = 0.22;
  ctx.drawImage(rims.dark, ox, oy - 1, w0, h0); ctx.drawImage(rims.dark, ox, oy + 1, w0, h0);
  ctx.globalAlpha = 1;
  ctx.drawImage(img, ox, oy, w0, h0);
  ctx.imageSmoothingEnabled = prev;
}
export function drawSignScene(ctx, t, id, cab, pack) {
  const camX = 1200 + t * 60;
  pack.bg(ctx, t, camX, cab, 1000, null);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  drawSignEntity(ctx, id, camX + PLAYER_X + 46, camX, t, pack);
  // The dog it warns about, a screen on — the shipped finish dog, for the pairing.
  drawDogEntity(ctx, 'finish', 'line', camX + PLAYER_X + 150, camX, t, pack);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}
export function drawSignPortrait(ctx, t, id, cab, pack) {
  const camX = 1200 + t * 60;
  const { w, h } = PORTRAIT_TILE;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, cab.sky?.[0] || '#78c8f0'); sky.addColorStop(1, cab.sky?.[1] || '#bfe6f8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.save();
  const bz = 480 / 270;
  ctx.translate(240, PORTRAIT_GROUND); ctx.scale(bz, bz); ctx.translate(-240, -GROUND_Y);
  try { pack.bg(ctx, t, camX, cab, 1000, null); } catch { /* sky only */ }
  ctx.restore();
  ctx.fillStyle = cab.groundDark || '#303030'; ctx.fillRect(0, PORTRAIT_GROUND, w, h - PORTRAIT_GROUND);
  ctx.save();
  const xOff = (PORTRAIT_HERO_X - PLAYER_X) * PORTRAIT_Z;
  applyWorld(ctx, PORTRAIT_Z, PORTRAIT_GROUND - GROUND_Y, GROUND_Y, xOff);
  pack.ground(ctx, camX, cab, [], [], t * 60, (w - xOff) / PORTRAIT_Z);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  drawSignEntity(ctx, id, camX + PLAYER_X + 70, camX, t, pack);
  ctx.restore();
  ctx.restore();
}
export function drawSignCloseUp(ctx, t, id, cab, w, h) {
  closeBack(ctx, cab, w, h);
  const floor = h - 14;
  const [bw, bh] = SIGN_BOX;
  const w0 = bw * 4 / 3 * SIGN_VIS, h0 = bh * 4 / 3 * SIGN_TALL * SIGN_VIS;
  ctx.save();
  ctx.translate(w / 2, floor);
  ctx.scale(CLOSE_Z, CLOSE_Z);
  const img = (id === 'now' || id === 'paw') ? propSprite('dogSign', bw, bh * SIGN_TALL, 0) : signRaster(id);
  ctx.imageSmoothingEnabled = true;
  if (img) ctx.drawImage(img, -w0 / 2, -h0, w0, h0);
  ctx.restore();
}

// ---- sign painters (box units: w = 39, h = 40.5 at detail 3)
function signPost(ctx, w, h, top, col = '#7a5230') {
  const postX = w * 0.455, postW = w * 0.085;
  ctx.beginPath(); ctx.rect(postX, top, postW, h - top);
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = SIGN_INK; ctx.lineWidth = Math.max(w, h) * 0.02; ctx.stroke();
  ctx.fillStyle = 'rgba(40,24,12,0.35)'; ctx.fillRect(postX + postW * 0.58, top, postW * 0.42, h - top);
}
// The running dog pictogram, facing left, in a unit box (-1..1), one closed path.
function runningDogPath(p, X, Y) {
  smoothClosed(p, [
    pt(X(-0.98), Y(-0.22)),  // nose
    pt(X(-0.72), Y(-0.44)),  // stop
    pt(X(-0.56), Y(-0.86)),  // ear tip
    pt(X(-0.42), Y(-0.46)),  // back of skull
    pt(X(-0.18), Y(-0.36)),  // withers
    pt(X(0.30), Y(-0.30)),   // back
    pt(X(0.62), Y(-0.34)),   // croup
    pt(X(0.98), Y(-0.62)),   // tail tip
    pt(X(0.80), Y(-0.20)),   // tail underside
    pt(X(0.66), Y(0.02)),    // buttock
    pt(X(0.98), Y(0.58)),    // hind foot, stretched back
    pt(X(0.80), Y(0.62)),
    pt(X(0.40), Y(0.10)),    // hind leg front / stifle
    pt(X(0.08), Y(0.14)),    // tucked belly
    pt(X(-0.26), Y(0.18)),   // brisket
    pt(X(-0.70), Y(0.62)),   // fore foot, reaching
    pt(X(-0.84), Y(0.54)),
    pt(X(-0.46), Y(0.04)),   // chest
    pt(X(-0.66), Y(-0.02)),  // throat
    pt(X(-0.96), Y(-0.02)),  // jaw
  ], 0.55);
}
// A bite out of a board: a toothed circle erased from whatever is under it, and its
// edge inked where it crosses the board, so the bite has the board's own line.
function toothed(p, bx, by, br) {
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * TAU;
    const rr = br * (i % 2 ? 0.8 : 1.0);
    if (i === 0) p.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
    else p.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
  }
  p.closePath();
}
function bite(ctx, board, bx, by, br, u) {
  const b = P2((p) => toothed(p, bx, by, br));
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(b);
  ctx.restore();
  ctx.save();
  ctx.clip(board);
  ctx.strokeStyle = SIGN_INK; ctx.lineWidth = u * 0.04;
  ctx.stroke(b);
  ctx.restore();
}
// The sign that shipped until 24 Sep, copied from props.js before E replaced it, so
// card A still shows what was there. props.js's shape()/plain()/stroke()/rr().
const OLD_OUTLINE = 'rgba(26,16,40,0.34)';
function oShape(ctx, fill, u, fn) { ctx.beginPath(); fn(ctx); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OLD_OUTLINE; ctx.lineWidth = Math.max(0.55, 0.055 * u); ctx.stroke(); }
function oPlain(ctx, fill, fn) { ctx.beginPath(); fn(ctx); ctx.fillStyle = fill; ctx.fill(); }
function oStroke(ctx, col, w, fn) { ctx.beginPath(); fn(ctx); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
function oRR(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + k, y); ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k); ctx.closePath();
}
function wasDogSign(ctx, w, h) {
  const u = Math.max(w, h);
  const tilt = -0.035;
  const postX = w * 0.455, postW = w * 0.085;
  const bw = w * 0.62, bh = h * 0.5;
  const bx = postX + postW / 2 - bw / 2, by = h * 0.03;
  const cy = by + bh / 2;
  oShape(ctx, '#7a5230', u, (c) => oRR(c, postX, by + bh * 0.6, postW, h - by - bh * 0.6, postW * 0.3));
  oPlain(ctx, 'rgba(40,24,12,0.35)', (c) => oRR(c, postX + postW * 0.58, by + bh * 0.7, postW * 0.42, h - by - bh * 0.72, postW * 0.2));
  ctx.save();
  ctx.translate(postX + postW / 2, cy);
  ctx.rotate(tilt);
  const lx = bx - (postX + postW / 2), ly = by - cy;
  oShape(ctx, '#d83828', u, (c) => oRR(c, lx, ly, bw, bh, bh * 0.16));
  const px = lx + bw * 0.11, py = ly + bh * 0.12;
  const pw = bw * 0.78, ph = bh * 0.7;
  oPlain(ctx, '#f6e4c8', (c) => oRR(c, px, py, pw, ph, bh * 0.08));
  oPlain(ctx, 'rgba(40,10,6,0.3)', (c) => oRR(c, lx + bw * 0.05, ly + bh * 0.86, bw * 0.9, bh * 0.1, bh * 0.04));
  const X = (t) => px + ((t + 1) / 2) * pw;
  const Y = (t) => py + ((t + 1) / 2) * ph;
  oPlain(ctx, '#241a14', (c) => {
    c.moveTo(X(-0.98), Y(0.02)); c.lineTo(X(-0.88), Y(-0.26));
    c.quadraticCurveTo(X(-0.54), Y(-0.44), X(-0.24), Y(-0.46));
    c.lineTo(X(-0.18), Y(-0.54)); c.lineTo(X(-0.05), Y(-1)); c.lineTo(X(0.14), Y(-0.56));
    c.lineTo(X(0.24), Y(-0.44)); c.lineTo(X(0.31), Y(-0.60)); c.lineTo(X(0.46), Y(-0.92));
    c.lineTo(X(0.68), Y(-0.42)); c.lineTo(X(0.76), Y(-0.26));
    c.quadraticCurveTo(X(0.94), Y(0.12), X(0.86), Y(0.64)); c.lineTo(X(0.3), Y(0.88));
    c.quadraticCurveTo(X(-0.12), Y(0.82), X(-0.36), Y(0.52));
    c.lineTo(X(-0.99), Y(0.74)); c.lineTo(X(-0.74), Y(0.30)); c.lineTo(X(-0.99), Y(0.24));
    c.closePath();
  });
  const cut = '#f6e4c8';
  oPlain(ctx, cut, (c) => c.ellipse(X(-0.34), Y(-0.18), pw * 0.052, ph * 0.048, -0.3, 0, TAU));
  oPlain(ctx, cut, (c) => {
    c.moveTo(X(-0.90), Y(0.34)); c.lineTo(X(-0.78), Y(0.33)); c.lineTo(X(-0.845), Y(0.50)); c.closePath();
    c.moveTo(X(-0.95), Y(0.66)); c.lineTo(X(-0.85), Y(0.65)); c.lineTo(X(-0.90), Y(0.50)); c.closePath();
  });
  oPlain(ctx, cut, (c) => c.ellipse(X(-0.90), Y(-0.06), pw * 0.026, ph * 0.026, 0, 0, TAU));
  oStroke(ctx, cut, Math.max(0.18, pw * 0.022), (c) => { c.moveTo(X(-0.72), Y(-0.16)); c.quadraticCurveTo(X(-0.62), Y(-0.05), X(-0.50), Y(-0.02)); });
  ctx.restore();
}
const SIGN_PAINTERS = {
  was: wasDogSign,
  triangle(ctx, w, h) {
    const u = Math.max(w, h);
    signPost(ctx, w, h, h * 0.62);
    const cx = w / 2, top = h * 0.02, base = h * 0.74, half = w * 0.49;
    const tri = (inset) => P2((p) => {
      const r = u * 0.05;
      const pts = [pt(cx, top + inset * 1.9), pt(cx + half - inset * 1.7, base - inset), pt(cx - half + inset * 1.7, base - inset)];
      p.moveTo((pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2);
      for (let i = 0; i < 3; i++) p.arcTo(pts[i].x, pts[i].y, pts[(i + 1) % 3].x, pts[(i + 1) % 3].y, r);
      p.closePath();
    });
    const outer = tri(0), inner = tri(u * 0.1);
    ctx.fillStyle = '#d83828'; ctx.fill(outer);
    ctx.strokeStyle = SIGN_INK; ctx.lineWidth = u * 0.02; ctx.stroke(outer);
    ctx.fillStyle = '#fbf3e4'; ctx.fill(inner);
    // The dog, in the lower two-thirds of the field.
    const ox = cx, oy = base - u * 0.21, s = u * 0.22;
    ctx.fillStyle = '#1e1714';
    ctx.beginPath(); runningDogPath(ctx, (v) => ox + v * s, (v) => oy + v * s * 0.78); ctx.fill();
    ctx.fillStyle = '#fbf3e4';
    ctx.beginPath(); ctx.arc(ox - s * 0.66, oy - s * 0.28 * 0.78, s * 0.07, 0, TAU); ctx.fill();
  },
  plate(ctx, w, h) {
    const u = Math.max(w, h);
    signPost(ctx, w, h, h * 0.55);
    ctx.save();
    ctx.translate(w / 2, h * 0.34); ctx.rotate(-0.035);
    const S0 = w * 0.74;
    const plate = P2((p) => { const r = S0 * 0.12; p.roundRect(-S0 / 2, -S0 * 0.44, S0, S0 * 0.88, r); });
    ctx.fillStyle = '#d83828'; ctx.fill(plate);
    ctx.strokeStyle = SIGN_INK; ctx.lineWidth = u * 0.02; ctx.stroke(plate);
    // White enamel rim just inside the edge.
    const rim = P2((p) => { const r = S0 * 0.09; p.roundRect(-S0 / 2 + S0 * 0.06, -S0 * 0.44 + S0 * 0.06, S0 * 0.88, S0 * 0.76, r); });
    ctx.strokeStyle = '#fbf3e4'; ctx.lineWidth = u * 0.025; ctx.stroke(rim);
    // Screws.
    ctx.fillStyle = '#e8d8c0';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * S0 * 0.36, -S0 * 0.32, u * 0.018, 0, TAU); ctx.fill(); }
    // The doberman head, facing left, white on red.
    const X = (v) => v * S0 * 0.36, Y = (v) => v * S0 * 0.34 + S0 * 0.06;
    ctx.fillStyle = '#fbf3e4';
    ctx.beginPath();
    // Nose, long bridge, the stop, one cropped ear raked back, nape, neck, throat,
    // and an open jaw — the gape is a wedge of red plate with a white fang in it.
    ctx.moveTo(X(-0.97), Y(-0.12));
    ctx.quadraticCurveTo(X(-0.95), Y(-0.28), X(-0.8), Y(-0.3));
    ctx.lineTo(X(-0.36), Y(-0.36));
    ctx.quadraticCurveTo(X(-0.22), Y(-0.4), X(-0.14), Y(-0.56));
    ctx.quadraticCurveTo(X(-0.04), Y(-0.66), X(0.06), Y(-0.64));
    ctx.lineTo(X(0.30), Y(-1.08));
    ctx.lineTo(X(0.44), Y(-0.5));
    ctx.quadraticCurveTo(X(0.6), Y(-0.32), X(0.66), Y(-0.1));
    ctx.quadraticCurveTo(X(0.78), Y(0.3), X(0.98), Y(0.84));
    ctx.lineTo(X(0.2), Y(0.84));
    ctx.quadraticCurveTo(X(0.08), Y(0.5), X(-0.12), Y(0.34));
    ctx.lineTo(X(-0.52), Y(0.46));
    ctx.quadraticCurveTo(X(-0.8), Y(0.5), X(-0.86), Y(0.38));
    ctx.lineTo(X(-0.24), Y(0.12));
    ctx.lineTo(X(-0.9), Y(0.1));
    ctx.quadraticCurveTo(X(-1.0), Y(0.04), X(-0.97), Y(-0.12));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d83828';
    // The eye, set back under the brow; the nose leather.
    ctx.beginPath(); ctx.ellipse(X(-0.18), Y(-0.28), S0 * 0.034, S0 * 0.022, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1812';
    ctx.beginPath(); ctx.ellipse(X(-0.9), Y(-0.16), S0 * 0.03, S0 * 0.024, 0, 0, TAU); ctx.fill();
    // One fang hanging into the gape.
    ctx.fillStyle = '#fbf3e4';
    ctx.beginPath(); ctx.moveTo(X(-0.74), Y(0.1)); ctx.lineTo(X(-0.62), Y(0.1)); ctx.lineTo(X(-0.69), Y(0.24)); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  plank(ctx, w, h) {
    const u = Math.max(w, h);
    // A stake, not a post: pale split wood.
    signPost(ctx, w, h, h * 0.4, '#8a6440');
    ctx.save();
    ctx.translate(w / 2, h * 0.3); ctx.rotate(-0.09);
    const pw = w * 0.96, ph = h * 0.3;
    const board = P2((p) => {
      p.moveTo(-pw / 2, -ph / 2);
      p.lineTo(pw / 2, -ph / 2 + ph * 0.03);
      p.lineTo(pw / 2 - pw * 0.01, ph / 2);
      p.lineTo(-pw / 2 + pw * 0.02, ph / 2 - ph * 0.04);
      p.closePath();
    });
    ctx.fillStyle = '#c99a62'; ctx.fill(board);
    ctx.strokeStyle = SIGN_INK; ctx.lineWidth = u * 0.02; ctx.stroke(board);
    ctx.save(); ctx.clip(board);
    ctx.strokeStyle = 'rgba(110,70,34,0.35)'; ctx.lineWidth = u * 0.008;
    for (const gy of [-0.22, 0.12, 0.3]) { ctx.beginPath(); ctx.moveTo(-pw / 2, gy * ph); ctx.lineTo(pw / 2, gy * ph + ph * 0.05); ctx.stroke(); }
    ctx.restore();
    // Nails.
    ctx.fillStyle = '#3a3030';
    for (const nx of [-0.42, 0.34]) { ctx.beginPath(); ctx.arc(nx * pw, 0, u * 0.014, 0, TAU); ctx.fill(); }
    // D O G ! as brush strokes.
    ctx.strokeStyle = '#c42a1c'; ctx.lineWidth = ph * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lh = ph * 0.56, y0 = -lh / 2, y1 = lh / 2;
    const gx = (i) => -pw * 0.33 + i * pw * 0.21;
    ctx.beginPath();
    // D
    ctx.moveTo(gx(0), y0); ctx.lineTo(gx(0), y1);
    ctx.moveTo(gx(0), y0); ctx.bezierCurveTo(gx(0) + pw * 0.15, y0, gx(0) + pw * 0.15, y1, gx(0), y1);
    // O
    ctx.moveTo(gx(1) + pw * 0.07, 0); ctx.ellipse(gx(1), 0, pw * 0.07, lh / 2, 0, 0, TAU);
    // G
    const g0 = gx(2);
    ctx.moveTo(g0 + pw * 0.065, y0 + lh * 0.18);
    ctx.bezierCurveTo(g0 - pw * 0.02, y0 - lh * 0.08, g0 - pw * 0.09, y0 + lh * 0.2, g0 - pw * 0.07, 0);
    ctx.bezierCurveTo(g0 - pw * 0.06, y1 + lh * 0.06, g0 + pw * 0.07, y1, g0 + pw * 0.07, y1 - lh * 0.4);
    ctx.lineTo(g0 + pw * 0.015, y1 - lh * 0.4);
    ctx.stroke();
    // !
    ctx.beginPath(); ctx.moveTo(gx(3) - pw * 0.04, y0); ctx.lineTo(gx(3) - pw * 0.045, y1 - lh * 0.34); ctx.stroke();
    ctx.fillStyle = '#c42a1c'; ctx.beginPath(); ctx.arc(gx(3) - pw * 0.047, y1, ph * 0.1, 0, TAU); ctx.fill();
    // The bite, out of the top-right corner, clear of the lettering.
    bite(ctx, board, pw / 2 - pw * 0.02, -ph / 2 - ph * 0.02, ph * 0.42, u);
    ctx.restore();
  },
  // E (paw) is not here: it SHIPPED, and its cards draw the real props.js dogSign.
};
export function hasSignPainter(id) { return !!SIGN_PAINTERS[id] || id === 'now' || id === 'paw'; }

// Dev: the measured ink bounds behind every fit so far (harness readout).
export function dogFitInfo() { return Object.fromEntries(fits); }

// THE REAL FLOCK. The camera x at which a plumber flock (stylePacks/index.js
// drawPlumberLife: every tenth near-summit tile, 60% by hash) stands mid-picture,
// so the real backdrop draws the real sheep and the shipped collie. Mirrors that
// placement's constants (period round(PI*50) = 157 px, factor 0.35 x ZOOM); the
// summit offset inside a tile is not exported, so it is taken as mid-tile — the flock
// spans +-72 px, well inside the frame either way.
function flockHash(n) { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
export function plumberFlockCamX() {
  const P = Math.max(16, Math.round(Math.PI * 50)), f = 0.35 * ZOOM;
  for (let k = 13; k < 400; k += 10) if (flockHash(k * 7.31 + 2) <= 0.6) return (k * P + P / 2 - 240) / f;
  return 0;
}
export function drawFlockScene(ctx, t, cab, pack) {
  const camX = plumberFlockCamX();
  pack.bg(ctx, t, camX, cab, 1000, { stageIndex: 2 });
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}
export function drawFlockPortrait(ctx, t, cab, pack) {
  const camX = plumberFlockCamX();
  const { w, h } = PORTRAIT_TILE;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, cab.sky?.[0] || '#78c8f0'); sky.addColorStop(1, cab.sky?.[1] || '#bfe6f8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.save();
  const bz = 480 / 270;
  ctx.translate(240, PORTRAIT_GROUND); ctx.scale(bz, bz); ctx.translate(-240, -GROUND_Y);
  pack.bg(ctx, t, camX, cab, 1000, { stageIndex: 2 });
  ctx.restore();
  ctx.fillStyle = cab.groundDark || '#303030'; ctx.fillRect(0, PORTRAIT_GROUND, w, h - PORTRAIT_GROUND);
  ctx.save();
  const xOff = (PORTRAIT_HERO_X - PLAYER_X) * PORTRAIT_Z;
  applyWorld(ctx, PORTRAIT_Z, PORTRAIT_GROUND - GROUND_Y, GROUND_Y, xOff);
  pack.ground(ctx, camX, cab, [], [], t * 60, (w - xOff) / PORTRAIT_Z);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  ctx.restore();
}
