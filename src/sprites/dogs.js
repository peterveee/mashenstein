// THE DOGS — the three lane dogs (dogBruiser, dogSnarler, dogFeral) and the finish
// guard's three skins. Shipped 24 Sep 2026 from the dogs bake-off: Peter picked B,
// CLEAN LINE, for the whole kennel ("redo ALL the dogs? they look super rough").
// The bake-off and its losing takes are src/dev/dog-candidates.js (gallery-only);
// the rig these replaced is kept, for the gallery's card A, in src/dev/dogs-was.js.
// The cat still wears the original quadruped rig in sprites/animals.js.
//
// ONE SILHOUETTE, ONE LINE (the goose rule, animals.js GOOSE_LINE). Every visible
// part of a dog — tail, torso, neck, head, jaw, open mouth, near legs, near ear — is
// stroked ONCE as a single path at twice the line and then filled, so the fills bury
// every inner edge and the only ink left is the outside of the animal. The far pair
// of legs and the far ear are a second, darker silhouette drawn first, behind. The
// old rig outlined every bone, fur spike, ear and stud on its own, which is most of
// why it read as rough.
//
// A KEYED ROTARY GALLOP, not a sine. Eight keys, one per frame: extended flight ->
// the fore lead lands -> fores carry -> fores push -> GATHERED flight (all four
// tucked, the hinds crossing ahead of where the fores were) -> hinds land -> hinds
// carry -> hinds drive off. The feet ride those keys through a periodic Catmull-Rom,
// so a continuous phase passes exactly through every keyed frame. Two-bone IK with a
// FIXED bend side per joint: the elbow always breaks toward the tail, the stifle
// toward the nose, so no joint can flip mid-cycle.
//
// THE PLANTED GALLOP (16 Oct 2026, from the feral-dog bake-off, src/dev/
// feral-dog-candidates.js — "the new gait is very nice … fix the gait for all dogs").
// The keyed gallop above stepped (8 frames at 15 fps) and its stance feet moved back
// at about two-thirds of the dog's own speed, so they skated along the road. The lane
// dogs and the finish guard now run on gallopPose(): each foot has a STANCE, nailed to
// the road (it moves back at exactly the ground speed), and a SWING, a Hermite curve
// that leaves and arrives at that speed — rotary double-suspension gallop, far hind,
// near hind, extended flight, near fore, far fore, gathered flight; two body bumps a
// stride, the spine flexing, the head held level. 16 frames, and the run steps them by
// the dog's real ground speed (DOG_STRIDE, run.js gaitPh), so the feet never slide.
// The collie keeps the keyed gait: it crouches, and it is drawn live on the backdrop.
//
// THE FERAL IS THE WOLF (bake-off B3, Peter 16 Oct: "B3 is great - bigger hit box is
// fine. replace feral with him"): head level with the back, a full snarl, hackles as a
// ragged crest, ruff and brush; silver with a dark saddle and a cream mask, a moonlit
// top line and glowing eyes so he reads in Crypt's dark (B.look).
//
// THE BARK. run.js fires the finish dog's bark on the cycle's wrap to frame 0 (see
// BARK_LEAD there): the jaw's widest gape is keyed ON frame 0 (GAIT.gape).
//
// FITTED TO THE BOX. Each painter scales its dog so the union of its ink over all
// eight frames fills the raster box (DOG_BOUNDS, measured off the bake-off harness —
// src/dev/dog-candidates.js dogFitInfo). The box, TALL, VISUAL, detail and fps are
// the tables in animals.js, unchanged, so no hitbox or on-screen footprint moved.
//
// Authored FACING RIGHT in world units, feet on y 0, then mirrored: obstacles arrive
// from the right, and world props are never flipped at draw time.

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
// Frames in the rasterised ring (the planted gallop's 16; the keyed gait had 8).
const FRAMES = 16;

// The contour: visible width in the dog's own world units (stroked at twice this and
// half buried by the fills), in the props' translucent ink.
const LINE = 0.26;
const INK = 'rgba(26,16,40,0.52)';
const MOUTH = '#5a1422';
const TONGUE = '#e2607a';
const TOOTH = '#fbf6ec';
// The bake-off's style multipliers, at B's values (all 1): kept as a named block so
// the geometry below reads the same as the bake-off's and a retune has one place.
const S = { head: 1, muzzle: 1, leg: 1, legW: 1, paw: 1, body: 1, ear: 1, gapeK: 1 };

// --------------------------------------------------------------- the gallop
// Feet relative to the shoulder (fore) or hip (hind), in units of the breed's leg
// length L; y is lift above the ground. Angles are the lowest segment's direction —
// fore: carpus -> foot, hind: foot -> hock — in degrees, canvas convention.
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
  // Widest ON frame 0: run.js times the finish dog's bark to the cycle's wrap.
  gape: [1.00, 0.80, 0.30, 0.12, 0.40, 0.70, 0.85, 0.95],
  nod: [0.00, 0.35, 0.80, 0.45, -0.20, -0.55, -0.35, -0.10],
};
function cyc(keys, p) {
  const n = keys.length;
  const x = (((p % 1) + 1) % 1) * n;
  const i = Math.floor(x), f = x - i;
  const k0 = keys[(i - 1 + n) % n], k1 = keys[i % n], k2 = keys[(i + 1) % n], k3 = keys[(i + 2) % n];
  return 0.5 * ((2 * k1) + (-k0 + k2) * f + (2 * k0 - 5 * k1 + 4 * k2 - k3) * f * f
    + (-k0 + 3 * k1 - 3 * k2 + k3) * f * f * f);
}

// Two-bone IK with a FIXED bend side: +1 puts the joint on the left of a->b.
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
// World units, facing right, ground at y 0. Each is a SHAPE; the painter fits it to
// its box. bruiser: low, wide, front-heavy. snarler: the lean doberman. feral: tall,
// gaunt, head low and level with the back, arched spine, hackles, ribs.
const BREEDS = {
  snarler: {
    L: 8.0, spine: 8.2, cx: -0.6, chestUp: 2.1, chestDown: 2.3, chestRx: 2.5,
    rumpUp: 2.0, rumpDown: 1.7, rumpRx: 2.1, tuck: 1.25, arch: 0.15,
    neckLen: 4.6, neckAng: -48, neckW: 1.85, headR: 1.75, muzzle: 2.9, muzzleH: 1.3,
    ear: 'crop', earLen: 2.7, tail: 'whip', legW: [1.25, 0.72, 0.56], pawR: 0.62,
    collar: 'spiked', teeth: 1.0,
    gait: { stride: 0.8, height: 0.9, bob: 0.08, pitch: 0.07, gape: [0.3, 0.6] },
    pal: { coat: '#36313f', far: '#24202b', shade: '#28242f', mark: '#b87a44', markShade: '#94602f', eye: '#f6d33c', collar: '#7a2a1c' },
    marks: 'dobe',
  },
  bruiser: {
    L: 6.3, spine: 7.4, cx: -0.9, chestUp: 2.7, chestDown: 2.6, chestRx: 3.5,
    rumpUp: 2.2, rumpDown: 1.6, rumpRx: 2.2, tuck: 1.0, arch: -0.25,
    neckLen: 3.5, neckAng: -42, neckW: 3.3, headR: 2.6, muzzle: 1.4, muzzleH: 2.0,
    ear: 'rose', earLen: 1.7, tail: 'stub', legW: [2.0, 1.3, 1.0], pawR: 0.95,
    collar: 'spiked', teeth: 1.4, bowed: 0.35,
    gait: { stride: 0.85, height: 0.9, bob: 0.07, pitch: 0.06, gape: [0.25, 0.65] },
    pal: { coat: '#c68d4c', far: '#94622f', shade: '#a6733c', mark: '#f2e2c4', markShade: '#d9c3a0', eye: '#e04848', collar: '#5a2a18' },
    marks: 'blaze',
  },
  // The wolf (bake-off B3): the old feral's frame, fuller under and flatter on top,
  // the head dropped level with the back. The look — crest, ruff, snarl, mask,
  // moonlight, glowing eyes — is B.look, painted by furParts / snarlFace / moonlight.
  feral: {
    L: 11.4, spine: 8.6, cx: -0.4, chestUp: 2.2, chestDown: 2.7, chestRx: 2.7,
    rumpUp: 2.0, rumpDown: 2.0, rumpRx: 2.3, tuck: 0.85, arch: 0.35,
    neckLen: 4.4, neckAng: -12, neckW: 2.1, headR: 2.15, muzzle: 3.0, muzzleH: 1.35,
    ear: 'prick', earLen: 2.2, tail: 'none', legW: [1.35, 0.76, 0.58], pawR: 0.62,
    collar: 'none', teeth: 1.15,
    gait: { stride: 0.78, height: 0.87, bob: 0.08, pitch: 0.07, gape: [0.55, 0.65] },
    pal: { coat: '#a39fae', far: '#5e5a69', shade: '#85808f', mark: '#aaa49c', markShade: '#8d8780', saddle: '#4a4655', eye: '#ffd23a', collar: '#000' },
    marks: 'none',
    look: { crest: 1.25, ruff: 1.0, belly: 0.55, tail: [4.4, 0.9], mask: '#ece4d6', gum: '#a23a50', teeth: 1.1, drool: true,
      scar: 'rgba(225,200,190,0.75)', rim: 'rgba(236,240,255,0.6)', glow: 'rgba(255,214,70,0.75)' },
  },
  // PLUMBER's working collie (backdrop art, drawCollie in stylePacks/
  // plumberLandmarks.js): black with a white ruff, blaze, socks and tail tip, the
  // ears up with the tips tipped over, a plume tail, and no teeth — it pants.
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

// ---------------------------------------------------------------- the pose
function pose(B, S, phase, { crouch = 0, stretch = 0 } = {}) {
  const L = B.L * S.leg;
  const g = (k) => cyc(GAIT[k], phase);
  const run = 1 - crouch;
  const lift = g('lift') * run - crouch * 0.42;
  const flex = g('flex');
  const pitch = g('pitch') * run + crouch * 0.03;
  // The spine shortens gathered and lengthens extended (flex); `stretch` pushes that
  // further as squash and stretch (the bake-off's TOON; 0 here).
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

// --------------------------------------------------------- the planted gallop
// Phases are fractions of one cycle; a foot's x is from its leg's REST root, in units of
// L x the breed's gait.stride. Touch-down x is authored; lift-off is derived so every
// planted foot moves back at the same speed, STRIDE_L per cycle.
const STRIDE_L = 2.9;
const GALLOP = {
  hindFar: 0.00, hindNear: 0.07, foreNear: 0.44, foreFar: 0.52,
  hindDuty: 0.30, foreDuty: 0.28,
  hindTD: 0.42, foreTD: 0.46,
  flightE: 0.405, flightG: 0.90, // the flights' middles: extended, gathered
};
const FORE_SWING_A = [122, 178, 228, 232, 160, 100, 80];
const HIND_SWING_A = [-58, -28, 12, 18, -40, -88, -106];
function spline(keys, v) {
  const n = keys.length - 1;
  const x = clamp01(v) * n;
  const i = Math.min(Math.floor(x), n - 1), f = x - i;
  const k0 = keys[Math.max(i - 1, 0)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(i + 2, n)];
  return 0.5 * ((2 * k1) + (-k0 + k2) * f + (2 * k0 - 5 * k1 + 4 * k2 - k3) * f * f
    + (-k0 + 3 * k1 - 3 * k2 + k3) * f * f * f);
}
function hermite(p0, p1, m0, m1, v) {
  const v2 = v * v, v3 = v2 * v;
  return (2 * v3 - 3 * v2 + 1) * p0 + (v3 - 2 * v2 + v) * m0 + (-2 * v3 + 3 * v2) * p1 + (v3 - v2) * m1;
}
function footAt(phase, td, duty, tdX, isFore) {
  const u = (((phase - td) % 1) + 1) % 1;
  const loX = tdX - STRIDE_L * duty;
  if (u < duty) {
    const s = u / duty;
    return { x: lerp(tdX, loX, s), y: 0, a: isFore ? lerp(80, 122, s) : lerp(-106, -58, s) };
  }
  const v = (u - duty) / (1 - duty);
  // Leaves and arrives at the ground's speed, eased (0.55) so the paw reaches past its
  // mark and draws back onto it rather than flinging.
  const m = -STRIDE_L * (1 - duty) * 0.55;
  return {
    x: hermite(loX, tdX, m, m, v),
    y: (isFore ? 0.36 : 0.30) * Math.pow(Math.sin(Math.PI * v), 1.3),
    a: spline(isFore ? FORE_SWING_A : HIND_SWING_A, v),
  };
}
function gallopPose(B, S, phase) {
  const g = B.gait;
  const L = B.L * S.leg;
  const st = g.stride;
  const bump = 0.5 + 0.5 * Math.cos(TAU * 2 * (phase - GALLOP.flightE));
  const lift = (bump - 0.5) * g.bob;
  const pitch = g.pitch * Math.cos(TAU * (phase - 0.18));
  const flex = 0.5 + 0.5 * Math.cos(TAU * (phase - GALLOP.flightG));
  const spine = B.spine * (1.04 - 0.12 * flex);
  const cx = B.cx;
  const baseY = -(L * g.height + lift * L);
  const half = spine / 2;
  const S0 = { x: cx + half * Math.cos(pitch), y: baseY - half * Math.sin(pitch) };
  const H0 = { x: cx - half * Math.cos(pitch), y: baseY + half * Math.sin(pitch) };
  const restS = cx + B.spine / 2, restH = cx - B.spine / 2;
  const leg = (root, isFore, td, dx = 0) => {
    const f = footAt(phase, td, isFore ? GALLOP.foreDuty : GALLOP.hindDuty, isFore ? GALLOP.foreTD : GALLOP.hindTD, isFore);
    const fx = (isFore ? restS : restH) + dx + f.x * L * st;
    const fy = -f.y * L;
    if (isFore) {
      const a3 = L * 0.17, a1 = L * 0.47, a2 = L * 0.44;
      const C = { x: fx - Math.cos(f.a * DEG) * a3, y: fy - Math.sin(f.a * DEG) * a3 };
      return { root, mid: ik(root.x, root.y, C.x, C.y, a1, a2, -1), low: C, foot: { x: fx, y: fy }, fore: true };
    }
    const b3 = L * 0.36, b1 = L * 0.50, b2 = L * 0.50;
    const Hk = { x: fx + Math.cos(f.a * DEG) * b3, y: fy + Math.sin(f.a * DEG) * b3 };
    return { root, mid: ik(root.x, root.y, Hk.x, Hk.y, b1, b2, 1), low: Hk, foot: { x: fx, y: fy }, fore: false };
  };
  // The head holds its line through the bob and the pitch: a hunting dog's eyes stay level.
  const neckAng = (g.neckAng ?? B.neckAng) * DEG - pitch * 0.4;
  const Hc = {
    x: S0.x + Math.cos(neckAng) * B.neckLen,
    y: S0.y + Math.sin(neckAng) * B.neckLen + lift * L * 0.55,
  };
  return {
    L, S: S0, Hp: H0, pitch, flex, lift, run: 1, crouch: 0, spine,
    fore: leg({ x: S0.x, y: S0.y }, true, GALLOP.foreNear),
    foreFar: leg({ x: S0.x - 0.2, y: S0.y }, true, GALLOP.foreFar, -0.2),
    hind: leg({ x: H0.x, y: H0.y }, false, GALLOP.hindNear),
    hindFar: leg({ x: H0.x - 0.2, y: H0.y }, false, GALLOP.hindFar, -0.2),
    Hc, headR: B.headR * S.head, tilt: -0.06 - pitch * 0.7,
    // Widest ON frame 0: run.js times the finish dog's bark to the cycle's wrap.
    gape: g.gape[0] + g.gape[1] * (0.5 + 0.5 * Math.cos(TAU * phase)),
    // The tail trails the body's pitch by a quarter cycle: follow-through, not a wag.
    wag: 0.8 * Math.sin(TAU * (phase - 0.28)),
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
const P2 = (fn) => { const p = new Path2D(); fn(p); return p; };
const pt = (x, y) => ({ x, y });

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


// The head in its own rotated frame: skull + upper muzzle as one outline, a lower
// jaw hinged under the ear and rotated open, and the mouth between them.
function headPaths(B, P) {
  const R = P.headR;
  const M = B.muzzle * S.muzzle;
  const mh = B.muzzleH;
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
  // The STOP (skull stepping down onto the bridge) is the one corner that says dog
  // rather than bear.
  const skull = P2((p) => smoothClosed(p, [
    T(-R * 0.95, R * 0.15), T(-R * 0.75, -R * 0.62), T(-R * 0.1, -R * 0.98), T(R * 0.55, -R * 0.78),
    T(R * 0.85, -R * 0.42),               // the stop
    T(noseX - M * 0.35, -R * 0.36), T(noseX, -R * 0.26), T(noseX + 0.12, -R * 0.02), T(noseX - 0.1, lipY),
    T(R * 0.55, lipY + 0.08), T(R * 0.05, R * 0.55), T(-R * 0.55, R * 0.72),
  ], 0.85));
  const jaw = P2((p) => smoothClosed(p, [
    J(-R * 0.35, R * 0.35), J(R * 0.5, lipY + 0.02), J(noseX - M * 0.2, lipY + 0.05),
    J(noseX - M * 0.12, lipY + mh * 0.34), J(R * 0.45, lipY + mh * 0.52), J(-R * 0.3, R * 0.85),
  ], 0.8));
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

function tailPath(B, P) {
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


// Stroke every part once as ONE path at twice the line, then fill each part.
function silhouette(ctx, parts) {
  const all = new Path2D();
  for (const q of parts) all.addPath(q.path);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 2;
  ctx.stroke(all);
  for (const q of parts) { ctx.fillStyle = q.fill; ctx.fill(q.path); }
}

// The breed's own markings, each clipped to the silhouette part it sits in.
function markings(ctx, B, P, hd, parts, nearLegs, torso, neck) {
  const { T, R, noseX, lipY, mh, M } = hd;
  const pal = B.pal;
  const clipTo = (paths, fn) => {
    ctx.save();
    const c = new Path2D(); for (const q of paths) c.addPath(q);
    ctx.clip(c); fn(); ctx.restore();
  };
  const skull = parts.find((q) => q.id === 'skull').path;
  const jaw = parts.find((q) => q.id === 'jaw').path;
  const fillP = (col, fn) => { ctx.fillStyle = col; ctx.beginPath(); fn(ctx); ctx.fill(); };
  const poly = (c, pts) => { c.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) c.lineTo(q.x, q.y); c.closePath(); };
  if (B.marks === 'dobe') {
    // Tan points: muzzle and cheek, the pip over the eye, the chest, the lower legs.
    clipTo([skull, jaw], () => {
      fillP(pal.mark, (c) => poly(c, [T(R * 0.3, lipY - mh * 0.35), T(noseX + 0.3, lipY - mh * 0.2), T(noseX + 0.3, lipY + 3), T(-R * 0.2, R * 1.3)]));
      const pip = T(R * 0.3, -R * 0.55);
      fillP(pal.mark, (c) => c.ellipse(pip.x, pip.y, R * 0.2, R * 0.13, P.tilt, 0, TAU));
    });
    clipTo([torso, neck], () => fillP(pal.mark, (c) => c.ellipse(P.S.x + B.chestRx * 0.75, P.S.y + 0.2, 1.0, 1.25, 0.3, 0, TAU)));
    clipTo(nearLegs, () => { for (const lg of [P.fore, P.hind]) fillP(pal.mark, (c) => c.arc(lg.foot.x, lg.foot.y, B.L * 0.3, 0, TAU)); });
  } else if (B.marks === 'blaze') {
    // White blaze: muzzle, down the throat, the chest; white feet.
    clipTo([skull, jaw], () => fillP(pal.mark, (c) => poly(c, [T(R * 0.55, -R * 0.95), T(R * 0.95, -R * 0.95), T(noseX + 0.5, -R * 0.1),
      T(noseX + 0.5, lipY + 4), T(R * 0.1, R * 1.2), T(R * 0.5, -R * 0.1)])));
    clipTo([torso, neck], () => fillP(pal.mark, (c) => c.ellipse(P.S.x + B.chestRx * 0.7, P.S.y + B.chestDown * 0.2, 1.7, 2.4, 0.25, 0, TAU)));
    clipTo(nearLegs, () => { for (const lg of [P.fore, P.hind]) fillP(pal.mark, (c) => c.arc(lg.foot.x, lg.foot.y, B.L * 0.2, 0, TAU)); });
  } else if (B.marks === 'wolf') {
    // Pale mask and throat, a darker saddle down the back.
    clipTo([skull, jaw], () => fillP(pal.mark, (c) => poly(c, [T(-R * 0.2, R * 0.05), T(noseX - M * 0.4, lipY - mh * 0.15), T(noseX + 0.5, lipY + 0.2),
      T(noseX + 0.5, lipY + 3), T(-R * 0.4, R * 1.2)])));
    clipTo([torso], () => {
      const mx = (P.S.x + P.Hp.x) / 2, my = (P.S.y + P.Hp.y) / 2;
      ctx.globalAlpha = 0.7;
      fillP(pal.saddle, (c) => c.ellipse(mx + 0.3, my - B.chestUp * 0.95 - B.arch * 1.1, P.spine * 0.62, 1.5, -P.pitch, 0, TAU));
      ctx.globalAlpha = 1;
    });
    clipTo([neck], () => fillP(pal.mark, (c) => c.ellipse(P.S.x + B.chestRx * 0.9, P.S.y - 0.6, 1.2, 2.2, 0.5, 0, TAU)));
  } else if (B.marks === 'collie') {
    // White ruff ring, blaze, socks, tail tip.
    clipTo([neck, torso], () => fillP(pal.mark, (c) => c.ellipse(lerp(P.Hc.x, P.S.x, 0.62) + 0.4, lerp(P.Hc.y, P.S.y, 0.62) + 0.7, 1.7, 2.7, -0.5, 0, TAU)));
    clipTo([skull, jaw], () => fillP(pal.mark, (c) => poly(c, [T(R * 0.25, -R * 1.2), T(R * 0.75, -R * 1.2), T(noseX + 0.5, -R * 0.2),
      T(noseX + 0.5, lipY + 4), T(R * 0.3, R * 1.2), T(R * 0.35, -R * 0.2)])));
    clipTo(nearLegs, () => { for (const lg of [P.fore, P.hind]) fillP(pal.mark, (c) => c.arc(lg.foot.x, lg.foot.y, B.L * 0.28, 0, TAU)); });
    const tail = parts.find((q) => q.id === 'tail');
    if (tail) {
      clipTo([tail.path], () => {
        const t0 = pt(P.Hp.x - B.rumpRx * 0.7 - 4.2, P.Hp.y - B.rumpUp * 0.55 + 0.6 + P.crouch * 2);
        fillP(pal.mark, (c) => c.arc(t0.x, t0.y, 1.3, 0, TAU));
      });
    }
  }
}

// A spiked collar: a band across the neck with three studs ON it.
function collar(ctx, B, P) {
  if (B.collar !== 'spiked') return;
  const { S: Sh, Hc, headR } = P;
  const ang = Math.atan2(Hc.y - Sh.y, Hc.x - Sh.x);
  const cx = lerp(Hc.x, Sh.x, 0.52), cy = lerp(Hc.y, Sh.y, 0.52);
  const half = B.neckW * 0.62 + headR * 0.18, thick = 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.beginPath(); ctx.rect(-thick, -half, thick * 2, half * 2);
  ctx.fillStyle = B.pal.collar; ctx.strokeStyle = INK; ctx.lineWidth = LINE;
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8d8e4';
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(0, i * half * 0.6, 0.26, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// Fangs, tongue, nose, and a narrowed almond eye under a hard brow — the whole
// expression is in how little of the eye shows and how hard the brow comes down.
function face(ctx, B, P, hd) {
  const { T, J, R, noseX, lipY, mh } = hd;
  if (B.friendly) { friendlyFace(ctx, B, P, hd); return; }
  const tk = 0.34 * B.teeth;
  if (hd.gape > 0.3) {
    const t0 = J(R * 0.55, lipY + mh * 0.2), t1 = J(noseX - hd.M * 0.35, lipY + mh * 0.12);
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
  const n = T(noseX - 0.05, -R * 0.12);
  ctx.fillStyle = '#17121c';
  ctx.beginPath(); ctx.ellipse(n.x, n.y, 0.5, 0.38, P.tilt, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(n.x + 0.12, n.y - 0.14, 0.12, 0, TAU); ctx.fill();
  const e = T(R * 0.32, -R * 0.3);
  const ew = R * 0.3, eh = R * 0.18;
  ctx.fillStyle = '#fdfaf4';
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.2, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.2, 0, TAU); ctx.clip();
  ctx.fillStyle = B.pal.eye; ctx.beginPath(); ctx.arc(e.x + ew * 0.25, e.y, R * 0.16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#150f1c'; ctx.beginPath(); ctx.arc(e.x + ew * 0.3, e.y, R * 0.085, 0, TAU); ctx.fill();
  ctx.restore();
  const b0 = T(-R * 0.02, -R * 0.62), b1 = T(R * 0.72, -R * 0.36);
  ctx.strokeStyle = 'rgba(21,16,30,0.85)'; ctx.lineWidth = R * 0.13;
  ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
  // The snarl: one crease over the muzzle.
  const w0 = T(R * 1.0, -R * 0.42), w1 = T(R * 1.35, -R * 0.2);
  ctx.strokeStyle = 'rgba(21,16,30,0.4)'; ctx.lineWidth = LINE * 0.8;
  ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.quadraticCurveTo(w0.x + 0.25, w0.y + 0.05, w1.x, w1.y); ctx.stroke();
}

// The collie's face: a panting tongue and a dark, soft eye — a working dog, not a
// hazard, so no teeth, no brow and no snarl.
function friendlyFace(ctx, B, P, hd) {
  const { T, J, R, noseX, lipY } = hd;
  if (hd.gape > 0.2) {
    const t0 = J(noseX - hd.M * 0.4, lipY + 0.2);
    ctx.fillStyle = TONGUE;
    ctx.beginPath(); ctx.ellipse(t0.x, t0.y + 0.35, 0.6, 0.38, 0.3, 0, TAU); ctx.fill();
  }
  const n = T(noseX - 0.05, -R * 0.12);
  ctx.fillStyle = '#17121c';
  ctx.beginPath(); ctx.ellipse(n.x, n.y, 0.5, 0.38, P.tilt, 0, TAU); ctx.fill();
  const e = T(R * 0.32, -R * 0.3);
  const ew = R * 0.3, eh = R * 0.18;
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, P.tilt - 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(e.x + ew * 0.3, e.y - eh * 0.3, eh * 0.3, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------- the wolf's look
// A fringe of fur along a curve: spikes leaning back along it, pointing AWAY from
// `away` (a point inside the body), joined to a base line sunk `sink` inside so the
// fills merge it into the silhouette — one more part under the one outline.
function fringe(pts, { heights, lean = 0.6, sink = 0.7, away, phase = 0, flutter = 0.08, n = 9 }) {
  const curve = [];
  for (let i = 0; i <= n * 2; i++) {
    const s = i / (n * 2);
    curve.push({ x: spline(pts.map((q) => q.x), s), y: spline(pts.map((q) => q.y), s), s });
  }
  const out = [], inner = [];
  for (let i = 0; i < curve.length; i++) {
    const a = curve[Math.max(0, i - 1)], b = curve[Math.min(curve.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
    const tx = dx / d, ty = dy / d;
    let nx = -ty, ny = tx;
    const q = curve[i];
    if ((q.x - away.x) * nx + (q.y - away.y) * ny < 0) { nx = -nx; ny = -ny; }
    inner.push(pt(q.x - nx * sink, q.y - ny * sink));
    if (i % 2 === 1) {
      const k = (i - 1) / 2;
      const h = heights(q.s, k) * (1 + flutter * Math.sin(TAU * phase * 2 + k * 1.7));
      out.push(pt(q.x + nx * h + tx * h * lean, q.y + ny * h + ty * h * lean));
    } else out.push(pt(q.x, q.y));
  }
  const p = new Path2D();
  p.moveTo(out[0].x, out[0].y);
  for (const q of out.slice(1)) p.lineTo(q.x, q.y);
  for (const q of inner.reverse()) p.lineTo(q.x, q.y);
  p.closePath();
  return p;
}
const JAG = [1, 0.62, 0.92, 0.55, 1.05, 0.7, 0.88, 0.5, 0.8, 0.6, 0.95, 0.66];
const jag = (k) => JAG[k % JAG.length];

// A ragged brush of a tail, streaming back from the croup and swinging with `wag`.
function raggedTail(B, P, len, thick) {
  const { Hp } = P;
  const t0 = pt(Hp.x - B.rumpRx * 0.7, Hp.y - B.rumpUp * 0.55);
  const w = P.wag;
  const spinePts = [];
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    spinePts.push(pt(t0.x - len * s, t0.y + 0.3 * s + w * 0.9 * s * s - 0.9 * Math.sin(Math.PI * s * 0.9)));
  }
  const top = [], bot = [];
  spinePts.forEach((q, i) => {
    const s = i / 8;
    const a = spinePts[Math.max(0, i - 1)], b = spinePts[Math.min(8, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
    const nx = dy / d, ny = -dx / d;
    const r = thick * (0.55 + 0.75 * Math.sin(Math.PI * Math.min(1, s * 1.15))) * (s > 0.92 ? 0.5 : 1);
    const spike = i % 2 ? 1.35 : 0.85;
    top.push(pt(q.x - nx * r * spike + (i % 2 ? 0.35 * r : 0), q.y - ny * r * spike));
    bot.push(pt(q.x + nx * r * (i % 2 ? 0.85 : 1.3), q.y + ny * r * (i % 2 ? 0.85 : 1.3)));
  });
  const p = new Path2D();
  p.moveTo(t0.x + 0.6, t0.y - thick * 0.6);
  for (const q of top) p.lineTo(q.x, q.y);
  const tip = spinePts[8];
  p.lineTo(tip.x - 0.8, tip.y + 0.2);
  for (const q of bot.reverse()) p.lineTo(q.x, q.y);
  p.lineTo(t0.x + 0.6, t0.y + thick * 0.7);
  p.closePath();
  return p;
}

// Hackles from the back of the skull to the loin, a cheek ruff, a throat ruff and a
// ragged belly line — all one with the outline.
function furParts(parts, B, P, hd, phase) {
  const look = B.look;
  const { S: Sh, Hp, Hc } = P;
  const { T, R } = hd;
  const mid = pt((Sh.x + Hp.x) / 2, (Sh.y + Hp.y) / 2);
  const centre = pt(mid.x, mid.y + 0.5);
  const add = (path) => parts.push({ path, fill: B.pal.coat, id: 'fur' });
  add(fringe([T(-R * 0.55, -R * 0.75), pt(lerp(Hc.x, Sh.x, 0.5) - 0.3, lerp(Hc.y, Sh.y, 0.5) - B.neckW * 0.55),
    pt(Sh.x - 0.4, Sh.y - B.chestUp * 0.95), pt(mid.x, mid.y - B.chestUp * 0.82 - B.arch),
    pt(lerp(mid.x, Hp.x, 0.65), lerp(mid.y, Hp.y, 0.65) - B.rumpUp * 0.95 - B.arch * 0.5)],
  { heights: (s, k) => look.crest * (0.45 + 0.75 * Math.sin(Math.PI * Math.min(1, s * 1.25))) * jag(k), lean: 0.9, sink: 0.9, away: centre, phase, n: 10 }));
  add(fringe([T(-R * 0.75, -R * 0.35), T(-R * 0.95, R * 0.3), T(-R * 0.55, R * 0.95)],
    { heights: (s, k) => look.ruff * 0.75 * jag(k + 3), lean: 0.6, sink: 0.6, away: Hc, phase, n: 4 }));
  add(fringe([T(-R * 0.1, R * 0.9), pt(lerp(Hc.x, Sh.x, 0.45) + B.neckW * 0.3, lerp(Hc.y, Sh.y, 0.45) + B.neckW * 0.6),
    pt(Sh.x + B.chestRx * 0.75, Sh.y + B.chestDown * 0.55)],
  { heights: (s, k) => look.ruff * (0.5 + 0.6 * Math.sin(Math.PI * s)) * jag(k + 5), lean: 0.5, sink: 0.6, away: pt(Sh.x - 1, Sh.y - 1), phase, n: 6 }));
  add(fringe([pt(Sh.x - 0.4, Sh.y + B.chestDown), pt(mid.x + 0.4, mid.y + B.chestDown - B.tuck * 1.1),
    pt(mid.x - 1.4, mid.y + B.chestDown - B.tuck * 1.4)],
  { heights: (s, k) => look.belly * (1 - s * 0.6) * jag(k + 1), lean: 0.8, sink: 0.6, away: centre, phase, n: 6 }));
  // The finish guard keeps its long raised tail; the lane wolf streams a brush.
  if (look.tail && B.tail !== 'long') parts.unshift({ path: raggedTail(B, P, look.tail[0], look.tail[1]), fill: B.pal.coat, id: 'tail' });
}

// The snarl: lips peeled back off a full row of teeth, a wrinkled muzzle, a hard low
// brow over a yellow eye with no white to it, a cream mask. At lane size the teeth and
// the eye are what read.
function snarlFace(ctx, B, P, hd) {
  const look = B.look;
  const { T, J, R, noseX, lipY, mh, M } = hd;
  if (look.mask) {
    ctx.save();
    const clip = new Path2D(); clip.addPath(hd.skull); clip.addPath(hd.jaw);
    ctx.clip(clip);
    ctx.fillStyle = look.mask;
    ctx.beginPath();
    const m = [T(R * 0.55, -R * 0.05), T(noseX - M * 0.4, lipY - mh * 0.3), T(noseX + 0.5, lipY - 0.2), T(noseX + 0.5, lipY + 3), T(R * 0.2, R * 1.3)];
    ctx.moveTo(m[0].x, m[0].y); for (const q of m.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = look.gum;
  ctx.beginPath();
  const g = [T(R * 0.35, lipY + 0.02), T(noseX - 0.1, lipY + 0.02), T(noseX - 0.05, lipY - mh * 0.28), T(R * 0.7, lipY - mh * 0.34)];
  ctx.moveTo(g[0].x, g[0].y); for (const q of g.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill();
  const tooth = (fn, u, v, w, l, dir) => {
    const a = fn(u - w / 2, v), b = fn(u + w / 2, v), c = fn(u + w * 0.15, v + dir * l);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
  };
  ctx.fillStyle = TOOTH;
  ctx.beginPath();
  const k = look.teeth;
  for (let i = 0; i < 4; i++) tooth(T, lerp(R * 0.5, noseX - M * 0.5, i / 3), lipY, 0.34 * k, 0.42 * k, 1);
  tooth(T, noseX - M * 0.3, lipY, 0.46 * k, 1.05 * k, 1);
  tooth(T, noseX - 0.28, lipY, 0.3 * k, 0.4 * k, 1);
  for (let i = 0; i < 3; i++) tooth(J, lerp(R * 0.6, noseX - M * 0.55, i / 2), lipY + 0.1, 0.3 * k, 0.36 * k, -1);
  tooth(J, noseX - M * 0.2, lipY + 0.1, 0.42 * k, 0.9 * k, -1);
  ctx.fill();
  if (look.drool) {
    const d0 = J(noseX - M * 0.3, lipY + mh * 0.38);
    ctx.strokeStyle = 'rgba(232,240,248,0.55)'; ctx.lineWidth = LINE * 0.7;
    ctx.beginPath(); ctx.moveTo(d0.x, d0.y);
    ctx.quadraticCurveTo(d0.x + 0.3, d0.y + 0.9, d0.x - 0.1, d0.y + 1.6 + P.lift * 3); ctx.stroke();
  }
  const n = T(noseX - 0.05, -R * 0.14);
  ctx.fillStyle = '#120d16';
  ctx.beginPath(); ctx.ellipse(n.x, n.y, 0.55, 0.42, P.tilt, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(16,10,22,0.55)'; ctx.lineWidth = LINE * 0.9;
  for (let i = 0; i < 3; i++) {
    const a = T(R * 0.95 + i * 0.55, -R * 0.5 + i * 0.05), b = T(R * 1.1 + i * 0.55, -R * 0.12);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(a.x + 0.45, (a.y + b.y) / 2, b.x, b.y); ctx.stroke();
  }
  const e = T(R * 0.36, -R * 0.32);
  const ew = R * 0.34, eh = R * 0.15, rot = P.tilt + 0.32;
  if (look.glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, R * 0.9);
    gr.addColorStop(0, look.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y, R * 0.9, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#120d16';
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew + 0.16, eh + 0.14, rot, 0, TAU); ctx.fill();
  ctx.fillStyle = B.pal.eye;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, rot, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0c0810';
  ctx.beginPath(); ctx.ellipse(e.x + ew * 0.2, e.y, R * 0.05, eh * 0.9, rot, 0, TAU); ctx.fill();
  const b0 = T(-R * 0.15, -R * 0.75), b1 = T(R * 0.78, -R * 0.3);
  ctx.strokeStyle = 'rgba(14,9,20,0.9)'; ctx.lineWidth = R * 0.17;
  ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
  if (look.scar) {
    const s0 = T(R * 0.05, -R * 0.85), s1 = T(R * 0.7, R * 0.05);
    ctx.strokeStyle = look.scar; ctx.lineWidth = LINE * 0.8;
    ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
  }
}

// MOONLIGHT: a pale band inside the top edge of the head, neck, back and tail — the
// outline shifted down and stroked, clipped to the animal — so he separates from a dark
// night by his top line, as the moon would light him.
function moonlight(ctx, B, parts) {
  const body = parts.filter((q) => ['torso', 'neck', 'skull', 'tail', 'ear', 'fur'].includes(q.id));
  const clip = new Path2D(); for (const q of body) clip.addPath(q.path);
  const edge = new Path2D(); for (const q of body) if (q.id !== 'fur') edge.addPath(q.path);
  ctx.save(); ctx.clip(clip);
  ctx.translate(0.25, 0.5);
  ctx.strokeStyle = B.look.rim; ctx.lineWidth = 0.75;
  ctx.stroke(edge);
  ctx.restore();
}

// One dog at `phase` (0..1), in world units, FACING LEFT, feet on y 0. `crouch`
// 0..1 drops it toward the collie's eye-on-the-flock pose.
// `hooks` is a gallery seam (src/dev/feral-dog-candidates.js): a candidate gait
// (`pose`), extra silhouette parts (`parts`), its own face (`face`) and paint over the
// finished dog (`after`). Nothing in the game passes it.
export function paintDog(ctx, B, phase, { crouch = 0, hooks = null } = {}) {
  const P = hooks?.pose ? hooks.pose(B, S, phase, { crouch })
    : B.gait ? gallopPose(B, S, phase) : pose(B, S, phase, { crouch });
  const pal = B.pal;
  ctx.save();
  ctx.scale(-1, 1);          // authored facing right; obstacles face left
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // The far pair and the far ear: their own darker silhouette, behind.
  const back = [P.hindFar, P.foreFar].map((lg) => ({ path: legPath(lg, B, S, 0.9), fill: pal.far }));
  const farEar = earPath(B, S, P, true);
  if (farEar) back.push({ path: farEar, fill: pal.far });
  silhouette(ctx, back);
  // The near silhouette.
  const parts = [];
  const tail = tailPath(B, P);
  if (tail) parts.push({ path: tail, fill: pal.coat, id: 'tail' });
  const torso = torsoPath(B, S, P);
  parts.push({ path: torso, fill: pal.coat, id: 'torso' });
  if (B.hackles) parts.push({ path: hackleRidge(B, P), fill: pal.coat, id: 'fur' });
  const neck = neckPath(B, S, P);
  parts.push({ path: neck, fill: pal.coat, id: 'neck' });
  const hd = headPaths(B, P);
  parts.push({ path: hd.mouth, fill: MOUTH, id: 'mouth' });
  parts.push({ path: hd.jaw, fill: pal.coat, id: 'jaw' });
  parts.push({ path: hd.skull, fill: pal.coat, id: 'skull' });
  const nearLegs = [P.hind, P.fore].map((lg) => legPath(lg, B, S, 1));
  for (const lp of nearLegs) parts.push({ path: lp, fill: pal.coat, id: 'leg' });
  const nearEar = earPath(B, S, P, false);
  if (nearEar) parts.push({ path: nearEar, fill: pal.coat, id: 'ear' });
  if (B.look) furParts(parts, B, P, hd, phase);
  hooks?.parts?.(parts, B, P, hd);
  silhouette(ctx, parts);
  shadeBody(ctx, torso, pal, B, P);
  markings(ctx, B, P, hd, parts, nearLegs, torso, neck);
  if (B.ribs) ribs(ctx, torso, P, B, LINE);
  collar(ctx, B, P);
  if (hooks?.face) hooks.face(ctx, B, P, hd); else if (B.look) snarlFace(ctx, B, P, hd); else face(ctx, B, P, hd);
  if (nearEar) earInner(ctx, B, S, P, pal);
  if (B.look?.rim) moonlight(ctx, B, parts);
  hooks?.after?.(ctx, B, P, hd);
  ctx.restore();
}

// ------------------------------------------------------------------- the fit
// The union of each dog's ink over all eight frames, in its own world units (x after
// the mirror; y up to the tallest ear). Measured with
// (dogInkBounds below) — re-measure after any change to a breed, the gait or a path,
// or the dog will overrun or underfill its box.
export const DOG_BOUNDS = {
  // Re-measured 16 Oct 2026 for the planted gallop and the wolf (dogInkBounds).
  snarler: { minX: -11.875, maxX: 9.5, minY: -15.125 },
  bruiser: { minX: -10, maxX: 8.625, minY: -11.25 },
  feral: { minX: -14, maxX: 12, minY: -14.5 },
  snarlerLong: { minX: -11.875, maxX: 10.75, minY: -15.125 },
  bruiserLong: { minX: -10, maxX: 10.75, minY: -11.875 },
  feralLong: { minX: -14, maxX: 11, minY: -16.25 },
};
const fitK = (b, w, h) => Math.min((w * 0.97) / (b.maxX - b.minX), (h * 0.975) / -b.minY);
const breedOf = (breed, longTail) => (longTail ? { ...BREEDS[breed], tail: 'long' } : BREEDS[breed]);
function painter(breed, longTail = false) {
  const B = breedOf(breed, longTail);
  const b = DOG_BOUNDS[longTail ? breed + 'Long' : breed];
  return (ctx, w, h, frame = 0) => {
    const k = fitK(b, w, h);
    ctx.save();
    ctx.translate(w / 2, h);
    ctx.scale(k, k);
    ctx.translate(-(b.minX + b.maxX) / 2, 0);
    paintDog(ctx, B, (frame % FRAMES) / FRAMES);
    ctx.restore();
  };
}

// The lane dogs, and the finish guard's three skins (the same dogs with the long,
// raised tail, fitted to the finish box).
export const DOG_PAINTERS = {
  dogSnarler: painter('snarler'),
  dogBruiser: painter('bruiser'),
  dogFeral: painter('feral'),
};
export const FINISH_DOG_PAINTERS = {
  finishSnarler: painter('snarler', true),
  finishBruiser: painter('bruiser', true),
  finishFeral: painter('feral', true),
};
export const DOG_FRAMES = FRAMES;

// THE STRIDE, in world units per gallop cycle, for a dog drawn over a `boxW` x `boxH`
// def box at `tall` and `visual` (animals.js tables): how far the road moves under a
// planted foot in one cycle. The run steps the ring by |vx| / stride (run.js gaitPh),
// so the feet stay nailed to the road at any speed. The 4/3 is draw.js's hazard
// overdraw; detail cancels out (the raster is drawn back at the art size).
export function dogStride(breed, longTail, boxW, boxH, tall, visual) {
  const B = breedOf(breed, longTail);
  const b = DOG_BOUNDS[longTail ? breed + 'Long' : breed];
  const kWorld = fitK(b, boxW, boxH * tall) * (4 / 3) * visual;
  return STRIDE_L * B.gait.stride * B.L * kWorld;
}

// Re-measures DOG_BOUNDS (browser only; for the harness, never the game): the union of
// a dog's ink over all its frames, in its own units after the mirror.
export function dogInkBounds(breed, longTail = false) {
  const B = breedOf(breed, longTail);
  const K = 10, W = 640, H = 420, G = H - 40;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  for (let f = 0; f < FRAMES; f++) {
    c.clearRect(0, 0, W, H);
    c.save(); c.translate(W / 2, G); c.scale(K, K); c.lineJoin = 'round'; c.lineCap = 'round';
    paintDog(c, B, f / FRAMES);
    c.restore();
    const d = c.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; }
    }
  }
  const q = (v) => Math.round(v * 8) / 8;
  return { minX: q((minX - W / 2) / K), maxX: q((maxX + 1 - W / 2) / K), minY: q((minY - G) / K) };
}
// For the gallery's candidates (src/dev/feral-dog-candidates.js): the breeds and the
// kennel's own geometry, so a candidate is drawn the same way the shipped dogs are.
export const DOG_BREEDS = BREEDS;
export const DOG_KIT = { capsule, smoothClosed, ik, cyc, shadeBody, INK, LINE, MOUTH, TONGUE, TOOTH };

// PLUMBER's working collie, for stylePacks/plumberLandmarks.js drawCollie: feet at
// the origin, FACING RIGHT (the caller mirrors by the flock's `dir`), in the collie's
// own units — the size the old paper-cut collie was drawn at. `phase` is the gallop
// (0..1), `crouch` 0..1 drops it flat to give the flock the eye. Drawn live every
// frame on the backdrop; there is no raster to fit it into.
export function drawCollieDog(ctx, phase, crouch = 0) {
  ctx.save();
  ctx.scale(-1, 1);
  paintDog(ctx, BREEDS.collie, ((phase % 1) + 1) % 1, { crouch });
  ctx.restore();
}
